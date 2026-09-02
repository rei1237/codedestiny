"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/app/_lib/auth-client";
import { runBillingCoinGate, formatPaymentWon } from "@/app/_lib/billing-client";
import { isRetriableResultPollFailure } from "@/app/_lib/consultationResultPolling";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { NAKSHATRA_RESULT_STORAGE_KEY } from "../NakshatraFormClient";
import { birthFromProfileSeed, type NakshatraBirthInput } from "../nakshatra-birth";
import { useNakshatraCopy, type NakshatraCopy } from "../_lib/copy";
import AiConsultDecks, { type Decks, type NatalIdentity, type TopInsight } from "./AiConsultDecks";

const FEATURE_KEY = "nakshatra-ai-consultation";
const SERVICE_ID = "nakshatra-ai";
const PRICE_KRW = 30000;
const COIN_PRICE = 300;
const ACCESS_TOKEN_HEADER = "x-nakshatra-ai-access-token";
const API = {
  ensureAccess: "/api/nakshatra-ai/ensure-access",
  start: "/api/nakshatra-ai/start",
  generate: "/api/nakshatra-ai/generate",
  result: "/api/nakshatra-ai/result",
};
const POLL_INTERVAL_MS = 3500;
const POLL_MAX_ATTEMPTS = 45;
// 21섹션 ÷ 배치 4 = 6웨이브. 재시도(섹션 하한 미달 시)까지 감안해 넉넉히 잡는다.
const TOTAL_SECTIONS = 21;
const GENERATE_MAX_ATTEMPTS = 24;
const GENERATE_GAP_MS = 400;
// 일시 장애(503 DB_DEGRADED · 세션 리프레시 지연)에만 쓰는 별도 한도.
// 진행 예산(GENERATE_MAX_ATTEMPTS/POLL_MAX_ATTEMPTS)과 섞으면 블립이 웨이브를 잡아먹는다.
// 🔴 회복시키지 않는다 — 회복을 넣으면 최악의 경우 (진행예산 × 블립예산)회까지 돌 수 있다.
const TRANSIENT_MAX_RETRIES = 40;
// 두 카운터와 별개인 벽시계 상한. 카운터만으로는 상한이 곱해져 사실상 무한이 된다.
// 21섹션 6웨이브 + 블립 재시도까지 담고도 사용자를 방치하지 않는 값.
const GENERATION_DEADLINE_MS = 10 * 60 * 1000;

type BirthInput = NakshatraBirthInput;
type Phase = "intro" | "checking" | "payment" | "generating" | "done" | "error";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
function toText(value: unknown): string {
  return value == null ? "" : String(value).trim();
}
function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
function buildIdempotencyKey() {
  const uuid = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `nakai-${uuid}`;
}

async function postJson(path: string, body: Record<string, unknown>, idempotencyKey: string) {
  const response = await authFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ ...body, idempotencyKey }),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { response, data };
}

// runBillingCoinGate 결과 → /start 본문에 실을 결제 컨텍스트(서버 billingContextFromBody가 읽는 필드).
function extractPaymentContext(gate: { data: unknown; raw?: unknown }, requestId: string): Record<string, unknown> {
  const data = asRecord(gate?.data);
  const consume = asRecord(data.consume);
  const accessGrant = asRecord(data.accessGateResult || data.licensePass || data.membershipPass);
  const accessMethod = toText(consume.accessMethod || consume.paymentMethod || accessGrant.accessMethod || accessGrant.paymentMethod);
  const transactionId = toText(consume.transactionId || accessGrant.transactionId);
  const ledgerId = toText(consume.ledgerId || accessGrant.ledgerId);
  const paymentId = toText(
    consume.transactionId || consume.purchaseId || accessGrant.transactionId || accessGrant.purchaseId || data.executionId || requestId,
  );
  return {
    paymentId,
    payment: { paymentId, requestId },
    accessGrant,
    consume,
    accessType: toText(consume.accessType || accessGrant.accessType),
    accessMethod,
    paymentMode: accessMethod,
    transactionId,
    ledgerId,
    executionId: toText(data.executionId),
    featureKey: FEATURE_KEY,
    billingGate: data,
    requestId,
  };
}

