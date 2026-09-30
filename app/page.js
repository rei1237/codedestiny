import Link from "next/link";
import { publicSeoPages, siteSeo } from "../lib/seo/siteSeo";
import { buildOrganizationJsonLd, buildWebPageJsonLd } from "../lib/structured-data";
import LegacyHomeEntry from "./components/LegacyHomeEntry";
import LocalizedServiceSummary from "./components/LocalizedServiceSummary";
import { SEO_LINK_GROUPS, POLICY_LINKS } from "./components/SiteFooterHub";
import { ILGAN_MONTHLY_MONTHS } from "../lib/saju/ilgan-monthly-registry.mjs";
import { SEO_SERVICE_SCOPES } from "../lib/seo-service-scope";
import styles from "./home-guide.module.css";

const sourcePage = publicSeoPages.home;
const HOME_TITLE = `무료 운세·사주·타로와 천원 상담 | ${siteSeo.brandName}`;
const HOME_DESCRIPTION = "오늘의 무료 운세와 사주·만세력, 타로 기본 풀이를 살펴보세요. 무료 이용 범위와 영냥이 천원 상담을 비교하고 내 질문에 맞는 서비스를 골라보세요.";
const HOME_SEO = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  ogTitle: HOME_TITLE,
  ogDescription: HOME_DESCRIPTION,
  url: "https://code-destiny.com/",
  image: "https://code-destiny.com/icons/moonlight-garden-v1-512.png",
};

const page = {
  ...sourcePage,
  title: HOME_SEO.title,
  description: HOME_SEO.description,
  h1: siteSeo.brandName,
};

export const metadata = {
  metadataBase: new URL("https://code-destiny.com"),
  title: { absolute: HOME_SEO.title },
  description: HOME_SEO.description,
  keywords: [siteSeo.brandName, "꿀꿀 운세", "무료 사주", "무료 타로", "연애운", "재물운", "영냥이", ...page.keywords],
  alternates: {
    canonical: HOME_SEO.url,
    languages: {
      "ko-KR": HOME_SEO.url,
      "x-default": HOME_SEO.url,
    },
  },
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
    url: HOME_SEO.url,
    siteName: siteSeo.brandName,
    title: HOME_SEO.ogTitle,
    description: HOME_SEO.ogDescription,
    images: [
      {
        url: HOME_SEO.image,
        width: 512,
        height: 512,
        alt: HOME_SEO.ogTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_SEO.ogTitle,
    description: HOME_SEO.ogDescription,
    images: [HOME_SEO.image],
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


export default function HomePage() {
  const orgJsonLd = buildOrganizationJsonLd();
  const webPageJsonLd = buildWebPageJsonLd({title:page.title, description:page.description, path:page.path});
  return <>
    <LegacyHomeEntry />
    <LocalizedServiceSummary><section className={styles.guide} aria-labelledby="homeGuideTitle">
      <h1 id="homeGuideTitle">무료 운세부터 나의 질문에 맞는 상담까지</h1>
      <p>사주 달빛정원은 꿀꿀 운세의 꽃돼지 연이·네오와 영냥이를 함께 만나는 Code Destiny의 운세 상담 공간입니다. 무료 타로와 사주 기질 확인으로 가볍게 시작하고, 관계·일·돈·올해의 선택처럼 지금의 질문에 맞는 상담을 이어서 고를 수 있어요.</p>
      <nav className={styles.paths} aria-label="대표 입구와 상담 안내">
        {/* /ggulggul/ is a static HTML shell without a Next RSC payload. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/ggulggul/">연이의 정원에서 시작하기</a>
        <Link href="/today/">오늘의 무료 운세 보기</Link>
        <Link href="/today/#daily-tarot">무료 타로 세 장 펼치기</Link>
        <Link href="/saju/">무료 사주·만세력 알아보기</Link>
        <Link href="/yeongnyangi/1000-won-fortune/">영냥이 천원 상담 보기</Link>
        <Link href="/yeongnyangi/library/">구매한 상담 다시 열기</Link>
      </nav>
      <section aria-labelledby="freeFortuneGuideTitle">
        <h2 id="freeFortuneGuideTitle">어떤 무료 운세를 찾고 있나요?</h2>
        <p>하루의 흐름이 궁금하면 오늘의 운세를, 타고난 기질을 살펴보고 싶다면 사주와 만세력을 골라보세요. 생년월일 없이 지금의 고민을 정리하고 싶을 때는 타로로 시작할 수 있어요. 아래 안내에서 무료로 확인할 내용과 필요한 정보를 먼저 비교할 수 있습니다.</p>
        <div className={styles.links}>
          {HOME_FREE_SERVICES.map(service => <section key={service.path}>
            <h3><Link href={`${service.path}/`}>{service.title}</Link></h3>
            <p>{service.question}</p>
            <p>{SEO_SERVICE_SCOPES[service.path].free}</p>
          </section>)}
        </div>
      </section>
      <section aria-labelledby="personalFortuneGuideTitle">
        <h2 id="personalFortuneGuideTitle">무료 운세와 천원 상담은 어떻게 다른가요?</h2>
        <p>무료 운세에서는 공개된 기본 풀이와 계산 결과를 살펴볼 수 있어요. 영냥이 상담은 관계·일·돈처럼 직접 남긴 질문을 계산 결과나 카드 상징과 연결해 읽는 별도 유료 서비스입니다. 기본 결과만 확인하려면 무료 도구를, 나의 상황을 덧붙여 질문하고 싶다면 상담 예시를 먼저 읽어보세요.</p>
        <p><Link href="/yeongnyangi/1000-won-fortune/">천원 운세·천원사주 가격과 상담 예시 비교하기</Link>에서 체계별 입력 정보와 상품 구성을 확인할 수 있어요. 두 사람의 숙요 궁합처럼 별도 유료인 기능은 각 서비스의 이용 안내를 확인해 주세요.</p>
      </section>
      <p>영냥이는 지금 마음에 걸리는 질문 하나를 달빛 점술방에서 편하게 꺼내는 별도 상담 세계입니다. 꿀꿀 운세와 영냥이는 서로 다른 입구를 유지하되, 구매한 결과와 보관함은 기존 계정과 결제 복구 흐름을 그대로 사용합니다.</p>
      <p>유료 상담은 선택한 상품의 가격과 이용권 적용 여부를 결제 화면에서 확인해 주세요. 결과는 보관함에서 다시 볼 수 있고, 미완성 상담은 같은 주문의 저장된 내용부터 이어받아요. 결과가 열리지 않는다면 다시 결제하기 전에 보관함과 <Link href="/contact/#payment-help">결제·결과 문의</Link>를 확인해 주세요.</p>
      <p>운세는 정해진 미래나 상대의 마음을 보장하지 않아요. 계산 기준과 해석의 한계를 함께 읽고, 관계·직업·돈에 관한 선택은 실제 상황과 함께 판단해 주세요.</p>
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
    </section></LocalizedServiceSummary>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(orgJsonLd)}} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(webPageJsonLd)}} />
  </>;
}
