"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, Download, Heart, Loader2, Moon, RefreshCw } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { extractReadableTextFromJsonLike, looksLikeRawJson, toDisplayText } from "@/lib/llm-text";
import PagedResultViewer, { usePagedViewerMode } from "@/components/fortune/PagedResultViewer";
import { withCharacterBreaks, yeoniBreaks } from "@/components/fortune/result-character-breaks";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";

type PersonInfo = {
  name?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  calendarType?: string;
};

type ResultSection = { title: string; body: string };
type Distribution = Record<string, number>;
type SajuChartSummary = {
  yearPillar?: string;
  monthPillar?: string;
  dayPillar?: string;
  hourPillar?: string;
  dayMaster?: string;
  fiveElements?: Distribution;
  tenGods?: Distribution;
  lovePattern?: string;
  reference?: {
    dayElement?: string;
    dominantElement?: string;
    deficientElement?: string;
    dominantTenGod?: string;
    yongshinElement?: string;
  };
};
type SajuSummary = {
  myChart?: SajuChartSummary | null;
  partnerChart?: SajuChartSummary | null;
  compatibility?: {
    summary?: string;
    attractionPattern?: string;
    conflictPattern?: string;
    stability?: string;
  } | null;
  uncertainty?: string[];
  consultationMode?: string;
};
type Consultation = {
  ok?: boolean;
  id?: string;
  sessionId?: string;
  attemptId?: string;
  requestId?: string;
  status?: string;
  accessType?: string;
  myInfo?: PersonInfo | null;
  partnerInfo?: PersonInfo | null;
  relationshipStatus?: string;
  topic?: string;
  userQuestion?: string;
  createdAt?: string;
  updatedAt?: string;
  keywords?: string[];
  strategy?: string;
  sections?: ResultSection[];
  finalLine?: string;
  reading?: {
    summaryTitle?: string;
    oneLineDiagnosis?: string;
    relationshipTemperature?: string;
    finalMessage?: string;
    actionSecrets?: string[];
    sevenDayGuide?: string[];
    thirtyDayFlow?: string;
  } | null;
  pdfSections?: ResultSection[];
  sajuSummary?: SajuSummary | null;
  messages?: Array<{ role: "user" | "assistant"; content: string; createdAt?: string }>;
  message?: string;
  reason?: string;
};

const FALLBACK_SECTIONS = [
  "현재 관계의 자리와 질문의 핵심",
  "나의 명식이 사랑에서 반복하는 방식",
  "상대의 기운과 감정 거리감",
  "두 사람 사이 끌림이 살아나는 조건",
  "오행과 조후로 보는 감정의 온도",
  "십성으로 보는 애착과 표현 방식",
  "속궁합과 친밀감 리듬",
  "갈등의 뿌리와 회복 방식",
  "연락/고백/재회/관계 진전 타이밍",
  "관계 단계별 실행 비책",
  "상대에게 다가가는 대화 문장",
  "피해야 할 선택과 자기 보호",
  "7일 실천 가이드",
  "30일 관계 흐름 처방",
  "마지막 상담사의 한마디",
];

function toText(value: unknown) {
  return toDisplayText(value);
}

// "[쉬움·오늘] 행동 (근거: …)" 형식의 전략 문자열을 배지·행동·근거로 분해
function parseActionSecret(raw: string) {
  const text = toText(raw);
  const badgeMatch = text.match(/^\[\s*(쉬움|보통|도전)\s*[·,\s]\s*(오늘|이번\s*주|이번\s*달)\s*\]\s*/);
  const rest = badgeMatch ? text.slice(badgeMatch[0].length) : text;
  const evidenceMatch = rest.match(/\(근거\s*[:：]\s*([^)]+)\)\s*$/);
  return {
    difficulty: badgeMatch?.[1] || "",
    timing: badgeMatch?.[2]?.replace(/\s+/g, " ") || "",
    action: evidenceMatch ? rest.slice(0, evidenceMatch.index).trim() : rest,
    evidence: evidenceMatch?.[1]?.trim() || "",
  };
}

const DIFFICULTY_STYLES: Record<string, string> = {
  쉬움: "border-emerald-200/40 bg-emerald-400/15 text-emerald-100",
  보통: "border-amber-200/40 bg-amber-400/15 text-amber-100",
  도전: "border-rose-200/40 bg-rose-400/15 text-rose-100",
};

