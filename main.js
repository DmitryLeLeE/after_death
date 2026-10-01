/* ═══════════════════════════════════════════════
   MORS — main.js · gothic manuscript edition
   Ink charts are drawn with the jittered pen from zine.js,
   so every line looks put down by hand — but the same hand every visit.
   ═══════════════════════════════════════════════ */
(function () {
'use strict';

const Z = window.Zine;
const t0 = performance.now();

/* ─────────────────────────────────────────────
   UTILS
   ───────────────────────────────────────────── */
const isMobile = window.matchMedia('(max-width: 700px)').matches;
const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const fmt = (n, d = 0) => n.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
};

/* ─────────────────────────────────────────────
   LOADER
   ───────────────────────────────────────────── */
const loaderTxt = $('#loaderTxt');
const loaderBarFill = $('#loaderBarFill');
let loaderRun = true;
(function progress() {
  if (!loaderRun) return;
  const pct = Math.min(97, Math.floor((performance.now() - t0) / 14));
  if (loaderTxt) loaderTxt.textContent = 'accendo · ' + String(pct).padStart(3, '0') + '%';
  if (loaderBarFill) loaderBarFill.style.width = pct + '%';
  setTimeout(progress, 50);
})();

function finishLoader() {
  if (!loaderRun) return;
  loaderRun = false;
  if (loaderBarFill) loaderBarFill.style.width = '100%';
  if (loaderTxt) loaderTxt.textContent = 'accendo · 100%';
  setTimeout(() => {
    $('#loader')?.classList.add('gone');
    document.body.classList.add('ready');
    initAll();
  }, noMotion ? 0 : 350);
}

/* ─────────────────────────────────────────────
   CANVAS — smoke and rising embers
   ───────────────────────────────────────────── */
const canvas = $('#scene');
const ctx = canvas.getContext('2d');
let W, H;
function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
resize();
window.addEventListener('resize', resize, { passive: true });

const rng = Z.rng(0xdeadbeef);
const blobs = Array.from({ length: isMobile ? 8 : 15 }, () => ({
  x: rng() * 1920, y: rng() * 1080,
  r: 180 + rng() * 280,
  vx: (rng() - 0.5) * 0.18, vy: -0.05 - rng() * 0.12,
  phase: rng() * Math.PI * 2,
  alpha: 0.012 + rng() * 0.022,
  warm: rng() < 0.35,
}));
const sparks = Array.from({ length: isMobile ? 26 : 60 }, () => ({
  x: rng() * 1920, y: rng() * 1080,
  vx: (rng() - 0.5) * 0.3, vy: -0.15 - rng() * 0.4,
  life: rng(), maxLife: 0.5 + rng() * 1.5,
  size: 0.6 + rng() * 1.6,
  hot: rng() < 0.7,
}));

let fogTime = 0;
function drawFog() {
  fogTime += 0.003;
  ctx.clearRect(0, 0, W, H);
  blobs.forEach(b => {
    b.x += b.vx + Math.sin(fogTime + b.phase) * 0.12;
    b.y += b.vy;
    if (b.y + b.r < -50) { b.y = H + b.r; b.x = rng() * W; }
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    if (b.warm) {
      g.addColorStop(0, `rgba(200,134,47,${b.alpha})`);
      g.addColorStop(0.5, `rgba(120,40,20,${b.alpha * 0.4})`);
    } else {
      g.addColorStop(0, `rgba(70,20,20,${b.alpha * 1.4})`);
      g.addColorStop(0.5, `rgba(20,10,10,${b.alpha * 0.5})`);
    }
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.r, b.r * (0.6 + Math.sin(fogTime * 0.7 + b.phase) * 0.15), fogTime * 0.05, 0, Math.PI * 2);
    ctx.fill();
  });
  sparks.forEach(sp => {
    sp.x += sp.vx + Math.sin(fogTime * 2 + sp.y * 0.01) * 0.15;
    sp.y += sp.vy;
    sp.life += 0.008;
    if (sp.life > sp.maxLife) {
      sp.x = rng() * W; sp.y = H + 20;
      sp.vx = (rng() - 0.5) * 0.3; sp.vy = -0.15 - rng() * 0.4;
      sp.life = 0; sp.maxLife = 0.5 + rng() * 1.5;
    }
    const t = sp.life / sp.maxLife;
    const alpha = Math.sin(t * Math.PI) * (sp.hot ? 0.3 : 0.12);
    if (alpha < 0.01) return;
    const g2 = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.size * 3);
    g2.addColorStop(0, sp.hot ? `rgba(240,170,80,${alpha})` : `rgba(220,80,60,${alpha})`);
    g2.addColorStop(1, 'rgba(120,30,10,0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sp.size * 3, 0, Math.PI * 2);
    ctx.fill();
  });
  requestAnimationFrame(drawFog);
}

/* ─────────────────────────────────────────────
   CURSOR — a small candle flame (fine pointers only)
   ───────────────────────────────────────────── */
const cursorEl = $('#cursor');
if (finePointer && !isMobile && !noMotion && cursorEl) {
  document.body.classList.add('has-cursor');
  let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
  window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  document.addEventListener('mouseover', e => {
    const hit = e.target.closest && e.target.closest('a, button, input, .rail-btn, .shields li, .timeline li, .myth');
    document.body.classList.toggle('cursor-hover', !!hit);
  });
  (function loop() {
    cx = lerp(cx, tx, 0.2); cy = lerp(cy, ty, 0.2);
    cursorEl.style.transform = `translate(${cx - 7}px,${cy - 16}px)`;
    requestAnimationFrame(loop);
  })();
}

/* ─────────────────────────────────────────────
   TITLES — letters rise out of the dark, words never break
   ───────────────────────────────────────────── */
function splitTitle(el) {
  if (!el || el.dataset.split) return;
  el.dataset.split = '1';
  const text = el.textContent.trim();
  el.setAttribute('aria-label', text);
  el.textContent = '';
  let k = 0;
  text.split(/\s+/).forEach((w, wi, arr) => {
    const word = document.createElement('span');
    word.className = 'word';
    word.setAttribute('aria-hidden', 'true');
    [...w].forEach(ch => {
      const wrap = document.createElement('span');
      wrap.className = 'char-wrap';
      const inner = document.createElement('span');
      inner.className = 'char-inner';
      inner.textContent = ch;
      inner.style.transitionDelay = (k++ * 34) + 'ms';
      wrap.appendChild(inner);
      word.appendChild(wrap);
    });
    el.appendChild(word);
    if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
  });
}
$$('.ch-title').forEach(splitTitle);

