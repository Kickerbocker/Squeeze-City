import { describe, expect, it } from 'vitest';
import { memoryStore, migrate, SAVE_VERSION, SaveError, SaveSlots, serialize } from '../src/save/save';
import { newGame, runDay } from '../src/sim';

describe('saves', () => {
  it('round-trips a game through a slot', () => {
    const slots = new SaveSlots(memoryStore());
    const s = runDay(newGame(undefined, 5)).state;
    slots.save(1, s);
    expect(slots.load(1)).toEqual(s);
    expect(slots.load(0)).toBeNull();
    const list = slots.list();
    expect(list).toHaveLength(3);
    expect(list[1]!.state?.day).toBe(2);
    slots.clear(1);
    expect(slots.load(1)).toBeNull();
  });

  it('a loaded game continues identically', () => {
    const slots = new SaveSlots(memoryStore());
    const s = newGame(undefined, 9);
    slots.save(0, s);
    const a = runDay(s);
    const b = runDay(slots.load(0)!);
    expect(b.report).toEqual(a.report);
  });

  it('uses the { version, state } format', () => {
    const s = newGame(undefined, 1);
    expect(JSON.parse(serialize(s))).toEqual({ version: SAVE_VERSION, state: JSON.parse(JSON.stringify(s)) });
  });

  it('runs migrations in order', () => {
    const migrations = {
      1: (s: any) => ({ ...s, a: 1 }),
      2: (s: any) => ({ ...s, b: s.a + 1 }),
    };
    const base = newGame(undefined, 1);
    const out = migrate({ version: 1, state: base }, migrations, 3);
    expect(out.version).toBe(3);
    expect((out.state as any).b).toBe(2);
    expect(() => migrate({ version: 1, state: base }, {}, 2)).toThrow(/No migration/);
  });

  it('rejects broken saves', () => {
    expect(() => migrate(null)).toThrow(SaveError);
    expect(() => migrate({ state: {} })).toThrow(/version/);
    expect(() => migrate({ version: 99, state: {} })).toThrow(/newer/);
    expect(() => migrate({ version: SAVE_VERSION, state: { day: 1 } })).toThrow(/corrupted/);
    const slots = new SaveSlots({ getItem: () => '{oops', setItem: () => {}, removeItem: () => {} });
    expect(slots.list()[0]!.error).toMatch(/JSON/);
  });
});
