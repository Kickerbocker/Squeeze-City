// P1 prototype: gigs → market table → drink stand (docs/specs/P1-prototype.md, GDD-v2).
// Pure: every function takes a state and returns a new one; nothing reads the clock or Math.random.
import { type GigId, P1, type P1Config, SKILL_IDS, type SkillId } from '../../config/p1';
import { dayRng } from '../rng';
import type { SimEvent, StockSnapshot } from '../types';
import {
  actualWeather,
  bestPriceFor,
  type Business,
  buyShare,
  carefulBatch,
  type Customer,
  drawCustomers,
  type DayResult,
  forecastFor,
  forecastSigma,
  interestedMean,
  isWeekend,
  P1_STREAM,
  type Reaction,
  simulate,
  weekday,
} from './model';

export type Stage = 'gigs' | Business;
export type QtyMode = 'yours' | 'helped' | 'handed';

export type WeekGoal =
  | { kind: 'units'; target: number }
  | { kind: 'earn'; target: number }
  | { kind: 'bestSaturday'; target: number };

export interface WeekSummary {
  week: number;
  days: number;
  earned: number;
  units: number;
  bestDay: { day: number; profit: number } | null;
  goal: WeekGoal;
  goalDone: boolean;
}

export interface P1State {
  version: 1;
  seed: number;
  day: number;
  cash: number;
  /** Money earned over the whole game; unlocks read this, never cash in hand. */
  earned: number;
  xp: number;
  level: number;
  points: number;
  skills: SkillId[];
  owned: { market: boolean; stand: boolean };
  qtyMode: QtyMode;
  /** Business days with the batch set by hand (Prep sense needs some). */
  handDays: number;
  price: number;
  lastBatch: { market: number; stand: number };
  week: { goal: WeekGoal; progress: number; done: boolean; earned: number; units: number; bestDay: { day: number; profit: number } | null };
  lastWeek: { earned: number; units: number } | null;
  bestSaturday: number;
  cartReady: boolean;
  stats: { gigDays: number; gigDaysAfterStand: number; businessDays: number; unitsSold: number };
}

export interface GigOffer {
  id: GigId;
  name: string;
  teaches: string;
  pay: number;
}

export interface Board {
  day: number;
  weekday: number;
  weekend: boolean;
  forecast: { weather: number; name: string; condition: string; tempLo: number; tempHi: number; label: string };
  gigs: GigOffer[];
  /** The business the player runs today if they don't take a gig. */
  business: Business | null;
  /** People likely to want one at the street price: an 80% range. */
  likely: { lo: number; hi: number; mid: number; sigma: number } | null;
  /** Street price range for today's forecast weather (drink stand only). */
  street: { lo: number; hi: number; mid: number } | null;
  /** Prep sense: a suggested batch for the current price. */
  suggestion: number | null;
  /** Standing order: the batch it will make (the middle of the forecast). */
  handedBatch: number | null;
  price: number;
  maxAffordable: number;
  goal: P1State['week'];
  canBuy: Business | null;
}

export type P1Plan = { kind: 'gig'; gig: GigId } | { kind: 'open'; batch: number; price?: number };

export type Missed =
  | { kind: 'soldOut'; at: number; walked: number; extra: number; gain: number }
  | { kind: 'price'; price: number; better: number; deals: number; buyers: number; walked: number; gain: number }
  | { kind: 'leftover'; count: number; lost: number };

export type Suggestion = { kind: 'price'; price: number } | { kind: 'batch'; batch: number } | { kind: 'keep' };

export interface Moment {
  t: number;
  kind: 'soldOut' | 'dealRun' | 'walkRun' | 'busiest';
  label: string;
}

export interface GigLesson {
  gig: GigId;
  /** delivery: which neighborhood pair; helper: a stall owner's batch and result; yardsale: reactions at $1. */
  neighborhoods?: number;
  helper?: { lo: number; hi: number; made: number; sold: number; walked: number };
  yardsale?: { price: number; deal: number; fair: number; pricey: number; walk: number };
}

export interface P1Report {
  day: number;
  weekday: number;
  kind: 'gig' | 'business';
  weather: { index: number; name: string; condition: string; temp: number };
  forecastRight: boolean;
  gig?: { offer: GigOffer; lesson: GigLesson };
  business?: Business;
  qtyMode?: QtyMode;
  price?: number;
  result?: Omit<DayResult, 'outcomes'>;
  missed: Missed[];
  suggestion: Suggestion;
  moments: Moment[];
  income: number;
  levelUps: number;
  unlocked: ('market' | 'stand' | 'cart')[];
  goalDone: boolean;
  weekSummary: WeekSummary | null;
}

