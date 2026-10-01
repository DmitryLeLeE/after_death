/* ═══════════════════════════════════════════════
   MORS — main.js · forensic dark edition
   ═══════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   LOADER
   ───────────────────────────────────────────── */
const SKULL_FRAMES = [
`    .  .  .  .  .  .  .
  .   _____________   .
 .   /             \\   .
.   |   ()     ()   |  .
.   |               |  .
.   |    _______    |  .
 .   \\___/     \\___/  .
  .     |  | |  |    .
    .   |  | |  |  .
      . .__| |__. .`,

`    .  .  .  .  .  .  .
  .   _____________   .
 .   /             \\   .
.   |   (*)     (*)  |  .
.   |               |  .
.   |    _______    |  .
 .   \\___/ \\-/ \\___/  .
  .     |  | |  |    .
    .   |__| |__|  .
      . .        . .`,

`    .  .  .  .  .  .  .
  .   _____________   .
 .   /             \\   .
.   |   [ ]     [ ]  |  .
.   |               |  .
.   |    _______    |  .
 .   \\___/     \\___/  .
  .     || | | ||    .
    .   || | | ||  .
      . .__| |__. .`,
];

const loaderArt = document.getElementById('loaderArt');
const loaderTxt = document.getElementById('loaderTxt');
const loaderBarFill = document.getElementById('loaderBarFill');
let loaderFrame = 0, loaderRun = true;
const t0 = window.__t0 || performance.now();

function loaderTick() {
  if (!loaderRun) return;
  if (loaderArt) loaderArt.textContent = SKULL_FRAMES[loaderFrame % SKULL_FRAMES.length];
  loaderFrame++;
  setTimeout(() => requestAnimationFrame(loaderTick), 300);
}
loaderTick();

(function progress() {
  if (!loaderRun) return;
  const pct = Math.min(97, Math.floor((performance.now() - t0) / 22));
  if (loaderTxt) loaderTxt.textContent = 'initium · ' + String(pct).padStart(3, '0') + '%';
  if (loaderBarFill) loaderBarFill.style.width = pct + '%';
  setTimeout(progress, 50);
})();

function finishLoader() {
  loaderRun = false;
  if (loaderBarFill) loaderBarFill.style.width = '100%';
  if (loaderTxt) loaderTxt.textContent = 'initium · 100%';
  setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('gone');
    document.body.classList.add('ready');
    initAll();
  }, 400);
}

/* ─────────────────────────────────────────────
   UTILS
   ───────────────────────────────────────────── */
const isMobile = window.matchMedia('(max-width: 700px)').matches;
const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ─────────────────────────────────────────────
   CANVAS FOG — volumetric smoke blobs
   ───────────────────────────────────────────── */
const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize, { passive: true });

/* Seeded RNG — deterministic fog layout */
function mkRng(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return ((s >>> 0) / 4294967296);
  };
}
const rng = mkRng(0xdeadbeef);

const BLOB_COUNT = isMobile ? 8 : 16;
const blobs = Array.from({ length: BLOB_COUNT }, () => ({
  x: rng() * 1920,
  y: rng() * 1080,
  r: 180 + rng() * 280,
  vx: (rng() - 0.5) * 0.18,
  vy: -0.05 - rng() * 0.12,
  phase: rng() * Math.PI * 2,
  alpha: 0.012 + rng() * 0.025,
  hue: rng() < 0.3 ? 28 : 240,   /* copper or void-blue */
}));

/* Ember sparks */
const SPARK_COUNT = isMobile ? 30 : 70;
const sparks = Array.from({ length: SPARK_COUNT }, () => ({
  x: rng() * 1920, y: rng() * 1080,
  vx: (rng() - 0.5) * 0.3,
  vy: -0.15 - rng() * 0.4,
  life: rng(),
  maxLife: 0.5 + rng() * 1.5,
  size: 0.6 + rng() * 1.6,
  copper: rng() < 0.6,
}));

