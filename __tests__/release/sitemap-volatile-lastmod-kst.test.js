/**
 * 매일 갱신되는 운세 라우트의 사이트맵 `lastmod` 가 **KST 달력 날짜**인지 지킨다.
 *
 * 지키는 사고 (2026-08-28 실측): `/fortune/today/aries/` 가 08-28 자 본문을 서빙하는데
 * 사이트맵은 `<lastmod>2026-08-27</lastmod>` 로 신고하고 있었다. 원인은 lastmod 를 UTC 로
 * 계산한 것이다(generate-sitemap.mjs 의 `today`). 발행 워크플로는 00:10 KST = 15:10 UTC
 * **전날**에 도니, 발행 빌드가 만드는 사이트맵은 언제나 콘텐츠보다 하루 이른 날짜를 단다.
 * 구글은 IndexNow 를 받지 않으므로 이 lastmod 가 재크롤을 부르는 **유일한 신호**인데,
 * 그 신호가 매일 하루씩 낡아 있었다.
 *
 * 🔴 이 어긋남은 **KST 00:00~09:00 사이에만** 관측된다(그 밖의 시간엔 UTC 와 KST 날짜가 같다).
 * 그래서 "지금 돌려 보기"로는 잡히지 않고, 날짜를 주입해 판정해야 한다.
 *
 * 🔴 판정 로직만 보면 "함수는 맞는데 아무도 안 부르는" 상태를 놓친다. 그래서 ①원장의 판정과
 * ②그 값을 실제로 넘기는 배선, ③같은 규칙을 공유해야 하는 IndexNow 델타까지 함께 본다.
 * ③이 빠지면 운세 URL 50개가 델타에서 통째로 빠져 **매일 바뀌는 그 페이지들만** 통보를 못 받는다.
 *
 * 🔴 jest 가 아니라 node:test 다. `scripts/**` 는 tier=standard 로 분류돼 jest(critical 티어)가
 * 스킵되는데, `test:node` 는 PR CI 의 fast 잡에 있어 티어와 무관하게 항상 돈다.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const LEDGER_MODULE = path.join(root, "scripts", "lib", "sitemap-lastmod.mjs");
const GENERATOR = path.join(root, "scripts", "generate-sitemap.mjs");
const INDEXNOW = path.join(root, "scripts", "indexnow-submit.mjs");

// 자정~09시 KST 구간을 재현한다 — UTC 는 아직 어제, KST 는 이미 오늘인 상태.
//
// 🔴 날짜를 상수로 박지 않는다. 판정이 `max(저장된 lastmod, 주기 날짜)` 라(아래 pickProbeThursday
//    주석과 같은 이유), 원장을 다시 만든 날이 그 상수를 지나는 순간 max 가 저장값을 돌려주고
//    이 단언이 깨진다 — 실제로 깨졌다(2026-08-29: 원장의 휘발성 lastmod 가 08-29 로 올라가자
//    하드코딩된 KST_DAY="2026-08-28" 단언이 '2026-08-29' 를 받고 실패). 저장값보다 뒤인
//    **연속 이틀**을 골라야 UTC/KST 의 하루 차이가 그대로 드러난다.
const { utcDay: UTC_DAY, kstDay: KST_DAY } = pickProbeDayPair();

/** 매일 바뀌는 일일 패키지를 읽는 대표 라우트. 구조가 바뀌면 아래 단언이 먼저 깨진다. */
const VOLATILE_ROUTE = "/fortune/today/aries/";

function readSource(filePath) {
  assert.ok(fs.existsSync(filePath), `${path.relative(root, filePath)} 가 없습니다.`);
  return fs.readFileSync(filePath, "utf8");
}

