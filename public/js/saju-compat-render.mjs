// 기본 사주 궁합 결과 렌더러 — 결과 화면과 보관함 상세가 같은 모듈로 같은 HTML 을 그린다.
// 순수 함수(DOM·window 없음): 입력은 서버가 불변 저장한 스냅샷(worker/lib/saju-compat-schema.js 의
// assembleSajuCompatSnapshot 결과)이고, 출력은 이스케이프된 HTML 문자열이다.
// 점수·등급·합충 근거(facts)는 엔진 확정값을 고정 문구로, 서술(narrative)은 LLM 문장을 그대로 싣는다.
// 사용자 노출 고정 문구는 SAJU_COMPAT_KO(한국어 정본)에 두고, 번역은 i18n/authored/sajuCompat-01.json 이 맡는다.

export const SAJU_COMPAT_KO = {
  "sajuCompat.selfFallback": "나",
  "sajuCompat.type.love": "연애/결혼 궁합",
  "sajuCompat.type.business": "사업/동업 궁합",
  "sajuCompat.type.friend": "친구/동료 궁합",
  "sajuCompat.grade.S": "🌟 전생의 은인",
  "sajuCompat.grade.A": "✨ 운명 궁합",
  "sajuCompat.grade.B": "😊 인연 궁합",
  "sajuCompat.grade.C": "🙂 평범한 인연",
  "sajuCompat.grade.D": "⚠️ 업보 궁합",
  "sajuCompat.grade.F": "🌧️ 악연 궁합",
  "sajuCompat.gradeBadge": "{grade}급",
  "sajuCompat.titleLine": "{type} — {self} × {partner}",
  "sajuCompat.scoreLine": "명리 전용 궁합 점수: {score}/100",
  "sajuCompat.overview.title": "🧭 사주 궁합 총평",
  "sajuCompat.overview.note": "이번 결과는 사주 명리만으로 계산했습니다. 일간·일지 합충, 조후, 용신/기신, 십성 구조를 합산해 {score}/100으로 정리했습니다.",
  "sajuCompat.energy.title": "🌡️ 에너지 조화",
  "sajuCompat.energy.johu": "조후(온도)",
  "sajuCompat.energy.elements": "일간 오행",
  "sajuCompat.energy.season": "월지 계절",
  "sajuCompat.energy.tenGods": "십성 구조",
  "sajuCompat.detail.title": "🧩 세부 해석",
  "sajuCompat.detail.emotionRhythm": "감정 리듬",
  "sajuCompat.detail.conflictSwitch": "갈등 스위치",
  "sajuCompat.detail.realOps": "현실 운영",
  "sajuCompat.detail.longTerm": "장기 전망",
  "sajuCompat.reasons.title": "📋 궁합 포인트 체크",
  "sajuCompat.reasons.total": "총점 {total}점",
  "sajuCompat.reason.JOHU_COMPLEMENT": "한쪽은 뜨겁고 한쪽은 차가워 서로의 기온을 예쁘게 중화해주는 궁합이에요.",
  "sajuCompat.reason.JOHU_BOTH_HOT": "둘 다 뜨거운 편이라 감정의 불꽃은 강하지만, 다툼도 쉽게 커질 수 있는 불(火) 과열 궁합입니다.",
  "sajuCompat.reason.JOHU_BOTH_COLD": "둘 다 차가운 편이라 안정감은 있지만, 서로가 서로에게 온기를 채워주기엔 다소 부족할 수 있어요.",
  "sajuCompat.reason.JOHU_MILD": "기온이 크게 충돌하진 않지만, 한쪽이 살짝 더 {tone} 편이라 균형을 잡아주는 구조입니다.",
  "sajuCompat.reason.MOIST_COMPLEMENT": "한 사람은 촉촉하고 한 사람은 건조한 체질이라, 습조(濕燥)가 서로를 채워주는 이상적인 궁합입니다.",
  "sajuCompat.reason.MOIST_BOTH": "둘 다 {moist} 편이라, 컨디션이 나쁠 때 함께 늘어지거나 메말라 있기 쉬운 구조입니다.",
  "sajuCompat.reason.MOIST_NEUTRAL": "습조(濕燥) 면에서는 크게 충돌하지 않고, 일상 컨디션도 비슷한 편으로 흘러가는 궁합입니다.",
  "sajuCompat.reason.ELEMENT_SAME": "둘 다 {element} 기운이 강해 비슷한 코드와 리듬을 공유합니다.",
  "sajuCompat.reason.ELEMENT_SAME_EXCESS": "다만 같은 오행이 둘 다 너무 강해서, 의견 충돌 시 양보가 잘 안 되는 구조이기도 해요.",
  "sajuCompat.reason.ELEMENT_SHENG_SELF_TO_PARTNER": "{from} 이 {to} 을(를) 생해주는 구조라, 한쪽이 자연스럽게 다른 쪽을 키워주는 상생 궁합입니다.",
  "sajuCompat.reason.ELEMENT_SHENG_PARTNER_TO_SELF": "{from} 이 {to} 을(를) 도와주는 구조라, 서로를 성장시키는 든든한 지원자 관계입니다.",
  "sajuCompat.reason.ELEMENT_KE": "기본적으로 상극 관계({self} ↔ {partner})라, 긴장감과 신경전이 쉽게 생길 수 있는 궁합입니다.",
  "sajuCompat.reason.DAY_STEM_HE": "두 사람의 일간 천간이 합(合)을 이루어, 기본적으로 마음 코드가 잘 맞는 궁합입니다.",
  "sajuCompat.reason.DAY_BRANCH_HE": "일지(배우자 자리)에서 육합이 이루어져, 같이 있을 때 편안함과 끌림이 강하게 느껴지는 구조입니다.",
  "sajuCompat.reason.DAY_STEM_CHONG": "일간이 충(沖)을 이루어, 좋은 점도 강하지만 부딪칠 때 크게 부딪히는 롤러코스터형 궁합이에요.",
  "sajuCompat.reason.DAY_BRANCH_CHONG": "일지가 충(沖)을 이루어, 생활 패턴이나 감정 리듬이 다르게 움직일 수 있습니다. 조율이 중요해요.",
  "sajuCompat.reason.YONGSHIN_COMMON": "두 사람 모두 {elements} 기운을 용신으로 삼아, 인생을 바라보는 핵심 방향이 매우 비슷합니다.",
  "sajuCompat.reason.YONGSHIN_CLASH": "특히 {elements} 기운은 한쪽에게는 용신, 다른 한쪽에게는 기신으로 작용해, 그 주제에서는 민감하게 부딪힐 수 있는 구조입니다.",
  "sajuCompat.reason.KIJI_CONTROL_FORWARD": "흉신 제어: 상대의 글자({by})가 당신의 기신({chars})을 충(沖)으로 제거해줍니다. 상대방이 당신의 나쁜 기운을 몰아내주는 최고 궁합의 핵심 요인입니다.",
  "sajuCompat.reason.KIJI_CONTROL_REVERSE": "역방향 흉신 제어: 당신의 글자({by})가 상대의 기신을 충으로 제거해줍니다. 당신도 상대에게 해방감을 주는 존재입니다.",
  "sajuCompat.reason.HE_TRAP": "합의 함정: {self}와 {partner}가 합(合)을 이루면서 결과 오행({element})이 당신의 기신을 강화합니다. 겉은 잘 맞아 보이나 속으로 해로운 에너지가 쌓이는 구조입니다. 편안함과 중독을 구분하세요.",
  "sajuCompat.element.wood": "목(木)",
  "sajuCompat.element.fire": "화(火)",
  "sajuCompat.element.earth": "토(土)",
  "sajuCompat.element.metal": "금(金)",
  "sajuCompat.element.water": "수(水)",
  "sajuCompat.tone.warm": "따뜻한",
  "sajuCompat.tone.cool": "차가운",
  "sajuCompat.moist.wet": "습기가 많은",
  "sajuCompat.moist.dry": "건조한",
  "sajuCompat.love.title": "💍 연애·결혼 궁합 심화",
  "sajuCompat.love.emotion": "💞 감정·표현 리듬",
  "sajuCompat.love.conflict": "🧯 갈등·회복 방식",
  "sajuCompat.love.home": "🏠 동거·결혼 생활 운영",
  "sajuCompat.love.growth": "🌱 장기 성장 조건",
  "sajuCompat.fact.title": "💥 팩폭 분석 — 이 관계의 진실",
  "sajuCompat.fact.STRENGTH_SELF_LEADS": "힘의 불균형 경보",
  "sajuCompat.fact.STRENGTH_PARTNER_LEADS": "흡수 주의보",
  "sajuCompat.fact.STRENGTH_PEER": "강대강 / 약대약",
  "sajuCompat.fact.KE_SELF_OVER_PARTNER": "일간 상극(당신이 통제자)",
  "sajuCompat.fact.KE_PARTNER_OVER_SELF": "일간 상극(당신이 피통제자)",
  "sajuCompat.fact.KIJI_RELIEF": "약점 보완의 달콤함",
  "sajuCompat.fact.HE_TRAP": "⚠ 합(合)의 함정 경보",
  "sajuCompat.fact.repeatScene": "반복되기 쉬운 장면",
  "sajuCompat.fact.recovery": "회복의 기준",
  "sajuCompat.advice.title": "🎯 천기적 처방",
  "sajuCompat.advice.keep": "[유지 천기] 방치 금물",
  "sajuCompat.advice.grow": "[성장 천기] 다름의 미학",
  "sajuCompat.advice.communicate": "[소통 천기] 불만을 언어화하라",
  "sajuCompat.advice.survive": "[생존 천기] 룰과 경계선",
  "sajuCompat.advice.secret.love": "[연애 시크릿]",
  "sajuCompat.advice.secret.business": "[동업 시크릿]",
  "sajuCompat.advice.secret.friend": "[우정 시크릿]",
  "sajuCompat.advice.conflictRoutine": "[갈등 복구 루틴]",
  "sajuCompat.advice.growthGoal": "[공동 성장 목표]",
  "sajuCompat.past.title": "🔮 전생 인연 풀이",
  "sajuCompat.past.subtitle": "PAST LIFE COMPATIBILITY · 일주×년주 교차 분석",
  "sajuCompat.past.grade.S": "🌟 S급 · 전생의 쌍둥이 별",
  "sajuCompat.past.grade.A": "✨ A급 · 운명의 데자뷰 인연",
  "sajuCompat.past.grade.B": "🌱 B급 · 다시 싹트는 인연",
  "sajuCompat.past.grade.C": "⚪ C급 · 백지 위의 새로운 인연",
  "sajuCompat.past.grade.D": "⚠️ D급 · 풀어야 할 매듭, 업보(Karma)의 인연",
  "sajuCompat.past.grade.F": "🌀 F급 · 피 흘리며 배우는 악연의 대물림",
  "sajuCompat.past.crossSelf": "🧬 {self}의 일주({selfPillar}) × {partner}의 년주({partnerPillar})",
  "sajuCompat.past.crossPartner": "🧬 {partner}의 일주({partnerPillar}) × {self}의 년주({selfPillar})",
  "sajuCompat.past.cross.he": "합(合)",
  "sajuCompat.past.cross.chong": "충(沖)",
  "sajuCompat.past.cross.same": "동(同)",
  "sajuCompat.past.cross.none": "무(無)",
  "sajuCompat.past.prescription": "⚔️ 천기적 처방",
  "sajuCompat.past.questionsTitle": "현생에서 확인할 질문",
  "sajuCompat.past.reflectionPull": "전생 인연의 등급은 관계의 결론을 대신하는 판정이 아니라, 두 사람이 만났을 때 느끼는 익숙함과 긴장을 돌아보는 상징입니다. 특히 {label}으로 읽힌 이번 결과는 끌림이나 반복되는 감정 장면을 관찰하는 데 참고할 수 있습니다.",
  "sajuCompat.past.reflectionDistance": "전생 인연의 등급은 관계의 결론을 대신하는 판정이 아니라, 두 사람이 만났을 때 느끼는 익숙함과 긴장을 돌아보는 상징입니다. 특히 {label}으로 읽힌 이번 결과는 거리감이나 조율이 필요한 장면을 관찰하는 데 참고할 수 있습니다.",
  "sajuCompat.past.reflectionNote": "“우리는 왜 이렇게 끌리거나 부딪히는가?”를 묻는 데서 멈추지 말고, 현재의 관계에서 실제로 바꿀 수 있는 행동을 찾아보세요. 과거의 서사보다 지금의 합의와 경계가 두 사람의 다음 장면을 만듭니다.",
  "sajuCompat.past.disclaimer": "※ 전생 인연 풀이는 명리학적 재미 콘텐츠입니다 🌙",
  "sajuCompat.footer": "이 풀이는 엔진이 계산한 점수·합충 근거를 바탕으로 AI가 서술한 해석이며, 참고용 콘텐츠입니다. 관계의 결론을 대신하지 않습니다.",
  // 생성 흐름(js/saju-compat-flow.mjs · js/saju-engine.js)이 결과 영역에 띄우는 진행·안내 문구.
  "sajuCompat.flow.starting": "사주 궁합 풀이를 준비하고 있어요…",
  "sajuCompat.flow.progress": "사주 궁합 풀이를 쓰고 있어요… ({done}/{total})",
  "sajuCompat.flow.keepOpen": "결제는 완료됐어요. 이 화면을 나갔다 돌아와도 같은 결과를 이어서 받아요.",
  "sajuCompat.flow.saved": "이 결과는 보관함에 저장되었어요. 다시 열어 볼 때는 추가 결제가 없어요.",
  "sajuCompat.flow.fallback": "AI 풀이를 불러오지 못해 기본 해석을 먼저 보여 드려요. 결제는 보존되어 있고, 아래 버튼으로 같은 궁합의 AI 풀이를 이어서 불러올 수 있어요.",
  "sajuCompat.flow.review": "AI 풀이 생성이 끝나지 못했어요. 결제와 저장된 내용은 안전하게 보존되어 있고, 고객센터에서 확인해 드릴게요. 아래는 기본 해석이에요.",
  "sajuCompat.flow.revoked": "취소·환불된 결제의 결과는 이어서 만들 수 없어요. 아래는 기본 해석이에요.",
  "sajuCompat.flow.retry": "AI 풀이 이어서 불러오기",
  "sajuCompat.flow.moduleFail": "AI 풀이 화면을 불러오지 못했어요. 결제는 진행되지 않았어요. 잠시 후 다시 시도해 주세요.",
  "sajuCompat.archive.title": "사주 궁합 기록",
  "sajuCompat.archive.lead": "결제하신 사주 궁합 결과가 그대로 보관돼요. 다시 열어도 추가 결제나 새로 생성하는 일은 없어요.",
  "sajuCompat.archive.loading": "기록을 불러오는 중이에요…",
  "sajuCompat.archive.empty": "아직 저장된 사주 궁합 결과가 없어요.",
  "sajuCompat.archive.login": "로그인하면 저장된 사주 궁합 기록을 볼 수 있어요.",
  "sajuCompat.archive.loginCta": "로그인하기",
  "sajuCompat.archive.error": "기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
  "sajuCompat.archive.retry": "다시 불러오기",
  "sajuCompat.archive.back": "← 목록으로",
  "sajuCompat.archive.close": "닫기",
  "sajuCompat.archive.itemTitle": "{type} — {name}",
  "sajuCompat.archive.itemMeta": "{date} · {score}점",
  "sajuCompat.archive.itemDate": "{date}",
  "sajuCompat.archive.itemOpen": "열어 보기",
  "sajuCompat.archive.itemAria": "{name} 사주 궁합 결과 열기",
  "sajuCompat.archive.revoked": "취소·환불된 결제의 결과는 열 수 없어요.",
  "sajuCompat.archive.notFound": "이 기록을 찾을 수 없어요.",
  "sajuCompat.archive.unreadable": "이 기록은 지금 화면으로 열 수 없어요. 고객센터로 문의해 주세요.",
  "sajuCompat.archive.detailNote": "저장된 결과예요. 다시 열어도 AI를 새로 부르지 않고 추가 결제도 없어요.",
  "sajuCompat.archive.duplicate": "같은 조건(내 사주·상대 이름·궁합 유형)으로 저장된 사주 궁합 결과가 보관함에 이미 있어요.\n\n[확인] 새로 결제하고 다시 보기\n[취소] 보관함에서 저장된 결과 열기",
};

