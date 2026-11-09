"use client";

import { useState } from "react";
import { authFetch } from "../_lib/auth-client";
import { trackEvent } from "@/lib/analytics";

type Item = { id: string; productName: string; title: string; status: string; createdAt: string; publicConsent?: boolean; privacyHold?: boolean; reviewReward?: { granted: boolean; amount: number } };
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
      const data = await response.json(); const next = Array.isArray(data.items) ? data.items : []; setItems(next);
      trackEvent("review_reward_status", { surface: "review_history", total_count: next.length, granted_count: next.filter((item: Item) => item.reviewReward?.granted).length });
    } catch (error) { setError((error as Error).message); }
    finally { setLoading(false); }
  }
  async function update(id: string, method: "PATCH" | "DELETE", payload?: Record<string, unknown>) {
    setLoading(true); setError("");
    try {
      const response = await authFetch(`/api/reviews/${id}`, { method, headers: payload ? { "Content-Type": "application/json" } : undefined, body: payload ? JSON.stringify(payload) : undefined });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(data.message || "후기 상태를 바꾸지 못했어요."));
      await load();
    } catch (reason) { setError((reason as Error).message); }
    finally { setLoading(false); }
  }
  return <section className="cd-review-history" aria-label="내 후기 보상 신청 내역">
    <button type="button" className="cd-review-invite__action" disabled={loading} onClick={() => void load()}>{loading ? "신청 내역 확인 중" : "내 신청·지급 내역 확인하기"}</button>
    {error && <p role="alert">{error}</p>}
    {items && <><p>최근 신청 {items.length}건 · 익명 공개 동의는 언제든 철회할 수 있어요.</p><ul>{items.map((item) => <li key={item.id}>
      <div><strong>{item.title || item.productName}</strong><span>{new Date(item.createdAt).toLocaleDateString("ko-KR")}</span></div>
      <p>{item.reviewReward?.granted ? `월정석 ${item.reviewReward.amount.toLocaleString("ko-KR")}개 지급 완료` : LABELS[item.status] || "상태 확인 중"} · {item.publicConsent ? "익명 공개 동의" : "서비스 내 비공개"}{item.privacyHold ? " · 개인정보 보호 확인 필요" : ""}</p>
      <div className="cd-review-history__actions">{item.publicConsent && <button type="button" onClick={() => void update(item.id, "PATCH", { publicConsent: false })}>공개 동의 철회</button>}{item.status !== "hidden" && <button type="button" onClick={() => void update(item.id, "DELETE")}>후기 숨기기</button>}</div>
    </li>)}</ul>{items.length === 0 && <p>아직 신청한 후기가 없어요. 별점 하나만으로도 간단히 남길 수 있어요.</p>}</>}
  </section>;
}
