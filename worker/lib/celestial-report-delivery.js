import { callGeminiText } from "./gemini.js";
import { runWithAiLocale } from "./ai-locale-context.js";
import { countPaidReportBodyChars, hasRepeatedReportPassage } from "./paid-report-quality.js";

export const CELESTIAL_CARD_BODY_FIELDS = ["archetypeReading", "consciousMessage", "unconsciousPattern", "shadowWarning", "soulLesson", "integrationPractice"];
const CARD_FIELDS = ["cardMeaning", "planetMeaning", ...CELESTIAL_CARD_BODY_FIELDS];
const SUMMARY_FIELDS = ["overallTheme", "strongestPlanetSignal", "deepestShadow", "soulLesson", "integrationPath", "finalOracle"];
const DOMAINS = ["love", "work", "money", "health"];
const strings = value => typeof value === "string" ? value : Array.isArray(value) ? value.map(strings).join("\n") : value && typeof value === "object" ? Object.values(value).map(strings).join("\n") : "";
const enough = (value, min) => typeof value === "string" && countPaidReportBodyChars(value) >= min;
const parse = raw => { try { const value = String(raw || ""); return JSON.parse(value.slice(value.indexOf("{"), value.lastIndexOf("}") + 1)); } catch { return null; } };
const boundedSetting = (value, fallback, min, max) => {
  const number = Number(value);
  return value !== undefined && value !== "" && Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

export function celestialDeliveryComplete(delivery) {
  return Array.from({length:11},(_,i)=>String(i)).every(id=>delivery.parts?.[id]) && Boolean(delivery.parts?.summary)
    && countPaidReportBodyChars(strings(delivery.parts)) >= 20000;
}

function validateCard(value, card) {
  if (!value || value.evidence?.planetId !== card.planetId || value.evidence?.cardNameKo !== card.cardNameKo || value.evidence?.orientation !== card.orientation) return null;
  if (!CARD_FIELDS.every(field=>enough(value[field], CELESTIAL_CARD_BODY_FIELDS.includes(field) ? 500 : 40))) return null;
  return Object.fromEntries(CARD_FIELDS.map(field=>[field,value[field]]));
}
function validateSummary(value) {
  if (!value || !SUMMARY_FIELDS.every(field=>enough(value[field],field === "overallTheme" ? 1000 : field === "finalOracle" ? 250 : 60))) return null;
  if (!DOMAINS.every(field=>enough(value.insightMatrix?.[field],60) && enough(value.closingFortune?.[field],60)) || !enough(value.closingFortune?.overall,250)) return null;
  if (!["planetHighlights","practices","ritualPlan"].every(field=>Array.isArray(value[field]) && value[field].length >= 3 && value[field].every(item=>enough(item,20)))) return null;
  return Object.fromEntries([...SUMMARY_FIELDS,"insightMatrix","closingFortune","planetHighlights","practices","ritualPlan"].map(field=>[field,value[field]]));
}

// Each completed card is saved immediately; a request contains at most four 45s calls.
// The six existing long card sections retain their 500-character minimum.
export async function generateCelestialWave(env, snapshot, checkpoint) {
  let delivery = structuredClone(snapshot.delivery || {version:1,parts:{},attempts:{},invalidAttempts:{}});
  const missing = [...Array.from({length:11},(_,i)=>String(i)),"summary"].filter(id=>!delivery.parts[id] && (delivery.attempts[id] || 0)<3).slice(0,4);
  for (const id of missing) delivery.attempts[id]=(delivery.attempts[id]||0)+1;
  const persist = () => checkpoint(structuredClone(delivery));
  if (missing.length) await persist();
  let queue=Promise.resolve();
  const calls=await Promise.allSettled(missing.map(async id=>{
    const card = id === "summary" ? null : snapshot.reading.cards[Number(id)];
    const instruction = card
      ? `이번 호출은 ${Number(id)+1}번 카드 하나만 해설합니다. 11장 전체 JSON 대신 다음 단일 객체만 출력하세요. ${JSON.stringify({evidence:{planetId:card.planetId,cardNameKo:card.cardNameKo,orientation:card.orientation},...Object.fromEntries(CARD_FIELDS.map(field=>[field,"해설 본문"]))})}. cardMeaning/planetMeaning은 본문 40자 이상, 나머지 여섯 필드는 각각 공백·제목·마크다운 제외 500자 이상, 목표 600~700자입니다. 기존 카드와 행성 배치를 바꾸지 마세요. 근거, 생활 패턴, 반대 조건과 주의점, 구체적인 행동을 서로 다른 관점으로 배분하고 짧은 문단으로 쓰세요.`
      : `이번 호출은 전체 11장 흐름을 종합하는 summary 객체만 출력하세요. cards나 바깥 summary 키는 쓰지 마세요. overallTheme은 본문 공백 제외 1000자 이상, finalOracle 250자 이상, strongestPlanetSignal/deepestShadow/soulLesson/integrationPath 각 60자 이상입니다. insightMatrix의 love/work/money/health와 closingFortune의 love/work/money/health는 각 60자 이상, closingFortune.overall은 250자 이상입니다. planetHighlights/practices/ritualPlan은 각각 3개 이상이며 각 항목 20자 이상입니다. 계산된 행성 배치와 카드 정역방향을 바꾸거나 상대방의 마음을 단정하지 마세요.`;
    let ai;
    const requestPrompt=`${snapshot.prompt}\n\n[이번 호출 범위가 전체 출력 형식보다 우선합니다]\n${instruction}`;
    try {
      ai=await runWithAiLocale(snapshot.locale||"ko",()=>callGeminiText(env,requestPrompt,{
        model:["CELESTIAL_HARMONY_GEMINI_MODEL", "GEMINI_MODEL", "PREMIUM_GEMINI_MODEL"].map(key=>String(env?.[key]||"").trim()).find(Boolean),
        taskType:"fortune",temperature:boundedSetting(env?.CELESTIAL_HARMONY_TEMPERATURE,0.68,0,1),
        timeoutMs:boundedSetting(env?.CELESTIAL_HARMONY_PROVIDER_TIMEOUT_MS,45000,15000,45000),
        maxOutputTokens:boundedSetting(env?.CELESTIAL_HARMONY_MAX_OUTPUT_TOKENS,11000,8000,11000),fallbackToWorkersAI:false,logContext:{sectionGroup:id},
      }));
    } catch { return; }
    const value=ai?.ok && ai.truncated!==true && !/mock/i.test(ai.provider||"") ? parse(ai.text) : null;
    const part=card ? validateCard(value,card) : validateSummary(value);
    const save=async()=>{
      if (!part || hasRepeatedReportPassage(strings(part)) || hasRepeatedReportPassage(strings(delivery.parts)+"\n"+strings(part))) {
        if(ai?.ok){delivery.invalidAttempts[id]=(delivery.invalidAttempts[id]||0)+1;await persist();}return;
      }
      delivery={...delivery,parts:{...delivery.parts,[id]:part},providers:{...delivery.providers,[id]:{provider:ai.provider,model:ai.model||""}}};
      await persist();
    };
    queue=queue.then(save,save);await queue;
  }));
  const failed=calls.find(call=>call.status==="rejected");if(failed)throw failed.reason;
  return {delivery,limited:[...Array.from({length:11},(_,i)=>String(i)),"summary"].some(id=>!delivery.parts[id] && delivery.attempts[id]>=3)};
}

export function celestialReadingFromDelivery(snapshot) {
  const state=snapshot.delivery;
  return {...snapshot.reading,cards:snapshot.reading.cards.map((card,index)=>({...card,...(state.parts[String(index)] || Object.fromEntries(CARD_FIELDS.map(field=>[field,""])))})),
    summary:{...snapshot.reading.summary,...(state.parts.summary||Object.fromEntries(SUMMARY_FIELDS.map(field=>[field,""])))},
    meta:{...snapshot.reading.meta,apiUsed:true,deliveryStatus:celestialDeliveryComplete(state)?"delivery_pending":"partial",completedParts:Object.keys(state.parts),totalParts:12}};
}
