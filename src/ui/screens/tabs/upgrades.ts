import { CONFIG, type GlobalUpgrade, type StandUpgrade } from '../../../config';
import type { GameState, Purchase } from '../../../sim';
import { forSale, upgradeCost } from '../../../sim/stand';
import type { App } from '../../app';
import { canAfford, selectedStand, standLabel, standPicker } from '../../components';
import { h } from '../../dom';
import { purchaseLines } from '../../purchase';
import { money } from '../../text';

/** The ledger entry for what the stand owns now (the top tier for tiered upgrades). */
function ledgerEntry(s: GameState, standId: number | null, item: StandUpgrade | GlobalUpgrade): Purchase | undefined {
  return [...s.purchases].reverse().find((p) => p.standId === standId && p.item === item && !p.replaced);
}

/** M10: "Paid off in 14 days ✓", or how much it has earned back so far. */
function ledgerLine(p: Purchase | undefined): HTMLElement | null {
  if (!p || p.item === 'radio') return null;
  if (p.paidOffDay !== undefined) {
    const n = p.paidOffDay - p.day + 1;
    return h('div', { class: 'small good' }, `Paid off in ${n} day${n === 1 ? '' : 's'} ✓`);
  }
  const pct = Math.max(0, Math.min(100, (p.earnedBack / Math.max(0.01, p.cost)) * 100));
  return h(
    'div',
    { class: 'progress', title: 'Earned back' },
    h('div', { style: `width:${pct}%` }),
    h('span', null, `${money(Math.max(0, p.earnedBack), false)} of ${money(p.cost, false)} earned back`),
  );
}

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

  const row = (icon: string, name: string, current: string, next: string | null, cost: number | null, onBuy: () => void, extra: (HTMLElement | null)[] = []) =>
    h(
      'div',
      { class: 'upgrade' },
      h('span', { class: 'person-icon', 'aria-hidden': 'true' }, icon),
      h(
        'div',
        { class: 'grow' },
        h('strong', null, name),
        h('div', { class: 'small muted' }, current),
        next ? h('div', { class: 'small' }, `Next: ${next}`) : null,
        ...extra,
      ),
      cost === null
        ? h('span', { class: 'chip good' }, 'Owned')
        : h('button', { class: 'btn primary', disabled: !canAfford(s, cost), onclick: onBuy }, money(cost, false)),
    );
  const standLines = (u: StandUpgrade, cost: number | null) => [
    ledgerLine(ledgerEntry(s, stand.id, u)),
    cost !== null && forSale(u, CONFIG) ? purchaseLines(s, { action: { type: 'buyUpgrade', standId: stand.id, upgrade: u }, kind: 'upgrade', item: u, onMath: () => app.playlog.mathOpened(u), standId: stand.id, upfront: cost }) : null,
  ];
  const globalLines = (u: GlobalUpgrade) => [
    ledgerLine(ledgerEntry(s, null, u)),
    !s.globalUpgrades[u] && forSale(u, CONFIG) ? purchaseLines(s, { action: { type: 'buyGlobalUpgrade', upgrade: u }, kind: 'global', item: u, onMath: () => app.playlog.mathOpened(u), standId: null, upfront: U[u].cost }) : null,
  ];

  return h(
    'div',
    { class: 'stack' },
    standPicker(app),
    h(
      'section',
      { class: 'card' },
      h('h3', null, standLabel(stand)),
      ...order.filter((u) => forSale(u, CONFIG) || stand.upgrades[u]).map((u) => {
        const cost = upgradeCost(stand, u, CONFIG);
        const buy = () => app.act({ type: 'buyUpgrade', standId: stand.id, upgrade: u });
        if (u === 'body' || u === 'juicer' || u === 'register') {
          const tier = stand.upgrades[u];
          const tiers = U[u].tiers;
          const cur = `${tiers[tier]!.name}: ${describe(u, tier)}`;
          const next = tier + 1 < tiers.length ? `${tiers[tier + 1]!.name} — ${describe(u, tier + 1)}` : null;
          return row(ICONS[u], U[u].name, cur, next, cost, buy, standLines(u, cost));
        }
        const owned = stand.upgrades[u];
        return row(ICONS[u], U[u].name, owned ? describe(u, 1) : 'Not installed', owned ? null : describe(u, 1), cost, buy, standLines(u, cost));
      }),
    ),
    h(
      'section',
      { class: 'card' },
      h('h3', null, 'Whole business'),
      !forSale('fridge', CONFIG) && !s.globalUpgrades.fridge ? null : row(
        ICONS.fridge,
        U.fridge.name,
        s.globalUpgrades.fridge ? `Lemons keep ${U.fridge.lemonSpoilDays} days` : `Lemons keep ${CONFIG.ingredients.lemonSpoilDays} days`,
        s.globalUpgrades.fridge ? null : `Lemons keep ${U.fridge.lemonSpoilDays} days`,
        s.globalUpgrades.fridge ? null : U.fridge.cost,
        () => app.act({ type: 'buyGlobalUpgrade', upgrade: 'fridge' }),
        globalLines('fridge'),
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
        globalLines('radio'),
      ),
    ),
  );
}
