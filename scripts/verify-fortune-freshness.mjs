/**
 * 프로덕션의 /fortune/{period}/{sign} 이 **그날의 날짜**를 들고 있는지 단언한다.
 *
 * 왜 필요한가 — 이 클러스터는 한 번 조용히 죽은 전력이 있다.
 *   2026-04-29 `26b192f95` 가 워크플로 파일을 `.bak` 으로 rename 하면서
 *   fortune-daily-publish.yml 이 싸잡혔고, 2026-05-04 `2938a72ad` 가 `.bak` 을 청소하며
 *   완전히 사라졌다. 그 뒤 4개월간 운세 페이지가 빈 셸로 서빙됐는데 **에러가 나지 않아
 *   아무도 몰랐다.** HTTP 는 200 이었고 릴리스도 초록불이었다.
 *
 * landing-watchdog 이 이걸 못 잡는 이유 — 그쪽이 보는 것은 "프로덕션 SHA == main HEAD" 다.
 * 운세는 **SHA 가 같아도 낡을 수 있는 유일한 축**이다(날짜가 빌드 시각에 굳는다).
 * 즉 발행이 멈추면 워치독은 계속 초록불을 낸다. 그 사각을 메우는 것이 이 가드다.
 *
 * 🔴 외부 API·LLM 호출 0 — 검사 대상 오리진에 GET 만 한다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { kstYmdToday, kstYmdNextDay } from "./lib/fortune-date.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const DEFAULT_ORIGIN = "https://code-destiny.com";

function readArg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3).trim() : fallback;
}

const origin = String(readArg("origin", process.env.CD_PRODUCTION_ORIGIN || DEFAULT_ORIGIN)).replace(/\/+$/, "");
const waitMinutes = Number(readArg("wait-minutes", "0"));
const pollSeconds = Number(readArg("poll-seconds", "60"));

/**
 * 🔴 업무 날짜는 한 번만 정하고 폴링 내내 바꾸지 않는다.
 *
 * 발행 워크플로는 자기가 목표한 날짜를 --expect-date 로 넘긴다 — 재야 하는 것은
 * "지금 몇 시인가"가 아니라 "이 발행이 도달했는가"이기 때문이다. 폴링 도중 시계를
 * 다시 읽으면 자정 경계에서 기대값이 조용히 옮겨간다. 사람이 손으로 돌릴 때는
 * KST 오늘이 기본값이라 기존 사용법이 그대로 동작한다.
 */
const businessDate = String(readArg("expect-date", kstYmdToday())).trim();
if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) {
  throw new Error(`[fortune-freshness] --expect-date 는 YYYY-MM-DD 여야 합니다. 받은 값: ${businessDate}`);
}

/**
 * 🔴 대상 목록을 손으로 적지 않는다(코딩 원칙 10). 라우트를 만드는 바로 그 파일에서
 *    전수 발견하고, 구조가 바뀌어 못 읽으면 통과가 아니라 실패다.
 */
function discoverPeriods() {
  const source = readFileSync(path.join(root, "lib", "fortune", "periods.ts"), "utf8");
  const match = source.match(/FORTUNE_PERIOD_IDS[^=]*=\s*\[([^\]]*)\]/);
  const ids = match ? [...match[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]) : [];
  if (ids.length === 0) {
    throw new Error("[fortune-freshness] lib/fortune/periods.ts 에서 FORTUNE_PERIOD_IDS 를 읽지 못했습니다.");
  }
  return ids;
}

function discoverSignIds() {
  const source = readFileSync(path.join(root, "lib", "fortune", "sign-profiles.ts"), "utf8");
  const ids = [...source.matchAll(/^\s{4}id:\s*"([a-z]+)",/gm)].map((m) => m[1]);
  const unique = [...new Set(ids)];
  if (unique.length !== 24) {
    throw new Error(
      `[fortune-freshness] lib/fortune/sign-profiles.ts 에서 24종을 찾지 못했습니다(발견 ${unique.length}종).`,
    );
  }
  return unique;
}

/**
 * 주 시작 요일은 lib/fortune/range-data.ts 의 WEEK_STARTS_ON_MONDAY 가 정본이다.
 * 여기서 같은 판정을 다시 정의하지 않고, 값이 바뀌면 가드가 멈추도록 읽어서 확인한다.
 */
function assertWeekStartsOnMonday() {
  const source = readFileSync(path.join(root, "lib", "fortune", "range-data.ts"), "utf8");
  if (!/WEEK_STARTS_ON_MONDAY\s*=\s*true/.test(source)) {
    throw new Error(
      "[fortune-freshness] WEEK_STARTS_ON_MONDAY 가 true 가 아닙니다. 주간 기대값 계산을 함께 고쳐야 합니다.",
    );
  }
}

