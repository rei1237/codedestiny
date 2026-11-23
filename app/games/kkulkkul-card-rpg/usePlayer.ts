"use client";
import { useEffect, useState } from "react";
import { refreshAuth, useAuthStore } from "@/app/_lib/auth-store";
import { authFetch } from "@/app/_lib/auth-client";

export function usePlayer() {
  const auth = useAuthStore();
  useEffect(() => {
    void refreshAuth({ silent: true }).catch(() => {});
  }, []);
  const owner = auth.isAuthenticated
    ? auth.user?.id || auth.user?.userId || auth.user?._id || auth.user?.uid
    : undefined;
  const [balance, setBalance] = useState({ owner: "", text: "" });
  const [level, setLevel] = useState({ owner: "", text: "" });
  const [walletVersion,refreshWallet]=useState(0);
  useEffect(()=>{
    if(process.env.NEXT_PUBLIC_MOCK_DEV!=="1")return;
    const refresh=()=>refreshWallet(n=>n+1);
    window.addEventListener("kkulkkul-card-rpg:wallet",refresh);
    return ()=>window.removeEventListener("kkulkkul-card-rpg:wallet",refresh);
  },[]);
  useEffect(() => {
    if (!owner) return;
    let active = true;
    const show = (set: typeof setBalance, text: string) => {
      if (active) set({ owner, text });
    };
    // The full billing client normalizes missing amounts to zero for legacy callers.
    // This read-only display needs to distinguish an incomplete snapshot from zero.
    authFetch("/api/billing/balance?moonlightStone=1&compact=1")
      .then(async (r) => {
        const result = await r.json();
        const snapshot = result.data;
        const amount = snapshot?.monthlyStoneBalance ?? snapshot?.membershipCreditBalance;
        show(
          setBalance,
          r.ok &&
            result.ok && snapshot?.authenticated === true &&
            !snapshot.degraded && (!snapshot.authUserId || snapshot.authUserId === owner) &&
            typeof amount === "number" &&
            Number.isSafeInteger(amount) &&
            amount >= 0
            ? amount.toLocaleString("ko-KR")
            : "조회 실패",
        );
      })
      .catch(() => show(setBalance, "조회 실패"));
    authFetch("/api/rpg/progress")
      .then(async (r) => {
        const data = await r.json();
        show(
          setLevel,
          r.ok &&
            data.ok &&
            !data.degraded &&
            Number.isInteger(data.progress?.currentLevel)
            ? String(data.progress.currentLevel)
            : "조회 실패",
        );
      })
      .catch(() => show(setLevel, "조회 실패"));
    return () => {
      active = false;
    };
  }, [owner,walletVersion]);
  const guest = auth.status === "guest" || auth.status === "expired";
  const offline =
    auth.status === "temporarilyOffline" || auth.status === "error";
  const state = offline ? "연결 실패" : guest ? "로그인 필요" : "확인 중";
  return {
    scope: owner || (guest ? "guest" : ""),
    name: owner ? auth.user?.name || "플레이어" : guest ? "게스트" : state,
    balance:
      !offline && owner && balance.owner === owner ? balance.text : state,
    level: !offline && owner && level.owner === owner ? level.text : state,
  };
}
