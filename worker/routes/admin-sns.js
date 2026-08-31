// 관리자용 SNS 일일 발행 수동 실행·상태 조회 API.
//
// 왜 있나: 발행 태스크는 하루 한 번 크론(KST 07:00)에서만 돌아, 실패하면 다음 날까지 기다려야
// 재시도할 수 있었고 실패 흔적도 없었다(2026-08-29 크론이 그렇게 조용히 실패했다). 이 모듈은
// 새 배관을 만들지 않는다 — 크론이 부르는 runSnsDailyPostTask 를 그대로 부르고, 잠금·플래그도
// 태스크가 그대로 지킨다(성공한 날은 already_posted, 실패한 날은 failed 문서를 재선점해 재시도).
//
//   POST /api/admin/sns-daily-post/run?channel=all|telegram|threads
//        — 태스크 1회 실행. 🔴 공개 채널에 실제 글이 나간다. 기본값은 all.
//   GET  /api/admin/sns-daily-post/status — 최근 잠금 문서(keyHash/channel/status/responseRef/updatedAt)

import { connectDb, withMongoRetry } from "../lib/db.js";
import { handleRouteError, json, methodNotAllowed, notFound } from "../lib/http.js";
import { IdempotencyKey } from "../lib/models.js";
import { runSnsDailyPostTask } from "../lib/sns-daily-post-task.js";

const SNS_POST_ENDPOINT = "cron:sns-daily-post";
// 채널이 둘이라 하루에 문서가 최대 2건 생긴다 — 14일치를 보려면 28건이다.
const STATUS_LIMIT = 28;
const ALLOWED_CHANNELS = ["all", "telegram", "threads"];

async function handleRun(request, env) {
  const channel = String(new URL(request.url).searchParams.get("channel") || "all").toLowerCase();
  if (!ALLOWED_CHANNELS.includes(channel)) {
    return json({ ok: false, error: "invalid_channel", allowed: ALLOWED_CHANNELS }, { status: 400 });
  }

  try {
    return json(await runSnsDailyPostTask(env, { channel }), { status: 200 });
  } catch (error) {
    // 🔴 태스크는 채널이 하나라도 실패하면 **던진다**(크론 래퍼가 그때만 사람에게 알린다).
    // 여기서는 그 사유를 그대로 502 로 돌려준다 — handleRouteError 로 흘리면 500 + 일반 문구가 되어
    // 어느 채널이 왜 실패했는지가 사라진다.
    return json(
      {
        ok: false,
        channel,
        error: String(error?.message || "sns_daily_post_failed"),
        dateKey: error?.dateKey ?? null,
        channels: error?.channels ?? null,
      },
      { status: 502 },
    );
  }
}

async function handleStatus(env) {
  await connectDb(env);
  const docs = await withMongoRetry(env, () =>
    IdempotencyKey.find({ userId: null, endpoint: SNS_POST_ENDPOINT })
      .sort({ keyHash: -1 })
      .limit(STATUS_LIMIT)
      .select({ keyHash: 1, status: 1, responseRef: 1, updatedAt: 1, createdAt: 1 })
      .lean(),
  );
  return json({
    ok: true,
    endpoint: SNS_POST_ENDPOINT,
    items: docs.map((doc) => {
      const keyHash = String(doc.keyHash || "");
      const [dateKey, suffix] = keyHash.split(":");
      return {
        keyHash,
        dateKey,
        channel: suffix || "telegram",
        status: doc.status,
        responseRef: doc.responseRef ?? null,
        createdAt: doc.createdAt ?? null,
        updatedAt: doc.updatedAt ?? null,
      };
    }),
  });
}

export async function handleAdminSnsRoutes(path, request, env) {
  try {
    const method = request.method.toUpperCase();

    if (path === "/run") {
      if (method === "POST") return await handleRun(request, env);
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
