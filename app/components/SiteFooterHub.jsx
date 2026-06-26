import styles from "./SiteFooterHub.module.css";

const SITE_FOOTER_HUB_TEXT_TRANSLATIONS = {
  ko: {
    "siteFooter.001": "핵심 운세",
    "siteFooter.002": "타로 리딩",
    "siteFooter.003": "신탁 & 특화",
    "siteFooter.004": "추천 가이드",
    "siteFooter.005": "상호명",
    "siteFooter.006": "대표자",
    "siteFooter.007": "사업자등록번호",
    "siteFooter.008": "통신판매업 신고번호",
    "siteFooter.009": "연락처",
    "siteFooter.010": "이메일",
    "siteFooter.011": "사업장 주소",
    "siteFooter.012": "랜딩 페이지 내부 링크 허브",
    "siteFooter.013": "코드 데스티니(Code Destiny)",
  },
};

function siteFooterHubText(key) {
  return SITE_FOOTER_HUB_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
const MAIN_ACTION_ROUTE_MAP = {
  "/saju": "/index.html",
  "/manse": "/index.html",
  "/daily-fortune": "/index.html",
  "/compatibility": "/index.html?action=runCompat",
  "/premium": "/index.html",
  "/saju/basic": "/index.html",
  "/ziwei/chart": "/index.html?action=openZiweiModal",
  "/astrology/cosmic": "/index.html?action=openAstroModal",
  "/saju/sibyl": "/index.html?action=openSibylModal",
  "/saju/lifebook": "/index.html?action=openLifeBookModal",
  "/saju/love-bible?premiumIntent=love-secret-pdf&mode=solo": "/index.html?action=openLoveSecretModal&premiumIntent=love-secret-pdf&mode=solo",
  "/tarot": "/index.html?action=openTarotModal",
  "/physiognomy": "/index.html?action=openPhysiognomyApp",
  "/tarot/mingri": "/index.html?action=openTarotModal",
  "/tarot/love": "/index.html?action=openTarotLoveModal",
  "/tarot/healing": "/index.html?action=openTarotHealingModal",
  "/tarot/self-esteem": "/index.html?action=openTarotSelfEsteemModal",
  "/tarot/reunion": "/index.html?action=openTarotReunionModal",
  "/tarot/year": "/index.html?action=openTarotYearFortuneModal",
  "/ziwei": "/index.html?action=openZiweiModal",
  "/astrology": "/index.html?action=openAstroModal",
  "/sukuyo": "/index.html?action=openSukuyoModal",
  "/vedic": "/index.html?action=navigateToVedic",
  "/dream": "/index.html?action=openDreamModal",
  "/oracle/hwatu-life": "/index.html?action=openHwatuModal",
  "/oracle/ifa": "/index.html?action=openIfaOracle",
  "/oracle/royal-tea": "/index.html?action=openRoyalTeaOracle",
  "/oracle/rune": "/index.html?action=openRuneOracle",
  "/oracle/sikojen-povailu": "/index.html?action=openSikojenPovailu",
};

function toMainActionHref(href, title) {
  if (title === "추천 가이드") return href;
  return MAIN_ACTION_ROUTE_MAP[href] || "/index.html";
}

const POLICY_LINKS = [
  { href: "/privacy", text: "개인정보처리방침 / Privacy" },
  { href: "/terms", text: "이용약관 / Terms" },
  { href: "/contact", text: "문의하기 / Contact" },
  { href: "/about", text: "서비스 소개 / About" },
  { href: "/disclaimer", text: "면책 고지 / Disclaimer" },
  { href: "/advertising-policy", text: "광고 운영정책 / Advertising Policy" },
  { href: "/terms#refund-policy", text: "교환/환불 정책" },
  { href: "/faq", text: "FAQ" },
  { href: "/methodology", text: "콘텐츠 방법론" },
  { href: "/insights", text: "인사이트 아카이브" },
];

const SEO_LINK_GROUPS = [
  {
    title: siteFooterHubText("siteFooter.001"),
    links: [
      { href: "/saju", text: "무료 사주풀이 보기" },
      { href: "/manse", text: "꿀꿀 만세력 확인하기" },
      { href: "/daily-fortune", text: "오늘의 운세 확인하기" },
      { href: "/compatibility", text: "사주 궁합 분석하기" },
      { href: "/premium", text: "프리미엄 운세 리포트" },
      { href: "/saju/basic", text: "사주 만세력 기본 해석" },
      { href: "/ziwei/chart", text: "자미두수 12궁 명반" },
      { href: "/astrology/cosmic", text: "점성술 코즈믹 차트" },
      { href: "/saju/sibyl", text: "시빌라 시스템" },
      { href: "/saju/lifebook", text: "인생의 책" },
      { href: "/saju/love-bible?premiumIntent=love-secret-pdf&mode=solo", text: "연애 비책" },
    ],
  },
  {
    title: siteFooterHubText("siteFooter.002"),
    links: [
      { href: "/tarot", text: "명리학 타로 시작하기" },
      { href: "/physiognomy", text: "동물관상 분석하기" },
      { href: "/tarot/mingri", text: "명리학 타로" },
      { href: "/tarot/love", text: "우리는 무슨 사이" },
      { href: "/tarot/healing", text: "따뜻한 태양 회복 타로" },
      { href: "/tarot/self-esteem", text: "자존감 레벨업 타로" },
      { href: "/tarot/reunion", text: "재회운 타로" },
      { href: "/tarot/prompt-maker", text: "타로 프롬프트 라이브러리" },
      { href: "/tarot/year", text: "십이지신 천운 타로" },
      { href: "/tarot/mindscan/", text: "속마음 알아보기" },
      { href: "/tarot/crystal-soul/", text: "원석 소울 타로" },
    ],
  },
  {
    title: siteFooterHubText("siteFooter.003"),
    links: [
      { href: "/ziwei", text: "자미두수 명반 보기" },
      { href: "/astrology", text: "점성술 출생차트 보기" },
      { href: "/sukuyo", text: "숙요점 27숙 분석" },
      { href: "/vedic", text: "베다점성술 운세 분석" },
      { href: "/dream", text: "꿈해몽 무료 해석" },
      { href: "/oracle/hwatu-life", text: "화투 인생 패 테스트" },
      { href: "/oracle/ifa", text: "IFA 오라클" },
      { href: "/oracle/royal-tea", text: "로열 티 오라클" },
      { href: "/oracle/rune", text: "스톤헨지 룬 오라클" },
      { href: "/oracle/sikojen-povailu", text: "핀란드 주석점" },
      { href: "/high-value", text: "하이밸류 아카이브" },
    ],
  },
  {
    title: siteFooterHubText("siteFooter.004"),
    links: [
      { href: "/insights", text: "운명 인사이트 허브" },
      { href: "/high-value", text: "하이밸류 아카이브" },
      { href: "/high-value/complete-guide-to-saju", text: "사주 완전 가이드" },
      { href: "/high-value/how-tarot-actually-works", text: "타로 리딩 구조 이해" },
      { href: "/high-value/understanding-your-destiny", text: "운명 해석 프레임" },
      { href: "/faq", text: "자주 묻는 질문" },
    ],
  },
];

const BUSINESS_INFO_ROWS = [
  { label: siteFooterHubText("siteFooter.005"), value: "코드 데스티니 (Code Destiny)" },
  { label: siteFooterHubText("siteFooter.006"), value: "박병하" },
  { label: siteFooterHubText("siteFooter.007"), value: "372-23-02329" },
  { label: siteFooterHubText("siteFooter.008"), value: "제 2026-화성호-0264 호" },
  { label: siteFooterHubText("siteFooter.009"), value: "050-6664-7398" },
  { label: siteFooterHubText("siteFooter.010"), value: "seongbae555@gmail.com" },
  { label: siteFooterHubText("siteFooter.011"), value: "경기도 화성시 효행구 비봉면 새비봉동로 37, 101동 1207호" },
];

const REFUND_POLICY_ROWS = [
  "30일 이용권과 상품별 원화 단건 결제는 결제일 또는 계약내용을 받은 날부터 7일 이내 청약철회를 요청할 수 있습니다.",
  "콘텐츠 생성, PDF 렌더링, 유료 리딩 열람, 이용권 혜택 사용처럼 제공이 시작된 부분은 환불이 제한될 수 있습니다.",
  "표시·광고 또는 계약내용과 다르게 이행된 경우 공급받은 날부터 3개월 이내, 그 사실을 안 날부터 30일 이내 청약철회를 요청할 수 있습니다.",
  "시스템 오류, 중복 결제, 결과 미제공 건은 재생성, 미제공 부분 환급 또는 전액 환급 중 적절한 방식으로 처리합니다.",
  "월정석은 구매·충전 상품이 아닌 보너스 혜택이므로 현금 환불 대상 결제 상품이 아닙니다.",
  "청약철회 또는 환급 대상임이 확인되면 관련 법령에 따라 3영업일 이내 결제 취소 또는 환급 절차를 진행합니다.",
  "실제 카드사·결제대행사 반영 시점은 결제수단별 정책에 따라 달라질 수 있습니다.",
];

export default function SiteFooterHub() {
  return (
    <footer className={styles.sfhRoot} aria-label="서비스 하단 정책 정보">
      <div className={`${styles.sfhNebula} ${styles.sfhNebulaLeft}`} aria-hidden />
      <div className={`${styles.sfhNebula} ${styles.sfhNebulaRight}`} aria-hidden />
      <div className={`${styles.sfhStars} ${styles.sfhStarsNear}`} aria-hidden />
      <div className={`${styles.sfhStars} ${styles.sfhStarsFar}`} aria-hidden />

      <div className={styles.sfhShell}>
        <section aria-label={siteFooterHubText("siteFooter.012")}>
          <p className={styles.sfhKicker}>Constellation Navigation</p>
          <p className={styles.sfhTitle}>서비스 링크 허브</p>
          <p className={styles.sfhSubtitle}>
            주요 운세와 랜딩 페이지를 성좌 지도로 재배열해 탐색 흐름과 검색 신호를 함께 강화했습니다.
          </p>

          <div className={styles.sfhGroupGrid}>
            {SEO_LINK_GROUPS.map((group) => (
              <section key={group.title} className={styles.sfhCard} aria-label={group.title}>
                <h2 className={styles.sfhGroupTitle}>{group.title}</h2>
                <nav className={styles.sfhLinkNav} aria-label={`${group.title} 링크`}>
                  {group.links.map((link) => (
                    <a key={link.href} href={toMainActionHref(link.href, group.title)} className={styles.sfhLink}>
                      {link.text}
                    </a>
                  ))}
                </nav>
              </section>
            ))}
          </div>

          <section aria-label="사업자 정보 및 환불 정책" className={styles.sfhBusinessCard}>
            <h2 className={styles.sfhBusinessTitle}>사업자 정보 및 환불 정책</h2>

            <ul className={styles.sfhBusinessList}>
              {BUSINESS_INFO_ROWS.map((row) => (
                <li key={row.label} className={styles.sfhBusinessItem}>
                  <strong>{row.label}:</strong> {row.value}
                </li>
              ))}
            </ul>

            <div className={styles.sfhBusinessDivider}>
              <p className={styles.sfhBusinessEmphasis}>
                모든 거래에 대한 책임과 환불, 민원 등은 <strong>{siteFooterHubText("siteFooter.013")}</strong>에서 진행합니다.
              </p>
              <p className={styles.sfhBusinessMuted}>민원담당자 : 박병하 (seongbae555@gmail.com)</p>
            </div>

            <div className={styles.sfhBusinessDivider}>
              <p className={styles.sfhRefundTitle}>디지털 운세 서비스 환불 안내</p>
              <p className={styles.sfhBusinessEmphasis}>
                유료 결제 상품은 30일 이용권과 상품별 원화 단건 결제이며, 월정석은 별도 구매·충전 상품이 아닙니다.
              </p>
              <ul className={styles.sfhRefundList}>
                {REFUND_POLICY_ROWS.map((rule) => (
                  <li key={rule} className={styles.sfhBusinessMuted}>
                    {rule}
                  </li>
                ))}
              </ul>
              <p className={styles.sfhRefundNotice}>
                본 안내는 이용약관 및 결제대행사 정책과 함께 적용되며, 강행규정과 충돌하는 경우 관계 법령을 우선합니다. 환불 접수: 문의하기 또는 고객지원 이메일.
              </p>
              <p className={styles.sfhRefundNoticeStrong}>환불 처리는 결제 수단(카드)으로만 가능합니다.</p>
            </div>
          </section>
        </section>

        <nav aria-label="정책 및 안내 링크" className={styles.sfhPolicyNav}>
          {POLICY_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={styles.sfhPolicyLink}>
              {link.text}
            </a>
          ))}
        </nav>

        <p className={styles.sfhCopyright}>
          © 2026 Code Destiny. 코드 데스티니 · 꿀꿀 만세력
        </p>
      </div>
    </footer>
  );
}
