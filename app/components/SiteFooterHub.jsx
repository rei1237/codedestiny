import Image from "next/image";
import styles from "./SiteFooterHub.module.css";
import { BUSINESS_IDENTITY } from "../../lib/site-policy-config";
import { IS_APP_BUILD } from "../../lib/app-build-target";
import { FOOTER_BYLINE, FOOTER_LINKS, FOOTER_NOTICE, FOOTER_TRUST_LINKS } from "../../lib/brand/site-footer";

// 2026-10-16 "직관성": 모든 푸터가 같은 최소 규격이다(lib/brand/site-footer.ts) —
// 전문성 한 줄 → 정책 링크 → 안내 한 줄 → 사업자 정보. 환불·면책 요약 문단, SNS, 펼쳐 둔 길잡이 카드는 걷어냈다.
// 환불·면책 전문은 /refund-policy/·/disclaimer/ 에 있다(전문을 푸터에 싣지 않는 이유는 아래 SEO_LINK_GROUPS 위 주석과 같다).
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
  },
};

function siteFooterHubText(key) {
  return SITE_FOOTER_HUB_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

// 🔴 이 링크 묶음은 "전체 서비스 보기" 한 줄 안에 접어 둘 뿐 지우지 않는다. 사이트맵 라우트 상당수가 유입 내부
// 링크를 이 푸터에서만 받는다(아래 그룹 주석의 실측). 접힌 <details> 안의 링크도 DOM 에 있어 크롤 신호는 같다.
// 🔴 환불정책·면책 고지 전문도 다시 싣지 않는다 — 푸터는 모든 페이지에 붙으므로 전문을 담으면 색인 페이지가
// 같은 본문을 공유한다(2026-08-24 out/ 실측: 사이트맵 371개 중 279개가 같은 1,013자를 본문으로 가졌다).
export const SEO_LINK_GROUPS = [
  {
    title: siteFooterHubText("siteFooter.001"),
    links: [
      { href: "/", text: "꿀꿀 운세 브랜드 안내" },
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
      { href: "/consultations/", text: "프리미엄 운세 리포트" },
      { href: "/ziwei/chart/", text: "자미두수 12궁 명반" },
      { href: "/saju/sibyl/", text: "시빌라 시스템" },
      { href: "/life-book-ai/", text: "인생의 책" },
      { href: "/love-secret-ai/", text: "연애 비책 AI 상담" },
      // 🔴 아래 링크들은 사이트맵에 있는데 홈에서 링크를 따라가 도달할 수 없었다
      //    (2026-08-24 out/ 내부 링크 그래프 실측: 한국어 라우트 11개가 도달 불가).
      //    고아 라우트는 크롤 우선순위가 서지 않는다 — 위 기간 허브 4개를 건 것과 같은 이유다.
      { href: "/fortune/", text: "별자리·띠 운세 허브" },
      { href: "/destiny-compass/", text: "운명의 나침반" },
      { href: "/saju/destiny-meeting-place/", text: "사주로 보는 인연의 장소" },
      // 2026-08-24 에 색인으로 되돌렸는데(#1092) 링크를 안 걸어 고아로 남아 있었다.
      { href: "/saju-guardian/", text: "사주 가디언 수호 인장" },
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
      // 색인 가능한 정본 허브로 보낸다. 예전에는 일부 인터랙티브 라우트처럼
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
      // /ifa-oracle.html 이 아니라 랜딩을 가리킨다 — 정본이 2026-08-24 에 /oracle/ifa 로
      // 옮겨졌고, 옛 URL 은 308 을 타고 noindex 인 도구 화면으로 간다.
      { href: "/oracle/ifa/", text: "IFA 오라클" },
      { href: "/oracle/royal-tea/", text: "로열 티 오라클" },
      { href: "/oracle/rune/", text: "스톤헨지 룬 오라클" },
      { href: "/oracle/sikojen-povailu/", text: "핀란드 주석점" },
      { href: "/guides/", text: "하이밸류 아카이브" },
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
      { href: "/guides/", text: "하이밸류 아카이브" },
      { href: "/guides/complete-guide-to-saju/", text: "사주 완전 가이드" },
      { href: "/guides/how-tarot-actually-works/", text: "타로 리딩 구조 이해" },
      { href: "/guides/understanding-your-destiny/", text: "운명 해석 프레임" },
      { href: "/insights/fusion/", text: "초융합 운세 인사이트 허브" },
      // 2026-08-30 GSC 실측: /stories/ 는 푸터·홈 어디에도 링크가 없어 홈에서 4홉이었고,
      // 45개 URL 이 전부 노출 0 이었다. 유일한 유입 링크가 /insights 토픽 아카이브 4곳뿐이었다.
      { href: "/stories/", text: "연이의 운명 노벨 — 사주 판타지 웹소설" },
      { href: "/world/", text: "캐릭터와 세계관 — 연이·네오와 섬 사람들" },
      { href: "/reviews/", text: "실시간 사용자 후기" },
      { href: "/faq/", text: "자주 묻는 질문" },
      // 2026-10-16: 정책 줄을 다섯 개로 줄이면서 옮겼다. 다른 유입 링크가 없다.
      { href: "/methodology/", text: "콘텐츠 방법론" },
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
    <footer className={styles.sfhRoot} aria-label="사이트 정보">
      <div className={styles.sfhShell}>
        <p className={styles.sfhByline}>
          <a href="/about/#author">
            <Image src="/icons/moonlight-garden-v1-512.webp" alt="" width={512} height={512} sizes="28px" />
            <span><strong>꿀꿀 운세</strong> — <span data-cd-trans="footer.byline">{FOOTER_BYLINE}</span></span>
          </a>
        </p>

        {/* 🔴 정책 링크·안내·사업자 정보는 **앱에서도 남긴다** — Play 정책과 전자상거래법상 앱 안에 접근 경로가 있어야 한다. */}
        <nav aria-label="회사 및 정책 링크" className={styles.sfhPolicyNav}>
          {FOOTER_LINKS.map((link) => (
            <a key={link.href} href={link.href} data-cd-trans={link.trans} className={link.strong ? `${styles.sfhPolicyLink} ${styles.sfhPolicyLinkStrong}` : styles.sfhPolicyLink}>
              {link.text}
            </a>
          ))}
          <span className={styles.sfhBreak} aria-hidden="true" />
          {FOOTER_TRUST_LINKS.map((link) => (
            <a key={link.href} href={link.href} data-cd-trans={link.trans} className={`${styles.sfhPolicyLink} ${styles.sfhPolicyLinkQuiet}`}>
              {link.text}
            </a>
          ))}
          {/* 동의 배너를 다시 연다(AnalyticsConsent 가 data-cd-cookie-settings 클릭을 받는다). 앱은 웹 배너를 쓰지 않는다. */}
          {!IS_APP_BUILD && (
            <button type="button" data-cd-cookie-settings className={`${styles.sfhPolicyLink} ${styles.sfhPolicyLinkQuiet} ${styles.sfhCookieButton}`}>
              쿠키 설정
            </button>
          )}
        </nav>

        <p className={styles.sfhNotice} data-cd-trans="footer.disclaimerNote">{FOOTER_NOTICE}</p>

        <section aria-label="사업자 정보" className={styles.sfhBusiness}>
          {BUSINESS_INFO_ROWS.map((row) => (
            <span key={row.key}>
              {siteFooterHubText(row.key)}{" "}
              {/* 법인 상호·대표자명·신고번호·사업장 주소는 **등록된 그대로가 법적 형식**이라
                  번역하지 않는다. data-cd-no-trans 로 런타임 번역 대상에서 명시적으로 제외한다. */}
              <span data-cd-no-trans>{row.value}</span>
            </span>
          ))}
        </section>

        {/* 서비스 링크는 검색 신호 전용이라 앱 번들에서는 렌더하지 않는다(2026-09-03 사용자 결정 — 앱에는 하단 탭바와 홈 IA 가 있다). */}
        {!IS_APP_BUILD && (
          <details className={styles.sfhAll}>
            <summary className={styles.sfhAllToggle} data-cd-trans="footer.allServices">전체 서비스 보기</summary>
            <nav className={styles.sfhAllGrid} aria-label={siteFooterHubText("siteFooter.012")}>
              {SEO_LINK_GROUPS.map((group) => (
                <section key={group.title} aria-label={group.title}>
                  <h2 className={styles.sfhGroupTitle}>{group.title}</h2>
                  <ul className={styles.sfhLinkList}>
                    {group.links.map((link) => (
                      <li key={link.href}>
                        <a href={link.href} className={styles.sfhLink}>{link.text}</a>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </nav>
          </details>
        )}

        <p className={styles.sfhCopyright}>© 2026 꿀꿀 운세 · CODE DESTINY</p>
      </div>
    </footer>
  );
}
