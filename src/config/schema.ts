import { arr, bool, check, type Guard, type Infer, num, obj, oneOf, opt, partialRecordOf, recordOf, str } from './guards';

export const SEASONS = ['spring', 'summer', 'fall', 'winter'] as const;
export const CONDITIONS = ['sunny', 'partlyCloudy', 'cloudy', 'rain', 'storm'] as const;
export const ARCHETYPES = ['kid', 'office', 'tourist', 'jogger', 'senior', 'student', 'fan'] as const;
export const ITEMS = ['lemons', 'sugar', 'ice', 'cups'] as const;
export const LOCATION_IDS = ['maple', 'uptown', 'campus', 'boardwalk', 'financial', 'stadium', 'neon'] as const;
export const STAFF_ROLES = ['server', 'mixer', 'promoter'] as const;
export const CAMPAIGNS = ['flyers', 'newspaper', 'radio', 'tv'] as const;
export const STAND_UPGRADES = ['body', 'juicer', 'register', 'cooler', 'umbrella', 'neon', 'speaker'] as const;
export const GLOBAL_UPGRADES = ['fridge', 'radio'] as const;

export type Season = (typeof SEASONS)[number];
export type Condition = (typeof CONDITIONS)[number];
export type Archetype = (typeof ARCHETYPES)[number];
export type Item = (typeof ITEMS)[number];
export type LocationId = (typeof LOCATION_IDS)[number];
export type StaffRole = (typeof STAFF_ROLES)[number];
export type CampaignId = (typeof CAMPAIGNS)[number];
export type StandUpgrade = (typeof STAND_UPGRADES)[number];
export type GlobalUpgrade = (typeof GLOBAL_UPGRADES)[number];

const pos = num({ min: 0 });
const posInt = num({ min: 0, int: true });
const prob = num({ min: 0, max: 1 });
const intRange = obj({ min: posInt, max: posInt });

export const calendarSchema = obj({
  seasons: arr(oneOf(SEASONS), { len: 4 }),
  seasonNames: recordOf(SEASONS, str),
  daysPerSeason: num({ min: 1, int: true }),
  daysPerWeek: num({ min: 1, int: true }),
  dayNames: arr(str, { minLen: 1 }),
  startDayOfWeek: posInt,
  weekendDays: arr(posInt),
  openHour: num({ min: 0, max: 24, int: true }),
  closeHour: num({ min: 0, max: 24, int: true }),
});

const conditionEffect = obj({ traffic: pos, thirst: pos });
export const weatherSchema = obj({
  seasonBaseTemp: recordOf(SEASONS, num()),
  dayTempStdDev: pos,
  hourly: obj({ offset: num(), amplitude: num(), startHour: num(), halfPeriodHours: num({ min: 0.1 }) }),
  conditionNames: recordOf(CONDITIONS, str),
  conditionEffects: recordOf(CONDITIONS, conditionEffect),
  seasonConditionWeights: recordOf(SEASONS, recordOf(CONDITIONS, pos)),
  thirst: obj({ base: num(), refTemp: num(), scale: num({ min: 0.1 }), min: pos, max: pos }),
  forecast: obj({ accuracy: prob, tempStdDev: pos, radioAccuracy: prob, radioTempStdDev: pos }),
});

const pack = obj({ size: num({ min: 1, int: true }), discount: num({ min: 0, max: 0.99 }) });
const item = obj({ name: str, unit: str, basePrice: num({ min: 0.0001 }), packs: arr(pack, { minLen: 1 }) });
export const ingredientsSchema = obj({
  items: recordOf(ITEMS, item),
  lemonSpoilDays: num({ min: 1, int: true }),
  priceDrift: obj({ maxStep: prob, min: pos, max: pos }),
  iceMelt: obj({ basePctPerHour: pos, refTemp: num(), degreesPerPct: num({ min: 0.1 }) }),
});

export const recipeSchema = obj({
  cupsPerPitcher: num({ min: 1, int: true }),
  lemons: intRange,
  sugar: intRange,
  ice: intRange,
  price: obj({ min: pos, max: pos, step: num({ min: 0.01 }) }),
  idealLemons: pos,
  idealSugarBase: pos,
  sourScale: num({ min: 0.1 }),
  sweetScale: num({ min: 0.1 }),
  idealIce: obj({ refTemp: num(), degreesPerCube: num({ min: 0.1 }), min: posInt, max: posInt }),
  iceScale: num({ min: 0.1 }),
  tasteWeight: prob,
  iceWeight: prob,
  complaints: obj({
    tooSour: num(),
    tooWeak: num(),
    tooSweet: num(),
    notSweet: num(),
    notColdBelow: pos,
    tooMuchIceAbove: pos,
  }),
  defaults: obj({ lemons: posInt, sugar: posInt, ice: posInt, price: pos }),
});

