#!/usr/bin/env node
/**
 * 달빛 예화(月花) 라인아트 모티프 생성기 → styles/yehwa-motifs.css
 *
 * 홈 셸의 히어로 배경 문양·섹션 구분선(그리고 PR-2 카드 인장·스파클)이 쓰는 SVG 마스크와
 * 그 소비 CSS 를 한 곳에서 만든다. 선은 SVG(data URI) 의 알파이고 색은 background 가 칠하므로
 * 네오 모드는 background 만 바꾼다 — styles/fortune-gateway.css 의 --fg-flora-* 와 같은 방식.
 *
 * 🔴 styles/yehwa-motifs.css 는 이 스크립트의 산출물이다. 손으로 고치지 말고 여기서 고친 뒤
 *    `node scripts/design/gen-yehwa-motifs.mjs` 로 다시 만든다. `--check` 는 산출물이 최신인지만 본다.
 *    (PR #1489 의 --fg-flora-* 는 생성기가 커밋되지 않아 좌표를 손댈 수 없게 됐다 — 그 반복을 막는다.)
 *
 * 좌표는 전부 상수라 재실행해도 바이트가 같다(랜덤 없음).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'styles', 'yehwa-motifs.css');

// ── 기하 원시 ────────────────────────────────────────────────────────────
const r1 = (n) => (Math.round(n * 10) / 10).toString();
const pt = (x, y) => `${r1(x)} ${r1(y)}`;
const rad = (deg) => (deg * Math.PI) / 180;
const polar = (cx, cy, r, deg) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];

/** 원(호 두 개) */
function circle(cx, cy, r) {
  return `M${pt(cx - r, cy)}A${r1(r)} ${r1(r)} 0 1 0 ${pt(cx + r, cy)}A${r1(r)} ${r1(r)} 0 1 0 ${pt(cx - r, cy)}`;
}

/**
 * 꽃잎 하나 — 밑동(bx,by)에서 deg 방향으로 길이 len, 최대 반폭 hw 인 둥근 컵(lobe).
 * 밑동이 점이 아니라 폭(hw*0.5)을 가지므로 여러 장을 돌려 놓아도 한 점에서 교차하지 않는다
 * (교차하면 별·프로펠러로 읽힌다 — 2026-09-03 시각 판정).
 */
function petal(bx, by, deg, len, hw, scallop = false) {
  const dx = Math.cos(rad(deg));
  const dy = Math.sin(rad(deg));
  const px = -dy;
  const py = dx;
  const base = hw * 0.25;
  const l0 = [bx + px * -base, by + py * -base];
  const r0 = [bx + px * base, by + py * base];
  const tip = [bx + dx * len, by + dy * len];
  const l1 = [bx + dx * len * 0.3 + px * -hw, by + dy * len * 0.3 + py * -hw];
  const l2 = [tip[0] - dx * len * 0.12 + px * -hw * 0.7, tip[1] - dy * len * 0.12 + py * -hw * 0.7];
  const r2 = [tip[0] - dx * len * 0.12 + px * hw * 0.7, tip[1] - dy * len * 0.12 + py * hw * 0.7];
  const r1 = [bx + dx * len * 0.3 + px * hw, by + dy * len * 0.3 + py * hw];
  if (!scallop) return `M${pt(...l0)}C${pt(...l1)} ${pt(...l2)} ${pt(...tip)}C${pt(...r2)} ${pt(...r1)} ${pt(...r0)}`;
  // 모란용 물결 끝: 끝을 두 봉우리와 가운데 홈으로 나눈다
  const tipL = [bx + dx * len * 0.96 + px * -hw * 0.38, by + dy * len * 0.96 + py * -hw * 0.38];
  const tipR = [bx + dx * len * 0.96 + px * hw * 0.38, by + dy * len * 0.96 + py * hw * 0.38];
  const dip = [bx + dx * len * 0.86, by + dy * len * 0.86];
  return `M${pt(...l0)}C${pt(...l1)} ${pt(...l2)} ${pt(...tipL)}Q${pt(...dip)} ${pt(...tipR)}C${pt(...r2)} ${pt(...r1)} ${pt(...r0)}`;
}

