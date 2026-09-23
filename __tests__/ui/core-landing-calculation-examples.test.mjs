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
const built=await build({stdin:{contents:`export {domains} from './worker/yeongnyangi/fortune/index'; export {calcZiweiPalaces} from './app/_lib/ziwei-engine'; export {NAKSHATRA_CROSSWALK,CROSSWALK_OFFSET} from './constants/nakshatra-crosswalk.js'; export {NAKSHATRA_ATTRIBUTES} from './constants/nakshatra-attributes.js'; export {getFusionBySukuyo} from './constants/nakshatra-fusion.js';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('core-landing-calculation-examples.cjs');
const loaded=new Module(filename);
loaded.filename=filename;
loaded.paths=Module._nodeModulePaths(process.cwd());
loaded._compile(built.outputFiles[0].text,filename);
const {domains,calcZiweiPalaces,NAKSHATRA_CROSSWALK,CROSSWALK_OFFSET,NAKSHATRA_ATTRIBUTES,getFusionBySukuyo}=loaded.exports;

const landing=(from,to)=>readFileSync('lib/seo-landing-pages.js','utf8').split(`  ${from}: page({`)[1].split(`  ${to}: page({`)[0];
const sajuGuide=readFileSync('app/saju/guide/page.js','utf8');
const chartPage=readFileSync('app/ziwei/chart/page.tsx','utf8');
const vedicGuide=readFileSync('app/vedic/guide/page.js','utf8');
const astrologyGuide=readFileSync('app/astrology/guide/page.js','utf8');
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

async function chartFacts(domain,birthTime=SEO_EXAMPLE_BIRTH.birthTime){
  const input=domains[domain].validateInput({personA:{...SEO_EXAMPLE_BIRTH,birthTime},question:'차트 예시'});
  const context=domains[domain].buildContext(await domains[domain].calculate(input,{asOf:'2026-09-15T00:00:00Z'}));
  return label=>context.facts.find(item=>item.label===label)?.value;
}
const fixed=value=>Number(value).toFixed(2);

test('베다·점성술 랜딩과 가이드의 차트 예시는 베다·점성술 엔진 결과와 일치한다',async()=>{
  const vedic=await chartFacts('vedic');
  const lagna=vedic('lagna');
  const [sun,moon]=[vedic('sun'),vedic('moon')];
  const dasha=vedic('vimshottariDasha');
  assert.equal(fixed(vedic('ayanamsaDegree')),'23.82');
  assert.deepEqual([lagna.sign,fixed(lagna.degree),lagna.nakshatra],['Gemini','14.49','Ardra']);
  assert.deepEqual([sun.sign,fixed(sun.degree),sun.house],['Capricorn','27.71',8]);
  assert.deepEqual([moon.sign,fixed(moon.degree),fixed(moon.longitude),moon.house,moon.nakshatra,moon.pada],['Pisces','4.35','334.35',10,'Uttara Bhadrapada',1]);
  assert.equal(fixed(moon.longitude-25*40/3),'1.02');
  assert.equal(vedic('moonNakshatra').lord,'Saturn');
  assert.deepEqual([dasha.firstDashaLord,fixed(dasha.birthBalanceYears)],['Saturn','17.55']);
  assert.deepEqual(dasha.periods.slice(0,3).map(item=>[item.lord,item.endDate]),[['Saturn','2014-08-31'],['Mercury','2031-08-31'],['Ketu','2038-08-31']]);
  assert.equal(vedic('planets').find(item=>item.name==='Mars').sign,'Virgo');
  assert.ok(vedic('yogas').some(item=>item.name==='Chandra Mangala Yoga'));

  const astro=await chartFacts('astrology');
  const planets=astro('planets');
  assert.deepEqual([planets.Sun.longitude,planets.Sun.sign,planets.Sun.degree,planets.Sun.house],[321.52,10,21.52,9]);
  assert.deepEqual([planets.Moon.sign,planets.Moon.degree,planets.Moon.house],[11,28.17,10]);
  assert.deepEqual([astro('ascendant').sign,astro('ascendant').degree,astro('midheaven').sign,astro('midheaven').degree],[3,8.31,11,18.92]);
  assert.equal(astro('houseSystem'),'placidus');
  const aspects=[...astro('aspects')].sort((a,b)=>a.orb-b.orb);
  const aspect=(p1,p2)=>aspects.find(item=>item.p1===p1&&item.p2===p2);
  assert.deepEqual([aspects[0].p1,aspects[0].p2,aspects[0].type,aspects[0].orb],['Jupiter','Saturn','sextile',0.07]);
  const personal=aspects.find(item=>['Sun','Moon','Mercury','Venus','Mars'].some(name=>[item.p1,item.p2].includes(name)));
  assert.deepEqual([personal.p1,personal.p2,personal.type,personal.orb],['Moon','Neptune','sextile',0.16]);
  assert.deepEqual([aspect('Moon','Saturn').type,aspect('Moon','Saturn').orb,aspect('Moon','Mars').type,aspect('Moon','Mars').orb],['conjunction',6.34,'opposition',7.64]);

  const texts=[['vedic',landing('vedic','dream')],['vedic-guide',vedicGuide],['astrology',landing('astrology','sukuyo')],['astrology-guide',astrologyGuide]];
  for(const [name,text] of texts){
    assert.match(text,/실제 고객 사례가 아니라/,name);
    assert.ok(text.includes('23.82도'),`${name} 아야남샤`);
  }
  for(const [name,text] of texts.filter(([key])=>key.startsWith('vedic'))){
    for(const value of ['염소자리 27.71도','쌍둥이자리 14.49도','334.35도','우타라 바드라파다(333.33~346.67도)','토성','17.55년','2014년 8월 31일','2031년 8월 31일','8하우스','10하우스']) assert.ok(text.includes(value),`${name} ${value}`);
  }
  for(const [name,text] of texts.filter(([key])=>key.startsWith('astrology'))){
    for(const value of ['물병자리 21.52도','물고기자리 28.17도','게자리 8.31도','물고기자리 18.92도','9하우스','10하우스','0.16도','6.34도','7.64도']) assert.ok(text.includes(value),`${name} ${value}`);
  }
  assert.match(landing('astrology','sukuyo'),/목성과 토성의 육각\(0\.07도\)/);
  // 나크샤트라와 숙요 27수를 역사적 일대일 대응으로 적던 문장이 돌아오지 않게 막는다.
  assert.doesNotMatch(landing('vedic','dream'),/하나씩 대응합니다/);
  for(const [from,to] of [['astrology','sukuyo'],['vedic','dream']]) assert.match(landing(from,to),/dateModified: "\d{4}-\d{2}-\d{2}"/,from);
});

test('나크샤트라 랜딩의 체계 비교·계산 예시는 베다 엔진과 서비스 정렬표에 묶인다',async()=>{
  const moon=(await chartFacts('vedic'))('moon');
  const earlier=(await chartFacts('vedic','12:30'))('moon');
  const aligned=NAKSHATRA_CROSSWALK.find(item=>item.nakshatraIdx===25);
  const earlierAligned=NAKSHATRA_CROSSWALK.find(item=>item.nakshatraIdx===24);
  assert.equal(CROSSWALK_OFFSET,11);
  assert.deepEqual([Math.floor(moon.longitude/(40/3)),aligned.sukuyoIdx,aligned.sukuyoKo,aligned.sukuyoHan],[25,14,'루','婁']);
  assert.deepEqual([NAKSHATRA_ATTRIBUTES[25].lord,NAKSHATRA_ATTRIBUTES[25].gana],['Saturn','Manushya']);
  assert.ok(getFusionBySukuyo(14).fusionTitle.startsWith('연결을 깊이 안정시키는 손 — '));
  assert.deepEqual([earlier.nakshatra,earlierAligned.sukuyoKo,earlierAligned.sukuyoHan],['Purva Bhadrapada','규','奎']);
  // 역사 대응(오프셋 13)에서 각수는 치트라(13), 서비스 정렬(오프셋 11)에서는 우타라 팔구니(11)라 두 칸 차이다.
  assert.deepEqual([NAKSHATRA_CROSSWALK[0].sukuyoKo,NAKSHATRA_CROSSWALK[0].nakshatraIdx,NAKSHATRA_ATTRIBUTES[13].nameEn],['각',11,'Chitra']);
  const text=landing('nakshatra','vedic');
  assert.match(text,/dateModified: "\d{4}-\d{2}-\d{2}"/);
  assert.match(text,/실제 고객 사례가 아니라/);
  for(const value of ['334.35도','우타라 바드라파다(333.33~346.67도)','약 1.02도','마누샤(인간)','루수(婁)','연결을 깊이 안정시키는 손','푸르바 바드라파다와 규수(奎)','낮 12시 30분','11을 더해 27로 나눈 나머지','치트라와 짝짓는 방식과는 두 칸 차이']) assert.ok(text.includes(value),value);
  const renderer=readFileSync('app/nakshatra/NakshatraLanding.jsx','utf8');
  assert.match(renderer,/sections\.map\(/);
  assert.match(renderer,/\.\.\.\(dateModified \? \{ dateModified \} : \{\}\)/);
  assert.match(renderer,/<ContentIntegrityNote[^>]*dateModified=\{dateModified\}/);
});
