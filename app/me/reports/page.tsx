"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../../_lib/auth-client";
import { getApiBaseUrl } from "../../_lib/api-config";

type ArchiveReport = {
  reportId: string;
  reportType: string;
  title?: string;
  displayName?: string;
  mode?: string;
  completedAt?: string;
  createdAt?: string;
  summary?: string;
  pdfUrl?: string;
  chapters?: Array<{
    chapterNo?: number;
    title?: string;
    subtitle?: string;
    sections?: Array<{
      title?: string;
      body?: string;
    }>;
  }>;
};

function formatDate(raw?: string) {
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date);
}

export default function PremiumArchiveReportPage() {
  const router = useRouter();
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const [reportId, setReportId] = useState("");

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [report, setReport] = useState<ArchiveReport | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search || "");
      setReportId(String(params.get("reportId") || "").trim());
    } catch (_) {
      setReportId("");
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!reportId) {
        if (mounted) {
          setErrorText("저장된 PDF 결과를 찾을 수 없습니다.");
          setLoading(false);
        }
        return;
      }

      try {
        const response = await authFetch(`${apiBase}/api/premium/pdf-archive/${encodeURIComponent(reportId)}`, {
          method: "GET",
          cache: "no-store",
        }, {
          retryOn401: true,
          apiBase,
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) {
          const message = String(payload?.error?.message || payload?.message || "저장된 PDF 결과를 찾을 수 없습니다.");
          if (mounted) {
            setErrorText(message);
            setReport(null);
          }
          return;
        }

        const nextReport = payload?.report as ArchiveReport | undefined;
        if (mounted) {
          setReport(nextReport || null);
          setErrorText("");
        }
      } catch (_) {
        if (mounted) {
          setErrorText("저장된 PDF 결과를 찾을 수 없습니다.");
          setReport(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [apiBase, reportId]);

  const chapters = Array.isArray(report?.chapters) ? report!.chapters! : [];

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0f1224] px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-4xl text-sm text-slate-300">리포트를 불러오는 중입니다.</div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-[#0f1224] px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-4xl rounded-lg border border-rose-300/35 bg-rose-500/10 p-5 text-sm text-rose-100">
          {errorText || "저장된 PDF 결과를 찾을 수 없습니다."}
        </div>
        <div className="mx-auto mt-4 max-w-4xl">
          <button
            type="button"
            onClick={() => router.push("/me")}
            className="rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200"
          >
            나의 PDF 보관함으로 이동
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f1224] px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">Premium Archive</p>
          <h1 className="mt-1 text-2xl font-bold text-white">{report.title || report.displayName || "프리미엄 리포트"}</h1>
          <p className="mt-2 text-sm text-slate-300">이전에 생성한 PDF 결과를 불러왔습니다.</p>
          <p className="mt-1 text-xs text-slate-400">생성 완료일: {formatDate(report.completedAt)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/me" className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200">
              내 PDF 보관함으로 이동
            </Link>
            {report.pdfUrl ? (
              <a href={report.pdfUrl} target="_blank" rel="noreferrer" className="rounded-md bg-amber-300 px-3 py-1.5 text-xs font-bold text-slate-900">
                PDF 다운로드
              </a>
            ) : null}
          </div>
        </header>

        {report.summary ? (
          <section className="rounded-lg border border-white/10 bg-black/20 p-5">
            <h2 className="text-lg font-bold text-white">요약</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-200">{report.summary}</p>
          </section>
        ) : null}

        {chapters.length > 0 ? (
          <section className="space-y-3">
            {chapters.map((chapter, index) => (
              <article key={`${report.reportId}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
                <h2 className="text-lg font-bold text-white">{chapter.title || `챕터 ${chapter.chapterNo || index + 1}`}</h2>
                {chapter.subtitle ? <p className="mt-2 text-sm text-slate-300">{chapter.subtitle}</p> : null}
                <div className="mt-4 space-y-4">
                  {(Array.isArray(chapter.sections) ? chapter.sections : []).map((section, sectionIndex) => (
                    <section key={`${report.reportId}-${index}-${sectionIndex}`} className="rounded-md border border-white/10 bg-black/15 p-4">
                      <h3 className="text-sm font-semibold text-amber-100">{section.title || "핵심 해석"}</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-200">{section.body || ""}</p>
                    </section>
                  ))}
                </div>
              </article>
            ))}
          </section>
        ) : report.pdfUrl ? (
          <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-bold text-white">PDF 보기</h2>
            <p className="mt-2 text-sm text-slate-300">아래 버튼을 눌러 PDF를 열람할 수 있습니다.</p>
            <a href={report.pdfUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-md bg-amber-300 px-4 py-2 text-sm font-bold text-slate-900">
              PDF 다시 보기
            </a>
          </section>
        ) : (
          <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-300">
            저장된 본문 데이터를 찾지 못했습니다.
          </section>
        )}
      </div>
    </main>
  );
}
