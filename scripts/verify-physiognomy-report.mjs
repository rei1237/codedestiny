// 관상 리포트 회귀 검증 (jsdom 기반)
//   - 문제3: 섹션 중복 출력 없이 독립 분리되는가 (총평/성격 분리, 미닫힘 div, 파서 폴백)
//   - 문제4: 오관 정식 5부위(眉·眼·鼻·口·耳) + 경합 균일 + 오관/점 프리미엄 게이트 등록
// 파서 로직은 PhysiognomyUI.js 원본과 1:1 복제하되, 소스에 핵심 로직이 실재하는지 문자열로 함께 검증해 drift를 막는다.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (p) => readFileSync(resolve(root, p), 'utf8');

// ── 1. 루트/public 사본 동기화 ──
for (const base of ['AnalysisEngine.js', 'PhysiognomyUI.js']) {
  assert.equal(read(base), read(`public/${base}`), `${base}: 루트와 public/ 사본이 동일해야 함`);
}

const engine = read('AnalysisEngine.js');
const ui = read('PhysiognomyUI.js');
const registry = read('worker/lib/paid-feature-registry.js');

// ── 2. 문제3: 총평/성격 분리 + 파서 정합 ──
assert.match(engine, /관상 총평<\/div>\s*<div style="[^"]*">\$\{phySummary\}<\/div>/, '총평 본문은 phySummary(요약)여야 함');
assert.match(engine, /상세 성격 분석[\s\S]*?\$\{bestMatch\.description\}/, 'description 전체는 상세 성격 블록에');
assert.doesNotMatch(engine, /관상 총평<\/div>\s*<div style="[^"]*">\$\{bestMatch\.description\}/, '총평에 description 통째 금지');
assert.match(ui, /const sectionNode = findSectionBlockFromHeading\(headingNode, host\);/, '파서 폴백(parentElement) 제거 유지');
for (const kw of ['상세 성격 분석', '점\\(痣\\)', '참고사항']) {
  assert.match(ui, new RegExp(`'${kw}'`), `headingKeywords에 '${kw}' 정합`);
}

// ── 2b. 결과 렌더는 한 프레임에 끝나야 한다 (빈 패널 → 카드 팝콘 재발 방지) ──
// setTimeout(index*70) 스태거는 #phyResult가 빈 채로 먼저 노출되게 만들고, 레이아웃이
// 630ms 동안 자라 스크롤 목표까지 흔들었다. 되돌리지 말 것.
assert.doesNotMatch(ui, /index \* 70/, 'renderSectionCards 카드 지연 삽입(stagger) 재도입 금지');
assert.match(ui, /const fragment = document\.createDocumentFragment\(\);/, '섹션 카드는 DocumentFragment로 1회 삽입');
assert.match(ui, /if \(!ogwanMoleUnlocked\) requestAnimationFrame\(scrollResultToTop\);/, '결과 스크롤은 카드 삽입 뒤 rAF 1회 + 해금 재렌더는 튕기지 않음');

// ── 2c. 표정 감지 가드 (동기 셰이더 컴파일은 예열로, 행은 타임아웃으로) ──
assert.match(ui, /'EXPRESSION_TIMEOUT'/, '표정 감지 타임아웃 가드 유지');
assert.match(engine, /predictExpressions\(warmCanvas\)/, 'face-api 모델 로드 직후 예열 유지');

