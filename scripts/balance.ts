// Headless balance report against GDD §17.  Usage: npm run balance [-- --seeds 20 --days 260]
import { CONFIG, type GameConfig, loadConfig, rawConfig } from '../src/config';
import { newGame, runDay, type DayReport, type GameState } from '../src/sim';
import { netWorth } from '../src/sim/game';
import { type BotMemory, type BotOptions, botMorning, chooseRecipe } from './bots';

interface RunLog {
  reports: DayReport[];
  minCash: number;
  campusUnlockDay: number | null;
  financialUnlockDay: number | null;
  netWorth100kDay: number | null;
  netWorthAt: (day: number) => number;
}

export function runBot(seed: number, days: number, opts: BotOptions, cfg: GameConfig): RunLog {
  let s: GameState = newGame(cfg, seed);
  const mem: BotMemory = { lastReport: null };
  const reports: DayReport[] = [];
  const nw: number[] = [];
  let minCash = s.cash;
  let campusUnlockDay: number | null = null;
  let financialUnlockDay: number | null = null;
  let netWorth100kDay: number | null = null;
  for (let d = 0; d < days; d++) {
    const m = botMorning(s, mem, opts, cfg);
    minCash = Math.min(minCash, m.state.cash);
    const r = runDay(m.state, m.plan, cfg);
    reports.push(r.report);
    mem.lastReport = r.report;
    s = r.state;
    minCash = Math.min(minCash, s.cash);
    nw.push(netWorth(s));
    if (campusUnlockDay === null && s.locations.campus.unlocked) campusUnlockDay = r.report.day;
    if (financialUnlockDay === null && s.locations.financial.unlocked) financialUnlockDay = r.report.day;
    if (netWorth100kDay === null && netWorth(s) >= 100000) netWorth100kDay = r.report.day;
  }
  return {
    reports,
    minCash,
    campusUnlockDay,
    financialUnlockDay,
    netWorth100kDay,
    netWorthAt: (day) => nw[day - 1] ?? NaN,
  };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const median = (xs: number[]) => {
  const v = [...xs].sort((a, b) => a - b);
  return v.length ? (v.length % 2 ? v[(v.length - 1) / 2]! : (v[v.length / 2 - 1]! + v[v.length / 2]!) / 2) : NaN;
};

/** Average one-day profit at a fixed price with forced sunny weather at `temp`. */
function fixedPriceProfit(price: number, temp: number, seeds: number, cfg: GameConfig): number {
  let total = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    for (let k = 0; k < 3; k++) {
      let s = newGame(cfg, seed * 7 + k);
      s.cash = 1000;
      s.weather = { condition: 'sunny', dayTemp: temp };
      s.forecast = { condition: 'sunny', temp };
      s.day = 2 + k; // Tue–Thu: plain weekdays
      const stand = s.stands[0]!;
      stand.recipe = chooseRecipe(s, stand, 'maple', cfg);
      const m = botMorning(s, { lastReport: null }, { name: 'probe', fixedPrice: price, expand: false, hoard: 1 }, cfg);
      // Generous stock so price alone decides sales.
      s = m.state;
      const r = runDay(s, m.plan, cfg);
      total += r.report.revenue - r.report.costs.ingredients;
    }
  }
  return total / (seeds * 3);
}

export function bestFixedPrice(temp: number, seeds: number, cfg: GameConfig): { price: number; profit: number } {
  let best = { price: 0, profit: -Infinity };
  for (let p = 0.5; p <= 2.5 + 1e-9; p += 0.05) {
    const price = Math.round(p * 100) / 100;
    const profit = fixedPriceProfit(price, temp, seeds, cfg);
    if (profit > best.profit) best = { price, profit };
  }
  return best;
}

interface Row {
  target: string;
  value: string;
  pass: boolean | null;
}

