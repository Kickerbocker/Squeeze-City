// M10: what a purchase should do before buying (projectPurchase) and what it did today
// (attributeDay). Both work by running the day twice, with and without the item. GDD §21,
// docs/specs/M10-show-what-it-did.md.
import { CONFIG, type GameConfig, ITEMS, type LocationId } from '../config';
import { type Action, applyAction } from './actions';
import { runDay } from './day';
import { todayUnitPrice } from './game';
import { addStock, emptyInventory } from './inventory';
import { campaignStrength } from './marketing';
import { hashSeed, STREAM } from './rng';
import type { DayPlan, DayReport, DayResult, GameState, StandReport } from './types';
import { cents } from './util';

/** Things the player can buy that the projection understands. */
export type PurchaseAction = Extract<Action, { type: 'buyUpgrade' | 'buyGlobalUpgrade' | 'hire' | 'startCampaign' }>;

/** Which number an item acts on, for "5 more people stopped" / "14 fewer people left the line". */
export type Measure = 'stopped' | 'leftLine' | 'served' | 'none';

export type Projection =
  | {
      kind: 'gain';
      /** Median extra profit per day; for staff after wages, for campaigns after their daily cost. */
      median: number;
      low: number;
      high: number;
      samples: number[];
      /** Wage or campaign cost per day already taken off the figures above. */
      dailyCost: number;
    }
  /** A replay can't measure it (the Weather radio changes what the player plans). */
  | { kind: 'unmeasurable' }
  /** It can't apply here, e.g. the stand isn't placed or is fully staffed. */
  | { kind: 'blocked'; reason: string };

export interface AttributionLine {
  kind: 'upgrade' | 'staff' | 'campaign' | 'forecast';
  /** Upgrade id, staff role, campaign id, or 'radio'. */
  item: string;
  /** null for whole-business items and campaigns that reach every stand. */
  standId: number | null;
  /** Staff member's name or campaign location, for the line's label. */
  name?: string;
  /** Effect on today's profit, after wages or the campaign's daily cost. */
  profit: number;
  /** Change in the count the item acts on (positive = better). */
  count: number;
  measure: Measure;
  /** Radio and TV: averaged over sample crowds, so shown with "about". */
  approx: boolean;
  /** Index into state.purchases for upgrades on the ledger. */
  purchase?: number;
  /** Weather radio: forecast results over the recent days. */
  forecast?: { right: number; of: number };
}

export interface DayResultWithAttribution extends DayResult {
  /** "What your purchases did today", one line per covered item, unsorted. */
  attribution: AttributionLine[];
}

export function measureOf(item: string): Measure {
  switch (item) {
    case 'body':
    case 'neon':
    case 'speaker':
    case 'promoter':
    case 'flyers':
    case 'newspaper':
    case 'radio':
    case 'tv':
      return 'stopped';
    case 'juicer':
    case 'register':
    case 'server':
    case 'mixer':
    case 'umbrella':
      return 'leftLine';
    case 'cooler':
      return 'served';
    default:
      return 'none';
  }
}

function countFor(measure: Measure, withItem: StandReport[], without: StandReport[]): number {
  const sum = (rs: StandReport[], f: (r: StandReport) => number) => rs.reduce((a, r) => a + f(r), 0);
  switch (measure) {
    case 'stopped':
      return sum(withItem, (r) => r.stoppers) - sum(without, (r) => r.stoppers);
    case 'leftLine':
      return sum(without, (r) => r.lostQueue) - sum(withItem, (r) => r.lostQueue);
    case 'served':
      return sum(withItem, (r) => r.buyers) - sum(without, (r) => r.buyers);
    case 'none':
      return 0;
  }
}

const standsOf = (r: DayReport, standId: number | null, loc?: LocationId) =>
  r.stands.filter((x) => (standId !== null ? x.standId === standId : loc ? x.locationId === loc : true));

/** The projected morning: forecast weather, plenty of stock at today's prices, nothing spent yet. */
function projectionMorning(state: GameState, cfg: GameConfig): GameState {
  const s = structuredClone(state);
  s.weather = { condition: state.forecast.condition, dayTemp: state.forecast.temp };
  s.inventory = emptyInventory();
  const n = cfg.feedback.projectionStock;
  for (const item of ITEMS) addStock(s.inventory, item, n, n * todayUnitPrice(state, item, cfg), s.day);
  s.cash = Number.MAX_SAFE_INTEGER / 4;
  s.ledger = { stock: 0, ads: 0, capital: 0 };
  return s;
}

