export const metadata = {
  title: "Code Destiny | Tarot, fortune et astrologie gratuits",
  description:
    "Code Destiny propose des expériences de tarot et des contenus d’astrologie et de fortune gratuits. Découvrez le tarot healing, les points Destiny et nos politiques transparentes.",
  alternates: {
    canonical: "/fr-fr",
  },
  openGraph: {
    title: "Code Destiny | Tarot, fortune et astrologie gratuits",
    description:
      "Expériences de tarot et contenus de fortune gratuits. Découvrez le tarot healing et les points Destiny.",
    url: "https://code-destiny.com/fr-fr",
    siteName: "Code Destiny",
    type: "website",
  },
};

import { LocaleFaq } from "../components/LocaleFaq";

export default function FrFrLanding() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 16px 52px", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "34px", fontWeight: 800, marginBottom: "10px" }}>
        Code Destiny — Tarot & Fortune (France)
      </h1>
      <p style={{ opacity: 0.9, lineHeight: 1.75, marginBottom: "18px" }}>
        Découvrez des expériences de tarot healing et des contenus de fortune. Cette page (fr-FR) aide les moteurs de
        recherche à comprendre la langue et l’intention régionale.
      </p>
      <p style={{ opacity: 0.86, lineHeight: 1.75, marginBottom: "18px" }}>
        Commencez par une expérience de tarot guidée, puis explorez les points Destiny. Nos pages de politiques et le
        support restent accessibles en un clic.
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
          Démarrer l’expérience Tarot Healing
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
          Points Destiny
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
        <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>Politiques & Support</h2>
        <p style={{ lineHeight: 1.75, opacity: 0.9, marginBottom: "10px" }}>
          Nous proposons des pages de politique claires et un canal de contact.
        </p>
        <nav style={{ display: "flex", gap: "12px", flexWrap: "wrap" }} aria-label="Politiques et contact">
          <a href="/privacy-policy" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Politique de confidentialité
          </a>
          <a href="/terms-of-service" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Conditions d’utilisation
          </a>
          <a href="/contact-us" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Nous contacter
          </a>
        </nav>
      </section>

      <LocaleFaq locale="fr-FR" canonicalUrl="https://code-destiny.com/fr-fr" />
    </main>
  );
}

