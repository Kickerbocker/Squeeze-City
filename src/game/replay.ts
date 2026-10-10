// Pure replay model: turns the sim event log into "who is where at time t".
// The Phaser scene only draws what this returns; it never decides outcomes.
import type { Archetype } from '../config';
import type { Bubble, Recipe, SimEvent, StockSnapshot } from '../sim/types';

export interface Layout {
  width: number;
  /** x of the serving counter. */
  counterX: number;
  /** Gap between people in the line. */
  queueGap: number;
  /** World units walked per game minute. */
  walkSpeed: number;
  /** Game minutes a bubble stays up. */
  linger: number;
  visibleQueue: number;
}

export const DEFAULT_LAYOUT: Layout = {
  width: 390,
  counterX: 270,
  queueGap: 21,
  // M10: the day runs at 9 game minutes per second (was 3), so walking and bubbles are set in
  // game minutes to look about the same on screen: ~125 px/s and ~1.5 s per bubble at 1×.
  walkSpeed: 14,
  linger: 14,
  visibleQueue: 12,
};

export interface Walker {
  c: number;
  s: number;
  a: Archetype;
  dir: 1 | -1;
  tArrive: number;
  outcome: 'pass' | 'queue' | 'leave';
  bubble?: Bubble;
  tServe?: number;
  serveDur?: number;
  lane?: number;
  serveBubble?: Bubble;
  tQuit?: number;
  /** First and last moment the walker can be on screen. */
  start: number;
  end: number;
}

export type PoseKind = 'walking' | 'queued' | 'serving' | 'lingering';

export interface Pose {
  w: Walker;
  kind: PoseKind;
  x: number;
  /** 0 = sidewalk lane, 1 = queue lane, 2 = counter. */
  lane: 0 | 1 | 2;
  /** Bubble to show right now, if any. */
  bubble?: Bubble;
  /** Position in line (0 = next to be served). */
  slot?: number;
}

export interface StandTimeline {
  standId: number;
  walkers: Walker[];
  pitchers: { t: number; ready: number }[];
  serves: { t: number; price: number }[];
  soldOutAt: number | null;
}

export interface Timeline {
  open: number;
  close: number;
  openCash: number;
  stands: Map<number, StandTimeline>;
  hours: { t: number; hour: number; temp: number }[];
  events: readonly SimEvent[];
}

/** Deterministic pseudo-random direction from the customer id (no RNG needed for cosmetics). */
const dirOf = (c: number): 1 | -1 => (((c * 2654435761) >>> 0) % 2 === 0 ? 1 : -1);

export function buildTimeline(events: readonly SimEvent[], layout: Layout = DEFAULT_LAYOUT): Timeline {
  const stands = new Map<number, StandTimeline>();
  const byId = new Map<number, Walker>();
  const cross = layout.width / layout.walkSpeed;
  let close = 0;
  let openCash = 0;
  const hours: Timeline['hours'] = [];
  const stand = (s: number): StandTimeline => {
    let st = stands.get(s);
    if (!st) {
      st = { standId: s, walkers: [], pitchers: [], serves: [], soldOutAt: null };
      stands.set(s, st);
    }
    return st;
  };

  for (const e of events) {
    switch (e.k) {
      case 'open':
        openCash = e.cash;
        break;
      case 'hour':
        hours.push({ t: e.t, hour: e.hour, temp: e.temp });
        break;
      case 'arrive': {
        const w: Walker = { c: e.c, s: e.s, a: e.a, dir: dirOf(e.c), tArrive: e.t, outcome: e.o, start: e.t - cross, end: e.t + cross };
        if (e.b) w.bubble = e.b;
        if (e.o === 'leave') w.end = e.t + layout.linger + cross;
        stand(e.s).walkers.push(w);
        byId.set(e.c, w);
        break;
      }
      case 'serve': {
        const w = byId.get(e.c);
        if (w) {
          w.tServe = e.t;
          w.serveDur = e.dur;
          w.lane = e.lane;
          if (e.b) w.serveBubble = e.b;
          w.end = e.t + e.dur + layout.linger + cross;
        }
        stand(e.s).serves.push({ t: e.t, price: e.price });
        break;
      }
      case 'quit': {
        const w = byId.get(e.c);
        if (w) {
          w.tQuit = e.t;
          w.end = e.t + layout.linger + cross;
        }
        break;
      }
      case 'pitcher':
        stand(e.s).pitchers.push({ t: e.t, ready: e.ready });
        break;
      case 'soldOut':
        stand(e.s).soldOutAt = e.t;
        break;
      case 'close':
        close = e.t;
        break;
    }
  }
  for (const st of stands.values()) {
    st.walkers.sort((a, b) => a.start - b.start);
    st.serves.sort((a, b) => a.t - b.t);
  }
  return { open: 0, close, openCash, stands, hours, events };
}

