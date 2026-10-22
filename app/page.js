import Link from "next/link";
import { publicSeoPages } from "../lib/seo/siteSeo";
import { buildServiceJsonLd, buildWebPageJsonLd, buildFaqPageJsonLd } from "../lib/structured-data";
import { serializeJsonLd } from "../lib/seo/json-ld.mjs";
import { brandCopy } from "../lib/seo/brand-copy.mjs";
import { BRAND_FACTS } from "../lib/brand/brand-facts.mjs";
import { FOOTER_BYLINE, FOOTER_LINKS, FOOTER_NOTICE, FOOTER_TRUST_LINKS } from "../lib/brand/site-footer";
import { BUSINESS_IDENTITY } from "../lib/site-policy-config";
import { founder } from "../lib/brand/founder";
import { HOME_DIFFERENTIATION_FAQ } from "../lib/brand/differentiation-faqs.mjs";
import { HOME_CATEGORIES, HOME_CONCERNS } from "../lib/seo/home-discovery.mjs";
import { getSignProfile } from "../lib/fortune/sign-profiles";
import LegacyHomeEntry from "./components/LegacyHomeEntry";
import HomeCardDeck from "./components/HomeCardDeck";
import { PriceBadge } from "./components/PriceBadge";
import ConsultationDiscovery from "./components/ConsultationDiscovery";
import LocalizedServiceSummary from "./components/LocalizedServiceSummary";
import "./yeongnyangi/night-tokens.css";
import styles from "./home-main.module.css";

// `/` 는 꿀꿀 운세의 공식 대표 홈이다(2026-10-15). 상담 앱 입구는 /ggulggul/ 이고,
// 기능 쿼리가 붙은 `/` 요청은 워커가 앱으로 보낸다(public/_worker.js 루트 분기).
// 두 캐릭터 카드의 직접 진입을 유지하고, 아래에 공개 HTML 서비스 탐색을 제공한다.
const { service, characters } = BRAND_FACTS;
const YEONGNYANGI = characters.find((character) => character.key === "yeongnyangi");
const HOME_TITLE = `${service.name} | 사주·타로·별자리 운세 – 코드 데스티니`;
const HOME_DESCRIPTION = `꽃돼지 연이와 사주보는 고양이 영냥이를 만나는 ${service.name}. 사주·타로·숙요점·베다점과 오늘·내일 별자리 운세를 살펴보고, 내 고민에 맞는 상담을 시작하세요.`;
const HOME_IMAGE = "https://code-destiny.com/icons/moonlight-garden-v1-512.png";
const ART = "/images/home/illustrated";
// 카드 그림은 같은 파일명으로 다시 그려 왔고 정적 이미지는 7일 캐시된다(public/_headers).
// 그림을 바꾸면 이 값을 올려야 이미 방문한 브라우저도 새 그림을 받는다(10-17 운영에서 옛 그림이 남은 사고).
const CARD_ART_REV = "?v=20261017";

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

