/** 마스터 인연의 서 — 프론트 공용 상수 (가격 정본은 서버 레지스트리) */
export const MASTER_LOVE_CODEX_FEATURE_KEY = "master-love-codex";
export const MASTER_LOVE_CODEX_TITLE = "마스터 인연의 서";
/** 서버 가격 조회 실패 시에만 쓰는 폴백값 — 정본은 worker/lib/paid-feature-registry.js */
export const MASTER_LOVE_CODEX_FEATURE_COST = 500;
export const MASTER_LOVE_CODEX_FEATURE_AMOUNT_KRW = 50000;
/** 프롤로그에 사주×자미두수 가치 씬 3개를 추가할 때 v2 로 올렸다 — 기존 사용자도 한 번은 보게 한다 */
export const MASTER_LOVE_CODEX_PROLOGUE_SEEN_KEY = "masterLoveCodexPrologueSeen:v2";
/** 배경음 on/off 기억 — 입장 라우트와 열람 라우트가 같은 키를 공유한다 */
export const MASTER_LOVE_CODEX_BGM_KEY = "masterLoveCodexBgm:v1";
export const MASTER_LOVE_CODEX_TOTAL_CHAPTERS = 20;