/** 꽃잎 고리 — 중심에서 r0 떨어진 밑동에서 n 장을 rot 부터 등간격으로 */
function ring(cx, cy, n, r0, len, hw, rot = 0) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const deg = rot + (360 / n) * i;
    const [bx, by] = polar(cx, cy, r0, deg);
    out.push(petal(bx, by, deg, len, hw));
  }
  return out.join('');
}

/** 벚꽃 소화 — 넓은 꽃잎 5 장이 서로 닿게 + 꽃술 원 + 짧은 수술선(꽃잎 안쪽) */
function blossom(cx, cy, r, rot = 0) {
  const parts = [ring(cx, cy, 5, r * 0.16, r * 0.84, r * 0.5, rot), circle(cx, cy, r * 0.14)];
  for (let i = 0; i < 5; i += 1) {
    const deg = rot + 72 * i;
    const [ax, ay] = polar(cx, cy, r * 0.24, deg);
    const [bx, by] = polar(cx, cy, r * 0.48, deg);
    parts.push(`M${pt(ax, ay)}L${pt(bx, by)}`);
  }
  return parts.join('');
}

/** 봉오리 — 방향 deg 로 뻗은 좁은 물방울 + 밑동 점(받침 선을 두면 화살촉으로 읽힌다) */
function bud(cx, cy, deg, len) {
  return petal(cx, cy, deg, len, len * 0.36) + circle(cx, cy, 1.2);
}

/** 잎 — 방향 deg 로 길이 len, 잎맥은 윤곽 안(0.78)까지만 */
function leaf(cx, cy, deg, len) {
  const [tx, ty] = polar(cx, cy, len * 0.78, deg);
  return petal(cx, cy, deg, len, len * 0.34) + `M${pt(cx, cy)}L${pt(tx, ty)}`;
}

/** 흩날리는 꽃잎 — 작은 물방울 */
function drift(cx, cy, deg, len) {
  return petal(cx, cy, deg, len, len * 0.55);
}

