import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  canLoadAdsense,
  canLoadAdsenseForCanonicalUrl,
} from "../app/components/adsense-route-policy.js";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const siteOrigin = "https://code-destiny.com";
const adsenseMarkers = /googlesyndication|adsbygoogle|ca-pub-9863227498729828/i;
const staticAdUnitMarkupPattern = /<ins\b[^>]*class=["'][^"']*adsbygoogle|data-ad-client|data-ad-slot|adsbygoogle\.push\s*\(/i;
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
  "/famous-saju",
  "/insights/famous-saju/king-sejong",
];

const adsenseBlockedRoutes = [
  "/",
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
  "/pdf/new-year",
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
  "/saju/destiny-bias",
  "/saju/destiny-bias/*",
  "/saju/love-simulation",
  "/saju/love-simulation/*",
  "/saju-fpti",
  "/saju-fpti/*",
  "/saju-guardian",
  "/saju-guardian/*",
  "/saju-picture",
  "/saju-picture/*",
  "/sukuyo/calendar",
  "/sukuyo/calendar/*",
  "/tarot/year",
  "/tarot/year/*",
  "/tarot/healing",
  "/tarot/healing/*",
  "/ziwei/chart",
  "/ziwei/chart/*",
  "/404",
  "/500",
  "/blog",
  "/blog/*",
  "/famous",
  "/famous/*",
  "/fortune",
  "/fortune/sikojen-povailu",
  "/fortune/sikojen-povailu/*",
];

