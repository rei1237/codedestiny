import Link from "next/link";
import { buildSeoMetadata } from "../../lib/seo";
import { buildAboutPageJsonLd, buildOrganizationJsonLd } from "../../lib/structured-data";
import { publicSeoPages } from "../../lib/seo/siteSeo";

const seo = publicSeoPages.about;

export const metadata = buildSeoMetadata(seo);

const ABOUT_PAGE_TEXT_TRANSLATIONS = {
  // 렌더러(aboutPageText)는 현재 ko만 사용한다. AdSense 심사관이 반드시 확인하는
  // 정체성 페이지라 실질 한국어 콘텐츠를 충분히 담았다(신규 키는 렌더 대상 ko에만 둔다).
  ko: {
    "title": "Code Destiny 소개",
    "intro": "Code Destiny(코드 데스티니)는 사주팔자·만세력·타로·자미두수·서양 점성술·베다 점성술·숙요점·궁합·오늘의 운세를 한곳에서 볼 수 있는 한국어 운세 플랫폼입니다. 생년월일과 태어난 시간만 있으면 오행과 십성, 대운의 흐름, 별자리와 27수의 관계까지 차분하게 펼쳐 드립니다. 모든 해석은 미래를 단정하는 예언이 아니라, 오늘의 선택을 정리하고 자신을 돌아보게 돕는 참고 자료로 제공됩니다.",
    "mission.title": "우리가 만들고 싶은 것",
    "mission.body": "운세는 오래전부터 사람들이 자기 삶을 이해하고 마음을 다잡는 언어였습니다. Code Destiny는 그 전통을 재미있고 부담 없이, 그러나 근거 있는 방식으로 전하려 합니다. 무료로 시작하는 기본 리딩부터 더 깊이 들여다보고 싶을 때 선택하는 심화 리포트까지, 필요한 만큼만 열어볼 수 있도록 설계했습니다. 불안을 부추겨 결제를 유도하지 않으며, 결과가 좋든 아쉽든 스스로 결정을 내리는 데 도움이 되는 방향으로 문장을 씁니다.",
    "systems.title": "다루는 운세 체계",
    "systems.saju": "사주팔자·만세력 — 태어난 연·월·일·시를 네 기둥으로 세워 천간과 지지, 오행의 균형과 십성, 대운의 흐름을 읽습니다.",
    "systems.tarot": "타로 — 78장의 상징으로 지금의 질문과 마음의 결을 비추고, 연애·재회·관계·선택의 방향을 정리합니다.",
    "systems.ziwei": "자미두수 — 12궁에 배치된 별들의 자리로 기질, 관계, 일과 재물의 흐름을 입체적으로 살핍니다.",
    "systems.astrology": "점성술 — 태양·달·상승궁과 행성의 각도로 타고난 성향과 시기의 리듬을 해석합니다. 서양 점성술과 베다 점성술을 함께 제공합니다.",
    "systems.sukuyo": "숙요점 — 달이 지나는 27수를 기준으로 사람 사이의 궁합과 거리, 어울리는 시기를 봅니다.",
    "systems.compat": "궁합 — 두 사람의 명식을 나란히 놓고 서로의 기운이 어떻게 만나고 부딪히는지 비교합니다.",
    "content.title": "콘텐츠는 이렇게 만듭니다",
    "content.body": "각 운세의 계산은 명리학·점성술의 고전 규칙과 천문 계산(만세력·에페메리스)을 바탕으로 이루어집니다. 계산 결과를 사람이 읽기 쉬운 해설로 풀어내는 과정에는 생성형 인공지능의 도움을 받되, 방향과 표현이 서비스 기준에 맞는지 사람이 검토합니다. 유명인 사주나 입문 가이드처럼 공개된 글은 사실 관계와 어조를 확인한 뒤 게시하며, 잘못된 부분이 발견되면 바로잡습니다. 운세는 통계나 과학이 아니라 해석의 언어이므로, 단정적인 표현보다 참고와 성찰을 돕는 문장을 우선합니다.",
    "services.title": "제공 서비스",
    "services.saju": "사주 만세력, 오행, 십성, 대운 흐름 해석",
    "services.tarot": "타로 카드 리딩과 연애, 재회, 마음 해석",
    "services.systems": "자미두수, 점성술, 숙요점, 궁합, 오늘의 운세",
    "services.premium": "프리미엄 리포트와 공개 가이드 문서",
    "principles.title": "운영 원칙",
    "principles.body": "개인의 선택을 대신하거나 불안을 조장하는 표현을 지양합니다. 건강·법률·투자·금융처럼 전문적인 판단이 필요한 영역은 반드시 해당 분야 전문가와 상담해야 하며, 어떤 운세 결과도 의료·법률·재무 조언을 대체하지 않습니다. 만 14세 미만 이용자의 개인정보는 별도 기준으로 보호하고, 결제·환불·개인정보 처리 방침은 문서로 공개합니다.",
    "payment.title": "무료와 유료",
    "payment.body": "사주와 타로의 기본 리딩은 부담 없이 무료로 시작할 수 있습니다. 더 깊은 분석이나 PDF 리포트처럼 개인 맞춤형 콘텐츠는 결제 전에 조건과 금액을 분명히 보여드린 뒤 진행합니다. 30일 이용권, 단건 결제, 이벤트로 지급되는 월정석 등 결제 방식의 차이는 구매 전에 안내합니다.",
    "docs.title": "관련 문서",
    "docs.methodology": "운세 콘텐츠 방법론",
    "docs.faq": "자주 묻는 질문",
    "docs.disclaimer": "면책 고지",
    "docs.insights": "운세 인사이트 가이드",
    "docs.privacy": "개인정보처리방침",
    "docs.terms": "이용약관",
    "docs.contact": "문의하기",
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
        <h2>{aboutPageText("mission.title")}</h2>
        <p>
          {aboutPageText("mission.body")}
        </p>
      </section>

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
        <h2>{aboutPageText("systems.title")}</h2>
        <ul>
          <li>{aboutPageText("systems.saju")}</li>
          <li>{aboutPageText("systems.tarot")}</li>
          <li>{aboutPageText("systems.ziwei")}</li>
          <li>{aboutPageText("systems.astrology")}</li>
          <li>{aboutPageText("systems.sukuyo")}</li>
          <li>{aboutPageText("systems.compat")}</li>
        </ul>
      </section>

      <section className="cd-card">
        <h2>{aboutPageText("content.title")}</h2>
        <p>
          {aboutPageText("content.body")}
        </p>
      </section>

      <section className="cd-card">
        <h2>{aboutPageText("principles.title")}</h2>
        <p>
          {aboutPageText("principles.body")}
        </p>
      </section>

      <section className="cd-card">
        <h2>{aboutPageText("payment.title")}</h2>
        <p>
          {aboutPageText("payment.body")}
        </p>
      </section>

      <section className="cd-card">
        <h2>{aboutPageText("docs.title")}</h2>
        <div className="cd-chip-wrap">
          <Link href="/methodology" className="cd-chip">{aboutPageText("docs.methodology")}</Link>
          <Link href="/faq" className="cd-chip">{aboutPageText("docs.faq")}</Link>
          <Link href="/disclaimer" className="cd-chip">{aboutPageText("docs.disclaimer")}</Link>
          <Link href="/high-value" className="cd-chip">{aboutPageText("docs.insights")}</Link>
          <Link href="/privacy" className="cd-chip">{aboutPageText("docs.privacy")}</Link>
          <Link href="/terms" className="cd-chip">{aboutPageText("docs.terms")}</Link>
          <Link href="/contact" className="cd-chip">{aboutPageText("docs.contact")}</Link>
        </div>
      </section>
    </main>
  );
}
