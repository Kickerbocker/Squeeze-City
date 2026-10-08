// Sounds generated with Web Audio (GDD §19): cash ding, pour, street ambience, rain.
const MUTE_KEY = 'squeeze-city:muted';

class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private loops: AudioScheduledSourceNode[] = [];
  private lastDing = 0;
  muted: boolean;

  constructor() {
    let m = false;
    try {
      m = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      /* storage unavailable */
    }
    this.muted = m;
  }

  /** Must be called from a user gesture before sounds can play. */
  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.6;
      this.master.connect(this.ctx.destination);
    }
    void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    try {
      localStorage.setItem(MUTE_KEY, m ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.6, this.ctx.currentTime, 0.05);
  }

  private tone(freq: number, start: number, dur: number, vol: number, type: OscillatorType = 'sine'): void {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(this.master);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  private noiseBuffer(seconds: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * seconds), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      d[i] = (seed / 0x7fffffff) * 2 - 1;
    }
    return buf;
  }

  ding(): void {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastDing < 0.18) return;
    this.lastDing = now;
    this.tone(1318.5, now, 0.25, 0.18);
    this.tone(1760, now + 0.07, 0.35, 0.14);
  }

  pour(): void {
    if (!this.ctx || !this.master || this.muted) return;
    const buf = this.noiseBuffer(0.8);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900;
    f.Q.value = 1.5;
    const g = this.ctx.createGain();
    const now = this.ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.12, now + 0.1);
    g.gain.linearRampToValueAtTime(0, now + 0.8);
    f.frequency.linearRampToValueAtTime(1500, now + 0.8);
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }

  /** Starts the street ambience (and rain if needed) for the day view. */
  startAmbience(rain: boolean): void {
    this.stopAmbience();
    if (!this.ctx || !this.master) return;
    const loop = (filterType: BiquadFilterType, freq: number, vol: number) => {
      const buf = this.noiseBuffer(2);
      if (!buf || !this.ctx || !this.master) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      src.connect(f).connect(g).connect(this.master);
      src.start();
      this.loops.push(src);
    };
    loop('lowpass', 350, 0.05);
    if (rain) loop('highpass', 2500, 0.06);
  }

  stopAmbience(): void {
    for (const l of this.loops) {
      try {
        l.stop();
      } catch {
        /* already stopped */
      }
    }
    this.loops = [];
  }
}

export const audio = new Audio();
