import nextDynamic from "next/dynamic";
import Link from "next/link";
import { generatePageMetadata } from "../../lib/generate-page-metadata";

const InsightsCosmicClient = nextDynamic(() => import("./InsightsCosmicClient"), {
  loading: () => (
    <div className="flex min-h-[32vh] items-center justify-center text-sm text-slate-400">
      인사이트 허브를 불러오는 중…
    </div>
  ),
});

const _META = {
  path: "/insights",
  title: "운세 인사이트 아카이브 — 사주·타로·자미두수 핵심 원리 무료 학습 | Code Destiny",
  description: "사주명리학·타로·자미두수·숙요점·베다점성술의 핵심 원리를 무료로 읽는 운세 지식 아카이브. 입문부터 실전까지 26편 이상의 깊이 있는 해설을 지금 바로 확인하세요.",
  keywords: ["사주 基礎", "타로 해석", "자미두수", "숙요점", "베다 점성술", "명리학 아카이브"],
};

const META_MAP = {
  saju: {
    title: "사주팔자 완전 해설 | 명리학 기초부터 대운까지 — 코드 데스티니",
    description:
      "사주팔자란 무엇인가. 천간·지지·60갑자·신강신약·용신·대운의 원리를 알기 쉽게 해설합니다. 코드 데스티니 꿀꿀 만세력.",
  },
  tarot: {
    title: "타로 카드 완전 가이드 | 대·소 아르카나 78장 해석 — 코드 데스티니",
    description:
      "타로 카드 78장의 의미와 스프레드 방법. 연애운·재물운·취업운별 타로 리딩 가이드. 코드 데스티니 꿀꿀 만세력.",
  },
  astrology: {
    title: "서양 점성술 완전 가이드 | 12궁·행성·하우스 — 코드 데스티니",
    description:
      "서양 점성술의 12별자리·행성 배치·하우스 해석법. 출생 차트 읽는 법과 트랜지트 분석. 코드 데스티니 꿀꿀 만세력.",
  },
  ziwei: {
    title: "자미두수 완전 해설 | 12궁 명반 읽는 법 — 코드 데스티니",
    description:
      "자미두수(紫微斗數) 명궁·명반 보는 법. 주성·보성·살성 완전 해설. 중국 황실 점성술의 비밀. 코드 데스티니.",
  },
  sukuyo: {
    title: "숙요점 완전 가이드 | 27수 달별자리 운명 — 코드 데스티니",
    description:
      "숙요점(宿曜占) 27수 달별자리로 보는 운명. 에도시대 금서로 지정된 동양 최고 비전 점술. 코드 데스티니.",
  },
  vedic: {
    title: "베다 점성술 완전 가이드 | 조티쉬·나크샤트라 — 코드 데스티니",
    description:
      "인도 베다 점성술(Jyotish) 라그나·나크샤트라·다샤로 보는 운명 지도. 코드 데스티니 꿀꿀 만세력.",
  },
};

export const dynamic = "force-dynamic";

export function generateMetadata({ searchParams }) {
  const topic = String(searchParams?.topic || "").trim().toLowerCase();
  const hasTopicQuery = topic.length > 0;
  const topicMeta = META_MAP[topic];

  const robotsNoindexFollow = {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true, "max-snippet": -1 },
  };

  if (!topicMeta) {
    const baseMeta = generatePageMetadata({
      ..._META,
      variantKey: hasTopicQuery ? `topic-${topic}` : "topic-all",
    });
    if (hasTopicQuery && topic !== "all") {
      return { ...baseMeta, robots: robotsNoindexFollow };
    }
    return baseMeta;
  }

  const pageMeta = generatePageMetadata({
    ..._META,
    title: topicMeta.title,
    description: topicMeta.description,
    variantKey: `topic-${topic}`,
  });

  return topic === "all" ? pageMeta : { ...pageMeta, robots: robotsNoindexFollow };
}

export default function InsightsIndexPage({ searchParams }) {
  const initialTopic = String(searchParams?.topic || "all").trim().toLowerCase();
  const insightsHubJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://code-destiny.com/insights#webpage",
    url: "https://code-destiny.com/insights",
    name: "운세 인사이트 허브 — 사주·타로·자미두수 지식 아카이브 | Code Destiny",
    description: "사주명리학·타로·자미두수·숙요점·베다점성술의 핵심 원리를 읽는 운세 지식 아카이브.",
    inLanguage: "ko",
    isPartOf: {
      "@id": "https://code-destiny.com/#website",
    },
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: insightsHubJsonLd }} />
      <div style={{ maxWidth: "980px", margin: "0 auto", padding: "10px 16px 0" }}>
        <nav aria-label="breadcrumb" style={{ fontSize: "0.88rem", color: "#cbd5e1" }}>
          <Link href="/" style={{ color: "#f8eecb" }}>홈</Link>
          <span style={{ margin: "0 6px" }}>/</span>
          <span>인사이트</span>
        </nav>
        <nav aria-label="인사이트 카테고리 바로가기" style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
          <Link href="/insights?topic=saju" style={{ color: "#dbe5ff", textDecoration: "none", border: "1px solid rgba(148,163,184,0.28)", borderRadius: "999px", padding: "5px 10px", fontSize: "0.84rem" }}>사주</Link>
          <Link href="/insights?topic=tarot" style={{ color: "#dbe5ff", textDecoration: "none", border: "1px solid rgba(148,163,184,0.28)", borderRadius: "999px", padding: "5px 10px", fontSize: "0.84rem" }}>타로</Link>
          <Link href="/insights?topic=astrology" style={{ color: "#dbe5ff", textDecoration: "none", border: "1px solid rgba(148,163,184,0.28)", borderRadius: "999px", padding: "5px 10px", fontSize: "0.84rem" }}>점성술</Link>
          <Link href="/insights?topic=ziwei" style={{ color: "#dbe5ff", textDecoration: "none", border: "1px solid rgba(148,163,184,0.28)", borderRadius: "999px", padding: "5px 10px", fontSize: "0.84rem" }}>자미두수</Link>
          <Link href="/insights?topic=sukuyo" style={{ color: "#dbe5ff", textDecoration: "none", border: "1px solid rgba(148,163,184,0.28)", borderRadius: "999px", padding: "5px 10px", fontSize: "0.84rem" }}>숙요점</Link>
          <Link href="/insights?topic=vedic" style={{ color: "#dbe5ff", textDecoration: "none", border: "1px solid rgba(148,163,184,0.28)", borderRadius: "999px", padding: "5px 10px", fontSize: "0.84rem" }}>베다점성술</Link>
        </nav>
      </div>
      <InsightsCosmicClient initialTopic={initialTopic} />
    </>
  );
}

