"use client";

import { useMemo, useState } from "react";
import { History, RotateCcw } from "lucide-react";

import { ADMIN_CARD, adminButton } from "../../_components/ui";

export interface CmsRevision {
  version: number;
  fields: Record<string, unknown>;
  status: string;
  note: string;
  updatedBy: string;
  createdAt: string | null;
}

interface RevisionPanelProps {
  revisions: CmsRevision[];
  currentFields: Record<string, unknown>;
  busy: boolean;
  onRestore: (version: number) => void;
}

type DiffRow = { kind: "same" | "add" | "remove"; text: string };

/** 필드 묶음을 사람이 읽는 줄 목록으로 편다. 비교는 이 평탄화된 형태로 한다. */
function flatten(fields: Record<string, unknown>): string[] {
  const lines: string[] = [];

  for (const [name, value] of Object.entries(fields || {}).sort(([a], [b]) => a.localeCompare(b))) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const text = item && typeof item === "object"
          ? Object.values(item as Record<string, unknown>).map((part) => String(part ?? "")).join(" — ")
          : String(item ?? "");
        lines.push(`${name}[${index}]: ${text}`);
      });
      continue;
    }
    if (value && typeof value === "object") {
      for (const [innerKey, innerValue] of Object.entries(value as Record<string, unknown>)) {
        lines.push(`${name}.${innerKey}: ${String(innerValue ?? "")}`);
      }
      continue;
    }
    lines.push(`${name}: ${String(value ?? "")}`);
  }

  return lines;
}

/** 줄 단위 LCS diff. 외부 의존성을 새로 들이지 않으려고 직접 계산한다. */
function diffLines(before: string[], after: string[]): DiffRow[] {
  const rows = before.length;
  const cols = after.length;
  const table: number[][] = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));

  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = cols - 1; j >= 0; j -= 1) {
      table[i][j] = before[i] === after[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const result: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < cols) {
    if (before[i] === after[j]) {
      result.push({ kind: "same", text: before[i] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      result.push({ kind: "remove", text: before[i] });
      i += 1;
    } else {
      result.push({ kind: "add", text: after[j] });
      j += 1;
    }
  }
  while (i < rows) { result.push({ kind: "remove", text: before[i] }); i += 1; }
  while (j < cols) { result.push({ kind: "add", text: after[j] }); j += 1; }

  return result;
}

function formatTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
}

export default function RevisionPanel({ revisions, currentFields, busy, onRestore }: RevisionPanelProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const diff = useMemo(() => {
    if (selected === null) return null;
    const revision = revisions.find((item) => item.version === selected);
    if (!revision) return null;
    // 왼쪽 = 선택한 과거 버전, 오른쪽 = 지금 값. 즉 "복원하면 무엇이 되돌아오는가"를 보여준다.
    return diffLines(flatten(currentFields), flatten(revision.fields));
  }, [selected, revisions, currentFields]);

  const changedCount = diff ? diff.filter((row) => row.kind !== "same").length : 0;

  if (!revisions.length) {
    return (
      <p className={`${ADMIN_CARD} rounded-lg px-3 py-6 text-center text-sm text-slate-400`}>
        아직 저장 이력이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`${ADMIN_CARD} max-h-56 divide-y divide-slate-800 overflow-y-auto rounded-lg`}>
        {revisions.map((revision) => (
          <button
            key={revision.version}
            type="button"
            onClick={() => setSelected(selected === revision.version ? null : revision.version)}
            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-900 ${selected === revision.version ? "bg-slate-900" : ""}`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <History className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
              <span className="text-sm tabular-nums text-slate-200">v{revision.version}</span>
              <span className="truncate text-xs text-slate-500">
                {revision.note || revision.status}
                {revision.updatedBy ? ` · ${revision.updatedBy}` : ""}
              </span>
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-slate-500">{formatTime(revision.createdAt)}</span>
          </button>
        ))}
      </div>

      {selected !== null && diff ? (
        <div className={`${ADMIN_CARD} space-y-2 rounded-lg p-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-400">
              v{selected} 로 복원하면 <span className="text-slate-200">{changedCount}줄</span>이 바뀝니다.
              <span className="ml-2 text-emerald-300">초록 = 복원될 내용</span>
              <span className="ml-2 text-rose-300">빨강 = 사라질 내용</span>
            </p>
            <button
              type="button"
              onClick={() => onRestore(selected)}
              disabled={busy}
              className={adminButton("warn", { size: "sm" })}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              이 버전으로 복원
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto rounded-md border border-slate-800 bg-slate-950 p-2 font-mono text-[12px] leading-5">
            {diff.map((row, index) => (
              <p
                // eslint-disable-next-line react/no-array-index-key -- diff 행은 위치 자체가 정체성이다
                key={index}
                className={
                  row.kind === "add"
                    ? "whitespace-pre-wrap break-words bg-emerald-950/60 text-emerald-200"
                    : row.kind === "remove"
                      ? "whitespace-pre-wrap break-words bg-rose-950/60 text-rose-200"
                      : "whitespace-pre-wrap break-words text-slate-500"
                }
              >
                {row.kind === "add" ? "+ " : row.kind === "remove" ? "- " : "  "}
                {row.text}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
