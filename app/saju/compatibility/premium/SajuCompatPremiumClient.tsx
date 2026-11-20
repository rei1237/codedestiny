"use client";

// 사주 고급 궁합 입력 화면. prepare → (필요하면) runBillingCoinGate → 첫 /generate 로 상담을 만든 뒤 결과 화면으로 넘긴다.
// 🔴 결제 복귀(usePaidResume)도 게이트를 다시 타지 않고 같은 코어(startGeneration)를 부른다 — 재과금 방지.
// 🔴 월정석은 성공 전달 뒤에만 차감한다: buildBillingGateInput 이 deferUsage + apply_after_success 를 싣는다.
import { useEffect, useRef, useState, type FormEvent } from "react";
import BirthTimeInput from "@/app/components/BirthTimeInput";
import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  primePaymentEligibility,
  runBillingCoinGate,
} from "@/app/_lib/billing-client";
import { packPaidResumeArg, unpackPaidResumeArg, usePaidResume } from "@/app/hooks/usePaidResume";
import { usePaidDeliveryScope } from "@/app/hooks/usePaidDeliveryScope";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";
import { runAccessCheckWithTransientRetry } from "@/app/_lib/consultationResultPolling";
import {
  API_BASE,
  FEATURE_AMOUNT_KRW,
  FEATURE_COST,
  FEATURE_KEY,
  FEATURE_MEMBERSHIP_CREDIT_COST,
  FEATURE_REASON,
  LOGIN_REQUIRED_MESSAGE,
  PAYMENT_CANCELLED_MESSAGE,
  PAYMENT_VERIFY_FAILED_MESSAGE,
  RELATION_OPTIONS,
  SERVER_ERROR_MESSAGE,
  buildInputPayload,
  createIdempotencyKey,
  emptyPerson,
  postJson,
  readPremiumPrefill,
  resultHref,
  runPremiumGeneration,
  type PremiumInput,
  type PremiumPerson,
  type RelationType,
  type SessionPayload,
} from "./_lib/premium-delivery";
import styles from "./premium.module.css";

type InputPayload = ReturnType<typeof buildInputPayload>;
type Status = "idle" | "checking" | "payment" | "starting" | "error";

const asRecord = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {});
const toText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const toNumber = (value: unknown, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

// 🔴 같은 파일에 둔다 — verify:paid-gate-price-coverage 는 같은 파일의 빌더만 정적으로 풀어 가격 근거를 확인한다.
function buildBillingGateInput(paymentPayload: Record<string, unknown>, idempotencyKey: string) {
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  return {
    categoryKey: toText(runtimeGate.categoryKey || paymentPayload.categoryKey) || "premium-consultation",
    subFeatureKey: toText(runtimeGate.subFeatureKey || paymentPayload.subFeatureKey) || FEATURE_KEY,
    featureKey: toText(runtimeGate.featureKey || paymentPayload.featureKey) || FEATURE_KEY,
    reason: toText(runtimeGate.reason || paymentPayload.reason) || FEATURE_REASON,
    productId: toText(runtimeGate.productId || paymentPayload.productId) || FEATURE_KEY,
    productType: toText(runtimeGate.productType || paymentPayload.productType) || FEATURE_KEY,
    serviceType: toText(runtimeGate.serviceType || paymentPayload.serviceType) || FEATURE_KEY,
    deferUsage: true,
    usagePolicy: "apply_after_success",
    requestId: idempotencyKey,
    idempotencyKey,
    cost: toNumber(runtimeGate.cost ?? paymentPayload.coinPrice, FEATURE_COST),
    coinPrice: toNumber(runtimeGate.coinPrice ?? paymentPayload.coinPrice, FEATURE_COST),
    amountKRW: toNumber(runtimeGate.amountKRW ?? paymentPayload.amountKRW, FEATURE_AMOUNT_KRW),
    membershipCreditCost: toNumber(runtimeGate.membershipCreditCost ?? paymentPayload.membershipCreditCost, FEATURE_MEMBERSHIP_CREDIT_COST),
  };
}

function validate(input: PremiumInput): string {
  for (const [person, who] of [[input.self, "나"], [input.partner, "상대"]] as const) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(person.birthDate)) return `${who}의 생년월일을 YYYY-MM-DD 형식으로 입력해 주세요.`;
    if (person.gender !== "male" && person.gender !== "female") return `${who}의 성별을 골라 주세요.`;
    if (!person.birthTimeUnknown && person.birthTime && !/^\d{2}:\d{2}$/.test(person.birthTime)) return `${who}의 태어난 시간을 다시 확인해 주세요.`;
  }
  return "";
}