/* ─────────────────────────────────────────────
   COUNTERS
   ───────────────────────────────────────────── */
function countUp(el, target, duration) {
  const dec = (String(target).split('.')[1] || '').length;
  if (noMotion) { el.textContent = fmt(target, dec); return; }
  const start = performance.now();
  (function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 4);
    el.textContent = fmt(ease * target, dec);
    if (t < 1) requestAnimationFrame(step);
  })(start);
}

/* ═════════════════════════════════════════════
   INK — tiny SVG kit for hand-drawn charts
   ═════════════════════════════════════════════ */
const NS = 'http://www.w3.org/2000/svg';
const toMeasure = [];
function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function makeSvg(fig, w, h, label) {
  const svg = el('svg', { viewBox: `0 0 ${w} ${h}`, class: 'ink', role: 'img', 'aria-label': label });
  fig.appendChild(svg);
  return svg;
}
/* a pen line through points; drawn on reveal unless draw:false */
function ink(parent, pts, r, { cls = 'stroke', amp = 0.9, n = 4, delay = 0.3, dur = 1.4, draw = true } = {}) {
  const d = Z.penPath(n > 1 ? Z.subdivide(pts, n) : pts, r, amp);
  const p = el('path', { d, class: cls + (draw ? ' draw' : '') }, parent);
  p.style.setProperty('--delay', delay + 's');
  p.style.setProperty('--dur', dur + 's');
  if (draw) toMeasure.push(p);
  return p;
}
function txt(parent, x, y, str, { cls = '', anchor = 'start', i, rot = 0, size } = {}) {
  const t = el('text', { x, y, 'text-anchor': anchor, class: cls }, parent);
  if (rot) t.setAttribute('transform', `rotate(${rot} ${x} ${y})`);
  if (size) t.style.fontSize = size + 'px';
  if (i !== undefined) { t.classList.add('fade'); t.style.setProperty('--i', i); }
  t.textContent = str;
  return t;
}
/* a wobbly rectangle — the outline of a bar drawn freehand */
function roughRect(x, y, w, h, r, j = 1.6) {
  const jj = () => (r() - 0.5) * j;
  const pts = [[x + jj(), y + jj()], [x + w + jj(), y + jj()], [x + w + jj(), y + h + jj()], [x + jj(), y + h + jj()], [x + jj(), y + jj()]];
  return Z.penPath(Z.subdivide(pts, 3), r, j * 0.35) + ' Z';
}
/* a hatched bar that grows from the left */
function bar(parent, x, y, w, h, r, { fill = 'url(#hatch)', i = 0, red = false } = {}) {
  const g = el('g', { class: 'grow' }, parent);
  g.style.setProperty('--i', i);
  el('path', { d: roughRect(x, y, w, h, r), fill, class: 'roughen', opacity: 0.9 }, g);
  el('path', { d: roughRect(x, y, w, h, r, 2.2), class: 'stroke' + (red ? ' red' : ''), fill: 'none', style: 'stroke-width:1.3' }, g);
  return g;
}
function crossMark(parent, x, y, s, r, cls = 'stroke') {
  const j = () => (r() - 0.5) * 1.2;
  return el('path', {
    d: `M${x + j()} ${y - s + j()} L${x + j()} ${y + s * 1.25 + j()} M${x - s * 0.7 + j()} ${y - s * 0.25 + j()} L${x + s * 0.7 + j()} ${y - s * 0.25 + j()}`,
    class: cls,
  }, parent);
}
const logX = (v, v0, v1, x0, x1) => x0 + (Math.log10(v) - Math.log10(v0)) / (Math.log10(v1) - Math.log10(v0)) * (x1 - x0);

/* axis with handwritten ticks */
function logAxis(svg, r, { y, x0, x1, v0, v1, ticks, delay = 0.2 }) {
  ink(svg, [[x0 - 6, y], [x1 + 8, y]], r, { n: 8, amp: 0.8, delay, dur: 1.2 });
  ticks.forEach(([v, label], i) => {
    const x = logX(v, v0, v1, x0, x1);
    ink(svg, [[x, y - 5], [x, y + 5]], r, { n: 1, delay: delay + 0.3 + i * 0.05, dur: 0.3 });
    txt(svg, x, y + 22, label, { cls: 'mono', anchor: 'middle', i });
  });
}

