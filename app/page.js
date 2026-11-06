import HomeQuestionGuide from './components/HomeQuestionGuide';
import HomeInstallEntry from './components/HomeInstallEntry';
import StoryDiscovery from './consultations/StoryDiscovery';
import Link from 'next/link';
import { publicSeoPages, siteSeo } from "../lib/seo/siteSeo";
import { buildServiceJsonLd, buildWebPageJsonLd, buildAuthorPersonJsonLd } from "../lib/structured-data";
import { serializeJsonLd } from "../lib/seo/json-ld.mjs";
import { brandCopy } from "../lib/seo/brand-copy.mjs";
import { BRAND_FACTS } from "../lib/brand/brand-facts.mjs";
import { FOOTER_BYLINE, FOOTER_LINKS, FOOTER_NOTICE, FOOTER_TRUST_LINKS } from "../lib/brand/site-footer";
import { BUSINESS_IDENTITY } from "../lib/site-policy-config";
import LegacyHomeEntry from "./components/LegacyHomeEntry";
import { HOME_QUICK_LINKS } from "../lib/seo/home-discovery.mjs";
import MobileHomeNav from './components/MobileHomeNav';
import HomeCardDeck from "./components/HomeCardDeck";
import HomeDailyEntry from "./components/HomeDailyEntry";
import { NativeHomeRoot, NativeHomeNav, NativeHomeText, NativeHomeCardLink, NativeHomeDictionaryText } from "./components/NativeHomeCopy";
import "./yeongnyangi/night-tokens.css";
import "./yeongnyangi/yehwa-night.generated.css";
import styles from "./home-main.module.css";
import { IS_APP_BUILD } from "../lib/app-build-target";

// `/` 는 꿀꿀 운세의 공식 대표 홈이다(2026-10-15). 상담 앱 입구는 /ggulggul/ 이고,
// 기능 쿼리가 붙은 `/` 요청은 워커가 앱으로 보낸다(public/_worker.js 루트 분기).
// 두 서비스 선택은 이 화면에서, 상담 탐색과 이용 안내는 각 서비스 홈에서 제공한다.
const { service, characters } = BRAND_FACTS;
const YEONGNYANGI = characters.find((character) => character.key === "yeongnyangi");
const HOME_TITLE = "꿀꿀 운세 · 운세보는 영냥이 | 서비스 선택";
const HOME_DESCRIPTION = "꽃돼지 연이와 영냥이를 만나는 꿀꿀 운세. 사주·타로와 주제별 운세를 웹에서 살펴보고, Android 앱은 Google Play에서 설치하세요.";
// summary_large_image 카드라 1200×630 공유 이미지를 쓴다. 정적 홈 셸(index.html)과 같은 그림이다.
const HOME_IMAGE = siteSeo.defaultOgImage;
const ART = "/images/home/illustrated";
// 카드 그림은 같은 파일명으로 다시 그려 왔고 정적 이미지는 7일 캐시된다(public/_headers).
// 그림을 바꾸면 이 값을 올려야 이미 방문한 브라우저도 새 그림을 받는다(10-17 운영에서 옛 그림이 남은 사고).
const CARD_ART_REV = "?v=20261017";

