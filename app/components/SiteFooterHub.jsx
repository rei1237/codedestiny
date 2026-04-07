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
    label: "🔮 타로",
    emoji: "🔮",
    links: [
      { href: "/tarot/healing", text: "힐링 타로", badge: "인기" },
      { href: "/tarot/mingri", text: "명리학 AI 타로" },
      { href: "/tarot/love", text: "연애 관계 타로" },
      { href: "/tarot/self-esteem", text: "자존감 타로" },
      { href: "/tarot/reunion", text: "재회운 타로" },
      { href: "/tarot/year", text: "십이지신 연간 타로" },
    ],
  },
  {
    label: "🌟 사주 · 점성술",
    emoji: "🌟",
    links: [
      { href: "/saju/basic", text: "사주 풀이", badge: "핵심" },
      { href: "/ziwei/chart", text: "자미두수 명반" },
      { href: "/astrology/cosmic", text: "코즈믹 점성술" },
      { href: "/vedic/jyotish", text: "베다 점성술" },
    ],
  },
  {
    label: "🃏 오라클 · 신탁",
    emoji: "🃏",
    links: [
      { href: "/oracle/hwatu", text: "화투점" },
      { href: "/oracle/hwatu-life", text: "화투 인생 패 테스트" },
      { href: "/oracle/kemet", text: "이집트 신탁" },
      { href: "/oracle/juyuk", text: "주역 64괘" },
      { href: "/oracle/sukuyo", text: "숙요점 27수" },
      { href: "/oracle/royal-tea", text: "타세오그래피 찻잎 점" },
      { href: "/oracle/sikojen-povailu", text: "핀란드 주석점" },
    ],
  },
  {
    label: "🐾 동물 · 관상",
    emoji: "🐾",
    links: [
      { href: "/animal/physio", text: "AI 동물 관상" },
      { href: "/animal/mbti", text: "MBTI 동물 궁합" },
      { href: "/animal/totem", text: "애니멀 토템 리딩" },
    ],
  },
  {
    label: "🌸 운명의 꽃",
    emoji: "🌸",
    links: [
      { href: "/flower/destiny", text: "운명의 꽃 사주" },
      { href: "/flower/astrology", text: "꽃 점성술" },
      { href: "/flower/jamidusu", text: "꽃 자미두수" },
      { href: "/flower/sukuyo", text: "꽃 숙요점" },
    ],
  },
  {
    label: "💭 꿈 해몽 · 심리",
    emoji: "💭",
    links: [
      { href: "/dream/tarot", text: "꿈 타로" },
      { href: "/dream/psycho", text: "꿈 심리 분석" },
    ],
  },
];

const INSIGHT_LINKS = [
  { href: "/insights/saju-four-pillars-basics", text: "사주팔자 기초 완전 이해" },
  { href: "/insights/ten-heavenly-stems-practical", text: "십천간 실전 해석" },
  { href: "/insights/twelve-earthly-branches-and-seasons", text: "십이지지와 계절성" },
  { href: "/insights/tarot-major-arcana-symbols", text: "타로 메이저 아르카나" },
  { href: "/insights/astrology-vs-saju-differences", text: "서양점성술 vs 사주 차이" },
  { href: "/insights/ziwei-doushu-stars-intro", text: "자미두수 성군 입문" },
];

const POLICY_LINKS = [
  { href: "/about", text: "서비스 소개" },
  { href: "/faq", text: "FAQ" },
  { href: "/contact-us", text: "문의하기" },
  { href: "/privacy-policy", text: "개인정보처리방침" },
  { href: "/terms-of-service", text: "이용약관" },
];

