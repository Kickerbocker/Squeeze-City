import { describe, expect, it } from 'vitest';
import { CONFIG as C } from '../src/config';
import { competitorSteal, heatwaveBonus, ingredientPriceMultiplier, isGameDay, eventTrafficMultiplier } from '../src/sim/events';
import { adFactor, campaignStrength, marketingTraffic } from '../src/sim/marketing';
import { idleRep, lostRate, newLocationRep, updateRep } from '../src/sim/reputation';
import { appeal, laneSpeeds, newStand, prepMinutes, serveMinutes, stopMultiplier, upgradeCost, wage } from '../src/sim/stand';
import type { StaffMember } from '../src/sim/types';

const staff = (role: StaffMember['role'], skill: number): StaffMember => ({ id: `${role}${skill}`, name: 'x', role, skill, daysWorked: 0 });

describe('reputation (GDD §9)', () => {
  it('rep ← clamp(rep + 0.2(100·sat − rep) − 10·lostRate)', () => {
    expect(updateRep(40, 0.8, 0, C)).toBeCloseTo(48);
    expect(updateRep(40, 0.8, 0.5, C)).toBeCloseTo(43);
    expect(updateRep(2, 0, 1, C)).toBe(0);
    expect(updateRep(99, 1, 0, C)).toBeLessThanOrEqual(100);
    expect(lostRate(3, 2, 10)).toBeCloseTo(0.5);
    expect(lostRate(0, 0, 0)).toBe(0);
  });
  it('new location starts at half the mean owned rep; idle locations lose 1/day', () => {
    expect(newLocationRep([60, 80], C)).toBeCloseTo(35);
    expect(idleRep(10, C)).toBe(9);
    expect(idleRep(0.5, C)).toBe(0);
  });
});

describe('stands, upgrades, staff (GDD §8, §12, §13)', () => {
  it('appeal from body tier + neon', () => {
    const s = newStand(0, C);
    expect(appeal(s, C)).toBe(1);
    s.upgrades.body = 2;
    s.upgrades.neon = true;
    expect(appeal(s, C)).toBeCloseTo(1.45);
  });
  it('prep time from juicer and mixers (floor 0.5)', () => {
    const s = newStand(0, C);
    expect(prepMinutes(s, C)).toBe(4);
    s.upgrades.juicer = 2;
    expect(prepMinutes(s, C)).toBe(2);
    s.staff.push(staff('mixer', 3));
    expect(prepMinutes(s, C)).toBeCloseTo(1.4);
    s.upgrades.juicer = 3;
    s.staff.push(staff('mixer', 5));
    expect(prepMinutes(s, C)).toBe(0.5);
  });
  it('serve time ×0.8 per register tier; servers add lanes', () => {
    const s = newStand(0, C);
    expect(serveMinutes(s, C)).toBeCloseTo(2.0);
    s.upgrades.register = 2;
    expect(serveMinutes(s, C)).toBeCloseTo(1.28);
    s.staff.push(staff('server', 2));
    expect(laneSpeeds(s, C)).toEqual([1, expect.closeTo(0.9)]);
  });
  it('promoter and speaker multiply P_stop', () => {
    const s = newStand(0, C);
    s.staff.push(staff('promoter', 5));
    expect(stopMultiplier(s, 'office', C)).toBeCloseTo(1.4);
    s.upgrades.speaker = true;
    expect(stopMultiplier(s, 'kid', C)).toBeCloseTo(1.4 * 1.1);
    expect(stopMultiplier(s, 'senior', C)).toBeCloseTo(1.4);
  });
  it('wages and upgrade costs', () => {
    expect(wage(staff('server', 1), C)).toBe(12);
    expect(wage(staff('mixer', 3), C)).toBe(65);
    expect(wage(staff('promoter', 5), C)).toBe(28);
    const s = newStand(0, C);
    expect(upgradeCost(s, 'body', C)).toBe(120);
    s.upgrades.body = 3;
    expect(upgradeCost(s, 'body', C)).toBeNull();
    expect(upgradeCost(s, 'cooler', C)).toBe(250);
    s.upgrades.cooler = true;
    expect(upgradeCost(s, 'cooler', C)).toBeNull();
  });
});

describe('marketing (GDD §14)', () => {
  it('decays linearly over the duration', () => {
    const c = { id: 'flyers' as const, startDay: 10, locationId: 'maple' as const };
    expect(campaignStrength(c, 9, C)).toBe(0);
    expect(campaignStrength(c, 10, C)).toBe(1);
    expect(campaignStrength(c, 11, C)).toBeCloseTo(2 / 3);
    expect(campaignStrength(c, 13, C)).toBe(0);
    expect(adFactor([c], 'maple', 10, C)).toBeCloseTo(1.25);
    expect(adFactor([c], 'uptown', 10, C)).toBe(1);
  });
  it('overlapping campaigns multiply, capped at 1.6', () => {
    const tv = { id: 'tv' as const, startDay: 1 };
    const radio = { id: 'radio' as const, startDay: 1 };
    expect(adFactor([tv, radio], 'maple', 1, C)).toBeCloseTo(1.3 * 1.18);
    expect(adFactor([tv, tv, tv], 'maple', 1, C)).toBe(1.6);
    expect(marketingTraffic([tv, radio], 'neon', 1, C)).toBeCloseTo(1.12 * 1.05);
  });
});

describe('events (GDD §10, §15)', () => {
  it('stadium has exactly 2 game days per week, deterministically', () => {
    for (let w = 0; w < 20; w++) {
      let n = 0;
      for (let d = 1; d <= 7; d++) if (isGameDay(5, w * 7 + d, C)) n++;
      expect(n).toBe(2);
    }
    expect(isGameDay(5, 3, C)).toBe(isGameDay(5, 3, C));
  });
  it('event modifiers', () => {
    const evs = [
      { kind: 'festival' as const, startDay: 5, endDay: 5, locationId: 'maple' as const },
      { kind: 'construction' as const, startDay: 4, endDay: 9, locationId: 'maple' as const },
      { kind: 'lemonShortage' as const, startDay: 5, endDay: 7 },
      { kind: 'heatwave' as const, startDay: 5, endDay: 6 },
      { kind: 'competitor' as const, startDay: 1, endDay: 7, locationId: 'uptown' as const },
    ];
    expect(eventTrafficMultiplier(evs, 'maple', 5, C)).toBeCloseTo(1.25);
    expect(eventTrafficMultiplier(evs, 'maple', 6, C)).toBeCloseTo(0.5);
    expect(ingredientPriceMultiplier(evs, 'lemons', 6, C)).toBeCloseTo(1.6);
    expect(ingredientPriceMultiplier(evs, 'sugar', 6, C)).toBe(1);
    expect(heatwaveBonus(evs, 6, C)).toBe(12);
    expect(heatwaveBonus(evs, 7, C)).toBe(0);
    expect(competitorSteal(evs, 'uptown', 50, 3, C)).toBe(0.2);
    expect(competitorSteal(evs, 'uptown', 71, 3, C)).toBe(0.05);
    expect(competitorSteal(evs, 'maple', 50, 3, C)).toBe(0);
  });
});
