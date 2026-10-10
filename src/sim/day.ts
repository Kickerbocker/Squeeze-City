import { type Archetype, CONFIG, type GameConfig, type LocationConfig, type LocationId, LOCATION_IDS } from '../config';
import { applyAction } from './actions';
import { dayInfo, dayMinutes } from './calendar';
import {
  archetypeShares,
  buyProbability,
  curveMean,
  drinkBubble,
  hourlyWeight,
  satisfaction,
  stopProbability,
  willingnessToPay,
} from './customers';
import { competitorSteal, eventTrafficMultiplier, isGameDay } from './events';
import { beginDay, bestRep, netWorth, spoilDays } from './game';
import {
  expiredLemons,
  iceMeltFraction,
  lemonCount,
  meltIce,
  spoilLemons,
  stockSnapshot,
  takeBulk,
  takeLemons,
} from './inventory';
import { adFactor, marketingTraffic } from './marketing';
import { quality, recipeComplaints } from './recipe';
import { idleRep, lostRate, newLocationRep, updateRep } from './reputation';
import { dayRng, type Rng, STREAM } from './rng';
import {
  appeal,
  laneSpeeds,
  patienceMultiplier,
  prepMinutes,
  serveMinutes,
  standWages,
  stopMultiplier,
} from './stand';
import type {
  Bubble,
  DayPlan,
  DayReport,
  DayResult,
  GameState,
  MilestoneHit,
  SimEvent,
  Stand,
  StandReport,
} from './types';
import { cents } from './util';
import { conditionEffect, tempAtMinute, tempThirst } from './weather';

interface QueuedCustomer {
  c: number;
  a: Archetype;
  t: number;
  wtp: number;
  patience: number;
}

interface Lane {
  speed: number;
  busyUntil: number;
}

/** Live state of one stand during the business day. */
interface StandRun {
  stand: Stand;
  loc: LocationConfig;
  rep: number;
  rng: Rng;
  shares: Partial<Record<Archetype, number>>;
  /** Passersby per hour before the hourly curve. */
  traffic: number;
  wTraffic: number;
  wThirst: number;
  appeal: number;
  adFactor: number;
  steal: number;
  prep: number;
  serve: number;
  lanes: Lane[];
  queue: QueuedCustomer[];
  pitcherCups: number;
  preparing: boolean;
  readyAt: number;
  now: number;
  soldOut: boolean;
  report: StandReport;
  satSum: number;
}

/**
 * Simulates one business day plus the night that follows, then sets up the next
 * morning. Pure: the input state is never mutated.
 */
export interface RunDayOptions {
  /**
   * M10: seed for the customer stream instead of the game seed. Projections use this to
   * sample made-up crowds; everything else about the day is unchanged.
   */
  customerSeed?: number;
}

