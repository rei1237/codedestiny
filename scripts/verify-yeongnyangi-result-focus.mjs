import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {build} from 'esbuild';
import {fixtures} from './lib/yeongnyangi-mobile-payment.mjs';
const base=process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:3139';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const bundle=await build({stdin:{contents:"export {products} from './worker/yeongnyangi/payments/catalog';export {readingFocusCopy} from './app/yeongnyangi/_lib/reading-focus-copy';",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',write:false});
const {products,readingFocusCopy}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const directory='build-cache/yeongnyangi-result-focus';await mkdir(directory,{recursive:true});
const browser=await chromium.launch({headless:true}),report=[];
const samples={
 ko:{question:'지금 이직을 준비해도 괜찮을까요?',answer:'먼저 새 역할의 조건을 확인하고, 현재 업무와 작은 시험을 병행해 보세요.',reason:'저장된 계산 자료에서 변화의 흐름과 역할의 균형을 살펴본 해석입니다.',timing:'앞으로 한 달은 확정 시점이 아니라 지원 조건을 비교하는 점검 기간으로 삼으세요.',action:'관심 있는 역할 두 개를 골라 필요한 역량과 생활 조건을 적어보세요.',summary:'익숙한 환경을 떠날 준비와 실제 이동 시점을 나눠 생각해 볼 때입니다.',detail:'조건이 구체적으로 확인되면 선택의 부담도 작아질 수 있습니다.',example:'예를 들어 새 업무를 단기간 경험해 보는 방법이 있어요.',advice:'작은 실험을 통해 선택의 기준을 확인해 보세요.',persona:'급하게 답을 내리지 않아도 괜찮아.'},
 de:{question:'Soll ich jetzt einen beruflichen Wechsel vorbereiten?',answer:'Prüfe zuerst die Bedingungen der neuen Rolle und probiere kleine Schritte neben deiner jetzigen Arbeit aus.',reason:'Diese Deutung bezieht sich auf die gespeicherten Berechnungen und die Bedingungen der Frage.',timing:'Nutze den nächsten Monat zur Prüfung der Bedingungen, nicht als festes Datum für einen Wechsel.',action:'Vergleiche bei zwei interessanten Rollen die Anforderungen und die Auswirkungen auf deinen Alltag.',summary:'Trenne die Vorbereitung von der Entscheidung über den tatsächlichen Wechsel.',detail:'Konkrete Bedingungen können dir helfen, die Belastung einer Entscheidung besser einzuschätzen.',example:'Ein kurzes Projekt kann einen Einblick in die neue Aufgabe geben.',advice:'Prüfe deine Kriterien durch einen kleinen Versuch.',persona:'Du musst dich nicht sofort entscheiden.'},
 hi:{question:'क्या मुझे अभी नौकरी बदलने की तैयारी करनी चाहिए?',answer:'पहले नई भूमिका की शर्तें समझें और वर्तमान काम के साथ छोटे प्रयोग करें।',reason:'यह व्याख्या सुरक्षित गणना और आपके प्रश्न की परिस्थितियों पर आधारित है।',timing:'अगले महीने को बदलाव की तय तारीख के बजाय शर्तें जाँचने की अवधि मानें।',action:'दो भूमिकाएँ चुनें और उनकी आवश्यकताओं तथा रोज़मर्रा पर असर की तुलना करें।',summary:'तैयारी और वास्तव में बदलाव करने के निर्णय को अलग रखें।',detail:'ठोस जानकारी मिलने से निर्णय का दबाव समझना आसान हो सकता है।',example:'एक छोटे प्रोजेक्ट से नई भूमिका का अनुभव मिल सकता है।',advice:'एक छोटे प्रयोग से अपने मानदंड जाँचें।',persona:'आपको तुरंत निर्णय लेने की आवश्यकता नहीं है।'},
};
try{for(const [width,locale] of [[360,'ko'],[390,'ko'],[430,'ko'],[1280,'ko'],[360,'de'],[360,'hi']]){
 const f=await fixtures(browser,base,products.find(p=>p.id==='saju_mackerel'),width);const {page,context,row,state}=f;const sample=samples[locale];
 try{
  row.paid=true;row.state='COMPLETED';row.locale=locale;
  row.manifest=[{id:'focus',title:'지금 선택의 기준',theme:'career',ordinal:0}];
  row.consultation={question:sample.question,questions:[{id:'q1',text:sample.question}]};
  row.chapters=[{title:locale==='ko'?'지금 선택의 기준':sample.summary,summary:sample.summary,questionAnswers:[{questionId:'q1',answer:sample.answer,reason:sample.reason,timing:sample.timing,action:sample.action}],analysis:[sample.detail],example:sample.example,advice:sample.advice,persona:sample.persona,highlights:[]}];
  row.charts=[{domain:'saju',title:'나의 사주와 오행',source:'구매 당시 저장된 계산 근거',groups:[{id:'day',label:'일주',chapterIds:['focus'],items:[{label:'천간·지지',value:'甲子'}]}],limitations:[]}];
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/yeongnyangi/result/?id='+row.id+'&lang='+locale);
  const focus=page.locator('[data-reading-focus]');await focus.waitFor();
  assert.equal(await focus.getByText(sample.answer,{exact:true}).count(),1);
  assert.equal(await page.locator('[data-reading-chapter]').getByText(sample.answer,{exact:true}).count(),0);
  for(const text of [sample.reason,sample.timing,sample.action])await focus.getByText(text,{exact:true}).waitFor();
  const tools=page.locator('#my-fortune-summary'),evidence=page.locator('[data-reading-evidence]');
  assert.equal(await tools.getAttribute('open'),null);assert.equal(await evidence.getAttribute('open'),null);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const answerBox=await focus.getByText(sample.answer,{exact:true}).boundingBox();assert.ok(answerBox.y<700,'the answer appears before secondary tools on a phone');
  await page.screenshot({path:directory+'/'+locale+'-'+width+'-viewport.png'});await page.screenshot({path:directory+'/'+locale+'-'+width+'-full.png',fullPage:true});
  await evidence.locator('summary').first().click();await evidence.getByText('甲子',{exact:true}).waitFor();
  await tools.locator('summary').first().click();await tools.locator('[data-external-image-guide]').waitFor();
  assert.equal(await tools.locator('summary').first().innerText(),readingFocusCopy(locale).tools);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(state.generates,0);assert.equal(state.orders.size,0);assert.equal(state.sdk.length,0);assert.deepEqual(state.errors,[]);assert.deepEqual(state.unknown,[]);
  report.push({width,locale,status:'PASS',answerY:Math.round(answerBox.y),generationCalls:state.generates});
 }finally{await context.close();}
}}finally{await browser.close();await writeFile(directory+'/verification.json',JSON.stringify({cases:report,realPayments:0,realLlmCalls:0,productionWrites:0},null,2));}
console.log(JSON.stringify({status:'PASS',cases:report}));
