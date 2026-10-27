import Image from "next/image";
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

/** Existing, approved service artwork; decorative, never a calculated chart. */
export default function ConsultationIllustration({ kind }: { kind: keyof typeof artwork }) {
  return <figure className={`${styles.artwork} ${styles[kind]}`} aria-hidden="true" data-consultation-illustration={kind}>
    <Image src={`/images/service-introductions/${artwork[kind]}-960.webp`} alt="" width={960} height={640} sizes="(max-width: 700px) 100vw, 680px" loading="lazy" />
  </figure>;
}
