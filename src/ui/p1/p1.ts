// P1 prototype mode (docs/specs/P1-prototype.md): its own save, its own screens, the current look.
import Phaser from 'phaser';
import { P1 } from '../../config/p1';
import { DayScene, type DaySceneData, RES, SCENE_H, SCENE_W } from '../../game/DayScene';
import { buildTimeline, soldAt } from '../../game/replay';
import {
  type Board,
  buyBusiness,
  learnSkill,
  type Missed,
  morningBoard,
  newP1Game,
  type P1DayResult,
  type P1Plan,
  type P1State,
  runP1Day,
  setQtyMode,
  skillList,
  stageOf,
  xpForLevel,
} from '../../sim/p1/game';
import type { App } from '../app';
import { audio } from '../audio';
import { confirmSheet, h, mount, toast } from '../dom';
import { BUBBLES, CONDITION_ICON } from '../text';
import { P1Logger } from './log';

const SAVE_KEY = 'squeeze-city:p1:save';
const SPEED_KEY = 'squeeze-city:p1:speed';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
/** Made-up neighborhoods with a Nashville feel (GDD-v2: a made-up city). */
const NEIGHBORHOODS = [
  ['Riverside likes cold and sweet', 'Depot Square likes cheap and quick'],
  ['Honeysuckle Park likes homemade and sweet', 'Brickyard likes big and filling'],
  ['Fiddler’s Row likes cold and fizzy', 'Cotton Hill likes classic and cheap'],
  ['Bluebird Lane likes fancy', 'Magnolia Heights likes sweet and cold'],
];

const usd = (x: number, cents = true) => `${x < 0 ? '−' : ''}$${Math.abs(x).toFixed(cents ? 2 : 0)}`;
const clock = (minutes: number) => {
  const total = P1.openHour * 60 + minutes;
  const hr = Math.floor(total / 60);
  return `${((hr + 11) % 12) + 1}:${String(Math.floor(total % 60)).padStart(2, '0')} ${hr >= 12 ? 'PM' : 'AM'}`;
};
const product = (b: 'market' | 'stand') => (b === 'market' ? 'cookies' : 'drinks');

type Screen = 'board' | 'gig' | 'day' | 'report' | 'skills';

export class P1Mode {
  state: P1State | null = null;
  screen: Screen = 'board';
  last: P1DayResult | null = null;
  /** Today's batch and price on the board, before opening. */
  draft = { batch: 0, price: 0, day: 0 };
  readonly log: P1Logger;
  private cleanup: (() => void) | null = null;
  private lastPlanBoard: Board | null = null;

  constructor(private app: App) {
    this.log = new P1Logger(localStorage);
  }

