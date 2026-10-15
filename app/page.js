import PressCoverage from "./components/PressCoverage";
import Link from "next/link";
import { publicSeoPages } from "../lib/seo/siteSeo";
import { buildWebPageJsonLd } from "../lib/structured-data";
import { serializeJsonLd } from "../lib/seo/json-ld.mjs";
import { BRAND_FACTS } from "../lib/brand/brand-facts.mjs";
import { BUSINESS_IDENTITY } from "../lib/site-policy-config";
import LegacyHomeEntry from "./components/LegacyHomeEntry";
import LocalizedServiceSummary from "./components/LocalizedServiceSummary";
import { SEO_LINK_GROUPS, POLICY_LINKS } from "./components/SiteFooterHub";
import { ILGAN_MONTHLY_MONTHS } from "../lib/saju/ilgan-monthly-registry.mjs";
import { SEO_SERVICE_SCOPES } from "../lib/seo-service-scope";
import styles from "./home-guide.module.css";

// `/` 는 꿀꿀 운세의 공식 대표 홈이다(2026-10-15). 상담 앱 입구는 /ggulggul/ 이고,
// 기능 쿼리가 붙은 `/` 요청은 워커가 앱으로 보낸다(public/_worker.js 루트 분기).
const { service, operator, characters, sameAs, historyKo } = BRAND_FACTS;
const HOME_TITLE = `${service.name} 공식 사이트 | 사주·타로·자미두수`;
const HOME_DESCRIPTION = `${service.name} 공식 홈페이지입니다. ${service.summary}로, 꽃돼지 연이와 네오, 영냥이가 무료 운세와 상담을 안내합니다.`;
const HOME_IMAGE = "https://code-destiny.com/icons/moonlight-garden-v1-512.png";

const SAME_AS_LABELS = { youtube: "유튜브", threads: "쓰레드", instagram: "인스타그램", naverBlog: "네이버 블로그", x: "X" };

