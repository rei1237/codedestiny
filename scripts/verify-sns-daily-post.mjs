#!/usr/bin/env node
/**
 * SNS 일일 자동 발행 계약 가드.
 *
 * 🔴 네트워크는 한 번도 타지 않는다. sendTelegramMessage 는 fetchImpl 을 주입받게 열려 있고
 * (정본 패턴: scripts/verify-mindscan-reading.mjs), 이 스크립트는 호출을 세는 스텁만 넣는다.
 * 실제 발행은 되돌릴 수 없는 외부 행위라 검증이 대신 해서는 안 된다.
 *
 * 고정하는 성질:
 *   ① 기본값은 꺼짐이다 — SNS_DAILY_POST_ENABLED 없이는 DB 도 붙지 않고 즉시 반환한다.
 *   ② 자격증명이 없거나 API 가 거절해도 절대 throw 하지 않는다(크론의 나머지 태스크를 지킨다).
 *   ③ 발행 URL 을 로그에 남기지 않는다 — 경로에 봇 토큰이 들어 있다.
 *   ④ 요일 코너의 링크가 전부 sitemap.xml 에 실재한다(404 링크를 발행하지 않는다).
 *   ⑤ 문안이 템플릿으로 조립되고 주입한 시각을 실제로 반영한다.
 *   ⑥ 태스크가 worker/index.js 의 일일 크론 목록에 실제로 배선돼 있다.
 *   ⑦ 배포 스위치(SNS_DAILY_POST_ENABLED)가 두 wrangler 설정에 같은 값으로 있고, 그 값을
 *     isEnabled 가 해석할 수 있다 — 오타는 조용한 꺼짐이 된다.
 *   ⑧ 발행 실패가 DB 에 failed 로 **남는다**(잠금 삭제 금지) — 2026-08-29 크론이 흔적 없이 실패했다.
 *     같은 날 재시도는 재선점(findOneAndUpdate) 하나로만 열고, 그 조건은 buildReclaimFilter 가
 *     만든 **실제 필터 객체**로 검사한다(소스 정규식이 아니다).
 *   ⑨ 관리자 수동 실행·상태 조회(/api/admin/sns-daily-post)가 배선돼 있고 크론과 같은 태스크를 부른다.
 *   ⑩ Threads 체인이 루트 1글 + 오행 짝 답글 5글이고 각 글이 상한 안이며 주입한 시각을 반영한다.
 *   ⑪ Threads 문안이 **평문**이다 — 태그·엔티티가 섞이면 글자 그대로 노출된다.
 *   ⑫ 일진 원천 교차검증 — getTodayPillars 와 역법 코어 ganji() 의 일주가 365일 표본에서 일치한다.
 *   ⑬ Threads 액세스 토큰이 URL 쿼리에 실리지 않고 URL 이 로그에 남지 않는다.
 *   ⑭ 스위치 꺼짐 또는 토큰 부재 → Threads API 로 fetch 0회.
 *   ⑮ 답글 체인이 **직전 발행 글**에 이어 붙고, 글 N개가 요청 2N회다.
 *   ⑯ 채널별 잠금 키가 분리돼 있고, 실패한 채널이 있으면 태스크가 **던진다**(크론 알림이 그때만 뜬다).
 *   ⑰ Threads 스위치·토큰 발급일이 두 wrangler 설정에 같은 값으로 있다.
 *   ⑱ 해시태그가 두 채널 문안에 **살아남는다** — Threads 루트 1개, 텔레그램 고정 3개 + 요일 코너 1개.
 *   ⑲ 실패가 어느 단계에서 났는지가 알림 문구에 남는다(load/connect_db/send).
 *   ⑳ 일간 10개 축이 정본 판정과 일치하고, 10개가 **서로 다른 답**을 받는다(60갑자 전수).
 *   ㉑ AI 문안은 덧칠이다 — 스위치가 꺼지면 모델 호출 0회, 켜져도 실패하면 결정론 문안이 그대로 나간다.
 *   ㉒ 사실에 없는 십성이 섞인 문안은 그 항목만 버려지고, 프롬프트에는 확정된 사실이 박힌다.
 *   ㉓ 발행 표식(responseRef.sendStartedAt)이 send() **앞에서** 굳고, 표식 실패는 발행을 건너뛴다.
 *     같은 날 회수 창(10분 크론)은 UTC 22:10~22:59 로 닫혀 있다.
 *
 * 실행: npm run verify:sns-daily-post
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// getEnv 는 env 객체에 없으면 process.env 로 폴백한다. 개발 머신의 .env 가 로드돼 있으면
// "자격증명 없음" 경로를 못 밟으므로 이 프로세스 안에서만 걷어낸다.
for (const key of [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "SNS_DAILY_POST_ENABLED",
  "SNS_THREADS_POST_ENABLED",
  "SNS_THREADS_AI_ENABLED",
  "THREADS_ACCESS_TOKEN",
  "THREAD_ACCESS_TOKEN",
  "THREADS_TOKEN_ISSUED_AT",
]) {
  delete process.env[key];
}

const { sendTelegramMessage, escapeTelegramHtml } = await import("../worker/lib/telegram.js");
// 🔴 순환 import(sns-daily-post-task ↔ threads-daily-content)를 **콘텐츠 쪽부터** 들어가 깬다.
// 두 진입 순서 중 위험한 쪽이 이쪽이고, 여기서 TDZ 가 나면 워커 번들에서도 난다.
const { buildThreadsPostChain, buildThreadsDayContext, clampThreadsText, appendRootHashtag } = await import(
  "../worker/lib/threads-daily-content.js"
);
const { DAY_STEM_GROUPS, TEN_GOD_GROUP, buildAllStemGuidance } = await import(
  "../worker/lib/daily-stem-guidance.js"
);
const { buildMyeongriPrompt, findUnsupportedTenGod, isThreadsAiEnabled, writeDailyThreadsCopy } = await import(
  "../worker/lib/threads-ai-writer.js"
);
const { HIDDEN_STEMS, STEM_ELEMENT, tenGodFor } = await import("../worker/lib/life-book-ai-saju.js");
const { TEN_GOD_LINE } = await import("../worker/lib/today-saju-detail.js");
const { postThreadsChain, threadsTextWeight, THREADS_TEXT_LIMIT } = await import("../worker/lib/threads.js");
const {
  buildDailyPostText,
  runSnsDailyPostTask,
  runSnsDailyPostRecovery,
  buildReclaimFilter,
  getThreadsSkipReason,
  DAILY_HASHTAGS,
  THREADS_ROOT_HASHTAG,
  WEEKDAY_PICKS,
} = await import(
  "../worker/lib/sns-daily-post-task.js"
);
const { getKstDateParts, getTodayPillars } = await import("../worker/lib/daily-fortune-task.js");
const { warnThreadsTokenExpiry } = await import("../worker/lib/sns-daily-post-task.js");
const { BRANCH_HANGUL, STEM_HANGUL, ganji } = await import("../lib/korean-calendar/index.js");

const SITE_ENV = { SITE_BASE_URL: "https://code-destiny.com" };

function jsonResponse(body, status = 200) {
  // 🔴 손으로 만든 봉투는 전부 "네트워크 오류"로 접힌다 — 진짜 Response 를 쓴다.
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/* ① 기본값은 꺼짐 — 플래그 없이는 DB 도 안 붙는다 */
{
  let fetchCalls = 0;
  const result = await runSnsDailyPostTask({}, { fetchImpl: () => { fetchCalls += 1; } });
  assert.equal(result.skipped, "disabled", "SNS_DAILY_POST_ENABLED 없이 태스크가 진행됐다");
  assert.equal(fetchCalls, 0, "꺼진 상태에서 네트워크를 탔다");
}