export function runDay(state: GameState, plan: DayPlan = {}, cfg: GameConfig = CONFIG, opts: RunDayOptions = {}): DayResult {
  const s = structuredClone(state);
  applyPlan(s, plan, cfg);

  const day = s.day;
  const info = dayInfo(day, cfg);
  const dayLen = dayMinutes(cfg);
  const cpp = cfg.recipe.cupsPerPitcher;
  const inv = s.inventory;
  const events: SimEvent[] = [];
  const cashStart = cents(s.cash + s.ledger.stock + s.ledger.ads + s.ledger.capital);
  const gameDay = isGameDay(s.seed, day, cfg);
  let ingredientsCost = 0;
  let iceLostValue = 0;
  let nextCid = 0;

  // --- Set up each operating stand -------------------------------------------------
  const runs: StandRun[] = [];
  for (const stand of s.stands) {
    if (stand.locationId === null) continue;
    const loc = cfg.locations.locations.find((l) => l.id === stand.locationId)!;
    const ls = s.locations[loc.id];
    if (ls.rep === null) {
      const owned = LOCATION_IDS.map((id) => s.locations[id].rep).filter((r): r is number => r !== null);
      ls.rep = newLocationRep(owned, cfg);
    }
    const rep = ls.rep;
    const w = conditionEffect(s.weather.condition, cfg, loc.weatherAmplify ?? 1);
    let traffic = gameDay && loc.gameDayTraffic !== undefined ? loc.gameDayTraffic : info.weekend ? loc.trafficWeekend : loc.trafficWeekday;
    if (loc.offSeasons?.includes(info.season)) traffic *= loc.offSeasonTraffic ?? 1;
    traffic *= eventTrafficMultiplier(s.events, loc.id, day, cfg) * marketingTraffic(s.campaigns, loc.id, day, cfg);

    runs.push({
      stand,
      loc,
      rep,
      rng: dayRng(opts.customerSeed ?? s.seed, day, STREAM.customers, LOCATION_IDS.indexOf(loc.id)),
      shares: archetypeShares(loc, info.weekend, gameDay, cfg),
      traffic,
      wTraffic: w.traffic,
      wThirst: w.thirst,
      appeal: appeal(stand, cfg),
      adFactor: adFactor(s.campaigns, loc.id, day, cfg),
      steal: competitorSteal(s.events, loc.id, rep, day, cfg),
      prep: prepMinutes(stand, cfg),
      serve: serveMinutes(stand, cfg),
      lanes: laneSpeeds(stand, cfg).map((speed) => ({ speed, busyUntil: 0 })),
      queue: [],
      pitcherCups: 0,
      preparing: false,
      readyAt: 0,
      now: 0,
      soldOut: false,
      satSum: 0,
      report: {
        standId: stand.id,
        locationId: loc.id,
        passersby: 0,
        stoppers: 0,
        buyers: 0,
        revenue: 0,
        ingredients: 0,
        rent: loc.rent,
        wages: 0,
        lostQueue: 0,
        lostSoldOut: 0,
        tooExpensive: 0,
        stolen: 0,
        avgSat: 0,
        repBefore: rep,
        repAfter: rep,
        complaints: {},
        hourlySales: Array.from({ length: dayLen / 60 }, () => 0),
        pitchers: 0,
        soldOutAt: null,
      },
    });
  }

  const meltMultiplier =
    runs.length === 0
      ? 1
      : runs.reduce((a, r) => a + (r.stand.upgrades.cooler ? cfg.upgrades.cooler.meltMultiplier : 1), 0) / runs.length;

  // --- Service mechanics -------------------------------------------------------------
  const temp = (t: number) => tempAtMinute(s.weather.dayTemp, t, cfg);

  const canPrep = (r: StandRun) => lemonCount(inv) >= r.stand.recipe.lemons && inv.sugar.qty >= r.stand.recipe.sugar;

  const startPitcher = (r: StandRun, now: number, instant: boolean) => {
    const cost = takeLemons(inv, r.stand.recipe.lemons) + takeBulk(inv.sugar, r.stand.recipe.sugar);
    ingredientsCost += cost;
    r.report.ingredients += cost;
    r.report.pitchers++;
    if (instant) {
      r.pitcherCups = cpp;
      events.push({ k: 'pitcher', t: now, s: r.stand.id, ready: now });
    } else {
      r.preparing = true;
      r.readyAt = now + r.prep;
      events.push({ k: 'pitcher', t: now, s: r.stand.id, ready: r.readyAt });
    }
  };

  const markSoldOut = (r: StandRun, now: number) => {
    if (r.soldOut) return;
    r.soldOut = true;
    r.report.soldOutAt = now;
    events.push({ k: 'soldOut', t: now, s: r.stand.id });
  };

  const serveOne = (r: StandRun, laneIdx: number, now: number) => {
    const lane = r.lanes[laneIdx]!;
    const c = r.queue.shift()!;
    const ac = cfg.customers.archetypes[c.a];
    const recipe = r.stand.recipe;
    r.pitcherCups--;
    let cost = takeBulk(inv.cups, 1);
    let effIce = 0;
    if (recipe.ice > 0 && inv.ice.qty >= recipe.ice) {
      cost += takeBulk(inv.ice, recipe.ice);
      effIce = recipe.ice;
    }
    ingredientsCost += cost;
    r.report.ingredients += cost;

    const qb = quality(recipe, effIce, ac.sweetShift, temp(now), cfg);
    const sat = satisfaction(qb.q, ac.qualitySens, c.wtp, r.stand.price, now - c.t, c.patience, cfg);
    const bubble = drinkBubble(sat, recipeComplaints(qb, effIce, cfg), cfg);
    const price = r.stand.price;
    s.cash += price;
    r.report.revenue += price;
    r.report.buyers++;
    r.satSum += sat.sat;
    const hour = Math.min(r.report.hourlySales.length - 1, Math.floor(now / 60));
    r.report.hourlySales[hour]!++;
    if (bubble && bubble !== 'delicious') r.report.complaints[bubble] = (r.report.complaints[bubble] ?? 0) + 1;
    const dur = r.serve / lane.speed;
    lane.busyUntil = now + dur;
    events.push({ k: 'serve', t: now, s: r.stand.id, c: c.c, lane: laneIdx, dur, price, ...(bubble ? { b: bubble } : {}) });
  };

  /** Starts pitchers and serves customers at time `now` as far as possible. */
  const tryStart = (r: StandRun, now: number) => {
    for (;;) {
      const open = now < dayLen || r.queue.length > 0;
      if (r.pitcherCups === 0 && !r.preparing && open && canPrep(r)) startPitcher(r, now, false);
      const stuck = inv.cups.qty === 0 || (r.pitcherCups === 0 && !r.preparing && !canPrep(r));
      if (stuck && open) {
        markSoldOut(r, now);
        for (const c of r.queue) {
          r.report.lostSoldOut++;
          events.push({ k: 'quit', t: now, s: r.stand.id, c: c.c, b: 'soldOut' });
        }
        r.queue = [];
        return;
      }
      if (r.queue.length === 0 || r.pitcherCups === 0) return;
      const laneIdx = r.lanes.findIndex((l) => l.busyUntil <= now);
      if (laneIdx < 0) return;
      serveOne(r, laneIdx, now);
    }
  };

  /** Advances a stand's service through every completion up to `until`. */
  const advance = (r: StandRun, until: number) => {
    for (;;) {
      tryStart(r, r.now);
      let next = Infinity;
      for (const l of r.lanes) if (l.busyUntil > r.now) next = Math.min(next, l.busyUntil);
      if (r.preparing) next = Math.min(next, r.readyAt);
      if (next === Infinity || next > until) break;
      r.now = next;
      if (r.preparing && r.readyAt <= r.now) {
        r.preparing = false;
        r.pitcherCups = cpp;
      }
    }
    if (until !== Infinity && until > r.now) r.now = until;
    tryStart(r, r.now);
  };

  const expectedWait = (r: StandRun, t: number) => {
    const ahead = r.queue.length;
    const totalSpeed = r.lanes.reduce((a, l) => a + l.speed, 0);
    const allBusy = r.lanes.every((l) => l.busyUntil > t);
    let w = (allBusy ? Math.min(...r.lanes.map((l) => l.busyUntil)) - t : 0) + (ahead * r.serve) / totalSpeed;
    if (r.pitcherCups < ahead + 1) w += r.preparing ? Math.max(0, r.readyAt - t) : r.prep;
    return w;
  };

  const arrive = (r: StandRun, a: Archetype, t: number) => {
    const ac = cfg.customers.archetypes[a];
    const c = nextCid++;
    const rep = r.rep;
    r.report.passersby++;
    const tt = temp(t);
    const tThirst = tempThirst(tt, cfg);
    const pStop = stopProbability(
      {
        appeal: r.appeal,
        rep,
        adFactor: r.adFactor,
        wThirst: r.wThirst,
        tThirst,
        multiplier: stopMultiplier(r.stand, a, cfg),
      },
      cfg,
    );
    const stops = r.rng.chance(pStop);
    // Always draw the same number of numbers per arrival so outcomes stay comparable.
    const stealRoll = r.rng.next();
    const noise = r.rng.logNormal(cfg.customers.decision.wtpSigma);
    const buyRoll = r.rng.next();
    const leave = (b: Bubble) => events.push({ k: 'arrive', t, s: r.stand.id, c, a, o: 'leave', b });

    if (!stops) {
      events.push({ k: 'arrive', t, s: r.stand.id, c, a, o: 'pass' });
      return;
    }
    if (stealRoll < r.steal) {
      r.report.stolen++;
      events.push({ k: 'arrive', t, s: r.stand.id, c, a, o: 'pass' });
      return;
    }
    r.report.stoppers++;
    if (r.soldOut) {
      r.report.lostSoldOut++;
      leave('soldOut');
      return;
    }
    const patience = ac.patience * patienceMultiplier(r.stand, tt, s.weather.condition, cfg);
    if (expectedWait(r, t) > patience) {
      r.report.lostQueue++;
      leave('lineTooLong');
      return;
    }
    const wtp = willingnessToPay(ac.wtpBase, tThirst, rep, noise, cfg);
    if (buyRoll >= buyProbability(r.stand.price, wtp, ac.priceSens, cfg)) {
      r.report.tooExpensive++;
      leave('tooExpensive');
      return;
    }
    r.queue.push({ c, a, t, wtp, patience });
    events.push({ k: 'arrive', t, s: r.stand.id, c, a, o: 'queue' });
    tryStart(r, t);
  };

  // --- The business day ----------------------------------------------------------------
  events.push({ k: 'open', t: 0, stock: stockSnapshot(inv), cash: cents(s.cash) });
  if (cfg.service.firstPitcherReadyAtOpen) {
    for (const r of runs) if (canPrep(r)) startPitcher(r, 0, true);
  }

  const curveMeans = {} as Record<Archetype, number>;
  for (const a of Object.keys(cfg.customers.archetypes) as Archetype[]) {
    curveMeans[a] = curveMean(cfg.customers.archetypes[a].hourly);
  }

  for (let m = 0; m < dayLen; m++) {
    if (m > 0 && m % 60 === 0) {
      iceLostValue += meltIce(inv, iceMeltFraction(temp(m - 30), meltMultiplier, cfg));
      events.push({ k: 'hour', t: m, hour: cfg.calendar.openHour + m / 60, temp: temp(m), stock: stockSnapshot(inv) });
    }
    for (const r of runs) {
      const hourFloat = cfg.calendar.openHour + (m + 0.5) / 60;
      const arrivals: { t: number; a: Archetype }[] = [];
      for (const [a, share] of Object.entries(r.shares) as [Archetype, number][]) {
        const curve = cfg.customers.archetypes[a].hourly;
        const perHour = r.traffic * share * (hourlyWeight(curve, hourFloat, cfg) / curveMeans[a]) * r.wTraffic;
        const n = r.rng.poisson(perHour / 60);
        for (let i = 0; i < n; i++) arrivals.push({ t: m + r.rng.next(), a });
      }
      arrivals.sort((x, y) => x.t - y.t);
      for (const x of arrivals) {
        advance(r, x.t);
        arrive(r, x.a, x.t);
      }
      advance(r, m + 1);
    }
  }
  iceLostValue += meltIce(inv, iceMeltFraction(temp(dayLen - 30), meltMultiplier, cfg));
  events.push({ k: 'hour', t: dayLen, hour: cfg.calendar.closeHour, temp: temp(dayLen), stock: stockSnapshot(inv) });

  // Customers already in line are served after closing.
  let closeT = dayLen;
  for (const r of runs) {
    advance(r, Infinity);
    for (const l of r.lanes) closeT = Math.max(closeT, l.busyUntil);
  }
  events.push({ k: 'close', t: closeT });

  // --- Night -----------------------------------------------------------------------------
  const today = s.day;
  const operating = new Set<LocationId>(runs.map((r) => r.loc.id));
  let rent = 0;
  for (const r of runs) {
    const rp = r.report;
    rp.wages = standWages(r.stand, cfg);
    rp.avgSat = rp.buyers > 0 ? r.satSum / rp.buyers : 0;
    const daySat = rp.buyers > 0 ? rp.avgSat : r.rep / cfg.reputation.satScale;
    rp.repAfter = updateRep(r.rep, daySat, lostRate(rp.lostQueue, rp.lostSoldOut, rp.stoppers), cfg);
    s.locations[r.loc.id].rep = rp.repAfter;
    rent += rp.rent;
    for (const m of r.stand.staff) {
      m.daysWorked++;
      if (m.daysWorked % cfg.staff.skillUpDays === 0 && m.skill < cfg.staff.maxSkill) m.skill++;
    }
  }
  for (const id of LOCATION_IDS) {
    const ls = s.locations[id];
    if (ls.unlocked && ls.rep !== null && !operating.has(id)) ls.rep = idleRep(ls.rep, cfg);
  }
  const wages = s.stands.reduce((a, st) => a + standWages(st, cfg), 0);

  // Leftover ice is lost; expired lemons are discarded (after a possible inspection).
  const iceLeft = inv.ice.qty;
  iceLostValue += takeBulk(inv.ice, iceLeft);
  let inspection: DayReport['inspection'] = null;
  const shelf = spoilDays(s, cfg);
  const insp = cfg.events.inspector;
  if (dayRng(s.seed, today, STREAM.inspector).chance(insp.chance)) {
    const fined = expiredLemons(inv, today, shelf) > 0;
    inspection = { fined, fine: fined ? insp.fine : 0 };
    if (fined) {
      for (const r of runs) {
        const ls = s.locations[r.loc.id];
        ls.rep = Math.max(cfg.reputation.min, (ls.rep ?? 0) - insp.repPenalty);
        r.report.repAfter = ls.rep;
      }
    }
  }
  const spoiled = spoilLemons(inv, today, shelf);
  const fines = inspection?.fine ?? 0;

  s.cash = cents(s.cash - rent - wages - fines);
  const revenue = runs.reduce((a, r) => a + r.report.revenue, 0);
  const spoilage = spoiled.value + iceLostValue;
  const costs = {
    ingredients: cents(ingredientsCost),
    rent: cents(rent),
    wages: cents(wages),
    ads: cents(s.ledger.ads),
    spoilage: cents(spoilage),
    fines: cents(fines),
  };
  const profit = cents(revenue - costs.ingredients - costs.rent - costs.wages - costs.ads - costs.spoilage - costs.fines);
  for (const r of runs) {
    r.report.revenue = cents(r.report.revenue);
    r.report.ingredients = cents(r.report.ingredients);
  }

  // Stats
  const cupsSold = runs.reduce((a, r) => a + r.report.buyers, 0);
  s.stats.cupsSold += cupsSold;
  s.stats.lifetimeRevenue = cents(s.stats.lifetimeRevenue + revenue);
  if (profit > s.stats.bestDayProfit || s.stats.bestDay === 0) {
    s.stats.bestDayProfit = profit;
    s.stats.bestDay = today;
  }
  for (const r of runs) {
    for (const [k, n] of Object.entries(r.report.complaints) as [Bubble, number][]) {
      s.stats.complaints[k] = (s.stats.complaints[k] ?? 0) + n;
    }
  }

  // Unlocks and milestones
  const unlocked: LocationId[] = [];
  const best = bestRep(s);
  for (const loc of cfg.locations.locations) {
    const ls = s.locations[loc.id];
    if (!ls.unlocked && s.stats.lifetimeRevenue >= loc.unlockRevenue && best >= loc.unlockRep) {
      ls.unlocked = true;
      unlocked.push(loc.id);
    }
  }
  const milestones = checkMilestones(s, profit, unlocked, cfg);
  for (const m of milestones) s.cash = cents(s.cash + m.bonus);

  const nw = cents(netWorth(s));
  s.stats.netWorthHistory.push(nw);

  const report: DayReport = {
    day: today,
    season: info.season,
    weather: { ...s.weather },
    forecast: { ...s.forecast },
    stands: runs.map((r) => r.report),
    revenue: cents(revenue),
    costs,
    profit,
    stockBought: s.ledger.stock,
    capitalSpent: s.ledger.capital,
    cashStart,
    cashEnd: s.cash,
    netWorth: nw,
    spoiledLemons: spoiled.qty,
    iceLost: iceLeft,
    inspection,
    milestones,
    unlocked,
    cupsSold,
  };

  s.day += 1;
  beginDay(s, cfg);
  return { state: s, events, report };
}

