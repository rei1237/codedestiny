import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateNatalSaju,nodeTerms} from '../../lib/korean-calendar/index.js';
import {analyzeNatalCore} from '../../lib/saju/natal-core/index.mjs';
import {DAY_COPY,MONTH_COPY,AXES} from '../../lib/saju/career-style/copy.mjs';
import {buildCareerReport,careerNatalInput,careerShare,CAREER_URL} from '../../lib/saju/career-style/report.mjs';

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
 const text=report.sections.flatMap(s=>[s.title,...s.paragraphs,...(s.axes||[]).flatMap(a=>[a.title,a.basis,a.reading,a.easy,a.support]),...(s.roles||[]).flatMap(r=>Object.values(r))]).join('');
 assert.ok(text.length>=3000&&text.length<=4500,`length ${text.length}`);
 assert.ok(!text.includes('undefined'));
 assert.equal(report.sections[4].axes.length,6);
 assert.equal(report.sections[5].roles.length,3);
 if(input.birthTimeUnknown){assert.equal(report.analysis.natal.pillars.hour,null);assert.match(text,/신강약을 완성된 판단으로 사용하지/);}
});
test('all editorial keys and combinations have complete reports',()=>{
 assert.equal(Object.keys(DAY_COPY).length,10);assert.equal(Object.keys(MONTH_COPY).length,12);assert.equal(AXES.length,6);
 const stems=new Set(),months=new Set();
 for(let month=1;month<=12;month++)for(let day=10;day<20;day++){
  const r=buildCareerReport({birthDate:`2000-${String(month).padStart(2,'0')}-${day}`,birthTime:'14:30'});
  stems.add(r.analysis.pillars.d.g);months.add(r.analysis.pillars.m.j);
  for(const s of r.sections)assert.ok(s.paragraphs.every(p=>p&&!p.includes('undefined')));
  const length=r.sections.flatMap(s=>[s.title,...s.paragraphs,...(s.axes||[]).flatMap(a=>[a.title,a.basis,a.reading,a.easy,a.support]),...(s.roles||[]).flatMap(role=>Object.values(role))]).join('').length;
  assert.ok(length>=3000&&length<=4500,`report length ${length}`);
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