let fogTime = 0;
function drawFog() {
  if (noMotion) return;
  fogTime += 0.003;
  ctx.clearRect(0, 0, W, H);

  /* fog blobs */
  blobs.forEach(b => {
    b.x += b.vx + Math.sin(fogTime + b.phase) * 0.12;
    b.y += b.vy;
    if (b.y + b.r < -50) { b.y = H + b.r; b.x = rng() * W; }

    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    if (b.hue === 28) {
      g.addColorStop(0, `rgba(176,122,56,${b.alpha})`);
      g.addColorStop(0.5, `rgba(120,70,20,${b.alpha * 0.4})`);
    } else {
      g.addColorStop(0, `rgba(40,30,60,${b.alpha * 1.5})`);
      g.addColorStop(0.5, `rgba(15,12,24,${b.alpha * 0.5})`);
    }
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.r, b.r * (0.6 + Math.sin(fogTime * 0.7 + b.phase) * 0.15), fogTime * 0.05, 0, Math.PI * 2);
    ctx.fill();
  });

  /* ember sparks */
  sparks.forEach(sp => {
    sp.x += sp.vx + Math.sin(fogTime * 2 + sp.y * 0.01) * 0.15;
    sp.y += sp.vy;
    sp.life += 0.008;
    if (sp.life > sp.maxLife) {
      sp.x = rng() * W; sp.y = H + 20;
      sp.vx = (rng() - 0.5) * 0.3;
      sp.vy = -0.15 - rng() * 0.4;
      sp.life = 0; sp.maxLife = 0.5 + rng() * 1.5;
    }
    const t = sp.life / sp.maxLife;
    const alpha = Math.sin(t * Math.PI) * (sp.copper ? 0.25 : 0.1);
    if (alpha < 0.01) return;
    const g2 = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.size * 3);
    if (sp.copper) {
      g2.addColorStop(0, `rgba(220,170,80,${alpha})`);
      g2.addColorStop(1, 'rgba(180,100,20,0)');
    } else {
      g2.addColorStop(0, `rgba(200,200,255,${alpha * 0.5})`);
      g2.addColorStop(1, 'rgba(100,80,180,0)');
    }
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sp.size * 3, 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(drawFog);
}

/* ─────────────────────────────────────────────
   CUSTOM CURSOR
   ───────────────────────────────────────────── */
const cursorEl = document.getElementById('cursor');
let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
let tx = cx, ty = cy;

if (!isMobile && cursorEl) {
  window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  document.querySelectorAll('a, button, .rail-btn').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
  function updateCursor() {
    cx = lerp(cx, tx, 0.13);
    cy = lerp(cy, ty, 0.13);
    cursorEl.style.transform = `translate(${cx - 8}px,${cy - 8}px)`;
    requestAnimationFrame(updateCursor);
  }
  updateCursor();
}

/* ─────────────────────────────────────────────
   CHARACTER SPLIT ANIMATION — headings
   ───────────────────────────────────────────── */
function splitChars(el) {
  if (!el || el.dataset.split) return;
  el.dataset.split = '1';
  /* preserve inner HTML tags (em, br) */
  const nodes = [...el.childNodes];
  el.innerHTML = '';
  nodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      [...node.textContent].forEach((ch, i) => {
        const wrap = document.createElement('span');
        wrap.className = 'char-wrap';
        wrap.setAttribute('aria-hidden', 'true');
        const inner = document.createElement('span');
        inner.className = 'char-inner';
        inner.textContent = ch === ' ' ? '\u00a0' : ch;
        inner.style.transitionDelay = i * 38 + 'ms';
        wrap.appendChild(inner);
        el.appendChild(wrap);
      });
    } else {
      /* it's an element (em, br, etc.) */
      if (node.tagName === 'BR') {
        el.appendChild(document.createElement('br'));
      } else {
        const clone = node.cloneNode(true);
        const chars = [...(clone.textContent || '')];
        clone.textContent = '';
        chars.forEach((ch, i) => {
          const wrap = document.createElement('span');
          wrap.className = 'char-wrap';
          const inner = document.createElement('span');
          inner.className = 'char-inner';
          inner.textContent = ch === ' ' ? '\u00a0' : ch;
          inner.style.transitionDelay = i * 38 + 'ms';
          inner.style.color = 'inherit';
          wrap.appendChild(inner);
          clone.appendChild(wrap);
        });
        el.appendChild(clone);
      }
    }
  });
}

