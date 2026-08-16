const NOT_FOUND_I18N = {
  ko: {
    metadata: {
      title: "페이지를 찾을 수 없습니다 | Code Destiny",
      description: "요청한 페이지를 찾을 수 없습니다. Code Destiny의 공개 운세 가이드와 주요 서비스로 이동할 수 있습니다.",
    },
    eyebrow: "ERROR 404",
    title: "페이지를 찾을 수 없습니다",
    description: "주소가 바뀌었거나 아직 공개되지 않은 페이지일 수 있습니다. 아래 링크에서 가까운 운세 가이드와 인사이트를 확인해 주세요.",
    links: {
      insights: "운세 인사이트 허브",
      sajuGuide: "사주 명리학 기본 가이드",
      tarotGuide: "타로 리딩 입문",
      faq: "자주 묻는 질문",
    },
    home: "홈으로 돌아가기",
    freeSaju: "무료 사주 분석 보기",
  },
};

export const metadata = {
  ...NOT_FOUND_I18N.ko.metadata,
  robots: {
    index: false,
    follow: true,
  },
};

const quickLinks = [
  { href: "/insights/", key: "errors.notFound.links.insights", fallback: NOT_FOUND_I18N.ko.links.insights },
  { href: "/saju/guide/", key: "errors.notFound.links.sajuGuide", fallback: NOT_FOUND_I18N.ko.links.sajuGuide },
  { href: "/tarot/guide/", key: "errors.notFound.links.tarotGuide", fallback: NOT_FOUND_I18N.ko.links.tarotGuide },
  { href: "/faq/", key: "errors.notFound.links.faq", fallback: NOT_FOUND_I18N.ko.links.faq },
];

const linkStyle = {
  border: "1px solid rgba(251,191,36,0.32)",
  borderRadius: "14px",
  background: "rgba(251,191,36,0.08)",
  color: "#fde68a",
  fontWeight: 800,
  padding: "12px 14px",
  textDecoration: "none",
};

const actionStyle = {
  borderRadius: "999px",
  fontWeight: 800,
  padding: "10px 18px",
  textDecoration: "none",
};

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "calc(100vh - 200px)",
        display: "grid",
        placeItems: "center",
        padding: "32px 16px 56px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "760px",
          border: "1px solid rgba(148,163,184,0.32)",
          borderRadius: "20px",
          background: "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(30,41,59,0.92))",
          boxShadow: "0 28px 60px rgba(2,6,23,0.42)",
          color: "#e2e8f0",
          padding: "32px 20px",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, color: "#94a3b8", fontWeight: 700, letterSpacing: "0.08em", fontSize: "0.78rem" }}>
          <span data-cd-trans data-key="errors.notFound.eyebrow">{NOT_FOUND_I18N.ko.eyebrow}</span>
        </p>
        <h1 style={{ margin: "8px 0 10px", color: "#f8fafc", fontSize: "2.25rem", lineHeight: 1.2 }}>
          <span data-cd-trans data-key="errors.notFound.title">{NOT_FOUND_I18N.ko.title}</span>
        </h1>
        <p style={{ margin: "0 auto", maxWidth: "520px", lineHeight: 1.7, color: "#cbd5e1" }}>
          <span data-cd-trans data-key="errors.notFound.description">{NOT_FOUND_I18N.ko.description}</span>
        </p>
        <div style={{ margin: "22px auto 0", display: "grid", gap: "10px", maxWidth: "520px" }}>
          {quickLinks.map((item) => (
            <a key={item.href} href={item.href} style={linkStyle}>
              <span data-cd-trans data-key={item.key}>{item.fallback}</span>
            </a>
          ))}
        </div>
        <div style={{ marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
          <a
            href="/"
            style={{
              ...actionStyle,
              background: "#f8fafc",
              color: "#0f172a",
            }}
          >
            <span data-cd-trans data-key="errors.notFound.home">{NOT_FOUND_I18N.ko.home}</span>
          </a>
          <a
            href="/saju/basic/"
            style={{
              ...actionStyle,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#111827",
            }}
          >
            <span data-cd-trans data-key="errors.notFound.freeSaju">{NOT_FOUND_I18N.ko.freeSaju}</span>
          </a>
        </div>
      </section>
    </main>
  );
}
