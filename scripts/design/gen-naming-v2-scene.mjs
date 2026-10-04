#!/usr/bin/env node
/**
 * 작명 v2 작명서 배경 그림 생성기 → public/assets/naming-ai/v2/*.webp
 *
 * 금니 산수 — 아이보리 한지에 금니로 그린 산수(2026-10-04 Phase 6.6: 밤 감지금니 → 밝은 한지로 바꿨다).
 * 금선 새벽달·다섯 봉우리·폭포·노송·끝말림 구름·물결을 직접 SVG 로 그리고 sharp(rsvg) 로 알파 WebP 를 만든다. 남의 그림·사진을 쓰지 않는다.
 * 색은 naming-v2.module.css .scope 의 --nv2-* 값(연이 표지)과 예화 선색(--cd-yehwa-line·-deep 과 같은 값)이다 —
 * 그림 안의 색이라 CSS 토큰을 늘리지 않는다.
 *
 * 🔴 산출물 WebP 는 손으로 고치지 말고 여기서 고친 뒤 `node scripts/design/gen-naming-v2-scene.mjs` 로 다시 만든다.
 *    좌표·잡음은 고정 시드라 재실행해도 SVG 는 같다(--svg 로 SVG 도, --out=<dir> 로 다른 폴더에 떨굴 수 있다).
 * 🔴 글자 뒤에 깔리므로 짙은 면을 넓게 두지 않는다 — 채움은 종이와 같거나 밝게, 금선은 가늘게.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_ARG = process.argv.find((a) => a.startsWith('--out='));
const OUT_DIR = OUT_ARG ? path.resolve(OUT_ARG.slice(6)) : path.join(ROOT, 'public', 'assets', 'naming-ai', 'v2');
const DUMP_SVG = process.argv.includes('--svg');

const C = {
  bg: '#fdf6f0', // 한지(작명서 --nv2-surface) — 벼랑·물결 채움
  surface: '#fffaf7', // 가장 밝은 종이(--nv2-bg) — 구름·솔잎 채움
  violet: '#f7e4e7', // 먼 산·안개의 엷은 분홍(연이 블러시와 같은 값)
  ink: '#a97b3e', // 금니 선(예화 짙은 선색과 같은 값 — 밝은 종이에서 보이게)
  gold: '#c9a46a', // 금(달 테두리·반짝임, 예화 선색과 같은 값)
  star: '#c9a46a',
};

// ── 기하·잡음 ─────────────────────────────────────────────
const r1 = (n) => (Math.round(n * 10) / 10).toString();
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const line = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`).join('');
const smooth = (pts) => {
  // Catmull-Rom → 3차 베지어(붓선처럼 매끈하게)
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    d += `C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
};

/**
 * 바위 능선 — 손으로 둔 비대칭 키포인트(어깨·봉·골) 사이를 중점 변위로 쪼개 바위 결을 만든다.
 * keys: [x비율, 높이비율(기준선 위)] — 가우스 종 모양을 쓰지 않는다(시계처럼 고른 봉우리는 클립아트처럼 보인다).
 */
function crag(keys, { W, H, baseY, seed, rough = 0.16, depth = 4 }) {
  const rnd = rng(seed);
  let pts = keys.map(([x, h]) => [x * W, baseY - h * H]);
  for (let d = 0; d < depth; d++) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const t = 0.35 + rnd() * 0.3;
      next.push([x0 + (x1 - x0) * t + (rnd() - 0.5) * len * 0.12, y0 + (y1 - y0) * t + (rnd() - 0.5) * len * rough]);
      next.push(pts[i + 1]);
    }
    pts = next;
  }
  return pts;
}
const yAt = (pts, x) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if ((x0 - x) * (x1 - x) <= 0 && x0 !== x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts.at(-1)[1];
};

