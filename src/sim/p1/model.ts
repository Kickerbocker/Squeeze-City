// P1: the maths of one day at a market table or drink stand. Pure and deterministic.
// Customers are drawn from their own random stream, independent of the batch and price the
// player chooses, so "what if" replays of the same day are exact.
import { type Archetype } from '../../config';
import type { P1Config } from '../../config/p1';
import { dayRng, type Rng } from '../rng';

export type Business = 'market' | 'stand';
export type Reaction = 'deal' | 'fair' | 'pricey' | 'walk' | 'soldOut';

/** Random streams for P1, numbered apart from v1's so they never collide. */
export const P1_STREAM = { weather: 101, forecast: 102, gigs: 103, customers: 104, goal: 105, lesson: 106 } as const;

const ARCHETYPES: Archetype[] = ['kid', 'office', 'tourist', 'jogger', 'senior', 'student'];

export const weekday = (day: number) => (day - 1) % 7; // day 1 is a Monday
export const isWeekend = (day: number, cfg: P1Config) => cfg.weekendDays.includes(weekday(day));

function pickShare<T extends { share: number }>(items: readonly T[], u: number): number {
  for (let i = 0; i < items.length; i++) {
    u -= items[i]!.share;
    if (u <= 0) return i;
  }
  return items.length - 1;
}

/** Today's real weather (index into cfg.weather). */
export function actualWeather(seed: number, day: number, cfg: P1Config): number {
  return pickShare(cfg.weather, dayRng(seed, day, P1_STREAM.weather).next());
}

export interface P1Forecast {
  weather: number;
  confidence: number;
  label: string;
}

/** The morning forecast: right with the confidence level's probability, otherwise another draw. */
export function forecastFor(seed: number, day: number, cfg: P1Config): P1Forecast {
  const r = dayRng(seed, day, P1_STREAM.forecast);
  const confidence = pickShare(cfg.forecast, r.next());
  const f = cfg.forecast[confidence]!;
  const actual = actualWeather(seed, day, cfg);
  const weather = r.next() < f.right ? actual : pickShare(cfg.weather, r.next());
  return { weather, confidence, label: f.label };
}

const erf = (x: number) => {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  return s * (1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a));
};
export const normCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));
function erfInv(x: number): number {
  const a = 0.147;
  const l = Math.log(1 - x * x);
  const t = 2 / (Math.PI * a) + l / 2;
  return Math.sign(x) * Math.sqrt(Math.sqrt(t * t - l / a) - t);
}
export const normInv = (p: number) => Math.SQRT2 * erfInv(2 * Math.min(0.999, Math.max(0.001, p)) - 1);

/** Share of interested people who will pay `price` when the street price is `street`. */
export function buyShare(price: number, street: number, cfg: P1Config): number {
  const s = cfg.stand.wtpSpread;
  return 1 - normCdf((Math.log(price / street) + (s * s) / 2) / s);
}

/** The price that earns most per interested person for a street price (what a careful player learns). */
export function bestPriceFor(street: number, cfg: P1Config): number {
  const S = cfg.stand;
  let best = S.startPrice;
  let bestV = -Infinity;
  for (let p = S.priceMin; p <= S.priceMax + 1e-9; p += S.priceStep) {
    const price = Math.round(p * 100) / 100;
    const v = (price - S.unitCost) * buyShare(price, street, cfg);
    if (v > bestV) [best, bestV] = [price, v];
  }
  return best;
}

/** Expected interested people for a weather on a day, before day-to-day noise. */
export function interestedMean(business: Business, weatherIdx: number, day: number, cfg: P1Config): number {
  const w = cfg.weather[weatherIdx]!;
  if (business === 'market') return (isWeekend(day, cfg) ? cfg.market.crowdWeekend : cfg.market.crowdWeekday) * w.market;
  return cfg.stand.baseInterested * w.demand * (isWeekend(day, cfg) ? cfg.stand.weekendFactor : 1);
}

/** How unsure the morning should be about demand: day-to-day noise plus the forecast's doubt. */
export function forecastSigma(confidence: number, cfg: P1Config): number {
  const u = cfg.forecast[confidence]!.uncertainty;
  return Math.sqrt(cfg.demandNoise ** 2 + u ** 2);
}

/**
 * The batch a careful planner makes: cover demand up to the point where one more unit is as
 * likely to be wasted as sold, weighing a lost sale against half-price leftovers (newsvendor).
 */
export function carefulBatch(mean: number, sigma: number, price: number, unitCost: number, salvage: number): number {
  const fractile = (price - unitCost) / Math.max(0.01, price - unitCost * salvage);
  return Math.max(0, Math.round(mean * Math.exp(sigma * normInv(fractile))));
}

