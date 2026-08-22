"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Heart, Info, RotateCcw } from "lucide-react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
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

interface LoveSecretChecklistCopy {
  timingLabel: Record<string, string>;
  dayLabel: (day: number) => string;
  successAriaLabel: (total: number, filled: number) => string;
  completedStatus: (completed: number, total: number) => string;
  resetAriaLabel: string;
  resetButton: string;
  viewEvidence: string;
  collapseEvidence: string;
  evidencePrefix: string;
}

/** `timingLabel` 의 키는 서버/AI 가 내부적으로 쓰는 고정 한국어 태그다 — 로케일과 무관하게 그대로 매칭해야 한다. 화면에 보이는 값(우변)만 번역한다. */
const LOVE_SECRET_CHECKLIST_EN: LoveSecretChecklistCopy = {
  timingLabel: { 오늘: "Today", 이번주: "This week", "2주내": "Within 2 weeks", 이번달: "This month", 다음달: "Next month", 분기내: "This quarter" },
  dayLabel: (day) => `Day ${day}`,
  successAriaLabel: (total, filled) => `Success chance ${filled} of ${total}`,
  completedStatus: (completed, total) => `${completed} / ${total} done`,
  resetAriaLabel: "Reset love secret checklist progress",
  resetButton: "Reset",
  viewEvidence: "View evidence",
  collapseEvidence: "Hide evidence",
  evidencePrefix: "Evidence · ",
};