/** 바위 단면 — 꺾이는 능선 꼭짓점에서 비탈 아래로 내려 긋는 금선(부벽준 계통), 듬성듬성 */
function facets(pts, seed, every, len, opacity) {
  const rnd = rng(seed);
  let d = '';
  for (let i = 2; i < pts.length - 2; i += every) {
    if (rnd() < 0.35) continue;
    const [x, y] = pts[i];
    const dir = pts[i + 2][1] - pts[i - 2][1] > 0 ? 1 : -1; // 낮은 쪽으로
    const L = len * (0.5 + rnd() * 0.9);
    const mx = x + dir * L * (0.12 + rnd() * 0.15);
    const ex = x + dir * L * (0.2 + rnd() * 0.35);
    d += `M${r1(x)} ${r1(y + 2)}Q${r1(mx)} ${r1(y + L * 0.5)} ${r1(ex)} ${r1(y + L)}`;
    if (rnd() < 0.4) d += `M${r1(x + dir * 5)} ${r1(y + 6)}Q${r1(mx + dir * 6)} ${r1(y + L * 0.45)} ${r1(ex + dir * 4)} ${r1(y + L * 0.7)}`;
  }
  return `<path d="${d}" fill="none" stroke="${C.ink}" stroke-opacity="${opacity}" stroke-width="0.9" stroke-linecap="round"/>`;
}

function mountain({ id, pts, bottom, fill, fillOpacity, stroke, strokeWidth, facet }) {
  const minY = Math.min(...pts.map((p) => p[1]));
  const closed = `${line(pts)}L${r1(pts.at(-1)[0])} ${bottom}L${r1(pts[0][0])} ${bottom}Z`;
  return `<linearGradient id="${id}" x1="0" y1="${r1(minY)}" x2="0" y2="${bottom}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${fill[0]}" stop-opacity="${fillOpacity[0]}"/><stop offset="1" stop-color="${fill[1]}" stop-opacity="${fillOpacity[1]}"/></linearGradient>
<path d="${closed}" fill="url(#${id})"/>
${facet ? facets(pts, facet.seed, facet.every, facet.len, facet.opacity) : ''}
<path d="${line(pts)}" fill="none" stroke="${C.ink}" stroke-opacity="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>`;
}

/**
 * 끝말림 구름 — 한 줄로 이어진 외곽선. 왼끝 소용돌이에서 풀려 나와 윗면 봉긋 3~4번, 오른끝에서 다시 말려 들어가고
 * 아랫면은 낮게 물결쳐 돌아온다. 채움은 종이색 반투명(뒤 선을 살짝 가린다).
 */
function cloud(cx, cy, s, { flip = false, bumps = [34, 20, 15], fillOpacity = 0.7, stroke = 0.75 } = {}) {
  const f = flip ? -1 : 1;
  const P = (x, y) => [cx + f * x * s, cy + y * s];
  const spiral = (ox, oy, r0, turns, inward, dirSign) => {
    const out = [];
    const steps = Math.round(turns * 16);
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const ang = dirSign * t * turns * Math.PI * 2;
      const r = inward ? r0 * (1 - 0.82 * t) : r0 * (0.18 + 0.82 * t);
      out.push(P(ox + Math.cos(ang + Math.PI) * r, oy + Math.sin(ang + Math.PI) * r));
    }
    return out;
  };
  const total = bumps.reduce((a, b) => a + b * 2, 0);
  let x = -total / 2;
  const top = [];
  for (const b of bumps) {
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI - (k / 8) * Math.PI;
      top.push(P(x + b + Math.cos(a) * b, -Math.sin(a) * b * 0.82 - 4));
    }
    x += b * 2;
  }
  const L = -total / 2;
  const R = total / 2;
  const leftCurl = spiral(L + 10, 2, 12, 1.2, false, -1).slice(0, -1);
  const rightCurl = spiral(R - 10, 2, 12, 1.2, true, 1);
  const outline = [...leftCurl, ...top, ...rightCurl];
  const bottomLine = [];
  for (let k = 0; k <= 10; k++) {
    const t = k / 10;
    bottomLine.push(P(R - 6 - t * (R - L - 12), 12 + Math.sin(t * Math.PI * 3) * 2.2));
  }
  const body = `${smooth([...top.slice(0, 1), ...top])}`;
  const fillPath = `${smooth([...top, ...bottomLine])}Z`;
  const innerCurl = spiral(-total / 2 + bumps[0] + 4, -bumps[0] * 0.25, bumps[0] * 0.4, 1.1, true, -1);
  return `<g>
<path d="${fillPath}" fill="${C.surface}" fill-opacity="${fillOpacity}"/>
<path d="${smooth(outline)}" fill="none" stroke="${C.ink}" stroke-opacity="${stroke}" stroke-width="${r1(1.4 * s)}" stroke-linecap="round" stroke-linejoin="round"/>
<path d="${smooth(bottomLine)}" fill="none" stroke="${C.ink}" stroke-opacity="${stroke * 0.7}" stroke-width="${r1(1.1 * s)}" stroke-linecap="round"/>
<path d="${smooth(innerCurl)}" fill="none" stroke="${C.ink}" stroke-opacity="${stroke * 0.6}" stroke-width="${r1(1 * s)}" stroke-linecap="round"/>
${body ? '' : ''}
</g>`;
}

