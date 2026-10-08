import { describe, expect, it } from 'vitest';
import { CONFIG as C } from '../src/config';
import { conditionEffect, hourlyTemp, meanDayTemp, rollForecast, rollWeather, tempAtMinute, tempThirst } from '../src/sim/weather';

describe('weather (GDD §4)', () => {
  it('hourly curve: dayTemp − 4 + 8·sin(π(h−9)/9)', () => {
    expect(hourlyTemp(70, 9, C)).toBeCloseTo(66);
    expect(hourlyTemp(70, 13.5, C)).toBeCloseTo(74);
    expect(hourlyTemp(70, 18, C)).toBeCloseTo(66);
    expect(hourlyTemp(70, 11, C)).toBeCloseTo(70 - 4 + 8 * Math.sin((Math.PI * 2) / 9));
    expect(tempAtMinute(70, 270, C)).toBeCloseTo(74);
    expect(tempAtMinute(70, 9999, C)).toBeCloseTo(66);
    expect(meanDayTemp(70, C)).toBeGreaterThan(70);
  });

  it('T_thirst = clamp(0.4 + (temp − 50)/40, 0.2, 1.8)', () => {
    expect(tempThirst(50, C)).toBeCloseTo(0.4);
    expect(tempThirst(90, C)).toBeCloseTo(1.4);
    expect(tempThirst(30, C)).toBeCloseTo(0.2);
    expect(tempThirst(200, C)).toBeCloseTo(1.8);
  });

  it('condition multipliers and Boardwalk amplification', () => {
    expect(conditionEffect('rain', C)).toEqual({ traffic: 0.5, thirst: 0.6 });
    const amp = conditionEffect('rain', C, 1.5);
    expect(amp.traffic).toBeCloseTo(0.25);
    expect(amp.thirst).toBeCloseTo(0.4);
    expect(conditionEffect('storm', C, 1.5).traffic).toBeCloseTo(0);
    expect(conditionEffect('sunny', C, 1.5)).toEqual({ traffic: 1, thirst: 1 });
  });

  it('daily temperature ≈ seasonBase + Normal(0, 7)', () => {
    const temps = Array.from({ length: 4000 }, (_, d) => rollWeather(1, d + 1, 'summer', 0, C).dayTemp);
    const mean = temps.reduce((a, b) => a + b) / temps.length;
    const sd = Math.sqrt(temps.reduce((a, b) => a + (b - mean) ** 2, 0) / temps.length);
    expect(mean).toBeCloseTo(86, 0);
    expect(sd).toBeGreaterThan(6.5);
    expect(sd).toBeLessThan(7.5);
    expect(rollWeather(1, 5, 'summer', 12, C).dayTemp - rollWeather(1, 5, 'summer', 0, C).dayTemp).toBeCloseTo(12);
  });

  it('conditions follow the season table (summer leans sunny)', () => {
    let sunny = 0;
    for (let d = 1; d <= 4000; d++) if (rollWeather(3, d, 'summer', 0, C).condition === 'sunny') sunny++;
    expect(sunny / 4000).toBeGreaterThan(0.5);
    expect(sunny / 4000).toBeLessThan(0.6);
  });

  it('forecast is right ~80% (95% with radio), temp noise 4 (1 with radio)', () => {
    for (const [radio, acc, sd] of [
      [false, 0.8, 4],
      [true, 0.95, 1],
    ] as const) {
      let hits = 0;
      let sq = 0;
      const n = 4000;
      for (let d = 1; d <= n; d++) {
        const w = rollWeather(9, d, 'spring', 0, C);
        const f = rollForecast(9, d, w, 'spring', radio, C);
        if (f.condition === w.condition) hits++;
        sq += (f.temp - w.dayTemp) ** 2;
      }
      expect(hits / n).toBeCloseTo(acc, 1);
      expect(Math.sqrt(sq / n)).toBeCloseTo(sd, 0);
    }
  });
});
