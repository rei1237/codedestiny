// Threads 🌙 오늘의 베다점 — 16:00 KST.
//
// 중심은 오늘 달이 머무는 나크샤트라다. 하늘 값은 today-sky.js 의 computeTodaySky(서울 정오, 시데리얼) —
// today 허브(/today 베다 탭)와 같은 함수라 사이트와 SNS 의 나크샤트라·판창가가 어긋나지 않는다.
// 속성은 constants/nakshatra-attributes.js 정본, 판창가 이름표는 today-vedic-detail.js 에서 import 한다.
// 🔴 빔쇼타리 다샤는 유료 상품이라 어느 날이든 금지어다(today-vedic-detail.js 머리말과 같은 규약).

import { getNakshatraAttributes } from "../../../constants/nakshatra-attributes.js";
import { getKstDateParts } from "../daily-fortune-task.js";
import { withJosa } from "../pet/pet-elements.js";
import { computeTodaySky } from "../today-sky.js";
import { MOVABLE_KARANA, TITHI_NAMES, YOGA_NAMES } from "../today-vedic-detail.js";
import { GRAHA_KO, SIGNS_KO, SIGN_LORDS, signKoName } from "../vedic-derived-calculations.js";
import {
  COMMON_RULES,
  generateJsonCopy,
  kstDateLabel,
  mergeCopy,
  renderPost,
} from "./shared.js";

export const TYPE = "vedic";
export const PATH = "/today?tab=vedic";
export const HASHTAG = "베다점";
export const CTA = "내 Nakshatra에서 오늘의 달은 어떤 영향을 줄까?";

const NAKSHATRA_COUNT = 27;

/**
 * facts 계산. sky 를 넘기면 천체 계산을 건너뛴다(테스트·관리자 재현용). 넘기지 않으면 computeTodaySky 1회.
 * Swiss 오류는 던진다 — 발행 Job 이 실패로 기록하고 창 안의 다음 틱에서 다시 시도한다.
 * @returns {Promise<object|null>}
 */
export async function buildFacts(env, now, { sky, requestUrl } = {}) {
  const { y, m, d } = getKstDateParts(now);
  const resolved = sky ?? await computeTodaySky(env, { year: y, month: m, day: d }, { requestUrl });
  const panchanga = resolved?.panchanga;
  if (!panchanga) return null;
  const attrs = getNakshatraAttributes(panchanga.nakshatra.index);
  if (!attrs) return null;

  const signIndex = Math.floor((((resolved.moonLon % 360) + 360) % 360) / 30);
  return {
    type: TYPE,
    dateLabel: kstDateLabel(now),
    basis: "서울 정오 기준",
    nakshatra: {
      nameKo: attrs.nameKo,
      nameEn: attrs.nameEn,
      pada: panchanga.nakshatra.pada,
      lordKo: panchanga.nakshatra.lordKo,
      symbol: attrs.symbol || "",
      shakti: attrs.shakti || "",
      deityKeywords: attrs.deityKw || [],
    },
    moonSign: { nameKo: signKoName(resolved.moonLon), lordKo: GRAHA_KO[SIGN_LORDS[signIndex]] || "" },
    vara: panchanga.vara ? { ko: panchanga.vara.ko, lordKo: panchanga.vara.lordKo, theme: panchanga.vara.theme } : null,
    tithi: { paksha: panchanga.tithi.paksha, name: panchanga.tithi.name, group: panchanga.tithi.group, groupLine: panchanga.tithi.groupLine },
    yoga: { name: panchanga.yoga.name, caution: panchanga.yoga.caution },
    karana: { name: panchanga.karana.name, line: panchanga.karana.line },
  };
}

// 일상어와 겹치는 이름("나가"·"가라"·"시바"·"슈바")은 뺀다 — 일반 문장이 오판으로 버려지지 않게.
const COMMON_WORD_NAMES = new Set(["나가", "가라", "시바", "슈바"]);
const NAKSHATRA_NAMES = Array.from({ length: NAKSHATRA_COUNT }, (_, index) => getNakshatraAttributes(index)?.nameKo).filter(Boolean);
const VOCABULARY = [
  ...NAKSHATRA_NAMES,
  ...YOGA_NAMES,
  ...TITHI_NAMES.filter(Boolean),
  "푸르니마", "아마바스야",
  ...MOVABLE_KARANA, "킴스투그나", "샤쿠니", "차투슈파다",
  ...SIGNS_KO,
  "화성", "수성", "목성", "금성", "토성", "라후", "케투",
].filter((word) => !COMMON_WORD_NAMES.has(word));
const FORBIDDEN = ["다샤", "마하다샤", "안타르다샤", "트랜짓", "고차라"];

