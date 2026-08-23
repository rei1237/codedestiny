import styles from "./SiteFooterHub.module.css";
import SocialFooter from "../_components/SocialFooter";
import { BUSINESS_IDENTITY } from "../../lib/site-policy-config";

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

// SocialFooter 의 한국어 카피. 🔴 lib/i18n/siteFooterHubCopy 에서 가져오지 말 것 — 이 파일은
// AppChrome("use client") 이 import 해 **클라이언트 번들에 들어간다.** 5개 로케일 표를 끌어오면
// layout 청크가 41KB → 63KB 로 커진다(2026-08-16 실측). 로케일 카피는 서버 전용
// LocaleFooterHub 가 넘기고, 여기에는 ko 문자열만 둔다.
const KO_SOCIAL_COPY = {
  sectionAriaLabel: "Code Destiny 공식 SNS 채널",
  kicker: "Official Channels",
  title: "Code Destiny 공식 채널",
  navAriaLabel: "Code Destiny SNS 바로가기",
  linkAriaTemplate: "Code Destiny 공식 {channel} 새 창으로 열기",
  labels: { youtube: "유튜브", threads: "쓰레드", instagram: "인스타그램", naverBlog: "블로그", x: "X" },
};
const POLICY_LINKS = [
  { href: "/privacy/", text: "개인정보처리방침 / Privacy" },
  { href: "/terms/", text: "이용약관 / Terms" },
  { href: "/contact/", text: "문의하기 / Contact" },
  { href: "/about/", text: "서비스 소개 / About" },
  { href: "/disclaimer/", text: "면책 고지 / Disclaimer" },
  { href: "/advertising-policy/", text: "광고 운영정책 / Advertising Policy" },
  { href: "/terms/#refund-policy", text: "교환/환불 정책" },
  { href: "/faq/", text: "FAQ" },
  { href: "/methodology/", text: "콘텐츠 방법론" },
  { href: "/insights/", text: "인사이트 아카이브" },
];

