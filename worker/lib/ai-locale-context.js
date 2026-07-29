/**
 * 요청 스코프 AI 출력 로케일.
 *
 * 왜 AsyncLocalStorage 인가: 인자로 넘기면 callGeminiText 38개 호출부 + 중간 헬퍼
 * (structured-consultation.callGeminiJsonWithRetry, gemini.callGeminiText, 라우트별
 * build*Prompt) 시그니처를 전부 고쳐야 한다. 여기 한 파일이면 끝난다.
 *
 * 🔴 우선순위는 항상 "명시값 > 앰비언트"다. llm-client 가 request.locale 을 먼저 보고,
 *    없을 때만 이 컨텍스트를 읽는다. 그래야 (a) 관리자 재생성 같은 오버라이드가 가능하고
 *    (b) 컨텍스트가 없는 cron 태스크가 자연히 ko 로 떨어져 fail-safe 다.
 *
 * nodejs_compat 플래그는 worker/wrangler.toml 에 이미 켜져 있다.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { AI_LOCALE_HEADER, toAiLocale } from "../../lib/i18n/ai-locale.js";
import { cookieValue } from "./http.js";

const localeStore = new AsyncLocalStorage();

/** fn 실행 동안 locale 을 앰비언트로 노출한다. */
export function runWithAiLocale(locale, fn) {
  return localeStore.run({ locale }, fn);
}

/** 컨텍스트 밖이면 빈 문자열 — 호출자가 자기 폴백을 쓰게 둔다. */
export function getAmbientAiLocale() {
  const store = localeStore.getStore();
  return store && store.locale ? store.locale : "";
}

/**
 * 헤더 → cd_locale 쿠키 → Accept-Language 순.
 *
 * 쿠키를 정본으로 쓰지 않는 이유: cd_locale 은 domain= 없이 설정되는 host-only 쿠키라
 * Capacitor 앱(https://localhost 출처)에서는 cross-site 로 분류돼 전송되지 않는다.
 * Accept-Language 도 정본이 아니다 — OS 선호이지 사용자가 고른 사이트 언어가 아니라서,
 * 한국어 OS 로 /en 을 보는 사용자에게 ko 를 돌려주게 된다. 둘 다 최후 폴백으로만 쓴다.
 */
export function resolveAiLocaleFromRequest(request) {
  if (!request || !request.headers) return toAiLocale("");

  const header = request.headers.get(AI_LOCALE_HEADER);
  if (header) return toAiLocale(header);

  try {
    const cookie = cookieValue(request, "cd_locale");
    if (cookie) return toAiLocale(cookie);
  } catch (e) {
    // 쿠키 파싱 실패는 무시하고 다음 소스로
  }

  const acceptLanguage = request.headers.get("Accept-Language") || "";
  if (acceptLanguage) {
    const first = acceptLanguage.split(",")[0].split(";")[0].trim();
    if (first) return toAiLocale(first);
  }

  return toAiLocale("");
}
