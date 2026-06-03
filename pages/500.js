export default function ServerErrorPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#080716", color: "#f8fafc", padding: 24 }}>
      <section style={{ maxWidth: 560, border: "1px solid rgba(255,255,255,0.14)", borderRadius: 24, padding: 28, background: "rgba(255,255,255,0.05)" }}>
        <p style={{ margin: 0, color: "#fde68a", fontWeight: 700 }}>Code Destiny</p>
        <h1 style={{ margin: "12px 0 0", fontSize: 32 }}>잠시 흐름을 정리하고 있습니다</h1>
        <p style={{ margin: "16px 0 0", lineHeight: 1.8, color: "#cbd5e1" }}>
          일시적으로 페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <a href="/" style={{ display: "inline-flex", marginTop: 24, color: "#111827", background: "#fde68a", borderRadius: 999, padding: "12px 18px", fontWeight: 800, textDecoration: "none" }}>
          홈으로 돌아가기
        </a>
      </section>
    </main>
  );
}
