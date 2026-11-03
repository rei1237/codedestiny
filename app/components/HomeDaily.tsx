"use client";

import { useCallback, useEffect, useState } from "react";
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
import { awardRpg } from "@/app/destiny-compass/_lib/rpg-bridge";
import styles from "./home-daily.module.css";

type Honey = { balance: number; attended: boolean; streak: number; nextBonusIn: number; streakEvery: number; streakBonus: number; attendanceEvery: number; promptCost: number; awarded?: boolean; rewarded?: number };
type Progress = { currentLevel: number; currentLevelExp: number; nextLevelExp: number };
type Product = { productId: string; title: string; honeyCost: number };
type Status = "loading" | "guest" | "ready" | "error";
const QUEST_PREFIX = "home-quest:";

function DailyContent() {
  const { hydrated, ymd, ext, entry, chart } = useDiaryToday();
  const { updateExtDay, refresh } = useDiaryWriter();
  const [status, setStatus] = useState<Status>("loading");
  const [honey, setHoney] = useState<Honey | null>(null);
  const [progress, setProgress] = useState<Progress | null | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [profile, setProfile] = useState<DestinyProfileCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [picked, setPicked] = useState<{ action: DiarySmallAction; index: number } | null>(null);
  const quest = (ext[ymd]?.todos || []).find(item => item.id?.startsWith(QUEST_PREFIX));
  const pool = smallActionsFor(dayGroupOf(chart, ymd));
  const savedAction = quest ? pool.find(action => `${action.emoji} ${action.name}` === quest.text) || smallActionsFor(null).find(action => `${action.emoji} ${action.name}` === quest.text) : null;

  const loadProgress = useCallback(async () => {
    try {
      const response = await authFetch(getApiUrl("/api/rpg/progress"), { credentials: "include", cache: "no-store" });
      const data = await response.json();
      setProgress(response.ok && data?.ok && data.progress ? data.progress : null);
    } catch { setProgress(null); }
  }, []);
  const recordGrowth = useCallback(async (kind: "checkin" | "quest", key: string) => {
    await awardRpg(kind, key);
    await loadProgress();
  }, [loadProgress]);
  const loadHoney = useCallback(async (method: "GET" | "POST" = "GET") => {
    if (method === "POST") setBusy(true);
    try {
      const response = await authFetch(getApiUrl("/api/honey/attendance"), { method, credentials: "include", cache: "no-store", ...(method === "POST" ? { headers: { "Content-Type": "application/json" }, body: "{}" } : {}) });
      if (response.status === 401) { setStatus("guest"); setHoney(null); setProfile(null); setProgress(null); return; }
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error("attendance unavailable");
      setHoney(data); setStatus("ready");
      if (method === "GET") setMessage("");
      if (method === "POST") {
        setMessage(data.awarded ? `꿀방울 ${data.rewarded}개를 받았어요.` : "오늘은 이미 출석했어요.");
        if (data.awarded) { trackEvent("daily_home_attendance", { surface: "home" }); void recordGrowth("checkin", ""); }
      } else {
        void fetchCurrentDestinyProfile().then(setProfile).catch(() => setProfile(null));
        void loadProgress();
      }
    } catch { setStatus("error"); setHoney(null); setProfile(null); setProgress(null); setMessage("출석 정보를 불러오지 못했어요. 다시 시도해 주세요."); }
    finally { setBusy(false); }
  }, [loadProgress, recordGrowth]);

  useEffect(() => {
    void loadHoney();
    void fetch(getApiUrl("/api/honey/catalog"), { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(data => {
      if (Array.isArray(data?.products)) setProducts(data.products.filter((item: Product) => ["rpt_specialCharmCard", "rpt_skillTreeCard", "section_summary"].includes(item.productId)));
    }).catch(() => {});
  }, [loadHoney]);
  useEffect(() => {
    if (hydrated && ymd) setPicked(pickSmallAction(smallActionsFor(dayGroupOf(chart, ymd)), -1));
  }, [hydrated, ymd, chart]);
  useEffect(() => {
    const onFocus = () => { refresh(); void loadHoney(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh, loadHoney]);
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
    if (updateExtDay(ymd, toggleTodo(quest.id)) && !quest.done) {
      trackEvent("daily_home_quest_completed", { surface: "home" });
      if (status === "ready") void recordGrowth("quest", `daily-home:${ymd}`);
    }
  }

  return <section className={styles.daily} aria-labelledby="daily-home-title">
    <div className={styles.intro}><div><h2 id="daily-home-title">오늘의 운을 돌보는 자리</h2><p>연이와 함께, 내 하루에 좋은 습관을 하나씩 담아봐요.</p></div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/yeoni/welcome/yeoni-mark-v1-96.webp" width="64" height="64" alt="" /></div>
    <div className={styles.story}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/home/yeoni-daily-journal-v1.webp" width="960" height="540" alt="다이어리를 쓰는 꽃돼지 연이" /><p>“오늘은 어떤 작은 이야기를 남겨볼까요?” <span>— 연이</span></p></div>
    <div className={styles.topline}>
      <div className={styles.profile}><span className={styles.label}>나의 운명 카드</span><strong>{status === "loading" ? "확인 중이에요" : status === "guest" ? "로그인하고 내 카드 만나기" : profile ? `${profile.name || "나의"} 카드` : status === "error" ? "프로필을 확인해 주세요" : "프로필 카드 확인하기"}</strong>
        {progress && <div className={styles.growth}><strong>Lv. {progress.currentLevel}</strong><progress value={progress.currentLevelExp} max={Math.max(1, progress.nextLevelExp)} aria-label="다음 레벨까지의 경험치" /><small>계정 공통 경험치 {progress.currentLevelExp} / {progress.nextLevelExp}</small></div>}
        {status === "ready" && !progress && <small>{progress === undefined ? "성장 기록을 확인하고 있어요." : "성장 기록을 불러오지 못했어요. 잠시 후 다시 확인해 주세요."}</small>}
        {/* The static shell has no Next RSC payload. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/ggulggul/?action=dpOpenList">카드 관리 <span aria-hidden="true">→</span></a></div>
      <div className={styles.honey}><span className={styles.label}>나의 꿀방울</span><strong>{status === "ready" && honey ? `${honey.balance}방울` : "출석하고 모아보세요"}</strong>
        {status === "ready" && honey ? <><p>{honey.streak > 0 ? `${honey.streak}일 연속 출석 · ` : ""}보너스까지 {honey.nextBonusIn}일</p><div className={styles.days} aria-label={`연속 출석 ${honey.streak}일, 다음 보너스까지 ${honey.nextBonusIn}일`}>{Array.from({ length: Math.min(honey.streakEvery, 14) }, (_, index) => <span key={index} className={index < (honey.streak % honey.streakEvery || (honey.attended && honey.streak > 0 ? honey.streakEvery : 0)) ? styles.dayDone : ""} aria-hidden="true">{index + 1}</span>)}</div><button type="button" disabled={busy || honey.attended} onClick={() => void loadHoney("POST")}>{busy ? "출석 확인 중" : honey.attended ? "출석 완료" : "오늘 출석하기"}</button></> : status === "guest" ? <Link className={styles.button} href="/login/?next=%2F%23daily-home-title">로그인하고 출석하기</Link> : status === "error" ? <button type="button" onClick={() => { setStatus("loading"); void loadHoney(); }}>다시 확인하기</button> : <p>출석 정보를 확인하고 있어요.</p>}
      </div>
    </div>
    <p className={styles.rule}>{honey ? `${honey.attendanceEvery === 1 ? "하루 한 번 출석하면 1방울, " : "출석 보상과 "}${honey.streakEvery}일 연속 출석마다 추가 ${honey.streakBonus}방울을 받을 수 있어요.` : "출석으로 꿀방울을 모아보세요."} 꿀방울은 지정된 상품에서 사용할 수 있어요.</p>
    {message && <p className={styles.notice} role="status">{message}</p>}
    <details className={styles.rewards}><summary>꿀방울은 어떻게 모으고 쓰나요?</summary><p>매일 출석해 꿀방울을 모아요. 연속 출석 보너스는 출석 현황에 따라 안내해 드려요. 하루를 놓치면 연속 출석은 다시 시작해요.</p>{products.length > 0 && <><strong>이런 곳에서 사용할 수 있어요</strong><ul>{products.map(item => <li key={item.productId}>{item.title} <b>{item.honeyCost}방울</b></li>)}</ul></>}<p>{honey && <>운세 프롬프트 1회에는 {honey.promptCost}방울이 필요해요. </>}이용 가능한 상품과 필요 방울 수는 각 상품의 안내를 확인해 주세요. 꿀방울과 경험치는 별도로 관리돼요.</p>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/ggulggul/?action=cdOpenAllFortunes">꿀꿀 운세에서 더 살펴보기</a></details>
    <div className={styles.quest}><div><span className={styles.label}>오늘의 개운 퀘스트</span><h3>{quest ? quest.text : picked?.action.name || "오늘의 작은 행동을 고르고 있어요"}</h3><p>{quest ? savedAction?.tip || "오늘 고른 작은 행동을 실천해 보세요." : picked?.action.tip || "잠시만 기다려 주세요."}</p></div><div className={styles.actions}>{quest ? <button type="button" aria-pressed={Boolean(quest.done)} onClick={toggleQuest}>{quest.done ? "실천 완료 · 되돌리기" : "실천 완료하기"}</button> : <><button type="button" disabled={!picked} onClick={selectQuest}>오늘의 실천으로 담기</button><button type="button" className={styles.secondary} disabled={!picked} onClick={() => setPicked(pickSmallAction(pool, picked?.index ?? -1))}>다른 행동 보기</button></>}</div></div>
    <div className={styles.diary}><div><strong>운기 다이어리</strong><p>{entry && (entry.memoNote || entry.nightLog || entry.moodEmoji || entry.reviewNote) ? "오늘의 기록을 이어서 살펴보세요." : "오늘의 마음을 한 줄 남겨보세요."}</p><small>기록은 이 기기의 브라우저에 저장돼요.</small></div><Link href="/diary/" onClick={() => trackEvent("daily_home_diary_open", { surface: "home" })}>다이어리 열기 <span aria-hidden="true">→</span></Link></div>
    <p className={styles.footnote}>퀘스트는 일상을 위한 작은 제안이에요. 꿀방울은 지급되지 않으며, 로그인하면 기존 성장 규칙에 따라 경험치를 쌓을 수 있어요.</p>
  </section>;
}

export default function HomeDaily() { return <DiaryStoreProvider><DailyContent /></DiaryStoreProvider>; }
