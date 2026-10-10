import type {
  Archetype,
  CampaignId,
  Condition,
  GlobalUpgrade,
  Item,
  LocationId,
  MajorEvent,
  Season,
  StaffRole,
  StandUpgrade,
} from '../config';

export interface LemonBatch {
  /** Day the lemons were bought. */
  day: number;
  qty: number;
  unitCost: number;
}

/** Bulk stock with an average cost basis: `value` is the total cost of the units held. */
export interface BulkStock {
  qty: number;
  value: number;
}

export interface Inventory {
  lemons: LemonBatch[];
  sugar: BulkStock;
  ice: BulkStock;
  cups: BulkStock;
}

export interface Recipe {
  /** Lemons per pitcher. */
  lemons: number;
  /** Cups of sugar per pitcher. */
  sugar: number;
  /** Ice cubes per cup. */
  ice: number;
}

export interface StandUpgrades {
  body: number;
  juicer: number;
  register: number;
  cooler: boolean;
  umbrella: boolean;
  neon: boolean;
  speaker: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  skill: number;
  daysWorked: number;
}

export interface Stand {
  id: number;
  locationId: LocationId | null;
  recipe: Recipe;
  price: number;
  upgrades: StandUpgrades;
  staff: StaffMember[];
}

export interface LocationState {
  unlocked: boolean;
  /** null until a stand has opened here for the first time. */
  rep: number | null;
}

export interface Weather {
  condition: Condition;
  /** Daily base temperature (°F), heatwave included. */
  dayTemp: number;
}

export interface Forecast {
  condition: Condition;
  temp: number;
}

export type EventKind = MajorEvent | 'competitor';

export interface GameEvent {
  kind: EventKind;
  /** First day the event has effect. */
  startDay: number;
  /** Last day the event has effect (inclusive). */
  endDay: number;
  locationId?: LocationId;
}

export interface Campaign {
  id: CampaignId;
  startDay: number;
  locationId?: LocationId;
}

export interface Candidate {
  id: string;
  name: string;
  role: StaffRole;
  skill: number;
}

/** Spending made during the current morning, rolled into the day's report. */
export interface Ledger {
  stock: number;
  ads: number;
  capital: number;
}

export interface Stats {
  cupsSold: number;
  lifetimeRevenue: number;
  bestDayProfit: number;
  bestDay: number;
  /** Net worth at the end of each day, index 0 = day 1. */
  netWorthHistory: number[];
  complaints: Partial<Record<Bubble, number>>;
}

/** M10: one upgrade bought, and how much of its cost it has earned back. */
export interface Purchase {
  item: StandUpgrade | GlobalUpgrade;
  /** For tiered upgrades (body, juicer, register), the tier bought. */
  tier?: number;
  /** null for whole-business upgrades. */
  standId: number | null;
  day: number;
  cost: number;
  earnedBack: number;
  /** Day the earnings reached the cost. */
  paidOffDay?: number;
  /** A higher tier replaced this one, so it is no longer measured. */
  replaced?: boolean;
}

/** M10: whether the forecast condition matched the day's weather. */
export interface ForecastRecord {
  day: number;
  right: boolean;
}

/** M10: yesterday's numbers per stand, for the "why" line on purchase cards. */
export interface YesterdayStand {
  standId: number;
  locationId: LocationId;
  passersby: number;
  stoppers: number;
  lostQueue: number;
}

export interface GameState {
  seed: number;
  day: number;
  cash: number;
  inventory: Inventory;
  /** Multiplicative random-walk factor per ingredient. */
  priceDrift: Record<Item, number>;
  weather: Weather;
  forecast: Forecast;
  locations: Record<LocationId, LocationState>;
  stands: Stand[];
  globalUpgrades: Record<GlobalUpgrade, boolean>;
  candidates: Candidate[];
  campaigns: Campaign[];
  events: GameEvent[];
  milestones: string[];
  ledger: Ledger;
  stats: Stats;
  /** M10 purchase ledger. */
  purchases: Purchase[];
  /** M10: the most recent days' forecast results, newest last. */
  forecastHistory: ForecastRecord[];
  /** M10: yesterday's numbers per stand; null before the first day. */
  yesterday: { day: number; stands: YesterdayStand[] } | null;
}

export interface StandPlan {
  locationId?: LocationId | null;
  recipe?: Recipe;
  price?: number;
}

/** Per-stand settings for the day (keyed by stand id). Missing fields keep the stand's current settings. */
export interface DayPlan {
  stands?: Record<number, StandPlan>;
}

export type Bubble =
  | 'delicious'
  | 'tooSour'
  | 'tooWeak'
  | 'tooSweet'
  | 'notSweet'
  | 'notCold'
  | 'tooMuchIce'
  | 'overpriced'
  | 'slowService'
  | 'tooExpensive'
  | 'lineTooLong'
  | 'soldOut';

export interface StockSnapshot {
  lemons: number;
  sugar: number;
  ice: number;
  cups: number;
}

/** The event log that the day scene replays. `t` is minutes since opening; `s` is the stand id. */
export type SimEvent =
  | { k: 'open'; t: number; stock: StockSnapshot; cash: number }
  | { k: 'hour'; t: number; hour: number; temp: number; stock: StockSnapshot }
  /** A passerby appears. `o` = what they do: walk past, join the line, or leave with a bubble. */
  | { k: 'arrive'; t: number; s: number; c: number; a: Archetype; o: 'pass' | 'queue' | 'leave'; b?: Bubble }
  /** A queued customer reaches a serving lane and pays. */
  | { k: 'serve'; t: number; s: number; c: number; lane: number; dur: number; price: number; b?: Bubble }
  /** A queued customer gives up because the stand sold out. */
  | { k: 'quit'; t: number; s: number; c: number; b: 'soldOut' }
  | { k: 'pitcher'; t: number; s: number; ready: number }
  | { k: 'soldOut'; t: number; s: number }
  | { k: 'close'; t: number };

export interface StandReport {
  standId: number;
  locationId: LocationId;
  passersby: number;
  stoppers: number;
  buyers: number;
  revenue: number;
  ingredients: number;
  rent: number;
  wages: number;
  lostQueue: number;
  lostSoldOut: number;
  tooExpensive: number;
  stolen: number;
  avgSat: number;
  repBefore: number;
  repAfter: number;
  complaints: Partial<Record<Bubble, number>>;
  hourlySales: number[];
  pitchers: number;
  soldOutAt: number | null;
}

export interface MilestoneHit {
  id: string;
  bonus: number;
}

export interface DayReport {
  day: number;
  season: Season;
  weather: Weather;
  forecast: Forecast;
  stands: StandReport[];
  revenue: number;
  costs: {
    ingredients: number;
    rent: number;
    wages: number;
    ads: number;
    spoilage: number;
    fines: number;
  };
  profit: number;
  /** Stock bought and upgrades/licences paid this morning (cash, not profit). */
  stockBought: number;
  capitalSpent: number;
  cashStart: number;
  cashEnd: number;
  netWorth: number;
  spoiledLemons: number;
  iceLost: number;
  inspection: { fined: boolean; fine: number } | null;
  milestones: MilestoneHit[];
  unlocked: LocationId[];
  cupsSold: number;
}

export interface DayResult {
  state: GameState;
  events: SimEvent[];
  report: DayReport;
}
