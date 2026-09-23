import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
import {SEO_EXAMPLE_BIRTH} from '../../lib/seo-reading-examples.js';

// 핵심 랜딩의 가상 계산 예시를 사주 엔진·명반 도구 엔진의 실제 결과에 묶는다(verify-yeongnyangi-engines 와 같은 적재 방식).
const require=createRequire(import.meta.url);
const Module=require('node:module');
const built=await build({stdin:{contents:`export {domains} from './worker/yeongnyangi/fortune/index'; export {calcZiweiPalaces} from './app/_lib/ziwei-engine';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('core-landing-calculation-examples.cjs');
const loaded=new Module(filename);
loaded.filename=filename;
loaded.paths=Module._nodeModulePaths(process.cwd());
loaded._compile(built.outputFiles[0].text,filename);
const {domains,calcZiweiPalaces}=loaded.exports;

const landing=(from,to)=>readFileSync('lib/seo-landing-pages.js','utf8').split(`  ${from}: page({`)[1].split(`  ${to}: page({`)[0];
const sajuGuide=readFileSync('app/saju/guide/page.js','utf8');
const chartPage=readFileSync('app/ziwei/chart/page.tsx','utf8');
async function sajuFacts(birthDate){
  const input=domains.saju.validateInput({personA:{...SEO_EXAMPLE_BIRTH,birthDate},question:'명식 예시'});
  const context=domains.saju.buildContext(await domains.saju.calculate(input,{asOf:'2026-09-15T00:00:00Z'}));
  return label=>context.facts.find(item=>item.label===label)?.value;
}

test('만세력 랜딩과 사주 가이드의 명식 예시는 사주 엔진 결과와 일치한다',async()=>{
  const fact=await sajuFacts(SEO_EXAMPLE_BIRTH.birthDate);
  assert.deepEqual(fact('pillars'),{year:'丁丑',month:'壬寅',day:'癸未',hour:'己未'});
  const {counts,dominant}=fact('fiveElements');
  assert.deepEqual([dominant,counts.earth,counts.metal],['earth',4,0]);
  const tenGods=fact('tenGodsByPillar');
  assert.deepEqual([tenGods.year.stemTenGod,tenGods.month.stemTenGod,tenGods.hour.stemTenGod],['편재','겁재','편관']);
  const beforeIpchun=(await sajuFacts('1997-02-03'))('pillars');
  assert.deepEqual([beforeIpchun.year,beforeIpchun.month],['丙子','辛丑']);
  for(const [name,text] of [['manse',landing('manse','today')],['saju-guide',sajuGuide]]){
    for(const pillar of ['丁丑','壬寅','癸未','己未','丙子','辛丑']) assert.ok(text.includes(pillar),`${name} ${pillar}`);
    assert.match(text,/실제 고객 사례가 아니라/,name);
  }
  assert.match(sajuGuide,/토가 丑·未·己·未의 넷으로 가장 많고 금은 하나도 없습니다/);
  assert.match(sajuGuide,/연간 丁은 편재, 월간 壬은 겁재, 시간 己는 편관/);
});

test('자미두수 랜딩과 명반 페이지의 명반 예시는 명반 도구 엔진 결과와 일치한다',()=>{
  const chart=calcZiweiPalaces(1997,2,10,14,30,'F');
  assert.deepEqual([chart.meng,chart.body,chart.juInfo],['미','유','수2국']);
  assert.deepEqual(chart.sihua,{luk:'태음',quan:'천동',ke:'천기',ji:'거문'});
  const at=branch=>{const palace=chart.palaceStarData.find(item=>item.branch===branch);return [palace.palace,palace.stars.map(star=>star.name).sort().join('+')];};
  assert.deepEqual(at('미'),['명궁','천량']);
  assert.deepEqual(at('인'),['질액궁','자미+천부']);
  const sihua=[['재백궁','태음','화록',at('묘')],['복덕궁','천동','화권',at('유')],['천이궁','천기','화과',at('축')],['부부궁','거문','화기',at('사')]];
  for(const [palace,star,,actual] of sihua) assert.deepEqual(actual,[palace,star]);
  for(const [name,text] of [['ziwei',landing('ziwei','astrology')],['ziwei-chart',chartPage]]){
    assert.match(text,/실제 고객 사례가 아니라/,name);
    assert.match(text,/수이국/,name);
    assert.match(text,/천량/,name);
    assert.match(text,/자미성은 寅/,name);
    for(const [palace,star,hua] of sihua) assert.match(text,new RegExp(`${palace}[^,]{0,6}${star}[^,]{0,3}${hua}`),`${name} ${palace}`);
  }
});

test('명반 FAQ 는 화면과 JSON-LD 를 한 배열에서 만들고, 본문 수정일은 검수 노트와 WebPage 에 함께 싣는다',()=>{
  assert.match(chartPage,/buildFaqPageJsonLd\(ZIWEI_CHART_FAQS\)/);
  assert.match(chartPage,/ZIWEI_CHART_FAQS\.map\(/);
  assert.doesNotMatch(chartPage,/"@type": "FAQPage"/);
  const template=readFileSync('app/components/SeoLandingTemplate.jsx','utf8');
  assert.match(template,/dateModified=\{dateModified\}/);
  assert.match(template,/\.\.\.\(dateModified \? \{ dateModified \} : \{\}\)/);
  for(const [from,to] of [['saju','manse'],['manse','today'],['ziwei','astrology']]) assert.match(landing(from,to),/dateModified: "\d{4}-\d{2}-\d{2}"/,from);
  // 도구 폼과 같은 높이의 자리를 서버 HTML 에 잡아 둬야 도구 아래 서버 본문이 붙을 때 밀리지 않는다.
  assert.match(chartPage,/<div className="min-h-\[100dvh\]">\s*<ZiweiChartClientLoader \/>/);
});
