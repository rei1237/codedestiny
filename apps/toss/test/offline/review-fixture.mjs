import {mockZiweiDeepLibrary} from './ziwei-deep.mjs';
import {mockCompassLibrary} from './compass.mjs';
import {mockYogaLibrary} from './yoga.mjs';
import {mockNakshatraLibrary} from './nakshatra-ai.mjs';
import dailyRegistry from '../../../../worker/yeongnyangi/fortune/free/categories.json' with {type:'json'};
import {systems,fishNames,unsoldFixtureProducts,productView,prepareSpread,drawFixture} from './yeongnyangi-contracts.mjs';
export {unsoldFixtureProducts};
import {reviewProductIds} from '../../../../worker/toss/review-products.js';
import {roomPurchases,roomSdkProducts} from './room-fixture.mjs';
import {APPROVED_TOSS_PRODUCTS} from '../../../../worker/toss/catalog.js';
import {consultationInputCode,consultationSafetyMessages} from '../../../../lib/fortune/toss-consultation-safety.mjs';


export const reviewCatalog=reviewProductIds.map(id=>{
  const letter=id==='chat_saju';
  const featureKey=letter?'fortune-chat-consultation':'yeongnyangi-'+id.replace('_','-');
  const approvedPriceKRW=APPROVED_TOSS_PRODUCTS.find(p=>p.productId===id)?.approvedPriceKRW;
  if(!Number.isSafeInteger(approvedPriceKRW)||approvedPriceKRW<=0)throw Error('Missing fixture price: '+id);
  return {id:letter?'yeoni:'+id:id,sku:letter?'mock-yeoni':'mock-'+id,name:letter?'테스트 연이 상담':'테스트 사주 · '+fishNames[id.slice(5)],featureKey,approvedPriceKRW,available:true,chapters:1};
});
const sdkProduct=p=>({sku:p.sku,type:'CONSUMABLE',displayName:p.name,displayAmount:p.approvedPriceKRW.toLocaleString('ko-KR')+'원',iconUrl:'',description:'오프라인 테스트 전용 가상 결제'});
// Test-only identifiers never correspond to a console SKU or an advertised price.
export const unsoldLetters=['yeoni','neo'].flatMap(persona=>Object.keys(systems).filter(domain=>persona!=='yeoni'||domain!=='saju').map(domain=>({
  id:persona+':chat_'+domain,sku:'mock-unregistered-letter-'+persona+'-'+domain,name:'가상 '+(persona==='neo'?'네오':'연이')+' 편지 · '+(systems[domain]||'타로'),
  featureKey:'fortune-chat-consultation',approvedPriceKRW:1,available:true,chapters:1,
})));
const letterProducts=[reviewCatalog.find(p=>p.id==='yeoni:chat_saju'),...unsoldLetters];
export const offlineCatalog=[...reviewCatalog,...unsoldFixtureProducts,...unsoldLetters];
export const offlineLetterProduct=(persona,productId)=>letterProducts.find(p=>p.id===persona+':'+productId);
export const reviewSdkProducts=[...offlineCatalog.map(sdkProduct),...roomSdkProducts];
const consultationCatalog=offlineCatalog.filter(p=>!p.id.includes(':'));
const letterSku=sku=>letterProducts.some(p=>p.sku===sku);
const json=(data,status=200)=>Response.json(data,{status});
const fail=(error,status)=>json({error},status);
const fixedChapter={id:'test',title:'테스트 상담',summary:'[테스트 전용 예시] 실제 운세 해석이나 AI 상담 결과가 아닙니다.',analysis:['이 문단은 화면과 구매 후 열람을 확인하기 위한 고정 예시입니다.'],questionAnswers:[]};

export function safetyResponse(body){
  const code=consultationInputCode(body);
  return code?json({error:code,message:consultationSafetyMessages[code],retryable:false},422):null;
}

