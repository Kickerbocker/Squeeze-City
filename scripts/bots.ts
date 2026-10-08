// Balance bots (GDD §17). Bots only use the public sim API (dispatch / runDay) plus
// the formula functions to estimate demand, as an experienced player would.
import {
  type Archetype,
  type GameConfig,
  type Item,
  type LocationConfig,
  type LocationId,
  type StandUpgrade,
} from '../src/config';
import { dayInfo, dayMinutes } from '../src/sim/calendar';
import { archetypeShares, buyProbability, curveMean, hourlyWeight, stopProbability, willingnessToPay } from '../src/sim/customers';
import { competitorSteal, eventTrafficMultiplier, isGameDay } from '../src/sim/events';
import { todayPackCost, todayUnitPrice } from '../src/sim/game';
import { lemonCount } from '../src/sim/inventory';
import { adFactor, marketingTraffic } from '../src/sim/marketing';
import { idealIce } from '../src/sim/recipe';
import { newLocationRep } from '../src/sim/reputation';
import { appeal, laneSpeeds, prepMinutes, serveMinutes, standWages, stopMultiplier, upgradeCost, wage } from '../src/sim/stand';
import { dispatch, type Action, type DayPlan, type DayReport, type GameState, type Recipe, type Stand } from '../src/sim';
import { conditionEffect, meanDayTemp, tempAtMinute, tempThirst } from '../src/sim/weather';

export interface BotOptions {
  name: string;
  /** Always charge this price instead of optimizing. */
  fixedPrice?: number;
  /** Multiplier on the stock bought each morning (Hoarder = 3, ignoring stock on hand). */
  hoard?: number;
  /** Buy upgrades, licences, staff and expand to new locations. */
  expand: boolean;
}

export interface BotMemory {
  lastReport: DayReport | null;
}

export interface Estimate {
  stoppers: number;
  buyers: number;
  unitCost: number;
  profit: number;
  /** Share of expected buyers per archetype (for recipe choice). */
  mix: Partial<Record<Archetype, number>>;
}

// Lognormal(σ) expectation via a small fixed quadrature (z, weight).
const QUAD: [number, number][] = [
  [-2, 0.054],
  [-1, 0.244],
  [0, 0.404],
  [1, 0.244],
  [2, 0.054],
];

const locCfg = (cfg: GameConfig, id: LocationId): LocationConfig => cfg.locations.locations.find((l) => l.id === id)!;

export function cupCost(state: GameState, recipe: Recipe, cfg: GameConfig): number {
  const p = (i: Item) => todayUnitPrice(state, i, cfg);
  return (recipe.lemons * p('lemons') + recipe.sugar * p('sugar')) / cfg.recipe.cupsPerPitcher + recipe.ice * p('ice') + p('cups');
}

function repAt(state: GameState, id: LocationId, cfg: GameConfig): number {
  const r = state.locations[id].rep;
  if (r !== null) return r;
  const owned = Object.values(state.locations)
    .map((l) => l.rep)
    .filter((x): x is number => x !== null);
  return newLocationRep(owned, cfg);
}

