// Play log: a record of how the game is played, kept for design analysis (`npm run playlog`).
// It lives in the UI layer and only ever reads copies of sim results. Nothing in the sim reads
// it, so it cannot change how a day plays out. It is stored apart from the save, in this
// browser only; nothing is sent anywhere. Export it from the Stats screen.
//
// To record more: add an optional field, bump LOG_VERSION, and teach analyze.ts to read it.
// Old logs stay readable because every field added after version 1 is optional.
import type { KeyValueStore } from '../../save/save';
import type { Action, AttributionLine, DayResult, GameState } from '../../sim';

export const LOG_VERSION = 2;
/** Detail is kept for this many recent days; older days are dropped first. */
export const MAX_DAYS = 200;
export const MAX_ACTIONS = 1500;
export const MAX_SESSIONS = 200;
/** Coming back after this long away starts a new session. */
export const SESSION_GAP_SEC = 30 * 60;

export interface StandDay {
  id: number;
  loc: string;
  /** "lemons/sugar/ice" per pitcher. */
  recipe: string;
  price: number;
  /** Upgrades owned, e.g. "body2 juicer1 neon". */
  upgrades: string;
  /** Staff as "role:skill". */
  staff: string[];
  passersby: number;
  stoppers: number;
  buyers: number;
  lostQueue: number;
  lostSoldOut: number;
  tooExpensive: number;
  revenue: number;
  ingredients: number;
  rent: number;
  wages: number;
  repBefore: number;
  repAfter: number;
  avgSat: number;
  soldOutAt: number | null;
  complaints: Record<string, number>;
}

export interface DayEntry {
  day: number;
  season: string;
  weather: { cond: string; temp: number };
  forecast: { cond: string; temp: number };
  cashStart: number;
  cashEnd: number;
  netWorth: number;
  revenue: number;
  profit: number;
  costs: Record<string, number>;
  stockBought: number;
  capitalSpent: number;
  cupsSold: number;
  spoiledLemons: number;
  iceLost: number;
  campaigns: string[];
  unlocked: string[];
  milestones: string[];
  inspectionFine: number;
  stands: StandDay[];
  /** Real time spent planning this morning, and what was touched. */
  morning: { sec: number; tabs: string[]; actions: Record<string, number>; failed: number };
  /** Watching the day: real seconds, speeds chosen, and the game minute of a skip. */
  watch: { sec: number; speeds: number[]; skippedAt: number | null };
  /** Real seconds on the evening report (filled in when the player leaves it). */
  reportSec: number | null;
  /** v2 (M10): "What your purchases did today", as the report showed it. */
  purchasesDid?: { kind: AttributionLine['kind']; item: string; standId: number | null; profit: number; count: number; approx: boolean }[];
  /** v2 (M10): Show the math opened this morning. */
  mathOpened?: number;
}

export interface ActionEntry {
  day: number;
  /** Seconds since the session started. */
  at: number;
  type: Action['type'];
  detail: string;
  ok: boolean;
  error?: string;
}

export interface Session {
  start: string;
  end: string;
  /** Days played during the session. */
  days: number;
  activeSec: number;
}

export interface PlayLog {
  logVersion: number;
  seed: number;
  /** Fingerprint of the config the game was played with, so results can be matched to a build. */
  configHash: string;
  createdAt: string;
  sessions: Session[];
  days: DayEntry[];
  actions: ActionEntry[];
  /** Total real seconds per view: "hub:shop", "day", "report", "stats", ... */
  viewSec: Record<string, number>;
  /** Counts of things that aren't actions: "export", "showMath", ... */
  counters: Record<string, number>;
  droppedDays: number;
}

export const logKey = (slot: number) => `squeeze-city:playlog:${slot}`;

/** Short, stable hash (FNV-1a) of any JSON value. */
export function hashJson(v: unknown): string {
  const s = JSON.stringify(v);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function emptyLog(seed: number, configHash: string, now: Date): PlayLog {
  return { logVersion: LOG_VERSION, seed, configHash, createdAt: now.toISOString(), sessions: [], days: [], actions: [], viewSec: {}, counters: {}, droppedDays: 0 };
}

const round2 = (x: number) => Math.round(x * 100) / 100;

function upgradeText(u: GameState['stands'][number]['upgrades']): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(u)) {
    if (typeof v === 'number' ? v > 0 : v) parts.push(typeof v === 'number' ? `${k}${v}` : k);
  }
  return parts.join(' ');
}

