import { type Archetype, CONFIG, type LocationConfig, type LocationId } from '../../../config';
import { bestRep, licenseCost, upcomingNotices } from '../../../sim';
import type { App } from '../../app';
import { canAfford } from '../../components';
import { confirmSheet, h } from '../../dom';
import { ARCHETYPE_ICON, EVENT_TEXT, money } from '../../text';

/** Pin positions on the stylised city map (percent of width/height). */
const PINS: Record<LocationId, [number, number]> = {
  maple: [18, 72],
  uptown: [36, 48],
  campus: [16, 24],
  boardwalk: [86, 72],
  financial: [56, 30],
  stadium: [82, 18],
  neon: [62, 62],
};

function cityMap(app: App): HTMLElement {
  const s = app.game;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 62');
  svg.setAttribute('class', 'citymap');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'City map');
  const shape = (tag: string, attrs: Record<string, string | number>) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    svg.append(el);
    return el;
  };
  shape('rect', { x: 0, y: 0, width: 100, height: 62, fill: '#efe6d2' });
  shape('rect', { x: 76, y: 0, width: 24, height: 62, fill: '#8fd3ff' });
  shape('rect', { x: 72, y: 0, width: 6, height: 62, fill: '#f3dfb4' });
  shape('rect', { x: 2, y: 36, width: 30, height: 24, rx: 4, fill: '#9fd88a' });
  for (const y of [20, 42]) shape('rect', { x: 0, y, width: 72, height: 2.5, fill: '#d0c3a8' });
  for (const x of [28, 48]) shape('rect', { x, y: 0, width: 2.5, height: 62, fill: '#d0c3a8' });
  for (const loc of CONFIG.locations.locations) {
    const [px, py] = PINS[loc.id];
    const x = px;
    const y = (py / 100) * 62;
    const ls = s.locations[loc.id];
    const stand = s.stands.find((st) => st.locationId === loc.id);
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'pin');
    g.setAttribute('tabindex', '0');
    g.addEventListener('click', () => document.getElementById(`loc-${loc.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', String(x));
    c.setAttribute('cy', String(y));
    c.setAttribute('r', '4.2');
    c.setAttribute('fill', ls.unlocked ? (stand ? '#ffd84a' : '#ffffff') : '#b9b2a4');
    c.setAttribute('stroke', '#3a3226');
    c.setAttribute('stroke-width', '0.6');
    g.append(c);
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', String(x));
    t.setAttribute('y', String(y + 1.4));
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-size', '3.6');
    t.setAttribute('font-weight', '700');
    t.textContent = ls.unlocked ? (stand ? `#${stand.id + 1}` : '') : '🔒';
    g.append(t);
    const label = document.createElementNS(NS, 'text');
    label.setAttribute('x', String(x));
    label.setAttribute('y', String(y + 8));
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '3');
    label.textContent = loc.name;
    g.append(label);
    svg.append(g);
  }
  return h('div', { class: 'card map-card' }, svg as unknown as HTMLElement);
}

function trafficHint(loc: LocationConfig): string {
  if (loc.gameDayTraffic) return `${loc.trafficWeekday}/h, ${loc.gameDayTraffic}/h on game days`;
  const busy = loc.trafficWeekend > loc.trafficWeekday * 1.3 ? ' · busy weekends' : loc.trafficWeekday > loc.trafficWeekend * 1.3 ? ' · busy weekdays' : '';
  return `${loc.trafficWeekday}/h weekdays, ${loc.trafficWeekend}/h weekends${busy}`;
}

