import Link from "next/link";
import { buildSeoMetadata } from "../../lib/seo";
import { buildAboutPageJsonLd, buildOrganizationJsonLd } from "../../lib/structured-data";
import { publicSeoPages } from "../../lib/seo/siteSeo";
import { cmsRecordFlat } from "../../lib/cms/build-text";
import { ABOUT_PAGE_TEXT_TRANSLATIONS } from "../_content/about-copy";

const seo = publicSeoPages.about;

export const metadata = buildSeoMetadata(seo);


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

      {/* insights 기사의 저자 링크(DEFAULT_ARTICLE_AUTHOR.profileUrl)가 이 페이지로 착지한다.
          그 이름이 무엇을 가리키고 누가 책임지는지를 여기서 설명한다. */}
      <section className="cd-card">
        <h2>{aboutPageText("editorial.title")}</h2>
        <p>
          {aboutPageText("editorial.team")}
        </p>
        <p>
          {aboutPageText("editorial.owner")}
        </p>
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
