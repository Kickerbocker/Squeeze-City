import { CONFIG } from '../config';
import { bestRep, dayInfo, type GameState, type Stand } from '../sim';
import type { App } from './app';
import { audio } from './audio';
import { h } from './dom';
import { CONDITION_ICON, locName, money, temp } from './text';

export function topBar(app: App): HTMLElement {
  const s = app.game;
  const info = dayInfo(s.day, CONFIG);
  const stand = s.stands.find((x) => x.id === app.selectedStand);
  const rep = stand?.locationId ? (s.locations[stand.locationId].rep ?? null) : null;
  const shownRep = rep ?? bestRep(s);
  return h(
    'header',
    { class: 'topbar' },
    h('div', { class: 'tb-cell cash', title: 'Cash' }, h('span', { class: 'tb-label' }, 'Cash'), h('strong', null, money(s.cash))),
    h(
      'div',
      { class: 'tb-cell' },
      h('span', { class: 'tb-label' }, `Y${info.year} · ${CONFIG.calendar.dayNames[info.dayOfWeek]}`),
      h('strong', null, `${CONFIG.calendar.seasonNames[info.season]} ${info.dayOfSeason}`),
    ),
    h(
      'div',
      { class: 'tb-cell', title: 'Forecast' },
      h('span', { class: 'tb-label' }, s.globalUpgrades.radio ? 'Forecast 📻' : 'Forecast'),
      h('strong', null, `${CONDITION_ICON[s.forecast.condition]} ${temp(s.forecast.temp)}`),
    ),
    h('div', { class: 'tb-cell', title: 'Reputation' }, h('span', { class: 'tb-label' }, 'Rep'), h('strong', null, `★ ${Math.round(shownRep)}`)),
    h(
      'button',
      {
        class: 'icon-btn menu-btn',
        'aria-label': 'Menu',
        onclick: () => openMenu(app),
      },
      '☰',
    ),
  );
}

function openMenu(app: App): void {
  const close = () => sheet.remove();
  const sheet = h(
    'div',
    { class: 'sheet-backdrop', onclick: (e: Event) => e.target === sheet && close() },
    h(
      'div',
      { class: 'sheet' },
      h('h3', null, 'Menu'),
      h('button', { class: 'btn block', onclick: () => (close(), app.go('stats')) }, '📊 Stats & milestones'),
      h(
        'button',
        {
          class: 'btn block',
          onclick: () => {
            audio.unlock();
            audio.setMuted(!audio.muted);
            close();
          },
        },
        audio.muted ? '🔊 Sound on' : '🔇 Mute',
      ),
      h('button', { class: 'btn block', onclick: () => (close(), app.persist(), app.go('title')) }, '💾 Save & quit to title'),
      h('button', { class: 'btn block ghost', onclick: close }, 'Close'),
    ),
  );
  document.body.append(sheet);
}

export function standLabel(stand: Stand): string {
  return `Stand ${stand.id + 1}${stand.locationId ? ` · ${locName(stand.locationId)}` : ' · closed'}`;
}

/** Segmented control to choose which stand a tab is editing. Hidden with one stand. */
export function standPicker(app: App): HTMLElement | null {
  const s = app.game;
  if (s.stands.length < 2) return null;
  return h(
    'div',
    { class: 'segmented', role: 'tablist' },
    ...s.stands.map((st) =>
      h(
        'button',
        {
          class: `seg ${st.id === app.selectedStand ? 'on' : ''}`,
          role: 'tab',
          'aria-selected': String(st.id === app.selectedStand),
          onclick: () => {
            app.selectedStand = st.id;
            app.render();
          },
        },
        h('strong', null, `#${st.id + 1}`),
        h('span', { class: 'small' }, st.locationId ? locName(st.locationId) : 'closed'),
      ),
    ),
  );
}

export function selectedStand(app: App): Stand {
  const s = app.game;
  return s.stands.find((x) => x.id === app.selectedStand) ?? s.stands[0]!;
}

export function stepper(label: string, value: string, onMinus: (() => void) | null, onPlus: (() => void) | null, hint?: string): HTMLElement {
  return h(
    'div',
    { class: 'stepper' },
    h('div', { class: 'stepper-label' }, h('span', null, label), hint ? h('span', { class: 'muted small' }, hint) : null),
    h(
      'div',
      { class: 'stepper-ctrl' },
      h('button', { class: 'step', 'aria-label': `Less ${label}`, disabled: !onMinus, onclick: onMinus ?? undefined }, '−'),
      h('output', null, value),
      h('button', { class: 'step', 'aria-label': `More ${label}`, disabled: !onPlus, onclick: onPlus ?? undefined }, '+'),
    ),
  );
}

export function stat(label: string, value: string | number, cls = ''): HTMLElement {
  return h('div', { class: `stat ${cls}` }, h('span', { class: 'muted small' }, label), h('strong', null, String(value)));
}

export function canAfford(s: GameState, cost: number): boolean {
  return s.cash + 1e-9 >= cost;
}
