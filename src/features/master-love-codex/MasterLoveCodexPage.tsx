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
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  holdPaidFeatureGateOpen,
  releasePaidFeatureGate,
  runBillingCoinGate,
} from "@/app/_lib/billing-client";
import { PriceBadge } from "@/app/components/PriceBadge";
import CodexAmbience from "./components/CodexAmbience";
import CodexLanding from "./components/CodexLanding";
import CodexPrologueScene from "./components/CodexPrologueScene";
import CodexBirthGate, { EMPTY_CODEX_BIRTH, type CodexBirthInput } from "./components/CodexBirthGate";
import CodexGenerating from "./components/CodexGenerating";
import CodexShell from "./components/CodexShell";
import type { CodexChapter, CodexLoveDna } from "./components/CodexReader";
import { masterLoveCodexBgmTracks } from "./data/assets";
import { codexPrologueStageOrder, type CodexPrologueChoiceKey, type CodexPrologueStage } from "./data/prologue";
import {
  MASTER_LOVE_CODEX_FEATURE_AMOUNT_KRW,
  MASTER_LOVE_CODEX_FEATURE_COST,
  MASTER_LOVE_CODEX_FEATURE_KEY,
  MASTER_LOVE_CODEX_PROLOGUE_SEEN_KEY,
  MASTER_LOVE_CODEX_TITLE,
  MASTER_LOVE_CODEX_TOTAL_CHAPTERS,
} from "./constants";

// 읽기(reader)는 이 라우트에 없다 — 생성이 끝나면 /master-love-codex/result 로 넘긴다.
type Phase = "landing" | "prologue" | "birth" | "checking" | "payment" | "generating";

const ERROR_TEXT: Record<string, string> = {
  LOGIN_REQUIRED: "인연의 서를 열려면 로그인이 필요합니다.",
  PAYMENT_REQUIRED: "회당 결제가 필요합니다.",
  PAYMENT_VERIFY_FAILED: "결제 확인이 완료되지 않았습니다. 결제가 끝났다면 잠시 후 다시 시도해 주세요.",
  PAYMENT_CANCELLED: "결제가 취소되었습니다.",
  INVALID_INPUT: "생년월일과 태어난 시각을 확인해 주세요.",
  CALCULATION_FAILED: "명식과 명반을 세우지 못했습니다. 입력값을 확인해 주세요.",
  GENERATION_IN_PROGRESS: "이미 다른 창에서 이어 쓰는 중입니다. 잠시 후 다시 시도해 주세요.",
  SERVER_ERROR: "인연의 서를 준비하는 중 문제가 발생했습니다.",
  NETWORK_ERROR: "연결이 불안정합니다. 잠시 후 다시 시도해 주세요.",
};

// 20장 / 배치 4장 = 5회 + 여유. 무한루프 방지용 터미널 가드.
const MAX_BATCHES = 12;

