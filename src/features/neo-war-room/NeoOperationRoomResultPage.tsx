"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import NeoWarRoomAssetImage from "./components/NeoWarRoomAssetImage";
import { type NeoWarRoomConsultMode, neoWarRoomAssets } from "./data/assets";
import { getNeoWarRoomMethodDefinition, neoWarRoomMethodRegistry } from "./data/method-registry";
import styles from "./neo-operation-room-result.module.css";

type NeoBriefing = {
  selectedMethod?: NeoWarRoomConsultMode;
  operationTitle?: string;
  neoOpening?: string;
  coreDiagnosis?: string;
  repeatedPattern?: { title?: string; description?: string };
  originalStrategy?: { title?: string; description?: string; keyRules?: string[] };
  currentProblem?: { title?: string; description?: string };
  methodEvidence?: Array<{ method?: string; label?: string; summary?: string }>;
  bluntTruth?: string;
  realityCheckQuestions?: Array<{ question?: string; whyItMatters?: string }>;
  nextStepPrompt?: string;
};

type NeoRefinedOrder = {
  selectedMethod?: NeoWarRoomConsultMode;
  operationTitle?: string;
  neoReview?: string;
  realBottleneck?: { title?: string; description?: string };
  updatedDiagnosis?: string;
  discardThis?: string[];
  newLifeStrategy?: { title?: string; description?: string; principles?: string[] };
  forbiddenAction?: { title?: string; reason?: string };
  sevenDayMission?: Array<{ day?: number; mission?: string }>;
  thirtyDayStrategy?: string[];
  badge?: { name?: string; description?: string };
  tsundereClosing?: string;
};

