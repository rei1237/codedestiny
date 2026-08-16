const ADSENSE_ALLOWED_ORIGIN = "https://code-destiny.com";

const BLOCKED_EXACT_PATHS = new Set([
  "/",
  "/advertising-policy",
  "/contact",
  "/contact-us",
  "/disclaimer",
  "/editorial-policy",
  "/health-report/guide",
  "/index.html",
  "/music",
  "/palm-reading",
  "/premium-reports",
  "/privacy",
  "/privacy-policy",
  "/fortune/prompt-hub",
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
  "/terms",
  "/terms-of-service",
  "/ziwei/chart",
]);

const BLOCKED_PREFIXES = [
  "/admin",
  "/api",
  "/api-hello-test",
  "/auth",
  "/checkout",
  "/fail",
  "/fortune/prompt-hub",
  "/login",
  "/me",
  "/my",
  "/onboarding",
  "/payment",
  "/payments",
  "/palm-reading",
  "/pdf",
  "/points",
  "/premium",
  "/premium-reports",
  "/premium-unlock",
  "/profile",
  "/psychotest",
  "/report/progress",
  "/result",
  "/results",
  "/saju/animal-destiny",
  "/saju/destiny-bias",
  "/saju/destiny-meeting-place",
  "/saju/lifebook",
  "/saju/love-bible",
  "/saju/love-simulation",
  "/signup",
  "/success",
  "/tarot/crystal-soul",
  "/tarot/mindscan",
  "/tarot/numerology/result",
  "/tarot/prompt-maker/result",
  "/ziwei/chart",
];

const LOCALE_ROOT_PATHS = new Set([
  "/ko",
  "/en",
  "/ja",
  "/zh",
  // zh-TW 는 2026-07 에 공개 로케일로 열렸는데 이 목록에만 빠져 있었다. 셸이 광고 코드를
  // 담지 않아 지금까지 무해했을 뿐, 다른 로케일 루트와 같은 취급을 받아야 한다.
  "/zh-tw",
  "/en-us",
  "/ja-jp",
  "/zh-cn",
]);

const CONTENT_EXACT_PATHS = new Set([
  "/about",
  "/faq",
  "/famous-saju",
  "/methodology",
  "/reviews",
  "/astrology/guide",
  "/calendar/guide",
  "/mayan-calendar/guide",
  "/music/guide",
  "/saju/guide",
  "/saju/five-elements",
  "/saju/ten-gods",
  "/sukuyo/guide",
  "/tarot/guide",
  "/tarot/numerology",
  "/tarot/prompt-maker",
  "/vedic/guide",
  "/ziwei/guide",
]);

const CONTENT_PREFIXES = [
  "/famous-saju/category",
  // 별자리·띠 하루 운세(허브 2 + 상세 48). 본문이 전부 서버 렌더라 게재 가능 라우트의
  // 최소 렌더 텍스트 기준을 실제 콘텐츠로 채운다.
  // 🔴 "/fortune" 전체를 열지 않는다 — /fortune/prompt-hub 는 BLOCKED_PREFIXES 대상이고
  //    /fortune/sikojen-povailu 는 noindex 라, 상위 접두사로 열면 게이트끼리 충돌한다.
  "/fortune/today",
  "/fortune/tomorrow",
  "/high-value",
  "/insights",
];

// 자손 경로만 차단하고 정확 일치는 허용 목록 판정에 맡긴다.
// /insights/famous-saju 허브는 계속 광고·색인 대상이지만, 상세 페이지는
// 이름·생일만 갈아 끼운 템플릿 양산물이라 noindex + 사이트맵 제외로 돌렸다.
// 광고까지 같이 끄지 않으면 verify-adsense-readiness 의
// "광고 가능 + self-canonical → noindex 금지 + 사이트맵 필수" 단언과 충돌한다.
const BLOCKED_DESCENDANT_PREFIXES = [
  "/insights/famous-saju",
];

const SAFE_QUERY_KEYS = new Set([
  "fbclid",
  "gbraid",
  "gclid",
  "msclkid",
  "ref",
  "source",
  "wbraid",
]);

