import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CutReader, { type WebtoonCut } from '@/app/components/webtoon/CutReader';
import { SEASON_ONE } from '@/lib/yeongnyangi/season-1.mjs';
import { formatKst, nextRelease, publishedEpisodes, serialNow } from '@/lib/yeongnyangi/serial.mjs';
import styles from '../season.module.css';

type Props = { params: Promise<{ episode: string }> };
type Episode = (typeof SEASON_ONE.episodes)[number] & { cuts: WebtoonCut[]; href: string };

// 공개된 회차만 정적 경로로 만든다. 예약 회차는 페이지 자체가 생성되지 않아 직접 URL로도 열리지 않는다.
export const dynamicParams = false;
const published = () => publishedEpisodes(serialNow()) as Episode[];
export function generateStaticParams() { return published().map(episode => ({ episode: episode.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { episode: slug } = await params;
  const episode = published().find(item => item.slug === slug);
  if (!episode) return {};
  const title = `영냥이 시즌 1 · ${episode.no}화 ${episode.title} | 꿀꿀 운세`;
  const cover = episode.cuts.find(cut => cut.cover) || episode.cuts[0];
  // 회차는 빌드 시각에 따라 공개되므로 추적본 사이트맵에 넣을 수 없다. 색인은 시즌 목록(사이트맵 등재)이 맡는다.
  return { title, description: episode.logline, alternates: { canonical: episode.href }, robots: { index: false, follow: true },
    openGraph: { title, description: episode.logline, images: [{ url: `${cover.src}-${cover.fallback}.webp`, width: cover.fallback, height: Math.round(cover.h * cover.fallback / cover.w) }] } };
}

export default async function EpisodePage({ params }: Props) {
  const { episode: slug } = await params;
  const now = serialNow();
  const list = published();
  const index = list.findIndex(item => item.slug === slug);
  if (index < 0) notFound();
  const episode = list[index], prev = list[index - 1], next = list[index + 1], upcoming = next ? null : nextRelease(now);
  return <article className={styles.wrap} lang="ko" data-serial-episode={episode.slug}>
    <header className={styles.episodeHead}>
      <small>{SEASON_ONE.title} · {episode.no}화</small>
      <h1>{episode.title}</h1>
      <time dateTime={episode.publishAt}>{formatKst(episode.publishAt)} 공개</time>
    </header>
    <CutReader cuts={episode.cuts} tone="night" />
    <p className={styles.question}>{episode.nextQuestion}</p>
    <nav className={styles.pager} aria-label="회차 이동">
      {prev
        ? <a href={prev.href} rel="prev"><small>← 이전 화</small>{prev.no}화 {prev.title}</a>
        : <a href={SEASON_ONE.prologue.href}><small>← 프롤로그</small>{SEASON_ONE.prologue.title}</a>}
      {next
        ? <a className={styles.next} href={next.href} rel="next"><small>다음 화 →</small>{next.no}화 {next.title}</a>
        : <span className={styles.next} data-serial-next><small>다음 화</small>{upcoming?.publishAt ? `${formatKst(upcoming.publishAt)} 공개` : upcoming ? '준비 중' : '시즌 1 완결'}</span>}
    </nav>
    <section className={styles.cta} aria-label="영냥이에게 묻기">
      <p>영냥이는 대답을 미루지 않기로 했어요.<br />미뤄 둔 고민이 있다면 생선 한 마리로 물어보세요.</p>
      <a href="/yeongnyangi/">영냥이에게 고민 털어놓기</a>
    </section>
    <p className={styles.links}><a href="/yeongnyangi/season-1/">시즌 1 목차</a><a href="/">꿀꿀 운세 홈</a></p>
  </article>;
}
