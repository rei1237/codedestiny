import Link from "next/link";
import { ChevronRight, MoonStar, Sparkles } from "lucide-react";
import MobileAppActions from "./MobileAppActions";
import { listServiceFeatures } from "@/app/_lib/serviceFeatureRegistry";
import { FeatureMarketingLink, type FeatureMarketingTarget } from "@/app/components/FeatureMarketingDetailModal";

export const metadata = {
  title: "Code Destiny App",
  description: "Code Destiny Android app shell",
  robots: {
    index: false,
    follow: false,
  },
};

const CORE_SLUGS = [
  "saju",
  "tarot",
  "sukyo",
  "vedic",
  "astrology",
  "ziwei",
] as const;

const SPOTLIGHT_FEATURES: Array<FeatureMarketingTarget & { eyebrow: string; image: string }> = [
  {
    title: "운명의 찻집",
    subtitle: "연이의 달빛 상담",
    description: "따뜻한 타로와 사주 상담이 차분히 열립니다.",
    href: "/fortune-tea-house",
    slug: "fortune-tea-house",
    featureKey: "fortune-tea-house",
    category: "tarot",
    accessType: "free",
    eyebrow: "대표 모드",
    image: "https://assets.code-destiny.com/DestinyCafe/%EC%9A%B4%EB%AA%85%EC%9D%98%20%EC%B0%BB%EC%A7%91.webp",
  },
  {
    title: "네오의 팩폭 운명 전략실",
    subtitle: "전문가 상담형 전략실",
    description: "질문을 날카롭게 정리하고 다음 선택을 비춥니다.",
    href: "/neo-operation-room",
    slug: "neo-operation-room",
    featureKey: "neo-operation-room-consultation",
    category: "saju",
    accessType: "paid",
    badges: [{ text: "이용권·월정석·결제 적용" }],
    eyebrow: "대표 모드",
    image: "https://assets.code-destiny.com/DestinyWar/%EB%84%A4%EC%98%A4%EC%9D%98%20%ED%8C%A9%ED%8F%AD%20%EC%9A%B4%EB%AA%85%20%EC%9E%91%EC%A0%84%EC%8B%A4.webp",
  },
];

function normalizeLaunchRoute(route: string) {
  if (!route) return "/";
  if (route.includes("action=openTarotModal")) return "/tarot/mingri";
  if (route.includes("action=openSukuyoModal")) return "/oracle/sukuyo";
  if (route.includes("action=navigateToVedic")) return "/vedic/jyotish";
  if (route.includes("action=openAstroModal")) return "/astrology/cosmic";
  if (route.includes("action=openZiweiModal")) return "/ziwei/chart";
  if (route.startsWith("/index.html")) return "/";
  return route;
}

function isDefined<T>(value: T | null | undefined): value is T {
  return Boolean(value);
}

