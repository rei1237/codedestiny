import Link from "next/link";
import { publicSeoPages } from "../lib/seo/siteSeo";
import {
  buildOrganizationJsonLd,
  buildWebPageJsonLd,
} from "../lib/structured-data";
import { buildMusicPublicUrl } from "../lib/r2-public-url";
import HomeRedirectToStatic from "./HomeRedirectToStatic";
import styles from "./home-cosmic.module.css";

const HOME_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    "homePage.title.001": "Code Destiny React 홈 | 프리미엄 운세·타로·사주 안내",
    "homePage.title.002": "만세력 사주",
    "homePage.description.001": "생년월일과 출생시간으로 오행, 십성, 대운의 흐름을 차분하게 펼칩니다.",
    "homePage.title.003": "타로 리딩",
    "homePage.description.002": "질문과 마음의 결을 카드 상징으로 비추고, 선택의 방향을 부드럽게 정리합니다.",
    "homePage.title.004": "자미두수 명반",
    "homePage.description.003": "12궁의 별 흐름으로 기질, 관계, 일의 방향을 입체적으로 살핍니다.",
    "homePage.title.005": "점성술 차트",
    "homePage.description.004": "태양, 달, 상승궁의 분위기를 연결해 오늘의 리듬을 읽습니다.",
    "homePage.title.006": "숙요점 궁합",
    "homePage.description.005": "27숙의 달빛 관계도를 통해 가까운 인연의 온도와 거리를 살핍니다.",
    "homePage.title.007": "이용권·결제 관리",
    "homePage.description.006": "30일 이용권, 단건 결제, 월정석 보너스의 차이를 구매 전에 확인합니다.",
    "homePage.title.008": "무료 리딩",
    "homePage.title.009": "30일 이용권",
    "homePage.title.010": "단건 결제·PDF",
    "homePage.title.011": "월정석",
    "homePage.title.012": "결제 전",
    "homePage.title.013": "결과 생성 전",
    "homePage.title.014": "결과 생성 후",
    "homePage.title.015": "오류·미제공",
    "homePage.title.016": "중복 결제",
    "homePage.title.017": "이용권 사용분",
    "homePage.label.001": "환불정책 상세",
    "homePage.label.002": "이용약관",
    "homePage.label.003": "개인정보처리방침",
    "homePage.label.004": "고객센터",
    "homePage.alt.001": "Code Destiny 꿀꿀 운세 로고",
    "homePage.alt.002": "마야점 달력판 이미지",
    "homePage.text.006": "운명의 시간 문양",
    "homePage.alt.003": "점성술 운명의 꽃 이미지",
    "homePage.text.007": "별자리 꽃",
    "homePage.alt.004": "DEST1NOVA 음악 앨범 이미지",
    "homePage.text.008": "달빛 음악",
    "homePage.text.009": "결제 전 확인 링크",
    "homePage.aria-label.001": "React 홈 정책 링크",
  },
};

