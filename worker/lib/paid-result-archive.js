// 브라우저가 계산하는 유료 결과(숙요 궁합·본성 심화·극T·점성술 궁합·자미두수 궁합)의 보관함 저장 공용부.
//
// 결제 확인은 각 라우트가 한다(worker/routes/sukuyo-archive.js · compat-result-archive.js) — 회당 결제
// 증빙 reader 를 부르는 라우트는 per-use-proof-roundtrip 가드가 소스에서 기능키를 읽어 검사하므로,
// 그 호출을 여기로 옮기지 않는다. 이 파일은 입력 정제와 ServiceExecutionTransaction upsert 만 맡는다
// (인연 레이더 writeSukuyoPastLifeArchive 와 같은 저장 모양 — 보관함 /api/records 가 metadata.archive 를 읽는다).
//
// 🔴 HTML 은 받지 않는다. 문자열에 '<' 가 있으면 거절한다.
import { createHash } from "node:crypto";
import { json } from "./http.js";
import { withMongoRetry } from "./db.js";
import { ProfileCard, ServiceExecutionTransaction } from "./models.js";
import { computeBirthKey } from "./birth-key.js";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_SECTIONS = 40;
const MAX_SECTION_TITLE = 120;
const MAX_SECTION_BODY = 4000;
export const MAX_FACT_TEXT = 200;

export function archiveFailure(status, code, message) {
  return json({ ok: false, error: { code, message } }, { status });
}

export function archiveText(value, max) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function hasArchiveMarkup(value, depth = 0) {
  if (depth > 4) return false;
  if (typeof value === "string") return value.includes("<");
  if (Array.isArray(value)) return value.some((entry) => hasArchiveMarkup(entry, depth + 1));
  if (value && typeof value === "object") return Object.values(value).some((entry) => hasArchiveMarkup(entry, depth + 1));
  return false;
}

/** 화면 사실표(SavedFacts)가 읽는 이름만 남긴다 — 그 밖의 키는 버린다. */
export function normalizeArchiveFacts(raw, { textKeys = [], numberKeys = [] } = {}) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const facts = {};
  for (const key of textKeys) {
    const value = archiveText(source[key], MAX_FACT_TEXT);
    if (value) facts[key] = value;
  }
  for (const key of numberKeys) {
    if (source[key] === null || source[key] === undefined || source[key] === "") continue;
    const value = Number(source[key]);
    if (Number.isFinite(value)) facts[key] = Math.round(value * 100) / 100;
  }
  return facts;
}

export function normalizeArchivePartner(raw, keys) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const partner = {};
  for (const key of keys) {
    const value = archiveText(source[key], 40);
    if (value) partner[key] = value;
  }
  return partner;
}

export function normalizeArchiveSections(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_SECTIONS).map((entry) => {
    const row = entry && typeof entry === "object" ? entry : {};
    const title = archiveText(row.title, MAX_SECTION_TITLE);
    // 본문은 줄바꿈을 살린다(읽기 화면이 문단으로 나눈다).
    const body = typeof row.body === "string" ? row.body.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_SECTION_BODY) : "";
    return body ? { title: title || "상세 해석", body } : null;
  }).filter(Boolean);
}

export function archiveSignature(value) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex").slice(0, 24);
}

export async function readArchiveJson(request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return { tooLarge: true };
  if (!raw.trim()) return { body: {} };
  try {
    const body = JSON.parse(raw);
    return { body: body && typeof body === "object" && !Array.isArray(body) ? body : {} };
  } catch {
    return { invalid: true };
  }
}

/** 결제에 쓴 카드의 이름·출생 키 스냅샷. 카드가 지워져도 기록은 남는다. */
export async function readArchiveCard(env, userId, profileId) {
  if (!profileId) return { cardName: "", birthKey: "" };
  const card = await withMongoRetry(env, () => ProfileCard.findOne({ userId, profileId }).lean());
  return { cardName: archiveText(card?.name || card?.nickname, 60), birthKey: card ? computeBirthKey(card) : "" };
}

/**
 * 결과 1건 upsert. executionKey 가 같으면 갱신된다(중복 기록 없음).
 * requestId·transactionId 는 환불 판정(isStoredPaidResultRevoked)이 결제 기록을 되짚는 값이다.
 */
export async function upsertPaidResultArchive(env, {
  userId, executionKey, featureKey, reportType, reportId, requestId, transactionId = "",
  profileId = "", metadata = {}, archive,
}) {
  const now = new Date();
  const rid = String(requestId || "").slice(0, 120);
  const txId = archiveText(transactionId, 120);
  const doc = await withMongoRetry(env, () => ServiceExecutionTransaction.findOneAndUpdate(
    { userId, executionKey },
    {
      $setOnInsert: {
        userId,
        executionKey,
        featureKey,
        timeoutAt: now,
        nextRetryAt: now,
        retentionUntil: null,
      },
      $set: {
        reportType,
        reportId,
        sessionId: rid,
        idempotencyKey: rid,
        paymentId: txId,
        profileId,
        status: "success",
        premiumStatus: "completed",
        completedAt: now,
        generationStartedAt: now,
        generationCompletedAt: now,
        coinTransactionId: txId,
        sourceTransactionId: txId,
        metadata: { ...metadata, featureKey, reportType, requestId: rid, profileId, archive },
      },
    },
    { upsert: true, returnDocument: "after" },
  ).lean());
  return doc;
}
