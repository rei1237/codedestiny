"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../../_lib/api-config";

type InsightStatus = "draft" | "published" | "private" | "trash";
type FilterKey = "all" | InsightStatus;
type SortKey = "latest" | "updated" | "views";

type InsightItem = {
  _id: string;
  title: string;
  slug: string;
  category?: string;
  status: InsightStatus;
  viewCount?: number;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
};

const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;

function getFlowerAdminTokenClient(): string {
  if (typeof window === "undefined") return "";

  try {
    const fromSession = String(sessionStorage.getItem("flower_admin_token") || "").trim();
    if (FLOWER_ADMIN_TOKEN_RE.test(fromSession)) return fromSession;
  } catch {}

  try {
    const fromLocal = String(localStorage.getItem("flower_admin_token") || "").trim();
    if (FLOWER_ADMIN_TOKEN_RE.test(fromLocal)) return fromLocal;
  } catch {}

  return "";
}

function buildAdminHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extraHeaders || {}) };
  const adminToken = getFlowerAdminTokenClient();
  if (adminToken) headers["x-admin-token"] = adminToken;
  return headers;
}

const FILTER_OPTIONS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "전체" },
  { key: "draft", label: "임시저장" },
  { key: "published", label: "발행됨" },
  { key: "private", label: "비공개" },
  { key: "trash", label: "휴지통" },
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: InsightStatus) {
  if (status === "draft") return "임시저장";
  if (status === "published") return "발행됨";
  if (status === "private") return "비공개";
  return "휴지통";
}

function statusBadgeClass(status: InsightStatus) {
  if (status === "published") return "bg-emerald-900/50 text-emerald-200 border-emerald-700";
  if (status === "private") return "bg-amber-900/40 text-amber-200 border-amber-700";
  if (status === "trash") return "bg-rose-900/40 text-rose-200 border-rose-700";
  return "bg-slate-800 text-slate-200 border-slate-700";
}

