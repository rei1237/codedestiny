import { generatePageMetadata } from "../../lib/generate-page-metadata";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/about",
    title: "서비스 소개 — 꿀꿀 만세력 About | Code Destiny",
    description:
      "Code Destiny(꿀꿀 만세력)는 사주팔자·타로·점성술·자미두수·숙요점 등 20가지 이상의 운세를 무료로 제공하는 AI 운세 플랫폼입니다. 서비스 미션·운영 원칙·운영자 정보·광고 정책을 확인하세요.",
    keywords: [
      "Code Destiny", "꿀꿀 만세력", "무료 운세 플랫폼", "서비스 소개", "운영자 소개",
      "사주 서비스", "타로 서비스", "운세 앱", "AI 운세", "무료 사주",
    ],
  });
}

/* ── 구조화 데이터 (JSON-LD) — 조직 + 웹페이지 ── */
const ABOUT_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://code-destiny.com/#organization",
      name: "Code Destiny",
      alternateName: "꿀꿀 만세력",
      url: "https://code-destiny.com",
      logo: {
        "@type": "ImageObject",
        url: "https://code-destiny.com/icons/honeypig.webp",
        width: 512,
        height: 512,
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "seongbae555@gmail.com",
        contactType: "customer support",
        availableLanguage: ["Korean", "English"],
      },
      sameAs: ["https://code-destiny.com"],
    },
    {
      "@type": "WebPage",
      "@id": "https://code-destiny.com/about#webpage",
      url: "https://code-destiny.com/about",
      name: "서비스 소개 — Code Destiny 꿀꿀 만세력",
      description:
        "Code Destiny는 사주팔자·타로·자미두수·점성술·숙요점 등 20종 이상의 무료 운세를 제공하는 AI 기반 운세 플랫폼입니다.",
      inLanguage: "ko",
      isPartOf: { "@id": "https://code-destiny.com/#website" },
      about: { "@id": "https://code-destiny.com/#organization" },
      dateModified: "2026-04-03",
    },
  ],
});

const SECTION = {
  background: "linear-gradient(145deg, rgba(12,18,48,0.88), rgba(22,11,44,0.76))",
  border: "1px solid rgba(167,139,250,0.24)",
  borderRadius: "16px",
  padding: "22px 24px",
  marginBottom: "16px",
  boxShadow: "0 14px 34px rgba(2,6,23,0.4)",
};

const H2 = { fontSize: "clamp(1rem,2.5vw,1.2rem)", fontWeight: 700, marginBottom: "10px", color: "#f8fafc" };
const P  = { lineHeight: 1.88, color: "#dbe5ff", wordBreak: "keep-all", margin: 0 };