function ymdToUtc(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcToYmd(date) {
  return date.toISOString().slice(0, 10);
}

/** 각 기간 페이지의 Article JSON-LD `datePublished` 가 가져야 할 날짜(KST 달력 기준) */
function expectedDateFor(period, todayYmd) {
  if (period === "today") return todayYmd;
  if (period === "tomorrow") return kstYmdNextDay(todayYmd);
  if (period === "monthly") return `${todayYmd.slice(0, 7)}-01`;
  if (period === "weekly") {
    const today = ymdToUtc(todayYmd);
    // getUTCDay: 0=일 … 1=월. 월요일 시작이므로 일요일은 6일 전이 주 시작이다.
    const offset = (today.getUTCDay() + 6) % 7;
    today.setUTCDate(today.getUTCDate() - offset);
    return utcToYmd(today);
  }
  throw new Error(`[fortune-freshness] 기대값 규칙이 없는 기간입니다: ${period}. 이 가드를 함께 고치세요.`);
}

function extractArticleDate(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  for (const block of blocks) {
    let parsed;
    try {
      parsed = JSON.parse(block[1]);
    } catch {
      continue;
    }
    if (parsed && parsed["@type"] === "Article" && typeof parsed.datePublished === "string") {
      return parsed.datePublished.slice(0, 10);
    }
  }
  return null;
}

/** 엣지 캐시가 옛 응답을 물고 있는지 판단할 수 있는 헤더만 추린다. */
function readCacheHeaders(response) {
  return {
    status: response.headers.get("cf-cache-status") || "-",
    age: response.headers.get("age") || "-",
    control: response.headers.get("cache-control") || "-",
  };
}

async function checkOnce(period, sign, todayYmd) {
  const url = `${origin}/fortune/${period}/${sign}/`;
  const expected = expectedDateFor(period, todayYmd);
  let response;
  try {
    response = await fetch(url, { redirect: "follow" });
  } catch (error) {
    return { url, expected, found: null, cache: null, ok: false, reason: `fetch 실패: ${error?.message || error}` };
  }
  const cache = readCacheHeaders(response);
  if (!response.ok) {
    return { url, expected, found: null, cache, ok: false, reason: `HTTP ${response.status}` };
  }
  const html = await response.text();

  // 4개월간 서빙됐던 정확한 실패 모습이다. 200 이면서 본문이 비어 있었다.
  if (html.includes("운세를 불러오는 중입니다")) {
    return { url, expected, found: null, cache, ok: false, reason: "빈 셸('운세를 불러오는 중입니다')이 서빙되고 있습니다" };
  }

  const found = extractArticleDate(html);
  if (!found) {
    return { url, expected, found: null, cache, ok: false, reason: "Article JSON-LD 의 datePublished 를 찾지 못했습니다" };
  }
  if (found !== expected) {
    return { url, expected, found, cache, ok: false, reason: `날짜가 낡았습니다 — 기대 ${expected}, 실제 ${found}` };
  }
  return { url, expected, found, cache, ok: true, date: found };
}

async function runPass() {
  const periods = discoverPeriods();
  const sign = discoverSignIds()[0];
  const results = [];
  for (const period of periods) {
    results.push({ period, ...(await checkOnce(period, sign, businessDate)) });
  }
  return { todayYmd: businessDate, results };
}

/**
 * 실패했을 때 "어느 단계가 문제인가"를 좁히기 위한 재료.
 *
 * 이 가드가 빨간불이면 원인은 크게 셋이다 — ① 릴리스가 배포되지 않았다 ② 배포는 됐는데
 * 그날의 데이터가 생성되지 않았다 ③ 엣지가 옛 응답을 물고 있다. 셋은 대응이 완전히 다른데
 * 날짜 하나만 찍혀 있으면 구분할 수 없어 매번 Actions 로그를 처음부터 뒤지게 된다.
 */
async function readLiveBuild() {
  try {
    const res = await fetch(`${origin}/version.json`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const json = await res.json();
    const commit = String(json.commit || json.gitSha || "").trim();
    const buildTime = String(json.buildTime || "").trim();
    return { commit: commit.slice(0, 12) || "-", buildTime };
  } catch {
    return null;
  }
}

/** 그날의 일일 패키지가 실제로 발행됐는지. 없으면 빌드가 아니라 생성 단계의 문제다. */
async function probeDailyData(dates) {
  const probes = [];
  for (const date of dates) {
    const url = `${origin}/fortune/data/daily-${date}.json`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      probes.push({ date, url, status: res.status });
    } catch (error) {
      probes.push({ date, url, status: 0, error: error?.message || String(error) });
    }
  }
  return probes;
}

function kstDatePartOf(isoTimestamp) {
  if (!isoTimestamp) return null;
  const when = new Date(isoTimestamp);
  if (Number.isNaN(when.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(when);
}

// 주간 기대값을 계산하기 전에 확인한다 — 폴링을 다 돌고 나서 규약을 검사하면
// 잘못된 기대값으로 몇 분을 기다린 뒤에야 그 사실을 알게 된다.
assertWeekStartsOnMonday();

const deadline = Date.now() + Math.max(0, waitMinutes) * 60_000;
let pass = await runPass();

while (pass.results.some((r) => !r.ok) && Date.now() < deadline) {
  const failing = pass.results.filter((r) => !r.ok).map((r) => r.period).join(", ");
  console.log(`[fortune-freshness] 아직 갱신되지 않음(${failing}). ${pollSeconds}초 뒤 재확인합니다.`);
  await new Promise((resolve) => setTimeout(resolve, Math.max(5, pollSeconds) * 1000));
  pass = await runPass();
}

const failed = pass.results.filter((r) => !r.ok);

console.log(`\n[fortune-freshness] origin=${origin}  기준 날짜(KST)=${pass.todayYmd}`);
console.log("");
console.log("  기간      기대          실제          판정");
for (const result of pass.results) {
  console.log(
    `  ${result.period.padEnd(9)} ${String(result.expected).padEnd(13)} ` +
      `${String(result.found ?? "-").padEnd(13)} ${result.ok ? "OK" : "FAIL"}`,
  );
}
for (const result of failed) {
  console.log(`    ↳ ${result.period}: ${result.url} — ${result.reason}`);
}

if (failed.length > 0) {
  const build = await readLiveBuild();
  const buildDateKst = kstDatePartOf(build?.buildTime);
  const probes = await probeDailyData([pass.todayYmd, kstYmdNextDay(pass.todayYmd)]);
  const missingData = probes.filter((probe) => probe.status !== 200);
  const cached = pass.results.find((r) => !r.ok && r.cache && /HIT/i.test(r.cache.status));

  console.error("\n  진단");
  console.error(
    `    라이브 빌드   commit=${build?.commit ?? "읽지 못함"} buildTime=${build?.buildTime || "-"}` +
      `${buildDateKst ? ` (KST ${buildDateKst})` : ""}`,
  );
  for (const probe of probes) {
    console.error(`    일일 데이터   ${probe.url} → HTTP ${probe.status || "요청 실패"}`);
  }
  for (const result of pass.results) {
    if (!result.cache) continue;
    console.error(
      `    엣지 캐시     ${result.period.padEnd(9)} cf-cache-status=${result.cache.status}` +
        ` age=${result.cache.age} cache-control=${result.cache.control}`,
    );
  }

  let hint;
  if (!build) {
    hint = "프로덕션 /version.json 을 읽지 못했습니다. 오리진 자체가 정상인지 먼저 보세요.";
  } else if (buildDateKst && buildDateKst < pass.todayYmd) {
    hint =
      `라이브 빌드가 KST ${buildDateKst} 자입니다 — 오늘의 릴리스가 배포되지 않았습니다. ` +
      "릴리스 런의 'Deploy Pages and Worker' 스텝을 보세요. deploy-safe 가 '이미 라이브'로 " +
      "자기중단했다면 디스패치에 allow_redeploy=true 가 빠진 것이고, --pages-only 로 거부됐다면 " +
      "라이브 Worker 가 main HEAD 가 아니라는 뜻입니다(그 경우 Worker 를 포함한 릴리스가 먼저 나가야 합니다).";
  } else if (missingData.length > 0) {
    hint =
      `빌드는 오늘 것인데 ${missingData.map((p) => p.date).join(", ")} 의 일일 패키지가 없습니다 — ` +
      "prebuild:cf 의 scripts/fortune-build-data.mjs 단계를 보세요.";
  } else if (cached) {
    hint =
      `엣지가 캐시된 응답을 돌려주고 있습니다(${cached.period}: ${cached.cache.status}, age=${cached.cache.age}). ` +
      "해당 경로만 퍼지하세요.";
  } else {
    hint =
      "빌드도 데이터도 오늘 것인데 HTML 의 날짜만 다릅니다 — 페이지 렌더 경로가 " +
      "일일 패키지를 읽지 못하고 있습니다(app/fortune/**).";
  }
  console.error(`    추정          ${hint}`);

  console.error(`\n[fortune-freshness] ${failed.length}개 기간이 낡았습니다.`);
  process.exit(1);
}

console.log(`\n[fortune-freshness] 통과 — ${pass.results.length}개 기간 모두 ${pass.todayYmd} 기준입니다.`);
