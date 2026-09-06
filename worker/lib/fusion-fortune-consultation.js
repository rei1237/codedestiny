// 초융합 상담 보관본 — 저장·조회.
//
// 왜 있는가: 초융합은 3만원짜리 단발 리딩인데 결과가 어디에도 남지 않아 새로고침 한 번에
// 사라졌다. 여기서 완성된 결과만 보관해 재열람과 PDF 를 가능하게 한다.
//
// 🔴 이 모듈은 결제를 판정하지 않는다. 저장은 이미 결제·검증이 끝난 결과에만 일어나고,
//    조회는 userId 가 일치하는 본인 결과만 돌려준다(재열람에 추가 결제 없음).
//
// 🔴 프라이버시 경계: 생년월일·생시·출생지 좌표·고민 원문은 저장하지 않는다.
//    목록에서 구분할 최소 정보(주제·닉네임·생시 아는지 여부)와 결과 본문만 남긴다.

import { FusionFortuneConsultation } from "./models.js";
import { countFusionFortuneVisibleText } from "./fusion-fortune.js";

// mongoose Mixed 필드는 상한이 없어 16MB 문서 한계까지 들어간다. 인생의 책이 본문에
// 200,000자 상한을 둔 것과 같은 이유로, 비정상적으로 커진 결과는 저장하지 않는다.
// (저장 실패가 배달을 막지 않는다 — 호출자가 삼킨다.)
export const FUSION_CONSULTATION_MAX_RESULT_CHARS = 200000;

