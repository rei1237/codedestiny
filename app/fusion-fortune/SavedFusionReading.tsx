"use client";

import { useRef, useState } from 'react';
import { FusionResultThread } from './FusionResultThread';
import { FusionResultRail } from './FusionResultRail';
import type { Result } from './fusion-thread';
import styles from './fusion-fortune.module.css';

/** Library detail shares the native reader without any generation or payment effects. */
export function SavedFusionReading({ result }: { result: Result }) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const [openSection, setOpenSection] = useState('');
  return <div ref={scopeRef} className={`${styles.page} rounded-[var(--cd-r-card)] p-3`}>
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_224px] lg:gap-6">
      <ol className="m-0 grid min-w-0 list-none gap-5 p-0">
        <FusionResultThread result={result} openSection={openSection} onToggleSection={key => setOpenSection(current => current === key ? '' : key)} exporting={false} />
      </ol>
      <FusionResultRail result={result} generating={false} exporting={false} onOpenSection={setOpenSection} scopeRef={scopeRef} storageKey={result.expertMeta?.identity ? `cdFusionReading:${result.expertMeta.identity}` : ''} />
    </div>
  </div>;
}
