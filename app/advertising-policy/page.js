import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "../../lib/site-policy-config";

const ADVERTISING_POLICY_METADATA_COPY = {
  ko: {
    title: "Advertising Policy | 광고 운영정책 — Code Destiny",
    description:
      "Code Destiny 광고 운영정책 페이지입니다. 광고 표기, 제휴 링크, 편집 독립성, 쿠키 기반 광고, 사용자 선택권, 금지 카테고리를 안내합니다.",
    keywords: ["Advertising Policy", "광고 운영정책", "AdSense", "제휴 링크", "광고 고지"],
  },
  en: {
    title: "Advertising Policy | Code Destiny",
    description:
      "Code Destiny's advertising policy explains ad labels, affiliate links, editorial independence, cookie-based ads, user choices, and prohibited ad categories.",
    keywords: ["Advertising Policy", "AdSense", "affiliate links", "ad disclosure", "editorial independence"],
  },
  ja: {
    title: "広告運用ポリシー | Code Destiny",
    description:
      "Code Destinyの広告運用ポリシーです。広告表示、アフィリエイトリンク、編集の独立性、Cookieベース広告、ユーザー選択、禁止カテゴリを案内します。",
    keywords: ["広告運用ポリシー", "AdSense", "アフィリエイトリンク", "広告表示", "編集の独立性"],
  },
  zh: {
    title: "广告运营政策 | Code Destiny",
    description:
      "Code Destiny 广告运营政策说明广告标识、联盟链接、编辑独立性、Cookie 广告、用户选择权与禁止类别。",
    keywords: ["广告运营政策", "AdSense", "联盟链接", "广告披露", "编辑独立性"],
  },
};

export function generateMetadata() {
  const copy = ADVERTISING_POLICY_METADATA_COPY.ko;
  return generatePageMetadata({
    path: "/advertising-policy",
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
  });
}

const sectionStyle = {
  background: "linear-gradient(145deg, rgba(12, 18, 48, 0.88), rgba(22, 11, 44, 0.76))",
  border: "1px solid rgba(167, 139, 250, 0.24)",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "0 14px 34px rgba(2, 6, 23, 0.4), inset 0 0 0 1px rgba(255,255,255,0.03)",
  backdropFilter: "blur(8px)",
};