/**
 * 노송 — 절벽 턱(root)에 뿌리를 박고 기울어 오르는 굽은 줄기, 가지 끝마다 납작하고 들쭉날쭉한 솔잎 덩이.
 * 금선만 긋고 채움은 종이색 반투명이다(검은 버섯처럼 무겁지 않게).
 */
function pine([rx, ry], s, { flip = false, seed = 1, fillOpacity = 0.55, stroke = 0.75 } = {}) {
  const rnd = rng(seed);
  const f = flip ? -1 : 1;
  const P = (x, y) => [rx + f * x * s, ry + y * s];
  const spine = [[0, 6], [5, -28], [-7, -58], [-2, -74], [9, -98], [27, -120], [29, -148], [47, -170]].map(([x, y]) => [x + (rnd() - 0.5) * 4, y]);
  const width = (i) => 9.5 - i * 1.05;
  const left = spine.map(([x, y], i) => P(x - width(i) / 2, y));
  const right = spine.map(([x, y], i) => P(x + width(i) / 2, y)).reverse();
  const trunk = `${smooth(left)}L${r1(right[0][0])} ${r1(right[0][1])}${smooth(right).replace(/^M[^C]+/, '')}Z`;
  // 뿌리 — 바위를 움켜쥐는 짧은 갈래
  const roots = [[-16, 10], [14, 8], [-6, 13]].map(([x, y]) => smooth([P(0, 2), P(x * 0.5, y * 0.6), P(x, y)])).join('');
  // 가지: [줄기 마디, 끝 dx, 끝 dy, 덩이 반폭]
  const branches = [[4, -46, -8, 30], [5, 40, -12, 34], [7, 22, -18, 40], [2, -34, -4, 22]];
  const [kx, ky] = P(spine[3][0] + 1, spine[3][1] + 4);
  const knot = `M${r1(kx - 2.5 * s)} ${r1(ky)}a${r1(2.5 * s)} ${r1(3.5 * s)} 0 1 0 ${r1(5 * s)} 0a${r1(2.5 * s)} ${r1(3.5 * s)} 0 1 0 ${r1(-5 * s)} 0`;
  let limbs = '';
  let pads = '';
  let needles = '';
  for (const [node, dx, dy, w] of branches) {
    const [sx, sy] = spine[node];
    const ex = sx + dx;
    const ey = sy + dy;
    limbs += smooth([P(sx, sy), P(sx + dx * 0.45, sy + dy * 0.2 - 4), P(ex, ey)]);
    // 솔잎 덩이: 윗면은 잔물결 봉우리, 아랫면은 거의 평평 — 우산을 겹쳐 쌓지 않는다
    const top = [];
    const n = 7;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const bump = Math.sin(t * Math.PI) * (7 + rnd() * 5) + (k % 2 ? 2.5 : 0);
      top.push(P(ex - w + 2 * w * t, ey - bump));
    }
    const bot = [];
    for (let k = n; k >= 0; k--) bot.push(P(ex - w + 2 * w * (k / n), ey + 3 + (rnd() - 0.5) * 2.5));
    pads += `${smooth([...top, ...bot, top[0]])}`;
    for (let k = 1; k < 12; k++) {
      const t = k / 12;
      const [nx, ny] = P(ex - w * 0.92 + 1.84 * w * t, ey + 2);
      const lean = (t - 0.5) * 6 * s;
      needles += `M${r1(nx)} ${r1(ny)}L${r1(nx + lean)} ${r1(ny - (5 + Math.sin(t * Math.PI) * 6) * s)}`;
    }
  }
  return `<g>
<path d="${roots}" fill="none" stroke="${C.ink}" stroke-opacity="${stroke * 0.8}" stroke-width="${r1(1.1 * s)}" stroke-linecap="round"/>
<path d="${trunk}" fill="${C.bg}" stroke="${C.ink}" stroke-opacity="${stroke}" stroke-width="${r1(1.2 * s)}" stroke-linejoin="round"/>
<path d="${knot}" fill="none" stroke="${C.ink}" stroke-opacity="${stroke * 0.7}" stroke-width="${r1(0.9 * s)}"/>
<path d="${limbs}" fill="none" stroke="${C.ink}" stroke-opacity="${stroke}" stroke-width="${r1(2 * s)}" stroke-linecap="round"/>
<path d="${pads}" fill="${C.surface}" fill-opacity="${fillOpacity}" stroke="${C.ink}" stroke-opacity="${stroke}" stroke-width="${r1(1.1 * s)}" stroke-linejoin="round"/>
<path d="${needles}" fill="none" stroke="${C.ink}" stroke-opacity="${stroke * 0.55}" stroke-width="${r1(0.8 * s)}" stroke-linecap="round"/>
</g>`;
}

