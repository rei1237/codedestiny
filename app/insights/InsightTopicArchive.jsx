import Link from "next/link";
import { INSIGHT_SEED_ARTICLES } from "./seed-articles";

function topicMatcher(topic) {
  const normalized = String(topic || "all").toLowerCase();

  if (normalized === "all") return () => true;
  if (normalized === "compatibility") {
    return (item) => /궁합|compatibility|연애/.test(`${item.title} ${item.category} ${(item.tags || []).join(" ")}`.toLowerCase());
  }

  return (item) => {
    const bag = `${item.title} ${item.category} ${(item.tags || []).join(" ")}`.toLowerCase();
    if (normalized === "saju") return /사주|만세력|일간|십성|오행/.test(bag);
    if (normalized === "ziwei") return /자미두수|ziwei|12궁|명궁|재백궁|관록궁/.test(bag);
    if (normalized === "sukuyo") return /숙요|27숙|영친|업태|안괴/.test(bag);
    if (normalized === "tarot") return /타로|arcana|card|스프레드/.test(bag);
    if (normalized === "astrology") return /점성술|astrology|출생차트|상승궁|하우스/.test(bag);
    if (normalized === "vedic") return /베다|vedic|라그나|나크샤트라|다샤/.test(bag);
    if (normalized === "dream") return /꿈|해몽/.test(bag);
    return false;
  };
}

export default function InsightTopicArchive({ topic, title, intro, serviceCtaPath }) {
  const items = INSIGHT_SEED_ARTICLES.filter(topicMatcher(topic)).slice(0, 48);
  const representativeTags = Array.from(new Set(items.flatMap((item) => item.tags || []).filter(Boolean))).slice(0, 12);
  const beginnerGuides = items.slice(0, 6);
  const practicalGuides = items.slice(6, 12);

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
              <p className="text-xs text-slate-400">{article.category}</p>
              <h3 className="mt-1 text-sm font-semibold leading-6 text-slate-100">{article.title}</h3>
              <p className="mt-2 text-xs leading-6 text-slate-300 line-clamp-3">{article.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#0f1525] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">최신 글</h2>
        <ul className="mt-4 space-y-2">
          {items.map((article) => (
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
          {beginnerGuides.map((article) => (
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
          {practicalGuides.map((article) => (
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
