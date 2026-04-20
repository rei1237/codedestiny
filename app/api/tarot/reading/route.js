import { NextResponse } from "next/server";
import { proxyLegacyApi } from "../../_lib/legacyApiProxy";
import { verifyJwtFromRequest, isAdminRequest } from "../../_lib/adminAccess";
import { verifyAndConsumePoints } from "../../_lib/paymentValidation";
import { createRequire } from "module";

export const runtime = "nodejs";

// Load the CJS tarot engine. The module's own __dirname (server/services/)
// correctly resolves DB_PATH to server/data/tarot-cards.db.json.
const _require = createRequire(import.meta.url);
let _engine = null;
function getEngine() {
  if (!_engine) {
    _engine = _require("../../../../server/services/tarot-engine.service.js");
  }
  return _engine;
}

const MAX_PARAGRAPH_REPEAT = 1;
const MAX_SENTENCE_REPEAT = 1;
const MASTER_MAX_SENTENCES_DEFAULT = 2;

function safeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function splitParagraphs(text) {
  return safeText(text)
    .split(/\n{2,}/)
    .map((line) => safeText(line))
    .filter(Boolean);
}

function splitSentences(text) {
  const src = safeText(text);
  if (!src) return [];
  const normalized = src
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!normalized) return [];
  const parts = normalized.match(/[^.!?。！？\n]+[.!?。！？]?/g);
  return (parts || [normalized])
    .map((part) => safeText(part))
    .filter(Boolean);
}

function dedupeText(text, options = {}) {
  const paragraphLimit = Number.isFinite(options.paragraphLimit)
    ? options.paragraphLimit
    : MAX_PARAGRAPH_REPEAT;
  const sentenceLimit = Number.isFinite(options.sentenceLimit)
    ? options.sentenceLimit
    : MAX_SENTENCE_REPEAT;

  const paragraphs = splitParagraphs(text);
  const paragraphSeen = new Map();
  const dedupedParagraphs = [];

  for (const paragraph of paragraphs) {
    const key = paragraph.toLowerCase();
    const count = paragraphSeen.get(key) || 0;
    if (count >= paragraphLimit) continue;
    paragraphSeen.set(key, count + 1);

    const sentences = splitSentences(paragraph);
    const sentenceSeen = new Map();
    const dedupedSentences = [];
    for (const sentence of sentences) {
      const sentenceKey = sentence.toLowerCase();
      const sentenceCount = sentenceSeen.get(sentenceKey) || 0;
      if (sentenceCount >= sentenceLimit) continue;
      sentenceSeen.set(sentenceKey, sentenceCount + 1);
      dedupedSentences.push(sentence);
    }
    if (dedupedSentences.length) {
      dedupedParagraphs.push(dedupedSentences.join(" "));
    }
  }

  return dedupedParagraphs.join("\n\n");
}

