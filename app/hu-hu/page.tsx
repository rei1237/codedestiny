export const metadata = {
  title: "Code Destiny | Ingyenes tarot és szerencse (Magyarország)",
  description:
    "A Code Destiny ingyenes tarot élményeket és fortune tartalmakat kínál. Ez az oldal Magyarországra (hu-HU) optimalizált a regionális SEO jelek erősítéséhez.",
  alternates: {
    canonical: "/hu-hu",
  },
  openGraph: {
    title: "Code Destiny | Ingyenes tarot és szerencse (Magyarország)",
    description: "Ingyenes tarot élmények és fortune tartalmak Magyarországon (hu-HU).",
    url: "https://code-destiny.com/hu-hu",
    siteName: "Code Destiny",
    type: "website",
  },
};

export default function HuHuLanding() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 16px 52px", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "34px", fontWeight: 800, marginBottom: "10px" }}>
        Code Destiny — Tarot & Fortune (Magyarország)
      </h1>
      <p style={{ opacity: 0.9, lineHeight: 1.75, marginBottom: "18px" }}>
        Fedezd fel a tarot healing élményeket és a fortune tartalmakat. Ez az oldal Magyarországra (hu-HU) optimalizált,
        hogy a keresőmotorok jobban megértsék a nyelvi és regionális szándékot.
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
          Tarot healing indítása
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
        <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>Irányelvek & Támogatás</h2>
        <nav style={{ display: "flex", gap: "12px", flexWrap: "wrap" }} aria-label="Irányelvek és kapcsolat">
          <a href="/privacy-policy" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Adatvédelem
          </a>
          <a href="/terms-of-service" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Felhasználási feltételek
          </a>
          <a href="/contact-us" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Kapcsolat
          </a>
        </nav>
      </section>
    </main>
  );
}

