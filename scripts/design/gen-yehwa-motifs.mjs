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
// 하단 탭바 전용 산출물 — 위 파일(35KB)은 정적 셸 홈에서만 로드되고 App Router 는 읽지 않는다.
// 탭바는 양쪽에 다 있으므로 탭바가 쓰는 마스크만 담은 작은 파일을 따로 낸다.
const OUT_NAV = path.join(ROOT, 'styles', 'yehwa-motifs-nav.css');
// 숙요 궁합 히어로 씬 — 유일하게 CSS 가 아닌 TS 모듈이다(이유는 아래 §숙요 궁합 히어로 씬).
const OUT_SUKUYO = path.join(ROOT, 'app', 'sukuyo-compatibility-ai', '_art', 'yehwaScene.generated.ts');

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
function ring(cx, cy, n, r0, len, hw, rot = 0, scallop = false) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const deg = rot + (360 / n) * i;
    const [bx, by] = polar(cx, cy, r0, deg);
    out.push(petal(bx, by, deg, len, hw, scallop));
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

/** 파인더 가격 행 — 단방향(우하 뿌리 → 좌상 칩) 가지 스프레이.
 * 구분선(branch-h)과 달리 미러 쌍이 없다 — 좌우 대칭은 '나눌 것 없는 자리의 구분선'으로 읽힌다. */
