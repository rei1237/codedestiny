import {createMusicSimulation} from './music-download.mjs';
import {privateFreeOriginal} from './free-originals.mjs';
import {privateAstroSynastry} from './astro-synastry.mjs';
import {neoEmailFixture} from '../test/offline/neo-email-fixture.mjs';
import {privateVedicReading} from './vedic-reading.mjs';
import {privateAstroReading} from './astro-reading.mjs';
import {privateSecretHouse} from './secret-house.mjs';
import {privateSukuyoTools} from './sukuyo-tools.mjs';
import {privateSukuyoPastLife} from './sukuyo-past-life.mjs';
import {paidFamilyProducts,paidFamilyRequest,paidFamilyPurchases,paidFamilyRecords} from './paid-families.mjs';
import {privateSukuyoYearly} from './sukuyo-yearly.mjs';
import {extendedProducts,extendedRequest,extendedRecords} from './extended-reports.mjs';
import {privatePublicCalculation,privateOwnedCalculation} from './free-calculations.mjs';
import {privateTarotProducts,privateTarotRequest} from './paid-tarot.mjs';
import {humanDesignProducts,humanDesignReportRequest,humanDesignRecords,humanDesignPurchases} from './human-design-report.mjs';
import {privateHumanDesign} from './human-design.mjs';
import skyExample from './question-sky-example.json' with {type:'json'};
export {skyExample};
import {handleReviewFixture,offlineCatalog,prashnaProduct} from '../test/offline/review-fixture.mjs';
import {productView} from '../test/offline/yeongnyangi-contracts.mjs';

import {nativeReportProducts,nativeReportPublicRequest,nativeReportRequest} from './native-reports.mjs';
import {expertProducts,expertRequest,expertRecords} from './experts.mjs';
import {letterRequest} from '../test/offline/letter-fixture.mjs';
import {roomProducts,roomRecords,roomOrderRequest,characterRoomReading} from '../test/offline/room-fixture.mjs';

const letterProducts=offlineCatalog.filter(product=>/^(yeoni|neo):/.test(product.id));
const characterRooms=roomProducts.filter(product=>/^native:(tea|neo):/.test(product.id));
export const products=offlineCatalog.filter(product=>!product.id.includes(':'));
export const sdkProducts=[...products,...letterProducts,...characterRooms,...expertProducts,...nativeReportProducts,...humanDesignProducts,...extendedProducts,...privateTarotProducts,...paidFamilyProducts];
const replies=(value,status=200)=>Response.json(value,{status});
function exampleReading(kind,body){
  const input=skyExample.input;
  if((body.locale||'ko')!=='ko'||body.question!==input.question||body.questionSky?.location||Object.entries(input.questionSky).some(([key,value])=>(body.questionSky||{})[key]!==value))return replies({error:'QUESTION_SKY_EXAMPLE_REQUIRED',message:'모의 예시 입력하기를 누른 뒤 예시 질문과 시각으로 다시 시도해 주세요.'},422);
  return replies(skyExample[kind]);
}
const unavailable=()=>replies({error:'PRIVATE_SIMULATION_UNAVAILABLE'},404);
const sample={id:'mock-profile',profileId:'mock-profile',name:'테스트 프로필',gender:'F',birthDate:'1990-01-01',timeUnknown:true,calendarType:'solar',birth:{year:1990,month:1,day:1,timeUnknown:true,calType:'solar'}};