test("휘발성 운세 라우트의 lastmod 는 UTC 가 아니라 KST 날짜를 쓴다", async () => {
  const { createSitemapLastmodLedger } = await import(pathToFileURL(LEDGER_MODULE).href);
  const ledger = createSitemapLastmodLedger({
    rootDir: root,
    today: UTC_DAY,
    volatileToday: KST_DAY,
    previousSitemapPath: path.join(root, "sitemap.xml"),
  });

  // 이 라우트가 정말 휘발성으로 분류되는지 먼저 확인한다. 분류가 깨지면 아래 단언은
  // "우연히 통과" 할 수 있으므로, 통과가 아니라 실패가 되게 여기서 끊는다.
  const decided = ledger.lastmodFor(VOLATILE_ROUTE);
  assert.ok(
    ledger.volatileRoutes().has(VOLATILE_ROUTE),
    `${VOLATILE_ROUTE} 가 휘발성으로 분류되지 않았습니다. ` +
      "RUNTIME_DATA_MODULES 나 app/fortune/[period]/[sign] 의 의존 그래프가 바뀌었는지 확인하세요.",
  );

  assert.equal(decided, KST_DAY, `${VOLATILE_ROUTE} 의 lastmod 가 KST 날짜가 아닙니다.`);
  assert.notEqual(decided, UTC_DAY, "UTC 날짜가 그대로 나갔습니다 — 이 테스트가 막으려는 바로 그 회귀입니다.");
});

test("휘발성이 아닌 라우트는 KST 로 밀리지 않는다", async () => {
  const { createSitemapLastmodLedger } = await import(pathToFileURL(LEDGER_MODULE).href);
  const ledger = createSitemapLastmodLedger({
    rootDir: root,
    today: UTC_DAY,
    volatileToday: KST_DAY,
    previousSitemapPath: path.join(root, "sitemap.xml"),
  });

  // 원장에서 휘발성이 아닌 라우트를 전수 발견해 고른다 — 손으로 경로를 적으면 그 라우트가
  // 사라졌을 때 테스트가 조용히 무의미해진다(CLAUDE.md 원칙 10).
  const stored = JSON.parse(readSource(path.join(root, "config", "sitemap-lastmod.json"))).routes;
  const candidates = Object.keys(stored).filter(
    (pathname) => !pathname.startsWith("/fortune/") && stored[pathname].lastmod !== KST_DAY,
  );
  assert.ok(candidates.length > 0, "휘발성이 아닌 비교 대상 라우트를 원장에서 찾지 못했습니다.");

  for (const pathname of candidates.slice(0, 20)) {
    const lastmod = ledger.lastmodFor(pathname);
    assert.notEqual(
      lastmod,
      KST_DAY,
      `${pathname} 이 KST 날짜를 받았습니다 — volatileToday 가 휘발성 라우트 밖으로 샜습니다.`,
    );
  }
});

/**
 * 기준 날짜를 **원장에서** 만든다. 시계를 읽으면 이 테스트가 도는 날에 따라 결과가 갈리고,
 * 상수를 박으면 원장을 다시 만든 날이 그 상수를 지나는 순간 조용히 무의미해진다
 * (판정이 `max(저장된 lastmod, 주기 날짜)` 라 저장값보다 뒤인 날짜를 골라야 주기가 드러난다).
 */
function latestLedgerYmd() {
  const stored = JSON.parse(readSource(path.join(root, "config", "sitemap-lastmod.json"))).routes;
  const latest = Object.values(stored)
    .map((entry) => entry.lastmod)
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value || ""))
    .sort()
    .pop();
  assert.ok(latest, "원장에서 lastmod 를 하나도 읽지 못했습니다.");
  return latest;
}

/** 원장의 마지막 날짜보다 뒤인 연속 이틀 — 앞이 UTC(어제), 뒤가 KST(오늘)를 흉내낸다. */
function pickProbeDayPair() {
  const [y, m, d] = latestLedgerYmd().split("-").map(Number);
  const ymd = (offset) => new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10);
  return { utcDay: ymd(14), kstDay: ymd(15) };
}

function pickProbeThursday() {
  const latest = latestLedgerYmd();

  const [y, m, d] = latest.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d + 14));
  // 목요일(4)로 맞춘다 — 주 시작(월)과 다른 요일이어야 "주기가 실제로 걸렸는지" 가 보인다.
  probe.setUTCDate(probe.getUTCDate() + ((4 - probe.getUTCDay() + 7) % 7));
  const thursday = probe.toISOString().slice(0, 10);
  probe.setUTCDate(probe.getUTCDate() - 3);
  return { thursday, monday: probe.toISOString().slice(0, 10) };
}

