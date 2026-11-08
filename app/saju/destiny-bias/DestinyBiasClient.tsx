"use client";

// 최애운명 — "내 최애 × 나 케미" 오케스트레이터.
// 7단계: hook → pick → info → computing → (슬롯 공개) → result(core) → details → share.
// 결과 카드·포토카드·공유는 무료, details(상세 케미 리포트)만 destiny-bias-analyze 단건 결제다(2026-11-08 사용자 결정 "결과 카드만 무료").
// 계산은 전부 결정론(lib/idol-chemi). 생년월일은 계산·구매 결과 조회에만 쓰며, 저장 원문·URL·공유 카드에는 넣지 않는다.

import { RecommendationResult } from "@/app/components/recommendations/RecommendationResult";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import {
  CHEMI_TYPE_BY_ID,
  MIN_SELF_CONSENT_AGE,
  listRosterGroups,
  resolvePartner,
  type CalendarType,
  type ChemiCopy,
  type ChemiPartnerRecord,
  type ChemiPartnerRef,
  type ChemiResult,
} from "@/lib/idol-chemi";
import { shareThrough } from "@/js/share-service.mjs";
import KakaoSdk from "@/app/components/KakaoSdk";
import { useAnalytics } from "@/app/hooks/useAnalytics";
import { useBackNavigation } from "@/app/hooks/useBackNavigation";
import { readSanitizedAuthUser } from "@/app/_lib/auth-storage";
import { AUTH_SESSION_INVALIDATED_EVENT } from "@/app/_lib/auth-client";
import { paidDetailsIdentity } from "@/lib/idol-chemi/paid-details-key.mjs";
import { PaidDetailsError, requestPaidDetails } from "./lib/paidDetails";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";
import { readCurrentDestinyProfile, resolveDestinyProfileBirthParts } from "@/app/_lib/profile-card-storage";
import {
  clearFeatureSessionDraft,
  readFeatureSessionDraft,
  writeFeatureSessionDraft,
} from "@/app/_lib/feature-session-draft";
import { useDestinyBiasTouchGuard } from "./lib/destinyBiasTouchGuard";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import { packPaidResumeArg, unpackPaidResumeArg, usePaidResume } from "@/app/hooks/usePaidResume";
import { resolveServerFeaturePricing } from "@/lib/payment/server-feature-pricing";
import ChemiHook from "./components/chemi/ChemiHook";
import IdolPicker from "./components/chemi/IdolPicker";
import MyInfoPanel, { type MyInfoValue } from "./components/chemi/MyInfoPanel";
import ChemiComputing from "./components/chemi/ChemiComputing";
import ChemiSlotReveal from "./components/chemi/ChemiSlotReveal";
import ViralShareBar from "@/app/components/ViralShareBar";
import ChemiReportTabs from "./components/chemi/ChemiReportTabs";
import ChemiCoreCard, { toPhotocardView } from "./components/chemi/ChemiCoreCard";
import PhotocardDeco from "./components/chemi/PhotocardDeco";
import BiasPhotoPicker from "./components/chemi/BiasPhotoPicker";
import { DEFAULT_PHOTOCARD_THEME, PHOTOCARD_THEMES } from "./components/chemi/PhotocardFace";
import {
  DEFAULT_BIAS_MOOD,
  DEFAULT_RELATION_MOOD,
  RELATION_MOODS,
  RELATION_MOODS_MINOR,
  buildChemiReport,
  type ChemiReport,
} from "./engine/chemiReportBridge";
import ChemiTypeBadge from "./components/chemi/ChemiTypeBadge";
import ChemiSections from "./components/chemi/ChemiSections";
import ChemiEvidencePanel from "./components/chemi/ChemiEvidencePanel";
import ChemiShareBar, { type ShareBarStatus } from "./components/chemi/ChemiShareBar";
import ChemiShareCard, { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH, type ShareRatio } from "./components/chemi/ChemiShareCard";
import MemberSwitcher from "./components/chemi/MemberSwitcher";
import RecentResults from "./components/chemi/RecentResults";
import TypeCollection from "./components/chemi/TypeCollection";
import {
  collectedTypeIds,
  pushRecentPartner,
  pushRecentResult,
  readRecentPartners,
  readRecentResults,
  type RecentResultEntry,
} from "./components/chemi/chemiStorage";
import styles from "./destiny-bias.module.css";

type Step = "hook" | "pick" | "info" | "computing" | "result";
type Outcome = { report: ChemiReport; result: ChemiResult; copy: ChemiCopy; partner: ChemiPartnerRecord };
type Moods = { biasMood: string; relationMood: string };
type ProfileSeed = { birthDateInput: string; calendarType: CalendarType; fromProfile: boolean };
type StoredAuthUser = { id?: string; userId?: string; birthDate?: string } | null;
type Draft = { step: Step; partnerRef: ChemiPartnerRef | null };

const DESTINY_BIAS_DRAFT_FEATURE_KEY = "saju-destiny-bias";
const DESTINY_BIAS_ANALYZE_FEATURE_KEY = "destiny-bias-analyze";
const DESTINY_BIAS_ANALYZE_PRICING = resolveServerFeaturePricing({ featureKey: DESTINY_BIAS_ANALYZE_FEATURE_KEY });
const FUNNEL = "destiny_bias_chemi";
const FEATURE_PATH = "/saju/destiny-bias/";
const COMPUTING_MIN_MS = 650;
const COMPUTING_MAX_MS = 1200;

