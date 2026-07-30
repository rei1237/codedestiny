// 무료 베다점(Jyotish) 해석 품질 회귀 검증 (jsdom 기반)
//   1) 서양 점성술 용어가 사용자 노출 문자열에 남아있지 않은가
//   2) 7개 토픽 각각이 최소 분량(순수 텍스트 600자)을 채우는가
//   3) 추측성 헤지 표현이 섞이지 않았는가
//   4) 서로 다른 명식이 같은 문단을 뱉지 않는가(템플릿 고착 방지)
//   5) 8부 구조(요약·근거·의미·현실·장점·주의·행동·종합) 필드가 전부 채워지는가
// vedic-astrology.html 인라인 엔진을 실제로 구동해 검사한다.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const TOPICS = ['overview', 'personality', 'wealth', 'career', 'romance', 'energy', 'dasha'];
const MIN_CHARS = 600;
// 8부 구조: 배열 필드와 문자열 필드
const STRING_FIELDS = ['summary', 'meaning', 'merit', 'caution', 'closing'];
const ARRAY_FIELDS = ['basis', 'reality', 'action'];

// 서양 점성술 용어 / 원시 영문 품위값이 사용자에게 노출되면 실패
const BANNED = [
  ['별자리', '서양 점성술 용어 — 라시(Rashi)로 표기'],
  ['하우스', '서양 점성술 용어 — 바바(Bhava)로 표기'],
  ['Ascendant', '서양 점성술 용어 — 라그나(Lagna)로 표기'],
  ['Zodiac', '서양 점성술 용어 — 라시(Rashi)로 표기'],
  ['황도대', '서양 점성술 용어 — 라시(Rashi)로 표기'],
  ['Exalted', '원시 영문 품위값 — 우차(Uccha)로 표기'],
  ['Debilitated', '원시 영문 품위값 — 니차(Neecha)로 표기'],
  ['Moolatrikona 자리', '영문 잔존'],
];
// 추측성 어투 — 근거 없는 확률 서술 금지
const HEDGES = ['일 수도 있', '가능성이 있습니다', '할지도 모릅', '일지도 모릅', '수도 있을'];

// ── 1. 루트/public 사본 동기화 ──
assert.equal(
  read('vedic-astrology.html'),
  read('public/vedic-astrology.html'),
  'vedic-astrology.html: 루트와 public/ 사본이 동일해야 함 (npm run sync:public 실행 필요)',
);

// ── 2. 인라인 엔진 구동 ──
const html = read('vedic-astrology.html');
// jsdom에는 canvas가 없다. 스텁을 미리 심지 않으면 배경 애니메이션 스크립트가 throw하면서
// 같은 <script> 블록의 뒤쪽 선언(nd 등)이 TDZ에 갇혀 엔진 전체가 죽는다.
const installStubs = (window) => {
  const noop = () => {};
  const ctx2d = {
    clearRect: noop, fillRect: noop, strokeRect: noop, beginPath: noop, closePath: noop,
    moveTo: noop, lineTo: noop, arc: noop, ellipse: noop, bezierCurveTo: noop, quadraticCurveTo: noop,
    fill: noop, stroke: noop, save: noop, restore: noop, translate: noop, rotate: noop, scale: noop,
    setTransform: noop, drawImage: noop, fillText: noop, strokeText: noop, setLineDash: noop, clip: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => null,
    measureText: () => ({ width: 0 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: noop,
  };
  window.HTMLCanvasElement.prototype.getContext = () => ctx2d;
  window.scrollTo = noop;
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }));
  // 배경 애니메이션 루프가 이벤트 루프를 붙잡지 않도록 rAF는 1회만 흉내내고 끝낸다.
  window.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = noop;
};

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: false,
  url: 'https://code-destiny.com/vedic-astrology.html',
  beforeParse: installStubs,
  virtualConsole: new VirtualConsole(), // 페이지 로그 억제
});
const win = dom.window;

for (const fn of ['buildChart', 'analyze', 'generateInsights', 'buildVedicSections', 'computeDrishti', 'dignityDetail']) {
  assert.equal(typeof win[fn], 'function', `인라인 엔진에 ${fn}()가 노출되어야 함`);
}

// ── 3. 중첩 방지: 드리슈티 계산은 computeDrishti 한 곳만 ──
const inlineDrishtiLoops = html.match(/p==='Mars'\?\[4,7,8\]/g) || [];
assert.equal(
  inlineDrishtiLoops.length,
  0,
  '드리슈티 계산이 renderResult에 인라인으로 중복 존재함 — computeDrishti()로 단일화할 것',
);
assert.match(html, /const DRISHTI_TARGETS=/, 'DRISHTI_TARGETS 정본 테이블이 있어야 함');

