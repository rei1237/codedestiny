#!/usr/bin/env node
/**
 * 색인 대상 라우트의 **문장급 본문** 깊이 가드.
 *
 * 왜 raw 글자수로는 부족한가 (2026-08-24 실측):
 *   기존 콘텐츠 게이트(`verify-adsense-readiness.mjs` 의 minimumBlockedIndexableVisibleTextLength
 *   = 1,800자)는 태그를 걷어낸 **모든** 글자를 센다. 그래서 두 방향으로 샌다.
 *
 *   ① 링크 라벨·배지·목록 항목이 본문으로 계산된다. 푸터에 링크를 열 개 걸면 게이트 수치가
 *      올라간다. 실제로 `/oracle/sikojen-povailu` 는 "겉보기 1,231자" 였는데 40자 넘는 조각을
 *      직접 찍어 보니 11개 중 10개가 **푸터 환불정책 문구**였다(#1072 에서 걷어냈다).
 *   ② 사이트 공용 문구(푸터·고지·편집 방침)가 페이지마다 다시 계산된다. 색인 페이지 372개 중
 *      278쪽에 똑같이 실리는 조각이 셋 있었다.
 *
 * 그래서 이 가드는 네 가지를 한다:
 *   ⓐ 태그 경계로 자른 조각 중 **40단위 이상**만 센다 — 링크 라벨·버튼·배지는 자연히 빠진다.
 *   ⓑ 한 페이지 안에서 같은 조각은 한 번만 센다.
 *   ⓒ 색인 페이지 BOILERPLATE_MIN_DOCS 쪽 이상에 등장하는 조각은 **사이트 furniture** 로 보고
 *      전부 뺀다. 목록을 손으로 적지 않고 산출물에서 계산하므로(원칙 10) 새 공용 문구가
 *      생겨도 자동으로 잡힌다.
 *   ⓓ 길이를 글자 수가 아니라 **표기 단위**로 잰다 — 한자는 2, 나머지는 1.
 *
 * ⓓ 를 왜 넣었나 (2026-08-24, 이 가드 자신의 결함):
 *   처음에는 글자 수로만 쟀다. 그런데 한자는 한 글자가 담는 정보가 한글·라틴의 두 배 가까워서,
 *   제대로 쓰인 중국어 문장(20~35자)이 40자 문턱 아래로 통째로 떨어졌다. 그 결과 zh·zh-TW
 *   라우트에서 문턱을 넘는 조각이 **결제 정책 문단뿐**이 되어, 가드가 본문이 아니라
 *   보일러플레이트 분량을 재고 있었다.
 *   실측으로 잡아낸 경위: /zh/ziwei 와 /zh/today 의 40자+ 조각 Jaccard 가 100% 로 나와
 *   "두 페이지가 같은 본문" 이라고 판단했는데, 산출물을 직접 열어 보니 각각 紫微斗数·今日运势
 *   내용이 제대로 들어 있었다. 같았던 것은 본문이 아니라 두 페이지가 함께 싣는 정책 문구였다.
 *   가중치를 넣으면 같은 라우트가 2,302~3,526 으로 중간 이상에 자리한다.
 *   🔴 그러므로 이 지표로 "이 라우트는 본문이 얇다" 를 말하기 전에, 언어가 무엇인지 먼저 볼 것.
 *
 * 임계값 근거 — 도입 시점 (2026-08-24, dist/ 색인 372개 실측):
 *   최소 755(/destiny-poker) · p05 1,004 · 중앙 1,922. 700 으로 시작했다.
 *   그때 noindex 였던 "JS 안에 갇힌" 라우트는 그 값으로 전부 걸렸다 —
 *   /oracle/ifa 0 · /saju/love-simulation 0 · /neo-operation-room 45 · /saju-guardian 97 ·
 *   /saju/destiny-bias 173 · /tarot/healing 635.
 *
 * 임계값 근거 — 현재 (2026-08-24 후반, dist/ 색인 377개 실측):
 *   700 미만이 아니라 **900 미만이던 라우트 4개**를 채우고 임계를 900 으로 올렸다.
 *     /destiny-poker 755 → 1,612   (게임 데이터 SUITS·HAND_FORTUNES 를 안내로 노출)
 *     /tarot/love    792 → 1,0xx   (relationship_six_card 의 가중치·읽는 법 2개 추가)
 *     /saju/sibyl    822 → 1,2xx   (결정론 근거·활용법 2개 추가)
 *     /guides    866 → 1,6xx   (허브 고유 산문 3문단)
 *   🔴 다음 상한은 929 다(/fortune/tomorrow/pig). 그 위로 올리려면 자동 생성되는
 *      /fortune/{기간}/{sign} 96개의 문안 생성기를 손봐야 하므로 별건이다.
 *
 * 표기 단위 도입 후 (2026-08-24, dist/ 색인 378개 실측):
 *   최소 937(/fortune/tomorrow/rooster) · p05 1,023 · 중앙 2,156. 임계 900 은 그대로 두었다 —
 *   가중치는 CJK 라우트만 끌어올리고 한국어·라틴 라우트는 사실상 그대로라, 하한을 바꿀 이유가
 *   없었다(929 → 937). 지표를 바꾸면서 임계까지 함께 움직이면 무엇이 무엇을 바꿨는지 못 가른다.
 *
 * fail-closed (guard-integrity G-2: 대상이 없을 때 통과시키는 가드는 가드가 아니다):
 *   ① dist/ 가 없으면 실패한다 — 빌드 전에 돌리면 "검사할 게 없어서 통과"가 된다.
 *   ② dist/sitemap.xml 이 없거나 라우트를 하나도 못 읽으면 실패한다.
 *   ③ 사이트맵에 있는데 HTML 산출물이 없으면 실패한다.
 *   ④ 문장급 본문이 임계 미만이면 실패한다.
 *
 * 🔴 사이트맵은 **산출물 안의 것**(dist/sitemap.xml)을 읽는다. 리포 루트의 추적본을 읽으면
 *    그게 낡았을 때 새 라우트가 검사 대상에서 통째로 빠진다 — verify:seo-heading-integrity 가
 *    루트본을 읽는 탓에 2026-08-24 에 /tarot/self-esteem 의 H1 2개를 로컬에서 놓쳤다.
 *
 * 한계: 서버 HTML 만 본다. 하이드레이션 후 클라이언트가 그리는 본문은 여기서 안 보인다.
 *       크롤러가 먼저 읽는 것이 서버 HTML 이므로 우선 이쪽을 막는다.
 *
 * 실행: npm run verify:indexable-prose-depth   (먼저 `npm run build:cf` 로 dist/ 가 있어야 한다)
 *       --report 를 주면 실패시키지 않고 분포만 출력한다.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, relative, sep, join } from "node:path";

const rootDir = process.cwd();
const baseDir = process.env.PROSE_DEPTH_BASE_DIR || "dist";
const reportOnly = process.argv.includes("--report");

/** 본문 조각으로 인정하는 최소 표기 단위. 이보다 짧으면 링크 라벨·배지·버튼으로 본다. */
const MIN_FRAGMENT_UNITS = 40;
/** 색인 페이지 이만큼 이상에 등장하는 조각은 사이트 공용 문구로 보고 뺀다. */
const BOILERPLATE_MIN_DOCS = 20;
/** 색인 라우트가 가져야 할 최소 문장급 본문 단위. */
const MIN_PROSE_UNITS = 900;

