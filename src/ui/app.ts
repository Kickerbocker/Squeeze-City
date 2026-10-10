import { CONFIG } from '../config';
import { SaveSlots } from '../save/save';
import { type Action, type DayResult, dispatch, type GameState, newGame, runDay } from '../sim';
import { audio } from './audio';
import { hashJson, PlayLogger } from './playlog/log';
import { toast } from './dom';
import { renderDay, SPEED_KEY } from './screens/day';
import { renderHub } from './screens/hub';
import { renderReport } from './screens/report';
import { renderStats } from './screens/stats';
import { renderTitle } from './screens/title';

export type Screen = 'title' | 'hub' | 'day' | 'report' | 'stats';
/** Fingerprint of the tuning this build plays with, stamped on play logs. */
export const CONFIG_HASH = hashJson(CONFIG);

export type HubTab = 'shop' | 'recipe' | 'staff' | 'upgrades' | 'marketing' | 'map';

/** Holds the current game and routes between screens. UI code reads `state` and calls `act()`. */
export class App {
  readonly root: HTMLElement;
  readonly slots: SaveSlots;
  /** Records how the game is played, for design analysis. Never read by the sim. */
  readonly playlog: PlayLogger;
  slot: number | null = null;
  state: GameState | null = null;
  screen: Screen = 'title';
  hubTab: HubTab = 'shop';
  selectedStand = 0;
  lastDay: DayResult | null = null;
  /** Report shown on the report screen (the day just played). */
  pendingReport: DayResult | null = null;
  private cleanup: (() => void) | null = null;

  constructor(root: HTMLElement, storage: Storage) {
    this.root = root;
    this.slots = new SaveSlots(storage);
    this.playlog = new PlayLogger(storage);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => this.playlog.setHidden(document.visibilityState === 'hidden'));
      window.addEventListener('pagehide', () => this.playlog.close());
    }
  }

  get game(): GameState {
    if (!this.state) throw new Error('No game loaded');
    return this.state;
  }

  /** Dispatches a player action to the sim. Returns true on success. */
  act(action: Action): boolean {
    const r = dispatch(this.game, action, CONFIG);
    this.playlog.action(this.game, action, r.ok, r.ok ? undefined : r.error);
    if (!r.ok) {
      toast(r.error, 'error');
      return false;
    }
    this.state = r.state;
    this.persist();
    this.render();
    return true;
  }

  persist(): void {
    if (this.slot === null || !this.state) return;
    try {
      this.slots.save(this.slot, this.state);
    } catch {
      toast('Could not save (storage full or blocked)', 'error');
    }
  }

  startNew(slot: number): void {
    // The seed comes from the clock here in the UI layer; the sim itself never reads the time.
    const seed = (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
    this.slot = slot;
    this.state = newGame(CONFIG, seed);
    this.selectedStand = 0;
    this.hubTab = 'shop';
    this.lastDay = null;
    this.persist();
    this.playlog.open(slot, this.state, CONFIG_HASH, true);
    this.go('hub');
  }

  load(slot: number): void {
    const s = this.slots.load(slot);
    if (!s) return;
    this.slot = slot;
    this.state = s;
    this.selectedStand = s.stands[0]?.id ?? 0;
    this.lastDay = null;
    this.playlog.open(slot, s, CONFIG_HASH, false);
    this.go('hub');
  }

  /** Runs the day in the sim (instant), autosaves the night, then plays the replay. */
  openForBusiness(): void {
    audio.unlock();
    const morning = this.game;
    const result = runDay(morning, {}, CONFIG);
    this.playlog.dayStarted(morning, result, Number(sessionStorage.getItem(SPEED_KEY) ?? 1) || 1);
    this.state = result.state;
    this.persist();
    this.pendingReport = result;
    this.go('day');
  }

  finishDay(): void {
    this.playlog.dayWatched();
    this.lastDay = this.pendingReport;
    this.go('report');
  }

  go(screen: Screen): void {
    this.screen = screen;
    this.render();
    window.scrollTo(0, 0);
  }

  render(): void {
    // Keep the scroll position when re-rendering the same screen.
    const scroller = this.root.querySelector<HTMLElement>('.scroll');
    const scroll = scroller?.scrollTop ?? 0;
    const sameScreen = this.root.dataset.screen === this.screen;
    if (this.screen !== 'day' || !sameScreen) {
      this.cleanup?.();
      this.cleanup = null;
    }
    this.root.dataset.screen = this.screen;
    this.playlog.setView(this.screen === 'hub' ? `hub:${this.hubTab}` : this.screen);
    switch (this.screen) {
      case 'title':
        renderTitle(this);
        break;
      case 'hub':
        renderHub(this);
        break;
      case 'day':
        if (!sameScreen || !this.cleanup) this.cleanup = renderDay(this);
        break;
      case 'report':
        renderReport(this);
        break;
      case 'stats':
        renderStats(this);
        break;
    }
    const next = this.root.querySelector<HTMLElement>('.scroll');
    if (next && sameScreen) next.scrollTop = scroll;
    // Fade in only when the screen actually changes, not on every re-render.
    if (!sameScreen) this.root.firstElementChild?.classList.add('enter');
  }
}
