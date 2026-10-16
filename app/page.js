import PressCoverage from "./components/PressCoverage";
import Link from "next/link";
import { publicSeoPages } from "../lib/seo/siteSeo";
import { buildServiceJsonLd, buildWebPageJsonLd } from "../lib/structured-data";
import { serializeJsonLd } from "../lib/seo/json-ld.mjs";
import { brandCopy } from "../lib/seo/brand-copy.mjs";
import { BRAND_FACTS } from "../lib/brand/brand-facts.mjs";
import { BUSINESS_IDENTITY } from "../lib/site-policy-config";
import LegacyHomeEntry from "./components/LegacyHomeEntry";
import LocalizedServiceSummary from "./components/LocalizedServiceSummary";
import { SEO_LINK_GROUPS, POLICY_LINKS } from "./components/SiteFooterHub";
import { ILGAN_MONTHLY_MONTHS } from "../lib/saju/ilgan-monthly-registry.mjs";
import { SEO_SERVICE_SCOPES } from "../lib/seo-service-scope";
import { products as YEONGNYANGI_PRODUCTS } from "../worker/yeongnyangi/payments/catalog";
import { FEATURE_KEY_PRICE_TABLE } from "../worker/lib/paid-feature-registry.js";
import { currentPassPlan } from "../lib/payment/pass-policy.js";
import "./yeongnyangi/night-tokens.css";
import styles from "./home-main.module.css";

// `/` 는 꿀꿀 운세의 공식 대표 홈이다(2026-10-15). 상담 앱 입구는 /ggulggul/ 이고,
// 기능 쿼리가 붙은 `/` 요청은 워커가 앱으로 보낸다(public/_worker.js 루트 분기).
// 2026-10-16: 첫 화면은 두 장의 타로 카드로 서비스를 고른다 — I 꿀꿀 운세(연이의 종합 운세 백화점, --cd-*),
// II 운세보는 영냥이(질문 특화 상담, --yn-*).
const { service, operator, characters, sameAs, historyKo } = BRAND_FACTS;
const YEONGNYANGI = characters.find((character) => character.key === "yeongnyangi");
// 영냥이 상담에는 천원 상품이 없다. 시작 가격은 결제 카탈로그(고등어)에서 읽는다.
const YEONGNYANGI_STARTER_PRICE = `${YEONGNYANGI_PRODUCTS.find((product) => product.id === "saju_mackerel").priceKRW.toLocaleString("ko-KR")}원`;
// 연이 카드의 가격대 문구도 정본에서 읽는다(재미 사주 3종 가격, 꿀단지 이용권 기간).
const FUN_PRICE = `${FEATURE_KEY_PRICE_TABLE.rpt_specialCharmCard.amountKRW.toLocaleString("ko-KR")}원`;
const PASS_DAYS = currentPassPlan("standard").durationDays;
const HOME_TITLE = `${service.name} 공식 사이트 | ${YEONGNYANGI.serviceName}·사주·타로`;
const HOME_DESCRIPTION = `${service.name} 공식 홈페이지입니다. 꽃돼지 연이의 무료 사주·타로·만세력 운세와 사주보는 고양이 ${YEONGNYANGI.serviceName}의 고민 상담을 한곳에서 만나보세요.`;
const HOME_IMAGE = "https://code-destiny.com/icons/moonlight-garden-v1-512.png";
const ART = "/images/home/illustrated";

const SAME_AS_LABELS = { youtube: "유튜브", threads: "쓰레드", instagram: "인스타그램", naverBlog: "네이버 블로그", x: "X" };

