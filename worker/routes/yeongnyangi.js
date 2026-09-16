import { requireUserFromRequest } from '../lib/auth.js';
import { connectDb, withMongoRetry } from '../lib/db.js';
import { json, readJson, createHttpError, handleRouteError, notFound } from '../lib/http.js';
import { enforceSensitiveEndpointSecurity } from '../lib/security/index.js';
import { products } from '../yeongnyangi/payments/catalog.ts';
import { activateFortune, generateNextChapter, prepareFortune, presentFortune, providerReady } from '../yeongnyangi/service.ts';
import { readRequest, ownerId, YeongnyangiRequest } from '../yeongnyangi/repository.js';
import {attendanceStatus,attend,unlockToday,getFreeReading,prepareFreeReading} from '../yeongnyangi/free-service.ts';

const messages={
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
    const auth=await requireUserFromRequest(request,env);
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
      await connectDb(env);
      const cursor=url.searchParams.get('cursor');
      let before={};
      if(cursor){
        const match=cursor.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)_([a-f0-9]{64})$/);
        if(!match||!Number.isFinite(Date.parse(match[1])))throw createHttpError(400,'잘못된 페이지 위치입니다.',{code:'INVALID_CURSOR'});
        const stamp=new Date(match[1]);
        before={$or:[{createdAt:{$lt:stamp}},{createdAt:stamp,_id:{$lt:match[2]}}]};
      }
      const rows=await withMongoRetry(env,()=>YeongnyangiRequest.find({userId:ownerId(auth.userId),...before})
        .select('_id productId state paymentId createdAt completedAt snapshot.product completedChapters errorCode').sort({createdAt:-1,_id:-1}).limit(31).lean());
      const page=rows.slice(0,30),last=page.at(-1);
      return json({ok:true,nextCursor:rows.length>30?`${new Date(last.createdAt).toISOString()}_${last._id}`:null,
        fortunes:page.map(row=>({id:row._id,product:row.snapshot.product,state:row.state,paid:Boolean(row.paymentId),completedChapters:row.completedChapters,createdAt:row.createdAt}))});
    }
    const match=path.match(/^requests\/([a-f0-9]{64})(?:\/(activate|generate))?$/);
    if(!match) return notFound();
    const [,id,action]=match;
    if(!action && method==='GET') return json({ok:true,fortune:presentFortune(await readRequest(env,auth.userId,id))});
    if(action==='activate' && method==='POST') return json({ok:true,fortune:presentFortune(await activateFortune(env,auth.userId,id))});
    if(action==='generate' && method==='POST') return json({ok:true,fortune:presentFortune(await generateNextChapter(env,auth.userId,id))});
    return notFound();
  } catch(error) {
    if(error?.code && error?.status && !error.payload) {
      return handleRouteError(createHttpError(error.status,messages[error.code] || '영냥이가 상담을 이어가지 못했어요. 잠시 후 다시 확인해 주세요.',{code:error.code}),{request,env});
    }
    return handleRouteError(error,{request,env});
  }
}