const CHARTS = {

  /* II — the first hour after the heart stops */
  dying(fig) {
    const r = Z.rng(201);
    const svg = makeSvg(fig, 640, 240, 'Хронология первого часа после остановки сердца');
    const x0 = 40, x1 = 600, y = 125, v0 = 1, v1 = 3600;
    const X = v => logX(v, v0, v1, x0, x1);
    // the zone where damage becomes irreversible
    el('path', { d: roughRect(X(240), y - 12, X(3600) - X(240), 24, r, 2), fill: 'url(#hatch-red)', class: 'grow roughen', opacity: 0.5, style: '--i:6' }, svg);
    txt(svg, X(240) + 6, y - 18, 'зона необратимости', { cls: 'mono red', i: 8 });
    logAxis(svg, r, { y, x0, x1, v0, v1, ticks: [[1, '1 с'], [10, '10 с'], [60, '1 мин'], [600, '10 мин'], [3600, '1 ч']] });
    const ev = [
      [1, 'сердце остановилось', '0 с', 40, 'start', true],
      [15, 'сознание гаснет', '10–20 с', 178, 'middle'],
      [30, 'ЭЭГ плоская', '20–40 с', 78, 'middle'],
      [300, 'нейроны гибнут', '4–6 мин', 208, 'middle', true],
      [600, 'шансы без СЛР ≈ 0', '≈10 мин', 40, 'middle'],
      [1800, 'трупные пятна', '20–30 мин', 178, 'end'],
    ];
    ev.forEach(([v, label, time, ly, anchor, red], i) => {
      const x = X(v);
      const up = ly < y;
      ink(svg, [[x, up ? y - 8 : y + 8], [x + (r() - 0.5) * 6, up ? ly + 22 : ly - 18]], r, { cls: 'stroke thin', n: 3, delay: 0.9 + i * 0.18, dur: 0.5 });
      const dot = el('circle', { cx: x, cy: y, r: 4.5, class: 'pop', fill: red ? '#8b1a1a' : '#22170f' }, svg);
      dot.style.setProperty('--i', i * 6);
      txt(svg, x, ly, label, { cls: 'lbl' + (red ? ' red' : ''), anchor, i: i + 2 });
      txt(svg, x, ly + 16, time, { cls: 'mono', anchor, i: i + 2 });
    });
  },

  /* III — schematic EEG: normal rhythm, cardiac arrest, gamma surge, silence */
  eeg(fig) {
    const r = Z.rng(303);
    const svg = makeSvg(fig, 640, 210, 'Схема ЭЭГ: обычный ритм, остановка сердца, гамма-всплеск, тишина');
    const base = 112, arrest = 230;
    const before = [], after = [];
    for (let x = 10; x <= arrest; x += 2) {
      before.push([x, base + Math.sin(x * 0.21) * 9 + Math.sin(x * 0.53 + 1) * 5 + (r() - 0.5) * 6]);
    }
    for (let x = arrest; x <= 620; x += 1.5) {
      let a;
      if (x < 262) a = 3 + (r() - 0.5) * 3;
      else if (x < 430) {
        const env = Math.sin(Math.PI * (x - 262) / 168);
        a = Math.sin(x * 1.15) * 58 * env * (0.75 + r() * 0.35) + Math.sin(x * 0.4) * 8 * env;
      } else a = Math.sin(x * 0.9) * 10 * Math.exp(-(x - 430) / 22) + (r() - 0.5) * 1.2 * Math.exp(-(x - 430) / 60);
      after.push([x, base + a]);
    }
    ink(svg, before, r, { n: 1, amp: 0.3, dur: 1.2, delay: 0.3 });
    ink(svg, after, r, { cls: 'stroke red', n: 1, amp: 0.3, dur: 2.4, delay: 1.4 });
    ink(svg, [[arrest, 22], [arrest, 196]], r, { cls: 'stroke dash', n: 4 });
    txt(svg, arrest - 6, 28, 'остановка сердца', { cls: 'lbl', anchor: 'end', i: 2 });
    txt(svg, 20, 196, 'обычный ритм', { cls: 'mono', i: 1 });
    txt(svg, 346, 22, 'γ-всплеск', { cls: 'lbl red', anchor: 'middle', i: 12, size: 22 });
    txt(svg, 346, 204, '25–150 Гц · секунды–минуты', { cls: 'mono', anchor: 'middle', i: 12 });
    txt(svg, 616, 100, 'тишина', { cls: 'lbl', anchor: 'end', i: 18 });
  },

  /* IV — elements of near-death experience, van Lommel 2001 */
  nde(fig) {
    const r = Z.rng(404);
    const data = [
      ['положительные эмоции', 56], ['осознание своей смерти', 50], ['встреча с умершими', 32],
      ['движение по тоннелю', 31], ['неземной пейзаж', 29], ['выход из тела', 24],
      ['общение со светом', 23], ['видение цветов', 23], ['обзор прожитой жизни', 13], ['ощущение границы', 8],
    ];
    const row = 31, top = 12, lx = 222, bx = 234, scale = 380 / 60;
    const svg = makeSvg(fig, 640, top + data.length * row + 10, 'Элементы околосмертного опыта, процент пациентов');
    data.forEach(([label, v], i) => {
      const y = top + i * row;
      txt(svg, lx, y + 17, label, { anchor: 'end', i });
      bar(svg, bx, y + 3, v * scale, 19, r, { i, fill: i === 0 ? 'url(#hatch-red)' : i % 3 === 1 ? 'url(#cross)' : 'url(#hatch)', red: i === 0 });
      txt(svg, bx + v * scale + 10, y + 18, v + '%', { cls: 'lbl' + (i === 0 ? ' red' : ''), i: i + 4 });
    });
  },

  /* V — how long tissues survive without blood flow */
  tissues(fig) {
    const r = Z.rng(505);
    const data = [
      ['сознание', 0.33, '10–20 с'],
      ['нейроны коры', 5, '4–6 мин'],
      ['сердечная мышца', 30, '≈ 20–40 мин'],
      ['почки, печень', 60, '≈ 30–60 мин'],
      ['кожа, роговица', 1440, 'до суток: ещё для пересадки'],
      ['«гены после смерти»', 2880, '2 сут (мыши)'],
      ['стволовые клетки мышц', 24480, '17 суток'],
    ];
    const row = 38, top = 14, x0 = 205, x1 = 610, v0 = 0.1, v1 = 40000;
    const H = top + data.length * row + 40;
    const svg = makeSvg(fig, 640, H, 'Сколько живут ткани после остановки кровотока');
    const X = v => logX(v, v0, v1, x0, x1);
    data.forEach(([label, v, note], i) => {
      const y = top + i * row + 18;
      const last = i === data.length - 1;
      txt(svg, x0 - 14, y + 5, label, { anchor: 'end', cls: last ? 'red lbl' : '', i });
      ink(svg, [[x0, y], [X(v), y]], r, { cls: 'stroke' + (last ? ' red' : ''), n: 6, amp: 0.7, delay: 0.4 + i * 0.12, dur: 0.9 });
      const g = el('g', { class: 'pop' }, svg);
      g.style.setProperty('--i', 20 + i * 5);
      crossMark(g, X(v), y - 1, 8, r, 'stroke' + (last ? ' red' : ''));
      const right = X(v) > 470;
      txt(svg, X(v) + (right ? -12 : 12), y - 8, note, { cls: 'mono' + (last ? ' red' : ''), anchor: right ? 'end' : 'start', i: i + 6 });
    });
    logAxis(svg, r, { y: H - 26, x0, x1, v0, v1, ticks: [[1, '1 мин'], [60, '1 ч'], [1440, '1 сут'], [10080, '1 нед']], delay: 0.1 });
  },

  /* VI — the calendar of decay */
  decay(fig) {
    const r = Z.rng(606);
    const data = [
      ['остывание', 0.1, 24, 'url(#hatch)'],
      ['аутолиз', 0.1, 72, 'url(#dots)'],
      ['трупные пятна', 0.4, 12, 'url(#hatch-red)'],
      ['окоченение', 2, 72, 'url(#cross)'],
      ['вздутие', 48, 240, 'url(#hatch)'],
      ['активное гниение', 120, 720, 'url(#hatch-red)'],
      ['скелетизация', 720, 87600, 'url(#cross)'],
    ];
    const row = 32, top = 10, x0 = 150, x1 = 620, v0 = 0.1, v1 = 87600;
    const H = top + data.length * row + 44;
    const svg = makeSvg(fig, 640, H, 'Календарь распада тела, логарифмическая шкала времени');
    const X = v => logX(v, v0, v1, x0, x1);
    [24, 168, 720, 8760].forEach((v, i) => ink(svg, [[X(v), top], [X(v), H - 34]], r, { cls: 'stroke thin dash', n: 3, delay: 0.2 + i * 0.05 }));
    data.forEach(([label, a, b, fill], i) => {
      const y = top + i * row;
      txt(svg, x0 - 12, y + 19, label, { anchor: 'end', i });
      bar(svg, X(a), y + 5, X(b) - X(a), 19, r, { i: i * 1.5, fill, red: fill === 'url(#hatch-red)' });
    });
    txt(svg, X(87600) - 4, top + 6 * row - 4, '→ десятилетия', { cls: 'mono', anchor: 'end', i: 14 });
    logAxis(svg, r, { y: H - 28, x0, x1, v0, v1, ticks: [[1, '1 ч'], [24, '1 сут'], [168, '1 нед'], [720, '1 мес'], [8760, '1 год'], [87600, '10 лет']], delay: 0.1 });
  },

  /* VII — candles going out one by one; hearing burns last */
  candles(fig) {
    const r = Z.rng(707);
    const labels = [['голод', 'и жажда'], ['речь', ''], ['зрение', ''], ['осязание', ''], ['слух', 'последним']];
    const svg = makeSvg(fig, 640, 250, 'Порядок угасания: голод и жажда, речь, зрение, осязание, слух — последним');
    const defs = el('defs', {}, svg);
    const grad = el('radialGradient', { id: 'flameGrad', cx: '50%', cy: '70%', r: '60%' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#fff6d0' }, grad);
    el('stop', { offset: '40%', 'stop-color': '#e8b45a' }, grad);
    el('stop', { offset: '100%', 'stop-color': '#b5421c', 'stop-opacity': '0.2' }, grad);
    const step = 124, sx = 72;
    labels.forEach(([a, b], i) => {
      const cx = sx + i * step;
      const h = 74 + r() * 26 + (i === 4 ? 10 : 0);
      const top = 196 - h;
      const last = i === labels.length - 1;
      // wax body with shading on the right
      el('path', { d: roughRect(cx - 15, top, 30, h, r, 1.4), fill: '#e6dcc4', class: 'roughen' }, svg);
      el('path', { d: roughRect(cx + 4, top + 2, 11, h - 3, r, 1), fill: 'url(#hatch)', opacity: 0.45 }, svg);
      ink(svg, [[cx - 15, top + 1], [cx - 15, 196]], r, { n: 4, delay: 0.2 + i * 0.1, dur: 0.6 });
      ink(svg, [[cx + 15, top + 1], [cx + 15, 196]], r, { n: 4, delay: 0.25 + i * 0.1, dur: 0.6 });
      // a drip of wax over the rim
      ink(svg, [[cx - 15, top], [cx - 4, top - 2], [cx + 15, top], [cx + 9, top + 3], [cx + 8, top + 14 + r() * 10]], r, { n: 3, delay: 0.3 + i * 0.1, dur: 0.6, amp: 0.6 });
      ink(svg, [[cx, top - 1], [cx + 1, top - 9]], r, { n: 1, delay: 0.5 });
      ink(svg, [[cx - 34, 197], [cx + 34, 197]], r, { n: 5, delay: 0.1 });
      // the flame
      const flame = el('g', { class: last ? '' : 'c-out' }, svg);
      flame.style.setProperty('--i', i);
      const f = el('path', { d: `M${cx + 1} ${top - 42} C${cx + 13} ${top - 22}, ${cx + 10} ${top - 6}, ${cx + 1} ${top - 7} C${cx - 9} ${top - 6}, ${cx - 11} ${top - 22}, ${cx + 1} ${top - 42} Z`, fill: 'url(#flameGrad)', class: 'c-flame' }, flame);
      if (last) {
        f.setAttribute('filter', 'url(#glow)');
        el('circle', { cx: cx + 1, cy: top - 18, r: 34, fill: '#e8b45a', opacity: 0.16 }, svg);
      } else {
        const smoke = el('g', { class: 'c-smoke' }, svg);
        smoke.style.setProperty('--i', i);
        el('path', { d: Z.penPath([[cx + 1, top - 10], [cx - 6, top - 26], [cx + 6, top - 40], [cx - 3, top - 56], [cx + 4, top - 70]], r, 2), class: 'stroke thin', fill: 'none' }, smoke);
      }
      txt(svg, cx, 220, a, { anchor: 'middle', cls: 'lbl' + (last ? ' red' : ''), i: i + 2, size: last ? 22 : 18 });
      if (b) txt(svg, cx, 238, b, { anchor: 'middle', cls: 'mono' + (last ? ' red' : ''), i: i + 2 });
      txt(svg, cx - 30, top + 20, ['I', 'II', 'III', 'IV', 'V'][i], { cls: 'mono', anchor: 'end', i: i + 1 });
    });
  },

  /* VIII — the body by mass vs by count of atoms */
  atoms(fig) {
    const r = Z.rng(808);
    const rows = [
      ['по массе', [['O', 65, 'url(#hatch)'], ['C', 18.5, 'url(#cross)'], ['H', 9.5, 'url(#hatch-red)'], ['N', 3.2, 'url(#dots)'], ['', 3.8, 'none']], 'N, Ca, P и др. — 7%'],
      ['по числу атомов', [['H', 62, 'url(#hatch-red)'], ['O', 24, 'url(#hatch)'], ['C', 12, 'url(#cross)'], ['', 2, 'url(#dots)']], 'N и др. — 2%'],
    ];
    const svg = makeSvg(fig, 640, 236, 'Состав тела: по массе в основном кислород, по числу атомов — водород');
    const x0 = 20, w = 600, bh = 40;
    rows.forEach(([title, segs, rest], ri) => {
      const y = 34 + ri * 104;
      txt(svg, x0, y - 10, title, { cls: 'lbl', i: ri * 4, size: 20 });
      let x = x0;
      segs.forEach(([sym, pct, fill], si) => {
        const sw = (pct / 100) * w;
        bar(svg, x, y, sw, bh, r, { i: ri * 5 + si, fill, red: sym === 'H' });
        if (sym && sw > 40) {
          txt(svg, x + sw / 2, y + bh + 22, `${sym} · ${fmt(pct, pct % 1 ? 1 : 0)}%`, { cls: 'lbl' + (sym === 'H' ? ' red' : ''), anchor: 'middle', i: ri * 5 + si + 3 });
          ink(svg, [[x + sw / 2, y + bh + 4], [x + sw / 2, y + bh + 8]], r, { n: 1, delay: 1 });
        }
        x += sw;
      });
      txt(svg, x0 + w, y - 10, rest, { cls: 'mono', anchor: 'end', i: ri * 5 + 7 });
    });
  },

  /* IX — leading causes of death, WHO 2019 */
  causes(fig) {
    const r = Z.rng(909);
    const data = [
      ['ишемическая болезнь сердца', 8.9], ['инсульт', 6.2], ['ХОБЛ', 3.3], ['инфекции нижних дыхат. путей', 2.6],
      ['неонатальные состояния', 2.0], ['рак лёгких, трахеи, бронхов', 1.8], ['Альцгеймер и деменции', 1.6],
      ['диарейные болезни', 1.5], ['диабет', 1.5], ['болезни почек', 1.3],
    ];
    const row = 30, top = 8, lx = 262, bx = 274, scale = 300 / 8.9;
    const svg = makeSvg(fig, 640, top + data.length * row + 8, 'Десять главных причин смерти в мире, миллионов в год');
    data.forEach(([label, v], i) => {
      const y = top + i * row;
      txt(svg, lx, y + 18, label, { anchor: 'end', i, size: 16 });
      bar(svg, bx, y + 4, v * scale, 18, r, { i, fill: i < 2 ? 'url(#hatch-red)' : 'url(#hatch)', red: i < 2 });
      txt(svg, bx + v * scale + 10, y + 19, fmt(v, 1), { cls: 'lbl' + (i < 2 ? ' red' : ''), i: i + 4 });
    });
  },

  /* IX — 117 billion born: crosses for the dead, red for the living */
  ever(fig) {
    const r = Z.rng(1117);
    const cols = 13, rowsN = 9, s = 23, ox = 16, oy = 16;
    const svg = makeSvg(fig, cols * s + 20, rowsN * s + 66, '117 миллиардов когда-либо рождённых людей: около 8 миллиардов живы сейчас');
    for (let i = 0; i < cols * rowsN; i++) {
      const cx = ox + (i % cols) * s + (r() - 0.5) * 2, cy = oy + Math.floor(i / cols) * s + (r() - 0.5) * 2;
      const alive = i >= cols * rowsN - 8;
      const g = el('g', { class: 'pop' }, svg);
      g.style.setProperty('--i', i * 0.6);
      if (alive) el('circle', { cx, cy, r: 7.5, fill: '#8b1a1a', class: 'roughen' }, g);
      else crossMark(g, cx, cy, 6.5, r, 'stroke');
    }
    const ly = oy + rowsN * s + 8;
    txt(svg, ox - 6, ly, '✝ = 1 млрд умерших', { cls: 'mono', i: 40 });
    txt(svg, ox - 6, ly + 18, '● = 1 млрд живых', { cls: 'mono red', i: 42 });
    txt(svg, ox - 6, ly + 40, 'живых — лишь ~7% от всех', { cls: 'lbl red', i: 44 });
  },

  /* IX — life expectancy since 1800 */
  life(fig) {
    const r = Z.rng(1800);
    const pts = [[1800, 29], [1850, 29.5], [1900, 32], [1950, 46.5], [1970, 56.5], [1990, 64], [2000, 66.5], [2010, 70.1], [2019, 72.8], [2021, 71], [2023, 73.2]];
    const W = 380, Hh = 250, x0 = 40, x1 = 360, y0 = 210, y1 = 20;
    const X = yr => x0 + (yr - 1800) / (2025 - 1800) * (x1 - x0);
    const Y = v => y0 - (v - 20) / (80 - 20) * (y0 - y1);
    const svg = makeSvg(fig, W, Hh, 'Ожидаемая продолжительность жизни в мире выросла с 29 лет в 1800 году до 73 лет в 2023');
    ink(svg, [[x0, y1 - 6], [x0, y0]], r, { n: 6, delay: 0.1 });
    ink(svg, [[x0, y0], [x1 + 6, y0]], r, { n: 6, delay: 0.2 });
    [30, 50, 70].forEach((v, i) => {
      ink(svg, [[x0 - 4, Y(v)], [x1, Y(v)]], r, { cls: 'stroke thin dash', n: 5, delay: 0.2 });
      txt(svg, x0 - 8, Y(v) + 4, String(v), { cls: 'mono', anchor: 'end', i });
    });
    [1800, 1900, 1950, 2000].forEach((yr, i) => txt(svg, X(yr), y0 + 20, String(yr), { cls: 'mono', anchor: 'middle', i }));
    // area under the curve, hatched
    const area = `M${X(1800)} ${y0} ` + pts.map(([a, b]) => `L${X(a).toFixed(1)} ${Y(b).toFixed(1)}`).join(' ') + ` L${X(2023)} ${y0} Z`;
    el('path', { d: area, fill: 'url(#hatch)', opacity: 0.35, class: 'fade roughen', style: '--i:10' }, svg);
    ink(svg, pts.map(([a, b]) => [X(a), Y(b)]), r, { cls: 'stroke red', n: 3, amp: 0.6, dur: 2, delay: 0.6 });
    [[1800, 29, '≈29', 'start', -10], [1950, 46.5, '46', 'end', -8], [2023, 73.2, '73', 'end', -12]].forEach(([a, b, l, anc, dy], i) => {
      txt(svg, X(a) + (anc === 'end' ? -6 : 4), Y(b) + dy, l, { cls: 'lbl red', anchor: anc, i: 10 + i * 3, size: 20 });
    });
    txt(svg, X(2021) - 4, Y(71) + 26, 'COVID', { cls: 'mono', anchor: 'end', i: 18 });
    txt(svg, x0 + 8, y1 + 4, 'лет', { cls: 'mono', i: 1 });
  },
};

$$('figure.chart[data-chart]').forEach(fig => {
  const fn = CHARTS[fig.dataset.chart];
  if (fn) fn(fig);
});

/* ─────────────────────────────────────────────
   HOURGLASS — the sand is your scroll
   ───────────────────────────────────────────── */
const hg = $('#hourglass');
let hgTop, hgBot, hgStream;
if (hg) {
  const r = Z.rng(1313);
  const defs = el('defs', {}, hg);
  const topBulb = 'M42 42 C40 102, 92 120, 96 150 L104 150 C108 120, 160 102, 158 42 Z';
  const botBulb = 'M96 150 C92 180, 40 198, 42 258 L158 258 C160 198, 108 180, 104 150 Z';
  const c1 = el('clipPath', { id: 'hgTopClip' }, defs); el('path', { d: topBulb }, c1);
  const c2 = el('clipPath', { id: 'hgBotClip' }, defs); el('path', { d: botBulb }, c2);
  const gt = el('g', { 'clip-path': 'url(#hgTopClip)' }, hg);
  hgTop = el('rect', { x: 30, y: 60, width: 140, height: 100, class: 'sand' }, gt);
  const gb = el('g', { 'clip-path': 'url(#hgBotClip)' }, hg);
  hgBot = el('path', { d: '', class: 'sand' }, gb);
  hgStream = el('line', { x1: 100, y1: 148, x2: 100, y2: 258, class: 'stream' }, hg);
  // glass and frame, inked
  el('path', { d: topBulb, class: 'frame' }, hg);
  el('path', { d: botBulb, class: 'frame' }, hg);
  el('path', { d: Z.penPath([[52, 60], [58, 96], [80, 118]], r, 1), class: 'frame thin' }, hg); // glint
  el('path', { d: roughRect(22, 22, 156, 18, r, 2), class: 'frame' }, hg);
  el('path', { d: roughRect(22, 260, 156, 18, r, 2), class: 'frame' }, hg);
  [30, 170].forEach(x => el('path', { d: Z.penPath(Z.subdivide([[x, 40], [x, 260]], 8), r, 1.4), class: 'frame' }, hg));
  // a few knots on the posts
  [30, 170].forEach(x => [90, 150, 210].forEach(y => el('path', { d: `M${x - 5} ${y} Q${x} ${y - 6} ${x + 5} ${y} Q${x} ${y + 6} ${x - 5} ${y}`, class: 'frame thin' }, hg)));
  // finials
  [[30, 22], [170, 22], [30, 278], [170, 278]].forEach(([x, y]) => el('circle', { cx: x, cy: y < 100 ? y - 6 : y + 6, r: 5, class: 'frame' }, hg));
}
function updateHourglass(p) {
  if (!hgTop) return;
  // top: sand surface sinks from y=60 to the neck
  hgTop.setAttribute('y', (60 + p * 92).toFixed(1));
  // bottom: a heap that rises with a little cone
  const h = 6 + p * 92, base = 258, peak = base - h;
  hgBot.setAttribute('d', `M30 ${base} L30 ${(peak + 18).toFixed(1)} Q100 ${(peak - 6).toFixed(1)} 170 ${(peak + 18).toFixed(1)} L170 ${base} Z`);
  hgStream.style.opacity = p > 0.985 ? 0 : 1;
  hgStream.setAttribute('y2', (peak + 8).toFixed(1));
}

/* ─────────────────────────────────────────────
   APPENDIX SKULL
   ───────────────────────────────────────────── */
const skull = $('#appxSkull');
if (skull) {
  const g = el('g', { filter: 'url(#rough-strong)' }, skull);
  el('path', { d: 'M28 80 C22 26, 138 26, 132 80 C132 100, 124 108, 120 118 L120 134 C120 142 113 147 106 147 L54 147 C47 147 40 142 40 134 L40 118 C36 108 28 100 28 80 Z' }, g);
  el('ellipse', { cx: 57, cy: 88, rx: 16, ry: 14, class: 'sock' }, g);
  el('ellipse', { cx: 103, cy: 88, rx: 16, ry: 14, class: 'sock' }, g);
  el('path', { d: 'M80 104 L72 121 L88 121 Z', class: 'sock' }, g);
  el('path', { d: 'M52 134 L108 134 M60 126 L60 146 M70 126 L70 147 M80 126 L80 147 M90 126 L90 147 M100 126 L100 146' }, g);
  el('path', { d: 'M96 40 L101 54 L94 63 L100 74' }, g);
  el('path', { d: 'M40 60 C46 50, 52 46, 60 44' }, g);
  el('circle', { cx: 57, cy: 89, r: 3.4, class: 'ember-eye' }, skull);
  el('circle', { cx: 103, cy: 89, r: 3.4, class: 'ember-eye' }, skull);
}

/* measure every pen stroke once it exists, so it can be drawn by dash offset */
function measureStrokes() {
  toMeasure.forEach(p => {
    if (p.dataset.len) return;
    const len = Math.ceil(p.getTotalLength()) + 2;
    p.dataset.len = len;
    p.style.setProperty('--len', len);
  });
}
measureStrokes();

/* ─────────────────────────────────────────────
   TICKER
   ───────────────────────────────────────────── */
const TICKER = [
  'memento mori', 'в мире каждую секунду умирают ~2 человека и рождаются ~4',
  'omnia mors aequat', 'слух, вероятно, уходит последним',
  'vita brevis', 'углерод в твоём теле старше Солнца',
  'ars moriendi', 'живых сейчас — лишь ~7% от всех когда-либо рождённых',
  'mors certa, hora incerta', '80 лет — это ~4170 недель',
  'requiescat in pace',
].join('   ✝   ');
const tickerEl = $('#ticker');
if (tickerEl) {
  tickerEl.textContent = TICKER + '   ✝   ' + TICKER;
  let off = 0;
  if (!noMotion) (function animTicker() {
    const half = tickerEl.scrollWidth / 2;
    off = half ? (off + 0.35) % half : 0;
    tickerEl.style.transform = `translateX(calc(-50% - ${off}px))`;
    requestAnimationFrame(animTicker);
  })();
}

/* ─────────────────────────────────────────────
   ATOM STREAM
   ───────────────────────────────────────────── */
const atomEl = $('#atomStream');
if (atomEl && !noMotion) {
  const BASE = atomEl.textContent + '   ·   ';
  let ph = 0;
  (function animAtoms() {
    const rep = BASE.repeat(3);
    let out = '';
    for (let i = 0; i < rep.length; i++) {
      const ch = rep[(i + ph) % rep.length];
      out += (ch !== ' ' && (i + ph) % 9 === 0) ? `<span class="m">${ch}</span>` : ch;
    }
    atomEl.innerHTML = out;
    ph++;
    setTimeout(() => requestAnimationFrame(animAtoms), 220);
  })();
}

/* ─────────────────────────────────────────────
   LIVE DEATHS / BIRTHS since the page opened
   ~62 млн смертей и ~132 млн рождений в год (UN WPP 2024)
   ───────────────────────────────────────────── */
const YEAR_S = 365.25 * 24 * 3600;
const DEATHS_PS = 62e6 / YEAR_S, BIRTHS_PS = 132e6 / YEAR_S;
const liveD = $('#liveDeaths'), liveB = $('#liveBirths');
setInterval(() => {
  const s = (performance.now() - t0) / 1000;
  if (liveD) liveD.textContent = fmt(Math.floor(s * DEATHS_PS));
  if (liveB) liveB.textContent = fmt(Math.floor(s * BIRTHS_PS));
}, 250);

/* ─────────────────────────────────────────────
   MEMENTO MORI — a life in weeks
   ───────────────────────────────────────────── */
const weeksCanvas = $('#weeks');
const birthIn = $('#birthYear'), lifeIn = $('#lifeYears'), factsEl = $('#weeksFacts');
const WEEKS_PER_YEAR = 52.1775;
if (birthIn) {
  const nowYear = new Date().getFullYear();
  birthIn.max = nowYear;
  const savedB = store.get('mors.birth'), savedL = store.get('mors.life');
  if (savedB) birthIn.value = savedB;
  if (savedL) lifeIn.value = savedL;
}
function drawWeeks() {
  if (!weeksCanvas) return;
  const nowYear = new Date().getFullYear();
  const life = clamp(parseInt(lifeIn.value, 10) || 80, 30, 110);
  const by = clamp(parseInt(birthIn.value, 10) || 1995, 1900, nowYear);
  // with only a year known, assume the middle of it
  const birth = new Date(by, 6, 1);
  const livedWeeks = Math.max(0, Math.floor((Date.now() - birth) / (7 * 864e5)));
  const livedYears = livedWeeks / WEEKS_PER_YEAR;
  const totalCells = life * 52;
  const filled = Math.min(totalCells, Math.floor(livedYears * 52));

  const cssW = weeksCanvas.parentElement.clientWidth || 600;
  const left = 24, cols = 52;
  const cell = (cssW - left) / cols;
  const cssH = Math.ceil(cell * life + 4);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  weeksCanvas.width = Math.round(cssW * dpr);
  weeksCanvas.height = Math.round(cssH * dpr);
  weeksCanvas.style.height = cssH + 'px';
  const c = weeksCanvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, cssW, cssH);
  const r = Z.rng(4170);
  const s = Math.max(2, cell * 0.68);
  c.lineCap = 'round';
  for (let i = 0; i < totalCells; i++) {
    const row = Math.floor(i / cols), col = i % cols;
    const x = left + col * cell + (cell - s) / 2 + (r() - 0.5) * 0.5;
    const y = row * cell + (cell - s) / 2 + (r() - 0.5) * 0.5;
    const rot = (r() - 0.5) * 0.12;
    c.save();
    c.translate(x + s / 2, y + s / 2);
    c.rotate(rot);
    if (i < filled) {
      c.fillStyle = `rgba(34,23,15,${0.72 + r() * 0.25})`;
      c.fillRect(-s / 2, -s / 2, s, s);
    } else if (i === filled) {
      c.fillStyle = '#8b1a1a';
      c.fillRect(-s / 2 - 0.5, -s / 2 - 0.5, s + 1, s + 1);
    } else {
      c.strokeStyle = 'rgba(34,23,15,.42)';
      c.lineWidth = 0.7;
      c.strokeRect(-s / 2, -s / 2, s, s);
    }
    c.restore();
  }
  c.fillStyle = 'rgba(75,56,37,.9)';
  c.font = `${Math.max(9, Math.min(12, cell * 1.3))}px "PT Mono", monospace`;
  c.textBaseline = 'middle';
  for (let y = 10; y <= life; y += 10) c.fillText(String(y), 0, (y - 0.5) * cell);

  const leftWeeks = Math.max(0, Math.round(life * WEEKS_PER_YEAR - livedWeeks));
  const leftYears = leftWeeks / WEEKS_PER_YEAR;
  const minutes = livedWeeks * 7 * 24 * 60;
  const facts = leftWeeks > 0 ? [
    [fmt(livedWeeks), `недель прожито — ${fmt(Math.min(100, livedYears / life * 100))}% листа`],
    [fmt(leftWeeks), `недель до горизонта в ${life} лет`],
    [fmt(Math.floor(leftYears)), 'лет — столько раз ещё будет лето'],
    [fmt(Math.round(leftYears * 12.37)), 'полнолуний впереди'],
    [`≈ ${fmt(minutes * 70 / 1e9, 1)} млрд`, 'ударов сердца уже позади'],
    [`≈ ${fmt(minutes * 15 / 1e6)} млн`, 'вдохов уже сделано'],
  ] : [
    [fmt(livedWeeks), 'недель прожито'],
    ['за горизонтом', 'каждая новая неделя — сверх листа. Подарок.'],
    [`≈ ${fmt(minutes * 70 / 1e9, 1)} млрд`, 'ударов сердца уже позади'],
  ];
  if (factsEl) factsEl.innerHTML = facts.map(([n, t]) => `<li><strong>${n}</strong>${t}</li>`).join('');
}
if (birthIn) {
  const onInput = () => {
    store.set('mors.birth', birthIn.value);
    store.set('mors.life', lifeIn.value);
    drawWeeks();
  };
  birthIn.addEventListener('input', onInput);
  lifeIn.addEventListener('input', onInput);
  $('#weeksForm').addEventListener('submit', e => e.preventDefault());
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawWeeks, 200); });
}