type NeoResultSession = {
  ok: true;
  id?: string;
  sessionId?: string;
  status?: "generating" | "completed" | "generation_failed" | string;
  selectedMethod?: NeoWarRoomConsultMode;
  topic?: string;
  intensity?: string;
  question?: string;
  initialBriefing?: NeoBriefing | null;
  refinedOrder?: NeoRefinedOrder | null;
  realityCheck?: { selectedChecks?: string[]; freeform?: string } | null;
  generationError?: { message?: string } | null;
  refinementError?: { message?: string } | null;
  resultUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

type NeoResultPreviewMode = "" | "loading" | "briefing" | "reality" | "refined";

const realityCheckOptions = [
  "맞다. 요즘 계속 회피하고 있다.",
  "어느 정도 맞지만 전부는 아니다.",
  "나는 오히려 너무 성급하게 움직이는 편이다.",
  "감정적으로 흔들리는 게 가장 크다.",
  "현실 문제보다 관계 문제가 더 크다.",
  "지금은 돈/직업/가족 문제가 더 중요하다.",
  "네오의 말에 반박하고 싶은 부분이 있다.",
] as const;

const NEO_RESULT_PREVIEW_MODES = new Set<NeoResultPreviewMode>(["loading", "briefing", "reality", "refined"]);

const localPreviewBriefing: NeoBriefing = {
  selectedMethod: "saju",
  operationTitle: "흐려진 전선을 다시 잡는 작전",
  neoOpening: "좋다. 지금 네 운은 멈춘 게 아니라, 같은 선택 앞에서 자꾸 힘을 잃고 있다.",
  coreDiagnosis: "겉으로는 선택지가 많은데, 실제로는 마음이 편한 쪽으로만 도망가려는 흐름이 강하다.",
  repeatedPattern: {
    title: "반복되는 선택",
    description: "중요한 순간마다 확신을 기다리다가 타이밍을 놓치고, 뒤늦게 스스로를 몰아붙이는 모습이 드러난다.",
  },
  originalStrategy: {
    title: "본래 너는 이렇게 살아야 한다",
    description: "감정이 가라앉은 뒤 판단하는 사람이다. 빠른 결정보다 기준을 먼저 세울수록 운이 안정된다.",
    keyRules: ["선택 전에 기준을 적는다", "사람의 반응보다 내 리듬을 먼저 본다", "미룬 질문을 하루 안에 하나만 처리한다"],
  },
  currentProblem: {
    title: "그런데 지금 문제는 이것이다",
    description: "정답을 몰라서가 아니라, 답을 고르면 잃을 것이 보이기 때문에 계속 판단을 흐리고 있다.",
  },
  methodEvidence: [
    { method: "saju", label: "사주 작전 브리핑", summary: "계절의 기운은 선택을 오래 붙잡기보다 기준을 먼저 세울 때 안정된다." },
    { method: "ziwei", label: "자미두수 보조 판단", summary: "명궁의 흐름은 관계 반응보다 네 판단 기준을 먼저 세우라고 가리킨다." },
  ],
  bluntTruth: "너는 아직 준비가 안 된 게 아니다. 준비라는 이름으로 결정을 늦추는 데 익숙해진 거다.",
  realityCheckQuestions: [
    { question: "지금 네가 미루는 선택은 정말 정보가 부족해서냐?", whyItMatters: "부족한 정보와 피하고 싶은 책임은 전혀 다르다." },
    { question: "네가 잃기 싫은 것은 사람의 평가냐, 네가 상상한 안전함이냐?", whyItMatters: "지키는 대상을 잘못 보면 작전이 계속 어긋난다." },
  ],
  nextStepPrompt: "현실을 대입해라. 인정해도 되고 반박해도 된다. 대신 흐리지 마라.",
};

const localPreviewRefinedOrder: NeoRefinedOrder = {
  selectedMethod: "saju",
  operationTitle: "선택의 안개를 걷는 수정 작전",
  neoReview: "네 답변까지 보면 핵심은 더 분명하다. 문제는 운이 아니라 네가 판단을 멈추는 방식이다.",
  realBottleneck: {
    title: "진짜 막힌 지점",
    description: "결정하기 전에는 완벽한 확신을 기다리고, 결정한 뒤에는 남의 반응으로 다시 흔들린다.",
  },
  updatedDiagnosis: "지금은 큰 결심보다 작은 실행 기준이 먼저다. 기준이 생기면 운의 흐름도 훨씬 덜 새어 나간다.",
  discardThis: ["모두가 납득할 때까지 기다리기", "마음이 완전히 편해질 때까지 미루기", "괜찮은 척하며 같은 자리로 돌아가기"],
  newLifeStrategy: {
    title: "새 작전 기준",
    description: "하루 안에 확인 가능한 행동으로 전선을 좁혀라. 작게 움직이면 판단이 다시 선명해진다.",
    principles: ["감정이 거센 날에는 결론 대신 자료만 모은다", "결정은 세 문장으로 적는다", "반복되는 회피는 바로 기록한다"],
  },
  forbiddenAction: {
    title: "오늘 금지 행동",
    reason: "상대 반응을 핑계로 내 결정을 다시 무르는 것.",
  },
  sevenDayMission: [
    { day: 1, mission: "가장 미룬 질문 하나를 적어라." },
    { day: 2, mission: "선택 기준 세 가지를 정리해라." },
    { day: 3, mission: "기준에 맞지 않는 선택지를 하나 버려라." },
    { day: 4, mission: "마음이 흔들린 순간과 이유를 한 줄로 남겨라." },
    { day: 5, mission: "남의 반응을 확인하기 전에 네 기준을 먼저 읽어라." },
    { day: 6, mission: "버릴 선택지 하나를 조용히 지워라." },
    { day: 7, mission: "일주일 뒤에도 남는 기준만 작전표에 남겨라." },
  ],
  thirtyDayStrategy: ["주 2회 선택 기록", "관계 반응과 내 기준 분리", "반복되는 불안을 한 줄로 명명", "한 달 뒤에도 유효한 기준만 유지"],
  badge: {
    name: "안개 절단 휘장",
    description: "흐린 마음을 핑계로 쓰지 않고, 기준을 다시 세운 사람에게 주는 휘장이다.",
  },
  tsundereClosing: "여기까지 봤으면 이제 알겠지. 네가 약한 게 아니라, 계속 같은 방식으로 흔들렸던 거다.",
};

function buildLocalPreviewSession(mode: NeoResultPreviewMode): NeoResultSession {
  const now = new Date().toISOString();
  const showBriefing = mode !== "loading";
  const showRefined = mode === "refined";
  return {
    ok: true,
    id: `local-preview-${mode || "briefing"}`,
    sessionId: `local-preview-${mode || "briefing"}`,
    status: mode === "loading" ? "generating" : "completed",
    selectedMethod: "saju",
    topic: "지금 선택",
    intensity: "standard",
    question: "지금 내가 같은 선택 앞에서 흔들리는 이유를 알고 싶다.",
    initialBriefing: showBriefing ? localPreviewBriefing : null,
    refinedOrder: showRefined ? localPreviewRefinedOrder : null,
    realityCheck: mode === "reality" || mode === "refined"
      ? {
        selectedChecks: ["맞다. 요즘 계속 회피하고 있다.", "감정적으로 흔들리는 게 가장 크다."],
        freeform: "결정하기 전에는 확신을 기다리고, 결정한 뒤에는 주변 반응이 무서워 다시 흔들린다.",
      }
      : null,
    resultUrl: `/neo-operation-room/result?neoPreview=${mode || "briefing"}`,
    createdAt: now,
    updatedAt: now,
  };
}

function asErrorMessage(value: unknown) {
  if (value && typeof value === "object" && "message" in value) return String(value.message || "").trim();
  return "";
}

function methodLabel(method?: string) {
  return getNeoWarRoomMethodDefinition(method)?.label || "선택한 술수";
}

export default function NeoOperationRoomResultPage() {
  const searchParams = useSearchParams();
  const attemptId = searchParams?.get("attemptId") || searchParams?.get("id") || "";
  const localPreviewEnabled = process.env.NODE_ENV !== "production";
  const rawPreviewMode = searchParams?.get("neoPreview") || "";
  const localPreviewMode: NeoResultPreviewMode =
    localPreviewEnabled && NEO_RESULT_PREVIEW_MODES.has(rawPreviewMode as NeoResultPreviewMode)
      ? rawPreviewMode as NeoResultPreviewMode
      : "";
  const isLocalPreview = Boolean(localPreviewMode);
  const [session, setSession] = useState<NeoResultSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRealityForm, setShowRealityForm] = useState(false);
  const [selectedChecks, setSelectedChecks] = useState<string[]>([]);
  const [freeform, setFreeform] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState("");

  const selectedMethod = session?.selectedMethod || session?.initialBriefing?.selectedMethod || session?.refinedOrder?.selectedMethod;
  const selectedMethodDefinition = useMemo(
    () => getNeoWarRoomMethodDefinition(selectedMethod) ?? neoWarRoomMethodRegistry[0],
    [selectedMethod],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadResult() {
      if (localPreviewMode) {
        const previewSession = buildLocalPreviewSession(localPreviewMode);
        setSession(previewSession);
        setSelectedChecks(previewSession.realityCheck?.selectedChecks || []);
        setFreeform(previewSession.realityCheck?.freeform || "");
        setShowRealityForm(localPreviewMode === "reality");
        setError("");
        setLoading(false);
        return;
      }
      if (!attemptId) {
        setLoading(false);
        setError("작전 명령서 식별값이 없다.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const response = await authFetch(`/api/neo-operation-room/result?attemptId=${encodeURIComponent(attemptId)}`);
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok || !data?.ok) {
          const message = asErrorMessage(data) || (response.status === 401 ? "로그인이 필요하다." : "작전 명령서를 찾지 못했다.");
          setError(message);
          setSession(null);
          return;
        }
        setSession(data as NeoResultSession);
        setSelectedChecks(Array.isArray(data.realityCheck?.selectedChecks) ? data.realityCheck.selectedChecks : []);
        setFreeform(String(data.realityCheck?.freeform || ""));
        setShowRealityForm(!data.refinedOrder);
      } catch {
        if (!cancelled) setError("작전 명령서를 불러오지 못했다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadResult();
    return () => {
      cancelled = true;
    };
  }, [attemptId, localPreviewMode]);

  async function handleRefine() {
    if (!session?.sessionId) return;
    if (!selectedChecks.length && freeform.trim().length < 4) {
      setRefineError("체크 답변을 고르거나 현재 상황을 조금 더 적어라.");
      return;
    }
    if (isLocalPreview) {
      setRefining(true);
      setRefineError("");
      setSession((current) => ({
        ...(current || buildLocalPreviewSession("reality")),
        status: "completed",
        realityCheck: {
          selectedChecks,
          freeform: freeform.trim(),
        },
        refinedOrder: localPreviewRefinedOrder,
        updatedAt: new Date().toISOString(),
      }));
      setShowRealityForm(false);
      setRefining(false);
      return;
    }
    setRefining(true);
    setRefineError("");
    try {
      const response = await authFetch("/api/neo-operation-room/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId,
          selectedChecks,
          freeform: freeform.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        throw new Error(asErrorMessage(data) || "수정 작전 명령서 작성에 실패했다.");
      }
      setSession(data as NeoResultSession);
      setShowRealityForm(false);
    } catch (caught) {
      setRefineError(caught instanceof Error ? caught.message : "수정 작전 명령서 작성에 실패했다.");
    } finally {
      setRefining(false);
    }
  }

  const briefing = session?.initialBriefing || null;
  const refined = session?.refinedOrder || null;
  const isGenerating = loading || session?.status === "generating";
  const isFailed = Boolean(error) || session?.status === "generation_failed";
  const backgroundStyle = {
    "--neo-bg-desktop": `url("${neoWarRoomAssets.backgrounds.desktop.src}")`,
    "--neo-bg-mobile": `url("${neoWarRoomAssets.backgrounds.mobile.src}")`,
  } as CSSProperties;

  return (
    <main className={styles.shell} style={backgroundStyle}>
      <div className={styles.bg} aria-hidden="true" />
      <section className={styles.hero} aria-labelledby="neo-result-title">
        <div className={styles.heroCopy}>
          <span>Operation Order</span>
          <h1 id="neo-result-title">네오의 작전 명령서</h1>
          <p>{isGenerating ? "운명의 작전 지도가 아직 움직이고 있다." : "1차 브리핑과 2차 수정 명령서를 분리해서 보관한다."}</p>
        </div>
        <div className={styles.heroVisual} aria-hidden="true">
          <NeoWarRoomAssetImage
            asset={neoWarRoomAssets.hero.fullbody}
            alt=""
            priority
            sizes="(max-width: 768px) 62vw, 360px"
            className={styles.neoPortrait}
            imageClassName={styles.neoPortraitImage}
          />
          <NeoWarRoomAssetImage asset={neoWarRoomAssets.decor.asset1} alt="" sizes="110px" className={styles.decorOne} imageClassName={styles.decorImage} />
          <NeoWarRoomAssetImage asset={neoWarRoomAssets.decor.asset2} alt="" sizes="110px" className={styles.decorTwo} imageClassName={styles.decorImage} />
        </div>
      </section>

      {localPreviewEnabled ? (
        <nav className={styles.localPreviewBar} aria-label="개발 결과 미리보기">
          <strong>개발 결과 미리보기</strong>
          <Link href="/neo-operation-room/result?neoPreview=loading">로딩</Link>
          <Link href="/neo-operation-room/result?neoPreview=briefing">1차 브리핑</Link>
          <Link href="/neo-operation-room/result?neoPreview=reality">현실 점검</Link>
          <Link href="/neo-operation-room/result?neoPreview=refined">2차 명령서</Link>
        </nav>
      ) : null}

      {isGenerating ? (
        <section className={styles.stateCard} aria-live="polite">
          <NeoWarRoomAssetImage asset={neoWarRoomAssets.badges.grades} alt="" sizes="86px" className={styles.stateSeal} imageClassName={styles.decorImage} />
          <h2>작전 브리핑 생성 중</h2>
          <p>계산과 LLM 작성이 끝나면 이 명령서에 결과가 찍힌다.</p>
        </section>
      ) : null}

      {isFailed ? (
        <section className={styles.stateCard} aria-live="assertive">
          <NeoWarRoomAssetImage asset={neoWarRoomAssets.badges.resultStamp} alt="" sizes="86px" className={styles.stateSeal} imageClassName={styles.decorImage} />
          <h2>작전 명령서 열람 실패</h2>
          <p>{error || session?.generationError?.message || "생성에 실패했다. 입력과 권한을 확인한 뒤 다시 시도해라."}</p>
          <Link href="/neo-operation-room">작전 다시 짜기</Link>
        </section>
      ) : null}

      {!isGenerating && !isFailed && session ? (
        <div className={styles.layout}>
          <aside className={styles.sidePanel}>
            <NeoWarRoomAssetImage
              asset={selectedMethodDefinition.coverAsset}
              alt={`${methodLabel(selectedMethod)} 표지`}
              sizes="280px"
              className={styles.methodCover}
              imageClassName={styles.methodCoverImage}
            />
            <div>
              <span>선택한 술수</span>
              <strong>{methodLabel(selectedMethod)}</strong>
              <p>{selectedMethodDefinition.resultEvidenceLabel}</p>
              <p>{session.topic || "작전 주제 미기록"}</p>
            </div>
            <NeoWarRoomAssetImage asset={neoWarRoomAssets.badges.resultStamp} alt="" sizes="128px" className={styles.sideStamp} imageClassName={styles.decorImage} />
          </aside>

          <section className={styles.documentStack}>
            {briefing ? (
              <InitialBriefingDocument
                briefing={briefing}
                evidenceFallbackLabel={selectedMethodDefinition.resultEvidenceLabel}
                hasRefined={Boolean(refined)}
                onOpenReality={() => setShowRealityForm(true)}
              />
            ) : null}
            {showRealityForm && briefing ? (
              <RealityCheckForm
                selectedChecks={selectedChecks}
                setSelectedChecks={setSelectedChecks}
                freeform={freeform}
                setFreeform={setFreeform}
                refining={refining}
                refineError={refineError}
                onSubmit={handleRefine}
              />
            ) : null}
            {refined ? <RefinedOrderDocument refined={refined} /> : null}
            <CtaDeck attemptId={isLocalPreview ? "" : session.sessionId || attemptId} onOpenReality={() => setShowRealityForm(true)} hasRefined={Boolean(refined)} />
          </section>
        </div>
      ) : null}
    </main>
  );
}

function InitialBriefingDocument({
  briefing,
  evidenceFallbackLabel,
  hasRefined,
  onOpenReality,
}: {
  briefing: NeoBriefing;
  evidenceFallbackLabel: string;
  hasRefined: boolean;
  onOpenReality: () => void;
}) {
  return (
    <article className={styles.documentCard}>
      <header className={styles.documentHeader}>
        <span>1차 작전 브리핑</span>
        <h2>{briefing.operationTitle || "무명 작전"}</h2>
      </header>
      <Section title="네오의 첫 반응" body={briefing.neoOpening} />
      <Section title="현재 운의 핵심 진단" body={briefing.coreDiagnosis} />
      <Section title={briefing.repeatedPattern?.title || "네가 반복하는 패턴"} body={briefing.repeatedPattern?.description} />
      <Section title={briefing.originalStrategy?.title || "본래 너는 이렇게 살아야 한다"} body={briefing.originalStrategy?.description} list={briefing.originalStrategy?.keyRules} />
      <Section title={briefing.currentProblem?.title || "그런데 지금 문제는 이것이다"} body={briefing.currentProblem?.description} />
      {briefing.methodEvidence?.length ? (
        <div className={styles.gridList}>
          {briefing.methodEvidence.map((item) => <Section key={`${item.method}-${item.label}`} title={item.label || evidenceFallbackLabel} body={item.summary} />)}
        </div>
      ) : null}
      <blockquote className={styles.blunt}>{briefing.bluntTruth}</blockquote>
      {briefing.realityCheckQuestions?.length ? (
        <div className={styles.questionList}>
          <strong>현실 점검 질문</strong>
          {briefing.realityCheckQuestions.map((item) => (
            <section key={item.question}>
              <p>{item.question}</p>
              <span>{item.whyItMatters}</span>
            </section>
          ))}
        </div>
      ) : null}
      {!hasRefined ? <button type="button" className={styles.primaryCta} onClick={onOpenReality}>수정 작전 명령서 받기</button> : null}
    </article>
  );
}

function RealityCheckForm({
  selectedChecks,
  setSelectedChecks,
  freeform,
  setFreeform,
  refining,
  refineError,
  onSubmit,
}: {
  selectedChecks: string[];
  setSelectedChecks: (updater: string[] | ((current: string[]) => string[])) => void;
  freeform: string;
  setFreeform: (value: string) => void;
  refining: boolean;
  refineError: string;
  onSubmit: () => void;
}) {
  return (
    <article className={styles.documentCard}>
      <header className={styles.documentHeader}>
        <span>현실 점검</span>
        <h2>네오에게 다시 반박하기</h2>
      </header>
      <div className={styles.choiceGrid}>
        {realityCheckOptions.map((item) => {
          const active = selectedChecks.includes(item);
          return (
            <button
              key={item}
              type="button"
              data-active={active ? "true" : "false"}
              onClick={() => {
                setSelectedChecks((current) => active ? current.filter((entry) => entry !== item) : [...current, item]);
              }}
            >
              {item}
            </button>
          );
        })}
      </div>
      <textarea
        value={freeform}
        maxLength={1000}
        placeholder={"네오에게 반박하거나, 현재 상황을 더 자세히 적어주세요.\n변명도 괜찮습니다. 네오가 알아서 걸러냅니다."}
        onChange={(event) => setFreeform(event.target.value)}
      />
      {refineError ? <p className={styles.errorText}>{refineError}</p> : null}
      <button type="button" className={styles.primaryCta} disabled={refining} onClick={onSubmit}>
        {refining ? "수정 작전 작성 중" : "수정 작전 명령서 받기"}
      </button>
    </article>
  );
}

function RefinedOrderDocument({ refined }: { refined: NeoRefinedOrder }) {
  return (
    <article className={styles.documentCard} data-version="v2">
      <header className={styles.documentHeader}>
        <span>2차 수정 작전 명령서</span>
        <h2>{refined.operationTitle || "수정 작전"}</h2>
      </header>
      <Section title="네오의 재판단" body={refined.neoReview} />
      <Section title={refined.realBottleneck?.title || "진짜 막힌 지점"} body={refined.realBottleneck?.description} />
      <Section title="수정된 진단" body={refined.updatedDiagnosis} />
      <Section title="버려야 할 방식" list={refined.discardThis} />
      <Section title={refined.newLifeStrategy?.title || "새 인생 전략"} body={refined.newLifeStrategy?.description} list={refined.newLifeStrategy?.principles} />
      <Section title={refined.forbiddenAction?.title || "오늘 금지 행동"} body={refined.forbiddenAction?.reason} />
      {refined.sevenDayMission?.length ? (
        <div className={styles.missionGrid}>
          <strong>7일 작전</strong>
          {refined.sevenDayMission.map((item) => (
            <section key={`${item.day}-${item.mission}`}>
              <span>DAY {item.day}</span>
              <p>{item.mission}</p>
            </section>
          ))}
        </div>
      ) : null}
      <Section title="30일 전략" list={refined.thirtyDayStrategy} />
      <div className={styles.badgeBlock}>
        <NeoWarRoomAssetImage asset={neoWarRoomAssets.badges.grades} alt="" sizes="90px" className={styles.badgeImageFrame} imageClassName={styles.decorImage} />
        <div>
          <strong>오늘의 사자 휘장 · {refined.badge?.name || "무명 휘장"}</strong>
          <p>{refined.badge?.description}</p>
        </div>
        <NeoWarRoomAssetImage asset={neoWarRoomAssets.badges.resultStamp} alt="" sizes="104px" className={styles.stampImageFrame} imageClassName={styles.decorImage} />
      </div>
      <blockquote className={styles.blunt}>{refined.tsundereClosing}</blockquote>
    </article>
  );
}

function Section({ title, body, list }: { title: string; body?: string; list?: string[] }) {
  if (!body && !list?.length) return null;
  return (
    <section className={styles.sectionCard}>
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {list?.length ? <ul>{list.map((item) => <li key={item}>{item}</li>)}</ul> : null}
    </section>
  );
}

function CtaDeck({ attemptId, hasRefined, onOpenReality }: { attemptId: string; hasRefined: boolean; onOpenReality: () => void }) {
  return (
    <nav className={styles.ctaDeck} aria-label="작전 명령서 다음 행동">
      <button type="button" onClick={onOpenReality}>{hasRefined ? "네오에게 다시 반박하기" : "수정 작전 명령서 받기"}</button>
      <Link href="/neo-operation-room">작전 다시 짜기</Link>
      <Link href="/neo-operation-room">다른 술수로 다시 분석하기</Link>
      <Link href="/fortune-tea-house">연이의 운명 찻집으로 가기</Link>
      {attemptId ? <Link href={`/neo-operation-room/result?attemptId=${encodeURIComponent(attemptId)}`}>작전 명령서 다시 열기</Link> : null}
    </nav>
  );
}
