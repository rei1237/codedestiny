import PolicyGuide, { policyPageClass } from "../components/PolicyGuide";
import { trustRoutes } from "../../lib/i18n/public-trust-copy.mjs";
import Link from "next/link";
import { buildSeoMetadata } from "../../lib/seo";
import { buildAboutPageJsonLd, buildAuthorPersonJsonLd, buildOrganizationJsonLd } from "../../lib/structured-data";
import { publicSeoPages } from "../../lib/seo/siteSeo";
import { cmsRecordFlat } from "../../lib/cms/build-text";
import { ABOUT_PAGE_TEXT_TRANSLATIONS } from "../_content/about-copy";

const seo = publicSeoPages.about;

export const metadata = buildSeoMetadata({ ...seo, hreflang: trustRoutes("about") });


// 관리자 CMS(페이지 → 서비스 소개)에서 고친 값을 코드 원문 위에 얹는다.
// 이 페이지의 모든 문구가 이 접근자 하나를 지나므로 배선 지점도 하나로 끝난다.
const ABOUT_PAGE_COPY_KO = cmsRecordFlat("page-copy", "about", ABOUT_PAGE_TEXT_TRANSLATIONS.ko);

function aboutPageText(key) {
  return ABOUT_PAGE_COPY_KO[key] || "Translation pending";
}

// 홈은 정적 메인 셸이 담당하므로, 각 서비스는 셸 안의 해당 컬렉션 위치로 보낸다.
const SERVICE_EXPLORE = [
  { key: "saju", href: "/static/#destinyCardForm" },
  { key: "tarot", href: "/static/#tarotCollection" },
  { key: "ziwei", href: "/static/#cosmicCollection" },
  { key: "astrology", href: "/static/#cosmicCollection" },
  { key: "sukuyo", href: "/static/#premiumVvipCollection" },
  { key: "pass", href: "/static/#premiumVvipCollection" },
];

const PASS_GUIDE_KEYS = ["free", "pass30", "single", "moonlight"];

const REFUND_GUIDE_KEYS = ["before", "pending", "done", "error", "duplicate", "used"];

const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    buildOrganizationJsonLd(),
    buildAuthorPersonJsonLd(),
    buildAboutPageJsonLd({
      path: "/about",
      title: seo.title,
      description: seo.description,
    }),
  ],
});

