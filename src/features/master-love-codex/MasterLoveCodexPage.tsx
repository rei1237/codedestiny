"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  마스터 인연의 서  (MASTER_LOVE_CODEX)  —  몰입형 오케스트레이터
 * ───────────────────────────────────────────────────────────────────────────
 *  landing → prologue(무료) → birthGate → [결제 게이트] → generating(배치) → reader
 *
 *  결제 순서(정책): 이용권 선검사(ensure-access) → 미커버 시에만 결제창(단건/월정석 동등).
 *  결제창을 직접 열거나 PortOne 을 직접 부르지 않는다 — 공용 게이트만 사용한다.
 *  생성은 4장씩 배치로 나눠 호출한다(엣지 100초 컷 회피). 세션은 서버에 영구 저장되어
 *  같은 결제 건은 재결제 없이 /master-love-codex/result 에서 다시 열람할 수 있다.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/app/_lib/auth-client";
import { usePaidResume, packPaidResumeArg, unpackPaidResumeArg, type PaidResumeArgs, type PaidResumeGrant } from "@/app/hooks/usePaidResume";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  holdPaidFeatureGateOpen,
  releasePaidFeatureGate,
  runBillingCoinGate,
  primePaymentEligibility,
} from "@/app/_lib/billing-client";
import { PriceBadge } from "@/app/components/PriceBadge";
import CodexAmbience from "./components/CodexAmbience";
import CodexLanding from "./components/CodexLanding";
import CodexPrologueScene from "./components/CodexPrologueScene";
import CodexBirthGate, { EMPTY_CODEX_BIRTH, EMPTY_CODEX_PARTNER, type CodexBirthInput } from "./components/CodexBirthGate";
import CodexFloatingCta from "./components/CodexFloatingCta";
import CodexGenerating from "./components/CodexGenerating";
import CodexShell from "./components/CodexShell";
import type { CodexChapter } from "./components/CodexReader";
import { masterLoveCodexBgmTracks } from "./data/assets";
import { codexPrologueStageOrder, type CodexPrologueChoiceKey, type CodexPrologueStage } from "./data/prologue";
import {
  MASTER_LOVE_CODEX_PROLOGUE_SEEN_KEY,
  MASTER_LOVE_CODEX_TOTAL_CHAPTERS,
  masterLoveCodexBilling,
  type MasterLoveCodexMode,
} from "./constants";
import { getMasterLoveCodexCopy, useMasterLoveCodexLocale, type MasterLoveCodexErrorText } from "./_lib/copy";
// 🔴 배치 루프·postJson·mapError 의 정본은 이 모듈 하나다. 결과 페이지가 같은 함수를 import 해
//    이어쓰기 주체가 된다 — 여기에 사본을 다시 만들지 않는다.
import {
  runCodexBatches,
  postCodexJson as postJson,
  mapCodexError as mapError,
  type CodexSessionPayload,
} from "./_lib/runCodexBatches";
import codexStyles from "./styles/codex.module.css";

// 읽기(reader)는 이 라우트에 없다 — 생성이 끝나면 /master-love-codex/result 로 넘긴다.
type Phase = "landing" | "prologue" | "birth" | "checking" | "payment" | "generating";

// 결제 후 자동 재개 종류. SKU(개인/궁합)가 갈려도 복귀 경로는 하나라 featureKey 가 아니라 고정 문자열이다.
const MASTER_LOVE_CODEX_RESUME_KIND = "master-love-codex";

