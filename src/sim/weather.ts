import { CONDITIONS, type Condition, type GameConfig, type Season } from '../config';
import { dayMinutes } from './calendar';
import { dayRng, STREAM } from './rng';
import type { Forecast, Weather } from './types';
import { clamp } from './util';

/** GDD §4: temp(h) = dayTemp − 4 + 8·sin(π·(h − 9)/9). */
export function hourlyTemp(dayTemp: number, hour: number, cfg: GameConfig): number {
  const h = cfg.weather.hourly;
  return dayTemp + h.offset + h.amplitude * Math.sin((Math.PI * (hour - h.startHour)) / h.halfPeriodHours);
}

/** Temperature at `t` minutes after opening (clamped to business hours). */
export function tempAtMinute(dayTemp: number, t: number, cfg: GameConfig): number {
  const tt = clamp(t, 0, dayMinutes(cfg));
  return hourlyTemp(dayTemp, cfg.calendar.openHour + tt / 60, cfg);
}

/** Mean temperature over business hours. */
export function meanDayTemp(dayTemp: number, cfg: GameConfig): number {
  const steps = 90;
  let total = 0;
  for (let i = 0; i <= steps; i++) total += tempAtMinute(dayTemp, (dayMinutes(cfg) * i) / steps, cfg);
  return total / (steps + 1);
}

/** GDD §4: T_thirst = clamp(0.4 + (temp − 50)/40, 0.2, 1.8). */
export function tempThirst(temp: number, cfg: GameConfig): number {
  const t = cfg.weather.thirst;
  return clamp(t.base + (temp - t.refTemp) / t.scale, t.min, t.max);
}

/**
 * W_traffic and W_thirst for a condition. `amplify` > 1 exaggerates the deviation
 * from 1 (Boardwalk ×1.5): W' = max(0, 1 − amplify·(1 − W)).
 */
export function conditionEffect(condition: Condition, cfg: GameConfig, amplify = 1): { traffic: number; thirst: number } {
  const e = cfg.weather.conditionEffects[condition];
  const amp = (w: number) => Math.max(0, 1 - amplify * (1 - w));
  return { traffic: amp(e.traffic), thirst: amp(e.thirst) };
}

/** Draws the day's real weather. */
export function rollWeather(seed: number, day: number, season: Season, tempBonus: number, cfg: GameConfig): Weather {
  const rng = dayRng(seed, day, STREAM.weather);
  const condition = rng.weighted(cfg.weather.seasonConditionWeights[season]);
  const dayTemp = cfg.weather.seasonBaseTemp[season] + rng.normal(0, cfg.weather.dayTempStdDev) + tempBonus;
  return { condition, dayTemp };
}

/** Draws the forecast shown in the morning: right `accuracy` of the time, temperature ± noise. */
export function rollForecast(seed: number, day: number, actual: Weather, season: Season, radio: boolean, cfg: GameConfig): Forecast {
  const f = cfg.weather.forecast;
  const rng = dayRng(seed, day, STREAM.forecast);
  const accuracy = radio ? f.radioAccuracy : f.accuracy;
  const sd = radio ? f.radioTempStdDev : f.tempStdDev;
  let condition = actual.condition;
  if (!rng.chance(accuracy)) {
    const weights: Partial<Record<Condition, number>> = {};
    for (const c of CONDITIONS) if (c !== actual.condition) weights[c] = cfg.weather.seasonConditionWeights[season][c];
    condition = rng.weighted(weights);
  }
  return { condition, temp: actual.dayTemp + rng.normal(0, sd) };
}
