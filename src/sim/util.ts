export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/** Rounds money to whole cents. */
export const cents = (x: number): number => Math.round(x * 100) / 100;

export const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

export class SimError extends Error {}