/** Expected sales for a stand at a location today, from the forecast. */
export function estimate(state: GameState, stand: Stand, id: LocationId, price: number, recipe: Recipe, cfg: GameConfig): Estimate {
  const loc = locCfg(cfg, id);
  const info = dayInfo(state.day, cfg);
  const gameDay = isGameDay(state.seed, state.day, cfg);
  const rep = repAt(state, id, cfg);
  const w = conditionEffect(state.forecast.condition, cfg, loc.weatherAmplify ?? 1);
  let traffic = gameDay && loc.gameDayTraffic !== undefined ? loc.gameDayTraffic : info.weekend ? loc.trafficWeekend : loc.trafficWeekday;
  if (loc.offSeasons?.includes(info.season)) traffic *= loc.offSeasonTraffic ?? 1;
  traffic *= eventTrafficMultiplier(state.events, id, state.day, cfg) * marketingTraffic(state.campaigns, id, state.day, cfg);
  const shares = archetypeShares(loc, info.weekend, gameDay, cfg);
  const ad = adFactor(state.campaigns, id, state.day, cfg);
  const steal = competitorSteal(state.events, id, rep, state.day, cfg);
  const ap = appeal(stand, cfg);
  const step = 15;
  let stoppers = 0;
  let buyers = 0;
  const mix: Partial<Record<Archetype, number>> = {};
  for (let t = step / 2; t < dayMinutes(cfg); t += step) {
    const temp = tempAtMinute(state.forecast.temp, t, cfg);
    const tThirst = tempThirst(temp, cfg);
    for (const [a, share] of Object.entries(shares) as [Archetype, number][]) {
      const ac = cfg.customers.archetypes[a];
      const n = ((traffic * share * hourlyWeight(ac.hourly, cfg.calendar.openHour + t / 60, cfg)) / curveMean(ac.hourly)) * w.traffic * (step / 60);
      const pStop = stopProbability({ appeal: ap, rep, adFactor: ad, wThirst: w.thirst, tThirst, multiplier: stopMultiplier(stand, a, cfg) }, cfg);
      const st = n * pStop * (1 - steal);
      let pBuy = 0;
      for (const [z, wt] of QUAD) {
        const wtp = willingnessToPay(ac.wtpBase, tThirst, rep, Math.exp(z * cfg.customers.decision.wtpSigma), cfg);
        pBuy += wt * buyProbability(price, wtp, ac.priceSens, cfg);
      }
      stoppers += st;
      buyers += st * pBuy;
      mix[a] = (mix[a] ?? 0) + st * pBuy;
    }
  }
  // Throughput limit: serving pauses while each pitcher is prepared.
  const speed = laneSpeeds(stand, cfg).reduce((a, b) => a + b, 0);
  const cpp = cfg.recipe.cupsPerPitcher;
  const perMinute = cpp / ((cpp * serveMinutes(stand, cfg)) / speed + prepMinutes(stand, cfg));
  buyers = Math.min(buyers, perMinute * dayMinutes(cfg) * 0.85);
  const unitCost = cupCost(state, recipe, cfg);
  const profit = buyers * (price - unitCost) - loc.rent;
  return { stoppers, buyers, unitCost, profit, mix };
}

/** A recipe tuned to the expected crowd and the forecast temperature. */
export function chooseRecipe(state: GameState, stand: Stand, id: LocationId, cfg: GameConfig): Recipe {
  const est = estimate(state, stand, id, stand.price, stand.recipe, cfg);
  const total = Object.values(est.mix).reduce((a, b) => a + (b ?? 0), 0);
  let shift = 0;
  for (const [a, n] of Object.entries(est.mix) as [Archetype, number][]) shift += (cfg.customers.archetypes[a].sweetShift * n) / Math.max(1e-9, total);
  const r = cfg.recipe;
  const clampI = (x: number, rg: { min: number; max: number }) => Math.max(rg.min, Math.min(rg.max, Math.round(x)));
  return {
    lemons: clampI(r.idealLemons, r.lemons),
    sugar: clampI(r.idealSugarBase + shift, r.sugar),
    ice: clampI(idealIce(meanDayTemp(state.forecast.temp, cfg), cfg), r.ice),
  };
}

export function choosePrice(state: GameState, stand: Stand, id: LocationId, recipe: Recipe, cfg: GameConfig): number {
  const step = cfg.recipe.price.step;
  const profitAt = (price: number) => estimate(state, stand, id, price, recipe, cfg).profit;
  // Coarse search, then refine around the best coarse price.
  let best = cfg.recipe.defaults.price;
  let bestProfit = -Infinity;
  for (let p = 0.25; p <= 4.0 + 1e-9; p += 0.25) {
    const v = profitAt(p);
    if (v > bestProfit) [best, bestProfit] = [p, v];
  }
  const center = best;
  for (let p = center - 0.2; p <= center + 0.2 + 1e-9; p += step) {
    const price = Math.round(p / step) * step;
    if (price < cfg.recipe.price.min) continue;
    const v = profitAt(price);
    if (v > bestProfit) [best, bestProfit] = [price, v];
  }
  return Math.round(best * 100) / 100;
}

function act(state: GameState, a: Action, cfg: GameConfig): GameState {
  const r = dispatch(state, a, cfg);
  return r.ok ? r.state : state;
}

