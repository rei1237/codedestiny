"use client";

// 퀘스트 상세(드로어 본문). 상태 이동·증빙 등록·작업 목표 시각만 바꾼다.
// 🔴 Threads 는 기존 자동화 기록을 읽기만 한다 — 이 화면 어디에도 발행(/run)을 부르는 버튼이 없다.
// 🔴 XP 는 서버가 증빙·완료 검증 뒤에 계산한다. 여기서는 예상치를 보여 줄 뿐 값을 보내지 않는다.

import { useEffect, useState } from "react";
import { ExternalLink, FileText, Link2, ShieldCheck } from "lucide-react";
import { ADMIN_INPUT, adminButton } from "../../_components/ui";
import { HqNotice, StatusBadge } from "../components";
import { formatDateKey, formatDateTime, formatXp } from "../format";
import { QuestBadges } from "../quest-bits";
import type { EvidenceInput, QuestDetail, Tone } from "../types";

const TRANSITIONS: Record<string, string[]> = {
  scheduled: ["in_progress", "review", "done", "on_hold", "cancelled"],
  in_progress: ["review", "done", "scheduled", "on_hold", "cancelled"],
  review: ["done", "in_progress", "on_hold"],
  on_hold: ["in_progress", "scheduled", "cancelled"],
  cancelled: ["scheduled"],
  done: ["in_progress"],
  archived: [],
};

const ACTION_LABEL: Record<string, string> = {
  in_progress: "진행 시작",
  review: "검토 요청",
  done: "완료 처리",
  scheduled: "예정으로 되돌리기",
  on_hold: "보류",
  cancelled: "취소",
};

const STAGE_ORDER = ["copy", "asset", "scheduled", "published", "observed"];
const SOURCE_FIELD_LABEL: Record<string, string> = { plannedDate: "날짜", plannedTime: "시각", topic: "주제", sourceStatus: "원본 상태", owner: "담당", note: "메모", title: "제목", parentId: "부모 작업", kind: "종류" };

function toKstInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const kst = new Date(date.getTime() + 9 * 3600_000);
  return kst.toISOString().slice(0, 16);
}

export interface QuestDetailViewProps {
  detail: QuestDetail;
  busy?: boolean;
  notice?: { tone: Tone; text: string } | null;
  onTransition: (to: string, reason?: string) => void;
  onAddEvidence: (input: EvidenceInput) => Promise<boolean>;
  onSetTarget: (targetAt: string | null) => void;
  onOpenRelated: (id: string) => void;
}

