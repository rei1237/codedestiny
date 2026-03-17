export const metadata = {
  title: "Code Destiny | Gratis tarot & fortune (Nederland)",
  description:
    "Code Destiny biedt gratis tarot-ervaringen en fortune-inzichten. Deze pagina is gericht op Nederland (nl-NL) om regionale SEO-signalen te versterken.",
  alternates: {
    canonical: "/nl-nl",
  },
  openGraph: {
    title: "Code Destiny | Gratis tarot & fortune (Nederland)",
    description: "Gratis tarot-ervaringen en fortune-inzichten voor Nederland (nl-NL).",
    url: "https://code-destiny.com/nl-nl",
    siteName: "Code Destiny",
    type: "website",
  },
};

export default function NlNlLanding() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 16px 52px", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "34px", fontWeight: 800, marginBottom: "10px" }}>
        Code Destiny — Tarot & Fortune (Nederland)
      </h1>
      <p style={{ opacity: 0.9, lineHeight: 1.75, marginBottom: "18px" }}>
        Ontdek tarot healing-ervaringen en fortune-inzichten. Deze pagina is gericht op Nederland (nl-NL) om zoekmachines
        te helpen taal- en regiovoorkeuren beter te begrijpen.
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
        <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>Beleid & Support</h2>
        <nav style={{ display: "flex", gap: "12px", flexWrap: "wrap" }} aria-label="Beleid en contact">
          <a href="/privacy-policy" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Privacybeleid
          </a>
          <a href="/terms-of-service" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Gebruiksvoorwaarden
          </a>
          <a href="/contact-us" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Contact
          </a>
        </nav>
      </section>
    </main>
  );
}

