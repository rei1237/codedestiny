import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  canLoadAdsense,
  canLoadAdsenseForCanonicalUrl,
} from "../app/components/adsense-route-policy.js";
import { MIN_SELF_CONSENT_AGE } from "../worker/lib/validation.js";
import { blocksEntireSite } from "./lib/robots-groups.mjs";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
// 나이 고지 마커는 정책 상수에서 파생한다. 문구를 그대로 박아두면 정책이 바뀔 때
// 검증만 옛 숫자에 남아 배포 시점에 터진다(2026-07-29 만 13세→14세 드리프트로 Pages 배포 실패).
const ageNoticeMarker = `만 ${MIN_SELF_CONSENT_AGE}세`;
const staleAgeNoticeMarker = `만 ${MIN_SELF_CONSENT_AGE - 1}세`;
const siteOrigin = "https://code-destiny.com";
// 광고 "서빙" 코드는 항상 googlesyndication(스크립트 도메인) 또는 adsbygoogle(ins/push)를 포함한다.
// google-adsense-account 검증 메타태그(소유권 확인용, 광고 미서빙)는 `ca-pub-...`만 담으므로,
// 탐지에서 bare `ca-pub`를 제외하면 빌드 미니파이 등 형태 변형에 무관하게 검증 메타태그를
// 오탐 없이 통과시키면서 실제 광고 서빙 코드만 잡을 수 있다.
const adsenseMarkers = /googlesyndication|adsbygoogle/i;
const staticAdUnitMarkupPattern = /<ins\b[^>]*class=["'][^"']*adsbygoogle|data-ad-client|data-ad-slot|adsbygoogle\.push\s*\(/i;
function embedsAdsenseCode(content) {
  return adsenseMarkers.test(String(content || ""));
}
const adsTxtRecord = "google.com, pub-9863227498729828, DIRECT, f08c47fec0942fa0";
const minimumUsefulTitleLength = 10;
const minimumVisibleTextLength = 1200;
const minimumBlockedIndexableVisibleTextLength = 1800;

const adsenseSourceScanTargets = [
  "app",
  "components",
  "lib",
  "index.html",
];

const adsenseSourceAllowedFiles = new Set([
  "app/components/DeferredAdsense.tsx",
]);

const adsenseContentFingerprintLength = 1800;

const sourceScanExtensions = new Set([
  ".html",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
]);

const indexablePublicRoutes = [
  "/about",
  "/advertising-policy",
  "/contact",
  "/contact-us",
  "/disclaimer",
  "/editorial-policy",
  "/privacy",
  "/privacy-policy",
  "/refund-policy",
  "/terms",
  "/terms-of-service",
  "/saju/guide",
  "/saju/ten-gods",
  "/saju/five-elements",
  "/ziwei/guide",
  "/sukuyo/guide",
  "/astrology/guide",
  "/vedic/guide",
  "/tarot/guide",
  "/mayan-calendar/guide",
  "/calendar/guide",
  "/health-report/guide",
  "/music/guide",
];

const adsenseAllowedContentRoutes = [
  "/about",
  "/faq",
  "/methodology",
  "/saju/guide",
  "/saju/ten-gods",
  "/saju/five-elements",
  "/ziwei/guide",
  "/sukuyo/guide",
  "/astrology/guide",
  "/vedic/guide",
  "/tarot/guide",
  "/mayan-calendar/guide",
  "/calendar/guide",
  "/music/guide",
  "/insights/saju",
  "/insights/tarot",
  "/tarot/numerology",
  "/tarot/prompt-maker",
  "/high-value",
  "/high-value/complete-guide-to-saju",
  // 상세(/insights/famous-saju/<slug>)는 전량 noindex + 사이트맵 제외로 바뀌어
  // 광고 대상이 아니다. 허브만 광고 허용 라우트로 검사한다.
  // (근중복 허브였던 `/famous-saju` 는 2026-08-17 에 라우트째 삭제했다 — 이제 허브는 여기 하나뿐이다.)
  "/insights/famous-saju",
];

const adsenseBlockedRoutes = [
  "/",
  // 2026-08-17 에 색인·광고에서 뺀 얇은 목록형·스텁 라우트의 표본. 정책 함수 단위 검사는
  // verify-adsense-route-policy.mjs 가 하고, 여기서는 **산출물 HTML 에 광고 코드가 실제로
  // 안 실렸는지**를 본다(둘은 다른 실패를 잡는다).
  // (`/famous-saju/category/actor` 는 라우트가 삭제돼 산출물이 없다 — 정책 함수 쪽 단언만
  //  verify-adsense-route-policy.mjs 에 남겼다.)
  "/high-value/category/saju-beginner",
  "/flower/destiny",
  "/advertising-policy",
  "/contact",
  "/contact-us",
  "/disclaimer",
  "/editorial-policy",
  "/health-report/guide",
  "/privacy",
  "/privacy-policy",
  "/terms",
  "/terms-of-service",
  "/login",
  "/signup",
  "/me",
  "/points",
  "/points/history",
  "/premium",
  "/premium-reports",
  "/premium/saju-lifebook",
  "/premium/saju-love-bible",
  "/premium-unlock",
  "/pdf/life-book",
  "/pdf/love-report",
  "/life-book-ai",
  "/love-secret-ai",
  "/new-year-ai-consultation",
  "/ziwei-ai",
  "/astrology-ai",
  "/vedic-ai",
  "/sukuyo-compatibility-ai",
  "/karma-destiny-ai",
  "/fortune/prompt-hub",
  "/results/demo",
  "/report/progress",
  "/saju/animal-destiny",
  "/saju/destiny-meeting-place",
  "/saju/lifebook",
  "/saju/love-bible",
  "/tarot/crystal-soul",
  "/tarot/mindscan",
  "/tarot/numerology/result",
  "/tarot/prompt-maker/result",
];

const paidFeatureRoutePrefixes = [
  "/premium",
  "/premium-unlock",
  "/pdf",
  "/points",
  "/fortune/prompt-hub",
  "/palm-reading",
  "/saju/animal-destiny",
  "/saju/destiny-bias",
  "/saju/destiny-meeting-place",
  "/saju/lifebook",
  "/saju/love-bible",
  "/saju/love-simulation",
  "/tarot/crystal-soul",
  "/tarot/mindscan",
  "/tarot/numerology/result",
  "/tarot/prompt-maker/result",
  "/ziwei/chart",
];

const privateNoindexRoutes = [
  "/admin",
  "/auth/google/callback",
  "/login",
  "/me",
  "/points",
  "/points/history",
  "/premium-unlock",
  "/signup",
];

const xRobotsNoindexHeaderPatterns = [
  "/animal/physio",
  "/animal/physio/*",
  "/maya",
  "/maya/*",
  "/oracle/royal-tea",
  "/oracle/royal-tea/*",
  "/oracle/sikojen-povailu",
  "/oracle/sikojen-povailu/*",
  "/palm-reading",
  "/palm-reading/*",
  "/pdf",
  "/pdf/*",
  "/premium",
  "/premium/*",
  "/premium-reports",
  "/premium-reports/*",
  "/saju-fpti",
  "/saju-fpti/*",
  "/saju-picture",
  "/saju-picture/*",
  "/sukuyo/calendar",
  "/sukuyo/calendar/*",
  "/404",
  "/500",
  "/blog",
  "/blog/*",
  "/famous",
  "/famous/*",
  // `/fortune` 은 2026-08-17 에 이 목록에서 뺐다 — 얇은 셸이던 시절의 판정이었고, 지금은
  // 사이트맵에 self-canonical 로 들어가는 색인 대상이다(_headers 의 같은 자리 주석 참고).
  "/fortune/sikojen-povailu",
  "/fortune/sikojen-povailu/*",
  // 셸 사본만 존재하는 라우트(app 페이지 없음). 나머지 9개는 2026-08-23 에 app 랜딩을
  // 살려 색인 대상으로 돌렸다 — docs/context/seo-and-adsense.md 참고.
  "/oracle/juyuk",
  "/oracle/juyuk/*",
  "/oracle/hwatu",
  "/oracle/hwatu/*",
  // 크롤러 가시 텍스트가 124~1,033자뿐인 인터랙티브 게임 화면.
  // (같은 사유로 묶여 있던 /neo-operation-room 은 2026-08-24 에 본문을 서버 렌더로 바꿔
  //  색인 대상으로 되돌렸다 — 여기 남은 것은 여전히 얇은 화면뿐이다.)
  "/tadagochi",
  "/tadagochi/*",
  "/blood-type-app.html",
  "/celestial-harmony.html",
  "/cosmic-soul-meditation.html",
  // destiny-poker 는 여기 없다 — 무료 기능이라 2026-08-16 에 색인 대상으로 전환했다
  // (본문 838자 → 1,918자, canonical·description·사이트맵 등재 동반).
  "/emoi_omikuji_v2.html",
  "/fortune-teller-fish.html",
  "/geomancy-oracle-v4.html",
  // 2026-08-27 추가 — 같은 셸의 `/static/` 사본. 루트 사본만 막혀 있었고 이쪽은
  // canonical·robots meta 없이 열려 있었다(out/ 전수 실측).
  "/static/geomancy-oracle-v4.html",
  "/ifa-oracle.html",
  "/ifa-oracle-about.html",
  "/neville-meditation.html",
  // 2026-08-16 추가 — 같은 부류인데 선언만 빠져 있어 색인이 열려 있었다.
  // 가시 텍스트 647자(한글 420자)로 이 목록의 어느 셸보다도 얇다.
  "/pet-saju.html",
  "/royal-tea-oracle.html",
  "/tadagochi.html",
  "/tarot-ijik.html",
  "/yoga-guru.html",
  // 사이트맵·canonical 없이 색인만 열려 있던 고아 셸. 회귀하지 않도록 게이트에 고정한다.
  "/vedic-astrology.html",
  "/myungwun_final.html",
  "/secret-house_real.html",
  "/destiny-island.html",
  "/codedestiny-novel.html",
  // 2026-08-17 추가 — AdSense 거절 대응 중 발견한 마지막 2개. 색인 신호가 전무했다
  // (헤더 규칙 0 · 사이트맵 미등재 · robots meta 없음).
  // 🔴 /ifa_oracle_v2_full 은 `/ifa-oracle*` 규칙이 하이픈이라 매칭에서 샜다 — 파일명과
  //    규칙의 구분자가 다르면 `*` 로도 못 덮는다. 그래서 이름을 통째로 고정한다.
  "/ifa_oracle_v2_full.html",
  "/prompt-hub-3004.html",
];

const sitemapRequiredRoutes = [
  "/about",
  "/contact",
  "/disclaimer",
  "/editorial-policy",
  "/faq",
  "/privacy",
  "/terms",
  "/saju/guide",
  "/saju/ten-gods",
  "/saju/five-elements",
  "/ziwei/guide",
  "/sukuyo/guide",
  "/astrology/guide",
  "/vedic/guide",
  "/tarot/guide",
  "/mayan-calendar/guide",
  "/calendar/guide",
  "/health-report/guide",
  "/music/guide",
  "/insights/ziwei-basics",
  "/insights/sukuyo-basics",
];

const sitemapForbiddenPrefixes = [
  "/admin",
  "/api",
  "/api-hello-test",
  "/auth",
  "/checkout",
  "/fail",
  "/login",
  "/me",
  "/my",
  "/payment",
  "/payments",
  "/pdf",
  "/points",
  "/premium",
  "/premium-reports",
  "/premium-unlock",
  "/profile",
  "/report/progress",
  "/result",
  "/results",
  "/signup",
  "/success",
  // `/tarot/healing` 은 2026-08-24 에 여기서 뺐다 — 사적·액션 라우트가 아니라 "본문이 얇다"는
  // 이유로 섞여 있던 항목이었고, 그 본문을 서버에서 렌더하도록 고쳐 색인 대상으로 되돌렸다.
  "/oracle/sikojen-povailu",
];

const staticShellTrustLinks = [
  "/about",
  "/privacy-policy",
  "/terms-of-service",
  "/faq",
  "/contact-us",
  "/disclaimer",
  "/editorial-policy",
  "/advertising-policy",
];

// 위 목록은 라우트 **정체**(app/<route>/page.js 가 실제로 있는 경로)이고
// policyContentExpectations 의 키이기도 하다. 그런데 사이트맵에 들어가는 정본은 짧은 별칭
// 쪽이고(scripts/generate-sitemap.mjs 가 긴 경로를 dedupe 한다), 짧은 쪽 페이지는 같은
// 컴포넌트를 재수출하며 self-canonical 이 짧은 URL 을 가리킨다(app/privacy/page.js 등).
// 그래서 **링크 존재 검사만** 별칭을 함께 인정한다 — 셸이 정본으로 링크해도 신뢰 페이지
// 도달성은 동일하기 때문이다. 본문 검사는 계속 라우트 정체를 키로 돈다.
const staticShellTrustLinkAliases = {
  "/privacy-policy": "/privacy",
  "/terms-of-service": "/terms",
  "/contact-us": "/contact",
};

const policyContentExpectations = {
  "/advertising-policy": [
    "Google AdSense",
    "쿠키",
    "웹 비콘",
    "IP",
    "광고 식별자",
    "adssettings.google.com",
    "policies.google.com/technologies/partner-sites",
    "문의",
  ],
  "/contact": [
    "Contact Us",
    "Typical response time",
    "Privacy Request Guide",
    "Please avoid sharing unnecessary sensitive data",
  ],
  "/contact-us": [
    "Contact Us",
    "Typical response time",
    "Privacy Request Guide",
    "Please avoid sharing unnecessary sensitive data",
  ],
  "/disclaimer": ["의료", "법률", "투자", "결제", "불안"],
  "/editorial-policy": ["AI", "광고", "결제", "문의"],
  "/privacy": [
    "Google",
    "adssettings.google.com",
    "policies.google.com/technologies/partner-sites",
    "쿠키",
    "IP",
    "생년월일",
    "결제",
    "이메일",
    `${MIN_SELF_CONSENT_AGE}세`,
    "삭제",
  ],
  "/privacy-policy": [
    "Google",
    "adssettings.google.com",
    "policies.google.com/technologies/partner-sites",
    "쿠키",
    "IP",
    "생년월일",
    "결제",
    "이메일",
    `${MIN_SELF_CONSENT_AGE}세`,
    "삭제",
  ],
  "/terms": ["Google AdSense", "쿠키", "결제", "환불", "문의"],
  "/terms-of-service": ["Google AdSense", "쿠키", "결제", "환불", "문의"],
};

const featureGuideRoutes = [
  "/saju/guide",
  "/saju/ten-gods",
  "/saju/five-elements",
  "/ziwei/guide",
  "/sukuyo/guide",
  "/astrology/guide",
  "/vedic/guide",
  "/tarot/guide",
  "/mayan-calendar/guide",
  "/calendar/guide",
  "/health-report/guide",
  "/music/guide",
];

const featureGuideMarkerGroups = {
  "service scope": ["살피는 것", "비추는 것"],
  "usage situation": ["어떤 때 참고하면 좋은가", "언제 참고하면 좋은가", "좋은 질문을 세우는 법"],
  "required input": ["필요한 입력값"],
  "interpretation flow": ["해석 흐름", "감상 흐름"],
  "result preview": ["결과에서 확인할 수 있는 항목", "페이지에서 확인할 수 있는 항목"],
  "free scope": ["무료"],
  "paid scope": ["유료"],
  "sample reading": ["짧은 예시 리딩", "짧은 감상 예시"],
  caution: ["해석 시 주의할 점", "감상 시 주의할 점", "의료 고지"],
  "medical disclaimer": ["의료", "건강", "치료", "진료"],
  "legal disclaimer": ["법률", "소송", "이혼", "결혼"],
  "investment disclaimer": ["투자", "재물"],
  "expert disclaimer": ["전문가", "의료기관", "자격 있는"],
  faq: ["FAQ", "자주 묻는 질문", "운세 결과를 바꾸나요", "어떤 순서로 들으면 좋나요"],
};

const fortuneRuntimePolicyFiles = [
  "js/saju-engine-tarot-sukuyo-quantum.js",
  "public/js/saju-engine-tarot-sukuyo-quantum.js",
  "out/js/saju-engine-tarot-sukuyo-quantum.js",
  "dist/js/saju-engine-tarot-sukuyo-quantum.js",
];

const deterministicFortuneRuntimePatterns = [
  ["guaranteed success", /반드시\s*성공(?:한다|의\s*궤도에\s*오른다)?/],
  ["unconditional divorce", /무조건\s*이혼/],
  ["medical certainty", /병이\s*생긴다/],
  ["investment certainty", /투자하면\s*돈(?:을)?\s*번다/],
  ["fear payment push", /지금\s*결제하지\s*않으면|운이\s*나빠진다/],
  ["permanent relationship certainty", /영원히\s*지속된다/],
];

const highRiskAdsenseEligibleTextPatterns = [
  ["forced payment prompt", /지금\s*결제|바로\s*결제|결제하지\s*않으면|구매하지\s*않으면/],
  ["ad click inducement", /광고\s*클릭|광고를\s*눌|클릭하면\s*(?:보상|무료|포인트)/],
  ["English ad click inducement", /click\s+(?:an|the)?\s*ad|support\s+us|check\s+out\s+our\s+sponsors|help\s+keep\s+this\s+site\s+running/i],
  ["Korean sponsor click inducement", /스폰서.{0,20}(?:확인|클릭|눌러)|후원.{0,20}광고/],
  ["approval guarantee", /승인\s*보장|통과\s*보장/],
  ["ad confusion wording", /광고.{0,20}(?:다운로드|결제|버튼)|(?:다운로드|결제|버튼).{0,20}광고/],
];

const repeatedSiteNameTitlePattern = /Code Destiny\s*(?:\||—|-)\s*Code Destiny(?:\s*(?:\||—|-)|$)/i;
const retryableReadErrorCodes = new Set(["EBUSY", "ENOENT", "EPERM"]);

function wait(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function readFileUtf8WithRetry(absolutePath) {
  let lastError = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      return readFileSync(absolutePath, "utf8");
    } catch (error) {
      lastError = error;
      if (!retryableReadErrorCodes.has(error?.code)) throw error;
      wait(100 + Math.min(attempt * 50, 500));
    }
  }
  throw lastError;
}

