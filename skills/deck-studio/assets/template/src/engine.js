/* deck-studio engine — shared runtime for animated HTML decks.
   Slides, data and custom shapes live in deck.html; this file is normally not edited per deck.
   Docs: skills/deck-studio/references/layouts.md and particles.md */
(() => {
'use strict';
const D = window.DECK_DATA || {};
const CFG = Object.assign({ minutes: 20, locale: 'ru-RU' }, window.DECK_CONFIG || {});
const stage = document.getElementById('stage');
const slides = [...document.querySelectorAll('.slide')];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = v => typeof v === 'number' ? v.toLocaleString(CFG.locale) : String(v);
slides.forEach((s, i) => s.id = 's' + (i + 1));
const cssVar = (name, fb) => (getComputedStyle(document.documentElement).getPropertyValue(name) || '').trim() || fb;
const THEME = { ink: cssVar('--ink', '#f1eee8'), accent: cssVar('--accent', '#e8875f'), muted: cssVar('--muted', '#9b9ca4'), line: cssVar('--line', 'rgba(241,238,232,.14)') };

/* ---------- data fields ---------- */
const missing = new Set();
document.querySelectorAll('[data-f]').forEach(el => {
  const key = el.dataset.f, v = D[key];
  if (v === null || v === undefined || v === '') {
    el.innerHTML = '<span class="ph">' + (el.dataset.ph || '…') + '</span>';
    missing.add(key);
  } else {
    el.textContent = fmt(v) + (el.dataset.suffix || '');
    if (typeof v === 'number') el.dataset.val = v;
  }
});

/* ---------- typography: no hanging short words ---------- */
function typo(root) {
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (tw.nextNode()) nodes.push(tw.currentNode);
  nodes.forEach(n => {
    if (n.parentElement.closest('.notes, script, style, [data-type]')) return;
    let s = n.textContent;
    for (let k = 0; k < 2; k++) s = s.replace(/(^|[\s(«„"])([А-Яа-яЁёA-Za-z]{1,2})[ \t\n]+/g, '$1$2 ');
    s = s.replace(/[ \t\n]+—/g, ' —').replace(/(\d)[ \t\n]+(?=[А-Яа-яЁё])/g, '$1 ');
    n.textContent = s;
  });
}
slides.forEach(typo);

/* ---------- split titles into words ---------- */
function splitWords(el, base) {
  let i = 0;
  const wrap = content => {
    const w = document.createElement('span'); w.className = 'w';
    const wi = document.createElement('span'); wi.className = 'wi';
    wi.style.setProperty('--d', (base + i++ * 0.05).toFixed(3) + 's');
    if (content) wi.appendChild(content);
    w.appendChild(wi);
    return w;
  };
  const walk = node => {
    [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment();
        const ps = ch.previousSibling, prevEl = ps && ps.nodeType === 1 && (ps.classList.contains('w') ? 1 : ps.querySelectorAll('.w').length) <= 2 ? ps : null;
        let glue = null;
        ch.textContent.split(/([ \t\n]+)/).forEach((p, idx) => {
          if (!p) return;
          if (/^[ \t\n]+$/.test(p)) frag.appendChild(document.createTextNode(' '));
          else if (idx === 0 && prevEl) glue = wrap(document.createTextNode(p));
          else frag.appendChild(wrap(document.createTextNode(p)));
        });
        if (glue) {
          // punctuation right after <em>…</em> must not wrap onto its own line
          const nw = document.createElement('span'); nw.style.whiteSpace = 'nowrap';
          prevEl.replaceWith(nw); nw.append(prevEl, glue);
        }
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1) {
        if (ch.matches('[data-f], .ph')) { const w = wrap(null); ch.replaceWith(w); w.firstChild.appendChild(ch); }
        else walk(ch);
      }
    });
  };
  walk(el);
}
document.querySelectorAll('[data-a="words"]').forEach(el => splitWords(el, parseFloat(el.dataset.d || '.3')));

/* ---------- gap chart: <svg class="gapchart" data-labels="top|bottom|gap|start|end"> + <div class="gapchart-labels"> ---------- */
const CH = { x0: 150, x1: 1460, yb: 900, yt: 450 };
const workPt = u => [CH.x0 + (CH.x1 - CH.x0) * u, CH.yb - (CH.yb - CH.yt) * Math.pow(u, 1.5)];
const peoplePt = u => [CH.x0 + (CH.x1 - CH.x0) * u, CH.yb];
document.querySelectorAll('svg.gapchart').forEach((svg, ci) => {
  const [top, bottom, gapL, start, end] = (svg.dataset.labels || 'Объём работы|Люди|Разрыв|Сейчас|Через год').split('|');
  const pts = []; for (let k = 0; k <= 80; k++) pts.push(workPt(k / 80));
  const work = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
  const gap = work + ` L${CH.x1} ${CH.yb} L${CH.x0} ${CH.yb} Z`, gid = 'gg' + ci;
  svg.innerHTML = `
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${THEME.accent}" stop-opacity=".30"/><stop offset="1" stop-color="${THEME.accent}" stop-opacity=".03"/></linearGradient></defs>
    <path class="fade" style="--d:2.2s" d="${gap}" fill="url(#${gid})"/>
    <line x1="${CH.x1}" y1="${CH.yt - 40}" x2="${CH.x1}" y2="${CH.yb + 16}" style="stroke:${THEME.line};--d:1.6s" stroke-width="2" stroke-dasharray="4 10" class="fade"/>
    <path class="draw" style="--d:.9s;stroke:${THEME.muted}" pathLength="1" d="M${CH.x0} ${CH.yb} L${CH.x1} ${CH.yb}" stroke-width="3" fill="none"/>
    <path class="draw" style="--d:1.1s;stroke:${THEME.ink}" pathLength="1" d="${work}" stroke-width="3" fill="none"/>
    <circle class="fade" style="--d:2.6s;fill:${THEME.accent}" cx="${CH.x1}" cy="${CH.yt}" r="9"/>`;
  let lab = svg.nextElementSibling;
  if (!lab || !lab.classList.contains('gapchart-labels')) { lab = document.createElement('div'); lab.className = 'gapchart-labels'; svg.after(lab); }
  const g = workPt(.8);
  lab.innerHTML = `
    <div class="abs clabel fade" style="--d:2.4s;left:${CH.x1 + 32}px;top:${CH.yt - 16}px">${top}</div>
    <div class="abs clabel muted fade" style="--d:2.4s;left:${CH.x1 + 32}px;top:${CH.yb - 16}px">${bottom}</div>
    <div class="abs cgap fade" style="--d:2.8s;left:${g[0] - 60}px;top:${(g[1] + CH.yb) / 2 - 10}px">${gapL}</div>
    <div class="abs ctick fade" style="--d:1.4s;left:${CH.x0}px;top:${CH.yb + 34}px">${start}</div>
    <div class="abs ctick fade" style="--d:1.6s;right:${1920 - CH.x1}px;top:${CH.yb + 34}px">${end}</div>`;
});

/* ---------- 100 dots: <div class="dots" data-lit="35"> or data-lit="@field" ---------- */
const val = raw => raw && raw[0] === '@' ? D[raw.slice(1)] : +raw;
document.querySelectorAll('.dots').forEach(box => {
  const v = val(box.dataset.lit || '0'), lit = typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0;
  for (let k = 0; k < 100; k++) {
    const d = document.createElement('div');
    d.className = 'dot' + (k < lit ? ' lit' : '');
    d.style.setProperty('--d', (.45 + Math.random() * .7).toFixed(2) + 's');
    d.style.setProperty('--d2', (1.5 + k * .03).toFixed(2) + 's');
    box.appendChild(d);
  }
});

/* ---------- ratings grid: <div class="votes" data-groups="10:27,9:5"> (label:count, count may be @field) ---------- */
document.querySelectorAll('.votes').forEach(box => {
  let k = 0;
  (box.dataset.groups || '').split(',').filter(Boolean).forEach((g, gi) => {
    const [label, raw] = g.split(':'), cnt = +val(raw) || 0;
    for (let i = 0; i < cnt; i++) {
      const v = document.createElement('div'); v.className = 'vote g' + Math.min(gi, 1); v.textContent = label;
      v.style.setProperty('--d', (.6 + k++ * .035).toFixed(2) + 's'); box.appendChild(v);
    }
  });
});

/* ======================================================================
   Particle field
   ====================================================================== */
const FX = (() => {
  const cv = document.getElementById('fx'), ctx = cv.getContext('2d');
  const N = 1800;
  const px = new Float32Array(N), py = new Float32Array(N), pa = new Float32Array(N), ps = new Float32Array(N);
  const tx = new Float32Array(N), ty = new Float32Array(N), ta = new Float32Array(N), ts = new Float32Array(N);
  const tc = new Uint8Array(N), k = new Float32Array(N), s1 = new Float32Array(N), s2 = new Float32Array(N), s3 = new Float32Array(N);
  const acc = new Uint8Array(N);
  const R = Math.random, G = () => (R() + R() + R() + R() - 2) * 1.732;
  for (let i = 0; i < N; i++) {
    px[i] = R() * 1920; py[i] = R() * 1080; ps[i] = 1;
    k[i] = 1.1 + R() * 3.4; s1[i] = R(); s2[i] = R(); s3[i] = R();
    acc[i] = i % 31 === 0 ? 1 : 0;
  }
  const COL = [THEME.ink, THEME.accent, THEME.muted, THEME.accent];
  let S = 1, OX = 0, OY = 0, dpr = 1, form = [], formName = '', formT0 = 0, last = performance.now() / 1000;

  function project(o, n, bx, by, bz, cx, cy, Rr, opt) {
    const rot = opt.rot ?? .12, tilt = opt.tilt ?? .32, al = opt.alpha ?? .95, f = opt.focal ?? 1600;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    return t => {
      const a = reduce ? .6 : t * rot, c = Math.cos(a), s = Math.sin(a);
      for (let j = 0; j < n; j++) {
        const i = o + j;
        const x = bx[j] * c - bz[j] * s, z = bx[j] * s + bz[j] * c;
        const y = by[j] * ct - z * st, z2 = by[j] * st + z * ct;
        const p = f / (f + z2);
        tx[i] = cx + x * p; ty[i] = cy + y * p; ts[i] = p;
        ta[i] = al * (.16 + .84 * (1 - (z2 / Rr + 1) / 2));
        tc[i] = acc[i];
      }
    };
  }
  const P = {
    sphere(o, n, cx, cy, Rr, opt = {}) {
      const bx = new Float32Array(n), by = new Float32Array(n), bz = new Float32Array(n), ga = Math.PI * (3 - Math.sqrt(5));
      for (let j = 0; j < n; j++) { const y = 1 - (j + .5) / n * 2, r = Math.sqrt(1 - y * y), th = ga * j; bx[j] = Math.cos(th) * r * Rr; by[j] = y * Rr; bz[j] = Math.sin(th) * r * Rr; }
      return project(o, n, bx, by, bz, cx, cy, Rr, opt);
    },
    ring(o, n, cx, cy, Rr, opt = {}) {
      const bx = new Float32Array(n), by = new Float32Array(n), bz = new Float32Array(n);
      for (let j = 0; j < n; j++) {
        const th = j / n * Math.PI * 2 + G() * .004;
        const r = opt.disk ? Rr * (opt.disk + (1 - opt.disk) * Math.sqrt(R())) : Rr * (1 + G() * (opt.spread ?? .025));
        bx[j] = Math.cos(th) * r; bz[j] = Math.sin(th) * r; by[j] = G() * (opt.thick ?? 3);
      }
      return project(o, n, bx, by, bz, cx, cy, Rr, opt);
    },
    burst(o, n, cx, cy, opt = {}) {
      const rays = opt.rays ?? 44, r0 = 170, rmax = 1100, al = opt.alpha ?? .9;
      const ang = new Float32Array(n);
      for (let j = 0; j < n; j++) ang[j] = (j % rays) / rays * Math.PI * 2 + G() * .006;
      return t => {
        const rt = reduce ? 0 : t * .012;
        for (let j = 0; j < n; j++) {
          const i = o + j, sp = .018 + s2[i] * .02;
          const u = reduce ? s1[i] : (s1[i] + t * sp) % 1;
          const d = r0 + Math.pow(u, 1.25) * rmax;
          const a = ang[j] + rt;
          tx[i] = cx + Math.cos(a) * d; ty[i] = cy + Math.sin(a) * d * .92; ts[i] = .8 + u * .6;
          const near = Math.min(1, Math.max(0, (d - r0) / 260));
          ta[i] = al * near * Math.pow(1 - u, .55);
          tc[i] = acc[i];
        }
      };
    },
    dust(o, n, opt = {}) {
      const al = opt.alpha ?? .4, bx = new Float32Array(n), by = new Float32Array(n);
      for (let j = 0; j < n; j++) { bx[j] = R() * 2040 - 60; by[j] = R() * 1200 - 60; }
      return t => {
        const tt = reduce ? 0 : t;
        for (let j = 0; j < n; j++) {
          const i = o + j;
          tx[i] = bx[j] + Math.sin(tt * .06 + s1[i] * 6.28) * 30;
          ty[i] = by[j] + Math.cos(tt * .05 + s2[i] * 6.28) * 22;
          ta[i] = al * (.3 + .7 * s3[i]) * (.75 + .25 * Math.sin(tt * 1.3 + s1[i] * 20));
          ts[i] = .7 + s3[i] * .5; tc[i] = acc[i];
        }
      };
    },
    poly(o, n, fn, opt = {}) {
      const al = opt.alpha ?? .9, sp = opt.speed ?? .02, col = opt.color ?? 0;
      return t => {
        for (let j = 0; j < n; j++) {
          const i = o + j, u = reduce ? s1[i] : (s1[i] + t * sp * (.7 + s2[i] * .6)) % 1;
          const a = fn(u), b = fn(Math.min(1, u + .002));
          let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
          const off = G() * 0 + (s3[i] - .5) * 14;
          tx[i] = a[0] + nx * off; ty[i] = a[1] + ny * off;
          const edge = Math.min(1, u / .05, (1 - u) / .05);
          ta[i] = al * edge * (.55 + .45 * (1 - Math.abs(s3[i] - .5) * 2)); ts[i] = .9; tc[i] = col;
        }
      };
    },
    box(o, n, cx, cy, side, opt = {}) {
      const bx = new Float32Array(n), by = new Float32Array(n), ba = new Float32Array(n);
      const layers = [[side, .95, .4], [side - 30, .6, .33], [side - 60, .32, .27]];
      let j = 0;
      layers.forEach(([sd, a, share], li) => {
        const cnt = li === layers.length - 1 ? n - j : Math.round(n * share);
        for (let q = 0; q < cnt; q++, j++) {
          const p = q / cnt * 4, e = Math.floor(p), f = p - e, h = sd / 2;
          const [x, y] = [[-h + f * sd, -h], [h, -h + f * sd], [h - f * sd, h], [-h, h - f * sd]][e];
          bx[j] = cx + x; by[j] = cy + y; ba[j] = a;
        }
      });
      return t => {
        for (let q = 0; q < n; q++) {
          const i = o + q, sh = reduce ? 0 : Math.sin(t * 3 + s1[i] * 30) * 1.2;
          tx[i] = bx[q] + sh; ty[i] = by[q] - sh; ta[i] = ba[q]; ts[i] = 1; tc[i] = 0;
        }
      };
    },
    open(o, n, cx, cy, opt = {}) {
      const Rr = opt.R ?? 640, an = new Float32Array(n), rr = new Float32Array(n);
      for (let j = 0; j < n; j++) { an[j] = R() * Math.PI * 2; rr[j] = 40 + Math.pow(R(), .6) * Rr; }
      return t => {
        const tt = reduce ? 0 : t;
        for (let j = 0; j < n; j++) {
          const i = o + j, a = an[j] + tt * .025 * (1 - rr[j] / (Rr * 1.4));
          const r = rr[j] * (1 + .04 * Math.sin(tt * .4 + s1[i] * 6.28));
          tx[i] = cx + Math.cos(a) * r * 1.15; ty[i] = cy + Math.sin(a) * r * .8;
          ta[i] = .9 * (1 - rr[j] / (Rr + 80)) + .08; ts[i] = .8 + s3[i] * .6; tc[i] = acc[i];
        }
      };
    },
    scatter(o, n, rc, opt = {}) {
      const bx = new Float32Array(n), by = new Float32Array(n);
      for (let j = 0; j < n; j++) { bx[j] = rc.x + R() * rc.w; by[j] = rc.y + R() * rc.h; }
      return t => {
        const tt = reduce ? 0 : t;
        for (let j = 0; j < n; j++) {
          const i = o + j;
          tx[i] = bx[j] + Math.sin(tt * .5 + s1[i] * 20) * 16; ty[i] = by[j] + Math.cos(tt * .45 + s2[i] * 20) * 16;
          ta[i] = .45 * (.4 + .6 * s3[i]); ts[i] = .8; tc[i] = acc[i] ? 3 : 0;
        }
      };
    },
    shape(o, n, pts, cx, cy, opt = {}) {
      const m = pts.length, sc = opt.scale ?? 1, minA = opt.minA ?? .35, dpw = opt.depthPow ?? 1, rot = opt.rot ?? .3, tilt = opt.tilt ?? .3, osc = opt.osc ?? 0, f = opt.focal ?? 900, al = opt.alpha ?? .95, Rr = opt.R ?? 100;
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      return t => {
        const a = reduce ? .5 : osc ? Math.sin(t * osc) * rot : t * rot, c = Math.cos(a), s = Math.sin(a);
        for (let j = 0; j < n; j++) {
          const i = o + j, q = pts[j % m];
          let x, y0, z0;
          const qx = q[0] * sc, qy = q[1] * sc, qz = q[2] * sc;
          if (opt.axis === 'z') { x = qx * c - qy * s; y0 = qx * s + qy * c; z0 = qz; }
          else { x = qx * c - qz * s; z0 = qx * s + qz * c; y0 = qy; }
          const y = y0 * ct - z0 * st, z2 = y0 * st + z0 * ct;
          const pr = f / (f + z2), dep = Math.min(1, Math.max(0, 1 - (z2 / Rr + 1) / 2));
          tx[i] = cx + x * pr; ty[i] = cy + y * pr; ts[i] = pr;
          ta[i] = j < m ? al * (minA + (1 - minA) * Math.pow(dep, dpw)) : 0; tc[i] = q[3] || 0;
        }
      };
    },
    frame(o, n, rc) {
      const pts = [], add = (x, y, c) => pts.push([x, y, c]);
      const line = (x1, y1, x2, y2, cnt, c = 0) => { for (let q = 0; q < cnt; q++) { const f = q / Math.max(1, cnt - 1); add(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, c); } };
      const rect = (x, y, w, h, cnt, c = 0) => { const per = 2 * (w + h); for (let q = 0; q < cnt; q++) { let d = q / cnt * per; if (d < w) add(x + d, y, c); else if ((d -= w) < h) add(x + w, y + d, c); else if ((d -= h) < w) add(x + w - d, y + h, c); else add(x, y + h - (d - w), c); } };
      const circ = (cx, cy, r, cnt, c = 0) => { for (let q = 0; q < cnt; q++) { const a = q / cnt * Math.PI * 2; add(cx + Math.cos(a) * r, cy + Math.sin(a) * r, c); } };
      const fill = (x, y, w, h, cnt, c = 3) => { const cols = Math.round(Math.sqrt(cnt * w / h)), rows = Math.ceil(cnt / cols); for (let q = 0; q < cnt; q++) add(x + (q % cols + .5) * w / cols, y + (Math.floor(q / cols) + .5) * h / rows, c); };
      const { x, y, w, h } = rc;
      rect(x, y, w, h, 300);
      line(x, y + 60, x + w, y + 60, 70, 2);
      circ(x + 30, y + 30, 6, 15, 2); circ(x + 52, y + 30, 6, 15, 2); circ(x + 74, y + 30, 6, 15, 2);
      fill(x + 36, y + 96, w * .46, h * .42, 260);
      line(x + w * .54, y + 116, x + w - 40, y + 116, 70); line(x + w * .54, y + 156, x + w * .86, y + 156, 55); line(x + w * .54, y + 196, x + w * .92, y + 196, 55);
      rect(x + w * .54, y + 236, 150, 46, 115, 3);
      line(x + 36, y + h * .63, x + w - 36, y + h * .63, 70, 2); line(x + 36, y + h * .63 + 34, x + w * .7, y + h * .63 + 34, 60, 2);
      const cw = (w - 72 - 40) / 3;
      for (let q = 0; q < 3; q++) rect(x + 36 + q * (cw + 20), y + h * .76, cw, h * .24 - 36, 100);
      return t => {
        for (let j = 0; j < n; j++) {
          const i = o + j, p = pts[j % pts.length];
          tx[i] = p[0]; ty[i] = p[1]; tc[i] = p[2];
          ta[i] = (p[2] === 2 ? .55 : .9) * (reduce ? 1 : .8 + .2 * Math.sin(t * 2 + s1[i] * 30)); ts[i] = 1;
        }
      };
    }
  };
  /* ---------- point-set helpers (also handed to custom shapes) ---------- */
  const seg = (out, a, b, cnt, c = 0) => { for (let q = 0; q < cnt; q++) { const f = q / Math.max(1, cnt - 1); out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, c]); } };
  const loop = (out, cs, cnt, c = 0) => { const per = cs.length; for (let q = 0; q < per; q++) seg(out, cs[q], cs[(q + 1) % per], Math.round(cnt / per), c); };
  const resample = (poly, count, c = 0, closed = false) => {
    const pts = closed ? poly.concat([poly[0]]) : poly, L = [0];
    for (let q = 1; q < pts.length; q++) L.push(L[q - 1] + Math.hypot(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]));
    const tot = L[L.length - 1], out = [];
    for (let q = 0, m = 1; q < count; q++) {
      const d = tot * q / (closed ? count : Math.max(1, count - 1));
      while (m < L.length - 1 && L[m] < d) m++;
      const f = (d - L[m - 1]) / ((L[m] - L[m - 1]) || 1);
      out.push([pts[m - 1][0] + (pts[m][0] - pts[m - 1][0]) * f, pts[m - 1][1] + (pts[m][1] - pts[m - 1][1]) * f, 0, c]);
    }
    return out;
  };
  const arc = (cx, cy, r, a0, a1, n) => { const o = []; for (let q = 0; q <= n; q++) { const a = a0 + (a1 - a0) * q / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };
  const ga = Math.PI * (3 - Math.sqrt(5));

  /* ---------- built-in figures: arrays of [x, y, z, colour] around (0,0,0); colour 0 ink · 1 accent big · 2 muted · 3 accent ---------- */
  const PLANET = (() => {
    const o = [];
    for (let j = 0; j < 260; j++) { const y = 1 - (j + .5) / 260 * 2, r = Math.sqrt(1 - y * y), th = ga * j; o.push([Math.cos(th) * r * 50, y * 50, Math.sin(th) * r * 50, j % 23 === 0 ? 1 : 0]); }
    for (let j = 0; j < 170; j++) { const th = j / 170 * Math.PI * 2; o.push([Math.cos(th) * 96, 0, Math.sin(th) * 96, j % 29 === 0 ? 1 : 0]); }
    return o;
  })();
  const ARTBOARD = (() => {
    const o = [], w = 95, h = 66;
    loop(o, [[-w, -h, 0], [w, -h, 0], [w, h, 0], [-w, h, 0]], 128);
    seg(o, [-w, -h + 22, 0], [w, -h + 22, 0], 34, 2);
    [-84, -76, -68].forEach(x => { for (let q = 0; q < 6; q++) { const a = q / 6 * Math.PI * 2; o.push([x + Math.cos(a) * 2.5, -h + 11 + Math.sin(a) * 2.5, 0, 2]); } });
    for (let r = 0; r < 6; r++) for (let q = 0; q < 7; q++) o.push([-82 + q * 11, -32 + r * 10, 0, 3]);
    [[-24, 72], [-12, 56], [0, 64]].forEach(([y, L]) => seg(o, [4, y, 0], [4 + L, y, 0], 18));
    loop(o, [[4, 14, 0], [48, 14, 0], [48, 28, 0], [4, 28, 0]], 32, 3);
    [-82, -26, 30].forEach(x => loop(o, [[x, 40, 0], [x + 50, 40, 0], [x + 50, 58, 0], [x, 58, 0]], 28));
    return o;
  })();
  const LAPTOP = (() => {
    const o = [], S = (sx, sy) => [sx, 30 - sy, -60 - sy * .17];
    loop(o, [[-92, 30, -60], [92, 30, -60], [92, 30, 62], [-92, 30, 62]], 120);
    for (let r = 0; r < 5; r++) for (let q = 0; q < 11; q++) o.push([-75 + q * 15, 30, -40 + r * 16, 2]);
    loop(o, [S(-92, 0), S(92, 0), S(92, 118), S(-92, 118)], 140);
    seg(o, S(-62, 82), S(-46, 68), 9, 3); seg(o, S(-46, 68), S(-62, 54), 9, 3);
    seg(o, S(-38, 52), S(-12, 52), 12, 3);
    seg(o, S(-62, 100), S(48, 100), 22, 2); seg(o, S(-62, 32), S(24, 32), 16, 2); seg(o, S(-62, 18), S(52, 18), 20, 2);
    return o;
  })();
  const MLNET = (() => {
    const o = [], nodes = [[-78, [-40, 0, 40]], [0, [-56, -19, 19, 56]], [78, [-22, 22]]].map(([x, ys]) => ys.map(y => [x, y]));
    nodes.forEach((layer, li) => layer.forEach(([x, y]) => { for (let q = 0; q < 18; q++) { const a = q / 18 * Math.PI * 2; o.push([x + Math.cos(a) * 9, y + Math.sin(a) * 9, 0, li === 2 ? 3 : 0]); } }));
    for (let li = 0; li < 2; li++) nodes[li].forEach(A => nodes[li + 1].forEach(B => {
      const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
      seg(o, [A[0] + ux * 12, A[1] + uy * 12, 0], [B[0] - ux * 12, B[1] - uy * 12, 0], 10, 2);
    }));
    return o;
  })();
  const GEAR = (() => {
    const T = 8, Ro = 62, Ri = 48, p = Math.PI * 2 / T, ht = p * .17, hb = p * .25, path = [];
    for (let q = 0; q < T; q++) { const a = q * p; path.push(...arc(0, 0, Ri, a - p + hb, a - hb, 6)); path.push(...arc(0, 0, Ro, a - ht, a + ht, 5)); }
    return [...resample(path, 300, 0, true), ...resample(arc(0, 0, 20, 0, Math.PI * 2, 40), 46, 3, true)];
  })();
  const BULB = (() => {
    const glass = [...arc(0, -14, 42, Math.PI * .68, Math.PI * 2.32, 60)];
    const o = [...resample([[-14, 34], glass[0], ...glass.slice(1), glass[glass.length - 1], [14, 34]], 230, 0)];
    [[34, 15], [43, 13], [52, 9]].forEach(([y, w]) => o.push(...resample([[-w, y], [w, y]], 18 + w, 2)));
    o.push(...resample([[-8, 26], [-8, 2], [-4, -8], [0, 0], [4, -8], [8, 2], [8, 26]], 44, 3));
    [-90, -40, -140, 5, 175].forEach(deg => { const a = deg * Math.PI / 180; o.push(...resample([[Math.cos(a) * 56, -14 + Math.sin(a) * 56], [Math.cos(a) * 68, -14 + Math.sin(a) * 68]], 6, 3)); });
    return o;
  })();
  const TARDIS = (() => {
    const o = [], W = 78;
    const ring = (y, h, cnt, c = 0) => loop(o, [[-h, y, -h], [h, y, -h], [h, y, h], [-h, y, h]], cnt, c);
    ring(185, 88, 64); ring(172, 88, 64);
    [[-W, -W], [W, -W], [W, W], [-W, W]].forEach(([x, z]) => seg(o, [x, -165, z], [x, 172, z], 36));
    ring(-165, 82, 64); ring(-140, 82, 64);
    [u => [u, -W - 1], u => [W + 1, u], u => [-u, W + 1], u => [-W - 1, -u]].forEach(F => {
      const Pf = (u, y) => { const q = F(u); return [q[0], y, q[1]]; };
      const rect = (u0, y0, u1, y1, cnt, c = 0) => loop(o, [Pf(u0, y0), Pf(u1, y0), Pf(u1, y1), Pf(u0, y1)], cnt, c);
      seg(o, Pf(-60, -152), Pf(60, -152), 16, 3);
      seg(o, Pf(0, -134), Pf(0, 168), 24);
      [[-128, -64], [-54, 12], [22, 88], [98, 162]].forEach(([y0, y1], ri) => [[-68, -8], [8, 68]].forEach(([u0, u1]) => {
        rect(u0, y0, u1, y1, 16, ri === 0 ? 3 : 0);
        if (ri === 0) { const du = (u1 - u0) / 3, ym = (y0 + y1) / 2; seg(o, Pf(u0 + du, y0), Pf(u0 + du, y1), 5, 3); seg(o, Pf(u0 + 2 * du, y0), Pf(u0 + 2 * du, y1), 5, 3); seg(o, Pf(u0, ym), Pf(u1, ym), 6, 3); }
      }));
    });
    ring(-172, 74, 56); ring(-182, 60, 56);
    [[-60, -60], [60, -60], [60, 60], [-60, 60]].forEach(([x, z]) => seg(o, [x, -182, z], [0, -196, 0], 8));
    for (let q = 0; q < 14; q++) { const a = q / 14 * Math.PI * 2; o.push([Math.cos(a) * 9, -200, Math.sin(a) * 9, 3], [Math.cos(a) * 9, -214, Math.sin(a) * 9, 3]); }
    o.push([0, -207, 0, 1]);
    return o;
  })();

  /* name -> [points, default shape options]; used by icons@… and shape@… */
  const ICONS = {
    planet: [PLANET, { rot: .3, tilt: .45, R: 110 }],
    artboard: [ARTBOARD, { rot: .55, osc: .7, tilt: .12 }],
    laptop: [LAPTOP, { rot: .45, tilt: .38 }],
    mlnet: [MLNET, { rot: .6, osc: .6, tilt: .1 }],
    gear: [GEAR, { rot: .22, axis: 'z', tilt: .12, R: 200 }],
    bulb: [BULB, { rot: .4, osc: .55, tilt: .08, R: 200 }],
    tardis: [TARDIS, { rot: .28, tilt: .14, R: 125, minA: .06, depthPow: 1.4 }]
  };
  // custom figures from deck.html: window.DECK_SHAPES = { rocket: { build: h => points, opt: {…} } }
  const HELPERS = { seg, loop, resample, arc };
  Object.entries(window.DECK_SHAPES || {}).forEach(([name, def]) => {
    try { const pts = typeof def.build === 'function' ? def.build(HELPERS) : def.pts; if (pts && pts.length) ICONS[name] = [pts, def.opt || {}]; }
    catch (e) { console.warn('deck-studio: shape', name, e); }
  });

  /* formation specs: data-fx="name" or "name@arg,arg" — see references/particles.md */
  const FORMS = {
    sphere: (x = 1420, y = 560, r = 330) => [P.sphere(0, 1500, x, y, r), P.dust(1500, 300, { alpha: .35 })],
    ring: (x = 1450, y = 470, r = 300) => [P.ring(0, 1100, x, y, r, { tilt: .38, rot: .16 }), P.sphere(1100, 260, x, y, r * .19, { rot: .3 }), P.dust(1360, 440, { alpha: .3 })],
    horizon: (y = 1070) => [P.ring(0, 1500, 960, y, 1150, { disk: .22, tilt: .13, rot: .03, focal: 3400, alpha: .85, thick: 2 }), P.dust(1500, 300, { alpha: .3 })],
    burst: (x = 960, y = 540) => [P.burst(0, N, x, y)],
    lines: () => [P.poly(0, 1000, workPt, { alpha: .9, color: 0 }), P.poly(1000, 600, peoplePt, { alpha: .55, color: 2 }), P.dust(1600, 200, { alpha: .2 })],
    dust: () => [P.dust(0, N, { alpha: .42 })],
    box: (x = 1420, y = 720, side = 400) => [P.box(0, 1300, x, y, side), P.dust(1300, 500, { alpha: .25 })],
    open: (x = 1420, y = 720, r = 620) => [P.open(0, 1500, x, y, { R: r }), P.dust(1500, 300, { alpha: .3 })],
    tardis: (x = 1420, y = 690, sc = 1.12) => [P.shape(0, 1400, TARDIS, x, y, Object.assign({}, ICONS.tardis[1], { alpha: 1, scale: sc })), P.dust(1400, 400, { alpha: .25 })],
    planet: (x = 1520, y = 320, r = 124) => [P.sphere(0, 800, x, y, r, { rot: .18 }), P.ring(800, 600, x, y, r * 1.85, { tilt: .42, rot: .35, spread: .012 }), P.dust(1400, 400, { alpha: .3 })],
    scatter: (x = 1100, y = 340, w = 660, h = 520) => [P.scatter(0, 1400, { x, y, w, h }), P.dust(1400, 400, { alpha: .25 })],
    frame: (x = 1100, y = 340, w = 660, h = 520) => [P.frame(0, 1400, { x, y, w, h }), P.dust(1400, 400, { alpha: .25 })],
    dive: (x = 1080) => { const fn = u => [x + Math.sin(u * 9) * 12, -60 + 1200 * u * u]; return [P.poly(0, 1000, fn, { alpha: .75, speed: .05 }), P.poly(1000, 300, fn, { alpha: .85, speed: .06, color: 3 }), P.dust(1300, 500, { alpha: .25 })]; },
    speed: (y = 512) => { const fn = u => [120 + 1680 * u * u, y]; return [P.poly(0, 1100, fn, { alpha: .85, speed: .05 }), P.poly(1100, 300, fn, { alpha: .9, speed: .06, color: 3 }), P.dust(1400, 400, { alpha: .25 })]; },
    // one figure per column of a .tools / .tools4 / .dirs2 grid: icons@gear,bulb or icons@540,planet,artboard,laptop,mlnet
    icons: (...args) => {
      const y = typeof args[0] === 'number' ? args.shift() : 470;
      const names = args.filter(a => ICONS[a]), k = Math.max(1, names.length);
      const gap = { 2: 48, 3: 40 }[k] ?? 32, W = (1680 - gap * (k - 1)) / k, sk = { 1: 1.4, 2: 1.25, 3: 1 }[k] ?? .9;
      const per = Math.floor((N - 80) / k), out = [];
      names.forEach((nm, i) => { const [pts, opt] = ICONS[nm]; out.push(P.shape(i * per, per, pts, 120 + i * (W + gap) + W / 2, y, Object.assign({}, opt, { scale: (opt.scale ?? 1) * sk }))); });
      out.push(P.dust(per * names.length, N - per * names.length, { alpha: .25 }));
      return out;
    },
    // a single (built-in or custom) figure anywhere: shape@name,x,y,scale
    shape: (name, x = 1420, y = 560, sc = 1.6) => {
      const ic = ICONS[name]; if (!ic) return FORMS.dust();
      const [pts, opt] = ic, n = Math.min(N - 200, Math.max(pts.length, 400));
      return [P.shape(0, n, pts, x, y, Object.assign({}, opt, { scale: (opt.scale ?? 1) * sc })), P.dust(n, N - n, { alpha: .25 })];
    }
  };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = innerWidth, H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    S = Math.min(W / 1920, H / 1080); OX = (W - 1920 * S) / 2; OY = (H - 1080 * S) / 2;
    stage.style.transform = `translate(${OX}px, ${OY}px) scale(${S})`;
  }
  function set(spec) {
    if (spec === formName) return;
    formName = spec;
    const at = spec.indexOf('@'), name = at < 0 ? spec : spec.slice(0, at);
    const args = at < 0 ? [] : spec.slice(at + 1).split(',').map(a => a.trim()).filter(a => a !== '').map(a => isNaN(+a) ? a : +a);
    if (!FORMS[name]) console.warn('deck-studio: unknown formation', name);
    form = (FORMS[name] || FORMS.dust)(...args); formT0 = performance.now() / 1000;
  }
  function frame(now) {
    const t = now / 1000, dt = Math.min(.05, Math.max(0, t - last)); last = t;
    const since = t - formT0, settle = reduce ? 1 : Math.min(1, Math.max(0, (since - 1.4) / 1.6));
    const kMul = reduce ? 200 : 1 + 7 * settle, sw = .28 * (1 - settle);
    for (const u of form) u(t);
    for (let i = 0; i < N; i++) {
      const dx = tx[i] - px[i], dy = ty[i] - py[i];
      if (settle >= 1 && dx * dx + dy * dy > 160000) { px[i] = tx[i]; py[i] = ty[i]; }
      else { const a = 1 - Math.exp(-k[i] * kMul * dt); px[i] += dx * a - dy * a * sw; py[i] += dy * a + dx * a * sw; }
      const b = 1 - Math.exp(-(reduce ? 60 : 2.6) * dt);
      pa[i] += (ta[i] - pa[i]) * b; ps[i] += (ts[i] - ps[i]) * b;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * S, 0, 0, dpr * S, dpr * OX, dpr * OY);
    const base = 2.6;
    for (let c = 0; c < 4; c++) {
      ctx.fillStyle = COL[c];
      for (let i = 0; i < N; i++) {
        if (tc[i] !== c) continue;
        const al = pa[i]; if (al < .015) continue;
        ctx.globalAlpha = al > 1 ? 1 : al;
        const sz = (c === 1 ? base * 2.1 : base) * Math.max(.6, Math.min(1.8, ps[i]));
        ctx.fillRect(px[i] - sz / 2, py[i] - sz / 2, sz, sz);
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
  return { set, resize };
})();

/* ======================================================================
   Navigation
   ====================================================================== */
let cur = -1, step = 0, T0 = 0, slideT0 = performance.now();
const leaveTimers = new Map();
const stepsOf = s => [...s.querySelectorAll('[data-step]')];
const maxStep = s => stepsOf(s).reduce((m, e) => Math.max(m, +e.dataset.step), 0);

function applyStep() {
  const s = slides[cur];
  stepsOf(s).forEach(e => e.classList.toggle('shown', +e.dataset.step <= step));
  const fx = (s.dataset.fx || 'dust').split('|');
  FX.set(fx[Math.min(step, fx.length - 1)]);
}
function enterHooks(s) {
  s.querySelectorAll('[data-count][data-val]').forEach(el => {
    const v = +el.dataset.val, host = el.closest('[style*="--d"]');
    const delay = host ? parseFloat(host.style.getPropertyValue('--d')) || .8 : .8;
    cancelAnimationFrame(el._raf);
    const suf = el.dataset.suffix || '';
    if (reduce) { el.textContent = fmt(v) + suf; return; }
    const t0 = performance.now() + delay * 1000, dur = 1500;
    el.textContent = fmt(0) + suf;
    const f = now => { const p = Math.min(1, Math.max(0, (now - t0) / dur)), e = 1 - Math.pow(1 - p, 4); el.textContent = fmt(Math.round(v * e)) + suf; if (p < 1) el._raf = requestAnimationFrame(f); };
    el._raf = requestAnimationFrame(f);
  });
  const typed = s.querySelector('[data-type]');
  if (typed) {
    const term = s.querySelector('.term'), full = typed.dataset.type;
    clearTimeout(typed._t); term.classList.remove('done'); typed.textContent = '';
    if (reduce) { typed.textContent = full; term.classList.add('done'); return; }
    let i = 0;
    const tick = () => { typed.textContent = full.slice(0, ++i); typed._t = i < full.length ? setTimeout(tick, 18 + Math.random() * 26) : setTimeout(() => term.classList.add('done'), 400); };
    typed._t = setTimeout(tick, 1300);
  }
}
function leaveHooks(s) {
  s.querySelectorAll('[data-count]').forEach(el => cancelAnimationFrame(el._raf));
  const typed = s.querySelector('[data-type]'); if (typed) clearTimeout(typed._t);
}
function chrome() {
  const s = slides[cur];
  document.getElementById('act').textContent = s.dataset.act || '';
  document.getElementById('count').innerHTML = `<b>${String(cur + 1).padStart(2, '0')}</b> / ${String(slides.length).padStart(2, '0')}`;
  document.getElementById('bar').style.width = (cur / (slides.length - 1) * 100) + '%';
}
function hardReset(s) {
  s.classList.add('reset');
  s.classList.remove('active', 'leaving');
  stepsOf(s).forEach(e => e.classList.remove('shown'));
  void s.offsetWidth;
  s.classList.remove('reset');
}
function go(n, opts = {}) {
  n = Math.max(0, Math.min(slides.length - 1, n));
  if (n === cur) return;
  const old = slides[cur];
  if (old) {
    old.classList.add('leaving'); leaveHooks(old);
    leaveTimers.set(old, setTimeout(() => { hardReset(old); leaveTimers.delete(old); }, 600));
  }
  cur = n;
  const s = slides[n];
  if (leaveTimers.has(s)) { clearTimeout(leaveTimers.get(s)); leaveTimers.delete(s); }
  hardReset(s);
  step = opts.end ? maxStep(s) : 0;
  applyStep();
  setTimeout(() => { if (slides[cur] === s) { s.classList.add('active'); enterHooks(s); } }, old ? 300 : 80);
  chrome();
  slideT0 = performance.now();
  if (!T0 && n > 0) T0 = performance.now();
  history.replaceState(null, '', '#' + (n + 1));
  renderNotes();
}
function next() { const s = slides[cur]; if (step < maxStep(s)) { step++; applyStep(); renderNotes(); } else go(cur + 1); }
function prev() { if (step > 0) { step--; applyStep(); renderNotes(); } else go(cur - 1, { end: true }); }

/* ---------- presenter notes window ---------- */
let NW = null;
const NOTES_DOC = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Заметки спикера</title><style>
  body{margin:0;background:#0b0c10;color:#ecebe6;font:400 22px/1.5 system-ui,sans-serif;padding:28px 34px}
  .top{display:flex;justify-content:space-between;align-items:baseline;font:500 15px/1 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:#8d8c91}
  .clock{font:300 54px/1 system-ui;letter-spacing:-.02em;color:#ecebe6;margin:18px 0 6px}
  .clock small{font-size:20px;color:#8d8c91;margin-left:12px}
  h1{font:500 30px/1.25 Georgia,serif;margin:22px 0 16px}
  #n-notes p{margin:0 0 14px} .step{color:${THEME.accent};font:500 15px/1 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase}
  .next{margin-top:24px;padding-top:18px;border-top:1px solid #26262b;color:#8d8c91;font-size:18px}
  .miss{margin-top:18px;padding:12px 14px;border:1px dashed ${THEME.accent};border-radius:10px;color:${THEME.accent};font-size:15px}
  .keys{margin-top:20px;color:#5b5a60;font:500 13px/1.6 ui-monospace,monospace}
</style></head><body>
  <div class="top"><span id="n-num"></span><span id="n-plan"></span></div>
  <div class="clock"><span id="n-total">00:00</span><small id="n-left"></small></div>
  <div class="top"><span id="n-slide">на слайде 0:00</span><span class="step" id="n-step"></span></div>
  <h1 id="n-title"></h1><div id="n-notes"></div>
  <div class="next" id="n-next"></div><div id="n-miss"></div>
  <div class="keys">→ дальше · ← назад · R — сбросить таймер · окно можно держать на втором экране</div>
</body></html>`;
const mmss = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const titleOf = s => (s.querySelector('.t, .quote')?.textContent || '').replace(/\s+/g, ' ').trim();
function openNotes() {
  if (NW && !NW.closed) { NW.focus(); return; }
  NW = window.open('', 'deck-notes', 'width=760,height=920');
  if (!NW) { toast('Браузер заблокировал окно заметок: разрешите всплывающие окна для этого файла'); return; }
  NW.document.open(); NW.document.write(NOTES_DOC); NW.document.close();
  NW.document.addEventListener('keydown', e => { if (e.code === 'KeyR') { T0 = performance.now(); slideT0 = T0; } else onKey(e); });
  if (!T0) T0 = performance.now();
  renderNotes();
}
function renderNotes() {
  if (!NW || NW.closed) return;
  const d = NW.document, s = slides[cur], $ = id => d.getElementById(id);
  if (!$('n-num')) return;
  $('n-num').textContent = `Слайд ${cur + 1} / ${slides.length} · ${s.dataset.act || ''}`;
  $('n-plan').textContent = s.dataset.time ? 'по плану ' + s.dataset.time : '';
  $('n-title').textContent = titleOf(s);
  $('n-notes').innerHTML = s.querySelector('.notes')?.innerHTML || '';
  const ms = maxStep(s);
  $('n-step').textContent = ms ? `шаг ${step} из ${ms}` : '';
  const nx = slides[cur + 1];
  $('n-next').textContent = step < ms ? 'Дальше: следующий шаг на этом слайде' : nx ? 'Дальше: ' + titleOf(nx) : 'Это последний слайд';
  $('n-miss').innerHTML = missing.size ? `<div class="miss">Не заполнено в DECK_DATA: ${[...missing].join(', ')}</div>` : '';
}
setInterval(() => {
  if (!NW || NW.closed) return;
  const d = NW.document, now = performance.now();
  const tot = T0 ? now - T0 : 0, left = CFG.minutes * 60000 - tot;
  if (!d.getElementById('n-total')) return;
  d.getElementById('n-total').textContent = mmss(tot);
  d.getElementById('n-left').textContent = left >= 0 ? 'осталось ' + mmss(left) : 'перебор ' + mmss(-left);
  d.getElementById('n-left').style.color = left < 120000 ? THEME.accent : '';
  d.getElementById('n-slide').textContent = 'на слайде ' + mmss(now - slideT0);
}, 500);

/* ---------- keys, mouse ---------- */
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}
let digits = '', dT = 0;
const help = document.getElementById('help');
function fullscreen() { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); }
function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key, c = e.code;
  if (k === 'Enter' && digits) { go(+digits - 1); digits = ''; e.preventDefault(); return; }
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { next(); e.preventDefault(); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { prev(); e.preventDefault(); }
  else if (k === 'Home') go(0);
  else if (k === 'End') go(slides.length - 1, { end: true });
  else if (/^Digit[0-9]$/.test(c)) { digits += c.slice(5); clearTimeout(dT); dT = setTimeout(() => digits = '', 1500); }
  else if (c === 'KeyF') fullscreen();
  else if (c === 'KeyN') openNotes();
  else if (c === 'KeyH' || k === '?') help.classList.toggle('on');
  else if (k === 'Escape') help.classList.remove('on');
}
document.addEventListener('keydown', onKey);
document.getElementById('next').addEventListener('click', next);
document.getElementById('prev').addEventListener('click', prev);
let idleT = 0;
addEventListener('mousemove', () => {
  document.body.classList.remove('idle'); document.body.classList.add('moved');
  clearTimeout(idleT); idleT = setTimeout(() => { document.body.classList.add('idle'); document.body.classList.remove('moved'); }, 2200);
});

const start = Math.max(1, Math.min(slides.length, parseInt(location.hash.slice(1), 10) || 1)) - 1;
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => go(start));
})();
