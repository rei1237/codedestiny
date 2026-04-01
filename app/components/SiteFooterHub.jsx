/**
 * SiteFooterHub — 꿀꿀 만세력의 SEO 최적화 사이트맵형 푸터
 *
 * 역할:
 *  - 서비스 카테고리별 내부 링크 → 크롤러 발견성 + 페이지 권위 전달
 *  - "무료" 키워드 강조로 CTR 개선
 *  - 다크 코즈믹 톤앤매너 (자주/청록 팔레트) 유지
 *  - 인사이트 허브 → 콘텐츠 아카이브 연결
 */

const ORIGIN = "https://code-destiny.com";

const NAV_SECTIONS = [
  {
    label: "🔮 무료 타로",
    emoji: "🔮",
    links: [
      { href: "/tarot/healing", text: "무료 힐링 타로", badge: "인기" },
      { href: "/tarot/mingri", text: "명리학 AI 타로" },
      { href: "/tarot/love", text: "연애 관계 타로" },
      { href: "/tarot/self-esteem", text: "자존감 타로" },
      { href: "/tarot/reunion", text: "재회운 타로" },
      { href: "/tarot/year", text: "십이지신 연간 타로" },
    ],
  },
  {
    label: "🌟 무료 사주 · 점성술",
    emoji: "🌟",
    links: [
      { href: "/saju/basic", text: "무료 사주 풀이", badge: "핵심" },
      { href: "/ziwei/chart", text: "자미두수 명반" },
      { href: "/astrology/cosmic", text: "코즈믹 점성술" },
      { href: "/vedic/jyotish", text: "베다 점성술" },
    ],
  },
  {
    label: "🃏 무료 오라클 · 신탁",
    emoji: "🃏",
    links: [
      { href: "/oracle/hwatu", text: "무료 화투점" },
      { href: "/oracle/hwatu-life", text: "화투 인생 패 테스트" },
      { href: "/oracle/kemet", text: "이집트 신탁" },
      { href: "/oracle/juyuk", text: "주역 64괘" },
      { href: "/oracle/sukuyo", text: "숙요점 27수" },
      { href: "/royal-tea-oracle.html", text: "타세오그래피 찻잎 점" },
      { href: "/oracle/sikojen-povailu", text: "핀란드 주석점" },
    ],
  },
  {
    label: "🐾 무료 동물 · 관상",
    emoji: "🐾",
    links: [
      { href: "/animal/physio", text: "AI 동물 관상" },
      { href: "/animal/mbti", text: "MBTI 동물 궁합" },
      { href: "/animal/totem", text: "애니멀 토템 리딩" },
    ],
  },
  {
    label: "🌸 무료 운명의 꽃",
    emoji: "🌸",
    links: [
      { href: "/flower/destiny", text: "운명의 꽃 사주" },
      { href: "/flower/astrology", text: "꽃 점성술" },
      { href: "/flower/jamidusu", text: "꽃 자미두수" },
      { href: "/flower/sukuyo", text: "꽃 숙요점" },
    ],
  },
  {
    label: "💭 무료 꿈 해몽 · 심리",
    emoji: "💭",
    links: [
      { href: "/dream/tarot", text: "무료 꿈 타로" },
      { href: "/dream/psycho", text: "꿈 심리 분석" },
    ],
  },
];

const INSIGHT_LINKS = [
  {
    href: "/insights/saju-four-pillars-basics",
    text: "사주팔자 기초 완전 이해",
  },
  { href: "/insights/ten-heavenly-stems-practical", text: "십천간 실전 해석" },
  {
    href: "/insights/twelve-earthly-branches-and-seasons",
    text: "십이지지와 계절성",
  },
  {
    href: "/insights/tarot-major-arcana-symbols",
    text: "타로 메이저 아르카나",
  },
  {
    href: "/insights/astrology-vs-saju-differences",
    text: "서양점성술 vs 사주 차이",
  },
  { href: "/insights/ziwei-doushu-stars-intro", text: "자미두수 성군 입문" },
];

const POLICY_LINKS = [
  { href: "/about", text: "서비스 소개" },
  { href: "/faq", text: "FAQ" },
  { href: "/contact-us", text: "문의하기" },
  { href: "/privacy-policy", text: "개인정보처리방침" },
  { href: "/terms-of-service", text: "이용약관" },
  { href: "/refund-policy", text: "환불 규정" },
];

// ─── 스타일 상수 ───────────────────────────────────────────────
const ROOT_STYLE = {
  background:
    "linear-gradient(180deg, rgba(7,11,31,0) 0%, rgba(7,11,31,0.98) 4%, #070b1f 100%)",
  borderTop: "1px solid rgba(124,58,237,0.25)",
  paddingTop: "52px",
  paddingBottom: "32px",
  marginTop: "60px",
  fontSize: "14px",
  color: "#94a3b8",
};

