"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import MainHeroFortuneForm from "./MainHeroFortuneForm";
import QuickServiceShortcuts from "./QuickServiceShortcuts";
import PersonalizedServiceRecommendations from "./PersonalizedServiceRecommendations";
import ServiceCollectionSection from "./ServiceCollectionSection";
import type { ServiceCardModel } from "./ServiceCard";
import GlobalPricingCard from "./GlobalPricingCard";
import GlobalTrustSection from "./GlobalTrustSection";

// AUXILIARY LANDING (React Home): 메인 서비스 기준 화면은 public/static/index.html 의 inputPage.

type FormState = {
  name: string;
  birthDate: string;
  calType: "solar" | "lunar" | "lunar_leap";
  birthHour: string;
  birthMinute: string;
  birthCountry: string;
  gender: "F" | "M";
  agreed: boolean;
};

const tarotItems: ServiceCardModel[] = [
  { title: "우리는 무슨 사이?", description: "관계 6카드 심층 리딩", href: "/tarot/love", emoji: "💕", badges: [{ text: "50코인", tone: "coin" }, { text: "NEW", tone: "new" }] },
  { title: "회복 타로", description: "감정 회복 4카드 스프레드", href: "/tarot/healing", emoji: "☀️", badges: [{ text: "무료", tone: "free" }] },
  { title: "자존감 레벨업", description: "자기신뢰 강화 퀘스트", href: "/tarot/self-esteem", emoji: "✨", badges: [{ text: "무료", tone: "free" }] },
  { title: "재회운 타로", description: "관계 흐름 재접속 리딩", href: "/tarot/reunion", emoji: "🌊", badges: [{ text: "50코인", tone: "coin" }] },
  { title: "십이지신 천운", description: "12개월 연간 운세", href: "/tarot/year", emoji: "🐲", badges: [{ text: "30코인", tone: "coin" }] },
  { title: "명리학 타로", description: "78장 덱 기반 리딩", href: "/tarot", emoji: "🔮", badges: [{ text: "무료", tone: "free" }] },
];

const oracleItems: ServiceCardModel[] = [
  { title: "화투 인생패", description: "12달 흐름 점술", href: "/oracle/hwatu-life", emoji: "🎴", badges: [{ text: "무료", tone: "free" }] },
  { title: "영국 홍차점", description: "타세오그래피 찻잎 리딩", href: "/oracle/royal-tea", emoji: "🫖", badges: [{ text: "30코인", tone: "coin" }] },
  { title: "핀란드 주석점", description: "상징 해석 신탁", href: "/oracle/sikojen-povailu", emoji: "🐷", badges: [{ text: "무료", tone: "free" }, { text: "NEW", tone: "new" }] },
  { title: "지오맨시 흙점", description: "대지 징후 16행 점술", href: "/geomancy-oracle-v4.html", emoji: "⟁", badges: [{ text: "50코인", tone: "coin" }] },
  { title: "데스티니 포커", description: "카드 상징 운세 판독", href: "/destiny-poker.html", emoji: "🃏", badges: [{ text: "무료", tone: "free" }] },
  { title: "주역 거북점", description: "64괘 기반 지혜 리딩", href: "/ifa_oracle_v2_full_local.html", emoji: "☯", badges: [{ text: "30코인", tone: "coin" }] },
];

const cosmicItems: ServiceCardModel[] = [
  { title: "점성술 코즈믹", description: "태양·달·상승궁 분석", href: "/astrology/cosmic", emoji: "🌌", badges: [{ text: "기본 무료", tone: "free" }] },
  { title: "자미두수 명반", description: "12궁 기반 운명 지도", href: "/ziwei/chart", emoji: "✨", badges: [{ text: "기본 무료", tone: "free" }, { text: "궁합 50", tone: "coin" }] },
  { title: "베다 점성술", description: "나크샤트라·다샤 리딩", href: "/saju/basic/play", emoji: "🪐", badges: [{ text: "기본 무료", tone: "free" }] },
  { title: "올림푸스 신탁", description: "신화 별자리 상징 해석", href: "/olympus", emoji: "⚡", badges: [{ text: "해금 100", tone: "coin" }, { text: "NEW", tone: "new" }] },
  { title: "명리학 인사이트", description: "해석 가이드 콘텐츠", href: "/insights", emoji: "📚", badges: [{ text: "가이드", tone: "soft" }] },
  { title: "하이밸류 아카이브", description: "심층 운세 콘텐츠 모음", href: "/high-value", emoji: "🧭", badges: [{ text: "읽기", tone: "soft" }] },
];

