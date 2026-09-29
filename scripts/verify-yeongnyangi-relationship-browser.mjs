import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {fixtures} from './lib/yeongnyangi-mobile-payment.mjs';

const base=process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:18139';
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const compiled=await build({stdin:{contents:"export {products} from './worker/yeongnyangi/payments/catalog'; export {readingCharts} from './worker/yeongnyangi/fortune/reading-presentation'; export {calculateAskTarot} from './worker/yeongnyangi/fortune/ask/tarot'; export {consultationKinds,consultationManifest} from './worker/yeongnyangi/fortune/consultation-kinds';",loader:'ts',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {products,readingCharts,calculateAskTarot,consultationKinds,consultationManifest}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const product=products.find(p=>p.id==='tarot_mackerel'),kind=consultationKinds.tarot.find(k=>k.id==='compatibility');
const output=process.env.YEONGNYANGI_RELATIONSHIP_OUTPUT||'build-cache/yeongnyangi-relationship';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true}),results=[];
try{
 for(const width of [360,390,430,1280]){
  const f=await fixtures(browser,base,product,width);
  try{
   f.state.products=products;
   await f.page.goto(base+'/',{waitUntil:'domcontentloaded'});
   await f.page.getByRole('link',{name:'궁합 보기',exact:true}).click();
   await f.page.getByRole('button',{name:'그 사람 마음이 궁금해요',exact:true}).click();
   await f.page.getByLabel('내 이름 또는 별칭',{exact:true}).fill('나비');
   await f.page.getByLabel('상대 이름 또는 별칭',{exact:true}).fill('달');
   await f.page.screenshot({path:`${output}/people-${width}.png`,fullPage:true});
   await f.page.getByRole('button',{name:'추천 상담 보기',exact:true}).click();
   await f.page.screenshot({path:`${output}/recommendations-${width}.png`,fullPage:true});
   assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'no horizontal overflow');
   await f.page.getByRole('button',{name:'타로 이 상담으로 이어가기',exact:true}).click();
   await f.page.getByLabel('내 이름 또는 별칭',{exact:true}).waitFor();
   await f.page.reload();
   assert.equal(await f.page.getByLabel('상대 이름 또는 별칭',{exact:true}).inputValue(),'달');
   assert.equal(await f.page.locator('select').first().inputValue(),'ko');
   f.state.prepareConsultation=input=>({consultationKind:'compatibility',kindLabel:'두 사람의 궁합',question:input.question,questions:[],relationship:{version:'relationship-v1',participants:input.participants}});
   await f.page.getByRole('button',{name:'결제 내용 확인하기',exact:true}).click();
   await f.page.waitForURL('**/checkout/**');
   await f.page.screenshot({path:`${output}/checkout-${width}.png`,fullPage:true});
   assert.equal(f.state.requestInput.consultationKind,'compatibility');
   assert.equal(f.state.requestInput.relationshipQuestionId,'feelings');
   assert.deepEqual(f.state.requestInput.participants,{self:'나비',partner:'달'});
   // Unmount checkout before fixture approval: its polling redirect must not race
   // this test's explicit navigation into the separate card-ritual scenario.
   await f.page.goto('about:blank');
   // Payment transport is mock. Actual repository recovery is tested separately.
   f.row.paid=true;f.row.state='PAID';f.state.approved=true;f.state.holdGeneration=true;
   f.row.manifest=consultationManifest(product,kind);
   const tarot=calculateAskTarot({question:'관계를 살펴봐 주세요.',topicId:'relationship',spreadId:'yeongnyangi_compatibility_six'});
   f.row.charts=readingCharts({contexts:{tarot},signals:[],themes:[]},f.row.manifest);
   const frozen=JSON.stringify(f.row.charts);
   await f.page.goto(`${base}/yeongnyangi/result/?id=${f.row.id}`);
   const ritual=f.page.getByRole('region',{name:'영냥이 타로 드로우 의식'});
   await ritual.getByRole('button',{name:'질문에 집중했어'}).click();
   await ritual.getByRole('button',{name:'이 순간에 멈추기'}).click();
   await ritual.getByRole('heading',{name:'내 마음 카드 뽑기'}).waitFor();
   await ritual.getByRole('button',{name:'카드 뒷면 1',exact:true}).click();
   await ritual.getByRole('heading',{name:'상대의 마음 카드 뽑기'}).waitFor();
   for(let i=2;i<=6;i++)await ritual.getByRole('button',{name:`카드 뒷면 ${i}`,exact:true}).click();
   await ritual.getByRole('button',{name:'선택 확정하기'}).click();
   await ritual.getByRole('button',{name:'1번째 카드 공개',exact:true}).click();
   assert.equal(await f.page.evaluate(id=>JSON.parse(localStorage.getItem('cd:yn:tarot-ritual:v1:'+id)).revealed,f.row.id),1);
   await f.page.reload();await ritual.getByRole('heading',{name:'상대의 마음 카드 뽑기'}).waitFor();
   for(let i=2;i<=6;i++)await ritual.getByRole('button',{name:`${i}번째 카드 공개`,exact:true}).click();
   await ritual.screenshot({animations:'disabled',path:`${output}/ritual-${width}.png`});
   assert.equal(JSON.stringify(f.row.charts),frozen);
   await ritual.getByRole('button',{name:'영냥이 상담 펼치기'}).click();
   await f.page.getByText('나비 · 달',{exact:true}).waitFor();
   f.row.participants=f.row.consultation.relationship.participants;f.row.kindLabel=f.row.consultation.kindLabel;
   f.state.holdGeneration=false;
   for(let i=0;i<50&&f.row.state!=='COMPLETED';i++)await new Promise(resolve=>setTimeout(resolve,100));
   assert.equal(f.row.state,'COMPLETED');assert.equal(f.row.chapters.length,product.chapterCount);
   await f.page.goto(base+'/yeongnyangi/library/');
   await f.page.getByText('나비 · 달',{exact:true}).waitFor();
   await f.page.locator(`a[href*="${f.row.id}"]`).click();
   await f.page.getByText('나비 · 달',{exact:true}).waitFor({state:'attached'});
   assert.equal(await ritual.count(),0,'library reread must not replay completed ritual');
   assert.equal(JSON.stringify(f.row.charts),frozen);
   assert.equal(f.state.creates,1,'reread keeps original purchase');
   assert.equal(f.state.sdk.length,0,'no real or mock purchase submitted by this UI test');
   results.push({width,passed:true,creates:f.state.creates});
  }catch(error){await f.page.screenshot({path:`${output}/failure-${width}.png`,fullPage:true});console.error(JSON.stringify({errors:f.state.errors,http:f.state.http,unknown:f.state.unknown}));console.error(await f.page.locator('main').innerText());throw error;}finally{await f.context.close();}
 }
}finally{await browser.close();}
await writeFile(`${output}/results.json`,JSON.stringify({evidence:'mock browser transport; no live payment, DB or LLM',results},null,2));
console.log(JSON.stringify(results));
