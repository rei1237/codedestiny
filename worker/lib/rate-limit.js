/**
 * 분산 rate limit — Cloudflare Workers 는 KV/Durable Object 바인딩이 없으므로
 * 기존 Mongo `abuse_scores` 컬렉션(kind:"rate_limit")에 원자적 카운트를 저장한다.
 *
 * isolate-local `Map` 은 PoP/isolate 간 공유되지 않아 사실상 우회 가능하지만,
 * 여기서는 단일 원자적 `findOneAndUpdate`($inc)로 전역 카운트를 유지한다.
 *
 * 윈도우: 첫 카운트 시각 기준 고정 윈도우. 만료(expiresAt < now)되면 자동 리셋.
 * TTL 인덱스(expiresAt)가 만료 문서를 정리한다.
 */

import { connectDb } from "./db.js";
import { AbuseScore } from "./models.js";

const RATE_LIMIT_KIND = "rate_limit";

// 만료 시 리셋, 아니면 +1. 원자적 파이프라인 업데이트로 경쟁 상태 없이 증가한다.
export async function incrementRateLimit({ subjectHash, endpoint, windowMs, env }) {
  await connectDb(env);
  const now = new Date();
  const newExpiry = new Date(now.getTime() + windowMs);
  const doc = await AbuseScore.findOneAndUpdate(
    { subjectHash, endpoint, kind: RATE_LIMIT_KIND },
    [
      {
        $set: {
          subjectHash,
          endpoint,
          kind: RATE_LIMIT_KIND,
          // 만료됐거나(=neq 존재) 문서가 없으면 1로 리셋, 아니면 기존 score+1
          score: {
            $cond: [
              { $lt: [{ $ifNull: ["$expiresAt", null] }, now] },
              1,
              { $add: [{ $ifNull: ["$score", 0] }, 1] },
            ],
          },
          expiresAt: {
            $cond: [
              { $lt: [{ $ifNull: ["$expiresAt", null] }, now] },
              newExpiry,
              "$expiresAt",
            ],
          },
          createdAt: { $ifNull: ["$createdAt", now] },
          updatedAt: now,
        },
      },
    ],
    { upsert: true, returnDocument: "after" },
  ).lean();

  const resetAt = doc?.expiresAt ? new Date(doc.expiresAt).getTime() : newExpiry.getTime();
  return {
    count: Number(doc?.score || 0),
    resetAt,
  };
}

// 증가 없이 현재 상태만 조회(비싼 작업 전 조기 차단용).
export async function readRateLimitState({ subjectHash, endpoint, max, env }) {
  await connectDb(env);
  const now = Date.now();
  const doc = await AbuseScore.findOne({ subjectHash, endpoint, kind: RATE_LIMIT_KIND }).lean();
  if (!doc || !doc.expiresAt || new Date(doc.expiresAt).getTime() <= now) {
    return { limited: false, count: 0, retryAfterSeconds: 0, resetAt: now + 1 };
  }
  const count = Number(doc.score || 0);
  const resetAt = new Date(doc.expiresAt).getTime();
  return {
    limited: count >= max,
    count,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    resetAt,
  };
}

export async function clearRateLimit({ subjectHash, endpoint, env }) {
  await connectDb(env);
  await AbuseScore.deleteOne({ subjectHash, endpoint, kind: RATE_LIMIT_KIND });
}
