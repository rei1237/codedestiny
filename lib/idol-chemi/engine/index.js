// 결정론 케미 엔진 진입점. 같은 입력 + 같은 버전 → 항상 같은 결과.
// 시계를 읽지 않는다(현재 시각 API 금지) — 참조일은 호출자가 넘긴다(서버는 서버 날짜, 클라이언트는 KST 오늘).
import { BIRTH_DATE_PATTERN, buildChemiPillars } from "./pillars.js";
import { deriveSignals, resolveSignalStrength } from "./signals.js";
import { CHEMI_RULES_VERSION, CHEMI_TYPE_BY_ID, resolveChemiType } from "./chemiTypes.js";
import { fnv1aHex } from "./hash.js";

export const ENGINE_VERSION = "idol-chemi-1.0.0";
/** 이 나이 미만이 한쪽이라도 있으면 우정·팀워크 카피 전용(minorMode). 만 나이, 참조일 기준. */
export const MINOR_AGE_LIMIT = 19;
/** 사용자 본인은 이 나이 미만이면 계산을 받지 않는다(서버·클라이언트 동일 상수). */
export const MIN_SELF_CONSENT_AGE = 14;
export const DATA_GAP_PARTNER_HOUR = "최애 출생 시간 비공개 — 시주 제외";
export const DATA_GAP_USER_HOUR = "대칭 비교를 위해 내 시주도 제외";

export { CHEMI_RULES_VERSION, CHEMI_TYPES, CHEMI_TYPE_IDS, CHEMI_TYPE_BY_ID } from "./chemiTypes.js";
export { buildChemiPillars } from "./pillars.js";
export { deriveSignals, resolveSignalStrength } from "./signals.js";
export { fnv1a32, fnv1aHex, pickDeterministic } from "./hash.js";

function parseIsoDate(value) {
  const text = String(value || "").trim();
  if (!BIRTH_DATE_PATTERN.test(text)) return null;
  const [y, m, d] = text.split("-").map((n) => Number(n));
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return { y, m, d };
}

/** 만 나이(참조일 기준). 둘 다 YYYY-MM-DD 문자열, 시간대 개념 없음. */
export function computeFullAge(birthIso, referenceIso) {
  const b = parseIsoDate(birthIso);
  const r = parseIsoDate(referenceIso);
  if (!b || !r) return null;
  let age = r.y - b.y;
  if (r.m < b.m || (r.m === b.m && r.d < b.d)) age -= 1;
  return age;
}

function assertPartner(partner) {
  if (!partner || typeof partner !== "object") throw new Error("IDOL_CHEMI_PARTNER_REQUIRED");
  if (!partner.id || !partner.kind) throw new Error("IDOL_CHEMI_PARTNER_REF_INVALID");
  if (!parseIsoDate(partner.birthDate)) throw new Error("IDOL_CHEMI_PARTNER_BIRTH_INVALID");
  if (partner.birthTimeKnown === true) throw new Error("IDOL_CHEMI_PARTNER_HOUR_FORBIDDEN");
}

/**
 * @param {{
 *   user: {birthDate:string, calendarType?:"solar"|"lunar"|"lunar_leap", isLeapMonth?:boolean},
 *   partner: {kind:"roster"|"preset", id:string, displayName:string, groupLabel?:string, groupId?:string|null,
 *             birthDate:string, birthTimeKnown:false, sourceVersion:string},
 *   referenceDate: string  // YYYY-MM-DD, 호출자가 전달
 * }} input
 */
export function computeChemi(input) {
  const user = input && input.user;
  const partner = input && input.partner;
  const referenceDate = String((input && input.referenceDate) || "").trim();
  if (!parseIsoDate(referenceDate)) throw new Error("IDOL_CHEMI_REFERENCE_DATE_INVALID");
  if (!user || !parseIsoDate(user.birthDate)) throw new Error("IDOL_CHEMI_BIRTH_DATE_INVALID");
  assertPartner(partner);

  const userPillars = buildChemiPillars(user);
  const partnerPillars = buildChemiPillars({ birthDate: partner.birthDate, calendarType: "solar" });

  const userAge = computeFullAge(userPillars.solarDate, referenceDate);
  const partnerAge = computeFullAge(partner.birthDate, referenceDate);
  if (userAge === null || userAge < MIN_SELF_CONSENT_AGE) throw new Error("IDOL_CHEMI_USER_UNDER_CONSENT_AGE");
  const minorMode = userAge < MINOR_AGE_LIMIT || partnerAge === null || partnerAge < MINOR_AGE_LIMIT;

  const signals = deriveSignals(userPillars, partnerPillars, { minorMode });
  const { typeId, matchedSignalKeys } = resolveChemiType(signals);
  const signalStrength = resolveSignalStrength(signals);

  const rosterVersion = String(partner.sourceVersion || "");
  const identity = [ENGINE_VERSION, CHEMI_RULES_VERSION, rosterVersion, userPillars.solarDate, partner.kind, partner.id, minorMode ? "minor" : "adult"].join("|");
  const inputHash = fnv1aHex(identity);
  // 카피 시드는 생일 원문 대신 명식 간지로 만든다 — 같은 명식이면 같은 문장, 생일은 어디에도 남지 않음.
  const copySeed = fnv1aHex([userPillars.year.ganji, userPillars.month.ganji, userPillars.day.ganji, partner.kind, partner.id, typeId].join("|"));

  const type = CHEMI_TYPE_BY_ID[typeId];
  return Object.freeze({
    engineVersion: ENGINE_VERSION,
    rulesVersion: CHEMI_RULES_VERSION,
    rosterVersion,
    inputHash,
    copySeed,
    chemiTypeId: typeId,
    chemiTypeNameKo: type.nameKo,
    chemiTypeShortKo: type.shortKo,
    chemiTypeRuleKo: type.ruleKo,
    matchedSignalKeys: Object.freeze(matchedSignalKeys),
    signalStrength,
    chemiIndex: null,
    signals,
    dataGaps: Object.freeze([DATA_GAP_PARTNER_HOUR, DATA_GAP_USER_HOUR]),
    minorMode,
    pillars: Object.freeze({
      user: stripPillars(userPillars),
      partner: stripPillars(partnerPillars),
    }),
    partner: Object.freeze({
      kind: partner.kind,
      id: partner.id,
      displayName: String(partner.displayName || ""),
      groupLabel: String(partner.groupLabel || ""),
      groupId: partner.groupId || null,
    }),
  });
}

// 결과 객체에 생일(solarDate)을 싣지 않는다 — 공유·저장 경로 어디서도 생일이 새지 않게 여기서 끊는다.
function stripPillars(p) {
  return Object.freeze({
    year: p.year,
    month: p.month,
    day: p.day,
    dayStemElement: p.dayStemElement,
    yinYang: p.yinYang,
    elementCounts: p.elementCounts,
    strongest: p.strongest,
    weakest: p.weakest,
    lacking: p.lacking,
    includeHour: false,
  });
}
