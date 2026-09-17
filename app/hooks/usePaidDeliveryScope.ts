"use client";

import { useCallback, useEffect, useRef } from "react";
import { getAuthState, subscribeAuth } from "@/app/_lib/auth-store";

function currentOwner() {
  const user = getAuthState().user;
  return String(user?.id || user?.userId || user?._id || user?.uid || "");
}

type PaidDeliveryScopeOptions = {
  /**
   * PG 리다이렉트로 돌아온 문서는 "인증 미확정(owner 없음) → 저장된 계정 복원" 을 반드시 거친다.
   * true 면 그 첫 복원은 계정 전환이 아니다 — 복원 전에 시작한 결제 이어받기를 취소하지 않는다.
   * 인증 확정 뒤의 전환·로그아웃과 언마운트는 그대로 무효화한다. 복원 뒤 재조회를 콜백에 기대는
   * 화면은 켜지 않는다(기본 false).
   */
  survivesAuthRestore?: boolean;
};

/** 계정 전환·언마운트 뒤 도착한 유료 결과를 다른 고객 화면에 반영하지 않는다. */
export function usePaidDeliveryScope(onAccountChange: () => void, options: PaidDeliveryScopeOptions = {}) {
  const epoch = useRef(0);
  const restored = useRef<{ epoch: number; owner: string } | null>(null);
  const callback = useRef(onAccountChange);
  callback.current = onAccountChange;
  const survivesAuthRestore = options.survivesAuthRestore === true;
  useEffect(() => {
    let owner = currentOwner();
    // 직전 알림 시점의 준비 여부 — 캐시 시드는 사용자와 authReady 를 한 번에 넣는다.
    let ready = getAuthState().authReady === true;
    const unsubscribe = subscribeAuth(() => {
      const next = currentOwner();
      const wasReady = ready;
      ready = ready || getAuthState().authReady === true;
      if (next === owner) return;
      const restoring = survivesAuthRestore && !wasReady && owner === "" && !restored.current;
      owner = next;
      if (restoring) {
        restored.current = { epoch: epoch.current, owner: next };
        return;
      }
      epoch.current += 1;
      callback.current();
    });
    return () => { epoch.current += 1; unsubscribe(); };
  }, [survivesAuthRestore]);
  return useCallback(() => {
    const started = epoch.current;
    const owner = currentOwner();
    return () => {
      if (started !== epoch.current) return false;
      const now = currentOwner();
      return owner === now || (owner === "" && restored.current?.epoch === started && restored.current.owner === now);
    };
  }, []);
}