/**
 * 한자(CJK 통합 한자·확장 A·호환 한자). 한 글자가 담는 정보가 한글·가나·라틴의 대략 두 배라
 * 같은 내용을 절반 길이로 쓴다. 글자 수로만 재면 중국어 본문이 통째로 문턱 아래로 떨어진다.
 * 🔴 가나(ひらがな·カタカナ)와 한글은 1 로 둔다 — 일본어는 한자 비율이 30% 안팎이라
 *    자연히 그 사이 값이 되고, 한국어는 도입 시점의 기준이 그대로 유지된다.
 */
const HAN_IDEOGRAPH = /[㐀-䶿一-鿿豈-﫿]/;

/** 조각의 길이를 표기 단위로 잰다 — 한자는 2, 나머지는 1. */
function textUnits(text) {
  let total = 0;
  for (const character of text) total += HAN_IDEOGRAPH.test(character) ? 2 : 1;
  return total;
}

/**
 * 의도적으로 임계 미만인 라우트를 사유와 함께 선언한다.
 * 🔴 비어 있는 것이 정상이다. 채우기 전에 "이 페이지는 정말 본문이 없어도 되는가"를 먼저 따질 것 —
 *    본문이 없는 페이지를 색인에 제출하는 것 자체가 대개 틀린 선택이다. 색인에서 빼면 그만이다.
 */
