"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { FaqJsonLd } from "./components/SeoJsonLd";
import { HOME_FAQ_ITEMS, HOME_FAQ_SECTION_COPY } from "./_content/seo-copy";
import PremiumCollectionClientWrapper from "./components/PremiumCollectionClientWrapper";

function serializeSearchParams(searchParams) {
  if (!searchParams) return "";
  const query = new URLSearchParams();

  searchParams.forEach((value, key) => {
    if (!key || !value) return;
    if (typeof value === "string" && value.length > 0) {
      query.set(key, value);
    }
  });

  return query.toString();
}

export default function Home() {
  const searchParams = useSearchParams();

  const iframeSrc = useMemo(() => {
    const serialized = serializeSearchParams(searchParams);
    return serialized ? `/static/index.html?${serialized}` : "/static/index.html";
  }, [searchParams]);

  return (
    <main style={{ minHeight: "100vh", background: "#05070f", color: "#e5e7eb" }}>
      <FaqJsonLd faqs={HOME_FAQ_ITEMS} />

      {/* 프리미엄 운세 컬렉션 카드: FAQ 위, iframe 아래에 직접 노출 (Client Wrapper) */}
      <div style={{ maxWidth: "1120px", margin: "0 auto", padding: "32px 0 0" }}>
        <PremiumCollectionClientWrapper />
      </div>

      <iframe
        src={iframeSrc}
        title="Code Destiny Main Service"
        style={{
          width: "100%",
          height: "100vh",
          border: 0,
          display: "block",
          background: "transparent",
        }}
      />

      <section
        aria-labelledby="homeFaqHeading"
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          padding: "56px 18px 86px",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(148,163,184,0.35)",
            borderRadius: "20px",
            padding: "22px 18px",
            background:
              "linear-gradient(140deg, rgba(15,23,42,0.95), rgba(30,41,59,0.92))",
            boxShadow: "0 18px 40px rgba(2, 6, 23, 0.45)",
          }}
        >
          <h1
            id="homeFaqHeading"
            style={{
              margin: "0 0 10px",
              fontSize: "clamp(1.3rem, 2.5vw, 1.8rem)",
              fontWeight: 800,
              color: "#f8fafc",
              lineHeight: 1.35,
            }}
          >
            {HOME_FAQ_SECTION_COPY.heading}
          </h1>
          <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.9, fontSize: "0.97rem" }}>
            {HOME_FAQ_SECTION_COPY.intro}
          </p>
        </div>

        <div style={{ display: "grid", gap: "14px", marginTop: "16px" }}>
          {HOME_FAQ_ITEMS.map((item, index) => (
            <article
              key={item.question}
              style={{
                border: "1px solid rgba(148,163,184,0.28)",
                borderRadius: "16px",
                background: "rgba(15, 23, 42, 0.86)",
                padding: "18px 16px",
              }}
            >
              <h3 style={{ margin: "0 0 8px", color: "#f1f5f9", fontSize: "1.03rem", lineHeight: 1.5 }}>
                Q{index + 1}. {item.question}
              </h3>
              <p style={{ margin: 0, color: "#dbeafe", lineHeight: 1.95, fontSize: "0.95rem", wordBreak: "keep-all" }}>
                {item.answer}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
