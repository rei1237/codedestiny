import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { build } from 'esbuild';
import { approvedSajuLabels, lifeBookPillars, overlayApprovedLifeBookChart } from '../../worker/lib/saju-authority-consumer.js';
import { calculateLoveSecretAiSaju, normalizeLoveSecretAiInput } from '../../worker/lib/love-secret-ai-calculation.js';
import { buildLoveSecretGroundingFacts } from '../../worker/lib/love-secret-ai-facts.js';
import { buildNeoBasisPayload } from '../../worker/lib/neo-operation-room-basis.js';
import { buildNeoCompat } from '../../worker/lib/neo-operation-room-compat.js';
import { calculateLifeBookAiSaju } from '../../worker/lib/life-book-ai-saju.js';
import { formatSajuForPrompt } from '../../worker/lib/master-love-codex-prompt.mjs';
import { buildMasterLoveCodexCompatChapterPrompt, MASTER_LOVE_CODEX_COMPAT_CHAPTERS } from '../../worker/lib/master-love-codex-compat-prompt.mjs';
import { buildSajuCompatFactsBlock, withApprovedSajuCompat } from '../../worker/lib/saju-compat-prompts.js';
import { requestBody } from '../fixtures/saju-compat-llm-fixture.mjs';
import { __dailyFortuneTestUtils as daily, getTodayPillars } from '../../worker/lib/daily-fortune-task.js';
import { buildSajuAIPrompt, buildSajuAIPromptWithDomain, selectSajuPromptAuthority } from '../../worker/lib/saju-ai-prompt.js';

