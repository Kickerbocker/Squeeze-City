// Versioned localStorage saves. Format: { version, state }.
import type { GameState } from '../sim';

export const SAVE_VERSION = 1;
export const SLOT_COUNT = 3;
const KEY = (slot: number) => `squeeze-city:slot:${slot}`;

export interface SaveFile {
  version: number;
  state: GameState;
}

/** Minimal Storage interface so tests can pass an in-memory store. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class SaveError extends Error {}

/**
 * Migrations from version N to N+1. Add one whenever GameState changes shape:
 *   MIGRATIONS[1] = (s) => ({ ...s, newField: default })  // upgrades a v1 state to v2
 */
export const MIGRATIONS: Record<number, (state: any) => any> = {};

export function migrate(raw: unknown, migrations = MIGRATIONS, target = SAVE_VERSION): SaveFile {
  if (typeof raw !== 'object' || raw === null) throw new SaveError('Save is not an object');
  const file = raw as { version?: unknown; state?: unknown };
  if (typeof file.version !== 'number' || !Number.isInteger(file.version)) throw new SaveError('Save has no version');
  if (file.version > target) throw new SaveError(`Save is from a newer version (${file.version})`);
  let state = file.state;
  for (let v = file.version; v < target; v++) {
    const m = migrations[v];
    if (!m) throw new SaveError(`No migration from version ${v}`);
    state = m(state);
  }
  if (!looksLikeState(state)) throw new SaveError('Save is corrupted');
  return { version: target, state };
}

function looksLikeState(s: unknown): s is GameState {
  if (typeof s !== 'object' || s === null) return false;
  const g = s as Partial<GameState>;
  return (
    typeof g.seed === 'number' &&
    typeof g.day === 'number' &&
    typeof g.cash === 'number' &&
    Array.isArray(g.stands) &&
    typeof g.inventory === 'object' &&
    typeof g.locations === 'object'
  );
}

export function serialize(state: GameState): string {
  const file: SaveFile = { version: SAVE_VERSION, state };
  return JSON.stringify(file);
}

export function deserialize(text: string): SaveFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SaveError('Save is not valid JSON');
  }
  return migrate(raw);
}

export class SaveSlots {
  constructor(private store: KeyValueStore) {}

  save(slot: number, state: GameState): void {
    this.store.setItem(KEY(slot), serialize(state));
  }

  load(slot: number): GameState | null {
    const text = this.store.getItem(KEY(slot));
    if (text === null) return null;
    return deserialize(text).state;
  }

  /** Slot summaries for the title screen; a broken slot reports its error. */
  list(): ({ slot: number; state: GameState | null; error?: string })[] {
    return Array.from({ length: SLOT_COUNT }, (_, slot) => {
      try {
        return { slot, state: this.load(slot) };
      } catch (e) {
        return { slot, state: null, error: (e as Error).message };
      }
    });
  }

  clear(slot: number): void {
    this.store.removeItem(KEY(slot));
  }
}

export function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}
