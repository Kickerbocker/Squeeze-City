// Decision audit: do the player's choices and purchases actually matter?
// `npm run balance` checks pacing (how fast money grows). This checks the other half:
// whether playing well beats playing lazily, and whether each thing you can buy pays for itself.
// Usage: npm run audit [-- --loc maple --seeds 20 --days 28]
import { CAMPAIGNS, CONFIG, LOCATION_IDS, STAFF_ROLES, type GameConfig, type LocationId } from '../src/config';
import { newGame, runDay, type DayPlan, type DayReport, type GameState } from '../src/sim';
import { runBot } from './balance';
import { type BotMemory, botMorning } from './bots';

// Thresholds are proposals (docs/learning/UNKNOWNS.md U1). Change them here, and log why in LESSONS.md.
const T = {
  /** Never touching recipe or price should earn at most this share of Sensible's profit. */
  lazyMaxShare: 0.85,
  /** An upgrade that takes longer than this to pay for itself reads as "not worth buying". */
  paybackMaxDays: 30,
  /** At most this share of days may pass with nothing bought and nothing unlocked. */
  idleMaxShare: 0.6,
  /** Longest acceptable run of such days. */
  gapMaxDays: 10,
  /** Cash for probe runs, so stock is never cash-limited. Probes compare profit, not cash. */
  probeCash: 500,
  staffSkill: 2,
  pacingDays: 120,
};

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? NaN;
const money = (x: number): string => `${x < 0 ? '-' : '+'}$${Math.abs(x).toFixed(2)}`;

interface Probe {
  profit: number;
  stoppers: number;
  lostQueue: number;
  lostSoldOut: number;
  tooExpensive: number;
  recipes: Set<string>;
  prices: number[];
}

interface ProbeOptions {
  /** Applied once to a fresh game. */
  setup?: (s: GameState) => void;
  /** Applied each morning before the bot decides. */
  daily?: (s: GameState, dayIndex: number) => void;
  /** Overrides the bot's plan (to model a player who doesn't adjust). */
  override?: (plan: DayPlan, s: GameState) => void;
}

/** Sensible, non-expanding play with one stand at `loc`. */
function probe(loc: LocationId, seeds: number, days: number, cfg: GameConfig, o: ProbeOptions = {}): Probe {
  const profits: number[] = [];
  const out: Probe = { profit: 0, stoppers: 0, lostQueue: 0, lostSoldOut: 0, tooExpensive: 0, recipes: new Set(), prices: [] };
  for (let seed = 1; seed <= seeds; seed++) {
    let s = newGame(cfg, seed);
    s.cash = T.probeCash;
    s.locations[loc].unlocked = true;
    s.stands[0]!.locationId = loc;
    o.setup?.(s);
    const mem: BotMemory = { lastReport: null };
    for (let d = 0; d < days; d++) {
      o.daily?.(s, d);
      const m = botMorning(s, mem, { name: 'probe', expand: false }, cfg);
      o.override?.(m.plan, m.state);
      const sp = m.plan.stands?.[m.state.stands[0]!.id];
      if (sp?.recipe) out.recipes.add(`${sp.recipe.lemons}/${sp.recipe.sugar}/${sp.recipe.ice}`);
      if (sp?.price !== undefined) out.prices.push(sp.price);
      const r = runDay(m.state, m.plan, cfg);
      mem.lastReport = r.report;
      s = r.state;
      s.cash = Math.max(s.cash, T.probeCash);
      profits.push(r.report.profit);
      for (const x of r.report.stands) {
        out.stoppers += x.stoppers;
        out.lostQueue += x.lostQueue;
        out.lostSoldOut += x.lostSoldOut;
        out.tooExpensive += x.tooExpensive;
      }
    }
  }
  out.profit = mean(profits);
  return out;
}

interface Check {
  name: string;
  value: string;
  pass: boolean;
}