// 라우트·영냥이 TS 는 확장자 없는 import 가 있어 esbuild 로 묶어 올린다(core-landing-calculation-examples 와 같은 방식).
const require = createRequire(import.meta.url);
const Module = require('node:module');
const built = await build({ stdin: { contents: [
  "export {saju} from './worker/yeongnyangi/fortune/saju/index';",
  "export {__neoOperationRoomTestUtils as neo} from './worker/routes/neo-operation-room.js';",
  "export {__masterLoveCodexTestUtils as codex} from './worker/routes/master-love-codex.js';",
  "export {buildKarmaDestinyIntegratedResult} from './worker/lib/karma-destiny-ai-calculations.js';",
].join(' '), resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent', loader: { '.wasm': 'binary' } });
const filename = path.resolve('saju-authority-consumers-a.cjs');
const loaded = new Module(filename);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(process.cwd());
loaded._compile(built.outputFiles[0].text, filename);
const { saju, neo, codex, buildKarmaDestinyIntegratedResult } = loaded.exports;

const known = { birthDate: '1990-05-15', birthTime: '08:30', birthTimeUnknown: false, calendarType: 'solar', gender: 'female' };
const unknown = { ...known, birthTime: '', birthTimeUnknown: true };
const partner = { ...known, birthDate: '1988-11-02', birthTime: '21:10', gender: 'male' };
const ON = { SAJU_GYEOKGUK_AUTHORITY_V2: 'true' };
const OFF = { SAJU_GYEOKGUK_AUTHORITY_V2: 'false' };
const NAMES = /후보 [목화토금수](·[목화토금수])*/;
const text = (value) => JSON.stringify(value);
// 단일 용신을 가정한 문장에 후보 라벨을 끼운 흔적과 빈 값이 고객 문구로 나가지 않는지 본다.
const clean = (value) => assert.doesNotMatch(text(value), /undefined|후보 [목화토금수·]+[이가] 살아나|단일 용신 미확정|용신 연결|기신 연결|기신성|희신성/);

const loveInput = (myInfo) => normalizeLoveSecretAiInput({ myInfo, relationshipStatus: '솔로', topic: '전체 연애 흐름' });

test('연애 비책: ON 은 후보 라벨이고 달력 점수는 OFF 와 같다', () => {
  const off = calculateLoveSecretAiSaju(loveInput(known));
  const on = calculateLoveSecretAiSaju(loveInput(known), { authorityEnabled: true });
  assert.doesNotMatch(text(off.reference?.yongshinElementKo ?? off), /후보 [목화토금수]/);
  const facts = buildLoveSecretGroundingFacts(on);
  assert.match(text(facts), NAMES);
  clean(facts);
  const scores = (result) => text(result).match(/"score":\d+/g);
  assert.ok(scores(on.calendar).length > 0);
  assert.deepEqual(scores(on.calendar), scores(off.calendar));
  clean(on.myChart.shinsal);
});

test('연애 비책: 시간 미상은 판정 보류를 유지한다', () => {
  const facts = buildLoveSecretGroundingFacts(calculateLoveSecretAiSaju(loveInput(unknown), { authorityEnabled: true }));
  assert.match(text(facts), /판정 보류/);
  assert.doesNotMatch(text(facts), NAMES);
  clean(facts);
});

test('네오: 요약·근거·궁합이 후보 라벨을 쓰고 궁합 점수는 그대로다', () => {
  const self = calculateLifeBookAiSaju(known), other = calculateLifeBookAiSaju(partner);
  assert.match(neo.summarizeSaju(self).evidenceSummary, /용신 방향: /);
  const labels = approvedSajuLabels(lifeBookPillars(self));
  const summary = neo.summarizeSaju(overlayApprovedLifeBookChart(self, labels));
  assert.ok(summary.evidenceSummary.includes(`용신: ${labels.yongshinLabel}`));
  assert.doesNotMatch(summary.evidenceSummary, /용신 방향/);
  const basis = buildNeoBasisPayload(summary);
  assert.match(text(basis), NAMES);
  clean(basis);
  const rawCompat = buildNeoCompat({ method: 'saju', selfChart: self, partnerChart: other });
  const onCompat = buildNeoCompat({ method: 'saju', selfChart: self, partnerChart: other,
    approvedSaju: { self: labels, partner: approvedSajuLabels(lifeBookPillars(other)) } });
  assert.ok(rawCompat.scores.overall > 0);
  assert.deepEqual(onCompat.scores, rawCompat.scores);
  assert.match(text(onCompat), NAMES);
  clean(onCompat);
});

test('네오: 시간 미상은 판정 보류다', () => {
  const summary = neo.summarizeSaju(overlayApprovedLifeBookChart(calculateLifeBookAiSaju(unknown)));
  assert.match(summary.evidenceSummary, /용신: 판정 보류/);
  clean(buildNeoBasisPayload(summary));
});

test('마스터 연애 코덱스: OFF 는 flag 없음과 같고 ON 은 후보 라벨, signature 는 같다', () => {
  const now = new Date('2026-11-04T00:00:00Z');
  const normalized = { birthInfo: known, partnerInfo: partner };
  const off = codex.buildCharts(normalized, now, OFF);
  assert.equal(text(off), text(codex.buildCharts(normalized, now, {})));
  const on = codex.buildCharts(normalized, now, ON);
  assert.equal(on.compatibility.signature, off.compatibility.signature);
  assert.deepEqual(on.compatibility.saju.axisScores, off.compatibility.saju.axisScores);
  assert.ok(on.compatibility.saju.axisScores);
  const prompt = formatSajuForPrompt(on.saju);
  assert.match(prompt, NAMES);
  clean(prompt);
  const chapter = MASTER_LOVE_CODEX_COMPAT_CHAPTERS.find((row) => row.id === 'yongshin');
  const chapterPrompt = (charts) => buildMasterLoveCodexCompatChapterPrompt({ selfSaju: charts.saju, selfZiwei: charts.ziweiChart, partnerSaju: charts.partnerSaju, partnerZiwei: charts.partnerZiweiChart,
    compatibility: charts.compatibility, birthInfo: known, partnerInfo: partner, chapter });
  assert.match(chapterPrompt(off), /보완 축\(용신 방향\)/);
  assert.doesNotMatch(chapterPrompt(on), /보완 축\(용신 방향\)/);
  const pending = formatSajuForPrompt(codex.buildCharts({ birthInfo: unknown }, now, ON).saju);
  assert.match(pending, /판정 보류/);
  clean(pending);
});

test('카르마: 사주 렌즈만 승인 라벨로 바뀌고 시간 미상은 보류다', async () => {
  const off = await buildKarmaDestinyIntegratedResult(ON, known, {});
  const on = await buildKarmaDestinyIntegratedResult(ON, known, { authorityEnabled: true });
  assert.doesNotMatch(text(off.lenses.saju), NAMES);
  assert.match(text(on.lenses.saju), NAMES);
  clean(on.lenses.saju);
  const pending = await buildKarmaDestinyIntegratedResult(ON, unknown, { authorityEnabled: true });
  assert.match(text(pending.lenses.saju), /판정 보류/);
  clean(pending.lenses.saju);
});

test('영냥이: runtimeEnv ON 일 때만 승인 판정이 사실에 들어가고 시간 미상은 보류다', async () => {
  const asOf = '2026-11-04';
  const run = (personA, runtimeEnv) => saju.calculate({ readingMode: 'personal', personA }, { asOf, runtimeEnv });
  const off = await run(known, OFF);
  assert.equal(off.approvedSajuRules, undefined);
  assert.equal(text(off.facts), text((await run(known, {})).facts));
  const on = await run(known, ON);
  assert.ok(on.approvedSajuRules.length > 0);
  assert.match(text(on.facts), /"status":"candidates"/);
  assert.doesNotMatch(text(on.facts), /eokbuKijishin|johuKijishin|eokbuYongshin/);
  clean(on.facts);
  const pending = await run(unknown, ON);
  assert.match(text(pending.facts), /판정 보류/);
  assert.doesNotMatch(text(pending.facts), /"status":"candidates"/);
  clean(pending.facts);
});

test('사주 궁합: 승인 라벨만 더하고 입력 facts 는 그대로다', () => {
  const body = requestBody('庚午 辛巳 庚辰 庚辰', '戊辰 壬戌 甲子 乙亥');
  assert.doesNotMatch(buildSajuCompatFactsBlock(body), /용신 후보·기신 판정/);
  const approved = withApprovedSajuCompat(body);
  assert.deepEqual(approved.facts, body.facts);
  const facts = buildSajuCompatFactsBlock(approved);
  assert.match(facts, /용신 후보·기신 판정/);
  assert.match(facts, NAMES);
  clean(facts);
  const pending = withApprovedSajuCompat({ ...body, self: { ...body.self, birthTimeUnknown: true } });
  assert.match(buildSajuCompatFactsBlock(pending), /판정 보류/);
});

const sajuResult = { input: { year: 1990, month: 5, day: 15 }, pillars: { y: { g: '경', j: '오' }, m: { g: '신', j: '사' }, d: { g: '경', j: '진' }, h: { g: '경', j: '진' } },
  natal: { wood: 0, fire: 2, earth: 2, metal: 4, water: 0 }, power: { isStrong: true, score: 50, yongshin: ['water'], kijishin: ['fire'] } };
const mailSub = (birthHour = 8) => ({ email: 'a@example.com', birthYear: 1990, birthMonth: 5, birthDay: 15, birthHour, sajuSnapshot: sajuResult });
const today = getTodayPillars(new Date('2026-11-04T00:00:00Z').getTime());

test('일일 메일: OFF 는 기존 문장, ON 은 후보 문장, 미상은 보류 문장이다', () => {
  const off = daily.buildSajuFortuneHtml(daily.buildSajuMailContext(mailSub(), today));
  assert.match(off, /기운을 살리는 선택을 가까이/);
  const on = daily.buildSajuFortuneHtml(daily.buildSajuMailContext(mailSub(), today, { authorityEnabled: true }));
  assert.match(on, /도움이 될 수 있는 후보로 참고/);
  assert.doesNotMatch(on, /기운을 살리는 선택을|보완 기운|undefined/);
  const pending = daily.buildSajuFortuneHtml(daily.buildSajuMailContext(mailSub(null), today, { authorityEnabled: true }));
  assert.match(pending, /보류/);
  assert.doesNotMatch(pending, /도움이 될 수 있는 후보로 참고|undefined/);
});

test('사주 AI: 근거 패널에 단일 용신 대신 승인 후보와 격국이 나온다', () => {
  const raw = buildSajuAIPrompt({ question: '명식 근거 확인', sajuResult });
  assert.match(text(raw.analysisBasis), /water/);
  const sajuAuthority = selectSajuPromptAuthority(sajuResult, { enabled: true, hasExistingRecord: false });
  const built = buildSajuAIPromptWithDomain({ question: '명식 근거 확인', sajuResult, sajuAuthority });
  const labels = approvedSajuLabels({ year: '庚午', month: '辛巳', day: '庚辰', hour: '庚辰' });
  const basis = text(built.analysisBasis);
  assert.ok(basis.includes(labels.gyeokguk));
  for (const name of labels.candidateNames) assert.ok(basis.includes(name));
  assert.match(basis, /추가 판정이 필요한 항목/);
  assert.doesNotMatch(basis, /water/);
  clean(built.analysisBasis);
});
