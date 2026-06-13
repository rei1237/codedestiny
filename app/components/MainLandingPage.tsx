"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import MainHeroFortuneForm from "./MainHeroFortuneForm";
import QuickServiceShortcuts from "./QuickServiceShortcuts";
import DestinyIcon from "./icons/DestinyIcon";
import type { ServiceCardModel } from "./ServiceCard";

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

const oracleItems: ServiceCardModel[] = [
  { title: "화투 인생패", description: "12달 흐름 점술", href: "/oracle/hwatu-life", emoji: "🎴", badges: [{ text: "무료", tone: "free" }] },
  { title: "영국 홍차점", description: "타세오그래피 찻잎 리딩", href: "/oracle/royal-tea", emoji: "🫖", badges: [{ text: "30코인", tone: "coin" }] },
  { title: "핀란드 주석점", description: "상징 해석 신탁", href: "/oracle/sikojen-povailu", emoji: "🐷", badges: [{ text: "무료", tone: "free" }, { text: "NEW", tone: "new" }] },
  { title: "스톤헨지 룬", description: "고대 북유럽 룬 신탁", href: "/oracle/rune", emoji: "ᚱ", badges: [{ text: "30~120코인", tone: "coin" }, { text: "NEW", tone: "new" }] },
  { title: "지오맨시 흙점", description: "대지 징후 16행 점술", href: "/geomancy-oracle-v4.html", emoji: "⟁", badges: [{ text: "50코인", tone: "coin" }] },
  { title: "데스티니 포커", description: "카드 상징 운세 판독", href: "/destiny-poker.html", emoji: "🃏", badges: [{ text: "무료", tone: "free" }] },
  { title: "이파 오라클 (IFÀ)", description: "요루바 256 오두 신탁", href: "/oracle/ifa", emoji: "🪬", badges: [{ text: "30코인", tone: "coin" }] },
];

const cosmicItems: ServiceCardModel[] = [
  { title: "점성술 코즈믹", description: "태양·달·상승궁 분석", href: "/astrology/cosmic", emoji: "🌌", badges: [{ text: "기본 무료", tone: "free" }] },
  { title: "기본 숙요점", description: "27수 궁합과 달의 리듬", href: "/oracle/sukuyo", emoji: "💫", badges: [{ text: "무료", tone: "free" }] },
  { title: "자미두수 명반", description: "12궁 기반 운명 지도", href: "/ziwei/chart", emoji: "✨", badges: [{ text: "기본 무료", tone: "free" }, { text: "궁합 50", tone: "coin" }] },
  { title: "베다 점성술", description: "나크샤트라·다샤 리딩", href: "/saju/basic/play", emoji: "🪐", badges: [{ text: "기본 무료", tone: "free" }] },
  { title: "올림푸스 신탁", description: "신화 별자리 상징 해석", href: "/olympus", emoji: "⚡", badges: [{ text: "해금 100", tone: "coin" }, { text: "NEW", tone: "new" }] },
  { title: "명리학 인사이트", description: "해석 가이드 콘텐츠", href: "/insights", emoji: "📚", badges: [{ text: "가이드", tone: "soft" }] },
  { title: "하이밸류 아카이브", description: "심층 운세 콘텐츠 모음", href: "/high-value", emoji: "🧭", badges: [{ text: "읽기", tone: "soft" }] },
];

const animalItems: ServiceCardModel[] = [
  { title: "AI 동물 관상", description: "얼굴형 기반 성향 분석", href: "/saju-picture", emoji: "🎭", badges: [{ text: "무료", tone: "free" }] },
  { title: "MBTI 동물 궁합", description: "16타입 관계 에너지", href: "/animal/mbti", emoji: "🦁", badges: [{ text: "무료", tone: "free" }] },
  { title: "애니멀 토템", description: "수호 동물 메시지 리딩", href: "/?action=openAnimalTotemModal", emoji: "🐯", badges: [{ text: "30~60코인", tone: "coin" }] },
  { title: "운명의 알", description: "운세 다마고치 체험", href: "/tadagochi", emoji: "🥚", badges: [{ text: "무료", tone: "free" }, { text: "NEW", tone: "new" }] },
  { title: "포춘텔러 물고기", description: "상징 움직임 운세 리딩", href: "/fortune-teller-fish.html", emoji: "🐟", badges: [{ text: "무료", tone: "free" }] },
  { title: "사주 가디언 아트", description: "수호 동물 아트 생성", href: "/saju-picture", emoji: "🐲", badges: [{ text: "무료", tone: "free" }] },
];