/** Applies the day plan through the same validation as player actions. */
function applyPlan(s: GameState, plan: DayPlan, cfg: GameConfig): void {
  for (const [idStr, p] of Object.entries(plan.stands ?? {})) {
    const standId = Number(idStr);
    if (p.locationId !== undefined) applyAction(s, { type: 'assignStand', standId, locationId: p.locationId }, cfg);
    if (p.recipe) applyAction(s, { type: 'setRecipe', standId, recipe: p.recipe }, cfg);
    if (p.price !== undefined) applyAction(s, { type: 'setPrice', standId, price: p.price }, cfg);
  }
}

function checkMilestones(s: GameState, profit: number, unlocked: LocationId[], cfg: GameConfig): MilestoneHit[] {
  const m = cfg.progression.milestones;
  const hits: MilestoneHit[] = [];
  const hit = (id: string, bonus: number) => {
    if (s.milestones.includes(id)) return;
    s.milestones.push(id);
    hits.push({ id, bonus });
  };
  if (profit >= m.firstHundredDay.threshold) hit('firstHundredDay', m.firstHundredDay.bonus);
  const anyUpgrade =
    s.globalUpgrades.fridge ||
    s.globalUpgrades.radio ||
    s.stands.some((st) => {
      const u = st.upgrades;
      return u.body > 0 || u.juicer > 0 || u.register > 0 || u.cooler || u.umbrella || u.neon || u.speaker;
    });
  if (anyUpgrade) hit('firstUpgrade', m.firstUpgrade.bonus);
  if (bestRep(s) >= m.rep75.threshold) hit('rep75', m.rep75.bonus);
  for (const id of unlocked) hit(`unlock:${id}`, m.locationUnlocked.bonus);
  for (let n = 2; n <= s.stands.length; n++) hit(`stand:${n}`, m.standOpened.bonuses[n - 1] ?? 0);
  const nw = netWorth(s);
  m.netWorth.thresholds.forEach((th, i) => {
    if (nw >= th) hit(`netWorth:${th}`, m.netWorth.bonuses[i] ?? 0);
  });
  if (nw >= m.tycoonNetWorth) hit('tycoon', 0);
  return hits;
}
