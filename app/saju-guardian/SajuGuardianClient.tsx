"use client";

import { cmsRecord } from "@/lib/cms/build-text";

import { useEffect, useState, useCallback, useRef } from "react";
import { showToast } from "@/app/components/Toast";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import type { AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import { runBillingCoinGate } from "@/app/_lib/billing-client";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import {
  GANJI_ANIMAL_MAP,
  getGuardianCopy,
  getStemElement,
  normalizeGanji,
  type Ganji60,
} from "@/app/_lib/fortune/ganjiGuardianSprite";
import { buildGuardianIdentity, buildTenGodReadings } from "@/app/_lib/fortune/guardianIdentity";

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
const SAJU_GUARDIAN_ACCESS_VERSION = "v2";
const SAJU_GUARDIAN_SESSION_MARK = "1";
const SAJU_GUARDIAN_VERIFICATION_RETRY_MS = 800;
const SAJU_GUARDIAN_TILE_LOCK_SCOPE_KEY = "fortune_auth_user";
const SAJU_GUARDIAN_TILE_LOCKS_PREFIX = "cd_tile_locks_v2";
const SAJU_GUARDIAN_HANDOFF_KEY = "cd_saju_guardian_handoff_v20260628";
const SAJU_GUARDIAN_HANDOFF_MARKER = "saju-guardian-main-saju-handoff-v20260628";
const SAJU_GUARDIAN_HANDOFF_TTL_MS = 30 * 60 * 1000;
const SAJU_GUARDIAN_ACCESS_CHECKING_MESSAGE = "빠르게 잠금 해제 권한을 확인 중입니다..";

type SajuGuardianTx = (value: string) => string;

const SAJU_GUARDIAN_TEXT_KEYS_COPY = [
  "사주 가디언 소환진 해금 확인",
  "사주 가디언 소환진 해금 재확인",
  "해금 확인",
  "수호 인장 권한 확인 중",
  "해금 기록과 이용권을 확인한 뒤 사주 가디언 소환진을 열어드립니다.",
  "프리미엄 수호 인장",
  "사주 가디언 소환진",
  "일주·월지·시지·오행 상징을 함께 읽어 지금 삶을 지키는 수호 인장과 7일 실행 의식을 여는 프리미엄 명리 리딩입니다.",
  "일주",
  "월지",
  "시지",
  "오행",
  "인장",
  "문양",
  "리듬",
  "시지 보류",
  "완료",
  "프리미엄 해금 완료",
  "결과 데이터가 아직 준비되지 않았어요. 다시 생성하면 일주 기반 가디언 카드를 불러옵니다.",
  "다시 생성하기",
  "명리 근거",
  "일간·일지·월지·시지가 겹치는 자리에서 수호 인장의 모양이 또렷하게 열립니다.",
  "수호력과 그림자",
  "타고난 힘만 말하지 않고, 운을 새게 만드는 습관과 지켜야 할 기준을 함께 짚습니다.",
  "실전 운용",
  "관계, 일, 재물, 오늘의 개운 의식, 7일 미션까지 바로 쓸 수 있는 문장으로 맺힙니다.",
  "오늘의 개운 의식",
  "해금",
  "10,000원 영구 해금",
  "좌표",
  "일주·월지·시지 세우기",
  "오행 수호 인장 열기",
  "리딩",
  "7일 수호 미션 받기",
  "수호 인장",
  "부적 주머니",
  "색·문장·의식",
  "실행 리딩",
  "관계·일·재물",
  "🔒 10,000원으로 영구 해금하기",
  "메인으로 돌아가기",
  "가디언 인장을 여는 데 실패했어요.",
  "입력값을 확인한 뒤 다시 소환해 주세요.",
  "🔄 다시 시도하기",
  "일주의 문을 열고 가디언 인장을 세우는 중...",
  "✨ 60갑자와 오행의 결을 맞추고 있어요 ✨",
  "생년월일은 저장하지 않고 기기에서 바로 계산합니다",
  "사주 가디언 소환진",
  "수호 인장",
  "사주 가디언 소환진",
  "🔒 10,000원 영구 해금 · 60갑자 수호 인장",
  "일주·월지·시지·오행",
  "의 결을 맞춰",
  "당신에게 필요한 수호 인장과 7일 의식을 엽니다.",
  "성장",
  "발화",
  "중심",
  "절제",
  "흐름",
  "일주 천간·지지로 나의 중심 기운 판독",
  "월지와 시지로 현실 배경과 행동 리듬 보강",
  "관계·일·재물·오늘의 개운 의식까지 정리",
  "사주 가디언 소환진 구성",
  "10,000원 수호 인장 구성",
  "1. 일주를 중심으로 수호 인장의 뿌리를 세웁니다",
  "나를 대표하는 일주를 먼저 세우면, 그 안의 천간과 지지가 중심을 지키는 결로 드러납니다. 이 축에서 수호 인장의 이름과 첫 문장이 열립니다.",
  "2. 오행의 생극으로 수호력과 약점을 함께 봅니다",
  "목·화·토·금·수는 강하면 좋고 약하면 나쁜 단순한 척도가 아닙니다. 어떤 기운이 나를 살리고, 어떤 기운이 나를 급하게 만드는지 함께 보아야 실제 선택에 쓸 수 있는 리딩이 됩니다.",
  "3. 60갑자 상징을 인장 문장으로 압축합니다",
  "60갑자는 같은 오행이라도 결이 다릅니다. 갑자와 을축이 다르고, 병오와 정미가 다르듯이 같은 불·같은 나무라도 드러나는 방식이 달라집니다. 이 차이를 수호 인장의 이름과 문장으로 정리합니다.",
  "4. 관계·일·재물의 운용 문장까지 엽니다",
  "재미있는 캐릭터 너머로, 내가 어떤 말투로 관계를 살리는지, 어떤 방식으로 일과 돈의 흐름을 잡는지까지 이어집니다. 오늘 바로 쓸 수 있는 행동 언어로 맺힙니다.",
  "5. 오늘의 개운 의식으로 리딩을 닫습니다",
  "명리 리딩은 읽는 순간보다 실행하는 순간 힘이 생깁니다. 결과 마지막에는 오늘의 색, 정리할 기준, 말해야 할 문장처럼 작지만 분명한 수호 행동을 남깁니다.",
  "6. 월지와 시지로 현실 리듬을 보강합니다",
  "일주가 중심 인장이라면 월지는 인장이 현실에서 힘을 얻는 배경이고, 시지는 하루 속에서 수호력이 깨어나는 보조 리듬입니다. 생시를 입력하면 행동 타이밍까지 더 섬세하게 열립니다.",
  "🔮 출생 좌표 입력하고 인장 열기",
  "생년월일 필수 · 태어난 시간은 선택 입력",
  "이전 화면",
  "출생 좌표",
  "명리 좌표",
  "가디언을 여는 출생 좌표",
  "생년월일로 일주와 월지를 세우고, 선택 입력한 시간으로 시지의 보조 리듬까지 정렬합니다.",
  "태어난 년도",
  "년도",
  "월",
  "일",
  "태어난 시간 (선택)",
  "시간을 모르면 건너뛰세요",
  "년",
  "시",
  "오전",
  "오후",
  "태어난 ",
  "년·월·일",
  "은 필수예요.",
  "시간을 모르면 일주·월지 중심으로 읽고, 시간을 입력하면 시지의 보조 수호 리듬까지 열립니다.",
  "출생 좌표가 맞춰졌어요. 이제 가디언 인장과 7일 미션을 열 수 있습니다.",
  "🔮 수호 인장 열기",
  "년·월·일을 입력해 주세요",
  "입력된 생년월일은 운세 분석에만 사용되며 저장되지 않아요",
  "가디언의 수호력",
  "타고난 기운의 운용법",
  "월령의 배경 기운",
  "시간의 보조 수호",
  "그림자와 약점",
  "관계의 보호 문장",
  "일과 재물의 사용처",
  "새는 기운 닫기",
  "관계의 온도 조절",
  "일의 기준 세우기",
  "그림자 관찰",
  "수호 문장 실행",
  "운을 담는 그릇 정돈",
  "가디언 재확인",
  "오늘의 판단 우선순위",
  "관계 운영 문장",
  "일·금전 리스크 체크",
  "7일 루틴 시작점",
  "핵심 수호 인장",
  "관계·일·재물 운용",
  "의식",
  "7일",
  "7일 가디언 미션",
  "운용",
  "실전 가디언 가이드",
  "계산 중",
  "수호축",
  "인장상",
  "엠블럼",
  "시간 미입력",
  "오늘의 색",
  "맑은",
  "{color}빛으로 {element} 기운을 부드럽게 고정하세요.",
  "소환 주문",
  "{guardian}의 중심을 조용히 세웁니다.",
  "작은 실행",
  "시간 열쇠",
  "생시를 추가하면 시간대별 수호 리듬이 더 선명해집니다.",
  "수호상 화첩",
  "나의 사주 가디언 그리기",
  "명식의 색과 동물 상징을 한 장의 수호상으로 피워 올립니다.",
  "그림 주문문",
  "그림 주문 복사",
  "그림 주문이 복사됐어요",
  "수호 동물",
  "중심 색감",
  "수호 문양",
  "닫기",
  "사주 가디언 핵심 지표",
  "사주 가디언 소환 단계",
  "{element} 기운",
  "✦ {branch}년지",
  "{ganji}일주 · {label}",
  "오늘 바로 쓸 수 있는 수호 키트",
  "3개 개봉",
  "가디언 인장",
  "수호 방향",
  "조심할 결",
  "정밀 리포트",
  "가디언 리포트",
  "현재 가디언 메시지",
  "{guardian}의 에너지를 실전 루틴에 연결해 보세요.",
  "오늘은 운을 크게 바꾸려 하기보다, 새는 기운 하나를 막고 지켜야 할 기준 하나를 선명히 세우는 날입니다.",
  "사주 가디언 소환진은 일주·월지·시지와 60갑자 상징을 함께 읽는 프리미엄 명리 리딩입니다.",
  "일주 계산에 실패했어요. 입력값을 다시 확인해 주세요.",
  "로컬 계산에 실패했어요. 입력값을 다시 확인해 주세요.",
] as const;

const SAJU_GUARDIAN_TEXT_COPY: Partial<Record<LoadingLocale, Record<string, string>>> = {
  ko: Object.fromEntries(SAJU_GUARDIAN_TEXT_KEYS_COPY.map((value) => [value, value])) as Record<string, string>,
  en: {
    "사주 가디언 소환진 해금 확인": "Saju Guardian unlock check",
    "사주 가디언 소환진 해금 재확인": "Saju Guardian unlock recheck",
    "해금 확인": "Unlock Check",
    "수호 인장 권한 확인 중": "Checking guardian seal access",
    "해금 기록과 이용권을 확인한 뒤 사주 가디언 소환진을 열어드립니다.": "We will open the Saju Guardian circle after checking your unlock record and pass.",
    "프리미엄 수호 인장": "Premium Guardian Seal",
    "사주 가디언 소환진": "Saju Guardian Circle",
    "일주·월지·시지·오행 상징을 함께 읽어 지금 삶을 지키는 수호 인장과 7일 실행 의식을 여는 프리미엄 명리 리딩입니다.": "A premium Myeongli reading that opens your guardian seal and seven-day ritual through your day pillar, month branch, hour branch, and five-element symbols.",
    "일주": "Day Pillar",
    "월지": "Month Branch",
    "시지": "Hour Branch",
    "오행": "Five Elements",
    "인장": "Seal",
    "문양": "Emblem",
    "리듬": "Rhythm",
    "시지 보류": "Hour branch pending",
    "완료": "Done",
    "프리미엄 해금 완료": "Premium unlock complete",
    "결과 데이터가 아직 준비되지 않았어요. 다시 생성하면 일주 기반 가디언 카드를 불러옵니다.": "Result data is not ready yet. Generate again to load your day-pillar guardian card.",
    "다시 생성하기": "Generate Again",
    "명리 근거": "Myeongli Basis",
    "일간·일지·월지·시지가 겹치는 자리에서 수호 인장의 모양이 또렷하게 열립니다.": "The guardian seal becomes clear where the day stem, day branch, month branch, and hour branch overlap.",
    "수호력과 그림자": "Protection and Shadow",
    "타고난 힘만 말하지 않고, 운을 새게 만드는 습관과 지켜야 할 기준을 함께 짚습니다.": "The reading shows not only your natural strength, but also the habits that leak luck and the standards to protect.",
    "실전 운용": "Practical Use",
    "관계, 일, 재물, 오늘의 개운 의식, 7일 미션까지 바로 쓸 수 있는 문장으로 맺힙니다.": "It closes with practical language for relationships, work, money, today’s luck ritual, and a seven-day mission.",
    "오늘의 개운 의식": "Today’s Luck Ritual",
    "해금": "Unlock",
    "10,000원 영구 해금": "Permanent unlock for KRW 10,000",
    "좌표": "Coordinates",
    "일주·월지·시지 세우기": "Set day, month, and hour branches",
    "오행 수호 인장 열기": "Open five-element guardian seal",
    "리딩": "Reading",
    "7일 수호 미션 받기": "Receive a seven-day guardian mission",
    "수호 인장": "Guardian Seal",
    "부적 주머니": "Charm Pouch",
    "색·문장·의식": "Color, phrase, ritual",
    "실행 리딩": "Action Reading",
    "관계·일·재물": "Relationships, work, money",
    "🔒 10,000원으로 영구 해금하기": "🔒 Permanently unlock for KRW 10,000",
    "메인으로 돌아가기": "Back to Home",
    "가디언 인장을 여는 데 실패했어요.": "We could not open the guardian seal.",
    "입력값을 확인한 뒤 다시 소환해 주세요.": "Please check your input and summon it again.",
    "🔄 다시 시도하기": "🔄 Try Again",
    "일주의 문을 열고 가디언 인장을 세우는 중...": "Opening the day-pillar gate and raising your guardian seal...",
    "✨ 60갑자와 오행의 결을 맞추고 있어요 ✨": "✨ Aligning the sixty stem-branch cycle with the five elements ✨",
    "생년월일은 저장하지 않고 기기에서 바로 계산합니다": "Your birth date is calculated on this device and is not stored.",
    "🔒 10,000원 영구 해금 · 60갑자 수호 인장": "🔒 KRW 10,000 permanent unlock · Sixty-cycle guardian seal",
    "일주·월지·시지·오행": "day pillar, month branch, hour branch, and five elements",
    "의 결을 맞춰": "",
    "당신에게 필요한 수호 인장과 7일 의식을 엽니다.": "Open the guardian seal and seven-day ritual you need now.",
    "성장": "Growth",
    "발화": "Spark",
    "중심": "Center",
    "절제": "Refinement",
    "흐름": "Flow",
    "일주 천간·지지로 나의 중심 기운 판독": "Read your central energy through day stem and branch",
    "월지와 시지로 현실 배경과 행동 리듬 보강": "Add real-life background and action rhythm through month and hour branches",
    "관계·일·재물·오늘의 개운 의식까지 정리": "Organize relationships, work, money, and today’s luck ritual",
    "사주 가디언 소환진 구성": "Saju Guardian Circle contents",
    "10,000원 수호 인장 구성": "KRW 10,000 guardian seal package",
    "1. 일주를 중심으로 수호 인장의 뿌리를 세웁니다": "1. The guardian seal begins from your day pillar.",
    "나를 대표하는 일주를 먼저 세우면, 그 안의 천간과 지지가 중심을 지키는 결로 드러납니다. 이 축에서 수호 인장의 이름과 첫 문장이 열립니다.": "When the day pillar that represents you is set first, its heavenly stem and earthly branch reveal the texture that protects your center. From this axis, the name and first sentence of your guardian seal open.",
    "2. 오행의 생극으로 수호력과 약점을 함께 봅니다": "2. The five-element cycle shows both protection and weak points.",
    "목·화·토·금·수는 강하면 좋고 약하면 나쁜 단순한 척도가 아닙니다. 어떤 기운이 나를 살리고, 어떤 기운이 나를 급하게 만드는지 함께 보아야 실제 선택에 쓸 수 있는 리딩이 됩니다.": "Wood, fire, earth, metal, and water are not simply good when strong or bad when weak. A useful reading sees which energy supports you and which energy makes you rush.",
    "3. 60갑자 상징을 인장 문장으로 압축합니다": "3. The sixty stem-branch symbols become seal sentences.",
    "60갑자는 같은 오행이라도 결이 다릅니다. 갑자와 을축이 다르고, 병오와 정미가 다르듯이 같은 불·같은 나무라도 드러나는 방식이 달라집니다. 이 차이를 수호 인장의 이름과 문장으로 정리합니다.": "Even within the same element, each of the sixty stem-branch signs has a different texture. These differences are gathered into the guardian seal’s name and sentence.",
    "4. 관계·일·재물의 운용 문장까지 엽니다": "4. It opens practical sentences for relationships, work, and money.",
    "재미있는 캐릭터 너머로, 내가 어떤 말투로 관계를 살리는지, 어떤 방식으로 일과 돈의 흐름을 잡는지까지 이어집니다. 오늘 바로 쓸 수 있는 행동 언어로 맺힙니다.": "Beyond a charming character, the reading reaches the words that help your relationships and the way you manage work and money. It closes with language you can use today.",
    "5. 오늘의 개운 의식으로 리딩을 닫습니다": "5. The reading closes with today’s luck ritual.",
    "명리 리딩은 읽는 순간보다 실행하는 순간 힘이 생깁니다. 결과 마지막에는 오늘의 색, 정리할 기준, 말해야 할 문장처럼 작지만 분명한 수호 행동을 남깁니다.": "A Myeongli reading gains power when it is practiced. The final result leaves a small but clear guardian action, such as today’s color, a standard to organize, or a sentence to say.",
    "6. 월지와 시지로 현실 리듬을 보강합니다": "6. Month and hour branches add real-life rhythm.",
    "일주가 중심 인장이라면 월지는 인장이 현실에서 힘을 얻는 배경이고, 시지는 하루 속에서 수호력이 깨어나는 보조 리듬입니다. 생시를 입력하면 행동 타이밍까지 더 섬세하게 열립니다.": "If the day pillar is the central seal, the month branch is the background that gives it strength in real life, and the hour branch is the supporting rhythm that wakes protection during the day.",
    "🔮 출생 좌표 입력하고 인장 열기": "🔮 Enter birth coordinates and open the seal",
    "생년월일 필수 · 태어난 시간은 선택 입력": "Birth date required · Birth time optional",
    "이전 화면": "Previous screen",
    "출생 좌표": "Birth Coordinates",
    "명리 좌표": "Myeongli Coordinates",
    "가디언을 여는 출생 좌표": "Birth coordinates that open your guardian",
    "생년월일로 일주와 월지를 세우고, 선택 입력한 시간으로 시지의 보조 리듬까지 정렬합니다.": "Your birth date sets the day pillar and month branch; optional birth time aligns the supporting hour-branch rhythm.",
    "태어난 년도": "Birth Year",
    "년도": "Year",
    "월": "Month",
    "일": "Day",
    "태어난 시간 (선택)": "Birth Time (Optional)",
    "시간을 모르면 건너뛰세요": "Skip if you do not know the time",
    "프로필 카드에서 불러오기": "Load from profile card",
    "프로필 카드에서 출생 정보 불러오기": "Load birth info from profile card",
    "프로필 카드의 출생 정보를 불러왔어요.": "Birth info loaded from your profile card.",
    "프로필 카드에 저장된 출생 정보가 없어요.": "No birth info saved on your profile card.",
    "년": "",
    "시": ":00",
    "오전": "AM",
    "오후": "PM",
    "태어난 ": "Your ",
    "년·월·일": "birth date",
    "은 필수예요.": " is required.",
    "시간을 모르면 일주·월지 중심으로 읽고, 시간을 입력하면 시지의 보조 수호 리듬까지 열립니다.": "If you do not know the time, the reading centers on your day pillar and month branch. Add the time to open the supporting hour-branch rhythm.",
    "출생 좌표가 맞춰졌어요. 이제 가디언 인장과 7일 미션을 열 수 있습니다.": "Your birth coordinates are aligned. You can now open the guardian seal and seven-day mission.",
    "🔮 수호 인장 열기": "🔮 Open Guardian Seal",
    "년·월·일을 입력해 주세요": "Enter year, month, and day",
    "입력된 생년월일은 운세 분석에만 사용되며 저장되지 않아요": "The entered birth date is used only for this reading and is not stored.",
    "가디언의 수호력": "Guardian Protection",
    "타고난 기운의 운용법": "How to Use Your Native Energy",
    "월령의 배경 기운": "Month-Branch Background Energy",
    "시간의 보조 수호": "Hour-Branch Support",
    "그림자와 약점": "Shadow and Weak Point",
    "관계의 보호 문장": "Protective Sentence for Relationships",
    "일과 재물의 사용처": "How to Use Work and Money Energy",
    "새는 기운 닫기": "Close Leaking Energy",
    "관계의 온도 조절": "Adjust Relationship Temperature",
    "일의 기준 세우기": "Set Work Standards",
    "그림자 관찰": "Observe the Shadow",
    "수호 문장 실행": "Practice the Guardian Sentence",
    "운을 담는 그릇 정돈": "Clear the Vessel That Holds Luck",
    "가디언 재확인": "Recheck the Guardian",
    "오늘의 판단 우선순위": "Today’s Decision Priority",
    "관계 운영 문장": "Relationship Operating Sentence",
    "일·금전 리스크 체크": "Work and Money Risk Check",
    "7일 루틴 시작점": "Seven-Day Routine Starting Point",
    "핵심 수호 인장": "Core Guardian Seal",
    "관계·일·재물 운용": "Relationships, Work, and Money",
    "의식": "Ritual",
    "7일": "7 Days",
    "7일 가디언 미션": "Seven-Day Guardian Mission",
    "운용": "Use",
    "실전 가디언 가이드": "Practical Guardian Guide",
    "계산 중": "Calculating",
    "수호축": "Guardian Axis",
    "인장상": "Seal Image",
    "엠블럼": "Emblem",
    "시간 미입력": "No birth time",
    "오늘의 색": "Today’s Color",
    "맑은": "Clear",
    "{color}빛으로 {element} 기운을 부드럽게 고정하세요.": "Anchor {element} energy softly with {color} light.",
    "소환 주문": "Summoning Phrase",
    "{guardian}의 중심을 조용히 세웁니다.": "Quietly raise the center of {guardian}.",
    "작은 실행": "Small Action",
    "시간 열쇠": "Time Key",
    "생시를 추가하면 시간대별 수호 리듬이 더 선명해집니다.": "Add birth time to reveal a clearer guardian rhythm by time of day.",
    "수호상 화첩": "Guardian Sketchbook",
    "나의 사주 가디언 그리기": "Draw My Saju Guardian",
    "명식의 색과 동물 상징을 한 장의 수호상으로 피워 올립니다.": "Let the color and animal symbol of your chart bloom into one guardian portrait.",
    "그림 주문문": "Art Invocation",
    "그림 주문 복사": "Copy Art Invocation",
    "그림 주문이 복사됐어요": "Art invocation copied",
    "수호 동물": "Guardian Animal",
    "중심 색감": "Core Color",
    "수호 문양": "Guardian Emblem",
    "닫기": "Close",
    "사주 가디언 핵심 지표": "Saju Guardian key metrics",
    "사주 가디언 소환 단계": "Saju Guardian summoning steps",
    "{element} 기운": "{element} Energy",
    "✦ {branch}년지": "✦ Year branch {branch}",
    "{ganji}일주 · {label}": "{ganji} day pillar · {label}",
    "오늘 바로 쓸 수 있는 수호 키트": "A guardian kit you can use today",
    "3개 개봉": "3 opened",
    "가디언 인장": "Guardian Seal",
    "수호 방향": "Guardian Direction",
    "조심할 결": "Texture to Watch",
    "정밀 리포트": "Detailed Report",
    "가디언 리포트": "Guardian Report",
    "현재 가디언 메시지": "Current Guardian Message",
    "{guardian}의 에너지를 실전 루틴에 연결해 보세요.": "Connect the energy of {guardian} to a practical routine.",
    "오늘은 운을 크게 바꾸려 하기보다, 새는 기운 하나를 막고 지켜야 할 기준 하나를 선명히 세우는 날입니다.": "Today asks you to block one leaking energy and set one clear standard rather than trying to change everything at once.",
    "사주 가디언 소환진은 일주·월지·시지와 60갑자 상징을 함께 읽는 프리미엄 명리 리딩입니다.": "Saju Guardian Circle is a premium Myeongli reading that reads your day pillar, month branch, hour branch, and sixty-cycle symbols together.",
    "일주 계산에 실패했어요. 입력값을 다시 확인해 주세요.": "Day-pillar calculation failed. Please check your input.",
    "로컬 계산에 실패했어요. 입력값을 다시 확인해 주세요.": "Local calculation failed. Please check your input.",
  },
};

const SAJU_GUARDIAN_MISSING_COPY: Partial<Record<LoadingLocale, string>> = {
  ko: "번역 준비 중",
  en: "Translation unavailable",
  ja: "翻訳準備中",
  "zh-CN": "翻译准备中",
  "zh-TW": "翻譯準備中",
};

function translateSajuGuardianText(value: string, locale: LoadingLocale) {
  const table = SAJU_GUARDIAN_TEXT_COPY[locale] || SAJU_GUARDIAN_TEXT_COPY.en || SAJU_GUARDIAN_TEXT_COPY.ko;
  return table?.[value] || SAJU_GUARDIAN_TEXT_COPY.en?.[value] || SAJU_GUARDIAN_MISSING_COPY[locale] || SAJU_GUARDIAN_MISSING_COPY.en || "";
}

function formatSajuGuardianText(template: string, params: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? ""));
}