const INNER_STYLE = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "0 20px",
};

const BRAND_ROW = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "8px",
};

const BRAND_LOGO = {
  fontSize: "clamp(22px, 3vw, 28px)",
  fontWeight: 900,
  letterSpacing: "-0.02em",
  background: "linear-gradient(135deg, #a78bfa, #4ecdc4)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

const FREE_BADGE = {
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 10px",
  borderRadius: "999px",
  background:
    "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(78,205,196,0.25))",
  border: "1px solid rgba(124,58,237,0.5)",
  fontSize: "11px",
  fontWeight: 700,
  color: "#a78bfa",
  letterSpacing: "0.04em",
};

const TAGLINE_STYLE = {
  fontSize: "clamp(12px, 2vw, 14px)",
  color: "#64748b",
  marginBottom: "40px",
  lineHeight: 1.6,
  wordBreak: "keep-all",
};

const GRID_STYLE = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: "32px 20px",
  marginBottom: "40px",
};

const SECTION_LABEL = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#a78bfa",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: "12px",
  paddingBottom: "6px",
  borderBottom: "1px solid rgba(124,58,237,0.2)",
};

const LINK_LIST_STYLE = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "7px",
};

const LINK_STYLE = {
  color: "#94a3b8",
  textDecoration: "none",
  fontSize: "13px",
  lineHeight: 1.5,
  display: "flex",
  alignItems: "center",
  gap: "6px",
  transition: "color 0.15s",
};

const HOT_BADGE = {
  display: "inline-block",
  padding: "1px 6px",
  borderRadius: "4px",
  background: "rgba(251,146,60,0.2)",
  border: "1px solid rgba(251,146,60,0.4)",
  color: "#fb923c",
  fontSize: "10px",
  fontWeight: 700,
};

const KEY_BADGE = {
  display: "inline-block",
  padding: "1px 6px",
  borderRadius: "4px",
  background: "rgba(78,205,196,0.15)",
  border: "1px solid rgba(78,205,196,0.35)",
  color: "#4ecdc4",
  fontSize: "10px",
  fontWeight: 700,
};

const DIVIDER = {
  borderColor: "rgba(124,58,237,0.15)",
  marginBottom: "24px",
};

const INSIGHTS_HEADER = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#4ecdc4",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: "12px",
};

const INSIGHTS_GRID = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginBottom: "36px",
};

const INSIGHT_CHIP = {
  color: "#94a3b8",
  textDecoration: "none",
  fontSize: "12px",
  padding: "4px 10px",
  borderRadius: "6px",
  background: "rgba(30,41,59,0.8)",
  border: "1px solid rgba(51,65,85,0.8)",
  whiteSpace: "nowrap",
};

const POLICY_ROW = {
  display: "flex",
  flexWrap: "wrap",
  gap: "4px 16px",
  marginBottom: "20px",
  justifyContent: "center",
};

const POLICY_LINK = {
  color: "#475569",
  textDecoration: "none",
  fontSize: "12px",
};

const LEGAL_CARD = {
  maxWidth: "860px",
  margin: "0 auto 24px",
  padding: "14px 16px",
  borderRadius: "12px",
  border: "1px solid rgba(124,58,237,0.22)",
  background: "linear-gradient(145deg, rgba(15,23,42,0.72), rgba(30,41,59,0.58))",
};

const LEGAL_TITLE = {
  margin: "0 0 8px",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#a78bfa",
};

const LEGAL_TEXT = {
  margin: 0,
  fontSize: "12px",
  lineHeight: 1.8,
  color: "#94a3b8",
  wordBreak: "keep-all",
};

const COPYRIGHT = {
  textAlign: "center",
  fontSize: "12px",
  color: "#334155",
  lineHeight: 1.7,
};

const BADGE_MAP = { 인기: HOT_BADGE, 핵심: KEY_BADGE };