export interface P1DayResult {
  state: P1State;
  report: P1Report;
  events: SimEvent[];
}

const round2 = (x: number) => Math.round(x * 100) / 100;

export function xpForLevel(level: number, cfg: P1Config = P1): number {
  return cfg.xp.base * Math.pow(cfg.xp.growth, level);
}

export function stageOf(s: P1State): Stage {
  return s.owned.stand ? 'stand' : s.owned.market ? 'market' : 'gigs';
}

function goalFor(s: Pick<P1State, 'day' | 'lastWeek' | 'bestSaturday' | 'owned' | 'seed'>, cfg: P1Config): WeekGoal {
  const stage = s.owned.stand ? 'stand' : s.owned.market ? 'market' : 'gigs';
  const g = cfg.weekGoal;
  const earn = Math.round(((s.lastWeek?.earned ?? g.defaultEarn / g.growth) * g.growth) / 10) * 10 || g.defaultEarn;
  if (stage === 'gigs') return { kind: 'earn', target: Math.max(g.defaultEarn, earn) };
  const week = Math.floor((s.day - 1) / 7);
  const options: WeekGoal[] = [
    { kind: 'units', target: Math.max(g.defaultUnits[stage], Math.round(((s.lastWeek?.units ?? 0) * g.growth) / 10) * 10) },
    { kind: 'earn', target: Math.max(g.defaultEarn, earn) },
  ];
  if (s.bestSaturday > 0) options.push({ kind: 'bestSaturday', target: Math.floor(s.bestSaturday) + 1 });
  return options[Math.floor(dayRng(s.seed, week, P1_STREAM.goal).next() * options.length)]!;
}

export function newP1Game(seed: number, cfg: P1Config = P1): P1State {
  const base = { day: 1, lastWeek: null, bestSaturday: 0, owned: { market: false, stand: false }, seed: seed >>> 0 };
  return {
    version: 1,
    seed: seed >>> 0,
    day: 1,
    cash: cfg.startCash,
    earned: 0,
    xp: 0,
    level: 0,
    points: 0,
    skills: [],
    owned: { market: false, stand: false },
    qtyMode: 'yours',
    handDays: 0,
    price: cfg.stand.startPrice,
    lastBatch: { market: 0, stand: 0 },
    week: { goal: goalFor(base, cfg), progress: 0, done: false, earned: 0, units: 0, bestDay: null },
    lastWeek: null,
    bestSaturday: 0,
    cartReady: false,
    stats: { gigDays: 0, gigDaysAfterStand: 0, businessDays: 0, unitsSold: 0 },
  };
}

export function gigOffers(s: P1State, cfg: P1Config = P1): GigOffer[] {
  const r = dayRng(s.seed, s.day, P1_STREAM.gigs);
  const [lo, hi] = cfg.gigs.pay as [number, number];
  return cfg.gigs.list.map((g) => ({ ...g, pay: Math.round(lo + r.next() * (hi - lo)) }));
}

function unitCost(b: Business, cfg: P1Config) {
  return b === 'market' ? cfg.market.unitCost : cfg.stand.unitCost;
}

export function salvageShare(s: P1State, b: Business, cfg: P1Config = P1): number {
  if (s.skills.includes('thrifty')) return cfg.skills.thrifty.salvage;
  return b === 'market' ? cfg.market.salvage : cfg.stand.salvage;
}

const priceOf = (s: P1State, b: Business, cfg: P1Config) => (b === 'market' ? cfg.market.price : s.price);

