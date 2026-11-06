import type { Metadata } from 'next';
import { SEASON_ONE } from '@/lib/yeongnyangi/season-1.mjs';
import { formatKst, latestEpisode, nextRelease, publishedEpisodes, serialNow } from '@/lib/yeongnyangi/serial.mjs';
import type { WebtoonCut } from '@/app/components/webtoon/CutReader';
import styles from './season.module.css';

const TITLE = '영냥이의 점술방 시즌 1 | 꿀꿀 운세';
const DESCRIPTION = '달빛 점술방의 츤데레 고양이 영냥이와 연이의 겨울 이야기. 데워 둔 방석과 젖은 봉투에서 시작해 매주 토요일 밤 9시에 한 화씩 공개되는 시즌 1 웹툰입니다.';
export const metadata: Metadata = { title: TITLE, description: DESCRIPTION, alternates: { canonical: '/yeongnyangi/season-1/' }, openGraph: { title: TITLE, description: DESCRIPTION } };

export default function SeasonOne() {
  const now = serialNow();
  const episodes = publishedEpisodes(now) as Array<(typeof SEASON_ONE.episodes)[number] & { cuts: WebtoonCut[]; href: string }>;
  const latest = latestEpisode(now);
  const next = nextRelease(now);
  return <div className={styles.wrap} lang="ko">
    <header className={styles.head}>
      <small>{SEASON_ONE.schedule.label} 연재</small>
      <h1>{SEASON_ONE.title}</h1>
      <p>새침한 척하지만 화로는 늘 먼저 피워 두는 고양이. 영냥이와 연이가 한 장의 봉투를 따라가는 겨울 이야기예요.</p>
      {latest && <a className={styles.latest} href={latest.href} data-serial-latest>최신화 {latest.no}화 「{latest.title}」 읽기</a>}
    </header>
    <ol className={styles.list} aria-label="공개된 회차">
      {episodes.map(episode => {
        const cover = episode.cuts.find(cut => cut.cover) || episode.cuts[0];
        return <li key={episode.slug} className={styles.item}><a href={episode.href} data-serial-episode={episode.slug}>
          <picture>
            <source type="image/avif" srcSet={`${cover.src}-${cover.widths[0]}.avif`} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${cover.src}-${cover.fallback}.webp`} width={cover.w} height={cover.h} alt="" loading="lazy" decoding="async" />
          </picture>
          <div><b>{episode.no}화 · {formatKst(episode.publishAt).replace(/ \d+:\d+$/, '')}</b><strong>{episode.title}</strong><span>{episode.logline}</span></div>
        </a></li>;
      })}
    </ol>
    {next && <p className={styles.note} data-serial-next>{next.no}화는 {next.publishAt ? `${formatKst(next.publishAt)}에 공개돼요.` : '준비 중이에요.'}</p>}
    <p className={styles.note}>처음이라면 <a href={SEASON_ONE.prologue.href}>프롤로그 「{SEASON_ONE.prologue.title}」</a>부터 읽어 보세요.</p>
  </div>;
}