export const metadata = {
  metadataBase: new URL(service.siteUrl),
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  keywords: [service.name, ...service.alternateNames, `${service.name} 공식`, YEONGNYANGI.serviceName, "무료 만세력", "무료 타로", "영냥이", "자미두수", "베다점", "숙요점", "휴먼 디자인", "MBTI", ...publicSeoPages.home.keywords],
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
    images: [{ url: HOME_IMAGE, width: 1200, height: 630, alt: HOME_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [HOME_IMAGE],
  },
};

// 두 상담가의 역할과 실제 진입을 한 링크로 묶는다.
// /ggulggul/ 은 Next RSC 페이로드가 없는 정적 셸이라 next/link 대신 <a> 로 연다(external).
const CARDS = [
  { key: "yeoni", className: "yeoniCard", art: "yeoni", name: "꽃돼지 꿀꿀운세", href: service.appEntryPath, external: true, tag: "사주·타로부터 주제별 운세와 상담을 골라보세요.", action: "꿀꿀운세 들어가기" },
  { key: "yn", className: "ynCard", art: "yeongnyangi", name: "운세보는 영냥이", href: YEONGNYANGI.path, tag: "궁금한 질문과 상황을 중심으로 깊이 살펴보세요.", action: "영냥이 만나기", night: true },
];
const CARD_ART_SIZES = "(min-width: 800px) 306px, (min-width: 641px) 38vw, 42vw";
function discoveryTracking(serviceKey, placement = "directory") {
  return { "data-cd-cross-sell": "/", "data-cd-target-service": serviceKey, "data-cd-cta-placement": placement };
}

export default function HomePage() {
  const webPageJsonLd = buildWebPageJsonLd({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: "/" });
  // 레이아웃 Organization.founder 와 같은 @id 다. 제목의 "명리학자가 만든"을 직함·별칭·소개 페이지로 뒷받침한다.
  const founderJsonLd = { "@context": "https://schema.org", ...buildAuthorPersonJsonLd() };
  const serviceJsonLd = [
    buildServiceJsonLd({ name: service.name, description: "꽃돼지 연이가 안내하는 사주·타로·숙요점·베다점·자미두수·점성술 운세와 상담", path: service.appEntryPath }),
    buildServiceJsonLd({ name: YEONGNYANGI.serviceName, alternateName: [...YEONGNYANGI.alternateNames], description: brandCopy("yeongnyangiDescription"), path: YEONGNYANGI.path }),
  ];
  return <>
    <LegacyHomeEntry />
    {/* This public Korean entry stays visible regardless of a saved reading language. */}
    <NativeHomeRoot className={styles.page}>
      <header className={styles.brandRow}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.brandMark} src="/fuctionassets/%EC%97%B0%EC%9D%B4.webp" width={96} height={96} alt="" decoding="async" />
        <span className={styles.wordmark}>{IS_APP_BUILD ? service.name : "코드 데스티니"}</span>
        {!IS_APP_BUILD && <a href="#homeCardTitle">상담 추천</a>}
      </header>

      <main className={styles.stage}>
        {IS_APP_BUILD ? <div className={styles.head}>
          <h1 id="homeCardTitle" className={styles.title}><NativeHomeText>꿀꿀 운세에서 어떤 운세를 만나볼까요?</NativeHomeText></h1>
          <p className={styles.lead}><NativeHomeText>마음이 향하는 상담 공간을 골라보세요.</NativeHomeText></p>
        </div> : <h1 id="webServiceTitle" className={styles.title}>마음이 가는 카드를 골라보세요</h1>}

        {/* 카드 제목(h2)의 링크를 카드 크기로 늘려 카드 전체가 한 링크다. 설명 두 줄은 aria-describedby 로 읽힌다. */}
        <HomeCardDeck className={styles.deck} interactive={!IS_APP_BUILD} labelledBy={IS_APP_BUILD ? "homeCardTitle" : "webServiceTitle"}>
          {CARDS.map((card, index) => {
            const linkProps = { href: card.href, className: styles.cardLink, "aria-describedby": `${card.key}CardTag`, ...discoveryTracking(card.key === "yeoni" ? "ggulggul" : "yeongnyangi", "primary") };
            return <li key={card.key} data-home-card={card.key} className={`${styles.card} ${styles[card.className]}`} data-yn-night={card.night ? "" : undefined}>

              {!IS_APP_BUILD && <span className={styles.cardNumeral} aria-hidden="true">{index === 0 ? "I" : "II"}</span>}
              <picture className={styles.cardArt}>
                <source type="image/avif" srcSet={`${ART}/root-card-${card.art}-360.avif${CARD_ART_REV} 360w, ${ART}/root-card-${card.art}-600.avif${CARD_ART_REV} 600w`} sizes={CARD_ART_SIZES} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ART}/root-card-${card.art}-360.webp${CARD_ART_REV}`} srcSet={`${ART}/root-card-${card.art}-360.webp${CARD_ART_REV} 360w, ${ART}/root-card-${card.art}-600.webp${CARD_ART_REV} 600w`} sizes={CARD_ART_SIZES} width={360} height={480} alt="" decoding="async" fetchPriority={index === 0 ? "high" : undefined} />
              </picture>
              <div className={styles.cardCopy}><h2 className={styles.cardName}>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <NativeHomeCardLink {...linkProps} name={card.name} action={card.action} external={card.external} />
              </h2>
              <p id={`${card.key}CardTag`} className={styles.cardTag}><NativeHomeText>{card.tag}</NativeHomeText></p>

              <span className={styles.cardAction} aria-hidden="true"><NativeHomeText>{card.action}</NativeHomeText><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12h15m-6-6 6 6-6 6" /></svg></span></div>
              <span className={styles.cardFoil} aria-hidden="true" />
            </li>;
          })}
        </HomeCardDeck>
        {!IS_APP_BUILD && <HomeQuestionGuide />}
        <HomeDailyEntry />
        {!IS_APP_BUILD && <StoryDiscovery />}
        {!IS_APP_BUILD && <HomeInstallEntry />}
        {!IS_APP_BUILD && <nav className={styles.entryHelp} aria-label="주요 운세 바로가기">
          <a href="https://play.google.com/store/apps/details?id=com.codedestiny.app">Google Play에서 꿀꿀운세 앱 다운로드</a>
          {HOME_QUICK_LINKS.map(({ key, href, title }) => (
            <Link key={key} href={href} prefetch={false} {...discoveryTracking(key)}>{title}</Link>
          ))}
        </nav>}
        <nav className={styles.entryHelp} aria-label="서비스 이용 도움말">
          <Link prefetch={IS_APP_BUILD ? false : undefined} href="/faq/"><NativeHomeText>이용 안내</NativeHomeText></Link>
          <Link prefetch={IS_APP_BUILD ? false : undefined} href="/records/"><NativeHomeText>꿀꿀 운세 기록</NativeHomeText></Link>
          <Link prefetch={IS_APP_BUILD ? false : undefined} href="/yeongnyangi/library/"><NativeHomeText>영냥이 상담 기록</NativeHomeText></Link>
        </nav>
        <p className={styles.entryNote}>{IS_APP_BUILD ? <NativeHomeText>이용권과 상담 기록은 서비스별로 확인해 주세요.</NativeHomeText>
          : <a href="/points/#moonlight-plans">문라이트 패스(꿀단지 이용권) 살펴보기</a>}</p>
      </main>

      {!IS_APP_BUILD && <MobileHomeNav/>}
      <footer className={styles.footer}>
        <NativeHomeNav className={styles.footerNav} aria-label="정책과 문의">
          {FOOTER_LINKS.map(link => <Link prefetch={IS_APP_BUILD ? false : undefined} key={link.href} href={link.href} className={link.strong ? styles.footerStrong : undefined}><NativeHomeDictionaryText translationKey={link.trans}>{link.text}</NativeHomeDictionaryText></Link>)}
        </NativeHomeNav>
        {/* 둘째 줄(작게): dist/index.html 도 scripts/verify-adsense-readiness.mjs 의 신뢰 링크 8종 검사 대상이다. */}
        <NativeHomeNav className={`${styles.footerNav} ${styles.footerQuiet}`} aria-label="안내 페이지">
          {FOOTER_TRUST_LINKS.map(link => <Link prefetch={IS_APP_BUILD ? false : undefined} key={link.href} href={link.href}><NativeHomeDictionaryText translationKey={link.trans}>{link.text}</NativeHomeDictionaryText></Link>)}
          {!IS_APP_BUILD && <button type="button" data-cd-cookie-settings className={styles.footerButton}>쿠키 설정</button>}
        </NativeHomeNav>
        <p className={styles.byline}><Link prefetch={IS_APP_BUILD ? false : undefined} href="/about/#author"><NativeHomeDictionaryText translationKey="footer.byline">{FOOTER_BYLINE}</NativeHomeDictionaryText></Link></p>
        <p className={styles.business}>
          <span><NativeHomeText>상호</NativeHomeText> {BUSINESS_IDENTITY.companyName}</span><span><NativeHomeText>대표</NativeHomeText> {BUSINESS_IDENTITY.representative}</span><span><NativeHomeText>사업자등록번호</NativeHomeText> {BUSINESS_IDENTITY.registrationNumber}</span>
          <span><NativeHomeText>통신판매업 신고</NativeHomeText> {BUSINESS_IDENTITY.mailOrderNumber}</span><span><NativeHomeText>전화</NativeHomeText> {BUSINESS_IDENTITY.phone}</span><span><NativeHomeText>이메일</NativeHomeText> {BUSINESS_IDENTITY.email}</span>
          <span><NativeHomeText>주소</NativeHomeText> {BUSINESS_IDENTITY.address}</span>
        </p>
        <p className={styles.notice}><NativeHomeDictionaryText translationKey="footer.disclaimerNote">{FOOTER_NOTICE}</NativeHomeDictionaryText></p>
      </footer>
    </NativeHomeRoot>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd([webPageJsonLd, founderJsonLd, ...serviceJsonLd])}} />
  </>;
}
