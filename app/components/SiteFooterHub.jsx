import AdminTrigger from "./AdminTrigger";

const POLICY_LINKS = [
  { href: "/terms-of-service", text: "이용약관" },
  { href: "/terms-of-service#refund-policy", text: "교환/환불 정책" },
  { href: "/privacy-policy", text: "개인정보처리방침" },
  { href: "/faq", text: "FAQ" },
  { href: "/contact-us", text: "문의하기" },
  { href: "/about", text: "서비스 소개" },
  { href: "/methodology", text: "콘텐츠 방법론" },
  { href: "/insights", text: "인사이트 아카이브" },
];

const SEO_LINK_GROUPS = [
  {
    title: "핵심 운세",
    links: [
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
      { href: "/oracle/hwatu-life", text: "화투 인생 패 테스트" },
      { href: "/oracle/ifa", text: "IFA 오라클" },
      { href: "/oracle/royal-tea", text: "로열 티 오라클" },
      { href: "/oracle/rune", text: "스톤헨지 룬 오라클" },
      { href: "/oracle/sikojen-povailu", text: "핀란드 주석점" },
      { href: "/high-value", text: "하이밸류 아카이브" },
    ],
  },
  {
    title: "정적 인기 페이지",
    links: [
      { href: "/geomancy-oracle-v4.html", text: "지오맨시 흙점" },
      { href: "/destiny-poker.html", text: "데스티니 포커" },
      { href: "/fortune-teller-fish.html", text: "포춘텔러 물고기" },
      { href: "/cosmic-soul-meditation.html", text: "코즈믹 소울 명상" },
      { href: "/neville-meditation.html", text: "네빌 명상" },
      { href: "/yoga-guru.html", text: "요가 구루" },
    ],
  },
];

const rootStyle = {
  marginTop: "34px",
  borderTop: "1px solid rgba(120,119,198,0.24)",
  background:
    "radial-gradient(circle at 16% 10%, rgba(56,189,248,0.08), transparent 38%), radial-gradient(circle at 85% 30%, rgba(167,139,250,0.09), transparent 42%), rgba(3,8,24,0.94)",
};

const shellStyle = {
  maxWidth: "1180px",
  margin: "0 auto",
  padding: "20px 20px 18px",
  color: "#94a3b8",
  fontSize: "12px",
};

const navStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "7px 12px",
  marginTop: "12px",
};

const linkStyle = {
  color: "#cbd5e1",
  textDecoration: "none",
  fontSize: "12px",
  lineHeight: 1.55,
};

const groupGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px 14px",
  marginTop: "4px",
};

const cardStyle = {
  border: "1px solid rgba(148,163,184,0.24)",
  borderRadius: "12px",
  background: "rgba(15,23,42,0.58)",
  padding: "10px 10px 9px",
};

export default function SiteFooterHub() {
  return (
    <footer style={rootStyle} aria-label="서비스 하단 정책 정보">
      <div style={shellStyle}>
        <section aria-label="랜딩 페이지 내부 링크 허브">
          <p style={{ margin: 0, color: "#e2e8f0", fontSize: "13px", fontWeight: 700 }}>
            서비스 링크 허브
          </p>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "12px", lineHeight: 1.6 }}>
            주요 운세/랜딩 페이지를 주제별로 묶어 탐색성과 검색 노출 신호를 강화했습니다.
          </p>
          <div style={groupGridStyle}>
            {SEO_LINK_GROUPS.map((group) => (
              <section key={group.title} style={cardStyle} aria-label={group.title}>
                <h2 style={{ margin: "0 0 7px", color: "#f8fafc", fontSize: "12px", fontWeight: 700 }}>
                  {group.title}
                </h2>
                <nav style={navStyle} aria-label={`${group.title} 링크`}>
                  {group.links.map((link) => (
                    <a key={link.href} href={link.href} style={linkStyle}>
                      {link.text}
                    </a>
                  ))}
                </nav>
              </section>
            ))}
          </div>
        </section>

        <nav aria-label="정책 및 안내 링크" style={navStyle}>
          {POLICY_LINKS.map((link) => (
            <a key={link.href} href={link.href} style={{ ...linkStyle, color: "#a5b4fc" }}>
              {link.text}
            </a>
          ))}
        </nav>
        <p style={{ margin: "14px 0 0", width: "100%", textAlign: "center", color: "#64748b" }}>
          © 2026 Code Destiny. All rights reserved. <AdminTrigger />
        </p>
      </div>
    </footer>
  );
}
