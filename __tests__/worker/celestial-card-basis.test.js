/** @jest-environment node */
// 카드별 필수 해석의 근거 대조: 본문이 실제로 뽑힌 카드·행성을 말하는지 검사한다.
// 계산기(buildCelestialMelodyReading)를 대역하지 않고 실제 명반을 태운다.
import { jest } from '@jest/globals';
let route, docs, provider, userId, forgedCard;
const user='64b7f2a1c3d4e5f601234567';
const clone=value=>structuredClone(value);
const get=(doc,key)=>key.split('.').reduce((value,key)=>value?.[key],doc);
function matches(doc,filter){return Object.entries(filter).every(([key,value])=>{
 if(key==='$or')return value.some(item=>matches(doc,item));const actual=get(doc,key);
 if(value&&typeof value==='object'&&!(value instanceof Date)){if('$exists'in value)return Boolean(actual!==undefined)===value.$exists;if('$in'in value)return value.$in.includes(actual);}
 return String(actual)===String(value);
});}
const query=value=>({lean:async()=>clone(value),select(){return this;},sort(){return this;}});
function patch(doc,fields){for(const[key,value]of Object.entries(fields)){const keys=key.split('.'),end=keys.pop();let target=doc;for(const part of keys)target=target[part]??={};target[end]=clone(value);}}
const model={
 findOne:filter=>query(docs.find(doc=>matches(doc,filter))||null),
 findOneAndUpdate:(filter,update,options={})=>{
  let doc=docs.find(doc=>matches(doc,filter));
  if(!doc&&options.upsert){doc={...clone(update.$setOnInsert),_id:'record'};docs.push(doc);}
  if(doc){patch(doc,update.$set||{});doc.updatedAt=new Date();}return query(doc||null);
 },
 updateOne:async(filter,update)=>{const doc=docs.find(doc=>matches(doc,filter));if(doc)patch(doc,update.$set||{});return {modifiedCount:doc?1:0};},
};
function prose(seed,count=14){return Array.from({length:count},(_,n)=>`${seed} ${n}번째 흐름은 생활 조건과 서로 다른 반응을 나란히 살펴보게 합니다. ${seed} ${n}번째 선택은 단정하기보다 대화를 통해 판단할 근거를 먼저 확인하도록 이끕니다.`).join('\n');}
// 프롬프트의 cards= 블록에서 N번 카드의 계산된 행성명·카드명을 읽는다.
function drawn(prompt,index){const found=prompt.match(new RegExp(`\\[${index+1}\\] ([^-]+) - ([^/|]+) / `));return {planetKo:found[1].trim(),cardNameKo:found[2].trim()};}
beforeAll(async()=>{
 const db=await import('../../worker/lib/db.js'),auth=await import('../../worker/lib/auth.js'),models=await import('../../worker/lib/models.js'),gemini=await import('../../worker/lib/gemini.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>({userId})}));
 jest.unstable_mockModule('../../worker/lib/access-control.js',()=>({requirePremiumReportAccess:async()=>({ok:true,accessType:'single'})}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:model,
  PaidExecutionRecord:{findOne:()=>query(null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)},
 }));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({...gemini,callGeminiText:(...args)=>provider(...args)}));
 ({handleCelestialHarmonyRoutes:route}=await import('../../worker/routes/celestial-harmony.js'));
});
beforeEach(()=>{docs=[];userId=user;forgedCard=null;
 provider=jest.fn(async(_env,prompt,options)=>{
  const id=options.logContext.sectionGroup;
  let value;
  if(id==='summary'){
   value=Object.fromEntries(['overallTheme','strongestPlanetSignal','deepestShadow','soulLesson','integrationPath','finalOracle'].map(field=>[field,prose('summary '+field,20)]));
   value.insightMatrix=Object.fromEntries(['love','work','money','health'].map(field=>[field,prose('summary matrix '+field,2)]));
   value.closingFortune=Object.fromEntries(['overall','love','work','money','health'].map(field=>[field,prose('summary closing '+field,6)]));
   for(const field of ['planetHighlights','practices','ritualPlan'])value[field]=Array.from({length:3},(_,i)=>prose('summary '+field+i,1));
  }else{
   const index=Number(id),fact=drawn(prompt,index);
   const evidence=JSON.parse(prompt.match(/대신 다음 단일 객체만 출력하세요\. (\{.*\})\./)[1]).evidence;
   // 위조 카드는 evidence 만 그대로 되돌려주고 본문에서는 계산된 카드·행성을 한 번도 부르지 않는다.
   const cite=index===forgedCard?'':`${fact.planetKo} 자리에서 ${fact.cardNameKo} 카드가 열립니다. `;
   value={evidence,...Object.fromEntries(['cardMeaning','planetMeaning','archetypeReading','consciousMessage','unconsciousPattern','shadowWarning','soulLesson','integrationPractice']
    .map(field=>[field,cite+prose(`${index} ${field}`)]))};
  }
  return {ok:true,provider:'gemini',text:JSON.stringify(value)};
 });
});
const body={requestId:'celestial-basis-request',reportId:'celestial-basis-report',cards:['M17','M18','M01','M06','M15','M10','M11','M16','M02','M13','M19'].map((cardId,index)=>({cardId,orientation:index%2?'reversed':'upright'}))};
const post=value=>route(new Request('https://mock.test/api/celestial-harmony',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)}),{});
// 200 이 나오거나 재시도 예산이 소진될 때까지 이어서 돌린다.
async function deliver(){let response=await post(body);
 for(let n=0;n<8&&response.status===202;n++)response=await post({resumeResultId:docs[0].executionKey});
 return response;}

test('every drawn card carries a planet and card name the body can be checked against',async()=>{
 const {buildCelestialMelodyReading}=await import('../../lib/tarot/celestial-melody-reading.mjs');
 const {CELESTIAL_CARD_BODY_FIELDS}=await import('../../worker/lib/celestial-report-delivery.js');
 const {reading}=buildCelestialMelodyReading({cards:body.cards,payment:{},version:'test'});
 expect(reading.cards).toHaveLength(11);
 for(const card of reading.cards){
  expect(card.cardNameKo).toBeTruthy();expect(card.planetKo).toBeTruthy();
  const local=CELESTIAL_CARD_BODY_FIELDS.map(field=>String(card[field]||'')).join('\n');
  expect(local).toContain(card.cardNameKo);expect(local).toContain(card.planetKo);
 }
});

test('a card body that never names the drawn card is rejected instead of delivered',async()=>{
 forgedCard=0;
 const response=await deliver();
 expect(response.status).toBe(202);
 expect(await response.json()).toMatchObject({retryable:false});
 expect(docs[0].premiumStatus).toBe('generating');
 const parts=docs[0].metadata.celestialDelivery.delivery;
 expect(Object.keys(parts.parts)).not.toContain('0');
 expect(parts.attempts['0']).toBe(3);
 expect(parts.invalidAttempts['0']).toBe(3);
});

test('bodies that cite the drawn card and planet complete without extra provider calls',async()=>{
 const response=await deliver();
 expect(response.status).toBe(200);
 expect(docs[0].premiumStatus).toBe('completed');
 expect(provider).toHaveBeenCalledTimes(12);
});