export function createSimulationApi(storage,person,musicTracks=[]){
  const music=createMusicSimulation(musicTracks);
  const availableProducts=[...sdkProducts,...music.musicProducts];
  const token='private-simulation-token-'+person;
  const owner='private-simulation-person-'+person;
  const saved=JSON.parse(storage.getItem('consultations')||'{}');
  const state={profiles:saved.profiles||[sample],loggedIn:saved.loggedIn===true,sequence:saved.sequence??(person==='B'?2**40:0),
    fortunes:new Map(saved.fortunes),orders:new Map(saved.orders),letters:new Map(saved.letters),intents:new Map(saved.intents),teaDrafts:new Map(saved.teaDrafts)};
  const save=()=>{try{
    storage.setItem('consultations',JSON.stringify({profiles:state.profiles,loggedIn:state.loggedIn,sequence:state.sequence,fortunes:[...state.fortunes],orders:[...state.orders],letters:[...state.letters],intents:[...state.intents],teaDrafts:[...state.teaDrafts]}));return true;
  }catch{return false;}};
  return async request=>{
    const url=new URL(request.url);
    const path=url.pathname.slice('/private-simulation-api'.length),method=request.method;
    if(!url.pathname.startsWith('/private-simulation-api/'))return unavailable();
    if(path==='/catalog'&&method==='GET')return replies({products:[...products,...letterProducts]});
    if(path==='/tarot-library/catalog'&&method==='GET')return replies({flows:privateTarotProducts});
    if(path==='/animal-destiny/reading'&&method==='POST'){
      try{const {tossAnimalDestiny}=await import('../../../worker/toss/animal-destiny.js');return replies(tossAnimalDestiny(await request.json()));}
      catch(error){return replies({error:error?.code||'INVALID_INPUT'},error?.status||400);}
    }
    if(path==='/canonical/saju/section'&&method==='POST')return privateSecretHouse(await request.json());
    if((path==='/sukuyo/basic'||path==='/sukuyo/tools')&&method==='POST')return privateSukuyoTools(await request.json(),path==='/sukuyo/basic');
    if(path==='/canonical/yeongnyangi/products'&&method==='GET')return replies({products:products.filter(p=>p.id!==prashnaProduct.id).map(productView)});
    if(path==='/canonical/yeongnyangi/free/horary'&&method==='POST')return exampleReading('horary',await request.json());
    if(path==='/astro/synastry/people'&&method==='GET')return privateAstroSynastry();
    if(path==='/astro/synastry'&&method==='POST')return privateAstroSynastry(await request.json());
    if(path==='/login'&&method==='POST'){
      const {authorizationCode}=await request.json();
      if(authorizationCode!==owner)return replies({error:'LOGIN_REQUIRED'},401);
      state.loggedIn=true;return save()?replies({token}):replies({error:'MOCK_STORAGE_UNAVAILABLE'},503);
    }
    if(path==='/vedic/reading'&&method==='POST')return privateVedicReading(await request.json());
    if((path==='/astro/chart'||path==='/astro/section')&&method==='POST')return privateAstroReading(await request.json(),path==='/astro/chart'?'chart':'section');
    const publicReport=await nativeReportPublicRequest(request.clone(),path);if(publicReport)return publicReport;
    const publicCalculation=await privatePublicCalculation(request.clone(),url,path);if(publicCalculation)return publicCalculation;
    if(!state.loggedIn||request.headers.get('authorization')!=='Bearer '+token)return replies({error:'LOGIN_REQUIRED'},401);
    if(path==='/sukuyo/past-life'&&method==='POST')return privateSukuyoPastLife(await request.json());
    const ownedCalculation=await privateOwnedCalculation(request.clone(),url,path,state);if(ownedCalculation)return ownedCalculation;
    if(path.startsWith('/native/neo-email'))return neoEmailFixture(storage,owner).handle(request,path);
    if(['/vedic/compatibility','/vedic/prashna','/flower/match'].includes(path)&&method==='POST')return privateFreeOriginal(path,await request.json());
    if(path==='/session'&&method==='GET')return replies({authenticated:true,environment:'SANDBOX'});
    if(path==='/logout'&&method==='POST'){state.loggedIn=false;save();return replies({ok:true});}
    if(path==='/canonical/auth/me'&&method==='GET')return replies({ok:true,authenticated:true,user:{id:owner,name:'모의 계정 '+person,role:'user'}});
    if(path==='/canonical/geocode'&&method==='GET')return url.searchParams.get('place')==='서울'?replies({name:'서울',lat:37.5665,lng:126.978,timezone:'Asia/Seoul',fallback:false}):replies({error:'PLACE_NOT_FOUND'},404);
    if(path==='/canonical/profile'&&method==='GET')return replies({ok:true,profiles:state.profiles.map(profile=>({...profile,timezone:'Asia/Seoul'}))});
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
    if(path==='/human-design/chart'&&method==='POST')return privateHumanDesign((await request.json()).birth);
    if(path==='/sukuyo/yearly'&&method==='POST')return privateSukuyoYearly(person,state.profiles,await request.json());
    if(path==='/events'&&method==='POST')return replies({ok:true});
    const now=()=>new Date();
    if(path==='/canonical/records'&&method==='GET'){const records=await roomRecords(url,state).json();return replies({...records,items:[...records.items,...expertRecords(url,state),...humanDesignRecords(url,state),...extendedRecords(url,state),...paidFamilyRecords(url,state),...music.musicRecords(url,state)]});}
    if(path==='/library'&&method==='GET'){const response=await handleReviewFixture(request,url,path,state,save,now);const body=await response.json();return replies({...body,purchases:[...body.purchases,...humanDesignPurchases(state),...paidFamilyPurchases(state).filter(row=>row.nativeService!=='sukuyo'),...music.musicPurchases(state)]});}
    if(path==='/native/catalog'&&method==='GET')return replies({products:[...characterRooms,...expertProducts,...nativeReportProducts,...humanDesignProducts,...extendedProducts,...paidFamilyProducts,...music.musicProducts]});
    if(path.startsWith('/native/music/'))return await music.musicRequest(request,url,path,state,save,now)||unavailable();
    if(!path.startsWith('/orders/')){const family=await paidFamilyRequest(request.clone(),url,path,state,save,now);if(family)return family;}
    if(path.startsWith('/native/')){const extended=await extendedRequest(request.clone(),url,path,state,save,now);if(extended)return extended;}
    if(path==='/tarot-library/catalog'||path.startsWith('/tarot-library/results/'))return await privateTarotRequest(request,path,state,save)||unavailable();
    if(!path.startsWith('/orders/')){const hd=await humanDesignReportRequest(request.clone(),url,path,state,save,now);if(hd)return hd;}
    if(!path.startsWith('/orders/')){const nativeReport=await nativeReportRequest(request.clone(),url,path,state,save,now);if(nativeReport)return nativeReport;}
    const expertResponse=path.startsWith('/orders/')?null:await expertRequest(request.clone(),url,path,state,save,now);
    if(expertResponse&&path!=='/orders/grant'&&path!=='/orders/restore')return expertResponse;
    if(/^\/native\/(tea|neo)\/(prepare|intents\/[a-f0-9]{64})$/.test(path))return await roomOrderRequest(request,url,path,state,save,now)||unavailable();
    if(/^\/canonical\/(fortune-tea-house|neo-operation-room)\//.test(path))return await characterRoomReading(request,url,path,state,save,now)||unavailable();
    if(/^\/canonical\/fortune-chat\/consultations(?:\/|$)/.test(path)){
      return await letterRequest(request,url,path,state,save)||unavailable();
    }
    if(path==='/orders/grant'||path==='/orders/restore'||path==='/tarot-library/orders/grant'){
      const {sku,orderId}=await request.clone().json();
      if(!availableProducts.some(product=>product.sku===sku)||!orderId?.startsWith('private-order-'+person+'-'))return replies({error:'ORDER_MISMATCH'},403);
      if(privateTarotProducts.some(product=>product.sku===sku))return await privateTarotRequest(request,path,state,save)||unavailable();
      if(path==='/tarot-library/orders/grant')return unavailable();
      if(music.musicProducts.some(product=>product.sku===sku))return await music.musicRequest(request,url,path,state,save,now)||unavailable();
      if(paidFamilyProducts.some(product=>product.sku===sku))return await paidFamilyRequest(request,url,path,state,save,now)||unavailable();
      if(extendedProducts.some(product=>product.sku===sku))return await extendedRequest(request,url,path,state,save,now)||unavailable();
      if(humanDesignProducts.some(product=>product.sku===sku))return await humanDesignReportRequest(request,url,path,state,save,now)||unavailable();
      if(nativeReportProducts.some(product=>product.sku===sku))return await nativeReportRequest(request,url,path,state,save,now)||unavailable();
      if(expertProducts.some(product=>product.sku===sku))return await expertRequest(request,url,path,state,save,now)||unavailable();
      if(characterRooms.some(product=>product.sku===sku))return await roomOrderRequest(request,url,path,state,save,now)||unavailable();
    }else if(!(/^\/canonical\/yeongnyangi\/(requests(?:\/|$)|saju\/experience-check$)/.test(path)||/^\/results\/[a-f0-9]{64}$/.test(path)||path==='/library'))return unavailable();
    return await handleReviewFixture(request,url,path,state,save,()=>new Date(),1100,body=>exampleReading('prashna',body))||unavailable();
  };
}