/** 폭포 — 골짜기 V 에서 떨어지는 3~5 줄 연속 물줄기(살짝 물결), 끝은 물안개 말림 */
function waterfall(x, top, bottom, s, seed) {
  const rnd = rng(seed);
  const fadeFrom = bottom - (bottom - top) * 0.35;
  let d = '';
  for (let k = 0; k < 4; k++) {
    const ox = x + (k - 1.5) * 3.4 * s;
    const pts = [];
    for (let y = top + k * 2; y <= bottom; y += 12) pts.push([ox + Math.sin((y + k * 9) / 17) * 0.9 + (y - top) * 0.02 * (k - 1.5), y]);
    d += smooth(pts);
  }
  const mist = [];
  for (let k = 0; k < 3; k++) {
    const mx = x + (k - 1) * 14 * s;
    const my = bottom + 6 * s - (k === 1 ? 4 : 0);
    const r = (6 + rnd() * 3) * s;
    mist.push(`M${r1(mx - r * 1.6)} ${r1(my)}A${r1(r)} ${r1(r * 0.8)} 0 0 1 ${r1(mx + r * 0.4)} ${r1(my - r * 0.3)}a${r1(r * 0.5)} ${r1(r * 0.5)} 0 1 1 ${r1(-r * 0.2)} ${r1(r * 0.7)}`);
  }
  return `<linearGradient id="fallFade" x1="0" y1="${r1(fadeFrom)}" x2="0" y2="${r1(bottom)}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${C.ink}"/><stop offset="1" stop-color="${C.ink}" stop-opacity="0"/></linearGradient>
<g fill="none" stroke-linecap="round"><path d="${d}" stroke="url(#fallFade)" stroke-opacity="0.62" stroke-width="${r1(1.05 * s)}"/><path d="${mist.join('')}" stroke="${C.ink}" stroke-opacity="0.5" stroke-width="${r1(1 * s)}"/></g>`;
}

/** 물안개 띠 — 산자락을 가로지르는 부드러운 띠(직선 바닥선 대신) */
function mistBand(id, W, y, h, opacity) {
  return `<linearGradient id="${id}" x1="0" y1="${r1(y)}" x2="0" y2="${r1(y + h)}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${C.violet}" stop-opacity="0"/><stop offset="0.5" stop-color="${C.violet}" stop-opacity="${opacity}"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></linearGradient>
<rect x="0" y="${r1(y)}" width="${W}" height="${r1(h)}" fill="url(#${id})"/>`;
}

