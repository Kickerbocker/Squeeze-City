// Music that follows the day (GDD §19). Pure: decides keys, chords, tempo and layers from the
// mood; engine.ts and music.ts turn that into sound. No Web Audio here, so it can be tested.
import type { Condition, LocationId } from '../../config';

export type MusicScene = 'title' | 'hub' | 'day' | 'report';

export interface Mood {
  scene: MusicScene;
  location: LocationId;
  condition: Condition;
  /** Clock hour, 9 to 18.5 during the day. */
  hour: number;
  /** How busy the stand is right now, 0 to 1. */
  intensity: number;
  /** Report only: a losing day sounds gentler, not sad. */
  loss?: boolean;
}

export type Mode = 'major' | 'dorian' | 'lydian' | 'mixolydian';

const MODES: Record<Mode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

/** Each place has its own key and voice, so a new location sounds new. */
export interface Voice {
  /** MIDI root of the key. */
  root: number;
  /** Plucked lead: oscillator type and extra partials (ratio, level) for a bell or marimba colour. */
  lead: OscillatorType;
  partials: [number, number][];
  /** Lead note length in seconds. */
  decay: number;
  pad: OscillatorType;
  swing: number;
}

export const VOICES: Record<LocationId, Voice> = {
  // Marimba in the park
  maple: { root: 60, lead: 'sine', partials: [[4, 0.25], [9.2, 0.06]], decay: 0.55, pad: 'triangle', swing: 0.08 },
  // Soft electric piano uptown
  uptown: { root: 62, lead: 'triangle', partials: [[2, 0.2]], decay: 0.8, pad: 'triangle', swing: 0.12 },
  // Lo-fi keys on campus
  campus: { root: 57, lead: 'triangle', partials: [[3, 0.12]], decay: 0.7, pad: 'sawtooth', swing: 0.16 },
  // Steel pan on the boardwalk
  boardwalk: { root: 65, lead: 'sine', partials: [[2.01, 0.35], [3.98, 0.12]], decay: 0.9, pad: 'triangle', swing: 0.1 },
  // Jazzy vibraphone downtown
  financial: { root: 63, lead: 'sine', partials: [[4, 0.18], [10, 0.04]], decay: 1.1, pad: 'sawtooth', swing: 0.14 },
  // Brassy and bright at the stadium
  stadium: { root: 67, lead: 'square', partials: [], decay: 0.35, pad: 'sawtooth', swing: 0.04 },
  // Synth under the neon
  neon: { root: 58, lead: 'sawtooth', partials: [], decay: 0.5, pad: 'sawtooth', swing: 0.06 },
};

