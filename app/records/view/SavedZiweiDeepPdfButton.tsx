"use client";
import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { recordReaderCopy } from '@/lib/records/reader-copy';
import { storedText as text } from '@/lib/records/reading-content';

/** 보관함의 자미 심층 리포트를 결과 화면과 같은 조판기로 PDF에 저장한다. 저장된 장만 쓰고 다시 생성하지 않는다. */
export default function SavedZiweiDeepPdfButton({ row, locale }: { row: Record<string, unknown>; locale: string }) {
  const copy = recordReaderCopy(locale);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    if (loading) return;
    setLoading(true); setError('');
    try {
      const [{ exportZiweiReportPdf }, characters] = await Promise.all([
        import('@/lib/pdf/export-ziwei-report-pdf'),
        import('@/src/features/expert-characters'),
      ]);
      const chapters = (Array.isArray(row.chapters) ? row.chapters : [])
        .map((chapter) => chapter as Record<string, unknown>)
        .filter((chapter) => text(chapter?.body).trim())
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
        .map((chapter) => ({ id: text(chapter.id), title: text(chapter.title), body: text(chapter.body) }));
      if (!chapters.length) throw new Error('no chapters');
      const id = text(row.id || row.reportId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'record';
      const musungOn = characters.isExpertCharacterEnabled('musung');
      await exportZiweiReportPdf({
        chapters,
        title: '자미두수 심층 리포트',
        date: text(row.updatedAt || row.createdAt).slice(0, 10) || new Date().toISOString().slice(0, 10),
        fileName: `ziwei-deep-${id}.pdf`,
        ...(musungOn ? { byline: characters.getExpertLine('musung', 'pdf.byline', locale).text, coverArtSrc: characters.getExpertCharacter('musung').hero.src } : {}),
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