function actionDetail(a: Action): string {
  switch (a.type) {
    case 'buy':
      return `${a.item} pack${a.pack}${a.count && a.count > 1 ? ` x${a.count}` : ''}`;
    case 'setRecipe':
      return `#${a.standId} ${a.recipe.lemons}/${a.recipe.sugar}/${a.recipe.ice}`;
    case 'setPrice':
      return `#${a.standId} $${a.price.toFixed(2)}`;
    case 'assignStand':
      return `#${a.standId} -> ${a.locationId ?? 'storage'}`;
    case 'buyUpgrade':
      return `#${a.standId} ${a.upgrade}`;
    case 'buyGlobalUpgrade':
      return a.upgrade;
    case 'buyLicense':
      return '';
    case 'hire':
      return `#${a.standId} ${a.candidateId}`;
    case 'fire':
      return `#${a.standId} ${a.staffId}`;
    case 'startCampaign':
      return `${a.campaign}${a.locationId ? ` @${a.locationId}` : ''}`;
  }
}

/** Builds the log entry for one played day from the sim's result and the morning's state. */
export function dayEntry(morning: GameState, result: DayResult): Omit<DayEntry, 'morning' | 'watch' | 'reportSec'> {
  const r = result.report;
  const stands: StandDay[] = r.stands.map((sr) => {
    const st = morning.stands.find((x) => x.id === sr.standId) ?? result.state.stands.find((x) => x.id === sr.standId)!;
    return {
      id: sr.standId,
      loc: sr.locationId,
      recipe: `${st.recipe.lemons}/${st.recipe.sugar}/${st.recipe.ice}`,
      price: st.price,
      upgrades: upgradeText(st.upgrades),
      staff: st.staff.map((m) => `${m.role}:${m.skill}`),
      passersby: sr.passersby,
      stoppers: sr.stoppers,
      buyers: sr.buyers,
      lostQueue: sr.lostQueue,
      lostSoldOut: sr.lostSoldOut,
      tooExpensive: sr.tooExpensive,
      revenue: round2(sr.revenue),
      ingredients: round2(sr.ingredients),
      rent: sr.rent,
      wages: sr.wages,
      repBefore: round2(sr.repBefore),
      repAfter: round2(sr.repAfter),
      avgSat: round2(sr.avgSat),
      soldOutAt: sr.soldOutAt,
      complaints: { ...sr.complaints } as Record<string, number>,
    };
  });
  return {
    day: r.day,
    season: r.season,
    weather: { cond: r.weather.condition, temp: Math.round(r.weather.dayTemp) },
    forecast: { cond: r.forecast.condition, temp: Math.round(r.forecast.temp) },
    cashStart: round2(r.cashStart),
    cashEnd: round2(r.cashEnd),
    netWorth: round2(r.netWorth),
    revenue: round2(r.revenue),
    profit: round2(r.profit),
    costs: Object.fromEntries(Object.entries(r.costs).map(([k, v]) => [k, round2(v)])),
    stockBought: round2(r.stockBought),
    capitalSpent: round2(r.capitalSpent),
    cupsSold: r.cupsSold,
    spoiledLemons: r.spoiledLemons,
    iceLost: r.iceLost,
    campaigns: morning.campaigns.map((c) => c.id),
    unlocked: [...r.unlocked],
    milestones: r.milestones.map((m) => m.id),
    inspectionFine: r.inspection?.fined ? r.inspection.fine : 0,
    stands,
  };
}

/** Parses a stored log; returns null for anything unreadable rather than throwing. */
export function parseLog(text: string | null): PlayLog | null {
  if (!text) return null;
  try {
    const v = JSON.parse(text) as PlayLog;
    if (typeof v !== 'object' || v === null || typeof v.logVersion !== 'number' || !Array.isArray(v.days)) return null;
    return v;
  } catch {
    return null;
  }
}

/**
 * Records play into a PlayLog. Call the hooks from the app; each one saves.
 * Every method swallows its own errors: a broken log must never break the game.
 */
