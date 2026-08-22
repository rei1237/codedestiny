import Link from "next/link";
import { SEO_SITE_CONFIG } from "../../lib/seo/siteConfig";
import { SEO_INDEXABLE_LOCALES } from "../../lib/i18n/locales";

/* 배지에 쓸 색인 대상 로케일 목록. 리터럴로 적어 두면 로케일을 늘렸을 때 조용히 어긋난다
   — 실제로 2026-08 에 zh-TW 를 열고도 이 배지는 "KO · EN · JA · ZH" 로 남아 있었다. */
const INDEXABLE_LOCALE_BADGE = SEO_INDEXABLE_LOCALES.map((locale) => locale.toUpperCase()).join(" · ");

const TEMPLATE_UI_COPY = {
  ko: {
    heroTagline: "GLOBAL FORTUNE LANDING",
    heroCaption: "오늘의 흐름을 빠르게 읽고, 필요한 해석으로 바로 이동",
    keyPoints: "핵심 포인트",
    spotlight: "추천 서비스",
    relatedLinks: "관련 링크",
    faq: "자주 묻는 질문",
    localMode: "현재 언어 모드",
    trustedBy: "다국어 지원",
  },
  ja: {
    heroTagline: "GLOBAL FORTUNE LANDING",
    heroCaption: "今日の流れをつかみ、必要な解釈へすぐ移動",
    keyPoints: "要点",
    spotlight: "おすすめサービス",
    relatedLinks: "関連リンク",
    faq: "よくある質問",
    localMode: "現在の言語モード",
    trustedBy: "多言語対応",
  },
  zh: {
    heroTagline: "GLOBAL FORTUNE LANDING",
    heroCaption: "先看今日趋势，再进入更深层解读",
    keyPoints: "核心要点",
    spotlight: "推荐服务",
    relatedLinks: "相关链接",
    faq: "常见问题",
    localMode: "当前语言模式",
    trustedBy: "多语言支持",
  },
  // 🔴 zh-TW 가 없으면 아래 조회가 en 으로 떨어져 **번체 방문자가 영어 UI** 를 본다.
  //    /zh-tw 는 lib/i18n/locales.ts 의 PUBLIC_LOCALES 에 든 색인 대상 로케일이다.
  "zh-TW": {
    heroTagline: "GLOBAL FORTUNE LANDING",
    heroCaption: "先看今日趨勢，再進入更深層解讀",
    keyPoints: "核心要點",
    spotlight: "推薦服務",
    relatedLinks: "相關連結",
    faq: "常見問題",
    localMode: "目前語言模式",
    trustedBy: "多語言支援",
  },
  en: {
    heroTagline: "GLOBAL FORTUNE LANDING",
    heroCaption: "Start with daily guidance, move into deeper readings",
    keyPoints: "Key Points",
    spotlight: "Recommended Services",
    relatedLinks: "Related Links",
    faq: "FAQ",
    localMode: "Current Language Mode",
    trustedBy: "Multi-language Support",
  },
};

const HERO_ASSETS = {
  home: {
    src: "/fuctionassets/saju.webp",
    alt: "Saju and fortune landing visual",
  },
  ziwei: {
    src: "/fuctionassets/jami.webp",
    alt: "Zi Wei Dou Shu hero visual",
  },
  sukuyo: {
    src: "/fuctionassets/sukyo.webp",
    alt: "Sukuyo relationship hero visual",
  },
  today: {
    src: "/fuctionassets/sybila.webp",
    alt: "Daily fortune hero visual",
  },
};

const LINK_VISUALS = [
  { test: (href) => href.includes("ziwei"), src: "/fuctionassets/jami2.webp", badge: "ZIWEI" },
  { test: (href) => href.includes("sukuyo"), src: "/fuctionassets/sukyo.webp", badge: "SUKUYO" },
  { test: (href) => href.includes("today"), src: "/fuctionassets/sybila.webp", badge: "TODAY" },
  { test: (href) => href.includes("insights"), src: "/fuctionassets/info.webp", badge: "INSIGHTS" },
];

function stripLocalePrefix(path) {
  const normalized = String(path || "/").replace(/\/$/, "") || "/";
  // 🔴 zh-tw 를 zh 보다 먼저 본다. `zh` 만 있으면 `(?=\/|$)` 때문에 `/zh-tw/...` 가 아예 안 벗겨져
  //    히어로 이미지 판정이 라우트를 못 알아본다.
  return normalized.replace(/^\/(zh-tw|en|ja|zh)(?=\/|$)/, "") || "/";
}

function resolveHeroAsset(pathname) {
  const routePath = stripLocalePrefix(pathname);
  if (routePath.startsWith("/ziwei")) return HERO_ASSETS.ziwei;
  if (routePath.startsWith("/sukuyo")) return HERO_ASSETS.sukuyo;
  if (routePath.startsWith("/today")) return HERO_ASSETS.today;
  return HERO_ASSETS.home;
}

function resolveLinkVisual(href) {
  for (const item of LINK_VISUALS) {
    if (item.test(href)) return item;
  }
  return { src: "/fuctionassets/saju.webp", badge: "SERVICE" };
}

function toAbsolute(path) {
  return new URL(path, SEO_SITE_CONFIG.siteUrl).toString();
}

