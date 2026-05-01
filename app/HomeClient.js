"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { FaqJsonLd } from "./components/SeoJsonLd";
import { HOME_FAQ_ITEMS, HOME_FAQ_SECTION_COPY } from "./_content/seo-copy";

function serializeSearchParams(searchParams) {
  if (!searchParams || typeof searchParams !== "object") return "";
  const query = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (!key) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (typeof entry === "string" && entry.length > 0) query.append(key, entry);
      });
      return;
    }
    if (typeof value === "string" && value.length > 0) {
      query.set(key, value);
    }
  });

  return query.toString();
}

export default function HomeClient() {
  const searchParams = useSearchParams();

  const iframeSrc = useMemo(() => {
    const iframeQuery = serializeSearchParams(Object.fromEntries(searchParams.entries()));
    return iframeQuery ? `/static/index.html?${iframeQuery}` : "/static/index.html";
  }, [searchParams]);

  return (
    <main className="cd-home-root">
      <FaqJsonLd faqs={HOME_FAQ_ITEMS} />

      <section className="cd-home-top cd-main-shell">
        <div className="cd-card">
          <p className="cd-home-kicker">CLASSIC HOME</p>
          <h1 className="cd-home-headline">생년월일 하나로, 나의 운명 지도를 펼쳐보세요</h1>
          <p className="cd-home-subline">클래식 운세 흐름을 기반으로 핵심 기능을 가장 빠르게 탐색할 수 있는 메인 화면입니다.</p>
        </div>
      </section>

      <section className="cd-home-iframe-frame" aria-label="클래식 메인 화면">
        <div className="cd-home-iframe-shell">
          <p className="cd-home-iframe-label">Classic Service Surface</p>
          <iframe
            src={iframeSrc}
            title="Code Destiny Main Service"
            className="cd-home-iframe"
          />
        </div>
      </section>

      <section
        aria-labelledby="homeFaqHeading"
        className="cd-main-shell cd-home-faq-wrap"
      >
        <div className="cd-card">
          <h2 id="homeFaqHeading" className="cd-main-title" style={{ fontSize: "clamp(1.2rem, 2.2vw, 1.7rem)" }}>
            {HOME_FAQ_SECTION_COPY.heading}
          </h2>
          <p className="cd-main-intro" style={{ marginTop: "8px", marginBottom: 0 }}>
            {HOME_FAQ_SECTION_COPY.intro}
          </p>
        </div>

        <div className="cd-card-grid">
          {HOME_FAQ_ITEMS.map((item, index) => (
            <article key={item.question} className="cd-card">
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
