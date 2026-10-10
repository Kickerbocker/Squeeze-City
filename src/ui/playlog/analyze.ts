// Turns a PlayLog into a plain-text report for design analysis. Pure: no DOM, no storage.
// Used by `npm run playlog -- <file>` and by "Copy summary" on the Stats screen.
import type { DayEntry, PlayLog } from './log';

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const median = (xs: number[]) => {
  const v = [...xs].sort((a, b) => a - b);
  if (!v.length) return NaN;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m]! : (v[m - 1]! + v[m]!) / 2;
};
const pct = (n: number, d: number) => (d > 0 ? `${Math.round((100 * n) / d)}%` : '—');
const usd = (x: number) => `${x < 0 ? '-' : ''}$${Math.abs(x).toFixed(2)}`;
const secs = (x: number) => (Number.isNaN(x) ? '—' : x >= 90 ? `${(x / 60).toFixed(1)} min` : `${Math.round(x)} s`);
const clockAt = (minutes: number, openHour = 9) => {
  const h = openHour + Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const CAPITAL = new Set(['buyUpgrade', 'buyGlobalUpgrade', 'buyLicense', 'hire', 'startCampaign']);

/** Longest run of consecutive logged days with nothing bought (capital) and nothing unlocked. */
export function quietStreaks(days: DayEntry[]): { quietDays: number; longest: number } {
  let quiet = 0;
  let run = 0;
  let longest = 0;
  for (const d of days) {
    const busy = d.capitalSpent > 0 || d.unlocked.length > 0 || Object.keys(d.morning.actions).some((k) => CAPITAL.has(k));
    if (busy) run = 0;
    else {
      quiet++;
      run++;
      longest = Math.max(longest, run);
    }
  }
  return { quietDays: quiet, longest };
}

/** Share of days on which each stand's recipe / price differed from its previous logged day. */
export function planChanges(days: DayEntry[]): { recipe: number; price: number; compared: number } {
  const last = new Map<number, { recipe: string; price: number }>();
  let recipe = 0;
  let price = 0;
  let compared = 0;
  for (const d of days) {
    for (const s of d.stands) {
      const prev = last.get(s.id);
      if (prev) {
        compared++;
        if (prev.recipe !== s.recipe) recipe++;
        if (Math.abs(prev.price - s.price) > 1e-9) price++;
      }
      last.set(s.id, { recipe: s.recipe, price: s.price });
    }
  }
  return { recipe, price, compared };
}

export function analyze(log: PlayLog): string {
  const out: string[] = [];
  const line = (s = '') => out.push(s);
  const days = log.days;
  const first = days[0]?.day;
  const lastDay = days.at(-1)?.day;

  line(`# Play log report`);
  line(`seed ${log.seed} · config ${log.configHash} · log v${log.logVersion} · started ${log.createdAt.slice(0, 10)}`);
  line(`days logged: ${days.length}${days.length ? ` (game days ${first}–${lastDay})` : ''}${log.droppedDays ? ` · ${log.droppedDays} older days dropped` : ''}`);
  const sessions = log.sessions.filter((s) => s.activeSec > 0 || s.days > 0);
  line(
    `sessions: ${sessions.length} · days per session: median ${median(sessions.map((s) => s.days))} · active time per session: median ${secs(median(sessions.map((s) => s.activeSec)))} · total ${secs(sessions.reduce((a, s) => a + s.activeSec, 0))}`,
  );
  if (!days.length) {
    line(`\nNo days played yet.`);
    return out.join('\n');
  }

  // --- Time and attention
  line(`\n## Time per day (real time)`);
  line(`planning (morning): median ${secs(median(days.map((d) => d.morning.sec)))} · watching: median ${secs(median(days.map((d) => d.watch.sec)))} · report: median ${secs(median(days.flatMap((d) => (d.reportSec === null ? [] : [d.reportSec]))))}`);
  const skipped = days.filter((d) => d.watch.skippedAt !== null);
  line(`skipped the day: ${skipped.length}/${days.length} (${pct(skipped.length, days.length)})${skipped.length ? ` · median skip at ${clockAt(median(skipped.map((d) => d.watch.skippedAt!)))}` : ''}`);
  const finalSpeed = new Map<number, number>();
  for (const d of days) {
    const s = d.watch.speeds.at(-1) ?? 1;
    finalSpeed.set(s, (finalSpeed.get(s) ?? 0) + 1);
  }
  line(`speed at the end of the day: ${[...finalSpeed].sort((a, b) => a[0] - b[0]).map(([s, n]) => `${s}× ${pct(n, days.length)}`).join(' · ')}`);
  const views = Object.entries(log.viewSec).sort((a, b) => b[1] - a[1]);
  const totalView = views.reduce((a, [, v]) => a + v, 0);
  line(`time by screen: ${views.map(([k, v]) => `${k} ${pct(v, totalView)}`).join(' · ')}`);
  const tabUse = new Map<string, number>();
  for (const d of days) for (const t of d.morning.tabs) tabUse.set(t, (tabUse.get(t) ?? 0) + 1);
  line(`hub tabs opened (share of days): ${[...tabUse].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${pct(n, days.length)}`).join(' · ') || 'none'}`);

  // --- Daily decisions
  line(`\n## Daily decisions`);
  const ch = planChanges(days);
  line(`recipe changed from the day before: ${pct(ch.recipe, ch.compared)} of stand-days · price changed: ${pct(ch.price, ch.compared)}`);
  const recipes = new Set(days.flatMap((d) => d.stands.map((s) => s.recipe)));
  const prices = days.flatMap((d) => d.stands.map((s) => s.price));
  line(`recipes used: ${[...recipes].join(' ')} · prices: ${usd(Math.min(...prices))} to ${usd(Math.max(...prices))}`);
  const hot = days.filter((d) => d.weather.temp >= 80).flatMap((d) => d.stands.map((s) => s.price));
  const cool = days.filter((d) => d.weather.temp < 70).flatMap((d) => d.stands.map((s) => s.price));
  line(`average price on hot days (80°F+): ${hot.length ? usd(mean(hot)) : '—'} · on cool days (<70°F): ${cool.length ? usd(mean(cool)) : '—'}`);
  const idleMornings = days.filter((d) => Object.keys(d.morning.actions).length === 0).length;
  line(`mornings with no action at all: ${idleMornings}/${days.length} (${pct(idleMornings, days.length)})`);
  const stockOnly = days.filter((d) => {
    const k = Object.keys(d.morning.actions);
    return k.length > 0 && k.every((x) => x === 'buy');
  }).length;
  line(`mornings that only bought stock: ${stockOnly}/${days.length} (${pct(stockOnly, days.length)})`);

  // --- Purchases and goals
  line(`\n## Purchases and progress`);
  const buys = log.actions.filter((a) => a.ok && (CAPITAL.has(a.type) || a.type === 'fire'));
  if (buys.length) for (const a of buys) line(`- day ${a.day}: ${a.type} ${a.detail}`);
  else line(`no upgrades, hires, licences or campaigns`);
  const unlocks = days.filter((d) => d.unlocked.length).map((d) => `day ${d.day}: ${d.unlocked.join(', ')}`);
  if (unlocks.length) line(`unlocks: ${unlocks.join(' · ')}`);
  const ms = days.filter((d) => d.milestones.length).map((d) => `day ${d.day}: ${d.milestones.join(', ')}`);
  if (ms.length) line(`milestones: ${ms.join(' · ')}`);
  const q = quietStreaks(days);
  line(`days with nothing bought or unlocked: ${q.quietDays}/${days.length} (${pct(q.quietDays, days.length)}) · longest run: ${q.longest} days`);

  // --- What purchases did (log v2, M10)
  const did = days.flatMap((d) => (d.purchasesDid ?? []).map((x) => ({ ...x, day: d.day })));
  if (did.length) {
    line(`\n## What purchases did (measured each day)`);
    const by = new Map<string, typeof did>();
    for (const x of did) {
      const k = `${x.kind}:${x.item}${x.standId !== null ? ` #${x.standId + 1}` : ''}`;
      by.set(k, [...(by.get(k) ?? []), x]);
    }
    for (const [k, xs] of by) {
      line(`${k}: ${xs.length} days · ${usd(mean(xs.map((x) => x.profit)))}/day on average · count change ${mean(xs.map((x) => x.count)).toFixed(1)}/day${xs.some((x) => x.approx) ? ' (approx.)' : ''}`);
    }
  }
  const mathDays = days.filter((d) => (d.mathOpened ?? 0) > 0).length;
  if (days.some((d) => d.mathOpened !== undefined) || mathDays) line(`"Show the math" opened on ${mathDays}/${days.length} days`);

  // --- Money
  line(`\n## Money`);
  for (let i = 0; i < days.length; i += 7) {
    const wk = days.slice(i, i + 7);
    line(`days ${wk[0]!.day}–${wk.at(-1)!.day}: profit ${usd(mean(wk.map((d) => d.profit)))}/day · cash ${usd(wk.at(-1)!.cashEnd)} · net worth ${usd(wk.at(-1)!.netWorth)}`);
  }
  const best = days.reduce((a, b) => (b.profit > a.profit ? b : a));
  const worst = days.reduce((a, b) => (b.profit < a.profit ? b : a));
  line(`best day ${best.day}: ${usd(best.profit)} (${best.weather.cond}, ${best.weather.temp}°F) · worst day ${worst.day}: ${usd(worst.profit)} (${worst.weather.cond}, ${worst.weather.temp}°F)`);
  const lossDays = days.filter((d) => d.profit < 0).length;
  line(`days at a loss: ${lossDays}/${days.length}`);

  // --- Customers by location
  line(`\n## Customers by location (averages per day)`);
  const byLoc = new Map<string, DayEntry['stands']>();
  for (const d of days) for (const s of d.stands) byLoc.set(s.loc, [...(byLoc.get(s.loc) ?? []), s]);
  for (const [loc, ss] of byLoc) {
    const stop = ss.reduce((a, s) => a + s.stoppers, 0);
    line(
      `${loc} (${ss.length} days): ${Math.round(mean(ss.map((s) => s.passersby)))} passed · ${Math.round(mean(ss.map((s) => s.stoppers)))} stopped · ${Math.round(mean(ss.map((s) => s.buyers)))} bought · of those who stopped: ${pct(ss.reduce((a, s) => a + s.lostQueue, 0), stop)} left the line, ${pct(ss.reduce((a, s) => a + s.lostSoldOut, 0), stop)} sold out, ${pct(ss.reduce((a, s) => a + s.tooExpensive, 0), stop)} too expensive · satisfaction ${mean(ss.map((s) => s.avgSat)).toFixed(2)} · rep ${ss[0]!.repBefore.toFixed(0)} → ${ss.at(-1)!.repAfter.toFixed(0)}`,
    );
  }
  const complaints = new Map<string, number>();
  for (const d of days) for (const s of d.stands) for (const [k, n] of Object.entries(s.complaints)) complaints.set(k, (complaints.get(k) ?? 0) + n);
  line(`complaints: ${[...complaints].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ') || 'none'}`);

  // --- Stock and weather
  line(`\n## Stock and weather`);
  const soldOutDays = days.filter((d) => d.stands.some((s) => s.soldOutAt !== null)).length;
  line(`days a stand sold out: ${soldOutDays}/${days.length} · lemons spoiled: ${days.reduce((a, d) => a + d.spoiledLemons, 0)} · spoilage cost: ${usd(days.reduce((a, d) => a + (d.costs.spoilage ?? 0), 0))}`);
  const right = days.filter((d) => d.forecast.cond === d.weather.cond).length;
  line(`forecast condition right: ${right}/${days.length} (${pct(right, days.length)})`);

  // --- Friction
  const failed = log.actions.filter((a) => !a.ok);
  if (failed.length) {
    line(`\n## Refused actions (possible confusion)`);
    const byErr = new Map<string, number>();
    for (const a of failed) byErr.set(`${a.type}: ${a.error ?? '?'}`, (byErr.get(`${a.type}: ${a.error ?? '?'}`) ?? 0) + 1);
    for (const [k, n] of [...byErr].sort((a, b) => b[1] - a[1])) line(`- ${k} ×${n}`);
  }
  if (Object.keys(log.counters).length) {
    line(`\n## Counters`);
    line(Object.entries(log.counters).map(([k, n]) => `${k} ${n}`).join(' · '));
  }
  return out.join('\n');
}