const DECLARED_EXCEPTIONS = new Map([
  // ["/some/route", { min: 400, reason: "왜 이 페이지는 본문이 짧아도 되는지" }],
]);

function fail(message, details = []) {
  console.error(`[verify-indexable-prose-depth] FAIL: ${message}`);
  for (const line of details) console.error(`  ${line}`);
  process.exit(1);
}

function normalizeRoute(pathname) {
  return pathname.replace(/\/+$/, "") || "/";
}

/** 태그 경계로 자른 뒤 MIN_FRAGMENT_UNITS 이상인 조각만, 페이지 안에서 중복 없이 모은다. */
function collectFragments(html) {
  const stripped = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const fragments = new Set();
  for (const chunk of stripped.split(/<[^>]*>/)) {
    const text = chunk
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#\d+;/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (textUnits(text) >= MIN_FRAGMENT_UNITS) fragments.add(text);
  }
  return fragments;
}

function collectHtmlFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectHtmlFiles(full, acc);
    else if (entry.name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

const absoluteBase = resolve(rootDir, baseDir);
if (!existsSync(absoluteBase)) {
  fail(`빌드 산출물이 없다 → ${baseDir}/`, [
    "`npm run build:cf` 를 먼저 실행할 것.",
    "🔴 여기서 조용히 통과하면 이 가드는 아무것도 지키지 않는다(guard-integrity G-2).",
  ]);
}

const sitemapPath = resolve(absoluteBase, "sitemap.xml");
if (!existsSync(sitemapPath)) {
  fail(`사이트맵이 없다 → ${baseDir}/sitemap.xml`, [
    "빌드가 사이트맵을 산출물로 승격하지 못했다. `npm run build:cf` 를 다시 볼 것.",
  ]);
}

const indexedRoutes = new Set(
  [...readFileSync(sitemapPath, "utf8").matchAll(/<loc>([^<]+)<\/loc>/gi)]
    .map((match) => {
      try {
        return normalizeRoute(new URL(match[1]).pathname);
      } catch {
        return "";
      }
    })
    .filter(Boolean),
);

if (indexedRoutes.size === 0) fail(`${baseDir}/sitemap.xml 에서 라우트를 하나도 못 읽었다.`);

// ── 1차 통과: 색인 라우트의 HTML 을 찾아 조각을 모으고 문서빈도를 센다 ──────────
const pages = new Map(); // route -> Set(fragment)
const missingArtifacts = [];

for (const route of indexedRoutes) {
  const candidates = route === "/"
    ? [join(absoluteBase, "index.html")]
    : [join(absoluteBase, route, "index.html"), join(absoluteBase, `${route}.html`)];
  const file = candidates.find((candidate) => existsSync(candidate));
  if (!file) {
    missingArtifacts.push(route);
    continue;
  }
  pages.set(route, collectFragments(readFileSync(file, "utf8")));
}

if (missingArtifacts.length > 0) {
  fail(`사이트맵에 있는데 빌드 산출물이 없는 라우트 ${missingArtifacts.length}개`, [
    ...missingArtifacts.slice(0, 10).map((route) => `- ${route}`),
    "색인 대상으로 제출하는데 실제로 만들어지지 않는다면 사이트맵이나 라우트 중 하나가 틀렸다.",
  ]);
}

const documentFrequency = new Map();
for (const fragments of pages.values()) {
  for (const fragment of fragments) {
    documentFrequency.set(fragment, (documentFrequency.get(fragment) || 0) + 1);
  }
}
const boilerplate = new Set(
  [...documentFrequency.entries()].filter(([, count]) => count >= BOILERPLATE_MIN_DOCS).map(([text]) => text),
);

// ── 2차 통과: 보일러플레이트를 뺀 문장급 본문 길이를 잰다 ─────────────────────────
const measured = [];
for (const [route, fragments] of pages) {
  let prose = 0;
  for (const fragment of fragments) {
    if (!boilerplate.has(fragment)) prose += textUnits(fragment);
  }
  measured.push({ route, prose });
}
measured.sort((a, b) => a.prose - b.prose);

const violations = measured.filter(({ route, prose }) => {
  const min = DECLARED_EXCEPTIONS.get(route)?.min ?? MIN_PROSE_UNITS;
  return prose < min;
});

const thinnest = measured.slice(0, 10)
  .map(({ route, prose }) => `- ${String(prose).padStart(6)}단위  ${route}`);

if (reportOnly) {
  console.log(`[verify-indexable-prose-depth] REPORT — ${baseDir}/ 색인 ${measured.length}개`);
  console.log(`  보일러플레이트 조각 ${boilerplate.size}개 제외(${BOILERPLATE_MIN_DOCS}쪽 이상 등장)`);
  console.log("  문장급 본문 하위 10개:");
  for (const line of thinnest) console.log(`  ${line}`);
  const at = (ratio) => measured[Math.floor((measured.length - 1) * ratio)].prose;
  console.log(`  최소 ${measured[0].prose} · p05 ${at(0.05)} · 중앙 ${at(0.5)} · 최대 ${measured[measured.length - 1].prose}`);
  console.log(`  현재 임계 ${MIN_PROSE_UNITS}단위 기준 위반 ${violations.length}개`);
  process.exit(0);
}

if (violations.length > 0) {
  const details = violations.slice(0, 20).map(({ route, prose }) => {
    const min = DECLARED_EXCEPTIONS.get(route)?.min ?? MIN_PROSE_UNITS;
    return `- ${route}: 문장급 본문 ${prose}단위 (최소 ${min}단위)`;
  });
  if (violations.length > 20) details.push(`... 외 ${violations.length - 20}개`);
  details.push("");
  details.push("무엇을 세는가: 태그 경계로 자른 조각 중 40단위 이상(한자는 1자 = 2단위), 페이지 안 중복 제거,");
  details.push(`               색인 ${BOILERPLATE_MIN_DOCS}쪽 이상에 등장하는 공용 문구 제외.`);
  details.push("→ 링크·배지·푸터를 늘려도 이 수치는 오르지 않는다. 본문 문장을 늘려야 오른다.");
  details.push("");
  details.push("고치는 법 두 가지 중 하나를 고를 것:");
  details.push("  ① 서버에서 렌더되는 고유 본문을 채운다. 기능이 클라이언트에만 있는 라우트라면");
  details.push("     page.tsx 에 서버 섹션을 두는 것이 관례다(예: app/tarot/self-esteem/page.tsx).");
  details.push("     🔴 본문은 구현에서 뽑을 것 — 효능·보장을 지어내지 않는다.");
  details.push("  ② 색인 대상에서 뺀다. scripts/generate-sitemap.mjs 와 lib/seo/siteSeo.ts 의");
  details.push("     noindexPathPrefixes 는 **짝**이므로 한쪽만 고치면 「제출된 URL에 noindex」가 된다.");
  fail(`문장급 본문이 얇은 색인 라우트 ${violations.length}개`, details);
}

console.log(
  `[verify-indexable-prose-depth] OK — ${baseDir}/ 색인 ${measured.length}개 전부 문장급 본문 ${MIN_PROSE_UNITS}단위 이상`
  + ` (최소 ${measured[0].prose}단위: ${measured[0].route}, 공용 문구 ${boilerplate.size}개 제외)`
  + (DECLARED_EXCEPTIONS.size > 0 ? ` · 선언된 예외 ${DECLARED_EXCEPTIONS.size}개` : ""),
);
