"use client";

// 최애운명 — "내 최애 × 나 케미" 오케스트레이터.
// 7단계: hook → pick → info → computing → result(core) → details → share.
// 계산은 전부 결정론(lib/idol-chemi). 생년월일은 메모리·프로필 카드에서만 쓰고 저장·URL·카드에 넣지 않는다.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import {
  CHEMI_TYPE_BY_ID,
  MIN_SELF_CONSENT_AGE,
  listRosterGroups,
  resolvePartner,
  runChemi,
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
import { getApiBaseUrl } from "@/app/_lib/api-config";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";
import { readCurrentDestinyProfile, resolveDestinyProfileBirthParts } from "@/app/_lib/profile-card-storage";
import {
  clearFeatureSessionDraft,
  readFeatureSessionDraft,
  writeFeatureSessionDraft,
} from "@/app/_lib/feature-session-draft";
import { useDestinyBiasTouchGuard } from "./lib/destinyBiasTouchGuard";
import ChemiHook from "./components/chemi/ChemiHook";
import IdolPicker from "./components/chemi/IdolPicker";
import MyInfoPanel, { type MyInfoValue } from "./components/chemi/MyInfoPanel";
import ChemiComputing from "./components/chemi/ChemiComputing";
import ChemiCoreCard from "./components/chemi/ChemiCoreCard";
import ChemiTypeBadge from "./components/chemi/ChemiTypeBadge";
import ChemiSections from "./components/chemi/ChemiSections";
import ChemiEvidencePanel from "./components/chemi/ChemiEvidencePanel";
import ChemiShareBar, { type ShareBarStatus } from "./components/chemi/ChemiShareBar";
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
type Outcome = { result: ChemiResult; copy: ChemiCopy; partner: ChemiPartnerRecord };
type ProfileSeed = { birthDateInput: string; calendarType: CalendarType; fromProfile: boolean };
type StoredAuthUser = { id?: string; userId?: string; birthDate?: string } | null;
type Draft = { step: Step; partnerRef: ChemiPartnerRef | null };

const DESTINY_BIAS_DRAFT_FEATURE_KEY = "saju-destiny-bias";
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