const SEO_LINK_GROUPS = [
  {
    title: siteFooterHubText("siteFooter.001"),
    links: [
      { href: "/kkul-kkul-unse/", text: "꿀꿀 운세 — 코드 데스티니 브랜드 안내" },
      { href: "/saju/", text: "무료 사주풀이 보기" },
      { href: "/manse/", text: "꿀꿀 만세력 확인하기" },
      { href: "/today/", text: "오늘의 운세 확인하기" },
      // 🔴 /fortune/{today,tomorrow,weekly,monthly} 101개는 사이트맵에만 있고 **유입 내부 링크가
      // 0이었다**(2026-08-16 실측: 홈·/today·푸터 전수 grep). 매일 재생성되는 클러스터가
      // 링크 그래프에서 고아면 크롤 우선순위가 서지 않으므로, 위 "신탁 & 특화" 블록이
      // 노index 허브를 정본 허브로 바꾼 것과 같은 이유로 기간 허브 4개를 여기에 건다.
      { href: "/fortune/today/", text: "오늘의 별자리·띠 운세 24종" },
      { href: "/fortune/tomorrow/", text: "내일의 별자리·띠 운세" },
      { href: "/fortune/weekly/", text: "이번 주 별자리·띠 운세" },
      { href: "/fortune/monthly/", text: "이번 달 별자리·띠 운세" },
      { href: "/compatibility/", text: "사주 궁합 분석하기" },
      { href: "/premium/", text: "프리미엄 운세 리포트" },
      { href: "/saju/basic/", text: "사주 만세력 기본 해석" },
      { href: "/ziwei/chart/", text: "자미두수 12궁 명반" },
      { href: "/astrology/cosmic/", text: "점성술 코즈믹 차트" },
      { href: "/saju/sibyl/", text: "시빌라 시스템" },
      { href: "/life-book-ai/", text: "인생의 책" },
      { href: "/love-secret-ai/", text: "연애 비책 AI 상담" },
      // 🔴 아래 링크들은 사이트맵에 있는데 홈에서 링크를 따라가 도달할 수 없었다
      //    (2026-08-24 out/ 내부 링크 그래프 실측: 한국어 라우트 11개가 도달 불가).
      //    고아 라우트는 크롤 우선순위가 서지 않는다 — 위 기간 허브 4개를 건 것과 같은 이유다.
      { href: "/fortune/", text: "별자리·띠 운세 허브" },
      { href: "/destiny-compass/", text: "운명의 나침반" },
      { href: "/saju/destiny-meeting-place/", text: "사주로 보는 인연의 장소" },
    ],
  },
  {
    title: siteFooterHubText("siteFooter.002"),
    links: [
      { href: "/tarot/", text: "명리학 타로 시작하기" },
      { href: "/physiognomy/", text: "동물관상 분석하기" },
      { href: "/tarot/mingri/", text: "명리학 타로" },
      { href: "/tarot/love/", text: "우리는 무슨 사이" },
      { href: "/tarot/healing/", text: "따뜻한 태양 회복 타로" },
      { href: "/tarot/self-esteem/", text: "자존감 레벨업 타로" },
      { href: "/tarot/reunion/", text: "재회운 타로" },
      { href: "/tarot/prompt-maker/", text: "타로 프롬프트 라이브러리" },
      { href: "/tarot/year/", text: "십이지신 천운 타로" },
      { href: "/tarot/mindscan/", text: "속마음 알아보기" },
      { href: "/tarot/crystal-soul/", text: "원석 소울 타로" },
      { href: "/animal/mbti/", text: "MBTI 동물 궁합 테스트" },
    ],
  },
  {
    title: siteFooterHubText("siteFooter.003"),
    links: [
      // 색인 가능한 정본 허브로 보낸다. 예전에는 /ziwei/chart·/oracle/sukuyo 처럼
      // noindex,nofollow 인 인터랙티브 라우트만 가리켜서, 전 페이지 푸터의 링크 자산이
      // 색인되지 않는 화면에서 끊겼고 정작 허브는 유입 링크가 0이었다.
      // 각 허브 페이지가 자체 CTA 로 인터랙티브 화면까지 이어 준다.
      { href: "/ziwei/", text: "무료 자미두수 12궁 명반 보기" },
      { href: "/astrology/", text: "무료 점성술 운세 출생차트 보기" },
      { href: "/sukuyo/", text: "무료 숙요점 27수 궁합 보기" },
      { href: "/vedic/", text: "무료 베다 점성술(베다점) 운세" },
      { href: "/nakshatra/", text: "숙요점 × 베다 점성술 통합 별자리" },
      { href: "/dream/", text: "꿈해몽 무료 해석" },
      { href: "/oracle/hwatu-life/", text: "화투 인생 패 테스트" },
      { href: "/ifa-oracle.html", text: "IFA 오라클" },
      { href: "/oracle/royal-tea/", text: "로열 티 오라클" },
      { href: "/oracle/rune/", text: "스톤헨지 룬 오라클" },
      { href: "/oracle/sikojen-povailu/", text: "핀란드 주석점" },
      { href: "/high-value/", text: "하이밸류 아카이브" },
      // 아래 4개는 2026-08-16 실측에서 사이트맵에 있으면서 내부 링크가 0이던 고아 라우트다.
      // 새 링크는 처음부터 후행 슬래시를 단다(trailingSlash:true 이므로 슬래시가 없으면 308 을 한 번 탄다).
      { href: "/flower/destiny/", text: "운명의 꽃 아틀리에" },
      { href: "/flower/astrology/", text: "점성술 운명의 꽃" },
      { href: "/flower/jamidusu/", text: "자미두수 운명의 꽃" },
      { href: "/flower/sukuyo/", text: "숙요 운명의 꽃" },
      { href: "/fortune-tea-house/", text: "운명 찻집 상담" },
      { href: "/karma-destiny-ai/", text: "운명의 업 전문가 상담" },
      { href: "/new-year-ai-consultation/", text: "신년운세 전문가 상담" },
      { href: "/yeon-star-hug/", text: "연이 별빛 포옹" },
    ],
  },
  {
    title: siteFooterHubText("siteFooter.004"),
    links: [
      { href: "/insights/", text: "운명 인사이트 허브" },
      { href: "/high-value/", text: "하이밸류 아카이브" },
      { href: "/high-value/complete-guide-to-saju/", text: "사주 완전 가이드" },
      { href: "/high-value/how-tarot-actually-works/", text: "타로 리딩 구조 이해" },
      { href: "/high-value/understanding-your-destiny/", text: "운명 해석 프레임" },
      { href: "/insights/fusion/", text: "초융합 운세 인사이트 허브" },
      { href: "/reviews/", text: "실시간 사용자 후기" },
      { href: "/faq/", text: "자주 묻는 질문" },
      { href: "/insights/sukuyo-basics/", text: "숙요점 기초 가이드" },
      { href: "/insights/ziwei-basics/", text: "자미두수 기초 가이드" },
      { href: "/fortune/prompt-hub/", text: "운세 프롬프트 허브" },
    ],
  },
];

