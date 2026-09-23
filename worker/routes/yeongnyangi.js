import {retryFortune} from '../yeongnyangi/retry.js';
import {prepareHoraryPrompt} from '../yeongnyangi/fortune/free/horary.ts';
import {resolveCurrentLocation} from '../yeongnyangi/fortune/question-sky.ts';
import { requireUserFromRequest } from '../lib/auth.js';
import { connectDb, withMongoRetry } from '../lib/db.js';
import { json, readJson, createHttpError, handleRouteError, notFound } from '../lib/http.js';
import { enforceSensitiveEndpointSecurity } from '../lib/security/index.js';
import { products } from '../yeongnyangi/payments/catalog.ts';
import { activateFortune, prepareFortune, presentFortune, providerReady } from '../yeongnyangi/service.ts';
import { readRequest, ownerId, YeongnyangiRequest } from '../yeongnyangi/repository.js';
import {attendanceStatus,attend,unlockToday,getFreeReading,prepareFreeReading} from '../yeongnyangi/free-service.ts';

const messages={
  INVALID_CONSULTATION_KIND:'상담 종류를 다시 선택해 주세요.',
  CONSULTATION_TIER_REQUIRED:'선택한 전문 상담을 제공하는 등급을 골라 주세요.',
  PARTNER_REQUIRED:'궁합 상대 프로필을 선택해 주세요.',
  DISTINCT_PARTNER_REQUIRED:'본인과 다른 상대 프로필을 선택해 주세요.',
  QUESTION_REQUIRED:'궁금한 이야기를 남겨 주세요.',
  GENERATION_QUEUE_UNAVAILABLE:'상담 재개를 접수하지 못했어요. 잠시 후 같은 상담에서 다시 시도해 주세요.',
  PAYMENT_NOT_ACTIVE:'결제 또는 환불 상태 확인이 필요해요. 다시 결제하지 말고 결제 내역을 확인해 주세요.',
  HORARY_FREE_PROMPT_REQUIRED:'호라리는 무료 프롬프트 화면에서 이용해 주세요.',
  QUESTION_LOCATION_REQUIRED:'위치 사용에 동의하거나 질문 당시 도시를 선택해 주세요.',
  QUESTION_SKY_INPUT:'5자 이상 질문(최대 8개), 주제와 질문자 도시를 확인해 주세요.',
  QUESTION_TIME_REQUIRED:'질문이 떠오른 날짜와 시각을 정확히 입력해 주세요.',
  QUESTION_TIME_AMBIGUOUS:'이 도시에서는 서머타임 전환으로 해당 시각을 하나로 확정할 수 없어요. 다른 명확한 질문 시각으로 상담해 주세요.',
  QUESTION_TIME_RANGE:'질문 시각은 최근 5년 이내이며 미래가 아니어야 해요.',
  QUESTION_CALCULATION_UNAVAILABLE:'질문 순간의 계산을 확인하지 못했어요. 결제 전 다시 시도해 주세요.',
  SPIRIT_INPUT_REQUIRED:'질문, 관계와 상담 주제를 확인해 주세요.',
  SPIRIT_PRODUCT_REQUIRED:'영감 상담은 기존 사주 고등어 상담으로 이용할 수 있어요.',
  SPIRIT_EVIDENCE_UNAVAILABLE:'이번 정보로는 해석 근거를 확인하지 못했어요. 출생정보를 확인해 주세요.',
  "BIRTH_TIME_REQUIRED": "이 운세에는 출생시간이 필요해요. 프로필의 시간을 확인해 주세요.",
  "BIRTH_PLACE_REQUIRED": "이 운세에는 출생지역이 필요해요. 도시와 국가를 입력해 주세요.",
  "PREMIUM_BIRTH_REQUIRED": "선택한 깊이의 상담에는 출생시간, 성별, 출생지역이 모두 필요해요.",
  "INVALID_BIRTH_DATE": "생년월일을 다시 확인해 주세요.",
  "INVALID_LUNAR_DATE": "음력 날짜와 윤달 여부를 다시 확인해 주세요.",
  "INVALID_BIRTH_TIME": "출생시간을 시와 분으로 입력해 주세요.",
  "PROFILE_REQUIRED": "CODE DESTINY 프로필을 선택해 주세요.",
  "PROFILE_NOT_FOUND": "이 계정에서 프로필을 찾지 못했어요. 다시 선택해 주세요.",
  "LLM_NOT_CONFIGURED": "지금은 상담을 준비하고 있어요. 결제는 진행되지 않아요.",
  "GENERATION_REVIEW_REQUIRED": "상담을 완료하지 못해 확인이 필요해요. 다시 결제하지 말고 상담 기록의 주문번호와 함께 문의해 주세요.",
  "FORTUNE_PROVIDER_FAILED": "상담을 잠시 멈췄어요. 다시 결제하지 말고 같은 상담에서 이어가 주세요.",
  "PARTNER_NOT_SUPPORTED": "두 사람의 궁합은 숙요 상담에서 선택해 주세요.",
  "ANCHOVY_REQUIRED": "멸치가 한 마리 필요해요. 먼저 오늘 출석을 확인해 주세요.",
  "DAILY_PASS_REQUIRED": "오늘의 16종을 먼저 열어 주세요. 멸치 한 마리면 모두 볼 수 있어요.",
  "FREE_PROFILE_REQUIRED": "이 운세에는 본인 프로필이 필요해요. 프로필을 선택하거나 새로 만들어 주세요.",
  "INVALID_CATEGORY": "선택한 무료 운세를 찾지 못했어요. 목록에서 다시 골라 주세요.",
  "FREE_READING_PENDING": "영냥이가 같은 이야기를 정리하고 있어요. 잠시 후 다시 확인해 주세요."
};

