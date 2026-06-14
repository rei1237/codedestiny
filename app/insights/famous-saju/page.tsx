import Link from "next/link";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import { categoryToSlug, famousSajuCategories, publishedCelebritySajuSeeds } from "../../../lib/famous-saju/celebrity-saju-service";

export const metadata = generatePageMetadata({
  path: "/insights/famous-saju",
  title: "유명인 사주 분석 | 운세 인사이트 허브",
  description: "공개 생년월일과 Code Destiny 명식 기준을 바탕으로 유명인의 일간, 오행, 삼주 흐름을 이야기형 사주 인사이트로 정리한 아카이브입니다.",
  keywords: ["유명인 사주", "연예인 사주", "이순신 사주", "아이유 사주", "BTS RM 사주", "운세 인사이트"],
});

const filterScript = `
(() => {
  const root = document.querySelector("[data-famous-saju-list]");
  if (!root) return;
  const input = root.querySelector("[data-famous-search]");
  const count = root.querySelector("[data-famous-count]");
  const cards = Array.from(root.querySelectorAll("[data-famous-card]"));
  const categoryButtons = Array.from(root.querySelectorAll("[data-famous-category]"));
  const tagButtons = Array.from(root.querySelectorAll("[data-famous-tag]"));
  let category = "";
  let tag = "";

  function setActive(buttons, activeValue, attr) {
    buttons.forEach((button) => {
      const active = button.getAttribute(attr) === activeValue;
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.classList.toggle("border-amber-200", active);
      button.classList.toggle("bg-amber-100/15", active);
    });
  }

  function applyFilter() {
    const query = String(input?.value || "").trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const haystack = String(card.getAttribute("data-search") || "").toLowerCase();
      const cardCategory = String(card.getAttribute("data-category") || "");
      const cardTags = String(card.getAttribute("data-tags") || "");
      const matched = (!query || haystack.includes(query)) && (!category || cardCategory === category) && (!tag || cardTags.includes("|" + tag + "|"));
      card.classList.toggle("hidden", !matched);
      if (matched) visible += 1;
    });
    if (count) count.textContent = String(visible);
  }

  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      category = category === button.getAttribute("data-famous-category") ? "" : String(button.getAttribute("data-famous-category") || "");
      setActive(categoryButtons, category, "data-famous-category");
      applyFilter();
    });
  });

  tagButtons.forEach((button) => {
    button.addEventListener("click", () => {
      tag = tag === button.getAttribute("data-famous-tag") ? "" : String(button.getAttribute("data-famous-tag") || "");
      setActive(tagButtons, tag, "data-famous-tag");
      applyFilter();
    });
  });

  input?.addEventListener("input", applyFilter);
  applyFilter();
})();
`;

function getTopTags() {
  const counts = new Map<string, number>();
  for (const item of publishedCelebritySajuSeeds) {
    for (const tag of item.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)
    .map(([tag]) => tag);
}

export default function FamousSajuInsightIndexPage() {
  const tags = getTopTags();

  return (
    <main className="min-h-screen bg-[#090b18] text-slate-100" data-famous-saju-list>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="max-w-3xl">
          <Link href="/insights" className="text-sm font-semibold text-amber-100/80 hover:text-amber-50">
            운세 인사이트 허브
          </Link>
          <p className="mt-5 text-sm font-semibold text-amber-100/80">Famous Saju Insights</p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal text-white sm:text-5xl">유명인 사주 분석</h1>
          <p className="mt-5 text-base leading-8 text-slate-300">
            출생 시간이 확인된 경우 시주까지, 그렇지 않은 경우 연주·월주·일주 중심으로 유명인의 명식 흐름을 조심스럽게 정리했습니다.
          </p>
        </div>

        <section className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="sr-only" htmlFor="famousSajuSearch">유명인 사주 검색</label>
            <input
              id="famousSajuSearch"
              data-famous-search
              className="min-h-11 w-full rounded-lg border border-white/15 bg-black/25 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-200/70 md:max-w-md"
              placeholder="이름, 분야, 태그 검색"
              type="search"
            />
            <p className="text-sm text-slate-300">
              <span data-famous-count>{publishedCelebritySajuSeeds.length}</span>개 글
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {famousSajuCategories.map((category) => (
              <button
                key={category}
                type="button"
                data-famous-category={category}
                className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-slate-200 transition hover:border-amber-200/50 hover:text-amber-100"
              >
                {category}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                data-famous-tag={tag}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300 transition hover:border-amber-200/40 hover:text-amber-100"
              >
                #{tag}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publishedCelebritySajuSeeds.map((item) => (
            <Link
              key={item.slug}
              href={`/insights/famous-saju/${item.slug}`}
              data-famous-card
              data-category={item.category}
              data-tags={`|${item.tags.join("|")}|`}
              data-search={[item.nameKo, item.name, item.nameEn, item.category, item.country, item.slug, ...item.aliases, ...item.tags, ...item.seoKeywords].filter(Boolean).join(" ")}
              className="group rounded-lg border border-white/10 bg-white/[0.045] p-4 transition hover:border-amber-200/50 hover:bg-white/[0.075]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-amber-100/70">{item.category}</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">{item.nameKo}</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {item.birthDate?.slice(0, 4)}년생 · {item.isBirthTimeKnown ? "시주 포함 분석" : "출생 시간 미상 분석"}
                  </p>
                </div>
                <span className="rounded-full border border-amber-200/30 px-2.5 py-1 text-xs text-amber-100">{categoryToSlug(item.category)}</span>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-300">{item.shortDescription}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-200">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm font-semibold text-amber-100 group-hover:text-amber-50">블로그 글 보기</p>
            </Link>
          ))}
        </section>
      </section>
      <script dangerouslySetInnerHTML={{ __html: filterScript }} />
    </main>
  );
}
