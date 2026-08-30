/**
 * 공개 API 엣지 캐시 가드 (2026-08-21).
 *
 * 배경(실측): Cloudflare 무료 플랜 존이라 한국 사용자가 LAX 로 붙는데 MongoDB Atlas 는 서울에 있다.
 * 그래서 워커에서 재면 Mongo 핸드셰이크 833ms, 쿼리 1회 약 415ms 다(같은 쿼리를 서울에서 로컬로
 * 재면 39~48ms — 10배). 그 결과 홈 진입의 /api/reviews 는 **빈 배열 82바이트를 돌려주는 데
 * 3.8~5.5초**가 걸렸고, 그 사이 공유 소켓 풀을 붙잡아 결제 checkout 이 DB_BUSY 503 으로 굶었다.
 *
 * 이 셋은 쿠키·userId 를 전혀 읽지 않는 순수 공개 응답이라 엣지에서 재사용할 수 있다:
 *   GET /api/reviews · GET /api/reviews/summary · GET /api/fortune/today-hub(공개 모드)
 * 셋 다 이미 `Cache-Control: public, max-age=…` 를 내보내고 있었지만 **아무도 그 60초를 지키지
 * 않았다** — Workers 라우트 응답은 Cloudflare 가 기본적으로 캐시하지 않는다(실측: 응답에
 * cf-cache-status 헤더 자체가 없다). 그래서 worker/lib/cms-cache.js 의 readCmsThroughCache
 * (아이솔레이트 memo + caches.default + 실패 시 stale 폴백)를 지나게 했다.
 *
 * 이 가드가 지키는 것은 세 가지다.
 *   ① 캐시가 살아 있을 것 — readCmsThroughCache 를 지나지 않으면 실패.
 *   ② 캐시 조회가 connectDb 보다 **앞**일 것 — 뒤로 가면 핸드셰이크를 그대로 물어 효과가 0 이 된다.
 *      (이 캐시의 목적은 쿼리 시간이 아니라 왕복 자체를 없애는 것이다.)
 *   ③ 🔴 개인화 응답이 공유 캐시에 새지 않을 것 — today-hub 는 birth 쿼리가 실리면 개인 사주다.
 *      그게 caches.default 에 올라가는 순간 다음 방문자가 남의 사주를 받는다.
 *
 * fail-closed: 호출 지점을 손으로 열거하지 않고 **전수 발견**한 뒤 분류되지 않은 호출이 하나라도
 * 있으면 실패한다(CLAUDE.md 원칙 10). 새 공개 라우트에 캐시를 붙이면 여기 분류를 함께 늘려야 한다.
 *
 * 실행: node scripts/verify-public-api-edge-cache.mjs [--self-test]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sliceFunction } from "./lib/js-source-slice.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REL = {
  reviews: "worker/routes/reviews.js",
  today: "worker/routes/fortune-today.js",
  insights: "worker/routes/insights.js",
  content: "worker/routes/content.js",
};
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const CACHE_CALL = "readCmsThroughCache({";

// 캐시 키에 이 이름이 들어가면 그 캐시는 공개 캐시가 아니다. 부분일치로 본다 — `userId` 든
// `auth.userId` 든 같은 사고다.
const FORBIDDEN_KEY_TOKENS = [
  "userId", "user.", "cookie", "Cookie", "authorization", "Authorization",
  "token", "session", "email", "input", "birth", "natal",
];

/** readCmsThroughCache({ … }) 호출마다 그 안의 `key:` 표현식 원문을 뽑는다. */
function collectCacheKeys(source) {
  const keys = [];
  let from = 0;
  for (;;) {
    const at = source.indexOf(CACHE_CALL, from);
    if (at === -1) break;
    from = at + CACHE_CALL.length;
    const lineEnd = source.indexOf("\n", source.indexOf("key:", at));
    const keyStart = source.indexOf("key:", at);
    keys.push(keyStart === -1 || lineEnd === -1 ? "" : source.slice(keyStart, lineEnd).trim());
  }
  return keys;
}

function countOccurrences(source, needle) {
  return source.split(needle).length - 1;
}

/** 캐시 조회가 연결보다 앞인지 — 함수 본문 안에서 첫 등장 위치로 판정한다. */
function cacheComesBeforeConnect(fnBody) {
  const cacheAt = fnBody.indexOf(CACHE_CALL);
  const connectAt = fnBody.indexOf("connectDb(env)");
  if (cacheAt === -1) return false;
  if (connectAt === -1) return true; // 연결이 아예 없으면(today-hub) 순서 문제도 없다
  return cacheAt < connectAt;
}