const sitemapRequiredRoutes = [
  "/about",
  "/contact",
  "/disclaimer",
  "/editorial-policy",
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
  "/tarot/healing",
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
    "13세",
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
    "13세",
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

function readRequired(path) {
  const absolutePath = resolve(rootDir, path);
  if (!existsSync(absolutePath)) {
    throw new Error(`[adsense-readiness] missing required file: ${path}`);
  }
  return readFileSync(absolutePath, "utf8");
}

function readOptional(path) {
  const absolutePath = resolve(rootDir, path);
  if (!existsSync(absolutePath)) return "";
  return readFileSync(absolutePath, "utf8");
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

function routeHtmlPath(baseDir, route) {
  const trimmed = route.replace(/^\/+|\/+$/g, "");
  return trimmed ? `${baseDir}/${trimmed}/index.html` : `${baseDir}/index.html`;
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

function matchesFamousSajuAliasRoute(pathname) {
  return matchesPrefix(pathname, "/famous-saju") &&
    pathname !== "/famous-saju" &&
    !matchesPrefix(pathname, "/famous-saju/category");
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
  const deferredAdsensePath = "app/components/DeferredAdsense.tsx";
  const layoutSource = readRequired(layoutPath);
  const deferredAdsenseSource = readRequired(deferredAdsensePath);

  for (const absolutePath of sourceFiles) {
    const relPath = relative(rootDir, absolutePath).replace(/\\/g, "/");
    const content = readFileSync(absolutePath, "utf8");
    if (!adsenseMarkers.test(content)) continue;

    assert(
      adsenseSourceAllowedFiles.has(relPath),
      `${relPath}: AdSense script marker must stay centralized in DeferredAdsense`,
    );
  }

  assert(
    countMatches(layoutSource, /import\s+DeferredAdsense\s+from\s+["']\.\/components\/DeferredAdsense["']/g) === 1,
    `${layoutPath}: DeferredAdsense import must exist exactly once`,
  );
  assert(
    countMatches(layoutSource, /<DeferredAdsense\s*\/>/g) === 1,
    `${layoutPath}: DeferredAdsense mount must exist exactly once`,
  );
  assert(
    deferredAdsenseSource.includes("canLoadAdsenseForCanonicalUrl"),
    `${deferredAdsensePath}: must guard AdSense by canonical route policy`,
  );
  assert(
    deferredAdsenseSource.includes('strategy="lazyOnload"'),
    `${deferredAdsensePath}: AdSense script must stay lazily loaded`,
  );
  const conditionalRenderingMarkers = [
    "AD_REMOVAL_CACHE_KEY",
    "AD_REMOVAL_FEATURE_KEYS",
    "COOKIE_AUTH_HINT_KEYS",
    "currentDocumentAllowsAdsense",
    "currentViewerAllowsAdsense",
    "hasAdRemovalEntitlement",
    'authFetch("/api/billing/balance"',
    "readCachedAdRemovalEntitlement()",
    "writeCachedAdRemovalEntitlement(hasAdRemoval)",
    "clearCachedAdRemovalEntitlement()",
    'window.addEventListener("cd:auth-changed"',
    'window.addEventListener("storage"',
    "response.status === 401 || response.status === 403",
    "!documentAllowsAdsense || !viewerAllowsAdsense",
  ];

  for (const marker of conditionalRenderingMarkers) {
    assert(
      deferredAdsenseSource.includes(marker),
      `${deferredAdsensePath}: missing conditional AdSense rendering marker ${marker}`,
    );
  }
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
    "만 13세",
    "개인정보 삭제",
    "로컬스토리지",
  ];
  const forbiddenMarkers = ["\uFFFD", "로컈", "운세 풍이", "당 정보 삭제", "만 14세"];

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
        "\uD0C0\uB85C \uD504\uB86C\uD504\uD2B8 \uBA54\uC774\uCEE4",
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
    const html = readFileSync(absolutePath, "utf8");
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
      assert(!adsenseMarkers.test(html), `${htmlPath}: non-canonical AdSense candidate must not embed AdSense`);
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

    assert(!adsenseMarkers.test(html), `${htmlPath}: blocked route must not embed AdSense`);
  }
}

function verifyGeneratedPaidFeatureRoutesNoAdsense(baseDir) {
  const htmlFiles = collectIndexHtmlFiles(resolve(rootDir, baseDir));
  let paidRouteCount = 0;

  for (const absolutePath of htmlFiles) {
    const route = routeFromHtmlPath(baseDir, absolutePath);
    if (!matchesPaidFeatureRoute(route)) continue;
    paidRouteCount += 1;

    const htmlPath = relative(rootDir, absolutePath).replace(/\\/g, "/");
    const html = readFileSync(absolutePath, "utf8");
    assert(!canLoadAdsense(route), `${route}: paid feature route policy should block AdSense`);
    assert(!adsenseMarkers.test(html), `${htmlPath}: paid feature route must not embed AdSense`);
  }

  assert(paidRouteCount > 0, `${baseDir}: no paid feature routes were checked`);
}

function verifyFamousSajuAliasRoutesNoindex(baseDir) {
  const htmlFiles = collectIndexHtmlFiles(resolve(rootDir, baseDir));
  let aliasRouteCount = 0;

  for (const absolutePath of htmlFiles) {
    const route = routeFromHtmlPath(baseDir, absolutePath);
    const isTopLevelAlias = matchesFamousSajuAliasRoute(route);
    const isInsightsDetail = matchesInsightsFamousSajuDetailRoute(route);
    if (!isTopLevelAlias && !isInsightsDetail) continue;

    const htmlPath = relative(rootDir, absolutePath).replace(/\\/g, "/");
    const html = readFileSync(absolutePath, "utf8");
    const robots = getMetaContent(html, "robots").toLowerCase();
    const googleBot = getMetaContent(html, "googlebot").toLowerCase();
    const canonical = getCanonical(html);
    const canonicalPath = canonicalPathnameFromUrl(canonical);
    const normalizedRoute = route.replace(/\/+$/, "") || "/";
    const isInsightsAlias = isInsightsDetail && canonicalPath !== normalizedRoute;
    if (!isTopLevelAlias && !isInsightsAlias) continue;
    aliasRouteCount += 1;

    const currentHref = `${siteOrigin}${route === "/" ? "" : route}/`;
    if (isTopLevelAlias) {
      assert(!canLoadAdsense(route), `${route}: famous-saju alias route policy should block AdSense`);
    }
    assert(
      !canLoadAdsenseForCanonicalUrl(route, canonical, currentHref),
      `${route}: famous-saju alias canonical URL policy should block AdSense`,
    );
    assert(!adsenseMarkers.test(html), `${htmlPath}: famous-saju alias route must not embed AdSense`);
    assert(canonicalPath.startsWith("/insights/famous-saju/"), `${htmlPath}: famous-saju alias must canonicalize to insights`);
    assert(robots.includes("noindex"), `${htmlPath}: famous-saju alias must contain noindex robots`);
    assert(googleBot.includes("noindex"), `${htmlPath}: famous-saju alias googlebot must contain noindex`);
  }

  assert(aliasRouteCount > 0, `${baseDir}: no famous-saju alias routes were checked`);
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

function verifyXRobotsNoindexHeaders(headersPath) {
  const headersText = readRequired(headersPath);
  for (const pattern of xRobotsNoindexHeaderPatterns) {
    const policyPath = pattern.endsWith("/*") ? pattern.slice(0, -2) : pattern;
    assert(!canLoadAdsense(policyPath), `${policyPath}: X-Robots noindex route must not load AdSense`);

    const rulePattern = new RegExp(
      `^${escapeRegex(pattern)}\\s*\\r?\\n(?:[ \\t].*\\r?\\n)*?[ \\t]+X-Robots-Tag:\\s*noindex,\\s*nofollow\\s*$`,
      "im",
    );
    assert(rulePattern.test(headersText), `${headersPath}: missing X-Robots-Tag noindex rule for ${pattern}`);
  }
}

function verifyGeneratedAdsenseBlockedRoutes(baseDir) {
  const htmlFiles = collectIndexHtmlFiles(resolve(rootDir, baseDir));

  for (const absolutePath of htmlFiles) {
    const route = routeFromHtmlPath(baseDir, absolutePath);
    if (canLoadAdsense(route)) continue;

    const htmlPath = relative(rootDir, absolutePath).replace(/\\/g, "/");
    const html = readFileSync(absolutePath, "utf8");
    assert(!adsenseMarkers.test(html), `${htmlPath}: AdSense-blocked route must not embed AdSense`);
  }
}

function verifyNoGeneratedStaticAdUnits(baseDir) {
  const htmlFiles = collectIndexHtmlFiles(resolve(rootDir, baseDir));

  for (const absolutePath of htmlFiles) {
    const htmlPath = relative(rootDir, absolutePath).replace(/\\/g, "/");
    const html = readFileSync(absolutePath, "utf8");
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
  "dist/index.html",
  "dist/static/index.html",
  "dist/en/index.html",
  "dist/ja/index.html",
  "dist/zh/index.html",
];

for (const shellPath of staticShells) {
  const html = readRequired(shellPath);
  assert(!adsenseMarkers.test(html), `${shellPath}: static shell must not embed AdSense directly`);

  for (const route of staticShellTrustLinks) {
    assert(html.includes(`href="${route}"`), `${shellPath}: missing trust link ${route}`);
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
  assert(!/^disallow:\s*\/\s*$/im.test(robotsText), `${robotsPath}: blocks the entire site`);
  assert(
    !/user-agent:\s*(googlebot|mediapartners-google)[\s\S]*?disallow:\s*\/\s*$/im.test(robotsText),
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
      assert(
        visibleText.length >= 900,
        `${sitemapPath}: sitemap route visible content is too thin (${visibleText.length} chars): ${pathname}`,
      );
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
    const html = readFileSync(absolutePath, "utf8");
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

function verifyIndexableRouteCoverage(baseDir) {
  const sitemapPath = `${baseDir}/sitemap.xml`;
  const sitemapText = readRequired(sitemapPath);
  const sitemapPaths = new Set(getSitemapPaths(sitemapText));
  const htmlFiles = collectIndexHtmlFiles(resolve(rootDir, baseDir));

  for (const absolutePath of htmlFiles) {
    const pathname = routeFromHtmlPath(baseDir, absolutePath);
    const html = readFileSync(absolutePath, "utf8");
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
  trace(`${baseDir}: robots`);
  verifyRobots(baseDir);
  trace(`${baseDir}: sitemap`);
  verifySitemap(baseDir);
  trace(`${baseDir}: AdSense sitemap alignment`);
  verifyAdsenseEligibleRouteSitemapAlignment(baseDir);
  trace(`${baseDir}: blocked indexable sitemap route quality`);
  verifyBlockedIndexableSitemapRouteQuality(baseDir);
  trace(`${baseDir}: indexable route coverage`);
  verifyIndexableRouteCoverage(baseDir);
  trace(`${baseDir}: generated AdSense-eligible routes`);
  verifyGeneratedAdsenseEligibleRoutes(baseDir);
  trace(`${baseDir}: generated AdSense-blocked routes`);
  verifyGeneratedAdsenseBlockedRoutes(baseDir);
}

console.log("[adsense-readiness] OK");
process.exit(0);
