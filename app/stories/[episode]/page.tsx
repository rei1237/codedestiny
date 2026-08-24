import Link from "next/link";
import { notFound } from "next/navigation";
import StoryIntegrityNote from "../../components/StoryIntegrityNote";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildBreadcrumbJsonLd } from "../../../lib/structured-data";
import {
  ARC_GUIDE_LINKS,
  STORY_EPISODES,
  STORY_LOGLINES,
  STORY_SPEAKERS,
  countKorean,
  getArcForIndex,
  getEpisodeBySlug,
  getEpisodeIndex,
  readingMinutes,
} from "../../../lib/stories/vn";

export const dynamicParams = false;

export function generateStaticParams() {
  return STORY_EPISODES.map((episode) => ({ episode: episode.slug }));
}

export function generateMetadata({ params }: { params: { episode: string } }) {
  const episode = getEpisodeBySlug(params.episode);
  if (!episode) return {};

  const logline = STORY_LOGLINES[episode.slug] || "";
  const arc = getArcForIndex(getEpisodeIndex(episode.slug));
  // description 은 사이트맵 전 라우트에 걸쳐 유일해야 하고 50자 이상이어야 한다.
  // 로그라인만으로는 짧을 수 있어 아크 이름과 분량 정보를 덧붙인다.
  const description = `${logline} 연이의 운명 노벨 ${episode.no}${
    arc ? ` · ${arc.title}` : ""
  }. 읽는 시간 약 ${readingMinutes(episode)}분의 창작 소설입니다.`;

  return buildSeoMetadata({
    path: `/stories/${episode.slug}`,
    title: `${episode.no} ${episode.title} — 연이의 운명 노벨 | Code Destiny`,
    description,
    keywords: ["연이의 운명 노벨", episode.title, "사주 소설", "운세 웹소설"],
  });
}

export default function StoryEpisodePage({ params }: { params: { episode: string } }) {
  const episode = getEpisodeBySlug(params.episode);
  if (!episode) notFound();

  const index = getEpisodeIndex(episode.slug);
  const arc = getArcForIndex(index);
  const guide = arc ? ARC_GUIDE_LINKS[arc.key] : null;
  const previous = index > 0 ? STORY_EPISODES[index - 1] : null;
  const next = index < STORY_EPISODES.length - 1 ? STORY_EPISODES[index + 1] : null;

  // 화면 빵부스러기(아래 nav)와 같은 계층을 구조화 데이터로도 내보낸다. 구글은 둘이
  // 일치할 때만 검색 결과에 경로를 그려 주고, 색인이 돼도 이게 없으면 맨 URL 로 나온다.
  // 🔴 아크는 <span> 이라 링크가 없다 — 링크 없는 마디를 넣으면 화면과 어긋나므로 뺀다.
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "연이의 운명 노벨", path: "/stories/" },
    { name: `${episode.no} ${episode.title}`, path: `/stories/${episode.slug}/` },
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 text-slate-100 md:px-6 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <nav aria-label="위치" className="flex flex-wrap gap-2 text-xs text-slate-300">
        <Link href="/stories/" className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 hover:text-amber-100">
          연이의 운명 노벨
        </Link>
        {arc ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{arc.title}</span> : null}
      </nav>

      <header className="mt-5 border-b border-white/10 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100/70">
          {episode.no} · {index + 1} / {STORY_EPISODES.length}
        </p>
        <h1 className="mt-3 break-keep text-3xl font-bold leading-tight text-amber-50 md:text-4xl">{episode.title}</h1>
        {STORY_LOGLINES[episode.slug] ? (
          <p className="mt-3 break-keep text-sm leading-7 text-slate-300 md:text-base">{STORY_LOGLINES[episode.slug]}</p>
        ) : null}
        <p className="mt-3 text-xs text-slate-400">
          한글 약 {countKorean(episode).toLocaleString()}자 · 읽는 시간 약 {readingMinutes(episode)}분
        </p>
      </header>

      <article className="mt-8">
        {episode.beats.map((beat, beatIndex) => {
          const speaker = STORY_SPEAKERS[beat.s] ?? "";
          return (
            <div key={`${episode.slug}-${beatIndex}`}>
              {beat.sceneBreak ? (
                <p aria-hidden="true" className="my-8 text-center text-sm tracking-[0.5em] text-slate-500">
                  ＊ ＊ ＊
                </p>
              ) : null}
              {speaker ? (
                <p className="mt-5 break-keep text-sm leading-8 text-slate-200 md:text-base">
                  <strong className="text-amber-100">{speaker}</strong>
                  <span className="mx-1.5 text-slate-500">—</span>
                  {beat.t}
                </p>
              ) : (
                <p className="mt-5 break-keep text-sm leading-8 text-slate-300 md:text-base">{beat.t}</p>
              )}
            </div>
          );
        })}
      </article>

      <nav aria-label="화 이동" className="mt-10 flex items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm">
        {previous ? (
          <Link href={`/stories/${previous.slug}/`} className="text-slate-300 hover:text-amber-100">
            ← {previous.no} {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/stories/${next.slug}/`} className="text-right text-slate-300 hover:text-amber-100">
            {next.no} {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/stories/"
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:border-amber-200/40 hover:text-amber-100"
        >
          전체 목차
        </Link>
        {guide ? (
          <Link
            href={guide.href}
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:border-amber-200/40 hover:text-amber-100"
          >
            {guide.label}
          </Link>
        ) : null}
        <a
          href="/codedestiny-novel.html"
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:border-amber-200/40 hover:text-amber-100"
        >
          비주얼 노벨로 읽기
        </a>
      </div>

      <StoryIntegrityNote />
    </main>
  );
}
