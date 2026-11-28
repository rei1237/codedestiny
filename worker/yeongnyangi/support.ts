import {createHash} from 'node:crypto';
import {json,readJson} from '../lib/http.js';
import {connectDb,withMongoRetry} from '../lib/db.js';
import {enforceRateLimit} from '../lib/security/index.js';
import {callGeminiText} from '../lib/gemini.js';
import {ownerId,YeongnyangiRequest,userCanRetry} from './repository.js';
import {hasRequestAccess} from './access-methods.js';
import {matchFaq,supportKnowledge,SUPPORT_CONTACT_PATH,SUPPORT_LIBRARY_PATH} from './support-knowledge';

// S9 support desk, layer 2 (POST /api/yeongnyangi/support). Free, logged-in only.
// 🔴 The LLM gets no tools. The server injects only (a) the knowledge JSON built from the catalog/FAQ/brand facts and
//    (b) a summary of the caller's own requests, looked up by the authenticated userId: product name, state, paid,
//    chapter progress, retry flag, date and a hashed ref. No names, birth data, questions or consultation text.
// Order: FAQ keyword match (no LLM) → cost caps (fail-closed) → Workers AI → Gemini once → fixed fallback text.
export const SUPPORT_QUESTION_MIN=2;
export const SUPPORT_QUESTION_MAX=300;
export const SUPPORT_ANSWER_MAX=800;
export const SUPPORT_LIMITS={userDaily:10,globalDaily:300,globalMonthly:3000};
const DAY=86400,MONTH=30*DAY;
// security/index.js is plain JS; tsc infers its destructured parameter without env/request, so the call is typed here.
const rateLimit=enforceRateLimit as unknown as (args:Record<string,unknown>)=>Promise<{ok?:boolean;count?:number}|null>;
const HEADERS={'Cache-Control':'private, no-store'};
export const SUPPORT_FALLBACK=`지금은 자동 안내를 드리기 어려워요. 결제한 상담은 내 상담(${SUPPORT_LIBRARY_PATH})에서 진행 상태를 확인할 수 있고, 문제가 계속되면 문의하기(${SUPPORT_CONTACT_PATH})로 알려 주세요.`;
const SYSTEM=[
 '너는 꿀꿀 운세의 영냥이 상담 고객센터 안내 도우미다. 운세나 상담 풀이는 하지 않는다.',
 '답은 KNOWLEDGE 와 MY_ORDERS 에 있는 사실로만 한다. 가격·정책·기간·환불 여부를 지어내지 않는다. 모르면 문의하기 경로를 안내한다.',
 'MY_ORDERS 는 질문한 사용자 본인의 주문 요약이다. ref 외의 식별자를 묻거나 만들지 않는다. 생년월일·이름·연락처·결제 정보를 요구하지 않는다.',
 '결제했는데 결과가 없거나 멈춘 주문이 있으면 내 상담 화면에서 다시 열거나 다시 시도하도록 안내하고, 그래도 안 되면 ref 를 적어 문의하도록 안내한다.',
 '환불을 약속하거나 처리했다고 말하지 않는다. 환불 기준은 환불 정책을 따른다고만 안내한다.',
 '해요체로 3~5문장, 400자 안쪽으로 답한다. 목록·표·마크다운·링크 문법을 쓰지 않는다. 경로는 /yeongnyangi/library/ 처럼 그대로 적는다.',
].join('\n');

const ref=(value:unknown)=>createHash('sha256').update(String(value)).digest('hex').slice(0,12);
// json() widens any no-store to "no-store, no-cache, must-revalidate"; the support contract is exactly "private, no-store".
const reply=(body:Record<string,unknown>,status=200,extra:Record<string,string>={})=>{
 const res=json({contactHref:SUPPORT_CONTACT_PATH,...body},{status,headers:{...HEADERS,...extra}});
 res.headers.set('Cache-Control',HEADERS['Cache-Control']);
 return res;
};
const fallback=(status=200,code?:string,extra:Record<string,string>={})=>reply({ok:status<400,source:'fallback',answer:SUPPORT_FALLBACK,...(code?{code}:{})},status,extra);