const meditationItems: ServiceCardModel[] = [
  { title: "네빌 명상", description: "상상 창조 집중 루틴", href: "/neville-meditation.html", emoji: "🧘", badges: [{ text: "30~50코인", tone: "coin" }] },
  { title: "Divya Yoga", description: "요가 기반 집중 리셋", href: "/yoga-guru.html", emoji: "🧘‍♀️", badges: [{ text: "30~50코인", tone: "coin" }] },
  { title: "코즈믹 소울 명상", description: "R=VD 현실화 프로토콜", href: "/cosmic-soul-meditation.html", emoji: "🌠", badges: [{ text: "50~100코인", tone: "coin" }] },
  { title: "드림 타로", description: "꿈의 잔향 3카드", href: "/dream/tarot", emoji: "🌙", badges: [{ text: "무료", tone: "free" }, { text: "NEW", tone: "new" }] },
  { title: "정신분석 해몽", description: "Freud 관점 심층 해석", href: "/dream/psycho", emoji: "🕯️", badges: [{ text: "무료", tone: "free" }] },
  { title: "심리테스트 허브", description: "성격·연애·직장 14종 모음", href: "/psychotest", emoji: "🧩", badges: [{ text: "무료", tone: "free" }, { text: "추천", tone: "soft" }] },
  { title: "힐링 타로 시작", description: "감정 온도 회복 리딩", href: "/tarot/healing", emoji: "💛", badges: [{ text: "무료", tone: "free" }] },
];

const miscDivinationItems: ServiceCardModel[] = [
  {
    title: "심리테스트 허브",
    description: "성격 유형, 관계 심리, 감정 패턴까지 14종 테스트를 한 번에 탐색",
    href: "/psychotest",
    emoji: "🧠",
    image: "/fuctionassets/%EC%8B%AC%EB%A6%AC%ED%85%8C%EC%8A%A4%ED%8A%B8.webp",
    badges: [{ text: "무료", tone: "free" }, { text: "추천", tone: "soft" }],
    cta: "심리테스트 열기",
  },
  {
    title: "AI 이모이 오미쿠지",
    description: "오늘의 기분과 고민을 바탕으로 행운 흐름과 행동 힌트를 확인",
    href: "/emoi_omikuji_v2.html",
    emoji: "🤖",
    image: "/fuctionassets/오미쿠지.webp",
    badges: [{ text: "무료", tone: "free" }, { text: "AI", tone: "soft" }],
    cta: "오미쿠지 보기",
  },
  {
    title: "연이의 마음 별자리",
    description: "별빛 흐름과 오늘 마음을 포개어, 연이가 다정한 위로 문장과 감성 카드를 건네줘요",
    href: "/yeon-star-hug",
    emoji: "🐷",
    image: "/fuctionassets/%EC%97%B0%EC%9D%B4%EC%9D%98%20%EB%A7%88%EC%9D%8C%20%EB%B3%84%EC%9E%90%EB%A6%AC.webp",
    badges: [{ text: "무료", tone: "free" }, { text: "HUG", tone: "new" }],
    cta: "마음 안아주기",
  },
  {
    title: "혈액형 테스트",
    description: "혈액형 성향, 라이프 코칭, 궁합, 밸런스 게임까지 가볍게 체험",
    href: "/blood-type-app.html",
    emoji: "🩸",
    image: "/fuctionassets/혈액형.webp",
    badges: [{ text: "무료", tone: "free" }, { text: "인기", tone: "new" }],
    cta: "혈액형 테스트",
  },
  {
    title: "최애운명",
    description: "K-POP 포토카드 무드로 사주 공명 포인트를 읽는 몰입형 리딩",
    href: "/saju/destiny-bias",
    emoji: "✨",
    image: "/fuctionassets/%EC%B5%9C%EC%95%A0%EC%9A%B4%EB%AA%85.webp",
    badges: [{ text: "1회 50코인", tone: "coin" }, { text: "포토카드", tone: "new" }],
    cta: "최애운명 시작",
  },
];

