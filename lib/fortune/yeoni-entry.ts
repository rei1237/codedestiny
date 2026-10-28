/** UI entry only. Stored IDs, payment keys and service ownership stay unchanged. */
export const YEONI_TEA_HOUSE = "/fortune-tea-house/";
export const YEONI_LETTER = `${YEONI_TEA_HOUSE}?counsel=letter`;

export function teaHouseSurface(params: Pick<URLSearchParams, "get">, legacyChat = false) {
  // A saved tea result must never become a new chat, even with stale UI params.
  if (params.get("resultId")) return "saved-tea";
  if (legacyChat || params.get("consultation") || params.get("session") || params.get("counsel") === "letter") return "chat";
  return "tea";
}
