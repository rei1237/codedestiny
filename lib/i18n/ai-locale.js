/**
 * AI 응답 언어(출력 로케일) 단일 정본.
 *
 * UI 번역과 달리 AI 응답은 "사전에 넣는" 방식이 통하지 않는다. 모델이 어떤 언어로
 * 쓸지를 프롬프트가 정하므로, 언어를 요청 경계에서 붙잡아 프롬프트까지 실어 나르는
 * 파이프가 필요하다. 이 파일은 그 파이프의 토큰(AiLocale)과 프롬프트 지시문을 정의한다.
 *
 * 🔴 정규화는 여기서 다시 구현하지 않는다 — dictionary.ts 의 normalizeLocale 을 쓴다.
 *    (zh → zh-CN, zh-hant → zh-TW 같은 표기 흡수가 이미 거기 있다)
 *
 * 🔴 .ts 가 아니라 .js + JSDoc 인 이유: worker/ 코드가 이 파일을 임포트하는데, 이 레포의
 *    Jest 에는 TS 프리셋이 없다(jest.config.cjs 주석 참고 — package-lock.json 을 건드리지
 *    않고는 devDependency 를 추가할 수 없음). .ts 로 두면 worker/lib/gemini.js 를 거쳐
 *    임포트하는 기존 워커 테스트가 전부 파싱 단계에서 깨진다.
 */

import { normalizeLocale } from "./locale-normalize.js";

/** worker/Next 양쪽이 읽는 전송 헤더. app/api/tarot/love-reading/route.js 가 이미 쓰던 이름을 승계한다. */
export const AI_LOCALE_HEADER = "x-code-destiny-locale";

/**
 * AI 가 실제로 출력할 수 있는 언어 = 런타임 UI 로케일 12개 전부.
 *
 * 🔴 2026-08-20 이전에는 5개(ko/en/ja/zh-CN/zh-TW)였다. 나머지 7개는 UI 만 그 언어로 보여 주고
 *    상담문은 **한국어로** 내려보내고 있었다 — 독일어 사용자가 독일어 화면에서 한국어 본문을
 *    받는 상태였다. 사용자 결정(2026-08-20)으로 12개 전부를 출력 대상으로 올린다.
 *
 * 🔴 목록을 여기서 다시 쓰지 않고 RUNTIME_LOCALES 와 **같은 값으로 고정**한다. 두 목록이
 *    갈라지면 새 UI 로케일이 조용히 한국어 상담문을 받는 옛 상태로 돌아간다.
 *    scripts/verify-ai-locale-pipeline.mjs 의 (9)가 두 배열이 동일한지 단언한다.
 *
 * 🔴 리터럴 배열로 둔다. scripts/verify-market-policy-registry.mjs 가 이 파일을 **텍스트로 읽어**
 *    `[...]` 를 파싱하므로 `= RUNTIME_LOCALES` 로 바꾸면 그 가드가 빈 목록을 보고 실패한다.
 *
 * 품질 한계는 숨기지 않는다: 지시문이 지켜지는지는 과금 실호출 없이는 잴 수 없다(미검증).
 * 다만 지금은 그 언어 사용자가 **한국어**를 받고 있으므로, 지시가 부분적으로만 지켜져도 낫다.
 */
export const AI_OUTPUT_LOCALES = [
  "ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms",
];

/** @typedef {"ko" | "en" | "ja" | "zh-CN" | "zh-TW" | "vi" | "hi" | "es" | "fr" | "de" | "nl" | "ms"} AiLocale */

/**
 * 지원 밖 로케일이 도달했을 때의 출력 언어. 나중에 "en" 으로 뒤집을 단일 스위치.
 * @type {AiLocale}
 */
export const AI_OUTPUT_FALLBACK = "ko";

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isAiLocale(value) {
  return AI_OUTPUT_LOCALES.includes(value);
}

/**
 * 헤더·쿠키·바디에서 온 임의 표기를 AI 출력 로케일로 좁힌다.
 * @param {string | null | undefined} [value]
 * @returns {AiLocale}
 */
export function toAiLocale(value) {
  const runtime = normalizeLocale(value);
  return isAiLocale(runtime) ? runtime : AI_OUTPUT_FALLBACK;
}

/**
 * 사람이 읽는 언어 이름. 로그와 운영 도구에서 쓴다.
 * @type {Record<AiLocale, string>}
 */
