import { CONFIG } from '../../config';
import { dayInfo, upcomingNotices } from '../../sim';
import { lemonCount } from '../../sim/inventory';
import type { App, HubTab } from '../app';
import { topBar } from '../components';
import { h, mount } from '../dom';
import { EVENT_TEXT, locName } from '../text';
import { marketingTab } from './tabs/marketing';
import { mapTab } from './tabs/map';
import { recipeTab } from './tabs/recipe';
import { shopTab } from './tabs/shop';
import { staffTab } from './tabs/staff';
import { upgradesTab } from './tabs/upgrades';

const TABS: { id: HubTab; label: string; icon: string }[] = [
  { id: 'shop', label: 'Shop', icon: '🛒' },
  { id: 'recipe', label: 'Recipe', icon: '🍋' },
  { id: 'staff', label: 'Staff', icon: '🧑‍🍳' },
  { id: 'upgrades', label: 'Upgrades', icon: '🔧' },
  { id: 'marketing', label: 'Ads', icon: '📣' },
  { id: 'map', label: 'Map', icon: '🗺️' },
];

export function renderHub(app: App): void {
  const s = app.game;
  const tabBody =
    app.hubTab === 'shop'
      ? shopTab(app)
      : app.hubTab === 'recipe'
        ? recipeTab(app)
        : app.hubTab === 'staff'
          ? staffTab(app)
          : app.hubTab === 'upgrades'
            ? upgradesTab(app)
            : app.hubTab === 'marketing'
              ? marketingTab(app)
              : mapTab(app);

  const open = s.stands.filter((st) => st.locationId !== null);
  const warnings: string[] = [];
  if (open.length === 0) warnings.push('No stand is placed — pick a spot on the Map.');
  if (s.inventory.cups.qty === 0) warnings.push('No cups!');
  const needL = Math.min(...open.map((st) => st.recipe.lemons));
  const needS = Math.min(...open.map((st) => st.recipe.sugar));
  if (open.length && lemonCount(s.inventory) < needL) warnings.push('Not enough lemons for a pitcher.');
  if (open.length && s.inventory.sugar.qty < needS) warnings.push('Not enough sugar for a pitcher.');
  if (open.length && s.inventory.ice.qty === 0 && open.some((st) => st.recipe.ice > 0)) warnings.push('No ice (it melts overnight).');

  mount(
    app.root,
    h(
      'div',
      { class: 'hub' },
      topBar(app),
      notices(app),
      h(
        'nav',
        { class: 'tabs', role: 'tablist' },
        ...TABS.map((t) =>
          h(
            'button',
            {
              class: `tab ${app.hubTab === t.id ? 'on' : ''}`,
              role: 'tab',
              'aria-selected': String(app.hubTab === t.id),
              onclick: () => {
                app.hubTab = t.id;
                app.render();
                app.root.querySelector('.scroll')?.scrollTo(0, 0);
              },
            },
            h('span', { class: 'tab-icon', 'aria-hidden': 'true' }, t.icon),
            h('span', null, t.label),
          ),
        ),
      ),
      h('main', { class: 'scroll tab-body' }, tabBody),
      h(
        'footer',
        { class: 'open-bar' },
        warnings.length ? h('div', { class: 'warn small' }, `⚠️ ${warnings.join(' ')}`) : null,
        h(
          'button',
          {
            class: 'btn open-btn',
            onclick: () => {
              if (warnings.length && !window.confirm(`${warnings.join('\n')}\n\nOpen anyway?`)) return;
              app.openForBusiness();
            },
          },
          `Open for business${open.length > 1 ? ` (${open.length} stands)` : ''}`,
        ),
      ),
    ),
  );
}

function notices(app: App): HTMLElement | null {
  const s = app.game;
  const list = upcomingNotices(s, CONFIG);
  if (list.length === 0) return null;
  const when = (d: number) => (d === s.day ? 'today' : d === s.day + 1 ? 'tomorrow' : CONFIG.calendar.dayNames[dayInfo(d, CONFIG).dayOfWeek]);
  return h(
    'div',
    { class: 'notices' },
    ...list.map((n) => {
      const e = EVENT_TEXT[n.kind];
      const where = n.locationId ? ` · ${locName(n.locationId)}` : '';
      const span = n.startDay > s.day ? when(n.startDay) : n.endDay > s.day ? `until ${when(n.endDay)}` : 'today';
      return h('span', { class: 'notice' }, `${e.icon} ${e.name}${where} (${span})`);
    }),
  );
}
