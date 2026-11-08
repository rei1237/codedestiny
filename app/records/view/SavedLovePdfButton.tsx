"use client";
import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { recordReaderCopy } from '@/lib/records/reader-copy';
import { asRecord as object, storedText as text } from '@/lib/records/reading-content';

const SPEAKERS: Record<string, { yeoni: string; hanbi: string }> = {
  ko: { yeoni: '연이', hanbi: '서한비' },
  en: { yeoni: 'Yeoni', hanbi: 'Seo Hanbi' },
  ja: { yeoni: 'ヨニ', hanbi: 'ソ・ハンビ' },
};

/** 보관함의 연애 비책을 결과 화면과 같은 조판 PDF로 저장한다. 저장된 글만 쓰고 다시 생성하지 않는다. */
export default function SavedLovePdfButton({ row, locale }: { row: Record<string, unknown>; locale: string }) {
  const copy = recordReaderCopy(locale);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    if (loading) return;
    setLoading(true); setError('');
    try {
      const [{ exportConsultationBookPdf }, { buildLoveSecretPdfChapters }] = await Promise.all([
        import('@/lib/pdf/export-consultation-book-pdf'),
        import('@/app/love-secret-ai/result/love-secret-pdf-chapters'),
      ]);
      const names = SPEAKERS[locale.toLowerCase().split(/[-_]/)[0]] || SPEAKERS.en;
      const chapters = buildLoveSecretPdfChapters(row as Parameters<typeof buildLoveSecretPdfChapters>[0], names);
      if (!chapters.length) throw new Error('no chapters');
      const id = text(row.sessionId || row.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'record';
      await exportConsultationBookPdf({
        title: text(object(row.reading).summaryTitle) || '연애 비책 상담',
        productLabel: '연애 비책',
        byline: `${names.yeoni} · ${names.hanbi}`,
        coverTheme: 'love',
        date: text(row.createdAt).slice(0, 10) || new Date().toISOString().slice(0, 10),
        fileName: `love-secret-reading-${id}.pdf`,
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
        className="inline-flex items-center gap-2 rounded-full bg-[var(--ls-accent)] px-5 text-sm font-semibold text-[var(--ls-accent-ink)] transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        {loading ? copy.preparingPdf : copy.savePdf}
      </button>
      {error && <p role="alert" className="text-sm text-[var(--ls-text-muted)]">{error}</p>}
    </div>
  );
}