function PersonFields({ legend, person, onChange }: { legend: string; person: PremiumPerson; onChange: (next: PremiumPerson) => void }) {
  const set = <K extends keyof PremiumPerson>(key: K, value: PremiumPerson[K]) => onChange({ ...person, [key]: value });
  return (
    <fieldset className={styles.person}>
      <legend>{legend}</legend>
      <label className={styles.field}>
        이름 또는 애칭 <span className={styles.optional}>(선택)</span>
        <input type="text" maxLength={20} value={person.name} onChange={(event) => set("name", event.target.value)} autoComplete="off" />
      </label>
      <div className={styles.row}>
        <label className={styles.field}>
          생년월일
          <input {...birthDateTextInputProps(person.birthDate, (next) => set("birthDate", next))} required />
        </label>
        <label className={styles.field}>
          양력/음력
          <select value={person.calendarType} onChange={(event) => set("calendarType", event.target.value === "lunar" ? "lunar" : "solar")}>
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
        </label>
      </div>
      {person.calendarType === "lunar" ? (
        <label className={styles.check}>
          <input type="checkbox" checked={person.isLeapMonth} onChange={(event) => set("isLeapMonth", event.target.checked)} />
          윤달이에요
        </label>
      ) : null}
      <div className={styles.row}>
        <label className={styles.field}>
          태어난 시간
          <BirthTimeInput value={person.birthTime} disabled={person.birthTimeUnknown} onChange={(event) => set("birthTime", event.target.value)} />
        </label>
        <fieldset className={styles.gender}>
          <legend>성별</legend>
          {(["female", "male"] as const).map((value) => (
            <label key={value} className={styles.choice}>
              <input type="radio" name={`${legend}-gender`} value={value} checked={person.gender === value} onChange={() => set("gender", value)} />
              {value === "female" ? "여성" : "남성"}
            </label>
          ))}
        </fieldset>
      </div>
      <label className={styles.check}>
        <input type="checkbox" checked={person.birthTimeUnknown} onChange={(event) => onChange({ ...person, birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? "" : person.birthTime })} />
        태어난 시간을 몰라요 (시주 없이 계산하고 결과에 표시해 드려요)
      </label>
    </fieldset>
  );
}

