import { type Archetype, CONFIG, type Condition, type LocationId, type StaffRole } from '../config';
import type { Bubble, EventKind } from '../sim';

export const money = (x: number, cents = true): string => {
  const sign = x < 0 ? '−' : '';
  const v = Math.abs(x);
  return `${sign}$${cents ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.round(v).toLocaleString('en-US')}`;
};

export const temp = (f: number): string => `${Math.round(f)}°F`;

export const BUBBLES: Record<Bubble, string> = {
  delicious: '😋 Delicious!',
  tooSour: '😖 Too sour',
  tooWeak: '💧 Too weak',
  tooSweet: '🍬 Too sweet',
  notSweet: '😐 Not sweet enough',
  notCold: '🥵 Not cold enough',
  tooMuchIce: '🧊 Too much ice',
  overpriced: '💸 Overpriced',
  slowService: '🐢 Slow service',
  tooExpensive: '💸 Too expensive',
  lineTooLong: '⏳ Line too long',
  soldOut: '🚫 Sold out',
};

export const CONDITION_ICON: Record<Condition, string> = {
  sunny: '☀️',
  partlyCloudy: '⛅',
  cloudy: '☁️',
  rain: '🌧️',
  storm: '⛈️',
};

export const ARCHETYPE_ICON: Record<Archetype, string> = {
  kid: '🧢',
  office: '💼',
  tourist: '📷',
  jogger: '🏃',
  senior: '🧓',
  student: '🎒',
  fan: '📣',
};

export const ROLE_ICON: Record<StaffRole, string> = { server: '🧑‍🍳', mixer: '🥄', promoter: '📢' };

export const ROLE_EFFECT: Record<StaffRole, (skill: number) => string> = {
  server: (s) => {
    const r = CONFIG.staff.roles.server;
    return `Extra serving lane at ${Math.round((r.speedBase + r.speedPerSkill * s) * 100)}% speed`;
  },
  mixer: (s) => {
    const r = CONFIG.staff.roles.mixer;
    return `Pitcher prep −${(r.prepCutBase + r.prepCutPerSkill * s).toFixed(1)} min`;
  },
  promoter: (s) => {
    const r = CONFIG.staff.roles.promoter;
    return `+${Math.round((r.stopBase + r.stopPerSkill * s - 1) * 100)}% people stop`;
  },
};

export const locName = (id: LocationId): string => CONFIG.locations.locations.find((l) => l.id === id)!.name;

export const EVENT_TEXT: Record<EventKind | 'gameDay', { icon: string; name: string; effect: string }> = {
  heatwave: { icon: '🔥', name: 'Heatwave', effect: `+${CONFIG.events.heatwave.tempBonus}°F` },
  festival: { icon: '🎪', name: 'Festival', effect: `Traffic ×${CONFIG.events.festival.trafficMultiplier}` },
  lemonShortage: { icon: '🍋', name: 'Lemon shortage', effect: `Lemons ×${CONFIG.events.lemonShortage.priceMultiplier} price` },
  sugarSale: { icon: '🏷️', name: 'Sugar sale', effect: `Sugar ×${CONFIG.events.sugarSale.priceMultiplier} price` },
  construction: { icon: '🚧', name: 'Construction', effect: `Traffic ×${CONFIG.events.construction.trafficMultiplier}` },
  competitor: { icon: '🛒', name: 'Competitor cart', effect: 'Steals customers' },
  gameDay: { icon: '🏟️', name: 'Game day', effect: 'Huge crowds of fans' },
};

export function milestoneText(id: string): string {
  if (id === 'firstHundredDay') return 'First $100 day!';
  if (id === 'firstUpgrade') return 'First upgrade!';
  if (id === 'rep75') return 'Reputation 75 somewhere!';
  if (id === 'tycoon') return '🏆 Tycoon! $1,000,000 net worth';
  if (id.startsWith('unlock:')) return `Unlocked ${locName(id.slice(7) as LocationId)}`;
  if (id.startsWith('stand:')) return `Stand #${id.slice(6)} opened`;
  if (id.startsWith('netWorth:')) return `Net worth ${money(Number(id.slice(9)), false)}`;
  return id;
}

export const ALL_MILESTONES = (): string[] => [
  'firstHundredDay',
  'firstUpgrade',
  'rep75',
  ...CONFIG.locations.locations.slice(1).map((l) => `unlock:${l.id}`),
  ...Array.from({ length: CONFIG.stands.maxStands - 1 }, (_, i) => `stand:${i + 2}`),
  ...CONFIG.progression.milestones.netWorth.thresholds.map((t) => `netWorth:${t}`),
  'tycoon',
];

export function hourLabel(hourFloat: number): string {
  const h = Math.floor(hourFloat);
  const m = Math.floor((hourFloat - h) * 60);
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