export default function QuestDetailView({ detail, busy = false, notice, onTransition, onAddEvidence, onSetTarget, onOpenRelated }: QuestDetailViewProps) {
  const { quest, evidence, meta } = detail;
  const [pendingTo, setPendingTo] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const manualTypes = Object.entries(meta.evidenceTypes).filter(([, spec]) => spec.manual);
  const firstMissing = quest.missingEvidence.find((type) => meta.evidenceTypes[type]?.manual);
  const [evType, setEvType] = useState(firstMissing || manualTypes[0]?.[0] || "copy_ready");
  const [evUrl, setEvUrl] = useState("");
  const [evRef, setEvRef] = useState("");
  const [evNote, setEvNote] = useState("");
  const [target, setTarget] = useState(toKstInput(quest.targetAt));
  const autoOnly = quest.kind === "auto_publish_check";
  const stageIndex = quest.stage ? STAGE_ORDER.indexOf(quest.stage) : -1;
  const actions = TRANSITIONS[quest.status] || [];

  useEffect(() => {
    setPendingTo(null);
    setReason("");
    setTarget(toKstInput(quest.targetAt));
  }, [quest.id, quest.version, quest.targetAt]);

  const needsReason = (to: string) => quest.status === "done" || to === "cancelled" || to === "on_hold";
  const requestTransition = (to: string) => {
    if (needsReason(to)) { setPendingTo(to); return; }
    onTransition(to);
  };

  const submitEvidence = async (event: React.FormEvent) => {
    event.preventDefault();
    const ok = await onAddEvidence({ type: evType, url: evUrl.trim() || undefined, ref: evRef.trim() || undefined, note: evNote.trim() || undefined });
    if (ok) { setEvUrl(""); setEvRef(""); setEvNote(""); }
  };

  return (
    <div className="space-y-5 text-sm">
      {notice ? <HqNotice tone={notice.tone}>{notice.text}</HqNotice> : null}

      <section aria-label="요약" className="space-y-2">
        <QuestBadges quest={quest} />
        <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1.5 text-[13px]">
          <dt className="cd-hq-quiet">작업 종류</dt><dd className="text-[var(--cd-adm-ink)]">{quest.kindLabel} <span className="cd-hq-quiet">· {quest.kindGame}</span></dd>
          <dt className="cd-hq-quiet">채널 · 언어</dt><dd className="text-[var(--cd-adm-ink)]">{quest.channelLabel} · {quest.language.toUpperCase()}</dd>
          <dt className="cd-hq-quiet">계획</dt><dd className="cd-hq-num text-[var(--cd-adm-ink)]">{formatDateKey(quest.plannedDate)} {quest.plannedTime || ""} KST · 약 {quest.estimatedMinutes}분</dd>
          {quest.sourceStatusLabel ? <><dt className="cd-hq-quiet">원본 상태</dt><dd className="text-[var(--cd-adm-ink)]">{quest.sourceStatusLabel}</dd></> : null}
          {quest.topic && quest.topic !== quest.title ? <><dt className="cd-hq-quiet">주제</dt><dd className="text-[var(--cd-adm-ink)]">{quest.topic}</dd></> : null}
          {detail.owner ? <><dt className="cd-hq-quiet">담당</dt><dd className="text-[var(--cd-adm-ink)]">{detail.owner}</dd></> : null}
          <dt className="cd-hq-quiet">운영 XP</dt>
          <dd className="text-[var(--cd-adm-ink)]">
            {quest.xp ? (
              <span className="cd-hq-num">{formatXp(quest.xp.awarded, { signed: true })} 반영{quest.xp.capped ? " (하루 상한으로 일부만)" : ""} · {formatDateKey(quest.xp.date)}</span>
            ) : (
              <span><span className="cd-hq-num">{formatXp(quest.baseXp, { signed: true })}</span> <span className="cd-hq-quiet">— 증빙을 갖춰 완료하면 서버가 반영합니다</span></span>
            )}
          </dd>
        </dl>
        {detail.note ? <p className="cd-hq-panel2 rounded-[var(--cd-adm-radius)] p-2 text-[13px] text-[var(--cd-adm-ink)]">{detail.note}</p> : null}
        {quest.scriptRef ? (
          <p className="flex items-start gap-2 text-[13px]">
            <FileText aria-hidden="true" size={15} className="cd-hq-quiet mt-0.5 flex-none" />
            <span className="min-w-0 text-[var(--cd-adm-ink)]">원고: <code className="break-all rounded bg-[var(--cd-adm-field)] px-1">{quest.scriptRef.file}</code>{quest.scriptRef.heading ? <> § {quest.scriptRef.heading}</> : null}</span>
          </p>
        ) : null}
      </section>

      <section aria-labelledby="quest-stage" className="space-y-2">
        <h3 id="quest-stage" className="text-[13px] font-semibold text-[var(--cd-adm-ink)]">진행 단계</h3>
        <ol className="flex flex-wrap gap-1.5">
          {STAGE_ORDER.map((stage, index) => (
            <li key={stage}>
              <StatusBadge tone={index <= stageIndex ? "ok" : "muted"} label={`${index + 1}. ${meta.stages[stage] || stage}`} />
            </li>
          ))}
        </ol>
        {quest.missingEvidence.length ? (
          <p className="cd-hq-quiet text-[12px]">완료에 필요한 증빙: {quest.missingEvidence.map((type) => meta.evidenceTypes[type]?.label || type).join(", ")}</p>
        ) : quest.status !== "done" ? (
          <p className="cd-hq-tone-ok text-[12px]">필수 증빙을 모두 갖췄습니다. 완료 처리할 수 있습니다.</p>
        ) : null}
      </section>

      {quest.status !== "archived" ? (
        <section aria-labelledby="quest-move" className="space-y-2">
          <h3 id="quest-move" className="text-[13px] font-semibold text-[var(--cd-adm-ink)]">상태 이동</h3>
          {autoOnly ? (
            <p className="cd-hq-quiet flex items-start gap-1.5 text-[12px]"><ShieldCheck aria-hidden="true" size={14} className="mt-0.5 flex-none" /> 자동 발행 확인 퀘스트는 기존 Threads 자동화 기록이 확인되면 서버가 완료합니다. 여기서는 보류·취소만 할 수 있습니다.</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {actions.filter((to) => !autoOnly || ["on_hold", "cancelled", "scheduled"].includes(to)).map((to) => (
              <button
                key={to}
                type="button"
                disabled={busy}
                className={adminButton(to === "done" ? "success" : to === "cancelled" ? "danger" : to === "in_progress" || to === "review" ? "primary" : "neutral", { size: "sm" })}
                onClick={() => requestTransition(to)}
                aria-describedby={to === "done" && quest.missingEvidence.length ? "quest-done-hint" : undefined}
              >
                {quest.status === "done" && to === "in_progress" ? "완료 되돌리기" : ACTION_LABEL[to] || meta.statuses[to] || to}
              </button>
            ))}
          </div>
          {quest.missingEvidence.length && actions.includes("done") ? (
            <p id="quest-done-hint" className="cd-hq-quiet text-[12px]">증빙이 모자라면 완료 처리 시 서버가 무엇이 필요한지 알려 줍니다.</p>
          ) : null}
          {pendingTo ? (
            <form
              className="cd-hq-panel2 space-y-2 rounded-[var(--cd-adm-radius)] p-3"
              onSubmit={(event) => { event.preventDefault(); onTransition(pendingTo, reason.trim() || undefined); }}
            >
              <label className="block text-[13px]">
                <span className="text-[var(--cd-adm-ink)]">{quest.status === "done" ? "완료를 되돌리는 이유(필수)" : `${ACTION_LABEL[pendingTo]} 이유(선택)`}</span>
                <input className={`${ADMIN_INPUT} mt-1 min-h-[44px] w-full`} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} required={quest.status === "done"} autoFocus />
              </label>
              <div className="flex gap-2">
                <button type="submit" className={adminButton("primary", { size: "sm" })} disabled={busy || (quest.status === "done" && !reason.trim())}>확인</button>
                <button type="button" className={adminButton("neutral", { size: "sm" })} onClick={() => setPendingTo(null)}>취소</button>
              </div>
            </form>
          ) : null}
        </section>
      ) : (
        <HqNotice tone="warn">원본 일정에서 빠진 퀘스트입니다. 기록은 남아 있지만 상태를 바꿀 수 없습니다.</HqNotice>
      )}

      <section aria-labelledby="quest-evidence" className="space-y-2">
        <h3 id="quest-evidence" className="text-[13px] font-semibold text-[var(--cd-adm-ink)]">증빙 ({evidence.length})</h3>
        {evidence.length ? (
          <ul className="space-y-2">
            {evidence.map((item) => (
              <li key={item.id} className="cd-hq-panel2 rounded-[var(--cd-adm-radius)] p-2.5 text-[13px]">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[var(--cd-adm-ink)]">{item.label}</span>
                  <StatusBadge tone={item.verification === "auto" ? "ok" : "info"} label={item.verificationLabel} />
                  <span className="cd-hq-quiet text-[11px]">{formatDateTime(item.createdAt)}{item.actor ? ` · ${item.actor}` : ""}</span>
                </p>
                {item.value?.url ? (
                  <a href={String(item.value.url)} target="_blank" rel="noopener noreferrer" className="cd-hq-focus mt-1 inline-flex max-w-full items-center gap-1 break-all text-[var(--cd-adm-accent-ink)] underline">
                    <ExternalLink aria-hidden="true" size={12} className="flex-none" />{String(item.value.url)}<span className="sr-only">(새 창)</span>
                  </a>
                ) : null}
                {item.value?.ref ? <p className="cd-hq-quiet mt-1 break-all"><Link2 aria-hidden="true" size={12} className="mr-1 inline" />{String(item.value.ref)}</p> : null}
                {item.value?.note ? <p className="mt-1 text-[var(--cd-adm-ink)]">{String(item.value.note)}</p> : null}
              </li>
            ))}
          </ul>
        ) : <p className="cd-hq-quiet text-[13px]">아직 등록된 증빙이 없습니다.</p>}

        {!autoOnly && quest.status !== "archived" ? (
          <form className="cd-hq-panel2 space-y-2 rounded-[var(--cd-adm-radius)] p-3" onSubmit={submitEvidence}>
            <p className="text-[13px] font-semibold text-[var(--cd-adm-ink)]">증빙 추가</p>
            <label className="block text-[12px]">
              <span className="cd-hq-quiet">종류</span>
              <select className={`${ADMIN_INPUT} mt-1 min-h-[44px] w-full`} value={evType} onChange={(event) => setEvType(event.target.value)}>
                {manualTypes.map(([key, spec]) => <option key={key} value={key}>{spec.label}{quest.missingEvidence.includes(key) ? " (필요)" : ""}</option>)}
              </select>
            </label>
            <label className="block text-[12px]">
              <span className="cd-hq-quiet">{evType === "public_url" ? `공개 주소(필수, ${quest.channelLabel})` : "주소(https, 선택)"}</span>
              <input type="url" inputMode="url" className={`${ADMIN_INPUT} mt-1 min-h-[44px] w-full`} value={evUrl} onChange={(event) => setEvUrl(event.target.value)} placeholder="https://" required={evType === "public_url"} />
            </label>
            {evType !== "public_url" ? (
              <label className="block text-[12px]">
                <span className="cd-hq-quiet">파일 위치·예약 번호(선택)</span>
                <input className={`${ADMIN_INPUT} mt-1 min-h-[44px] w-full`} value={evRef} onChange={(event) => setEvRef(event.target.value)} maxLength={300} />
              </label>
            ) : null}
            <label className="block text-[12px]">
              <span className="cd-hq-quiet">메모(선택)</span>
              <textarea className={`${ADMIN_INPUT} mt-1 min-h-[64px] w-full`} value={evNote} onChange={(event) => setEvNote(event.target.value)} maxLength={500} />
            </label>
            <p className="cd-hq-quiet text-[11px]">주소·파일 위치·메모 중 하나는 있어야 합니다. 같은 내용은 두 번 저장되지 않습니다.</p>
            <button type="submit" className={adminButton("primary", { size: "sm" })} disabled={busy}>증빙 저장</button>
          </form>
        ) : null}
      </section>

      {quest.status !== "archived" ? (
        <section aria-labelledby="quest-target" className="space-y-2">
          <h3 id="quest-target" className="text-[13px] font-semibold text-[var(--cd-adm-ink)]">작업 목표 시각</h3>
          <p className="cd-hq-quiet text-[12px]">내 작업 계획용입니다. 실제 예약·발행 시각은 바뀌지 않습니다.</p>
          <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); onSetTarget(target ? `${target}:00+09:00` : null); }}>
            <label className="text-[12px]">
              <span className="cd-hq-quiet">KST</span>
              <input type="datetime-local" className={`${ADMIN_INPUT} mt-1 block min-h-[44px]`} value={target} onChange={(event) => setTarget(event.target.value)} />
            </label>
            <button type="submit" className={adminButton("neutral", { size: "sm" })} disabled={busy}>저장</button>
            {quest.targetAt ? <button type="button" className={adminButton("neutral", { size: "sm" })} disabled={busy} onClick={() => onSetTarget(null)}>지우기</button> : null}
          </form>
        </section>
      ) : null}

      {detail.parent || detail.children.length ? (
        <section aria-labelledby="quest-related" className="space-y-2">
          <h3 id="quest-related" className="text-[13px] font-semibold text-[var(--cd-adm-ink)]">연결된 작업</h3>
          <ul className="space-y-1.5">
            {detail.parent ? (
              <li><button type="button" className="cd-hq-row px-3 py-2 text-[13px]" onClick={() => onOpenRelated(detail.parent!.id)}><span className="cd-hq-quiet">원본 제작 · </span>{detail.parent.title} <span className="cd-hq-quiet">({detail.parent.statusLabel})</span></button></li>
            ) : null}
            {detail.children.map((child) => (
              <li key={child.id}><button type="button" className="cd-hq-row px-3 py-2 text-[13px]" onClick={() => onOpenRelated(child.id)}><span className="cd-hq-quiet">{child.channelLabel} · </span>{child.title} <span className="cd-hq-quiet">({child.statusLabel})</span></button></li>
            ))}
          </ul>
        </section>
      ) : null}

      {detail.history.length || detail.sourceHistory.length ? (
        <details className="text-[13px]">
          <summary className="cd-hq-focus min-h-[44px] cursor-pointer py-2 font-semibold text-[var(--cd-adm-ink)]">변경 이력 ({detail.history.length + detail.sourceHistory.length})</summary>
          <ol className="mt-1 space-y-1.5">
            {[...detail.history.map((entry) => ({ at: entry.at, text: entry.kind === "target" ? `목표 시각 ${entry.to ? formatDateTime(entry.to) : "지움"}` : `${meta.statuses[entry.from || ""] || entry.from || "—"} → ${meta.statuses[entry.to || ""] || entry.to}${entry.reason ? ` · ${entry.reason}` : ""}`, who: entry.actor })),
              ...detail.sourceHistory.map((entry) => ({
                at: entry.at,
                text: entry.kind === "created" ? `원본 일정에서 생성 (${entry.planVersion || ""})` : entry.kind === "removed" ? "원본 일정에서 빠짐" : entry.kind === "restored" ? "원본 일정에 다시 포함" : `원본 변경: ${Object.entries(entry.changes || {}).map(([key, change]) => `${SOURCE_FIELD_LABEL[key] || key} ${String(change.from ?? "—")} → ${String(change.to ?? "—")}`).join(", ")}`,
                who: "원본 일정",
              }))]
              .sort((a, b) => String(b.at).localeCompare(String(a.at)))
              .map((row, index) => (
                <li key={`${row.at}-${index}`} className="flex gap-2">
                  <span className="cd-hq-quiet cd-hq-num flex-none text-[11px]">{formatDateTime(row.at)}</span>
                  <span className="min-w-0 text-[var(--cd-adm-ink)]">{row.text}{row.who ? <span className="cd-hq-quiet"> · {row.who}</span> : null}</span>
                </li>
              ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}
