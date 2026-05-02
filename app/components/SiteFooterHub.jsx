const ORIGIN = "https://code-destiny.com";
const LEGAL_OWNER_NAME = ["박", "병", "하"].join("\u2060");

const SERVICE_GROUPS = [
  {
    title: "핵심 타로",
    links: [
      { href: "/tarot/mingri", text: "명리학 AI 타로" },
      { href: "/tarot/healing", text: "힐링 타로" },
      { href: "/tarot/love", text: "연애 관계 타로" },
      { href: "/tarot/mindscan", text: "마인드스캔 타로" },
    ],
  },
  {
    title: "사주 · 점성술",
    links: [
      { href: "/saju/basic", text: "사주 기본 풀이" },
      { href: "/ziwei/chart", text: "자미두수 명반" },
      { href: "/astrology/cosmic", text: "코즈믹 점성술" },
      { href: "/saju/love-simulation", text: "사주 궁합 시뮬레이션" },
    ],
  },
  {
    title: "오라클 · 신탁",
    links: [
      { href: "/oracle/ifa", text: "이파 오라클" },
      { href: "/oracle/hwatu-life", text: "화투 인생 패 테스트" },
      { href: "/oracle/royal-tea", text: "타세오그래피 찻잎 점" },
      { href: "/oracle/sikojen-povailu", text: "핀란드 주석점" },
    ],
  },
  {
    title: "콘텐츠",
    links: [
      { href: "/insights", text: "인사이트 허브" },
      { href: "/high-value", text: "가이드 아카이브" },
      { href: "/methodology", text: "작성 방법론" },
      { href: "/about", text: "서비스 소개" },
    ],
  },
];

const QUICK_LINKS = [
  { href: "/oracle/ifa", text: "🪬 IFA 오라클" },
  { href: "/flower/destiny", text: "🌸 운명의 꽃" },
  { href: "/dream/tarot", text: "🌙 드림 타로" },
  { href: "/points", text: "🪙 코인 충전" },
  { href: "/static/index.html", text: "⚡ 레거시 메인" },
];

const POLICY_LINKS = [
  { href: "/faq", text: "FAQ" },
  { href: "/contact-us", text: "문의하기" },
  { href: "/terms-of-service", text: "이용약관" },
  { href: "/privacy-policy", text: "개인정보처리방침" },
];

const LANG_LINKS = [
  { href: "/en-us", text: "EN" },
  { href: "/ja-jp", text: "JP" },
  { href: "/zh-cn", text: "中文" },
  { href: "/es-es", text: "ES" },
  { href: "/fr-fr", text: "FR" },
  { href: "/de-de", text: "DE" },
];

const rootStyle = {
  marginTop: "56px",
  borderTop: "1px solid rgba(120,119,198,0.32)",
  background:
    "radial-gradient(120% 140% at 18% -20%, rgba(122,76,255,0.22) 0%, rgba(10,14,40,0.06) 42%, transparent 72%), radial-gradient(120% 120% at 88% 0%, rgba(36,214,203,0.16) 0%, rgba(6,10,24,0) 58%), linear-gradient(180deg, rgba(3,6,18,0.62) 0%, #060916 18%, #050712 100%)",
};

const shellStyle = {
  maxWidth: "1180px",
  margin: "0 auto",
  padding: "40px 20px 28px",
};

const heroCard = {
  borderRadius: "24px",
  padding: "24px",
  border: "1px solid rgba(153,154,255,0.26)",
  background: "linear-gradient(145deg, rgba(39,27,86,0.58), rgba(13,24,60,0.58))",
  boxShadow: "0 28px 60px rgba(2,4,14,0.45)",
  marginBottom: "22px",
};

const sectionTitle = {
  margin: "0 0 10px",
  color: "#e2e8f0",
  fontWeight: 700,
  letterSpacing: "0.02em",
  fontSize: "15px",
};

const sectionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "14px",
};

const panelStyle = {
  borderRadius: "14px",
  border: "1px solid rgba(125,128,255,0.2)",
  background: "linear-gradient(150deg, rgba(31,24,61,0.52), rgba(10,20,48,0.52))",
  padding: "14px",
};

const linkList = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: "8px",
};