const BLOCKED_QUERY_KEYS = new Set([
  "action",
  "auth",
  "birth",
  "birthday",
  "birthdate",
  "birthtime",
  "checkout",
  "code",
  "coin",
  "coins",
  "coupon",
  "email",
  "feature",
  "featureid",
  "featurekey",
  "gender",
  "modal",
  "order",
  "orderid",
  "pass",
  "pay",
  "payment",
  "plan",
  "point",
  "points",
  "premiumintent",
  "profile",
  "report",
  "reportid",
  "result",
  "resultid",
  "session",
  "sessionid",
  "state",
  "subscription",
  "token",
  "transactionid",
  "tx",
  "txid",
  "uid",
  "unlock",
  "user",
]);

const BLOCKED_QUERY_VALUE_PATTERN =
  /premium|payment|checkout|coin|unlock|result|report|modal|auth|login|signup|birth|email|profile|pdf/i;

function isSafeAdsenseQueryKey(key) {
  return key.startsWith("utm_") || SAFE_QUERY_KEYS.has(key);
}

function hasBlockedAdsenseQuery(search) {
  const params = new URLSearchParams(search || "");

  for (const [rawKey, rawValue] of params) {
    const key = rawKey.trim().toLowerCase();
    const value = String(rawValue || "");
    if (!key) continue;
    if (isSafeAdsenseQueryKey(key)) continue;
    if (BLOCKED_QUERY_KEYS.has(key)) return true;
    if (BLOCKED_QUERY_VALUE_PATTERN.test(`${key}=${value}`)) return true;
    return true;
  }

  return false;
}

function parseAdsenseLocation(value) {
  const text = String(value || "/");

  try {
    const url = new URL(text, ADSENSE_ALLOWED_ORIGIN);
    return { pathname: url.pathname, search: url.search };
  } catch {
    const [pathPart, queryPart = ""] = text.split("?");
    const pathname = pathPart.split("#")[0] || "/";
    const search = queryPart ? `?${queryPart.split("#")[0]}` : "";
    return { pathname, search };
  }
}

export function normalizeAdsensePathname(pathname) {
  const rawPath = parseAdsenseLocation(pathname).pathname.replace(/\/+$/, "") || "/";
  return rawPath === "" ? "/" : rawPath;
}

function normalizeAdsenseOrigin(origin) {
  return origin?.replace(/\/+$/, "").toLowerCase() || "";
}

function matchesPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function canLoadAdsense(pathname) {
  const location = parseAdsenseLocation(pathname);
  if (hasBlockedAdsenseQuery(location.search)) return false;

  const rawPath = location.pathname.replace(/\/+$/, "") || "/";
  if (LOCALE_ROOT_PATHS.has(rawPath)) return false;

  const normalizedPathname = normalizeAdsensePathname(pathname);

  if (BLOCKED_EXACT_PATHS.has(normalizedPathname)) return false;
  if (BLOCKED_PREFIXES.some((prefix) => matchesPrefix(normalizedPathname, prefix))) return false;
  if (BLOCKED_DESCENDANT_PREFIXES.some((prefix) => normalizedPathname.startsWith(`${prefix}/`))) return false;
  if (CONTENT_EXACT_PATHS.has(normalizedPathname)) return true;
  if (CONTENT_PREFIXES.some((prefix) => matchesPrefix(normalizedPathname, prefix))) return true;
  return false;
}

export function canLoadAdsenseForCanonicalPath(pathname, canonicalPathname) {
  if (!canLoadAdsense(pathname)) return false;
  return normalizeAdsensePathname(pathname) === normalizeAdsensePathname(canonicalPathname);
}

export function canLoadAdsenseForCanonicalUrl(pathname, canonicalHref, currentHref) {
  try {
    const currentUrl = new URL(currentHref || ADSENSE_ALLOWED_ORIGIN);
    const canonicalUrl = new URL(canonicalHref, currentUrl.href);
    const requestedLocation = parseAdsenseLocation(pathname || `${currentUrl.pathname}${currentUrl.search}`);

    if (normalizeAdsenseOrigin(currentUrl.origin) !== ADSENSE_ALLOWED_ORIGIN) return false;
    if (normalizeAdsenseOrigin(canonicalUrl.origin) !== ADSENSE_ALLOWED_ORIGIN) return false;
    if (hasBlockedAdsenseQuery(currentUrl.search)) return false;
    if (hasBlockedAdsenseQuery(canonicalUrl.search)) return false;
    if (hasBlockedAdsenseQuery(requestedLocation.search)) return false;

    return canLoadAdsenseForCanonicalPath(
      `${requestedLocation.pathname}${requestedLocation.search}`,
      canonicalUrl.pathname,
    );
  } catch {
    return false;
  }
}