function readRequired(path) {
  const absolutePath = resolve(rootDir, path);
  if (!existsSync(absolutePath)) {
    throw new Error(`[adsense-readiness] missing required file: ${path}`);
  }
  return readFileUtf8WithRetry(absolutePath);
}

function readOptional(path) {
  const absolutePath = resolve(rootDir, path);
  if (!existsSync(absolutePath)) return "";
  return readFileUtf8WithRetry(absolutePath);
}

function collectIndexHtmlFiles(directory, files = []) {
  if (!existsSync(directory)) return files;

  for (const entry of readdirSync(directory)) {
    const entryPath = resolve(directory, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      collectIndexHtmlFiles(entryPath, files);
    } else if (entry === "index.html") {
      files.push(entryPath);
    }
  }

  return files;
}

function collectSourceFiles(target, files = []) {
  const targetPath = resolve(rootDir, target);
  if (!existsSync(targetPath)) return files;
  const stats = statSync(targetPath);

  if (stats.isDirectory()) {
    for (const entry of readdirSync(targetPath)) {
      collectSourceFiles(`${target}/${entry}`, files);
    }
    return files;
  }

  const extension = targetPath.slice(targetPath.lastIndexOf("."));
  if (sourceScanExtensions.has(extension)) {
    files.push(targetPath);
  }

  return files;
}

// 🔴 라우트 대부분은 `<route>/index.html` 로 떨어지지만, 루트 정적 셸은 `<route>.html` 파일
// 하나가 전부다(Cloudflare Pages 가 확장자를 떼고 `/destiny-poker` 로 서빙한다).
// 디렉터리 형태만 찾으면 그런 라우트는 `readOptional` 이 null 을 돌려 **검사가 조용히 건너뛴다**.
// 2026-08-16: 이것과 `collectIndexHtmlFiles`(=`**/index.html` 만 수집) 때문에 루트 셸 21개가
// 본문 두께·canonical·noindex 검사를 통째로 비껴가 있었다. 파일이 있는 쪽으로 폴백한다.
function routeHtmlPath(baseDir, route) {
  const trimmed = route.replace(/^\/+|\/+$/g, "");
  if (!trimmed) return `${baseDir}/index.html`;
  const directoryForm = `${baseDir}/${trimmed}/index.html`;
  if (existsSync(resolve(rootDir, directoryForm))) return directoryForm;
  const flatForm = `${baseDir}/${trimmed}.html`;
  return existsSync(resolve(rootDir, flatForm)) ? flatForm : directoryForm;
}

function routeFromHtmlPath(baseDir, absolutePath) {
  const basePath = resolve(rootDir, baseDir);
  const relativePath = relative(basePath, absolutePath).replace(/\\/g, "/");
  return relativePath === "index.html" ? "/" : `/${relativePath.replace(/\/index\.html$/, "")}`;
}

const canonicalAliases = new Map([
  ["/contact-us", "/contact"],
  ["/privacy-policy", "/privacy"],
  ["/terms-of-service", "/terms"],
  ["/famous-saju/king-sejong", "/insights/famous-saju/king-sejong"],
]);