const premiumItems: ServiceCardModel[] = [
  { title: "명운 프리미엄 작명", description: "오행·수리 기반 작명", href: "/myungwun_final.html", emoji: "🖋️", badges: [{ text: "700코인", tone: "coin" }] },
  { title: "결제/멤버십 관리", description: "멤버십과 결제 내역 관리", href: "/points", emoji: "💳", badges: [{ text: "관리", tone: "soft" }] },
];

const DeferredPersonalizedServiceRecommendations = dynamic(() => import("./PersonalizedServiceRecommendations"), {
  ssr: false,
  loading: () => null,
});
const DeferredServiceCollectionSection = dynamic(() => import("./ServiceCollectionSection"), {
  ssr: false,
  loading: () => null,
});
const DeferredFeatureUnlockShowcase = dynamic(() => import("./FeatureUnlockShowcase"), {
  ssr: false,
  loading: () => null,
});
const DeferredGlobalPricingCard = dynamic(() => import("./GlobalPricingCard"), {
  ssr: false,
  loading: () => null,
});
const DeferredGlobalTrustSection = dynamic(() => import("./GlobalTrustSection"), {
  ssr: false,
  loading: () => null,
});
const DeferredEmailSubscriptionSection = dynamic(() => import("./EmailSubscriptionSection"), {
  ssr: false,
  loading: () => null,
});
const DeferredMusicPlayerExample = dynamic(() => import("../music/MusicPlayerExample"), {
  ssr: false,
  loading: () => null,
});

type LazySectionProps = {
  id?: string;
  className?: string;
  minHeight?: number;
  rootMargin?: string;
  children: React.ReactNode;
};

function LazySection({ id, className, minHeight = 260, rootMargin = "300px 0px", children }: LazySectionProps) {
  const hostRef = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    var host = hostRef.current;
    if (!host) return;
    if (typeof window === "undefined" || typeof window.IntersectionObserver !== "function") {
      setReady(true);
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i += 1) {
          if (entries[i].isIntersecting) {
            setReady(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: rootMargin, threshold: 0.01 }
    );
    observer.observe(host);
    return function () {
      observer.disconnect();
    };
  }, [ready, rootMargin]);

  return (
    <section id={id} ref={hostRef} className={className} style={!ready ? { minHeight: `${minHeight}px` } : undefined}>
      {ready ? children : null}
    </section>
  );
}