type SessionPayload = CodexSessionPayload;
/** /session 원문을 폼에 되붓는 자리에서만 쓰는 좁힌 형태 — 배치 루프는 이 구체 타입을 몰라도 된다. */
type RestorableSessionPayload = CodexSessionPayload & {
  birthInfo?: Partial<CodexBirthInput> | null;
  partnerInfo?: CodexBirthInput["partner"];
};

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `mlc-${crypto.randomUUID()}`;
  return `mlc-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
function toText(value: unknown) { return String(value || "").trim(); }
function toNumber(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function runtimePayload(result: unknown) {
  const record = asRecord(result);
  const payload = asRecord(record.payload);
  const data = asRecord(record.data);
  return Object.keys(payload).length ? payload : (Object.keys(data).length ? data : record);
}

function isPaymentGranted(result: unknown) {
  const record = asRecord(result);
  const payload = runtimePayload(result);
  const status = toText(record.status || payload.status || payload.paymentStatus).toLowerCase();
  const denied = new Set(["error", "failed", "failure", "payment_required", "cancelled", "canceled"]);
  if (record.ok === false || payload.ok === false || denied.has(status)) return false;
  if (["granted", "paid", "success", "succeeded", "confirmed", "complete", "completed", "approved"].includes(status)) return true;
  return Boolean(
    record.transactionId || record.paymentId || record.purchaseId
    || payload.transactionId || payload.paymentId || payload.purchaseId
    || Object.keys(asRecord(payload.accessGrant)).length
    || Object.keys(asRecord(payload.consume)).length,
  );
}

function extractPayment(result: unknown, fallbackRequestId: string) {
  const record = asRecord(result);
  const payload = runtimePayload(result);
  const payment = asRecord(payload.payment);
  const accessGrant = asRecord(payload.accessGrant);
  const consume = asRecord(payload.consume);
  const transactionId = toText(record.transactionId || payload.transactionId || accessGrant.transactionId || consume.transactionId);
  const purchaseId = toText(record.purchaseId || payload.purchaseId || accessGrant.purchaseId || consume.purchaseId);
  const ledgerId = toText(record.ledgerId || payload.ledgerId || accessGrant.ledgerId || consume.ledgerId);
  const paymentId = toText(
    record.paymentId || transactionId || purchaseId || payload.paymentId
    || payment.paymentId || payment.impUid || payment.merchantUid || accessGrant.paymentId || ledgerId || fallbackRequestId,
  );
  return {
    paymentId, transactionId, purchaseId, ledgerId, requestId: fallbackRequestId,
    billingEvidence: { ...payload, paymentId, transactionId, purchaseId, ledgerId, payment: { ...payment, paymentId, requestId: fallbackRequestId }, accessGrant, consume },
    accessGrant,
    consume,
  };
}

/**
 * 서버가 준 paymentPayload 를 공용 게이트 입력으로 바꾼다.
 * paymentMode 를 절대 강제하지 않는다 — 결제수단 판정은 게이트가 서버 결정으로 스스로 한다.
 */
function buildBillingGateInput(
  paymentPayload: Record<string, unknown>,
  idempotencyKey: string,
  billing = masterLoveCodexBilling("solo"),
) {
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  const cost = toNumber(runtimeGate.cost ?? runtimeGate.coinPrice ?? paymentPayload.cost ?? paymentPayload.coinPrice, billing.cost);
  const amountKRW = toNumber(
    runtimeGate.amountKRW ?? runtimeGate.amountKrw ?? paymentPayload.amountKRW ?? paymentPayload.amountKrw ?? paymentPayload.paymentAmount,
    billing.amountKRW,
  );
  return {
    categoryKey: toText(runtimeGate.categoryKey ?? paymentPayload.categoryKey) || "premium-consultation",
    subFeatureKey: toText(runtimeGate.subFeatureKey ?? paymentPayload.subFeatureKey) || billing.featureKey,
    featureKey: toText(runtimeGate.featureKey ?? paymentPayload.featureKey) || billing.featureKey,
    reason: toText(runtimeGate.reason ?? paymentPayload.reason) || billing.title,
    productId: toText(runtimeGate.productId ?? paymentPayload.productId) || billing.featureKey,
    productType: toText(runtimeGate.productType ?? paymentPayload.productType) || billing.featureKey,
    serviceType: toText(runtimeGate.serviceType ?? paymentPayload.serviceType) || billing.featureKey,
    // 🔴 회당 결제(per_use)라 반드시 true 다. false 면 공용 게이트의 결제창 오픈 분기가 전부 막혀
    //    (billing-client.ts 의 runPaidServiceRuntimePayment 즉시 null · shouldShowPayment ·
    //     선제 오픈 · 402 후 폴백 오픈) 이용권 미보유 사용자는 결제창을 **한 번도 못 보고**
    //    PAYMENT_VERIFY_FAILED 만 받는다 = 상품을 살 방법이 없다.
    //    이용권이 커버하면 게이트가 스스로 forceDeduct 를 false 로 낮춰 차감하지 않는다.
    requestId: idempotencyKey,
    idempotencyKey,
    cost,
    coinPrice: cost,
    amountKRW,
    amountKrw: amountKRW,
    paymentAmount: amountKRW,
    membershipCreditCost: toNumber(runtimeGate.membershipCreditCost ?? paymentPayload.membershipCreditCost, cost * 10),
  };
}

export default function MasterLoveCodexPage() {
  const router = useRouter();
  const locale = useMasterLoveCodexLocale();
  const copy = getMasterLoveCodexCopy(locale);
  const errorText = copy.errorText;
  const [phase, setPhase] = useState<Phase>("landing");
  const [prologueStage, setPrologueStage] = useState<CodexPrologueStage>(codexPrologueStageOrder[0]);
  const [hasSeenPrologue, setHasSeenPrologue] = useState(false);
  const [prologueChoice, setPrologueChoice] = useState<CodexPrologueChoiceKey | "">("");
  const [birth, setBirth] = useState<CodexBirthInput>(EMPTY_CODEX_BIRTH);
  // 상대 생년월일이 채워진 순간부터 궁합 SKU 다 — 금액 배지가 즉시 이 값을 따른다.
  const activeMode: MasterLoveCodexMode = birth.partner?.birthDate ? "compat" : "solo";
  const activeBilling = masterLoveCodexBilling(activeMode, locale);
  const [error, setError] = useState("");
  const [chapters, setChapters] = useState<CodexChapter[]>([]);
  // 이용권/월정석으로 통과했는지 — 진행 화면 배지가 금액 대신 그 사실을 말하게 한다
  // (결제하지 않은 금액을 청구받은 것처럼 보이면 안 된다).
  const [accessType, setAccessType] = useState("");
  const busyRef = useRef(false);
  const idempotencyRef = useRef("");
  // 결제 후 생성이 끊겼을 때 catch 에서 즉시 읽어야 하므로 state 가 아니라 ref 로 들고 있는다
  // (setSessionId 직후의 클로저는 아직 빈 문자열이라 세션을 잃어버린다).
  const sessionIdRef = useRef("");
  // 이번 시도에서 실제로 결제가 완료됐는지. 완료됐다면 idempotencyKey 를 절대 버리지 않는다
  // (ensure-access 는 결제 이력을 보지 않으므로 새 키로 재시도하면 그대로 두 번 결제된다).
  const chargedRef = useRef(false);
  const pendingResumeRef = useRef<{ args: PaidResumeArgs; grant: PaidResumeGrant | null } | null>(null);
  // 생성 단계에 들어섰는지. 여기부터의 실패는 이용권/결제 실패가 아니므로 결제 게이트 모달을
  // 다시 열면 안 된다("확인 실패"라는 거짓 제목이 그렇게 붙었다).
  const generationStartedRef = useRef(false);
  // 생성만 재시도할 때 필요한 최신 토큰·세션 스냅샷(결제 왕복을 다시 타지 않기 위해).
  const lastTokenRef = useRef("");
  const lastSessionRef = useRef<SessionPayload>({});
  // 결과 페이지로 이어쓰기를 넘겼는지. 넘긴 뒤에는 이 화면의 배치 루프가 더 돌면 안 된다.
  const handedOffRef = useRef(false);
  const [generationError, setGenerationError] = useState("");
  const [storedSessions, setStoredSessions] = useState<Array<{ sessionId: string; mode: MasterLoveCodexMode; status: string }>>([]);
  type RecoverablePurchase = { orderId: string; featureKey: string; requestId: string; status: string };
  const [storedPurchases, setStoredPurchases] = useState<RecoverablePurchase[]>([]);
  const recoveredPurchaseRef = useRef<RecoverablePurchase | null>(null);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    let active = true;
    let generation = 0;
    const loadHistory = () => {
      const current = ++generation;
      void authFetch("/api/master-love-codex/sessions", { cache: "no-store" })
        .then(async response => {
          if (!response.ok) return;
          const data = await response.json();
          if (active && current === generation && Array.isArray(data.sessions)) setStoredSessions(data.sessions);
        }).catch(() => { /* Existing purchase is checked again on explicit recovery. */ });
      void authFetch("/api/payments/recoveries?featureKeys=master-love-codex,master-love-codex-compat", { cache: "no-store" })
        .then(async response => {
          if (!response.ok) return;
          const data = await response.json();
          if (active && current === generation && Array.isArray(data.orders)) setStoredPurchases(data.orders);
        }).catch(() => { /* Never turn a failed history request into an unpaid verdict. */ });
    };
    const onAuthChanged = () => {
      setStoredSessions([]);
      setStoredPurchases([]);
      if (!busyRef.current) {
        recoveredPurchaseRef.current = null;
        chargedRef.current = false;
      }
      loadHistory();
    };
    loadHistory();
    window.addEventListener("cd:auth-changed", onAuthChanged);
    return () => { active = false; window.removeEventListener("cd:auth-changed", onAuthChanged); };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let seen = false;
    try { seen = window.localStorage.getItem(MASTER_LOVE_CODEX_PROLOGUE_SEEN_KEY) === "seen"; } catch { seen = false; }
    setHasSeenPrologue(seen);
    const replay = new URLSearchParams(window.location.search).get("prologue") === "replay";
    if (replay) {
      setPrologueStage(codexPrologueStageOrder[0]);
      setPhase("prologue");
    }
  }, []);

  const markPrologueSeen = useCallback(() => {
    setHasSeenPrologue(true);
    try { window.localStorage.setItem(MASTER_LOVE_CODEX_PROLOGUE_SEEN_KEY, "seen"); } catch { /* best-effort */ }
  }, []);

  /**
   * 랜딩의 상품 카드에서 들어오면 그 상품으로 입력 화면을 준비한다.
   * 궁합으로 들어왔으면 상대 칸을 미리 펼쳐 둘 뿐이다 — 금액은 상대 **생년월일이 실제로
   * 채워진 뒤**에 궁합가로 바뀐다(activeMode 기준). 칸만 열렸는데 비싼 금액을 먼저 띄우면
   * 실제 청구액(제출 시점의 상대 유무로 확정)과 어긋난다.
   */
  function enterCodex(intent?: MasterLoveCodexMode) {
    if (intent === "compat" && !birth.partner) {
      setBirth((current) => (current.partner ? current : { ...current, partner: { ...EMPTY_CODEX_PARTNER } }));
    }
    if (intent === "solo" && birth.partner && !birth.partner.birthDate) {
      setBirth((current) => ({ ...current, partner: null }));
    }
    if (hasSeenPrologue) { setPhase("birth"); return; }
    setPrologueStage(codexPrologueStageOrder[0]);
    setPhase("prologue");
  }

  function replayPrologue() {
    setPrologueStage(codexPrologueStageOrder[0]);
    setPhase("prologue");
  }

  function completePrologue() {
    markPrologueSeen();
    setPhase("birth");
  }

  /** 건너뛴 경우는 '봤음'으로 기록하지 않는다(찻집 규칙). */
  function skipPrologue() {
    setPhase("birth");
  }

  const runBatches = useCallback(async (startSessionId: string, startToken: string, seed: SessionPayload) => {
    setPhase("generating");
    setGenerationError("");
    generationStartedRef.current = true;
    sessionIdRef.current = startSessionId;
    // 🔴 첫 배치가 실패해도 재시도가 같은 토큰으로 돌 수 있게 진입 시점에 스냅샷을 채운다.
    //    (비워 두면 재시도가 빈 토큰으로 /generate 를 불러 402 로 죽는다.)
    lastTokenRef.current = startToken;
    lastSessionRef.current = seed;
    handedOffRef.current = false;

    // 읽기는 몰입 전용 라우트에서 한다 — 그쪽은 사이트맵에 없어 서버 렌더 설명 하한(1,800자)
    // 대상이 아니고, 따라서 코덱스 아래에 아무 설명도 남지 않는다.
    const handOff = () => {
      if (handedOffRef.current) return;
      handedOffRef.current = true;
      router.replace(`/master-love-codex/result?sessionId=${encodeURIComponent(startSessionId)}`);
    };

    await runCodexBatches({
      sessionId: startSessionId,
      accessToken: startToken,
      seed,
      errorText,
      // 🔴 핸드오프 뒤에는 이 화면의 루프를 멈춘다. 결과 페이지가 같은 세션을 이어쓰므로,
      //    두 루프가 함께 돌면 서버 배치 락을 서로 뺏어 409 만 주고받는다.
      shouldStop: () => handedOffRef.current,
      onProgress: (session) => {
        setChapters(Array.isArray(session.chapters) ? session.chapters : []);
        if (session.accessToken) lastTokenRef.current = session.accessToken;
        lastSessionRef.current = session;
        // 🔴 완주가 아니라 **첫 진척**에서 넘긴다. 20장 완주는 5~10분이라 PG 리다이렉트로 돌아온
        //    모바일 탭이 그때까지 살아 있지 못했고, 그것이 "결제했는데 책이 미완성"의 주경로였다.
        //    읽기 화면은 남은 장을 이어쓰면서 쌓이는 것을 그대로 보여준다.
        handOff();
      },
    });
    // 씨앗이 이미 완성본이었으면 onProgress 가 한 번도 불리지 않는다 — 그때도 결과로 넘긴다.
    handOff();
  }, [router, errorText]);

  /**
   * 결제 후 자동 재개 — 모바일 PortOne 은 상위 프레임을 리다이렉트하므로 startCodex 의 await 가
   * 문서와 함께 죽는다. 복귀한 문서는 landing 부터 시작해 "결제는 됐는데 코덱스는 안 열림"이 된다.
   * 🔴 게이트를 다시 타지 않는다 — 결제 뒤 경로(/start → 배치 생성)만 그대로 잇는다.
   * 🔴 멱등키는 서술자에 실어 온 것을 쓴다. 복귀 문서에서 새로 뽑으면 서버가 다른 회차로 보고
   *    값을 두 번 친다(ensure-access 는 결제 이력을 보지 않는다).
   * 실패는 false 다 — 복귀 문서에는 입력 폼이 없어 '지금 열기' 카드가 유일한 재시도 수단이고,
   * 같은 멱등키로 다시 나가므로 이중 차감이 아니다.
   */
  const resumePaidCodex = useCallback(async (args: PaidResumeArgs, grant: PaidResumeGrant | null) => {
    if (busyRef.current) return false;
    const restored = unpackPaidResumeArg<Record<string, unknown>>(args.payload);
    const idempotencyKey = toText(args.idempotencyKey);
    if (!restored || !idempotencyKey) return false;
    pendingResumeRef.current = { args, grant };
    busyRef.current = true;
    idempotencyRef.current = idempotencyKey;
    chargedRef.current = true;
    setError("");
    setBirth((current) => ({ ...current, ...asRecord(restored.birthInfo), partner: restored.partnerInfo ? { ...EMPTY_CODEX_PARTNER, ...asRecord(restored.partnerInfo) } : null }));
    setGenerationError("");
    setPhase("generating");
    try {
      const startBody = { ...restored, ...extractPayment(grant, idempotencyKey) };
      const started = await postJson("/api/master-love-codex/start", startBody, idempotencyKey);
      if (!started.data?.ok || !started.data.sessionId) throw new Error(mapError(started.data, started.status, errorText));
      sessionIdRef.current = started.data.sessionId;
      pendingResumeRef.current = null;
      setChapters(Array.isArray(started.data.chapters) ? started.data.chapters : []);
      await runBatches(started.data.sessionId, toText(started.data.accessToken), started.data);
      return true;
    } catch (caught) {
      setGenerationError(caught instanceof TypeError
        ? errorText.NETWORK_ERROR
        : caught instanceof Error ? caught.message : errorText.SERVER_ERROR);
      return false;
    } finally {
      busyRef.current = false;
    }
  }, [runBatches, errorText]);
  const buildResume = usePaidResume(MASTER_LOVE_CODEX_RESUME_KIND, resumePaidCodex);

  /** 생성만 다시 돈다 — 결제·ensure-access 를 재실행하지 않으므로 이중 결제 위험이 없다. */
  const retryGeneration = useCallback(() => {
    if (busyRef.current) return;
    // /start can fail after payment, before a session exists. Retry that same
    // paid operation instead of leaving the visible retry button inert.
    if (!sessionIdRef.current) {
      const pending = pendingResumeRef.current;
      if (pending) void resumePaidCodex(pending.args, pending.grant);
      return;
    }
    busyRef.current = true;
    void runBatches(sessionIdRef.current, lastTokenRef.current, lastSessionRef.current)
      .catch((caught) => {
        setGenerationError(caught instanceof TypeError
          ? errorText.NETWORK_ERROR
          : caught instanceof Error ? caught.message : errorText.SERVER_ERROR);
      })
      .finally(() => { busyRef.current = false; });
  }, [runBatches, errorText, resumePaidCodex]);

  const recoverStoredSession = async (sessionId: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRecovering(true);
    setError("");
    try {
      const response = await authFetch(`/api/master-love-codex/session?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
      const data: RestorableSessionPayload = await response.json();
      if (!response.ok || !data.ok) throw new Error(mapError(data, response.status, errorText));
      if (data.status === "completed") {
        router.push(`/master-love-codex/result?sessionId=${encodeURIComponent(sessionId)}`);
        return;
      }
      setBirth({ ...EMPTY_CODEX_BIRTH, ...data.birthInfo, partner: data.partnerInfo || null });
      setAccessType(data.accessType || "");
      await runBatches(sessionId, data.accessToken || "", data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : errorText.SERVER_ERROR);
    } finally {
      busyRef.current = false;
      setRecovering(false);
    }
  };

  const recoverStoredPurchase = async (purchase: RecoverablePurchase) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRecovering(true);
    setError("");
    try {
      const confirmed = await postJson("/api/payments/confirm", { merchantUid: purchase.orderId });
      if (confirmed.status >= 400) throw new Error(mapError(confirmed.data, confirmed.status, errorText));
      const statusResponse = await authFetch(`/api/payments/orders/${encodeURIComponent(purchase.orderId)}/status`, { cache: "no-store" });
      const status = await statusResponse.json();
      if (!statusResponse.ok || !status.verified || !status.serviceReady) throw new Error(copy.gateAlreadyPaidMessage);
      recoveredPurchaseRef.current = purchase;
      chargedRef.current = true;
      idempotencyRef.current = purchase.requestId || purchase.orderId;
      const response = await authFetch(`/api/payments/orders/${encodeURIComponent(purchase.orderId)}/resume`, { cache: "no-store" });
      if (!response.ok) throw new Error(errorText.SERVER_ERROR);
      const resume = await response.json();
      const args = asRecord(asRecord(asRecord(resume.context).resume).args);
      const input = unpackPaidResumeArg<Record<string, unknown>>(args.payload);
      if (!input) {
        // Input retention can expire; the purchased run remains available.
        setBirth(current => ({ ...current, partner: purchase.featureKey.endsWith("-compat") ? current.partner || { ...EMPTY_CODEX_PARTNER } : null }));
        setPhase("birth");
        return;
      }
      const started = await postJson("/api/master-love-codex/start", { ...input, paymentId: purchase.orderId }, idempotencyRef.current);
      if (!started.data?.ok || !started.data.sessionId) throw new Error(mapError(started.data, started.status, errorText));
      await runBatches(started.data.sessionId, toText(started.data.accessToken), started.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : errorText.SERVER_ERROR);
    } finally {
      busyRef.current = false;
      setRecovering(false);
    }
  };

  const openStoredCodex = useCallback(() => {
    if (!sessionIdRef.current) return;
    router.replace(`/master-love-codex/result?sessionId=${encodeURIComponent(sessionIdRef.current)}`);
  }, [router]);

  async function startCodex() {
    if (busyRef.current) return;
    if (!birth.birthDate || !birth.gender || (!birth.birthTime && !birth.birthTimeUnknown)) {
      setError(errorText.INVALID_INPUT);
      return;
    }
    // 궁합으로 펼치기로 했는데 상대 생년월일이 비어 있으면 조용히 개인판으로 떨어뜨리지 않는다.
    if (birth.partner && !birth.partner.birthDate) {
      setError(errorText.PARTNER_INPUT_REQUIRED);
      return;
    }
    busyRef.current = true;
    const idempotencyKey = idempotencyRef.current || createIdempotencyKey();
    idempotencyRef.current = idempotencyKey;
    setError("");
    setPhase("checking");

    const partner = birth.partner?.birthDate ? birth.partner : null;
    // 결제 식별자는 이 시점의 상대 유무로 확정한다 — 렌더 시점 값에 의존하면 어긋날 수 있다.
    const gateBilling = masterLoveCodexBilling(partner ? "compat" : "solo", locale);
    const payload = {
      idempotencyKey,
      prologueChoice,
      birthInfo: {
        name: birth.name,
        gender: birth.gender,
        birthDate: birth.birthDate,
        birthTime: birth.birthTimeUnknown ? "" : birth.birthTime,
        birthTimeUnknown: birth.birthTimeUnknown,
        calendarType: birth.calendarType,
        isLeapMonth: birth.calendarType === "lunar" ? birth.isLeapMonth : false,
      },
      ...(partner
        ? {
          partnerInfo: {
            name: partner.name,
            gender: partner.gender,
            birthDate: partner.birthDate,
            birthTime: partner.birthTimeUnknown ? "" : partner.birthTime,
            birthTimeUnknown: partner.birthTimeUnknown,
            calendarType: partner.calendarType,
            isLeapMonth: partner.calendarType === "lunar" ? partner.isLeapMonth : false,
          },
        }
        : {}),
    };

    let gateStarted = false;
    try {
      if (recoveredPurchaseRef.current) {
        const purchase = recoveredPurchaseRef.current;
        if (purchase.featureKey !== gateBilling.featureKey) throw new Error(errorText.INVALID_INPUT);
        const started = await postJson("/api/master-love-codex/start", { ...payload, paymentId: purchase.orderId }, idempotencyKey);
        if (!started.data?.ok || !started.data.sessionId) throw new Error(mapError(started.data, started.status, errorText));
        await runBatches(started.data.sessionId, toText(started.data.accessToken), started.data);
        return;
      }
      beginPaidFeatureGateCheck({
        featureKey: gateBilling.featureKey,
        requestId: idempotencyKey,
        title: copy.gateCheckTitle,
        reason: gateBilling.title,
        paymentMode: "MEMBERSHIP_PASS",
      });
      // 이용권 판정(unlock-status)을 아래 ensure-access 왕복과 겹쳐 돌린다 — 결제 게이트가 같은 키로 재사용해 직렬 왕복이 1회 준다.
      void primePaymentEligibility(buildBillingGateInput({}, idempotencyKey, gateBilling));
      gateStarted = true;
      holdPaidFeatureGateOpen({ requestId: idempotencyKey, maxMs: 8000 });

      const ensure = await postJson("/api/master-love-codex/ensure-access", payload, idempotencyKey);
      let startBody: Record<string, unknown> = { ...payload };

      if (ensure.data?.ok) {
        completePaidFeatureGateCheck({
          featureKey: gateBilling.featureKey,
          requestId: idempotencyKey,
          title: copy.gateCompleteTitle,
          reason: gateBilling.title,
          message: copy.gateCompleteOpenMessage,
        });
        setAccessType(toText(ensure.data.accessType));
        startBody = { ...startBody, accessToken: ensure.data.accessToken, accessType: ensure.data.accessType };
      } else if (ensure.data?.reason === "PAYMENT_REQUIRED" && chargedRef.current) {
        // 이미 이 idempotencyKey 로 결제가 끝난 회차의 재시도다. ensure-access 는 결제 이력을
        // 보지 않으므로 여기서도 402 를 주지만, 결제창을 다시 열면 안 된다. /start 는
        // findBillingEvidence 가 같은 키의 결제 증빙을 찾아 그대로 통과시킨다.
        completePaidFeatureGateCheck({
          featureKey: gateBilling.featureKey,
          requestId: idempotencyKey,
          title: copy.gateAlreadyPaidTitle,
          reason: gateBilling.title,
          message: copy.gateAlreadyPaidMessage,
        });
      } else if (ensure.data?.reason === "PAYMENT_REQUIRED") {
        setPhase("payment");
        const gate = await runBillingCoinGate({
          ...buildBillingGateInput(asRecord(ensure.data.paymentPayload), idempotencyKey, gateBilling),
          resume: buildResume({ idempotencyKey, payload: packPaidResumeArg(payload) }),
        });
        if (!isPaymentGranted(gate)) {
          const code = String((gate as { error?: { code?: string } })?.error?.code || "").toUpperCase();
          if (code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED") throw new Error(errorText.LOGIN_REQUIRED);
          if (code === "PAYMENT_CANCELLED") throw new Error(errorText.PAYMENT_CANCELLED);
          throw new Error(errorText.PAYMENT_VERIFY_FAILED);
        }
        chargedRef.current = true;
        startBody = { ...startBody, ...extractPayment(gate, idempotencyKey) };
      } else {
        throw new Error(mapError(ensure.data, ensure.status, errorText));
      }

      releasePaidFeatureGate(idempotencyKey);
      const started = await postJson("/api/master-love-codex/start", startBody, idempotencyKey);
      if (!started.data?.ok || !started.data.sessionId) throw new Error(mapError(started.data, started.status, errorText));

      sessionIdRef.current = started.data.sessionId;
      setChapters(Array.isArray(started.data.chapters) ? started.data.chapters : []);
      await runBatches(started.data.sessionId, toText(started.data.accessToken), started.data);
    } catch (caught) {
      const message = caught instanceof TypeError
        ? errorText.NETWORK_ERROR
        : caught instanceof Error ? caught.message : errorText.SERVER_ERROR;

      // 🔴 생성 단계 실패는 이용권 확인 실패가 아니다. 여기서 공용 결제 게이트를 다시 열면
      //    이미 releasePaidFeatureGate 로 닫힌 모달이 "확인 실패" 제목으로 되살아나, 실제
      //    원인(생성 중단)과 무관한 화면이 사용자에게 뜬다. 생성 실패는 이 기능이 직접 처리한다.
      if (generationStartedRef.current) {
        setGenerationError(message);
        return;
      }

      setError(message);
      if (gateStarted) {
        failPaidFeatureGateCheck({
          featureKey: gateBilling.featureKey,
          requestId: idempotencyKey,
          title: copy.gateFailTitle,
          reason: gateBilling.title,
          message,
          cancelled: message === errorText.PAYMENT_CANCELLED,
        });
      }
      setPhase("birth");
      // 결제까지 성공했는데 /start 가 실패한 경우엔 키를 버리면 안 된다 — ensure-access 는
      // 결제 이력을 보지 않으므로 새 키로 재시도하면 402 를 다시 받고 이중 결제된다.
      // 같은 키를 유지하면 resolveStartAccess 의 findBillingEvidence 가 결제를 찾아 통과시킨다.
      if (!chargedRef.current) idempotencyRef.current = "";
    } finally {
      busyRef.current = false;
    }
  }

  // 배경음은 모든 단계에서 프래그먼트의 첫 자식으로 둔다 — 단계가 바뀔 때 같은 자리·같은
  // 타입이라 React 가 유지하므로, 트랙이 바뀌지 않는 한 음악이 끊기지 않는다.
  const ambience = (
    <CodexAmbience
      track={phase === "generating" ? masterLoveCodexBgmTracks.scriptorium : masterLoveCodexBgmTracks.libraryGate}
    />
  );

  if (phase === "landing") {
    return (
      <>
        {ambience}
        {(storedSessions.length > 0 || storedPurchases.length > 0) && <nav className={codexStyles.purchaseRecovery} aria-label={copy.resumeButton}>
          {storedPurchases.map(item => <button key={item.orderId} type="button" disabled={recovering}
            onClick={() => { void recoverStoredPurchase(item); }}>
            {masterLoveCodexBilling(item.featureKey.endsWith("-compat") ? "compat" : "solo", locale).title} · {copy.resumeButton}
          </button>)}
          {storedSessions.map(item => <button key={item.sessionId} type="button" disabled={recovering}
            onClick={() => { void recoverStoredSession(item.sessionId); }}>
            {masterLoveCodexBilling(item.mode, locale).title} · {item.status === "completed" ? copy.resumeButton : copy.retryButton}
          </button>)}
          {error && <p role="alert">{error}</p>}
        </nav>}
        <CodexLanding
          hasSeenPrologue={hasSeenPrologue}
          chapterCount={MASTER_LOVE_CODEX_TOTAL_CHAPTERS}
          onEnter={enterCodex}
          onReplayPrologue={replayPrologue}
        />
      </>
    );
  }

  // 랜딩 이후 단계는 fixed 오버레이로 문서 흐름 위를 덮는다 — 아래 서버 렌더 소개
  // 섹션(배포 게이트용 1,800자)이 몰입 중에 비치지 않게 하기 위해서다.
  if (phase === "prologue") {
    return (
      <>
        {ambience}
        <CodexShell overlay ariaLabel={copy.prologueAriaLabel}>
          <CodexPrologueScene
            stage={prologueStage}
            onStageChange={setPrologueStage}
            onChoice={setPrologueChoice}
            onComplete={completePrologue}
            onSkip={skipPrologue}
          />
        </CodexShell>
      </>
    );
  }

  if (phase === "generating") {
    return (
      <>
        {ambience}
        <CodexShell overlay motes={false} ariaLabel={copy.generatingAriaLabel(false)}>
          <CodexGenerating
            completed={chapters.length}
            total={MASTER_LOVE_CODEX_TOTAL_CHAPTERS}
            latestTitles={chapters.map((chapter) => chapter.title)}
            name={birth.name}
            mode={activeMode}
            accessType={accessType}
            error={generationError}
            onRetry={retryGeneration}
            onOpenStored={chapters.length ? openStoredCodex : undefined}
          />
        </CodexShell>
      </>
    );
  }

  return (
    <>
      {ambience}
      <CodexShell overlay ariaLabel={copy.birthGateAriaLabel}>
        <CodexBirthGate
          value={birth}
          onChange={setBirth}
          onSubmit={() => void startCodex()}
          busy={phase === "checking" || phase === "payment"}
          busyLabel={phase === "payment" ? copy.paymentBusyLabel : copy.passCheckBusyLabel}
          error={error}
          priceSlot={(
            // 상대 정보를 넣으면 궁합 SKU 로 바뀌므로 금액 배지도 함께 바뀐다(리터럴 금지, 서버 가격 조회).
            <PriceBadge
              featureKey={activeBilling.featureKey}
              fallbackCoins={activeBilling.cost}
              className="font-bold"
            />
          )}
          headerSlot={(
            // 화면 최상단 — 지금 무슨 상품을 진행 중인지. 같은 SKU 를 따라간다.
            <span className={codexStyles.badge}>
              PREMIUM CONSULTATION
              <span aria-hidden="true">·</span>
              <PriceBadge
                featureKey={activeBilling.featureKey}
                fallbackCoins={activeBilling.cost}
                className="font-bold"
              />
            </span>
          )}
          floatingCta={(
            <CodexFloatingCta
              featureKey={activeBilling.featureKey}
              fallbackCoins={activeBilling.cost}
              label={copy.submitButton}
              onClick={() => void startCodex()}
              busy={phase === "checking" || phase === "payment"}
              busyLabel={phase === "payment" ? copy.paymentBusyShortLabel : copy.passCheckBusyShortLabel}
            />
          )}
        />
      </CodexShell>
    </>
  );
}
