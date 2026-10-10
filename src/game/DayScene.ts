import Phaser from 'phaser';
import type { Condition, LocationId } from '../config';
import type { Bubble, StandUpgrades } from '../sim/types';
import { CONDITION_ICON, drawBackdrop, drawFarLayer, drawStand, figureKey, FIGURE_H, FIGURE_RES, GROUND_Y, lerpColor, makeFigureTextures, PALETTE, skyColor, STAND_H, STAND_W } from './art';
import { DEFAULT_LAYOUT, passSampling, pitcherAt, posesAt, type Timeline, type Walker } from './replay';

export const SCENE_W = 390;
export const SCENE_H = 460;
/** Render resolution multiplier (camera zoom) for crisp vector art on phones. */
export const RES = 2;
/** On-screen size of customer figures relative to their 22×36 design size. */
const FIG_SCALE = 1.35;
/** Game minutes per real second at 1x: a 540-minute day takes 1 minute (M10; was 3). */
export const MINUTES_PER_SECOND = 9;

export interface StandView {
  id: number;
  locationId: LocationId;
  upgrades: StandUpgrades;
  staffCount: number;
}

export interface DaySceneData {
  timeline: Timeline;
  stands: StandView[];
  condition: Condition;
  /** Day temperature, °F: hot days get a heat shimmer. */
  dayTemp: number;
  openHour: number;
  bubbleText: (b: Bubble) => string;
  onTick: (t: number) => void;
  onServe?: (price: number) => void;
  onPitcher?: () => void;
  /** Someone walked away (too expensive, line too long, sold out). */
  onLeave?: () => void;
}

const LANE_Y = [GROUND_Y + 150, GROUND_Y + 86, GROUND_Y + 74];

/** Something alive in the background: birds, gulls, passing cars. */
interface Critter {
  g: Phaser.GameObjects.Graphics;
  vx: number;
  y: number;
  phase: number;
  kind: 'bird' | 'gull' | 'car';
}

interface BubbleObj {
  box: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  key: string;
}

export class DayScene extends Phaser.Scene {
  private cfg!: DaySceneData;
  private t = 0;
  private speed = 1;
  private active = 0;
  private sample = 1;
  private sky!: Phaser.GameObjects.Graphics;
  private sun!: Phaser.GameObjects.Arc;
  private sunGlow!: Phaser.GameObjects.Arc;
  private clouds: { c: Phaser.GameObjects.Container; w: number; parts: Phaser.GameObjects.Ellipse[] }[] = [];
  private far!: Phaser.GameObjects.Graphics;
  private backdrop!: Phaser.GameObjects.Graphics;
  private light!: Phaser.GameObjects.Rectangle;
  private shimmer: Phaser.GameObjects.Graphics | null = null;
  private splashes: { e: Phaser.GameObjects.Ellipse; age: number }[] = [];
  private shadows = new Map<number, Phaser.GameObjects.Ellipse>();
  private shadowPool: Phaser.GameObjects.Ellipse[] = [];
  private baseY = new Map<number, number>();
  private coins: Phaser.GameObjects.Text[] = [];
  private lastCoin = -1;
  private coinSlot = 0;
  private neonGlow!: Phaser.GameObjects.Graphics;
  private sign!: Phaser.GameObjects.Text;
  private critters: Critter[] = [];
  private clock = 0;
  private ground!: Phaser.GameObjects.Graphics;
  private standG!: Phaser.GameObjects.Graphics;
  private standFront!: Phaser.GameObjects.Graphics;
  private soldText!: Phaser.GameObjects.Text;
  private vendors: Phaser.GameObjects.Image[] = [];
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private spritePool: Phaser.GameObjects.Image[] = [];
  private bubbles = new Map<number, BubbleObj>();
  private bubblePool: BubbleObj[] = [];
  private overflow!: Phaser.GameObjects.Text;
  private pitcherG!: Phaser.GameObjects.Graphics;
  private pitcherText!: Phaser.GameObjects.Text;
  private rain: Phaser.GameObjects.Rectangle[] = [];
  private flash!: Phaser.GameObjects.Rectangle;
  private lastServeIdx = -1;
  private lastPitcherIdx = -1;
  private leaveTimes: number[] = [];
  private lastLeaveIdx = -1;
  private soldOutShown: boolean | null = null;