/** 가지 — 점들을 지나는 Catmull-Rom → 3차 베지어(접합부가 꺾이지 않는다) */
function branch(points, tension = 0.5) {
  let d = `M${pt(points[0][0], points[0][1])}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const c1 = [p1[0] + ((p2[0] - p0[0]) * tension) / 3, p1[1] + ((p2[1] - p0[1]) * tension) / 3];
    const c2 = [p2[0] - ((p3[0] - p1[0]) * tension) / 3, p2[1] - ((p3[1] - p1[1]) * tension) / 3];
    d += `C${pt(...c1)} ${pt(...c2)} ${pt(...p2)}`;
  }
  return d;
}

// ── 마스크 5종 ───────────────────────────────────────────────────────────
/** 히어로 좌하 — 모란 1송이(내 5 + 외 8 겹) + 좌하로 뻗는 가지·잎 3·벚꽃 소화 2 */
function peony() {
  const cx = 150;
  const cy = 118;
  // 꽃술: 작은 원 + 점 다발(안쪽을 컵 3 장으로 그리면 세로선 든 캡슐로 읽힌다)
  const inner = [circle(cx, cy + 2, 3.2), ...[[-120, 8], [-60, 9], [0, 8], [70, 9], [140, 8], [200, 9]].map(([deg, r]) => circle(...polar(cx, cy + 2, r, deg), 1.3))];
  return [
    ...inner,
    // 중간 겹 5 장·바깥 겹 6 장 — 각도·길이·폭을 조금씩 다르게 두고 끝을 물결지게 해 대칭을 깬다(정대칭이면 연꽃으로 읽힌다)
    ...[[-58, 11, 30, 16], [14, 13, 27, 15], [86, 12, 32, 17], [158, 11, 28, 14], [230, 12, 31, 16]].map(([deg, r0, len, hw]) => {
      const [bx, by] = polar(cx, cy, r0, deg);
      return petal(bx, by, deg, len, hw, true);
    }),
    ...[[-85, 20, 46, 25], [-28, 22, 41, 22], [34, 21, 47, 26], [94, 23, 43, 23], [157, 20, 45, 24], [213, 22, 40, 22]].map(([deg, r0, len, hw]) => {
      const [bx, by] = polar(cx, cy, r0, deg);
      return petal(bx, by, deg, len, hw, true);
    }),
    branch([[cx + 2, cy + 64], [126, 178], [88, 210], [50, 232], [18, 248]]),
    // 잎은 어긋나기(한쪽씩) — 줄기 교차점에 두 장을 겹치면 나비넥타이로 읽힌다
    leaf(122, 182, 240, 24),
    leaf(92, 208, 60, 20),
    leaf(54, 232, 250, 22),
    branch([[204, 88], [222, 70], [236, 84], [238, 108]]), // 시작점은 -28° 바깥 꽃잎 끝(≈205.6, 88.4)에 닿게
    blossom(212, 52, 13, 10),
    blossom(234, 112, 10, 40),
    bud(238, 108, 20, 12),
    drift(62, 128, 200, 9),
    drift(90, 92, 160, 8),
  ].join('');
}

/** 히어로 우상 — 우상에서 좌하로 흐르는 벚가지: 소화 4·봉오리 3·잎 2·흩날림 꽃잎 5 */
function branchCorner() {
  return [
    branch([[254, 6], [222, 36], [180, 78], [132, 116], [88, 150], [44, 188]]),
    branch([[196, 62], [192, 46], [182, 30], [172, 16]]),
    branch([[126, 120], [110, 118], [92, 110], [78, 104]]),
    // 소화는 가지 선에서 8~14px 비껴 앉힌다(선이 꽃 중심을 관통하면 꿰뚫린 것처럼 보인다)
    blossom(214, 58, 14, 20),
    blossom(158, 108, 12, 60),
    blossom(104, 150, 13, 0),
    blossom(68, 186, 10, 45),
    bud(172, 16, -110, 12),
    bud(78, 104, -165, 11),
    bud(44, 188, -135, 10),
    leaf(180, 78, 125, 20),
    leaf(112, 132, -55, 18),
    drift(40, 60, 220, 8),
    drift(74, 40, 240, 7),
    drift(24, 120, 200, 8),
    drift(120, 30, 210, 7),
    drift(16, 30, 230, 6),
  ].join('');
}

/** 섹션 구분선 — 좌우 대칭 수평 가지(완만한 S 하나), 중앙 60px 은 비움(미니 달 자리) */
function branchH() {
  const half = (dir) => {
    // dir=1: 왼쪽 가지가 중앙으로, dir=-1: 오른쪽 가지가 중앙으로(거울)
    const mx = (x) => (dir === 1 ? x : 640 - x);
    const md = (deg) => (dir === 1 ? deg : 180 - deg);
    return [
      branch([[mx(16), 36], [mx(120), 28], [mx(220), 36], [mx(282), 31]]),
      blossom(mx(62), 30, 9, 15),
      blossom(mx(150), 17, 8, 40),
      blossom(mx(236), 47, 8, 0),
      blossom(mx(280), 31, 7, md(20)),
      leaf(mx(102), 30, md(-125), 13),
      leaf(mx(196), 34, md(120), 13),
      leaf(mx(258), 33, md(-110), 11),
      drift(mx(40), 50, md(200), 7),
      drift(mx(180), 52, md(220), 7),
    ].join('');
  };
  return half(1) + half(-1);
}

/** PR-2 카드 인장 — 외원 r72 + 내원 r58, 그 사이에 꽃잎 16 장(양쪽 원에 닿지 않게), 내부는 비움 */
function seal() {
  const cx = 80;
  const cy = 80;
  const parts = [circle(cx, cy, 72), circle(cx, cy, 58)];
  for (let i = 0; i < 16; i += 1) {
    const deg = 22.5 * i;
    const [bx, by] = polar(cx, cy, 60, deg);
    parts.push(petal(bx, by, deg, 10, 5));
  }
  return parts.join('');
}

/** PR-2 스파클 — 4각 별(팔 14·허리 3) + 대각 소원 2. 20px 안팎으로 렌더되므로 stroke 는 세트 중 가장 가늘게. */
function sparkle() {
  const c = 16;
  const arm = 14;
  const waist = 3;
  const star = [
    `M${pt(c, c - arm)}`,
    `Q${pt(c, c)} ${pt(c + arm, c)}`,
    `Q${pt(c, c)} ${pt(c, c + arm)}`,
    `Q${pt(c, c)} ${pt(c - arm, c)}`,
    `Q${pt(c, c)} ${pt(c, c - arm)}`,
  ].join('');
  return star + circle(c + waist * 2.6, c - waist * 2.6, 1.6) + circle(c - waist * 2.6, c + waist * 2.6, 1.6);
}

const MASKS = [
  { name: 'peony', viewBox: '0 0 260 260', strokeWidth: 1.3, d: peony },
  { name: 'branch-corner', viewBox: '0 0 260 200', strokeWidth: 1.2, d: branchCorner },
  { name: 'branch-h', viewBox: '0 0 640 64', strokeWidth: 1.2, d: branchH },
  { name: 'seal', viewBox: '0 0 160 160', strokeWidth: 1.2, d: seal },
  { name: 'sparkle', viewBox: '0 0 32 32', strokeWidth: 0.8, d: sparkle },
];

/** fortune-gateway.css 와 같은 최소 이스케이프(<, >, # 만). 공백·따옴표는 url("…") 안에서 그대로 둔다. */
function toDataUri({ viewBox, strokeWidth, d }) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}'><path fill='none' stroke='#000' stroke-width='${strokeWidth}' stroke-linejoin='round' stroke-linecap='round' d='${d()}'/></svg>`;
  return `url("data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23')}")`;
}

