"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDiaryToday, useDiaryWriter } from "@/app/diary/_components/DiaryStoreProvider";
import { readStoredEntry } from "@/app/diary/_lib/today-snapshot";
import type { DiaryTodoItem } from "@/app/diary/_lib/ext-snapshot";
import { kstTodayYmd } from "@/app/diary/_lib/kst-date";
import { smallActionsFor, pickSmallAction, type DiarySmallAction } from "@/app/diary/_lib/small-action-pool";
import { toggleTodo } from "@/app/diary/_lib/ext-writes";
import { dayGroupOf } from "@/lib/diary/fortune-adapter";
import { createExtItemId } from "@/lib/diary/diary-ext-store";
import { fetchCurrentDestinyProfile, type DestinyProfileCard } from "@/app/_lib/profile-card-storage";
import { getApiUrl } from "@/app/_lib/api-config";
import { authFetch } from "@/app/_lib/auth-client";
import { hasClientAuthHint } from "@/app/_lib/user-session-cache";
import { trackEvent } from "@/lib/analytics";
import { awardRpg } from "@/app/destiny-compass/_lib/rpg-bridge";
import { QUEST_ID_PREFIX, entryHasRecord, findQuestTodo, journeyStepsDone, msUntilKstMidnight, weekForestMap } from "./forest-progress.mjs";

export type JourneyHoney = { balance: number; attended: boolean; streak: number; nextBonusIn: number; streakEvery: number; streakBonus: number; attendanceEvery: number; promptCost: number; awarded?: boolean; rewarded?: number };
export type JourneyProgress = { currentLevel: number; currentLevelExp: number; nextLevelExp: number };
export type JourneyProduct = { productId: string; title: string; honeyCost: number };
export type JourneyStatus = "loading" | "guest" | "ready" | "error";
export type JourneySurface = "home" | "diary";

const HONEY_USE_PRODUCT_IDS = ["rpt_specialCharmCard", "rpt_skillTreeCard", "section_summary"];
const LAST_VISIT_KEY = "cd.daily-home.last-visit";
const WALK_COMPLETED_KEY = "cd.daily-home.walk-completed";

/**
 * 오늘의 숲길 데이터. 출석·경험치 규칙과 값은 서버에 있고, 실천·기록은 기존 다이어리 저장소를 쓴다.
 * 🔴 `enabled` 가 true 가 된 뒤에만 API 를 부른다 — 홈 첫 로딩에 부담을 주지 않기 위해서다.
 */
