import Link from "next/link";
import { INSIGHT_ARTICLES, getArticlesByTopic } from "./articles";

function topicMatcher(topic) {
  const normalized = String(topic || "all").toLowerCase();

  if (normalized === "all") return () => true;

  return (item) => {
    const bag = `${item.title || ""} ${item.category || ""} ${(item.tags || []).join(" ")} ${(item.keywords || []).join(" ")}`.toLowerCase();
    if (normalized === "saju") return /사주|명리|만세력|오행|일간/.test(bag);
    if (normalized === "ziwei") return /자미두수|명궁|관록궁|궁위/.test(bag);
    if (normalized === "sukuyo") return /숙요|27숙|영친|안괴|업태/.test(bag);
    if (normalized === "tarot") return /타로|아르카나|카드|스프레드/.test(bag);
    if (normalized === "astrology") return /점성술|출생차트|상승궁|하우스/.test(bag);
    if (normalized === "vedic") return /베다|라그나|나크샤트라|다샤/.test(bag);
    if (normalized === "compatibility") return /궁합|인연|관계|compatibility/.test(bag);
    if (normalized === "dream") return /꿈|해몽|태몽/.test(bag);
    return false;
  };
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function InsightTopicArchive({ topic, title, intro, serviceCtaPath }) {
  const matcher = topicMatcher(topic);
  const topicItems = getArticlesByTopic(topic);
  const matched = topicItems.length > 0 ? topicItems : INSIGHT_ARTICLES.filter(matcher);
  const items = matched.length > 0 ? matched : INSIGHT_ARTICLES.slice(0, 12);
  const representativeTags = Array.from(new Set(items.flatMap((item) => item.tags || item.keywords || []).filter(Boolean))).slice(0, 12);
  const beginnerGuides = items.filter((item) => /기초|입문|처음|보는 법|란\?/.test(`${item.title} ${item.excerpt || item.description}`)).slice(0, 6);
  const practicalGuides = items.filter((item) => /해석|실전|흐름|관계|재물|사랑|직업/.test(`${item.title} ${item.excerpt || item.description}`)).slice(0, 6);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 text-slate-100 md:px-6 md:py-10">
      <header className="rounded-3xl border border-white/10 bg-[#10172b] px-5 py-6 md:px-8 md:py-8">
        <h1 className="text-2xl font-semibold text-amber-50 md:text-4xl">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-300 md:text-base">{intro}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {representativeTags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-slate-200">
              #{tag}
            </span>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={serviceCtaPath} className="rounded-xl border border-amber-200/40 bg-amber-200/10 px-4 py-2 text-sm hover:bg-amber-200/20">
            관련 기능 바로 시작하기
          </Link>
          <Link href="/insights" className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
            인사이트 전체 보기
          </Link>
        </div>
      </header>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#0f1629] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">추천 글</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 12).map((article) => (
            <Link
              key={article.slug}
              href={`/insights/${article.slug}`}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 hover:bg-white/10"
            >
              <p className="text-xs text-slate-400">
                {article.category}
                {formatDate(article.publishedAt) ? ` · ${formatDate(article.publishedAt)}` : ""}
              </p>
              <h3 className="mt-1 text-sm font-semibold leading-6 text-slate-100">{article.title}</h3>
              <p className="mt-2 text-xs leading-6 text-slate-300 line-clamp-3">{article.excerpt || article.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#0f1525] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">최신 글</h2>
        <ul className="mt-4 space-y-2">
          {items.slice(0, 10).map((article) => (
            <li key={`latest-${article.slug}`} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <Link href={`/insights/${article.slug}`} className="text-sm leading-6 text-slate-100 hover:text-amber-100">
                {article.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#11182b] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">초보자 가이드</h2>
        <ul className="mt-4 space-y-2">
          {(beginnerGuides.length > 0 ? beginnerGuides : items.slice(0, 6)).map((article) => (
            <li key={`beginner-${article.slug}`} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <Link href={`/insights/${article.slug}`} className="text-sm leading-6 text-slate-100 hover:text-amber-100">
                {article.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#11182b] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">실전 해석 글</h2>
        <ul className="mt-4 space-y-2">
          {(practicalGuides.length > 0 ? practicalGuides : items.slice(0, 6)).map((article) => (
            <li key={`practical-${article.slug}`} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <Link href={`/insights/${article.slug}`} className="text-sm leading-6 text-slate-100 hover:text-amber-100">
                {article.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