export class PlayLogger {
  log: PlayLog | null = null;
  private slot: number | null = null;
  private view: string | null = null;
  private viewSince = 0;
  private sessionStart = 0;
  private hidden = false;
  private hiddenAt = 0;
  private morning = { since: 0, tabs: new Set<string>(), actions: {} as Record<string, number>, failed: 0, sec: 0, math: 0 };
  private watch = { since: 0, speeds: [] as number[], skippedAt: null as number | null };
  private reportSince: number | null = null;

  constructor(
    private store: KeyValueStore,
    private clock: () => number = () => Date.now(),
  ) {}

  private safe(fn: () => void): void {
    try {
      fn();
    } catch {
      // The log is for analysis only; never let it interrupt play.
    }
  }

  private save(): void {
    if (this.slot === null || !this.log) return;
    try {
      this.store.setItem(logKey(this.slot), JSON.stringify(this.log));
    } catch {
      // Storage full: drop the oldest half of the detail and try once more.
      const n = Math.floor(this.log.days.length / 2);
      this.log.days.splice(0, n);
      this.log.droppedDays += n;
      this.log.actions.splice(0, Math.floor(this.log.actions.length / 2));
      try {
        this.store.setItem(logKey(this.slot), JSON.stringify(this.log));
      } catch {
        /* give up quietly */
      }
    }
  }

  private newSession(): void {
    if (!this.log) return;
    const now = this.clock();
    this.sessionStart = now;
    this.log.sessions.push({ start: new Date(now).toISOString(), end: new Date(now).toISOString(), days: 0, activeSec: 0 });
    if (this.log.sessions.length > MAX_SESSIONS) this.log.sessions.splice(0, this.log.sessions.length - MAX_SESSIONS);
  }

  private session(): Session | undefined {
    return this.log?.sessions.at(-1);
  }

  private sinceStart(): number {
    return Math.round((this.clock() - this.sessionStart) / 1000);
  }

  /** A game was started or loaded in `slot`. A new game starts a fresh log. */
  open(slot: number, state: GameState, configHash: string, fresh: boolean): void {
    this.safe(() => {
      this.close();
      this.slot = slot;
      const existing = fresh ? null : parseLog(this.store.getItem(logKey(slot)));
      this.log = existing && existing.seed === state.seed ? existing : emptyLog(state.seed, configHash, new Date(this.clock()));
      this.newSession();
      if (this.log.configHash !== configHash) this.count(`configChanged:${configHash}`);
      this.log.configHash = configHash;
      this.startMorning();
      this.save();
    });
  }

  /** Flushes the open view and ends the session (title screen, page hidden or closed). */
  close(): void {
    this.safe(() => {
      this.flushView();
      const s = this.session();
      if (s) s.end = new Date(this.clock()).toISOString();
      this.save();
    });
  }

  /** The visible view changed ("hub:shop", "day", "report", ...). */
  setView(view: string): void {
    this.safe(() => {
      if (view === this.view || !this.log) return;
      this.flushView();
      this.view = view;
      this.viewSince = this.clock();
      if (view === 'report' && this.reportSince === null) this.reportSince = this.clock();
      if (view !== 'report' && this.reportSince !== null) this.endReport();
      if (view.startsWith('hub:')) this.morning.tabs.add(view.slice(4));
    });
  }

  /** The page was hidden or shown again; hidden time is not counted. */
  setHidden(hidden: boolean): void {
    this.safe(() => {
      if (hidden === this.hidden) return;
      if (hidden) {
        this.flushView();
        this.hidden = true;
        this.hiddenAt = this.clock();
        this.close();
      } else {
        this.hidden = false;
        if (this.log && (this.clock() - this.hiddenAt) / 1000 > SESSION_GAP_SEC) this.newSession();
        this.viewSince = this.clock();
        if (this.morning.since) this.morning.since = this.clock();
        if (this.watch.since) this.watch.since = this.clock();
        if (this.reportSince !== null) this.reportSince = this.clock();
      }
    });
  }

  private flushView(): void {
    if (!this.log || this.view === null || this.hidden) return;
    const now = this.clock();
    const sec = (now - this.viewSince) / 1000;
    this.log.viewSec[this.view] = Math.round(((this.log.viewSec[this.view] ?? 0) + sec) * 10) / 10;
    const s = this.session();
    if (s) s.activeSec = Math.round(s.activeSec + sec);
    if (this.view.startsWith('hub') && this.morning.since) {
      this.morning.sec += (now - this.morning.since) / 1000;
      this.morning.since = now;
    }
    this.viewSince = now;
  }

