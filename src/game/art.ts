// Flat vector art drawn in code (GDD §19). Lemon yellow, sky blue, warm neutrals.
import Phaser from 'phaser';
import type { Archetype, Condition, LocationId } from '../config';
import type { StandUpgrades } from '../sim/types';

export const PALETTE = {
  lemon: 0xffd84a,
  lemonDark: 0xe0b020,
  sky: 0x8fd3ff,
  ink: 0x3a3226,
  cream: 0xfff6e0,
  sand: 0xf3dfb4,
  pavement: 0xd8cdb8,
  pavementDark: 0xc4b79e,
  curb: 0xa89a82,
  white: 0xffffff,
};

const SKINS = [0xf6d2b0, 0xd9a273, 0x9c6a43];

interface FigureStyle {
  height: number;
  shirt: number;
  pants: number;
  hair: number;
  accessory: 'cap' | 'briefcase' | 'camera' | 'headband' | 'cane' | 'backpack' | 'scarf';
  accent: number;
}

const STYLES: Record<Archetype, FigureStyle> = {
  kid: { height: 22, shirt: 0xff5a4e, pants: 0x3d6fd1, hair: 0x5a3a20, accessory: 'cap', accent: 0x2a8cff },
  office: { height: 31, shirt: 0x5c6470, pants: 0x3e434b, hair: 0x2b2118, accessory: 'briefcase', accent: 0x7a4a24 },
  tourist: { height: 29, shirt: 0x21b5a6, pants: 0xe8d6a8, hair: 0xc89b4a, accessory: 'camera', accent: 0x222222 },
  jogger: { height: 30, shirt: 0xff8a1f, pants: 0x2d2d3a, hair: 0x3b2a1a, accessory: 'headband', accent: 0xff2d7a },
  senior: { height: 28, shirt: 0xc9a97e, pants: 0x6b5d4f, hair: 0xd9d9d9, accessory: 'cane', accent: 0x6b4423 },
  student: { height: 29, shirt: 0x8b5cf6, pants: 0x37518f, hair: 0x1f1a14, accessory: 'backpack', accent: 0x2fbf71 },
  fan: { height: 30, shirt: 0x1f9d55, pants: 0x2a2a2a, hair: 0x6b3d1f, accessory: 'scarf', accent: 0xffd84a },
};

export const FIGURE_W = 22;
export const FIGURE_H = 36;
/** Figures are drawn at this multiple and scaled down, so they stay crisp at 2× zoom. */
export const FIGURE_RES = 4;

export function figureKey(a: Archetype, skin: number, frame: number): string {
  return `fig-${a}-${skin}-${frame}`;
}

/** Generates every customer texture once (archetype × skin tone × 2 walk frames). */
export function makeFigureTextures(scene: Phaser.Scene): void {
  for (const a of Object.keys(STYLES) as Archetype[]) {
    for (let skin = 0; skin < SKINS.length; skin++) {
      for (let frame = 0; frame < 2; frame++) {
        const key = figureKey(a, skin, frame);
        if (scene.textures.exists(key)) continue;
        const g = scene.make.graphics({ x: 0, y: 0 }, false);
        drawFigure(scaled(g, FIGURE_RES), STYLES[a], SKINS[skin]!, frame);
        g.generateTexture(key, FIGURE_W * FIGURE_RES, FIGURE_H * FIGURE_RES);
        g.destroy();
      }
    }
  }
}

