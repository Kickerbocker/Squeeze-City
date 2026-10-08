import { type GameConfig, type Item, type LocationConfig, type LocationId, LOCATION_IDS } from '../config';
import { dayInfo } from './calendar';
import { dayRng, STREAM } from './rng';
import type { EventKind, GameEvent, GameState } from './types';

export function eventActive(e: GameEvent, day: number): boolean {
  return e.startDay <= day && day <= e.endDay;
}

export function eventsOn(events: readonly GameEvent[], day: number): GameEvent[] {
  return events.filter((e) => eventActive(e, day));
}

export function stadiumConfig(cfg: GameConfig): LocationConfig | undefined {
  return cfg.locations.locations.find((l) => l.gameDayTraffic !== undefined);
}

/** GDD §10: Stadium Row hosts `gameDaysPerWeek` random game days each week. */
export function isGameDay(seed: number, day: number, cfg: GameConfig): boolean {
  const loc = stadiumConfig(cfg);
  if (!loc?.gameDaysPerWeek) return false;
  const info = dayInfo(day, cfg);
  const rng = dayRng(seed, info.week, STREAM.stadium);
  const days = Array.from({ length: cfg.calendar.daysPerWeek }, (_, i) => i);
  for (let i = days.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [days[i], days[j]] = [days[j]!, days[i]!];
  }
  return days.slice(0, loc.gameDaysPerWeek).includes(info.dayOfWeek);
}

/** Festival and Construction traffic multipliers for one location on one day. */
export function eventTrafficMultiplier(events: readonly GameEvent[], locationId: LocationId, day: number, cfg: GameConfig): number {
  let m = 1;
  for (const e of eventsOn(events, day)) {
    if (e.locationId !== locationId) continue;
    if (e.kind === 'festival') m *= cfg.events.festival.trafficMultiplier;
    if (e.kind === 'construction') m *= cfg.events.construction.trafficMultiplier;
  }
  return m;
}

export function ingredientPriceMultiplier(events: readonly GameEvent[], item: Item, day: number, cfg: GameConfig): number {
  let m = 1;
  for (const e of eventsOn(events, day)) {
    if (item === 'lemons' && e.kind === 'lemonShortage') m *= cfg.events.lemonShortage.priceMultiplier;
    if (item === 'sugar' && e.kind === 'sugarSale') m *= cfg.events.sugarSale.priceMultiplier;
  }
  return m;
}

export function heatwaveBonus(events: readonly GameEvent[], day: number, cfg: GameConfig): number {
  return eventsOn(events, day).some((e) => e.kind === 'heatwave') ? cfg.events.heatwave.tempBonus : 0;
}

/** Fraction of stoppers a competitor cart steals at this location today (0 if none). */
export function competitorSteal(events: readonly GameEvent[], locationId: LocationId, rep: number, day: number, cfg: GameConfig): number {
  const active = eventsOn(events, day).some((e) => e.kind === 'competitor' && e.locationId === locationId);
  if (!active) return 0;
  const c = cfg.events.competitor;
  return rep > c.highRepAbove ? c.stealHighRep : c.steal;
}

function unlockedLocations(state: GameState): LocationId[] {
  return LOCATION_IDS.filter((id) => state.locations[id].unlocked);
}

/**
 * GDD §15: rolls the morning's random events (at most one new major event), plus
 * competitor carts per unlocked location. Returns the new events (already added to state).
 */
export function rollMorningEvents(state: GameState, cfg: GameConfig): GameEvent[] {
  const day = state.day;
  const ev = cfg.events;
  const info = dayInfo(day, cfg);
  const rng = dayRng(state.seed, day, STREAM.events);
  const created: GameEvent[] = [];
  const ongoing = (kind: EventKind) => state.events.some((e) => e.kind === kind && e.endDay >= day);
  const locs = unlockedLocations(state);

  for (const kind of ev.majorOrder) {
    const roll = rng.next();
    const sub = rng.next();
    const len = rng.next();
    if (ongoing(kind)) continue;
    const pickLoc = () => locs[Math.floor(sub * locs.length)]!;
    const span = (min: number, max: number) => min + Math.floor(len * (max - min + 1));
    let e: GameEvent | null = null;
    switch (kind) {
      case 'heatwave':
        if (ev.heatwave.seasons.includes(info.season) && roll < ev.heatwave.chance) {
          e = { kind, startDay: day, endDay: day + span(ev.heatwave.minDays, ev.heatwave.maxDays) - 1 };
        }
        break;
      case 'festival':
        if (roll < ev.festival.chance) {
          const start = day + ev.festival.announceDays;
          e = { kind, startDay: start, endDay: start + ev.festival.days - 1, locationId: pickLoc() };
        }
        break;
      case 'lemonShortage':
        if (roll < ev.lemonShortage.chance) {
          e = { kind, startDay: day, endDay: day + span(ev.lemonShortage.minDays, ev.lemonShortage.maxDays) - 1 };
        }
        break;
      case 'sugarSale':
        if (roll < ev.sugarSale.chance) {
          e = { kind, startDay: day, endDay: day + span(ev.sugarSale.minDays, ev.sugarSale.maxDays) - 1 };
        }
        break;
      case 'construction':
        if (roll < ev.construction.chance) {
          e = {
            kind,
            startDay: day,
            endDay: day + span(ev.construction.minDays, ev.construction.maxDays) - 1,
            locationId: pickLoc(),
          };
        }
        break;
    }
    if (e) {
      created.push(e);
      break;
    }
  }

  for (const id of LOCATION_IDS) {
    const roll = rng.next();
    if (!state.locations[id].unlocked) continue;
    const has = state.events.some((e) => e.kind === 'competitor' && e.locationId === id && e.endDay >= day);
    if (!has && roll < ev.competitor.chancePerLocation) {
      created.push({ kind: 'competitor', startDay: day, endDay: day + ev.competitor.days - 1, locationId: id });
    }
  }

  state.events.push(...created);
  return created;
}

export interface Notice {
  kind: EventKind | 'gameDay';
  startDay: number;
  endDay: number;
  locationId?: LocationId;
}

/** Events active today or announced for the coming days, for the morning hub and map. */
export function upcomingNotices(state: GameState, cfg: GameConfig): Notice[] {
  const day = state.day;
  const out: Notice[] = state.events
    .filter((e) => e.endDay >= day)
    .map((e) => ({ kind: e.kind, startDay: e.startDay, endDay: e.endDay, ...(e.locationId ? { locationId: e.locationId } : {}) }));
  const stadium = stadiumConfig(cfg);
  if (stadium && state.locations[stadium.id].unlocked) {
    const ahead = stadium.gameDayAnnounceDays ?? 0;
    for (let d = day; d <= day + ahead; d++) {
      if (isGameDay(state.seed, d, cfg)) out.push({ kind: 'gameDay', startDay: d, endDay: d, locationId: stadium.id });
    }
  }
  return out.sort((a, b) => a.startDay - b.startDay);
}
