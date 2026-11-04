import assert from 'node:assert/strict';
import { buildHeukwolAnalysis } from '../worker/lib/heukwol-analysis.js';
import { lunarMonthStemIndex } from '../lib/ziwei-month-stem.js';
import { HEUKWOL_CHAPTERS, HEUKWOL_TARGET_CHARS, HEUKWOL_MIN_CHARS, validateHeukwolChapter, heukwolPrompt, chapterEvidence, generateHeukwolChapter } from '../worker/lib/heukwol-report.js';
const now=new Date('2026-11-04T00:00:00Z');
const birth={date:'1990-05-15',time:'14:30',timeKnown:true,gender:'female'};
for(const year of [2027,2028]) {
  const a=buildHeukwolAnalysis(birth,year,now);
  assert.equal(a.months.length,12);
  assert.deepEqual(a,buildHeukwolAnalysis(birth,year,now));
  for(const m of a.months) {
    for(const system of ['saju','ziwei']) {
      assert.equal(m[system][0].start,m.start);
      assert.equal(m[system].at(-1).end,m.end);
      m[system].forEach((segment,i)=>{
        assert(segment.start<segment.end);
        if(i)assert.equal(m[system][i-1].end,segment.start);
      });
    }
    assert(m.ziwei.every(s=>s.marks.length===4 && s.marks.every(mark=>mark.star && mark.palaces.length)));
  }
  assert.match(a.months[0].saju[0].id,new RegExp(`saju-${year-1}`));
}
assert.equal(lunarMonthStemIndex(2024,1),2); // 갑년 병인월
assert.throws(()=>buildHeukwolAnalysis({...birth,timeKnown:false},2027,now),/TIME_REQUIRED/);
assert.throws(()=>buildHeukwolAnalysis(birth,2040,now),/INVALID_YEAR/);
assert.equal(HEUKWOL_CHAPTERS.length,27);
assert.equal(HEUKWOL_TARGET_CHARS,50000);
assert.equal(HEUKWOL_MIN_CHARS,40000);
const a=buildHeukwolAnalysis(birth,2027,now),chapter=HEUKWOL_CHAPTERS.find(c=>c.month===3);
assert.throws(()=>validateHeukwolChapter({warning:'짧음',interpretation:'짧음',strategy:'짧음',evidenceIds:['fake']},a,chapter));
assert(heukwolPrompt(a,chapter,'질문').includes('사주와 자미두수 근거를 분리'));
// Final success is printed after every assertion.
// console.log('PASS: deterministic 12 civil months, solar/lunar coverage, year boundary, leap year, required birth time, chapter budget and invalid output rejection. No LLM/DB/payment calls.');

assert.equal(HEUKWOL_CHAPTERS[0].key,'temperament');assert.equal(HEUKWOL_CHAPTERS.filter(c=>c.phase==='natal').length,6);assert.equal(HEUKWOL_CHAPTERS.filter(c=>c.month).length,12);assert(HEUKWOL_CHAPTERS.some(c=>c.key==='health'));assert(HEUKWOL_CHAPTERS.some(c=>c.key==='safety'));

const natal=HEUKWOL_CHAPTERS[0];
assert.equal(chapterEvidence(a,natal).months.length,0);
assert.equal(chapterEvidence(a,chapter).months.length,1);
const prose=(role)=>Array.from({length:14},(_,i)=>role+' '+i+'번 점검에서는 현재 선택의 조건과 실제 경험을 구분하고 확인할 행동을 구체적으로 정리합니다.').join('\n');
const valid={warning:'같은 부담이 반복된다면 선택을 서두른 조건을 먼저 살펴봐.',interpretation:prose('연이'),strategy:prose('네오'),checkpoints:['약속의 조건을 문서로 확인하기','내가 감당할 범위를 정하기','확인 후 결정 시점을 다시 정하기'],evidenceIds:['natal-saju','natal-ziwei']};
assert(validateHeukwolChapter(valid,a,natal).totalChars>=1500);
assert.throws(()=>validateHeukwolChapter(valid,a,chapter),/MONTH_EVIDENCE_REQUIRED/);
assert.throws(()=>validateHeukwolChapter({...valid,evidenceIds:['unknown']},a,natal),/EVIDENCE_INVALID/);
assert.throws(()=>validateHeukwolChapter({...valid,checkpoints:[]},a,natal),/CHECKPOINTS_REQUIRED/);
let injectedCalls=0;
const generated=await generateHeukwolChapter({},a,natal,'현재의 반복 패턴을 살펴보고 싶어요.',[],async(_env,prompt,options)=>{
 injectedCalls++;assert(prompt.includes('타고난 성향'));assert.equal(options.attempts,1);assert.equal(options.timeoutMs,60000);return {ok:true,text:JSON.stringify(valid)};
});
assert.equal(generated.key,'temperament');assert.equal(injectedCalls,1);
console.log('PASS: 12 monthly intervals, 27 chapters, natal/month evidence separation, valid and rejected output contracts, injected generation. No external calls.');
