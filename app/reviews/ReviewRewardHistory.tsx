"use client";

import { useRef, useState } from "react";
import { authFetch } from "../_lib/auth-client";
import { trackEvent } from "@/lib/analytics";

type Item = { id: string; productName: string; title: string; body?: string; rating?: number; quickTags?: string[]; status: string; createdAt: string; publicConsent?: boolean; privacyHold?: boolean; reviewReward?: { granted: boolean; amount: number } };
const LABELS: Record<string, string> = { pending: "관리자 검토 중", approved: "승인 완료 · 지급 확인 중", rejected: "반려 · 지급 없음", hidden: "비공개" };

export default function ReviewRewardHistory() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const [notice, setNotice] = useState("");
  const [confirmId, setConfirmId] = useState("");
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
    if (lock.current) return;
    lock.current = true;
    setLoading(true); setError(""); setNotice("");
    try {
      const response = await authFetch(`/api/reviews/${id}`, { method, headers: payload ? { "Content-Type": "application/json" } : undefined, body: payload ? JSON.stringify(payload) : undefined });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(data.message || "후기 상태를 바꾸지 못했어요."));
      setConfirmId("");
      setNotice(data.privacyHold ? "개인정보 보호 확인이 필요해 공개 동의를 보류했어요." : payload?.publicConsent === true && data.item?.publicConsent === true ? "익명 공개 동의를 저장했어요. 관리자 검토 상태를 확인해 주세요." : "후기 상태를 저장했어요.");
      await load();
    } catch (reason) { setError((reason as Error).message); }
    finally { lock.current = false; setLoading(false); }
  }
  return <section id="my-reviews" className="cd-review-history" aria-label="내 후기와 보상 내역">
    <button type="button" className="cd-review-invite__action" disabled={loading} onClick={() => void load()}>{loading ? "신청 내역 확인 중" : "내 후기 · 공개 상태와 보상 확인하기"}</button>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {items && <><p>최근 신청 {items.length}건 · 익명 공개 동의는 언제든 철회할 수 있어요.</p><ul>{items.map((item) => <li key={item.id}>
      <div><strong>{item.title || item.productName}</strong><span>{new Date(item.createdAt).toLocaleDateString("ko-KR")}</span></div>
      <p>{item.reviewReward?.granted ? `월정석 ${item.reviewReward.amount.toLocaleString("ko-KR")}개 지급 완료` : LABELS[item.status] || "상태 확인 중"} · {item.privacyHold ? "비공개 · 보호 확인 중" : !item.publicConsent ? "서비스 내 비공개" : item.status === "approved" ? "익명 공개 중" : item.status === "pending" ? "익명 공개 검토 대기" : "공개되지 않음"}{item.privacyHold ? " · 개인정보 보호 확인 필요" : ""}</p>
      <div className="cd-review-history__actions">{!item.publicConsent && !item.privacyHold && item.status !== "hidden" && item.status !== "rejected" && <button type="button" disabled={loading} onClick={() => setConfirmId(item.id)}>익명 공개 동의하기</button>}{item.publicConsent && <button type="button" disabled={loading} onClick={() => void update(item.id, "PATCH", { publicConsent: false })}>공개 동의 철회</button>}{item.status !== "hidden" && <button type="button" disabled={loading} onClick={() => void update(item.id, "DELETE")}>후기 숨기기</button>}</div>
      {confirmId === item.id && <div className="cd-review-history__confirm"><div className="cd-review-letter-preview" aria-label="공개 예정 후기 미리보기"><strong>익명의 운세손님</strong><p>별점 {item.rating ?? "확인 필요"}점</p>{item.title && <p>{item.title}</p>}{item.body && <p>{item.body}</p>}{item.quickTags?.length ? <p>{item.quickTags.join(" · ")}</p> : null}</div><p>작성한 별점·태그·제목·본문이 ‘익명의 운세손님’으로 공개될 수 있어요. 글 속 개인정보가 없는지 확인해 주세요. 관리자 승인 상태에 따라 공개되며, 동의는 언제든 철회할 수 있어요.</p><button type="button" disabled={loading} onClick={() => void update(item.id, "PATCH", { publicConsent: true })}>확인하고 공개 동의하기</button><button type="button" disabled={loading} onClick={() => setConfirmId("")}>취소</button></div>}
    </li>)}</ul>{items.length === 0 && <p>아직 신청한 후기가 없어요. 별점 하나만으로도 간단히 남길 수 있어요.</p>}</>}
  </section>;
}
