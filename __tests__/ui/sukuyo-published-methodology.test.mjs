import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:'export { INSIGHT_SEED_ARTICLES } from "./app/insights/seed-articles.js"; export { buildSukuyoFromMoonLongitude } from "./worker/lib/sukuyo-coordinate.js";',resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const {INSIGHT_SEED_ARTICLES,buildSukuyoFromMoonLongitude}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const body=slug=>INSIGHT_SEED_ARTICLES.find(a=>a.slug===slug).contentHtml;
test('공개 27숙 계산 예시는 현행 계산 코어의 이름 배정과 일치한다',()=>{
  const text=body('sukuyo-27-mansions');
  for(const [longitude,name] of [[0,'묘'],[20,'필']]) {
    assert.equal(buildSukuyoFromMoonLongitude(longitude).nameKo,name);
    assert.ok(text.includes(`${longitude}도`));
    assert.ok(text.includes(`${name}숙`));
  }
  assert.match(text,/13도 20분/);
  assert.match(text,/실제 생일을 계산한 사례가 아니라/);
});
test('관련 원고가 폐기된 음력 날짜표를 현행 계산으로 안내하지 않는다',()=>{
  for(const slug of ['sukuyo-what-is','sukuyo-compatibility-guide','sukuyo-27-mansions','sukuyo-bonmyeongsuk-vs-wolmyeongsuk','sukuyo-vs-saju-compatibility']) {
    const text=body(slug);
    assert.match(text,/항성.*달.*황경/,slug);
    assert.doesNotMatch(text,/기본 본명숙은 음력 날짜표로 구합니다|기본 계산은 출생 시각을 반영하지 않으며|월별 시작 위치는 11/,slug);
  }
});
test('랜딩과 비교 FAQ도 같은 계산 기준과 시간 미상 한계를 설명한다',()=>{
  const landing=readFileSync('lib/seo-landing-pages.js','utf8').split('  sukuyo: page({')[1].split('  nakshatra: page({')[0];
  const comparison=readFileSync('app/compare/sukuyo-vs-vedic/page.tsx','utf8');
  for(const text of [landing,comparison]){
    assert.match(text,/라히리/);
    assert.match(text,/기본 시각/);
    assert.doesNotMatch(text,/음력 월일 대응으로 본명숙을 찾고|실제 자기 모습에 가까운 쪽을 기준/);
  }
});