document.querySelectorAll('.ch-title').forEach(h => splitChars(h));

/* ─────────────────────────────────────────────
   COUNTER ANIMATION
   ───────────────────────────────────────────── */
function countUp(el, target, duration) {
  if (noMotion) { el.textContent = target.toLocaleString('ru'); return; }
  const startTime = performance.now();
  const isFloat = !Number.isInteger(target);
  function update(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 4);
    const val = ease * target;
    el.textContent = isFloat
      ? val.toFixed(1)
      : Math.round(val).toLocaleString('ru');
    if (t < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/* ─────────────────────────────────────────────
   PARALLAX — chapter background numerals
   ───────────────────────────────────────────── */
let scrollY = 0;
function updateParallax() {
  scrollY = window.scrollY;
  document.querySelectorAll('.ch-bg-num').forEach(num => {
    const section = num.parentElement;
    const rect = section.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    const offset = (mid - window.innerHeight / 2) * 0.12;
    num.style.transform = `translate(-50%, calc(-50% + ${offset}px))`;
  });
}
window.addEventListener('scroll', updateParallax, { passive: true });

/* ─────────────────────────────────────────────
   DRIP PROGRESS
   ───────────────────────────────────────────── */
const dripFill = document.getElementById('dripFill');
const dripBead = document.getElementById('dripBead');
const story = document.getElementById('story');

function updateDrip() {
  if (!story) return;
  const pct = clamp(window.scrollY / (story.offsetHeight - window.innerHeight), 0, 1);
  if (dripFill) dripFill.style.height = (pct * 100) + '%';
  if (dripBead) dripBead.style.top = (pct * 100) + '%';
}
window.addEventListener('scroll', updateDrip, { passive: true });

/* ─────────────────────────────────────────────
   CHAPTER TRACKER (top-right)
   ───────────────────────────────────────────── */
const chCurrent = document.getElementById('chCurrent');
const chTitle = document.getElementById('chTitle');
const chTotal = document.getElementById('chTotal');

/* ─────────────────────────────────────────────
   SPINNING CURSOR IN HERO
   ───────────────────────────────────────────── */
const spinEl = document.getElementById('spin');
let si = 0;
setInterval(() => { if (spinEl) spinEl.textContent = '|/-\\'[si++ % 4]; }, 130);

/* ─────────────────────────────────────────────
   TICKER
   ───────────────────────────────────────────── */
const TICKER_PARTS = [
  'memento mori', '·', 'каждую секунду умирает ~1.8 человека',
  '·', 'omnia mors aequat', '·', 'слух — последнее из чувств',
  '·', 'vita brevis', '·', 'атомы в твоём теле старше Солнца',
  '·', 'ars moriendi', '·', 'осознание смертности освобождает',
  '·', 'requiescat in pace'
].join('   ');

const tickerEl = document.getElementById('ticker');
if (tickerEl) {
  const full = TICKER_PARTS + '      ' + TICKER_PARTS;
  tickerEl.textContent = full;
  let off = 0;
  function animTicker() {
    const half = tickerEl.scrollWidth / 2;
    off = (off + 0.38) % half;
    tickerEl.style.transform = `translateX(calc(-50% - ${off}px))`;
    requestAnimationFrame(animTicker);
  }
  if (!noMotion) animTicker();
}

/* ─────────────────────────────────────────────
   ATOM STREAM
   ───────────────────────────────────────────── */
const atomEl = document.getElementById('atomStream');
if (atomEl && !noMotion) {
  const BASE = 'C H O N P S · C H O N P S · звезда → земля → жизнь  ';
  let ph = 0;
  function animAtoms() {
    let out = '';
    const rep = BASE.repeat(3);
    for (let i = 0; i < rep.length; i++) {
      const ch = rep[(i + ph) % rep.length];
      out += (ch !== ' ' && (i + ph) % 9 === 0)
        ? `<span class="m">${ch}</span>`
        : ch;
    }
    atomEl.innerHTML = out;
    ph++;
    setTimeout(() => requestAnimationFrame(animAtoms), 200);
  }
  animAtoms();
}

/* ─────────────────────────────────────────────
   ASCII HERO
   ───────────────────────────────────────────── */
const HERO_ASCII = `
  __  __  ___  ____  ____
 |  \\/  |/ _ \\|  _ \\/ ___|
 | |\\/| | | | | |_) \\___ \\
 | |  | | |_| |  _ < ___) |
 |_|  |_|\\___/|_| \\_\\____/`.trim();

const HERO_SUB = `  atlas mortis et transitus  ·  scientia mortis`;

const heroAscii = document.getElementById('asciiHero');
const heroSub = document.getElementById('asciiSub');
if (heroAscii) heroAscii.textContent = HERO_ASCII;
if (heroSub) heroSub.textContent = HERO_SUB;

/* ─────────────────────────────────────────────
   SCRAWL UNDERLINE (hand-drawn pen)
   ───────────────────────────────────────────── */
function drawScrawl(el, seed) {
  if (!el) return;
  const r = mkRng(seed);
  el.style.setProperty('--rot', (-2 + r() * 2) + 'deg');
  el.style.position = 'relative';
  requestAnimationFrame(() => {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!w) return;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', w + 20);
    svg.setAttribute('height', 16);
    svg.setAttribute('viewBox', `0 0 ${w + 20} 16`);
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = `position:absolute;left:-6px;top:${h + 2}px;overflow:visible;pointer-events:none`;
    const path = document.createElementNS(NS, 'path');
    /* wavy underline */
    const pts = Array.from({ length: 6 }, (_, i) => {
      const x = (i / 5) * (w + 8);
      const y = 8 + (r() - 0.5) * 5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    let d = `M${pts[0]}`;
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1].split(',').map(Number);
      const [nx, ny] = pts[i].split(',').map(Number);
      const mx = (px + nx) / 2, my = (py + ny) / 2;
      d += ` Q${px},${py} ${mx},${my}`;
    }
    d += ` L${pts[pts.length - 1]}`;
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'var(--copper)');
    path.setAttribute('stroke-width', '1.8');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('opacity', '0.6');
    const len = 600;
    path.style.cssText = `stroke-dasharray:${len};stroke-dashoffset:${len};transition:stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1) 0.8s`;
    svg.appendChild(path);
    el.appendChild(svg);
    requestAnimationFrame(() => { path.style.strokeDashoffset = '0'; });
  });
}