const linkStyle = {
  color: "#b9c5db",
  textDecoration: "none",
  fontSize: "13px",
  lineHeight: 1.5,
};

const quickWrap = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "12px",
};

const quickChip = {
  borderRadius: "999px",
  border: "1px solid rgba(111,224,220,0.28)",
  background: "rgba(12,30,49,0.72)",
  color: "#a7f3d0",
  padding: "6px 12px",
  fontSize: "12px",
  textDecoration: "none",
  letterSpacing: "0.02em",
};

const trustGrid = {
  marginTop: "18px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
  gap: "14px",
};

const trustCard = {
  borderRadius: "14px",
  border: "1px solid rgba(148,163,184,0.22)",
  background: "rgba(8,14,32,0.72)",
  padding: "14px",
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: 1.7,
};

const bottomRow = {
  marginTop: "20px",
  borderTop: "1px solid rgba(120,119,198,0.2)",
  paddingTop: "14px",
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: "12px",
  color: "#64748b",
  fontSize: "12px",
};

const metaLinks = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px 12px",
};

export default function SiteFooterHub() {
  return (
    <footer style={rootStyle} aria-label="서비스 하단 네비게이션 및 정책 정보">
      <div style={shellStyle}>
        <section style={heroCard} aria-label="서비스 네비게이션">
          <p style={{ margin: "0 0 6px", color: "#8df0d6", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
            Code Destiny Navigation
          </p>
          <h2 style={{ margin: "0 0 10px", color: "#f8fafc", fontSize: "clamp(20px, 3vw, 28px)", lineHeight: 1.2 }}>
            꿀꿀 만세력 서비스 허브
          </h2>
          <p style={{ margin: 0, color: "#a7b4ca", fontSize: "13px", lineHeight: 1.7, maxWidth: "880px" }}>
            과밀한 랜딩 블록을 제거하고 핵심 경로만 유지했습니다. 네이티브 페이지와 레거시 엔진 모두
            안정적으로 접근할 수 있도록 동선을 단순화했습니다.
          </p>

          <div style={quickWrap}>
            {QUICK_LINKS.map((item) => (
              <a key={item.href} href={`${ORIGIN}${item.href}`} style={quickChip}>
                {item.text}
              </a>
            ))}
          </div>

          <div style={sectionGrid}>
            {SERVICE_GROUPS.map((group) => (
              <article key={group.title} style={panelStyle}>
                <h3 style={sectionTitle}>{group.title}</h3>
                <ul style={linkList}>
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <a href={`${ORIGIN}${link.href}`} style={linkStyle}>
                        {link.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div style={trustGrid}>
            <section style={trustCard} aria-label="운영 정보">
              <strong style={{ color: "#cbd5e1" }}>운영 주체</strong>
              <div>코드 데스티니 (사업자등록번호 372-23-02329)</div>
              <div>대표자: {LEGAL_OWNER_NAME}</div>
              <div>문의: seongbae555@gmail.com</div>
            </section>
            <section style={trustCard} aria-label="서비스 안내">
              <strong style={{ color: "#cbd5e1" }}>서비스 정책 안내</strong>
              <div>리딩 결과는 오락 및 자기성찰 보조 정보입니다.</div>
              <div>법률, 의료, 투자 판단을 대체하지 않습니다.</div>
              <div>유상 코인 환불은 약관 및 관련 법령 기준을 따릅니다.</div>
            </section>
          </div>
        </section>

        <div style={bottomRow}>
          <nav aria-label="정책 링크" style={metaLinks}>
            {POLICY_LINKS.map((link) => (
              <a key={link.href} href={`${ORIGIN}${link.href}`} style={{ ...linkStyle, fontSize: "12px", color: "#8b9db7" }}>
                {link.text}
              </a>
            ))}
          </nav>
          <nav aria-label="다국어 링크" style={metaLinks}>
            {LANG_LINKS.map((link) => (
              <a key={link.href} href={`${ORIGIN}${link.href}`} style={{ ...linkStyle, fontSize: "12px", color: "#6ee7d8" }}>
                {link.text}
              </a>
            ))}
          </nav>
        </div>

        <p style={{ margin: "10px 0 0", color: "#475569", fontSize: "11px", textAlign: "center" }}>
          © 2026 Code Destiny. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
