"use client";

import Link from "next/link";
import { ExternalLink, LogOut, RefreshCw, RotateCcw, Save, Search, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../../_lib/api-config";
import { publishedCelebritySajuSeeds } from "@/lib/famous-saju/celebrity-data";
import { buildCelebrityReading } from "@/lib/famous-saju/celebrity-saju-service";
import { mockChapters, mockStories } from "@/lib/stories/data";
import type { IStory } from "@/lib/stories/types";

type OverrideSource = "famous-saju" | "story" | "chapter";
type OverrideStatus = "draft" | "published";

interface OverrideItem {
  source: OverrideSource;
  key: string;
  fields: Record<string, string>;
  status: OverrideStatus;
  updatedAt?: string | null;
}

interface FieldDef {
  name: string;
  label: string;
  kind: "input" | "textarea";
  rows?: number;
}

interface BaseEntry {
  source: OverrideSource;
  key: string;
  title: string;
  subtitle: string;
}

const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
const LOCAL_ADMIN_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

const SOURCE_TABS: Array<{ value: OverrideSource; label: string }> = [
  { value: "famous-saju", label: "유명인 사주" },
  { value: "story", label: "소설" },
  { value: "chapter", label: "회차" },
];

const FIELD_DEFS: Record<OverrideSource, FieldDef[]> = {
  "famous-saju": [
    { name: "shortDescription", label: "목록 소개문 (shortDescription)", kind: "textarea", rows: 3 },
    { name: "heroCopy", label: "히어로 문장 (heroCopy)", kind: "textarea", rows: 4 },
    { name: "summary", label: "요약 (summary)", kind: "textarea", rows: 5 },
    { name: "conclusion", label: "맺음말 (conclusion)", kind: "textarea", rows: 5 },
    { name: "seoTitle", label: "SEO 제목 (seoTitle)", kind: "input" },
    { name: "seoDescription", label: "SEO 설명 (seoDescription)", kind: "textarea", rows: 3 },
  ],
  story: [
    { name: "title", label: "소설 제목", kind: "input" },
    { name: "description", label: "소설 소개", kind: "textarea", rows: 4 },
  ],
  chapter: [
    { name: "title", label: "회차 제목", kind: "input" },
    { name: "content", label: "본문 (줄바꿈 그대로 유지)", kind: "textarea", rows: 24 },
  ],
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

  try {
    const token = String(localStorage.getItem("flower_admin_token") || "").trim();
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
  try { localStorage.removeItem("flower_admin_token"); } catch {}
  try { localStorage.removeItem("flower_admin_password_ok"); } catch {}
}

function commandButtonClass(tone: "neutral" | "primary" | "success" | "warn" = "neutral"): string {
  if (tone === "primary") return "inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50";
  if (tone === "success") return "inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50";
  if (tone === "warn") return "inline-flex items-center gap-2 rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50";
  return "inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 hover:border-slate-500 disabled:opacity-50";
}

function overrideBadgeClass(status?: OverrideStatus | ""): string {
  if (status === "published") return "border-emerald-700 bg-emerald-950 text-emerald-200";
  if (status === "draft") return "border-amber-700 bg-amber-950 text-amber-200";
  return "border-slate-700 bg-slate-900 text-slate-400";
}

function overrideBadgeLabel(status?: OverrideStatus | ""): string {
  if (status === "published") return "발행됨";
  if (status === "draft") return "임시저장";
  return "기본값";
}

function overrideMapKey(source: OverrideSource, key: string): string {
  return `${source}::${key}`;
}

function buildBaseValues(entry: BaseEntry): Record<string, string> {
  if (entry.source === "famous-saju") {
    const seed = publishedCelebritySajuSeeds.find((item) => item.slug === entry.key);
    if (!seed) return {};
    const article = buildCelebrityReading(seed);
    return {
      shortDescription: seed.shortDescription || "",
      heroCopy: article.heroCopy || "",
      summary: article.summary || "",
      conclusion: article.conclusion || "",
      seoTitle: article.seoTitle || "",
      seoDescription: article.seoDescription || "",
    };
  }

  if (entry.source === "story") {
    const story = mockStories.find((item) => !("storyId" in item) && (item as IStory).slug === entry.key) as IStory | undefined;
    return story ? { title: story.title || "", description: story.description || "" } : {};
  }

  const chapter = mockChapters.find((item) => item._id === entry.key);
  return chapter ? { title: chapter.title || "", content: chapter.content || "" } : {};
}

export default function AdminSiteContentPage() {
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const endpointBase = `${apiBase || ""}/api/admin/site-content/overrides`;
  const deployEndpoint = `${apiBase || ""}/api/admin/site-deploy`;
  const requestCredentials = useMemo(() => resolveAdminRequestCredentials(apiBase), [apiBase]);

  const [activeTab, setActiveTab] = useState<OverrideSource>("famous-saju");
  const [searchInput, setSearchInput] = useState("");
  const [overrides, setOverrides] = useState<Record<string, OverrideItem>>({});
  const [selected, setSelected] = useState<BaseEntry | null>(null);
  const [baseValues, setBaseValues] = useState<Record<string, string>>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deployNotice, setDeployNotice] = useState("");

  const baseEntries = useMemo<BaseEntry[]>(() => {
    if (activeTab === "famous-saju") {
      return publishedCelebritySajuSeeds.map((seed) => ({
        source: "famous-saju" as const,
        key: seed.slug,
        title: seed.nameKo,
        subtitle: `${seed.category} · /famous-saju/${seed.slug}`,
      }));
    }
    if (activeTab === "story") {
      return mockStories
        .filter((item) => !("storyId" in item))
        .map((story) => ({
          source: "story" as const,
          key: (story as IStory).slug,
          title: story.title,
          subtitle: `/stories/${(story as IStory).slug}`,
        }));
    }
    return mockChapters.map((chapter) => ({
      source: "chapter" as const,
      key: chapter._id,
      title: chapter.title,
      subtitle: `${chapter.chapterNumber}화 · ${chapter._id}`,
    }));
  }, [activeTab]);

  const filteredEntries = useMemo(() => {
    const keyword = searchInput.trim().toLowerCase();
    if (!keyword) return baseEntries;
    return baseEntries.filter((entry) =>
      entry.title.toLowerCase().includes(keyword)
      || entry.key.toLowerCase().includes(keyword)
      || entry.subtitle.toLowerCase().includes(keyword));
  }, [baseEntries, searchInput]);

  const redirectToLogin = useCallback(() => {
    clearAdminToken();
    const next = typeof window === "undefined" ? "/admin/site-content" : `${window.location.pathname}${window.location.search}`;
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

  const loadOverrides = useCallback(async () => {
    try {
      const res = await fetch(endpointBase, {
        method: "GET",
        credentials: requestCredentials,
        headers: buildAdminHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (handleAuthFailure(res.status)) return;
      if (!res.ok) {
        setError(String(data?.message || "수정본 목록을 불러오지 못했습니다."));
        return;
      }
      const map: Record<string, OverrideItem> = {};
      for (const item of (Array.isArray(data?.items) ? data.items : []) as OverrideItem[]) {
        if (item?.source && item?.key) map[overrideMapKey(item.source, item.key)] = item;
      }
      setOverrides(map);
    } catch {
      setError("수정본 목록 요청에 실패했습니다.");
    }
  }, [endpointBase, handleAuthFailure, requestCredentials]);

  useEffect(() => {
    void loadOverrides();
  }, [loadOverrides]);

  const selectEntry = useCallback(async (entry: BaseEntry) => {
    setSelected(entry);
    setMessage("");
    setError("");
    setLoadingDetail(true);

    const base = buildBaseValues(entry);
    setBaseValues(base);

    try {
      const res = await fetch(`${endpointBase}/${entry.source}/${encodeURIComponent(entry.key)}`, {
        method: "GET",
        credentials: requestCredentials,
        headers: buildAdminHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (handleAuthFailure(res.status)) return;

      const item = res.ok && data?.item ? (data.item as OverrideItem) : null;
      if (item) setOverrides((prev) => ({ ...prev, [overrideMapKey(item.source, item.key)]: item }));

      const values: Record<string, string> = {};
      for (const field of FIELD_DEFS[entry.source]) {
        const overrideValue = item?.fields?.[field.name];
        values[field.name] = typeof overrideValue === "string" && overrideValue ? overrideValue : base[field.name] || "";
      }
      setFormValues(values);
    } catch {
      setError("수정본 조회에 실패했습니다. 기본값으로 편집합니다.");
      const values: Record<string, string> = {};
      for (const field of FIELD_DEFS[entry.source]) values[field.name] = base[field.name] || "";
      setFormValues(values);
    } finally {
      setLoadingDetail(false);
    }
  }, [endpointBase, handleAuthFailure, requestCredentials]);

  const saveOverride = useCallback(async (status: OverrideStatus) => {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    setError("");

    const changedFields: Record<string, string> = {};
    for (const field of FIELD_DEFS[selected.source]) {
      const value = String(formValues[field.name] || "");
      if (value.trim() && value !== (baseValues[field.name] || "")) changedFields[field.name] = value;
    }

    try {
      if (!Object.keys(changedFields).length) {
        setError("기본값과 동일합니다. 저장할 변경 사항이 없습니다. (기본값으로 되돌리려면 아래 버튼을 사용하세요)");
        return;
      }

      const res = await fetch(`${endpointBase}/${selected.source}/${encodeURIComponent(selected.key)}`, {
        method: "PUT",
        credentials: requestCredentials,
        headers: buildAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ fields: changedFields, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (handleAuthFailure(res.status)) return;
      if (!res.ok) {
        setError(String(data?.message || "저장에 실패했습니다."));
        return;
      }

      const item = data?.item as OverrideItem | undefined;
      if (item?.source && item?.key) setOverrides((prev) => ({ ...prev, [overrideMapKey(item.source, item.key)]: item }));
      setMessage(status === "published" ? "발행 상태로 저장했습니다. '사이트 반영'을 눌러야 실제 사이트에 적용됩니다." : "임시저장했습니다. (발행 전에는 사이트에 반영되지 않습니다)");
    } catch {
      setError("저장 요청에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [baseValues, endpointBase, formValues, handleAuthFailure, requestCredentials, selected]);

  const unpublishOverride = useCallback(async () => {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${endpointBase}/${selected.source}/${encodeURIComponent(selected.key)}/publish-status`, {
        method: "POST",
        credentials: requestCredentials,
        headers: buildAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: "draft" }),
      });
      const data = await res.json().catch(() => ({}));
      if (handleAuthFailure(res.status)) return;
      if (!res.ok) {
        setError(String(data?.message || "발행 해제에 실패했습니다."));
        return;
      }

      const item = data?.item as OverrideItem | undefined;
      if (item?.source && item?.key) setOverrides((prev) => ({ ...prev, [overrideMapKey(item.source, item.key)]: item }));
      setMessage("발행을 해제했습니다. 다음 '사이트 반영'부터 기본값이 노출됩니다.");
    } catch {
      setError("발행 해제 요청에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [endpointBase, handleAuthFailure, requestCredentials, selected]);

  const resetOverride = useCallback(async () => {
    if (!selected) return;
    if (typeof window !== "undefined" && !window.confirm("저장된 수정본을 삭제하고 기본값으로 되돌릴까요?")) return;
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${endpointBase}/${selected.source}/${encodeURIComponent(selected.key)}`, {
        method: "DELETE",
        credentials: requestCredentials,
        headers: buildAdminHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (handleAuthFailure(res.status)) return;
      if (!res.ok && res.status !== 404) {
        setError(String(data?.message || "되돌리기에 실패했습니다."));
        return;
      }

      setOverrides((prev) => {
        const next = { ...prev };
        delete next[overrideMapKey(selected.source, selected.key)];
        return next;
      });
      const values: Record<string, string> = {};
      for (const field of FIELD_DEFS[selected.source]) values[field.name] = baseValues[field.name] || "";
      setFormValues(values);
      setMessage("기본값으로 되돌렸습니다. 다음 '사이트 반영'부터 적용됩니다.");
    } catch {
      setError("되돌리기 요청에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [baseValues, endpointBase, handleAuthFailure, requestCredentials, selected]);

  const triggerSiteDeploy = useCallback(async () => {
    setDeploying(true);
    setDeployNotice("");
    setError("");

    try {
      const res = await fetch(deployEndpoint, {
        method: "POST",
        credentials: requestCredentials,
        headers: buildAdminHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (handleAuthFailure(res.status)) return;
      if (!res.ok) {
        if (String(data?.code || "") === "DEPLOY_TOKEN_MISSING") {
          setDeployNotice("배포 토큰(GITHUB_DEPLOY_TOKEN)이 워커에 설정되지 않았습니다. 설정 후 다시 시도하세요.");
        } else {
          setDeployNotice(String(data?.message || "사이트 반영 트리거에 실패했습니다."));
        }
        return;
      }

      const time = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      setDeployNotice(`배포 트리거됨 ${time} — 빌드 완료까지 수 분 걸립니다. 발행된 수정본만 반영됩니다.`);
    } catch {
      setDeployNotice("사이트 반영 요청에 실패했습니다.");
    } finally {
      setDeploying(false);
    }
  }, [deployEndpoint, handleAuthFailure, requestCredentials]);

  const selectedOverride = selected ? overrides[overrideMapKey(selected.source, selected.key)] : undefined;

  return (
    <main className="min-h-screen bg-[#0d0f18] text-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[360px_1fr]">
        <aside className="border-b border-slate-800 bg-[#10121b] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <h1 className="text-base font-semibold">사이트 콘텐츠 편집</h1>
              <p className="text-xs text-slate-400">유명인 사주 · 소설 · 회차</p>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/content" className={commandButtonClass()} aria-label="글 편집으로 이동">
                <ExternalLink className="h-4 w-4" />
                글 편집
              </Link>
              <button type="button" onClick={redirectToLogin} className={commandButtonClass()} aria-label="로그아웃">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3 border-b border-slate-800 p-4">
            <div className="grid grid-cols-3 gap-2">
              {SOURCE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => { setActiveTab(tab.value); setSelected(null); }}
                  className={activeTab === tab.value
                    ? "rounded-lg border border-violet-500 bg-violet-950 px-2 py-2 text-xs text-violet-100"
                    : "rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-300 hover:border-slate-500"}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-500"
                placeholder="이름/슬러그/제목 검색"
                aria-label="콘텐츠 검색"
              />
            </div>
          </div>

          <div className="max-h-[calc(100vh-196px)] overflow-y-auto">
            {filteredEntries.length === 0 ? (
              <div className="p-4 text-sm text-slate-400">항목이 없습니다.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filteredEntries.map((entry) => {
                  const override = overrides[overrideMapKey(entry.source, entry.key)];
                  const active = selected?.source === entry.source && selected?.key === entry.key;
                  return (
                    <button
                      key={overrideMapKey(entry.source, entry.key)}
                      type="button"
                      onClick={() => { void selectEntry(entry); }}
                      className={`w-full px-4 py-3 text-left hover:bg-slate-900 ${active ? "bg-slate-900" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-medium text-slate-100">{entry.title}</p>
                        <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[11px] ${overrideBadgeClass(override?.status)}`}>
                          {overrideBadgeLabel(override?.status)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">{entry.subtitle}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="sticky top-0 z-20 border-b border-slate-800 bg-[#0d0f18]/95 px-4 py-3 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded-lg border px-2 py-0.5 text-xs ${overrideBadgeClass(selectedOverride?.status)}`}>
                    {overrideBadgeLabel(selectedOverride?.status)}
                  </span>
                  <span className="truncate text-xs text-slate-400">{selected ? `${selected.source} / ${selected.key}` : "왼쪽에서 항목을 선택하세요"}</span>
                  {loadingDetail ? <span className="text-xs text-slate-400">불러오는 중...</span> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { void triggerSiteDeploy(); }} disabled={deploying} className={commandButtonClass("success")}>
                  <RefreshCw className={`h-4 w-4 ${deploying ? "animate-spin" : ""}`} />
                  사이트 반영
                </button>
              </div>
            </div>
            {deployNotice ? <p className="mt-2 text-xs text-emerald-200">{deployNotice}</p> : null}
            {message ? <p className="mt-2 text-xs text-sky-200">{message}</p> : null}
            {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
          </div>

          {!selected ? (
            <div className="p-6 text-sm text-slate-400">
              <p>왼쪽 목록에서 편집할 콘텐츠를 선택하세요.</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                저장(임시저장/발행)은 DB에 수정본으로 기록되고, 상단의 &quot;사이트 반영&quot; 버튼을 눌러 재빌드가 끝나야 실제 사이트에 나타납니다.
                발행 해제/되돌리기도 다음 사이트 반영부터 적용됩니다.
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4 p-4">
              <h2 className="text-lg font-semibold">{selected.title}</h2>
              {FIELD_DEFS[selected.source].map((field) => (
                <div key={field.name} className="space-y-1">
                  <label className="text-xs font-medium text-slate-300" htmlFor={`field-${field.name}`}>{field.label}</label>
                  {field.kind === "textarea" ? (
                    <textarea
                      id={`field-${field.name}`}
                      value={formValues[field.name] || ""}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                      rows={field.rows || 4}
                      className="w-full whitespace-pre-wrap rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm leading-6 outline-none focus:border-violet-500"
                    />
                  ) : (
                    <input
                      id={`field-${field.name}`}
                      value={formValues[field.name] || ""}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                    />
                  )}
                  {formValues[field.name] !== (baseValues[field.name] || "") ? (
                    <p className="text-[11px] text-amber-200/80">기본값에서 수정됨</p>
                  ) : null}
                </div>
              ))}

              <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                <button type="button" onClick={() => { void saveOverride("draft"); }} disabled={saving} className={commandButtonClass()}>
                  <Save className="h-4 w-4" />
                  임시저장
                </button>
                <button type="button" onClick={() => { void saveOverride("published"); }} disabled={saving} className={commandButtonClass("primary")}>
                  <Send className="h-4 w-4" />
                  발행
                </button>
                {selectedOverride?.status === "published" ? (
                  <button type="button" onClick={() => { void unpublishOverride(); }} disabled={saving} className={commandButtonClass("warn")}>
                    발행 해제
                  </button>
                ) : null}
                {selectedOverride ? (
                  <button type="button" onClick={() => { void resetOverride(); }} disabled={saving} className={commandButtonClass("warn")}>
                    <RotateCcw className="h-4 w-4" />
                    기본값으로 되돌리기
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
