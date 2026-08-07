/**
 * 초융합 오브 — 여섯 체계와 융합 코어의 시각 기호.
 *
 * 파일은 scripts/build-fusion-orb-assets.mjs 가 R2 원본 시트에서 잘라 만든 산출물이다.
 * 🔴 타로 오브는 원본 시트에 없다. 지금은 같은 문법의 CSS 오브로 대체하고, 타로 오브
 * 에셋이 확보되면 여기 image 를 채우기만 하면 된다(화면 코드는 그대로).
 */

export type FusionSystemKey = "saju" | "ziwei" | "vedic" | "sukuyo" | "astrology" | "tarot";

export type FusionOrb = {
  key: FusionSystemKey;
  label: string;
  /** 크롭된 오브 이미지. 없으면 CSS 오브로 그린다. */
  image: string | null;
  /** CSS 대체 오브의 색 — 원본 시트의 체계별 색 계열을 따른다. */
  tint: string;
  glyph: string;
};

export const FUSION_ORBS: FusionOrb[] = [
  { key: "saju", label: "사주", image: "/images/fusion-fortune/orbs/saju.webp", tint: "#e0533a", glyph: "木" },
  { key: "ziwei", label: "자미두수", image: "/images/fusion-fortune/orbs/ziwei.webp", tint: "#a05cd6", glyph: "紫" },
  { key: "vedic", label: "베다점", image: "/images/fusion-fortune/orbs/vedic.webp", tint: "#e0a52c", glyph: "ॐ" },
  { key: "sukuyo", label: "숙요점", image: "/images/fusion-fortune/orbs/sukuyo.webp", tint: "#2fae9b", glyph: "宿" },
  { key: "astrology", label: "점성술", image: "/images/fusion-fortune/orbs/astrology.webp", tint: "#3b74d8", glyph: "✦" },
  { key: "tarot", label: "타로", image: null, tint: "#c9a227", glyph: "◇" },
];

export const FUSION_CORE_ORB = "/images/fusion-fortune/orbs/core.webp";

export const FUSION_ORB_BY_KEY: Record<FusionSystemKey, FusionOrb> = FUSION_ORBS.reduce(
  (map, orb) => ({ ...map, [orb.key]: orb }),
  {} as Record<FusionSystemKey, FusionOrb>,
);
