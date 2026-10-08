import Phaser from 'phaser';
import { CONFIG } from '../../config';
import { DayScene, type DaySceneData, RES, SCENE_H, SCENE_W } from '../../game/DayScene';
import { buildTimeline, cashAt, funnelAt, posesAt, soldAt, stockAt } from '../../game/replay';
import type { Recipe } from '../../sim';
import type { App } from '../app';
import { audio } from '../audio';
import { h, mount } from '../dom';
import { BUBBLES, CONDITION_ICON, hourLabel, locName, money, temp } from '../text';

const SPEED_KEY = 'squeeze-city:speed';

/** Plays back the day that runDay already computed. Returns a cleanup function. */
export function renderDay(app: App): () => void {
  const result = app.pendingReport!;
  const report = result.report;
  const tl = buildTimeline(result.events);
  // Stand settings as they were during the day (the plan is applied before runDay, and
  // stands keep their settings overnight).
  const stands = result.state.stands.filter((st) => report.stands.some((r) => r.standId === st.id));
  const recipes = new Map<number, Recipe>(stands.map((st) => [st.id, st.recipe]));
  let active = stands[0]?.id ?? 0;
  let speed = Number(sessionStorage.getItem(SPEED_KEY) ?? 1) || 1;

  const clock = h('strong', { class: 'clock' }, '9:00 AM');
  const weather = h('span', null, '');
  const cash = h('strong', null, money(tl.openCash));
  const served = h('span', null, '');
  const bars = {
    lemons: bar('🍋'),
    sugar: bar('🍚'),
    ice: bar('🧊'),
    cups: bar('🥤'),
  };
  const startStock = stockAt(tl, 0, recipes);
  const rows = ['Passed by', 'Stopped', 'Bought'].map((label) => {
    const fill = h('div', { class: 'fill' });
    const n = h('strong', null, '0');
    return { el: h('div', { class: 'funnel-row' }, h('span', { class: 'small' }, label), h('div', { class: 'track' }, fill), n), fill, n };
  });
  const lost = h('div', { class: 'live-lost small muted' });
  const live = h('section', { class: 'card live' }, ...rows.map((r) => r.el), lost);
  let lastLive = -1;
  const canvasHost = h('div', { class: 'canvas-host', style: `aspect-ratio:${SCENE_W}/${SCENE_H}` });
  const doneBtn = h('button', { class: 'btn open-btn hidden', onclick: () => app.finishDay() }, 'See today’s report →');
  const speedBtns = [1, 2, 4].map((n) =>
    h(
      'button',
      {
        class: `btn speed ${n === speed ? 'on' : ''}`,
        'aria-pressed': String(n === speed),
        onclick: () => {
          speed = n;
          sessionStorage.setItem(SPEED_KEY, String(n));
          scene()?.setSpeed(n);
          speedBtns.forEach((b, i) => {
            b.classList.toggle('on', [1, 2, 4][i] === n);
            b.setAttribute('aria-pressed', String([1, 2, 4][i] === n));
          });
        },
      },
      `${n}×`,
    ),
  );
  const skip = h('button', { class: 'btn speed', onclick: () => scene()?.skipToEnd() }, 'Skip ⏭');
  const tabs =
    stands.length > 1
      ? h(
          'div',
          { class: 'segmented' },
          ...stands.map((st) =>
            h(
              'button',
              {
                class: `seg ${st.id === active ? 'on' : ''}`,
                'data-stand': String(st.id),
                onclick: (e: Event) => {
                  active = st.id;
                  lastLive = -1;
                  scene()?.showStand(st.id);
                  (e.currentTarget as HTMLElement).parentElement!.querySelectorAll('.seg').forEach((b) => b.classList.toggle('on', b.getAttribute('data-stand') === String(st.id)));
                },
              },
              h('strong', null, `#${st.id + 1}`),
              h('span', { class: 'small', 'data-sold': String(st.id) }, locName(st.locationId!)),
            ),
          ),
        )
      : null;

  mount(
    app.root,
    h(
      'div',
      { class: 'dayview' },
      h(
        'header',
        { class: 'topbar day-top' },
        h('div', { class: 'tb-cell' }, h('span', { class: 'tb-label' }, 'Time'), clock),
        h('div', { class: 'tb-cell' }, h('span', { class: 'tb-label' }, 'Weather'), weather),
        h('div', { class: 'tb-cell cash' }, h('span', { class: 'tb-label' }, 'Cash'), cash),
        h('div', { class: 'tb-cell' }, h('span', { class: 'tb-label' }, 'Sold'), served),
      ),
      tabs,
      canvasHost,
      h('div', { class: 'stockbars' }, bars.lemons.el, bars.sugar.el, bars.ice.el, bars.cups.el),
      h('div', { class: 'speedrow' }, ...speedBtns, skip),
      live,
      h('footer', { class: 'open-bar' }, doneBtn),
    ),
  );

  const data: DaySceneData = {
    timeline: tl,
    stands: stands.map((st) => ({ id: st.id, locationId: st.locationId!, upgrades: st.upgrades, staffCount: st.staff.length })),
    condition: report.weather.condition,
    openHour: CONFIG.calendar.openHour,
    bubbleText: (b) => BUBBLES[b],
    onServe: () => audio.ding(),
    onPitcher: () => audio.pour(),
    onTick: (t) => {
      const hour = CONFIG.calendar.openHour + Math.min(t, 540) / 60;
      clock.textContent = t >= 540 ? (t >= tl.close ? 'Closed' : 'Closing…') : hourLabel(hour);
      const hourTemp = tl.hours.filter((x) => x.t <= t).at(-1)?.temp ?? report.weather.dayTemp - 4;
      weather.textContent = `${CONDITION_ICON[report.weather.condition]} ${temp(hourTemp)}`;
      cash.textContent = money(cashAt(tl, t));
      const st = tl.stands.get(active);
      if (st) {
        const q = posesAt(st, t, undefined, 1_000_000).queueLength;
        served.textContent = `${soldAt(st, t)}${q ? ` · ${q} in line` : ''}`;
      }
      if (st && (t - lastLive >= 2 || t >= tl.close)) {
        lastLive = t;
        const f = funnelAt(st, t);
        const vals = [f.passed, f.stopped, f.bought];
        rows.forEach((r, i) => {
          r.n.textContent = String(vals[i]);
          r.fill.style.width = `${(vals[i]! / Math.max(1, f.passed)) * 100}%`;
        });
        const parts = [
          f.tooExpensive ? `${BUBBLES.tooExpensive} ${f.tooExpensive}` : '',
          f.lineTooLong ? `${BUBBLES.lineTooLong} ${f.lineTooLong}` : '',
          f.soldOut ? `${BUBBLES.soldOut} ${f.soldOut}` : '',
        ].filter(Boolean);
        lost.textContent = parts.length ? parts.join('  ·  ') : 'Nobody turned away yet';
      }
      const stock = stockAt(tl, t, recipes);
      bars.lemons.set(stock.lemons, startStock.lemons);
      bars.sugar.set(stock.sugar, startStock.sugar);
      bars.ice.set(stock.ice, startStock.ice);
      bars.cups.set(stock.cups, startStock.cups);
      if (t >= tl.close && doneBtn.classList.contains('hidden')) {
        doneBtn.classList.remove('hidden');
        skip.setAttribute('disabled', '');
      }
    },
  };

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: canvasHost,
    width: SCENE_W * RES,
    height: SCENE_H * RES,
    backgroundColor: '#8fd3ff',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
    render: { antialias: true, pixelArt: false },
    banner: false,
    audio: { noAudio: true },
    scene: [],
  });
  game.scene.add('day', DayScene, true, data);
  const scene = () => game.scene.getScene('day') as DayScene | null;
  game.events.once('ready', () => scene()?.setSpeed(speed));
  // The scene may already be running before 'ready' fires in some browsers.
  setTimeout(() => scene()?.setSpeed(speed), 50);
  audio.startAmbience(report.weather.condition === 'rain' || report.weather.condition === 'storm');

  return () => {
    audio.stopAmbience();
    game.destroy(true);
  };
}

function bar(icon: string): { el: HTMLElement; set: (v: number, max: number) => void } {
  const fill = h('div', { class: 'fill' });
  const label = h('span', { class: 'bar-label' }, '');
  const el = h('div', { class: 'stockbar', title: icon }, h('span', { 'aria-hidden': 'true' }, icon), h('div', { class: 'track' }, fill), label);
  return {
    el,
    set: (v, max) => {
      const pct = max > 0 ? Math.max(0, Math.min(100, (v / max) * 100)) : 0;
      fill.style.width = `${pct}%`;
      fill.classList.toggle('low', pct < 15);
      label.textContent = String(Math.round(v));
    },
  };
}
