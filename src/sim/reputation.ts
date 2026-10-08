import type { GameConfig } from '../config';
import { clamp } from './util';

/** GDD §9: rep ← clamp(rep + 0.2·(100·daySat − rep) − 10·lostRate, 0, 100). */
export function updateRep(rep: number, daySat: number, lostRate: number, cfg: GameConfig): number {
  const r = cfg.reputation;
  return clamp(rep + r.learnRate * (r.satScale * daySat - rep) - r.lostPenalty * lostRate, r.min, r.max);
}

/** GDD §9: lostRate = (lostQueue + lostSoldOut) / max(1, stoppers). */
export function lostRate(lostQueue: number, lostSoldOut: number, stoppers: number): number {
  return (lostQueue + lostSoldOut) / Math.max(1, stoppers);
}

/** GDD §9: a new location starts at 0.5 × mean rep of owned locations. */
export function newLocationRep(ownedReps: readonly number[], cfg: GameConfig): number {
  if (ownedReps.length === 0) return cfg.reputation.start;
  const mean = ownedReps.reduce((a, b) => a + b, 0) / ownedReps.length;
  return clamp(cfg.reputation.newLocationFactor * mean, cfg.reputation.min, cfg.reputation.max);
}

/** GDD §9: a location with no stand that day loses 1 rep. */
export function idleRep(rep: number, cfg: GameConfig): number {
  return clamp(rep - cfg.reputation.idleDecayPerDay, cfg.reputation.min, cfg.reputation.max);
}