export function auditReviews(source) {
  const failures = [];
  const need = (ok, message) => { if (!ok) failures.push(`${REL.reviews}: ${message}`); };

  // ① 전수 발견 — 분류된 두 곳(handleList·handleSummary) 말고 다른 호출이 생기면 실패한다.
  const total = countOccurrences(source, CACHE_CALL);
  need(total === 2, `readCmsThroughCache 호출이 ${total}곳이다. 분류된 것은 handleList·handleSummary 2곳뿐이므로, 새로 붙였다면 이 가드에 분류를 추가할 것.`);

  for (const [marker, label] of [
    ["async function handleList(request, env) {", "handleList"],
    ["async function handleSummary(request, env) {", "handleSummary"],
  ]) {
    let body = "";
    try {
      body = sliceFunction(source, marker, label);
    } catch (error) {
      need(false, `${label} 을 잘라내지 못했다 — ${String(error?.message || error)}`);
      continue;
    }
    need(body.includes(CACHE_CALL), `${label} 이 엣지 캐시를 지나지 않는다. 공개 응답이 매번 Mongo 왕복(워커 실측 415ms/건)을 문다.`);
    need(
      cacheComesBeforeConnect(body),
      `${label}: connectDb 가 캐시 조회보다 앞에 있다. 캐시가 맞아도 핸드셰이크(실측 833ms)를 그대로 물어 효과가 사라진다 — connectDb 는 load() 안에 둘 것.`,
    );
    need(body.includes("publicCacheHeaders("), `${label}: X-CD-Cache 헤더가 빠졌다. stale(=DB 실패로 옛 값을 냄)을 구분할 수 없으면 캐시가 장애를 가린다.`);
  }

  for (const key of collectCacheKeys(source)) {
    need(key.length > 0, "readCmsThroughCache 호출에 key: 가 없다.");
    for (const token of FORBIDDEN_KEY_TOKENS) {
      need(!key.includes(token), `캐시 키에 '${token}' 이 들어갔다 — 공개 캐시가 아니라 남의 응답을 나눠주는 장치가 된다. (${key})`);
    }
  }

  return failures;
}

export function auditToday(source) {
  const failures = [];
  const need = (ok, message) => { if (!ok) failures.push(`${REL.today}: ${message}`); };

  const total = countOccurrences(source, CACHE_CALL);
  need(total === 1, `readCmsThroughCache 호출이 ${total}곳이다. 공개 모드 1곳만 허용한다 — 개인화 응답에 캐시를 붙였다면 즉시 되돌릴 것.`);

  let body = "";
  try {
    body = sliceFunction(source, "async function handleTodayHub(request, env) {", "handleTodayHub");
  } catch (error) {
    need(false, `handleTodayHub 를 잘라내지 못했다 — ${String(error?.message || error)}`);
    return failures;
  }

  need(body.includes(CACHE_CALL), "handleTodayHub 공개 모드가 엣지 캐시를 지나지 않는다. DB 는 안 쓰지만 스위스 천문 서브리퀘스트와 사주·숙요 계산으로 콜드 3.2초가 걸린다.");

  // 🔴 핵심 단언. 개인화 분기가 캐시보다 **앞에서 return** 해야 birth 응답이 공유 캐시에 닿지 않는다.
  const guardAt = body.indexOf("if (input) {");
  const cacheAt = body.indexOf(CACHE_CALL);
  need(guardAt !== -1, "개인화 조기 반환(if (input) { … return … })이 없다. birth 가 실린 응답이 공유 캐시로 흘러갈 수 있다.");
  need(
    guardAt !== -1 && cacheAt !== -1 && guardAt < cacheAt,
    "개인화 조기 반환이 캐시 조회보다 뒤에 있다. 이 순서가 뒤집히면 다음 방문자가 남의 사주를 받는다.",
  );
  if (guardAt !== -1 && cacheAt !== -1 && guardAt < cacheAt) {
    const personalBranch = body.slice(guardAt, cacheAt);
    need(personalBranch.includes("return json(payload"), "개인화 분기가 응답을 반환하지 않는다 — 실행이 아래 캐시 경로로 흘러내린다.");
    need(personalBranch.includes('"Cache-Control": "private, max-age=1800"'), "개인화 응답의 private 캐시 헤더가 사라졌다.");
  }

  need(
    body.includes('throw new Error("TODAY_HUB_UNAVAILABLE")'),
    "계산 실패가 캐시에 들어간다. load() 안에서 throw 하지 않으면 실패 응답이 30분 굳는다.",
  );

  for (const key of collectCacheKeys(source)) {
    need(key.length > 0, "readCmsThroughCache 호출에 key: 가 없다.");
    for (const token of FORBIDDEN_KEY_TOKENS) {
      need(!key.includes(token), `캐시 키에 '${token}' 이 들어갔다 — 개인 정보가 공유 캐시 키가 되면 안 된다. (${key})`);
    }
  }

  return failures;
}

