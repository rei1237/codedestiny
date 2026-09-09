"use client";
import { useState } from "react";
import { adminFetch, describeAdminError } from "../_lib/admin-api";
import { ADMIN_INPUT, adminButton } from "../_components/ui";
type Row = { giftId: string; orderId: string; paymentId?: string; purchaserUserId: string; recipientUserId?: string; status: string; productId: string; purchasedAt?: string; claimedAt?: string; reviewRequired?: boolean };
export default function GiftOrders() {
  const [q, setQ] = useState(""); const [rows, setRows] = useState<Row[]>([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [cursor, setCursor] = useState("");
  const load = async (next = "") => {
    setBusy(true); setError("");
    try { const d = await adminFetch<{ items: Row[]; nextCursor: string }>(`/api/admin/orders/gifts?q=${encodeURIComponent(q)}&cursor=${encodeURIComponent(next)}`); setRows(old => next ? [...old, ...d.items] : d.items); setCursor(d.nextCursor || ""); }
    catch (e) { setError(describeAdminError(e, "선물 조회에 실패했습니다.").message); } finally { setBusy(false); }
  };
  return <details className="mb-6 rounded-xl border border-slate-600 p-4"><summary className="cursor-pointer py-2 font-bold">선물 주문 추적</summary><form className="my-3 flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); void load(); }}><label className="flex-1">선물·주문·결제 ID, 계정 ID, 상품 ID 또는 상태<input className={ADMIN_INPUT} value={q} onChange={e => setQ(e.target.value)} maxLength={160} /></label><button className={adminButton("primary")} disabled={busy}>조회</button></form>{error && <p role="alert">{error}</p>}<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>선물 / 주문</th><th>보낸 계정 / 받은 계정</th><th>상품 / 상태</th><th>구매 / 수령</th></tr></thead><tbody>{rows.map(r => <tr key={r.giftId}><td className="p-2">{r.giftId}<br />{r.orderId}<br />{r.paymentId}</td><td>{r.purchaserUserId}<br />{r.recipientUserId || "미수령"}</td><td>{r.productId}<br />{r.status}{r.reviewRequired && " · 운영 확인"}</td><td>{r.purchasedAt && new Date(r.purchasedAt).toLocaleString("ko-KR")}<br />{r.claimedAt && new Date(r.claimedAt).toLocaleString("ko-KR")}</td></tr>)}</tbody></table></div>{cursor && <button className={adminButton("neutral")} disabled={busy} onClick={() => void load(cursor)}>더 보기</button>}</details>;
}
