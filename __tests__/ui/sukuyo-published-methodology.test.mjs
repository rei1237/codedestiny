import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:'export { INSIGHT_SEED_ARTICLES } from "./app/insights/seed-articles.js"; export { INSIGHT_SEO_TITLES } from "./app/insights/seo-titles.js"; export { buildSukuyoFromMoonLongitude } from "./worker/lib/sukuyo-coordinate.js"; export { NAKSHATRA_CROSSWALK } from "./constants/nakshatra-crosswalk.js";',resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const {INSIGHT_SEED_ARTICLES,INSIGHT_SEO_TITLES,buildSukuyoFromMoonLongitude,NAKSHATRA_CROSSWALK}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
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
test('숙요 연애·결혼 글은 빈도와 장기 안정성을 관찰값처럼 단정하지 않는다',()=>{
  const love=body('sukuyo-love');
  const marriage=body('sukuyo-marriage');
  for(const [slug,text] of [['sukuyo-love',love],['sukuyo-marriage',marriage]]) {
    assert.match(text,/관찰 (자료|통계)|빈도 자료|통계는 확인하지 못했다/,slug);
    assert.doesNotMatch(text,/결혼 제도와 가장 잘 맞는|충돌 빈도가 올라간다|장기 안정성을 봅니다/,slug);
  }
  assert.match(marriage,/결혼 기간, 이혼 위험, 갈등 빈도, 회복 속도 같은 장기 안정성 지표를 계산하지 않는다/);
  assert.match(love,/실제 대화·동의·행동 기록/);
});
test('나크샤트라 랜딩은 역사적 대응과 서비스 계산 정렬을 구분한다',()=>{
  const landing=readFileSync('lib/seo-landing-pages.js','utf8').split('  nakshatra: page({')[1].split('  vedic: page({')[0];
  const component=readFileSync('app/nakshatra/NakshatraLanding.jsx','utf8');
  const angle=NAKSHATRA_CROSSWALK.find((entry)=>entry.sukuyoHan==='角');
  assert.equal(angle?.nakshatraEn,'Uttara Phalguni');
  assert.match(landing,/역사적 동일성 표가 아니라 현재 서비스 계산 결과를 비교하는 정렬표/);
  assert.match(landing,/고정 오프셋/);
  assert.doesNotMatch(landing,/각\(角\)=치트라|양쪽이 같은 여분을 덜어냈기에/);
  assert.match(component,/NAKSHATRA_CROSSWALK\.map/);
  assert.doesNotMatch(component,/const HANGUL|const NAKSHATRA\s*=/);
});
test('나크샤트라 설명 글은 공개 출처와 시간 미상 한계를 함께 제시한다',()=>{
  const text=body('nakshatra-what-is');
  assert.match(text,/doi\.org\/10\.3390\/rel14101276/);
  assert.match(text,/eco\.mtk\.nao\.ac\.jp/);
  assert.match(text,/역사 문헌의 대표 별 대응표와 서비스의 계산 인덱스 정렬은 목적이 다르므로/);
  assert.match(text,/시각을 모르면 화면에 안내한 기본 시각을 적용하고 파다를 표시하지 않습니다/);
});
test('나크샤트라 검색 제목은 H1을 줄이지 않고 표시 폭 한도를 지킨다',()=>{
  const searchTitle=`${INSIGHT_SEO_TITLES['nakshatra-what-is']} | 운세 인사이트`;
  const width=[...searchTitle].reduce((sum,char)=>sum+(/[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/u.test(char)?2:1),0);
  assert.equal(INSIGHT_SEED_ARTICLES.find((article)=>article.slug==='nakshatra-what-is').title,'나크샤트라란? 27개 달 구간의 계산과 숙요 비교');
  assert.ok(width<=60,`${searchTitle}: ${width}`);
});
