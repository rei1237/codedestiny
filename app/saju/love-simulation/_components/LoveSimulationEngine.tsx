"use client";

import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, Heart, MessageCircle, RefreshCw, Sparkles, UserRound } from "lucide-react";
import { INITIAL_STATS, LOVE_CHARACTERS, LOVE_CHARACTER_COPY_KO, getLocalizedLoveScenes, type CharacterId, type ChoiceLog, type LoveCharacter, type LoveChoice, type LoveScene, type LoveStats } from "../_data/loveCodeMvp";
import { fetchSajuPillar } from "../_services/sajuApi";
import { applyEffects, getRelationshipMetrics } from "../_utils/loveCodeScoring";
import { buildSajuCoupleCompatibility, formatTemplate, matchLoveCharactersFromSaju, LOVE_MATCHING_COPY_KO, type LoveCharacterMatchResult, type LoveMatchingCopy, type SajuCoupleCompatibility } from "../_utils/loveCharacterMatching";
import { useLoveSimCopy } from "../_utils/loveSimCopy";
import { useAmbientMotionEnabled } from "../_utils/useAmbientMotion";
import { computeCompatibilityProfile } from "../_engine/compatibilityEngine";
import { normalizeSajuForPerson } from "../_engine/normalizeSaju";
import { getCharacterNormalizedSaju } from "../_data/characterCharts";
import { WEIGHTS } from "../_config/weights.config";
import type { CompatibilityProfile } from "../_engine/compatibilityTypes";
import type { AnimalDestinyInput } from "../../animal-destiny/lib/types";
import { formatBirthDateDigits, normalizeBirthDateFromDigits } from "@/lib/birthDateInput";
import { readCurrentDestinyProfile } from "@/app/_lib/profile-card-storage";
import { holdPaidFeatureGateOpen, openPaidFeatureGate, releasePaidFeatureGate, runPaidAccessGate, updatePaidFeatureGate } from "@/app/_lib/billing-client";
import { resolveServerFeaturePricing } from "@/lib/payment/server-feature-pricing";

const LoveCharacterStorySection = lazy(() => import("./LoveCharacterStorySection"));

const LOVE_SIMULATION_FEATURE_KEY = "loveSimulation";
const LOVE_SIMULATION_FEATURE_REASON = "LOVE CODE 사주 연애 시뮬레이션";
// 가격은 서버 가격표에서 읽는다. 정본: worker/lib/paid-feature-registry.js → loveSimulation = 100코인 / 10,000원
const LOVE_SIMULATION_PRICING = resolveServerFeaturePricing({ featureKey: LOVE_SIMULATION_FEATURE_KEY });
const LOVE_SIMULATION_FEATURE_COST = LOVE_SIMULATION_PRICING?.cost ?? 0;
const LOVE_SIMULATION_FEATURE_AMOUNT_KRW = LOVE_SIMULATION_PRICING?.amountKRW ?? 0;

type PartnerCalendarType = "solar" | "lunar" | "lunar_leap";
type PartnerGender = "female" | "male";
type LoveSimulationLocale = "ko" | "en" | "ja" | "zh-CN" | "zh-TW" | "vi" | "hi" | "es" | "fr" | "de" | "nl" | "ms";
type LoveSimulationRuntimeWindow = Window & {
  cdGetCurrentLanguage?: () => string;
};

function normalizeLoveSimulationLocale(value?: string | null): LoveSimulationLocale {
  const normalized = String(value || "ko").trim().toLowerCase().replace("_", "-");
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "zh-hk" || normalized === "zh-mo") return "zh-TW";
  if (normalized === "ja-jp") return "ja";
  if (normalized === "en-us" || normalized === "en-gb") return "en";
  if (["ko", "en", "ja", "vi", "hi", "es", "fr", "de", "nl", "ms"].includes(normalized)) return normalized as LoveSimulationLocale;
  return "ko";
}

function readLoveSimulationCookie(name: string) {
  const prefix = `${name}=`;
  return String(document.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) || "";
}

function resolveLoveSimulationLocale() {
  if (typeof window === "undefined") return "ko";

  const runtimeWindow = window as LoveSimulationRuntimeWindow;
  try {
    const runtimeLocale = runtimeWindow.cdGetCurrentLanguage?.();
    if (runtimeLocale) return normalizeLoveSimulationLocale(runtimeLocale);
  } catch {}

  try {
    const queryLang = new URLSearchParams(window.location.search || "").get("lang");
    if (queryLang) return normalizeLoveSimulationLocale(queryLang);
  } catch {}

  try {
    const firstSegment = window.location.pathname.split("/").filter(Boolean)[0];
    if (firstSegment) {
      const pathLang = normalizeLoveSimulationLocale(firstSegment);
      if (pathLang !== "ko" || firstSegment.toLowerCase() === "ko") return pathLang;
    }
  } catch {}

  try {
    const stored = window.localStorage.getItem("cd_lang");
    if (stored) return normalizeLoveSimulationLocale(stored);
  } catch {}

  try {
    const cookieLang = readLoveSimulationCookie("cd_locale");
    if (cookieLang) return normalizeLoveSimulationLocale(decodeURIComponent(cookieLang));
  } catch {}

  return "ko";
}

/**
 * 러브 시뮬레이션 **UI 크롬**(버튼·필드 라벨·안내·에러)의 한국어 정본.
 *
 * 🔴 2026-08-25 이전에는 이 자리가 `LOVE_SIMULATION_COPY_TRANSLATIONS` 라는 **ko·en 2개짜리 표**였고
 * 나머지 10개 로케일은 en 별칭이었다. 그래서 ja·zh 사용자는 자기 언어 화면에서 영어 크롬을 봤다.
 * 지금은 `useLoveSimCopy("chrome", …)` 로 12개 로케일 사전을 탄다 — 저작 정본은
 * `i18n/authored/loveSimulation-03.json` 이고, 옛 표의 en 문구는 그 파일의 en 값으로 그대로 옮겼다.
 *
 * 🔴 콘텐츠(사주 해석이 조립하는 문장)와는 여전히 경계가 다르다. 저쪽은 `_utils` 의
 * `LOVE_MATCHING_COPY_KO` · `_data` 의 `LOVE_CHARACTER_COPY_KO` 가 갖는다. 경계 설명은
 * `_utils/loveSimCopy.ts` 헤더에 있다.
 *
 * 🔴 함수 멤버를 두지 말 것. `useScopedCopy` 는 **문자열만** 갈아끼우므로 함수는 사전이 못 덮는다.
 * 값이 끼어드는 자리는 `{name}` 자리표시자 + `formatTemplate` 이다(가드가 로케일별 자리표시자
 * 집합이 같은지 검사한다).
 */
const LOVE_SIMULATION_CHROME_KO = {
  preparingStoryLocation: "Love Code",
  preparingStoryTitle: "준비 중인 이야기",
  preparingStorySituation: "이 캐릭터의 스토리를 준비하고 있어요.",
  preparingStoryDialogue: "{name}의 이야기는 곧 더 깊게 열릴 예정입니다.",
  matchFormAria: "상대 정보 입력 매칭",
  partnerNamePlaceholder: "이름을 입력하세요",
  birthDateAria: "생년월일",
  birthHourAria: "출생 시간",
  birthCountryAria: "출생 국가",
  countryOptions: {
    seoul: "대한민국 · 서울 기준",
    tokyo: "일본 · 도쿄 기준",
    shanghai: "중국 · 상하이 기준",
    newYork: "미국 · 뉴욕 기준",
    paris: "프랑스 · 파리 기준",
  },
  backToIntro: "인트로로 돌아가기",
  backToCharacterSelect: "캐릭터 선택으로 돌아가기",
  sajuHint: "사주 힌트 보기",
  sajuHintAria: "{name} 사주 힌트 펼치기",
  finalRelationship: {
    fateOpen: {
      title: "운명의 코드가 열린 관계",
      body: "서로의 마음이 비교적 자연스럽게 맞물렸습니다. 끌림만 앞선 것이 아니라, 상대가 안심할 수 있는 리듬을 함께 만들어낸 흐름이에요.",
    },
    slowBond: {
      title: "천천히 깊어지는 인연",
      body: "빠르게 타오르기보다 오래 남는 쪽에 가까운 관계입니다. 작은 배려와 반복되는 진심이 둘 사이의 문을 조용히 열어주었어요.",
    },
    needsTuning: {
      title: "설렘은 있지만 조율이 필요한 관계",
      body: "분명한 끌림이 있었지만, 서로의 속도와 표현 방식에는 조금 더 섬세한 조율이 필요합니다. 설렘을 오래 지키려면 한 박자 느린 확인이 좋아요.",
    },
    learnLanguage: {
      title: "서로의 언어를 배워야 하는 관계",
      body: "마음은 움직였지만 표현의 결이 완전히 같지는 않았습니다. 상대가 어떤 방식으로 사랑을 느끼는지 배우는 순간, 관계의 분위기가 훨씬 부드러워질 수 있어요.",
    },
    needsSpace: {
      title: "거리감 조절이 필요한 관계",
      body: "감정의 온도보다 거리의 감각이 먼저 중요하게 드러난 관계입니다. 무리하게 가까워지기보다, 상대가 숨 쉴 수 있는 여백을 남겨두는 편이 좋습니다.",
    },
  },
  matchFormDescription: "이름과 생년월일을 남기면 선택한 성별 안에서 가장 닮은 러브 코드 상대가 열립니다.",
  nameFieldLabel: "이름",
  birthDateFieldLabel: "생년월일",
  calendarOptions: { solar: "양력", lunarRegular: "음력(평달)", lunarLeap: "음력(윤달)" },
  calendarHint: "선택한 달력 기준으로 상대의 연애 결을 맞춰봅니다.",
  birthTimeFieldLabel: "출생 시간",
  birthCountryFieldLabel: "출생 국가 (장소)",
  birthCountryNote: "*서머타임 및 경도 보정 자동 적용",
  matchNote: "현재 매칭은 입력 시간과 장소 신호를 함께 반영합니다.",
  partnerGenderFieldLabel: "상대 성별",
  genderFemaleOption: "♀ 여성",
  genderMaleOption: "♂ 남성",
  timeKnownNote: "선택한 출생 시각까지 반영합니다.",
  timeUnknownNote: "출생시간 미상으로 표시하고 낮 12시 기준 보조 계산을 사용합니다.",
  unknownTimeButton: "출생시간을 몰라요 · 낮 12시 기준으로 보기",
  matchingInProgress: "인연의 결을 찾는 중...",
  startMatchButton: "상대 정보로 매칭 시작",
  matchAnalysisFailedError: "상대의 사주 정보를 불러오지 못했어요. 입력값을 확인한 뒤 다시 시도해주세요.",
  loginRequiredError: "로그인이 필요합니다.",
  paymentRequiredError: "유료 결제가 필요합니다. 결제창에서 상품을 선택해 주세요.",
  paymentVerifyFailedError: "결제 확인에 실패했습니다.",
  checkingPassMessage: "이용권 확인 중",

  // ── 인트로 ──
  introEyebrow: "사주 성향과 선택으로 흐름이 달라지는 대화",
  introTitle: "Love Code: 운명의 상대와 대화하기",
  introDescription: "캐릭터의 성향, 취향, 거리감을 따라가는 비주얼 노벨 궁합입니다.",
  introChips: { saju: "사주 성향", dialogue: "캐릭터 대화", flow: "관계 흐름" },
  selectCharacterButton: "캐릭터 선택하기",
  matchingReadingButton: "인연의 결을 읽는 중",
  matchWithPartnerButton: "상대 정보로 매칭하기",

  // ── 매칭 결과 카드 ──
  // 🔴 3조각으로 나눈 이유: 가운데가 캐릭터 색으로 강조되는 <span> 이라 한 문장으로는 못 담는다.
  //    언어에 따라 앞뒤 어느 쪽이든 비어도 되게 두었다.
  mainMatchLeadPrefix: "입력한 상대는 ",
  mainMatchLeadHighlight: "{name}형 성향",
  mainMatchLeadSuffix: "과 가장 가까워요.",
  dayMasterBadge: "{dayMaster} 일간",
  confidenceBadge: "신뢰도 {value}",
  coupleScoreLine: "{grade} · {score}점",
  coupleUnlinkedNote: "내 프로필 카드 생년월일을 연결하면 쌍방 궁합까지 함께 반영됩니다.",
  secondaryMatchLine: "함께 가까운 성향: {labels}",
  secondaryMatchTypeLabel: "{name}형",
  startWithMatchButton: "{name}형 시뮬레이션 시작하기",

  // ── 캐릭터 선택 ──
  characterSelectTitle: "대화할 상대 선택",
  fullProfileAlt: "{name} 전체 프로필",
  portraitAlt: "{name} 프로필",
  profileFaceAlt: "{name} 얼굴 및 기본정보 프로필",
  dialogueFaceAlt: "{name} 대화 얼굴 프로필",
  miniFaceAlt: "{name} 미니 얼굴",
  profileExpandedNote: "전체 이미지와 상세 프로필이 열렸습니다.",
  profileCollapsedNote: "좌측 상단 얼굴과 기본정보를 먼저 확인하세요.",
  profileCollapseButton: "프로필 접기",
  profileExpandButton: "프로필 보기",
  maleCharacterBadge: "남성 캐릭터",
  femaleCharacterBadge: "여성 캐릭터",
  talkWithButton: "{name}와 대화하기",
  reselectCharacterButton: "캐릭터 다시 선택하기",

  // ── 결과 화면 ──
  calculatingCompatibility: "두 사람의 사주로 궁합을 계산하고 있어요…",
  compatibilityInfoMissing: "궁합을 계산할 사주 정보를 확인하지 못했어요.",
  reselectButton: "다시 선택하기",
  compatibilityResultBody: "{grade} · {score}점 — 두 사람의 사주로 계산된 결과예요. 다시 봐도 점수는 같고, 이야기 순서만 달라집니다.",
  riskLine: "리스크: {risk}",
  dateTipLine: "데이트 팁: {tip}",
  relationshipRouteLine: "관계 루트: {title}. {body}",
  dimensionLabels: {
    attraction: "끌림",
    stability: "안정성",
    communication: "소통",
    longevity: "지속성",
    conflict: "갈등 관리",
  },
  metricTone: { deep: "깊어짐", steady: "이어짐", careful: "조심스러움" },
  sajuSummaryTitle: "사주 성향 요약",
  myeongliPointsTitle: "명리 궁합 포인트",
  avoidFlowTitle: "피해야 할 흐름",
  choiceAnalysisTitle: "대화 선택 기반 분석",
  choiceRecapLabel: "선택 {index} · {scene}",
  choiceRecapInsight: "{tone} 반응. {insight}",
  openingStoryMessage: "캐릭터 스토리를 여는 중입니다.",
  restartButton: "다시 시작하기",

  // ── 플레이 화면 ──
  entryModeMatchNote: "사주 매칭 추천으로 시작한 시뮬레이션",
  entryModePresetNote: "직접 선택으로 시작한 시뮬레이션",
  sceneCounter: "장면 {index}/{total}",
  storyHoldTail: "지금은 대답보다 분위기를 읽어야 하는 순간입니다.",
  openChoicesButton: "중요한 순간에 대답 선택하기",
};

type LoveSimulationCopy = typeof LOVE_SIMULATION_CHROME_KO;

type PartnerMatchInput = {
  name: string;
  birthDate: string;
  calType: PartnerCalendarType;
  hour: string;
  minute: string;
  country: string;
  gender: PartnerGender;
  hasTime: boolean;
};

type StoredProfile = {
  id?: string;
  name?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  birthIso?: string;
  birthTimeUnknown?: boolean;
  calType?: string;
  calendarType?: string;
  timezone?: string;
  country?: string;
  birth?: {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    hasTime?: boolean;
    calType?: string;
    calendarType?: string;
    timezone?: string;
  };
  location?: {
    tz?: string;
  };
};

type StoredAuthUser = {
  id?: string;
  email?: string;
  name?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  calType?: string;
  calendarType?: string;
  timezone?: string;
};

type ProfileSeed = {
  name: string;
  gender: "남" | "여";
  birthDate: string;
  hour: number;
  minute: number;
  hasTime: boolean;
  calendarType: PartnerCalendarType;
  timezone: string;
};

