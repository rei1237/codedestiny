import Link from "next/link";
import { LocaleFaq } from "../components/LocaleFaq";
import { LocaleSeoLinks } from "../components/LocaleSeoLinks";
import { SeoStructuredData } from "../components/SeoStructuredData";

export const metadata = {
  title: "Tarot dan astrologi percuma | CODE DESTINY",
  description:
    "Dapatkan bacaan tarot percuma, peta nasib Zi Wei Dou Shu, saju, dan analisis keserasian dalam satu platform. Mula sekarang.",
  keywords: [
    "tarot percuma",
    "astrologi timur",
    "zi wei dou shu",
    "saju reading",
    "ramalan nasib",
    "keserasian cinta",
    "horoskop harian",
    "bacaan spiritual",
    "code destiny",
    "ramalan percuma",
  ],
  alternates: {
    canonical: "/ms-my",
  },
  openGraph: {
    title: "Zi Wei Dou Shu, Saju dan Tarot Percuma | CODE DESTINY",
    description:
      "Terokai peta nasib timur dengan tarot moden, analisis hubungan, dan ramalan pelbagai bahasa secara percuma.",
    url: "https://code-destiny.com/ms-my",
    siteName: "CODE DESTINY",
    locale: "ms_MY",
    type: "website",
    images: [
      {
        url: "https://code-destiny.com/icons/honeypig-512.png",
        width: 512,
        height: 512,
        alt: "Halaman utama CODE DESTINY dengan tarot dan Zi Wei Dou Shu",
      },
    ],
  },
};

export default function MsMyLanding() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 16px 52px", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "34px", fontWeight: 800, marginBottom: "10px" }}>
        CODE DESTINY - Tarot, Saju dan Zi Wei Dou Shu
      </h1>
      <p style={{ opacity: 0.9, lineHeight: 1.75, marginBottom: "18px" }}>
        Pengalaman ramalan moden untuk pengguna Melayu: tarot, astrologi timur, dan keserasian dalam satu tempat.
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
          Mula Tarot Healing
        </Link>
      </section>

      <LocaleFaq locale="ms-MY" canonicalUrl="https://code-destiny.com/ms-my" />
      <SeoStructuredData
        locale="ms-MY"
        pagePath="/ms-my"
        pageName="Tarot dan astrologi percuma"
        description="Bacaan percuma untuk tarot, Zi Wei Dou Shu, saju dan keserasian dalam Bahasa Melayu."
      />
    </main>
  );
}