function dedupeStringArray(items) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(items) ? items : []) {
    const text = dedupeText(item);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function dedupeSemanticOverlap(textBlock) {
  /**
   * 의미상 중복을 제거합니다.
   * 예: "거절하세요" + "거절이 필요합니다" → 하나만 남김
   */
  if (!textBlock || typeof textBlock !== "string") return textBlock;
  
  const sentences = splitSentences(textBlock);
  const core = [];
  
  for (const sent of sentences) {
    const lower = sent.toLowerCase();
    
    // 이미 있는 문장과 핵심 어휘 50% 이상 겹치면 스킵
    const skip = core.some(existing => {
      const existingLower = existing.toLowerCase();
      const sentWords = new Set(lower.split(/\s+/));
      const existingWords = new Set(existingLower.split(/\s+/));
      const intersection = [...sentWords].filter(w => existingWords.has(w) && w.length > 2);
      const union = new Set([...sentWords, ...existingWords]);
      const similarity = intersection.length / Math.max(union.size, 1);
      return similarity > 0.5;
    });
    
    if (!skip) {
      core.push(sent);
    }
  }
  
  return core.join(" ");
}

// 타로별·필드별 목표 글자 수 정의
const CHAR_TARGETS = {
  // 각 타로별 필드 목표값
  love: {
    opening: { minChars: 0, maxChars: 150, maxSentences: 1 },
    vibe: { minChars: 300, maxChars: 500, maxSentences: 3 },
    position: { minChars: 300, maxChars: 500, maxSentences: 3 },
    deep: { minChars: 400, maxChars: 700, maxSentences: 4 },
    future: { minChars: 350, maxChars: 600, maxSentences: 3 },
    action: { minChars: 150, maxChars: 300, maxSentences: 3 },
  },
  reunion: {
    opening: { minChars: 0, maxChars: 150, maxSentences: 1 },
    main: { minChars: 350, maxChars: 600, maxSentences: 4 },
    guidance: { minChars: 100, maxChars: 200, maxSentences: 2 },
    action: { minChars: 180, maxChars: 350, maxSentences: 3 },
  },
  selfEsteem: {
    opening: { minChars: 0, maxChars: 150, maxSentences: 1 },
    main: { minChars: 450, maxChars: 750, maxSentences: 5 },
    guidance: { minChars: 100, maxChars: 200, maxSentences: 2 },
    action: { minChars: 180, maxChars: 350, maxSentences: 3 },
  },
  yearly: {
    opening: { minChars: 0, maxChars: 150, maxSentences: 1 },
    monthly: { minChars: 200, maxChars: 400, maxSentences: 3 },
    summary: { minChars: 250, maxChars: 450, maxSentences: 3 },
    action: { minChars: 150, maxChars: 300, maxSentences: 2 },
  },
};

function removeMechanicalLead(text) {

  let out = safeText(text);
  if (!out) return "";
  const patterns = [
    /^당신이\s*뽑은\s*카드는[^.?!。！？]*[.?!。！？]?\s*/i,
    /^카드의\s*의미를\s*보면[^.?!。！？]*[.?!。！？]?\s*/i,
    /^앞서\s*말씀드렸듯이[^.?!。！？]*[.?!。！？]?\s*/i,
    /^결론부터\s*말하면[^.?!。！？]*[.?!。！？]?\s*/i,
    /^요약하면[^.?!。！？]*[.?!。！？]?\s*/i,
  ];
  for (const re of patterns) {
    out = out.replace(re, "");
  }
  return safeText(out);
}

function toMasterSentence(text, options = {}) {
  // 옵션: { maxSentences, minChars, maxChars }
  // 예: { minChars: 400, maxChars: 800, maxSentences: 6 }
  // => 최소 400자, 최대 800자, 최대 6문장 조건을 모두 만족하는 문장들 반환
  
  const maxSentences = (typeof options === "number") 
    ? options 
    : (options?.maxSentences ?? MASTER_MAX_SENTENCES_DEFAULT);
  const minChars = options?.minChars ?? 0;
  const maxChars = options?.maxChars ?? Infinity;
  
  const deduped = dedupeText(removeMechanicalLead(text));
  const sentences = splitSentences(deduped);
  if (!sentences.length) return "";
  
  let result = [];
  let charCount = 0;
  
  for (const sent of sentences) {
    if (result.length >= maxSentences) break;
    if (charCount >= maxChars) break;
    
    const sentLen = sent.length;
    const totalIfAdded = charCount + (result.length > 0 ? 1 : 0) + sentLen;
    
    if (totalIfAdded <= maxChars) {
      result.push(sent);
      charCount = totalIfAdded;
    } else if (charCount < minChars) {
      // 최소 글자 수 목표 미달이면 계속 추가
      result.push(sent);
      charCount = totalIfAdded;
    }
  }
  
  return result.join(" ");
}

function normalizeAdviceList(items, fallback) {
  const base = dedupeStringArray(items)
    .map((item) => dedupeSemanticOverlap(toMasterSentence(item, 1)))
    .filter(Boolean);
  if (base.length) return base.slice(0, 4);
  return dedupeStringArray(fallback)
    .map((item) => dedupeSemanticOverlap(toMasterSentence(item, 1)))
    .slice(0, 4)
    .filter(Boolean);
}

function cardNameFrom(card, idx) {
  return safeText(card?.nameKr) || safeText(card?.name) || `카드 ${idx + 1}`;
}

function normalizeEnhancedLoveReading(candidate, baseReading, cards) {
  const src = candidate && typeof candidate === "object" ? candidate : {};
  const base = baseReading && typeof baseReading === "object" ? baseReading : {};

  const positionSource = Array.isArray(src.positionBreakdown) && src.positionBreakdown.length
    ? src.positionBreakdown
    : (Array.isArray(base.positionBreakdown) ? base.positionBreakdown : []);

  const positionBreakdown = positionSource.slice(0, 6).map((item, idx) => ({
    title: safeText(item?.title) || `포지션 ${idx + 1}`,
    card: safeText(item?.card) || cardNameFrom(cards?.[idx], idx),
    summary: dedupeSemanticOverlap(
      dedupeText(
        toMasterSentence(
          item?.summary || "감정의 추측보다 구체적인 행동의 패턴을 보세요. 일관성 있는 행동만이 관계의 진정성을 증명합니다. 확인형 대화는 오해를 해소하고 신뢰를 다시 세우는 기초입니다.",
          3,
        )
      )
    ),
  }));

  while (positionBreakdown.length < 6) {
    const idx = positionBreakdown.length;
    positionBreakdown.push({
      title: `포지션 ${idx + 1}`,
      card: cardNameFrom(cards?.[idx], idx),
      summary: "판단을 서두르기보다 충분한 시간을 두고 상대의 행동 패턴을 관찰하세요. 그 패턴이 관계의 현실을 가르치고, 당신이 나아갈 방향을 선명하게 해줄 것입니다. 확인 없는 추측은 관계의 독이 됩니다.",
    });
  }

  const firstCard = safeText(positionBreakdown[0]?.card);
  const overallVibe = dedupeSemanticOverlap(
    dedupeText(
      toMasterSentence(
        src.overallVibe || src.deepReading || base.overallVibe || "지금 당신들 사이의 에너지는 정체되어 있지만, 동시에 새로운 흐름을 맞이할 준비가 되어 있습니다. 표면의 말보다 행동의 일관성이 중요한 시기입니다. 감정적 결론보다 사실 기반의 이해가 이 시간을 헤쳐나가는 열쇠입니다.",
        2,
      )
    )
  );
  const deepReadingCore = dedupeSemanticOverlap(
    dedupeText(
      toMasterSentence(
        src.deepReading || src.realityAndFuture || base.deepReading || "감정의 강도는 그 무엇도 아닙니다. 중요한 것은 그 감정을 어떻게 전달하는가입니다. 확인형 질문으로 오해의 벽을 하나씩 넘으면, 관계의 기류가 자연스럽게 바뀝니다. 이것이 성숙한 소통의 시작입니다.",
        3,
      )
    )
  );
  const deepReading = firstCard ? `${firstCard}: ${deepReadingCore}` : deepReadingCore;
  const realityAndFuture = dedupeSemanticOverlap(
    dedupeText(
      toMasterSentence(
        src.realityAndFuture || "지금 필요한 행동은 복잡하지 않습니다. 한 가지, 짧고 명확한 질문으로 사실을 확인하세요. 그 확인 과정에서 상대의 작은 약속 이행을 관찰하세요. 약속을 지키는 작은 행동들이 모여 신뢰라는 큰 탑을 만듭니다.",
        3,
      )
    )
  );

  const advice = normalizeAdviceList(src.advice || base.advice, [
    "지금은 결론을 내릴 때가 아닙니다. 사실 확인 질문 1개만 준비하고 상대의 반응을 관찰하세요.",
    "연락의 빈도를 기준으로 판단하지 마세요. 중요한 것은 때마다 일관된 행동을 하는가입니다.",
    "감정이 격해지면 10분 멈춘 후, 한 문장으로 당신의 핵심만 전달하세요. 과한 설명은 신뢰를 깎습니다.",
    "이번 주 한 번, 확인형 질문으로 작은 진실 하나를 알아내세요. 작은 진실들이 모여 관계의 현재를 명확히 보게 합니다.",
  ]);

  return {
    overallVibe,
    deepReading,
    realityAndFuture,
    positionBreakdown,
    advice,
  };
}

function normalizeEnhancedReunionReading(candidate) {
  const src = candidate && typeof candidate === "object" ? candidate : {};
  const targets = CHAR_TARGETS.reunion;
  
  return {
    opening: toMasterSentence(src.opening || src.reunionOutcome || "재회의 흐름은 열려 있습니다. 하지만 속도보다 정확성이 이 시간의 핵심입니다. 당신의 진심이 상대방에게 제대로 전해져야 새로운 시작이 가능합니다.", targets.opening),
    pastBond: dedupeSemanticOverlap(dedupeText(toMasterSentence(src.pastBond || "과거의 인연은 여전히 생생하게 작동하고 있습니다. 그 인연이 다시 현재로 돌아오려고 합니다. 다만 같은 패턴으로 돌아가면 같은 결말만 기다리고 있습니다. 이번에는 다른 선택이 필요합니다. 당신을 더 성숙하게 만든 그 경험이 이번 재회의 기초가 될 것입니다.", targets.main))),
    theirNow: dedupeSemanticOverlap(dedupeText(toMasterSentence(src.theirNow || "상대방은 여전히 감정을 정리하는 과정 중입니다. 혼란 속에서 자신의 마음을 천천히 들여다보고 있습니다. 당신의 갑작스러운 접근은 그 정리 과정을 방해할 뿐입니다. 기다림이 이 시간을 존중하는 방식입니다. 상대가 준비될 때까지의 침묵도 당신의 성숙함을 보여주는 신호가 됩니다.", targets.main))),
    outsideFactor: dedupeSemanticOverlap(dedupeText(toMasterSentence(src.outsideFactor || "외부의 장애물은 실제로는 내부 신뢰 문제를 드러내는 거울입니다. 계절의 변화, 상황의 변화보다 중요한 것은 두 사람이 그 변화 속에서 서로를 믿을 수 있는가입니다. 신뢰 회복이 모든 것의 기초입니다. 그것이 생기면 외부의 장애물도 돌파할 힘이 생깁니다.", targets.main))),
    theirHeart: dedupeSemanticOverlap(dedupeText(toMasterSentence(src.theirHeart || "상대의 마음 깊은 곳에는 당신을 향한 감정의 흔적이 분명히 남아 있습니다. 그 흔적은 아직도 살아서 움직이고 있습니다. 다만 지금 그들이 먼저 작동시키고 있는 것은 그 감정이 아니라 경계입니다. 그 경계를 풀 수 있는 것은 당신의 일관된 진심뿐입니다. 작은 행동이 쌓여 신뢰로 변할 때, 그들의 진정한 마음이 열릴 것입니다.", targets.main))),
    reunionOutcome: dedupeSemanticOverlap(dedupeText(toMasterSentence(src.reunionOutcome || "재회의 가능성은 열려 있습니다. 그 가능성이 현실이 되는지는 전적으로 당신의 행동 품질에 달려 있습니다. 짧고 명확한 한 번의 소통이 길고 복잡한 설명들보다 훨씬 효과적입니다. 행동의 순수함이 재회의 문을 엽니다. 지금 당신이 필요한 것은 큰 계획이 아니라 한 번의 진심 어린 대화입니다.", targets.main))),
    lighthouseGuidance: toMasterSentence(src.lighthouseGuidance || "감정의 호소보다 사실의 확인이 중요한 시간입니다. 지금 당신이 필요한 것은 격한 표현이 아니라 상대가 받아들일 수 있는 한 번의 진심 어린 대화입니다. 그 한 번의 대화를 실행하세요. 진심이 전달될 때 모든 것이 시작됩니다.", targets.guidance),
    actionPlan: normalizeAdviceList(src.actionPlan, [
      "48시간 안에 상대방이 편하게 받을 수 있는 질문 1개를 담은 짧은 메시지를 보내세요. 그 메시지는 과거를 설명하지 않고 현재의 당신 마음만 전하는 것이어야 합니다.",
      "과거 상황에 대한 해명보다는 앞으로 어떻게 소통할 것인지 당신의 한 가지 제안을 먼저 제시하세요. 작은 약속 하나가 큰 신뢰 회복의 시작입니다.",
      "상대의 반응이 애매하거나 없으면 재촉하지 마세요. 당신의 성숙함을 보여주는 방식은 기다림입니다. 72시간 침묵하며 상대를 관찰하세요. 그 침묵이 경계를 풀 수 있는 유일한 방법입니다.",
      "첫째 메시지 후 상대의 모든 반응(말, 침묵, 감정 표현)을 있는 그대로 받아들이고 당신의 소통 방식을 조정해 보세요. 상대의 반응을 존중하는 것이 진정한 재회의 시작입니다.",
    ]),
  };
}

function expandSelfEsteemWithContext(baseText, cardName, positionName) {
  if (!baseText || typeof baseText !== "string") return baseText;
  
  const contextMap = {
    past_debuff: "과거 경험에서 형성된 이 패턴을 인식하는 것이 첫 번째 걸음입니다. 그때의 환경은 이미 끝났지만, 뇌는 여전히 같은 신호에 반응하고 있습니다.",
    inner_monster: "이 내면의 목소리는 보호 메커니즘입니다. 비난하지 말고 그것의 의도를 이해하면, 그 에너지를 다른 곳으로 돌릴 수 있습니다.",
    current_damage: "소진과 상처가 보이는 것은 약함이 아니라 감정이 제대로 작동하고 있다는 신호입니다. 지금 느끼는 모든 것이 타당합니다.",
    mind_shield: "신뢰를 회복하려면 먼저 자신과의 약속부터 지켜야 합니다. 작은 결정에서 일관성을 만들어 내면 외부 기준의 영향력이 줄어듭니다.",
    levelup_mastery: "변화는 한 번의 영감이 아니라 매일의 작은 선택 누적입니다. 그 선택이 쌓이면 어느 날 완전히 새로운 사람이 되어 있는 자신을 발견합니다.",
  };
  
  const expansion = contextMap[positionName] || "";
  if (expansion && !baseText.includes(expansion) && !baseText.toLowerCase().includes(expansion.split('.')[0].toLowerCase())) {
    return baseText + " " + expansion;
  }
  return baseText;
}

function normalizeEnhancedSelfEsteemReading(candidate) {
  const src = candidate && typeof candidate === "object" ? candidate : {};
  const posInsights = Array.isArray(src.positionInsights) ? src.positionInsights : [];
  
  const getPositionMeta = (pos) => posInsights.find(p => p.position === pos) || {};
  
  return {
    ...src,
    opening: toMasterSentence(src.opening || "자존감 회복의 핵심은 감정 억제가 아니라 경계 설정입니다. 지금부터 시작하세요.", 1),
    
    pastDebuff: dedupeSemanticOverlap(
      dedupeText(
        expandSelfEsteemWithContext(
          toMasterSentence(src.pastDebuff || "과거 패턴은 결함이 아니라 생존 전략이었습니다. 당시 환경에서는 최선의 선택이었습니다. 이제 상황이 달라졌으므로 전략도 바꿀 시점입니다.", 4),
          getPositionMeta("past_debuff")?.card,
          "past_debuff"
        )
      )
    ),
    
    innerMonster: dedupeSemanticOverlap(
      dedupeText(
        expandSelfEsteemWithContext(
          toMasterSentence(src.innerMonster || "내면의 비판적 목소리는 사실이 아니라 습관입니다. 그것을 객관화하고 이름을 붙이면 거기에는 거리가 생깁니다. 거리가 생기면 선택지가 생깁니다.", 4),
          getPositionMeta("inner_monster")?.card,
          "inner_monster"
        )
      )
    ),
    
    currentDamage: dedupeSemanticOverlap(
      dedupeText(
        expandSelfEsteemWithContext(
          toMasterSentence(src.currentDamage || "지금의 소진은 약함이 아니라 신호입니다. 과잉 자기검열에서 나오는 이 감정들을 무시하지 말고 경청하세요. 되돌린 에너지는 자존감 회복의 연료가 됩니다.", 4),
          getPositionMeta("current_damage")?.card,
          "current_damage"
        )
      )
    ),
    
    mindShield: dedupeSemanticOverlap(
      dedupeText(
        expandSelfEsteemWithContext(
          toMasterSentence(src.mindShield || "타인의 감정과 내 책임을 분리하는 것이 진정한 공감입니다. 과잉 해명은 오히려 관계의 신뢰를 깎습니다. 침묵도 답이 될 수 있습니다.", 4),
          getPositionMeta("mind_shield")?.card,
          "mind_shield"
        )
      )
    ),
    
    levelupMastery: dedupeSemanticOverlap(
      dedupeText(
        expandSelfEsteemWithContext(
          toMasterSentence(src.levelupMastery || "자존감은 큰 변심보다 작은 자기존중 선택의 반복으로 올라갑니다. 오늘 불필요한 설명을 하나 줄이세요. 그것이 시작입니다. 내일 또 하나, 모레 또 하나. 이 반복이 당신을 새롭게 만듭니다.", 4),
          getPositionMeta("levelup_mastery")?.card,
          "levelup_mastery"
        )
      )
    ),
    
    levelupGuidance: toMasterSentence(src.levelupGuidance || "오늘 하나의 설정된 경계를 작은 것부터 실행하세요. 그 실행의 반복이 회복 속도를 급격히 높입니다.", 1),
    
    positionInsights: posInsights,
    
    actionPlan: normalizeAdviceList(src.actionPlan, [
      "오늘 불필요한 요청 1개마다 '생각해 볼게요'라고 말하고 24시간 있다가 거절하세요.",
      "자기 직전에 오늘 지킨 경계 또는 거절한 요청 1가지를 통장에라도 기록해 두세요.",
      "불안이나 죄책감이 올라올 때 즉시 답장하지 말고 의도적으로 10분을 멈춘 후 '이건 습관이야'라고 중얼거리고 대답하세요.",
      "이번 달 한 명의 신뢰 관계 1건에서만 불필요한 설명을 멈춰 보세요.",
    ]),
  };
}

function normalizeEnhancedYearlyReading(candidate) {
  const src = candidate && typeof candidate === "object" ? candidate : {};
  const monthlySource = Array.isArray(src.monthlyReadings) ? src.monthlyReadings : [];
  const monthlyReadings = monthlySource.slice(0, 12).map((item, idx) => ({
    month: Number(item?.month) || (idx + 1),
    flow: dedupeSemanticOverlap(
      dedupeText(
        toMasterSentence(item?.flow || ((idx + 1) + "월의 운의 흐름을 따르려면 먼저 당신의 우선순위를 명확히 해야 합니다. 한 달에 한 가지 핵심 목표를 정하면 그 달의 모든 흐름이 당신 쪽으로 열립니다."), 2)
      )
    ),
    money: dedupeSemanticOverlap(
      dedupeText(
        toMasterSentence(item?.money || "당신의 지출 기준을 먼저 정하고 계획되지 않은 소비는 즉시 차단하세요. 작은 절제가 모여 큰 풍요로움을 만듭니다. 이 달의 재물 흐름은 당신의 선택 규칙에 따릅니다.", 2)
      )
    ),
    love: dedupeSemanticOverlap(
      dedupeText(
        toMasterSentence(item?.love || "감정의 추측을 멈추고, 확인형 대화로 진정한 소통을 실행하세요. 이 달 당신의 감정 표현이 얼마나 정확한지가 관계의 온도를 결정합니다.", 2)
      )
    ),
    relationship: dedupeSemanticOverlap(
      dedupeText(
        toMasterSentence(item?.relationship || "관계의 안정은 선의만으로 만들어지지 않습니다. 명확한 경계와 일관된 행동이 신뢰를 만듭니다. 이 달에 당신이 세워야 할 관계의 기준은 무엇인가요?", 2)
      )
    ),
    exam: dedupeSemanticOverlap(
      dedupeText(
        toMasterSentence(item?.exam || "큰 목표를 향한 노력도 중요하지만, 매일의 짧은 반복 루틴이 더욱 중요합니다. 그 루틴을 이 달에 고정하면 다음 달부터 성과가 눈에 띄게 올라갑니다.", 2)
      )
    ),
  }));

  return {
    ...src,
    summary: dedupeSemanticOverlap(
      dedupeText(
        toMasterSentence(src.summary || "올해 당신의 운의 핵심은 속도가 아니라 정확성입니다. 한 달에 한 가지씩 명확한 행동 코드를 정하고 그것을 실행해 보세요. 월별 흐름을 쪼개 차곡차곡 실행하면 운은 자연스럽게 당신을 따라올 것입니다.", 2)
      )
    ),
    finalAdvice: dedupeSemanticOverlap(
      dedupeText(
        toMasterSentence(src.finalAdvice || "올해 12개월, 한 달에 한 가지 행동 코드를 정하고 그것만 확실히 실행하세요. 그것이 올해 당신이 해야 할 모든 일의 시작입니다. 그 작은 일관성이 큰 변화를 만듭니다.", 1)
      )
    ),
    monthlyReadings,
  };
}

function dedupeLoveReadingContent(reading) {
  const src = reading && typeof reading === "object" ? reading : {};
  const out = {
    ...src,
    overallVibe: dedupeText(src.overallVibe),
    deepReading: dedupeText(src.deepReading),
    realityAndFuture: dedupeText(src.realityAndFuture),
    advice: dedupeStringArray(src.advice),
  };

  if (Array.isArray(src.positionBreakdown)) {
    out.positionBreakdown = src.positionBreakdown.map((item) => ({
      ...item,
      title: safeText(item?.title),
      card: safeText(item?.card),
      summary: dedupeText(item?.summary),
    }));
  }

  return out;
}

function dedupeReunionReadingContent(reading) {
  const src = reading && typeof reading === "object" ? reading : {};
  return {
    ...src,
    opening: dedupeText(src.opening),
    pastBond: dedupeText(src.pastBond),
    theirNow: dedupeText(src.theirNow),
    outsideFactor: dedupeText(src.outsideFactor),
    theirHeart: dedupeText(src.theirHeart),
    reunionOutcome: dedupeText(src.reunionOutcome),
    lighthouseGuidance: dedupeText(src.lighthouseGuidance),
    actionPlan: dedupeStringArray(src.actionPlan),
  };
}

function dedupeSelfEsteemReadingContent(reading) {
  const src = reading && typeof reading === "object" ? reading : {};
  return {
    ...src,
    opening: dedupeText(src.opening),
    pastDebuff: dedupeText(src.pastDebuff),
    innerMonster: dedupeText(src.innerMonster),
    currentDamage: dedupeText(src.currentDamage),
    mindShield: dedupeText(src.mindShield),
    levelupMastery: dedupeText(src.levelupMastery),
    levelupGuidance: dedupeText(src.levelupGuidance),
    actionPlan: dedupeStringArray(src.actionPlan),
  };
}

function dedupeReadingPayload(reading, spreadType, category, cards = []) {
  const type = String(spreadType || "").trim();
  const cat = String(category || "").trim().toLowerCase();

  if (type === "relationship_six_card" || cat === "love") {
    return dedupeLoveReadingContent(normalizeEnhancedLoveReading(reading, reading, cards));
  }
  if (type === "reunion_lighthouse_five_card" || cat === "reunion") {
    return dedupeReunionReadingContent(normalizeEnhancedReunionReading(reading));
  }
  if (type === "self_esteem_levelup_five_card") {
    return dedupeSelfEsteemReadingContent(normalizeEnhancedSelfEsteemReading(reading));
  }
  if (type === "yearly_twelve_card" || type === "yearly_three_card") {
    return normalizeEnhancedYearlyReading(reading);
  }

  if (reading && typeof reading === "object") {
    const out = { ...reading };
    for (const [key, value] of Object.entries(out)) {
      if (typeof value === "string") out[key] = toMasterSentence(value, 2);
      else if (Array.isArray(value)) out[key] = dedupeStringArray(value);
    }
    return out;
  }

  if (typeof reading === "string") return toMasterSentence(reading, 2);
  return reading;
}

async function runEngineReading(body) {
  const engine = getEngine();
  const spreadType = engine.normalizeSpreadType(body?.spreadType || "one_card");
  const category = String(body?.category || "general").trim();
  const drawnCards = Array.isArray(body?.cards) ? body.cards : [];

  function withQuality(reading, cardReadings) {
    try {
      if (typeof engine.enhanceTarotReadingPayload === "function") {
        return (
          engine.enhanceTarotReadingPayload({
            spreadType,
            reading,
            cardReadings,
          }) || reading
        );
      }
    } catch {
      // fall through with original reading
    }
    return reading;
  }

  switch (spreadType) {
    case "relationship_six_card": {
      const relationship = engine.createRelationshipReading({ drawnCards });
      const readingForUi = normalizeEnhancedLoveReading(
        relationship.reading,
        relationship.reading,
        relationship.cardReadings,
      );
      return withQuality(
        readingForUi,
        relationship.cardReadings,
      );
    }
    case "healing_rising_four_card":
      return withQuality(
        engine.createHealingRisingReading({ drawnCards }).reading,
        drawnCards,
      );
    case "reunion_lighthouse_five_card":
      return withQuality(
        normalizeEnhancedReunionReading(
          engine.createReunionLighthouseReading({ drawnCards }).reading,
        ),
        drawnCards,
      );
    case "self_esteem_levelup_five_card":
      return withQuality(
        normalizeEnhancedSelfEsteemReading(
          engine.createSelfEsteemLevelupReading({ drawnCards }).reading,
        ),
        drawnCards,
      );
    case "yearly_twelve_card":
      return withQuality(
        normalizeEnhancedYearlyReading(
          engine.createYearlyTwelveCardReading({ drawnCards }).reading,
        ),
        drawnCards,
      );
    case "yearly_three_card":
      return withQuality(
        normalizeEnhancedYearlyReading(
          engine.createYearlyFromThreeCardReading({ drawnCards }).reading,
        ),
        drawnCards,
      );
    case "job_change_seven_card":
      return withQuality(
        engine.createJobChangeTarotReading({ drawnCards }).reading,
        drawnCards,
      );
    default: {
      const result = engine.createReading({ category, spreadType, drawnCards });
      return withQuality({ story: result.story, advice: result.advice }, result.cardReadings || drawnCards);
    }
  }
}
// Minimal static fallback - only used if engine catastrophically fails to load
function buildLocalFallback(body) {
  const spreadType = String(body?.spreadType || "");
  const category = String(body?.category || "general").toLowerCase();

  if (spreadType === "healing_rising_four_card" || category === "healing") {
    return {
      opening: "잠시 멈추고 자신에게 따뜻한 눈길을 보내 주세요.",
      hiddenTruth: "마음 깊은 곳의 이야기를 천천히 바라봐 주세요.",
      embracePain: "그 아픔은 당신이 진지하게 살았다는 증거입니다.",
      silverLining: "이 터널이 끝나는 곳에서 당신은 더 단단해질 것입니다.",
      stepForward: "오늘 딱 하나, 자신에게 친절한 행동을 실천하세요.",
      integrationMessage: "당신은 충분히 강하고 가치 있는 사람입니다.",
      actionPlan: ["오늘 내 감정을 노트에 적어 보세요.", "자신에게 수고했다고 말해 보세요.", "나를 위한 작은 선물을 준비하세요."],
    };
  }
  if (spreadType === "relationship_six_card" || category === "love") {
    return {
      overallVibe: "두 사람 사이에 끌림과 조심스러움이 공존하는 시기입니다.",
      deepReading: "표현의 타이밍이 관계의 핵심입니다.",
      realityAndFuture: "솔직한 확인이 관계의 방향을 분명하게 합니다.",
      positionBreakdown: [],
      advice: ["비언어 신호를 함께 보세요.", "결론 내리기보다 대화 텀을 두세요.", "확인형 질문을 사용하세요.", "진심 있는 대화를 목표하세요."],
    };
  }
  if (spreadType === "reunion_lighthouse_five_card" || category === "reunion") {
    return {
      opening: "재회의 등대가 조용히 빛을 보내고 있습니다.",
      pastBond: "두 사람 사이에는 쉽게 지워지지 않는 인연이 있습니다.",
      theirNow: "상대는 나름의 방식으로 균형을 잡고 있습니다.",
      outsideFactor: "외부 장애물은 내부의 의지가 명확해지면 돌파할 수 있습니다.",
      theirHeart: "상대의 마음 안에는 당신에 대한 기억이 살아있습니다.",
      reunionOutcome: "재회의 가능성은 열려 있지만 성숙이 전제되어야 합니다.",
      lighthouseGuidance: "진심 있는 한 번의 시도가 긴 침묵보다 낫습니다.",
    };
  }
  if (spreadType === "self_esteem_levelup_five_card") {
    return {
      opening: "자존감 회복의 핵심은 감정 억제가 아니라 경계 설정입니다. 지금 당신이 느끼는 불안감과 피로는 신호입니다. 그 신호를 따라가 보세요.",
      pastDebuff: "과거의 경험들이 만들어낸 패턴이 지금도 당신의 선택을 제약하고 있습니다. 하지만 그때와 지금은 다릅니다. 당신은 이미 더 강해졌고, 선택할 수 있는 힘을 가지고 있습니다. 과거는 설명이지, 핑계가 아닙니다.",
      innerMonster: "내면의 비판적 목소리는 약함이 아니라 당신을 지키려던 방어기제입니다. 그것을 인정하고 이름을 붙이세요. '그건 나의 두려움이야'라고. 거기에 거리가 생기면, 그것을 관찰할 여유가 생깁니다.",
      currentDamage: "지금 느끼는 소진과 상처는 당신이 너무 많이 주고 있다는 신호입니다. 과잉 설명, 과잉 공감, 과잉 자기검열. 이 모든 것을 멈출 권리가 당신에게 있습니다. 멈출 때 비로소 회복이 시작됩니다.",
      mindShield: "타인의 감정을 당신의 책임으로 돌리는 습관에서 벗어나세요. 과잉 해명은 오히려 당신의 신뢰도를 깎습니다. 침묵도 하나의 대답입니다. 때로는 '모른다'는 것만으로 충분합니다. 당신은 모두를 구할 의무가 없습니다.",
      levelupMastery: "진정한 변화는 한 번의 결심이 아니라 매일의 작은 선택에서 나옵니다. 거절을 한 번 더, 설명을 한 번 덜. 당신을 위한 작은 선택이 모여 큰 힘이 됩니다. 이것이 자존감입니다. 결심이 아니라 습관입니다.",
      levelupGuidance: "오늘 불필요한 한 가지 설명을 하지 마세요. 그것이 이 카드가 당신에게 주는 첫 번째 과제입니다. 그 한 번의 거절, 한 번의 침묵이 당신의 경계를 한 층 단단하게 만듭니다.",
      positionInsights: [],
      actionPlan: [
        "오늘 24시간 동안 불필요한 설명 1개를 절대 하지 마세요. 질문을 받으면 '생각해 볼게요'라고만 답하고, 나중에 의도적으로 시간을 두고 거절 또는 수락하세요.",
        "자기 전에 오늘 하루 동안 당신이 말하지 않은 말, 안 한 설명, 거절한 요청 중 하나를 종이에 적고, '이게 나를 지키는 선택이야'라고 중얼거리고 버리세요.",
        "불안감이나 죄책감이 올라올 때 즉시 답장하거나 설명하지 마세요. 의도적으로 10분을 멈춘 다음 '이건 내 습관이야, 나의 두려움이야'라고 하고 행동하세요.",
        "이 주 동안 신뢰하는 한 명에게 당신이 거절한 것 또는 하지 않은 설명 1가지를 솔직하게 말해 보세요. 그들의 반응을 관찰하세요.",
      ],
    };
  }
  if (spreadType === "yearly_twelve_card") {
    return {
      summary: "12개월의 운명의 수레바퀴가 열렸습니다. 각 월을 눌러 운세를 확인하세요.",
      finalAdvice: "매월의 카드 메시지를 따라 작은 결심이 큰 행운으로 이어집니다.",
      monthlyReadings: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        flow: (i + 1) + "월의 흐름을 카드가 안내합니다. 꾸준히 실천하면 결과가 따라옵니다.",
        money: "꾸준한 관리와 현명한 선택이 재물 흐름을 안정시킵니다.",
        love: "진심 어린 표현이 관계를 따뜻하게 만드는 달입니다.",
        relationship: "솔직한 소통이 인간관계를 풍요롭게 합니다.",
        exam: "집중력과 꾸준한 노력이 좋은 결과로 이어집니다.",
      })),
    };
  }
  return {
    story: "카드의 흐름을 통해 현재 상황의 핵심을 읽을 수 있습니다.",
    advice: "오늘 우선순위 1개를 실행하고 결과를 기록하세요.",
  };
}