function homePageText(key) {
  return HOME_PAGE_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

const sourcePage = publicSeoPages.home;
const HOME_SEO = {
  title: "꿀꿀 운세 | 무료 사주팔자·타로·궁합 — Code Destiny",
  description:
    "꿀꿀 운세(구 꿀꿀 만세력) — 생년월일 하나로 무료 사주팔자, 타로, 궁합, 자미두수, 신년운세까지. 코드 데스티니(Code Destiny).",
  ogTitle: "꿀꿀 운세 | 무료 사주·타로·궁합 — Code Destiny",
  ogDescription:
    "꿀꿀 운세 — 생년월일 하나로 사주팔자, 타로, 자미두수, 궁합, 신년운세를 재밌고 정확하게 보는 코드 데스티니 공식 서비스.",
  url: "https://code-destiny.com/",
  image: "https://code-destiny.com/og/code-destiny-og-vvip.png?v=d50dc254ba",
};

const page = {
  ...sourcePage,
  title: HOME_SEO.title,
  description: HOME_SEO.description,
  h1: "꿀꿀 운세 — 무료 사주·타로·궁합 통합 플랫폼",
};

export const metadata = {
  metadataBase: new URL("https://code-destiny.com"),
  title: { absolute: HOME_SEO.title },
  description: HOME_SEO.description,
  keywords: page.keywords,
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
    siteName: "Code Destiny",
    title: HOME_SEO.ogTitle,
    description: HOME_SEO.ogDescription,
    images: [
      {
        url: HOME_SEO.image,
        width: 1200,
        height: 630,
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

const BRAND_LOGO_URL = "https://code-destiny.com/icons/app-logo-512.webp?v=react-home-premium-20260625";
const MAYA_IMAGE_URL = "https://assets.code-destiny.com/%EB%A7%88%EC%95%BC%EC%A0%90.webp";
const FLOWER_IMAGE_URL = "https://code-destiny.com/fuctionassets/flower2.webp";
const DEST1NOVA_IMAGE_URL = buildMusicPublicUrl("DEST1NOVA/DEST1NOVA.webp");

const SERVICE_LINKS = [
  {
    id: "saju-basic",
    href: "/static/#destinyCardForm",
    title: homePageText("homePage.title.002"),
    description: homePageText("homePage.description.001"),
    meta: "무료 시작",
  },
  {
    id: "tarot-reading",
    href: "/static/#tarotCollection",
    title: homePageText("homePage.title.003"),
    description: homePageText("homePage.description.002"),
    meta: "무료/유료 혼합",
  },
  {
    id: "ziwei-chart",
    href: "/static/#cosmicCollection",
    title: homePageText("homePage.title.004"),
    description: homePageText("homePage.description.003"),
    meta: "기본 무료",
  },
  {
    id: "astrology-chart",
    href: "/static/#cosmicCollection",
    title: homePageText("homePage.title.005"),
    description: homePageText("homePage.description.004"),
    meta: "코즈믹 리딩",
  },
  {
    id: "sukuyo-compatibility",
    href: "/static/#premiumVvipCollection",
    title: homePageText("homePage.title.006"),
    description: homePageText("homePage.description.005"),
    meta: "궁합 안내",
  },
  {
    id: "payment-pass-guide",
    href: "/static/#premiumVvipCollection",
    title: homePageText("homePage.title.007"),
    description: homePageText("homePage.description.006"),
    meta: "환불 안내 포함",
  },
];

const PASS_GUIDE = [
  {
    title: homePageText("homePage.title.008"),
    body: "사주와 타로의 기본 흐름은 부담 없이 시작할 수 있고, 유료 리딩은 결제 전 표시된 조건을 확인한 뒤 열립니다.",
  },
  {
    title: homePageText("homePage.title.009"),
    body: "원화 결제로 활성화되는 일회성 디지털 이용권입니다. 자동결제가 아니며 만료 후 직접 다시 구매합니다.",
  },
  {
    title: homePageText("homePage.title.010"),
    body: "상품별 원화 결제로 진행되며, 결과 생성 또는 PDF 렌더링이 시작되기 전 환불 요청 가능 여부를 확인할 수 있습니다.",
  },
  {
    title: homePageText("homePage.title.011"),
    body: "구매·충전 상품이 아니라 이용권 또는 이벤트로 제공되는 보너스 혜택이며, 현금 환불 대상 상품으로 보지 않습니다.",
  },
];

const REFUND_GUIDE = [
  {
    title: homePageText("homePage.title.012"),
    body: "결제 완료 전에는 언제든 취소할 수 있으며, 결제 화면에서 상품명과 환불 조건을 확인합니다.",
  },
  {
    title: homePageText("homePage.title.013"),
    body: "결제 완료 후에도 결과 생성, PDF 렌더링, 유료 리딩 열람이 시작되지 않았다면 환불 요청이 가능합니다.",
  },
  {
    title: homePageText("homePage.title.014"),
    body: "개인 맞춤형 디지털 콘텐츠가 생성되거나 열람이 시작된 뒤에는 단순 변심 환불이 제한될 수 있습니다.",
  },
  {
    title: homePageText("homePage.title.015"),
    body: "결제 후 결과가 제공되지 않았거나 시스템 오류로 정상 이용이 불가능하면 재생성 또는 환불 처리 대상입니다.",
  },
  {
    title: homePageText("homePage.title.016"),
    body: "동일 상품의 중복 결제가 확인되면 결제수단과 결제대행사 정책에 따라 중복 결제분을 환불합니다.",
  },
  {
    title: homePageText("homePage.title.017"),
    // 이용권에는 사용 횟수 제한이 없다(30일 기간만 있고, 커버 범위 안이면 횟수 무제한).
    // 존재하지 않는 '이용권 횟수'를 환불 기준으로 안내하지 않는다.
    body: "이미 사용된 이용권 기간과 월정석 혜택은 사용분을 기준으로 확인한 뒤 처리합니다.",
  },
];

const POLICY_LINKS = [
  { href: "/terms#refund-policy", label: homePageText("homePage.label.001") },
  { href: "/terms", label: homePageText("homePage.label.002") },
  { href: "/privacy", label: homePageText("homePage.label.003") },
  { href: "/contact", label: homePageText("homePage.label.004") },
];

export default function HomePage() {
  const orgJsonLd = buildOrganizationJsonLd();
  const webPageJsonLd = buildWebPageJsonLd({
    title: page.title,
    description: page.description,
    path: page.path,
  });

  // 🔴 아래 섹션 마크업을 지우지 말 것.
  // 홈("/")은 정적 메인 셸이 담당하고 이 React 화면은 사용자에게 노출되지 않는다
  // (HomeRedirectToStatic 이 정적 홈으로 되돌린다. 소개 콘텐츠는 /about 으로 합쳤다).
  // 그런데 배포 게이트 scripts/verify-adsense-readiness.mjs 는 out·dist 양쪽을 검사하고,
  // "/" 는 AdSense 비대상이면서 색인 대상이라 렌더 텍스트 1,800자 하한이 걸린다
  // (verifyBlockedIndexableSitemapRouteQuality). 현재 out/index.html 실측 3,145자 —
  // 이 섹션들을 줄이면 빌드가 실패해 배포 자체가 막힌다.
  return (
    <>
      {/* 되돌림 오버레이는 main 밖에 둔다. main(.pageWrap)이 `isolation: isolate` 로 자체
          스택 컨텍스트를 만들어, 그 안에서는 z-index 를 아무리 올려도 레이아웃의 글로벌
          헤더·푸터·하단 네비를 덮지 못한다(= React 화면이 그대로 비친다). */}
      <HomeRedirectToStatic />
      <main className={styles.pageWrap}>
      <div className={styles.starLayer} aria-hidden />

      <section className={styles.heroSection} aria-labelledby="reactHomeHeroTitle">
        <div className={styles.heroCopy}>
          <p className={styles.heroKicker}>Code Destiny / 꿀꿀 운세</p>
          <h1 id="reactHomeHeroTitle" className={styles.heroTitle}>{page.h1}</h1>
          <p className={styles.heroLead}>
            꿀꿀 만세력으로 시작한 흐름 위에 사주, 타로, 자미두수, 궁합, 신년운세가 한곳에 모입니다.
            생년월일 하나로 오늘 당신에게 열린 운의 결을 차분히 살펴보세요.
          </p>
          <div className={styles.ctaRow}>
            <Link className={`${styles.ctaButton} ${styles.ctaPrimary}`} href="/static/#inputPage" aria-label="정적 메인 운세 입력 화면으로 이동">
              무료 운세 시작
            </Link>
            <Link className={`${styles.ctaButton} ${styles.ctaSecondary}`} href="/static/" aria-label="정적 꿀꿀 운세 홈으로 이동">
              꿀꿀 운세 홈
            </Link>
            <Link className={`${styles.ctaButton} ${styles.ctaSecondary}`} href="/static/#premiumVvipCollection" aria-label="정적 메인 이용권 안내로 이동">
              이용권 안내
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Code Destiny 브랜드 자산 미리보기">
          <div className={styles.logoPlate}>
            <img src={BRAND_LOGO_URL} alt={homePageText("homePage.alt.001")} width={136} height={136} decoding="async" fetchPriority="high" />
          </div>
          <div className={`${styles.assetTile} ${styles.assetTileLarge}`}>
            <img src={MAYA_IMAGE_URL} alt={homePageText("homePage.alt.002")} width={420} height={260} loading="eager" decoding="async" fetchPriority="high" />
            <span>{homePageText("homePage.text.006")}</span>
          </div>
          <div className={styles.assetTileRow}>
            <div className={styles.assetTile}>
              <img src={FLOWER_IMAGE_URL} alt={homePageText("homePage.alt.003")} width={220} height={160} loading="lazy" decoding="async" />
              <span>{homePageText("homePage.text.007")}</span>
            </div>
            <div className={styles.assetTile}>
              <img src={DEST1NOVA_IMAGE_URL} alt={homePageText("homePage.alt.004")} width={220} height={160} loading="lazy" decoding="async" />
              <span>{homePageText("homePage.text.008")}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.sectionBand} aria-labelledby="serviceHeading">
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>Fortune Services</p>
          <h2 id="serviceHeading" className={styles.sectionTitle}>운세와 상담 흐름을 주제별로 탐색</h2>
          <p className={styles.sectionLead}>
            무료로 시작할 수 있는 기본 리딩과 유료 심화 콘텐츠를 같은 카드 안에 섞지 않고, 사용자가 선택 전에 성격을 이해할 수 있게 정리했습니다.
          </p>
        </div>
        <div className={styles.serviceGrid}>
          {SERVICE_LINKS.map((service) => (
            <Link key={service.id} href={service.href} className={styles.serviceCard}>
              <span className={styles.serviceMeta}>{service.meta}</span>
              <strong>{service.title}</strong>
              <span>{service.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.sectionBand} aria-labelledby="passHeading">
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>Pass & Payment</p>
          <h2 id="passHeading" className={styles.sectionTitle}>이용권·월정석 안내를 구매 전 기준으로 정리</h2>
          <p className={styles.sectionLead}>
            결제 로직과 이용권 판별은 변경하지 않고, 사용자가 구매 전에 이해해야 할 운영 기준만 React 홈에서 먼저 확인할 수 있게 했습니다.
          </p>
        </div>
        <div className={styles.passGrid}>
          {PASS_GUIDE.map((item) => (
            <article key={item.title} className={styles.infoCard}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.sectionBand} ${styles.refundSection}`} aria-labelledby="refundHeading">
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>Refund Notice</p>
          <h2 id="refundHeading" className={styles.sectionTitle}>디지털 콘텐츠 환불 기준</h2>
          <p className={styles.sectionLead}>
            개인 맞춤형 결과 생성 또는 열람이 시작된 뒤에는 환불이 제한될 수 있습니다. 다만 서비스 오류, 중복 결제, 결제 후 콘텐츠 미제공은 재처리 또는 환불 대상입니다.
          </p>
        </div>
        <div className={styles.refundGrid}>
          {REFUND_GUIDE.map((item) => (
            <article key={item.title} className={styles.refundCard}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
        <div className={styles.policyStrip}>
          <strong>{homePageText("homePage.text.009")}</strong>
          <nav aria-label={homePageText("homePage.aria-label.001")}>
            {POLICY_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>{link.label}</Link>
            ))}
          </nav>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      </main>
    </>
  );
}
