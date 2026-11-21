import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
const read=file=>fs.readFileSync(file,'utf8');
test('special consultation cards are additive and do not modify the home draft or charging',()=>{
 const main=read('app/components/QuestionJourney.tsx');
 const special=read('app/components/QuestionSpecialConsultations.tsx');
 assert.match(main,/href="#home-special-consultations"/);
 assert.match(main,/<\/form>\s*<QuestionSpecialConsultations\/>/);
 assert.match(main,/saveQuestionEntry\(question,domain\)/);
 assert.match(special,/href="\/yeongnyangi\/fortune\/\?mode=spirit" target="_blank" rel="noopener"/);
 assert.match(special,/new URLSearchParams\(\{product:product.id\}\)/);
 assert.equal([...special.matchAll(/target="_blank" rel="noopener"/g)].length,3);
 assert.match(special,/fusionIntroductionArt\(product\)/);
 assert.match(special,/aria-expanded=\{open\} aria-controls=\{paneId\}/);
 assert.match(special,/id=\{paneId\} hidden=\{!open\}/);
 assert.doesNotMatch(special,/sessionStorage|localStorage|fetch\(|requestPayment|prepare\(/);
});