export default function AboutPage() {
  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "32px 16px 56px",
        color: "#e2e8f0",
      }}
    >
      {/* 구조화 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ABOUT_JSON_LD }}
      />

      {/* ── 제목 ── */}
      <header style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "clamp(1.6rem,4vw,2rem)",
            fontWeight: 800,
            lineHeight: 1.3,
            color: "#f8fafc",
            marginBottom: "12px",
          }}
        >
          서비스 소개 — Code Destiny 꿀꿀 만세력
        </h1>
        <p style={{ ...P, fontSize: "1rem", opacity: 0.88 }}>
          Code Destiny(꿀꿀 만세력)는 <strong style={{ color: "#a78bfa" }}>사주팔자·AI 타로·자미두수·점성술·숙요점·동물관상·꿈 해몽</strong> 등
          다양한 운세·점술 콘텐츠를 제공하는 AI 기반 운세 플랫폼입니다.
          생년월일 하나로 폭넓은 해석 경험을 제공하며, 사용자가 자신의 상황을 더 명확히 이해하고 선택을 정리하도록 돕습니다.
        </p>
      </header>

      {/* ── 운영자 정보 ── */}
      <section style={SECTION} aria-labelledby="about-operator">
        <h2 id="about-operator" style={H2}>운영자 및 서비스 기본 정보</h2>
        <dl style={{ display: "grid", gap: "8px", margin: 0, padding: 0 }}>
          {[
            ["서비스명", "Code Destiny — 꿀꿀 만세력"],
            ["사이트 주소", "https://code-destiny.com"],
            ["운영 주체", "코드 데스티니"],
            ["사업자등록번호", "372-23-02329"],
            ["서비스 개시", "2024년"],
            ["주요 제공 서비스", "사주풀이, 타로, 점성술, 자미두수, 숙요점, 동물관상, 꿈 해몽, 궁합 등 20종 이상"],
            ["지원 언어", "한국어·영어·일본어·중국어·힌디어·스페인어·프랑스어·독일어·네덜란드어·말레이어 (10개 언어)"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <dt style={{ color: "#a78bfa", fontWeight: 600, minWidth: "160px", fontSize: "0.9rem" }}>{k}</dt>
              <dd style={{ color: "#dbe5ff", margin: 0, fontSize: "0.9rem" }}>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── 서비스 미션 ── */}
      <section style={SECTION} aria-labelledby="about-mission">
        <h2 id="about-mission" style={H2}>서비스 미션</h2>
        <p style={P}>
          Code Destiny는 동양의 전통 명리학(사주·자미두수·숙요점)과 서양의 점성술·타로, 그리고 현대 AI 기술을 결합하여
          누구나 쉽게 접근할 수 있는 운세 해석 경험을 만듭니다. 복잡한 명리 개념을 시각적으로 풀어내고,
          사용자 상황에 맞는 실천 포인트를 제시하는 것이 핵심 목표입니다.
        </p>
        <p style={{ ...P, marginTop: "12px" }}>
          단순한 '띠별 운세'나 '별자리 운세'를 넘어, 생년월일시·출생지를 기반으로 개인화된 사주 명반, 자미두수 명반,
          베다 점성술 차트를 제공합니다.
        </p>
      </section>

      {/* ── 제공 서비스 목록 ── */}
      <section style={SECTION} aria-labelledby="about-services">
        <h2 id="about-services" style={H2}>주요 제공 서비스</h2>
        <ul style={{ margin: 0, padding: "0 0 0 18px", display: "grid", gap: "8px" }}>
          {[
            "사주팔자 풀이 — 생년월일시 기반 사주 명반·대운·세운 해석 (무료)",
            "AI 타로 — 힐링·연애·재물·자존감·재회운 등 7가지 테마 타로 (무료)",
            "자미두수(紫微斗數) — 명반 생성 및 별자리 해석 (무료)",
            "코즈믹·베다(재티시) 점성술 — 행성 위치 기반 개인화 차트 (무료)",
            "숙요점(宿曜道) — 27수 음력 기반 점괘 해석 (무료)",
            "동물 관상·MBTI 궁합 — AI 관상 분석 및 궁합 진단 (무료)",
            "화투점·거북점·주역 64괘·이집트 신탁 등 오라클 서비스 (무료)",
            "운명의 꽃 아틀리에 — 사주·점성술·자미두수를 꽃 상징으로 표현 (무료)",
            "꿈 해몽 · 심리 분석 — 타로+심리학 기반 꿈 해석 (무료)",
            "인사이트 아카이브 — 사주·타로·명리학 심층 아티클 (무료)",
          ].map((item) => (
            <li key={item} style={{ color: "#dbe5ff", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* ── 콘텐츠 제작 원칙 ── */}
      <section style={SECTION} aria-labelledby="about-content-policy">
        <h2 id="about-content-policy" style={H2}>콘텐츠 제작 원칙 (E-E-A-T)</h2>
        <p style={P}>
          Code Destiny의 모든 콘텐츠는 <strong style={{ color: "#a78bfa" }}>자체 서술 원칙</strong>을 따르며, 복사·중복 문구를 지양합니다.
          사주 원리, 타로 상징체계, 명리학 해석 방법론, 점성술 행성 의미 등 정보성 글을 지속적으로 추가하며,
          작성·수정 이력을 투명하게 공개합니다.
        </p>
        <p style={{ ...P, marginTop: "12px" }}>
          운세 해석 결과는 오락·자기성찰 목적으로 제공되며, 법률·의료·투자·세무 자문을 대체하지 않습니다.
          중요한 의사결정은 반드시 해당 분야 전문가의 검토를 우선하시기 바랍니다.
        </p>
      </section>

      {/* ── 광고 및 쿠키 고지 ── */}
      <section style={SECTION} aria-labelledby="about-ads">
        <h2 id="about-ads" style={H2}>광고 및 쿠키 안내</h2>
        <p style={P}>
          Code Destiny는 무료 서비스 운영 재원을 위해 <strong style={{ color: "#a78bfa" }}>Google AdSense</strong>를 포함한
          제3자 광고를 페이지에 노출할 수 있습니다. 광고 제공 과정에서 쿠키 및 이와 유사한 기술이 사용될 수 있으며,
          이용자는 <a href="https://adssettings.google.com/" style={{ color: "#4ecdc4" }} target="_blank" rel="noopener noreferrer">Google 광고 설정</a>이나
          브라우저 설정을 통해 맞춤 광고 관련 선택을 직접 관리할 수 있습니다.
        </p>
        <p style={{ ...P, marginTop: "12px" }}>
          광고는 서비스 콘텐츠와 명확히 구분되어 표시되며, 광고 수익은 전적으로 서비스 품질 유지 및 신규 기능 개발에
          재투자됩니다. 광고를 통해 개인 식별 정보는 수집되지 않습니다.
        </p>
      </section>

      {/* ── 문의 / 운영자 ── */}
      <section style={SECTION} aria-labelledby="about-contact">
        <h2 id="about-contact" style={H2}>운영자 및 문의</h2>
        <p style={P}>
          서비스에 대한 문의, 오류 신고, 저작권 관련 사항은 아래 이메일로 연락주시면 빠르게 답변드립니다.
        </p>
        <p style={{ ...P, marginTop: "12px" }}>
          <strong style={{ color: "#a78bfa" }}>운영자:</strong> 꽃돼지 연이<br />
          <strong style={{ color: "#a78bfa" }}>이메일:</strong>{" "}
          <a href="mailto:seongbae555@gmail.com" style={{ color: "#4ecdc4" }}>seongbae555@gmail.com</a><br />
          <strong style={{ color: "#a78bfa" }}>문의 페이지:</strong>{" "}
          <a href="/contact-us" style={{ color: "#4ecdc4" }}>contact-us</a>
        </p>
      </section>

      {/* ── 관련 페이지 링크 ── */}
      <nav aria-label="관련 서비스 바로가기" style={{ marginTop: "24px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {[
          ["/", "홈 — 사주 보기"],
          ["/insights", "운세 인사이트 아카이브"],
          ["/methodology", "콘텐츠 방법론/면책 고지"],
          ["/faq", "자주 묻는 질문 FAQ"],
          ["/privacy-policy", "개인정보처리방침"],
          ["/terms-of-service", "이용약관"],
          ["/contact-us", "문의하기"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              background: "rgba(124,58,237,0.18)",
              border: "1px solid rgba(124,58,237,0.35)",
              color: "#a78bfa",
              fontSize: "0.85rem",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {label}
          </a>
        ))}
      </nav>
    </main>
  );
}
