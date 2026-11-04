import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { buildSajuAdapter } from '../../worker/lib/guardian-fortune/adapters/saju.js';
import { fusionExpertEvidenceReady } from '../../worker/lib/fusion-expert-contract.js';
import { canonicalTeaSaju } from '../../worker/lib/tea-saju-facts.js';
import { __fortuneTeaHouseTestUtils as tea } from '../../worker/routes/fortune-tea-house.js';
import { buildSajuSectionHtml } from '../../worker/lib/saju-section/report.js';
import { __namingPromptExecutionTestUtils as naming, buildGeneratedPrompt } from '../../worker/routes/naming-prompt.js';
import { matchDestinyFlower } from '../../worker/lib/destiny-flower-engine.js';
import { buildCompassSectionPrompt } from '../../worker/lib/destiny-compass-report-contract.js';
import { approvedSajuLabels } from '../../worker/lib/saju-authority-consumer.js';

// TS 모듈은 scripts/verify-famous-saju-magazine.mjs 와 같은 방식으로 트랜스파일해 읽는다.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolve(request, parent, isMain, options) {
  return originalResolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, parent, isMain, options);
};
for (const ext of ['.ts', '.tsx']) {
  Module._extensions[ext] = (mod, file) => {
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
      fileName: file,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    mod._compile(outputText, file);
  };
}
const fromRoot = (file) => require(path.join(root, file));

