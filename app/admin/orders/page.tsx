"use client";

// 관리자 주문 조회·환불 화면.
// 인증/fetch 는 기존 관리자 헬퍼(adminFetch)를 그대로 쓴다 — 토큰 로직을 다시 복제하지 않는다.
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminApiError, adminFetch } from "../_lib/admin-api";

type AdminOrder = {
  id: string;
  userId: string;
  impUid: string;
  merchantUid: string;
  paymentAmount: number;
  chargedPoints?: number;
  featureKey: string;
  productId: string;
  paymentType: string;
  accessType: string;
  status: string;
  orderState: string;
  source?: string;
  paymentMethod?: string;
  confirmAttempts?: number;
  failureCode?: string;
  failureMessage?: string;
  failureStage?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  paidAt?: string | null;
  pricingSnapshot?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

type ListResponse = {
  items: AdminOrder[];
  counts: { status: string; count: number; amount: number }[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

type DetailResponse = {
  order: AdminOrder;
  portOne: { status: string; amount: number; currency: string; paidAt: string | null; payMethod: string; receiptUrl: string } | null;
  portOneError: string;
  buyer: { id: string; email: string; name: string; points: number; passTier: string; passExpiresAt: string | null } | null;
  webhookEvents: { eventId: string; eventType: string; status: string; attempts: number; receivedAt?: string; lastError?: string }[];
  failureLogs: { source: string; stage: string; code: string; message: string; status: number; createdAt?: string }[];
  entitlements: { serviceKey: string; contentKey: string; status: string; source: string; createdAt?: string }[];
};

type RefundResponse = {
  orderState: string;
  unlockRevoked: boolean;
  adminReviewRequired: boolean;
  revocation: Record<string, unknown> | null;
};

const STATUS_TONE: Record<string, string> = {
  success: "border-emerald-700 bg-emerald-950 text-emerald-200",
  fulfilled: "border-emerald-700 bg-emerald-950 text-emerald-200",
  paid: "border-sky-700 bg-sky-950 text-sky-200",
  processing: "border-indigo-700 bg-indigo-950 text-indigo-200",
  pending: "border-amber-700 bg-amber-950 text-amber-200",
  retryable: "border-orange-700 bg-orange-950 text-orange-200",
  failed: "border-rose-700 bg-rose-950 text-rose-200",
  cancelled: "border-slate-700 bg-slate-900 text-slate-300",
  refunded: "border-cyan-700 bg-cyan-950 text-cyan-200",
};

function statusBadgeClass(status: string) {
  return `rounded-lg border px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[status] || "border-slate-700 bg-slate-900 text-slate-300"}`;
}

function buttonClass(tone: "primary" | "ghost" | "danger" = "ghost") {
  const base = "inline-flex min-h-9 items-center justify-center rounded-lg px-3 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  if (tone === "primary") return `${base} bg-violet-600 text-white hover:bg-violet-500`;
  if (tone === "danger") return `${base} bg-rose-700 text-white hover:bg-rose-600`;
  return `${base} border border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500`;
}

const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500";

function formatWon(value: number) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("ko-KR");
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 break-all text-slate-200">{value}</span>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [page, setPage] = useState(1);

  const [list, setList] = useState<ListResponse | null>(null);
  const [listError, setListError] = useState("");
  const [listLoading, setListLoading] = useState(false);

  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [notice, setNotice] = useState("");

  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState("");

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (email.trim()) params.set("email", email.trim());
      if (status) params.set("status", status);
      if (paymentType) params.set("paymentType", paymentType);
      params.set("page", String(page));
      const data = await adminFetch<ListResponse>(`/api/admin/orders?${params.toString()}`);
      setList(data);
    } catch (error) {
      setListError(error instanceof AdminApiError ? error.message : "주문 목록을 불러오지 못했습니다.");
    } finally {
      setListLoading(false);
    }
  }, [query, email, status, paymentType, page]);

  useEffect(() => { void loadList(); }, [loadList]);

  const loadDetail = useCallback(async (orderId: string) => {
    setSelectedId(orderId);
    setDetail(null);
    setDetailError("");
    setNotice("");
    setRefundReason("");
    setRefundAmount("");
    setConfirmText("");
    setDetailLoading(true);
    try {
      const data = await adminFetch<DetailResponse>(`/api/admin/orders/${orderId}`);
      setDetail(data);
    } catch (error) {
      setDetailError(error instanceof AdminApiError ? error.message : "주문 상세를 불러오지 못했습니다.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const runReconcile = useCallback(async () => {
    setReconciling(true);
    setReconcileResult("");
    try {
      const data = await adminFetch<{ result: Record<string, number | string | boolean> }>("/api/admin/orders/reconcile", { method: "POST", body: {} });
      const r = data.result || {};
      setReconcileResult(`검사 ${r.scanned ?? 0}건 · 정산 ${r.settled ?? 0} · 취소동기화 ${r.syncedCancelled ?? 0} · 실패동기화 ${r.syncedFailed ?? 0} · 만료 ${r.expired ?? 0} · 미변경 ${r.untouched ?? 0}`);
      await loadList();
    } catch (error) {
      setReconcileResult(error instanceof AdminApiError ? error.message : "대조 실행에 실패했습니다.");
    } finally {
      setReconciling(false);
    }
  }, [loadList]);

  const order = detail?.order || null;
  // 🔴 환불은 되돌릴 수 없다. 주문번호를 그대로 입력해야만 버튼이 열린다.
  const confirmOk = Boolean(order && confirmText.trim() === order.merchantUid);
  const canRefund = Boolean(order && refundReason.trim() && confirmOk && !refunding);

  const mismatch = useMemo(() => {
    if (!detail?.portOne || !order) return "";
    const pg = String(detail.portOne.status || "").toLowerCase();
    const ours = String(order.status || "").toLowerCase();
    if (pg === "paid" && !["success", "fulfilled"].includes(ours)) return "PortOne 은 결제완료인데 우리 주문은 미정산 상태입니다.";
    if (pg === "cancelled" && !["cancelled", "refunded"].includes(ours)) return "PortOne 은 취소인데 우리 주문은 취소 상태가 아닙니다.";
    if (pg === "failed" && ours !== "failed") return "PortOne 은 실패인데 우리 주문은 실패 상태가 아닙니다.";
    return "";
  }, [detail, order]);

  const submitRefund = useCallback(async () => {
    if (!order || !canRefund) return;
    setRefunding(true);
    setNotice("");
    try {
      const amount = refundAmount.trim() ? Number(refundAmount.trim()) : undefined;
      const body: Record<string, unknown> = { reason: refundReason.trim() };
      if (amount && amount > 0 && amount < order.paymentAmount) {
        body.amount = amount;
        body.currentCancellableAmount = order.paymentAmount;
      }
      const data = await adminFetch<RefundResponse>(`/api/admin/orders/${order.id}/refund`, { method: "POST", body });
      setNotice(
        `환불 완료 — 상태 ${data.orderState} / 권한회수 ${data.unlockRevoked ? "됨" : "안 됨"}`
        + (data.adminReviewRequired ? " · ⚠️ 관리자 검토 필요(자동 회수가 완전하지 않음)" : ""),
      );
      await loadDetail(order.id);
      await loadList();
    } catch (error) {
      setNotice(error instanceof AdminApiError ? `환불 실패 — ${error.message}` : "환불에 실패했습니다.");
    } finally {
      setRefunding(false);
    }
  }, [order, canRefund, refundAmount, refundReason, loadDetail, loadList]);

  return (
    <main className="min-h-screen bg-[#0d0f18] text-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[420px_1fr]">
        <aside className="border-b border-slate-800 bg-[#10121b] lg:border-b-0 lg:border-r">
          <div className="sticky top-0 z-20 border-b border-slate-800 bg-[#10121b]/95 px-4 py-3 backdrop-blur">
            <h1 className="text-base font-black">주문 조회 · 환불</h1>
            <div className="mt-2 flex items-center gap-2">
              <button type="button" className={buttonClass("primary")} onClick={() => void runReconcile()} disabled={reconciling}>
                {reconciling ? "대조 중..." : "지금 대조 실행"}
              </button>
              <button type="button" className={buttonClass()} onClick={() => void loadList()} disabled={listLoading}>새로고침</button>
            </div>
            {reconcileResult && <p className="mt-2 text-[11px] font-semibold text-slate-400">{reconcileResult}</p>}
          </div>

          <div className="space-y-2 border-b border-slate-800 p-4">
            <input className={inputClass} placeholder="주문번호 / 결제ID / 기능키" value={query}
              onChange={(e) => { setPage(1); setQuery(e.target.value); }} />
            <input className={inputClass} placeholder="구매자 이메일 (정확히 일치)" value={email}
              onChange={(e) => { setPage(1); setEmail(e.target.value); }} />
            <div className="flex gap-2">
              <select className={inputClass} value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
                <option value="">전체 상태</option>
                {["pending", "processing", "success", "fulfilled", "failed", "cancelled", "refunded", "retryable", "paid"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select className={inputClass} value={paymentType} onChange={(e) => { setPage(1); setPaymentType(e.target.value); }}>
                <option value="">전체 유형</option>
                {["digital_content", "membership_pass", "point_charge", "subscription_initial", "subscription_recurring"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {list?.counts?.length ? (
            <div className="flex flex-wrap gap-1 border-b border-slate-800 px-4 py-2">
              {list.counts.map((c) => (
                <span key={c.status} className={statusBadgeClass(c.status)}>{c.status || "-"} {c.count}</span>
              ))}
            </div>
          ) : null}

          <div className="p-3">
            {listLoading && <p className="px-1 py-6 text-center text-xs text-slate-500">불러오는 중...</p>}
            {listError && <p className="px-1 py-6 text-center text-xs text-rose-300">{listError}</p>}
            {!listLoading && !listError && !list?.items?.length && (
              <p className="px-1 py-6 text-center text-xs text-slate-500">조건에 맞는 주문이 없습니다.</p>
            )}
            <ul className="space-y-2">
              {list?.items?.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => void loadDetail(item.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedId === item.id ? "border-violet-500 bg-[#171528]" : "border-slate-800 bg-[#13131f] hover:border-slate-600"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black">{formatWon(item.paymentAmount)}</span>
                      <span className={statusBadgeClass(item.status)}>{item.status}</span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-slate-400">{item.featureKey || item.productId || item.paymentType}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{item.merchantUid}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{formatDate(item.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>

            {list && list.pagination.totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between gap-2">
                <button type="button" className={buttonClass()} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>이전</button>
                <span className="text-[11px] text-slate-500">{list.pagination.page} / {list.pagination.totalPages} · 총 {list.pagination.total}건</span>
                <button type="button" className={buttonClass()} disabled={page >= list.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>다음</button>
              </div>
            )}
          </div>
        </aside>

        <section className="p-4 lg:p-6">
          {!selectedId && <p className="mt-20 text-center text-sm text-slate-500">왼쪽에서 주문을 선택하세요.</p>}
          {detailLoading && <p className="mt-20 text-center text-sm text-slate-500">불러오는 중...</p>}
          {detailError && <p className="mt-20 text-center text-sm text-rose-300">{detailError}</p>}

          {order && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-[#13131f] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-black">{formatWon(order.paymentAmount)}</h2>
                  <span className={statusBadgeClass(order.status)}>{order.status} / {order.orderState || "-"}</span>
                </div>
                <div className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
                  <Row label="주문번호" value={order.merchantUid} />
                  <Row label="결제ID" value={order.impUid || "-"} />
                  <Row label="유형" value={`${order.paymentType} / ${order.accessType || "-"}`} />
                  <Row label="기능키" value={order.featureKey || order.productId || "-"} />
                  <Row label="주문시각" value={formatDate(order.createdAt)} />
                  <Row label="결제시각" value={formatDate(order.paidAt)} />
                  <Row label="최근변경" value={formatDate(order.updatedAt)} />
                  <Row label="confirm 시도" value={String(order.confirmAttempts ?? 0)} />
                  {order.failureCode ? <Row label="실패코드" value={`${order.failureCode} @ ${order.failureStage || "-"}`} /> : null}
                  {detail?.buyer ? <Row label="구매자" value={`${detail.buyer.email || detail.buyer.name || detail.buyer.id}`} /> : null}
                  {detail?.buyer ? <Row label="이용권" value={`${detail.buyer.passTier || "free"} (${formatDate(detail.buyer.passExpiresAt)})`} /> : null}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#13131f] p-4">
                <h3 className="text-sm font-black">우리 DB vs PortOne 실시간</h3>
                {mismatch && <p className="mt-2 rounded-lg border border-amber-700 bg-amber-950 px-3 py-2 text-xs font-bold text-amber-200">⚠️ {mismatch}</p>}
                <div className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
                  <Row label="우리 상태" value={`${order.status} / ${order.orderState || "-"}`} />
                  <Row label="PortOne 상태" value={detail?.portOne?.status || (detail?.portOneError ? `조회 실패: ${detail.portOneError}` : "-")} />
                  <Row label="우리 금액" value={formatWon(order.paymentAmount)} />
                  <Row label="PortOne 금액" value={detail?.portOne ? formatWon(detail.portOne.amount) : "-"} />
                  {detail?.portOne?.receiptUrl ? (
                    <Row label="영수증" value={<a className="text-violet-300 underline" href={detail.portOne.receiptUrl} target="_blank" rel="noreferrer">열기</a>} />
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-[#13131f] p-4">
                  <h3 className="text-sm font-black">웹훅 이벤트</h3>
                  {!detail?.webhookEvents?.length && <p className="mt-2 text-xs text-slate-500">기록 없음</p>}
                  <ul className="mt-2 space-y-1 text-[11px]">
                    {detail?.webhookEvents?.map((w) => (
                      <li key={w.eventId} className="rounded-lg border border-slate-800 px-2 py-1">
                        <span className="font-bold text-slate-200">{w.eventType}</span>
                        <span className="ml-2 text-slate-400">{w.status} · {w.attempts}회 · {formatDate(w.receivedAt)}</span>
                        {w.lastError && <p className="mt-0.5 break-all text-rose-300">{w.lastError}</p>}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#13131f] p-4">
                  <h3 className="text-sm font-black">잠금 해제(엔타이틀먼트)</h3>
                  {!detail?.entitlements?.length && <p className="mt-2 text-xs text-slate-500">없음</p>}
                  <ul className="mt-2 space-y-1 text-[11px]">
                    {detail?.entitlements?.map((e, i) => (
                      <li key={`${e.serviceKey}-${e.contentKey}-${i}`} className="rounded-lg border border-slate-800 px-2 py-1">
                        <span className="text-slate-200">{e.serviceKey} / {e.contentKey}</span>
                        <span className="ml-2 text-slate-400">{e.status} · {e.source}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {detail?.failureLogs?.length ? (
                <div className="rounded-xl border border-slate-800 bg-[#13131f] p-4">
                  <h3 className="text-sm font-black">실패 로그</h3>
                  <ul className="mt-2 space-y-1 text-[11px]">
                    {detail.failureLogs.map((f, i) => (
                      <li key={`${f.code}-${i}`} className="rounded-lg border border-slate-800 px-2 py-1">
                        <span className="font-bold text-rose-300">{f.code}</span>
                        <span className="ml-2 text-slate-400">{f.stage} · HTTP {f.status} · {formatDate(f.createdAt)}</span>
                        {f.message && <p className="mt-0.5 break-all text-slate-300">{f.message}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="rounded-xl border border-rose-900 bg-[#1a1220] p-4">
                <h3 className="text-sm font-black text-rose-200">환불</h3>
                <p className="mt-1 text-[11px] text-slate-400">
                  실행하면 PortOne 결제 취소와 권한 회수가 함께 수행됩니다. 되돌릴 수 없습니다.
                </p>
                <div className="mt-3 space-y-2">
                  <input className={inputClass} placeholder="환불 사유 (필수)" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
                  <input className={inputClass} placeholder={`부분 환불 금액 (비우면 전액 ${formatWon(order.paymentAmount)})`} value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" />
                  <input className={inputClass} placeholder={`확인을 위해 주문번호 입력: ${order.merchantUid}`} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
                  <button type="button" className={buttonClass("danger")} disabled={!canRefund} onClick={() => void submitRefund()}>
                    {refunding ? "환불 처리 중..." : "환불 실행"}
                  </button>
                </div>
                {notice && <p className="mt-3 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200">{notice}</p>}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