export const metadata = {
  metadataBase: new URL(service.siteUrl),
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  keywords: [service.name, ...service.alternateNames, `${service.name} 공식`, operator.nameKo, "무료 사주", "무료 타로", "영냥이", ...publicSeoPages.home.keywords],
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

// Free scope comes from the same source as the service landings.
const HOME_FREE_SERVICES = [
  { path: "/today", title: "오늘의 무료 운세", question: "오늘 하루, 무엇부터 챙기면 좋을까요?" },
  { path: "/saju", title: "무료 사주 풀이", question: "나는 왜 비슷한 선택을 반복할까요?" },
  { path: "/manse", title: "무료 만세력", question: "내 사주 명식과 오행은 어떻게 구성될까요?" },
  { path: "/tarot", title: "무료 타로", question: "지금 고민하는 선택을 다른 시선으로 보고 싶어요." },
  { path: "/sukuyo", title: "무료 숙요점 본명숙", question: "내가 관계에서 편안하게 느끼는 거리는 어느 정도일까요?" },
  { path: "/astrology", title: "무료 점성술 출생차트", question: "태양·달·상승궁은 각각 무엇을 말할까요?" },
];

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
  return <>
    <LegacyHomeEntry />
    <LocalizedServiceSummary><section className={styles.guide} aria-labelledby="homeGuideTitle">
      <h1 id="homeGuideTitle">{service.name} 공식 홈페이지</h1>
      <p>{service.name}는 {service.summary}입니다. 공식 주소는 {service.homeUrl} 이고, 상담은 연이의 정원에서 시작합니다.</p>
      <nav className={styles.paths} aria-label="대표 입구와 상담 안내">
        {/* /ggulggul/ is a static HTML shell without a Next RSC payload. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/ggulggul/">연이의 정원에서 상담 시작하기</a>
        <Link href="/yeongnyangi/">영냥이 상담 입구</Link>
        <Link href="/fortune-chat/">연이와 네오에게 내 고민 상담하기</Link>
        <Link href="/today/">오늘의 무료 운세 보기</Link>
        <Link href="/today/#daily-tarot">무료 타로 세 장 펼치기</Link>
        <Link href="/saju/">무료 사주·만세력 알아보기</Link>
        <Link href="/yeongnyangi/1000-won-fortune/">천원 운세·영냥이 상담 보기</Link>
        <Link href="/yeongnyangi/library/">구매한 상담 다시 열기</Link>
      </nav>
      <section aria-labelledby="brandFactsTitle">
        <h2 id="brandFactsTitle">{service.name}는 어떤 서비스인가요?</h2>
        <dl>
          <dt>공식 서비스명</dt><dd>{service.name}</dd>
          <dt>붙여 쓴 표기</dt><dd>{service.alternateNames.join(", ")} (같은 서비스입니다)</dd>
          <dt>운영</dt><dd>{operator.name} ({operator.nameKo})</dd>
          <dt>공식 주소</dt><dd>{service.homeUrl}</dd>
          <dt>상담 앱 입구</dt><dd>{`${service.siteUrl}${service.appEntryPath}`}</dd>
        </dl>
        <p><Link href="/kkul-kkul-unse/">공식 사이트·표기 안내</Link>, <Link href="/about/">운영자 {operator.name} 소개</Link>, <Link href="/faq/">자주 묻는 질문</Link>에서 자세히 확인할 수 있어요.</p>
      </section>
      <section aria-labelledby="brandCharactersTitle">
        <h2 id="brandCharactersTitle">연이·네오·영냥이는 누구인가요?</h2>
        <ul>{characters.map(character => <li key={character.key}><strong>{character.name}</strong>: {character.role}</li>)}</ul>
      </section>
      <PressCoverage />
      <section aria-labelledby="freeFortuneGuideTitle">
        <h2 id="freeFortuneGuideTitle">어떤 무료 운세를 찾고 있나요?</h2>
        <p>하루의 흐름이 궁금하면 오늘의 운세를, 타고난 기질을 살펴보고 싶다면 사주와 만세력을 골라보세요. 생년월일 없이 지금의 고민을 정리하고 싶을 때는 타로로 시작할 수 있어요. 아래 안내에서 무료로 확인할 내용과 필요한 정보를 먼저 비교할 수 있습니다.</p>
        <div className={styles.links}>
          {HOME_FREE_SERVICES.map(item => <section key={item.path}>
            <h3><Link href={`${item.path}/`}>{item.title}</Link></h3>
            <p>{item.question}</p>
            <p>{SEO_SERVICE_SCOPES[item.path].free}</p>
          </section>)}
        </div>
      </section>
      <section aria-labelledby="personalFortuneGuideTitle">
        <h2 id="personalFortuneGuideTitle">무료 운세와 영냥이 상담은 어떻게 다른가요?</h2>
        <p>무료 운세에서는 공개된 기본 풀이와 계산 결과를 살펴볼 수 있어요. 영냥이 상담은 관계·일·돈처럼 직접 남긴 질문을 계산 결과나 카드 상징과 연결해 읽는 별도 유료 서비스입니다. 기본 결과만 확인하려면 무료 도구를, 나의 상황을 덧붙여 질문하고 싶다면 상담 예시를 먼저 읽어보세요.</p>
        <p><Link href="/yeongnyangi/1000-won-fortune/">천원 운세·천원사주 가격과 상담 예시 비교하기</Link>에서 체계별 입력 정보와 상품 구성을 확인할 수 있어요. 두 사람의 숙요 궁합처럼 별도 유료인 기능은 각 서비스의 이용 안내를 확인해 주세요.</p>
      </section>
      <p>{service.name}와 영냥이는 서로 다른 입구를 유지하되, 구매한 결과와 보관함은 기존 계정과 결제 복구 흐름을 그대로 사용합니다.</p>
      <p>유료 상담은 선택한 상품의 가격과 이용권 적용 여부를 결제 화면에서 확인해 주세요. 결과는 보관함에서 다시 볼 수 있고, 미완성 상담은 같은 주문의 저장된 내용부터 이어받아요. 결과가 열리지 않는다면 다시 결제하기 전에 보관함과 <Link href="/contact/#payment-help">결제·결과 문의</Link>를 확인해 주세요.</p>
      <p>운세는 정해진 미래나 상대의 마음을 보장하지 않아요. 계산 기준과 해석의 한계를 함께 읽고, 관계·직업·돈에 관한 선택은 실제 상황과 함께 판단해 주세요.</p>
      <section aria-labelledby="brandHistoryTitle" data-brand-history="">
        <h2 id="brandHistoryTitle">이전 이름 안내</h2>
        <p>{historyKo}</p>
      </section>
      <section aria-labelledby="brandChannelsTitle">
        <h2 id="brandChannelsTitle">{service.name} 공식 채널</h2>
        <ul>{sameAs.map(profile => <li key={profile.key}><a href={profile.url} rel="noopener" target="_blank">{SAME_AS_LABELS[profile.key]}</a></li>)}</ul>
      </section>
      <details className={styles.directory}>
        <summary>운세 자료실과 이용 안내</summary>
        <nav className={styles.links} aria-label="운세와 읽을거리 전체 탐색">
          <section><h3>운세 자료실</h3><ul>{HOME_PUBLIC_ARCHIVES.map(link=><li key={link.href}><Link href={link.href}>{link.text}</Link></li>)}</ul></section>
          {SEO_LINK_GROUPS.map(group=><section key={group.title}><h3>{group.title}</h3><ul>{group.links.map(link=><li key={link.href}><Link href={link.href}>{link.text}</Link></li>)}</ul></section>)}
        </nav>
      </details>
      <nav className={styles.paths} aria-label="구매 전 정책 확인">
        {/* /ggulggul/ is a static HTML shell without a Next RSC payload. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/ggulggul/#premiumVvipCollection">이용권·월정석·단건 결제 안내</a>
        {POLICY_LINKS.map(link=><Link key={link.href} href={link.href}>{link.text}</Link>)}
      </nav>
      <section aria-labelledby="businessInfoTitle">
        <h2 id="businessInfoTitle">사업자 정보</h2>
        <dl>{BUSINESS_ROWS.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section>
    </section></LocalizedServiceSummary>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(webPageJsonLd)}} />
  </>;
}
