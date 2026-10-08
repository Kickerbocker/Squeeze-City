import type { Item } from '../src/config';
import { dispatch, type GameState } from '../src/sim';

export function buy(s: GameState, item: Item, pack: number, count = 1): GameState {
  const r = dispatch(s, { type: 'buy', item, pack, count });
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

/** A modest daily stock-up used by tests. */
export function stockUp(s: GameState): GameState {
  s = buy(s, 'lemons', 0, 3);
  s = buy(s, 'sugar', 0, 2);
  s = buy(s, 'ice', 0, 2);
  return buy(s, 'cups', 0, 1);
}
