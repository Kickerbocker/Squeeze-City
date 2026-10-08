import type { GameConfig, LocationId } from '../config';
import type { Campaign } from './types';

/** Remaining strength (1 → 0, linear decay) of a campaign on `day`, or 0 if inactive. */
export function campaignStrength(c: Campaign, day: number, cfg: GameConfig): number {
  const days = cfg.marketing.campaigns[c.id].days;
  const k = day - c.startDay;
  if (k < 0 || k >= days) return 0;
  return 1 - k / days;
}

function applies(c: Campaign, locationId: LocationId, cfg: GameConfig): boolean {
  return cfg.marketing.campaigns[c.id].scope === 'all' || c.locationId === locationId;
}

/** GDD §14: overlapping campaigns multiply; adFactor capped at 1.6. */
export function adFactor(campaigns: readonly Campaign[], locationId: LocationId, day: number, cfg: GameConfig): number {
  let f = 1;
  for (const c of campaigns) {
    if (!applies(c, locationId, cfg)) continue;
    f *= 1 + cfg.marketing.campaigns[c.id].adBonus * campaignStrength(c, day, cfg);
  }
  return Math.min(cfg.marketing.adFactorCap, f);
}

export function marketingTraffic(campaigns: readonly Campaign[], locationId: LocationId, day: number, cfg: GameConfig): number {
  let f = 1;
  for (const c of campaigns) {
    if (!applies(c, locationId, cfg)) continue;
    f *= 1 + cfg.marketing.campaigns[c.id].trafficBonus * campaignStrength(c, day, cfg);
  }
  return f;
}

export function activeCampaigns(campaigns: readonly Campaign[], day: number, cfg: GameConfig): Campaign[] {
  return campaigns.filter((c) => campaignStrength(c, day, cfg) > 0);
}
