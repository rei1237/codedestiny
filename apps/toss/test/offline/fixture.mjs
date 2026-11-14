import {sukuyoProduct,relationshipProduct,relationshipSukuyoRequest} from './relationship-sukuyo.mjs';
import {expertProducts,mockExpertRequest} from './experts.mjs';
import {syntheticZiweiDeep,mockZiweiDeepRequest} from './ziwei-deep.mjs';
import {mockTarotProducts,mockTarotRequest} from './paid-tarot.mjs';
import {syntheticCompass,mockCompassRequest} from './compass.mjs';
import {syntheticYoga,mockYogaRequest} from './yoga.mjs';
// Explicitly synthetic, local-only fixture for the official SDK devtools.
import {letterRequest} from './letter-fixture.mjs';
import {handleReviewFixture,reviewCatalog,offlineCatalog} from './review-fixture.mjs';
import {neoEmailFixture} from './neo-email-fixture.mjs';
import {roomProducts,roomRequest} from './room-fixture.mjs';
import {syntheticNakshatra,mockNakshatraRequest} from './nakshatra-ai.mjs';
import {assembleChart} from '../../../../lib/human-design/chart.js';
import {DIRECT_PLANETS} from '../../../../lib/human-design/planets.js';
const chartFixture=()=>{const longitudes=shift=>Object.fromEntries(DIRECT_PLANETS.map((planet,index)=>[planet,(index*29+shift)%360]));return {stored:false,chart:assembleChart({personalityLongitudes:longitudes(12),designLongitudes:longitudes(284)})};};
export function createOfflineFixtureApi(storage,{now=()=>new Date()}={}){
 // Both synthetic people use the same device storage and API. Authenticate the
 // request before selecting a person's records, including on a fresh app launch.
 const primary=createAccountFixture(storage,'offline-test-user','local-mock-token',now);
 const secondary=createAccountFixture(storage,'offline-test-user-2','local-mock-token-2',now);
 return {...primary,async handle(request){
   const path=new URL(request.url).pathname;
   const second=path==='/api/toss/login'
     ?storage?.getItem('toss-offline-login-person')==='second'
     :request.headers.get('Authorization')==='Bearer local-mock-token-2';
   const current=second?secondary:primary,other=second?primary:secondary;
   if(['/api/toss/orders/grant','/api/toss/tarot-library/orders/grant'].includes(path)&&request.method==='POST'){
     const {orderId}=await request.clone().json();
     if(other.state.orders.has(orderId))return Response.json({error:'ORDER_MISMATCH'},{status:403});
   }
   return current.handle(request);
 }};
}
function createAccountFixture(storage,owner,token,now){
 const secondary=owner==='offline-test-user-2';
 const key=secondary?'toss-offline-fixture-2':'toss-offline-fixture';
 let saved;try{saved=JSON.parse(storage?.getItem(key)||'null');}catch{saved=null;}
 const state={profiles:saved?.profiles||[{id:'mock-profile',profileId:'mock-profile',name:'테스트 프로필',gender:'F',birthDate:'1990-01-01',timeUnknown:true,calendarType:'solar',birth:{year:1990,month:1,day:1,timeUnknown:true,calType:'solar'}}],loggedIn:saved?.loggedIn===true,intents:new Map(saved?.intents||[]),teaDrafts:new Map(saved?.teaDrafts||[]),letters:new Map(saved?.letters||[]),fortunes:new Map(saved?.fortunes||[]),
  daily:saved?.daily||{day:null,balance:2,attended:false,unlocked:false,readings:{}},orders:new Map(saved?.orders||[]),testOrderSkus:new Map(saved?.testOrderSkus||[]),sequence:Number.isSafeInteger(saved?.sequence)?saved.sequence:(secondary?2**40:0)};
 const save=()=>{try{storage?.setItem(key,JSON.stringify({profiles:state.profiles,loggedIn:state.loggedIn,intents:[...state.intents],teaDrafts:[...state.teaDrafts],letters:[...state.letters],fortunes:[...state.fortunes],daily:state.daily,orders:[...state.orders],testOrderSkus:[...state.testOrderSkus],sequence:state.sequence}));return Boolean(storage);}catch{return false;}};
 const letterProduct=reviewCatalog.find(p=>p.id==='yeoni:chat_saju');
 const product={id:'native:maya:maya-prompt-generator',name:'테스트 상품',sku:'mock-maya',featureKey:'maya-prompt-generator',approvedPriceKRW:1,available:true};
 const respond=(value,status=200)=>Response.json(value,{status});
 const denied=()=>respond({error:'LOGIN_REQUIRED'},401);
 async function handle(request){
  const url=new URL(request.url),path=url.pathname.slice('/api/toss'.length),method=request.method;
  if(path==='/login'&&method==='POST'){state.loggedIn=true;save();return respond({token});}
  // Public product lists mirror worker/toss/routes.js; private requests below still require the mock session.
  if(path==='/manse/calculate'&&method==='POST'){
   const [{calculateTossManse},{saju}]=await Promise.all([import('../../../../worker/toss/manse.js'),import('../../../../worker/yeongnyangi/fortune/saju/index.ts')]);
   try{return respond(await calculateTossManse(await request.json(),saju));}catch(error){return respond({error:error.code||'INVALID_BIRTH'},400);}
  }
  if(path==='/pet-saju/catalog'&&method==='GET'){
   const {tossPetCatalog}=await import('../../../../worker/toss/pet-saju.js');
   return respond(tossPetCatalog());
  }
  if(path==='/pet-saju/blueprint'&&method==='POST'){
   const {calculateTossPet}=await import('../../../../worker/toss/pet-saju.js');
   try{return respond(calculateTossPet(await request.json()));}catch(error){return respond({error:error.code},error.status);}
  }
  if(path==='/catalog'&&method==='GET')return respond({products:offlineCatalog});
  if(path==='/canonical/yeongnyangi/free/horary'&&method==='POST')return fetch('/__offline_question_sky/horary',{method:'POST',body:await request.text()});
  if(path==='/canonical/compass/moon'&&method==='POST')return respond({mansionIdx:3,calculationBasis:'mock',birthTimeKnown:false});
  if(path==='/canonical/compass/calendar'&&method==='POST')return respond({source:'unavailable',solarTerms:[]});
  if(path==='/canonical/compass/narrate'&&method==='POST'){const input=await request.json();return respond({ok:true,pigCommentary:input.baseText});}
  if(path==='/nakshatra/today'&&method==='GET'){
   const {fixtureTodayMoon}=await import('./mansion-reports.mjs');
   return respond(fixtureTodayMoon(url.searchParams.get('sukuyoIndex')));
  }
  if(path==='/nakshatra/resolve'&&method==='POST'){
   const {fixtureMansionReading}=await import('./mansion-reports.mjs');
   return respond(fixtureMansionReading(path,await request.json(),now()));
  }
  if(path==='/tarot-library/free'&&method==='POST'){
   const {freeTarotReading}=await import('../../../../worker/toss/tarot-library.js');const {flowId,input}=await request.json();return respond(await freeTarotReading(flowId,input));
  }
  if(path==='/tarot-library/catalog'&&method==='GET')return respond({flows:mockTarotProducts});
  if(path==='/canonical/naming-prompt/basis'&&method==='POST'){
   const {input}=await request.json();
   try{
    const {namingBasisV2}=await import('../../../../worker/naming-engine/service.ts');
    const [year,month,day]=String(input.birthDate||'').split('-').map(Number);
    const {view}=namingBasisV2({...input,year,month,day});return respond({ok:true,...view});
   }catch{return respond({error:'INVALID_NAMING_INPUT'},422);}
  }
  if(path==='/canonical/yeongnyangi/products'&&method==='GET')return handleReviewFixture(request,url,path,state,save,now);
  if((path==='/charts/astrology'||path==='/charts/vedic')&&method==='POST'){
   if(path==='/charts/astrology'&&(!state.loggedIn||request.headers.get('Authorization')!=='Bearer '+token))return denied();
   const body=await request.json();
   const system=path.endsWith('/vedic')?'vedic':'astrology';
   if(body?.birth?.date?.timeUnknown)return respond({error:'BIRTH_TIME_REQUIRED'},400);
   const names=system==='vedic'?['태양','달','화성','수성','목성','금성','토성','라후','케투']:['태양','달','수성','금성','화성','목성','토성','천왕성','해왕성','명왕성'];
   return respond({system,ascendant:'양자리',positions:names.map((name,i)=>({name,sign:'양자리',house:i+1})),...(system==='vedic'?{mansion:{name:'아슈위니',pada:1}}:{})});
  }
  if(!state.loggedIn||request.headers.get('Authorization')!=='Bearer '+token)return denied();
  if(path.startsWith('/tarot-library/'))return mockTarotRequest(request,path,state,save);
  if(path==='/logout'&&method==='POST'){state.loggedIn=false;save();return respond({ok:true});}
  if(path==='/session'&&method==='GET')return respond({authenticated:true,environment:'SANDBOX'});
  if(path==='/nakshatra/compat'&&method==='POST'){
   const {fixtureMansionReading}=await import('./mansion-reports.mjs');
   return respond(fixtureMansionReading(path,await request.json(),now()));
  }
  if(['/nakshatra/muhurta','/nakshatra/vvip-codex','/nakshatra/lord-report','/nakshatra/dasha-map'].includes(path)&&method==='POST'){
   const body=await request.json();
   if(!state.profiles.some(profile=>profile.profileId===body.profileId))return respond({error:'PROFILE_NOT_FOUND'},404);
   const {fixtureMansionReport}=await import('./mansion-reports.mjs');
   return respond({ok:true,report:fixtureMansionReport(path.split('/').pop(),body,now())});
  }
  if(path==='/today-hub'&&method==='POST'){
   const {profileId,period}=await request.json();
   if(!['today','tomorrow'].includes(period)||typeof profileId!=='string')return respond({error:'INVALID_INPUT'},400);
   if(profileId&&!state.profiles.some(p=>p.profileId===profileId))return respond({error:'PROFILE_NOT_FOUND'},404);
   const {hubDay}=await import('../../../../lib/fortune/hub-period.mjs');
   const {buildTodayNumberDetail,buildTodayNumberPublic}=await import('../../../../worker/lib/today-number-detail.js');
   const target=hubDay(period,now()),number=profileId?buildTodayNumberDetail({month:1,day:1},target):buildTodayNumberPublic(target);
   const demo=(system,label)=>({system,label,anchor:'모의 차트',headline:'테스트용 '+label,body:'오프라인 차트 입력 표시 확인',sections:[]});
   return respond({ok:true,date:[target.year,target.month,target.day].map(n=>String(n).padStart(2,'0')).join('-'),personalized:!!profileId,
    systems:{saju:demo('saju','사주 일진'),sukuyo:demo('sukuyo','숙요 27수'),vedic:demo('vedic','베다 판창가'),number}});
  }
  if(path==='/canonical/geocode'&&method==='GET'){
   return url.searchParams.get('place')==='서울'
    ?respond({name:'서울',lat:37.5665,lng:126.978,timezone:'Asia/Seoul',fallback:false})
    :respond({error:'PLACE_NOT_FOUND'},404);
  }
  const delay=Number(storage?.getItem('toss-offline-generation-delay-ms'));
  const expert=await mockExpertRequest(request,url,path,state,save,now,delay);if(expert)return expert;
  if(path.startsWith('/native/ziwei-deep/'))return mockZiweiDeepRequest(path,request,state,save,now,delay);
  if(path.startsWith('/native/yoga/'))return mockYogaRequest(path,request,state,save,now,delay);
  if(path.startsWith('/native/compass/'))return mockCompassRequest(path,request,state,save,now,delay);
  if(path.startsWith('/native/neo-email'))return neoEmailFixture(storage,owner,now).handle(request,path);
  const roomResponse=await roomRequest(request,url,path,state,save,now);if(roomResponse)return roomResponse;
  if(path.startsWith('/native/nakshatra/'))return mockNakshatraRequest(path,request,state,save,now,delay);
  const reviewResponse=await handleReviewFixture(request,url,path,state,save,now,Number.isFinite(delay)?Math.max(0,delay):0);if(reviewResponse)return reviewResponse;
  // This fixed chart is synthetic and never uses the submitted birth data.
  // The offline shell labels all of its output as test-only.
  if(path==='/olympus/placements'&&method==='POST'){
   const {day}=await request.json();if(!Number.isInteger(day))return respond({error:'BIRTH_INVALID'},400);
   const keys=['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio'];
   return respond({placements:Object.fromEntries(['sun','moon','asc','mercury','venus','mars','jupiter','saturn'].map((planet,i)=>[planet,{key:keys[(day+i)%8],deg:10+i}]))});
  }
  if(path==='/human-design/chart'&&method==='POST')return respond(chartFixture());
  if(path==='/canonical/auth/me'&&method==='GET')return respond({ok:true,authenticated:true,user:{id:owner,name:'테스트 사용자',role:'user'}});
  if(path==='/native/catalog'&&method==='GET')return respond({products:[...expertProducts,product,sukuyoProduct,relationshipProduct,syntheticZiweiDeep,syntheticCompass,syntheticYoga,syntheticNakshatra,...roomProducts]});
  if(path==='/canonical/yeongnyangi/profiles'&&method==='GET')return respond({ok:true,profiles:state.profiles,currentId:state.profiles.at(-1)?.profileId});
  if(path==='/canonical/yeongnyangi/profiles'&&method==='POST'){
   const {profile}=await request.json();if(!profile?.profileId||!profile.birth?.year)return respond({error:'BIRTH_INVALID'},400);
   // Persist only a synthetic profile associated with the generated ID.
   const row={...state.profiles[0],id:profile.profileId,profileId:profile.profileId};
   if(profile.birth.timeUnknown===false){row.timeUnknown=false;row.birth={...row.birth,timeUnknown:false,hour:8,minute:35};}
   if(!state.profiles.some(p=>p.id===row.id))state.profiles.push(row);save();return respond({ok:true,profile:row});
  }
  if(path==='/canonical/profile'&&method==='GET')return respond({ok:true,profiles:state.profiles.map(profile=>({...profile,timezone:'Asia/Seoul'}))});
  if(path==='/canonical/fpti/deep-report/free'&&method==='POST'){
    const {profileId,birthInput}=await request.json(),profile=state.profiles.find(row=>row.profileId===profileId);
    if(!profile)return respond({error:'INVALID_PROFILE'},404);
    if(birthInput?.birthDate!==profile.birthDate||birthInput?.calendarType!==profile.calendarType||birthInput?.birthTimeUnknown!==profile.timeUnknown)return respond({error:'PROFILE_INPUT_MISMATCH'},409);
    const {fixtureFptiReport}=await import('./fpti-report.mjs');
    return respond({ok:true,data:{source:'public',accessSource:'public',featureKey:'premium-fpti-report',profileId,saved:false,report:await fixtureFptiReport(profile)}});
  }
  if(path==='/canonical/saju/career-style'&&['GET','POST'].includes(method)){
   const profileId=method==='GET'?url.searchParams.get('profileId'):(await request.json()).profileId;
   const profile=state.profiles.find(p=>p.profileId===profileId);
   if(!profile)return respond({error:'INVALID_PROFILE'},403);
   const access={ok:true,profileId,unlocked:true,priceKRW:0,accessSource:'public'};
   if(method==='GET')return respond(access);
   const {buildCareerReport}=await import('../../../../lib/saju/career-style/report.mjs');
   return respond({...access,saved:false,report:buildCareerReport({birthDate:profile.birthDate,birthTimeUnknown:profile.timeUnknown,calendarType:profile.calendarType})});
  }
  const relationshipSukuyo=await relationshipSukuyoRequest(request,url,path,state,save,now);if(relationshipSukuyo)return relationshipSukuyo;
  const letterResponse=await letterRequest(request,url,path,state,save);if(letterResponse)return letterResponse;
  if(path==='/events'&&method==='POST')return respond({ok:true});
  if(path==='/native/maya/prepare'&&method==='POST'){
   const body=await request.json();if(!body.input||body.orderId)return respond({error:'MOCK_UNSUPPORTED'},400);
   const id=(++state.sequence).toString(16).padStart(64,'0');const intent={id,sku:product.sku,amountKRW:product.approvedPriceKRW,paid:false,orderId:null,input:body.input};state.intents.set(id,intent);save();return respond(intent);
  }
  if(path==='/orders/grant'&&method==='POST'){
   const body=await request.json(),intent=[product.sku,sukuyoProduct.sku,relationshipProduct.sku,syntheticZiweiDeep.sku,syntheticCompass.sku,syntheticYoga.sku,syntheticNakshatra.sku].includes(body.sku)?state.intents.get(body.requestId):null;if(!intent||intent.sku&&intent.sku!==body.sku||typeof body.orderId!=='string')return respond({error:'ORDER_MISMATCH'},403);
   const prior=state.orders.get(body.orderId);if(prior&&prior!==intent.id||intent.orderId&&intent.orderId!==body.orderId)return respond({error:'ORDER_ALREADY_ASSIGNED'},409);
   state.orders.set(body.orderId,intent.id);intent.orderId=body.orderId;intent.paid=true;save();return respond({orderId:body.orderId,requestId:intent.id,entitlement:'granted',durable:true});
  }
  const match=/^\/native\/maya\/(intents|results)\/([a-f0-9]{64})$/.exec(path);
  if(match){const intent=state.intents.get(match[2]);if(!intent)return respond({error:'RESULT_NOT_FOUND'},404);if(match[1]==='intents'&&method==='GET')return respond(intent);if(!intent.paid)return respond({error:'PAYMENT_REQUIRED'},402);if(method==='POST'){intent.result='[테스트 전용 예시] 이 내용은 실제 운세나 상담 결과가 아닙니다.';save();}return respond({id:intent.id,state:intent.result?'COMPLETED':'PENDING',...(intent.result?{prompt:intent.result}:{})});}
  return respond({error:'OFFLINE_FIXTURE_NOT_IMPLEMENTED'},501);
 }
 return {handle,state,product,letterProduct,sukuyoProduct};
}
