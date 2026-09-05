import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpenText, FileText, ShieldCheck } from "lucide-react";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "../../../lib/structured-data";
import ContentIntegrityNote from "../../components/ContentIntegrityNote";
import DeferredShareWidget from "../../components/DeferredShareWidget";
import EditorNote from "../../components/EditorNote";
import { getEditorNote } from "../../_content/editor-notes";
import { HIGH_VALUE_PAGES, getHighValuePageBySlug } from "../content";

export const dynamicParams = false;

const HIGH_VALUE_DETAIL_TEXT_TRANSLATIONS = {
  ko: {
    notFoundTitle: "문서를 찾을 수 없습니다 | Code Destiny",
    home: "홈",
    guide: "운세 인사이트 가이드",
    dateLine: (publishedAt, updatedAt, author) => `작성일 ${publishedAt} · 최종 수정일 ${updatedAt} · ${author}`,
    guideKeyword: "운세 가이드",
    insightKeyword: "운세 인사이트",
    sajuKeyword: "사주",
    tarotKeyword: "타로",
    disclaimer: "주의와 면책",
    faq: "자주 묻는 질문",
    relatedServices: "관련 서비스",
    nextReads: "다음에 읽을 글",
  },
  en: {
    notFoundTitle: "Document not found | Code Destiny",
    home: "Home",
    guide: "Fortune Insight Guide",
    dateLine: (publishedAt, updatedAt, author) => `Published ${publishedAt} · Updated ${updatedAt} · ${author}`,
    guideKeyword: "fortune guide",
    insightKeyword: "fortune insight",
    sajuKeyword: "saju",
    tarotKeyword: "tarot",
    disclaimer: "Notes and Disclaimer",
    faq: "Frequently Asked Questions",
    relatedServices: "Related Services",
    nextReads: "Read Next",
  },
  ja: {
    notFoundTitle: "文書が見つかりません | Code Destiny",
    home: "ホーム",
    guide: "運勢インサイトガイド",
    dateLine: (publishedAt, updatedAt, author) => `公開日 ${publishedAt} · 最終更新日 ${updatedAt} · ${author}`,
    guideKeyword: "運勢ガイド",
    insightKeyword: "運勢インサイト",
    sajuKeyword: "四柱推命",
    tarotKeyword: "タロット",
    disclaimer: "注意と免責",
    faq: "よくある質問",
    relatedServices: "関連サービス",
    nextReads: "次に読む記事",
  },
};

function highValueDetailText(key) {
  return HIGH_VALUE_DETAIL_TEXT_TRANSLATIONS.ko[key];
}

export function generateStaticParams() {
  return HIGH_VALUE_PAGES.map((item) => ({ slug: item.slug }));
}

export function generateMetadata({ params }) {
  const page = getHighValuePageBySlug(params?.slug);
  if (!page) {
    return {
      title: highValueDetailText("notFoundTitle"),
      robots: { index: false, follow: false },
    };
  }

  return buildSeoMetadata({
    path: `/guides/${page.slug}`,
    title: `${page.title} | Code Destiny`,
    description: page.summary,
    ogImage: "https://code-destiny.com/og/code-destiny-og-vvip.png?v=d50dc254ba",
    keywords: page.keywords || [page.title, page.category, highValueDetailText("insightKeyword")],
  });
}

