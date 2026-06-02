import Link from "next/link";
import ShareWidget from "./ShareWidget";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
  buildWebPageJsonLd,
} from "../../lib/structured-data";

function buildFaqList(page) {
  const base = Array.isArray(page?.faqs) ? [...page.faqs] : [];
  const defaults = [
    {
      question: `${page.h1} 결과는 어디까지 참고하면 좋나요?`,
      answer:
        "운세 결과는 자기이해와 선택 정리를 위한 참고 정보로 활용하는 것이 좋습니다. 의료, 법률, 투자 판단은 각 분야 전문가 자문을 우선하세요.",
    },
    {
      question: "처음 사용하는 사용자도 바로 시작할 수 있나요?",
      answer:
        "가능합니다. 핵심 입력값을 확인한 뒤 결과 요약을 먼저 읽고, 관련 인사이트를 통해 해석을 확장하면 초보자도 쉽게 활용할 수 있습니다.",
    },
    {
      question: "결과 해석이 애매할 때는 어떻게 해야 하나요?",
      answer:
        "결과를 길흉 단정으로 보지 말고 강점·주의·보완 항목으로 나눠 기록해 보세요. 같은 질문을 주간 단위로 복기하면 해석 정확도가 올라갑니다.",
    },
  ];

  for (const faq of defaults) {
    if (base.some((item) => item.question === faq.question)) continue;
    base.push(faq);
  }

  return base.slice(0, 8);
}

function buildLearningPoints(page) {
  const keywords = Array.isArray(page?.keywords) ? page.keywords : [];
  return [
    `${keywords[0] || "핵심 주제"}를 초보자 관점에서 이해하는 기본 구조`,
    `${keywords[1] || "실전 해석"}를 실제 질문과 행동 계획으로 연결하는 방법`,
    `관련 서비스와 인사이트를 조합해 해석 정확도를 높이는 내부 링크 동선`,
    `과장 예언을 피하고 안전하게 결과를 활용하는 면책 및 실천 원칙`,
  ];
}

