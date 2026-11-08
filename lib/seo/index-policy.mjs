/**
 * 색인 정책 원장. 경로마다 메타 noindex·사이트맵 제외·비공개 여부를 여기서만 정한다.
 *
 * 읽는 곳: lib/seo/siteSeo.ts(noindexPathPrefixes·isNoindexPath), scripts/generate-sitemap.mjs(사이트맵 제외).
 * scripts/generate-llms-txt.mjs 는 사이트맵 집합으로 거르므로 원장을 간접으로 따른다. robots.txt 정본은 lib/seo/robots-policy.mjs 이고
 * 여기서 다시 내보내 import 창구를 하나로 둔다. public/_worker.js·_headers 는 import 하지 않는다(verify-dist 가 대조한다).
 *
 * 항목 하나 = { path, match, meta, sitemap, private, note? }
 * - match: "prefix" 는 `=== path || startsWith(path + "/")` — 이웃(/premium ↔ /premium-reports, /my ↔ /mythology)을 삼키지 않는다.
 *          "exact" 는 사이트맵 정규화 경로(후행 슬래시·확장자 포함) 글자 그대로. "pattern" 은 어느 깊이든 `<path>(/|$)` 세그먼트.
 * - meta: "noindex" 면 lib/seo/siteSeo.ts 의 noindexPathPrefixes 에 들어간다 → isNoindexPath → isPrivateRoute(lib/seo.v2.ts)
 *         → ShareWidget 숨김까지 흐른다. 그래서 공유 버튼이 있는 랜딩(/flower, SeoLandingTemplate 계열)은 meta 를 null 로 두고
 *         페이지 단위 noindex 로 처리한다.
 * - sitemap: false 면 scripts/generate-sitemap.mjs 가 사이트맵에서 뺀다. true 는 "이 원장으로는 빼지 않는다"이다
 *         (meta noindex 인데 sitemap true 인 항목은 라우트가 없거나 isLiveRoute 가 걸러 사이트맵에 오르지 않는다 — 옮기기만 했다).
 * - private: true 면 사이트맵의 비공개 라우트 패턴(SITEMAP_PRIVATE_ROUTE_PATTERNS)으로 나간다.
 *
 * 🔴 순서: META_NOINDEX_PREFIXES 는 siteSeo.ts 의 예전 배열과 순서까지 같다. 사이트맵 쪽 파생 목록은 예전 배열과
 *    원소가 같고 순서만 다르다(판정이 `.some()` 이라 순서는 결과를 바꾸지 않는다).
 * 🔴 _headers 정본은 리포 루트다 — public/_headers 는 sync:public 이 만드는 사본이다. 여기를 고치면 루트 _headers 의
 *    X-Robots-Tag 와 scripts/verify-adsense-readiness.mjs 의 xRobotsNoindexHeaderPatterns 도 함께 본다.
 *
 * 원장 밖에 둔 목록(뜻이 다르다):
 * - scripts/verify-adsense-readiness.mjs 의 광고 불가 유료 경로·`_headers` 헤더 패턴 목록 — 색인 판정이 아니라 광고·헤더 검사용이다.
 *   privateNoindexRoutes 는 빌드 HTML 표본(nofollow 까지 본다), xRobotsNoindexHeaderPatterns 는 원장 밖 경로도 담은
 *   헤더 커버리지 목록, sitemapForbiddenPrefixes 는 원장과 다른 부분집합(+/pdf·/premium 등)이다. 어느 것도 파생 목록과
 *   같지 않아 그대로 두고, sitemapForbiddenPrefixes 가 원장 noindex 의 부분집합인지만 __tests__/ui/index-policy.test.mjs 가 본다.
 * - scripts/lib/static-shell-route-meta.mjs 의 robots 문자열("noindex, follow, max-*") — ROBOTS_META.NOINDEX_FOLLOW 로 만들면
 *   max-* 지시가 빠져 출력이 바뀌므로 문자열로 두고, googlebot meta 만 걷어 robots 계열 meta 를 1개로 맞춘다(묶음 ③ T4).
 * - lib/seo/robots-policy.mjs 의 PRIVATE_DISALLOW_RULES — 크롤 차단(robots.txt)이지 색인 판정이 아니다. 재내보내기만 한다.
 *
 * Next(TS)와 Node 스크립트가 모두 읽으므로 의존성 없는 ESM 으로 둔다.
 */
