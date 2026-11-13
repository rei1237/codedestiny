import { isStoredPaidResultRevoked } from './paid-result-revocation.js';
import { connectDb } from './db.js';
import { ServiceExecutionTransaction } from './models.js';
import { computeBirthKey } from './birth-key.js';
import { callGeminiJsonWithRetry } from './structured-consultation.js';
import { buildSibylAnnual, validateSibylYear } from './sibyl-annual.js';

export const SIBYL_CHAPTERS = [
  ['coreMatrix','올해의 핵심 브리핑'],['riskAnalysis','가장 먼저 점검할 흐름'],
  ['aptitudeAnalysis','타고난 강점과 활용법'],['tenGodPattern','반복되는 선택의 패턴'],
  ['elementBalance','균형을 되찾는 개운 행동'],['yearlyFlow','선택 연도의 변화와 대운'],
  ['monthlyPlanner','월별 주의 시기와 대비'],['relationship','연애와 인간관계'],
  ['moneyCareer','금전과 직장·일'],['finalMessage','실행 계획과 판단 전환 기준'],
];
export function validateSibylCounsel(value, analysis) {
  const allowed = new Set(['annual',...(analysis.major?['major']:[]),...analysis.months.map(m=>m.id)]);
  if (!Array.isArray(value?.chapters) || value.chapters.length!==10) throw new Error('SIBYL_COUNSEL_INVALID');
  const chapters = SIBYL_CHAPTERS.map(([key,title]) => {
    const rows=value.chapters.filter(c=>c.key===key);
    const c=rows[0]; const content=String(c?.content||'').trim();
    if(rows.length!==1 || content.length<400 || content.length>2400 || /\d|[%％]|[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]|반드시|무조건|백퍼센트/.test(content)
      || !Array.isArray(c.evidenceIds) || !c.evidenceIds.length || c.evidenceIds.some(id=>!allowed.has(id))) throw new Error('SIBYL_COUNSEL_INVALID');
    // Technical facts/dates are rendered from the engine only. Narrative must remain plain language.
    if (/(?:일주|월주|시주|년주)(?:[ 은는이가을를의에]|$)|월생|월에는|월부터|(?:십이|십일|십|일|이|삼|사|오|유|육|칠|팔|구|정)월(?:[ 은는이가을를의에부]|$)|내년|내달|다음\s*달|갑목|을목|병화|정화|무토|기토|경금|신금|임수|계수|비견|겁재|식신|상관격|정재|편재|정관|편관|정인|편인|용신|기신|일간|월지/.test(content)) throw new Error('SIBYL_COUNSEL_UNSUPPORTED_FACT');
    return {key,title,content,evidenceIds:[...new Set(c.evidenceIds)]};
  });
  if(chapters.reduce((sum,c)=>sum+c.content.length,0)<5000) throw new Error('SIBYL_COUNSEL_TOO_SHORT');
  return chapters;
}
// V1 프롬프트 바이트는 바꾸지 않는다(sha256 테스트가 지킨다). 2판 첫 호출도 같은 바이트를 보낸다.
export function buildSibylCounselPrompt(analysis) {
  return `당신은 시빌라의 차분하고 구체적인 한국어 상담가입니다. 제공된 명리 계산 사실만 근거로 생활 대비 리포트를 작성합니다.
계산하거나 미래 사건을 확정하지 마세요. 사건 확률, 성공 보장, 공포·모욕, 투자·의료 판단 대행은 금지입니다.
숫자·날짜·간지·사주 전문용어는 화면이 계산값 그대로 표시합니다. 상담 본문에는 숫자, 퍼센트, 한자, 간지, 월 이름을 쓰지 말고 '아래 근거의 주의 구간'처럼 참조하세요. 용신을 새로 판정하지 마세요.
각 장은 우선 권고, 그 이유, 생활에서 알아볼 징후, 실행 행동, 확인 기준과 판단 전환 조건을 자연스러운 짧은 문단으로 쓰세요. 같은 문장으로 분량을 채우지 마세요. 기질의 장점과 그림자를 함께 설명하고 직장 밖의 일에도 적용하세요.
각 장은 한글 600~900자, 전체 7000~9000자를 목표로 합니다. 근거가 부족한 시주·대운은 부족함을 밝히고 지어내지 마세요.
JSON만 반환: {"chapters":[{"key":"지정 key","content":"상담 본문","evidenceIds":["annual 또는 major 또는 month-1 등 제공 근거 ID"]}]}. 반드시 아래 열 장을 순서대로 작성하세요.
장: ${JSON.stringify(SIBYL_CHAPTERS)}
계산 근거: ${JSON.stringify(analysis)}`;
}
export async function generateSibylCounsel(env, analysis) {
  const prompt = buildSibylCounselPrompt(analysis);
  const result=await callGeminiJsonWithRetry(env,prompt,{attempts:1,baseTokens:16000,capTokens:16000,temperature:0.35,taskType:'fortune',timeoutMs:60000,fallbackToWorkersAI:true,fallbackMinChars:5000});
  if(!result?.ok) throw new Error('SIBYL_GENERATION_UNAVAILABLE');
  return {chapters:validateSibylCounsel(JSON.parse(result.text),analysis),model:String(result.model||''),source:'server-calculation-ai'};
}
// ── 배달 2판 (6c-5) ─────────────────────────────────────────────
// 1판은 열 장을 한 번에 만들고 한 장이라도 떨어지면 전부 버린다. 2판은 새 기록에만 고정되며
// 통과한 장을 체크포인트(metadata.sibylDelivery)에 남기고 실패한 장만 다시 만든다.
// 분량은 치명이 아니다: 바닥(400자) 아래 장만 기록당 3장까지 한 번 수리하고, 그다음은 그대로 받는다.
// 장마다 세 번째 시도는 마지막 시도다: 걸린 문장만 덜어 내고 받는다. 글이 없는 장은 빼지 않고 계속 만든다.
// 환불 경로는 원래 없다(평생 출생 이용권). 본문이 하나도 없으면 1판처럼 재시도 가능한 실패로 둔다.
export const SIBYL_DELIVERY_PLAN_VERSION = 2;
export function sibylDeliveryV2Enabled(env) {
  return String(env?.SIBYL_DELIVERY_V2_ENABLED ?? '').trim().toLowerCase() !== 'false';
}
export function isSibylDeliveryV2(record) {
  return Number(record?.metadata?.deliveryPlanVersion) === SIBYL_DELIVERY_PLAN_VERSION;
}
// 1판 validateSibylCounsel과 같은 패턴. 전역(/g) 플래그를 두지 않는다(.test의 lastIndex 함정).
const SIBYL_UNSAFE_RX=/\d|[%％]|[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]|반드시|무조건|백퍼센트/;
const SIBYL_UNSUPPORTED_RX=/(?:일주|월주|시주|년주)(?:[ 은는이가을를의에]|$)|월생|월에는|월부터|(?:십이|십일|십|일|이|삼|사|오|유|육|칠|팔|구|정)월(?:[ 은는이가을를의에부]|$)|내년|내달|다음\s*달|갑목|을목|병화|정화|무토|기토|경금|신금|임수|계수|비견|겁재|식신|상관격|정재|편재|정관|편관|정인|편인|용신|기신|일간|월지/;
const SIBYL_V2_CHAPTER_FLOOR = 400;
const SIBYL_V2_MAX_CONTENT_ATTEMPTS = 3;
const SIBYL_V2_MAX_LENGTH_REPAIRS = 3;
// 클라이언트 fetch 75초·엣지 100초 컷 안에서 끝낸다. 요청마다 호출은 최대 2회.
const SIBYL_V2_REQUEST_BUDGET_MS = 70000;
const SIBYL_V2_FIRST_CALL_MS = 60000;
const SIBYL_V2_REPAIR_CALL_MAX_MS = 45000;
const SIBYL_V2_MIN_CALL_MS = 20000;
const SIBYL_V2_MAX_CALLS_PER_REQUEST = 2;
const SIBYL_V2_HINTS = {
  empty:'이 장이 빠졌습니다. 빠짐없이 새로 쓰세요.',
  short:'이 장이 짧습니다. 우선 권고, 이유, 징후, 실행 행동, 확인 기준을 갖춰 한글 600~900자로 넉넉하게 쓰세요.',
  unsafe_expression:'숫자, 퍼센트, 한자와 간지 글자, 단정하는 표현을 쓰지 말고 다시 쓰세요.',
  unsupported_fact:'달 이름, 간지 이름, 사주 전문용어를 쓰지 말고 아래 근거의 주의 구간처럼 참조하세요.',
  evidence:'근거 ID는 아래 계산 근거에 있는 ID만 쓰세요.',
};
const isCleanSibylText = text => !SIBYL_UNSAFE_RX.test(text) && !SIBYL_UNSUPPORTED_RX.test(text);
export function scrubSibylText(text) {
  return String(text || '').split(/\n+/)
    .map(par => (par.match(/[^.!?。…]+(?:[.!?。…]+|$)\s*/g) || []).filter(isCleanSibylText).join('').trim())
    .filter(Boolean).join('\n\n').trim();
}
export function buildSibylCounselRepairPrompt(analysis, keys, chapters = {}) {
  const wanted = SIBYL_CHAPTERS.filter(([key]) => keys.includes(key));
  const notes = wanted.map(([key, title]) => {
    const issues = [...new Set(chapters[key]?.issues?.length ? chapters[key].issues : ['empty'])];
    return `- ${title}: ${issues.map(issue => SIBYL_V2_HINTS[issue]).filter(Boolean).join(' ')}`;
  }).join('\n');
  return `당신은 시빌라의 차분하고 구체적인 한국어 상담가입니다. 제공된 명리 계산 사실만 근거로 생활 대비 리포트를 작성합니다.
계산하거나 미래 사건을 확정하지 마세요. 사건 확률, 성공 보장, 공포·모욕, 투자·의료 판단 대행은 금지입니다.
숫자·날짜·간지·사주 전문용어는 화면이 계산값 그대로 표시합니다. 상담 본문에는 숫자, 퍼센트, 한자, 간지, 월 이름을 쓰지 말고 '아래 근거의 주의 구간'처럼 참조하세요. 용신을 새로 판정하지 마세요.
각 장은 우선 권고, 그 이유, 생활에서 알아볼 징후, 실행 행동, 확인 기준과 판단 전환 조건을 자연스러운 짧은 문단으로 쓰세요. 같은 문장으로 분량을 채우지 마세요. 기질의 장점과 그림자를 함께 설명하고 직장 밖의 일에도 적용하세요.
각 장은 한글 600~900자를 목표로 합니다. 근거가 부족한 시주·대운은 부족함을 밝히고 지어내지 마세요.
나머지 장은 이미 완성되었습니다. 아래 ${wanted.length}개 장만 순서대로 다시 작성하세요.
보완 요청:
${notes}
JSON만 반환: {"chapters":[{"key":"지정 key","content":"상담 본문","evidenceIds":["annual 또는 major 또는 month-1 등 제공 근거 ID"]}]}.
장: ${JSON.stringify(wanted)}
계산 근거: ${JSON.stringify(analysis)}`;
}
function parseSibylRows(text) {
  try { const value = JSON.parse(String(text || '')); return Array.isArray(value?.chapters) ? value.chapters : []; } catch { return []; }
}
export function applySibylCounselRound(state, rows, requested, allowed) {
  for (const key of requested) {
    const ch = state.chapters[key] ||= { valid:false, attempts:0, content:'', evidenceIds:[], draft:'', draftEvidenceIds:[], issues:[] };
    ch.attempts += 1;
    const final = ch.attempts >= SIBYL_V2_MAX_CONTENT_ATTEMPTS;
    const row = rows.find(r => r?.key === key && String(r?.content || '').trim());
    const content = String(row?.content || '').trim();
    const ids = Array.isArray(row?.evidenceIds) ? [...new Set(row.evidenceIds.map(String))] : [];
    const validIds = ids.filter(id => allowed.has(id));
    const issues = [];
    if (!content) issues.push('empty');
    else {
      if (SIBYL_UNSAFE_RX.test(content)) issues.push('unsafe_expression');
      if (SIBYL_UNSUPPORTED_RX.test(content)) issues.push('unsupported_fact');
      if (!validIds.length || validIds.length !== ids.length) issues.push('evidence');
    }
    if (content && content.length > String(ch.draft || '').length) { ch.draft = content; ch.draftEvidenceIds = validIds; }
    const contentOk = Boolean(content) && !issues.length;
    if (contentOk && content.length < SIBYL_V2_CHAPTER_FLOOR && !final && !ch.lengthRepaired && state.lengthRepairs < SIBYL_V2_MAX_LENGTH_REPAIRS) {
      ch.lengthRepaired = true; state.lengthRepairs += 1; ch.issues = ['short'];
      continue;
    }
    if (contentOk) {
      const draft = String(ch.draft || '');
      const best = draft.length > content.length && isCleanSibylText(draft) ? draft : content;
      Object.assign(ch, { valid:true, content:best, evidenceIds:validIds, issues:[], degraded:false });
      continue;
    }
    if (final) {
      const salvage = [content, ch.draft].map(scrubSibylText).filter(Boolean).sort((a, b) => b.length - a.length)[0];
      if (salvage) {
        const evidenceIds = validIds.length ? validIds : (ch.draftEvidenceIds?.length ? ch.draftEvidenceIds : ['annual']);
        Object.assign(ch, { valid:true, content:salvage, evidenceIds, issues, degraded:true });
        continue;
      }
    }
    ch.issues = issues;
  }
  return state;
}
export async function advanceSibylCounselV2(env, analysis, record, owned) {
  const startedAt = Date.now();
  const saved = record?.metadata?.sibylDelivery;
  const state = { chapters:structuredClone(saved?.chapters || {}), lengthRepairs:Number(saved?.lengthRepairs) || 0 };
  const allowed = new Set(['annual',...(analysis.major?['major']:[]),...analysis.months.map(m=>m.id)]);
  let model = String(saved?.model || '');
  for (let calls = 0; calls < SIBYL_V2_MAX_CALLS_PER_REQUEST; calls += 1) {
    const pending = SIBYL_CHAPTERS.map(([key]) => key).filter(key => !state.chapters[key]?.valid);
    if (!pending.length) break;
    const fresh = !Object.values(state.chapters).some(ch => ch?.attempts > 0);
    const remaining = SIBYL_V2_REQUEST_BUDGET_MS - (Date.now() - startedAt);
    const timeoutMs = fresh ? SIBYL_V2_FIRST_CALL_MS : Math.min(SIBYL_V2_REPAIR_CALL_MAX_MS, remaining - 3000);
    if (calls > 0 && timeoutMs < SIBYL_V2_MIN_CALL_MS) break;
    const prompt = fresh ? buildSibylCounselPrompt(analysis) : buildSibylCounselRepairPrompt(analysis, pending, state.chapters);
    const tokens = fresh ? 16000 : Math.min(16000, 1200 + pending.length * 1600);
    const result = await callGeminiJsonWithRetry(env, prompt, { attempts:1, baseTokens:tokens, capTokens:tokens, temperature:0.35, taskType:'fortune', timeoutMs, fallbackToWorkersAI:true, fallbackMinChars:fresh ? 5000 : 400 });
    // 공급자 실패는 장의 잘못이 아니다: 시도를 세지 않고 다음 요청으로 넘긴다.
    if (!result?.ok) break;
    model = String(result.model || model);
    applySibylCounselRound(state, parseSibylRows(result.text), fresh ? SIBYL_CHAPTERS.map(([key]) => key) : pending, allowed);
    await ServiceExecutionTransaction.updateOne(owned, { $set:{ 'metadata.sibylDelivery':{ ...state, model, updatedAt:new Date().toISOString() } } });
  }
  const done = SIBYL_CHAPTERS.every(([key]) => state.chapters[key]?.valid);
  if (!done) {
    const hasText = Object.values(state.chapters).some(ch => ch?.valid || String(ch?.draft || '').trim());
    if (!hasText) throw new Error('SIBYL_GENERATION_UNAVAILABLE');
    await ServiceExecutionTransaction.updateOne(owned, { $set:{ premiumStatus:'generating', reasonCode:'SIBYL_PARTIAL', 'lock.until':null, 'lock.token':'' } });
    return { pending:true };
  }
  const chapters = SIBYL_CHAPTERS.map(([key, title]) => ({ key, title, content:state.chapters[key].content, evidenceIds:state.chapters[key].evidenceIds }));
  const qualityWarnings = SIBYL_CHAPTERS.filter(([key]) => state.chapters[key].degraded).map(([key]) => ({ key, issues:state.chapters[key].issues || [] }));
  return { chapters, model, source:'server-calculation-ai', ...(qualityWarnings.length ? { qualityWarnings } : {}) };
}
export async function readOrGenerateSibyl(env,userId,access,requestedYear) {
  const year=access.tossIntentId && Number.isInteger(access.tossResumeYear) && access.tossResumeYear===requestedYear
    ? requestedYear : validateSibylYear(requestedYear);
  const birthKey=computeBirthKey(access.card);
  if(!birthKey) throw new Error('SIBYL_INVALID_BIRTH_INPUT');
  const executionKey=access.tossIntentId ? `toss-sibyl:${access.tossIntentId}:${year}` : `sibyl:${birthKey}:${year}`;
  const filter=access.tossIntentId ? {userId,executionKey,featureKey:'premium-sibyl-dominator',reportType:'sibylAnnual',orderId:access.purchaseEvidence.orderId} : {userId,executionKey};
  await connectDb(env);
  const existing=await ServiceExecutionTransaction.findOne(filter).lean();
  if(existing && await isStoredPaidResultRevoked(userId,'premium-sibyl-dominator',existing)) return {status:403,body:{ok:false,code:'RESULT_REVOKED',message:'취소·환불된 결과는 제공할 수 없어요.'}};
  if(existing?.status==='success' && existing?.metadata?.archive?.chapters?.length) return {status:200,body:existing.metadata.archive};
  const now=new Date();
  const evidence=access.purchaseEvidence || {};
  // Non-pending status keeps this permanent birth entitlement out of per-use refund sweepers.
  try {
    await ServiceExecutionTransaction.updateOne(filter,{$setOnInsert:{...filter,featureKey:'premium-sibyl-dominator',reportType:'sibylAnnual',paymentId:evidence.paymentId || '',orderId:evidence.orderId || '',idempotencyKey:evidence.evidenceId || executionKey,profileId:access.card.profileId,reportId:executionKey,status:'failed',premiumStatus:'generating',timeoutAt:new Date(now.getTime()+120000),retentionUntil:null,metadata:{accessEntitlementId:evidence.entitlementId || '',...(sibylDeliveryV2Enabled(env)?{deliveryPlanVersion:SIBYL_DELIVERY_PLAN_VERSION}:{}),archive:{title:`${year} 시빌라 연간 대비 리포트`,year,profileId:access.card.profileId}}}},{upsert:true});
  } catch(error) { if(error?.code!==11000) throw error; }
  const token=crypto.randomUUID();
  const claimed=await ServiceExecutionTransaction.findOneAndUpdate({...filter,status:'failed',$or:[{'lock.until':null},{'lock.until':{$lt:now}}]},{$set:{'lock.token':token,'lock.until':new Date(now.getTime()+120000),premiumStatus:'generating',generationStartedAt:now,reasonCode:''}},{returnDocument:'after'}).lean();
  if(!claimed) return {status:202,body:{ok:true,status:'generating',year,recordsHref:`/records/view/?source=executions&id=${encodeURIComponent(executionKey)}`,message:'리포트를 준비하고 있어요. 잠시 후 다시 확인해 주세요.'}};
  const owned={...filter,status:'failed','lock.token':token};
  try {
    const analysis=buildSibylAnnual(access.birth,year);
    // 판은 기록에 고정한다. 판 필드가 없는 옛 기록은 스위치와 상관없이 1판으로 끝난다.
    const v2=isSibylDeliveryV2(claimed);
    const counsel=v2 ? await advanceSibylCounselV2(env,analysis,claimed,owned) : await generateSibylCounsel(env,analysis);
    if(counsel.pending) return {status:202,body:{ok:true,status:'generating',partial:true,year,recordsHref:`/records/view/?source=executions&id=${encodeURIComponent(executionKey)}`,message:'리포트를 이어서 준비하고 있어요. 잠시 후 다시 확인해 주세요.'}};
    const report={ok:true,...counsel,title:analysis.title,profileLabel:access.birth.date+' · '+(access.birth.timeKnown?access.birth.time:'생시 미상'),year,analysis,reportId:executionKey,generatedAt:new Date().toISOString(),recordsHref:`/records/view/?source=executions&id=${encodeURIComponent(executionKey)}`,chapterMap:Object.fromEntries(counsel.chapters.map(c=>[c.key,c.content])),totalChars:counsel.chapters.reduce((sum,c)=>sum+c.content.length,0),...(v2?{deliveryPlanVersion:SIBYL_DELIVERY_PLAN_VERSION}:{})};
    const saved=await ServiceExecutionTransaction.findOneAndUpdate(owned,{$set:{status:'success',premiumStatus:'completed',deliveryStatus:'delivered',completedAt:new Date(),generationCompletedAt:new Date(),retentionUntil:null,'metadata.archive':report,'lock.until':null,'lock.token':''}},{returnDocument:'after'}).lean();
    if(!saved) throw new Error('SIBYL_SAVE_UNCONFIRMED');
    return {status:200,body:report};
  } catch(error) {
    await ServiceExecutionTransaction.updateOne(owned,{$set:{status:'failed',premiumStatus:'failed',reasonCode:'SIBYL_RETRYABLE',generationFailedAt:new Date(),'lock.until':null,'lock.token':''}});
    throw error;
  }
}