const GRADE_ICON = { S: "🌟", A: "✨", B: "😊", C: "🙂", D: "⚠️", F: "🌧️" };
const PAST_ICON = { S: "💫", A: "🌸", B: "🌿", C: "🔮", D: "⚡", F: "🔥" };
const ELEMENT_EMOJI = { wood: "🌿", fire: "🔥", earth: "🌏", metal: "✨", water: "💧" };
const GRADES = ["S", "A", "B", "C", "D", "F"];
const TYPES = ["love", "business", "friend"];
const CROSS_KINDS = ["he", "chong", "same", "none"];
const STRENGTH_FLAGS = ["STRENGTH_SELF_LEADS", "STRENGTH_PARTNER_LEADS", "STRENGTH_PEER"];
const KE_FLAGS = ["KE_SELF_OVER_PARTNER", "KE_PARTNER_OVER_SELF"];
const FACT_NARRATIVE = {
  STRENGTH_SELF_LEADS: "strength", STRENGTH_PARTNER_LEADS: "strength", STRENGTH_PEER: "strength",
  KE_SELF_OVER_PARTNER: "ke", KE_PARTNER_OVER_SELF: "ke", KIJI_RELIEF: "kijiRelief", HE_TRAP: "heTrap",
};
const DETAIL_CARDS = ["emotionRhythm", "conflictSwitch", "realOps", "longTerm"];
const LOVE_CARDS = ["emotion", "conflict", "home", "growth"];
const ENERGY_BLOCKS = ["johu", "elements", "season", "tenGods"];
const PRESCRIPTION_BANDS = ["keep", "grow", "communicate", "survive"];

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ESCAPES[char]);

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const stringAt = (node, key) => (isObject(node) && typeof node[key] === "string" ? node[key].trim() : "");
const interpolate = (template, vars) => String(template).replace(/\{(\w+)\}/g, (match, name) => (vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match));