// Deterministic format correction (principle 17): strip markup and cut at the last sentence end inside the cap.
export function clampSupportAnswer(text:unknown){
 const plain=String(text||'').replace(/[*#`>|]+/g,'').replace(/\n{3,}/g,'\n\n').trim();
 if(plain.length<=SUPPORT_ANSWER_MAX)return plain;
 const cut=plain.slice(0,SUPPORT_ANSWER_MAX),end=Math.max(cut.lastIndexOf('요.'),cut.lastIndexOf('다.'),cut.lastIndexOf('. '));
 return end>SUPPORT_ANSWER_MAX/2?cut.slice(0,end+2).trim():cut.trim();
}

// Cost caps are fail-closed: an over-limit count, or no count at all (guard off, counter unavailable), stops the LLM call.
async function withinCaps(env:any,request:Request,userId:string){
 const checks:[string,string,number,number][]=[
  ['yeongnyangi:support:user-daily',`${userId}:yeongnyangi:support`,SUPPORT_LIMITS.userDaily,DAY],
  ['yeongnyangi:support:global-daily','global:yeongnyangi:support:daily',SUPPORT_LIMITS.globalDaily,DAY],
  ['yeongnyangi:support:global-monthly','global:yeongnyangi:support:monthly',SUPPORT_LIMITS.globalMonthly,MONTH],
 ];
 for(const [endpoint,key,limit,windowSeconds] of checks){
  const result:any=await rateLimit({env,request,userId:endpoint.endsWith('user-daily')?userId:'',endpoint,key,limit,windowSeconds}).catch(()=>null);
  const count=Number(result?.count);
  if(!result?.ok||!Number.isSafeInteger(count)||count>limit)return {ok:false,retryAfter:String(windowSeconds-Math.floor(Date.now()/1000)%windowSeconds)};
 }
 return {ok:true,retryAfter:''};
}

export async function ownOrderSummary(env:any,userId:string){
 await connectDb(env);
 const rows:any[]=await withMongoRetry(env,()=>YeongnyangiRequest.find({userId:ownerId(userId),persona:null,state:{$ne:'AWAITING_DRAW'}})
  .select('_id productId state paymentId accessMethod passEvidenceId moonstoneLedgerId packEntitlementId createdAt completedAt snapshot.product.name snapshot.manifest.id completedChapters errorCode manualRecoveryGrants systemRecoveryGrants hold')
  .sort({createdAt:-1,_id:-1}).limit(10).maxTimeMS(4000).lean(),{retries:1,retryOnOperationTimeout:true});
 return (rows||[]).map(row=>({ref:ref(row._id),product:String(row.snapshot?.product?.name||row.productId||'').slice(0,40),state:String(row.state||''),
  paid:hasRequestAccess(row),completedChapters:Number(row.completedChapters)||0,totalChapters:Array.isArray(row.snapshot?.manifest)?row.snapshot.manifest.length:null,
  canRetry:userCanRetry(row),createdAt:row.createdAt?new Date(row.createdAt).toISOString().slice(0,10):null}));
}

export async function handleSupportQuestion(request:Request,env:any,userId:string){
 const body:any=await readJson(request).catch(()=>null);
 const question=String(body?.question??'').replace(/\s+/g,' ').trim();
 if(question.length<SUPPORT_QUESTION_MIN||question.length>SUPPORT_QUESTION_MAX)
  return reply({ok:false,code:'INVALID_SUPPORT_QUESTION',message:`질문은 ${SUPPORT_QUESTION_MIN}~${SUPPORT_QUESTION_MAX}자로 적어 주세요.`},400);
 const faq=matchFaq(question);
 if(faq)return reply({ok:true,source:'faq',question:faq.question,answer:faq.answer});
 const caps=await withinCaps(env,request,userId);
 if(!caps.ok)return fallback(429,'SUPPORT_LIMIT_REACHED',{'Retry-After':caps.retryAfter});
 let orders:unknown[];
 try{orders=await ownOrderSummary(env,userId);}catch{return fallback();}
 const prompt=JSON.stringify({KNOWLEDGE:supportKnowledge(),MY_ORDERS:orders,QUESTION:question});
 const response:any=await callGeminiText(env,prompt,{systemPrompt:SYSTEM,primaryProvider:'cloudflare',locale:'ko',temperature:0.2,maxOutputTokens:1024,thinkingBudget:0,timeoutMs:20000,maxProviderAttempts:1,taskType:'general',logContext:{sectionGroup:'yeongnyangi-support'}}).catch(()=>null);
 const answer=response?.ok&&!response.isMock?clampSupportAnswer(response.text):'';
 if(!answer)return fallback();
 return reply({ok:true,source:'llm',provider:response.provider||null,answer});
}
