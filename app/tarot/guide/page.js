import TarotGuideRouteClient from "./TarotGuideRouteClient";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import ContentIntegrityNote from "../../components/ContentIntegrityNote";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "../../../lib/structured-data";
import { TAROT_GUIDE_FAQ_KO } from "./tarot-guide-faq";

const TAROT_GUIDE_METADATA_COPY = {
  ko: {
    title: "타로 카드 리딩 입문 | Code Destiny",
    description:
      "타로 리딩의 기본 구조, 좋은 질문을 세우는 법, 카드 배열과 해석 흐름, 리딩을 안전하게 받아들이는 기준을 안내합니다.",
    keywords: ["타로 가이드", "타로 리딩", "타로 카드", "카드 배열", "Code Destiny"],
  },
  en: {
    title: "Beginner's Guide to Tarot Reading | Code Destiny",
    description:
      "Learn the basic structure of tarot reading, how to shape a question, card spreads, interpretation flow, and the difference between free and paid readings.",
    keywords: ["tarot guide", "tarot reading", "tarot cards", "card spread", "Code Destiny"],
  },
  ja: {
    title: "タロットカードリーディング入門 | Code Destiny",
    description:
      "タロットリーディングの基本構造、質問の立て方、カードスプレッド、解釈の流れ、無料・有料リーディングの違いと注意点を案内します。",
    keywords: ["タロットガイド", "タロットリーディング", "タロットカード", "カードスプレッド", "Code Destiny"],
  },
  zh: {
    title: "塔罗牌解读入门 | Code Destiny",
    description:
      "了解塔罗解读的基本结构、提问方式、牌阵与解读流程，以及免费和付费解读的差异与注意事项。",
    keywords: ["塔罗指南", "塔罗解读", "塔罗牌", "牌阵", "Code Destiny"],
  },
};

export function generateMetadata() {
  const copy = TAROT_GUIDE_METADATA_COPY.ko;
  return generatePageMetadata({
    path: "/tarot/guide",
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
  });
}

// 발행일은 이 파일의 첫 커밋일(git log --diff-filter=A), 수정일은 검수 노트·Article 을 붙인 날.
// 짝 구현: app/guides/[slug]/page.js 의 @graph(BreadcrumbList·Article·FAQPage) + ContentIntegrityNote.
// 본문은 클라이언트 컴포넌트(TarotGuideContent)가 그리므로 검수 노트는 여기서 만들어 엘리먼트로 넘긴다.
const GUIDE_ARTICLE = {
  path: "/tarot/guide",
  title: "타로 카드 리딩 입문",
  description: TAROT_GUIDE_METADATA_COPY.ko.description,
  datePublished: "2026-06-21",
  dateModified: "2026-09-06",
};

const guideJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    buildBreadcrumbJsonLd([
      { name: "홈", path: "/" },
      { name: "타로 서비스", path: "/tarot" },
      { name: GUIDE_ARTICLE.title, path: GUIDE_ARTICLE.path },
    ]),
    buildArticleJsonLd({
      ...GUIDE_ARTICLE,
      category: "타로 서비스",
      keywords: TAROT_GUIDE_METADATA_COPY.ko.keywords,
    }),
    // 화면의 FAQ 카드(TarotGuideContent ko)와 같은 정본 배열 — 스키마와 본문이 다른 문답이면 리치결과 정책 위반.
    buildFaqPageJsonLd(TAROT_GUIDE_FAQ_KO),
  ],
});

export default function TarotGuidePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: guideJsonLd }} />
      <TarotGuideRouteClient
        integrityNote={
          <ContentIntegrityNote
            contentSource="authored"
            datePublished={GUIDE_ARTICLE.datePublished}
            dateModified={GUIDE_ARTICLE.dateModified}
            tone="dark"
          />
        }
      />
    </>
  );
}
