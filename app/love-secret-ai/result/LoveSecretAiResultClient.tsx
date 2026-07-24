"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, Clock, Flame, Heart, Info, Loader2, Moon, RefreshCw, Sparkles, Star } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { extractReadableTextFromJsonLike, looksLikeRawJson, toDisplayText } from "@/lib/llm-text";
import PagedResultViewer, { usePagedViewerMode } from "@/components/fortune/PagedResultViewer";
import { PaintedBackdrop } from "@/components/fortune/PaintedBackdrop";
import { paintedBackdrops } from "@/components/fortune/painted-backdrops";
import AiResultProse from "@/components/fortune/AiResultProse";
import { withCharacterBreaks, yeoniBreaks } from "@/components/fortune/result-character-breaks";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";
import { isRetriableResultPollFailure } from "@/app/_lib/consultationResultPolling";
import { readDevPreviewState, buildDevPreviewResponse } from "@/lib/dev-preview/core";
import { buildLoveSecretPreviewPayload } from "@/lib/dev-preview/fixtures/love-secret";
import styles from "./LoveSecretAiResultClient.module.css";

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

// 난이도(=중요도·성공 가능성) → 하트 게이지 채움 개수
const IMPORTANCE_BY_DIFFICULTY: Record<string, number> = {
  낮음: 1,
  쉬움: 1,
  중간: 2,
  보통: 2,
  높음: 3,
  도전: 3,
};

// 타이밍 키를 읽기 좋은 라벨로
const TIMING_LABEL: Record<string, string> = {
  오늘: "오늘",
  이번주: "이번 주",
  "2주내": "2주 내",
  이번달: "이번 달",
  다음달: "다음 달",
  분기내: "분기 내",
};

type ActionSecret = {
  difficulty: string;
  importance: number;
  timing: string;
  action: string;
  evidence: string;
};

// "[낮음·이번주] 행동 (근거: …)" 형식의 전략 문자열을 배지·행동·근거로 분해
// (난이도·타이밍 표기는 데이터마다 쉬움/보통/도전 또는 낮음/중간/높음, 오늘~분기내까지 폭넓게 등장한다)
function parseActionSecret(raw: string): ActionSecret {
  const text = toText(raw);
  const badgeMatch = text.match(/^\[\s*(쉬움|보통|도전|낮음|중간|높음)\s*[·,\s]\s*(오늘|이번\s*주|2\s*주\s*내|이번\s*달|다음\s*달|분기\s*내)\s*\]\s*/);
  const rest = badgeMatch ? text.slice(badgeMatch[0].length) : text;
  const evidenceMatch = rest.match(/\(근거\s*[:：]\s*([^)]+)\)\s*$/);
  const difficulty = badgeMatch?.[1] || "";
  return {
    difficulty,
    importance: IMPORTANCE_BY_DIFFICULTY[difficulty] || 0,
    timing: badgeMatch?.[2]?.replace(/\s+/g, "") || "",
    action: evidenceMatch ? rest.slice(0, evidenceMatch.index).trim() : rest,
    evidence: evidenceMatch?.[1]?.trim() || "",
  };
}

