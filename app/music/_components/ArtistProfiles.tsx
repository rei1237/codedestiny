"use client";

import { useState } from "react";
import { DEST1NOVA_MEMBERS } from "../_data/dest1nova-profiles";
import { HUMAN_MODE_COVER_URLS, buildCoverSrc, type ArtistFilterKey } from "../_lib/musicFormat";
import styles from "../music-lounge.module.css";

type Props = { artist: ArtistFilterKey };

export function ArtistProfiles({ artist }: Props) {
  const [memberId, setMemberId] = useState("neo");
  const member = DEST1NOVA_MEMBERS.find((entry) => entry.id === memberId) || DEST1NOVA_MEMBERS[0];
  if (!["all", "dest1nova", "neo", "yeoni"].includes(artist)) return null;
  if (artist === "yeoni") return (
    <details className={styles.artistProfiles} lang="ko">
      <summary>YEONI · 가수 소개</summary>
      <div className={styles.artistProfileBody}>
        <h2>연이</h2><p className={styles.artistTagline}>하루의 끝에 따뜻한 차처럼 남는 목소리.</p>
        <p>꽃돼지 연이는 부드러운 말과 작은 감정에 귀를 기울이는 Code Destiny의 인물입니다. 앨범에서는 달빛과 꽃, 마음을 건네는 순간을 노래합니다.</p>
      </div>
    </details>
  );
  if (artist === "neo") return (
    <details className={styles.artistProfiles} lang="ko">
      <summary>NEO · 가수 소개</summary>
      <div className={styles.artistProfileBody}>
        <h2>네오</h2><p className={styles.artistTagline}>{DEST1NOVA_MEMBERS[0].tagline}</p>
        <p>{DEST1NOVA_MEMBERS[0].personality}</p><p>솔로 앨범과 DEST1NOVA의 리더·센터로 만날 수 있습니다.</p>
      </div>
    </details>
  );
  return (
    <details className={styles.artistProfiles} lang="ko">
      <summary>DEST1NOVA · 다섯 멤버 소개</summary>
      <div className={styles.artistProfileBody}>
        <p className={styles.artistIntro}>서로 다른 다섯 빛이 하나의 무대를 만듭니다. 이름을 골라 무대 위의 매력과 무대 뒤의 이야기를 만나 보세요.</p>
        <img className={styles.artistGroupImage} src={buildCoverSrc(HUMAN_MODE_COVER_URLS.dest1novaVol1, 760)}
          alt="DEST1NOVA의 데뷔 무대. 왼쪽부터 SOLV, BAMBI, NEO, LUNE, RAVEN."
          width={1448} height={1086} loading="lazy" decoding="async"
          onError={(event) => { if (!event.currentTarget.dataset.fallback) { event.currentTarget.dataset.fallback = "true"; event.currentTarget.src = HUMAN_MODE_COVER_URLS.dest1novaVol1; } }} />
        <div className={styles.artistMemberButtons} role="group" aria-label="프로필을 볼 멤버">
          {DEST1NOVA_MEMBERS.map((entry) => <button key={entry.id} type="button" aria-pressed={memberId === entry.id}
            aria-controls="dest1nova-member-profile" onClick={() => setMemberId(entry.id)}>{entry.stageName}</button>)}
        </div>
        <article id="dest1nova-member-profile" className={styles.artistMemberProfile} aria-live="polite" aria-atomic="true">
          <h2>{member.name} <span>{member.stageName}</span></h2>
          <p className={styles.artistRole}>{member.position} · 무대 상징 {member.motif}</p>
          <p className={styles.artistTagline}>{member.tagline}</p>
          <p>{member.personality}</p>
          <dl><div><dt>매력</dt><dd>{member.charm}</dd></div><div><dt>서툰 순간</dt><dd>{member.weakness}</dd></div></dl>
          <h3>무대 뒤의 이야기</h3><p>{member.story}</p>
        </article>
      </div>
    </details>
  );
}