export interface Customer {
  c: number;
  t: number;
  a: Archetype;
  /** What they would pay (Infinity at the market table, which has a fixed fair price). */
  wtp: number;
  interested: boolean;
}

/** Everyone who comes by today. Depends only on the seed, day, business and real weather. */
export function drawCustomers(seed: number, day: number, business: Business, cfg: P1Config): Customer[] {
  const r: Rng = dayRng(seed, day, P1_STREAM.customers, business === 'market' ? 0 : 1);
  const wIdx = actualWeather(seed, day, cfg);
  const w = cfg.weather[wIdx]!;
  const n = Math.max(0, Math.round(interestedMean(business, wIdx, day, cfg) * r.logNormal(cfg.demandNoise) * Math.exp(-(cfg.demandNoise ** 2) / 2)));
  const curve = business === 'market' ? cfg.marketHourly : cfg.hourly;
  const total = curve.reduce((a, b) => a + b, 0);
  const sampleT = () => {
    let u = r.next() * total;
    let h = 0;
    while (h < curve.length - 1 && u > curve[h]!) u -= curve[h++]!;
    return h * 60 + r.next() * 60;
  };
  const s = cfg.stand.wtpSpread;
  const out: Customer[] = [];
  let c = 0;
  for (let i = 0; i < n; i++) {
    const t = sampleT();
    const a = ARCHETYPES[Math.floor(r.next() * ARCHETYPES.length)]!;
    const wtp = business === 'market' ? Infinity : w.street * Math.exp(s * r.normal() - (s * s) / 2);
    out.push({ c: c++, t, a, wtp, interested: true });
  }
  const passers = Math.round(n * (business === 'market' ? cfg.market.passRatio : cfg.stand.passRatio));
  for (let i = 0; i < passers; i++) {
    out.push({ c: c++, t: r.next() * cfg.dayMinutes, a: ARCHETYPES[Math.floor(r.next() * ARCHETYPES.length)]!, wtp: 0, interested: false });
  }
  return out.sort((x, y) => x.t - y.t || x.c - y.c);
}

export interface Outcome {
  customer: Customer;
  reaction: Reaction;
}

export interface DayResult {
  made: number;
  sold: number;
  leftover: number;
  revenue: number;
  cost: number;
  salvage: number;
  profit: number;
  walkedSoldOut: number;
  walkedPrice: number;
  soldOutAt: number | null;
  reactions: Record<Reaction, number>;
  /** Average of what "What a deal!" customers would have paid. */
  dealWtp: number | null;
  outcomes: Outcome[];
}

/** Plays a day for one batch and price. Exact and repeatable for the same customers. */
export function simulate(customers: readonly Customer[], made: number, price: number, unitCost: number, salvageShare: number, cfg: P1Config): DayResult {
  let stock = made;
  let sold = 0;
  let soldOutAt: number | null = null;
  let dealSum = 0;
  const reactions: Record<Reaction, number> = { deal: 0, fair: 0, pricey: 0, walk: 0, soldOut: 0 };
  const outcomes: Outcome[] = [];
  for (const cu of customers) {
    if (!cu.interested) continue;
    let reaction: Reaction;
    if (cu.wtp < price) reaction = 'walk';
    else if (stock <= 0) {
      reaction = 'soldOut';
      if (soldOutAt === null) soldOutAt = cu.t;
    } else {
      stock--;
      sold++;
      reaction = cu.wtp >= price * cfg.reactions.deal ? 'deal' : cu.wtp >= price * cfg.reactions.fair ? 'fair' : 'pricey';
      if (reaction === 'deal' && Number.isFinite(cu.wtp)) dealSum += cu.wtp;
      if (stock === 0 && soldOutAt === null) soldOutAt = cu.t;
    }
    reactions[reaction]++;
    outcomes.push({ customer: cu, reaction });
  }
  const leftover = made - sold;
  const revenue = sold * price;
  const cost = made * unitCost;
  const salvage = leftover * unitCost * salvageShare;
  const round = (x: number) => Math.round(x * 100) / 100;
  return {
    made,
    sold,
    leftover,
    revenue: round(revenue),
    cost: round(cost),
    salvage: round(salvage),
    profit: round(revenue - cost + salvage),
    walkedSoldOut: reactions.soldOut,
    walkedPrice: reactions.walk,
    soldOutAt,
    reactions,
    dealWtp: reactions.deal && dealSum > 0 ? dealSum / reactions.deal : null,
    outcomes,
  };
}
