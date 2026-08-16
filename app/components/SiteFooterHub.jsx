import styles from "./SiteFooterHub.module.css";
import SocialFooter from "../_components/SocialFooter";

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
    ],
  },
];

const BUSINESS_INFO_ROWS = [
  { key: "siteFooter.005", value: "코드 데스티니 (Code Destiny)" },
  { key: "siteFooter.006", value: "박병하" },
  { key: "siteFooter.007", value: "372-23-02329" },
  { key: "siteFooter.008", value: "제 2026-화성호-0264 호" },
  { key: "siteFooter.009", value: "050-6664-7398" },
  { key: "siteFooter.010", value: "admin@code-destiny.com" },
  { key: "siteFooter.011", value: "경기도 화성시 효행구 비봉면 새비봉동로 37, 101동 1207호" },
];

const REFUND_POLICY_ROWS = [
  "30일 이용권과 상품별 원화 단건 결제는 결제일 또는 계약내용을 받은 날부터 7일 이내 청약철회를 요청할 수 있습니다. 청약철회 신청 시 구매 당시 사용한 결제 수단으로만 환금 처리되며, 신용카드 결제의 경우 카드사 정책에 따라 환급 기간이 상이할 수 있습니다.",
  "콘텐츠 생성, PDF 렌더링, 유료 리딩 열람, 이용권 혜택 사용처럼 제공이 시작된 부분은 환불이 제한될 수 있습니다. 다만 실제 콘텐츠 품질 문제나 서비스 미제공으로 인한 정당한 클레임의 경우 별도로 검토하여 환급을 진행할 수 있습니다.",
  "표시·광고 또는 계약내용과 다르게 이행된 경우 공급받은 날부터 3개월 이내, 그 사실을 안 날부터 30일 이내 청약철회를 요청할 수 있습니다. 이 경우 서비스 제공자의 귀책사유로 인한 것이므로 특별한 제한이 없이 환급 대상이 됩니다.",
  "시스템 오류, 중복 결제, 결과 미제공 건은 재생성, 미제공 부분 환급 또는 전액 환급 중 적절한 방식으로 처리합니다. 이러한 경우 고객 입장에서 피해를 입지 않도록 최선의 조치를 취하며, 문의하기를 통해 언제든 요청할 수 있습니다.",
  "월정석은 구매·충전 상품이 아닌 보너스 혜택이므로 현금 환불 대상 결제 상품이 아닙니다. 다만 월정석을 지급한 원인이 되는 상품(예: 30일 이용권)이 환급 대상인 경우, 해당 상품에 대해서만 환급 처리됩니다.",
  "월정석은 각 지급분이 지급된 날로부터 30일간만 유효하며, 그 기간 내에 사용하지 않은 지급분은 자동으로 소멸합니다. 여러 번 나눠 지급받은 경우 각 지급분이 자기 지급일 기준으로 개별 만료하고, 사용 시에는 먼저 만료되는 지급분부터 차감됩니다. 소멸된 월정석은 복구되지 않습니다.",
  "청약철회 또는 환급 대상임이 확인되면 관련 법령에 따라 3영업일 이내 결제 취소 또는 환급 절차를 진행합니다. 토요일, 일요일, 공휴일은 영업일에 포함되지 않으며, 은행 휴무일도 반영됩니다.",
  "실제 카드사·결제대행사 반영 시점은 결제수단별 정책에 따라 달라질 수 있습니다. 신용카드 환금은 통상 3~5일, 계좌이체는 1~2일, 휴대폰 결제는 2~3일 소요됩니다.",
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
            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
              {REFUND_POLICY_ROWS.map((rule) => (
                <li key={rule} style={{ marginBottom: '0.75rem', lineHeight: 1.6 }}>
                  {rule}
                </li>
              ))}
            </ul>
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