test("주간 라우트의 lastmod 는 주 시작일에 멈추고, 오늘·내일·월간만 날마다 올라간다", async () => {
  // 지키는 사고 (2026-08-28): /fortune/** 100개가 전부 매일 lastmod 를 올렸다. 주간 50쪽은
  // 주 단위로만 바뀌므로 나머지 6일치는 거짓 신호였다 — 구글에게 재크롤 신호는 이것 하나뿐이라
  // 거짓이 쌓이면 신호 자체가 무시된다.
  const { createSitemapLastmodLedger } = await import(pathToFileURL(LEDGER_MODULE).href);
  const { thursday, monday } = pickProbeThursday();
  const ledger = createSitemapLastmodLedger({
    rootDir: root,
    today: thursday,
    volatileToday: thursday,
    previousSitemapPath: path.join(root, "sitemap.xml"),
  });

  assert.equal(ledger.lastmodFor("/fortune/weekly/"), monday, "주간 허브가 주 시작일을 쓰지 않습니다.");
  assert.equal(ledger.lastmodFor("/fortune/weekly/pig/"), monday, "주간 상세가 주 시작일을 쓰지 않습니다.");
  assert.equal(ledger.lastmodFor("/fortune/today/aries/"), thursday, "오늘 운세가 그날 날짜를 잃었습니다.");
  assert.equal(ledger.lastmodFor("/fortune/tomorrow/pig/"), thursday, "내일 운세가 그날 날짜를 잃었습니다.");

  // 🔴 월간이 여기 daily 로 남아 있는 것은 의도다. lib/fortune/range-data.ts 의 loadMonthRange 가
  //    **오늘**을 앵커로 잡아 월건·달 위상·점수를 계산하므로 월간 HTML 도 날마다 달라진다.
  //    앵커를 달 1일로 옮기는 작업을 하게 되면 이 단언과 FORTUNE_VOLATILE_CADENCES 를 함께 고친다.
  assert.equal(
    ledger.lastmodFor("/fortune/monthly/pig/"),
    thursday,
    "월간이 월 주기로 바뀌었습니다 — 앵커(loadMonthRange)를 함께 옮기지 않았다면 진짜 변경을 숨기게 됩니다.",
  );
});

test("generate-sitemap 이 KST 날짜를 실제로 원장에 넘긴다", () => {
  const source = readSource(GENERATOR);
  assert.match(
    source,
    /import \{ kstYmdToday \} from "\.\/lib\/fortune-date\.mjs";/,
    "generate-sitemap.mjs 가 kstYmdToday 를 가져오지 않습니다.",
  );
  assert.match(source, /const volatileToday = kstYmdToday\(\);/, "volatileToday 를 KST 로 계산하지 않습니다.");
  assert.match(
    source,
    /createSitemapLastmodLedger\(\{[\s\S]*?volatileToday,[\s\S]*?\}\)/,
    "계산한 volatileToday 를 원장에 넘기지 않습니다 — 값만 만들고 배선이 빠진 상태입니다.",
  );
});

test("IndexNow 델타가 UTC·KST 두 날짜를 모두 신선으로 본다", () => {
  const source = readSource(INDEXNOW);
  assert.match(
    source,
    /import \{ kstYmdToday \} from "\.\/lib\/fortune-date\.mjs";/,
    "indexnow-submit.mjs 가 kstYmdToday 를 가져오지 않습니다.",
  );
  assert.match(
    source,
    /const freshDates = new Set\(\[today, volatileToday\]\);/,
    "델타 기준 날짜 집합이 UTC·KST 두 값을 담고 있지 않습니다.",
  );
  assert.match(
    source,
    /entries\.filter\(\(entry\) => freshDates\.has\(entry\.lastmod\)\)/,
    "델타 필터가 freshDates 를 쓰지 않습니다 — 운세 URL 이 통보 대상에서 빠집니다.",
  );
});
