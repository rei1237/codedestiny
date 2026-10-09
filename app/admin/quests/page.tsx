"use client";

// /admin/quests — 별빛 퀘스트 · 마케팅 일정.
// 주소 쿼리(view·channel·language·kind·status·filter=overdue·id·from·to·date)로 상태를 남겨 새로고침·공유에도 같은 화면을 연다.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import AdminErrorState from "../_components/AdminErrorState";
import { ADMIN_INPUT, adminButton } from "../_components/ui";
import { adminFetch } from "../_lib/admin-api";
import { Drawer, HqNotice, HqPageHeader, LoadingBlock, StatusBadge } from "../_hq/components";
import { formatDateKey, kstToday } from "../_hq/format";
import { describeHqError, readQuery, useHqResource, writeQuery } from "../_hq/useHqResource";
import QuestDetailView from "../_hq/views/QuestDetailView";
import QuestsView, { EMPTY_FILTERS, type QuestFilters, type QuestViewMode } from "../_hq/views/QuestsView";
import type { EvidenceInput, Quest, QuestDetail, QuestMeta, Tone, WorkBundle } from "../_hq/types";

interface QuestListResponse {
  items: Quest[];
  bundles: WorkBundle[];
  meta: QuestMeta;
  today: string;
}

const VIEWS = new Set(["list", "week", "month", "kanban"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const QUEST_ID_RE = /^q_[a-f0-9]{24}$/;

export default function AdminQuestsPage() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<QuestViewMode>("list");
  const [filters, setFilters] = useState<QuestFilters>(EMPTY_FILTERS);
  const [anchor, setAnchor] = useState(kstToday());
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    const query = readQuery();
    const v = query.get("view") || "";
    if (VIEWS.has(v)) setView(v as QuestViewMode);
    setFilters({
      channel: query.get("channel") || "",
      language: query.get("language") || "",
      kind: query.get("kind") || "",
      status: query.get("status") || "",
      overdue: query.get("filter") === "overdue",
    });
    const from = query.get("from") || "";
    const to = query.get("to") || "";
    if (DATE_RE.test(from) && DATE_RE.test(to)) setRange({ from, to });
    const date = query.get("date") || from;
    if (DATE_RE.test(date)) setAnchor(date);
    const id = query.get("id") || "";
    if (QUEST_ID_RE.test(id)) setOpenId(id);
    setReady(true);
  }, []);

  const listPath = ready ? `/api/admin/hq/quests${range ? `?from=${range.from}&to=${range.to}` : ""}` : null;
  const list = useHqResource<QuestListResponse>(listPath, "퀘스트 목록을 불러오지 못했습니다.");

  // 캠페인 시작 전에 들어오면 주간·월간은 캠페인 첫 주부터 보여 준다.
  useEffect(() => {
    const start = list.data?.meta.campaign?.period?.start;
    if (!start || readQuery().get("date") || readQuery().get("from")) return;
    if (kstToday() < start) setAnchor(start);
  }, [list.data?.meta.campaign?.period?.start]);

  const onViewChange = useCallback((next: QuestViewMode) => { setView(next); writeQuery({ view: next === "list" ? null : next }); }, []);
  const onFiltersChange = useCallback((next: QuestFilters) => {
    setFilters(next);
    writeQuery({ channel: next.channel || null, language: next.language || null, kind: next.kind || null, status: next.status || null, filter: next.overdue ? "overdue" : null });
  }, []);
  const onAnchorChange = useCallback((date: string) => { setAnchor(date); writeQuery({ date }); }, []);
  const onOpen = useCallback((id: string) => { setOpenId(id); writeQuery({ id }); }, []);
  const onClose = useCallback(() => { setOpenId(null); writeQuery({ id: null }); }, []);
  const onClearRange = useCallback(() => { setRange(null); writeQuery({ from: null, to: null }); }, []);

  // 상세에서 바뀐 퀘스트를 목록에도 곧바로 반영(목록 전체를 다시 받지 않는다).
  const patchListItem = useCallback((quest: Quest) => {
    list.setData((current) => current ? { ...current, items: current.items.map((item) => (item.id === quest.id ? quest : item)) } : current);
  }, [list]);

  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ tone: Tone; text: string } | null>(null);
  const runPlanSync = async () => {
    setSyncing(true);
    setSyncNotice(null);
    try {
      const result = await adminFetch<{ counts?: Record<string, number> }>("/api/admin/hq/quests/sync", { method: "POST", body: {} });
      const counts = result?.counts || {};
      setSyncNotice({ tone: "ok", text: `캠페인 일정을 다시 맞췄습니다. 새로 생김 ${counts.created ?? 0} · 바뀜 ${counts.updated ?? 0} · 빠짐 ${counts.archived ?? 0} · 그대로 ${counts.unchanged ?? 0}` });
      list.reload();
    } catch (caught) {
      setSyncNotice({ tone: "err", text: describeHqError(caught, "캠페인 일정을 맞추지 못했습니다.").message });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="cd-hq-page space-y-4">
      <HqPageHeader
        game="별빛 퀘스트"
        label="마케팅 일정"
        description={list.data ? `${list.data.meta.campaign.title} · ${formatDateKey(list.data.meta.campaign.period.start)} ~ ${formatDateKey(list.data.meta.campaign.period.end)} · 계획 ${list.data.meta.campaign.planVersion}` : "캠페인 작업·증빙·발행 확인"}
        actions={(
          <>
            <button type="button" className={adminButton("neutral", { size: "sm" })} onClick={runPlanSync} disabled={syncing}>
              <RefreshCw aria-hidden="true" size={14} className={syncing ? "animate-spin motion-reduce:animate-none" : undefined} /> 원본 일정 다시 맞추기
            </button>
            <button type="button" className={adminButton("primary", { size: "sm" })} onClick={() => setComposerOpen(true)}>
              <Plus aria-hidden="true" size={14} /> 작업 추가
            </button>
          </>
        )}
      />
      {syncNotice ? <HqNotice tone={syncNotice.tone}>{syncNotice.text}</HqNotice> : null}

      {list.error && !list.data ? (
        <AdminErrorState view={list.error} onRetry={list.reload} retrying={list.loading} />
      ) : !list.data ? (
        <div className="cd-adm-card rounded-[var(--cd-adm-radius-lg)] p-4"><LoadingBlock lines={6} label="퀘스트를 불러오는 중" /></div>
      ) : (
        <>
          {list.error ? <AdminErrorState view={list.error} onRetry={list.reload} retrying={list.loading} compact /> : null}
          <QuestsView
            items={list.data.items}
            meta={list.data.meta}
            bundles={list.data.bundles}
            today={list.data.today}
            view={view}
            onViewChange={onViewChange}
            anchor={anchor}
            onAnchorChange={onAnchorChange}
            filters={filters}
            onFiltersChange={onFiltersChange}
            onOpen={onOpen}
            rangeNote={range ? `${formatDateKey(range.from)} ~ ${formatDateKey(range.to)} 일정만 보고 있습니다.` : null}
            onClearRange={onClearRange}
          />
        </>
      )}

      <QuestDrawer id={openId} onClose={onClose} onOpen={onOpen} onChanged={patchListItem} />
      <QuestComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        campaignId={list.data?.meta.campaign.id || null}
        channels={list.data?.meta.channels || {}}
        onCreated={(quest) => { setComposerOpen(false); list.reload(); onOpen(quest.id); }}
      />
    </div>
  );
}

