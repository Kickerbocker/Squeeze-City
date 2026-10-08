import Phaser from 'phaser';
import type { Condition, LocationId } from '../config';
import type { Bubble, StandUpgrades } from '../sim/types';
import { CONDITION_ICON, drawBackdrop, drawStand, figureKey, FIGURE_H, FIGURE_RES, GROUND_Y, makeFigureTextures, PALETTE, skyColor, STAND_W } from './art';
import { DEFAULT_LAYOUT, passSampling, pitcherAt, posesAt, type Timeline, type Walker } from './replay';

export const SCENE_W = 390;
export const SCENE_H = 460;
/** Render resolution multiplier (camera zoom) for crisp vector art on phones. */
export const RES = 2;
/** On-screen size of customer figures relative to their 22×36 design size. */
const FIG_SCALE = 1.35;
/** Game minutes per real second at 1x: a 540-minute day takes 3 minutes. */
export const MINUTES_PER_SECOND = 3;

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
  openHour: number;
  bubbleText: (b: Bubble) => string;
  onTick: (t: number) => void;
  onServe?: () => void;
  onPitcher?: () => void;
}

const LANE_Y = [GROUND_Y + 150, GROUND_Y + 86, GROUND_Y + 74];

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
  private clouds: Phaser.GameObjects.Ellipse[] = [];
  private backdrop!: Phaser.GameObjects.Graphics;
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
    this.sun = this.add.circle(0, 0, 18, 0xfff3a0).setDepth(1);
    const cloudCount = { sunny: 1, partlyCloudy: 3, cloudy: 5, rain: 6, storm: 7 }[this.cfg.condition];
    for (let i = 0; i < cloudCount; i++) {
      const c = this.add.ellipse((i * 97) % SCENE_W, 30 + ((i * 37) % 70), 90 + (i % 3) * 30, 30 + (i % 2) * 10, 0xffffff, 0.85).setDepth(2);
      this.clouds.push(c);
    }
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
    this.showStand(this.active);
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
    drawBackdrop(this.backdrop, view.locationId, SCENE_W);
    for (const v of this.vendors) v.destroy();
    this.vendors = [];
    for (let i = 0; i <= view.staffCount; i++) {
      this.vendors.push(this.add.image(DEFAULT_LAYOUT.counterX + 14 + i * 24, GROUND_Y + 8, 'vendor').setOrigin(0.5, 1).setScale(FIG_SCALE / FIGURE_RES).setDepth(GROUND_Y + 20));
    }
    for (const s of this.sprites.values()) this.releaseSprite(s);
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
    this.soldOutShown = null;
  }

  override update(_time: number, delta: number): void {
    const tl = this.cfg.timeline;
    if (this.t < tl.close) this.t = Math.min(tl.close, this.t + (delta / 1000) * MINUTES_PER_SECOND * this.speed);
    const t = this.t;
    const hour = this.cfg.openHour + Math.min(t, 540) / 60;
    this.drawSky(hour);
    this.animateWeather(t, delta);

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
    let served = false;
    while (this.lastServeIdx + 1 < st.serves.length && st.serves[this.lastServeIdx + 1]!.t <= t) {
      this.lastServeIdx++;
      served = true;
    }
    if (served) this.cfg.onServe?.();
    let poured = false;
    while (this.lastPitcherIdx + 1 < st.pitchers.length && st.pitchers[this.lastPitcherIdx + 1]!.t <= t) {
      this.lastPitcherIdx++;
      poured = true;
    }
    if (poured && t > 0.01) this.cfg.onPitcher?.();
  }

  private drawSky(hour: number): void {
    this.sky.clear();
    this.sky.fillStyle(skyColor(hour, this.cfg.condition));
    this.sky.fillRect(0, 0, SCENE_W, GROUND_Y);
    const p = Math.min(1, Math.max(0, (hour - 9) / 9.5));
    this.sun.setPosition(30 + p * (SCENE_W - 60), 90 - Math.sin(p * Math.PI) * 70);
    this.sun.setAlpha({ sunny: 1, partlyCloudy: 0.9, cloudy: 0.35, rain: 0.15, storm: 0 }[this.cfg.condition]);
    this.sun.setFillStyle(hour > 16.5 ? 0xffc27a : 0xfff3a0);
  }

  private animateWeather(t: number, delta: number): void {
    const dt = delta / 1000;
    this.clouds.forEach((c, i) => {
      c.x += dt * (6 + (i % 3) * 3) * Math.max(1, this.speed * 0.5);
      if (c.x - c.width / 2 > SCENE_W) c.x = -c.width / 2;
      const grey = this.cfg.condition === 'storm' ? 0x8d939b : this.cfg.condition === 'rain' ? 0xb5bcc5 : 0xffffff;
      c.setFillStyle(grey, 0.85);
    });
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
      }
      const moving = p.kind === 'walking';
      s.setTexture(figureKey(w.a, w.c % 3, moving ? frame : 1));
      // Smooth queue shuffles; walkers follow the model exactly.
      const nx = p.kind === 'queued' ? s.x + (p.x - s.x) * 0.25 : p.x;
      const ny = s.y + (y - s.y) * 0.3;
      s.setPosition(nx, ny);
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
        this.releaseSprite(s);
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

  private releaseSprite(s: Phaser.GameObjects.Image): void {
    s.setVisible(false);
    this.spritePool.push(s);
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