/* ─────────────────────────────────────────────
   SECTIONS, RAIL, TRACKER, DRIP, PARALLAX
   ───────────────────────────────────────────── */
const chapters = $$('.chapter');
const appendices = $$('.appx');
const navSections = [...chapters, ...appendices].filter(s => s.dataset.roman);
const allSections = [...chapters, ...appendices, ...$$('.appx-intro'), ...$$('.colophon')];
const chCurrent = $('#chCurrent'), chTitle = $('#chTitle'), chTotal = $('#chTotal');
if (chTotal) chTotal.textContent = String(navSections.length).padStart(2, '0');

const rail = $('#rail');
navSections.forEach(sec => {
  const btn = document.createElement('button');
  btn.className = 'rail-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', `${sec.dataset.roman}. ${sec.dataset.title || ''}`);
  btn.innerHTML = `<span class="rail-btn-label">${sec.dataset.title || ''}</span><span class="rail-btn-dot"></span>`;
  btn.addEventListener('click', () => sec.scrollIntoView({ behavior: noMotion ? 'auto' : 'smooth', block: 'start' }));
  rail.appendChild(btn);
});
const railBtns = $$('.rail-btn', rail);
let activeIdx = -1;
function setActive(idx) {
  if (idx === activeIdx || idx < 0) return;
  activeIdx = idx;
  railBtns.forEach((b, i) => { b.classList.toggle('on', i === idx); if (i === idx) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  if (chCurrent) chCurrent.textContent = String(idx + 1).padStart(2, '0');
  if (chTitle) chTitle.textContent = navSections[idx].dataset.title || '';
}

const fired = new Set();
const obs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const sec = entry.target;
    sec.classList.add('in');
    if (!fired.has(sec)) {
      fired.add(sec);
      sec.querySelectorAll('[data-count]').forEach(n => setTimeout(() => countUp(n, parseFloat(n.dataset.count), 1800), 500));
    }
  });
}, { threshold: 0.06, rootMargin: '0px 0px -12% 0px' });