function LoveSecretActionCards({ reading }: { reading: NonNullable<Consultation["reading"]> }) {
  const secrets = (reading.actionSecrets || []).map(parseActionSecret).filter((item) => item.action);
  if (!secrets.length) return null;
  return (
    <section className="mt-6" aria-label="지금 실행할 전략 카드">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-100">Action Secrets · 전략 카드</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {secrets.map((item, index) => (
          <article key={`${item.action}-${index}`} className="rounded-2xl border border-amber-100/20 bg-white/5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber-100/30 bg-amber-100/10 px-2.5 py-0.5 text-[11px] font-black text-amber-50">비책 {index + 1}</span>
              {item.difficulty && (
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${DIFFICULTY_STYLES[item.difficulty] || DIFFICULTY_STYLES.보통}`}>
                  {item.difficulty}
                </span>
              )}
              {item.timing && (
                <span className="rounded-full border border-sky-200/40 bg-sky-400/15 px-2.5 py-0.5 text-[11px] font-black text-sky-100">{item.timing}</span>
              )}
            </div>
            <p className="mt-2 text-sm font-bold leading-7 text-white">{item.action}</p>
            {item.evidence && (
              <p className="mt-1.5 text-xs leading-6 text-amber-100/75">근거 · {item.evidence}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function safeFilePart(value: string) {
  return (value || "love-secret-reading").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "-").slice(0, 80);
}

function formatDate(value?: string) {
  if (!value) return new Date().toLocaleDateString("ko-KR");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString("ko-KR");
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function formatDistribution(value?: Distribution) {
  const entries = Object.entries(value || {}).filter(([, score]) => Number(score) > 0);
  if (!entries.length) return "확인된 균형 없음";
  return entries.map(([key, score]) => `${key} ${toText(score)}`).join(" · ");
}

function splitAssistantSections(content: string) {
  let normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  // 구조화 파싱에 실패한 원시(잘린) JSON은 중괄호째 노출하지 않고 읽을 수 있는 문장만 복원한다.
  if (looksLikeRawJson(normalized)) {
    normalized = extractReadableTextFromJsonLike(normalized);
    if (!normalized) return [];
  }
  const headingMatches: RegExpExecArray[] = [];
  const headingPattern = /^(?:#{1,3}\s*)?(\d{1,2}[.)]\s*)?([^\n]{2,46})\n+/gm;
  let match = headingPattern.exec(normalized);
  while (match) {
    if (/관계|연애|궁합|오행|조후|십성|끌림|감정|친밀감|갈등|회복|대화|타이밍|비책|보호|가이드|처방|한마디|진단/.test(match[2] || "")) headingMatches.push(match);
    match = headingPattern.exec(normalized);
  }

  if (headingMatches.length >= 3) {
    return headingMatches.map((item, index) => {
      const start = item.index + item[0].length;
      const end = headingMatches[index + 1]?.index ?? normalized.length;
      return {
        title: item[2].replace(/\*\*/g, "").trim(),
        body: normalized.slice(start, end).trim(),
      };
    }).filter((section) => section.body);
  }

  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunkSize = Math.max(1, Math.ceil(paragraphs.length / FALLBACK_SECTIONS.length));
  return FALLBACK_SECTIONS.map((title, index) => ({
    title,
    body: paragraphs.slice(index * chunkSize, (index + 1) * chunkSize).join("\n\n"),
  })).filter((section) => section.body);
}

function buildResultEndpoint() {
  const params = new URL(window.location.href).searchParams;
  const sessionId = toText(params.get("sessionId") || params.get("id"));
  if (sessionId) return `/api/love-secret-ai/result/${encodeURIComponent(sessionId)}`;
  const query = new URLSearchParams();
  ["requestId", "idempotencyKey", "attemptId"].forEach((key) => {
    const value = toText(params.get(key));
    if (value) query.set(key, value);
  });
  return `/api/love-secret-ai/result${query.toString() ? `?${query.toString()}` : ""}`;
}

export default function LoveSecretAiResultClient() {
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [viewAll, setViewAll] = usePagedViewerMode("loveSecretViewerModeV1");
  const [exportExpand, setExportExpand] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer = 0;
    let attempts = 0;
    const maxAttempts = 45; // 2.2s * 45 ≈ 1.6분 상한 — 무한 폴링(Cloudflare 1015) 방지
    async function loadResult() {
      setLoading(true);
      setError("");
      try {
        const endpoint = buildResultEndpoint();
        const response = await authFetch(endpoint);
        const payload = await response.json().catch(() => ({})) as Consultation;
        if (response.status === 202) {
          if (!alive) return;
          attempts += 1;
          if (attempts >= maxAttempts) {
            setPending(false);
            setError("상담 결과 생성이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.");
            return;
          }
          setPending(true);
          setLoading(true);
          timer = window.setTimeout(loadResult, 2200);
          return;
        }
        if (!response.ok || payload?.ok === false) throw new Error(toText(payload?.message) || "저장된 상담 결과를 불러오지 못했습니다.");
        if (alive) {
          setConsultation(payload);
          setPending(false);
        }
      } catch (caught) {
        if (alive) setError(friendlyErrorMessage(caught, "저장된 상담 결과를 불러오지 못했습니다."));
      } finally {
        if (alive) setLoading(false);
      }
    }
    void loadResult();
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const assistantContent = consultation?.messages?.find((message) => message.role === "assistant")?.content?.trim() || "";
  const sections = useMemo(() => {
    const direct = consultation?.pdfSections?.length ? consultation.pdfSections : consultation?.sections;
    return direct?.length ? direct : splitAssistantSections(assistantContent);
  }, [assistantContent, consultation?.pdfSections, consultation?.sections]);
  const myName = toText(consultation?.myInfo?.name) || "나";
  const partnerName = toText(consultation?.partnerInfo?.name) || "상대방";
  const generatedAt = formatDate(consultation?.createdAt || consultation?.updatedAt);
  const summaryTitle = consultation?.reading?.summaryTitle || "연애 비책 AI 상담 리포트";
  const oneLine = consultation?.reading?.oneLineDiagnosis || consultation?.strategy || sections[0]?.body || "지금의 관계 온도를 차분히 읽었습니다.";

  async function handlePdfDownload() {
    const element = document.getElementById("love-secret-result-document");
    if (!element || pdfLoading || !consultation) return;
    setPdfLoading(true);
    setPdfError("");
    // 페이지 뷰어가 숨긴 장(display:none)은 html2canvas에서 빈 캔버스가 되므로 전부 펼친 뒤 캡처한다.
    setExportExpand(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await new Promise((resolve) => setTimeout(resolve, 120));
    try {
      const [{ default: html2canvas }, jsPdfModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const JsPDF = jsPdfModule.default || jsPdfModule.jsPDF;
      const canvas = await html2canvas(element, {
        backgroundColor: "#160014",
        scale: Math.min(2, window.devicePixelRatio || 2),
        useCORS: true,
      });
      const pdf = new JsPDF("p", "mm", "a4");
      const imageData = canvas.toDataURL("image/png");
      const pageWidth = 210;
      const pageHeight = 297;
      const imageHeight = (canvas.height * pageWidth) / canvas.width;
      let remainingHeight = imageHeight;
      let position = 0;
      pdf.addImage(imageData, "PNG", 0, position, pageWidth, imageHeight);
      remainingHeight -= pageHeight;
      while (remainingHeight > 0) {
        position = remainingHeight - imageHeight;
        pdf.addPage();
        pdf.addImage(imageData, "PNG", 0, position, pageWidth, imageHeight);
        remainingHeight -= pageHeight;
      }
      pdf.save(`love-secret-reading-${safeFilePart(consultation.sessionId || consultation.attemptId || "result")}.pdf`);
    } catch (_) {
      setPdfError("상담 리포트를 PDF로 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setExportExpand(false);
      setPdfLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#140014] text-[#fff8ef] [font-family:var(--font-body)]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_6%,rgba(251,207,232,0.25),transparent_30%),radial-gradient(circle_at_82%_14%,rgba(250,204,21,0.16),transparent_28%),linear-gradient(135deg,#140014_0%,#4a0b25_46%,#120f2d_100%)]" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 opacity-60 [background-image:radial-gradient(#fff8ef_1px,transparent_1px),radial-gradient(#f9a8d4_1px,transparent_1px)] [background-position:0_0,42px_58px] [background-size:96px_96px,132px_132px]" aria-hidden="true" />

      <section className="relative mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <a href="/love-secret-ai" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur-xl transition hover:border-rose-200/40 hover:bg-white/15">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            다시 상담하기
          </a>
          {consultation && (
            <LoveSecretPdfButton loading={pdfLoading} onClick={() => void handlePdfDownload()} />
          )}
        </div>

        {loading && (
          <div className="grid min-h-[62vh] place-items-center rounded-3xl border border-white/10 bg-white/10 p-8 text-center shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div>
              <Loader2 className="mx-auto h-9 w-9 animate-spin text-amber-100 motion-reduce:animate-none" aria-hidden="true" />
              <h1 className="mt-5 text-2xl font-black text-white">
                {pending ? "상담 리포트를 여는 중입니다" : "저장된 상담 결과를 불러오고 있습니다"}
              </h1>
              <p className="mt-3 text-sm leading-7 text-rose-50/80">
                두 사람의 마음의 온도를 정리하는 동안 이 창을 열어 두세요.
              </p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="grid min-h-[62vh] place-items-center rounded-3xl border border-rose-200/25 bg-rose-500/15 p-8 text-center shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="max-w-md">
              <AlertCircle className="mx-auto h-10 w-10 text-rose-100" aria-hidden="true" />
              <h1 className="mt-5 text-2xl font-black text-white">결과를 열 수 없습니다</h1>
              <p className="mt-3 text-sm leading-7 text-rose-50">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-amber-200 px-4 text-sm font-black text-[#35101e] transition hover:bg-amber-100"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                다시 확인하기
              </button>
            </div>
          </div>
        )}

        {!loading && consultation && (
          <LoveSecretResultPageContent
            consultation={consultation}
            sections={sections}
            myName={myName}
            partnerName={partnerName}
            generatedAt={generatedAt}
            summaryTitle={summaryTitle}
            oneLine={oneLine}
            pdfError={pdfError}
            viewAll={viewAll}
            onViewAllChange={setViewAll}
            expandForExport={exportExpand}
          />
        )}
      </section>
    </main>
  );
}

function LoveSecretResultPageContent({
  consultation,
  sections,
  myName,
  partnerName,
  generatedAt,
  summaryTitle,
  oneLine,
  pdfError,
  viewAll,
  onViewAllChange,
  expandForExport,
}: {
  consultation: Consultation;
  sections: ResultSection[];
  myName: string;
  partnerName: string;
  generatedAt: string;
  summaryTitle: string;
  oneLine: string;
  pdfError: string;
  viewAll: boolean;
  onViewAllChange: (viewAll: boolean) => void;
  expandForExport: boolean;
}) {
  return (
    <div id="love-secret-result-document" className="relative rounded-3xl border border-white/10 bg-[#160014] p-4 shadow-2xl shadow-black/40 sm:p-6">
      <header className="overflow-hidden rounded-3xl border border-amber-100/20 bg-white/10 p-6 backdrop-blur-xl sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-100/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-amber-100">
              <Moon className="h-4 w-4" aria-hidden="true" />
              Love Secret Reading
            </p>
            <h1 className="mt-4 text-3xl font-black leading-tight text-white [font-family:var(--font-display)] sm:text-5xl">
              {summaryTitle}
            </h1>
            <p className="mt-4 max-w-3xl whitespace-pre-wrap text-base leading-8 text-rose-50/85">{oneLine}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-rose-50">
            <p className="font-black text-amber-100">연애 비책 AI 상담 리포트</p>
            <p className="mt-2">{myName} × {partnerName}</p>
            <p>{toText(consultation.topic) || "전체 연애 흐름"}</p>
            <p>{generatedAt}</p>
          </div>
        </div>
      </header>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard title="내 이름" value={myName} />
        <InfoCard title="상대 이름" value={partnerName} />
        <InfoCard title="상담 주제" value={toText(consultation.topic) || "전체 연애 흐름"} />
        <InfoCard title="생성일" value={generatedAt} />
      </section>

      {consultation.sajuSummary?.myChart && (
        <LoveSecretSajuSummary summary={consultation.sajuSummary} myName={myName} partnerName={partnerName} />
      )}

      {consultation.userQuestion && (
        <section className="mt-5 rounded-3xl border border-white/10 bg-white/10 p-5">
          <div className="mb-3 flex items-center gap-2 text-amber-100">
            <Heart className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-lg font-black text-white">상담 질문</h2>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-7 text-rose-50/85">{consultation.userQuestion}</p>
        </section>
      )}

      {consultation.keywords?.length ? (
        <section className="mt-5 flex flex-wrap gap-2">
          {consultation.keywords.map((keyword, index) => (
            <span key={`${index}-${toText(keyword).slice(0, 16)}`} className="rounded-full border border-amber-100/20 bg-amber-100/10 px-4 py-2 text-sm font-black text-amber-50">
              {toText(keyword)}
            </span>
          ))}
        </section>
      ) : null}

      {consultation.reading ? <LoveSecretActionCards reading={consultation.reading} /> : null}

      <section className="mt-6 text-amber-100">
        <PagedResultViewer
          pages={withCharacterBreaks(
            sections.map((section, index) => ({
              id: `love-secret-section-${index}`,
              label: toDisplayText(section.title).slice(0, 12) || `${index + 1}장`,
              content: <LoveSecretResultSection index={index} section={section} />,
            })),
            yeoniBreaks,
          )}
          deckLabel="연애 비책 상담 결과"
          viewAll={viewAll}
          onViewAllChange={onViewAllChange}
          expandForExport={expandForExport}
        />
      </section>

      {consultation.finalLine && (
        <footer className="mt-6 rounded-3xl border border-amber-100/25 bg-gradient-to-br from-amber-100/15 to-rose-200/10 p-6">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-100">Final Message</p>
          <p className="mt-3 whitespace-pre-wrap text-lg font-bold leading-9 text-white">{consultation.finalLine}</p>
        </footer>
      )}

      {pdfError && (
        <div className="mt-5 rounded-2xl border border-rose-200/30 bg-rose-500/15 p-4 text-sm leading-7 text-rose-50">
          {pdfError}
        </div>
      )}
    </div>
  );
}

function LoveSecretSajuSummary({ summary, myName, partnerName }: { summary: SajuSummary; myName: string; partnerName: string }) {
  return (
    <section className="mt-5 rounded-3xl border border-amber-100/20 bg-white/10 p-5">
      <div className="mb-4 flex items-center gap-2 text-amber-100">
        <Moon className="h-5 w-5" aria-hidden="true" />
        <h2 className="text-lg font-black text-white">연애 명식 기초</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SajuChartCard label={myName} chart={summary.myChart} />
        {summary.partnerChart ? <SajuChartCard label={partnerName} chart={summary.partnerChart} /> : null}
      </div>
      {summary.compatibility && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-rose-50/90">
          <p className="font-black text-amber-100">궁합 흐름</p>
          <p className="mt-2 whitespace-pre-wrap">{summary.compatibility.summary}</p>
          <p className="mt-2 whitespace-pre-wrap">{summary.compatibility.attractionPattern}</p>
          <p className="mt-2 whitespace-pre-wrap">{summary.compatibility.conflictPattern}</p>
          <p className="mt-2 whitespace-pre-wrap">{summary.compatibility.stability}</p>
        </div>
      )}
      {summary.uncertainty?.length ? (
        <p className="mt-3 text-xs font-bold leading-6 text-amber-50/75">
          출생 시간이 비어 있는 명식은 정오 기준의 흐름으로 조심스럽게 읽었습니다.
        </p>
      ) : null}
    </section>
  );
}

function SajuChartCard({ label, chart }: { label: string; chart?: SajuChartSummary | null }) {
  if (!chart) return null;
  const pillars: Array<[string, string | undefined]> = [
    ["년주", chart.yearPillar],
    ["월주", chart.monthPillar],
    ["일주", chart.dayPillar],
    ["시주", chart.hourPillar || "시 미상"],
  ];
  return (
    <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm font-black text-amber-100">{label}</p>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
        {pillars.map(([title, value]) => (
          <div key={title} className="rounded-xl border border-white/10 bg-white/10 px-2 py-3">
            <p className="text-xs font-black text-rose-50/70">{title}</p>
            <p className="mt-1 font-black text-white">{value || "-"}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2 text-sm leading-7 text-rose-50/90">
        <p><span className="font-black text-amber-100">일간</span> {chart.dayMaster || "-"}</p>
        <p><span className="font-black text-amber-100">오행</span> {formatDistribution(chart.fiveElements)}</p>
        <p><span className="font-black text-amber-100">십성</span> {formatDistribution(chart.tenGods)}</p>
        <p><span className="font-black text-amber-100">강한 기운</span> {chart.reference?.dominantElement || "-"} · <span className="font-black text-amber-100">보완 기운</span> {chart.reference?.deficientElement || "-"}</p>
        {chart.reference?.dominantTenGod && <p><span className="font-black text-amber-100">두드러진 십성</span> {chart.reference.dominantTenGod}</p>}
        {chart.lovePattern && <p className="whitespace-pre-wrap">{chart.lovePattern}</p>}
      </div>
    </article>
  );
}

function LoveSecretResultSection({ index, section }: { index: number; section: ResultSection }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-rose-200/15 text-sm font-black text-amber-100 ring-1 ring-amber-100/20">
          {String(index + 1).padStart(2, "0")}
        </span>
        <h2 className="text-xl font-black text-white">{section.title}</h2>
      </div>
      <p className="whitespace-pre-wrap text-[15px] leading-8 text-rose-50/90">{section.body}</p>
    </article>
  );
}

function LoveSecretPdfButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-amber-200 px-4 text-sm font-black text-[#35101e] transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
      {loading ? "PDF를 정리하고 있습니다" : "PDF로 저장하기"}
    </button>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-100">{title}</p>
      <p className="mt-2 break-words text-sm font-bold leading-6 text-white">{value}</p>
    </div>
  );
}
