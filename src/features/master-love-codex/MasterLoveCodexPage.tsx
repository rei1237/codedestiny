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
import { isRetriableResultPollFailure } from "@/app/_lib/consultationResultPolling";
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
import type { CodexChapter, CodexLoveDna } from "./components/CodexReader";
import { masterLoveCodexBgmTracks } from "./data/assets";
import { codexPrologueStageOrder, type CodexPrologueChoiceKey, type CodexPrologueStage } from "./data/prologue";
import {
  MASTER_LOVE_CODEX_PROLOGUE_SEEN_KEY,
  MASTER_LOVE_CODEX_TOTAL_CHAPTERS,
  masterLoveCodexBilling,
  type MasterLoveCodexMode,
} from "./constants";
import { getMasterLoveCodexCopy, useMasterLoveCodexLocale, type MasterLoveCodexErrorText } from "./_lib/copy";
import codexStyles from "./styles/codex.module.css";

// 읽기(reader)는 이 라우트에 없다 — 생성이 끝나면 /master-love-codex/result 로 넘긴다.
type Phase = "landing" | "prologue" | "birth" | "checking" | "payment" | "generating";

// 서버가 예산을 넘기면 4장이 아니라 1~3장만 커밋하고 돌아온다(worker/routes/master-love-codex.js).
// 그래서 왕복 수는 20/4=5 회로 고정되지 않는다 — 최악(장당 1회)까지 여유를 둔 터미널 가드다.
const MAX_BATCHES = 32;
// 200 을 받았는데 장이 하나도 안 늘어난 경우의 상한. 서버는 1장 이상 커밋하거나 503 을 주므로
// 정상 경로에서는 발생하지 않는다 — 순수 무한루프 방지용이다.
const MAX_NO_PROGRESS_BATCHES = 3;
// 🔴 '연속 실패'가 이어지는 시간의 상한이다(생성 시작 시각 기준이 아니다). 성공 배치가 하나라도
//    끼면 초기화된다 — 20장 생성은 정상적으로도 몇 분이 걸려서, 시작 기준으로 재면 후반 배치의
//    일시적 실패에는 완충이 하나도 남지 않는다.
//    서버 배치 락 TTL(120초)보다 길어야 엣지 컷 뒤 남은 락이 풀릴 때까지 버틴다.
const GENERATION_STALL_BUDGET_MS = 240_000;

type SessionPayload = {
  ok?: boolean;
  reason?: string;
  message?: string;
  /** 서버가 "일시적이니 다시 불러도 된다"고 표시한 응답 — 공용 판정(isRetriableResultPollFailure)이 읽는다 */
  retryable?: boolean;
  sessionId?: string;
  status?: string;
  accessToken?: string;
  accessType?: string;
  chapters?: CodexChapter[];
  loveDna?: CodexLoveDna | null;
  totalCharCount?: number;
  totalChapters?: number;
  birthInfo?: Partial<CodexBirthInput> | null;
  done?: boolean;
  paymentPayload?: Record<string, unknown>;
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

async function postJson(url: string, body: Record<string, unknown>, idempotencyKey?: string) {
  const response = await authFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    credentials: "include",
    body: JSON.stringify(body),
  }, { retryOn401: false });
  let data = (await response.json().catch(() => null)) as SessionPayload | null;
  // 🔴 엣지 컷(524)·게이트웨이 오류는 JSON 이 아니라 HTML 을 돌려준다. 예전처럼 {} 로 뭉개면
  //    상태 코드까지 사라져 "일시적 지연"과 "확정 실패"를 구분할 수 없게 되고, 모든 실패가
  //    같은 제네릭 문구 하나로 표면화된다. 본문이 없으면 상태 코드로 사유를 세운다.
  if (!data) {
    data = response.ok
      ? { ok: false, reason: "SERVER_ERROR" }
      : { ok: false, reason: response.status >= 500 ? "EDGE_TIMEOUT" : "SERVER_ERROR", retryable: response.status >= 500 };
  }
  return { status: response.status, data };
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

