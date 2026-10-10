// Background sound for each place and the weather, all synthesised: birds and a breeze in the
// park, chatter on campus, traffic and horns downtown, waves and gulls on the boardwalk, a crowd
// at the stadium, rain, and thunder in storms. A bed of filtered noise plus occasional calls.
import type { Condition, LocationId } from '../../config';
import type { SoundEngine } from './engine';

interface Bed {
  type: BiquadFilterType;
  freq: number;
  q?: number;
  vol: number;
  /** Slow swell (waves, crowd): rate in Hz and depth 0..1. */
  swell?: [number, number];
  /** Scales with how busy the stand is (crowd murmur). */
  crowd?: boolean;
}

interface Call {
  /** Seconds between calls, min and max. */
  every: [number, number];
  play: (e: SoundEngine, out: AudioNode, t: number, r: () => number) => void;
}

const bird: Call = {
  every: [1.5, 5],
  play: (e, out, t, r) => {
    const base = 2600 + r() * 1600;
    const n = 2 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const s = t + i * (0.09 + r() * 0.06);
      e.note(out, { freq: base * (1 + r() * 0.15), glideTo: base * (0.75 + r() * 0.5), start: s, dur: 0.07 + r() * 0.05, vol: 0.022, type: 'sine' });
    }
  },
};

const gull: Call = {
  every: [5, 12],
  play: (e, out, t, r) => {
    const f = 1300 + r() * 300;
    for (let i = 0; i < 2 + Math.floor(r() * 2); i++) {
      e.note(out, { freq: f, glideTo: f * 0.62, start: t + i * 0.32, dur: 0.28, vol: 0.022, type: 'triangle', partials: [[2, 0.2]] });
    }
  },
};

const horn: Call = {
  every: [9, 20],
  play: (e, out, t, r) => {
    const f = 330 + r() * 120;
    const n = r() < 0.4 ? 2 : 1;
    for (let i = 0; i < n; i++) e.note(out, { freq: f, start: t + i * 0.22, dur: 0.18, vol: 0.012, type: 'square', partials: [[1.26, 0.6]] });
  },
};

const bikeBell: Call = {
  every: [10, 22],
  play: (e, out, t) => {
    for (let i = 0; i < 2; i++) e.note(out, { freq: 2350, start: t + i * 0.12, dur: 0.35, vol: 0.014, type: 'sine', partials: [[2.7, 0.3]] });
  },
};

const cheer: Call = {
  every: [12, 26],
  play: (e, out, t) => e.noiseBurst(out, { start: t, dur: 2.4, vol: 0.05, type: 'bandpass', freq: 1100, q: 0.6, attack: 0.6 }),
};

const droplet: Call = {
  every: [0.08, 0.4],
  play: (e, out, t, r) => e.note(out, { freq: 2500 + r() * 3000, glideTo: 1500 + r() * 800, start: t, dur: 0.04, vol: 0.006 + r() * 0.006, type: 'sine' }),
};

const thunder: Call = {
  every: [10, 24],
  play: (e, out, t, r) => {
    e.noiseBurst(out, { start: t, dur: 3.5 + r() * 1.5, vol: 0.2, type: 'lowpass', freq: 220, freqTo: 70, attack: 0.08 });
    e.noiseBurst(out, { start: t, dur: 0.5, vol: 0.06, type: 'bandpass', freq: 900, q: 0.4, attack: 0.01 });
  },
};