export default function NakshatraAiClient() {
  const copy = useNakshatraCopy();
  const [birth, setBirth] = useState<BirthInput | null>(null);
  const [identity, setIdentity] = useState<NatalIdentity | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<Phase>("intro");
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [decks, setDecks] = useState<Decks | null>(null);
  const [topInsights, setTopInsights] = useState<TopInsight[]>([]);
  const [totalChars, setTotalChars] = useState(0);
  const [progress, setProgress] = useState({ completed: 0, total: TOTAL_SECTIONS, phase: "decks" });
  const [askedQuestion, setAskedQuestion] = useState("");
  const busyRef = useRef(false);
  const exportRootRef = useRef<HTMLDivElement | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const { seed: profileSeed } = useAiProfileSeed();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(NAKSHATRA_RESULT_STORAGE_KEY);
      if (raw) {
        const parsed = asRecord(JSON.parse(raw));
        const input = asRecord(parsed.input);
        if (Number(input.year) && Number(input.month) && Number(input.day)) {
          setBirth({
            year: Number(input.year), month: Number(input.month), day: Number(input.day),
            hour: Number(input.hour ?? 12), minute: Number(input.minute ?? 0),
            timezone: Number(input.timezone ?? 9), lat: Number(input.lat ?? 37.5665), lon: Number(input.lon ?? 126.978),
            timeUnknown: Boolean(input.timeUnknown),
          });
          const dongyang = asRecord(parsed.dongyang);
          const india = asRecord(parsed.india);
          const summary = asRecord(parsed.summary);
          setIdentity({
            sukuyoKo: toText(dongyang.nameKo), sukuyoHan: toText(dongyang.nameHan),
            nakshatraKo: toText(india.nameKo || summary.nakshatraKo), nakshatraEn: toText(india.nameEn || summary.nakshatraEn),
          });
        }
      }
    } catch {
      // sessionStorage 불가 — 아래 프로필 카드 시드 또는 계산 유도로 이어진다.
    }
    setLoaded(true);
  }, []);

  // 프로필 카드 프리필(공용 훅) — 세션에 명식이 없을 때만 채우고, 이미 있으면 덮어쓰지 않는다.
  useEffect(() => {
    if (birth) return;
    const derived = birthFromProfileSeed(profileSeed);
    if (derived) setBirth(derived);
  }, [birth, profileSeed]);

  const finish = useCallback((session: Record<string, unknown>) => {
    const nextDecks = asRecord(session.decks);
    setDecks({
      sukuyo: Array.isArray(nextDecks.sukuyo) ? (nextDecks.sukuyo as Decks["sukuyo"]) : [],
      vedic: Array.isArray(nextDecks.vedic) ? (nextDecks.vedic as Decks["vedic"]) : [],
      fusion: Array.isArray(nextDecks.fusion) ? (nextDecks.fusion as Decks["fusion"]) : [],
    });
    setTopInsights(Array.isArray(session.topInsights) ? (session.topInsights as TopInsight[]) : []);
    setTotalChars(Number(session.totalCharCount) || 0);
    const natal = asRecord(session.natal);
    if (natal.sukuyoKo || natal.nakshatraKo) {
      setIdentity({ sukuyoKo: toText(natal.sukuyoKo), sukuyoHan: toText(natal.sukuyoHan), nakshatraKo: toText(natal.nakshatraKo), nakshatraEn: toText(natal.nakshatraEn) });
    }
    setPhase("done");
    busyRef.current = false;
  }, []);

  const fail = useCallback((message: string) => {
    setErrorMsg(message);
    setPhase("error");
    busyRef.current = false;
  }, []);

  const applyProgress = useCallback((data: Record<string, unknown>) => {
    const next = asRecord(data.progress);
    if (!Number(next.total)) return;
    setProgress({
      completed: Number(next.completed) || 0,
      total: Number(next.total) || TOTAL_SECTIONS,
      phase: toText(next.phase) || "decks",
    });
  }, []);

  // 연결이 끊겨 /generate 를 이어 부르지 못한 경우의 폴백. 서버가 락으로 이어 굽고 있을 수 있다.
  const pollResult = useCallback(async (resultId: string, accessToken: string) => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (accessToken) headers[ACCESS_TOKEN_HEADER] = accessToken;
    // 일시 장애는 폴링 예산을 먹지 않는다(아래 driveGeneration 과 같은 이유).
    let transientLeft = TRANSIENT_MAX_RETRIES;
    let attempt = 0;
    const deadline = Date.now() + GENERATION_DEADLINE_MS;
    while (attempt < POLL_MAX_ATTEMPTS && Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      let res: Response;
      try {
        res = await authFetch(`${API.result}?attemptId=${encodeURIComponent(resultId)}`, { headers });
      } catch {
        // 네트워크 단절도 일시 장애다.
        if (transientLeft <= 0) break;
        transientLeft -= 1;
        continue;
      }
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      applyProgress(data);
      if (res.status === 200 && data.ok && data.decks) { finish(data); return; }
      if (isRetriableResultPollFailure(res.status, data)) {
        if (transientLeft <= 0) break;
        transientLeft -= 1;
        continue;
      }
      attempt += 1;
      if (res.status === 202 || res.status === 404) continue;
      if (res.status === 409) { fail(toText(data.message) || copy.aiErrorConflict); return; }
    }
    fail(copy.aiErrorTimeout);
  }, [finish, fail, applyProgress, copy]);

  // 21섹션은 한 요청에 다 굽지 못한다(엣지 100초 컷). 서버가 한 번에 4섹션씩 굽고 진행률을 돌려주므로
  // 완료될 때까지 /generate 를 이어 부른다. 진행 위치의 정본은 서버다 — 여기서 인덱스를 보내지 않는다.
  const driveGeneration = useCallback(async (sessionId: string, idempotencyKey: string, accessToken: string) => {
    // 🔴 일시 장애는 "진행"이 아니므로 웨이브 예산을 먹으면 안 된다. 블립이 조금만 길어도
    //    24회를 503으로 다 써 버려 21섹션을 끝내지 못하고 죽었다. 별도 한도로 센다.
    let transientLeft = TRANSIENT_MAX_RETRIES;
    const deadline = Date.now() + GENERATION_DEADLINE_MS;
    for (let attempt = 0; attempt < GENERATE_MAX_ATTEMPTS && Date.now() < deadline; ) {
      const step = await postJson(API.generate, { sessionId, idempotencyKey }, idempotencyKey).catch(() => null);
      if (!step) { await pollResult(sessionId, accessToken); return; }
      const { response, data } = step;
      applyProgress(data);
      if (data.ok && data.decks) { finish(data); return; }
      if (isRetriableResultPollFailure(response.status, data)) {
        if (transientLeft <= 0) { await pollResult(sessionId, accessToken); return; }
        transientLeft -= 1;
        await sleep(POLL_INTERVAL_MS);
        continue;
      }
      attempt += 1;
      if (response.status === 202) { await sleep(GENERATE_GAP_MS); continue; }
      if (response.status === 401 || data.reason === "LOGIN_REQUIRED") { fail(copy.aiErrorLoginRequired); return; }
      if (response.status === 409 || response.status === 404) { await pollResult(sessionId, accessToken); return; }
      fail(toText(data.message) || copy.aiErrorConflict);
      return;
    }
    fail(copy.aiErrorTimeout);
  }, [finish, fail, pollResult, applyProgress, copy]);

  const startConsult = useCallback(async (payload: Record<string, unknown>, access: Record<string, unknown>) => {
    setPhase("generating");
    setStatusMsg(copy.aiStatusGenerating);
    const accessToken = toText(access.accessToken);
    const idempotencyKey = toText(payload.idempotencyKey);
    const started = await postJson(API.start, { ...payload, ...access }, idempotencyKey).catch(() => null);
    if (!started) { await pollResult(idempotencyKey, accessToken); return; }
    const { response, data } = started;
    applyProgress(data);
    if (data.ok && data.decks) { finish(data); return; }
    if (response.status === 202) {
      await driveGeneration(toText(data.sessionId) || idempotencyKey, idempotencyKey, accessToken);
      return;
    }
    if (response.status === 401 || data.reason === "LOGIN_REQUIRED") { fail(copy.aiErrorLoginRequired); return; }
    // 🔴 /start 가 일시 장애(503 DB_DEGRADED 등)면 여기서 죽이지 않는다 — 이 분기가 없어서
    //    Mongo 블립 중에 시작하면 "상담문 생성에 실패했어요"로 즉시 끝나 생성 자체가 안 됐다.
    //    서버가 세션을 이미 만들었을 수도 있으므로 폴링으로 넘겨 자가 복구시킨다.
    if (isRetriableResultPollFailure(response.status, data)) {
      setStatusMsg(copy.aiStatusReconnecting);
      await pollResult(idempotencyKey, accessToken);
      return;
    }
    fail(toText(data.message) || copy.aiErrorGeneric);
  }, [finish, fail, pollResult, driveGeneration, applyProgress, copy]);

  const beginConsultation = useCallback(async () => {
    if (!birth || busyRef.current) return;
    busyRef.current = true;
    setErrorMsg("");
    const idempotencyKey = buildIdempotencyKey();
    const trimmedQuestion = question.trim();
    setAskedQuestion(trimmedQuestion);
    const payload: Record<string, unknown> = { ...birth, question: trimmedQuestion, idempotencyKey };
    setPhase("checking");
    setStatusMsg(copy.aiStatusChecking);
    try {
      const ensure = await postJson(API.ensureAccess, payload, idempotencyKey);
      if (ensure.data.ok) {
        const existing = asRecord(ensure.data.consultation);
        if (existing.decks) { finish(existing); return; }
        await startConsult(payload, { accessToken: toText(ensure.data.accessToken) });
        return;
      }
      if (ensure.response.status === 401 || ensure.data.reason === "LOGIN_REQUIRED") { fail(copy.aiErrorLoginRequired); return; }
      if (ensure.data.reason !== "PAYMENT_REQUIRED") { fail(toText(ensure.data.message) || copy.aiErrorGenericShort); return; }

      setPhase("payment");
      setStatusMsg(copy.aiStatusPaymentChecking);
      const paymentPayload = asRecord(ensure.data.paymentPayload);
      const runtimeGate = asRecord(paymentPayload.runtimeGate);
      const gate = await runBillingCoinGate({
        ...runtimeGate,
        featureKey: FEATURE_KEY,
        categoryKey: toText(runtimeGate.categoryKey || paymentPayload.categoryKey || "premium-consultation"),
        subFeatureKey: toText(runtimeGate.subFeatureKey || paymentPayload.subFeatureKey || FEATURE_KEY),
        reason: copy.aiFeatureTitle,
        requestId: idempotencyKey,
        idempotencyKey,
        cost: COIN_PRICE,
        coinPrice: COIN_PRICE,
        amountKRW: PRICE_KRW,
        amountKrw: PRICE_KRW,
        paymentAmount: PRICE_KRW,
        priceKRW: PRICE_KRW,
        productId: SERVICE_ID,
        productType: SERVICE_ID,
        serviceType: FEATURE_KEY,
      });
      if (!gate.ok || !gate.data) {
        const code = toText(gate.error?.code).toUpperCase();
        if (code === "PAYMENT_CANCELLED" || code === "USER_CANCELLED") { setPhase("intro"); busyRef.current = false; return; }
        fail(gate.status === 401 || code === "AUTH_REQUIRED" ? copy.aiErrorLoginRequired : copy.aiErrorPaymentOrPassFailed);
        return;
      }
      await startConsult(payload, extractPaymentContext(gate, idempotencyKey));
    } catch {
      fail(copy.aiErrorNetwork);
    }
  }, [birth, question, finish, fail, startConsult, copy]);

  // PDF 저장 — 이미 결제로 열린 결과의 무료 부가 기능(가격·결제 문구 금지).
  // 접힌 <details> 는 빈 캔버스가 되므로 강제 오픈 → 2×rAF+120ms 렌더 대기 → 캡처 → 이전 상태 복원.
  // data-export 는 consult-decks.module.css 의 캡처용 스위치(sticky 요약·backdrop-filter 해제).
  const savePdf = useCallback(async () => {
    const root = exportRootRef.current;
    if (!root || pdfBusy) return;
    setPdfBusy(true);
    setPdfError("");
    root.setAttribute("data-export", "true");
    const detailsElements = Array.from(root.querySelectorAll("details"));
    const previousOpenStates = detailsElements.map((details) => details.open);
    try {
      detailsElements.forEach((details) => { details.open = true; });
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await sleep(120);
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      const subtitle = [identity?.sukuyoHan ? identity.sukuyoHan + "宿" : "", toText(identity?.nakshatraKo)].filter(Boolean).join(" · ");
      await exportResultPdf({
        captureTargets: ["[data-nakai-pdf-section]"],
        fileName: copy.aiPdfFileName(toText(identity?.sukuyoKo), toText(identity?.nakshatraKo)),
        backgroundColor: "#0a0818",
        cover: { title: copy.aiFeatureTitle, subtitle, date: new Date().toISOString().slice(0, 10) },
      });
    } catch {
      setPdfError(copy.aiPdfFailMessage);
    } finally {
      detailsElements.forEach((details, index) => { details.open = previousOpenStates[index] ?? details.open; });
      root.removeAttribute("data-export");
      setPdfBusy(false);
    }
  }, [pdfBusy, identity, copy]);

  const bgClass =
    "relative isolate min-h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_18%_8%,rgba(179,25,85,0.14),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(212,175,55,0.12),transparent_36%),linear-gradient(160deg,#0a0818_0%,#12102a_55%,#070510_100%)] px-4 py-8 text-slate-100 md:py-12";

  if (!loaded) return <main className="min-h-[100dvh] bg-[#070812]" aria-busy="true" />;

  if (!birth) {
    return (
      <main className={`grid place-items-center ${bgClass}`}>
        <div className="max-w-sm text-center motion-safe:animate-fade-in-up">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(232,213,163,0.32),rgba(20,16,42,0.5)_70%)] shadow-moon-glow" aria-hidden="true">
            <span className="text-2xl text-amber-100">✶</span>
          </div>
          <p className="text-lg font-bold text-slate-50">{copy.aiNeedBirthTitle}</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {copy.aiNeedBirthText}
          </p>
          <Link href="/nakshatra/calc" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-200 px-5 text-sm font-bold text-slate-950 outline-none transition hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0818]">
            {copy.aiNeedBirthButton}
          </Link>
        </div>
      </main>
    );
  }

  if (phase === "done" && decks) {
    return (
      <main className={bgClass}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" />
        <div ref={exportRootRef}>
          <AiConsultDecks
            decks={decks}
            natal={identity}
            question={askedQuestion}
            topInsights={topInsights}
            totalChars={totalChars}
          />
          {/* PDF 버튼 행 — 마커가 없어 캡처에 실리지 않는다. 무료 부가 기능이라 가격·결제 문구 금지. */}
          <div className="mx-auto mt-2 flex max-w-[1180px] flex-col items-center gap-3 px-5 pb-16">
            <button
              type="button"
              onClick={savePdf}
              disabled={pdfBusy}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-200/40 px-6 text-sm font-bold text-amber-100 outline-none transition hover:border-amber-200/70 hover:bg-amber-200/10 focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0818] disabled:cursor-wait disabled:opacity-60"
            >
              {pdfBusy ? copy.aiPdfSavingButton : copy.aiPdfSaveButton}
            </button>
            {pdfError ? <p role="alert" className="text-sm text-rose-300">{pdfError}</p> : null}
          </div>
        </div>
      </main>
    );
  }

  const working = phase === "checking" || phase === "payment" || phase === "generating";

  return (
    <main className={`grid place-items-center ${bgClass}`}>
      {working ? (
        <WaitingView phase={phase} statusMsg={statusMsg} identity={identity} progress={progress} copy={copy} />
      ) : (
        <IntroView
          identity={identity}
          birth={birth}
          question={question}
          onQuestion={setQuestion}
          onStart={beginConsultation}
          errorMsg={phase === "error" ? errorMsg : ""}
          copy={copy}
        />
      )}
    </main>
  );
}

