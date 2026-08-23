/**
 * 운명의 꽃 아트 시스템 — 결과 화면의 꽃 그림을 종별로 그린다.
 *
 * 왜 있는가:
 *   카탈로그에는 89종이 각자 색·상징·입자 유형을 갖고 등록돼 있는데, 화면에 나오던 그림은
 *   `_dfBuildFlowerSvgMarkup`(index-inline-runtime.js)이 만드는 **동일한 타원 꽃잎 링 하나**뿐이었다.
 *   점술 소스 4종에 따라 꽃잎 개수와 반지름만 달라졌을 뿐, 종은 전혀 반영되지 않았다.
 *   연꽃이든 라벤더든 석산이든 색만 다른 같은 그림이었다.
 *
 * 무엇을 하는가:
 *   89종을 식물 형태 12계열로 나누고, 계열마다 꽃잎 실루엣을 베지어 `<path>` 로 그린다.
 *   색은 카탈로그의 primary/secondary 를 그대로 쓰고, 종별 시드로 회전·크기·비대칭을 미세하게
 *   흔들어 같은 계열이라도 종마다 다르게 보이게 한다. 같은 종은 항상 같은 그림이다(결정론).
 *
 * 계약:
 *   - 사용자에게 보이는 문자열을 만들지 않는다(그림만). aria-label 은 호출자가 넘긴다.
 *     → i18n 네임스페이스 등록이 필요 없다.
 *   - 출력은 `<svg>` 문자열 하나. 호출자가 data-URI 로 감싼다.
 *   - viewBox 는 320x240 고정 — `#dfStudioImage` 의 aspect-ratio(21/16)와 기존 레이아웃을 유지한다.
 *
 * 색 유틸은 index-inline-runtime.js 의 `_dfMixHex`/`_dfNormalizeHex6` 와 같은 일을 하지만,
 * 그쪽은 인라인 런타임 내부 함수라 모듈에서 가져올 수 없어 여기 최소한만 다시 둔다.
 */

/* ── 색 ──────────────────────────────────────────────────────────────────── */

const HEX6 = /^#?([0-9a-f]{6})$/i;
const HEX3 = /^#?([0-9a-f]{3})$/i;

function normalizeHex(value, fallback) {
  const raw = String(value || '').trim();
  const six = HEX6.exec(raw);
  if (six) return '#' + six[1].toLowerCase();
  const three = HEX3.exec(raw);
  if (three) {
    const [r, g, b] = three[1].toLowerCase().split('');
    return '#' + r + r + g + g + b + b;
  }
  return fallback;
}

function toRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(rgb) {
  return '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

/** a 를 b 쪽으로 t(0~1) 만큼 섞는다. */
function mix(a, b, t) {
  const ca = toRgb(a);
  const cb = toRgb(b);
  return toHex([0, 1, 2].map((i) => ca[i] + (cb[i] - ca[i]) * t));
}

function rgba(hex, alpha) {
  const [r, g, b] = toRgb(hex);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

/* ── 결정론적 난수 ───────────────────────────────────────────────────────── */

/** mulberry32. 같은 시드 → 같은 수열. 종마다 그림이 고정되려면 Math.random 을 쓰면 안 된다. */
function makeRandom(seed) {
  let a = (seed >>> 0) || 1;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 좌표는 소수 1자리까지만 쓴다. 320px 폭에서 0.01px 차이는 보이지 않는데,
 * 이 SVG 는 encodeURIComponent 로 data-URI 에 실려 나가므로 자릿수가 곧 전송 바이트다.
 */
const n2 = (v) => Math.round(v * 10) / 10;

/* ── 89종 → 형태 계열 ────────────────────────────────────────────────────── */

/**
 * 식물 형태는 카탈로그 데이터(색·키워드·입자)에서 유도할 수 없으므로 손으로 적는다.
 * 🔴 새 꽃을 카탈로그에 추가하면 여기에도 넣어야 한다 —
 *    `__tests__/ui/destiny-flower-art.static.test.js` 가 카탈로그를 전수 훑어 미분류를 실패시킨다.
 */
export const FLOWER_FORM_BY_ID = Object.freeze({
  /* 겹꽃 로제트 — 여러 겹이 소용돌이처럼 겹친다 */
  resilient_rose: 'rosette', thorny_rose: 'rosette', black_rose: 'rosette', rose: 'rosette',
  peony_ziwei: 'rosette', peony: 'rosette', camellia: 'rosette', carnation: 'rosette',
  gardenia: 'rosette', ranunculus: 'rosette', begonia: 'rosette', persian_buttercup: 'rosette',

  /* 컵형 — 넓은 꽃잎이 안으로 오므린다 */
  flame_tulip: 'cup', tulip: 'cup', crocus: 'cup', poppy: 'cup',
  anemone: 'cup', water_anemone: 'cup', primrose_unused: 'cup', magnolia: 'cup', moonflower: 'cup',

  /* 두상화 — 가는 설상화가 원반을 두른다 */
  sunflower: 'daisy', sunflower_ziwei: 'daisy', wild_chrysanthemum: 'daisy', daisy: 'daisy',
  cosmos: 'daisy', marigold: 'daisy', dahlia: 'daisy', aster: 'daisy',
  chrysanthemum_gold: 'daisy', cornflower: 'daisy',

  /* 백합형 — 6장의 뒤로 젖혀진 화피 + 긴 수술 */
  lily: 'lily', tiger_lily: 'lily', moon_lily: 'lily',

  /* 나팔형 — 통꽃이 벌어진다 */
  orange_trumpet: 'trumpet', hibiscus: 'trumpet', azalea: 'trumpet',
  honeysuckle: 'trumpet', morning_glory: 'trumpet', mugunghwa: 'trumpet',

  /* 종형 — 아래를 향해 매달린다 */
  bluebell: 'bell', foxglove: 'bell', bellflower: 'bell', gentian: 'bell',

  /* 별형 — 납작하게 펼쳐진 5~6장 */
  narcissus: 'star', water_narcissus: 'star', moon_narcissus: 'star', winter_plum: 'star',
  plum_blossom: 'star', cherry_blossom: 'star', jasmine: 'star', edelweiss: 'star',
  primrose: 'star', nemophila: 'star',

  /* 난형 — 좌우대칭, 순판(입술꽃잎)이 있다 */
  orchid: 'orchid', orchid_tanlang: 'orchid', bird_of_paradise: 'orchid', iris: 'orchid',
  blue_iris: 'orchid', snapdragon: 'orchid', violet: 'orchid', sweet_pea: 'orchid',

  /* 수련형 — 수면 위에 겹겹이 눕는다 */
  lotus: 'waterlily', lotus_pink: 'waterlily', lotus_white: 'waterlily', lotus_golden: 'waterlily',
  blue_lotus: 'waterlily', water_lily: 'waterlily',

  /* 이삭·총상 — 줄기를 따라 작은 꽃이 이어진다 */
  lavender: 'spike', astro_lavender: 'spike', wisteria: 'spike', violet_wisteria: 'spike',
  delphinium: 'spike', larkspur: 'spike', freesia: 'spike',

  /* 산방·산형 — 작은 꽃이 뭉쳐 돔을 이룬다 */
  hydrangea: 'cluster', white_baby_breath: 'cluster', yarrow: 'cluster', queen_anne_lace: 'cluster',
  geranium: 'cluster', heliotrope: 'cluster', forsythia: 'cluster', ivy_bloom: 'cluster',
  delicate_willow: 'cluster',

  /* 실꽃 — 가늘고 길게 뒤로 말린다 */
  red_spider_lily: 'spider', red_lycoris: 'spider', night_cereus: 'spider',
  cactus_flower: 'spider', passionflower: 'spider', glacier_bloom: 'spider',
});

export const FLOWER_FORMS = Object.freeze([
  'rosette', 'cup', 'daisy', 'lily', 'trumpet', 'bell',
  'star', 'orchid', 'waterlily', 'spike', 'cluster', 'spider',
]);

const DEFAULT_FORM = 'star';

export function resolveFlowerForm(flowerId) {
  const key = String(flowerId || '').trim();
  return FLOWER_FORM_BY_ID[key] || DEFAULT_FORM;
}

/* ── 꽃잎 실루엣 ─────────────────────────────────────────────────────────── */
/* 모두 원점(0,0)에서 위(-y)로 자라는 로컬 좌표. 회전은 호출부가 transform 으로 준다. */

/** 끝이 둥근 기본 꽃잎. bulge 로 어깨 폭 위치를 옮긴다. */
function roundPetal(len, wid, bulge) {
  const b = bulge == null ? 0.42 : bulge;
  return 'M0 0'
    + 'C' + n2(-wid) + ' ' + n2(-len * b) + ',' + n2(-wid * 0.86) + ' ' + n2(-len * 0.88) + ',0 ' + n2(-len)
    + 'C' + n2(wid * 0.86) + ' ' + n2(-len * 0.88) + ',' + n2(wid) + ' ' + n2(-len * b) + ',0 0Z';
}

/** 끝이 뾰족한 꽃잎. */
function pointedPetal(len, wid) {
  return 'M0 0'
    + 'C' + n2(-wid) + ' ' + n2(-len * 0.34) + ',' + n2(-wid * 0.52) + ' ' + n2(-len * 0.78) + ',0 ' + n2(-len)
    + 'C' + n2(wid * 0.52) + ' ' + n2(-len * 0.78) + ',' + n2(wid) + ' ' + n2(-len * 0.34) + ',0 0Z';
}

/** 끝이 살짝 파인 꽃잎(장미·모란 계열). */
function notchedPetal(len, wid) {
  const tip = len * 0.12;
  return 'M0 0'
    + 'C' + n2(-wid) + ' ' + n2(-len * 0.4) + ',' + n2(-wid * 0.95) + ' ' + n2(-len * 0.9) + ',' + n2(-wid * 0.3) + ' ' + n2(-len)
    + 'Q0 ' + n2(-len + tip) + ',' + n2(wid * 0.3) + ' ' + n2(-len)
    + 'C' + n2(wid * 0.95) + ' ' + n2(-len * 0.9) + ',' + n2(wid) + ' ' + n2(-len * 0.4) + ',0 0Z';
}

/** 가늘고 평행한 설상화(국화·데이지). */
function strapPetal(len, wid) {
  return 'M' + n2(-wid) + ' ' + n2(-len * 0.18)
    + 'C' + n2(-wid * 1.05) + ' ' + n2(-len * 0.72) + ',' + n2(-wid * 0.85) + ' ' + n2(-len) + ',0 ' + n2(-len)
    + 'C' + n2(wid * 0.85) + ' ' + n2(-len) + ',' + n2(wid * 1.05) + ' ' + n2(-len * 0.72) + ',' + n2(wid) + ' ' + n2(-len * 0.18)
    + 'Q0 ' + n2(-len * 0.04) + ',' + n2(-wid) + ' ' + n2(-len * 0.18) + 'Z';
}

/** 뒤로 젖혀진 백합 화피. */
function recurvedPetal(len, wid) {
  return 'M0 0'
    + 'C' + n2(-wid * 1.15) + ' ' + n2(-len * 0.42) + ',' + n2(-wid * 1.5) + ' ' + n2(-len * 0.94) + ',' + n2(-wid * 0.42) + ' ' + n2(-len * 1.04)
    + 'C' + n2(-wid * 0.1) + ' ' + n2(-len * 0.92) + ',' + n2(wid * 0.1) + ' ' + n2(-len * 0.92) + ',' + n2(wid * 0.42) + ' ' + n2(-len * 1.04)
    + 'C' + n2(wid * 1.5) + ' ' + n2(-len * 0.94) + ',' + n2(wid * 1.15) + ' ' + n2(-len * 0.42) + ',0 0Z';
}

/** 실처럼 가늘고 끝이 말리는 화피(석산·시계꽃). */
function filamentPetal(len, wid, curl) {
  const c = curl == null ? 0.5 : curl;
  return 'M0 0'
    + 'C' + n2(-wid * 2.2) + ' ' + n2(-len * 0.4) + ',' + n2(-wid * 3.4) + ' ' + n2(-len * 0.86) + ',' + n2(-wid * 6 * c) + ' ' + n2(-len)
    + 'C' + n2(-wid * 1.4) + ' ' + n2(-len * 0.9) + ',' + n2(wid * 0.6) + ' ' + n2(-len * 0.5) + ',0 0Z';
}

/* ── 공통 조각 ───────────────────────────────────────────────────────────── */

const CX = 160;
const CY = 132;

/**
 * 꽃잎 한 겹. 색·투명도·원점 이동을 바깥 <g> 로 한 번만 쓰고 각 꽃잎은 회전만 갖는다.
 * (꽃잎마다 fill 과 `rotate(a 160 132) translate(160 132)` 를 반복하면 data-URI 가 두 배로 는다)
 */
function ring(pathId, count, radiusScale, tilt, fill, opacity, spin) {
  const scale = (radiusScale !== 1 || tilt !== 1) ? ' scale(' + n2(radiusScale) + ' ' + n2(tilt) + ')' : '';
  let out = '<g fill="' + fill + '"' + (opacity < 1 ? ' opacity="' + opacity + '"' : '')
    + ' transform="translate(' + CX + ' ' + CY + ')">';
  for (let i = 0; i < count; i += 1) {
    out += '<use href="#' + pathId + '" transform="rotate(' + n2((360 / count) * i + spin) + ')' + scale + '"/>';
  }
  return out + '</g>';
}

function stamens(count, len, tone, tipTone, random) {
  let filaments = '';
  let anthers = '';
  for (let i = 0; i < count; i += 1) {
    const a = ((360 / count) * i + random() * 12 - 6) * (Math.PI / 180);
    const l = len * (0.72 + random() * 0.42);
    const x = n2(CX + Math.sin(a) * l);
    const y = n2(CY - Math.cos(a) * l);
    filaments += 'M' + CX + ' ' + CY + 'Q' + n2(CX + Math.sin(a) * l * 0.5) + ' ' + n2(CY - Math.cos(a) * l * 0.72) + ',' + x + ' ' + y;
    anthers += '<circle cx="' + x + '" cy="' + y + '" r="' + n2(1.5 + random() * 0.9) + '"/>';
  }
  /* 수술대는 path 하나에 subpath 로 몰고, 꽃밥은 <g fill> 로 묶는다. */
  return '<path d="' + filaments + '" stroke="' + tone + '" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".72"/>'
    + '<g fill="' + tipTone + '">' + anthers + '</g>';
}

function stem(fromY, toY, tone, bend) {
  const b = bend || 0;
  return '<path d="M' + CX + ' ' + fromY + 'Q' + n2(CX + b) + ' ' + n2((fromY + toY) / 2) + ',' + n2(CX + b * 0.4) + ' ' + toY
    + '" stroke="' + tone + '" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.55"/>';
}

function leafPair(y, tone, spread) {
  const s = spread || 34;
  return '<path d="M' + CX + ' ' + y + 'C' + n2(CX - s) + ' ' + n2(y - 6) + ',' + n2(CX - s * 1.2) + ' ' + n2(y + 14) + ',' + n2(CX - s * 0.3) + ' ' + n2(y + 20)
    + 'C' + n2(CX - s * 0.2) + ' ' + n2(y + 8) + ',' + n2(CX - s * 0.1) + ' ' + n2(y + 2) + ',' + CX + ' ' + y + 'Z" fill="' + tone + '" opacity="0.5"/>'
    + '<path d="M' + CX + ' ' + y + 'C' + n2(CX + s) + ' ' + n2(y - 6) + ',' + n2(CX + s * 1.2) + ' ' + n2(y + 14) + ',' + n2(CX + s * 0.3) + ' ' + n2(y + 20)
    + 'C' + n2(CX + s * 0.2) + ' ' + n2(y + 8) + ',' + n2(CX + s * 0.1) + ' ' + n2(y + 2) + ',' + CX + ' ' + y + 'Z" fill="' + tone + '" opacity="0.5"/>';
}

/* ── 12계열 렌더러 ───────────────────────────────────────────────────────── */
/* 각 렌더러는 { defs, body } 를 돌려준다. defs 에는 <path id> 정의만 넣는다. */

const FORM_RENDERERS = {
  rosette(c) {
    const { random, front, back, deep, pale, leaf } = c;
    const petals = 7 + Math.floor(random() * 2);
    return {
      defs: '<path id="pA" d="' + notchedPetal(62, 27) + '"/>'
        + '<path id="pB" d="' + notchedPetal(46, 22) + '"/>'
        + '<path id="pC" d="' + notchedPetal(30, 17) + '"/>',
      body: stem(CY + 46, 224, leaf, 6) + leafPair(196, leaf, 30)
        + ring('pA', petals, 1, 1, back, 1, 8)
        + ring('pA', petals, 0.86, 0.92, mix(front, deep, 0.18), 1, 8 + 180 / petals)
        + ring('pB', petals, 1, 1, front, 1, 8 + 360 / petals / 2)
        + ring('pC', petals - 1, 1, 1, mix(front, pale, 0.3), 1, 24)
        + '<circle cx="' + CX + '" cy="' + CY + '" r="9" fill="' + mix(front, deep, 0.4) + '"/>'
        + '<path d="M' + (CX - 7) + ' ' + CY + 'Q' + CX + ' ' + (CY - 11) + ',' + (CX + 7) + ' ' + CY
        + 'Q' + CX + ' ' + (CY + 6) + ',' + (CX - 7) + ' ' + CY + 'Z" fill="' + pale + '" opacity="0.75"/>',
    };
  },

  cup(c) {
    const { random, front, back, deep, pale, leaf } = c;
    const petals = 6;
    return {
      defs: '<path id="pA" d="' + roundPetal(78, 33, 0.56) + '"/>'
        + '<path id="pB" d="' + roundPetal(64, 26, 0.6) + '"/>',
      body: stem(CY + 58, 228, leaf, -5) + leafPair(198, leaf, 26)
        + ring('pA', petals, 1, 1, back, 0.92, 30)
        + ring('pB', petals, 1, 1, front, 1, 0)
        + ring('pB', 3, 0.7, 0.78, mix(front, pale, 0.34), 0.9, 60 + random() * 10)
        + '<ellipse cx="' + CX + '" cy="' + (CY - 6) + '" rx="10" ry="7" fill="' + mix(deep, front, 0.35) + '" opacity="0.85"/>'
        + stamens(5, 22, mix(deep, pale, 0.4), pale, random),
    };
  },

  daisy(c) {
    const { random, front, back, deep, pale, leaf } = c;
    const petals = 20 + Math.floor(random() * 5);
    /* 원반의 관상화 배치 — 황금각 나선. 색이 둘뿐이라 <g> 두 개로 묶어 fill 반복을 없앤다. */
    let dotsA = '';
    let dotsB = '';
    for (let i = 0; i < 34; i += 1) {
      const a = i * 2.399963;
      const r = 3.2 * Math.sqrt(i);
      const dot = '<circle cx="' + n2(CX + Math.cos(a) * r) + '" cy="' + n2(CY + Math.sin(a) * r) + '" r="1.5"/>';
      if (i % 3 === 0) dotsA += dot; else dotsB += dot;
    }
    const discDots = '<g opacity=".72"><g fill="' + pale + '">' + dotsA + '</g>'
      + '<g fill="' + mix(deep, pale, 0.25) + '">' + dotsB + '</g></g>';
    return {
      defs: '<path id="pA" d="' + strapPetal(76, 9) + '"/>'
        + '<path id="pB" d="' + strapPetal(58, 7) + '"/>',
      body: stem(CY + 40, 230, leaf, 4) + leafPair(200, leaf, 24)
        + ring('pA', petals, 1, 1, back, 0.9, 360 / petals / 2)
        + ring('pB', petals, 1, 1, front, 1, 0)
        + '<circle cx="' + CX + '" cy="' + CY + '" r="21" fill="' + mix(deep, front, 0.3) + '"/>'
        + discDots,
    };
  },

  lily(c) {
    const { random, front, back, deep, pale, leaf } = c;
    let freckles = '';
    for (let i = 0; i < 22; i += 1) {
      const a = random() * Math.PI * 2;
      const r = 12 + random() * 30;
      freckles += '<ellipse cx="' + n2(CX + Math.cos(a) * r) + '" cy="' + n2(CY + Math.sin(a) * r * 0.8)
        + '" rx="1.8" ry="2.6" fill="' + deep + '" opacity="0.5"/>';
    }
    return {
      defs: '<path id="pA" d="' + recurvedPetal(74, 20) + '"/>',
      body: stem(CY + 52, 230, leaf, -4)
        + '<path d="M' + (CX - 4) + ' 196C' + (CX - 46) + ' 188,' + (CX - 54) + ' 168,' + (CX - 40) + ' 158" stroke="' + leaf + '" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.45"/>'
        + '<path d="M' + (CX + 4) + ' 206C' + (CX + 48) + ' 200,' + (CX + 56) + ' 180,' + (CX + 42) + ' 170" stroke="' + leaf + '" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.45"/>'
        + ring('pA', 6, 1, 1, back, 0.94, 30)
        + ring('pA', 6, 0.9, 0.9, front, 1, 0)
        + freckles
        + stamens(6, 46, mix(deep, front, 0.5), mix(deep, '#3b2412', 0.4), random)
        + '<circle cx="' + CX + '" cy="' + CY + '" r="6" fill="' + mix(front, pale, 0.5) + '"/>',
    };
  },

  trumpet(c) {
    const { random, front, back, deep, pale, leaf } = c;
    const lobes = 5;
    return {
      defs: '<path id="pA" d="' + roundPetal(70, 40, 0.66) + '"/>',
      body: stem(CY + 50, 228, leaf, 7) + leafPair(198, leaf, 30)
        + ring('pA', lobes, 1, 1, back, 0.9, 36)
        + ring('pA', lobes, 0.94, 0.94, front, 1, 0)
        + '<circle cx="' + CX + '" cy="' + CY + '" r="26" fill="url(#throat)"/>'
        + '<circle cx="' + CX + '" cy="' + CY + '" r="13" fill="' + mix(deep, '#241018', 0.45) + '" opacity="0.9"/>'
        + stamens(5, 34, mix(pale, front, 0.35), pale, random)
        + '<path d="M' + CX + ' ' + CY + 'L' + CX + ' ' + (CY - 44) + '" stroke="' + pale + '" stroke-width="1.6" opacity="0.6" stroke-linecap="round"/>'
        + '<circle cx="' + CX + '" cy="' + (CY - 46) + '" r="3.4" fill="' + pale + '"/>',
    };
  },

  bell(c) {
    const { random, front, back, deep, pale, leaf } = c;
    /* 종 하나를 <g> 로 정의하고 <use> 로 반복한다. 내부 path 에 fill 을 주지 않으면
       <use> 의 fill 을 상속하므로, 같은 모양을 색만 바꿔 재사용할 수 있다. */
    const rows = [
      [CX, CY + 6, 1], [CX - 34, CY - 16, 0.78], [CX + 33, CY - 10, 0.82],
      [CX - 18, CY + 44, 0.66], [CX + 22, CY + 40, 0.7],
    ];
    const tone2 = mix(front, back, 0.4);
    const bells = rows.map((b, i) => '<use href="#bl" fill="' + (i % 2 === 0 ? front : tone2)
      + '" transform="translate(' + b[0] + ' ' + b[1] + ') scale(' + b[2] + ')"/>').join('');
    return {
      defs: '<g id="bl">'
        + '<path d="M0 -46C-3 -30,-22 -22,-22 4C-22 24,-12 36,0 36C12 36,22 24,22 4C22 -22,3 -30,0 -46Z"/>'
        + '<path d="M-22 4C-16 16,-8 22,0 22C8 22,16 16,22 4C20 26,11 38,0 38C-11 38,-20 26,-22 4Z" fill="' + rgba(deep, 0.42) + '"/>'
        + '<path d="M-19 20Q-10 34,0 34Q10 34,19 20" stroke="' + pale + '" stroke-width="1.4" fill="none" opacity="0.55"/>'
        + '<circle cx="0" cy="-46" r="2.6" fill="' + leaf + '" opacity="0.8"/>'
        + '</g>',
      body: '<path d="M' + CX + ' 232C' + (CX - 10) + ' 170,' + (CX + 6) + ' 130,' + CX + ' ' + (CY - 58)
        + '" stroke="' + leaf + '" stroke-width="3.4" fill="none" stroke-linecap="round" opacity="0.6"/>'
        + leafPair(206, leaf, 26) + bells
        + '<circle cx="' + CX + '" cy="' + (CY - 60) + '" r="3" fill="' + mix(leaf, pale, 0.4) + '" opacity="' + n2(0.6 + random() * 0.2) + '"/>',
    };
  },

  star(c) {
    const { random, front, back, deep, pale, leaf } = c;
    const petals = 5 + Math.floor(random() * 2);
    return {
      defs: '<path id="pA" d="' + roundPetal(70, 30, 0.5) + '"/>'
        + '<path id="pB" d="' + roundPetal(50, 22, 0.5) + '"/>',
      body: stem(CY + 44, 228, leaf, -6) + leafPair(198, leaf, 28)
        + ring('pA', petals, 1, 1, back, 0.88, 360 / petals / 2)
        + ring('pA', petals, 0.96, 0.96, front, 1, 0)
        + ring('pB', petals, 1, 1, mix(front, pale, 0.42), 0.55, 0)
        + '<circle cx="' + CX + '" cy="' + CY + '" r="14" fill="' + mix(deep, front, 0.28) + '"/>'
        + '<circle cx="' + CX + '" cy="' + CY + '" r="8" fill="' + mix(pale, front, 0.25) + '" opacity="0.9"/>'
        + stamens(6, 13, mix(deep, pale, 0.5), pale, random),
    };
  },

  orchid(c) {
    const { random, front, back, deep, pale, leaf } = c;
    let spots = '';
    for (let i = 0; i < 12; i += 1) {
      spots += '<ellipse cx="' + n2(CX - 12 + random() * 24) + '" cy="' + n2(CY + 22 + random() * 26)
        + '" rx="' + n2(1.4 + random()) + '" ry="' + n2(2 + random()) + '" fill="' + deep + '" opacity="0.55"/>';
    }
    return {
      defs: '<path id="pA" d="' + pointedPetal(64, 19) + '"/>'
        + '<path id="pB" d="' + roundPetal(50, 30, 0.48) + '"/>',
      body: stem(CY + 62, 230, leaf, 9)
        + '<path d="M' + (CX - 2) + ' 214C' + (CX - 52) + ' 206,' + (CX - 60) + ' 178,' + (CX - 42) + ' 168" stroke="' + leaf + '" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.42"/>'
        /* 위 3장 — 꽃받침 */
        + '<use href="#pA" fill="' + back + '" transform="rotate(0 ' + CX + ' ' + CY + ') translate(' + CX + ' ' + CY + ')"/>'
        + '<use href="#pA" fill="' + back + '" transform="rotate(-64 ' + CX + ' ' + CY + ') translate(' + CX + ' ' + CY + ')"/>'
        + '<use href="#pA" fill="' + back + '" transform="rotate(64 ' + CX + ' ' + CY + ') translate(' + CX + ' ' + CY + ')"/>'
        /* 곁꽃잎 2장 */
        + '<use href="#pB" fill="' + front + '" transform="rotate(-108 ' + CX + ' ' + CY + ') translate(' + CX + ' ' + CY + ')"/>'
        + '<use href="#pB" fill="' + front + '" transform="rotate(108 ' + CX + ' ' + CY + ') translate(' + CX + ' ' + CY + ')"/>'
        /* 순판 */
        + '<path d="M' + CX + ' ' + (CY + 6) + 'C' + (CX - 30) + ' ' + (CY + 16) + ',' + (CX - 34) + ' ' + (CY + 54) + ',' + (CX - 10) + ' ' + (CY + 62)
        + 'Q' + CX + ' ' + (CY + 70) + ',' + (CX + 10) + ' ' + (CY + 62)
        + 'C' + (CX + 34) + ' ' + (CY + 54) + ',' + (CX + 30) + ' ' + (CY + 16) + ',' + CX + ' ' + (CY + 6) + 'Z" fill="' + mix(front, pale, 0.3) + '"/>'
        + spots
        + '<path d="M' + (CX - 9) + ' ' + (CY + 2) + 'Q' + CX + ' ' + (CY - 12) + ',' + (CX + 9) + ' ' + (CY + 2)
        + 'Q' + CX + ' ' + (CY + 14) + ',' + (CX - 9) + ' ' + (CY + 2) + 'Z" fill="' + mix(deep, pale, 0.3) + '"/>',
    };
  },

  waterlily(c) {
    const { random, front, back, deep, pale, leaf } = c;
    const outer = 14;
    return {
      defs: '<path id="pA" d="' + pointedPetal(72, 17) + '"/>'
        + '<path id="pB" d="' + pointedPetal(54, 15) + '"/>'
        + '<path id="pC" d="' + pointedPetal(36, 13) + '"/>',
      /* 수면 + 잎 */
      body: '<ellipse cx="' + CX + '" cy="206" rx="132" ry="17" fill="' + rgba(back, 0.3) + '"/>'
        + '<path d="M52 196A44 30 0 1 1 138 196Z" fill="' + leaf + '" opacity="0.5"/>'
        + '<path d="M188 202A40 27 0 1 1 262 202Z" fill="' + leaf + '" opacity="0.42"/>'
        + ring('pA', outer, 1, 1, back, 0.92, 360 / outer / 2)
        + ring('pB', outer - 3, 1, 1, front, 1, 0)
        + ring('pC', 8, 1, 1, mix(front, pale, 0.4), 1, 22)
        + '<circle cx="' + CX + '" cy="' + CY + '" r="14" fill="' + mix(deep, front, 0.25) + '"/>'
        + stamens(16, 15, mix(pale, front, 0.2), pale, random)
        + '<circle cx="' + CX + '" cy="' + CY + '" r="6" fill="' + pale + '" opacity="0.9"/>',
    };
  },

  spike(c) {
    const { random, front, back, deep, pale, leaf } = c;
    /* 수상꽃차례는 축이 하나다. 좌우로 벌리면 A자 두 갈래로 보여 이삭이 아니게 된다 —
       작은 꽃을 축 가까이 번갈아 붙이고 위로 갈수록 좁고 촘촘하게 만든다. */
    let florets = '';
    const rows = 13;
    const tone2 = mix(front, back, 0.42);
    for (let r = 0; r < rows; r += 1) {
      const t = r / (rows - 1);
      const y = CY - 74 + r * 12.5;
      const dir = r % 2 === 0 ? -1 : 1;
      const x = CX + dir * (2 + t * 7) + (random() * 2.4 - 1.2);
      const s = 0.4 + t * 0.55;
      /* 축에서 바깥으로 젖혀 달아야 이삭으로 읽힌다 — 정면으로만 두면 구슬을 꿴 것처럼 보인다. */
      florets += '<use href="#fs" fill="' + (r % 3 === 0 ? tone2 : front)
        + '" transform="translate(' + n2(x) + ' ' + n2(y) + ') rotate(' + n2(dir * (18 + t * 22))
        + ') scale(' + n2(s) + ')"/>';
    }
    return {
      /* 입술꽃 한 송이 — 위 입술이 젖혀지고 아래 입술이 벌어진다(라벤더·델피니움 계열). */
      defs: '<g id="fs">'
        + '<path d="M0 0C-13 -3,-19 -15,-11 -24C-5 -30,3 -30,9 -24C11 -21,11 -17,9 -14C15 -15,18 -9,13 -4C8 1,3 1,0 0Z"/>'
        + '<path d="M-2 -6C-8 -9,-11 -16,-7 -20" stroke="' + rgba(pale, 0.6) + '" stroke-width="1.6" fill="none"/>'
        + '</g>',
      body: '<path d="M' + CX + ' 234C' + (CX - 6) + ' 190,' + (CX + 4) + ' 160,' + CX + ' ' + (CY - 72)
        + '" stroke="' + leaf + '" stroke-width="3.2" fill="none" stroke-linecap="round" opacity="0.62"/>'
        + '<path d="M' + (CX - 3) + ' 214C' + (CX - 40) + ' 208,' + (CX - 46) + ' 186,' + (CX - 34) + ' 176" stroke="' + leaf + '" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.4"/>'
        + '<path d="M' + (CX + 3) + ' 220C' + (CX + 42) + ' 214,' + (CX + 48) + ' 192,' + (CX + 36) + ' 182" stroke="' + leaf + '" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.4"/>'
        + florets
        + '<circle cx="' + CX + '" cy="' + (CY - 74) + '" r="3.2" fill="' + mix(deep, pale, 0.45) + '" opacity="0.85"/>',
    };
  },

  cluster(c) {
    const { random, front, back, deep, pale, leaf } = c;
    let florets = '';
    const tones = [mix(front, pale, 0.32), front, mix(front, back, 0.45)];
    for (let i = 0; i < 26; i += 1) {
      const a = random() * Math.PI * 2;
      const rr = Math.sqrt(random());
      const x = CX + Math.cos(a) * rr * 74;
      const y = CY + Math.sin(a) * rr * 46;
      const s = 0.52 + random() * 0.5;
      florets += '<use href="#fc" fill="' + tones[i % 3]
        + '" transform="translate(' + n2(x) + ' ' + n2(y) + ') scale(' + n2(s) + ')"/>';
    }
    return {
      defs: '<g id="fc">'
        + '<ellipse cx="0" cy="-8" rx="5.4" ry="8"/>'
        + '<ellipse cx="0" cy="-8" rx="5.4" ry="8" transform="rotate(90)"/>'
        + '<ellipse cx="0" cy="-8" rx="5.4" ry="8" transform="rotate(180)"/>'
        + '<ellipse cx="0" cy="-8" rx="5.4" ry="8" transform="rotate(270)"/>'
        + '<circle r="2.6" fill="' + mix(deep, pale, 0.5) + '"/>'
        + '</g>',
      body: stem(CY + 48, 232, leaf, 5)
        + '<path d="M' + (CX - 2) + ' 206C' + (CX - 50) + ' 200,' + (CX - 58) + ' 176,' + (CX - 40) + ' 166" stroke="' + leaf + '" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.44"/>'
        + '<path d="M' + (CX + 2) + ' 212C' + (CX + 52) + ' 206,' + (CX + 60) + ' 182,' + (CX + 42) + ' 172" stroke="' + leaf + '" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.44"/>'
        /* 뒤에 밝은 타원을 깔면 꽃 뭉치가 접시 위에 놓인 것처럼 보인다 — 깔지 않는다. */
        + florets,
    };
  },

  spider(c) {
    const { random, front, back, deep, pale, leaf } = c;
    const arms = 7;
    let curls = '';
    for (let i = 0; i < arms; i += 1) {
      const a = (360 / arms) * i;
      const dir = i % 2 === 0 ? 1 : -1;
      curls += '<use href="#pA" fill="' + (i % 2 === 0 ? front : back) + '" transform="rotate(' + n2(a) + ' ' + CX + ' ' + CY + ') translate(' + CX + ' ' + CY + ') scale(' + dir + ' 1)"/>';
    }
    return {
      defs: '<path id="pA" d="' + filamentPetal(84, 7, 0.9) + '"/>',
      body: stem(CY + 52, 234, leaf, -8)
        + curls
        + stamens(arms, 70, mix(front, pale, 0.4), pale, random)
        + '<circle cx="' + CX + '" cy="' + CY + '" r="11" fill="' + mix(deep, front, 0.3) + '"/>'
        + '<circle cx="' + CX + '" cy="' + CY + '" r="5" fill="' + pale + '" opacity="0.85"/>',
    };
  },
};

/* ── 입자 (particle_type 25종 → 4가지 표현) ─────────────────────────────── */

const PARTICLE_STYLE = {
  starlight: 'star', stardust_ember: 'star', stardust_moss: 'star', stardust_air: 'star',
  stardust_water: 'star', lunar_mist: 'mist', mist_orb: 'mist', mist_spark: 'mist',
  willow_mist: 'mist', clarity_ring: 'mist', indigo_trace: 'mist',
  water_droplet: 'drop', cascade_thread: 'drop', lunar_pollen: 'dot', pollen_glow: 'dot',
  solar_pollen: 'dot', dust_mote: 'dot', orchid_perfume: 'dot',
  ember_spark: 'ember', thorn_spark: 'ember', sun_ribbon: 'ember',
  metal_shard: 'shard', thorn_shard: 'shard', obsidian_petal: 'shard', imperial_petal: 'shard',
};

/** 입자 하나의 원형(원점 기준, 반경 1). <use> 로 위치·크기·투명도만 바꿔 반복한다. */
const PARTICLE_SHAPE = {
  star: '<path id="pt" d="M0 -1L.3 -.3L1 0L.3 .3L0 1L-.3 .3L-1 0L-.3 -.3Z"/>',
  drop: '<path id="pt" d="M0 -1.7C1 -.2,1 1,0 1C-1 1,-1 -.2,0 -1.7Z"/>',
  ember: '<ellipse id="pt" rx=".38" ry="1"/>',
  shard: '<path id="pt" d="M0 -1L.6 0L0 1L-.6 0Z"/>',
  mist: '<circle id="pt" r="1"/>',
  dot: '<circle id="pt" r="1"/>',
};

function particles(kind, tone, pale, random) {
  const style = PARTICLE_STYLE[kind] || 'dot';
  const isMist = style === 'mist';
  const count = isMist ? 7 : 16;
  /* 안개를 단색 원으로 칠하면 경계가 살아 얼룩처럼 보인다. 가장자리가 사라지는
     그라디언트로 채워야 안개가 된다(SVG 필터는 모바일에서 비싸므로 쓰지 않는다). */
  const fill = isMist ? 'url(#mistg)' : pale;
  let out = '<g fill="' + fill + '">';
  for (let i = 0; i < count; i += 1) {
    const x = n2(16 + random() * 288);
    const y = n2(14 + random() * 200);
    let o = n2(0.18 + random() * 0.42);
    let r;
    if (isMist) { r = n2(12 + random() * 20); o = n2(o * 0.34); }
    else if (style === 'star') r = n2(2.2 + random() * 2.4);
    else if (style === 'drop') r = n2(2 + random() * 2);
    else if (style === 'ember') r = n2(3 + random() * 3);
    else if (style === 'shard') r = n2(2.4 + random() * 2.6);
    else r = n2(1.2 + random() * 1.8);
    out += '<use href="#pt" opacity="' + o + '" transform="translate(' + x + ' ' + y + ') scale(' + r + ')"/>';
  }
  return out + '</g>';
}

/* ── 소스별 배경 장식 ────────────────────────────────────────────────────── */

function sourceScenery(source, pale, deep, random) {
  if (source === 'astrology') {
    let stars = '';
    for (let i = 0; i < 5; i += 1) {
      const x = n2(24 + random() * 272);
      const y = n2(18 + random() * 60);
      stars += '<circle cx="' + x + '" cy="' + y + '" r="' + n2(1 + random() * 1.6) + '" fill="' + pale + '" opacity="0.7"/>';
    }
    return '<circle cx="160" cy="120" r="104" fill="none" stroke="' + rgba(pale, 0.18) + '" stroke-width="1.2"/>'
      + '<circle cx="160" cy="120" r="82" fill="none" stroke="' + rgba(pale, 0.12) + '" stroke-width="1"/>' + stars;
  }
  if (source === 'jamidusu') {
    return '<circle cx="160" cy="124" r="98" fill="none" stroke="' + rgba(pale, 0.16) + '" stroke-width="1.4" stroke-dasharray="5 9"/>'
      + '<path d="M40 40L64 26L90 40L118 24L146 40" fill="none" stroke="' + rgba(pale, 0.28) + '" stroke-width="1.4" stroke-linecap="round"/>'
      + '<path d="M176 34L204 20L232 34L258 22L284 34" fill="none" stroke="' + rgba(pale, 0.22) + '" stroke-width="1.4" stroke-linecap="round"/>';
  }
  if (source === 'sukuyo') {
    return '<circle cx="252" cy="52" r="27" fill="' + rgba(pale, 0.42) + '"/>'
      + '<circle cx="263" cy="47" r="24" fill="' + rgba(deep, 0.92) + '"/>'
      + '<circle cx="160" cy="126" r="106" fill="none" stroke="' + rgba(pale, 0.14) + '" stroke-width="1.2"/>';
  }
  return '<path d="M0 214Q80 198,160 210T320 202V240H0Z" fill="' + rgba(deep, 0.3) + '"/>';
}

/* ── 조립 ────────────────────────────────────────────────────────────────── */

/**
 * @param {object} input
 * @param {string} input.flowerId      카탈로그 id (형태 계열 결정)
 * @param {string} input.source        saju | astrology | jamidusu | sukuyo (배경 장식)
 * @param {string} input.primaryHex
 * @param {string} input.secondaryHex
 * @param {number} input.seed          같은 종 → 같은 그림
 * @param {string} input.particleType  카탈로그 particle_type
 * @param {string} input.label         aria-label (호출자가 번역 책임)
 * @returns {string} `<svg>` 마크업
 */
export function buildFlowerSvg(input) {
  const opts = input || {};
  const primary = normalizeHex(opts.primaryHex, '#f472b6');
  const secondary = normalizeHex(opts.secondaryHex, '#22d3ee');
  const seed = Number.isFinite(opts.seed) ? opts.seed : 1;
  const random = makeRandom(seed);
  const form = resolveFlowerForm(opts.flowerId);
  const source = String(opts.source || 'saju');

  const front = primary;
  const back = mix(secondary, primary, 0.45);
  const deep = mix(primary, '#150a1e', 0.42);
  const pale = mix(secondary, '#ffffff', 0.6);
  const leaf = mix(mix(secondary, '#2f6b4f', 0.55), '#0f2418', 0.2);
  /* 배경은 꽃 색조를 따라가되 밤 톤으로 강하게 눌러야 한다.
     안 그러면 초록 꽃(아이비)이 초록 배경에 묻혀 형태가 아예 안 보인다. */
  const skyTop = mix(deep, '#06040d', 0.62);
  const skyMid = mix(back, '#0b0716', 0.7);

  const rendered = FORM_RENDERERS[form](
    { random, front, back, deep, pale, leaf, source },
  );

  const label = String(opts.label || '').replace(/[<>&"']/g, '');

  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="320" height="240" role="img" aria-label="' + label + '">'
    + '<defs>'
    + '<radialGradient id="sky" cx="50%" cy="44%" r="72%">'
    + '<stop offset="0%" stop-color="' + mix(skyMid, front, 0.14) + '"/>'
    + '<stop offset="62%" stop-color="' + skyMid + '"/>'
    + '<stop offset="100%" stop-color="' + skyTop + '"/>'
    + '</radialGradient>'
    + '<radialGradient id="halo" cx="50%" cy="52%" r="50%">'
    + '<stop offset="0%" stop-color="' + rgba(pale, 0.24) + '"/>'
    + '<stop offset="100%" stop-color="' + rgba(pale, 0) + '"/>'
    + '</radialGradient>'
    + '<radialGradient id="throat" cx="50%" cy="50%" r="50%">'
    + '<stop offset="0%" stop-color="' + mix(deep, '#1a0c14', 0.5) + '"/>'
    + '<stop offset="100%" stop-color="' + rgba(front, 0.1) + '"/>'
    + '</radialGradient>'
    + rendered.defs
    + (PARTICLE_STYLE[opts.particleType] === 'mist'
      ? '<radialGradient id="mistg"><stop offset="0%" stop-color="' + rgba(back, 0.7) + '"/>'
        + '<stop offset="100%" stop-color="' + rgba(back, 0) + '"/></radialGradient>'
      : '')
    + (PARTICLE_SHAPE[PARTICLE_STYLE[opts.particleType] || 'dot'] || PARTICLE_SHAPE.dot)
    + '</defs>'
    + '<rect width="320" height="240" rx="20" fill="url(#sky)"/>'
    + sourceScenery(source, pale, deep, random)
    + '<ellipse cx="160" cy="128" rx="102" ry="82" fill="url(#halo)"/>'
    + rendered.body
    + particles(opts.particleType, back, pale, random)
    + '</svg>';
}

/** 인라인 런타임이 `window.CDFlowerArt` 로 찾는다. */
export function registerFlowerArtGlobals(globalObject) {
  const target = globalObject || (typeof window !== 'undefined' ? window : null);
  if (!target) return;
  target.CDFlowerArt = {
    buildFlowerSvg,
    resolveFlowerForm,
    FLOWER_FORMS,
    FLOWER_FORM_BY_ID,
  };
}
