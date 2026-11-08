import {reviewProductIds} from '../../../../worker/toss/review-products.js';
import {getBillingFeaturePricing} from '../../../../worker/lib/billing-feature-registry.js';
import {consultationInputCode,consultationSafetyMessages} from '../../../../lib/fortune/toss-consultation-safety.mjs';

const fishNames={mackerel:'고등어',salmon:'연어',flounder:'광어',tuna:'참치'};
export const reviewCatalog=reviewProductIds.map(id=>{
  const letter=id==='chat_saju';
  const featureKey=letter?'fortune-chat-consultation':'yeongnyangi-'+id.replace('_','-');
  const approvedPriceKRW=getBillingFeaturePricing({featureKey}).pricing?.amountKRW;
  if(!Number.isSafeInteger(approvedPriceKRW)||approvedPriceKRW<=0)throw Error('Missing fixture price: '+id);
  return {id:letter?'yeoni:'+id:id,sku:letter?'mock-yeoni':'mock-'+id,name:letter?'테스트 연이 상담':'테스트 사주 · '+fishNames[id.slice(5)],featureKey,approvedPriceKRW,available:true,chapters:1};
});
const sdkProduct=p=>({sku:p.sku,type:'CONSUMABLE',displayName:p.name,displayAmount:p.approvedPriceKRW.toLocaleString('ko-KR')+'원',iconUrl:'',description:'오프라인 테스트 전용 가상 결제'});
export const reviewSdkProducts=reviewCatalog.map(sdkProduct);
const sajuCatalog=reviewCatalog.filter(p=>p.id.startsWith('saju_'));
const json=(data,status=200)=>Response.json(data,{status});
const fail=(error,status)=>json({error},status);
const fixedChapter={id:'test',title:'테스트 상담',summary:'[테스트 전용 예시] 실제 운세 해석이나 AI 상담 결과가 아닙니다.',analysis:['이 문단은 화면과 구매 후 열람을 확인하기 위한 고정 예시입니다.'],questionAnswers:[]};
const productView=p=>({id:p.id,name:'테스트 사주',priceKRW:p.approvedPriceKRW,currency:'KRW',domain:'saju',systems:['saju'],fishId:p.id.slice(5),fishName:fishNames[p.id.slice(5)],readingKind:'single',chapterCount:1,available:true});
export function safetyResponse(body){
  const code=consultationInputCode(body);
  return code?json({error:code,message:consultationSafetyMessages[code],retryable:false},422):null;
}

async function prepare(body,state,save,day){
  const blocked=safetyResponse(body);if(blocked)return blocked;
  const product=sajuCatalog.find(p=>p.id===body.productId);
  if(!product)return fail('TOSS_PRODUCT_NOT_APPROVED',503);
  if(body.profileId!=='mock-profile'||typeof body.question!=='string'||!body.question.trim()||!body.consultationAttemptId)return fail('INVALID_INPUT',400);
  // Store a digest for retry comparison. Profiles, freeform questions and birth inputs are not fixture records.
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([body.productId,body.profileId,body.question,body.questionDecision])));
  const digest=Array.from(new Uint8Array(bytes),value=>value.toString(16).padStart(2,'0')).join('');
  const prior=[...state.fortunes.values()].find(item=>item.attempt===body.consultationAttemptId);
  if(prior)return prior.digest===digest?json({fortune:prior.fortune}):fail('REQUEST_INPUT_MISMATCH',409);
  const id=(++state.sequence).toString(16).padStart(64,'0');
  const fortune={id,profileId:'mock-profile',productId:product.id,product:productView(product),locale:'ko',state:'CREATED',paid:false,createdAt:day.toISOString(),
    consultation:{question:'[테스트 전용 예시] 오늘 제가 먼저 살펴볼 일은 무엇인가요?',kindLabel:'테스트 질문'},
    manifest:[{id:'test',title:'테스트 상담',ordinal:0}],chapters:[],recovery:{canRetryNow:false,savedChapters:0,totalChapters:1}};
  state.fortunes.set(id,{attempt:body.consultationAttemptId,digest,sku:product.sku,fortune});save();
  return json({fortune});
}

