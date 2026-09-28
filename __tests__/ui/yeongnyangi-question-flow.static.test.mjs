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
