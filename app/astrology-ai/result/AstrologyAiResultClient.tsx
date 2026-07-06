"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, Download, Loader2, Moon, Sparkles, Stars } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";

type ChartPoint = { sign?: string; signKo?: string; degree?: number; house?: number | null };
type AstrologyChart = {
  zodiacType?: string;
  houseSystem?: string;
  sun?: ChartPoint | null;
  moon?: ChartPoint | null;
  ascendant?: ChartPoint | null;
  mc?: ChartPoint | null;
  chartRuler?: string;
  consultationKeywords?: string[];
  planets?: Array<ChartPoint & { name: string; label?: string; retrograde?: boolean | null }>;
  houses?: Array<{ house: number; sign?: string; signKo?: string; cuspDegree?: number | null; planets?: string[] }>;
  elementBalance?: Record<string, number>;
  modalityBalance?: Record<string, number>;
  majorAspects?: Array<{ planetA: string; aspect: string; planetB: string; orb?: number | null }>;
  transits?: {
    planets?: Array<ChartPoint & { name: string; label?: string; retrograde?: boolean | null }>;
    majorAspectsToNatal?: Array<{ transitPlanet: string; aspect: string; natalPlanet: string; orb?: number | null }>;
  };
  birthTimeUnknown?: boolean;
};
type BirthInfo = {
  name?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  birthPlace?: {
    city?: string;
    country?: string;
    latitude?: number | null;
    longitude?: number | null;
    timezone?: string;
  };
};
type Consultation = {
  ok?: boolean;
  id?: string;
  sessionId?: string;
  status?: string;
  accessType?: string;
  birthInfo?: BirthInfo | null;
  topic?: string;
  userQuestion?: string;
  astrologyChart?: AstrologyChart | null;
  chartHighlights?: {
    sun?: ChartPoint | null;
    moon?: ChartPoint | null;
    ascendant?: ChartPoint | null;
    chartRuler?: string;
    keywords?: string[];
  };
  messages?: Array<{ role: "user" | "assistant"; content: string; createdAt?: string }>;
  message?: string;
  reason?: string;
};

const FALLBACK_SECTIONS = [
  "별자리 상담 요약",
  "태양·달·상승궁 해석",
  "개인 행성 해석",
  "사회 행성 해석",
  "세대 행성 해석",
  "원소와 모드 분석",
  "주요 각도 해석",
  "하우스 해석",
  "현재 트랜짓 흐름",
  "상담 주제별 맞춤 해석",
  "실천 조언",
  "마무리 메시지",
];

const RESULT_PANEL_CLASS = "rounded-lg border border-white/10 bg-white/[0.045] shadow-xl shadow-black/20 ring-1 ring-white/[0.03] backdrop-blur";
const RESULT_INFO_CLASS = "rounded-lg border border-white/10 bg-[#0d132c]/75 p-4";

function toText(value: unknown) {
  return String(value || "").trim();
}

function pointLabel(point?: ChartPoint | null) {
  if (!point?.sign) return "제한적 해석";
  const degree = Number.isFinite(Number(point.degree)) ? `${Number(point.degree).toFixed(1)}°` : "";
  return `${point.signKo || point.sign} ${degree}`.trim();
}

function aspectLabel(type: string) {
  if (type === "conjunction") return "합";
  if (type === "opposition") return "충";
  if (type === "square") return "스퀘어";
  if (type === "trine") return "트라인";
  if (type === "sextile") return "섹스타일";
  return type;
}

