/* 무료 홍보 칩(사주 결과 안 카드 9개)의 설명 상세 페이지. 서버 컴포넌트다.
   문구·경로·색인 여부는 lib/marketing/free-feature-details.mjs 한곳에서 읽는다.
   이 화면은 기능을 직접 열지 않는다. 시작 버튼은 셸의 사주 입력(cdOneStepFreeSajuEntry)으로 보내고,
   결과 화면의 어느 카드에서 열리는지를 그대로 알려 준다. */
import { Fragment } from "react";
import Link from "next/link";
import { ArrowRight, Check, Compass, Sparkles } from "lucide-react";
import ContentIntegrityNote from "../ContentIntegrityNote";
import { FOCUS_RING, MoonMark, SectionHead } from "../seo-landing-parts";
import { serializeJsonLd } from "../../../lib/seo/json-ld.mjs";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd, buildWebPageJsonLd } from "../../../lib/structured-data";
import {
  FREE_FEATURE_DETAILS,
  FREE_FEATURE_DETAIL_CTA_HREF,
  freeFeatureFreeUntilLabel,
  getFreeFeatureDetail,
  resolveFreeFeatureCopy,
} from "../../../lib/marketing/free-feature-details.mjs";

const PRIMARY_BUTTON = `inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--cd-r-control,12px)] bg-[var(--cd-primary)] px-7 text-[0.94rem] font-semibold text-[var(--cd-primary-ink)] transition-[background-color,box-shadow,transform] duration-200 ease-out hover:bg-[var(--cd-primary-hover)] hover:shadow-[var(--cd-shadow)] motion-safe:hover:-translate-y-0.5 ${FOCUS_RING}`;
const BODY_TEXT = "max-w-[68ch] break-keep text-[0.98rem] leading-[1.85] text-[var(--cd-text-muted)] [text-wrap:pretty]";
const SECTION_GAP = "mt-[clamp(3rem,7vw,4.5rem)]";

function StartButton({ path, placement }: { path: string; placement: string }) {
  return (
    <Link
      href={FREE_FEATURE_DETAIL_CTA_HREF}
      data-cd-cross-sell={path}
      data-cd-cta-placement={placement}
      className={PRIMARY_BUTTON}
    >
      <Compass className="h-4 w-4" aria-hidden="true" />
      사주 입력하고 무료로 열기
    </Link>
  );
}