function IntroView({
  identity, birth, question, onQuestion, onStart, errorMsg, copy,
}: {
  identity: NatalIdentity | null;
  birth: BirthInput;
  question: string;
  onQuestion: (value: string) => void;
  onStart: () => void;
  errorMsg: string;
  copy: NakshatraCopy;
}) {
  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-amber-200/20 bg-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] motion-safe:animate-fade-in-up md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100/70">{copy.aiIntroEyebrow}</p>
      <h1 className="mt-3 text-balance break-keep text-2xl font-bold leading-tight text-slate-50 md:text-3xl">{copy.aiIntroTitle}</h1>
      <p className="mt-3 break-keep text-sm leading-7 text-slate-200">
        {identity?.sukuyoHan ? <><span className="font-semibold text-blue-100">{identity.sukuyoHan}宿</span> · </> : null}
        {identity?.nakshatraKo ? <span className="font-semibold text-amber-100">{identity.nakshatraKo}</span> : <span>{copy.aiIntroDefaultNatal}</span>}
        {copy.aiIntroBodySuffix}
      </p>

      <label htmlFor="nakai-q" className="mt-6 block text-xs font-semibold tracking-wide text-amber-100/80">{copy.aiQuestionLabel} <span className="font-normal text-slate-400">{copy.aiQuestionOptionalHint}</span></label>
      <textarea
        id="nakai-q"
        value={question}
        onChange={(e) => onQuestion(e.target.value.slice(0, 1000))}
        rows={3}
        placeholder={copy.aiQuestionPlaceholder}
        className="mt-2 w-full resize-none rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-3 text-sm leading-7 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-amber-200/60 focus:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-amber-200/40"
      />

      <p className="mt-3 text-xs leading-6 text-slate-400">
        {copy.aiBaseChartPrefix}{birth.year}-{String(birth.month).padStart(2, "0")}-{String(birth.day).padStart(2, "0")}
        {birth.timeUnknown ? copy.aiTimeUnknownSuffix : ` ${String(birth.hour).padStart(2, "0")}:${String(birth.minute).padStart(2, "0")}`}
      </p>

      {errorMsg ? (
        <p role="alert" className="mt-4 rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm leading-7 text-rose-100">{errorMsg}</p>
      ) : null}

      <button
        type="button"
        onClick={onStart}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-200 px-5 text-sm font-bold text-slate-950 shadow-[0_16px_44px_rgba(251,191,36,0.22)] outline-none transition-all duration-200 ease-out hover:bg-amber-100 hover:shadow-moon-glow focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0818] active:scale-[0.99]"
      >
        {copy.aiSubmitButtonPrefix}{formatPaymentWon(PRICE_KRW)}
      </button>
      <p className="mt-3 text-center text-xs leading-6 text-slate-400">{copy.aiHasPassNote}</p>
    </div>
  );
}