const animalItems: ServiceCardModel[] = [
  { title: "AI 동물 관상", description: "얼굴형 기반 성향 분석", href: "/saju-picture", emoji: "🎭", badges: [{ text: "무료", tone: "free" }] },
  { title: "MBTI 동물 궁합", description: "16타입 관계 에너지", href: "/static/index.html?action=openMbtiModal", emoji: "🦁", badges: [{ text: "무료", tone: "free" }] },
  { title: "애니멀 토템", description: "수호 동물 메시지 리딩", href: "/static/index.html?action=openAnimalTotemModal", emoji: "🐯", badges: [{ text: "무료", tone: "free" }] },
  { title: "운명의 알", description: "운세 다마고치 체험", href: "/tadagochi", emoji: "🥚", badges: [{ text: "무료", tone: "free" }, { text: "NEW", tone: "new" }] },
  { title: "포춘텔러 물고기", description: "상징 움직임 운세 리딩", href: "/fortune-teller-fish.html", emoji: "🐟", badges: [{ text: "무료", tone: "free" }] },
  { title: "사주 가디언 아트", description: "수호 동물 아트 생성", href: "/saju-picture", emoji: "🐲", badges: [{ text: "무료", tone: "free" }] },
];

const meditationItems: ServiceCardModel[] = [
  { title: "네빌 명상", description: "상상 창조 집중 루틴", href: "/neville-meditation.html", emoji: "🧘", badges: [{ text: "30~50코인", tone: "coin" }] },
  { title: "Divya Yoga", description: "요가 기반 집중 리셋", href: "/yoga-guru.html", emoji: "🧘‍♀️", badges: [{ text: "30~50코인", tone: "coin" }] },
  { title: "코즈믹 소울 명상", description: "R=VD 현실화 프로토콜", href: "/cosmic-soul-meditation.html", emoji: "🌠", badges: [{ text: "50~100코인", tone: "coin" }] },
  { title: "드림 타로", description: "꿈 해석 리포트", href: "/static/index.html?action=openDreamModal", emoji: "🌙", badges: [{ text: "무료", tone: "free" }, { text: "NEW", tone: "new" }] },
  { title: "정신분석 해몽", description: "Freud 관점 심층 해석", href: "/static/index.html?action=openPsychoDreamModal", emoji: "🕯️", badges: [{ text: "무료", tone: "free" }] },
  { title: "힐링 타로 시작", description: "즉시 감정 안정 리딩", href: "/tarot/healing", emoji: "💛", badges: [{ text: "무료", tone: "free" }] },
];

const premiumItems: ServiceCardModel[] = [
  { title: "자미두수 프리미엄 PDF", description: "13챕터 심층 리포트", href: "/static/index.html?action=gotoZiweiPremium", emoji: "♛", badges: [{ text: "590코인", tone: "coin" }] },
  { title: "서양 점성술 PDF", description: "하우스·트랜짓 종합", href: "/static/index.html?action=gotoAstrologyPremium", emoji: "🌟", badges: [{ text: "390코인", tone: "coin" }] },
  { title: "숙요점 프리미엄 PDF", description: "27수 관계/카르마 분석", href: "/static/index.html?action=gotoSukuyoPremium", emoji: "💫", badges: [{ text: "390코인", tone: "coin" }] },
  { title: "베다 프리미엄 PDF", description: "다샤·카르마 로드맵", href: "/static/index.html?action=gotoVedicPremium", emoji: "🪷", badges: [{ text: "390코인", tone: "coin" }] },
  { title: "명운 프리미엄 작명", description: "오행·수리 기반 작명", href: "/myungwun_final.html", emoji: "🖋️", badges: [{ text: "700코인", tone: "coin" }] },
  { title: "포인트/코인 센터", description: "충전 및 사용 내역 관리", href: "/points", emoji: "💳", badges: [{ text: "관리", tone: "soft" }] },
];