/** The few Graphics calls figures use, with every coordinate multiplied by k. */
interface Pen {
  fillStyle(c: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillRoundedRect(x: number, y: number, w: number, h: number, r: number): void;
  fillCircle(x: number, y: number, r: number): void;
}

function scaled(g: Phaser.GameObjects.Graphics, k: number): Pen {
  return {
    fillStyle: (c) => void g.fillStyle(c),
    fillRect: (x, y, w, h) => void g.fillRect(x * k, y * k, w * k, h * k),
    fillRoundedRect: (x, y, w, h, r) => void g.fillRoundedRect(x * k, y * k, w * k, h * k, r * k),
    fillCircle: (x, y, r) => void g.fillCircle(x * k, y * k, r * k),
  };
}

function drawFigure(g: Pen, s: FigureStyle, skin: number, frame: number): void {
  const cx = FIGURE_W / 2;
  const foot = FIGURE_H - 1;
  const h = s.height;
  const top = foot - h;
  const head = Math.max(5, Math.round(h * 0.2));
  const legH = Math.round(h * 0.38);
  const bodyTop = top + head * 2 - 1;
  const bodyH = foot - legH - bodyTop;
  // legs (two frames: apart / together)
  g.fillStyle(s.pants);
  const spread = frame === 0 ? 3 : 1;
  g.fillRect(cx - 2 - spread, foot - legH, 3, legH);
  g.fillRect(cx - 1 + spread, foot - legH, 3, legH);
  // backpack behind body
  if (s.accessory === 'backpack') {
    g.fillStyle(s.accent);
    g.fillRoundedRect(cx - 8, bodyTop + 1, 5, bodyH - 1, 2);
  }
  // body
  g.fillStyle(s.shirt);
  g.fillRoundedRect(cx - 5, bodyTop, 10, bodyH + 2, 3);
  // arms
  g.fillStyle(skin);
  g.fillRect(cx + 4, bodyTop + 2, 2, Math.max(4, bodyH - 3));
  // head
  g.fillStyle(skin);
  g.fillCircle(cx, top + head, head);
  g.fillStyle(s.hair);
  g.fillRect(cx - head, top, head * 2, Math.max(2, Math.round(head * 0.6)));
  // eye
  g.fillStyle(PALETTE.ink);
  g.fillRect(cx + Math.round(head * 0.35), top + head - 1, 2, 2);

  switch (s.accessory) {
    case 'cap':
      g.fillStyle(s.accent);
      g.fillRect(cx - head, top - 1, head * 2, 3);
      g.fillRect(cx, top + 1, head + 3, 2);
      break;
    case 'briefcase':
      g.fillStyle(s.accent);
      g.fillRect(cx + 4, bodyTop + bodyH - 2, 7, 6);
      g.fillStyle(PALETTE.ink);
      g.fillRect(cx + 6, bodyTop + bodyH - 4, 3, 2);
      break;
    case 'camera':
      g.fillStyle(s.accent);
      g.fillRect(cx - 3, bodyTop + 3, 7, 5);
      g.fillStyle(0x88ccff);
      g.fillCircle(cx + 1, bodyTop + 5, 1.5);
      break;
    case 'headband':
      g.fillStyle(s.accent);
      g.fillRect(cx - head, top + Math.round(head * 0.6), head * 2, 2);
      break;
    case 'cane':
      g.fillStyle(s.accent);
      g.fillRect(cx + 8, bodyTop + 4, 2, foot - bodyTop - 4);
      break;
    case 'scarf':
      g.fillStyle(s.accent);
      g.fillRect(cx - 5, bodyTop, 10, 3);
      g.fillRect(cx - 4, bodyTop, 3, 8);
      break;
    case 'backpack':
      break;
  }
}

/** Sky colour for a time of day and weather. `hour` is fractional. */
export function skyColor(hour: number, condition: Condition): number {
  const stops: [number, number][] = [
    [9, 0xa8dcff],
    [12, 0x7cc8ff],
    [15, 0x86ccf5],
    [17, 0xf6b26b],
    [18.5, 0xd97a6c],
  ];
  let c = stops[0]![1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [h0, c0] = stops[i]!;
    const [h1, c1] = stops[i + 1]!;
    if (hour >= h0 && hour <= h1) c = lerpColor(c0, c1, (hour - h0) / (h1 - h0));
    else if (hour > h1) c = c1;
  }
  const grey = { sunny: 0, partlyCloudy: 0.15, cloudy: 0.45, rain: 0.6, storm: 0.75 }[condition];
  return lerpColor(c, 0x8a929c, grey);
}

export function lerpColor(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const ch = (x: number, s: number) => (x >> s) & 0xff;
  const mix = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * k);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

export const GROUND_Y = 262;

/** Location backdrop: buildings, trees, sea… */
export function drawBackdrop(g: Phaser.GameObjects.Graphics, loc: LocationId, width: number): void {
  g.clear();
  const base = GROUND_Y;
  const rect = (x: number, y: number, w: number, h: number, c: number) => {
    g.fillStyle(c);
    g.fillRect(x, y, w, h);
  };
  const windows = (x: number, y: number, w: number, h: number, c: number, gap = 12) => {
    g.fillStyle(c);
    for (let yy = y + 8; yy < y + h - 8; yy += gap) for (let xx = x + 6; xx < x + w - 8; xx += gap) g.fillRect(xx, yy, 5, 6);
  };
  const tree = (x: number, s = 1) => {
    rect(x - 3 * s, base - 30 * s, 6 * s, 30 * s, 0x7a5232);
    g.fillStyle(0x4fae5b);
    g.fillCircle(x, base - 38 * s, 16 * s);
    g.fillStyle(0x62c46e);
    g.fillCircle(x - 7 * s, base - 44 * s, 10 * s);
  };
  switch (loc) {
    case 'maple':
      rect(0, base - 40, width, 40, 0x9fd88a);
      for (const x of [30, 95, 330, 375]) tree(x, 1.1);
      tree(160, 0.8);
      rect(110, base - 22, 40, 4, 0x8b5a2b); // bench
      break;
    case 'uptown':
      [0xc98b6b, 0xb5735a, 0xd9a07c, 0xa86450, 0xc4876a].forEach((c, i) => {
        const w = 80;
        const h = 90 + ((i * 37) % 40);
        rect(i * w, base - h, w - 2, h, c);
        windows(i * w, base - h, w - 2, h, 0xfff2c8, 16);
      });
      break;
    case 'campus':
      rect(20, base - 110, 200, 110, 0xb5523b);
      windows(20, base - 110, 200, 110, 0xf6e7c1, 18);
      g.fillStyle(0x8f3e2c);
      g.fillTriangle(10, base - 110, 120, base - 150, 230, base - 110);
      rect(260, base - 80, 130, 80, 0xa8563f);
      windows(260, base - 80, 130, 80, 0xf6e7c1, 18);
      tree(240, 0.9);
      break;
    case 'boardwalk':
      rect(0, base - 70, width, 30, 0x4aa8e0);
      rect(0, base - 44, width, 44, PALETTE.sand);
      g.fillStyle(0xffffff, 0.7);
      for (let x = 10; x < width; x += 60) g.fillRect(x, base - 58, 26, 2);
      g.fillStyle(0xff6b6b);
      g.fillTriangle(60, base - 30, 80, base - 60, 100, base - 30);
      rect(78, base - 30, 3, 30, 0x6b4423);
      break;
    case 'financial':
      [0x6f8fb0, 0x5d7896, 0x86a3c2, 0x4f6a88, 0x7896b5].forEach((c, i) => {
        const w = 78;
        const h = 140 + ((i * 53) % 60);
        rect(i * w, base - h, w - 4, h, c);
        windows(i * w, base - h, w - 4, h, 0xcfe6ff, 10);
      });
      break;
    case 'stadium':
      g.fillStyle(0xb0b8c4);
      g.fillEllipse(width / 2, base - 40, width * 1.1, 150);
      g.fillStyle(0x8a94a3);
      g.fillEllipse(width / 2, base - 40, width * 0.9, 100);
      rect(0, base - 40, width, 40, 0x9aa4b2);
      for (const x of [40, 140, 250, 350]) {
        rect(x, base - 140, 3, 70, 0x555555);
        rect(x - 8, base - 146, 19, 8, 0xfff2a8);
      }
      break;
    case 'neon':
      [0x3b2f5e, 0x2e2550, 0x45386e, 0x2a2147, 0x3d3163].forEach((c, i) => {
        const w = 78;
        const h = 120 + ((i * 41) % 70);
        rect(i * w, base - h, w - 3, h, c);
        windows(i * w, base - h, w - 3, h, 0xffe28a, 14);
      });
      [0xff4fd8, 0x4fffe1, 0xffe14f].forEach((c, i) => {
        g.fillStyle(c);
        g.fillRoundedRect(30 + i * 120, base - 100 + (i % 2) * 20, 60, 16, 4);
      });
      break;
  }
}

export const STAND_W = [92, 106, 116, 124];

/** The stand itself; size and look depend on the body tier and upgrades. */
export function drawStand(g: Phaser.GameObjects.Graphics, front: Phaser.GameObjects.Graphics, x: number, upgrades: StandUpgrades, soldOut: boolean): void {
  g.clear();
  front.clear();
  const base = GROUND_Y + 32;
  const tier = upgrades.body;
  const w = STAND_W[tier] ?? 92;
  const h = [52, 70, 92, 120][tier] ?? 52;
  const left = x - 12;
  const top = base - h;
  const stripe = (y: number, hh: number) => {
    const n = Math.round(w / 14);
    for (let i = 0; i < n; i++) {
      g.fillStyle(i % 2 ? PALETTE.white : PALETTE.lemon);
      g.fillRect(left + (i * w) / n, y, w / n + 1, hh);
    }
  };
  if (tier === 3) {
    g.fillStyle(0xf2e6cf);
    g.fillRect(left - 6, top - 10, w + 12, h + 10);
    g.fillStyle(0x7fb8de);
    g.fillRect(left + 6, top + 26, w - 12, h - 52);
  }
  // counter (front layer, in front of the staff)
  front.fillStyle(tier >= 2 ? 0xfff0b3 : PALETTE.cream);
  front.fillRoundedRect(left, base - 30, w, 30, 4);
  front.fillStyle(PALETTE.lemonDark);
  front.fillRect(left, base - 32, w, 4);
  // posts and awning
  if (tier >= 1) {
    g.fillStyle(0x9a7b55);
    g.fillRect(left + 3, top + 12, 4, h - 40);
    g.fillRect(left + w - 7, top + 12, 4, h - 40);
  }
  stripe(top, tier === 0 ? 14 : 18);
  g.fillStyle(PALETTE.lemonDark);
  for (let i = 0; i < 6; i++) g.fillTriangle(left + (i * w) / 6, top + 18, left + ((i + 0.5) * w) / 6, top + 26, left + ((i + 1) * w) / 6, top + 18);
  // wheels for the cart
  if (tier === 0) {
    front.fillStyle(PALETTE.ink);
    front.fillCircle(left + 14, base + 2, 7);
    front.fillCircle(left + w - 14, base + 2, 7);
    front.fillStyle(0xbbbbbb);
    front.fillCircle(left + 14, base + 2, 3);
    front.fillCircle(left + w - 14, base + 2, 3);
  }
  // lemon logo
  front.fillStyle(PALETTE.lemon);
  front.fillEllipse(left + w / 2, base - 16, 22, 15);
  front.fillStyle(0x6bbf59);
  front.fillEllipse(left + w / 2 + 9, base - 23, 8, 4);
  if (upgrades.neon) {
    g.fillStyle(0xff4fd8, 0.25);
    g.fillRoundedRect(left + w / 2 - 34, top - 22, 68, 18, 8);
    g.lineStyle(2, 0xff4fd8);
    g.strokeRoundedRect(left + w / 2 - 30, top - 20, 60, 14, 6);
  }
  if (upgrades.umbrella) {
    g.fillStyle(0x2a8cff);
    g.fillTriangle(left - 30, top + 22, left - 4, top + 4, left + 22, top + 22);
    g.fillStyle(0x7a5232);
    g.fillRect(left - 5, top + 20, 2, base - top - 20);
  }
  if (upgrades.speaker) {
    g.fillStyle(PALETTE.ink);
    g.fillRoundedRect(left + w - 2, base - 50, 12, 18, 2);
    g.fillStyle(0x888888);
    g.fillCircle(left + w + 4, base - 41, 3);
  }
  if (upgrades.cooler) {
    front.fillStyle(0x3fa9f5);
    front.fillRoundedRect(left + 4, base - 12, 20, 12, 3);
    front.fillStyle(PALETTE.white);
    front.fillRect(left + 4, base - 12, 20, 3);
  }
  if (soldOut) {
    front.fillStyle(0xd94a3d);
    front.fillRoundedRect(left + w / 2 - 34, base - 52, 68, 16, 4);
  }
}

export const CONDITION_ICON: Record<Condition, string> = {
  sunny: '☀️',
  partlyCloudy: '⛅',
  cloudy: '☁️',
  rain: '🌧️',
  storm: '⛈️',
};