/**
 * /api/insights 목록·상세 (2026-08-31, 계획 5단계). 키는 insight-public-cache.js 의 상수·슬러그 함수만 쓴다.
 * 상세는 404 를 캐시에 넣지 않아야 한다 — load() 안에서 throw 하지 않으면 없는 슬러그가 5분 굳는다.
 */
export function auditInsights(source) {
  const failures = [];
  const need = (ok, message) => { if (!ok) failures.push(`${REL.insights}: ${message}`); };

  const total = countOccurrences(source, CACHE_CALL);
  need(total === 2, `readCmsThroughCache 호출이 ${total}곳이다. 분류된 것은 handleInsightsList·handleInsightDetail 2곳뿐이므로, 새로 붙였다면 이 가드에 분류를 추가할 것.`);

  for (const [marker, label] of [
    ["async function handleInsightsList(request, env) {", "handleInsightsList"],
    ["async function handleInsightDetail(path, request, env) {", "handleInsightDetail"],
  ]) {
    let body = "";
    try {
      body = sliceFunction(source, marker, label);
    } catch (error) {
      need(false, `${label} 을 잘라내지 못했다 — ${String(error?.message || error)}`);
      continue;
    }
    need(body.includes(CACHE_CALL), `${label} 이 엣지 캐시를 지나지 않는다. 공개 응답이 매번 Mongo 핸드셰이크(~1.3s)를 문다.`);
    need(
      cacheComesBeforeConnect(body),
      `${label}: connectDb 가 캐시 조회보다 앞에 있다. 캐시가 맞아도 핸드셰이크를 그대로 물어 효과가 사라진다 — connectDb 는 load() 안에 둘 것.`,
    );
    need(body.includes("publicCacheHeaders("), `${label}: X-CD-Cache 헤더가 빠졌다. stale(=DB 실패로 옛 값을 냄)을 구분할 수 없으면 캐시가 장애를 가린다.`);
  }

  // 목록: 공개 판정(isPublicInsight)은 캐시 밖 — 예약 발행 시각을 읽는 시점으로 판정해야 한다.
  let listBody = "";
  try { listBody = sliceFunction(source, "async function handleInsightsList(request, env) {", "handleInsightsList"); } catch { /* 위에서 보고됨 */ }
  if (listBody) {
    const loadEndAt = listBody.indexOf("return raw.map(");
    const publicAt = listBody.indexOf("isPublicInsight(item)");
    need(loadEndAt !== -1 && publicAt !== -1 && publicAt > loadEndAt,
      "handleInsightsList: isPublicInsight 가 load() 안으로 들어갔다. 예약 발행이 캐시 TTL 동안 안 풀리거나, 캐시 시점에 비공개였던 글이 굳는다.");
  }

  let detailBody = "";
  try { detailBody = sliceFunction(source, "async function handleInsightDetail(path, request, env) {", "handleInsightDetail"); } catch { /* 위에서 보고됨 */ }
  if (detailBody) {
    need(detailBody.includes('throw new Error("INSIGHT_NOT_FOUND")'), "handleInsightDetail: 없는 슬러그가 캐시에 들어간다. load() 안에서 throw 하지 않으면 404 가 5분 굳고, 새로 발행한 글이 그동안 안 보인다.");
    need(detailBody.includes("if (missing) return notFound();"), "handleInsightDetail: missing 플래그로 404 를 내지 않는다 — stale 폴백이 휴지통 글을 되살린다.");
    need(detailBody.includes("shareUrl: buildShareUrl(request,"), "handleInsightDetail: shareUrl 이 캐시 밖에서 붙지 않는다. 요청 origin 이 캐시에 굳으면 다른 도메인 방문자가 남의 origin 을 받는다.");
  }

  for (const key of collectCacheKeys(source)) {
    need(key.length > 0, "readCmsThroughCache 호출에 key: 가 없다.");
    need(/key: (INSIGHT_PUBLIC_LIST_KEY|insightDetailCacheKey\(slug\)),?$/.test(key), `캐시 키는 insight-public-cache.js 의 상수·insightDetailCacheKey(slug) 만 허용한다 — 다른 키는 admin.js 의 무효화가 못 지운다. (${key})`);
    for (const token of FORBIDDEN_KEY_TOKENS) {
      need(!key.includes(token), `캐시 키에 '${token}' 이 들어갔다 — 공개 캐시가 아니라 남의 응답을 나눠주는 장치가 된다. (${key})`);
    }
  }

  return failures;
}