/* ─────────────────────────────────────────────
   APPENDIX VIRION
   ───────────────────────────────────────────── */
const appxVirion = document.getElementById('appxVirion');
if (appxVirion) {
  appxVirion.textContent =
`        .   *   .   *   .
    *       *       *
  .   *  .  _____  .  *   .
      *  . /     \\ .  *
  .   *  |   * *   |  *   .
   *   . |  *   *  | .   *
  .   *  |   * *   |  *   .
      *  . \\_____/ .  *
  .   *   .   *   .   *   .
    *       *       *`;
}

/* ─────────────────────────────────────────────
   INTERSECTION OBSERVER — master reveal system
   ───────────────────────────────────────────── */
const chapters = [...document.querySelectorAll('.chapter')];
const appendices = [...document.querySelectorAll('.appx')];
const appxIntros = [...document.querySelectorAll('.appx-intro')];
const colophons = [...document.querySelectorAll('.colophon')];
const allSections = [...chapters, ...appendices, ...appxIntros, ...colophons];

/* Total nav sections */
const navSections = [...chapters, ...appendices].filter(s => s.dataset.roman);
if (chTotal) chTotal.textContent = String(navSections.length).padStart(2, '0');

/* fired = set of already-animated sections (counters only once) */
const fired = new Set();

