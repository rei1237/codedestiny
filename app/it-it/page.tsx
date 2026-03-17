export const metadata = {
  title: "Code Destiny | Tarot e fortuna gratis (Italia)",
  description:
    "Code Destiny offre esperienze di tarot e contenuti di fortuna gratuiti. Questa pagina è pensata per l'Italia (it-IT) per rafforzare i segnali SEO regionali.",
  alternates: {
    canonical: "/it-it",
  },
  openGraph: {
    title: "Code Destiny | Tarot e fortuna gratis (Italia)",
    description: "Esperienze di tarot e contenuti di fortuna gratuiti per l'Italia (it-IT).",
    url: "https://code-destiny.com/it-it",
    siteName: "Code Destiny",
    type: "website",
  },
};

export default function ItItLanding() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 16px 52px", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "34px", fontWeight: 800, marginBottom: "10px" }}>
        Code Destiny — Tarot & Fortuna (Italia)
      </h1>
      <p style={{ opacity: 0.9, lineHeight: 1.75, marginBottom: "18px" }}>
        Scopri esperienze di tarot healing e contenuti di fortuna. Questa pagina è ottimizzata per l'Italia (it-IT) per
        aiutare i motori di ricerca a comprendere lingua e intento regionale.
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
          Inizia l’esperienza Tarot Healing
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
        <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>Policy & Supporto</h2>
        <nav style={{ display: "flex", gap: "12px", flexWrap: "wrap" }} aria-label="Policy e contatto">
          <a href="/privacy-policy" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Privacy
          </a>
          <a href="/terms-of-service" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Termini di servizio
          </a>
          <a href="/contact-us" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Contatti
          </a>
        </nav>
      </section>
    </main>
  );
}