/** sitemap·rss 피드 (listPublicFeedItems) 1곳. /api/content 목록·상세는 필터별 키를 엣지에서 못 지우므로 캐시하지 않는다. */
export function auditContentFeed(source) {
  const failures = [];
  const need = (ok, message) => { if (!ok) failures.push(`${REL.content}: ${message}`); };

  const total = countOccurrences(source, CACHE_CALL);
  need(total === 1, `readCmsThroughCache 호출이 ${total}곳이다. 피드(listPublicFeedItems) 1곳만 허용한다 — /api/content 목록·상세는 필터별 키라 관리자 저장이 엣지 캐시를 못 지운다.`);

  let body = "";
  try {
    body = sliceFunction(source, "async function listPublicFeedItems(env, isSitemap) {", "listPublicFeedItems");
  } catch (error) {
    need(false, `listPublicFeedItems 를 잘라내지 못했다 — ${String(error?.message || error)}`);
    return failures;
  }
  need(body.includes(CACHE_CALL), "listPublicFeedItems 가 엣지 캐시를 지나지 않는다. public/_worker.js 가 sitemap·rss 요청마다 부른다.");
  need(cacheComesBeforeConnect(body), "listPublicFeedItems: connectDb 가 캐시 조회보다 앞에 있다 — load() 안에 둘 것.");

  for (const key of collectCacheKeys(source)) {
    need(/key: isSitemap \? CONTENT_FEED_SITEMAP_KEY : CONTENT_FEED_RSS_KEY,?$/.test(key), `피드 캐시 키는 CONTENT_FEED_SITEMAP_KEY·CONTENT_FEED_RSS_KEY 만 허용한다. (${key})`);
    for (const token of FORBIDDEN_KEY_TOKENS) {
      need(!key.includes(token), `캐시 키에 '${token}' 이 들어갔다. (${key})`);
    }
  }

  return failures;
}

