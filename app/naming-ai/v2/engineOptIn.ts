// 🔴 v2 입력은 Phase 6(스테이징 검증·운영 승격 승인) 전까지 opt-in 일 때만 보인다 — main 은 누구의 운영 승격에도 실리므로
// 기본값은 숨김(fail-closed). 스테이징 검증: /naming-ai/?naming_engine=v2 (같은 탭 세션 동안 유지, ?naming_engine=v1 로 해제).
const NAMING_ENGINE_OPT_IN_PARAM = "naming_engine";
const NAMING_ENGINE_OPT_IN_KEY = "cd_naming_engine_v2";

export function readNamingEngineOptIn(): boolean {
  if (typeof window === "undefined") return false;
  let param: string | null = null;
  try {
    param = new URLSearchParams(window.location.search).get(NAMING_ENGINE_OPT_IN_PARAM);
  } catch {
    return false;
  }
  try {
    if (param === "v2") window.sessionStorage.setItem(NAMING_ENGINE_OPT_IN_KEY, "1");
    else if (param === "v1") window.sessionStorage.removeItem(NAMING_ENGINE_OPT_IN_KEY);
    return param === "v2" || window.sessionStorage.getItem(NAMING_ENGINE_OPT_IN_KEY) === "1";
  } catch {
    return param === "v2";
  }
}
