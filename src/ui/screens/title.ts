import { CONFIG } from '../../config';
import { dayInfo } from '../../sim';
import { netWorth } from '../../sim/game';
import type { App } from '../app';
import { audio } from '../audio';
import { confirmSheet, h, mount } from '../dom';
import { money } from '../text';

export function renderTitle(app: App): void {
  const slots = app.slots.list();
  const muteBtn = h(
    'button',
    {
      class: 'icon-btn',
      'aria-label': audio.muted ? 'Unmute' : 'Mute',
      onclick: () => {
        audio.unlock();
        audio.setMuted(!audio.muted);
        app.render();
      },
    },
    audio.muted ? '🔇' : '🔊',
  );

  mount(
    app.root,
    h(
      'main',
      { class: 'title-screen scroll' },
      h('div', { class: 'title-top' }, muteBtn),
      h(
        'div',
        { class: 'logo' },
        h('div', { class: 'logo-lemon', 'aria-hidden': 'true' }),
        h('h1', null, 'Squeeze City'),
        h('p', { class: 'tagline' }, 'From one cart in the park to stands across the city.'),
      ),
      h(
        'section',
        { class: 'card p1-card' },
        h('div', { class: 'slot-head' }, h('strong', null, '🛵 New: Hustle (prototype)'), h('span', { class: 'chip good' }, 'P1')),
        h('p', { class: 'small' }, 'Start with nothing: take gigs, bake for the market, then run a drink stand. A plain test of the new game’s first days.'),
        h(
          'div',
          { class: 'row' },
          app.p1.hasSave()
            ? h('button', { class: 'btn primary grow', onclick: () => app.openP1(false) }, 'Continue')
            : h('button', { class: 'btn primary grow', onclick: () => app.openP1(true) }, 'Play the prototype'),
          app.p1.hasSave() ? h('button', { class: 'btn', onclick: () => confirmNewP1(app) }, 'New') : null,
        ),
      ),
      h('h4', null, 'The current game'),
      h(
        'section',
        { class: 'slots' },
        ...slots.map(({ slot, state, error }) => {
          const label = `Slot ${slot + 1}`;
          if (error) {
            return h(
              'div',
              { class: 'card slot' },
              h('div', { class: 'slot-head' }, h('strong', null, label), h('span', { class: 'bad' }, 'Unreadable save')),
              h('p', { class: 'muted small' }, error),
              h('button', { class: 'btn', onclick: () => confirmNew(app, slot, true) }, 'Start over'),
            );
          }
          if (!state) {
            return h(
              'div',
              { class: 'card slot' },
              h('div', { class: 'slot-head' }, h('strong', null, label), h('span', { class: 'muted' }, 'Empty')),
              h('button', { class: 'btn primary', onclick: () => (audio.unlock(), app.startNew(slot)) }, 'New game'),
            );
          }
          const info = dayInfo(state.day, CONFIG);
          return h(
            'div',
            { class: 'card slot' },
            h(
              'div',
              { class: 'slot-head' },
              h('strong', null, label),
              h('span', null, `Year ${info.year} · ${CONFIG.calendar.seasonNames[info.season]} ${info.dayOfSeason}`),
            ),
            h(
              'div',
              { class: 'slot-stats' },
              h('span', null, `💰 ${money(state.cash, false)}`),
              h('span', null, `📈 ${money(netWorth(state), false)}`),
              h('span', null, `🏪 ${state.stands.length}`),
            ),
            h(
              'div',
              { class: 'row' },
              h('button', { class: 'btn primary grow', onclick: () => (audio.unlock(), app.load(slot)) }, 'Continue'),
              h('button', { class: 'btn', onclick: () => confirmNew(app, slot, false) }, 'New'),
            ),
          );
        }),
      ),
      h('p', { class: 'muted small center' }, 'A fan-made tribute to lemonade tycoon games. All art and sound are made in code.'),
    ),
  );
}

function confirmNew(app: App, slot: number, broken: boolean): void {
  const start = () => {
    audio.unlock();
    app.startNew(slot);
  };
  if (broken) start();
  else confirmSheet(`Start a new game in slot ${slot + 1}?\nThe current save will be lost.`, 'Start new game', start, true);
}

function confirmNewP1(app: App): void {
  confirmSheet('Start the Hustle prototype over from day 1?', 'Start over', () => app.openP1(true), true);
}