function text(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

function newConsultationId() {
  return globalThis.crypto?.randomUUID?.()
    || `fusion-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 보관본 문서를 만든다. DB 를 건드리지 않는 순수 함수 — 프라이버시 경계와 상한을
 * 여기서 확인하므로 테스트가 DB 없이 계약 전체를 검증할 수 있다.
 *
 * @returns {{ ok: true, doc: object } | { ok: false, reason: string }}
 */
export function buildFusionConsultationDoc({ requestId, userId, input = {}, result, generationSource = "", llmMeta = null, qualityTier = "", qualityNotice = "", stage = 2 } = {}) {
  if (!text(userId, 120)) return { ok: false, reason: "missing_user" };
  if (!text(requestId, 180)) return { ok: false, reason: "missing_request_id" };
  if (!result || typeof result !== "object" || Array.isArray(result)) return { ok: false, reason: "missing_result" };

  let serialized = "";
  try {
    serialized = JSON.stringify(result);
  } catch {
    return { ok: false, reason: "unserializable_result" };
  }
  if (!serialized || serialized.length > FUSION_CONSULTATION_MAX_RESULT_CHARS) {
    return { ok: false, reason: "result_too_large" };
  }

  return {
    ok: true,
    doc: {
      id: newConsultationId(),
      userId: text(userId, 120),
      idempotencyKey: text(requestId, 180),
      title: text(result.title, 200),
      inputSummary: {
        topic: text(input.topic, 80),
        calendarType: text(input.calendarType, 10) === "lunar" ? "lunar" : "solar",
        gender: ["female", "male", "unspecified"].includes(text(input.gender, 20)) ? text(input.gender, 20) : "unspecified",
        nickname: text(input.nickname, 40),
        birthTimeKnown: input.birthTimeUnknown !== true && Boolean(text(input.birthTime, 5)),
        birthPlaceKnown: Boolean(input.birthPlace && typeof input.birthPlace === "object"),
      },
      result,
      // 🔴 이름 그대로 **화면에 보이는 글자 수**다. 옛 값은 JSON 직렬화 길이(serialized.length)라
      //    키·따옴표·이스케이프까지 세어 실제보다 컸고(2026-09-06 실측: 36,690자 결과가 39,325자,
      //    +7%), 그래서 클라이언트가 이 값을 못 쓰고 따로 셌다(app/fusion-fortune/_lib/reading.ts).
      //    서버·클라이언트가 같은 셈법(countFusionFortuneVisibleText)을 보게 맞춘다.
      // 🔴 문서 크기 상한은 별개 축이라 그대로 serialized.length 로 판정한다(위 result_too_large) —
      //    16MB 문서 한계를 막는 것은 직렬화 크기이지 화면 글자 수가 아니다.
      visibleTextLength: countFusionFortuneVisibleText(result),
      generationSource: text(generationSource, 40),
      // 강등 배달이면 그 사실이 재열람·PDF 에도 따라가야 한다. 화면에서만 알리면
      // 다시 열었을 때 "왜 짧지?"에 답할 근거가 사라진다.
      qualityTier: text(qualityTier, 20) || "full",
      qualityNotice: text(qualityNotice, 300),
      // 2단계 생성: 1단계(여섯 체계 섹션)만 저장된 문서는 partial 이다. 목록에는 나오지 않고
      // requestId 조회로만 되찾아 2단계를 이어 간다. 2단계 저장이 같은 문서를 completed 로 덮는다.
      // 옛 보관본(stage 필드 없음)은 응답 기본값이 completed/2 로 읽는다.
      status: Number(stage) === 1 ? "partial" : "completed",
      stage: Number(stage) === 1 ? 1 : 2,
      llmMeta: llmMeta && typeof llmMeta === "object" ? llmMeta : null,
    },
  };
}

/**
 * 보관본 저장(멱등). 같은 requestId 재시도는 같은 문서를 갱신한다 —
 * 결제 1회당 보관본 1개라는 불변식이 여기서 지켜진다.
 *
 * @returns 저장된 문서의 id. 저장하지 않았으면 "".
 */
export async function saveFusionFortuneConsultation(payload) {
  const built = buildFusionConsultationDoc(payload);
  if (!built.ok) {
    console.warn("[fusion-fortune-consultation-skipped]", { reason: built.reason });
    return "";
  }
  const { id, userId, idempotencyKey, ...rest } = built.doc;
  const saved = await FusionFortuneConsultation.findOneAndUpdate(
    { userId, idempotencyKey },
    { $set: rest, $setOnInsert: { id, userId, idempotencyKey } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  return text(saved?.id, 120) || id;
}

/** 단건 조회 — 본인 결과만. 없으면 null. */
export async function getFusionFortuneConsultation({ userId, id } = {}) {
  if (!text(userId, 120) || !text(id, 120)) return null;
  return FusionFortuneConsultation.findOne({ userId: text(userId, 120), id: text(id, 120) }).lean();
}

/**
 * requestId(= 결제 증빙 키)로 단건 조회 — 본인 결과만. 없으면 null.
 *
 * 🔴 이것이 회수 앵커다. 저장은 배달보다 **먼저** 일어나므로(routes/fusion-fortune.js 의
 *    onDelivery), result SSE 가 나가기 직전에 연결이 끊겨도 결과는 이미 남아 있다.
 *    클라이언트는 실패 UI 를 띄우기 전에 이 키로 한 번 되찾아 본다.
 *    userId+idempotencyKey 에는 unique 인덱스가 있다
 *    (scripts/migrations/20260812-add-fusion-fortune-consultation-indexes.mjs).
 */
export async function getFusionFortuneConsultationByRequestId({ userId, requestId } = {}) {
  if (!text(userId, 120) || !text(requestId, 180)) return null;
  return FusionFortuneConsultation.findOne({ userId: text(userId, 120), idempotencyKey: text(requestId, 180) }).lean();
}

/** 최근 목록 — 본문(result)은 제외한다. 목록 응답에 2만자를 실을 이유가 없다. */
export async function listFusionFortuneConsultations({ userId, limit = 10 } = {}) {
  if (!text(userId, 120)) return [];
  const size = Math.min(Math.max(Number(limit) || 10, 1), 20);
  return FusionFortuneConsultation.find({ userId: text(userId, 120), status: "completed" })
    .select("id title inputSummary generationSource qualityTier createdAt")
    .sort({ createdAt: -1 })
    .limit(size)
    .lean();
}
