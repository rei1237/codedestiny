import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const read=file=>readFileSync(file,'utf8').replace(/\r\n/g,'\n');

test('question results present one answer flow and polling repairs delivery automatically',()=>{
 const result=read('app/yeongnyangi/_components/Result.tsx');
 const book=read('app/yeongnyangi/_components/ReadingBook.tsx');
 const route=read('worker/routes/yeongnyangi.js');
 const delivery=read('worker/yeongnyangi/delivery.js');

 assert.match(result,/const askReading=!!row\?\.consultation\?\.questions\?\.length/);
 assert.match(result,/askReading\?stateCopy\.answering:stateCopy\.saved/);
 assert.doesNotMatch(result,/busy\?copy\.loading:copy\.continue/);
 assert.match(book,/ask\?answerCopy\.answer/);
 assert.match(book,/ask\?'':`\$\{i\+1\}\. `/);
 assert.match(route,/readAndContinueFortune\(env,auth\.userId,id\)/);
 assert.match(delivery,/row\.errorCode==='AUTOMATIC_RECOVERY_STOPPED'\)row=await repository\.escalateStopped/);
 assert.match(delivery,/await enqueueConsultation\(env,row\)/);
});

test('the ask period picker only rewrites the question text and previews the same resolution the server stores',()=>{
 const form=read('app/yeongnyangi/_components/Consultation.tsx');
 const picker=read('app/yeongnyangi/_components/AskPeriodPicker.tsx');
 const book=read('app/yeongnyangi/_components/ReadingBook.tsx');
 const result=read('app/yeongnyangi/_components/Result.tsx');
 // Korean ask only; the picker hands back question text, so the request body and checkout stay unchanged.
 assert.match(form,/kind\.id==='ask'&&siteLocale==='ko'&&<AskPeriodPicker question=\{question\} onQuestion=\{setQuestion\}/);
 assert.doesNotMatch(form,/askPeriod|periodChip/);
 // The preview resolves with the browser timezone the request sends, through the server's own resolver.
 assert.match(form,/timezone:Intl\.DateTimeFormat\(\)\.resolvedOptions\(\)\.timeZone \|\| 'Asia\/Seoul'/);
 assert.match(picker,/resolveAskPeriods\(question,consultationClock\(Intl\.DateTimeFormat\(\)\.resolvedOptions\(\)\.timeZone\|\|'Asia\/Seoul'\)\.asOf,resolveQuestionYears\)/);
 assert.match(picker,/applyAskPeriodChip\(question,chip\)/);
 assert.match(picker,/ranges\.length>1&&/);
 // The review appears only when the stored answer has one; older readings render as before.
 assert.match(book,/\{firstAnswer\.review&&/);
 assert.match(book,/\{answer\.review&&/);
 assert.match(result,/period\.ranges\?\.length\?/);
});
