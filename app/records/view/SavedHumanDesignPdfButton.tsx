"use client";
import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { recordReaderCopy } from '@/lib/records/reader-copy';
import { asRecord as object } from '@/lib/records/reading-content';
import type { ReportPlan } from '@/app/human-design/report/_lib/types';

/** 보관함의 휴먼디자인 리포트를 결과 화면과 같은 플랜·조판기로 PDF에 저장한다. 저장된 글만 쓰고 다시 생성하지 않는다. */
export default function SavedHumanDesignPdfButton({ row, chart, locale }: { row: Record<string, unknown>; chart: unknown; locale: string }) {
  const copy = recordReaderCopy(locale);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    if (loading) return;
    setLoading(true); setError('');
    try {
      const [{ buildHumanDesignReportPlan }, { captureChartSlots }, { exportHumanDesignReportPdf }] = await Promise.all([
        import('@/lib/human-design/report-plan'),
        import('@/app/human-design/report/_lib/capture-chart-slots'),
        import('@/lib/pdf/export-human-design-report-pdf'),
      ]);
      const plan = buildHumanDesignReportPlan({ ...row, sections: Array.isArray(row.sections) ? row.sections : [] }, object(chart)) as ReportPlan;
      if (!plan.chapters.length) throw new Error('no chapters');
      type Chart = Parameters<typeof captureChartSlots>[0];
      const images = await captureChartSlots(chart as Chart, plan.chartSlots, plan.locale, () => {});
      await exportHumanDesignReportPdf({
        plan,
        images,
        fileName: `human-design-report-${plan.locale}-${new Date().toISOString().slice(0, 10)}.pdf`,
        date: new Date().toLocaleDateString(plan.locale === 'en' ? 'en-US' : 'ko-KR'),
      });
    } catch {
      setError(copy.pdfError);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginBottom: 16 }}>
      <button
        type="button"
        onClick={() => void save()}
        disabled={loading}
        style={{ minHeight: 44 }}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--cd-accent)] bg-transparent px-5 text-sm font-semibold text-[var(--cd-accent)] transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        {loading ? copy.preparingPdf : copy.savePdf}
      </button>
      {error && <p role="alert" className="text-sm text-[var(--cd-text-muted)]">{error}</p>}
    </div>
  );
}