export async function handleYeongnyangiRoutes(request, env) {
  try {
    const url=new URL(request.url), method=request.method.toUpperCase();
    const path=url.pathname.replace(/^\/api\/yeongnyangi\/?/,'').replace(/\/$/,'');
    if(path==='products' && method==='GET') return json({ok:true,products:products.map(p=>({...p,available:providerReady(env)}))});
    if(['free/horary','location'].includes(path)&&method==='POST'){
      const security=await enforceSensitiveEndpointSecurity({env,request,endpoint:`yeongnyangi:${path}`,allowedMethods:['POST'],requireJson:true,rateLimit:{limit:15,windowSeconds:60},maxPayloadBytes:12000});
      if(!security.ok)return security.response;
      const body=await readJson(request);
      return json({ok:true,...(path==='location'?{location:resolveCurrentLocation(body)}:{result:await prepareHoraryPrompt(env,body)})},{headers:{'Cache-Control':'no-store'}});
    }
    if(path==='profiles' && ['GET','POST'].includes(method)) {
      const {handleYeongnyangiProfiles}=await import('./yeongnyangi-profiles.js');
      return handleYeongnyangiProfiles(request,env);
    }
    const authStart=performance.now();
    const auth=await requireUserFromRequest(request,env);
    const authMs=performance.now()-authStart;
    if(method!=='GET') {
      const security=await enforceSensitiveEndpointSecurity({env,request,userId:auth.userId,endpoint:`yeongnyangi:${method}:${path}`,
        allowedMethods:['POST'],requireJson:true,rateLimit:{limit:30,windowSeconds:60},rateLimitKey:`${auth.userId}:yeongnyangi:write`});
      if(!security.ok) return security.response;
    }
    if(path==='attendance' && method==='GET') return json({ok:true,...await attendanceStatus(env,auth.userId)});
    if(path==='attendance' && method==='POST') return json({ok:true,...await attend(env,auth.userId)});
    if(path==='free/unlock' && method==='POST') return json({ok:true,...await unlockToday(env,auth.userId)});
    if(path==='free/reading' && method==='GET') return json({ok:true,...await getFreeReading(env,auth.userId,url.searchParams.get('category')||'basic')});
    if(path==='free/reading' && method==='POST') return json({ok:true,result:await prepareFreeReading(env,auth.userId,await readJson(request))});
    if(path==='requests' && method==='POST') {
      const body=await readJson(request);
      if(!body || typeof body!=='object' || Array.isArray(body)) {
        throw createHttpError(400,'상담 요청 정보를 확인해 주세요.',{code:'INVALID_REQUEST'});
      }
      return json({ok:true,fortune:presentFortune(await prepareFortune(env,auth.userId,body))},{status:201});
    }
    if(path==='requests' && method==='GET') {
      const dbStart=performance.now();
      await connectDb(env);
      const dbMs=performance.now()-dbStart;
      const cursor=url.searchParams.get('cursor');
      let before={};
      if(cursor){
        const match=cursor.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)_([a-f0-9]{64})$/);
        if(!match||!Number.isFinite(Date.parse(match[1])))throw createHttpError(400,'잘못된 페이지 위치입니다.',{code:'INVALID_CURSOR'});
        const stamp=new Date(match[1]);
        before={$or:[{createdAt:{$lt:stamp}},{createdAt:stamp,_id:{$lt:match[2]}}]};
      }
      const queryStart=performance.now();
      const rows=await withMongoRetry(env,()=>YeongnyangiRequest.find({userId:ownerId(auth.userId),...before})
        .select('_id productId state paymentId createdAt completedAt snapshot.product snapshot.analysis.consultation.consultationKind snapshot.analysis.consultation.kindLabel completedChapters errorCode').sort({createdAt:-1,_id:-1}).limit(31).maxTimeMS(4000).lean(),{retries:1,retryOnOperationTimeout:true,retryAdmissionOnOverload:true});
      const page=rows.slice(0,30),last=page.at(-1);
      return json({ok:true,nextCursor:rows.length>30?`${new Date(last.createdAt).toISOString()}_${last._id}`:null,
        fortunes:page.map(row=>({id:row._id,product:row.snapshot.product,state:row.state,paid:Boolean(row.paymentId),completedChapters:row.completedChapters,createdAt:row.createdAt,consultationKind:row.snapshot.analysis?.consultation?.consultationKind,kindLabel:row.snapshot.analysis?.consultation?.kindLabel}))},{headers:{'Cache-Control':'private, no-store','Server-Timing':`auth;dur=${authMs.toFixed(1)}, db;dur=${dbMs.toFixed(1)}, query;dur=${(performance.now()-queryStart).toFixed(1)}`}});
    }
    const match=path.match(/^requests\/([a-f0-9]{64})(?:\/(activate|generate))?$/);
    if(!match) return notFound();
    const [,id,action]=match;
    if(!action && method==='GET') return json({ok:true,fortune:presentFortune(await readRequest(env,auth.userId,id))});
    if(action==='activate' && method==='POST') return json({ok:true,fortune:presentFortune(await activateFortune(env,auth.userId,id))});
    if(action==='generate' && method==='POST') {
      const row=await retryFortune(env,auth.userId,id);
      return json({ok:true,fortune:presentFortune(row)},{status:row.state==='COMPLETED'?200:202});
    }
    return notFound();
  } catch(error) {
    const code=error?.code || error?.payload?.code;
    if(code==='GENERATION_QUEUE_UNAVAILABLE')return json({ok:false,code,message:messages[code],retryable:true,retryAfterSeconds:30},{status:503,headers:{'Retry-After':'30'}});
    if(code && messages[code] && error?.status)return handleRouteError(createHttpError(error.status,messages[code],{...error.payload,code}),{request,env});
    if(error?.code && error?.status && !error.payload) {
      return handleRouteError(createHttpError(error.status,messages[error.code] || '영냥이가 상담을 이어가지 못했어요. 잠시 후 다시 확인해 주세요.',{code:error.code}),{request,env});
    }
    return handleRouteError(error,{request,env});
  }
}
