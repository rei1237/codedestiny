/**
 * 한국 음양력·간지 코어 — 공개 표면. **여기만 import 한다.**
 *
 * ── 왜 있는가 ───────────────────────────────────────────────────────────────
 * `lunar-javascript`(1.7.7)는 **중국 표준시(CST, UTC+8) 기준 중국 음력**을 구현한다.
 * 이 서비스는 한국(KST, UTC+9)용이다. 삭(新月) 순간이 CST 23시대에 들면 KST 로는 다음 날이라
 * 그 음력 달 전체(약 29.5일)의 음력일이 하루 밀린다.
 *
 * 실측(2026-08-27, 1930~2030): 삭 1,249회 중 42회(3.4%)가 갈리고, 일자 전수로는
 * 36,890일 중 1,378일(3.74%)이 다르다. 자미두수는 음력일로 자미성을 잡으므로
 * **하루가 밀리면 명반 14주성이 통째로 이동한다.**
 *
 * 대표 사례: 1997년 2월 삭 = 1997-02-07 15:06:44 UTC
 *   → CST 02-07 23:06 (중국 설날 2/7) → 1997-02-10 = 음력 1/4  ← lunar-javascript
 *   → KST 02-08 00:06 (한국 설날 2/8) → 1997-02-10 = 음력 1/3  ← KASI, 그리고 이 코어
 * 이 값은 예전에 `KASI_LOCAL_PATCH_SEED` 라는 **하루짜리 하드코딩**으로 덮여 있었다.
 * 이 코어는 그 날짜를 특별 취급하지 않는다 — 규칙만으로 같은 답이 나온다.
 *
 * ── 구조 ────────────────────────────────────────────────────────────────────
 *   ephemeris.js        astronomy-engine 실계산. 🔴 빌드타임 전용. 여기서 import 하지 않는다.
 *   table.generated.js  그 계산의 산출물. scripts/build-korean-calendar-table.mjs 가 만든다.
 *   core.js             표 조회(음력·절기).
 *   ganji.js            세차·월건·일진·시주.
 *   labels.js           인덱스 → 한자/한글. 표기 축의 유일한 경계.
 *   policy.js           야자시 정책.
 *
 * 🔴 모든 반환값은 **인덱스**다. 문자열이 필요하면 `formatPillar(…, "hanja"|"hangul")` 을 쓴다.
 * 🔴 시간 기준은 KST 고정이다. 타임존 인자를 받지 않는다.
 */
export {
  solarToLunar,
  lunarToSolar,
  solarTerms,
  nodeTerms,
  enclosingNodeTerm,
  solarDayIndex,
  solarFromDayIndex,
  supportedRange,
  MIDNIGHT_RISKS,
  TABLE_FINGERPRINT,
  TABLE_META,
} from "./core.js";

export { ganji, sexagenaryYearIndexes } from "./ganji.js";

/** 대운. 🔴 lunar-javascript 관례를 그대로 재현한 것이다 — daeun.js 머리말을 읽을 것. */
export { daeun, daeunFromFrame } from "./daeun.js";

export {
  BRANCH_HANGUL,
  BRANCH_HANJA,
  STEM_HANGUL,
  STEM_HANJA,
  TERM_NAME_HANJA,
  TERM_NAME_KO,
  branchIndexOf,
  formatPillar,
  stemIndexOf,
} from "./labels.js";

export { DEFAULT_NIGHT_ZI_POLICY, NIGHT_ZI_POLICY } from "./policy.js";