export { PRIVATE_DISALLOW_RULES, buildRobotsRules } from "./robots-policy.mjs";

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/** 메타 noindex + 사이트맵 제외(일반 noindex 경로). */
const hidden = (path, note) => ({ path, match: "prefix", meta: "noindex", sitemap: false, private: false, ...(note ? { note } : {}) });
/** 메타 noindex + 비공개 라우트(사이트맵 비공개 패턴). */
const privatePrefix = (path, meta = "noindex", note) => ({ path, match: "prefix", meta, sitemap: false, private: true, ...(note ? { note } : {}) });
/** 메타 noindex 만. 사이트맵 목록에는 예전에도 없었다(라우트가 없거나 isLiveRoute 가 거른다). */
const metaOnly = (path, note) => ({ path, match: "prefix", meta: "noindex", sitemap: true, private: false, ...(note ? { note } : {}) });

export const INDEX_POLICY = deepFreeze([
  // 선택형/놀이형 콘텐츠 임시 비노출 (기존 결과는 보존).
  hidden("/saju/love-simulation"),
  hidden("/secret-house_real"),
  hidden("/destiny-poker"),
  hidden("/mini-games"),
  // 날짜별 보관 화면은 재방문 도구다. 기간별 정본과 반복되는 360개 URL은 검색에서 제외한다.
  hidden("/fortune/date"),
  hidden("/neo-operation-room/strategy-books"),
  hidden("/records"),
  // 기업 API 키 관리 화면 — 페이지가 robots { index: false, follow: false } 를 직접 선언한다(meta 목록 밖). _headers 는 noindex, nofollow.
  { path: "/business/api/dashboard", match: "prefix", meta: null, sitemap: false, private: false },
  hidden("/consultations"),
  privatePrefix("/api"),
  metaOnly("/api-hello-test"),
  privatePrefix("/admin"),
  privatePrefix("/auth"),
  privatePrefix("/login"),
  privatePrefix("/signup"),
  privatePrefix("/profile"),
  privatePrefix("/payment"),
  privatePrefix("/payments"),
  privatePrefix("/checkout"),
  metaOnly("/success"),
  metaOnly("/fail"),
  metaOnly("/debug"),
  metaOnly("/test"),
  privatePrefix("/dev-status"),
  privatePrefix("/me"),
  privatePrefix("/my"),
  privatePrefix("/points"),
  metaOnly("/account/delete", "사이트맵 제외는 아래 exact `/account/delete/` 항목이 맡는다."),
  privatePrefix("/premium-unlock"),
  metaOnly("/result"),
  metaOnly("/results"),
  metaOnly("/report/progress"),
  // 개인 다이어리 — 검색 대상이 아니다(로그인 없이도 열리지만 내용은 전부 사용자 기기 안에 있다).
  // meta 목록은 isNoindexPath → isPrivateRoute 로 이어져 ShareWidget 도 지운다 — 개인 기록 화면에 공유 위젯이 뜨지 않는 것이 의도다.
  hidden("/diary"),
  hidden("/animal/physio"),
  // 🔴 `/maya*` 로 넓히지 말 것 — 색인 대상인 `/mayan-calendar/guide` 까지 삼킨다(prefix 매칭은 세그먼트 경계를 지킨다).
  hidden("/maya"),
  hidden("/oracle/royal-tea"),
  hidden("/oracle/sikojen-povailu"),
  hidden("/palm-reading"),
  hidden("/pdf"),
  hidden("/premium"),
  hidden("/premium-reports"),
  // 🔴 /saju-fpti 는 여기 없다. 2026-08-28 에 색인으로 되돌리면서 사이트맵·_headers·page metadata 는 index 가 됐는데
  //    meta 목록만 남아 ShareWidget 이 사라져 있었다(2026-09-05 SEO 진단 F-07). 다시 넣지 말 것.
  // 2026-08-24: /saju/destiny-bias · /saju/love-simulation · /saju-guardian · /tarot/healing · /neo-operation-room 을
  //    사이트맵 noindex 목록에서 뺐다. 얇았던 이유는 본문이 클라이언트 JS 안에만 있어서였고, page.tsx 에 서버 렌더 안내 섹션
  //    (문장급 본문 1,300자 이상)을 넣은 뒤 색인으로 되돌렸다.
  // 셸 사본만 존재하는 라우트(app 페이지가 없어 홈 셸 복사본이 곧 본문이다). 나머지 9개는 2026-08-23 에 app 랜딩을 살려
  //    색인 대상으로 돌렸다 — docs/context/seo-and-adsense.md 참고.
  hidden("/oracle/juyuk"),
  hidden("/oracle/hwatu"),
  hidden("/blog"),
  hidden("/fortune/sikojen-povailu"),
  // AdSense 가 "가치 없는 콘텐츠"로 거절한 뒤 실측(out/, 2026-08-17)해 뺀 얇은 목록형·스텁 라우트.
  // 고유본문(8-gram shingle 로 공통 크롬 제거) 기준: guides 카테고리 272~558자, famous-saju 카테고리 289~1,859자
  // (4-gram Jaccard 중복도 84.4%), flower 399~449자.
  // 🔴 prefix 매칭이라 `/guides/<slug>` 12개는 계속 색인 대상이다. 상위 접두로 줄이지 말 것.
  //    (`/famous-saju/category` 는 2026-08-17 에 라우트째 삭제해 뺐다 — `public/_redirects` 가 301 로 회수한다.)
  hidden("/guides/category"),
  // 🔴 `/flower` 는 **일부러 meta 가 null 이다.** meta 목록은 isNoindexPath → lib/seo.v2.ts isPrivateRoute →
  //    lib/share.v2.ts 까지 흘러 ShareWidget 을 통째로 숨긴다(app/components/ShareWidget.tsx). /flower/* 4개는
  //    FeatureLandingPage 가 공유 버튼을 렌더하는 유료 랜딩이라, 색인만 끄려다 기능을 지우게 된다.
  //    대신 각 페이지에서 generatePageMetadata({ noindex: true }) 로 선언하고, 사이트맵에서만 여기서 뺀다.
  // 🔴 SeoLandingTemplate 계열(/physiognomy·/love·/compatibility·/saju/compatibility·/dream)도 같은 사유로 meta 목록에
  //    넣지 않는다(SeoLandingTemplate.jsx 가 DeferredShareWidget 을 렌더한다). 2026-08-20 에 본문을 채우고 색인으로 되돌렸다
  //    (고유 본문 577~690자 → 1,294~1,638자). `/dream` 이 색인되면 자식 `/dream/psycho`·`/dream/tarot` 도 함께 색인된다.
  // 🔴 `/fortune/weekly`·`/fortune/monthly` 는 2026-08-17 에 noindex 였고 2026-08-28 에 뺐다. 다시 넣지 말 것.
  //    ① 크롬 제거 8-gram Jaccard 24~38% 로, 색인을 유지 중인 today↔tomorrow(31.1%)와 같은 범위다.
  //    ② 기간 축은 #766 이후 실제로 갈린다(lib/fortune/period-readings.ts 96편 · lib/fortune/period-faqs.ts).
  //    ③ 광고 인벤토리는 그대로 0 이다 — adsense-route-policy.js 의 CONTENT_PREFIXES 에는 `/fortune/today`·`/fortune/tomorrow` 만 있다.
  //    되돌리면서 다시 적용되는 게이트: verify-adsense-readiness 의 verifyBlockedIndexableSitemapRouteQuality
  //    (광고 불가 + 사이트맵 등재 + noindex 아님 → 가시 텍스트 1,800자 이상)와 색인 제목·설명 표시 폭 검사다.
  { path: "/flower", match: "prefix", meta: null, sitemap: false, private: false, note: "공유 버튼 때문에 meta 목록 밖. 페이지 단위 noindex." },
  // 로그인 사용자 전용 비밀번호 변경 폼. 본문이 입력창뿐이라 색인 대상이 아니다(meta 는 페이지·_headers 가 맡는다).
  privatePrefix("/account/password", null),
  // 어느 깊이든 이 세그먼트가 있으면 비공개(플레이·진행·콜백 화면).
  { path: "/play", match: "pattern", meta: null, sitemap: false, private: true },
  { path: "/stage", match: "pattern", meta: null, sitemap: false, private: true },
  { path: "/start", match: "pattern", meta: null, sitemap: false, private: true },
  { path: "/callback", match: "pattern", meta: null, sitemap: false, private: true },
  // 확장자가 있는 경로는 사이트맵 정규화가 후행 슬래시를 붙이지 않아 prefix(startsWith path + "/")로 걸러지지 않는다.
  { path: "/secret-house_real.html", match: "exact", meta: null, sitemap: false, private: false },
  { path: "/destiny-poker.html", match: "exact", meta: null, sitemap: false, private: false },
  // Retired presentations redirect to their canonical category or home.
  { path: "/kkul-kkul-unse/", match: "exact", meta: null, sitemap: false, private: false },
  { path: "/saju/basic/", match: "exact", meta: null, sitemap: false, private: false },
  { path: "/oracle/sukuyo/", match: "exact", meta: null, sitemap: false, private: false },
  { path: "/vedic/jyotish/", match: "exact", meta: null, sitemap: false, private: false },
  { path: "/astrology/cosmic/", match: "exact", meta: null, sitemap: false, private: false },
  { path: "/ifa-oracle.html", match: "exact", meta: null, sitemap: false, private: false },
  { path: "/account/delete/", match: "exact", meta: null, sitemap: false, private: false },
]);

