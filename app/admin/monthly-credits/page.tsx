"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, describeAdminError } from "../_lib/admin-api";

const MAX_GRANT_AMOUNT = 999999;

type MonthlyCreditGrant = {
  userId: string;
  email: string;
  amount: number;
  reason: string;
  sourceId: string;
  campaignId: string;
  balanceAfter: number;
  expiresAt: string | null;
  ledgerId: string;
};

type GrantResponse = {
  ok: true;
  idempotent: boolean;
  grant: MonthlyCreditGrant;
};

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20";

function createIdempotencyKey() {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return `admin-marketing-${Date.now()}-${suffix}`;
}

function formatAmount(value: number) {
  return `${Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("ko-KR")}개`;
}

function formatDate(value: string | null) {
  if (!value) return "확인 필요";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "확인 필요";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function AdminMonthlyCreditsPage() {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("마케팅 캠페인 예외 지급");
  const [campaignId, setCampaignId] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<GrantResponse | null>(null);

  async function submitGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setResult(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedReason = reason.trim();
    const parsedAmount = Number(amount);
    if (!normalizedEmail) {
      setError("지급 대상 이메일을 입력해 주세요.");
      return;
    }
    if (!normalizedReason) {
      setError("지급 사유를 입력해 주세요.");
      return;
    }
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount < 1 || parsedAmount > MAX_GRANT_AMOUNT) {
      setError(`지급 수량은 1개부터 ${MAX_GRANT_AMOUNT.toLocaleString("ko-KR")}개까지 입력할 수 있습니다.`);
      return;
    }
    if (!confirmed) {
      setError("대상 계정과 지급 수량을 확인한 뒤 확인란을 선택해 주세요.");
      return;
    }

    const requestKey = idempotencyKey || createIdempotencyKey();
    setIdempotencyKey(requestKey);
    setSubmitting(true);
    try {
      const data = await adminFetch<GrantResponse>("/api/admin/monthly-credits/grant", {
        method: "POST",
        body: {
          email: normalizedEmail,
          amount: parsedAmount,
          reason: normalizedReason,
          campaignId: campaignId.trim(),
          idempotencyKey: requestKey,
        },
      });
      // 🔴 data.grant 가드: 아래 결과 카드가 grant.email / grant.amount 를 바로 읽는다. grant 없는 2xx
      // 본문(멱등 응답 등)이 오면 그 자리에서 터져 지급 화면이 통째로 화이트스크린이 된다.
      if (!data?.grant) {
        setError("지급 응답을 확인하지 못했습니다. 원장에서 처리 결과를 확인해 주세요.");
      } else {
        setResult(data);
        setNotice(data.idempotent ? "동일 요청이 이미 처리되어 기존 지급 결과를 표시했습니다." : "월정석 지급이 완료되었습니다.");
        setConfirmed(false);
      }
    } catch (caught) {
      setError(describeAdminError(caught, "지급 요청 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.").message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0f18] text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.16em] text-violet-300">운영 도구</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-50 sm:text-3xl">마케팅 월정석 지급</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              특정 계정에 월정석을 예외 지급합니다. 지급분은 새 30일 lot으로 기록되며, 기존 잔액과 별도로 만료일이 관리됩니다.
            </p>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <section className="rounded-2xl border border-slate-800 bg-[#11131e] p-5 sm:p-6" aria-labelledby="grant-form-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="grant-form-title" className="text-lg font-bold text-slate-50">지급 정보</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">관리자 인증과 운영 플래그를 통과한 요청만 서버에서 처리됩니다.</p>
              </div>
              <span className="rounded-full border border-emerald-700 bg-emerald-950 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">30일 만료</span>
            </div>

            <form className="mt-6 space-y-5" onSubmit={submitGrant}>
              <div>
                <label htmlFor="grant-email" className="text-sm font-semibold text-slate-200">지급 대상 이메일</label>
                <input
                  id="grant-email"
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setIdempotencyKey(""); }}
                  placeholder="customer@example.com"
                  className={`${inputClass} mt-2`}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="grant-amount" className="text-sm font-semibold text-slate-200">지급 수량</label>
                  <div className="relative mt-2">
                    <input
                      id="grant-amount"
                      type="number"
                      required
                      min={1}
                      max={MAX_GRANT_AMOUNT}
                      step={1}
                      inputMode="numeric"
                      value={amount}
                      placeholder="원하는 수량 입력"
                      onChange={(event) => { setAmount(event.target.value); setIdempotencyKey(""); }}
                      className={`${inputClass} pr-10`}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">개</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">최대 {MAX_GRANT_AMOUNT.toLocaleString("ko-KR")}개</p>
                </div>

                <div>
                  <label htmlFor="grant-campaign" className="text-sm font-semibold text-slate-200">캠페인 ID <span className="font-normal text-slate-500">(선택)</span></label>
                  <input
                    id="grant-campaign"
                    value={campaignId}
                    onChange={(event) => setCampaignId(event.target.value)}
                    placeholder="예: summer-2026"
                    className={`${inputClass} mt-2`}
                  />
                  <p className="mt-1.5 text-xs text-slate-500">운영 기록과 함께 저장됩니다.</p>
                </div>
              </div>

              <div>
                <label htmlFor="grant-reason" className="text-sm font-semibold text-slate-200">지급 사유</label>
                <textarea
                  id="grant-reason"
                  required
                  maxLength={120}
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className={`${inputClass} mt-2 resize-y`}
                />
                <p className="mt-1.5 text-xs text-slate-500">최대 120자 · 관리자 원장에 기록됩니다.</p>
              </div>

              <div className="rounded-xl border border-amber-800/80 bg-amber-950/40 p-4">
                <p className="text-sm font-semibold text-amber-100">지급 전 확인</p>
                <p className="mt-1 text-xs leading-5 text-amber-200/80">입력한 계정과 수량을 확인해 주세요. 이 지급분은 생성 시점부터 30일 후 만료됩니다.</p>
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-amber-50">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-950 accent-violet-500"
                  />
                  <span>대상 계정과 지급 수량을 확인했습니다.</span>
                </label>
              </div>

              {error ? <p role="alert" className="rounded-lg border border-rose-800 bg-rose-950/60 px-3 py-2.5 text-sm text-rose-200">{error}</p> : null}
              {notice ? <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2.5 text-sm text-emerald-200">{notice}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2 focus:ring-offset-[#11131e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "지급 처리 중…" : "월정석 지급하기"}
              </button>
            </form>
          </section>

          <aside className="space-y-6" aria-label="월정석 지급 안내">
            <section className="rounded-2xl border border-slate-800 bg-[#11131e] p-5 sm:p-6">
              <h2 className="text-base font-bold text-slate-50">지급 규칙</h2>
              <dl className="mt-4 divide-y divide-slate-800 text-sm">
                <div className="flex items-start justify-between gap-4 py-3 first:pt-0"><dt className="text-slate-500">지급 단위</dt><dd className="text-right font-semibold text-slate-200">월정석</dd></div>
                <div className="flex items-start justify-between gap-4 py-3"><dt className="text-slate-500">수량 상한</dt><dd className="text-right font-semibold text-slate-200">{MAX_GRANT_AMOUNT.toLocaleString("ko-KR")}개</dd></div>
                <div className="flex items-start justify-between gap-4 py-3"><dt className="text-slate-500">만료</dt><dd className="text-right font-semibold text-emerald-300">지급 후 30일</dd></div>
                <div className="flex items-start justify-between gap-4 py-3 last:pb-0"><dt className="text-slate-500">중복 요청</dt><dd className="text-right font-semibold text-slate-200">멱등 처리</dd></div>
              </dl>
              <p className="mt-5 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-xs leading-5 text-slate-400">동일한 요청을 다시 보내도 같은 idempotency key라면 중복 지급되지 않습니다.</p>
            </section>

            {result ? (
              <section className="rounded-2xl border border-emerald-800/80 bg-[#101b1b] p-5 sm:p-6" aria-labelledby="grant-result-title">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="grant-result-title" className="text-base font-bold text-emerald-100">지급 결과</h2>
                  <span className="rounded-full border border-emerald-700 px-2 py-1 text-[11px] font-semibold text-emerald-300">{result.idempotent ? "기존 처리" : "신규 처리"}</span>
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div><dt className="text-xs text-slate-500">대상</dt><dd className="mt-1 break-all text-slate-100">{result.grant.email}</dd></div>
                  <div><dt className="text-xs text-slate-500">이번 지급</dt><dd className="mt-1 font-bold text-emerald-200">{formatAmount(result.grant.amount)}</dd></div>
                  <div><dt className="text-xs text-slate-500">지급 후 잔액</dt><dd className="mt-1 text-slate-100">{formatAmount(result.grant.balanceAfter)}</dd></div>
                  <div><dt className="text-xs text-slate-500">만료 시각</dt><dd className="mt-1 text-slate-100">{formatDate(result.grant.expiresAt)}</dd></div>
                </dl>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