export default function AdvertisingPolicyPage() {
  return (
    <main
      style={{
        maxWidth: "920px",
        margin: "0 auto",
        padding: "28px 16px 42px",
        color: "#e2e8f0",
        background:
          "radial-gradient(640px 280px at 12% 2%, rgba(124,58,237,.2), transparent 60%), radial-gradient(520px 260px at 86% 8%, rgba(78,205,196,.16), transparent 64%)",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(1.8rem, 4vw, 2.2rem)",
          fontWeight: 800,
          marginBottom: "8px",
          lineHeight: 1.28,
          letterSpacing: "0.01em",
          color: "#f8fafc",
          textShadow: "0 0 18px rgba(244, 206, 120, 0.2)",
        }}
      >
        광고 운영정책 (Advertising Policy)
      </h1>
      <p style={{ opacity: 0.92, lineHeight: 1.82, marginBottom: "20px", color: "#dbe5ff", wordBreak: "keep-all" }}>
        시행일: 2026-05-07 / Effective Date: 2026-05-07
      </p>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>1. 기본 원칙 / Core Principles</h2>
        <p style={{ lineHeight: 1.75 }}>
          Code Destiny는 사용자 신뢰를 최우선으로 하며, 광고 수익화와 콘텐츠 품질 간 균형을 유지합니다. 광고는 서비스 지속 운영을 위한 수단이며,
          사용자의 안전성과 정보 투명성을 해치지 않는 범위에서만 운영됩니다.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          We prioritize user trust and transparency. Advertising supports service operations but must not compromise content quality or user safety.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>2. 광고 유형 / Types of Advertising</h2>
        <p style={{ lineHeight: 1.75 }}>
          본 사이트는 디스플레이 광고, 문맥 기반 광고, 리마케팅 광고를 포함한 제3자 광고 네트워크(예: Google AdSense)를 사용할 수 있습니다.
          광고 슬롯은 페이지 레이아웃에 맞춰 자동 또는 수동으로 배치될 수 있습니다.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          We may use third-party ad networks such as Google AdSense for display and contextual ads.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>3. 광고/제휴 표기 원칙 / Ad and Affiliate Disclosure</h2>
        <p style={{ lineHeight: 1.75 }}>
          유료 협찬, 제휴 링크, 추천 링크가 포함된 경우 합리적으로 식별 가능한 방식으로 &ldquo;광고&rdquo;, &ldquo;스폰서드&rdquo;, &ldquo;제휴 링크&rdquo; 등의
          표기를 제공합니다. 사용자가 광고성 정보를 콘텐츠 본문과 구분할 수 있도록 명확한 레이블을 유지합니다.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          Sponsored or affiliate content is disclosed with clear labels such as &ldquo;Ad&rdquo;, &ldquo;Sponsored&rdquo;, or &ldquo;Affiliate&rdquo;.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>4. 편집 독립성 / Editorial Independence</h2>
        <p style={{ lineHeight: 1.75 }}>
          광고주 또는 제휴사의 이해관계가 콘텐츠 해석 결과나 핵심 안내 문구를 왜곡하지 않도록 편집 기준을 분리합니다. 광고 계약 여부는
          운세/타로/분석 콘텐츠의 결론이나 순위를 보장하거나 변경하지 않습니다.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          Advertising relationships do not determine or guarantee editorial outcomes, rankings, or interpretation results.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>5. 데이터 및 맞춤 광고 / Data and Personalized Ads</h2>
        <p style={{ lineHeight: 1.75 }}>
          광고 제공 과정에서 쿠키, 웹 비콘, IP 주소, 광고 식별자 또는 유사 식별자가 사용될 수 있습니다. Google을 포함한 제3자 광고 파트너는
          광고 제공과 측정을 위해 이러한 정보를 사용할 수 있으며, 맞춤형 광고 여부는 브라우저 설정, Google 광고 설정,
          디바이스 수준 개인정보 옵션을 통해 관리할 수 있습니다.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          Google 광고 설정은{" "}
          <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            adssettings.google.com
          </a>
          에서, Google이 파트너 사이트와 앱의 데이터를 사용하는 방식은{" "}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Google 파트너 사이트/앱 데이터 사용 안내
          </a>
          에서 확인할 수 있습니다.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          Ad personalization may rely on cookies, web beacons, IP addresses, ad identifiers, and similar identifiers.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>6. 제한 또는 거부 대상 광고 / Restricted or Rejected Ads</h2>
        <p style={{ lineHeight: 1.75 }}>
          다음 유형의 광고는 정책 또는 법령 준수 관점에서 제한하거나 거부할 수 있습니다: 불법 상품/서비스, 과장·기만성 표현,
          증오·차별 조장, 악성코드 유포, 민감정보 오남용, 명백한 허위 의료·투자 수익 보장 광고 등.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>7. 결과 보장 부인 / No Guarantee of Outcomes</h2>
        <p style={{ lineHeight: 1.75 }}>
          광고 또는 제휴 링크의 존재는 특정 서비스 성과를 보증하지 않습니다. 또한 Code Destiny의 콘텐츠 및 광고 정보는 의료, 법률,
          투자, 형사 사건 결과를 포함한 어떠한 결과도 보장하지 않습니다.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          Neither ads nor affiliate links guarantee outcomes. We do not guarantee medical, legal, investment, or criminal case outcomes.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>8. 정책 업데이트 및 문의 / Updates and Contact</h2>
        <p style={{ lineHeight: 1.75 }}>
          본 정책은 서비스 및 법령 변경에 따라 개정될 수 있으며, 중요한 변경 사항은 본 페이지에 업데이트됩니다.
          광고 정책 문의: <a href={SUPPORT_MAILTO} style={{ color: "#93c5fd", textDecoration: "underline" }}>{SUPPORT_EMAIL}</a>
          <br />
          Advertising policy inquiries: <a href={SUPPORT_MAILTO} style={{ color: "#93c5fd", textDecoration: "underline" }}>{SUPPORT_EMAIL}</a>
        </p>
      </section>
    </main>
  );
}