function allowedTerms(facts) {
  return [
    facts.nakshatra.nameKo,
    facts.nakshatra.lordKo,
    facts.moonSign.nameKo,
    facts.moonSign.lordKo,
    facts.vara?.lordKo,
    facts.yoga.name,
    facts.tithi.name,
    facts.tithi.name.replace(/\(.*\)$/, ""),
    facts.karana.name,
  ];
}

function fallbackCopy(facts) {
  const { nakshatra: nak, vara, yoga, tithi, karana } = facts;
  const dayPart = vara ? `${vara.theme} ${vara.ko}` : "오늘";
  return {
    hook: `달이 ${nak.nameKo}에 머무는 ${dayPart}입니다.`,
    // 상징·샥티는 사실 줄에 이미 있다 — 본문은 신격 키워드와 티티 성격만 옮긴다.
    body: `${nak.nameKo}의 결은 ${nak.deityKeywords.slice(0, 2).join("·")}. ${tithi.groupLine}`,
    tip: yoga.caution
      ? `요가가 ${withJosa(yoga.name, "이라", "라")} 새 일보다 하던 일을 다지는 편이 낫습니다.`
      : karana.line,
  };
}

const SYSTEM_PROMPT = [
  "당신은 30년 넘게 상담해 온 베다 점성술(죠티샤) 전문가다. 나크샤트라와 판창가 해석에 밝다.",
  "오늘은 특정인의 출생 차트가 아니라 오늘 하늘(달의 나크샤트라·판창가)만 다룬다. 개인의 길흉과 다샤를 말하지 않는다.",
  COMMON_RULES,
].join("\n");

export function buildPrompt(facts) {
  return [
    "facts — 스위스 에페메리스 시데리얼 황경으로 계산한 오늘 하늘의 사실이다. 값을 바꾸지 말고 문장으로만 옮겨라.",
    JSON.stringify(facts, null, 1),
    "",
    "다음 JSON 하나만 출력하라. 설명·코드펜스를 붙이지 마라.",
    "{",
    '  "hook": "오늘 달이 머무는 나크샤트라로 오늘이 어떤 날인지 한 문장. 나크샤트라 이름을 넣는다. 45자 이내.",',
    '  "body": "나크샤트라의 symbol·shakti·deityKeywords 와 티티(tithi.group)를 녹인 두 문장. 110자 이내.",',
    '  "tip": "yoga.caution·karana 를 근거로 오늘 해 볼 만한 행동 하나. 50자 이내."',
    "}",
  ].join("\n");
}

function copyRules(facts) {
  const base = { vocabulary: VOCABULARY, allowed: allowedTerms(facts), forbidden: FORBIDDEN };
  return {
    hook: { ...base, min: 10, max: 45 },
    body: { ...base, min: 30, max: 110 },
    tip: { ...base, min: 10, max: 50 },
  };
}

/** @returns {Promise<{copy: Object<string,string>, model: string|null, rejected: string[]}>} */
export async function writeCopy(env, facts, { generateImpl } = {}) {
  const generated = await generateJsonCopy(env, { type: TYPE, systemPrompt: SYSTEM_PROMPT, prompt: buildPrompt(facts), generateImpl });
  return mergeCopy(generated, copyRules(facts), fallbackCopy(facts));
}

export function format(facts, copy, url) {
  const { nakshatra: nak, moonSign, tithi, yoga, karana } = facts;
  const lines = [
    `🌙 ${facts.dateLabel} 오늘의 베다점 · ${facts.basis}`,
    copy.hook,
    "",
    `· 달 나크샤트라 ${nak.nameKo}(${nak.nameEn}) ${nak.pada}파다 — 지배성 ${nak.lordKo}`,
    `· 상징 ${nak.symbol} · ${nak.shakti}`,
    `· 달 라시 ${moonSign.nameKo}(지배성 ${moonSign.lordKo})`,
    `· 티티 ${tithi.name}(${tithi.group}) · 요가 ${yoga.name}${yoga.caution ? "(주의)" : ""} · 카라나 ${karana.name}`,
    "",
    copy.body,
  ];
  return renderPost({ head: lines.join("\n"), extra: copy.tip, cta: CTA, url, hashtag: HASHTAG });
}