type GuardianPayload = Record<string, unknown> | null | undefined;

function buildGuardianStorageKeys() {
  return [
    `cd_pa_${SAJU_GUARDIAN_ACTION}`,
    `cd_pa_${SAJU_GUARDIAN_LEGACY_ACTION}`,
    `cd_pa_${SAJU_GUARDIAN_FEATURE_KEY}`,
  ];
}

function isTruthLike(value: unknown): boolean {
  if (value === true) return true;
  if (value === 1) return true;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    return lowered === "1" || lowered === "true" || lowered === "ok" || lowered === "yes";
  }
  return false;
}

function hasFeatureInLockMap(mapObj: unknown, lockKey: string): boolean {
  if (!mapObj || typeof mapObj !== "object") return false;
  const valueBy = (key: string): boolean => {
    const source = (mapObj as Record<string, unknown>)[key];
    if (isTruthLike(source)) return true;
    if (!source || typeof source !== "object") return false;
    if (typeof (source as Record<string, unknown>).unlocked === "boolean") {
      return (source as Record<string, unknown>).unlocked === true;
    }
    if (typeof (source as Record<string, unknown>).grant === "boolean") {
      return (source as Record<string, unknown>).grant === true;
    }
    if (typeof (source as Record<string, unknown>).granted === "boolean") {
      return (source as Record<string, unknown>).granted === true;
    }
    if (typeof (source as Record<string, unknown>).access === "boolean") {
      return (source as Record<string, unknown>).access === true;
    }
    return false;
  };
  const aliases = [lockKey];
  if (lockKey === SAJU_GUARDIAN_FEATURE_KEY) {
    aliases.push(SAJU_GUARDIAN_ACTION);
    aliases.push(SAJU_GUARDIAN_LEGACY_ACTION);
  } else if (lockKey === SAJU_GUARDIAN_ACTION || lockKey === SAJU_GUARDIAN_LEGACY_ACTION) {
    aliases.push(SAJU_GUARDIAN_FEATURE_KEY);
  }

  return aliases.some((alias) => valueBy(alias));
}

