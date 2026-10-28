import {test} from 'node:test';
import assert from 'node:assert/strict';
import {correctGyeokgukText,gyeokgukClaimFact,gyeokgukPromptRules} from '../../lib/saju/gyeokguk-claim-guard.mjs';

// 본 화면 AI 섹션 후처리(worker/routes/fortune.js runSectionGroup)가 쓰는 텍스트 단위 가드.
const fact=gyeokgukClaimFact({finalGyeokguk:'건록격',finalType:'일반격',judgmentReason:'월지 녹지'});

test('a re-judged 격국 becomes the formal template once, keeping list markers; headings and repeats are dropped',()=>{
  const text=['## 가색격의 흐름','- 이 명식은 가색격(稼穡格)입니다. 재관이 살아 있습니다.','과거 경험으로 보면 종격으로 볼 수 있습니다.','건록격은 일반격으로 봅니다.'].join('\n');
  const out=correctGyeokgukText(text,fact);
  assert.equal(out.replaced,1);
  assert.equal(out.dropped,2);
  assert.equal(out.text,['- 격국은 건록격(일반격)으로 봅니다. 재관이 살아 있습니다.','','건록격은 일반격으로 봅니다.'].join('\n'));
  const clean='건록격이라 재관을 쓰는 방식으로 읽습니다.';
  assert.deepEqual(correctGyeokgukText(clean,fact),{text:clean,replaced:0,dropped:0});
});

test('no settled 격국 drops every 격국 claim, hierarchy and 가종 stigma, but never returns an empty text',()=>{
  const out=correctGyeokgukText('정격은 특수격보다 격이 낮습니다. 가종격은 가짜라 불안정합니다. 올해는 재정 정리가 좋습니다.',gyeokgukClaimFact({finalGyeokguk:'미정',finalType:''}));
  assert.equal(out.text,'올해는 재정 정리가 좋습니다.');
  assert.equal(out.dropped,2);
  assert.equal(correctGyeokgukText('가색격입니다.',null).text,'가색격입니다.');
  assert.match(gyeokgukPromptRules(null).join(' '),/격국·종격·가종 이름을 쓰지 않는다/);
});
