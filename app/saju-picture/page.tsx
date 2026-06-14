"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { calculateLocalSaju } from "@/app/saju/animal-destiny/engine/localSajuCalculator";
import {
  GANJI_ANIMAL_MAP,
  getGuardianCopy,
  getStemElement,
  normalizeGanji,
  type Ganji60,
} from "@/app/_lib/fortune/ganjiGuardianSprite";

/* ─────────────────────────── 타입 ─────────────────────────── */
interface ApiResult {
  ok: boolean;
  result?: {
    dominantElement: string;
    secondaryElement: string;
    zodiac: string;
    colorKo: string;
    colorEn: string;
    animals: string[];
    mainAnimal: string;
    expressionKo: string;
    personalitySummaryKo: string;
    personalityLines: string[];
    headlineKo: string;
    dayPillar?: string;
    dayGanji?: string;
    ilju?: string;
    dayStemBranch?: string;
    fourPillars?: {
      year?: {
        ganji?: string;
        stem?: string;
        branch?: string;
      };
      month?: {
        ganji?: string;
        stem?: string;
        branch?: string;
      };
      day?: {
        ganji?: string;
        stem?: string;
        branch?: string;
      };
      hour?: {
        ganji?: string;
        stem?: string;
        branch?: string;
      };
    };
    saju?: {
      dayPillar?: string;
      dayGanji?: string;
      ilju?: string;
      dayStemBranch?: string;
      fourPillars?: {
        year?: {
          ganji?: string;
          stem?: string;
          branch?: string;
        };
        month?: {
          ganji?: string;
          stem?: string;
          branch?: string;
        };
        day?: {
          ganji?: string;
          stem?: string;
          branch?: string;
        };
        hour?: {
          ganji?: string;
          stem?: string;
          branch?: string;
        };
      };
    };
    hasBirthTime?: boolean;
  };
  imageUrl?: string;
  fallback?: boolean;
  fallbackMessage?: string;
  message?: string;
  dayPillar?: string;
  dayGanji?: string;
  ilju?: string;
  dayStemBranch?: string;
  fourPillars?: {
    year?: {
      ganji?: string;
      stem?: string;
      branch?: string;
    };
    month?: {
      ganji?: string;
      stem?: string;
      branch?: string;
    };
    day?: {
      ganji?: string;
      stem?: string;
      branch?: string;
    };
    hour?: {
      ganji?: string;
      stem?: string;
      branch?: string;
    };
  };
  resolvedGanji?: Ganji60 | null;
}

type Phase = "checking" | "locked" | "intro" | "form" | "loading" | "result" | "error";

const SAJU_GUARDIAN_FEATURE_KEY = "saju-guardian-unlock";
const SAJU_GUARDIAN_ACTION = "openSajuGuardianPage";
const SAJU_GUARDIAN_LEGACY_ACTION = "openSajuAnimalPage";

function hasGuardianUnlockAccess() {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.sessionStorage.getItem(`cd_pa_${SAJU_GUARDIAN_ACTION}`) === "1" ||
      window.sessionStorage.getItem(`cd_pa_${SAJU_GUARDIAN_LEGACY_ACTION}`) === "1" ||
      window.sessionStorage.getItem(`cd_pa_${SAJU_GUARDIAN_FEATURE_KEY}`) === "1"
    );
  } catch (_) {
    return false;
  }
}

function rememberGuardianUnlockAccess() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`cd_pa_${SAJU_GUARDIAN_ACTION}`, "1");
    window.sessionStorage.setItem(`cd_pa_${SAJU_GUARDIAN_FEATURE_KEY}`, "1");
  } catch (_) {}
}

function payloadGrantsGuardianAccess(payload: unknown) {
  try {
    const text = JSON.stringify(payload || {});
    return (
      text.includes(SAJU_GUARDIAN_FEATURE_KEY) &&
      /(already_unlocked|pass_applied|membership_pass|ALREADY_UNLOCKED|PASS_FREE|accessGrant|premiumAccessToken)/i.test(text) &&
      !/(PAYMENT_REQUIRED|INSUFFICIENT_COINS|PRICE_NOT_FOUND)/i.test(text)
    );
  } catch (_) {
    return false;
  }
}

async function verifyGuardianUnlockAccess() {
  if (hasGuardianUnlockAccess()) return true;
  if (typeof window === "undefined") return false;
  try {
    const response = await fetch("/api/billing/coin-gate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryKey: "main-tile",
        subFeatureKey: SAJU_GUARDIAN_FEATURE_KEY,
        featureKey: SAJU_GUARDIAN_FEATURE_KEY,
        paymentMode: "MEMBERSHIP_PASS",
        forceDeduct: false,
        cost: 100,
        coinPrice: 100,
        reason: "사주 가디언 소환진 해금 확인",
        requestId: `guardian-access:${Date.now().toString(36)}`,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok && payloadGrantsGuardianAccess(payload)) {
      rememberGuardianUnlockAccess();
      return true;
    }
  } catch (_) {}
  return false;
}

