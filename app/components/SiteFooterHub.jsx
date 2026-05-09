import styles from "./SiteFooterHub.module.css";

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
      { href: "/saju/love-secret", text: "연애 비책" },
    ],
  },
  {
    title: "타로 컬렉션",
    links: [
      { href: "/tarot", text: "AI 타로 리딩 시작하기" },
      { href: "/physiognomy", text: "동물관상 분석하기" },
      { href: "/tarot/mingri", text: "명리학 AI 타로" },
      { href: "/tarot/love", text: "우리는 무슨 사이" },
      { href: "/tarot/healing", text: "따뜻한 태양 회복 타로" },
      { href: "/tarot/self-esteem", text: "자존감 레벨업 타로" },
      { href: "/tarot/reunion", text: "재회운 타로" },
      { href: "/tarot/year", text: "십이지신 천운 타로" },
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
                    <a key={link.href} href={link.href} className={styles.sfhLink}>
                      {link.text}
                    </a>
                  ))}
                </nav>
              </section>
            ))}
          </div>
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
