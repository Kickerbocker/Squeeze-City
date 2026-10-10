import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { memoryStore } from '../src/save/save';
import { dispatch, type GameState, newGame, runDay } from '../src/sim';
import { analyze, planChanges, quietStreaks } from '../src/ui/playlog/analyze';
import { type DayEntry, logKey, MAX_DAYS, parseLog, PlayLogger } from '../src/ui/playlog/log';
import { stockUp } from './helpers';

function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const x of Object.values(v)) deepFreeze(x);
  }
  return v;
}

/** A logger driven by a fake clock that the test advances by hand. */
function rig(store = memoryStore()) {
  let now = Date.UTC(2026, 9, 10, 12);
  const logger = new PlayLogger(store, () => now);
  return { store, logger, tick: (sec: number) => (now += sec * 1000) };
}

function playDay(logger: PlayLogger, s: GameState): GameState {
  const morning = stockUp(s);
  const result = runDay(morning);
  logger.dayStarted(morning, result, 1);
  logger.dayWatched();
  return result.state;
}

describe('play log', () => {
  it('never changes how the game plays', () => {
    const { logger } = rig();
    let logged = newGame(CONFIG, 3);
    let plain = newGame(CONFIG, 3);
    logger.open(0, logged, 'test', true);
    for (let d = 0; d < 5; d++) {
      const morning = deepFreeze(stockUp(logged));
      const r = runDay(morning);
      deepFreeze(r);
      logger.dayStarted(morning, r, 2); // would throw if it mutated its inputs
      logged = structuredClone(r.state);
      const p = runDay(stockUp(plain));
      plain = p.state;
      expect(r.report).toEqual(p.report);
    }
    expect(logged).toEqual(plain);
    expect(logger.log!.days).toHaveLength(5);
  });

  it('records the morning, the watch and the report', () => {
    const { logger, tick } = rig();
    let s = newGame(CONFIG, 1);
    logger.open(0, s, 'test', true);
    logger.setView('hub:shop');
    tick(10);
    const a = { type: 'setPrice', standId: 0, price: 1.5 } as const;
    const r = dispatch(s, a);
    logger.action(s, a, r.ok);
    s = r.ok ? r.state : s;
    const bad = { type: 'buyUpgrade', standId: 0, upgrade: 'cooler' } as const;
    logger.action(s, bad, false, 'Not for sale');
    logger.setView('hub:recipe');
    tick(5);
    const morning = stockUp(s);
    const result = runDay(morning);
    logger.dayStarted(morning, result, 1);
    logger.setView('day');
    tick(20);
    logger.speed(4);
    logger.skip(212.4);
    tick(1);
    logger.dayWatched();
    logger.setView('report');
    tick(7);
    logger.setView('hub:shop');

    const d = logger.log!.days[0]!;
    expect(d.morning).toEqual({ sec: 15, tabs: ['shop', 'recipe'], actions: { setPrice: 1 }, failed: 1 });
    expect(d.watch).toEqual({ sec: 21, speeds: [1, 4], skippedAt: 212 });
    expect(d.reportSec).toBe(7);
    expect(d.stands[0]!.price).toBe(1.5);
    expect(d.stands[0]!.loc).toBe('maple');
    expect(d.profit).toBe(result.report.profit);
    expect(logger.log!.actions.map((x) => [x.type, x.ok, x.error])).toEqual([
      ['setPrice', true, undefined],
      ['buyUpgrade', false, 'Not for sale'],
    ]);
    expect(logger.log!.viewSec).toMatchObject({ 'hub:shop': 10, 'hub:recipe': 5, day: 21, report: 7 });
    // Leaving the report starts the next morning, which includes the tab it lands on.
    tick(3);
    const next = stockUp(result.state);
    logger.dayStarted(next, runDay(next), 4);
    expect(logger.log!.days[1]!.morning).toMatchObject({ sec: 3, tabs: ['shop'] });
    expect(Number.isInteger(d.weather.temp)).toBe(true);
  });

  it('keeps the log across loads of the same game and starts fresh for a new one', () => {
    const { store, logger } = rig();
    const s = newGame(CONFIG, 8);
    logger.open(1, s, 'a', true);
    playDay(logger, s);
    logger.close();

    const again = rig(store).logger;
    again.open(1, s, 'a', false);
    expect(again.log!.days).toHaveLength(1);
    expect(again.log!.sessions).toHaveLength(2);

    again.open(1, newGame(CONFIG, 9), 'a', false);
    expect(again.log!.days).toHaveLength(0); // a different game in the slot
    again.open(1, s, 'a', true);
    expect(again.log!.days).toHaveLength(0); // "New game" always starts a fresh log
    expect(parseLog(store.getItem(logKey(1)))!.seed).toBe(8);
  });

  it('does not count time while the page is hidden, and a long absence starts a new session', () => {
    const { logger, tick } = rig();
    logger.open(0, newGame(CONFIG, 1), 'a', true);
    logger.setView('hub:shop');
    tick(10);
    logger.setHidden(true);
    tick(3600);
    logger.setHidden(false);
    tick(5);
    logger.setView('stats');
    expect(logger.log!.viewSec['hub:shop']).toBe(15);
    expect(logger.log!.sessions).toHaveLength(2);
  });

  it('keeps only the most recent days', () => {
    const { logger } = rig();
    let s = newGame(CONFIG, 2);
    logger.open(0, s, 'a', true);
    const r = runDay(stockUp(s));
    for (let i = 0; i < MAX_DAYS + 5; i++) logger.dayStarted(s, r, 1);
    expect(logger.log!.days).toHaveLength(MAX_DAYS);
    expect(logger.log!.droppedDays).toBe(5);
    s = r.state;
  });

  it('never throws, even when storage fails', () => {
    const store = { getItem: () => '{not json', setItem: () => { throw new Error('full'); }, removeItem: () => {} };
    const logger = new PlayLogger(store);
    const s = newGame(CONFIG, 1);
    expect(() => {
      logger.open(0, s, 'a', false);
      playDay(logger, s);
      logger.setHidden(true);
      logger.close();
    }).not.toThrow();
  });

  it('ignores files that are not play logs', () => {
    expect(parseLog(null)).toBeNull();
    expect(parseLog('{"version":1,"state":{}}')).toBeNull();
    expect(parseLog('nope')).toBeNull();
  });
});

