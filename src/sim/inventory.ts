import { type GameConfig, type Item, ITEMS } from '../config';
import type { Rng } from './rng';
import type { BulkStock, Inventory, StockSnapshot } from './types';
import { cents, clamp } from './util';

export function emptyInventory(): Inventory {
  return {
    lemons: [],
    sugar: { qty: 0, value: 0 },
    ice: { qty: 0, value: 0 },
    cups: { qty: 0, value: 0 },
  };
}

export function lemonCount(inv: Inventory): number {
  return inv.lemons.reduce((a, b) => a + b.qty, 0);
}

export function stockSnapshot(inv: Inventory): StockSnapshot {
  return { lemons: lemonCount(inv), sugar: inv.sugar.qty, ice: inv.ice.qty, cups: inv.cups.qty };
}

/** Value of held stock at its purchase cost. */
export function inventoryValue(inv: Inventory): number {
  return inv.lemons.reduce((a, b) => a + b.qty * b.unitCost, 0) + inv.sugar.value + inv.ice.value + inv.cups.value;
}

/** Unit price today: base · drift · event multiplier. */
export function unitPrice(item: Item, drift: number, eventMultiplier: number, cfg: GameConfig): number {
  return cfg.ingredients.items[item].basePrice * drift * eventMultiplier;
}

/** Cost of one pack (bulk discount applied), rounded to cents. */
export function packCost(item: Item, packIndex: number, drift: number, eventMultiplier: number, cfg: GameConfig): number {
  const pack = cfg.ingredients.items[item].packs[packIndex];
  if (!pack) throw new Error(`no pack ${packIndex} for ${item}`);
  return cents(pack.size * unitPrice(item, drift, eventMultiplier, cfg) * (1 - pack.discount));
}

export function addStock(inv: Inventory, item: Item, qty: number, totalCost: number, day: number): void {
  if (item === 'lemons') {
    const unitCost = totalCost / qty;
    const last = inv.lemons[inv.lemons.length - 1];
    if (last && last.day === day && Math.abs(last.unitCost - unitCost) < 1e-9) last.qty += qty;
    else inv.lemons.push({ day, qty, unitCost });
    return;
  }
  const s = inv[item];
  s.qty += qty;
  s.value += totalCost;
}

/** Removes `n` lemons, oldest batches first. Returns their cost. Caller checks availability. */
export function takeLemons(inv: Inventory, n: number): number {
  let need = n;
  let cost = 0;
  while (need > 0) {
    const b = inv.lemons[0];
    if (!b) throw new Error('takeLemons: not enough lemons');
    const take = Math.min(need, b.qty);
    b.qty -= take;
    cost += take * b.unitCost;
    need -= take;
    if (b.qty === 0) inv.lemons.shift();
  }
  return cost;
}

/** Removes `n` units of bulk stock at average cost. Returns their cost. */
export function takeBulk(stock: BulkStock, n: number): number {
  if (n > stock.qty) throw new Error('takeBulk: not enough stock');
  if (n === 0) return 0;
  const cost = (stock.value * n) / stock.qty;
  stock.qty -= n;
  stock.value = stock.qty === 0 ? 0 : stock.value - cost;
  return cost;
}

/** GDD §5: ice melts (3 + max(0, temp − 70)/10) % of remaining stock per hour. Returns the fraction lost. */
export function iceMeltFraction(temp: number, meltMultiplier: number, cfg: GameConfig): number {
  const m = cfg.ingredients.iceMelt;
  const pct = m.basePctPerHour + Math.max(0, temp - m.refTemp) / m.degreesPerPct;
  return clamp((pct / 100) * meltMultiplier, 0, 1);
}

/** Melts ice for one hour. Returns the value lost. */
export function meltIce(inv: Inventory, fraction: number): number {
  const lost = Math.round(inv.ice.qty * fraction);
  return takeBulk(inv.ice, lost);
}

/** Lemons whose shelf life has run out by the end of `today`. */
export function expiredLemons(inv: Inventory, today: number, spoilDays: number): number {
  return inv.lemons.filter((b) => today - b.day + 1 >= spoilDays).reduce((a, b) => a + b.qty, 0);
}

/** Discards expired lemon batches. Returns count and value lost. */
export function spoilLemons(inv: Inventory, today: number, spoilDays: number): { qty: number; value: number } {
  let qty = 0;
  let value = 0;
  inv.lemons = inv.lemons.filter((b) => {
    if (today - b.day + 1 >= spoilDays) {
      qty += b.qty;
      value += b.qty * b.unitCost;
      return false;
    }
    return true;
  });
  return { qty, value };
}

/** GDD §5: daily ±5% multiplicative random walk, bounded to [0.75, 1.35]. */
export function driftPrices(drift: Record<Item, number>, rng: Rng, cfg: GameConfig): Record<Item, number> {
  const d = cfg.ingredients.priceDrift;
  const out = { ...drift };
  for (const item of ITEMS) {
    out[item] = clamp(drift[item] * (1 + rng.float(-d.maxStep, d.maxStep)), d.min, d.max);
  }
  return out;
}
