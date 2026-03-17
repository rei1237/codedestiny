export const metadata = {
  title: "Code Destiny | मुफ्त टैरो और भाग्य (भारत)",
  description:
    "Code Destiny मुफ्त टैरो अनुभव और भाग्य/फॉर्च्यून इनसाइट्स प्रदान करता है। यह पेज भारत (hi-IN) के लिए अनुकूलित है ताकि क्षेत्रीय SEO सिग्नल मजबूत हों।",
  alternates: {
    canonical: "/hi-in",
  },
  openGraph: {
    title: "Code Destiny | मुफ्त टैरो और भाग्य (भारत)",
    description: "भारत (hi-IN) के लिए मुफ्त टैरो अनुभव और भाग्य इनसाइट्स।",
    url: "https://code-destiny.com/hi-in",
    siteName: "Code Destiny",
    type: "website",
  },
};

export default function HiInLanding() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 16px 52px", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "34px", fontWeight: 800, marginBottom: "10px" }}>
        Code Destiny — टैरो & भाग्य (भारत)
      </h1>
      <p style={{ opacity: 0.9, lineHeight: 1.75, marginBottom: "18px" }}>
        Tarot Healing अनुभव और भाग्य इनसाइट्स देखें। यह पेज भारत (hi-IN) के लिए बनाया गया है ताकि खोज इंजन भाषा और क्षेत्रीय
        इरादे को बेहतर समझ सकें।
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
          Tarot Healing शुरू करें
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
        <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>नीतियाँ & सहायता</h2>
        <nav style={{ display: "flex", gap: "12px", flexWrap: "wrap" }} aria-label="नीतियाँ और संपर्क">
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