const MIN_PLAYABLE_SCENES = 10;
const LOVE_CODE_HERO_ASSET = "/fuctionassets/love code.webp";
// 🔴 srcset 은 공백을 URL/디스크립터 구분자로 파싱한다. 이 파일명에 공백이 있으므로 %20 이 필수다.
//    게다가 scripts/build-mobile-app.mjs 의 SAME_ORIGIN_RESIZE_RE 는 [^"'()\s] 라 공백이 섞이면
//    한 건도 매칭하지 못하고 fail-closed 두 개 중 어느 것도 그걸 잡지 못한다 → 앱에서 무음 404 가 된다.
// 🔴 컴포넌트 안에서 템플릿 리터럴로 조립하지 말 것 — 번들에 조각 리터럴만 남아 앱 재작성기가 못 잡는다.
// 실측(프로덕션, 2026-09-02): w=640 29,093 B · w=960 55,486 B · 원본 133,869 B.
const LOVE_CODE_HERO_SRCSET = [
  "/cdn-cgi/image/width=640,quality=60,format=auto/fuctionassets/love%20code.webp 640w",
  "/cdn-cgi/image/width=960,quality=65,format=auto/fuctionassets/love%20code.webp 960w",
  "/fuctionassets/love%20code.webp 1672w",
].join(", ");
// 장식 배경(alt="" · aria-hidden)이라 의도적으로 낮게 신고한다. 모바일 밴드의 실제 CSS 폭은
// 뷰포트 폭과 같지만 DPR 2~3 에서도 640w 로 충분하다. lg 이상은 100vw → 원본을 고른다.
const LOVE_CODE_HERO_SIZES = "(max-width: 1023px) 50vw, 100vw";

// 스테이징(*.pages.dev)에는 Cloudflare Image Resizing 이 없어 /cdn-cgi/image/ 가 404 다.
// 앱에서도 접두어가 스트립된 뒤 퍼센트 인코딩 경로가 남는다(서빙 여부 미검증).
// 어느 쪽이든 실패하면 srcSet/sizes 를 걷어내고 원본 리터럴로 1회만 떨어진다.
function handleHeroSrcSetFailure(event: React.SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget;
  if (img.dataset.heroFallback === "1") return;
  img.dataset.heroFallback = "1";
  img.srcset = "";
  img.sizes = "";
  img.src = LOVE_CODE_HERO_ASSET;
}

const ELEMENT_LOVE_NARRATIVE: Record<LoveCharacter["element"], { label: string; atmosphere: string; harmony: string; shadow: string; datePulse: string }> = {
  wood: {
    label: "목",
    atmosphere: "새 가지가 빛을 향해 뻗듯 마음이 천천히 자라나는 기운",
    harmony: "상대가 꿈과 성장을 응원해줄 때 궁합의 숨이 길어집니다",
    shadow: "재촉과 평가가 섞이면 아직 여린 감정이 쉽게 움츠러듭니다",
    datePulse: "산책, 작은 계획, 함께 배우는 시간",
  },
  fire: {
    label: "화",
    atmosphere: "불빛이 어둠을 밀어내듯 설렘과 표현이 먼저 살아나는 기운",
    harmony: "따뜻한 반응과 분명한 호감 표현이 관계의 온도를 빠르게 올립니다",
    shadow: "차가운 침묵이나 애매한 태도는 불안을 과열시킬 수 있습니다",
    datePulse: "햇빛, 무대, 웃음이 터지는 활동형 데이트",
  },
  earth: {
    label: "토",
    atmosphere: "흙이 씨앗을 품듯 관계를 오래 지키고 현실로 눌러 앉히는 기운",
    harmony: "반복되는 배려와 생활의 안정감이 신뢰의 궁을 단단하게 만듭니다",
    shadow: "가벼운 약속 파기와 감정 기복은 마음의 문을 천천히 닫게 합니다",
    datePulse: "따뜻한 식사, 익숙한 동네, 오래 머무는 대화",
  },
  metal: {
    label: "금",
    atmosphere: "맑은 금속처럼 기준과 예의, 선명한 선택을 요구하는 기운",
    harmony: "정중한 태도와 일관된 약속이 호감보다 먼저 신뢰를 세웁니다",
    shadow: "무례함과 즉흥적인 압박은 관계의 결을 차갑게 굳힙니다",
    datePulse: "전시, 정돈된 공간, 취향이 보이는 선물",
  },
  water: {
    label: "수",
    atmosphere: "깊은 물처럼 말보다 여백과 기억으로 마음을 흐르게 하는 기운",
    harmony: "조용한 질문과 감정의 속도를 존중하는 태도가 오래 남습니다",
    shadow: "답을 강요하거나 속내를 들춰내려 하면 물길이 금세 멀어집니다",
    datePulse: "밤길, 비 오는 카페, 오래 남는 문장",
  },
};

const DAY_MASTER_LOVE_NARRATIVE: Record<LoveCharacter["dayMaster"], { core: string; attraction: string; caution: string }> = {
  갑목: {
    core: "갑목은 큰 나무처럼 관계 안에서 방향과 성장의 의미를 찾습니다",
    attraction: "함께 앞으로 나아가자는 말, 성실한 응원, 미래를 가꾸는 대화에 마음을 엽니다",
    caution: "성장을 막는 냉소와 책임 없는 즉흥에는 실망이 빠릅니다",
  },
  을목: {
    core: "을목은 덩굴과 꽃처럼 작은 온기와 섬세한 눈빛을 오래 기억합니다",
    attraction: "부드러운 배려와 구체적인 관심이 쌓일수록 사랑의 결이 깊어집니다",
    caution: "무심한 말투와 거친 단정은 마음의 잎을 접게 만듭니다",
  },
  병화: {
    core: "병화는 태양처럼 좋아하는 마음을 숨기기보다 드러내며 관계를 밝힙니다",
    attraction: "응원, 인정, 밝은 리액션이 들어오면 설렘이 단숨에 살아납니다",
    caution: "모호한 밀당과 차가운 무반응은 자존심과 불안을 동시에 건드립니다",
  },
  정화: {
    core: "정화는 촛불처럼 가까운 사람에게만 오래 가는 온기를 건넵니다",
    attraction: "장난 속의 진심, 섬세한 칭찬, 마음을 알아봐주는 말에 흔들립니다",
    caution: "가벼운 농담으로 진심을 흘려보내면 서운함이 조용히 쌓입니다",
  },
  기토: {
    core: "기토는 정원 흙처럼 관계를 돌보고, 불안한 마음을 생활 속 안정으로 바꿉니다",
    attraction: "천천히 맞춰주는 태도와 감사의 표현이 궁합의 뿌리를 깊게 만듭니다",
    caution: "성급한 고백보다 지키지 못할 말이 더 큰 균열을 남깁니다",
  },
  경금: {
    core: "경금은 단단한 검처럼 사랑에서도 기준, 책임, 태도의 정확성을 봅니다",
    attraction: "예의 있는 직진과 흔들리지 않는 약속이 신뢰의 문을 엽니다",
    caution: "무계획한 감정 표현과 선을 넘는 장난은 단번에 거리를 만듭니다",
  },
  신금: {
    core: "신금은 보석처럼 미묘한 분위기와 말의 결을 예민하게 비춥니다",
    attraction: "취향을 기억하는 세심함, 정돈된 표현, 조용한 존중에 마음이 반짝입니다",
    caution: "거친 표현과 무심한 태도는 오래 남는 흠집처럼 느껴질 수 있습니다",
  },
  임수: {
    core: "임수는 큰 바다처럼 넓은 생각과 고독한 자유를 함께 품습니다",
    attraction: "깊은 대화와 간섭 없는 신뢰가 흐를 때 관계의 물길이 넓어집니다",
    caution: "붙잡으려는 집착과 얕은 단정은 멀어지고 싶은 파도를 만듭니다",
  },
  계수: {
    core: "계수는 안개비처럼 조용히 스며들고, 쉽게 말하지 않은 마음을 오래 간직합니다",
    attraction: "비밀을 지켜주는 태도, 작은 기억, 부드러운 질문에 마음이 열립니다",
    caution: "감정을 추궁하거나 속도를 강요하면 말없이 뒤로 물러납니다",
  },
};

const YIN_YANG_LOVE_NARRATIVE: Record<LoveCharacter["yinYang"], string> = {
  yang: "양의 리듬이 강해 마음이 움직이면 먼저 방향을 만들고, 관계의 흐름을 밖으로 드러내려 합니다",
  yin: "음의 리듬이 깊어 마음이 움직여도 먼저 살피고, 안전하다고 느낄 때 속내를 보여줍니다",
};

type ProfileCrop = {
  x: number;
  y: number;
  w: number;
  h: number;
  imageAspect: number;
};

