// Paper economy for Squeeze City v2. No game code: a small model of the design's
// starting numbers, so they can be checked before anything is built.
// Usage: npm run paper            (prints the checks)
//        npm run paper -- --json  (prints the numbers as JSON)
//
// Part A models one day at the drink stand: how much to make and what to charge.
// Part B models the climb: how long each rung takes, what there is to do, who goes broke.
// Every number here is a proposal. Change it here, re-run, and copy what passes into GDD-v2.

// ---------------------------------------------------------------- numbers
export const N = {
  stand: {
    baseInterested: 250, // people who would buy at the street price on a mild day
    unitCost: 0.35,
    salvage: 0.5, // share of an unsold cup's cost that keeps for tomorrow (sugar, cups, whole lemons)
    weather: [
      // name, share of days, demand factor, street price
      ['rain', 0.15, 0.45, 1.0],
      ['cloudy', 0.2, 0.75, 1.1],
      ['mild', 0.3, 1.0, 1.2],
      ['warm', 0.22, 1.3, 1.35],
      ['hot', 0.13, 1.7, 1.5],
    ],
    forecastRight: 0.8, // the forecast names the right weather this often
    demandNoise: 0.18, // day-to-day spread around the weather's demand (lognormal sigma)
    wtpSpread: 0.25, // how much customers differ in what they will pay (lognormal sigma)
    autoPriceShare: 0.9, // a handed-off stand charges this share of the best price
    autoShare: [0.85, 0.96], // a handed-off decision should land in this share of careful play
    lazyMaxShare: 0.85,
  },
  gigPerDay: [40, 60],
  // net per day when the owner runs it, after its own daily fees
  // `net` is what a day brings in when the owner runs it, before the weekly bills.
  // `weekly` is rent, loan payments, permits and wages, due every seventh day.
  rungs: [
    { id: 'gigs', name: 'Gigs', gate: 0, cost: 0, net: [40, 60], weekly: 0, targetDay: 1, live: ['which gig'] },
    { id: 'market', name: 'Market table', gate: 120, cost: 90, net: [70, 110], weekly: 0, targetDay: 3, live: ['how much to make'] },
    { id: 'stand', name: 'Drink stand', gate: 420, cost: 300, net: [95, 165], weekly: 0, targetDay: 7, live: ['how much to make', 'what to charge'] },
    { id: 'cart', name: 'Food cart', gate: 1700, cost: 1300, net: [220, 340], weekly: 400, targetDay: 21, live: ['where to set up', 'the special', 'what to charge'] },
    { id: 'truck', name: 'Food truck', gate: 5500, cost: 1800, net: [650, 900], weekly: 3200, targetDay: 36, live: ['the route', 'events', 'the special'] },
    { id: 'contracts', name: 'Contracts', gate: 14000, cost: 1500, net: [800, 1100], weekly: 3600, targetDay: 46, live: ['which jobs to take', 'the route', 'events'] },
    { id: 'restaurant', name: 'Restaurant', gate: 32000, cost: 11000, net: [2000, 2800], weekly: 11000, targetDay: 68, live: ['the seasonal menu', 'staff', 'which jobs to take'] },
    { id: 'second', name: 'Second location', gate: 85000, cost: 28000, net: [2000, 2800], weekly: 11000, targetDay: 95, live: ['who runs what', 'the seasonal menu', 'staff'] },
  ],
  handedOffShare: 0.65, // a business someone else runs for you earns this share, wage included
  vending: { gate: 900, cost: 280, netPerDay: 9, maxByRung: { stand: 2, cart: 4, truck: 6, contracts: 8, restaurant: 10, second: 12 } },
  reserveWeeks: 1, // a sensible player keeps this many weeks of fixed costs before buying
  badWeekChance: 0.15,
  badWeekRepeats: 0.35, // chance a bad week is followed by another // a bad week: storms, road works, a breakdown
  badWeekFactor: 0.25, // income in a bad week, as a share of normal
  graceDays: 3,
  rescueLoan: { interest: 0.2, cooldownDays: 28 }, // an emergency loan covers one missed bill, repaid with next week's
  xpPerLevel: (level) => 130 * Math.pow(1.32, level), // money earned per skill point
  recipeEveryDays: { stand: 6, cart: 6, truck: 6, contracts: 5, restaurant: 4, second: 4 }, // a season, trend or skill offers a new recipe this often
  maxQuietDays: 4,
  maxLiveDecisions: 3,
  bust: { sensibleMax: 0.03, recklessMin: 0.15, recklessMax: 0.6 },
};

