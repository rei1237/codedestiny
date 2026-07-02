import Link from "next/link";
import MobileAppActions from "./MobileAppActions";
import MobileAppRuntimeBridge from "./MobileAppRuntimeBridge";
import { listServiceFeatures } from "@/app/_lib/serviceFeatureRegistry";
import { FeatureMarketingLink } from "@/app/components/FeatureMarketingDetailModal";

export const metadata = {
  title: "Code Destiny App",
  description: "Code Destiny Android app shell",
  robots: {
    index: false,
    follow: false,
  },
};

const PRIMARY_SLUGS = new Set([
  "saju",
  "tarot",
  "saju-lifebook",
  "ziwei-ai",
  "vedic",
  "astrology",
  "sukyo",
  "destiny-meeting-place",
]);

function normalizeLaunchRoute(route: string) {
  if (!route) return "/";
  if (route.startsWith("/index.html?action=openTarotModal")) return "/tarot/mingri";
  if (route.startsWith("/index.html?action=navigateToVedic")) return "/vedic/jyotish";
  if (route.startsWith("/index.html")) return "/";
  return route;
}

export default function CodeDestinyMobileAppPage() {
  const features = listServiceFeatures("ko")
    .filter((feature) => PRIMARY_SLUGS.has(feature.slug))
    .slice(0, 8);

  return (
    <main className="min-h-[100svh] bg-[#070b1f] text-[#fffaf0]">
      <MobileAppRuntimeBridge />
      <section className="mx-auto flex min-h-[100svh] w-full max-w-[560px] flex-col gap-5 px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-[calc(18px+env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <img
            src="/icons/%EA%BF%80%EA%BF%80%20%EC%9A%B4%EC%84%B8%20%EB%A1%9C%EA%B3%A0.webp"
            alt=""
            className="h-12 w-12 rounded-2xl bg-white object-contain shadow-[0_10px_28px_rgba(0,0,0,0.35)]"
          />
          <div className="min-w-0">
            <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-emerald-200">Code Destiny App</p>
            <h1 className="m-0 text-xl font-black leading-tight text-[#fff3c4]">오늘의 흐름을 여는 운세함</h1>
          </div>
        </div>

        <div className="rounded-[18px] border border-amber-200/20 bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.32)]">
          <p className="m-0 text-sm font-semibold leading-7 text-slate-100/88">
            사주와 타로, 별자리와 숙요의 길이 한 화면에 머무릅니다. 지금 필요한 문을 고르면, 흐름은 조용히 다음 장면으로 이어집니다.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/saju/basic" className="flex min-h-12 items-center justify-center rounded-xl bg-[#f3d680] px-3 text-center text-sm font-black text-[#111827]">
              사주 보기
            </Link>
            <Link href="/premium-unlock" className="flex min-h-12 items-center justify-center rounded-xl border border-emerald-200/25 bg-emerald-300/10 px-3 text-center text-sm font-black text-emerald-100">
              달빛 이용권
            </Link>
          </div>
        </div>

        <MobileAppActions />

        <section className="grid gap-3" aria-label="앱 운세 목록">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 text-sm font-black tracking-[0.08em] text-slate-100">열려 있는 길</h2>
            <Link href="/premium-unlock" className="text-xs font-black text-sky-200">
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
                className="grid min-h-[118px] content-between rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-left no-underline shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
              >
                <span className="text-sm font-black leading-snug text-[#fff3c4]">{feature.title}</span>
                <span className="line-clamp-2 text-xs font-semibold leading-5 text-slate-200/75">{feature.subtitle}</span>
                <span className="text-[11px] font-black text-emerald-200">
                  {feature.accessType === "free" ? "바로 열림" : "달빛 결제"}
                </span>
              </FeatureMarketingLink>
            ))}
          </div>
        </section>

        <nav className="mt-auto grid grid-cols-4 gap-2" aria-label="앱 하단 이동">
          {[
            { href: "/app", label: "홈" },
            { href: "/saju/basic", label: "사주" },
            { href: "/tarot/mingri", label: "타로" },
            { href: "/premium-unlock", label: "MY" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-slate-950/60 text-xs font-black text-slate-100 no-underline">
              {item.label}
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
