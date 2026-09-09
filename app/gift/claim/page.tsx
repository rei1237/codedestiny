"use client";
import { useEffect, useRef, useState } from "react";
import { GIFT_GUIDANCE, GIFT_STATUS_LABELS } from "@/lib/payment/gift-policy.js";
import { giftApi, GiftApiError, type GiftView } from "../gift-client";

export default function ClaimPage() {
  const token = useRef("");
  const lock = useRef(false);
  const [gift, setGift] = useState<GiftView>();
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const refresh = async () => {
    try {
      const data = await giftApi("/preview", token.current ? { token: token.current } : {});
      setGift(data.gift); setNotice("");
      try { const a = await giftApi("/account"); setAccount(a.displayName || "현재 로그인한 계정"); } catch { setAccount(""); }
    } catch (e) { setNotice(e instanceof Error ? e.message : "선물 링크를 다시 열어 주세요."); }
  };
  useEffect(() => {
    token.current = new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    void refresh();
    // Fragment stays in the address bar so a reload/storage loss preserves the link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const receive = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setNotice("");
    const input = token.current ? { token: token.current } : {};
    try {
      if (!account) {
        await giftApi("/context", input);
        window.location.assign("/login?next=%2Fgift%2Fclaim&returnTo=%2Fgift%2Fclaim");
        return;
      }
      const data = await giftApi("/claim", input);
      setGift(data.gift); setNotice("선물을 받았어요. 이용권이 계정에 적용되었습니다.");
    } catch (e) {
      if (e instanceof GiftApiError && e.status === 401) setAccount("");
      setNotice(e instanceof Error ? e.message : "다시 시도해 주세요.");
    } finally { lock.current = false; setBusy(false); }
  };
  return <>
    <h1>운명의 선물이 도착했어요</h1>
    {gift && <article className="gift-card"><span className="gift-symbol" aria-hidden="true">✉</span><p>{gift.senderName}님이 준비한 마음</p><h2>{gift.product.name}</h2><p>수령 후 {gift.product.durationDays}일 동안 이용할 수 있는 이용권이에요.</p>{gift.recipientName && <p>{gift.recipientName}님에게</p>}{gift.giftMessage && <blockquote>{gift.giftMessage}</blockquote>}<p className="gift-meta">{GIFT_STATUS_LABELS[gift.status as keyof typeof GIFT_STATUS_LABELS] || gift.status}</p>{gift.expiresAt && <p className="gift-meta">수령 기한: {new Date(gift.expiresAt).toLocaleDateString("ko-KR")}</p>}</article>}
    {account && <p>수령 계정: {account}</p>}
    {gift?.status === "PAID" && <button disabled={busy} onClick={() => void receive()}>{busy ? "수령 확인 중" : account ? "이 계정으로 선물 받기" : "로그인하고 선물 받기"}</button>}
    <div role="status" aria-live="polite">{notice && <p className="gift-notice">{notice}</p>}</div>
    {!gift && <button disabled={busy} onClick={() => void refresh()}>선물 다시 확인하기</button>}
    {gift?.status === "CLAIMED" && <a className="gift-button" href="/points/">이용권 확인하기</a>}
    <details><summary>수령·이용·환불 안내</summary><p>{GIFT_GUIDANCE}</p></details>
  </>;
}
