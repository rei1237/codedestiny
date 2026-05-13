import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  DEFAULT_SERVICE_IMAGE,
  getServiceFeatureBySlug,
  listServiceSlugs,
  type ServiceFeature,
} from "../../_lib/serviceFeatureRegistry";

type PageProps = {
  params: {
    slug: string;
  };
};

function resolveImageSrc(feature: ServiceFeature): string {
  return feature.image || DEFAULT_SERVICE_IMAGE;
}

function renderCoinText(coinPrice?: number, fallback?: string): string {
  if (typeof coinPrice === "number" && Number.isFinite(coinPrice)) {
    return `${coinPrice}코인`;
  }
  if (fallback) return fallback;
  return "가격 확인 필요";
}

function renderAccessBadge(feature: ServiceFeature): string {
  if (feature.accessType === "free") return "무료";
  if (feature.accessType === "login_required") return "로그인 필요";
  if (feature.accessType === "premium_pdf") return `프리미엄 ${renderCoinText(feature.coinPrice, feature.priceLabel)}`;
  return `유료 ${renderCoinText(feature.coinPrice, feature.priceLabel)}`;
}

export function generateStaticParams() {
  return listServiceSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const feature = getServiceFeatureBySlug(params.slug);

  if (!feature) {
    return {
      title: "운세 서비스 | Code Destiny",
      description: "사주, 자미두수, 숙요점, 베다점, 타로 등 다양한 운세 서비스를 제공합니다.",
    };
  }

  const imageSrc = resolveImageSrc(feature);

  return {
    title: feature.seo.title,
    description: feature.seo.description,
    keywords: feature.seo.keywords,
    openGraph: {
      title: feature.seo.title,
      description: feature.seo.description,
      images: [imageSrc],
    },
  };
}

