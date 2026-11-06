"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from 'lucide-react';
import { mobileSpriteUrl } from "@/js/core/profile-characters.mjs";
import { trackEvent } from "@/lib/analytics";
import { invalidateProfileCache } from "@/app/_lib/user-session-cache";
import type { DailyJourney, JourneyHoney } from "./useDailyJourney";
import { forestZoneForLevel, litLanternCount } from "./forest-progress.mjs";
import styles from "./forest.module.css";

const MAX_LANTERNS = 14;
export const CARD_MANAGE_HREF = "/ggulggul/?action=dpOpenList";

function LanternIcon() {
  return <svg viewBox="0 0 24 32" width="24" height="32" aria-hidden="true"><path d="M8 5h8M12 1v4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M7 7h10l3 7-3 12H7L4 14z" fill="var(--forest-lantern-fill)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M8 29h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}

/** 연속 출석 등불. 마지막 칸은 보너스 꿀단지 자리다. 숫자는 전부 서버 값이다. */
export function LanternRow({ honey }: { honey: JourneyHoney }) {
  const total = Math.min(honey.streakEvery, MAX_LANTERNS);
  const lit = litLanternCount(honey.streak, honey.streakEvery, honey.attended);
  return <div className={styles.lanterns} role="img" aria-label={`연속 출석 ${honey.streak}일, 다음 보너스까지 ${honey.nextBonusIn}일`}>
    {Array.from({ length: total }, (_, index) => {
      const isJar = index === total - 1;
      return <span key={index} className={styles.lantern} data-lit={index < lit || undefined} data-just-lit={(honey.awarded && index === lit - 1) || undefined} data-jar={isJar || undefined}>
        {isJar
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src="/images/fortune-tea-house/honey-drop-jewel-96-v1.webp" width="96" height="96" alt="" loading="lazy" decoding="async" />
          : <LanternIcon />}
      </span>;
    })}
  </div>;
}

/** 프로필 카드 이름, 숲 구역, 레벨, 경험치 막대. 재조회한 값만 보여 준다. */
export function GrowthCard({ journey }: { journey: DailyJourney }) {
  const { status, profile, progress } = journey;
  const [editing, setEditing] = useState(false);
  const [frameStatus, setFrameStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreTrigger = useRef(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const retry = useRef(journey.retry);
  useEffect(() => { retry.current = journey.retry; }, [journey.retry]);
  useEffect(() => {
    if (!editing) return;
    restoreTrigger.current = true;
    closeButton.current?.focus();
    const timer = window.setTimeout(() => setFrameStatus("error"), 25000);
    function receive(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.type !== "cd:forest-card") return;
      window.clearTimeout(timer);
      if (event.data.state === "saved") trackEvent("daily_home_card_saved", { surface: journey.surface });
      switch (event.data.state) {
        case "ready": setSaving(false); setFrameStatus("ready"); break;
        case "busy": setSaving(true); break;
        case "error": setFrameStatus("error"); break;
        case "saved":
        case "closed":
          setSaving(false); setEditing(false);
          invalidateProfileCache("forest-card-saved");
          retry.current();
          break;
      }
    }
    window.addEventListener("message", receive);
    return () => { window.clearTimeout(timer); window.removeEventListener("message", receive); };
  }, [editing, attempt, journey.surface]);
  const { portrait, portraitFailed } = journey;
  const unavailable = status === "error" || (status === "ready" && journey.profileStatus === "error");
  const loading = status === "loading" || (status === "ready" && journey.profileStatus === "loading");
  useEffect(() => {
    if (!editing && !loading && !saving && restoreTrigger.current) {
      restoreTrigger.current = false;
      trigger.current?.focus({ preventScroll: true });
    }
  }, [editing, loading, saving]);
  const example = status === "guest" || (status === "ready" && !profile && !loading && !unavailable);
  const avatar = example ? "animal-rabbit" : loading || unavailable ? null : portrait?.id;
  const name = example ? "프로필 카드 예시" : profile ? `${profile.name || "나의"} 카드` : "내 프로필 카드";
  const loginHref = journey.surface === "home" ? "/login/?next=%2F%23daily-home-title" : "/login/?next=%2Fdiary%2F%23daily-home-title";
  const ratio = progress ? Math.min(100, Math.round((progress.currentLevelExp / Math.max(1, progress.nextLevelExp)) * 100)) : 0;
  return <div className={styles.growth} data-forest-profile={example ? "example" : profile?.id || profile?.profileId}>
    <div className={styles.growthHead}>
      <span className={styles.portrait}>{avatar && <span role="img" aria-label={example ? "예시 토끼" : portrait?.name}
        data-character-id={avatar} style={{ backgroundImage: `url("${mobileSpriteUrl(avatar)}")` }} />}</span>
      <div className={styles.identity}>
        <strong>{name}</strong>
        {example ? <small>일주 동물 · 토끼<br/>을묘 · 목</small> : avatar && portrait ?
          <small>일주 동물 · {portrait.animal}{portrait.equipped && <> · 장착 정령 · {portrait.name}</>}<br/>{portrait.ganji} · {portrait.element}</small> :
          <small role="status">{loading ? "카드를 확인하고 있어요." : "카드를 불러오지 못했어요."}</small>}
        {status !== "guest" && <button type="button" ref={trigger} className={styles.cardAction} aria-expanded={editing} aria-disabled={loading || saving}
            onClick={() => {
              if (loading || saving) return;
              if (unavailable) { journey.retry(); return; }
              setFrameStatus("loading"); setEditing(!editing);
            }}>{unavailable ? "카드 다시 불러오기" : profile ? "카드 바꾸기" : "첫 카드 만들기"}</button>}
        {portraitFailed && !loading && !unavailable && <button type="button" className={styles.cardAction} onClick={journey.retry}>캐릭터 다시 불러오기</button>}
      </div>
    </div>
    {status === "guest" && <a className={styles.joinAction} href={loginHref} onClick={() => trackEvent("daily_home_card_login", { surface: journey.surface })}>가입하고 카드 만들기 <ArrowRight size={15} aria-hidden="true" /></a>}
    {editing && <section className={styles.cardEditor} aria-label="숲길 프로필 카드">
      <button ref={closeButton} type="button" disabled={saving} onClick={() => setEditing(false)}>{saving ? "카드 저장 중" : "숲길로 돌아가기"}</button>
      {frameStatus === "loading" && <p role="status">프로필 카드를 펼치고 있어요.</p>}
      {frameStatus === "error" && <button type="button" onClick={() => { setFrameStatus("loading"); setAttempt(i => i + 1); }}>카드 다시 불러오기</button>}
      <iframe key={attempt} ref={frame} title="숲길 프로필 카드 작성과 선택" hidden={frameStatus !== "ready"}
        src={CARD_MANAGE_HREF + "&forestCard=" + (profile ? "select" : "create")} />
    </section>}
    {progress
      ? <div className={styles.growthBody}>
          <span className={styles.zone}>{forestZoneForLevel(progress.currentLevel)} · Lv. {progress.currentLevel}</span>
          <div className={styles.xpTrack} role="progressbar" aria-label="다음 레벨까지의 경험치" aria-valuemin={0} aria-valuemax={Math.max(1, progress.nextLevelExp)} aria-valuenow={progress.currentLevelExp}><span className={styles.xpFill} style={{ width: `${ratio}%` }} /></div>
          <small>{progress.currentLevelExp} / {progress.nextLevelExp} XP</small>
        </div>
      : null}
  </div>;
}

/** 연이와 영냥이의 한마디. */
export function ForestLines({ line }: { line: { yeoni: string; yeongnyangi: string } }) {
  return <div className={styles.lines}>
    <p><b>연이</b>{line.yeoni}</p>
    <p><b>영냥이</b>{line.yeongnyangi}</p>
  </div>;
}