const DEFAULT_PROFILE_CROP: ProfileCrop = { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 };
const PROFILE_CROP_CONFIG: Partial<Record<CharacterId, ProfileCrop>> = {
  "kang-taejun": { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  "kwon-sehyun": { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  michael: { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  "seo-yuan": { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  "seo-ijun": { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  "yoon-siwoo": { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  "han-yunseo": { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  "kim-ming": { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  "park-jieun": { x: 0, y: 0, w: 0.62, h: 0.43, imageAspect: 1 },
  saebyeok: { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  seoyeon: { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  soha: { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  jiyoon: { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  harin: { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  neo: { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  yeoni: { x: 0, y: 0, w: 0.64, h: 0.42, imageAspect: 4 / 3 },
};

function getProfileCrop(character: LoveCharacter) {
  return PROFILE_CROP_CONFIG[character.id] ?? DEFAULT_PROFILE_CROP;
}

function getProfileCropAspect(character: LoveCharacter) {
  const crop = getProfileCrop(character);

  return crop.imageAspect * (crop.w / crop.h);
}

function getProfileCropStyle(character: LoveCharacter): React.CSSProperties {
  const crop = getProfileCrop(character);

  return {
    height: "auto",
    left: `${-(crop.x / crop.w) * 100}%`,
    position: "absolute",
    top: `${-(crop.y / crop.h) * 100}%`,
    width: `${100 / crop.w}%`,
  };
}

function readJsonObject<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeBirthDate(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 8 ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}` : "";
}

function normalizeBirthDateFromProfile(profile: StoredProfile | null | undefined) {
  const birthYear = profile?.birth?.year;
  const birthMonth = profile?.birth?.month;
  const birthDay = profile?.birth?.day;
  if (birthYear && birthMonth && birthDay) {
    return `${String(birthYear).padStart(4, "0")}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`;
  }

  return normalizeBirthDate(profile?.birthDate) || normalizeBirthDate(profile?.birthIso);
}

function parseProfileSeedBirthDate(birthDate: string) {
  const normalized = normalizeBirthDate(birthDate);
  if (!normalized) return null;
  const digits = normalized.replace(/\D/g, "");
  return {
    year: Number(digits.slice(0, 4)),
    month: Number(digits.slice(4, 6)),
    day: Number(digits.slice(6, 8)),
  };
}

function parseBirthTimeParts(...values: unknown[]) {
  for (const value of values) {
    const raw = String(value || "").trim();
    if (!raw) continue;
    const matched = raw.match(/(?:T|\s|^)(\d{1,2})(?::?(\d{2}))(?::\d{2})?/);
    if (!matched) continue;
    const hour = Number(matched[1]);
    const minute = Number(matched[2] || 0);
    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      return {
        hour: Math.max(0, Math.min(23, Math.floor(hour))),
        minute: Math.max(0, Math.min(59, Math.floor(minute))),
      };
    }
  }

  return null;
}

function normalizeBirthHourFromProfile(profile: StoredProfile | null | undefined, authUser?: StoredAuthUser | null) {
  const directHour = Number(profile?.birth?.hour);
  if (Number.isFinite(directHour)) return Math.max(0, Math.min(23, Math.floor(directHour)));

  const parsed = parseBirthTimeParts(profile?.birthTime, authUser?.birthTime, profile?.birthIso);
  if (parsed) return parsed.hour;

  return 12;
}

function normalizeBirthMinuteFromProfile(profile: StoredProfile | null | undefined, authUser?: StoredAuthUser | null) {
  const directMinute = Number(profile?.birth?.minute);
  if (Number.isFinite(directMinute)) return Math.max(0, Math.min(59, Math.floor(directMinute)));

  const parsed = parseBirthTimeParts(profile?.birthTime, authUser?.birthTime, profile?.birthIso);
  return parsed ? parsed.minute : 0;
}

function hasKnownBirthTime(profile: StoredProfile | null | undefined, authUser?: StoredAuthUser | null) {
  if (profile?.birthTimeUnknown === true || profile?.birth?.hasTime === false) return false;
  if (Number.isFinite(Number(profile?.birth?.hour))) return true;
  return Boolean(parseBirthTimeParts(profile?.birthTime, authUser?.birthTime, profile?.birthIso));
}

function normalizeProfileCalendarType(value: unknown): PartnerCalendarType {
  const raw = String(value || "").toLowerCase();
  if (raw.includes("leap") || raw.includes("윤")) return "lunar_leap";
  if (raw.includes("lunar") || raw.includes("음")) return "lunar";
  return "solar";
}

function normalizeProfileGender(value: unknown): "남" | "여" {
  const raw = String(value || "").trim();
  return /^(m|male|man|남|남성)$/i.test(raw) ? "남" : "여";
}

function readCurrentProfileSeed(): ProfileSeed | null {
  if (typeof window === "undefined") return null;
  const authUser = readJsonObject<StoredAuthUser>("fortune_auth_user");
  const currentProfile = readCurrentDestinyProfile() as StoredProfile | null;

  try {
    const birthDate = normalizeBirthDateFromProfile(currentProfile) || normalizeBirthDate(authUser?.birthDate);
    if (!birthDate) return null;
    const profileCalendarType = currentProfile?.birth?.calType || currentProfile?.birth?.calendarType || currentProfile?.calendarType || currentProfile?.calType || authUser?.calendarType || authUser?.calType;

    return {
      birthDate,
      gender: normalizeProfileGender(currentProfile?.gender || authUser?.gender),
      hour: normalizeBirthHourFromProfile(currentProfile, authUser),
      minute: normalizeBirthMinuteFromProfile(currentProfile, authUser),
      hasTime: hasKnownBirthTime(currentProfile, authUser),
      calendarType: normalizeProfileCalendarType(profileCalendarType),
      timezone: String(currentProfile?.timezone || currentProfile?.birth?.timezone || currentProfile?.location?.tz || authUser?.timezone || "Asia/Seoul").trim() || "Asia/Seoul",
      name: String(currentProfile?.name || authUser?.name || "나").trim(),
    };
  } catch {
    const birthDate = normalizeBirthDateFromProfile(currentProfile) || normalizeBirthDate(authUser?.birthDate);
    if (!birthDate) return null;

    return {
      birthDate,
      gender: normalizeProfileGender(currentProfile?.gender || authUser?.gender),
      hour: 12,
      minute: 0,
      hasTime: Boolean(parseBirthTimeParts(currentProfile?.birthTime, authUser?.birthTime, currentProfile?.birthIso)),
      calendarType: normalizeProfileCalendarType(currentProfile?.calendarType || currentProfile?.calType || authUser?.calendarType || authUser?.calType),
      timezone: String(currentProfile?.timezone || currentProfile?.birth?.timezone || currentProfile?.location?.tz || authUser?.timezone || "Asia/Seoul").trim() || "Asia/Seoul",
      name: String(currentProfile?.name || authUser?.name || "나").trim(),
    };
  }
}

function pad2Digit(value: number): string {
  return String(Math.max(0, Math.min(99, Math.floor(Number(value) || 0)))).padStart(2, "0");
}

// 프로필 시드 → 기본 사주 분석과 동일한 AnimalDestinyInput. 일주 계산 경로를 100% 일치시키기 위한 어댑터.
function profileSeedToAnimalInput(seed: ProfileSeed): AnimalDestinyInput | null {
  const parts = parseProfileSeedBirthDate(seed.birthDate);
  if (!parts || !parts.year || !parts.month || !parts.day) return null;
  return {
    name: seed.name,
    birthDate: `${parts.year}-${pad2Digit(parts.month)}-${pad2Digit(parts.day)}`,
    birthTime: seed.hasTime ? `${pad2Digit(seed.hour)}:${pad2Digit(seed.minute)}` : undefined,
    gender: seed.gender === "남" ? "male" : "female",
    calendarType: seed.calendarType === "lunar" || seed.calendarType === "lunar_leap" ? "lunar" : "solar",
    lunarLeap: seed.calendarType === "lunar_leap",
  };
}

// 상대 입력 필드 → 동일 AnimalDestinyInput.
function partnerFieldsToAnimalInput(fields: {
  name: string;
  birthDate: string;
  calType: PartnerCalendarType;
  hour: string;
  minute: string;
  hasTime: boolean;
  gender: PartnerGender;
}): AnimalDestinyInput | null {
  const digits = String(fields.birthDate || "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  if (!year || !month || !day) return null;
  return {
    name: fields.name?.trim() || "상대",
    birthDate: `${year}-${pad2Digit(month)}-${pad2Digit(day)}`,
    birthTime: fields.hasTime ? `${pad2Digit(Number(fields.hour))}:${pad2Digit(Number(fields.minute))}` : undefined,
    gender: fields.gender === "male" ? "male" : "female",
    calendarType: fields.calType === "lunar" || fields.calType === "lunar_leap" ? "lunar" : "solar",
    lunarLeap: fields.calType === "lunar_leap",
  };
}

function CharacterPortrait({ character, mode, alt }: { character: LoveCharacter; mode: "card" | "stage" | "result"; alt: string }) {
  const sizeClass =
    mode === "stage"
      ? "h-[48svh] max-h-[560px] min-h-[320px] w-full"
      : mode === "result"
        ? "h-56 w-full"
        : "h-[380px] w-full";

  return (
    <div className={`relative ${sizeClass} overflow-hidden rounded-lg`}>
      <div className={`absolute inset-x-8 bottom-5 h-16 rounded-full blur-3xl ${character.palette.halo}`} />
      <img
        src={character.asset}
        alt={alt}
        className="relative z-10 h-full w-full object-contain object-bottom drop-shadow-[0_26px_34px_rgba(0,0,0,0.55)]"
      />
    </div>
  );
}

function getCropPositionClass(className: string) {
  return /\b(absolute|fixed|relative)\b/.test(className) ? "" : "relative";
}

function CharacterProfileCrop({ character, className = "", alt }: { character: LoveCharacter; className?: string; alt: string }) {
  return (
    <div className={`${getCropPositionClass(className)} overflow-hidden rounded-lg bg-[#f3efe8] ${className}`}>
      <div className={`absolute inset-x-8 bottom-6 h-20 rounded-full blur-3xl ${character.palette.halo}`} />
      <img
        src={character.asset}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={getProfileCropStyle(character)}
        className="z-10 max-w-none drop-shadow-[0_18px_28px_rgba(0,0,0,0.34)] max-lg:filter-none"
      />
    </div>
  );
}

function CharacterDialogueCrop({ character, className = "", alt }: { character: LoveCharacter; className?: string; alt: string }) {
  return (
    <div className={`${getCropPositionClass(className)} overflow-hidden rounded-lg bg-black/18 ${className}`}>
      <div className={`absolute inset-x-8 bottom-6 h-20 rounded-full blur-3xl ${character.palette.halo}`} />
      <img
        src={character.asset}
        alt={alt}
        className="relative z-10 h-full w-full origin-top-left scale-[3.02] object-contain object-left-top drop-shadow-[0_22px_34px_rgba(0,0,0,0.52)]"
      />
    </div>
  );
}

function MetricBar({ label, value, tone }: { label: string; value: number; tone: LoveSimulationCopy["metricTone"] }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-white/70">
        <span>{label}</span>
        <span>{value >= 74 ? tone.deep : value >= 52 ? tone.steady : tone.careful}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <m.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-amber-200 via-rose-200 to-cyan-200"
        />
      </div>
    </div>
  );
}

function resolveChoiceTone(choice: LoveChoice) {
  const entries = Object.entries(choice.effects).sort((a, b) => Math.abs(Number(b[1] ?? 0)) - Math.abs(Number(a[1] ?? 0)));
  const [key] = entries[0] ?? ["neutral"];

  return key;
}

function createFallbackChoice(character: LoveCharacter, chapter: number, index: number, tone: "warm" | "curious" | "steady"): LoveChoice {
  const toneText = {
    warm: "따뜻하게 마음을 건넨다",
    curious: "상대의 생각을 더 묻는다",
    steady: "부담 없는 속도로 곁을 지킨다",
  }[tone];
  const effectsByTone: Record<typeof tone, Partial<LoveStats>> = {
    warm: { affection: 6, chemistry: 3, tension: -2 },
    curious: { trust: 5, chemistry: 4, tension: -1 },
    steady: { trust: 4, stability: 5, tension: -3 },
  };

  return {
    id: `fallback-${chapter}-${index}-${tone}`,
    text: toneText,
    effects: effectsByTone[tone],
    response: `${character.name}는 잠깐 시선을 내렸다가 다시 당신을 바라본다. "${tone === "warm" ? "그런 말은 쉽게 잊히지 않네요. 마음이 급하게 뜨는 게 아니라, 조용히 따뜻해지는 느낌이에요." : tone === "curious" ? "그걸 물어봐 주는 사람은 많지 않았어요. 대답보다 질문의 결이 먼저 닿을 때가 있네요." : "이 정도 속도라면, 나도 조금은 편해질 것 같아요. 가까워지는 일에도 숨 쉴 틈은 필요하니까."}"`,
    insight: `${character.name}형은 ${character.bestApproach} ${ELEMENT_LOVE_NARRATIVE[character.element].harmony}`,
  };
}

function getCharacterTenGodLine(character: LoveCharacter) {
  const hints = character.sajuMatchProfile?.tenGodHints?.slice(0, 3) ?? [];
  if (hints.length === 0) return "십성의 힌트는 아직 조용하지만, 일간과 오행의 결이 관계의 첫 단서를 만듭니다.";

  return `${hints.join("·")}의 십성 힌트가 사랑에서 원하는 역할, 책임, 표현 방식을 은근히 드러냅니다.`;
}

function buildMyeongliSceneArc(character: LoveCharacter, scene: Pick<LoveScene, "chapter" | "location">) {
  const element = ELEMENT_LOVE_NARRATIVE[character.element];
  const dayMaster = DAY_MASTER_LOVE_NARRATIVE[character.dayMaster];
  const chapterIndex = Math.max(scene.chapter - 1, 0);
  const affection = character.affectionTriggers[chapterIndex % character.affectionTriggers.length] ?? character.profileLine;
  const trust = character.trustTriggers[chapterIndex % character.trustTriggers.length] ?? character.bestApproach;
  const topic = character.likes.topics[chapterIndex % character.likes.topics.length] ?? character.archetype;
  const behavior = character.dislikes.behaviors[chapterIndex % character.dislikes.behaviors.length] ?? "성급한 태도";

  return {
    affection,
    behavior,
    dayMaster,
    element,
    tenGods: getCharacterTenGodLine(character),
    topic,
    trust,
    yinYang: YIN_YANG_LOVE_NARRATIVE[character.yinYang],
  };
}

function buildMyeongliResultCoda(character: LoveCharacter) {
  const element = ELEMENT_LOVE_NARRATIVE[character.element];
  const dayMaster = DAY_MASTER_LOVE_NARRATIVE[character.dayMaster];

  return `${dayMaster.core}. ${element.label} 기운은 ${element.atmosphere}이라서, ${element.harmony}. ${getCharacterTenGodLine(character)} 이 캐릭터와의 궁합은 단순한 호감 점수보다 "어떤 속도로 다가가고, 어떤 방식으로 안심시키는가"에서 성패가 갈립니다.`;
}

function buildMyeongliRiskCoda(character: LoveCharacter) {
  const element = ELEMENT_LOVE_NARRATIVE[character.element];
  const dayMaster = DAY_MASTER_LOVE_NARRATIVE[character.dayMaster];

  return `${element.shadow}. ${dayMaster.caution}. 피해야 할 흐름은 ${character.dislikes.behaviors.join(", ")}이며, 이 신호가 반복되면 ${character.conflictPattern}`;
}

function createSupplementalScene(character: LoveCharacter, chapter: number): LoveScene {
  const place = character.likes.places[(chapter - 1) % character.likes.places.length] ?? "조용한 거리";
  const topic = character.likes.topics[(chapter - 1) % character.likes.topics.length] ?? "서로의 마음";
  const trigger = character.affectionTriggers[(chapter - 1) % character.affectionTriggers.length] ?? character.profileLine;
  const trust = character.trustTriggers[(chapter - 1) % character.trustTriggers.length] ?? "천천히 쌓는 신뢰";
  const arc = buildMyeongliSceneArc(character, { chapter, location: place });

  return {
    id: `${character.id}-supplement-${chapter}`,
    characterId: character.id,
    chapter,
    location: place,
    title: `${character.archetype}의 깊어지는 장면`,
    situation: `${place}의 공기가 천천히 가라앉는다. ${character.name}는 ${topic}에 대해 쉽게 끝나지 않는 이야기를 꺼내고, 대화는 가벼운 안부에서 서로의 관계 속도와 마음의 기준으로 이어진다. ${arc.dayMaster.core}. ${arc.element.label}의 기운은 ${arc.element.atmosphere}이라, 이 장면의 끌림은 눈에 띄는 사건보다 작은 반응과 반복되는 태도에서 깊어진다. ${arc.tenGods} 지금은 성급하게 답을 고르는 순간이 아니라, 이 사람이 어떤 방식으로 호감을 확인하고 불안을 감추는지 바라봐야 하는 장면이다.`,
    dialogue: `${trigger}. ${arc.dayMaster.attraction}. 그리고 ${trust}. 나는 그런 흐름이 오래 남는 편이에요.`,
    choices: [
      createFallbackChoice(character, chapter, 1, "warm"),
      createFallbackChoice(character, chapter, 2, "curious"),
      createFallbackChoice(character, chapter, 3, "steady"),
    ],
  };
}

function createExpandedSupplementalScene(character: LoveCharacter, chapter: number): LoveScene {
  const legacyScene = createSupplementalScene(character, chapter);
  const chapterIndex = Math.max(chapter - 1, 0);
  const place = character.likes.places[chapterIndex % character.likes.places.length] ?? "조용한 거리";
  const topic = character.likes.topics[chapterIndex % character.likes.topics.length] ?? "서로의 마음";
  const trigger = character.affectionTriggers[chapterIndex % character.affectionTriggers.length] ?? character.profileLine;
  const trust = character.trustTriggers[chapterIndex % character.trustTriggers.length] ?? character.bestApproach;
  const behavior = character.dislikes.behaviors[chapterIndex % character.dislikes.behaviors.length] ?? "성급한 확신";
  const arc = buildMyeongliSceneArc(character, { chapter, location: place });

  return {
    id: `${character.id}-expanded-supplement-${chapter}`,
    characterId: character.id,
    chapter,
    location: place || legacyScene.location,
    title: `${character.archetype}의 마음이 깊어지는 밤`,
    situation: `${place}의 공기가 천천히 가라앉는다. ${character.name}은 ${topic}에 대한 이야기를 꺼내다가 문득 당신의 반응을 오래 바라본다. 가벼운 농담처럼 시작된 대화는 어느새 서로의 속도와 마음을 확인하는 밤으로 이어진다. ${arc.dayMaster.core}. ${arc.yinYang}. ${arc.element.label}의 연애 결은 ${arc.element.harmony} 그래서 지금은 답을 고르는 시간이 아니라, 이 사람이 어떤 방식으로 애정을 확인하고 불안을 감추는지 읽어야 하는 장면이다. ${arc.tenGods}`,
    dialogue: `${trigger}. ${arc.dayMaster.attraction}. 그리고 ${trust}. 나는 그런 흐름을 오래 기억하는 편이야.`,
    choices: [
      {
        ...createFallbackChoice(character, chapter, 1, "warm"),
        text: `${trigger}을 조용히 알아봐준다`,
        response: `${character.name}은 잠시 시선을 내렸다가 다시 당신을 바라본다. "그걸 알아봐주는 사람은 생각보다 많지 않아."`,
        insight: `${character.name}에게는 ${trigger}이 호감의 문을 여는 신호가 됩니다.`,
      },
      {
        ...createFallbackChoice(character, chapter, 2, "curious"),
        text: `${topic}에 담긴 진짜 마음을 물어본다`,
        response: `${character.name}은 대답을 서두르지 않는다. "그렇게 물어보면, 나도 조금은 솔직해지고 싶어져."`,
        insight: `${character.name}의 ${character.speechStyle} 흐름에는 깊이를 존중하는 질문이 잘 맞습니다.`,
      },
      {
        ...createFallbackChoice(character, chapter, 3, "steady"),
        text: `${behavior} 대신 ${trust}을 보여준다`,
        response: `${character.name}의 표정이 조금 누그러진다. "부담스럽지 않은데도 이상하게 믿고 싶어지네."`,
        insight: `${character.name}에게는 ${trust} 같은 태도가 관계를 안정적으로 깊게 만듭니다.`,
      },
    ],
  };
}

function buildScenePrelude(character: LoveCharacter, scene: LoveScene) {
  const arc = buildMyeongliSceneArc(character, scene);

  return [
    `${character.name}의 ${character.dayMaster} 일간은 ${arc.dayMaster.core}. ${scene.location}에서 시작된 이 장면은 ${arc.element.label} 기운의 ${arc.element.atmosphere}으로 번지고, ${arc.topic}을 이야기하는 동안에도 마음의 방향은 쉽게 단정되지 않습니다.`,
    `${arc.yinYang}. ${arc.affection}은 관계의 온도를 올리고, ${arc.trust}은 닫혀 있던 마음을 조금 더 안전하게 만듭니다. ${arc.tenGods}`,
    `궁합에서 지금 중요한 포인트는 ${arc.element.harmony} 반대로 ${arc.behavior}이 느껴지면 ${character.conflictPattern} 그래서 지금 필요한 것은 정답 같은 말보다, 이 사람의 리듬을 놓치지 않는 태도입니다.`,
  ];
}

function ensureSceneChoices(scene: LoveScene, character: LoveCharacter): LoveScene {
  if (scene.choices.length >= 3) return scene;
  const fallbackChoices = [
    createFallbackChoice(character, scene.chapter, 1, "warm"),
    createFallbackChoice(character, scene.chapter, 2, "curious"),
    createFallbackChoice(character, scene.chapter, 3, "steady"),
  ].filter((choice) => !scene.choices.some((item) => item.id === choice.id));

  return {
    ...scene,
    choices: [...scene.choices, ...fallbackChoices].slice(0, 3),
  };
}

function buildPlayableScenes(character: LoveCharacter | null, rawScenes: LoveScene[], copy: LoveSimulationCopy) {
  if (!character) return [];
  const sortedScenes = rawScenes
    .filter((scene) => scene.characterId === character.id)
    .sort((a, b) => a.chapter - b.chapter || a.id.localeCompare(b.id));
  const baseScenes =
    sortedScenes.length > 0
      ? sortedScenes
      : [
          {
            id: `${character.id}-preparing-story`,
            characterId: character.id,
            chapter: 1,
            location: copy.preparingStoryLocation,
            title: copy.preparingStoryTitle,
            situation: copy.preparingStorySituation,
            dialogue: formatTemplate(copy.preparingStoryDialogue, { name: character.name }),
            choices: [
              createFallbackChoice(character, 1, 1, "warm"),
              createFallbackChoice(character, 1, 2, "curious"),
              createFallbackChoice(character, 1, 3, "steady"),
            ],
          },
        ];
  const scenes = baseScenes.map((scene) => ensureSceneChoices(scene, character));
  let chapter = scenes.reduce((max, scene) => Math.max(max, scene.chapter), 0);

  while (scenes.length < MIN_PLAYABLE_SCENES) {
    chapter += 1;
    scenes.push(createExpandedSupplementalScene(character, chapter));
  }

  return scenes;
}

function RecommendedMatchCard({
  character,
  result,
  secondaryLabels,
  compatibility,
  matchingCopy,
  copy,
  onStart,
}: {
  character: LoveCharacter;
  result: LoveCharacterMatchResult;
  secondaryLabels: string[];
  compatibility: SajuCoupleCompatibility | null;
  matchingCopy: LoveMatchingCopy;
  copy: LoveSimulationCopy;
  onStart: () => void;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="overflow-hidden rounded-lg border border-rose-100/22 bg-white/[0.12] shadow-[0_22px_60px_rgba(244,114,182,0.16)] backdrop-blur-2xl max-lg:backdrop-filter-none max-lg:bg-[rgba(38,20,34,0.92)]"
    >
      <div className="grid gap-0 sm:grid-cols-[0.42fr_0.58fr]">
        <CharacterProfileCrop
          character={character}
          className="min-h-48 rounded-none sm:min-h-full"
          alt={formatTemplate(copy.profileFaceAlt, { name: result.characterName })}
        />
        <div className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${character.palette.chip}`}>{formatTemplate(copy.dayMasterBadge, { dayMaster: character.dayMaster })}</span>
            <span className="rounded-full border border-rose-100/20 bg-rose-50/12 px-3 py-1 text-xs font-black text-rose-50/82">
              {formatTemplate(copy.confidenceBadge, { value: matchingCopy.confidence[result.confidenceKey] })}
            </span>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-100/72">Main Match</p>
          <h3 className="mt-2 text-2xl font-black leading-tight text-white">
            {copy.mainMatchLeadPrefix}
            <span className={character.palette.accent}>{formatTemplate(copy.mainMatchLeadHighlight, { name: result.characterName })}</span>
            {copy.mainMatchLeadSuffix}
          </h3>
          <p className="mt-3 text-sm font-semibold leading-7 text-white/70">{result.summary}</p>
          {compatibility ? (
            <div className="mt-4 rounded-lg border border-rose-100/18 bg-rose-100/10 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-100/72">Couple Code</p>
              <p className="mt-2 text-sm font-black text-white">
                {formatTemplate(copy.coupleScoreLine, { grade: compatibility.grade, score: String(compatibility.score) })}
              </p>
              <p className="mt-2 text-xs font-bold leading-6 text-white/68">{compatibility.summary}</p>
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-white/10 bg-black/18 px-3 py-2 text-xs font-bold leading-5 text-white/58">
              {copy.coupleUnlinkedNote}
            </p>
          )}
          <div className="mt-4 grid gap-2">
            {result.reasonBullets.slice(0, 3).map((reason) => (
              <div key={reason} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold leading-5 text-white/72">
                {reason}
              </div>
            ))}
          </div>
          {secondaryLabels.length > 0 ? (
            <p className="mt-4 text-sm font-bold text-rose-50/78">{formatTemplate(copy.secondaryMatchLine, { labels: secondaryLabels.join(", ") })}</p>
          ) : null}
          <button
            type="button"
            onClick={onStart}
            className={`mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r px-4 py-3 text-sm font-black text-zinc-950 shadow-[0_16px_34px_rgba(0,0,0,0.22)] transition hover:brightness-110 ${character.palette.button}`}
          >
            {formatTemplate(copy.startWithMatchButton, { name: result.characterName })}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </m.div>
  );
}

type ChoiceAnalysisTone = "warm" | "trust" | "tension" | "neutral";

type ChoiceAnalysis = {
  tone: ChoiceAnalysisTone;
  summary: string;
  nextHint: string;
};

function resolveFinalRelationshipType(stats: LoveStats, copy: LoveSimulationCopy) {
  const warmth = Math.round((stats.affection + stats.trust + stats.chemistry + stats.stability - stats.tension * 0.45) / 4);

  if (stats.trust >= 78 && stats.chemistry >= 72 && stats.tension <= 42) {
    return copy.finalRelationship.fateOpen;
  }

  if (stats.trust >= 68 && stats.stability >= 64) {
    return copy.finalRelationship.slowBond;
  }

  if (stats.chemistry >= 72 || stats.affection >= 72) {
    return copy.finalRelationship.needsTuning;
  }

  if (warmth >= 52) {
    return copy.finalRelationship.learnLanguage;
  }

  return copy.finalRelationship.needsSpace;
}

function analyzeChoiceLogs(choiceLog: ChoiceLog[]): ChoiceAnalysis {
  if (choiceLog.length === 0) {
    return {
      tone: "neutral",
      summary: "이번 흐름에서는 아직 결정적인 선택보다 관찰의 시간이 더 길었습니다. 상대를 서두르지 않고 바라보는 태도가 관계의 첫 인상을 차분하게 만들었어요.",
      nextHint: "다음에는 마음을 알아차린 순간을 조금 더 부드럽게 표현해보세요.",
    };
  }

  const tally = choiceLog.reduce(
    (acc, log) => {
      const effects = log.effects;
      const positive = (effects.affection ?? 0) + (effects.trust ?? 0) + (effects.chemistry ?? 0) + (effects.stability ?? 0);
      const tension = effects.tension ?? 0;

      if ((effects.trust ?? 0) + (effects.stability ?? 0) >= 8) acc.trust += 1;
      if (positive >= 10 && tension <= 2) acc.warm += 1;
      if (tension >= 5 || positive < 0) acc.tension += 1;
      if (Math.abs(positive) < 6 && tension < 5) acc.neutral += 1;

      return acc;
    },
    { warm: 0, trust: 0, tension: 0, neutral: 0 },
  );

  if (tally.tension >= tally.warm && tally.tension >= tally.trust && tally.tension > tally.neutral) {
    return {
      tone: "tension",
      summary: "이번 대화에서는 마음을 확인하려는 순간마다 긴장이 조금 더 먼저 올라왔습니다. 상대의 반응을 재촉한 장면들이 있어, 설렘과 불안이 함께 흔들린 흐름이에요.",
      nextHint: "다음에는 바로 답을 요구하기보다, 상대가 마음을 정리할 시간을 남겨두는 태도가 좋습니다.",
    };
  }

  if (tally.trust >= tally.warm && tally.trust > tally.neutral) {
    return {
      tone: "trust",
      summary: "신뢰를 쌓는 선택이 자주 보였습니다. 화려한 말보다 상대가 안심할 수 있는 태도가 반복되며, 관계의 바닥을 단단하게 받쳐주었어요.",
      nextHint: "다음에는 안정감 위에 작은 솔직함을 더해보면 관계의 온도가 자연스럽게 올라갑니다.",
    };
  }

  if (tally.warm > tally.neutral) {
    return {
      tone: "warm",
      summary: "상대의 마음을 알아봐주는 선택이 많았습니다. 다정함이 과하게 앞서기보다, 필요한 순간에 따뜻하게 닿아 관계의 분위기를 부드럽게 열어주었어요.",
      nextHint: "다음에는 그 다정함을 조금 더 구체적인 말과 행동으로 남겨보세요.",
    };
  }

  return {
    tone: "neutral",
    summary: "성급하게 밀어붙이기보다 분위기를 살피는 중립적인 선택이 많았습니다. 아직 깊이 들어가기 전, 서로의 결을 조심스럽게 확인한 흐름이에요.",
    nextHint: "다음에는 관찰에서 한 걸음 나아가, 마음에 남은 장면을 조용히 표현해보세요.",
  };
}

const CHARACTER_RESULT_SUMMARIES: Record<CharacterId, string> = {
  "kang-taejun": "강태준 같은 병화형 인물에게는 말보다 태도가 중요합니다. 이번 선택에서 당신이 그의 노력과 열정을 알아봐준 순간마다 관계의 온도가 빠르게 올라갔어요.",
  "kwon-sehyun": "권세현 같은 경금형 인물은 쉽게 흔들리지 않지만, 한 번 신뢰를 느끼면 관계를 오래 지켜보는 편입니다. 예의와 일관성이 이번 관계의 핵심 열쇠였어요.",
  michael: "미카엘 같은 계수형 인물에게는 조용한 질문과 깊은 여백이 잘 닿습니다. 겉으로 드러난 말보다 그 말 뒤의 마음을 읽어준 선택들이 관계를 천천히 열었습니다.",
  "seo-yuan": "서유안 같은 기토형 인물은 작은 배려가 오래 남는 사람입니다. 다정함을 서두르지 않고 편안하게 건넨 순간들이 둘 사이에 안정적인 온기를 만들었어요.",
  "seo-ijun": "서이준 같은 임수형 인물에게는 가벼운 확신보다 깊이를 함께 견디는 태도가 중요합니다. 그의 고독을 밀어내지 않은 선택들이 마음의 문을 조금씩 열었습니다.",
  "yoon-siwoo": "윤시우 같은 갑목형 인물은 함께 걸어가는 감각에 마음을 엽니다. 성실한 리듬과 밝은 응원이 관계를 단정하고 건강한 방향으로 이끌었어요.",
  "han-yunseo": "한윤서 같은 정화형 인물은 자유로운 표현 속에서도 진심을 알아봐주길 바랍니다. 장난과 진지함의 균형을 맞춘 순간마다 설렘이 선명해졌어요.",
  "kim-ming": "김민 같은 신금형 인물은 분위기의 결을 섬세하게 기억합니다. 조심스럽고 예의 있는 태도가 그녀의 마음에 오래 남는 신뢰로 번졌어요.",
  "park-jieun": "박지은 같은 계수형 인물은 확신을 확인받고 싶어 하면서도 쉽게 속내를 보이지 않습니다. 불안을 가볍게 넘기지 않은 선택들이 관계를 부드럽게 붙잡아주었어요.",
  saebyeok: "새벽 같은 병화형 인물에게는 흐릿한 태도보다 분명하고 성숙한 표현이 닿습니다. 당당하지만 선을 넘지 않은 선택들이 강한 끌림을 안정감으로 바꾸었어요.",
  seoyeon: "서연 같은 을목형 인물은 작은 다정함을 오래 품습니다. 속도보다 온도를 맞춘 선택들이 관계를 부드럽고 오래 남는 방향으로 열어주었어요.",
  soha: "소하 같은 갑목형 인물은 함께 움직이고 웃는 순간에 마음이 가까워집니다. 밝은 리액션과 응원의 태도가 관계의 리듬을 건강하게 살렸어요.",
  jiyoon: "지윤 같은 임수형 인물은 묶어두는 사랑보다 바람처럼 편안한 관계에서 마음을 엽니다. 가볍지만 진심 있는 대화가 둘 사이의 거리를 자연스럽게 좁혔어요.",
  harin: "하린 같은 정화형 인물은 즐거운 분위기 속에서 진심을 확인합니다. 장난을 받아주되 마음을 흘려보내지 않은 선택들이 관계에 귀여운 긴장감을 남겼어요.",
  neo: "네오 같은 신금형 인물에게는 침묵을 존중하는 태도가 깊은 신뢰로 이어집니다. 빠른 확신보다 조용한 이해가 더 강하게 닿았어요.",
  yeoni: "연이 같은 을목형 인물에게는 다정한 말보다 마음의 속도를 맞춰주는 태도가 중요합니다. 작은 배려를 알아차린 선택들이 관계를 부드럽게 열어주었어요.",
};

function buildSajuEntrySummary(entryMode: "preset" | "sajuMatch", character: LoveCharacter) {
  if (entryMode === "sajuMatch") {
    return `입력한 상대의 사주 성향이 ${character.name}형 캐릭터와 가까운 흐름으로 나타났어요. 이 결과는 단정이 아니라, 시뮬레이션을 위한 페르소나 매칭으로 읽어주세요.`;
  }

  return `선택한 캐릭터의 ${character.dayMaster} 일간 성향을 기준으로 관계 흐름을 해석했어요. 캐릭터가 가진 관계 패턴에 당신의 선택이 어떻게 닿았는지를 중심으로 보았습니다.`;
}

function buildCustomAdvice(character: LoveCharacter, choiceAnalysis: ChoiceAnalysis) {
  const affection = character.affectionTriggers.slice(0, 2).join(", ");
  const trust = character.trustTriggers.slice(0, 2).join(", ");
  const toneGuide =
    choiceAnalysis.tone === "tension"
      ? "긴장이 올라올수록 더 부드럽고 짧은 표현이 필요합니다."
      : choiceAnalysis.tone === "trust"
        ? "이미 안정감이 만들어진 만큼, 다음에는 감정을 조금 더 선명하게 남겨도 좋아요."
        : choiceAnalysis.tone === "warm"
          ? "따뜻함이 잘 닿았으니, 그 온기를 일관성 있게 이어가는 것이 중요합니다."
          : "아직 조심스러운 흐름이므로, 작은 확신을 천천히 쌓아가는 편이 좋습니다.";

  return `${character.name}에게는 ${character.bestApproach} 특히 ${affection} 같은 순간이 호감의 문을 열고, ${trust} 같은 태도가 신뢰를 깊게 만듭니다. 다만 ${character.conflictPattern} ${toneGuide}`;
}

type SajuCompatibilityVerdict = {
  score: number;
  grade: string;
  body: string;
  chips: string[];
  reasons: string[];
  risk: string;
  dateTip: string;
};

type DateOutcome = {
  title: string;
  body: string;
  highlight: string;
};

type ChoiceRecap = {
  sceneLabel: string;
  choiceText: string;
  insight: string;
  tone: string;
};

function getSajuCompatibilityScore(stats: LoveStats) {
  const raw = Math.round(stats.affection * 0.22 + stats.trust * 0.28 + stats.chemistry * 0.2 + stats.stability * 0.22 - stats.tension * 0.16 + 20);
  return Math.max(0, Math.min(100, raw));
}

// 결과 궁합 카드는 오직 결정론 프로필에서만 파생된다(선택지·stats 미참조).
function buildSajuCompatibilityVerdict(profile: CompatibilityProfile): SajuCompatibilityVerdict {
  const dims = profile.dimensions;
  const chips = [
    `끌림 ${dims.attraction.score}`,
    `안정 ${dims.stability.score}`,
    `소통 ${dims.communication.score}`,
    `지속 ${dims.longevity.score}`,
    `갈등 ${dims.conflict.score}`,
  ];
  const reasons = profile.indicators
    .filter((indicator) => indicator.evidence)
    .slice()
    .sort((a, b) => Math.abs(b.weighted) - Math.abs(a.weighted))
    .slice(0, 4)
    .map((indicator) => indicator.evidence);
  const frictionIndicator = profile.indicators
    .filter((indicator) => indicator.rawScore < 0)
    .slice()
    .sort((a, b) => a.weighted - b.weighted)[0];
  const risk = frictionIndicator
    ? frictionIndicator.evidence
    : "큰 마찰 신호는 약해요. 익숙함에 기대 확인을 생략하지 않는 것이 관건이에요.";
  const dateTip = dims.conflict.score >= 60
    ? "결론을 서두르기보다 짧고 자주 확인하는 대화로 긴장을 낮춰 보세요."
    : dims.attraction.score >= 66
      ? "끌림이 좋은 조합이라, 첫 만남부터 서로의 취향을 확인하는 코스가 잘 맞아요."
      : "조용한 공간에서 생활 리듬부터 맞춰 보면 안정감이 빠르게 쌓여요.";
  const body = `${profile.coreVerdict}. 두 사람의 사주로 계산된 ${profile.grade}이며, 다시 봐도 점수는 같아요.${profile.dataGaps.length ? ` (${profile.dataGaps.join(" ")})` : ""}`;

  return {
    score: profile.score,
    grade: profile.grade,
    chips,
    reasons: reasons.length ? reasons : ["두 사람의 사주 신호를 종합해 읽었어요."],
    risk,
    dateTip,
    body,
  };
}

function buildDateOutcome(character: LoveCharacter, stats: LoveStats, choiceAnalysis: ChoiceAnalysis, choiceLog: ChoiceLog[]): DateOutcome {
  const score = getSajuCompatibilityScore(stats);
  const lastChoice = choiceLog[choiceLog.length - 1] ?? null;
  const neoTitles: Record<ChoiceAnalysisTone, string> = {
    warm: "전시장 2회차 예약 엔딩",
    trust: "이어폰 한쪽 공유 엔딩",
    tension: "읽씹 직전 냉각 엔딩",
    neutral: "다음 역까지 동행 엔딩",
  };
  const taejunTitles: Record<ChoiceAnalysisTone, string> = {
    warm: "태양 코트 직진 엔딩",
    trust: "같은 팀 확정 엔딩",
    tension: "작전 타임 요청 엔딩",
    neutral: "다음 경기 관전 엔딩",
  };
  const sehyunTitles: Record<ChoiceAnalysisTone, string> = {
    warm: "유리 첨탑 고백 엔딩",
    trust: "공유 캘린더 확정 엔딩",
    tension: "기준 재협상 엔딩",
    neutral: "다음 약속 검토 엔딩",
  };
  const michaelTitles: Record<ChoiceAnalysisTone, string> = {
    warm: "달빛 도서관 고백 엔딩",
    trust: "고요한 동행 확정 엔딩",
    tension: "잠수 직전 회복 엔딩",
    neutral: "심야 산책 연장 엔딩",
  };
  const yuanTitles: Record<ChoiceAnalysisTone, string> = {
    warm: "흙빛 편지 고백 엔딩",
    trust: "생활의 동맹 확정 엔딩",
    tension: "괜찮다는 말 안쪽 엔딩",
    neutral: "다음 책갈피 예약 엔딩",
  };
  const ijunTitles: Record<ChoiceAnalysisTone, string> = {
    warm: "검은 강변 고백 엔딩",
    trust: "돌아올 자유 확정 엔딩",
    tension: "차가운 토론 냉각 엔딩",
    neutral: "심야 서재 연장 엔딩",
  };
  const siwooTitles: Record<ChoiceAnalysisTone, string> = {
    warm: "청춘 정원 고백 엔딩",
    trust: "같이 걷는 계절 엔딩",
    tension: "숙제 같은 관계 조율 엔딩",
    neutral: "다음 프로젝트 예약 엔딩",
  };
  const yunseoTitles: Record<ChoiceAnalysisTone, string> = {
    warm: "앙코르 고백 엔딩",
    trust: "무대 뒤 진심 확정 엔딩",
    tension: "비상구 직전 조율 엔딩",
    neutral: "다음 세트리스트 예약 엔딩",
  };
  const mingTitles: Record<ChoiceAnalysisTone, string> = {
    warm: "달빛 살롱 고백 엔딩",
    trust: "오래 지켜지는 예의 엔딩",
    tension: "유리 장미 수리 엔딩",
    neutral: "다음 티룸 예약 엔딩",
  };
  const jieunTitles: Record<ChoiceAnalysisTone, string> = {
    warm: "검은 장미 고백 엔딩",
    trust: "시험 대신 부탁 엔딩",
    tension: "미로 탈출 조율 엔딩",
    neutral: "비밀 온실 재방문 엔딩",
  };
  const saebyeokTitles: Record<ChoiceAnalysisTone, string> = {
    warm: "붉은 도시 고백 엔딩",
    trust: "진짜 편 확정 엔딩",
    tension: "자존심 재협상 엔딩",
    neutral: "다음 루프탑 예약 엔딩",
  };
  const seoyeonTitles: Record<ChoiceAnalysisTone, string> = {
    warm: "데이지 고백 엔딩",
    trust: "오래 머무는 다정함 엔딩",
    tension: "꽃잎 속도 조율 엔딩",
    neutral: "다음 계절 산책 엔딩",
  };
  const sohaTitles: Record<ChoiceAnalysisTone, string> = {
    warm: "초록 스프린트 고백 엔딩",
    trust: "같은 팀 확정 엔딩",
    tension: "페이스 재조율 엔딩",
    neutral: "다음 러닝 예약 엔딩",
  };
  const jiyoonTitles: Record<ChoiceAnalysisTone, string> = {
    warm: "푸른 엽서 고백 엔딩",
    trust: "돌아올 항구 확정 엔딩",
    tension: "파도 거리 조율 엔딩",
    neutral: "다음 해변 산책 엔딩",
  };
  const harinTitles: Record<ChoiceAnalysisTone, string> = {
    warm: "핑크 네온 고백 엔딩",
    trust: "진심 컷 저장 엔딩",
    tension: "리액션 재충전 엔딩",
    neutral: "다음 팝업 예약 엔딩",
  };
  const yeoniTitles: Record<ChoiceAnalysisTone, string> = {
    warm: "분홍 꽃등 고백 엔딩",
    trust: "서로의 등불 확정 엔딩",
    tension: "마음 속도 회복 엔딩",
    neutral: "다음 찻집 약속 엔딩",
  };
  const genericTitles: Record<ChoiceAnalysisTone, string> = {
    warm: "설렘 온도 상승 엔딩",
    trust: "천천히 스며드는 엔딩",
    tension: "관계 재정비 엔딩",
    neutral: "다음 약속 보류 엔딩",
  };
  const title =
    character.id === "neo"
      ? score >= 86
        ? "은빛 책갈피 고백 엔딩"
        : neoTitles[choiceAnalysis.tone]
      : character.id === "kang-taejun"
        ? score >= 86
          ? "태양 코트 팀메이트 엔딩"
          : taejunTitles[choiceAnalysis.tone]
        : character.id === "kwon-sehyun"
          ? score >= 86
            ? "계획 밖의 신뢰 엔딩"
            : sehyunTitles[choiceAnalysis.tone]
          : character.id === "michael"
            ? score >= 86
              ? "고요한 물결의 고백 엔딩"
              : michaelTitles[choiceAnalysis.tone]
            : character.id === "seo-yuan"
              ? score >= 86
                ? "서로 기대는 온실 엔딩"
                : yuanTitles[choiceAnalysis.tone]
              : character.id === "seo-ijun"
                ? score >= 86
                  ? "피할 수 없는 반례 엔딩"
                  : ijunTitles[choiceAnalysis.tone]
                : character.id === "yoon-siwoo"
                  ? score >= 86
                    ? "쉼의 계절 고백 엔딩"
                    : siwooTitles[choiceAnalysis.tone]
                  : character.id === "han-yunseo"
                    ? score >= 86
                      ? "텅 빈 무대의 앙코르 엔딩"
                      : yunseoTitles[choiceAnalysis.tone]
                    : character.id === "kim-ming"
                      ? score >= 86
                        ? "은빛 잔향의 고백 엔딩"
                        : mingTitles[choiceAnalysis.tone]
                      : character.id === "park-jieun"
                        ? score >= 86
                          ? "비밀 온실의 안심 엔딩"
                          : jieunTitles[choiceAnalysis.tone]
                        : character.id === "saebyeok"
                          ? score >= 86
                            ? "새벽 네온의 편 엔딩"
                            : saebyeokTitles[choiceAnalysis.tone]
                          : character.id === "seoyeon"
                            ? score >= 86
                              ? "천천히 피는 정원 엔딩"
                              : seoyeonTitles[choiceAnalysis.tone]
                            : character.id === "soha"
                              ? score >= 86
                                ? "같이 도착하는 트랙 엔딩"
                                : sohaTitles[choiceAnalysis.tone]
                              : character.id === "jiyoon"
                                ? score >= 86
                                  ? "돌아올 항구의 고백 엔딩"
                                  : jiyoonTitles[choiceAnalysis.tone]
                                : character.id === "harin"
                                  ? score >= 86
                                    ? "이번 컷은 진짜 엔딩"
                                    : harinTitles[choiceAnalysis.tone]
                                  : character.id === "yeoni"
                                    ? score >= 86
                                      ? "서로의 등불 고백 엔딩"
                                      : yeoniTitles[choiceAnalysis.tone]
                        : genericTitles[choiceAnalysis.tone];
  const lastToneLine = lastChoice ? `마지막 선택은 ${lastChoice.tone}의 결로 남았습니다.` : "아직 마지막 선택의 여운은 조용히 비어 있습니다.";
  const outcomeBody =
    character.id === "neo"
      ? `네오와의 데이트는 큰 이벤트보다 기억력 싸움에 가까웠습니다. 침묵을 재촉하지 않고, 취향을 가볍게 소비하지 않으며, 작은 약속을 지킨 선택일수록 네오의 방어적인 은빛이 부드럽게 풀렸습니다. ${lastToneLine}`
      : character.id === "kang-taejun"
        ? `강태준과의 데이트는 승부보다 팀워크를 배우는 흐름이었습니다. 결과만 칭찬하기보다 다시 뛰는 과정, 힘든 날의 편, 쉬어야 할 때의 호흡을 알아준 선택일수록 태준의 뜨거운 직진이 안정적인 애정으로 바뀌었습니다. ${lastToneLine}`
        : character.id === "kwon-sehyun"
          ? `권세현과의 데이트는 감정보다 신뢰의 운영 방식을 먼저 확인하는 흐름이었습니다. 기준을 통제로 단정하지 않고, 약속·비밀·경계·변수를 침착하게 조율한 선택일수록 세현의 차가운 보호 본능이 따뜻한 확신으로 바뀌었습니다. ${lastToneLine}`
          : character.id === "michael"
            ? `미카엘과의 데이트는 말보다 여백을 읽는 흐름이었습니다. 침묵을 벌처럼 해석하지 않고, 깊은 질문을 두려워하지 않으며, 사라진 뒤에도 돌아올 수 있는 자리를 남겨준 선택일수록 미카엘의 고요한 물결은 숨지 않는 고백으로 변했습니다. ${lastToneLine}`
            : character.id === "seo-yuan"
              ? `서유안과의 데이트는 다정함을 당연히 받는 시간이 아니라, 서로가 쉬어 갈 자리를 만들어 가는 흐름이었습니다. 작은 배려를 구체적으로 고마워하고, 괜찮다는 말 안쪽의 피로를 알아차리며, 유안도 기대도 된다고 말해준 선택일수록 그의 흙빛 온기는 돌봄을 넘어 사랑의 집이 되었습니다. ${lastToneLine}`
              : character.id === "seo-ijun"
                ? `서이준과의 데이트는 정답을 맞히는 시험이 아니라, 서로의 사유를 견딜 수 있는지 확인하는 흐름이었습니다. 얕은 확신으로 단정하지 않고, 고독을 존중하며, 돌아올 자유를 남겨준 선택일수록 이준의 냉소는 반박이 아니라 고백을 위한 마지막 문장으로 바뀌었습니다. ${lastToneLine}`
                : character.id === "yoon-siwoo"
                  ? `윤시우와의 데이트는 같이 자라는 청춘의 속도를 맞추는 흐름이었습니다. 약속과 계획을 존중하고, 성실함을 당연하게 쓰지 않으며, 지친 날에는 쉬어도 된다고 말해준 선택일수록 시우의 밝은 응원은 숙제가 아니라 함께 머무는 정원으로 깊어졌습니다. ${lastToneLine}`
                  : character.id === "han-yunseo"
                    ? `한윤서와의 데이트는 환호보다 정확한 시선을 원하는 무대 뒤의 흐름이었습니다. 장난을 통제하지 않고, 창의성을 무시하지 않으며, 웃기지 않아도 괜찮다고 말해준 선택일수록 윤서의 반짝이는 방어는 한 사람에게만 들려주는 앙코르 고백으로 변했습니다. ${lastToneLine}`
                    : character.id === "kim-ming"
                      ? `김밍과의 데이트는 분위기를 꾸미는 일이 아니라 마음이 안전하게 머물 결을 다듬는 흐름이었습니다. 작은 취향을 기억하고, 약속을 가볍게 여기지 않으며, 무심한 말을 구체적으로 다시 수리한 선택일수록 밍의 은빛 섬세함은 조용하지만 오래 남는 고백으로 피어났습니다. ${lastToneLine}`
                      : character.id === "park-jieun"
                        ? `박지은과의 데이트는 매혹적인 시험을 통과하는 게임이 아니라, 불안을 부탁으로 바꾸는 흐름이었습니다. 질투를 비난하지 않고 이유를 묻되, 시험이 반복될 때는 부드럽게 경계를 세운 선택일수록 지은의 검은 장미는 소유가 아니라 안심을 향해 피어났습니다. ${lastToneLine}`
                        : character.id === "saebyeok"
                          ? `새벽과의 데이트는 강함을 꺾는 승부가 아니라, 같은 방향에 서는 편을 증명하는 흐름이었습니다. 취향을 맞춘 준비와 확실한 표현, 강한 사람이라 괜찮겠지로 넘기지 않고 약한 순간을 자존심 상하지 않게 받아준 선택일수록 새벽의 붉은 카리스마는 혼자 앞서가는 빛에서 함께 기대는 도시의 고백으로 바뀌었습니다. ${lastToneLine}`
                          : character.id === "seoyeon"
                            ? `서연과의 데이트는 빠른 확신을 요구하는 길이 아니라, 작은 기억과 오래 머무는 다정함으로 마음을 피우는 흐름이었습니다. 사소한 취향을 기억하고, 연락과 약속을 가볍게 넘기지 않으며, 그녀의 느린 표현을 끝까지 기다려준 선택일수록 서연의 연분홍 설렘은 시들지 않는 정원의 고백으로 피어났습니다. ${lastToneLine}`
                            : character.id === "soha"
                              ? `소화와의 데이트는 기록을 겨루는 경기가 아니라, 같은 페이스로 몸과 마음을 회복하는 흐름이었습니다. 함께 도전하되 컨디션을 먼저 묻고, 밝지 않은 날도 밀어붙이지 않으며, 루틴과 휴식을 같은 팀의 약속으로 받아준 선택일수록 소화의 초록빛 에너지는 같이 도착하는 고백으로 깊어졌습니다. ${lastToneLine}`
                              : character.id === "jiyoon"
                                ? `지윤과의 데이트는 편안함을 핑계로 마음을 흐리는 시간이 아니라, 자유와 신뢰가 같은 파도를 타는 흐름이었습니다. 그녀를 묶으려 하지 않되 진심을 미루지 않고, 농담 뒤의 깊이를 알아보며 돌아올 자리를 남겨준 선택일수록 지윤의 청량한 바다는 머물고 싶은 항구의 고백으로 변했습니다. ${lastToneLine}`
                                : character.id === "harin"
                                  ? `하린과의 데이트는 단순히 웃긴 장면을 모으는 놀이가 아니라, 장난 뒤에 숨어 있는 진심을 포토카드처럼 꺼내 보는 흐름이었습니다. 크게 반응해주되 귀엽게만 소비하지 않고, 친구와 자유로운 표현을 존중하며, 진지한 순간을 어색해하지 않은 선택일수록 하린의 핑크 네온은 이번 컷은 진짜라는 고백으로 저장되었습니다. ${lastToneLine}`
                                  : character.id === "yeoni"
                                    ? `연이와의 데이트는 위로를 받기만 하는 시간이 아니라, 서로의 마음을 등불처럼 밝혀주는 흐름이었습니다. 침묵을 재촉하지 않고, 상처를 가볍게 여기지 않으며, 그녀의 피로와 소원까지 되물어준 선택일수록 연이의 분홍빛 치유는 한쪽으로 흐르지 않는 서로의 등불 고백으로 피어났습니다. ${lastToneLine}`
                        : `${character.name}와의 데이트는 선택한 말의 온도에 따라 다른 루트로 흘렀습니다. ${lastToneLine}`;

  return {
    title,
    body: outcomeBody,
    highlight:
      score >= 86
        ? "데이트 결과: 다음 만남 확정. 상대의 취향 저장소에 당신 이름이 생겼습니다."
        : score >= 68
          ? "데이트 결과: 애프터 가능성 높음. 속도만 맞추면 관계가 더 깊어집니다."
          : score >= 52
            ? "데이트 결과: 호감은 남았지만 조율 필요. 다음 선택에서 안정감을 보여주세요."
            : "데이트 결과: 잠깐 냉각. 재촉보다 짧은 사과와 여백이 먼저입니다.",
  };
}

function buildRecentChoiceRecaps(choiceLog: ChoiceLog[], scenes: LoveScene[]): ChoiceRecap[] {
  return choiceLog.slice(-3).map((log) => {
    const scene = scenes.find((item) => item.id === log.sceneId);
    const choice = scene?.choices.find((item) => item.id === log.choiceId);

    return {
      sceneLabel: scene ? `${scene.location} · ${scene.title}` : "기록된 데이트 장면",
      choiceText: choice?.text ?? `${log.tone} 선택`,
      insight: choice?.insight ?? "선택의 여운이 관계 흐름에 반영되었습니다.",
      tone: log.tone,
    };
  });
}

function ResultCard({
  eyebrow,
  title,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-white/12 bg-white/[0.075] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-5 ${className}`}>
      <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-rose-100/62">{eyebrow}</p>
      <h3 className="mt-2 text-lg font-black leading-snug text-white sm:text-xl">{title}</h3>
      <div className="mt-3 text-sm font-semibold leading-7 text-white/72">{children}</div>
    </div>
  );
}

export const LoveSimulationEngine: React.FC = () => {
  // lg 미만 / reduced-motion 에서는 상시 연출을 통째로 끈다. 화면 4개가 전부 early return 이라
  // 훅 호출은 반드시 여기(첫 return 위)에 있어야 한다.
  const ambient = useAmbientMotionEnabled();
  const [screen, setScreen] = useState<"intro" | "select" | "play" | "result">("intro");
  const [locale, setLocale] = useState<LoveSimulationLocale>("ko");
  const [selectedId, setSelectedId] = useState<CharacterId | null>(null);
  const [entryMode, setEntryMode] = useState<"preset" | "sajuMatch">("preset");
  const [sceneIndex, setSceneIndex] = useState(0);
  const [stats, setStats] = useState<LoveStats>(INITIAL_STATS);
  const [selectedChoice, setSelectedChoice] = useState<LoveChoice | null>(null);
  const [isChoiceOpen, setIsChoiceOpen] = useState(false);
  const [choiceLog, setChoiceLog] = useState<ChoiceLog[]>([]);
  const [partnerName, setPartnerName] = useState("");
  const [partnerBirthDate, setPartnerBirthDate] = useState("");
  const [partnerCalType, setPartnerCalType] = useState<PartnerCalendarType>("solar");
  const [partnerHour, setPartnerHour] = useState("12");
  const [partnerMinute, setPartnerMinute] = useState("0");
  const [partnerCountry, setPartnerCountry] = useState("Asia/Seoul");
  const [partnerGender, setPartnerGender] = useState<PartnerGender>("female");
  const [partnerHasTime, setPartnerHasTime] = useState(true);
  const [expandedProfileId, setExpandedProfileId] = useState<CharacterId | null>(null);
  const [matchResults, setMatchResults] = useState<LoveCharacterMatchResult[]>([]);
  const [coupleCompatibility, setCoupleCompatibility] = useState<SajuCoupleCompatibility | null>(null);
  const [matchError, setMatchError] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const [isStartingSimulation, setIsStartingSimulation] = useState(false);
  const [initialCompatibilityNote, setInitialCompatibilityNote] = useState("");
  // Layer 1 — 두 사람의 사주만으로 결정되는 궁합 프로필. 선택지/stats와 무관하게 진입 시 1회 계산해 고정.
  const [profile, setProfile] = useState<CompatibilityProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    const syncLocale = (event?: Event) => {
      const eventLocale = event instanceof CustomEvent && typeof event.detail?.lang === "string" ? event.detail.lang : "";
      setLocale(normalizeLoveSimulationLocale(eventLocale || resolveLoveSimulationLocale()));
    };

    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale as EventListener);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale as EventListener);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  const copy = useLoveSimCopy("chrome", LOVE_SIMULATION_CHROME_KO);
  // 🔴 `copy` 와 별개다. 위는 버튼·라벨 같은 UI 크롬(ko·en 표), 아래는 사주 해석이 조립하는
  //    콘텐츠 문장(12개 로케일 사전). 경계는 `_utils/loveSimCopy.ts` 헤더에 적혀 있다.
  const matchingCopy = useLoveSimCopy("matching", LOVE_MATCHING_COPY_KO);
  // 캐릭터 표면 4필드(이름·아키타입·프로필라인·베스트어프로치)의 로케일 사본.
  // 🔴 나머지 캐릭터 한국어(personality·conflictPattern·장면 본문)는 아직 정본이 한국어뿐이다.
  const characterCopy = useLoveSimCopy("characters", LOVE_CHARACTER_COPY_KO);
  // 값은 그대로 IANA 타임존 문자열 유지 — matchPartner/자동저장/onSubmit 이 이미 이 값을 그대로 쓴다.
  const partnerCountryOptions = useMemo(
    () => [
      { value: "Asia/Seoul", label: copy.countryOptions.seoul },
      { value: "Asia/Tokyo", label: copy.countryOptions.tokyo },
      { value: "Asia/Shanghai", label: copy.countryOptions.shanghai },
      { value: "America/New_York", label: copy.countryOptions.newYork },
      { value: "Europe/Paris", label: copy.countryOptions.paris },
    ],
    [copy],
  );
  const character = LOVE_CHARACTERS.find((item) => item.id === selectedId) ?? null;
  const localizedScenes = useMemo(() => getLocalizedLoveScenes(locale), [locale]);
  const scenes = useMemo(() => buildPlayableScenes(character, localizedScenes, copy), [character, localizedScenes, copy]);
  const currentScene = scenes[sceneIndex] ?? null;
  const isShowingResponse = Boolean(selectedChoice);
  const metrics = getRelationshipMetrics(stats, locale);
  const scenePrelude = useMemo(() => (character && currentScene ? buildScenePrelude(character, currentScene) : []), [character, currentScene]);
  const primaryMatch = matchResults[0] ?? null;
  const primaryMatchCharacter = useMemo(
    () => (primaryMatch ? LOVE_CHARACTERS.find((item) => item.id === primaryMatch.characterId) ?? null : null),
    [primaryMatch],
  );
  const secondaryMatchLabels = matchResults
    .slice(1, 3)
    .map((item) => formatTemplate(copy.secondaryMatchTypeLabel, { name: item.characterName }));
  const canMatchPartner = Boolean(partnerBirthDate && !isMatching);

  // 유료 게이트는 이 한 곳(시뮬레이션 시작)에서만 돈다. 진입점(메인 타일·사주 분석 카드·직접 URL)에는
  // 게이트를 걸지 않는다 — 사용자가 상대를 고르기도 전에 결제가 돌기 때문이다.
  // 🔴 가격은 게이트에 반드시 함께 넘긴다. "클라이언트 cost 를 넘기면 서버 이용권 프로브를 건너뛴다"는
  //    옛 주석은 틀렸다 — cost 는 스냅샷 판정을 켜는 입력이고, 빼면 결제창이 0원으로 뜬다.
  const startWithCharacter = async (id: CharacterId, mode: "preset" | "sajuMatch" = "preset") => {
    if (isStartingSimulation) return;
    const requestId = `love-simulation:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    setIsStartingSimulation(true);
    try {
      openPaidFeatureGate({
        featureKey: LOVE_SIMULATION_FEATURE_KEY,
        requestId,
        cost: LOVE_SIMULATION_FEATURE_COST,
        paymentMode: "pass",
        message: copy.checkingPassMessage,
      });
      holdPaidFeatureGateOpen({ requestId, maxMs: 8000 });

      const gate = await runPaidAccessGate({
        featureKey: LOVE_SIMULATION_FEATURE_KEY,
        reason: LOVE_SIMULATION_FEATURE_REASON,
        requestId,
        cost: LOVE_SIMULATION_FEATURE_COST,
        coinPrice: LOVE_SIMULATION_FEATURE_COST,
        amountKRW: LOVE_SIMULATION_FEATURE_AMOUNT_KRW,
      });

      if (!gate.ok) {
        const code = String(gate.error?.code || "").toUpperCase();
        const message =
          code === "AUTH_REQUIRED"
            ? copy.loginRequiredError
            : code === "INSUFFICIENT_COINS"
              ? copy.paymentRequiredError
              : gate.error?.message || copy.paymentVerifyFailedError;
        updatePaidFeatureGate({ featureKey: LOVE_SIMULATION_FEATURE_KEY, requestId, status: "error", message });
        setMatchError(message);
        return;
      }

      setMatchError("");
      startSimulationScene(id, mode);
    } finally {
      releasePaidFeatureGate(requestId);
      setIsStartingSimulation(false);
    }
  };

  const startSimulationScene = (id: CharacterId, mode: "preset" | "sajuMatch") => {
    const nextCoupleCompatibility = mode === "sajuMatch" ? coupleCompatibility : null;
    setSelectedId(id);
    setEntryMode(mode);
    setSceneIndex(0);
    setStats(INITIAL_STATS);
    setProfile(null);
    setProfileStatus("loading");
    setCoupleCompatibility(nextCoupleCompatibility);
    setInitialCompatibilityNote(
      nextCoupleCompatibility
        ? `${nextCoupleCompatibility.grade} 흐름으로 시작합니다. ${nextCoupleCompatibility.chips.slice(0, 2).join(" · ")}`
        : "프로필 카드 사주를 확인해 초반 궁합 흐름을 맞추는 중입니다.",
    );
    setSelectedChoice(null);
    setIsChoiceOpen(false);
    setChoiceLog([]);
    setExpandedProfileId(null);
    setScreen("play");
  };

  // 진입 시 두 사람의 명식으로 궁합 프로필을 1회 계산해 고정한다.
  // 사주 계산은 기본 사주 분석(animal-destiny)과 동일한 경로(normalizeSajuForPerson)를 쓴다. 선택지/stats와 무관.
  useEffect(() => {
    if ((screen !== "play" && screen !== "result") || !character) return;

    let cancelled = false;
    setProfileStatus("loading");

    void (async () => {
      const seed = readCurrentProfileSeed();
      const selfInput = seed ? profileSeedToAnimalInput(seed) : null;
      const partnerInput =
        entryMode === "sajuMatch"
          ? partnerFieldsToAnimalInput({
              name: partnerName,
              birthDate: partnerBirthDate,
              calType: partnerCalType,
              hour: partnerHour,
              minute: partnerMinute,
              hasTime: partnerHasTime,
              gender: partnerGender,
            })
          : null;

      const [selfNorm, partnerNorm] = await Promise.all([
        selfInput ? normalizeSajuForPerson(selfInput) : Promise.resolve(null),
        entryMode === "sajuMatch"
          ? partnerInput
            ? normalizeSajuForPerson(partnerInput)
            : Promise.resolve(null)
          : Promise.resolve(getCharacterNormalizedSaju(character.id)),
      ]);
      if (cancelled) return;

      if (selfNorm && partnerNorm) {
        setProfile(Object.freeze(computeCompatibilityProfile(selfNorm, partnerNorm, WEIGHTS)));
        setProfileStatus("ready");
        setInitialCompatibilityNote(
          entryMode === "sajuMatch"
            ? "두 사람의 사주로 궁합을 계산했어요. 선택은 결과를 바꾸지 않아요."
            : "내 사주와 캐릭터의 사주로 궁합을 계산했어요. 선택은 결과를 바꾸지 않아요.",
        );
      } else {
        setProfile(null);
        setProfileStatus("error");
        setInitialCompatibilityNote(
          !selfNorm
            ? "내 생년월일을 프로필에 연결하면 결정론적 궁합을 계산할 수 있어요."
            : "상대의 생년월일을 확인하지 못했어요. 입력값을 다시 확인해 주세요.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [character, entryMode, screen, partnerName, partnerBirthDate, partnerCalType, partnerHour, partnerMinute, partnerHasTime, partnerGender]);

  const handleChoice = (choice: LoveChoice) => {
    if (!currentScene || selectedChoice) return;
    setSelectedChoice(choice);
    setIsChoiceOpen(false);
    setStats((current) => applyEffects(current, choice.effects));
    setChoiceLog((current) => [
      ...current,
      {
        sceneId: currentScene.id,
        choiceId: choice.id,
        tone: resolveChoiceTone(choice),
        effects: choice.effects,
      },
    ]);
  };

  const goNextScene = () => {
    if (sceneIndex >= scenes.length - 1) {
      setScreen("result");
      return;
    }

    setSceneIndex((current) => current + 1);
    setSelectedChoice(null);
    setIsChoiceOpen(false);
  };

  const resetToSelect = () => {
    setSelectedChoice(null);
    setSceneIndex(0);
    setStats(INITIAL_STATS);
    setChoiceLog([]);
    setIsChoiceOpen(false);
    setExpandedProfileId(null);
    setScreen("select");
  };

  const matchPartner = async (input?: PartnerMatchInput) => {
    const targetInput = input ?? {
      name: partnerName,
      birthDate: partnerBirthDate,
      calType: partnerCalType,
      hour: partnerHour,
      minute: partnerMinute,
      country: partnerCountry,
      gender: partnerGender,
      hasTime: partnerHasTime,
    };
    const [year, month, day] = targetInput.birthDate.split("-").map((value) => Number(value));
    if (!year || !month || !day) {
      setMatchResults([]);
      setCoupleCompatibility(null);
      setMatchError(copy.matchAnalysisFailedError);
      return;
    }

    setIsMatching(true);
    setMatchError("");
    setMatchResults([]);
    setCoupleCompatibility(null);

    try {
      const profileSeed = readCurrentProfileSeed();
      const profileBirth = profileSeed ? parseProfileSeedBirthDate(profileSeed.birthDate) : null;
      const [partnerSaju, selfSaju] = await Promise.all([
        fetchSajuPillar({
          name: targetInput.name.trim() || "상대",
          gender: targetInput.gender === "male" ? "남" : "여",
          year,
          month,
          day,
          hour: Number(targetInput.hour) || 12,
          minute: Number(targetInput.minute) || 0,
          hasTime: targetInput.hasTime,
          calendarType: targetInput.calType,
          timezone: targetInput.country,
        }),
        profileSeed && profileBirth
          ? fetchSajuPillar({
              name: profileSeed.name || "나",
              gender: profileSeed.gender,
              year: profileBirth.year,
              month: profileBirth.month,
              day: profileBirth.day,
              hour: profileSeed.hour,
              minute: profileSeed.minute,
              hasTime: profileSeed.hasTime,
              calendarType: profileSeed.calendarType,
              timezone: profileSeed.timezone,
            })
          : Promise.resolve(null),
      ]);
      const results = matchLoveCharactersFromSaju(partnerSaju, LOVE_CHARACTERS, matchingCopy, characterCopy, targetInput.gender);
      const compatibility = selfSaju ? buildSajuCoupleCompatibility(selfSaju, partnerSaju, matchingCopy) : null;

      if (results.length === 0) throw new Error("empty love character match result");
      setMatchResults(results);
      setCoupleCompatibility(compatibility);
    } catch {
      setMatchResults([]);
      setCoupleCompatibility(null);
      setMatchError(copy.matchAnalysisFailedError);
    } finally {
      setIsMatching(false);
    }
  };

  if (screen === "intro") {
    return (
      <section className="relative min-h-[100svh] overflow-hidden bg-[#08060d] text-white">
        {/* lg 미만에서는 히어로를 원본 종횡비 그대로의 상단 밴드에 가둔다. 예전에는 inset-0 +
            object-cover 라 폼까지 쌓인 ~2000px 높이를 덮느라 배율 2.13 이 걸려 가로 11% 만 보였다.
            🔴 이 래퍼에는 transform/filter/opacity/z-index 를 넣지 말 것 — 스태킹 컨텍스트가 생기면
               아래 오버레이 두 겹이 히어로 밑으로 내려간다. lg 이상 박스는 예전과 동일하다. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 aspect-[1672/941] max-h-[46svh] overflow-hidden lg:inset-0 lg:aspect-auto lg:max-h-none"
        >
          {/* 🔴 opacity-72 는 Tailwind 에 없는 클래스였다(빌드 CSS 31개 전수 0건 = 실효 opacity 1.0).
              "복원"하면 데스크톱 히어로가 28% 어두워진다 — 되살리지 말 것. */}
          <m.img
            src={LOVE_CODE_HERO_ASSET}
            srcSet={LOVE_CODE_HERO_SRCSET}
            sizes={LOVE_CODE_HERO_SIZES}
            onError={handleHeroSrcSetFailure}
            alt=""
            decoding="async"
            fetchPriority="high"
            className="h-full w-full object-cover object-center"
            {...(ambient
              ? {
                  animate: { scale: [1.02, 1.055, 1.02], x: [0, -10, 0] },
                  transition: { duration: 18, repeat: Infinity, ease: "easeInOut" },
                }
              : {})}
          />
          {/* 🔴 고정 높이 페이드로 두지 말 것 — 밴드 높이는 뷰포트 폭에 따라 219px(390) ~ 432px(768)
              로 변한다. 고정 h-24 였을 때 768 에서 서브카피가 밝은 로고아트 위에 놓여 대비 1.76:1 이었다
              (visual-checker 실측 2026-09-02). 비율 스톱이라 밴드 하단은 항상 배경색 #08060d 로 닫힌다. */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,6,13,0)_0%,rgba(8,6,13,0.06)_36%,rgba(8,6,13,0.58)_74%,#08060d_100%)] lg:hidden" />
          {/* 🔴 위 레이어는 비율 스톱이라 밴드 하단을 배경색으로 닫아 주지만, 카피의 y 좌표는 폭과 무관하게
              고정이다(실측 2026-09-02: eyebrow 162~182px · h1 198px · desc 342px — 360~1023 전 폭 동일).
              밴드만 커지므로(219px@390 → 432px@768) 같은 줄이 밴드의 74% 에서 38% 로 올라가 알파가 0.58 →
              0.06 으로 무너진다. 실제로 768 에서 eyebrow 대비가 1.52:1 이었다.
              그래서 이 레이어는 **px 앵커**다 — 스톱을 밴드 높이가 아니라 카피 위치에 맞춘다.
              🔴 sm(640) 미만은 붙이지 않는다. 390/430 은 이미 7.08:1 로 통과하는데 여기서 덧칠하면
              폰에서 보이는 아트만 다시 줄어든다(그게 이번 작업의 목적이었다). */}
          <div className="absolute inset-0 hidden bg-[linear-gradient(180deg,rgba(8,6,13,0)_118px,rgba(8,6,13,0.55)_150px,rgba(8,6,13,0.8)_176px,rgba(8,6,13,0.8)_100%)] sm:block lg:hidden" />
        </div>
        {/* 90deg 그라디언트는 2열 레이아웃에서 왼쪽 텍스트를 읽히게 하려는 장치다(좌측 알파 0.94).
            1열이 되면 목적을 잃고 그림만 덮으므로 모바일에서는 세로 그라디언트로 대체한다. */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,6,13,0.94)_0%,rgba(24,11,24,0.82)_34%,rgba(35,14,31,0.46)_58%,rgba(7,8,14,0.76)_100%)] max-lg:bg-[linear-gradient(180deg,rgba(8,6,13,0.10)_0%,rgba(8,6,13,0.34)_30%,rgba(8,6,13,0.78)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_28%_24%,rgba(255,221,236,0.22)_0%,rgba(255,221,236,0)_38%),linear-gradient(180deg,rgba(255,244,231,0.08)_0%,rgba(255,255,255,0)_34%,rgba(4,6,12,0.58)_100%)]" />
        {/* 🔴 hidden lg:block 이 아니라 조건 렌더다 — display:none 이어도 framer 는 루프를 계속 돈다. */}
        {ambient ? (
          <m.div
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-100/70 to-transparent"
            animate={{ opacity: [0.35, 0.9, 0.35] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}
        {ambient ? (
          <m.div
            className="absolute left-0 top-0 h-full w-1/2 bg-[linear-gradient(105deg,rgba(255,255,255,0)_0%,rgba(255,226,235,0.14)_48%,rgba(255,255,255,0)_100%)]"
            animate={{ x: ["-120%", "220%"] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.4 }}
          />
        ) : null}
        <div className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-between px-5 py-7 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <m.span
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-rose-100/30 bg-white/12 shadow-[0_16px_42px_rgba(244,114,182,0.24)] backdrop-blur-xl max-lg:backdrop-filter-none max-lg:bg-[rgba(22,13,26,0.92)]"
                {...(ambient
                  ? {
                      animate: { y: [0, -3, 0], boxShadow: ["0 16px 42px rgba(244,114,182,0.18)", "0 20px 52px rgba(255,214,232,0.30)", "0 16px 42px rgba(244,114,182,0.18)"] },
                      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                    }
                  : {})}
              >
                <Sparkles className="h-5 w-5 text-rose-100" />
              </m.span>
              <span className="text-sm font-black uppercase tracking-[0.28em] text-rose-50/82">Love Code</span>
            </div>
          </header>

          <div className="grid items-center gap-9 py-8 lg:grid-cols-[0.96fr_1.04fr] lg:py-10">
            <m.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }} className="max-w-2xl">
              <m.div
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-rose-100/26 bg-white/[0.09] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-rose-50/86 shadow-[0_16px_42px_rgba(0,0,0,0.22)] backdrop-blur-xl max-lg:backdrop-filter-none max-lg:bg-[rgba(22,13,26,0.92)]"
                {...(ambient
                  ? {
                      animate: { y: [0, -2, 0] },
                      transition: { duration: 5, repeat: Infinity, ease: "easeInOut" },
                    }
                  : {})}
              >
                <Sparkles className="h-3.5 w-3.5 text-rose-100" />
                Visual Novel Match
              </m.div>
              <p className="mb-4 text-sm font-black text-rose-100/92">{copy.introEyebrow}</p>
              {/* 🔴 h1 이 아니라 h2 다 — 이 라우트의 h1 은 page.tsx 의 ServiceIntroSection 이 소유한다.
                  이 컴포넌트는 dynamic(ssr:false) 라 서버 HTML 에는 안 나오지만 하이드레이션 뒤에는
                  같은 문서에 함께 존재하므로, h1 로 두면 브라우저에서 h1 이 2개가 된다.
                  가드: npm run verify:hydrated-h1-integrity (서버 HTML 만 보는 seo-heading-integrity 가
                  아니다 — 그쪽은 이 파일을 애초에 보지 못한다). */}
              <h2 className="max-w-[760px] text-5xl font-black leading-[1.02] text-white drop-shadow-[0_12px_38px_rgba(0,0,0,0.55)] sm:text-6xl lg:text-7xl">
                {copy.introTitle}
              </h2>
              <p className="mt-6 max-w-xl text-base font-semibold leading-8 text-rose-50/78 drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)] sm:text-lg">
                {copy.introDescription}
              </p>
              <div className="mt-6 grid max-w-xl gap-2 text-sm font-bold text-white/72 sm:grid-cols-3">
                {[copy.introChips.saju, copy.introChips.dialogue, copy.introChips.flow].map((label) => (
                  <div key={label} className="rounded-lg border border-white/12 bg-black/18 px-4 py-3 shadow-[0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-xl max-lg:backdrop-filter-none max-lg:bg-black/45">
                    {label}
                  </div>
                ))}
              </div>
              <div className="hidden">
              <p className="mb-5 text-sm font-black text-rose-100/92">{copy.introEyebrow}</p>
              <h2 className="text-5xl font-black leading-[0.98] text-white sm:text-6xl lg:text-7xl">
                {copy.introTitle}
              </h2>
              <p className="mt-6 max-w-xl text-base font-semibold leading-8 text-white/66 sm:text-lg">
                {copy.introDescription}
              </p>
              </div>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => setScreen("select")}
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-white via-rose-50 to-pink-100 px-6 py-4 text-sm font-black text-zinc-950 shadow-[0_22px_56px_rgba(255,198,218,0.28)] transition hover:brightness-105"
                >
                  {copy.selectCharacterButton}
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => void matchPartner()}
                  disabled={!canMatchPartner}
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-lg border border-rose-100/32 bg-white/[0.12] px-6 py-4 text-sm font-black text-white/90 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur-xl transition hover:bg-white/20 disabled:cursor-not-allowed disabled:text-white/38 disabled:hover:bg-white/10 max-lg:backdrop-filter-none max-lg:bg-white/[0.18]"
                >
                  {isMatching ? copy.matchingReadingButton : copy.matchWithPartnerButton}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </m.div>

            <m.form
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                // partnerHour/partnerMinute select 2개는 <input type="time" name="partnerTime"> 로 합쳤다 —
                // 이 필드를 HH:MM 으로 분해해서 읽는다(옛 name 을 그대로 두면 매번 fallback 12:00 으로 조용히 제출된다).
                const [rawHour, rawMinute] = String(formData.get("partnerTime") ?? "").split(":");
                void matchPartner({
                  name: String(formData.get("partnerName") ?? ""),
                  birthDate: String(formData.get("partnerBirthDate") ?? ""),
                  calType: String(formData.get("partnerCalType") ?? "solar") as PartnerCalendarType,
                  hour: String(Number(rawHour) || 0),
                  minute: String(Number(rawMinute) || 0),
                  country: String(formData.get("partnerCountry") ?? "Asia/Seoul"),
                  gender: partnerGender,
                  hasTime: partnerHasTime,
                });
              }}
              className="rounded-lg border border-rose-100/20 bg-white/[0.09] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:p-7 max-lg:backdrop-filter-none max-lg:bg-[rgba(22,13,26,0.94)] max-lg:shadow-[0_18px_44px_rgba(0,0,0,0.42)]"
              aria-label={copy.matchFormAria}
            >
              <div className="mb-5">
                <span className="text-xs font-black uppercase tracking-[0.24em] text-rose-100/86">LOVE MATCH</span>
                <h2 className="mt-3 text-3xl font-black text-white">{copy.matchFormAria}</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-white/62">{copy.matchFormDescription}</p>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-black text-white/90" htmlFor="lovePartnerName">{copy.nameFieldLabel}</label>
                  <input
                    className="min-h-14 w-full rounded-lg border border-white/15 bg-white/95 px-5 text-base font-bold text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-rose-200 focus:ring-4 focus:ring-rose-100/25"
                    type="text"
                    id="lovePartnerName"
                    name="partnerName"
                    placeholder={copy.partnerNamePlaceholder}
                    autoComplete="name"
                    inputMode="text"
                    enterKeyHint="next"
                    value={partnerName}
                    onChange={(event) => setPartnerName(event.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-white/90" htmlFor="lovePartnerBirthDate">{copy.birthDateFieldLabel}</label>
                  <input
                    className="min-h-14 w-full rounded-lg border border-white/15 bg-white/95 px-5 text-base font-bold text-zinc-950 outline-none transition focus:border-rose-200 focus:ring-4 focus:ring-rose-100/25"
                    type="text"
                    id="lovePartnerBirthDate"
                    name="partnerBirthDate"
                    aria-label={copy.birthDateAria}
                    autoComplete="bday"
                    inputMode="numeric"
                    maxLength={8}
                    pattern="[0-9]{8}"
                    placeholder="YYYYMMDD"
                    required
                    value={formatBirthDateDigits(partnerBirthDate)}
                    onChange={(event) => setPartnerBirthDate(normalizeBirthDateFromDigits(event.target.value))}
                  />
                  <div className="mt-3 grid gap-2 text-sm font-bold text-white/82 sm:grid-cols-3">
                    {[
                      ["solar", copy.calendarOptions.solar],
                      ["lunar", copy.calendarOptions.lunarRegular],
                      ["lunar_leap", copy.calendarOptions.lunarLeap],
                    ].map(([value, label]) => (
                      <label key={value} className="flex min-h-11 items-center gap-2 rounded-lg border border-rose-100/14 bg-black/20 px-3 transition hover:bg-white/10">
                        <input
                          type="radio"
                          name="partnerCalType"
                          value={value}
                          checked={partnerCalType === value}
                          onChange={() => setPartnerCalType(value as PartnerCalendarType)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 min-h-9 rounded-lg border border-rose-100/18 bg-rose-100/10 px-3 py-2 text-xs font-bold text-rose-50/82">
                    {copy.calendarHint}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-white/90" htmlFor="lovePartnerTime">{copy.birthTimeFieldLabel}</label>
                  <input
                    className="min-h-14 w-full rounded-lg border border-white/15 bg-white/95 px-4 text-base font-bold text-zinc-950 outline-none transition focus:border-rose-200 focus:ring-4 focus:ring-rose-100/25"
                    type="time"
                    id="lovePartnerTime"
                    name="partnerTime"
                    aria-label={copy.birthHourAria}
                    value={`${String(Number(partnerHour) || 0).padStart(2, "0")}:${String(Number(partnerMinute) || 0).padStart(2, "0")}`}
                    onChange={(event) => {
                      const [hour, minute] = event.target.value.split(":");
                      setPartnerHour(String(Number(hour) || 0));
                      setPartnerMinute(String(Number(minute) || 0));
                      setPartnerHasTime(true);
                    }}
                  />
                </div>

                <div className="rounded-lg border border-rose-100/28 bg-rose-50/95 p-4 text-zinc-950 shadow-[0_18px_40px_rgba(255,228,230,0.12)]">
                  <label className="mb-2 block text-sm font-black" htmlFor="lovePartnerCountry">
                    {copy.birthCountryFieldLabel} <span className="text-xs font-bold text-zinc-500">{copy.birthCountryNote}</span>
                  </label>
                  <input
                    className="min-h-14 w-full rounded-lg border border-zinc-200 bg-white px-4 text-base font-bold outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-200/45"
                    type="text"
                    list="love-partner-country-presets"
                    id="lovePartnerCountry"
                    name="partnerCountry"
                    aria-label={copy.birthCountryAria}
                    autoComplete="off"
                    value={partnerCountry}
                    onChange={(event) => setPartnerCountry(event.target.value)}
                  />
                  <datalist id="love-partner-country-presets">
                    {partnerCountryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </datalist>
                  <p className="mt-2 text-xs font-bold leading-5 text-zinc-600">
                    {partnerCountryOptions.find((option) => option.value === partnerCountry)?.label ?? partnerCountry}
                  </p>
                  <p className="mt-3 text-xs font-bold leading-5 text-zinc-600">{copy.matchNote}</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-white/90">{copy.partnerGenderFieldLabel}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ["female", copy.genderFemaleOption],
                      ["male", copy.genderMaleOption],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPartnerGender(value as PartnerGender)}
                        className={`min-h-13 rounded-lg border px-4 text-sm font-black transition ${
                          partnerGender === value
                            ? "border-rose-100 bg-rose-100 text-zinc-950 shadow-[0_14px_34px_rgba(255,228,230,0.18)]"
                            : "border-white/15 bg-white/10 text-white hover:bg-white/18"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-rose-100/14 bg-black/24 px-4 py-3 text-sm font-bold text-rose-50/86">
                  {partnerHasTime ? copy.timeKnownNote : copy.timeUnknownNote}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPartnerHour("12");
                    setPartnerMinute("0");
                    setPartnerHasTime(false);
                  }}
                  className="min-h-12 rounded-lg border border-white/15 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/18"
                >
                  {copy.unknownTimeButton}
                </button>
                <button
                  type="submit"
                  disabled={!canMatchPartner}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rose-100 via-pink-100 to-violet-100 px-5 text-sm font-black text-zinc-950 shadow-[0_20px_48px_rgba(244,114,182,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isMatching ? copy.matchingInProgress : copy.startMatchButton}
                  <ChevronRight className="h-4 w-4" />
                </button>
                <AnimatePresence mode="wait">
                  {matchError ? (
                    <m.div
                      key="match-error"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="rounded-lg border border-rose-100/24 bg-rose-950/34 px-4 py-3 text-sm font-bold leading-6 text-rose-50"
                    >
                      {matchError}
                    </m.div>
                  ) : null}
                  {primaryMatch && primaryMatchCharacter ? (
                    <RecommendedMatchCard
                      key={primaryMatch.characterId}
                      character={primaryMatchCharacter}
                      result={primaryMatch}
                      secondaryLabels={secondaryMatchLabels}
                      compatibility={coupleCompatibility}
                      matchingCopy={matchingCopy}
                      copy={copy}
                      onStart={() => void startWithCharacter(primaryMatch.characterId, "sajuMatch")}
                    />
                  ) : null}
                </AnimatePresence>
              </div>
            </m.form>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </section>
    );
  }

  if (screen === "select") {
    return (
      <section className="relative min-h-[100svh] overflow-hidden bg-[#17171d] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(130deg,#151721_0%,#301a29_42%,#46233b_64%,#111827_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,244,231,0.08)_0%,rgba(255,255,255,0)_34%,rgba(4,6,12,0.48)_100%)]" />
        <div className="relative mx-auto w-full max-w-6xl px-5 py-7 sm:px-8 lg:px-10">
          <header className="mb-8 flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.07] px-4 py-3 shadow-[0_20px_56px_rgba(0,0,0,0.24)] backdrop-blur-xl max-lg:backdrop-filter-none max-lg:bg-white/[0.10]">
            <button
              onClick={() => setScreen("intro")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white transition hover:bg-white/20"
              aria-label={copy.backToIntro}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="text-right">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-100/60">Preset Character</p>
              <h2 className="text-xl font-black">{copy.characterSelectTitle}</h2>
            </div>
          </header>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {LOVE_CHARACTERS.map((item) => {
              const isExpanded = expandedProfileId === item.id;

              return (
                <m.article
                  key={item.id}
                  layout={ambient}
                  initial={ambient ? { opacity: 0, y: 16 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={ambient ? { y: -4 } : undefined}
                  onClick={() => setExpandedProfileId(isExpanded ? null : item.id)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    setExpandedProfileId(isExpanded ? null : item.id);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  className={`group overflow-hidden rounded-lg border bg-gradient-to-br shadow-[0_24px_66px_rgba(0,0,0,0.32)] outline-none transition focus-visible:ring-4 focus-visible:ring-rose-100/30 ${
                    isExpanded ? `border-rose-100/28 sm:col-span-2 xl:col-span-3 ${item.palette.shell}` : `border-white/12 ${item.palette.shell}`
                  }`}
                >
                  <div className={`grid ${isExpanded ? "xl:grid-cols-[1.12fr_0.88fr]" : ""}`}>
                    <div className="bg-black/20">
                      <div
                        className={`relative flex items-end justify-center overflow-hidden bg-black/18 ${isExpanded ? "h-[min(72svh,620px)] min-h-[360px]" : "h-auto"}`}
                        style={isExpanded ? undefined : { aspectRatio: getProfileCropAspect(item) }}
                      >
                        <div className={`absolute inset-x-8 bottom-12 h-44 rounded-full blur-3xl ${isExpanded ? "" : "max-lg:hidden"} ${item.palette.halo}`} />
                        {isExpanded ? (
                          <img
                            src={item.asset}
                            alt={formatTemplate(copy.fullProfileAlt, { name: characterCopy[item.id].name })}
                            className="relative z-10 h-full w-full object-contain p-3 drop-shadow-[0_22px_34px_rgba(0,0,0,0.48)]"
                          />
                        ) : (
                          <CharacterProfileCrop
                            character={item}
                            className="absolute inset-0 rounded-none"
                            alt={formatTemplate(copy.profileFaceAlt, { name: characterCopy[item.id].name })}
                          />
                        )}
                      </div>
                      <div className="border-t border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl max-lg:backdrop-filter-none max-lg:bg-white/[0.07]">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-sm font-bold ${item.palette.accent}`}>{characterCopy[item.id].archetype}</p>
                            <h3 className="mt-1 text-3xl font-black text-white">{characterCopy[item.id].name}</h3>
                            <p className="mt-2 text-sm font-semibold leading-6 text-white/62">{isExpanded ? copy.profileExpandedNote : copy.profileCollapsedNote}</p>
                          </div>
                          <span className="shrink-0 rounded-full border border-rose-100/18 bg-white/12 px-3 py-1 text-xs font-black text-white/78">
                            {isExpanded ? copy.profileCollapseButton : copy.profileExpandButton}
                          </span>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {isExpanded ? (
                        <m.div
                          key="profile"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.24, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="flex max-h-[72svh] flex-col justify-between gap-7 overflow-y-auto p-5 sm:p-7">
                            <div>
                              <div className="mb-4 flex flex-wrap items-center gap-2">
                                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${item.palette.chip}`}>{formatTemplate(copy.dayMasterBadge, { dayMaster: item.dayMaster })}</span>
                                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/60">
                                  {item.gender === "male" ? copy.maleCharacterBadge : copy.femaleCharacterBadge}
                                </span>
                              </div>
                              <p className="text-sm leading-7 text-white/72">{characterCopy[item.id].profileLine}</p>
                              <div className="mt-5 flex flex-wrap gap-2">
                                {item.keywords.slice(0, 5).map((keyword) => (
                                  <span key={keyword} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="grid gap-4 text-sm text-white/72">
                              <div className="flex gap-3 rounded-lg border border-white/10 bg-black/18 p-4">
                                <UserRound className="mt-1 h-4 w-4 shrink-0 text-white/50" />
                                <p>{item.personality}</p>
                              </div>
                              <div className="flex gap-3 rounded-lg border border-white/10 bg-black/18 p-4">
                                <MessageCircle className="mt-1 h-4 w-4 shrink-0 text-white/50" />
                                <p>{item.speechStyle}</p>
                              </div>
                            </div>

                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                void startWithCharacter(item.id, "preset");
                              }}
                              disabled={isStartingSimulation}
                              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r px-5 py-3 text-sm font-bold text-zinc-950 shadow-[0_18px_36px_rgba(0,0,0,0.22)] transition hover:brightness-110 ${item.palette.button}`}
                            >
                              {formatTemplate(copy.talkWithButton, { name: characterCopy[item.id].name })}
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </m.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </m.article>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  if ((screen === "play" || screen === "result") && (!character || !currentScene)) {
    return (
      <section className="flex min-h-[100svh] items-center justify-center bg-zinc-950 p-6 text-white">
        <button onClick={() => setScreen("select")} className="rounded-lg bg-white px-5 py-3 text-sm font-bold text-zinc-950">
          {copy.reselectCharacterButton}
        </button>
      </section>
    );
  }

  if (screen === "result" && character) {
    if (profileStatus === "loading" || profileStatus === "idle") {
      return (
        <section className="flex min-h-[100svh] items-center justify-center bg-[#0b0710] p-6 text-center text-white">
          <div className="max-w-sm space-y-3">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/25 border-t-rose-200" />
            <p className="text-sm font-bold text-rose-50">{copy.calculatingCompatibility}</p>
          </div>
        </section>
      );
    }
    if (!profile) {
      return (
        <section className="flex min-h-[100svh] items-center justify-center bg-[#0b0710] p-6 text-center text-white">
          <div className="max-w-sm space-y-4">
            <p className="text-base font-bold leading-7 text-rose-50">
              {initialCompatibilityNote || copy.compatibilityInfoMissing}
            </p>
            <button onClick={resetToSelect} className="rounded-lg bg-white px-5 py-3 text-sm font-bold text-zinc-950">
              {copy.reselectButton}
            </button>
          </div>
        </section>
      );
    }
    const result = {
      title: profile.coreVerdict,
      body: formatTemplate(copy.compatibilityResultBody, { grade: profile.grade, score: String(profile.score) }),
    };
    const choiceAnalysis = analyzeChoiceLogs(choiceLog);
    const characterResultSummary = CHARACTER_RESULT_SUMMARIES[character.id];
    const customAdvice = buildCustomAdvice(character, choiceAnalysis);
    const myeongliCoda = buildMyeongliResultCoda(character);
    const riskCoda = buildMyeongliRiskCoda(character);
    const sajuEntrySummary = buildSajuEntrySummary(entryMode, character);
    const sajuCompatibility = buildSajuCompatibilityVerdict(profile);
    const dateOutcome = buildDateOutcome(character, stats, choiceAnalysis, choiceLog);
    const finalRelationshipType = resolveFinalRelationshipType(stats, copy);
    const recentChoiceRecaps = buildRecentChoiceRecaps(choiceLog, scenes);

    return (
      <section className={`min-h-[100svh] bg-gradient-to-br ${character.palette.shell} text-white`}>
        <div className="mx-auto grid min-h-[100svh] w-full max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:px-10">
          <div className="flex flex-col justify-between gap-6">
            <button
              onClick={resetToSelect}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white transition hover:bg-white/20"
              aria-label={copy.backToCharacterSelect}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <CharacterPortrait
                character={character}
                mode="result"
                alt={formatTemplate(copy.portraitAlt, { name: characterCopy[character.id].name })}
              />
              <div className="mt-5">
                <p className={`text-sm font-semibold ${character.palette.accent}`}>{character.dayMaster} 일간 · {characterCopy[character.id].archetype}</p>
                <h2 className="mt-2 text-4xl font-bold">{characterCopy[character.id].name}</h2>
              </div>
            </div>
          </div>

          <m.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col justify-center">
            <div className="rounded-lg border border-white/20 bg-black/40 p-5 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
                  <Heart className="h-5 w-5 fill-rose-200 text-rose-200" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Final Code</p>
                  <h2 className="text-2xl font-bold sm:text-3xl">{result.title}</h2>
                </div>
              </div>

              <p className="text-base leading-8 text-white/75">{result.body}</p>
              <p className="mt-4 text-sm font-semibold leading-8 text-rose-50/76">
                {characterResultSummary} {myeongliCoda}
              </p>

              <div className="mt-7 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <ResultCard eyebrow="Saju Compatibility" title={formatTemplate(copy.coupleScoreLine, { grade: sajuCompatibility.grade, score: String(sajuCompatibility.score) })}>
                  <p>{sajuCompatibility.body}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {sajuCompatibility.chips.map((chip) => (
                      <span key={chip} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black text-white/68">
                        {chip}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-2">
                    {sajuCompatibility.reasons.slice(0, 3).map((reason) => (
                      <p key={reason} className="rounded-lg border border-white/10 bg-black/18 px-3 py-2 text-xs font-bold leading-6 text-white/66">
                        {reason}
                      </p>
                    ))}
                  </div>
                  <p className="mt-4 rounded-lg border border-rose-100/14 bg-rose-100/10 px-3 py-2 text-xs font-bold leading-6 text-rose-50/78">
                    {formatTemplate(copy.riskLine, { risk: sajuCompatibility.risk })}
                  </p>
                  <p className="mt-3 text-xs font-bold leading-6 text-white/58">{formatTemplate(copy.dateTipLine, { tip: sajuCompatibility.dateTip })}</p>
                </ResultCard>
                <ResultCard eyebrow="Date Result" title={dateOutcome.title}>
                  <p>{dateOutcome.body}</p>
                  <p className="mt-3 rounded-lg border border-rose-100/18 bg-rose-100/10 px-3 py-2 text-xs font-black leading-6 text-rose-50/86">{dateOutcome.highlight}</p>
                  <p className="mt-3 text-xs font-bold leading-6 text-white/58">
                    {formatTemplate(copy.relationshipRouteLine, { title: finalRelationshipType.title, body: finalRelationshipType.body })}
                  </p>
                </ResultCard>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { label: copy.dimensionLabels.attraction, value: profile.dimensions.attraction.score },
                  { label: copy.dimensionLabels.stability, value: profile.dimensions.stability.score },
                  { label: copy.dimensionLabels.communication, value: profile.dimensions.communication.score },
                  { label: copy.dimensionLabels.longevity, value: profile.dimensions.longevity.score },
                  { label: copy.dimensionLabels.conflict, value: 100 - profile.dimensions.conflict.score },
                ].map((metric) => (
                  <MetricBar key={metric.label} label={metric.label} value={metric.value} tone={copy.metricTone} />
                ))}
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-white/10 p-4">
                  <h3 className="mb-3 text-sm font-bold text-white">{copy.sajuSummaryTitle}</h3>
                  <p className="text-sm leading-7 text-white/70">
                    {sajuEntrySummary}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/10 p-4">
                  <h3 className="mb-3 text-sm font-bold text-white">{copy.myeongliPointsTitle}</h3>
                  <p className="text-sm leading-7 text-white/70">{customAdvice}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/10 p-4">
                  <h3 className="mb-3 text-sm font-bold text-white">{copy.avoidFlowTitle}</h3>
                  <p className="text-sm leading-7 text-white/70">{riskCoda}</p>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-white/10 bg-white/10 p-4">
                <h3 className="mb-3 text-sm font-bold text-white">{copy.choiceAnalysisTitle}</h3>
                <div className="grid gap-3">
                  <p className="text-sm leading-7 text-white/76">{choiceAnalysis.summary}</p>
                  {recentChoiceRecaps.map((recap, index) => (
                    <div key={`${recap.sceneLabel}-${recap.choiceText}`} className="border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
                      <p className="text-xs font-semibold text-white/50">{formatTemplate(copy.choiceRecapLabel, { index: String(choiceLog.length - recentChoiceRecaps.length + index + 1), scene: recap.sceneLabel })}</p>
                      <p className="mt-1 text-sm text-white/80">
                        {recap.choiceText}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-6 text-white/58">
                        {formatTemplate(copy.choiceRecapInsight, { tone: recap.tone, insight: recap.insight })}
                      </p>
                    </div>
                  ))}
                  <p className="text-xs font-bold leading-6 text-rose-100/68">{choiceAnalysis.nextHint}</p>
                </div>
              </div>

              <Suspense
                fallback={
                  <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/8 p-5 text-sm font-bold leading-7 text-white/64">
                    {copy.openingStoryMessage}
                  </div>
                }
              >
                <LoveCharacterStorySection character={character} />
              </Suspense>

              <button
                onClick={resetToSelect}
                className={`mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r px-5 py-3 text-sm font-bold text-zinc-950 transition hover:brightness-110 ${character.palette.button}`}
              >
                <RefreshCw className="h-4 w-4" />
                {copy.restartButton}
              </button>
            </div>
          </m.div>
        </div>
      </section>
    );
  }

  if (!character || !currentScene) return null;

  return (
    <section className={`relative min-h-[100svh] overflow-hidden text-white ${character.palette.scene}`}>
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,6,18,0.98)_0%,rgba(31,16,35,0.9)_48%,rgba(8,20,26,0.96)_100%)]" />
      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl items-center justify-center px-4 py-5">
        <m.div
          key={character.id}
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="grid w-full items-center gap-6 lg:grid-cols-[0.78fr_1.22fr]"
        >
          <aside className="hidden lg:grid gap-4">
            <button
              onClick={resetToSelect}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-black/25 text-white backdrop-blur-md transition hover:bg-white/20"
              aria-label={copy.backToCharacterSelect}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="rounded-lg border border-white/10 bg-black/28 p-5 backdrop-blur-xl">
              <p className={`text-sm font-bold ${character.palette.accent}`}>{character.dayMaster} 일간</p>
              <h2 className="mt-2 text-4xl font-black">{characterCopy[character.id].name}</h2>
              <p className="mt-3 text-sm leading-7 text-white/68">{characterCopy[character.id].profileLine}</p>
              <p className="mt-3 text-xs font-bold text-white/42">
                {entryMode === "sajuMatch" ? copy.entryModeMatchNote : copy.entryModePresetNote}
              </p>
              {initialCompatibilityNote ? <p className="mt-2 text-xs font-bold text-rose-100/62">{initialCompatibilityNote}</p> : null}
            </div>
            <div className="grid gap-3 rounded-lg border border-white/10 bg-black/24 p-5 backdrop-blur-xl">
              {metrics.map((metric) => (
                <MetricBar key={metric.label} label={metric.label} value={metric.value} tone={copy.metricTone} />
              ))}
            </div>
          </aside>

          <div className="mx-auto flex max-h-[calc(100svh-40px)] w-full max-w-[460px] flex-col overflow-hidden rounded-[2rem] border border-white/18 bg-[#111017] shadow-[0_32px_90px_rgba(0,0,0,0.56)]">
            <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-white/10 bg-black/36 px-5 backdrop-blur-xl">
              <button
                onClick={resetToSelect}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/8 text-white transition hover:bg-white/16 lg:hidden"
                aria-label={copy.backToCharacterSelect}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-pink-200" />
                <span className="truncate text-sm font-black tracking-[0.08em] text-white">Love Code</span>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/8 text-xl leading-none text-white/70">≡</span>
            </header>

            <div className="relative h-[34svh] min-h-[220px] max-h-[380px] shrink-0 overflow-hidden">
              <CharacterDialogueCrop
                character={character}
                className="absolute inset-0 rounded-none"
                alt={formatTemplate(copy.dialogueFaceAlt, { name: characterCopy[character.id].name })}
              />
            </div>
            <div className="flex shrink-0 items-end justify-between gap-3 border-t border-white/10 bg-[#111017] px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">
                  {formatTemplate(copy.sceneCounter, { index: String(sceneIndex + 1), total: String(scenes.length) })}
                </p>
                <h2 className="mt-1 truncate text-2xl font-black text-white">{characterCopy[character.id].name}</h2>
              </div>
              <span className="shrink-0 rounded-full border border-white/14 bg-white/8 px-3 py-1 text-xs font-bold text-white/72">
                {currentScene.location}
              </span>
            </div>

            <m.div
              key={currentScene.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="min-h-0 overflow-y-auto border-t border-white/10 bg-[#111017]/96 p-4 sm:p-5"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="h-10 w-10 overflow-hidden rounded-full border border-white/20 bg-black/30">
                  <img src={character.asset} alt={formatTemplate(copy.miniFaceAlt, { name: characterCopy[character.id].name })} className="h-full w-full origin-top-left scale-[3.02] object-contain object-left-top" />
                </div>
                <div>
                  <p className={`text-sm font-black ${character.palette.accent}`}>{characterCopy[character.id].name}</p>
                  <p className="truncate text-xs font-semibold text-white/48">{currentScene.title}</p>
                </div>
              </div>

              <div className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
                <p className="text-sm leading-7 text-white/64">{currentScene.situation}</p>
                <details className="group mt-4 rounded-lg border border-rose-100/12 bg-black/18">
                  <summary
                    className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-rose-50/82"
                    aria-label={formatTemplate(copy.sajuHintAria, { name: characterCopy[character.id].name })}
                  >
                    <span>{copy.sajuHint}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-rose-100/66 transition group-open:rotate-90" />
                  </summary>
                  <div className="grid gap-3 border-t border-rose-100/10 px-3 py-3">
                    {scenePrelude.map((paragraph) => (
                      <p key={paragraph} className="rounded-lg border border-rose-100/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold leading-7 text-rose-50/72">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </details>
                <p className="mt-4 text-base font-semibold leading-7 text-white">"{currentScene.dialogue}"</p>
              </div>

              <AnimatePresence mode="wait">
                {isShowingResponse && selectedChoice ? (
                  <m.div key="response" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <div className="mt-3 rounded-lg border border-pink-200/22 bg-pink-200/10 p-4">
                      <p className="text-sm leading-7 text-white/82">{selectedChoice.response}</p>
                      <p className="mt-2 text-xs leading-6 text-white/52">{selectedChoice.insight}</p>
                    </div>
                    <button
                      onClick={goNextScene}
                      className={`mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r px-4 py-3 text-sm font-black text-zinc-950 transition hover:brightness-110 ${character.palette.button}`}
                    >
                      {sceneIndex >= scenes.length - 1 ? "결과 보기" : "다음 장면"}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </m.div>
                ) : isChoiceOpen ? (
                  <m.div key="choices" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-3 grid gap-2">
                    {currentScene.choices.map((choice) => (
                      <button
                        key={choice.id}
                        onClick={() => handleChoice(choice)}
                        className="min-h-14 rounded-lg border border-white/12 bg-white/[0.06] px-4 py-3 text-left text-sm font-semibold leading-6 text-white/90 transition hover:border-pink-200/45 hover:bg-pink-200/12"
                      >
                        {choice.text}
                      </button>
                    ))}
                  </m.div>
                ) : (
                  <m.div key="story-hold" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <div className="mt-3 rounded-lg border border-white/10 bg-black/18 p-4">
                      <p className="text-sm leading-7 text-white/70">
                        {character.conflictPattern} {character.bestApproach} {copy.storyHoldTail}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChoiceOpen(true)}
                      className={`mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r px-4 py-3 text-sm font-black text-zinc-950 transition hover:brightness-110 ${character.palette.button}`}
                    >
                      {copy.openChoicesButton}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </m.div>
                )}
              </AnimatePresence>
            </m.div>
          </div>
        </m.div>
      </div>
    </section>
  );
};
