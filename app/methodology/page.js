import { generatePageMetadata } from "../../lib/generate-page-metadata";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/methodology",
    title: "무료 사주 · 자미두수 운세 분석 콘텐츠 방법론 | CODE DESTINY",
    description:
      "CODE DESTINY 인사이트의 작성 원칙, 자료 검증 방식, 업데이트 정책, 면책 고지를 안내합니다.",
    keywords: [
      "Code Destiny 방법론",
      "운세 콘텐츠 작성 기준",
      "사주 타로 면책 고지",
      "E-E-A-T",
      "콘텐츠 검증",
    ],
  });
}

export default function MethodologyPage() {
  return (
    <main className="method-root">
      <div className="method-nebula method-nebula--left" aria-hidden />
      <div className="method-nebula method-nebula--right" aria-hidden />
      <div className="method-stars method-stars--near" aria-hidden />
      <div className="method-stars method-stars--far" aria-hidden />

      <header className="method-hero">
        <p className="method-kicker">Editorial Constellation Protocol</p>
        <h1 className="method-title">무료 사주 · 자미두수 운세 분석 콘텐츠 방법론 및 면책 고지</h1>
        <p className="method-intro">
          CODE DESTINY 인사이트 콘텐츠가 어떤 기준으로 작성되고 어떻게 갱신되는지,
          그리고 결과 해석을 안전하게 활용하기 위한 핵심 원칙을 안내합니다.
        </p>
      </header>

      <section className="method-grid" aria-label="콘텐츠 방법론 상세 항목">
        <article className="method-card">
          <p className="method-step">01</p>
          <h2>1) 작성 원칙</h2>
          <ul className="method-list">
            <li>사주, 타로, 점성술, 자미두수 등 전통 해석 체계를 교차 검토해 핵심 맥락을 정리합니다.</li>
            <li>결과 텍스트는 오락성만 강조하지 않고 실생활 의사결정에 도움이 되는 실행 포인트를 포함합니다.</li>
            <li>각 아티클에는 작성자, 최종 수정일, 참고자료(있는 경우)를 함께 제공합니다.</li>
          </ul>
        </article>

        <article className="method-card">
          <p className="method-step">02</p>
          <h2>2) 자료 검증 및 업데이트</h2>
          <ul className="method-list">
            <li>콘텐츠는 내부 편집 가이드에 따라 초안 작성 후 문장 명확성, 해석 일관성, 과장 표현 여부를 검토합니다.</li>
            <li>핵심 아티클은 주기적으로 재검토하며 변경 시 최종 수정일을 갱신합니다.</li>
            <li>서비스 정책 변경이나 사용자 피드백이 누적되면 설명 문구와 안내 문서를 즉시 보완합니다.</li>
          </ul>
        </article>

        <article className="method-card">
          <p className="method-step">03</p>
          <h2>3) 면책 고지</h2>
          <p className="method-copy">
            본 서비스의 운세, 사주, 타로, 점성술 콘텐츠는 자기성찰과 참고를 위한 정보이며,
            법률, 세무, 의료, 투자 자문을 대체하지 않습니다. 중요한 결정은 반드시 해당 분야의
            전문 자격을 갖춘 전문가와 상담한 뒤 진행하시기 바랍니다.
          </p>
        </article>

        <article className="method-card">
          <p className="method-step">04</p>
          <h2>4) 문의 및 정정 요청</h2>
          <p className="method-copy">
            콘텐츠 오류, 표현 정정, 출처 보완 요청은 문의 페이지를 통해 접수할 수 있습니다.
            확인 후 필요한 경우 수정 이력을 반영합니다.
          </p>
          <p className="method-copy method-copy--compact">
            문의: <a className="method-link" href="/contact-us">/contact-us</a>
          </p>
        </article>
      </section>

      <style jsx>{`
        .method-root {
          position: relative;
          width: min(1080px, calc(100% - 28px));
          margin: 22px auto 50px;
          border-radius: 30px;
          border: 1px solid rgba(109, 147, 255, 0.27);
          background:
            linear-gradient(160deg, rgba(5, 15, 38, 0.94), rgba(6, 18, 44, 0.9)),
            linear-gradient(180deg, rgba(255, 218, 146, 0.04), rgba(136, 166, 255, 0.06));
          color: #d8e2ff;
          overflow: hidden;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.35);
          padding: 30px clamp(16px, 3.2vw, 34px) 32px;
        }

        .method-nebula {
          position: absolute;
          pointer-events: none;
          border-radius: 999px;
          filter: blur(52px);
          opacity: 0.5;
        }

        .method-nebula--left {
          width: 300px;
          height: 300px;
          left: -100px;
          top: -86px;
          background: radial-gradient(circle, rgba(128, 183, 255, 0.65), rgba(128, 183, 255, 0));
        }

        .method-nebula--right {
          width: 330px;
          height: 330px;
          right: -130px;
          bottom: -140px;
          background: radial-gradient(circle, rgba(255, 208, 140, 0.56), rgba(255, 208, 140, 0));
        }

        .method-stars {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-repeat: repeat;
          animation: methodDrift 20s ease-in-out infinite;
        }

        .method-stars--near {
          opacity: 0.36;
          background-image:
            radial-gradient(1.9px 1.9px at 28px 36px, rgba(255, 255, 255, 0.82), transparent),
            radial-gradient(1.5px 1.5px at 170px 84px, rgba(201, 223, 255, 0.82), transparent),
            radial-gradient(1.6px 1.6px at 236px 180px, rgba(255, 230, 192, 0.88), transparent);
          background-size: 240px 220px;
        }

        .method-stars--far {
          opacity: 0.2;
          background-image:
            radial-gradient(1.1px 1.1px at 56px 20px, rgba(255, 255, 255, 0.68), transparent),
            radial-gradient(1px 1px at 150px 130px, rgba(196, 215, 255, 0.64), transparent),
            radial-gradient(1.2px 1.2px at 300px 150px, rgba(255, 222, 170, 0.65), transparent);
          background-size: 340px 300px;
          animation-duration: 30s;
        }

        .method-hero {
          position: relative;
          z-index: 1;
          max-width: 840px;
          margin-bottom: 18px;
        }

        .method-kicker {
          margin: 0;
          color: #a4beff;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.17em;
          text-transform: uppercase;
        }

        .method-title {
          margin: 8px 0 0;
          color: #fff5de;
          line-height: 1.32;
          font-size: clamp(1.36rem, 2.6vw, 2rem);
          font-family: "Noto Serif KR", "Iowan Old Style", "Times New Roman", serif;
          text-wrap: balance;
        }

        .method-intro {
          margin: 12px 0 0;
          line-height: 1.82;
          color: #b9c9ee;
          max-width: 780px;
          word-break: keep-all;
        }

        .method-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .method-card {
          border-radius: 20px;
          border: 1px solid rgba(144, 175, 255, 0.33);
          background:
            linear-gradient(155deg, rgba(7, 20, 46, 0.86), rgba(8, 25, 54, 0.68)),
            linear-gradient(150deg, rgba(255, 219, 150, 0.06), rgba(112, 152, 255, 0.06));
          padding: 18px;
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.28);
          backdrop-filter: blur(6px);
          opacity: 0;
          transform: translateY(8px);
          animation: methodRise 0.7s ease forwards;
        }

        .method-card:nth-child(2) {
          animation-delay: 0.08s;
        }

        .method-card:nth-child(3) {
          animation-delay: 0.16s;
        }

        .method-card:nth-child(4) {
          animation-delay: 0.24s;
        }

        .method-step {
          margin: 0;
          font-size: 11px;
          letter-spacing: 0.14em;
          font-weight: 700;
          color: #a8c0ff;
        }

        .method-card h2 {
          margin: 6px 0 0;
          color: #fff4d8;
          font-size: 1.08rem;
          line-height: 1.45;
        }

        .method-list {
          margin: 12px 0 0;
          padding-left: 20px;
          line-height: 1.82;
          color: #dbe6ff;
        }

        .method-list li + li {
          margin-top: 6px;
        }

        .method-copy {
          margin: 12px 0 0;
          line-height: 1.82;
          color: #dbe6ff;
        }

        .method-copy--compact {
          margin-top: 10px;
        }

        .method-link {
          color: #ffe1a5;
          text-decoration: none;
          border-bottom: 1px solid rgba(255, 225, 165, 0.44);
          transition: color 0.2s ease, border-color 0.2s ease;
        }

        .method-link:hover,
        .method-link:focus-visible {
          color: #fff3cf;
          border-color: rgba(255, 243, 207, 0.66);
        }

        @media (max-width: 900px) {
          .method-root {
            width: calc(100% - 20px);
            margin-top: 16px;
            border-radius: 24px;
            padding: 22px 14px 24px;
          }

          .method-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .method-card {
            padding: 16px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .method-stars,
          .method-card {
            animation: none;
            transform: none;
            opacity: 1;
          }
        }

        @keyframes methodDrift {
          0% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(-32px, -22px, 0);
          }

          100% {
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes methodRise {
          from {
            opacity: 0;
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