// ── 3. 문제4: 오관 5부위 + 게이트 등록 ──
for (const f of ['browSlant: browSlant', 'BROW_TYPES_JSON', 'let bestBrow', 'EAR_TYPES_JSON', 'let bestEar', 'const renderOgwanLi']) {
  assert.match(engine, new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `AnalysisEngine: ${f}`);
}
for (const [icon, part] of [['🌙','미상\\(눈썹\\)'],['👁️','안상\\(눈\\)'],['👃','비상\\(코\\)'],['👄','구상\\(입\\)'],['👂','이상\\(귀\\)']]) {
  assert.match(engine, new RegExp(`renderOgwanLi\\('${icon}', '${part}'`), `오관 렌더: ${part}`);
}
assert.match(registry, /"physiognomy-ogwan-mole-deep":\s*\{\s*cost:\s*50/, '오관·점 프리미엄 가격표 등록');
assert.match(registry, /PER_USE_PAID_FEATURE_KEY_LIST[\s\S]*?"physiognomy-ogwan-mole-deep"/, '오관·점 회당결제 목록 등록');
assert.match(ui, /featureKey: 'physiognomy-ogwan-mole-deep'/, '프론트 게이트 featureKey 배선');

// ── 3b. 잠긴 오관·점 섹션은 본문을 DOM 에 넣지 않는다 (2026-08-17) ──
// 예전에는 계산이 끝난 section.body 를 그대로 .phy-premium-blur 안에 넣어서, 개발자도구로
// blur 클래스만 지우면 5,000원 정밀 분석이 전부 읽혔다. 인자를 받지 않는 함수로 만들어
// 구조적으로 본문이 들어갈 수 없게 한다.
assert.match(ui, /function buildLockedSectionHtml\(\)/, '잠금 카드 빌더는 인자를 받지 않는다(본문 유입 구조적 차단)');
assert.doesNotMatch(ui, /buildLockedSectionHtml\(section\)/, '잠금 카드 빌더에 section 을 넘기지 않는다');
assert.doesNotMatch(ui, /phy-premium-blur[^\n]*\$\{section\.body\}/, '.phy-premium-blur 에 section.body 를 넣지 않는다');
assert.match(ui, /phy-premium-blur--skeleton/, '잠금 카드는 내용 없는 스켈레톤으로 높이를 만든다');

// ── 4. jsdom: 파서가 섹션을 중복 없이 분리 ──
const dom = new JSDOM('<!doctype html><body></body>');
const { document } = dom.window;
const toPlainText = (t) => String(t || '').replace(/\s+/g, ' ').trim();
const normalizeSectionTitle = (raw, i) => {
  const clean = toPlainText(raw).replace(/^[^ㄱ-힣A-Za-z0-9]+/, '');
  if (!clean) return `카테고리 ${i + 1}`;
  return clean.length <= 36 ? clean : `${clean.slice(0, 36)}...`;
};
const findSectionBlockFromHeading = (node, rootEl) => {
  let cur = node;
  while (cur && cur !== rootEl) {
    const st = String(cur.getAttribute && cur.getAttribute('style') || '');
    if (/margin-bottom\s*:\s*(10|12|14|15|18)px/i.test(st) && /padding\s*:/i.test(st)) return cur;
    cur = cur.parentElement;
  }
  return null;
};
const createExpertReportSections = (html) => {
  const host = document.createElement('div');
  host.innerHTML = html;
  const kw = ['관상 총평','상세 성격 분석','오관(五官)','영혼의 그림자','점(痣)','삶의 지혜','동물상 매칭','참고사항','안심하세요'];
  const nodes = Array.from(host.querySelectorAll('div, strong, h1, h2, h3, h4')).filter((n) => kw.some((k) => toPlainText(n.textContent).includes(k)));
  const out = [];
  const seen = new Set();
  nodes.forEach((h) => {
    const sn = findSectionBlockFromHeading(h, host);
    if (!sn || seen.has(sn)) return;
    seen.add(sn);
    out.push({ title: normalizeSectionTitle(h.textContent, out.length), body: sn.innerHTML });
  });
  return out;
};

const desc = `<strong>[성격 및 특징]</strong><br> 둥글고 선한 눈매. 인싸형.<br><br><strong>[연애 및 결혼]</strong><br> 헌신적.<br><br><strong>[진로 및 직업]</strong><br> 서비스직.<br><br><strong>[재물운]</strong><br> 인복이 재물로.`;
const sampleHtml = `
  <div style="font-family:'Pretendard',sans-serif;">
    <div style="margin-bottom: 15px; padding:15px;"><div>👑 🐶 강아지상 관상 총평</div><div>둥글고 선한 눈매.</div></div>
    <div style="margin-bottom: 15px; padding:15px;"><div>📖 강아지상 상세 성격 분석</div><div>${desc}</div></div>
    <div style="margin-bottom: 15px; padding:12px;"><div>오관(五官) 정밀 확률 분석</div><ul><li>🌙 미상(눈썹)</li></ul></div>
    <div style="margin-bottom: 15px; padding:15px;"><div>📜 삶의 지혜 (Advise)</div><p>겸손.</p></div>
    <div style="margin-bottom: 15px; padding:15px;"><div>🐾 이면의 현대적 동물상 매칭</div><p>강아지상.</p></div>
    <div style="margin-bottom:15px; padding:15px;"><div>✨ 피부와 점(痣) 분석</div><div>길점 1개.</div></div>
    <div style="margin-bottom: 15px; padding:12px;"><div>✅ 안심하세요!</div><div>흉상 없음.</div></div>
  </div>`;
const sections = createExpertReportSections(sampleHtml);
assert.equal(sections.length, 7, `7개 독립 섹션이어야 함 (실제 ${sections.length})`);
assert.equal(new Set(sections.map((s) => s.body)).size, sections.length, '섹션 body 중복 없음');
const total = sections.find((s) => s.title.includes('총평'));
assert.ok(total && !total.body.includes('연애 및 결혼') && !total.body.includes('오관(五官)'), '총평이 다른 섹션을 삼키지 않음');

// ── 5. 게이트 프리미엄 판별 (순수 함수 복제) ──
const isPremium = (title) => { const t = String(title || ''); return t.includes('오관') || t.includes('점(痣)') || t.includes('피부와 점'); };
assert.ok(isPremium('오관(五官) 정밀 확률 분석'), '오관=프리미엄');
assert.ok(isPremium('피부와 점(痣) 분석 (面痣 분석)'), '점=프리미엄');
assert.ok(!isPremium('강아지상 관상 총평 둥글고'), '총평=무료');
assert.ok(!isPremium('강아지상 상세 성격 분석'), '상세 성격=무료');
assert.ok(!isPremium('삶의 지혜 (Advise)'), '삶의 지혜=무료');

// ── 6. 동물상 TOP3 히어로 실렌더 ──
// 결과 화면의 첫 블록이다. 1위만 단정 제시하던 것을 세 후보의 배합으로 바꿨고, 실측상
// 1위 적중보다 TOP3 적중이 2배 이상 높아 이 표현이 더 정직하다(verify:physiognomy-scoring 참고).
// 문자열 단언이 아니라 실제로 모달을 열고 실엔진 결과를 흘려 넣어 DOM 을 확인한다.
{
  const renderDom = new JSDOM('<!doctype html><body></body>', { url: 'https://code-destiny.com/', runScripts: 'outside-only' });
  const w = renderDom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  w.scrollTo = () => {};
  w.eval(read('AnalysisEngine.js'));
  w.eval(read('PhysiognomyUI.js'));
  await w.faceAnalysisEngine.loadDatabase();
  w.openPhysiognomyApp();

  const host = w.document.getElementById('phyTop3');
  assert.ok(host, '#phyTop3 컨테이너가 결과 카드에 있어야 함');
  assert.equal(host.hidden, true, '분석 전에는 TOP3 가 숨겨져 있어야 함');

  const fx = JSON.parse(read('scripts/fixtures/physiognomy-landmark-vectors.json'));
  const sample = fx.samples[0];
  const lm = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  fx.indices.forEach((idx, i) => { lm[idx] = { x: sample.points[i][0], y: sample.points[i][1], z: sample.points[i][2] }; });
  const result = await w.faceAnalysisEngine.analyze(lm, null, sample.aspect);
  w.setResultMeta(result, [{ title: 'A' }, { title: 'B' }]);

  assert.equal(host.hidden, false, '결과가 있으면 TOP3 가 보여야 함');
  assert.equal(host.querySelectorAll('.phy-top3__name').length, 3, 'TOP3 이름 3개');
  assert.equal(host.querySelectorAll('.phy-top3__bar > span').length, 3, 'TOP3 막대 3개');
  assert.ok(host.querySelector('.phy-top3__note'), '배합/우세 안내 문구가 있어야 함');
  const heroText = host.textContent;
  result.top3.slice(0, 3).forEach((t) => {
    assert.ok(heroText.includes(t.animal.name), `TOP3 히어로에 ${t.animal.name} 노출`);
  });

  // 🔴 퍼센트를 다시 찍지 말 것: top3 의 pct 는 top3 점수 합에 대한 지분이라 세 후보가 늘
  // 33% 근처로 붙는다(실측 150장에서 1·3위 격차 중앙값 0.3%p, 133장이 1%p 미만).
  assert.doesNotMatch(heroText, /\d+\.\d\s*%/, 'TOP3 히어로에 소수점 퍼센트 표기 금지 (없는 정밀도 주장)');

  // 순위 나열이 요약줄과 히어로에 두 번 나오지 않아야 한다.
  const summary = w.document.getElementById('phyResultSummary').innerText;
  assert.doesNotMatch(summary, /1위\s/, '요약줄이 순위를 되풀이하지 않아야 함 (히어로가 담당)');

  // 궁합 화면으로 전환하면 솔로 분석의 TOP3 가 남으면 안 된다.
  assert.match(ui, /hidePhyTop3\(\); \/\/ 솔로 분석의 TOP3 가 궁합 화면에 남지 않도록/, '궁합 전환 시 TOP3 정리');
  assert.equal((ui.match(/hidePhyTop3\(\);/g) || []).length, 2, '궁합 성공·실패 두 경로 모두에서 정리');
}

console.log('[verify-physiognomy-report] PASS — 7섹션 무중복, 오관 5부위, 오관·점 프리미엄 게이트 등록, TOP3 히어로 실렌더');