// 진행 인디케이터의 4단계. 서버 generationProgress(completed/total/phase)에 실제로 물려 있다 —
// 시간만 흐르는 가짜 진행바를 쓰지 않는다.

function resolveStepIndex(progress: { completed: number; total: number; phase: string }) {
  if (progress.phase === "done") return 3;
  if (progress.phase === "fusion") return progress.completed >= progress.total - 1 ? 3 : 2;
  // 덱 페이즈: 베다 6편이 먼저 끝나야 숙요 쪽으로 넘어간 것으로 본다(11편 중 6편 기준).
  return progress.completed >= 6 ? 1 : 0;
}

function WaitingView({
  phase, statusMsg, identity, progress, copy,
}: {
  phase: Phase;
  statusMsg: string;
  identity: NatalIdentity | null;
  progress: { completed: number; total: number; phase: string };
  copy: NakshatraCopy;
}) {
  const generating = phase === "generating";
  const headline = phase === "payment" ? copy.aiHeadlinePayment : phase === "checking" ? copy.aiHeadlineChecking : copy.aiHeadlineGenerating;
  const stepIndex = resolveStepIndex(progress);
  const ratio = progress.total > 0 ? Math.min(1, progress.completed / progress.total) : 0;
  return (
    <div className="mx-auto w-full max-w-md text-center motion-safe:animate-fade-in-up">
      {/* Moon Glow 오브 — 두 대가가 별을 읽는 신비로운 대기(달빛 골드+바이올렛 글로우) */}
      <div className="relative mx-auto grid h-36 w-36 place-items-center">
        <span className="absolute left-2 top-3 text-sm text-amber-100/70 motion-safe:animate-twinkle" aria-hidden="true">✧</span>
        <span className="absolute right-4 top-9 text-xs text-blue-100/70 [animation-delay:1.4s] motion-safe:animate-twinkle" aria-hidden="true">✦</span>
        <span className="absolute bottom-6 left-7 text-xs text-amber-100/60 [animation-delay:2.6s] motion-safe:animate-twinkle" aria-hidden="true">✧</span>
        <div className="absolute inset-0 rounded-full border border-amber-200/20 motion-safe:animate-spin-slow" />
        <div className="absolute inset-4 rounded-full border border-blue-200/20 motion-safe:animate-spin-reverse" />
        <div className="grid h-20 w-20 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(232,213,163,0.38),rgba(20,16,42,0.55)_70%)] shadow-moon-glow motion-safe:animate-float">
          {generating ? (
            <span className="flex items-center gap-1 text-2xl" aria-hidden="true">
              <span className="text-blue-100">☯</span>
              <span className="text-amber-100">🕉</span>
            </span>
          ) : (
            <span className="text-3xl text-amber-100" aria-hidden="true">✶</span>
          )}
        </div>
      </div>
      <p className="mt-8 text-balance break-keep text-base font-bold text-slate-50">{headline}</p>
      <p className="mt-2 break-keep text-sm leading-7 text-slate-300" aria-live="polite">{statusMsg || copy.aiWaitingDefaultText}</p>
      {identity?.nakshatraKo ? (
        <p className="mt-4 text-xs text-slate-400">
          {identity.sukuyoHan ? `${identity.sukuyoHan}宿 · ` : ""}{identity.nakshatraKo}
        </p>
      ) : null}
      {generating ? (
        <div className="mt-7">
          <ol className="flex items-center justify-center gap-1.5" aria-label={copy.aiProgressAriaLabel}>
            {copy.aiStepLabels.map((label, index) => {
              const state = index < stepIndex ? "done" : index === stepIndex ? "current" : "todo";
              return (
                <li
                  key={label}
                  aria-current={state === "current" ? "step" : undefined}
                  className={`min-w-0 flex-1 rounded-lg border px-1.5 py-2 text-[11px] font-semibold leading-tight transition-colors duration-300 ${
                    state === "done"
                      ? "border-amber-200/40 bg-amber-200/10 text-amber-100"
                      : state === "current"
                        ? "border-amber-200/70 bg-amber-200/20 text-amber-50"
                        : "border-white/10 bg-white/[0.03] text-slate-300"
                  }`}
                >
                  {label}
                </li>
              );
            })}
          </ol>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10" role="presentation">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-200 to-amber-200 transition-[width] duration-500 ease-out"
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>
          <p className="mt-3 break-keep text-xs leading-6 text-slate-300" aria-live="polite">
            {progress.completed > 0
              ? copy.aiProgressText(progress.total, progress.completed)
              : copy.aiProgressDefaultText}
          </p>
        </div>
      ) : null}
    </div>
  );
}
