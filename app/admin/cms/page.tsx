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
import { ADMIN_CARD, ADMIN_INPUT_ICON, ADMIN_TOOLBAR, adminButton } from "../_components/ui";
import { loadBaseEntries, type CmsBaseEntry } from "./_lib/base-values";
import FieldEditor, { type CmsFieldDef } from "./_components/FieldEditor";
import RevisionPanel, { type CmsRevision } from "./_components/RevisionPanel";
import BeatsEditor from "./_components/BeatsEditor";
import RecordEditor from "./_components/RecordEditor";
import VisualPreview from "./_components/VisualPreview";
import { matchesCopy, mergeCopy, visualFields } from "./_lib/visual-fields";
import styles from "./cms-workspace.module.css";
import GlobalCopySearch from "./_components/GlobalCopySearch";
import Link from "next/link";

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

// 톤·크기·포커스는 app/admin/_components/ui.ts 와 styles/admin-yehwa.css 한 곳에서 정한다.
// 함수 이름을 그대로 두어 호출부는 건드리지 않는다.
// 종전 danger 만 이 화면에서 테두리형이라 같은 뜻의 버튼이 화면마다 달라 보였다 — 채운 형으로 통일.
function buttonClass(tone: "neutral" | "primary" | "success" | "warn" | "danger" = "neutral"): string {
  return adminButton(tone);
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
  const [activeNs, setActiveNs] = useState<string>("feature-detail");
  const [visualMode, setVisualMode] = useState(true);
  const [hasPendingInput, setHasPendingInput] = useState(false);
  const [baseEntries, setBaseEntries] = useState<CmsBaseEntry[]>([]);
  const [baseLoading, setBaseLoading] = useState(true);
  const [baseError, setBaseError] = useState("");
  const [loadVersion, setLoadVersion] = useState(0);
  const [overridesLoading, setOverridesLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const activeNsRef = useRef(activeNs);
  activeNsRef.current = activeNs;
  const selectedRef = useRef("");
  const draftOwner = useRef("");
  const overridesRequest = useRef(0);
  const pendingSelection = useRef<{ ns: string; key: string; path: string[] } | null>(null);

  const [overrides, setOverrides] = useState<Record<string, CmsEntryItem>>({});
  const [selectedKey, setSelectedKey] = useState("");
  selectedRef.current = selectedKey;
  const [draft, setDraft] = useState<Fields>({});
  const [revisions, setRevisions] = useState<CmsRevision[]>([]);
  const [keyword, setKeyword] = useState("");
  const [saving, setSaving] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState<string>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState("");

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
      return matchesCopy(needle, item.label, item.key, item.hint, baseByKey[item.key]?.fields, override?.fields);
    });
  }, [namespace, baseEntries, baseByKey, overrides, activeNs, keyword]);

  const selectedOverride = selectedKey ? overrides[entryId(activeNs, selectedKey)] : undefined;
  const selectedBase = selectedKey ? baseByKey[selectedKey] : undefined;

  const effectiveBaseFields = useMemo<Fields>(() => selectedBase?.fields || {}, [selectedBase]);

  const dirty = useMemo(() => {
    const saved = mergeCopy(effectiveBaseFields, selectedOverride?.fields);
    const comparable = stripDisplayOnlyFields(activeNs, mergeCopy(effectiveBaseFields, draft));
    if (Object.keys(saved).length) return !equalFields(comparable, stripDisplayOnlyFields(activeNs, saved));
    return !equalFields(comparable, stripDisplayOnlyFields(activeNs, effectiveBaseFields));
  }, [draft, selectedOverride, effectiveBaseFields, activeNs]);

  // ── 목록/기준값 로딩 ────────────────────────────────────────────────────────
  const loadOverrides = useCallback(async (ns: string) => {
    const requestId = ++overridesRequest.current;
    setOverridesLoading(true);
    try {
      const data = await adminFetch<{ items?: CmsEntryItem[]; stale?: boolean }>(
        `/api/admin/cms/entries?ns=${encodeURIComponent(ns)}`,
      );
      if (activeNsRef.current !== ns || requestId !== overridesRequest.current) return;
      const map: Record<string, CmsEntryItem> = {};
      for (const item of data?.items || []) map[entryId(item.namespace, item.key)] = item;
      setOverrides(map);
      setStale(Boolean(data?.stale));
      setError("");
    } catch (caught) {
      if (activeNsRef.current === ns && requestId === overridesRequest.current) setError(describeAdminError(caught, "수정본 목록을 불러오지 못했습니다.").message);
    } finally {
      if (activeNsRef.current === ns && requestId === overridesRequest.current) setOverridesLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    draftOwner.current = "";
    setSelectedKey("");
    setDraft({});
    setRevisions([]);
    setMessage("");
    setBaseLoading(true);
    setBaseEntries([]);
    setOverrides({});
    setBaseError("");
    setSelectedPath([]);
    setKeyword("");

    void loadBaseEntries(activeNs).then((entries) => {
      if (!cancelled) setBaseEntries(entries);
    }).catch(() => {
      if (!cancelled) setBaseError("기본 문장을 불러오지 못했습니다. 다시 불러오기를 눌러 주세요.");
    }).finally(() => { if (!cancelled) setBaseLoading(false); });
    void loadOverrides(activeNs);

    return () => { cancelled = true; };
  }, [activeNs, loadOverrides, loadVersion]);

  // ── 항목 선택 ──────────────────────────────────────────────────────────────
  const selectEntry = useCallback((key: string, path: string[] = []) => {
    if (baseLoading || overridesLoading || saving || hasPendingInput) return;
    draftOwner.current = entryId(activeNs, key);
    setSelectedPath(path);
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

    setDraft(mergeCopy(base?.fields || {}, override?.fields, local || undefined));
    setRevisions([]);

    void adminFetch<{ items?: CmsRevision[] }>(
      `/api/admin/cms/entries/${encodeURIComponent(activeNs)}/${encodeURIComponent(key)}/revisions`,
    )
      .then((data) => { if (activeNsRef.current === activeNs && selectedRef.current === key) setRevisions(data?.items || []); })
      .catch(() => { if (activeNsRef.current === activeNs && selectedRef.current === key) setRevisions([]); });
  }, [activeNs, overrides, baseByKey, baseLoading, overridesLoading, saving, hasPendingInput]);

  // Open a useful first preview once both defaults and saved edits are ready.
  useEffect(() => {
    if (!selectedKey && !baseLoading && !overridesLoading && !baseError && !error) {
      const pending = pendingSelection.current;
      if (pending?.ns === activeNs) { pendingSelection.current = null; selectEntry(pending.key, pending.path); }
      else if (listItems[0]) selectEntry(listItems[0].key);
    }
  }, [selectedKey, baseLoading, overridesLoading, baseError, error, listItems, selectEntry, activeNs]);

  const previewEntries = useMemo(() => baseEntries.map((entry) => ({ ...entry, base: entry.fields, fields: mergeCopy(entry.fields, overrides[entryId(activeNs, entry.key)]?.fields) })), [baseEntries, overrides, activeNs]);

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
    if (!selectedKey || !namespace || hasPendingInput) return;
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
        setDraft(mergeCopy(effectiveBaseFields, data.item.fields));
      }
      try { window.localStorage.removeItem(`${LOCAL_DRAFT_PREFIX}${entryId(activeNs, selectedKey)}`); } catch { /* 무시 */ }

      if (options.silent) {
        setAutoSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      } else {
        setMessage(status === "published"
          ? (namespace.channel === "runtime"
            ? "발행했습니다. 다음 요청부터 바로 적용됩니다."
            : "발행했습니다. 배포 검증 후 상단 '운영에 반영'을 눌러야 실제 사이트에 나타납니다.")
          : `${CMS_STATUS_LABELS[status] || status} 상태로 저장했습니다.`);
      }
    } catch (caught) {
      setError(describeAdminError(caught, "저장에 실패했습니다.").message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [selectedKey, namespace, activeNs, draft, effectiveBaseFields, cancelPendingAutoSave, hasPendingInput]);

  // ── 3초 자동 저장 ──────────────────────────────────────────────────────────
  const savedStatus = selectedOverride?.status;
  useEffect(() => {
    if (!selectedKey || !dirty || draftOwner.current !== entryId(activeNs, selectedKey)) return undefined;

    // 서버가 잠깐 죽어도 작업물이 날아가지 않게 로컬에도 즉시 남긴다.
    try {
      window.localStorage.setItem(`${LOCAL_DRAFT_PREFIX}${entryId(activeNs, selectedKey)}`, JSON.stringify(draft));
    } catch { /* 용량 초과 등은 무시 — 서버 자동저장이 본선이다 */ }

    cancelPendingAutoSave();
    // Visual edits stay in the browser until explicit publication. Saving a draft over
    // a published CmsEntry would otherwise remove it from the next public build.
    if (visualMode) return cancelPendingAutoSave;
    autoSaveTimer.current = setTimeout(() => {
      // 발행본은 자동저장하지 않는다. 자동으로 임시저장으로 되돌리면 사이트에서 문구가 사라진다.
      if (savedStatus === "published") return;
      // 상태를 draft 로 못박지 않고 지금 상태를 유지한다 — 검수 대기 중인 항목을
      // 타이핑했다는 이유로 임시저장으로 강등시키지 않기 위함이다.
      void save(savedStatus || "draft", { silent: true });
    }, AUTOSAVE_DELAY_MS);

    return cancelPendingAutoSave;
  }, [draft, dirty, selectedKey, activeNs, save, savedStatus, cancelPendingAutoSave, visualMode]);

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
        setDraft(mergeCopy(effectiveBaseFields, data.item.fields));
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
    draftOwner.current = entryId(activeNs, key);
    setSelectedKey(key);
    setDraft({});
    setRevisions([]);
    setMessage("새 항목입니다. 내용을 입력하고 저장하세요.");
  }, [activeNs]);

  const triggerSiteDeploy = useCallback(async (mode: "preview" | "production") => {
    if (mode === "production" && !window.confirm("발행된 콘텐츠와 현재 main 코드를 운영 서비스에 배포합니다. 아직 발행하지 않은 브라우저 초안은 포함되지 않습니다. 운영에 반영할까요?")) return;
    setDeploying(true);
    try {
      const result = await adminFetch<{ repo?: string; workflow?: string }>("/api/admin/site-deploy", { method: "POST", body: { mode } });
      if (/^[\w.-]+\/[\w.-]+$/.test(result.repo || "") && /^[\w.-]+\.ya?ml$/.test(result.workflow || "")) {
        setDeploymentUrl(`https://github.com/${result.repo}/actions/workflows/${result.workflow}`);
      }
      const time = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      setMessage(`${mode === "production" ? "운영 반영" : "배포 검증"}을 요청했습니다 (${time}). 발행된 항목만 포함됩니다. 요청 접수는 배포 완료가 아니며 GitHub Actions 결과를 확인해 주세요.`);
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
    <main className="min-h-screen">
      <header className={styles.header}>
        <div><h1>화면에서 글 편집</h1><p>페이지를 보며 문구를 선택하거나, 정적 결과의 모든 문장을 찾아 수정하세요.</p></div>
        <Link href="/admin/content/" className={buttonClass()}>인사이트 글 편집</Link>
      </header>
      <div className={styles.workspace}>
        {/* 항목 목록 */}
        <aside className={styles.library} aria-label="편집할 콘텐츠 찾기">
          <label className={styles.groupSelect}>편집할 화면·결과
            <select className="cd-adm-input" aria-label="편집할 화면·결과" value={activeNs} disabled={saving || hasPendingInput} onChange={(event) => setActiveNs(event.target.value)}>
              {CMS_GROUPS.map((group: { id: string; label: string }) => <optgroup key={group.id} label={group.label}>
                {NAMESPACES.filter((item) => item.group === group.id).map((item) => <option key={item.ns} value={item.ns}>{item.label}</option>)}
              </optgroup>)}
            </select>
          </label>
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
                className={ADMIN_INPUT_ICON}
              />
            </div>
            <GlobalCopySearch key={activeNs} query={keyword} disabled={saving || hasPendingInput} onSelect={(ns, key, path) => {
              if (ns === activeNs) { selectEntry(key, path); return; }
              pendingSelection.current = { ns, key, path }; setActiveNs(ns);
            }} />
          </div>

          <p className={styles.resultCount} role="status">{baseLoading || overridesLoading ? "기본 문장과 저장한 수정본을 불러오고 있어요." : `검색 결과 ${listItems.length}개 · 기본 문장 포함`}</p>
          {baseError ? <div role="alert" className="p-3 text-sm"><p>{baseError}</p><button type="button" className={buttonClass()} onClick={() => setLoadVersion((value) => value + 1)}>다시 불러오기</button></div> : null}
          <div className={styles.entryList}>
            {baseLoading || overridesLoading ? (
              <p className="p-4 text-sm text-slate-400">불러오는 중...</p>
            ) : listItems.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">
                {keyword ? "이 그룹에서 일치하는 문장을 찾지 못했습니다. 검색어를 지우거나 위에서 다른 화면·결과를 선택하세요." : namespace?.listSource === "user" ? "아직 등록된 항목이 없습니다. + 로 추가하세요." : "표시할 항목이 없습니다."}
                {keyword ? <button type="button" className={buttonClass()} onClick={() => setKeyword("")}>검색어 지우기</button> : null}
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
                        disabled={saving || hasPendingInput}
                        aria-pressed={active}
                        onClick={() => selectEntry(item.key)}
                        className={`w-full px-3 py-2.5 text-left hover:bg-slate-900 ${active ? "bg-slate-900" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-sm text-slate-100">{item.label}</p>
                          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] ${statusBadgeClass(override?.status || "")}`}>
                            {override ? CMS_STATUS_LABELS[override.status] || override.status : "기본값"}
                          </span>
                        </div>
                        {keyword ? <p className={styles.matchExcerpt}>{visualFields(mergeCopy(baseByKey[item.key]?.fields || {}, override?.fields)).find((field) => matchesCopy(keyword, field.value))?.value}</p> : null}
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
        <section className="min-w-0" aria-busy={saving}>
          <div className={ADMIN_TOOLBAR}>
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
                <button type="button" disabled={saving || hasPendingInput} onClick={() => setVisualMode((previous) => !previous)} className={buttonClass(visualMode ? "primary" : "neutral")} aria-pressed={visualMode}>
                  {visualMode ? "화면 편집 모드" : "항목 편집 모드"}
                </button>
                <button type="button" disabled={saving || hasPendingInput} onClick={() => { void loadOverrides(activeNs); }} className={buttonClass()} aria-label="목록 새로고침">
                  <RefreshCw className="h-4 w-4" />
                </button>
                {namespace?.channel === "build" ? (
                  <>
                  <button type="button" onClick={() => { void triggerSiteDeploy("preview"); }} disabled={deploying || saving || hasPendingInput} className={buttonClass()}>
                    배포 검증
                  </button>
                  <button type="button" onClick={() => { void triggerSiteDeploy("production"); }} disabled={deploying || saving || hasPendingInput} className={buttonClass("success")}>
                    <RefreshCw className={`h-4 w-4 ${deploying ? "animate-spin" : ""}`} />
                    운영에 반영
                  </button>
                  </>
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
            {deploymentUrl ? <a className="mt-2 inline-flex min-h-11 items-center text-sm text-sky-200 underline" href={deploymentUrl} target="_blank" rel="noopener noreferrer">배포 진행 상태 확인</a> : null}
            {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
          </div>

          {!selectedKey || !namespace ? (
            <div className="p-6 text-sm text-slate-400">
              <p>왼쪽 목록에서 편집할 콘텐츠를 선택하세요.</p>
              <p className="mt-3 max-w-xl text-xs leading-5 text-slate-500">
                {CMS_CHANNELS.runtime.label} 그룹(AI 프롬프트·버튼 문구)은 발행하면 다음 요청부터 바로 적용됩니다.
                {" "}{CMS_CHANNELS.build.label} 그룹(운세 해설·라이트 노벨·페이지 문구·FAQ·유명인 사주)은 발행 후 &quot;운영에 반영&quot;으로 재빌드해야 노출됩니다.
              </p>
            </div>
          ) : (
            <fieldset disabled={saving} className="min-w-0 space-y-5 border-0 p-4 pb-24">
              <p className={`${ADMIN_CARD} rounded-lg px-3 py-2 text-xs leading-5 text-slate-400`}>
                {visualMode ? `화면 편집 초안은 이 브라우저에 보관됩니다. ${namespace.channel === "build" ? "검토 후 ‘발행’하고 ‘운영에 반영’을 눌러 주세요." : "‘발행’을 누르면 다음 요청부터 바로 적용됩니다."}` : channel?.hint}
              </p>
              {visualMode && namespace.editor !== "prompt" ? (
                <VisualPreview key={activeNs} ns={activeNs} entryKey={selectedKey}
                  base={effectiveBaseFields} value={mergeCopy(effectiveBaseFields, draft)} onChange={setDraft}
                  entries={previewEntries} selectedPath={selectedPath} onSelectEntry={selectEntry} onPendingChange={setHasPendingInput} disabled={saving} />
              ) : null}

              <details open={!visualMode}>
                <summary className="min-h-11 cursor-pointer py-3 text-sm text-slate-300">전체 원본 항목 편집</summary>
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

              </details>
              <div className={styles.saveBar}>
                {hasPendingInput ? <p role="status" className="w-full text-sm">입력한 문구를 먼저 ‘초안에 적용’하거나 ‘입력 되돌리기’를 눌러 주세요.</p> : null}
                <button type="button" onClick={() => {
                  if (!visualMode) { void save("draft"); return; }
                  try {
                    window.localStorage.setItem(`${LOCAL_DRAFT_PREFIX}${entryId(activeNs, selectedKey)}`, JSON.stringify(draft));
                    setMessage("이 브라우저에 초안을 저장했습니다. 서비스 발행본은 바뀌지 않았습니다.");
                  } catch { setError("브라우저 저장 공간이 부족해 초안을 저장하지 못했습니다."); }
                }} disabled={saving || hasPendingInput} className={buttonClass()}>
                  {visualMode ? "브라우저에 초안 저장" : "임시저장"}
                </button>
                {!visualMode ? <button type="button" onClick={() => { void save("review"); }} disabled={saving || hasPendingInput} className={buttonClass()}>
                  검수 요청
                </button> : null}
                <button type="button" onClick={() => { void save("published"); }} disabled={saving || hasPendingInput} className={buttonClass("primary")}>
                  <Send className="h-4 w-4" />
                  발행
                </button>
                {selectedOverride?.status === "published" ? (
                  <button type="button" onClick={() => { void save("archived"); }} disabled={saving || hasPendingInput} className={buttonClass("warn")}>
                    발행 해제
                  </button>
                ) : null}
                <button type="button" onClick={() => { void revertToBase(); }} disabled={saving || hasPendingInput} className={buttonClass("danger")}>
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
            </fieldset>
          )}
        </section>
      </div>
    </main>
  );
}
