import Link from "next/link";
import { publicSeoPages, siteSeo } from "../lib/seo/siteSeo";
import { buildOrganizationJsonLd, buildWebPageJsonLd } from "../lib/structured-data";
import LegacyHomeEntry from "./components/LegacyHomeEntry";
import LocalizedServiceSummary from "./components/LocalizedServiceSummary";
import { SEO_LINK_GROUPS, POLICY_LINKS } from "./components/SiteFooterHub";
import { ILGAN_MONTHLY_MONTHS } from "../lib/saju/ilgan-monthly-registry.mjs";
import styles from "./home-guide.module.css";

const sourcePage = publicSeoPages.home;
const HOME_TITLE = "꿀꿀 운세 | 사주·타로·연애운 상담 — Code Destiny";
const HOME_DESCRIPTION = "꽃돼지 연이와 네오가 오늘의 운세, 타로, 사주, 연애·재물·인생 흐름을 차근차근 안내합니다. 무료 확인부터 주제별 유료 상담까지 한곳에서 둘러보세요.";
const HOME_SEO = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  ogTitle: HOME_TITLE,
  ogDescription: HOME_DESCRIPTION,
  url: "https://code-destiny.com/",
  image: "https://code-destiny.com/icons/app-logo-512.webp",
};

const page = {
  ...sourcePage,
  title: HOME_SEO.title,
  description: HOME_SEO.description,
  h1: "꿀꿀 운세",
};

export const metadata = {
  metadataBase: new URL("https://code-destiny.com"),
  title: { absolute: HOME_SEO.title },
  description: HOME_SEO.description,
  keywords: ["꿀꿀 운세", "무료 사주", "무료 타로", "연애운", "재물운", "영냥이", ...page.keywords],
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
        width: 800,
        height: 800,
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


export default function HomePage() {
  const orgJsonLd = buildOrganizationJsonLd();
  const webPageJsonLd = buildWebPageJsonLd({title:page.title, description:page.description, path:page.path});
  return <>
    <LegacyHomeEntry defaultTarget="/ggulggul/" />
    <LocalizedServiceSummary><section className={styles.guide} aria-labelledby="homeGuideTitle">
      <h1 id="homeGuideTitle">꿀꿀 운세로 들어가기</h1>
      <p>Code Destiny의 대표 입구는 꽃돼지 연이와 네오가 안내하는 꿀꿀 운세입니다. 무료 타로와 사주 기질 확인으로 가볍게 시작하고, 관계·일·돈·올해의 선택처럼 지금의 질문에 맞는 상담을 이어서 고를 수 있어요.</p>
      <nav className={styles.paths} aria-label="대표 입구와 상담 안내">
        <Link href="/ggulggul/">연이의 정원에서 시작하기</Link>
        <Link href="/today/#daily-tarot">무료 타로 세 장 펼치기</Link>
        <Link href="/saju/">무료 사주·만세력 알아보기</Link>
        <Link href="/yeongnyangi/1000-won-fortune/">영냥이 천원 상담 보기</Link>
        <Link href="/yeongnyangi/library/">구매한 상담 다시 열기</Link>
      </nav>
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
        <Link href="/ggulggul/#premiumVvipCollection">이용권·월정석·단건 결제 안내</Link>
        {POLICY_LINKS.map(link=><Link key={link.href} href={link.href}>{link.text}</Link>)}
      </nav>
    </section></LocalizedServiceSummary>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(orgJsonLd)}} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(webPageJsonLd)}} />
  </>;
}
