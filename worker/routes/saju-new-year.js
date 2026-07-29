import { getRoutePath, json, methodNotAllowed } from "../lib/http.js";

export async function handleSajuNewYearRoutes(request) {
  const method = request.method.toUpperCase();
  if (!["GET", "POST"].includes(method)) return methodNotAllowed();
  return json({
    ok: false,
    code: "NEW_YEAR_AI_REPLACED",
    route: "/api/new-year-ai",
    message: "신년운세는 신년운세 전문가 상담으로 새롭게 제공됩니다.",
    path: getRoutePath(request, "/api/saju-new-year"),
  }, { status: 410 });
}

export const __sajuNewYearTestUtils = {};
