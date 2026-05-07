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

export default function SiteFooterHub() {
  return (
    <footer className="sfh-root" aria-label="서비스 하단 정책 정보">
      <div className="sfh-nebula sfh-nebula--left" aria-hidden />
      <div className="sfh-nebula sfh-nebula--right" aria-hidden />
      <div className="sfh-stars sfh-stars--near" aria-hidden />
      <div className="sfh-stars sfh-stars--far" aria-hidden />

      <div className="sfh-shell">
        <section aria-label="랜딩 페이지 내부 링크 허브">
          <p className="sfh-kicker">Constellation Navigation</p>
          <p className="sfh-title">서비스 링크 허브</p>
          <p className="sfh-subtitle">
            주요 운세와 랜딩 페이지를 성좌 지도로 재배열해 탐색 흐름과 검색 신호를 함께 강화했습니다.
          </p>

          <div className="sfh-group-grid">
            {SEO_LINK_GROUPS.map((group) => (
              <section key={group.title} className="sfh-card" aria-label={group.title}>
                <h2 className="sfh-group-title">{group.title}</h2>
                <nav className="sfh-link-nav" aria-label={`${group.title} 링크`}>
                  {group.links.map((link) => (
                    <a key={link.href} href={link.href} className="sfh-link">
                      {link.text}
                    </a>
                  ))}
                </nav>
              </section>
            ))}
          </div>
        </section>

        <nav aria-label="정책 및 안내 링크" className="sfh-policy-nav">
          {POLICY_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="sfh-policy-link">
              {link.text}
            </a>
          ))}
        </nav>

        <p className="sfh-copyright">
          © 2026 Code Destiny. All rights reserved.
        </p>
      </div>

      <style jsx>{`
        .sfh-root {
          position: relative;
          margin-top: 42px;
          border-top: 1px solid rgba(117, 156, 255, 0.26);
          background: linear-gradient(180deg, #010714 0%, #07142f 42%, #081a32 100%);
          overflow: hidden;
        }

        .sfh-nebula {
          position: absolute;
          width: 360px;
          height: 360px;
          border-radius: 999px;
          filter: blur(48px);
          opacity: 0.52;
          pointer-events: none;
        }

        .sfh-nebula--left {
          left: -110px;
          top: -130px;
          background: radial-gradient(circle, rgba(105, 170, 255, 0.58), rgba(105, 170, 255, 0));
        }

        .sfh-nebula--right {
          right: -150px;
          bottom: -150px;
          background: radial-gradient(circle, rgba(255, 205, 134, 0.5), rgba(255, 205, 134, 0));
        }

        .sfh-stars {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-repeat: repeat;
          animation: sfhDrift 16s ease-in-out infinite;
        }

        .sfh-stars--near {
          opacity: 0.45;
          background-image:
            radial-gradient(2px 2px at 20px 30px, rgba(255, 255, 255, 0.75), transparent),
            radial-gradient(1.7px 1.7px at 130px 80px, rgba(255, 236, 196, 0.85), transparent),
            radial-gradient(1.8px 1.8px at 190px 160px, rgba(199, 224, 255, 0.8), transparent);
          background-size: 230px 220px;
        }

        .sfh-stars--far {
          opacity: 0.22;
          background-image:
            radial-gradient(1.2px 1.2px at 70px 40px, rgba(255, 255, 255, 0.7), transparent),
            radial-gradient(1px 1px at 190px 120px, rgba(196, 214, 255, 0.7), transparent),
            radial-gradient(1.1px 1.1px at 260px 170px, rgba(255, 220, 176, 0.78), transparent);
          background-size: 320px 300px;
          animation-duration: 24s;
        }

        .sfh-shell {
          position: relative;
          z-index: 1;
          width: min(1180px, calc(100% - 30px));
          margin: 0 auto;
          padding: 24px 0 18px;
          color: #cfddff;
          font-size: 12px;
        }

        .sfh-kicker {
          margin: 0;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #99b8ff;
        }

        .sfh-title {
          margin: 7px 0 0;
          font-size: clamp(1rem, 1.8vw, 1.18rem);
          line-height: 1.3;
          color: #fdf7eb;
          font-weight: 700;
          font-family: "Noto Serif KR", "Iowan Old Style", "Times New Roman", serif;
        }

        .sfh-subtitle {
          margin: 7px 0 0;
          color: #adc1ec;
          font-size: 12px;
          line-height: 1.65;
          max-width: 880px;
        }

        .sfh-group-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }

        .sfh-card {
          border: 1px solid rgba(151, 179, 255, 0.3);
          border-radius: 14px;
          background:
            linear-gradient(150deg, rgba(8, 22, 52, 0.74), rgba(8, 26, 56, 0.55) 68%),
            linear-gradient(120deg, rgba(255, 216, 150, 0.08), rgba(133, 169, 255, 0.07));
          backdrop-filter: blur(6px);
          padding: 12px 12px 10px;
          box-shadow: 0 10px 24px rgba(2, 8, 24, 0.32);
          opacity: 0;
          transform: translateY(10px);
          animation: sfhRise 0.72s ease forwards;
        }

        .sfh-card:nth-child(2) {
          animation-delay: 0.08s;
        }

        .sfh-card:nth-child(3) {
          animation-delay: 0.16s;
        }

        .sfh-card:nth-child(4) {
          animation-delay: 0.24s;
        }

        .sfh-card:hover {
          border-color: rgba(255, 228, 174, 0.46);
          transform: translateY(-3px);
          transition: transform 0.24s ease, border-color 0.24s ease;
        }

        .sfh-group-title {
          margin: 0 0 8px;
          color: #f5efe3;
          font-size: 12.5px;
          font-weight: 700;
        }

        .sfh-link-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 12px;
        }

        .sfh-link {
          color: #d7e4ff;
          text-decoration: none;
          font-size: 12px;
          line-height: 1.52;
          transition: color 0.2s ease;
        }

        .sfh-link:hover,
        .sfh-link:focus-visible {
          color: #ffe5af;
        }

        .sfh-policy-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 12px;
          margin-top: 13px;
          padding-top: 12px;
          border-top: 1px solid rgba(125, 151, 207, 0.28);
        }

        .sfh-policy-link {
          color: #b6c8fb;
          text-decoration: none;
          font-size: 12px;
          line-height: 1.55;
          transition: color 0.2s ease;
        }

        .sfh-policy-link:hover,
        .sfh-policy-link:focus-visible {
          color: #ffe5af;
        }

        .sfh-copyright {
          margin: 14px 0 0;
          width: 100%;
          text-align: center;
          color: #7e93c6;
          font-size: 12px;
        }

        @media (max-width: 780px) {
          .sfh-shell {
            width: calc(100% - 22px);
            padding: 18px 0 16px;
          }

          .sfh-group-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .sfh-policy-nav {
            gap: 7px 10px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sfh-stars,
          .sfh-card {
            animation: none;
            transform: none;
            opacity: 1;
          }

          .sfh-card:hover {
            transform: none;
          }
        }

        @keyframes sfhDrift {
          0% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(-38px, -24px, 0);
          }

          100% {
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes sfhRise {
          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </footer>
  );
}