function grant(body,state,save){
  const row=state.fortunes.get(body.requestId);
  if(!row||row.sku!==body.sku||typeof body.orderId!=='string'||!body.orderId.trim())return fail('ORDER_MISMATCH',403);
  const prior=state.orders.get(body.orderId);
  if((state.orders.has(body.orderId)&&prior!==body.requestId)||(row.orderId&&row.orderId!==body.orderId))return fail('ORDER_ALREADY_ASSIGNED',409);
  if(!row.orderId){
    const completed={...row.fortune,paid:true,state:'COMPLETED',chapters:[fixedChapter],recovery:{canRetryNow:false,savedChapters:1,totalChapters:1}};
    state.fortunes.set(body.requestId,{...row,orderId:body.orderId,fortune:completed});state.orders.set(body.orderId,body.requestId);
    if(!save()){state.fortunes.set(body.requestId,row);state.orders.delete(body.orderId);return fail('MOCK_STORAGE_UNAVAILABLE',503);}
  }
  return json({orderId:body.orderId,requestId:body.requestId,entitlement:'granted',durable:true});
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
  if(!['basic','psych'].includes(category))return fail('OFFLINE_FIXTURE_NOT_IMPLEMENTED',501);
  const saved=daily.readings[category];
  if(method==='GET')return json({result:saved||null});
  if(method!=='POST')return fail('METHOD_NOT_ALLOWED',405);
  if(saved)return json(saved);
  if(category==='basic'&&!body.birth?.date?.year)return fail('FREE_PROFILE_REQUIRED',400);
  const result={category,day,title:'[테스트 전용] 오늘의 이야기',kind:'reflection',summary:'오프라인 당일 결과를 확인하기 위한 고정 예시입니다.',
    paragraphs:['오늘 해볼 작은 일을 하나 떠올려 보세요.'],basis:[{label:'자료',value:'합성 테스트 사례'}],limitations:['실제 출생정보나 운세 계산을 사용하지 않았습니다.'],prompt:'',version:'offline-test'};
  daily.readings[category]=result;save();return json(result);
}

export async function handleReviewFixture(request,url,path,state,save,now){
  const method=request.method;
  if(method==='POST'&&(path==='/prepare'||path==='/canonical/fortune-chat/consultations/recover')){
    const body=await request.clone().json();
    return safetyResponse(path==='/prepare'?body:body.consultation);
  }
  if(path.startsWith('/daily/'))return daily(path,method,method==='POST'?await request.json():null,url,state,save,now());
  if(path==='/canonical/yeongnyangi/products'&&method==='GET')return json({products:sajuCatalog.map(productView)});
  if(path==='/canonical/yeongnyangi/saju/experience-check'&&method==='POST')return json({check:null});
  if(path==='/canonical/yeongnyangi/requests'&&method==='POST')return prepare(await request.json(),state,save,now());
  const owned=[...state.fortunes.values()].filter(row=>row.fortune.paid);
  if(path==='/canonical/yeongnyangi/requests'&&method==='GET')return json({fortunes:owned.map(({fortune})=>({...fortune,recovering:false,completedChapters:1,totalChapters:1})),nextCursor:null});
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
    if(sajuCatalog.some(p=>p.sku===body.sku)||state.fortunes.has(body.requestId))return grant(body,state,save);
  }
  if(path==='/orders/restore'&&method==='POST'){
    const {orderId,sku}=await request.clone().json(),id=state.orders.get(orderId);
    const row=state.fortunes.get(id);
    if(!row&&!sajuCatalog.some(product=>product.sku===sku))return null;
    if(!row?.fortune.paid||row.orderId!==orderId||row.sku!==sku)return fail('ORDER_MISMATCH',403);
    return json({orderId,requestId:id,entitlement:'granted',durable:true});
  }
  if(path==='/library'&&method==='GET')return json({purchases:[
    ...owned.map(({fortune,orderId,sku})=>({requestId:fortune.id,orderId,sku,serviceId:'yeongnyangi',selectionId:fortune.productId,productId:fortune.productId,status:'PURCHASED',state:'COMPLETED',createdAt:fortune.createdAt,completedSections:1,totalSections:1})),
    ...[...state.letters.values()].filter(row=>row.paid).map(row=>({requestId:row.id,orderId:row.orderId,sku:'mock-yeoni',serviceId:'yeoni',selectionId:'yeoni:chat_saju',productId:'chat_saju',status:'PURCHASED',state:row.state,createdAt:row.createdAt,completedSections:1,totalSections:1})),
  ],nextCursor:null});
  if(/^\/results\/[a-f0-9]{64}$/.test(path)&&method==='GET'){
    const id=path.split('/').at(-1),row=state.fortunes.get(id)?.fortune||state.letters.get(id);
    return row?.paid?json({...row,serviceId:row.persona==='yeoni'?'yeoni':'yeongnyangi'}):fail('RESULT_NOT_FOUND',404);
  }
  if(/^\/results\/[a-f0-9]{64}\/conversation$/.test(path)&&method==='POST'){
    const id=path.split('/')[2];
    if(!state.fortunes.get(id)?.fortune.paid&&!state.letters.get(id)?.paid)return fail('RESULT_NOT_FOUND',404);
    return safetyResponse(await request.json())||fail('OFFLINE_FIXTURE_NOT_IMPLEMENTED',501);
  }
  return null;
}
