"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import {
  CMS_CHANNELS,
  CMS_GROUPS,
  CMS_NAMESPACES,
  CMS_STATUS_LABELS,
  getCmsNamespace,
  isValidCmsKey,
} from "@/lib/cms/registry.mjs";
import { AdminApiError, adminFetch, describeAdminError } from "../_lib/admin-api";
import { loadBaseEntries, type CmsBaseEntry } from "./_lib/base-values";
import FieldEditor, { type CmsFieldDef } from "./_components/FieldEditor";
import RevisionPanel, { type CmsRevision } from "./_components/RevisionPanel";
import BeatsEditor from "./_components/BeatsEditor";
import RecordEditor from "./_components/RecordEditor";

type Fields = Record<string, unknown>;

interface CmsEntryItem {
  namespace: string;
  key: string;
  locale: string;
  fields: Fields;
  status: string;
  channel: string;
  version: number;
  note: string;
  updatedBy: string;
  updatedAt: string | null;
}

interface CmsNamespaceDef {
  ns: string;
  label: string;
  group: string;
  channel: "runtime" | "build";
  editor: string;
  listSource: string;
  description: string;
  fields: CmsFieldDef[];
  entries?: Array<{ key: string; label: string; hint?: string }>;
  constraints?: { beatMaxLength?: number; forbiddenInBeat?: string[]; minKoreanCharsPerEpisode?: number };
}

const NAMESPACES = CMS_NAMESPACES as unknown as CmsNamespaceDef[];
const AUTOSAVE_DELAY_MS = 3000;
const LOCAL_DRAFT_PREFIX = "cd-cms-draft:";

function entryId(ns: string, key: string): string {
  return `${ns}::${key}`;
}

function statusBadgeClass(status: string): string {
  if (status === "published") return "border-emerald-800 bg-emerald-950 text-emerald-200";
  if (status === "scheduled") return "border-sky-800 bg-sky-950 text-sky-200";
  if (status === "review") return "border-violet-800 bg-violet-950 text-violet-200";
  if (status === "draft") return "border-amber-800 bg-amber-950 text-amber-200";
  if (status === "archived") return "border-slate-700 bg-slate-900 text-slate-400";
  return "border-slate-800 bg-slate-900 text-slate-500";
}

function buttonClass(tone: "neutral" | "primary" | "success" | "warn" | "danger" = "neutral"): string {
  const base = "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50";
  if (tone === "primary") return `${base} bg-violet-600 text-white hover:bg-violet-500`;
  if (tone === "success") return `${base} bg-emerald-700 text-white hover:bg-emerald-600`;
  if (tone === "warn") return `${base} bg-amber-700 text-white hover:bg-amber-600`;
  if (tone === "danger") return `${base} border border-rose-800 text-rose-200 hover:bg-rose-950`;
  return `${base} border border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-500`;
}

/** 저장 페이로드에서 화면 표시 전용 필드를 걷어낸다(라이트 노벨의 화자 표시 등). */
function stripDisplayOnlyFields(ns: string, fields: Fields): Fields {
  if (ns !== "light-novel") return fields;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 구조 분해로 화자 표시 필드만 걷어낸다
  const { beatSpeakers, ...rest } = fields;
  return rest;
}