  constructor() {
    super('day');
  }

  init(data: DaySceneData): void {
    this.cfg = data;
    this.t = 0;
    this.active = data.stands[0]?.id ?? 0;
    this.sprites.clear();
    this.spritePool = [];
    this.bubbles.clear();
    this.bubblePool = [];
    this.clouds = [];
    this.rain = [];
    this.splashes = [];
    this.shadows.clear();
    this.shadowPool = [];
    this.baseY.clear();
    this.coins = [];
    this.critters = [];
    this.shimmer = null;
    this.clock = 0;
    this.vendors = [];
    this.lastServeIdx = -1;
    this.lastPitcherIdx = -1;
    this.soldOutShown = null;
  }

  create(): void {
    this.cameras.main.setZoom(RES).centerOn(SCENE_W / 2, SCENE_H / 2);
    makeFigureTextures(this);
    this.makeVendorTexture();
    this.sky = this.add.graphics().setDepth(0);
    this.sunGlow = this.add.circle(0, 0, 34, 0xfff3a0, 0.25).setDepth(1);
    this.sun = this.add.circle(0, 0, 18, 0xfff3a0).setDepth(1);
    const cloudCount = { sunny: 2, partlyCloudy: 4, cloudy: 6, rain: 7, storm: 8 }[this.cfg.condition];
    for (let i = 0; i < cloudCount; i++) this.clouds.push(this.makeCloud(i));
    this.far = this.add.graphics().setDepth(2.5);
    this.backdrop = this.add.graphics().setDepth(3);
    this.ground = this.add.graphics().setDepth(4);
    this.drawGround();
    this.standG = this.add.graphics().setDepth(GROUND_Y + 10);
    this.standFront = this.add.graphics().setDepth(GROUND_Y + 30);
    this.soldText = this.add
      .text(0, 0, 'SOLD OUT', { fontFamily: 'system-ui, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#ffffff', resolution: RES * 2 })
      .setOrigin(0.5)
      .setDepth(GROUND_Y + 31)
      .setVisible(false);
    this.overflow = this.add
      .text(8, LANE_Y[1]! - 30, '', { fontFamily: 'system-ui, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#3a3226', backgroundColor: '#fff6e0', resolution: RES * 2 })
      .setPadding(4, 2, 4, 2)
      .setDepth(1000);
    this.pitcherG = this.add.graphics().setDepth(GROUND_Y + 40);
    this.pitcherText = this.add
      .text(0, 0, 'Mixing…', { fontFamily: 'system-ui, sans-serif', fontSize: '10px', color: '#3a3226', resolution: RES * 2 })
      .setOrigin(0.5)
      .setDepth(GROUND_Y + 41);
    const rainy = this.cfg.condition === 'rain' || this.cfg.condition === 'storm';
    if (rainy) {
      const n = this.cfg.condition === 'storm' ? 110 : 70;
      for (let i = 0; i < n; i++) {
        this.rain.push(this.add.rectangle((i * 53) % SCENE_W, (i * 71) % SCENE_H, 1.5, 10, 0xcfe3ff, 0.75).setDepth(2000));
      }
    }
    this.flash = this.add.rectangle(SCENE_W / 2, SCENE_H / 2, SCENE_W, SCENE_H, 0xffffff, 0).setDepth(2001);
    // Warm late-afternoon light over everything but the bubbles.
    this.light = this.add.rectangle(SCENE_W / 2, SCENE_H / 2, SCENE_W, SCENE_H, 0xffb050, 0).setDepth(2500);
    if (rainy) {
      for (let i = 0; i < 16; i++) {
        const e = this.add.ellipse(0, 0, 10, 3).setStrokeStyle(1, 0xe6f0ff, 0.8).setDepth(GROUND_Y + 1);
        e.isFilled = false;
        this.splashes.push({ e, age: (i / 16) * 0.6 });
      }
    }
    if (this.cfg.dayTemp >= 88 && !rainy) this.shimmer = this.add.graphics().setDepth(5);
    this.neonGlow = this.add.graphics().setDepth(GROUND_Y + 9);
    this.sign = this.add
      .text(0, 0, 'LEMONADE', { fontFamily: 'system-ui, sans-serif', fontSize: '9px', fontStyle: 'bold', color: '#3a3226', resolution: RES * 2 })
      .setOrigin(0.5)
      .setDepth(GROUND_Y + 11);
    for (let i = 0; i < 4; i++) {
      this.coins.push(
        this.add
          .text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#1f9d55', stroke: '#ffffff', strokeThickness: 3, resolution: RES * 2 })
          .setOrigin(0.5)
          .setDepth(2990)
          .setVisible(false),
      );
    }
    this.showStand(this.active);
  }