// 값은 lib/site-policy-config.js 의 BUSINESS_IDENTITY 가 정본이다 — /contact 본문이 같은
// 값을 쓰므로 여기 다시 적으면 두 화면이 갈린다. 라벨(key)만 이 파일이 정한다.
const BUSINESS_INFO_ROWS = [
  { key: "siteFooter.005", value: BUSINESS_IDENTITY.companyName },
  { key: "siteFooter.006", value: BUSINESS_IDENTITY.representative },
  { key: "siteFooter.007", value: BUSINESS_IDENTITY.registrationNumber },
  { key: "siteFooter.008", value: BUSINESS_IDENTITY.mailOrderNumber },
  { key: "siteFooter.009", value: BUSINESS_IDENTITY.phone },
  { key: "siteFooter.010", value: BUSINESS_IDENTITY.email },
  { key: "siteFooter.011", value: BUSINESS_IDENTITY.address },
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
                    <a key={link.href} href={link.href} className={styles.sfhLink}>
                      {link.text}
                    </a>
                  ))}
                </nav>
              </section>
            ))}
          </div>

          <section aria-label="환불 정책 안내">
            <h2 style={{ fontSize: '1.25rem', marginTop: '2rem', marginBottom: '1rem', fontWeight: 600 }}>디지털 운세 서비스 환불 안내</h2>
            <p style={{ marginBottom: '1.5rem', lineHeight: 1.6 }}>
              유료 결제 상품은 30일 이용권과 상품별 원화 단건 결제이며, 월정석은 별도 구매·충전 상품이 아닙니다.
            </p>
            {/* 🔴 환불정책 전문을 여기에 렌더하지 않는다.
                푸터는 모든 페이지에 붙으므로, 전문을 담으면 색인 페이지가 같은 본문을 공유한다.
                2026-08-24 out/ 실측: 사이트맵 371개 중 279개(75%)가 같은 1,013자를 본문으로 갖고 있었고,
                이는 near-duplicate 신호이자 AdSense "가치 없는 콘텐츠" 판정의 재료가 된다.
                전문의 정본은 /refund-policy 이며 8개 조항 전부를 담고 있다(같은 날 out/ 대조 확인).
                🔴 되살리지 말 것 — 되살리면 279개 페이지의 고유 본문 비율이 다시 무너진다. */}
            <p style={{ marginBottom: '1.5rem', lineHeight: 1.6 }}>
              청약철회 기간, 환급 절차, 월정석 유효기간을 포함한 조항 전문은{' '}
              <a href="/refund-policy/" className={styles.sfhLink}>환불 정책 전문</a>
              에서 확인하실 수 있습니다.
            </p>
            <p style={{ fontSize: '0.95rem', color: '#666', lineHeight: 1.6, marginBottom: '0.5rem' }}>
              본 안내는 이용약관 및 결제대행사 정책과 함께 적용되며, 강행규정과 충돌하는 경우 관계 법령을 우선합니다. 환불 접수는 문의하기 또는 고객지원 이메일을 통해 진행하시기 바랍니다.
            </p>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>
              환불 처리는 결제 수단(카드)으로만 가능합니다.
            </p>
          </section>
        </section>

        <SocialFooter copy={KO_SOCIAL_COPY} />

        <section aria-label="사업자 정보" style={{ marginTop: '1.5rem', fontSize: '0.8rem', lineHeight: 1.7, opacity: 0.85 }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>사업자 정보</h2>
          <p style={{ margin: 0 }}>
            {BUSINESS_INFO_ROWS.map((row, index) => (
              <span key={row.key}>
                {index > 0 ? " | " : null}
                <strong>{siteFooterHubText(row.key)}</strong>:{" "}
                {/* 법인 상호·대표자명·신고번호·사업장 주소는 **등록된 그대로가 법적 형식**이라
                    번역하지 않는다. data-cd-no-trans 로 런타임 번역 대상에서 명시적으로 제외한다. */}
                <span data-cd-no-trans>{row.value}</span>
              </span>
            ))}
          </p>
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
