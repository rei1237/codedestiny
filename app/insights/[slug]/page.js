import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import InsightArticleCosmicClient from "./InsightArticleCosmicClient";
import { buildSeoMetadata } from "../../../lib/seo";

export const dynamicParams = false;

function extractSlugsFromSource(relativePath) {
  try {
    const abs = resolve(process.cwd(), relativePath);
    const text = readFileSync(abs, "utf8");
    const matches = [...text.matchAll(/slug\s*:\s*["']([a-z0-9-]+)["']/g)];
    return matches.map((m) => String(m[1] || "").trim()).filter(Boolean);
  } catch (e) {
    return [];
  }
}

function listInsightSlugs() {
  const sources = [
    "app/insights/articles.js",
    "app/insights/seo-growth-articles.js",
    "app/insights/adsense-ready-articles.js",
  ];

  const set = new Set();
  for (const file of sources) {
    for (const slug of extractSlugsFromSource(file)) set.add(slug);
  }

  return Array.from(set);
}

export function generateStaticParams() {
  return listInsightSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }) {
  const slug = String(params?.slug || "");
  return buildSeoMetadata({
    path: `/insights/${encodeURIComponent(slug)}`,
    title: "운세 인사이트 | Code Destiny",
    description: "운세 인사이트 상세 페이지입니다.",
    keywords: ["운세 인사이트", "사주", "자미두수", "숙요점", "타로", "점성술", "베다점"],
    ogType: "article",
  });
}

export default function InsightArticlePage({ params }) {
  const slug = String(params?.slug || "");
  const item = {
    slug,
    title: "운세 인사이트",
    excerpt: "운세 해석과 활용 팁을 확인해 보세요.",
    contentHtml: "",
    tags: [],
    category: "인사이트",
    cta: { links: [] },
    internalLinks: [],
  };

  return (
    <InsightArticleCosmicClient
      slug={slug}
      initialItem={item}
      initialRelated={[]}
      initialPrevious={null}
      initialNext={null}
    />
  );
}
