// The Web Audio graph every sound goes through:
//   music  -> music filter --+
//   sfx --------------------+--> reverb send --> reverb --+
//   ambience ---------------+---------------------------- +--> master -> limiter -> speakers
// Volumes and mute are kept in localStorage. Everything is generated in code (no files).

const MUTE_KEY = 'squeeze-city:muted';
const MUSIC_KEY = 'squeeze-city:musicVolume';
const FX_KEY = 'squeeze-city:effectsVolume';
/** Make-up gain per bus, set by measuring output levels in a browser (see DECISIONS.md). */
const TRIM = { music: 4, sfx: 2.2, ambience: 2.5 };

function readNumber(key: string, dflt: number): number {
  try {
    const v = localStorage.getItem(key);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : dflt;
  } catch {
    return dflt;
  }
}

function write(key: string, v: string): void {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* preferences only */
  }
}

export class SoundEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  music!: GainNode;
  musicFilter!: BiquadFilterNode;
  sfx!: GainNode;
  ambience!: GainNode;
  reverbSend!: GainNode;
  /** Echo on the lead line. */
  delay!: DelayNode;
  delaySend!: GainNode;
  muted: boolean;
  musicVolume: number;
  effectsVolume: number;
  private noiseCache: AudioBuffer | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    let m = false;
    try {
      m = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      /* storage unavailable */
    }
    this.muted = m;
    this.musicVolume = readNumber(MUSIC_KEY, 0.5);
    this.effectsVolume = readNumber(FX_KEY, 0.8);
  }

  /** Runs when the context first exists (music starts from here). */
  onReady(fn: () => void): void {
    if (this.ctx) fn();
    else this.listeners.push(fn);
  }

  /** Must be called from a user gesture before sounds can play (browser rule). */
  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      this.ctx = ctx;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.2;
      limiter.connect(ctx.destination);
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.85;
      this.master.connect(limiter);

      const reverb = ctx.createConvolver();
      reverb.buffer = this.impulse(2.4);
      const reverbOut = ctx.createGain();
      reverbOut.gain.value = 0.55;
      reverb.connect(reverbOut).connect(this.master);
      this.reverbSend = ctx.createGain();
      this.reverbSend.gain.value = 1;
      this.reverbSend.connect(reverb);

      this.musicFilter = ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 3000;
      this.musicFilter.Q.value = 0.5;
      this.music = ctx.createGain();
      this.music.gain.value = this.musicVolume * TRIM.music;
      this.music.connect(this.musicFilter);
      this.musicFilter.connect(this.master);
      const musicVerb = ctx.createGain();
      musicVerb.gain.value = 0.35;
      this.musicFilter.connect(musicVerb).connect(this.reverbSend);

      this.delay = ctx.createDelay(2);
      this.delay.delayTime.value = 0.36;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.32;
      const delayTone = ctx.createBiquadFilter();
      delayTone.type = 'lowpass';
      delayTone.frequency.value = 2200;
      this.delay.connect(delayTone).connect(feedback).connect(this.delay);
      delayTone.connect(this.music);
      this.delaySend = ctx.createGain();
      this.delaySend.gain.value = 0.28;
      this.delaySend.connect(this.delay);

      this.sfx = ctx.createGain();
      this.sfx.gain.value = this.effectsVolume * TRIM.sfx;
      this.sfx.connect(this.master);
      const sfxVerb = ctx.createGain();
      sfxVerb.gain.value = 0.18;
      this.sfx.connect(sfxVerb).connect(this.reverbSend);

      this.ambience = ctx.createGain();
      this.ambience.gain.value = this.effectsVolume * TRIM.ambience;
      this.ambience.connect(this.master);

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (!this.ctx) return;
          if (document.visibilityState === 'hidden') void this.ctx.suspend();
          else void this.ctx.resume();
        });
      }
      const ls = this.listeners;
      this.listeners = [];
      for (const fn of ls) fn();
    }
    void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    write(MUTE_KEY, m ? '1' : '0');
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.05);
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    write(MUSIC_KEY, String(this.musicVolume));
    if (this.ctx) this.music.gain.setTargetAtTime(this.musicVolume * TRIM.music, this.ctx.currentTime, 0.05);
  }

  setEffectsVolume(v: number): void {
    this.effectsVolume = Math.max(0, Math.min(1, v));
    write(FX_KEY, String(this.effectsVolume));
    if (this.ctx) {
      this.sfx.gain.setTargetAtTime(this.effectsVolume * TRIM.sfx, this.ctx.currentTime, 0.05);
      this.ambience.gain.setTargetAtTime(this.effectsVolume * TRIM.ambience, this.ctx.currentTime, 0.05);
    }
  }

  /** True when sounds should be made at all (unlocked and not muted). */
  get live(): boolean {
    return !!this.ctx && !this.muted && this.ctx.state === 'running';
  }

  /** A shared 4-second white-noise buffer (seeded, so it is the same every time). */
  noise(): AudioBuffer {
    const ctx = this.ctx!;
    if (this.noiseCache) return this.noiseCache;
    const buf = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 4), ctx.sampleRate);
    let seed = 12345;
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        d[i] = (seed / 0x7fffffff) * 2 - 1;
      }
    }
    this.noiseCache = buf;
    return buf;
  }

  /** A soft room: decaying stereo noise. */
  private impulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const n = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    let seed = 777;
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < n; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        d[i] = ((seed / 0x7fffffff) * 2 - 1) * Math.pow(1 - i / n, 3.2);
      }
    }
    return buf;
  }

  /** An enveloped oscillator with optional extra partials. Returns nothing; it cleans itself up. */
  note(
    out: AudioNode,
    opts: {
      freq: number;
      start: number;
      dur: number;
      vol: number;
      type?: OscillatorType;
      attack?: number;
      partials?: [number, number][];
      glideTo?: number;
      detune?: number;
      send?: AudioNode;
    },
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const g = ctx.createGain();
    const a = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, opts.start);
    g.gain.linearRampToValueAtTime(opts.vol, opts.start + a);
    g.gain.exponentialRampToValueAtTime(0.0001, opts.start + Math.max(a + 0.01, opts.dur));
    g.connect(out);
    if (opts.send) g.connect(opts.send);
    const voices: [number, number][] = [[1, 1], ...(opts.partials ?? [])];
    for (const [ratio, level] of voices) {
      const o = ctx.createOscillator();
      o.type = ratio === 1 ? (opts.type ?? 'sine') : 'sine';
      o.frequency.setValueAtTime(opts.freq * ratio, opts.start);
      if (opts.glideTo) o.frequency.exponentialRampToValueAtTime(opts.glideTo * ratio, opts.start + opts.dur);
      if (opts.detune) o.detune.value = opts.detune;
      let node: AudioNode = o;
      if (level !== 1) {
        const pg = ctx.createGain();
        pg.gain.value = level;
        o.connect(pg);
        node = pg;
      }
      node.connect(g);
      o.start(opts.start);
      o.stop(opts.start + opts.dur + 0.05);
    }
  }

  /** A filtered noise burst. */
  noiseBurst(
    out: AudioNode,
    opts: { start: number; dur: number; vol: number; type: BiquadFilterType; freq: number; q?: number; freqTo?: number; attack?: number },
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise();
    const f = ctx.createBiquadFilter();
    f.type = opts.type;
    f.frequency.setValueAtTime(opts.freq, opts.start);
    if (opts.freqTo) f.frequency.exponentialRampToValueAtTime(opts.freqTo, opts.start + opts.dur);
    f.Q.value = opts.q ?? 0.8;
    const g = ctx.createGain();
    const a = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, opts.start);
    g.gain.linearRampToValueAtTime(opts.vol, opts.start + a);
    g.gain.exponentialRampToValueAtTime(0.0001, opts.start + Math.max(a + 0.01, opts.dur));
    src.connect(f).connect(g).connect(out);
    src.start(opts.start, Math.random() * 3);
    src.stop(opts.start + opts.dur + 0.05);
  }
}