export function mapTab(app: App): HTMLElement {
  const s = app.game;
  const lic = licenseCost(s, CONFIG);
  const best = bestRep(s);
  const notices = upcomingNotices(s, CONFIG);

  const assign = (standId: number, loc: LocationId | null) => app.act({ type: 'assignStand', standId, locationId: loc });

  return h(
    'div',
    { class: 'stack' },
    cityMap(app),
    h(
      'section',
      { class: 'card' },
      h('h3', null, `Stands ${s.stands.length}/${CONFIG.stands.maxStands}`),
      ...s.stands.map((st) =>
        h(
          'div',
          { class: 'row spread' },
          h('span', null, h('strong', null, `Stand #${st.id + 1}`), ' — ', st.locationId ? CONFIG.locations.locations.find((l) => l.id === st.locationId)!.name : h('em', null, 'not placed')),
          st.locationId ? h('button', { class: 'btn ghost', onclick: () => assign(st.id, null) }, 'Close') : null,
        ),
      ),
      lic !== null
        ? h(
            'button',
            { class: 'btn primary block', disabled: !canAfford(s, lic), onclick: () => confirmSheet(`Buy stand licence #${s.stands.length + 1} for ${money(lic, false)}?`, 'Buy licence', () => app.act({ type: 'buyLicense' })) },
            `Buy licence #${s.stands.length + 1} — ${money(lic, false)}`,
          )
        : h('p', { class: 'small muted' }, 'All licences owned.'),
      h('p', { class: 'small muted' }, 'Each stand keeps its own recipe, price, upgrades and staff. Stock is shared.'),
    ),
    ...CONFIG.locations.locations.map((loc) => {
      const ls = s.locations[loc.id];
      const here = s.stands.find((st) => st.locationId === loc.id);
      const evs = notices.filter((n) => n.locationId === loc.id || (n.kind === 'gameDay' && loc.gameDayTraffic));
      const mix = (Object.entries(loc.mix) as [Archetype, number][]).sort((a, b) => b[1] - a[1]);
      const special: string[] = [];
      if (loc.weatherAmplify) special.push('Weather hits harder here');
      if (loc.offSeasons) special.push(`Quiet in ${loc.offSeasons.map((x) => CONFIG.calendar.seasonNames[x]).join(' & ')}`);
      if (loc.gameDaysPerWeek) special.push(`${loc.gameDaysPerWeek} game days a week, announced ${loc.gameDayAnnounceDays} days ahead`);

      let body: (HTMLElement | null)[];
      if (!ls.unlocked) {
        const cashPct = Math.min(100, (s.cash / Math.max(1, loc.unlockCash)) * 100);
        const repPct = Math.min(100, (best / Math.max(1, loc.unlockRep)) * 100);
        body = [
          h('p', { class: 'small' }, `Unlocks when you hold ${money(loc.unlockCash, false)} cash with ★${loc.unlockRep} reputation somewhere (checked each night).`),
          h('div', { class: 'progress', title: 'Cash' }, h('div', { style: `width:${cashPct}%` }), h('span', null, `💰 ${money(s.cash, false)} / ${money(loc.unlockCash, false)}`)),
          h('div', { class: 'progress', title: 'Reputation' }, h('div', { style: `width:${repPct}%` }), h('span', null, `★ ${Math.round(best)} / ${loc.unlockRep}`)),
        ];
      } else {
        body = [
          h(
            'div',
            { class: 'row wrap' },
            ...s.stands.map((st) =>
              st.locationId === loc.id
                ? h('span', { class: 'chip good' }, `Stand #${st.id + 1} here`)
                : h('button', { class: 'btn', onclick: () => assign(st.id, loc.id) }, `Move #${st.id + 1} here`),
            ),
          ),
        ];
      }

      return h(
        'section',
        { class: `card loc ${ls.unlocked ? '' : 'locked'}`, id: `loc-${loc.id}` },
        h(
          'div',
          { class: 'row spread' },
          h('h3', null, `${ls.unlocked ? '' : '🔒 '}${loc.name}`),
          ls.rep !== null ? h('span', { class: 'chip' }, `★ ${Math.round(ls.rep)}`) : here ? null : h('span', { class: 'chip muted' }, ls.unlocked ? 'New' : ''),
        ),
        h('div', { class: 'small' }, `Rent ${loc.rent ? `${money(loc.rent, false)}/day` : 'free'} · ${trafficHint(loc)}`),
        h('div', { class: 'demo' }, ...mix.map(([a, pct]) => h('span', { class: 'chip', title: CONFIG.customers.archetypes[a].name }, `${ARCHETYPE_ICON[a]} ${CONFIG.customers.archetypes[a].name} ${pct}%`))),
        special.length ? h('div', { class: 'small muted' }, special.join(' · ')) : null,
        evs.length
          ? h(
              'div',
              { class: 'row wrap' },
              ...evs.map((n) => {
                const e = EVENT_TEXT[n.kind];
                const when = n.startDay > s.day ? (n.startDay === s.day + 1 ? 'tomorrow' : `in ${n.startDay - s.day} days`) : 'now';
                return h('span', { class: 'chip warn-chip' }, `${e.icon} ${e.name} ${when}`);
              }),
            )
          : null,
        ...body,
      );
    }),
  );
}
