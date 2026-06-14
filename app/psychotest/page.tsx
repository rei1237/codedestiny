import Link from "next/link";
import { buildFortuneJsonLd, generatePageMetadata } from "../../lib/generate-page-metadata";
import {
  PSYCHOTESTS,
  PSYCHOTEST_HUB_KEYWORDS,
  buildPsychotestExternalUrl,
} from "../../lib/psychotest-catalog";
import DestinyBiasPromoSection from "./_components/DestinyBiasPromoSection";

const META = {
  path: "/psychotest",
  title: "심리테스트 모음 14종 | 성격·연애·직장 무료 테스트 허브",
  description:
    "Replit 심리테스트 14종을 기능별로 정리한 SEO 허브입니다. 성격, 연애, 직장, 공감, HSP, 정신연령 테스트를 한 번에 비교하고 바로 시작할 수 있습니다.",
  keywords: PSYCHOTEST_HUB_KEYWORDS,
  featureList: [
    "심리테스트 14종 카탈로그",
    "성격/연애/직장 카테고리 필터형 탐색",
    "기능별 요약과 추천 키워드 안내",
  ],
  applicationCategory: "LifestyleApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const BASE_GRAPH = JSON.parse(buildFortuneJsonLd(META));
const ITEM_LIST = {
  "@type": "ItemList",
  "@id": "https://code-destiny.com/psychotest#itemlist",
  name: "심리테스트 모음",
  itemListElement: PSYCHOTESTS.map((test, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `https://code-destiny.com/psychotest/${test.slug}`,
    name: test.title,
    description: test.summary,
  })),
};
const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [...(Array.isArray(BASE_GRAPH?.["@graph"]) ? BASE_GRAPH["@graph"] : []), ITEM_LIST],
});

export default function PsychotestHubPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />

      <header className="mb-8 rounded-3xl border border-violet-200/40 bg-[radial-gradient(circle_at_15%_20%,rgba(244,114,182,0.16),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(99,102,241,0.16),transparent_35%),linear-gradient(155deg,#ffffff,#faf5ff)] p-6 shadow-sm md:p-8">
        <p className="mb-3 text-xs font-semibold tracking-[0.12em] text-violet-500">PSYCHOLOGY TEST HUB</p>
        <h1 className="text-2xl font-black leading-tight text-slate-900 md:text-3xl">
          심리테스트 모음 14종
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 md:text-base">
          성격, 연애, 직장, 공감, HSP, 정신연령까지 많이 찾는 심리테스트를 주제별로 정리했습니다.
          검색 의도에 맞는 테스트를 고르고, 상세 페이지에서 핵심 포인트를 확인한 뒤 바로 시작하세요.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {PSYCHOTESTS.map((test) => (
          <article
            key={test.id}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
          >
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-violet-600">
              <span className="rounded-full bg-violet-50 px-2 py-1">{test.category}</span>
              <span>{test.estimatedMinutes}분</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">{test.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{test.summary}</p>
            <p className="mt-3 text-xs text-slate-500">추천 검색어: {test.keywords.slice(0, 3).join(", ")}</p>

            <div className="mt-4 flex gap-2">
              <Link
                href={`/psychotest/${test.slug}`}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                상세 가이드
              </Link>
              <a
                href={buildPsychotestExternalUrl(test.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                바로 시작
              </a>
            </div>
          </article>
        ))}
      </section>

      <DestinyBiasPromoSection />
    </main>
  );
}
