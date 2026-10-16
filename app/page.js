import Link from "next/link";
import { publicSeoPages } from "../lib/seo/siteSeo";
import { buildServiceJsonLd, buildWebPageJsonLd } from "../lib/structured-data";
import { serializeJsonLd } from "../lib/seo/json-ld.mjs";
import { brandCopy } from "../lib/seo/brand-copy.mjs";
import { BRAND_FACTS } from "../lib/brand/brand-facts.mjs";
import { FOOTER_BYLINE, FOOTER_LINKS, FOOTER_NOTICE, FOOTER_TRUST_LINKS } from "../lib/brand/site-footer";
import { BUSINESS_IDENTITY } from "../lib/site-policy-config";
import LegacyHomeEntry from "./components/LegacyHomeEntry";
import LocalizedServiceSummary from "./components/LocalizedServiceSummary";
import { products as YEONGNYANGI_PRODUCTS } from "../worker/yeongnyangi/payments/catalog";
import "./yeongnyangi/night-tokens.css";
import styles from "./home-main.module.css";

// `/` 는 꿀꿀 운세의 공식 대표 홈이다(2026-10-15). 상담 앱 입구는 /ggulggul/ 이고,
// 기능 쿼리가 붙은 `/` 요청은 워커가 앱으로 보낸다(public/_worker.js 루트 분기).
// 2026-10-16 "직관성": 첫 화면은 타로 카드 두 장뿐이다. 카드를 누르면 안내 단계 없이 바로 그 서비스로 간다 —
// I 꿀꿀 운세(연이, --cd-*), II 운세보는 영냥이(질문 상담, --yn-*).
const { service, characters } = BRAND_FACTS;
const YEONGNYANGI = characters.find((character) => character.key === "yeongnyangi");
// 영냥이 상담의 시작 가격은 결제 카탈로그(고등어)에서 읽는다.
const YEONGNYANGI_STARTER_PRICE = `${YEONGNYANGI_PRODUCTS.find((product) => product.id === "saju_mackerel").priceKRW.toLocaleString("ko-KR")}원`;
const HOME_TITLE = `${service.name} 공식 사이트 | ${YEONGNYANGI.serviceName}·사주·타로`;
const HOME_DESCRIPTION = `${service.name} 공식 홈페이지입니다. 꽃돼지 연이의 무료 사주·타로·만세력 운세와 사주보는 고양이 ${YEONGNYANGI.serviceName}의 고민 상담을 한곳에서 만나보세요.`;
const HOME_IMAGE = "https://code-destiny.com/icons/moonlight-garden-v1-512.png";
const ART = "/images/home/illustrated";