describe('play log analysis', () => {
  const day = (n: number, recipe: string, price: number, capital = 0, unlocked: string[] = []): DayEntry =>
    ({
      day: n,
      capitalSpent: capital,
      unlocked,
      morning: { sec: 0, tabs: [], actions: {}, failed: 0 },
      stands: [{ id: 0, recipe, price }],
    }) as unknown as DayEntry;

  it('finds quiet streaks', () => {
    const days = [day(1, 'a', 1), day(2, 'a', 1), day(3, 'a', 1, 120), day(4, 'a', 1), day(5, 'a', 1, 0, ['uptown']), day(6, 'a', 1)];
    expect(quietStreaks(days)).toEqual({ quietDays: 4, longest: 2 });
  });

  it('counts plan changes from one day to the next', () => {
    const days = [day(1, '6/4/2', 1), day(2, '6/4/2', 1.2), day(3, '6/5/2', 1.2), day(4, '6/5/2', 1.2)];
    expect(planChanges(days)).toEqual({ recipe: 1, price: 1, compared: 3 });
  });

  it('writes a full report from a real game', () => {
    const { logger, tick } = rig();
    let s = newGame(CONFIG, 4);
    logger.open(0, s, 'abc', true);
    for (let d = 0; d < 9; d++) {
      logger.setView('hub:shop');
      tick(30);
      s = playDay(logger, s);
      logger.setView('report');
      tick(5);
    }
    const text = analyze(logger.log!);
    for (const heading of ['# Play log report', '## Time per day', '## Daily decisions', '## Purchases and progress', '## Money', '## Customers by location', '## Stock and weather']) {
      expect(text).toContain(heading);
    }
    expect(text).toContain('days logged: 9');
    expect(text).toContain('maple (9 days)');
  });
});
