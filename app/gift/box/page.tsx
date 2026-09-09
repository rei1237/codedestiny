"use client";
import { useEffect, useState } from "react";
import { GIFT_STATUS_LABELS } from "@/lib/payment/gift-policy.js";
import GiftSharing from "../GiftSharing";
import { giftApi, GiftApiError, type GiftView } from "../gift-client";

export default function GiftBox() {
  const [received, setReceived] = useState(false);
  const [gifts, setGifts] = useState<GiftView[]>([]);
  const [cursor, setCursor] = useState<string | null>();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async (next = "") => {
    setBusy(true); setNotice("");
    try { const d = await giftApi(`/${received ? "received" : "sent"}${next ? `?cursor=${encodeURIComponent(next)}` : ""}`); setGifts(old => next ? [...old, ...d.gifts || []] : d.gifts || []); setCursor(d.nextCursor); }
    catch (e) { if (e instanceof GiftApiError && e.status === 401) window.location.assign("/login?next=%2Fgift%2Fbox"); else setNotice(e instanceof Error ? e.message : "다시 확인해 주세요."); }
    finally { setBusy(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [received]);
  const requestRefund = async (gift: GiftView) => {
    setBusy(true);
    try { await giftApi(`/${encodeURIComponent(gift.giftId)}/refund-request`, {}); setNotice("환불 검토를 요청했습니다. 운영자가 결제 내역과 수령 상태를 확인합니다."); }
    catch (e) { setNotice(e instanceof Error ? e.message : "다시 시도해 주세요."); }
    finally { setBusy(false); }
  };
  return <><h1>나의 선물함</h1><div className="gift-actions"><button disabled={busy} className={received ? "secondary" : ""} aria-pressed={!received} onClick={() => setReceived(false)}>보낸 선물</button><button disabled={busy} className={received ? "" : "secondary"} aria-pressed={received} onClick={() => setReceived(true)}>받은 선물</button></div><p role="status">{busy ? "선물을 확인하고 있어요." : notice}</p>{!busy && !gifts.length && <p>아직 선물이 없어요.</p>}<ul className="gift-list">{gifts.map(g => <li key={g.giftId} className="gift-card"><h2>{g.product.name}</h2><p>{GIFT_STATUS_LABELS[g.status as keyof typeof GIFT_STATUS_LABELS] || g.status}</p><p>{received ? `${g.senderName}님이 보낸 선물` : g.recipientName ? `${g.recipientName}님에게` : "소중한 사람에게"}</p>{g.giftMessage && <blockquote>{g.giftMessage}</blockquote>}<p className="gift-meta">{g.claimedAt ? `수령일 ${new Date(g.claimedAt).toLocaleDateString("ko-KR")}` : g.purchasedAt ? `구매일 ${new Date(g.purchasedAt).toLocaleDateString("ko-KR")}` : "결제 대기"}</p>{!received && <><GiftSharing gift={g} onChange={v => setGifts(old => old.map(x => x.giftId === v.giftId ? v : x))} />{g.status === "PENDING_PAYMENT" && <a className="gift-button" href={`/gift/complete/?orderId=${encodeURIComponent(g.orderId || "")}`}>결제 상태 확인하기</a>}{["PAID", "CLAIMED", "EXPIRED"].includes(g.status) && <button className="secondary" disabled={busy} onClick={() => void requestRefund(g)}>환불 검토 요청</button>}</>}</li>)}</ul>{cursor && <button disabled={busy} onClick={() => void load(cursor)}>더 보기</button>}{received && <a className="gift-button" href="/points/">현재 이용권 확인하기</a>}</>;
}