/**
 * 물결 — 겹겹의 물마루. 한 물마루는 왼쪽에서 솟아 오른쪽 끝이 안으로 말리는 갈고리이고, 안쪽에 결 두 줄.
 * 줄마다 반 칸 어긋나 쌓인다. 바닥은 종이보다 어둡게 채워 산수 아래를 받친다.
 */
function waves(W, H, y0, rows, s, seed, opacity) {
  const rnd = rng(seed);
  const cw = 64 * s;
  const ch = 15 * s;
  let fills = '';
  let strokes = '';
  for (let r = rows - 1; r >= 0; r--) {
    const y = y0 + r * ch * 0.95;
    const shift = (r % 2) * cw * 0.5 + rnd() * 6;
    for (let x = -cw + shift; x < W + cw; x += cw) {
      const hgt = ch * (0.9 + rnd() * 0.25);
      const crest = `M${r1(x)} ${r1(y)}C${r1(x + cw * 0.18)} ${r1(y - hgt * 0.9)} ${r1(x + cw * 0.62)} ${r1(y - hgt * 1.15)} ${r1(x + cw * 0.78)} ${r1(y - hgt * 0.55)}`
        + `C${r1(x + cw * 0.84)} ${r1(y - hgt * 0.25)} ${r1(x + cw * 0.7)} ${r1(y - hgt * 0.12)} ${r1(x + cw * 0.64)} ${r1(y - hgt * 0.38)}`;
      fills += `M${r1(x)} ${r1(y)}C${r1(x + cw * 0.18)} ${r1(y - hgt * 0.9)} ${r1(x + cw * 0.62)} ${r1(y - hgt * 1.15)} ${r1(x + cw * 0.78)} ${r1(y - hgt * 0.55)}L${r1(x + cw * 1.05)} ${r1(y)}L${r1(x + cw * 1.05)} ${r1(H)}L${r1(x)} ${r1(H)}Z`;
      const inner = [0.32, 0.55].map((k) => `M${r1(x + cw * (0.12 + k * 0.25))} ${r1(y - hgt * 0.1)}Q${r1(x + cw * (0.25 + k * 0.3))} ${r1(y - hgt * (0.5 + k * 0.35))} ${r1(x + cw * (0.52 + k * 0.12))} ${r1(y - hgt * (0.35 + k * 0.25))}`).join('');
      strokes += crest + inner;
    }
  }
  return `<path d="${fills}" fill="${C.bg}" fill-opacity="0.92"/><path d="${strokes}" fill="none" stroke="${C.ink}" stroke-opacity="${opacity}" stroke-width="${r1(1.05 * s)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** 금선 보름달 — 채운 원판이 아니라 금 테두리 + 아주 옅은 금 칠 + 달 안 결, 바깥 무리 */
function moon(cx, cy, r) {
  // 달 속 결: 테두리를 가로지르는 낮고 긴 붓결 하나(점 여러 개는 얼굴처럼 읽힌다)
  const hatch = `M${r1(cx - r * 1.25)} ${r1(cy + r * 0.28)}q${r1(r * 0.7)} ${r1(-r * 0.12)} ${r1(r * 1.35)} ${r1(-r * 0.08)}`;
  return `<radialGradient id="moonHalo" cx="${cx}" cy="${cy}" r="${r * 3.4}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${C.gold}" stop-opacity="0.16"/><stop offset="0.4" stop-color="${C.gold}" stop-opacity="0.05"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient>
<circle cx="${cx}" cy="${cy}" r="${r * 3.4}" fill="url(#moonHalo)"/>
${[1.32, 1.6, 1.95].map((k, i) => `<circle cx="${cx}" cy="${cy}" r="${r1(r * k)}" fill="none" stroke="${C.ink}" stroke-opacity="${[0.42, 0.24, 0.12][i]}" stroke-width="1" ${i ? `stroke-dasharray="${i === 1 ? '2 6' : '1 9'}"` : ''}/>`).join('')}
<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.bg}"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.gold}" fill-opacity="0.07" stroke="${C.gold}" stroke-opacity="0.9" stroke-width="1.8"/>
<circle cx="${cx}" cy="${cy}" r="${r1(r - 5)}" fill="none" stroke="${C.ink}" stroke-opacity="0.45" stroke-width="0.8"/>
<path d="${hatch}" fill="none" stroke="${C.ink}" stroke-opacity="0.32" stroke-width="0.8" stroke-linecap="round"/>`;
}

function stars(W, yMax, n, seed, avoid, margin) {
  const rnd = rng(seed);
  let dots = '';
  let sparkles = '';
  for (let k = 0; k < n; k++) {
    const x = margin + rnd() * (W - 2 * margin);
    const y = margin + rnd() * (yMax - margin);
    if (Math.hypot(x - avoid[0], y - avoid[1]) < avoid[2]) continue;
    const r = 0.5 + rnd() * 1.1;
    dots += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill-opacity="${(0.25 + rnd() * 0.5).toFixed(2)}"/>`;
    if (rnd() < 0.05) {
      const a = 4 + rnd() * 4;
      const b = a * 0.16;
      sparkles += `M${r1(x)} ${r1(y - a)}L${r1(x + b)} ${r1(y - b)}L${r1(x + a)} ${r1(y)}L${r1(x + b)} ${r1(y + b)}L${r1(x)} ${r1(y + a)}L${r1(x - b)} ${r1(y + b)}L${r1(x - a)} ${r1(y)}L${r1(x - b)} ${r1(y - b)}Z`;
    }
  }
  return `<g fill="${C.star}">${dots}</g><path d="${sparkles}" fill="${C.gold}" fill-opacity="0.75"/>`;
}

