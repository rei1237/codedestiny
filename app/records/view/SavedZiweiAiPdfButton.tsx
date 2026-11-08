"use client";
import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { recordReaderCopy } from '@/lib/records/reader-copy';
import { storedText as text } from '@/lib/records/reading-content';

/** 보관함의 자미두수 상담을 결과 화면과 같은 장 빌더로 조판 PDF에 저장한다. 저장된 글만 쓰고 다시 생성하지 않는다. */
export default function SavedZiweiAiPdfButton({ row, locale }: { row: Record<string, unknown>; locale: string }) {
  const copy = recordReaderCopy(locale);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    if (loading) return;
    setLoading(true); setError('');
    try {
      const [{ exportConsultationBookPdf }, { buildZiweiAiPdfChapters, ZIWEI_AI_SPEAKER }] = await Promise.all([
        import('@/lib/pdf/export-consultation-book-pdf'),
        import('@/lib/ziwei/ziwei-ai-chapters'),
      ]);
      const chapters = buildZiweiAiPdfChapters(row as Parameters<typeof buildZiweiAiPdfChapters>[0]);
      if (!chapters.length) throw new Error('no chapters');
      const id = text(row.sessionId || row.consultationId || row.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'record';
      await exportConsultationBookPdf({
        title: '자미두수 상담',
        productLabel: '자미두수 상담',
        byline: ZIWEI_AI_SPEAKER,
        coverTheme: 'ziwei',
        date: text(row.createdAt).slice(0, 10) || new Date().toISOString().slice(0, 10),
        fileName: `ziwei-reading-${id}.pdf`,
        chapters,
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
