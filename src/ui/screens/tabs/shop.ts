import { CONFIG, type Item, ITEMS } from '../../../config';
import { spoilDays, todayPackCost, todayUnitPrice } from '../../../sim/game';
import { lemonCount } from '../../../sim/inventory';
import type { App } from '../../app';
import { canAfford } from '../../components';
import { h } from '../../dom';
import { money } from '../../text';

const ICON: Record<Item, string> = { lemons: '🍋', sugar: '🍚', ice: '🧊', cups: '🥤' };

export function shopTab(app: App): HTMLElement {
  const s = app.game;
  const have: Record<Item, number> = {
    lemons: lemonCount(s.inventory),
    sugar: s.inventory.sugar.qty,
    ice: s.inventory.ice.qty,
    cups: s.inventory.cups.qty,
  };
  const open = s.stands.filter((x) => x.locationId);
  // How many cups today's stock can make with the current recipes (shared pool, so use the average recipe).
  const avg = (k: 'lemons' | 'sugar' | 'ice') => (open.length ? open.reduce((a, x) => a + x.recipe[k], 0) / open.length : 0);
  const cpp = CONFIG.recipe.cupsPerPitcher;
  const limits = [
    { item: 'lemons' as Item, cups: avg('lemons') > 0 ? Math.floor(have.lemons / avg('lemons')) * cpp : Infinity },
    { item: 'sugar' as Item, cups: avg('sugar') > 0 ? Math.floor(have.sugar / avg('sugar')) * cpp : Infinity },
    { item: 'ice' as Item, cups: avg('ice') > 0 ? Math.floor(have.ice / avg('ice')) : Infinity },
    { item: 'cups' as Item, cups: have.cups },
  ];
  const canMake = Math.min(...limits.map((l) => l.cups));
  const bottleneck = limits.find((l) => l.cups === canMake)?.item;
  const shelf = spoilDays(s, CONFIG);

  return h(
    'div',
    { class: 'stack' },
    h(
      'div',
      { class: 'card summary' },
      h('div', null, h('span', { class: 'muted small' }, 'Stock makes about'), h('strong', { class: 'big' }, Number.isFinite(canMake) ? `${canMake} cups` : '—')),
      bottleneck && Number.isFinite(canMake) ? h('span', { class: 'chip' }, `Limited by ${CONFIG.ingredients.items[bottleneck].name.toLowerCase()}`) : null,
    ),
    ...ITEMS.map((item) => {
      const it = CONFIG.ingredients.items[item];
      const unit = todayUnitPrice(s, item, CONFIG);
      const ratio = unit / it.basePrice;
      const trend = ratio > 1.08 ? h('span', { class: 'bad small' }, '▲ pricey') : ratio < 0.92 ? h('span', { class: 'good small' }, '▼ cheap') : null;
      let note: HTMLElement | null = null;
      if (item === 'lemons' && s.inventory.lemons.length) {
        const soonest = s.inventory.lemons[0]!;
        const daysLeft = soonest.day + shelf - 1 - s.day;
        note = h('p', { class: 'small muted' }, `Oldest ${soonest.qty} spoil ${daysLeft <= 0 ? 'tonight' : `in ${daysLeft + 1} days`}.`);
      }
      if (item === 'ice') note = h('p', { class: 'small muted' }, 'Melts during the day; leftovers are lost at closing.');
      return h(
        'section',
        { class: 'card item' },
        h(
          'div',
          { class: 'item-head' },
          h('span', { class: 'item-icon', 'aria-hidden': 'true' }, ICON[item]),
          h('div', { class: 'grow' }, h('strong', null, it.name), h('div', { class: 'small muted' }, `${money(unit)} / ${it.unit} `, trend)),
          h('div', { class: 'have' }, h('strong', null, String(have[item])), h('span', { class: 'small muted' }, 'in stock')),
        ),
        note,
        h(
          'div',
          { class: 'packs' },
          ...it.packs.map((p, i) => {
            const cost = todayPackCost(s, item, i, CONFIG);
            return h(
              'button',
              {
                class: 'btn pack',
                disabled: !canAfford(s, cost),
                onclick: () => app.act({ type: 'buy', item, pack: i }),
              },
              h('strong', null, `+${p.size}`),
              h('span', null, money(cost)),
              p.discount > 0 ? h('span', { class: 'tiny good' }, `−${Math.round(p.discount * 100)}%`) : null,
            );
          }),
        ),
      );
    }),
  );
}
