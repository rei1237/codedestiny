"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { useScopedCopy } from "@/lib/i18n/scopedCopy";
import styles from "./master-profile.module.css";

const ASSET_KEYS = ["portrait", "portraitSrcSet", "sheet", "sheetSrcSet", "theme"] as const;
const UI = {
  note: "서비스의 이야기를 안내하는 캐릭터예요. 상담은 선택을 돕는 해석이며, 미래나 상대의 마음을 확정하지 않아요.",
  expand: "프로필 시트 펼쳐보기", collapse: "프로필 시트 접기",
  sheetHint: "표정과 의상, 상담가의 분위기를 한눈에 살펴보세요.",
  original: "원본 크기로 보기 (새 탭)", sheetAlt: "대표 초상, 전신과 표정을 담은 캐릭터 프로필 시트",
  principles: "상담 원칙",
};

/** 소개장 한 행 — 전문 영역 / 읽는 근거 / 이 상담에서 맡는 부분. 경력·건수 같은 꾸민 이력 대신 실제 읽는 방식만 적는다. */
export type MasterDossierRow = { label: string; text: string };

export type MasterProfileData = {
  name: string;
  role: string;
  description: string;
  approach?: string;
  portrait: string;
  portraitAlt: string;
  sheet: string;
  sheetWidth: number;
  sheetHeight: number;
  theme: "master" | "neo" | "yeoni" | "yeoniPalm" | "yun" | "musung" | "hanbi";
  /** 소개장(dossier) 변형 — 모두 있으면 칭호·시그니처·근거표·상담 원칙으로 권위 있게 소개한다. */
  epithet?: string;
  signature?: string;
  dossier?: readonly MasterDossierRow[];
  principles?: readonly string[];
  /** next/image 가 unoptimized 라 srcset 을 직접 넘긴다. */
  portraitSrcSet?: string;
  sheetSrcSet?: string;
};

type MasterProfileProps = { profile: MasterProfileData; palette?: "page"; id?: string; level?: 2 | 3 };

/** Introductory character art; never mounted in the consultation/result flow. */
export default function MasterProfile({ profile: source, palette, id, level = 2 }: MasterProfileProps) {
  const profile = useScopedCopy("masterProfiles", source.theme, source, { skipKeys: ASSET_KEYS });
  const copy = useScopedCopy("masterProfiles", "controls", UI);
  const headingId = useId();
  const [expanded, setExpanded] = useState(false);
  const dossier = profile.dossier?.length ? profile.dossier : null;
  const Name = level === 3 ? "h3" : "h2";
  const Sub = level === 3 ? "h4" : "h3";
  return (
    <section id={id} className={styles.profile} data-theme={profile.theme} data-palette={palette} data-variant={dossier ? "dossier" : undefined} aria-labelledby={headingId}>
      <div className={styles.introduction}>
        {dossier ? (
          <div className={styles.frame}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.portrait} src={profile.portrait} srcSet={profile.portraitSrcSet} alt={profile.portraitAlt}
              width={600} height={720} sizes="(max-width: 700px) min(72vw, 300px), 320px" loading="lazy" decoding="async" />
            <span className={styles.seal} aria-hidden="true">{profile.name.charAt(0)}</span>
          </div>
        ) : (
          <Image className={styles.portrait} src={profile.portrait} alt={profile.portraitAlt}
            width={600} height={720} sizes="(max-width: 700px) 80vw, 320px" />
        )}
        <div className={styles.copy}>
          {profile.epithet && <p className={styles.epithet}>{profile.epithet}</p>}
          <Name id={headingId} className={styles.name}>{profile.name}</Name>
          <p className={styles.role}>{profile.role}</p>
          {profile.signature && <blockquote className={styles.signature}><p>{profile.signature}</p></blockquote>}
          <p>{profile.description}</p>
          {profile.approach && <p>{profile.approach}</p>}
          {dossier && <dl className={styles.dossier}>
            {dossier.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.text}</dd></div>)}
          </dl>}
          {profile.principles?.length ? <>
            <Sub className={styles.principlesTitle}>{copy.principles}</Sub>
            <ul className={styles.principles}>{profile.principles.map((item) => <li key={item}>{item}</li>)}</ul>
          </> : null}
          <p className={styles.note}>{copy.note}</p>
        </div>
      </div>
      <details className={styles.details} onToggle={(event) => setExpanded(event.currentTarget.open)}>
        <summary>{expanded ? copy.collapse : copy.expand}</summary>
        {expanded && <div className={styles.sheet}>
          <p>{copy.sheetHint}</p>
          <a href={profile.sheet} target="_blank" rel="noopener noreferrer">{copy.original}</a>
          {profile.sheetSrcSet ? <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.sheet} srcSet={profile.sheetSrcSet} alt={`${profile.name} · ${copy.sheetAlt}`}
              width={profile.sheetWidth} height={profile.sheetHeight} sizes="(max-width: 700px) 90vw, 1000px" decoding="async" />
          </> : <Image src={profile.sheet} alt={`${profile.name} · ${copy.sheetAlt}`}
            width={profile.sheetWidth} height={profile.sheetHeight} sizes="(max-width: 700px) 90vw, 1000px" />}
        </div>}
      </details>
    </section>
  );
}

/** 한 상품을 함께 맡은 마스터 묶음(연애 비책 연이·서한비) — 묶음 제목이 h2, 각 소개장 이름은 h3. */
export function MasterProfileGroup({ id, title, lead, profiles }: { id?: string; title: string; lead: string; profiles: readonly MasterProfileData[] }) {
  const headingId = useId();
  return (
    <section id={id} className={styles.group} aria-labelledby={headingId}>
      <div className={styles.groupHead}>
        <h2 id={headingId}>{title}</h2>
        <p>{lead}</p>
      </div>
      <div className={styles.groupGrid}>
        {profiles.map((profile) => <MasterProfile key={profile.name} palette="page" level={3} profile={profile} />)}
      </div>
    </section>
  );
}