function getDestinyBiasDraftScope() {
  const profile = readCurrentDestinyProfile();
  return {
    featureKey: DESTINY_BIAS_DRAFT_FEATURE_KEY,
    profileId: String(profile?.id || "anonymous"),
    route: window.location.pathname || "/saju/destiny-bias",
  };
}

function normalizeBirthDateText(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 8 ? digits : "";
}

function normalizeCalendarType(value: unknown, leap: unknown): CalendarType {
  const raw = String(value || "").toLowerCase();
  if (raw.includes("lunar") || raw === "음력") return leap ? "lunar_leap" : "lunar";
  return "solar";
}

/** 프로필 카드 → 로그인 사용자 순으로 생년월일 시드를 읽는다(verify-profile-card-action-policy 계약). */
function readCurrentProfileSeed(): ProfileSeed {
  const empty: ProfileSeed = { birthDateInput: "", calendarType: "solar", fromProfile: false };
  if (typeof window === "undefined") return empty;
  try {
    const user = readSanitizedAuthUser() as StoredAuthUser;
    const profile = readCurrentDestinyProfile();
    const profileBirth = resolveDestinyProfileBirthParts(profile);
    const profileBirthDateInput = profileBirth
      ? `${String(profileBirth.year).padStart(4, "0")}${String(profileBirth.month).padStart(2, "0")}${String(profileBirth.day).padStart(2, "0")}`
      : "";
    const fallbackBirthDateInput = normalizeBirthDateText(user?.birthDate);
    const birthDateInput = profileBirthDateInput || fallbackBirthDateInput;
    return {
      birthDateInput: profileBirthDateInput || fallbackBirthDateInput,
      calendarType: profileBirthDateInput
        ? normalizeCalendarType(profile?.calendarType || profile?.calType || profile?.birth?.calType, profile?.isLeapMonth)
        : "solar",
      fromProfile: Boolean(birthDateInput && profileBirthDateInput),
    };
  } catch {
    return empty;
  }
}

function readLocalToken() {
  if (typeof window === "undefined") return "";
  try {
    return String(localStorage.getItem("fortune_auth_token") || "").trim();
  } catch {
    return "";
  }
}

function isLoggedInNow() {
  const token = readLocalToken();
  if (token) return true;
  try {
    const user = readSanitizedAuthUser() as StoredAuthUser;
    return Boolean(user?.id || user?.userId);
  } catch {
    return false;
  }
}