function QuestDrawer({ id, onClose, onOpen, onChanged }: { id: string | null; onClose: () => void; onOpen: (id: string) => void; onChanged: (quest: Quest) => void }) {
  const detail = useHqResource<QuestDetail>(id ? `/api/admin/hq/quests/${id}` : null, "퀘스트를 불러오지 못했습니다.");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null);

  useEffect(() => { setNotice(null); }, [id]);

  const current = detail.data && detail.data.quest.id === id ? detail.data : null;

  const mutate = async (run: () => Promise<{ quest?: Quest } | null>, success: string, fallback: string, reloadAfter = false) => {
    if (!current) return false;
    setBusy(true);
    setNotice(null);
    try {
      const result = await run();
      if (result?.quest) {
        detail.setData((prev) => (prev ? { ...prev, quest: result.quest! } : prev));
        onChanged(result.quest);
      }
      if (reloadAfter) detail.reload();
      setNotice({ tone: "ok", text: success });
      return true;
    } catch (caught) {
      const view = describeHqError(caught, fallback);
      setNotice({ tone: "err", text: view.message });
      // 판 충돌이면 최신 상태를 다시 읽어 둔다.
      if (/먼저 바뀐|먼저 바뀌었/.test(view.message)) detail.reload();
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onTransition = (to: string, reason?: string) => {
    if (!current) return;
    const label = current.meta.statuses[to] || to;
    void mutate(
      async () => {
        const result = await adminFetch<{ changed: boolean; quest: Quest; xp: { totalXp: number } }>(`/api/admin/hq/quests/${current.quest.id}/transition`, {
          method: "POST",
          body: { to, expectedVersion: current.quest.version, reason },
        });
        return result;
      },
      to === "done" ? "완료했습니다. 운영 XP 는 서버가 검증한 뒤 반영합니다." : `'${label}'(으)로 옮겼습니다.`,
      "상태를 바꾸지 못했습니다.",
      true,
    );
  };

  const onAddEvidence = async (input: EvidenceInput) => {
    if (!current) return false;
    let created = true;
    const ok = await mutate(
      async () => {
        const result = await adminFetch<{ created: boolean; quest: Quest }>(`/api/admin/hq/quests/${current.quest.id}/evidence`, { method: "POST", body: input });
        created = result.created;
        return result;
      },
      "증빙을 저장했습니다.",
      "증빙을 저장하지 못했습니다.",
      true,
    );
    if (ok && !created) setNotice({ tone: "info", text: "같은 증빙이 이미 있어 새로 저장하지 않았습니다." });
    return ok;
  };

  const onSetTarget = (targetAt: string | null) => {
    if (!current) return;
    void mutate(
      () => adminFetch<{ quest: Quest }>(`/api/admin/hq/quests/${current.quest.id}/target`, { method: "PATCH", body: { targetAt, expectedVersion: current.quest.version } }),
      targetAt ? "작업 목표 시각을 저장했습니다." : "작업 목표 시각을 지웠습니다.",
      "작업 목표 시각을 저장하지 못했습니다.",
      true,
    );
  };

  return (
    <Drawer
      open={Boolean(id)}
      onClose={onClose}
      title={current?.quest.title || "퀘스트"}
      subtitle={current ? `${current.quest.kindGame} · ${current.quest.kindLabel} · ${current.quest.channelLabel}` : undefined}
    >
      {detail.error && !current ? (
        <AdminErrorState view={detail.error} onRetry={detail.reload} retrying={detail.loading} compact />
      ) : !current ? (
        <LoadingBlock lines={6} label="퀘스트를 불러오는 중" />
      ) : (
        <QuestDetailView
          detail={current}
          busy={busy}
          notice={notice}
          onTransition={onTransition}
          onAddEvidence={onAddEvidence}
          onSetTarget={onSetTarget}
          onOpenRelated={onOpen}
        />
      )}
    </Drawer>
  );
}

interface DraftResult {
  saved: false;
  draft: { date: string; time: string; channel: string; channelLabel: string; language: string; topic: string; text: string };
  conflicts: { id: string; title: string; plannedTime: string | null; gapMinutes: number | null; severity: "same_slot" | "same_day" }[];
  notes: string[];
}

const CUSTOM_KINDS: [string, string][] = [
  ["improvement", "상세 개선·문제 해결"],
  ["analysis", "캠페인 분석"],
  ["copy", "원고 작성"],
  ["production", "원본 제작"],
];

function QuestComposer({ open, onClose, campaignId, channels, onCreated }: { open: boolean; onClose: () => void; campaignId: string | null; channels: Record<string, string>; onCreated: (quest: Quest) => void }) {
  const [kind, setKind] = useState("improvement");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(kstToday());
  const [time, setTime] = useState("18:00");
  const [channel, setChannel] = useState("");
  const [language, setLanguage] = useState("ko");
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null);
  const draftChannels = useMemo(() => Object.entries(channels).filter(([key]) => !["production", "internal_review", "custom"].includes(key)), [channels]);

  useEffect(() => { if (open) { setNotice(null); setDraft(null); } }, [open]);

  const checkDraft = async () => {
    if (!channel) { setNotice({ tone: "warn", text: "충돌을 확인할 채널을 골라 주세요." }); return; }
    setBusy(true);
    setNotice(null);
    try {
      setDraft(await adminFetch<DraftResult>("/api/admin/hq/draft", { method: "POST", body: { date, time, channel, language, topic: title, text } }));
    } catch (caught) {
      setNotice({ tone: "err", text: describeHqError(caught, "일정 초안을 확인하지 못했습니다.").message });
    } finally {
      setBusy(false);
    }
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const result = await adminFetch<{ quest: Quest }>("/api/admin/hq/quests", { method: "POST", body: { kind, title, date, time, campaignId, note: draft?.draft.text || text || undefined } });
      setTitle("");
      setText("");
      onCreated(result.quest);
    } catch (caught) {
      setNotice({ tone: "err", text: describeHqError(caught, "작업을 추가하지 못했습니다.").message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="작업 추가" subtitle="캠페인 밖의 개선·분석 작업이나 새 일정 초안을 남깁니다">
      <form className="space-y-3 text-sm" onSubmit={create}>
        {notice ? <HqNotice tone={notice.tone}>{notice.text}</HqNotice> : null}
        <label className="block text-[12px]">
          <span className="cd-hq-quiet">작업 종류</span>
          <select className={`${ADMIN_INPUT} mt-1 min-h-[44px] w-full`} value={kind} onChange={(event) => setKind(event.target.value)}>
            {CUSTOM_KINDS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="block text-[12px]">
          <span className="cd-hq-quiet">제목(필수)</span>
          <input className={`${ADMIN_INPUT} mt-1 min-h-[44px] w-full`} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[12px]">
            <span className="cd-hq-quiet">날짜</span>
            <input type="date" className={`${ADMIN_INPUT} mt-1 min-h-[44px] w-full`} value={date} onChange={(event) => setDate(event.target.value)} required />
          </label>
          <label className="block text-[12px]">
            <span className="cd-hq-quiet">시각(KST)</span>
            <input type="time" className={`${ADMIN_INPUT} mt-1 min-h-[44px] w-full`} value={time} onChange={(event) => setTime(event.target.value)} />
          </label>
        </div>

        <fieldset className="cd-hq-panel2 space-y-2 rounded-[var(--cd-adm-radius)] p-3">
          <legend className="px-1 text-[13px] font-semibold text-[var(--cd-adm-ink)]">발행 일정 초안(선택)</legend>
          <p className="cd-hq-quiet text-[12px]">같은 날 같은 채널 일정과 겹치는지 확인합니다. 초안은 저장되거나 발행되지 않습니다.</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[12px]">
              <span className="cd-hq-quiet">채널</span>
              <select className={`${ADMIN_INPUT} mt-1 min-h-[44px] w-full`} value={channel} onChange={(event) => setChannel(event.target.value)}>
                <option value="">선택</option>
                {draftChannels.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label className="block text-[12px]">
              <span className="cd-hq-quiet">언어</span>
              <select className={`${ADMIN_INPUT} mt-1 min-h-[44px] w-full`} value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option value="ko">한국어</option><option value="en">영어</option><option value="ja">일본어</option>
              </select>
            </label>
          </div>
          <label className="block text-[12px]">
            <span className="cd-hq-quiet">본문 초안</span>
            <textarea className={`${ADMIN_INPUT} mt-1 min-h-[96px] w-full`} value={text} onChange={(event) => setText(event.target.value)} maxLength={4000} />
          </label>
          <button type="button" className={adminButton("neutral", { size: "sm" })} onClick={checkDraft} disabled={busy}>일정 충돌 확인</button>
          {draft ? (
            <div className="space-y-1.5 text-[13px]" aria-live="polite">
              {draft.conflicts.length ? (
                <ul className="space-y-1">
                  {draft.conflicts.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={item.severity === "same_slot" ? "warn" : "info"} label={item.severity === "same_slot" ? "90분 안 겹침" : "같은 날"} />
                      <span className="text-[var(--cd-adm-ink)]">{item.plannedTime || ""} {item.title}</span>
                    </li>
                  ))}
                </ul>
              ) : <p><StatusBadge tone="ok" label="겹치는 일정 없음" /></p>}
              {draft.notes.map((note) => <p key={note} className="cd-hq-quiet text-[12px]">{note}</p>)}
              {draft.draft.text && draft.draft.text !== text ? <p className="whitespace-pre-wrap rounded bg-[var(--cd-adm-field)] p-2 text-[var(--cd-adm-ink)]">{draft.draft.text}</p> : null}
            </div>
          ) : null}
        </fieldset>

        <button type="submit" className={`${adminButton("primary")} w-full`} disabled={busy || !title.trim()}>퀘스트로 추가</button>
      </form>
    </Drawer>
  );
}
