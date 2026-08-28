/**
 * 동적 OG 카드의 **순수 부분** — 파라미터 해석과 카드 마크업 조립.
 *
 * 🔴 이 파일은 `workers-og` 를 import 하지 않는다. 그 패키지는 `.wasm` 을 모듈로 가져오는데,
 * 플레인 node 에서는 그 import 가 실패한다. 검증 스크립트가 파싱·이스케이프·상한 같은
 * 실제 판정 로직을 돌려 보려면 wasm 과 갈라져 있어야 한다.
 * 요청 처리와 렌더는 worker/routes/og.js 가 맡는다.
 */

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export const TITLE_MAX = 60;
export const DESC_MAX = 120;

export const DEFAULT_TITLE = "코드 데스티니";
export const DEFAULT_BADGE = "운세";

/**
 * 🔴 프리셋만 허용한다. 사용자가 준 문자열을 배지로 그대로 그리지 않는다.
 * 여기에 없는 키는 조용히 DEFAULT_BADGE 로 떨어진다.
 */
export const BADGES = {
  saju: "사주",
  tarot: "타로",
  astrology: "점성술",
  ziwei: "자미두수",
  dream: "꿈해몽",
  compatibility: "궁합",
  fortune: "오늘의 운세",
  insight: "인사이트",
};

export const THEMES = {
  dark: {
    background: "#0b0b16",
    title: "#f5f3ff",
    description: "#a3a0b8",
    accent: "#c9a227",
    brand: "#e5e2f5",
    domain: "#6f6b87",
  },
  light: {
    background: "#faf9ff",
    title: "#14122b",
    description: "#55516e",
    accent: "#8a6d1f",
    brand: "#14122b",
    domain: "#7b7793",
  },
};

// 제어문자는 satori 렌더를 깨뜨리고 로그도 오염시킨다.
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001f\\u007f]", "g");

function sanitizeText(raw, max) {
  return String(raw || "")
    .replace(CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 🔴 여기서 받는 파라미터가 전부다. 명세의 `image` 는 일부러 빠져 있다 —
 * 임의 원격 URL 을 워커가 fetch 하면 그대로 SSRF 가 된다.
 */
export function parseOgParams(searchParams) {
  const badgeKey = String(searchParams.get("badge") || "").trim().toLowerCase();
  const themeKey = String(searchParams.get("theme") || "").trim().toLowerCase();

  return {
    title: sanitizeText(searchParams.get("title"), TITLE_MAX) || DEFAULT_TITLE,
    description: sanitizeText(searchParams.get("desc"), DESC_MAX),
    // 🔴 Object.hasOwn 이어야 한다. BADGES["__proto__"] 는 Object.prototype 을 돌려주고
    // 그건 truthy 라, 단순 조회로는 배지가 객체가 되고(카드에 [object Object] 가 찍힌다)
    // 테마는 값이 전부 undefined 인 팔레트로 렌더된다.
    badge: Object.hasOwn(BADGES, badgeKey) ? BADGES[badgeKey] : DEFAULT_BADGE,
    theme: Object.hasOwn(THEMES, themeKey) ? themeKey : "dark",
  };
}

export function buildOgCardHtml(params, brandDomain) {
  const palette = Object.hasOwn(THEMES, params.theme) ? THEMES[params.theme] : THEMES.dark;
  const description = params.description
    ? `<div style="display:flex;margin-top:24px;font-size:30px;line-height:1.5;color:${palette.description};">${escapeHtml(params.description)}</div>`
    : "";

  // satori 는 자식이 둘 이상인 요소마다 display:flex 를 요구한다. 빠뜨리면 렌더가 통째로 던진다.
  //
  // 🔴 배치를 flex 정렬에 맡기지 않는다. workers-og 의 HTML 파서에서 justify-content:space-between
  // 은 세로로도 가로로도 먹지 않았다(2026-08-28 로컬 렌더 4회로 확인 — width 고정·flex-direction
  // 명시·축약형 제거를 각각 시도했고 전부 같은 결과였다). left/right/top/bottom 은 정상 동작하므로
  // 네 모서리를 직접 못박는다. 이 방식은 글자 폭 계산에 전혀 기대지 않는다.
  return `<div style="display:flex;position:relative;width:${OG_WIDTH}px;height:${OG_HEIGHT}px;background:${palette.background};font-family:'Noto Sans KR';">
  <div style="display:flex;position:absolute;left:80px;right:80px;top:72px;flex-direction:column;">
    <div style="display:flex;flex-direction:row;align-items:center;">
      <div style="display:flex;width:44px;height:4px;background:${palette.accent};"></div>
      <div style="display:flex;margin-left:16px;font-size:24px;color:${palette.accent};">${escapeHtml(params.badge)}</div>
    </div>
    <div style="display:flex;margin-top:36px;font-size:64px;line-height:1.25;color:${palette.title};font-weight:700;">${escapeHtml(params.title)}</div>
    ${description}
  </div>
  <div style="display:flex;position:absolute;left:80px;bottom:72px;font-size:26px;color:${palette.brand};font-weight:700;">CODE DESTINY</div>
  <div style="display:flex;position:absolute;right:80px;bottom:74px;font-size:22px;color:${palette.domain};">${escapeHtml(brandDomain)}</div>
</div>`;
}

/**
 * 카드에 실제로 쓰인 글자만 모은다. 한글 전체 폰트는 수 MB 라 요청마다 받을 수 없고,
 * 번들에 넣으면 워커 크기 예산을 먹는다. 이 문자열이 Google Fonts 서브셋 요청의 text= 가 된다.
 */
export function collectGlyphs(params, brandDomain) {
  const used = `${params.title}${params.description}${params.badge}CODE DESTINY${brandDomain}`;
  return Array.from(new Set(Array.from(used))).join("");
}

export function getSiteBaseUrl(env) {
  return String(env?.SITE_BASE_URL || env?.AUTH_FRONTEND_BASE_URL || "https://code-destiny.com")
    .replace(/\/+$/, "");
}