/** What the morning board shows. Uses only the forecast, never the real weather. */
export function morningBoard(s: P1State, cfg: P1Config = P1): Board {
  const f = forecastFor(s.seed, s.day, cfg);
  const w = cfg.weather[f.weather]!;
  const business: Business | null = s.owned.stand ? 'stand' : s.owned.market ? 'market' : null;
  let likely: Board['likely'] = null;
  let street: Board['street'] = null;
  let suggestion: number | null = null;
  let handedBatch: number | null = null;
  const price = business ? priceOf(s, business, cfg) : 0;
  if (business) {
    const mean = interestedMean(business, f.weather, s.day, cfg);
    const sigma = forecastSigma(f.confidence, cfg);
    const z = cfg.rangeZ;
    likely = { lo: Math.round(mean * Math.exp(-z * sigma)), hi: Math.round(mean * Math.exp(z * sigma)), mid: Math.round(mean), sigma };
    if (business === 'stand') street = { lo: round2(w.street * 0.85), hi: round2(w.street * 1.15), mid: w.street };
    const share = business === 'stand' ? buyShare(price, w.street, cfg) : 1;
    if (s.skills.includes('prepSense')) suggestion = carefulBatch(mean * share, sigma, price, unitCost(business, cfg), salvageShare(s, business, cfg));
    if (s.skills.includes('standingOrder')) handedBatch = Math.round(mean * share);
  }
  const canBuy: Business | null = !s.owned.market && s.earned >= cfg.market.gate ? 'market' : s.owned.market && !s.owned.stand && s.earned >= cfg.stand.gate ? 'stand' : null;
  return {
    day: s.day,
    weekday: weekday(s.day),
    weekend: isWeekend(s.day, cfg),
    forecast: { weather: f.weather, name: w.name, condition: w.condition, tempLo: w.temp[0]!, tempHi: w.temp[1]!, label: f.label },
    gigs: gigOffers(s, cfg),
    business,
    likely,
    street,
    suggestion,
    handedBatch,
    price,
    maxAffordable: business ? Math.min(business === 'market' ? cfg.market.maxBatch : cfg.stand.maxBatch, Math.floor(s.cash / unitCost(business, cfg) + 1e-9)) : 0,
    goal: s.week,
    canBuy,
  };
}

// ---------------------------------------------------------------- actions

export type P1ActionResult = { ok: true; state: P1State } | { ok: false; error: string; state: P1State };

export function buyBusiness(s: P1State, b: Business, cfg: P1Config = P1): P1ActionResult {
  const c = b === 'market' ? cfg.market : cfg.stand;
  if (s.owned[b]) return { ok: false, error: 'Already yours', state: s };
  if (b === 'stand' && !s.owned.market) return { ok: false, error: 'Start with the market table', state: s };
  if (s.earned < c.gate) return { ok: false, error: `Unlocks when you have earned $${c.gate}`, state: s };
  if (s.cash < c.cost) return { ok: false, error: `Costs $${c.cost}`, state: s };
  return { ok: true, state: { ...s, cash: round2(s.cash - c.cost), owned: { ...s.owned, [b]: true } } };
}

export function canLearn(s: P1State, id: SkillId, cfg: P1Config = P1): string | null {
  const sk = cfg.skills[id];
  if (s.skills.includes(id)) return 'Already learned';
  if (s.points < sk.cost) return `Needs ${sk.cost} point${sk.cost === 1 ? '' : 's'}`;
  if (id === 'prepSense' && s.handDays < cfg.skills.prepSense.handDays) return `Set the batch by hand on ${cfg.skills.prepSense.handDays} business days first (${s.handDays} so far)`;
  if (id === 'standingOrder' && !s.skills.includes('prepSense')) return 'Needs Prep sense';
  return null;
}

export function learnSkill(s: P1State, id: SkillId, cfg: P1Config = P1): P1ActionResult {
  const why = canLearn(s, id, cfg);
  if (why) return { ok: false, error: why, state: s };
  return { ok: true, state: { ...s, points: s.points - cfg.skills[id].cost, skills: [...s.skills, id] } };
}

export function setQtyMode(s: P1State, mode: QtyMode): P1ActionResult {
  if (mode === 'helped' && !s.skills.includes('prepSense')) return { ok: false, error: 'Needs Prep sense', state: s };
  if (mode === 'handed' && !s.skills.includes('standingOrder')) return { ok: false, error: 'Needs Standing order', state: s };
  return { ok: true, state: { ...s, qtyMode: mode } };
}

export function setPrice(s: P1State, price: number, cfg: P1Config = P1): P1ActionResult {
  const S = cfg.stand;
  const p = Math.round(price / S.priceStep) * S.priceStep;
  if (p < S.priceMin - 1e-9 || p > S.priceMax + 1e-9) return { ok: false, error: 'Price out of range', state: s };
  return { ok: true, state: { ...s, price: round2(p) } };
}

// ---------------------------------------------------------------- the day