function branchSpray() {
  return [
    branch([[314, 104], [264, 96], [210, 80], [156, 66], [104, 50], [54, 36], [16, 26]]),
    branch([[210, 80], [206, 60], [198, 44], [190, 32]]),
    branch([[104, 50], [90, 62], [74, 70], [60, 80]]),
    // 꽃자루 — 가지에서 꽃잎 경계까지. 없으면 꽃이 선 옆에 떠 보인다(2026-09-03 시각 판정).
    branch([[277, 98], [280, 93], [278, 89]]),
    // 🔴 226 꽃(rot 55)은 아래쪽이 꽃잎 사이 홈이라 반지름(76)에서 멈추면 2.2px 뜬다 — 홈 안 73 까지 넣는다.
    branch([[225, 85], [229, 80], [226, 73]]),
    branch([[171, 70], [175, 75], [172, 79]]),
    branch([[117, 54], [121, 49], [118, 45]]),
    branch([[201, 48], [196, 45], [191, 48]]),
    // 🔴 소화 중심은 가지에서 "반지름 + 8px" 이상 비껴 앉힌다 — 중심 기준 12px 은 꽃잎 끝이 선에 닿아
    //    꿰뚫린 것처럼 보였다(1350px 픽셀 실측: 선 폭 1.1px 자리가 4px 로 뭉침).
    blossom(278, 76, 13, 20),
    blossom(226, 64, 12, 55),
    blossom(172, 90, 11, 0),
    blossom(118, 34, 11, 45),
    blossom(182, 48, 9, 40),
    // 🔴 봉오리 밑동 원(r 1.2)과 가지 끝 캡(r 0.6)의 중심 거리는 1.8 안팎 — 그래야 접선으로 붙는다.
    //    4 를 주면 2px 떠 보이고, 0 을 주면 덩어리로 뭉친다(둘 다 1350px 확대 실측).
    bud(190, 30, -100, 11),
    bud(59, 81, 140, 10),
    bud(14, 24, -160, 11),
    // 잎은 밑동을 가지에서 2~6px 떼고 가지 반대쪽으로만 뻗는다 — 대신 잎자루로 이어 붙인다
    //    (꽃만 꽃자루를 갖고 잎은 떠 있으면 부착 논리가 어긋나 보인다).
    branch([[250, 92], [250, 94], [250, 96]]),
    branch([[138, 60], [138, 58], [138, 55]]),
    branch([[82, 65], [82, 63], [82, 61]]),
    leaf(250, 96, 125, 15),
    leaf(138, 55, -60, 16),
    leaf(82, 61, -130, 14),
    drift(34, 62, 200, 8),
    drift(88, 18, 215, 7),
    drift(148, 16, 225, 7),
    drift(214, 22, 210, 6),
  ].join('');
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
  { name: 'branch-spray', viewBox: '0 0 320 116', strokeWidth: 1.2, d: branchSpray },
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
.cd-yehwa-vine,
.cd-yehwa-seal,
.cd-yehwa-sparkle,
.cd-yehwa-spray,
.cd-yehwa-sprig,
.cd-yehwa-peony {
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


/* ── 홈 "접어 둔 섹션 펼치기" 알약을 감싸는 가지 띠 ──
 * 이 버튼(.cd-home-more)은 자기가 여는 섹션 바로 위에 있어 구분선을 겸한다. 예전에는 1px 헤어라인
 * 두 줄이었는데, 구분선 마스크(branch-h)는 가운데 76/640(11.9%)이 비어 있어 알약을 그 자리에
 * 앉히면 한 띠가 장식과 구분선을 함께 한다.
 * 🔴 z-index 는 -1 이다 — 호스트 .cd-home-more 가 position:relative;z-index:1 로 이미 스태킹
 *   컨텍스트라(index.html 의 cd-home-more 블록) 띠가 알약 뒤·그리드 배경 위에 깔린다. 0 으로 두면
 *   위치가 지정되지 않은 형제인 버튼보다 위에 칠해져 꽃가지가 알약을 지난다.
 * 🔴 높이가 곧 그림의 폭이다 — 마스크 SVG 는 viewBox 만 있고 preserveAspectRatio 기본값(meet)이라
 *   mask-size:100% 100% 로도 늘어나지 않고 짧은 축에 맞춰 letterbox 된다. viewBox 가 640x64 이므로
 *   실제 그림 폭 = min(요소 폭, 높이 x 10) 이다. 처음 46px 로 뒀더니 그림이 460px 로 접혀
 *   알약(368px) 양옆에 35px 짜리 잔가지 토막만 남았다(2026-09-04 A/B 픽셀 실측: 기여 324px,
 *   범위가 알약 경계 ±35px 뿐). 760px 를 채우려면 높이가 76px 여야 한다.
 * 좁은 폭에서는 요소 폭이 먼저 걸려 그림이 자동으로 함께 낮아진다 — 그래서 높이를 따로 안 줄인다. */
.cd-yehwa-vine {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: -1;
  width: min(760px, 100%);
  height: 76px;
  background: linear-gradient(90deg, var(--cd-yehwa-line) 0%, var(--cd-yehwa-line-deep) 50%, var(--cd-yehwa-line) 100%);
  opacity: .5;
  transform: translate(-50%, -50%);
  pointer-events: none;
${mask('branch-h')}
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

/* ── PR-3: 섹션 코너 가지 · 파인더 가지 · 고민 활성 카드 인장 ──
 * 가지는 자식 <span> 이고 z-index -1 이다(인장과 같은 이유). 호스트는 전부 이미 스태킹 컨텍스트다 —
 * 왜 우리·고민 섹션은 position:relative;z-index:2, AI 카드는 isolation:isolate, 파인더 패널은
 * z-index:2 (2026-09-03 computed style 실측). 그래서 여기서는 isolation 을 다시 걸지 않는다.
 * 자리는 글자 잉크 상자(Range.getClientRects, 1350/390)로 잰 빈 모서리다:
 *   왜 우리 상단 좌우 — 제목이 x525~825 에 있고 카드는 y80 부터. 가지 200x154 를 y-36 에 걸면
 *     카드 위쪽 116px 만 보이고 나머지는 불투명(.96) 카드 아래로 숨는다. 잎 끝과 카드 윗선 간격 ≥15px
 *     (y-24 에서는 4.5px 라 "닿음"으로 읽혔다 — 시각 판정 4차). 섹션은 overflow:visible 이고 위쪽
 *     빠른 서비스 섹션과 40px 여백이 있어 밖으로 나간 36px 은 빈 여백에 그려진다.
 *   AI 카드 상단 좌우 — 330x165 가 비어 있고 서브카드는 y188 부터(overflow:hidden 이 바깥을 자른다).
 *   파인더 가격 행 우측 — 아래 .cd-yehwa-spray 가 맡는다. 구분선 마스크(branch-h)는 좌우 대칭이라
 *     방식/가격 행 사이 거터에 뜬 미러 쌍이 "나눌 것 없는 자리의 구분선"으로 읽혔다(2026-09-03 시각 판정).
 *     그래서 단방향 branch-spray 를 새로 그려 가격 행 baseline 에 앉혔다.
 *   고민 활성 카드 — 버건디 평면 카드의 오른쪽 절반(126px)이 비어 있다. 인장은 aria-expanded=true 인
 *     카드에만 보이고 선택을 따라 옮겨 간다(6장 전부에 span 을 두고 CSS 로 켠다).
 *     🔴 우상단이다 — 우하단은 부제가 석 줄로 접히는 폭(820·768·480 실측)에서 마지막 줄과 겹친다. */
.cd-yehwa-sprig {
  position: absolute;
  z-index: -1;
  background: linear-gradient(160deg, var(--cd-yehwa-line-deep) 0%, var(--cd-yehwa-line) 100%);
  opacity: .6;
  pointer-events: none;
${mask('branch-corner')}
}

/* 마스크는 우상단용으로 그려져 있다(히어로 --tr 와 같다). 좌상단은 좌우 반전. */
.cd-yehwa-sprig--tl {
  transform: scaleX(-1);
}

.cd-why-us > .cd-yehwa-sprig {
  top: -36px;
  width: 200px;
  height: 154px;
}

.cd-why-us > .cd-yehwa-sprig--tl {
  left: 4px;
}

.cd-why-us > .cd-yehwa-sprig--tr {
  right: 4px;
}

/* 딥 플럼 위에서는 딥 로즈골드가 가라앉는다 — 카드 자체의 금(#ead089)과 같은 계열로 밝게. */
.cd-ai-feats > .cd-yehwa-sprig {
  top: -28px;
  width: 240px;
  height: 185px;
  background: linear-gradient(160deg, #ead089 0%, var(--cd-yehwa-line) 100%);
  opacity: .3;
}

.cd-ai-feats > .cd-yehwa-sprig--tl {
  left: -24px;
}

.cd-ai-feats > .cd-yehwa-sprig--tr {
  right: -24px;
}

/* ── 파인더 가격 행 — 단방향 가지 스프레이 ──
 * 행 오른쪽 거터는 이 패널에서 가장 넓고 안정적인 빈 사각형이다(1350/1100/900/820/768px 실측:
 *   712 / 482 / 298 / 240 / 192px). 뿌리를 우하에 두고 칩 쪽으로 한 방향으로만 뻗는다.
 * 🔴 행에 z-index:0 을 함께 준다 — position:relative 만으로는 스태킹 컨텍스트가 안 생겨 z-index:-1 자식이
 *   패널(#fortuneGatewayDiscover)의 불투명 그라디언트 뒤로 빠져 아예 안 보인다.
 * 480px 이하는 칩이 두 줄로 접혀 거터가 사라진다 — 900px 아래에서 끈다. */
.fortune-gateway__filter-row {
  position: relative;
  z-index: 0;
}

.fortune-gateway__filter-row > .cd-yehwa-spray {
  position: absolute;
  right: 0;
  bottom: -10px;
  z-index: -1;
  width: 300px;
  height: 109px;
  background: linear-gradient(160deg, var(--cd-yehwa-line-deep) 0%, var(--cd-yehwa-line) 100%);
  opacity: .5;
  pointer-events: none;
${mask('branch-spray')}
}

/* 고민 카드는 overflow:hidden 으로 호(弧)만 남긴다 — 포커스 링은 outline 이라 잘리지 않는다. */
.cd-concern__card {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.cd-concern__card .cd-yehwa-seal--concern {
  display: none;
  top: -30px;
  right: -30px;
  width: 88px;
  height: 88px;
  background: var(--cd-yehwa-ivory);
  opacity: .38;
}

.cd-concern__card[aria-expanded="true"] .cd-yehwa-seal--concern {
  display: block;
}

/* ── PR-3: 모란 — 피드백 카드 본문 우측 · 푸터 링크 허브 2행 우측 ──
 * 피드백 카드(1350 실측): 본문 글자가 x540 에서 끝나고 CTA 는 x1162 부터라 555x188 이 비어 있다.
 *   가운데 열(.cd-feedback__copy)의 오른쪽 끝에 140px 로 세로 중앙. 카드는 isolation:isolate + overflow:hidden.
 * 푸터(1350 실측): 링크 허브 5열 그리드의 6번째 열(기능 가이드)이 2행 1열로 내려가 2행의 나머지
 *   4칸(960x525)이 페이지에서 가장 큰 빈 면이다. 그 우하단에 220px. 900px 아래는 2열 그리드로 접혀 끈다. */
.cd-yehwa-peony {
  position: absolute;
  z-index: -1;
  background: linear-gradient(160deg, var(--cd-yehwa-line-deep) 0%, var(--cd-yehwa-line) 100%);
  opacity: .5;
  pointer-events: none;
${mask('peony')}
}

.cd-feedback__copy {
  position: relative;
}

.cd-feedback__copy > .cd-yehwa-peony {
  top: 50%;
  right: 0;
  width: 140px;
  height: 140px;
  background: linear-gradient(160deg, #ead089 0%, var(--cd-yehwa-line) 100%);
  opacity: .3;
  transform: translateY(-50%);
}

/* 앱 설치 카드(2026-09-04) — .cd-feedback 과 같은 3열 카드라 같은 자리·같은 처방을 쓴다.
 * 카드는 기본 hidden 이고 beforeinstallprompt 가 와야 열린다(js/pwa-install-prompt.js). */
.cd-app-install__copy {
  position: relative;
}

.cd-app-install__copy > .cd-yehwa-peony {
  top: 50%;
  right: 0;
  width: 140px;
  height: 140px;
  background: linear-gradient(160deg, #ead089 0%, var(--cd-yehwa-line) 100%);
  opacity: .3;
  transform: translateY(-50%);
}

.cd-footer-shell {
  position: relative;
}

.cd-footer-shell > .cd-yehwa-peony {
  right: 32px;
  bottom: 20px;
  width: 220px;
  height: 220px;
}

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

/* 띠는 구분선과 같은 칠이되 알파를 조금 높인다 — 46px 로 납작해 선이 가늘고(1.2/64 → 0.86px)
   알약의 어두운 표면 옆에서 .22 는 가라앉았다. */
html.neo-mode body .cd-yehwa-vine {
  background: linear-gradient(90deg, #c4b5fd 0%, #e8d5a3 50%, #c4b5fd 100%);
  opacity: .3;
}

/* PR-3 — 네오의 고민 활성 카드는 밝은 바이올렛(--cd-primary)이라 선은 잉크색으로 뒤집는다. */
html.neo-mode body .cd-yehwa-sprig {
  background: linear-gradient(160deg, #e8d5a3 0%, #e8d5a3 85%, #c4b5fd 100%);
  opacity: .22;
}

html.neo-mode body .cd-ai-feats > .cd-yehwa-sprig {
  opacity: .22;
}

html.neo-mode body .cd-yehwa-spray {
  background: linear-gradient(160deg, #e8d5a3 0%, #e8d5a3 85%, #c4b5fd 100%);
  opacity: .22;
}

html.neo-mode body .cd-concern__card .cd-yehwa-seal--concern {
  background: #13102a;
  opacity: .36;
}

html.neo-mode body .cd-yehwa-peony {
  background: linear-gradient(160deg, #e8d5a3 0%, #e8d5a3 85%, #c4b5fd 100%);
  opacity: .22;
}

/* 피드백 카드의 밝은 금 그라디언트는 네오 잉크 위에서 .22 로는 CR 1.32 — .28 로. */
html.neo-mode body .cd-feedback__copy > .cd-yehwa-peony {
  opacity: .28;
}

html.neo-mode body .cd-app-install__copy > .cd-yehwa-peony {
  opacity: .28;
}

/* AI 카드 가지 — 제목(548px, 가운데)이 1100px 부터 가지 아래쪽 y123~168 띠에 닿는다(폭 스윕 실측).
 * 제목 위쪽(y123)에서 끝나도록 170x131 로 줄인다.
 * 🔴 900px 블록보다 앞에 둔다 — 아래 --tr 규칙과 특이도가 같아 순서로 이긴다. */
@media (max-width: 1200px) {
  .cd-ai-feats > .cd-yehwa-sprig {
    width: 170px;
    height: 131px;
  }
}

/* 파인더 스프레이 — 1024px 부터 방식 행 칩이 두 줄로 접혀 300x109 의 위쪽이 칩 글자에 닿는다
 * (1024/950/901px 실측: 잉크 겹침 60/725/1482px²). 가격 행 띠 안에 머무는 200x73 으로 줄인다.
 * 🔴 불투명도를 함께 올린다 — mask-size 가 선까지 같이 줄여(획 1.12px → 0.78px 실측) 대비 1.35:1 이상
 *   픽셀이 4.12% → 1.38% 로 빠졌다. 상한 .6 안에서 .58 로 보정한다. */
@media (max-width: 1200px) {
  .fortune-gateway__filter-row > .cd-yehwa-spray {
    bottom: -6px;
    width: 200px;
    height: 73px;
    opacity: .58;
  }
}

/* 모란 — 900px 아래에서는 피드백 본문이 열 끝까지 차고 푸터는 2열 그리드로 접힌다.
 * AI 카드 가지 — 820px 아래에서 헤더가 왼쪽 정렬로 바뀌어 제목이 y73(820 은 y82)부터 시작하고
 *   오른쪽 여백이 560·480px 에서 79·47px 뿐이다(2026-09-03 폭 스윕 실측). 좌상단은 끄고 우상단은
 *   제목 위(y59)에서 끝나는 100x77 로 줄인다. 네오는 390px 에서 눈썹 라벨이 가운데 정렬(x95~210)이라
 *   right -24 로 가지 시작을 x228 에 두어 라벨과 18px 띄운다. */
@media (max-width: 900px) {
  .cd-yehwa-peony,
  .fortune-gateway__filter-row > .cd-yehwa-spray,
  .cd-ai-feats > .cd-yehwa-sprig--tl {
    display: none;
  }

  .cd-ai-feats > .cd-yehwa-sprig--tr {
    top: -18px;
    right: -24px;
    width: 100px;
    height: 77px;
    opacity: .5;
  }

  /* 77x60 만 보이는 가지는 선이 가늘어 데스크톱 불투명도로는 CR 1.34/1.16(pig/neo, 480px A/B 실측). */
  html.neo-mode body .cd-ai-feats > .cd-yehwa-sprig--tr {
    opacity: .5;
  }
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

  /* PR-3 — 390px 실측: 왜 우리 제목이 폭을 다 쓴다(x70~245). */
  .cd-why-us > .cd-yehwa-sprig {
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

  /* 좁은 폭에서는 알약이 행을 거의 다 덮는다(390px: 행 308 중 알약 279) — 행 폭 그대로면 좌우에
     13px 스트립만 남아 가지가 안 보였다(A/B 실측: 연이 기여 30px). 행 바깥 거터로 36px 씩 내보낸다.
     🔴 72px 는 거터(≤640px 에서 좌우 41px, 768px 에서 56px) 안에 드는 값이다 — 더 키우면 문서가
     가로로 넘친다. 높이 48 은 알약(56~68px)을 좌우로 40px 이상 넘기기 위한 그림 폭 480px 몫이다.
     선이 0.7px 로 얇아지므로 불투명도를 함께 올린다(구분선과 같은 처방). */
  .cd-yehwa-vine {
    width: calc(100% + 72px);
    height: 48px;
    opacity: .78;
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

  /* 고민 카드가 138px 정사각이 되면 우상 빈 자리가 51x50 뿐이다 — 60px 인장, 32x34 만 보인다. */
  .cd-concern__card .cd-yehwa-seal--concern {
    top: -26px;
    right: -28px;
    width: 60px;
    height: 60px;
    opacity: .5;
  }

  /* 60px 로 줄면 선이 가늘어져 같은 불투명도로는 네오 CR 1.27 — .55 로 올린다(2026-09-03 판정). */
  html.neo-mode body .cd-concern__card .cd-yehwa-seal--concern {
    opacity: .55;
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

// ── 탭바 CSS 템플릿 ──────────────────────────────────────────────────────
/**
 * 하단 탭바 활성 탭 인장. 선은 seal 마스크의 알파이고 색은 --cd-mnav-seal-ink 가 칠한다.
 * 표면별 잉크는 소비 측이 덮는다(styles/mobile-bottom-nav.css · index.html 의 cd-mnav-yehwa-dock 블록).
 */
function renderNav() {
  /* 🔴 탭바 마스크는 홈 문양과 **획 굵기가 다른 별도 판**이다. 마스크는 viewBox 크기로 그려져
     목표 박스로 축소되므로 실제 획 = strokeWidth × (렌더폭 / viewBox폭) 이다. 원판(1.2)을 그대로
     쓰면 seal 은 160 → 36px 에서 0.27px, branch-h 는 640 → 200px 에서 0.38px 이 되고
     안티에일리어싱이 그 획을 배경 쪽으로 펴 버린다 — 2026-09-04 픽셀 실측에서 활성 인장 대비가
     연이 모바일 1.20:1 · 네오 모바일 1.49:1 로 주저앉아 4배 확대해야 보였다(장식 대비 창은
     DESIGN.md 기준 1.3~1.7:1). 🔴 알파를 올려도 이건 안 고쳐진다 — 반 픽셀짜리 획을 진하게 만들
     뿐이라 선이 굵어지지 않는다. 렌더 배율의 역수만큼 굵혀 실제 획을 1px 근처로 되돌린다.
       seal:     160 / 36  = 4.44 → 4.4  (실제 획 0.99px)
       branch-h: 640 / 200 = 3.2       (실제 획 1.00px)
     🔴 그래서 아래 박스 크기(인장 36px, 가지 띠 200×20px)를 바꾸면 이 굵기도 함께 바꿔야 한다. */
  const navMask = (name, strokeWidth) => toDataUri({ ...MASKS.find((m) => m.name === name), strokeWidth });
  const navVars = [
    `  --cd-yehwa-mask-seal: ${navMask('seal', 4.4)};`,
    `  --cd-yehwa-mask-branch-h: ${navMask('branch-h', 3.2)};`,
  ].join('\n');
  return `/* generated by scripts/design/gen-yehwa-motifs.mjs — do not hand-edit (yehwa-motifs-nav v3, 2026-09-04)
 * 하단 탭바(App Router .cd-mnav / 정적 셸 .cd-mobile-bottom-nav) 달빛 예화 장식.
 * styles/yehwa-motifs.css 는 셸 홈에서만 로드되므로 전 라우트에 태울 수 없다 — 탭바가 쓰는
 * 마스크 두 종(seal · branch-h)만 여기 따로 낸다. 마크업은 건드리지 않는다.
 *
 * 이 파일이 소유하는 것: 마스크 판 + 활성 탭 인장 + 접기 손잡이의 가지 띠, 그 기하 전부.
 * 소비 측이 소유하는 것: 표면별 잉크(--cd-mnav-seal-ink · --cd-mnav-hairline)뿐이다.
 * 🔴 기하를 소비 측으로 되돌리지 말 것 — 굵기 역보정이 박스 크기와 한 몸이라 떨어지면 어긋난다. */
.cd-mnav,
.cd-mobile-bottom-nav,
.cd-sticky-cta {
${navVars}
}

.cd-mnav__link,
.cd-mobile-bottom-nav__item {
  --cd-mnav-seal-ink: color-mix(in srgb, var(--cd-yehwa-line, #c9a46a) 60%, transparent);
  /* 🔴 인장은 z-index:-1 로 라벨 뒤에 깔린다. 호스트가 스태킹 컨텍스트가 아니면 음수 z-index 가
     조상 배경 뒤까지 빠져 칩 도색에 가려 아예 안 보인다 — isolation 이 그 경계를 만든다. */
  position: relative;
  isolation: isolate;
}

/* 활성 탭에만 규칙이 있다 — 비활성에는 규칙 자체가 없으므로 display 토글이 필요 없다. */
.cd-mnav__link[aria-current="page"]::after,
.cd-mnav__link.is-active::after,
.cd-mobile-bottom-nav__item[aria-current="page"]::after,
.cd-mobile-bottom-nav__item.is-active::after {
  content: "";
  position: absolute;
  z-index: -1;
  left: 50%;
  width: 36px;
  height: 36px;
  margin-left: -18px;
  background: var(--cd-mnav-seal-ink);
  pointer-events: none;
${mask('seal')}
}

/* 아이콘 중심에 맞춘다 — 두 탭바의 셀 높이·패딩이 달라 top 만 따로 준다
 * (App Router 링크 min-height 48 / padding 4, 셸 아이템 min-height 52 / padding 5). */
.cd-mnav__link[aria-current="page"]::after,
.cd-mnav__link.is-active::after {
  top: 0;
}

.cd-mobile-bottom-nav__item[aria-current="page"]::after,
.cd-mobile-bottom-nav__item.is-active::after {
  top: 1px;
}

/* ── 접기 손잡이의 달빛 예화 가지 ──
 * 달(손잡이 ::before, 14px 아이보리 원)을 가운데 두고 좌우로 뻗는 매화 가지다.
 * 🔴 바 상단이 아니라 **손잡이**에 붙인다 — 예전에는 바 상단 전폭 1px 직선이었는데 손잡이 줄과
 *    다른 행이라 달과 선이 따로 놀았고, 바 padding 이 스킨마다 달라 정렬이 계속 어긋났다.
 *    손잡이의 ::after 로 두면 두 중심(left:50%·top:50%)이 구조적으로 겹쳐 어긋날 수가 없다.
 * 🔴 z-index:-1 이 필수다 — 트리 순서상 ::after 는 ::before(달)보다 뒤에 그려지므로 그대로 두면
 *    가지가 달 위를 가로지른다. 음수로 내리면 손잡이 자기 배경 뒤로 가서, 데스크탑의 불투명한
 *    nub(72px) 뒤로 가지가 지나가고 좌우로만 삐져나오는 '가지 위의 달' 구도가 된다.
 *    탭바 컨테이너가 position:fixed + z-index 라 스태킹 컨텍스트를 이미 만들고 있어, 음수 값이
 *    탭바 배경보다 아래로는 빠지지 않는다.
 * 🔴 접었을 때는 끈다 — 손잡이가 88px 알약으로 바뀌어 가지가 그 밖으로 삐져나온다. */
.cd-mnav__handle::after,
.cd-mobile-bottom-nav__toggle::after {
  content: "";
  position: absolute;
  z-index: -1;
  left: 50%;
  top: 50%;
  width: 200px;
  height: 20px;
  margin: -10px 0 0 -100px;
  background: var(--cd-mnav-hairline);
  pointer-events: none;
${mask('branch-h')}
}

body.cd-mnav-collapsed .cd-mnav__handle::after,
body.cd-mnav-collapsed .cd-mobile-bottom-nav__toggle::after {
  display: none;
}

/* 연이 표면(App Router /fortune/{period} 계열)은 크림 배경이라 딥 로즈골드로 뒤집는다. */
body:has(main.cd-yeoni-surface) .cd-mnav__link {
  --cd-mnav-seal-ink: color-mix(in srgb, var(--cd-yehwa-line-deep, #a97b3e) 60%, transparent);
}

@media (prefers-color-scheme: dark) {
  body:has(main.cd-yeoni-surface) .cd-mnav__link {
    --cd-mnav-seal-ink: color-mix(in srgb, var(--cd-yehwa-line, #c9a46a) 60%, transparent);
  }
}
`;
}

// ── 숙요 궁합 히어로 씬 ──────────────────────────────────────────────────
/**
 * /sukuyo-compatibility-ai/ 히어로 배경. 🔴 이 산출물만 CSS 가 아니라 TS 경로 모듈이다.
 * 이유 두 가지:
 *   1) 획마다 불투명도가 다르고(.34~.74), 꽃이 잎을·잎이 가지를 가리는 오클루전 마스크를 세 장 쓴다.
 *      CSS mask-image 는 단일 알파 한 장이라 둘 다 표현할 수 없다.
 *   2) 마스크로 내면 app/layout.js 에 전 라우트용 CSS 를 한 장 더 태워야 한다(현재 nav 판 하나뿐).
 * 🔴 좌표는 여기가 정본이다 — 컴포넌트에 손으로 박지 말 것.
 * 목업 승인본: "숙요 궁합 달빛 예화 개편안"(2026-09-05). v1→v3 픽셀 실측으로 잡은 값이라
 * 하나를 옮기면 그 표의 잉크율·대비가 같이 움직인다.
 */

/** 빛망울 — 끝이 뾰족한 별이 아니라 허리가 잘록한 4각 블룸(채움). sparkle() 은 선, 이건 면이다. */
function spark(cx, cy, r) {
  const w = r * 0.16;
  return `M${pt(cx, cy - r)}Q${pt(cx + w, cy - w)} ${pt(cx + r, cy)}Q${pt(cx + w, cy + w)} ${pt(cx, cy + r)}Q${pt(cx - w, cy + w)} ${pt(cx - r, cy)}Q${pt(cx - w, cy - w)} ${pt(cx, cy - r)}Z`;
}

/** 모란 바깥 겹 9 장(물결 끝) — 히어로 좌하단의 주역이라 peony() 마스크판보다 크고 성기다. */
const peonyOuter = (cx, cy, r, rot = 0) => ring(cx, cy, 9, r * 0.3, r * 0.72, r * 0.3, rot + 20, true);
/** 모란 안쪽 겹 5 장 + 꽃술 — 바깥 겹과 알파를 벌려(.74 / .5) 중심→안→밖 3단 위계를 만든다. */
const peonyInner = (cx, cy, r, rot = 0) => ring(cx, cy, 5, r * 0.09, r * 0.28, r * 0.17, rot) + circle(cx, cy, r * 0.08);

// 앞 실루엣이 뒤 선을 끊는 폭. 획 폭 + 이 값으로 검게 그린 사본이 마스크가 된다.
const SCENE_KNOCK = 4.6;
const SCENE_MOON = { cx: 702, cy: 138, r: 58, auraR: 140 };
const SCENE_HALOS = [{ r: 78, a: 0.3 }, { r: 100, a: 0.17 }, { r: 126, a: 0.09 }];

const SCENE_BRANCHES = [
  { d: branch([[-30, 512], [72, 470], [156, 436], [232, 386], [284, 318], [303, 272]], 0.52), w: 1.7, a: 0.6 },
  { d: branch([[196, 410], [216, 372], [224, 330]]), w: 1.2, a: 0.42 },
  { d: branch([[930, 306], [858, 330], [788, 356], [724, 378], [672, 372], [640, 384]]), w: 1.5, a: 0.52 },
  { d: branch([[792, 362], [778, 404], [750, 436]]), w: 1.1, a: 0.36 },
  // 봉오리(311,250)와 벚꽃(302,274) 사이 12px 공백을 잇는 줄기. 양 끝을 두 실루엣이 깎아내
  // "꽃 뒤에서 나온다"로 읽힌다 — 없으면 봉오리가 떠 보인다(v3 시각 판정).
  { d: branch([[313, 245], [309, 256], [302, 269]]), w: 1, a: 0.5 },
];

// 두 사람을 잇는 달빛. 진한 한 줄 + 흐린 한 줄이 어긋나게 지나가 '한 가닥 실'로 굳지 않는다.
const SCENE_LINK = {
  main: branch([[311, 250], [420, 288], [512, 306], [598, 348], [648, 380]]),
  soft: branch([[311, 250], [376, 286], [456, 312], [544, 322], [608, 358], [646, 388]]),
};

const SCENE_LEAVES = [
  { d: leaf(88, 462, 158, 36), w: 1, a: 0.42 },
  { d: leaf(228, 458, -20, 30), w: 1, a: 0.4 },
  { d: leaf(824, 336, 22, 32), w: 1, a: 0.4 },
  { d: leaf(756, 408, 118, 28), w: 1, a: 0.36 },
  { d: leaf(372, 474, -25, 30), w: 1, a: 0.46 },
];

const SCENE_FLOWERS = [
  { d: peonyOuter(134, 432, 60, 8), w: 1.15, a: 0.74 },
  { d: peonyInner(134, 432, 60, 8), w: 0.95, a: 0.5 },
  { d: blossom(248, 342, 19, 14), w: 1, a: 0.62 },
  { d: blossom(302, 274, 17, -22), w: 0.95, a: 0.54 },
  { d: bud(311, 250, -74, 22), w: 1, a: 0.6 },
  { d: bud(224, 328, -62, 17), w: 0.95, a: 0.5 },
  { d: blossom(700, 374, 22, -6), w: 1.05, a: 0.66 },
  { d: blossom(792, 348, 15, 30), w: 0.95, a: 0.5 },
  { d: bud(640, 384, 186, 20), w: 1, a: 0.58 },
  { d: bud(750, 436, 100, 16), w: 0.95, a: 0.42 },
  { d: blossom(452, 456, 16, 10), w: 0.95, a: 0.34 },
];

const SCENE_DRIFTS = [
  { d: drift(126, 172, -26, 17), w: 1.05, a: 0.55 },
  { d: drift(214, 108, 16, 13), w: 1.05, a: 0.48 },
  { d: drift(392, 148, -42, 14), w: 1.05, a: 0.52 },
  { d: drift(470, 84, 24, 11), w: 1, a: 0.54 },
  { d: drift(568, 214, -14, 12), w: 1, a: 0.56 },
];

const SCENE_SPARKS = [
  { d: spark(512, 306, 11), a: 0.9, ink: 'violet' },
  { d: spark(612, 74, 7), a: 0.5, ink: 'ivory' },
  { d: spark(846, 214, 5), a: 0.36, ink: 'ivory' },
];

/* 🔴 모바일은 축소가 아니라 크롭이다. 900폭 씬을 360폭에 넣으면 배율 0.4 에서 1px 획이
   0.4px 로 주저앉아 안티에일리어싱이 배경으로 펴 버린다(탭바 인장이 1.20:1 로 무너진 것과 같은 사고).
   좌하단 모란만 잘라 쓰고(476폭 → 배율 ≈0.71) 획을 그 역수(1.4)만큼 굵혀 실제 획을 1px 근처로 되돌린다.
   달은 이 크롭 밖이라 별도의 30px 코너 배지로 뗀다. */
const SCENE_MOBILE = { viewBox: '16 336 476 186', strokeScale: 1.4, branches: [0, 1], leaves: [0, 1, 4], flowers: [0, 1, 10] };

/** 카드 인장 — 외원 + 벚꽃 소화 + 꽃잎 6 장. 탭바 인장(seal())과 달리 속을 비우지 않는다. */
const SUKUYO_SEAL_STROKES = [
  { d: circle(80, 80, 62), w: 5, a: 0.4 },
  { d: blossom(80, 80, 34, 12), w: 6.5, a: 0.92 },
  { d: ring(80, 80, 6, 46, 14, 6, 30), w: 4.6, a: 0.5 },
];

/** 섹션 제목 위의 가지 띠 — branchH() 와 달리 미러 쌍이 아니라 한 줄로 흐른다. */
const SUKUYO_VINE_STROKES = [
  { d: branch([[8, 40], [110, 26], [220, 36], [320, 22], [420, 36], [530, 26], [632, 40]]), w: 3.5, a: 0.5 },
  { d: blossom(320, 22, 15, 10), w: 3.2, a: 0.85 },
  { d: blossom(180, 33, 10, -20), w: 3, a: 0.6 },
  { d: blossom(462, 33, 10, 20), w: 3, a: 0.6 },
  { d: leaf(108, 27, 200, 20), w: 3, a: 0.45 },
  { d: leaf(532, 27, -20, 20), w: 3, a: 0.45 },
];

// ── 씬 모듈 템플릿 ───────────────────────────────────────────────────────
function renderScene() {
  const rows = (list) => (list.length ? `[\n${list.map((o) => `  ${JSON.stringify(o)},`).join('\n')}\n]` : '[]');
  const pick = (list, idx) => idx.map((i) => list[i]);
  const scene = (o) => [
    '{',
    `  viewBox: ${JSON.stringify(o.viewBox)},`,
    `  strokeScale: ${o.strokeScale},`,
    `  moon: ${o.moon ? JSON.stringify(o.moon) : 'null'},`,
    `  halos: ${JSON.stringify(o.halos)},`,
    `  link: ${o.link ? JSON.stringify(o.link) : 'null'},`,
    `  branches: ${rows(o.branches).replace(/\n/g, '\n  ')},`,
    `  leaves: ${rows(o.leaves).replace(/\n/g, '\n  ')},`,
    `  flowers: ${rows(o.flowers).replace(/\n/g, '\n  ')},`,
    `  drifts: ${rows(o.drifts).replace(/\n/g, '\n  ')},`,
    `  sparks: ${rows(o.sparks).replace(/\n/g, '\n  ')},`,
    '}',
  ].join('\n');

  return `/* generated by scripts/design/gen-yehwa-motifs.mjs — do not hand-edit (sukuyo-yehwa-scene v1, 2026-09-05)
 * 숙요 궁합 히어로의 달빛 예화 씬과 이 페이지 전용 모티프(인장 · 가지 띠 · 다리) 경로.
 * 🔴 좌표·굵기·불투명도는 생성기가 소유한다. 여기를 고치면 다음 생성 때 되돌아가고
 *    node scripts/design/gen-yehwa-motifs.mjs --check 가 실패한다.
 *
 * 소비 측이 소유하는 것: 색(잉크 토큰) · 배치 · 애니메이션뿐이다.
 * 획 굵기는 렌더 배율에 묶여 있다 — 실제 획 = w × strokeScale × (렌더폭 / viewBox폭).
 * 그래서 모바일 판은 크롭(배율 ≈0.71) + strokeScale 1.4 로 실제 획을 1px 근처에 붙들어 둔다.
 */

export type YehwaInk = "gold" | "violet" | "ivory";
export type YehwaStroke = { d: string; w: number; a: number; ink?: YehwaInk };
export type YehwaFill = { d: string; a: number; ink: YehwaInk };
export type YehwaScene = {
  viewBox: string;
  strokeScale: number;
  moon: { cx: number; cy: number; r: number; auraR: number } | null;
  halos: { r: number; a: number }[];
  link: { main: string; soft: string } | null;
  branches: YehwaStroke[];
  leaves: YehwaStroke[];
  flowers: YehwaStroke[];
  drifts: YehwaStroke[];
  sparks: YehwaFill[];
};
export type YehwaMotif = { viewBox: string; strokes: YehwaStroke[]; fills: YehwaFill[] };

/** 오클루전 두께 가산분 — 앞선 실루엣을 이 폭으로 검게 그려 뒤 선을 끊는다. */
export const YEHWA_KNOCK = ${SCENE_KNOCK};

export const SUKUYO_SCENE_DESKTOP: YehwaScene = ${scene({
    viewBox: '0 0 900 520',
    strokeScale: 1.6,
    moon: SCENE_MOON,
    halos: SCENE_HALOS,
    link: SCENE_LINK,
    branches: SCENE_BRANCHES,
    leaves: SCENE_LEAVES,
    flowers: SCENE_FLOWERS,
    drifts: SCENE_DRIFTS,
    sparks: SCENE_SPARKS,
  })};

export const SUKUYO_SCENE_MOBILE: YehwaScene = ${scene({
    viewBox: SCENE_MOBILE.viewBox,
    strokeScale: SCENE_MOBILE.strokeScale,
    moon: null,
    halos: [],
    link: null,
    branches: pick(SCENE_BRANCHES, SCENE_MOBILE.branches),
    leaves: pick(SCENE_LEAVES, SCENE_MOBILE.leaves),
    flowers: pick(SCENE_FLOWERS, SCENE_MOBILE.flowers),
    drifts: [],
    sparks: [],
  })};

/** 모바일 히어로 우상단 달 — 씬 크롭 밖으로 밀려난 달을 30px 배지로 되돌린 것. */
export const SUKUYO_MOON_BADGE = { viewBox: "0 0 32 32", cx: 16, cy: 16, r: 7, haloR: 11.5, haloA: 0.4 };

export const SUKUYO_SEAL: YehwaMotif = {
  viewBox: "0 0 160 160",
  strokes: ${rows(SUKUYO_SEAL_STROKES)},
  fills: [],
};

export const SUKUYO_VINE: YehwaMotif = {
  viewBox: "0 0 640 64",
  strokes: ${rows(SUKUYO_VINE_STROKES)},
  fills: [],
};

/** 두 입력 카드 사이의 다리 — 위는 금선, 아래는 보랏빛 선, 가운데 빛망울. */
export const SUKUYO_BRIDGE: YehwaMotif = {
  viewBox: "0 0 30 74",
  strokes: [
    { d: "M15 0V29", w: 1, a: 0.45 },
    { d: "M15 45V74", w: 1, a: 0.55, ink: "violet" },
  ],
  fills: [{ d: ${JSON.stringify(spark(15, 37, 7.2))}, a: 0.95, ink: "violet" }],
};
`;
}

// ── 실행 ────────────────────────────────────────────────────────────────
const OUTPUTS = [
  { out: OUT, css: render() },
  { out: OUT_NAV, css: renderNav() },
  { out: OUT_SUKUYO, css: renderScene() },
];

if (process.argv.includes('--check')) {
  let stale = 0;
  for (const { out, css } of OUTPUTS) {
    const current = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
    if (current === css) continue;
    console.error(`[gen-yehwa-motifs] ${path.relative(ROOT, out)} 가 생성기와 다르다. node scripts/design/gen-yehwa-motifs.mjs 로 다시 만들 것.`);
    stale += 1;
  }
  if (stale) process.exit(1);
  console.log(`[gen-yehwa-motifs] up to date (${OUTPUTS.map((o) => `${path.basename(o.out)} ${o.css.length}`).join(', ')})`);
} else {
  for (const { out, css } of OUTPUTS) {
    fs.writeFileSync(out, css);
    console.log(`[gen-yehwa-motifs] wrote ${path.relative(ROOT, out)} (${css.length} chars)`);
  }
}