export default function AdminInsightsPage() {
  const router = useRouter();
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const endpointBase = `${apiBase || ""}/api/admin/insights`;

  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("latest");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<InsightItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [busyId, setBusyId] = useState("");

  async function loadList() {
    setLoading(true);
    setError("");

    try {
      const url = new URL(endpointBase, window.location.origin);
      if (filter !== "all") url.searchParams.set("status", filter);
      if (query.trim()) url.searchParams.set("q", query.trim());
      url.searchParams.set("sort", sort);

      const res = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
        headers: buildAdminHeaders(),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401 || res.status === 403) {
        setForbidden(true);
        setItems([]);
        return;
      }

      if (!res.ok) {
        setError(String(data?.message || "목록을 불러오지 못했습니다."));
        setItems([]);
        return;
      }

      setForbidden(false);
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setError("네트워크 오류로 목록을 불러오지 못했습니다.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpointBase, filter, sort, query]);

  async function updateStatus(id: string, status: InsightStatus) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`${endpointBase}/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: buildAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(String(data?.message || "상태 변경에 실패했습니다."));
        return;
      }
      await loadList();
    } finally {
      setBusyId("");
    }
  }

  async function moveToTrash(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`${endpointBase}/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: buildAdminHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(String(data?.message || "휴지통 이동에 실패했습니다."));
        return;
      }
      await loadList();
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0d1a] text-slate-100 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">관리자 콘텐츠 센터</h1>
            <p className="text-sm text-slate-400 mt-1">운세 인사이트 글 목록 관리</p>
          </div>
          <button
            type="button"
            className="rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-medium"
            onClick={() => router.push("/admin/insights/new")}
          >
            새 글 작성
          </button>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <aside className="lg:col-span-3 rounded-2xl border border-[#2a2a3e] bg-[#13131f] p-3">
            <p className="text-xs uppercase tracking-wider text-slate-500 px-2 py-1">관리자 메뉴</p>
            <nav className="mt-2 space-y-1">
              <Link
                href="/admin/insights"
                className="block rounded-lg px-3 py-2 text-sm bg-violet-900/40 border border-violet-700 text-violet-100"
              >
                운세 인사이트 관리
              </Link>
            </nav>
          </aside>

          <section className="lg:col-span-9 rounded-2xl border border-[#2a2a3e] bg-[#13131f] p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => {
                const active = filter === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setFilter(option.key)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${active ? "border-violet-600 bg-violet-900/40 text-violet-100" : "border-slate-700 bg-slate-900 text-slate-300"}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setQuery(searchInput.trim());
                }}
                placeholder="제목 또는 slug 검색"
                className="md:col-span-7 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2 text-sm"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="md:col-span-3 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2 text-sm"
              >
                <option value="latest">최신순</option>
                <option value="updated">수정일순</option>
                <option value="views">조회수순</option>
              </select>
              <button
                type="button"
                onClick={() => setQuery(searchInput.trim())}
                className="md:col-span-2 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm"
              >
                검색
              </button>
            </div>

            {forbidden ? (
              <div className="rounded-xl border border-rose-700/60 bg-rose-900/20 p-5">
                <p className="text-rose-200 font-semibold">관리자 권한이 없어서 접근할 수 없습니다.</p>
                <p className="text-sm text-rose-200/80 mt-1">관리자 로그인 후 다시 시도해 주세요.</p>
                <button
                  type="button"
                  onClick={() => router.push("/admin/login")}
                  className="mt-3 rounded-lg bg-rose-700 hover:bg-rose-600 px-3 py-2 text-sm"
                >
                  관리자 로그인으로 이동
                </button>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-rose-700/60 bg-rose-900/20 p-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 text-sm text-slate-300">
                목록을 불러오는 중입니다...
              </div>
            ) : null}

            {!loading && !forbidden && items.length === 0 ? (
              <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-8 text-center">
                <p className="text-base font-semibold text-slate-200">아직 등록된 인사이트 글이 없습니다.</p>
                <p className="text-sm text-slate-400 mt-1">새 글 작성 버튼으로 첫 글을 준비해 주세요.</p>
              </div>
            ) : null}

            {!loading && !forbidden && items.length > 0 ? (
              <>
                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-900 text-slate-300">
                      <tr>
                        <th className="text-left px-3 py-2">제목</th>
                        <th className="text-left px-3 py-2">slug</th>
                        <th className="text-left px-3 py-2">카테고리</th>
                        <th className="text-left px-3 py-2">상태</th>
                        <th className="text-right px-3 py-2">조회수</th>
                        <th className="text-left px-3 py-2">작성일</th>
                        <th className="text-left px-3 py-2">수정일</th>
                        <th className="text-left px-3 py-2">발행일</th>
                        <th className="text-left px-3 py-2">액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item._id} className="border-t border-slate-800">
                          <td className="px-3 py-2 max-w-[220px] truncate">{item.title || "(제목 없음)"}</td>
                          <td className="px-3 py-2 text-slate-400">/{item.slug}</td>
                          <td className="px-3 py-2">{item.category || "-"}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${statusBadgeClass(item.status)}`}>
                              {statusLabel(item.status)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">{Number(item.viewCount || 0).toLocaleString("ko-KR")}</td>
                          <td className="px-3 py-2 text-slate-400">{formatDate(item.createdAt)}</td>
                          <td className="px-3 py-2 text-slate-400">{formatDate(item.updatedAt)}</td>
                          <td className="px-3 py-2 text-slate-400">{formatDate(item.publishedAt)}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1.5">
                              <button type="button" className="rounded bg-slate-700 hover:bg-slate-600 px-2 py-1 text-xs" onClick={() => router.push(`/admin/insights/edit?id=${encodeURIComponent(item._id)}`)}>수정</button>
                              <button type="button" className="rounded bg-blue-700 hover:bg-blue-600 px-2 py-1 text-xs" onClick={() => window.open(`/insights/${item.slug}`, "_blank", "noopener,noreferrer")}>미리보기</button>
                              <button type="button" disabled={busyId === item._id || item.status === "private"} className="rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => updateStatus(item._id, "private")}>비공개 전환</button>
                              <button type="button" disabled={busyId === item._id || item.status === "trash"} className="rounded bg-rose-700 hover:bg-rose-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => moveToTrash(item._id)}>휴지통</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-3">
                  {items.map((item) => (
                    <article key={item._id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm leading-5">{item.title || "(제목 없음)"}</h3>
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] ${statusBadgeClass(item.status)}`}>
                          {statusLabel(item.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 break-all">/{item.slug}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                        <p>카테고리: {item.category || "-"}</p>
                        <p>조회수: {Number(item.viewCount || 0).toLocaleString("ko-KR")}</p>
                        <p>작성일: {formatDate(item.createdAt)}</p>
                        <p>수정일: {formatDate(item.updatedAt)}</p>
                        <p className="col-span-2">발행일: {formatDate(item.publishedAt)}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" className="rounded bg-slate-700 hover:bg-slate-600 px-2 py-1 text-xs" onClick={() => router.push(`/admin/insights/edit?id=${encodeURIComponent(item._id)}`)}>수정</button>
                        <button type="button" className="rounded bg-blue-700 hover:bg-blue-600 px-2 py-1 text-xs" onClick={() => window.open(`/insights/${item.slug}`, "_blank", "noopener,noreferrer")}>미리보기</button>
                        <button type="button" disabled={busyId === item._id || item.status === "private"} className="rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => updateStatus(item._id, "private")}>비공개 전환</button>
                        <button type="button" disabled={busyId === item._id || item.status === "trash"} className="rounded bg-rose-700 hover:bg-rose-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => moveToTrash(item._id)}>휴지통</button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}
