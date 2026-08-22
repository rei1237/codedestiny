/** 마스터 인연의 서 — 프론트 공용 상수 (가격 정본은 서버 레지스트리) */
import type { LoadingLocale } from "@/constants/loadingMessages";

export const MASTER_LOVE_CODEX_FEATURE_KEY = "master-love-codex";
export const MASTER_LOVE_CODEX_TITLE = "마스터 인연의 서";
/** 서버 가격 조회 실패 시에만 쓰는 폴백값 — 정본은 worker/lib/paid-feature-registry.js */
export const MASTER_LOVE_CODEX_FEATURE_COST = 200;
export const MASTER_LOVE_CODEX_FEATURE_AMOUNT_KRW = 20000;

/** 궁합판 — 상대 정보를 넣으면 이 SKU 로 전환된다(네 장을 겹쳐 읽는다. 2026-08-12 부터 개인판과 동가) */
export const MASTER_LOVE_CODEX_COMPAT_FEATURE_KEY = "master-love-codex-compat";
export const MASTER_LOVE_CODEX_COMPAT_TITLE = "마스터 인연의 서 · 궁합";
export const MASTER_LOVE_CODEX_COMPAT_FEATURE_COST = 300;
export const MASTER_LOVE_CODEX_COMPAT_FEATURE_AMOUNT_KRW = 30000;

export type MasterLoveCodexMode = "solo" | "compat";

/**
 * 제목만 로케일별로 갈아 끼운다 — "Master Love Codex" 는 화면에 이미 영문 브랜드 표기로
 * 함께 노출되므로(예: CodexLanding/CodexReader 의 "Master Love Codex" 헤딩), ko 외 로케일은
 * 별도 의역 대신 그 브랜드명을 그대로 쓴다.
 */
const MASTER_LOVE_CODEX_TITLE_BY_LOCALE: Partial<Record<LoadingLocale, string>> = {
  ko: MASTER_LOVE_CODEX_TITLE,
  ja: "マスター縁の書",
  "zh-CN": "大师情缘之书",
  "zh-TW": "大師情緣之書",
};
const MASTER_LOVE_CODEX_COMPAT_TITLE_BY_LOCALE: Partial<Record<LoadingLocale, string>> = {
  ko: MASTER_LOVE_CODEX_COMPAT_TITLE,
  ja: "マスター縁の書・相性",
  "zh-CN": "大师情缘之书·合婚",
  "zh-TW": "大師情緣之書‧合婚",
};

export function getMasterLoveCodexTitle(mode: MasterLoveCodexMode, locale: LoadingLocale = "ko"): string {
  const table = mode === "compat" ? MASTER_LOVE_CODEX_COMPAT_TITLE_BY_LOCALE : MASTER_LOVE_CODEX_TITLE_BY_LOCALE;
  return table[locale] || (mode === "compat" ? "Master Love Codex · Compatibility" : "Master Love Codex");
}

/** 모드별 결제 식별자·폴백 가격을 한 곳에서 고른다(리터럴을 화면에 그리지 않는다). */
export function masterLoveCodexBilling(mode: MasterLoveCodexMode, locale: LoadingLocale = "ko") {
  return mode === "compat"
    ? {
      featureKey: MASTER_LOVE_CODEX_COMPAT_FEATURE_KEY,
      title: getMasterLoveCodexTitle("compat", locale),
      cost: MASTER_LOVE_CODEX_COMPAT_FEATURE_COST,
      amountKRW: MASTER_LOVE_CODEX_COMPAT_FEATURE_AMOUNT_KRW,
    }
    : {
      featureKey: MASTER_LOVE_CODEX_FEATURE_KEY,
      title: getMasterLoveCodexTitle("solo", locale),
      cost: MASTER_LOVE_CODEX_FEATURE_COST,
      amountKRW: MASTER_LOVE_CODEX_FEATURE_AMOUNT_KRW,
    };
}
/** 프롤로그에 사주×자미두수 가치 씬 3개를 추가할 때 v2 로 올렸다 — 기존 사용자도 한 번은 보게 한다 */
export const MASTER_LOVE_CODEX_PROLOGUE_SEEN_KEY = "masterLoveCodexPrologueSeen:v2";
/** 배경음 on/off 기억 — 입장 라우트와 열람 라우트가 같은 키를 공유한다 */
export const MASTER_LOVE_CODEX_BGM_KEY = "masterLoveCodexBgm:v1";
export const MASTER_LOVE_CODEX_TOTAL_CHAPTERS = 20;