// ── 4. 샘플 명식 생성 (라그나·나크샤트라·다샤 분산) ──
const SAMPLES = [];
for (let h = 0; h < 24; h += 2) {
  SAMPLES.push({ name: `S${h}a`, year: 1988, month: 3, day: 14, hour: h, minute: 20, gender: 'M', lat: 37.5665, lon: 126.978, timezone: 9 });
  SAMPLES.push({ name: `S${h}b`, year: 1996, month: 9, day: 2, hour: h, minute: 45, gender: 'F', lat: 35.1796, lon: 129.0756, timezone: 9 });
}

const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const sectionText = (sec) => {
  const parts = [];
  for (const f of STRING_FIELDS) parts.push(sec[f]);
  for (const f of ARRAY_FIELDS) parts.push((sec[f] || []).join(' '));
  return stripTags(parts.join(' '));
};

const summariesByTopic = Object.fromEntries(TOPICS.map((t) => [t, new Set()]));
const lagnaSeen = new Set();
let minSeen = { topic: null, chars: Infinity, sample: null };

for (const f of SAMPLES) {
  const chart = win.buildChart(f);
  const report = win.analyze(chart);
  const insights = win.generateInsights(chart, report);
  const sections = win.buildVedicSections(chart, report, insights);
  lagnaSeen.add(chart.rasi.ascSign);

  for (const topic of TOPICS) {
    const sec = sections[topic];
    assert.ok(sec, `${f.name}/${topic}: 섹션이 생성되지 않음`);

    // 8부 구조 완비
    for (const key of STRING_FIELDS) {
      assert.ok(String(sec[key] || '').trim().length > 0, `${f.name}/${topic}: '${key}' 필드가 비어 있음`);
    }
    for (const key of ARRAY_FIELDS) {
      const rows = (sec[key] || []).filter((x) => String(x || '').trim());
      assert.ok(rows.length > 0, `${f.name}/${topic}: '${key}' 배열이 비어 있음`);
    }

    const text = sectionText(sec);

    // 최소 분량
    if (text.length < minSeen.chars) minSeen = { topic, chars: text.length, sample: f.name };
    assert.ok(
      text.length >= MIN_CHARS,
      `${f.name}/${topic}: 순수 텍스트 ${text.length}자 — 최소 ${MIN_CHARS}자 미달\n  ${text.slice(0, 160)}…`,
    );

    // 금지 용어
    for (const [term, why] of BANNED) {
      assert.ok(!text.includes(term), `${f.name}/${topic}: 금지 용어 "${term}" 노출 — ${why}`);
    }

    // 헤지 표현
    for (const hedge of HEDGES) {
      assert.ok(!text.includes(hedge), `${f.name}/${topic}: 추측성 표현 "${hedge}" 사용 — 근거 기반 단정 서술로 교체할 것`);
    }

    // 미치환 템플릿 흔적
    assert.ok(!text.includes('undefined'), `${f.name}/${topic}: undefined 노출`);
    assert.ok(!text.includes('[object Object]'), `${f.name}/${topic}: [object Object] 노출`);
    assert.ok(!/\$\{/.test(text), `${f.name}/${topic}: 미치환 템플릿 리터럴 노출`);

    summariesByTopic[topic].add(stripTags(sec.summary));
  }
}

// ── 5. 반복 고착 방지: 서로 다른 명식이 같은 요약을 뱉지 않아야 함 ──
assert.ok(lagnaSeen.size >= 8, `샘플이 라그나를 ${lagnaSeen.size}종만 커버 — 최소 8종 필요`);
for (const topic of TOPICS) {
  const uniq = summariesByTopic[topic].size;
  const ratio = uniq / SAMPLES.length;
  assert.ok(
    ratio >= 0.5,
    `${topic}: ${SAMPLES.length}개 명식 중 고유 요약이 ${uniq}종(${Math.round(ratio * 100)}%) — 템플릿 고착 의심(최소 50%)`,
  );
}

// ── 6. 렌더러 산출물 위생 ──
const renderedSample = (() => {
  const chart = win.buildChart(SAMPLES[3]);
  const report = win.analyze(chart);
  const sections = win.buildVedicSections(chart, report, win.generateInsights(chart, report));
  return win.renderVedicSectionCards(sections.overview);
})();
assert.match(renderedSample, /class="vd-stack"/, '카드 스택이 렌더되어야 함');
for (const icon of ['✨', '🪐', '🌿', '⚠', '💡', '🔮']) {
  assert.ok(renderedSample.includes(icon), `6카드 중 ${icon} 카드가 렌더되지 않음`);
}
assert.ok(!/<p>\s*<\/p>/.test(renderedSample), '빈 문단이 렌더됨');

console.log(`✓ 무료 베다점 해석 품질 검증 통과`);
console.log(`  샘플 ${SAMPLES.length}개 · 라그나 ${lagnaSeen.size}종 · 토픽 ${TOPICS.length}개`);
console.log(`  최소 분량 지점: ${minSeen.topic} (${minSeen.chars}자, ${minSeen.sample})`);

// 페이지가 건 타이머/리스너가 이벤트 루프를 붙잡지 않도록 명시적으로 닫는다.
win.close();
process.exit(0);
