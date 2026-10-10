// P1 play log: what the spec's Playtest 3 needs measured (docs/specs/P1-prototype.md, "Play log
// additions"). UI layer only; never read by the sim. Stored apart from the P1 save.
import type { P1Report, QtyMode } from '../../sim/p1/game';
import { hashJson } from '../playlog/log';

export const P1_LOG_KEY = 'squeeze-city:p1:playlog';
export const P1_LOG_VERSION = 1;
const MAX_DAYS = 300;

export interface P1LogDay {
  day: number;
  weekday: number;
  stage: 'gigs' | 'market' | 'stand';
  choice: 'gig' | 'business';
  gig?: string;
  /** Gig taken although the drink stand was open. */
  gigAfterStand?: boolean;
  weather: string;
  forecast: { weather: string; label: string; right: boolean };
  likely?: [number, number];
  street?: [number, number];
  batch?: number;
  batchMode?: QtyMode;
  suggested?: number | null;
  price?: number;
  sold?: number;
  leftover?: number;
  walkedSoldOut?: number;
  walkedPrice?: number;
  reactions?: { deal: number; fair: number; pricey: number; walk: number };
  income: number;
  missed: { kind: string; size: number }[];
  /** Did the "what you missed" lines scroll into view? */
  missedSeen: boolean;
  /** Each labelled moment: was it on screen when it happened, and at what speed. */
  moments: { kind: string; onScreen: boolean; speed: number | null }[];
  morningSec: number;
  watchSec: number;
  reportSec: number | null;
  speeds: number[];
  skippedAt: number | null;
  skillsSpent: string[];
  /** Times the batch or price was changed on the board this morning. */
  edits: { batch: number; price: number };
}

export interface P1Log {
  mode: 'p1';
  logVersion: number;
  seed: number;
  configHash: string;
  createdAt: string;
  sessions: { start: string; end: string; days: number; activeSec: number }[];
  days: P1LogDay[];
  counters: Record<string, number>;
}

export class P1Logger {
  log: P1Log | null = null;
  private morningSince = 0;
  private morningSec = 0;
  private watchSince = 0;
  private reportSince = 0;
  private pendingSkills: string[] = [];
  private edits = { batch: 0, price: 0 };
  private sessionStart = 0;

  constructor(
    private store: Storage,
    private clock: () => number = () => Date.now(),
  ) {}

  private save(): void {
    if (!this.log) return;
    try {
      this.store.setItem(P1_LOG_KEY, JSON.stringify(this.log));
    } catch {
      this.log.days.splice(0, Math.floor(this.log.days.length / 2));
    }
  }

  private safe(fn: () => void): void {
    try {
      fn();
    } catch {
      // never let logging break play
    }
  }

  open(seed: number, config: unknown, fresh: boolean): void {
    this.safe(() => {
      let existing: P1Log | null = null;
      if (!fresh) {
        try {
          existing = JSON.parse(this.store.getItem(P1_LOG_KEY) ?? 'null') as P1Log | null;
        } catch {
          existing = null;
        }
      }
      const now = this.clock();
      this.log =
        existing && existing.mode === 'p1' && existing.seed === seed
          ? existing
          : { mode: 'p1', logVersion: P1_LOG_VERSION, seed, configHash: hashJson(config), createdAt: new Date(now).toISOString(), sessions: [], days: [], counters: {} };
      this.log.sessions.push({ start: new Date(now).toISOString(), end: new Date(now).toISOString(), days: 0, activeSec: 0 });
      this.sessionStart = now;
      this.startMorning();
      this.save();
    });
  }

  startMorning(): void {
    this.morningSince = this.clock();
    this.morningSec = 0;
    this.pendingSkills = [];
    this.edits = { batch: 0, price: 0 };
  }

  pauseMorning(): void {
    if (this.morningSince) this.morningSec += (this.clock() - this.morningSince) / 1000;
    this.morningSince = 0;
  }

  resumeMorning(): void {
    if (!this.morningSince) this.morningSince = this.clock();
  }

  edit(what: 'batch' | 'price'): void {
    this.edits[what]++;
  }

  skill(id: string): void {
    this.pendingSkills.push(id);
  }

  count(name: string): void {
    this.safe(() => {
      if (!this.log) return;
      this.log.counters[name] = (this.log.counters[name] ?? 0) + 1;
      this.save();
    });
  }

  /** The day was played; `entry` holds what the morning board and the sim know. */
  dayStarted(entry: Omit<P1LogDay, 'morningSec' | 'watchSec' | 'reportSec' | 'speeds' | 'skippedAt' | 'skillsSpent' | 'edits' | 'missedSeen' | 'moments'>, report: P1Report, speed: number): void {
    this.safe(() => {
      if (!this.log) return;
      this.pauseMorning();
      this.log.days.push({
        ...entry,
        morningSec: Math.round(this.morningSec),
        watchSec: 0,
        reportSec: null,
        speeds: [speed],
        skippedAt: null,
        skillsSpent: [...this.pendingSkills],
        edits: { ...this.edits },
        missedSeen: false,
        moments: report.moments.map((m) => ({ kind: m.kind, onScreen: false, speed: null })),
      });
      if (this.log.days.length > MAX_DAYS) this.log.days.splice(0, this.log.days.length - MAX_DAYS);
      const s = this.log.sessions.at(-1);
      if (s) s.days++;
      this.watchSince = this.clock();
      this.save();
    });
  }

  private today(): P1LogDay | undefined {
    return this.log?.days.at(-1);
  }

  speed(n: number): void {
    this.safe(() => {
      this.today()?.speeds.push(n);
      this.save();
    });
  }

  skip(t: number): void {
    this.safe(() => {
      const d = this.today();
      if (d && d.skippedAt === null) d.skippedAt = Math.round(t);
      this.save();
    });
  }

  momentSeen(i: number, speed: number): void {
    this.safe(() => {
      const m = this.today()?.moments[i];
      if (m && !m.onScreen) {
        m.onScreen = true;
        m.speed = speed;
      }
      this.save();
    });
  }

  dayWatched(): void {
    this.safe(() => {
      const d = this.today();
      if (d && this.watchSince) d.watchSec = Math.round((this.clock() - this.watchSince) / 1000);
      this.watchSince = 0;
      this.reportSince = this.clock();
      this.save();
    });
  }

  missedSeen(): void {
    this.safe(() => {
      const d = this.today();
      if (d && !d.missedSeen) {
        d.missedSeen = true;
        this.save();
      }
    });
  }

  reportDone(): void {
    this.safe(() => {
      const d = this.today();
      if (d && this.reportSince) d.reportSec = Math.round((this.clock() - this.reportSince) / 1000);
      this.reportSince = 0;
      const s = this.log?.sessions.at(-1);
      if (s) {
        s.end = new Date(this.clock()).toISOString();
        s.activeSec = Math.round((this.clock() - this.sessionStart) / 1000);
      }
      this.startMorning();
      this.save();
    });
  }

  exportText(): string | null {
    return this.log ? JSON.stringify(this.log, null, 1) : null;
  }
}