/** Profit as the projection counts it: stock is unlimited, so leftover stock isn't a cost. */
const projectedProfit = (r: DayReport) => r.profit + r.costs.spoilage + r.costs.ads;

function campaignDailyCost(id: string, cfg: GameConfig): number {
  const c = cfg.marketing.campaigns[id as keyof GameConfig['marketing']['campaigns']];
  return c ? c.cost / c.days : 0;
}

const sortedPick = (xs: number[], pos1: number) => [...xs].sort((a, b) => a - b)[pos1 - 1]!;

/**
 * Projects what buying an item would add to profit per day at this stand, by simulating the
 * day the player is planning with and without it over several sample crowds. The weather is
 * the forecast and the crowds come from the projection stream, so it never reveals the real
 * day. Pure and repeatable.
 */
export function projectPurchase(state: GameState, action: PurchaseAction, cfg: GameConfig = CONFIG): Projection {
  if (action.type === 'buyGlobalUpgrade' && action.upgrade === 'radio') return { kind: 'unmeasurable' };
  const standId = action.type === 'buyUpgrade' || action.type === 'hire' ? action.standId : null;
  if (standId !== null) {
    const st = state.stands.find((x) => x.id === standId);
    if (!st?.locationId) return { kind: 'blocked', reason: 'This stand is not placed at a location.' };
  } else if (!state.stands.some((x) => x.locationId)) {
    return { kind: 'blocked', reason: 'No stand is open.' };
  }

  const base = projectionMorning(state, cfg);
  const withItem = structuredClone(base);
  try {
    applyAction(withItem, action, cfg);
  } catch (e) {
    return { kind: 'blocked', reason: (e as Error).message };
  }
  let dailyCost = 0;
  if (action.type === 'startCampaign') dailyCost = campaignDailyCost(action.campaign, cfg);

  const samples: number[] = [];
  for (let i = 0; i < cfg.feedback.projectionSamples; i++) {
    const customerSeed = hashSeed(state.seed, state.day, STREAM.projection, i);
    const a = runDay(withItem, {}, cfg, { customerSeed }).report;
    const b = runDay(base, {}, cfg, { customerSeed }).report;
    samples.push(cents(projectedProfit(a) - projectedProfit(b) - dailyCost));
  }
  const n = samples.length;
  return {
    kind: 'gain',
    median: sortedPick(samples, Math.ceil(n / 2)),
    low: sortedPick(samples, Math.min(cfg.feedback.rangeLow, n)),
    high: sortedPick(samples, Math.min(cfg.feedback.rangeHigh, n)),
    samples,
    dailyCost,
  };
}

/** The upgrades, staff and campaigns that "What your purchases did today" covers. */
function covered(morning: GameState, cfg: GameConfig) {
  const upgrades = morning.purchases
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => !p.replaced && p.earnedBack < p.cost)
    .filter(({ p }) => {
      if (p.standId === null) return morning.globalUpgrades[p.item as 'fridge' | 'radio'];
      const u = morning.stands.find((x) => x.id === p.standId)?.upgrades;
      if (!u) return false;
      const v = u[p.item as keyof typeof u];
      return typeof v === 'number' ? v === p.tier : v;
    });
  const staff = morning.stands.flatMap((st) => st.staff.map((m) => ({ st, m })));
  const campaigns = morning.campaigns.map((c, i) => ({ c, i })).filter(({ c }) => campaignStrength(c, morning.day, cfg) > 0);
  return { upgrades, staff, campaigns };
}

/**
 * For each covered item, replays today from the same morning and plan without that one item
 * and reports the difference. Exact, because every passer-by draws the same random numbers
 * whether or not they stop; Radio and TV add foot traffic, so they are averaged over sample
 * crowds and marked approximate.
 */
