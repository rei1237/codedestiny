"use client";

/**
 * FortunePageSEO — 운세 서비스 페이지의 시맨틱 HTML 구조 + JSON-LD 래퍼.
 *
 * 역할:
 *  1. div 대신 <article> + <header> + <section> 등 시맨틱 태그를 제공
 *  2. h1 타이틀과 p 리드 문구를 항상 렌더링해 Thin Content 방지
 *  3. buildFortuneJsonLd()로 SoftwareApplication + WebPage 구조화 데이터 삽입
 *  4. FAQ 섹션이 있으면 FAQPage 스키마도 자동으로 추가
 *
 * 사용 예시:
 *   <FortunePageSEO
 *     title="무료 사주 기본 풀이"
 *     description="생년월일·시간으로 보는 심층 사주팔자 분석."
 *     path="/saju/basic"
 *     keywords={["무료 사주", "사주팔자"]}
 *     featureList={["사주팔자 기초 분석", "오행 균형 해석"]}
 *     faqs={[
 *       { question: "사주팔자란?", answer: "태어난 연·월·일·시의 사주와 여덟 글자 팔자." },
 *     ]}
 *   >
 *     {children} ← 실제 서비스 UI
 *   </FortunePageSEO>
 */

import { buildFortuneJsonLd, type FortunePageMeta } from "../../lib/generate-page-metadata";

interface FaqItem {
  question: string;
  answer: string;
}

interface FortunePageSEOProps extends FortunePageMeta {
  /** 실제 서비스 UI */
  children: React.ReactNode;
  /** FAQ 섹션 데이터. 있으면 FAQPage 스키마 + 시맨틱 FAQ 섹션 자동 렌더링 */
  faqs?: FaqItem[];
  /** h1 아래 표시할 리드 문구. description이 기본값 */
  lead?: string;
  /** true이면 헤더(title+lead)를 화면에 렌더링하지 않음 (UI에서 직접 구현한 경우) */
  hideHeader?: boolean;
}

const SITE_ORIGIN = "https://code-destiny.com";

function buildFaqJsonLd(faqs: FaqItem[]): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
    publisher: { "@id": `${SITE_ORIGIN}/#organization` },
  });
}

export default function FortunePageSEO({
  children,
  faqs,
  lead,
  hideHeader = false,
  ...meta
}: FortunePageSEOProps) {
  const fortuneJsonLd = buildFortuneJsonLd(meta);
  const faqJsonLd =
    Array.isArray(faqs) && faqs.length > 0 ? buildFaqJsonLd(faqs) : null;

  return (
    <>
      {/* 구조화 데이터: SoftwareApplication + WebPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: fortuneJsonLd }}
      />
      {/* 구조화 데이터: FAQPage (있을 때만) */}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: faqJsonLd }}
        />
      )}

      {/*
       * article: 독립적인 운세 서비스 페이지임을 검색 엔진에 명시.
       * itemScope / itemType: Schema.org WebPage 마이크로데이터 병행 지원.
       */}
      <article
        itemScope
        itemType="https://schema.org/WebPage"
        aria-label={meta.title}
      >
        {/* 페이지 헤더: 항상 h1을 갖도록 강제해 Thin Content 방지 */}
        {!hideHeader && (
          <header className="fortune-seo-header sr-only">
            <h1 itemProp="name">{meta.title}</h1>
            <p itemProp="description">{lead ?? meta.description}</p>
          </header>
        )}

        {/* 실제 서비스 UI */}
        <section aria-label={`${meta.title} 서비스 영역`}>{children}</section>

        {/* FAQ 섹션: 있을 때만 렌더링 (검색 리치 결과 대상) */}
        {Array.isArray(faqs) && faqs.length > 0 && (
          <section
            aria-label="자주 묻는 질문"
            itemScope
            itemType="https://schema.org/FAQPage"
            className="fortune-seo-faq"
          >
            <h2 className="sr-only">자주 묻는 질문</h2>
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                itemScope
                itemProp="mainEntity"
                itemType="https://schema.org/Question"
              >
                <h3 itemProp="name" className="sr-only">
                  {faq.question}
                </h3>
                <div
                  itemScope
                  itemProp="acceptedAnswer"
                  itemType="https://schema.org/Answer"
                >
                  <span itemProp="text" className="sr-only">
                    {faq.answer}
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}
      </article>
    </>
  );
}