export default function HighValueDetailPage({ params }) {
  const page = getHighValuePageBySlug(params?.slug);
  if (!page) notFound();

  const relatedPages = [
    ...HIGH_VALUE_PAGES.filter((item) => item.slug !== page.slug && item.categorySlug === page.categorySlug),
    ...HIGH_VALUE_PAGES.filter((item) => item.slug !== page.slug && item.categorySlug !== page.categorySlug),
  ].slice(0, 3);
  const path = `/guides/${page.slug}`;
  const sectionAnchors = page.sections.map((section, index) => ({
    id: `guide-section-${index + 1}`,
    label: section.h2,
  }));
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbJsonLd([
        { name: highValueDetailText("home"), path: "/" },
        { name: highValueDetailText("guide"), path: "/guides" },
        { name: page.title, path },
      ]),
      buildArticleJsonLd({
        title: page.title,
        description: page.summary,
        path,
        author: page.author,
        category: page.category,
        keywords: page.keywords || [page.category, page.title, highValueDetailText("guideKeyword")],
        datePublished: page.publishedAt,
        dateModified: page.updatedAt,
      }),
      buildFaqPageJsonLd(page.faq),
    ],
  });

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#070812] px-4 py-6 text-slate-100 md:px-6 md:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(145deg,rgba(7,8,18,1)_0%,rgba(17,24,39,.98)_45%,rgba(35,27,48,.9)_100%)]"
      />
      <div className="mx-auto w-full max-w-6xl">
        <nav aria-label="breadcrumb" className="flex flex-wrap gap-2 text-sm text-slate-300">
          <Link href="/" className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-slate-200 transition hover:border-amber-200/60 hover:text-amber-100">{highValueDetailText("home")}</Link>
          <Link href="/guides" className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-slate-200 transition hover:border-amber-200/60 hover:text-amber-100">{highValueDetailText("guide")}</Link>
          <Link href={`/guides/category/${page.categorySlug}`} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-slate-200 transition hover:border-amber-200/60 hover:text-amber-100">{page.category}</Link>
        </nav>

        <article className="mt-8">
          <header className="border-b border-white/10 pb-9 md:pb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">{page.category}</p>
            <h1 className="mt-4 max-w-4xl break-keep text-4xl font-semibold leading-tight text-slate-50 md:text-6xl">{page.title}</h1>
            <p className="mt-5 max-w-3xl break-keep text-base leading-8 text-slate-200 md:text-lg">{page.summary}</p>
            <p className="mt-5 break-keep text-sm leading-7 text-slate-400">
              {highValueDetailText("dateLine")(page.publishedAt, page.updatedAt, page.author)}
            </p>
          </header>

          <div className="mt-10 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-8 lg:self-start">
              <div className="rounded-[8px] border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-50">
                  <BookOpenText className="h-4 w-4 text-amber-100" aria-hidden="true" />
                  읽는 순서
                </div>
                <nav aria-label="문서 목차" className="mt-4 space-y-2">
                  {sectionAnchors.map((item, index) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-3 rounded-[8px] px-2 py-2 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-amber-100"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-slate-50">{index + 1}</span>
                      <span className="min-w-0 break-keep leading-6">{item.label}</span>
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="min-w-0">
              {/* 헤더(:136)가 이미 page.summary 를 내므로 여기 노트는 요약이 아니라
                  "무엇을 주의해서 읽는가" 각도다. 사이드 목차는 page.sections 로만
                  만들어지므로 이 블록이 목차를 오염시키지 않는다. */}
              <EditorNote note={getEditorNote(path)} className="mb-10" />

              <div className="space-y-10">
                {page.sections.map((section, index) => (
                  <section
                    key={section.h2}
                    id={sectionAnchors[index].id}
                    className="scroll-mt-24 border-t border-white/10 pt-8 first:border-t-0 first:pt-0"
                  >
                    <div className="flex items-start gap-4">
                      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-200/30 bg-amber-100/[0.08] text-sm font-semibold text-amber-100">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <h2 className="break-keep text-2xl font-semibold leading-snug text-slate-50">{section.h2}</h2>
                        <div className="mt-4 space-y-4">
                          {section.paragraphs.map((text) => (
                            <p key={text} className="break-keep text-base leading-8 text-slate-200">{text}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                ))}
              </div>

              <section className="mt-10 rounded-[8px] border border-amber-200/25 bg-amber-100/[0.06] p-5">
                <div className="flex items-center gap-2 text-lg font-semibold text-slate-50">
                  <ShieldCheck className="h-5 w-5 text-amber-100" aria-hidden="true" />
                  <h2>{highValueDetailText("disclaimer")}</h2>
                </div>
                <p className="mt-3 break-keep text-sm leading-7 text-slate-200">{page.disclaimer}</p>
              </section>

              <section className="mt-10">
                <div className="flex items-center gap-2 text-2xl font-semibold text-slate-50">
                  <FileText className="h-5 w-5 text-emerald-100" aria-hidden="true" />
                  <h2>{highValueDetailText("faq")}</h2>
                </div>
                <div className="mt-4 divide-y divide-white/10 rounded-[8px] border border-white/10 bg-white/[0.035]">
                  {page.faq.map((item) => (
                    <details key={item.question} className="px-4 py-4">
                      <summary className="cursor-pointer break-keep text-sm font-semibold text-slate-50">{item.question}</summary>
                      <p className="mt-3 break-keep text-sm leading-7 text-slate-200">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </section>

              <section className="mt-10 grid gap-4 md:grid-cols-2">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-50">{highValueDetailText("relatedServices")}</h2>
                  <div className="mt-4 grid gap-3">
                    {page.serviceLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="group flex min-h-[70px] items-center justify-between gap-4 rounded-[8px] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-amber-200/50 hover:bg-amber-100/[0.06]"
                      >
                        <span className="min-w-0 break-keep">{link.label}</span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-amber-100 transition group-hover:translate-x-0.5" aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold text-slate-50">{highValueDetailText("nextReads")}</h2>
                  <div className="mt-4 grid gap-3">
                    {relatedPages.map((item) => (
                      <Link
                        key={item.slug}
                        href={`/guides/${item.slug}`}
                        className="group flex min-h-[70px] items-center justify-between gap-4 rounded-[8px] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-emerald-200/50 hover:bg-emerald-100/[0.05]"
                      >
                        <span className="min-w-0 break-keep">{item.title}</span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-emerald-100 transition group-hover:translate-x-0.5" aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </article>

        {/* 광고 게재 대상이면서 제작·검수 고지가 없던 유일한 장문 템플릿이었다.
            /insights 아티클과 같은 고지를 같은 근거로 붙인다. */}
        <ContentIntegrityNote contentSource="authored" author={page.author} datePublished={page.publishedAt} dateModified={page.updatedAt} />

        <DeferredShareWidget
          title={page.title}
          description={page.summary}
          path={path}
          contentType="article"
          contentId={page.slug}
        />
      </div>
    </main>
  );
}