function ImportanceHearts({ level }: { level: number }) {
  const total = 3;
  const filled = Math.min(total, Math.max(0, level));
  if (!filled) return null;
  return (
    <div className="ml-auto flex items-center gap-1" role="img" aria-label={`성공 가능성 ${total}단계 중 ${filled}`}>
      {Array.from({ length: total }).map((_, index) => (
        <Heart
          key={index}
          className={`h-3.5 w-3.5 ${index < filled ? "fill-[var(--ls-rose)] text-[var(--ls-rose)]" : "text-[var(--ls-line-strong)]"}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function LoveSecretRoadmapCard({ item, index, forceEvidence }: { item: ActionSecret; index: number; forceEvidence: boolean }) {
  const [open, setOpen] = useState(false);
  const showEvidence = forceEvidence || open;
  const timingLabel = TIMING_LABEL[item.timing] || item.timing;
  return (
    <li className={styles.roadmapRow}>
      <span className={styles.node} aria-hidden="true">
        <Heart className="h-full w-full fill-[var(--ls-rose)] text-[var(--ls-rose)]" />
        <span className={styles.nodeNum}>{index + 1}</span>
      </span>
      <article className={`${styles.roadmapCard} rounded-3xl border border-[var(--ls-line)] bg-[var(--ls-surface)] p-4 backdrop-blur-md sm:p-5`}>
        <span className={styles.sparkle} aria-hidden="true" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-gradient-to-r from-[#f6d9c4] via-[#eeb0a0] to-[#e0a5ab] px-2.5 py-0.5 text-[11px] font-black text-[#3a1424]">
            비책 {index + 1}
          </span>
          {timingLabel && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ls-line)] bg-[var(--ls-surface-2)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--ls-blush)]">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {timingLabel}
            </span>
          )}
          <ImportanceHearts level={item.importance} />
        </div>
        <p className="mt-2.5 text-[15px] font-bold leading-7 text-[var(--ls-text)]">{item.action}</p>
        {item.evidence && (
          <>
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              aria-expanded={showEvidence}
              className="mt-2 inline-flex items-center gap-1 rounded-full px-1 py-0.5 text-xs font-bold text-[var(--ls-rosegold)] transition hover:text-[var(--ls-blush)]"
            >
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              {showEvidence ? "근거 접기" : "근거 보기"}
            </button>
            {showEvidence && (
              <p className={`${styles.evidenceReveal} mt-1.5 rounded-2xl border border-[var(--ls-line)] bg-[var(--ls-surface-2)] px-3 py-2 text-xs leading-6 text-[var(--ls-text-muted)]`}>
                근거 · {item.evidence}
              </p>
            )}
          </>
        )}
      </article>
    </li>
  );
}

function LoveSecretRoadmap({ reading, forceEvidence }: { reading: NonNullable<Consultation["reading"]>; forceEvidence: boolean }) {
  const secrets = (reading.actionSecrets || []).map(parseActionSecret).filter((item) => item.action);
  if (!secrets.length) return null;
  return (
    <section className="mt-8" aria-label="연애 로드맵 — 지금 실행할 전략">
      <div className="flex items-center gap-2 text-[var(--ls-rosegold)]">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <h2 className="text-lg font-black text-[var(--ls-text)]">연애 로드맵</h2>
      </div>
      <p className="mt-1 text-sm leading-6 text-[var(--ls-text-muted)]">이번 주부터 한 걸음씩, 관계가 이렇게 깊어집니다.</p>
      <ol className={styles.roadmap}>
        {secrets.map((item, index) => (
          <LoveSecretRoadmapCard key={`${item.action}-${index}`} item={item} index={index} forceEvidence={forceEvidence} />
        ))}
      </ol>
    </section>
  );
}

function keywordIcon(keyword: string) {
  const value = toText(keyword);
  if (/끌림|매력|호감|설렘|이끌/.test(value)) return Flame;
  if (/타이밍|시기|때|시간|흐름/.test(value)) return Clock;
  if (/진심|마음|신뢰|사랑|애정/.test(value)) return Sparkles;
  return Star;
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
    // 서버 최악 파이프라인(초기 150s + grounding 재시도 150s ≈ 300s)보다 짧으면 완료·저장된 유료 결과에
    // 거짓 "지연" 표시가 뜬다(버그). 상한을 넘겨 폴링하되, 2.5s 간격이라 CF rate-limit(10s/100)엔 여유가 크다.
    const maxAttempts = 140; // 첫 프로브(0.7s) + 2.5s * 139 ≈ 350s 상한 — 무한 폴링 방지 유지
    async function loadResult() {
      setLoading(true);
      setError("");
      try {
        const previewState = readDevPreviewState();
        const response = previewState
          ? buildDevPreviewResponse(buildLoveSecretPreviewPayload(previewState), previewState === "failed" ? 503 : 200)
          : await authFetch(buildResultEndpoint());
        const payload = await response.json().catch(() => ({})) as Consultation;
        // 일시적 DB/인증 장애(503·retryable)는 202와 동일하게 재폴링해 자가 복구한다(하드 종료 금지).
        if (response.status === 202 || isRetriableResultPollFailure(response.status, payload)) {
          if (!alive) return;
          attempts += 1;
          if (attempts >= maxAttempts) {
            setPending(false);
            setError("상담 결과 생성이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.");
            return;
          }
          setPending(true);
          setLoading(true);
          // 첫 폴은 빠르게(0.7s) 프로브해 조기 완료를 즉시 잡고, 이후 2.5s 간격으로 최악치까지 커버한다.
          timer = window.setTimeout(loadResult, attempts <= 1 ? 700 : 2500);
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
  const summaryTitle = consultation?.reading?.summaryTitle || "연애 비책 전문가 상담 리포트";
  const oneLine = consultation?.reading?.oneLineDiagnosis || consultation?.strategy || sections[0]?.body || "지금의 관계 온도를 차분히 읽었습니다.";

  async function handlePdfDownload() {
    const element = document.getElementById("love-secret-result-document");
    if (!element || pdfLoading || !consultation) return;
    setPdfLoading(true);
    setPdfError("");
    // 페이지 뷰어가 숨긴 장(display:none)과 접힌 근거(ⓘ)는 html2canvas에서 빈 캔버스가 되므로 전부 펼친 뒤 캡처한다.
    setExportExpand(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await new Promise((resolve) => setTimeout(resolve, 120));
    try {
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      await exportResultPdf({
        captureTargets: ["#love-secret-result-document"],
        fileName: `love-secret-reading-${safeFilePart(consultation.sessionId || consultation.attemptId || "result")}.pdf`,
        backgroundColor: "#241019",
        cover: {
          title: summaryTitle,
          subtitle: oneLine,
          date: new Date().toISOString().slice(0, 10),
        },
      });
    } catch (_) {
      setPdfError("상담 리포트를 PDF로 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setExportExpand(false);
      setPdfLoading(false);
    }
  }

  return (
    <main className={`${styles.shell} relative min-h-screen overflow-hidden bg-[var(--ls-bg-0)] text-[var(--ls-text)] [font-family:var(--font-body)]`}>
      {/* 붉은 실 인연 페인팅 배경(R2) — 강한 베일로 장문 가독성(AA) 유지. 불투명 bgGrad 베이스는 제거하고 반투명 글로우만 남긴다 */}
      <PaintedBackdrop src={paintedBackdrops.redThread} veil={0.8} position="center 30%" />
      <div className={`${styles.bgGlow} pointer-events-none fixed inset-0`} aria-hidden="true" />
      <div className={`${styles.petals} pointer-events-none fixed inset-0`} aria-hidden="true" />

      <section className="relative mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <a href="/love-secret-ai" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--ls-line)] bg-[var(--ls-surface-2)] px-4 text-sm font-bold text-[var(--ls-text)] backdrop-blur-md transition hover:border-[var(--ls-line-strong)] hover:text-[var(--ls-blush)]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            다시 상담하기
          </a>
          {consultation && (
            <LoveSecretPdfButton loading={pdfLoading} onClick={() => void handlePdfDownload()} />
          )}
        </div>

        {loading && (
          <div className="grid min-h-[62vh] place-items-center rounded-3xl border border-[var(--ls-line)] bg-[var(--ls-surface)] p-8 text-center backdrop-blur-md">
            <div>
              <Loader2 className="mx-auto h-9 w-9 animate-spin text-[var(--ls-rosegold)] motion-reduce:animate-none" aria-hidden="true" />
              <h1 className="mt-5 text-2xl font-black text-[var(--ls-text)]">
                {pending ? "상담 리포트를 여는 중입니다" : "저장된 상담 결과를 불러오고 있습니다"}
              </h1>
              <p className="mt-3 text-sm leading-7 text-[var(--ls-text-muted)]">
                두 사람의 마음의 온도를 정리하는 동안 이 창을 열어 두세요.
              </p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="grid min-h-[62vh] place-items-center rounded-3xl border border-[var(--ls-line-strong)] bg-[var(--ls-surface)] p-8 text-center backdrop-blur-md">
            <div className="max-w-md">
              <AlertCircle className="mx-auto h-10 w-10 text-[var(--ls-rose)]" aria-hidden="true" />
              <h1 className="mt-5 text-2xl font-black text-[var(--ls-text)]">결과를 열 수 없습니다</h1>
              <p className="mt-3 text-sm leading-7 text-[var(--ls-text-muted)]">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#f6d9c4] via-[#eeb0a0] to-[#e0a5ab] px-4 text-sm font-black text-[#3a1424] transition hover:brightness-105"
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
  const topic = toText(consultation.topic) || "전체 연애 흐름";
  return (
    <div id="love-secret-result-document" className="relative rounded-[32px] border border-[var(--ls-line)] bg-[var(--ls-bg-0)] p-4 sm:p-6">
      <div className={`${styles.petals} pointer-events-none absolute inset-0 rounded-[32px]`} aria-hidden="true" />
      <div className="relative">
        <header className="overflow-hidden rounded-[28px] border border-[var(--ls-line)] bg-[var(--ls-surface)] p-6 backdrop-blur-md sm:p-9">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--ls-line-strong)] bg-[var(--ls-surface-2)] px-3 py-1 text-xs font-bold tracking-[0.14em] text-[var(--ls-blush)]">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Love Secret Reading
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight text-[var(--ls-rosegold)] [font-family:var(--font-display)] [text-wrap:balance] sm:text-5xl" style={{ fontFamily: "var(--font-serif)" }}>
            {summaryTitle}
          </h1>
          <figure className={`${styles.accentQuote} mt-6 max-w-2xl`}>
            <Heart className="mb-2 h-4 w-4 text-[var(--ls-blush)]" aria-hidden="true" />
            <blockquote className="whitespace-pre-wrap pl-4 text-lg italic leading-9 text-[var(--ls-blush)] [font-family:var(--font-premium)] sm:text-xl">
              {oneLine}
            </blockquote>
          </figure>

          <LoveSecretConnectionCard myName={myName} partnerName={partnerName} topic={topic} generatedAt={generatedAt} />
        </header>

        {consultation.sajuSummary?.myChart && (
          <LoveSecretSajuSummary summary={consultation.sajuSummary} myName={myName} partnerName={partnerName} />
        )}

        {consultation.userQuestion && (
          <section className="mt-5 rounded-3xl border border-[var(--ls-line)] bg-[var(--ls-surface)] p-5 backdrop-blur-md">
            <div className="mb-3 flex items-center gap-2 text-[var(--ls-rosegold)]">
              <Heart className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-lg font-black text-[var(--ls-text)]">상담 질문</h2>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--ls-text-muted)]">{consultation.userQuestion}</p>
          </section>
        )}

        {consultation.keywords?.length ? (
          <section className="mt-6 flex flex-wrap justify-center gap-2.5" aria-label="핵심 키워드">
            {consultation.keywords.map((keyword, index) => {
              const Icon = keywordIcon(keyword);
              return (
                <span
                  key={`${index}-${toText(keyword).slice(0, 16)}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ls-line)] bg-gradient-to-r from-[rgba(244,190,209,0.16)] to-[rgba(236,208,141,0.12)] px-3.5 py-1.5 text-sm font-bold text-[var(--ls-blush)]"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {toText(keyword)}
                </span>
              );
            })}
          </section>
        ) : null}

        {consultation.reading ? <LoveSecretRoadmap reading={consultation.reading} forceEvidence={expandForExport} /> : null}

        <section className="mt-8 text-[var(--ls-rosegold)]">
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
          <footer className="mt-8 overflow-hidden rounded-[28px] border border-[var(--ls-line-strong)] bg-gradient-to-br from-[rgba(244,190,209,0.16)] to-[rgba(236,208,141,0.1)] p-6 sm:p-7">
            <div className="flex items-center gap-2 text-[var(--ls-rosegold)]">
              <Heart className="h-4 w-4 fill-[var(--ls-rose)] text-[var(--ls-rose)]" aria-hidden="true" />
              <p className="text-sm font-black tracking-[0.12em]">마지막 한마디</p>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-lg font-bold leading-9 text-[var(--ls-text)]">{consultation.finalLine}</p>
          </footer>
        )}

        {pdfError && (
          <div className="mt-5 rounded-2xl border border-[var(--ls-line-strong)] bg-[var(--ls-surface)] p-4 text-sm leading-7 text-[var(--ls-text-muted)]">
            {pdfError}
          </div>
        )}
      </div>
    </div>
  );
}