function readFortuneAuthScopeId() {
  try {
    const raw = window.localStorage.getItem(SAJU_GUARDIAN_TILE_LOCK_SCOPE_KEY) || "";
    if (!raw) return "";
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const scopeRaw =
      parsed?.id ||
      parsed?.userId ||
      parsed?.email ||
      parsed?.username ||
      parsed?.loginId;
    const scope = String(scopeRaw || "").trim().toLowerCase();
    return scope ? `cd_tile_locks_v2::${scope}` : "";
  } catch (_) {
    return "";
  }
}

function collectGuardianTileLockStorageKeys() {
  const keys = new Set<string>(["cd_tile_locks"]);
  const scopedKey = readFortuneAuthScopeId();
  if (scopedKey) keys.add(scopedKey);
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index) || "";
      if (key === SAJU_GUARDIAN_TILE_LOCKS_PREFIX || key.startsWith(`${SAJU_GUARDIAN_TILE_LOCKS_PREFIX}::`)) {
        keys.add(key);
      }
    }
  } catch (_) {}
  return Array.from(keys);
}

function hasGuardianUnlockAccessInTileLockMaps() {
  if (typeof window === "undefined") return false;
  const runtimeUnlockedFeatureMap =
    (window as Window & { unlockedFeatureMap?: Record<string, unknown> | null }).unlockedFeatureMap;
  try {
    if (runtimeUnlockedFeatureMap && typeof runtimeUnlockedFeatureMap === "object") {
      if (hasFeatureInLockMap(runtimeUnlockedFeatureMap, SAJU_GUARDIAN_FEATURE_KEY)) return true;
    }
  } catch (_) {}
  try {
    const storageKeys = collectGuardianTileLockStorageKeys();
    for (const storageKey of storageKeys) {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (hasFeatureInLockMap(parsed, SAJU_GUARDIAN_FEATURE_KEY)) return true;
      } catch (_) {}
    }
  } catch (_) {}
  return false;
}

function readGuardianStorageEntry(storage: Storage, key: string) {
  const raw = storage.getItem(key);
  if (!raw) return false;
  if (raw === SAJU_GUARDIAN_SESSION_MARK) return true;
  try {
    const parsed = JSON.parse(raw) as { v?: string };
    if (parsed?.v && parsed.v === SAJU_GUARDIAN_ACCESS_VERSION) return true;
  } catch (_) {
    return false;
  }
  return false;
}

function hasGuardianUnlockAccess() {
  if (typeof window === "undefined") return false;
  try {
    const keys = buildGuardianStorageKeys();
    return (
      hasGuardianUnlockAccessInTileLockMaps() ||
      keys.some((key) => {
        try {
          return readGuardianStorageEntry(window.sessionStorage, key);
        } catch (_) {
          return false;
        }
      }) ||
      keys.some((key) => {
        try {
          return readGuardianStorageEntry(window.localStorage, key);
        } catch (_) {
          return false;
        }
      })
    );
  } catch (_) {
    return false;
  }
}

function rememberGuardianUnlockAccess() {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify({
      v: SAJU_GUARDIAN_ACCESS_VERSION,
      grantedAt: Date.now(),
    });
    buildGuardianStorageKeys().forEach((key) => {
      window.sessionStorage.setItem(key, payload);
      window.localStorage.setItem(key, payload);
      window.sessionStorage.setItem(`${key}:v`, SAJU_GUARDIAN_ACCESS_VERSION);
      window.localStorage.setItem(`${key}:v`, SAJU_GUARDIAN_ACCESS_VERSION);
    });
  } catch (_) {}
}

function payloadGrantsGuardianAccess(payload: unknown) {
  try {
    if (!payload || typeof payload !== "object") return false;
    const data = payload as Record<string, unknown>;
    const accessDecision = (data.accessDecision as Record<string, unknown> | null) || null;
    const direct =
      data.canAccess === true ||
      data.freeBySubscription === true ||
      data.accessGranted === true ||
      data.granted === true ||
      data.hasAccess === true ||
      data.ok === true ||
      data.unlocked === true ||
      data.passActive === true ||
      data.alreadyUnlocked === true;
    const decisionDirect =
      accessDecision?.accessGranted === true ||
      accessDecision?.accessGateResult === true ||
      accessDecision?.passCovered === true ||
      accessDecision?.alreadyUnlocked === true;

    if (direct || decisionDirect) return true;
    if (
      data.code === "ALREADY_UNLOCKED" ||
      data.code === "PASS_FREE" ||
      data.code === "MEMBERSHIP_PASS_ACTIVE" ||
      data.code === "PASS_ACTIVE" ||
      data.code === "ACCESS_GRANTED" ||
      data.code === "PASS_COVERED"
    ) {
      return true;
    }
    if (typeof accessDecision?.reason === "string" && /already_unlocked|pass_covered|pass_applied|membership_pass|pass_active/i.test(accessDecision.reason)) {
      return true;
    }
    if (
      typeof accessDecision?.status === "string" &&
      /already_unlocked|pass_covered|pass_applied|membership_pass|pass_active|unlocked|success/i.test(accessDecision.status)
    ) {
      return true;
    }
    if (typeof (data.status as string) === "string" && /already_unlocked|pass_applied|membership_pass|success|pass_covered/i.test(String(data.status))) {
      return true;
    }

    const text = JSON.stringify(data);
    const containsKey =
      text.includes(SAJU_GUARDIAN_FEATURE_KEY) &&
      !/(PAYMENT_REQUIRED|INSUFFICIENT_COINS|PRICE_NOT_FOUND|FORBIDDEN|UNAUTHORIZED)/i.test(text);

    if (!containsKey) {
      return false;
    }
    return /(already_unlocked|pass_applied|membership_pass|accessGrant|premiumAccessToken|accessGranted|hasAccess|pass_active|already_has_access|unlocked|PASS_ACTIVE|PASS_FREE|ALREADY_UNLOCKED|PASS_COVERED|pass_covered|access)/i.test(
      text,
    );
  } catch (_) {
    return false;
  }
}

