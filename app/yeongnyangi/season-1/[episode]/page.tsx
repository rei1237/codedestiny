import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PageReader from '@/app/components/webtoon/PageReader';
import PageReaderChrome from '@/app/components/webtoon/PageReaderChrome';
import SerialEndCard from '@/app/components/webtoon/SerialEndCard';
import { SEASON_ONE } from '@/lib/yeongnyangi/season-1.mjs';
import { PAGE_WIDTHS, formatKst, nextRelease, publishedEpisodes, serialNow } from '@/lib/yeongnyangi/serial.mjs';
import readerStyles from '@/app/components/webtoon/page-reader.module.css';
import styles from '../season.module.css';

type Props = { params: Promise<{ episode: string }> };
type Episode = (typeof SEASON_ONE.episodes)[number] & { href: string; dir: string };

// 공개된 회차만 정적 경로로 만든다. 예약 회차는 페이지 자체가 생성되지 않아 직접 URL로도 열리지 않는다.
export const dynamicParams = false;
const published = () => publishedEpisodes(serialNow()) as Episode[];
const COVER_W = PAGE_WIDTHS[PAGE_WIDTHS.length - 1];
// output:'export'는 빈 경로 목록을 빌드 오류로 막는다. 공개 회차가 하나도 없으면 자리표시 경로 하나만 만들고 그 페이지는 목차·1화로 안내한다.
// notFound()를 쓰면 Next가 noindex meta를 하나 더 넣어 verify-dist robots-meta-count에 걸린다.
const NO_EPISODE_PLACEHOLDER = '_';
export function generateStaticParams() {
  const list = published();
  return list.length ? list.map(episode => ({ episode: episode.slug })) : [{ episode: NO_EPISODE_PLACEHOLDER }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { episode: slug } = await params;
  const episode = published().find(item => item.slug === slug);
  if (!episode) return slug === NO_EPISODE_PLACEHOLDER ? { title: '영냥이 시즌 1 | 꿀꿀 운세', description: `영냥이의 점술방 시즌 1은 1화 「${SEASON_ONE.prologue.title}」부터 읽을 수 있어요. 새 회차는 매주 토요일 밤 9시에 공개돼요.`, alternates: { canonical: '/yeongnyangi/season-1/' }, robots: { index: false, follow: true } } : {};
  const title = `영냥이 시즌 1 · ${episode.no}화 ${episode.title} | 꿀꿀 운세`;
  // 회차는 빌드 시각에 따라 공개되므로 추적본 사이트맵에 넣을 수 없다. 색인은 시즌 목록·1화(사이트맵 등재)가 맡는다.
  return { title, description: episode.logline, alternates: { canonical: episode.href }, robots: { index: false, follow: true },
    openGraph: { title, description: episode.logline, images: [{ url: `${episode.dir}/01-${COVER_W}.webp`, width: COVER_W, height: Math.round(episode.h * COVER_W / episode.w), alt: `${episode.no}화 ${episode.title} 표지` }] } };
}

export default async function EpisodePage({ params }: Props) {
  const { episode: slug } = await params;
  const now = serialNow();
  const list = published();
  const index = list.findIndex(item => item.slug === slug);
  if (index < 0 && slug === NO_EPISODE_PLACEHOLDER) return <article className={styles.wrap} lang="ko" data-serial-episode="none">
    <header className={styles.episodeHead}><small>{SEASON_ONE.title}</small><h1>아직 공개된 회차가 없어요</h1></header>
    <p className={styles.links}><a href={SEASON_ONE.prologue.href}>1화 「{SEASON_ONE.prologue.title}」 읽기</a><a href="/yeongnyangi/season-1/">시즌 1 목차</a></p>
  </article>;
  if (index < 0) notFound();
  const episode = list[index], next = list[index + 1], upcoming = next ? null : nextRelease(now);
  const headingId = `${episode.slug}-title`;
  return <main className={readerStyles.page} lang="ko" data-webtoon={`yeoni-s1-${episode.slug}`} data-serial-episode={episode.slug}>
    <PageReaderChrome title={`${episode.no}화 ${episode.title}`} total={episode.pages.length}
      backHref="/yeongnyangi/season-1/" backLabel="시즌 1 목차로" storageKey={`cd:webtoon:yeoni-s1-${episode.slug}:page`} />
    <article aria-labelledby={headingId}>
      <h1 id={headingId} className={readerStyles.srOnly}>{episode.title} · {SEASON_ONE.title} {episode.no}화 · {formatKst(episode.publishAt)} 공개</h1>
      <PageReader pages={episode.pages} dir={episode.dir} widths={PAGE_WIDTHS} w={episode.w} h={episode.h} />
    </article>
    <SerialEndCard id={`${episode.slug}-end`} heading={`${episode.no}화 「${episode.title}」`} next={next} upcoming={upcoming}>
      연이처럼 내 운도 어딘가 엉킨 것 같은 밤이라면,<br />영냥이가 실마리를 같이 찾아 드려요.
    </SerialEndCard>
  </main>;
}
