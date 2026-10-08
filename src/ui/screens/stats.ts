import { CONFIG } from '../../config';
import type { Bubble } from '../../sim';
import { netWorth } from '../../sim/game';
import type { App } from '../app';
import { lineChart } from '../charts';
import { stat } from '../components';
import { h, mount } from '../dom';
import { ALL_MILESTONES, BUBBLES, milestoneText, money } from '../text';

export function renderStats(app: App): void {
  const s = app.game;
  const st = s.stats;
  const complaints = (Object.entries(st.complaints) as [Bubble, number][]).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const tycoon = s.milestones.includes('tycoon');
  mount(
    app.root,
    h(
      'div',
      { class: 'report' },
      h('header', { class: 'report-head' }, h('h1', null, tycoon ? '🏆 Tycoon' : 'Stats'), h('span', { class: 'muted small' }, `Day ${s.day} · net worth ${money(netWorth(s), false)}`)),
      h(
        'main',
        { class: 'scroll stack' },
        h(
          'section',
          { class: 'card' },
          h(
            'div',
            { class: 'stats3' },
            stat('Cups sold', st.cupsSold.toLocaleString('en-US')),
            stat('Lifetime revenue', money(st.lifetimeRevenue, false)),
            stat('Best day', st.bestDay ? `${money(st.bestDayProfit, false)} (day ${st.bestDay})` : '—'),
          ),
        ),
        h('section', { class: 'card' }, h('h3', null, 'Net worth'), lineChart(st.netWorthHistory, 'Net worth by day', (v) => money(v, false)) as unknown as HTMLElement),
        h(
          'section',
          { class: 'card' },
          h('h3', null, 'Most common complaints'),
          complaints.length ? h('ul', { class: 'plain' }, ...complaints.map(([k, n]) => h('li', null, `${BUBBLES[k]} — ${n.toLocaleString('en-US')}`))) : h('p', { class: 'muted small' }, 'No complaints yet.'),
        ),
        h(
          'section',
          { class: 'card' },
          h('h3', null, `Milestones ${s.milestones.length}/${ALL_MILESTONES().length}`),
          h(
            'ul',
            { class: 'plain milestones' },
            ...ALL_MILESTONES().map((id) => h('li', { class: s.milestones.includes(id) ? 'done' : 'muted' }, `${s.milestones.includes(id) ? '✅' : '⬜'} ${milestoneText(id)}`)),
          ),
          h('p', { class: 'small muted' }, `Reach ${money(CONFIG.progression.milestones.tycoonNetWorth, false)} net worth to earn the Tycoon title.`),
        ),
      ),
      h('footer', { class: 'open-bar' }, h('button', { class: 'btn open-btn', onclick: () => app.go('hub') }, '← Back')),
    ),
  );
}