async function verifyGuardianUnlockAccess() {
  if (hasGuardianUnlockAccess()) return true;
  if (typeof window === "undefined") return false;
  const requestAccessCheck = async (reason: string): Promise<GuardianPayload | null> => {
    try {
      const result = await runBillingCoinGate({
        categoryKey: "main-tile",
        subFeatureKey: SAJU_GUARDIAN_FEATURE_KEY,
        featureKey: SAJU_GUARDIAN_FEATURE_KEY,
        paymentMode: "MEMBERSHIP_PASS",
        cost: 100,
        coinPrice: 100,
        reason,
        requestId: `guardian-access:${Date.now().toString(36)}`,
      });
      if (!result.ok || !result.data) {
        return null;
      }
      return result.data as GuardianPayload;
    } catch (_) {
      return null;
    }
  };
  try {
    const payload = await requestAccessCheck("사주 가디언 소환진 해금 확인");
    const isAllowed = payloadGrantsGuardianAccess(payload);
    if (isAllowed) {
      rememberGuardianUnlockAccess();
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, SAJU_GUARDIAN_VERIFICATION_RETRY_MS));
    const retryPayload = await requestAccessCheck("사주 가디언 소환진 해금 재확인");
    if (payloadGrantsGuardianAccess(retryPayload)) {
      rememberGuardianUnlockAccess();
      return true;
    }
  } catch (_) {}
  if (hasGuardianUnlockAccess()) return true;
  return false;
}

/* ─────────────────────── 선택 옵션 ─────────────────────────── */
// 🔴 YEARS 는 select 옵션이 아니라 프로필 프리필 유효범위(seedToGuardianBirthFields)로도 쓰인다 — 지우지 않는다.
const YEARS = Array.from({ length: 100 }, (_, i) => 2024 - i);

function seedToGuardianBirthFields(seed: AiPrefillSeed | null): { year: string; month: string; day: string; hour: string } | null {
  if (!seed) return null;
  const digits = String(seed.birthDate || "").replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  if (!YEARS.includes(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  let hour = "";
  if (!seed.birthTimeUnknown && /^\d{2}:\d{2}$/.test(String(seed.birthTime || ""))) {
    const parsedHour = Number(String(seed.birthTime).slice(0, 2));
    if (parsedHour >= 0 && parsedHour <= 23) hour = String(parsedHour);
  }
  return { year: String(year), month: String(month), day: String(day), hour };
}

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

type PlainObject = Record<string, unknown>;

const HANJA_STEM_TO_KO: Record<string, string> = {
  甲: "갑",
  乙: "을",
  丙: "병",
  丁: "정",
  戊: "무",
  己: "기",
  庚: "경",
  辛: "신",
  壬: "임",
  癸: "계",
};

const HANJA_BRANCH_TO_KO: Record<string, string> = {
  子: "자",
  丑: "축",
  寅: "인",
  卯: "묘",
  辰: "진",
  巳: "사",
  午: "오",
  未: "미",
  申: "신",
  酉: "유",
  戌: "술",
  亥: "해",
};

const ELEMENT_KEY_TO_KO: Record<string, "목" | "화" | "토" | "금" | "수"> = {
  wood: "목",
  목: "목",
  木: "목",
  fire: "화",
  화: "화",
  火: "화",
  earth: "토",
  토: "토",
  土: "토",
  metal: "금",
  금: "금",
  金: "금",
  water: "수",
  수: "수",
  水: "수",
};

function asPlainObject(value: unknown): PlainObject | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as PlainObject) : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = asString(value);
    if (text) return text;
  }
  return "";
}

function convertHanjaGanjiText(value: unknown) {
  return asString(value)
    .replace(/[甲乙丙丁戊己庚辛壬癸]/g, (char) => HANJA_STEM_TO_KO[char] || char)
    .replace(/[子丑寅卯辰巳午未申酉戌亥]/g, (char) => HANJA_BRANCH_TO_KO[char] || char);
}

function normalizeStem(value: unknown) {
  const text = convertHanjaGanjiText(value);
  return text ? text.slice(0, 1) : "";
}

function normalizeBranch(value: unknown) {
  const text = convertHanjaGanjiText(value);
  return text ? text.slice(0, 1) : "";
}

function normalizeGanjiFromAny(value: unknown) {
  return normalizeGanji(convertHanjaGanjiText(value));
}

function normalizeElement(value: unknown): "목" | "화" | "토" | "금" | "수" | "" {
  const key = asString(value);
  return ELEMENT_KEY_TO_KO[key] || "";
}

function normalizeElementFromWeights(source: unknown): "목" | "화" | "토" | "금" | "수" | "" {
  const weights = asPlainObject(source);
  if (!weights) return "";
  const candidates: Array<{ key: keyof typeof ELEMENT_KEY_TO_KO; value: number }> = [
    { key: "wood", value: Number(weights.wood ?? weights["목"] ?? 0) },
    { key: "fire", value: Number(weights.fire ?? weights["화"] ?? 0) },
    { key: "earth", value: Number(weights.earth ?? weights["토"] ?? 0) },
    { key: "metal", value: Number(weights.metal ?? weights["금"] ?? 0) },
    { key: "water", value: Number(weights.water ?? weights["수"] ?? 0) },
  ];
  const best = candidates.reduce((winner, item) => (Number.isFinite(item.value) && item.value > winner.value ? item : winner), {
    key: "earth" as keyof typeof ELEMENT_KEY_TO_KO,
    value: -1,
  });
  return best.value >= 0 ? ELEMENT_KEY_TO_KO[best.key] : "";
}

function normalizeGuardianPillar(value: unknown) {
  const source = asPlainObject(value);
  if (!source) return undefined;
  const ganji = normalizeGanjiFromAny(firstString(source.ganji, source.stemBranch, source.dayGanji, `${firstString(source.g, source.stem)}${firstString(source.j, source.branch)}`));
  const stem = normalizeStem(firstString(source.stem, source.g, ganji?.slice(0, 1)));
  const branch = normalizeBranch(firstString(source.branch, source.j, ganji?.slice(1, 2)));
  if (!ganji && !stem && !branch) return undefined;
  return {
    ganji: ganji || (stem && branch ? `${stem}${branch}` : undefined),
    stem: stem || undefined,
    branch: branch || undefined,
  };
}

function normalizeGuardianPillars(value: unknown) {
  const source = asPlainObject(value);
  if (!source) return null;
  const pillars = {
    year: normalizeGuardianPillar(source.year ?? source.y),
    month: normalizeGuardianPillar(source.month ?? source.m),
    day: normalizeGuardianPillar(source.day ?? source.d),
    hour: normalizeGuardianPillar(source.hour ?? source.h),
  };
  return pillars.day?.ganji ? pillars : null;
}

function nestedObject(source: PlainObject | null, key: string) {
  return source ? asPlainObject(source[key]) : null;
}

function hasKnownBirthTime(profile: PlainObject | null) {
  const birth = nestedObject(profile, "birth");
  if (!birth) return false;
  if (birth.unknownTime === true || birth.timeDefault === true || birth.birthTimeUnknown === true) return false;
  return birth.hour !== undefined && birth.hour !== null && birth.hour !== "";
}

function buildGuardianDataFromHandoff(payload: unknown): ApiResult | null {
  const handoff = asPlainObject(payload);
  if (!handoff || handoff.marker !== SAJU_GUARDIAN_HANDOFF_MARKER) return null;
  const storedAt = Number(handoff.storedAt || 0);
  if (!Number.isFinite(storedAt) || Date.now() - storedAt > SAJU_GUARDIAN_HANDOFF_TTL_MS) return null;

  const pillars = normalizeGuardianPillars(handoff.pillars);
  if (!pillars?.day?.ganji) return null;

  const profile = asPlainObject(handoff.profile);
  const snapshot = asPlainObject(handoff.snapshot);
  const analysis = nestedObject(snapshot, "analysis");
  const natal = asPlainObject(handoff.natal);
  const natalRatios = nestedObject(natal, "ratios");
  const dayStem = pillars.day.stem || pillars.day.ganji.slice(0, 1);
  const monthStem = pillars.month?.stem || "";
  const dominantElement = STEM_TO_ELEMENT[dayStem] || normalizeElement(snapshot?.dayStemElement) || normalizeElement(analysis?.dayStemElement) || normalizeElementFromWeights(natalRatios) || "토";
  const secondaryElement = STEM_TO_ELEMENT[monthStem] || normalizeElementFromWeights(natalRatios) || ELEMENT_NEXT[dominantElement] || "금";
  const resolvedGanji = normalizeGanji(pillars.day.ganji);
  if (!resolvedGanji) return null;

  const mainAnimal = GANJI_ANIMAL_MAP[resolvedGanji] ?? "용";
  const copy = getGuardianCopy(resolvedGanji);
  const yearBranch = pillars.year?.branch || "";

  return {
    ok: true,
    resolvedGanji,
    result: {
      dominantElement,
      secondaryElement,
      zodiac: BRANCH_TO_ZODIAC[yearBranch] ?? mainAnimal,
      colorKo: ELEMENT_COLOR[dominantElement]?.ko ?? "파스텔",
      colorEn: ELEMENT_COLOR[dominantElement]?.en ?? "Pastel",
      animals: [mainAnimal],
      mainAnimal,
      expressionKo: `${mainAnimal} 수호성이 명식 위로 드러나는 흐름`,
      personalitySummaryKo: copy.short,
      personalityLines: copy.traits,
      headlineKo: copy.title,
      hasBirthTime: hasKnownBirthTime(profile),
      dayPillar: resolvedGanji,
      dayGanji: resolvedGanji,
      ilju: resolvedGanji,
      dayStemBranch: resolvedGanji,
      fourPillars: pillars,
    },
  };
}

function readGuardianHandoffData() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SAJU_GUARDIAN_HANDOFF_KEY);
    if (!raw) return null;
    return buildGuardianDataFromHandoff(JSON.parse(raw));
  } catch (e) {
    return null;
  }
}