async function prepare(body,state,save,day){
  const blocked=safetyResponse(body);if(blocked)return blocked;
  const product=consultationCatalog.find(p=>p.id===body.productId);
  if(!product)return fail('TOSS_PRODUCT_NOT_APPROVED',503);
  const tarotOnly=body.productId.startsWith('tarot_')&&body.profileId==='tarot-question';
  const validProfile=tarotOnly||state.profiles.some(profile=>profile.profileId===body.profileId);
  const asksQuestion=!body.consultationKind||body.consultationKind==='ask';
  if(!validProfile||typeof body.question!=='string'||(asksQuestion&&!body.question.trim())||!body.consultationAttemptId)return fail('INVALID_INPUT',400);
  // Store a digest for retry comparison. Profiles, freeform questions and birth inputs are not fixture records.
  const inputKeys=Object.keys(body).filter(key=>key!=='consultationAttemptId').sort();
  const snapshot=JSON.stringify(Object.fromEntries(inputKeys.map(key=>[key,body[key]])));
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(snapshot));
  const digest=Array.from(new Uint8Array(bytes),value=>value.toString(16).padStart(2,'0')).join('');
  const prior=[...state.fortunes.values()].find(item=>item.attempt===body.consultationAttemptId);
  if(prior)return prior.digest===digest?json({fortune:prior.fortune}):fail('REQUEST_INPUT_MISMATCH',409);
  const id=(++state.sequence).toString(16).padStart(64,'0');
  const fortune={id,profileId:body.profileId,productId:product.id,product:productView(product),locale:'ko',state:'CREATED',paid:false,createdAt:day.toISOString(),
    consultation:{question:'[테스트 전용 예시] 오늘 제가 먼저 살펴볼 일은 무엇인가요?',kindLabel:'테스트 질문'},
    manifest:[{id:'test',title:'테스트 상담',ordinal:0}],chapters:[],recovery:{canRetryNow:false,savedChapters:0,totalChapters:1}};
  try{prepareSpread(fortune,body);}catch{return fail('INVALID_TAROT_SPREAD',400);}
  state.fortunes.set(id,{attempt:body.consultationAttemptId,digest,sku:product.sku,fortune});save();
  return json({fortune});
}

function grant(body,state,save,date,delay){
  const row=state.fortunes.get(body.requestId);
  if(!row||row.sku!==body.sku||typeof body.orderId!=='string'||!body.orderId.trim())return fail('ORDER_MISMATCH',403);
  const prior=state.orders.get(body.orderId);
  if((state.orders.has(body.orderId)&&prior!==body.requestId)||(row.orderId&&row.orderId!==body.orderId))return fail('ORDER_ALREADY_ASSIGNED',409);
  if(row.fortune.state==='AWAITING_DRAW')return fail('TAROT_DRAW_REQUIRED',409);
  if(!row.orderId){
    const paid={...row.fortune,paid:true,state:'GENERATING'};
    state.fortunes.set(body.requestId,{...row,orderId:body.orderId,generationCount:1,readyAt:date.getTime()+delay,fortune:paid});state.orders.set(body.orderId,body.requestId);
    if(!save()){state.fortunes.set(body.requestId,row);state.orders.delete(body.orderId);return fail('MOCK_STORAGE_UNAVAILABLE',503);}
  }
  return json({orderId:body.orderId,requestId:body.requestId,entitlement:'granted',durable:true});
}

function finishReadyJobs(state,save,date){
  for(const item of state.fortunes.values()){
    if(item.fortune.state!=='GENERATING'||date.getTime()<item.readyAt)continue;
    item.fortune={...item.fortune,state:'COMPLETED',chapters:[fixedChapter],recovery:{canRetryNow:false,savedChapters:1,totalChapters:1}};
    save();
  }
}

