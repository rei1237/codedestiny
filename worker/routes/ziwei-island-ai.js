// 2026-10-17 무료 탐험 전환. 이 라우트는 과거 구매 결과의 소유자 재열람만 제공한다.
import { getRoutePath, json, methodNotAllowed, notFound } from "../lib/http.js";
import { getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { connectDb, isTransientMongoError } from "../lib/db.js";
import { ZiweiAiConsultation } from "../lib/models.js";
import { stripEmptyParens } from "../lib/ziwei-hanja.js";
import { getPalaceConfig } from "../lib/island/consult/palace-prompts.js";
import { palaceParts } from "../lib/island/consult/palace-delivery.js";
import { isPaidResultRevoked } from "../lib/paid-result-revocation.js";
const FEATURE_KEY = "ziwei-island-palace-consult";
const MESSAGES = { llmFailed: "기존 상담이 완료되지 않았어요. 저장된 구매 내역을 기준으로 고객지원에 문의해 주세요." };
function clean(value, maxLength = 0) { const text = String(value ?? "").trim(); return maxLength ? text.slice(0, maxLength) : text; }
function loginRequired() { return json({ ok: false, reason: "LOGIN_REQUIRED", message: "기존 상담은 로그인 후 다시 볼 수 있어요." }, { status: 401 }); }
function parseSections(text) {
  const t = clean(text).replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  const s = t.indexOf("{"); const e = t.lastIndexOf("}");
  if (s < 0 || e <= s) return null;
  try { const parsed = JSON.parse(t.slice(s, e + 1)); return parsed && typeof parsed === "object" ? parsed : null; } catch { return null; }
}
function publicConsultation(doc) {
  const assistant = Array.isArray(doc.messages) ? doc.messages.find((m) => m.role === "assistant") : null;
  // 생성 경로는 이미 정화해 저장하지만, 이 변경 이전에 저장된 상담에는 빈 괄호가 남아 있다.
  // 재열람 응답에서도 지워야 과거 상담이 화면에서 깨끗해진다.
  const parsed = assistant ? parseSections(stripEmptyParens(assistant.content)) : null;
  return {
    ok: true,
    sessionId: clean(doc.id),
    resultId: clean(doc.id),
    status: clean(doc.status),
    retryable: false,
    consultation: {
      id: clean(doc.id),
      accessType: clean(doc.accessType),
      status: clean(doc.status),
      saved: doc.status === "completed",
      completedParts: Object.keys(doc.llmMeta?.parts || {}),
      totalParts: palaceParts(doc.palaceKey).length,
      palaceKey: clean(doc.palaceKey, 20),
      palaceTitle: clean(getPalaceConfig(doc.palaceKey)?.title, 40),
      sectionKeys: Array.isArray(doc.sectionKeys) ? doc.sectionKeys : [],
      birthInfo: doc.birthInfo || {},
      topic: clean(doc.topic),
      userQuestion: clean(doc.userQuestion),
      result: parsed,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    },
  };
}

function revokedResponse() {
  return json({ ok: false, retryable: false, reason: "PAYMENT_REVOKED", message: "취소·환불된 상담은 이어서 생성할 수 없어요." }, { status: 403 });
}
// 같은 요청 키로 다시 결제하면(K → K#1) 결제창만 열고 떠나 만료된 옛 회차는 회수 증거가 아니다(ziwei-ai.js resolveStartAccess 와 같은 판정).
async function revoked(doc) {
  return isPaidResultRevoked(doc.userId, FEATURE_KEY, [doc.idempotencyKey, doc.paymentId, doc.llmMeta?.access?.evidenceId, doc.llmMeta?.access?.purchaseId], { ignoreNeverPaidExpiry: true });
}
async function handleResult(request, env) {
  let auth = null;
  try { auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true }); }
  catch { return json({ ok: false, retryable: true, reason: "DB_DEGRADED", message: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요." }, { status: 503 }); }
  if (!auth) return loginRequired();
  const url = new URL(request.url);
  const sessionId = clean(url.searchParams.get("id") || url.searchParams.get("sessionId"), 120);
  await connectDb(env);
  if (!sessionId && url.searchParams.get("pending") === "1") {
    const stored = await ZiweiAiConsultation.findOne({ userId: clean(auth.userId), serviceType: FEATURE_KEY,
      status: { $in: ["generating", "partial", "delivery_pending"] } }).sort({ createdAt: -1 }).lean();
    if (!stored) return json({ ok: true, consultation: null });
    if (await revoked(stored)) return revokedResponse();
    return json(publicConsultation(stored));
  }
  if (!sessionId) {
    const rows = await ZiweiAiConsultation.find({ userId: clean(auth.userId), serviceType: FEATURE_KEY, status: "completed" })
      // createdAt 정렬은 기존 {userId,createdAt:-1} 인덱스를 그대로 탄다. updatedAt 에는 인덱스가
      // 없어 해당 사용자의 문서를 전부 FETCH 한 뒤 메모리 정렬하므로 아래 select 가 무력화된다.
      .sort({ createdAt: -1 }).limit(10).select("id palaceKey topic birthInfo createdAt updatedAt").lean();
    return json({ ok: true, consultations: rows.map((row) => ({ id: clean(row.id), palaceKey: clean(row.palaceKey, 20), topic: clean(row.topic), name: clean(row.birthInfo?.name, 80), createdAt: row.createdAt, updatedAt: row.updatedAt })) });
  }
  const consultation = await ZiweiAiConsultation.findOne({ id: sessionId, userId: clean(auth.userId), serviceType: FEATURE_KEY }).lean();
  if (!consultation) return notFound();
  if (await revoked(consultation)) return revokedResponse();
  if (["generating", "partial", "delivery_pending"].includes(consultation.status)) return json(publicConsultation(consultation));
  if (consultation.status !== "completed") return json({ ok: false, reason: "GENERATION_FAILED", message: MESSAGES.llmFailed }, { status: 409 });
  return json(publicConsultation(consultation));
}


export async function handleZiweiIslandAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/ziwei-island-ai");
  if (method === "POST" && ["/prepare", "/ensure-access", "/generate", "/start"].includes(path)) {
    return json({ ok: false, retryable: false, reason: "ISLAND_NOW_FREE", url: "/destiny-island.html", message: "운명의 섬이 무료 탐험으로 바뀌었어요. 새 AI 상담 대신 열두 궁의 이야기를 바로 읽어보세요." }, { status: 410 });
  }
  try {
    if (method === "GET" && path === "/result") return await handleResult(request, env);
    return method === "GET" || method === "POST" ? notFound() : methodNotAllowed();
  } catch (error) {
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) return json({ ok: false, retryable: true, reason: "DB_DEGRADED", message: "잠시 후 기존 상담을 다시 불러와 주세요." }, { status: 503 });
    return json({ ok: false, reason: "READ_FAILED", message: "기존 상담을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