type SessionPayload = {
  ok?: boolean;
  reason?: string;
  message?: string;
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
  const data = (await response.json().catch(() => ({}))) as SessionPayload;
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
function buildBillingGateInput(paymentPayload: Record<string, unknown>, idempotencyKey: string) {
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  const cost = toNumber(runtimeGate.cost ?? runtimeGate.coinPrice ?? paymentPayload.cost ?? paymentPayload.coinPrice, MASTER_LOVE_CODEX_FEATURE_COST);
  const amountKRW = toNumber(
    runtimeGate.amountKRW ?? runtimeGate.amountKrw ?? paymentPayload.amountKRW ?? paymentPayload.amountKrw ?? paymentPayload.paymentAmount,
    MASTER_LOVE_CODEX_FEATURE_AMOUNT_KRW,
  );
  return {
    categoryKey: toText(runtimeGate.categoryKey ?? paymentPayload.categoryKey) || "premium-consultation",
    subFeatureKey: toText(runtimeGate.subFeatureKey ?? paymentPayload.subFeatureKey) || MASTER_LOVE_CODEX_FEATURE_KEY,
    featureKey: toText(runtimeGate.featureKey ?? paymentPayload.featureKey) || MASTER_LOVE_CODEX_FEATURE_KEY,
    reason: toText(runtimeGate.reason ?? paymentPayload.reason) || MASTER_LOVE_CODEX_TITLE,
    productId: toText(runtimeGate.productId ?? paymentPayload.productId) || MASTER_LOVE_CODEX_FEATURE_KEY,
    productType: toText(runtimeGate.productType ?? paymentPayload.productType) || MASTER_LOVE_CODEX_FEATURE_KEY,
    serviceType: toText(runtimeGate.serviceType ?? paymentPayload.serviceType) || MASTER_LOVE_CODEX_FEATURE_KEY,
    forceDeduct: false,
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

function mapError(data: SessionPayload, status = 0) {
  const reason = String(data?.reason || "").toUpperCase();
  if (reason && ERROR_TEXT[reason]) return ERROR_TEXT[reason];
  if (status === 401) return ERROR_TEXT.LOGIN_REQUIRED;
  if (status === 402) return ERROR_TEXT.PAYMENT_VERIFY_FAILED;
  return data?.message || ERROR_TEXT.SERVER_ERROR;
}


export default function MasterLoveCodexPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("landing");
  const [prologueStage, setPrologueStage] = useState<CodexPrologueStage>(codexPrologueStageOrder[0]);
  const [hasSeenPrologue, setHasSeenPrologue] = useState(false);
  const [prologueChoice, setPrologueChoice] = useState<CodexPrologueChoiceKey | "">("");
  const [birth, setBirth] = useState<CodexBirthInput>(EMPTY_CODEX_BIRTH);
  const [error, setError] = useState("");
  const [chapters, setChapters] = useState<CodexChapter[]>([]);
  const busyRef = useRef(false);
  const idempotencyRef = useRef("");
  // 결제 후 생성이 끊겼을 때 catch 에서 즉시 읽어야 하므로 state 가 아니라 ref 로 들고 있는다
  // (setSessionId 직후의 클로저는 아직 빈 문자열이라 세션을 잃어버린다).
  const sessionIdRef = useRef("");
  // 이번 시도에서 실제로 결제가 완료됐는지. 완료됐다면 idempotencyKey 를 절대 버리지 않는다
  // (ensure-access 는 결제 이력을 보지 않으므로 새 키로 재시도하면 그대로 두 번 결제된다).
  const chargedRef = useRef(false);

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

  function enterCodex() {
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
    let token = startToken;
    let current = seed;
    for (let guard = 0; guard < MAX_BATCHES; guard += 1) {
      if (current.done || String(current.status) === "completed") break;
      const { status, data } = await postJson("/api/master-love-codex/generate", { sessionId: startSessionId, accessToken: token });
      if (!data?.ok) {
        if (data?.reason === "GENERATION_IN_PROGRESS") {
          await new Promise((resolve) => setTimeout(resolve, 4000));
          continue;
        }
        throw new Error(mapError(data, status));
      }
      if (data.accessToken) token = data.accessToken;
      current = data;
      setChapters(Array.isArray(data.chapters) ? data.chapters : []);
      if (data.done || String(data.status) === "completed") break;
    }
    // 읽기는 몰입 전용 라우트에서 한다 — 그쪽은 사이트맵에 없어 서버 렌더 설명 하한(1,800자)
    // 대상이 아니고, 따라서 코덱스 아래에 아무 설명도 남지 않는다.
    router.replace(`/master-love-codex/result?sessionId=${encodeURIComponent(startSessionId)}`);
  }, [router]);

  async function startCodex() {
    if (busyRef.current) return;
    if (!birth.birthDate || !birth.gender || (!birth.birthTime && !birth.birthTimeUnknown)) {
      setError(ERROR_TEXT.INVALID_INPUT);
      return;
    }
    busyRef.current = true;
    const idempotencyKey = idempotencyRef.current || createIdempotencyKey();
    idempotencyRef.current = idempotencyKey;
    setError("");
    setPhase("checking");

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
    };

    let gateStarted = false;
    try {
      beginPaidFeatureGateCheck({
        featureKey: MASTER_LOVE_CODEX_FEATURE_KEY,
        requestId: idempotencyKey,
        title: "이용권 확인",
        reason: MASTER_LOVE_CODEX_TITLE,
        paymentMode: "MEMBERSHIP_PASS",
      });
      gateStarted = true;
      holdPaidFeatureGateOpen({ requestId: idempotencyKey, maxMs: 8000 });

      const ensure = await postJson("/api/master-love-codex/ensure-access", payload, idempotencyKey);
      let startBody: Record<string, unknown> = { ...payload };

      if (ensure.data?.ok) {
        completePaidFeatureGateCheck({
          featureKey: MASTER_LOVE_CODEX_FEATURE_KEY,
          requestId: idempotencyKey,
          title: "확인 완료",
          reason: MASTER_LOVE_CODEX_TITLE,
          message: "인연의 서를 펼칩니다.",
        });
        startBody = { ...startBody, accessToken: ensure.data.accessToken, accessType: ensure.data.accessType };
      } else if (ensure.data?.reason === "PAYMENT_REQUIRED" && chargedRef.current) {
        // 이미 이 idempotencyKey 로 결제가 끝난 회차의 재시도다. ensure-access 는 결제 이력을
        // 보지 않으므로 여기서도 402 를 주지만, 결제창을 다시 열면 안 된다. /start 는
        // findBillingEvidence 가 같은 키의 결제 증빙을 찾아 그대로 통과시킨다.
        completePaidFeatureGateCheck({
          featureKey: MASTER_LOVE_CODEX_FEATURE_KEY,
          requestId: idempotencyKey,
          title: "결제 확인",
          reason: MASTER_LOVE_CODEX_TITLE,
          message: "이미 결제된 회차입니다. 이어서 펼칩니다.",
        });
      } else if (ensure.data?.reason === "PAYMENT_REQUIRED") {
        setPhase("payment");
        const gate = await runBillingCoinGate(buildBillingGateInput(asRecord(ensure.data.paymentPayload), idempotencyKey));
        if (!isPaymentGranted(gate)) {
          const code = String((gate as { error?: { code?: string } })?.error?.code || "").toUpperCase();
          if (code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED") throw new Error(ERROR_TEXT.LOGIN_REQUIRED);
          if (code === "PAYMENT_CANCELLED") throw new Error(ERROR_TEXT.PAYMENT_CANCELLED);
          throw new Error(ERROR_TEXT.PAYMENT_VERIFY_FAILED);
        }
        chargedRef.current = true;
        startBody = { ...startBody, ...extractPayment(gate, idempotencyKey) };
      } else {
        throw new Error(mapError(ensure.data, ensure.status));
      }

      releasePaidFeatureGate(idempotencyKey);
      const started = await postJson("/api/master-love-codex/start", startBody, idempotencyKey);
      if (!started.data?.ok || !started.data.sessionId) throw new Error(mapError(started.data, started.status));

      sessionIdRef.current = started.data.sessionId;
      setChapters(Array.isArray(started.data.chapters) ? started.data.chapters : []);
      await runBatches(started.data.sessionId, toText(started.data.accessToken), started.data);
    } catch (caught) {
      const message = caught instanceof TypeError
        ? ERROR_TEXT.NETWORK_ERROR
        : caught instanceof Error ? caught.message : ERROR_TEXT.SERVER_ERROR;
      setError(message);
      if (gateStarted) {
        failPaidFeatureGateCheck({
          featureKey: MASTER_LOVE_CODEX_FEATURE_KEY,
          requestId: idempotencyKey,
          title: "확인 실패",
          reason: MASTER_LOVE_CODEX_TITLE,
          message,
          cancelled: message === ERROR_TEXT.PAYMENT_CANCELLED,
        });
      }
      // 결제까지 끝난 뒤 생성이 끊긴 경우엔 세션이 남아 있으므로 보관된 코덱스로 보낸다.
      // 같은 idempotencyKey 로 다시 시도하면 서버가 같은 세션을 돌려주므로 재결제되지 않는다.
      if (sessionIdRef.current) {
        router.replace(`/master-love-codex/result?sessionId=${encodeURIComponent(sessionIdRef.current)}`);
      } else {
        setPhase("birth");
        // 결제까지 성공했는데 /start 가 실패한 경우엔 키를 버리면 안 된다 — ensure-access 는
        // 결제 이력을 보지 않으므로 새 키로 재시도하면 402 를 다시 받고 이중 결제된다.
        // 같은 키를 유지하면 resolveStartAccess 의 findBillingEvidence 가 결제를 찾아 통과시킨다.
        if (!chargedRef.current) idempotencyRef.current = "";
      }
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
        <CodexShell overlay ariaLabel="프롤로그">
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
        <CodexShell overlay motes={false} ariaLabel="인연의 서 생성 중">
          <CodexGenerating
            completed={chapters.length}
            total={MASTER_LOVE_CODEX_TOTAL_CHAPTERS}
            latestTitles={chapters.map((chapter) => chapter.title)}
            name={birth.name}
          />
        </CodexShell>
      </>
    );
  }

  return (
    <>
      {ambience}
      <CodexShell overlay ariaLabel="생년 정보 입력">
        <CodexBirthGate
          value={birth}
          onChange={setBirth}
          onSubmit={() => void startCodex()}
          busy={phase === "checking" || phase === "payment"}
          busyLabel={phase === "payment" ? "결제 진행 중..." : "이용권 확인 중..."}
          error={error}
          priceSlot={(
            <PriceBadge
              featureKey={MASTER_LOVE_CODEX_FEATURE_KEY}
              fallbackCoins={MASTER_LOVE_CODEX_FEATURE_COST}
              prefix="1회 "
              className="text-xs"
            />
          )}
        />
      </CodexShell>
    </>
  );
}