function grantLetter({requestId,orderId,sku},state,save){
  const row=state.letters.get(requestId);
  if(!row||sku!==offlineLetterProduct(row.persona,row.productId)?.sku||typeof orderId!=='string'||!orderId.trim())return fail('ORDER_MISMATCH',403);
  if((state.orders.has(orderId)&&state.orders.get(orderId)!==requestId)||(row.orderId&&row.orderId!==orderId))return fail('ORDER_ALREADY_ASSIGNED',409);
  if(!row.paid){
    state.letters.set(requestId,{...row,orderId,paid:true,state:'COMPLETED',chapters:[{...fixedChapter,summary:'[테스트 전용] '+(row.persona==='neo'?'네오':'연이')+'의 상담 편지 원문입니다.'}],recovery:{canRetryNow:false,savedChapters:1,totalChapters:1}});
    state.orders.set(orderId,requestId);
    if(!save()){state.letters.set(requestId,row);state.orders.delete(orderId);return fail('MOCK_STORAGE_UNAVAILABLE',503);}
  }
  return json({orderId,requestId,entitlement:'granted',durable:true});
}

const dayKey=date=>new Date(date.getTime()+9*3600000).toISOString().slice(0,10);
function daily(path,method,body,url,state,save,now){
  const day=dayKey(now),daily=state.daily;
  if(daily.day!==day){daily.day=day;daily.attended=false;daily.unlocked=false;daily.readings={};}
  const status=()=>({day,balance:daily.balance,attended:daily.attended,unlocked:daily.unlocked,unlockCost:3});
  if(path==='/daily/status'&&method==='GET')return json(status());
  if(path==='/daily/attendance'&&method==='POST'){const awarded=!daily.attended;if(awarded){daily.attended=true;daily.balance++;save();}return json({...status(),awarded});}
  if(path==='/daily/unlock'&&method==='POST'){
    if(!daily.unlocked){if(daily.balance<3)return fail('ANCHOVY_REQUIRED',409);daily.balance-=3;daily.unlocked=true;save();}
    return json(status());
  }
  if(path!=='/daily/reading')return null;
  if(!daily.unlocked)return fail('DAILY_PASS_REQUIRED',403);
  const category=method==='GET'?url.searchParams.get('category'):body?.category;
  const config=dailyRegistry.find(item=>item.id===category&&item.id!=='horary');
  if(!config)return fail('INVALID_CATEGORY',400);
  const saved=daily.readings[category];
  if(method==='GET')return json({result:saved||null});
  if(method!=='POST')return fail('METHOD_NOT_ALLOWED',405);
  if(saved)return json(saved);
  if((category==='basic'||config.fields.some(field=>field.id==='birthDate'))&&!body.birth?.date?.year)return fail('FREE_PROFILE_REQUIRED',400);
  const result={category,day,title:'[테스트 전용] '+config.label,kind:'reflection',summary:'오프라인 당일 결과를 확인하기 위한 고정 예시입니다.',
    paragraphs:['오늘 해볼 작은 일을 하나 떠올려 보세요.'],basis:[{label:'자료',value:'합성 테스트 사례'}],limitations:['실제 출생정보나 운세 계산을 사용하지 않았습니다.'],prompt:'',version:'offline-test'};
  daily.readings[category]=result;save();return json(result);
}

