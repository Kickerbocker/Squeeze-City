import { ARCHETYPES, type Archetype, type GameConfig, type LocationConfig } from '../config';
import type { Bubble } from './types';
import { clamp } from './util';

/** GDD §7: repFactor = 0.5 + rep/100. */
export function repFactor(rep: number, cfg: GameConfig): number {
  const d = cfg.customers.decision;
  return d.repFactorBase + rep / d.repScale;
}

export interface StopInputs {
  appeal: number;
  rep: number;
  adFactor: number;
  wThirst: number;
  tThirst: number;
  /** Staff and upgrade multipliers (Promoter, Speaker). */
  multiplier: number;
}

/** GDD §7: P_stop = min(0.95, 0.25 · appeal · repFactor · adFactor · W_thirst · T_thirst). */
export function stopProbability(i: StopInputs, cfg: GameConfig): number {
  const d = cfg.customers.decision;
  return Math.min(d.stopMax, d.stopBase * i.appeal * repFactor(i.rep, cfg) * i.adFactor * i.wThirst * i.tThirst * i.multiplier);
}

/** GDD §7: WTP = base · (0.6 + 0.4·T_thirst) · (0.75 + 0.5·rep/100) · noise, noise ~ LogNormal(0.25). */
export function willingnessToPay(base: number, tThirst: number, rep: number, noise: number, cfg: GameConfig): number {
  const d = cfg.customers.decision;
  return base * (d.wtpThirstBase + d.wtpThirstScale * tThirst) * (d.wtpRepBase + (d.wtpRepScale * rep) / d.repScale) * noise;
}

/** GDD §7: P_buy = 1 / (1 + exp(priceSens · 6 · (price/WTP − 1))). */
export function buyProbability(price: number, wtp: number, priceSens: number, cfg: GameConfig): number {
  const k = priceSens * cfg.customers.decision.buySteepness * (price / wtp - 1);
  return 1 / (1 + Math.exp(k));
}

export interface Satisfaction {
  sat: number;
  fairness: number;
  waitFactor: number;
  qualityTerm: number;
}

/** GDD §7: sat = Q^qualitySens · fairness · waitFactor. */
export function satisfaction(
  q: number,
  qualitySens: number,
  wtp: number,
  price: number,
  wait: number,
  patience: number,
  cfg: GameConfig,
): Satisfaction {
  const d = cfg.customers.decision;
  const fairness = clamp(wtp / price, d.fairnessMin, d.fairnessMax) / d.fairnessMax;
  const waitFactor = 1 - d.waitPenalty * Math.min(1, Math.max(0, wait) / patience);
  const qualityTerm = Math.pow(q, qualitySens);
  return { sat: qualityTerm * fairness * waitFactor, fairness, waitFactor, qualityTerm };
}

/**
 * Bubble after drinking: "Delicious!" above satHigh; below satLow the most relevant
 * complaint. Recipe complaints come first; if none triggered, blame whichever of
 * price or wait hurt most. Otherwise no bubble.
 */
export function drinkBubble(s: Satisfaction, recipeComplaints: Bubble[], cfg: GameConfig): Bubble | undefined {
  const d = cfg.customers.decision;
  if (s.sat > d.satHigh) return 'delicious';
  if (s.sat >= d.satLow) return undefined;
  if (recipeComplaints.length > 0) return recipeComplaints[0];
  if (s.fairness <= s.waitFactor && s.fairness < s.qualityTerm) return 'overpriced';
  if (s.waitFactor < s.qualityTerm) return 'slowService';
  return undefined;
}

/** Hourly weight at a fractional hour, linearly interpolated over the 10 hourly points. */
export function hourlyWeight(curve: readonly number[], hourFloat: number, cfg: GameConfig): number {
  const x = clamp(hourFloat - cfg.calendar.openHour, 0, curve.length - 1);
  const i = Math.min(Math.floor(x), curve.length - 2);
  const f = x - i;
  return curve[i]! * (1 - f) + curve[i + 1]! * f;
}

/** Mean of the interpolated curve over business hours (trapezoid rule). */
export function curveMean(curve: readonly number[]): number {
  const n = curve.length - 1;
  let total = 0;
  for (let i = 0; i < n; i++) total += (curve[i]! + curve[i + 1]!) / 2;
  return total / n;
}

/**
 * Archetype shares (summing to 1) at a location for a day. Kids get their weekend
 * multiplier; fans only appear on game days. Shares are renormalized.
 */
export function archetypeShares(
  loc: LocationConfig,
  weekend: boolean,
  gameDay: boolean,
  cfg: GameConfig,
): Partial<Record<Archetype, number>> {
  const raw: Partial<Record<Archetype, number>> = {};
  let total = 0;
  for (const a of ARCHETYPES) {
    const share = loc.mix[a];
    if (!share) continue;
    const ac = cfg.customers.archetypes[a];
    if (ac.gameDaysOnly && !gameDay) continue;
    const w = share * (weekend ? ac.weekendMultiplier : 1);
    raw[a] = w;
    total += w;
  }
  if (total <= 0) return {};
  for (const a of Object.keys(raw) as Archetype[]) raw[a] = raw[a]! / total;
  return raw;
}