export default function SiteFooterHub() {
  return (
    <footer style={ROOT_STYLE} aria-label="사이트 전체 메뉴 및 서비스 링크">
      {/* 구조화 데이터: SiteNavigationElement (마이크로데이터) */}
      <div style={INNER_STYLE}>
        {/* 브랜드 */}
        <div style={BRAND_ROW}>
          <span style={BRAND_LOGO} aria-label="꿀꿀 만세력">
            🐷 꿀꿀 만세력
          </span>
          <span style={FREE_BADGE}>전 서비스 무료</span>
        </div>
        <p style={TAGLINE_STYLE}>
          무료 사주팔자 · AI 타로 · 자미두수 · 점성술 · 숙요점 · 궁합 · 동물관상
          · 꿈 해몽까지
          <br />
          생년월일 하나로 20가지 이상의 운세를 무료로 — Code Destiny 꿀꿀 만세력
        </p>

        {/* 서비스 카테고리 내부 링크 그리드 */}
        <nav aria-label="전체 서비스 메뉴">
          <div style={GRID_STYLE}>
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <div style={SECTION_LABEL}>{section.label}</div>
                <ul style={LINK_LIST_STYLE}>
                  {section.links.map((link) => {
                    const badgeStyle = link.badge
                      ? BADGE_MAP[link.badge]
                      : null;
                    return (
                      <li key={link.href}>
                        <a
                          href={`${ORIGIN}${link.href}`}
                          style={LINK_STYLE}
                          aria-label={`${link.text} — 무료`}
                        >
                          <span>→</span>
                          <span>{link.text}</span>
                          {badgeStyle && (
                            <span style={badgeStyle}>{link.badge}</span>
                          )}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <hr style={DIVIDER} />

        {/* 인사이트 아카이브 */}
        <nav aria-label="운세 인사이트 아카이브">
          <div style={INSIGHTS_HEADER}>📖 운세 인사이트 아카이브</div>
          <div style={INSIGHTS_GRID}>
            {INSIGHT_LINKS.map((link) => (
              <a
                key={link.href}
                href={`${ORIGIN}${link.href}`}
                style={INSIGHT_CHIP}
                aria-label={link.text}
              >
                {link.text}
              </a>
            ))}
            <a
              href={`${ORIGIN}/insights`}
              style={{
                ...INSIGHT_CHIP,
                color: "#a78bfa",
                borderColor: "rgba(124,58,237,0.4)",
              }}
            >
              전체 보기 →
            </a>
          </div>
        </nav>

        <hr style={DIVIDER} />

        {/* SEO 텍스트 블록 — 주요 키워드 자연 표현 */}
        <p
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "#475569",
            lineHeight: 1.8,
            maxWidth: "760px",
            margin: "0 auto 24px",
            wordBreak: "keep-all",
          }}
        >
          Code: Destiny의 꽃돼지 연이는 백사자 쌈바와 함께 사주, 운세, 타로,
          명리학 해석을 꿀꿀 사주·꿀꿀 운세·꿀꿀 만세력 기반의 실전 인사이트로
          제공합니다. 무료 사주풀이·무료 타로·자미두수·베다 점성술·AI 관상·꿈
          해몽까지, 모든 서비스는 무료입니다.
        </p>

        <section aria-label="사업자 정보" style={LEGAL_CARD}>
          <h3 style={LEGAL_TITLE}>사업자 정보</h3>
          <p style={LEGAL_TEXT}>
            상호명: 코드 데스니티 (Code Destiny)
            <br />
            대표자: 박병하
            <br />
            사업자등록번호: 372-23-02329
            <br />
            사업장 주소: 경기도 화성시 효행구 비봉면 새비봉동로 37, 101동 1207호
          </p>
        </section>

        <section aria-label="환불 규정" style={LEGAL_CARD}>
          <h3 style={LEGAL_TITLE}>디지털 콘텐츠 환불 안내</h3>
          <p style={LEGAL_TEXT}>
            본 서비스의 유료 디지털 콘텐츠(포인트/결제형 운세 결과 등)는 결제 후 즉시 제공되거나 사용이 개시되는 특성상,
            전자상거래 등에서의 소비자보호에 관한 법률 제17조 제2항 제5호 및 관련 법령에 따라 청약철회(환불)가 제한될 수 있습니다.
            다만, 표시·광고 내용과 다르거나 계약 내용과 다르게 이행된 경우, 또는 관련 법령상 환불 사유가 인정되는 경우에는
            법령 및 이용약관에 따라 환불 또는 적절한 조치를 제공합니다.
          </p>
        </section>

        {/* 정책 링크 */}
        <nav aria-label="정책 페이지" style={POLICY_ROW}>
          {POLICY_LINKS.map((link) => (
            <a
              key={link.href}
              href={`${ORIGIN}${link.href}`}
              style={POLICY_LINK}
            >
              {link.text}
            </a>
          ))}
        </nav>

        {/* 저작권 */}
        <div style={COPYRIGHT}>
          <p style={{ margin: "0 0 4px" }}>
            © 2026 Code Destiny. All rights reserved.
          </p>
          <p style={{ margin: 0 }}>
            🐷 꿀꿀 만세력 — 무료 사주 · 타로 · 운세 · 궁합 플랫폼
          </p>
        </div>
      </div>
    </footer>
  );
}
