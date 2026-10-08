import { CONFIG, type GlobalUpgrade, type StandUpgrade } from '../../../config';
import { upgradeCost } from '../../../sim/stand';
import type { App } from '../../app';
import { canAfford, selectedStand, standLabel, standPicker } from '../../components';
import { h } from '../../dom';
import { money } from '../../text';

const U = CONFIG.upgrades;

function describe(u: StandUpgrade, tier: number): string {
  switch (u) {
    case 'body':
      return `Appeal ×${U.body.tiers[tier]!.appeal.toFixed(2)} — more people stop`;
    case 'juicer':
      return `Pitcher prep ${U.juicer.tiers[tier]!.prepMinutes} min`;
    case 'register':
      return `Serving ${Math.round(Math.pow(U.register.serveMultiplierPerTier, tier) * 100)}% of base time`;
    case 'cooler':
      return `Ice melts ${Math.round((1 - U.cooler.meltMultiplier) * 100)}% slower`;
    case 'umbrella':
      return `Patience +${Math.round(U.umbrella.patienceBonus * 100)}% above ${U.umbrella.tempAbove}°F or in rain`;
    case 'neon':
      return `Appeal +${U.neon.appealBonus.toFixed(2)}`;
    case 'speaker':
      return `Kids, students & tourists stop ${Math.round((U.speaker.stopMultiplier - 1) * 100)}% more`;
  }
}

const ICONS: Record<StandUpgrade | GlobalUpgrade, string> = {
  body: '🏪',
  juicer: '🍹',
  register: '🧾',
  cooler: '❄️',
  umbrella: '⛱️',
  neon: '💡',
  speaker: '🔊',
  fridge: '🧊',
  radio: '📻',
};

export function upgradesTab(app: App): HTMLElement {
  const s = app.game;
  const stand = selectedStand(app);
  const order: StandUpgrade[] = ['body', 'juicer', 'register', 'cooler', 'umbrella', 'neon', 'speaker'];

  const row = (icon: string, name: string, current: string, next: string | null, cost: number | null, onBuy: () => void) =>
    h(
      'div',
      { class: 'upgrade' },
      h('span', { class: 'person-icon', 'aria-hidden': 'true' }, icon),
      h('div', { class: 'grow' }, h('strong', null, name), h('div', { class: 'small muted' }, current), next ? h('div', { class: 'small' }, `Next: ${next}`) : null),
      cost === null
        ? h('span', { class: 'chip good' }, 'Owned')
        : h('button', { class: 'btn primary', disabled: !canAfford(s, cost), onclick: onBuy }, money(cost, false)),
    );

  return h(
    'div',
    { class: 'stack' },
    standPicker(app),
    h(
      'section',
      { class: 'card' },
      h('h3', null, standLabel(stand)),
      ...order.map((u) => {
        const cost = upgradeCost(stand, u, CONFIG);
        const buy = () => app.act({ type: 'buyUpgrade', standId: stand.id, upgrade: u });
        if (u === 'body' || u === 'juicer' || u === 'register') {
          const tier = stand.upgrades[u];
          const tiers = U[u].tiers;
          const cur = `${tiers[tier]!.name}: ${describe(u, tier)}`;
          const next = tier + 1 < tiers.length ? `${tiers[tier + 1]!.name} — ${describe(u, tier + 1)}` : null;
          return row(ICONS[u], U[u].name, cur, next, cost, buy);
        }
        const owned = stand.upgrades[u];
        return row(ICONS[u], U[u].name, owned ? describe(u, 1) : 'Not installed', owned ? null : describe(u, 1), cost, buy);
      }),
    ),
    h(
      'section',
      { class: 'card' },
      h('h3', null, 'Whole business'),
      row(
        ICONS.fridge,
        U.fridge.name,
        s.globalUpgrades.fridge ? `Lemons keep ${U.fridge.lemonSpoilDays} days` : `Lemons keep ${CONFIG.ingredients.lemonSpoilDays} days`,
        s.globalUpgrades.fridge ? null : `Lemons keep ${U.fridge.lemonSpoilDays} days`,
        s.globalUpgrades.fridge ? null : U.fridge.cost,
        () => app.act({ type: 'buyGlobalUpgrade', upgrade: 'fridge' }),
      ),
      row(
        ICONS.radio,
        U.radio.name,
        s.globalUpgrades.radio
          ? `Forecast ${Math.round(CONFIG.weather.forecast.radioAccuracy * 100)}% right, ±${CONFIG.weather.forecast.radioTempStdDev}°F`
          : `Forecast ${Math.round(CONFIG.weather.forecast.accuracy * 100)}% right, ±${CONFIG.weather.forecast.tempStdDev}°F`,
        s.globalUpgrades.radio
          ? null
          : `${Math.round(CONFIG.weather.forecast.radioAccuracy * 100)}% right, ±${CONFIG.weather.forecast.radioTempStdDev}°F (from tomorrow)`,
        s.globalUpgrades.radio ? null : U.radio.cost,
        () => app.act({ type: 'buyGlobalUpgrade', upgrade: 'radio' }),
      ),
    ),
  );
}
