"use client";

// /admin/quests — 별빛 퀘스트 · 마케팅 일정.
// 주소 쿼리(view·channel·language·kind·status·filter=overdue·id·from·to·date)로 상태를 남겨 새로고침·공유에도 같은 화면을 연다.

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { OPERATIONS_MISSIONS } from "@/lib/admin-operations.mjs";
import AdminErrorState from "../_components/AdminErrorState";
import { ADMIN_INPUT, adminButton } from "../_components/ui";
import { adminFetch } from "../_lib/admin-api";
import { Drawer, HqNotice, HqPageHeader, LoadingBlock } from "../_hq/components";
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
    if (Object.hasOwn(OPERATIONS_MISSIONS, query.get("mission") || "")) setComposerOpen(true);
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

  return (
    <div className="cd-hq-page space-y-4">
      <HqPageHeader
        game="별빛 퀘스트"
        label="운영 퀘스트 게시판"
        description="WordPress 편집·검색 관측·결제와 결과 제공을 한 걸음씩 기록합니다."
        actions={(
          <>

            <button type="button" className={adminButton("primary", { size: "sm" })} onClick={() => setComposerOpen(true)}>
              <Plus aria-hidden="true" size={14} /> 작업 추가
            </button>
          </>
        )}
      />

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
        onClose={() => { setComposerOpen(false); writeQuery({ mission: null }); }}
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


function QuestComposer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (quest: Quest) => void }) {
  const [kind, setKind] = useState("copy");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(kstToday());
  const [channel, setChannel] = useState("wordpress");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setError("");
    const key = readQuery().get("mission") || "";
    const mission = Object.hasOwn(OPERATIONS_MISSIONS, key) ? OPERATIONS_MISSIONS[key as keyof typeof OPERATIONS_MISSIONS] : null;
    if (mission) { setTitle(mission.title); setKind(mission.kind); setNote(mission.note); setChannel(["editorial", "discovery"].includes(key) ? "wordpress" : "custom"); }
  }, [open]);
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await adminFetch<{ quest: Quest }>("/api/admin/hq/quests", { method: "POST", body: { kind, title, date, channel, note, campaignId: null } });
      setTitle(""); setNote(""); writeQuery({ mission: null }); onCreated(result.quest);
    } catch (caught) { setError(describeHqError(caught, "퀘스트를 추가하지 못했습니다.").message); }
    finally { setBusy(false); }
  };
  return <Drawer open={open} onClose={onClose} title="퀘스트 받기" subtitle="목표를 정하고, 완료 근거를 남겨 레벨을 올려요">
    <form className="cd-ops-composer" onSubmit={create}>
      {error && <HqNotice tone="err">{error}</HqNotice>}
      <label>담당 작업<select className={ADMIN_INPUT} value={kind} onChange={e => setKind(e.target.value)}><option value="copy">연이 · 원고 검토</option><option value="production">연이 · 자료 제작</option><option value="analysis">영냥이 · 관측·분석</option><option value="improvement">네오 · 운영 개선</option></select></label>
      <label>작업 공간<select className={ADMIN_INPUT} value={channel} onChange={e => setChannel(e.target.value)}><option value="wordpress">WordPress</option><option value="custom">서비스 운영</option></select></label>
      <label>퀘스트 제목<input className={ADMIN_INPUT} value={title} onChange={e => setTitle(e.target.value)} maxLength={120} required /></label>
      <label>목표 날짜 · KST<input type="date" className={ADMIN_INPUT} value={date} onChange={e => setDate(e.target.value)} required /></label>
      <label>완료할 일<textarea className={ADMIN_INPUT} value={note} onChange={e => setNote(e.target.value)} maxLength={4000} rows={5} /></label>
      <p className="cd-hq-quiet text-sm">작업 기록만 추가합니다. 글 발행·결제·환불은 실행하지 않습니다. 고객 정보는 기록하지 마세요.</p>
      <button className={adminButton("primary")} disabled={busy || !title.trim()}>{busy ? "퀘스트 저장 중" : "이 퀘스트 시작하기"}</button>
    </form>
  </Drawer>;
}