const dripFill = $('#dripFill'), dripBead = $('#dripBead');
const bgNums = $$('.ch-bg-num');
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = clamp(max > 0 ? scrollY / max : 0, 0, 1);
    if (dripFill) dripFill.style.height = (p * 100) + '%';
    if (dripBead) dripBead.style.top = (p * 100) + '%';
    updateHourglass(p);
    // the section crossing the middle of the screen is the current one
    const mid = innerHeight * 0.45;
    let idx = -1;
    navSections.forEach((s, i) => { const b = s.getBoundingClientRect(); if (b.top <= mid && b.bottom > mid) idx = i; });
    if (idx < 0 && scrollY < innerHeight) idx = 0;
    setActive(idx);
    if (!noMotion) bgNums.forEach(num => {
      const b = num.parentElement.getBoundingClientRect();
      if (b.bottom < 0 || b.top > innerHeight) return;
      const offset = (b.top + b.height / 2 - innerHeight / 2) * 0.12;
      num.style.transform = `translate(-50%, calc(-50% + ${offset.toFixed(1)}px))`;
    });
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });

/* hero spinner */
const spinEl = $('#spin');
if (spinEl && !noMotion) { let si = 0; setInterval(() => { spinEl.textContent = '|/-\\'[si++ % 4]; }, 130); }