function mapError(data: SessionPayload, status: number, errorText: MasterLoveCodexErrorText) {
  const reason = String(data?.reason || "").toUpperCase() as keyof MasterLoveCodexErrorText;
  const serverMessage = String(data?.message || "").trim();
  // SERVER_ERROR 는 서버가 상황을 훨씬 정확히 안다 — 제네릭 상수로 덮어쓰면
  // "결제와 지금까지 쓰인 장은 보존됩니다" 같은 안내가 사용자에게 영영 닿지 않는다.
  // (다른 사유는 기존 문구를 그대로 쓴다 — 이 화면의 표현 계약이 바뀌지 않게.)
  if (reason === "SERVER_ERROR" && serverMessage) return serverMessage;
  if (reason && errorText[reason]) return errorText[reason];
  if (status === 401) return errorText.LOGIN_REQUIRED;
  if (status === 402) return errorText.PAYMENT_VERIFY_FAILED;
  return serverMessage || errorText.SERVER_ERROR;
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
  // 생성 단계에 들어섰는지. 여기부터의 실패는 이용권/결제 실패가 아니므로 결제 게이트 모달을
  // 다시 열면 안 된다("확인 실패"라는 거짓 제목이 그렇게 붙었다).
  const generationStartedRef = useRef(false);
  // 생성만 재시도할 때 필요한 최신 토큰·세션 스냅샷(결제 왕복을 다시 타지 않기 위해).
  const lastTokenRef = useRef("");
  const lastSessionRef = useRef<SessionPayload>({});
  const [generationError, setGenerationError] = useState("");

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
    let token = startToken;
    let current = seed;
    let written = Array.isArray(seed.chapters) ? seed.chapters.length : 0;
    let batches = 0;
    let retries = 0;
    let noProgress = 0;
    let stallStartedAt = 0;

    while (!(current.done || String(current.status) === "completed")) {
      if (batches >= MAX_BATCHES) throw new Error(errorText.GENERATION_BUDGET_EXCEEDED);
      const { status, data } = await postJson("/api/master-love-codex/generate", { sessionId: startSessionId, accessToken: token });

      if (!data?.ok) {
        // 일시적 실패(409 재기동 대기 · 503 예산 초과/DB 블립 · 엣지 컷)는 종료 사유가 아니다.
        // 판정은 다른 유료 화면 10곳이 쓰는 공용 함수를 그대로 재사용한다(중복 구현 금지).
        if (!stallStartedAt) stallStartedAt = Date.now();
        const withinStallBudget = Date.now() - stallStartedAt < GENERATION_STALL_BUDGET_MS;
        if (isRetriableResultPollFailure(status, data) && withinStallBudget) {
          retries += 1;
          const delayMs = Math.min(8000, Math.round(1500 * 1.8 ** Math.min(retries - 1, 4)));
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw new Error(mapError(data, status, errorText));
      }

      batches += 1;
      retries = 0;
      stallStartedAt = 0;
      if (data.accessToken) token = data.accessToken;
      current = data;
      const chapters = Array.isArray(data.chapters) ? data.chapters : [];
      setChapters(chapters);
      lastTokenRef.current = token;
      lastSessionRef.current = data;
      // 서버는 1장 이상 커밋하거나 503 을 준다. 진행 없는 200 이 이어지면 그건 무한루프다.
      if (chapters.length > written) { written = chapters.length; noProgress = 0; } else { noProgress += 1; }
      if (noProgress >= MAX_NO_PROGRESS_BATCHES) throw new Error(errorText.GENERATION_BUDGET_EXCEEDED);
    }
    // 읽기는 몰입 전용 라우트에서 한다 — 그쪽은 사이트맵에 없어 서버 렌더 설명 하한(1,800자)
    // 대상이 아니고, 따라서 코덱스 아래에 아무 설명도 남지 않는다.
    router.replace(`/master-love-codex/result?sessionId=${encodeURIComponent(startSessionId)}`);
  }, [router, errorText]);

  /** 생성만 다시 돈다 — 결제·ensure-access 를 재실행하지 않으므로 이중 결제 위험이 없다. */
  const retryGeneration = useCallback(() => {
    if (busyRef.current || !sessionIdRef.current) return;
    busyRef.current = true;
    void runBatches(sessionIdRef.current, lastTokenRef.current, lastSessionRef.current)
      .catch((caught) => {
        setGenerationError(caught instanceof TypeError
          ? errorText.NETWORK_ERROR
          : caught instanceof Error ? caught.message : errorText.SERVER_ERROR);
      })
      .finally(() => { busyRef.current = false; });
  }, [runBatches, errorText]);

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
        const gate = await runBillingCoinGate(buildBillingGateInput(asRecord(ensure.data.paymentPayload), idempotencyKey, gateBilling));
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
