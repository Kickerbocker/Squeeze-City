import { describe, expect, it } from 'vitest';
import { LOCATION_IDS } from '../src/config';
import { chordTones, dayBrightness, makeRng, midiToHz, type Mood, musicParams, nextLeadNote, PROGRESSIONS, scaleNotes, VOICES } from '../src/ui/audio/theory';

const day = (o: Partial<Mood> = {}): Mood => ({ scene: 'day', location: 'maple', condition: 'sunny', hour: 12, intensity: 0.5, ...o });

describe('music theory', () => {
  it('builds chords and scales', () => {
    expect(midiToHz(69)).toBe(440);
    expect(chordTones(60, 'major', 0)).toEqual([60, 64, 67, 71]); // Cmaj7
    expect(chordTones(60, 'major', 5)).toEqual([69, 72, 76, 79]); // Am7
    expect(chordTones(60, 'dorian', 0)).toEqual([60, 63, 67, 70]); // Cm7
    expect(scaleNotes(60, 'major', 60, 72)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
  });

  it('progressions stay on scale degrees', () => {
    for (const list of Object.values(PROGRESSIONS)) for (const p of list) for (const d of p) expect(d).toBeGreaterThanOrEqual(0), expect(d).toBeLessThan(7);
  });

  it('every place has its own key', () => {
    const roots = LOCATION_IDS.map((id) => VOICES[id].root);
    expect(new Set(roots).size).toBe(roots.length);
  });

  it('follows the day: brighter at noon, darker at closing and in the rain', () => {
    expect(dayBrightness(12)).toBeGreaterThan(dayBrightness(9));
    expect(dayBrightness(18)).toBeLessThan(dayBrightness(13));
    const sunny = musicParams(day());
    const rain = musicParams(day({ condition: 'rain' }));
    expect(rain.brightness).toBeLessThan(sunny.brightness);
    expect(rain.mode).toBe('dorian');
    expect(rain.layers.kick).toBe(0);
  });

  it('fills out as the stand gets busy', () => {
    const quiet = musicParams(day({ intensity: 0 }));
    const busy = musicParams(day({ intensity: 1 }));
    expect(busy.bpm).toBeGreaterThan(quiet.bpm);
    expect(busy.density).toBeGreaterThan(quiet.density);
    expect(quiet.layers.hats).toBe(0);
    expect(busy.layers.hats).toBeGreaterThan(0);
    expect(busy.layers.kick).toBeGreaterThan(0);
  });

  it('sets a calm morning and a warm evening, gentler after a loss', () => {
    expect(musicParams({ ...day(), scene: 'hub' }).bpm).toBeLessThan(musicParams(day()).bpm);
    const evening = musicParams({ ...day(), scene: 'report' });
    expect(evening.bpm).toBeLessThan(70);
    expect(evening.mode).toBe('lydian');
    expect(musicParams({ ...day(), scene: 'report', loss: true }).mode).toBe('dorian');
  });

  it('the lead stays in range and lands on chord tones on the beat', () => {
    const rng = makeRng(5);
    const scale = scaleNotes(60, 'major', 67, 84);
    const chord = chordTones(60, 'major', 3);
    let n = 72;
    for (let i = 0; i < 500; i++) {
      const strong = i % 4 === 0;
      n = nextLeadNote(rng, scale, n, chord, strong);
      expect(scale).toContain(n);
      if (strong) expect(chord.map((c) => c % 12)).toContain(n % 12);
    }
  });
});