export function audit(loc: LocationId, seeds: number, days: number, cfg: GameConfig = CONFIG): Check[] {
  const checks: Check[] = [];
  const locName = cfg.locations.locations.find((l) => l.id === loc)!.name;
  const base = probe(loc, seeds, days, cfg);
  const pct = (n: number) => `${((100 * n) / Math.max(1, base.stoppers)).toFixed(1)}%`;
  console.log(`\nBASELINE  one stand at ${locName}, Sensible play, ${seeds} seeds x ${days} days`);
  console.log(`  profit ${money(base.profit)}/day | of those who stop: ${pct(base.lostQueue)} leave the line, ${pct(base.lostSoldOut)} find it sold out, ${pct(base.tooExpensive)} say too expensive`);

  // 1. Do the daily decisions matter?
  const sorted = [...base.prices].sort((a, b) => a - b);
  const typical = sorted[Math.floor(sorted.length / 2)] ?? cfg.recipe.defaults.price;
  const d = cfg.recipe.defaults;
  const defaultRecipe = { lemons: d.lemons, sugar: d.sugar, ice: d.ice };
  const fixRecipe = probe(loc, seeds, days, cfg, { override: (p, s) => void (p.stands![s.stands[0]!.id]!.recipe = defaultRecipe) });
  const lazy = probe(loc, seeds, days, cfg, {
    override: (p, s) => void (p.stands![s.stands[0]!.id] = { recipe: defaultRecipe, price: typical }),
  });
  console.log(`\nDAILY DECISIONS`);
  console.log(`  recipes Sensible used: ${[...base.recipes].sort().join(' ')}`);
  console.log(`  prices Sensible used: $${sorted[0]?.toFixed(2)} to $${sorted[sorted.length - 1]?.toFixed(2)} (typical $${typical.toFixed(2)})`);
  console.log(`  never change the recipe:          ${((100 * fixRecipe.profit) / base.profit).toFixed(0)}% of Sensible's profit`);
  console.log(`  never change recipe or price:     ${((100 * lazy.profit) / base.profit).toFixed(0)}% of Sensible's profit`);
  checks.push({
    name: `Lazy play earns at most ${T.lazyMaxShare * 100}% of Sensible`,
    value: `${((100 * lazy.profit) / base.profit).toFixed(0)}%`,
    pass: lazy.profit <= base.profit * T.lazyMaxShare,
  });

  // 2. Does each purchase pay for itself?
  console.log(`\nUPGRADES  (given free on day 1; payback = cost / extra profit per day)`);
  const u = cfg.upgrades;
  const ups: [string, number, (s: GameState) => void][] = [
    [u.body.tiers[1]!.name, u.body.tiers[1]!.cost, (s) => void (s.stands[0]!.upgrades.body = 1)],
    [u.juicer.tiers[1]!.name, u.juicer.tiers[1]!.cost, (s) => void (s.stands[0]!.upgrades.juicer = 1)],
    [u.register.tiers[1]!.name, u.register.tiers[1]!.cost, (s) => void (s.stands[0]!.upgrades.register = 1)],
    [u.cooler.name, u.cooler.cost, (s) => void (s.stands[0]!.upgrades.cooler = true)],
    [u.umbrella.name, u.umbrella.cost, (s) => void (s.stands[0]!.upgrades.umbrella = true)],
    [u.neon.name, u.neon.cost, (s) => void (s.stands[0]!.upgrades.neon = true)],
    [u.speaker.name, u.speaker.cost, (s) => void (s.stands[0]!.upgrades.speaker = true)],
    [u.fridge.name, u.fridge.cost, (s) => void (s.globalUpgrades.fridge = true)],
    [u.radio.name, u.radio.cost, (s) => void (s.globalUpgrades.radio = true)],
  ];
  let worthIt = 0;
  for (const [name, cost, setup] of ups) {
    const delta = probe(loc, seeds, days, cfg, { setup }).profit - base.profit;
    const payback = delta > 0.005 ? cost / delta : Infinity;
    if (payback <= T.paybackMaxDays) worthIt++;
    console.log(`  ${name.padEnd(14)} $${String(cost).padStart(5)}  ${money(delta).padStart(8)}/day  payback ${Number.isFinite(payback) ? `${payback.toFixed(0)} days` : 'never'}`);
  }
  checks.push({ name: `At least half of upgrades pay back within ${T.paybackMaxDays} days`, value: `${worthIt}/${ups.length}`, pass: worthIt * 2 >= ups.length });

  console.log(`\nSTAFF  (skill ${T.staffSkill}, wage paid daily)`);
  let staffPays = 0;
  for (const role of STAFF_ROLES) {
    const r = cfg.staff.roles[role];
    const net =
      probe(loc, seeds, days, cfg, { setup: (s) => void s.stands[0]!.staff.push({ id: 'audit', name: 'Audit', role, skill: T.staffSkill, daysWorked: 0 }) }).profit -
      base.profit;
    if (net >= 0) staffPays++;
    console.log(`  ${r.name.padEnd(9)} wage $${r.baseWage + r.wagePerSkill * T.staffSkill}/day  net ${money(net)}/day`);
  }
  checks.push({ name: 'At least one staff role earns its wage', value: `${staffPays}/${STAFF_ROLES.length}`, pass: staffPays > 0 });

  console.log(`\nMARKETING  (bought again the day it runs out)`);
  let adsPay = 0;
  for (const id of CAMPAIGNS) {
    const c = cfg.marketing.campaigns[id];
    const gross =
      probe(loc, seeds, days, cfg, {
        daily: (s, i) => {
          if (i % c.days === 0) s.campaigns.push({ id, startDay: s.day, ...(c.scope === 'location' ? { locationId: loc } : {}) });
        },
      }).profit - base.profit;
    const perDay = c.cost / c.days;
    if (gross - perDay >= 0) adsPay++;
    console.log(`  ${c.name.padEnd(9)} costs $${perDay.toFixed(2)}/day  brings in ${money(gross)}/day  net ${money(gross - perDay)}/day`);
  }
  checks.push({ name: 'At least one campaign earns its cost', value: `${adsPay}/${CAMPAIGNS.length}`, pass: adsPay > 0 });

  // 3. Is there something to do most days?
  const runs = Array.from({ length: seeds }, (_, i) => runBot(i + 1, T.pacingDays, { name: 'Sensible', expand: true }, cfg));
  const idle: number[] = [];
  const longest: number[] = [];
  const perLoc = new Map<LocationId, number[]>();
  for (const r of runs) {
    let last = 0;
    let quiet = 0;
    let gap = 0;
    for (const rep of r.reports as DayReport[]) {
      if (rep.capitalSpent > 0 || rep.unlocked.length > 0) {
        gap = Math.max(gap, rep.day - last);
        last = rep.day;
      } else quiet++;
      for (const x of rep.stands) perLoc.set(x.locationId, [...(perLoc.get(x.locationId) ?? []), x.revenue - x.ingredients - x.rent - x.wages]);
    }
    idle.push(quiet / r.reports.length);
    longest.push(Math.max(gap, T.pacingDays - last));
  }
  console.log(`\nPACING  full Sensible bot, ${seeds} seeds x ${T.pacingDays} days`);
  console.log(`  days with nothing bought and nothing unlocked: ${(100 * mean(idle)).toFixed(0)}% | longest such run: median ${median(longest)} days`);
  console.log(`  stand profit per day by location (after rent and wages):`);
  for (const id of LOCATION_IDS) {
    const v = perLoc.get(id);
    if (v) console.log(`    ${cfg.locations.locations.find((l) => l.id === id)!.name.padEnd(20)} $${mean(v).toFixed(0)}`);
  }
  checks.push({ name: `At most ${T.idleMaxShare * 100}% of days have nothing to buy or unlock`, value: `${(100 * mean(idle)).toFixed(0)}%`, pass: mean(idle) <= T.idleMaxShare });
  checks.push({ name: `Longest quiet run is at most ${T.gapMaxDays} days`, value: `median ${median(longest)} days`, pass: median(longest) <= T.gapMaxDays });
  return checks;
}

const isMain = process.argv[1]?.endsWith('audit.ts');
if (isMain) {
  const arg = (name: string, dflt: string) => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1]! : dflt;
  };
  const loc = arg('loc', 'maple') as LocationId;
  if (!LOCATION_IDS.includes(loc)) throw new Error(`Unknown location "${loc}". Use one of: ${LOCATION_IDS.join(', ')}`);
  const checks = audit(loc, Number(arg('seeds', '20')), Number(arg('days', '28')));
  const w = Math.max(...checks.map((c) => c.name.length));
  console.log(`\n${'Check'.padEnd(w)} | Value            | Result`);
  for (const c of checks) console.log(`${c.name.padEnd(w)} | ${c.value.padEnd(16)} | ${c.pass ? 'PASS' : 'FAIL'}`);
  console.log(`\n${checks.filter((c) => c.pass).length}/${checks.length} checks pass.`);
}
