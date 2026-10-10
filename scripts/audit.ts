// Decision audit: do the player's choices and purchases actually matter?
// `npm run balance` checks pacing (how fast money grows). This checks the other half:
// whether playing well beats playing lazily, and whether each thing you can buy pays for itself.
// Usage: npm run audit [-- --loc maple --seeds 20 --days 28]
// Version 2 (M9): purchase checks judged across the first five locations, plus the Never-buys and Skimper bots.
import { CAMPAIGNS, type CampaignId, CONFIG, type GameConfig, type GlobalUpgrade, LOCATION_IDS, type LocationId, type StandUpgrade } from '../src/config';
import { newGame, projectPurchase, runDay, type DayPlan, type DayReport, type GameState } from '../src/sim';
import { forSale, rolesForHire } from '../src/sim/stand';
import { runBot } from './balance';
import { type BotMemory, type BotOptions, botMorning } from './bots';

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
  // Audit v2 (M9, docs/specs/M9-worth-buying.md)
  /** Purchases are judged at the first five locations. */
  earlyLocations: ['maple', 'uptown', 'campus', 'boardwalk', 'financial'] as LocationId[],
  /** At least this many items for sale must pay back within paybackMaxDays at Maple Park. */
  mapleMinPaybacks: 3,
  /** Long enough for every bot to reach Campus Quad. */
  unlockDays: 90,
  /** A Skimper gap below this means under-buying is not punished. Reported, not a check. */
  skimperMinGap: 0.1,
  // M10 (docs/specs/M10-show-what-it-did.md)
  /** A projection's median may be off from the average measured effect by at most this share. */
  projectionMaxError: 0.25,
  projectionLocations: ['maple', 'financial'] as LocationId[],
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

const campaignDaily = (id: CampaignId, loc: LocationId, cfg: GameConfig) => (s: GameState, i: number) => {
  const c = cfg.marketing.campaigns[id];
  if (i % c.days === 0) s.campaigns.push({ id, startDay: s.day, ...(c.scope === 'location' ? { locationId: loc } : {}) });
};

interface PurchaseMatrix {
  /** One-off and first-tier upgrades for sale: payback in days at each early location. */
  upgrades: { name: string; cost: number; payback: number[] }[];
  /** Things paid for every day (staff for hire, Flyers): net profit per day at each early location. */
  daily: { name: string; kind: 'staff' | 'flyers'; net: number[] }[];
}