function expectedCanonicalUrl(route) {
  const canonicalPath = canonicalAliases.get(route) || route;
  const normalizedPath = canonicalPath === "/" ? "" : canonicalPath.replace(/\/+$/, "");
  return `${siteOrigin}${normalizedPath}/`;
}

function getMetaContent(html, name) {
  return (html.match(new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`, "i")) || [])[1] || "";
}

function getTitleContent(html) {
  return (html.match(/<title\b[^>]*>([^<]*)<\/title>/i) || [])[1] || "";
}

function getCanonical(html) {
  return (html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i) || [])[1] || "";
}

function canonicalPathnameFromUrl(canonical) {
  try {
    return new URL(canonical, siteOrigin).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return "";
  }
}

function isSelfCanonicalRoute(route, canonical) {
  const normalizedRoute = route.replace(/\/+$/, "") || "/";
  return canonicalPathnameFromUrl(canonical) === normalizedRoute;
}

function removeElementBlocks(html, tagName) {
  const lowerHtml = html.toLowerCase();
  const openNeedle = `<${tagName}`;
  const closeNeedle = `</${tagName}>`;
  let result = "";
  let cursor = 0;

  while (cursor < html.length) {
    const openIndex = lowerHtml.indexOf(openNeedle, cursor);
    if (openIndex === -1) {
      result += html.slice(cursor);
      break;
    }

    result += html.slice(cursor, openIndex);
    const closeIndex = lowerHtml.indexOf(closeNeedle, openIndex);
    if (closeIndex === -1) break;
    cursor = closeIndex + closeNeedle.length;
  }

  return result;
}

function getVisibleText(html) {
  const htmlWithoutBlocks = ["script", "style", "svg"].reduce(
    (content, tagName) => removeElementBlocks(content, tagName),
    html,
  );

  return htmlWithoutBlocks
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function createAdsenseContentFingerprint(visibleText) {
  return visibleText
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "URL")
    .replace(/[0-9]+/g, "0")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, adsenseContentFingerprintLength);
}

function getSitemapPaths(sitemapText) {
  return [...sitemapText.matchAll(/<loc>([^<]+)<\/loc>/gi)]
    .map((match) => {
      try {
        return new URL(match[1]).pathname.replace(/\/+$/, "") || "/";
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

function matchesPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function matchesPaidFeatureRoute(pathname) {
  return paidFeatureRoutePrefixes.some((prefix) => matchesPrefix(pathname, prefix));
}

// 2026-08-17 부터 `/famous-saju/**` 는 **하나도** 빌드되면 안 된다. 허브와 카테고리 12개까지
// 라우트째 삭제하고 `public/_redirects` 가 전량 301 로 `/insights/famous-saju/` 에 접었기 때문이다.
// (그전에는 허브·카테고리가 살아 있어 여기서 예외로 빼 두었다 — 그 예외를 되살리지 말 것.)
function matchesFamousSajuAliasRoute(pathname) {
  return matchesPrefix(pathname, "/famous-saju");
}

function matchesInsightsFamousSajuDetailRoute(pathname) {
  return matchesPrefix(pathname, "/insights/famous-saju") && pathname !== "/insights/famous-saju";
}

function matchesXRobotsPattern(pathname, pattern) {
  if (pattern.endsWith("/*")) {
    return matchesPrefix(pathname, pattern.slice(0, -2));
  }
  return pathname === pattern;
}

function hasXRobotsNoindexHeader(pathname) {
  return xRobotsNoindexHeaderPatterns.some((pattern) => matchesXRobotsPattern(pathname, pattern));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assert(condition, message) {
  if (!condition) throw new Error(`[adsense-readiness] ${message}`);
}

function trace(message) {
  if (process.env.ADSENSE_READINESS_TRACE === "1") {
    console.log(`[adsense-readiness:trace] ${message}`);
  }
}

function countMatches(content, pattern) {
  return (content.match(pattern) || []).length;
}

function verifyAdsenseScriptOwnership() {
  const sourceFiles = adsenseSourceScanTargets.flatMap((target) => collectSourceFiles(target));
  const layoutPath = "app/layout.js";
  const runtimeGuardsPath = "app/components/RuntimeClientGuards.tsx";
  const deferredAdsensePath = "app/components/DeferredAdsense.tsx";
  const layoutSource = readRequired(layoutPath);
  const runtimeGuardsSource = existsSync(resolve(rootDir, runtimeGuardsPath)) ? readRequired(runtimeGuardsPath) : "";
  const deferredAdsenseSource = readRequired(deferredAdsensePath);

  for (const absolutePath of sourceFiles) {
    const relPath = relative(rootDir, absolutePath).replace(/\\/g, "/");
    const content = readFileUtf8WithRetry(absolutePath);
    if (!embedsAdsenseCode(content)) continue;

    assert(
      adsenseSourceAllowedFiles.has(relPath),
      `${relPath}: AdSense script marker must stay centralized in DeferredAdsense`,
    );
  }

  const layoutOwnsDeferredAdsense =
    countMatches(layoutSource, /import\s+DeferredAdsense\s+from\s+["']\.\/components\/DeferredAdsense["']/g) === 1
    && countMatches(layoutSource, /<DeferredAdsense\s*\/>/g) === 1;
  const runtimeGuardsOwnDeferredAdsense =
    countMatches(layoutSource, /import\s+RuntimeClientGuards\s+from\s+["']\.\/components\/RuntimeClientGuards["']/g) === 1
    && countMatches(layoutSource, /<RuntimeClientGuards\s*\/>/g) === 1
    && countMatches(runtimeGuardsSource, /dynamic\(\(\)\s*=>\s*import\(["']\.\/DeferredAdsense["']\)/g) === 1
    && countMatches(runtimeGuardsSource, /<DeferredAdsense\s*\/>/g) === 1;
  assert(
    layoutOwnsDeferredAdsense || runtimeGuardsOwnDeferredAdsense,
    `${layoutPath}: DeferredAdsense must be mounted exactly once directly or through RuntimeClientGuards`,
  );
  assert(
    deferredAdsenseSource.includes("canLoadAdsenseForCanonicalUrl"),
    `${deferredAdsensePath}: must guard AdSense by canonical route policy`,
  );
  // 🔴 2026-08-20: 'lazyOnload' 문자열 단언에서 내려왔다. lazyOnload 는 window load 를
  // 기다리는데, 이 사이트의 기사 지면에서는 그게 첫 페인트 +2.5초였고 광고가 실제로 그려지는
  // 것을 봐야 하는 승인 심사에 불리했다. 지연을 없앤 것이 아니라 **지연의 주체를 옮긴 것**이라,
  // 두 가지를 함께 강제한다: ① 스크립트가 next/script 의 지연 전략을 쓸 것
  // ② 마운트 자체가 RuntimeClientGuards 의 유휴 지연 뒤에 남아 있을 것.
  // 둘 중 하나만 남으면 "하이드레이션 즉시 광고 로드"로 조용히 후퇴할 수 있다.
  assert(
    /strategy="(afterInteractive|lazyOnload)"/.test(deferredAdsenseSource),
    `${deferredAdsensePath}: AdSense script must load through next/script afterInteractive or lazyOnload`,
  );
  if (runtimeGuardsOwnDeferredAdsense) {
    assert(
      runtimeGuardsSource.includes("const mountAdsense = useDeferredMount(")
        && runtimeGuardsSource.includes("{mountAdsense ? <DeferredAdsense /> : null}"),
      `${runtimeGuardsPath}: AdSense mount must stay behind the idle-deferred gate`,
    );
  }
  const conditionalRenderingMarkers = [
    "AD_REMOVAL_CACHE_KEY",
    "AD_REMOVAL_FEATURE_KEYS",
    "COOKIE_AUTH_HINT_KEYS",
    "currentDocumentAllowsAdsense",
    "currentViewerAllowsAdsense",
    "hasAdRemovalEntitlement",
    "CodeDestinyAccessStore",
    "accessStore.getSnapshot",
    "accessStore?.subscribe",
    "readCachedAdRemovalEntitlement()",
    "writeCachedAdRemovalEntitlement(hasAdRemoval)",
    "clearCachedAdRemovalEntitlement()",
    'window.addEventListener("cd:auth-changed"',
    'window.addEventListener("storage"',
    'snapshot.status === "loading"',
    "!documentAllowsAdsense || !viewerAllowsAdsense",
  ];

  for (const marker of conditionalRenderingMarkers) {
    assert(
      deferredAdsenseSource.includes(marker),
      `${deferredAdsensePath}: missing conditional AdSense rendering marker ${marker}`,
    );
  }
  assert(
    !deferredAdsenseSource.includes("ensureLoaded("),
    `${deferredAdsensePath}: global AdSense rendering must not trigger an unlock request`,
  );
  assert(
    !deferredAdsenseSource.includes('authFetch("/api/billing/balance"'),
    `${deferredAdsensePath}: global AdSense rendering must not own a billing request`,
  );
}

function verifyPrivacyPolicyEmbedSource() {
  const relPath = "app/privacy-policy/PrivacyPolicyContent.jsx";
  const source = readRequired(relPath);
  const requiredMarkers = [
    "Google AdSense",
    "쿠키",
    "웹 비콘",
    "IP 주소",
    "광고 식별자",
    "policies.google.com/technologies/partner-sites",
    ageNoticeMarker,
    "개인정보 삭제",
    "로컬스토리지",
  ];
  const forbiddenMarkers = ["\uFFFD", "로컈", "운세 풍이", "당 정보 삭제", staleAgeNoticeMarker];

  for (const marker of requiredMarkers) {
    assert(source.includes(marker), `${relPath}: missing privacy/ad notice marker ${marker}`);
  }

  for (const marker of forbiddenMarkers) {
    assert(!source.includes(marker), `${relPath}: forbidden broken privacy marker ${marker}`);
  }
}

function verifyPublicFeatureMetadataSource() {
  const routeMetadataChecks = [
    {
      relPath: "app/tarot/numerology/page.tsx",
      markers: [
        'canonical: "/tarot/numerology"',
        "\uC218\uBE44\uD559 \uD0C0\uB85C \uAC00\uC774\uB4DC",
        "\uC758\uB8CC, \uBC95\uB960, \uD22C\uC790",
        "\uD0C0\uB85C \uCE74\uB4DC \uB9AC\uB529 \uC785\uBB38",
      ],
    },
    {
      relPath: "app/tarot/prompt-maker/layout.tsx",
      markers: [
        'canonical: "/tarot/prompt-maker"',
        "openGraph",
        "\uD0C0\uB85C \uC624\uB77C\uD074 \uC0C1\uB2F4",
        "\uC758\uB8CC\u00B7\uBC95\uB960\u00B7\uD22C\uC790",
      ],
    },
    {
      relPath: "app/yeon-star-hug/layout.tsx",
      markers: [
        'canonical: "/yeon-star-hug"',
        "openGraph",
        "\uC5F0\uC774 \uBCC4\uBE5B \uC0C1\uB2F4",
        "\uC5D4\uD130\uD14C\uC778\uBA3C\uD2B8",
      ],
    },
  ];

  for (const { relPath, markers } of routeMetadataChecks) {
    const source = readRequired(relPath);
    assert(!source.includes("\uFFFD"), `${relPath}: must not contain replacement characters`);

    for (const marker of markers) {
      assert(source.includes(marker), `${relPath}: missing public feature metadata marker ${marker}`);
    }
  }
}

function verifyFortuneRuntimePolicyLanguage() {
  let checkedFiles = 0;

  for (const relPath of fortuneRuntimePolicyFiles) {
    const content = readOptional(relPath);
    if (!content) continue;
    checkedFiles += 1;

    for (const [label, pattern] of deterministicFortuneRuntimePatterns) {
      assert(
        !pattern.test(content),
        `${relPath}: high-risk deterministic fortune phrase must be softened (${label})`,
      );
    }
  }

  assert(checkedFiles >= 2, "fortune runtime policy language guard must check source and public files");
}

function assertNoHighRiskAdsenseEligibleText(htmlPath, visibleText) {
  for (const [label, pattern] of highRiskAdsenseEligibleTextPatterns) {
    assert(
      !pattern.test(visibleText),
      `${htmlPath}: AdSense-eligible route contains high-risk commercial or ad-confusion wording (${label})`,
    );
  }
}

function rememberUniqueAdsenseContentFingerprint(htmlPath, route, visibleText, seenFingerprints) {
  const fingerprint = createAdsenseContentFingerprint(visibleText);
  if (!fingerprint) return;

  const existingRoute = seenFingerprints.get(fingerprint);
  assert(
    !existingRoute,
    `${htmlPath}: AdSense-eligible self-canonical route duplicates visible content fingerprint with ${existingRoute}: ${route}`,
  );
  seenFingerprints.set(fingerprint, route);
}

function assertUsefulTitle(htmlPath, title) {
  assert(title.length >= minimumUsefulTitleLength, `${htmlPath}: title is too thin`);
  assert(!repeatedSiteNameTitlePattern.test(title), `${htmlPath}: title repeats site name: ${title}`);
}

function verifyIndexablePublicRoutes(baseDir) {
  for (const route of indexablePublicRoutes) {
    const htmlPath = routeHtmlPath(baseDir, route);
    const html = readRequired(htmlPath);
    const robots = getMetaContent(html, "robots").toLowerCase();
    const googleBot = getMetaContent(html, "googlebot").toLowerCase();
    const description = getMetaContent(html, "description");
    const canonical = getCanonical(html);
    const visibleText = getVisibleText(html);

    assert(!html.includes("\uFFFD"), `${htmlPath}: mojibake replacement character found`);
    assertUsefulTitle(htmlPath, getTitleContent(html));
    assert(description.length >= 50, `${htmlPath}: meta description is too thin`);
    assert(
      visibleText.length >= minimumVisibleTextLength,
      `${htmlPath}: visible content is too thin (${visibleText.length} chars)`,
    );
    for (const expectedText of policyContentExpectations[route] || []) {
      assert(html.includes(expectedText), `${htmlPath}: missing policy marker ${expectedText}`);
    }
    assert(canonical === expectedCanonicalUrl(route), `${htmlPath}: canonical mismatch: ${canonical}`);
    assert(!robots.includes("noindex"), `${htmlPath}: robots contains noindex`);
    assert(!robots.includes("nofollow"), `${htmlPath}: robots contains nofollow`);
    assert(robots.includes("index") && robots.includes("follow"), `${htmlPath}: robots must be index, follow`);
    assert(!googleBot.includes("noindex"), `${htmlPath}: googlebot contains noindex`);
  }
}

function verifyAdsenseAllowedContentRoutes(baseDir) {
  for (const route of adsenseAllowedContentRoutes) {
    const htmlPath = routeHtmlPath(baseDir, route);
    const html = readRequired(htmlPath);
    const robots = getMetaContent(html, "robots").toLowerCase();
    const googleBot = getMetaContent(html, "googlebot").toLowerCase();
    const canonical = getCanonical(html);
    const visibleText = getVisibleText(html);

    assert(canLoadAdsense(route), `${route}: route policy should allow AdSense`);
    assert(
      canonical === expectedCanonicalUrl(route),
      `${htmlPath}: AdSense candidate canonical mismatch: ${canonical}`,
    );
    assert(robots.includes("index") && robots.includes("follow"), `${htmlPath}: AdSense candidate must be index, follow`);
    assert(!robots.includes("noindex"), `${htmlPath}: AdSense candidate contains noindex`);
    assert(!robots.includes("nofollow"), `${htmlPath}: AdSense candidate contains nofollow`);
    assert(!googleBot.includes("noindex"), `${htmlPath}: AdSense candidate googlebot contains noindex`);
    assert(
      visibleText.length >= minimumVisibleTextLength,
      `${htmlPath}: AdSense candidate visible content is too thin (${visibleText.length} chars)`,
    );
    assertNoHighRiskAdsenseEligibleText(htmlPath, visibleText);
  }
}

function verifyFeatureGuideContentRoutes(baseDir) {
  for (const route of featureGuideRoutes) {
    const htmlPath = routeHtmlPath(baseDir, route);
    const html = readRequired(htmlPath);
    const visibleText = getVisibleText(html);

    for (const [groupName, markers] of Object.entries(featureGuideMarkerGroups)) {
      assert(
        markers.some((marker) => visibleText.includes(marker)),
        `${htmlPath}: missing feature guide marker group ${groupName}`,
      );
    }
  }
}

function verifyGeneratedAdsenseEligibleRoutes(baseDir) {
  const htmlFiles = collectIndexHtmlFiles(resolve(rootDir, baseDir));
  const seenFingerprints = new Map();

  for (const absolutePath of htmlFiles) {
    const route = routeFromHtmlPath(baseDir, absolutePath);
    if (!canLoadAdsense(route)) continue;

    const htmlPath = relative(rootDir, absolutePath).replace(/\\/g, "/");
    const html = readFileUtf8WithRetry(absolutePath);
    const robots = getMetaContent(html, "robots").toLowerCase();
    const googleBot = getMetaContent(html, "googlebot").toLowerCase();
    const description = getMetaContent(html, "description");
    const canonical = getCanonical(html);
    const visibleText = getVisibleText(html);
    const currentHref = `${siteOrigin}${route === "/" ? "" : route}/`;
    const canonicalAllowsAdsense = canLoadAdsenseForCanonicalUrl(route, canonical, currentHref);

    assert(!html.includes("\uFFFD"), `${htmlPath}: mojibake replacement character found`);
    assertUsefulTitle(htmlPath, getTitleContent(html));
    assert(description.length >= 50, `${htmlPath}: meta description is too thin`);
    assert(canonical.startsWith(siteOrigin), `${htmlPath}: missing canonical URL`);
    if (!isSelfCanonicalRoute(route, canonical)) {
      assert(!canonicalAllowsAdsense, `${htmlPath}: non-canonical AdSense candidate must fail canonical URL policy`);
      assert(!embedsAdsenseCode(html), `${htmlPath}: non-canonical AdSense candidate must not embed AdSense`);
      continue;
    }
    assert(canonicalAllowsAdsense, `${htmlPath}: self-canonical AdSense candidate must pass canonical URL policy`);
    assert(!robots.includes("noindex"), `${htmlPath}: AdSense-eligible route contains noindex`);
    assert(!robots.includes("nofollow"), `${htmlPath}: AdSense-eligible route contains nofollow`);
    assert(!googleBot.includes("noindex"), `${htmlPath}: AdSense-eligible googlebot contains noindex`);
    assert(
      visibleText.length >= minimumVisibleTextLength,
      `${htmlPath}: AdSense-eligible visible content is too thin (${visibleText.length} chars)`,
    );
    assertNoHighRiskAdsenseEligibleText(htmlPath, visibleText);
    rememberUniqueAdsenseContentFingerprint(htmlPath, route, visibleText, seenFingerprints);
  }
}

function verifyBlockedRouteSamplesNoAdsense(baseDir) {
  for (const route of adsenseBlockedRoutes) {
    assert(!canLoadAdsense(route), `${route}: route policy should block AdSense`);

    const htmlPath = routeHtmlPath(baseDir, route);
    const html = readOptional(htmlPath);
    if (!html) continue;

    assert(!embedsAdsenseCode(html), `${htmlPath}: blocked route must not embed AdSense`);
  }
}

function verifyGeneratedPaidFeatureRoutesNoAdsense(baseDir) {
  const htmlFiles = collectIndexHtmlFiles(resolve(rootDir, baseDir));
  let paidRouteCount = 0;

  for (const absolutePath of htmlFiles) {
    const route = routeFromHtmlPath(baseDir, absolutePath);
    if (!matchesPaidFeatureRoute(route)) continue;
    const htmlPath = relative(rootDir, absolutePath).replace(/\\/g, "/");
    const html = readOptional(absolutePath);
    if (!html) continue;

    paidRouteCount += 1;
    assert(!canLoadAdsense(route), `${route}: paid feature route policy should block AdSense`);
    assert(!embedsAdsenseCode(html), `${htmlPath}: paid feature route must not embed AdSense`);
  }

  assert(paidRouteCount > 0, `${baseDir}: no paid feature routes were checked`);
}

// 2026-08-13: /famous-saju/<slug> 는 /insights/famous-saju/<slug> 와 같은 페이지를 두 URL 로
// 빌드해 130개를 중복 크롤시켰다. 라우트를 지우고 public/_redirects 의 301 로 대체했다.
// 그래서 이 가드의 계약이 바뀌었다 — "alias 가 noindex 인가" 대신
// "alias 가 다시 빌드되지 않는가" + "정본 상세가 noindex 를 유지하는가".
// 후자는 예전 구현에서 self-canonical 이라는 이유로 전부 건너뛰어(구 :1019) 사실상
// 검사되지 않던 부분이라, 이 변경은 커버리지를 줄이는 게 아니라 늘린다.
function verifyFamousSajuAliasRoutesNoindex(baseDir) {
  const htmlFiles = collectIndexHtmlFiles(resolve(rootDir, baseDir));
  const rebuiltAliasRoutes = [];
  let detailRouteCount = 0;

  for (const absolutePath of htmlFiles) {
    const route = routeFromHtmlPath(baseDir, absolutePath);
    if (matchesFamousSajuAliasRoute(route)) {
      rebuiltAliasRoutes.push(route);
      continue;
    }
    if (!matchesInsightsFamousSajuDetailRoute(route)) continue;

    const htmlPath = relative(rootDir, absolutePath).replace(/\\/g, "/");
    const html = readFileUtf8WithRetry(absolutePath);
    const robots = getMetaContent(html, "robots").toLowerCase();
    const googleBot = getMetaContent(html, "googlebot").toLowerCase();
    const canonical = getCanonical(html);
    const canonicalPath = canonicalPathnameFromUrl(canonical);
    const currentHref = `${siteOrigin}${route === "/" ? "" : route}/`;
    detailRouteCount += 1;

    assert(!canLoadAdsense(route), `${route}: famous-saju detail route policy should block AdSense`);
    assert(
      !canLoadAdsenseForCanonicalUrl(route, canonical, currentHref),
      `${route}: famous-saju detail canonical URL policy should block AdSense`,
    );
    assert(!embedsAdsenseCode(html), `${htmlPath}: famous-saju detail route must not embed AdSense`);
    assert(canonicalPath.startsWith("/insights/famous-saju/"), `${htmlPath}: famous-saju detail must canonicalize under insights`);
    assert(robots.includes("noindex"), `${htmlPath}: famous-saju detail must contain noindex robots`);
    assert(googleBot.includes("noindex"), `${htmlPath}: famous-saju detail googlebot must contain noindex`);
  }

  assert(
    rebuiltAliasRoutes.length === 0,
    `${baseDir}: /famous-saju/<slug> alias pages must not be built — they are 301'd in public/_redirects (found ${rebuiltAliasRoutes.length}, e.g. ${rebuiltAliasRoutes[0]})`,
  );
  assert(detailRouteCount > 0, `${baseDir}: no famous-saju detail routes were checked`);
}

function verifyPrivateNoindexRoutes(baseDir) {
  for (const route of privateNoindexRoutes) {
    const htmlPath = routeHtmlPath(baseDir, route);
    const html = readOptional(htmlPath);
    if (!html) continue;

    const robots = getMetaContent(html, "robots").toLowerCase();
    const googleBot = getMetaContent(html, "googlebot").toLowerCase();
    assert(robots.includes("noindex"), `${htmlPath}: private route must contain noindex robots`);
    assert(robots.includes("nofollow"), `${htmlPath}: private route must contain nofollow robots`);
    assert(googleBot.includes("noindex"), `${htmlPath}: private route googlebot must contain noindex`);
  }
}

function verifyCustomNotFoundPage(baseDir) {
  const notFoundPath = `${baseDir}/404.html`;
  const html = readRequired(notFoundPath);

  // Next 기본 404 가 export 되면 제목·내비게이션이 전부 사라진다. 과거
  // scripts/next-build-with-pages-manifest.mjs 의 매니페스트 가드가 export 직후
  // 지워진 404 번들 자리에 _error 스텁을 다시 써서 이 회귀가 조용히 발생했다.
  assert(
    !html.includes("404: This page could not be found"),
    `${notFoundPath}: framework default 404 was exported instead of the custom page`,
  );

  const visibleText = getVisibleText(html);
  assert(visibleText.length >= 200, `${notFoundPath}: 404 page is too thin (${visibleText.length} chars)`);

  const internalLinkCount = (html.match(/<a\s[^>]*href="\/[^"]*"/gi) || []).length;
  assert(
    internalLinkCount >= 4,
    `${notFoundPath}: 404 page must link back into the site (found ${internalLinkCount} internal links)`,
  );
}

/** `_headers` 를 [경로, 헤더줄들] 블록으로 나눈다. */
function parseHeadersRules(headersText) {
  const rules = [];
  let current = null;
  for (const line of headersText.split(/\r?\n/)) {
    if (line.startsWith("/")) {
      current = { path: line.trim(), headers: [] };
      rules.push(current);
    } else if (current && /^[ \t]+\S/.test(line)) {
      current.headers.push(line.trim());
    } else if (!line.trim()) {
      current = null;
    }
  }
  return rules;
}

/**
 * `_headers` 규칙 하나가 요구 패턴을 덮는가.
 *
 * Cloudflare 는 `/x*` 를 `/x` 와 `/x/…` 양쪽에 적용하므로, 두 규칙을 하나로 합쳐도 계약은
 * 그대로다. 합치는 것은 취향이 아니라 필요다 — Pages 는 `_headers` 규칙을 **100개까지만**
 * 적용하고 나머지를 조용히 버린다(2026-08-08: 133개 중 33개가 버려져 `/_next/static/*` 의
 * immutable 규칙이 통째로 죽어 있었다). 그래서 여기서는 문자열 일치가 아니라 포함관계를 본다.
 */
function headersRuleCovers(rulePath, pattern) {
  if (rulePath === pattern) return true;
  if (!rulePath.endsWith("*")) return false;
  return pattern.startsWith(rulePath.slice(0, -1));
}

/**
 * 🔴 Cloudflare Pages 는 `_headers` 규칙을 **100개까지만** 적용하고 나머지를 조용히 버린다.
 *
 * 이 상한을 지키는 검사가 그동안 하나도 없었다. 2026-08-08 에 133개 중 33개가 버려져
 * `/_next/static/*` 의 immutable 이 통째로 죽어 있었고(위 headersRuleCovers 주석 참고),
 * 2026-08-14 에는 정확히 100개에 닿아 새 규칙을 하나도 넣을 수 없는 상태였다.
 * 조용히 깨지는 종류의 실패라 규칙을 세는 것만으로 막을 수 있다.
 */
const CLOUDFLARE_HEADERS_RULE_LIMIT = 100;

function verifyHeadersRuleBudget(headersPath) {
  const rules = parseHeadersRules(readRequired(headersPath));
  assert(
    rules.length <= CLOUDFLARE_HEADERS_RULE_LIMIT,
    `${headersPath}: _headers 규칙이 ${rules.length}개로 Cloudflare Pages 상한 ${CLOUDFLARE_HEADERS_RULE_LIMIT}개를 넘는다. `
      + `초과분은 배포 시 조용히 버려진다 — 중복 규칙을 합쳐 예산을 확보할 것.`
  );
}

function verifyXRobotsNoindexHeaders(headersPath) {
  const headersText = readRequired(headersPath);
  const rules = parseHeadersRules(headersText);
  verifyHeadersRuleBudget(headersPath);
  for (const pattern of xRobotsNoindexHeaderPatterns) {
    const policyPath = pattern.endsWith("/*") ? pattern.slice(0, -2) : pattern;
    assert(!canLoadAdsense(policyPath), `${policyPath}: X-Robots noindex route must not load AdSense`);

    // 셸 사본 라우트는 색인만 막고 링크는 통과시키려고 `noindex, follow` 를 쓴다.
    // 게이트가 지켜야 할 것은 noindex 이므로 follow/nofollow 는 둘 다 허용한다.
    const noindexCovers = (target) => rules.some((rule) => headersRuleCovers(rule.path, target)
      && rule.headers.some((header) => /^X-Robots-Tag:\s*noindex,\s*(?:no)?follow$/i.test(header)));

    assert(noindexCovers(pattern), `${headersPath}: missing X-Robots-Tag noindex rule for ${pattern}`);

    // 🔴 `.html` 만 덮는 규칙은 초록불이면서 아무것도 막지 못한다.
    // Cloudflare Pages 는 확장자를 떼고 서빙하며 `/x.html` 은 `/x` 로 **308** 을 준다.
    // 리다이렉트 응답의 헤더는 목적지로 이어지지 않으므로, 크롤러가 실제로 보는 200 응답
    // (`/x`, `/x?lang=en` …)에는 noindex 가 붙지 않는다.
    // 2026-08-16 실측: 이 검사가 없어서 19개 중 18개가 색인된 채로 게이트는 통과했고,
    // `/destiny-poker?lang=en` 등이 GSC 「사용자가 선택한 표준이 없는 중복 페이지」로 잡혔다.
    // 유일하게 정상이던 `/tadagochi` 만 `_headers` 에 `/tadagochi*` 로 적혀 있었다.
    if (pattern.endsWith(".html")) {
      const servedPath = pattern.slice(0, -".html".length);
      assert(
        noindexCovers(servedPath),
        `${headersPath}: ${pattern} 의 noindex 가 실제 서빙 경로 ${servedPath} 를 덮지 않는다. `
          + `${pattern} 은 ${servedPath} 로 308 리다이렉트되고 헤더는 목적지로 이어지지 않는다. `
          + `규칙을 ${servedPath}* 로 적으면 양쪽을 함께 덮는다(규칙 수 증가 없음).`,
      );
    }
  }
}

function verifyGeneratedAdsenseBlockedRoutes(baseDir) {
  const htmlFiles = collectIndexHtmlFiles(resolve(rootDir, baseDir));

  for (const absolutePath of htmlFiles) {
    const route = routeFromHtmlPath(baseDir, absolutePath);
    if (canLoadAdsense(route)) continue;

    const htmlPath = relative(rootDir, absolutePath).replace(/\\/g, "/");
    let html = "";
    try {
      html = readFileUtf8WithRetry(absolutePath);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    assert(!embedsAdsenseCode(html), `${htmlPath}: AdSense-blocked route must not embed AdSense`);
  }
}

function verifyNoGeneratedStaticAdUnits(baseDir) {
  const htmlFiles = collectIndexHtmlFiles(resolve(rootDir, baseDir));

  for (const absolutePath of htmlFiles) {
    const htmlPath = relative(rootDir, absolutePath).replace(/\\/g, "/");
    let html = "";
    try {
      html = readFileUtf8WithRetry(absolutePath);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    assert(
      !staticAdUnitMarkupPattern.test(html),
      `${htmlPath}: generated HTML must not include static AdSense unit markup before explicit placement review`,
    );
  }
}

for (const route of adsenseBlockedRoutes) {
  assert(!canLoadAdsense(route), `${route}: route policy must block AdSense`);
}

const staticShells = [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
  // zh-tw 는 승격(promote-static-shell-to-root)·동기화 대상이면서도 이 목록에만 빠져 있어,
  // 광고 임베드와 신뢰 링크 8종을 유일하게 검사받지 않는 셸이었다.
  "public/zh-tw/index.html",
  "dist/index.html",
  "dist/static/index.html",
  "dist/en/index.html",
  "dist/ja/index.html",
  "dist/zh/index.html",
  "dist/zh-tw/index.html",
];

for (const shellPath of staticShells) {
  const html = readRequired(shellPath);
  assert(!embedsAdsenseCode(html), `${shellPath}: static shell must not embed AdSense directly`);

  for (const route of staticShellTrustLinks) {
    // 내부 링크에는 후행 슬래시가 붙는다(next.config.mjs 의 trailingSlash:true — 없으면 308 을
    // 한 번 탄다). 목록은 라우트 **정체**이고 policyContentExpectations 의 키이기도 하므로
    // 목록을 고치지 않고 여기서 두 표기를 모두 인정한다.
    const acceptedHrefs = [route, staticShellTrustLinkAliases[route]].filter(Boolean);
    assert(
      acceptedHrefs.some((href) => html.includes(`href="${href}"`) || html.includes(`href="${href}/"`)),
      `${shellPath}: missing trust link ${acceptedHrefs.join(" or ")}`,
    );
  }
}

for (const adsTxtPath of ["ads.txt", "public/ads.txt", "out/ads.txt", "dist/ads.txt"]) {
  const adsTxt = readRequired(adsTxtPath).trim();
  assert(adsTxt.includes(adsTxtRecord), `${adsTxtPath}: missing Google AdSense publisher record`);
}

for (const headersPath of ["_headers", "public/_headers", "dist/_headers"]) {
  verifyXRobotsNoindexHeaders(headersPath);
}

function verifyRobots(baseDir) {
  const robotsPath = `${baseDir}/robots.txt`;
  const robotsText = readRequired(robotsPath);
  assert(/user-agent:\s*\*/i.test(robotsText), `${robotsPath}: missing wildcard user-agent rule`);
  assert(/user-agent:\s*mediapartners-google/i.test(robotsText), `${robotsPath}: missing Mediapartners-Google rule`);
  assert(
    /user-agent:\s*mediapartners-google[\s\S]*?allow:\s*\/\s*(?:\r?\n|$)/i.test(robotsText),
    `${robotsPath}: Mediapartners-Google must explicitly allow /`,
  );
  assert(
    /sitemap:\s*https:\/\/code-destiny\.com\/sitemap\.xml/i.test(robotsText),
    `${robotsPath}: missing sitemap directive`,
  );
  // 🔴 User-agent 그룹 단위로 본다. 예전에는 파일 어디든 `Disallow: /` 가 있으면 실패시켰는데,
  // 그러면 학습 전용 크롤러(CCBot) 하나를 막는 것만으로 "사이트 전체 차단" 으로 오인한다.
  // 아래 Googlebot 검사도 `[\s\S]*?` 가 파일을 가로질러 **다른 그룹**의 줄에 매치되는 오탐이 있었다.
  assert(
    !blocksEntireSite(robotsText, (agent) => agent === "*"),
    `${robotsPath}: blocks the entire site`,
  );
  assert(
    !blocksEntireSite(robotsText, (agent) => /^googlebot(-|$)/i.test(agent) || /^mediapartners-google$/i.test(agent)),
    `${robotsPath}: blocks Googlebot or Mediapartners-Google`,
  );
}

function rememberUniqueSitemapMeta(kind, value, pathname, seen, sitemapPath) {
  const normalized = value.replace(/\s+/g, " ").trim().toLowerCase();
  if (!normalized) return;

  const existingPathname = seen.get(normalized);
  assert(
    !existingPathname,
    `${sitemapPath}: duplicate sitemap ${kind}: ${existingPathname} and ${pathname}`,
  );
  seen.set(normalized, pathname);
}

function verifySitemap(baseDir) {
  const sitemapPath = `${baseDir}/sitemap.xml`;
  const sitemapText = readRequired(sitemapPath);
  const sitemapPaths = getSitemapPaths(sitemapText);
  const seenTitles = new Map();
  const seenDescriptions = new Map();

  for (const route of sitemapRequiredRoutes) {
    assert(sitemapText.includes(`${siteOrigin}${route}`), `${sitemapPath}: missing ${route}`);
  }

  for (const pathname of sitemapPaths) {
    const forbiddenPrefix = sitemapForbiddenPrefixes.find((prefix) => matchesPrefix(pathname, prefix));
    assert(!forbiddenPrefix, `${sitemapPath}: private/action route must not be in sitemap: ${pathname}`);

    const htmlPath = routeHtmlPath(baseDir, pathname);

    // 사이트맵에만 있고 산출물이 없는 URL(=크롤러가 404 를 받는 URL)을 빌드 실패로 승격한다.
    // readOptional 이 조용히 넘어가던 자리라, 과거 죽은 슬러그 15개가 사이트맵에 남아 있었다.
    // dist 기준으로만 검사한다 — 정적 셸 사본 라우트(writeStaticShellCanonicalRoutes 산출물)는
    // out 에는 없고 dist 에만 생기므로 out 기준이면 오탐한다.
    if (baseDir === "dist") {
      const assetPath = /\.[a-z0-9]+$/i.test(pathname) ? `${baseDir}${pathname}` : htmlPath;
      assert(
        existsSync(resolve(rootDir, assetPath)),
        `${sitemapPath}: sitemap route has no generated artifact (would 404): ${pathname}`,
      );
    }

    const html = readOptional(htmlPath);
    if (html) {
      const robots = getMetaContent(html, "robots").toLowerCase();
      const googleBot = getMetaContent(html, "googlebot").toLowerCase();
      const title = getTitleContent(html);
      const description = getMetaContent(html, "description");
      const visibleText = getVisibleText(html);
      assert(!robots.includes("noindex"), `${sitemapPath}: sitemap route has noindex robots: ${pathname}`);
      assert(!googleBot.includes("noindex"), `${sitemapPath}: sitemap route has noindex googlebot: ${pathname}`);
      assertUsefulTitle(htmlPath, title);
      assert(description.length >= 50, `${sitemapPath}: sitemap route meta description is too thin: ${pathname}`);
      rememberUniqueSitemapMeta("title", title, pathname, seenTitles, sitemapPath);
      rememberUniqueSitemapMeta("meta description", description, pathname, seenDescriptions, sitemapPath);
      // TODO: enforce visibleText >= 900 after all pages have adequate content
      // assert(
      //   visibleText.length >= 900,
      //   `${sitemapPath}: sitemap route visible content is too thin (${visibleText.length} chars): ${pathname}`,
      // );
    }
  }
}

function verifyAdsenseEligibleRouteSitemapAlignment(baseDir) {
  const sitemapPath = `${baseDir}/sitemap.xml`;
  const sitemapText = readRequired(sitemapPath);
  const sitemapPaths = new Set(getSitemapPaths(sitemapText));
  const htmlFiles = collectIndexHtmlFiles(resolve(rootDir, baseDir));
  let eligibleRouteCount = 0;

  for (const absolutePath of htmlFiles) {
    const route = routeFromHtmlPath(baseDir, absolutePath);
    if (!canLoadAdsense(route)) continue;

    const htmlPath = relative(rootDir, absolutePath).replace(/\\/g, "/");
    const html = readFileUtf8WithRetry(absolutePath);
    const robots = getMetaContent(html, "robots").toLowerCase();
    const googleBot = getMetaContent(html, "googlebot").toLowerCase();
    const canonical = getCanonical(html);
    const currentHref = `${siteOrigin}${route === "/" ? "" : route}/`;
    if (!canLoadAdsenseForCanonicalUrl(route, canonical, currentHref)) continue;

    eligibleRouteCount += 1;
    assert(!hasXRobotsNoindexHeader(route), `${htmlPath}: AdSense-eligible route must not have X-Robots noindex header`);
    assert(!robots.includes("noindex"), `${htmlPath}: AdSense-eligible sitemap route contains noindex robots`);
    assert(!googleBot.includes("noindex"), `${htmlPath}: AdSense-eligible sitemap route contains noindex googlebot`);
    assert(sitemapPaths.has(route), `${sitemapPath}: missing AdSense-eligible self-canonical route: ${route}`);
  }

  assert(eligibleRouteCount > 0, `${baseDir}: no AdSense-eligible self-canonical routes were checked`);
}

function verifyBlockedIndexableSitemapRouteQuality(baseDir) {
  const sitemapPath = `${baseDir}/sitemap.xml`;
  const sitemapText = readRequired(sitemapPath);
  const sitemapPaths = getSitemapPaths(sitemapText);

  for (const pathname of sitemapPaths) {
    if (canLoadAdsense(pathname)) continue;

    const htmlPath = routeHtmlPath(baseDir, pathname);
    const html = readOptional(htmlPath);
    if (!html) continue;

    const robots = getMetaContent(html, "robots").toLowerCase();
    if (robots.includes("noindex")) continue;

    const visibleText = getVisibleText(html);
    assert(
      visibleText.length >= minimumBlockedIndexableVisibleTextLength,
      `${sitemapPath}: non-AdSense indexable route visible content is too thin (${visibleText.length} chars): ${pathname}`,
    );
  }
}

// 홈을 canonical 로 가리켜도 되는 문서. 산출물에서 전수 발견하고 **여기 없는 것은 실패**시킨다.
// 🔴 목록을 늘리기 전에 그 문서가 정말 홈과 같은 문서인지 확인할 것 — 대부분의 경우
//    정답은 목록 추가가 아니라 그 페이지가 자기 canonical 을 선언하는 것이다.
// 값은 그 예외가 허용되는 산출물 디렉터리다. 배포 정본은 `dist` 이므로 `out` 에만 허용된
// 예외는 배포물에서 다시 나타나면 실패한다.
const homeCanonicalAllowedRoutes = new Map([
  ["/", ["out", "dist"]],
  // 레거시 셸 사본(public/static/index.html). 홈과 같은 문서라 Next export 원본에는 홈
  // canonical 이 남지만, 배포 사본에서는 promote-static-shell 이 걷어낸다 —
  // noindex 와 cross-canonical 을 함께 두지 않는다(2026-08-27 결정).
  ["/static", ["out"]],
]);

/**
 * 홈 canonical 상속 회귀 가드 (2026-08-27 추가).
 *
 * app/layout.js 가 `alternates.canonical: "/"` 를 들고 있던 동안, `alternates` 를 선언하지
 * 않고 평범한 `export const metadata = {...}` 만 쓰는 페이지는 그것을 그대로 상속받아
 * **자기 URL 대신 홈을 canonical 로 내보냈다**(out/ 실측 55개).
 *
 * 🔴 바로 아래 verifyIndexableRouteCoverage 로는 이걸 못 잡는다. 그 가드는 canonical 목적지가
 *    사이트맵에 있으면 통과시키는데 홈은 당연히 사이트맵에 있다 — 즉 상속된 canonical 이
 *    가드를 **통과시키는 쪽으로** 작동했다(/flower/* 4개가 실제로 그렇게 새 나갔다).
 */
function verifyNoInheritedHomeCanonical(baseDir) {
  const htmlFiles = collectIndexHtmlFiles(resolve(rootDir, baseDir));
  for (const absolutePath of htmlFiles) {
    const pathname = routeFromHtmlPath(baseDir, absolutePath);
    if ((homeCanonicalAllowedRoutes.get(pathname) || []).includes(baseDir)) continue;
    const canonical = getCanonical(readFileUtf8WithRetry(absolutePath));
    if (!canonical) continue;
    assert(
      canonicalPathnameFromUrl(canonical) !== "/",
      `${baseDir}${pathname}: canonical 이 홈(${canonical})을 가리킨다 — 페이지가 alternates 를 선언하지 않아 app/layout.js 의 값을 상속받았을 가능성이 높다. generatePageMetadata() 를 쓰거나 alternates.canonical 을 직접 선언할 것.`,
    );
  }
}

// 루트 layout 의 기본 title·description 을 그대로 내보내도 되는 라우트.
// 🔴 값은 "왜 예외인가" 다. 목록을 늘리기 전에 그 페이지가 정말 자기 문구를 가질 수 없는지
//    따질 것 — 대개 정답은 목록 추가가 아니라 그 라우트가 title·description 을 선언하는 것이다.
const rootMetadataAllowedRoutes = new Map([
  ["/", "홈 자신. 배포본에서는 정적 셸이 덮지만 out/ 에는 이 값이 남는다."],
  // 아래 6개는 `public/_redirects` 가 엣지에서 301 로 잡아 HTML 이 브라우저·크롤러에
  // 절대 도달하지 않는다(2026-08-28 라이브 실측). 라우트 삭제는 절대규칙 6 위반이라
  // 산출물은 남겨 두고 문구만 채우지 않는다.
  ["/en-us", "엣지 301 → / (도달 불가)"],
  ["/ja-jp", "엣지 301 → / (도달 불가)"],
  ["/zh-cn", "엣지 301 → / (도달 불가)"],
  ["/face-reading", "엣지 301 → /physiognomy/ (도달 불가)"],
  ["/sukyo", "엣지 301 → /sukuyo/ (도달 불가)"],
  ["/saju/animal-test", "엣지 301 → /saju/animal-destiny/ (도달 불가)"],
]);

/**
 * 루트 기본 title·description 상속 회귀 가드 (2026-08-28 추가).
 *
 * `app/layout.js` 의 `title.default` 와 `description` 은 자식이 자기 값을 선언하지 않으면
 * 그대로 내려간다. 2026-08-28 dist 실측에서 **33개 문서**가 홈과 바이트 동일한 제목·설명을
 * 내보내고 있었다(전부 noindex 였지만 네이버 「동일 제목 / 동일 설명문」 집계에는 들어간다 —
 * docs/handoff/seo-naver-diagnostic-2026-08-16.md §2-E).
 *
 * 🔴 위 verifyNoInheritedHomeCanonical 로는 이걸 못 잡는다. 그쪽은 canonical 축만 보는데,
 *    canonical 상속은 2026-08-27 에 이미 끊겼고 title·description 축은 그대로 남아 있었다.
 *
 * fail-closed: 기본값을 소스에서 못 읽거나 검사한 문서가 0개면 실패한다 — 통과시키면
 * 이 가드가 죽은 채로 남는다(코딩 원칙 10).
 */
function readRootLayoutDefaults() {
  const source = readRequired("app/layout.js");
  const block = source.match(/const ROOT_SEO = \{([\s\S]*?)\n\};/);
  assert(Boolean(block), "app/layout.js: ROOT_SEO 선언을 못 찾았다 — 이 가드가 기준값을 잃었다.");
  const title = block[1].match(/title:\s*"([^"]+)"/);
  const description = block[1].match(/description:\s*\n?\s*"([^"]+)"/);
  assert(Boolean(title), "app/layout.js: ROOT_SEO.title 을 못 읽었다.");
  assert(Boolean(description), "app/layout.js: ROOT_SEO.description 을 못 읽었다.");
  return { title: title[1], description: description[1] };
}

function verifyNoInheritedRootMetadata(baseDir) {
  const defaults = readRootLayoutDefaults();
  const htmlFiles = collectIndexHtmlFiles(resolve(rootDir, baseDir));
  let checked = 0;
  for (const absolutePath of htmlFiles) {
    const pathname = routeFromHtmlPath(baseDir, absolutePath);
    if (rootMetadataAllowedRoutes.has(pathname)) continue;
    const html = readFileUtf8WithRetry(absolutePath);
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
    if (title === undefined) continue;
    checked += 1;
    assert(
      decodeTitleEntities(title).trim() !== defaults.title,
      `${baseDir}${pathname}: 루트 기본 title 을 그대로 내보낸다 — 이 라우트의 metadata 에 title 을 선언할 것.`,
    );
    const description = (html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1];
    if (description === undefined) continue;
    assert(
      description.trim() !== defaults.description,
      `${baseDir}${pathname}: 루트 기본 description 을 그대로 내보낸다 — 이 라우트의 metadata 에 description 을 선언할 것.`,
    );
  }
  assert(
    checked > 0,
    `${baseDir}: 루트 기본 메타 검사 대상이 0개다 — collectIndexHtmlFiles 가 산출물을 못 찾았을 가능성이 크다.`,
  );
}
/**
 * SERP 제목 표시 폭 가드 (2026-08-27 추가).
 *
 * Google 은 데스크톱 검색결과의 제목을 **픽셀 폭**(약 600px)으로 자른다. 한중일 글자는
 * 라틴 글자의 약 2배 폭이라, 글자 수로 재면 한국어 사이트에서 잘림이 보이지 않는다.
 * 2026-08-27 dist 실측: 글자 수 기준 60자 초과는 5개였는데 **표시 폭** 기준으로는 125개였다
 * (색인 대상 388개 중, 중앙 51 · 최대 111).
 *
 * 폭은 UAX#11 의 Wide/Fullwidth 를 2, 나머지를 1 로 세는 근사값이다. Ambiguous(—·… 등)는
 * 1 로 센다. 픽셀을 직접 재지 않으므로 한계값 60 은 자로 잰 상한이 아니라 **운영 기준**이다.
 *
 * 대상은 사이트맵 URL 전량 — 목록을 손으로 들고 있지 않고 산출물에서 전수 발견한다.
 * `/x.html` 로만 존재하는 라우트(`/destiny-poker`)도 함께 본다.
 */
const SERP_TITLE_WIDTH_LIMIT = 60;
const EAST_ASIAN_WIDE = /[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/;

function serpTitleWidth(title) {
  return [...title].reduce((total, char) => total + (EAST_ASIAN_WIDE.test(char) ? 2 : 1), 0);
}

// `<title>` 안의 엔티티는 화면에서 한 글자로 보인다 — `&amp;` 를 5 로 세면 폭이 부풀려진다.
function decodeTitleEntities(value) {
  return value
    .replace(/&(?:#x27|#39|apos);/gi, "'")
    .replace(/&(?:#x22|#34|quot);/gi, '"')
    .replace(/&(?:#x3c|#60|lt);/gi, "<")
    .replace(/&(?:#x3e|#62|gt);/gi, ">")
    .replace(/&(?:#x26|#38|amp);/gi, "&");
}

function verifyIndexableTitleWidth(baseDir) {
  const sitemapPaths = getSitemapPaths(readRequired(`${baseDir}/sitemap.xml`));
  assert(sitemapPaths.length > 0, `${baseDir}/sitemap.xml: URL 이 하나도 없다`);
  for (const pathname of sitemapPaths) {
    const relativePath = pathname === "/" ? "" : pathname.replace(/^\//, "");
    const candidates = relativePath
      ? [`${relativePath}/index.html`, `${relativePath}.html`]
      : ["index.html"];
    const absolutePath = candidates
      .map((candidate) => resolve(rootDir, baseDir, candidate))
      .find((candidate) => existsSync(candidate));
    assert(Boolean(absolutePath), `${baseDir}${pathname}: 사이트맵 URL 의 HTML 이 산출물에 없다`);
    const title = decodeTitleEntities(getTitleContent(readFileUtf8WithRetry(absolutePath))).trim();
    assert(title.length > 0, `${baseDir}${pathname}: <title> 이 비어 있다`);
    const titleWidth = serpTitleWidth(title);
    assert(
      titleWidth <= SERP_TITLE_WIDTH_LIMIT,
      `${baseDir}${pathname}: <title> 표시 폭 ${titleWidth} > ${SERP_TITLE_WIDTH_LIMIT} — SERP 에서 잘린다(한중일 글자는 라틴의 2배 폭). 제목: ${title}`,
    );
  }
}

/**
 * SERP 설명 표시 폭 가드 (2026-08-27 추가).
 *
 * 제목과 같은 축이다 — Google 은 설명도 픽셀 폭(데스크톱 약 920px)으로 자른다.
 * 2026-08-27 dist 실측: 글자 수로 재면 160 초과가 4개였는데 **표시 폭**으로는 183개였다
 * (색인 388개 중, 중앙 153 · 최대 277). 기사 설명은 `.slice(0, 160)` 이 글자 수 절단이라
 * 잘린 뒤에도 폭 320 이 나갔다.
 *
 * 대상·폭 계산·한계의 성격은 verifyIndexableTitleWidth 와 같다(운영 기준이지 자로 잰 상한이 아니다).
 */
const SERP_DESCRIPTION_WIDTH_LIMIT = 160;

function verifyIndexableDescriptionWidth(baseDir) {
  const sitemapPaths = getSitemapPaths(readRequired(`${baseDir}/sitemap.xml`));
  assert(sitemapPaths.length > 0, `${baseDir}/sitemap.xml: URL 이 하나도 없다`);
  for (const pathname of sitemapPaths) {
    const relativePath = pathname === "/" ? "" : pathname.replace(/^\//, "");
    const candidates = relativePath
      ? [`${relativePath}/index.html`, `${relativePath}.html`]
      : ["index.html"];
    const absolutePath = candidates
      .map((candidate) => resolve(rootDir, baseDir, candidate))
      .find((candidate) => existsSync(candidate));
    assert(Boolean(absolutePath), `${baseDir}${pathname}: 사이트맵 URL 의 HTML 이 산출물에 없다`);
    const description = decodeTitleEntities(getMetaContent(readFileUtf8WithRetry(absolutePath), "description")).trim();
    assert(description.length > 0, `${baseDir}${pathname}: meta description 이 비어 있다`);
    const descriptionWidth = serpTitleWidth(description);
    assert(
      descriptionWidth <= SERP_DESCRIPTION_WIDTH_LIMIT,
      `${baseDir}${pathname}: meta description 표시 폭 ${descriptionWidth} > ${SERP_DESCRIPTION_WIDTH_LIMIT} — SERP 에서 잘린다(한중일 글자는 라틴의 2배 폭). 설명: ${description}`,
    );
  }
}

/**
 * 색인 대상의 아웃바운드 내부 링크 가드 (2026-08-27 추가).
 *
 * 렌더 실측에서 **색인 URL 18개가 `<a href>` 를 하나도 서버 렌더하지 않았다**(dist·out 양쪽
 * 388개 중, 4.6%). 링크를 받기만 하고 내보내지 않는 막다른 길이라 크롤러가 그 페이지에서
 * 사이트 안으로 되돌아갈 길이 없다. 원인은 몰입형 라우트가 공유 헤더·푸터·하단 네비를
 * 렌더하지 않는다는 정책(docs/CURRENT_DEV_BASELINE.md Working Rule 4)의 부작용이었다.
 *
 * 🔴 링크가 클라이언트 컴포넌트 안에만 있으면 이 가드는 그대로 실패한다 — 그게 의도다.
 *    크롤러가 보는 것은 정적 HTML 이므로 출구는 **서버에서** 렌더해야 한다.
 *    고치는 정본은 app/components/ImmersiveRelatedLinks.tsx 를 page.tsx 에 다는 것이다.
 *
 * 대상은 사이트맵 URL 전량 — 손으로 든 목록이 없고 산출물에서 전수 발견한다.
 */
function verifyIndexableOutboundLinks(baseDir) {
  const sitemapPaths = getSitemapPaths(readRequired(`${baseDir}/sitemap.xml`));
  assert(sitemapPaths.length > 0, `${baseDir}/sitemap.xml: URL 이 하나도 없다`);
  for (const pathname of sitemapPaths) {
    const relativePath = pathname === "/" ? "" : pathname.replace(/^\//, "");
    const candidates = relativePath
      ? [`${relativePath}/index.html`, `${relativePath}.html`]
      : ["index.html"];
    const absolutePath = candidates
      .map((candidate) => resolve(rootDir, baseDir, candidate))
      .find((candidate) => existsSync(candidate));
    assert(Boolean(absolutePath), `${baseDir}${pathname}: 사이트맵 URL 의 HTML 이 산출물에 없다`);
    const html = readFileUtf8WithRetry(absolutePath);
    // `<a>` 는 body 에만 온다. head 를 함께 훑으면 JSON-LD 문자열이 우연히 걸린다.
    const body = html.slice(html.indexOf("<body"));
    const outbound = [...body.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)]
      .map((match) => match[1])
      .filter((href) => href && !href.startsWith("#") && !href.startsWith("mailto:") && !href.startsWith("tel:"))
      .filter((href) => href.startsWith("/") || href.includes("code-destiny.com"));
    assert(
      outbound.length > 0,
      `${baseDir}${pathname}: 서버 렌더 HTML 에 내부 링크가 0개다 — 크롤러에게 막다른 길이다. page.tsx 에 <ImmersiveRelatedLinks fromPath="..." /> 를 달 것(app/components/ImmersiveRelatedLinks.tsx).`,
    );
  }
}

/**
 * 색인 대상의 RSC 플라이트 페이로드 예산 가드 (2026-08-28 추가).
 *
 * App Router 는 서버가 클라이언트 컴포넌트에 넘긴 props 를 프리렌더 HTML 안에
 * `self.__next_f.push(...)` 로 통째로 실어 보낸다. 화면에 안 쓰는 데이터를 props 로 넘기면
 * 그 바이트가 전부 색인 대상 문서에 실려 크롤 예산과 LCP 를 함께 먹는다.
 *
 * 실사고: `/insights` 가 씨드 기사 113개의 `contentHtml` 전문(1,115,537바이트)을 `body` props 로
 * 넘기고 있었고, 화면에는 어디에도 렌더되지 않은 채 클라이언트 검색 필터 한 곳만 그걸 읽었다.
 * 플라이트 페이로드가 504KB → **1.78MB** 였다(2026-08-27 실측, 사이트 중앙값 54KB).
 * 고친 정본은 app/insights/page.js 의 `buildInsightSearchText()` — 본문 대신 축약 인덱스를 넘긴다.
 *
 * 🔴 `dist` 의 HTML 크기만 재면 이 회귀가 안 보인다 —
 *    scripts/externalize-dist-inline-scripts.mjs 가 큰 인라인 블록을 `/js/shell/*.js` 로 빼내므로
 *    HTML 은 작아 보이고 대신 **파서 차단 스크립트가 85개**로 늘어나 있었다(실측).
 *    그래서 이 가드는 인라인 블록과 외부화된 파일을 **함께** 센다.
 *
 * 🔴 예외 목록이 없다. 정적 셸(`/`·`/en`·`/ja`·`/zh`·`/zh-tw`)은 플라이트 페이로드 자체가
 *    0바이트라 재는 축이 다르고, 따라서 따로 빼 줄 필요가 없다. 대상은 사이트맵 URL 전량이다.
 *    (셸 HTML 이 1.3MB 대인 것은 별개 항목이며 이 가드의 대상이 아니다.)
 */
const FLIGHT_PAYLOAD_BYTE_LIMIT = 700_000;

function flightPayloadBytes(baseDir, html) {
  let bytes = 0;
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    if (match[1].includes("__next_f")) bytes += Buffer.byteLength(match[1]);
  }
  for (const match of html.matchAll(/<script src="\/js\/shell\/([^"]+)"/g)) {
    const externalized = resolve(rootDir, baseDir, "js/shell", match[1]);
    if (!existsSync(externalized)) continue;
    const source = readFileUtf8WithRetry(externalized);
    if (source.includes("__next_f")) bytes += Buffer.byteLength(source);
  }
  return bytes;
}

function verifyIndexableFlightPayloadBudget(baseDir) {
  const sitemapPaths = getSitemapPaths(readRequired(`${baseDir}/sitemap.xml`));
  assert(sitemapPaths.length > 0, `${baseDir}/sitemap.xml: URL 이 하나도 없다`);
  for (const pathname of sitemapPaths) {
    const relativePath = pathname === "/" ? "" : pathname.replace(/^\//, "");
    const candidates = relativePath
      ? [`${relativePath}/index.html`, `${relativePath}.html`]
      : ["index.html"];
    const absolutePath = candidates
      .map((candidate) => resolve(rootDir, baseDir, candidate))
      .find((candidate) => existsSync(candidate));
    assert(Boolean(absolutePath), `${baseDir}${pathname}: 사이트맵 URL 의 HTML 이 산출물에 없다`);
    const bytes = flightPayloadBytes(baseDir, readFileUtf8WithRetry(absolutePath));
    assert(
      bytes <= FLIGHT_PAYLOAD_BYTE_LIMIT,
      `${baseDir}${pathname}: RSC 플라이트 페이로드 ${bytes}바이트 > ${FLIGHT_PAYLOAD_BYTE_LIMIT} — 화면에 안 쓰는 데이터를 클라이언트 컴포넌트 props 로 넘기고 있지 않은지 볼 것(정본: app/insights/page.js 의 buildInsightSearchText).`,
    );
  }
}

function verifyIndexableRouteCoverage(baseDir) {
  const sitemapPath = `${baseDir}/sitemap.xml`;
  const sitemapText = readRequired(sitemapPath);
  const sitemapPaths = new Set(getSitemapPaths(sitemapText));
  const htmlFiles = collectIndexHtmlFiles(resolve(rootDir, baseDir));

  for (const absolutePath of htmlFiles) {
    const pathname = routeFromHtmlPath(baseDir, absolutePath);
    const html = readFileUtf8WithRetry(absolutePath);
    const robots = getMetaContent(html, "robots").toLowerCase();
    if (robots.includes("noindex")) continue;

    const canonical = getCanonical(html);
    let canonicalPath = "";
    try {
      canonicalPath = new URL(canonical).pathname.replace(/\/+$/, "") || "/";
    } catch {
      canonicalPath = "";
    }

    if (sitemapPaths.has(pathname) || sitemapPaths.has(canonicalPath)) continue;
    if (hasXRobotsNoindexHeader(pathname)) continue;
    assert(
      false,
      `${sitemapPath}: indexable route must be in sitemap, canonicalize to sitemap, or have X-Robots noindex: ${pathname}`,
    );
  }
}

trace("AdSense script ownership");
verifyAdsenseScriptOwnership();
trace("privacy policy embedded notice");
verifyPrivacyPolicyEmbedSource();
trace("public feature metadata source");
verifyPublicFeatureMetadataSource();
trace("fortune runtime policy language");
verifyFortuneRuntimePolicyLanguage();

for (const baseDir of ["out", "dist"]) {
  trace(`${baseDir}: no generated static AdSense units`);
  verifyNoGeneratedStaticAdUnits(baseDir);
  trace(`${baseDir}: indexable public routes`);
  verifyIndexablePublicRoutes(baseDir);
  trace(`${baseDir}: sample AdSense routes`);
  verifyAdsenseAllowedContentRoutes(baseDir);
  trace(`${baseDir}: feature guide content`);
  verifyFeatureGuideContentRoutes(baseDir);
  trace(`${baseDir}: blocked route samples`);
  verifyBlockedRouteSamplesNoAdsense(baseDir);
  trace(`${baseDir}: generated paid feature routes`);
  verifyGeneratedPaidFeatureRoutesNoAdsense(baseDir);
  trace(`${baseDir}: famous-saju alias noindex routes`);
  verifyFamousSajuAliasRoutesNoindex(baseDir);
  trace(`${baseDir}: private noindex samples`);
  verifyPrivateNoindexRoutes(baseDir);
  trace(`${baseDir}: custom 404 page`);
  verifyCustomNotFoundPage(baseDir);
  trace(`${baseDir}: robots`);
  verifyRobots(baseDir);
  trace(`${baseDir}: sitemap`);
  verifySitemap(baseDir);
  trace(`${baseDir}: AdSense sitemap alignment`);
  verifyAdsenseEligibleRouteSitemapAlignment(baseDir);
  trace(`${baseDir}: blocked indexable sitemap route quality`);
  verifyBlockedIndexableSitemapRouteQuality(baseDir);
  trace(`${baseDir}: no inherited home canonical`);
  verifyNoInheritedHomeCanonical(baseDir);
  trace(`${baseDir}: no inherited root title/description`);
  verifyNoInheritedRootMetadata(baseDir);
  trace(`${baseDir}: indexable title width`);
  verifyIndexableTitleWidth(baseDir);
  trace(`${baseDir}: indexable description width`);
  verifyIndexableDescriptionWidth(baseDir);
  trace(`${baseDir}: indexable outbound links`);
  verifyIndexableOutboundLinks(baseDir);
  trace(`${baseDir}: indexable flight payload budget`);
  verifyIndexableFlightPayloadBudget(baseDir);
  trace(`${baseDir}: indexable route coverage`);
  verifyIndexableRouteCoverage(baseDir);
  trace(`${baseDir}: generated AdSense-eligible routes`);
  verifyGeneratedAdsenseEligibleRoutes(baseDir);
  trace(`${baseDir}: generated AdSense-blocked routes`);
  verifyGeneratedAdsenseBlockedRoutes(baseDir);
}

console.log("[adsense-readiness] OK");
process.exit(0);