function gigLesson(s: P1State, gig: GigId, cfg: P1Config): GigLesson {
  const r = dayRng(s.seed, s.day, P1_STREAM.lesson);
  if (gig === 'delivery') return { gig, neighborhoods: Math.floor(r.next() * 4) };
  if (gig === 'helper') {
    // A stall owner bakes for today's market; show her call and how it went.
    const sub: P1State = { ...s, owned: { market: true, stand: false }, skills: [] };
    const b = morningBoard(sub, cfg);
    const made = Math.round(b.likely!.mid * (0.8 + r.next() * 0.5));
    const res = simulate(drawCustomers(s.seed, s.day, 'market', cfg), made, cfg.market.price, cfg.market.unitCost, cfg.market.salvage, cfg);
    return { gig, helper: { lo: b.likely!.lo, hi: b.likely!.hi, made, sold: res.sold, walked: res.walkedSoldOut } };
  }
  const street = cfg.weather[actualWeather(s.seed, s.day, cfg)]!.street;
  const price = 1;
  const counts = { deal: 0, fair: 0, pricey: 0, walk: 0 };
  const sp = cfg.stand.wtpSpread;
  for (let i = 0; i < 12; i++) {
    const wtp = street * Math.exp(sp * r.normal() - (sp * sp) / 2);
    if (wtp < price) counts.walk++;
    else if (wtp >= price * cfg.reactions.deal) counts.deal++;
    else if (wtp >= price * cfg.reactions.fair) counts.fair++;
    else counts.pricey++;
  }
  return { gig, yardsale: { price, ...counts } };
}

function findMoments(res: DayResult, business: Business, cfg: P1Config): Moment[] {
  const found: Moment[] = [];
  if (res.soldOutAt !== null) found.push({ t: res.soldOutAt, kind: 'soldOut', label: 'Sold out' });
  const run = (want: Reaction, n: number): number | null => {
    let k = 0;
    for (const o of res.outcomes) {
      if (o.reaction === want) {
        k++;
        if (k === n) return o.customer.t;
      } else if (o.reaction !== 'soldOut') k = 0;
    }
    return null;
  };
  if (business === 'stand') {
    const d = run('deal', cfg.moments.dealRun);
    if (d !== null) found.push({ t: d, kind: 'dealRun', label: `${cfg.moments.dealRun} "What a deal!"s in a row` });
    const w = run('walk', cfg.moments.walkRun);
    if (w !== null) found.push({ t: w, kind: 'walkRun', label: `${cfg.moments.walkRun} people in a row walked off at the price` });
  }
  if (found.length < 3) {
    const perHour = new Array(Math.ceil(cfg.dayMinutes / 60)).fill(0) as number[];
    for (const o of res.outcomes) if (o.reaction === 'deal' || o.reaction === 'fair' || o.reaction === 'pricey') perHour[Math.min(perHour.length - 1, Math.floor(o.customer.t / 60))]!++;
    const h = perHour.indexOf(Math.max(...perHour));
    if (perHour[h]! > 0) found.push({ t: h * 60 + 20, kind: 'busiest', label: 'The busiest hour' });
  }
  return found.slice(0, 3).sort((a, b) => a.t - b.t);
}

function findMissed(customers: Customer[], res: DayResult, price: number, business: Business, s: P1State, cfg: P1Config): Missed[] {
  const uc = unitCost(business, cfg);
  const sal = salvageShare(s, business, cfg);
  const out: Missed[] = [];
  if (res.walkedSoldOut > 0) {
    const extra = res.walkedSoldOut;
    const alt = simulate(customers, res.made + extra, price, uc, sal, cfg);
    const gain = round2(alt.profit - res.profit);
    if (gain >= cfg.missed.minGain) out.push({ kind: 'soldOut', at: res.soldOutAt ?? 0, walked: extra, extra, gain });
  }
  if (business === 'stand') {
    const S = cfg.stand;
    let best = price;
    let bestProfit = res.profit;
    for (let p = S.priceMin; p <= S.priceMax + 1e-9; p += S.priceStep) {
      const pr = round2(p);
      const alt = simulate(customers, res.made, pr, uc, sal, cfg).profit;
      if (alt > bestProfit + 1e-9) [best, bestProfit] = [pr, alt];
    }
    const gain = round2(bestProfit - res.profit);
    if (gain >= cfg.missed.minGain) out.push({ kind: 'price', price, better: best, deals: res.reactions.deal, buyers: res.sold, walked: res.walkedPrice, gain });
  }
  if (res.leftover > 0) out.push({ kind: 'leftover', count: res.leftover, lost: round2(res.leftover * uc * (1 - sal)) });
  const size = (m: Missed) => (m.kind === 'leftover' ? m.lost : m.gain);
  return out.sort((a, b) => size(b) - size(a)).slice(0, cfg.missed.maxLines);
}

