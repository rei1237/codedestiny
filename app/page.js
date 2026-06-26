import Link from "next/link";
import { buildSeoMetadata } from "../lib/seo";
import { publicSeoPages } from "../lib/seo/siteSeo";
import {
  buildOrganizationJsonLd,
  buildWebPageJsonLd,
  buildWebsiteJsonLd,
} from "../lib/structured-data";
import { buildMusicPublicUrl } from "../lib/r2-public-url";
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
    "homePage.text.001": "폰트",
    "homePage.text.002": "R2 브랜드 폰트와 한글 fallback",
    "homePage.text.003": "결제",
    "homePage.text.004": "구매 전 환불 기준 노출",
    "homePage.text.005": "달빛·꽃·별의 프리미엄 감성",
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
const page = {
  ...sourcePage,
  title: homePageText("homePage.title.001"),
  description:
    "Code Destiny React 홈은 사주, 타로, 자미두수, 점성술, 숙요점, 이용권, 결제 전 환불 안내를 한 화면에서 신뢰감 있게 확인할 수 있는 프리미엄 운세 서비스 안내 페이지입니다.",
  h1: "운명을 읽는 달빛 코드",
};

export const metadata = buildSeoMetadata({
  path: page.path,
  title: page.title,
  description: page.description,
  keywords: page.keywords,
});

const BRAND_LOGO_URL = "https://assets.code-destiny.com/%EA%BF%80%EA%BF%80%20%EC%9A%B4%EC%84%B8%20%EB%A1%9C%EA%B3%A0.webp?v=react-home-premium-20260625";
const MAYA_IMAGE_URL = "https://assets.code-destiny.com/%EB%A7%88%EC%95%BC%EC%A0%90.webp";
const FLOWER_IMAGE_URL = "https://code-destiny.com/fuctionassets/flower2.webp";
const DEST1NOVA_IMAGE_URL = buildMusicPublicUrl("DEST1NOVA/DEST1NOVA.webp");

const SERVICE_LINKS = [
  {
    href: "/manse",
    title: homePageText("homePage.title.002"),
    description: homePageText("homePage.description.001"),
    meta: "무료 시작",
  },
  {
    href: "/tarot",
    title: homePageText("homePage.title.003"),
    description: homePageText("homePage.description.002"),
    meta: "무료/유료 혼합",
  },
  {
    href: "/ziwei",
    title: homePageText("homePage.title.004"),
    description: homePageText("homePage.description.003"),
    meta: "기본 무료",
  },
  {
    href: "/astrology",
    title: homePageText("homePage.title.005"),
    description: homePageText("homePage.description.004"),
    meta: "코즈믹 리딩",
  },
  {
    href: "/sukuyo",
    title: homePageText("homePage.title.006"),
    description: homePageText("homePage.description.005"),
    meta: "궁합 안내",
  },
  {
    href: "/points",
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
    body: "이미 사용된 이용권 횟수, 기간, 월정석 혜택은 사용분을 기준으로 확인한 뒤 처리합니다.",
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
  const websiteJsonLd = buildWebsiteJsonLd();
  const webPageJsonLd = buildWebPageJsonLd({
    title: page.title,
    description: page.description,
    path: page.path,
  });

  return (
    <main className={styles.pageWrap}>
      <div className={styles.starLayer} aria-hidden />

      <section className={styles.heroSection} aria-labelledby="reactHomeHeroTitle">
        <div className={styles.heroCopy}>
          <p className={styles.heroKicker}>Code Destiny / 꿀꿀 운세</p>
          <h1 id="reactHomeHeroTitle" className={styles.heroTitle}>{page.h1}</h1>
          <p className={styles.heroLead}>
            정적 메인 화면의 달빛 감성은 유지하면서, React 홈에서는 서비스 구조와 결제 전 확인 정보를 더 명확하게 정리했습니다.
            사주, 타로, 별자리, 신탁 리딩을 탐색하고 이용권·환불 기준까지 한눈에 확인하세요.
          </p>
          <div className={styles.ctaRow}>
            <Link className={`${styles.ctaButton} ${styles.ctaPrimary}`} href="/#inputPage" aria-label="정적 메인 운세 입력 화면으로 이동">
              무료 운세 시작
            </Link>
            <Link className={`${styles.ctaButton} ${styles.ctaSecondary}`} href="/points" aria-label="이용권과 결제 안내 확인">
              이용권 안내
            </Link>
            <Link className={styles.textLink} href="/terms#refund-policy" aria-label="환불정책 상세 보기">
              환불정책 보기
            </Link>
          </div>
          <dl className={styles.heroFacts} aria-label="React 홈 핵심 개선 정보">
            <div>
              <dt>{homePageText("homePage.text.001")}</dt>
              <dd>{homePageText("homePage.text.002")}</dd>
            </div>
            <div>
              <dt>{homePageText("homePage.text.003")}</dt>
              <dd>{homePageText("homePage.text.004")}</dd>
            </div>
            <div>
              <dt>톤</dt>
              <dd>{homePageText("homePage.text.005")}</dd>
            </div>
          </dl>
        </div>

        <div className={styles.heroVisual} aria-label="Code Destiny 브랜드 자산 미리보기">
          <div className={styles.logoPlate}>
            <img src={BRAND_LOGO_URL} alt={homePageText("homePage.alt.001")} width={136} height={136} decoding="async" fetchPriority="high" />
          </div>
          <div className={`${styles.assetTile} ${styles.assetTileLarge}`}>
            <img src={MAYA_IMAGE_URL} alt={homePageText("homePage.alt.002")} width={420} height={260} loading="eager" decoding="async" />
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
            <Link key={service.href} href={service.href} className={styles.serviceCard}>
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
          <h2 id="passHeading" className={styles.sectionTitle}>이용권·코인·월정석 안내를 구매 전 기준으로 정리</h2>
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    </main>
  );
}