export const SOUNDSCAPES: Record<LocationId, { beds: Bed[]; calls: Call[] }> = {
  maple: { beds: [{ type: 'lowpass', freq: 500, vol: 0.02, swell: [0.07, 0.6] }], calls: [bird] },
  uptown: { beds: [{ type: 'lowpass', freq: 300, vol: 0.035 }, { type: 'bandpass', freq: 700, q: 0.7, vol: 0.012, crowd: true }], calls: [bird, bikeBell] },
  campus: { beds: [{ type: 'bandpass', freq: 750, q: 0.7, vol: 0.022, swell: [0.23, 0.5], crowd: true }], calls: [bird, bikeBell] },
  boardwalk: { beds: [{ type: 'lowpass', freq: 650, vol: 0.06, swell: [0.09, 0.85] }, { type: 'bandpass', freq: 800, q: 0.7, vol: 0.01, crowd: true }], calls: [gull] },
  financial: { beds: [{ type: 'lowpass', freq: 240, vol: 0.05 }, { type: 'bandpass', freq: 800, q: 0.6, vol: 0.016, crowd: true }], calls: [horn] },
  stadium: { beds: [{ type: 'bandpass', freq: 950, q: 0.5, vol: 0.03, swell: [0.15, 0.4], crowd: true }, { type: 'lowpass', freq: 260, vol: 0.03 }], calls: [cheer, horn] },
  neon: { beds: [{ type: 'lowpass', freq: 220, vol: 0.045 }, { type: 'bandpass', freq: 650, q: 0.6, vol: 0.016, crowd: true }], calls: [horn] },
};

export class Ambience {
  private nodes: AudioScheduledSourceNode[] = [];
  private crowdGains: GainNode[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private running = false;

  constructor(private engine: SoundEngine) {}

  start(location: LocationId, condition: Condition): void {
    this.stop();
    const e = this.engine;
    const ctx = e.ctx;
    if (!ctx) return;
    this.running = true;
    const wet = condition === 'rain' || condition === 'storm';
    const scape = SOUNDSCAPES[location];
    const beds: Bed[] = [...scape.beds];
    if (wet) beds.push({ type: 'highpass', freq: 3200, vol: condition === 'storm' ? 0.05 : 0.035 }, { type: 'lowpass', freq: 900, vol: 0.02 });
    for (const b of beds) this.bed(b);
    // Rain quiets the birds and the crowd calls; storms bring thunder.
    const calls = wet ? [droplet, ...(condition === 'storm' ? [thunder] : []), ...scape.calls.filter((c) => c !== bird && c !== bikeBell)] : scape.calls;
    for (const c of calls) this.loopCall(c);
  }

  /** 0 = empty street, 1 = packed: the crowd murmur follows. */
  setIntensity(x: number): void {
    const ctx = this.engine.ctx;
    if (!ctx) return;
    for (const g of this.crowdGains) g.gain.setTargetAtTime(0.4 + 1.2 * Math.max(0, Math.min(1, x)), ctx.currentTime, 1.5);
  }

  stop(): void {
    this.running = false;
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    const now = this.engine.ctx?.currentTime ?? 0;
    for (const n of this.nodes) {
      try {
        n.stop(now + 0.6);
      } catch {
        /* already stopped */
      }
    }
    this.nodes = [];
    this.crowdGains = [];
  }

  private bed(b: Bed): void {
    const e = this.engine;
    const ctx = e.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = e.noise();
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = b.type;
    f.frequency.value = b.freq;
    f.Q.value = b.q ?? 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(b.vol, ctx.currentTime + 1.5);
    let chain: AudioNode = src.connect(f).connect(g);
    if (b.crowd) {
      const cg = ctx.createGain();
      cg.gain.value = 0.6;
      chain = chain.connect(cg);
      this.crowdGains.push(cg);
    }
    if (b.swell) {
      const sg = ctx.createGain();
      sg.gain.value = 1 - b.swell[1] / 2;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = b.swell[0];
      const depth = ctx.createGain();
      depth.gain.value = b.swell[1] / 2;
      lfo.connect(depth).connect(sg.gain);
      lfo.start();
      this.nodes.push(lfo);
      chain = chain.connect(sg);
    }
    chain.connect(e.ambience);
    src.start(ctx.currentTime, Math.random() * 3);
    this.nodes.push(src);
  }

  private loopCall(c: Call): void {
    const e = this.engine;
    const next = () => {
      if (!this.running) return;
      if (e.live) c.play(e, e.ambience, e.ctx!.currentTime + 0.02, Math.random);
      const [lo, hi] = c.every;
      this.timers.push(setTimeout(next, (lo + Math.random() * (hi - lo)) * 1000));
    };
    this.timers.push(setTimeout(next, Math.random() * c.every[1] * 1000));
  }
}