export const metadata = {
  metadataBase: new URL(service.siteUrl),
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  keywords: [service.name, ...service.alternateNames, `${service.name} 공식`, YEONGNYANGI.serviceName, "무료 사주", "무료 타로", "영냥이", ...publicSeoPages.home.keywords],
  // 대표 홈은 자기 자신만 정본으로 둔다. /ggulggul/ 로케일 클러스터(hreflang)와 섞지 않는다.
  alternates: { canonical: service.homeUrl },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: service.homeUrl,
    siteName: service.name,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [{ url: HOME_IMAGE, width: 512, height: 512, alt: HOME_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [HOME_IMAGE],
  },
};

// 두 장의 카드. 글자는 이름 + 두 줄뿐이다.
// /ggulggul/ 은 Next RSC 페이로드가 없는 정적 셸이라 next/link 대신 <a> 로 연다(external).
const CARDS = [
  { key: "yeoni", className: "yeoniCard", art: "yeoni", numeral: "I", name: service.name, href: service.appEntryPath, external: true, tag: "종합 운세", hint: "대표 상담 · 무료 사주" },
  { key: "yn", className: "ynCard", art: "yeongnyangi", numeral: "II", name: YEONGNYANGI.serviceName, href: YEONGNYANGI.path, tag: "질문 하나를 깊게", hint: `${YEONGNYANGI_STARTER_PRICE}부터`, night: true },
];
const CARD_ART_SIZES = "(min-width: 641px) 280px, 44vw";

export default function HomePage() {
  const webPageJsonLd = buildWebPageJsonLd({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: "/" });
  const serviceJsonLd = [
    buildServiceJsonLd({ name: service.name, description: "꽃돼지 연이가 안내하는 사주·타로·만세력 운세와 상담", path: service.appEntryPath }),
    buildServiceJsonLd({ name: YEONGNYANGI.serviceName, alternateName: [...YEONGNYANGI.alternateNames], description: brandCopy("yeongnyangiDescription"), path: YEONGNYANGI.path }),
  ];
  return <>
    <LegacyHomeEntry />
    <LocalizedServiceSummary><div className={styles.page}>
      <header className={styles.brandRow}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.brandMark} src="/images/yeoni/welcome/yeoni-mark-v1-96.webp" width={96} height={96} alt="" decoding="async" />
        <span className={styles.wordmark}>{service.name}</span>
      </header>

      <main className={styles.stage}>
        <div className={styles.head}>
          <h1 id="homeCardTitle" className={styles.title}>어떤 카드를 뽑을까요?</h1>
          <p className={styles.byline}><Link href="/about/#author">{FOOTER_BYLINE}</Link></p>
        </div>

        {/* 카드 제목(h2)의 링크를 카드 크기로 늘려 카드 전체가 한 링크다. 설명 두 줄은 aria-describedby 로 읽힌다. */}
        <ul className={styles.deck} aria-labelledby="homeCardTitle">
          {CARDS.map((card, index) => {
            const linkProps = { href: card.href, className: styles.cardLink, "aria-describedby": `${card.key}CardTag ${card.key}CardHint` };
            return <li key={card.key} className={`${styles.card} ${styles[card.className]}`} data-yn-night={card.night ? "" : undefined}>
              <span className={styles.cardNumeral} aria-hidden="true">{card.numeral}</span>
              <picture className={styles.cardArt}>
                <source type="image/avif" srcSet={`${ART}/root-card-${card.art}-360.avif 360w, ${ART}/root-card-${card.art}-600.avif 600w`} sizes={CARD_ART_SIZES} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ART}/root-card-${card.art}-360.webp`} srcSet={`${ART}/root-card-${card.art}-360.webp 360w, ${ART}/root-card-${card.art}-600.webp 600w`} sizes={CARD_ART_SIZES} width={360} height={480} alt="" decoding="async" fetchPriority={index === 0 ? "high" : undefined} />
              </picture>
              <h2 className={styles.cardName}>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                {card.external ? <a {...linkProps}>{card.name}</a> : <Link {...linkProps}>{card.name}</Link>}
              </h2>
              <p id={`${card.key}CardTag`} className={styles.cardTag}>{card.tag}</p>
              <p id={`${card.key}CardHint`} className={styles.cardHint}>{card.hint}</p>
            </li>;
          })}
        </ul>
      </main>

      <footer className={styles.footer}>
        <nav className={styles.footerNav} aria-label="정책과 문의">
          {FOOTER_LINKS.map(link => <Link key={link.href} href={link.href} className={link.strong ? styles.footerStrong : undefined}>{link.text}</Link>)}
        </nav>
        {/* 둘째 줄(작게): dist/index.html 도 scripts/verify-adsense-readiness.mjs 의 신뢰 링크 8종 검사 대상이다. */}
        <nav className={`${styles.footerNav} ${styles.footerQuiet}`} aria-label="안내 페이지">
          {FOOTER_TRUST_LINKS.map(link => <Link key={link.href} href={link.href}>{link.text}</Link>)}
        </nav>
        <p className={styles.business}>
          <span>상호 {BUSINESS_IDENTITY.companyName}</span><span>대표 {BUSINESS_IDENTITY.representative}</span><span>사업자등록번호 {BUSINESS_IDENTITY.registrationNumber}</span>
          <span>통신판매업 신고 {BUSINESS_IDENTITY.mailOrderNumber}</span><span>전화 {BUSINESS_IDENTITY.phone}</span><span>이메일 {BUSINESS_IDENTITY.email}</span>
          <span>주소 {BUSINESS_IDENTITY.address}</span>
        </p>
        <p className={styles.notice}>{FOOTER_NOTICE}</p>
      </footer>
    </div></LocalizedServiceSummary>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd([webPageJsonLd, ...serviceJsonLd])}} />
  </>;
}
