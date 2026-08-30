// 관리자용 SNS 일일 발행 수동 실행·상태 조회 API.
//
// 왜 있나: 발행 태스크는 하루 한 번 크론(KST 07:00)에서만 돌아, 실패하면 다음 날까지 기다려야
// 재시도할 수 있었고 실패 흔적도 없었다(2026-08-29 크론이 그렇게 조용히 실패했다). 이 모듈은
// 새 배관을 만들지 않는다 — 크론이 부르는 runSnsDailyPostTask 를 그대로 부르고, 잠금·플래그도
// 태스크가 그대로 지킨다(성공한 날은 already_posted, 실패한 날은 failed 문서를 재선점해 재시도).
//
//   POST /api/admin/sns-daily-post/run    — 태스크 1회 실행. 🔴 공개 채널에 실제 글이 나간다.
//   GET  /api/admin/sns-daily-post/status — 최근 14일의 잠금 문서(keyHash/status/responseRef/updatedAt)

import { connectDb, withMongoRetry } from "../lib/db.js";
import { handleRouteError, json, methodNotAllowed, notFound } from "../lib/http.js";
import { IdempotencyKey } from "../lib/models.js";
import { runSnsDailyPostTask } from "../lib/sns-daily-post-task.js";

const SNS_POST_ENDPOINT = "cron:sns-daily-post";
const STATUS_LIMIT = 14;

async function handleRun(env) {
  const result = await runSnsDailyPostTask(env);
  return json(result, { status: result.ok ? 200 : 502 });
}

async function handleStatus(env) {
  await connectDb(env);
  const docs = await withMongoRetry(() =>
    IdempotencyKey.find({ userId: null, endpoint: SNS_POST_ENDPOINT })
      .sort({ keyHash: -1 })
      .limit(STATUS_LIMIT)
      .select({ keyHash: 1, status: 1, responseRef: 1, updatedAt: 1, createdAt: 1 })
      .lean(),
  );
  return json({
    ok: true,
    endpoint: SNS_POST_ENDPOINT,
    items: docs.map((doc) => ({
      dateKey: doc.keyHash,
      status: doc.status,
      responseRef: doc.responseRef ?? null,
      createdAt: doc.createdAt ?? null,
      updatedAt: doc.updatedAt ?? null,
    })),
  });
}

export async function handleAdminSnsRoutes(path, request, env) {
  try {
    const method = request.method.toUpperCase();

    if (path === "/run") {
      if (method === "POST") return await handleRun(env);
      return methodNotAllowed();
    }

    if (path === "/status") {
      if (method === "GET") return await handleStatus(env);
      return methodNotAllowed();
    }

    return notFound();
  } catch (error) {
    return handleRouteError(error, {
      request,
      env,
      trace: { route: "api/admin/sns-daily-post", method: request.method },
    });
  }
}