const obs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const sec = entry.target;
    sec.classList.add('in');

    /* Chapter tracker update */
    const idx = navSections.indexOf(sec);
    if (idx >= 0) {
      if (chCurrent) chCurrent.textContent = String(idx + 1).padStart(2, '0');
      if (chTitle) chTitle.textContent = sec.dataset.title || '';
      updateRail(sec);
    }

    /* Counter animations — only once */
    if (!fired.has(sec)) {
      fired.add(sec);
      sec.querySelectorAll('[data-count]').forEach(el => {
        const target = parseFloat(el.dataset.count);
        setTimeout(() => countUp(el, target, 1800), 500);
      });
    }

    updateDrip();
    updateParallax();
  });
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

allSections.forEach(s => obs.observe(s));

/* ─────────────────────────────────────────────
   RAIL NAVIGATION
   ───────────────────────────────────────────── */
const rail = document.getElementById('rail');

navSections.forEach((sec, i) => {
  const btn = document.createElement('button');
  btn.className = 'rail-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', sec.dataset.title || sec.dataset.roman);
  btn.innerHTML =
    `<span class="rail-btn-label">${sec.dataset.title || ''}</span>` +
    `<span class="rail-btn-dot"></span>`;
  btn.addEventListener('click', () => {
    sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  /* hover cursor */
  btn.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
  btn.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  rail.appendChild(btn);
});

function updateRail(active) {
  rail.querySelectorAll('.rail-btn').forEach((btn, i) => {
    btn.classList.toggle('on', navSections[i] === active);
  });
}

/* ─────────────────────────────────────────────
   HUD LENS BUTTONS
   ───────────────────────────────────────────── */
document.querySelectorAll('.modes button[data-lens]').forEach(btn => {
  btn.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
  btn.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  btn.addEventListener('click', () => {
    document.querySelectorAll('.modes button[data-lens]').forEach(b => {
      b.classList.remove('on'); b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true');
  });
});

/* ─────────────────────────────────────────────
   AGAIN BUTTONS
   ───────────────────────────────────────────── */
document.getElementById('again')?.addEventListener('click',
  () => window.scrollTo({ top: 0, behavior: 'smooth' }));
document.getElementById('again2')?.addEventListener('click',
  () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ─────────────────────────────────────────────
   HOVER INTERACTIONS — interactive elements
   ───────────────────────────────────────────── */
document.querySelectorAll('.again, .shields li, .timeline li').forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
});

/* ─────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────── */
function initAll() {
  /* Scrawls */
  drawScrawl(document.getElementById('scrawl1'), 101);
  drawScrawl(document.getElementById('scrawl2'), 202);
  drawScrawl(document.getElementById('scrawl3'), 303);

  /* Start fog */
  requestAnimationFrame(drawFog);

  /* Initial drip + parallax */
  updateDrip();
  updateParallax();

  /* Immediately trigger hero if visible */
  const hero = document.querySelector('.chapter.hero');
  if (hero) {
    hero.classList.add('in');
    updateRail(hero);
  }
}

/* ─────────────────────────────────────────────
   LOADER TIMING
   ───────────────────────────────────────────── */
const MIN_LOAD = 1400;
const elapsed = performance.now() - t0;
if (elapsed >= MIN_LOAD) {
  finishLoader();
} else {
  setTimeout(finishLoader, MIN_LOAD - elapsed);
}
