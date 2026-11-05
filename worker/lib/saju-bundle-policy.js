import { normalizePaidFeatureKey } from "./paid-feature-registry.js";

/*
 * 2026-11-04 사주 영구 묶음(29,000원) 정본. 레지스트리 외 의존성을 두지 않는다.
 * - 묶음 행 한 줄(saju_lifetime_bundle)만 결제 때 부여한다. 포함 키는 읽을 때 그 행으로도 열린다(읽기 별칭, Task 2).
 * - 포함 키를 늘리면 기존 구매자에게도 적용된다. 키·기존 구매 권리는 지우지 않는다.
 * - 회당 상담(생성 모델을 부르는 카드)은 여기에 넣지 않는다.
 */
export const SAJU_BUNDLE_FEATURE_KEY = "saju_lifetime_bundle";
export const SAJU_BUNDLE_PRODUCT_ID = "unlock.saju_lifetime_bundle";
export const SAJU_BUNDLE_LABEL = "사주 전체 풀이 평생 소장";

/** 묶음 행으로도 열리는 출생 기반 키. 전부 isBirthScopedUnlockFeatureKey 이다. */
export const SAJU_BUNDLE_ALIAS_MEMBER_KEYS = Object.freeze([
  "section_summary",
  "section_daewun",
  "section_compat",
  "rpt_quantumCard",
  "rpt_specialCharmCard",
  "rpt_skillTreeCard",
  "rpt_healthReportCard",
  "rpt_energyCoordCard",
  "rpt_villainCard",
  "rpt_secretHouseEntryCard",
  "animal-destiny-unlock",
  "saju-career-style",
]);

/**
 * 신규 개별 판매·이용권·서비스 팩만 닫는 키. 포함 키 뒤의 6개는 묶음 별칭 밖이다.
 * 마지막 옛 키 4개의 읽기는 기존 별칭이 처리한다. tetogen_deep_report, fun.quantumLotto.ritualReport 는 출생 기반이 아니라 별칭이 없다.
 */
export const SAJU_BUNDLE_SALE_CLOSED_KEYS = Object.freeze([
  ...SAJU_BUNDLE_ALIAS_MEMBER_KEYS,
  "tetogen_deep_report",
  "fun.quantumLotto.ritualReport",
  "travelDestiny",
  "healthReport",
  "rpgCharacter",
  "secretHouseEpisodes",
]);

const ALIAS_MEMBER_SET = new Set(SAJU_BUNDLE_ALIAS_MEMBER_KEYS);
const SALE_CLOSED_SET = new Set(SAJU_BUNDLE_SALE_CLOSED_KEYS);

export function isSajuBundleAliasMember(featureKey) {
  const key = normalizePaidFeatureKey(featureKey);
  return Boolean(key) && ALIAS_MEMBER_SET.has(key);
}

export function isSajuBundleSaleClosed(featureKey) {
  const key = normalizePaidFeatureKey(featureKey);
  return Boolean(key) && SALE_CLOSED_SET.has(key);
}
