export const metadata = {
  title: "Code Destiny | Tarot & vận mệnh miễn phí (Việt Nam)",
  description:
    "Code Destiny cung cấp trải nghiệm tarot và nội dung vận mệnh miễn phí. Trang này được tối ưu cho Việt Nam (vi-VN) để tăng tín hiệu SEO theo khu vực.",
  alternates: {
    canonical: "/vi-vn",
  },
  openGraph: {
    title: "Code Destiny | Tarot & vận mệnh miễn phí (Việt Nam)",
    description: "Trải nghiệm tarot và nội dung vận mệnh miễn phí cho Việt Nam (vi-VN).",
    url: "https://code-destiny.com/vi-vn",
    siteName: "Code Destiny",
    type: "website",
  },
};

export default function ViVnLanding() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 16px 52px", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "34px", fontWeight: 800, marginBottom: "10px" }}>
        Code Destiny — Tarot & Vận mệnh (Việt Nam)
      </h1>
      <p style={{ opacity: 0.9, lineHeight: 1.75, marginBottom: "18px" }}>
        Khám phá trải nghiệm Tarot Healing và nội dung vận mệnh. Trang này dành cho Việt Nam (vi-VN) để giúp công cụ tìm
        kiếm hiểu rõ ngôn ngữ và ý định theo khu vực.
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
          Bắt đầu trải nghiệm Tarot Healing
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
        <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>Chính sách & Hỗ trợ</h2>
        <nav style={{ display: "flex", gap: "12px", flexWrap: "wrap" }} aria-label="Chính sách và liên hệ">
          <a href="/privacy-policy" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Chính sách quyền riêng tư
          </a>
          <a href="/terms-of-service" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Điều khoản dịch vụ
          </a>
          <a href="/contact-us" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Liên hệ
          </a>
        </nav>
      </section>
    </main>
  );
}

