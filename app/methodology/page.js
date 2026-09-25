import Link from "next/link";
import { buildSeoMetadata } from "../../lib/seo";
import { buildAuthorPersonJsonLd, buildBreadcrumbJsonLd, buildWebPageJsonLd, SITE_AUTHOR } from "../../lib/structured-data";
import { publicSeoPages } from "../../lib/seo/siteSeo";
import { getEditorNote } from "../_content/editor-notes";
import EditorNote from "../components/EditorNote";

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
    humanDesignGuide: "휴먼 디자인 계산과 이용 안내",
    disclaimer: "면책 고지",
    contact: "문의하기",
    editorial: "콘텐츠 편집 원칙",
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
        body: "명식·행성 위치·27숙 같은 기초 값은 계산 엔진이 산출합니다. 출생 정보뿐 아니라 장소·시간대·계산 설정과 엔진 버전까지 같을 때 같은 계산값을 비교할 수 있습니다. 입력이 같아도 다시 뽑는 타로 카드와 생성형 AI의 해설 문장은 달라질 수 있습니다. AI를 사용하는 기능에서는 산출된 값을 해설의 근거로 삼습니다. 개별 원고의 전문가 검수 여부는 해당 글의 제작·검수 안내에서 확인할 수 있습니다.",
      },
      {
        title: "사주: 간지와 절기에서 시작합니다",
        body: "생년월일과 출생시간을 바탕으로 연·월·일·시의 간지를 세우고 오행과 십성의 관계를 살핍니다. 연·월의 경계에는 절기가 쓰이므로 생일 숫자만으로 결과를 비교하기보다 양력·음력 선택, 출생시간과 해당 화면의 시간 보정 조건을 함께 확인해야 합니다. 계산된 명식과 그 명식을 읽는 해설은 구분해서 제공합니다.",
      },
      {
        title: "자미두수: 12궁의 별 배치를 읽습니다",
        body: "출생 정보를 바탕으로 명궁과 12궁을 정하고 주성·보성·사화의 배치를 해석합니다. 사주와 출생 정보를 공유하더라도 같은 계산표는 아닙니다. 출생시간을 모르거나 임시값을 사용했다면 명반이 달라질 수 있으므로 입력 조건과 결과 화면의 안내를 먼저 확인해야 합니다.",
      },
      {
        title: "서양 점성술: 행성과 하우스를 구분합니다",
        body: "출생 시각과 장소를 바탕으로 행성의 위치와 상승점, 하우스를 계산합니다. 행성의 위치와 생활 영역을 나타내는 하우스는 읽는 대상이 다릅니다. 출생시간·장소가 불확실하면 상승점과 하우스 해석에도 한계가 있습니다. 기능별 계산 설정이 다를 수 있으므로 다른 화면의 차트를 비교할 때는 입력과 설정을 함께 확인합니다.",
      },
      {
        title: "베다 점성술: 항성 좌표와 나크샤트라를 읽습니다",
        body: "현재 베다 계산은 Lahiri 아야남샤를 적용한 사이더리얼 좌표를 사용합니다. 아야남샤는 좌표 기준의 차이를 보정하는 값이며, 달의 황경을 27개 구간으로 나누어 나크샤트라를 구합니다. 서양 점성술과 이름이 비슷한 요소도 좌표와 해석 체계가 다르므로 같은 뜻으로 바꾸어 읽지 않습니다.",
      },
      {
        title: "숙요점: 현재 서비스의 27숙 산출 방식",
        body: "현재 서비스는 입력 시각을 UTC와 율리우스일로 정규화한 뒤, Swiss Ephemeris에서 얻은 Lahiri 기준 지구 중심 항성 달 황경을 27개 같은 구간으로 나눕니다. 그 구간을 고정된 대응 규칙으로 숙 배열에 연결해 본명숙을 구합니다. 음력 입력의 변환이나 음력 날짜 표시는 이 계산과 별도이며, 음력 월·일 표만으로 숙을 고르는 전통 달력식과 결과가 다를 수 있습니다. 나크샤트라와 계산 좌표를 공유해도 두 체계의 이름·관계 해석이 같다는 뜻은 아닙니다.",
      },
      {
        title: "타로: 카드 선택과 해석은 별도 단계입니다",
        body: "타로는 생년월일로 명식을 만드는 방식과 다릅니다. 기능에서 정한 카드 묶음과 배열에 따라 카드를 선택하거나 섞어 뽑고, 카드의 자리와 정·역방향 등 해당 기능의 조건을 해석에 반영합니다. 다시 뽑으면 카드가 달라질 수 있으며, 생일 수를 사용하는 타로 등은 해당 화면의 방식을 따릅니다. 카드와 AI의 해설은 상대의 마음이나 미래 사건을 확인한 사실이 아닙니다.",
      },
      {
        title: "무엇을 근거로 쓰지 않는가",
        body: "출처를 확인할 수 없는 속설, 특정 인물이나 집단을 단정하는 서술, 공포를 유발해 결제를 유도하는 표현은 근거로 쓰지 않습니다. 전통 문헌에 나오더라도 현대의 상식이나 인권 기준에 어긋나는 해석은 그대로 옮기지 않고, 옮겨야 할 맥락이 있으면 그것이 옛 서술임을 밝힙니다. 특정 날짜에 사고가 난다거나 특정 질병에 걸린다는 식의 단정은 어떤 체계에서도 지지되지 않으므로 쓰지 않습니다.",
      },
      {
        title: "한계와 반증 가능성",
        body: "운세 해석은 반증 가능한 과학적 예측이 아닙니다. 같은 명식을 두 사람이 읽으면 강조점이 달라질 수 있고, 맞았다고 느끼는 문장은 누구에게나 해당하는 서술일 수 있습니다. Code Destiny는 이 한계를 감추지 않는 것을 원칙으로 하며, 해석을 읽을 때 맞은 문장과 틀린 문장을 함께 세어 보기를 권합니다. 결과가 현실 판단을 대신하도록 쓰이는 순간, 이 콘텐츠는 의도한 용도에서 벗어납니다.",
      },
      {
        title: "검수자와 검수 기준",
        body: `콘텐츠 검수 책임자는 ${SITE_AUTHOR.name}(${SITE_AUTHOR.jobTitle}, 명리 10년)입니다. 책임자 지정과 개별 글의 검수 완료는 다릅니다. 실제 검수 기록이 확인된 글에만 검수자와 검수일을 표시합니다. 검수는 세 가지를 봅니다. 첫째, 명식·별자리·27수 같은 계산값이 엔진 산출과 일치하는지 — 해설이 실제 명식에 없는 십성이나 오행을 말하면 그 문장을 고칩니다. 둘째, 해석이 고전 명리의 통상 읽기 범위 안에 있는지 — 한 유파의 소수 견해를 정설처럼 쓰지 않고, 견해가 갈리는 대목은 갈린다고 적습니다. 셋째, 표현이 과장·불안 조장·의료·법률·금융 조언으로 읽히지 않는지. 검수자 소개와 책임 주체는 서비스 소개 페이지의 '만드는 사람과 책임' 절에 있습니다.`,
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
    humanDesignGuide: "Human Design calculation and usage guide",
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
    humanDesignGuide: "ヒューマンデザインの計算と使い方",
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
    buildAuthorPersonJsonLd(),
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

      <EditorNote note={getEditorNote("/methodology")} className="cd-editor-note" />

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
        <Link href="/guides" className="cd-chip">{methodologyCopy.insightGuide}</Link>
        <Link href="/human-design/guide/" className="cd-chip">{methodologyCopy.humanDesignGuide}</Link>
        <Link href="/disclaimer" className="cd-chip">{methodologyCopy.disclaimer}</Link>
        <Link href="/contact" className="cd-chip">{methodologyCopy.contact}</Link>
        <Link href="/editorial-policy/" className="cd-chip">{methodologyCopy.editorial}</Link>
      </nav>
    </main>
  );
}
