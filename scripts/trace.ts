// Day-by-day trace of one bot run, for balance debugging.  npx tsx scripts/trace.ts [seed] [days] [fixedPrice]
import { CONFIG } from '../src/config';
import { newGame, runDay } from '../src/sim';
import { netWorth } from '../src/sim/game';
import { botMorning, type BotMemory } from './bots';

const seed = Number(process.argv[2] ?? 1);
const days = Number(process.argv[3] ?? 60);
const fixed = process.argv[4] ? Number(process.argv[4]) : undefined;
let s = newGame(CONFIG, seed);
const mem: BotMemory = { lastReport: null };
for (let d = 0; d < days; d++) {
  const m = botMorning(s, mem, { name: 'trace', expand: true, ...(fixed ? { fixedPrice: fixed } : {}) }, CONFIG);
  const r = runDay(m.state, m.plan, CONFIG);
  const rp = r.report;
  const stands = rp.stands
    .map((x) => {
      const st = m.state.stands.find((y) => y.id === x.standId)!;
      const pl = m.plan.stands?.[x.standId];
      return `${x.locationId}:$${pl?.price?.toFixed(2)} r${pl?.recipe?.lemons}/${pl?.recipe?.sugar}/${pl?.recipe?.ice} pass${x.passersby} stop${x.stoppers} buy${x.buyers} exp${x.tooExpensive} q${x.lostQueue} so${x.lostSoldOut} rep${x.repAfter.toFixed(0)} sat${x.avgSat.toFixed(2)} staff${st.staff.length}`;
    })
    .join(' | ');
  console.log(
    `d${rp.day} ${rp.season.slice(0, 2)} ${rp.weather.condition.padEnd(12)} ${rp.weather.dayTemp.toFixed(0)}F rev${rp.revenue.toFixed(0)} profit${rp.profit.toFixed(0)} cash${rp.cashEnd.toFixed(0)} nw${netWorth(r.state).toFixed(0)} cap${rp.capitalSpent} ${stands}`,
  );
  mem.lastReport = rp;
  s = r.state;
}