function purchaseMatrix(seeds: number, days: number, cfg: GameConfig): PurchaseMatrix {
  const u = cfg.upgrades;
  const all: [StandUpgrade | GlobalUpgrade, string, number, (s: GameState) => void][] = [
    ['body', u.body.tiers[1]!.name, u.body.tiers[1]!.cost, (s) => void (s.stands[0]!.upgrades.body = 1)],
    ['juicer', u.juicer.tiers[1]!.name, u.juicer.tiers[1]!.cost, (s) => void (s.stands[0]!.upgrades.juicer = 1)],
    ['register', u.register.tiers[1]!.name, u.register.tiers[1]!.cost, (s) => void (s.stands[0]!.upgrades.register = 1)],
    ['cooler', u.cooler.name, u.cooler.cost, (s) => void (s.stands[0]!.upgrades.cooler = true)],
    ['umbrella', u.umbrella.name, u.umbrella.cost, (s) => void (s.stands[0]!.upgrades.umbrella = true)],
    ['neon', u.neon.name, u.neon.cost, (s) => void (s.stands[0]!.upgrades.neon = true)],
    ['speaker', u.speaker.name, u.speaker.cost, (s) => void (s.stands[0]!.upgrades.speaker = true)],
    ['fridge', u.fridge.name, u.fridge.cost, (s) => void (s.globalUpgrades.fridge = true)],
    ['radio', u.radio.name, u.radio.cost, (s) => void (s.globalUpgrades.radio = true)],
  ];
  const ups = all.filter(([id]) => forSale(id, cfg));
  const out: PurchaseMatrix = {
    upgrades: ups.map(([, name, cost]) => ({ name, cost, payback: [] })),
    daily: [
      ...rolesForHire(cfg).map((role) => ({ name: `${cfg.staff.roles[role].name} (skill ${T.staffSkill})`, kind: 'staff' as const, net: [] as number[] })),
      { name: cfg.marketing.campaigns.flyers.name, kind: 'flyers', net: [] },
    ],
  };
  for (const loc of T.earlyLocations) {
    const base = probe(loc, seeds, days, cfg).profit;
    ups.forEach(([, , cost, setup], i) => {
      const delta = probe(loc, seeds, days, cfg, { setup }).profit - base;
      out.upgrades[i]!.payback.push(delta > 0.005 ? cost / delta : Infinity);
    });
    rolesForHire(cfg).forEach((role, i) => {
      const staffed = probe(loc, seeds, days, cfg, {
        setup: (s) => void s.stands[0]!.staff.push({ id: 'audit', name: 'Audit', role, skill: T.staffSkill, daysWorked: 0 }),
      }).profit;
      out.daily[i]!.net.push(staffed - base);
    });
    const f = cfg.marketing.campaigns.flyers;
    const gross = probe(loc, seeds, days, cfg, { daily: campaignDaily('flyers', loc, cfg) }).profit - base;
    out.daily[out.daily.length - 1]!.net.push(gross - f.cost / f.days);
  }
  return out;
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

  // 2. Does each purchase pay for itself? (audit v2, M9)
  const paybacks = purchaseMatrix(seeds, days, cfg);
  const names = cfg.locations.locations.filter((l) => T.earlyLocations.includes(l.id)).map((l) => l.name.split(' ')[0]!);
  console.log(`\nPURCHASES  items for sale, payback in days (given free on day 1; payback = cost / extra profit per day)`);
  console.log(`  ${''.padEnd(14)} ${'cost'.padStart(6)}  ${names.map((n) => n.padStart(9)).join(' ')}`);
  for (const row of paybacks.upgrades) {
    const cells = row.payback.map((p) => (Number.isFinite(p) ? `${p.toFixed(0)}` : 'never').padStart(9)).join(' ');
    console.log(`  ${row.name.padEnd(14)} ${`$${row.cost}`.padStart(6)}  ${cells}`);
  }
  console.log(`  net per day after cost:`);
  for (const row of paybacks.daily) {
    console.log(`  ${row.name.padEnd(21)}  ${row.net.map((n) => money(n).padStart(9)).join(' ')}`);
  }
  const at = (id: LocationId) => T.earlyLocations.indexOf(id);
  const mapleWorth = paybacks.upgrades.filter((r) => r.payback[at('maple')]! <= T.paybackMaxDays);
  checks.push({
    name: `Maple Park: at least ${T.mapleMinPaybacks} items pay back within ${T.paybackMaxDays} days`,
    value: `${mapleWorth.length}/${paybacks.upgrades.length}`,
    pass: mapleWorth.length >= T.mapleMinPaybacks,
  });
  const nowhere = paybacks.upgrades.filter((r) => !r.payback.some((p) => p <= T.paybackMaxDays));
  checks.push({
    name: `Every item pays back within ${T.paybackMaxDays} days somewhere in the first five`,
    value: nowhere.length ? `not: ${nowhere.map((r) => r.name).join(', ')}` : `${paybacks.upgrades.length}/${paybacks.upgrades.length}`,
    pass: nowhere.length === 0,
  });
  const finStaff = paybacks.daily.filter((r) => r.kind === 'staff' && r.net[at('financial')]! >= 0);
  checks.push({
    name: 'Financial District: a staff role earns its wage',
    value: `${finStaff.length}/${paybacks.daily.filter((r) => r.kind === 'staff').length}`,
    pass: finStaff.length > 0,
  });
  const flyers = paybacks.daily.find((r) => r.kind === 'flyers')!.net[at('maple')]!;
  checks.push({ name: 'Maple Park: Flyers earn their cost', value: `${money(flyers)}/day`, pass: flyers >= 0 });

  console.log(`\nMARKETING at ${locName}  (bought again the day it runs out)`);
  for (const id of CAMPAIGNS) {
    const c = cfg.marketing.campaigns[id];
    const gross = probe(loc, seeds, days, cfg, { daily: campaignDaily(id, loc, cfg) }).profit - base.profit;
    const perDay = c.cost / c.days;
    console.log(`  ${c.name.padEnd(9)} costs $${perDay.toFixed(2)}/day  brings in ${money(gross)}/day  net ${money(gross - perDay)}/day`);
  }

  // Spending must never delay progress, and under-buying stock should cost something.
  const unlockDay = (opts: BotOptions) =>
    median(
      Array.from({ length: seeds }, (_, i) => {
        const r = runBot(i + 1, T.unlockDays, opts, cfg);
        const d = r.campusUnlockDay;
        return d ?? Infinity;
      }),
    );
  const sensibleUnlock = unlockDay({ name: 'Sensible', expand: true });
  const neverUnlock = unlockDay({ name: 'Never-buys', expand: true, buysImprovements: false });
  const fmtDay = (d: number) => (Number.isFinite(d) ? `day ${d}` : 'never');
  console.log(`\nPROGRESS  Campus Quad unlock, median of ${seeds} seeds: Sensible ${fmtDay(sensibleUnlock)}, Never-buys ${fmtDay(neverUnlock)}`);
  checks.push({
    name: 'Never-buys does not unlock Campus Quad sooner',
    value: `${fmtDay(neverUnlock)} vs ${fmtDay(sensibleUnlock)}`,
    pass: neverUnlock >= sensibleUnlock,
  });
  const profit28 = (opts: BotOptions) =>
    mean(Array.from({ length: seeds }, (_, i) => runBot(i + 1, days, opts, cfg).reports.reduce((a, r) => a + r.profit, 0)));
  const sensible28 = profit28({ name: 'Sensible', expand: true });
  const skimper28 = profit28({ name: 'Skimper', expand: true, stockShare: 0.5 });
  const gap = 1 - skimper28 / sensible28;
  console.log(
    `STOCK     Skimper (buys half the stock it expects to need) earns ${(100 * gap).toFixed(0)}% less than Sensible over ${days} days` +
      ` ($${skimper28.toFixed(0)} vs $${sensible28.toFixed(0)})` +
      (gap < T.skimperMinGap ? ' — under-buying is barely punished; log in docs/learning/UNKNOWNS.md' : ''),
  );

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
  // M10: does the purchase card's projection match what the item actually does?
  const accuracy = projectionAccuracy(seeds, days, cfg);
  console.log(`\nPROJECTIONS  median projection vs average measured effect, ${seeds} seeds x ${days} days`);
  for (const a of accuracy) {
    console.log(`  ${a.name.padEnd(11)} ${a.locName.padEnd(19)} projected ${money(a.projected)}/day  measured ${money(a.measured)}/day  off by ${(100 * a.error).toFixed(0)}%`);
  }
  const off = accuracy.filter((a) => a.error > T.projectionMaxError);
  checks.push({
    name: `Projections within ${T.projectionMaxError * 100}% of measured effect`,
    value: off.length ? `not: ${off.map((a) => `${a.name} @${a.loc}`).join(', ')}` : `${accuracy.length}/${accuracy.length}`,
    pass: off.length === 0,
  });
  return checks;
}

