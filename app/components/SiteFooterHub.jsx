import styles from "./SiteFooterHub.module.css";

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
    title: "핵심 운세",
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
    title: "타로 리딩",
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
    title: "신탁 & 특화",
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
    title: "추천 가이드",
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
  { label: "상호명", value: "코드 데스티니 (Code Destiny)" },
  { label: "대표자", value: "박병하" },
  { label: "사업자등록번호", value: "372-23-02329" },
  { label: "통신판매업 신고번호", value: "제 2026-화성호-0264 호" },
  { label: "연락처", value: "050-6664-7398" },
  { label: "이메일", value: "seongbae555@gmail.com" },
  { label: "사업장 주소", value: "경기도 화성시 효행구 비봉면 새비봉동로 37, 101동 1207호" },
];

const REFUND_POLICY_ROWS = [
  "결제일로부터 7일 이내이고 결과 열람, 리딩 실행, PDF 또는 AI 해석 생성이 시작되지 않은 주문은 청약철회를 접수할 수 있습니다.",
    "콘텐츠 가격은 원화 기준으로 표시되며 선불형 잔액 적립은 제공하지 않습니다.",
  "디지털 콘텐츠 제공이 시작된 이후에는 해당 제공분의 환불이 제한될 수 있으며, 미제공분이 있으면 합리적 기준에 따라 잔여분을 산정합니다.",
  "시스템 오류, 중복 결제, 결과 미제공처럼 서비스 제공이 정상 완료되지 않은 주문은 재생성 또는 환불로 처리합니다.",
  "프로모션, 이벤트, 무상 제공 이용권은 현금 환불 대상에 포함되지 않습니다.",
  "환불 금액과 시점은 관계 법령, 결제대행사 정책, 카드사 또는 플랫폼 정산 주기에 따릅니다.",
  "환불 접수는 결제자 본인 확인이 완료된 요청만 처리하며, 완료까지 통상 영업일 3~10일이 소요됩니다.",
];

export default function SiteFooterHub() {
  return (
    <footer className={styles.sfhRoot} aria-label="서비스 하단 정책 정보">
      <div className={`${styles.sfhNebula} ${styles.sfhNebulaLeft}`} aria-hidden />
      <div className={`${styles.sfhNebula} ${styles.sfhNebulaRight}`} aria-hidden />
      <div className={`${styles.sfhStars} ${styles.sfhStarsNear}`} aria-hidden />
      <div className={`${styles.sfhStars} ${styles.sfhStarsFar}`} aria-hidden />

      <div className={styles.sfhShell}>
        <section aria-label="랜딩 페이지 내부 링크 허브">
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
                모든 거래에 대한 책임과 환불, 민원 등은 <strong>코드 데스티니(Code Destiny)</strong>에서 진행합니다.
              </p>
              <p className={styles.sfhBusinessMuted}>민원담당자 : 박병하 (seongbae555@gmail.com)</p>
            </div>

            <div className={styles.sfhBusinessDivider}>
              <p className={styles.sfhRefundTitle}>디지털 운세 서비스 환불 안내</p>
              <p className={styles.sfhBusinessEmphasis}>
                유료 리딩과 PDF는 상품별 원화 단건 결제로 제공되며, 전자상거래 관련 법령 및 약관에 따라 미사용 주문과 미제공 주문을 기준으로 환불을 안내합니다.
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
