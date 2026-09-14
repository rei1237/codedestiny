import { HttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson, cookieValue } from "../lib/http.js";
import { callGeminiText } from "../lib/gemini.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { runPaidNarrativeDelivery } from "../lib/paid-narrative-delivery.js";
import { countPaidReportBodyChars } from "../lib/paid-report-quality.js";
const clean=value=>String(value || "").trim();
function yogaInput(body) {
  const systemPrompt=clean(body.systemPrompt),userPrompt=clean(body.userPrompt);
  if(!systemPrompt||!userPrompt||systemPrompt.length>14000||userPrompt.length>8000)throw new HttpError(422,"코스 입력을 확인해 주세요.");
  const duration=Number(body.duration)||(Number(userPrompt.match(/(30|60)\s*분/)?.[1])||30);
  if(![30,60].includes(duration))throw new HttpError(422,"코스 시간을 확인해 주세요.");
  return {systemPrompt,userPrompt,duration};
}
function parseJsonCandidate(text) {
  const source = clean(text);
  if (!source) return null;

  const candidates = [source];
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) candidates.push(clean(fenced[1]));

  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(source.slice(firstBrace, lastBrace + 1));
  }

  for (const raw of candidates) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e) {
      // try next candidate
    }
  }

  return null;
}

function validCourse(course,duration) {
  const meta=course?.course_metadata,steps=course?.sequence;
  const text=value=>typeof value==="string"&&value.trim().length>=4;
  if(!meta||!["title","deity_theme","focus_area","chakra_focus"].every(key=>text(meta[key]))||meta.duration_min!==duration
    ||!["Beginner","Intermediate","Advanced"].includes(meta.intensity)||!text(course.closing_mantra)||!Array.isArray(steps)||steps.length<4||steps.length>16)return false;
  if(steps[0].type!=="Warmup"||steps.at(-1).type!=="Relaxation")return false;
  if(steps.some((step,i)=>step.step_number!==i+1||!["Warmup","Asana","Pranayama","Meditation","Relaxation"].includes(step.type)
    ||!Number.isInteger(step.duration_seconds)||step.duration_seconds<30||step.duration_seconds>duration*60
    ||!["sanskrit_name","english_name","breathing_guide","benefits_physical","benefits_spiritual","caution","visual_cue_ui"].every(key=>text(step[key]))
    ||!Array.isArray(step.instructions)||step.instructions.length<2||step.instructions.length>8||step.instructions.some(line=>!text(line))))return false;
  return steps.reduce((sum,step)=>sum+step.duration_seconds,0)===duration*60
    &&countPaidReportBodyChars(steps.flatMap(step=>[...step.instructions,step.breathing_guide,step.caution]).join("\n"))>=800;
}
async function handleGenerateYogaCourse(request,env){
  const body=request.method==="POST"?await readJson(request):{};
  if(request.method==="POST"&&!body.resumeResultId)yogaInput(body);
  const auth=await requireAuth(request,env);
  return runPaidNarrativeDelivery(request,env,auth,body,{
    featureKey:"yoga-guru-per-use",reportType:"yogaGuruCourse",
    verify:async original=>{
      const access=await requirePremiumReportAccess(withPdfFastDbEnv(env),auth.userId,"yogaGuruCourse",{
        ...original,featureKey:"yoga-guru-per-use",reportType:"yogaGuruCourse",
        premiumAccessToken:clean(request.headers.get("x-premium-access-token")||original.premiumAccessToken||cookieValue(request,"cd_premium_access"))||undefined,
        _accessRoute:"/api/yoga-guru",
      });
      if(!access?.ok)throw new HttpError(Number(access?.status||402),"결제 확인이 필요합니다.",{code:access?.code||"PAYMENT_REQUIRED"});
    },
    seed:original=>({input:yogaInput(original),tasks:[{id:"course",minChars:800}],minBodyChars:800}),
    produce:async(_task,state)=>{
      const prompt=[state.input.systemPrompt,"[사용자 입력]",state.input.userPrompt,
        `전체 시간은 정확히 ${state.input.duration}분입니다. duration_seconds의 합은 ${state.input.duration*60}초이고 duration_min은 ${state.input.duration}입니다. 단계는 4~16개, 첫 단계는 Warmup, 마지막은 Relaxation이며 모든 필드를 채우세요. instructions/호흡/주의 안내 본문은 합계 800자 이상, 목표 1,600~2,400자입니다. 신체 치료를 보장하거나 통증을 참게 하지 마세요.`,
        "JSON만 출력하세요. 신화적 상징과 실제 신체 지시를 구분하고 원래 컨디션에 없는 진단을 만들지 마세요.",
      ].join("\n\n");
      const ai=await callGeminiText(env,prompt,{model:clean(env.YOGA_GURU_GEMINI_MODEL),temperature:0.6,maxOutputTokens:8192,thinkingBudget:0,
        timeoutMs:Math.min(45000,Math.max(15000,Number(env.YOGA_GURU_PROVIDER_TIMEOUT_MS)||45000)),fallbackToWorkersAI:false,responseMimeType:"application/json"});
      if(!ai?.ok||ai.truncated||ai.isMock||/mock/i.test(`${ai.provider||""} ${ai.model||""}`))return null;
      const course=parseJsonCandidate(ai.text);if(!validCourse(course,state.input.duration))return null;
      return {evidenceHash:state.evidenceHash,body:JSON.stringify(course)};
    },
    render:state=>({...state.parts.course?JSON.parse(state.parts.course):{},source:state.parts.course?"gemini":"pending",
      requestId:state.body.requestId,duration:state.input.duration,locale:state.locale}),
  });
}
export async function handleYogaGuruRoutes(request,env={}){
  try{const path=getRoutePath(request,"/api/yoga-guru");
    if(path!=="/"&&path!=="/result")return notFound();
    if((path==="/"&&request.method!=="POST")||(path==="/result"&&request.method!=="GET"))return methodNotAllowed();
    return await handleGenerateYogaCourse(request,env);
  }catch(error){if(error.code==="RESULT_STORAGE_UNAVAILABLE")return json({ok:false,retryable:true,reason:error.code,resultId:error.resultId},{status:503});return handleRouteError(error,{request,env});}
}
