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
 *     같은 날 재시도는 failed 문서 재선점(findOneAndUpdate)으로만 연다.
 *   ⑨ 관리자 수동 실행·상태 조회(/api/admin/sns-daily-post)가 배선돼 있고 크론과 같은 태스크를 부른다.
 *   ⑩ Threads 체인이 2~5글이고 각 글이 상한 안이며 주입한 시각을 반영한다.
 *   ⑪ Threads 문안이 **평문**이다 — 태그·엔티티가 섞이면 글자 그대로 노출된다.
 *   ⑫ 일진 원천 교차검증 — getTodayPillars 와 역법 코어 ganji() 의 일주가 365일 표본에서 일치한다.
 *   ⑬ Threads 액세스 토큰이 URL 쿼리에 실리지 않고 URL 이 로그에 남지 않는다.
 *   ⑭ 스위치 꺼짐 또는 토큰 부재 → Threads API 로 fetch 0회.
 *   ⑮ 답글 체인이 **직전 발행 글**에 이어 붙고, 글 N개가 요청 2N회다.
 *   ⑯ 채널별 잠금 키가 분리돼 있고, 실패한 채널이 있으면 태스크가 **던진다**(크론 알림이 그때만 뜬다).
 *   ⑰ Threads 스위치·토큰 발급일이 두 wrangler 설정에 같은 값으로 있다.
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
  "THREADS_ACCESS_TOKEN",
  "THREAD_ACCESS_TOKEN",
  "THREADS_TOKEN_ISSUED_AT",
]) {
  delete process.env[key];
}

const { sendTelegramMessage, escapeTelegramHtml } = await import("../worker/lib/telegram.js");
// 🔴 순환 import(sns-daily-post-task ↔ threads-daily-content)를 **콘텐츠 쪽부터** 들어가 깬다.
// 두 진입 순서 중 위험한 쪽이 이쪽이고, 여기서 TDZ 가 나면 워커 번들에서도 난다.
const { buildThreadsPostChain, clampThreadsText } = await import("../worker/lib/threads-daily-content.js");
const { postThreadsChain, threadsTextWeight, THREADS_TEXT_LIMIT } = await import("../worker/lib/threads.js");
const { buildDailyPostText, runSnsDailyPostTask, getThreadsSkipReason } = await import(
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
      재시도 경로는 failed 문서 재선점(findOneAndUpdate) 하나뿐이어야 한다 — 삭제가 돌아오면 흔적도 같이 사라진다. */
{
  const taskSource = fs.readFileSync(path.join(ROOT, "worker/lib/sns-daily-post-task.js"), "utf8");
  assert.ok(!/IdempotencyKey\.deleteOne\(/.test(taskSource), "태스크가 잠금을 deleteOne 한다 — 실패 흔적이 사라진다(⑧)");
  assert.ok(/status: "failed"/.test(taskSource), "태스크가 실패를 status: \"failed\" 로 기록하지 않는다(⑧)");
  assert.ok(
    /IdempotencyKey\.findOneAndUpdate\([\s\S]*?status: "failed"/.test(taskSource),
    "failed 문서를 재선점하는 findOneAndUpdate 가 없다 — 실패한 날은 재시도가 영영 막힌다(⑧)",
  );
  assert.ok(/responseRef:\s*\{\s*error:/.test(taskSource), "실패 사유(responseRef.error)를 남기지 않는다(⑧)");
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

  // 🔴 대상이 0개일 때 통과하는 검사는 가드가 아니다(CLAUDE.md 원칙 10).
  assert.ok(chain.length >= 2 && chain.length <= 5, `Threads 체인이 ${chain.length}글이다 — 2~5글이어야 한다(⑩)`);

  for (const [index, text] of chain.entries()) {
    const weight = threadsTextWeight(text);
    assert.ok(weight > 0, `${index + 1}번째 글이 비었다(⑩)`);
    assert.ok(weight <= 480, `${index + 1}번째 글이 ${weight}자다 — 480자 이하여야 한다(⑩)`);
    assert.ok(weight <= THREADS_TEXT_LIMIT, `${index + 1}번째 글이 API 상한 ${THREADS_TEXT_LIMIT}자를 넘는다(⑩)`);
  }

  assert.ok(chain[0].includes("2026-01-02"), "루트 글에 주입한 날짜가 없다 — 시각 인자가 무시된다(⑩)");
  assert.ok(chain[0].includes("(금)"), "루트 글에 요일이 없다(⑩)");
  assert.ok(chain[0].includes("https://code-destiny.com/fortune/"), "루트 글에 오늘의 운세 링크가 없다(⑩)");

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
  for (const key of ["SNS_THREADS_POST_ENABLED", "THREADS_TOKEN_ISSUED_AT"]) {
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

console.log("[verify-sns-daily-post] 통과 — 기본 꺼짐 · throw 없음 4종 · 토큰 URL 미로깅 2종 · 링크 실재 8건 · 시각 반영 · 크론 배선 · 배포 스위치 해석 가능 3종 · 실패 기록 유지 · 관리자 수동 실행 배선 · Threads 체인 4글 · 평문 계약 · 일진 대조 365일 · 채널별 잠금 분리 · 실패 시 throw(실제 발행 0회)");
