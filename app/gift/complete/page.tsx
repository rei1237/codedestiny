"use client";
import { useEffect, useRef, useState } from "react";
import GiftSharing from "../GiftSharing";
import { giftApi, GiftApiError, type GiftView } from "../gift-client";

export default function GiftComplete() {
  const [gift, setGift] = useState<GiftView>();
  const [notice, setNotice] = useState("결제 내역을 확인하고 있어요. 다시 결제하지 말아 주세요.");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const check = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    const q = new URLSearchParams(window.location.search);
    const id = q.get("orderId") || q.get("paymentId") || "";
    try {
      if (!id) throw new Error("주문을 찾을 수 없습니다. 보낸 선물함에서 확인해 주세요.");
      let d = await giftApi(`/gift_${encodeURIComponent(id)}`);
      if (d.gift?.status === "PENDING_PAYMENT") {
        await giftApi("/api/payments/subscription/confirm", { merchantUid: id, impUid: id, purchaseType: "GIFT" });
        d = await giftApi(`/gift_${encodeURIComponent(id)}`);
      }
      setGift(d.gift); setNotice(d.gift?.status === "PAID" ? "링크를 만들어 소중한 사람에게 보내세요." : "선물 상태를 확인해 주세요.");
    } catch (e) {
      if (e instanceof GiftApiError && e.status === 401) {
        window.location.assign(`/login?next=${encodeURIComponent(`/gift/complete/?orderId=${encodeURIComponent(id)}`)}`); return;
      }
      setNotice(e instanceof Error ? e.message : "결제 내역을 다시 확인해 주세요.");
    } finally { lock.current = false; setBusy(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void check(); }, []);
  return <><h1>{gift?.status === "PAID" ? "선물이 준비되었습니다" : "선물 결제 확인"}</h1><p role="status">{notice}</p>{gift && <><article className="gift-card"><span className="gift-symbol" aria-hidden="true">✉</span><h2>{gift.product.name}</h2>{gift.giftMessage && <blockquote>{gift.giftMessage}</blockquote>}</article><GiftSharing gift={gift} onChange={setGift} /></>}<div className="gift-actions"><button className="secondary" disabled={busy} onClick={() => void check()}>결제 상태 다시 확인</button><a className="gift-button" href="/gift/box/">보낸 선물 확인하기</a></div></>;
}