function runSelfTest() {
  const base = { reviews: read(REL.reviews), today: read(REL.today), insights: read(REL.insights), content: read(REL.content) };

  const expectClean = [
    ["reviews baseline", auditReviews(base.reviews)],
    ["today baseline", auditToday(base.today)],
    ["insights baseline", auditInsights(base.insights)],
    ["content baseline", auditContentFeed(base.content)],
  ];
  for (const [label, found] of expectClean) {
    if (found.length) {
      console.error(`  ✗ self-test: ${label} 이 이미 실패한다 — 가드가 아니라 소스가 문제다.`);
      for (const f of found) console.error(`      ${f}`);
      return false;
    }
  }

  const mutations = [
    [
      "reviews: 캐시 제거",
      () => auditReviews(base.reviews.split(CACHE_CALL).join("noCache({")),
      /엣지 캐시를 지나지 않는다|호출이 0곳이다/,
    ],
    [
      "reviews: connectDb 를 캐시보다 앞으로 되돌림",
      () => auditReviews(base.reviews.replace(
        "async function handleList(request, env) {\n  const url",
        "async function handleList(request, env) {\n  await connectDb(env);\n  const url",
      )),
      /캐시 조회보다 앞에 있다/,
    ],
    [
      "reviews: 캐시 키에 userId 를 섞음",
      () => auditReviews(base.reviews.replace("key: `reviews:summary:v1:", "key: `reviews:summary:v1:${userId}:")),
      /캐시 키에 'userId' 이 들어갔다/,
    ],
    [
      "today: 개인화 조기 반환 제거",
      () => auditToday(base.today.replace("  if (input) {", "  if (false) {")),
      /개인화 조기 반환.*없다|캐시 조회보다 뒤에 있다/,
    ],
    [
      "today: 캐시 키에 birth 를 섞음",
      () => auditToday(base.today.replace("key: `today-hub:v1:", "key: `today-hub:v1:${birth}:")),
      /캐시 키에 'birth' 이 들어갔다/,
    ],
    [
      "today: 실패를 throw 대신 반환",
      () => auditToday(base.today.replace('if (!payload) throw new Error("TODAY_HUB_UNAVAILABLE");', "if (!payload) return null;")),
      /계산 실패가 캐시에 들어간다/,
    ],
    [
      "today: 캐시 호출을 하나 더 추가(개인화 분기에 붙임)",
      () => auditToday(base.today.replace("  if (input) {", `  if (input) {\n    await ${CACHE_CALL} key: \`x\` });`)),
      /호출이 2곳이다/,
    ],
    [
      "insights: 캐시 제거",
      () => auditInsights(base.insights.split(CACHE_CALL).join("noCache({")),
      /엣지 캐시를 지나지 않는다|호출이 0곳이다/,
    ],
    [
      "insights: connectDb 를 캐시보다 앞으로 되돌림",
      () => auditInsights(base.insights.replace(
        "async function handleInsightsList(request, env) {\n",
        "async function handleInsightsList(request, env) {\n  await connectDb(env);\n",
      )),
      /handleInsightsList: connectDb 가 캐시 조회보다 앞에 있다/,
    ],
    [
      "insights: 상세 404 를 throw 대신 반환",
      () => auditInsights(base.insights.replace('throw new Error("INSIGHT_NOT_FOUND");', "return null;")),
      /없는 슬러그가 캐시에 들어간다/,
    ],
    [
      "insights: 상세 캐시 키에 cookie 를 섞음",
      () => auditInsights(base.insights.replace("key: insightDetailCacheKey(slug),", "key: insightDetailCacheKey(slug + cookie),")),
      /캐시 키에 'cookie' 이 들어갔다|상수·insightDetailCacheKey\(slug\) 만 허용/,
    ],
    [
      "insights: shareUrl 을 캐시 안으로 옮김",
      () => auditInsights(base.insights.replace("item: { ...value.item, shareUrl: buildShareUrl(request, value.item.slug) },", "item: value.item,")),
      /shareUrl 이 캐시 밖에서 붙지 않는다/,
    ],
    [
      "content: 피드 캐시 제거",
      () => auditContentFeed(base.content.split(CACHE_CALL).join("noCache({")),
      /엣지 캐시를 지나지 않는다|호출이 0곳이다/,
    ],
    [
      "content: 목록에도 캐시를 붙임(필터별 키)",
      () => auditContentFeed(base.content.replace("async function handleContentList(request, env) {", `async function handleContentList(request, env) {\n  await ${CACHE_CALL} key: \`content:list:\${q}\` });`)),
      /호출이 2곳이다/,
    ],
  ];

  let ok = true;
  for (const [label, run, expected] of mutations) {
    const found = run();
    const matched = found.some((message) => expected.test(message));
    if (matched) {
      console.log(`  ✓ ${label}`);
    } else {
      ok = false;
      console.error(`  ✗ ${label} — 이 변형이 통과했다. 단언이 공허하다.`);
      for (const f of found) console.error(`      ${f}`);
    }
  }
  return ok;
}

function main() {
  const selfTest = process.argv.includes("--self-test");

  console.log("=== 공개 API 엣지 캐시 ===");
  const failures = [
    ...auditReviews(read(REL.reviews)),
    ...auditToday(read(REL.today)),
    ...auditInsights(read(REL.insights)),
    ...auditContentFeed(read(REL.content)),
  ];

  if (failures.length) {
    console.error("\n실패:");
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exitCode = 1;
    return;
  }
  console.log("  ✓ worker/routes/reviews.js — handleList·handleSummary 가 캐시를 먼저 본다");
  console.log("  ✓ worker/routes/fortune-today.js — 공개 모드만 캐시하고 개인화는 앞에서 반환한다");
  console.log("  ✓ worker/routes/insights.js — 목록·상세가 캐시를 먼저 보고, 404 는 캐시하지 않는다");
  console.log("  ✓ worker/routes/content.js — sitemap·rss 피드만 캐시한다");

  if (selfTest) {
    console.log("\n=== self-test (변형이 실제로 실패하는가) ===");
    if (!runSelfTest()) {
      process.exitCode = 1;
      return;
    }
    console.log("\nself-test passed (14 mutations)");
  }

  console.log("\nOK");
}

main();
