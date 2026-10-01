"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getAuthState, refreshAuth, useAuthStore } from "@/app/_lib/auth-store";
import FortuneChatClient from "./FortuneChatClient";
import ConsultationRoom from "./ConsultationRoom";
import { consultationApi, isConsultationId, type ChatPersona } from "./consultation-api";

const HINT_KEY = "fortune-chat:consultation-room";

/**
 * /fortune-chat 진입 분기. 서버 플래그(ENABLE_FORTUNE_CHAT_CONSULTATIONS)가 켜진 로그인 사용자만 새 상담실을
 * 열고, 그 밖(플래그 꺼짐·비로그인·조회 실패)은 기존 대화형 상담을 그대로 연다 — 플래그가 꺼진 운영은
 * 지금과 같다. `?consultation=<id>` 는 이미 시작한 상담이므로 플래그와 무관하게 새 상담실에서 연다
 * (서버도 읽기·이어 쓰기는 플래그와 무관하게 열어 둔다).
 *
 * 🔴 탐침은 로그인이 확정된 뒤에만 보낸다. 비로그인 상태로 보내면 401 → 토큰 갱신 실패 → `logout`
 *    동기화 이벤트가 나가고, 기존 상담방은 그 이벤트(cd:auth-changed)에 대화를 처음으로 되돌린다.
 */
export default function FortuneChatEntry() {
  const params = useSearchParams();
  const linked = params?.get("consultation") || "";
  // 홈의 상담 입구는 지금 테마의 상담자를 ?character= 로 넘긴다. 기존 상담방(FortuneChatClient)도 같은 값을 읽는다.
  const character = params?.get("character");
  const requested: ChatPersona | undefined = character === "neo" || character === "yeoni" ? character : undefined;
  const auth = useAuthStore();
  const userKey = String(auth.user?.id || auth.user?.userId || "");
  const [room, setRoom] = useState(() => isConsultationId(linked));

  useEffect(() => { if (!getAuthState().authReady) void refreshAuth({ silent: true }).catch(() => {}); }, []);

  useEffect(() => {
    if (isConsultationId(linked)) { setRoom(true); return undefined; }
    if (!auth.isAuthenticated) { setRoom(false); return undefined; }
    let alive = true;
    try { if (sessionStorage.getItem(HINT_KEY) === "1") setRoom(true); } catch { /* 힌트는 깜빡임을 줄이는 보조 수단이다. */ }
    void consultationApi.list("yeoni").then((data) => data.enabled === true, () => false).then((on) => {
      if (!alive) return;
      setRoom(on);
      try { sessionStorage.setItem(HINT_KEY, on ? "1" : "0"); } catch { /* 선택 사항 */ }
    });
    return () => { alive = false; };
  }, [linked, auth.isAuthenticated, userKey]);

  // 계정이 바뀌면 상담실을 새로 연다 — 이전 계정의 기록·상담이 남지 않게.
  return room ? <ConsultationRoom key={userKey} initialId={isConsultationId(linked) ? linked : ""} initialPersona={requested} /> : <FortuneChatClient />;
}