/**
 * 번역 함수 만들기. translate 는 window.cdTranslate(key, vars, fallback) 모양이며, 없으면 한국어 정본으로 그린다.
 * fallback 으로는 보간 전 한국어 원문을 넘긴다(보간은 translate 가 한 번만 한다).
 */
export function createSajuCompatT(translate) {
  return (key, vars) => {
    const fallback = SAJU_COMPAT_KO[key];
    if (fallback === undefined) return key;
    return typeof translate === "function" ? String(translate(key, vars || {}, fallback)) : interpolate(fallback, vars);
  };
}

function reasonIcon(reason) {
  if (reason.code.startsWith("KIJI_CONTROL")) return "⭐";
  if (reason.code === "HE_TRAP") return "🚨";
  return reason.polarity === "+" ? "💛" : "💜";
}

function reasonVars(reason, facts, t) {
  const evidence = reason.evidence || {};
  const element = (code) => t(`sajuCompat.element.${code}`);
  const elementWithEmoji = (code) => `${ELEMENT_EMOJI[code] || ""}${element(code)}`;
  switch (reason.code) {
    case "JOHU_MILD": return { tone: t(`sajuCompat.tone.${["hot", "warm"].includes(facts.johu?.self?.type) ? "warm" : "cool"}`) };
    case "MOIST_BOTH": return { moist: t(`sajuCompat.moist.${evidence.moist === "wet" ? "wet" : "dry"}`) };
    case "ELEMENT_SAME": case "ELEMENT_SAME_EXCESS": return { element: element(evidence.element) };
    case "ELEMENT_SHENG_SELF_TO_PARTNER": case "ELEMENT_SHENG_PARTNER_TO_SELF": return { from: element(evidence.from), to: element(evidence.to) };
    case "ELEMENT_KE": return { self: element(evidence.self), partner: element(evidence.partner) };
    case "YONGSHIN_COMMON": case "YONGSHIN_CLASH": return { elements: (evidence.elements || []).map(elementWithEmoji).join(", ") };
    case "KIJI_CONTROL_FORWARD": case "KIJI_CONTROL_REVERSE": {
      const events = evidence.events || [];
      return { by: events.map((event) => event.by).join(", "), chars: events.map((event) => event.char).join(", ") };
    }
    case "HE_TRAP": return { self: evidence.self, partner: evidence.partner, element: element(evidence.resultElement) };
    default: return {};
  }
}

