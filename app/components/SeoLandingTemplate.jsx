import Link from "next/link";
import { ArrowRight, BookOpenText, CalendarClock, Compass, ListChecks, ShieldCheck } from "lucide-react";
import DeferredShareWidget from "./DeferredShareWidget";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
  buildWebPageJsonLd,
} from "../../lib/structured-data";
import { getSeoRouteProfile, getTopicClusterLinks } from "../../lib/seo/entity-registry.mjs";

const DEFAULT_FAQS = [
  {
    question: "운세 결과는 어떻게 활용하면 좋나요?",
    answer:
      "결과는 미래를 확정하는 문장이 아니라 현재의 감정, 선택, 관계 흐름을 정리하는 참고 정보로 활용하는 것이 좋습니다.",
  },
  {
    question: "처음 방문한 사용자도 바로 이용할 수 있나요?",
    answer:
      "기본 안내와 공개 랜딩 페이지를 먼저 읽고, 필요한 기능으로 이동해 간단한 입력부터 시작할 수 있습니다.",
  },
  {
    question: "중요한 결정을 운세 결과만으로 내려도 되나요?",
    answer:
      "아니요. 건강, 법률, 재무, 진로처럼 중요한 결정은 실제 정보와 해당 분야 전문가의 조언을 함께 확인해야 합니다.",
  },
];

const DEFAULT_RELATED_LABELS = {
  "/": "꿀꿀 운세 홈 | Code Destiny",
  "/manse": "무료 만세력 사주 분석",
  "/saju": "무료 사주팔자 분석",
  "/saju/basic": "사주 만세력 기본 해석",
  "/saju/compatibility": "사주 궁합 해석",
  "/compatibility": "궁합 보기",
  "/tarot": "무료 타로 카드 리딩",
  "/tarot/reunion": "재회 타로 리딩",
  "/tarot/mindscan": "상대 마음 타로",
  "/today": "오늘의 운세 보기",
  "/daily-fortune": "오늘의 운세 보기",
  "/love": "연애운 보기",
  "/ziwei": "자미두수 12궁 명반",
  "/astrology": "점성술 출생차트",
  "/sukuyo": "숙요점 27숙 궁합",
  "/vedic": "베다 점성술",
  "/dream": "무료 꿈해몽",
  "/fusion-fortune": "초융합 운세 — 여섯 체계 통합 해석",
  "/premium-reports": "프리미엄 운세 리포트",
  "/high-value": "운세 인사이트 가이드",
  "/insights": "운세 인사이트 아카이브",
};

const SEO_LANDING_TEMPLATE_COPY = {
  ko: {
    guideSaju: "사주팔자 입문 보기",
    guideDefault: "운세 가이드 읽기",
    defaultSteps: [
      "생년월일이나 질문처럼 필요한 정보를 입력합니다.",
      "결과 요약을 먼저 읽고 반복되는 신호를 확인합니다.",
      "오늘 바로 실천할 선택을 한 가지로 정리합니다.",
    ],
    defaultResultItems: ["핵심 성향과 현재 흐름", "관계와 선택의 주의점", "실천 가능한 자기성찰 질문"],
    disclaimer: "운세 콘텐츠는 오락과 자기성찰을 위한 참고 정보입니다. 의료, 법률, 재무 등 전문 판단을 대신하지 않습니다.",
    cards: {
      howToUse: "사용 방법",
      result: "제공 결과",
      disclaimer: "주의와 면책",
    },
    breadcrumbHome: "꿀꿀 운세 홈",
    breadcrumbServices: "운세 서비스",
    serviceType: "운세 해석 서비스",
    defaultCta: "무료로 시작하기",
    relatedFlow: "이어지는 흐름",
    relatedFeatures: "관련 기능",
    faqKicker: "질문 정리",
    faqTitle: "자주 묻는 질문",
  },
};