/** Thins out plain passersby on busy streets so the screen stays readable. */
export function passSampling(st: StandTimeline, close: number, layout: Layout = DEFAULT_LAYOUT, maxOnScreen = 22): number {
  const passes = st.walkers.filter((w) => w.outcome === 'pass').length;
  const perMinute = passes / Math.max(1, close);
  const onScreen = perMinute * ((2 * layout.width) / layout.walkSpeed);
  return Math.max(1, Math.ceil(onScreen / maxOnScreen));
}

/** Where every visible walker of one stand is at time t. */
export function posesAt(st: StandTimeline, t: number, layout: Layout = DEFAULT_LAYOUT, sample = 1): { poses: Pose[]; queueLength: number } {
  const poses: Pose[] = [];
  const v = layout.walkSpeed;
  const joinX = layout.counterX - layout.queueGap;
  const queued: Walker[] = [];

  for (const w of st.walkers) {
    if (w.start > t) break;
    if (w.end < t) continue;
    if (w.outcome === 'pass' && w.c % sample !== 0) continue;
    if (w.outcome === 'queue' && t >= w.tArrive && (w.tServe === undefined || t < w.tServe) && (w.tQuit === undefined || t < w.tQuit)) {
      queued.push(w);
      continue;
    }
    if (t < w.tArrive) {
      const target = w.outcome === 'pass' ? layout.counterX : w.outcome === 'queue' ? joinX : layout.counterX - 30;
      poses.push({ w, kind: 'walking', x: target - w.dir * v * (w.tArrive - t), lane: w.outcome === 'pass' ? 0 : 1 });
      continue;
    }
    if (w.outcome === 'pass') {
      poses.push({ w, kind: 'walking', x: layout.counterX + w.dir * v * (t - w.tArrive), lane: 0 });
      continue;
    }
    if (w.outcome === 'leave') {
      const stopX = layout.counterX - 30;
      const dt = t - w.tArrive;
      if (dt < layout.linger) poses.push({ w, kind: 'lingering', x: stopX, lane: 1, ...(w.bubble ? { bubble: w.bubble } : {}) });
      else poses.push({ w, kind: 'walking', x: stopX + w.dir * v * (dt - layout.linger), lane: 0, ...(dt < layout.linger * 1.6 && w.bubble ? { bubble: w.bubble } : {}) });
      continue;
    }
    // queue outcome, after the line
    if (w.tQuit !== undefined) {
      const dt = t - w.tQuit;
      poses.push({ w, kind: 'walking', x: joinX - v * dt, lane: 0, ...(dt < layout.linger ? { bubble: 'soldOut' as Bubble } : {}) });
      continue;
    }
    if (w.tServe !== undefined && w.serveDur !== undefined) {
      const done = w.tServe + w.serveDur;
      const laneOffset = (w.lane ?? 0) * 18;
      if (t < done) poses.push({ w, kind: 'serving', x: layout.counterX + laneOffset, lane: 2 });
      else {
        const dt = t - done;
        poses.push({
          w,
          kind: 'walking',
          x: layout.counterX + laneOffset + v * dt,
          lane: 0,
          ...(dt < layout.linger && w.serveBubble ? { bubble: w.serveBubble } : {}),
        });
      }
    }
  }

  queued.sort((a, b) => a.tArrive - b.tArrive || a.c - b.c);
  queued.forEach((w, i) => {
    if (i >= layout.visibleQueue) return;
    poses.push({ w, kind: 'queued', x: joinX - i * layout.queueGap, lane: 1, slot: i });
  });
  return { poses, queueLength: queued.length };
}

