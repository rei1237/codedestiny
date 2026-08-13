import Link from "next/link";
import { buildSeoMetadata } from "../../lib/seo";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../lib/structured-data";
import { publicSeoPages } from "../../lib/seo/siteSeo";

const seo = publicSeoPages.methodology;

export const metadata = buildSeoMetadata(seo);

const METHODOLOGY_TEXT_TRANSLATIONS = {
  ko: {
    home: "홈",
    breadcrumb: "운세 콘텐츠 방법론과 면책 고지",
    title: "운세 콘텐츠 방법론과 면책 고지",
    intro: "Code Destiny의 운세 해석은 전통 상징 체계와 현대적인 자기성찰 문장을 결합해 제공합니다.\n검색엔진과 사용자에게 같은 본문, 같은 고지, 같은 내부 링크를 보여주는 것을 원칙으로 합니다.",
    relatedAria: "방법론 관련 링크",
    faq: "자주 묻는 질문",
    insightGuide: "운세 인사이트 가이드",
    disclaimer: "면책 고지",
    contact: "문의하기",
    sections: [
      {
        title: "콘텐츠 작성 기준",
        body: "사주, 타로, 자미두수, 점성술, 숙요점은 서로 다른 상징 체계를 사용합니다. Code Destiny는 각 체계의 기본 개념을 분리해 설명하고, 결과 문장은 사용자가 현실의 선택지를 점검할 수 있도록 작성합니다.",
      },
      {
        title: "검증과 업데이트",
        body: "공개 가이드와 FAQ는 표현 오류, 과장 문구, 내부 작업용 문구가 노출되지 않도록 점검합니다. 서비스 정책이나 기능이 변경되면 관련 문서와 내부 링크를 함께 갱신합니다.",
      },
      {
        title: "계산과 AI의 역할",
        body: "명식·별자리·27수 같은 기초 값은 AI가 아니라 결정론적 계산 엔진이 산출합니다. 같은 생년월일시를 넣으면 언제나 같은 값이 나옵니다. 그 값을 사람이 읽을 수 있는 해설 문장으로 옮기는 단계에서 생성형 AI를 사용하며, 공개 문서는 게시 전에 과장 표현, 불안 조장, 의료·법률·금융 조언으로 오해될 수 있는 문장을 기준에 따라 점검합니다. 자세한 제작·검수 기준은 콘텐츠 제작 및 AI 활용 고지에서 확인할 수 있습니다.",
      },
      {
        title: "면책 고지",
        body: "운세 콘텐츠는 오락과 자기성찰 목적의 참고 자료입니다. 의료, 법률, 금융, 투자, 진로 계약처럼 중대한 결정은 해당 분야의 전문가와 상담해야 합니다.",
      },
      {
        title: "사용자 보호 원칙",
        body: "불안을 조장하거나 특정 행동을 강요하는 표현을 피합니다. 결과는 가능성과 관찰 포인트를 안내하며, 최종 선택과 책임은 사용자에게 있음을 명확히 고지합니다.",
      },
    ],
  },
  en: {
    home: "Home",
    breadcrumb: "Fortune Content Methodology and Disclaimer",
    title: "Fortune Content Methodology and Disclaimer",
    intro: "Code Destiny combines traditional symbolic systems with modern self-reflection language.\nThe same body text, notices, and internal links are shown to search engines and users.",
    relatedAria: "Methodology related links",
    faq: "FAQ",
    insightGuide: "Fortune Insight Guide",
    disclaimer: "Disclaimer",
    contact: "Contact",
    sections: [
      { title: "Content Standards", body: "Saju, tarot, Zi Wei Dou Shu, astrology, and Sukuyo use different symbolic systems. Code Destiny explains the basic concepts separately and writes result text so users can review real choices." },
      { title: "Review and Updates", body: "Public guides and FAQs are checked so broken copy, exaggerated wording, and internal work notes are not exposed. When policies or features change, related documents and internal links are updated together." },
      { title: "What the engine computes and what AI writes", body: "The underlying values — birth chart, planetary positions, the 27 lunar mansions — come from deterministic calculation engines, not from AI. The same birth data always produces the same values. Generative AI is used at the next step, turning those values into readable explanations, and published documents are checked against our standards for exaggeration, anxiety-inducing wording, and phrasing that could be mistaken for medical, legal, or financial advice. Full production and review standards are set out in our content and AI disclosure." },
      { title: "Disclaimer", body: "Fortune content is reference material for entertainment and self-reflection. Important decisions such as medical, legal, financial, investment, or career contracts should be discussed with qualified professionals." },
      { title: "User Protection Principles", body: "We avoid wording that stirs anxiety or pressures a specific action. Results guide possibilities and observation points, while making clear that final choices and responsibility remain with the user." },
    ],
  },
  ja: {
    home: "ホーム",
    breadcrumb: "運勢コンテンツの方法論と免責",
    title: "運勢コンテンツの方法論と免責",
    intro: "Code Destinyの運勢解釈は、伝統的な象徴体系と現代的な自己省察の言葉を組み合わせて提供します。\n検索エンジンとユーザーに、同じ本文、同じ告知、同じ内部リンクを示すことを原則とします。",
    relatedAria: "方法論関連リンク",
    faq: "よくある質問",
    insightGuide: "運勢インサイトガイド",
    disclaimer: "免責事項",
    contact: "お問い合わせ",
    sections: [
      { title: "コンテンツ作成基準", body: "四柱推命、タロット、紫微斗数、占星術、宿曜はそれぞれ異なる象徴体系を用います。Code Destinyは各体系の基本概念を分けて説明し、結果文は現実の選択肢を見直せるように作成します。" },
      { title: "検証と更新", body: "公開ガイドとFAQは、表現ミス、誇張表現、内部作業用の文言が露出しないよう点検します。サービス方針や機能が変わる場合は、関連文書と内部リンクもあわせて更新します。" },
      { title: "計算とAIの役割", body: "命式・天体位置・二十七宿といった基礎値は、AIではなく決定論的な計算エンジンが算出します。同じ生年月日時を入力すれば常に同じ値になります。その値を読みやすい解説文に移す段階で生成AIを使用し、公開文書は掲載前に誇張表現、不安をあおる表現、医療・法律・金融の助言と誤解されうる文章を基準に沿って点検します。詳しい制作・検収基準はコンテンツ制作およびAI活用の告知に記載しています。" },
      { title: "免責事項", body: "運勢コンテンツは娯楽と自己省察を目的とした参考資料です。医療、法律、金融、投資、進路契約など重要な判断は、該当分野の専門家に相談してください。" },
      { title: "ユーザー保護の原則", body: "不安をあおったり特定の行動を強制したりする表現は避けます。結果は可能性と観察ポイントを案内し、最終的な選択と責任はユーザーにあることを明確に示します。" },
    ],
  },
};