function suggestFrom(missed: Missed[], res: DayResult): Suggestion {
  const top = missed[0];
  if (!top) return { kind: 'keep' };
  if (top.kind === 'price') return { kind: 'price', price: top.better };
  if (top.kind === 'soldOut') return { kind: 'batch', batch: res.made + top.extra };
  return { kind: 'batch', batch: Math.max(0, res.made - Math.round(top.count * 0.8)) };
}

const BUY_REACTIONS = new Set<Reaction>(['deal', 'fair', 'pricey']);

/** The replay log for the street scene, in the v1 event format. */
function buildEvents(customers: Customer[], res: DayResult, price: number, cash: number, cfg: P1Config): SimEvent[] {
  const events: SimEvent[] = [];
  const snap = (cups: number): StockSnapshot => ({ lemons: 0, sugar: 0, ice: 0, cups });
  events.push({ k: 'open', t: 0, stock: snap(res.made), cash });
  events.push({ k: 'pitcher', t: 0, s: 0, ready: 0 });
  const reactionOf = new Map(res.outcomes.map((o) => [o.customer.c, o.reaction]));
  let left = res.made;
  let hour = 1;
  for (const cu of customers) {
    while (hour * 60 <= cu.t && hour * 60 < cfg.dayMinutes) {
      events.push({ k: 'hour', t: hour * 60, hour: cfg.openHour + hour, temp: 0, stock: snap(left) });
      hour++;
    }
    const r = reactionOf.get(cu.c);
    if (!cu.interested || r === undefined) {
      events.push({ k: 'arrive', t: cu.t, s: 0, c: cu.c, a: cu.a, o: 'pass' });
    } else if (BUY_REACTIONS.has(r)) {
      left--;
      events.push({ k: 'arrive', t: cu.t, s: 0, c: cu.c, a: cu.a, o: 'queue' });
      events.push({ k: 'serve', t: cu.t + 0.3, s: 0, c: cu.c, lane: 0, dur: 0.6, price, b: r as 'deal' | 'fair' | 'pricey' });
    } else {
      events.push({ k: 'arrive', t: cu.t, s: 0, c: cu.c, a: cu.a, o: 'leave', b: r === 'walk' ? 'tooExpensive' : 'soldOut' });
    }
  }
  if (res.soldOutAt !== null) events.push({ k: 'soldOut', t: res.soldOutAt, s: 0 });
  events.push({ k: 'hour', t: cfg.dayMinutes, hour: cfg.openHour + cfg.dayMinutes / 60, temp: 0, stock: snap(left) });
  events.push({ k: 'close', t: cfg.dayMinutes + 1 });
  return events.sort((a, b) => a.t - b.t);
}

