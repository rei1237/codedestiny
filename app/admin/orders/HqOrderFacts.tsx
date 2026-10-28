"use client";

// 주문 화면 확장(별빛 금고) — 미제공·확인 필요 큐와 주문별 매출 사실(실결제·누적 환불·제공·XP 반영/보류) 배지.
// 🔴 읽기 전용이다. 환불·대조 동작은 기존 page.tsx 코드가 그대로 맡는다. 운영본부 API 가 없거나 실패해도
// 기존 주문 화면은 그대로 동작해야 하므로 배지 조회 실패는 조용히 넘긴다.

import { useEffect, useMemo, useState } from "react";
import { adminFetch, describeAdminError } from "../_lib/admin-api";
import { StatusBadge, Tabs } from "../_hq/components";
import { formatDateTime, formatKRW, formatMoney } from "../_hq/format";
import { readQuery, writeQuery } from "../_hq/useHqResource";
import type { RevenueFact, Tone } from "../_hq/types";

const OBJECT_ID = /^[a-f0-9]{24}$/i;

export type OrderQueueType = "undelivered" | "refund_check" | "held" | "alerts";

const QUEUES: { id: OrderQueueType; label: string }[] = [
  { id: "undelivered", label: "결제 후 미제공" },
  { id: "refund_check", label: "확인할 환불" },
  { id: "held", label: "XP 보류 전체" },
  { id: "alerts", label: "복구 알림 발송됨" },
];

const XP_TONE: Record<RevenueFact["xpState"], Tone> = { counted: "ok", held: "warn", excluded: "muted" };

function deliveryTone(fact: RevenueFact): Tone {
  if (fact.delivery?.state === "delivered") return "ok";
  if (fact.delivery?.state === "pending") return "err";
  return fact.delivery ? "warn" : "muted";
}

/** 목록에 보이는 주문들의 매출 사실을 한 번에 가져온다(최대 100건). */
export function useOrderFacts(ids: string[], enabled: boolean): Record<string, RevenueFact> {
  const [facts, setFacts] = useState<Record<string, RevenueFact>>({});
  const key = useMemo(() => ids.filter((id) => OBJECT_ID.test(id)).slice(0, 100).join(","), [ids]);
  useEffect(() => {
    if (!enabled || !key) return undefined;
    const controller = new AbortController();
    adminFetch<{ facts: Record<string, RevenueFact> }>(`/api/admin/hq/orders/facts?ids=${key}`, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setFacts(result.facts || {}); })
      .catch(() => { /* 배지는 보조 정보 — 실패해도 주문 화면은 그대로 */ });
    return () => controller.abort();
  }, [key, enabled]);
  return facts;
}

/** 목록 행용 짧은 배지. */
export function OrderFactBadges({ fact }: { fact: RevenueFact | undefined }) {
  if (!fact) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {fact.deliveryLabel ? <StatusBadge tone={deliveryTone(fact)} label={fact.deliveryLabel} /> : null}
      {fact.refundedKRW > 0 ? <StatusBadge tone="info" label={`환불 ${formatKRW(fact.refundedKRW)}`} /> : null}
      <StatusBadge tone={XP_TONE[fact.xpState]} label={fact.xpState === "held" && fact.holdLabel ? `XP 보류 · ${fact.holdLabel}` : fact.xpStateLabel} />
    </span>
  );
}