// 두 상담가의 역할과 실제 진입을 한 링크로 묶는다.
// /ggulggul/ 은 Next RSC 페이로드가 없는 정적 셸이라 next/link 대신 <a> 로 연다(external).
const CARDS = [
  { key: "yeoni", className: "yeoniCard", art: "yeoni", name: "꿀꿀 운세", href: service.appEntryPath, external: true, tag: "무료 운세부터", hint: "고급 심층 리포트까지" },
  { key: "yn", className: "ynCard", art: "yeongnyangi", name: "운세보는 영냥이", href: YEONGNYANGI.path, tag: "간단한 질문부터", hint: "세밀한 오마카세 상담까지", night: true },
];
const CARD_ART_SIZES = "(min-width: 800px) 306px, (min-width: 641px) 38vw, 42vw";
// 강약(2026-10-23): 대표 상담 3종을 두 입구 카드 바로 아래 한 줄로 둔다. 채움 버튼은 첫 장 하나뿐이다.
// 그림·질문은 /ggulggul/ 대표 덱(scripts/design/build-home-funnel.mjs)과 같고, 가격은 서버 정본(PriceBadge)이 말한다.
const SIGNATURE_CONSULTATIONS = [
  { key: "love-secret", title: "연애 비책", master: "연이 · 서한비", href: "/love-secret-ai/", art: "love-secret-ai", featureKey: "love-secret-ai-consultation", question: "마음부터 들려주세요. 두 분 사이의 거리는 서한비가 재어 드릴게요.", action: "연애 비책 시작하기" },
  { key: "new-year", title: "신년운세", master: "네오", href: "/new-year-ai-consultation/", art: "new-year-ai", featureKey: "new-year-ai-consultation", question: "올해 판세는 내가 먼저 읽는다. 어디서 밀고, 언제 멈출까?", action: "신년운세 받기" },
  { key: "life-book", title: "인생의 책", master: "윤달", href: "/life-book-ai/", art: "life-book-ai", featureKey: "life-book-ai-consultation", question: "당신의 인생, 첫 장부터 읽어 드릴게요.", action: "인생의 책 펼치기" },
];
const SIGNATURE_ART = "/images/service-introductions";
const RESULT_EXAMPLE = getSignProfile("rat");
const HOME_FAQS = [
  { question: "꿀꿀 운세와 꿀꿀운세, 코드 데스티니는 어떤 관계인가요?", answer: brandCopy("aliases") },
  HOME_DIFFERENTIATION_FAQ,
  { question: "꽃돼지 연이와 영냥이는 어떻게 다른가요?", answer: "꽃돼지 연이의 앱에서는 사주·타로·자미두수 등 원하는 도구를 골라 이용해요. 운세보는 영냥이는 사주보는 고양이 상담 서비스로, 구체적인 질문과 상황을 바탕으로 고민을 풀어가요. 같은 운영자가 제공하며, 이용 범위와 결제 조건은 각 서비스에서 안내해요." },
  { question: "어디까지 무료로 이용할 수 있나요?", answer: "기본 사주·만세력·타로와 공개 별자리·띠별 운세를 무료로 시작할 수 있어요. 심층 리포트와 AI 상담은 별도 유료 상품이 있으며, 이용권·월정석·단건 결제의 적용 여부와 금액은 각 상품의 결제 전 안내를 확인해 주세요." },
  { question: "태어난 시간을 몰라도 볼 수 있나요?", answer: "사주는 출생 시간 모름을 선택해 시주를 제외하고 살펴볼 수 있어요. 자미두수 명반과 점성술의 상승궁 등은 출생 시간에 따라 달라지므로 해당 도구의 입력 안내를 확인해 주세요. 시간이 필요 없는 질문형 타로도 선택할 수 있어요." },
  { question: "상담사가 직접 결과를 작성하나요?", answer: founder.method },
  { question: "이전에 구매한 결과는 어디에서 다시 보나요?", answer: "결제한 계정으로 로그인한 뒤 꽃돼지 서비스 결과는 나의 기록 보관함(/records/)에서, 영냥이 상담은 영냥이 상담 기록(/yeongnyangi/library/)에서 다시 열 수 있어요. 문의와 오류 신고는 문의 페이지, 환불 기준은 환불정책에서 확인해 주세요." },
];

function discoveryTracking(serviceKey, placement = "directory") {
  return { "data-cd-cross-sell": "/", "data-cd-target-service": serviceKey, "data-cd-cta-placement": placement };
}

