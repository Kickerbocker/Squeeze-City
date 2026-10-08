import { CONFIG } from '../../../config';
import { todayUnitPrice } from '../../../sim/game';
import type { Recipe } from '../../../sim';
import type { App } from '../../app';
import { selectedStand, standPicker, stat, stepper } from '../../components';
import { h } from '../../dom';
import { BUBBLES, money } from '../../text';

export function costPerCup(app: App, r: Recipe): number {
  const s = app.game;
  const p = (i: 'lemons' | 'sugar' | 'ice' | 'cups') => todayUnitPrice(s, i, CONFIG);
  return (r.lemons * p('lemons') + r.sugar * p('sugar')) / CONFIG.recipe.cupsPerPitcher + r.ice * p('ice') + p('cups');
}

export function recipeTab(app: App): HTMLElement {
  const stand = selectedStand(app);
  const r = stand.recipe;
  const c = CONFIG.recipe;
  const set = (next: Partial<Recipe>) => app.act({ type: 'setRecipe', standId: stand.id, recipe: { ...r, ...next } });
  const setPrice = (p: number) => app.act({ type: 'setPrice', standId: stand.id, price: Math.round(p * 100) / 100 });
  const cost = costPerCup(app, r);
  const margin = stand.price - cost;
  const step = c.price.step;
  const priceBtn = (delta: number) =>
    h(
      'button',
      {
        class: 'btn small-btn',
        disabled: stand.price + delta < c.price.min - 1e-9 || stand.price + delta > c.price.max + 1e-9,
        onclick: () => setPrice(stand.price + delta),
      },
      `${delta > 0 ? '+' : '−'}${money(Math.abs(delta))}`,
    );

  // Yesterday's feedback for this stand, so the bubbles translate into recipe changes.
  const last = app.lastDay?.report.stands.find((x) => x.standId === stand.id);
  const complaints = last
    ? (Object.entries(last.complaints) as [keyof typeof BUBBLES, number][]).sort((a, b) => b[1] - a[1]).slice(0, 3)
    : [];

  return h(
    'div',
    { class: 'stack' },
    standPicker(app),
    h(
      'section',
      { class: 'card' },
      h('h3', null, 'Recipe'),
      h('p', { class: 'small muted' }, `One pitcher makes ${c.cupsPerPitcher} cups.`),
      stepper(
        'Lemons',
        String(r.lemons),
        r.lemons > c.lemons.min ? () => set({ lemons: r.lemons - 1 }) : null,
        r.lemons < c.lemons.max ? () => set({ lemons: r.lemons + 1 }) : null,
        'per pitcher',
      ),
      stepper(
        'Sugar',
        String(r.sugar),
        r.sugar > c.sugar.min ? () => set({ sugar: r.sugar - 1 }) : null,
        r.sugar < c.sugar.max ? () => set({ sugar: r.sugar + 1 }) : null,
        'cups per pitcher',
      ),
      stepper(
        'Ice',
        String(r.ice),
        r.ice > c.ice.min ? () => set({ ice: r.ice - 1 }) : null,
        r.ice < c.ice.max ? () => set({ ice: r.ice + 1 }) : null,
        'cubes per cup',
      ),
    ),
    h(
      'section',
      { class: 'card' },
      h('h3', null, 'Price'),
      h('div', { class: 'price-row' }, priceBtn(-5 * step), priceBtn(-step), h('output', { class: 'price' }, money(stand.price)), priceBtn(step), priceBtn(5 * step)),
      h(
        'div',
        { class: 'stats3' },
        stat('Cost per cup', money(cost)),
        stat('Margin per cup', money(margin), margin < 0 ? 'bad' : 'good'),
        stat('Margin', stand.price > 0 ? `${Math.round((margin / stand.price) * 100)}%` : '—'),
      ),
      margin < 0 ? h('p', { class: 'warn small' }, 'You lose money on every cup at this price.') : null,
    ),
    last
      ? h(
          'section',
          { class: 'card' },
          h('h3', null, 'Yesterday at this stand'),
          h('p', { class: 'small' }, `${last.buyers} sold · ${last.tooExpensive} said too expensive · satisfaction ${Math.round(last.avgSat * 100)}%`),
          complaints.length
            ? h('ul', { class: 'complaints' }, ...complaints.map(([k, n]) => h('li', null, `${BUBBLES[k]} ×${n}`)))
            : h('p', { class: 'small muted' }, 'No complaints. 🎉'),
        )
      : h('p', { class: 'small muted center' }, 'Tip: customers’ thought bubbles tell you what to change.'),
  );
}