export async function handleReviewFixture(request,url,path,state,save,now,delay=0){
  const method=request.method;
  finishReadyJobs(state,save,now());
  if(method==='POST'&&(path==='/prepare'||path==='/canonical/fortune-chat/consultations/recover')){
    const body=await request.clone().json();
    return safetyResponse(path==='/prepare'?body:body.consultation);
  }
  if(path.startsWith('/daily/'))return daily(path,method,method==='POST'?await request.json():null,url,state,save,now());
  if(path==='/canonical/yeongnyangi/products'&&method==='GET')return json({products:consultationCatalog.map(productView)});
  if(path==='/canonical/yeongnyangi/saju/experience-check'&&method==='POST')return json({check:null});
  if(path==='/canonical/yeongnyangi/requests'&&method==='POST')return prepare(await request.json(),state,save,now());
  const draw=/^\/canonical\/yeongnyangi\/requests\/([a-f0-9]{64})\/tarot-draw$/.exec(path);
  if(draw&&method==='POST')return drawFixture(request,state.fortunes.get(draw[1]),save);
  const owned=[...state.fortunes.values()].filter(row=>row.fortune.paid);
  if(path==='/canonical/yeongnyangi/requests'&&method==='GET')return json({fortunes:owned.map(({fortune})=>({...fortune,recovering:fortune.state!=='COMPLETED',completedChapters:fortune.chapters.length,totalChapters:1})),nextCursor:null});
  const match=/^\/canonical\/yeongnyangi\/requests\/([a-f0-9]{64})(?:\/(generate|activate|conversation|follow-up))?$/.exec(path);
  if(match){
    const row=state.fortunes.get(match[1]);
    if(!row)return fail('RESULT_NOT_FOUND',404);
    if(match[2]&&method==='POST'){
      if(!row.fortune.paid)return fail('PAYMENT_REQUIRED',402);
      if(['conversation','follow-up'].includes(match[2]))return safetyResponse(await request.json())||fail('OFFLINE_FIXTURE_NOT_IMPLEMENTED',501);
    }else if(method!=='GET'||match[2])return fail('METHOD_NOT_ALLOWED',405);
    return json({fortune:row.fortune});
  }
  if(path==='/orders/grant'&&method==='POST'){
    const body=await request.clone().json();
    if(consultationCatalog.some(p=>p.sku===body.sku)||state.fortunes.has(body.requestId))return grant(body,state,save,now(),delay);
    if(letterSku(body.sku)||state.letters.has(body.requestId))return grantLetter(body,state,save);
  }
  if(path==='/orders/restore'&&method==='POST'){
    const {orderId,sku}=await request.clone().json(),id=state.orders.get(orderId);
    const letter=state.letters.get(id);
    if(letter||letterSku(sku)){
      if(!letter?.paid||letter.orderId!==orderId||sku!==offlineLetterProduct(letter.persona,letter.productId)?.sku)return fail('ORDER_MISMATCH',403);
      return json({orderId,requestId:id,entitlement:'granted',durable:true});
    }
    const row=state.fortunes.get(id);
    if(!row&&!consultationCatalog.some(product=>product.sku===sku))return null;
    if(!row?.fortune.paid||row.orderId!==orderId||row.sku!==sku)return fail('ORDER_MISMATCH',403);
    return json({orderId,requestId:id,entitlement:'granted',durable:true});
  }
  if(path==='/library'&&method==='GET')return json({purchases:[
    ...roomPurchases(state),...mockCompassLibrary(state),...mockZiweiDeepLibrary(state),
    ...mockNakshatraLibrary(state),...mockYogaLibrary(state),
    ...owned.map(({fortune,orderId,sku})=>({requestId:fortune.id,orderId,sku,serviceId:'yeongnyangi',selectionId:fortune.productId,productId:fortune.productId,status:'PURCHASED',state:fortune.state,createdAt:fortune.createdAt,completedSections:fortune.chapters.length,totalSections:1})),
    ...[...state.letters.values()].filter(row=>row.paid).map(row=>({requestId:row.id,orderId:row.orderId,sku:offlineLetterProduct(row.persona,row.productId)?.sku,serviceId:row.persona,selectionId:row.persona+':'+row.productId,productId:row.productId,status:'PURCHASED',state:row.state,createdAt:row.createdAt,completedSections:1,totalSections:1})),
  ],nextCursor:null});
  if(/^\/results\/[a-f0-9]{64}$/.test(path)&&method==='GET'){
    const id=path.split('/').at(-1),row=state.fortunes.get(id)?.fortune||state.letters.get(id);
    return row?.paid?json({...row,serviceId:row.persona||'yeongnyangi'}):fail('RESULT_NOT_FOUND',404);
  }
  if(/^\/results\/[a-f0-9]{64}\/conversation$/.test(path)&&method==='POST'){
    const id=path.split('/')[2];
    if(!state.fortunes.get(id)?.fortune.paid&&!state.letters.get(id)?.paid)return fail('RESULT_NOT_FOUND',404);
    return safetyResponse(await request.json())||fail('OFFLINE_FIXTURE_NOT_IMPLEMENTED',501);
  }
  return null;
}
