"use client";

// 퀘스트를 여러 화면(홈·퀘스트·데모)에서 같은 모양으로 보여 주는 작은 부품.

import Link from "next/link";
import { ChevronRight, Clock3 } from "lucide-react";
import { StatusBadge } from "./components";
import { formatDateKey, formatXp } from "./format";
import type { Quest, Tone } from "./types";

export const STATUS_TONE: Record<string, Tone> = {
  scheduled: "muted",
  in_progress: "accent",
  review: "info",
  done: "ok",
  on_hold: "warn",
  cancelled: "muted",
  archived: "muted",
};

export function questTone(quest: Pick<Quest, "status" | "overdue">): Tone {
  if (quest.overdue && quest.status !== "done") return "err";
  return STATUS_TONE[quest.status] || "muted";
}

export function QuestBadges({ quest }: { quest: Quest }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <StatusBadge tone={STATUS_TONE[quest.status] || "muted"} label={quest.statusLabel} />
      {quest.overdue && quest.status !== "done" ? <StatusBadge tone="err" label="기한 경과" /> : null}
      {quest.automation ? <StatusBadge tone="info" label="자동 발행 확인" title="Threads 자동 발행 기록을 읽기만 합니다" /> : null}
      {quest.sourceChanged ? <StatusBadge tone="warn" label="원본 일정 변경" /> : null}
    </span>
  );
}

export function questHref(id: string) {
  return `/admin/quests/?id=${encodeURIComponent(id)}`;
}

/** 한 줄 퀘스트. onOpen 이 있으면 버튼(드로어), 없으면 퀘스트 화면 링크. */
export function QuestRow({ quest, onOpen, showDate = true }: { quest: Quest; onOpen?: (id: string) => void; showDate?: boolean }) {
  const body = (
    <span className="flex items-start gap-3">
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
          <span className="cd-hq-quiet">{quest.kindGame} · {quest.kindLabel}</span>
          <span className="cd-hq-quiet">{quest.channelLabel}{quest.language && quest.language !== "ko" ? ` · ${quest.language.toUpperCase()}` : ""}</span>
        </span>
        <span className="mt-0.5 block text-[14px] font-semibold leading-snug text-[var(--cd-adm-ink)]">{quest.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <QuestBadges quest={quest} />
          <span className="cd-hq-quiet cd-hq-num inline-flex items-center gap-1 text-[12px]">
            <Clock3 aria-hidden="true" size={12} />
            {showDate ? `${formatDateKey(quest.plannedDate)} ` : ""}{quest.plannedTime || ""} · 약 {quest.estimatedMinutes}분
          </span>
          {quest.baseXp ? <span className="cd-hq-num cd-hq-tone-accent text-[12px]">{formatXp(quest.baseXp, { signed: true })}</span> : null}
        </span>
      </span>
      <ChevronRight aria-hidden="true" size={16} className="cd-hq-quiet mt-1 flex-none" />
    </span>
  );
  if (onOpen) {
    return <button type="button" className="cd-hq-row px-3 py-2.5 text-left" onClick={() => onOpen(quest.id)}>{body}</button>;
  }
  return <Link href={questHref(quest.id)} className="cd-hq-row px-3 py-2.5">{body}</Link>;
}