function todayKst() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function toIsoDate(digits: string) {
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function validateBirthInput(digits: string): string {
  if (digits.length !== 8) return "생년월일 8자리를 입력해 주세요.";
  const y = Number(digits.slice(0, 4));
  const m = Number(digits.slice(4, 6));
  const d = Number(digits.slice(6, 8));
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return "실제 날짜가 아니에요. 다시 확인해 주세요.";
  return "";
}

function engineErrorMessage(caught: unknown) {
  const code = String((caught as Error)?.message || "");
  if (code.includes("USER_UNDER_CONSENT_AGE")) return `만 ${MIN_SELF_CONSENT_AGE}세 이상만 이용할 수 있어요.`;
  if (code.includes("BIRTH_DATE_INVALID")) return "생년월일을 다시 확인해 주세요. 음력이면 달력을 음력으로 바꿔 주세요.";
  if (code.includes("PARTNER")) return "선택한 최애 정보를 불러오지 못했어요. 다른 최애를 골라 주세요.";
  return friendlyErrorMessage(caught, "계산 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
}

/** 상세 리포트 해금 단위: 같은 최애 × 같은 생일. 무드·테마를 바꿔도 다시 결제하지 않는다. */
function detailsKeyFor(partner: ChemiPartnerRef, infoValue: MyInfoValue) {
  return `${partner.kind}:${partner.id}:${infoValue.birthDateInput}:${infoValue.calendarType}`;
}

function buildInviteUrl(partner: ChemiPartnerRef, channel: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://code-destiny.com";
  const key = partner.kind === "roster" ? "m" : "p";
  return `${origin}${FEATURE_PATH}?${key}=${encodeURIComponent(partner.id)}&utm_source=${encodeURIComponent(channel)}&utm_medium=share&utm_campaign=public_share`;
}

async function waitForImages(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
    ),
  );
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function DestinyBiasClient() {
  const router = useRouter();
  const { ensurePaidAccess, isPaying } = useCoinGate();
  // 정적 export 에서 useSearchParams 는 Suspense 경계를 요구하므로 마운트 시 location 을 직접 읽는다.
  const [searchParams] = useState(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search)));
  const reduceMotion = useReducedMotion();
  const { trackClick, trackShare, trackFunnelStep } = useAnalytics();
  const { guardHandlers, shouldBlockClick } = useDestinyBiasTouchGuard();

  const [step, setStep] = useState<Step>("hook");
  const [partner, setPartner] = useState<ChemiPartnerRecord | null>(null);
  const [info, setInfo] = useState<MyInfoValue>({ birthDateInput: "", calendarType: "solar" });
  const [seededFromProfile, setSeededFromProfile] = useState(false);
  const [infoError, setInfoError] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [recentPartners, setRecentPartners] = useState<ChemiPartnerRef[]>([]);
  const [recentResults, setRecentResults] = useState<RecentResultEntry[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareStatus, setShareStatus] = useState<ShareBarStatus>(null);
  const [hydrated, setHydrated] = useState(false);

  const [shareRatio, setShareRatio] = useState<ShareRatio>("square");
  const [shareNickname, setShareNickname] = useState("");
  const [showNickname, setShowNickname] = useState(true);

  // 포카 꾸미기·최애 사진: 무드는 리포트를 다시 계산하고, 테마·사진은 표시만 바꾼다. 사진은 메모리에만 둔다.
  const [themeKey, setThemeKey] = useState<string>(DEFAULT_PHOTOCARD_THEME);
  const [moods, setMoods] = useState<Moods>({ biasMood: DEFAULT_BIAS_MOOD, relationMood: DEFAULT_RELATION_MOOD });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [resultSeq, setResultSeq] = useState(0);
  const [revealing, setRevealing] = useState(false);
  const [savedDetails, setSavedDetails] = useState<Record<string, ChemiReport>>({});
  const [detailsBusy, setDetailsBusy] = useState(false);
  const detailsLock = useRef(false);
  const accountRevision = useRef(0);
  const accountOwner = useRef("");
  const [detailsError, setDetailsError] = useState("");

  const coreCardRef = useRef<HTMLDivElement | null>(null);
  const shareCanvasRef = useRef<HTMLDivElement | null>(null);
  const computingTokenRef = useRef(0);
  const entryTrackedRef = useRef(false);
  useEffect(() => {
    const readOwner = () => {
      const user = readSanitizedAuthUser();
      return String(user?.id || user?.userId || user?._id || "");
    };
    accountOwner.current = readOwner();
    const invalidate = (event: Event) => {
      const owner = readOwner();
      if (owner === accountOwner.current && event.type !== AUTH_SESSION_INVALIDATED_EVENT) return;
      accountOwner.current = owner;
      accountRevision.current += 1;
      setSavedDetails({});
      setDetailsError("");
      setLoggedIn(isLoggedInNow());
    };
    window.addEventListener("cd:auth-changed", invalidate);
    window.addEventListener(AUTH_SESSION_INVALIDATED_EVENT, invalidate);
    window.addEventListener("storage", invalidate);
    return () => {
      window.removeEventListener("cd:auth-changed", invalidate);
      window.removeEventListener(AUTH_SESSION_INVALIDATED_EVENT, invalidate);
      window.removeEventListener("storage", invalidate);
    };
  }, []);
  const groups = useMemo(() => listRosterGroups(), []);
  const groupNames = useMemo(() => groups.map((g) => g.nameKo), [groups]);
  const totalMembers = useMemo(() => groups.reduce((n, g) => n + g.memberCount, 0), [groups]);
  const collected = useMemo(() => collectedTypeIds(recentResults), [recentResults]);
  const from = searchParams?.get("from") || (searchParams?.get("utm_medium") === "share" ? "share" : "direct");

  // 초기화: 프로필 시드·최근 기록·드래프트·딥링크(?m= / ?p=)
  useEffect(() => {
    const seed = readCurrentProfileSeed();
    setInfo({ birthDateInput: seed.birthDateInput, calendarType: seed.calendarType });
    setSeededFromProfile(seed.fromProfile);
    setRecentPartners(readRecentPartners());
    setRecentResults(readRecentResults());
    setLoggedIn(isLoggedInNow());

    let nextStep: Step = "hook";
    let nextPartner: ChemiPartnerRecord | null = null;
    const deepMember = searchParams?.get("m");
    const deepPreset = searchParams?.get("p");
    const deepRef: ChemiPartnerRef | null = deepMember ? { kind: "roster", id: deepMember } : deepPreset ? { kind: "preset", id: deepPreset } : null;
    if (deepRef) {
      nextPartner = resolvePartner(deepRef);
      if (nextPartner) nextStep = "info";
    }
    if (!nextPartner) {
      try {
        const draft = readFeatureSessionDraft<Draft>(getDestinyBiasDraftScope());
        const ref = draft?.value?.partnerRef;
        if (ref) {
          nextPartner = resolvePartner(ref);
          if (nextPartner) nextStep = draft?.value?.step === "info" || draft?.value?.step === "result" ? "info" : "pick";
        }
      } catch {
        // 드래프트 손상은 무시
      }
    }
    setPartner(nextPartner);
    setStep(nextStep);
    setHydrated(true);

    if (!entryTrackedRef.current) {
      entryTrackedRef.current = true;
      trackFunnelStep({ funnel: FUNNEL, step: "entry", stepIndex: 1 });
      trackClick("destiny_bias_entry", { from, deep_link: Boolean(deepRef) });
    }
    // searchParams 는 마운트 시 1회만 읽는다(딥링크 재진입은 새 마운트).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 드래프트: partnerRef + step 만 (생일 미저장)
  useEffect(() => {
    if (!hydrated) return;
    try {
      const scope = getDestinyBiasDraftScope();
      if (step === "hook" && !partner) clearFeatureSessionDraft(scope);
      else writeFeatureSessionDraft<Draft>(scope, { step, partnerRef: partner ? { kind: partner.kind, id: partner.id } : null });
    } catch {
      // 세션 저장 실패 무시
    }
  }, [hydrated, step, partner]);

  // 결과 도착 시 포커스 이동(스크린리더·키보드)
  useEffect(() => {
    if (step !== "result" || !resultSeq || revealing) return;
    const node = coreCardRef.current;
    if (!node) return;
    node.focus({ preventScroll: true });
    node.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, [step, resultSeq, reduceMotion, revealing]);

  useBackNavigation({
    scope: "analysis",
    canGoBack: () => step !== "hook",
    onBack: () => {
      if (step === "result") setStep("info");
      else if (step === "info") setStep("pick");
      else if (step === "pick") setStep("hook");
      else return false;
      return true;
    },
  });

  const selectPartner = useCallback(
    (next: ChemiPartnerRecord) => {
      setPartner(next);
      setInfoError("");
      setShareStatus(null);
      setRecentPartners(pushRecentPartner({ kind: next.kind, id: next.id }));
      trackFunnelStep({ funnel: FUNNEL, step: "idol_selected", stepIndex: 2 });
      trackClick("destiny_bias_idol_selected", { partner_kind: next.kind, group_id: next.groupId || "preset" });
      setStep("info");
    },
    [trackClick, trackFunnelStep],
  );

  const computeCore = useCallback(
    async (target: ChemiPartnerRecord, infoValue: MyInfoValue, source: "form" | "switch" | "replay") => {
      const digits = infoValue.birthDateInput;
      const validation = validateBirthInput(digits);
      if (validation) {
        setInfoError(validation);
        setStep("info");
        return;
      }
      setInfoError("");
      setShareStatus(null);
      setDetailsError("");
      const token = ++computingTokenRef.current;
      setStep("computing");
      const startedAt = Date.now();
      let next: Outcome | null = null;
      let failure = "";
      try {
        const report = buildChemiReport({
          user: { birthDate: toIsoDate(digits), calendarType: infoValue.calendarType },
          partner: target,
          moods,
          themeKey,
          themeLabel: PHOTOCARD_THEMES.find((theme) => theme.key === themeKey)?.label,
          referenceDate: todayKst(),
        });
        next = { report, result: report.result, copy: report.copy, partner: target };
      } catch (caught) {
        failure = engineErrorMessage(caught);
      }
      const elapsed = Date.now() - startedAt;
      const wait = reduceMotion ? 0 : Math.min(COMPUTING_MAX_MS, Math.max(0, COMPUTING_MIN_MS - elapsed));
      if (wait > 0) await sleep(wait);
      if (computingTokenRef.current !== token) return;

      if (!next) {
        setInfoError(failure);
        setStep("info");
        return;
      }
      setOutcome(next);
      setRevealing(!reduceMotion);
      setResultSeq((value) => value + 1);
      setStep("result");
      setRecentResults(
        pushRecentResult({
          partner: { kind: target.kind, id: target.id },
          partnerName: target.displayName,
          groupLabel: target.groupLabel,
          chemiTypeId: next.result.chemiTypeId,
          chemiTypeNameKo: next.result.chemiTypeNameKo,
          oneLiner: next.copy.oneLiner,
          minorMode: next.result.minorMode,
          engineVersion: next.result.engineVersion,
          totalScore: next.report.totalScore,
          grade: next.report.grade,
          at: new Date().toISOString(),
        }),
      );
      if (source === "form") trackFunnelStep({ funnel: FUNNEL, step: "profile_ready", stepIndex: 3 });
      trackFunnelStep({ funnel: FUNNEL, step: "result_complete", stepIndex: 4 });
      trackClick("destiny_bias_result_complete", {
        chemi_type_id: next.result.chemiTypeId,
        group_id: target.groupId || "preset",
        minor_mode: next.result.minorMode,
        signal_strength: next.result.signalStrength,
        calendar: infoValue.calendarType,
        from,
        source,
      });
    },
    [from, moods, reduceMotion, themeKey, trackClick, trackFunnelStep],
  );

  // 결과는 무료로 바로 계산한다(결제·로그인 없음).
  const compute = computeCore;

  const unlockDetails = useCallback((target: ChemiPartnerRef, infoValue: MyInfoValue, report: ChemiReport) => {
    const key = detailsKeyFor(target, infoValue);
    setSavedDetails((records) => ({ ...records, [key]: report }));
    trackFunnelStep({ funnel: FUNNEL, step: "details_unlocked", stepIndex: 5 });
  }, [trackFunnelStep]);

  // 로그인·결제 복귀 뒤: 결제 전에 만든 원문을 서버에 보관하고 연다.
  const buildAnalyzeResume = usePaidResume(DESTINY_BIAS_ANALYZE_FEATURE_KEY, async (args, grant) => {
    const payload = unpackPaidResumeArg<{
      partner: ChemiPartnerRef;
      info: MyInfoValue;
      source: "form" | "switch" | "replay";
      requestId?: string;
      report?: ChemiReport;
      profileId?: string;
    }>(args.payload);
    if (!payload) return false;
    const resumedPartner = resolvePartner(payload.partner);
    if (!resumedPartner || validateBirthInput(payload.info?.birthDateInput)) return false;
    setPartner(resumedPartner);
    setInfo(payload.info);
    const revision = accountRevision.current;
    const report = await requestPaidDetails({ partner: payload.partner, birthDate: payload.info.birthDateInput,
      calendarType: payload.info.calendarType, requestId: grant?.requestId || payload.requestId,
      report: payload.report || buildChemiReport({ user: { birthDate: toIsoDate(payload.info.birthDateInput), calendarType: payload.info.calendarType }, partner: resumedPartner, referenceDate: todayKst() }), profileId: grant?.profileId || payload.profileId,
      accessMethod: ['pass', 'family'].includes(String(grant?.payload?.accessMethod || '').toLowerCase()) ? 'pass' : '',
    }, true);
    if (!report || revision !== accountRevision.current) return false;
    setOutcome({ report, result: report.result, copy: report.copy, partner: resumedPartner });
    setRevealing(false);
    setStep("result");
    unlockDetails(resumedPartner, payload.info, report);
    return true;
  });

  /** details 단계 진입: 상세 케미 리포트는 destiny-bias-analyze 단건 결제(로그인·결제 모달은 공용 게이트가 띄운다). */
  const openDetails = useCallback(async () => {
    if (!outcome || isPaying || detailsLock.current) return;
    detailsLock.current = true;
    setDetailsBusy(true);
    const revision = accountRevision.current;
    try {
    setDetailsError("");
    trackClick("destiny_bias_details_open", { chemi_type_id: outcome.result.chemiTypeId });
    if (!DESTINY_BIAS_ANALYZE_PRICING) {
      setDetailsError("결제 가격을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    const target = outcome.partner;
    const identity = await paidDetailsIdentity({ partner: target, birthDate: info.birthDateInput, calendarType: info.calendarType });
    const input = { partner: { kind: target.kind, id: target.id }, birthDate: info.birthDateInput, calendarType: info.calendarType,
      requestId: identity.requestId, profileId: String(readCurrentDestinyProfile()?.id || ''), report: outcome.report };
    if (isLoggedInNow()) {
      const stored = await requestPaidDetails(input);
      if (revision !== accountRevision.current) return;
      if (stored) { unlockDetails(target, info, stored); return; }
      // A previous payment may have succeeded before the archive write failed. Recover it before offering payment.
      try {
        const recovered = await requestPaidDetails(input, true);
        if (revision !== accountRevision.current) return;
        if (recovered) { unlockDetails(target, info, recovered); return; }
      } catch (error) {
        if (!(error instanceof PaidDetailsError) || error.code !== 'PAYMENT_NOT_VERIFIED') throw error;
      }
    }
    let delivered = false;
    const gate = await ensurePaidAccess({
      resume: buildAnalyzeResume({
        payload: packPaidResumeArg({ ...input, info, source: "form" }),
      }),
      featureKey: DESTINY_BIAS_ANALYZE_FEATURE_KEY,
      coinPrice: DESTINY_BIAS_ANALYZE_PRICING.cost,
      cost: DESTINY_BIAS_ANALYZE_PRICING.cost,
      amountKRW: DESTINY_BIAS_ANALYZE_PRICING.amountKRW,
      reason: "최애운명 상세 케미 리포트",
      requestId: identity.requestId,
        payloadHash: identity.hash,
      onPaid: async (context) => {
          const requestId = context.accessType === 'redirect_receipt' && context.transactionId ? context.transactionId : identity.requestId;
          const stored = await requestPaidDetails({ ...input, requestId, accessMethod: context.accessSource === 'subscription' ? 'pass' : '' }, true);
        if (stored && revision === accountRevision.current) { unlockDetails(target, info, stored); delivered = true; }
      },
    });
    if (!gate.ok) {
      if (gate.code !== "PAYMENT_CANCELLED") {
        setDetailsError(gate.message || "결제를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
      return;
    }
    if (!delivered) {
        const stored = await requestPaidDetails({ ...input, accessMethod: gate.code === 'PASS_FREE' ? 'pass' : '' }, true);
      if (stored && revision === accountRevision.current) unlockDetails(target, info, stored);
    }
    } catch (error) {
      if (revision === accountRevision.current) setDetailsError(error instanceof Error ? error.message : "구매 정보를 확인하지 못했어요. 다시 결제하지 말고 잠시 후 다시 확인해 주세요.");
    } finally {
      detailsLock.current = false;
      setDetailsBusy(false);
    }
  }, [buildAnalyzeResume, ensurePaidAccess, info, isPaying, outcome, trackClick, unlockDetails]);

  /** 무드를 바꾸면 같은 입력으로 리포트만 다시 만든다(계산 화면·스크롤 이동 없음). */
  const handleMoodChange = useCallback(
    (patch: Partial<Moods>) => {
      const nextMoods = { ...moods, ...patch };
      setMoods(nextMoods);
      if (!outcome || validateBirthInput(info.birthDateInput)) return;
      try {
        const report = buildChemiReport({
          user: { birthDate: toIsoDate(info.birthDateInput), calendarType: info.calendarType },
          partner: outcome.partner,
          moods: nextMoods,
          themeKey,
          themeLabel: PHOTOCARD_THEMES.find((theme) => theme.key === themeKey)?.label,
          referenceDate: todayKst(),
        });
        setOutcome({ report, result: report.result, copy: report.copy, partner: outcome.partner });
        trackClick("destiny_bias_deco_mood", { kind: patch.biasMood ? "bias" : "relation" });
      } catch {
        // 재계산 실패 시 직전 결과를 그대로 둔다.
      }
    },
    [info, moods, outcome, themeKey, trackClick],
  );

  const handleInfoSubmit = useCallback(() => {
    if (!partner) {
      setStep("pick");
      return;
    }
    void compute(partner, info, "form");
  }, [compute, info, partner]);

  const handleSwitch = useCallback(
    (next: ChemiPartnerRecord) => {
      setPartner(next);
      setRecentPartners(pushRecentPartner({ kind: next.kind, id: next.id }));
      trackClick("destiny_bias_member_switch", { group_id: next.groupId || "preset" });
      void compute(next, info, "switch");
    },
    [compute, info, trackClick],
  );

  const handleReplay = useCallback(
    (ref: ChemiPartnerRef) => {
      const next = resolvePartner(ref);
      if (!next) return;
      setPartner(next);
      if (validateBirthInput(info.birthDateInput)) {
        setStep("info");
        return;
      }
      void compute(next, info, "replay");
    },
    [compute, info],
  );

  const resetToPick = useCallback(() => {
    computingTokenRef.current += 1;
    setOutcome(null);
    setShareStatus(null);
    setStep("pick");
    trackClick("destiny_bias_pick_another");
  }, [trackClick]);

  const shareTitle = outcome ? `${outcome.partner.displayName} × 나 = ${outcome.result.chemiTypeNameKo}` : "최애운명";

  /** 1080px 공유 카드를 PNG 로 찍는다. 실패하면 null(호출자가 폴백을 고른다). */
  const exportShareCardBlob = useCallback(async (includeDevicePhoto = false): Promise<Blob | null> => {
    const node = shareCanvasRef.current;
    if (!node) return null;
    try {
      await document.fonts?.ready;
      await waitForImages(node);
      const { toBlob } = await import("html-to-image");
      // 기기 사진은 「이미지 저장」에만 찍는다. 공유 파일을 만들 때는 사진 레이어를 걸러 실루엣 아트가 드러난다.
      const filter = (el: HTMLElement) => includeDevicePhoto || !(el instanceof HTMLElement && el.dataset.devicePhoto);
      const options = { width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT[shareRatio], pixelRatio: 1, cacheBust: true, filter };
      // 첫 호출은 이미지 인라인이 덜 끝나 null 이 나올 수 있어 1회만 재시도한다.
      return (await toBlob(node, options)) || (await toBlob(node, options));
    } catch {
      return null;
    }
  }, [shareRatio]);

  const handleShareCard = useCallback(async () => {
    if (!outcome || shareBusy) return;
    setShareBusy(true);
    setShareStatus({ tone: "info", text: "공유 카드를 준비하는 중…" });
    trackFunnelStep({ funnel: FUNNEL, step: "share_click", stepIndex: 5 });
    try {
      const blob = await exportShareCardBlob();
      const urlFor = (channel: string) => buildInviteUrl(outcome.partner, channel);
      const text = `${outcome.copy.oneLiner} — 내 최애 ${outcome.partner.displayName}와 나는 「${outcome.result.chemiTypeNameKo}」`;
      const ogImage = `${window.location.origin}/images/destiny-bias/og-default-1200x630.png`;

      let status = "unavailable";
      let channel: "link" | "etc" | "kakao" = "link";
      const file = blob ? new File([blob], `chemi-${outcome.partner.id}.png`, { type: "image/png" }) : null;
      if (file && typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: shareTitle, text, url: urlFor("native") });
          status = "shared";
          channel = "etc";
        } catch (caught) {
          status = (caught as Error)?.name === "AbortError" ? "cancelled" : "unavailable";
        }
      }
      if (status === "unavailable") {
        const res = await shareThrough("kakao", { title: shareTitle, text, url: urlFor("kakao"), image: ogImage });
        if (res.status === "opened") {
          status = "opened";
          channel = "kakao";
        }
      }
      if (status === "unavailable") {
        const res = await shareThrough("copy", { title: shareTitle, text, url: urlFor("copy") });
        status = res.status;
      }

      if (status !== "cancelled") trackShare({ feature: "destiny-bias-chemi", channel });
      if (status === "shared" || status === "opened") setShareStatus({ tone: "ok", text: "공유 창을 열었어요. 카드와 링크에는 생일이 들어가지 않아요." });
      else if (status === "copied") {
        setShareStatus({
          tone: "ok",
          text: "친구 초대 링크를 복사했어요. 원하는 곳에 붙여 넣어 주세요.",
        });
      } else if (status === "cancelled") setShareStatus(null);
      else setShareStatus({ tone: "warn", text: `복사가 막혀 있어요. 이 주소를 직접 보내 주세요: ${urlFor("copy")}` });
    } finally {
      setShareBusy(false);
    }
  }, [exportShareCardBlob, outcome, shareBusy, shareTitle, trackFunnelStep, trackShare]);

  const handleSaveImage = useCallback(async () => {
    if (!outcome || shareBusy) return;
    setShareBusy(true);
    setShareStatus({ tone: "info", text: "카드 이미지를 만드는 중…" });
    try {
      const blob = await exportShareCardBlob(true);
      if (!blob) throw new Error("IMAGE_EXPORT_EMPTY");
      await downloadBlob(blob, `chemi-${outcome.partner.id}-${outcome.result.chemiTypeId}-${shareRatio}.png`);
      trackShare({ feature: "destiny-bias-chemi", channel: "download" });
      trackFunnelStep({ funnel: FUNNEL, step: "share_click", stepIndex: 5 });
      setShareStatus({ tone: "ok", text: "이미지를 저장했어요. 카드에는 생일이 들어가지 않아요." });
    } catch (caught) {
      setShareStatus({ tone: "warn", text: friendlyErrorMessage(caught, "이미지를 만들지 못했어요. 화면을 캡처해 주세요.") });
    } finally {
      setShareBusy(false);
    }
  }, [exportShareCardBlob, outcome, shareBusy, shareRatio, trackFunnelStep, trackShare]);

  /** 인스타그램은 웹 공유 주소가 없어 카드 저장 + 링크 복사 후 스토리 업로드를 안내한다. */
  const handleShareToInstagram = useCallback(async () => {
    if (!outcome || shareBusy) return;
    setShareBusy(true);
    setShareStatus({ tone: "info", text: "인스타그램용 카드를 준비하는 중…" });
    try {
      const blob = await exportShareCardBlob(true);
      if (blob) await downloadBlob(blob, `chemi-${outcome.partner.id}-${outcome.result.chemiTypeId}-${shareRatio}.png`);
      const url = buildInviteUrl(outcome.partner, "instagram");
      const copied = await shareThrough("copy", { title: shareTitle, text: "", url });
      trackShare({ feature: "destiny-bias-chemi", channel: "etc" });
      const saved = blob ? "카드를 저장" : "";
      const linked = copied.status === "copied" ? "링크를 복사" : "";
      const done = [saved, linked].filter(Boolean).join("하고 ");
      setShareStatus(
        done
          ? { tone: "ok", text: `${done}했어요. 인스타그램 스토리에 카드를 올리고 링크 스티커에 붙여 넣어 주세요.` }
          : { tone: "warn", text: `카드를 만들지 못했어요. 화면을 캡처하고 이 주소를 붙여 넣어 주세요: ${url}` },
      );
    } finally {
      setShareBusy(false);
    }
  }, [exportShareCardBlob, outcome, shareBusy, shareRatio, shareTitle, trackShare]);

  const detailReport = outcome ? savedDetails[detailsKeyFor(outcome.partner, info)] : null;
  const detailsUnlocked = Boolean(detailReport);

  const stickyLabel = step === "hook" ? "내 최애 고르기" : step === "info" ? "케미 계산하기" : "";
  const stickyAction = () => {
    if (step === "hook") setStep("pick");
    else if (step === "info") handleInfoSubmit();
    else if (step === "result") void handleShareCard();
  };

  return (
    <div className={`${styles.page} ${hydrated ? styles.pageReady : ""}`} data-step={step}>
      <KakaoSdk />
      <main className={`${styles.frame} ${stickyLabel ? styles.stickyCtaSafe : ""}`}>
        {step === "hook" ? <ChemiHook groupNames={groupNames} totalMembers={totalMembers} onStart={() => setStep("pick")} /> : null}

        {step === "pick" ? (
          <IdolPicker
            recent={recentPartners}
            selected={partner ? { kind: partner.kind, id: partner.id } : null}
            isLoggedIn={loggedIn}
            onSelect={selectPartner}
            onBack={() => setStep("hook")}
          />
        ) : null}

        {step === "info" && partner ? (
          <MyInfoPanel
            partner={partner}
            value={info}
            error={infoError}
            seededFromProfile={seededFromProfile}
            onChange={(next) => {
              setInfo(next);
              setSeededFromProfile(false);
              if (infoError) setInfoError("");
            }}
            onSubmit={handleInfoSubmit}
            onBack={() => setStep("pick")}
          />
        ) : null}

        {step === "computing" && partner ? <ChemiComputing partnerName={partner.displayName} /> : null}

        {step === "result" && outcome && revealing ? (
          <ChemiSlotReveal
            partner={outcome.partner}
            typeId={outcome.result.chemiTypeId}
            typeName={outcome.result.chemiTypeNameKo}
            onDone={() => setRevealing(false)}
          />
        ) : null}

        {step === "result" && outcome && !revealing ? (
          <section className={styles.result} aria-labelledby="dbk-result-title">
            <h2 id="dbk-result-title" className="sr-only">케미 결과</h2>
            <ChemiCoreCard ref={coreCardRef} report={outcome.report} themeKey={themeKey} photoUrl={photoUrl} />
            <BiasPhotoPicker
              photoUrl={photoUrl}
              onPhotoChange={(next) => {
                setPhotoUrl(next);
                trackClick("destiny_bias_deco_photo", { action: next ? "set" : "clear" });
              }}
            />
            <ChemiShareBar
              busy={shareBusy}
              status={shareStatus}
              onShareCard={() => void handleShareCard()}
              onSaveImage={() => void handleSaveImage()}
              onShareToInstagram={() => void handleShareToInstagram()}
              onPickAnother={resetToPick}
            />
            {/* X·스레드·링크 복사. 이미지 저장은 위 공유 카드(포토카드) 노드 버튼이 맡는다. 해제 조건 없음. */}
            <ViralShareBar
              className={styles.viralShare}
              url={buildInviteUrl(outcome.partner, "share_bar")}
              text={`내 최애 ${outcome.partner.displayName}와 나는 「${outcome.result.chemiTypeNameKo}」 #최애운명`}
              title={shareTitle}
              feature="destiny-bias-chemi"
              onShared={() => trackFunnelStep({ funnel: FUNNEL, step: "share_click", stepIndex: 5 })}
            />
            <ChemiShareCard
              ref={shareCanvasRef}
              view={toPhotocardView(outcome.report, { themeKey, nickname: showNickname ? shareNickname : "" })}
              photoUrl={photoUrl}
              ratio={shareRatio}
              nickname={shareNickname}
              showNickname={showNickname}
              onRatioChange={setShareRatio}
              onNicknameChange={setShareNickname}
              onShowNicknameChange={setShowNickname}
            />
            <PhotocardDeco
              themeKey={themeKey}
              biasMood={outcome.report.vm.biasMood}
              relationMood={outcome.report.vm.relationMood}
              relationMoods={outcome.report.minorMode ? RELATION_MOODS_MINOR : RELATION_MOODS}
              onThemeChange={(key) => {
                setThemeKey(key);
                trackClick("destiny_bias_deco_theme", { theme: key });
              }}
              onBiasMoodChange={(biasMood) => handleMoodChange({ biasMood })}
              onRelationMoodChange={(relationMood) => handleMoodChange({ relationMood })}
            />
            {detailsUnlocked ? (
              <>
                <ChemiSections copy={detailReport!.copy} />
                <ChemiReportTabs vm={detailReport!.vm} onOpen={(tab) => trackClick("destiny_bias_report_tab", { tab })} />
                <ChemiEvidencePanel result={detailReport!.result} />
              </>
            ) : (
              <section className={`${styles.sectionCard} ${styles.detailsLock}`} aria-labelledby="dbk-details-lock-title">
                <h3 id="dbk-details-lock-title" className={styles.sectionTitle}>상세 케미 리포트</h3>
                <p className={styles.sectionBody}>
                  카드와 공유는 무료예요. 왜 이 케미인지 자세히 보려면 상세 리포트를 열어 주세요.
                </p>
                <ul className={styles.detailsLockList}>
                  <li>케미 포인트 3가지와 명식 근거</li>
                  <li>상상 시나리오 · 티키타카 주의 구간</li>
                  <li>오행 차트 · 5가지 풀이 · 덕질 리포트 탭</li>
                  <li>연·월·일주 근거표</li>
                </ul>
                <button type="button" className={styles.ctaPrimary} onClick={() => void openDetails()} disabled={isPaying || detailsBusy} aria-busy={isPaying || detailsBusy}>
                  {isPaying || detailsBusy
                    ? "이용권 확인 중"
                    : DESTINY_BIAS_ANALYZE_PRICING ? `상세 리포트 열기 · ${DESTINY_BIAS_ANALYZE_PRICING.amountKRW.toLocaleString("ko-KR")}원` : "가격 확인 중"}
                </button>
                <p className={styles.shareStatus}>같은 최애와 생일의 저장된 구매 결과를 먼저 확인해요. 기존 결과는 추가 결제 없이 다시 볼 수 있어요.</p>
                {detailsError ? (
                  <p className={styles.shareStatus} role="alert" data-tone="warn">
                    {detailsError}
                  </p>
                ) : null}
                <ul className={styles.noticeList} aria-label="안내">
                  {outcome.copy.notices.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </section>
            )}
            <MemberSwitcher current={outcome.partner} onSwitch={handleSwitch} />
            <TypeCollection collected={collected} currentTypeId={outcome.result.chemiTypeId} />
            <RecentResults items={recentResults.filter((r) => r.partner.id !== outcome.partner.id)} onReplay={handleReplay} />
            <RecommendationResult service="destiny-bias" groupId={outcome.partner.groupId || ""}/>
            <p className={styles.footLinks}>
              <button type="button" className={styles.linkButton} onClick={() => router.push("/saju/")}>
                다른 사주 콘텐츠 보기
              </button>
            </p>
          </section>
        ) : null}

        {step === "hook" && recentResults.length > 0 ? (
          <>
            <RecentResults items={recentResults} onReplay={handleReplay} />
            <TypeCollection collected={collected} />
          </>
        ) : null}

        {step === "hook" && recentResults.length === 0 ? (
          <section className={styles.typePreview} aria-label="케미 유형 미리보기">
            {(["telepathy", "accel-brake", "slow-burn"] as const).map((id) => (
              <ChemiTypeBadge key={id} typeId={id} nameKo={CHEMI_TYPE_BY_ID[id].nameKo} shortKo={CHEMI_TYPE_BY_ID[id].shortKo} size="sm" />
            ))}
          </section>
        ) : null}
      </main>

      {stickyLabel ? (
        <div className={`fixed inset-x-0 bottom-0 md:hidden ${styles.stickyCtaBar}`} {...guardHandlers}>
          <button
            type="button"
            className={styles.ctaPrimary}
            disabled={shareBusy || isPaying}
            onClick={(event) => {
              if (shouldBlockClick()) {
                event.preventDefault();
                return;
              }
              stickyAction();
            }}
          >
            {isPaying ? "이용권 확인 중" : stickyLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
