import Link from "next/link";
import { publicSeoPages, siteSeo } from "../lib/seo/siteSeo";
import { buildOrganizationJsonLd, buildWebPageJsonLd } from "../lib/structured-data";
import YeongnyangiHome from "./yeongnyangi/_components/Home";
import LegacyHomeEntry from "./components/LegacyHomeEntry";
import LocalizedServiceSummary from "./components/LocalizedServiceSummary";
import { SEO_LINK_GROUPS } from "./components/SiteFooterHub";
import { ILGAN_MONTHLY_MONTHS } from "../lib/saju/ilgan-monthly-registry.mjs";
import { getProduct } from "../worker/yeongnyangi/payments/catalog";
import styles from "./home-guide.module.css";

const sourcePage = publicSeoPages.home;
const starterPrice = getProduct("saju_mackerel").priceKRW.toLocaleString("ko-KR");
const HOME_TITLE = "천원운세부터 보는 사주·타로 | 영냥이 — Code Destiny";
const HOME_DESCRIPTION = `천원운세부터 시작하는 영냥이. 사주·타로·자미두수·숙요점·베다점·점성술 고등어 상담을 ${starterPrice}원 단건 결제로 이용하세요. 상담 예시와 상품별 가격을 먼저 확인하세요.`;
const HOME_SEO = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  ogTitle: HOME_TITLE,
  ogDescription: HOME_DESCRIPTION,
  url: "https://code-destiny.com/",
  image: "https://code-destiny.com/assets/yeongnyangi/original/kakao-profile.png",
};

const page = {
  ...sourcePage,
  title: HOME_SEO.title,
  description: HOME_SEO.description,
  h1: "사주보는 고양이 영냥이",
};

export const metadata = {
  metadataBase: new URL("https://code-destiny.com"),
  title: { absolute: HOME_SEO.title },
  description: HOME_SEO.description,
  keywords: ["천원운세", "천원 운세", "1000원 운세", "1,000원 운세", "천원사주", "영냥이", ...page.keywords],
  alternates: {
    canonical: HOME_SEO.url,
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
    <LegacyHomeEntry />
    <YeongnyangiHome />
    <LocalizedServiceSummary><section className={styles.guide} aria-labelledby="homeGuideTitle">
      <h2 id="homeGuideTitle">처음 오셨다면, 이렇게 시작해 보세요</h2>
      <p>영냥이는 생년월일이나 타로 카드에서 읽은 단서를 지금의 고민과 연결하는 상담이에요. 무료로 나의 기질을 먼저 살펴보거나, 답을 얻고 싶은 질문이 있다면 상담 예시와 상품 구성을 확인한 뒤 바로 시작할 수 있어요.</p>
      <nav className={styles.paths} aria-label="무료 체험과 상담 안내">
        <Link href="/saju/">무료 사주·만세력 알아보기</Link>
        <Link href="/yeongnyangi/1000-won-fortune/">천원 상담의 가격과 결과 예시</Link>
        <Link href="/ggulggul/">꽃돼지 연이와 꿀꿀 운세 둘러보기</Link>
        <Link href="/yeongnyangi/library/">구매한 상담 다시 열기</Link>
      </nav>
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
        <Link href="/terms#refund-policy">환불정책</Link>
        <Link href="/privacy">개인정보처리방침</Link>
        <Link href="/contact/">고객센터</Link>
      </nav>
    </section></LocalizedServiceSummary>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(orgJsonLd)}} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(webPageJsonLd)}} />
  </>;
}
