import Link from "next/link";
import { ChevronRight, Coffee, Home, MoonStar, Sparkles, Target, UserCircle } from "lucide-react";
import MobileAppActions from "./MobileAppActions";
import MobileAppRuntimeBridge from "./MobileAppRuntimeBridge";
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
    subtitle: "AI 상담형 전략실",
    description: "질문을 날카롭게 정리하고 다음 선택을 비춥니다.",
    href: "/neo-operation-room",
    slug: "neo-operation-room",
    featureKey: "neo-operation-room-consultation",
    category: "saju",
    accessType: "paid",
    badges: [{ text: "이용권·월정석·단건결제 적용" }],
    eyebrow: "대표 모드",
    image: "https://assets.code-destiny.com/DestinyWar/%EB%84%A4%EC%98%A4%EC%9D%98%20%ED%8C%A9%ED%8F%AD%20%EC%9A%B4%EB%AA%85%20%EC%9E%91%EC%A0%84%EC%8B%A4.webp",
  },
];

const BOTTOM_TABS = [
  { href: "/app", label: "홈", icon: Home },
  { href: "/saju/basic", label: "운세", icon: Sparkles },
  { href: "/fortune-tea-house", label: "찻집", icon: Coffee },
  { href: "/neo-operation-room", label: "전략실", icon: Target },
  { href: "/me", label: "마이", icon: UserCircle },
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
    <main className="min-h-[100dvh] bg-[#070b1f] text-[#fffaf0]">
      <MobileAppRuntimeBridge />
      <section className="mx-auto flex min-h-[100dvh] w-full max-w-[560px] flex-col gap-4 px-4 pb-[calc(106px+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-30 -mx-4 flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#070b1f]/90 px-4 pb-3 pt-[calc(10px+env(safe-area-inset-top))] backdrop-blur-xl">
          <Link href="/app" className="flex min-w-0 items-center gap-3 text-[#fff7dd] no-underline" aria-label="Code Destiny 앱 홈">
            <img
              src="/icons/%EA%BF%80%EA%BF%80%20%EC%9A%B4%EC%84%B8%20%EB%A1%9C%EA%B3%A0.webp"
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 rounded-2xl bg-white object-contain shadow-[0_10px_28px_rgba(0,0,0,0.35)]"
            />
            <span className="grid min-w-0 gap-0.5">
              <span className="truncate text-sm font-black leading-tight text-[#fff7dd]">Code Destiny</span>
              <span className="truncate text-xs font-bold leading-tight text-slate-300">달빛 운세 홈</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/points?source=android-appbar" className="flex min-h-10 items-center rounded-full border border-white/10 bg-white/[0.07] px-3 text-xs font-black text-slate-100 no-underline">
              이용권
            </Link>
            <Link href="/me" className="flex min-h-10 items-center rounded-full border border-amber-200/25 bg-amber-200/10 px-3 text-xs font-black text-[#fff3c4] no-underline">
              마이
            </Link>
          </div>
        </header>

        <section className="mt-2 rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_85%_0%,rgba(248,216,148,0.20),transparent_112px),linear-gradient(145deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.32)]">
          <p className="m-0 text-xs font-black text-emerald-200">오늘의 추천</p>
          <h1 className="m-0 mt-2 text-2xl font-black leading-tight text-[#fff3c4]">운명을 여는 첫 장면을 골라보세요.</h1>
          <p className="m-0 mt-3 text-sm font-semibold leading-6 text-slate-200">
            사주와 타로, 별자리와 캐릭터 상담이 한 화면에서 조용히 이어집니다.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/saju/basic" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#f3d680] px-3 text-center text-sm font-black text-[#111827] no-underline">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              무료 사주
            </Link>
            <Link href="/tarot/mingri" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-sky-200/25 bg-sky-200/10 px-3 text-center text-sm font-black text-sky-100 no-underline">
              <MoonStar className="h-4 w-4" aria-hidden="true" />
              타로 카드
            </Link>
          </div>
        </section>

        <MobileAppActions />

        <section className="grid gap-3" aria-label="대표 상담">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 text-sm font-black text-slate-100">대표 모드</h2>
            <Link href="/fortune-tea-house" className="inline-flex items-center gap-1 text-xs font-black text-sky-200 no-underline">
              찻집 열기 <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-3">
            {SPOTLIGHT_FEATURES.map((feature) => (
              <FeatureMarketingLink
                key={feature.slug}
                href={feature.href}
                target={feature}
                className="grid min-h-[236px] overflow-hidden rounded-[24px] border border-amber-200/20 bg-white/[0.055] text-left no-underline shadow-[0_16px_40px_rgba(0,0,0,0.26)]"
              >
                <img src={feature.image} alt="" width={640} height={360} loading="lazy" decoding="async" className="h-32 w-full object-cover" />
                <span className="px-4 pt-3 text-[11px] font-black text-amber-200">{feature.eyebrow}</span>
                <span className="px-4 text-lg font-black leading-tight text-[#fff3c4]">{feature.title}</span>
                <span className="px-4 pb-4 text-sm font-semibold leading-6 text-slate-200">{feature.description}</span>
              </FeatureMarketingLink>
            ))}
          </div>
        </section>

        <section className="grid gap-3" aria-label="운세 카테고리">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 text-sm font-black text-slate-100">운세 카테고리</h2>
            <Link href="/premium-unlock" className="text-xs font-black text-sky-200 no-underline">
              이용권
            </Link>
          </div>
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
                className="grid min-h-[112px] content-between rounded-[18px] border border-white/10 bg-white/[0.065] p-3 text-left no-underline shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
              >
                <span className="text-sm font-black leading-snug text-[#fff3c4]">{feature.title}</span>
                <span className="line-clamp-2 text-xs font-semibold leading-5 text-slate-200/75">{feature.subtitle}</span>
                <span className="text-[11px] font-black text-emerald-200">
                  {feature.accessType === "free" ? "바로 열림" : feature.priceLabel || "기존 정책 적용"}
                </span>
              </FeatureMarketingLink>
            ))}
          </div>
        </section>

        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[560px] border-t border-white/10 bg-[#070b1f]/92 px-3 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl" aria-label="앱 하단 이동">
          <div className="grid grid-cols-5 gap-1.5">
            {BOTTOM_TABS.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="grid min-h-[54px] place-items-center rounded-2xl border border-white/10 bg-white/[0.065] px-1 py-2 text-xs font-black text-slate-200 no-underline">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </section>
    </main>
  );
}
