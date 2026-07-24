/**
 * 결과 화면 공유 페인팅 배경 URL(R2) — 소설/자미두수 아트 재사용(신규 파일 생성 없음).
 * PaintedBackdrop 과 짝. 기능별 테마에 맞춰 골라 쓴다.
 */
import { getAssetUrlFromPublicPath } from "@/lib/r2-public-url";

const R2_BASE = process.env.NEXT_PUBLIC_ASSETS_BASE_URL || "https://assets.code-destiny.com";
const painting = (key: string) => getAssetUrlFromPublicPath(`/${key}`, { baseUrl: R2_BASE, prefix: "" });

export const paintedBackdrops = {
  ziwei1: painting("CodeDestinyNovel/background/자미두수 세계1.webp"),
  ziwei2: painting("CodeDestinyNovel/background/자미두수 세계2.webp"),
  ziwei3: painting("CodeDestinyNovel/background/자미두수 세계3.webp"),
  ziwei4: painting("CodeDestinyNovel/background/자미두수 세계4.webp"),
  redThread: painting("CodeDestinyNovel/background/숙요점 붉은 실의 세계.webp"),
  island: painting("DestinyAssets/자미두수 운명의 섬.webp"),
} as const;
