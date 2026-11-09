"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDiaryToday, useDiaryWriter } from "@/app/diary/_components/DiaryStoreProvider";
import type { DiaryTodoItem } from "@/app/diary/_lib/ext-snapshot";
import { kstTodayYmd } from "@/app/diary/_lib/kst-date";
import { smallActionsFor, pickSmallAction, type DiarySmallAction } from "@/app/diary/_lib/small-action-pool";
import { toggleTodo } from "@/app/diary/_lib/ext-writes";
import { dayGroupOf } from "@/lib/diary/fortune-adapter";
import { createExtItemId } from "@/lib/diary/diary-ext-store";
import { fetchCurrentDestinyProfile, type DestinyProfileCard } from "@/app/_lib/profile-card-storage";
import { findSpirit, spriteUrl } from "@/js/core/profile-characters.mjs";
import { loadProfileCharacterPreview } from "@/js/core/profile-character-card.mjs";
import type { petSpriteMarkup } from "@/js/core/profile-pet-card.mjs";
import { getApiUrl } from "@/app/_lib/api-config";
import { authFetch } from "@/app/_lib/auth-client";
import { hasClientAuthHint } from "@/app/_lib/user-session-cache";
import { trackEvent } from "@/lib/analytics";
import { awardRpg } from "@/app/destiny-compass/_lib/rpg-bridge";
import { QUEST_ID_PREFIX, entryHasRecord, findQuestTodo, journeyStepsDone, msUntilKstMidnight, pickHoneyUses } from "./daily-progress.mjs";

type CardPortrait = { id: string; name: string; animal: string; ganji: string; element: string; equipped: boolean; pet: Parameters<typeof petSpriteMarkup>[0] | null };

async function readPortrait(profile: DestinyProfileCard): Promise<CardPortrait> {
  const request = async (path: string, init: RequestInit = {}) => {
    const response = await authFetch(getApiUrl(path), { ...init, credentials: "include", cache: "no-store" }, { retryOn401: hasClientAuthHint() });
    return { ok: response.ok, data: await response.json() };
  };
  const [preview, equipment, companion] = await Promise.all([
    loadProfileCharacterPreview(profile, { request }),
    request("/api/rpg/characters"),
    request("/api/rpg/pet?profileId=" + encodeURIComponent(profile.profileId || profile.id || '')),
  ]);
  if (!equipment.ok || !equipment.data?.ok || equipment.data.degraded) throw new Error("equipment-unavailable");
  if (!companion.ok || !companion.data?.ok || companion.data.degraded) throw new Error("companion-unavailable");
  const animal = preview.character;
  const spirit = findSpirit(equipment.data.equippedId);
  if (!animal || !spriteUrl(animal.id) || (equipment.data.equippedId && !spirit)) throw new Error("character-unavailable");
  return { id: spirit?.id || animal.id, name: spirit?.name || animal.name, animal: animal.name,
    ganji: animal.ganji, element: animal.element, equipped: Boolean(spirit), pet: companion.data.pet || null };
}

export type JourneyHoney = { balance: number; attended: boolean; streak: number; nextBonusIn: number; streakEvery: number; streakBonus: number; attendanceEvery: number; promptCost: number; day?: string; monthDays?: { day: string; bonus?: boolean }[]; awarded?: boolean; rewarded?: number; bonus?: number };
export type JourneyProgress = { currentLevel: number; currentLevelExp: number; nextLevelExp: number };
export type JourneyProduct = { productId: string; title: string; group: string; honeyCost: number };
export type HoneyRules = { attendanceEvery: number; streakEvery: number; streakBonus: number; promptCost: number };
export type JourneyStatus = "loading" | "guest" | "ready" | "error";
export type JourneySurface = "home" | "diary";

const LAST_VISIT_KEY = "cd.daily-home.last-visit";
const WALK_COMPLETED_KEY = "cd.daily-home.walk-completed";

/**
 * 내 캐릭터 출석부 데이터. 출석·경험치 규칙과 값은 서버에 있고, 실천·기록은 기존 다이어리 저장소를 쓴다.
 * 🔴 `enabled` 가 true 가 된 뒤에만 API 를 부른다 — 홈 첫 로딩에 부담을 주지 않기 위해서다.
 */
