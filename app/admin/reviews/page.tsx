"use client";

import { Check, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../../_lib/api-config";

type ReviewStatus = "pending" | "approved" | "rejected" | "hidden";
type TabValue = ReviewStatus | "all" | "create";

interface ReviewItem {
  id: string;
  userId: string;
  authorName: string;
  authorImage: string;
  productId: string;
  productName: string;
  featureKey: string;
  orderId: string;
  rating: number;
  title: string;
  body: string;
  locale: string;
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  createdByAdmin: boolean;
  autoFlagReasons: string[];
  adminNote: string;
  reviewedBy: string;
  approvedAt?: string | null;
  displayedAt?: string | null;
  createdAt?: string | null;
}

interface ProductOption {
  productId: string;
  name: string;
  total: number;
  average: number;
}

interface SeedForm {
  productId: string;
  userId: string;
  authorName: string;
  authorImage: string;
  rating: number;
  title: string;
  body: string;
  displayedAt: string;
  status: Extract<ReviewStatus, "approved" | "pending">;
}

const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
const LOCAL_ADMIN_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

const STATUS_TABS: Array<{ value: TabValue; label: string }> = [
  { value: "pending", label: "검수 대기" },
  { value: "approved", label: "승인 완료" },
  { value: "rejected", label: "반려" },
  { value: "all", label: "전체" },
  { value: "create", label: "리뷰 생성" },
];

const FLAG_LABELS: Record<string, string> = {
  profanity: "욕설",
  advertising: "광고",
  personal_info: "개인정보",
  spam: "도배",
  competitor: "타 서비스",
  false_purchase_claim: "허위 구매",
};

const EMPTY_SEED: SeedForm = {
  productId: "",
  userId: "",
  authorName: "",
  authorImage: "",
  rating: 5,
  title: "",
  body: "",
  displayedAt: "",
  status: "approved",
};

function isLocalAdminHost(hostname: string): boolean {
  return LOCAL_ADMIN_HOSTS.has(String(hostname || "").trim().toLowerCase());
}

function resolveAdminRequestCredentials(apiBase: string): RequestCredentials {
  if (typeof window === "undefined") return "include";
  const base = String(apiBase || "").trim();
  if (!base) return "include";

  try {
    const target = new URL(base);
    const current = new URL(window.location.origin);
    if (target.origin === current.origin) return "include";
    if (isLocalAdminHost(target.hostname) && isLocalAdminHost(current.hostname)) return "include";
    return "omit";
  } catch {
    return "include";
  }
}

function getFlowerAdminTokenClient(): string {
  if (typeof window === "undefined") return "";

  try {
    const token = String(sessionStorage.getItem("flower_admin_token") || "").trim();
    if (FLOWER_ADMIN_TOKEN_RE.test(token)) return token;
  } catch {}

  return "";
}

function buildAdminHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extraHeaders || {}) };
  const token = getFlowerAdminTokenClient();
  if (token) headers["x-admin-token"] = token;
  return headers;
}

function clearAdminToken(): void {
  try { sessionStorage.removeItem("flower_admin_token"); } catch {}
  try { sessionStorage.removeItem("flower_admin_password_ok"); } catch {}
}

function commandButtonClass(tone: "neutral" | "primary" | "success" | "warn" | "danger" = "neutral"): string {
  if (tone === "primary") return "inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50";
  if (tone === "success") return "inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50";
  if (tone === "warn") return "inline-flex items-center gap-2 rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50";
  if (tone === "danger") return "inline-flex items-center gap-2 rounded-lg bg-rose-700 px-3 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50";
  return "inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 hover:border-slate-500 disabled:opacity-50";
}

function statusBadgeClass(status?: ReviewStatus): string {
  if (status === "approved") return "border-emerald-700 bg-emerald-950 text-emerald-200";
  if (status === "pending") return "border-amber-700 bg-amber-950 text-amber-200";
  if (status === "rejected") return "border-rose-700 bg-rose-950 text-rose-200";
  if (status === "hidden") return "border-slate-700 bg-slate-900 text-slate-400";
  return "border-slate-700 bg-slate-900 text-slate-400";
}