const mask = (name) => `  -webkit-mask-image: var(--cd-yehwa-mask-${name});\n  mask-image: var(--cd-yehwa-mask-${name});\n  -webkit-mask-repeat: no-repeat;\n  mask-repeat: no-repeat;\n  -webkit-mask-size: 100% 100%;\n  mask-size: 100% 100%;`;

// ── CSS 템플릿 ───────────────────────────────────────────────────────────
function render() {
  const vars = MASKS.map((m) => `  --cd-yehwa-mask-${m.name}: ${toDataUri(m)};`).join('\n');
  return `/* generated by scripts/design/gen-yehwa-motifs.mjs — do not hand-edit (yehwa-motifs v1, 2026-09-03)
 * 달빛 예화(月花) 라인아트 모티프: 홈 히어로 배경 문양 · 우상단 달 · 섹션 구분선 (+ PR-2 인장·스파클 마스크).
 * 선은 SVG 마스크의 알파, 색은 background 가 칠한다(토큰 --cd-yehwa-* / styles/theme-tokens.css).
 * 네오 모드는 아래 html.neo-mode 블록이 background·opacity 만 바꾼다. 문양은 전부 정적(애니메이션 없음)이고
 * 텍스트 뒤(z-index 0)에 깔린다 — 텍스트 대비에 관여하지 않는다.
 * 불투명도 실측(2026-09-03, 1350px 연이 히어로 일러스트 위): 로즈골드 .22 는 선 대비 1.07:1 로 보이지 않았다.
 * 그래서 연이 히어로만 딥 로즈골드(--cd-yehwa-line-deep) + .5 로 올렸다(네오는 .16 에서 1.39:1 로 충분). */
.moon-hero__ambient,
.cd-yehwa-divider,
.cd-yehwa-seal,
.cd-yehwa-sparkle {
${vars}
}

/* ── 히어로: 좌하 모란 · 우상 벚가지 · 달 ──
 * .moon-hero__ambient(absolute, inset 0, overflow hidden, z-index 1) 안에 있고 .moon-hero__copy(z-index 2) 아래다.
 * 음수 오프셋으로 모서리 밖에 걸쳐 두어 카피 박스(max-width 820px)와 겹치지 않는다. */
.moon-hero__yehwa {
  position: absolute;
  z-index: 0;
  background: linear-gradient(160deg, var(--cd-yehwa-line-deep) 0%, var(--cd-yehwa-line) 100%);
  pointer-events: none;
}

.moon-hero__yehwa--bl {
  left: -48px;
  bottom: -56px;
  width: 320px;
  height: 320px;
  opacity: .5;
${mask('peony')}
}

.moon-hero__yehwa--tr {
  right: -36px;
  top: -20px;
  width: 300px;
  height: 230px;
  opacity: .46;
${mask('branch-corner')}
}

/* 브랜드 시그니처 달 — 운명의 문 카드의 .fortune-gateway__entry-shell::after 와 같은 계열. */
.moon-hero__yehwa-moon {
  position: absolute;
  top: 36px;
  right: 6%;
  z-index: 0;
  width: 96px;
  aspect-ratio: 1;
  border: 1px solid rgba(255, 255, 255, .9);
  border-radius: 50%;
  background: radial-gradient(circle at 40% 36%, #fffdf7, #fff3e2 58%, var(--cd-yehwa-ivory) 100%);
  box-shadow: 0 0 44px rgba(245, 200, 170, .55), 0 0 96px rgba(255, 214, 190, .3);
  opacity: .9;
  pointer-events: none;
}

/* ── 섹션 구분선: 가지+꽃잎 라인 일러스트, 가운데 미니 달 ──
 * 레이아웃 높이를 가지므로 이 시트는 렌더블로킹으로 로드한다(늦게 오면 CLS). */
.cd-yehwa-divider {
  position: relative;
  display: block;
  width: min(720px, calc(100% - 40px));
  height: 40px;
  margin: 22px auto 6px;
  pointer-events: none;
}

.cd-yehwa-divider::before {
  position: absolute;
  inset: 0;
  /* 가운데는 딥 로즈골드, 양끝은 원색으로 흘려 보낸다 — 크림 배경에서 .28 원색은 1.1:1 로 안 보였다(실측). */
  background: linear-gradient(90deg, var(--cd-yehwa-line) 0%, var(--cd-yehwa-line-deep) 50%, var(--cd-yehwa-line) 100%);
  opacity: .45;
  content: '';
${mask('branch-h')}
}

.cd-yehwa-divider::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 18px;
  height: 18px;
  border: 1px solid var(--cd-yehwa-line);
  border-radius: 50%;
  background: radial-gradient(circle at 40% 36%, #fffdf7, var(--cd-yehwa-ivory) 100%);
  box-shadow: 0 0 14px rgba(245, 200, 170, .5);
  transform: translate(-50%, -50%);
  opacity: .85;
  content: '';
}

/* ── PR-2: 카드 인장·스파클 ──
 * 인장은 자식 <span> 이다(::before/::after 아님) — .cd-sig-card 는 cdSigRise 등장 애니메이션을
 * backwards 로 타서 의사요소로 얹으면 시작 프레임에서 함께 튄다.
 * 🔴 z-index 는 -1 이다. 배치 대상 3곳은 전부 이미 스태킹 컨텍스트라(운명의 문 카드·빠른 서비스
 * 카드는 isolation:isolate, 대표 상담 카드는 backdrop-filter) 인장이 카드 배경 위·본문 아래에 깔린다.
 * 0 으로 두면 위치가 지정되지 않은 형제 텍스트보다 위에 칠해진다. */
/* 🔴 불투명도는 브리프의 "15~25%" 가 아니라 실측값이다 — 원색 .22 는 흰 카드 위에서 선 대비
 * 1.10:1 로 안 보였다(2026-09-03 A/B 픽셀 측정: 모티프 opacity 0 대비). 선이 1px 보다 가늘어
 * (인장 stroke 1.2/160 → 88px 에서 0.66px) 안티에일리어싱이 실효 알파를 절반쯤 깎기 때문이다.
 * 그래서 히어로와 같은 처방 — 딥 로즈골드로 바꾸고 알파를 올린다. */
.cd-yehwa-seal {
  position: absolute;
  z-index: -1;
  background: linear-gradient(160deg, var(--cd-yehwa-line-deep) 0%, var(--cd-yehwa-line) 100%);
  opacity: .5;
  pointer-events: none;
${mask('seal')}
}

.cd-yehwa-sparkle {
  position: absolute;
  z-index: 0;
  background: var(--cd-yehwa-line-deep);
  opacity: .5;
  pointer-events: none;
${mask('sparkle')}
}

/* 🔴 인장은 카드 모서리 **밖으로** 절반쯤 걸쳐 overflow:hidden 이 호(弧)만 남기게 둔다.
 * 안쪽으로 통째로 넣으면 어느 카드에서도 글자를 지난다 — 2026-09-03 실측(Range.getClientRects
 * 로 잰 글자 잉크 상자, 1350/390): 운명의 문 카드는 CTA 알약이 좌하 x31~182·y242~265 까지 오고,
 * 빠른 서비스 카드는 181x106 안에 아이콘·이름·가격이 세로로 꽉 찬다.
 * 아래 좌표는 그 잉크 상자와 겹치지 않는 값이다(가장 좁은 여백 2px, 빠른 서비스 카드 390px). */

/* 운명의 문 — 좌하. 우하는 .fortune-gateway__door--chat::before(작약)와 연이 아트가 이미 쓴다. */
.fortune-gateway__door--chat .cd-yehwa-seal {
  left: -40px;
  bottom: -34px;
  width: 88px;
  height: 88px;
}

/* 연이 곁 스파클 — .fortune-gateway__door-art 는 글자를 담지 않는 아트 전용 상자라
 * 어느 폭에서도 텍스트와 겹칠 수 없다(카드 기준 px 를 박으면 카피가 바뀔 때 어긋난다).
 * img(z-index:1) 위로 올린다 — 아래에 두면 투명 픽셀로만 비쳐 크기마다 밝기가 달라진다. */
.fortune-gateway__door-art .cd-yehwa-sparkle {
  z-index: 2;
}

.cd-yehwa-sparkle--a {
  top: 4%;
  left: 4%;
  width: 16px;
  height: 16px;
}

.cd-yehwa-sparkle--b {
  top: 27%;
  left: -2%;
  width: 12px;
  height: 12px;
}

.cd-yehwa-sparkle--c {
  top: 1%;
  right: 6%;
  width: 13px;
  height: 13px;
}

/* 대표 상담 5장 — 우하. 사진(.cd-sig-card__media)은 카드 위쪽을 쓰므로 인장은 본문 아래 모서리로. */
.cd-sig-card .cd-yehwa-seal {
  right: -40px;
  bottom: -34px;
  width: 88px;
  height: 88px;
}

/* 🔴 빠른 서비스 카드(.cd-quick-card)에는 인장을 두지 않는다(2026-09-03 사용자 결정).
 * 카드가 182x106px 이라 72px 인장이 카드 높이의 68% 를 먹고(대표 상담 19% · 운명의 문 29%),
 * 그 크기에서는 꽃잎 16장이 직선 방사살로 잘려 "시계 밴드"로 읽혔다(10배 확대 판정).
 * 6장에 반복하면 배경 타일처럼 보이고, 한 장만 찍으면 "선택됨" 상태 표시로 오독된다.
 * 인장은 운명의 문 1 + 대표 상담 5 = 6개로 둔다. */

/* ── 네오: 같은 선, 샴페인 골드로 재도색(바이올렛은 그라데이션 끝 15% 만 — One Accent) ── */
html.neo-mode body .moon-hero__yehwa {
  background: linear-gradient(160deg, #e8d5a3 0%, #e8d5a3 85%, #c4b5fd 100%);
  opacity: .16;
}

/* 인장·스파클은 히어로 문양(.16)보다 높다 — 320px 문양과 달리 88px 이하라 선 길이가 짧고,
   어두운 네오 표면 위에서 .16 은 1.17:1 로 눌렸다(실측). */
html.neo-mode body .cd-yehwa-seal {
  background: linear-gradient(160deg, #e8d5a3 0%, #e8d5a3 85%, #c4b5fd 100%);
  opacity: .26;
}

html.neo-mode body .cd-yehwa-sparkle {
  background: #e8d5a3;
  opacity: .34;
}

/* 달은 반투명으로 두면 뒤 일러스트가 비쳐 "흐린 유리 원"이 된다(실측) — 불투명 샴페인 디스크로 칠한다. */
html.neo-mode body .moon-hero__yehwa-moon {
  border-color: rgba(244, 233, 200, .7);
  background: radial-gradient(circle at 40% 36%, #fff8e6, #f1e2bb 58%, var(--cd-yehwa-ivory) 100%);
  box-shadow: 0 0 44px rgba(232, 213, 163, .42), 0 0 96px rgba(196, 181, 253, .26);
  opacity: .94;
}

html.neo-mode body .cd-yehwa-divider::before {
  background: linear-gradient(90deg, #c4b5fd 0%, #e8d5a3 50%, #c4b5fd 100%);
  opacity: .22;
}

html.neo-mode body .cd-yehwa-divider::after {
  border-color: rgba(244, 233, 200, .7);
  background: radial-gradient(circle at 40% 36%, #fff8e6, var(--cd-yehwa-ivory) 100%);
  box-shadow: 0 0 14px rgba(196, 181, 253, .4);
}

/* ── 모바일: 카피 박스가 히어로 카드를 거의 다 채운다(390px 실측: 카드 312px 중 286px).
 * 브랜드 줄이 가운데 정렬이라 우상단 빈 자리는 30px 남짓뿐 — 벚가지는 끄고(글자 위를 지난다),
 * 달은 28px 로 모서리에, 모란은 좌하 모서리 밖으로 더 밀어 신뢰 배지 뒤 귀퉁이만 보이게 한다. ── */
@media (max-width: 768px) {
  .moon-hero__yehwa--bl {
    left: -56px;
    bottom: -64px;
    width: 140px;
    height: 140px;
    opacity: .4;
  }

  .moon-hero__yehwa--tr {
    display: none;
  }

  .moon-hero__yehwa-moon {
    top: 8px;
    right: 8px;
    width: 28px;
    box-shadow: 0 0 18px rgba(245, 200, 170, .5);
  }

  .cd-yehwa-divider {
    width: calc(100% - 28px);
    height: 28px;
    margin: 16px auto 4px;
  }

  .cd-yehwa-divider::before {
    opacity: .5;
  }

  .cd-yehwa-divider::after {
    width: 14px;
    height: 14px;
  }
}

/* 인장·스파클의 모바일 값은 호스트 카드가 좁아지는 지점(운명의 문 680px · 빠른 서비스 520px)에
 * 맞춘다 — 위 768px 블록에 넣으면 카드는 아직 넓은데 인장만 작아진다.
 * 대표 상담 카드는 390px 에서도 296x443 이라 데스크톱 값 그대로 여백이 남는다(실측). */
@media (max-width: 680px) {
  /* 64px 에서 마스크 stroke(1.2/160)는 0.48px 이라 안티에일리어싱이 알파를 반쯤 먹는다 —
     같은 .5 로는 1.25:1(연이)·1.29:1(네오)까지 눌려 목표 1.3 아래였다(실측). 알파로 되돌린다. */
  .fortune-gateway__door--chat .cd-yehwa-seal {
    left: -30px;
    bottom: -26px;
    width: 64px;
    height: 64px;
    opacity: .6;
  }

  html.neo-mode body .fortune-gateway__door--chat .cd-yehwa-seal {
    opacity: .31;
  }

  /* 아트가 118px 로 줄어 스파클 셋은 뭉친다 — 가운데 하나를 빼고 둘만 남긴다.
     🔴 12px 아래로는 마스크 stroke(0.8)가 사라지므로 더 줄이지 않는다.
     🔴 좌상단에 두면 안 된다 — 카드가 세로로 접히면서 아트가 왼쪽 글자단에 붙어
     360px 에서 "FORTUNE CHAT" 을 13x11px 덮었다(실측). 아래로 내려 글자단 아래를 지난다. */
  .cd-yehwa-sparkle--a {
    top: auto;
    bottom: 6%;
    left: 3%;
    width: 13px;
    height: 13px;
  }

  .cd-yehwa-sparkle--b {
    display: none;
  }

  .cd-yehwa-sparkle--c {
    width: 12px;
    height: 12px;
  }
}

`;
}

// ── 실행 ────────────────────────────────────────────────────────────────
const css = render();
if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (current !== css) {
    console.error(`[gen-yehwa-motifs] ${path.relative(ROOT, OUT)} 가 생성기와 다르다. node scripts/design/gen-yehwa-motifs.mjs 로 다시 만들 것.`);
    process.exit(1);
  }
  console.log(`[gen-yehwa-motifs] up to date (${css.length} chars)`);
} else {
  fs.writeFileSync(OUT, css);
  console.log(`[gen-yehwa-motifs] wrote ${path.relative(ROOT, OUT)} (${css.length} chars)`);
}