/** 금박 — 종이에 흩뿌린 작은 금 조각 */
function goldLeaf(W, yMax, n, seed, margin) {
  const rnd = rng(seed);
  let d = '';
  for (let k = 0; k < n; k++) {
    const x = margin + rnd() * (W - 2 * margin);
    const y = margin + rnd() * (yMax - margin);
    const sz = 0.8 + rnd() * 2;
    const a = rnd() * Math.PI;
    const pts = [0, 1, 2, 3].map((i) => {
      const t = a + (i * Math.PI) / 2 + (rnd() - 0.5) * 0.8;
      const rr = sz * (0.6 + rnd() * 0.6);
      return `${r1(x + Math.cos(t) * rr)} ${r1(y + Math.sin(t) * rr)}`;
    });
    d += `M${pts.join('L')}Z`;
  }
  return `<path d="${d}" fill="${C.ink}" fill-opacity="0.5"/>`;
}

function fades(W, H, { top, bottom, side }) {
  const o = (v) => (Math.round(v * 1000) / 1000).toString();
  return `<linearGradient id="fadeV" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="#fff" stop-opacity="${top ? 0 : 1}"/><stop offset="${o(top / H)}" stop-color="#fff"/>
  <stop offset="${o((H - bottom) / H)}" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="${bottom ? 0 : 1}"/></linearGradient>
<linearGradient id="fadeH" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="${o(side / W)}" stop-color="#fff"/>
  <stop offset="${o((W - side) / W)}" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="mV" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#fadeV)"/></mask>
<mask id="mH" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#fadeH)"/></mask>`;
}

