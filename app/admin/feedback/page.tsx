"use client";

import Image from "next/image";
import { Check, Gift, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminFetch,
  adminFetchResponse,
  describeAdminError,
  type AdminErrorView,
} from "../_lib/admin-api";
import AdminErrorState from "../_components/AdminErrorState";
import { ADMIN_INPUT, ADMIN_TOOLBAR, adminButton, adminChip } from "../_components/ui";

type FeedbackStatus = "new" | "in_progress" | "resolved" | "on_hold" | "rejected";
type TabValue = FeedbackStatus | "all";

interface FeedbackDetailEntry { key: string; label: string; value: string; }
interface FeedbackAttachment { key: string; url: string; mimeType: string; size: number; }
interface FeedbackBugReward { granted: boolean; amount: number; grantedAt: string | null; grantedBy: string; }

interface AdminFeedbackItem {
  id: string;
  ticketNo: string;
  authorName: string;
  authorEmail: string;
  category: string;
  categoryLabel: string;
  title: string;
  content: string;
  url: string;
  status: FeedbackStatus;
  statusLabel: string;
  details: FeedbackDetailEntry[];
  attachments: FeedbackAttachment[];
  autoFlagReasons: string[];
  adminNote: string;
  bugReward: FeedbackBugReward;
  createdAt: string;
}

interface ListResponse {
  items: AdminFeedbackItem[];
  counts: Record<FeedbackStatus, number>;
}

interface RewardResponse {
  idempotent: boolean;
}

const REWARD_AMOUNT = 300;

const STATUS_TABS: Array<{ value: TabValue; label: string }> = [
  { value: "new", label: "미확인" },
  { value: "in_progress", label: "확인 중" },
  { value: "resolved", label: "수정 완료" },
  { value: "on_hold", label: "보류" },
  { value: "rejected", label: "반려" },
  { value: "all", label: "전체" },
];

// 톤·크기·포커스는 app/admin/_components/ui.ts 와 styles/admin-yehwa.css 한 곳에서 정한다.
// 함수 이름을 그대로 두어 호출부는 건드리지 않는다.
function commandButtonClass(tone: "neutral" | "success" | "danger" | "gift" = "neutral"): string {
  return adminButton(tone);
}

function statusBadgeClass(status: string): string {
  if (status === "resolved") return "border-emerald-700 bg-emerald-950 text-emerald-200";
  if (status === "in_progress") return "border-sky-700 bg-sky-950 text-sky-200";
  if (status === "on_hold") return "border-amber-700 bg-amber-950 text-amber-200";
  if (status === "rejected") return "border-rose-700 bg-rose-950 text-rose-200";
  return "border-slate-700 bg-slate-900 text-slate-400";
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
}