const LOVE_SECRET_CHECKLIST_COPY: Partial<Record<LoadingLocale, LoveSecretChecklistCopy>> = {
  ko: {
    timingLabel: { 오늘: "오늘", 이번주: "이번 주", "2주내": "2주 내", 이번달: "이번 달", 다음달: "다음 달", 분기내: "분기 내" },
    dayLabel: (day) => `${day}일차`,
    successAriaLabel: (total, filled) => `성공 가능성 ${total}단계 중 ${filled}`,
    completedStatus: (completed, total) => `${completed} / ${total} 완료`,
    resetAriaLabel: "연애 성공 체크리스트 진행 상태 초기화",
    resetButton: "초기화",
    viewEvidence: "근거 보기",
    collapseEvidence: "근거 접기",
    evidencePrefix: "근거 · ",
  },
  ja: {
    timingLabel: { 오늘: "今日", 이번주: "今週", "2주내": "2週間以内", 이번달: "今月", 다음달: "来月", 분기내: "四半期内" },
    dayLabel: (day) => `${day}日目`,
    successAriaLabel: (total, filled) => `成功可能性 ${total}段階中${filled}`,
    completedStatus: (completed, total) => `${completed} / ${total} 完了`,
    resetAriaLabel: "恋愛成功チェックリストの進行状況をリセット",
    resetButton: "リセット",
    viewEvidence: "根拠を見る",
    collapseEvidence: "根拠を閉じる",
    evidencePrefix: "根拠 · ",
  },
  "zh-CN": {
    timingLabel: { 오늘: "今天", 이번주: "本周", "2주내": "2周内", 이번달: "本月", 다음달: "下月", 분기내: "本季度内" },
    dayLabel: (day) => `第${day}天`,
    successAriaLabel: (total, filled) => `成功可能性 ${total}级中的${filled}`,
    completedStatus: (completed, total) => `${completed} / ${total} 已完成`,
    resetAriaLabel: "重置恋爱成功清单进度",
    resetButton: "重置",
    viewEvidence: "查看依据",
    collapseEvidence: "收起依据",
    evidencePrefix: "依据 · ",
  },
  "zh-TW": {
    timingLabel: { 오늘: "今天", 이번주: "本週", "2주내": "2週內", 이번달: "本月", 다음달: "下月", 분기내: "本季內" },
    dayLabel: (day) => `第${day}天`,
    successAriaLabel: (total, filled) => `成功可能性 ${total}級中的${filled}`,
    completedStatus: (completed, total) => `${completed} / ${total} 已完成`,
    resetAriaLabel: "重置戀愛成功清單進度",
    resetButton: "重置",
    viewEvidence: "查看依據",
    collapseEvidence: "收起依據",
    evidencePrefix: "依據 · ",
  },
  vi: {
    timingLabel: { 오늘: "Hôm nay", 이번주: "Tuần này", "2주내": "Trong 2 tuần", 이번달: "Tháng này", 다음달: "Tháng sau", 분기내: "Trong quý" },
    dayLabel: (day) => `Ngày ${day}`,
    successAriaLabel: (total, filled) => `Khả năng thành công ${filled}/${total}`,
    completedStatus: (completed, total) => `${completed} / ${total} hoàn thành`,
    resetAriaLabel: "Đặt lại tiến trình danh sách bí quyết tình yêu",
    resetButton: "Đặt lại",
    viewEvidence: "Xem căn cứ",
    collapseEvidence: "Ẩn căn cứ",
    evidencePrefix: "Căn cứ · ",
  },
  hi: {
    timingLabel: { 오늘: "आज", 이번주: "इस सप्ताह", "2주내": "2 सप्ताह के भीतर", 이번달: "इस महीने", 다음달: "अगले महीने", 분기내: "इस तिमाही में" },
    dayLabel: (day) => `दिन ${day}`,
    successAriaLabel: (total, filled) => `सफलता संभावना ${total} में से ${filled}`,
    completedStatus: (completed, total) => `${completed} / ${total} पूर्ण`,
    resetAriaLabel: "प्रेम सफलता चेकलिस्ट प्रगति रीसेट करें",
    resetButton: "रीसेट करें",
    viewEvidence: "आधार देखें",
    collapseEvidence: "आधार छिपाएं",
    evidencePrefix: "आधार · ",
  },
  es: {
    timingLabel: { 오늘: "Hoy", 이번주: "Esta semana", "2주내": "En 2 semanas", 이번달: "Este mes", 다음달: "El próximo mes", 분기내: "Este trimestre" },
    dayLabel: (day) => `Día ${day}`,
    successAriaLabel: (total, filled) => `Probabilidad de éxito ${filled} de ${total}`,
    completedStatus: (completed, total) => `${completed} / ${total} completado`,
    resetAriaLabel: "Restablecer el progreso de la lista de éxito amoroso",
    resetButton: "Restablecer",
    viewEvidence: "Ver la evidencia",
    collapseEvidence: "Ocultar evidencia",
    evidencePrefix: "Evidencia · ",
  },
  fr: {
    timingLabel: { 오늘: "Aujourd'hui", 이번주: "Cette semaine", "2주내": "Sous 2 semaines", 이번달: "Ce mois-ci", 다음달: "Le mois prochain", 분기내: "Ce trimestre" },
    dayLabel: (day) => `Jour ${day}`,
    successAriaLabel: (total, filled) => `Chance de succès ${filled} sur ${total}`,
    completedStatus: (completed, total) => `${completed} / ${total} terminé`,
    resetAriaLabel: "Réinitialiser la progression de la liste de réussite amoureuse",
    resetButton: "Réinitialiser",
    viewEvidence: "Voir les preuves",
    collapseEvidence: "Masquer les preuves",
    evidencePrefix: "Preuves · ",
  },
  de: {
    timingLabel: { 오늘: "Heute", 이번주: "Diese Woche", "2주내": "Innerhalb von 2 Wochen", 이번달: "Diesen Monat", 다음달: "Nächsten Monat", 분기내: "Dieses Quartal" },
    dayLabel: (day) => `Tag ${day}`,
    successAriaLabel: (total, filled) => `Erfolgschance ${filled} von ${total}`,
    completedStatus: (completed, total) => `${completed} / ${total} erledigt`,
    resetAriaLabel: "Fortschritt der Liebeserfolgs-Checkliste zurücksetzen",
    resetButton: "Zurücksetzen",
    viewEvidence: "Beleg ansehen",
    collapseEvidence: "Beleg ausblenden",
    evidencePrefix: "Beleg · ",
  },
  nl: {
    timingLabel: { 오늘: "Vandaag", 이번주: "Deze week", "2주내": "Binnen 2 weken", 이번달: "Deze maand", 다음달: "Volgende maand", 분기내: "Dit kwartaal" },
    dayLabel: (day) => `Dag ${day}`,
    successAriaLabel: (total, filled) => `Slaagkans ${filled} van ${total}`,
    completedStatus: (completed, total) => `${completed} / ${total} voltooid`,
    resetAriaLabel: "Voortgang van de liefdessucceschecklist resetten",
    resetButton: "Resetten",
    viewEvidence: "Bewijs bekijken",
    collapseEvidence: "Bewijs verbergen",
    evidencePrefix: "Bewijs · ",
  },
  ms: {
    timingLabel: { 오늘: "Hari ini", 이번주: "Minggu ini", "2주내": "Dalam 2 minggu", 이번달: "Bulan ini", 다음달: "Bulan depan", 분기내: "Suku tahun ini" },
    dayLabel: (day) => `Hari ${day}`,
    successAriaLabel: (total, filled) => `Kebarangkalian kejayaan ${filled} daripada ${total}`,
    completedStatus: (completed, total) => `${completed} / ${total} selesai`,
    resetAriaLabel: "Set semula kemajuan senarai semak kejayaan cinta",
    resetButton: "Set Semula",
    viewEvidence: "Lihat bukti",
    collapseEvidence: "Sembunyi bukti",
    evidencePrefix: "Bukti · ",
  },
};

