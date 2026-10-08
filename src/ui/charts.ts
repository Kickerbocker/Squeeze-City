// Small SVG charts drawn in code (no chart library).
const NS = 'http://www.w3.org/2000/svg';

function el(tag: string, attrs: Record<string, string | number>, text?: string): SVGElement {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Vertical bar chart with x labels; values ≥ 0. */
export function barChart(values: number[], labels: string[], ariaLabel: string): SVGSVGElement {
  const W = 340;
  const H = 130;
  const pad = { l: 26, r: 6, t: 14, b: 20 };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': ariaLabel }) as SVGSVGElement;
  const max = Math.max(1, ...values);
  const nice = niceMax(max);
  const bw = (W - pad.l - pad.r) / values.length;
  for (const f of [0, 0.5, 1]) {
    const y = pad.t + (H - pad.t - pad.b) * (1 - f);
    svg.append(el('line', { x1: pad.l, x2: W - pad.r, y1: y, y2: y, class: 'grid' }));
    svg.append(el('text', { x: pad.l - 4, y: y + 3, 'text-anchor': 'end', class: 'axis' }, String(Math.round(nice * f))));
  }
  values.forEach((v, i) => {
    const h = ((H - pad.t - pad.b) * v) / nice;
    const x = pad.l + i * bw + bw * 0.15;
    const bar = el('rect', { x, y: H - pad.b - h, width: bw * 0.7, height: Math.max(0, h), rx: 2, class: 'bar' });
    bar.append(el('title', {}, `${labels[i]}: ${v}`));
    svg.append(bar);
    if (v > 0) svg.append(el('text', { x: x + bw * 0.35, y: H - pad.b - h - 3, 'text-anchor': 'middle', class: 'val' }, String(v)));
    svg.append(el('text', { x: x + bw * 0.35, y: H - 6, 'text-anchor': 'middle', class: 'axis' }, labels[i] ?? ''));
  });
  return svg;
}

/** Line chart over days (index 0 = day 1). */
export function lineChart(values: number[], ariaLabel: string, format: (v: number) => string): SVGSVGElement {
  const W = 340;
  const H = 150;
  const pad = { l: 46, r: 8, t: 10, b: 20 };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': ariaLabel }) as SVGSVGElement;
  if (values.length === 0) return svg;
  const min = Math.min(0, ...values);
  const max = niceMax(Math.max(1, ...values));
  const x = (i: number) => pad.l + ((W - pad.l - pad.r) * i) / Math.max(1, values.length - 1);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - (v - min) / (max - min || 1));
  for (const f of [0, 0.5, 1]) {
    const v = min + (max - min) * f;
    svg.append(el('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), class: 'grid' }));
    svg.append(el('text', { x: pad.l - 4, y: y(v) + 3, 'text-anchor': 'end', class: 'axis' }, format(v)));
  }
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  svg.append(el('path', { d: `${d} L${x(values.length - 1)},${y(min)} L${x(0)},${y(min)} Z`, class: 'area' }));
  svg.append(el('path', { d, class: 'line' }));
  svg.append(el('text', { x: pad.l, y: H - 4, class: 'axis' }, 'Day 1'));
  svg.append(el('text', { x: W - pad.r, y: H - 4, 'text-anchor': 'end', class: 'axis' }, `Day ${values.length}`));
  return svg;
}

function niceMax(v: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
