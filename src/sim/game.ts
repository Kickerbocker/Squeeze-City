import { CONFIG, type GameConfig, type Item, ITEMS, type LocationId, LOCATION_IDS, STAFF_ROLES } from '../config';
import { dayInfo } from './calendar';
import { heatwaveBonus, ingredientPriceMultiplier, rollMorningEvents } from './events';
import { driftPrices, emptyInventory, inventoryValue, packCost, unitPrice } from './inventory';
import { activeCampaigns } from './marketing';
import { dayRng, STREAM } from './rng';
import { newStand } from './stand';
import type { Candidate, GameState, LocationState } from './types';
import { rollForecast, rollWeather } from './weather';

/** GDD §16: $100, no inventory, one stand at the first location. */
export function newGame(cfg: GameConfig = CONFIG, seed = 1): GameState {
  const first = cfg.locations.locations[0]!;
  const locations = {} as Record<LocationId, LocationState>;
  for (const id of LOCATION_IDS) locations[id] = { unlocked: id === first.id, rep: id === first.id ? cfg.reputation.start : null };
  const stand = newStand(0, cfg);
  stand.locationId = first.id;
  const stands = Array.from({ length: cfg.stands.startingLicenses }, (_, i) => (i === 0 ? stand : newStand(i, cfg)));
  const priceDrift = {} as Record<Item, number>;
  for (const item of ITEMS) priceDrift[item] = 1;

  const state: GameState = {
    seed: seed >>> 0,
    day: 1,
    cash: cfg.progression.startCash,
    inventory: emptyInventory(),
    priceDrift,
    weather: { condition: 'sunny', dayTemp: 0 },
    forecast: { condition: 'sunny', temp: 0 },
    locations,
    stands,
    globalUpgrades: { fridge: false, radio: false },
    candidates: [],
    campaigns: [],
    events: [],
    milestones: [],
    ledger: { stock: 0, ads: 0, capital: 0 },
    stats: { cupsSold: 0, lifetimeRevenue: 0, bestDayProfit: 0, bestDay: 0, netWorthHistory: [], complaints: {} },
  };
  beginDay(state, cfg);
  return state;
}

/** Morning setup for `state.day`: prices, events, weather, forecast, hiring pool. Mutates. */
export function beginDay(state: GameState, cfg: GameConfig): void {
  const day = state.day;
  const info = dayInfo(day, cfg);
  if (day > 1) state.priceDrift = driftPrices(state.priceDrift, dayRng(state.seed, day, STREAM.prices), cfg);
  state.events = state.events.filter((e) => e.endDay >= day);
  state.campaigns = activeCampaigns(state.campaigns, day, cfg);
  rollMorningEvents(state, cfg);
  state.weather = rollWeather(state.seed, day, info.season, heatwaveBonus(state.events, day, cfg), cfg);
  state.forecast = rollForecast(state.seed, day, state.weather, info.season, state.globalUpgrades.radio, cfg);
  if ((day - 1) % cfg.staff.poolRefreshDays === 0) state.candidates = rollCandidates(state.seed, day, cfg);
  state.ledger = { stock: 0, ads: 0, capital: 0 };
}

export function rollCandidates(seed: number, day: number, cfg: GameConfig): Candidate[] {
  const rng = dayRng(seed, day, STREAM.staff);
  const s = cfg.staff;
  const names = [...s.names];
  return Array.from({ length: s.poolSize }, (_, i) => {
    const name = names.splice(rng.int(0, names.length - 1), 1)[0]!;
    return { id: `d${day}-${i}`, name, role: rng.pick(STAFF_ROLES), skill: rng.int(s.minSkill, s.candidateSkillMax) };
  });
}

export function netWorth(state: GameState): number {
  return state.cash + inventoryValue(state.inventory);
}

/** Highest reputation among locations where a stand has opened. */
export function bestRep(state: GameState): number {
  let best = 0;
  for (const id of LOCATION_IDS) {
    const r = state.locations[id].rep;
    if (r !== null && r > best) best = r;
  }
  return best;
}

export function spoilDays(state: GameState, cfg: GameConfig): number {
  return state.globalUpgrades.fridge ? cfg.upgrades.fridge.lemonSpoilDays : cfg.ingredients.lemonSpoilDays;
}

/** Today's unit price for an ingredient, events included. */
export function todayUnitPrice(state: GameState, item: Item, cfg: GameConfig = CONFIG): number {
  return unitPrice(item, state.priceDrift[item], ingredientPriceMultiplier(state.events, item, state.day, cfg), cfg);
}

export function todayPackCost(state: GameState, item: Item, pack: number, cfg: GameConfig = CONFIG): number {
  return packCost(item, pack, state.priceDrift[item], ingredientPriceMultiplier(state.events, item, state.day, cfg), cfg);
}
