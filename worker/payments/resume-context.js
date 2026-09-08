import { encryptResumePayload, decryptResumePayload } from "../lib/pii-crypto.js";
import { paymentError } from "./errors.js";

export const RESUME_PENDING_TTL_MS = 30 * 60 * 1000;
export const RESUME_APPROVED_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CONTEXT_BYTES = 256 * 1024;
const PAID_STATUSES = new Set(["paid", "success", "fulfilled"]);

function resumeBinding(userId, requestId, featureKey) {
  return `${String(userId || "").trim()}:${String(requestId || "").trim()}:${String(featureKey || "").trim()}`;
}

function assertResumeOrderBinding(order, stored) {
  const pass = order.paymentType === "membership_pass";
  const requestId = String(pass ? order.idempotencyKey || "" : order.requestId || "").trim();
  // 이용권 재구매는 기존 키 뒤에 주문 세대를 붙인다. 암호문은 최초 준비 의도에 묶여 있다.
  const requestIds = pass ? [requestId, requestId.replace(/#(?:[1-9]\d*|x[0-9a-f]{12})$/, "")] : [requestId];
  const featureKey = pass ? order.productId : order.featureKey;
  if (!order.userId || !featureKey || !requestIds.some(id => stored.binding === resumeBinding(order.userId, id, featureKey))) {
    throw paymentError("INVALID_REQUEST", "복구 입력이 주문과 일치하지 않습니다.");
  }
}

export function validateResumeContext(input) {
  if (!input) return null; // 배포 중 이전 클라이언트와 이미 시작한 주문 호환
  const descriptor = input.resume;
  const path = String(input.originPath || "");
  if (!descriptor || !/^[a-zA-Z0-9_.:-]{1,160}$/.test(String(descriptor.kind || ""))
      || !path.startsWith("/") || path.startsWith("//") || /[\\\u0000-\u001f]/.test(path)
      || path.length > 2048) {
    throw paymentError("INVALID_REQUEST", "결제 전 화면을 복구할 수 없습니다. 입력을 확인하고 다시 시도해 주세요.");
  }
  const action = String(descriptor.action || "");
  if (action && !/^[a-zA-Z0-9_.:-]{1,160}$/.test(action)) throw paymentError("INVALID_REQUEST", "복구 동작이 올바르지 않습니다.");
  const args = descriptor.args || {};
  if (Array.isArray(args) || typeof args !== "object" || Object.keys(args).length > 100) throw paymentError("INVALID_REQUEST", "복구 입력이 올바르지 않습니다.");
  const cleanArgs = Object.create(null);
  for (const [key, value] of Object.entries(args)) {
    if (["__proto__", "constructor", "prototype"].includes(key)
        || !/^[a-zA-Z0-9_-]{1,100}$/.test(key)
        || !(value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)))) {
      throw paymentError("INVALID_REQUEST", "복구 입력 형식이 올바르지 않습니다.");
    }
    cleanArgs[key] = value;
  }
  const gate = {};
  const gateKeys = ['featureKey', 'productId', 'categoryKey', 'subFeatureKey', 'contentKey', 'profileId', 'selectedProfileId', 'requestId', 'reason', 'coinPrice', 'cost', 'mode', 'reportMode', 'reportType'];
  for (const key of gateKeys) {
    const value = input.gate?.[key];
    if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) gate[key] = value;
  }
  const context = { version: 1, originPath: path, resume: { kind: descriptor.kind, action, args: cleanArgs }, gate };
  if (new TextEncoder().encode(JSON.stringify(context)).byteLength > MAX_CONTEXT_BYTES) {
    throw paymentError("INVALID_REQUEST", "복구할 입력이 너무 큽니다. 결제 전에 입력을 확인해 주세요.");
  }
  return context;
}

/** 기존 주문 문서에 결제 전에 함께 저장한다. 저장 실패면 PG를 열지 않는다. */
export async function prepareResumeContext(input, { userId, requestId, featureKey, env, now = Date.now() }) {
  const context = validateResumeContext(input);
  if (!context) return null;
  const binding = resumeBinding(userId, requestId, featureKey);
  return {
    version: 1,
    binding,
    createdAt: new Date(now),
    // 원래 path도 질문 등이 포함될 수 있어 암호문 안에만 저장한다.
    payload: await encryptResumePayload(context, binding, env),
    status: "prepared",
  };
}

/** 소유자 검사는 라우트에서 먼저 수행한다. 이 응답은 권한 부여가 아니다. */
export async function readOrderResumeContext(order, env, now = Date.now()) {
  const stored = order?.metadata?.paidResume;
  if (!stored?.payload) return null;
  const paid = PAID_STATUSES.has(order.status);
  const started = new Date(stored.createdAt).getTime();
  const age = now - started;
  if (!Number.isFinite(age) || age < 0 || age > (paid ? RESUME_APPROVED_TTL_MS : RESUME_PENDING_TTL_MS)) return null;
  if (["cancelled", "refunded", "failed"].includes(order.status)) return null;
  assertResumeOrderBinding(order, stored);
  const context = validateResumeContext(await decryptResumePayload(stored.payload, stored.binding, env));
  return {
    ...context,
    resumeId: String(order.merchantUid),
    paymentStatus: String(order.status),
    resumeStatus: stored.status,
    at: started,
    merchantUid: String(order.merchantUid),
    paymentMethod: String(order.paymentMethod || ""),
    confirmBody: {
      merchantUid: String(order.merchantUid),
      featureKey: String(order.featureKey || ""),
      productId: String(order.productId || ""),
      requestId: String(order.requestId || ""),
      profileId: String(order.pricingSnapshot?.profileId || ""),
      contentKey: String(order.pricingSnapshot?.contentKey || ""),
      paymentMethod: String(order.paymentMethod || ""),
    },
  };
}
