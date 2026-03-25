/**
 * SiteFooterHub
 * - 이미지 + 설명 + 메인 유입 CTA 카드 허브
 * - 기능 상세 페이지로 분기하지 않고 모두 메인으로 이동
 */

const ORIGIN = "https://code-destiny.com";
const MAIN_ENTRY = `${ORIGIN}/`;

const FEATURE_CARDS = [
  {
    id: "saju-core",
    kicker: "FREE • MAIN SERVICE",
    title: "꿀꿀 만세력",
    desc: "사주 만세력·오행·십성 핵심 해석을 메인에서 바로 시작하세요.",
    points: ["사주 만세력", "자미두수·점성술", "통합 운세 시작"],
    image: "/fuctionassets/quntum.webp",
    emoji: "🐷",
  },
  {
    id: "tarot-main",
    kicker: "FREE • TAROT",
    title: "타로 리딩 컬렉션",
    desc: "중복 전용 페이지 대신 메인 타로 컬렉션에서 원하는 리딩을 바로 실행합니다.",
    points: ["명리학 AI 타로", "재회운·자존감 리딩", "메인에서 즉시 실행"],
    image: "/fuctionassets/ai tarrot.webp",
    emoji: "🔮",
  },
  {
    id: "oracle-main",
    kicker: "FREE • ORACLE",
    title: "오라클 · 신탁",
    desc: "화투점, 주역, 숙요, 이집트 신탁을 메인에서 한 번에 고를 수 있습니다.",
    points: ["무료 화투점", "주역 64괘·숙요", "신탁 컬렉션 진입"],
    image: "/fuctionassets/tazza.webp",
    emoji: "🃏",
  },
  {
    id: "animal-main",
    kicker: "FREE • ANIMAL",
    title: "동물 · 관상 컬렉션",
    desc: "AI 동물 관상과 MBTI 동물 궁합을 메인 유입 흐름으로 연결합니다.",
    points: ["AI 동물 관상", "MBTI 동물 궁합", "애니멀 토템"],
    image: "/fuctionassets/ai animal.webp",
    emoji: "🦊",
  },
  {
    id: "flower-main",
    kicker: "FREE • BLOOM",
    title: "운명의 꽃 아틀리에",
    desc: "운명의 꽃 관련 기능도 별도 분기 없이 메인에서 이어서 실행됩니다.",
    points: ["운명의 꽃", "꽃 점성술·숙요 꽃", "자미두수 꽃"],
    image: "/fuctionassets/flower.webp",
    emoji: "🌸",
  },
  {
    id: "dream-main",
    kicker: "FREE • DREAM",
    title: "꿈 해몽 · 심리",
    desc: "드림 타로와 정신분석 해몽을 메인에서 바로 이어볼 수 있어요.",
    points: ["드림 타로", "정신분석 해몽", "심리 인사이트"],
    image: "/fuctionassets/heamong.webp",
    emoji: "💭",
  },
  {
    id: "fun-saju-rpg",
    kicker: "FUN • SAJU",
    title: "인생 스킬 트리",
    desc: "재미형 사주 콘텐츠인 운명 RPG 스킬 트리를 메인 결과 카드에서 확인하세요.",
    points: ["운명 RPG", "능력치 레벨", "성장 루트 힌트"],
    image: "/fuctionassets/sajurpg.webp",
    emoji: "🎮",
  },
  {
    id: "fun-saju-health",
    kicker: "FUN • SAJU",
    title: "명리 헬스 리포트",
    desc: "사주 건강 시그널 분석도 메인에서 결과와 함께 이어집니다.",
    points: ["오행 균형 체크", "건강 약점 시그널", "생활 루틴 힌트"],
    image: "/fuctionassets/sajuhealth.webp",
    emoji: "🩺",
  },
  {
    id: "fun-saju-prompt",
    kicker: "FUN • SAJU",
    title: "사주 프롬프트",
    desc: "사주 분위기를 AI 이미지 프롬프트로 받는 기능도 메인 동선으로 연결됩니다.",
    points: ["AI 프롬프트 생성", "아바타/초상화 활용", "사주 무드 키워드"],
    image: "/fuctionassets/sajuprompt.webp",
    emoji: "🤖",
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

const root = {
  background: "radial-gradient(1200px 450px at 10% 0%, rgba(34,211,238,0.15), transparent 60%), radial-gradient(900px 380px at 90% 0%, rgba(167,139,250,0.2), transparent 64%), linear-gradient(180deg, rgba(7,11,31,0) 0%, rgba(7,11,31,0.98) 5%, #070b1f 100%)",
  borderTop: "1px solid rgba(124,58,237,0.25)",
  marginTop: "56px",
  padding: "56px 0 34px",
  color: "#94a3b8",
};

const inner = {
  maxWidth: "1180px",
  margin: "0 auto",
  padding: "0 20px",
};

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "16px",
  marginBottom: "32px",
};

export default function SiteFooterHub() {
  return (
    <footer style={root} aria-label="사이트 전체 서비스 허브">
      <div style={inner}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
          <strong
            style={{
              fontSize: "clamp(22px, 3vw, 30px)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              background: "linear-gradient(135deg, #a78bfa, #4ecdc4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            🐷 꿀꿀 만세력
          </strong>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: "999px",
              border: "1px solid rgba(124,58,237,0.5)",
              background: "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(78,205,196,0.2))",
              color: "#d8b4fe",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.04em",
              padding: "4px 10px",
            }}
          >
            전 서비스 무료
          </span>
        </div>

        <p style={{ margin: "0 0 24px", color: "#64748b", lineHeight: 1.7, fontSize: "14px" }}>
          전용 상세 페이지로 분산하지 않고, 모든 기능을 메인에서 바로 실행할 수 있도록 유입 동선을 통일했습니다.
          카드에서 원하는 기능을 고르면 메인 화면으로 이동해 즉시 이어서 이용할 수 있습니다.
        </p>

        <section style={cardGrid} aria-label="메인 유입 기능 카드">
          {FEATURE_CARDS.map((card) => (
            <article
              key={card.id}
              style={{
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid rgba(124,58,237,0.25)",
                background: "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(10,15,31,0.98))",
                boxShadow: "0 10px 24px rgba(2,6,23,0.45)",
              }}
            >
              <div style={{ position: "relative", height: "132px", background: "#0f172a" }}>
                <img
                  src={card.image}
                  alt={`${card.title} 대표 이미지`}
                  loading="lazy"
                  decoding="async"
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.86 }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "10px",
                    background: "rgba(2,6,23,0.75)",
                    border: "1px solid rgba(148,163,184,0.35)",
                    borderRadius: "999px",
                    padding: "3px 9px",
                    color: "#e2e8f0",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                  }}
                >
                  {card.kicker}
                </span>
              </div>

              <div style={{ padding: "14px 14px 12px" }}>
                <h3 style={{ margin: "0 0 8px", color: "#f8fafc", fontSize: "19px", letterSpacing: "-0.01em" }}>
                  <span aria-hidden="true" style={{ marginRight: "6px" }}>{card.emoji}</span>
                  {card.title}
                </h3>
                <p style={{ margin: "0 0 12px", color: "#cbd5e1", fontSize: "13px", lineHeight: 1.6 }}>{card.desc}</p>

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                  {card.points.map((point) => (
                    <span
                      key={point}
                      style={{
                        fontSize: "11px",
                        color: "#c4b5fd",
                        border: "1px solid rgba(124,58,237,0.35)",
                        background: "rgba(30,27,75,0.55)",
                        borderRadius: "999px",
                        padding: "3px 8px",
                      }}
                    >
                      {point}
                    </span>
                  ))}
                </div>

                <a
                  href={`${MAIN_ENTRY}?from=footer-${card.id}#feature-card-grid`}
                  aria-label={`${card.title} 메인에서 실행`}
                  style={{
                    display: "inline-flex",
                    width: "100%",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: "11px",
                    padding: "10px 12px",
                    textDecoration: "none",
                    background: "linear-gradient(90deg, #f97316, #22c55e)",
                    color: "#08111d",
                    fontWeight: 800,
                    fontSize: "14px",
                  }}
                >
                  메인에서 바로 실행
                </a>
              </div>
            </article>
          ))}
        </section>

        <div style={{ borderTop: "1px solid rgba(124,58,237,0.2)", paddingTop: "18px", marginBottom: "16px" }}>
          <div style={{ color: "#4ecdc4", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", marginBottom: "10px" }}>
            📖 운세 인사이트 아카이브
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {INSIGHT_LINKS.map((item) => (
              <a
                key={item.href}
                href={`${ORIGIN}${item.href}`}
                style={{
                  textDecoration: "none",
                  color: "#94a3b8",
                  fontSize: "12px",
                  padding: "5px 10px",
                  borderRadius: "7px",
                  background: "rgba(30,41,59,0.8)",
                  border: "1px solid rgba(51,65,85,0.8)",
                }}
              >
                {item.text}
              </a>
            ))}
            <a
              href={`${ORIGIN}/insights`}
              style={{
                textDecoration: "none",
                color: "#a78bfa",
                fontSize: "12px",
                padding: "5px 10px",
                borderRadius: "7px",
                border: "1px solid rgba(124,58,237,0.45)",
                background: "rgba(76,29,149,0.24)",
              }}
            >
              전체 보기 →
            </a>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(124,58,237,0.2)", paddingTop: "16px" }}>
          <nav aria-label="정책 페이지" style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", justifyContent: "center", marginBottom: "14px" }}>
            {POLICY_LINKS.map((item) => (
              <a key={item.href} href={`${ORIGIN}${item.href}`} style={{ textDecoration: "none", color: "#64748b", fontSize: "12px" }}>
                {item.text}
              </a>
            ))}
          </nav>
          <p style={{ textAlign: "center", margin: 0, color: "#475569", fontSize: "12px", lineHeight: 1.7 }}>
            © 2026 Code Destiny. All rights reserved. · 꿀꿀 만세력 무료 사주 · 타로 · 운세 플랫폼
          </p>
        </div>
      </div>
    </footer>
  );
}
