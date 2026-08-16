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
import { kstYmdToday, kstYmdTomorrow } from "./lib/fortune-date.mjs";

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
  if (period === "tomorrow") return kstYmdTomorrow();
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

async function checkOnce(period, sign, todayYmd) {
  const url = `${origin}/fortune/${period}/${sign}/`;
  let response;
  try {
    response = await fetch(url, { redirect: "follow" });
  } catch (error) {
    return { url, ok: false, reason: `fetch 실패: ${error?.message || error}` };
  }
  if (!response.ok) {
    return { url, ok: false, reason: `HTTP ${response.status}` };
  }
  const html = await response.text();

  // 4개월간 서빙됐던 정확한 실패 모습이다. 200 이면서 본문이 비어 있었다.
  if (html.includes("운세를 불러오는 중입니다")) {
    return { url, ok: false, reason: "빈 셸('운세를 불러오는 중입니다')이 서빙되고 있습니다" };
  }

  const found = extractArticleDate(html);
  if (!found) {
    return { url, ok: false, reason: "Article JSON-LD 의 datePublished 를 찾지 못했습니다" };
  }
  const expected = expectedDateFor(period, todayYmd);
  if (found !== expected) {
    return { url, ok: false, reason: `날짜가 낡았습니다 — 기대 ${expected}, 실제 ${found}` };
  }
  return { url, ok: true, date: found };
}

async function runPass() {
  const todayYmd = kstYmdToday();
  const periods = discoverPeriods();
  const sign = discoverSignIds()[0];
  const results = [];
  for (const period of periods) {
    results.push({ period, ...(await checkOnce(period, sign, todayYmd)) });
  }
  return { todayYmd, results };
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

console.log(`[fortune-freshness] origin=${origin} KST today=${pass.todayYmd}`);
for (const result of pass.results) {
  console.log(`  ${result.ok ? "OK  " : "FAIL"} ${result.period.padEnd(8)} ${result.url} ${result.ok ? result.date : `— ${result.reason}`}`);
}

const failed = pass.results.filter((r) => !r.ok);
if (failed.length > 0) {
  console.error(
    `\n[fortune-freshness] ${failed.length}개 기간이 낡았습니다. ` +
      "fortune-daily-publish.yml 이 릴리스를 깨우지 못했거나 릴리스가 실패했습니다 — Actions 로그를 확인하세요.",
  );
  process.exit(1);
}

console.log("[fortune-freshness] 통과 — 4개 기간 모두 오늘 기준입니다.");