export default function I18nSeoPageTemplate({
  locale,
  localeLabel,
  languageLinks,
  content,
  currentPath,
  inLanguage,
}) {
  const ui = TEMPLATE_UI_COPY[locale] || TEMPLATE_UI_COPY.en;
  const heroAsset = resolveHeroAsset(currentPath);

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: content.h1,
    description: content.description,
    url: toAbsolute(currentPath),
    inLanguage,
    // 🔴 여기에 WebSite 노드를 인라인으로 펼치지 말 것. 예전에는 @id 없이
    // `{ "@type": "WebSite", name: "Code Destiny", ... }` 를 박아서 같은 페이지에 이름이 다른
    // WebSite 가 둘 나갔다(레이아웃의 "CODE DESTINY (꿀꿀 운세)" + 여기 "Code Destiny").
    // @id 로 참조하면 레이아웃이 선언한 사이트 엔티티에 그대로 합류한다
    // — lib/structured-data.ts:102 의 buildWebPageJsonLd 와 같은 관례다.
    isPartOf: { "@id": `${SEO_SITE_CONFIG.siteUrl}/#website` },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage,
    mainEntity: content.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <main lang={inLanguage || locale} className="mx-auto w-full max-w-6xl px-4 py-8 text-slate-100 md:px-6 md:py-10">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_8%_18%,rgba(56,189,248,0.18),transparent_38%),radial-gradient(circle_at_86%_16%,rgba(251,146,60,0.2),transparent_42%),linear-gradient(145deg,#0f172a,#131f3b_52%,#1e1b4b)] px-5 py-6 md:px-8 md:py-8">
        <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -right-10 top-10 h-44 w-44 rounded-full bg-orange-300/20 blur-3xl" aria-hidden />

        <div className="relative z-10 mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
          {languageLinks.map((item) => {
            const isCurrent = item.href === currentPath;
            return (
              <Link
                key={item.hrefLang}
                href={item.href}
                hrefLang={item.hrefLang}
                lang={item.hrefLang}
                className={`rounded-full border px-3 py-1 ${
                  isCurrent
                    ? "border-amber-300/60 bg-amber-100/10 text-amber-100"
                    : "border-white/20 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="relative z-10 grid items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-cyan-200/85">{ui.heroTagline}</p>
            <h1 className="mt-2 text-2xl font-black leading-tight text-amber-50 md:text-4xl">{content.h1}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-200 md:text-base">{content.intro}</p>

            <div className="mt-4 flex flex-wrap gap-2 text-[11px] md:text-xs">
              <span className="rounded-full border border-emerald-200/35 bg-emerald-900/25 px-3 py-1.5 font-semibold text-emerald-100">{content.mainKeyword}</span>
              <span className="rounded-full border border-cyan-200/35 bg-cyan-900/25 px-3 py-1.5 font-semibold text-cyan-100">{ui.localMode}: {localeLabel}</span>
              <span className="rounded-full border border-indigo-200/35 bg-indigo-900/25 px-3 py-1.5 font-semibold text-indigo-100">{ui.trustedBy}: {INDEXABLE_LOCALE_BADGE}</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                href={content.cta.href}
                className="inline-flex rounded-xl border border-cyan-300/35 bg-cyan-700/25 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-600/35"
              >
                {content.cta.label}
              </Link>
              {content.internalLinks[0] ? (
                <Link
                  href={content.internalLinks[0].href}
                  className="inline-flex rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
                >
                  {content.internalLinks[0].label}
                </Link>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-slate-950/35 p-3">
            <div className="relative overflow-hidden rounded-xl border border-white/10">
              <img
                src={heroAsset.src}
                alt={heroAsset.alt}
                width={960}
                height={640}
                loading="eager"
                decoding="async"
                className="h-[240px] w-full object-cover md:h-[280px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/10 to-transparent" />
              <p className="absolute bottom-3 left-3 right-3 text-xs font-medium leading-6 text-slate-100 md:text-sm">{ui.heroCaption}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#0f172a] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">{ui.keyPoints}</h2>
        <p className="mt-2 text-xs text-slate-400">{localeLabel}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {content.valuePoints.map((item, index) => (
            <article key={item} className="rounded-xl border border-white/15 bg-white/5 p-4">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-amber-300/45 bg-amber-100/10 text-xs font-bold text-amber-200">
                {index + 1}
              </span>
              <p className="mt-3 text-sm leading-7 text-slate-200">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#0d1528] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">{ui.spotlight}</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {content.internalLinks.slice(0, 3).map((item) => {
            const visual = resolveLinkVisual(item.href);
            return (
              <Link
                key={`spot-${item.href}`}
                href={item.href}
                className="group overflow-hidden rounded-xl border border-white/15 bg-[#11192f] hover:border-cyan-200/45"
              >
                <div className="relative">
                  <img
                    src={visual.src}
                    alt={item.label}
                    width={640}
                    height={360}
                    loading="lazy"
                    decoding="async"
                    className="h-32 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-2 top-2 rounded-full border border-white/25 bg-black/45 px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] text-slate-100">
                    {visual.badge}
                  </span>
                </div>
                <div className="px-4 py-3 text-sm font-semibold text-slate-100">{item.label}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#11192f] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">{ui.relatedLinks}</h2>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {content.internalLinks.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm hover:bg-white/10">
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#0f1628] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">{ui.faq}</h2>
        <div className="mt-4 space-y-3">
          {content.faq.map((item) => (
            <details key={item.question} className="rounded-xl border border-white/15 bg-white/5 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-100">{item.question}</summary>
              <p className="mt-2 text-sm leading-7 text-slate-200">{item.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-5 text-xs leading-6 text-slate-400">{content.disclaimer}</p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </main>
  );
}
