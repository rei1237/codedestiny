import Link from "next/link";
import { buildSeoMetadata } from "../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../lib/structured-data";
import { publicSeoPages } from "../../lib/seo/siteSeo";
import { HIGH_VALUE_CATEGORIES, HIGH_VALUE_PAGES } from "./content";

const seo = publicSeoPages.highValue;

export const metadata = buildSeoMetadata(seo);

const HIGH_VALUE_PAGE_COPY = {
  ko: {
    categoryHeading: "카테고리",
  },
  en: {
    categoryHeading: "Categories",
  },
  ja: {
    categoryHeading: "カテゴリー",
  },
  zh: {
    categoryHeading: "分类",
  },
};

const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    buildBreadcrumbJsonLd([
      { name: "홈", path: "/" },
      { name: "운세 인사이트 가이드", path: "/high-value" },
    ]),
    buildCollectionPageJsonLd(seo),
  ],
});

export default function HighValueHubPage() {
  return (
    <main className="cd-main-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <nav aria-label="breadcrumb" className="cd-muted" style={{ marginBottom: "10px", fontSize: "0.88rem" }}>
        <Link href="/" className="cd-chip">홈</Link>
      </nav>

      <header className="cd-main-header">
        <h1 className="cd-main-title">운세 인사이트 가이드</h1>
        <p className="cd-main-intro">
          사주, 타로, 궁합, 점성술을 처음 접하는 분도 쉽게 이해할 수 있도록 핵심 개념과 해석 방법을 정리한 가이드입니다.
        </p>
      </header>

      <section style={{ marginBottom: "18px" }}>
        <h2>이 가이드를 어떻게 쓰면 좋은가</h2>
        <p>
          운세를 처음 찾아보는 사람이 가장 먼저 부딪히는 것은 해석이 아니라 용어입니다. 명식과 십성, 대운과
          세운, 라시와 나크샤트라처럼 이름부터 낯선 개념이 설명 없이 결과 화면에 먼저 나오기 때문입니다.
          이 가이드는 그 순서를 뒤집어, 결과를 읽기 전에 무엇을 보고 있는지부터 정리합니다.
        </p>
        <p>
          글은 여섯 갈래로 나뉩니다. 사주 입문은 만세력을 직접 펼쳐 보는 법을, 타로 리딩은 카드 자리와 배열의
          뜻을 다룹니다. 궁합과 관계는 사주 궁합과 숙요 궁합처럼 서로 다른 전통이 같은 질문을 어떻게 다르게
          푸는지 비교하고, 점성술과 자미두수는 동서양 두 체계의 계산 기준이 어디서 갈리는지 봅니다. 오늘의
          운세는 기간별 해석을 읽는 법을, 운세 콘텐츠 방법론은 AI가 낸 문장을 어디까지 믿을지 다룹니다.
        </p>
        <p>
          하나의 체계만 오래 보는 것보다 두세 개를 나란히 놓고 겹치는 지점과 엇갈리는 지점을 갈라 보는 편이
          도움이 됩니다. 서로 다른 전통이 같은 말을 할 때는 그만큼 뚜렷한 흐름이고, 엇갈릴 때는 그 차이가
          곧 질문을 다시 정리해야 한다는 신호이기 때문입니다.
        </p>
        <h2>{HIGH_VALUE_PAGE_COPY.ko.categoryHeading}</h2>
        <div className="cd-chip-wrap">
          {HIGH_VALUE_CATEGORIES.map((category) => (
            <Link key={category.slug} href={`/high-value/category/${category.slug}`} className="cd-chip">
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="cd-card-grid">
        {HIGH_VALUE_PAGES.map((item) => (
          <article key={item.slug} className="cd-card">
            <p style={{ margin: 0, fontSize: "12px", color: "#f8eecb" }}>{item.category}</p>
            <h2>
              <Link href={`/high-value/${item.slug}`} className="cd-link-reset">
                {item.title}
              </Link>
            </h2>
            <p>{item.summary}</p>
            <p className="cd-muted" style={{ fontSize: "12px" }}>
              작성일 {item.publishedAt} · 최종 수정일 {item.updatedAt}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
