// v2 가 기본 화면이다(2026-10-05 사용자 지시로 opt-in 해제). 기존 화면 확인: /naming-ai/?naming_engine=v1
// (같은 탭 세션 동안 유지, ?naming_engine=v2 로 해제). 이미 받은 결과는 결과의 engine 필드가 화면을 정한다.
const NAMING_ENGINE_PARAM = "naming_engine";
const NAMING_ENGINE_OPT_OUT_KEY = "cd_naming_engine_v1";

export function readNamingEngineOptIn(): boolean {
  if (typeof window === "undefined") return true;
  let param: string | null = null;
  try {
    param = new URLSearchParams(window.location.search).get(NAMING_ENGINE_PARAM);
  } catch {
    return true;
  }
  try {
    if (param === "v1") window.sessionStorage.setItem(NAMING_ENGINE_OPT_OUT_KEY, "1");
    else if (param === "v2") window.sessionStorage.removeItem(NAMING_ENGINE_OPT_OUT_KEY);
    return param !== "v1" && window.sessionStorage.getItem(NAMING_ENGINE_OPT_OUT_KEY) !== "1";
  } catch {
    return param !== "v1";
  }
}