export function useDailyJourney({ surface, enabled }: { surface: JourneySurface; enabled: boolean }) {
  const { hydrated, ymd, entry, store, ext, chart } = useDiaryToday();
  const { updateExtDay, refresh } = useDiaryWriter();
  const [status, setStatus] = useState<JourneyStatus>("loading");
  const [honey, setHoney] = useState<JourneyHoney | null>(null);
  const [progress, setProgress] = useState<JourneyProgress | null | undefined>(undefined);
  const [products, setProducts] = useState<JourneyProduct[]>([]);
  const [profile, setProfile] = useState<DestinyProfileCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [picked, setPicked] = useState<{ action: DiarySmallAction; index: number } | null>(null);

  const requestSeq = useRef(0);
  const posting = useRef(false);
  const honeyDay = useRef("");

  const quest = findQuestTodo(ext[ymd]) as DiaryTodoItem | undefined;
  const dayGroup = dayGroupOf(chart, ymd);
  const pool = smallActionsFor(dayGroup);
  const savedAction = quest ? pool.find(action => `${action.emoji} ${action.name}` === quest.text) || smallActionsFor(null).find(action => `${action.emoji} ${action.name}` === quest.text) : null;

  const loadProgress = useCallback(async () => {
    try {
      const response = await authFetch(getApiUrl("/api/rpg/progress"), { credentials: "include", cache: "no-store" }, { retryOn401: hasClientAuthHint() });
      const data = await response.json();
      setProgress(response.ok && data?.ok && data.progress ? data.progress : null);
    } catch { setProgress(null); }
  }, []);
  const recordGrowth = useCallback(async (kind: "checkin" | "quest", key: string) => {
    await awardRpg(kind, key);
    await loadProgress();
  }, [loadProgress]);
  const loadHoney = useCallback(async (method: "GET" | "POST" = "GET") => {
    // 출석 중에는 조회를 보내지 않고, 먼저 나간 조회의 답은 버린다. 늦은 답이 켠 등불을 되돌리면 안 된다.
    if (posting.current) return;
    if (method === "POST") { posting.current = true; setBusy(true); }
    const seq = ++requestSeq.current;
    try {
      // 🔴 로그인 흔적이 없는 조회에서 refresh 를 타면 실패 시 clearClientAuthState 가 돌아 탭의 세션 값이 지워진다.
      const response = await authFetch(getApiUrl("/api/honey/attendance"), { method, credentials: "include", cache: "no-store", ...(method === "POST" ? { headers: { "Content-Type": "application/json" }, body: "{}" } : {}) }, method === "POST" ? {} : { retryOn401: hasClientAuthHint() });
      if (seq !== requestSeq.current) return;
      if (response.status === 401) { setStatus("guest"); setHoney(null); setProfile(null); setProgress(null); setMessage(""); return; }
      const data = await response.json();
      if (seq !== requestSeq.current) return;
      if (!response.ok || !data?.ok) throw new Error("attendance unavailable");
      setHoney(data); setStatus("ready");
      if (method === "GET") setMessage("");
      if (method === "POST") {
        setMessage(data.awarded ? `꿀방울 ${data.rewarded}개를 받았어요.` : "오늘은 이미 출석했어요.");
        if (data.awarded) { trackEvent("daily_home_attendance", { surface }); void recordGrowth("checkin", ""); }
      } else {
        void fetchCurrentDestinyProfile().then(setProfile).catch(() => setProfile(null));
        void loadProgress();
      }
    } catch {
      if (seq !== requestSeq.current) return;
      setStatus("error"); setHoney(null); setProfile(null); setProgress(null); setMessage("출석 정보를 불러오지 못했어요. 다시 시도해 주세요.");
    } finally {
      if (method === "POST") { posting.current = false; setBusy(false); }
    }
  }, [loadProgress, recordGrowth, surface]);

  useEffect(() => {
    if (!enabled) return;
    void loadHoney();
    void fetch(getApiUrl("/api/honey/catalog"), { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(data => {
      if (Array.isArray(data?.products)) setProducts(data.products.filter((item: JourneyProduct) => HONEY_USE_PRODUCT_IDS.includes(item.productId)));
    }).catch(() => {});
  }, [enabled, loadHoney]);
  useEffect(() => {
    if (hydrated && ymd) setPicked(pickSmallAction(smallActionsFor(dayGroup), -1));
  }, [hydrated, ymd, dayGroup]);
  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => { refresh(); void loadHoney(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [enabled, refresh, loadHoney]);
  // 화면을 켜 둔 채 자정을 넘기거나 탭·앞뒤 캐시에서 돌아와도 어제 기록을 오늘 것으로 두지 않는다.
  useEffect(() => {
    if (!hydrated || !ymd) return;
    const rollOver = () => { if (kstTodayYmd() !== ymd) refresh(); };
    rollOver();
    const timer = window.setTimeout(rollOver, msUntilKstMidnight(Date.now()) + 1000);
    document.addEventListener("visibilitychange", rollOver);
    window.addEventListener("pageshow", rollOver);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", rollOver);
      window.removeEventListener("pageshow", rollOver);
    };
  }, [hydrated, ymd, refresh]);
  useEffect(() => {
    if (!enabled || !hydrated || !ymd) return;
    if (honeyDay.current && honeyDay.current !== ymd) void loadHoney();
    honeyDay.current = ymd;
  }, [enabled, hydrated, ymd, loadHoney]);
  useEffect(() => {
    if (!enabled || !hydrated || !ymd) return;
    try {
      const last = window.localStorage.getItem(LAST_VISIT_KEY);
      if (last && last !== ymd) trackEvent("daily_home_return", { surface });
      window.localStorage.setItem(LAST_VISIT_KEY, ymd);
    } catch { /* 방문 측정은 선택 사항 */ }
  }, [enabled, hydrated, ymd, surface]);

  const attended = Boolean(honey?.attended);
  const questDone = Boolean(quest?.done);
  const hasRecord = entryHasRecord(entry);
  const stepsDone = journeyStepsDone({ attended, questDone, hasRecord });
  const weekMap = useMemo(() => weekForestMap(ymd, (day: string) => readStoredEntry(store, day), ext), [ymd, store, ext]);

  useEffect(() => {
    if (!hydrated || !ymd || stepsDone < 3) return;
    try {
      if (window.localStorage.getItem(WALK_COMPLETED_KEY) === ymd) return;
      window.localStorage.setItem(WALK_COMPLETED_KEY, ymd);
    } catch { /* 저장이 막혀도 완주 측정만 한 번 더 나갈 뿐이다 */ }
    trackEvent("daily_home_walk_completed", { surface });
  }, [hydrated, ymd, stepsDone, surface]);

  function attend() { void loadHoney("POST"); }
  function retry() { setStatus("loading"); void loadHoney(); }
  function selectQuest() {
    if (!picked || !ymd) return;
    const action = picked.action;
    if (updateExtDay(ymd, day => {
      const todos = Array.isArray(day.todos) ? day.todos : [];
      if (!findQuestTodo(day)) {
        day.todos = [...todos, { id: QUEST_ID_PREFIX + createExtItemId(), text: `${action.emoji} ${action.name}`, done: false, createdAt: Date.now() }];
      }
    })) trackEvent("daily_home_quest_selected", { surface });
  }
  function rerollQuest() { setPicked(pickSmallAction(pool, picked?.index ?? -1)); }
  function toggleQuest() {
    if (!quest?.id) return;
    if (updateExtDay(ymd, toggleTodo(quest.id)) && !quest.done) {
      trackEvent("daily_home_quest_completed", { surface });
      if (status === "ready") void recordGrowth("quest", `daily-home:${ymd}`);
    }
  }

  return { surface, hydrated, ymd, entry, status, honey, progress, products, profile, busy, message, quest, picked, savedAction, attended, questDone, hasRecord, stepsDone, weekMap, attend, retry, selectQuest, rerollQuest, toggleQuest };
}

export type DailyJourney = ReturnType<typeof useDailyJourney>;
