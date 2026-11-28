import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateNatalSaju,nodeTerms} from '../../lib/korean-calendar/index.js';
import {analyzeNatalCore} from '../../lib/saju/natal-core/index.mjs';
import {DAY_COPY,MONTH_COPY,AXES} from '../../lib/saju/career-style/copy.mjs';
import {buildCareerReport,careerNatalInput,careerShare,CAREER_URL} from '../../lib/saju/career-style/report.mjs';
import {CAREER_TITLES} from '../../lib/saju/career-style/story.mjs';

const voiceText=r=>r.sections.flatMap(s=>[s.title,...s.paragraphs,...(s.axes||[]).flatMap(a=>[a.title,a.basis,a.reading,a.easy,a.support]),...(s.items||[]).flatMap(it=>[it.title,it.basis,it.body,it.examples||''])]).join('');
// 영냥이는 반말이라 같은 내용이 더 짧게 나온다.
const LENGTH={pig:[3000,4500],neo:[2500,4500]};

const cases=[
 {birthDate:'2000-03-15',birthTime:'12:30'},
 {birthDate:'2000-02-01',birthTime:'12:30',calendarType:'lunar'},
 {birthDate:'2023-02-01',birthTime:'12:30',calendarType:'lunar_leap'},
 ...['16:00','18:00'].map(birthTime=>({birthDate:'2000-02-04',birthTime})),
 ...['22:59','23:00','23:59','00:00'].map(birthTime=>({birthDate:'2000-03-15',birthTime})),
 {birthDate:'2000-03-15',birthTimeUnknown:true},
 {birthDate:'2000-03-15',birthTime:'12:30',birthPlace:{name:'뉴욕',longitude:-74.006,latitude:40.7128,timezone:'America/New_York'}},
];
const februaryTerm=nodeTerms(2000).find(term=>term.month===2);
for(const delta of [-1,1]){
 const wall=new Date(Date.UTC(februaryTerm.year,februaryTerm.month-1,februaryTerm.day,februaryTerm.hour,februaryTerm.minute+delta));
 cases.push({birthDate:wall.toISOString().slice(0,10),birthTime:wall.toISOString().slice(11,16)});
}
for(const input of cases)test(`canonical parity ${JSON.stringify(input)}`,()=>{
 const report=buildCareerReport(input),original=calculateNatalSaju(input);
 assert.deepEqual(report.analysis.natal,original);
 const p=Object.fromEntries([['y','year'],['m','month'],['d','day'],['h','hour']].map(([k,v])=>[k,original.pillars[v]?{g:original.pillars[v][0],j:original.pillars[v][1]}:null]));
 assert.deepEqual(report.analysis.core,analyzeNatalCore(p));
 assert.equal(report.sections.length,8);
 const text=voiceText(report);
 assert.ok(text.length>=LENGTH.pig[0]&&text.length<=LENGTH.pig[1],`length ${text.length}`);
 assert.ok(!text.includes('undefined'));
 assert.equal(report.sections[4].axes.length,6);
 assert.ok(report.sections[5].items.length>=3&&report.sections[5].items.length<=5);
 assert.ok(report.sections[6].items.length>=2&&report.sections[6].items.length<=3);
 if(input.birthTimeUnknown){assert.equal(report.analysis.natal.pillars.hour,null);assert.match(report.sections.flatMap(s=>s.analysisParagraphs).join(" "),/신강약을 완성된 판단으로 사용하지/);}
});
test('all editorial keys and combinations have complete reports',()=>{
 assert.equal(Object.keys(DAY_COPY).length,10);assert.equal(Object.keys(MONTH_COPY).length,12);assert.equal(AXES.length,6);
 const stems=new Set(),months=new Set();
 for(let month=1;month<=12;month++)for(let day=10;day<20;day++){
  const r=buildCareerReport({birthDate:`2000-${String(month).padStart(2,'0')}-${day}`,birthTime:'14:30'});
  stems.add(r.analysis.pillars.d.g);months.add(r.analysis.pillars.m.j);
  for(const s of r.sections)assert.ok(s.paragraphs.every(p=>p&&!p.includes('undefined')));
  for(const mode of ['pig','neo']){
   const length=voiceText(mode==='pig'?r:buildCareerReport({birthDate:`2000-${String(month).padStart(2,'0')}-${day}`,birthTime:'14:30'},{mode})).length;
   assert.ok(length>=LENGTH[mode][0]&&length<=LENGTH[mode][1],`${mode} report length ${length}`);
  }
 }
 assert.equal(stems.size,10);assert.equal(months.size,12);
});
test('actual solar-term and corrected 23:00 boundaries are preserved',()=>{
 assert.notEqual(buildCareerReport(cases.at(-2)).analysis.pillars.m.j,buildCareerReport(cases.at(-1)).analysis.pillars.m.j);
 const before=buildCareerReport({birthDate:'2000-03-15',birthTime:'23:31'});
 const after=buildCareerReport({birthDate:'2000-03-15',birthTime:'23:32'});
 assert.notEqual(before.analysis.natal.pillars.day,after.analysis.natal.pillars.day);
});
test('invalid dates and partial location fail instead of inventing a chart',()=>{
 for(const birthDate of ['2000-02-30','2001-02-29','not-a-date'])assert.throws(()=>buildCareerReport({birthDate}));
 assert.throws(()=>buildCareerReport({birthDate:'2000-03-15',birthTime:'25:00'}));
 assert.throws(()=>careerNatalInput({birthDate:'2000-03-15',region:'부산'}));
 const input=careerNatalInput({birthDate:'2000-03-15',calendarType:'lunar',isLeapMonth:true,timezone:'America/New_York',longitude:'-74.006',latitude:'40.7128',birthTime:'00:00'});
 assert.equal(input.birthPlace.longitude,-74.006);assert.equal(input.calendarType,'lunar_leap');assert.equal(input.birthTime,'00:00');
});
test('share payload is an allowlist, even if report has private or attacker-supplied fields',()=>{
 const report=buildCareerReport(cases[0]);
 const share=careerShare({...report,name:'PRIVATE',birthDate:'2000-03-15',profileId:'secret'});
 assert.deepEqual(Object.keys(share),['title','text','url']);assert.equal(share.url,CAREER_URL);
 assert.doesNotMatch(JSON.stringify(share),/PRIVATE|2000-03-15|secret/);
 assert.doesNotMatch(careerShare({title:'PRIVATE'}).text,/PRIVATE/);
});
// 8장 구조·두 말투·결정성·광고 정책 문구를 60 일주 전부에서 확인한다.
const ADSENSE_BAN=[/반드시/,/무조건\s*이혼/,/병이\s*생긴다/,/투자하면\s*돈/,/지금\s*결제|바로\s*결제|결제하지\s*않으면/,/운이\s*나빠진다/,/영원히\s*지속된다/,/광고/,/승인\s*보장|통과\s*보장/];
test('both voices share eight chapters and keep their own speech level across all 60 day pillars',()=>{
 assert.equal(CAREER_TITLES.length,8);
 const ilju=new Set();
 for(let i=0;i<400&&ilju.size<60;i++){
  const birthDate=new Date(Date.UTC(1970,0,1)+i*86400000).toISOString().slice(0,10);
  for(const mode of ['pig','neo']){
   const r=buildCareerReport({birthDate,birthTime:'10:30'},{mode});ilju.add(r.analysis.pillars.d.g+r.analysis.pillars.d.j);
   assert.equal(r.mode,mode);assert.deepEqual(r.sections.map(s=>s.title),CAREER_TITLES);
   const text=voiceText(r),all=text+r.sections.flatMap(s=>s.analysisParagraphs).join('');
   for(const re of ADSENSE_BAN)assert.doesNotMatch(all,re,`${mode} ${birthDate}`);
   assert.doesNotMatch(all,/undefined|null|NaN/);
   const jobs=r.sections[5].items.length,avoid=r.sections[6].items.length;
   assert.ok(jobs>=3&&jobs<=5&&avoid>=2&&avoid<=3,`${birthDate} ${jobs}/${avoid}`);
   if(mode==='neo'){assert.doesNotMatch(text,/당신/);assert.match(text,/너/);assert.doesNotMatch(r.sections.flatMap(s=>s.paragraphs).join('\n'),/(요|니다)\.$/m);}
   else{assert.doesNotMatch(text,/너는|너한테/);assert.match(text,/당신/);}
   assert.equal(JSON.stringify(buildCareerReport({birthDate,birthTime:'10:30'},{mode})),JSON.stringify(r));
  }
 }
 assert.equal(ilju.size,60);
});
test('voice changes wording only: chart, evidence and job picks stay identical',()=>{
 const pig=buildCareerReport(cases[0]),neo=buildCareerReport(cases[0],{mode:'neo'}),stray=buildCareerReport(cases[0],{mode:'x'});
 assert.equal(pig.mode,'pig');assert.equal(stray.mode,'pig');assert.deepEqual(stray,pig);
 assert.deepEqual(neo.analysis,pig.analysis);assert.deepEqual(neo.evidence,pig.evidence);
 assert.deepEqual(neo.sections[5].items.map(i=>i.title),pig.sections[5].items.map(i=>i.title));
 assert.notEqual(neo.sections[0].paragraphs.join(''),pig.sections[0].paragraphs.join(''));
});