export default function MainLandingPage() {
  const [profile, setProfile] = useState<FormState | null>(null);

  const recommendations = useMemo<ServiceCardModel[]>(() => {
    if (!profile) return [];
    const base = profile.calType === "solar" ? cosmicItems : oracleItems;
    const genderBoost = profile.gender === "F" ? oracleItems : cosmicItems;
    return [...base.slice(0, 2), ...genderBoost.slice(0, 1), premiumItems[5]];
  }, [profile]);

  return (
    <main className="cd-home-root">
      <section className="cd-main-shell !pb-4 !pt-8 md:!pt-10">
        <div className="relative overflow-hidden rounded-[26px] border border-indigo-200/30 bg-[radial-gradient(circle_at_18%_15%,rgba(252,211,153,0.24),transparent_34%),radial-gradient(circle_at_82%_24%,rgba(165,180,252,0.2),transparent_36%),linear-gradient(150deg,rgba(18,14,52,0.96),rgba(28,20,70,0.94)_52%,rgba(12,22,51,0.96))] px-4 py-8 text-center shadow-[0_26px_64px_rgba(16,11,44,0.5)] md:px-8 md:py-10">
          <div className="pointer-events-none absolute -left-20 -top-24 h-52 w-52 rounded-full bg-amber-200/20 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -right-16 top-6 h-48 w-48 rounded-full bg-indigo-300/20 blur-3xl" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 opacity-35"
            style={{
              backgroundImage:
                "radial-gradient(circle at 12% 24%, rgba(255,255,255,0.55) 0 1.2px, transparent 2px), radial-gradient(circle at 34% 68%, rgba(255,255,255,0.35) 0 1px, transparent 2px), radial-gradient(circle at 60% 18%, rgba(255,255,255,0.4) 0 1.1px, transparent 2px), radial-gradient(circle at 82% 62%, rgba(255,255,255,0.3) 0 1px, transparent 2px)"
            }}
            aria-hidden
          />

          <div className="relative z-10">
            <div className="mx-auto mb-3 h-[94px] w-[94px] overflow-hidden rounded-full border-2 border-amber-200/60 shadow-[0_12px_28px_rgba(20,11,45,0.6)] md:h-[120px] md:w-[120px]">
              <img
                src="/icons/%EA%BF%80%EA%BF%80%20%EC%9A%B4%EC%84%B8%20%EB%A1%9C%EA%B3%A0.webp"
                srcSet="/icons/%EA%BF%80%EA%BF%80%20%EC%9A%B4%EC%84%B8%20%EB%A1%9C%EA%B3%A0.webp 96w, /icons/%EA%BF%80%EA%BF%80%20%EC%9A%B4%EC%84%B8%20%EB%A1%9C%EA%B3%A0.webp 130w, /icons/%EA%BF%80%EA%BF%80%20%EC%9A%B4%EC%84%B8%20%EB%A1%9C%EA%B3%A0.webp 512w"
                sizes="(max-width: 768px) 94px, 120px"
                alt="꿀꿀 연이 로고"
                className="h-full w-full object-cover"
                width={130}
                height={130}
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </div>
            <h1 className="text-[clamp(1.45rem,3.2vw,2.5rem)] font-black tracking-[-0.02em] text-violet-50">
              생년월일 하나로, 나의 운명 지도를 펼쳐보세요
            </h1>
            <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-violet-100/85 md:text-[15px]">
              점성술, 자미두수, 오라클 리딩을 하나의 흐름으로 연결한 메인 운세 화면입니다.
              먼저 입력을 시작하고, 아래 추천 컬렉션에서 오늘의 리딩을 이어서 탐색해보세요.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-indigo-50 md:text-xs">
              <span className="rounded-full border border-indigo-200/45 bg-indigo-200/10 px-3 py-1">모바일 최적화 결과 화면</span>
              <span className="rounded-full border border-violet-200/45 bg-violet-200/10 px-3 py-1">코즈믹 컬렉션 큐레이션</span>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <Link
                href="/signup"
                className="inline-flex items-center rounded-full border border-violet-200/40 bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(89,53,188,0.38)] transition hover:brightness-110"
              >
                <DestinyIcon name="sparkle" size={16} className="mr-1.5" variant="soft" />회원가입
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-amber-200/45 bg-[rgba(17,20,44,0.7)] px-5 py-2.5 text-sm font-bold text-amber-100 transition hover:bg-[rgba(36,38,78,0.78)]"
              >
                <DestinyIcon name="seal" size={16} className="mr-1.5" variant="soft" />로그인
              </Link>
              <a
                href="#fortuneForm"
                className="inline-flex items-center rounded-full border border-violet-200/30 bg-[rgba(78,56,134,0.25)] px-4 py-2.5 text-sm font-semibold text-violet-100 transition hover:bg-[rgba(98,72,160,0.35)]"
              >
                입력 폼으로 이동
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="fortuneForm" className="cd-main-shell !py-4 md:!py-5">
        <MainHeroFortuneForm onProfileReady={setProfile} />
      </section>

      <section className="cd-main-shell !py-4 md:!py-5" aria-label="Code Destiny music player">
        <DeferredMusicPlayerExample presentation="compact" />
      </section>

      <section className="cd-main-shell !py-4 md:!py-5">
        <QuickServiceShortcuts />
      </section>

      <section className="cd-main-shell !py-4 md:!py-5" aria-label="기타 점술 컬렉션">
        <DeferredServiceCollectionSection
          title="기타 점술 컬렉션"
          subtitle="심리테스트부터 혈액형 테스트까지"
          description="심리테스트에서 시작해 AI 오미쿠지, 혈액형 테스트를 거쳐 최애운명까지 자연스럽게 이어지는 탐색 흐름입니다."
          icon={<DestinyIcon name="seal" size={20} className="text-violet-100" variant="soft" />}
          defaultOpen
          items={miscDivinationItems}
        />
      </section>

      <LazySection className="cd-main-shell !py-4 md:!py-5" minHeight={220}>
        <DeferredPersonalizedServiceRecommendations profile={profile} recommendations={recommendations} />
      </LazySection>

      <LazySection className="cd-main-shell !py-4 md:!py-5" minHeight={220}>
        <DeferredEmailSubscriptionSection birthYear={profile?.birthDate ? parseInt(profile.birthDate.split("-")[0], 10) : undefined} />
      </LazySection>

      <LazySection className="cd-main-shell !py-4 md:!py-5" minHeight={280}>
        <DeferredFeatureUnlockShowcase />
      </LazySection>

      <LazySection className="cd-main-shell space-y-4 !pb-8 !pt-4" minHeight={680} rootMargin="420px 0px">
        <DeferredServiceCollectionSection
          title="나에게 맞는 추천 운세"
          subtitle="입력 정보를 기준으로 우선순위가 높은 리딩"
          description="첫 진입에 적합한 서비스부터 시작해 오늘의 운세 흐름을 빠르게 확인하세요."
          icon={<DestinyIcon name="compass" size={20} className="text-sky-100" variant="soft" />}
          defaultOpen
          items={recommendations.length ? recommendations : [...oracleItems.slice(0, 3), ...cosmicItems.slice(0, 2), premiumItems[5]]}
        />

        <DeferredServiceCollectionSection
          title="신탁 & 점술 컬렉션"
          subtitle="동서양 상징 기반 점술 리딩"
          description="화투, 찻잎, 주석, 지오맨시 등 상징 해석 중심의 점술 컬렉션입니다."
          icon={<DestinyIcon name="tarot" size={20} className="text-amber-100" variant="soft" />}
          items={oracleItems}
        />

        <DeferredServiceCollectionSection
          title="코즈믹 & 별자리 컬렉션"
          subtitle="별자리·자미두수·베다 기반 우주형 리딩"
          description="행성과 궁성 데이터를 통해 성향과 타이밍을 입체적으로 읽어냅니다."
          icon={<DestinyIcon name="zodiac" size={20} className="text-indigo-100" variant="soft" />}
          items={cosmicItems}
        />

        <DeferredServiceCollectionSection
          title="동물 & 관상 컬렉션"
          subtitle="본능 캐릭터와 관계 에너지 분석"
          description="동물 관상, 토템, 가디언 아트 등 직관형 체험 서비스를 모았습니다."
          icon={<DestinyIcon name="animalPaw" size={20} className="text-emerald-100" variant="soft" />}
          items={animalItems}
        />

        <DeferredServiceCollectionSection
          title="명상 컬렉션"
          subtitle="내면 안정과 집중 회복을 위한 루틴"
          description="명상과 꿈 해석을 결합해 감정 흐름을 정리하고 실행력을 높입니다."
          icon={<DestinyIcon name="lotus" size={20} className="text-rose-100" variant="soft" />}
          items={meditationItems}
        />

        <DeferredServiceCollectionSection
          title="프리미엄/코인 서비스 안내"
          subtitle="소개 보기부터 심화 분석까지 이어지는 VVIP 리포트"
          description="프리미엄 분석은 코인 기반으로 제공되며 결과 리포트는 계정에서 다시 확인할 수 있습니다."
          icon={<DestinyIcon name="coin" size={20} className="text-amber-100" variant="soft" />}
          items={premiumItems}
        />
      </LazySection>

      <LazySection className="cd-main-shell !pb-10 !pt-2" minHeight={420} rootMargin="460px 0px">
        <div className="cd-card mb-4">
          <h2 className="cd-main-title" style={{ fontSize: "clamp(1.2rem, 2.2vw, 1.7rem)" }}>
            Premium / Coin Information
          </h2>
          <p className="cd-main-intro" style={{ marginTop: "8px", marginBottom: 0 }}>
            하단에서 가격, 결제, 신뢰 정보를 한 번에 확인하고 필요할 때만 프리미엄 리포트를 시작할 수 있습니다.
          </p>
        </div>
        <DeferredGlobalPricingCard locale="ko" />
        <DeferredGlobalTrustSection compact showFooter={false} locale="ko" />
      </LazySection>
    </main>
  );
}