export default function MainLandingPage() {
  const [profile, setProfile] = useState<FormState | null>(null);

  const recommendations = useMemo<ServiceCardModel[]>(() => {
    if (!profile) return [];
    const base = profile.calType === "solar" ? tarotItems : cosmicItems;
    const genderBoost = profile.gender === "F" ? tarotItems : oracleItems;
    return [...base.slice(0, 2), ...genderBoost.slice(0, 1), premiumItems[5]];
  }, [profile]);

  return (
    <main className="cd-home-root">
      <section className="cd-main-shell !pb-4 !pt-8 md:!pt-10">
        <div className="rounded-[26px] border border-violet-300/35 bg-[linear-gradient(145deg,rgba(30,18,66,0.96),rgba(40,24,85,0.9))] px-4 py-8 text-center shadow-[0_24px_60px_rgba(25,16,52,0.42)] md:px-8 md:py-10">
          <div className="mx-auto mb-3 h-[94px] w-[94px] overflow-hidden rounded-full border-2 border-amber-200/60 shadow-[0_12px_28px_rgba(20,11,45,0.6)] md:h-[120px] md:w-[120px]">
            <img
              src="/icons/honeypig-130.webp"
              alt="꿀꿀 연이 로고"
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
            />
          </div>
          <h1 className="text-[clamp(1.45rem,3.2vw,2.5rem)] font-black tracking-[-0.02em] text-violet-50">
            생년월일 하나로, 나의 운명 지도를 펼쳐보세요
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-violet-100/85 md:text-[15px]">
            사주팔자, 타로, 점성술, 자미두수를 하나의 흐름으로 연결한 메인 운세 화면입니다.
            먼저 입력을 시작하고, 아래 추천 컬렉션에서 오늘의 리딩을 이어서 탐색해보세요.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              href="/signup"
              className="inline-flex items-center rounded-full border border-violet-200/40 bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(89,53,188,0.38)] transition hover:brightness-110"
            >
              ✨ 회원가입
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-full border border-amber-200/45 bg-[rgba(17,20,44,0.7)] px-5 py-2.5 text-sm font-bold text-amber-100 transition hover:bg-[rgba(36,38,78,0.78)]"
            >
              🔐 로그인
            </Link>
            <a
              href="#fortuneForm"
              className="inline-flex items-center rounded-full border border-violet-200/30 bg-[rgba(78,56,134,0.25)] px-4 py-2.5 text-sm font-semibold text-violet-100 transition hover:bg-[rgba(98,72,160,0.35)]"
            >
              입력 폼으로 이동
            </a>
          </div>
        </div>
      </section>

      <section id="fortuneForm" className="cd-main-shell !py-4 md:!py-5">
        <MainHeroFortuneForm onProfileReady={setProfile} />
      </section>

      <section className="cd-main-shell !py-4 md:!py-5">
        <QuickServiceShortcuts />
      </section>

      <section className="cd-main-shell !py-4 md:!py-5">
        <PersonalizedServiceRecommendations profile={profile} recommendations={recommendations} />
      </section>

      <section className="cd-main-shell space-y-4 !pb-8 !pt-4">
        <ServiceCollectionSection
          title="나에게 맞는 추천 운세"
          subtitle="입력 정보를 기준으로 우선순위가 높은 리딩"
          description="첫 진입에 적합한 서비스부터 시작해 오늘의 운세 흐름을 빠르게 확인하세요."
          icon="🧭"
          defaultOpen
          items={recommendations.length ? recommendations : [...tarotItems.slice(0, 3), ...cosmicItems.slice(0, 2), premiumItems[5]]}
        />

        <ServiceCollectionSection
          title="타로 리딩 컬렉션"
          subtitle="관계, 회복, 자존감, 재회, 연간운 타로"
          description="질문 주제에 맞는 스프레드를 선택해 즉시 리딩을 시작할 수 있습니다."
          icon="🔮"
          items={tarotItems}
        />

        <ServiceCollectionSection
          title="신탁 & 점술 컬렉션"
          subtitle="동서양 상징 기반 점술 리딩"
          description="화투, 찻잎, 주석, 지오맨시 등 상징 해석 중심의 점술 컬렉션입니다."
          icon="🃏"
          items={oracleItems}
        />

        <ServiceCollectionSection
          title="코즈믹 & 별자리 컬렉션"
          subtitle="별자리·자미두수·베다 기반 우주형 리딩"
          description="행성과 궁성 데이터를 통해 성향과 타이밍을 입체적으로 읽어냅니다."
          icon="🌌"
          items={cosmicItems}
        />

        <ServiceCollectionSection
          title="동물 & 관상 컬렉션"
          subtitle="본능 캐릭터와 관계 에너지 분석"
          description="동물 관상, 토템, 가디언 아트 등 직관형 체험 서비스를 모았습니다."
          icon="🦁"
          items={animalItems}
        />

        <ServiceCollectionSection
          title="명상 컬렉션"
          subtitle="내면 안정과 집중 회복을 위한 루틴"
          description="명상과 꿈 해석을 결합해 감정 흐름을 정리하고 실행력을 높입니다."
          icon="🧘"
          items={meditationItems}
        />

        <ServiceCollectionSection
          title="프리미엄/코인 서비스 안내"
          subtitle="소개 보기부터 PDF 생성까지 이어지는 VVIP 리포트"
          description="프리미엄 분석은 코인 기반으로 제공되며 결과 리포트는 PDF로 보관할 수 있습니다."
          icon="♛"
          items={premiumItems}
        />
      </section>

      <section className="cd-main-shell !pb-10 !pt-2">
        <div className="cd-card mb-4">
          <h2 className="cd-main-title" style={{ fontSize: "clamp(1.2rem, 2.2vw, 1.7rem)" }}>
            Premium / Coin Information
          </h2>
          <p className="cd-main-intro" style={{ marginTop: "8px", marginBottom: 0 }}>
            하단에서 가격, 결제, 신뢰 정보를 한 번에 확인하고 필요할 때만 프리미엄 리포트를 시작할 수 있습니다.
          </p>
        </div>
        <GlobalPricingCard locale="ko" />
        <GlobalTrustSection compact showFooter={false} locale="ko" />
      </section>
    </main>
  );
}