function mergeFaqs(pageFaqs) {
  const custom = Array.isArray(pageFaqs) ? pageFaqs : [];
  const seen = new Set();
  return [...custom, ...DEFAULT_FAQS]
    .filter((item) => {
      const key = String(item?.question || "").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

function buildRelatedServices(page, topicClusterLinks) {
  const related = Array.isArray(page?.relatedServices) ? page.relatedServices : [];
  const fallback = ["/manse", "/tarot", "/today", "/high-value"];
  const fusionLink = topicClusterLinks.find((item) => item?.href === "/fusion-fortune");
  const source = [
    ...(fusionLink ? [fusionLink] : []),
    ...related,
    ...topicClusterLinks.filter((item) => item?.href !== "/fusion-fortune"),
    ...fallback,
  ];
  const seen = new Set();

  return source
    .map((item) => (typeof item === "string" ? { href: item } : item))
    .filter((item) => item?.href && item.href !== page.path && !seen.has(item.href) && seen.add(item.href))
    .slice(0, 6)
    .map((item) => ({
      href: item.href,
      label: item.label || DEFAULT_RELATED_LABELS[item.href] || "관련 운세 서비스",
    }));
}

export default function SeoLandingTemplate({ page }) {
  const copy = page?.templateCopy || SEO_LANDING_TEMPLATE_COPY.ko;
  const faqs = mergeFaqs(page?.faqs);
  const topicProfile = getSeoRouteProfile(page?.path);
  const relatedServices = buildRelatedServices(page, getTopicClusterLinks(page?.path));
  const guideHref = page?.guideHref || (page?.path === "/saju" ? "/high-value/complete-guide-to-saju" : "/high-value");
  const guideLabel = page?.guideLabel || (page?.path === "/saju" ? copy.guideSaju : copy.guideDefault);
  const steps = Array.isArray(page?.steps) && page.steps.length > 0
    ? page.steps
    : copy.defaultSteps;
  const resultItems = Array.isArray(page?.resultItems) && page.resultItems.length > 0
    ? page.resultItems
    : copy.defaultResultItems;
  const disclaimer =
    page.disclaimer ||
    copy.disclaimer;
  const overviewCards = [
    {
      title: copy.cards.howToUse,
      eyebrow: "01",
      Icon: CalendarClock,
      items: steps,
      tone: "border-amber-200/25 bg-amber-200/[0.07] text-amber-100",
    },
    {
      title: copy.cards.result,
      eyebrow: "02",
      Icon: ListChecks,
      items: resultItems,
      tone: "border-emerald-200/20 bg-emerald-200/[0.06] text-emerald-100",
    },
    {
      title: copy.cards.disclaimer,
      eyebrow: "03",
      Icon: ShieldCheck,
      body: disclaimer,
      tone: "border-rose-200/20 bg-rose-200/[0.05] text-rose-100",
    },
  ];

  const breadcrumb = [
    { name: copy.breadcrumbHome, path: "/" },
    { name: copy.breadcrumbServices, path: "/high-value" },
    { name: page.h1, path: page.path },
  ];
  const webPageJsonLd = buildWebPageJsonLd({
    title: page.title,
    description: page.description,
    path: page.path,
  });
  const serviceJsonLd = buildServiceJsonLd({
    name: page.title,
    description: page.description,
    path: page.path,
    serviceType: copy.serviceType,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumb);
  const faqJsonLd = buildFaqPageJsonLd(faqs);

  return (
    <main className="relative isolate min-h-[100dvh] overflow-hidden bg-[#070812] px-4 py-6 text-slate-100 md:px-6 md:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(145deg,rgba(7,8,18,1)_0%,rgba(17,24,39,.98)_46%,rgba(16,38,34,.92)_100%)]"
      />
      <div className="mx-auto w-full max-w-6xl">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap gap-2 text-sm text-slate-300">
          {breadcrumb.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-slate-200 transition hover:border-amber-200/60 hover:text-amber-100"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <header className="border-b border-white/10 pb-9 md:pb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">Code Destiny</p>
          <h1 className="mt-4 max-w-4xl break-keep text-4xl font-semibold leading-tight text-slate-50 md:text-6xl">
            {page.h1}
          </h1>
          <p className="mt-5 max-w-3xl break-keep text-base leading-8 text-slate-200 md:text-lg">
            {page.intro || page.description}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={page.ctaHref || "/index.html"}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-amber-100 px-5 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_rgba(251,191,36,0.18)] transition hover:bg-amber-50"
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              {page.ctaLabel || copy.defaultCta}
            </Link>
            <Link
              href={guideHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-slate-100 transition hover:border-emerald-200/50 hover:text-emerald-100"
            >
              <BookOpenText className="h-4 w-4" aria-hidden="true" />
              {guideLabel}
            </Link>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {overviewCards.map(({ title, eyebrow, Icon, items, body, tone }) => (
            <article key={title} className={`rounded-[8px] border p-5 shadow-[0_18px_70px_rgba(0,0,0,0.18)] ${tone}`}>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">{eyebrow}</span>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-50">{title}</h2>
              {items ? (
                <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-200">
                  {items.map((item, index) => (
                    <li key={item} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-slate-50">
                        {index + 1}
                      </span>
                      <span className="min-w-0 break-keep">{item}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 break-keep text-sm leading-7 text-slate-200">{body}</p>
              )}
            </article>
          ))}
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-emerald-100/80">{copy.relatedFlow}</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-50">{copy.relatedFeatures}</h2>
              {topicProfile?.topicSummary ? (
                <p className="mt-3 max-w-3xl break-keep text-sm leading-7 text-slate-300">
                  {topicProfile.topicSummary}
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedServices.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex min-h-[82px] items-center justify-between gap-4 rounded-[8px] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-amber-200/50 hover:bg-amber-100/[0.06]"
              >
                <span className="min-w-0 break-keep">{item.label}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-amber-100 transition group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-amber-100/80">{copy.faqKicker}</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-50">{copy.faqTitle}</h2>
          </div>
          <div className="divide-y divide-white/10 rounded-[8px] border border-white/10 bg-white/[0.035]">
            {faqs.map((faq) => (
              <details key={faq.question} className="px-4 py-4">
                <summary className="cursor-pointer break-keep text-sm font-semibold text-slate-50">{faq.question}</summary>
                <p className="mt-3 break-keep text-sm leading-7 text-slate-200">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <DeferredShareWidget
        title={page.title}
        description={page.description}
        path={page.path}
        image={page.ogImage}
        contentType="software"
        contentId={page.path}
      />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </main>
  );
}