  private makeCloud(i: number): { c: Phaser.GameObjects.Container; w: number; parts: Phaser.GameObjects.Ellipse[] } {
    const w = 70 + (i % 3) * 26;
    const parts = [
      this.add.ellipse(0, 4, w, w * 0.32, 0xffffff, 0.9),
      this.add.ellipse(-w * 0.18, -4, w * 0.5, w * 0.36, 0xffffff, 0.9),
      this.add.ellipse(w * 0.14, -8, w * 0.46, w * 0.42, 0xffffff, 0.9),
    ];
    const c = this.add.container((i * 113) % SCENE_W, 26 + ((i * 41) % 80), parts).setDepth(2);
    c.setScale(0.8 + ((i * 7) % 5) / 10);
    return { c, w, parts };
  }

  setSpeed(s: number): void {
    this.speed = s;
  }

  skipToEnd(): void {
    this.t = this.cfg.timeline.close;
  }

  get gameTime(): number {
    return this.t;
  }

  showStand(id: number): void {
    this.active = id;
    const view = this.cfg.stands.find((s) => s.id === id);
    if (!view) return;
    drawFarLayer(this.far, view.locationId, SCENE_W);
    drawBackdrop(this.backdrop, view.locationId, SCENE_W);
    this.makeCritters(view.locationId);
    this.drawNeonAndSign(view);
    for (const v of this.vendors) v.destroy();
    this.vendors = [];
    for (let i = 0; i <= view.staffCount; i++) {
      this.vendors.push(this.add.image(DEFAULT_LAYOUT.counterX + 14 + i * 24, GROUND_Y + 8, 'vendor').setOrigin(0.5, 1).setScale(FIG_SCALE / FIGURE_RES).setDepth(GROUND_Y + 20));
    }
    for (const [c, s] of this.sprites) this.releaseSprite(s, c);
    this.sprites.clear();
    for (const [c, b] of this.bubbles) {
      this.releaseBubble(b);
      this.bubbles.delete(c);
    }
    const st = this.cfg.timeline.stands.get(id);
    this.sample = st ? passSampling(st, this.cfg.timeline.close) : 1;
    this.lastServeIdx = st ? st.serves.findIndex((x) => x.t > this.t) - 1 : -1;
    if (st && this.lastServeIdx < -1) this.lastServeIdx = st.serves.length - 1;
    this.lastPitcherIdx = st ? st.pitchers.filter((p) => p.t <= this.t).length - 1 : -1;
    this.leaveTimes = st
      ? st.walkers
          .flatMap((w) => (w.outcome === 'leave' ? [w.tArrive] : w.tQuit !== undefined ? [w.tQuit] : []))
          .sort((a, b) => a - b)
      : [];
    this.lastLeaveIdx = this.leaveTimes.findIndex((x) => x > this.t) - 1;
    if (this.lastLeaveIdx < -1) this.lastLeaveIdx = this.leaveTimes.length - 1;
    this.soldOutShown = null;
  }

