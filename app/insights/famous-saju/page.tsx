import Link from "next/link";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import { categoryToSlug, famousSajuCategories, publishedCelebritySajuSeeds } from "../../../lib/famous-saju/celebrity-saju-service";
import EditorNote from "../../components/EditorNote";
import { getEditorNote } from "../../_content/editor-notes";

const INSIGHTS_FAMOUS_SAJU_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    metadataTitle: "유명인 사주 분석 | 운세 인사이트 허브",
    metadataDescription: "공개 생년월일과 Code Destiny 명식 기준을 바탕으로 유명인의 일간, 오행, 삼주 흐름을 이야기형 사주 인사이트로 정리한 아카이브입니다.",
    keywords: ["유명인 사주", "연예인 사주", "이순신 사주", "아이유 사주", "BTS RM 사주", "운세 인사이트"],
    hubLink: "운세 인사이트 허브",
    kicker: "Famous Saju Insights",
    title: "유명인 사주 분석",
    intro: "출생 시간이 확인된 경우 시주까지, 그렇지 않은 경우 연주·월주·일주 중심으로 유명인의 명식 흐름을 조심스럽게 정리했습니다.",
    searchLabel: "유명인 사주 검색",
    searchPlaceholder: "이름, 분야, 태그 검색",
    articleCountSuffix: "개 글",
  },
  en: {
    metadataTitle: "Famous Saju Analysis | Fortune Insights Hub",
    metadataDescription: "An archive of story-style Saju insights for public figures, based on public birth data and Code Destiny chart standards.",
    keywords: ["famous Saju", "celebrity Saju", "Yi Sun-sin Saju", "IU Saju", "BTS RM Saju", "fortune insights"],
    hubLink: "Fortune Insights Hub",
    kicker: "Famous Saju Insights",
    title: "Famous Saju Analysis",
    intro: "When birth time is confirmed, we include the hour pillar; otherwise, each public figure is read carefully through the year, month, and day pillars.",
    searchLabel: "Search famous Saju",
    searchPlaceholder: "Search name, field, or tag",
    articleCountSuffix: " articles",
  },
  ja: {
    metadataTitle: "有名人の四柱推命分析 | 運勢インサイトハブ",
    metadataDescription: "公開生年月日とCode Destinyの命式基準をもとに、有名人の日干、五行、三柱の流れを物語型の四柱推命インサイトとして整理したアーカイブです。",
    keywords: ["有名人 四柱推命", "芸能人 四柱推命", "李舜臣 四柱推命", "IU 四柱推命", "BTS RM 四柱推命", "運勢インサイト"],
    hubLink: "運勢インサイトハブ",
    kicker: "Famous Saju Insights",
    title: "有名人の四柱推命分析",
    intro: "出生時刻が確認できる場合は時柱まで、そうでない場合は年柱・月柱・日柱を中心に、有名人の命式の流れを慎重に整理しました。",
    searchLabel: "有名人の四柱推命を検索",
    searchPlaceholder: "名前、分野、タグを検索",
    articleCountSuffix: "件の記事",
  },
} as const;

const famousSajuInsightCopy = INSIGHTS_FAMOUS_SAJU_PAGE_TEXT_TRANSLATIONS.ko;

