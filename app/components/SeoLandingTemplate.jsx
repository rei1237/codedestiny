import Link from "next/link";
import ShareWidget from "./ShareWidget";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
  buildWebPageJsonLd,
} from "../../lib/structured-data";

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
  "/": "Code Destiny 홈",
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
  "/premium-reports": "프리미엄 운세 리포트",
  "/high-value": "운세 인사이트 가이드",
  "/insights": "운세 인사이트 아카이브",
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

function buildRelatedServices(page) {
  const related = Array.isArray(page?.relatedServices) ? page.relatedServices : [];
  const fallback = ["/manse", "/tarot", "/today", "/high-value"];
  return (related.length ? related : fallback)
    .filter((href) => href && href !== page.path)
    .slice(0, 6)
    .map((href) => ({
      href,
      label: DEFAULT_RELATED_LABELS[href] || "관련 운세 서비스",
    }));
}

export default function SeoLandingTemplate({ page }) {
  const faqs = mergeFaqs(page?.faqs);
  const relatedServices = buildRelatedServices(page);
  const steps = Array.isArray(page?.steps) && page.steps.length > 0
    ? page.steps
    : ["생년월일이나 질문처럼 필요한 정보를 입력합니다.", "결과 요약을 먼저 읽고 반복되는 신호를 확인합니다.", "오늘 바로 실천할 선택을 한 가지로 정리합니다."];
  const resultItems = Array.isArray(page?.resultItems) && page.resultItems.length > 0
    ? page.resultItems
    : ["핵심 성향과 현재 흐름", "관계와 선택의 주의점", "실천 가능한 자기성찰 질문"];

  const breadcrumb = [
    { name: "홈", path: "/" },
    { name: "운세 서비스", path: "/high-value" },
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
    serviceType: "운세 해석 서비스",
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumb);
  const faqJsonLd = buildFaqPageJsonLd(faqs);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 text-slate-100 md:px-6 md:py-12">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-slate-300">
        {breadcrumb.map((item, idx) => (
          <span key={item.path}>
            {idx > 0 ? " / " : ""}
            <Link href={item.path} className="text-amber-100 hover:text-amber-50">
              {item.name}
            </Link>
          </span>
        ))}
      </nav>

      <header className="border-b border-slate-700/70 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">Code Destiny</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight text-slate-50 md:text-5xl">
          {page.h1}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-200 md:text-lg">
          {page.intro || page.description}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={page.ctaHref || "/index.html"}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-amber-100 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-50"
          >
            {page.ctaLabel || "무료로 시작하기"}
          </Link>
          <Link
            href="/high-value"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-500 px-5 text-sm font-semibold text-slate-100 transition hover:border-amber-100"
          >
            운세 가이드 읽기
          </Link>
        </div>
      </header>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        <article className="rounded-lg border border-slate-700 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-amber-100">사용 방법</h2>
          <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-200">
            {steps.map((step, index) => (
              <li key={step}>
                <strong className="text-slate-50">{index + 1}. </strong>
                {step}
              </li>
            ))}
          </ol>
        </article>
        <article className="rounded-lg border border-slate-700 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-amber-100">제공 결과</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-200">
            {resultItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="rounded-lg border border-slate-700 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-amber-100">주의와 면책</h2>
          <p className="mt-4 text-sm leading-7 text-slate-200">
            {page.disclaimer ||
              "운세 콘텐츠는 오락과 자기성찰을 위한 참고 정보입니다. 의료, 법률, 재무 등 전문 판단을 대신하지 않습니다."}
          </p>
        </article>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold text-slate-50">관련 기능</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {relatedServices.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-amber-100"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold text-slate-50">자주 묻는 질문</h2>
        <div className="mt-4 space-y-3">
          {faqs.map((faq) => (
            <details key={faq.question} className="rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-50">{faq.question}</summary>
              <p className="mt-3 text-sm leading-7 text-slate-200">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <ShareWidget
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