/**
 * For each item and location: each morning, project buying it (from a copy without it) and
 * measure what owning it did that day (replay without it). Compare the averages.
 */
function projectionAccuracy(seeds: number, days: number, cfg: GameConfig) {
  const items: [string, StandUpgrade, (s: GameState) => void][] = [
    [cfg.upgrades.body.tiers[1]!.name, 'body', (s) => void (s.stands[0]!.upgrades.body = 0)],
    [cfg.upgrades.neon.name, 'neon', (s) => void (s.stands[0]!.upgrades.neon = false)],
    [cfg.upgrades.register.tiers[1]!.name, 'register', (s) => void (s.stands[0]!.upgrades.register = 0)],
  ];
  const own: Record<string, (s: GameState) => void> = {
    body: (s) => void (s.stands[0]!.upgrades.body = 1),
    neon: (s) => void (s.stands[0]!.upgrades.neon = true),
    register: (s) => void (s.stands[0]!.upgrades.register = 1),
  };
  const out: { name: string; loc: LocationId; locName: string; projected: number; measured: number; error: number }[] = [];
  for (const loc of T.projectionLocations) {
    for (const [name, upgrade, remove] of items) {
      const proj: number[] = [];
      const meas: number[] = [];
      for (let seed = 1; seed <= seeds; seed++) {
        let s = newGame(cfg, seed);
        s.cash = T.probeCash;
        s.locations[loc].unlocked = true;
        s.stands[0]!.locationId = loc;
        own[upgrade]!(s);
        const mem: BotMemory = { lastReport: null };
        for (let d = 0; d < days; d++) {
          const m = botMorning(s, mem, { name: 'probe', expand: false }, cfg);
          const planned = structuredClone(m.state);
          const sp = m.plan.stands?.[0];
          if (sp?.recipe) planned.stands[0]!.recipe = sp.recipe;
          if (sp?.price !== undefined) planned.stands[0]!.price = sp.price;
          const without = structuredClone(planned);
          remove(without);
          const p = projectPurchase(without, { type: 'buyUpgrade', standId: 0, upgrade }, cfg);
          if (p.kind === 'gain') proj.push(p.median);
          const r = runDay(m.state, m.plan, cfg);
          const rw = structuredClone(m.state);
          remove(rw);
          meas.push(r.report.profit - runDay(rw, m.plan, cfg).report.profit);
          mem.lastReport = r.report;
          s = r.state;
          s.cash = Math.max(s.cash, T.probeCash);
        }
      }
      const projected = mean(proj);
      const measured = mean(meas);
      out.push({ name, loc, locName: cfg.locations.locations.find((l) => l.id === loc)!.name, projected, measured, error: Math.abs(projected - measured) / Math.max(Math.abs(measured), 0.01) });
    }
  }
  return out;
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
