import { CONFIG } from '../../../config';
import { wage } from '../../../sim/stand';
import type { App } from '../../app';
import { selectedStand, standLabel, standPicker } from '../../components';
import { h } from '../../dom';
import { money, ROLE_EFFECT, ROLE_ICON } from '../../text';

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(CONFIG.staff.maxSkill - n);

export function staffTab(app: App): HTMLElement {
  const s = app.game;
  const stand = selectedStand(app);
  const full = stand.staff.length >= CONFIG.staff.maxPerStand;
  const nextRefresh = s.day + (CONFIG.staff.poolRefreshDays - ((s.day - 1) % CONFIG.staff.poolRefreshDays));
  const daysToRefresh = nextRefresh - s.day;

  return h(
    'div',
    { class: 'stack' },
    standPicker(app),
    h(
      'section',
      { class: 'card' },
      h('h3', null, `${standLabel(stand)} — staff ${stand.staff.length}/${CONFIG.staff.maxPerStand}`),
      stand.staff.length === 0 ? h('p', { class: 'muted small' }, 'Just you behind the counter.') : null,
      ...stand.staff.map((m) => {
        const toNext = CONFIG.staff.skillUpDays - (m.daysWorked % CONFIG.staff.skillUpDays);
        return h(
          'div',
          { class: 'person' },
          h('span', { class: 'person-icon', 'aria-hidden': 'true' }, ROLE_ICON[m.role]),
          h(
            'div',
            { class: 'grow' },
            h('strong', null, `${m.name} · ${CONFIG.staff.roles[m.role].name}`),
            h('div', { class: 'small' }, h('span', { class: 'stars' }, stars(m.skill)), ` ${ROLE_EFFECT[m.role](m.skill)}`),
            h(
              'div',
              { class: 'small muted' },
              `${money(wage(m, CONFIG))}/day · ${m.daysWorked} days worked${m.skill < CONFIG.staff.maxSkill ? ` · skill up in ${toNext} days` : ''}`,
            ),
          ),
          h(
            'button',
            {
              class: 'btn danger',
              onclick: () => window.confirm(`Let ${m.name} go?`) && app.act({ type: 'fire', standId: stand.id, staffId: m.id }),
            },
            'Fire',
          ),
        );
      }),
    ),
    h(
      'section',
      { class: 'card' },
      h('h3', null, 'Hiring pool'),
      h('p', { class: 'small muted' }, `New candidates ${daysToRefresh === 0 ? 'tomorrow' : `in ${daysToRefresh} days`} (every Monday). Wages rise as skill grows.`),
      s.candidates.length === 0 ? h('p', { class: 'muted small' }, 'Nobody is looking for work right now.') : null,
      ...s.candidates.map((c) =>
        h(
          'div',
          { class: 'person' },
          h('span', { class: 'person-icon', 'aria-hidden': 'true' }, ROLE_ICON[c.role]),
          h(
            'div',
            { class: 'grow' },
            h('strong', null, `${c.name} · ${CONFIG.staff.roles[c.role].name}`),
            h('div', { class: 'small' }, h('span', { class: 'stars' }, stars(c.skill)), ` ${ROLE_EFFECT[c.role](c.skill)}`),
            h('div', { class: 'small muted' }, `${money(wage(c, CONFIG))}/day`),
          ),
          h(
            'button',
            { class: 'btn primary', disabled: full, onclick: () => app.act({ type: 'hire', candidateId: c.id, standId: stand.id }) },
            full ? 'Full' : `Hire`,
          ),
        ),
      ),
    ),
  );
}
