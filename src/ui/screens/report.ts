import { CONFIG } from '../../config';
import type { AttributionLine, Bubble, DayReport, GameState, StandReport } from '../../sim';
import type { App } from '../app';
import { barChart } from '../charts';
import { h, mount, toastSequence } from '../dom';
import { BUBBLES, CONDITION_ICON, locName, milestoneText, money, temp } from '../text';

const signed = (x: number) => `${x < 0 ? '−' : '+'}${money(Math.abs(x))}`;

function itemName(l: AttributionLine, s: GameState): string {
  const U = CONFIG.upgrades;
  switch (l.kind) {
    case 'upgrade': {
      if (l.item === 'body' || l.item === 'juicer' || l.item === 'register') {
        const p = l.purchase !== undefined ? s.purchases[l.purchase] : undefined;
        return U[l.item].tiers[p?.tier ?? 1]?.name ?? U[l.item].name;
      }
      return U[l.item as 'neon'].name;
    }
    case 'staff':
      return `${l.name}, ${CONFIG.staff.roles[l.item as 'server'].name}`;
    case 'campaign':
      return CONFIG.marketing.campaigns[l.item as 'flyers'].name;
    case 'forecast':
      return U.radio.name;
  }
}

function countText(l: AttributionLine): string {
  const n = Math.abs(l.count);
  const people = n === 1 ? 'person' : 'people';
  switch (l.measure) {
    case 'none':
      return '';
    case 'stopped':
      if (n === 0) return 'No more people stopped';
      return `${l.approx ? 'About ' : ''}${n} ${l.count > 0 ? 'more' : 'fewer'} ${people} stopped`;
    case 'leftLine':
      if (n === 0) return 'Nobody would have left the line without it';
      return `${n} ${l.count > 0 ? 'fewer' : 'more'} ${people} left the line`;
    case 'served':
      if (n === 0) return 'No more cups sold';
      return `${n} ${l.count > 0 ? 'more' : 'fewer'} cups sold`;
  }
}

const hasCovered = (s: GameState) => s.purchases.some((p) => !p.replaced && p.paidOffDay === undefined) || s.stands.some((st) => st.staff.length > 0) || s.campaigns.length > 0;

/** M10: "What your purchases did today", grouped by stand, largest effect first. */
function purchasesCard(lines: AttributionLine[], r: DayReport, s: GameState): HTMLElement | null {
  if (!lines.length) return null;
  const wet = r.weather.condition === 'rain' || r.weather.condition === 'storm';
  const groups = new Map<number | null, AttributionLine[]>();
  for (const l of lines) groups.set(l.standId, [...(groups.get(l.standId) ?? []), l]);
  const multi = r.stands.length > 1 || groups.size > 1;
  const rowFor = (l: AttributionLine) => {
    if (l.kind === 'forecast') {
      return h('div', { class: 'did-row' }, h('div', { class: 'row spread' }, h('strong', null, itemName(l, s)), h('span', { class: 'small' }, `Forecast right ${l.forecast!.right} of the last ${l.forecast!.of} days`)));
    }
    const after = l.kind === 'staff' ? ' after wages' : l.kind === 'campaign' ? ' after cost' : '';
    const p = l.purchase !== undefined ? s.purchases[l.purchase] : undefined;
    const paidToday = p?.paidOffDay === r.day;
    return h(
      'div',
      { class: 'did-row' },
      h(
        'div',
        { class: 'row spread' },
        h('strong', null, itemName(l, s)),
        h('span', { class: `small ${l.profit < 0 ? 'bad' : 'good'}` }, `${l.approx ? 'about ' : ''}${signed(l.profit)} today${after}`),
      ),
      countText(l) ? h('div', { class: 'small muted' }, countText(l)) : null,
      p && !paidToday
        ? h(
            'div',
            { class: 'progress', title: 'Earned back' },
            h('div', { style: `width:${Math.max(0, Math.min(100, (p.earnedBack / Math.max(0.01, p.cost)) * 100))}%` }),
            h('span', null, `${money(Math.max(0, p.earnedBack), false)} of ${money(p.cost, false)} earned back`),
          )
        : null,
      paidToday ? h('div', { class: 'small good' }, `Paid off in ${p!.paidOffDay! - p!.day + 1} days ✓`) : null,
      wet && l.profit < 0 ? h('div', { class: 'small muted' }, 'Rain kept people home.') : null,
    );
  };
  const blocks: HTMLElement[] = [];
  const keys = [...groups.keys()].sort((a, b) => (a === null ? 1 : b === null ? -1 : a - b));
  for (const k of keys) {
    const ls = groups.get(k)!.sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit)).slice(0, CONFIG.feedback.reportLinesPerStand);
    const sr = r.stands.find((x) => x.standId === k);
    if (multi) blocks.push(h('h4', null, k === null ? 'Whole business' : `Stand #${k + 1}${sr ? ` · ${locName(sr.locationId)}` : ''}`));
    blocks.push(...ls.map(rowFor));
  }
  return h('section', { class: 'card did' }, h('h3', null, 'What your purchases did today'), ...blocks);
}

