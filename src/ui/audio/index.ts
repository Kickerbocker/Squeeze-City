// Sound for Squeeze City (GDD §19): generated music that follows the day, ambience for each
// place and the weather, and effects for sales, pouring, walk-aways, purchases and milestones.
// Everything is made in code with Web Audio. Mute and the two volume sliders persist.
import type { Condition, LocationId } from '../../config';
import { Ambience } from './ambience';
import { SoundEngine } from './engine';
import { MusicPlayer } from './music';
import type { Mood } from './theory';

class Audio {
  readonly engine = new SoundEngine();
  private music = new MusicPlayer(this.engine);
  private amb = new Ambience(this.engine);
  private lastDing = 0;
  private lastLeave = 0;
  private dayOn = false;

  constructor() {
    this.engine.onReady(() => {
      if (this.musicOn) this.music.start();
    });
  }

  get muted(): boolean {
    return this.engine.muted;
  }

  get musicVolume(): number {
    return this.engine.musicVolume;
  }

  get effectsVolume(): number {
    return this.engine.effectsVolume;
  }

  /** Must be called from a user gesture before sounds can play. */
  unlock(): void {
    this.engine.unlock();
  }

  setMuted(m: boolean): void {
    this.engine.setMuted(m);
  }

  setMusicVolume(v: number): void {
    this.engine.setMusicVolume(v);
  }

  setEffectsVolume(v: number): void {
    this.engine.setEffectsVolume(v);
  }

  private musicOn = true;

  /** Turn the generated music off or on (the P1 prototype plays without it). */
  setMusicOn(on: boolean): void {
    if (on === this.musicOn) return;
    this.musicOn = on;
    if (on) this.engine.onReady(() => this.music.start());
    else this.music.stop();
  }

  /** What the music should follow. Safe to call often; it only changes at bar lines. */
  setMood(m: Partial<Mood>): void {
    this.music.setMood(m);
  }

  /** Start the day: music and the place's soundscape. */
  startDay(location: LocationId, condition: Condition): void {
    this.dayOn = true;
    this.music.setMood({ scene: 'day', location, condition, hour: 9, intensity: 0 });
    this.engine.onReady(() => {
      if (this.dayOn) this.amb.start(location, condition);
    });
  }

  /** Clock and crowd during the day: the music brightens to noon and fills out when busy. */
  dayTick(hour: number, intensity: number): void {
    this.music.setMood({ hour, intensity });
    this.amb.setIntensity(intensity);
  }

  stopDay(): void {
    this.dayOn = false;
    this.amb.stop();
  }

  /** A sale: a little bell, pitched from a pentatonic set so a busy hour sounds musical. */
  ding(): void {
    const e = this.engine;
    if (!e.live) return;
    const now = e.ctx!.currentTime;
    if (now - this.lastDing < 0.12) return;
    this.lastDing = now;
    const f = [1318.5, 1568, 1760, 2093][Math.floor(Math.random() * 4)]!;
    e.note(e.sfx, { freq: f, start: now, dur: 0.5, vol: 0.07, type: 'sine', partials: [[2.76, 0.22], [5.4, 0.08]] });
    e.noiseBurst(e.sfx, { start: now, dur: 0.03, vol: 0.02, type: 'highpass', freq: 6000 });
  }

  /** A pitcher being mixed: pour, gurgle, and a clink of ice. */
  pour(): void {
    const e = this.engine;
    if (!e.live) return;
    const ctx = e.ctx!;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = e.noise();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2.2;
    f.frequency.setValueAtTime(700, now);
    f.frequency.linearRampToValueAtTime(1500, now + 0.9);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 11;
    const depth = ctx.createGain();
    depth.gain.value = 260;
    lfo.connect(depth).connect(f.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.08, now + 0.12);
    g.gain.linearRampToValueAtTime(0, now + 0.95);
    src.connect(f).connect(g).connect(e.sfx);
    src.start(now, Math.random() * 3);
    src.stop(now + 1);
    lfo.start(now);
    lfo.stop(now + 1);
    for (let i = 0; i < 3; i++) e.note(e.sfx, { freq: 3200 + Math.random() * 1400, start: now + 0.95 + i * 0.07, dur: 0.08, vol: 0.02, type: 'sine' });
  }

  /** Someone walked away unhappy: a soft, short "hmm". */
  walkAway(): void {
    const e = this.engine;
    if (!e.live) return;
    const now = e.ctx!.currentTime;
    if (now - this.lastLeave < 1.2) return;
    this.lastLeave = now;
    e.note(e.sfx, { freq: 330, glideTo: 262, start: now, dur: 0.28, vol: 0.03, type: 'triangle', attack: 0.04 });
  }

  /** A purchase: coins and a bell. */
  purchase(): void {
    const e = this.engine;
    if (!e.live) return;
    const now = e.ctx!.currentTime;
    e.note(e.sfx, { freq: 1975.5, start: now, dur: 0.12, vol: 0.05, type: 'triangle' });
    e.note(e.sfx, { freq: 2637, start: now + 0.06, dur: 0.16, vol: 0.05, type: 'triangle' });
    e.note(e.sfx, { freq: 1568, start: now + 0.14, dur: 0.7, vol: 0.06, type: 'sine', partials: [[2.76, 0.2]] });
  }

  /** Milestones and unlocks: a bright little arpeggio. */
  fanfare(): void {
    const e = this.engine;
    if (!e.live) return;
    const now = e.ctx!.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      e.note(e.sfx, { freq: f, start: now + i * 0.09, dur: 0.6 + i * 0.1, vol: 0.05, type: 'triangle', partials: [[2, 0.15]] });
    });
  }

  /** A soft tap for switching tabs. */
  tick(): void {
    const e = this.engine;
    if (!e.live) return;
    const now = e.ctx!.currentTime;
    e.note(e.sfx, { freq: 1800, start: now, dur: 0.035, vol: 0.02, type: 'triangle' });
  }
}

export const audio = new Audio();
