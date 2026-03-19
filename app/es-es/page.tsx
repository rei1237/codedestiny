import Link from "next/link";
import { LocaleFaq } from "../components/LocaleFaq";
import { LocaleSeoLinks } from "../components/LocaleSeoLinks";
import { SeoStructuredData } from "../components/SeoStructuredData";

export const metadata = {
  title: "Tarot y astrologia gratis | CODE DESTINY",
  description:
    "Descubre tarot gratis, mapa del destino Zi Wei Dou Shu y lectura de saju en una sola plataforma. Empieza tu lectura personalizada ahora.",
  keywords: [
    "tarot gratis",
    "astrologia oriental",
    "zi wei dou shu",
    "lectura saju",
    "mapa del destino",
    "compatibilidad amorosa",
    "horoscopo gratis",
    "lectura espiritual",
    "code destiny",
    "fortuna diaria",
  ],
  alternates: {
    canonical: "/es-es",
  },
  openGraph: {
    title: "Tarot, Saju y Zi Wei Dou Shu Gratis | CODE DESTINY",
    description:
      "Conoce tu mapa del destino con astrologia oriental, tarot y compatibilidad. Experiencia gratuita y multilingue.",
    url: "https://code-destiny.com/es-es",
    siteName: "CODE DESTINY",
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: "https://code-destiny.com/icons/honeypig-512.png",
        width: 512,
        height: 512,
        alt: "Panel principal de CODE DESTINY con tarot y astrologia oriental",
      },
    ],
  },
};

export default function EsEsLanding() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 16px 52px", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "34px", fontWeight: 800, marginBottom: "10px" }}>
        CODE DESTINY - Tarot y astrologia oriental gratis
      </h1>
      <p style={{ opacity: 0.9, lineHeight: 1.75, marginBottom: "18px" }}>
        Explora tarot, saju y Zi Wei Dou Shu en una experiencia guiada para usuarios de habla hispana.
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
          Empezar Tarot Healing
        </Link>
      </section>

      <LocaleFaq locale="es-ES" canonicalUrl="https://code-destiny.com/es-es" />
      <SeoStructuredData
        locale="es-ES"
        pagePath="/es-es"
        pageName="Tarot y astrologia gratis"
        description="Lecturas gratis de tarot, saju, Zi Wei Dou Shu y compatibilidad para usuarios hispanohablantes."
      />
    </main>
  );
}
