export default function Home() {
  const faqJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Code Destiny는 무료인가요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "네. 무료로 이용할 수 있는 콘텐츠를 제공하며, 일부 기능은 포인트가 필요할 수 있습니다.",
        },
      },
      {
        "@type": "Question",
        name: "타로 힐링 경험은 무엇인가요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "4장의 카드로 현재 상태를 정리하고 다음 행동을 제안하는 가이드형 타로 경험입니다.",
        },
      },
      {
        "@type": "Question",
        name: "회원가입이 필요하나요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "대부분의 페이지는 바로 이용할 수 있고, 계정/포인트 관련 기능에서는 로그인이 필요할 수 있습니다.",
        },
      },
    ],
  });

  return (
    <main style={{ maxWidth: "980px", margin: "0 auto", padding: "34px 16px 60px", color: "#e2e8f0" }}>
      <header style={{ marginBottom: "18px" }}>
        <p style={{ letterSpacing: "0.32em", fontSize: "12px", opacity: 0.75, fontWeight: 800 }}>CODE DESTINY</p>
        <h1 style={{ fontSize: "38px", fontWeight: 900, margin: "10px 0 10px" }}>
          무료 사주 · 타로 · 운세 콘텐츠
        </h1>
        <p style={{ opacity: 0.9, lineHeight: 1.75, margin: 0 }}>
          Code Destiny는 사주/타로/운세 경험을 제공하는 서비스입니다. 이 페이지는 검색엔진이 사이트의 대표 URL과 다국어/다지역
          대체 페이지(hreflang)를 명확히 이해하도록 구성된 SEO 랜딩입니다.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gap: "10px",
          marginBottom: "18px",
        }}
      >
        <a
          href="/tarot/healing"
          style={{
            display: "block",
            padding: "14px 16px",
            borderRadius: "14px",
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(148, 163, 184, 0.25)",
            color: "#e2e8f0",
            textDecoration: "none",
            fontWeight: 800,
          }}
        >
          타로 힐링 경험 시작하기
        </a>
        <a
          href="/points"
          style={{
            display: "block",
            padding: "14px 16px",
            borderRadius: "14px",
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(148, 163, 184, 0.25)",
            color: "#e2e8f0",
            textDecoration: "none",
            fontWeight: 800,
          }}
        >
          Destiny Points
        </a>
        <a
          href="/index.html"
          style={{
            display: "block",
            padding: "14px 16px",
            borderRadius: "14px",
            background: "linear-gradient(90deg, rgba(30, 64, 175, 0.9), rgba(37, 99, 235, 0.92))",
            border: "1px solid rgba(96, 165, 250, 0.45)",
            color: "#eff6ff",
            textDecoration: "none",
            fontWeight: 900,
          }}
        >
          전체 서비스(웹앱) 열기
        </a>
      </section>

      <section
        style={{
          background: "rgba(2, 6, 23, 0.55)",
          border: "1px solid rgba(148, 163, 184, 0.18)",
          borderRadius: "14px",
          padding: "16px",
        }}
      >
        <h2 style={{ fontSize: "18px", fontWeight: 900, marginBottom: "8px" }}>국가/언어별 페이지</h2>
        <p style={{ opacity: 0.9, lineHeight: 1.75, marginBottom: "10px" }}>
          프랑스·미국·중국·유럽·동남아·호주·캐나다 등 국가별 SEO 강화를 위해 지역 랜딩을 제공합니다.
        </p>
        <nav style={{ display: "flex", gap: "10px", flexWrap: "wrap" }} aria-label="Locale landings">
          <a href="/en-us" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            United States (en-US)
          </a>
          <a href="/fr-fr" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            France (fr-FR)
          </a>
          <a href="/zh-cn" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            China (zh-CN)
          </a>
          <a href="/zh-tw" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Taiwan (zh-TW)
          </a>
          <a href="/ja-jp" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Japan (ja-JP)
          </a>
          <a href="/en-ca" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Canada (en-CA)
          </a>
          <a href="/fr-ca" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Canada (fr-CA)
          </a>
          <a href="/en-sg" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Singapore (en-SG)
          </a>
          <a href="/vi-vn" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Vietnam (vi-VN)
          </a>
          <a href="/th-th" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Thailand (th-TH)
          </a>
        </nav>
      </section>

      <section
        style={{
          marginTop: "18px",
          background: "rgba(2, 6, 23, 0.55)",
          border: "1px solid rgba(148, 163, 184, 0.18)",
          borderRadius: "14px",
          padding: "16px",
        }}
        aria-label="FAQ"
      >
        <h2 style={{ fontSize: "18px", fontWeight: 900, marginBottom: "10px" }}>FAQ</h2>
        <details
          style={{
            borderRadius: "12px",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            padding: "10px 12px",
            background: "rgba(15, 23, 42, 0.55)",
            marginBottom: "10px",
          }}
        >
          <summary style={{ cursor: "pointer", fontWeight: 800, color: "#e2e8f0" }}>Code Destiny는 무료인가요?</summary>
          <p style={{ marginTop: "8px", lineHeight: 1.75, opacity: 0.92 }}>
            네. 무료로 이용할 수 있는 콘텐츠를 제공하며, 일부 기능은 포인트가 필요할 수 있습니다.
          </p>
        </details>
        <details
          style={{
            borderRadius: "12px",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            padding: "10px 12px",
            background: "rgba(15, 23, 42, 0.55)",
            marginBottom: "10px",
          }}
        >
          <summary style={{ cursor: "pointer", fontWeight: 800, color: "#e2e8f0" }}>타로 힐링 경험은 무엇인가요?</summary>
          <p style={{ marginTop: "8px", lineHeight: 1.75, opacity: 0.92 }}>
            4장의 카드로 현재 상태를 정리하고 다음 행동을 제안하는 가이드형 타로 경험입니다.
          </p>
        </details>
        <details
          style={{
            borderRadius: "12px",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            padding: "10px 12px",
            background: "rgba(15, 23, 42, 0.55)",
          }}
        >
          <summary style={{ cursor: "pointer", fontWeight: 800, color: "#e2e8f0" }}>회원가입이 필요하나요?</summary>
          <p style={{ marginTop: "8px", lineHeight: 1.75, opacity: 0.92 }}>
            대부분의 페이지는 바로 이용할 수 있고, 계정/포인트 관련 기능에서는 로그인이 필요할 수 있습니다.
          </p>
        </details>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      </section>
    </main>
  );
}
