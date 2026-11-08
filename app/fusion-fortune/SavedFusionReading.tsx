"use client";

import { useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useFusionSections } from "./_lib/useFusionSections";
import { FusionResultThread } from './FusionResultThread';
import { FusionResultRail } from './FusionResultRail';
import type { Result } from './fusion-thread';
import { recordReaderCopy } from '@/lib/records/reader-copy';
import styles from './fusion-fortune.module.css';

/**
 * 보관함의 초융합 운세를 결과 화면과 같은 조판 PDF로 저장한다(2026-11-08 6단계 8번). 저장된 결과만 쓰고 다시 생성하지 않는다.
 * 결과 화면과 같이 R2 한글 폰트를 못 실으면 캡처 PDF로 되돌아간다.
 */
function SavedFusionPdfButton({ result, locale, onExporting }: { result: Result; locale: string; onExporting: (value: boolean) => void }) {
  const copy = recordReaderCopy(locale);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    if (loading) return;
    setLoading(true); setError(''); onExporting(true);
    const identity = String(result.expertMeta?.identity || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
    const fileName = `fusion-fortune-${identity || new Date().toISOString().slice(0, 10)}.pdf`;
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise((resolve) => setTimeout(resolve, 120));
      const { exportFusionReportPdf, FusionPdfFontError } = await import('@/lib/pdf/export-fusion-report-pdf');
      try {
        await exportFusionReportPdf({ result, fileName, visualizationSelector: '[data-fusion-visual]' });
      } catch (cause) {
        if (!(cause instanceof FusionPdfFontError)) throw cause;
        const { exportResultPdf } = await import('@/lib/pdf/export-result-pdf');
        await exportResultPdf({
          captureTargets: ['[data-fusion-pdf-section]'],
          fileName,
          backgroundColor: '#12102a',
          cover: { title: result.title || '초융합 운세', subtitle: '초융합 운세' },
          watermarkText: '꿀꿀운세',
        });
      }
    } catch {
      setError(copy.pdfError);
    } finally {
      setLoading(false); onExporting(false);
    }
  }
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginBottom: 12 }}>
    <button type="button" onClick={() => void save()} disabled={loading} style={{ minHeight: 44 }}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--cd-accent)] bg-transparent px-5 text-sm font-semibold text-[var(--cd-accent)] transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
      {loading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
      {loading ? copy.preparingPdf : copy.savePdf}
    </button>
    {error && <p role="alert" className="text-sm text-[var(--cd-text-muted)]">{error}</p>}
  </div>;
}

/** Library detail shares the native reader without any generation or payment effects. */
export function SavedFusionReading({ result, locale = 'ko' }: { result: Result; locale?: string }) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const { openSections, openSection, toggleSection } = useFusionSections();
  return <div ref={scopeRef} className={`${styles.page} rounded-[var(--cd-r-card)] p-3`}>
    <SavedFusionPdfButton result={result} locale={locale} onExporting={setExporting} />
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_224px] lg:gap-6">
      <ol className="m-0 grid min-w-0 list-none gap-5 p-0">
        <FusionResultThread result={result} openSections={openSections} onToggleSection={toggleSection} exporting={exporting} />
      </ol>
      <FusionResultRail result={result} generating={false} exporting={exporting} onOpenSection={openSection} scopeRef={scopeRef} storageKey={result.expertMeta?.identity ? `cdFusionReading:${result.expertMeta.identity}` : ''} />
    </div>
  </div>;
}
