"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ResultViewerPage } from "@/components/fortune/PagedResultViewer";
import type { LoadingLocale } from "@/constants/loadingMessages";
import { getNeoVisualCopy } from "../data/visual-copy";
import styles from "../neo-operation-room-result.module.css";

/** Neo-only reader. Export opens every chapter without changing the reader's choices. */
export default function NeoResultChapters({ pages, viewAll, onViewAllChange, expandForExport, locale, label }: {
  pages: ResultViewerPage[];
  viewAll: boolean;
  onViewAllChange: (value: boolean) => void;
  expandForExport: boolean;
  locale: LoadingLocale;
  label: string;
}) {
  const copy = getNeoVisualCopy(locale);
  const [openChapters, setOpenChapters] = useState<Set<string>>(() => new Set());
  if (!pages.length) return null;
  const allOpen = viewAll || pages.every(page => openChapters.has(page.id));
  return (
    <section className={styles.chapterReader} aria-label={label} data-export={expandForExport ? "true" : "false"}>
      {!expandForExport ? (
        <div className={styles.chapterToolbar}>
          <p>{copy.detailsHint}</p>
          <button type="button" onClick={() => {
            setOpenChapters(new Set());
            onViewAllChange(!allOpen);
          }}>{allOpen ? copy.collapse : copy.expand}</button>
        </div>
      ) : null}
      {pages.map(page => {
        const isOpen = expandForExport || viewAll || openChapters.has(page.id);
        return (
          <details key={page.id} id={page.id} className={styles.chapter} open={isOpen}>
            <summary onClick={event => {
              event.preventDefault();
              if (expandForExport) return;
              const next = viewAll ? new Set(pages.map(item => item.id)) : new Set(openChapters);
              if (isOpen) next.delete(page.id); else next.add(page.id);
              setOpenChapters(next);
              if (viewAll) onViewAllChange(false);
            }}>
              <span>{page.label}</span><ChevronDown aria-hidden="true" />
            </summary>
            <div className={styles.chapterBody}>{page.content}</div>
          </details>
        );
      })}
    </section>
  );
}