export interface MusicParams {
  bpm: number;
  root: number;
  mode: Mode;
  /** Four bars of chords as scale degrees (0 = I). */
  progression: number[];
  /** Chance of a lead note on each eighth. */
  density: number;
  /** Low-pass cutoff on the music bus, Hz: brighter at noon, darker in rain and at dusk. */
  brightness: number;
  layers: { pad: number; bass: number; lead: number; hats: number; kick: number };
  voice: Voice;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Brightness through the day: soft morning, bright noon, warm and dim towards closing. */
export function dayBrightness(hour: number): number {
  if (hour <= 12) return 2400 + ((hour - 9) / 3) * 2600;
  if (hour <= 15) return 5000;
  return clamp(5000 - ((hour - 15) / 3.5) * 3200, 1800, 5000);
}

/** Chord progressions by mode. Several per mode so long sessions don't loop one phrase. */
export const PROGRESSIONS: Record<Mode, number[][]> = {
  major: [
    [0, 5, 3, 4],
    [0, 3, 5, 4],
    [3, 4, 2, 5],
  ],
  dorian: [
    [0, 3, 6, 4],
    [0, 6, 3, 4],
  ],
  lydian: [
    [3, 0, 2, 5],
    [0, 1, 0, 4],
  ],
  mixolydian: [
    [0, 6, 3, 0],
    [0, 4, 6, 3],
  ],
};

export function musicParams(m: Mood): MusicParams {
  const voice = VOICES[m.location];
  const wet = m.condition === 'rain' || m.condition === 'storm';
  const i = clamp(m.intensity, 0, 1);
  switch (m.scene) {
    case 'title':
      return { bpm: 70, root: 60, mode: 'lydian', progression: PROGRESSIONS.lydian[0]!, density: 0.22, brightness: 3200, layers: { pad: 1, bass: 0.5, lead: 0.8, hats: 0, kick: 0 }, voice: VOICES.maple };
    case 'hub':
      return {
        bpm: 74,
        root: voice.root,
        mode: wet ? 'dorian' : 'major',
        progression: (wet ? PROGRESSIONS.dorian : PROGRESSIONS.major)[0]!,
        density: 0.2,
        brightness: wet ? 1800 : 2800,
        layers: { pad: 1, bass: 0.6, lead: 0.7, hats: 0, kick: 0 },
        voice,
      };
    case 'report':
      return {
        bpm: 66,
        root: voice.root - 5,
        mode: m.loss ? 'dorian' : 'lydian',
        progression: (m.loss ? PROGRESSIONS.dorian : PROGRESSIONS.lydian)[0]!,
        density: 0.18,
        brightness: 2200,
        layers: { pad: 1, bass: 0.7, lead: 0.6, hats: 0, kick: 0 },
        voice,
      };
    case 'day': {
      const mode: Mode = wet ? 'dorian' : m.location === 'stadium' || m.location === 'neon' ? 'mixolydian' : 'major';
      return {
        bpm: Math.round(78 + 16 * i - (wet ? 6 : 0)),
        root: voice.root,
        mode,
        progression: PROGRESSIONS[mode][0]!,
        density: 0.18 + 0.34 * i,
        brightness: dayBrightness(m.hour) * (wet ? 0.55 : 1),
        layers: {
          pad: 1,
          bass: 0.7 + 0.3 * i,
          lead: 0.6 + 0.4 * i,
          hats: wet ? 0.25 * i : clamp((i - 0.15) / 0.6, 0, 1),
          kick: wet ? 0 : clamp((i - 0.5) / 0.4, 0, 1),
        },
        voice,
      };
    }
  }
}

export const midiToHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** The scale of a key across octaves, as MIDI notes from `lo` to `hi`. */
export function scaleNotes(root: number, mode: Mode, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let n = lo; n <= hi; n++) if (MODES[mode].includes((((n - root) % 12) + 12) % 12)) out.push(n);
  return out;
}

/** A seventh chord on a scale degree: MIDI notes, root first, in the octave above `root`. */
export function chordTones(root: number, mode: Mode, degree: number, size = 4): number[] {
  const steps = MODES[mode];
  const out: number[] = [];
  for (let k = 0; k < size; k++) {
    const idx = degree + 2 * k;
    out.push(root + steps[idx % 7]! + 12 * Math.floor(idx / 7));
  }
  return out;
}

/** Mulberry32, so the music varies but a test can pin it. */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The next lead note: mostly steps of one or two scale notes from the last, landing on a chord
 * tone on strong beats. Stays within the given scale range.
 */
export function nextLeadNote(rng: () => number, scale: number[], prev: number, chord: number[], strong: boolean): number {
  let idx = scale.indexOf(prev);
  if (idx < 0) idx = Math.floor(scale.length / 2);
  const step = [-2, -1, -1, 1, 1, 2, 0, 3, -3][Math.floor(rng() * 9)]!;
  idx = clamp(idx + step, 0, scale.length - 1);
  let note = scale[idx]!;
  if (strong) {
    const pcs = chord.map((c) => ((c % 12) + 12) % 12);
    let best = note;
    let bestD = Infinity;
    for (const n of scale) {
      if (!pcs.includes(((n % 12) + 12) % 12)) continue;
      const d = Math.abs(n - note);
      if (d < bestD) [best, bestD] = [n, d];
    }
    note = best;
  }
  return note;
}