/* ─────────────────────── 선택 옵션 ─────────────────────────── */
const YEARS = Array.from({ length: 100 }, (_, i) => 2024 - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const ELEMENT_EMOJI: Record<string, string> = {
  목: "🌿",
  화: "🔥",
  토: "🌙",
  금: "✨",
  수: "💧",
};

const ELEMENT_BG: Record<string, string> = {
  목: "from-emerald-50 via-mint-50 to-green-100",
  화: "from-rose-50 via-pink-50 to-orange-100",
  토: "from-amber-50 via-yellow-50 to-orange-100",
  금: "from-slate-50 via-gray-50 to-purple-50",
  수: "from-sky-50 via-blue-50 to-violet-100",
};

const ANIMAL_EMOJI: Record<string, string> = {
  토끼: "🐰",
  호랑이: "🐯",
  뱀: "🐍",
  말: "🐴",
  소: "🐮",
  개: "🐶",
  용: "🐲",
  원숭이: "🐒",
  닭: "🐔",
  쥐: "🐭",
  돼지: "🐷",
};

const STEM_TO_ELEMENT: Record<string, "목" | "화" | "토" | "금" | "수"> = {
  갑: "목",
  을: "목",
  병: "화",
  정: "화",
  무: "토",
  기: "토",
  경: "금",
  신: "금",
  임: "수",
  계: "수",
};

const BRANCH_TO_ZODIAC: Record<string, string> = {
  자: "쥐",
  축: "소",
  인: "호랑이",
  묘: "토끼",
  진: "용",
  사: "뱀",
  오: "말",
  미: "양",
  신: "원숭이",
  유: "닭",
  술: "개",
  해: "돼지",
};

const ELEMENT_NEXT: Record<string, "목" | "화" | "토" | "금" | "수"> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

const ELEMENT_COLOR: Record<string, { ko: string; en: string }> = {
  목: { ko: "초록", en: "Green" },
  화: { ko: "코랄", en: "Coral" },
  토: { ko: "샌드", en: "Sand" },
  금: { ko: "아이보리", en: "Ivory" },
  수: { ko: "하늘", en: "Sky" },
};

const STEM_POLARITY: Record<string, "양" | "음"> = {
  갑: "양",
  병: "양",
  무: "양",
  경: "양",
  임: "양",
  을: "음",
  정: "음",
  기: "음",
  신: "음",
  계: "음",
};

const ELEMENT_GUARDIAN_READING: Record<string, {
  axis: string;
  protection: string;
  shadow: string;
  relation: string;
  work: string;
  ritual: string;
}> = {
  목: {
    axis: "목(木)은 뻗어 오르는 생장력입니다. 오래 묵은 정체를 깨고 방향을 세울 때 운이 열립니다.",
    protection: "당신의 가디언은 막힌 흐름에 길을 내고, 관계와 일에서 다시 시작할 용기를 보강합니다.",
    shadow: "생각보다 행동이 앞서면 약속을 너무 많이 만들 수 있습니다. 가지를 치듯 우선순위를 줄이는 일이 수호의 핵심입니다.",
    relation: "관계에서는 먼저 분위기를 살피되, 필요한 말은 미루지 않을수록 신뢰가 커집니다.",
    work: "일과 재물은 새 기획, 배움, 성장형 프로젝트에서 살아납니다. 다만 마감과 숫자는 별도 장치로 묶어야 합니다.",
    ritual: "오늘의 개운은 초록빛 물건 하나를 가까이 두고, 미뤄 둔 시작 한 가지를 20분만 여는 것입니다.",
  },
  화: {
    axis: "화(火)는 드러남과 설득의 기운입니다. 마음의 온도가 오를수록 존재감과 선택의 속도가 살아납니다.",
    protection: "당신의 가디언은 침체된 장면에 불씨를 놓고, 사람들 앞에서 자기 목소리를 잃지 않게 지켜줍니다.",
    shadow: "기운이 과열되면 말이 앞서고 감정의 결론이 빨라집니다. 중요한 결정은 하룻밤 식힌 뒤 확정하는 편이 좋습니다.",
    relation: "관계에서는 따뜻한 표현이 힘이 되지만, 상대의 반응을 기다리는 여백이 함께 필요합니다.",
    work: "일과 재물은 발표, 영업, 창작, 홍보처럼 빛을 받는 자리에서 움직입니다. 기록 없이 달리면 성과가 흩어집니다.",
    ritual: "오늘의 개운은 붉은 계열 포인트를 하나 정하고, 가장 중요한 문장 하나를 소리 내어 정리하는 것입니다.",
  },
  토: {
    axis: "토(土)는 중심과 저장의 기운입니다. 흩어진 일을 모아 구조를 만들 때 운의 바닥이 단단해집니다.",
    protection: "당신의 가디언은 흔들리는 마음을 붙잡고, 선택을 현실에 내려놓는 힘을 보강합니다.",
    shadow: "안정을 지키려다 변화 신호를 늦게 받아들일 수 있습니다. 익숙함과 정체를 구분하는 눈이 필요합니다.",
    relation: "관계에서는 든든함이 강점입니다. 다만 모두를 품으려 하기보다 내 몫과 타인의 몫을 나누면 기운이 맑아집니다.",
    work: "일과 재물은 장기 운영, 관리, 부동산, 생활 기반, 반복 수익에서 강합니다. 시작보다 유지 전략이 핵심입니다.",
    ritual: "오늘의 개운은 책상이나 지갑 안을 정리하고, 이번 주 꼭 지킬 기준 하나를 적는 것입니다.",
  },
  금: {
    axis: "금(金)은 분별과 완성의 기운입니다. 불필요한 것을 덜어낼수록 판단력과 결과물이 선명해집니다.",
    protection: "당신의 가디언은 흐릿한 상황에 선을 긋고, 약속과 기준을 지키는 힘을 세워줍니다.",
    shadow: "기준이 지나치게 날카로워지면 관계의 온도가 낮아질 수 있습니다. 정답보다 타이밍을 함께 보아야 합니다.",
    relation: "관계에서는 솔직함이 장점입니다. 다만 평가처럼 들리지 않게 부드러운 순서로 말하면 운이 상하지 않습니다.",
    work: "일과 재물은 계약, 분석, 정리, 품질 관리, 금융 감각에서 빛납니다. 작은 오류를 줄이는 일이 큰 이익이 됩니다.",
    ritual: "오늘의 개운은 흰색이나 은색 물건을 정돈하고, 결정하지 못한 일을 하나만 명확히 닫는 것입니다.",
  },
  수: {
    axis: "수(水)는 통찰과 흐름의 기운입니다. 보이지 않는 기류를 읽고 길을 돌아가는 지혜가 살아납니다.",
    protection: "당신의 가디언은 불안 속에서도 본질을 듣게 하고, 때를 기다리는 힘을 지켜줍니다.",
    shadow: "생각이 깊어질수록 행동이 늦어질 수 있습니다. 감이 왔다면 작은 실험으로 물꼬를 터야 합니다.",
    relation: "관계에서는 경청과 공감이 강점입니다. 다만 침묵이 오해가 되지 않도록 최소한의 신호를 남기는 편이 좋습니다.",
    work: "일과 재물은 정보, 상담, 연구, 이동, 유통, 콘텐츠 흐름에서 움직입니다. 흐름을 읽되 기준 없는 확장은 피해야 합니다.",
    ritual: "오늘의 개운은 물을 천천히 마시고, 복잡한 고민을 세 문장으로 줄여 적는 것입니다.",
  },
};

const SAJU_GUARDIAN_VALUE_SECTIONS = [
  {
    title: "1. 일주를 중심으로 수호 인장의 뿌리를 세웁니다",
    body:
      "나를 대표하는 일주를 먼저 세우고, 그 안의 천간과 지지가 어떤 방식으로 나의 중심을 지키는지 읽습니다. 이 축이 수호 인장의 이름과 첫 문장을 결정합니다.",
  },
  {
    title: "2. 오행의 생극으로 수호력과 약점을 함께 봅니다",
    body:
      "목·화·토·금·수는 강하면 좋고 약하면 나쁜 단순한 척도가 아닙니다. 어떤 기운이 나를 살리고, 어떤 기운이 나를 급하게 만드는지 함께 보아야 실제 선택에 쓸 수 있는 리딩이 됩니다.",
  },
  {
    title: "3. 60갑자 상징을 인장 문장으로 압축합니다",
    body:
      "60갑자는 같은 오행이라도 결이 다릅니다. 갑자와 을축이 다르고, 병오와 정미가 다르듯이 같은 불·같은 나무라도 드러나는 방식이 달라집니다. 이 차이를 수호 인장의 이름과 문장으로 정리합니다.",
  },
  {
    title: "4. 관계·일·재물의 운용 문장까지 제공합니다",
    body:
      "재미있는 캐릭터에서 끝나지 않도록, 내가 어떤 말투로 관계를 살리는지, 어떤 방식으로 일과 돈의 흐름을 잡는지까지 연결합니다. 오늘 바로 쓸 수 있는 행동 언어로 풀어냅니다.",
  },
  {
    title: "5. 오늘의 개운 의식으로 리딩을 닫습니다",
    body:
      "명리 리딩은 읽는 순간보다 실행하는 순간 힘이 생깁니다. 결과 마지막에는 오늘의 색, 정리할 기준, 말해야 할 문장처럼 작지만 분명한 수호 행동을 남깁니다.",
  },
  {
    title: "6. 월지와 시지로 현실 리듬을 보강합니다",
    body:
      "일주가 중심 인장이라면 월지는 인장이 현실에서 힘을 얻는 배경이고, 시지는 하루 속에서 수호력이 깨어나는 보조 리듬입니다. 생시를 입력하면 행동 타이밍까지 더 섬세하게 열립니다.",
  },
] as const;

const GUARDIAN_FLOW_STEPS = [
  { step: "01", label: "해금", title: "100코인 영구 해금", icon: "🔒" },
  { step: "02", label: "좌표", title: "일주·월지·시지 세우기", icon: "🗝️" },
  { step: "03", label: "인장", title: "오행 수호 인장 열기", icon: "🔮" },
  { step: "04", label: "리딩", title: "7일 수호 미션 받기", icon: "💌" },
] as const;

const GUARDIAN_PREMIUM_POINTS = [
  { label: "수호 인장", value: "일주·월지·시지" },
  { label: "부적 주머니", value: "색·문장·의식" },
  { label: "실행 리딩", value: "관계·일·재물" },
] as const;

const MONTH_BRANCH_READING: Record<string, string> = {
  인: "봄의 첫 문이 열리는 월지라 시작과 확장이 빠릅니다. 새 판을 열되, 약속의 가지를 너무 많이 뻗지 않는 것이 수호의 핵심입니다.",
  묘: "봄의 결이 무르익는 월지라 관계 감각과 성장 본능이 섬세합니다. 부드럽게 설득하되, 경계가 흐려지지 않게 기준을 남기세요.",
  진: "봄에서 여름으로 넘어가는 저장의 월지라 가능성을 현실 구조로 묶는 힘이 있습니다. 미룬 정리를 끝낼수록 운이 붙습니다.",
  사: "불의 문이 열리는 월지라 표현력과 속도가 살아납니다. 빛나는 자리일수록 감정의 온도를 한 번 낮추면 결과가 선명합니다.",
  오: "화기가 가장 높아지는 월지라 주목도와 추진력이 큽니다. 오늘의 수호는 말의 힘을 아끼고 결정의 순서를 지키는 데 있습니다.",
  미: "열기를 땅에 저장하는 월지라 돌봄과 책임의 감각이 강합니다. 모두를 품기보다 내 몫을 분명히 나눌 때 운이 맑아집니다.",
  신: "금기가 열리는 월지라 판단과 정리의 칼날이 살아납니다. 불필요한 관계와 일을 덜어내면 수호 인장이 더 밝아집니다.",
  유: "금의 결이 맑아지는 월지라 완성도와 기준이 높습니다. 평가보다 제안을 먼저 건네면 관계운이 부드럽게 풀립니다.",
  술: "가을을 닫고 불씨를 저장하는 월지라 책임과 신념이 깊습니다. 오래 붙든 걱정을 하나 내려놓을 때 새 기회가 들어옵니다.",
  해: "수기가 열리는 월지라 직감과 회복의 힘이 큽니다. 서두르기보다 물길을 읽듯 순서를 보면 막힌 일이 풀립니다.",
  자: "수기가 가장 깊은 월지라 통찰과 집중력이 강합니다. 생각이 깊어질수록 작은 실행 하나로 물꼬를 터야 합니다.",
  축: "겨울의 끝을 저장하는 월지라 인내와 축적의 힘이 있습니다. 느린 운을 탓하기보다 기반을 다질수록 오래 갑니다.",
};

const HOUR_BRANCH_READING: Record<string, string> = {
  자: "자시는 깊은 밤의 물길입니다. 혼자 정리하는 시간에 직감이 살아나며, 마음속 답을 글로 남길수록 수호력이 커집니다.",
  축: "축시는 새벽 전의 저장고입니다. 급하게 드러내기보다 준비를 단단히 하면 뒤늦게 큰 힘을 냅니다.",
  인: "인시는 아침의 첫 호흡입니다. 시작하는 힘이 빠르니 오늘 가장 중요한 일을 먼저 열어두는 편이 좋습니다.",
  묘: "묘시는 해가 떠오르는 부드러운 문입니다. 관계의 말투와 첫인상이 운을 여는 열쇠가 됩니다.",
  진: "진시는 기운을 모아 현실로 내리는 시간입니다. 계획을 문서와 일정으로 묶을수록 흐름이 안정됩니다.",
  사: "사시는 불이 살아나는 시간입니다. 발표, 설득, 표현에서 빛나지만 말의 속도를 조절해야 합니다.",
  오: "오시는 한낮의 중심입니다. 존재감이 강해지는 만큼 선택을 단순하게 만드는 일이 수호가 됩니다.",
  미: "미시는 열기를 정리하는 시간입니다. 돌봄과 책임을 잘 쓰되, 지나친 부담은 나누어야 합니다.",
  신: "신시는 금기의 판단이 들어오는 시간입니다. 정리, 분석, 계약처럼 선을 긋는 일에 힘이 붙습니다.",
  유: "유시는 완성의 빛이 맑아지는 시간입니다. 결과물을 다듬고 보여주는 일에서 운이 살아납니다.",
  술: "술시는 하루의 불씨를 저장하는 시간입니다. 지켜야 할 약속과 내려놓을 걱정을 구분하면 마음이 단단해집니다.",
  해: "해시는 밤의 물길이 열리는 시간입니다. 회복과 영감이 깊어지니 휴식 속에서 다음 답이 옵니다.",
};

/* ─────────────────────────── 셀렉터 UI ─────────────────────── */
function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-pink-400 tracking-widest uppercase pl-1">
        {label}
      </label>
      <div className="relative">
        <select
          className="w-full appearance-none rounded-2xl bg-white/80 backdrop-blur-sm border border-pink-200/80 text-slate-700 text-sm font-medium px-4 py-3 pr-9 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 transition-all cursor-pointer shadow-sm hover:border-pink-300"
          style={{ color: "#374151", colorScheme: "light", WebkitTextFillColor: "#374151" }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" style={{ color: "#9ca3af" }}>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value} style={{ color: "#374151" }}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── 로딩 애니메이션 ───────────────────── */
function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-6">
      <div className="relative w-40 h-40">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-pink-300/40"
            style={{
              animation: `ping ${1.2 + i * 0.3}s cubic-bezier(0,0,0.2,1) ${i * 0.2}s infinite`,
              opacity: 0.6 - i * 0.08,
            }}
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-300 via-lavender-200 to-purple-300 flex items-center justify-center shadow-lg shadow-pink-200/60 animate-bounce">
            <span className="text-3xl">🌟</span>
          </div>
        </div>
      </div>

      <div className="text-center space-y-3">
        <p className="text-lg font-bold text-slate-700">
          일주의 문을 열고 가디언 인장을 세우는 중...
        </p>
        <p className="text-sm text-pink-400 font-medium animate-pulse">
          ✨ 60갑자와 오행의 결을 맞추고 있어요 ✨
        </p>
        <div className="flex justify-center gap-2 mt-2">
          {["🌸", "🌙", "⭐", "🌸", "🌙"].map((emoji, i) => (
            <span
              key={i}
              className="text-lg"
              style={{
                animation: `bounce 1s ${i * 0.15}s ease-in-out infinite alternate`,
                display: "inline-block",
              }}
            >
              {emoji}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-4">생년월일은 저장하지 않고 기기에서 바로 계산합니다</p>
      </div>
    </div>
  );
}

function GuardianSealDisplay({
  guardianSeal,
  guardianArchetype,
  guardianEmblem,
  dominantElement,
  monthBranch,
  hourBranch,
  hasBirthTime,
}: {
  guardianSeal: string;
  guardianArchetype: string;
  guardianEmblem: string;
  dominantElement: string;
  monthBranch: string;
  hourBranch: string;
  hasBirthTime: boolean;
}) {
  const ringMarks = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸", "子", "午"];
  const ringPositions = [
    ["50%", "4%"],
    ["73%", "10%"],
    ["90%", "27%"],
    ["96%", "50%"],
    ["90%", "73%"],
    ["73%", "90%"],
    ["50%", "96%"],
    ["27%", "90%"],
    ["10%", "73%"],
    ["4%", "50%"],
    ["10%", "27%"],
    ["27%", "10%"],
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-white/90 via-rose-50/90 to-violet-50/90 p-5 shadow-xl shadow-rose-100/70">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-rose-200/30 blur-2xl" aria-hidden="true" />
      <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-violet-200/30 blur-2xl" aria-hidden="true" />

      <div className="relative mx-auto flex aspect-square w-full max-w-[23rem] items-center justify-center">
        <div className="absolute inset-3 rounded-full border border-rose-200/70 bg-white/40 shadow-inner" />
        <div className="absolute inset-8 rounded-full border border-dashed border-pink-300/70" />
        <div className="absolute inset-14 rounded-full border border-violet-200/80 bg-white/60 backdrop-blur-sm" />
        {ringMarks.map((mark, index) => {
          const position = ringPositions[index] || ["50%", "50%"];
          return (
            <span
              key={`${mark}-${index}`}
              className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/85 text-xs font-black text-rose-400 shadow-sm"
              style={{ left: position[0], top: position[1] }}
            >
              {mark}
            </span>
          );
        })}

        <div className="relative flex h-40 w-40 flex-col items-center justify-center rounded-full border border-amber-100 bg-gradient-to-br from-white via-amber-50 to-rose-50 text-center shadow-xl">
          <span className="text-4xl">🔮</span>
          <p className="mt-2 px-4 text-sm font-black leading-tight text-slate-800">{guardianArchetype}</p>
          <p className="mt-1 text-[11px] font-bold text-rose-400">{dominantElement} 수호축</p>
        </div>
      </div>

      <div className="relative mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/80 bg-white/75 px-3 py-3 text-center">
          <p className="text-[10px] font-black tracking-[0.12em] text-slate-400">인장</p>
          <p className="mt-1 text-xs font-black leading-relaxed text-slate-700">{guardianSeal}</p>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/75 px-3 py-3 text-center">
          <p className="text-[10px] font-black tracking-[0.12em] text-slate-400">문양</p>
          <p className="mt-1 text-xs font-black leading-relaxed text-slate-700">{guardianEmblem}</p>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/75 px-3 py-3 text-center">
          <p className="text-[10px] font-black tracking-[0.12em] text-slate-400">리듬</p>
          <p className="mt-1 text-xs font-black leading-relaxed text-slate-700">
            {monthBranch || "월지"} · {hasBirthTime ? hourBranch || "시지" : "시지 보류"}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── 결과 카드 ─────────────────────────── */
function ResultCard({
  data,
  onReset,
}: {
  data: ApiResult;
  onReset: () => void;
}) {
  const [activePanel, setActivePanel] = useState("seal");

  if (!data.result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fff7ed] via-[#fff1f2] to-[#eef2ff] px-4 py-10">
        <div className="mx-auto w-full max-w-xl rounded-[2rem] border border-white/70 bg-white/80 p-6 text-center shadow-xl backdrop-blur-xl">
          <p className="text-sm font-semibold text-slate-600">
            결과 데이터가 아직 준비되지 않았어요. 다시 생성하면 일주 기반 가디언 카드를 불러옵니다.
          </p>
          <button
            onClick={onReset}
            className="mt-4 rounded-2xl bg-gradient-to-r from-rose-400 to-pink-500 px-4 py-2.5 text-sm font-black text-white"
          >
            다시 생성하기
          </button>
        </div>
      </div>
    );
  }

  const result = data.result!;
  const resolvedGanji = normalizeGanji(data.resolvedGanji);
  const guardianCopy = resolvedGanji ? getGuardianCopy(resolvedGanji) : null;
  const stemTheme = resolvedGanji ? getStemElement(resolvedGanji) : null;

  const animalEmoji = ANIMAL_EMOJI[result.mainAnimal] ?? "🐾";
  const elementEmoji = ELEMENT_EMOJI[result.dominantElement] ?? "✨";
  const yearBranch = result.fourPillars?.year?.branch || "";
  const monthStem = result.fourPillars?.month?.stem || "";
  const monthBranch = result.fourPillars?.month?.branch || "";
  const dayStem = result.fourPillars?.day?.stem || resolvedGanji?.slice(0, 1) || "";
  const dayBranch = result.fourPillars?.day?.branch || resolvedGanji?.slice(1, 2) || "";
  const hourStem = result.fourPillars?.hour?.stem || "";
  const hourBranch = result.fourPillars?.hour?.branch || "";
  const hasBirthTime = result.hasBirthTime === true;
  const stemPolarity = STEM_POLARITY[dayStem] || "양";
  const elementReading = ELEMENT_GUARDIAN_READING[result.dominantElement] || ELEMENT_GUARDIAN_READING.토;
  const monthElement = STEM_TO_ELEMENT[monthStem] || result.secondaryElement || result.dominantElement;
  const hourElement = STEM_TO_ELEMENT[hourStem] || result.dominantElement;
  const monthReading = MONTH_BRANCH_READING[monthBranch] || "월지는 가디언 인장이 현실에서 힘을 얻는 배경입니다. 반복되는 생활 리듬을 정돈할수록 수호력이 안정됩니다.";
  const hourReading = hasBirthTime
    ? HOUR_BRANCH_READING[hourBranch] || "입력된 시간은 오늘의 보조 수호 리듬을 여는 열쇠입니다. 하루 중 힘이 살아나는 순간을 관찰해 보세요."
    : "태어난 시간을 모르면 정오 기준으로 일주 인장을 먼저 세웁니다. 생시를 추가하면 보조 수호 리듬과 행동 타이밍을 더 섬세하게 볼 수 있습니다.";
  const guardianSeal = resolvedGanji
    ? `${resolvedGanji}일주 ${stemPolarity}${result.dominantElement} 수호 인장`
    : `${result.dominantElement} 수호 인장`;
  const guardianArchetype = resolvedGanji
    ? `${resolvedGanji} ${stemPolarity}${result.dominantElement} 인장`
    : `${result.dominantElement} 수호 인장`;
  const guardianEmblem = `${animalEmoji} ${result.mainAnimal} 엠블럼`;

  const personalityLines = result.personalityLines?.length
    ? result.personalityLines
    : [result.personalitySummaryKo || "오늘의 감정 템포를 관찰하며 작은 루틴을 시작해 보세요."];

  const interpretationCards = [
    {
      title: "명리 좌표",
      body: resolvedGanji
        ? `당신의 중심축은 ${resolvedGanji}일주입니다. 겉으로 드러나는 천간은 ${dayStem || "일간"}의 ${stemPolarity}${result.dominantElement} 기운이고, 안쪽의 지지는 ${dayBranch || "일지"}의 뿌리로 작동합니다. 이 조합은 ${guardianArchetype}이 어떤 방식으로 중심을 지켜야 하는지 보여주는 첫 번째 인장입니다.`
        : result.personalitySummaryKo || personalityLines[0],
    },
    {
      title: "가디언의 수호력",
      body: `${elementReading.protection} ${guardianCopy?.traits?.[0] || `${guardianArchetype}은 중요한 순간에 본능과 판단을 연결하는 힘을 상징합니다.`}`,
    },
    {
      title: "타고난 기운의 운용법",
      body: `${elementReading.axis} ${personalityLines[1] || guardianCopy?.traits?.[1] || "중요한 선택 앞에서는 속도보다 호흡을 먼저 맞추면 운의 탄력이 살아납니다."}`,
    },
    {
      title: "월령의 배경 기운",
      body: `${monthBranch ? `${monthBranch}월지와 ${monthElement} 기운이` : "월지의 배경 기운이"} 수호 인장이 현실에서 작동하는 환경을 만듭니다. ${monthReading}`,
    },
    {
      title: "시간의 보조 수호",
      body: hasBirthTime
        ? `${hourBranch}시지와 ${hourElement} 기운은 하루 중 당신의 수호력이 살아나는 방식을 보여줍니다. ${hourReading}`
        : hourReading,
    },
    {
      title: "그림자와 약점",
      body: `${guardianCopy?.caution || personalityLines[2] || "감정이 급해지는 순간에는 결정을 잠시 미루고 기준을 다시 확인해 보세요."} ${elementReading.shadow}`,
    },
    {
      title: "관계의 보호 문장",
      body: elementReading.relation,
    },
    {
      title: "일과 재물의 사용처",
      body: elementReading.work,
    },
    {
      title: "오늘의 개운 의식",
      body: elementReading.ritual,
    },
  ];

  const sevenDayMissions = [
    {
      day: "1일차",
      title: "새는 기운 닫기",
      body: `${guardianSeal}은 오늘 흩어진 약속과 생각을 정리할 때 가장 먼저 힘을 냅니다. 미뤄 둔 답장, 정리하지 않은 일정, 마음에 걸리는 작은 일을 하나만 닫으세요.`,
    },
    {
      day: "2일차",
      title: "관계의 온도 조절",
      body: elementReading.relation,
    },
    {
      day: "3일차",
      title: "일의 기준 세우기",
      body: elementReading.work,
    },
    {
      day: "4일차",
      title: "그림자 관찰",
      body: elementReading.shadow,
    },
    {
      day: "5일차",
      title: "수호 문장 실행",
      body: `${guardianArchetype}은 생각을 오래 붙잡을수록 흐려집니다. 오늘은 하나의 문장을 정하고, 그 문장에 맞지 않는 선택을 줄이세요.`,
    },
    {
      day: "6일차",
      title: "운을 담는 그릇 정돈",
      body: "내 공간에서 가장 자주 보는 곳 하나를 정리하세요. 명리에서 운은 기세만이 아니라 담기는 자리의 상태에도 반응합니다.",
    },
    {
      day: "7일차",
      title: "가디언 재확인",
      body: `${guardianSeal}의 핵심은 나를 과하게 밀어붙이는 것이 아니라, 중요한 순간에 흔들리지 않을 기준을 남기는 데 있습니다.`,
    },
  ];

  const reportPanels = {
    seal: {
      label: "인장",
      title: "핵심 수호 인장",
      items: interpretationCards.slice(0, 3),
    },
    flow: {
      label: "운용",
      title: "관계·일·재물 운용",
      items: interpretationCards.slice(3, 8),
    },
    ritual: {
      label: "의식",
      title: "오늘의 개운 의식",
      items: [interpretationCards[8]],
    },
    mission: {
      label: "7일",
      title: "7일 가디언 미션",
      items: sevenDayMissions.map((mission) => ({
        title: `${mission.day} · ${mission.title}`,
        body: mission.body,
      })),
    },
  } as const;

  const activeReport = reportPanels[activePanel as keyof typeof reportPanels] || reportPanels.seal;
  const summaryMetrics = [
    { label: "일주", value: resolvedGanji || "계산 중" },
    { label: "수호축", value: `${stemPolarity}${result.dominantElement}` },
    { label: "인장상", value: guardianArchetype },
    { label: "엠블럼", value: guardianEmblem },
    { label: "월지", value: `${monthBranch || "-"} · ${monthElement}` },
    { label: "시지", value: hasBirthTime ? `${hourBranch || "-"} · ${hourElement}` : "시간 미입력" },
  ];
  const guardianCharms = [
    { icon: "🎀", label: "오늘의 색", value: `${result.colorKo || "맑은"}빛으로 ${result.dominantElement} 기운을 부드럽게 고정하세요.` },
    { icon: "🪄", label: "소환 주문", value: guardianCopy?.title || `${guardianArchetype}의 중심을 조용히 세웁니다.` },
    { icon: "📮", label: "작은 실행", value: elementReading.ritual },
    { icon: "🕯️", label: "시간 열쇠", value: hasBirthTime ? hourReading : "생시를 추가하면 시간대별 수호 리듬이 더 선명해집니다." },
  ];

  const handleCopy = async () => {
    const headline = guardianCopy?.title || result.headlineKo;
    const text = `${guardianSeal}\n${headline}\n\n${interpretationCards.map((item) => `${item.title}: ${item.body}`).join("\n\n")}`;
    await navigator.clipboard.writeText(text).catch(() => {});
    alert("가디언 리딩 문구를 복사했어요 📋");
  };

  const handleShare = async () => {
    const headline = guardianCopy?.title || result.headlineKo;
    const text = `${guardianSeal}\n\n${headline}\n\n🔮 Code Destiny 사주 가디언 소환진에서 확인하기\nhttps://code-destiny.com/saju-picture`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "사주 가디언 소환진", text });
      } catch (e) {
        /* 취소 */
      }
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
      alert("클립보드에 복사됐어요! 📋");
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-[#fff7ed] via-[#fff1f2] to-[#eef2ff] px-4 pb-14 pt-6">
      <div className="relative mx-auto w-full max-w-7xl space-y-6">
        <header className="border-b border-white/70 bg-white/70 px-1 pb-4 backdrop-blur-xl sm:px-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-slate-500">수호 인장</p>
              <h1 className="mt-1 text-2xl font-black leading-tight text-slate-800">사주 가디언 소환진</h1>
              <p className="mt-1 text-sm text-slate-600">일주·월지·시지로 여는 60갑자 수호 인장</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm"
              >
                ← 뒤로가기
              </a>
              <button
                onClick={onReset}
                className="inline-flex items-center rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-500 shadow-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" aria-label="사주 가디언 핵심 지표">
          {summaryMetrics.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-black tracking-[0.14em] text-slate-400">{item.label}</p>
              <p className="mt-1 text-base font-black text-slate-800">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-2 rounded-[2rem] border border-white/70 bg-white/70 p-3 shadow-sm backdrop-blur-xl sm:grid-cols-4" aria-label="사주 가디언 소환 단계">
          {GUARDIAN_FLOW_STEPS.map((item) => (
            <div key={item.step} className="flex items-center gap-3 rounded-2xl bg-white/70 px-3 py-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-lg">{item.icon}</span>
              <span className="min-w-0">
                <span className="block text-[10px] font-black tracking-[0.14em] text-rose-400">
                  {item.step === "01" ? "완료" : item.label}
                </span>
                <span className="block truncate text-xs font-black text-slate-700">
                  {item.step === "01" ? "프리미엄 해금 완료" : item.title}
                </span>
              </span>
            </div>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
          <div className="space-y-5">
            <GuardianSealDisplay
              guardianSeal={guardianSeal}
              guardianArchetype={guardianArchetype}
              guardianEmblem={guardianEmblem}
              dominantElement={result.dominantElement}
              monthBranch={monthBranch}
              hourBranch={hourBranch}
              hasBirthTime={hasBirthTime}
            />

            <section className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                  {guardianEmblem}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">
                  {elementEmoji} {result.dominantElement} 기운
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  ✦ {yearBranch || result.zodiac}년지
                </span>
                {resolvedGanji ? (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${stemTheme?.border || "border-slate-200"} ${stemTheme?.text || "text-slate-600"}`}
                  >
                    {resolvedGanji}일주 · {stemTheme?.label}
                  </span>
                ) : null}
              </div>

              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                {guardianCopy?.short || result.headlineKo}
              </p>
              <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
                <p className="text-xs font-black tracking-[0.14em] text-amber-700">가디언 인장</p>
                <p className="mt-1 text-sm font-bold leading-relaxed text-slate-700">{guardianSeal}</p>
              </div>
              <div className="mt-4 rounded-[1.75rem] border border-pink-100 bg-pink-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black tracking-[0.14em] text-pink-500">부적 주머니</p>
                    <p className="mt-1 text-sm font-bold text-slate-700">오늘 바로 쓸 수 있는 수호 키트</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-pink-500 shadow-sm">3개 개봉</span>
                </div>
                <div className="mt-3 grid gap-2">
                  {guardianCharms.map((item) => (
                    <div key={item.label} className="flex gap-3 rounded-2xl bg-white/75 p-3">
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <p className="text-xs font-black text-slate-700">{item.label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                  <p className="text-xs font-black tracking-[0.14em] text-rose-500">수호 방향</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">{elementReading.protection}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-xs font-black tracking-[0.14em] text-slate-500">조심할 결</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">{elementReading.shadow}</p>
                </div>
              </div>

            </section>
          </div>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black tracking-[0.16em] text-rose-500">정밀 리포트</p>
                <h2 className="mt-1 text-2xl font-black text-slate-800">가디언 리포트</h2>
              </div>
              <div className="grid grid-cols-4 rounded-2xl border border-white/80 bg-white/75 p-1 shadow-sm">
                {Object.entries(reportPanels).map(([key, panel]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActivePanel(key)}
                    className={`min-h-10 rounded-xl px-3 text-xs font-black transition ${
                      activePanel === key ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-white"
                    }`}
                    aria-pressed={activePanel === key}
                  >
                    {panel.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl backdrop-blur-xl sm:p-6">
              <h3 className="text-lg font-black text-slate-800">{activeReport.title}</h3>
              <div className="mt-4 grid gap-3">
                {activeReport.items.map((item) => (
                  <article key={item.title} className="rounded-2xl border border-slate-100 bg-white/85 p-4 shadow-sm">
                    <h4 className="text-sm font-black text-slate-700">{item.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-rose-100 bg-gradient-to-r from-rose-50 to-amber-50 p-5 shadow-sm">
              <p className="text-xs font-black tracking-[0.14em] text-rose-500">현재 가디언 메시지</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">
                {guardianCopy?.subtitle || `${guardianArchetype}의 에너지를 실전 루틴에 연결해 보세요.`} 오늘은 운을 크게 바꾸려 하기보다, 새는 기운 하나를 막고 지켜야 할 기준 하나를 선명히 세우는 날입니다.
              </p>
            </div>
          </section>
        </div>

        <footer className="rounded-[2rem] border border-white/70 bg-white/75 p-4 shadow-xl backdrop-blur-xl sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              onClick={handleCopy}
              className="rounded-2xl bg-gradient-to-r from-rose-400 to-pink-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-rose-200/70 transition-transform active:scale-[0.98]"
            >
              해석 문구 복사하기
            </button>
            <button
              onClick={onReset}
              className="rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 px-4 py-3 text-sm font-black text-white shadow-lg shadow-amber-200/70 transition-transform active:scale-[0.98]"
            >
              다시 생성하기
            </button>
            <button
              onClick={handleShare}
              className="rounded-2xl bg-gradient-to-r from-indigo-400 to-sky-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200/70 transition-transform active:scale-[0.98]"
            >
              공유하기
            </button>
          </div>

          <p className="mt-3 text-center text-xs text-slate-500">
            사주 가디언 소환진은 일주·월지·시지와 60갑자 상징을 함께 읽는 프리미엄 명리 리딩입니다.
          </p>
        </footer>
      </div>
    </div>
  );
}

/* ─────────────────────── 메인 페이지 ───────────────────────── */
export default function SajuPicturePage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthHour, setBirthHour] = useState("");
  const [apiData, setApiData] = useState<ApiResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const isFormValid = birthYear && birthMonth && birthDay;

  useEffect(() => {
    let alive = true;
    verifyGuardianUnlockAccess().then((allowed) => {
      if (!alive) return;
      setPhase(allowed ? "intro" : "locked");
    });
    return () => {
      alive = false;
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isFormValid) return;
    setPhase("loading");
    setErrorMsg("");

    try {
      const local = calculateLocalSaju({
        year: Number(birthYear),
        month: Number(birthMonth),
        day: Number(birthDay),
        hour: birthHour !== "" ? Number(birthHour) : 12,
        minute: 0,
        hasTime: birthHour !== "",
        calendarType: "solar",
      });

      const resolvedGanji = normalizeGanji(local?.pillars?.day?.ganji ?? null);
      if (!resolvedGanji) {
        setErrorMsg("일주 계산에 실패했어요. 입력값을 다시 확인해 주세요.");
        setPhase("error");
        return;
      }

      const dayStem = local.pillars.day.stem;
      const dominantElement = STEM_TO_ELEMENT[dayStem] ?? "토";
      const secondaryElement = ELEMENT_NEXT[dominantElement] ?? "금";
      const zodiac = BRANCH_TO_ZODIAC[local.pillars.year.branch] ?? "용";
      const mainAnimal = GANJI_ANIMAL_MAP[resolvedGanji] ?? "용";
      const copy = getGuardianCopy(resolvedGanji);
      const hasBirthTime = birthHour !== "";
      const hourPillar = hasBirthTime ? local.pillars.hour : null;

      const localData: ApiResult = {
        ok: true,
        resolvedGanji,
        result: {
          dominantElement,
          secondaryElement,
          zodiac,
          colorKo: ELEMENT_COLOR[dominantElement]?.ko ?? "파스텔",
          colorEn: ELEMENT_COLOR[dominantElement]?.en ?? "Pastel",
          animals: [mainAnimal],
          mainAnimal,
          expressionKo: `${mainAnimal} 기운이 깨어나는 날`,
          personalitySummaryKo: copy.short,
          personalityLines: copy.traits,
          headlineKo: copy.title,
          hasBirthTime,
          dayPillar: resolvedGanji,
          dayGanji: resolvedGanji,
          ilju: resolvedGanji,
          dayStemBranch: resolvedGanji,
          fourPillars: {
            year: {
              ganji: local.pillars.year.ganji,
              stem: local.pillars.year.stem,
              branch: local.pillars.year.branch,
            },
            month: {
              ganji: local.pillars.month.ganji,
              stem: local.pillars.month.stem,
              branch: local.pillars.month.branch,
            },
            day: {
              ganji: resolvedGanji,
              stem: local.pillars.day.stem,
              branch: local.pillars.day.branch,
            },
            hour: hasBirthTime && hourPillar
              ? {
                  ganji: hourPillar.ganji,
                  stem: hourPillar.stem,
                  branch: hourPillar.branch,
                }
              : undefined,
          },
        },
      };

      setApiData(localData);
      setPhase("result");
    } catch (e) {
      setErrorMsg("로컬 계산에 실패했어요. 입력값을 다시 확인해 주세요.");
      setPhase("error");
    }
  }, [birthYear, birthMonth, birthDay, birthHour, isFormValid]);

  const handleReset = useCallback(() => {
    setPhase(hasGuardianUnlockAccess() ? "intro" : "locked");
    setApiData(null);
    setErrorMsg("");
  }, []);

  if (phase === "checking") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fff7ed] via-[#fff1f2] to-[#eef2ff] px-5 py-8">
        <div className="mx-auto flex min-h-[76vh] w-full max-w-md flex-col items-center justify-center text-center">
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-7 shadow-xl backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-3xl shadow-inner">🔮</div>
            <p className="mt-5 text-xs font-black tracking-[0.16em] text-rose-400">해금 확인</p>
            <h1 className="mt-2 text-2xl font-black text-slate-800">수호 인장 권한 확인 중</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              해금 기록과 이용권을 확인한 뒤 사주 가디언 소환진을 열어드립니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "locked") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fff7ed] via-[#fff1f2] to-[#eef2ff] px-5 py-8">
        <div className="mx-auto flex min-h-[76vh] w-full max-w-5xl flex-col justify-center gap-6">
          <div className="grid gap-6 lg:grid-cols-[0.92fr,1.08fr] lg:items-center">
            <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-xl backdrop-blur-xl">
              <p className="text-xs font-black tracking-[0.16em] text-rose-500">프리미엄 수호 인장</p>
              <h1 className="mt-2 text-3xl font-black leading-tight text-slate-800">사주 가디언 소환진</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                일주·월지·시지·오행 상징을 함께 읽어 지금 삶을 지키는 수호 인장과 7일 실행 의식을 여는 프리미엄 명리 리딩입니다.
              </p>
              <div className="mt-5 grid grid-cols-4 gap-2">
                {["일주", "월지", "시지", "오행"].map((label) => (
                  <div key={label} className="rounded-2xl border border-rose-100 bg-rose-50/70 px-3 py-3 text-center">
                    <p className="text-[11px] font-black tracking-[0.12em] text-rose-400">인장</p>
                    <p className="mt-1 text-sm font-black text-slate-700">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-2">
                {GUARDIAN_PREMIUM_POINTS.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2.5">
                    <span className="text-xs font-black text-slate-500">{item.label}</span>
                    <span className="text-xs font-black text-rose-500">{item.value}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="space-y-3">
              {[
                { title: "명리 근거", body: "일간·일지·월지·시지를 함께 읽어 수호 인장이 왜 이 모양으로 열리는지 보여줍니다." },
                { title: "수호력과 그림자", body: "타고난 힘만 말하지 않고, 운을 새게 만드는 습관과 지켜야 할 기준을 함께 짚습니다." },
                { title: "실전 운용", body: "관계, 일, 재물, 오늘의 개운 의식, 7일 미션까지 바로 쓸 수 있는 문장으로 정리합니다." },
              ].map((item) => (
                <article key={item.title} className="rounded-[1.5rem] border border-white/70 bg-white/75 p-4 shadow-sm">
                  <h2 className="text-sm font-black text-slate-800">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
                </article>
              ))}
            </section>
          </div>
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-xl backdrop-blur-xl">
            <div className="grid gap-2 sm:grid-cols-4">
              {GUARDIAN_FLOW_STEPS.map((item) => (
                <div key={item.step} className="rounded-2xl border border-rose-100 bg-rose-50/60 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[10px] font-black tracking-[0.14em] text-rose-400">{item.step}</span>
                  </div>
                  <p className="mt-2 text-xs font-black text-slate-700">{item.label}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{item.title}</p>
                </div>
              ))}
            </div>
            <a
              href="/index.html?action=openSajuGuardianPage"
              className="mt-5 inline-flex w-full items-center justify-center rounded-3xl bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 px-5 py-4 text-sm font-black text-white shadow-xl shadow-pink-200/60 transition-transform active:scale-[0.98]"
            >
              🔒 100코인으로 영구 해금하기
            </a>
            <a
              href="/"
              className="mt-3 inline-flex w-full items-center justify-center rounded-3xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600"
            >
              메인으로 돌아가기
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ── 결과 화면 ── */
  if (phase === "result" && apiData) {
    return <ResultCard data={apiData} onReset={handleReset} />;
  }

  /* ── 에러 화면 ── */
  if (phase === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100 flex items-center justify-center px-6">
        <div className="text-center max-w-sm space-y-5">
          <div className="text-6xl">😢</div>
          <div className="bg-white/80 rounded-3xl p-6 shadow-lg space-y-3">
            <p className="text-slate-700 font-semibold leading-relaxed">
              가디언 인장을 여는 데 실패했어요.<br />입력값을 확인한 뒤 다시 소환해 주세요.
            </p>
            {errorMsg && <p className="text-xs text-slate-400">{errorMsg}</p>}
          </div>
          <button
            onClick={handleReset}
            className="w-full bg-gradient-to-r from-pink-400 to-rose-500 text-white font-bold rounded-2xl py-3.5 shadow-lg shadow-rose-200/60 active:scale-95 transition-all"
          >
            🔄 다시 시도하기
          </button>
        </div>
      </div>
    );
  }

  /* ── 로딩 화면 ── */
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-lavender-50 to-purple-50 flex items-center justify-center">
        <style>{`
          @keyframes ping {
            75%, 100% { transform: scale(2); opacity: 0; }
          }
          @keyframes bounce {
            from { transform: translateY(0); }
            to { transform: translateY(-8px); }
          }
        `}</style>
        <LoadingScreen />
      </div>
    );
  }

  /* ── 인트로 화면 ── */
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-violet-100">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 pt-5">
          <a
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/80 shadow-sm transition-colors hover:bg-pink-50"
            aria-label="메인으로 돌아가기"
          >
            <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <span className="text-sm font-black tracking-[0.12em] text-slate-500">수호 인장</span>
        </div>

        <div className="max-w-md mx-auto px-4 pb-12 space-y-6">
          <div className="relative w-full aspect-square max-w-sm mx-auto mt-6 rounded-3xl overflow-hidden shadow-2xl shadow-pink-200/60 border-4 border-white/80">
            <Image
              src="/fuctionassets/Who%20am%20I%20with%20saju.webp"
              alt="사주 가디언 소환진"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 384px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-center">
              <span className="inline-block bg-white/90 backdrop-blur-sm text-slate-800 font-bold text-sm rounded-full px-4 py-1.5 shadow-sm">
                🔒 100코인 영구 해금 · 60갑자 수호 인장
              </span>
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-500 via-rose-400 to-purple-500 leading-tight">
              사주 가디언<br />소환진 🌙
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              <span className="font-semibold text-pink-500">일주·월지·시지·오행</span>의 결을 맞춰<br />
              당신에게 필요한 수호 인장과 7일 의식을 엽니다.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {GUARDIAN_FLOW_STEPS.map((item) => (
              <div key={item.step} className="rounded-2xl border border-white/70 bg-white/70 px-2 py-3 text-center shadow-sm">
                <span className="block text-lg">{item.icon}</span>
                <span className="mt-1 block text-[10px] font-black tracking-[0.12em] text-pink-400">{item.label}</span>
                <span className="mt-0.5 block text-[10px] font-semibold leading-tight text-slate-500">{item.title}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-2">
            {[
              { element: "목", emoji: "🌿", color: "from-emerald-100 to-green-100", text: "성장" },
              { element: "화", emoji: "🔥", color: "from-rose-100 to-pink-100", text: "발화" },
              { element: "토", emoji: "🌙", color: "from-amber-100 to-yellow-100", text: "중심" },
              { element: "금", emoji: "✨", color: "from-slate-100 to-gray-100", text: "절제" },
              { element: "수", emoji: "💧", color: "from-sky-100 to-blue-100", text: "흐름" },
            ].map((item) => (
              <div
                key={item.element}
                className={`flex flex-col items-center gap-1 bg-gradient-to-br ${item.color} rounded-2xl py-3 px-1 border border-white/60 shadow-sm`}
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="text-xs font-bold text-slate-700">{item.element}</span>
                <span className="text-[9px] text-slate-400">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-5 border border-white/60 shadow-md space-y-3">
            {[
              { icon: "🔮", text: "일주 천간·지지로 나의 중심 기운 판독" },
              { icon: "🧭", text: "월지와 시지로 현실 배경과 행동 리듬 보강" },
              { icon: "💌", text: "관계·일·재물·오늘의 개운 의식까지 정리" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl shrink-0">{item.icon}</span>
                <span className="text-sm text-slate-600 font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          <section className="bg-white/70 backdrop-blur-sm rounded-3xl p-5 border border-white/60 shadow-md space-y-3" aria-label="사주 가디언 소환진 구성">
            <h2 className="text-sm font-black text-slate-700 tracking-wide">100코인 수호 인장 구성</h2>
            {SAJU_GUARDIAN_VALUE_SECTIONS.map((section) => (
              <article key={section.title} className="rounded-2xl border border-pink-100 bg-white/70 p-3.5">
                <h3 className="text-sm font-bold text-pink-600 leading-relaxed">{section.title}</h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{section.body}</p>
              </article>
            ))}
          </section>

          <button
            onClick={() => setPhase("form")}
            className="w-full bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 hover:from-pink-500 hover:via-rose-500 hover:to-purple-500 text-white font-black text-lg rounded-3xl py-5 shadow-xl shadow-pink-200/60 transition-all active:scale-[0.98]"
          >
            🔮 출생 좌표 입력하고 인장 열기
          </button>

          <p className="text-center text-xs text-slate-400">
            생년월일 필수 · 태어난 시간은 선택 입력
          </p>
        </div>
      </div>
    );
  }

  /* ── 입력 폼 ── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-violet-100">
      <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 pt-5">
        <button
          onClick={() => setPhase("intro")}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/80 shadow-sm transition-colors hover:bg-pink-50"
          aria-label="이전 화면"
        >
          <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-black tracking-[0.12em] text-slate-500">출생 좌표</span>
      </div>

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-1.5">
          <p className="text-xs font-black tracking-[0.16em] text-rose-400">명리 좌표</p>
          <h2 className="text-2xl font-black text-slate-800">가디언을 여는 출생 좌표</h2>
          <p className="text-sm leading-relaxed text-slate-500">
            생년월일로 일주와 월지를 세우고, 선택 입력한 시간으로 시지의 보조 리듬까지 정렬합니다.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {GUARDIAN_FLOW_STEPS.slice(1).map((item) => (
            <div key={item.step} className="rounded-2xl border border-white/70 bg-white/70 px-3 py-3 text-center shadow-sm">
              <span className="block text-lg">{item.icon}</span>
              <span className="mt-1 block text-[10px] font-black tracking-[0.12em] text-rose-400">{item.label}</span>
              <span className="mt-0.5 block text-[11px] font-bold leading-tight text-slate-600">{item.title}</span>
            </div>
          ))}
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/60 shadow-xl shadow-pink-100/50 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <SelectField
              label="태어난 년도"
              value={birthYear}
              onChange={setBirthYear}
              placeholder="년도"
              options={YEARS.map((y) => ({ value: String(y), label: `${y}년` }))}
            />
            <SelectField
              label="월"
              value={birthMonth}
              onChange={setBirthMonth}
              placeholder="월"
              options={MONTHS.map((m) => ({ value: String(m), label: `${m}월` }))}
            />
            <SelectField
              label="일"
              value={birthDay}
              onChange={setBirthDay}
              placeholder="일"
              options={DAYS.map((d) => ({ value: String(d), label: `${d}일` }))}
            />
          </div>

          <SelectField
            label="태어난 시간 (선택)"
            value={birthHour}
            onChange={setBirthHour}
            placeholder="시간을 모르면 건너뛰세요"
            options={HOURS.map((h) => ({
              value: String(h),
              label: `${String(h).padStart(2, "0")}시 (${h < 12 ? "오전" : "오후"} ${h === 0 ? 12 : h > 12 ? h - 12 : h}시)`,
            }))}
          />

          <div className="bg-pink-50/80 rounded-2xl px-4 py-3 flex items-start gap-2.5">
            <span className="text-pink-400 text-lg shrink-0">💡</span>
            <p className="text-xs text-slate-500 leading-relaxed">
              태어난 <span className="font-semibold text-pink-500">년·월·일</span>은 필수예요.
              시간을 모르면 일주·월지 중심으로 읽고, 시간을 입력하면 시지의 보조 수호 리듬까지 열립니다.
            </p>
          </div>
        </div>

        {isFormValid && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl py-4 px-5 border border-pink-100 shadow-sm animate-fade-in-up">
            <p className="text-center text-sm font-semibold text-slate-600">
              출생 좌표가 맞춰졌어요. 이제 가디언 인장과 7일 미션을 열 수 있습니다.
            </p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!isFormValid}
          className={`w-full font-black text-lg rounded-3xl py-5 transition-all shadow-xl ${
            isFormValid
              ? "bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 hover:from-pink-500 hover:via-rose-500 hover:to-purple-500 text-white shadow-pink-200/60 active:scale-[0.98]"
              : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
          }`}
        >
          {isFormValid ? "🔮 수호 인장 열기" : "년·월·일을 입력해 주세요"}
        </button>

        <p className="text-center text-xs text-slate-400">
          입력된 생년월일은 운세 분석에만 사용되며 저장되지 않아요
        </p>
      </div>
    </div>
  );
}
