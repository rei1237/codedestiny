export const metadata = {
  title: "Code Destiny | Free Fortune, Tarot & Astrology",
  description:
    "Code Destiny offers free tarot readings, fortune insights, and astrology-inspired experiences. Explore tarot healing, destiny points, and transparent policies.",
  alternates: {
    canonical: "/en-us",
  },
  openGraph: {
    title: "Code Destiny | Free Fortune, Tarot & Astrology",
    description:
      "Free tarot readings, fortune insights, and astrology-inspired experiences. Explore tarot healing and destiny points.",
    url: "https://code-destiny.com/en-us",
    siteName: "Code Destiny",
    type: "website",
  },
};

import { LocaleFaq } from "../components/LocaleFaq";

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

      <section style={{ background: "rgba(2, 6, 23, 0.55)", border: "1px solid rgba(148, 163, 184, 0.18)", borderRadius: "14px", padding: "16px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>Policies & Support</h2>
        <p style={{ lineHeight: 1.75, opacity: 0.9, marginBottom: "10px" }}>
          We provide transparent policy pages and a contact channel.
        </p>
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

      <LocaleFaq locale="en-US" canonicalUrl="https://code-destiny.com/en-us" />
    </main>
  );
}

