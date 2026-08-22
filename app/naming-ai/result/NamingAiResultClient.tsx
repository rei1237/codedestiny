"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Check, Copy, Download, ScrollText } from "lucide-react";
import { getCurrentLoadingLocale, INTL_LOCALE_BY_LOADING_LOCALE } from "@/constants/loadingMessages";
import { authFetch } from "@/app/_lib/auth-client";
import { handleSessionInvalidated } from "@/app/_lib/auth-store";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";
import { readNamingRetryPayload, clearNamingRetryPayload } from "../retryHandoff";
import { parseAssistantSections, toDisplayText } from "@/lib/llm-text";
import PagedResultViewer, { usePagedViewerMode } from "@/components/fortune/PagedResultViewer";
import AiResultProse from "@/components/fortune/AiResultProse";
import { withCharacterBreaks, yeoniBreaks } from "@/components/fortune/result-character-breaks";

type DesiredNameCandidate = { hangul?: string; hanjaCandidates?: string[]; note?: string };

type NamingInputSnapshot = {
  gender?: string;
  birthDate?: string;
  birthTimeUnknown?: boolean;
  calendarType?: string;
  isLeapMonth?: boolean;
  familyName?: string;
  nameLength?: number;
  desiredType?: string;
  desiredSyllables?: string[];
  requiredSyllables?: string[];
  blockedSyllables?: string[];
  preferredStyle?: string;
  preferredImage?: string[];
  desiredNames?: DesiredNameCandidate[];
  memo?: string;
};

type NamingSajuSnapshot = {
  yearPillar?: string;
  monthPillar?: string;
  dayPillar?: string;
  hourPillar?: string;
  dayMaster?: string;
  fiveElementBalance?: string;
  usefulGodCandidates?: string;
  unfavorableGodCandidates?: string;
  recommendedNameElements?: string;
  avoidNameElements?: string;
};

type NamingNameCard = {
  name?: string;
  hanja?: string;
  meaning?: string;
  elements?: string;
  soundFlow?: string;
  suri?: string;
  summary?: string;
};

type NamingFinalPick = { name?: string; reason?: string };

type NamingResult = {
  generatedPrompt?: string;
  generatedResult?: string;
  nameCards?: NamingNameCard[];
  finalPick?: NamingFinalPick | null;
  provider?: string;
  model?: string;
  inputSnapshot?: NamingInputSnapshot | null;
  sajuSnapshot?: NamingSajuSnapshot | null;
  generatedAt?: string | null;
};

type ResultEnvelope = {
  ok?: boolean;
  result?: NamingResult;
  message?: string;
};

// 작명첩 8장 계약(worker/routes/naming-prompt.js buildGeneratedPrompt)과 동일한 제목.
const FALLBACK_SECTION_TITLES = [
  "작명가의 총평",
  "사주 풀이와 용신 검증",
  "이 아이의 작명 원칙",
  "이름 후보 상세",
  "세 이름을 나란히 놓고",
  "최종 추천",
  "피해야 할 이름",
  "이름을 올리기 전에",
];

// 8장 제목에만 맞고 본문 문장에는 잘 걸리지 않도록 제목 문구를 그대로 사용한다.
const SECTION_TITLE_KEYWORDS = /작명가의 총평|사주 풀이|작명 원칙|이름 후보 상세|나란히 놓고|최종 추천|피해야 할 이름|올리기 전에/;

const GENDER_LABELS: Record<string, string> = { M: "남성", F: "여성", OTHER: "기타/미지정" };

// 생성 대기 중 회전 문구 — 작명가의 실제 작업 순서를 그대로 들려준다.
const WAIT_STEPS = [
  "사주 명식을 세우는 중",
  "용신과 희신을 검증하는 중",
  "소리와 한자를 고르는 중",
  "작명첩을 엮는 중",
];

