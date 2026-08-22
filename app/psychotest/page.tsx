import Link from "next/link";
import { buildFortuneJsonLd, generatePageMetadata } from "../../lib/generate-page-metadata";
import {
  PSYCHOTESTS,
  PSYCHOTEST_HUB_KEYWORDS,
  buildPsychotestExternalUrl,
} from "../../lib/psychotest-catalog";
import DestinyBiasPromoSection from "./_components/DestinyBiasPromoSection";
import RouteMetadataLocaleSync from "../components/RouteMetadataLocaleSync";

const PSYCHOTEST_PAGE_METADATA_COPY = {
  ko: {
    title: "무료 심리테스트 14종 | 성격·연애·직장 테스트 모음",
    description:
      "가입 없이 바로 하는 무료 심리테스트 14종을 한곳에 모았습니다. 성격, 연애, 직장, 공감, HSP, 정신연령 테스트를 주제별로 비교하고 원하는 것만 골라 바로 시작할 수 있습니다.",
    featureList: ["심리테스트 14종 카탈로그", "성격/연애/직장 카테고리 필터형 탐색", "기능별 요약과 추천 키워드 안내"],
    itemListName: "심리테스트 모음",
  },
  en: {
    title: "14 Free Psychological Tests | Personality, Love, and Work Test Hub",
    description:
      "An SEO hub organizing 14 Replit psychological tests by function, so you can compare personality, love, work, empathy, HSP, and mental-age tests at a glance.",
    featureList: ["Catalog of 14 psychological tests", "Category browsing for personality, love, and work", "Functional summaries and recommended keywords"],
    itemListName: "Psychological test collection",
  },
  ja: {
    title: "心理テスト14種まとめ | 性格・恋愛・仕事の無料テストハブ",
    description:
      "Replit心理テスト14種を機能別に整理したSEOハブです。性格、恋愛、仕事、共感、HSP、精神年齢テストを一度に比較してすぐ始められます。",
    featureList: ["心理テスト14種カタログ", "性格・恋愛・仕事カテゴリ別探索", "機能別要約とおすすめキーワード"],
    itemListName: "心理テストまとめ",
  },
  zh: {
    title: "14 种心理测试合集 | 性格、恋爱、职场免费测试中心",
    description:
      "按功能整理 14 种 Replit 心理测试，可一次比较性格、恋爱、职场、共情、HSP 与心理年龄测试并立即开始。",
    featureList: ["14 种心理测试目录", "性格、恋爱、职场分类探索", "功能摘要与推荐关键词"],
    itemListName: "心理测试合集",
  },
} as const;

const META = {
  path: "/psychotest",
  title: PSYCHOTEST_PAGE_METADATA_COPY.ko.title,
  description: PSYCHOTEST_PAGE_METADATA_COPY.ko.description,
  keywords: PSYCHOTEST_HUB_KEYWORDS,
  featureList: PSYCHOTEST_PAGE_METADATA_COPY.ko.featureList,
  applicationCategory: "LifestyleApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const BASE_GRAPH = JSON.parse(buildFortuneJsonLd(META));
const ITEM_LIST = {
  "@type": "ItemList",
  "@id": "https://code-destiny.com/psychotest#itemlist",
  name: PSYCHOTEST_PAGE_METADATA_COPY.ko.itemListName,
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
      <RouteMetadataLocaleSync entries={PSYCHOTEST_PAGE_METADATA_COPY} />

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

      <section className="mb-8 max-w-3xl space-y-4 text-sm leading-7 text-slate-700 md:text-base">
        <h2 className="text-lg font-bold text-slate-900">이 목록을 고른 기준</h2>
        <p>
          여기 모은 열네 가지는 임상에서 쓰는 심리검사가 아닙니다. 검사지의 신뢰도나 타당도를
          검증받은 도구가 아니라, 자기 성향을 말로 꺼내 보게 하는 가벼운 문항 묶음입니다. 그래서
          결과를 진단으로 읽지 마시고, 평소에 잘 설명하지 못했던 자기 반응에 이름을 붙여 보는
          계기 정도로 쓰시길 권합니다. 우울·불안·수면 문제처럼 생활에 실제로 영향을 주는 어려움은
          이런 테스트가 아니라 전문가와 상의해야 할 영역입니다.
        </p>
        <h2 className="text-lg font-bold text-slate-900">결과를 읽을 때</h2>
        <p>
          문항형 테스트는 답할 때의 기분에 크게 좌우됩니다. 같은 사람이 일주일 간격으로 다시
          풀면 유형이 바뀌는 일이 흔합니다. 결과 화면에서 &quot;맞다&quot;고 느껴지는 문장만
          기억에 남기 쉬운데, 틀렸다고 느낀 문장도 함께 세어 보면 이 결과를 어느 정도로 믿어야
          할지 감이 잡힙니다. 유형 이름보다 그 안에 적힌 설명 문장이 실제로 쓸모 있는 부분입니다.
        </p>
        <h2 className="text-lg font-bold text-slate-900">상세 페이지가 어떻게 만들어졌는지</h2>
        <p>
          각 테스트의 상세 페이지는 카탈로그에 정리된 항목(주제·소요 시간·확인 포인트)을 공통 틀에
          대입해 자동으로 구성한 안내문입니다. 편집팀이 한 건씩 검토하지 않기 때문에 그 사실을 각
          페이지 하단에 밝혀 두었고, 검색 색인에서도 제외했습니다. 테스트 자체는 외부 서비스에서
          진행되며, 이 사이트는 문항이나 채점 결과를 저장하지 않습니다.
        </p>
      </section>

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
