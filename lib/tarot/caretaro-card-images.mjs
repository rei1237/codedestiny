// 라이더-웨이트 78장 ↔ R2 caretaro 고품질 아트 파일명 매핑.
// 순수 ESM(의존성 없음) — Cloudflare Worker 번들에서 그대로 import 한다.
// 카드 코드 체계는 ./tarot-cards.mjs 와 동일(M00~M21 / W·C·S·P 01~14).

const DEFAULT_ASSETS_BASE_URL = "https://assets.code-destiny.com";
const CARETARO_OBJECT_PREFIX = "DestinyCafe/caretaro";

// 주의: 파일명이 카드 한글명과 1:1이 아니다.
// - M02 여사제 → 고위여사제 / M10 운명의 수레바퀴 → 운명의수레바퀴 / M12 매달린 사람 → 매달린남자
// - 퀸은 컵만 "컵여왕"이고 나머지 슈트는 "완드퀸/소드퀸/펜타클퀸"
export const CARETARO_BASENAME_BY_CODE = {
  M00: "바보",
  M01: "마법사",
  M02: "고위여사제",
  M03: "여황제",
  M04: "황제",
  M05: "교황",
  M06: "연인",
  M07: "전차",
  M08: "힘",
  M09: "은둔자",
  M10: "운명의수레바퀴",
  M11: "정의",
  M12: "매달린남자",
  M13: "죽음",
  M14: "절제",
  M15: "악마",
  M16: "탑",
  M17: "별",
  M18: "달",
  M19: "태양",
  M20: "심판",
  M21: "세계",

  W01: "완드에이스",
  W02: "완드2",
  W03: "완드3",
  W04: "완드4",
  W05: "완드5",
  W06: "완드6",
  W07: "완드7",
  W08: "완드8",
  W09: "완드9",
  W10: "완드10",
  W11: "완드페이지",
  W12: "완드기사",
  W13: "완드퀸",
  W14: "완드킹",

  C01: "컵에이스",
  C02: "컵2",
  C03: "컵3",
  C04: "컵4",
  C05: "컵5",
  C06: "컵6",
  C07: "컵7",
  C08: "컵8",
  C09: "컵9",
  C10: "컵10",
  C11: "컵페이지",
  C12: "컵기사",
  C13: "컵여왕",
  C14: "컵킹",

  S01: "소드에이스",
  S02: "소드2",
  S03: "소드3",
  S04: "소드4",
  S05: "소드5",
  S06: "소드6",
  S07: "소드7",
  S08: "소드8",
  S09: "소드9",
  S10: "소드10",
  S11: "소드페이지",
  S12: "소드기사",
  S13: "소드퀸",
  S14: "소드킹",

  P01: "펜타클에이스",
  P02: "펜타클2",
  P03: "펜타클3",
  P04: "펜타클4",
  P05: "펜타클5",
  P06: "펜타클6",
  P07: "펜타클7",
  P08: "펜타클8",
  P09: "펜타클9",
  P10: "펜타클10",
  P11: "펜타클페이지",
  P12: "펜타클기사",
  P13: "펜타클퀸",
  P14: "펜타클킹",
};

function resolveAssetsBaseUrl(env) {
  const candidate = env && (env.ASSETS_BASE_URL || env.NEXT_PUBLIC_ASSETS_BASE_URL);
  const base = String(candidate || DEFAULT_ASSETS_BASE_URL).trim() || DEFAULT_ASSETS_BASE_URL;
  return base.replace(/\/+$/u, "");
}

/**
 * 카드 코드 → caretaro 아트 URL.
 * width 를 주면 Cloudflare Image Resizing 경로로 감싸 카드 크기에 맞춰 축소 수신한다
 * (원본 장당 ~300KB → 20~30KB). 실패 시 호출부가 imageFallbackUrl 로 폴백한다.
 */
export function buildCaretaroCardImageUrl(code, { env, width } = {}) {
  const basename = CARETARO_BASENAME_BY_CODE[String(code || "").toUpperCase()];
  if (!basename) return "";
  const baseUrl = resolveAssetsBaseUrl(env);
  const objectPath = `${CARETARO_OBJECT_PREFIX}/${encodeURIComponent(`${basename}.webp`)}`;
  const parsedWidth = Number.parseInt(width, 10);
  if (Number.isFinite(parsedWidth) && parsedWidth > 0) {
    return `${baseUrl}/cdn-cgi/image/width=${parsedWidth},format=auto,fit=scale-down/${objectPath}`;
  }
  return `${baseUrl}/${objectPath}`;
}