  override update(_time: number, delta: number): void {
    const tl = this.cfg.timeline;
    if (this.t < tl.close) this.t = Math.min(tl.close, this.t + (delta / 1000) * MINUTES_PER_SECOND * this.speed);
    const t = this.t;
    const hour = this.cfg.openHour + Math.min(t, 540) / 60;
    this.clock += delta / 1000;
    this.drawSky(hour);
    this.animateWeather(t, delta);
    this.animateLife(delta, hour);

    const st = tl.stands.get(this.active);
    const view = this.cfg.stands.find((s) => s.id === this.active);
    if (st && view) {
      const soldOut = st.soldOutAt !== null && t >= st.soldOutAt;
      if (soldOut !== this.soldOutShown) {
        drawStand(this.standG, this.standFront, DEFAULT_LAYOUT.counterX, view.upgrades, soldOut);
        this.soldText.setPosition(DEFAULT_LAYOUT.counterX - 12 + (STAND_W[view.upgrades.body] ?? 92) / 2, GROUND_Y + 32 - 44).setVisible(soldOut);
        this.soldOutShown = soldOut;
      }
      this.drawPeople(st, t);
      this.drawPitcher(st, t, view);
      this.fireSounds(st, t);
    }
    this.cfg.onTick(t);
  }

  private fireSounds(st: NonNullable<ReturnType<Timeline['stands']['get']>>, t: number): void {
    let served: number | null = null;
    while (this.lastServeIdx + 1 < st.serves.length && st.serves[this.lastServeIdx + 1]!.t <= t) {
      this.lastServeIdx++;
      served = st.serves[this.lastServeIdx]!.price;
    }
    if (served !== null) {
      this.cfg.onServe?.(served);
      this.popCoin(served);
    }
    let left = false;
    while (this.lastLeaveIdx + 1 < this.leaveTimes.length && this.leaveTimes[this.lastLeaveIdx + 1]! <= t) {
      this.lastLeaveIdx++;
      left = true;
    }
    if (left) this.cfg.onLeave?.();
    let poured = false;
    while (this.lastPitcherIdx + 1 < st.pitchers.length && st.pitchers[this.lastPitcherIdx + 1]!.t <= t) {
      this.lastPitcherIdx++;
      poured = true;
    }
    if (poured && t > 0.01) this.cfg.onPitcher?.();
  }

  private drawSky(hour: number): void {
    this.sky.clear();
    const c = skyColor(hour, this.cfg.condition);
    const top = lerpColor(c, 0x2f6fb8, 0.35);
    const bottom = lerpColor(c, 0xffffff, 0.35);
    if (this.game.renderer.type === Phaser.WEBGL) {
      this.sky.fillGradientStyle(top, top, bottom, bottom, 1);
      this.sky.fillRect(0, 0, SCENE_W, GROUND_Y);
    } else {
      // Canvas can't do gradient fills: two bands instead.
      this.sky.fillStyle(top);
      this.sky.fillRect(0, 0, SCENE_W, GROUND_Y / 2);
      this.sky.fillStyle(lerpColor(top, bottom, 0.7));
      this.sky.fillRect(0, GROUND_Y / 2, SCENE_W, GROUND_Y / 2);
    }
    const p = Math.min(1, Math.max(0, (hour - 9) / 9.5));
    const sx = 30 + p * (SCENE_W - 60);
    const sy = 90 - Math.sin(p * Math.PI) * 70;
    const sunA = { sunny: 1, partlyCloudy: 0.9, cloudy: 0.35, rain: 0.15, storm: 0 }[this.cfg.condition];
    const sunC = hour > 16.5 ? 0xffc27a : 0xfff3a0;
    this.sun.setPosition(sx, sy).setAlpha(sunA).setFillStyle(sunC);
    this.sunGlow.setPosition(sx, sy).setAlpha(sunA * (0.22 + 0.06 * Math.sin(this.clock * 1.5))).setFillStyle(sunC);
    // Golden hour from 4 pm, a little dusk at closing; a hint of morning warmth.
    const warm = hour < 10 ? 0.05 * (10 - hour) : hour > 16 ? Math.min(0.11, ((hour - 16) / 2.5) * 0.11) : 0;
    const dusk = hour > 17.8 ? Math.min(0.08, (hour - 17.8) * 0.12) : 0;
    this.light.setFillStyle(dusk > 0.02 ? lerpColor(0xffb050, 0x3a2a6e, Math.min(1, dusk * 8)) : 0xffb050, warm * ({ sunny: 1, partlyCloudy: 0.8, cloudy: 0.4, rain: 0.2, storm: 0.1 }[this.cfg.condition]) + dusk);
  }