/* back to top */
['again', 'again2'].forEach(id => $('#' + id)?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: noMotion ? 'auto' : 'smooth' })));

/* ─────────────────────────────────────────────
   ZINE CONTENT — marginalia and stamps, keyed by section
   ───────────────────────────────────────────── */
const NOTES = {
  II: 'мозг: 2% массы,\n20% кислорода',
  III: '2 из 4 —\nне у всех!',
  IV: 'почти\nкаждый пятый',
  V: '17 дней —\nдольше всех',
  VI: 'вздутие —\nэто газы бактерий',
  VII: 'говори\nс ними',
  VIII: 'старше\nСолнца',
  IX: '≈ 2 в секунду',
  X: 'Байок:\n«4 фразы»',
  XI: 'закрашивай\nне зря',
};
const STAMPS = { II: 'зафиксировано', IV: 'не доказано', VI: 'необратимо', VIII: 'aeternum', IX: 'ВОЗ · 2019', XI: 'memento mori' };
const APPX_STAMPS = { A: 'проверено', C: 'архив', E: 'важно', F: 'лично' };

function drawScrawls() {
  $$('.under-scrawl').forEach(n => n.remove());
  [['#scrawl1', 101], ['#scrawl2', 202], ['#scrawl3', 303]].forEach(([id, seed]) => Z.scrawl($(id), seed));
}

/* ─────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────── */
function initAll() {
  Z.buildZine({ chapters, appendices, isMobile, notes: NOTES, stamps: STAMPS, appxStamps: APPX_STAMPS });
  Z.xeroxDust();
  drawScrawls();
  let st;
  const redraw = () => { clearTimeout(st); st = setTimeout(drawScrawls, 300); };
  window.addEventListener('resize', redraw);
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', redraw);
  measureStrokes();
  drawWeeks();
  allSections.forEach(s => obs.observe(s));
  if (!noMotion) requestAnimationFrame(drawFog);
  $('.chapter.hero')?.classList.add('in');
  onScroll();
}

/* wait for fonts (handwriting metrics matter for pen marks), but never more than ~2.5 s */
const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
Promise.race([fontsReady, new Promise(res => setTimeout(res, 2500))]).then(() => {
  const wait = Math.max(0, (noMotion ? 0 : 1300) - (performance.now() - t0));
  setTimeout(finishLoader, wait);
});

})();
