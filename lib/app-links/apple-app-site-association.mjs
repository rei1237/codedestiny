/**
 * iOS 유니버설 링크·비밀번호 자동완성(apple-app-site-association) 원본.
 *
 * 🔴 APPLE_TEAM_ID 가 비어 있으면 AASA 파일을 만들지 않는다(scripts/write-apple-app-site-association.mjs).
 *    자리표시자나 임의 값이 든 AASA 를 배포하면 Apple CDN 이 그 값을 캐시하고, 실제 앱과 연결되지 않는다.
 *    Apple Developer 등록 뒤 Membership 화면의 Team ID(영문 대문자·숫자 10자)를 여기 한 줄로 넣는다.
 *    Team ID 는 비밀값이 아니다 — AASA 자체가 공개 파일이다. (docs/ios/phase-reports/phase-4.md)
 */
export const APPLE_TEAM_ID = "";

export const IOS_BUNDLE_ID = "com.codedestiny.app";

// AASA 를 내는 도메인. www 는 Cloudflare 가 apex 로 301 하고, Apple 은 AASA 리다이렉트를 따라가지 않는다.
// 그래서 apex 하나만 둔다(App.entitlements 의 applinks: 와 같은 목록).
export const ASSOCIATED_DOMAINS = ["code-destiny.com"];

// 앱으로 넘기지 않는 웹 경로. 위에서부터 먼저 맞는 규칙이 이긴다.
// - /api/*: 화면이 아니다(OAuth 콜백 포함). /admin/*: 앱 번들에서 지운다(build-mobile-app.mjs).
// - /checkout/*: 앱 번들은 PortOne 을 빼고, StoreKit 은 Phase 6 이다. 웹 결제 링크는 Safari 에 남긴다.
// - /share/, /fortune/share/: public/_worker.js 가 요청마다 그리는 공유 카드라 앱 번들에 같은 화면이 없다.
// - 파일형 경로(.xml·.txt·.json)와 /.well-known/, /og/: 문서가 아니다.
export const EXCLUDED_PATH_PATTERNS = [
  "/api/*",
  "/admin/*",
  "/checkout/*",
  "/share/*",
  "/fortune/share/*",
  "/.well-known/*",
  "/og/*",
  "*.xml",
  "*.txt",
  "*.json",
];

const TEAM_ID_PATTERN = /^[A-Z0-9]{10}$/;

/** 비어 있으면 "", 형식이 틀리면 예외(fail-closed), 맞으면 그대로. */
export function normalizeTeamId(value) {
  const teamId = String(value == null ? "" : value).trim();
  if (!teamId) return "";
  if (!TEAM_ID_PATTERN.test(teamId)) {
    throw new Error(`APPLE_TEAM_ID 형식이 아니다(영문 대문자·숫자 10자): ${JSON.stringify(teamId)}`);
  }
  return teamId;
}

/** Team ID 가 없으면 null — 호출부는 파일을 쓰지 않는다. */
export function buildAppleAppSiteAssociation(teamIdInput = APPLE_TEAM_ID) {
  const teamId = normalizeTeamId(teamIdInput);
  if (!teamId) return null;
  const appID = `${teamId}.${IOS_BUNDLE_ID}`;
  return {
    applinks: {
      details: [
        {
          appIDs: [appID],
          components: [
            ...EXCLUDED_PATH_PATTERNS.map((pattern) => ({ "/": pattern, exclude: true })),
            { "/": "/*" },
          ],
        },
      ],
    },
    webcredentials: { apps: [appID] },
  };
}