/** Plays one day. `plan` is what the player chose on the morning board. */
export function runP1Day(state: P1State, plan: P1Plan, cfg: P1Config = P1): P1DayResult {
  const s: P1State = structuredClone(state);
  const day = s.day;
  const wIdx = actualWeather(s.seed, day, cfg);
  const w = cfg.weather[wIdx]!;
  const tr = dayRng(s.seed, day, P1_STREAM.weather, 1);
  const temp = Math.round(w.temp[0]! + tr.next() * (w.temp[1]! - w.temp[0]!));
  const board = morningBoard(state, cfg);
  const report: P1Report = {
    day,
    weekday: weekday(day),
    kind: plan.kind === 'gig' ? 'gig' : 'business',
    weather: { index: wIdx, name: w.name, condition: w.condition, temp },
    forecastRight: board.forecast.weather === wIdx,
    missed: [],
    suggestion: { kind: 'keep' },
    moments: [],
    income: 0,
    levelUps: 0,
    unlocked: [],
    goalDone: false,
    weekSummary: null,
  };
  let events: SimEvent[] = [];
  let units = 0;

  if (plan.kind === 'gig' || !board.business) {
    const gig = plan.kind === 'gig' ? plan.gig : 'delivery';
    const offer = board.gigs.find((g) => g.id === gig)!;
    report.kind = 'gig';
    report.gig = { offer, lesson: gigLesson(state, gig, cfg) };
    report.income = offer.pay;
    s.cash = round2(s.cash + offer.pay);
    s.stats.gigDays++;
    if (s.owned.stand) s.stats.gigDaysAfterStand++;
  } else {
    const b = board.business;
    if (plan.price !== undefined && b === 'stand') {
      const pr = setPrice(s, plan.price, cfg);
      if (pr.ok) s.price = pr.state.price;
    }
    const price = priceOf(s, b, cfg);
    const mode = s.qtyMode;
    let batch = mode === 'handed' ? morningBoard(s, cfg).handedBatch ?? plan.batch : plan.batch;
    const uc = unitCost(b, cfg);
    batch = Math.max(0, Math.min(Math.round(batch), b === 'market' ? cfg.market.maxBatch : cfg.stand.maxBatch, Math.floor(s.cash / uc + 1e-9)));
    const customers = drawCustomers(s.seed, day, b, cfg);
    const res = simulate(customers, batch, price, uc, salvageShare(s, b, cfg), cfg);
    events = buildEvents(customers, res, price, s.cash, cfg);
    s.cash = round2(s.cash - res.cost + res.revenue + res.salvage);
    s.lastBatch = { ...s.lastBatch, [b]: batch };
    if (mode === 'yours') s.handDays++;
    s.stats.businessDays++;
    s.stats.unitsSold += res.sold;
    units = res.sold;
    const rest: Omit<DayResult, 'outcomes'> = { ...res };
    delete (rest as Partial<DayResult>).outcomes;
    report.business = b;
    report.qtyMode = mode;
    report.price = price;
    report.result = rest;
    report.missed = findMissed(customers, res, price, b, s, cfg);
    report.suggestion = suggestFrom(report.missed, res);
    report.moments = findMoments(res, b, cfg);
    report.income = res.profit;
  }

  // Money earned, experience and skill points.
  const gained = Math.max(0, report.income);
  const before = { market: s.earned >= cfg.market.gate, stand: s.earned >= cfg.stand.gate, cart: s.earned >= cfg.cartGate };
  s.earned = round2(s.earned + gained);
  s.xp += gained;
  while (s.xp >= xpForLevel(s.level, cfg)) {
    s.xp -= xpForLevel(s.level, cfg);
    s.level++;
    s.points++;
    report.levelUps++;
  }
  if (!before.market && s.earned >= cfg.market.gate) report.unlocked.push('market');
  if (!before.stand && s.earned >= cfg.stand.gate) report.unlocked.push('stand');
  if (!before.cart && s.earned >= cfg.cartGate) {
    report.unlocked.push('cart');
    s.cartReady = true;
  }

  // The week.
  const wk = s.week;
  wk.earned = round2(wk.earned + report.income);
  wk.units += units;
  if (!wk.bestDay || report.income > wk.bestDay.profit) wk.bestDay = { day, profit: report.income };
  const goal = wk.goal;
  wk.progress = goal.kind === 'units' ? wk.units : goal.kind === 'earn' ? Math.max(0, wk.earned) : weekday(day) === 5 ? report.income : wk.progress;
  if (!wk.done && wk.progress >= goal.target) {
    wk.done = true;
    report.goalDone = true;
    s.cash = round2(s.cash + cfg.weekGoal.bonus);
  }
  if (weekday(day) === 5 && report.kind === 'business') s.bestSaturday = Math.max(s.bestSaturday, report.income);
  if (weekday(day) === 6) {
    report.weekSummary = { week: Math.floor((day - 1) / 7) + 1, days: 7, earned: wk.earned, units: wk.units, bestDay: wk.bestDay, goal: wk.goal, goalDone: wk.done };
    s.lastWeek = { earned: wk.earned, units: wk.units };
    s.day = day + 1;
    s.week = { goal: goalFor(s, cfg), progress: 0, done: false, earned: 0, units: 0, bestDay: null };
  } else s.day = day + 1;

  return { state: s, report, events };
}

/** Every skill node with whether it can be learned now, for the skills screen. */
export function skillList(s: P1State, cfg: P1Config = P1) {
  return SKILL_IDS.map((id) => ({ id, ...cfg.skills[id], learned: s.skills.includes(id), blocked: s.skills.includes(id) ? null : canLearn(s, id, cfg) }));
}

export { bestPriceFor, buyShare, carefulBatch, interestedMean };
