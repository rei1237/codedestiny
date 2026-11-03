"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DiaryStoreProvider, { useDiaryToday, useDiaryWriter } from "@/app/diary/_components/DiaryStoreProvider";
import { smallActionsFor, pickSmallAction, type DiarySmallAction } from "@/app/diary/_lib/small-action-pool";
import { toggleTodo } from "@/app/diary/_lib/ext-writes";
import { dayGroupOf } from "@/lib/diary/fortune-adapter";
import { createExtItemId } from "@/lib/diary/diary-ext-store";
import { fetchCurrentDestinyProfile, type DestinyProfileCard } from "@/app/_lib/profile-card-storage";
import { getApiUrl } from "@/app/_lib/api-config";
import { authFetch } from "@/app/_lib/auth-client";
import { trackEvent } from "@/lib/analytics";
import styles from "./home-daily.module.css";

type Honey = { balance: number; attended: boolean; streak: number; nextBonusIn: number; streakEvery: number; streakBonus: number; awarded?: boolean; rewarded?: number };
type Status = "loading" | "guest" | "ready" | "error";
const QUEST_PREFIX = "home-quest:";

function DailyContent() {
  const { hydrated, ymd, ext, entry, chart } = useDiaryToday();
  const { updateExtDay, refresh } = useDiaryWriter();
  const [status, setStatus] = useState<Status>("loading");
  const [honey, setHoney] = useState<Honey | null>(null);
  const [profile, setProfile] = useState<DestinyProfileCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [picked, setPicked] = useState<{ action: DiarySmallAction; index: number } | null>(null);
  const quest = (ext[ymd]?.todos || []).find(item => item.id?.startsWith(QUEST_PREFIX));
  const pool = smallActionsFor(dayGroupOf(chart, ymd));
  const savedAction = quest ? pool.find(action => `${action.emoji} ${action.name}` === quest.text) || smallActionsFor(null).find(action => `${action.emoji} ${action.name}` === quest.text) : null;

  async function loadHoney(method: "GET" | "POST" = "GET") {
    if (method === "POST") setBusy(true);
    try {
      const response = await authFetch(getApiUrl("/api/honey/attendance"), { method, credentials: "include", cache: "no-store", ...(method === "POST" ? { headers: { "Content-Type": "application/json" }, body: "{}" } : {}) });
      if (response.status === 401) { setStatus("guest"); setHoney(null); setProfile(null); return; }
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error("attendance unavailable");
      setHoney(data); setStatus("ready");
      if (method === "POST") {
        setMessage(data.awarded ? `꿀방울 ${data.rewarded}개를 받았어요.` : "오늘은 이미 출석했어요.");
        if (data.awarded) trackEvent("daily_home_attendance", { surface: "home" });
      } else {
        void fetchCurrentDestinyProfile().then(setProfile).catch(() => setProfile(null));
      }
    } catch { setStatus("error"); setMessage("출석 정보를 불러오지 못했어요. 다시 시도해 주세요."); }
    finally { setBusy(false); }
  }

  useEffect(() => { void loadHoney(); }, []);
  useEffect(() => {
    if (hydrated && ymd) setPicked(pickSmallAction(smallActionsFor(dayGroupOf(chart, ymd)), -1));
  }, [hydrated, ymd, chart]);
  useEffect(() => {
    const onFocus = () => { refresh(); void loadHoney(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);
  useEffect(() => {
    if (!hydrated || !ymd) return;
    try {
      const key = "cd.daily-home.last-visit";
      const last = window.localStorage.getItem(key);
      if (last && last !== ymd) trackEvent("daily_home_return", { surface: "home" });
      window.localStorage.setItem(key, ymd);
    } catch { /* 방문 측정은 선택 사항 */ }
  }, [hydrated, ymd]);

  function selectQuest() {
    if (!picked || !ymd) return;
    const action = picked.action;
    if (updateExtDay(ymd, day => {
      const todos = Array.isArray(day.todos) ? day.todos : [];
      if (!todos.some(item => item.id?.startsWith(QUEST_PREFIX))) {
        day.todos = [...todos, { id: QUEST_PREFIX + createExtItemId(), text: `${action.emoji} ${action.name}`, done: false, createdAt: Date.now() }];
      }
    })) trackEvent("daily_home_quest_selected", { surface: "home" });
  }
  function toggleQuest() {
    if (!quest?.id) return;
    if (updateExtDay(ymd, toggleTodo(quest.id)) && !quest.done) trackEvent("daily_home_quest_completed", { surface: "home" });
  }

  return <section className={styles.daily} aria-labelledby="daily-home-title">
    <div className={styles.intro}><h2 id="daily-home-title">오늘의 운을 돌보는 자리</h2><p>작은 실천과 기록으로 나에게 좋은 하루를 만들어 보세요.</p></div>
    <div className={styles.topline}>
      <div className={styles.profile}><span className={styles.label}>나의 프로필</span><strong>{status === "loading" ? "확인 중이에요" : status === "guest" ? "로그인하고 내 카드 만나기" : profile ? `${profile.name || "나의"} 카드` : status === "error" ? "프로필을 확인해 주세요" : "첫 프로필을 만들어 보세요"}</strong>
        {/* The static shell has no Next RSC payload. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/ggulggul/?action=dpOpenList">프로필 카드 관리 <span aria-hidden="true">→</span></a></div>
      <div className={styles.honey}><span className={styles.label}>나의 꿀방울</span><strong>{status === "ready" && honey ? `${honey.balance}방울` : "출석하고 모아보세요"}</strong>
        {status === "ready" && honey ? <><p>{honey.streak > 0 ? `${honey.streak}일 연속 출석 · ` : ""}보너스까지 {honey.nextBonusIn}일</p><button type="button" disabled={busy || honey.attended} onClick={() => void loadHoney("POST")}>{busy ? "출석 확인 중" : honey.attended ? "오늘 출석 완료" : "오늘 출석하기"}</button></> : status === "guest" ? <Link className={styles.button} href="/login/?next=%2F">로그인하고 출석하기</Link> : status === "error" ? <button type="button" onClick={() => { setStatus("loading"); void loadHoney(); }}>다시 확인하기</button> : <p>출석 정보를 확인하고 있어요.</p>}
      </div>
    </div>
    <p className={styles.rule}>{honey ? `출석 보상과 ${honey.streakEvery}일 연속 출석마다 추가 ${honey.streakBonus}방울을 받을 수 있어요.` : "출석으로 꿀방울을 모아보세요."} 꿀방울은 지정된 상품에서 사용할 수 있어요.</p>
    {message && <p className={styles.notice} role="status">{message}</p>}
    <div className={styles.quest}><div><span className={styles.label}>오늘의 개운 퀘스트</span><h3>{quest ? quest.text : picked?.action.name || "오늘의 작은 행동을 고르고 있어요"}</h3><p>{quest ? savedAction?.tip || "오늘 고른 작은 행동을 실천해 보세요." : picked?.action.tip || "잠시만 기다려 주세요."}</p></div><div className={styles.actions}>{quest ? <button type="button" aria-pressed={Boolean(quest.done)} onClick={toggleQuest}>{quest.done ? "실천 완료 · 되돌리기" : "실천 완료하기"}</button> : <><button type="button" disabled={!picked} onClick={selectQuest}>오늘의 실천으로 담기</button><button type="button" className={styles.secondary} disabled={!picked} onClick={() => setPicked(pickSmallAction(pool, picked?.index ?? -1))}>다른 행동 보기</button></>}</div></div>
    <div className={styles.diary}><div><strong>운기 다이어리</strong><p>{entry && (entry.memoNote || entry.nightLog || entry.moodEmoji || entry.reviewNote) ? "오늘의 기록을 이어서 살펴보세요." : "오늘의 마음을 한 줄 남겨보세요."}</p><small>기록은 이 기기의 브라우저에 저장돼요.</small></div><Link href="/diary/" onClick={() => trackEvent("daily_home_diary_open", { surface: "home" })}>다이어리 열기 <span aria-hidden="true">→</span></Link></div>
    <p className={styles.footnote}>퀘스트는 일상을 위한 작은 제안이며 꿀방울 지급 대상은 아니에요.</p>
  </section>;
}

export default function HomeDaily() { return <DiaryStoreProvider><DailyContent /></DiaryStoreProvider>; }