export default function HomePage() {
  const webPageJsonLd = buildWebPageJsonLd({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: "/" });
  const serviceJsonLd = [
    buildServiceJsonLd({ name: service.name, description: "꽃돼지 연이가 안내하는 사주·타로·숙요점·베다점·자미두수·점성술 운세와 상담", path: service.appEntryPath }),
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
          <h1 id="homeCardTitle" className={styles.title}>어떤 운세를 만나볼까요?</h1>
          <p className={styles.lead}><Link href="/about/#author">{founder.byline}</Link></p>
        </div>

        {/* 카드 제목(h2)의 링크를 카드 크기로 늘려 카드 전체가 한 링크다. 설명 두 줄은 aria-describedby 로 읽힌다. */}
        <HomeCardDeck className={styles.deck}>
          {CARDS.map((card, index) => {
            const linkProps = { href: card.href, className: styles.cardLink, "aria-label": `${card.name} ${card.key === "yeoni" ? "운세 골라보기" : "상담 시작하기"}`, "aria-describedby": `${card.key}CardTag ${card.key}CardHint`, ...discoveryTracking(card.key === "yeoni" ? "ggulggul" : "yeongnyangi", "primary") };
            return <li key={card.key} data-home-card={card.key} className={`${styles.card} ${styles[card.className]}`} data-yn-night={card.night ? "" : undefined}>
              <span className={styles.cardNumeral} aria-hidden="true">{index === 0 ? "I" : "II"}</span>
              <picture className={styles.cardArt}>
                <source type="image/avif" srcSet={`${ART}/root-card-${card.art}-360.avif${CARD_ART_REV} 360w, ${ART}/root-card-${card.art}-600.avif${CARD_ART_REV} 600w`} sizes={CARD_ART_SIZES} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ART}/root-card-${card.art}-360.webp${CARD_ART_REV}`} srcSet={`${ART}/root-card-${card.art}-360.webp${CARD_ART_REV} 360w, ${ART}/root-card-${card.art}-600.webp${CARD_ART_REV} 600w`} sizes={CARD_ART_SIZES} width={360} height={480} alt="" decoding="async" fetchPriority={index === 0 ? "high" : undefined} />
              </picture>
              <div className={styles.cardCopy}><h2 className={styles.cardName}>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                {card.external ? <a {...linkProps}>{card.name}</a> : <Link {...linkProps}>{card.name}</Link>}
              </h2>
              <p id={`${card.key}CardTag`} className={styles.cardTag}>{card.tag}</p>
              <p id={`${card.key}CardHint`} className={styles.cardHint}>{card.hint}</p>
              <span className={styles.cardAction} aria-hidden="true">카드 선택하기<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12h15m-6-6 6 6-6 6" /></svg></span></div>
              <span className={styles.cardFoil} aria-hidden="true" />
            </li>;
          })}
        </HomeCardDeck>
        <a className={styles.browseLink} href="#homeServices">분야부터 골라보기 <span aria-hidden="true">↓</span></a>
        {/* 카드 전체가 한 링크다. 클릭 귀속은 /ggulggul/ 덱과 같은 섹션 키(signature_consult)로 남는다(js/core/analytics.js). */}
        <section className={styles.signature} aria-labelledby="homeSignature" data-cd-funnel-section="signature_consult">
          <div className={styles.signatureHeading}><h2 id="homeSignature">대표 상담</h2><p>연애·한 해·인생, 큰 질문 하나를 마스터가 깊게 읽어 드려요.</p></div>
          <ul className={styles.signatureList}>{SIGNATURE_CONSULTATIONS.map((item, index) => <li key={item.key} data-home-signature={item.key}>
            <Link href={item.href} className={styles.signatureCard}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.signatureArt} src={`${SIGNATURE_ART}/${item.art}-640.webp`} srcSet={`${SIGNATURE_ART}/${item.art}-320.webp 320w, ${SIGNATURE_ART}/${item.art}-640.webp 640w`} sizes="(min-width: 641px) 320px, 38vw" width={640} height={427} alt="" loading="lazy" decoding="async" />
              <div className={styles.signatureCopy}>
                <span className={styles.signatureMaster}>{item.master}</span>
                <h3>{item.title}</h3>
                <p className={styles.signatureQuestion}>{item.question}</p>
                <PriceBadge featureKey={item.featureKey} className={styles.signaturePrice} />
                <span className={index === 0 ? styles.signaturePrimary : styles.signatureLink}>{item.action}<span aria-hidden="true">→</span></span>
              </div>
            </Link>
          </li>)}</ul>
        </section>
        <ConsultationDiscovery />
        <div className={styles.discovery}>
          <section className={styles.section} aria-labelledby="homeServices">
            <div className={styles.sectionHeading}><h2 id="homeServices">어떤 운세가 궁금하세요?</h2><p>익숙한 사주부터 새로운 별의 이야기까지.</p></div>
            <ul className={styles.serviceList}>
              {HOME_CATEGORIES.map(item => <li key={item.key}>
                <Link href={item.href} {...discoveryTracking(item.key)}>
                  <span className={styles.methodDoor}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className={styles.methodArt} src={item.image} width={320} height={213} alt="" loading="lazy" decoding="async" />
                  </span>
                  <div className={styles.methodCopy}><h3>{item.title}</h3><p>{item.description}</p></div>
                  <svg className={styles.linkArrow} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>
                </Link>
              </li>)}
            </ul>
            <nav className={styles.quickLinks} aria-label="바로 확인하는 운세">
              <Link href="/manse/" {...discoveryTracking("manse")}>만세력으로 명식 확인하기</Link>
              <Link href="/fortune/tomorrow/" {...discoveryTracking("zodiac")}>내일 운세 보기</Link>
              <Link href="/fortune/monthly/" {...discoveryTracking("zodiac")}>이번 달 운세 보기</Link>
            </nav>
          </section>
          <section className={styles.section} aria-labelledby="homeConcerns">
            <div className={styles.sectionHeading}><h2 id="homeConcerns">지금 마음에 걸리는 이야기</h2><p>연애·일·돈·관계, 질문에서 시작해도 좋아요.</p></div>
            <ul className={styles.concernList}>{HOME_CONCERNS.map(item => <li key={item.title}>
              <Link href={item.href} {...discoveryTracking(item.key, "related")}><h3>{item.title}</h3><p>{item.description}</p></Link>
            </li>)}</ul>
            <div className={styles.advisers}>
              <Link href="/fortune-tea-house/" {...discoveryTracking("tea", "related")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ART}/yeoni-hanbok-240.webp`} width={240} height={360} alt="" loading="lazy" decoding="async" />
                <span><strong>연이의 운명의 찻집</strong><span>마음을 정리하는 다정한 편지</span><b>연이에게 이야기하기 <span aria-hidden="true">→</span></b></span>
              </Link>
              <Link href="/neo-operation-room/" {...discoveryTracking("neo", "related")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ART}/neo-human-240.webp`} width={240} height={360} alt="" loading="lazy" decoding="async" />
                <span><strong>네오의 팩폭 전략실</strong><span>복잡한 고민을 실행할 전략으로</span><b>네오와 전략 세우기 <span aria-hidden="true">→</span></b></span>
              </Link>
            </div>
          </section>
          <section className={`${styles.section} ${styles.readingSection}`} aria-labelledby="homeExample">
            <div className={styles.sectionHeading}><h2 id="homeExample">결과를 읽고, 작은 행동으로</h2><p>기질 설명과 현실적인 조언을 함께 읽어보세요. 아래는 공개 쥐띠 운세에 쓰이는 해설의 일부예요.</p></div>
            <figure className={styles.readingExample}><figcaption>쥐띠 운세의 기질·습관 해설 예시</figcaption><blockquote><p>{RESULT_EXAMPLE.strength}</p><p>{RESULT_EXAMPLE.luckyHabit}</p></blockquote><p className={styles.exampleNote}>개인 사주 결과가 아닌 공통 기질 해설이에요. 날짜별 운세에서는 해당 날짜의 일진과 별의 흐름도 함께 확인할 수 있어요.</p><Link href="/fortune/tomorrow/rat/" {...discoveryTracking("zodiac", "next_step")}>쥐띠 내일 운세 전체 읽기</Link></figure>
          </section>
          <section className={styles.section} aria-labelledby="homeMethods">
            <div className={styles.sectionHeading}><h2 id="homeMethods">서로 다른 체계, 나를 이해하는 여러 관점</h2></div>
            <dl className={styles.methods}>
              <div><dt>사주와 자미두수</dt><dd>사주는 생년월일시의 오행·십성·운의 흐름을, 자미두수는 별이 놓인 12궁 명반을 중심으로 읽어요. 꽃돼지 사주와 꽃돼지 자미두수는 각 체계에 맞는 입력과 해석을 제공해요.</dd></div>
              <div><dt>숙요점·베다점·서양 점성술</dt><dd>숙요점은 본명숙과 관계 유형, 베다점은 항성황도에 따른 라그나·다샤, 서양 점성술은 출생차트의 태양·달·상승궁을 살펴봐요. 같은 이름의 별이나 궁이라도 계산 기준과 해석을 섞지 않아요.</dd></div>
              <div><dt>타로와 고민 상담</dt><dd>타로는 질문과 카드의 상징을 통해 마음과 선택지를 읽어요. 영냥이 질문 상담과 운명의 찻집, 네오의 팩폭 전략실에서는 내 상황을 정리하고 실천할 조언을 찾아갈 수 있어요.</dd></div>
            </dl>
            <p className={styles.methodLink}>여러 체계를 함께 읽는 방식은 <Link href="/fusion-fortune/">초융합 운세 안내</Link>에서 확인할 수 있어요.</p>
            <p className={styles.byline}><Link href="/about/#author">{FOOTER_BYLINE}</Link></p>
          </section>
          <section className={styles.section} aria-labelledby="homeFaq">
            <div className={styles.sectionHeading}><h2 id="homeFaq">시작하기 전에 궁금한 점</h2><p>꿀꿀 운세의 공식 홈페이지는 code-destiny.com이에요. CODE DESTINY(코드 데스티니)가 운영해요.</p></div>
            <div className={styles.faqList}>{HOME_FAQS.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}{item.link && <> <Link href={item.link.href}>{item.link.label}</Link></>}</p></details>)}</div>
            <details className={styles.history} data-brand-history=""><summary>이전 서비스 이름 안내</summary><p>{BRAND_FACTS.historyKo} 같은 계정으로 이전 구매 내역과 저장된 결과를 확인할 수 있어요.</p></details>
            <nav className={styles.quickLinks} aria-label="상담 방식과 이용 안내"><Link href="/about/">운영자와 해석 방식</Link><Link href="/editorial-policy/">콘텐츠 편집 원칙</Link><Link href="/faq/">전체 이용 안내</Link></nav>
          </section>
        </div>
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
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd([webPageJsonLd, ...serviceJsonLd, buildFaqPageJsonLd(HOME_FAQS)])}} />
  </>;
}
