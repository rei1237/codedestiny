export default function Custom500() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: "24px",
      background: "#020617",
      color: "#f8fafc",
      textAlign: "center",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    }}>
      <section style={{
        width: "100%",
        maxWidth: "560px",
        border: "1px solid rgba(148, 163, 184, 0.28)",
        borderRadius: "18px",
        padding: "28px 20px",
        background: "linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.9))",
        boxShadow: "0 24px 72px rgba(0, 0, 0, 0.45)",
      }}>
        <p style={{ margin: 0, color: "#fbbf24", fontWeight: 800, letterSpacing: "0.08em" }}>
          ERROR 500
        </p>
        <h1 style={{ margin: "10px 0 8px", fontSize: "2rem", lineHeight: 1.2 }}>
          Service temporarily unavailable
        </h1>
        <p style={{ margin: "0 auto 18px", color: "#cbd5e1", lineHeight: 1.7 }}>
          Please return to Code Destiny and try again.
        </p>
        <a href="/" style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "42px",
          padding: "0 18px",
          borderRadius: "999px",
          background: "#f8fafc",
          color: "#0f172a",
          fontWeight: 800,
          textDecoration: "none",
        }}>
          Go home
        </a>
      </section>
    </main>
  );
}