export function renderReport(app: App): void {
  const r = app.lastDay!.report;
  const c = r.costs;
  const line = (label: string, v: number, cls = '') => h('div', { class: `ledger-row ${cls}` }, h('span', null, label), h('span', null, money(v)));
  const forecastRight = r.forecast.condition === r.weather.condition;

  mount(
    app.root,
    h(
      'div',
      { class: 'report' },
      h(
        'header',
        { class: 'report-head' },
        h('span', { class: 'muted small' }, `Day ${r.day} · ${CONFIG.calendar.seasonNames[r.season]}`),
        h('h1', { class: r.profit >= 0 ? 'good' : 'bad' }, `${r.profit >= 0 ? 'Profit' : 'Loss'} ${money(r.profit)}`),
        h(
          'p',
          { class: 'small' },
          `${CONDITION_ICON[r.weather.condition]} ${CONFIG.weather.conditionNames[r.weather.condition]}, ${temp(r.weather.dayTemp)} `,
          h('span', { class: 'muted' }, `(forecast ${CONDITION_ICON[r.forecast.condition]} ${temp(r.forecast.temp)}${forecastRight ? '' : ' — wrong!'})`),
        ),
      ),
      h(
        'main',
        { class: 'scroll stack' },
        r.milestones.length || r.unlocked.length
          ? h(
              'section',
              { class: 'card celebrate' },
              h('h3', null, '🎉 Milestones'),
              ...r.milestones.map((m) => h('div', null, `${milestoneText(m.id)}${m.bonus ? ` — bonus ${money(m.bonus, false)}` : ''}`)),
            )
          : null,
        h(
          'section',
          { class: 'card' },
          h('h3', null, 'Money'),
          line('Revenue', r.revenue, 'good'),
          line('Ingredients used', -c.ingredients),
          c.rent ? line('Rent', -c.rent) : null,
          c.wages ? line('Wages', -c.wages) : null,
          c.ads ? line('Advertising', -c.ads) : null,
          line('Spoilage (melted ice, old lemons)', -c.spoilage),
          c.fines ? line('Inspector fine', -c.fines, 'bad') : null,
          h('div', { class: `ledger-row total ${r.profit >= 0 ? 'good' : 'bad'}` }, h('span', null, 'Profit'), h('span', null, money(r.profit))),
          h('div', { class: 'ledger-row muted small' }, h('span', null, 'Stock bought this morning'), h('span', null, money(r.stockBought))),
          r.capitalSpent ? h('div', { class: 'ledger-row muted small' }, h('span', null, 'Upgrades & licences'), h('span', null, money(r.capitalSpent))) : null,
          h('div', { class: 'ledger-row' }, h('span', null, 'Cash now'), h('strong', null, money(r.cashEnd))),
          r.inspection ? h('p', { class: r.inspection.fined ? 'warn small' : 'small good' }, r.inspection.fined ? `🕵️ The health inspector found spoiled lemons: ${money(r.inspection.fine, false)} fine and reputation −${CONFIG.events.inspector.repPenalty}.` : '🕵️ The health inspector visited. All clean!') : null,
          r.spoiledLemons ? h('p', { class: 'small muted' }, `${r.spoiledLemons} lemons went bad and were thrown out.`) : null,
        ),
        app.lastDay!.attribution === null && hasCovered(app.lastDay!.state)
          ? h('section', { class: 'card did' }, h('h3', null, 'What your purchases did today'), h('p', { class: 'small muted' }, 'Working it out…'))
          : purchasesCard(app.lastDay!.attribution ?? [], r, app.lastDay!.state),
        ...r.stands.map((s) => standCard(s, r.stands.length > 1)),
        r.stands.length === 0 ? h('p', { class: 'muted center' }, 'No stands were open today.') : null,
      ),
      h('footer', { class: 'open-bar' }, h('button', { class: 'btn open-btn', onclick: () => app.go('hub') }, 'Next morning →')),
    ),
  );
  const msgs = [...r.milestones.map((m) => `🏅 ${milestoneText(m.id)}${m.bonus ? ` +${money(m.bonus, false)}` : ''}`)];
  if (msgs.length) void toastSequence(msgs);
}