const archetype = obj({
  name: str,
  wtpBase: pos,
  priceSens: pos,
  qualitySens: pos,
  patience: num({ min: 0.1 }),
  sweetShift: num({ int: true }),
  hourly: arr(pos, { len: 10 }),
  weekendMultiplier: pos,
  gameDaysOnly: bool,
});
export const customersSchema = obj({
  archetypes: recordOf(ARCHETYPES, archetype),
  decision: obj({
    stopBase: prob,
    stopMax: prob,
    repFactorBase: pos,
    repScale: num({ min: 1 }),
    wtpThirstBase: pos,
    wtpThirstScale: pos,
    wtpRepBase: pos,
    wtpRepScale: pos,
    wtpSigma: pos,
    buySteepness: pos,
    fairnessMin: pos,
    fairnessMax: num({ min: 0.01 }),
    waitPenalty: prob,
    satHigh: prob,
    satLow: prob,
  }),
});

export const serviceSchema = obj({
  serveMinutes: num({ min: 0.01 }),
  visibleQueue: num({ min: 1, int: true }),
  firstPitcherReadyAtOpen: bool,
});

export const reputationSchema = obj({
  min: num(),
  max: num(),
  start: num(),
  learnRate: prob,
  satScale: pos,
  lostPenalty: pos,
  newLocationFactor: pos,
  idleDecayPerDay: pos,
});

const location = obj({
  id: oneOf(LOCATION_IDS),
  name: str,
  rent: pos,
  trafficWeekday: pos,
  trafficWeekend: pos,
  mix: partialRecordOf(ARCHETYPES, pos),
  unlockRevenue: pos,
  unlockRep: pos,
  weatherAmplify: opt(pos),
  offSeasons: opt(arr(oneOf(SEASONS))),
  offSeasonTraffic: opt(pos),
  gameDayTraffic: opt(pos),
  gameDaysPerWeek: opt(posInt),
  gameDayAnnounceDays: opt(posInt),
});
export const locationsSchema = obj({ locations: arr(location, { minLen: 1 }) });

export const standsSchema = obj({
  maxStands: num({ min: 1, int: true }),
  licenseCosts: arr(pos, { minLen: 1 }),
  startingLicenses: num({ min: 1, int: true }),
});

const named = { name: str, cost: pos };
/** M9: one-off upgrades can be parked; omitted means for sale. */
const oneOff = { ...named, forSale: opt(bool) };
export const upgradesSchema = obj({
  body: obj({ name: str, tiers: arr(obj({ ...named, appeal: pos }), { minLen: 1 }) }),
  juicer: obj({ name: str, tiers: arr(obj({ ...named, prepMinutes: pos }), { minLen: 1 }) }),
  register: obj({ name: str, tiers: arr(obj(named), { minLen: 1 }), serveMultiplierPerTier: pos }),
  cooler: obj({ ...oneOff, meltMultiplier: pos }),
  umbrella: obj({ ...oneOff, patienceBonus: pos, tempAbove: num(), conditions: arr(oneOf(CONDITIONS)) }),
  neon: obj({ ...oneOff, appealBonus: pos }),
  speaker: obj({ ...oneOff, stopMultiplier: pos, archetypes: arr(oneOf(ARCHETYPES)) }),
  fridge: obj({ ...oneOff, lemonSpoilDays: num({ min: 1, int: true }) }),
  radio: obj(oneOff),
});

export const staffSchema = obj({
  maxPerStand: posInt,
  poolSize: posInt,
  poolRefreshDays: num({ min: 1, int: true }),
  skillUpDays: num({ min: 1, int: true }),
  minSkill: posInt,
  maxSkill: posInt,
  candidateSkillMax: posInt,
  roles: obj({
    server: obj({ name: str, forHire: bool, baseWage: pos, wagePerSkill: pos, speedBase: pos, speedPerSkill: pos }),
    mixer: obj({ name: str, forHire: bool, baseWage: pos, wagePerSkill: pos, prepCutBase: pos, prepCutPerSkill: pos, prepFloor: pos }),
    promoter: obj({ name: str, forHire: bool, baseWage: pos, wagePerSkill: pos, stopBase: pos, stopPerSkill: pos }),
  }),
  names: arr(str, { minLen: 1 }),
});

const campaign = obj({
  name: str,
  cost: pos,
  days: num({ min: 1, int: true }),
  adBonus: pos,
  trafficBonus: pos,
  scope: oneOf(['location', 'all'] as const),
});
export const marketingSchema = obj({ adFactorCap: num({ min: 1 }), campaigns: recordOf(CAMPAIGNS, campaign) });