export const AI_LOCALE_LABEL = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  vi: "Tiếng Việt",
  hi: "हिन्दी",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  nl: "Nederlands",
  ms: "Bahasa Melayu",
};

/**
 * 출력 언어 지시문의 첫 줄.
 *
 * 🔴 지시문 자체를 한국어로 쓰지 않는다. 폴백 모델의 한국어 지시 준수율이 낮아서,
 *    한국어로 "영어로 써라"라고 하면 그대로 한국어를 뱉는다. 대상 언어 + 영어를 병기한다.
 *
 *    이 근거는 구 폴백 모델(@cf/meta/llama-3.1-8b-instruct, 2026-05-30 폐기) 때 얻은 것이다.
 *    현재 폴백은 @cf/meta/llama-3.3-70b-instruct-fp8-fast 이지만 이 모델도 한국어 프롬프트에
 *    영어로 답하는 경우가 관측돼(2026-07-30) 병기 규칙은 그대로 유지한다.
 *
 * @type {Record<AiLocale, string>}
 */
const LOCALE_DIRECTIVE_HEAD = {
  ko: "모든 최종 답변은 자연스러운 한국어 존댓말로 작성하십시오. / Write the ENTIRE response in Korean only.",
  en: "Write the ENTIRE response in English only.",
  ja: "回答は全文を日本語のみで書いてください。 / Write the ENTIRE response in Japanese only.",
  "zh-CN": "请全文只用简体中文书写。 / Write the ENTIRE response in Simplified Chinese only.",
  "zh-TW": "請全文只用繁體中文書寫。 / Write the ENTIRE response in Traditional Chinese only.",
  vi: "Hãy viết TOÀN BỘ câu trả lời chỉ bằng tiếng Việt. / Write the ENTIRE response in Vietnamese only.",
  hi: "पूरा उत्तर केवल हिन्दी में लिखें। / Write the ENTIRE response in Hindi only.",
  es: "Escribe TODA la respuesta únicamente en español. / Write the ENTIRE response in Spanish only.",
  fr: "Rédigez TOUTE la réponse uniquement en français. / Write the ENTIRE response in French only.",
  de: "Schreibe die GESAMTE Antwort ausschließlich auf Deutsch. / Write the ENTIRE response in German only.",
  nl: "Schrijf het VOLLEDIGE antwoord uitsluitend in het Nederlands. / Write the ENTIRE response in Dutch only.",
  ms: "Tulis KESELURUHAN jawapan dalam bahasa Melayu sahaja. / Write the ENTIRE response in Malay only.",
};

/**
 * 🔴 "위쪽 지시를 무효화한다"를 명시해야 한다. 기존 프롬프트 21곳에 "한국어로 작성하세요"가
 *    리터럴로 박혀 있고, 그 대부분이 user 프롬프트 본문 안에 있다.
 *
 * 🔴 JSON 키·enum·고정 섹션 title 은 건드리지 말라고 못 박는다. 숙요 궁합 등은 응답 스키마
 *    매칭이 title 문자열에 걸려 있어서, 모델이 제목까지 번역하면 파싱이 깨진다.
 */
const DIRECTIVE_TAIL = [
  "This instruction has the HIGHEST priority and overrides every other language instruction above,",
  "including any instruction written in Korean such as 한국어로 작성 / 한국어만 사용 / 한국어 존댓말.",
  "Do not mix languages. Do not append a translation or the Korean original.",
  "The service locale controls the answer language, even when the question or conversation history uses another language.",
  "Use a natural, empathetic advisory tone appropriate to the target language; avoid literal Korean phrasing and deterministic promises.",
  "Keep JSON keys, enum values, and any fixed section titles exactly as given — translate only human-readable prose.",
].join("\n");

