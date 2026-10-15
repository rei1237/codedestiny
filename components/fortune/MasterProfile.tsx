"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { useScopedCopy } from "@/lib/i18n/scopedCopy";
import styles from "./master-profile.module.css";

const ASSET_KEYS = ["portrait", "sheet", "theme"] as const;
const UI = {
  note: "서비스의 이야기를 안내하는 캐릭터예요. 상담은 선택을 돕는 해석이며, 미래나 상대의 마음을 확정하지 않아요.",
  expand: "프로필 시트 펼쳐보기", collapse: "프로필 시트 접기",
  sheetHint: "표정과 의상, 상담가의 분위기를 한눈에 살펴보세요.",
  original: "원본 크기로 보기 (새 탭)", sheetAlt: "대표 초상, 전신과 표정을 담은 캐릭터 프로필 시트",
};

export type MasterProfileData = {
  name: string;
  role: string;
  description: string;
  approach: string;
  portrait: string;
  portraitAlt: string;
  sheet: string;
  sheetWidth: number;
  sheetHeight: number;
  theme: "master" | "neo" | "yeoni";
};

/** Introductory character art; never mounted in the consultation/result flow. */
export default function MasterProfile({ profile: source }: { profile: MasterProfileData }) {
  const profile = useScopedCopy("masterProfiles", source.theme, source, { skipKeys: ASSET_KEYS });
  const copy = useScopedCopy("masterProfiles", "controls", UI);
  const headingId = useId();
  const [expanded, setExpanded] = useState(false);
  return (
    <section className={styles.profile} data-theme={profile.theme} aria-labelledby={headingId}>
      <div className={styles.introduction}>
        <Image className={styles.portrait} src={profile.portrait} alt={profile.portraitAlt}
          width={600} height={720} sizes="(max-width: 700px) 80vw, 320px" />
        <div className={styles.copy}>
          <h2 id={headingId}>{profile.name}</h2>
          <p className={styles.role}>{profile.role}</p>
          <p>{profile.description}</p>
          <p>{profile.approach}</p>
          <p className={styles.note}>{copy.note}</p>
        </div>
      </div>
      <details className={styles.details} onToggle={(event) => setExpanded(event.currentTarget.open)}>
        <summary>{expanded ? copy.collapse : copy.expand}</summary>
        {expanded && <div className={styles.sheet}>
          <p>{copy.sheetHint}</p>
          <a href={profile.sheet} target="_blank" rel="noopener noreferrer">{copy.original}</a>
          <Image src={profile.sheet} alt={`${profile.name} · ${copy.sheetAlt}`}
            width={profile.sheetWidth} height={profile.sheetHeight} sizes="(max-width: 700px) 90vw, 1000px" />
        </div>}
      </details>
    </section>
  );
}
