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
for (const key of ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "SNS_DAILY_POST_ENABLED"]) {
  delete process.env[key];
}

const { sendTelegramMessage, escapeTelegramHtml } = await import("../worker/lib/telegram.js");
const { buildDailyPostText, runSnsDailyPostTask } = await import("../worker/lib/sns-daily-post-task.js");

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
    workerIndex.includes('["sns-daily-post", runSnsDailyPostTask]'),
    "worker/index.js 의 일일 크론 태스크 목록에 sns-daily-post 가 없다 — 만들어 두고 아무도 안 부른다",
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
  const isEnabledBody = taskSource.split("function isEnabled(env) {")[1];
  assert.ok(isEnabledBody, "isEnabled 를 찾지 못했다 — 이 검사가 무엇을 지키는지 먼저 다시 볼 것");

  // 켜짐 토큰을 여기에 손으로 적지 않는다 — 소스에서 뽑아야 isEnabled 가 바뀔 때 같이 따라간다.
  const truthyTokens = (isEnabledBody.split("}")[0].match(/raw === "[^"]+"/g) || [])
    .map((hit) => hit.slice('raw === "'.length, -1));
  assert.ok(truthyTokens.length > 0, "isEnabled 가 인정하는 켜짐 토큰을 소스에서 못 찾았다");

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

console.log("[verify-sns-daily-post] 통과 — 기본 꺼짐 · throw 없음 4종 · 토큰 URL 미로깅 · 링크 실재 8건 · 시각 반영 · 크론 배선 · 배포 스위치 해석 가능(실제 발행 0회)");