export function attributeDay(morning: GameState, plan: DayPlan = {}, cfg: GameConfig = CONFIG, actual?: DayReport): AttributionLine[] {
  const real = actual ?? runDay(morning, plan, cfg).report;
  const lines: AttributionLine[] = [];
  const { upgrades, staff, campaigns } = covered(morning, cfg);

  const replayWithout = (remove: (s: GameState) => void) => {
    const s = structuredClone(morning);
    remove(s);
    return runDay(s, plan, cfg).report;
  };

  for (const { p, i } of upgrades) {
    if (p.item === 'radio') {
      const hist = morning.forecastHistory.slice(-cfg.feedback.forecastHistoryDays);
      const today = real.forecast.condition === real.weather.condition;
      const recent = [...hist.slice(-(cfg.feedback.forecastHistoryDays - 1)).map((h) => h.right), today];
      lines.push({ kind: 'forecast', item: 'radio', standId: null, profit: 0, count: 0, measure: 'none', approx: false, purchase: i, forecast: { right: recent.filter(Boolean).length, of: recent.length } });
      continue;
    }
    const without = replayWithout((s) => {
      if (p.standId === null) {
        s.globalUpgrades[p.item as 'fridge'] = false;
        return;
      }
      const u = s.stands.find((x) => x.id === p.standId)!.upgrades;
      if (p.item === 'body' || p.item === 'juicer' || p.item === 'register') u[p.item] -= 1;
      else u[p.item as 'cooler' | 'umbrella' | 'neon' | 'speaker'] = false;
    });
    const measure = measureOf(p.item);
    lines.push({
      kind: 'upgrade',
      item: p.item,
      standId: p.standId,
      profit: cents(real.profit - without.profit),
      count: countFor(measure, standsOf(real, p.standId), standsOf(without, p.standId)),
      measure,
      approx: false,
      purchase: i,
    });
  }

  for (const { st, m } of staff) {
    const without = replayWithout((s) => {
      const x = s.stands.find((y) => y.id === st.id)!;
      x.staff = x.staff.filter((y) => y.id !== m.id);
    });
    const measure = measureOf(m.role);
    lines.push({
      kind: 'staff',
      item: m.role,
      standId: st.id,
      name: m.name,
      profit: cents(real.profit - without.profit),
      count: countFor(measure, standsOf(real, st.id), standsOf(without, st.id)),
      measure,
      approx: false,
    });
  }

  for (const { c, i } of campaigns) {
    const cc = cfg.marketing.campaigns[c.id];
    const measure = measureOf(c.id);
    const remove = (s: GameState) => void s.campaigns.splice(i, 1);
    const scopeStand = c.locationId ? (morning.stands.find((x) => x.locationId === c.locationId)?.id ?? null) : null;
    const pick = (r: DayReport) => standsOf(r, null, c.locationId);
    let profit: number;
    let count: number;
    const approx = cc.trafficBonus > 0;
    if (!approx) {
      const without = replayWithout(remove);
      profit = real.profit - without.profit;
      count = countFor(measure, pick(real), pick(without));
    } else {
      // Extra traffic changes who arrives, so compare like with like over sample crowds.
      const removed = structuredClone(morning);
      remove(removed);
      let p = 0;
      let n = 0;
      const k = cfg.feedback.trafficCampaignSamples;
      for (let j = 0; j < k; j++) {
        const customerSeed = hashSeed(morning.seed, morning.day, STREAM.projection, 1000 + j);
        const a = runDay(morning, plan, cfg, { customerSeed }).report;
        const b = runDay(removed, plan, cfg, { customerSeed }).report;
        p += a.profit - b.profit;
        n += countFor(measure, pick(a), pick(b));
      }
      profit = p / k;
      count = Math.round(n / k);
    }
    lines.push({
      kind: 'campaign',
      item: c.id,
      standId: scopeStand,
      ...(c.locationId ? { name: c.locationId } : {}),
      profit: cents(profit - cc.cost / cc.days),
      count,
      measure,
      approx,
    });
  }
  return lines;
}

/**
 * The entry point the app uses: runs the day, measures each purchase, and updates the ledger,
 * the forecast history and yesterday's numbers. Bots call runDay directly, so balance runs are
 * no slower. The day itself plays out exactly as runDay would play it.
 */
export function runDayWithAttribution(state: GameState, plan: DayPlan = {}, cfg: GameConfig = CONFIG): DayResultWithAttribution {
  const result = runDay(state, plan, cfg);
  const r = result.report;
  const attribution = attributeDay(state, plan, cfg, r);
  const s = result.state;
  for (const line of attribution) {
    if (line.purchase === undefined || line.kind !== 'upgrade') continue;
    const p = s.purchases[line.purchase]!;
    p.earnedBack = cents(p.earnedBack + line.profit);
    if (p.paidOffDay === undefined && p.earnedBack >= p.cost) p.paidOffDay = r.day;
  }
  s.forecastHistory = [...s.forecastHistory, { day: r.day, right: r.forecast.condition === r.weather.condition }].slice(-cfg.feedback.forecastHistoryDays);
  s.yesterday = {
    day: r.day,
    stands: r.stands.map((x) => ({ standId: x.standId, locationId: x.locationId, passersby: x.passersby, stoppers: x.stoppers, lostQueue: x.lostQueue })),
  };
  return { ...result, attribution };
}