export default function CodeDestinyMobileAppPage() {
  const featureBySlug = new Map(listServiceFeatures("ko").map((feature) => [feature.slug, feature]));
  const features = CORE_SLUGS.map((slug) => featureBySlug.get(slug)).filter(isDefined);

  return (
    <>
      <header className="cd-app-bar flex min-h-16 items-center justify-between gap-3 px-4 pb-3 pt-3">
        <Link href="/app" className="flex min-w-0 items-center gap-3 no-underline" aria-label="Code Destiny 앱 홈">
          <img
            src="/fuctionassets/%EC%97%B0%EC%9D%B4.webp"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-[var(--cd-app-radius-sm)] object-contain"
            style={{ background: "var(--cd-app-bg-raised)", boxShadow: "var(--cd-app-shadow-1)" }}
          />
          <span className="grid min-w-0 gap-0.5">
            <span className="truncate text-sm font-black leading-tight" style={{ color: "var(--cd-app-ink)" }}>Code Destiny</span>
            <span className="truncate text-xs font-semibold leading-tight" style={{ color: "var(--cd-app-ink-subtle)" }}>달빛 운세 홈</span>
          </span>
        </Link>
        {/* 앱에서 이용권은 Play Billing 스토어(/app/store)로만 간다 — /points(외부 결제)는 열지 않는다. */}
        <Link
          href="/app/store"
          className="cd-app-tap cd-app-press flex shrink-0 items-center rounded-[var(--cd-app-radius-pill)] px-4 text-xs font-black no-underline"
          style={{ background: "var(--cd-app-gold)", color: "var(--cd-app-on-gold)" }}
        >
          이용권
        </Link>
      </header>

      <section className="cd-app-surface cd-app-enter mx-4 mt-3 p-4" aria-label="오늘의 추천">
        <p className="m-0 text-xs font-black" style={{ color: "var(--cd-app-accent)" }}>오늘의 추천</p>
        <h1 className="cd-app-title mt-2" style={{ color: "var(--cd-app-gold)" }}>운명을 여는 첫 장면을 골라보세요.</h1>
        <p className="cd-app-body mt-2">사주와 타로, 별자리와 캐릭터 상담이 한 화면에서 조용히 이어집니다.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href="/saju/basic"
            className="cd-app-tap cd-app-press flex items-center justify-center gap-2 rounded-[var(--cd-app-radius-md)] px-3 text-center text-sm font-black no-underline"
            style={{ background: "var(--cd-app-gold)", color: "var(--cd-app-on-gold)" }}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            무료 사주
          </Link>
          <Link
            href="/tarot/mingri"
            className="cd-app-tap cd-app-press flex items-center justify-center gap-2 rounded-[var(--cd-app-radius-md)] px-3 text-center text-sm font-black no-underline"
            style={{
              border: "1px solid var(--cd-app-line-strong)",
              background: "var(--cd-app-bg-raised)",
              color: "var(--cd-app-ink)",
            }}
          >
            <MoonStar className="h-4 w-4" aria-hidden="true" />
            타로 카드
          </Link>
        </div>
      </section>

      <div className="mx-4 mt-3">
        <MobileAppActions />
      </div>

      <section className="mt-4 grid gap-3 px-4" aria-label="대표 상담">
        <div className="flex items-center justify-between gap-3">
          <h2 className="cd-app-heading">대표 모드</h2>
          <Link href="/fortune-tea-house" className="inline-flex items-center gap-1 text-xs font-black no-underline" style={{ color: "var(--cd-app-accent)" }}>
            찻집 열기 <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-3">
          {SPOTLIGHT_FEATURES.map((feature) => (
            <FeatureMarketingLink
              key={feature.slug}
              href={feature.href}
              target={feature}
              className="cd-app-surface cd-app-enter cd-app-press grid overflow-hidden text-left no-underline"
            >
              <img src={feature.image} alt="" width={640} height={360} loading="lazy" decoding="async" className="h-32 w-full object-cover" />
              <span className="px-4 pt-3 text-[11px] font-black" style={{ color: "var(--cd-app-gold)" }}>{feature.eyebrow}</span>
              <span className="cd-app-heading px-4 pt-1 text-lg">{feature.title}</span>
              <span className="cd-app-body px-4 pb-4 pt-1">{feature.description}</span>
            </FeatureMarketingLink>
          ))}
        </div>
      </section>

      <section className="mt-4 grid gap-3 px-4" aria-label="운세 카테고리">
        <h2 className="cd-app-heading">운세 카테고리</h2>
        <div className="grid grid-cols-2 gap-2">
          {features.map((feature) => (
            <FeatureMarketingLink
              key={feature.slug}
              href={normalizeLaunchRoute(feature.launchRoute)}
              target={{
                title: feature.title,
                subtitle: feature.subtitle,
                description: feature.description,
                href: normalizeLaunchRoute(feature.launchRoute),
                slug: feature.slug,
                featureKey: feature.featureKey,
                category: feature.category,
                accessType: feature.accessType,
                priceLabel: feature.priceLabel,
                coinPrice: feature.coinPrice,
              }}
              className="cd-app-surface cd-app-enter cd-app-press grid min-h-[112px] content-between p-3 text-left no-underline"
            >
              <span className="text-sm font-black leading-snug" style={{ color: "var(--cd-app-ink)" }}>{feature.title}</span>
              <span className="line-clamp-2 text-xs font-semibold leading-5" style={{ color: "var(--cd-app-ink-subtle)" }}>{feature.subtitle}</span>
              <span className="text-[11px] font-black" style={{ color: "var(--cd-app-accent)" }}>
                {feature.accessType === "free" ? "바로 열림" : "이용권·결제 적용"}
              </span>
            </FeatureMarketingLink>
          ))}
        </div>
      </section>
    </>
  );
}