export default function SeoLandingTemplate({ page }) {
  const languageLinksByPath = {
    "/ziwei": [
      { href: "/ziwei", hrefLang: "ko", label: "한국어" },
      { href: "/ja/ziwei", hrefLang: "ja", label: "日本語" },
      { href: "/zh/ziwei", hrefLang: "zh", label: "中文" },
      { href: "/en/ziwei", hrefLang: "en", label: "English" },
    ],
    "/sukuyo": [
      { href: "/sukuyo", hrefLang: "ko", label: "한국어" },
      { href: "/ja/sukuyo", hrefLang: "ja", label: "日本語" },
      { href: "/zh/sukuyo", hrefLang: "zh", label: "中文" },
      { href: "/en/sukuyo", hrefLang: "en", label: "English" },
    ],
    "/today": [
      { href: "/today", hrefLang: "ko", label: "한국어" },
      { href: "/ja/today", hrefLang: "ja", label: "日本語" },
      { href: "/zh/today", hrefLang: "zh", label: "中文" },
      { href: "/en/today", hrefLang: "en", label: "English" },
    ],
  };
  const languageLinks = languageLinksByPath[page.path] || [];

  const breadcrumb = [
    { name: "홈", path: "/" },
    { name: "운세 서비스", path: "/insights" },
    { name: page.h1, path: page.path },
  ];
  const relatedInsights = Array.isArray(page.relatedInsights)
    ? page.relatedInsights.slice(0, 8).map((slug) => ({
        slug,
        title: slug.replace(/-/g, " "),
        excerpt: "관련 인사이트를 확인해 더 깊이 읽어보세요.",
        category: "인사이트",
      }))
    : [];
  const faqs = buildFaqList(page);
  const learningPoints = buildLearningPoints(page);

  const webPageJsonLd = buildWebPageJsonLd({
    title: page.title,
    description: page.description,
    path: page.path,
  });
  const serviceJsonLd = buildServiceJsonLd({
    name: page.title,
    description: page.description,
    path: page.path,
    serviceType: "운세 분석 서비스",
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumb);
  const faqJsonLd = buildFaqPageJsonLd(faqs);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 text-slate-100 md:px-6 md:py-10">
      {languageLinks.length > 0 ? (
        <nav aria-label="Language Switch" className="mb-3 flex flex-wrap gap-2 text-xs text-slate-200">
          {languageLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              hrefLang={item.hrefLang}
              lang={item.hrefLang}
              className={`rounded-full border px-3 py-1 transition ${item.href === page.path ? "border-sky-300/60 bg-sky-200/10 text-sky-100" : "border-slate-300/25 bg-slate-900/45 hover:bg-slate-800/65"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-300">
        {breadcrumb.map((item, idx) => (
          <span key={item.path}>
            {idx > 0 ? " > " : ""}
            <Link href={item.path} className="hover:text-sky-200">{item.name}</Link>
          </span>
        ))}
      </nav>

      <header className="rounded-3xl border border-slate-300/25 bg-[linear-gradient(145deg,rgba(8,15,31,0.95),rgba(17,31,58,0.92))] px-5 py-6 md:px-8 md:py-8">
        <p className="text-[11px] tracking-[0.15em] text-sky-200/80">CODE DESTINY SERVICE LANDING</p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight text-slate-50 md:text-4xl">{page.h1}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-100 md:text-base">{page.intro}</p>
        <p className="mt-4 text-sm leading-7 text-slate-200">
          Code Destiny(코드 데스티니)는 사주·타로·자미두수·점성술·숙요점·베다점을 연결해 해석하는 통합 운세 플랫폼입니다.
          이 페이지는 검색 사용자가 바로 실행할 수 있도록 핵심 개념, 사용 흐름, 자주 묻는 질문을 한 번에 제공합니다.
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          서비스 결과는 자기이해와 선택 정리를 위한 참고용 정보입니다. 의료, 법률, 투자 판단은 해당 분야 전문가의 자문을 우선해야 합니다.
        </p>
      </header>

      <section className="mt-6 rounded-3xl border border-slate-300/20 bg-slate-900/70 px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-sky-100">이 페이지에서 알 수 있는 것</h2>
        <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-200">
          {learningPoints.map((point) => (
            <li key={point}>- {point}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-300/20 bg-slate-900/70 px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-sky-100">초보자용 설명</h2>
        <p className="mt-3 text-sm leading-7 text-slate-200">
          1단계는 질문을 구체화하는 것입니다. 예를 들어 &quot;내 운세&quot; 대신 &quot;이번 달 직장 관계에서 주의할 점&quot;처럼 기간과 영역을 명확히 하면 결과 품질이 올라갑니다.
          2단계는 결과에서 공통 반복 신호를 찾는 것입니다. 3단계는 오늘 실행할 행동 한 줄로 마무리해 실제 변화로 연결합니다.
        </p>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-300/20 bg-slate-900/70 px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-sky-100">고급 해석 포인트</h2>
        <p className="mt-3 text-sm leading-7 text-slate-200">
          검색엔진과 사용자 모두에게 유익한 페이지는 단순 키워드 나열이 아니라 맥락과 행동 제안을 함께 제공합니다.
          Code Destiny는 무료 운세 서비스 허브와 장문 인사이트를 연결해 한 번의 방문이 학습과 실행으로 이어지도록 설계했습니다.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-200">
          브랜드 검색어인 Code Destiny, 코드 데스티니, 꿀꿀 만세력, codedestiny, 꿀꿀 운세, 꿀꿀 사주를 포함한 사용자 의도를 반영해
          관련 랜딩과 인사이트를 내부 링크로 촘촘히 연결했습니다.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {page.keywords.map((keyword) => (
            <span key={keyword} className="rounded-full border border-slate-300/25 bg-slate-800/60 px-3 py-1 text-xs text-slate-100">
              #{keyword}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-300/20 bg-slate-900/75 px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-sky-100">관련 기능 바로가기</h2>
        <p className="mt-3 text-sm leading-7 text-slate-200">
          서비스 조합을 통해 해석 정확도를 높일 수 있습니다. 무료 기능을 먼저 활용한 뒤 필요 시 프리미엄 리포트로 확장하세요.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {page.relatedServices.map((href) => (
            <Link key={href} href={href} className="rounded-xl border border-slate-300/20 bg-slate-800/55 px-4 py-3 text-sm text-slate-100 transition hover:bg-slate-700/65">
              {href === "/saju" ? "무료 사주풀이 보기" : ""}
              {href === "/manse" ? "꿀꿀 만세력 확인하기" : ""}
              {href === "/daily-fortune" ? "오늘의 운세 확인하기" : ""}
              {href === "/compatibility" ? "사주 궁합 분석하기" : ""}
              {href === "/tarot" ? "AI 타로 리딩 시작하기" : ""}
              {href === "/ziwei" ? "자미두수 명반 보기" : ""}
              {href === "/astrology" ? "점성술 출생차트 보기" : ""}
              {href === "/sukuyo" ? "숙요점 27숙 궁합 확인하기" : ""}
              {href === "/vedic" ? "베다점성술 리포트 보기" : ""}
              {href === "/dream" ? "꿈해몽 결과 확인하기" : ""}
              {href === "/physiognomy" ? "동물관상 분석하기" : ""}
              {href === "/sukuyo/compatibility" ? "숙요점 궁합 바로 보기" : ""}
              {href === "/premium" ? "프리미엄 운세 리포트 보기" : ""}
              {href === "/insights" ? "운세 인사이트 전체 보기" : ""}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-300/20 bg-slate-900/75 px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-sky-100">관련 인사이트</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {relatedInsights.map((article) => (
            <Link
              key={article.slug}
              href={`/insights/${article.slug}`}
              className="rounded-xl border border-slate-300/20 bg-slate-800/55 px-4 py-3 transition hover:bg-slate-700/65"
            >
              <p className="text-xs text-slate-300">{article.category}</p>
              <h3 className="mt-1 text-sm font-semibold leading-6 text-slate-50">{article.title}</h3>
              <p className="mt-2 text-xs leading-6 text-slate-200 line-clamp-2">{article.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-300/20 bg-slate-900/75 px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-sky-100">자주 묻는 질문</h2>
        <div className="mt-4 space-y-3">
          {faqs.map((faq) => (
            <article key={faq.question} className="rounded-xl border border-slate-300/20 bg-slate-800/50 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-50">{faq.question}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-200">{faq.answer}</p>
            </article>
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
      {Array.isArray(faqs) && faqs.length > 0 ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      ) : null}
    </main>
  );
}
