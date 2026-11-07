import test from 'node:test';
import assert from 'node:assert/strict';
import { requestBody } from '../fixtures/saju-compat-llm-fixture.mjs';
import { assembleSajuCompatSnapshot, normalizeSajuCompatInput, sajuCompatTasks } from '../../worker/lib/saju-compat-schema.js';
import { buildSajuCompatFactsBlock, withApprovedSajuCompat } from '../../worker/lib/saju-compat-prompts.js';
import { renderSajuCompat } from '../../js/saju-compat-render.mjs';

// 화면·재열람이 프롬프트가 읽은 승인 판정(approvedSaju)을 그대로 보이는지, 이전 기록은 이전 화면 그대로인지 확인한다.
// 고정 짝: 당신 신약(후보 화·목), 상대 신강(후보 목·화·토) — 양쪽 값이 달라 역할이 뒤바뀌면 바로 드러난다.
const SELF = '甲子 乙丑 丙寅 丁卯';
const PARTNER = '己未 癸酉 壬午 癸亥';
const NARRATIVE = {
  overview: '두 사람은 서로의 속도를 맞춰 갑니다.',
  reality: { strength: '주도권은 상대 쪽에 있습니다.', repeatScene: '약속을 정할 때 망설입니다.', recovery: '먼저 고마움을 말합니다.' },
};

function build({ approved = false, partnerTimeUnknown = false } = {}) {
  const body = requestBody(SELF, PARTNER, 'love', '하늘');
  if (partnerTimeUnknown) body.partner.birthTimeUnknown = true;
  const normalized = normalizeSajuCompatInput(body);
  const input = approved ? withApprovedSajuCompat(normalized) : normalized;
  const snapshot = assembleSajuCompatSnapshot({ input, tasks: sajuCompatTasks(input), parts: {} });
  snapshot.narrative = structuredClone(NARRATIVE);
  return { input, snapshot };
}
const textOf = (html) => String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('새 결과는 프롬프트가 읽은 approvedSaju 를 그대로 저장하고, 플래그 OFF 입력에는 키가 없다', () => {
  const { input, snapshot } = build({ approved: true });
  assert.deepEqual(snapshot.approvedSaju, input.approvedSaju);
  const block = JSON.parse(buildSajuCompatFactsBlock(input));
  assert.deepEqual(block['신강·신약'], { 당신: snapshot.approvedSaju.self.strength, 상대: snapshot.approvedSaju.partner.strength });
  assert.equal(block['용신 후보·기신 판정']['당신 용신'], snapshot.approvedSaju.self.yongshinLabel);
  assert.equal(block['용신 후보·기신 판정']['상대 용신'], snapshot.approvedSaju.partner.yongshinLabel);
  assert.deepEqual([snapshot.approvedSaju.self.strength, snapshot.approvedSaju.partner.strength], ['신약', '신강']);
  assert.equal('approvedSaju' in build().snapshot, false);
});

test('화면은 승인 강약과 용신 후보를 후보 문구로 보이고 당신·상대 역할을 바꾸지 않는다', () => {
  const { snapshot } = build({ approved: true });
  const text = textOf(renderSajuCompat(snapshot, { selfName: '나' }));
  const selfRow = '나 — 일간 강약: 신약 · 용신: 보완 후보 화(火)·목(木)';
  const partnerRow = '하늘 — 일간 강약: 신강 · 용신: 보완 후보 목(木)·화(火)·토(土)';
  assert.ok(text.includes(selfRow), text);
  assert.ok(text.includes(partnerRow), text);
  assert.ok(text.indexOf(selfRow) < text.indexOf(partnerRow));
  assert.ok(text.includes('흡수 주의보'), '상대 신강·당신 신약 → 상대 쪽이 이끄는 강약 표제');
  assert.doesNotMatch(text, /용신: (?!보완 후보|판정 보류|단일 용신 미확정)/);
});

test('판정 보류는 보류로 남고 확정값으로 올리지 않는다', () => {
  const { input, snapshot } = build({ approved: true, partnerTimeUnknown: true });
  assert.equal(JSON.parse(buildSajuCompatFactsBlock(input))['신강·신약']['상대'], '판정 보류');
  const text = textOf(renderSajuCompat(snapshot, { selfName: '나' }));
  assert.ok(text.includes('하늘 — 일간 강약: 판정 보류 · 용신: 판정 보류'), text);
  assert.ok(text.includes('나 — 일간 강약: 신약 · 용신: 보완 후보 화(火)·목(木)'));
  assert.ok(text.includes('강약 판정 보류'));
  assert.ok(!text.includes('흡수 주의보') && !text.includes('힘의 불균형 경보') && !text.includes('강대강 / 약대약'));
});

test('이전 기록의 승인 판정과 저장 원문은 새 레이아웃에서도 그대로 읽는다', () => {
  const { snapshot } = build();
  snapshot.promptVersion = "saju-compat-basic-p2";
  const before = JSON.stringify(snapshot);
  const html = renderSajuCompat(snapshot, { selfName: '나' });
  for (const prose of [NARRATIVE.overview, ...Object.values(NARRATIVE.reality)]) assert.equal(html.split(prose).length, 2);
  assert.doesNotMatch(html, /past-ferry.webp/);
  assert.ok(!html.includes('compat-approved') && html.includes('흡수 주의보'));
  assert.equal(JSON.stringify(snapshot), before);
  for (const approvedSaju of [null, 'x', {}, { self: {}, partner: {} }, { self: { isStrong: 'yes', status: 'candidates' }, partner: { isStrong: true, status: 'candidates' } }]) {
    assert.equal(renderSajuCompat({ ...snapshot, approvedSaju }, { selfName: '나' }), html);
  }
  const { snapshot: approved } = build({ approved: true });
  const stored = JSON.stringify(approved);
  renderSajuCompat(approved, { selfName: '나' });
  assert.equal(JSON.stringify(approved), stored);
});
