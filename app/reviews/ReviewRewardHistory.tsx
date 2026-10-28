"use client";

import { useState } from "react";
import { authFetch } from "../_lib/auth-client";

type Item = { id: string; productName: string; title: string; status: string; createdAt: string; reviewReward?: { granted: boolean; amount: number } };
const LABELS: Record<string, string> = { pending: "관리자 검토 중", approved: "승인 완료 · 지급 확인 중", rejected: "반려 · 지급 없음", hidden: "비공개" };

export default function ReviewRewardHistory() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true); setError("");
    try {
      const response = await authFetch("/api/reviews/mine", { method: "GET" });
      if (!response.ok) throw new Error(response.status === 401 ? "로그인 후 신청 내역을 확인할 수 있어요." : "신청 내역을 불러오지 못했어요. 다시 확인해 주세요.");
      const data = await response.json(); setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) { setError((error as Error).message); }
    finally { setLoading(false); }
  }
  return <section className="cd-review-history" aria-label="내 후기 보상 신청 내역">
    <button type="button" className="cd-review-invite__action" disabled={loading} onClick={() => void load()}>{loading ? "신청 내역 확인 중" : "내 신청·지급 내역 확인하기"}</button>
    {error && <p role="alert">{error}</p>}
    {items && <><p>최근 신청 {items.length}건 · 새 후기는 횟수 제한 없이 신청할 수 있어요.</p><ul>{items.map((item) => <li key={item.id}>
      <div><strong>{item.title || item.productName}</strong><span>{new Date(item.createdAt).toLocaleDateString("ko-KR")}</span></div>
      <p>{item.reviewReward?.granted ? `월정석 ${item.reviewReward.amount.toLocaleString("ko-KR")}개 지급 완료` : LABELS[item.status] || "상태 확인 중"}</p>
    </li>)}</ul>{items.length === 0 && <p>아직 신청한 후기가 없어요. 후기를 작성하고 관리자 검토를 요청해 주세요.</p>}</>}
  </section>;
}
