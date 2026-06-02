import Link from "next/link";

export const metadata = {
  title: "404 | Code Destiny",
  description: "The requested page could not be found.",
  robots: {
    index: false,
    follow: true,
  },
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
          ERROR 404
        </p>
        <h1 style={{ margin: "8px 0 10px", color: "#f8fafc", fontSize: "2.25rem", lineHeight: 1.2 }}>
          Page Not Found
        </h1>
        <p style={{ margin: "0 auto", maxWidth: "520px", lineHeight: 1.7, color: "#cbd5e1" }}>
          This page is unavailable. Return home or open the payment page.
        </p>
        <div style={{ marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
          <Link
            href="/"
            style={{
              borderRadius: "999px",
              background: "#f8fafc",
              color: "#0f172a",
              fontWeight: 800,
              padding: "10px 18px",
              textDecoration: "none",
            }}
          >
            Home
          </Link>
          <Link
            href="/points"
            style={{
              borderRadius: "999px",
              background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
              color: "#fff",
              fontWeight: 800,
              padding: "10px 18px",
              textDecoration: "none",
            }}
          >
            Payments
          </Link>
        </div>
      </section>
    </main>
  );
}
