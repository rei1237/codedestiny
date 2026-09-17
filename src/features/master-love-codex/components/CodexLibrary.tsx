"use client";

/**
 * 내 서재 — 결제한 인연의 서를 다시 펼치는 입구.
 *
 * 완성된 책은 결과 라우트에서 다시 읽고, 멈춘 책은 같은 세션으로 이어서 집필하며, 결제만 되고
 * 시작 전인 주문은 결제 복구 경로로 시작한다. 어느 경우에도 새 결제를 만들지 않는다.
 */

import { useEffect } from "react";
import { BookOpen, Feather } from "lucide-react";
import { masterLoveCodexBilling, type MasterLoveCodexMode } from "../constants";
import { useMasterLoveCodexCopy, useMasterLoveCodexLocale } from "../_lib/copy";
import styles from "../styles/codex.module.css";

export type CodexLibrarySession = {
  sessionId: string;
  mode: MasterLoveCodexMode;
  status: string;
  createdAt?: string;
  name?: string;
  partnerName?: string;
  generationProgress?: { completed?: number; total?: number };
};

export type CodexLibraryPurchase = { orderId: string; featureKey: string; requestId: string; status: string };

interface CodexLibraryProps {
  sessions: CodexLibrarySession[];
  purchases: CodexLibraryPurchase[];
  busy: boolean;
  error: string;
  onOpenSession: (sessionId: string) => void;
  onStartPurchase: (purchase: CodexLibraryPurchase) => void;
}

export const CODEX_LIBRARY_ANCHOR = "codex-library";

export default function CodexLibrary({ sessions, purchases, busy, error, onOpenSession, onStartPurchase }: CodexLibraryProps) {
  const copy = useMasterLoveCodexCopy();
  const locale = useMasterLoveCodexLocale();
  const hasBooks = sessions.length > 0 || purchases.length > 0;
  // 결과 화면의 "내 서재" 링크로 왔을 때 — 목록은 비동기로 도착해 브라우저의 해시 스크롤이 먼저 끝나 버린다.
  useEffect(() => {
    if (hasBooks && window.location.hash === `#${CODEX_LIBRARY_ANCHOR}`) {
      document.getElementById(CODEX_LIBRARY_ANCHOR)?.scrollIntoView({ block: "start" });
    }
  }, [hasBooks]);
  if (!hasBooks) return null;

  const formatDate = (value?: string) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "";
    try {
      return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(date);
    } catch {
      return date.toISOString().slice(0, 10);
    }
  };

  return (
    <section id={CODEX_LIBRARY_ANCHOR} className={styles.library} aria-labelledby="codex-library-title">
      <div className={styles.measure}>
        <p className={styles.libraryEyebrow}>{copy.libraryEyebrow}</p>
        <h2 id="codex-library-title" className={styles.libraryHeading}>{copy.libraryTitle}</h2>
        <p className={styles.libraryDesc}>{copy.libraryDesc}</p>

        <ul className={styles.libraryList}>
          {purchases.map((purchase) => {
            const edition = masterLoveCodexBilling(purchase.featureKey.endsWith("-compat") ? "compat" : "solo", locale).title;
            return (
              <li key={purchase.orderId} className={`${styles.libraryCard} ${styles.libraryCardPending}`}>
                <div className={styles.libraryCardBody}>
                  <p className={styles.libraryEdition}>{edition}</p>
                  <span className={`${styles.libraryStatus} ${styles.libraryStatusActive}`}>{copy.libraryStatusPurchased}</span>
                </div>
                <button type="button" className={styles.libraryAction} disabled={busy} onClick={() => onStartPurchase(purchase)}>
                  <Feather className="h-4 w-4" aria-hidden="true" />
                  {copy.libraryStart}
                </button>
              </li>
            );
          })}

          {sessions.map((session) => {
            const edition = masterLoveCodexBilling(session.mode, locale).title;
            const total = session.generationProgress?.total || 20;
            const completed = session.status === "completed";
            const done = completed ? total : Math.min(session.generationProgress?.completed || 0, total);
            const title = session.mode === "compat" && session.name && session.partnerName
              ? `${session.name} × ${session.partnerName}`
              : session.name ? copy.possessiveBookTitle(session.name, edition) : edition;
            const date = formatDate(session.createdAt);
            const status = completed
              ? copy.libraryStatusCompleted
              : session.status === "generation_failed" ? copy.libraryStatusPaused(done, total) : copy.libraryStatusWriting(done, total);
            return (
              <li key={session.sessionId} className={styles.libraryCard}>
                <div className={styles.libraryCardBody}>
                  <p className={styles.libraryEdition}>{date ? `${edition} · ${date}` : edition}</p>
                  <h3 className={styles.libraryBookTitle}>{title}</h3>
                  <span className={`${styles.libraryStatus} ${completed ? "" : styles.libraryStatusActive}`}>{status}</span>
                  {!completed ? (
                    <span className={styles.libraryProgress} aria-hidden="true">
                      <span style={{ width: `${Math.round((done / total) * 100)}%` }} />
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={`${styles.libraryAction} ${completed ? styles.libraryActionPrimary : ""}`}
                  disabled={busy}
                  onClick={() => onOpenSession(session.sessionId)}
                >
                  {completed ? <BookOpen className="h-4 w-4" aria-hidden="true" /> : <Feather className="h-4 w-4" aria-hidden="true" />}
                  {completed ? copy.libraryReadAgain : copy.libraryContinue}
                </button>
              </li>
            );
          })}
        </ul>
        {error ? <p role="alert" className={styles.libraryError}>{error}</p> : null}
      </div>
    </section>
  );
}
