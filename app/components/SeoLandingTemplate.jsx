import Link from "next/link";
import Image from "next/image";
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

function getRelatedServiceLabel(href) {
  const labels = {
    "/saju": "무료 사주풀이 보기",
    "/manse": "꿀꿀 만세력 확인하기",
    "/daily-fortune": "오늘의 운세 확인하기",
    "/compatibility": "사주 궁합 분석하기",
    "/tarot": "명리학 타로 시작하기",
    "/ziwei": "자미두수 명반 보기",
    "/astrology": "점성술 출생차트 보기",
    "/sukuyo": "숙요점 27숙 궁합 확인하기",
    "/vedic": "베다점성술 리포트 보기",
    "/dream": "꿈해몽 결과 확인하기",
    "/physiognomy": "동물관상 분석하기",
    "/sukuyo/compatibility": "숙요점 궁합 바로 보기",
    "/premium": "프리미엄 운세 리포트 보기",
    "/insights": "운세 인사이트 전체 보기",
  };
  return labels[href] || "서비스 바로가기";
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
  const isManseLanding = page.path === "/manse";

  if (isManseLanding) {
    return (
      <main className="relative isolate mx-auto w-full max-w-6xl overflow-hidden px-4 py-7 text-slate-100 md:px-6 md:py-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_8%,rgba(244,231,189,0.18),transparent_28%),radial-gradient(circle_at_18%_16%,rgba(159,216,255,0.16),transparent_30%),linear-gradient(180deg,#06101d_0%,#0c1426_54%,#111827_100%)]" />
        <div className="pointer-events-none absolute left-6 top-20 -z-10 h-40 w-40 rounded-full bg-sky-200/10 blur-3xl" />

        <Link
          href="/index.html"
          aria-label="메인 화면으로 이동"
          className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-amber-100/50 bg-[#08111f]/90 px-3 py-2 text-xs font-semibold text-amber-50 shadow-[0_18px_48px_rgba(0,0,0,0.42)] ring-1 ring-white/10 transition hover:-translate-y-1 hover:border-amber-100/75 hover:bg-[#101b2e] md:bottom-6 md:right-6 md:gap-3 md:px-4 md:py-3"
          data-manse-home-guide="yeoni-moon-v20260612"
        >
          <Image
            src="/fuctionassets/yeon.webp"
            alt="연이"
            width={52}
            height={68}
            className="h-12 w-10 object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.35)] md:h-16 md:w-12"
          />
          <span className="hidden leading-5 md:block">연이와 메인으로</span>
          <span className="md:hidden">메인</span>
        </Link>

        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-300">
          {breadcrumb.map((item, idx) => (
            <span key={item.path}>
              {idx > 0 ? " > " : ""}
              <Link href={item.path} className="hover:text-amber-100">{item.name}</Link>
            </span>
          ))}
        </nav>

        <header className="relative min-h-[560px] overflow-hidden rounded-[2rem] border border-amber-100/20 bg-[linear-gradient(135deg,rgba(5,12,28,0.96),rgba(12,27,50,0.94)_48%,rgba(16,24,45,0.98))] px-5 py-7 shadow-[0_28px_80px_rgba(0,0,0,0.38)] md:grid md:grid-cols-[minmax(0,1fr)_420px] md:gap-8 md:px-9 md:py-10">
          <div className="pointer-events-none absolute right-[-70px] top-[-80px] h-72 w-72 rounded-full bg-[radial-gradient(circle,#fff4c7_0%,#f4e7bd_32%,rgba(244,231,189,0.2)_58%,transparent_70%)] blur-[1px] md:h-96 md:w-96" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_22%,rgba(215,236,255,0.16),transparent_2px),radial-gradient(circle_at_54%_16%,rgba(255,255,255,0.22),transparent_1px),radial-gradient(circle_at_86%_54%,rgba(215,236,255,0.18),transparent_2px),radial-gradient(circle_at_36%_72%,rgba(255,255,255,0.16),transparent_1px)]" />

          <div className="relative z-10 flex min-h-[440px] flex-col justify-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100/80">Moonlit Manse</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight text-slate-50 md:text-6xl">달빛 만세력</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-100 md:text-lg">
              태어난 순간의 하늘을 달빛처럼 펼쳐, 사주 흐름과 오늘의 선택을 고요하게 정리합니다.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">{page.intro}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/saju" className="inline-flex min-h-12 items-center justify-center rounded-full bg-amber-100 px-6 text-sm font-semibold text-slate-950 shadow-[0_14px_32px_rgba(244,231,189,0.24)] transition hover:-translate-y-0.5 hover:bg-amber-50">
                무료 사주풀이 보기
              </Link>
              <Link href="/daily-fortune" className="inline-flex min-h-12 items-center justify-center rounded-full border border-sky-100/30 bg-white/10 px-6 text-sm font-semibold text-slate-50 transition hover:-translate-y-0.5 hover:bg-white/20">
                오늘의 운세 확인하기
              </Link>
            </div>
          </div>

          <div className="relative z-10 mt-6 min-h-[300px] md:mt-0">
            <div className="absolute inset-x-6 bottom-8 h-40 rounded-[50%] bg-sky-200/10 blur-2xl" />
            <div className="absolute right-4 top-8 h-52 w-52 rounded-full border border-amber-100/30 bg-[radial-gradient(circle,#fff6cf_0%,#f3dfaa_46%,rgba(244,231,189,0.1)_70%)] shadow-[0_0_70px_rgba(244,231,189,0.34)] md:right-8 md:top-12 md:h-64 md:w-64" />
            <div className="absolute bottom-8 left-3 w-44 rotate-[-7deg] rounded-2xl border border-amber-100/30 bg-[#101b2e]/86 p-4 shadow-[0_22px_50px_rgba(0,0,0,0.36)] backdrop-blur md:w-52">
              <p className="text-xs font-semibold tracking-[0.2em] text-amber-100/80">FOUR PILLARS</p>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {["年", "月", "日", "時"].map((pillar) => (
                  <span key={pillar} className="flex h-14 items-center justify-center rounded-xl border border-sky-100/20 bg-slate-950/50 text-lg text-sky-100">
                    {pillar}
                  </span>
                ))}
              </div>
            </div>
            <Image
              src="/fuctionassets/자는 연이.png"
              alt="달빛 아래 잠든 연이"
              width={256}
              height={256}
              className="absolute bottom-6 right-4 h-28 w-28 object-contain drop-shadow-[0_22px_22px_rgba(0,0,0,0.35)] md:bottom-10 md:right-8 md:h-36 md:w-36"
            />
          </div>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          {learningPoints.map((point) => (
            <article key={point} className="rounded-2xl border border-sky-100/20 bg-white/[0.06] px-4 py-4 shadow-[0_16px_42px_rgba(0,0,0,0.22)]">
              <p className="text-sm leading-7 text-slate-100">{point}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ["질문을 맑게", "기간과 영역을 정하면 만세력의 신호가 더 선명하게 드러납니다."],
            ["반복 신호 확인", "오행과 십성의 반복 흐름을 찾아 현재의 균형을 읽습니다."],
            ["오늘의 선택", "해석을 하루 안에 실행할 수 있는 한 줄의 행동으로 정리합니다."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-amber-100/20 bg-slate-950/50 px-5 py-5">
              <h2 className="text-lg font-semibold text-amber-100">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-200">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-sky-100/20 bg-[#08111f]/80 px-5 py-6 md:px-8 md:py-8">
          <h2 className="text-xl font-semibold text-sky-100">고급 해석 포인트</h2>
          <p className="mt-3 text-sm leading-7 text-slate-200">
            Code Destiny는 무료 운세 서비스 허브와 장문 인사이트를 연결해 한 번의 방문이 학습과 실행으로 이어지도록 설계했습니다.
            만세력은 길흉을 단정하기보다 강점, 주의, 보완의 흐름을 함께 비추는 달빛 지도처럼 활용하는 것이 좋습니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {page.keywords.map((keyword) => (
              <span key={keyword} className="rounded-full border border-amber-100/25 bg-amber-100/10 px-3 py-1 text-xs text-amber-50">
                #{keyword}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-amber-100/20 bg-slate-950/60 px-5 py-6 md:px-8 md:py-8">
          <h2 className="text-xl font-semibold text-amber-100">관련 기능 바로가기</h2>
          <p className="mt-3 text-sm leading-7 text-slate-200">
            무료 기능으로 흐름을 먼저 확인한 뒤, 필요할 때 프리미엄 리포트로 해석을 넓힐 수 있습니다.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {page.relatedServices.map((href) => (
              <Link key={href} href={href} className="rounded-2xl border border-sky-100/20 bg-white/[0.06] px-4 py-3 text-sm text-slate-100 transition hover:-translate-y-0.5 hover:border-amber-100/40 hover:bg-white/[0.09]">
                {getRelatedServiceLabel(href)}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-sky-100/20 bg-[#08111f]/70 px-5 py-6 md:px-8 md:py-8">
          <h2 className="text-xl font-semibold text-sky-100">관련 인사이트</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {relatedInsights.map((article) => (
              <Link
                key={article.slug}
                href={`/insights/${article.slug}`}
                className="rounded-2xl border border-sky-100/20 bg-slate-950/40 px-4 py-3 transition hover:-translate-y-0.5 hover:border-sky-100/30 hover:bg-slate-900/70"
              >
                <p className="text-xs text-amber-100/80">{article.category}</p>
                <h3 className="mt-1 text-sm font-semibold leading-6 text-slate-50">{article.title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-200 line-clamp-2">{article.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-amber-100/20 bg-slate-950/60 px-5 py-6 md:px-8 md:py-8">
          <h2 className="text-xl font-semibold text-amber-100">자주 묻는 질문</h2>
          <div className="mt-4 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border border-sky-100/20 bg-white/[0.05] px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-50 marker:text-amber-100">{faq.question}</summary>
                <p className="mt-2 text-sm leading-7 text-slate-200">{faq.answer}</p>
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
        {Array.isArray(faqs) && faqs.length > 0 ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        ) : null}
      </main>
    );
  }

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
              {href === "/tarot" ? "명리학 타로 시작하기" : ""}
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
