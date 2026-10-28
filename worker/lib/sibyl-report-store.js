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
export async function generateSibylCounsel(env, analysis) {
  const prompt = `당신은 시빌라의 차분하고 구체적인 한국어 상담가입니다. 제공된 명리 계산 사실만 근거로 생활 대비 리포트를 작성합니다.
계산하거나 미래 사건을 확정하지 마세요. 사건 확률, 성공 보장, 공포·모욕, 투자·의료 판단 대행은 금지입니다.
숫자·날짜·간지·사주 전문용어는 화면이 계산값 그대로 표시합니다. 상담 본문에는 숫자, 퍼센트, 한자, 간지, 월 이름을 쓰지 말고 '아래 근거의 주의 구간'처럼 참조하세요. 용신을 새로 판정하지 마세요.
각 장은 우선 권고, 그 이유, 생활에서 알아볼 징후, 실행 행동, 확인 기준과 판단 전환 조건을 자연스러운 짧은 문단으로 쓰세요. 같은 문장으로 분량을 채우지 마세요. 기질의 장점과 그림자를 함께 설명하고 직장 밖의 일에도 적용하세요.
각 장은 한글 600~900자, 전체 7000~9000자를 목표로 합니다. 근거가 부족한 시주·대운은 부족함을 밝히고 지어내지 마세요.
JSON만 반환: {"chapters":[{"key":"지정 key","content":"상담 본문","evidenceIds":["annual 또는 major 또는 month-1 등 제공 근거 ID"]}]}. 반드시 아래 열 장을 순서대로 작성하세요.
장: ${JSON.stringify(SIBYL_CHAPTERS)}
계산 근거: ${JSON.stringify(analysis)}`;
  const result=await callGeminiJsonWithRetry(env,prompt,{attempts:1,baseTokens:16000,capTokens:16000,temperature:0.35,taskType:'fortune',timeoutMs:60000,fallbackToWorkersAI:true,fallbackMinChars:5000});
  if(!result?.ok) throw new Error('SIBYL_GENERATION_UNAVAILABLE');
  return {chapters:validateSibylCounsel(JSON.parse(result.text),analysis),model:String(result.model||''),source:'server-calculation-ai'};
}
export async function readOrGenerateSibyl(env,userId,access,requestedYear) {
  const year=validateSibylYear(requestedYear);
  const birthKey=computeBirthKey(access.card);
  if(!birthKey) throw new Error('SIBYL_INVALID_BIRTH_INPUT');
  const executionKey=`sibyl:${birthKey}:${year}`;
  const filter={userId,executionKey};
  await connectDb(env);
  const existing=await ServiceExecutionTransaction.findOne(filter).lean();
  if(existing && await isStoredPaidResultRevoked(userId,'premium-sibyl-dominator',existing)) return {status:403,body:{ok:false,code:'RESULT_REVOKED',message:'취소·환불된 결과는 제공할 수 없어요.'}};
  if(existing?.status==='success' && existing?.metadata?.archive?.chapters?.length) return {status:200,body:existing.metadata.archive};
  const now=new Date();
  const evidence=access.purchaseEvidence || {};
  // Non-pending status keeps this permanent birth entitlement out of per-use refund sweepers.
  try {
    await ServiceExecutionTransaction.updateOne(filter,{$setOnInsert:{...filter,featureKey:'premium-sibyl-dominator',reportType:'sibylAnnual',paymentId:evidence.paymentId || '',orderId:evidence.orderId || '',idempotencyKey:evidence.evidenceId || executionKey,profileId:access.card.profileId,reportId:executionKey,status:'failed',premiumStatus:'generating',timeoutAt:new Date(now.getTime()+120000),retentionUntil:null,metadata:{accessEntitlementId:evidence.entitlementId || '',archive:{title:`${year} 시빌라 연간 대비 리포트`,year,profileId:access.card.profileId}}}},{upsert:true});
  } catch(error) { if(error?.code!==11000) throw error; }
  const token=crypto.randomUUID();
  const claimed=await ServiceExecutionTransaction.findOneAndUpdate({...filter,status:'failed',$or:[{'lock.until':null},{'lock.until':{$lt:now}}]},{$set:{'lock.token':token,'lock.until':new Date(now.getTime()+120000),premiumStatus:'generating',generationStartedAt:now,reasonCode:''}},{returnDocument:'after'}).lean();
  if(!claimed) return {status:202,body:{ok:true,status:'generating',year,recordsHref:`/records/view/?source=executions&id=${encodeURIComponent(executionKey)}`,message:'리포트를 준비하고 있어요. 잠시 후 다시 확인해 주세요.'}};
  const owned={...filter,status:'failed','lock.token':token};
  try {
    const analysis=buildSibylAnnual(access.birth,year);
    const counsel=await generateSibylCounsel(env,analysis);
    const report={ok:true,...counsel,title:analysis.title,profileLabel:access.birth.date+' · '+(access.birth.timeKnown?access.birth.time:'생시 미상'),year,analysis,reportId:executionKey,generatedAt:new Date().toISOString(),recordsHref:`/records/view/?source=executions&id=${encodeURIComponent(executionKey)}`,chapterMap:Object.fromEntries(counsel.chapters.map(c=>[c.key,c.content])),totalChars:counsel.chapters.reduce((sum,c)=>sum+c.content.length,0)};
    const saved=await ServiceExecutionTransaction.findOneAndUpdate(owned,{$set:{status:'success',premiumStatus:'completed',deliveryStatus:'delivered',completedAt:new Date(),generationCompletedAt:new Date(),retentionUntil:null,'metadata.archive':report,'lock.until':null,'lock.token':''}},{returnDocument:'after'}).lean();
    if(!saved) throw new Error('SIBYL_SAVE_UNCONFIRMED');
    return {status:200,body:report};
  } catch(error) {
    await ServiceExecutionTransaction.updateOne(owned,{$set:{status:'failed',premiumStatus:'failed',reasonCode:'SIBYL_RETRYABLE',generationFailedAt:new Date(),'lock.until':null,'lock.token':''}});
    throw error;
  }
}