export default function ServiceDetailPage({ params }: PageProps) {
  const feature = getServiceFeatureBySlug(params.slug);
  if (!feature) notFound();

  const imageSrc = resolveImageSrc(feature);
  const hasPremium = Array.isArray(feature.premiumOptions) && feature.premiumOptions.length > 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.15),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(244,114,182,0.12),transparent_30%),linear-gradient(160deg,#070b1f_0%,#090d26_48%,#0b102d_100%)] px-4 py-10 text-slate-100 md:px-8 md:py-14">
      <article className="mx-auto w-full max-w-6xl">
        <section className="grid gap-6 rounded-3xl border border-white/15 bg-white/[0.03] p-5 shadow-[0_30px_70px_rgba(6,11,30,0.45)] md:grid-cols-2 md:gap-8 md:p-8">
          <div className="order-2 md:order-1">
            <p className="inline-flex rounded-full border border-cyan-200/40 bg-cyan-300/10 px-3 py-1 text-[11px] font-bold tracking-[0.16em] text-cyan-100">
              SERVICE DETAIL
            </p>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-slate-50 md:text-4xl">{feature.title}</h1>
            <p className="mt-3 text-sm leading-7 text-slate-200/85 md:text-base">{feature.subtitle}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-violet-200/40 bg-violet-300/10 px-3 py-1 text-xs font-semibold text-violet-100">
                {renderAccessBadge(feature)}
              </span>
              {feature.featureKey ? (
                <span className="rounded-full border border-amber-200/40 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                  {renderCoinText(feature.coinPrice, feature.priceLabel)}
                </span>
              ) : null}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={feature.launchRoute}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 text-sm font-bold text-white shadow-[0_16px_30px_rgba(56,189,248,0.32)] transition hover:brightness-110"
              >
                기본 기능 시작하기
              </Link>
              {hasPremium ? (
                <Link
                  href={feature.premiumOptions![0].launchRoute}
                  className="inline-flex items-center justify-center rounded-xl border border-amber-200/45 bg-amber-300/10 px-5 py-3 text-sm font-bold text-amber-100 transition hover:bg-amber-300/20"
                >
                  프리미엄 리포트 보기
                </Link>
              ) : null}
            </div>
          </div>

          <div className="order-1 overflow-hidden rounded-2xl border border-white/15 bg-black/30 md:order-2">
            <Image
              src={imageSrc}
              alt={feature.heroImageAlt}
              width={1200}
              height={800}
              className="h-full min-h-[240px] w-full object-cover"
              priority
            />
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/12 bg-white/[0.03] p-5 md:p-7">
          <h2 className="text-xl font-bold text-cyan-100">기능 설명</h2>
          <p className="mt-3 text-sm leading-7 text-slate-200/85 md:text-base">{feature.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {feature.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-slate-200">
                #{tag}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/12 bg-white/[0.03] p-5 md:p-7">
          <h2 className="text-xl font-bold text-cyan-100">결과 예시</h2>
          <p className="mt-2 text-xs text-slate-300/80">
            아래 예시는 샘플 데이터입니다. 실제 결과는 기능 실행 후 계산된 데이터로 제공됩니다.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {feature.resultExamples.map((example) => (
              <article key={example.title} className="rounded-2xl border border-white/12 bg-slate-950/30 p-4">
                <h3 className="text-sm font-semibold text-slate-100">{example.title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-300/85">{example.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/12 bg-white/[0.03] p-5 md:p-7">
          <h2 className="text-xl font-bold text-cyan-100">이용 방법</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {feature.howItWorks.map((step, index) => (
              <article key={step.title} className="rounded-2xl border border-white/12 bg-slate-950/30 p-4">
                <p className="text-xs font-bold tracking-[0.18em] text-cyan-200/90">STEP {index + 1}</p>
                <h3 className="mt-2 text-sm font-semibold text-slate-100">{step.title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-300/85">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/12 bg-white/[0.03] p-5 md:p-7">
          <h2 className="text-xl font-bold text-cyan-100">가격/코인 안내</h2>
          <div className="mt-4 rounded-2xl border border-white/12 bg-slate-950/30 p-4">
            <p className="text-sm font-semibold text-slate-100">기본 기능</p>
            <p className="mt-1 text-xs text-slate-300/85">
              접근 유형: {renderAccessBadge(feature)}
              {feature.featureKey ? ` · featureKey: ${feature.featureKey}` : ""}
            </p>
            <p className="mt-2 text-xs text-slate-300/85">
              가격 정보는 서버 가격표(Worker paid-feature registry) 기준으로 표시됩니다. 결제/코인 차감은 실행 페이지에서 기존 게이트가 처리합니다.
            </p>
          </div>

          {hasPremium ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {feature.premiumOptions!.map((option) => (
                <article key={option.featureKey} className="rounded-2xl border border-amber-200/25 bg-amber-300/5 p-4">
                  <h3 className="text-sm font-semibold text-amber-100">{option.title}</h3>
                  <p className="mt-1 text-xs text-amber-50/85">{option.description}</p>
                  <p className="mt-2 text-xs text-amber-100/85">
                    {renderCoinText(option.coinPrice)} · featureKey: {option.featureKey}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-3xl border border-white/12 bg-white/[0.03] p-5 md:p-7">
          <h2 className="text-xl font-bold text-cyan-100">주의사항</h2>
          <p className="mt-3 text-xs leading-7 text-slate-300/85 md:text-sm">
            본 상세페이지는 서비스 소개/안내/SEO를 위한 랜딩입니다. 실제 분석, 로그인 검증, 결제/코인 차감, PDF 생성은 기존 실행 페이지와 기존 게이트 로직에서 그대로 처리됩니다.
          </p>
        </section>

        <section className="mt-6 rounded-3xl border border-cyan-200/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-5 md:p-7">
          <h2 className="text-xl font-bold text-cyan-100">지금 시작하기</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href={feature.launchRoute}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 text-sm font-bold text-white shadow-[0_16px_30px_rgba(56,189,248,0.32)] transition hover:brightness-110"
            >
              기본 기능 시작하기
            </Link>
            {hasPremium ? (
              <Link
                href={feature.premiumOptions![0].launchRoute}
                className="inline-flex items-center justify-center rounded-xl border border-amber-200/45 bg-amber-300/10 px-5 py-3 text-sm font-bold text-amber-100 transition hover:bg-amber-300/20"
              >
                프리미엄 리포트 시작하기
              </Link>
            ) : null}
          </div>
        </section>
      </article>
    </main>
  );
}
