import { describe, expect, it } from 'vitest';
import { CONFIG as C } from '../src/config';
import { dispatch, newGame, runDay, spoilDays, type GameState } from '../src/sim';
import { rollCandidates } from '../src/sim/game';
import { forSale, newStand, patienceMultiplier, prepMinutes, rolesForHire } from '../src/sim/stand';
import { stockUp } from './helpers';

/** A game with a stand at Maple Park and a reputation high enough for the early unlocks. */
function started(seed = 1): GameState {
  const s = newGame(C, seed);
  s.stands[0]!.locationId = 'maple';
  s.locations.maple.rep = 80;
  return s;
}

describe('M9: locations unlock on money earned', () => {
  it('ignores cash in hand', () => {
    const s = started();
    s.cash = 100_000;
    const r = runDay(s, { stands: { 0: { locationId: null } } });
    expect(r.state.stats.lifetimeRevenue).toBe(0);
    expect(r.state.locations.uptown.unlocked).toBe(false);
  });

  it('reads lifetime revenue and reputation', () => {
    const s = started();
    s.cash = 0;
    s.stats.lifetimeRevenue = 1000;
    const r = runDay(s, { stands: { 0: { locationId: null } } });
    expect(r.state.locations.uptown.unlocked).toBe(true);
    expect(r.state.locations.campus.unlocked).toBe(true);
    expect(r.state.locations.boardwalk.unlocked).toBe(false); // needs $5,000 earned
    expect(r.report.unlocked).toEqual(['uptown', 'campus']);
  });

  it('still needs the reputation', () => {
    const s = started();
    s.locations.maple.rep = 30;
    s.stats.lifetimeRevenue = 1000;
    const r = runDay(s, { stands: { 0: { locationId: null } } });
    expect(r.state.locations.uptown.unlocked).toBe(false);
  });
});

describe('M9: only items for sale are sold', () => {
  it('the config parks Cooler, Umbrella and Fridge', () => {
    expect((['cooler', 'umbrella', 'fridge'] as const).map((u) => forSale(u, C))).toEqual([false, false, false]);
    expect((['body', 'juicer', 'register', 'neon', 'speaker', 'radio'] as const).every((u) => forSale(u, C))).toBe(true);
  });

  it('refuses to sell parked upgrades', () => {
    const s = { ...newGame(C, 1), cash: 5000 };
    for (const upgrade of ['cooler', 'umbrella'] as const) {
      const r = dispatch(s, { type: 'buyUpgrade', standId: 0, upgrade });
      expect(r.ok).toBe(false);
      expect(r.state.cash).toBe(5000);
    }
    expect(dispatch(s, { type: 'buyGlobalUpgrade', upgrade: 'fridge' }).ok).toBe(false);
    expect(dispatch(s, { type: 'buyUpgrade', standId: 0, upgrade: 'neon' }).ok).toBe(true);
  });

  it('the hiring pool never rolls a role that is not for hire', () => {
    expect(rolesForHire(C)).toEqual(['server', 'promoter']);
    for (let day = 1; day <= 365; day += 7) {
      for (const c of rollCandidates(7, day, C)) expect(c.role).not.toBe('mixer');
    }
  });

  it('refuses to hire a Mixer left in a pool from an older save', () => {
    const s = newGame(C, 1);
    s.candidates = [{ id: 'old', name: 'Milo', role: 'mixer', skill: 2 }];
    expect(dispatch(s, { type: 'hire', candidateId: 'old', standId: 0 }).ok).toBe(false);
  });
});

describe('M9: parked items already owned keep working', () => {
  it('Umbrella, Fridge and Mixer keep their effect', () => {
    const stand = newStand(0, C);
    stand.upgrades.umbrella = true;
    expect(patienceMultiplier(stand, 70, 'rain', C)).toBeCloseTo(1 + C.upgrades.umbrella.patienceBonus);
    stand.staff.push({ id: 'm', name: 'Milo', role: 'mixer', skill: 2, daysWorked: 0 });
    expect(prepMinutes(stand, C)).toBeLessThan(C.upgrades.juicer.tiers[0]!.prepMinutes);
    const s = newGame(C, 1);
    s.globalUpgrades.fridge = true;
    expect(spoilDays(s, C)).toBe(C.upgrades.fridge.lemonSpoilDays);
  });

  it('an owned Cooler still slows melting during the day', () => {
    // Find a day where the cooler changes the outcome, then check it never makes things worse.
    let differed = false;
    for (let seed = 1; seed <= 20; seed++) {
      const base = stockUp(started(seed));
      const cooled = structuredClone(base);
      cooled.stands[0]!.upgrades.cooler = true;
      const a = runDay(base).report;
      const b = runDay(cooled).report;
      if (JSON.stringify(a) !== JSON.stringify(b)) differed = true;
      expect(b.cupsSold).toBeGreaterThanOrEqual(a.cupsSold);
    }
    expect(differed).toBe(true);
  });
});
