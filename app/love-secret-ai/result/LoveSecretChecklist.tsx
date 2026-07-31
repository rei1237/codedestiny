"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Heart, Info, RotateCcw } from "lucide-react";
import styles from "./LoveSecretAiResultClient.module.css";

export type ActionSecret = {
  difficulty: string;
  importance: number;
  timing: string;
  action: string;
  evidence: string;
};

type ChecklistItem = {
  key: string;
  action: string;
  evidence: string;
  timing: string;
  importance: number;
};

type StoredState = { v: 1; done: string[]; at: string };

const STORAGE_PREFIX = "loveSecretChecklistV1:";
const TIMING_LABEL: Record<string, string> = {
  오늘: "오늘",
  이번주: "이번 주",
  "2주내": "2주 내",
  이번달: "이번 달",
  다음달: "다음 달",
  분기내: "분기 내",
};

function readStored(storageKey: string): Set<string> {
  if (typeof window === "undefined" || !storageKey) return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as StoredState;
    return new Set(Array.isArray(parsed?.done) ? parsed.done : []);
  } catch {
    return new Set();
  }
}

function writeStored(storageKey: string, done: Set<string>) {
  if (typeof window === "undefined" || !storageKey) return;
  try {
    const payload: StoredState = { v: 1, done: [...done], at: new Date().toISOString() };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // 저장 실패는 조용히 무시한다 — 체크 상태는 편의 기능이지 결과의 일부가 아니다.
  }
}

function ImportanceHearts({ level }: { level: number }) {
  const total = 3;
  const filled = Math.min(total, Math.max(0, level));
  if (!filled) return null;
  return (
    <span className="ml-auto flex items-center gap-1" role="img" aria-label={`성공 가능성 ${total}단계 중 ${filled}`}>
      {Array.from({ length: total }).map((_, index) => (
        <Heart
          key={index}
          className={`h-3.5 w-3.5 ${index < filled ? "fill-[var(--ls-rose)] text-[var(--ls-rose)]" : "text-[var(--ls-line)]"}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/**
 * 연애 성공 체크리스트.
 * 기존 로드맵 카드를 흡수했다 — 카드마다 체크박스가 붙으면 별도 컴포넌트가 필요 없다.
 *
 * 저장 키는 상담 단위(`loveSecretChecklistV1:<sessionId>`)다. 식별자가 없으면 저장하지 않는다.
 * 전역 키를 쓰면 다른 상담의 체크 상태가 섞인다.
 */
export default function LoveSecretChecklist({
  secrets,
  sevenDayGuide,
  consultationKey,
  forceExpanded,
}: {
  secrets: ActionSecret[];
  sevenDayGuide: string[];
  consultationKey: string;
  forceExpanded: boolean;
}) {
  const storageKey = consultationKey ? `${STORAGE_PREFIX}${consultationKey}` : "";
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [openEvidence, setOpenEvidence] = useState<Set<string>>(() => new Set());

  // 렌더 중이 아니라 마운트 후 1회만 읽는다(SSR 불일치·예외 전파 방지).
  useEffect(() => {
    setDone(readStored(storageKey));
  }, [storageKey]);

  const items = useMemo<ChecklistItem[]>(() => [
    ...secrets.map((secret, index) => ({
      key: `secret-${index}`,
      action: secret.action,
      evidence: secret.evidence,
      timing: TIMING_LABEL[secret.timing] || secret.timing,
      importance: secret.importance,
    })),
    ...sevenDayGuide.map((guide, index) => {
      const evidenceMatch = guide.match(/\(근거\s*[:：]\s*([^)]+)\)\s*$/);
      return {
        key: `day-${index}`,
        action: evidenceMatch ? guide.slice(0, evidenceMatch.index).trim() : guide,
        evidence: evidenceMatch?.[1]?.trim() || "",
        timing: `${index + 1}일차`,
        importance: 0,
      };
    }),
  ], [secrets, sevenDayGuide]);

  const toggle = useCallback((key: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      writeStored(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const reset = useCallback(() => {
    setDone(() => {
      const next = new Set<string>();
      writeStored(storageKey, next);
      return next;
    });
  }, [storageKey]);

  if (!items.length) return null;
  const completed = items.filter((item) => done.has(item.key)).length;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="text-sm font-black text-[var(--ls-accent)]">
          {completed} / {items.length} 완료
        </p>
        <button
          type="button"
          onClick={reset}
          aria-label="연애 성공 체크리스트 진행 상태 초기화"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--ls-line-control)] px-3 text-xs font-bold text-[var(--ls-text-muted)] transition hover:bg-[var(--ls-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ls-focus)]"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          초기화
        </button>
      </div>

      <ul className="mt-4 grid gap-2.5">
        {items.map((item, index) => {
          const checked = done.has(item.key);
          const evidenceId = `ls-evidence-${item.key}`;
          const showEvidence = forceExpanded || openEvidence.has(item.key);
          return (
            <li
              key={item.key}
              data-ls-reveal="in"
              className={`${styles.revealItem} rounded-2xl border border-[var(--ls-line)] bg-[var(--ls-surface)] p-3.5`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={item.key}
                  checked={checked}
                  onChange={() => toggle(item.key)}
                  className="mt-1 h-5 w-5 shrink-0 rounded accent-[var(--ls-accent)]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--ls-surface-sunken)] px-2.5 py-0.5 text-[11px] font-black text-[var(--ls-accent)]">
                      {index + 1}
                    </span>
                    {item.timing && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ls-line)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--ls-text-muted)]">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {item.timing}
                      </span>
                    )}
                    <ImportanceHearts level={item.importance} />
                  </div>
                  <label
                    htmlFor={item.key}
                    className={`mt-2 block cursor-pointer text-[15px] font-bold leading-7 ${checked ? "text-[var(--ls-text-muted)] line-through" : "text-[var(--ls-text)]"}`}
                  >
                    {item.action}
                  </label>
                  {item.evidence && (
                    <>
                      <button
                        type="button"
                        onClick={() => setOpenEvidence((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.key)) next.delete(item.key);
                          else next.add(item.key);
                          return next;
                        })}
                        aria-expanded={showEvidence}
                        aria-controls={evidenceId}
                        className="mt-2 inline-flex items-center gap-1 rounded-full px-1 py-0.5 text-xs font-bold text-[var(--ls-accent)] transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ls-focus)]"
                      >
                        <Info className="h-3.5 w-3.5" aria-hidden="true" />
                        {showEvidence ? "근거 접기" : "근거 보기"}
                      </button>
                      <p
                        id={evidenceId}
                        data-ls-collapsible
                        hidden={!showEvidence}
                        className="mt-1.5 rounded-2xl border border-[var(--ls-line)] bg-[var(--ls-surface-sunken)] px-3 py-2 text-xs leading-6 text-[var(--ls-text-muted)]"
                      >
                        근거 · {item.evidence}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
