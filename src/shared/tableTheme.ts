import { loadJson, saveJson } from './storage';

/** Wooden table colours, ported from the game-board site. Picking one re-tints the page, panels, shadows and text on the table. */
export interface TableTheme {
  id: string;
  name: string;
  hex: string;
}

export const TABLE_THEMES: TableTheme[] = [
  { id: 'ironwood', name: 'Ironwood Tavern', hex: '#3C2A1C' },
  { id: 'ivory', name: 'Ivory Oak', hex: '#E6D1AC' },
  { id: 'natural', name: 'Natural Oak', hex: '#E8CCB0' },
  { id: 'blush', name: 'Blush Oak', hex: '#DBB093' },
  { id: 'caramel', name: 'Caramel Oak', hex: '#C88354' },
  { id: 'chestnut', name: 'Chestnut Oak', hex: '#A56142' },
  { id: 'walnut', name: 'Walnut', hex: '#875C39' },
  { id: 'espresso', name: 'Espresso Wood', hex: '#462F20' },
];

const VARS = [
  '--walnut-rgb',
  '--walnut-2-rgb',
  '--charred-oak-rgb',
  '--shadow-card',
  '--shadow-deep',
  '--table-shadow',
  '--on-table',
  '--on-table-dim',
];

function hexToHsl(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

function luminance(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

function lighten(hex: string, amt: number) {
  const n = Number.parseInt(hex.slice(1), 16);
  const mix = (v: number) => Math.round(v + (255 - v) * amt);
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => mix(v).toString(16).padStart(2, '0')).join('')}`;
}

function inkFor(hex: string) {
  const dark = { ink: '#2b1c10', dim: '#3f2c1b' };
  const light = { ink: '#f6ecd6', dim: '#eadfc4' };
  const worst = (ink: string) => Math.min(contrast(ink, hex), contrast(ink, lighten(hex, 0.12)));
  return worst(dark.dim) >= worst(light.dim) ? dark : light;
}

function channels(h: number, s: number, l: number) {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
  };
  return `${f(0)} ${f(8)} ${f(4)}`;
}

const hsl = (h: number, s: number, l: number) =>
  `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%)`;

/** Applies a table colour to `el` (default: the body). The stylesheet's own Ironwood values apply when none is set. */
export function applyTable(id: string, el: HTMLElement = document.body): TableTheme {
  const theme = TABLE_THEMES.find((t) => t.id === id) ?? TABLE_THEMES[0];
  for (const v of VARS) el.style.removeProperty(v);
  el.style.removeProperty('background');
  el.dataset.table = theme.id;
  if (theme.id === 'ironwood') return theme;
  const c = hexToHsl(theme.hex);
  const panel = c.l < 0.3 ? 0.27 : 0.17;
  const s = Math.min(c.s, 0.5);
  const text = inkFor(theme.hex);
  const shadow = (a: number) => `hsl(${c.h.toFixed(0)} ${(s * 100).toFixed(0)}% 6% / ${a})`;
  el.style.background = `linear-gradient(135deg, ${hsl(c.h, c.s, Math.min(c.l + 0.08, 0.93))}, ${theme.hex} 50%, ${hsl(c.h, c.s, Math.max(c.l - 0.11, 0.05))})`;
  el.style.backgroundAttachment = 'fixed';
  el.style.setProperty('--walnut-rgb', channels(c.h, s, panel));
  el.style.setProperty('--walnut-2-rgb', channels(c.h, s, panel + 0.06));
  el.style.setProperty('--charred-oak-rgb', channels(c.h, s, Math.max(panel - 0.07, 0.06)));
  el.style.setProperty('--shadow-card', `0 8px 20px ${shadow(0.35)}`);
  el.style.setProperty('--shadow-deep', `0 24px 60px ${shadow(0.5)}`);
  el.style.setProperty('--table-shadow', shadow(0.4));
  el.style.setProperty('--on-table', text.ink);
  el.style.setProperty('--on-table-dim', text.dim);
  return theme;
}

export const loadTable = () => {
  const id = loadJson<string>('table');
  return typeof id === 'string' && TABLE_THEMES.some((t) => t.id === id) ? id : 'ironwood';
};
export const saveTable = (id: string) => saveJson('table', id);