export function useDailyJourney({ surface, enabled }: { surface: JourneySurface; enabled: boolean }) {
  const { hydrated, ymd, entry, ext, chart } = useDiaryToday();
  const { updateExtDay, refresh } = useDiaryWriter();
  const [status, setStatus] = useState<JourneyStatus>("loading");
  const [honey, setHoney] = useState<JourneyHoney | null>(null);
  const [progress, setProgress] = useState<JourneyProgress | null | undefined>(undefined);
  const [products, setProducts] = useState<JourneyProduct[]>([]);
  const [catalogRules, setCatalogRules] = useState<HoneyRules | null>(null);
  const [profile, setProfile] = useState<DestinyProfileCard | null>(null);
  const [profileStatus, setProfileStatus] = useState<"loading" | "ready" | "error">("loading");
  const [profileRevision, setProfileRevision] = useState(0);
  const [portrait, setPortrait] = useState<CardPortrait | null>(null);
  const [portraitFailed, setPortraitFailed] = useState(false);
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
    // 출석 중에는 조회를 보내지 않고, 먼저 나간 조회의 답은 버린다. 늦은 답이 찍은 도장을 되돌리면 안 된다.
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
        setProfileRevision(value => value + 1);
        void loadProgress();
      }
    } catch {
      if (seq !== requestSeq.current) return;
      setStatus("error"); setHoney(null); setProfile(null); setProgress(null); setMessage("출석 정보를 불러오지 못했어요. 다시 시도해 주세요.");
    } finally {
      if (method === "POST") { posting.current = false; setBusy(false); }
    }
  }, [loadProgress, recordGrowth, surface]);

  // 카드·출석·퀘스트는 모두 같은 선택 카드와 장착 상태를 쓴다.
  useEffect(() => {
    let active = true;
    setProfile(null); setPortrait(null); setPortraitFailed(false); setProfileStatus("loading");
    if (status !== "ready") return;
    async function loadSelected() {
      try {
        const selected = await fetchCurrentDestinyProfile(card => Boolean(card.id || card.profileId), { reportFailure: true });
        if (!active) return;
        setProfile(selected);
        if (selected) {
          try {
            const next = await readPortrait(selected);
            if (active) setPortrait(next);
          } catch { if (active) setPortraitFailed(true); }
        }
        if (active) setProfileStatus("ready");
      } catch { if (active) setProfileStatus("error"); }
    }
    void loadSelected();
    return () => { active = false; };
  }, [status, profileRevision]);

  useEffect(() => {
    if (!enabled) return;
    void loadHoney();
    void fetch(getApiUrl("/api/honey/catalog"), { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(data => {
      // 사용처는 공개 카탈로그(로그인 불필요)에서 분야별로 고른다. 지급 규칙도 같은 응답의 서버 상수다.
      if (Array.isArray(data?.products)) setProducts(pickHoneyUses(data.products));
      if (data?.attendance) setCatalogRules(data.attendance);
    }).catch(() => {});
  }, [enabled, loadHoney]);
  useEffect(() => {
    if (hydrated && ymd) setPicked(pickSmallAction(smallActionsFor(dayGroup), -1));
  }, [hydrated, ymd, dayGroup]);
  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => { refresh(); void loadHoney(); };
    window.addEventListener("focus", onFocus);
    function accountChanged() { setStatus("loading"); onFocus(); }
    window.addEventListener("cd:auth-changed", accountChanged);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("cd:auth-changed", accountChanged);
    };
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

  // 로그인하면 출석 응답의 규칙이, 비회원이면 카탈로그의 규칙이 쓰인다(둘 다 같은 서버 상수).
  const rules: HoneyRules | null = honey ? { attendanceEvery: honey.attendanceEvery, streakEvery: honey.streakEvery, streakBonus: honey.streakBonus, promptCost: honey.promptCost } : catalogRules;
  return { surface, hydrated, ymd, entry, status, honey, rules, progress, products, profile, profileStatus, portrait, portraitFailed, busy, message, quest, picked, savedAction, attended, questDone, hasRecord, stepsDone, attend, retry, selectQuest, rerollQuest, toggleQuest };
}

export type DailyJourney = ReturnType<typeof useDailyJourney>;
