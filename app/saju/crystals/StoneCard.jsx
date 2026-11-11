// 원석 카드. 서버(랜딩)와 클라이언트(결과) 양쪽에서 쓴다. 훅을 쓰지 않는다.
// 원석 그림이 없으면(hasImage=false) 오행 색 칩으로 대신한다.
import styles from "./crystals.module.css";

/** 원석 그림 규격: `${image}-{240,480}.avif` + `${image}-360.webp` (4단계에서 내보낸다). */
export const STONE_IMAGE = Object.freeze({ widths: [240, 480], fallback: 360, w: 480, h: 480 });

export const ELEMENT_TONE = Object.freeze({
  wood: { color: "#3f8f5a", soft: "#e3f2e6", glyph: "木" },
  fire: { color: "#c8506a", soft: "#fbe4ea", glyph: "火" },
  earth: { color: "#b98a2e", soft: "#f7ecd3", glyph: "土" },
  metal: { color: "#8a8796", soft: "#efeef4", glyph: "金" },
  water: { color: "#2f4f7f", soft: "#e2e9f4", glyph: "水" },
});

export function ElementChip({ element, label, size = "md" }) {
  const tone = ELEMENT_TONE[element] || ELEMENT_TONE.metal;
  return (
    <span className={`${styles.chip} ${size === "lg" ? styles.chipLg : ""}`} style={{ "--el": tone.color, "--el-soft": tone.soft }}>
      <b aria-hidden="true">{tone.glyph}</b>
      {label}
    </span>
  );
}

export default function StoneCard({ crystal, elementKo, hasImage = false, roleLabel = "", reason = "", example = false, headingLevel = 3 }) {
  const tone = ELEMENT_TONE[crystal.element] || ELEMENT_TONE.metal;
  const Heading = `h${headingLevel}`;
  return (
    <article className={styles.stone} style={{ "--el": tone.color, "--el-soft": tone.soft }}>
      {example && <span className={styles.exampleTag}>예시</span>}
      <div className={styles.stoneArt}>
        {hasImage ? (
          <picture>
            <source type="image/avif" srcSet={STONE_IMAGE.widths.map((w) => `${crystal.image}-${w}.avif ${w}w`).join(", ")} sizes="160px" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${crystal.image}-${STONE_IMAGE.fallback}.webp`} width={STONE_IMAGE.w} height={STONE_IMAGE.h} alt={`${crystal.nameKo}(${crystal.color})`} loading="lazy" decoding="async" />
          </picture>
        ) : (
          <span className={styles.stoneSwatch} role="img" aria-label={`${crystal.nameKo} — ${crystal.color} 빛, ${elementKo}`}>
            <b aria-hidden="true">{tone.glyph}</b>
          </span>
        )}
      </div>
      <div className={styles.stoneBody}>
        {roleLabel && <p className={styles.stoneRole}>{roleLabel}</p>}
        <Heading className={styles.stoneName}>
          {crystal.nameKo}
          <small>{crystal.nameEn}</small>
        </Heading>
        <p className={styles.stoneMeta}>
          <ElementChip element={crystal.element} label={elementKo} size="sm" /> <span>{crystal.color}</span>
        </p>
        <p className={styles.stoneMeanings}>{crystal.symbolicMeanings.map((m) => `#${m}`).join(" ")}</p>
        {crystal.description && <p className={styles.stoneDesc}>{crystal.description}</p>}
        {reason && <p className={styles.stoneReason}>{reason}</p>}
      </div>
    </article>
  );
}
