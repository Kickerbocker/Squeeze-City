import type { GameConfig, Season } from '../config';

export interface DayInfo {
  day: number;
  year: number;
  season: Season;
  seasonIndex: number;
  /** 1-based day within the season. */
  dayOfSeason: number;
  /** 0 = first name in calendar.dayNames (Monday). */
  dayOfWeek: number;
  weekend: boolean;
  /** 0-based week index since the start of the game. */
  week: number;
}

export function daysPerYear(cfg: GameConfig): number {
  return cfg.calendar.seasons.length * cfg.calendar.daysPerSeason;
}

/** Calendar facts for an absolute day number (day 1 = first day of the game). */
export function dayInfo(day: number, cfg: GameConfig): DayInfo {
  const c = cfg.calendar;
  const d0 = day - 1;
  const perYear = daysPerYear(cfg);
  const inYear = d0 % perYear;
  const seasonIndex = Math.floor(inYear / c.daysPerSeason);
  const dayOfWeek = (c.startDayOfWeek + d0) % c.daysPerWeek;
  return {
    day,
    year: Math.floor(d0 / perYear) + 1,
    season: c.seasons[seasonIndex]!,
    seasonIndex,
    dayOfSeason: (inYear % c.daysPerSeason) + 1,
    dayOfWeek,
    weekend: c.weekendDays.includes(dayOfWeek),
    week: Math.floor((d0 + c.startDayOfWeek) / c.daysPerWeek),
  };
}

/** Business-day length in minutes. */
export function dayMinutes(cfg: GameConfig): number {
  return (cfg.calendar.closeHour - cfg.calendar.openHour) * 60;
}

export function businessHours(cfg: GameConfig): number {
  return cfg.calendar.closeHour - cfg.calendar.openHour;
}
