// Hand-written runtime guards for config JSON. Each guard validates an unknown
// value and returns it typed, so the schema and the TypeScript types stay in sync.

export class ConfigError extends Error {}

export type Guard<T> = (value: unknown, path: string) => T;
export type Infer<G> = G extends Guard<infer T> ? T : never;

function fail(path: string, message: string): never {
  throw new ConfigError(`${path || '<root>'}: ${message}`);
}

export interface NumOpts {
  min?: number;
  max?: number;
  int?: boolean;
}

export function num(opts: NumOpts = {}): Guard<number> {
  return (v, p) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) fail(p, `expected a finite number, got ${JSON.stringify(v)}`);
    if (opts.int && !Number.isInteger(v)) fail(p, `expected an integer, got ${v}`);
    if (opts.min !== undefined && v < opts.min) fail(p, `expected >= ${opts.min}, got ${v}`);
    if (opts.max !== undefined && v > opts.max) fail(p, `expected <= ${opts.max}, got ${v}`);
    return v;
  };
}

export const str: Guard<string> = (v, p) => {
  if (typeof v !== 'string' || v.length === 0) fail(p, 'expected a non-empty string');
  return v;
};

export const bool: Guard<boolean> = (v, p) => {
  if (typeof v !== 'boolean') fail(p, 'expected a boolean');
  return v;
};

export function oneOf<const T extends readonly string[]>(values: T): Guard<T[number]> {
  return (v, p) => {
    if (typeof v !== 'string' || !values.includes(v)) fail(p, `expected one of ${values.join(', ')}, got ${JSON.stringify(v)}`);
    return v as T[number];
  };
}

export function arr<T>(item: Guard<T>, opts: { len?: number; minLen?: number } = {}): Guard<T[]> {
  return (v, p) => {
    if (!Array.isArray(v)) fail(p, 'expected an array');
    if (opts.len !== undefined && v.length !== opts.len) fail(p, `expected length ${opts.len}, got ${v.length}`);
    if (opts.minLen !== undefined && v.length < opts.minLen) fail(p, `expected at least ${opts.minLen} items`);
    return v.map((x, i) => item(x, `${p}[${i}]`));
  };
}

type Shape = Record<string, Guard<unknown>>;
type FromShape<S extends Shape> = { [K in keyof S]: Infer<S[K]> };

/** Object with exactly these keys (unknown keys are rejected to catch typos). */
export function obj<S extends Shape>(shape: S): Guard<FromShape<S>> {
  return (v, p) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(p, 'expected an object');
    const rec = v as Record<string, unknown>;
    for (const k of Object.keys(rec)) {
      if (!(k in shape)) fail(`${p}.${k}`, 'unknown key');
    }
    const out: Record<string, unknown> = {};
    for (const [k, g] of Object.entries(shape)) {
      out[k] = g(rec[k], `${p}.${k}`);
    }
    return out as FromShape<S>;
  };
}

/** Value may be missing (undefined). */
export function opt<T>(g: Guard<T>): Guard<T | undefined> {
  return (v, p) => (v === undefined ? undefined : g(v, p));
}

/** Object whose keys are exactly the given ids. */
export function recordOf<const K extends readonly string[], T>(keys: K, item: Guard<T>): Guard<Record<K[number], T>> {
  return (v, p) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(p, 'expected an object');
    const rec = v as Record<string, unknown>;
    for (const k of Object.keys(rec)) {
      if (!keys.includes(k)) fail(`${p}.${k}`, 'unknown key');
    }
    const out: Record<string, T> = {};
    for (const k of keys) {
      if (!(k in rec)) fail(`${p}.${k}`, 'missing key');
      out[k] = item(rec[k], `${p}.${k}`);
    }
    return out as Record<K[number], T>;
  };
}

/** Object whose keys are a subset of the given ids. */
export function partialRecordOf<const K extends readonly string[], T>(
  keys: K,
  item: Guard<T>,
): Guard<Partial<Record<K[number], T>>> {
  return (v, p) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(p, 'expected an object');
    const out: Partial<Record<K[number], T>> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (!keys.includes(k)) fail(`${p}.${k}`, 'unknown key');
      out[k as K[number]] = item(x, `${p}.${k}`);
    }
    return out;
  };
}

export function check(cond: boolean, path: string, message: string): void {
  if (!cond) fail(path, message);
}
