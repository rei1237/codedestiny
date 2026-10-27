import type { CSSProperties } from "react";
import AiResultProse from "./AiResultProse";
import ConsultationIllustration, { type ConsultationKind } from "./ConsultationIllustration";
import { masterProfiles } from "./master-profiles";
import { REPORT_COVER_THEMES } from "@/lib/pdf/report-cover-theme";

const masterByKind = {
  astrology: "yun", vedic: "yun", ziwei: "musung", sukuyo: "hanbi",
  lifeBook: "yunLifeBook", love: "yeoniLove", karma: "neo", newYear: "neoNewYear",
} as const;

/** Presentation only: the original result text and its existing speaker determine the reading. */
export default function ConsultationReading({ value, kind, index = 0, speaker, highlight, className = "" }: {
  value: unknown; kind: ConsultationKind; index?: number; speaker?: "yeoni" | "hanbi"; highlight?: string[]; className?: string;
}) {
  const theme = REPORT_COVER_THEMES[kind];
  const masterKey = kind === "love" && speaker === "hanbi" ? "hanbiLove" : masterByKind[kind];
  const master = masterProfiles[masterKey];
  const rgb = theme.accent.join(",");
  const accent = kind === "love" ? `var(--ls-accent, rgb(${rgb}))` : kind === "lifeBook" ? "var(--book-reading-accent, currentColor)" : `rgb(${rgb})`;
  const scene = <ConsultationIllustration key="scene" kind={kind} />;
  const portrait = <ConsultationIllustration key="portrait" kind={kind} portrait={master.portrait} />;
  return <AiResultProse value={value} highlight={highlight} className={className} appearance={kind}
    style={{ "--reading-accent": accent, "--reading-wash": kind === "love" ? `var(--ls-surface-2, rgba(${rgb},.08))` : `rgba(${rgb},.08)`, "--reading-line": kind === "love" ? `var(--ls-line, rgba(${rgb},.25))` : `rgba(${rgb},.25)` } as CSSProperties}
    // Karma is jointly authored; its approved scene includes both masters, without guessing a chapter speaker.
    illustrations={kind === "karma" ? [scene] : index % 2 === 0 ? [scene, portrait] : [portrait, scene]} />;
}