function buildInviteUrl(partner: ChemiPartnerRef, channel: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://code-destiny.com";
  const key = partner.kind === "roster" ? "m" : "p";
  return `${origin}${FEATURE_PATH}?${key}=${encodeURIComponent(partner.id)}&utm_source=${encodeURIComponent(channel)}&utm_medium=share&utm_campaign=public_share`;
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
  const [savedToCollection, setSavedToCollection] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const coreCardRef = useRef<HTMLDivElement | null>(null);
  const computingTokenRef = useRef(0);
  const entryTrackedRef = useRef(false);

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
    if (step !== "result" || !outcome) return;
    const node = coreCardRef.current;
    if (!node) return;
    node.focus({ preventScroll: true });
    node.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, [step, outcome, reduceMotion]);

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
      setSavedToCollection(false);
      setShareStatus(null);
      setRecentPartners(pushRecentPartner({ kind: next.kind, id: next.id }));
      trackFunnelStep({ funnel: FUNNEL, step: "idol_selected", stepIndex: 2 });
      trackClick("destiny_bias_idol_selected", { partner_kind: next.kind, group_id: next.groupId || "preset" });
      setStep("info");
    },
    [trackClick, trackFunnelStep],
  );

  const compute = useCallback(
    async (target: ChemiPartnerRecord, infoValue: MyInfoValue, source: "form" | "switch" | "replay") => {
      const digits = infoValue.birthDateInput;
      const validation = validateBirthInput(digits);
      if (validation) {
        setInfoError(validation);
        setStep("info");
        return;
      }
      setInfoError("");
      setSavedToCollection(false);
      setShareStatus(null);
      const token = ++computingTokenRef.current;
      setStep("computing");
      const startedAt = Date.now();
      let next: Outcome | null = null;
      let failure = "";
      try {
        const { result, copy } = runChemi({
          user: {
            birthDate: toIsoDate(digits),
            calendarType: infoValue.calendarType,
            isLeapMonth: infoValue.calendarType === "lunar_leap",
          },
          partner: { kind: target.kind, id: target.id },
          referenceDate: todayKst(),
        });
        next = { result, copy, partner: target };
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
    [from, reduceMotion, trackClick, trackFunnelStep],
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

  const handleInvite = useCallback(async () => {
    if (!outcome) return;
    const url = buildInviteUrl(outcome.partner, "copy");
    trackShare({ feature: "destiny-bias-chemi", channel: "link" });
    trackFunnelStep({ funnel: FUNNEL, step: "share_click", stepIndex: 5 });
    const res = await shareThrough("copy", { title: shareTitle, text: outcome.copy.oneLiner, url });
    setShareStatus(
      res.status === "copied"
        ? { tone: "ok", text: "친구에게 보낼 링크를 복사했어요. 친구는 자기 생일만 넣으면 같은 최애와 케미를 볼 수 있어요." }
        : { tone: "warn", text: `복사가 막혀 있어요. 이 주소를 직접 보내 주세요: ${url}` },
    );
  }, [outcome, shareTitle, trackFunnelStep, trackShare]);

  const handleShareCard = useCallback(async () => {
    if (!outcome || shareBusy) return;
    setShareBusy(true);
    trackFunnelStep({ funnel: FUNNEL, step: "share_click", stepIndex: 5 });
    try {
      const url = buildInviteUrl(outcome.partner, "native");
      const text = `${outcome.copy.oneLiner} — 내 최애 ${outcome.partner.displayName}와 나는 「${outcome.result.chemiTypeNameKo}」`;
      let res = await shareThrough("native", { title: shareTitle, text, url });
      if (res.status === "unavailable") {
        res = await shareThrough("kakao", { title: shareTitle, text, url, image: `${window.location.origin}/images/destiny-bias/og-default-1200x630.png` });
        if (res.status !== "opened") res = await shareThrough("copy", { title: shareTitle, text, url });
      }
      const channel = res.status === "opened" ? "kakao" : res.status === "shared" ? "etc" : "link";
      trackShare({ feature: "destiny-bias-chemi", channel });
      if (res.status === "shared" || res.status === "opened") setShareStatus({ tone: "ok", text: "공유 창을 열었어요." });
      else if (res.status === "copied") setShareStatus({ tone: "ok", text: "공유 링크를 복사했어요. 원하는 곳에 붙여 넣어 주세요." });
      else if (res.status === "cancelled") setShareStatus(null);
      else setShareStatus({ tone: "warn", text: "공유를 열지 못했어요. 「이미지 저장」 후 직접 올려 주세요." });
    } finally {
      setShareBusy(false);
    }
  }, [outcome, shareBusy, shareTitle, trackFunnelStep, trackShare]);

  const handleSaveImage = useCallback(async () => {
    const node = coreCardRef.current;
    if (!node || !outcome || shareBusy) return;
    setShareBusy(true);
    setShareStatus({ tone: "info", text: "카드 이미지를 만드는 중…" });
    try {
      await document.fonts?.ready;
      const { toBlob } = await import("html-to-image");
      let blob = await toBlob(node, { pixelRatio: 3, cacheBust: true });
      if (!blob) blob = await toBlob(node, { pixelRatio: 2, cacheBust: true });
      if (!blob) throw new Error("IMAGE_EXPORT_EMPTY");
      await downloadBlob(blob, `chemi-${outcome.partner.id}-${outcome.result.chemiTypeId}.png`);
      trackShare({ feature: "destiny-bias-chemi", channel: "download" });
      trackFunnelStep({ funnel: FUNNEL, step: "share_click", stepIndex: 5 });
      setShareStatus({ tone: "ok", text: "이미지를 저장했어요. 카드에는 생일이 들어가지 않아요." });
    } catch (caught) {
      setShareStatus({ tone: "warn", text: friendlyErrorMessage(caught, "이미지를 만들지 못했어요. 화면을 캡처해 주세요.") });
    } finally {
      setShareBusy(false);
    }
  }, [outcome, shareBusy, trackFunnelStep, trackShare]);

  const handleSaveCollection = useCallback(async () => {
    if (!outcome || shareBusy || savedToCollection) return;
    const token = readLocalToken();
    setShareBusy(true);
    try {
      const apiBase = String(getApiBaseUrl() || "").trim();
      const { result, copy } = outcome;
      const response = await fetch(`${apiBase}/api/destiny-bias/cards`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          title: shareTitle,
          headline: copy.oneLiner,
          summary: copy.points.map((p) => p.text).join(" "),
          themeKey: "kpop_cream",
          score: 0,
          grade: "",
          reportText: [copy.scenario.text, copy.caution.text, copy.finish.text].join("\n\n"),
          canonical: {
            chemiTypeId: result.chemiTypeId,
            partner: result.partner,
            engineVersion: result.engineVersion,
            rulesVersion: result.rulesVersion,
            rosterVersion: result.rosterVersion,
            copyVersion: copy.copyVersion,
            signals: result.matchedSignalKeys,
            minorMode: result.minorMode,
          },
        }),
      });
      if (response.status === 401) {
        setLoggedIn(false);
        setShareStatus({ tone: "warn", text: "로그인이 풀렸어요. 다시 로그인하면 저장할 수 있어요." });
        return;
      }
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      setSavedToCollection(true);
      setShareStatus({ tone: "ok", text: "컬렉션에 저장했어요." });
      trackClick("destiny_bias_collection_save", { chemi_type_id: result.chemiTypeId });
    } catch (caught) {
      setShareStatus({ tone: "warn", text: friendlyErrorMessage(caught, "저장에 실패했어요. 잠시 후 다시 시도해 주세요.") });
    } finally {
      setShareBusy(false);
    }
  }, [outcome, savedToCollection, shareBusy, shareTitle, trackClick]);

  const stickyLabel = step === "hook" ? "내 최애 고르기" : step === "info" ? "케미 계산하기" : step === "result" ? "내 케미 카드 공유" : "";
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

        {step === "result" && outcome ? (
          <section className={styles.result} aria-labelledby="dbk-result-title">
            <h2 id="dbk-result-title" className="sr-only">케미 결과</h2>
            <ChemiCoreCard ref={coreCardRef} result={outcome.result} copy={outcome.copy} />
            <ChemiShareBar
              busy={shareBusy}
              status={shareStatus}
              canSaveCollection={loggedIn}
              savedToCollection={savedToCollection}
              onShareCard={() => void handleShareCard()}
              onSaveImage={() => void handleSaveImage()}
              onInviteFriend={() => void handleInvite()}
              onPickAnother={resetToPick}
              onSaveCollection={() => void handleSaveCollection()}
            />
            <ChemiSections copy={outcome.copy} />
            <ChemiEvidencePanel result={outcome.result} />
            <MemberSwitcher current={outcome.partner} onSwitch={handleSwitch} />
            <TypeCollection collected={collected} currentTypeId={outcome.result.chemiTypeId} />
            <RecentResults items={recentResults.filter((r) => r.partner.id !== outcome.partner.id)} onReplay={handleReplay} />
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
            disabled={shareBusy}
            onClick={(event) => {
              if (shouldBlockClick()) {
                event.preventDefault();
                return;
              }
              stickyAction();
            }}
          >
            {stickyLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
