// Runs "what your purchases did today" off the main thread, so pressing Open for business never
// stalls. It replays the day several times; on a phone with four stands that can take a second.
import { CONFIG } from '../config';
import { runDayWithAttribution, type DayPlan, type GameState } from '../sim';

self.onmessage = (e: MessageEvent<{ id: number; state: GameState; plan: DayPlan }>) => {
  const { id, state, plan } = e.data;
  const r = runDayWithAttribution(state, plan, CONFIG);
  self.postMessage({ id, attribution: r.attribution, state: r.state });
};