  private startMorning(): void {
    this.morning = { since: this.clock(), tabs: new Set(), actions: {}, failed: 0, sec: 0, math: 0 };
  }

  action(state: GameState, a: Action, ok: boolean, error?: string): void {
    this.safe(() => {
      if (!this.log) return;
      this.log.actions.push({ day: state.day, at: this.sinceStart(), type: a.type, detail: actionDetail(a), ok, ...(error ? { error } : {}) });
      if (this.log.actions.length > MAX_ACTIONS) this.log.actions.splice(0, this.log.actions.length - MAX_ACTIONS);
      if (ok) this.morning.actions[a.type] = (this.morning.actions[a.type] ?? 0) + 1;
      else this.morning.failed++;
      this.save();
    });
  }

  /** "Open for business" was pressed and the sim ran the day. */
  dayStarted(morningState: GameState, result: DayResult, speed: number): void {
    this.safe(() => {
      if (!this.log) return;
      this.flushView();
      const entry: DayEntry = {
        ...dayEntry(morningState, result),
        morning: { sec: Math.round(this.morning.sec), tabs: [...this.morning.tabs], actions: { ...this.morning.actions }, failed: this.morning.failed },
        watch: { sec: 0, speeds: [speed], skippedAt: null },
        reportSec: null,
        ...(this.morning.math ? { mathOpened: this.morning.math } : {}),
      };
      this.log.days.push(entry);
      if (this.log.days.length > MAX_DAYS) {
        const n = this.log.days.length - MAX_DAYS;
        this.log.days.splice(0, n);
        this.log.droppedDays += n;
      }
      const s = this.session();
      if (s) s.days++;
      this.morning.since = 0;
      this.watch = { since: this.clock(), speeds: [speed], skippedAt: null };
      this.save();
    });
  }

  speed(n: number): void {
    this.safe(() => {
      const d = this.log?.days.at(-1);
      if (!d) return;
      d.watch.speeds.push(n);
      this.save();
    });
  }

  /** The player skipped the rest of the day at game minute `t` (minutes since opening). */
  skip(t: number): void {
    this.safe(() => {
      const d = this.log?.days.at(-1);
      if (!d || d.watch.skippedAt !== null) return;
      d.watch.skippedAt = Math.round(t);
      this.save();
    });
  }

  /** The replay finished or the player moved on to the report. */
  dayWatched(): void {
    this.safe(() => {
      const d = this.log?.days.at(-1);
      if (!d || !this.watch.since) return;
      d.watch.sec = Math.round(d.watch.sec + (this.clock() - this.watch.since) / 1000);
      this.watch.since = 0;
      this.save();
    });
  }

  private endReport(): void {
    const d = this.log?.days.at(-1);
    if (d && this.reportSince !== null) d.reportSec = Math.round((d.reportSec ?? 0) + (this.clock() - this.reportSince) / 1000);
    this.reportSince = null;
    this.startMorning();
    this.save();
  }

  /** M10: "What your purchases did today" for a logged day (it arrives after the day starts). */
  attribution(day: number, lines: AttributionLine[]): void {
    this.safe(() => {
      const d = this.log?.days.findLast((x) => x.day === day);
      if (!d) return;
      d.purchasesDid = lines.map((l) => ({ kind: l.kind, item: l.item, standId: l.standId, profit: l.profit, count: l.count, approx: l.approx }));
      this.save();
    });
  }

  /** M10: the player opened "Show the math" on a purchase card. */
  mathOpened(item: string): void {
    this.morning.math++;
    this.count(`showMath:${item}`);
  }

  count(name: string): void {
    this.safe(() => {
      if (!this.log) return;
      this.log.counters[name] = (this.log.counters[name] ?? 0) + 1;
      this.save();
    });
  }

  /** The whole log as pretty JSON for export, with the open view flushed first. */
  exportText(): string | null {
    if (!this.log) return null;
    this.flushView();
    this.save();
    return JSON.stringify(this.log, null, 1);
  }
}
