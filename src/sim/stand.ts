import type { Archetype, GameConfig, StandUpgrade } from '../config';
import type { Stand, StaffMember } from './types';

export function newStand(id: number, cfg: GameConfig): Stand {
  const d = cfg.recipe.defaults;
  return {
    id,
    locationId: null,
    recipe: { lemons: d.lemons, sugar: d.sugar, ice: d.ice },
    price: d.price,
    upgrades: { body: 0, juicer: 0, register: 0, cooler: false, umbrella: false, neon: false, speaker: false },
    staff: [],
  };
}

/** GDD §12: appeal from stand body tier plus the Neon sign. */
export function appeal(stand: Stand, cfg: GameConfig): number {
  const u = cfg.upgrades;
  return u.body.tiers[stand.upgrades.body]!.appeal + (stand.upgrades.neon ? u.neon.appealBonus : 0);
}

/** GDD §8/§12/§13: Juicer tier sets prep time; each Mixer cuts (0.3 + 0.1·s) min, floored at 0.5. */
export function prepMinutes(stand: Stand, cfg: GameConfig): number {
  const base = cfg.upgrades.juicer.tiers[stand.upgrades.juicer]!.prepMinutes;
  const m = cfg.staff.roles.mixer;
  const cut = stand.staff
    .filter((s) => s.role === 'mixer')
    .reduce((a, s) => a + m.prepCutBase + m.prepCutPerSkill * s.skill, 0);
  if (cut === 0) return base;
  return Math.max(m.prepFloor, base - cut);
}

/** GDD §8: 0.8 min per customer, ×0.8 per Register tier. */
export function serveMinutes(stand: Stand, cfg: GameConfig): number {
  return cfg.service.serveMinutes * Math.pow(cfg.upgrades.register.serveMultiplierPerTier, stand.upgrades.register);
}

/** Serving lanes: the owner at speed 1, plus one lane per Server at 0.7 + 0.1·s. */
export function laneSpeeds(stand: Stand, cfg: GameConfig): number[] {
  const r = cfg.staff.roles.server;
  return [1, ...stand.staff.filter((s) => s.role === 'server').map((s) => r.speedBase + r.speedPerSkill * s.skill)];
}

/** Promoter (§13) and Speaker (§12) multipliers on P_stop. */
export function stopMultiplier(stand: Stand, archetype: Archetype, cfg: GameConfig): number {
  const p = cfg.staff.roles.promoter;
  let m = 1;
  for (const s of stand.staff) if (s.role === 'promoter') m *= p.stopBase + p.stopPerSkill * s.skill;
  if (stand.upgrades.speaker && cfg.upgrades.speaker.archetypes.includes(archetype)) m *= cfg.upgrades.speaker.stopMultiplier;
  return m;
}

export function patienceMultiplier(stand: Stand, temp: number, condition: string, cfg: GameConfig): number {
  const u = cfg.upgrades.umbrella;
  if (!stand.upgrades.umbrella) return 1;
  const applies = temp > u.tempAbove || (u.conditions as readonly string[]).includes(condition);
  return applies ? 1 + u.patienceBonus : 1;
}

export function wage(member: Pick<StaffMember, 'role' | 'skill'>, cfg: GameConfig): number {
  const r = cfg.staff.roles[member.role];
  return r.baseWage + r.wagePerSkill * member.skill;
}

export function standWages(stand: Stand, cfg: GameConfig): number {
  return stand.staff.reduce((a, s) => a + wage(s, cfg), 0);
}

/** Price of the next tier / the one-off upgrade, or null if already owned/maxed. */
export function upgradeCost(stand: Stand, upgrade: StandUpgrade, cfg: GameConfig): number | null {
  const u = cfg.upgrades;
  switch (upgrade) {
    case 'body':
    case 'juicer':
    case 'register': {
      const tiers = u[upgrade].tiers;
      const next = tiers[stand.upgrades[upgrade] + 1];
      return next ? next.cost : null;
    }
    case 'cooler':
    case 'umbrella':
    case 'neon':
    case 'speaker':
      return stand.upgrades[upgrade] ? null : u[upgrade].cost;
  }
}
