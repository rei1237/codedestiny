"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getAuthState, refreshAuth, useAuthStore } from "@/app/_lib/auth-store";
import dynamic from "next/dynamic";
import ConsultationEntrance from "./ConsultationEntrance";
import { consultationApi, isConsultationId, type ChatPersona } from "./consultation-api";
const entryLoading = () => <ConsultationEntrance />;
const FortuneChatClient = dynamic(() => import("./FortuneChatClient"), { loading: entryLoading });
const ConsultationRoom = dynamic(() => import("./ConsultationRoom"), { loading: entryLoading });

const HINT_KEY = "fortune-chat:consultation-room";

/**
 * /fortune-chat 진입 분기. 서버 플래그(ENABLE_FORTUNE_CHAT_CONSULTATIONS)가 켜져 있으면 로그인 여부와
 * 무관하게 새 상담실을 연다 — 게스트도 고르고 적어 볼 수 있고, 상담 시작에서 로그인한다(게스트 정책 A,
 * 2026-10-01). 플래그 꺼짐·조회 실패는 기존 대화형 상담을 그대로 연다 — 플래그가 꺼진 운영은 지금과 같다.
 * `?consultation=<id>` 는 이미 시작한 상담이므로 플래그와 무관하게 새 상담실에서 연다
 * (서버도 읽기·이어 쓰기는 플래그와 무관하게 열어 둔다).
 *
 * 🔴 탐침은 로그인 없이 읽는 공개 status 다. 계정 API 로 탐침하면 비로그인 401 → 토큰 갱신 실패 →
 *    `logout` 동기화 이벤트가 나가고, 기존 상담방은 그 이벤트(cd:auth-changed)에 대화를 처음으로 되돌린다.
 */
export default function FortuneChatEntry() {
  const params = useSearchParams();
  const linked = params?.get("consultation") || "";
  const legacySession = params?.get("session") || "";
  // 새 상담의 상담자는 연이 하나다. 예전 홈 링크의 ?character=neo 도 연이로 연다(지난 네오 상담은 ?consultation= 으로 그대로 열린다).
  const requested: ChatPersona = "yeoni";
  const auth = useAuthStore();
  const userKey = String(auth.user?.id || auth.user?.userId || "");
  const [room, setRoom] = useState<boolean | null>(() => isConsultationId(linked) ? true : legacySession ? false : null);

  useEffect(() => { if (!getAuthState().authReady) void refreshAuth({ silent: true }).catch(() => {}); }, []);

  useEffect(() => {
    if (legacySession && !isConsultationId(linked)) { setRoom(false); return undefined; }
    if (isConsultationId(linked)) { setRoom(true); return undefined; }
    let alive = true;
    try { if (sessionStorage.getItem(HINT_KEY) === "1") setRoom(true); } catch { /* 힌트는 깜빡임을 줄이는 보조 수단이다. */ }
    void consultationApi.status().then((on) => {
      if (!alive) return;
      setRoom(on);
      try { sessionStorage.setItem(HINT_KEY, on ? "1" : "0"); } catch { /* 선택 사항 */ }
    });
    return () => { alive = false; };
  }, [linked, legacySession]);

  if (room === null && !isConsultationId(linked) && !legacySession) return entryLoading();

  // 계정이 바뀌면 상담실을 새로 연다 — 이전 계정의 기록·상담이 남지 않게.
  return isConsultationId(linked) || (!legacySession && room)
    ? <ConsultationRoom key={userKey} initialId={isConsultationId(linked) ? linked : ""} initialPersona={requested} />
    : <FortuneChatClient key={userKey} />;
}