/** Buys `need` units of an item with the cheapest pack mix that doesn't overshoot by more than one small pack. */
function buyUnits(state: GameState, item: Item, need: number, budget: number, cfg: GameConfig, bulkOk: boolean): GameState {
  const packs = cfg.ingredients.items[item].packs;
  let s = state;
  let remaining = need;
  let spent = 0;
  while (remaining > 0) {
    let idx = 0;
    if (bulkOk) for (let i = packs.length - 1; i > 0; i--) if (packs[i]!.size <= remaining) { idx = i; break; }
    const cost = todayPackCost(s, item, idx, cfg);
    if (spent + cost > budget) break;
    const next = act(s, { type: 'buy', item, pack: idx }, cfg);
    if (next === s) break;
    s = next;
    spent += cost;
    remaining -= packs[idx]!.size;
  }
  return s;
}

/** One morning of decisions. Returns the state after purchases and the plan for runDay. */
export function botMorning(state: GameState, mem: BotMemory, opts: BotOptions, cfg: GameConfig): { state: GameState; plan: DayPlan } {
  let s = state;
  const fixedDaily = () => {
    let total = 0;
    for (const st of s.stands) {
      total += standWages(st, cfg);
      if (st.locationId) total += locCfg(cfg, st.locationId).rent;
    }
    return total;
  };

  if (opts.expand) s = expand(s, mem, opts, cfg, fixedDaily);

  // Recipe and price per operating stand.
  const plan: DayPlan = { stands: {} };
  const ests: { stand: Stand; recipe: Recipe; buyers: number }[] = [];
  for (const stand of s.stands) {
    if (!stand.locationId) continue;
    const recipe = chooseRecipe(s, stand, stand.locationId, cfg);
    const price = opts.fixedPrice ?? choosePrice(s, stand, stand.locationId, recipe, cfg);
    const e = estimate(s, stand, stand.locationId, price, recipe, cfg);
    plan.stands![stand.id] = { recipe, price };
    ests.push({ stand, recipe, buyers: e.buyers });
  }

  // Stock for the forecast, keeping enough cash for tonight's rent and wages.
  const safety = 1.2;
  let cups = 0;
  let lemons = 0;
  let sugar = 0;
  let ice = 0;
  for (const e of ests) {
    const n = Math.ceil(e.buyers * safety) + 2;
    const pitchers = Math.ceil(n / cfg.recipe.cupsPerPitcher);
    cups += n;
    lemons += pitchers * e.recipe.lemons;
    sugar += pitchers * e.recipe.sugar;
    ice += Math.ceil(n * e.recipe.ice * 1.3);
  }
  const hoard = opts.hoard ?? 1;
  const have = { lemons: lemonCount(s.inventory), sugar: s.inventory.sugar.qty, ice: 0, cups: s.inventory.cups.qty };
  const need = { lemons, sugar, ice, cups };
  const budget = Math.max(0, s.cash - fixedDaily() - 5);
  const order: Item[] = ['cups', 'lemons', 'sugar', 'ice'];
  for (const item of order) {
    const want = hoard > 1 ? need[item] * hoard : need[item] - have[item];
    if (want <= 0) continue;
    const spentSoFar = s.ledger.stock;
    // Non-perishables in bulk once the business is established.
    const bulkOk = item === 'cups' || item === 'sugar' ? s.cash > 300 : item === 'lemons' ? need.lemons >= 48 : true;
    const amount = item === 'cups' || item === 'sugar' ? (s.cash > 300 ? Math.max(want, need[item] * 3 - have[item]) : want) : want;
    s = buyUnits(s, item, amount, budget - spentSoFar, cfg, bulkOk);
  }
  return { state: s, plan };
}

