export const metadata = {
  title: "Tarot, Saju et astrologie gratuits | CODE DESTINY",
  description:
    "Découvrez gratuitement le Saju, Zi Wei Dou Shu, tarot, compatibilité et astrologie orientale sur une plateforme multilingue.",
  keywords: [
    "tarot gratuit",
    "saju gratuit",
    "astrologie orientale",
    "zi wei dou shu",
    "compatibilite amoureuse",
    "horoscope gratuit",
    "voyance gratuite",
    "code destiny",
  ],
  alternates: {
    canonical: "/fr-fr",
  },
  openGraph: {
    title: "CODE DESTINY | Saju, tarot et horoscope gratuits",
    description:
      "Plateforme multilingue de divination gratuite: saju, zi wei dou shu, tarot, compatibilite et astrologie.",
    url: "https://code-destiny.com/fr-fr",
    siteName: "CODE DESTINY",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "https://code-destiny.com/icons/honeypig-512.png",
        width: 512,
        height: 512,
        alt: "Plateforme CODE DESTINY de tarot et astrologie orientale",
      },
    ],
  },
};

import Link from "next/link";
import { LocaleFaq } from "../components/LocaleFaq";
import { LocaleSeoLinks } from "../components/LocaleSeoLinks";
import { SeoStructuredData } from "../components/SeoStructuredData";

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
      <LocaleSeoLinks />

      <section style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
        <Link
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
        </Link>
        <Link
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
        </Link>
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
          <Link href="/privacy-policy" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Politique de confidentialité
          </Link>
          <Link href="/terms-of-service" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Conditions d’utilisation
          </Link>
          <Link href="/contact-us" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Nous contacter
          </Link>
        </nav>
      </section>

      <LocaleFaq locale="fr-FR" canonicalUrl="https://code-destiny.com/fr-fr" />
      <SeoStructuredData
        locale="fr-FR"
        pagePath="/fr-fr"
        pageName="Tarot, Saju et astrologie gratuits"
        description="Services gratuits de saju, zi wei dou shu, tarot et astrologie pour les utilisateurs francophones."
      />
    </main>
  );
}