function getLoveSecretChecklistCopy(locale: LoadingLocale): LoveSecretChecklistCopy {
  return LOVE_SECRET_CHECKLIST_COPY[locale] || LOVE_SECRET_CHECKLIST_EN;
}

function useLoveSecretChecklistCopy(): LoveSecretChecklistCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    document.addEventListener("cd:language-change", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      document.removeEventListener("cd:language-change", sync);
    };
  }, []);
  return getLoveSecretChecklistCopy(locale);
}

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

function ImportanceHearts({ level, copy }: { level: number; copy: LoveSecretChecklistCopy }) {
  const total = 3;
  const filled = Math.min(total, Math.max(0, level));
  if (!filled) return null;
  return (
    <span className="ml-auto flex items-center gap-1" role="img" aria-label={copy.successAriaLabel(total, filled)}>
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
  const copy = useLoveSecretChecklistCopy();
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
      timing: copy.timingLabel[secret.timing] || secret.timing,
      importance: secret.importance,
    })),
    ...sevenDayGuide.map((guide, index) => {
      const evidenceMatch = guide.match(/\(근거\s*[:：]\s*([^)]+)\)\s*$/);
      return {
        key: `day-${index}`,
        action: evidenceMatch ? guide.slice(0, evidenceMatch.index).trim() : guide,
        evidence: evidenceMatch?.[1]?.trim() || "",
        timing: copy.dayLabel(index + 1),
        importance: 0,
      };
    }),
  ], [secrets, sevenDayGuide, copy]);

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
          {copy.completedStatus(completed, items.length)}
        </p>
        <button
          type="button"
          onClick={reset}
          aria-label={copy.resetAriaLabel}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--ls-line-control)] px-3 text-xs font-bold text-[var(--ls-text-muted)] transition hover:bg-[var(--ls-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ls-focus)]"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.resetButton}
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
                    <ImportanceHearts level={item.importance} copy={copy} />
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
                        {showEvidence ? copy.collapseEvidence : copy.viewEvidence}
                      </button>
                      <p
                        id={evidenceId}
                        data-ls-collapsible
                        hidden={!showEvidence}
                        className="mt-1.5 rounded-2xl border border-[var(--ls-line)] bg-[var(--ls-surface-sunken)] px-3 py-2 text-xs leading-6 text-[var(--ls-text-muted)]"
                      >
                        {copy.evidencePrefix}{item.evidence}
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