/** Next `Metadata["robots"]` 모양. 구글은 `robots` meta 의 max-* 지시도 읽으므로 googleBot 키를 따로 두지 않는다. */
/** @typedef {{ index: boolean, follow: boolean, "max-image-preview"?: "large", "max-snippet"?: number, "max-video-preview"?: number }} RobotsMeta */
/** @type {Readonly<{ INDEX: Readonly<RobotsMeta>, NOINDEX_FOLLOW: Readonly<RobotsMeta>, NOINDEX: Readonly<RobotsMeta> }>} */
export const ROBOTS_META = deepFreeze({
  INDEX: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  NOINDEX_FOLLOW: { index: false, follow: true },
  NOINDEX: { index: false, follow: false },
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const META_NOINDEX_PREFIXES = Object.freeze(
  INDEX_POLICY.filter((entry) => entry.match === "prefix" && entry.meta === "noindex").map((entry) => entry.path),
);

export const SITEMAP_NOINDEX_PREFIXES = Object.freeze(
  INDEX_POLICY.filter((entry) => entry.match === "prefix" && !entry.sitemap && !entry.private).map((entry) => entry.path),
);

export const SITEMAP_PRIVATE_ROUTE_PATTERNS = Object.freeze(
  INDEX_POLICY.filter((entry) => entry.private).map((entry) =>
    new RegExp(`${entry.match === "pattern" ? "" : "^"}${escapeRegExp(entry.path)}(?:/|$)`)),
);

export const SITEMAP_EXCLUDED_EXACT_PATHS = new Set(
  INDEX_POLICY.filter((entry) => entry.match === "exact" && !entry.sitemap).map((entry) => entry.path),
);

/** lib/seo/siteSeo.ts normalizeSeoPath 와 같은 규칙: 오리진·쿼리·해시 제거, `//` 압축, 끝 슬래시 제거(루트 제외). */
export function normalizePolicyPath(pathOrUrl) {
  const raw = String(pathOrUrl || "/").trim();
  if (!raw) return "/";
  let pathname = raw;
  try {
    if (/^https?:\/\//i.test(raw)) pathname = new URL(raw).pathname || "/";
  } catch {
    pathname = "/";
  }
  const noQuery = pathname.split("?")[0].split("#")[0] || "/";
  const leading = noQuery.startsWith("/") ? noQuery : `/${noQuery}`;
  const compact = leading.replace(/\/{2,}/g, "/");
  return compact === "/" ? "/" : compact.replace(/\/+$/, "");
}

function prefixMatches(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function entryMatches(entry, path) {
  if (entry.match === "prefix") return prefixMatches(path, entry.path);
  if (entry.match === "exact") return path === normalizePolicyPath(entry.path);
  return new RegExp(`${escapeRegExp(entry.path)}(?:/|$)`).test(path);
}

/** 이 경로에 걸리는 원장 항목들(검사·디버깅용). */
export function matchPolicyEntries(pathOrUrl) {
  const path = normalizePolicyPath(pathOrUrl);
  return INDEX_POLICY.filter((entry) => entryMatches(entry, path));
}

export function isMetaNoindexPath(pathOrUrl) {
  const path = normalizePolicyPath(pathOrUrl);
  return META_NOINDEX_PREFIXES.some((prefix) => prefixMatches(path, prefix));
}

export function isSitemapExcludedPath(pathOrUrl) {
  return matchPolicyEntries(pathOrUrl).some((entry) => !entry.sitemap);
}

export function isIndexablePath(pathOrUrl) {
  return !isMetaNoindexPath(pathOrUrl) && !isSitemapExcludedPath(pathOrUrl);
}
