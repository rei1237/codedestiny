"use client";

import { FaqJsonLd } from "./components/SeoJsonLd";
import { HOME_FAQ_ITEMS, HOME_FAQ_SECTION_COPY } from "./_content/seo-copy";
import MainLandingPage from "./components/MainLandingPage";

export default function HomeClient() {
  return (
    <>
      <FaqJsonLd faqs={HOME_FAQ_ITEMS} />
      <MainLandingPage />

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
    </>
  );
}