/* ② 자격증명 부재·API 거절·fetch 예외 — 어느 쪽도 throw 하지 않는다 */
{
  const noToken = await sendTelegramMessage({}, { text: "x", fetchImpl: () => { throw new Error("불려선 안 된다"); } });
  assert.equal(noToken.ok, false);
  assert.equal(noToken.error, "missing_bot_token", "토큰 부재 사유가 뭉개졌다");

  const noChat = await sendTelegramMessage(
    { TELEGRAM_BOT_TOKEN: "test-token" },
    { text: "x", fetchImpl: () => { throw new Error("불려선 안 된다"); } },
  );
  assert.equal(noChat.error, "missing_chat_id", "chat id 부재 사유가 뭉개졌다");

  const env = { TELEGRAM_BOT_TOKEN: "test-token", TELEGRAM_CHAT_ID: "-100123" };

  const rejected = await sendTelegramMessage(env, {
    text: "x",
    fetchImpl: async () => jsonResponse({ ok: false, description: "chat not found" }, 400),
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.status, 400);
  assert.equal(rejected.error, "chat not found", "Telegram 이 준 사유를 그대로 전하지 않는다");

  const exploded = await sendTelegramMessage(env, {
    text: "x",
    fetchImpl: async () => { throw new Error("socket hang up"); },
  });
  assert.equal(exploded.ok, false);
  assert.equal(exploded.status, 0);

  // 200 인데 ok:false 인 Telegram 특유의 응답도 실패로 읽어야 한다.
  const softFail = await sendTelegramMessage(env, {
    text: "x",
    fetchImpl: async () => jsonResponse({ ok: false, description: "bot was blocked" }, 200),
  });
  assert.equal(softFail.ok, false, 'HTTP 200 + ok:false 를 성공으로 읽었다');

  let sentBody = null;
  const sent = await sendTelegramMessage(env, {
    text: "안녕 <b>테스트</b>",
    fetchImpl: async (url, init) => {
      sentBody = JSON.parse(init.body);
      return jsonResponse({ ok: true, result: { message_id: 1 } });
    },
  });
  assert.equal(sent.ok, true, "정상 응답을 실패로 읽었다");
  assert.equal(sentBody.chat_id, "-100123");
  assert.equal(sentBody.parse_mode, "HTML");
}

/* ③ 봇 토큰이 경로에 들어가는 URL 을 로그에 남기지 않는다 */
{
  const source = fs.readFileSync(path.join(ROOT, "worker/lib/telegram.js"), "utf8");
  const logsUrl = /console\.(log|error|warn)\([^)]*\burl\b/i.test(source);
  assert.ok(!logsUrl, "telegram.js 가 요청 URL 을 로그에 남긴다 — 경로에 봇 토큰이 들어 있다");
  assert.ok(
    source.includes("TELEGRAM_API_BASE"),
    "telegram.js 가 API 베이스 상수를 쓰지 않는다 — 이 가드의 URL 스캔이 헛돈다",
  );
}

/* ④ 요일 코너의 링크가 전부 sitemap.xml 에 있다 */
{
  const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  const taskSource = fs.readFileSync(path.join(ROOT, "worker/lib/sns-daily-post-task.js"), "utf8");

  const picksBlock = taskSource.split("const WEEKDAY_PICKS = [")[1];
  assert.ok(picksBlock, "WEEKDAY_PICKS 를 찾지 못했다 — 이 가드가 낡았다");
  const paths = picksBlock.split("];")[0]
    .split('path: "').slice(1)
    .map((chunk) => chunk.split('"')[0]);

  // 🔴 대상이 0개일 때 통과하는 검사는 가드가 아니다(CLAUDE.md 원칙 10).
  assert.ok(paths.length >= 7, "요일 코너를 " + paths.length + "개만 찾았다 — 7개(요일 수) 이상이어야 한다");

  for (const p of paths) {
    assert.ok(
      sitemap.includes("<loc>https://code-destiny.com" + p + "</loc>"),
      "요일 코너 링크 " + p + " 가 sitemap.xml 에 없다 — 발행 글이 404 로 이어진다",
    );
  }

  // /fortune/ 은 매일 고정으로 붙는 링크라 따로 확인한다.
  assert.ok(
    sitemap.includes("<loc>https://code-destiny.com/fortune/</loc>"),
    "고정 링크 /fortune/ 가 sitemap.xml 에 없다",
  );
}

/* ⑤ 문안이 주입한 시각을 반영한다 */
{
  // 2026-01-02 00:00Z = KST 2026-01-02 09:00 (금요일)
  const friday = Date.UTC(2026, 0, 2, 0, 0, 0);
  const text = buildDailyPostText({ SITE_BASE_URL: "https://code-destiny.com" }, friday);

  assert.ok(text.includes("2026-01-02"), "주입한 날짜가 문안에 없다 — 시각 인자가 무시된다");
  assert.ok(text.includes("(금)"), "요일이 문안에 없다");
  assert.ok(text.includes("https://code-destiny.com/fortune/"), "오늘의 운세 링크가 없다");
  assert.ok(text.length <= 4096, "본문이 Telegram 상한(4096자)을 넘는다");

  // 날짜가 다르면 문안도 달라야 한다(상수 문자열로 굳어 있지 않다).
  const saturday = Date.UTC(2026, 0, 3, 0, 0, 0);
  assert.notEqual(
    buildDailyPostText({}, saturday),
    text,
    "다른 날짜인데 문안이 같다 — 템플릿이 시각을 안 읽는다",
  );

  assert.equal(
    escapeTelegramHtml('<a href="x">&'),
    '&lt;a href="x"&gt;&amp;',
    "HTML 이스케이프가 parse_mode:HTML 이 해석하는 세 글자(& < >)를 덮지 않는다",
  );
}

/* ⑥ 태스크가 일일 크론에 실제로 배선돼 있다 */
{
  const workerIndex = fs.readFileSync(path.join(ROOT, "worker/index.js"), "utf8");
  assert.ok(
    /\["sns-daily-post",[\s\S]{0,120}?sns-daily-post-task\.js/.test(workerIndex),
    "worker/index.js 의 일일 크론 태스크 목록에 sns-daily-post 가 없다 — 만들어 두고 아무도 안 부른다",
  );
  assert.ok(
    workerIndex.includes("runSnsDailyPostTask("),
    "worker/index.js 가 runSnsDailyPostTask 를 실제로 호출하지 않는다",
  );
  assert.ok(
    workerIndex.includes('await import("./lib/sns-daily-post-task.js")'),
    "worker/index.js 가 sns-daily-post-task.js 를 import 하지 않는다",
  );
  // 🔴 새 크론을 만들지 않았는지 확인한다(worker/wrangler.toml 의 crons 는 수정 금지 대상).
  const wrangler = fs.readFileSync(path.join(ROOT, "worker/wrangler.toml"), "utf8");
  const cronLine = wrangler.split("\n").find((line) => line.trim().startsWith("crons"));
  assert.ok(cronLine, "wrangler.toml 에서 crons 줄을 찾지 못했다");
  assert.equal(
    cronLine.trim(),
    'crons = ["0 22 * * *", "*/10 * * * *"]',
    "크론 목록이 바뀌었다 — SNS 발행은 기존 일일 크론에 얹혀 가야 한다(CLAUDE.md 규칙 4)",
  );
}


/* ⑦ 배포 스위치가 두 wrangler 설정에 같은 값으로 선언돼 있고, 그 값이 isEnabled 가 실제로
      해석하는 토큰이다. 🔴 [vars] 가 있으면 그 값이 프로덕션의 값이고 코드 기본값은 죽는다 —
      "enabled" 같은 오타는 예외 없이 조용한 꺼짐이 되므로 여기서 잡는다(CLAUDE.md 규칙 4). */
{
  const taskSource = fs.readFileSync(path.join(ROOT, "worker/lib/sns-daily-post-task.js"), "utf8");
  // 스위치 해석은 isSwitchOn 하나가 맡는다(isEnabled·getThreadsSkipReason 이 둘 다 이걸 부른다).
  const isEnabledBody = taskSource.split("function isSwitchOn(env, key) {")[1];
  assert.ok(isEnabledBody, "isSwitchOn 를 찾지 못했다 — 이 검사가 무엇을 지키는지 먼저 다시 볼 것");
  assert.ok(
    /function isEnabled\(env\) \{\s*return isSwitchOn\(env, "SNS_DAILY_POST_ENABLED"\);/.test(taskSource),
    "isEnabled 가 isSwitchOn 을 거치지 않는다 — 아래에서 뽑는 켜짐 토큰이 실제 해석과 어긋난다",
  );

  // 켜짐 토큰을 여기에 손으로 적지 않는다 — 소스에서 뽑아야 해석이 바뀔 때 같이 따라간다.
  const truthyTokens = (isEnabledBody.split("}")[0].match(/raw === "[^"]+"/g) || [])
    .map((hit) => hit.slice('raw === "'.length, -1));
  assert.ok(truthyTokens.length > 0, "isSwitchOn 이 인정하는 켜짐 토큰을 소스에서 못 찾았다");

  const FALSEY_TOKENS = ["0", "false", "off", "no"];
  const declared = new Map();
  for (const configPath of ["worker/wrangler.toml", "worker/wrangler.staging.toml"]) {
    const source = fs.readFileSync(path.join(ROOT, configPath), "utf8");
    const line = source.split("\n").find((entry) => entry.trim().startsWith("SNS_DAILY_POST_ENABLED"));
    assert.ok(line, `${configPath} 에 SNS_DAILY_POST_ENABLED 선언이 없다 — 스위치가 어디에도 없으면 발행은 영영 안 일어난다`);
    const value = line.split("=")[1].trim().replace(/"/g, "").toLowerCase();
    assert.ok(
      truthyTokens.includes(value) || FALSEY_TOKENS.includes(value),
      `${configPath} 의 SNS_DAILY_POST_ENABLED="${value}" 를 isEnabled 가 모른다 — 조용히 꺼짐이 된다`,
    );
    declared.set(configPath, value);
  }
  assert.equal(
    declared.get("worker/wrangler.toml"),
    declared.get("worker/wrangler.staging.toml"),
    "두 wrangler 설정의 값이 다르다 — verify:worker-config-parity 가 [vars] 값 불일치를 실패로 본다",
  );
}

/* ⑧ 실패는 지우지 않고 failed 로 남긴다. 예전 구현은 실패 시 잠금을 deleteOne 해서 idempotency_keys 에
      cron:sns-daily-post 문서가 0건이었고, 2026-08-29 22:00Z 크론이 왜 발행을 못 했는지 아무도 알 수 없었다.
      재시도 경로는 재선점(findOneAndUpdate) 하나뿐이어야 한다 — 삭제가 돌아오면 흔적도 같이 사라진다.

      🔴 재선점 조건은 **소스 정규식이 아니라 buildReclaimFilter 가 만든 실제 필터 객체**로 검사한다.
      예전 단언은 `[\s\S]*?` 가 파일 끝까지 흘러 다른 절의 status:"failed" 를 우연히 잡아
      **잘못된 이유로 통과**했고, 필터를 함수로 빼는 순간 통째로 깨졌다.
      🔴 분기를 여기에 손으로 적지 않는다(CLAUDE.md 원칙 10) — 필터에서 전수 발견하고 분기가 0개여도 실패한다. */
{
  const taskSource = fs.readFileSync(path.join(ROOT, "worker/lib/sns-daily-post-task.js"), "utf8");
  assert.ok(!/IdempotencyKey\.deleteOne\(/.test(taskSource), "태스크가 잠금을 deleteOne 한다 — 실패 흔적이 사라진다(⑧)");
  assert.ok(/status: "failed"/.test(taskSource), "태스크가 실패를 status: \"failed\" 로 기록하지 않는다(⑧)");
  assert.ok(/responseRef:\s*\{\s*error:/.test(taskSource), "실패 사유(responseRef.error)를 남기지 않는다(⑧)");
  assert.ok(
    /IdempotencyKey\.findOneAndUpdate\(\s*buildReclaimFilter\(/.test(taskSource),
    "재선점이 buildReclaimFilter 를 거치지 않는다 — 아래 행위 단언이 실제 재선점과 무관해진다(⑧)",
  );

  // 필터 트리를 통째로 훑어 해당 키를 가진 조건절을 전수 수집한다. 모양이 바뀌면 개수 단언이 먼저 터진다.
  const collect = (node, key, found = []) => {
    if (Array.isArray(node)) {
      for (const item of node) collect(item, key, found);
      return found;
    }
    if (!node || typeof node !== "object" || node instanceof Date) return found;
    if (Object.prototype.hasOwnProperty.call(node, key)) found.push(node);
    for (const value of Object.values(node)) collect(value, key, found);
    return found;
  };

  const RECLAIM_NOW = Date.UTC(2026, 8, 3, 22, 30, 0);
  const filter = buildReclaimFilter("2026-09-03", RECLAIM_NOW);
  assert.equal(filter.endpoint, "cron:sns-daily-post", "재선점 필터가 SNS 잠금 엔드포인트를 안 겨눈다(⑧)");
  assert.equal(filter.keyHash, "2026-09-03", "재선점 필터가 넘긴 keyHash 를 안 쓴다 — 남의 날 잠금을 회수한다(⑧)");

  const statusBranches = collect(filter, "status");
  assert.ok(
    statusBranches.length > 0,
    "재선점 필터에서 status 분기를 하나도 못 찾았다 — 필터 모양이 바뀌었으면 이 검사부터 고친다(⑧)",
  );
  assert.ok(
    statusBranches.some((branch) => branch.status === "failed"),
    "failed 문서를 재선점하는 분기가 없다 — 실패한 날은 재시도가 영영 막힌다(⑧)",
  );

  // 🔴 processing 을 회수하는 분기는 **표식 부재**로 한정돼야 한다. 표식이 있는 processing 은
  // send() 가 이미 나갔을 수 있는 상태라, 회수하면 2026-09-02 처럼 같은 글이 두 번 올라간다.
  const processingBranches = statusBranches.filter((branch) => {
    const value = branch.status;
    if (value === "processing") return true;
    return Array.isArray(value?.$in) && value.$in.includes("processing");
  });
  assert.ok(
    processingBranches.length > 0,
    "굳은 processing 을 회수하는 분기가 없다 — 잠금만 잡고 죽은 날이 영원히 already_posted 로 건너뛰어진다(⑧)",
  );
  for (const branch of processingBranches) {
    assert.deepEqual(
      branch["responseRef.sendStartedAt"],
      { $exists: false },
      "processing 회수 분기가 sendStartedAt 부재로 한정되지 않는다 — 이미 나간 발행을 한 번 더 내보낸다(⑧)",
    );
    const staleBefore = branch.updatedAt?.$lt;
    assert.ok(
      staleBefore instanceof Date,
      "processing 회수 분기에 updatedAt 하한이 없다 — 방금 잡은 잠금을 살아 있는 실행에게서 빼앗는다(⑧)",
    );
    const staleMs = RECLAIM_NOW - staleBefore.getTime();
    assert.ok(
      staleMs >= 10 * 60 * 1000,
      `processing 회수 나이가 ${staleMs}ms 다 — 10분 크론 주기보다 짧으면 살아 있는 실행의 잠금을 회수한다(⑧)`,
    );
  }

  // 🔴 부분 발행된 날(responseRef.ids 가 이미 차 있는 날)은 **어느 분기로도** 재선점하지 않는다.
  // Threads 체인은 언제나 1번 글부터 발행하므로 재시도가 곧 중복 발행이다 — 2026-09-02 에 실제로
  // 같은 글이 계정에 두 번 올라갔다. 문안은 실행마다 새로 쓰므로 이어 붙이기로도 못 푼다.
  for (const branch of statusBranches) {
    assert.equal(
      collect(branch, "responseRef.ids").length,
      0,
      "ids 조건이 status 분기 **안**에 있다 — 조건이 안 붙은 분기가 부분 발행된 날을 재선점한다(⑧)",
    );
  }
  const unconditional = [filter, ...(Array.isArray(filter.$and) ? filter.$and : [])]
    .filter((clause) => collect(clause, "responseRef.ids").length > 0 && collect(clause, "status").length === 0);
  assert.equal(
    unconditional.length,
    1,
    `모든 분기에 걸리는 responseRef.ids 조건절이 ${unconditional.length}개다 — 1개여야 부분 발행된 날이 전 분기에서 빠진다(⑧)`,
  );
  for (const clause of collect(unconditional[0], "responseRef.ids")) {
    const cond = clause["responseRef.ids"];
    assert.ok(
      cond?.$exists === false || cond?.$size === 0,
      `responseRef.ids 조건이 ${JSON.stringify(cond)} 다 — 없음/빔 이외를 허용하면 부분 발행된 날이 통과한다(⑧)`,
    );
  }
}

/* ⑨ 관리자 수동 실행·상태 조회가 배선돼 있고, 크론과 **같은** runSnsDailyPostTask 를 부른다 —
      별도 발행 경로가 생기면 잠금·플래그를 우회한다(CLAUDE.md 원칙 6). */
{
  const adminSource = fs.readFileSync(path.join(ROOT, "worker/routes/admin.js"), "utf8");
  assert.ok(adminSource.includes('path === "/sns-daily-post"'), "admin.js 에 /sns-daily-post 위임이 없다(⑨)");
  assert.ok(adminSource.includes('import("./admin-sns.js")'), "admin.js 가 admin-sns.js 를 지연 import 하지 않는다(⑨)");
  const delegation = adminSource.split('path === "/sns-daily-post"')[1].split("}")[0];
  assert.ok(delegation.includes("authorizeAdminRequest(request, env)"), "/sns-daily-post 위임이 관리자 인증을 거치지 않는다(⑨)");

  const snsSource = fs.readFileSync(path.join(ROOT, "worker/routes/admin-sns.js"), "utf8");
  assert.ok(
    /import \{ runSnsDailyPostTask \} from "\.\.\/lib\/sns-daily-post-task\.js"/.test(snsSource),
    "admin-sns.js 가 크론과 같은 runSnsDailyPostTask 를 import 하지 않는다(⑨)",
  );
  assert.ok(!snsSource.includes("sendTelegramMessage"), "admin-sns.js 가 태스크를 우회해 직접 발행한다(⑨)");
  assert.ok(snsSource.includes('path === "/run"') && snsSource.includes('path === "/status"'), "run/status 경로가 없다(⑨)");
}

/* ⑩ Threads 체인이 2~5글이고 각 글이 상한 안이며 주입한 시각을 반영한다.
      🔴 상한을 넘긴 글은 잘려서 나가는 게 아니라 **발행 자체가 거절된다** — 체인 중간이면
      루트만 남은 반쪽 글이 공개 계정에 남는다. */
{
  const friday = Date.UTC(2026, 0, 2, 0, 0, 0);
  const chain = buildThreadsPostChain(SITE_ENV, friday);

  // 🔴 개수를 손으로 적지 않는다 — 오행 짝(DAY_STEM_GROUPS)에서 유도해야 짝을 늘렸을 때 가드가 따라온다.
  const expectedPosts = 1 + DAY_STEM_GROUPS.length;
  assert.equal(
    chain.length,
    expectedPosts,
    `Threads 체인이 ${chain.length}글이다 — 루트 1글 + 오행 짝 ${DAY_STEM_GROUPS.length}글이어야 한다(⑩)`,
  );

  for (const [index, text] of chain.entries()) {
    const weight = threadsTextWeight(text);
    assert.ok(weight > 0, `${index + 1}번째 글이 비었다(⑩)`);
    assert.ok(weight <= 480, `${index + 1}번째 글이 ${weight}자다 — 480자 이하여야 한다(⑩)`);
    assert.ok(weight <= THREADS_TEXT_LIMIT, `${index + 1}번째 글이 API 상한 ${THREADS_TEXT_LIMIT}자를 넘는다(⑩)`);
  }

  assert.ok(chain[0].includes("2026-01-02"), "루트 글에 주입한 날짜가 없다 — 시각 인자가 무시된다(⑩)");
  assert.ok(chain[0].includes("(금)"), "루트 글에 요일이 없다(⑩)");
  assert.ok(chain[0].includes("https://code-destiny.com/fortune/"), "루트 글에 오늘의 운세 링크가 없다(⑩)");
  // 🔴 AI 서문이 card.body 를 대체해도 오늘의 기둥(천간·지지)은 루트에 남아야 한다.
  assert.ok(
    chain[0].includes("천간:") && chain[0].includes("지지:"),
    "루트 글에 오늘의 기둥(천간·지지)이 없다 — 서문이 대체되면 그 두 오행이 통째로 사라진다(⑩)",
  );

  const saturday = Date.UTC(2026, 0, 3, 0, 0, 0);
  assert.notEqual(
    buildThreadsPostChain(SITE_ENV, saturday).join("\n"),
    chain.join("\n"),
    "다른 날짜인데 체인이 같다 — 문안이 상수로 굳어 있다(⑩)",
  );

  // clamp 계약: 상한을 넘기면 자르되 코드포인트를 반으로 쪼개지 않는다(이모지가 깨진 채 나가면 안 된다).
  const clamped = clampThreadsText("🌙".repeat(400), 100);
  assert.ok(threadsTextWeight(clamped) <= 100, `clampThreadsText 가 상한을 못 지켰다(${threadsTextWeight(clamped)}자, ⑩)`);
  assert.ok(
    [...clamped].every((ch) => ch.codePointAt(0) < 0xd800 || ch.codePointAt(0) > 0xdfff),
    "clampThreadsText 가 서로게이트 쌍을 쪼갰다 — 깨진 글자가 발행된다(⑩)",
  );
}

/* ⑪ Threads 문안은 평문이다. 텔레그램 문안(parse_mode:"HTML")을 재사용하면 <b> 가 글자 그대로
      타임라인에 노출된다 — 두 채널이 렌더러를 공유하지 않는다는 계약을 여기서 고정한다. */
{
  const chain = buildThreadsPostChain(SITE_ENV, Date.UTC(2026, 0, 2, 0, 0, 0));
  for (const [index, text] of chain.entries()) {
    assert.ok(!/<[a-z/][^>]*>/i.test(text), `${index + 1}번째 Threads 글에 HTML 태그가 있다 — 글자 그대로 노출된다(⑪)`);
    assert.ok(
      !/&(amp|lt|gt|quot|#\d+);/.test(text),
      `${index + 1}번째 Threads 글에 HTML 엔티티가 있다 — Threads 는 이걸 안 푼다(⑪)`,
    );
  }
}

/* ⑫ 일진 원천 교차검증. 텔레그램 문안은 daily-fortune-task.js 의 자체 율리우스일 계산을 쓰고
      Threads 문안은 역법 코어 ganji() 를 쓴다. 같은 날 두 채널이 다른 일진을 말하면 안 된다.
      🔴 연주는 일부러 대조하지 않는다 — getTodayPillars 가 달력 연도로 세차를 내서 입춘 전에는
      어긋나는 것이 **알려진 결함**이다(docs/handoff/marketing-automation-2026-08-28.md).
      Threads 문안은 코어 값을 쓰므로 옳고, 텔레그램·메일 쪽 정정은 별도 PR 이다. */
{
  const DAY_MS = 24 * 60 * 60 * 1000;
  let checked = 0;
  for (let offset = 0; offset < 365; offset += 1) {
    const at = Date.UTC(2026, 0, 1, 0, 0, 0) + offset * DAY_MS;
    const { y, m, d } = getKstDateParts(at);
    const core = ganji({ year: y, month: m, day: d, hour: 12, minute: 0 });
    assert.ok(core, `${y}-${m}-${d} 에 역법 코어가 간지를 못 냈다(⑫)`);
    assert.equal(
      getTodayPillars(at).dayPillar,
      STEM_HANGUL[core.day.stemIndex] + BRANCH_HANGUL[core.day.branchIndex],
      `${y}-${m}-${d} 일주가 두 원천에서 다르다 — 같은 날 채널마다 다른 일진을 말한다(⑫)`,
    );
    checked += 1;
  }
  assert.equal(checked, 365, `일진 대조 표본이 ${checked}일이다 — 365일이어야 한다(⑫)`);
}

/* ⑬ Threads 액세스 토큰이 URL 에 실리지 않고 URL 이 로그에 남지 않는다.
      Graph API 는 쿼리스트링 토큰도 받지만, 그러면 토큰이 로그·프록시 기록에 남는다. */
{
  const source = fs.readFileSync(path.join(ROOT, "worker/lib/threads.js"), "utf8");
  assert.ok(
    !/console\.(log|error|warn)\([^)]*\burl\b/i.test(source),
    "threads.js 가 요청 URL 을 로그에 남긴다(⑬)",
  );
  assert.ok(
    source.includes("THREADS_API_BASE"),
    "threads.js 가 API 베이스 상수를 쓰지 않는다 — 이 가드의 URL 스캔이 헛돈다(⑬)",
  );
  assert.ok(!/access_token=/.test(source), "threads.js 가 access_token 을 URL 쿼리에 싣는다(⑬)");
  assert.ok(
    /body\.set\("access_token"/.test(source),
    "threads.js 가 토큰을 POST 본문에 싣지 않는다 — 이 가드의 쿼리 스캔이 헛돈다(⑬)",
  );
}

/* ⑭ 스위치가 꺼졌거나 토큰이 없으면 Threads API 로 fetch 0회.
      🔴 공개 계정 발행은 되돌릴 수 없다 — 스위치와 토큰이 **둘 다** 있어야만 나간다. */
{
  let calls = 0;
  const countingFetch = async () => {
    calls += 1;
    throw new Error("Threads API 가 불려선 안 된다");
  };

  const noToken = await postThreadsChain({}, { texts: ["x"], fetchImpl: countingFetch });
  assert.equal(noToken.ok, false);
  assert.equal(noToken.error, "missing_access_token", "토큰 부재 사유가 뭉개졌다(⑭)");
  assert.equal(noToken.permanent, true, "토큰 부재를 일시 실패로 읽었다 — 매일 헛재시도한다(⑭)");
  assert.equal(calls, 0, "토큰이 없는데 Threads API 를 호출했다(⑭)");

  const withToken = { THREADS_ACCESS_TOKEN: "test-token" };
  assert.equal((await postThreadsChain(withToken, { texts: [], fetchImpl: countingFetch })).error, "empty_text");
  assert.equal(
    (await postThreadsChain(withToken, { texts: ["가".repeat(THREADS_TEXT_LIMIT + 1)], fetchImpl: countingFetch })).error,
    "text_too_long",
    "상한을 넘긴 글을 그대로 보냈다 — API 가 거절해 반쪽 체인이 남는다(⑭)",
  );
  assert.equal(calls, 0, "발행 전 거절 경로에서 네트워크를 탔다(⑭)");

  // 게이트 자체: 스위치만 켜져도, 토큰만 있어도 발행하지 않는다.
  assert.equal(getThreadsSkipReason({}), "threads_disabled", "스위치 없이 Threads 가 열렸다(⑭)");
  assert.equal(getThreadsSkipReason(withToken), "threads_disabled", "토큰만 있는데 Threads 가 열렸다(⑭)");
  assert.equal(
    getThreadsSkipReason({ SNS_THREADS_POST_ENABLED: "1" }),
    "missing_threads_token",
    "토큰 없이 Threads 가 열렸다(⑭)",
  );
  assert.equal(getThreadsSkipReason({ SNS_THREADS_POST_ENABLED: "1", ...withToken }), null, "둘 다 있는데 안 열린다(⑭)");

  // 태스크가 그 게이트를 실제로 거치는지 — 위 단위 검사만으로는 배선을 못 본다.
  const taskSource = fs.readFileSync(path.join(ROOT, "worker/lib/sns-daily-post-task.js"), "utf8");
  assert.ok(
    /const skipReason = getThreadsSkipReason\(env\);[\s\S]{0,400}?if \(skipReason\) \{[\s\S]{0,300}?channels\.threads = \{ ok: true, skipped: skipReason \}/.test(
      taskSource,
    ),
    "태스크의 Threads 분기가 getThreadsSkipReason 게이트를 거치지 않는다(⑭)",
  );
}

/* ⑮ 답글 체인이 **직전 발행 글**에 이어 붙고, 글 N개가 요청 2N회다(컨테이너 생성 → 발행).
      중간에 실패하면 이미 나간 글(ids)과 멈춘 지점(failedAt)을 그대로 돌려준다. */
{
  const texts = ["첫 글", "둘째 글", "셋째 글", "넷째 글"];
  const calls = [];
  let seq = 0;
  const result = await postThreadsChain(
    { THREADS_ACCESS_TOKEN: "test-token" },
    {
      texts,
      fetchImpl: async (url, init) => {
        const params = new URLSearchParams(init.body);
        assert.ok(!String(url).includes("access_token"), "요청 URL 에 액세스 토큰이 실렸다(⑮)");
        assert.equal(params.get("access_token"), "test-token", "토큰이 POST 본문에 없다(⑮)");
        calls.push({ url: String(url), params });
        seq += 1;
        return jsonResponse({ id: `id-${seq}` });
      },
    },
  );

  assert.equal(result.ok, true, `체인 발행이 실패했다: ${result.error}(⑮)`);
  assert.equal(calls.length, texts.length * 2, `글 ${texts.length}개인데 호출이 ${calls.length}회다 — 2N 회여야 한다(⑮)`);
  assert.equal(result.ids.length, texts.length, "발행된 글 id 수가 글 수와 다르다(⑮)");

  for (let index = 0; index < texts.length; index += 1) {
    const create = calls[index * 2];
    const publish = calls[index * 2 + 1];
    assert.ok(create.url.endsWith("/me/threads"), `${index + 1}번째 컨테이너 생성 엔드포인트가 틀렸다(⑮)`);
    assert.equal(create.params.get("media_type"), "TEXT", `${index + 1}번째 글의 media_type 이 TEXT 가 아니다(⑮)`);
    assert.equal(create.params.get("text"), texts[index], `${index + 1}번째 글 본문이 바뀌었다(⑮)`);
    assert.ok(publish.url.endsWith("/me/threads_publish"), `${index + 1}번째 발행 엔드포인트가 틀렸다(⑮)`);
    assert.equal(publish.params.get("creation_id"), `id-${index * 2 + 1}`, `${index + 1}번째 발행이 다른 컨테이너를 가리킨다(⑮)`);

    if (index === 0) {
      assert.equal(create.params.get("reply_to_id"), null, "루트 글이 답글로 붙었다(⑮)");
    } else {
      assert.equal(
        create.params.get("reply_to_id"),
        result.ids[index - 1],
        `${index + 1}번째 글이 직전 발행 글의 답글이 아니다 — 타임라인에서 흩어진다(⑮)`,
      );
    }
  }

  // 중간 실패: 되돌리지 않고 어디까지 나갔는지를 그대로 보고한다.
  let attempt = 0;
  const partial = await postThreadsChain(
    { THREADS_ACCESS_TOKEN: "test-token" },
    {
      texts,
      fetchImpl: async () => {
        attempt += 1;
        if (attempt === 5) {
          return jsonResponse(
            { error: { message: "Invalid OAuth access token", type: "OAuthException", code: 190 } },
            400,
          );
        }
        return jsonResponse({ id: `id-${attempt}` });
      },
    },
  );
  assert.equal(partial.ok, false, "체인 중간 실패를 성공으로 읽었다(⑮)");
  assert.equal(partial.failedAt, 2, `멈춘 지점이 ${partial.failedAt} 이다 — 3번째 글(index 2)이어야 한다(⑮)`);
  assert.equal(partial.ids.length, 2, `이미 나간 글이 ${partial.ids.length}건으로 보고됐다 — 2건이어야 한다(⑮)`);
  assert.equal(
    partial.permanent,
    true,
    "code 190(OAuthException)을 일시 실패로 읽었다 — 토큰 만료가 재시도로 풀리는 것처럼 보인다(⑮)",
  );
}

/* ⑯ 채널별 잠금 키가 분리돼 있고, 실패한 채널이 있으면 태스크가 **던진다**.
      🔴 예전 구현은 {ok:false} 를 돌려주고 끝냈는데 worker/index.js 의 크론 래퍼는 던진 것만 잡는다 —
      그래서 2026-08-29 에 발행 0건인데 알림도 0건이었다. 이 검사가 그 구멍을 다시 열지 못하게 한다. */
{
  const taskSource = fs.readFileSync(path.join(ROOT, "worker/lib/sns-daily-post-task.js"), "utf8");

  assert.ok(/const THREADS_KEY_SUFFIX = ":threads";/.test(taskSource), "Threads 잠금 키 접미사 상수가 없다(⑯)");
  assert.ok(
    /keyHash: dateKey,\s*send: \(\) => sendTelegramChannel/.test(taskSource),
    "텔레그램 잠금 키가 dateKey 그대로가 아니다 — 기존 잠금 문서가 고아가 된다(⑯)",
  );
  assert.ok(
    /keyHash: `\$\{dateKey\}\$\{THREADS_KEY_SUFFIX\}`/.test(taskSource),
    "Threads 잠금 키가 텔레그램과 분리돼 있지 않다 — 한 채널 실패가 다른 채널을 막는다(⑯)",
  );
  assert.ok(
    /const failed = Object\.entries\(channels\)\.filter/.test(taskSource),
    "채널 실패를 모으는 지점이 없다(⑯)",
  );
  assert.ok(
    /if \(failed\.length\) \{[\s\S]{0,600}?throw error;/.test(taskSource),
    "채널이 실패해도 던지지 않는다 — 크론 실패 알림이 영영 안 뜬다(⑯)",
  );

  const snsSource = fs.readFileSync(path.join(ROOT, "worker/routes/admin-sns.js"), "utf8");
  assert.ok(
    /try \{[\s\S]{0,300}?runSnsDailyPostTask\(env, \{ channel \}\)[\s\S]{0,400}?\} catch/.test(snsSource),
    "admin-sns.js 가 던지는 태스크를 감싸지 않는다 — 어느 채널이 왜 실패했는지가 500 으로 뭉개진다(⑯)",
  );
}

/* ⑰ Threads 스위치·토큰 발급일이 두 wrangler 설정에 **같은 값**으로 있고, 그 값을 코드가 실제로
      해석한다. 🔴 [vars] 값이 프로덕션의 값이고 코드 기본값은 죽는다(CLAUDE.md 규칙 4). */
{
  const declared = new Map();
  for (const key of ["SNS_THREADS_POST_ENABLED", "SNS_THREADS_AI_ENABLED", "THREADS_TOKEN_ISSUED_AT"]) {
    const values = [];
    for (const configPath of ["worker/wrangler.toml", "worker/wrangler.staging.toml"]) {
      const source = fs.readFileSync(path.join(ROOT, configPath), "utf8");
      const line = source.split("\n").find((entry) => entry.trim().startsWith(key));
      assert.ok(line, `${configPath} 에 ${key} 선언이 없다(⑰)`);
      values.push(line.split("=")[1].trim().replace(/"/g, "").trim());
    }
    assert.equal(
      values[0],
      values[1],
      `${key} 값이 두 wrangler 설정에서 다르다 — verify:worker-config-parity 가 [vars] 값 불일치를 실패로 본다(⑰)`,
    );
    declared.set(key, values[0]);
  }

  // 스위치 값을 코드가 실제로 켜짐/꺼짐 중 하나로 읽는지 — "enabled" 같은 오타는 조용한 꺼짐이 된다.
  const switchValue = declared.get("SNS_THREADS_POST_ENABLED");
  const gate = getThreadsSkipReason({ SNS_THREADS_POST_ENABLED: switchValue, THREADS_ACCESS_TOKEN: "test-token" });
  if (["0", "false", "off", "no"].includes(switchValue.toLowerCase())) {
    assert.equal(gate, "threads_disabled", `SNS_THREADS_POST_ENABLED="${switchValue}" 가 꺼짐으로 안 읽힌다(⑰)`);
  } else {
    assert.equal(gate, null, `SNS_THREADS_POST_ENABLED="${switchValue}" 를 코드가 켜짐으로 안 읽는다 — 조용히 꺼짐이 된다(⑰)`);
  }

  // AI 스위치도 같은 이유로 해석 가능해야 한다 — 오타는 조용히 꺼짐이 되고, 아무도 못 알아챈다.
  const aiValue = declared.get("SNS_THREADS_AI_ENABLED");
  assert.equal(
    isThreadsAiEnabled({ SNS_THREADS_AI_ENABLED: aiValue }),
    !["0", "false", "off", "no", ""].includes(aiValue.toLowerCase()),
    `SNS_THREADS_AI_ENABLED="${aiValue}" 를 코드가 반대로 읽는다 — 조용한 꺼짐/켜짐이 된다(⑰)`,
  );

  // 발급일이 날짜꼴이 아니면 만료 경고가 영영 안 뜨고, 토큰은 60일 뒤 소리 없이 죽는다.
  const issuedAt = declared.get("THREADS_TOKEN_ISSUED_AT");
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(issuedAt), `THREADS_TOKEN_ISSUED_AT="${issuedAt}" 가 YYYY-MM-DD 가 아니다(⑰)`);

  const DAY_MS = 24 * 60 * 60 * 1000;
  const issuedMs = Date.parse(`${issuedAt}T00:00:00Z`);
  const fresh = await warnThreadsTokenExpiry({ THREADS_TOKEN_ISSUED_AT: issuedAt }, issuedMs + 10 * DAY_MS);
  assert.equal(fresh.skipped, "not_due", "발급 10일 만에 만료 경고가 떴다(⑰)");
  const stale = await warnThreadsTokenExpiry({ THREADS_TOKEN_ISSUED_AT: issuedAt }, issuedMs + 50 * DAY_MS);
  assert.equal(stale.skipped, undefined, "발급 50일이 지났는데 만료 경고를 건너뛰었다 — 토큰이 소리 없이 죽는다(⑰)");
  assert.equal(stale.error, "missing_bot_token", "만료 경고가 텔레그램 발송 경로를 타지 않는다(⑰)");
}


/* ⑱ 해시태그가 두 채널 문안에 살아남는다. 🔴 태그를 붙인 **뒤** 클램프하면 태그부터 잘린다 —
      clampThreadsText 는 문자열 끝에서 자르기 때문이다. 예산을 먼저 빼는 구현을 여기서 고정한다.
      개수는 채널마다 다르다: Threads 는 게시물당 토픽 태그가 1개만 기능하고(나머지는 글자 그대로
      노출된다), 텔레그램은 태그가 채널 내 검색 대상이라 여러 개가 값을 낸다. */
{
  const friday = Date.UTC(2026, 0, 2, 0, 0, 0);

  // 🔴 대상이 0개일 때 통과하는 검사는 가드가 아니다(CLAUDE.md 원칙 10).
  assert.ok(DAILY_HASHTAGS.length >= 3, `고정 해시태그가 ${DAILY_HASHTAGS.length}개뿐이다(⑱)`);
  assert.ok(
    WEEKDAY_PICKS.every((pick) => pick.tag),
    "요일 코너에 tag 가 없는 항목이 있다 — 그날만 태그가 하나 준다(⑱)",
  );

  // 텔레그램: 고정 3개 + 그날 요일 코너 1개.
  const telegram = buildDailyPostText(SITE_ENV, friday);
  for (const tag of DAILY_HASHTAGS) {
    assert.ok(telegram.includes(`#${escapeTelegramHtml(tag)}`), `텔레그램 문안에 고정 태그 #${tag} 가 없다(⑱)`);
  }
  const telegramTags = telegram.match(/#[^\s#]+/g) || [];
  assert.equal(
    telegramTags.length,
    DAILY_HASHTAGS.length + 1,
    `텔레그램 태그가 ${telegramTags.length}개다 — 고정 ${DAILY_HASHTAGS.length}개 + 요일 코너 1개여야 한다(⑱)`,
  );

  // Threads: 루트에만 1개, 답글에는 0개.
  const chain = buildThreadsPostChain(SITE_ENV, friday);
  assert.ok(chain.length >= 2, "Threads 체인이 짧아 루트와 답글을 구분할 수 없다(⑱)");
  assert.ok(
    chain[0].endsWith(`#${THREADS_ROOT_HASHTAG}`),
    "Threads 루트가 토픽 태그로 끝나지 않는다(⑱)",
  );
  assert.equal(
    (chain[0].match(/#[^\s#]+/g) || []).length,
    1,
    "Threads 루트의 토픽 태그가 1개가 아니다 — 두 번째부터는 글자 그대로 노출된다(⑱)",
  );
  for (const [index, text] of chain.slice(1).entries()) {
    assert.ok(!text.includes("#"), `${index + 2}번째 Threads 답글에 태그가 있다 — 토픽으로 안 잡히고 글자 수만 는다(⑱)`);
  }

  // 🔴 본문이 상한을 꽉 채워도 태그가 남아야 한다. 이 단언 하나가 '붙인 뒤 클램프' 회귀를 잡는다.
  const crowded = appendRootHashtag("가".repeat(2000), 480);
  assert.ok(
    crowded.endsWith(`#${THREADS_ROOT_HASHTAG}`),
    "본문이 길면 태그가 잘린다 — 태그 몫을 예산에서 먼저 빼지 않았다(⑱)",
  );
  assert.ok(
    threadsTextWeight(crowded) <= 480,
    `태그를 포함한 길이가 상한을 넘었다(${threadsTextWeight(crowded)}자, ⑱)`,
  );
}

/* ⑲ 실패가 **어느 단계에서** 났는지가 알림 문구에 남는다.
      🔴 2026-08-31 22:00Z 실측: 크론은 돌았고(Cloudflare GraphQL, 그 분 버킷 req=2 · sub=19 · status=success)
      스위치도 켜져 있었는데(그 시각 실행 버전의 바인딩에 SNS_DAILY_POST_ENABLED="1"), 그날
      idempotency_keys 의 cron:sns-daily-post 문서는 08-30 수동 실행 1건뿐이었다 — 09-01 도, 09-01:threads 도
      0건. runChannel 은 **첫 동작이 Mongo 쓰기**이고 발행 실패조차 failed 문서를 남기므로, 문서 0건은
      "채널 루프에 닿기 전에 죽었다"는 뜻이다. 그 지점은 모듈 로드와 connectDb 둘뿐인데 알림 문구는
      양쪽이 똑같았고, 알림 한 통이 지워지자 근거가 통째로 사라졌다. 단계 표식이 그 재발을 막는다.
      🔴 대상 목록을 손으로 적지 않는다 — tasks 배열을 소스에서 전수 발견해 미표식을 실패시킨다(원칙 10). */
{
  const workerIndex = fs.readFileSync(path.join(ROOT, "worker/index.js"), "utf8");
  const tasksAt = workerIndex.indexOf("const tasks = [");
  assert.ok(tasksAt > 0, "worker/index.js 에서 일일 tasks 배열을 찾지 못했다(⑲)");
  const tasksBlock = workerIndex.slice(tasksAt, workerIndex.indexOf("];", tasksAt));

  const taskEntries = tasksBlock.split("\n").filter((line) => line.includes("await import("));
  assert.ok(taskEntries.length >= 6, `일일 태스크를 ${taskEntries.length}개만 찾았다 — 대상 0개로 통과하는 검사는 가드가 아니다(⑲)`);
  for (const line of taskEntries) {
    const name = (line.match(/\["([^"]+)"/) || [, line.trim().slice(0, 40)])[1];
    assert.ok(
      line.includes(".catch(loadFailed)"),
      `일일 태스크 ${name} 의 동적 import 에 .catch(loadFailed) 가 없다`
        + " — 모듈 로드 실패가 실행 중 예외와 같은 문구가 되어 알림만으로는 갈리지 않는다(⑲)",
    );
  }
  assert.ok(
    /const loadFailed = \(error\) => \{\s*throw new Error\(`stage=load /.test(workerIndex),
    "loadFailed 가 stage=load 로 시작하는 문구를 던지지 않는다 — 알림이 사유를 200자에서 자르므로 단계는 맨 앞이어야 한다(⑲)",
  );

  const taskSource = fs.readFileSync(path.join(ROOT, "worker/lib/sns-daily-post-task.js"), "utf8");
  assert.ok(
    /try \{\s*await connectDb\(env\);\s*\} catch \(error\) \{[\s\S]{0,400}?stage=connect_db/.test(taskSource),
    "connectDb 실패가 stage=connect_db 로 표시되지 않는다 — DB 가 안 붙는 순간이라 흔적을 DB 에 남길 수 없고,"
      + " 던지는 문구가 유일한 근거다(⑲)",
  );
  const connectCalls = (taskSource.match(/await connectDb\(/g) || []).length;
  assert.equal(
    connectCalls,
    1,
    `connectDb 호출이 ${connectCalls}곳이다 — 위 try 밖에 하나라도 더 생기면 그 경로의 실패는 단계 표식 없이 나간다(⑲)`,
  );
  assert.ok(
    /responseRef:\s*\{\s*error: result\.error,\s*stage: "send"/.test(taskSource),
    "발행 실패의 stage 가 잠금 문서에 안 남는다 — 알림은 지워질 수 있고(2026-08-31 에 실제로 지워졌다)"
      + " TTL 3일짜리 이 문서가 지워지지 않는 사본이다(⑲)",
  );
  assert.ok(
    /성공 \$\{sent\.length \? sent\.join\(", "\) : "0건"\}/.test(taskSource),
    "던지는 문구에 성공한 채널이 안 실린다 — 한 채널만 죽어도 태스크는 통째로 던지므로"
      + " 알림 한 줄이 '오늘 아무것도 안 나갔다'로 읽힌다(⑲)",
  );
  assert.ok(
    /r\.permanent \? " \[토큰 회전 필요\]"/.test(taskSource),
    "permanent 실패(OAuth·code 190/200)에 사람이 할 일이 안 붙는다 — 재시도로는 안 풀린다(⑲)",
  );

  const alertSource = fs.readFileSync(path.join(ROOT, "worker/lib/cron-failure-alert.js"), "utf8");
  assert.ok(
    alertSource.includes("Cloudflare Workers Logs"),
    "실패 알림이 지워지지 않는 사본의 위치를 안 알려 준다 — 이 메시지는 공개 채널에 가고 지워질 수 있다(⑲)",
  );
}

/* ⑳ 일간 10개 축 — 체인이 일간 10개를 전부 다루고, 그 명리 값이 정본 판정과 일치하며,
      10개가 **서로 다른 답**을 받는다.
      🔴 여기서 명리 규칙을 복제하지 않는다 — daily-stem-guidance.js 가 낸 값을 정본 tenGodFor 로
      다시 유도해 대조한다. 규칙을 베껴 오면 같은 오타가 양쪽에 생겨 가드가 통과한다.
      🔴 붕괴 가드가 핵심이다: 첫 구현은 '계열이 生하는 다음 계열' 축을 썼는데 그 축은 오늘 천간의
      오행 하나로 접혀 **일간 10개가 전부 같은 글자**를 받았다(2026-09-01 실측, 갑자일 전부 병·정).
      그러면 '각 일간에 어떤 글자가 좋다'는 이 기능의 요구 자체가 죽는데 다른 검사는 전부 통과한다. */
{
  const dayStems = Object.keys(STEM_ELEMENT);
  const dayBranches = Object.keys(HIDDEN_STEMS);
  assert.equal(dayStems.length, 10, `천간 표가 ${dayStems.length}개다(⑳)`);
  assert.equal(dayBranches.length, 12, `지지 표가 ${dayBranches.length}개다(⑳)`);

  // 체인이 일간 10개를 전부, 계산된 십성 그대로 적는다.
  const friday = Date.UTC(2026, 0, 2, 0, 0, 0);
  const ctx = buildThreadsDayContext(SITE_ENV, friday);
  assert.ok(ctx, "그날의 발행 재료를 못 만들었다 — 체인이 통째로 빈다(⑳)");
  assert.equal(ctx.rows.length, 10, `일간 판정이 ${ctx.rows.length}개다 — 10개여야 한다(⑳)`);

  const body = buildThreadsPostChain(SITE_ENV, friday).join("\n");
  for (const row of ctx.rows) {
    assert.ok(
      body.includes(`${row.stemKo}(${row.stem}) ${row.tenGod}`),
      `체인에 ${row.stemKo}(${row.stem}) 일간의 십성 줄이 없다 — 열 중 하나가 조용히 빠졌다(⑳)`,
    );
    assert.ok(
      body.includes(`좋은 십성 ${row.flowTenGods.join("·")}`),
      `체인에 ${row.stemKo} 일간의 좋은 십성이 없다(⑳)`,
    );
  }

  // 60갑자 전수 — 값 대조와 붕괴 가드.
  let checked = 0;
  for (let index = 0; index < 60; index += 1) {
    const today = { stem: dayStems[index % 10], branch: dayBranches[index % 12] };
    const label = `${today.stem}${today.branch}`;
    const rows = buildAllStemGuidance(today).flatMap((group) => group.rows);
    assert.equal(rows.length, 10, `${label} 일에 일간 판정이 ${rows.length}개다(⑳)`);

    for (const row of rows) {
      assert.equal(row.tenGod, tenGodFor(row.stem, today.stem), `${label} 일 ${row.stem} 일간의 십성이 정본과 다르다(⑳)`);
      assert.equal(
        row.branchMainTenGod,
        tenGodFor(row.stem, HIDDEN_STEMS[today.branch][0]),
        `${label} 일 ${row.stem} 일간의 지지 본기 십성이 정본과 다르다(⑳)`,
      );
      assert.equal(row.flowTenGods.length, 2, `${label} 일 ${row.stem} 의 좋은 십성이 ${row.flowTenGods.length}개다 — 계열은 2종이다(⑳)`);
      assert.equal(row.goodStems.length, 2, `${label} 일 ${row.stem} 의 좋은 천간이 ${row.goodStems.length}개다 — 양간·음간 2개다(⑳)`);
      assert.ok(row.goodBranches.length > 0, `${label} 일 ${row.stem} 에 좋은 지지가 하나도 없다(⑳)`);
      for (const good of row.goodStems) {
        assert.ok(
          row.flowTenGods.includes(tenGodFor(row.stem, good)),
          `${label} 일 ${row.stem} 의 좋은 글자 ${good} 이 좋은 십성 계열 밖이다 — 글자와 십성이 어긋난 채 발행된다(⑳)`,
        );
      }
      for (const good of row.goodBranches) {
        assert.ok(
          row.flowTenGods.includes(tenGodFor(row.stem, HIDDEN_STEMS[good][0])),
          `${label} 일 ${row.stem} 의 좋은 지지 ${good} 의 본기가 좋은 십성 계열 밖이다(⑳)`,
        );
      }
      assert.ok(TEN_GOD_LINE[row.tenGod], `${label} 일 ${row.stem} 의 십성 ${row.tenGod} 에 폴백 문장이 없다 — AI 가 죽으면 그 자리가 빈다(⑳)`);
    }

    // 🔴 붕괴 가드. 실측 최솟값은 글자 3종 · 십성 4종이다(60갑자 전수, 2026-09-01).
    const letterSets = new Set(rows.map((row) => row.goodStems.join("")));
    const godSets = new Set(rows.map((row) => row.flowTenGods.join("")));
    assert.ok(
      letterSets.size >= 3,
      `${label} 일에 좋은 글자가 ${letterSets.size}종뿐이다 — 일간 10개가 같은 답을 받으면 '각 일간에' 가 죽는다(⑳)`,
    );
    assert.ok(godSets.size >= 4, `${label} 일에 좋은 십성이 ${godSets.size}종뿐이다 — 최소 4종이어야 한다(⑳)`);
    checked += 1;
  }
  assert.equal(checked, 60, `60갑자 표본이 ${checked}일이다 — 대상 0개로 통과하는 검사는 가드가 아니다(⑳)`);
}

/* ㉑ AI 문안은 **덧칠**이다 — 스위치가 꺼지면 모델 호출 0회, 켜져도 실패하면 결정론 문안이 그대로 나간다.
      🔴 이 스크립트는 Gemini 를 한 번도 부르지 않는다. generateImpl 을 주입해 호출 횟수만 센다
      (CLAUDE.md 절대 규칙 1 — 과금 LLM 실호출 금지). */
{
  const friday = Date.UTC(2026, 0, 2, 0, 0, 0);
  const ctx = buildThreadsDayContext(SITE_ENV, friday);
  assert.ok(ctx && ctx.rows.length === 10, "AI 검증용 재료를 못 만들었다(㉑)");
  const ON = { SNS_THREADS_AI_ENABLED: "1" };

  // 기본값 꺼짐 — env 가 비면 모델을 부르지 않는다.
  assert.equal(isThreadsAiEnabled({}), false, "SNS_THREADS_AI_ENABLED 없이 AI 문안이 켜졌다(㉑)");
  let calls = 0;
  const off = await writeDailyThreadsCopy({}, {
    day: ctx.day,
    rows: ctx.rows,
    generateImpl: () => { calls += 1; return { ok: true, text: "{}" }; },
  });
  assert.equal(off, null, "스위치가 꺼졌는데 AI 문안이 나왔다(㉑)");
  assert.equal(calls, 0, "스위치가 꺼졌는데 모델을 불렀다 — 하루 한 번이라도 과금이고, 기본값은 꺼짐이어야 한다(㉑)");

  // 실패·예외·헛소리 — 어느 쪽도 던지지 않고 null 이며, 체인은 결정론 문안 그대로다.
  const deterministic = buildThreadsPostChain(SITE_ENV, friday, null);
  for (const [why, impl] of [["ok:false", () => ({ ok: false, error: "boom" })], ["throw", () => { throw new Error("boom"); }], ["non-json", () => ({ ok: true, text: "그냥 문장" })]]) {
    const copy = await writeDailyThreadsCopy(ON, { day: ctx.day, rows: ctx.rows, generateImpl: impl });
    assert.equal(copy, null, `${why} 응답을 문안으로 받아들였다 — 검증 없이 공개 계정에 나간다(㉑)`);
    assert.deepEqual(
      buildThreadsPostChain(SITE_ENV, friday, copy),
      deterministic,
      `${why} 일 때 체인이 결정론 문안으로 안 돌아왔다 — 모델이 죽으면 그날 발행이 죽는다(㉑)`,
    );
  }

  // 통과하는 문안은 실제로 체인에 실린다. 코드펜스로 감싸 와도 읽는다.
  const advice = {};
  for (const row of ctx.rows) {
    advice[row.stem] = `${row.stemKo} 일간은 오늘 ${row.tenGod} 기운을 받습니다. ${row.flowTenGods[0]} 쪽으로 한 걸음만 옮겨 보세요.`;
  }
  const intro = "오늘은 중심을 잡는 하루입니다. 서두르지 말고 하나씩 매듭지으면 저녁에 손에 남는 것이 있습니다.";
  const payload = JSON.stringify({ intro, ...advice });
  const ok = await writeDailyThreadsCopy(ON, {
    day: ctx.day,
    rows: ctx.rows,
    generateImpl: () => ({ ok: true, text: "```json\n" + payload + "\n```", model: "test-model" }),
  });
  assert.ok(ok, "정상 응답인데 문안이 null 이다(㉑)");
  assert.equal(ok.model, "test-model", "쓴 모델 이름이 안 남는다 — 잠금 문서의 aiModel 이 비면 사후 추적이 끊긴다(㉑)");
  assert.equal(Object.keys(ok.advice).length, 10, `AI 문안이 ${Object.keys(ok.advice).length}개만 통과했다 — 10개여야 한다(㉑)`);
  const written = buildThreadsPostChain(SITE_ENV, friday, ok);
  const writtenBody = written.join("\n");
  assert.ok(writtenBody.includes(intro), "AI 서문이 루트에 안 실렸다(㉑)");
  for (const row of ctx.rows) {
    assert.ok(writtenBody.includes(ok.advice[row.stem]), `${row.stemKo} 일간의 AI 문안이 체인에 안 실렸다(㉑)`);
  }
  assert.equal(written.length, deterministic.length, `AI 문안이 실리자 체인이 ${written.length}글이 됐다(㉑)`);
  for (const [index, text] of written.entries()) {
    const weight = threadsTextWeight(text);
    assert.ok(weight <= 480, `AI 문안이 실린 ${index + 1}번째 글이 ${weight}자다 — 상한을 넘기면 발행 자체가 거절된다(㉑)`);
  }
  assert.ok(written[0].endsWith(`#${THREADS_ROOT_HASHTAG}`), "AI 서문이 들어가자 루트 토픽 태그가 잘렸다(㉑)");
}

/* ㉒ 사실에 없는 십성이 섞인 문안은 **그 항목만** 버려지고, 프롬프트에는 확정된 사실이 박힌다.
      🔴 모델이 명리를 지어내는 것이 이 기능의 유일한 실질 위험이다 — 하루 한 번 공개 계정에 나가고
      되돌릴 수 없다. 계산은 언제나 정본 표가 하고, 모델은 그 사실을 문장으로 옮기기만 한다. */
{
  const friday = Date.UTC(2026, 0, 2, 0, 0, 0);
  const ctx = buildThreadsDayContext(SITE_ENV, friday);
  const ON = { SNS_THREADS_AI_ENABLED: "1" };

  // 검증기 자체 — 허용 목록 밖은 잡고, 안은 오탐하지 않는다.
  assert.equal(findUnsupportedTenGod("정관이 들어오는 날입니다.", ["비견", "겁재"]), "정관", "사실에 없는 십성을 못 잡았다(㉒)");
  assert.equal(findUnsupportedTenGod("비견 쪽으로 힘을 쓰세요.", ["비견", "겁재"]), "", "허용된 십성을 오탐했다 — 통과할 문안이 전부 버려진다(㉒)");

  // 열 중 하나만 지어내면 그 하나만 버리고 아홉은 살린다.
  const rogue = {};
  for (const row of ctx.rows) {
    rogue[row.stem] = `${row.stemKo} 일간은 오늘 ${row.tenGod} 기운을 받습니다. ${row.flowTenGods[0]} 쪽으로 옮겨 보세요.`;
  }
  const victim = ctx.rows[0];
  const allTenGods = Object.keys(TEN_GOD_GROUP);
  assert.equal(allTenGods.length, 10, `십성 표가 ${allTenGods.length}개다(㉒)`);
  rogue[victim.stem] = `오늘은 ${allTenGods.join("·")} 가 함께 오는 날입니다.`;

  const copy = await writeDailyThreadsCopy(ON, {
    day: ctx.day,
    rows: ctx.rows,
    generateImpl: () => ({ ok: true, text: JSON.stringify({ intro: "오늘은 하나씩 매듭지으면 좋은 하루입니다. 서두르지 마세요.", ...rogue }), model: "test-model" }),
  });
  assert.ok(copy, "부분 거절인데 문안이 통째로 null 이 됐다 — 아홉의 좋은 문장까지 잃는다(㉒)");
  assert.equal(
    copy.advice[victim.stem],
    undefined,
    `${victim.stemKo} 일간이 사실에 없는 십성을 썼는데 통과했다 — 틀린 명리가 공개 계정에 나간다(㉒)`,
  );
  assert.equal(Object.keys(copy.advice).length, 9, `버려진 항목이 ${10 - Object.keys(copy.advice).length}건이다 — 1건이어야 한다(㉒)`);

  // 버려진 자리는 정본 문장표로 메워진다(빈칸이 아니다).
  const body = buildThreadsPostChain(SITE_ENV, friday, copy).join("\n");
  assert.ok(!body.includes(rogue[victim.stem]), "버린 문안이 그대로 발행됐다(㉒)");
  assert.ok(
    body.includes(TEN_GOD_LINE[victim.tenGod].good),
    `${victim.stemKo} 일간 자리가 정본 문장으로 안 메워졌다 — 조언 줄이 빈다(㉒)`,
  );

  // 길이 초과·마크업도 같은 자리에서 걸린다.
  const bloated = { ...rogue };
  bloated[victim.stem] = "가".repeat(400);
  const clipped = await writeDailyThreadsCopy(ON, {
    day: ctx.day,
    rows: ctx.rows,
    generateImpl: () => ({ ok: true, text: JSON.stringify({ intro: "오늘은 하나씩 매듭지으면 좋은 하루입니다. 서두르지 마세요.", ...bloated }), model: "t" }),
  });
  assert.equal(clipped.advice[victim.stem], undefined, "상한을 넘긴 문안이 통과했다 — 답글이 잘려 나간다(㉒)");

  // 프롬프트에 그 일간의 확정된 사실이 실제로 박힌다(모델이 계산하게 두지 않는다).
  const prompt = buildMyeongriPrompt(ctx.day, ctx.rows);
  assert.ok(prompt.includes(ctx.day.dayPillarKo), `프롬프트에 오늘 일진(${ctx.day.dayPillarKo})이 없다(㉒)`);
  for (const row of ctx.rows) {
    assert.ok(prompt.includes(`"${row.stem}"`), `프롬프트에 ${row.stem} 일간의 출력 키가 없다 — 그 일간 문안이 영영 안 나온다(㉒)`);
    assert.ok(prompt.includes(row.tenGod), `프롬프트에 ${row.stem} 일간의 십성이 사실로 안 박혔다(㉒)`);
    assert.ok(prompt.includes(row.flowTenGods.join("·")), `프롬프트에 ${row.stem} 일간의 좋은 십성이 사실로 안 박혔다(㉒)`);
  }

  // 배선 — 본문 조립부는 LLM 을 모르고, 태스크는 주입 구현을 그대로 넘긴다.
  const contentSource = fs.readFileSync(path.join(ROOT, "worker/lib/threads-daily-content.js"), "utf8");
  assert.ok(
    !/gemini|workers-ai|callGeminiText/i.test(contentSource),
    "본문 조립부가 LLM 을 직접 부른다 — 모델이 죽으면 발행도 함께 죽는다(㉒)",
  );
  const taskSource = fs.readFileSync(path.join(ROOT, "worker/lib/sns-daily-post-task.js"), "utf8");
  assert.ok(
    /const \{ fetchImpl, generateImpl \} = options;/.test(taskSource),
    "태스크가 generateImpl 을 옵션에서 안 푼다 — 검증이 실호출 없이 AI 경로를 못 밟는다(㉒)",
  );
  assert.ok(
    /sendThreadsChannel\(env, now, fetchImpl, generateImpl\)/.test(taskSource),
    "주입한 generateImpl 이 Threads 채널까지 안 내려간다(㉒)",
  );
  assert.ok(
    /writeDailyThreadsCopy\([\s\S]{0,240}?\)\s*\.catch\(\(\) => null\)/.test(taskSource),
    "문안 생성 실패가 발행 실패로 번진다 — .catch 로 결정론 문안까지 내려가야 한다(㉒)",
  );
}

/* ㉓ 발행 표식과 같은 날 회수 창.
      🔴 markSendStarted 가 send() **뒤**로 밀리면 buildReclaimFilter 분기 ②의 불변식
      ("표식 없음 = 호출 0회")이 통째로 무너져, 회수가 곧 중복 발행이 된다. 위치 관계를 여기서 못 박는다.
      회수 창은 UTC 22시대 + 분 ≥ 10 이다 — 창을 넓히면 KST 자정(15:00Z)을 넘긴 실행이 **다음 날**
      dateKey 로 발행해 발행 시각 자체가 바뀐다(요청받은 적 없는 동작 변경).
      env 를 {} 로 주므로 DB·네트워크는 0회다(스위치 꺼짐으로 즉시 반환). */
{
  const taskSource = fs.readFileSync(path.join(ROOT, "worker/lib/sns-daily-post-task.js"), "utf8");
  const defIdx = taskSource.indexOf("async function markSendStarted");
  const markIdx = taskSource.indexOf("await markSendStarted(");
  const sendIdx = taskSource.indexOf("const result = await send();");
  assert.ok(defIdx > 0, "markSendStarted 정의가 없다 — 굳은 processing 을 회수할 근거(표식)가 사라진다(㉓)");
  assert.ok(markIdx > 0, "발행 직전 표식 호출(await markSendStarted()) 이 없다(㉓)");
  assert.ok(sendIdx > 0, "발행 호출(const result = await send();)을 못 찾았다 — 이 절의 위치 단언이 무의미해진다(㉓)");
  assert.ok(
    markIdx < sendIdx,
    "표식이 send() **뒤**에서 굳는다 — 나간 발행이 표식 없는 processing 으로 남아 회수가 중복 발행이 된다(㉓)",
  );

  const between = taskSource.slice(markIdx, sendIdx);
  assert.ok(
    /return \{ ok: false, stage: "mark"/.test(between),
    "표식 실패가 발행을 막지 않는다 — 표식 없이 나간 글은 다음 회수가 한 번 더 내보낸다(㉓)",
  );
  assert.ok(
    !/markSendStarted\([^)]*\)\s*\.catch\(/.test(taskSource),
    "표식 쓰기 실패가 .catch 로 삼켜진다 — 실패해도 그대로 발행으로 내려간다(㉓)",
  );

  const markBody = taskSource.slice(defIdx).split(/\r?\n\}\r?\n/)[0];
  assert.ok(
    /withMongoRetry\(/.test(markBody),
    "표식 쓰기가 withMongoRetry 밖에 있다 — activeMongoOps 에 안 잡혀 옆 태스크의 ping 실패에 함께 끊긴다(㉓)",
  );
  assert.ok(
    /\{ retries: 0 \}/.test(markBody),
    "표식 쓰기가 재시도된다 — 재시도는 표식만 늦추고 크론 예산을 먹을 뿐이다(㉓)",
  );

  // [UTC 시각, 창 밖인가]. 22:00 정각은 일일 크론과 겹치므로 창 밖이다.
  const RECOVERY_CASES = [
    ["2026-09-03T21:59:00Z", true],
    ["2026-09-03T22:00:00Z", true],
    ["2026-09-03T22:09:59Z", true],
    ["2026-09-03T22:10:00Z", false],
    ["2026-09-03T22:59:00Z", false],
    ["2026-09-03T23:00:00Z", true],
    ["2026-09-04T00:10:00Z", true],
  ];
  for (const [iso, outside] of RECOVERY_CASES) {
    const result = await runSnsDailyPostRecovery({}, { now: Date.parse(iso) });
    if (outside) {
      assert.equal(
        result.skipped,
        "outside_recovery_window",
        `${iso} 에 회수가 돈다 — 창 밖 실행은 KST 날짜가 넘어가 다음 날 문안을 그 시각에 발행한다(㉓)`,
      );
    } else {
      assert.notEqual(
        result.skipped,
        "outside_recovery_window",
        `${iso} 에 회수가 창 밖으로 판정된다 — 굳은 잠금을 회수할 실행이 그날 하나도 없어진다(㉓)`,
      );
    }
  }
}

console.log("[verify-sns-daily-post] 통과 — 기본 꺼짐 · throw 없음 4종 · 토큰 URL 미로깅 2종 · 링크 실재 8건 · 시각 반영 · 크론 배선 · 배포 스위치 해석 가능 3종 · 실패 기록 유지 · 관리자 수동 실행 배선 · Threads 체인 6글(루트+오행 짝 5) · 평문 계약 · 일진 대조 365일 · 채널별 잠금 분리 · 실패 시 throw(실제 발행 0회) · 해시태그 생존(Threads 루트 1 · 텔레그램 4) · 단계 표식(load/connect_db/send · 태스크 6개 전수) · 일간 10개 축 대조 60갑자 전수 · AI 덧칠 계약(실호출 0회) · 재선점 필터 행위 검사(분기 전수) · 발행 표식 선행 · 회수 창 UTC 22:10~22:59");