function equalFields(a: Fields, b: Fields): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function AdminCmsPage() {
  const [activeNs, setActiveNs] = useState<string>(NAMESPACES[0]?.ns || "");
  const [baseEntries, setBaseEntries] = useState<CmsBaseEntry[]>([]);
  const [baseLoading, setBaseLoading] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, CmsEntryItem>>({});
  const [selectedKey, setSelectedKey] = useState("");
  const [draft, setDraft] = useState<Fields>({});
  const [revisions, setRevisions] = useState<CmsRevision[]>([]);
  const [keyword, setKeyword] = useState("");
  const [saving, setSaving] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState<string>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const [deploying, setDeploying] = useState(false);

  const namespace = useMemo(() => (getCmsNamespace(activeNs) as unknown as CmsNamespaceDef | null), [activeNs]);
  const channel = namespace ? CMS_CHANNELS[namespace.channel] : null;

  const baseByKey = useMemo(() => {
    const map: Record<string, CmsBaseEntry> = {};
    for (const entry of baseEntries) map[entry.key] = entry;
    return map;
  }, [baseEntries]);

  /** 목록 = 코드 기준값(있으면) + 운영자가 만든 항목. 둘 다 없는 그룹은 빈 목록. */
  const listItems = useMemo(() => {
    const items: Array<{ key: string; label: string; hint: string }> = [];
    const seen = new Set<string>();

    if (namespace?.listSource === "static" && namespace.entries) {
      for (const entry of namespace.entries) {
        items.push({ key: entry.key, label: entry.label, hint: entry.hint || "" });
        seen.add(entry.key);
      }
    }
    for (const entry of baseEntries) {
      if (seen.has(entry.key)) continue;
      items.push({ key: entry.key, label: entry.label, hint: entry.hint || "" });
      seen.add(entry.key);
    }
    for (const item of Object.values(overrides)) {
      if (item.namespace !== activeNs || seen.has(item.key)) continue;
      items.push({ key: item.key, label: item.key, hint: "운영자 추가" });
      seen.add(item.key);
    }

    const needle = keyword.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => {
      const override = overrides[entryId(activeNs, item.key)];
      const haystack = `${item.label} ${item.key} ${item.hint} ${override ? JSON.stringify(override.fields) : ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [namespace, baseEntries, overrides, activeNs, keyword]);

  const selectedOverride = selectedKey ? overrides[entryId(activeNs, selectedKey)] : undefined;
  const selectedBase = selectedKey ? baseByKey[selectedKey] : undefined;

  const effectiveBaseFields = useMemo<Fields>(() => selectedBase?.fields || {}, [selectedBase]);

  const dirty = useMemo(() => {
    const saved = selectedOverride?.fields || {};
    const comparable = stripDisplayOnlyFields(activeNs, draft);
    if (Object.keys(saved).length) return !equalFields(comparable, saved);
    return !equalFields(comparable, stripDisplayOnlyFields(activeNs, effectiveBaseFields));
  }, [draft, selectedOverride, effectiveBaseFields, activeNs]);

  // ── 목록/기준값 로딩 ────────────────────────────────────────────────────────
  const loadOverrides = useCallback(async (ns: string) => {
    try {
      const data = await adminFetch<{ items?: CmsEntryItem[]; stale?: boolean }>(
        `/api/admin/cms/entries?ns=${encodeURIComponent(ns)}`,
      );
      const map: Record<string, CmsEntryItem> = {};
      for (const item of data?.items || []) map[entryId(item.namespace, item.key)] = item;
      setOverrides(map);
      setStale(Boolean(data?.stale));
      setError("");
    } catch (caught) {
      setError(describeAdminError(caught, "수정본 목록을 불러오지 못했습니다.").message);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSelectedKey("");
    setDraft({});
    setRevisions([]);
    setMessage("");
    setBaseLoading(true);

    void (async () => {
      const entries = await loadBaseEntries(activeNs);
      if (cancelled) return;
      setBaseEntries(entries);
      setBaseLoading(false);
    })();
    void loadOverrides(activeNs);

    return () => { cancelled = true; };
  }, [activeNs, loadOverrides]);

  // ── 항목 선택 ──────────────────────────────────────────────────────────────
  const selectEntry = useCallback((key: string) => {
    setSelectedKey(key);
    setMessage("");
    setError("");

    const override = overrides[entryId(activeNs, key)];
    const base = baseByKey[key];

    // 브라우저를 닫았다 와도 이어서 쓸 수 있게 로컬 초안을 먼저 본다.
    let local: Fields | null = null;
    try {
      const raw = window.localStorage.getItem(`${LOCAL_DRAFT_PREFIX}${entryId(activeNs, key)}`);
      if (raw) local = JSON.parse(raw) as Fields;
    } catch { /* 손상된 초안은 무시하고 서버 값으로 간다 */ }

    setDraft({ ...(base?.fields || {}), ...(override?.fields || {}), ...(local || {}) });
    setRevisions([]);

    void adminFetch<{ items?: CmsRevision[] }>(
      `/api/admin/cms/entries/${encodeURIComponent(activeNs)}/${encodeURIComponent(key)}/revisions`,
    )
      .then((data) => setRevisions(data?.items || []))
      .catch(() => setRevisions([]));
  }, [activeNs, overrides, baseByKey]);

  // ── 저장 ───────────────────────────────────────────────────────────────────
  /* 저장이 겹치면 나중에 도착한 응답이 앞선 것을 덮는다. 실제로 자동저장 타이머가 도는 중에
     '발행'을 누르면 뒤이어 도착한 자동저장(draft)이 발행을 되돌려, 발행이 안 되는 것처럼 보였다.
     그래서 ① 명시적 저장은 대기 중 자동저장 타이머를 먼저 취소하고 ② 저장이 진행 중이면
     자동저장은 건너뛴다(명시적 저장은 절대 건너뛰지 않는다 — 운영자 의도가 우선). */
  const savingRef = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingAutoSave = useCallback(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
  }, []);

  const save = useCallback(async (status: string, options: { silent?: boolean } = {}) => {
    if (!selectedKey || !namespace) return;
    if (options.silent && savingRef.current) return;

    cancelPendingAutoSave();
    savingRef.current = true;
    setSaving(true);
    if (!options.silent) { setMessage(""); setError(""); }

    try {
      const payload: Record<string, unknown> = {
        fields: stripDisplayOnlyFields(activeNs, draft),
        status,
      };
      const data = await adminFetch<{ item?: CmsEntryItem }>(
        `/api/admin/cms/entries/${encodeURIComponent(activeNs)}/${encodeURIComponent(selectedKey)}`,
        { method: "PUT", body: payload },
      );

      if (data?.item) {
        setOverrides((prev) => ({ ...prev, [entryId(data.item!.namespace, data.item!.key)]: data.item! }));
        // 서버가 정규화한 값(빈 필드 제거·길이 절단)으로 편집본을 되맞춘다.
        // 안 그러면 draft 와 저장본이 영영 달라 "저장되지 않은 변경"이 가라앉지 않고,
        // 자동저장이 계속 재점화된다.
        setDraft((prev) => ({ ...prev, ...data.item!.fields }));
      }
      try { window.localStorage.removeItem(`${LOCAL_DRAFT_PREFIX}${entryId(activeNs, selectedKey)}`); } catch { /* 무시 */ }

      if (options.silent) {
        setAutoSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      } else {
        setMessage(status === "published"
          ? (namespace.channel === "runtime"
            ? "발행했습니다. 다음 요청부터 바로 적용됩니다."
            : "발행했습니다. 상단 '사이트 반영'을 눌러야 실제 사이트에 나타납니다.")
          : `${CMS_STATUS_LABELS[status] || status} 상태로 저장했습니다.`);
      }
    } catch (caught) {
      setError(describeAdminError(caught, "저장에 실패했습니다.").message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [selectedKey, namespace, activeNs, draft, cancelPendingAutoSave]);

  // ── 3초 자동 저장 ──────────────────────────────────────────────────────────
  const savedStatus = selectedOverride?.status;
  useEffect(() => {
    if (!selectedKey || !dirty) return undefined;

    // 서버가 잠깐 죽어도 작업물이 날아가지 않게 로컬에도 즉시 남긴다.
    try {
      window.localStorage.setItem(`${LOCAL_DRAFT_PREFIX}${entryId(activeNs, selectedKey)}`, JSON.stringify(draft));
    } catch { /* 용량 초과 등은 무시 — 서버 자동저장이 본선이다 */ }

    cancelPendingAutoSave();
    autoSaveTimer.current = setTimeout(() => {
      // 발행본은 자동저장하지 않는다. 자동으로 임시저장으로 되돌리면 사이트에서 문구가 사라진다.
      if (savedStatus === "published") return;
      // 상태를 draft 로 못박지 않고 지금 상태를 유지한다 — 검수 대기 중인 항목을
      // 타이핑했다는 이유로 임시저장으로 강등시키지 않기 위함이다.
      void save(savedStatus || "draft", { silent: true });
    }, AUTOSAVE_DELAY_MS);

    return cancelPendingAutoSave;
  }, [draft, dirty, selectedKey, activeNs, save, savedStatus, cancelPendingAutoSave]);

  // ── 기타 동작 ──────────────────────────────────────────────────────────────
  const revertToBase = useCallback(async () => {
    if (!selectedKey) return;
    if (!window.confirm("저장된 수정본을 삭제하고 코드 기본값으로 되돌릴까요?")) return;

    setSaving(true);
    try {
      if (selectedOverride) {
        await adminFetch(`/api/admin/cms/entries/${encodeURIComponent(activeNs)}/${encodeURIComponent(selectedKey)}`, { method: "DELETE" });
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[entryId(activeNs, selectedKey)];
          return next;
        });
      }
      try { window.localStorage.removeItem(`${LOCAL_DRAFT_PREFIX}${entryId(activeNs, selectedKey)}`); } catch { /* 무시 */ }
      setDraft({ ...effectiveBaseFields });
      setMessage("기본값으로 되돌렸습니다.");
    } catch (caught) {
      setError(describeAdminError(caught, "되돌리기에 실패했습니다.").message);
    } finally {
      setSaving(false);
    }
  }, [selectedKey, selectedOverride, activeNs, effectiveBaseFields]);

  const restoreRevision = useCallback(async (version: number) => {
    if (!selectedKey) return;
    setSaving(true);
    try {
      const data = await adminFetch<{ item?: CmsEntryItem }>(
        `/api/admin/cms/entries/${encodeURIComponent(activeNs)}/${encodeURIComponent(selectedKey)}/restore`,
        { method: "POST", body: { version } },
      );
      if (data?.item) {
        setOverrides((prev) => ({ ...prev, [entryId(activeNs, selectedKey)]: data.item! }));
        setDraft({ ...effectiveBaseFields, ...data.item.fields });
      }
      setMessage(`v${version} 내용으로 복원했습니다. 확인 후 발행해 주세요.`);
    } catch (caught) {
      setError(describeAdminError(caught, "복원에 실패했습니다.").message);
    } finally {
      setSaving(false);
    }
  }, [selectedKey, activeNs, effectiveBaseFields]);

  const createEntry = useCallback(() => {
    const raw = window.prompt("새 항목의 키를 입력하세요. (영문 소문자·숫자·하이픈)");
    const key = String(raw || "").trim().toLowerCase();
    if (!key) return;
    if (!isValidCmsKey(key)) {
      setError("키는 영문 소문자·숫자·하이픈·점·슬래시만 쓸 수 있습니다.");
      return;
    }
    setSelectedKey(key);
    setDraft({});
    setRevisions([]);
    setMessage("새 항목입니다. 내용을 입력하고 저장하세요.");
  }, []);

  const triggerSiteDeploy = useCallback(async () => {
    setDeploying(true);
    try {
      await adminFetch("/api/admin/site-deploy", { method: "POST" });
      const time = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      setMessage(`사이트 반영을 시작했습니다 (${time}). 빌드 완료까지 수 분 걸리며, 발행된 항목만 반영됩니다.`);
    } catch (caught) {
      const code = caught instanceof AdminApiError ? caught.code : "";
      setError(code === "DEPLOY_TOKEN_MISSING"
        ? "배포 토큰(GITHUB_DEPLOY_TOKEN)이 워커에 설정되지 않았습니다."
        : describeAdminError(caught, "사이트 반영 요청에 실패했습니다.").message);
    } finally {
      setDeploying(false);
    }
  }, []);

  const isBeatsEditor = namespace?.editor === "beats";
  const isRecordEditor = namespace?.editor === "record";
  const isPromptEditor = namespace?.editor === "prompt";

  return (
    <main className="min-h-screen bg-[#0d0f18] text-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[240px_320px_1fr]">
        {/* 그룹 네비 — 레지스트리에서 자동 생성 */}
        <nav className="border-b border-slate-800 bg-[#0b0d15] lg:border-b-0 lg:border-r" aria-label="콘텐츠 그룹">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <h1 className="text-sm font-semibold">콘텐츠 관리</h1>
          </div>
          <div className="space-y-4 p-3">
            {CMS_GROUPS.map((group: { id: string; label: string }) => {
              const items = NAMESPACES.filter((item) => item.group === group.id);
              if (!items.length) return null;
              return (
                <div key={group.id}>
                  <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">{group.label}</p>
                  <ul className="space-y-0.5">
                    {items.map((item) => (
                      <li key={item.ns}>
                        <button
                          type="button"
                          onClick={() => setActiveNs(item.ns)}
                          className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${activeNs === item.ns ? "bg-violet-950 text-violet-100" : "text-slate-300 hover:bg-slate-900"}`}
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </nav>

        {/* 항목 목록 */}
        <aside className="border-b border-slate-800 bg-[#10121b] lg:border-b-0 lg:border-r">
          <div className="space-y-2 border-b border-slate-800 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">{namespace?.label || ""}</h2>
                <span className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] ${namespace?.channel === "runtime" ? "border-emerald-800 bg-emerald-950 text-emerald-200" : "border-sky-800 bg-sky-950 text-sky-200"}`}>
                  {channel?.label}
                </span>
              </div>
              {namespace?.listSource === "user" ? (
                <button type="button" onClick={createEntry} className="shrink-0 rounded-md border border-slate-700 p-1.5 text-slate-300 hover:border-slate-500" aria-label="새 항목 추가">
                  <Plus className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <p className="text-[11px] leading-4 text-slate-500">{namespace?.description}</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-slate-500" aria-hidden="true" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="이름·키·본문 검색"
                aria-label="콘텐츠 검색"
                className="w-full rounded-md border border-slate-700 bg-slate-950 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="max-h-[calc(100vh-190px)] overflow-y-auto">
            {baseLoading ? (
              <p className="p-4 text-sm text-slate-400">불러오는 중...</p>
            ) : listItems.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">
                {namespace?.listSource === "user" ? "아직 등록된 항목이 없습니다. + 로 추가하세요." : "표시할 항목이 없습니다."}
              </p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {listItems.map((item) => {
                  const override = overrides[entryId(activeNs, item.key)];
                  const active = selectedKey === item.key;
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => selectEntry(item.key)}
                        className={`w-full px-3 py-2.5 text-left hover:bg-slate-900 ${active ? "bg-slate-900" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-sm text-slate-100">{item.label}</p>
                          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] ${statusBadgeClass(override?.status || "")}`}>
                            {override ? CMS_STATUS_LABELS[override.status] || override.status : "기본값"}
                          </span>
                        </div>
                        {item.hint ? <p className="mt-0.5 truncate text-[11px] text-slate-500">{item.hint}</p> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* 편집 영역 */}
        <section className="min-w-0">
          <div className="sticky top-0 z-20 border-b border-slate-800 bg-[#0d0f18]/95 px-4 py-3 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-200">
                  {selectedKey ? (selectedBase?.label || selectedKey) : "왼쪽에서 항목을 선택하세요"}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  {selectedKey ? <span className="font-mono">{activeNs} / {selectedKey}</span> : null}
                  {selectedOverride ? <span>v{selectedOverride.version}</span> : null}
                  {autoSavedAt && dirty === false ? (
                    <span className="inline-flex items-center gap-1 text-emerald-300"><Check className="h-3 w-3" />{autoSavedAt} 자동 저장됨</span>
                  ) : null}
                  {dirty ? <span className="text-amber-300">저장되지 않은 변경</span> : null}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { void loadOverrides(activeNs); }} className={buttonClass()} aria-label="목록 새로고침">
                  <RefreshCw className="h-4 w-4" />
                </button>
                {namespace?.channel === "build" ? (
                  <button type="button" onClick={() => { void triggerSiteDeploy(); }} disabled={deploying} className={buttonClass("success")}>
                    <RefreshCw className={`h-4 w-4 ${deploying ? "animate-spin" : ""}`} />
                    사이트 반영
                  </button>
                ) : null}
              </div>
            </div>

            {stale ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                데이터베이스 응답이 느려 마지막으로 받은 목록을 보여주고 있습니다. 최신이 아닐 수 있습니다.
              </p>
            ) : null}
            {message ? <p className="mt-2 text-xs text-sky-200">{message}</p> : null}
            {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
          </div>

          {!selectedKey || !namespace ? (
            <div className="p-6 text-sm text-slate-400">
              <p>왼쪽 목록에서 편집할 콘텐츠를 선택하세요.</p>
              <p className="mt-3 max-w-xl text-xs leading-5 text-slate-500">
                {CMS_CHANNELS.runtime.label} 그룹(AI 프롬프트·버튼 문구)은 발행하면 다음 요청부터 바로 적용됩니다.
                {" "}{CMS_CHANNELS.build.label} 그룹(운세 해설·라이트 노벨·페이지 문구·FAQ·유명인 사주·SEO)은 발행 후 &quot;사이트 반영&quot;으로 재빌드해야 노출됩니다.
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-5 p-4 pb-24">
              <p className="rounded-lg border border-slate-800 bg-[#12141f] px-3 py-2 text-xs leading-5 text-slate-400">
                {channel?.hint}
              </p>

              {isRecordEditor ? (
                <RecordEditor
                  value={(draft.record as Record<string, Record<string, string>>) || {}}
                  base={(effectiveBaseFields.record as Record<string, Record<string, string>>) || {}}
                  onChange={(next) => setDraft((prev) => ({ ...prev, record: next }))}
                />
              ) : isBeatsEditor ? (
                <>
                  {namespace.fields
                    .filter((field) => field.kind !== "beats")
                    .map((field) => (
                      <FieldEditor
                        key={field.name}
                        def={field}
                        value={draft[field.name]}
                        baseValue={effectiveBaseFields[field.name]}
                        onChange={(next) => setDraft((prev) => ({ ...prev, [field.name]: next }))}
                      />
                    ))}
                  <BeatsEditor
                    value={(draft.beats as Record<string, string>) || {}}
                    base={(effectiveBaseFields.beats as Record<string, string>) || {}}
                    speakers={(effectiveBaseFields.beatSpeakers as Record<string, string>) || {}}
                    maxLength={namespace.constraints?.beatMaxLength || 250}
                    forbidden={namespace.constraints?.forbiddenInBeat || []}
                    onChange={(next) => setDraft((prev) => ({ ...prev, beats: next }))}
                  />
                </>
              ) : (
                namespace.fields.map((field) => (
                  <FieldEditor
                    key={field.name}
                    def={field}
                    value={draft[field.name]}
                    baseValue={effectiveBaseFields[field.name]}
                    monospace={isPromptEditor}
                    onChange={(next) => setDraft((prev) => ({ ...prev, [field.name]: next }))}
                  />
                ))
              )}

              <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                <button type="button" onClick={() => { void save("draft"); }} disabled={saving} className={buttonClass()}>
                  임시저장
                </button>
                <button type="button" onClick={() => { void save("review"); }} disabled={saving} className={buttonClass()}>
                  검수 요청
                </button>
                <button type="button" onClick={() => { void save("published"); }} disabled={saving} className={buttonClass("primary")}>
                  <Send className="h-4 w-4" />
                  발행
                </button>
                {selectedOverride?.status === "published" ? (
                  <button type="button" onClick={() => { void save("archived"); }} disabled={saving} className={buttonClass("warn")}>
                    발행 해제
                  </button>
                ) : null}
                <button type="button" onClick={() => { void revertToBase(); }} disabled={saving} className={buttonClass("danger")}>
                  {selectedOverride ? <Trash2 className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                  기본값으로 되돌리기
                </button>
              </div>

              <section className="space-y-2 border-t border-slate-800 pt-4">
                <h3 className="text-sm font-semibold text-slate-200">버전 기록</h3>
                <RevisionPanel
                  revisions={revisions}
                  currentFields={stripDisplayOnlyFields(activeNs, draft)}
                  busy={saving}
                  onRestore={(version) => { void restoreRevision(version); }}
                />
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
