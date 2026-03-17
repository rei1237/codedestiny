export const metadata = {
  title: "Code Destiny | Free Tarot & Fortune (India)",
  description:
    "Code Destiny offers free tarot experiences and fortune insights. This page is tailored for India (en-IN) to strengthen regional SEO signals.",
  alternates: {
    canonical: "/en-in",
  },
  openGraph: {
    title: "Code Destiny | Free Tarot & Fortune (India)",
    description: "Free tarot experiences and fortune insights for India (en-IN).",
    url: "https://code-destiny.com/en-in",
    siteName: "Code Destiny",
    type: "website",
  },
};

export default function EnInLanding() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 16px 52px", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "34px", fontWeight: 800, marginBottom: "10px" }}>
        Code Destiny — Free Tarot & Fortune (India)
      </h1>
      <p style={{ opacity: 0.9, lineHeight: 1.75, marginBottom: "18px" }}>
        Explore tarot healing experiences and fortune insights. This page is tailored for India (en-IN) to help search
        engines understand language and regional intent.
      </p>

      <section style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
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
            fontWeight: 700,
          }}
        >
          Start Tarot Healing Experience
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
            fontWeight: 700,
          }}
        >
          Destiny Points
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
        <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>Policies & Support</h2>
        <nav style={{ display: "flex", gap: "12px", flexWrap: "wrap" }} aria-label="Policies and contact">
          <a href="/privacy-policy" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Privacy Policy
          </a>
          <a href="/terms-of-service" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Terms of Service
          </a>
          <a href="/contact-us" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Contact Us
          </a>
        </nav>
      </section>
    </main>
  );
}

