// Computes runDayWithAttribution in a Web Worker where available, else on the main thread
// after the current frame. Either way the result is identical: the sim is deterministic.
import { CONFIG } from '../config';
import { type AttributionLine, type DayPlan, type GameState, runDayWithAttribution } from '../sim';

export interface AttributionResult {
  attribution: AttributionLine[];
  state: GameState;
}

let worker: Worker | null | undefined;
let nextId = 0;
const waiting = new Map<number, (r: AttributionResult) => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./attribution.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<AttributionResult & { id: number }>) => {
      const done = waiting.get(e.data.id);
      waiting.delete(e.data.id);
      done?.({ attribution: e.data.attribution, state: e.data.state });
    };
    worker.onerror = () => {
      // Fall back to the main thread for anything still waiting.
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

export function computeAttribution(morning: GameState, plan: DayPlan): Promise<AttributionResult> {
  const w = typeof Worker !== 'undefined' ? getWorker() : null;
  const local = () => {
    const r = runDayWithAttribution(morning, plan, CONFIG);
    return { attribution: r.attribution, state: r.state };
  };
  if (!w) return new Promise((resolve) => setTimeout(() => resolve(local()), 0));
  return new Promise((resolve) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      // A worker that never answers (blocked, crashed) must not leave the report empty.
      if (waiting.delete(id)) resolve(local());
    }, 15_000);
    waiting.set(id, (r) => {
      clearTimeout(timer);
      resolve(r);
    });
    w.postMessage({ id, state: morning, plan });
  });
}