function statusLabel(status?: ReviewStatus): string {
  if (status === "approved") return "승인";
  if (status === "pending") return "대기";
  if (status === "rejected") return "반려";
  if (status === "hidden") return "숨김";
  return "-";
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
}

function toDateTimeLocalValue(value?: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const offsetMs = parsed.getTime() - parsed.getTimezoneOffset() * 60000;
  return new Date(offsetMs).toISOString().slice(0, 16);
}

function StarPicker({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          aria-label={`별점 ${star}점`}
          className={`text-xl leading-none transition-colors ${star <= value ? "text-amber-300" : "text-slate-600 hover:text-slate-400"}`}
        >
          ★
        </button>
      ))}
      <span className="ml-2 text-xs text-slate-400">{value}.0</span>
    </div>
  );
}

export default function AdminReviewsPage() {
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const adminEndpoint = `${apiBase || ""}/api/admin/reviews`;
  const productsEndpoint = `${apiBase || ""}/api/reviews/products`;
  const requestCredentials = useMemo(() => resolveAdminRequestCredentials(apiBase), [apiBase]);

  const [activeTab, setActiveTab] = useState<TabValue>("pending");
  const [productFilter, setProductFilter] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<ReviewItem | null>(null);
  const [seed, setSeed] = useState<SeedForm>(EMPTY_SEED);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const redirectToLogin = useCallback(() => {
    clearAdminToken();
    const next = typeof window === "undefined" ? "/admin/reviews" : `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/admin/login?next=${encodeURIComponent(next)}`);
  }, []);

  const handleAuthFailure = useCallback((status: number) => {
    if (status === 401 || status === 403) {
      setError(status === 401 ? "로그인이 필요합니다." : "관리자 권한이 필요합니다.");
      redirectToLogin();
      return true;
    }
    return false;
  }, [redirectToLogin]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch(productsEndpoint, { method: "GET", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setProducts(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setProducts([]);
    }
  }, [productsEndpoint]);

  const loadList = useCallback(async () => {
    if (activeTab === "create") return;

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("status", activeTab);
      if (productFilter) params.set("productId", productFilter);
      if (flaggedOnly) params.set("flagged", "1");

      const res = await fetch(`${adminEndpoint}?${params.toString()}`, {
        method: "GET",
        credentials: requestCredentials,
        headers: buildAdminHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (handleAuthFailure(res.status)) return;
      if (!res.ok) {
        setError(String(data?.message || "리뷰 목록을 불러오지 못했습니다."));
        return;
      }
      setItems(Array.isArray(data?.items) ? data.items : []);
      setCounts(data?.counts && typeof data.counts === "object" ? data.counts : {});
    } catch {
      setError("리뷰 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, adminEndpoint, flaggedOnly, handleAuthFailure, productFilter, requestCredentials]);

  useEffect(() => { void loadProducts(); }, [loadProducts]);
  useEffect(() => { void loadList(); }, [loadList]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) || null, [items, selectedId]);

  useEffect(() => {
    setDraft(selected ? { ...selected } : null);
  }, [selected]);

  const mutate = useCallback(async (url: string, method: string, payload?: unknown) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(url, {
        method,
        credentials: requestCredentials,
        headers: buildAdminHeaders(payload ? { "Content-Type": "application/json" } : undefined),
        cache: "no-store",
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (handleAuthFailure(res.status)) return null;
      if (!res.ok) {
        setError(String(data?.message || "요청을 처리하지 못했습니다."));
        return null;
      }
      return data;
    } catch {
      setError("요청을 처리하지 못했습니다.");
      return null;
    } finally {
      setBusy(false);
    }
  }, [handleAuthFailure, requestCredentials]);

  const updateStatus = useCallback(async (id: string, status: ReviewStatus) => {
    const result = await mutate(`${adminEndpoint}/${id}/status`, "POST", { status });
    if (!result) return;
    setMessage(`리뷰를 ${statusLabel(status)} 처리했습니다.`);
    await loadList();
  }, [adminEndpoint, loadList, mutate]);

  const saveDraft = useCallback(async () => {
    if (!draft) return;
    const result = await mutate(`${adminEndpoint}/${draft.id}`, "PATCH", {
      rating: draft.rating,
      title: draft.title,
      body: draft.body,
      authorName: draft.authorName,
      authorImage: draft.authorImage,
      adminNote: draft.adminNote,
      productId: draft.productId,
      displayedAt: draft.displayedAt || undefined,
    });
    if (!result) return;
    setMessage("리뷰를 저장했습니다.");
    await loadList();
  }, [adminEndpoint, draft, loadList, mutate]);

  const removeReview = useCallback(async (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("이 리뷰를 삭제할까요? 되돌릴 수 없습니다.")) return;
    const result = await mutate(`${adminEndpoint}/${id}`, "DELETE");
    if (!result) return;
    setSelectedId("");
    setMessage("리뷰를 삭제했습니다.");
    await loadList();
  }, [adminEndpoint, loadList, mutate]);

  const createSeedReview = useCallback(async () => {
    if (!seed.productId) {
      setError("상품을 선택해 주세요.");
      return;
    }
    if (!seed.userId.trim() && !seed.authorName.trim()) {
      setError("사용자 ID 또는 닉네임 중 하나는 입력해야 합니다.");
      return;
    }
    if (seed.body.trim().length < 10) {
      setError("리뷰 내용을 10자 이상 입력해 주세요.");
      return;
    }

    const result = await mutate(adminEndpoint, "POST", {
      productId: seed.productId,
      userId: seed.userId.trim(),
      authorName: seed.authorName.trim(),
      authorImage: seed.authorImage.trim(),
      rating: seed.rating,
      title: seed.title.trim(),
      body: seed.body.trim(),
      status: seed.status,
      displayedAt: seed.displayedAt ? new Date(seed.displayedAt).toISOString() : undefined,
    });
    if (!result) return;

    setMessage("관리자 리뷰를 생성했습니다.");
    setSeed((prev) => ({ ...EMPTY_SEED, productId: prev.productId, status: prev.status }));
    await loadProducts();
  }, [adminEndpoint, loadProducts, mutate, seed]);

  return (
    <main className="min-h-screen bg-[#0d0f18] text-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[380px_1fr]">
        <aside className="border-b border-slate-800 bg-[#10121b] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <h1 className="text-base font-semibold">리뷰 관리</h1>
              <p className="text-xs text-slate-400">
                검수 대기 {counts.pending || 0} · 승인 {counts.approved || 0} · 반려 {counts.rejected || 0}
              </p>
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
                </button>
              ))}
            </div>

            {activeTab === "create" ? null : (
              <>
                <select
                  value={productFilter}
                  onChange={(event) => setProductFilter(event.target.value)}
                  aria-label="상품 필터"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                >
                  <option value="">모든 상품</option>
                  {products.map((product) => (
                    <option key={product.productId} value={product.productId}>
                      {product.name} ({product.total})
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={flaggedOnly}
                    onChange={(event) => setFlaggedOnly(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                  />
                  자동 필터에 걸린 리뷰만 보기
                </label>
                <button type="button" onClick={() => { void loadList(); }} disabled={loading} className={commandButtonClass()}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  새로고침
                </button>
              </>
            )}
          </div>

          {activeTab === "create" ? (
            <div className="p-4 text-xs leading-5 text-slate-400">
              오른쪽 폼에서 초기 운영용 리뷰를 생성할 수 있습니다. 생성된 리뷰는 관리자 화면에서만
              &quot;관리자 작성&quot;으로 표시되고, 구매 인증 배지는 붙지 않습니다.
            </div>
          ) : (
            <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-4 text-sm text-slate-400">{loading ? "불러오는 중..." : "리뷰가 없습니다."}</div>
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
                        <p className="truncate text-sm font-medium text-slate-100">{item.authorName}</p>
                        <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[11px] ${statusBadgeClass(item.status)}`}>
                          {statusLabel(item.status)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        <span className="text-amber-300">{"★".repeat(item.rating)}</span> · {item.productName}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.title || item.body}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <span className="text-[11px] text-slate-600">{formatDate(item.createdAt)}</span>
                        {item.createdByAdmin ? (
                          <span className="rounded border border-sky-800 bg-sky-950 px-1.5 py-0.5 text-[10px] text-sky-200">관리자 작성</span>
                        ) : null}
                        {item.isVerifiedPurchase ? (
                          <span className="rounded border border-emerald-800 bg-emerald-950 px-1.5 py-0.5 text-[10px] text-emerald-200">구매 인증</span>
                        ) : null}
                        {item.autoFlagReasons.map((flag) => (
                          <span key={flag} className="rounded border border-rose-800 bg-rose-950 px-1.5 py-0.5 text-[10px] text-rose-200">
                            🚩 {FLAG_LABELS[flag] || flag}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>

        <section className="min-w-0">
          <div className="sticky top-0 z-20 border-b border-slate-800 bg-[#0d0f18]/95 px-4 py-3 backdrop-blur">
            <p className="text-xs text-slate-400">
              {activeTab === "create"
                ? "리뷰 생성 — 초기 운영용 시딩"
                : selected
                  ? `${selected.productName} · ${selected.authorName}`
                  : "왼쪽에서 리뷰를 선택하세요"}
            </p>
            {message ? <p className="mt-2 text-xs text-sky-200">{message}</p> : null}
            {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
          </div>

          {activeTab === "create" ? (
            <div className="mx-auto max-w-3xl space-y-4 p-4">
              <div className="rounded-xl border border-slate-800 bg-[#13131f] p-4 text-xs leading-5 text-slate-400">
                관리자가 생성한 리뷰는 <span className="text-slate-200">구매 인증 배지가 붙지 않습니다</span>.
                구매 인증은 실제 결제·이용 기록이 있는 리뷰에만 표시되는 사실 정보이기 때문입니다.
                일반 사용자 화면에서는 다른 리뷰와 동일한 카드로 노출됩니다.
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300" htmlFor="seed-product">상품</label>
                <select
                  id="seed-product"
                  value={seed.productId}
                  onChange={(event) => setSeed((prev) => ({ ...prev, productId: event.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                >
                  <option value="">상품을 선택하세요</option>
                  {products.map((product) => (
                    <option key={product.productId} value={product.productId}>
                      {product.name} (현재 {product.total}개 · 평균 {product.average || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300" htmlFor="seed-user">사용자 ID (선택)</label>
                  <input
                    id="seed-user"
                    value={seed.userId}
                    onChange={(event) => setSeed((prev) => ({ ...prev, userId: event.target.value }))}
                    placeholder="24자리 ObjectId"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300" htmlFor="seed-nickname">닉네임</label>
                  <input
                    id="seed-nickname"
                    value={seed.authorName}
                    onChange={(event) => setSeed((prev) => ({ ...prev, authorName: event.target.value }))}
                    placeholder="행복한별"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300" htmlFor="seed-image">프로필 이미지 URL (선택)</label>
                <input
                  id="seed-image"
                  value={seed.authorImage}
                  onChange={(event) => setSeed((prev) => ({ ...prev, authorImage: event.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-300">평점</span>
                <StarPicker value={seed.rating} onChange={(rating) => setSeed((prev) => ({ ...prev, rating }))} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300" htmlFor="seed-title">리뷰 제목 (선택)</label>
                <input
                  id="seed-title"
                  value={seed.title}
                  onChange={(event) => setSeed((prev) => ({ ...prev, title: event.target.value }))}
                  maxLength={60}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300" htmlFor="seed-body">리뷰 내용</label>
                <textarea
                  id="seed-body"
                  value={seed.body}
                  onChange={(event) => setSeed((prev) => ({ ...prev, body: event.target.value }))}
                  rows={6}
                  maxLength={1000}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm leading-6 outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300" htmlFor="seed-date">작성 날짜 (선택)</label>
                  <input
                    id="seed-date"
                    type="datetime-local"
                    value={seed.displayedAt}
                    onChange={(event) => setSeed((prev) => ({ ...prev, displayedAt: event.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300" htmlFor="seed-status">공개 여부</label>
                  <select
                    id="seed-status"
                    value={seed.status}
                    onChange={(event) => setSeed((prev) => ({ ...prev, status: event.target.value as SeedForm["status"] }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                  >
                    <option value="approved">즉시 공개</option>
                    <option value="pending">검수 상태</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                <button type="button" onClick={() => { void createSeedReview(); }} disabled={busy} className={commandButtonClass("primary")}>
                  <Plus className="h-4 w-4" />
                  리뷰 생성
                </button>
                <button type="button" onClick={() => setSeed(EMPTY_SEED)} disabled={busy} className={commandButtonClass()}>
                  초기화
                </button>
              </div>
            </div>
          ) : !draft ? (
            <div className="p-6 text-sm text-slate-400">
              <p>왼쪽 목록에서 검수할 리뷰를 선택하세요.</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                사용자가 작성한 리뷰는 항상 검수 대기 상태로 저장되며, 승인해야 리뷰 페이지에 노출됩니다.
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4 p-4">
              <div className="rounded-xl border border-slate-800 bg-[#13131f] p-4 text-xs leading-5 text-slate-400">
                <p>작성자 ID: <span className="text-slate-200">{draft.userId || "(익명 시딩)"}</span></p>
                <p>featureKey: <span className="text-slate-200">{draft.featureKey || "-"}</span> · 주문: <span className="text-slate-200">{draft.orderId || "-"}</span></p>
                <p>작성일: <span className="text-slate-200">{formatDate(draft.createdAt)}</span> · 승인일: <span className="text-slate-200">{formatDate(draft.approvedAt)}</span></p>
                <p>구매 인증: <span className="text-slate-200">{draft.isVerifiedPurchase ? "예" : "아니오"}</span> · 관리자 작성: <span className="text-slate-200">{draft.createdByAdmin ? "예" : "아니오"}</span></p>
                {draft.autoFlagReasons.length ? (
                  <p className="mt-1 text-rose-300">
                    🚩 자동 필터: {draft.autoFlagReasons.map((flag) => FLAG_LABELS[flag] || flag).join(", ")}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300" htmlFor="edit-product">상품</label>
                <select
                  id="edit-product"
                  value={draft.productId}
                  onChange={(event) => setDraft((prev) => (prev ? { ...prev, productId: event.target.value } : prev))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                >
                  {products.map((product) => (
                    <option key={product.productId} value={product.productId}>{product.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300" htmlFor="edit-author">닉네임</label>
                  <input
                    id="edit-author"
                    value={draft.authorName}
                    onChange={(event) => setDraft((prev) => (prev ? { ...prev, authorName: event.target.value } : prev))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300" htmlFor="edit-date">노출 날짜</label>
                  <input
                    id="edit-date"
                    type="datetime-local"
                    value={toDateTimeLocalValue(draft.displayedAt)}
                    onChange={(event) => setDraft((prev) => (prev ? { ...prev, displayedAt: event.target.value ? new Date(event.target.value).toISOString() : "" } : prev))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-300">평점</span>
                <StarPicker value={draft.rating} onChange={(rating) => setDraft((prev) => (prev ? { ...prev, rating } : prev))} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300" htmlFor="edit-title">제목</label>
                <input
                  id="edit-title"
                  value={draft.title}
                  onChange={(event) => setDraft((prev) => (prev ? { ...prev, title: event.target.value } : prev))}
                  maxLength={60}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300" htmlFor="edit-body">내용</label>
                <textarea
                  id="edit-body"
                  value={draft.body}
                  onChange={(event) => setDraft((prev) => (prev ? { ...prev, body: event.target.value } : prev))}
                  rows={8}
                  maxLength={1000}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm leading-6 outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300" htmlFor="edit-note">검수 메모 (관리자 전용)</label>
                <textarea
                  id="edit-note"
                  value={draft.adminNote}
                  onChange={(event) => setDraft((prev) => (prev ? { ...prev, adminNote: event.target.value } : prev))}
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                <button type="button" onClick={() => { void saveDraft(); }} disabled={busy} className={commandButtonClass("primary")}>
                  <Save className="h-4 w-4" />
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => { void updateStatus(draft.id, "approved"); }}
                  disabled={busy || draft.status === "approved"}
                  className={commandButtonClass("success")}
                >
                  <Check className="h-4 w-4" />
                  승인
                </button>
                <button
                  type="button"
                  onClick={() => { void updateStatus(draft.id, "rejected"); }}
                  disabled={busy || draft.status === "rejected"}
                  className={commandButtonClass("warn")}
                >
                  <X className="h-4 w-4" />
                  반려
                </button>
                <button type="button" onClick={() => { void removeReview(draft.id); }} disabled={busy} className={commandButtonClass("danger")}>
                  <Trash2 className="h-4 w-4" />
                  삭제
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