// ── 장면 ─────────────────────────────────────────────────
// 먼 산 키포인트(wide): 가운데 주봉이 가장 높고, 오른쪽 어깨에 폭포가 떨어지는 V 골, 좌우 봉은 높이·간격이 다르다.
const FAR_WIDE = [
  [-0.02, 0.05], [0.04, 0.1], [0.085, 0.19], [0.11, 0.15], [0.14, 0.13], [0.19, 0.2], [0.245, 0.31], [0.268, 0.29], [0.3, 0.23],
  [0.35, 0.25], [0.41, 0.36], [0.47, 0.47], [0.495, 0.5], [0.52, 0.44], [0.545, 0.4], [0.575, 0.3], [0.6, 0.33], [0.64, 0.38],
  [0.665, 0.35], [0.71, 0.26], [0.76, 0.21], [0.8, 0.25], [0.835, 0.22], [0.88, 0.14], [0.94, 0.1], [1.02, 0.04],
];
const FAR_NARROW = [
  [-0.03, 0.08], [0.05, 0.17], [0.12, 0.27], [0.17, 0.22], [0.25, 0.3], [0.33, 0.4], [0.42, 0.5], [0.47, 0.53], [0.52, 0.46],
  [0.57, 0.42], [0.63, 0.31], [0.67, 0.34], [0.74, 0.39], [0.79, 0.32], [0.86, 0.22], [0.93, 0.16], [1.03, 0.06],
];
const MID_WIDE = [[-0.02, 0.06], [0.08, 0.09], [0.17, 0.15], [0.24, 0.1], [0.33, 0.13], [0.41, 0.19], [0.47, 0.13], [0.56, 0.1], [0.64, 0.16], [0.72, 0.11], [0.8, 0.13], [0.9, 0.08], [1.02, 0.05]];
const MID_NARROW = [[-0.03, 0.06], [0.12, 0.12], [0.26, 0.09], [0.38, 0.17], [0.5, 0.11], [0.62, 0.15], [0.76, 0.1], [0.9, 0.12], [1.03, 0.05]];
// 절벽: 자기 구간에서만 그린다(전폭 직선 바닥선이 생기지 않게). 4번째 키포인트가 노송이 서는 턱.
const CLIFF_L = [[-0.03, 0.36], [0.02, 0.37], [0.045, 0.33], [0.07, 0.3], [0.095, 0.31], [0.12, 0.24], [0.15, 0.16], [0.19, 0.08], [0.24, 0.0], [0.27, -0.09]];
const CLIFF_R = [[1.03, 0.3], [0.98, 0.31], [0.955, 0.27], [0.93, 0.25], [0.9, 0.18], [0.87, 0.1], [0.83, 0.0], [0.8, -0.09]];

