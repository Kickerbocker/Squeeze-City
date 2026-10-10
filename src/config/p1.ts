// P1 prototype tunables (docs/specs/P1-prototype.md), validated like the v1 config.
import { arr, check, type Infer, num, obj, oneOf, str } from './guards';
import raw from './p1.json';
import { CONDITIONS } from './schema';

const pos = num({ min: 0 });
const posInt = num({ min: 0, int: true });
const share = num({ min: 0, max: 1 });
const range = arr(pos, { len: 2 });

const weather = obj({ id: str, name: str, condition: oneOf(CONDITIONS), share, demand: pos, street: pos, temp: range, market: pos });
const business = {
  name: str,
  product: str,
  gate: pos,
  cost: pos,
  unitCost: pos,
  salvage: share,
  passRatio: pos,
  maxBatch: posInt,
};

export const p1Schema = obj({
  startCash: pos,
  dayMinutes: posInt,
  openHour: posInt,
  weekendDays: arr(num({ min: 0, max: 6, int: true })),
  weather: arr(weather, { minLen: 1 }),
  forecast: arr(obj({ label: str, share, right: share, uncertainty: pos }), { minLen: 1 }),
  rangeZ: pos,
  demandNoise: pos,
  gigs: obj({ pay: range, list: arr(obj({ id: oneOf(['delivery', 'helper', 'yardsale'] as const), name: str, teaches: str }), { len: 3 }) }),
  market: obj({ ...business, price: pos, crowdWeekday: pos, crowdWeekend: pos }),
  stand: obj({
    ...business,
    baseInterested: pos,
    weekendFactor: pos,
    wtpSpread: num({ min: 0.01 }),
    priceMin: pos,
    priceMax: pos,
    priceStep: num({ min: 0.01 }),
    startPrice: pos,
  }),
  reactions: obj({ deal: num({ min: 1 }), fair: num({ min: 1 }) }),
  cartGate: pos,
  xp: obj({ base: pos, growth: num({ min: 1 }) }),
  skills: obj({
    sharpEye: obj({ name: str, cost: posInt, does: str }),
    thrifty: obj({ name: str, cost: posInt, does: str, salvage: share }),
    prepSense: obj({ name: str, cost: posInt, does: str, handDays: posInt }),
    standingOrder: obj({ name: str, cost: posInt, does: str }),
  }),
  weekGoal: obj({ bonus: pos, growth: num({ min: 1 }), defaultUnits: obj({ gigs: posInt, market: posInt, stand: posInt }), defaultEarn: pos }),
  moments: obj({ dealRun: posInt, walkRun: posInt, slowSpeed: pos, slowMinutes: pos }),
  missed: obj({ minGain: pos, maxLines: posInt }),
  hourly: arr(pos, { minLen: 1 }),
  marketHourly: arr(pos, { minLen: 1 }),
});

export type P1Config = Infer<typeof p1Schema>;
export type GigId = P1Config['gigs']['list'][number]['id'];
export type SkillId = keyof P1Config['skills'];
export const SKILL_IDS = ['sharpEye', 'thrifty', 'prepSense', 'standingOrder'] as const satisfies readonly SkillId[];

export function loadP1Config(input: unknown = raw): P1Config {
  const c = p1Schema(structuredClone(input), 'p1');
  const sum = (xs: { share: number }[]) => xs.reduce((a, x) => a + x.share, 0);
  check(Math.abs(sum(c.weather) - 1) < 1e-9, 'p1.weather', 'shares must sum to 1');
  check(Math.abs(sum(c.forecast) - 1) < 1e-9, 'p1.forecast', 'shares must sum to 1');
  check(c.reactions.deal > c.reactions.fair, 'p1.reactions', 'deal must be above fair');
  check(c.hourly.length * 60 === c.dayMinutes && c.marketHourly.length * 60 === c.dayMinutes, 'p1.hourly', 'one weight per open hour');
  check(c.market.gate < c.stand.gate && c.stand.gate < c.cartGate, 'p1', 'gates must rise');
  return c;
}

export const P1: P1Config = loadP1Config();