// ---------------------------------------------------------------- helpers
function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = () => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
  return { next, normal, between: (lo, hi) => lo + (hi - lo) * next(), logn: (s) => Math.exp(s * normal() - (s * s) / 2) };
}
const erf = (x) => {
  const s = Math.sign(x);
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  return s * (1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
};
const cdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const pct = (x) => `${(100 * x).toFixed(0)}%`;
const checks = [];
const check = (name, value, pass) => checks.push({ name, value, pass });

// ---------------------------------------------------------------- Part A: a day at the stand
/** Share of interested people who buy at `price` when the street price is `street`. */
function buyShare(price, street) {
  const s = N.stand.wtpSpread;
  return 1 - cdf((Math.log(price / street) + (s * s) / 2) / s);
}
function pickWeather(r) {
  let u = r.next();
  for (const w of N.stand.weather) {
    if ((u -= w[1]) <= 0) return w;
  }
  return N.stand.weather[2];
}
/** Best price for a known street price: a careful player gets here by watching faces. */
function bestPrice(street) {
  let best = [0, -1];
  for (let p = 0.5; p <= 2.5; p += 0.05) {
    const v = (p - N.stand.unitCost) * buyShare(p, street);
    if (v > best[1]) best = [p, v];
  }
  return best[0];
}
function standDays(days, seed) {
  const r = rng(seed);
  const S = N.stand;
  const out = { careful: [], auto: [], lazy: [], cheap: [], walkedAway: [] };
  const avgFactor = S.weather.reduce((a, w) => a + w[1] * w[2], 0);
  const lazyPrice = 1.2;
  const lazyQty = Math.round(S.baseInterested * avgFactor * buyShare(lazyPrice, 1.2));
  for (let d = 0; d < days; d++) {
    const actual = pickWeather(r);
    const forecast = r.next() < S.forecastRight ? actual : pickWeather(r);
    const interested = S.baseInterested * actual[2] * r.logn(S.demandNoise);
    const street = actual[3];
    const profit = (price, qty) => {
      const wants = interested * buyShare(price, street);
      const sold = Math.min(wants, qty);
      const left = Math.max(0, qty - sold);
      return { profit: sold * price - qty * S.unitCost + left * S.unitCost * S.salvage, walked: Math.max(0, wants - qty) };
    };
    // Careful: reads today's street price from the forecast, and makes enough to cover the
    // upper part of the forecast range, because a wasted cup costs far less than a lost sale.
    const cp = bestPrice(forecast[3]);
    const fcWants = S.baseInterested * forecast[2] * buyShare(cp, forecast[3]);
    const fractile = (cp - S.unitCost) / (cp - S.unitCost * S.salvage); // newsvendor: how sure to be of not running out
    const z = Math.sqrt(2) * erfInv(2 * fractile - 1);
    const careful = profit(cp, Math.round(fcWants * Math.exp(S.demandNoise * z)));
    // Handed off: a helper charges a little under the best price and makes the middle of
    // the forecast, with nothing extra for a busy day.
    const ap = bestPrice(forecast[3]) * S.autoPriceShare;
    const auto = profit(ap, Math.round(S.baseInterested * forecast[2] * buyShare(ap, forecast[3])));
    const lazy = profit(lazyPrice, lazyQty);
    const cheap = profit(0.55, lazyQty); // what happened in Playtest 2
    out.careful.push(careful.profit);
    out.auto.push(auto.profit);
    out.lazy.push(lazy.profit);
    out.cheap.push(cheap.profit);
    out.walkedAway.push(cheap.walked);
  }
  return out;
}
function erfInv(x) {
  const a = 0.147;
  const l = Math.log(1 - x * x);
  const t = 2 / (Math.PI * a) + l / 2;
  return Math.sign(x) * Math.sqrt(Math.sqrt(t * t - l / a) - t);
}

// ---------------------------------------------------------------- Part B: the climb
function climb(seed, policy, days = 120) {
  const r = rng(seed);
  let cash = 60;
  let earned = 0;
  let rung = 0;
  let machines = 0;
  let level = 0;
  let xp = 0;
  let lastNew = 0;
  let lastRecipe = 0;
  let longestQuiet = 0;
  let bust = null;
  let unpaid = 0;
  let badWeek = false;
  let debt = 0;
  let lastLoan = -99;
  let loans = 0;
  const reached = { gigs: 1 };
  const quietRuns = [];
  const share = { own: 0, handed: 0, vending: 0, gigs: 0 };
  const somethingNew = (day) => {
    quietRuns.push(day - lastNew);
    longestQuiet = Math.max(longestQuiet, day - lastNew);
    lastNew = day;
  };
  for (let day = 1; day <= days && !bust; day++) {
    if ((day - 1) % 7 === 0) badWeek = r.next() < (badWeek ? N.badWeekRepeats : N.badWeekChance);
    const cur = N.rungs[rung];
    const k = badWeek ? N.badWeekFactor : 1;
    // The owner runs the newest business. Earlier ones (from the stand on) are handed off.
    const own = r.between(...cur.net) * k;
    let handed = 0;
    for (let i = 2; i < rung; i++) {
      if (N.rungs[i].id === 'contracts') continue; // contracts are jobs, not a place someone else runs
      const prevNet = i === 0 ? 0 : mean(N.rungs[i - 1].net);
      handed += (mean(N.rungs[i].net) - (i >= 5 ? prevNet : 0)) * N.handedOffShare * k;
    }
    const vend = machines * N.vending.netPerDay;
    const income = own + handed + vend;
    cash += income;
    earned += income;
    share.own += own;
    share.handed += handed;
    share.vending += vend;
    if (rung === 0) share.gigs += own;
    // skill points
    xp += income;
    while (xp >= N.xpPerLevel(level)) {
      xp -= N.xpPerLevel(level);
      level++;
      somethingNew(day);
    }
    // a season, trend or new skill offers a recipe
    const every = N.recipeEveryDays[cur.id];
    if (every && day - lastRecipe >= every) {
      lastRecipe = day;
      somethingNew(day);
    }
    // one weekly goal within reach (a festival target, a regular's request, a best-day record)
    if (day % 7 === 4) somethingNew(day);
    // weekly bills
    if (day % 7 === 0) {
      const bill = cur.weekly + (rung >= 7 ? N.rungs[6].weekly : 0) + debt;
      debt = 0;
      if (cash >= bill) cash -= bill;
      else unpaid = { bill, due: day + N.graceDays };
    }
    if (unpaid && day >= unpaid.due) {
      if (cash < unpaid.bill) {
        cash += machines * N.vending.cost * 0.6; // sell the machines
        machines = 0;
      }
      if (cash >= unpaid.bill) cash -= unpaid.bill;
      else if (day - lastLoan >= N.rescueLoan.cooldownDays) {
        debt = (unpaid.bill - cash) * (1 + N.rescueLoan.interest);
        cash = 0;
        lastLoan = day;
        loans++;
      } else bust = day;
      unpaid = 0;
    }
    if (bust) break;
    // buy the next rung
    const next = N.rungs[rung + 1];
    const weeklyAfter = next ? next.weekly + (rung + 1 >= 7 ? N.rungs[6].weekly : 0) : 0;
    const reserve = policy === 'sensible' ? weeklyAfter * N.reserveWeeks : 0;
    if (next && earned >= next.gate && cash >= next.cost + reserve) {
      cash -= next.cost;
      rung++;
      reached[next.id] = day;
      somethingNew(day);
    } else if (
      rung >= 2 &&
      earned >= N.vending.gate &&
      machines < (N.vending.maxByRung[cur.id] ?? 0) &&
      cash >= N.vending.cost + (policy === 'sensible' ? cur.weekly * N.reserveWeeks : 0) &&
      !(next && earned >= next.gate) // don't buy machines while saving for the next rung
    ) {
      cash -= N.vending.cost;
      machines++;
      if (!reached.vending) reached.vending = day;
      somethingNew(day);
    }
  }
  return { reached, longestQuiet, quietRuns, bust, level, share, earned, cash, loans };
}

// ---------------------------------------------------------------- run
const json = process.argv.includes('--json');
const A = standDays(4000, 11);
const careful = mean(A.careful);
const lazyShare = mean(A.lazy) / careful;
const autoShare = mean(A.auto) / careful;
const cheapShare = mean(A.cheap) / careful;
check('Stand: never changing quantity or price earns at most 85% of careful play', pct(lazyShare), lazyShare <= N.stand.lazyMaxShare);
check('Stand: a handed-off stand earns 85% to 96% of careful play', pct(autoShare), autoShare >= N.stand.autoShare[0] && autoShare <= N.stand.autoShare[1]);
check('Stand: charging $0.55 (Playtest 2) earns under half of careful play', pct(cheapShare), cheapShare < 0.5);

const runs = Array.from({ length: 400 }, (_, i) => climb(i + 1, 'sensible'));
const reckless = Array.from({ length: 400 }, (_, i) => climb(i + 1, 'reckless'));
const rows = [];
for (const rg of [...N.rungs.slice(1, 3), { id: 'vending', name: 'First vending machine', targetDay: 11 }, ...N.rungs.slice(3)]) {
  const days = runs.map((x) => x.reached[rg.id]).filter((d) => d !== undefined);
  const med = days.length >= runs.length / 2 ? median(days) : null;
  rows.push({ rung: rg.name, target: rg.targetDay, median: med, reachedBy: days.length / runs.length });
  const lo = Math.floor(rg.targetDay * 0.75) - 1;
  const hi = Math.ceil(rg.targetDay * 1.25) + 1;
  check(`Climb: ${rg.name} reached near day ${rg.targetDay}`, med === null ? 'not reached by day 120' : `median day ${med}`, med !== null && med >= lo && med <= hi);
}
const quiet = median(runs.map((x) => x.longestQuiet));
const allRuns = runs.flatMap((x) => x.quietRuns);
const overShare = allRuns.filter((g) => g > N.maxQuietDays).length / allRuns.length;
check(`Climb: at most 5% of waits for something new run past ${N.maxQuietDays} days`, `${pct(overShare)} (longest: median ${quiet} days)`, overShare <= 0.05);
const bustS = runs.filter((x) => x.bust).length / runs.length;
const bustR = reckless.filter((x) => x.bust).length / reckless.length;
check('Money: a player who keeps a reserve almost never goes broke', pct(bustS), bustS <= N.bust.sensibleMax);
check('Money: a player who expands with no reserve sometimes does', pct(bustR), bustR >= N.bust.recklessMin && bustR <= N.bust.recklessMax);
const maxLive = Math.max(...N.rungs.map((x) => x.live.length));
check(`Attention: no rung asks for more than ${N.maxLiveDecisions} decisions a day`, `${maxLive}`, maxLive <= N.maxLiveDecisions);
const sh = runs.reduce((a, x) => ({ own: a.own + x.share.own, handed: a.handed + x.share.handed, vending: a.vending + x.share.vending }), { own: 0, handed: 0, vending: 0 });
const tot = sh.own + sh.handed + sh.vending;
check('Side earners: businesses you no longer run bring in 15% to 45% of income over 120 days', pct((sh.handed + sh.vending) / tot), (sh.handed + sh.vending) / tot >= 0.15 && (sh.handed + sh.vending) / tot <= 0.45);
const payback = N.vending.cost / N.vending.netPerDay;
check('Vending: a machine pays for itself within 35 days', `${payback.toFixed(0)} days`, payback <= 35);

if (json) {
  console.log(JSON.stringify({ numbers: { ...N, xpPerLevel: 'see script' }, stand: { careful, lazyShare, autoShare, cheapShare }, climb: rows, checks }, null, 2));
} else {
  console.log('PART A  One day at the drink stand (4,000 days)');
  console.log(`  careful play earns $${careful.toFixed(0)} a day`);
  console.log(`  never changing anything: ${pct(lazyShare)} | handed off: ${pct(autoShare)} | charging $0.55: ${pct(cheapShare)}, with ${mean(A.walkedAway).toFixed(0)} people a day finding it sold out`);
  console.log('\nPART B  The climb (400 runs of 120 days, a player who keeps a reserve)');
  for (const r of rows) console.log(`  ${r.rung.padEnd(22)} target day ${String(r.target).padStart(3)}   median ${r.median === null ? '  —' : `day ${String(r.median).padStart(3)}`}   reached in ${pct(r.reachedBy)} of runs`);
  console.log(`  skill points by day 120: median ${median(runs.map((x) => x.level))}`);
  console.log(`  went broke: with a reserve ${pct(bustS)}, with none ${pct(bustR)}`);
  console.log(`  needed an emergency loan at least once: with a reserve ${pct(runs.filter((x) => x.loans).length / runs.length)}, with none ${pct(reckless.filter((x) => x.loans).length / reckless.length)}`);
  const w = Math.max(...checks.map((c) => c.name.length));
  console.log(`\n${'Check'.padEnd(w)} | Result | Value`);
  for (const c of checks) console.log(`${c.name.padEnd(w)} | ${c.pass ? 'PASS  ' : 'FAIL  '} | ${c.value}`);
  console.log(`\n${checks.filter((c) => c.pass).length}/${checks.length} checks pass.`);
}
