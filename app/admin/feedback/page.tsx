"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  FileText,
  LogOut,
  Mail,
  MessageSquare,
  RefreshCw,
  Star,
  Trash2,
} from "lucide-react";

import { FEEDBACK_CATEGORIES } from "../../feedback/_lib/categories";
import { redirectToAdminLogin } from "../cms/_lib/admin-api";
import {
  deleteFeedback,
  fetchFeedbackDetail,
  listFeedback,
  patchFeedback,
  replyToFeedback,
  type AdminFeedbackCounts,
  type AdminFeedbackItem,
} from "./_lib/api";

const STATUS_TABS = [
  { value: "all", label: "전체" },
  { value: "new", label: "미확인" },
  { value: "in_progress", label: "확인 중" },
  { value: "resolved", label: "수정 완료" },
  { value: "on_hold", label: "보류" },
  { value: "rejected", label: "반려" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "high", label: "높음" },
  { value: "normal", label: "보통" },
  { value: "low", label: "낮음" },
] as const;

const EMPTY_COUNTS: AdminFeedbackCounts = {
  all: 0, new: 0, in_progress: 0, resolved: 0, on_hold: 0, rejected: 0,
};

function commandButtonClass(): string {
  return "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100";
}

function statusBadgeClass(status: string): string {
  if (status === "new") return "border-amber-500 bg-amber-950 text-amber-100";
  if (status === "in_progress") return "border-sky-500 bg-sky-950 text-sky-100";
  if (status === "resolved") return "border-emerald-500 bg-emerald-950 text-emerald-100";
  if (status === "rejected") return "border-rose-500 bg-rose-950 text-rose-100";
  return "border-slate-600 bg-slate-900 text-slate-300";
}

function priorityDotClass(priority: string): string {
  if (priority === "high") return "bg-rose-400";
  if (priority === "low") return "bg-slate-500";
  return "bg-sky-400";
}

function formatDateTime(value: string): string {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
}

/**
 * 제보 URL 은 사용자 입력이다. 우리 도메인일 때만 새 탭 링크로 만들고,
 * 그 외에는 텍스트로만 보여준다(관리자 콘솔에서 임의 사이트로 나가지 않게).
 */
function isSafeInternalUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;
  if (rawUrl.startsWith("/")) return true;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    if (typeof window !== "undefined" && parsed.origin === window.location.origin) return true;
    return parsed.hostname === "code-destiny.com" || parsed.hostname.endsWith(".code-destiny.com");
  } catch {
    return false;
  }
}

interface DraftState {
  status: string;
  priority: string;
  assigneeName: string;
  tags: string;
  adminNote: string;
}