function degreeText(value: unknown) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}°` : "";
}

function planetDataLabel(planet: ChartPoint & { name: string; label?: string; retrograde?: boolean | null }) {
  return [
    planet.label || planet.name,
    pointLabel(planet),
    Number.isFinite(Number(planet.house)) ? `${planet.house}하우스` : "",
    planet.retrograde ? "역행" : "",
  ].filter(Boolean).join(" · ");
}

function houseDataLabel(house: { house: number; sign?: string; signKo?: string; cuspDegree?: number | null; planets?: string[] }) {
  const planets = Array.isArray(house.planets) && house.planets.length ? `입궁 ${house.planets.join(", ")}` : "입궁 행성 없음";
  return `${house.house}하우스 · ${house.signKo || house.sign || "미확인"} ${degreeText(house.cuspDegree)} · ${planets}`.trim();
}

function aspectDataLabel(aspect: { planetA: string; aspect: string; planetB: string; orb?: number | null }) {
  const orb = Number.isFinite(Number(aspect.orb)) ? `오브 ${Number(aspect.orb).toFixed(2)}°` : "";
  return `${aspect.planetA} ${aspectLabel(aspect.aspect)} ${aspect.planetB}${orb ? ` · ${orb}` : ""}`;
}

function transitDataLabel(aspect: { transitPlanet: string; aspect: string; natalPlanet: string; orb?: number | null }) {
  const orb = Number.isFinite(Number(aspect.orb)) ? `오브 ${Number(aspect.orb).toFixed(2)}°` : "";
  return `Transit ${aspect.transitPlanet} ${aspectLabel(aspect.aspect)} Natal ${aspect.natalPlanet}${orb ? ` · ${orb}` : ""}`;
}

function balanceDataLabel(balance: Record<string, number> | undefined, labels: Record<string, string>) {
  return Object.entries(labels)
    .map(([key, label]) => `${label} ${Number(balance?.[key] || 0)}`)
    .join(" · ");
}

function splitSections(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const headingMatches: RegExpExecArray[] = [];
  const headingPattern = /^(?:#{1,3}\s*)?(\d{1,2}[.)]\s*)?([^\n]{2,44})\n+/gm;
  let match = headingPattern.exec(normalized);
  while (match) {
    if (/상담|태양|달|상승궁|행성|원소|모드|각도|하우스|트랜짓|조언|마무리|요약/.test(match[2] || "")) {
      headingMatches.push(match);
    }
    match = headingPattern.exec(normalized);
  }

  if (headingMatches.length >= 3) {
    return headingMatches.map((match, index) => {
      const start = (match.index || 0) + match[0].length;
      const end = headingMatches[index + 1]?.index ?? normalized.length;
      return {
        title: match[2].replace(/\*\*/g, "").trim(),
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

function safeFilePart(value: string) {
  return (value || "guest").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "-").slice(0, 48);
}

export default function AstrologyAiResultClient() {
  const [resultId, setResultId] = useState("");
  const [queryReady, setQueryReady] = useState(false);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    setResultId(toText(new URLSearchParams(window.location.search).get("id")));
    setQueryReady(true);
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadResult() {
      if (!queryReady) return;
      if (!resultId) {
        setError("결과 링크를 확인하지 못했습니다.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const response = await authFetch(`/api/astrology-ai/result/${encodeURIComponent(resultId)}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) {
          throw new Error(toText(payload?.message) || "저장된 상담 결과를 불러오지 못했습니다.");
        }
        if (alive) setConsultation(payload as Consultation);
      } catch (caught) {
        if (alive) setError(friendlyErrorMessage(caught, "저장된 상담 결과를 불러오지 못했습니다."));
      } finally {
        if (alive) setLoading(false);
      }
    }
    void loadResult();
    return () => {
      alive = false;
    };
  }, [queryReady, resultId]);

  const birth = consultation?.birthInfo || {};
  const place = birth.birthPlace || {};
  const chart = consultation?.astrologyChart || null;
  const highlights = consultation?.chartHighlights || {};
  const assistantContent = consultation?.messages?.find((message) => message.role === "assistant")?.content?.trim() || "";
  const sections = useMemo(() => splitSections(assistantContent), [assistantContent]);
  const userName = toText(birth.name) || "당신";
  const birthTime = birth.birthTimeUnknown ? "출생시간 미상" : toText(birth.birthTime) || "출생시간 미입력";
  const coreCards = [
    { title: "태양", value: pointLabel(highlights.sun || chart?.sun) },
    { title: "달", value: pointLabel(highlights.moon || chart?.moon) },
    { title: "상승궁", value: highlights.ascendant || chart?.ascendant ? pointLabel(highlights.ascendant || chart?.ascendant) : "출생시간 미상으로 제한" },
    { title: "차트 룰러", value: toText(highlights.chartRuler || chart?.chartRuler) || "제한적 해석" },
  ];
  const keywords = (highlights.keywords || chart?.consultationKeywords || []).filter(Boolean).slice(0, 6);
  const evidencePlanets = (chart?.planets || []).slice(0, 7);
  const evidenceAspects = (chart?.majorAspects || []).slice(0, 5);
  const chartPlanets = chart?.planets || [];
  const chartHouses = chart?.houses || [];
  const chartAspects = chart?.majorAspects || [];
  const chartTransitAspects = chart?.transits?.majorAspectsToNatal || [];
  const chartBasics = [
    `조디악: ${chart?.zodiacType === "tropical" ? "Tropical" : toText(chart?.zodiacType) || "미확인"}`,
    `하우스 시스템: ${toText(chart?.houseSystem) || (chart?.birthTimeUnknown ? "출생시간 미상 제한" : "미확인")}`,
    `MC: ${pointLabel(chart?.mc)}`,
    `원소 균형: ${balanceDataLabel(chart?.elementBalance, { fire: "불", earth: "흙", air: "공기", water: "물" })}`,
    `모드 균형: ${balanceDataLabel(chart?.modalityBalance, { cardinal: "활동", fixed: "고정", mutable: "변통" })}`,
  ];

  async function handlePdfDownload() {
    const element = document.getElementById("astrology-ai-result-document");
    if (!element || pdfLoading) return;
    const detailsElements = Array.from(element.querySelectorAll("details"));
    const previousDetailOpenStates = detailsElements.map((details) => details.open);
    console.info("[AstrologyAI] pdf download started", { resultId });
    setPdfLoading(true);
    setPdfError("");
    try {
      detailsElements.forEach((details) => {
        details.open = true;
      });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const [{ default: html2canvas }, jsPdfModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const JsPDF = jsPdfModule.default || jsPdfModule.jsPDF;
      const canvas = await html2canvas(element, {
        backgroundColor: "#060817",
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
      const date = new Date().toISOString().slice(0, 10);
      pdf.save(`code-destiny-astrology-ai-${safeFilePart(userName)}-${date}.pdf`);
      console.info("[AstrologyAI] pdf download success", { resultId });
    } catch (caught) {
      console.error("[AstrologyAI] pdf download failed", { resultId, message: caught instanceof Error ? caught.message : String(caught) });
      setPdfError("별자리 리포트를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      detailsElements.forEach((details, index) => {
        details.open = previousDetailOpenStates[index] ?? details.open;
      });
      setPdfLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-slate-100 [font-family:var(--font-body)]">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,#050816_0%,#0b1028_46%,#050816_100%)]" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:radial-gradient(#f8e7b0_1px,transparent_1px),radial-gradient(#c4b5fd_1px,transparent_1px)] [background-position:0_0,34px_42px] [background-size:88px_88px,128px_128px]" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f5d487]/60 to-transparent" aria-hidden="true" />

      <section className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/astrology-ai" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.035] px-4 text-sm font-bold text-slate-100 transition hover:border-[#f5d487]/40 hover:bg-white/[0.065]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            상담 입력으로 돌아가기
          </Link>
          {consultation && (
            <button type="button" onClick={() => void handlePdfDownload()} disabled={pdfLoading} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#f5d487] px-4 text-sm font-black text-[#161019] shadow-lg shadow-[#f5d487]/15 transition hover:bg-[#ffe6a8] disabled:cursor-not-allowed disabled:opacity-60">
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
              {pdfLoading ? "별자리 리포트를 정리하는 중입니다" : "PDF 다운로드"}
            </button>
          )}
        </div>

        {loading && (
          <div className="grid min-h-[60vh] place-items-center rounded-lg border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl shadow-black/25">
            <div>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#f5d487] motion-reduce:animate-none" aria-hidden="true" />
              <p className="mt-4 text-lg font-black text-white">저장된 별자리 상담을 불러오고 있습니다.</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="grid min-h-[60vh] place-items-center rounded-lg border border-rose-300/25 bg-rose-400/10 p-8 text-center shadow-2xl shadow-black/25">
            <div className="max-w-md">
              <AlertCircle className="mx-auto h-9 w-9 text-rose-200" aria-hidden="true" />
              <h1 className="mt-4 text-2xl font-black text-white">결과를 열 수 없습니다</h1>
              <p className="mt-3 text-sm leading-7 text-rose-50">{error}</p>
            </div>
          </div>
        )}

        {!loading && consultation && (
          <div id="astrology-ai-result-document" className="relative grid gap-6 rounded-lg border border-white/10 bg-[#060817] p-4 shadow-2xl shadow-black/40 ring-1 ring-white/[0.03] sm:p-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <article className="space-y-6">
              <header className={`${RESULT_PANEL_CLASS} overflow-hidden p-6 sm:p-8`}>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#f5d487]">Code Destiny Astrology</p>
                <h1 className="mt-3 text-3xl font-black leading-tight text-white [font-family:var(--font-premium)] sm:text-5xl">
                  {userName}님의 별자리 상담
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-slate-200">
                  태어난 하늘과 지금의 하늘이 만나는 자리에서, {toText(consultation.topic) || "현재 질문"}의 흐름을 차분히 비춥니다.
                </p>
                {keywords.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <span key={keyword} className="rounded-full border border-[#f5d487]/25 bg-[#f5d487]/10 px-3 py-1 text-xs font-bold text-amber-50">
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </header>

              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoCard title="생년월일" value={toText(birth.birthDate) || "미입력"} />
                <InfoCard title="출생시간" value={birthTime} />
                <InfoCard title="출생지" value={[place.city, place.country].filter(Boolean).join(", ") || "미입력"} />
                <InfoCard title="상담 주제" value={toText(consultation.topic) || "전체 차트 해석"} />
              </section>

              {birth.birthTimeUnknown && (
                <section className="rounded-lg border border-[#f5d487]/25 bg-[#f5d487]/10 p-4 text-sm leading-7 text-amber-50">
                  출생시간 미상으로 상승궁과 하우스는 확정하지 않고 제한적으로 다룹니다. 태양, 달, 개인 행성, 주요 각도와 현재 흐름을 중심으로 읽어 주세요.
                </section>
              )}

              <section className={`${RESULT_PANEL_CLASS} p-5 sm:p-6`}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                    <Sparkles className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                  </span>
                  <h2 className="text-xl font-black text-white">현재 질문</h2>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{toText(consultation.userQuestion) || "전체 흐름을 중심으로 상담합니다."}</p>
              </section>

              <section className="space-y-3">
                {sections.map((section, index) => (
                  <details key={`${section.title}-${index}`} className={`${RESULT_PANEL_CLASS} group p-5 sm:p-6`} open={index < 2}>
                    <summary className="cursor-pointer list-none text-lg font-black leading-7 text-[#f5d487] focus:outline-none focus:ring-2 focus:ring-[#f5d487]/30">
                      <span className="inline-flex w-full items-center justify-between gap-3">
                        <span>{section.title}</span>
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#f5d487]/25 text-sm text-amber-50 transition group-open:rotate-45">+</span>
                      </span>
                    </summary>
                    <p className="mt-5 whitespace-pre-wrap text-[15px] leading-8 text-slate-100">{section.body}</p>
                  </details>
                ))}
              </section>
            </article>

            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <section className={`${RESULT_PANEL_CLASS} p-5`}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                    <Moon className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                  </span>
                  <h2 className="text-lg font-black text-white">차트 시그니처</h2>
                </div>
                <div className="grid gap-3">
                  {coreCards.map((card) => (
                    <InfoCard key={card.title} title={card.title} value={card.value} />
                  ))}
                </div>
              </section>

              <section className={`${RESULT_PANEL_CLASS} p-5`}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                    <Stars className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                  </span>
                  <h2 className="text-lg font-black text-white">주요 근거</h2>
                </div>
                <div className="grid gap-2 text-sm leading-6 text-slate-200">
                  {evidencePlanets.map((planet) => (
                    <EvidencePill key={planet.name} text={`${planet.label || planet.name} ${planet.signKo || planet.sign || ""}${planet.retrograde ? " R" : ""}`.trim()} />
                  ))}
                  {evidenceAspects.map((aspect) => (
                    <EvidencePill key={`${aspect.planetA}-${aspect.aspect}-${aspect.planetB}`} text={`${aspect.planetA} ${aspectLabel(aspect.aspect)} ${aspect.planetB}`} />
                  ))}
                  {!evidencePlanets.length && !evidenceAspects.length && (
                    <EvidencePill text="저장된 차트 근거가 제한적입니다." />
                  )}
                </div>
              </section>

              <section className={`${RESULT_PANEL_CLASS} p-5`}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                    <Sparkles className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                  </span>
                  <h2 className="text-lg font-black text-white">기본 차트 데이터</h2>
                </div>
                <ChartDataGroup title="차트 기준" items={chartBasics} />
                <ChartDataGroup title="행성 위치" items={chartPlanets.map(planetDataLabel)} />
                <ChartDataGroup title="하우스" items={chartHouses.length ? chartHouses.map(houseDataLabel) : ["출생시간 미상으로 하우스 해석은 제한됩니다."]} />
                <ChartDataGroup title="주요 각도" items={chartAspects.length ? chartAspects.map(aspectDataLabel) : ["저장된 주요 각도 데이터가 제한적입니다."]} />
                <ChartDataGroup title="현재 트랜짓" items={chartTransitAspects.length ? chartTransitAspects.map(transitDataLabel) : ["저장된 트랜짓 각도 데이터가 제한적입니다."]} />
              </section>

              {pdfError && (
                <section className="rounded-lg border border-rose-300/30 bg-rose-400/10 p-4 text-sm leading-7 text-rose-50">
                  {pdfError}
                </section>
              )}
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className={RESULT_INFO_CLASS}>
      <p className="text-xs font-black uppercase text-[#f5d487]">{title}</p>
      <p className="mt-2 break-words text-sm font-bold leading-6 text-white">{value}</p>
    </div>
  );
}

function EvidencePill({ text }: { text: string }) {
  return (
    <span className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-slate-100">
      {text}
    </span>
  );
}

function ChartDataGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="mb-2 text-xs font-black uppercase text-[#f5d487]">{title}</h3>
      <div className="grid gap-1.5 text-xs leading-5 text-slate-200">
        {items.filter(Boolean).map((item, index) => (
          <span key={`${title}-${index}`} className="break-words rounded-md border border-white/10 bg-white/[0.035] px-2.5 py-1.5">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
