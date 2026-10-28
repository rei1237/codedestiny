import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeNatalCore} from '../../lib/saju/natal-core/index.mjs';
import {STEM_ORDER,BRANCH_ORDER,STEM_EL,relationOf} from '../../lib/saju/natal-core/tables.mjs';
import {careerEvidence,careerAxis,hiddenInsights} from '../../lib/saju/career-style/evidence.mjs';
import {GOD_WORK,AXIS_MODES,COMBINATION_WORK} from '../../lib/saju/career-style/depth-copy.mjs';
import {AXES} from '../../lib/saju/career-style/copy.mjs';
import {buildCareerReport,careerShare} from '../../lib/saju/career-style/report.mjs';
const chart=text=>Object.fromEntries(['y','m','d','h'].map((p,i)=>[p,text[i]?{g:text[i][0],j:text[i][1]}:null]));
const analyze=text=>analyzeNatalCore(chart(text));

test('월령 선택은 월지 본기와 구분하며 투간한 중기를 보존한다',()=>{
 const core=analyze(['丙子','戊寅','庚辰','壬午']);
 assert.equal(core.monthStructure.chosen.stem,'丙');
 const e=careerEvidence(core);
 assert.equal(e.picked.stem,'丙');assert.equal(e.selectedGod,'편관');
 const row=e.hidden.find(h=>h.pos==='m'&&h.stem==='丙');
 assert.equal(row.layer,'중기');assert.deepEqual(row.exposedAt,['y']);
 assert.equal(core.hidden.m.at(-1).stem,'甲');
});
test('다섯 관계군의 서로 다른 10개 조합을 중복 없이 다룬다',()=>{
 const families=['self','parent','output','wealth','officer'];
 const pairs=new Set(COMBINATION_WORK.map(c=>[...c.families].sort().join(':')));
 assert.equal(pairs.size,10);assert.equal(COMBINATION_WORK.length,10);
 for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)assert.ok(pairs.has([families[i],families[j]].sort().join(':')));
});
test('충은 뿌리를 지우지 않으며 합과 충 기록은 함께 보존한다',()=>{
 const c=analyze(['甲寅','己亥','甲申','丙午']);const e=careerEvidence(c);
 assert.ok(e.interactions.some(r=>r.id.startsWith('stem-')));
 assert.ok(e.interactions.some(r=>r.id.startsWith('liuhe-')));
 assert.ok(e.interactions.some(r=>r.id.startsWith('chung-')));
 assert.ok(e.hidden.some(h=>h.pos==='y'&&h.stem==='甲'&&h.weakenedBy.includes('충')));
 assert.ok(e.rootInsight.basis.includes('충으로 약화'));
 assert.deepEqual(c,analyze(['甲寅','己亥','甲申','丙午']));
});
test('왕지 없는 부분합과 반합, 완성 삼합·방합을 구별한다',()=>{
 const partial=careerEvidence(analyze(['甲申','丁寅','甲辰','己巳']));
 assert.ok(!partial.interactions.some(r=>r.id==='samhap-申子辰'));
 const half=careerEvidence(analyze(['甲申','丁子','甲寅','己巳']));
 assert.match(half.interactions.find(r=>r.id==='samhap-申子辰').title,/반합/);
 const full=careerEvidence(analyze(['甲申','丁子','甲辰','己巳']));
 assert.match(full.interactions.find(r=>r.id==='samhap-申子辰').title,/구성 완비/);
 const bang=careerEvidence(analyze(['甲寅','丁卯','甲辰','己巳']));
 assert.ok(bang.interactions.some(r=>r.id.startsWith('banghap-')));
});
test('10 일간 × 12 월지 × 12 일지 × 시각 유무의 2,880 구조에서 근거 손실 없이 분기한다',()=>{
 const modes=new Set(),gods=new Set(),stemStates=new Set();let count=0;
 for(let s=0;s<10;s++)for(let m=0;m<12;m++)for(let d=0;d<12;d++)for(const known of [false,true]){
  // 임의 원국은 편집 분기 검사용이며 실제 달력의 생년월일 사례라고 주장하지 않는다.
  const c=analyzeNatalCore({y:{g:STEM_ORDER[(s+5)%10],j:BRANCH_ORDER[(m+6)%12]},m:{g:STEM_ORDER[(d+2)%10],j:BRANCH_ORDER[m]},d:{g:STEM_ORDER[s],j:BRANCH_ORDER[d]},h:known?{g:STEM_ORDER[(s+d)%10],j:BRANCH_ORDER[(d+4)%12]}:null});
  const e=careerEvidence(c);count++;
  assert.equal(e.hidden.length,Object.values(c.hidden).flat().length);
  assert.deepEqual(e.hidden.filter(h=>h.pos==='h').map(h=>h.stem),(c.hidden.h||[]).map(h=>h.stem));
  const expected=c.relations.stems.length+c.relations.branches.liuhe.length+c.relations.branches.chung.length+
   [...c.relations.branches.samhap,...c.relations.branches.banghap].filter(r=>['half','full'].includes(r.state)).length;
  assert.equal(e.interactions.length,expected);
  for(const r of c.relations.stems)stemStates.add(r.state);
  for(const h of e.hidden){gods.add(h.tenGod);assert.equal(h.family,relationOf(c.dayMaster.el,STEM_EL[h.stem]));}
  for(const a of AXES){const x=careerAxis(a,e);modes.add(x.mode);assert.equal(x.easy,AXIS_MODES[a.id][x.mode][0]);assert.ok(x.support);if(e.month.hourSensitive)assert.equal(x.mode,'open');}
  const readings=[...e.interactions,...hiddenInsights(e),e.rootInsight];
  assert.equal(new Set(readings.map(r=>r.id)).size,readings.length);
  for(const r of readings)for(const key of ['id','title','basis','scene','condition','action'])assert.ok(r[key]&&!r[key].includes('undefined'),key);
 }
 assert.equal(count,2880);assert.equal(gods.size,10);assert.equal(Object.keys(GOD_WORK).length,10);
 assert.deepEqual([...modes].sort(),['latent','matched','mixed','open']);
 assert.ok(stemStates.has('일간합'));assert.ok(stemStates.has('합반'));assert.ok(stemStates.has('합거'));
});
test('같은 날짜라도 시주에 따라 근거와 상세 문장이 달라지고 시각 미상은 보류한다',()=>{
 const results=['01:30','09:30','17:30'].map(birthTime=>buildCareerReport({birthDate:'2000-03-15',birthTime}));
 assert.equal(new Set(results.map(r=>r.analysis.pillars.d.g)).size,1);
 assert.equal(new Set(results.map(r=>JSON.stringify(r.sections[1].insights))).size,3);
 const unknown=buildCareerReport({birthDate:'2000-03-15',birthTimeUnknown:true});
 assert.equal(unknown.evidence.hidden.some(h=>h.pos==='h'),false);
 assert.ok(unknown.sections[6].insights.some(i=>i.id==='uncertainty'));
 for(const r of [...results,unknown]){
  assert.ok(r.sections.every(s=>s.insights.length));
  assert.match(r.sections[3].analysisNote,/형·파·해/);
  assert.deepEqual(Object.keys(careerShare(r)),['title','text','url']);
  for(const s of r.sections)assert.equal(new Set(s.insights.map(i=>i.id)).size,s.insights.length);
 }
});
test('특수격에서는 일반 업무 조건 우선순위를 억지로 적용하지 않는다',()=>{
 for(const text of ['戊辰己未戊戌丁巳','癸未乙卯甲寅乙亥','丙寅甲午壬午丁未','戊戌辛酉乙酉辛巳','丙午戊戌甲戌己巳','丁卯丙午甲午己巳']){
  const c=analyze(text.match(/../g));const e=careerEvidence(c);
  assert.equal(c.special.decision,'special');assert.equal(e.structure.type,'특수격');
  for(const axis of AXES)assert.equal(careerAxis(axis,e).mode,'open');
  assert.equal(c.yongshin.eokbu.applies,false);
 }
});