/** layout: wide(데스크톱) | narrow(모바일). sky=true 면 달·별·금박까지, false 면 산수만(액자 안 깔개). */
function scene({ W, H, layout, sky, dim = 1 }) {
  const wide = layout === 'wide';
  const s = (wide ? 1 : 0.8) * (H / (sky ? 640 : 560));
  const base = H * (sky ? 0.72 : 0.66);
  const side = W * 0.09;
  const parts = [];
  const moonC = wide ? [W * 0.74, H * 0.2, 46] : [W * 0.72, H * 0.17, 34];

  if (sky) {
    parts.push(goldLeaf(W, base - H * 0.24, wide ? 60 : 34, 11, 24));
    parts.push(stars(W, base - H * 0.26, wide ? 140 : 70, 5, [moonC[0], moonC[1], moonC[2] * 2.2], 22));
    parts.push(moon(...moonC));
    // 달 아래 가장자리만 살짝 스치는 구름(달을 20% 넘게 가리지 않는다)
    parts.push(cloud(moonC[0] - moonC[2] * 1.1, moonC[1] + moonC[2] * 1.05, 0.62 * s, { bumps: [28, 17, 12], fillOpacity: 0.75 }));
  }

  const far = crag(wide ? FAR_WIDE : FAR_NARROW, { W, H, baseY: base, seed: 21, rough: 0.2 });
  parts.push(mountain({ id: 'far', pts: far, bottom: H, fill: [C.violet, C.surface], fillOpacity: [0.13, 0], stroke: 0.85, strokeWidth: 1.5, facet: { seed: 22, every: 2, len: 30 * s, opacity: 0.4 } }));
  // 폭포: 오른쪽 어깨의 V 골(키포인트 0.575 / narrow 0.63)
  const fallX = W * (wide ? 0.575 : 0.63);
  const fallTop = yAt(far, fallX);
  const midPts = crag(wide ? MID_WIDE : MID_NARROW, { W, H, baseY: base + H * 0.11, seed: 41, rough: 0.16 });
  parts.push(waterfall(fallX, fallTop + 2, yAt(midPts, fallX) - 20 * s, s, 31));
  parts.push(mistBand('mist1', W, base - H * 0.1, H * 0.12, 0.07));
  parts.push(cloud(W * (wide ? 0.27 : 0.24), base - H * (wide ? 0.13 : 0.15), 0.8 * s, { bumps: [36, 22, 16, 11] }));
  if (wide) parts.push(cloud(W * 0.8, base - H * 0.05, 0.62 * s, { flip: true, bumps: [30, 18, 13] }));

  const mid = midPts;
  parts.push(mountain({ id: 'mid', pts: mid, bottom: H, fill: [C.surface, C.bg], fillOpacity: [0.95, 0.95], stroke: 0.7, strokeWidth: 1.3, facet: { seed: 42, every: 3, len: 20 * s, opacity: 0.32 } }));
  parts.push(mistBand('mist2', W, base + H * 0.03, H * 0.18, 0.05));

  const cliffBase = base + H * 0.2;
  const cliffL = crag(CLIFF_L, { W, H, baseY: cliffBase, seed: 51, rough: 0.14, depth: 3 });
  const cliffR = crag(CLIFF_R, { W, H, baseY: cliffBase, seed: 61, rough: 0.14, depth: 3 });
  parts.push(mountain({ id: 'cl', pts: cliffL, bottom: H, fill: [C.bg, C.bg], fillOpacity: [1, 1], stroke: 0.82, strokeWidth: 1.4, facet: { seed: 52, every: 2, len: 26 * s, opacity: 0.42 } }));
  parts.push(mountain({ id: 'cr', pts: cliffR, bottom: H, fill: [C.bg, C.bg], fillOpacity: [1, 1], stroke: 0.82, strokeWidth: 1.4, facet: { seed: 62, every: 2, len: 26 * s, opacity: 0.42 } }));
  const ledge = (pts, fx) => [W * fx, yAt(pts, W * fx) + 1];
  const showPines = wide || sky;
  if (showPines) {
    if (wide) parts.push(pine(ledge(cliffL, 0.085), 1.05 * s, { seed: 71 }));
    parts.push(pine(ledge(cliffR, wide ? 0.935 : 0.92), (wide ? 0.82 : 0.6) * s, { seed: 73, flip: true }));
  }
  parts.push(waves(W, H, base + H * 0.25, sky ? 4 : 3, s * (wide ? 1 : 0.85), 81, sky ? 0.62 : 0.38));

  const fadeTop = sky ? H * 0.06 : 0;
  const fadeBottom = sky ? H * 0.1 : H * 0.04;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${fades(W, H, { top: fadeTop, bottom: fadeBottom, side })}</defs>
<g mask="url(#mV)"><g mask="url(#mH)"><g opacity="${dim}">
${parts.join('\n')}
</g></g></g>
</svg>
`;
}

// 히어로(작명서 표지 위 새벽달 산수) · 깔개(액자 안 하단 산수, 글자 뒤라 옅게)
const OUTPUTS = [
  { file: 'scene-hero-wide.webp', W: 1520, H: 640, layout: 'wide', sky: true },
  { file: 'scene-hero-narrow.webp', W: 780, H: 600, layout: 'narrow', sky: true },
  { file: 'scene-paper-wide.webp', W: 1520, H: 520, layout: 'wide', sky: false, dim: 0.55 },
  { file: 'scene-paper-narrow.webp', W: 780, H: 420, layout: 'narrow', sky: false, dim: 0.55 },
];

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const o of OUTPUTS) {
  const svg = scene(o);
  if (DUMP_SVG) fs.writeFileSync(path.join(OUT_DIR, o.file.replace('.webp', '.svg')), svg);
  const buf = await sharp(Buffer.from(svg)).webp({ quality: 80, alphaQuality: 85, effort: 6, smartSubsample: true }).toBuffer();
  fs.writeFileSync(path.join(OUT_DIR, o.file), buf);
  console.log(`${o.file} ${o.W}x${o.H} ${(buf.length / 1024).toFixed(1)}KiB`);
}