/** 이 렌더러가 쓰는 고정 문구 키를 모두 돌려준다(테스트가 한국어 정본·번역 사전과 대조한다). */
export function sajuCompatKeys() { return Object.keys(SAJU_COMPAT_KO); }

/**
 * 스냅샷 → HTML. 스냅샷이 쓸 수 없는 모양이면 빈 문자열을 돌려주므로 호출부가 폴백(레거시 결과)을 고른다.
 * 비어 있는 서술 필드(결손)는 그 문단만 생략하고, 엔진 확정값(점수·등급·근거·교차)은 항상 그린다.
 */
export function renderSajuCompat(snapshot, { t = createSajuCompatT(), selfName = "" } = {}) {
  const facts = snapshot?.facts;
  if (!isObject(facts) || !isObject(facts.score) || !GRADES.includes(facts.grade?.code) || !Array.isArray(facts.reasons)) return "";
  const narrative = isObject(snapshot.narrative) ? snapshot.narrative : {};
  const T = (key, vars) => escapeHtml(t(key, vars));
  const type = TYPES.includes(facts.type) ? facts.type : "love";
  const code = facts.grade.code;
  const self = String(selfName || "").trim() || t("sajuCompat.selfFallback");
  const partner = String(snapshot.input?.partnerName || "").trim() || "?";

  const paragraphs = (value, className) => String(value || "").split(/\n+/).map((line) => line.trim()).filter(Boolean)
    .map((line) => `<p class="${className}">${escapeHtml(line)}</p>`).join("");
  const section = (title, body, className = "") => (body ? `<div class="compat-section${className ? ` ${className}` : ""}"><div class="compat-section-title">${typeof title === "function" ? title() : title}</div>${body}</div>` : "");

  const grade = `<div class="compat-grade-area"><div class="compat-grade-icon">${GRADE_ICON[code]}</div><div>`
    + `<div class="compat-grade-badge grade-${code.toLowerCase()}">${T("sajuCompat.gradeBadge", { grade: code })}</div>`
    + `<div class="compat-grade-label">${T("sajuCompat.titleLine", { type: t(`sajuCompat.type.${type}`), self, partner })}<br><span class="compat-grade-sub">${T(`sajuCompat.grade.${code}`)}</span></div>`
    + `<div class="compat-grade-desc">${paragraphs(stringAt(narrative, "gradeComment"), "compat-text")}</div>`
    + `<div class="compat-grade-score">${T("sajuCompat.scoreLine", { score: facts.score.display })}</div></div></div>`;

  const overview = section(T("sajuCompat.overview.title"),
    `<p class="compat-text compat-note">${T("sajuCompat.overview.note", { score: facts.score.display })}</p>${paragraphs(stringAt(narrative, "overview"), "compat-text")}`);

  const energyNode = isObject(narrative.energyHarmony) ? narrative.energyHarmony : {};
  const energy = section(() => T("sajuCompat.energy.title"), ENERGY_BLOCKS.map((key) => {
    const body = paragraphs(stringAt(energyNode, key), "compat-text");
    return body ? `<div class="compat-energy-block"><div class="compat-energy-label">${T(`sajuCompat.energy.${key}`)}</div>${body}</div>` : "";
  }).join(""));

  const cardNode = isObject(narrative.detailCards) ? narrative.detailCards : {};
  const cards = DETAIL_CARDS.map((key) => {
    const body = paragraphs(stringAt(cardNode, key), "compat-text");
    return body ? `<div class="compat-detail-card"><div class="compat-detail-title">${T(`sajuCompat.detail.${key}`)}</div>${body}</div>` : "";
  }).join("");
  const details = section(() => T("sajuCompat.detail.title"), cards ? `<div class="compat-detail-grid">${cards}</div>` : "");

  const reasonNode = isObject(narrative.reasonDetails) ? narrative.reasonDetails : {};
  const reasonItems = facts.reasons.map((reason) => {
    const detail = stringAt(reasonNode, reason.code).replace(/\s*\n+\s*/g, " ");
    return `<div class="compat-check-item"><span class="compat-check-icon">${reasonIcon(reason)}</span><span>`
      + `<b class="compat-check-reason">${T(`sajuCompat.reason.${reason.code}`, reasonVars(reason, facts, t))}</b>`
      + `${detail ? `<small class="compat-check-detail">${escapeHtml(detail)}</small>` : ""}</span></div>`;
  }).join("");
  const reasons = section(`${T("sajuCompat.reasons.title")} <span class="compat-section-total">${T("sajuCompat.reasons.total", { total: Number(facts.score.raw).toFixed(1) })}</span>`, reasonItems);

  const loveNode = isObject(narrative.loveMarriage) ? narrative.loveMarriage : {};
  const loveCards = type === "love" ? LOVE_CARDS.map((key) => {
    const body = paragraphs(stringAt(loveNode, key), "compat-text");
    return body ? `<article class="compat-love-card"><h4>${T(`sajuCompat.love.${key}`)}</h4>${body}</article>` : "";
  }).join("") : "";
  const love = section(() => T("sajuCompat.love.title"), loveCards ? `<div class="compat-love-grid">${loveCards}</div>` : "", "compat-love-depth");

  const realityNode = isObject(narrative.reality) ? narrative.reality : {};
  const factItem = (label, body) => (body ? `<div class="compat-check-item compat-fact-item"><span class="compat-check-icon">🔥</span><span><b>${label}:</b> ${escapeHtml(body.replace(/\s*\n+\s*/g, " "))}</span></div>` : "");
  const flags = Array.isArray(facts.factFlags) ? facts.factFlags : [];
  const factItems = [
    ...[...STRENGTH_FLAGS, ...KE_FLAGS, "KIJI_RELIEF", "HE_TRAP"].filter((flag) => flags.includes(flag))
      .map((flag) => factItem(T(`sajuCompat.fact.${flag}`), stringAt(realityNode, FACT_NARRATIVE[flag]))),
    factItem(T("sajuCompat.fact.repeatScene"), stringAt(realityNode, "repeatScene")),
    factItem(T("sajuCompat.fact.recovery"), stringAt(realityNode, "recovery")),
  ].join("");
  const fact = factItems ? `<div class="compat-fact-box"><div class="compat-fact-title">${T("sajuCompat.fact.title")}</div><div class="compat-fact-body">${factItems}</div></div>` : "";

  const prescriptionNode = isObject(narrative.prescription) ? narrative.prescription : {};
  const band = PRESCRIPTION_BANDS.includes(facts.prescriptionBand) ? facts.prescriptionBand : "communicate";
  const adviceLine = (label, body) => (body ? `<p class="compat-advice-line"><b>${label}:</b> ${escapeHtml(body.replace(/\s*\n+\s*/g, " "))}</p>` : "");
  const adviceItems = [
    adviceLine(T(`sajuCompat.advice.${band}`), stringAt(prescriptionNode, "gradeAdvice")),
    adviceLine(T(`sajuCompat.advice.secret.${type}`), stringAt(prescriptionNode, "typeSecret")),
    adviceLine(T("sajuCompat.advice.conflictRoutine"), stringAt(prescriptionNode, "conflictRoutine")),
    adviceLine(T("sajuCompat.advice.growthGoal"), stringAt(prescriptionNode, "growthGoal")),
  ].join("");
  const advice = adviceItems ? `<div class="compat-advice-box"><div class="compat-advice-title">${T("sajuCompat.advice.title")}</div><div class="compat-advice-body">${adviceItems}</div></div>` : "";

  return `<div class="compat-wrap cd-compat-snap" data-saju-compat-schema="${escapeHtml(snapshot.schemaVersion ?? "")}">`
    + grade + overview + energy + details + reasons + love + fact + advice + renderPastLife(snapshot, { t, T, self, partner, paragraphs })
    + `<div class="compat-footnote">${T("sajuCompat.footer")}</div></div>`;
}