const ELEMENT_GUARDIAN_READING_DEFAULT: Record<string, {
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

const SAJU_GUARDIAN_VALUE_SECTIONS_COPY = [
  {
    title: "1. 일주를 중심으로 수호 인장의 뿌리를 세웁니다",
    body:
      "나를 대표하는 일주를 먼저 세우면, 그 안의 천간과 지지가 중심을 지키는 결로 드러납니다. 이 축에서 수호 인장의 이름과 첫 문장이 열립니다.",
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
    title: "4. 관계·일·재물의 운용 문장까지 엽니다",
    body:
      "재미있는 캐릭터 너머로, 내가 어떤 말투로 관계를 살리는지, 어떤 방식으로 일과 돈의 흐름을 잡는지까지 이어집니다. 오늘 바로 쓸 수 있는 행동 언어로 맺힙니다.",
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

const GUARDIAN_FLOW_STEPS_COPY = [
  { step: "01", label: "해금", title: "10,000원 영구 해금", icon: "🔒" },
  { step: "02", label: "좌표", title: "일주·월지·시지 세우기", icon: "🗝️" },
  { step: "03", label: "인장", title: "오행 수호 인장 열기", icon: "🔮" },
  { step: "04", label: "리딩", title: "7일 수호 미션 받기", icon: "💌" },
] as const;

const GUARDIAN_PREMIUM_POINTS_COPY = [
  { label: "수호 인장", value: "일주·월지·시지" },
  { label: "부적 주머니", value: "색·문장·의식" },
  { label: "실행 리딩", value: "관계·일·재물" },
] as const;

const MONTH_BRANCH_READING_DEFAULT: Record<string, string> = {
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

const HOUR_BRANCH_READING_DEFAULT: Record<string, string> = {
  자: "자시는 깊은 밤의 물길입니다. 혼자 정리하는 시간에 직감이 살아나며, 마음속 답을 글로 남길수록 수호력이 커집니다.",
  축: "축시는 새벽 전의 저장고입니다. 급하게 드러내기보다 준비를 단단히 하면 뒤늦게 큰 힘을 냅니다.",
  인: "인시는 아침의 첫 호흡입니다. 시작하는 힘이 빠르니 오늘 가장 중요한 일을 먼저 열어두는 편이 좋습니다.",
  묘: "묘시는 해가 떠오르는 부드러운 문입니다. 관계의 말투와 첫인상이 운을 여는 열쇠가 됩니다.",
  진: "진시는 기운을 모아 현실로 내리는 시간입니다. 계획을 문서와 일정으로 묶을수록 흐름이 안정됩니다.",
  사: "사시는 불이 살아나는 시간입니다. 발표, 설득, 표현에서 빛나지만 말의 속도를 조절해야 합니다.",
  오: "오시는 한낮의 중심입니다. 존재감이 강해지는 만큼 선택을 단순하게 만드는 일이 수호가 됩니다.",
  미: "미시는 열기를 정리하는 시간입니다. 돌봄과 책임을 잘 쓰되, 지나친 부담은 나누어야 합니다.",
  신: "신시는 금기의 판단이 들어오는 시간입니다. 정리, 분석, 계약처럼 선을 긋는 일에 힘이 붙습니다.",
  유: "유시는 완성의 빛이 맑아지는 시간입니다. 결과물을 다듬고 선명히 드러내는 일에서 운이 살아납니다.",
  술: "술시는 하루의 불씨를 저장하는 시간입니다. 지켜야 할 약속과 내려놓을 걱정을 구분하면 마음이 단단해집니다.",
  해: "해시는 밤의 물길이 열리는 시간입니다. 회복과 영감이 깊어지니 휴식 속에서 다음 답이 옵니다.",
};

/* 관리자 CMS(운세 콘텐츠 → 사주 수호신 해설)에서 고친 값을 기본값 위에 얹는다.
   오버라이드가 없는 칸은 기본값 그대로(폴백 우선). */
const ELEMENT_GUARDIAN_READING = cmsRecord("saju-guardian", "element", ELEMENT_GUARDIAN_READING_DEFAULT);
const MONTH_BRANCH_READING = cmsRecord("saju-guardian", "month-branch", MONTH_BRANCH_READING_DEFAULT);
const HOUR_BRANCH_READING = cmsRecord("saju-guardian", "hour-branch", HOUR_BRANCH_READING_DEFAULT);

/* ─────────────────────────── 입력 필드 UI ─────────────────────── */
function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-pink-400 tracking-widest uppercase pl-1">
        {label}
      </label>
      <input
        type="text"
        inputMode="numeric"
        maxLength={maxLength}
        className="w-full rounded-2xl bg-white/80 backdrop-blur-sm border border-pink-200/80 text-slate-700 text-sm font-medium px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 transition-all shadow-sm hover:border-pink-300"
        style={{ color: "#374151", colorScheme: "light", WebkitTextFillColor: "#374151" }}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, maxLength))}
        placeholder={placeholder}
      />
    </div>
  );
}

/* ─────────────────────── 로딩 애니메이션 ───────────────────── */
function LoadingScreen({ tx }: { tx: SajuGuardianTx }) {
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
          {tx("일주의 문을 열고 가디언 인장을 세우는 중...")}
        </p>
        <p className="text-sm text-pink-400 font-medium animate-pulse">
          {tx("✨ 60갑자와 오행의 결을 맞추고 있어요 ✨")}
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
        <p className="text-xs text-slate-400 mt-4">{tx("생년월일은 저장하지 않고 기기에서 바로 계산합니다")}</p>
      </div>
    </div>
  );
}

