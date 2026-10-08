import { describe, expect, it } from 'vitest';
import { ARCHETYPES, CONFIG, ConfigError, loadConfig, LOCATION_IDS, rawConfig } from '../src/config';

const mutate = (fn: (raw: any) => void) => {
  const raw: any = structuredClone(rawConfig());
  fn(raw);
  return () => loadConfig(raw);
};

describe('config loader', () => {
  it('loads and validates the default config', () => {
    expect(() => loadConfig()).not.toThrow();
  });

  it('matches GDD spot values', () => {
    const c = CONFIG;
    expect(c.weather.seasonBaseTemp).toEqual({ spring: 68, summer: 86, fall: 64, winter: 42 });
    expect(c.calendar.daysPerSeason).toBe(28);
    expect(c.calendar.closeHour - c.calendar.openHour).toBe(9);
    expect(c.weather.conditionEffects.storm).toEqual({ traffic: 0.2, thirst: 0.4 });
    expect(c.ingredients.items.lemons.basePrice).toBe(0.3);
    expect(c.ingredients.items.cups.packs.map((p) => p.size)).toEqual([50, 250, 1000]);
    expect(c.ingredients.lemonSpoilDays).toBe(6);
    expect(c.upgrades.fridge.lemonSpoilDays).toBe(12);
    expect(c.recipe.cupsPerPitcher).toBe(12);
    expect(c.customers.archetypes.tourist.wtpBase).toBe(2.25);
    expect(c.customers.archetypes.jogger.sweetShift).toBe(-1);
    expect(c.service.serveMinutes).toBe(0.8);
    expect(c.reputation.start).toBe(40);
    expect(c.locations.locations.find((l) => l.id === 'neon')?.rent).toBe(350);
    expect(c.stands.licenseCosts).toEqual([0, 2000, 8000, 25000]);
    expect(c.upgrades.body.tiers.map((t) => t.appeal)).toEqual([1, 1.15, 1.35, 1.6]);
    expect(c.upgrades.juicer.tiers.map((t) => t.prepMinutes)).toEqual([4, 3, 2, 1]);
    expect(c.staff.roles.server.baseWage).toBe(40);
    expect(c.marketing.campaigns.tv).toMatchObject({ cost: 1500, days: 10, adBonus: 0.3, trafficBonus: 0.12 });
    expect(c.marketing.adFactorCap).toBe(1.6);
    expect(c.events.competitor.steal).toBe(0.2);
    expect(c.events.inspector.fine).toBe(200);
    expect(c.progression.startCash).toBe(100);
  });

  it('covers every archetype and location', () => {
    expect(Object.keys(CONFIG.customers.archetypes).sort()).toEqual([...ARCHETYPES].sort());
    expect(CONFIG.locations.locations.map((l) => l.id)).toEqual([...LOCATION_IDS]);
    for (const a of ARCHETYPES) {
      const h = CONFIG.customers.archetypes[a].hourly;
      expect(h).toHaveLength(10);
      expect(Math.max(...h)).toBe(1);
    }
  });

  it('location mixes sum to 100', () => {
    for (const loc of CONFIG.locations.locations) {
      expect(Object.values(loc.mix).reduce((a, b) => a + (b ?? 0), 0)).toBe(100);
    }
  });

  it('rejects malformed config with a useful path', () => {
    expect(mutate((r) => (r.weather.seasonBaseTemp.summer = 'hot'))).toThrow(/weather\.seasonBaseTemp\.summer/);
    expect(mutate((r) => delete r.recipe.cupsPerPitcher)).toThrow(ConfigError);
    expect(mutate((r) => (r.recipe.typo = 1))).toThrow(/unknown key/);
    expect(mutate((r) => (r.customers.archetypes.kid.hourly = [1, 2]))).toThrow(/length 10/);
    expect(mutate((r) => (r.locations.locations[0].mix.kid = 50))).toThrow(/sum to 100/);
    expect(mutate((r) => (r.locations.locations[1].id = 'maple'))).toThrow(/duplicate/);
    expect(mutate((r) => (r.stands.licenseCosts = [0, 1]))).toThrow(/one cost per stand/);
    expect(mutate((r) => (r.weather.forecast.accuracy = 1.5))).toThrow(/<= 1/);
    expect(mutate((r) => (r.recipe.lemons.min = 1.5))).toThrow(/integer/);
    expect(mutate((r) => (r.customers.archetypes.martian = r.customers.archetypes.kid))).toThrow(/unknown key/);
  });
});
