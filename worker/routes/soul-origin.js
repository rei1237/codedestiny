import { json, methodNotAllowed } from "../lib/http.js";

const REMOVED_RESPONSE = Object.freeze({
  ok: false,
  code: "SOUL_ORIGIN_PDF_REMOVED",
  message: "운명의 업은 운명의 업 AI 상담으로 전환되었습니다.",
  next: "/karma-destiny-ai",
  supported: [
    "/api/karma-destiny-ai/ensure-access",
    "/api/karma-destiny-ai/start",
    "/api/karma-destiny-ai/message",
  ],
});

export async function handleSoulOriginRoutes(request) {
  const method = request.method.toUpperCase();
  if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return json(REMOVED_RESPONSE, { status: 410 });
  }
  return methodNotAllowed();
}
