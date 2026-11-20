import { memo, type CSSProperties } from "react";
import AiResultProse from "./AiResultProse";
import ConsultationIllustration, { type ConsultationKind } from "./ConsultationIllustration";
import { masterProfiles } from "./master-profiles";
import MasterSay, { type MasterSayInput } from "./MasterSay";
import { REPORT_COVER_THEMES } from "@/lib/pdf/report-cover-theme";

const masterByKind = {
  astrology: "yun", vedic: "yun", ziwei: "musung", sukuyo: "hanbi",
  lifeBook: "yunLifeBook", love: "yeoniLove", karma: "neo", newYear: "neoNewYear",
} as const;

/** Presentation only: the original result text and its existing speaker determine the reading. */
export default memo(function ConsultationReading({ value, kind, index = 0, speaker, highlight, className = "", say }: {
  value: unknown; kind: ConsultationKind; index?: number; speaker?: "yeoni" | "hanbi"; highlight?: string[]; className?: string;
  /** 숙요·점성술·베다 화면만: 장 중간에 마스터가 말하듯 끼는 말풍선(lib/master-say). 없으면 기존 삽화 그대로. */
  say?: Omit<MasterSayInput, "domain">;
}) {
  const theme = REPORT_COVER_THEMES[kind];
  const masterKey = kind === "love" && speaker === "hanbi" ? "hanbiLove" : masterByKind[kind];
  const master = masterProfiles[masterKey];
  const rgb = theme.accent.join(",");
  const accent = kind === "love" ? `var(--ls-accent, rgb(${rgb}))` : kind === "lifeBook" ? "var(--book-reading-accent, currentColor)" : `rgb(${rgb})`;
  const scene = <ConsultationIllustration key="scene" kind={kind} />;
  const portrait = <ConsultationIllustration key="portrait" kind={kind} portrait={master.portrait} />;
  // 말풍선은 같은 마스터의 정적 초상 자리를 대신한다(같은 얼굴이 두 번 나오지 않게). 지원하지 않는 분야는 null → 기존 배치.
  const bubble = say && (kind === "sukuyo" || kind === "astrology" || kind === "vedic") ? <MasterSay key="say" say={{ ...say, domain: kind }} /> : null;
  const illustrations = kind === "karma" ? [scene] : bubble ? [bubble, scene] : index % 2 === 0 ? [scene, portrait] : [portrait, scene];
  return <AiResultProse value={value} highlight={highlight} className={className} appearance={kind}
    style={{ "--reading-accent": accent, "--reading-wash": kind === "love" ? `var(--ls-surface-2, rgba(${rgb},.08))` : `rgba(${rgb},.08)`, "--reading-line": kind === "love" ? `var(--ls-line, rgba(${rgb},.25))` : `rgba(${rgb},.25)` } as CSSProperties}
    // Karma is jointly authored; its approved scene includes both masters, without guessing a chapter speaker.
    illustrations={illustrations} />;
});
