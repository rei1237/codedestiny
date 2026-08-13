import { Fragment } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenText, Compass } from "lucide-react";
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

/* 포커스 링은 골드 하나로 통일한다. 강조색(트와일라잇 바이올렛)은 CTA 가 이미 쓰고 있어
   포커스까지 같은 색을 주면 "지금 어디에 포커스가 있는가"가 배경 속으로 묻힌다. */
const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8d5a3]";

/** 브랜드 락업의 달 마크. 장식이라 접근성 트리에서 빼고, 텍스트 분량 계산에도 잡히지 않는다. */
function MoonMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M20.1 14.6A8.4 8.4 0 0 1 9.4 3.9a8.4 8.4 0 1 0 10.7 10.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * 섹션 머리. 제목 위에 킥커를 쌓지 않고 같은 기준선 오른쪽에 라벨을 두고 골드 헤어라인으로 끊는다.
 * (섹션마다 반복되는 작은 대문자 킥커는 PRODUCT.md anti-references 의 금지 목록이다.)
 */
function SectionHead({ id, title, label }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[rgba(232,213,163,0.18)] pb-4">
      <h2
        id={id}
        className="font-[family-name:var(--font-serif)] text-[clamp(1.4rem,3.2vw,1.9rem)] font-bold tracking-[-0.01em] text-[#f4eeff]"
      >
        {title}
      </h2>
      {label ? <span className="text-[0.78rem] text-[rgba(200,170,255,0.78)]">{label}</span> : null}
    </div>
  );
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
    <main className="relative isolate min-h-[100dvh] overflow-hidden bg-[#0a0818] px-4 pb-16 pt-6 text-[#f4eeff] md:px-6 md:pb-24 md:pt-10">
      {/* 바닥은 거의 평평한 미드나잇 잉크. 상단 한 곳만 은은히 들어올린다 —
          채도 높은 보라 그라디언트 배경은 PRODUCT.md 가 명시적으로 거부하는 타로 사이트 클리셰다. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(120%_100%_at_50%_-24%,#13102a_0%,#0a0818_70%)]"
      />

      <div className="mx-auto w-full max-w-5xl">
        <nav
          aria-label="Breadcrumb"
          className="-my-2 flex flex-wrap items-center gap-x-2 text-[0.8rem] text-[rgba(200,170,255,0.78)]"
        >
          {breadcrumb.map((item, index) => (
            <Fragment key={item.path}>
              {index > 0 ? (
                <span aria-hidden="true" className="text-[rgba(232,213,163,0.4)]">
                  /
                </span>
              ) : null}
              <Link
                href={item.path}
                className={`inline-flex items-center rounded-[4px] py-2 underline-offset-4 transition-colors duration-200 hover:text-[#e8d5a3] hover:underline ${FOCUS_RING}`}
              >
                {item.name}
              </Link>
            </Fragment>
          ))}
        </nav>

        <header className="mt-[clamp(2.5rem,6vw,4rem)] border-b border-[rgba(232,213,163,0.18)] pb-[clamp(2.5rem,6vw,4rem)]">
          <p className="flex items-center gap-2.5 text-[0.85rem] font-semibold text-[#e8d5a3]">
            <MoonMark />
            <span className="font-[family-name:var(--font-serif)] tracking-[0.02em]">Code Destiny</span>
          </p>
          <h1 className="mt-5 max-w-[20ch] break-keep font-[family-name:var(--font-serif)] text-[clamp(2.15rem,6vw,4rem)] font-bold leading-[1.16] tracking-[-0.02em] text-[#f4eeff] [text-wrap:balance]">
            {page.h1}
          </h1>
          <p className="mt-7 max-w-[62ch] break-keep text-[1.02rem] leading-[1.9] text-[rgba(244,238,255,0.88)] [text-wrap:pretty]">
            {page.intro || page.description}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href={page.ctaHref || "/"}
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#c4b5fd] px-7 text-[0.94rem] font-semibold text-[#0a0818] transition-[background-color,box-shadow,transform] duration-200 ease-out hover:bg-[#d6cbff] hover:shadow-[0_0_34px_rgba(196,181,253,0.3)] motion-safe:hover:-translate-y-0.5 ${FOCUS_RING}`}
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              {page.ctaLabel || copy.defaultCta}
            </Link>
            <Link
              href={guideHref}
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[rgba(232,213,163,0.5)] px-7 text-[0.94rem] font-semibold text-[#e8d5a3] transition-[background-color,border-color] duration-200 ease-out hover:border-[rgba(232,213,163,0.72)] hover:bg-[rgba(232,213,163,0.08)] ${FOCUS_RING}`}
            >
              <BookOpenText className="h-4 w-4" aria-hidden="true" />
              {guideLabel}
            </Link>
          </div>
        </header>

        {/* 세 덩어리는 성격이 다르다 — 순서(사용 방법), 목록(제공 결과), 각주(면책).
            같은 크기 카드 세 장으로 찍어내면 형태가 내용을 배신한다. */}
        <div className="mt-[clamp(3rem,7vw,5rem)] grid gap-x-14 gap-y-[clamp(2.5rem,5vw,3.5rem)] lg:grid-cols-[1.05fr_1fr]">
          <section aria-labelledby="seoLandingSteps">
            <SectionHead id="seoLandingSteps" title={copy.cards.howToUse} />
            <ol className="mt-7">
              {steps.map((item, index) => (
                <li key={item} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 pb-6 last:pb-0">
                  {index < steps.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-4 top-9 w-px -translate-x-1/2 bg-[rgba(232,213,163,0.2)]"
                    />
                  ) : null}
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(232,213,163,0.5)] font-[family-name:var(--font-serif)] text-[0.88rem] font-bold text-[#e8d5a3]">
                    {index + 1}
                  </span>
                  <p className="min-w-0 break-keep pt-[0.3rem] text-[0.95rem] leading-[1.85] text-[rgba(244,238,255,0.86)]">
                    {item}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="seoLandingResults">
            <SectionHead id="seoLandingResults" title={copy.cards.result} />
            <ul className="mt-3 divide-y divide-[rgba(244,238,255,0.09)]">
              {resultItems.map((item) => (
                <li key={item} className="flex gap-3 py-4">
                  <span aria-hidden="true" className="mt-[0.66rem] h-1 w-1 shrink-0 rounded-full bg-[#e8d5a3]" />
                  <span className="min-w-0 break-keep text-[0.95rem] leading-[1.85] text-[rgba(244,238,255,0.86)]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section aria-labelledby="seoLandingDisclaimer" className="mt-[clamp(2.5rem,5vw,3.5rem)]">
          <h2
            id="seoLandingDisclaimer"
            className="font-[family-name:var(--font-serif)] text-[0.98rem] font-bold text-[#e8d5a3]"
          >
            {copy.cards.disclaimer}
          </h2>
          <p className="mt-2 max-w-[68ch] break-keep text-[0.89rem] leading-[1.85] text-[rgba(200,170,255,0.78)]">
            {disclaimer}
          </p>
        </section>

        <section aria-labelledby="seoLandingRelated" className="mt-[clamp(3.5rem,8vw,5.5rem)]">
          <SectionHead id="seoLandingRelated" title={copy.relatedFeatures} label={copy.relatedFlow} />
          {topicProfile?.topicSummary ? (
            <p className="mt-5 max-w-[68ch] break-keep text-[0.95rem] leading-[1.85] text-[rgba(244,238,255,0.86)]">
              {topicProfile.topicSummary}
            </p>
          ) : null}
          <ul className="mt-6 grid gap-x-12 sm:grid-cols-2">
            {relatedServices.map((item) => (
              <li key={item.href} className="border-b border-[rgba(244,238,255,0.09)]">
                <Link
                  href={item.href}
                  className={`group flex min-h-[3.75rem] items-center justify-between gap-4 py-4 text-[0.95rem] font-semibold text-[#f4eeff] transition-colors duration-200 hover:text-[#e8d5a3] ${FOCUS_RING}`}
                >
                  <span className="min-w-0 break-keep">{item.label}</span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-[rgba(232,213,163,0.62)] transition-transform duration-200 ease-out motion-safe:group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="seoLandingFaq" className="mt-[clamp(3.5rem,8vw,5.5rem)]">
          <SectionHead id="seoLandingFaq" title={copy.faqTitle} label={copy.faqKicker} />
          <div className="mt-2">
            {faqs.map((faq) => (
              <details key={faq.question} className="group border-b border-[rgba(244,238,255,0.09)]">
                <summary
                  className={`flex cursor-pointer list-none items-start justify-between gap-5 py-5 text-[0.98rem] font-semibold text-[#f4eeff] transition-colors duration-200 hover:text-[#e8d5a3] [&::-webkit-details-marker]:hidden ${FOCUS_RING}`}
                >
                  <span className="min-w-0 break-keep">{faq.question}</span>
                  <span
                    aria-hidden="true"
                    className="mt-[0.1rem] shrink-0 text-[1.05rem] leading-none text-[#e8d5a3] transition-transform duration-200 ease-out group-open:rotate-45 motion-reduce:transition-none"
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-[68ch] break-keep pb-6 text-[0.93rem] leading-[1.9] text-[rgba(244,238,255,0.86)]">
                  {faq.answer}
                </p>
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