function expand(s: GameState, mem: BotMemory, opts: BotOptions, cfg: GameConfig, fixedDaily: () => number): GameState {
  const reserve = () => 3 * fixedDaily() + 80;
  const affordable = (cost: number, share: number) => s.cash - cost > reserve() && cost <= s.cash * share;

  // Place stands at the most profitable unlocked locations.
  const ranked = cfg.locations.locations
    .filter((l) => s.locations[l.id].unlocked)
    .map((l) => {
      const st = s.stands[0]!;
      const recipe = chooseRecipe(s, st, l.id, cfg);
      const price = opts.fixedPrice ?? choosePrice(s, st, l.id, recipe, cfg);
      return { id: l.id, profit: estimate(s, st, l.id, price, recipe, cfg).profit };
    })
    .sort((a, b) => b.profit - a.profit);
  const targets = ranked
    .slice(0, s.stands.length)
    .filter((r, i) => i === 0 || r.profit > 0)
    .map((r) => r.id);
  const keep = new Set(s.stands.map((st) => st.locationId).filter((id): id is LocationId => id !== null && targets.includes(id)));
  const free = targets.filter((id) => !keep.has(id));
  for (const st of s.stands) {
    if (st.locationId && keep.has(st.locationId)) continue;
    const id = free.shift() ?? null;
    s = act(s, { type: 'assignStand', standId: st.id, locationId: id }, cfg);
  }

  // Licences: open another stand when a profitable free location exists.
  const lic = cfg.stands.licenseCosts[s.stands.length];
  const goodSpots = ranked.filter((r) => r.profit > (lic ?? 0) / 40).length;
  if (lic !== undefined && goodSpots > s.stands.length && affordable(lic, 0.7)) s = act(s, { type: 'buyLicense' }, cfg);

  const last = mem.lastReport;
  for (const st of s.stands) {
    if (!st.locationId) continue;
    const sr = last?.stands.find((x) => x.standId === st.id && x.locationId === st.locationId);
    const queueLoss = sr ? sr.lostQueue / Math.max(1, sr.stoppers) : 0;
    const stand = () => s.stands.find((x) => x.id === st.id)!;
    const tryUp = (u: StandUpgrade, share: number) => {
      const cost = upgradeCost(stand(), u, cfg);
      if (cost !== null && affordable(cost, share)) s = act(s, { type: 'buyUpgrade', standId: st.id, upgrade: u }, cfg);
    };
    // Throughput when the line is turning people away.
    if (queueLoss > 0.04) {
      tryUp('juicer', 0.5);
      tryUp('register', 0.5);
      if (s.cash > 2000) tryUp('umbrella', 0.2);
    }
    // Appeal pays everywhere.
    tryUp('body', 0.25);
    tryUp('neon', 0.15);
    const loc = locCfg(cfg, st.locationId);
    const speakerShare = cfg.upgrades.speaker.archetypes.reduce((a, k) => a + (loc.mix[k] ?? 0), 0);
    if (speakerShare >= 40) tryUp('speaker', 0.15);
    if (s.cash > 3000) tryUp('cooler', 0.05);
  }
  if (!s.globalUpgrades.radio && affordable(cfg.upgrades.radio.cost, 0.15)) s = act(s, { type: 'buyGlobalUpgrade', upgrade: 'radio' }, cfg);
  const spoiled = last ? last.costs.spoilage : 0;
  if (!s.globalUpgrades.fridge && spoiled > 5 && affordable(cfg.upgrades.fridge.cost, 0.2)) {
    s = act(s, { type: 'buyGlobalUpgrade', upgrade: 'fridge' }, cfg);
  }

  // Staff: hire a Server where the line turned people away; let staff go when it doesn't.
  if (last) {
    for (const sr of last.stands) {
      const stand = s.stands.find((x) => x.id === sr.standId);
      if (!stand) continue;
      const margin = sr.buyers > 0 ? sr.revenue / sr.buyers : 0;
      if (sr.lostQueue < 8) {
        for (const m of stand.staff) s = act(s, { type: 'fire', standId: stand.id, staffId: m.id }, cfg);
        continue;
      }
      const cand = s.candidates.find((c) => c.role === 'server');
      if (!cand || stand.staff.length >= cfg.staff.maxPerStand) continue;
      if (sr.lostQueue * margin * 0.6 > wage(cand, cfg) && affordable(wage(cand, cfg) * 5, 0.5)) {
        s = act(s, { type: 'hire', candidateId: cand.id, standId: stand.id }, cfg);
      }
    }
  }
  return s;
}