function HeroVisual({ detail }: { detail: (typeof FREE_FEATURE_DETAILS)[number] }) {
  if (detail.image) {
    return (
      <figure className="overflow-hidden rounded-[var(--cd-r-section,24px)] border border-[var(--cd-border)] bg-[var(--cd-surface)]">
        {/* 공용 그림이라 next/image 최적화 없이 원본을 쓴다(next.config images.unoptimized). 크기를 적어 자리 이동을 막는다. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={encodeURI(detail.image.src)}
          alt={detail.image.alt}
          width={detail.image.width}
          height={detail.image.height}
          fetchPriority="high"
          decoding="async"
          className="block h-auto w-full"
        />
      </figure>
    );
  }
  const glyphs: string[][] = Array.isArray(detail.heroGlyphs) ? detail.heroGlyphs : [];
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-4 gap-2 rounded-[var(--cd-r-section,24px)] border border-[var(--cd-border)] bg-[var(--cd-surface)] p-[clamp(1rem,3vw,1.75rem)]"
    >
      {glyphs.map(([glyph, reading]) => (
        <div
          key={glyph}
          className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-[var(--cd-r-control,12px)] border border-[var(--cd-border)] bg-[var(--cd-bg)]"
        >
          <span className="font-[family-name:var(--font-serif)] text-[clamp(2rem,6vw,3.25rem)] font-bold leading-none text-[var(--cd-text)]">
            {glyph}
          </span>
          <span className="text-[0.8rem] text-[var(--cd-text-muted)]">{reading}</span>
        </div>
      ))}
    </div>
  );
}

export default function FreeFeatureDetail({ slug }: { slug: string }) {
  const detail = getFreeFeatureDetail(slug);
  const copy = resolveFreeFeatureCopy(detail);
  const freeUntil = freeFeatureFreeUntilLabel();
  const others = FREE_FEATURE_DETAILS.filter((item) => item.slug !== detail.slug);
  const openNote = `사주 결과 화면의 '${detail.cardName}' 카드에서 열려요.`;
  const breadcrumb = [
    { name: "홈", path: "/" },
    { name: "사주", path: "/saju" },
    { name: detail.name, path: detail.path },
  ];

  const webPageJsonLd = buildWebPageJsonLd({ title: detail.title, description: detail.description, path: detail.path });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumb);
  const faqJsonLd = buildFaqPageJsonLd(copy.faq);

  return (
    <main
      data-free-feature-detail={detail.id}
      className="relative isolate min-h-[100dvh] bg-[var(--cd-bg)] px-4 pb-16 pt-6 text-[var(--cd-text)] md:px-6 md:pb-24 md:pt-10"
    >
      <div className="mx-auto w-full max-w-5xl">
        <nav aria-label="Breadcrumb" className="-my-2 flex flex-wrap items-center gap-x-2 text-[0.8rem] text-[var(--cd-text-muted)]">
          {breadcrumb.map((item, index) => (
            <Fragment key={item.path}>
              {index > 0 ? (
                <span aria-hidden="true" className="text-[var(--cd-border)]">
                  /
                </span>
              ) : null}
              <Link
                href={item.path === "/" ? "/" : `${item.path}/`}
                aria-current={index === breadcrumb.length - 1 ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-[4px] py-2 underline-offset-4 transition-colors duration-200 hover:text-[var(--cd-accent)] hover:underline ${FOCUS_RING}`}
              >
                {item.name}
              </Link>
            </Fragment>
          ))}
        </nav>

        <header className="mt-[clamp(1.75rem,5vw,3rem)] grid items-center gap-[clamp(2rem,5vw,3.5rem)] border-b border-[var(--cd-border)] pb-[clamp(2.5rem,6vw,4rem)] md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div>
            <p className="flex items-center gap-2.5 text-[0.85rem] font-semibold text-[var(--cd-text-muted)]">
              <MoonMark />
              <span className="font-[family-name:var(--font-serif)] tracking-[0.02em]">꿀꿀 운세</span>
            </p>
            <p className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1 text-[0.8rem] font-semibold text-[var(--cd-accent)]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {freeUntil}
            </p>
            <h1 className="mt-4 max-w-[18ch] break-keep font-[family-name:var(--font-serif)] text-[clamp(2rem,5.4vw,3.4rem)] font-bold leading-[1.18] tracking-[-0.02em] text-[var(--cd-text)] [text-wrap:balance]">
              {detail.h1}
            </h1>
            <p className="mt-5 max-w-[46ch] break-keep text-[1.05rem] font-semibold leading-[1.75] text-[var(--cd-text)] [text-wrap:pretty]">
              {copy.headline}
            </p>
            {copy.subheadline ? <p className={`mt-3 ${BODY_TEXT}`}>{copy.subheadline}</p> : null}
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:items-start">
              <StartButton path={detail.href} placement="free_feature_hero" />
              <p className="break-keep text-[0.86rem] leading-[1.7] text-[var(--cd-text-muted)]">{openNote}</p>
            </div>
          </div>
          <HeroVisual detail={detail} />
        </header>

        <section aria-labelledby="ffPreview" className={SECTION_GAP}>
          <SectionHead id="ffPreview" title="미리 보기" />
          {copy.previewText ? <p className={`mt-5 ${BODY_TEXT}`}>{copy.previewText}</p> : null}
          {copy.answersQuestions.length ? (
            <>
              <h3 className="mt-7 text-[1rem] font-bold text-[var(--cd-text)]">이 카드가 답하는 질문</h3>
              <ul className="mt-3 max-w-[68ch]">
                {copy.answersQuestions.map((question) => (
                  <li key={question} className="break-keep border-b border-[var(--cd-border)] py-3 text-[0.95rem] leading-[1.7] text-[var(--cd-text)]">
                    {question}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <section aria-labelledby="ffGets" className={SECTION_GAP}>
          <SectionHead id="ffGets" title="열면 볼 수 있는 것" />
          <ul className="mt-5 grid gap-x-10 md:grid-cols-2">
            {copy.feats.map((feat) => (
              <li key={feat} className="flex gap-3 border-b border-[var(--cd-border)] py-3.5">
                <Check className="mt-1 h-4 w-4 shrink-0 text-[var(--cd-accent)]" aria-hidden="true" />
                <span className="break-keep text-[0.95rem] leading-[1.75] text-[var(--cd-text)]">{feat}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="ffSteps" className={SECTION_GAP}>
          <SectionHead id="ffSteps" title="읽는 순서" />
          <ol className="mt-5 max-w-[68ch] list-decimal space-y-4 pl-5 marker:text-[var(--cd-text-muted)]">
            {copy.analysisSteps.map((step) => (
              <li key={step.label} className="break-keep pl-1 text-[0.95rem] leading-[1.75] text-[var(--cd-text-muted)]">
                <strong className="font-semibold text-[var(--cd-text)]">{step.label}</strong>
                {" — "}
                {step.detail}
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="ffFor" className={SECTION_GAP}>
          <SectionHead id="ffFor" title="이런 분께 맞아요" />
          <div className={`mt-5 grid gap-x-10 gap-y-6 ${copy.painPoints.length ? "md:grid-cols-2" : ""}`}>
            <ul>
              {copy.recommendedFor.map((item) => (
                <li key={item} className="break-keep border-b border-[var(--cd-border)] py-3 text-[0.95rem] leading-[1.7] text-[var(--cd-text)]">
                  {item}
                </li>
              ))}
            </ul>
            {copy.painPoints.length ? (
              <div>
                <h3 className="text-[1rem] font-bold text-[var(--cd-text)]">이럴 때 열어 보세요</h3>
                <ul className="mt-2">
                  {copy.painPoints.map((item) => (
                    <li key={item} className="break-keep border-b border-[var(--cd-border)] py-3 text-[0.95rem] leading-[1.7] text-[var(--cd-text-muted)]">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="ffFaq" className={SECTION_GAP}>
          <SectionHead id="ffFaq" title="자주 묻는 질문" />
          <div className="mt-3 max-w-[68ch]">
            {copy.faq.map((item) => (
              <details key={item.question} className="group border-b border-[var(--cd-border)]">
                <summary
                  className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-[4px] py-3 text-[0.98rem] font-semibold text-[var(--cd-text)] [&::-webkit-details-marker]:hidden ${FOCUS_RING}`}
                >
                  <span className="break-keep">{item.question}</span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-[var(--cd-text-muted)] transition-transform duration-200 group-open:rotate-90"
                    aria-hidden="true"
                  />
                </summary>
                <p className="break-keep pb-4 text-[0.95rem] leading-[1.8] text-[var(--cd-text-muted)]">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="ffStart"
          className={`${SECTION_GAP} rounded-[var(--cd-r-section,24px)] border border-[var(--cd-border)] bg-[var(--cd-surface)] p-[clamp(1.25rem,4vw,2.5rem)]`}
        >
          <h2 id="ffStart" className="font-[family-name:var(--font-serif)] text-[clamp(1.3rem,3vw,1.7rem)] font-bold text-[var(--cd-text)]">
            사주 결과에서 바로 열어 보세요
          </h2>
          <p className={`mt-3 ${BODY_TEXT}`}>
            생년월일시를 넣으면 사주 결과가 열려요. {openNote} {freeUntil}예요.
          </p>
          <div className="mt-6">
            <StartButton path={detail.href} placement="free_feature_bottom" />
          </div>
          {copy.trustNotes.length ? (
            <ul className="mt-6 space-y-1.5 text-[0.85rem] leading-[1.7] text-[var(--cd-text-muted)]">
              {copy.trustNotes.map((note) => (
                <li key={note} className="break-keep">
                  {note}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section aria-labelledby="ffOthers" className={SECTION_GAP}>
          <SectionHead id="ffOthers" title="함께 열려 있는 무료 기능" />
          <ul className="mt-4 grid gap-x-8 sm:grid-cols-2 md:grid-cols-3">
            {others.map((item) => (
              <li key={item.slug} className="border-b border-[var(--cd-border)]">
                <Link
                  href={item.href}
                  className={`group flex min-h-11 items-center justify-between gap-3 py-2.5 text-[0.95rem] text-[var(--cd-text)] transition-colors duration-200 hover:text-[var(--cd-accent)] ${FOCUS_RING}`}
                >
                  <span className="min-w-0 break-keep">{item.name}</span>
                  <ArrowRight
                    className="h-3.5 w-3.5 shrink-0 text-[var(--cd-text-muted)] transition-transform duration-200 ease-out group-hover:text-[var(--cd-accent)] motion-safe:group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <ContentIntegrityNote tone="light" contentPath={detail.path} />
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }} />
    </main>
  );
}