// ─── 스타일 상수 ───────────────────────────────────────────────
const ROOT_STYLE = {
  background: "linear-gradient(180deg, rgba(7,11,31,0) 0%, rgba(7,11,31,0.98) 4%, #070b1f 100%)",
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
  background: "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(78,205,196,0.25))",
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

const BUSINESS_PANEL = {
  maxWidth: "860px",
  margin: "0 auto 24px",
  padding: "16px 18px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, rgba(30,41,59,0.72), rgba(15,23,42,0.9))",
  border: "1px solid rgba(124,58,237,0.3)",
  boxShadow: "inset 0 1px 0 rgba(148,163,184,0.08)",
};

const BUSINESS_TITLE = {
  margin: "0 0 10px",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#a78bfa",
};

const BUSINESS_LIST = {
  listStyle: "none",
  margin: "0 0 12px",
  padding: 0,
  display: "grid",
  gap: "6px",
};

const BUSINESS_ITEM = {
  fontSize: "12px",
  lineHeight: 1.7,
  color: "#94a3b8",
};

const BUSINESS_KEY = {
  color: "#cbd5e1",
  fontWeight: 600,
};

const REFUND_BOX = {
  marginTop: "10px",
  paddingTop: "10px",
  borderTop: "1px solid rgba(71,85,105,0.65)",
};

const REFUND_HEAD = {
  margin: "0 0 8px",
  fontSize: "12px",
  fontWeight: 700,
  color: "#fda4af",
  letterSpacing: "0.03em",
};

const REFUND_SUMMARY = {
  margin: "0 0 8px",
  color: "#cbd5e1",
  fontSize: "12px",
  lineHeight: 1.72,
  wordBreak: "keep-all",
};

const REFUND_RULES = {
  margin: 0,
  padding: "0 0 0 18px",
  display: "grid",
  gap: "6px",
};

const REFUND_RULE_ITEM = {
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: 1.72,
  wordBreak: "keep-all",
};

const REFUND_NOTICE = {
  margin: "10px 0 0",
  color: "#fda4af",
  fontSize: "11px",
  lineHeight: 1.72,
  wordBreak: "keep-all",
};

const POLICY_LINK = {
  color: "#475569",
  textDecoration: "none",
  fontSize: "12px",
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
          <span style={BRAND_LOGO} aria-label="꿀꿀 만세력">🐷 꿀꿀 만세력</span>
        </div>
        <p style={TAGLINE_STYLE}>
          사주팔자 · AI 타로 · 자미두수 · 점성술 · 숙요점 · 궁합 · 동물관상 · 꿈 해몽까지<br />
          생년월일 하나로 20가지 이상의 운세를 한 곳에서 — Code Destiny 꿀꿀 만세력
        </p>

        {/* 서비스 카테고리 내부 링크 그리드 */}
        <nav aria-label="전체 서비스 메뉴">
          <div style={GRID_STYLE}>
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <div style={SECTION_LABEL}>{section.label}</div>
                <ul style={LINK_LIST_STYLE}>
                  {section.links.map((link) => {
                    const badgeStyle = link.badge ? BADGE_MAP[link.badge] : null;
                    return (
                      <li key={link.href}>
                        <a
                          href={`${ORIGIN}${link.href}`}
                          style={LINK_STYLE}
                          aria-label={link.text}
                        >
                          <span>→</span>
                          <span>{link.text}</span>
                          {badgeStyle && <span style={badgeStyle}>{link.badge}</span>}
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
            <a href={`${ORIGIN}/insights`} style={{ ...INSIGHT_CHIP, color: "#a78bfa", borderColor: "rgba(124,58,237,0.4)" }}>
              전체 보기 →
            </a>
          </div>
        </nav>

        <hr style={DIVIDER} />

        {/* ── About 서비스 소개 스니펫 (AdSense · E-E-A-T 대응) ── */}
        <section
          aria-label="서비스 소개"
          style={{
            maxWidth: "860px",
            margin: "0 auto 28px",
            padding: "18px 20px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, rgba(30,41,59,0.54), rgba(15,23,42,0.8))",
            border: "1px solid rgba(124,58,237,0.22)",
          }}
        >
          <h3 style={{ fontSize: "12px", fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", paddingBottom: "6px", borderBottom: "1px solid rgba(124,58,237,0.18)" }}>
            About Code Destiny — 꿀꿀 만세력이란?
          </h3>
          <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#64748b", lineHeight: 1.82, wordBreak: "keep-all" }}>
            <strong style={{ color: "#94a3b8" }}>Code Destiny(꿀꿀 만세력)</strong>는 사주팔자·AI 타로·자미두수·코즈믹 점성술·
            숙요점·동물관상·꿈 해몽 등 다양한 운세 서비스를 제공하는
            AI 기반 운세 플랫폼입니다. 한국어·영어·일본어·중국어·힌디어·스페인어 등 10개 언어를 지원합니다.
            모든 결과는 오락·자기성찰 목적이며, 법률·의료·투자 판단을 대체하지 않습니다.
          </p>
          <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#64748b", lineHeight: 1.82, wordBreak: "keep-all" }}>
            본 서비스는 <strong style={{ color: "#94a3b8" }}>Google AdSense</strong> 등 제3자 광고를 노출할 수 있으며,
            광고 수익은 전적으로 서비스 품질 유지 및 신규 기능 개발에 재투자됩니다.
            운영 주체: 코드 데스티니 (대표 박병하 · 사업자등록번호 372-23-02329) |
            이메일: seongbae555@gmail.com
          </p>
          <nav aria-label="서비스 소개 링크" style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
            <a href={`${ORIGIN}/about`} style={{ color: "#a78bfa", textDecoration: "none", fontSize: "12px", fontWeight: 700 }}>서비스 소개 About →</a>
            <a href={`${ORIGIN}/faq`} style={{ color: "#475569", textDecoration: "none", fontSize: "12px" }}>FAQ</a>
            <a href={`${ORIGIN}/contact-us`} style={{ color: "#475569", textDecoration: "none", fontSize: "12px" }}>문의하기</a>
            <a href={`${ORIGIN}/privacy-policy`} style={{ color: "#475569", textDecoration: "none", fontSize: "12px" }}>개인정보처리방침</a>
            <a href={`${ORIGIN}/terms-of-service`} style={{ color: "#475569", textDecoration: "none", fontSize: "12px" }}>이용약관</a>
          </nav>
        </section>

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
          Code: Destiny의 꽃돼지 연이는 백사자 쌈바와 함께 사주, 운세, 타로, 명리학 해석을
          꿀꿀 사주·꿀꿀 운세·꿀꿀 만세력 기반의 실전 인사이트로 제공합니다.
          사주풀이·타로·자미두수·베다 점성술·AI 관상·꿈 해몽 등 다양한 서비스를 이용하세요.
        </p>

        <section style={BUSINESS_PANEL} aria-label="사업자 정보 및 코인 환불 정책">
          <h3 style={BUSINESS_TITLE}>사업자 정보 및 코인 환불 정책</h3>
          <ul style={BUSINESS_LIST}>
            <li style={BUSINESS_ITEM}><span style={BUSINESS_KEY}>상호명:</span> 코드 데스니티 (Code Destiny)</li>
            <li style={BUSINESS_ITEM}><span style={BUSINESS_KEY}>대표자:</span> 박병하</li>
            <li style={BUSINESS_ITEM}><span style={BUSINESS_KEY}>사업자등록번호:</span> 372-23-02329</li>
            <li style={BUSINESS_ITEM}><span style={BUSINESS_KEY}>사업장 주소:</span> 경기도 화성시 효행구 비봉면 새비봉동로 37, 101동 1207호</li>
          </ul>
          <div style={REFUND_BOX}>
            <p style={REFUND_HEAD}>코인 충전형 디지털 운세 서비스 환불 기준</p>
            <p style={REFUND_SUMMARY}>
              코인은 서비스 이용권 성격의 선결제 포인트이며, 전자상거래 관련 법령 및 약관에 따라
              미사용 유상 코인 범위에서만 환불이 가능합니다.
            </p>
            <ul style={REFUND_RULES}>
              <li style={REFUND_RULE_ITEM}>충전일로부터 7일 이내, 그리고 코인 전량 미사용 상태인 경우에 한해 결제금액 전액 환불이 가능합니다.</li>
              <li style={REFUND_RULE_ITEM}>결과 열람, 리딩 실행, AI 해석 생성 등으로 코인이 1회라도 차감된 경우 해당 차감분은 디지털 콘텐츠 제공이 완료된 것으로 보아 환불 대상에서 제외됩니다.</li>
              <li style={REFUND_RULE_ITEM}>부분 환불은 잔여 유상 코인만 가능하며, 프로모션/이벤트/무상 지급 코인, 만료·소멸된 코인, 보상성 지급분은 환불되지 않습니다.</li>
              <li style={REFUND_RULE_ITEM}>환불 금액 산정은 최근 충전분 우선 차감 기준을 적용하며, 결제사 수수료·송금 수수료 등 실제 발생비용은 관련 법령 허용 범위 내에서 공제될 수 있습니다.</li>
              <li style={REFUND_RULE_ITEM}>타인 명의 결제, 도용 카드 사용, 비정상 다계정 환불 시도, 약관 위반이 확인되면 환불 심사가 보류되거나 제한될 수 있습니다.</li>
              <li style={REFUND_RULE_ITEM}>환불 접수는 결제자 본인 확인이 완료된 요청만 처리하며, 환급 완료까지 통상 영업일 3~10일이 소요됩니다.</li>
            </ul>
            <p style={REFUND_NOTICE}>
              본 정책은 이용약관 및 결제대행사 정책과 함께 적용되며, 강행규정과 충돌하는 경우 관계 법령을 우선합니다. 환불 접수: 문의하기 또는 고객지원 이메일.
            </p>
          </div>
          <div style={{...REFUND_BOX, marginTop: "12px"}}>
            <p style={REFUND_HEAD}>구독형 요금제 환불 기준</p>
            <p style={REFUND_SUMMARY}>
              구독 코인은 요금제 선택 즉시 차감되며, 전자상거래 등에서의 소비자보호에 관한 법률 및
              콘텐츠산업 진흥법에 따른 디지털 콘텐츠 환불 정책이 적용됩니다.
            </p>
            <ul style={REFUND_RULES}>
              <li style={REFUND_RULE_ITEM}>구독 시작 후 <strong>7일 이내</strong>이며, 구독 혜택(해금 콘텐츠 열람, 추가 프로필 생성, AI 리딩 등)을 <strong>전혀 이용하지 않은 경우</strong>에 한해 코인 전액 환원이 가능합니다.</li>
              <li style={REFUND_RULE_ITEM}>구독 기간 중 해금 콘텐츠 이용, 프로필 생성, AI 해석 실행 등 혜택을 1회라도 사용한 경우, 사용일수 비례 공제 후 잔여분만 환원됩니다.</li>
              <li style={REFUND_RULE_ITEM}>자동 갱신으로 차감된 코인은 갱신일로부터 <strong>24시간 이내</strong>에 미사용 상태인 경우에만 취소 및 환원 신청이 가능합니다.</li>
              <li style={REFUND_RULE_ITEM}>구독 기간이 만료되었거나 이미 갱신이 완료된 회차분은 환원 대상에서 제외됩니다.</li>
              <li style={REFUND_RULE_ITEM}>이벤트·프로모션 할인가로 구독한 경우, 환원 금액은 실제 차감된 코인 기준으로 산정됩니다.</li>
              <li style={REFUND_RULE_ITEM}>환불 신청은 고객센터(문의하기) 또는 고객지원 이메일로 접수하며, 처리까지 영업일 기준 3~10일이 소요됩니다.</li>
            </ul>
            <p style={REFUND_NOTICE}>
              본 구독 환불 정책은 이용약관과 함께 적용되며, 강행규정과 충돌 시 관계 법령이 우선합니다.
            </p>
          </div>
        </section>

        {/* 정책 링크 */}
        <nav aria-label="정책 페이지" style={POLICY_ROW}>
          {POLICY_LINKS.map((link) => (
            <a key={link.href} href={`${ORIGIN}${link.href}`} style={POLICY_LINK}>
              {link.text}
            </a>
          ))}
        </nav>

        {/* 저작권 */}
        <div style={COPYRIGHT}>
          <p style={{ margin: "0 0 4px" }}>
            © 2026 Code Destiny. All rights reserved.
          </p>
          <p style={{ margin: "0 0 4px" }}>
            🐷 꿀꿀 만세력 — 사주 · 타로 · 운세 · 궁합 플랫폼
          </p>
          <p style={{ margin: 0, fontSize: "11px", color: "#1e293b" }}>
            English&nbsp;
            <a href={`${ORIGIN}/en-us`} style={{ color: "#334155", textDecoration: "none" }}>→ en</a>
            &nbsp;·&nbsp;
            <a href={`${ORIGIN}/ja-jp`} style={{ color: "#334155", textDecoration: "none" }}>日本語</a>
            &nbsp;·&nbsp;
            <a href={`${ORIGIN}/zh-cn`} style={{ color: "#334155", textDecoration: "none" }}>中文</a>
            &nbsp;·&nbsp;
            <a href={`${ORIGIN}/es-es`} style={{ color: "#334155", textDecoration: "none" }}>Español</a>
            &nbsp;·&nbsp;
            <a href={`${ORIGIN}/fr-fr`} style={{ color: "#334155", textDecoration: "none" }}>Français</a>
            &nbsp;·&nbsp;
            <a href={`${ORIGIN}/de-de`} style={{ color: "#334155", textDecoration: "none" }}>Deutsch</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
