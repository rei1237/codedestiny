export const metadata = {
  title: "Code Destiny | ไพ่ทาโรต์และดวงชะตาฟรี (ประเทศไทย)",
  description:
    "Code Destiny มอบประสบการณ์ไพ่ทาโรต์และข้อมูลดวงชะตาฟรี หน้านี้ปรับให้เหมาะกับประเทศไทย (th-TH) เพื่อเสริมสัญญาณ SEO ตามภูมิภาค",
  alternates: {
    canonical: "/th-th",
  },
  openGraph: {
    title: "Code Destiny | ไพ่ทาโรต์และดวงชะตาฟรี (ประเทศไทย)",
    description: "ประสบการณ์ไพ่ทาโรต์และข้อมูลดวงชะตาฟรี สำหรับประเทศไทย (th-TH)",
    url: "https://code-destiny.com/th-th",
    siteName: "Code Destiny",
    type: "website",
  },
};

export default function ThThLanding() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 16px 52px", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "34px", fontWeight: 800, marginBottom: "10px" }}>
        Code Destiny — ไพ่ทาโรต์ & ดวงชะตา (ประเทศไทย)
      </h1>
      <p style={{ opacity: 0.9, lineHeight: 1.75, marginBottom: "18px" }}>
        สำรวจประสบการณ์ Tarot Healing และข้อมูลดวงชะตา หน้านี้เหมาะสำหรับประเทศไทย (th-TH) เพื่อช่วยให้เสิร์ชเอนจินเข้าใจภาษาและเจตนาตามภูมิภาค
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
          เริ่มประสบการณ์ Tarot Healing
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
        <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>นโยบาย & การสนับสนุน</h2>
        <nav style={{ display: "flex", gap: "12px", flexWrap: "wrap" }} aria-label="นโยบายและการติดต่อ">
          <a href="/privacy-policy" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            นโยบายความเป็นส่วนตัว
          </a>
          <a href="/terms-of-service" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            ข้อกำหนดการให้บริการ
          </a>
          <a href="/contact-us" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            ติดต่อเรา
          </a>
        </nav>
      </section>
    </main>
  );
}