function renderPastLife(snapshot, { t, T, self, partner, paragraphs }) {
  const past = snapshot.facts.pastLife;
  if (!isObject(past) || !GRADES.includes(past.grade?.code) || !Array.isArray(past.cross) || past.cross.length !== 2) return "";
  const narrative = isObject(snapshot.narrative?.pastLife) ? snapshot.narrative.pastLife : {};
  const code = past.grade.code;
  const pillar = (item) => `${item?.gan || ""}${item?.ji || ""}`;
  const kindOf = (kind) => (CROSS_KINDS.includes(kind) ? kind : "none");
  const chip = (from, to, kind) => `<div class="pastlife-chip pc-${kindOf(kind)}">${escapeHtml(from)} <span class="pastlife-chip-kind">${T(`sajuCompat.past.cross.${kindOf(kind)}`)}</span> ${escapeHtml(to)}</div>`;
  const row = (title, item, reading) => `<div class="pastlife-cross-row"><div class="pastlife-cross-title">${title}</div>`
    + `<div class="pastlife-cross-chips">${chip(item.from?.gan, item.to?.gan, item.gan)}${chip(item.from?.ji, item.to?.ji, item.ji)}</div>`
    + `${reading ? `<div class="pastlife-cross-result">${paragraphs(reading, "compat-text")}</div>` : ""}</div>`;
  const [selfToPartner, partnerToSelf] = past.cross;
  const readings = isObject(narrative.crossReadings) ? narrative.crossReadings : {};
  const label = t(`sajuCompat.past.grade.${code}`).split("·").pop().trim();
  const questions = (Array.isArray(narrative.questions) ? narrative.questions : []).filter((item) => typeof item === "string" && item.trim());
  const reflection = `<div class="pastlife-reflection"><h4>${T("sajuCompat.past.questionsTitle")}</h4>`
    + `<p>${T(`sajuCompat.past.reflection${Number(past.grade.pScore) >= 1 ? "Pull" : "Distance"}`, { label })}</p>`
    + `<p>${T("sajuCompat.past.reflectionNote")}</p>`
    + `${questions.length ? `<ul>${questions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}</div>`;
  const story = stringAt(narrative, "story");
  const prescription = stringAt(narrative, "prescription");
  const gradeDesc = stringAt(narrative, "gradeDesc");
  return `<div class="pastlife-card"><div class="pastlife-header"><div><div class="pastlife-title-text">${T("sajuCompat.past.title")}</div>`
    + `<div class="pastlife-subtitle">${T("sajuCompat.past.subtitle")}</div></div></div>`
    + `<div class="pastlife-karma-badge">${T(`sajuCompat.past.grade.${code}`)}</div>`
    + `${gradeDesc ? `<div class="pastlife-grade-desc">${paragraphs(gradeDesc, "compat-text")}</div>` : ""}`
    + row(T("sajuCompat.past.crossSelf", { self, partner, selfPillar: pillar(selfToPartner.from), partnerPillar: pillar(selfToPartner.to) }), selfToPartner, stringAt(readings, "selfToPartner"))
    + row(T("sajuCompat.past.crossPartner", { self, partner, selfPillar: pillar(partnerToSelf.to), partnerPillar: pillar(partnerToSelf.from) }), partnerToSelf, stringAt(readings, "partnerToSelf"))
    + `${story ? `<div class="pastlife-story-box"><div class="pastlife-story-icon">${PAST_ICON[code]}</div><div class="pastlife-story-text">${paragraphs(story, "compat-text")}</div></div>` : ""}`
    + `${prescription ? `<div class="pastlife-prescription"><div class="pastlife-prescription-title">${T("sajuCompat.past.prescription")}</div><div class="pastlife-prescription-body">${paragraphs(prescription, "compat-text")}</div></div>` : ""}`
    + reflection
    + `<div class="pastlife-disclaimer">${T("sajuCompat.past.disclaimer")}</div></div>`;
}
