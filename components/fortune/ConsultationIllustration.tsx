/* eslint-disable @next/next/no-img-element -- Pre-sized WebP in a static export; shared by SSR reading and PDF capture. */
import styles from "./consultation-illustration.module.css";

const artwork = {
  astrology: "astrology-ai",
  vedic: "vedic-ai",
  ziwei: "ziwei-ai",
  sukuyo: "sukuyo",
  lifeBook: "life-book-ai",
  love: "love-secret-ai",
  karma: "karma-destiny-ai",
  newYear: "new-year-ai",
} as const;
export type ConsultationKind = keyof typeof artwork;

/** Existing, approved service artwork; decorative, never a calculated chart. */
export default function ConsultationIllustration({ kind, portrait }: { kind: ConsultationKind; portrait?: string }) {
  return <figure className={`${styles.artwork} ${styles[kind]} ${portrait ? styles.portrait : ""}`} aria-hidden="true" data-consultation-illustration={kind}>
    <img src={portrait || `/images/service-introductions/${artwork[kind]}-960.webp`} alt="" width={portrait ? 600 : 960} height={portrait ? 720 : 640} loading="lazy" decoding="async" />
  </figure>;
}
