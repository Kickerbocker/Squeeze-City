// M10 purchase cards: what an item should do here (projection), how long it takes to pay
// back, and the visible problem it fixes in yesterday's numbers. Plus "Show the math".
import { CONFIG, type CampaignId, type GlobalUpgrade, type StandUpgrade, type StaffRole } from '../config';
import { type GameState, type Projection, projectPurchase, type PurchaseAction } from '../sim';
import { appeal, laneSpeeds, prepMinutes, serveMinutes, stopMultiplier } from '../sim/stand';
import { h } from './dom';
import { hashJson } from './playlog/log';
import { money } from './text';

const F = CONFIG.feedback;
const MATH_KEY = 'squeeze-city:alwaysShowMath';

export function alwaysShowMath(): boolean {
  try {
    return localStorage.getItem(MATH_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAlwaysShowMath(on: boolean): void {
  try {
    localStorage.setItem(MATH_KEY, on ? '1' : '0');
  } catch {
    /* preference only */
  }
}

/** Projections are slow-ish (14 simulated days each), so they are cached per relevant state. */
const cache = new Map<string, Projection>();

function cacheKey(s: GameState, action: PurchaseAction): string {
  return hashJson([
    action,
    s.seed,
    s.day,
    s.forecast,
    s.stands.map((st) => [st.id, st.locationId, st.upgrades, st.staff.map((m) => [m.role, m.skill]), st.recipe, st.price]),
    s.campaigns,
    s.events,
    s.globalUpgrades,
    s.priceDrift,
    Object.values(s.locations).map((l) => l.rep),
    action.type === 'hire' ? s.candidates.find((c) => c.id === action.candidateId) : null,
  ]);
}

export function cachedProjection(s: GameState, action: PurchaseAction): Projection {
  const key = cacheKey(s, action);
  let p = cache.get(key);
  if (!p) {
    p = projectPurchase(s, action, CONFIG);
    if (cache.size > 300) cache.clear();
    cache.set(key, p);
  }
  return p;
}

/** Rounds an estimate: nearest $1 under $20, nearest $5 above. */
export function roundEstimate(x: number): number {
  const step = Math.abs(x) < F.roundFineBelow ? F.roundFine : F.roundCoarse;
  return Math.round(x / step) * step;
}

const est = (x: number) => {
  const r = roundEstimate(x);
  return `${r < 0 ? '−' : '+'}$${Math.abs(r).toFixed(0)}`;
};

export type ItemKey = StandUpgrade | GlobalUpgrade | StaffRole | CampaignId;
export type ItemKind = 'upgrade' | 'global' | 'staff' | 'campaign';

/** The "why" line: the visible problem the item fixes, in yesterday's numbers. */
export function whyLine(s: GameState, kind: ItemKind, item: ItemKey, standId: number | null): string {
  if (kind === 'global' && item === 'radio') {
    const hist = s.forecastHistory.slice(-F.forecastHistoryDays);
    if (!hist.length) return 'No forecast history yet.';
    const wrong = hist.filter((x) => !x.right).length;
    return `The forecast was wrong on ${wrong} of the last ${hist.length} days.`;
  }
  if (kind === 'campaign' && CONFIG.marketing.campaigns[item as CampaignId].scope === 'all') {
    const open = s.stands.filter((x) => x.locationId).length;
    return `You have ${open} stand${open === 1 ? '' : 's'} open. This reaches ${open === 1 ? 'it' : 'all of them'}.`;
  }
  const st = standId !== null ? s.stands.find((x) => x.id === standId) : undefined;
  const ys = st ? s.yesterday?.stands.find((x) => x.standId === st.id && x.locationId === st.locationId) : undefined;
  if (!ys) return 'No numbers from yesterday at this spot yet.';
  switch (item) {
    case 'juicer':
    case 'register':
    case 'server':
    case 'mixer':
    case 'umbrella':
      if (ys.lostQueue === 0) return 'Nobody left your line yesterday, so this won’t help here yet.';
      return `Yesterday ${ys.lostQueue} people (${Math.round((100 * ys.lostQueue) / Math.max(1, ys.stoppers))}%) left your line.`;
    default:
      return `Yesterday ${ys.passersby} people walked past and ${ys.stoppers} stopped.`;
  }
}

/** "Show the math": the values the item changes, old to new, from config. */
export function mathLines(s: GameState, action: PurchaseAction): string[] {
  const U = CONFIG.upgrades;
  const out: string[] = [];
  const st = 'standId' in action ? s.stands.find((x) => x.id === action.standId) : undefined;
  const x2 = (n: number) => `×${n.toFixed(2)}`;
  if (action.type === 'buyUpgrade' && st) {
    const after = structuredClone(st);
    const u = after.upgrades;
    if (action.upgrade === 'body' || action.upgrade === 'juicer' || action.upgrade === 'register') u[action.upgrade] += 1;
    else u[action.upgrade] = true;
    switch (action.upgrade) {
      case 'body':
      case 'neon':
        out.push(`Chance a passer-by stops ${x2(appeal(st, CONFIG))} → ${x2(appeal(after, CONFIG))}`);
        break;
      case 'speaker':
        out.push(`Kids, students and tourists stop ${x2(stopMultiplier(st, 'kid', CONFIG))} → ${x2(stopMultiplier(after, 'kid', CONFIG))}`);
        break;
      case 'juicer':
        out.push(`Pitcher prep ${prepMinutes(st, CONFIG).toFixed(1)} → ${prepMinutes(after, CONFIG).toFixed(1)} minutes`);
        break;
      case 'register':
        out.push(`Serving time ${serveMinutes(st, CONFIG).toFixed(1)} → ${serveMinutes(after, CONFIG).toFixed(1)} minutes`);
        break;
      case 'cooler':
        out.push(`Ice melt ×1.00 → ${x2(U.cooler.meltMultiplier)}`);
        break;
      case 'umbrella':
        out.push(`Patience above ${U.umbrella.tempAbove}°F or in rain ×1.00 → ${x2(1 + U.umbrella.patienceBonus)}`);
        break;
    }
  } else if (action.type === 'buyGlobalUpgrade') {
    const f = CONFIG.weather.forecast;
    if (action.upgrade === 'radio') out.push(`Forecast right ${Math.round(f.accuracy * 100)}% → ${Math.round(f.radioAccuracy * 100)}% of days, ±${f.tempStdDev}°F → ±${f.radioTempStdDev}°F`);
    else out.push(`Lemons keep ${CONFIG.ingredients.lemonSpoilDays} → ${U.fridge.lemonSpoilDays} days`);
  } else if (action.type === 'hire' && st) {
    const c = s.candidates.find((x) => x.id === action.candidateId);
    if (c) {
      const after = structuredClone(st);
      after.staff.push({ id: c.id, name: c.name, role: c.role, skill: c.skill, daysWorked: 0 });
      const r = CONFIG.staff.roles[c.role];
      if (c.role === 'server') out.push(`Serving lanes ${laneSpeeds(st, CONFIG).length} → ${laneSpeeds(after, CONFIG).length} (new lane at ${Math.round(laneSpeeds(after, CONFIG).at(-1)! * 100)}% speed)`);
      if (c.role === 'promoter') out.push(`Chance a passer-by stops ${x2(stopMultiplier(st, 'office', CONFIG))} → ${x2(stopMultiplier(after, 'office', CONFIG))}`);
      if (c.role === 'mixer') out.push(`Pitcher prep ${prepMinutes(st, CONFIG).toFixed(1)} → ${prepMinutes(after, CONFIG).toFixed(1)} minutes`);
      out.push(`Wage ${money(r.baseWage + r.wagePerSkill * c.skill)} a day`);
    }
  } else if (action.type === 'startCampaign') {
    const c = CONFIG.marketing.campaigns[action.campaign];
    out.push(`Chance a passer-by stops ×1.00 → ${x2(1 + c.adBonus)} on day 1, fading to nothing over ${c.days} days`);
    if (c.trafficBonus) out.push(`Foot traffic ×1.00 → ${x2(1 + c.trafficBonus)}, fading the same way`);
    out.push(`Cost ${money(c.cost, false)}, counted as ${money(c.cost / c.days)} a day`);
  }
  return out;
}

export interface CardInfo {
  action: PurchaseAction;
  kind: ItemKind;
  item: ItemKey;
  standId: number | null;
  /** One-off price for upgrades; null for staff and campaigns. */
  upfront: number | null;
  /** "after wages" / "after cost" for things paid daily. */
  dailyNote?: string;
  /** Called when the player opens "Show the math" (for the play log). */
  onMath?: () => void;
}

/**
 * The three lines and "Show the math" for one purchase card. The projection is filled in
 * after the screen draws, so opening a tab never waits on it.
 */
export function purchaseLines(s: GameState, info: CardInfo): HTMLElement {
  const gain = h('div', { class: 'small proj' }, h('span', { class: 'muted' }, 'Working out what it would do here…'));
  const second = h('div', { class: 'small' });
  const why = h('div', { class: 'small muted' }, whyLine(s, info.kind, info.item, info.standId));
  const mathList = h('ul', { class: 'plain small math' }, ...mathLines(s, info.action).map((m) => h('li', null, m)));
  const details = h('details', { class: 'math-toggle', ...(alwaysShowMath() ? { open: '' } : {}) }, h('summary', null, 'Show the math'), mathList);
  details.addEventListener('toggle', () => {
    if ((details as HTMLDetailsElement).open && !alwaysShowMath()) info.onMath?.();
  });

  const fill = () => {
    const p = cachedProjection(s, info.action);
    if (p.kind === 'unmeasurable') {
      gain.textContent = 'Helps you plan stock and price; the game can’t put a dollar figure on that.';
      second.remove();
      return;
    }
    if (p.kind === 'blocked') {
      gain.textContent = p.reason;
      second.remove();
      return;
    }
    if (p.median < F.minUsefulGain) {
      gain.replaceChildren(h('strong', null, 'Won’t help much here yet'));
      second.remove();
    } else {
      gain.replaceChildren(
        h('strong', null, `About ${est(p.median)} a day here${info.dailyNote ? ` ${info.dailyNote}` : ''}`),
        ` (typically ${est(p.low)} to ${est(p.high)})`,
      );
      if (info.upfront !== null) {
        const days = Math.max(1, Math.round(info.upfront / p.median));
        second.textContent = `Pays for itself in about ${days} day${days === 1 ? '' : 's'}`;
      } else second.remove();
    }
    mathList.append(
      h('li', { class: 'muted' }, `Tomorrow’s forecast: ${CONFIG.weather.conditionNames[s.forecast.condition]}, ${Math.round(s.forecast.temp)}°F`),
      h('li', { class: 'muted' }, `Extra profit on ${p.samples.length} sample days: ${[...p.samples].sort((a, b) => a - b).map((x) => money(x)).join(', ')}`),
    );
  };
  setTimeout(() => {
    if (gain.isConnected) fill();
  }, 0);
  return h('div', { class: 'purchase-lines' }, gain, second, why, details);
}