export async function POST(request) {
  // [보안강화] Senior Security Expert: 타로 리딩 권한 및 결제 강제 검증
  const payload = verifyJwtFromRequest(request);
  const adminMode = await isAdminRequest(request);

  if (!payload && !adminMode) {
    return NextResponse.json({ ok: false, message: "인증이 필요합니다." }, { status: 401 });
  }

  const userId = payload?.userId;

  // 관리자가 아닌 경우 코인 차감 (기본 10코인)
  if (!adminMode) {
    const payment = await verifyAndConsumePoints(
      userId,
      10,
      "tarot-reading",
      "타로 셔플 및 리딩"
    );

    if (!payment.ok) {
      return NextResponse.json(
        { 
          ok: false, 
          message: payment.message, 
          requiredCoins: 10,
          code: payment.status === 402 ? "INSUFFICIENT_COINS" : "PAYMENT_ERROR"
        }, 
        { status: payment.status || 400 }
      );
    }
  }

  const fallbackClone = request.clone();
  let upstreamResponse = null;
  const body = await fallbackClone.json().catch(() => ({}));
  const spreadType = String(body?.spreadType || "").trim();
  const category = String(body?.category || "general").trim().toLowerCase();

  // 1. Try Express server proxy (best quality if available)
  try {
    upstreamResponse = await proxyLegacyApi(request);
    if (upstreamResponse?.ok) {
      try {
        const upstreamPayload = await upstreamResponse.clone().json();
        if (upstreamPayload && typeof upstreamPayload === "object") {
          const normalizedReading = dedupeReadingPayload(
            upstreamPayload.reading,
            spreadType,
            category,
            body?.cards,
          );
          return NextResponse.json(
            { ...upstreamPayload, reading: normalizedReading },
            { status: upstreamResponse.status || 200 },
          );
        }
      } catch {
        return upstreamResponse;
      }
      return upstreamResponse;
    }
  } catch {
    // fall through to engine
  }

  // 2. Use tarot engine directly
  try {
    const reading = dedupeReadingPayload(
      await runEngineReading(body),
      spreadType,
      category,
      body?.cards,
    );
    return NextResponse.json(
      { ok: true, reading, source: "engine" },
      { status: 200 }
    );
  } catch {
    // 3. Static fallback
    return NextResponse.json(
      {
        ok: true,
        reading: dedupeReadingPayload(buildLocalFallback(body), spreadType, category, body?.cards),
        source: "local-fallback",
        upstreamStatus: upstreamResponse?.status || null,
      },
      { status: 200 }
    );
  }
}