export default function AboutPage() {
  return (
    <main className={`cd-main-shell ${policyPageClass}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <PolicyGuide kind="about" title={aboutPageText("title")} description={aboutPageText("intro")} />

      <section className="cd-card" id="about-purpose">
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

      <section className="cd-card" id="about-methods">
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

      {/* insights 기사의 저자 링크(DEFAULT_ARTICLE_AUTHOR.profileUrl)가 이 페이지로 착지한다.
          그 이름이 무엇을 가리키고 누가 책임지는지를 여기서 설명한다.
          id="author" 는 ContentIntegrityNote 의 "저자 소개" 링크(/about#author)가 착지하는 앵커다. */}
      <section className="cd-card" id="author">
        <h2>{aboutPageText("editorial.title")}</h2>
        <p>
          {aboutPageText("editorial.team")}
        </p>
        <p>
          {aboutPageText("editorial.owner")}
        </p>
        <p>
          {aboutPageText("editorial.author")}
        </p>
        <p>박병하는 ‘네오’라는 이름으로 사주 분석 글을 공개해 왔습니다. <a href="https://blog.naver.com/neosaju" rel="noopener noreferrer">네오의 기존 사주 블로그</a>는 운영자의 분석 활동 기록이고, <a href="https://blog.naver.com/goodbyejieun" rel="noopener noreferrer">꿀꿀 운세 공식 블로그</a>는 서비스 소식과 이용 안내 채널입니다.</p>
        <h3>날짜와 원문으로 확인하는 공개 분석 기록</h3>
        <ul>
          <li><a href="https://blog.naver.com/neosaju/222876455500">2022년 9월 16일 · 윤석열 사주 분석 원문</a></li>
          <li><a href="https://blog.naver.com/neosaju/223444062729">2024년 5월 12일 · 윤석열 운의 흐름 분석 원문</a></li>
          <li><a href="https://blog.naver.com/neosaju/223459696339">2024년 5월 27일 · 이재명 사주 분석 원문</a></li>
        </ul>
        <p>공개 분석은 당시 글의 조건과 표현을 함께 읽어 판단할 수 있도록 원문으로 연결합니다. 개별 사례가 모든 예측의 정확도나 앞으로의 적중을 보장하지는 않습니다. 꿀꿀 운세는 이런 해석 경험을 바탕으로 계산 근거와 생활 속 선택지를 설명합니다.</p>
        <p>
          {aboutPageText("editorial.process")}
        </p>
        <p>
          {aboutPageText("editorial.limits")}
        </p>
        <p>
          {aboutPageText("editorial.correction")}
        </p>
        <div className="cd-chip-wrap mt-3">
          <Link href="/editorial-policy" className="cd-chip">{aboutPageText("editorial.policyLink")}</Link>
          <Link href="/contact" className="cd-chip">{aboutPageText("editorial.contactLink")}</Link>
        </div>
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

      {/* 아래 세 섹션은 옛 React 홈(app/page.js)이 담고 있던 서비스 소개·결제 안내를 합친 것이다.
          홈은 정적 메인 셸로 통일했고, 이 내용의 사용자 대상 위치는 /about 이다. */}
      <section className="cd-card">
        <h2>{aboutPageText("explore.title")}</h2>
        <p>{aboutPageText("explore.lead")}</p>
        <ul className="grid gap-2">
          {SERVICE_EXPLORE.map((item) => (
            <li key={item.key} className="flex flex-wrap items-baseline gap-2">
              <Link href={item.href} className="cd-chip">{aboutPageText(`explore.${item.key}.title`)}</Link>
              <span>
                {aboutPageText(`explore.${item.key}.body`)} ({aboutPageText(`explore.${item.key}.meta`)})
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{aboutPageText("pass.title")}</h2>
        <p>{aboutPageText("pass.lead")}</p>
        <ul className="grid gap-2">
          {PASS_GUIDE_KEYS.map((key) => (
            <li key={key}>
              <strong>{aboutPageText(`pass.${key}.title`)}</strong> — {aboutPageText(`pass.${key}.body`)}
            </li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{aboutPageText("refund.title")}</h2>
        <p>{aboutPageText("refund.lead")}</p>
        <ul className="grid gap-2">
          {REFUND_GUIDE_KEYS.map((key) => (
            <li key={key}>
              <strong>{aboutPageText(`refund.${key}.title`)}</strong> — {aboutPageText(`refund.${key}.body`)}
            </li>
          ))}
        </ul>
        <div className="cd-chip-wrap mt-3">
          <Link href="/terms#refund-policy" className="cd-chip">{aboutPageText("refund.policyLink")}</Link>
        </div>
      </section>

      <section className="cd-card">
        <h2>{aboutPageText("docs.title")}</h2>
        <div className="cd-chip-wrap">
          <Link href="/methodology" className="cd-chip">{aboutPageText("docs.methodology")}</Link>
          <Link href="/faq" className="cd-chip">{aboutPageText("docs.faq")}</Link>
          <Link href="/disclaimer" className="cd-chip">{aboutPageText("docs.disclaimer")}</Link>
          <Link href="/guides" className="cd-chip">{aboutPageText("docs.insights")}</Link>
          <Link href="/privacy" className="cd-chip">{aboutPageText("docs.privacy")}</Link>
          <Link href="/terms" className="cd-chip">{aboutPageText("docs.terms")}</Link>
          <Link href="/contact" className="cd-chip">{aboutPageText("docs.contact")}</Link>
        </div>
      </section>
    </main>
  );
}