const EMPTY_DRAFT: DraftState = { status: "new", priority: "normal", assigneeName: "", tags: "", adminNote: "" };

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [counts, setCounts] = useState<AdminFeedbackCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [activeTab, setActiveTab] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [attachmentOnly, setAttachmentOnly] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");

  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [replyBody, setReplyBody] = useState("");
  const [notifyUser, setNotifyUser] = useState(false);
  const [busy, setBusy] = useState(false);
  // 목록에 없는 제보(메일 딥링크로 들어온 오래된 건)를 단건 조회로 보관한다.
  const [deepLinked, setDeepLinked] = useState<AdminFeedbackItem | null>(null);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId)
      || (deepLinked && deepLinked.id === selectedId ? deepLinked : null),
    [items, selectedId, deepLinked],
  );

  // 검색어 디바운스 300ms.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await listFeedback({
        status: activeTab,
        category: categoryFilter,
        priority: priorityFilter,
        q: query,
        hasAttachment: attachmentOnly,
      }, signal);
      setItems(data.items || []);
      setCounts(data.counts || EMPTY_COUNTS);
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      setErrorMessage(error instanceof Error ? error.message : "제보 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, categoryFilter, priorityFilter, query, attachmentOnly]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // 선택이 바뀌면 편집 폼을 그 제보의 현재 값으로 되돌린다.
  useEffect(() => {
    if (!selected) { setDraft(EMPTY_DRAFT); setReplyBody(""); setNotifyUser(false); return; }
    setDraft({
      status: selected.status,
      priority: selected.priority,
      assigneeName: selected.assigneeName,
      tags: (selected.tags || []).join(", "),
      adminNote: selected.adminNote,
    });
    setReplyBody("");
    setNotifyUser(false);
  }, [selected]);

  // URL 의 ?id= 로 특정 제보를 바로 연다(관리자 알림 메일의 CTA 목적지).
  useEffect(() => {
    if (typeof window === "undefined" || selectedId) return;
    const id = new URLSearchParams(window.location.search).get("id");
    if (/^[a-f0-9]{24}$/i.test(id || "")) setSelectedId(id as string);
  }, [selectedId]);

  // 선택한 제보가 현재 목록에 없으면(오래된 건·다른 필터) 단건 조회로 채운다.
  // 이게 없으면 메일 CTA 가 빈 상세 화면으로 떨어진다.
  useEffect(() => {
    if (!selectedId || loading) return;
    if (items.some((item) => item.id === selectedId)) return;
    if (deepLinked?.id === selectedId) return;

    let cancelled = false;
    fetchFeedbackDetail(selectedId)
      .then((data) => { if (!cancelled) setDeepLinked(data.item); })
      .catch(() => { if (!cancelled) setErrorMessage("해당 제보를 찾지 못했습니다."); });
    return () => { cancelled = true; };
  }, [selectedId, items, loading, deepLinked]);

  const runMutation = async (action: () => Promise<void>, successMessage: string) => {
    setBusy(true);
    setMessage("");
    setErrorMessage("");
    try {
      await action();
      setMessage(successMessage);
      await load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = () => {
    if (!selected) return;
    void runMutation(async () => {
      await patchFeedback(selected.id, {
        status: draft.status,
        priority: draft.priority,
        assigneeName: draft.assigneeName,
        tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        adminNote: draft.adminNote,
      });
    }, "제보 정보를 저장했습니다.");
  };

  const sendReply = () => {
    if (!selected || !replyBody.trim()) return;
    void runMutation(async () => {
      const result = await replyToFeedback(selected.id, replyBody.trim(), notifyUser);
      if (notifyUser && !result.emailed) {
        throw new Error(`답변은 저장했지만 메일 발송에 실패했습니다: ${result.emailError || "알 수 없는 오류"}`);
      }
    }, notifyUser ? "답변을 등록하고 메일을 보냈습니다." : "답변을 등록했습니다.");
  };

  const removeFeedback = () => {
    if (!selected) return;
    if (!window.confirm(`제보 "${selected.title}" 를 삭제할까요? 첨부 이미지도 함께 삭제됩니다.`)) return;
    void runMutation(async () => {
      await deleteFeedback(selected.id);
      setSelectedId("");
    }, "제보를 삭제했습니다.");
  };

  const copyToClipboard = (value: string) => {
    void navigator.clipboard?.writeText(value).catch(() => undefined);
  };

  return (
    <main className="min-h-screen bg-[#0d0f18] text-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[420px_1fr]">
        <aside className={`border-b border-slate-800 bg-[#10121b] lg:border-b-0 lg:border-r ${selected ? "hidden lg:block" : ""}`}>
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <h1 className="text-base font-semibold">버그 제보실</h1>
              <p className="text-xs text-slate-400">
                미확인 {counts.new} · 확인 중 {counts.in_progress} · 완료 {counts.resolved}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/reviews" className={commandButtonClass()} aria-label="리뷰 관리로 이동" title="리뷰 관리">
                <Star className="h-4 w-4" />
              </Link>
              <Link href="/admin/content" className={commandButtonClass()} aria-label="글 편집으로 이동" title="글 편집">
                <FileText className="h-4 w-4" />
              </Link>
              <button type="button" onClick={() => void load()} className={commandButtonClass()} aria-label="새로고침">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button type="button" onClick={redirectToAdminLogin} className={commandButtonClass()} aria-label="로그아웃">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3 border-b border-slate-800 p-4">
            <div className="grid grid-cols-3 gap-2">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => { setActiveTab(tab.value); setSelectedId(""); }}
                  className={activeTab === tab.value
                    ? "rounded-lg border border-violet-500 bg-violet-950 px-2 py-2 text-xs text-violet-100"
                    : "rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-300 hover:border-slate-500"}
                >
                  {tab.label}
                  {tab.value !== "all" && (
                    <span className="ml-1 text-[10px] text-slate-400">
                      {counts[tab.value as keyof AdminFeedbackCounts] ?? 0}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                aria-label="분류 필터"
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-200"
              >
                <option value="all">전체 분류</option>
                {FEEDBACK_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>{category.emoji} {category.label}</option>
                ))}
              </select>
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                aria-label="우선순위 필터"
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-200"
              >
                <option value="all">전체 우선순위</option>
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="제목 · 내용 · 이메일 · URL 검색"
              aria-label="제보 검색"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500"
            />

            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={attachmentOnly}
                onChange={(event) => setAttachmentOnly(event.target.checked)}
                className="accent-violet-500"
              />
              첨부 있는 제보만
            </label>
          </div>

          <ul className="divide-y divide-slate-800">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-slate-900 ${
                    selectedId === item.id ? "bg-slate-900 ring-1 ring-inset ring-violet-500" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${priorityDotClass(item.priority)}`} aria-label={`우선순위 ${item.priorityLabel}`} />
                    <span className="font-mono">{item.ticketNo}</span>
                    <span>· {item.categoryLabel}</span>
                    {item.attachments.length > 0 && <span>· 📎{item.attachments.length}</span>}
                    <span className="ml-auto">{formatDateTime(item.createdAt)}</span>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-100">{item.title}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusBadgeClass(item.status)}`}>
                      {item.statusLabel}
                    </span>
                    <span className="truncate text-[11px] text-slate-500">{item.authorName || item.authorEmail || item.userId}</span>
                  </div>
                </button>
              </li>
            ))}
            {!loading && !items.length && (
              <li className="px-4 py-10 text-center text-xs text-slate-500">조건에 맞는 제보가 없습니다.</li>
            )}
          </ul>
        </aside>

        <section className={`p-4 sm:p-6 ${selected ? "" : "hidden lg:block"}`}>
          {(message || errorMessage) && (
            <p
              role="status"
              className={`mb-4 rounded-lg border px-3 py-2 text-xs ${
                errorMessage ? "border-rose-500 bg-rose-950 text-rose-100" : "border-emerald-500 bg-emerald-950 text-emerald-100"
              }`}
            >
              {errorMessage || message}
            </p>
          )}

          {!selected ? (
            <p className="mt-20 text-center text-sm text-slate-500">왼쪽에서 제보를 선택하세요.</p>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-5">
              <button type="button" onClick={() => setSelectedId("")} className="inline-flex w-fit items-center gap-1.5 text-xs text-slate-400 lg:hidden">
                <ArrowLeft className="h-4 w-4" /> 목록
              </button>

              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-mono">{selected.ticketNo}</span>
                    <span className={`rounded-full border px-2 py-0.5 ${statusBadgeClass(selected.status)}`}>{selected.statusLabel}</span>
                    <span>{selected.categoryLabel}</span>
                    <span>· {formatDateTime(selected.createdAt)}</span>
                  </div>
                  <h2 className="mt-2 break-words text-lg font-semibold">{selected.title}</h2>
                </div>
                <div className="flex shrink-0 gap-2">
                  {isSafeInternalUrl(selected.url) && (
                    <a href={selected.url} target="_blank" rel="noreferrer" className={commandButtonClass()} aria-label="제보 대상 페이지 열기" title="페이지 열기">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button type="button" onClick={removeFeedback} disabled={busy} className={commandButtonClass()} aria-label="제보 삭제" title="삭제">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <article className="whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm leading-relaxed text-slate-200">
                {selected.content}
              </article>

              {selected.autoFlagReasons.length > 0 && (
                <p className="rounded-lg border border-amber-600 bg-amber-950 px-3 py-2 text-xs text-amber-100">
                  자동 플래그: {selected.autoFlagReasons.join(", ")}
                </p>
              )}

              {/* 제보자 정보. 관리자용 사용자 조회 API 가 없어 프로필 이동 대신 복사 + mailto 로 처리한다. */}
              <section className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">제보자</h3>
                <dl className="space-y-2 text-xs">
                  {[
                    { label: "이름", value: selected.authorName },
                    { label: "이메일", value: selected.authorEmail },
                    { label: "회원번호", value: selected.userId },
                  ].filter((row) => row.value).map((row) => (
                    <div key={row.label} className="flex items-center gap-2">
                      <dt className="w-16 shrink-0 text-slate-500">{row.label}</dt>
                      <dd className="min-w-0 flex-1 break-all text-slate-200">{row.value}</dd>
                      <button type="button" onClick={() => copyToClipboard(row.value)} className={commandButtonClass()} aria-label={`${row.label} 복사`}>
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </dl>
                {selected.authorEmail && (
                  <a
                    href={`mailto:${selected.authorEmail}?subject=${encodeURIComponent(`[CODE DESTINY] ${selected.ticketNo} 제보 회신`)}`}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
                  >
                    <Mail className="h-3.5 w-3.5" /> 메일로 직접 회신
                  </a>
                )}
              </section>

              {(selected.details.length > 0 || selected.client.length > 0) && (
                <section className="grid gap-4 sm:grid-cols-2">
                  {selected.details.length > 0 && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">추가 정보</h3>
                      <dl className="space-y-2 text-xs">
                        {selected.details.map((entry) => (
                          <div key={entry.key}>
                            <dt className="text-slate-500">{entry.label || entry.key}</dt>
                            <dd className="mt-0.5 whitespace-pre-wrap break-words text-slate-200">{entry.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                  {selected.client.length > 0 && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">환경 정보</h3>
                      <dl className="space-y-1.5 text-xs">
                        {selected.client.map((entry) => (
                          <div key={entry.key} className="flex gap-2">
                            <dt className="w-24 shrink-0 text-slate-500">{entry.label || entry.key}</dt>
                            <dd className="min-w-0 break-all text-slate-200">{entry.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </section>
              )}

              {selected.attachments.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    첨부 {selected.attachments.length}건
                  </h3>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {selected.attachments.map((file) => (
                      <li key={file.key}>
                        <a href={file.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-slate-800 hover:border-slate-600">
                          {/* 인증 경유 R2 이미지라 next/image 최적화 대상이 아니다. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={file.url} alt={file.originalName || "제보 첨부 이미지"} className="aspect-video w-full object-cover" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">처리</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs text-slate-400">
                    상태
                    <select
                      value={draft.status}
                      onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    >
                      {STATUS_TABS.filter((tab) => tab.value !== "all").map((tab) => (
                        <option key={tab.value} value={tab.value}>{tab.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-slate-400">
                    우선순위
                    <select
                      value={draft.priority}
                      onChange={(event) => setDraft((prev) => ({ ...prev, priority: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    >
                      {PRIORITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-slate-400">
                    담당자
                    <input
                      type="text"
                      value={draft.assigneeName}
                      onChange={(event) => setDraft((prev) => ({ ...prev, assigneeName: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>
                  <label className="text-xs text-slate-400">
                    태그 (쉼표 구분)
                    <input
                      type="text"
                      value={draft.tags}
                      onChange={(event) => setDraft((prev) => ({ ...prev, tags: event.target.value }))}
                      placeholder="regression, mobile"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
                    />
                  </label>
                </div>
                <label className="mt-3 block text-xs text-slate-400">
                  내부 메모 (제보자에게 보이지 않음)
                  <textarea
                    value={draft.adminNote}
                    rows={3}
                    onChange={(event) => setDraft((prev) => ({ ...prev, adminNote: event.target.value }))}
                    className="mt-1 w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  />
                </label>
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={busy}
                  className="mt-3 rounded-lg border border-violet-500 bg-violet-950 px-4 py-2 text-sm text-violet-100 hover:bg-violet-900 disabled:opacity-50"
                >
                  저장
                </button>
              </section>

              <section className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <MessageSquare className="h-3.5 w-3.5" /> 답변 {selected.replies.length > 0 && `(${selected.replies.length})`}
                </h3>

                {selected.replies.length > 0 && (
                  <ul className="mb-4 space-y-3">
                    {selected.replies.map((reply, index) => (
                      <li key={index} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>{reply.authorName}</span>
                          <span>· {formatDateTime(reply.createdAt)}</span>
                          {reply.emailed && <span className="text-emerald-400">· 메일 발송됨</span>}
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-slate-200">{reply.body}</p>
                      </li>
                    ))}
                  </ul>
                )}

                <textarea
                  value={replyBody}
                  rows={4}
                  onChange={(event) => setReplyBody(event.target.value)}
                  placeholder="제보자에게 전달할 답변을 작성하세요."
                  className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
                />
                {/* 메일 발송은 요청당 opt-in 이다 — 짧은 진행 답변까지 매번 메일이 나가면 받은편지함이 도배된다. */}
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={notifyUser}
                    onChange={(event) => setNotifyUser(event.target.checked)}
                    disabled={!selected.authorEmail}
                    className="accent-violet-500"
                  />
                  제보자에게 메일로 알리기
                  {!selected.authorEmail && <span className="text-slate-500">(이메일 없음)</span>}
                </label>
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={busy || !replyBody.trim()}
                  className="mt-3 rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:border-slate-400 disabled:opacity-50"
                >
                  답변 등록
                </button>
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