function standCard(s: StandReport, showName: boolean): HTMLElement {
  const funnel = [
    { label: 'Passed by', n: s.passersby },
    { label: 'Stopped', n: s.stoppers },
    { label: 'Bought', n: s.buyers },
  ];
  const max = Math.max(1, s.passersby);
  const top = (Object.entries(s.complaints) as [Bubble, number][]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const lost: [string, number][] = [
    [BUBBLES.tooExpensive, s.tooExpensive],
    [BUBBLES.lineTooLong, s.lostQueue],
    [BUBBLES.soldOut, s.lostSoldOut],
    ['🛒 Went to a competitor', s.stolen],
  ];
  const hours = Array.from({ length: s.hourlySales.length }, (_, i) => {
    const hr = CONFIG.calendar.openHour + i;
    return `${((hr + 11) % 12) + 1}${hr < 12 ? 'a' : 'p'}`;
  });
  const repDelta = s.repAfter - s.repBefore;
  return h(
    'section',
    { class: 'card' },
    h(
      'div',
      { class: 'row spread' },
      h('h3', null, showName ? `Stand #${s.standId + 1} · ${locName(s.locationId)}` : locName(s.locationId)),
      h('span', { class: `chip ${repDelta >= 0 ? 'good' : 'bad'}` }, `★ ${Math.round(s.repAfter)} (${repDelta >= 0 ? '+' : ''}${repDelta.toFixed(1)})`),
    ),
    h(
      'div',
      { class: 'funnel' },
      ...funnel.map((f) =>
        h('div', { class: 'funnel-row' }, h('span', { class: 'small' }, f.label), h('div', { class: 'track' }, h('div', { class: 'fill', style: `width:${(f.n / max) * 100}%` })), h('strong', null, String(f.n))),
      ),
    ),
    h('p', { class: 'small' }, `Revenue ${money(s.revenue)} · ${s.pitchers} pitchers · satisfaction ${s.buyers ? Math.round(s.avgSat * 100) : 0}%${s.soldOutAt !== null ? ' · sold out!' : ''}`),
    h(
      'div',
      { class: 'two-col' },
      h('div', null, h('h4', null, 'Lost customers'), h('ul', { class: 'plain small' }, ...lost.filter(([, n]) => n > 0).map(([k, n]) => h('li', null, `${k} ×${n}`))), lost.every(([, n]) => n === 0) ? h('p', { class: 'small muted' }, 'None') : null),
      h('div', null, h('h4', null, 'Top complaints'), top.length ? h('ul', { class: 'plain small' }, ...top.map(([k, n]) => h('li', null, `${BUBBLES[k]} ×${n}`))) : h('p', { class: 'small muted' }, 'None 🎉')),
    ),
    h('h4', null, 'Cups sold by hour'),
    barChart(s.hourlySales, hours, 'Cups sold per hour') as unknown as HTMLElement,
  );
}
