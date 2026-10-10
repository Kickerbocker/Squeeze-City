// P1 bots and checks (docs/specs/P1-prototype.md, "Checks before the playtest").
// Usage: npm run audit (as its v2 section), or `npx tsx scripts/p1-bots.ts` on its own.
import { P1, type P1Config } from '../src/config/p1';
import { buyBusiness, learnSkill, morningBoard, newP1Game, type P1Plan, type P1State, runP1Day, salvageShare } from '../src/sim/p1/game';
import { bestPriceFor, buyShare, carefulBatch } from '../src/sim/p1/model';

export type BotKind = 'careful' | 'lazy' | 'cheap' | 'handed';

const T = {
  /** Never changing batch or price earns at most this share of careful play. */
  lazyMax: 0.85,
  handed: [0.85, 0.96] as [number, number],
  /** Charging $0.55 earns under this share. */
  cheapMax: 0.5,
  standDay: [5, 9] as [number, number],
  cartDay: [14, 22] as [number, number],
  seeds: 20,
  standDays: 60,
  climbDays: 40,
};

/** The fixed plan of a player who never adjusts: one price, one batch, from the average day. */
function lazyBatch(cfg: P1Config, price: number): number {
  const avgDemand = cfg.weather.reduce((a, w) => a + w.share * w.demand, 0);
  const avgStreet = cfg.weather.reduce((a, w) => a + w.share * w.street, 0);
  return Math.round(cfg.stand.baseInterested * avgDemand * buyShare(price, avgStreet, cfg));
}

/** One morning's plan for a bot, from the board alone (never the real weather). */
export function botPlan(s: P1State, kind: BotKind, cfg: P1Config = P1): P1Plan {
  const b = morningBoard(s, cfg);
  if (!b.business) {
    const best = [...b.gigs].sort((x, y) => y.pay - x.pay)[0]!;
    return { kind: 'gig', gig: best.id };
  }
  if (b.business === 'market') {
    const uc = cfg.market.unitCost;
    const batch = kind === 'handed' ? b.likely!.mid : carefulBatch(b.likely!.mid, b.likely!.sigma, cfg.market.price, uc, salvageShare(s, 'market', cfg));
    return { kind: 'open', batch };
  }
  if (kind === 'lazy') return { kind: 'open', batch: lazyBatch(cfg, 1.2), price: 1.2 };
  if (kind === 'cheap') return { kind: 'open', batch: lazyBatch(cfg, 1.2), price: 0.55 };
  const price = bestPriceFor(b.street!.mid, cfg);
  const want = b.likely!.mid * buyShare(price, b.street!.mid, cfg);
  const batch = kind === 'handed' ? Math.round(want) : carefulBatch(want, b.likely!.sigma, price, cfg.stand.unitCost, salvageShare(s, 'stand', cfg));
  return { kind: 'open', batch, price };
}

/** Buys the next business as soon as it can and spends points on the simple perks. */
function botUpkeep(s: P1State, cfg: P1Config): P1State {
  for (const b of ['market', 'stand'] as const) {
    const r = buyBusiness(s, b, cfg);
    if (r.ok) s = r.state;
  }
  for (const id of ['thrifty', 'sharpEye'] as const) {
    const r = learnSkill(s, id, cfg);
    if (r.ok) s = r.state;
  }
  return s;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? NaN;

/** Average daily profit at the drink stand for a bot, over the same seeds and days as the others. */
export function standProfit(kind: BotKind, cfg: P1Config = P1, seeds = T.seeds, days = T.standDays): number {
  const out: number[] = [];
  for (let seed = 1; seed <= seeds; seed++) {
    let s: P1State = { ...newP1Game(seed, cfg), owned: { market: true, stand: true }, cash: 10_000 };
    for (let d = 0; d < days; d++) {
      const r = runP1Day(s, botPlan(s, kind, cfg), cfg);
      out.push(r.report.income);
      s = { ...r.state, cash: 10_000 };
    }
  }
  return mean(out);
}

export function climb(seed: number, cfg: P1Config = P1, days = T.climbDays): { standDay: number | null; cartDay: number | null; marketDay: number | null } {
  let s = newP1Game(seed, cfg);
  let marketDay: number | null = null;
  let standDay: number | null = null;
  let cartDay: number | null = null;
  for (let d = 0; d < days && cartDay === null; d++) {
    s = botUpkeep(s, cfg);
    if (marketDay === null && s.owned.market) marketDay = s.day;
    if (standDay === null && s.owned.stand) standDay = s.day;
    const r = runP1Day(s, botPlan(s, 'careful', cfg), cfg);
    if (r.report.unlocked.includes('cart')) cartDay = r.report.day;
    s = r.state;
  }
  return { marketDay, standDay, cartDay };
}

export interface P1Check {
  name: string;
  value: string;
  pass: boolean;
}

export function p1Checks(cfg: P1Config = P1): P1Check[] {
  const careful = standProfit('careful', cfg);
  const lazy = standProfit('lazy', cfg) / careful;
  const handed = standProfit('handed', cfg) / careful;
  const cheap = standProfit('cheap', cfg) / careful;
  const climbs = Array.from({ length: T.seeds }, (_, i) => climb(i + 1, cfg));
  const st = median(climbs.map((c) => c.standDay ?? Infinity));
  const cart = median(climbs.map((c) => c.cartDay ?? Infinity));
  const mk = median(climbs.map((c) => c.marketDay ?? Infinity));
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const day = (x: number) => (Number.isFinite(x) ? `day ${x}` : 'never');
  console.log(`\nP1 (v2 prototype)  drink stand, ${T.seeds} seeds x ${T.standDays} days: careful play earns $${careful.toFixed(0)} a day`);
  console.log(`  never changing: ${pct(lazy)} | handed-off batch: ${pct(handed)} | charging $0.55: ${pct(cheap)}`);
  console.log(`  climb (careful bot): market table ${day(mk)}, drink stand ${day(st)}, food cart unlock ${day(cart)}`);
  return [
    { name: `P1: never changing batch or price earns at most ${pct(T.lazyMax)} of careful play`, value: pct(lazy), pass: lazy <= T.lazyMax },
    { name: `P1: a handed-off batch earns ${pct(T.handed[0])} to ${pct(T.handed[1])} of careful play`, value: pct(handed), pass: handed >= T.handed[0] && handed <= T.handed[1] },
    { name: 'P1: charging $0.55 earns under half of careful play', value: pct(cheap), pass: cheap < T.cheapMax },
    { name: `P1: careful bot opens the drink stand day ${T.standDay[0]} to ${T.standDay[1]}`, value: day(st), pass: st >= T.standDay[0] && st <= T.standDay[1] },
    { name: `P1: careful bot unlocks the food cart day ${T.cartDay[0]} to ${T.cartDay[1]}`, value: day(cart), pass: cart >= T.cartDay[0] && cart <= T.cartDay[1] },
  ];
}

if (process.argv[1]?.endsWith('p1-bots.ts')) {
  const checks = p1Checks();
  const w = Math.max(...checks.map((c) => c.name.length));
  for (const c of checks) console.log(`${c.name.padEnd(w)} | ${c.value.padEnd(8)} | ${c.pass ? 'PASS' : 'FAIL'}`);
}
