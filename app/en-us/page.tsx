export const metadata = {
  title: "Free Saju, Zi Wei Dou Shu & Tarot | CODE DESTINY",
  description:
    "Get your free Saju chart, Zi Wei Dou Shu destiny map, tarot reading, and compatibility insights in one place. Start your personalized reading now.",
  keywords: [
    "zi wei dou shu free",
    "chinese star chart",
    "eastern astrology",
    "korean astrology",
    "saju reading",
    "four pillars of destiny",
    "bazi chart",
    "free tarot reading online",
    "love tarot spread",
    "natal chart alternative",
    "asian astrology",
    "destiny map reading",
    "relationship compatibility test",
    "jyotish reading",
    "free horoscope today",
  ],
  alternates: {
    canonical: "/en-us",
  },
  openGraph: {
    title: "Free Zi Wei Dou Shu, Saju & Tarot Readings | CODE DESTINY",
    description:
      "Discover a 1000-year-old Eastern destiny system with modern tarot and astrology tools. Free multilingual readings.",
    url: "https://code-destiny.com/en-us",
    siteName: "CODE DESTINY",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://code-destiny.com/icons/honeypig-512.png",
        width: 512,
        height: 512,
        alt: "CODE DESTINY dashboard with Zi Wei Dou Shu and Tarot features",
      },
    ],
  },
};

import Link from "next/link";
import { LocaleFaq } from "../components/LocaleFaq";
import { LocaleSeoLinks } from "../components/LocaleSeoLinks";
import { SeoStructuredData } from "../components/SeoStructuredData";

export default function EnUsLanding() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 16px 52px", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "34px", fontWeight: 800, marginBottom: "10px" }}>
        Code Destiny — Free Tarot, Fortune & Astrology
      </h1>
      <p style={{ opacity: 0.9, lineHeight: 1.75, marginBottom: "18px" }}>
        Discover tarot healing experiences and fortune insights. This page is tailored for the United States (en-US) to
        help search engines understand language and regional intent.
      </p>
      <p style={{ opacity: 0.86, lineHeight: 1.75, marginBottom: "18px" }}>
        Try a guided tarot experience, explore destiny points, and browse our policy pages. This landing helps search
        engines associate the right language and region with the right content.
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
          Start Tarot Healing Experience
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
          Destiny Points
        </Link>
      </section>

      <section style={{ background: "rgba(2, 6, 23, 0.55)", border: "1px solid rgba(148, 163, 184, 0.18)", borderRadius: "14px", padding: "16px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>Policies & Support</h2>
        <p style={{ lineHeight: 1.75, opacity: 0.9, marginBottom: "10px" }}>
          We provide transparent policy pages and a contact channel.
        </p>
        <nav style={{ display: "flex", gap: "12px", flexWrap: "wrap" }} aria-label="Policies and contact">
          <Link href="/privacy-policy" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Privacy Policy
          </Link>
          <Link href="/terms-of-service" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Terms of Service
          </Link>
          <Link href="/contact-us" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Contact Us
          </Link>
        </nav>
      </section>

      <LocaleFaq locale="en-US" canonicalUrl="https://code-destiny.com/en-us" />
      <SeoStructuredData
        locale="en-US"
        pagePath="/en-us"
        pageName="Free Saju, Zi Wei Dou Shu & Tarot"
        description="Free multilingual reading for Saju, Zi Wei Dou Shu, Tarot, and compatibility."
      />
    </main>
  );
}