const MAJOR_EVENTS = ['heatwave', 'festival', 'lemonShortage', 'sugarSale', 'construction'] as const;
export type MajorEvent = (typeof MAJOR_EVENTS)[number];
export const eventsSchema = obj({
  majorOrder: arr(oneOf(MAJOR_EVENTS)),
  heatwave: obj({ chance: prob, seasons: arr(oneOf(SEASONS)), tempBonus: num(), minDays: posInt, maxDays: posInt }),
  festival: obj({ chance: prob, trafficMultiplier: pos, days: posInt, announceDays: posInt }),
  lemonShortage: obj({ chance: prob, priceMultiplier: pos, minDays: posInt, maxDays: posInt }),
  sugarSale: obj({ chance: prob, priceMultiplier: pos, minDays: posInt, maxDays: posInt }),
  construction: obj({ chance: prob, trafficMultiplier: pos, minDays: posInt, maxDays: posInt }),
  competitor: obj({ chancePerLocation: prob, steal: prob, stealHighRep: prob, highRepAbove: num(), days: posInt }),
  inspector: obj({ chance: prob, fine: pos, repPenalty: pos }),
});

export const progressionSchema = obj({
  startCash: num(),
  milestones: obj({
    firstHundredDay: obj({ threshold: num(), bonus: pos }),
    firstUpgrade: obj({ bonus: pos }),
    rep75: obj({ threshold: num(), bonus: pos }),
    locationUnlocked: obj({ bonus: pos }),
    standOpened: obj({ bonuses: arr(pos) }),
    netWorth: obj({ thresholds: arr(pos), bonuses: arr(pos) }),
    tycoonNetWorth: pos,
  }),
});

export const configSchema = obj({
  calendar: calendarSchema,
  weather: weatherSchema,
  ingredients: ingredientsSchema,
  recipe: recipeSchema,
  customers: customersSchema,
  service: serviceSchema,
  reputation: reputationSchema,
  locations: locationsSchema,
  stands: standsSchema,
  upgrades: upgradesSchema,
  staff: staffSchema,
  marketing: marketingSchema,
  events: eventsSchema,
  progression: progressionSchema,
});

export type GameConfig = Infer<typeof configSchema>;
export type LocationConfig = GameConfig['locations']['locations'][number];
export type ArchetypeConfig = GameConfig['customers']['archetypes'][Archetype];

/** Cross-field checks that a per-field guard can't express. */
export const validateConfig: Guard<GameConfig> = (raw, path) => {
  const c = configSchema(raw, path);
  const p = path || 'config';
  const { calendar, weather, recipe, locations, stands, staff, ingredients, progression } = c;

  check(calendar.closeHour > calendar.openHour, `${p}.calendar`, 'closeHour must be after openHour');
  check(calendar.dayNames.length === calendar.daysPerWeek, `${p}.calendar.dayNames`, 'needs one name per weekday');
  check(calendar.weekendDays.every((d) => d < calendar.daysPerWeek), `${p}.calendar.weekendDays`, 'day out of range');
  check(calendar.startDayOfWeek < calendar.daysPerWeek, `${p}.calendar.startDayOfWeek`, 'day out of range');
  check(weather.thirst.min <= weather.thirst.max, `${p}.weather.thirst`, 'min must be <= max');
  for (const s of SEASONS) {
    const total = CONDITIONS.reduce((a, k) => a + weather.seasonConditionWeights[s][k], 0);
    check(total > 0, `${p}.weather.seasonConditionWeights.${s}`, 'weights must sum to > 0');
  }
  check(ingredients.priceDrift.min <= 1 && ingredients.priceDrift.max >= 1, `${p}.ingredients.priceDrift`, 'bounds must contain 1');
  for (const k of ['lemons', 'sugar', 'ice'] as const) {
    check(recipe[k].min <= recipe[k].max, `${p}.recipe.${k}`, 'min must be <= max');
  }
  check(Math.abs(recipe.tasteWeight + recipe.iceWeight - 1) < 1e-9, `${p}.recipe`, 'tasteWeight + iceWeight must be 1');

  const ids = new Set<string>();
  for (const [i, loc] of locations.locations.entries()) {
    check(!ids.has(loc.id), `${p}.locations.locations[${i}].id`, `duplicate id ${loc.id}`);
    ids.add(loc.id);
    const total = Object.values(loc.mix).reduce((a, b) => a + (b ?? 0), 0);
    check(Math.abs(total - 100) < 1e-9, `${p}.locations.locations[${i}].mix`, `shares must sum to 100, got ${total}`);
  }
  check(locations.locations[0]?.unlockRevenue === 0, `${p}.locations`, 'first location must be unlocked from the start');
  check(stands.licenseCosts.length === stands.maxStands, `${p}.stands.licenseCosts`, 'one cost per stand');
  check(staff.minSkill <= staff.candidateSkillMax && staff.candidateSkillMax <= staff.maxSkill, `${p}.staff`, 'skill bounds');
  check(STAFF_ROLES.some((r) => staff.roles[r].forHire), `${p}.staff.roles`, 'at least one role must be for hire');
  check(staff.names.length >= staff.poolSize, `${p}.staff.names`, 'need at least poolSize names');
  const nw = progression.milestones.netWorth;
  check(nw.thresholds.length === nw.bonuses.length, `${p}.progression.milestones.netWorth`, 'one bonus per threshold');
  return c;
};