  hasSave(): boolean {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  start(fresh: boolean): void {
    let s: P1State | null = null;
    if (!fresh) {
      try {
        const file = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as { version: number; state: P1State } | null;
        if (file && file.version === 1 && file.state?.version === 1) s = file.state;
      } catch {
        s = null;
      }
    }
    if (!s) s = newP1Game((Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0);
    this.state = s;
    this.screen = 'board';
    this.last = null;
    this.log.open(s.seed, P1, fresh || !this.hasSave());
    this.persist();
  }

  private persist(): void {
    if (!this.state) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, state: this.state }));
    } catch {
      toast('Could not save (storage full or blocked)', 'error');
    }
  }

  private go(screen: Screen): void {
    this.screen = screen;
    this.render();
    window.scrollTo(0, 0);
  }

  render(): void {
    this.cleanup?.();
    this.cleanup = null;
    if (!this.state) this.start(false);
    switch (this.screen) {
      case 'board':
        this.renderBoard();
        break;
      case 'skills':
        this.renderSkills();
        break;
      case 'gig':
        this.cleanup = this.renderGig();
        break;
      case 'day':
        this.cleanup = this.renderDay();
        break;
      case 'report':
        this.renderReport();
        break;
    }
  }

  // ---------------------------------------------------------------- morning board

  private header(): HTMLElement {
    const s = this.state!;
    return h(
      'header',
      { class: 'topbar' },
      h('div', { class: 'tb-cell cash' }, h('span', { class: 'tb-label' }, 'Cash'), h('strong', null, usd(s.cash))),
      h('div', { class: 'tb-cell' }, h('span', { class: 'tb-label' }, `Day ${s.day}`), h('strong', null, `Week ${Math.floor((s.day - 1) / 7) + 1}`)),
      h('div', { class: 'tb-cell' }, h('span', { class: 'tb-label' }, 'Earned'), h('strong', null, usd(s.earned, false))),
      h(
        'button',
        { class: 'btn menu-btn', 'aria-label': 'Skills', onclick: () => this.go('skills') },
        h('span', null, `⭐ ${s.points}`),
      ),
      h('button', { class: 'btn menu-btn', 'aria-label': 'Menu', onclick: () => this.menu() }, '☰'),
    );
  }

  private menu(): void {
    const close = () => sheet.remove();
    const sheet = h(
      'div',
      { class: 'sheet-backdrop', onclick: (e: Event) => e.target === sheet && close() },
      h(
        'div',
        { class: 'sheet' },
        h('h3', null, 'Hustle prototype'),
        h('p', { class: 'small muted' }, 'A plain test of the first days of the new game. Your play log records how you play, so you don’t have to describe it.'),
        h('button', { class: 'btn block primary', onclick: () => (close(), void this.exportLog()) }, '📤 Export play log'),
        h(
          'button',
          {
            class: 'btn block',
            onclick: () => (close(), confirmSheet('Start the prototype over from day 1?', 'Start over', () => (this.start(true), this.render()), true)),
          },
          'Start over',
        ),
        h('button', { class: 'btn block', onclick: () => (close(), this.app.go('title')) }, '← Back to title'),
        h('button', { class: 'btn block ghost', onclick: close }, 'Close'),
      ),
    );
    document.body.append(sheet);
  }

  private async exportLog(): Promise<void> {
    const text = this.log.exportText();
    if (!text) return toast('Nothing logged yet', 'error');
    this.log.count('export');
    const name = `squeeze-city-p1-playlog-${new Date().toISOString().slice(0, 10)}-day${this.state!.day}.json`;
    const file = new File([text], name, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Squeeze City play log' });
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
    const url = URL.createObjectURL(file);
    const a = h('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast('Play log saved to your downloads', 'good');
  }

  private renderBoard(): void {
    const s = this.state!;
    const b = morningBoard(s);
    this.lastPlanBoard = b;
    this.log.resumeMorning();
    if (this.draft.day !== s.day) {
      const last = b.business ? s.lastBatch[b.business] : 0;
      this.draft = { day: s.day, price: s.price, batch: Math.min(b.maxAffordable, last || b.suggestion || b.likely?.mid || 0) };
    }
    const f = b.forecast;
    const handed = s.qtyMode === 'handed';
    const sections: (HTMLElement | null)[] = [];

    sections.push(
      h(
        'section',
        { class: 'card' },
        h('div', { class: 'small muted' }, `${DAYS[b.weekday]}${b.weekend ? ' · market day, bigger crowds' : ''}`),
        h('h2', null, `${CONDITION_ICON[f.condition as keyof typeof CONDITION_ICON]} ${f.name}, ${f.tempLo}–${f.tempHi}°`),
        h('div', { class: 'small' }, `The forecast is ${f.label}.`),
      ),
    );

    if (s.cartReady) {
      sections.push(
        h(
          'section',
          { class: 'card celebrate' },
          h('h3', null, '🚚 The food cart is next'),
          h('p', { class: 'small' }, 'You’ve earned enough for a food cart. That’s where this prototype ends: carts, neighborhoods and recipes come in the next one. Keep playing if you like, and export your play log from the ☰ menu when you’re done.'),
        ),
      );
    }

    if (b.canBuy) {
      const c = b.canBuy === 'market' ? P1.market : P1.stand;
      const what = b.canBuy === 'market' ? 'Sell homemade cookies at the weekend market and a weekday corner. You decide how many to bake.' : 'Sell lemonade on the street. You decide how many to make and what to charge.';
      sections.push(
        h(
          'section',
          { class: 'card celebrate' },
          h('h3', null, `🔓 ${c.name} unlocked`),
          h('p', { class: 'small' }, what),
          h(
            'button',
            {
              class: 'btn primary block',
              disabled: s.cash < c.cost,
              onclick: () => {
                const r = buyBusiness(s, b.canBuy!);
                if (!r.ok) return toast(r.error, 'error');
                this.state = r.state;
                this.log.count(`buy:${b.canBuy}`);
                this.draft.day = 0;
                audio.purchase();
                this.persist();
                this.render();
              },
            },
            s.cash < c.cost ? `Costs ${usd(c.cost, false)} — you have ${usd(s.cash)}` : `Start it for ${usd(c.cost, false)}`,
          ),
        ),
      );
    }

    if (b.business) {
      const bus = b.business;
      const uc = bus === 'market' ? P1.market.unitCost : P1.stand.unitCost;
      const L = b.likely!;
      const step = bus === 'market' ? 5 : 10;
      const setBatch = (n: number) => {
        this.draft.batch = Math.max(0, Math.min(b.maxAffordable, Math.round(n)));
        this.log.edit('batch');
        this.render();
      };
      const setPriceTo = (p: number) => {
        this.draft.price = Math.round(Math.max(P1.stand.priceMin, Math.min(P1.stand.priceMax, p)) * 100) / 100;
        this.log.edit('price');
        this.render();
      };
      const batchRow = handed
        ? h(
            'div',
            { class: 'stepper' },
            h('div', { class: 'stepper-label' }, h('strong', null, 'How many to make'), h('span', { class: 'small muted' }, `Standing order: makes the middle of the forecast for your price`)),
            h('div', { class: 'stepper-ctrl' }, h('strong', { class: 'big' }, String(b.handedBatch ?? 0))),
          )
        : h(
            'div',
            { class: 'stepper' },
            h('div', { class: 'stepper-label' }, h('strong', null, 'How many to make'), h('span', { class: 'small muted' }, `${usd(this.draft.batch * uc)} to make · you have ${usd(s.cash)}`)),
            h(
              'div',
              { class: 'stepper-ctrl' },
              h('button', { class: 'btn', 'aria-label': `${step} fewer`, onclick: () => setBatch(this.draft.batch - step) }, '−'),
              h('strong', { class: 'big', style: 'min-width:3.2em;text-align:center' }, String(this.draft.batch)),
              h('button', { class: 'btn', 'aria-label': `${step} more`, onclick: () => setBatch(this.draft.batch + step) }, '+'),
            ),
          );
      const suggestRow =
        s.qtyMode === 'helped' && b.suggestion !== null
          ? h(
              'div',
              { class: 'row spread suggest' },
              h('span', { class: 'small' }, `💡 Prep sense suggests ${b.suggestion}`),
              h('button', { class: 'btn', onclick: () => setBatch(b.suggestion!) }, 'Use it'),
            )
          : null;
      const priceRow =
        bus === 'stand'
          ? h(
              'div',
              { class: 'stepper' },
              h('div', { class: 'stepper-label' }, h('strong', null, 'Price'), h('span', { class: 'small muted' }, `Street price today: ${usd(b.street!.lo)} to ${usd(b.street!.hi)}`)),
              h(
                'div',
                { class: 'stepper-ctrl' },
                h('button', { class: 'btn', 'aria-label': '5 cents less', onclick: () => setPriceTo(this.draft.price - 0.05) }, '−'),
                h('strong', { class: 'big', style: 'min-width:3.2em;text-align:center' }, usd(this.draft.price)),
                h('button', { class: 'btn', 'aria-label': '5 cents more', onclick: () => setPriceTo(this.draft.price + 0.05) }, '+'),
              ),
            )
          : h('div', { class: 'small muted' }, `Cookies sell for ${usd(P1.market.price)} each. Unsold ones keep ${Math.round(100 * (s.skills.includes('thrifty') ? P1.skills.thrifty.salvage : P1.market.salvage))}% of their value.`);
      const modeRow =
        s.skills.includes('prepSense')
          ? h(
              'div',
              { class: 'segmented mode' },
              ...(['yours', 'helped', ...(s.skills.includes('standingOrder') ? ['handed'] : [])] as const).map((m) =>
                h(
                  'button',
                  {
                    class: `seg ${s.qtyMode === m ? 'on' : ''}`,
                    onclick: () => {
                      const r = setQtyMode(s, m as 'yours' | 'helped' | 'handed');
                      if (!r.ok) return toast(r.error, 'error');
                      this.state = r.state;
                      this.log.count(`mode:${m}`);
                      this.persist();
                      this.render();
                    },
                  },
                  { yours: 'I’ll decide', helped: 'Suggest', handed: 'Handed off' }[m as 'yours'],
                ),
              ),
            )
          : null;
      sections.push(
        h(
          'section',
          { class: 'card' },
          h('h3', null, bus === 'market' ? '🍪 Market table' : '🍋 Drink stand'),
          h('p', null, h('strong', null, `${L.lo} to ${L.hi}`), ` people likely to want ${product(bus)}`, bus === 'stand' ? h('span', { class: 'small muted' }, ' at the street price. Fewer buy above it, more below.') : null),
          modeRow,
          batchRow,
          suggestRow,
          priceRow,
        ),
      );
    }

    const goal = s.week.goal;
    const goalText = goal.kind === 'units' ? `Sell ${goal.target} this week` : goal.kind === 'earn' ? `Earn ${usd(goal.target, false)} this week` : `Beat your best Saturday (${usd(goal.target - 1, false)})`;
    const progress = goal.kind === 'bestSaturday' ? '' : ` (${goal.kind === 'earn' ? usd(s.week.progress, false) : s.week.progress} so far)`;
    sections.push(
      h(
        'section',
        { class: 'card' },
        h('div', { class: 'row spread' }, h('span', { class: 'small' }, `🎯 ${goalText}${progress}`), s.week.done ? h('span', { class: 'chip good' }, 'Done ✓') : h('span', { class: 'small muted' }, `+${usd(P1.weekGoal.bonus, false)}`)),
      ),
    );

    const gigs = h(
      'section',
      { class: 'card' },
      h('h3', null, b.business ? 'Or take a gig today' : 'Today’s gigs'),
      ...b.gigs.map((g) =>
        h(
          'div',
          { class: 'upgrade' },
          h('div', { class: 'grow' }, h('strong', null, g.name), h('div', { class: 'small muted' }, `Teaches: ${g.teaches}`)),
          h('button', { class: `btn ${b.business ? '' : 'primary'}`, onclick: () => this.play({ kind: 'gig', gig: g.id }) }, `${usd(g.pay, false)}`),
        ),
      ),
    );
    if (b.business) sections.push(gigs);
    else sections.splice(1, 0, gigs);

    mount(
      this.app.root,
      h(
        'div',
        { class: 'hub p1' },
        this.header(),
        h('main', { class: 'scroll stack tab-body' }, ...sections),
        b.business
          ? h(
              'footer',
              { class: 'open-bar' },
              h(
                'button',
                {
                  class: 'btn open-btn',
                  disabled: !handed && this.draft.batch <= 0,
                  onclick: () => this.play({ kind: 'open', batch: this.draft.batch, price: this.draft.price }),
                },
                b.business === 'market' ? 'Open the table' : 'Open the stand',
              ),
            )
          : null,
      ),
    );
  }

  private play(plan: P1Plan): void {
    audio.unlock();
    const s = this.state!;
    const b = this.lastPlanBoard ?? morningBoard(s);
    const r = runP1Day(s, plan);
    const rep = r.report;
    const res = rep.result;
    this.log.dayStarted(
      {
        day: rep.day,
        weekday: rep.weekday,
        stage: stageOf(s),
        choice: rep.kind,
        ...(rep.gig ? { gig: rep.gig.offer.id, gigAfterStand: s.owned.stand } : {}),
        weather: rep.weather.name,
        forecast: { weather: b.forecast.name, label: b.forecast.label, right: rep.forecastRight },
        ...(b.likely && rep.kind === 'business' ? { likely: [b.likely.lo, b.likely.hi] as [number, number] } : {}),
        ...(b.street && rep.kind === 'business' ? { street: [b.street.lo, b.street.hi] as [number, number] } : {}),
        ...(res ? { batch: res.made, batchMode: rep.qtyMode!, suggested: b.suggestion, sold: res.sold, leftover: res.leftover, walkedSoldOut: res.walkedSoldOut, walkedPrice: res.walkedPrice } : {}),
        ...(res && rep.business === 'stand' ? { price: rep.price!, reactions: { deal: res.reactions.deal, fair: res.reactions.fair, pricey: res.reactions.pricey, walk: res.reactions.walk } } : {}),
        income: rep.income,
        missed: rep.missed.map((m) => ({ kind: m.kind, size: m.kind === 'leftover' ? m.lost : m.gain })),
      },
      rep,
      Number(sessionStorage.getItem(SPEED_KEY) ?? 1) || 1,
    );
    this.last = r;
    this.state = r.state;
    this.persist();
    this.go(rep.kind === 'gig' ? 'gig' : 'day');
  }

  // ---------------------------------------------------------------- a gig day (~20 s)

  private renderGig(): () => void {
    const rep = this.last!.report;
    const g = rep.gig!;
    const lines: string[] = [`You head out for the ${g.offer.name.toLowerCase()}.`];
    const L = g.lesson;
    if (L.neighborhoods !== undefined) {
      const [a, b] = NEIGHBORHOODS[L.neighborhoods % NEIGHBORHOODS.length]!;
      lines.push('Twelve drop-offs across two neighborhoods.', `${a}.`, `${b}.`, 'You’ll remember that when you can pick where to sell.');
    } else if (L.helper) {
      const x = L.helper;
      lines.push(`Rosa’s stall forecast said ${x.lo} to ${x.hi} buyers. She baked ${x.made}.`, `She sold ${x.sold}.`, x.walked > 0 ? `She ran out, and ${x.walked} people left empty-handed.` : `She had ${x.made - x.sold} left over, which keep half their value.`, 'Making too few loses sales; making too many costs a little.');
    } else if (L.yardsale) {
      const y = L.yardsale;
      lines.push(`Lemonade at ${usd(y.price)} a cup at the yard sale.`, `${BUBBLES.deal} ×${y.deal} · 🙂 ×${y.fair} · ${BUBBLES.pricey} ×${y.pricey}`, `${y.walk} walked off at the price.`, 'Lots of “What a deal!” means the price could go up.');
    }
    const list = h('ul', { class: 'plain gig-lines' });
    const done = h('button', { class: 'btn open-btn hidden', onclick: () => (this.log.dayWatched(), this.go('report')) }, `Collect ${usd(g.offer.pay, false)} →`);
    let i = 0;
    const next = () => {
      if (i < lines.length) {
        list.append(h('li', { class: 'enter' }, lines[i++]!));
        if (i === lines.length) done.classList.remove('hidden');
      }
    };
    next();
    const timer = setInterval(next, (20_000 - 2000) / lines.length);
    mount(
      this.app.root,
      h(
        'div',
        { class: 'report' },
        h('header', { class: 'report-head' }, h('span', { class: 'muted small' }, `${DAYS[rep.weekday]} · ${rep.weather.name}, ${rep.weather.temp}°`), h('h1', null, `🛵 ${g.offer.name}`)),
        h('main', { class: 'scroll stack' }, h('section', { class: 'card' }, list), h('button', { class: 'btn', onclick: () => { while (i < lines.length) next(); } }, 'Skip ⏭')),
        h('footer', { class: 'open-bar' }, done),
      ),
    );
    return () => clearInterval(timer);
  }

  // ---------------------------------------------------------------- the business day

  private renderDay(): () => void {
    const r = this.last!;
    const rep = r.report;
    const res = rep.result!;
    const tl = buildTimeline(r.events);
    let speed = Number(sessionStorage.getItem(SPEED_KEY) ?? 1) || 1;
    let slowUntil = -1;
    const momentsShown = new Set<number>();
    const clockEl = h('strong', { class: 'clock' }, clock(0));
    const soldEl = h('strong', null, `0 / ${res.made}`);
    const cashEl = h('strong', null, usd(tl.openCash));
    const reactEl = h('div', { class: 'reactions' });
    const soldOutEl = h('div', { class: 'soldout-banner hidden' });
    const momentEl = h('div', { class: 'moment-banner hidden' });
    const doneBtn = h('button', { class: 'btn open-btn hidden', onclick: () => (this.log.dayWatched(), this.go('report')) }, 'See today’s report →');
    const speedBtns = [1, 2, 4].map((n) =>
      h(
        'button',
        {
          class: `btn speed ${n === speed ? 'on' : ''}`,
          'aria-pressed': String(n === speed),
          onclick: () => {
            speed = n;
            sessionStorage.setItem(SPEED_KEY, String(n));
            this.log.speed(n);
            if (slowUntil < 0) scene()?.setSpeed(n);
            speedBtns.forEach((b, i) => b.classList.toggle('on', [1, 2, 4][i] === n));
          },
        },
        `${n}×`,
      ),
    );
    const skip = h(
      'button',
      {
        class: 'btn speed',
        onclick: () => {
          this.log.skip(scene()?.gameTime ?? 0);
          scene()?.skipToEnd();
        },
      },
      'Skip ⏭',
    );
    // Counts of each reaction up to time t, from the replay log.
    const serves = r.events.filter((e) => e.k === 'serve') as Extract<(typeof r.events)[number], { k: 'serve' }>[];
    const leaves = r.events.filter((e) => e.k === 'arrive' && e.o === 'leave') as Extract<(typeof r.events)[number], { k: 'arrive' }>[];
    const stand = rep.business === 'stand';
    const host = h('div', { class: 'canvas-host', style: `aspect-ratio:${SCENE_W}/${SCENE_H}` });
    const data: DaySceneData = {
      timeline: tl,
      stands: [{ id: 0, locationId: stand ? 'maple' : 'uptown', upgrades: { body: stand ? 1 : 0, juicer: 0, register: 0, cooler: false, umbrella: false, neon: false, speaker: false }, staffCount: 0 }],
      condition: rep.weather.condition as DaySceneData['condition'],
      dayTemp: rep.weather.temp,
      openHour: P1.openHour,
      bubbleText: (b) => BUBBLES[b],
      onServe: () => audio.ding(),
      onLeave: () => audio.walkAway(),
      onTick: (t) => {
        clockEl.textContent = t >= P1.dayMinutes ? 'Closed' : clock(t);
        const st = tl.stands.get(0);
        const sold = st ? soldAt(st, t) : 0;
        soldEl.textContent = `${sold} / ${res.made}`;
        cashEl.textContent = usd(tl.openCash + sold * (rep.price ?? 0));
        if (stand) {
          let deal = 0;
          let fair = 0;
          let pricey = 0;
          for (const s of serves) {
            if (s.t > t) break;
            if (s.b === 'deal') deal++;
            else if (s.b === 'fair') fair++;
            else if (s.b === 'pricey') pricey++;
          }
          const walk = leaves.filter((e) => e.t <= t && e.b === 'tooExpensive').length;
          reactEl.textContent = `🤩 ${deal}  ·  🙂 ${fair}  ·  😬 ${pricey}  ·  🙅 ${walk}`;
        }
        if (res.soldOutAt !== null && t >= res.soldOutAt) {
          const after = leaves.filter((e) => e.t <= t && e.b === 'soldOut').length;
          soldOutEl.textContent = `🚫 SOLD OUT at ${clock(res.soldOutAt)} · ${after} ${after === 1 ? 'person has' : 'people have'} left since`;
          soldOutEl.classList.remove('hidden');
        }
        // Three labelled moments: slow down and say what is happening.
        rep.moments.forEach((m, i) => {
          if (momentsShown.has(i) || t < m.t - 6 || t > m.t + 2) return;
          momentsShown.add(i);
          this.log.momentSeen(i, speed);
          momentEl.textContent = `👀 ${m.label}`;
          momentEl.classList.remove('hidden');
          slowUntil = m.t + P1.moments.slowMinutes;
          scene()?.setSpeed(P1.moments.slowSpeed);
        });
        if (slowUntil >= 0 && t >= slowUntil) {
          slowUntil = -1;
          momentEl.classList.add('hidden');
          scene()?.setSpeed(speed);
        }
        if (t >= tl.close && doneBtn.classList.contains('hidden')) {
          doneBtn.classList.remove('hidden');
          skip.setAttribute('disabled', '');
          momentEl.classList.add('hidden');
        }
      },
    };
    mount(
      this.app.root,
      h(
        'div',
        { class: 'dayview' },
        h(
          'header',
          { class: 'topbar day-top' },
          h('div', { class: 'tb-cell' }, h('span', { class: 'tb-label' }, 'Time'), clockEl),
          h('div', { class: 'tb-cell' }, h('span', { class: 'tb-label' }, 'Weather'), h('span', null, `${CONDITION_ICON[data.condition]} ${rep.weather.temp}°`)),
          h('div', { class: 'tb-cell cash' }, h('span', { class: 'tb-label' }, 'Cash'), cashEl),
          h('div', { class: 'tb-cell' }, h('span', { class: 'tb-label' }, 'Sold'), soldEl),
        ),
        momentEl,
        host,
        soldOutEl,
        stand ? h('div', { class: 'card live reactions-card' }, h('div', { class: 'small muted' }, 'At the price tag'), reactEl) : null,
        h('div', { class: 'speedrow' }, ...speedBtns, skip),
        h('footer', { class: 'open-bar' }, doneBtn),
      ),
    );
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
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
    setTimeout(() => scene()?.setSpeed(speed), 50);
    audio.startDay(stand ? 'maple' : 'uptown', data.condition);
    return () => {
      audio.stopDay();
      game.destroy(true);
    };
  }

  // ---------------------------------------------------------------- the evening report

  private missedLine(m: Missed): string {
    const rep = this.last!.report;
    const what = rep.business === 'market' ? 'baked' : 'made';
    switch (m.kind) {
      case 'soldOut':
        return `You sold out at ${clock(m.at)}. ${m.walked} ${m.walked === 1 ? 'person' : 'people'} left. Making ${m.extra} more would have earned about ${usd(m.gain, false)}.`;
      case 'price':
        return m.better > m.price
          ? `You charged ${usd(m.price)}. ${m.deals} of ${m.buyers} customers thought it was a steal. At ${usd(m.better)} you would have earned about ${usd(m.gain, false)} more.`
          : `You charged ${usd(m.price)}. ${m.walked} people walked off at the price. At ${usd(m.better)} you would have earned about ${usd(m.gain, false)} more.`;
      case 'leftover':
        return `You ${what} ${m.count} too many. They keep part of their value for tomorrow; the rest cost you ${usd(m.lost)}.`;
    }
  }

  private renderReport(): void {
    const r = this.last!;
    const rep = r.report;
    const s = this.state!;
    const res = rep.result;
    const blocks: (HTMLElement | null)[] = [];
    const skipped = this.log.log?.days.at(-1)?.skippedAt != null;

    if (rep.kind === 'business' && skipped && rep.moments.length) {
      blocks.push(h('section', { class: 'card' }, h('h3', null, '📸 While you skipped'), ...rep.moments.map((m) => h('div', { class: 'small' }, `${clock(m.t)} — ${m.label}`))));
    }
    if (rep.unlocked.length || rep.levelUps || rep.goalDone) {
      blocks.push(
        h(
          'section',
          { class: 'card celebrate' },
          ...rep.unlocked.map((u) => h('div', null, u === 'cart' ? '🚚 You can afford a food cart: the next prototype starts there.' : `🔓 ${u === 'market' ? 'Market table' : 'Drink stand'} unlocked. Start it tomorrow morning.`)),
          rep.levelUps ? h('div', null, `⭐ Skill point${rep.levelUps > 1 ? 's' : ''} earned (+${rep.levelUps}). Spend ${rep.levelUps > 1 ? 'them' : 'it'} with the ⭐ button.`) : null,
          rep.goalDone ? h('div', null, `🎯 Weekly goal done: +${usd(P1.weekGoal.bonus, false)}`) : null,
        ),
      );
    }

    if (rep.kind === 'gig') {
      blocks.push(h('section', { class: 'card' }, h('h3', null, 'What you earned'), h('div', { class: 'ledger-row total good' }, h('span', null, rep.gig!.offer.name), h('span', null, usd(rep.income)))));
    } else if (res) {
      blocks.push(
        h(
          'section',
          { class: 'card' },
          h('h3', null, '1 · What you earned'),
          h('div', { class: 'ledger-row' }, h('span', null, `Sold ${res.sold} of ${res.made}${rep.price ? ` at ${usd(rep.price)}` : ''}`), h('span', null, usd(res.revenue))),
          h('div', { class: 'ledger-row' }, h('span', null, 'Cost to make'), h('span', null, usd(-res.cost))),
          res.leftover ? h('div', { class: 'ledger-row' }, h('span', null, `${res.leftover} left over, kept for tomorrow`), h('span', null, usd(res.salvage))) : null,
          h('div', { class: `ledger-row total ${res.profit >= 0 ? 'good' : 'bad'}` }, h('span', null, 'Profit'), h('span', null, usd(res.profit))),
          rep.business === 'stand'
            ? h(
                'div',
                { class: 'small' },
                `At the price tag: 🤩 ${res.reactions.deal} · 🙂 ${res.reactions.fair} · 😬 ${res.reactions.pricey} · 🙅 ${res.reactions.walk} walked off`,
                s.skills.includes('sharpEye') && res.dealWtp ? h('div', { class: 'small' }, `👁 Sharp eye: the “What a deal!” crowd would have paid about ${usd(res.dealWtp)}`) : null,
              )
            : null,
          h('div', { class: 'small muted' }, `${rep.weather.name}, ${rep.weather.temp}° · the forecast was ${rep.forecastRight ? 'right' : 'wrong'}`),
        ),
      );
      const missedCard = h(
        'section',
        { class: 'card' },
        h('h3', null, '2 · What you missed'),
        ...(rep.missed.length ? rep.missed.map((m) => h('p', null, this.missedLine(m))) : [h('p', { class: 'small' }, 'Nothing worth mentioning. You called it.')]),
      );
      blocks.push(missedCard);
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            this.log.missedSeen();
            io.disconnect();
          }
        });
        setTimeout(() => io.observe(missedCard), 300);
      }
      const sg = rep.suggestion;
      const w = rep.weather.name.toLowerCase();
      blocks.push(
        h(
          'section',
          { class: 'card' },
          h('h3', null, '3 · Something to try'),
          h(
            'p',
            null,
            sg.kind === 'price' ? `On a ${w} day like today, try about ${usd(sg.price)}.` : sg.kind === 'batch' ? `On a day like this, try making about ${sg.batch}.` : 'Keep reading the forecast the way you did today.',
          ),
        ),
      );
    }

    if (rep.weekSummary) {
      const ws = rep.weekSummary;
      blocks.push(
        h(
          'section',
          { class: 'card' },
          h('h3', null, `📅 Week ${ws.week}`),
          h('div', { class: 'ledger-row' }, h('span', null, 'Earned this week'), h('span', null, usd(ws.earned))),
          ws.units ? h('div', { class: 'ledger-row' }, h('span', null, 'Sold'), h('span', null, String(ws.units))) : null,
          ws.bestDay ? h('div', { class: 'ledger-row' }, h('span', null, `Best day (${DAYS[(ws.bestDay.day - 1) % 7]})`), h('span', null, usd(ws.bestDay.profit))) : null,
          h('div', { class: 'small' }, ws.goalDone ? '🎯 Weekly goal done ✓' : '🎯 Weekly goal missed'),
          h('p', { class: 'small muted' }, 'A good place to stop for today.'),
        ),
      );
    }

    mount(
      this.app.root,
      h(
        'div',
        { class: 'report' },
        h(
          'header',
          { class: 'report-head' },
          h('span', { class: 'muted small' }, `${DAYS[rep.weekday]} · Day ${rep.day}`),
          h('h1', { class: rep.income >= 0 ? 'good' : 'bad' }, `${rep.income >= 0 ? '+' : ''}${usd(rep.income)}`),
        ),
        h('main', { class: 'scroll stack' }, ...blocks),
        h('footer', { class: 'open-bar' }, h('button', { class: 'btn open-btn', onclick: () => (this.log.reportDone(), this.go('board')) }, 'Next morning →')),
      ),
    );
    if (rep.goalDone || rep.unlocked.length) setTimeout(() => audio.fanfare(), 300);
  }

  // ---------------------------------------------------------------- skills

  private renderSkills(): void {
    const s = this.state!;
    const need = xpForLevel(s.level);
    mount(
      this.app.root,
      h(
        'div',
        { class: 'report' },
        h('header', { class: 'report-head' }, h('h1', null, `⭐ Skills`), h('span', { class: 'muted small' }, `${s.points} point${s.points === 1 ? '' : 's'} to spend · next point at ${Math.round((100 * s.xp) / need)}%`)),
        h(
          'main',
          { class: 'scroll stack' },
          h('p', { class: 'small muted' }, 'Money you earn turns into experience. Each level gives a point.'),
          ...skillList(s).map((k) =>
            h(
              'section',
              { class: 'card upgrade' },
              h('div', { class: 'grow' }, h('strong', null, k.name), h('div', { class: 'small' }, k.does), k.blocked && !k.learned ? h('div', { class: 'small muted' }, k.blocked) : null),
              k.learned
                ? h('span', { class: 'chip good' }, 'Learned')
                : h(
                    'button',
                    {
                      class: 'btn primary',
                      disabled: !!k.blocked,
                      onclick: () => {
                        const r = learnSkill(s, k.id);
                        if (!r.ok) return toast(r.error, 'error');
                        this.state = r.state;
                        this.log.skill(k.id);
                        audio.purchase();
                        this.persist();
                        this.render();
                      },
                    },
                    `${k.cost} ⭐`,
                  ),
            ),
          ),
        ),
        h('footer', { class: 'open-bar' }, h('button', { class: 'btn open-btn', onclick: () => this.go('board') }, '← Back')),
      ),
    );
  }
}