/** Locale is a language preference, never evidence of nationality, religion or residence. */
const LOCAL_READING_STYLE = {
  en: 'Use natural English for a personal reading, not a literal translation. Introduce Saju as Korean Four Pillars of Destiny; distinguish it from Western astrology. Explain technical terms on first use. Prefer concrete relationship patterns, career choices and practical next steps over fate or luck slogans.',
  ja: '自然で落ち着いた日本語を使う。四柱推命・紫微斗数・宿曜・西洋占星術・インド占星術を混同しない。専門用語には短い説明を添え、相性や運勢を断定せず、日常で試せる行動につなげる。',
  'zh-CN': '使用自然的简体中文。四柱命理、紫微斗数、宿曜、西方占星和印度占星须各自区分。财运讲收支习惯和选择，不许诺收益；感情分析不替他人断言心意。',
  'zh-TW': '使用自然的繁體中文，採用命盤、流年、感情與事業等慣用詞。區分八字、紫微斗數、宿曜、西洋占星與印度占星。術語附上白話解釋，不保證財富或復合。',
  vi: 'Viết tiếng Việt tự nhiên, xưng hô tôn trọng và nhất quán. Giải thích Saju là hệ thống Tứ trụ của Hàn Quốc; phân biệt với Tử Vi và chiêm tinh phương Tây. Nêu xu hướng và lựa chọn cụ thể, không khẳng định định mệnh.',
  hi: 'सहज, सम्मानपूर्ण हिन्दी में लिखें। कोरियाई साजू को भारतीय वैदिक ज्योतिष से अलग समझाएँ। लग्न, राशि और नक्षत्र जैसे शब्द केवल संबंधित प्रणाली में प्रयोग करें और अर्थ बताएँ। जाति, धर्म, विवाह की रीति या पारिवारिक भूमिका न मान लें।',
  es: 'Usa español internacional natural y cercano, sin regionalismos innecesarios. Explica el Saju como los Cuatro Pilares coreanos y distingue cada tradición. Habla de patrones, opciones y acciones concretas, sin prometer reconciliación ni ganancias.',
  fr: 'Rédigez un français fluide et attentionné. Présentez le Saju comme les Quatre Piliers coréens, sans le confondre avec l’astrologie occidentale. Privilégiez les tendances, les pistes de réflexion et les choix concrets, sans certitude prédictive.',
  de: 'Schreibe klares, natürliches Deutsch. Erkläre Saju als koreanische Vier-Säulen-Deutung und trenne die astrologischen Systeme. Erläutere Fachbegriffe knapp; beschreibe nachvollziehbare Muster und Handlungsmöglichkeiten ohne Erfolgsversprechen.',
  nl: 'Schrijf helder, natuurlijk Nederlands. Leg Saju uit als de Koreaanse Vier Pijlers en houd de tradities gescheiden. Geef concrete inzichten en keuzemogelijkheden zonder stellige voorspellingen of overdreven verkooppraat.',
  ms: 'Gunakan bahasa Melayu yang semula jadi dan sopan. Terangkan Saju sebagai sistem Empat Tiang Korea dan bezakan daripada astrologi lain. Fokus pada refleksi dan pilihan praktikal; jangan andaikan agama, kepercayaan atau adat pengguna.',
};

// register:'persona' — 상담자 페르소나가 말투(반말·존댓말)를 정하는 호출. ko 머리말의 존댓말 강제와
// 꼬리의 '한국어 존댓말' 언급만 빼고 언어 고정과 나머지 계약은 그대로 둔다. 다른 언어는 바이트 동일.
const KO_PERSONA_REGISTER_HEAD = "모든 최종 답변은 자연스러운 한국어로 작성하십시오. 존댓말·반말 같은 말투는 상담자 페르소나 지시를 따르십시오. / Write the ENTIRE response in Korean only.";
const PERSONA_REGISTER_TAIL = DIRECTIVE_TAIL.replace(" / 한국어 존댓말.", ".");

/**
 * 모든 지원 언어에 명시적인 출력 계약을 적용한다. 원래 상담 지시는 유지한다.
 * @param {AiLocale} locale
 * @param {{register?: "persona"}} [options]
 * @returns {string}
 */
export function buildOutputLanguageDirective(locale, options = {}) {
  const head = LOCALE_DIRECTIVE_HEAD[locale];
  if (!head) return "";
  if (options?.register === "persona" && locale === "ko") {
    return `[OUTPUT LANGUAGE — HIGHEST PRIORITY]\n${KO_PERSONA_REGISTER_HEAD}\n${PERSONA_REGISTER_TAIL}`;
  }
  return `[OUTPUT LANGUAGE — HIGHEST PRIORITY]\n${head}\n${DIRECTIVE_TAIL}${LOCAL_READING_STYLE[locale] ? "\n" + LOCAL_READING_STYLE[locale] + "\nDo not infer nationality, religion, residence, currency, or family roles from the selected language. Preserve supplied dates, birth time, time zone and calculation evidence." : ""}`;
}