export function balanceReport(cfg: GameConfig = CONFIG, seeds = 20, days = 260): Row[] {
  const sensible: BotOptions = { name: 'Sensible', expand: true };
  const runs = Array.from({ length: seeds }, (_, i) => runBot(i + 1, days, sensible, cfg));
  const rows: Row[] = [];
  const fmt = (x: number | null, d = 0) => (x === null || Number.isNaN(x) ? 'never' : x.toFixed(d));
  const inRange = (x: number, lo: number, hi: number) => x >= lo && x <= hi;

  const week1 = mean(runs.map((r) => mean(r.reports.slice(0, 7).map((x) => x.profit))));
  rows.push({ target: 'Sensible: days 1–7 avg profit $15–$60', value: `$${week1.toFixed(2)}`, pass: inRange(week1, 15, 60) });

  // M9: cash in hand stops being a fair measure once the bot spends it, so this reads the unlock itself.
  const dCampus = runs.map((r) => r.campusUnlockDay ?? Infinity);
  const mCampus = median(dCampus);
  rows.push({
    target: 'Sensible: unlocks Campus Quad day 14–25',
    value: `median day ${fmt(Number.isFinite(mCampus) ? mCampus : null)} (range ${fmt(Math.min(...dCampus))}–${fmt(Number.isFinite(Math.max(...dCampus)) ? Math.max(...dCampus) : null)})`,
    pass: inRange(mCampus, 14, 25),
  });

  const dFin = runs.map((r) => r.financialUnlockDay ?? Infinity);
  const mFin = median(dFin);
  rows.push({
    target: 'Sensible: unlocks Financial District day 45–70',
    value: `median day ${fmt(Number.isFinite(mFin) ? mFin : null)} (range ${fmt(Math.min(...dFin))}–${fmt(Number.isFinite(Math.max(...dFin)) ? Math.max(...dFin) : null)})`,
    pass: inRange(mFin, 45, 70),
  });

  const d100k = runs.map((r) => r.netWorth100kDay ?? Infinity);
  const m100k = median(d100k);
  rows.push({
    target: 'Sensible: $100k net worth day 160–260',
    value: `median day ${fmt(Number.isFinite(m100k) ? m100k : null)}; NW@${days} median $${median(runs.map((r) => r.netWorthAt(days))).toFixed(0)}`,
    pass: inRange(m100k, 160, 260),
  });

  const minCash = Math.min(...runs.map((r) => r.minCash));
  rows.push({ target: 'Sensible: cash never below $0', value: `min $${minCash.toFixed(2)}`, pass: minCash >= 0 });

  const rain = runs.flatMap((r) => r.reports.filter((x) => x.weather.condition === 'rain').map((x) => x.profit));
  const rainAvg = mean(rain);
  rows.push({ target: 'Sensible: rain-day avg profit ≥ −$20', value: `$${rainAvg.toFixed(2)} over ${rain.length} days`, pass: rainAvg >= -20 });

  const nw30 = median(runs.map((r) => r.netWorthAt(30)));
  const greedy = median(Array.from({ length: seeds }, (_, i) => runBot(i + 1, 30, { name: 'Greedy', fixedPrice: 3, expand: true }, cfg).netWorthAt(30)));
  rows.push({
    target: 'Greedy ($3.00): ≥50% below Sensible on day-30 NW',
    value: `$${greedy.toFixed(0)} vs $${nw30.toFixed(0)} (${((1 - greedy / nw30) * 100).toFixed(0)}% below)`,
    pass: greedy <= nw30 * 0.5,
  });

  const nw60 = median(runs.map((r) => r.netWorthAt(60)));
  const cheap = median(Array.from({ length: seeds }, (_, i) => runBot(i + 1, 60, { name: 'Cheap', fixedPrice: 0.5, expand: true }, cfg).netWorthAt(60)));
  rows.push({
    target: 'Cheap ($0.50): ≥40% below Sensible on day-60 NW',
    value: `$${cheap.toFixed(0)} vs $${nw60.toFixed(0)} (${((1 - cheap / nw60) * 100).toFixed(0)}% below)`,
    pass: cheap <= nw60 * 0.6,
  });

  const hoarders = Array.from({ length: seeds }, (_, i) => runBot(i + 1, 60, { name: 'Hoarder', hoard: 3, expand: true }, cfg));
  const spoil = hoarders.reduce((a, r) => a + r.reports.reduce((b, x) => b + x.costs.spoilage, 0), 0);
  const rev = hoarders.reduce((a, r) => a + r.reports.reduce((b, x) => b + x.revenue, 0), 0);
  rows.push({ target: 'Hoarder (3× stock): spoilage ≥15% of revenue', value: `${((spoil / rev) * 100).toFixed(1)}%`, pass: spoil / rev >= 0.15 });

  const cool = bestFixedPrice(60, 20, cfg);
  const hot = bestFixedPrice(90, 20, cfg);
  const diff = hot.price - cool.price;
  rows.push({
    target: 'Variety: best fixed price 60°F vs 90°F differs ≥ $0.30',
    value: `$${cool.price.toFixed(2)} vs $${hot.price.toFixed(2)} (Δ $${diff.toFixed(2)})`,
    pass: Math.abs(diff) >= 0.3 - 1e-9,
  });
  return rows;
}

function printRows(rows: Row[]): void {
  const w = Math.max(...rows.map((r) => r.target.length));
  const v = Math.max(...rows.map((r) => r.value.length));
  console.log(`${'Target'.padEnd(w)} | ${'Value'.padEnd(v)} | Result`);
  console.log(`${'-'.repeat(w)}-+-${'-'.repeat(v)}-+-------`);
  for (const r of rows) console.log(`${r.target.padEnd(w)} | ${r.value.padEnd(v)} | ${r.pass === null ? 'N/A' : r.pass ? 'PASS' : 'FAIL'}`);
  const fails = rows.filter((r) => r.pass === false).length;
  console.log(`\n${rows.length - fails}/${rows.length} targets pass.`);
}

const isMain = process.argv[1]?.endsWith('balance.ts');
if (isMain) {
  const arg = (name: string, dflt: number) => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? Number(process.argv[i + 1]) : dflt;
  };
  const t0 = Date.now();
  // --set customers.decision.stopBase=0.4 (repeatable) overrides config values for experiments.
  const raw: any = structuredClone(rawConfig());
  process.argv.forEach((a, i) => {
    if (a !== '--set') return;
    const [path, value] = process.argv[i + 1]!.split('=');
    const keys = path!.split('.');
    let o = raw;
    for (const k of keys.slice(0, -1)) o = o[Number.isNaN(Number(k)) ? k : Number(k)];
    o[keys[keys.length - 1]!] = JSON.parse(value!);
  });
  const cfg = loadConfig(raw);
  printRows(balanceReport(cfg, arg('seeds', 20), arg('days', 260)));
  console.log(`(${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