// 첨부 열람 API는 flower-admin-token 헤더 인증이라, <img src>가 자동으로 붙이는 쿠키만으로는
// 401이 날 수 있다(관리자 계정이 role:admin User가 아니라 순수 flower 토큰만 쓰는 경우).
// 그래서 인증 헤더를 실어 직접 fetch한 뒤 objectURL로 바꿔 표시한다.
function AdminAttachmentThumb({ url }: { url: string }) {
  const [objectUrl, setObjectUrl] = useState("");

  useEffect(() => {
    if (!url) return undefined;
    let cancelled = false;
    let created = "";

    (async () => {
      try {
        // adminFetchResponse 는 절대 URL 을 그대로 통과시키고 토큰·credentials 만 붙인다(첨부 url 은 절대경로다).
        // 썸네일은 재시도할 가치가 없으므로 retry:false — 실패해도 원본 링크가 남는다.
        const response = await adminFetchResponse(url, { retry: false });
        if (!response.ok || cancelled) return;
        const blob = await response.blob();
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setObjectUrl(created);
      } catch {
        // 썸네일 로드 실패는 조용히 무시한다 — 원본 링크는 그대로 새 탭에서 열 수 있다.
      }
    })();

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [url]);

  return (
    <a
      href={objectUrl || url}
      target="_blank"
      rel="noreferrer"
      className="relative block h-32 w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-900"
    >
      {objectUrl ? <Image src={objectUrl} alt="첨부 스크린샷" fill unoptimized className="object-cover" /> : null}
    </a>
  );
}

export default function AdminFeedbackPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("new");
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errorView, setErrorView] = useState<AdminErrorView | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setErrorView(null);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("status", activeTab);
      const data = await adminFetch<ListResponse>(`/api/admin/feedback?${params.toString()}`);
      // 🔴 Array.isArray 가드가 필요한 이유: 워커에는 2xx 로 내려가는 degraded 응답 경로가 있어
      // items 가 빠진 본문이 올 수 있다. 그대로 넣으면 아래 items.length 에서 터져 화이트스크린이 된다.
      setItems(Array.isArray(data?.items) ? data.items : []);
      setCounts(data?.counts && typeof data.counts === "object" ? data.counts : {});
    } catch (caught) {
      setErrorView(describeAdminError(caught, "제보 목록을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { void loadList(); }, [loadList]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) || null, [items, selectedId]);

  useEffect(() => {
    setDraftNote(selected?.adminNote || "");
  }, [selected]);

  const mutate = useCallback(async (path: string, body?: unknown): Promise<Record<string, unknown> | null> => {
    setBusy(true);
    setErrorView(null);
    setMessage("");
    try {
      return await adminFetch<Record<string, unknown>>(path, { method: "POST", body });
    } catch (caught) {
      setErrorView(describeAdminError(caught, "요청을 처리하지 못했습니다."));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const updateStatus = useCallback(async (id: string, status: FeedbackStatus) => {
    const result = await mutate(`/api/admin/feedback/${id}/status`, { status });
    if (!result) return;
    setMessage("상태를 변경했습니다.");
    await loadList();
  }, [loadList, mutate]);

  const saveNote = useCallback(async () => {
    if (!selected) return;
    const result = await mutate(`/api/admin/feedback/${selected.id}/status`, { adminNote: draftNote });
    if (!result) return;
    setMessage("메모를 저장했습니다.");
    await loadList();
  }, [draftNote, loadList, mutate, selected]);

  const grantReward = useCallback(async () => {
    if (!selected) return;
    const confirmText = `${selected.authorName || selected.authorEmail || "제보자"} 님에게 월정석 ${REWARD_AMOUNT}개를 지급할까요? 되돌릴 수 없습니다.`;
    if (typeof window !== "undefined" && !window.confirm(confirmText)) return;

    const result = await mutate(`/api/admin/feedback/${selected.id}/reward`);
    if (!result) return;
    const idempotent = Boolean(result.idempotent);
    setMessage(idempotent ? "이미 지급된 제보입니다." : "월정석 지급을 완료했습니다.");
    await loadList();
  }, [loadList, mutate, selected]);

  return (
    <main className="min-h-screen">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[380px_1fr]">
        <aside className="border-b border-slate-800 bg-[#10121b] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <h1 className="text-base font-semibold">버그 제보 관리</h1>
              <p className="text-xs text-slate-400">미확인 {counts.new || 0} · 확인 중 {counts.in_progress || 0}</p>
            </div>
          </div>

          <div className="space-y-3 border-b border-slate-800 p-4">
            <div className="grid grid-cols-3 gap-2">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => { setActiveTab(tab.value); setSelectedId(""); }}
                  className={adminChip(activeTab === tab.value)}
                >
                  {tab.label}{tab.value !== "all" ? ` ${counts[tab.value] || 0}` : ""}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => { void loadList(); }} disabled={loading} className={commandButtonClass()}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              새로고침
            </button>
          </div>

          <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
            {/* 🔴 실패와 "없음"을 동시에 그리지 않는다 — 실패하면 items 가 [] 이라 예전에는 "불러오지
                못했습니다"와 "제보가 없습니다"가 나란히 떴다. 판정 순서는 loading → error → empty 다. */}
            {loading ? (
              <div className="p-4 text-sm text-slate-400">불러오는 중...</div>
            ) : errorView ? (
              <div className="p-4">
                <AdminErrorState view={errorView} onRetry={() => { void loadList(); }} retrying={loading} />
              </div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-slate-400">제보가 없습니다.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-900 ${selectedId === item.id ? "bg-slate-900" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-100">{item.title}</p>
                      <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[11px] ${statusBadgeClass(item.status)}`}>
                        {item.statusLabel}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {item.categoryLabel} · {item.authorName || item.authorEmail || "익명"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className="text-[11px] text-slate-600">{formatDate(item.createdAt)}</span>
                      {item.bugReward.granted ? (
                        <span className="rounded border border-amber-700 bg-amber-950 px-1.5 py-0.5 text-[10px] text-amber-200">
                          🎁 월정석 지급됨
                        </span>
                      ) : null}
                      {item.autoFlagReasons.length ? (
                        <span className="rounded border border-rose-800 bg-rose-950 px-1.5 py-0.5 text-[10px] text-rose-200">🚩 자동 플래그</span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0">
          <div className={ADMIN_TOOLBAR}>
            <p className="text-xs text-slate-400">
              {selected ? `${selected.ticketNo} · ${selected.categoryLabel}` : "왼쪽에서 제보를 선택하세요"}
            </p>
            {message ? <p className="mt-2 text-xs text-sky-200">{message}</p> : null}
            {/* 변경 실패는 자동 재시도하지 않는다(월정석 지급이 이 경로에 있다) — 안내만 하고 재시도는 관리자가 고른다. */}
            {errorView ? <div className="mt-2"><AdminErrorState view={errorView} compact /></div> : null}
          </div>

          {!selected ? (
            <div className="p-6 text-sm text-slate-400">
              <p>왼쪽 목록에서 처리할 제보를 선택하세요.</p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4 p-4">
              <div className="rounded-xl border border-slate-800 bg-[#13131f] p-4 text-xs leading-5 text-slate-400">
                <p>제보자: <span className="text-slate-200">{selected.authorName || "(익명)"}</span> · {selected.authorEmail || "이메일 없음"}</p>
                <p>접수일: <span className="text-slate-200">{formatDate(selected.createdAt)}</span> · 대상 페이지: <span className="break-all text-slate-200">{selected.url || "-"}</span></p>
                {selected.autoFlagReasons.length ? (
                  <p className="mt-1 text-rose-300">🚩 자동 필터: {selected.autoFlagReasons.join(", ")}</p>
                ) : null}
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-50">{selected.title}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{selected.content}</p>
              </div>

              {selected.details.length ? (
                <div className="space-y-2 rounded-xl border border-slate-800 bg-[#13131f] p-4">
                  {selected.details.map((entry, index) => (
                    <div key={`${entry.key}-${index}`} className="text-sm">
                      <p className="text-xs font-medium text-slate-400">{entry.label}</p>
                      <p className="whitespace-pre-wrap text-slate-200">{entry.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {selected.attachments.length ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {selected.attachments.map((file) => (
                    <AdminAttachmentThumb key={file.key} url={file.url} />
                  ))}
                </div>
              ) : null}

              <div>
                <label htmlFor="admin-note" className="text-xs font-medium text-slate-300">관리자 메모</label>
                <textarea
                  id="admin-note"
                  value={draftNote}
                  onChange={(event) => setDraftNote(event.target.value)}
                  rows={3}
                  maxLength={1000}
                  className={`mt-1 ${ADMIN_INPUT}`}
                />
                <button type="button" onClick={() => { void saveNote(); }} disabled={busy} className={`${commandButtonClass()} mt-2`}>
                  메모 저장
                </button>
              </div>

              <div className="rounded-xl border border-amber-800/80 bg-amber-950/30 p-4">
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
                  <div>
                    <p className="text-sm font-semibold text-amber-100">버그 확인 보상</p>
                    <p className="mt-1 text-xs leading-5 text-amber-200/80">
                      {selected.bugReward.granted
                        ? `${formatDate(selected.bugReward.grantedAt)}에 월정석 ${selected.bugReward.amount}개 지급 완료`
                        : `실제 버그로 확인되면 제보자에게 월정석 ${REWARD_AMOUNT}개를 지급합니다. 제보 1건당 1회만 지급할 수 있습니다.`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { void grantReward(); }}
                    disabled={busy || selected.bugReward.granted}
                    className={commandButtonClass("gift")}
                  >
                    <Gift className="h-4 w-4" />
                    {selected.bugReward.granted ? "지급 완료" : `버그 확정 · 월정석 ${REWARD_AMOUNT} 지급`}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                {STATUS_TABS.filter((tab) => tab.value !== "all").map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => { void updateStatus(selected.id, tab.value as FeedbackStatus); }}
                    disabled={busy || selected.status === tab.value}
                    className={tab.value === "resolved" ? commandButtonClass("success") : tab.value === "rejected" ? commandButtonClass("danger") : commandButtonClass()}
                  >
                    {tab.value === "resolved" ? <Check className="h-4 w-4" /> : null}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
