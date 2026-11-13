import skyExample from './question-sky-example.json' with {type:'json'};
export {skyExample};
import {handleReviewFixture,offlineCatalog,prashnaProduct} from '../test/offline/review-fixture.mjs';
import {productView} from '../test/offline/yeongnyangi-contracts.mjs';

export const products=offlineCatalog.filter(product=>!product.id.includes(':'));
const replies=(value,status=200)=>Response.json(value,{status});
function exampleReading(kind,body){
  const input=skyExample.input;
  if((body.locale||'ko')!=='ko'||body.question!==input.question||body.questionSky?.location||Object.entries(input.questionSky).some(([key,value])=>(body.questionSky||{})[key]!==value))return replies({error:'QUESTION_SKY_EXAMPLE_REQUIRED',message:'모의 예시 입력하기를 누른 뒤 예시 질문과 시각으로 다시 시도해 주세요.'},422);
  return replies(skyExample[kind]);
}
const unavailable=()=>replies({error:'PRIVATE_SIMULATION_UNAVAILABLE'},404);
const sample={id:'mock-profile',profileId:'mock-profile',name:'테스트 프로필',gender:'F',birthDate:'1990-01-01',timeUnknown:true,calendarType:'solar',birth:{year:1990,month:1,day:1,timeUnknown:true,calType:'solar'}};

export function createSimulationApi(storage,person){
  const token='private-simulation-token-'+person;
  const owner='private-simulation-person-'+person;
  const saved=JSON.parse(storage.getItem('consultations')||'{}');
  const state={profiles:saved.profiles||[sample],loggedIn:saved.loggedIn===true,sequence:saved.sequence??(person==='B'?2**40:0),
    fortunes:new Map(saved.fortunes),orders:new Map(saved.orders),letters:new Map(),intents:new Map()};
  const save=()=>{try{
    storage.setItem('consultations',JSON.stringify({profiles:state.profiles,loggedIn:state.loggedIn,sequence:state.sequence,fortunes:[...state.fortunes],orders:[...state.orders]}));return true;
  }catch{return false;}};
  return async request=>{
    const url=new URL(request.url);
    const path=url.pathname.slice('/private-simulation-api'.length),method=request.method;
    if(!url.pathname.startsWith('/private-simulation-api/'))return unavailable();
    if(path==='/catalog'&&method==='GET')return replies({products});
    if(path==='/canonical/yeongnyangi/products'&&method==='GET')return replies({products:products.filter(p=>p.id!==prashnaProduct.id).map(productView)});
    if(path==='/canonical/yeongnyangi/free/horary'&&method==='POST')return exampleReading('horary',await request.json());
    if(path==='/login'&&method==='POST'){
      const {authorizationCode}=await request.json();
      if(authorizationCode!==owner)return replies({error:'LOGIN_REQUIRED'},401);
      state.loggedIn=true;return save()?replies({token}):replies({error:'MOCK_STORAGE_UNAVAILABLE'},503);
    }
    if(!state.loggedIn||request.headers.get('authorization')!=='Bearer '+token)return replies({error:'LOGIN_REQUIRED'},401);
    if(path==='/session'&&method==='GET')return replies({authenticated:true,environment:'SANDBOX'});
    if(path==='/logout'&&method==='POST'){state.loggedIn=false;save();return replies({ok:true});}
    if(path==='/canonical/auth/me'&&method==='GET')return replies({ok:true,authenticated:true,user:{id:owner,name:'모의 계정 '+person,role:'user'}});
    if(path==='/canonical/geocode'&&method==='GET')return url.searchParams.get('place')==='서울'?replies({name:'서울',lat:37.5665,lng:126.978,timezone:'Asia/Seoul',fallback:false}):replies({error:'PLACE_NOT_FOUND'},404);
    if(path==='/canonical/profile'&&method==='GET')return replies({ok:true,profiles:[]});
    if(path==='/canonical/yeongnyangi/profiles'){
      if(method==='GET')return replies({ok:true,profiles:state.profiles,currentId:state.profiles.at(-1)?.profileId});
      if(method==='POST'){
        const {profile}=await request.json();
        if(!profile?.profileId||!profile.birth?.year)return replies({error:'BIRTH_INVALID'},400);
        const row={...sample,id:profile.profileId,profileId:profile.profileId};
        if(profile.birth.timeUnknown===false){row.timeUnknown=false;row.birth={...sample.birth,timeUnknown:false,hour:8,minute:35};}
        if(!state.profiles.some(item=>item.id===row.id))state.profiles.push(row);
        return save()?replies({ok:true,profile:row}):replies({error:'MOCK_STORAGE_UNAVAILABLE'},503);
      }
    }
    if(path==='/events'&&method==='POST')return replies({ok:true});
    if(['/native/catalog','/tarot-library/catalog'].includes(path))return replies({products:[],flows:[]});
    if(path==='/orders/grant'||path==='/orders/restore'){
      const {sku,orderId}=await request.clone().json();
      if(!products.some(product=>product.sku===sku)||!orderId?.startsWith('private-order-'+person+'-'))return replies({error:'ORDER_MISMATCH'},403);
    }else if(!(/^\/canonical\/yeongnyangi\/(requests(?:\/|$)|saju\/experience-check$)/.test(path)||/^\/results\/[a-f0-9]{64}$/.test(path)||path==='/library'))return unavailable();
    return await handleReviewFixture(request,url,path,state,save,()=>new Date(),1100,body=>exampleReading('prashna',body))||unavailable();
  };
}