/** Index of the last element with key ≤ t (binary search), or −1. */
function lastAtOrBefore<T>(xs: readonly T[], t: number, key: (x: T) => number): number {
  let lo = 0;
  let hi = xs.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (key(xs[mid]!) <= t) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

export function cashAt(tl: Timeline, t: number): number {
  let cash = tl.openCash;
  for (const st of tl.stands.values()) {
    const i = lastAtOrBefore(st.serves, t, (s) => s.t);
    for (let k = 0; k <= i; k++) cash += st.serves[k]!.price;
  }
  return cash;
}

export function soldAt(st: StandTimeline, t: number): number {
  return lastAtOrBefore(st.serves, t, (s) => s.t) + 1;
}

/** Pitcher state for a stand: preparing (with progress 0–1) or ready. */
export function pitcherAt(st: StandTimeline, t: number): { preparing: boolean; progress: number } {
  const i = lastAtOrBefore(st.pitchers, t, (p) => p.t);
  if (i < 0) return { preparing: false, progress: 0 };
  const p = st.pitchers[i]!;
  if (t < p.ready) return { preparing: true, progress: (t - p.t) / Math.max(1e-6, p.ready - p.t) };
  return { preparing: false, progress: 1 };
}

/** Live shared stock: latest snapshot, minus what was used since. */
export function stockAt(tl: Timeline, t: number, recipes: ReadonlyMap<number, Recipe>): StockSnapshot {
  let snapIdx = -1;
  let snap: StockSnapshot | null = null;
  tl.events.forEach((e, i) => {
    if ((e.k === 'open' || e.k === 'hour') && e.t <= t) {
      snapIdx = i;
      snap = e.stock;
    }
  });
  const base: StockSnapshot = snap ?? { lemons: 0, sugar: 0, ice: 0, cups: 0 };
  const s = { ...base };
  for (let i = snapIdx + 1; i < tl.events.length; i++) {
    const e = tl.events[i]!;
    if (e.k === 'hour') break;
    if (e.t > t) continue;
    const r = 's' in e ? recipes.get(e.s) : undefined;
    if (!r) continue;
    if (e.k === 'pitcher') {
      s.lemons -= r.lemons;
      s.sugar -= r.sugar;
    } else if (e.k === 'serve') {
      s.cups -= 1;
      if (r.ice > 0 && s.ice >= r.ice) s.ice -= r.ice;
    }
  }
  return { lemons: Math.max(0, s.lemons), sugar: Math.max(0, s.sugar), ice: Math.max(0, s.ice), cups: Math.max(0, s.cups) };
}

export interface LiveFunnel {
  passed: number;
  stopped: number;
  bought: number;
  tooExpensive: number;
  lineTooLong: number;
  soldOut: number;
}

/** Running customer funnel for one stand up to time t. */
export function funnelAt(st: StandTimeline, t: number): LiveFunnel {
  const f: LiveFunnel = { passed: 0, stopped: 0, bought: soldAt(st, t), tooExpensive: 0, lineTooLong: 0, soldOut: 0 };
  for (const w of st.walkers) {
    if (w.start > t) break;
    if (w.tArrive > t) continue;
    f.passed++;
    if (w.outcome === 'pass') continue;
    f.stopped++;
    if (w.bubble === 'tooExpensive') f.tooExpensive++;
    else if (w.bubble === 'lineTooLong') f.lineTooLong++;
    else if (w.bubble === 'soldOut') f.soldOut++;
    if (w.tQuit !== undefined && w.tQuit <= t) f.soldOut++;
  }
  return f;
}