const methodologyCopy = METHODOLOGY_TEXT_TRANSLATIONS.ko;

const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    buildBreadcrumbJsonLd([
      { name: methodologyCopy.home, path: "/" },
      { name: methodologyCopy.breadcrumb, path: "/methodology" },
    ]),
    buildWebPageJsonLd(seo),
  ],
});

const sections = methodologyCopy.sections;

export default function MethodologyPage() {
  return (
    <main className="cd-main-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <header className="cd-main-header">
        <h1 className="cd-main-title">{methodologyCopy.title}</h1>
        <p className="cd-main-intro">
          {methodologyCopy.intro}
        </p>
      </header>

      <section className="cd-card-grid">
        {sections.map((section) => (
          <article key={section.title} className="cd-card">
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </article>
        ))}
      </section>

      <nav className="cd-chip-wrap" aria-label={methodologyCopy.relatedAria}>
        <Link href="/faq" className="cd-chip">{methodologyCopy.faq}</Link>
        <Link href="/high-value" className="cd-chip">{methodologyCopy.insightGuide}</Link>
        <Link href="/disclaimer" className="cd-chip">{methodologyCopy.disclaimer}</Link>
        <Link href="/contact" className="cd-chip">{methodologyCopy.contact}</Link>
      </nav>
    </main>
  );
}