/** 상세 화면용 — 실결제 통화·금액, 누적 성공 환불, 제공 판정, XP 반영 여부. */
export function OrderFactDetail({ fact }: { fact: RevenueFact | undefined }) {
  if (!fact) return null;
  const rows: [string, React.ReactNode][] = [
    ["실결제", fact.amountOriginal != null ? `${formatMoney(fact.amountOriginal, fact.currency)}${fact.currency !== "KRW" && fact.amountKRW != null ? ` (거래 시점 ${formatKRW(fact.amountKRW)})` : ""}` : "수납 확인 안 됨"],
    ["누적 성공 환불", `${formatKRW(fact.refundedKRW)} · ${fact.refundCount}건 (${fact.refundState})`],
    ["환불 차감 결제액", formatKRW(fact.netKRW)],
    ["제공 판정", `${fact.deliveryLabel || "판정 전"}${fact.delivery?.source ? ` · ${fact.delivery.source}` : ""}`],
    ["운영 XP", `${fact.xpStateLabel}${fact.holdLabel ? ` · ${fact.holdLabel}` : ""}${fact.excludeLabel ? ` · ${fact.excludeLabel}` : ""}`],
    ["집계 시각", formatDateTime(fact.updatedAt)],
  ];
  return (
    <div className="rounded-xl border border-slate-800 bg-[#13131f] p-4">
      <h3 className="text-sm font-black">별빛 금고 기록 · 매출 사실</h3>
      <p className="mt-1 text-[11px] text-slate-400">운영본부 집계 기준입니다. 결제 상태 판정·환불은 위의 PortOne 비교와 아래 환불 영역을 따릅니다.</p>
      {fact.fulfillmentAlertCount > 0 ? <p className="mt-2 text-[12px] font-bold text-rose-300">미제공 복구 알림 {fact.fulfillmentAlertCount}회 발송됨</p> : null}
      <dl className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="w-28 shrink-0 text-slate-500">{label}</dt>
            <dd className="min-w-0 break-all text-slate-200">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** ?queue= 로 열리는 확인 큐. 행을 누르면 기존 상세(loadDetail)를 연다. */
export function OrderQueuePanel({ onOpen, selectedId }: { onOpen: (orderId: string) => void; selectedId: string }) {
  const [queue, setQueue] = useState<OrderQueueType | null>(null);
  const [items, setItems] = useState<RevenueFact[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const requested = readQuery().get("queue");
    if (QUEUES.some((item) => item.id === requested)) setQueue(requested as OrderQueueType);
  }, []);

  useEffect(() => {
    if (!queue) return undefined;
    const controller = new AbortController();
    setItems(null);
    setError("");
    adminFetch<{ items: RevenueFact[] }>(`/api/admin/hq/orders/queue?type=${queue}`, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setItems(result.items || []); })
      .catch((caught) => {
        if (controller.signal.aborted || (caught as Error)?.name === "AbortError") return;
        setError(describeAdminError(caught, "확인 큐를 불러오지 못했습니다.").message);
      });
    return () => controller.abort();
  }, [queue]);

  const change = (next: OrderQueueType | null) => {
    setQueue(next);
    writeQuery({ queue: next });
  };

  if (!queue) {
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-4 py-2">
        <span className="text-[11px] text-slate-400">확인 큐</span>
        {QUEUES.map((item) => (
          <button key={item.id} type="button" className="cd-hq-focus min-h-[32px] rounded-lg border border-slate-700 px-2 text-[11px] text-slate-300 hover:border-slate-500" onClick={() => change(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <section className="border-b border-slate-800 p-4" aria-label="확인 큐">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-black">별빛 금고 · 확인 큐</h2>
        <button type="button" className="cd-hq-focus min-h-[32px] rounded-lg px-2 text-[11px] text-slate-400 underline" onClick={() => change(null)}>닫기</button>
      </div>
      <div className="mt-2 overflow-x-auto">
        <Tabs<OrderQueueType> label="확인 큐 종류" value={queue} onChange={change} items={QUEUES} />
      </div>
      <div role="tabpanel" className="mt-2">
        {error ? <p className="py-3 text-center text-xs text-rose-300">{error}</p> : null}
        {!error && !items ? <p className="py-3 text-center text-xs text-slate-500">불러오는 중...</p> : null}
        {items && !items.length ? <p className="py-3 text-center text-xs text-slate-500">확인할 주문이 없습니다.</p> : null}
        {items?.length ? (
          <ul className="max-h-[320px] space-y-1.5 overflow-y-auto">
            {items.map((fact) => (
              <li key={fact.id}>
                <button
                  type="button"
                  onClick={() => onOpen(fact.id)}
                  className={`w-full rounded-xl border p-2.5 text-left ${selectedId === fact.id ? "border-violet-500 bg-[#171528]" : "border-slate-800 bg-[#13131f] hover:border-slate-600"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black">{fact.amountOriginal != null ? formatMoney(fact.amountOriginal, fact.currency) : "-"}</span>
                    <span className="text-[11px] text-slate-500">{formatDateTime(fact.paidAt)}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-slate-400">{fact.featureKey || fact.productId || "-"} · {fact.merchantUid}</span>
                  <OrderFactBadges fact={fact} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {items && items.length >= 100 ? <p className="mt-1 text-[11px] text-slate-500">최근 100건만 보여 줍니다.</p> : null}
      </div>
    </section>
  );
}