export const metadata = generatePageMetadata({
  path: "/insights/famous-saju",
  title: famousSajuInsightCopy.metadataTitle,
  description: famousSajuInsightCopy.metadataDescription,
  keywords: famousSajuInsightCopy.keywords,
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
      hydrateRest();
      applyFilter();
    });
  });

  tagButtons.forEach((button) => {
    button.addEventListener("click", () => {
      tag = tag === button.getAttribute("data-famous-tag") ? "" : String(button.getAttribute("data-famous-tag") || "");
      setActive(tagButtons, tag, "data-famous-tag");
      hydrateRest();
      applyFilter();
    });
  });


  const deferredNode = document.getElementById("famousSajuDeferred");
  const grid = root.querySelector("[data-famous-grid]");
  const expandButton = root.querySelector("[data-famous-expand]");
  let hydrated = false;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildCard(entry) {
    const link = document.createElement("a");
    link.href = "/insights/famous-saju/" + encodeURIComponent(entry.slug);
    link.setAttribute("data-famous-card", "");
    link.setAttribute("data-category", entry.category);
    link.setAttribute("data-tags", "|" + entry.tags.join("|") + "|");
    link.setAttribute("data-search", entry.search);
    link.className = "group rounded-lg border border-white/10 bg-white/[0.045] p-4 transition hover:border-amber-200/50 hover:bg-white/[0.075]";
    const chips = entry.tags
      .slice(0, 3)
      .map((tag) => '<span class="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-200">' + escapeHtml(tag) + "</span>")
      .join("");
    link.innerHTML = '<div class="flex items-start justify-between gap-3"><div>'
      + '<p class="text-xs text-amber-100/70">' + escapeHtml(entry.category) + "</p>"
      + '<h2 class="mt-1 text-lg font-semibold text-white">' + escapeHtml(entry.nameKo) + "</h2>"
      + '<p class="mt-1 text-sm text-slate-400">' + escapeHtml(entry.birthLine) + "</p>"
      + '</div><span class="rounded-full border border-amber-200/30 px-2.5 py-1 text-xs text-amber-100">' + escapeHtml(entry.categorySlug) + "</span></div>"
      + '<p class="mt-3 line-clamp-2 text-sm leading-6 text-slate-300">' + escapeHtml(entry.shortDescription) + "</p>"
      + '<div class="mt-4 flex flex-wrap gap-2">' + chips + "</div>"
      + '<p class="mt-4 text-sm font-semibold text-amber-100 group-hover:text-amber-50">블로그 글 보기</p>';
    return link;
  }

  function hydrateRest() {
    if (hydrated || !deferredNode || !grid) return;
    hydrated = true;
    let entries = [];
    try {
      entries = JSON.parse(deferredNode.textContent || "[]");
    } catch (error) {
      entries = [];
    }
    const fragment = document.createDocumentFragment();
    entries.forEach((entry) => {
      const card = buildCard(entry);
      cards.push(card);
      fragment.appendChild(card);
    });
    grid.appendChild(fragment);
    if (expandButton) expandButton.remove();
  }

  if (expandButton) {
    expandButton.addEventListener("click", () => {
      hydrateRest();
      applyFilter();
    });
  }

  input?.addEventListener("input", () => {
    hydrateRest();
    applyFilter();
  });
  applyFilter();
})();
`;

// 심사자와 첫 방문자가 먼저 보아야 하는 것은 카드 벽이 아니라 이 허브의 편집 기준이다.
// 나머지 인물은 검색·태그 필터를 쓰거나 펼치기를 누르는 순간 클라이언트가 채운다(도달성은 그대로).
const SERVER_RENDERED_CARD_LIMIT = 24;

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
  const visibleSeeds = publishedCelebritySajuSeeds.slice(0, SERVER_RENDERED_CARD_LIMIT);
  const deferredSeeds = publishedCelebritySajuSeeds.slice(SERVER_RENDERED_CARD_LIMIT).map((item) => ({
    slug: item.slug,
    nameKo: item.nameKo,
    category: item.category,
    categorySlug: categoryToSlug(item.category),
    tags: item.tags,
    shortDescription: item.shortDescription,
    birthLine: `${item.birthDate?.slice(0, 4)}년생 · ${item.isBirthTimeKnown ? "시주 포함 분석" : "출생 시간 미상 분석"}`,
    search: [item.nameKo, item.name, item.nameEn, item.category, item.country, item.slug, ...item.aliases, ...item.tags, ...item.seoKeywords].filter(Boolean).join(" "),
  }));

  return (
    <main className="min-h-screen bg-[#090b18] text-slate-100" data-famous-saju-list>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="max-w-3xl">
          <Link href="/insights" className="text-sm font-semibold text-amber-100/80 hover:text-amber-50">
            {famousSajuInsightCopy.hubLink}
          </Link>
          <p className="mt-5 text-sm font-semibold text-amber-100/80">{famousSajuInsightCopy.kicker}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal text-white sm:text-5xl">{famousSajuInsightCopy.title}</h1>
          <p className="mt-5 text-base leading-8 text-slate-300">
            {famousSajuInsightCopy.intro}
          </p>
          <p className="mt-3 text-sm text-slate-400">
            아래 태그와 검색으로 인물·분야를 좁혀 볼 수 있습니다. 출생 시간이 확인되지 않은
            인물은 시주를 비운 삼주 기준으로 계산하며, 그 사실을 상세 페이지에 함께 적습니다.
          </p>
        </div>

        <section className="mt-10 max-w-3xl space-y-5 text-base leading-8 text-slate-300">
          <h2 className="text-xl font-semibold text-white">이 아카이브를 만드는 기준</h2>
          <p>
            유명인 사주를 다루는 이유는 인물을 평가하기 위해서가 아니라, 명식을 읽는 연습에 쓸 수 있는
            공개 표본이 필요하기 때문입니다. 사주는 생년월일시라는 네 개의 기둥에서 출발하는데, 자기
            명식만 들여다보면 무엇이 그 사람 고유의 특징이고 무엇이 그 시기 누구에게나 해당하는
            흐름인지 구분하기 어렵습니다. 생년월일이 공개된 인물의 명식을 여러 개 늘어놓고 비교하면
            그 경계가 눈에 들어옵니다.
          </p>
          <h2 className="text-xl font-semibold text-white">무엇을 근거로 세우고, 무엇을 세우지 못하는가</h2>
          <p>
            각 인물의 명식은 언론 보도·공식 프로필·백과사전처럼 공개된 자료에 적힌 생년월일로 세웁니다.
            추정하거나 역산한 날짜는 쓰지 않습니다. 출생 시간은 사정이 다릅니다 — 공개된 경우가 드물어
            대부분의 인물은 시주를 비운 채 연주·월주·일주 세 기둥만으로 읽습니다. 시주는 일간 다음으로
            해석 폭이 큰 자리라, 빠지면 성향·직업·관계에 대한 서술의 확신도가 함께 떨어집니다. 그래서
            각 상세 페이지 첫머리에 시주 포함 여부를 먼저 적어 두고, 시주가 없는 인물의 글에서는 시간대에
            의존하는 판단을 하지 않습니다.
          </p>
          <p>
            역사 인물은 한 가지 문제가 더 있습니다. 음력으로 기록된 생일을 양력으로 옮기는 과정과, 조선
            시대의 시간 기준이 지금의 표준시와 다르다는 점입니다. 이 아카이브는 기록에 남은 날짜를
            그대로 쓰되 환산 과정에서 생길 수 있는 오차를 상세 페이지에 함께 밝힙니다.
          </p>
          <h2 className="text-xl font-semibold text-white">읽을 때 지켜 주셨으면 하는 선</h2>
          <p>
            여기 실린 글은 명식이라는 구조를 설명하기 위한 예시입니다. 인물의 건강·수명·범죄·가족 관계처럼
            사생활에 속하는 영역은 명식으로 단정하지 않으며, 그런 방향의 서술은 싣지 않습니다. 공개된
            활동과 이력에 견주어 명식의 어떤 구성이 어떤 결로 읽히는지를 보여 주는 데까지가 이 아카이브의
            범위입니다. 같은 명식이라도 읽는 사람에 따라 다른 해석이 가능하다는 점도 함께 기억해 주세요.
          </p>
          <p>
            생년월일이나 서술에 잘못된 부분을 발견하시면{" "}
            <Link href="/contact" className="text-amber-100 underline">문의</Link>로 알려 주시면 확인 후
            수정합니다. 제작·검수 기준은{" "}
            <Link href="/editorial-policy" className="text-amber-100 underline">콘텐츠 제작 및 AI 활용 고지</Link>와{" "}
            <Link href="/methodology" className="text-amber-100 underline">운세 콘텐츠 방법론</Link>에 적어 두었습니다.
          </p>
        </section>

        <EditorNote note={getEditorNote("/insights/famous-saju")} className="mt-10 max-w-3xl" />

        <section className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="sr-only" htmlFor="famousSajuSearch">{famousSajuInsightCopy.searchLabel}</label>
            <input
              id="famousSajuSearch"
              data-famous-search
              className="min-h-11 w-full rounded-lg border border-white/15 bg-black/25 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-200/70 md:max-w-md"
              placeholder={famousSajuInsightCopy.searchPlaceholder}
              type="search"
            />
            <p className="text-sm text-slate-300">
              <span data-famous-count>{visibleSeeds.length}</span>{famousSajuInsightCopy.articleCountSuffix} · 전체 {publishedCelebritySajuSeeds.length}명
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

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-famous-grid>
          {visibleSeeds.map((item) => (
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

        {deferredSeeds.length > 0 ? (
          <div className="mt-8 text-center">
            <button
              type="button"
              data-famous-expand
              className="min-h-11 rounded-full border border-white/20 px-5 text-sm font-semibold text-slate-200 transition hover:border-amber-200/60 hover:text-amber-100"
            >
              나머지 {deferredSeeds.length}명 모두 보기
            </button>
            <p className="mt-3 text-xs text-slate-500">위 검색창에 이름이나 분야를 입력해도 전체 목록에서 찾습니다.</p>
          </div>
        ) : null}
      </section>
      <script
        id="famousSajuDeferred"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(deferredSeeds).replace(/</g, "\\u003c") }}
      />
      <script dangerouslySetInnerHTML={{ __html: filterScript }} />
    </main>
  );
}