function LoveSecretConnectionCard({ myName, partnerName, topic, generatedAt }: { myName: string; partnerName: string; topic: string; generatedAt: string }) {
  return (
    <div className="relative mt-7 overflow-hidden rounded-[26px] border border-[var(--ls-line)] bg-[var(--ls-surface-2)] p-5 backdrop-blur-md sm:p-7">
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-7">
        <ConnectionName role="나" name={myName} className="sm:text-right" />
        <span className="grid shrink-0 place-items-center" aria-hidden="true">
          <Heart className={`${styles.connectionHeart} h-9 w-9 fill-[var(--ls-rose)] text-[var(--ls-rose)]`} />
        </span>
        <ConnectionName role="상대" name={partnerName} className="sm:text-left" />
      </div>
      <p className="mt-5 text-center text-sm font-semibold text-[var(--ls-text-muted)] sm:text-base">{topic}</p>
      <p className="mt-1.5 text-center text-xs text-[var(--ls-text-muted)]">{generatedAt}</p>
    </div>
  );
}

function ConnectionName({ role, name, className }: { role: string; name: string; className?: string }) {
  return (
    <div className={`text-center ${className || ""}`}>
      <p className="text-[11px] font-bold text-[var(--ls-rosegold)]">{role}</p>
      <p className="mt-1 break-keep text-2xl font-black text-[var(--ls-text)] [font-family:var(--font-display)] sm:text-3xl">{name}</p>
    </div>
  );
}

