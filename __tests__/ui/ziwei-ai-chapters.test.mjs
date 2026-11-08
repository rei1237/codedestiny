import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const load = async (entry) => {
  const bundle = await build({entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false, packages: 'external'});
  return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
};
const {buildZiweiAiPdfChapters, isZiweiAiPlanV2} = await load('lib/ziwei/ziwei-ai-chapters.ts');

const sections = {
  core_answer: {title: '질문에 대한 답', body: '지금은 옮기기보다 준비할 때입니다.'},
  personality_profile: {title: '타고난 성향', body: '**명궁의 자미**\n중심을 지키는 사람입니다.'},
  reading_guide: {title: '명반 읽는 법', body: '명궁부터 봅니다.'},
  career: {title: '일과 자리', body: '관록궁이 단단합니다.'},
  wealth: {title: '재물', body: ''},
};
const messages = [{role: 'user', content: '올해 이직해도 될까요?'}, {role: 'assistant', content: JSON.stringify({meta: {}, sections})}];

test('판 2 상담 PDF는 본성 장이 먼저 오고 부 이름·무성 표시를 달며 빈 섹션은 뺀다', () => {
  const chapters = buildZiweiAiPdfChapters({messages, groupPlanVersion: 2});
  assert.deepEqual(chapters.map((chapter) => chapter.title), ['타고난 성향', '질문에 대한 답', '명반 읽는 법', '일과 자리']);
  assert.equal(chapters[0].kicker, '1부 · 타고난 본성');
  assert.equal(chapters[3].kicker, '4부 · 일과 재물');
  assert.ok(chapters.every((chapter) => chapter.speaker === '무성'));
  assert.ok(chapters[0].body.startsWith('● 명궁의 자미'));
});

test('판 1 상담은 예전 순서 그대로이고 부 이름이 없다', () => {
  const chapters = buildZiweiAiPdfChapters({messages});
  assert.deepEqual(chapters.map((chapter) => chapter.title), ['질문에 대한 답', '타고난 성향', '일과 자리', '명반 읽는 법']);
  assert.ok(chapters.every((chapter) => chapter.kicker === ''));
  assert.equal(isZiweiAiPlanV2({llmMeta: {groupPlanVersion: 2}}), true);
  assert.equal(isZiweiAiPlanV2({groups: {nature: {}}}), true);
});

test('구조화되지 않은 예전 답변은 한 장으로, 답변이 없으면 장이 없다', () => {
  assert.deepEqual(buildZiweiAiPdfChapters({messages: [{role: 'assistant', content: '자미성이 명궁에 있습니다.'}]}).map((c) => c.title), ['자미두수 상담']);
  assert.deepEqual(buildZiweiAiPdfChapters({messages: []}), []);
});