export default function SajuCompatPremiumClient() {
  const [input, setInput] = useState<PremiumInput>(() => ({ self: emptyPerson(), partner: emptyPerson(), relationType: "dating" }));
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lockRef = useRef(false);

  // 사주 탭 무료 궁합에서 넘어왔으면 두 사람 입력을 채운다. 서버 렌더와 어긋나지 않게 마운트 뒤에 한 번만 읽는다(읽으면 지워진다).
  useEffect(() => {
    const prefill = readPremiumPrefill();
    if (prefill) setInput(prefill);
  }, []);
  const idempotencyKeyRef = useRef("");
  const captureDeliveryScope = usePaidDeliveryScope(() => {
    lockRef.current = false;
    idempotencyKeyRef.current = "";
    setStatus("idle");
    setError("");
    setNotice("");
  });

  // 결과 화면으로 넘기기 전에 요청 키를 비운다 — 뒤로 가기로 돌아와 다른 상대로 보내도 이전 키와 충돌하지 않는다.
  function goToResult(sessionId: string) {
    idempotencyKeyRef.current = "";
    window.location.assign(resultHref(sessionId));
  }

  // 게이트 없는 코어: 첫 /generate 로 상담을 만들고 결과 화면으로 넘긴다. 이어 쓰기는 결과 화면이 맡는다.
  async function startGeneration(payload: InputPayload, idempotencyKey: string, extra: { billingGate?: Record<string, unknown> }, isCurrent: () => boolean) {
    setStatus("starting");
    const outcome = await runPremiumGeneration({
      first: { path: `${API_BASE}/generate`, body: { ...payload, ...(extra.billingGate ? { billingGate: extra.billingGate } : {}) }, idempotencyKey },
      isCurrent,
      stopAfterSession: true,
    });
    if (!isCurrent() || outcome.kind === "cancelled") return false;
    if (outcome.kind === "completed" && outcome.payload.sessionId) {
      goToResult(outcome.payload.sessionId);
      return true;
    }
    if (outcome.kind === "stalled") {
      goToResult(outcome.sessionId);
      return true;
    }
    if (outcome.kind === "retry") {
      goToResult(outcome.offer.sessionId);
      return true;
    }
    if (outcome.kind === "payment") throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
    throw new Error(outcome.kind === "refund" || outcome.kind === "error" ? outcome.message : SERVER_ERROR_MESSAGE);
  }

  const buildResume = usePaidResume(FEATURE_KEY, async (args, grant) => {
    const isCurrent = captureDeliveryScope();
    const idempotencyKey = typeof args.idempotencyKey === "string" ? args.idempotencyKey : "";
    const payload = unpackPaidResumeArg<InputPayload>(args.payload);
    if (!idempotencyKey || !payload) return false;
    lockRef.current = true;
    idempotencyKeyRef.current = idempotencyKey;
    setError("");
    try {
      return await startGeneration(payload, idempotencyKey, { billingGate: asRecord(grant?.payload) }, isCurrent);
    } catch (caught) {
      if (!isCurrent()) return false;
      setError(friendlyErrorMessage(caught, SERVER_ERROR_MESSAGE));
      setStatus("error");
      return false;
    } finally {
      if (isCurrent()) lockRef.current = false;
    }
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lockRef.current) return;
    const invalid = validate(input);
    if (invalid) {
      setError(invalid);
      return;
    }
    const isCurrent = captureDeliveryScope();
    lockRef.current = true;
    const idempotencyKey = idempotencyKeyRef.current || createIdempotencyKey();
    idempotencyKeyRef.current = idempotencyKey;
    const payload = buildInputPayload(input);
    let paymentAttempted = false;
    let accessConfirmed = false;
    setError("");
    setNotice("");
    setStatus("checking");
    beginPaidFeatureGateCheck({ featureKey: FEATURE_KEY, requestId: idempotencyKey, title: "이용권 확인", reason: FEATURE_REASON, paymentMode: "MEMBERSHIP_PASS" });
    void primePaymentEligibility(buildBillingGateInput({}, idempotencyKey));
    try {
      const checked = await runAccessCheckWithTransientRetry(async () => {
        try {
          const { response, payload: data } = await postJson<SessionPayload>(`${API_BASE}/prepare`, payload, idempotencyKey);
          return { response, data };
        } catch {
          return { status: 503, data: { ok: false as const, reason: "NETWORK_ERROR", retryable: true } };
        }
      });
      const access = checked.data as SessionPayload;
      if (access.ok) {
        accessConfirmed = true;
        completePaidFeatureGateCheck({ featureKey: FEATURE_KEY, requestId: idempotencyKey, title: "이용권 확인 완료", reason: FEATURE_REASON, paymentMode: "MEMBERSHIP_PASS", message: "이용권 확인이 끝났습니다. 두 사람의 원국을 읽고 있습니다." });
        if (!isCurrent()) return;
        await startGeneration(payload, idempotencyKey, {}, isCurrent);
        return;
      }
      if (access.reason === "LOGIN_REQUIRED") throw new Error(LOGIN_REQUIRED_MESSAGE);
      if (access.reason === "INVALID_INPUT" || access.reason === "CALCULATION_FAILED") {
        throw new Error(access.message || "입력한 생년월일로 원국을 계산하지 못했어요. 날짜와 양력/음력을 다시 확인해 주세요.");
      }
      // 이용권 확인 앞단의 일시 장애(degraded)면 막다른 길 대신 결제창을 연다(신년운세와 같은 규칙).
      const degraded = access.retryable === true || access.reason === "DB_DEGRADED";
      if (access.reason === "PAYMENT_REQUIRED" || degraded) {
        paymentAttempted = true;
        setStatus("payment");
        setNotice("이용권 또는 결제 확인이 필요해요. 결제창에서 결제 방법을 골라 주세요.");
        const gate = await runBillingCoinGate({
          ...buildBillingGateInput(asRecord(access.paymentPayload), idempotencyKey),
          resume: buildResume({ idempotencyKey, payload: packPaidResumeArg(payload) }),
        });
        if (!gate.ok || !gate.data) {
          const code = String(gate.error?.code || "").toUpperCase();
          if (code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED") throw new Error(LOGIN_REQUIRED_MESSAGE);
          if (code === "PAYMENT_CANCELLED") throw new Error(PAYMENT_CANCELLED_MESSAGE);
          throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
        }
        if (!isCurrent()) return;
        accessConfirmed = true;
        await startGeneration(payload, idempotencyKey, { billingGate: gate.data as Record<string, unknown> }, isCurrent);
        return;
      }
      throw new Error(access.message || SERVER_ERROR_MESSAGE);
    } catch (caught) {
      if (!isCurrent()) return;
      const message = caught instanceof Error ? caught.message : SERVER_ERROR_MESSAGE;
      const known = [LOGIN_REQUIRED_MESSAGE, PAYMENT_CANCELLED_MESSAGE, PAYMENT_VERIFY_FAILED_MESSAGE].includes(message);
      setError(known ? message : paymentAttempted && !accessConfirmed ? PAYMENT_VERIFY_FAILED_MESSAGE : friendlyErrorMessage(caught, message || SERVER_ERROR_MESSAGE));
      setNotice("");
      setStatus("error");
      failPaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId: idempotencyKey,
        title: accessConfirmed ? "궁합 풀이가 잠시 중단됐어요" : "이용권 확인을 다시 시도해 주세요",
        reason: FEATURE_REASON,
        paymentMode: "MEMBERSHIP_PASS",
        message,
        cancelled: message === PAYMENT_CANCELLED_MESSAGE,
      });
    } finally {
      if (isCurrent()) lockRef.current = false;
    }
  }

  const busy = status === "checking" || status === "payment" || status === "starting";
  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <PersonFields legend="나" person={input.self} onChange={(self) => setInput((prev) => ({ ...prev, self }))} />
      <PersonFields legend="상대" person={input.partner} onChange={(partner) => setInput((prev) => ({ ...prev, partner }))} />
      <label className={styles.field}>
        지금 두 사람의 관계
        <select value={input.relationType} onChange={(event) => setInput((prev) => ({ ...prev, relationType: event.target.value as RelationType }))}>
          {RELATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <ul className={styles.promise}>
        <li>합충·오행 보완·이성 기질 지표·전생 인연 카드와 연이의 네 장 풀이를 드려요.</li>
        <li>풀이가 끝까지 나오지 않으면 추가 결제·차감 없이 다시 시도하거나 환불을 요청할 수 있어요.</li>
        <li>이용권·월정석은 풀이가 완성돼 전달된 뒤에만 차감돼요.</li>
      </ul>
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button type="submit" className={styles.primary} disabled={busy}>
        {status === "starting" ? "두 사람의 원국을 읽는 중…" : busy ? "이용권 확인 중…" : "고급 궁합 보기 · 10,000원"}
      </button>
    </form>
  );
}
