/**
 * 로케일 목록과 정규화 — 사전 로딩과 분리된 순수 코어.
 *
 * dictionary.ts 에서 이 두 개만 떼어냈다. 이유는 두 가지다.
 *   1) worker/ 코드가 정규화만 필요한데 dictionary.ts 를 통째로 끌어오면 DOM 코드까지 딸려온다.
 *   2) 이 레포의 Jest 에는 TS 프리셋이 없어서(jest.config.cjs 주석 참고) `.ts` 를 임포트하는
 *      순간 그 체인의 모든 테스트가 파싱 단계에서 깨진다.
 *
 * 🔴 구현은 여기 한 벌뿐이다. dictionary.ts 는 이 파일을 재export 하므로
 *    `import { normalizeLocale } from "./dictionary"` 는 그대로 동작한다.
 */

export const RUNTIME_LOCALES = [
  "ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms",
];

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isRuntimeLocale(value) {
  return RUNTIME_LOCALES.includes(value);
}

/**
 * 쿼리·경로·저장소에서 오는 온갖 표기를 지원 로케일로 정규화한다.
 * @param {string | null | undefined} [value]
 * @returns {string}
 */
export function normalizeLocale(value) {
  const raw = String(value || "").trim();
  if (isRuntimeLocale(raw)) return raw;
  const lower = raw.toLowerCase().replace("_", "-");
  if (lower === "zh" || lower === "zh-cn" || lower === "zh-hans") return "zh-CN";
  if (lower === "zh-tw" || lower === "zh-hant" || lower === "zh-hk" || lower === "zh-mo") return "zh-TW";
  if (lower === "en-us" || lower === "en-gb") return "en";
  if (lower === "ja-jp") return "ja";
  if (lower === "vi-vn") return "vi";
  if (lower === "ko-kr") return "ko";
  return isRuntimeLocale(lower) ? lower : "ko";
}