const BROKEN = /undefined|\[object|NaN/;
const PENDING = '판정 보류';
const knownPillars = { year: '庚午', month: '辛巳', day: '庚辰', hour: '庚辰' };
const knownLabels = approvedSajuLabels(knownPillars);
const birth = { year: 1990, month: 5, day: 15, hour: 8, minute: 30 };

test('승인 라벨 전제: 시각을 알면 후보, 모르면 보류', () => {
  assert.equal(knownLabels.status, 'candidates');
  assert.match(knownLabels.yongshinLabel, /^후보 /);
  assert.equal(approvedSajuLabels({ ...knownPillars, hour: null }).yongshinLabel, PENDING);
});

// ── 2 융합 ──
const fusionSaju = (timeKnown, gyeokgukAuthorityV2) => buildSajuAdapter({
  birthDate: '1990-05-15', birthTime: timeKnown ? '08:30' : undefined, hasBirthTime: timeKnown,
  calendarType: 'solar', gender: 'female', topic: 'daily', targetDate: '2026-11-04',
}, { fusionExpert: true, gyeokgukAuthorityV2, now: new Date('2026-11-04T00:00:00Z') });

test('융합: OFF 는 옛 근거, ON 은 후보 상태로 전문가 입력 준비를 통과한다', async () => {
  const off = await fusionSaju(true, false);
  assert.equal(off.expertEvidence.yongshin?.status, undefined);
  const on = await fusionSaju(true, true);
  assert.equal(on.expertEvidence.yongshin.status, 'candidates');
  assert.equal(on.expertEvidence.usefulGod, undefined);
  assert.equal(fusionExpertEvidenceReady('saju', on), true);
});

test('융합: 시각 미상은 보류, 저장본이 있으면 새 판정을 켜지 않는다', async () => {
  const pending = await fusionSaju(false, true);
  assert.equal(pending.expertEvidence.yongshin.status, 'pending');
  const source = readFileSync(path.join(root, 'worker/lib/fusion-fortune.js'), 'utf8');
  assert.match(source, /gyeokgukAuthorityV2: !priorResult && sajuAuthorityOn\(env\)/);
});

// ── 1 찻집 ──
const teaInput = (over = {}) => ({
  name: '연이', gender: 'female', consultationMode: 'saju', question: '올해 일은 어떨까요?',
  birthDate: '1990-05-15', birthTime: '08:30', calendarType: 'solar', includeBirthTime: true, ...over,
});
const teaCase = (input, authorityEnabled) => canonicalTeaSaju(input, {}, new Date('2026-11-04T00:00:00Z'), { authorityEnabled });

test('찻집: OFF 는 옛 근거를 유지하고 승인 필드를 만들지 않는다', () => {
  const saju = teaCase(teaInput(), false);
  assert.equal(saju.approvedSaju, undefined);
  assert.ok(saju.usefulGodEvidence);
});

test('찻집: ON 은 후보 라벨을 싣고 옛 단일 용신 근거를 뺀다', () => {
  const saju = teaCase(teaInput(), true);
  assert.equal(saju.usefulGodEvidence, undefined);
  assert.match(saju.approvedSaju.yongshinLabel, /^후보 /);
  assert.ok(saju.keyPoints.some((point) => point.includes(saju.approvedSaju.yongshinLabel)));
  assert.doesNotMatch(saju.keyPoints.join(' '), BROKEN);
});

test('찻집: 정규화를 거쳐도 승인 판정이 프롬프트 사실까지 간다', () => {
  const request = tea.normalizeRequest({ ...teaInput(), selectedTeaCupId: 'cup', selectedTeaCupName: '찻잔', selectedTeaCupTopic: '직업', consultationVersion: 'tea-v2' });
  const saju = teaCase(teaInput(), true);
  const normalized = tea.normalizeDraftResult({ saju }, request);
  assert.equal(normalized.saju.approvedSaju?.yongshinLabel, saju.approvedSaju.yongshinLabel);
  const facts = JSON.stringify(JSON.parse(tea.buildUserPrompt(request, normalized)).sajuFactInput);
  assert.ok(facts.includes(saju.approvedSaju.yongshinLabel));
  assert.ok(facts.includes(saju.approvedSaju.promptRules[0]));
  assert.doesNotMatch(facts, /undefined/);
});

test('찻집: 시각 미상은 보류', () => {
  const saju = teaCase(teaInput({ birthTime: '', birthTimeUnknown: true, includeBirthTime: false }), true);
  assert.equal(saju.approvedSaju.yongshinLabel, PENDING);
  assert.equal(saju.approvedSaju.status, 'pending');
});

// ── 3 유명인 ──
test('유명인 사주: OFF 는 옛 판정, ON 은 승인 판정, 시각 미상은 보류', () => {
  const svc = fromRoot('lib/famous-saju/celebrity-saju-service.ts');
  const seed = svc.publishedCelebritySajuSeeds.find((person) => svc.calculateFamousSaju(person, { authorityEnabled: false }).saju);
  const off = svc.calculateFamousSaju(seed, { authorityEnabled: false }).saju;
  assert.equal(off.natalAnalysis.yongshinAnalysis?.calculationVersion, undefined);
  const on = svc.calculateFamousSaju(seed, { authorityEnabled: true });
  assert.equal(on.saju.natalAnalysis.usefulElements.status, 'pending');
  const article = JSON.stringify(svc.buildFamousSajuArticle(seed, on));
  assert.ok(article.includes(PENDING));
  assert.doesNotMatch(article, /판정 보류(이|을|의) /);
  const known = { ...seed, birthTime: '08:30', isBirthTimeKnown: true, birthTimeStatus: 'verified' };
  // saju 는 엔진 원본이라 빼고 고객에게 그려지는 필드만 본다.
  const { saju: _engine, ...knownArticle } = svc.buildFamousSajuArticle(known, svc.calculateFamousSaju(known, { authorityEnabled: true }));
  const knownText = JSON.stringify(knownArticle);
  assert.match(knownText, /후보 /);
  assert.doesNotMatch(knownText, /undefined|\[object/);
});

// ── 4 연애 시뮬레이션 ──
const animalInput = (over = {}) => ({ birthDate: '1990-05-15', birthTime: '08:30', timeUnknown: false, calendarType: 'solar', gender: 'female', ...over });

test('연애 시뮬레이션: 점수는 그대로, 문구만 승인 라벨을 따른다', () => {
  const { normalizeCharacterChart } = fromRoot('app/saju/love-simulation/_engine/normalizeSaju.ts');
  const { computeCompatibilityProfile } = fromRoot('app/saju/love-simulation/_engine/compatibilityEngine.ts');
  const off = normalizeCharacterChart(animalInput(), { authorityEnabled: false });
  const on = normalizeCharacterChart(animalInput(), { authorityEnabled: true });
  const partnerOff = normalizeCharacterChart(animalInput({ birthDate: '1988-11-02', gender: 'male' }), { authorityEnabled: false });
  const partnerOn = normalizeCharacterChart(animalInput({ birthDate: '1988-11-02', gender: 'male' }), { authorityEnabled: true });
  assert.equal(off.approvedYongshinLabel, undefined);
  assert.match(on.approvedYongshinLabel, /^후보 /);
  assert.deepEqual(on.coreYongshin, off.coreYongshin);
  const { WEIGHTS } = fromRoot('app/saju/love-simulation/_config/weights.config.ts');
  const a = computeCompatibilityProfile(off, partnerOff, WEIGHTS);
  const b = computeCompatibilityProfile(on, partnerOn, WEIGHTS);
  assert.deepEqual(b.indicators.map((row) => row.delta ?? row.score), a.indicators.map((row) => row.delta ?? row.score));
  assert.deepEqual(b.dimensions, a.dimensions);
  assert.doesNotMatch(JSON.stringify(b.indicators), /undefined/);
  const pending = normalizeCharacterChart(animalInput({ birthTime: null, timeUnknown: true }), { authorityEnabled: true });
  assert.equal(pending.approvedYongshinLabel, PENDING);
});

// ── 5 나침반 ──
test('운명의 나침반: 승인 라벨을 근거에 싣고 시각 미상은 보류', () => {
  const { buildSajuNatalEvidence } = fromRoot('app/destiny-compass/_engine/evidence/sajuNatalEvidence.ts');
  const text = (value) => JSON.stringify(value);
  const on = text(buildSajuNatalEvidence(animalInput(), undefined, { authorityEnabled: true }));
  assert.match(on, /후보 /);
  assert.doesNotMatch(on, /undefined/);
  assert.ok(text(buildSajuNatalEvidence(animalInput({ birthTime: null, timeUnknown: true }), undefined, { authorityEnabled: true })).includes(PENDING));
  assert.doesNotMatch(text(buildSajuNatalEvidence(animalInput(), undefined, { authorityEnabled: false })), /후보 [목화토금수]/);
});

test('운명의 나침반: 해석 규칙은 승인 라벨이 있는 사주 근거에만 실린다', () => {
  const prompt = (detail, system = 'saju') => buildCompassSectionPrompt({
    spec: { system, title: '제목', guide: '안내', minChars: 100, maxChars: 200 }, field: {},
    evidencePack: { systems: [{ system: 'saju', items: [{ id: 'saju.yongshin', term: '용신', detail }] }, { system: 'ziwei', items: [{ id: 'z', term: '명궁', detail: '자미' }] }] },
    basisPayload: { facts: [] },
  });
  const rule = knownLabels.promptRules[0];
  assert.ok(prompt(knownLabels.yongshinLabel).includes(rule));
  assert.ok(prompt(PENDING).includes(rule));
  assert.ok(!prompt('우선 금').includes(rule));
  assert.ok(!prompt(knownLabels.yongshinLabel, 'ziwei').includes(rule));
});

// ── 6 프롬프트 허브 ──
test('프롬프트 허브: ON 은 라벨과 해석 규칙, OFF 는 없음, 시각 미상은 보류', () => {
  const { buildSajuPromptFacts } = fromRoot('app/fortune/prompt-hub/saju-prompt-facts.ts');
  const input = { birthDate: '1990-05-15', birthTime: '08:30', birthTimeUnknown: false, gender: 'female', calendarType: 'solar' };
  const off = String(buildSajuPromptFacts(input, { authorityEnabled: false }));
  const on = String(buildSajuPromptFacts(input, { authorityEnabled: true }));
  assert.doesNotMatch(off, /해석 규칙/);
  assert.match(on, /해석 규칙/);
  assert.match(on, /후보 /);
  assert.doesNotMatch(on, /undefined/);
  const pending = String(buildSajuPromptFacts({ ...input, birthTime: '', birthTimeUnknown: true }, { authorityEnabled: true }));
  assert.ok(pending.includes(PENDING));
});

// ── 7 유료 양자 카드 ──
const quantum = (over, authorityEnabled) => {
  const html = buildSajuSectionHtml({
    featureKey: 'rpt_quantumCard', gender: 'F', now: new Date('2026-11-04T00:00:00Z'), place: {},
    birth: { calendarDate: '1990-05-15', calType: 'solar', timeKnown: true, hour: 8, minute: 30, ...over }, authorityEnabled,
  }).html;
  return html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
};

test('양자 카드: 표기는 후보권, 시각 미상은 보류', () => {
  const off = quantum({}, false);
  assert.doesNotMatch(off, /용신|기신권/);
  const on = quantum({}, true);
  assert.match(on, /보완 후보권/);
  assert.doesNotMatch(on, /기신\(忌神\)|용신으로 분류된|기신권/);
  assert.doesNotMatch(on, BROKEN);
  const pending = quantum({ timeKnown: false, hour: undefined, minute: undefined }, true);
  assert.match(pending, /격국 판정 보류/);
  assert.match(pending, /추가 판정이 필요한 항목/);
  assert.doesNotMatch(pending, BROKEN);
});

// ── 9 작명 ──
const namingSnapshot = {
  source: 'main-shell', yearPillar: '庚午', monthPillar: '辛巳', dayPillar: '庚辰', hourPillar: '庚辰',
  dayMaster: '庚(금)', monthCommand: '巳', fiveElementBalance: '금 4', tenGodBalance: '비견', strengthAnalysis: '신강 후보',
  temperatureBalance: '따뜻함', usefulGodCandidates: '수', supportiveGodCandidates: '목', unfavorableGodCandidates: '토',
  finalYongshin: '수', finalKijishin: '토', eokbuYongshin: '수', johuYongshin: '수', eokbuKijishin: '토', johuKijishin: '화',
  recommendedNameElements: '용신·희신 우선: 수 / 조후 보완: 수', avoidNameElements: '기신·과다 오행 회피: 토 / 조후 주의: 화',
};
const namingInput = { familyName: '김', gender: 'F', calendarType: 'solar', birthDate: '1990-05-15', birthTime: '08:30', birthPlace: '서울', timezone: 'Asia/Seoul', nameLength: 2, birthTimeUnknown: false, useHanja: true, currentName: '', desiredNames: [], desiredSyllables: [], preferredImage: [] };

test('작명: 승인 사실은 단일 용신 대신 후보 라벨을 프롬프트와 화면 값에 넣는다', () => {
  const snapshot = naming.withApprovedSajuFacts(namingSnapshot, namingInput);
  assert.equal(snapshot.usefulGodCandidates, knownLabels.yongshinLabel);
  assert.equal(snapshot.unfavorableGodCandidates, knownLabels.gisinLabel);
  assert.match(snapshot.recommendedNameElements, /^작명 계산 기준: /);
  const prompt = buildGeneratedPrompt(namingInput, snapshot, 'ko');
  assert.ok(prompt.includes(`- 용신: ${knownLabels.yongshinLabel}`));
  assert.ok(prompt.includes(knownLabels.promptRules[0]));
  assert.doesNotMatch(prompt, /최종 보정 용신|최종 주의 오행|undefined/);
});

test('작명: OFF 프롬프트는 옛 근거 블록을 유지하고, 시각 미상은 보류', () => {
  const prompt = buildGeneratedPrompt(namingInput, namingSnapshot, 'ko');
  assert.match(prompt, /최종 보정 용신: 수/);
  assert.doesNotMatch(prompt, /사주 판정 — 승인값/);
  const pending = naming.withApprovedSajuFacts({ ...namingSnapshot, hourPillar: '출생시간 미상으로 시주 미확정' }, { ...namingInput, birthTimeUnknown: true });
  assert.equal(pending.approvedSaju.yongshinLabel, PENDING);
  assert.equal(pending.approvedSaju.gyeokguk, PENDING);
});

test('작명: 시주를 못 읽으면 보류, 다른 기둥을 못 읽으면 결제 뒤 전달을 막지 않는다', () => {
  assert.equal(naming.withApprovedSajuFacts({ ...namingSnapshot, hourPillar: '미상' }, namingInput).approvedSaju.status, 'pending');
  const unreadable = { ...namingSnapshot, yearPillar: '미상' };
  assert.equal(naming.withApprovedSajuFacts(unreadable, namingInput), unreadable);
});

test('작명: 결과 화면 표지·시각 미상 안내는 승인 기록에서만 용신 단정을 뺀다', () => {
  const source = readFileSync(path.join(root, 'app/naming-ai/result/NamingAiResultClient.tsx'), 'utf8');
  assert.match(source, /saju\?\.approvedSaju \? COPY\.coverBodyApproved : COPY\.coverBody/);
  assert.match(source, /saju\?\.approvedSaju \? COPY\.hourUnknownNoteApproved : COPY\.hourUnknownNote/);
  const copy = readFileSync(path.join(root, 'app/naming-ai/result/resultCopy.ts'), 'utf8');
  for (const line of copy.split(/\r?\n/).filter((row) => /^ {2}(coverBodyApproved|hourUnknownNoteApproved): "/.test(row))) {
    assert.doesNotMatch(line, /검증한 용신|verified|検証|验证|驗證/);
  }
  assert.equal(copy.match(/^ {2}coverBodyApproved: "/gm).length, 5);
});

test('작명: 저장되는 view 는 판정이 있을 때만 바뀐다', () => {
  const view = { saju: { useful: ['water'] }, notices: ['saju.time-unknown', 'saju.jong-conditional', 'sound.school-differs'] };
  assert.equal(naming.withApprovedNamingView(view, undefined), view);
  const approved = naming.withApprovedSajuFacts(namingSnapshot, namingInput).approvedSaju;
  const on = naming.withApprovedNamingView(view, approved);
  assert.deepEqual(on.saju.useful, ['water']);
  assert.deepEqual(on.notices, ['saju.time-unknown-approved', 'sound.school-differs']);
});

test('작명 엔진 문구: 판정이 있으면 용신 단정을 쓰지 않고, 없으면 옛 문구', () => {
  const { engineChapterBody, sajuSupportText, summaryText } = fromRoot('worker/naming-engine/facts.ts');
  const candidate = {
    rank: 1, hangul: '서', hanja: '瑞', total: 80, scores: { saju: 1, suri: 1, sound: 1 },
    chars: [{ ch: '瑞', hangul: '서', hun: '상서', strokes: 13, jawon: 'water', flags: [] }],
    strokes: { surname: [8], name: [13], method: 'x' }, grids: {}, grades: {},
    sound: { elements: ['wood', 'metal'], relations: [], mapping: 'modern' }, samjae: { combo: [], grade: 'good' },
  };
  const view = (approved) => ({
    surname: { hangul: '김', hanja: '金', strokes: [8] }, notices: [], candidates: [candidate],
    saju: { useful: ['water'], caution: ['earth'], derivedSupport: ['metal'], timeUnknown: false, jongConditional: true, ...(approved ? { approved } : {}) },
  });
  const approved = naming.withApprovedSajuFacts(namingSnapshot, namingInput).approvedSaju;
  const saju = { yearPillar: '庚午' };
  const offText = sajuSupportText(view(null), candidate) + summaryText(view(null), candidate) + engineChapterBody(2, view(null), saju, null);
  assert.match(offText, /최종 용신/);
  const onText = sajuSupportText(view(approved), candidate) + summaryText(view(approved), candidate) + engineChapterBody(2, view(approved), saju, null) + engineChapterBody(3, view(approved), saju, null);
  assert.ok(onText.includes(approved.yongshinLabel));
  assert.doesNotMatch(onText, /최종 용신|용신 오행|undefined/);
});

// ── 9 운명의 꽃 ──
test('운명의 꽃: 고른 꽃과 점수는 그대로, 고객 문장에서만 단일 용신을 뺀다', () => {
  const payload = {
    birth, name: '연이', elementWeights: { wood: 10, fire: 40, earth: 20, metal: 20, water: 10 },
    saju: { dayMaster: '庚', yongshin_elements: ['wood', 'fire', 'earth', 'metal', 'water'], kishin_elements: [] },
  };
  const off = matchDestinyFlower(payload, { limit: 5 });
  const on = matchDestinyFlower(payload, { limit: 5, approvedSajuWording: true });
  assert.equal(on.flower.id, off.flower.id);
  assert.deepEqual(on.candidates.map((row) => row.score), off.candidates.map((row) => row.score));
  assert.ok(off.rationale_points.some((row) => /보완 후보/.test(JSON.stringify(row))));
  assert.doesNotMatch(JSON.stringify([off.rationale_points, off.destiny_flower_language, on.rationale_points, on.destiny_flower_language]), /용신/);
});

test('유료 섹션: 승인값 켜면 후보만 보이고, 시각 미상은 판정 보류', async () => {
  const { buildSajuSectionHtml, SAJU_SECTION_FEATURE_KEYS } = await import('../../worker/lib/saju-section/report.js');
  const strip = (h) => h.replace(/<(style|script)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ');
  const render = (featureKey, birth, mode = 'normal') => strip(buildSajuSectionHtml({
    featureKey, birth, gender: 'F', mode, now: new Date('2026-11-04T00:00:00Z'), place: {}, authorityEnabled: true,
  }).html);
  const known = { calendarDate: '1990-05-15', calType: 'solar', timeKnown: true, hour: 8, minute: 30 };
  const unknown = { calendarDate: '1990-05-15', calType: 'solar', timeKnown: false };
  const keys = SAJU_SECTION_FEATURE_KEYS.filter((k) => /^section_/.test(k) && k !== 'section_daewun');
  assert.ok(keys.length > 0);
  for (const featureKey of keys) {
    for (const birth of [known, unknown]) {
      for (const mode of ['normal', 'neo']) {
        assert.doesNotMatch(render(featureKey, birth, mode), /undefined|용신|희신|(?<![가-힣])기신|(?<![가-힣])구신/, `${featureKey}/${mode}`);
      }
    }
  }
  assert.match(render('section_summary', unknown), /판정 보류/);
  assert.doesNotMatch(render('section_summary', known), /판정 보류/);
});
