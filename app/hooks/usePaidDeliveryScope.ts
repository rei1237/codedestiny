"use client";

import { useCallback, useEffect, useRef } from "react";
import { getAuthState, subscribeAuth } from "@/app/_lib/auth-store";

function currentOwner() {
  const user = getAuthState().user;
  return String(user?.id || user?.userId || user?._id || user?.uid || "");
}

/** 계정 전환·언마운트 뒤 도착한 유료 결과를 다른 고객 화면에 반영하지 않는다. */
export function usePaidDeliveryScope(onAccountChange: () => void) {
  const epoch = useRef(0);
  const callback = useRef(onAccountChange);
  callback.current = onAccountChange;
  useEffect(() => {
    let owner = currentOwner();
    const unsubscribe = subscribeAuth(() => {
      const next = currentOwner();
      if (next === owner) return;
      owner = next;
      epoch.current += 1;
      callback.current();
    });
    return () => { epoch.current += 1; unsubscribe(); };
  }, []);
  return useCallback(() => {
    const started = epoch.current;
    const owner = currentOwner();
    return () => started === epoch.current && owner === currentOwner();
  }, []);
}