export const metadata = {
  metadataBase: new URL(service.siteUrl),
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  keywords: [service.name, ...service.alternateNames, `${service.name} 공식`, YEONGNYANGI.serviceName, operator.nameKo, "무료 사주", "무료 타로", "영냥이", ...publicSeoPages.home.keywords],
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

const HOME_PUBLIC_ARCHIVES = [
  { href: "/fortune/date/", text: "날짜별 띠 운세" },
  ...Object.entries(ILGAN_MONTHLY_MONTHS).map(([month, info]) => ({
    href: `/saju/monthly/${month}/`, text: `${info.label} 일간별 운세`,
  })),
  { href: "/insights/famous-saju/", text: "유명인 사주" },
  { href: "/human-design/", text: "휴먼디자인 알아보기" },
  { href: "/psychotest/", text: "심리테스트 모아보기" },
];

// Free scope comes from the same source as the service landings. Icons are decorative.
const HOME_FREE_SERVICES = [
  { path: "/today", icon: "vedic", title: "오늘의 무료 운세", question: "오늘 하루, 무엇부터 챙기면 좋을까요?" },
  { path: "/saju", icon: "saju", title: "무료 사주 풀이", question: "나는 왜 비슷한 선택을 반복할까요?" },
  { path: "/manse", icon: "ziwei", title: "무료 만세력", question: "내 사주 명식과 오행은 어떻게 구성될까요?" },
  { path: "/tarot", icon: "tarot", title: "무료 타로", question: "지금 고민하는 선택을 다른 시선으로 보고 싶어요." },
  { path: "/sukuyo", icon: "sukuyo", title: "무료 숙요점 본명숙", question: "내가 관계에서 편안하게 느끼는 거리는 어느 정도일까요?" },
  { path: "/astrology", icon: "astrology", title: "무료 점성술 출생차트", question: "태양·달·상승궁은 각각 무엇을 말할까요?" },
];

// 첫 화면의 두 장. 연이 카드가 기본 선택이다(무료로 시작하는 쪽이 문턱이 가장 낮다).
const MODE_CARDS = [
  { key: "yeoni", id: "modeYeoni", titleId: "dayDoorTitle", panelId: "modePanelYeoni", className: "yeoniCard", art: "yeoni", numeral: "I", name: service.name, tag: "종합 운세 백화점", hint: "무료부터 프리미엄까지" },
  { key: "yn", id: "modeYn", titleId: "nightDoorTitle", panelId: "modePanelYn", className: "ynCard", art: "yeongnyangi", numeral: "II", name: YEONGNYANGI.serviceName, tag: "질문 특화 상담", hint: `고등어 ${YEONGNYANGI_STARTER_PRICE}부터`, night: true },
];
const CARD_ART_SIZES = "(min-width: 981px) 200px, (min-width: 641px) 210px, 40vw";

const CHARACTER_AVATARS = {
  yeoni: { src: `${ART}/yeoni-character-320.webp`, srcSet: `${ART}/yeoni-character-320.webp 320w, ${ART}/yeoni-character-480.webp 480w` },
  neo: { src: `${ART}/neo-character-320.webp`, srcSet: `${ART}/neo-character-320.webp 320w, ${ART}/neo-character-480.webp 480w` },
  yeongnyangi: { src: "/icons/yeongnyangi-130.webp", srcSet: "/icons/yeongnyangi-130.webp 130w, /assets/yeongnyangi/original/hero-480.webp 480w", night: true },
};

const BUSINESS_ROWS = [
  ["상호", BUSINESS_IDENTITY.companyName],
  ["대표", BUSINESS_IDENTITY.representative],
  ["사업자등록번호", BUSINESS_IDENTITY.registrationNumber],
  ["통신판매업 신고", BUSINESS_IDENTITY.mailOrderNumber],
  ["전화", BUSINESS_IDENTITY.phone],
  ["이메일", BUSINESS_IDENTITY.email],
  ["주소", BUSINESS_IDENTITY.address],
];

export default function HomePage() {
  const webPageJsonLd = buildWebPageJsonLd({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: "/" });
  const serviceJsonLd = [
    buildServiceJsonLd({ name: service.name, description: "꽃돼지 연이가 안내하는 무료 사주·타로·만세력 운세와 상담", path: service.appEntryPath }),
    buildServiceJsonLd({ name: YEONGNYANGI.serviceName, alternateName: [...YEONGNYANGI.alternateNames], description: brandCopy("yeongnyangiDescription"), path: YEONGNYANGI.path }),
  ];
  return <>
    <LegacyHomeEntry />
    <LocalizedServiceSummary><div className={styles.page}>
      <header className={styles.brandRow}>
        <div className={styles.inner}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.brandMark} src="/images/yeoni/welcome/yeoni-mark-v1-96.webp" width={96} height={96} alt="" decoding="async" />
          <span className={styles.wordmark}>{service.name}</span>
        </div>
      </header>

      <main>
        <div className={`${styles.inner} ${styles.stage}`}>
          <section className={styles.hero} aria-labelledby="homeGuideTitle">
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>사주 · 타로 · 자미두수</p>
              <h1 id="homeGuideTitle"><span className={styles.h1Main}>{service.name}</span>{" "}<span className={styles.h1Sub}>공식 홈페이지</span></h1>
              <p className={styles.lead}>꽃돼지 연이의 종합 운세 백화점과 {YEONGNYANGI.serviceName}의 질문 상담을 한곳에서.</p>
              <p className={styles.heroNote}>무료부터 프리미엄까지 고르는 운세는 연이에게, 마음에 걸린 질문 하나는 영냥이에게 맡겨 보세요.</p>
            </div>
          </section>

          {/* 두 장의 타로 카드로 서비스를 고른다. 기본 라디오 + CSS 라 JS 없이 방향키·스크린리더 안내가 그대로 동작하고,
              :has 를 모르는 브라우저에서는 두 안내가 모두 보인다. 카드 제목은 검색 신호를 위해 h2 로 남긴다. */}
          <section className={styles.modes} aria-labelledby="modePrompt">
            <div className={styles.modesHead}>
              <p id="modePrompt" className={styles.modePrompt}>어떤 카드를 뽑을까요?</p>
              <p className={styles.modeHint}>한 장을 고르면 그 서비스로 안내해 드려요.</p>
            </div>
            <div className={styles.deck} role="radiogroup" aria-labelledby="modePrompt">
              {MODE_CARDS.map(card => <div key={card.id} className={`${styles.card} ${styles[card.className]}`} data-yn-night={card.night ? "" : undefined}>
                <input className={styles.modeInput} type="radio" name="homeMode" id={card.id} value={card.key} defaultChecked={card.key === "yeoni"} aria-describedby={`${card.id}Tag ${card.id}Hint`} aria-controls={card.panelId} />
                <div className={styles.cardFrame}>
                  <span className={styles.cardNumeral} aria-hidden="true">{card.numeral}</span>
                  <picture className={styles.cardArt}>
                    <source type="image/avif" srcSet={`${ART}/root-card-${card.art}-360.avif 360w, ${ART}/root-card-${card.art}-600.avif 600w`} sizes={CARD_ART_SIZES} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${ART}/root-card-${card.art}-360.webp`} srcSet={`${ART}/root-card-${card.art}-360.webp 360w, ${ART}/root-card-${card.art}-600.webp 600w`} sizes={CARD_ART_SIZES} width={360} height={480} alt="" decoding="async" />
                  </picture>
                  <h2 id={card.titleId} className={styles.cardName}><label htmlFor={card.id}>{card.name}</label></h2>
                  <p id={`${card.id}Tag`} className={styles.cardTag}>{card.tag}</p>
                  <p id={`${card.id}Hint`} className={styles.cardHint}>{card.hint}</p>
                  <span className={styles.cardSeal} aria-hidden="true">선택</span>
                </div>
              </div>)}
            </div>
            <div className={styles.panels}>
              <article id="modePanelYeoni" className={`${styles.panel} ${styles.yeoniPanel}`} data-panel="yeoni" aria-labelledby="dayDoorTitle">
                <p className={styles.panelKicker}><span aria-hidden="true">I · </span>종합 운세 백화점</p>
                <p className={styles.panelLead}>무료 운세 {HOME_FREE_SERVICES.length}가지로 가볍게 시작하고, {FUN_PRICE} 재미 사주부터 깊이 읽는 프리미엄 리포트, {PASS_DAYS}일 꿀단지 이용권까지 예산과 취향에 맞게 골라 보세요.</p>
                {/* /ggulggul/ is a static HTML shell without a Next RSC payload. */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/ggulggul/" className={`cd-yehwa-button cd-yehwa-button--primary ${styles.panelCta}`}>연이의 운세 백화점 둘러보기</a>
                <ul className={styles.panelLinks}>
                  <li><Link href="/today/">오늘의 무료 운세 보기</Link></li>
                  <li><Link href="/today/#daily-tarot">무료 타로 세 장 펼치기</Link></li>
                  <li><Link href="/fortune-chat/">연이와 네오에게 고민 상담하기</Link></li>
                </ul>
              </article>
              <article id="modePanelYn" className={`${styles.panel} ${styles.ynPanel}`} data-panel="yn" data-yn-night="" aria-labelledby="nightDoorTitle">
                <p className={styles.panelKicker}><span aria-hidden="true">II · </span>질문 특화 상담</p>
                <p className={styles.panelLead}>관계·일·돈처럼 마음에 걸린 질문 하나를 남기면, 영냥이가 사주·타로로 그 질문을 깊게 풀어 드려요. 생선 등급에 따라 상담 범위가 달라져요.</p>
                <Link href={YEONGNYANGI.path} className={styles.ynCta}>영냥이에게 질문하기</Link>
                <ul className={styles.panelLinks}>
                  <li><Link href="/yeongnyangi/#yn-prices">생선별 상담 가격 보기 (고등어 {YEONGNYANGI_STARTER_PRICE}부터)</Link></li>
                  <li><Link href="/yeongnyangi/#yn-example">결제 전 상담 예시 읽기</Link></li>
                  <li><Link href="/yeongnyangi/library/">구매한 상담 다시 열기</Link></li>
                </ul>
              </article>
            </div>
          </section>

          {/* 980px 이하는 제목 → 카드 고르기 → 그림 순서라 첫 화면에 두 카드와 시작 버튼이 든다. ≥981 은 grid-area 로 [제목·그림 | 카드] 두 열. */}
          <picture className={styles.heroArt}>
            <source media="(max-width: 640px)" type="image/avif" srcSet={`${ART}/root-duo-dusk-mobile-480.avif 480w, ${ART}/root-duo-dusk-mobile-800.avif 800w`} sizes="calc(100vw - 46px)" width={800} height={600} />
            <source media="(max-width: 640px)" type="image/webp" srcSet={`${ART}/root-duo-dusk-mobile-480.webp 480w, ${ART}/root-duo-dusk-mobile-800.webp 800w`} sizes="calc(100vw - 46px)" width={800} height={600} />
            <source type="image/avif" srcSet={`${ART}/root-duo-dusk-768.avif 768w, ${ART}/root-duo-dusk-1280.avif 1280w, ${ART}/root-duo-dusk-1536.avif 1536w`} sizes="(min-width: 981px) 680px, calc(100vw - 62px)" />
            <source type="image/webp" srcSet={`${ART}/root-duo-dusk-768.webp 768w, ${ART}/root-duo-dusk-1280.webp 1280w, ${ART}/root-duo-dusk-1536.webp 1536w`} sizes="(min-width: 981px) 680px, calc(100vw - 62px)" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ART}/root-duo-dusk-1280.webp`} width={1536} height={1024} alt={`꽃돼지 연이와 ${YEONGNYANGI.serviceName}가 찻상에 마주 앉은 모습`} fetchPriority="high" />
          </picture>
        </div>

        <section className={styles.section} aria-labelledby="freeFortuneGuideTitle">
          <div className={styles.inner}>
            <div className={styles.sectionHead}>
              <h2 id="freeFortuneGuideTitle">어떤 무료 운세를 찾고 있나요?</h2>
              <p>하루의 흐름이 궁금하면 오늘의 운세를, 타고난 기질을 살펴보고 싶다면 사주와 만세력을 골라보세요. 생년월일 없이 지금의 고민을 정리하고 싶을 때는 타로로 시작할 수 있어요. 아래 안내에서 무료로 확인할 내용과 필요한 정보를 먼저 비교할 수 있습니다.</p>
            </div>
            <ul className={styles.tools}>
              {HOME_FREE_SERVICES.map(item => <li key={item.path} className={styles.tool}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ART}/method-${item.icon}-160.webp`} width={160} height={160} alt="" loading="lazy" decoding="async" />
                <h3><Link href={`${item.path}/`}>{item.title}</Link></h3>
                <p className={styles.toolQuestion}>{item.question}</p>
                <p className={styles.toolScope}>{SEO_SERVICE_SCOPES[item.path].free}</p>
              </li>)}
            </ul>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="personalFortuneGuideTitle">
          <div className={styles.inner}>
            <div className={styles.sectionHead}>
              <h2 id="personalFortuneGuideTitle">무료 운세와 영냥이 상담은 어떻게 다른가요?</h2>
            </div>
            <div className={styles.compare}>
              <div className={`${styles.compareCard} ${styles.compareFree}`}>
                <h3>무료 운세</h3>
                <p>무료 운세에서는 공개된 기본 풀이와 계산 결과를 살펴볼 수 있어요. 기본 결과만 확인하려면 무료 도구를 골라보세요.</p>
              </div>
              <div className={`${styles.compareCard} ${styles.compareNight}`} data-yn-night="">
                <h3>{YEONGNYANGI.serviceName} 상담</h3>
                <p>영냥이 상담은 관계·일·돈처럼 직접 남긴 질문을 계산 결과나 카드 상징과 연결해 읽는 별도 유료 서비스입니다. 나의 상황을 덧붙여 질문하고 싶다면 상담 예시를 먼저 읽어보세요.</p>
                <p>질문 상담은 고등어 {YEONGNYANGI_STARTER_PRICE}부터이고, 생선 등급에 따라 상담 범위가 달라져요.</p>
                <p><Link href="/yeongnyangi/#yn-prices">영냥이 상담 가격과 예시 보기</Link></p>
              </div>
            </div>
            <p className={styles.compareNote}>체계별 입력 정보와 상품 구성은 {YEONGNYANGI.serviceName} 안내에서 확인할 수 있어요. 두 사람의 숙요 궁합처럼 별도 유료인 기능은 각 서비스의 이용 안내를 확인해 주세요.</p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="brandCharactersTitle">
          <div className={styles.inner}>
            <div className={styles.sectionHead}>
              <h2 id="brandCharactersTitle">연이·네오·영냥이는 누구인가요?</h2>
            </div>
            <ul className={styles.characters}>
              {characters.map(character => {
                const avatar = CHARACTER_AVATARS[character.key];
                return <li key={character.key} className={styles.character}>
                  <span className={styles.avatar} data-yn-night={avatar.night ? "" : undefined}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatar.src} srcSet={avatar.srcSet} sizes="(min-width: 641px) 112px, 72px" width={320} height={320} alt="" loading="lazy" decoding="async" />
                  </span>
                  <span className={styles.characterText}><strong>{character.serviceName ?? character.name}</strong><span>{character.role}</span></span>
                </li>;
              })}
            </ul>
          </div>
        </section>

        <div className={styles.inner}><PressCoverage /></div>

        <section className={styles.section} aria-labelledby="brandFactsTitle">
          <div className={styles.inner}>
            <div className={styles.factsCard}>
              <h2 id="brandFactsTitle">{service.name}는 어떤 서비스인가요?</h2>
              <p>{service.name}는 {service.summary}입니다.</p>
              <dl className={styles.facts}>
                <div><dt>공식 서비스명</dt><dd>{service.name}</dd></div>
                <div><dt>붙여 쓴 표기</dt><dd>{service.alternateNames.join(", ")} <span className={styles.nowrap}>(같은 서비스입니다)</span></dd></div>
                <div><dt>영냥이 상담</dt><dd>{YEONGNYANGI.serviceName} — <span className={styles.nowrap}>{service.siteUrl}</span><wbr />{YEONGNYANGI.path}</dd></div>
                <div><dt>운영</dt><dd>{operator.name} <span className={styles.nowrap}>({operator.nameKo})</span></dd></div>
                <div><dt>공식 주소</dt><dd>{service.homeUrl}</dd></div>
                <div><dt>상담 앱 입구</dt><dd><span className={styles.nowrap}>{service.siteUrl}</span><wbr />{service.appEntryPath}</dd></div>
              </dl>
              <ul className={styles.factsLinks} aria-label="더 알아보기">
                <li><Link href="/kkul-kkul-unse/">공식 사이트·표기 안내</Link></li>
                <li><Link href="/about/">운영자 {operator.name} 소개</Link></li>
                <li><Link href="/faq/">자주 묻는 질문</Link></li>
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="homeUsageTitle">
          <div className={`${styles.inner} ${styles.prose}`}>
            <h2 id="homeUsageTitle">이용 전에 알아두세요</h2>
            <p>{service.name}와 {YEONGNYANGI.serviceName}는 서로 다른 입구를 유지하되, 구매한 결과와 보관함은 기존 계정과 결제 복구 흐름을 그대로 사용합니다.</p>
            <p>유료 상담은 선택한 상품의 가격과 이용권 적용 여부를 결제 화면에서 확인해 주세요. 결과는 보관함에서 다시 볼 수 있고, 미완성 상담은 같은 주문의 저장된 내용부터 이어받아요. 결과가 열리지 않는다면 다시 결제하기 전에 보관함과 <Link href="/contact/#payment-help">결제·결과 문의</Link>를 확인해 주세요.</p>
            <p>운세는 정해진 미래나 상대의 마음을 보장하지 않아요. 계산 기준과 해석의 한계를 함께 읽고, 관계·직업·돈에 관한 선택은 실제 상황과 함께 판단해 주세요.</p>
          </div>
        </section>

        <section className={`${styles.inner} ${styles.history}`} aria-labelledby="brandHistoryTitle" data-brand-history="">
          <h2 id="brandHistoryTitle">이전 이름 안내</h2>
          <p>{historyKo}</p>
        </section>

        <div className={`${styles.inner} ${styles.section}`}>
          <details className={styles.directory}>
            <summary>운세 자료실과 이용 안내</summary>
            <nav className={styles.directoryGrid} aria-label="운세와 읽을거리 전체 탐색">
              <section><h3>운세 자료실</h3><ul>{HOME_PUBLIC_ARCHIVES.map(link=><li key={link.href}><Link href={link.href}>{link.text}</Link></li>)}</ul></section>
              {SEO_LINK_GROUPS.map(group=><section key={group.title}><h3>{group.title}</h3><ul>{group.links.map(link=><li key={link.href}><Link href={link.href}>{link.text}</Link></li>)}</ul></section>)}
            </nav>
          </details>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.inner}>
          <p className={styles.footerBrand}><strong>{service.name}</strong><span>운영 {operator.name} ({operator.nameKo})</span></p>
          <nav className={styles.footerNav} aria-label="구매 전 정책 확인">
            {/* /ggulggul/ is a static HTML shell without a Next RSC payload. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/ggulggul/#premiumVvipCollection">이용권·월정석·단건 결제 안내</a>
            {POLICY_LINKS.map(link=><Link key={link.href} href={link.href}>{link.text}</Link>)}
          </nav>
          <section aria-labelledby="brandChannelsTitle">
            <h2 id="brandChannelsTitle">{service.name} 공식 채널</h2>
            <ul className={styles.channels}>{sameAs.map(profile => <li key={profile.key}><a href={profile.url} rel="noopener" target="_blank">{SAME_AS_LABELS[profile.key]}</a></li>)}</ul>
          </section>
          <section aria-labelledby="businessInfoTitle">
            <h2 id="businessInfoTitle">사업자 정보</h2>
            <dl className={styles.business}>{BUSINESS_ROWS.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          </section>
        </div>
      </footer>
    </div></LocalizedServiceSummary>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd([webPageJsonLd, ...serviceJsonLd])}} />
  </>;
}
