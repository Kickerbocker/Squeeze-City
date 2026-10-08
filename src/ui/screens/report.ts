import { CONFIG } from '../../config';
import type { Bubble, StandReport } from '../../sim';
import type { App } from '../app';
import { barChart } from '../charts';
import { h, mount, toastSequence } from '../dom';
import { BUBBLES, CONDITION_ICON, locName, milestoneText, money, temp } from '../text';

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