function LoveSecretSajuSummary({ summary, myName, partnerName }: { summary: SajuSummary; myName: string; partnerName: string }) {
  return (
    <section className="mt-5 rounded-3xl border border-[var(--ls-line)] bg-[var(--ls-surface)] p-5 backdrop-blur-md">
      <div className="mb-4 flex items-center gap-2 text-[var(--ls-rosegold)]">
        <Moon className="h-5 w-5" aria-hidden="true" />
        <h2 className="text-lg font-black text-[var(--ls-text)]">연애 명식 기초</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SajuChartCard label={myName} chart={summary.myChart} />
        {summary.partnerChart ? <SajuChartCard label={partnerName} chart={summary.partnerChart} /> : null}
      </div>
      {summary.compatibility && (
        <div className="mt-4 rounded-2xl border border-[var(--ls-line)] bg-[var(--ls-surface-2)] p-4 text-sm leading-7 text-[var(--ls-text-muted)]">
          <p className="font-black text-[var(--ls-rosegold)]">궁합 흐름</p>
          <p className="mt-2 whitespace-pre-wrap">{summary.compatibility.summary}</p>
          <p className="mt-2 whitespace-pre-wrap">{summary.compatibility.attractionPattern}</p>
          <p className="mt-2 whitespace-pre-wrap">{summary.compatibility.conflictPattern}</p>
          <p className="mt-2 whitespace-pre-wrap">{summary.compatibility.stability}</p>
        </div>
      )}
      {summary.uncertainty?.length ? (
        <p className="mt-3 text-xs font-bold leading-6 text-[var(--ls-text-muted)]">
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
    <article className="rounded-2xl border border-[var(--ls-line)] bg-[var(--ls-surface-2)] p-4">
      <p className="text-sm font-black text-[var(--ls-rosegold)]">{label}</p>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
        {pillars.map(([title, value]) => (
          <div key={title} className="rounded-xl border border-[var(--ls-line)] bg-[var(--ls-surface)] px-2 py-3">
            <p className="text-xs font-black text-[var(--ls-text-muted)]">{title}</p>
            <p className="mt-1 font-black text-[var(--ls-text)]">{value || "-"}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2 text-sm leading-7 text-[var(--ls-text-muted)]">
        <p><span className="font-black text-[var(--ls-rosegold)]">일간</span> {chart.dayMaster || "-"}</p>
        <p><span className="font-black text-[var(--ls-rosegold)]">오행</span> {formatDistribution(chart.fiveElements)}</p>
        <p><span className="font-black text-[var(--ls-rosegold)]">십성</span> {formatDistribution(chart.tenGods)}</p>
        <p><span className="font-black text-[var(--ls-rosegold)]">강한 기운</span> {chart.reference?.dominantElement || "-"} · <span className="font-black text-[var(--ls-rosegold)]">보완 기운</span> {chart.reference?.deficientElement || "-"}</p>
        {chart.reference?.dominantTenGod && <p><span className="font-black text-[var(--ls-rosegold)]">두드러진 십성</span> {chart.reference.dominantTenGod}</p>}
        {chart.lovePattern && <p className="whitespace-pre-wrap">{chart.lovePattern}</p>}
      </div>
    </article>
  );
}

function LoveSecretResultSection({ index, section }: { index: number; section: ResultSection }) {
  return (
    <article className="rounded-3xl border border-[var(--ls-line)] bg-[var(--ls-surface)] p-5 backdrop-blur-md sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[rgba(244,190,209,0.28)] to-[rgba(236,208,141,0.18)] text-sm font-black text-[var(--ls-rosegold)] ring-1 ring-[var(--ls-line-strong)]">
          {String(index + 1).padStart(2, "0")}
        </span>
        <h2 className="text-xl font-black text-[var(--ls-text)] [text-wrap:balance]">{section.title}</h2>
      </div>
      <AiResultProse value={section.body} className={`${styles.chapterProse} text-[var(--ls-text-muted)]`} />
    </article>
  );
}

function LoveSecretPdfButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#f6d9c4] via-[#eeb0a0] to-[#e0a5ab] px-5 text-sm font-black text-[#3a1424] shadow-[0_0_24px_-6px_rgba(238,176,160,0.55)] transition hover:shadow-[0_0_30px_-4px_rgba(238,176,160,0.8)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Heart className="h-4 w-4 fill-current" aria-hidden="true" />}
      {loading ? "PDF를 정리하고 있습니다" : "PDF로 저장하기"}
    </button>
  );
}