/* ─────────────────────── 소환진 SVG 플레이스홀더 ───────────────────── */
function GuardianSummoningCircle({ spinning = false, message }: { spinning?: boolean; message?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <svg viewBox="0 0 400 400" className="h-3/4 w-3/4 max-w-[320px]" aria-hidden="true">
        <circle cx="200" cy="200" r="180" fill="none" stroke="#b31955" strokeWidth="1.5" opacity="0.6" />
        <circle cx="200" cy="200" r="140" fill="none" stroke="#ead089" strokeWidth="0.8" opacity="0.4" />
        <g transform-origin="200 200" className={spinning ? "animate-spin-slow" : undefined}>
          <text x="200" y="40" textAnchor="middle" fontSize="18" fill="#b31955" opacity="0.7">☰</text>
          <text x="340" y="130" textAnchor="middle" fontSize="18" fill="#b31955" opacity="0.7">☱</text>
          <text x="340" y="280" textAnchor="middle" fontSize="18" fill="#b31955" opacity="0.7">☲</text>
          <text x="200" y="375" textAnchor="middle" fontSize="18" fill="#b31955" opacity="0.7">☳</text>
          <text x="60" y="280" textAnchor="middle" fontSize="18" fill="#b31955" opacity="0.7">☴</text>
          <text x="60" y="130" textAnchor="middle" fontSize="18" fill="#b31955" opacity="0.7">☵</text>
        </g>
        <circle cx="200" cy="200" r="80" fill="rgba(179,25,85,0.08)" stroke="#b31955" strokeWidth="1" />
        <text x="200" y="215" textAnchor="middle" fontSize="48" fill="#b31955" opacity="0.3">神</text>
      </svg>
      {message ? <p className="text-xs font-semibold text-amber-100/80">{message}</p> : null}
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
  tx,
}: {
  guardianSeal: string;
  guardianArchetype: string;
  guardianEmblem: string;
  dominantElement: string;
  monthBranch: string;
  hourBranch: string;
  hasBirthTime: boolean;
  tx: SajuGuardianTx;
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
          <p className="mt-2 px-4 text-sm font-black leading-tight text-slate-800" style={{ fontFamily: "var(--font-playful)" }}>{guardianArchetype}</p>
          <p className="mt-1 text-[11px] font-bold text-rose-400">{dominantElement} {tx("수호 인장")}</p>
        </div>
      </div>

      <div className="relative mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/80 bg-white/75 px-3 py-3 text-center">
          <p className="text-[10px] font-black tracking-[0.12em] text-slate-400">{tx("인장")}</p>
          <p className="mt-1 text-xs font-black leading-relaxed text-slate-700">{guardianSeal}</p>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/75 px-3 py-3 text-center">
          <p className="text-[10px] font-black tracking-[0.12em] text-slate-400">{tx("문양")}</p>
          <p className="mt-1 text-xs font-black leading-relaxed text-slate-700">{guardianEmblem}</p>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/75 px-3 py-3 text-center">
          <p className="text-[10px] font-black tracking-[0.12em] text-slate-400">{tx("리듬")}</p>
          <p className="mt-1 text-xs font-black leading-relaxed text-slate-700">
            {monthBranch || tx("월지")} · {hasBirthTime ? hourBranch || tx("시지") : tx("시지 보류")}
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
  tx,
  birthYear,
  birthMonth,
  birthDay,
  birthHour,
}: {
  data: ApiResult;
  onReset: () => void;
  tx: SajuGuardianTx;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  birthHour: string;
}) {
  const [activePanel, setActivePanel] = useState("seal");
  const [promptCopied, setPromptCopied] = useState(false);
  const [guardianImage, setGuardianImage] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    base64?: string;
  }>({ status: "idle" });

  // 생성한 수호신 이미지를 기기에 소유(캐시)해, 재열람 시 NVIDIA 재호출 없이 즉시 다시 보여준다.
  const guardianImageCacheKey = `cd_guardian_img_${birthYear}_${birthMonth}_${birthDay}_${birthHour !== "" ? birthHour : "x"}`;
  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(guardianImageCacheKey);
      if (cached) setGuardianImage({ status: "ready", base64: cached });
    } catch { /* localStorage 불가 환경은 무시 */ }
  }, [guardianImageCacheKey]);

  if (!data.result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fff7ed] via-[#fff1f2] to-[#eef2ff] px-4 py-10">
        <div className="mx-auto w-full max-w-xl rounded-[2rem] border border-white/70 bg-white/80 p-6 text-center shadow-xl backdrop-blur-xl">
          <p className="text-sm font-semibold text-slate-600">
            {tx("결과 데이터가 아직 준비되지 않았어요. 다시 생성하면 일주 기반 가디언 카드를 불러옵니다.")}
          </p>
          <button
            onClick={onReset}
            className="mt-4 rounded-2xl bg-gradient-to-r from-rose-400 to-pink-500 px-4 py-2.5 text-sm font-black text-white"
          >
            {tx("다시 생성하기")}
          </button>
        </div>
      </div>
    );
  }

  const result = data.result!;
  const resolvedGanji = normalizeGanji(data.resolvedGanji);
  const guardianCopy = resolvedGanji ? getGuardianCopy(resolvedGanji) : null;
  const stemTheme = resolvedGanji ? getStemElement(resolvedGanji) : null;
  const txp = (value: string, params: Record<string, string | number>) => formatSajuGuardianText(tx(value), params);

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

  const handleGenerateGuardianImage = async () => {
    setGuardianImage({ status: "loading" });
    try {
      const response = await fetch("/api/guardian/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sajuData: {
            year: Number(birthYear) || 0,
            month: Number(birthMonth) || 0,
            day: Number(birthDay) || 0,
            hour: birthHour !== "" ? Number(birthHour) : undefined,
            stem: dayStem,
            branch: dayBranch,
            elements: result.dominantElement,
            mainAnimal: result.mainAnimal,
            zodiac: result.zodiac,
            polarity: STEM_POLARITY[dayStem] || "양",
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok || !payload?.imageBase64) {
        setGuardianImage({ status: "error" });
        showToast(tx("수호신 이미지를 생성하지 못했어요. 잠시 후 다시 시도해 주세요."), "error");
        return;
      }
      setGuardianImage({ status: "ready", base64: payload.imageBase64 });
      try { window.localStorage.setItem(guardianImageCacheKey, payload.imageBase64); } catch { /* 용량 초과 등은 무시 */ }
    } catch {
      setGuardianImage({ status: "error" });
      showToast(tx("수호신 이미지를 생성하지 못했어요. 잠시 후 다시 시도해 주세요."), "error");
    }
  };
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

  // 정적 가디언 정체성(이름·칭호·성격·서사) — 같은 명식이면 항상 같은 캐릭터.
  const guardianIdentity = resolvedGanji
    ? buildGuardianIdentity({
        ganji: resolvedGanji,
        element: result.dominantElement,
        polarity: stemPolarity,
        animal: result.mainAnimal,
      })
    : null;
  // 십성 개인화 섹션 — 월간·시간 기둥이 다르면 같은 오행이라도 리딩이 달라진다.
  const tenGodSections = buildTenGodReadings(dayStem, monthStem, hourStem);

  const personalityLines = result.personalityLines?.length
    ? result.personalityLines
    : [result.personalitySummaryKo || "오늘의 감정 템포를 관찰하며 작은 루틴을 시작해 보세요."];

  const interpretationCards = [
    {
      title: tx("명리 좌표"),
      body: resolvedGanji
        ? `당신의 중심축은 ${resolvedGanji}일주입니다. 겉으로 드러나는 천간은 ${dayStem || "일간"}의 ${stemPolarity}${result.dominantElement} 기운이고, 안쪽의 지지는 ${dayBranch || "일지"}의 뿌리로 작동합니다. 이 조합에서 ${guardianArchetype}이 중심을 지키는 첫 번째 인장이 열립니다.`
        : result.personalitySummaryKo || personalityLines[0],
    },
    {
      title: tx("가디언의 수호력"),
      body: `${elementReading.protection} ${guardianCopy?.traits?.[0] || `${guardianArchetype}은 중요한 순간에 본능과 판단을 연결하는 힘을 상징합니다.`}`,
    },
    {
      title: tx("타고난 기운의 운용법"),
      body: `${elementReading.axis} ${personalityLines[1] || guardianCopy?.traits?.[1] || "중요한 선택 앞에서는 속도보다 호흡을 먼저 맞추면 운의 탄력이 살아납니다."}`,
    },
    {
      title: tx("월령의 배경 기운"),
      body: `${monthBranch ? `${monthBranch}월지와 ${monthElement} 기운이` : "월지의 배경 기운이"} 수호 인장이 현실에서 작동하는 환경을 만듭니다. ${monthReading}`,
    },
    {
      title: tx("시간의 보조 수호"),
      body: hasBirthTime
        ? `${hourBranch}시지와 ${hourElement} 기운에서 하루 중 당신의 수호력이 살아나는 방식이 드러납니다. ${hourReading}`
        : hourReading,
    },
    {
      title: tx("그림자와 약점"),
      body: `${guardianCopy?.caution || personalityLines[2] || "감정이 급해지는 순간에는 결정을 잠시 미루고 기준을 다시 확인해 보세요."} ${elementReading.shadow}`,
    },
    {
      title: tx("관계의 보호 문장"),
      body: elementReading.relation,
    },
    {
      title: tx("일과 재물의 사용처"),
      body: elementReading.work,
    },
    {
      title: tx("오늘의 개운 의식"),
      body: elementReading.ritual,
    },
  ];

  const sevenDayMissions = [
    {
      day: "1일차",
      title: tx("새는 기운 닫기"),
      body: `${guardianSeal}은 오늘 흩어진 약속과 생각을 정리할 때 가장 먼저 힘을 냅니다. 미뤄 둔 답장, 정리하지 않은 일정, 마음에 걸리는 작은 일을 하나만 닫으세요.`,
    },
    {
      day: "2일차",
      title: tx("관계의 온도 조절"),
      body: elementReading.relation,
    },
    {
      day: "3일차",
      title: tx("일의 기준 세우기"),
      body: elementReading.work,
    },
    {
      day: "4일차",
      title: tx("그림자 관찰"),
      body: elementReading.shadow,
    },
    {
      day: "5일차",
      title: tx("수호 문장 실행"),
      body: `${guardianArchetype}은 생각을 오래 붙잡을수록 흐려집니다. 오늘은 하나의 문장을 정하고, 그 문장에 맞지 않는 선택을 줄이세요.`,
    },
    {
      day: "6일차",
      title: tx("운을 담는 그릇 정돈"),
      body: "내 공간에서 가장 자주 보는 곳 하나를 정리하세요. 명리에서 운은 기세만이 아니라 담기는 자리의 상태에도 반응합니다.",
    },
    {
      day: "7일차",
      title: tx("가디언 재확인"),
      body: `${guardianSeal}의 핵심은 나를 과하게 밀어붙이는 것이 아니라, 중요한 순간에 흔들리지 않을 기준을 남기는 데 있습니다.`,
    },
  ];

  const executionGuides = [
    {
      title: tx("오늘의 판단 우선순위"),
      body: `가장 먼저 처리할 순서는 ①미루는 답장 1건 정리, ②오후 업무의 핵심 1건 선택, ③불필요한 약속 1개 삭제입니다. ${resolvedGanji}의 ${stemPolarity}${result.dominantElement} 기운은 분산보다 정렬을 먼저 먹입니다.`,
    },
    {
      title: tx("관계 운영 문장"),
      body: `오늘 대화에서는 '지금은 잠깐 멈추고 정리한 뒤 다시 말하겠다'를 기본 문장으로 세우세요. 월지가 밀어 주는 정서 기운과 시지가 조용히 받쳐주는 질서를 함께 쓰면 오해 비용이 낮아집니다.`,
    },
    {
      title: tx("일·금전 리스크 체크"),
      body: "작은 지출 승인, 즉시 반응 메시지, 감정적 구매를 동시에 하지 마세요. 3회 확인 후 진행하면 일주가 드러내는 속도를 살려 손실 확률을 줄일 수 있습니다.",
    },
    {
      title: tx("7일 루틴 시작점"),
      body: "매일 밤 10분, 오늘의 가디언 포인트 1개를 점검해 기록하세요. 수호 메시지를 매일 반복할수록 실행 실패 비용이 빠르게 낮아집니다.",
    },
  ];

  const reportPanels = {
    seal: {
      label: tx("인장"),
      title: tx("핵심 수호 인장"),
      items: interpretationCards.slice(0, 3),
    },
    flow: {
      label: tx("흐름"),
      title: tx("관계·일·재물 운용"),
      items: [...tenGodSections, ...interpretationCards.slice(3, 8)],
    },
    ritual: {
      label: tx("의식"),
      title: tx("오늘의 개운 의식"),
      items: [interpretationCards[8]],
    },
    mission: {
      label: tx("7일"),
      title: tx("7일 가디언 미션"),
      items: sevenDayMissions.map((mission) => ({
        title: `${mission.day} · ${mission.title}`,
        body: mission.body,
      })),
    },
    guide: {
      label: tx("운용"),
      title: tx("실전 가디언 가이드"),
      items: executionGuides,
    },
  } as const;

  const activeReport = reportPanels[activePanel as keyof typeof reportPanels] || reportPanels.seal;
  const summaryMetrics = [
    { label: tx("일주"), value: resolvedGanji || tx("계산 중") },
    { label: tx("수호축"), value: `${stemPolarity}${result.dominantElement}` },
    { label: tx("인장상"), value: guardianArchetype },
    { label: tx("엠블럼"), value: guardianEmblem },
    { label: tx("월지"), value: `${monthBranch || "-"} · ${monthElement}` },
    { label: tx("시지"), value: hasBirthTime ? `${hourBranch || "-"} · ${hourElement}` : tx("시간 미입력") },
  ];
  const guardianCharms = [
    { icon: "🎀", label: tx("오늘의 색"), value: txp("{color}빛으로 {element} 기운을 부드럽게 고정하세요.", { color: result.colorKo || tx("맑은"), element: result.dominantElement }) },
    { icon: "🪄", label: tx("소환 주문"), value: guardianCopy?.title || txp("{guardian}의 중심을 조용히 세웁니다.", { guardian: guardianArchetype }) },
    { icon: "📮", label: tx("작은 실행"), value: elementReading.ritual },
    { icon: "🕯️", label: tx("시간 열쇠"), value: hasBirthTime ? hourReading : tx("생시를 추가하면 시간대별 수호 리듬이 더 선명해집니다.") },
  ];
  const guardianPromptColor = result.colorKo || tx("맑은");
  const guardianArtPrompt = [
    `귀엽고 신비로운 사주 가디언 일러스트를 그려 주세요.`,
    `주인공은 ${result.mainAnimal} 형상의 작은 수호령이며, ${guardianArchetype}의 기품을 지녔습니다.`,
    `${resolvedGanji || "일주"}의 ${stemPolarity}${result.dominantElement} 기운을 중심으로 ${guardianPromptColor}빛 아우라와 ${guardianEmblem} 문양을 은은하게 담아 주세요.`,
    `배경에는 월지 ${monthBranch || "월지"}의 흐름과 ${hasBirthTime ? `시지 ${hourBranch || "시지"}` : "부드러운 달빛 시간"}의 리듬이 둥근 소환진처럼 맴돕니다.`,
    `표정은 다정하고 영리하게, 분위기는 프리미엄 명리 부적과 동화책 삽화가 만난 느낌으로, 선은 섬세하고 색은 맑게 표현해 주세요.`,
    `글자, 로고, 워터마크, 실제 인물 얼굴, 과한 공포감은 넣지 말아 주세요.`,
  ].join("\n");
  const guardianPromptChips = [
    { label: tx("수호 동물"), value: result.mainAnimal },
    { label: tx("중심 색감"), value: guardianPromptColor },
    { label: tx("수호 문양"), value: guardianEmblem },
  ];
  const handlePromptCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(guardianArtPrompt);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = guardianArtPrompt;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setPromptCopied(true);
    window.setTimeout(() => setPromptCopied(false), 1800);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#080b14] text-slate-100" style={{ fontFamily: "var(--font-body)" }}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(244,114,182,.24),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(45,212,191,.18),transparent_28%),linear-gradient(135deg,#080b14_0%,#151022_42%,#08111f_100%)]" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
          <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-amber-200/20 bg-slate-950 shadow-2xl shadow-black/40">
            {guardianImage.status === "ready" && guardianImage.base64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${guardianImage.base64}`}
                alt={tx("사주 가디언 소환진")}
                className="absolute inset-0 h-full w-full object-cover opacity-[0.88]"
              />
            ) : (
              <GuardianSummoningCircle
                spinning={guardianImage.status === "loading"}
                message={guardianImage.status === "loading" ? tx("수호신을 소환하는 중...") : undefined}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/42 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              <p className="text-xs font-black tracking-[0.18em] text-amber-200">{tx("수호 인장")}</p>
              <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-5xl" style={{ fontFamily: "var(--font-decorative)" }}>
                {tx("사주 가디언 소환진")}
              </h1>
              <p className="mt-4 max-w-xl text-sm font-semibold leading-relaxed text-amber-50/88">
                {guardianSeal}이 명식의 중심에 섭니다. 일주가 뿌리를 세우고, 월지와 시지가 현실의 방향과 하루의 리듬을 조용히 밝혀 줍니다.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGenerateGuardianImage}
                  disabled={guardianImage.status === "loading"}
                  className="rounded-lg border border-amber-200/30 bg-amber-200/12 px-4 py-2.5 text-xs font-black text-amber-100 transition hover:bg-amber-200/18 disabled:opacity-50"
                >
                  {guardianImage.status === "loading" ? tx("소환 중...") : tx("소환진 깨우기")}
                </button>
                <button
                  type="button"
                  onClick={onReset}
                  className="rounded-lg border border-amber-200/30 bg-amber-200/12 px-4 py-2.5 text-xs font-black text-amber-100 transition hover:bg-amber-200/18"
                >
                  {tx("다시 생성하기")}
                </button>
                <a
                  href="/"
                  className="rounded-lg border border-white/12 bg-white/8 px-4 py-2.5 text-xs font-black text-slate-100 transition hover:bg-white/12"
                >
                  {tx("메인으로 돌아가기")}
                </a>
              </div>
            </div>
          </div>

          <section className="grid content-between gap-4 rounded-lg border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl" aria-label={tx("사주 가디언 핵심 지표")}>
            <div>
              <p className="text-xs font-black tracking-[0.18em] text-teal-200">{tx("나의 수호 캐릭터")}</p>
              <h2 className="mt-2 text-3xl font-black leading-tight text-white" style={{ fontFamily: "var(--font-premium)" }}>
                {guardianIdentity?.name || guardianArchetype}
              </h2>
              {guardianIdentity?.title ? (
                <p className="mt-1 text-sm font-bold text-amber-200/90">{guardianIdentity.title}</p>
              ) : null}
              <p className="mt-4 text-sm leading-relaxed text-slate-200">
                {guardianIdentity?.personality || `${guardianCopy?.short || result.headlineKo} ${elementReading.axis}`}
              </p>
              {guardianIdentity?.narrative ? (
                <p className="mt-3 text-sm leading-relaxed text-amber-50/85">{guardianIdentity.narrative}</p>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {summaryMetrics.map((item) => (
                <div key={item.label} className="rounded-lg border border-white/10 bg-slate-950/55 px-4 py-3">
                  <p className="text-[11px] font-black tracking-[0.14em] text-slate-400">{item.label}</p>
                  <p className="mt-1 text-base font-black text-amber-50">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              {GUARDIAN_FLOW_STEPS_COPY.map((item) => (
                <div key={item.step} className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[10px] font-black tracking-[0.14em] text-amber-200">{item.step}</span>
                  </div>
                  <p className="mt-2 text-xs font-black text-slate-100">{item.step === "01" ? tx("완료") : tx(item.label)}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{item.step === "01" ? tx("프리미엄 해금 완료") : tx(item.title)}</p>
                </div>
              ))}
            </div>
          </section>
        </section>

        <div className="grid gap-5 lg:grid-cols-[0.86fr_1.14fr]">
          <div className="grid gap-5">
            <GuardianSealDisplay
              guardianSeal={guardianSeal}
              guardianArchetype={guardianArchetype}
              guardianEmblem={guardianEmblem}
              dominantElement={result.dominantElement}
              monthBranch={monthBranch}
              hourBranch={hourBranch}
              hasBirthTime={hasBirthTime}
              tx={tx}
            />

            <section className="overflow-hidden rounded-lg border border-pink-200/20 bg-gradient-to-br from-pink-950/50 via-slate-950/72 to-violet-950/48 p-5 shadow-2xl shadow-pink-950/20">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black tracking-[0.16em] text-pink-200">{tx("수호상 화첩")}</p>
                  <h2 className="mt-2 text-2xl font-black text-white" style={{ fontFamily: "var(--font-playful)" }}>
                    {tx("나의 사주 가디언 그리기")}
                  </h2>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-pink-50/80">
                    {tx("명식의 색과 동물 상징을 한 장의 수호상으로 피워 올립니다.")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePromptCopy}
                  aria-describedby="guardianPromptCopyStatus"
                  className="rounded-lg border border-pink-100/30 bg-pink-100/14 px-4 py-2.5 text-xs font-black text-pink-50 transition hover:bg-pink-100/22"
                >
                  {promptCopied ? tx("그림 주문이 복사됐어요") : tx("그림 주문 복사")}
                </button>
                <span id="guardianPromptCopyStatus" role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                  {promptCopied ? tx("그림 주문이 복사됐어요") : ""}
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {guardianPromptChips.map((item) => (
                  <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2">
                    <p className="text-[10px] font-black tracking-[0.12em] text-pink-200">{item.label}</p>
                    <p className="mt-1 text-xs font-black text-white" style={{ fontFamily: "var(--font-playful)" }}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/62 p-4">
                <p className="text-[11px] font-black tracking-[0.14em] text-violet-200">{tx("그림 주문문")}</p>
                <pre className="mt-3 whitespace-pre-wrap break-keep text-xs font-semibold leading-relaxed text-slate-100" style={{ fontFamily: "var(--font-body)" }}>
                  {guardianArtPrompt}
                </pre>
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-white/[0.08] p-5 backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-amber-200/25 bg-amber-200/12 px-3 py-1 text-xs font-bold text-amber-100">
                  {guardianEmblem}
                </span>
                <span className="rounded-lg border border-teal-200/25 bg-teal-200/12 px-3 py-1 text-xs font-bold text-teal-100">
                  {elementEmoji} {txp("{element} 기운", { element: result.dominantElement })}
                </span>
                <span className="rounded-lg border border-white/10 bg-white/8 px-3 py-1 text-xs font-bold text-slate-100">
                  {txp("✦ {branch}년지", { branch: yearBranch || result.zodiac })}
                </span>
                {resolvedGanji ? (
                  <span className="rounded-lg border border-rose-200/25 bg-rose-200/12 px-3 py-1 text-xs font-bold text-rose-100">
                    {txp("{ganji}일주 · {label}", { ganji: resolvedGanji, label: stemTheme?.label || "" })}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 rounded-lg border border-amber-200/20 bg-slate-950/50 p-4">
                <p className="text-xs font-black tracking-[0.14em] text-amber-200">{tx("가디언 인장")}</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-100">{guardianSeal}</p>
              </div>

              <div className="mt-4 grid gap-3">
                {guardianCharms.map((item) => (
                  <div key={item.label} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.06] p-3">
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <p className="text-xs font-black text-slate-100">{item.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="grid gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black tracking-[0.18em] text-rose-200">{tx("가디언 리포트")}</p>
                <h2 className="mt-2 text-3xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
                  {activeReport.title}
                </h2>
              </div>
              <div className="grid grid-cols-5 rounded-lg border border-white/10 bg-slate-950/60 p-1">
                {Object.entries(reportPanels).map(([key, panel]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActivePanel(key)}
                    className={`min-h-10 rounded-md px-3 text-xs font-black transition ${
                      activePanel === key ? "bg-amber-200 text-slate-950" : "text-slate-300 hover:bg-white/10"
                    }`}
                    aria-pressed={activePanel === key}
                  >
                    {panel.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.08] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-6">
              <div className="grid gap-3">
                {activeReport.items.map((item) => (
                  <article key={item.title} className="rounded-lg border border-white/10 bg-slate-950/52 p-4">
                    <h3 className="text-sm font-black text-amber-100">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.body}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-rose-200/20 bg-gradient-to-r from-rose-950/55 via-slate-950/65 to-amber-950/45 p-5">
              <p className="text-xs font-black tracking-[0.14em] text-rose-200">{tx("현재 가디언 메시지")}</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-100">
                {guardianCopy?.subtitle || txp("{guardian}의 에너지를 실전 루틴에 연결해 보세요.", { guardian: guardianArchetype })} {tx("오늘은 운을 크게 바꾸려 하기보다, 새는 기운 하나를 막고 지켜야 할 기준 하나를 선명히 세우는 날입니다.")}
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

/* ─────────────────────── 메인 페이지 ───────────────────────── */
export default function SajuGuardianPage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthHour, setBirthHour] = useState("");
  const [apiData, setApiData] = useState<ApiResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const { seed: profileSeed, seedVersion, reload: reloadProfileSeed } = useAiProfileSeed();
  const birthTouchedRef = useRef(false);

  const isFormValid = birthYear && birthMonth && birthDay;
  const tx = useCallback((value: string) => translateSajuGuardianText(value, locale), [locale]);

  const applyProfileSeed = useCallback((seed: AiPrefillSeed | null) => {
    const fields = seedToGuardianBirthFields(seed);
    if (!fields) return false;
    setBirthYear(fields.year);
    setBirthMonth(fields.month);
    setBirthDay(fields.day);
    if (fields.hour) setBirthHour(fields.hour);
    return true;
  }, []);

  // 서버에서 프로필 카드가 뒤늦게 도착해도, 사용자가 직접 고르기 전이라면 폼에 반영
  useEffect(() => {
    if (!profileSeed || birthTouchedRef.current) return;
    applyProfileSeed(profileSeed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedVersion]);

  const loadFromProfileCard = useCallback(() => {
    void reloadProfileSeed().then((seed) => {
      if (applyProfileSeed(seed)) {
        showToast(tx("프로필 카드의 출생 정보를 불러왔어요."), "success");
      } else {
        showToast(tx("프로필 카드에 저장된 출생 정보가 없어요."), "error");
      }
    });
  }, [applyProfileSeed, reloadProfileSeed, tx]);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    verifyGuardianUnlockAccess().then((allowed) => {
      if (!alive) return;
      if (allowed) {
        const handoffData = readGuardianHandoffData();
        if (handoffData) {
          setApiData(handoffData);
          setPhase("result");
          return;
        }
      }
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
      const { calculateLocalSaju } = await import("@/app/saju/animal-destiny/engine/localSajuCalculator");
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
        setErrorMsg(tx("일주 계산에 실패했어요. 입력값을 다시 확인해 주세요."));
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
      setErrorMsg(tx("로컬 계산에 실패했어요. 입력값을 다시 확인해 주세요."));
      setPhase("error");
    }
  }, [birthYear, birthMonth, birthDay, birthHour, isFormValid, tx]);

  const handleReset = useCallback(() => {
    setApiData(null);
    setErrorMsg("");
    verifyGuardianUnlockAccess().then((allowed) => {
      setPhase(allowed ? "intro" : "locked");
    });
  }, []);

  if (phase === "checking") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fff7ed] via-[#fff1f2] to-[#eef2ff] px-5 py-8">
        <div className="mx-auto flex min-h-[76vh] w-full max-w-md flex-col items-center justify-center text-center">
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-7 shadow-xl backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-3xl shadow-inner">🔮</div>
            <p className="mt-5 text-xs font-black tracking-[0.16em] text-rose-400">{tx("해금 확인")}</p>
            <h1 className="mt-2 text-2xl font-black text-slate-800">{SAJU_GUARDIAN_ACCESS_CHECKING_MESSAGE}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              {SAJU_GUARDIAN_ACCESS_CHECKING_MESSAGE}
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
              <p className="text-xs font-black tracking-[0.16em] text-rose-500">{tx("프리미엄 수호 인장")}</p>
              <h1 className="mt-2 text-3xl font-black leading-tight text-slate-800">{tx("사주 가디언 소환진")}</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {tx("일주·월지·시지·오행 상징을 함께 읽어 지금 삶을 지키는 수호 인장과 7일 실행 의식을 여는 프리미엄 명리 리딩입니다.")}
              </p>
              <div className="mt-5 grid grid-cols-4 gap-2">
                {["일주", "월지", "시지", "오행"].map((label) => (
                  <div key={label} className="rounded-2xl border border-rose-100 bg-rose-50/70 px-3 py-3 text-center">
                    <p className="text-[11px] font-black tracking-[0.12em] text-rose-400">{tx("인장")}</p>
                    <p className="mt-1 text-sm font-black text-slate-700">{tx(label)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-2">
                {GUARDIAN_PREMIUM_POINTS_COPY.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2.5">
                    <span className="text-xs font-black text-slate-500">{tx(item.label)}</span>
                    <span className="text-xs font-black text-rose-500">{tx(item.value)}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="space-y-3">
              {[
                { title: tx("명리 근거"), body: tx("일간·일지·월지·시지가 겹치는 자리에서 수호 인장의 모양이 또렷하게 열립니다.") },
                { title: tx("수호력과 그림자"), body: tx("타고난 힘만 말하지 않고, 운을 새게 만드는 습관과 지켜야 할 기준을 함께 짚습니다.") },
                { title: tx("실전 운용"), body: tx("관계, 일, 재물, 오늘의 개운 의식, 7일 미션까지 바로 쓸 수 있는 문장으로 맺힙니다.") },
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
              {GUARDIAN_FLOW_STEPS_COPY.map((item) => (
                <div key={item.step} className="rounded-2xl border border-rose-100 bg-rose-50/60 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[10px] font-black tracking-[0.14em] text-rose-400">{item.step}</span>
                  </div>
                  <p className="mt-2 text-xs font-black text-slate-700">{tx(item.label)}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{tx(item.title)}</p>
                </div>
              ))}
            </div>
            <a
              href="/index.html?action=openSajuGuardianPage"
              className="mt-5 inline-flex w-full items-center justify-center rounded-3xl bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 px-5 py-4 text-sm font-black text-white shadow-xl shadow-pink-200/60 transition-transform active:scale-[0.98]"
            >
              {tx("🔒 10,000원으로 영구 해금하기")}
            </a>
            <a
              href="/"
              className="mt-3 inline-flex w-full items-center justify-center rounded-3xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600"
            >
              {tx("메인으로 돌아가기")}
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ── 결과 화면 ── */
  if (phase === "result" && apiData) {
    return (
      <ResultCard
        data={apiData}
        onReset={handleReset}
        tx={tx}
        birthYear={birthYear}
        birthMonth={birthMonth}
        birthDay={birthDay}
        birthHour={birthHour}
      />
    );
  }

  /* ── 에러 화면 ── */
  if (phase === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100 flex items-center justify-center px-6">
        <div className="text-center max-w-sm space-y-5">
          <div className="text-6xl">😢</div>
          <div className="bg-white/80 rounded-3xl p-6 shadow-lg space-y-3">
            <p className="text-slate-700 font-semibold leading-relaxed">
              {tx("가디언 인장을 여는 데 실패했어요.")}<br />{tx("입력값을 확인한 뒤 다시 소환해 주세요.")}
            </p>
            {errorMsg && <p className="text-xs text-slate-400">{errorMsg}</p>}
          </div>
          <button
            onClick={handleReset}
            className="w-full bg-gradient-to-r from-pink-400 to-rose-500 text-white font-bold rounded-2xl py-3.5 shadow-lg shadow-rose-200/60 active:scale-95 transition-all"
          >
            {tx("🔄 다시 시도하기")}
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
        <LoadingScreen tx={tx} />
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
            aria-label={tx("메인으로 돌아가기")}
          >
            <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <span className="text-sm font-black tracking-[0.12em] text-slate-500">{tx("수호 인장")}</span>
        </div>

        <div className="max-w-md mx-auto px-4 pb-12 space-y-6">
          <div className="relative w-full aspect-square max-w-sm mx-auto mt-6 rounded-3xl overflow-hidden shadow-2xl shadow-pink-200/60 border-4 border-white/80 bg-gradient-to-br from-pink-50 via-rose-50 to-violet-100">
            <GuardianSummoningCircle />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-center">
              <span className="inline-block bg-white/90 backdrop-blur-sm text-slate-800 font-bold text-sm rounded-full px-4 py-1.5 shadow-sm">
                {tx("🔒 10,000원 영구 해금 · 60갑자 수호 인장")}
              </span>
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-500 via-rose-400 to-purple-500 leading-tight">
              {tx("사주 가디언 소환진")} 🌙
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              <span className="font-semibold text-pink-500">{tx("일주·월지·시지·오행")}</span>{tx("의 결을 맞춰")}<br />
              {tx("당신에게 필요한 수호 인장과 7일 의식을 엽니다.")}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
              {GUARDIAN_FLOW_STEPS_COPY.map((item) => (
              <div key={item.step} className="rounded-2xl border border-white/70 bg-white/70 px-2 py-3 text-center shadow-sm">
                <span className="block text-lg">{item.icon}</span>
                <span className="mt-1 block text-[10px] font-black tracking-[0.12em] text-pink-400">{tx(item.label)}</span>
                <span className="mt-0.5 block text-[10px] font-semibold leading-tight text-slate-500">{tx(item.title)}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-2">
            {[
              { element: "목", emoji: "🌿", color: "from-emerald-100 to-green-100", text: tx("성장") },
              { element: "화", emoji: "🔥", color: "from-rose-100 to-pink-100", text: tx("발화") },
              { element: "토", emoji: "🌙", color: "from-amber-100 to-yellow-100", text: tx("중심") },
              { element: "금", emoji: "✨", color: "from-slate-100 to-gray-100", text: tx("절제") },
              { element: "수", emoji: "💧", color: "from-sky-100 to-blue-100", text: tx("흐름") },
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
              { icon: "🔮", text: tx("일주 천간·지지로 나의 중심 기운 판독") },
              { icon: "🧭", text: tx("월지와 시지로 현실 배경과 행동 리듬 보강") },
              { icon: "💌", text: tx("관계·일·재물·오늘의 개운 의식까지 정리") },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl shrink-0">{item.icon}</span>
                <span className="text-sm text-slate-600 font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          <section className="bg-white/70 backdrop-blur-sm rounded-3xl p-5 border border-white/60 shadow-md space-y-3" aria-label={tx("사주 가디언 소환진 구성")}>
            <h2 className="text-sm font-black text-slate-700 tracking-wide">{tx("10,000원 수호 인장 구성")}</h2>
            {SAJU_GUARDIAN_VALUE_SECTIONS_COPY.map((section) => (
              <article key={section.title} className="rounded-2xl border border-pink-100 bg-white/70 p-3.5">
                <h3 className="text-sm font-bold text-pink-600 leading-relaxed">{tx(section.title)}</h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{tx(section.body)}</p>
              </article>
            ))}
          </section>

          <button
            onClick={() => setPhase("form")}
            className="w-full bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 hover:from-pink-500 hover:via-rose-500 hover:to-purple-500 text-white font-black text-lg rounded-3xl py-5 shadow-xl shadow-pink-200/60 transition-all active:scale-[0.98]"
          >
            {tx("🔮 출생 좌표 입력하고 인장 열기")}
          </button>

          <p className="text-center text-xs text-slate-400">
            {tx("생년월일 필수 · 태어난 시간은 선택 입력")}
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
          aria-label={tx("이전 화면")}
        >
          <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-black tracking-[0.12em] text-slate-500">{tx("출생 좌표")}</span>
      </div>

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-1.5">
          <p className="text-xs font-black tracking-[0.16em] text-rose-400">{tx("명리 좌표")}</p>
          <h2 className="text-2xl font-black text-slate-800">{tx("가디언을 여는 출생 좌표")}</h2>
          <p className="text-sm leading-relaxed text-slate-500">
            {tx("생년월일로 일주와 월지를 세우고, 선택 입력한 시간으로 시지의 보조 리듬까지 정렬합니다.")}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {GUARDIAN_FLOW_STEPS_COPY.slice(1).map((item) => (
            <div key={item.step} className="rounded-2xl border border-white/70 bg-white/70 px-3 py-3 text-center shadow-sm">
              <span className="block text-lg">{item.icon}</span>
              <span className="mt-1 block text-[10px] font-black tracking-[0.12em] text-rose-400">{tx(item.label)}</span>
              <span className="mt-0.5 block text-[11px] font-bold leading-tight text-slate-600">{tx(item.title)}</span>
            </div>
          ))}
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/60 shadow-xl shadow-pink-100/50 space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={loadFromProfileCard}
              aria-label={tx("프로필 카드에서 출생 정보 불러오기")}
              className="rounded-full border border-pink-200 bg-pink-50/80 px-3.5 py-1.5 text-xs font-bold text-pink-500 transition-colors hover:bg-pink-100"
            >
              {tx("프로필 카드에서 불러오기")}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <TextField
              label={tx("태어난 년도")}
              value={birthYear}
              onChange={(value) => {
                birthTouchedRef.current = true;
                setBirthYear(value);
              }}
              placeholder={tx("년도")}
              maxLength={4}
            />
            <TextField
              label={tx("월")}
              value={birthMonth}
              onChange={(value) => {
                birthTouchedRef.current = true;
                setBirthMonth(value);
              }}
              placeholder={tx("월")}
            />
            <TextField
              label={tx("일")}
              value={birthDay}
              onChange={(value) => {
                birthTouchedRef.current = true;
                setBirthDay(value);
              }}
              placeholder={tx("일")}
            />
          </div>

          <TextField
            label={tx("태어난 시간 (선택)")}
            value={birthHour}
            onChange={(value) => {
              birthTouchedRef.current = true;
              setBirthHour(value);
            }}
            placeholder={tx("시")}
          />

          <div className="bg-pink-50/80 rounded-2xl px-4 py-3 flex items-start gap-2.5">
            <span className="text-pink-400 text-lg shrink-0">💡</span>
            <p className="text-xs text-slate-500 leading-relaxed">
              {tx("태어난 ")}<span className="font-semibold text-pink-500">{tx("년·월·일")}</span>{tx("은 필수예요.")}
              {tx("시간을 모르면 일주·월지 중심으로 읽고, 시간을 입력하면 시지의 보조 수호 리듬까지 열립니다.")}
            </p>
          </div>
        </div>

        {isFormValid && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl py-4 px-5 border border-pink-100 shadow-sm animate-fade-in-up">
            <p className="text-center text-sm font-semibold text-slate-600">
              {tx("출생 좌표가 맞춰졌어요. 이제 가디언 인장과 7일 미션을 열 수 있습니다.")}
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
          {isFormValid ? tx("🔮 수호 인장 열기") : tx("년·월·일을 입력해 주세요")}
        </button>

        <p className="text-center text-xs text-slate-400">
          {tx("입력된 생년월일은 운세 분석에만 사용되며 저장되지 않아요")}
        </p>
      </div>
    </div>
  );
}

/* 관리자 CMS 기본값 노출용. */
export const __cmsGuardianDefaults = {
  element: ELEMENT_GUARDIAN_READING_DEFAULT as Record<string, unknown>,
  monthBranch: MONTH_BRANCH_READING_DEFAULT as Record<string, unknown>,
  hourBranch: HOUR_BRANCH_READING_DEFAULT as Record<string, unknown>,
};