// 네오 정본(달빛 다크) 스코프 — DESIGN.md: bg #0a0818/#13102a, 강조 violet #c4b5fd, 골드 #e8d5a3.
// Glow-Not-Shadow: 회색 드롭섀도 대신 평상시 플랫, 강조 지점만 브랜드 색 글로우.
const PANEL = "rounded-[28px] border border-[#c4b5fd]/20 bg-[#13102a]/70";
const VIOLET_GLOW = "shadow-[0_0_0_1px_rgba(167,139,250,0.14),0_0_28px_-10px_rgba(147,51,234,0.4)]";
const MOON_GLOW = "shadow-[0_0_44px_-8px_rgba(232,213,163,0.34),0_0_90px_-30px_rgba(167,139,250,0.28)]";

function toText(value: unknown) {
  return toDisplayText(value);
}

function genderLabel(value?: string) {
  const key = toText(value).toUpperCase();
  return GENDER_LABELS[key] || toText(value) || "미입력";
}

function calendarLabel(input?: NamingInputSnapshot | null) {
  if (!input) return "";
  const isLunar = toText(input.calendarType).startsWith("lunar");
  return `${isLunar ? "음력" : "양력"}${input.isLeapMonth ? " · 윤달" : ""}`;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 폴백으로 진행
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function buildResultEndpoint(executionId: string) {
  return `/api/naming-prompt/result/${encodeURIComponent(executionId)}`;
}

export default function NamingAiResultClient() {
  const [executionId, setExecutionId] = useState("");
  const [queryReady, setQueryReady] = useState(false);
  const [result, setResult] = useState<NamingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [viewAll, setViewAll] = usePagedViewerMode("namingAiViewerModeV1");
  const [exportExpand, setExportExpand] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [waitStep, setWaitStep] = useState(0);

  useEffect(() => {
    setExecutionId(toText(new URLSearchParams(window.location.search).get("executionId")));
    setQueryReady(true);
  }, []);

  // 생성 대기 중에만 작명 단계 문구를 회전시킨다.
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => setWaitStep((step) => (step + 1) % WAIT_STEPS.length), 2200);
    return () => window.clearInterval(timer);
  }, [pending]);

  useEffect(() => {
    if (!queryReady) return;
    if (!executionId) {
      setError("결과 링크를 확인하지 못했습니다.");
      setLoading(false);
      return;
    }
    let alive = true;
    let timer = 0;
    let attempts = 0;
    const maxAttempts = 100; // 3s * 100 ≈ 5분 상한 — 무한 폴링(Cloudflare 1015) 방지
    async function loadResult() {
      setLoading(true);
      setError("");
      setFailed(false);
      try {
        const response = await authFetch(buildResultEndpoint(executionId));
        const payload = (await response.json().catch(() => ({}))) as ResultEnvelope;
        // 429(Cloudflare rate-limit)는 실패가 아니라 잠깐 물러섰다 다시 와야 하는 신호 —
        // 202와 동일하게 대기 취급하되 더 길게(6s) 백오프한다.
        if (response.status === 429) {
          if (!alive) return;
          attempts += 1;
          if (attempts >= maxAttempts) {
            setPending(false);
            setError("작명 결과 생성이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.");
            return;
          }
          setPending(true);
          setLoading(true);
          timer = window.setTimeout(loadResult, 6000);
          return;
        }
        if (response.status === 202) {
          if (!alive) return;
          attempts += 1;
          if (attempts >= maxAttempts) {
            setPending(false);
            setError("작명 결과 생성이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.");
            return;
          }
          setPending(true);
          setLoading(true);
          timer = window.setTimeout(loadResult, 3000);
          return;
        }
        if (response.status === 503) {
          if (!alive) return;
          setFailed(true);
          setError(toText(payload?.message) || "작명 결과 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }
        if (!response.ok || payload?.ok === false || !payload?.result) {
          // 앱 수준 확정 실패(404 등)는 재시도하지 않고 즉시 종료한다 — catch는 순수 네트워크 오류만 담당.
          if (alive) setError(toText(payload?.message) || "작명 결과를 불러오지 못했습니다.");
          return;
        }
        if (alive) {
          setResult(payload.result);
          setPending(false);
          clearNamingRetryPayload(executionId); // 결과 수렴 완료 — 재시도 핸드오프 페이로드 정리.
        }
      } catch (caught) {
        // 여기 도달하면 fetch/JSON 파싱 자체가 실패한 일시 네트워크 오류다 —
        // 상한 내에서 백오프 재시도로 흡수하고, 상한을 넘겨야 최종 실패로 노출한다.
        if (!alive) return;
        attempts += 1;
        if (attempts < maxAttempts) {
          setPending(true);
          setLoading(true);
          timer = window.setTimeout(loadResult, 4000);
          return;
        }
        setError(friendlyErrorMessage(caught, "작명 결과를 불러오지 못했습니다."));
      } finally {
        if (alive) setLoading(false);
      }
    }
    void loadResult();
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [queryReady, executionId, retryKey]);

  const sections = useMemo(
    () =>
      parseAssistantSections(result?.generatedResult || "", {
        titleKeywords: SECTION_TITLE_KEYWORDS,
        fallbackTitles: FALLBACK_SECTION_TITLES,
        minHeadings: 5,
      }),
    [result?.generatedResult],
  );

  const nameCards = useMemo(
    () => (Array.isArray(result?.nameCards) ? result.nameCards.filter((card) => toText(card?.name)) : []),
    [result?.nameCards],
  );
  const finalPick = result?.finalPick && toText(result.finalPick.name) ? result.finalPick : null;
  const finalPickCard = useMemo(() => {
    if (!finalPick) return null;
    const pickName = toText(finalPick.name).replace(/\s+/g, "");
    return nameCards.find((card) => toText(card.name).replace(/\s+/g, "") === pickName) || null;
  }, [finalPick, nameCards]);
  const otherCards = useMemo(
    () => (finalPickCard ? nameCards.filter((card) => card !== finalPickCard) : nameCards),
    [nameCards, finalPickCard],
  );

  const input = result?.inputSnapshot || null;
  const saju = result?.sajuSnapshot || null;
  const familyName = toText(input?.familyName) || "미입력";
  const generatedAt = result?.generatedAt ? new Date(result.generatedAt) : null;
  const generatedAtIntlLocale = INTL_LOCALE_BY_LOADING_LOCALE[getCurrentLoadingLocale()];
  const generatedAtLabel = generatedAt && !Number.isNaN(generatedAt.getTime())
    ? generatedAt.toLocaleDateString(generatedAtIntlLocale, { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString(generatedAtIntlLocale);

  const preferenceItems = [input?.preferredStyle, ...(input?.preferredImage || [])]
    .filter((item): item is string => Boolean(item))
    .map((item) => toText(item));

  const hasPreferenceCard = Boolean(
    input?.desiredType || preferenceItems.length || input?.desiredNames?.length || input?.memo
    || input?.desiredSyllables?.length || input?.requiredSyllables?.length || input?.blockedSyllables?.length,
  );

  const pillarRows: Array<[string, string | undefined]> = [
    ["년주", saju?.yearPillar],
    ["월주", saju?.monthPillar],
    ["일주", saju?.dayPillar],
    ["시주", saju?.hourPillar],
  ];

  const viewerPages = useMemo(
    () =>
      withCharacterBreaks(
        sections.map((section, index) => ({
          id: `naming-section-${index}`,
          label: toText(section.title).slice(0, 12) || `${index + 1}장`,
          content: <NamingResultSection title={section.title} body={section.body} />,
        })),
        yeoniBreaks,
      ),
    [sections],
  );

  // 실패 상태의 "다시 시도": 폼에서 넘겨준 재시도 페이로드가 있으면 같은 이용권/결제 증거로 /generate를
  // 재호출해 재생성한다(백그라운드 실패/stale 레코드를 인계 → coin-gate 미호출 → 추가 차감 없음).
  // 페이로드가 없으면(URL 직접 진입) 재폴링만 한다. 어느 경우든 폴링 이펙트를 재실행해 상태에 수렴시킨다.
  async function handleRetry() {
    const payload = readNamingRetryPayload(executionId);
    if (payload) {
      setFailed(false);
      setError("");
      setPending(true);
      setLoading(true);
      const access = (payload.access || {}) as Record<string, unknown>;
      try {
        const res = await authFetch("/api/naming-prompt/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: access.paymentId,
            inputHash: payload.inputHash,
            input: payload.input,
            paymentContext: access.raw,
            accessGrant: access.accessGrant,
            consume: access.consume,
            payment: access.payment,
          }),
        });
        if (res.status === 401 || res.status === 403) {
          handleSessionInvalidated({ redirect: true });
          return;
        }
      } catch {
        // 네트워크 오류는 아래 폴링 재개에서 흡수한다.
      }
    }
    setRetryKey((key) => key + 1);
  }

  async function handleCopyPrompt() {
    if (!result?.generatedPrompt) return;
    const ok = await copyTextToClipboard(result.generatedPrompt);
    setCopied(ok);
    if (ok) window.setTimeout(() => setCopied(false), 2000);
  }

  async function handlePdfDownload() {
    const element = document.getElementById("naming-ai-result-document");
    if (!element || pdfLoading || !result) return;
    // 페이지 뷰어가 숨긴 장(display:none)과 접힌 프롬프트 섹션은 html2canvas에서 빈 캔버스가 되므로
    // expandForExport로 전부 펼친 뒤 data-naming-pdf-page 마커 블록 단위로 캡처한다(블록마다 새 PDF 페이지).
    const detailsElements = Array.from(element.querySelectorAll("details"));
    const previousOpenStates = detailsElements.map((details) => details.open);
    setPdfLoading(true);
    setPdfError("");
    setExportExpand(true);
    try {
      detailsElements.forEach((details) => {
        details.open = true;
      });
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await new Promise((resolve) => setTimeout(resolve, 120));
      const date = new Date().toISOString().slice(0, 10);
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      await exportResultPdf({
        captureTargets: ["#naming-ai-result-document [data-naming-pdf-page]"],
        fileName: `naming-ai-result-${executionId}.pdf`,
        backgroundColor: "#0a0818",
        cover: {
          title: `${familyName}씨 아이의 작명첩`,
          subtitle: `${toText(input?.birthDate) || "생년월일 미입력"}${calendarLabel(input) ? ` (${calendarLabel(input)})` : ""} 생 · 사주 맞춤 작명`,
          date,
        },
      });
    } catch {
      setPdfError("작명 결과를 PDF로 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      detailsElements.forEach((details, index) => {
        details.open = previousOpenStates[index] ?? details.open;
      });
      setExportExpand(false);
      setPdfLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0818] text-[#f4eeff] [font-family:var(--font-body)]">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(178deg,#0a0818_0%,#13102a_44%,#090718_100%)]" aria-hidden="true" />
      <div
        className="pointer-events-none fixed inset-0 opacity-70 [background:radial-gradient(560px_360px_at_18%_-4%,rgba(167,139,250,0.16),transparent_70%),radial-gradient(480px_320px_at_86%_8%,rgba(232,213,163,0.1),transparent_70%)]"
        aria-hidden="true"
      />

      <section className="relative mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/naming-ai"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#c4b5fd]/25 bg-[#13102a]/60 px-5 text-sm font-bold text-[#f4eeff] transition hover:border-[#c4b5fd]/55 hover:bg-[#c4b5fd]/10"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            작명소로 돌아가기
          </Link>
          {result && (
            <button
              type="button"
              onClick={() => void handlePdfDownload()}
              disabled={pdfLoading}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-[#c4b5fd] px-5 text-sm font-black text-[#0a0818] transition hover:bg-[#d5cafe] disabled:cursor-not-allowed disabled:opacity-60 ${VIOLET_GLOW}`}
            >
              {pdfLoading
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0a0818]/30 border-t-[#0a0818] motion-reduce:animate-none" aria-hidden="true" />
                : <Download className="h-4 w-4" aria-hidden="true" />}
              {pdfLoading ? "작명첩을 정리하는 중입니다" : "PDF로 소장하기"}
            </button>
          )}
        </div>

        {loading && (
          <div className={`${PANEL} min-h-[60vh] p-7 sm:p-10`}>
            <p className="text-lg font-black text-[#f4eeff] [font-family:var(--font-display)] sm:text-xl" aria-live="polite">
              {pending ? `${WAIT_STEPS[waitStep]}…` : "저장된 작명첩을 펼치고 있습니다…"}
            </p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[#c8aaff]/80">
              사주와 성명학 원리를 함께 살펴 이름을 짓는 동안 이 창을 열어 두세요. 완성되면 이 자리에서 바로 펼쳐집니다.
            </p>
            {pending && (
              <ol className="mt-6 grid gap-2 text-sm" aria-hidden="true">
                {WAIT_STEPS.map((step, index) => (
                  <li
                    key={step}
                    className={`flex items-center gap-2.5 transition-colors duration-200 ${index === waitStep ? "text-[#e8d5a3]" : "text-[#c8aaff]/45"}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${index === waitStep ? "bg-[#e8d5a3]" : "bg-[#c4b5fd]/30"}`} />
                    {step}
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-8 grid gap-3" aria-hidden="true">
              <div className="h-28 animate-pulse rounded-3xl bg-[#c4b5fd]/[0.07] motion-reduce:animate-none" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="h-36 animate-pulse rounded-3xl bg-[#c4b5fd]/[0.07] motion-reduce:animate-none" />
                <div className="h-36 animate-pulse rounded-3xl bg-[#c4b5fd]/[0.05] motion-reduce:animate-none" />
              </div>
              <div className="h-52 animate-pulse rounded-3xl bg-[#c4b5fd]/[0.04] motion-reduce:animate-none" />
            </div>
          </div>
        )}

        {!loading && error && (
          <div className={`${PANEL} grid min-h-[60vh] place-items-center p-8 text-center`}>
            <div className="max-w-md">
              <AlertCircle className="mx-auto h-9 w-9 text-[#c4b5fd]" aria-hidden="true" />
              <h1 className="mt-4 text-2xl font-black text-[#f4eeff] [font-family:var(--font-display)]">
                {failed ? "작명 결과 생성에 실패했습니다" : "결과를 열 수 없습니다"}
              </h1>
              <p className="mt-3 text-sm leading-7 text-[#c8aaff]/85">{error}</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-[#c4b5fd] px-5 text-sm font-black text-[#0a0818] transition hover:bg-[#d5cafe] ${VIOLET_GLOW}`}
                >
                  다시 시도
                </button>
                <Link
                  href="/naming-ai"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#c4b5fd]/25 bg-[#13102a]/60 px-5 text-sm font-bold text-[#f4eeff] transition hover:border-[#c4b5fd]/55"
                >
                  작명소로 돌아가기
                </Link>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && result && (
          <div id="naming-ai-result-document" className="relative space-y-6">
            {/* 표지 — 작명첩의 첫 장 */}
            <header data-naming-pdf-page className={`${PANEL} relative overflow-hidden p-7 sm:p-10`}>
              <span
                className="pointer-events-none absolute -right-4 -top-8 select-none text-[9rem] font-black leading-none text-[#e8d5a3]/[0.08] [font-family:var(--font-display)] sm:text-[12rem]"
                aria-hidden="true"
              >
                名
              </span>
              <p className="text-sm font-bold text-[#c8aaff]/80">훈민정음 작명소 · 사주 맞춤 작명첩</p>
              <h1 className="mt-3 text-3xl font-black leading-tight text-[#f4eeff] [font-family:var(--font-display)] [text-wrap:balance] sm:text-5xl">
                {familyName}씨 아이의 작명첩
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[#e6ddfa]">
                사주에서 검증한 용신과 희신을 바탕으로 소리오행·수리오행·자원오행을 함께 짚어,
                이 아이에게 가장 어울리는 이름을 지었습니다.
              </p>
              <dl className="mt-6 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <CoverRow label="성별" value={genderLabel(input?.gender)} />
                <CoverRow label="생년월일" value={`${toText(input?.birthDate) || "미입력"}${calendarLabel(input) ? ` · ${calendarLabel(input)}` : ""}`} />
                <CoverRow label="이름 글자 수" value={input?.nameLength ? `성 제외 ${input.nameLength}자` : "미입력"} />
                <CoverRow label="발급일" value={generatedAtLabel} />
              </dl>
            </header>

            {input?.birthTimeUnknown && (
              <section data-naming-pdf-page className="rounded-3xl border border-[#e8d5a3]/25 bg-[#e8d5a3]/[0.07] p-5 text-sm leading-7 text-[#f2e9d3]">
                출생시간 미상으로 시주(時柱)는 확정하지 않고, 년·월·일주를 중심으로 용신을 판단해 작명에 반영했습니다.
              </section>
            )}

            {/* 최종 추천 — 골드 글로우 히어로 */}
            {finalPick && (
              <section
                data-naming-pdf-page
                className={`relative overflow-hidden rounded-[28px] border border-[#e8d5a3]/40 bg-[linear-gradient(160deg,rgba(232,213,163,0.12),rgba(19,16,42,0.9)_58%)] p-7 sm:p-10 ${MOON_GLOW}`}
              >
                <p className="text-sm font-bold text-[#e8d5a3]">작명가의 최종 추천</p>
                <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2">
                  <h2 className="text-5xl font-black leading-none text-[#f4eeff] [font-family:var(--font-display)] sm:text-6xl">
                    {familyName !== "미입력" ? familyName : ""}{toText(finalPick.name)}
                  </h2>
                  {finalPickCard?.hanja && (
                    <p className="text-2xl font-bold text-[#e8d5a3] sm:text-3xl">{toText(finalPickCard.hanja)}</p>
                  )}
                </div>
                {finalPickCard?.meaning && (
                  <p className="mt-3 text-base font-semibold text-[#e6ddfa]">{toText(finalPickCard.meaning)}</p>
                )}
                {finalPick.reason && (
                  <p className="mt-4 max-w-3xl text-base leading-8 text-[#f4eeff] [font-family:var(--font-premium)]">
                    “{toText(finalPick.reason)}”
                  </p>
                )}
                {finalPickCard && <NameCardPills card={finalPickCard} tone="gold" className="mt-5" />}
              </section>
            )}

            {/* 이름 후보 카드 */}
            {otherCards.length > 0 && (
              <section data-naming-pdf-page className={`${PANEL} p-6 sm:p-8`}>
                <h2 className="text-xl font-black text-[#f4eeff] [font-family:var(--font-display)]">함께 살펴본 이름들</h2>
                <p className="mt-2 text-sm leading-7 text-[#c8aaff]/80">
                  각 이름의 결이 어떻게 다른지는 아래 작명첩 본문에서 자세히 풀었습니다.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {otherCards.map((card, index) => (
                    <article
                      key={`${toText(card.name)}-${index}`}
                      className="rounded-3xl border border-[#c4b5fd]/20 bg-[#0a0818]/55 p-5 transition duration-200 hover:border-[#c4b5fd]/45 hover:shadow-[0_0_24px_-8px_rgba(147,51,234,0.4)]"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h3 className="text-2xl font-black text-[#f4eeff] [font-family:var(--font-display)]">
                          {familyName !== "미입력" ? familyName : ""}{toText(card.name)}
                        </h3>
                        {card.hanja && <p className="text-lg font-bold text-[#c4b5fd]">{toText(card.hanja)}</p>}
                      </div>
                      {card.meaning && <p className="mt-1.5 text-sm font-semibold text-[#e6ddfa]">{toText(card.meaning)}</p>}
                      {card.summary && <p className="mt-2 text-sm leading-6 text-[#c8aaff]/85">{toText(card.summary)}</p>}
                      <NameCardPills card={card} tone="violet" className="mt-3.5" />
                    </article>
                  ))}
                </div>
              </section>
            )}

            {saju && (
              <section data-naming-pdf-page className={`${PANEL} p-6 sm:p-8`}>
                <h2 className="text-xl font-black text-[#f4eeff] [font-family:var(--font-display)]">이름의 근거가 된 사주</h2>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
                  {pillarRows.map(([labelText, value]) => (
                    <div key={labelText} className="rounded-2xl border border-[#c4b5fd]/15 bg-[#0a0818]/55 px-2 py-3.5">
                      <p className="text-xs font-bold text-[#c8aaff]/70">{labelText}</p>
                      <p className="mt-1 font-black text-[#f4eeff]">{toText(value) || "-"}</p>
                    </div>
                  ))}
                </div>
                <dl className="mt-5 grid gap-x-6 gap-y-2 text-sm leading-7 sm:grid-cols-2">
                  <SajuRow label="일간" value={toText(saju.dayMaster)} />
                  <SajuRow label="오행 분포" value={toText(saju.fiveElementBalance)} />
                  <SajuRow label="용신 후보" value={toText(saju.usefulGodCandidates)} />
                  <SajuRow label="기신 후보" value={toText(saju.unfavorableGodCandidates)} />
                  <SajuRow label="이름에 담으면 좋은 오행" value={toText(saju.recommendedNameElements)} wide />
                  <SajuRow label="피하면 좋은 오행" value={toText(saju.avoidNameElements)} wide />
                </dl>
              </section>
            )}

            {hasPreferenceCard && (
              <section data-naming-pdf-page className={`${PANEL} p-6 sm:p-8`}>
                <h2 className="text-xl font-black text-[#f4eeff] [font-family:var(--font-display)]">부모님이 청한 조건</h2>
                <dl className="mt-4 grid gap-2 text-sm leading-7">
                  {input?.desiredType && <SajuRow label="원하는 방향" value={toText(input.desiredType)} wide />}
                  {preferenceItems.length > 0 && <SajuRow label="분위기·이미지" value={preferenceItems.join(", ")} wide />}
                  {input?.desiredSyllables?.length ? <SajuRow label="사용하고 싶은 음절" value={input.desiredSyllables.join(", ")} wide /> : null}
                  {input?.requiredSyllables?.length ? <SajuRow label="반드시 넣고 싶은 글자" value={input.requiredSyllables.join(", ")} wide /> : null}
                  {input?.blockedSyllables?.length ? <SajuRow label="피하고 싶은 글자" value={input.blockedSyllables.join(", ")} wide /> : null}
                  {input?.desiredNames?.length ? (
                    <div className="sm:col-span-2">
                      <dt className="font-black text-[#c4b5fd]">미리 생각해 온 후보</dt>
                      <dd className="mt-1">
                        <ul className="list-disc space-y-1 pl-5 text-[#e6ddfa]">
                          {input.desiredNames.map((candidate, index) => (
                            <li key={`${candidate.hangul || "candidate"}-${index}`}>
                              {toText(candidate.hangul) || "한글 미입력"}
                              {candidate.hanjaCandidates?.length ? ` (${candidate.hanjaCandidates.join(", ")})` : ""}
                              {candidate.note ? ` — ${toText(candidate.note)}` : ""}
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  ) : null}
                  {input?.memo && <SajuRow label="기타 요청" value={toText(input.memo)} wide />}
                </dl>
              </section>
            )}

            {/* 작명첩 본문 — 8장 책장 뷰어 */}
            <section>
              <PagedResultViewer
                pages={viewerPages}
                deckLabel="작명첩 본문"
                viewAll={viewAll}
                onViewAllChange={setViewAll}
                expandForExport={exportExpand}
              />
            </section>

            {/* 이 작명첩을 만든 프롬프트 — 결과와 함께 제공하는 서비스 */}
            {result.generatedPrompt && (
              <details
                data-naming-pdf-page
                className={`${PANEL} group p-6 sm:p-8`}
                open={promptOpen || exportExpand}
                onToggle={(event) => setPromptOpen(event.currentTarget.open)}
              >
                <summary className="cursor-pointer list-none rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c4b5fd]/50 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3.5">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#c4b5fd]/25 bg-[#c4b5fd]/10">
                        <ScrollText className="h-5 w-5 text-[#c4b5fd]" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-lg font-black text-[#f4eeff] [font-family:var(--font-display)]">이 작명첩을 만든 프롬프트</span>
                        <span className="mt-0.5 block text-xs text-[#c8aaff]/70">결과와 함께 원문 그대로 드립니다</span>
                      </span>
                    </span>
                    <span className="text-xs font-bold text-[#c4b5fd] transition group-open:rotate-180" aria-hidden="true">▾</span>
                  </span>
                </summary>
                <div className="mt-5">
                  <p className="text-sm leading-7 text-[#c8aaff]/85">
                    이 작명첩은 아래 프롬프트로 만들어졌습니다. 사주 계산 결과와 작명 원칙이 모두 담겨 있어,
                    다른 AI에 붙여넣으면 같은 기준으로 분석을 재현하거나 조건을 바꿔 변형해 볼 수 있습니다.
                  </p>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleCopyPrompt()}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#c4b5fd]/30 bg-[#c4b5fd]/10 px-4 text-xs font-bold text-[#f4eeff] transition hover:border-[#c4b5fd]/60 hover:bg-[#c4b5fd]/20"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-[#e8d5a3]" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                      {copied ? "복사되었습니다" : "프롬프트 복사"}
                    </button>
                  </div>
                  <pre
                    className={`mt-3 whitespace-pre-wrap break-words rounded-3xl border border-[#c4b5fd]/15 bg-[#090718]/80 p-5 text-xs leading-6 text-[#d8cff0] ${exportExpand ? "" : "max-h-[480px] overflow-auto"}`}
                  >
                    {result.generatedPrompt}
                  </pre>
                  <p className="mt-3 text-xs text-[#c8aaff]/55">
                    {[result.provider, result.model].filter(Boolean).join(" / ") || "AI 생성"} · {generatedAtLabel}
                  </p>
                </div>
              </details>
            )}

            <footer data-naming-pdf-page className="rounded-3xl border border-[#c4b5fd]/15 bg-[#13102a]/45 p-5 text-xs leading-6 text-[#c8aaff]/70">
              이 작명첩은 사주명리와 성명학 이론에 근거한 참고 자료입니다. 출생신고·개명 전에는 대법원 인명용 한자 여부와
              가족관계등록부 표기를 반드시 직접 확인해 주세요. — Code Destiny 훈민정음 작명소 · {generatedAtLabel}
            </footer>

            {pdfError && (
              <section className="rounded-3xl border border-rose-300/30 bg-rose-400/10 p-4 text-sm leading-7 text-rose-50" role="alert">
                {pdfError}
              </section>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function CoverRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <dt className="shrink-0 text-xs font-bold text-[#c8aaff]/70">{label}</dt>
      <dd className="break-words font-bold text-[#f4eeff]">{value}</dd>
    </div>
  );
}

function SajuRow({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="inline font-black text-[#c4b5fd]">{label}</dt>
      <dd className="inline pl-2 text-[#e6ddfa]">{value || "-"}</dd>
    </div>
  );
}

function NameCardPills({ card, tone, className = "" }: { card: NamingNameCard; tone: "gold" | "violet"; className?: string }) {
  const pills = [
    card.elements ? `보완오행 ${toDisplayText(card.elements)}` : "",
    card.soundFlow ? `소리 ${toDisplayText(card.soundFlow)}` : "",
    card.suri ? `수리 ${toDisplayText(card.suri)}` : "",
  ].filter(Boolean);
  if (!pills.length) return null;
  const pillClass = tone === "gold"
    ? "border-[#e8d5a3]/35 bg-[#e8d5a3]/10 text-[#f2e9d3]"
    : "border-[#c4b5fd]/25 bg-[#c4b5fd]/[0.08] text-[#e6ddfa]";
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {pills.map((pill) => (
        <li key={pill} className={`rounded-full border px-3 py-1 text-xs font-semibold ${pillClass}`}>
          {pill}
        </li>
      ))}
    </ul>
  );
}

function NamingResultSection({ title, body }: { title: string; body: string }) {
  return (
    <article data-naming-pdf-page className={`${PANEL} p-6 sm:p-8`}>
      <h2 className="text-xl font-black text-[#f4eeff] [font-family:var(--font-display)] [text-wrap:balance] sm:text-2xl">{title}</h2>
      <div className="mt-4 border-t border-[#c4b5fd]/12 pt-4">
        <AiResultProse value={body} className="text-[#e6ddfa]" />
      </div>
    </article>
  );
}
