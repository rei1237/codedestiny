import Link from "next/link";
import { buildSeoMetadata } from "../../lib/seo";
import { buildAboutPageJsonLd, buildOrganizationJsonLd } from "../../lib/structured-data";
import { publicSeoPages } from "../../lib/seo/siteSeo";

const seo = publicSeoPages.about;

export const metadata = buildSeoMetadata(seo);

const ABOUT_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    "title": "Code Destiny 소개",
    "intro": "Code Destiny는 무료 사주팔자, 만세력, 타로, 오늘의 운세, 궁합, 자미두수, 점성술, 숙요점을 한곳에서 살펴볼 수 있는 한국어 운세 플랫폼입니다. 모든 해석은 오락과 자기성찰을 돕는 참고 자료로 제공됩니다.",
    "services.title": "제공 서비스",
    "services.saju": "사주 만세력, 오행, 십성, 대운 흐름 해석",
    "services.tarot": "타로 카드 리딩과 연애, 재회, 마음 해석",
    "services.systems": "자미두수, 점성술, 숙요점, 궁합, 오늘의 운세",
    "services.premium": "프리미엄 리포트와 공개 가이드 문서",
    "principles.title": "운영 원칙",
    "principles.body": "개인의 선택을 대신하거나 불안을 조장하는 표현을 지양합니다. 건강, 법률, 투자, 금융처럼 전문 판단이 필요한 영역은 반드시 해당 분야 전문가와 상담해야 합니다.",
    "docs.title": "관련 문서",
    "docs.methodology": "운세 콘텐츠 방법론",
    "docs.faq": "자주 묻는 질문",
    "docs.disclaimer": "면책 고지",
    "docs.insights": "운세 인사이트 가이드",
  },
  en: {
    "title": "About Code Destiny",
    "intro": "Code Destiny is a Korean fortune platform where you can explore free Saju, Manseryeok, tarot, today's fortune, compatibility, Zi Wei Dou Shu, astrology, and Sukuyo in one place. Every reading is provided as a reference for entertainment and self-reflection.",
    "services.title": "Services",
    "services.saju": "Saju calendar, five elements, ten gods, and luck-cycle interpretation",
    "services.tarot": "Tarot readings for love, reunion, and emotional insight",
    "services.systems": "Zi Wei Dou Shu, astrology, Sukuyo, compatibility, and today's fortune",
    "services.premium": "Premium reports and public guide documents",
    "principles.title": "Operating Principles",
    "principles.body": "We avoid language that replaces personal choice or amplifies anxiety. Areas requiring professional judgment, such as health, law, investment, and finance, should always be discussed with qualified experts.",
    "docs.title": "Related Documents",
    "docs.methodology": "Fortune Content Methodology",
    "docs.faq": "FAQ",
    "docs.disclaimer": "Disclaimer",
    "docs.insights": "Fortune Insight Guide",
  },
  ja: {
    "title": "Code Destiny について",
    "intro": "Code Destinyは、無料の四柱推命、万年暦、タロット、今日の運勢、相性、紫微斗数、占星術、宿曜を一か所で見られる韓国語の占いプラットフォームです。すべての解釈は、娯楽と自己省察を助ける参考資料として提供されます。",
    "services.title": "提供サービス",
    "services.saju": "四柱推命の万年暦、五行、十神、大運の流れの解釈",
    "services.tarot": "タロットカードリーディング、恋愛、復縁、気持ちの解釈",
    "services.systems": "紫微斗数、占星術、宿曜、相性、今日の運勢",
    "services.premium": "プレミアムレポートと公開ガイド文書",
    "principles.title": "運営方針",
    "principles.body": "個人の選択を代行したり、不安をあおる表現は避けます。健康、法律、投資、金融のように専門的判断が必要な領域は、必ず該当分野の専門家に相談してください。",
    "docs.title": "関連文書",
    "docs.methodology": "占いコンテンツ方法論",
    "docs.faq": "よくある質問",
    "docs.disclaimer": "免責事項",
    "docs.insights": "占いインサイトガイド",
  },
  zh: {
    "title": "Code Destiny 介绍",
    "intro": "Code Destiny 是一个韩语占卜平台，可在一处查看免费四柱八字、万年历、塔罗、今日运势、合盘、紫微斗数、占星术与宿曜。所有解读均作为娱乐与自我觉察的参考资料提供。",
    "services.title": "提供服务",
    "services.saju": "四柱万年历、五行、十神、大运流向解读",
    "services.tarot": "塔罗牌解读以及恋爱、复合、内心解析",
    "services.systems": "紫微斗数、占星术、宿曜、合盘、今日运势",
    "services.premium": "高级报告与公开指南文档",
    "principles.title": "运营原则",
    "principles.body": "我们避免代替个人选择或制造不安的表达。健康、法律、投资、金融等需要专业判断的领域，必须咨询相关领域专家。",
    "docs.title": "相关文档",
    "docs.methodology": "占卜内容方法论",
    "docs.faq": "常见问题",
    "docs.disclaimer": "免责声明",
    "docs.insights": "运势洞察指南",
  },
};

function aboutPageText(key) {
  return ABOUT_PAGE_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    buildOrganizationJsonLd(),
    buildAboutPageJsonLd({
      path: "/about",
      title: seo.title,
      description: seo.description,
    }),
  ],
});

export default function AboutPage() {
  return (
    <main className="cd-main-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <header className="cd-main-header">
        <h1 className="cd-main-title">{aboutPageText("title")}</h1>
        <p className="cd-main-intro">
          {aboutPageText("intro")}
        </p>
      </header>

      <section className="cd-card">
        <h2>{aboutPageText("services.title")}</h2>
        <ul>
          <li>{aboutPageText("services.saju")}</li>
          <li>{aboutPageText("services.tarot")}</li>
          <li>{aboutPageText("services.systems")}</li>
          <li>{aboutPageText("services.premium")}</li>
        </ul>
      </section>

      <section className="cd-card">
        <h2>{aboutPageText("principles.title")}</h2>
        <p>
          {aboutPageText("principles.body")}
        </p>
      </section>

      <section className="cd-card">
        <h2>{aboutPageText("docs.title")}</h2>
        <div className="cd-chip-wrap">
          <Link href="/methodology" className="cd-chip">{aboutPageText("docs.methodology")}</Link>
          <Link href="/faq" className="cd-chip">{aboutPageText("docs.faq")}</Link>
          <Link href="/disclaimer" className="cd-chip">{aboutPageText("docs.disclaimer")}</Link>
          <Link href="/high-value" className="cd-chip">{aboutPageText("docs.insights")}</Link>
        </div>
      </section>
    </main>
  );
}
