"use client";

import type { ReactNode } from 'react';
import { currentFortuneSharedCopy } from './_lib/fortune-shared-copy';
import styles from './result-reference.module.css';

/** Presentation only: keep the saved reference available, behind the actual reading. */
export default function ResultReference({ children, label, exportOpen = false }: {
  children: ReactNode; label?: string; exportOpen?: boolean;
}) {
  return <details className={styles.reference} data-result-reference open={exportOpen || undefined}>
    <summary>{label || currentFortuneSharedCopy().basisTitle}</summary>
    <div className={styles.body}>{children}</div>
  </details>;
}