  private animateWeather(t: number, delta: number): void {
    const dt = delta / 1000;
    const grey = this.cfg.condition === 'storm' ? 0x8d939b : this.cfg.condition === 'rain' ? 0xb5bcc5 : this.cfg.condition === 'cloudy' ? 0xeef1f4 : 0xffffff;
    this.clouds.forEach(({ c, w, parts }, i) => {
      c.x += dt * (5 + (i % 3) * 3) * Math.max(1, this.speed * 0.5);
      if (c.x - w > SCENE_W) c.x = -w;
      parts.forEach((pt, k) => pt.setFillStyle(k === 0 ? lerpColor(grey, 0x9aa6b4, 0.25) : grey, 0.9));
    });
    for (const s of this.splashes) {
      s.age += dt;
      if (s.age > 0.6) {
        s.age = 0;
        s.e.setPosition(Math.random() * SCENE_W, GROUND_Y + 14 + Math.random() * (SCENE_H - GROUND_Y - 34));
      }
      const k = s.age / 0.6;
      s.e.setScale(0.3 + k).setAlpha(0.7 * (1 - k));
    }
    if (this.shimmer) {
      const g = this.shimmer;
      g.clear();
      g.lineStyle(1, 0xffffff, 0.09);
      for (let row = 0; row < 4; row++) {
        const y0 = GROUND_Y - 6 + row * 7;
        g.beginPath();
        for (let x = 0; x <= SCENE_W; x += 6) {
          const y = y0 + Math.sin(x * 0.07 + this.clock * 3 + row) * 1.6;
          if (x === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.strokePath();
      }
    }
    for (const r of this.rain) {
      r.y += dt * 380;
      r.x -= dt * 40;
      if (r.y > SCENE_H) {
        r.y = -10;
        r.x = (r.x + 157) % (SCENE_W + 40);
      }
    }
    if (this.cfg.condition === 'storm') {
      const phase = (t * 7.3) % 97;
      this.flash.setAlpha(phase < 1.2 ? 0.5 * (1 - phase / 1.2) : 0);
    }
  }

  private drawGround(): void {
    const g = this.ground;
    g.fillStyle(PALETTE.pavement);
    g.fillRect(0, GROUND_Y, SCENE_W, SCENE_H - GROUND_Y);
    g.fillStyle(PALETTE.pavementDark);
    for (let x = 0; x < SCENE_W; x += 40) g.fillRect(x, GROUND_Y, 2, SCENE_H - GROUND_Y - 18);
    const wet = this.cfg.condition === 'rain' || this.cfg.condition === 'storm';
    if (wet) {
      // Darker, wet pavement and a few puddles.
      g.fillStyle(0x6b6f7a, 0.18);
      g.fillRect(0, GROUND_Y, SCENE_W, SCENE_H - GROUND_Y);
      for (const [x, y, w] of [[60, GROUND_Y + 120, 70], [220, GROUND_Y + 140, 54], [330, GROUND_Y + 100, 46], [140, GROUND_Y + 60, 40]] as const) {
        g.fillStyle(0x9fb8cc, 0.45);
        g.fillEllipse(x, y, w, w * 0.22);
        g.fillStyle(0xffffff, 0.35);
        g.fillEllipse(x - w * 0.15, y - 1, w * 0.4, 2);
      }
    }
    g.fillStyle(PALETTE.curb);
    g.fillRect(0, SCENE_H - 18, SCENE_W, 6);
    g.fillStyle(0x6d6d73);
    g.fillRect(0, SCENE_H - 12, SCENE_W, 12);
  }

  private drawPeople(st: NonNullable<ReturnType<Timeline['stands']['get']>>, t: number): void {
    const { poses, queueLength } = posesAt(st, t, DEFAULT_LAYOUT, this.sample);
    const seen = new Set<number>();
    const wanted: { c: number; b: Bubble; x: number; y: number; prio: number }[] = [];
    const frame = Math.floor(t * 4) % 2;
    for (const p of poses) {
      if (p.x < -30 || p.x > SCENE_W + 30) continue;
      const w = p.w;
      seen.add(w.c);
      let s = this.sprites.get(w.c);
      const y = LANE_Y[p.lane]! + ((w.c * 7) % 9) - (p.lane === 0 ? 0 : 4);
      if (!s) {
        s = this.takeSprite();
        s.setPosition(p.x, y);
        this.sprites.set(w.c, s);
        this.baseY.set(w.c, y);
        this.shadows.set(w.c, this.takeShadow());
      }
      const moving = p.kind === 'walking';
      s.setTexture(figureKey(w.a, w.c % 3, moving ? frame : 1));
      // Smooth queue shuffles; walkers follow the model exactly.
      const nx = p.kind === 'queued' ? s.x + (p.x - s.x) * 0.25 : p.x;
      const by = this.baseY.get(w.c) ?? y;
      const ny = by + (y - by) * 0.3;
      this.baseY.set(w.c, ny);
      const bob = moving ? Math.abs(Math.sin(t * 6 + w.c)) * 1.4 : 0;
      s.setPosition(nx, ny - bob);
      this.shadows.get(w.c)?.setPosition(nx, ny + 1).setDepth(ny - 1).setVisible(true);
      s.setFlipX(moving ? (p.kind === 'walking' && this.walkDir(w, p.x, t) < 0) : p.kind === 'queued' || p.kind === 'lingering' ? false : true);
      s.setDepth(ny);
      s.setVisible(true);
      if (p.bubble) wanted.push({ c: w.c, b: p.bubble, x: nx, y: ny - FIGURE_H * FIG_SCALE - 2, prio: p.kind === 'walking' ? 1 : 0 });
      else this.hideBubble(w.c);
    }
    // Place bubbles greedily (people at the stand first); skip any that would overlap.
    wanted.sort((a, b) => a.prio - b.prio || b.y - a.y);
    const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
    for (const wb of wanted) {
      const half = this.cfg.bubbleText(wb.b).length * 3.4 + 8;
      const r = { x0: wb.x - half, x1: wb.x + half, y0: wb.y - 20, y1: wb.y };
      const hit = placed.some((q) => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0);
      if (hit || placed.length >= 6) this.hideBubble(wb.c);
      else {
        placed.push(r);
        this.showBubble(wb.c, wb.b, wb.x, wb.y);
      }
    }
    for (const [c, s] of this.sprites) {
      if (!seen.has(c)) {
        this.releaseSprite(s, c);
        this.sprites.delete(c);
        this.hideBubble(c);
      }
    }
    const hidden = queueLength - DEFAULT_LAYOUT.visibleQueue;
    this.overflow.setText(hidden > 0 ? `+${hidden} in line` : '').setVisible(hidden > 0);
  }

  /** Facing direction while walking: approaching walkers head toward the stand. */
  private walkDir(w: Walker, _x: number, t: number): number {
    if (t < w.tArrive) return w.dir;
    if (w.outcome === 'queue') return w.tQuit !== undefined ? -1 : 1;
    return w.dir;
  }

  private drawPitcher(st: NonNullable<ReturnType<Timeline['stands']['get']>>, t: number, view: StandView): void {
    const p = pitcherAt(st, t);
    const g = this.pitcherG;
    g.clear();
    const x = DEFAULT_LAYOUT.counterX - 12 + 14;
    const y = GROUND_Y - 4 - [0, 10, 20, 34][view.upgrades.body]!;
    // pitcher glass
    g.fillStyle(0xe8f4ff, 0.9);
    g.fillRoundedRect(x - 7, y - 16, 14, 18, 3);
    g.fillStyle(PALETTE.lemon);
    const fill = p.preparing ? p.progress : 1;
    g.fillRect(x - 5, y + 0 - 14 * fill, 10, 14 * fill);
    if (p.preparing) {
      g.fillStyle(PALETTE.ink, 0.25);
      g.fillRoundedRect(x - 18, y - 30, 36, 6, 3);
      g.fillStyle(0x2fbf71);
      g.fillRoundedRect(x - 18, y - 30, 36 * p.progress, 6, 3);
    }
    this.pitcherText.setPosition(x, y - 38).setVisible(p.preparing);
  }

  private takeSprite(): Phaser.GameObjects.Image {
    return this.spritePool.pop() ?? this.add.image(0, 0, figureKey('kid', 0, 0)).setOrigin(0.5, 1).setScale(FIG_SCALE / FIGURE_RES);
  }

  private releaseSprite(s: Phaser.GameObjects.Image, c?: number): void {
    s.setVisible(false);
    this.spritePool.push(s);
    if (c !== undefined) {
      const sh = this.shadows.get(c);
      if (sh) {
        sh.setVisible(false);
        this.shadowPool.push(sh);
        this.shadows.delete(c);
      }
      this.baseY.delete(c);
    }
  }

  private takeShadow(): Phaser.GameObjects.Ellipse {
    return this.shadowPool.pop() ?? this.add.ellipse(0, 0, 18, 5, 0x000000, 0.16);
  }

  /** "+$1.30" floating up from the counter on a sale. */
  private popCoin(price: number): void {
    // One at a time, a moment apart, alternating sides so a rush stays readable.
    if (this.clock - this.lastCoin < 0.45) return;
    const c = this.coins.find((x) => !x.visible);
    if (!c) return;
    this.lastCoin = this.clock;
    this.coinSlot = (this.coinSlot + 1) % 2;
    const x = DEFAULT_LAYOUT.counterX + (this.coinSlot ? 46 : 8);
    c.setText(`+$${price.toFixed(2)}`).setPosition(x, GROUND_Y - 2).setAlpha(1).setVisible(true);
    this.tweens.add({ targets: c, y: GROUND_Y - 30, alpha: 0, duration: 850, ease: 'Sine.easeOut', onComplete: () => c.setVisible(false) });
  }

  private drawNeonAndSign(view: StandView): void {
    const tier = view.upgrades.body;
    const w = STAND_W[tier] ?? 92;
    const left = DEFAULT_LAYOUT.counterX - 12;
    const top = GROUND_Y + 32 - (STAND_H[tier] ?? 52);
    const g = this.neonGlow;
    g.clear();
    if (view.upgrades.neon) {
      g.fillStyle(0xff4fd8, 1);
      g.fillRoundedRect(left + w / 2 - 36, top - 24, 72, 22, 10);
    }
    this.sign
      .setPosition(left + w / 2, top - (view.upgrades.neon ? 13 : 11.5))
      .setColor(view.upgrades.neon ? '#ffd1f4' : '#3a3226')
      .setVisible(tier >= 1 || view.upgrades.neon);
  }

  /** Birds over the park and campus, gulls at the beach, cars downtown. */
  private makeCritters(loc: LocationId): void {
    for (const c of this.critters) c.g.destroy();
    this.critters = [];
    const wet = this.cfg.condition === 'rain' || this.cfg.condition === 'storm';
    const add = (kind: Critter['kind'], n: number) => {
      for (let i = 0; i < n; i++) {
        const g = this.add.graphics();
        if (kind === 'car') {
          const colors = [0xe85d4a, 0x3a7bd5, 0xf2c14e, 0x5c6470, 0x2fbf71];
          g.fillStyle(colors[(i * 3 + loc.length) % colors.length]!);
          g.fillRoundedRect(-14, -7, 28, 7, 2);
          g.fillRoundedRect(-8, -11, 14, 5, 2);
          g.fillStyle(0xcfe6ff);
          g.fillRect(-6, -10, 4, 3);
          g.fillRect(0, -10, 4, 3);
          g.fillStyle(0x222222);
          g.fillCircle(-8, 0, 2.5);
          g.fillCircle(8, 0, 2.5);
          g.setDepth(SCENE_H);
        } else {
          g.lineStyle(kind === 'gull' ? 1.6 : 1.2, kind === 'gull' ? 0xffffff : 0x3a3226, 0.85);
          const s = kind === 'gull' ? 6 : 4;
          g.beginPath();
          g.moveTo(-s, -s * 0.5);
          g.lineTo(0, 0);
          g.lineTo(s, -s * 0.5);
          g.strokePath();
          g.setDepth(2.2);
        }
        const dir = kind === 'car' ? (i % 2 ? -1 : 1) : 1;
        const speed = kind === 'car' ? 70 + i * 23 : kind === 'gull' ? 26 + i * 7 : 34 + i * 9;
        const y = kind === 'car' ? SCENE_H - 3 - (i % 2) * 4 : 40 + ((i * 37) % 70);
        g.setPosition(((i * 151) % (SCENE_W + 80)) - 40, y);
        if (dir < 0) g.setScale(-1, 1);
        this.critters.push({ g, vx: dir * speed, y, phase: i * 1.7, kind });
      }
    };
    if (loc === 'maple' || loc === 'campus' || loc === 'uptown') add('bird', wet ? 0 : 3);
    if (loc === 'boardwalk') add('gull', wet ? 1 : 3);
    if (loc === 'uptown' || loc === 'financial' || loc === 'stadium' || loc === 'neon') add('car', 3);
  }

  private animateLife(delta: number, hour: number): void {
    const dt = delta / 1000;
    for (const c of this.critters) {
      c.g.x += c.vx * dt;
      if (c.kind !== 'car') c.g.y = c.y + Math.sin(this.clock * 2 + c.phase) * 4;
      if (c.vx > 0 && c.g.x > SCENE_W + 40) c.g.x = -40 - Math.random() * 120;
      if (c.vx < 0 && c.g.x < -40) c.g.x = SCENE_W + 40 + Math.random() * 120;
    }
    // The neon sign hums: a soft pulse, stronger as the light goes.
    const evening = Math.max(0, Math.min(1, (hour - 15) / 3));
    this.neonGlow.setAlpha(0.18 + 0.1 * Math.sin(this.clock * 3.2) + 0.15 * evening);
  }

  private showBubble(c: number, b: Bubble, x: number, y: number): void {
    let o = this.bubbles.get(c);
    if (!o) {
      o = this.bubblePool.pop() ?? this.makeBubble();
      this.bubbles.set(c, o);
    }
    if (o.key !== b) {
      o.key = b;
      o.text.setText(this.cfg.bubbleText(b));
      const w = o.text.width + 10;
      const h = o.text.height + 6;
      o.bg.clear();
      const good = b === 'delicious';
      o.bg.fillStyle(good ? 0xeaffea : 0xffffff, 0.96);
      o.bg.lineStyle(1.5, good ? 0x2fbf71 : 0xd94a3d);
      o.bg.fillRoundedRect(-w / 2, -h, w, h, 7);
      o.bg.strokeRoundedRect(-w / 2, -h, w, h, 7);
      o.bg.fillTriangle(-4, 0, 4, 0, 0, 6);
      o.text.setPosition(0, -h / 2);
    }
    const half = (o.text.width + 10) / 2;
    o.box.setPosition(Math.max(half + 2, Math.min(SCENE_W - half - 2, x)), y).setVisible(true).setDepth(3000 + y);
  }

  private hideBubble(c: number): void {
    const o = this.bubbles.get(c);
    if (!o) return;
    this.releaseBubble(o);
    this.bubbles.delete(c);
  }

  private releaseBubble(o: BubbleObj): void {
    o.box.setVisible(false);
    this.bubblePool.push(o);
  }

  private makeBubble(): BubbleObj {
    const bg = this.add.graphics();
    const text = this.add
      .text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#3a3226', resolution: RES * 2 })
      .setOrigin(0.5);
    const box = this.add.container(0, 0, [bg, text]);
    return { box, bg, text, key: '' };
  }

  private makeVendorTexture(): void {
    if (this.textures.exists('vendor')) return;
    const k = FIGURE_RES;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xf6d2b0);
    g.fillCircle(11 * k, 7 * k, 6 * k);
    g.fillStyle(0x4a3424);
    g.fillRect(5 * k, 1 * k, 12 * k, 4 * k);
    g.fillStyle(PALETTE.white);
    g.fillRoundedRect(5 * k, 13 * k, 12 * k, 16 * k, 3 * k);
    g.fillStyle(PALETTE.lemon);
    g.fillRect(7 * k, 16 * k, 8 * k, 13 * k);
    g.generateTexture('vendor', 22 * k, 30 * k);
    g.destroy();
  }
}

export { CONDITION_ICON };
