// Generative background music. Calm by default: a soft pad, a walking bass, a plucked lead
// that wanders the scale, and on busy days light hats and a soft kick. It follows the mood
// (scene, place, weather, time of day, how busy the stand is) and changes at bar lines.
import type { SoundEngine } from './engine';
import { chordTones, makeRng, midiToHz, type Mood, musicParams, type MusicParams, nextLeadNote, PROGRESSIONS, scaleNotes } from './theory';

const LOOKAHEAD = 0.15;
const TICK_MS = 25;
const STEPS_PER_BAR = 8;

export class MusicPlayer {
  private mood: Mood = { scene: 'title', location: 'maple', condition: 'sunny', hour: 9, intensity: 0 };
  private p: MusicParams = musicParams(this.mood);
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  private bar = 0;
  private lead = 0;
  private progression: number[] = this.p.progression;
  private rng = makeRng(Date.now() >>> 0);
  /** Smoothed layer levels, so a busy lunch hour fades in rather than switching on. */
  private level = { ...this.p.layers };

  constructor(private engine: SoundEngine) {}

  setMood(m: Partial<Mood>): void {
    const next = { ...this.mood, ...m };
    const changedKey = next.scene !== this.mood.scene || next.location !== this.mood.location || next.condition !== this.mood.condition || next.loss !== this.mood.loss;
    this.mood = next;
    this.p = musicParams(next);
    if (changedKey) {
      // A new place or scene: pick a fresh phrase in the new mode on the next bar.
      const options = PROGRESSIONS[this.p.mode];
      this.progression = options[Math.floor(this.rng() * options.length)]!;
    }
    const ctx = this.engine.ctx;
    if (ctx) this.engine.musicFilter.frequency.setTargetAtTime(this.p.brightness, ctx.currentTime, changedKey ? 0.8 : 2.5);
  }

  start(): void {
    const ctx = this.engine.ctx;
    if (!ctx || this.timer) return;
    this.nextTime = ctx.currentTime + 0.1;
    this.engine.musicFilter.frequency.value = this.p.brightness;
    this.timer = setInterval(() => this.schedule(), TICK_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    const ctx = this.engine.ctx;
    if (!ctx || ctx.state !== 'running') {
      if (ctx) this.nextTime = ctx.currentTime + 0.1;
      return;
    }
    // After a long pause (tab hidden), don't try to catch up on missed notes.
    if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      this.playStep(this.nextTime);
      const eighth = 60 / this.p.bpm / 2;
      // Gentle swing: long-short eighths.
      const swing = this.p.voice.swing * eighth;
      this.nextTime += this.step % 2 === 0 ? eighth + swing : eighth - swing;
      this.step = (this.step + 1) % STEPS_PER_BAR;
      if (this.step === 0) {
        this.bar++;
        if (this.bar % 8 === 0) {
          const options = PROGRESSIONS[this.p.mode];
          this.progression = options[Math.floor(this.rng() * options.length)]!;
        }
      }
    }
  }

  private playStep(t: number): void {
    const e = this.engine;
    const p = this.p;
    for (const k of Object.keys(this.level) as (keyof typeof this.level)[]) this.level[k] += (p.layers[k] - this.level[k]) * 0.08;
    const L = this.level;
    const degree = this.progression[this.bar % this.progression.length] ?? 0;
    const chord = chordTones(p.root, p.mode, degree);
    const barLen = (60 / p.bpm) * 4;
    const s = this.step;

    // Pad: the chord, two slightly detuned voices per note, slow in and out.
    if (s === 0 && L.pad > 0.02) {
      for (const n of chord.slice(1)) {
        for (const d of [-7, 7]) {
          e.note(e.music, { freq: midiToHz(n - 12), start: t, dur: barLen * 1.15, vol: 0.016 * L.pad, type: p.voice.pad, attack: barLen * 0.35, detune: d });
        }
      }
    }
    // Bass: root on 1 and 3, a fifth now and then on busy days.
    if ((s === 0 || s === 4) && L.bass > 0.02) {
      const n = s === 4 && this.rng() < 0.35 ? chord[2]! : chord[0]!;
      e.note(e.music, { freq: midiToHz(n - 24), start: t, dur: 0.55, vol: 0.11 * L.bass, type: 'triangle', attack: 0.01 });
    }
    // Lead: wandering plucks, landing on chord tones on the beat.
    if (L.lead > 0.02 && this.rng() < p.density * (s % 2 === 0 ? 1.2 : 0.8)) {
      const scale = scaleNotes(p.root, p.mode, p.root + 7, p.root + 24);
      this.lead = nextLeadNote(this.rng, scale, this.lead || p.root + 12, chord, s % 4 === 0);
      e.note(e.music, {
        freq: midiToHz(this.lead),
        start: t,
        dur: p.voice.decay,
        vol: 0.05 * L.lead,
        type: p.voice.lead,
        partials: p.voice.partials,
        send: e.delaySend,
      });
    }
    // Hats on the off-beats, and a soft kick when it's really busy.
    if (s % 2 === 1 && L.hats > 0.05) {
      e.noiseBurst(e.music, { start: t, dur: 0.04, vol: 0.022 * L.hats, type: 'highpass', freq: 7500 });
    }
    if ((s === 0 || s === 4) && L.kick > 0.05) {
      e.note(e.music, { freq: 110, glideTo: 42, start: t, dur: 0.22, vol: 0.13 * L.kick, type: 'sine' });
    }
  }
}
