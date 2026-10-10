import {
  CONFIG,
  type CampaignId,
  type GameConfig,
  type GlobalUpgrade,
  type Item,
  type LocationId,
  type StandUpgrade,
} from '../config';
import { todayPackCost } from './game';
import { addStock } from './inventory';
import { validPrice, validRecipe } from './recipe';
import { forSale, newStand, upgradeCost } from './stand';
import type { GameState, Recipe, Stand } from './types';
import { cents } from './util';

export type Action =
  | { type: 'buy'; item: Item; pack: number; count?: number }
  | { type: 'setRecipe'; standId: number; recipe: Recipe }
  | { type: 'setPrice'; standId: number; price: number }
  | { type: 'assignStand'; standId: number; locationId: LocationId | null }
  | { type: 'buyUpgrade'; standId: number; upgrade: StandUpgrade }
  | { type: 'buyGlobalUpgrade'; upgrade: GlobalUpgrade }
  | { type: 'buyLicense' }
  | { type: 'hire'; candidateId: string; standId: number }
  | { type: 'fire'; standId: number; staffId: string }
  | { type: 'startCampaign'; campaign: CampaignId; locationId?: LocationId };

export type ActionResult = { ok: true; state: GameState } | { ok: false; error: string; state: GameState };

class ActionError extends Error {}

function standOf(state: GameState, id: number): Stand {
  const s = state.stands.find((x) => x.id === id);
  if (!s) throw new ActionError(`No stand #${id}`);
  return s;
}

function spend(state: GameState, amount: number, what: keyof GameState['ledger']): void {
  const cost = cents(amount);
  if (cost > state.cash + 1e-9) throw new ActionError(`Not enough cash (need $${cost.toFixed(2)})`);
  state.cash = cents(state.cash - cost);
  state.ledger[what] = cents(state.ledger[what] + cost);
}

export function licenseCost(state: GameState, cfg: GameConfig = CONFIG): number | null {
  const n = state.stands.length;
  return n < cfg.stands.maxStands ? cfg.stands.licenseCosts[n]! : null;
}

/** Applies one player action to a copy of the state. The input state is never mutated. */
export function dispatch(state: GameState, action: Action, cfg: GameConfig = CONFIG): ActionResult {
  const s = structuredClone(state);
  try {
    applyAction(s, action, cfg);
    return { ok: true, state: s };
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.message, state };
    throw e;
  }
}

/** Mutating version used inside the sim. Throws ActionError (caught by dispatch). */
export function applyAction(s: GameState, a: Action, cfg: GameConfig): void {
  switch (a.type) {
    case 'buy': {
      const count = a.count ?? 1;
      const pack = cfg.ingredients.items[a.item].packs[a.pack];
      if (!pack || !Number.isInteger(count) || count < 1) throw new ActionError('Invalid pack');
      const cost = todayPackCost(s, a.item, a.pack, cfg) * count;
      spend(s, cost, 'stock');
      addStock(s.inventory, a.item, pack.size * count, cost, s.day);
      return;
    }
    case 'setRecipe': {
      if (!validRecipe(a.recipe, cfg)) throw new ActionError('Recipe out of range');
      standOf(s, a.standId).recipe = { ...a.recipe };
      return;
    }
    case 'setPrice': {
      if (!validPrice(a.price, cfg)) throw new ActionError('Invalid price');
      standOf(s, a.standId).price = Math.round(a.price * 100) / 100;
      return;
    }
    case 'assignStand': {
      const stand = standOf(s, a.standId);
      if (a.locationId !== null) {
        if (!s.locations[a.locationId]?.unlocked) throw new ActionError('Location is locked');
        const other = s.stands.find((x) => x.locationId === a.locationId && x.id !== stand.id);
        if (other) other.locationId = stand.locationId; // swap
      }
      stand.locationId = a.locationId;
      return;
    }
    case 'buyUpgrade': {
      const stand = standOf(s, a.standId);
      const cost = upgradeCost(stand, a.upgrade, cfg);
      if (cost === null) throw new ActionError('Already owned');
      if (!forSale(a.upgrade, cfg)) throw new ActionError('Not for sale');
      spend(s, cost, 'capital');
      const u = stand.upgrades;
      if (a.upgrade === 'body' || a.upgrade === 'juicer' || a.upgrade === 'register') u[a.upgrade] += 1;
      else u[a.upgrade] = true;
      return;
    }
    case 'buyGlobalUpgrade': {
      if (s.globalUpgrades[a.upgrade]) throw new ActionError('Already owned');
      if (!forSale(a.upgrade, cfg)) throw new ActionError('Not for sale');
      spend(s, cfg.upgrades[a.upgrade].cost, 'capital');
      s.globalUpgrades[a.upgrade] = true;
      return;
    }
    case 'buyLicense': {
      const cost = licenseCost(s, cfg);
      if (cost === null) throw new ActionError('No more licences available');
      spend(s, cost, 'capital');
      s.stands.push(newStand(s.stands.length, cfg));
      return;
    }
    case 'hire': {
      const stand = standOf(s, a.standId);
      if (stand.staff.length >= cfg.staff.maxPerStand) throw new ActionError('This stand is fully staffed');
      const i = s.candidates.findIndex((c) => c.id === a.candidateId);
      if (i < 0) throw new ActionError('Candidate not available');
      if (!cfg.staff.roles[s.candidates[i]!.role].forHire) throw new ActionError('Not for hire');
      const c = s.candidates.splice(i, 1)[0]!;
      stand.staff.push({ id: c.id, name: c.name, role: c.role, skill: c.skill, daysWorked: 0 });
      return;
    }
    case 'fire': {
      const stand = standOf(s, a.standId);
      const before = stand.staff.length;
      stand.staff = stand.staff.filter((m) => m.id !== a.staffId);
      if (stand.staff.length === before) throw new ActionError('No such staff member');
      return;
    }
    case 'startCampaign': {
      const c = cfg.marketing.campaigns[a.campaign];
      if (c.scope === 'location') {
        if (!a.locationId || !s.locations[a.locationId]?.unlocked) throw new ActionError('Pick an unlocked location');
      }
      spend(s, c.cost, 'ads');
      s.campaigns.push({ id: a.campaign, startDay: s.day, ...(c.scope === 'location' && a.locationId ? { locationId: a.locationId } : {}) });
      return;
    }
  }
}

export { ActionError };
