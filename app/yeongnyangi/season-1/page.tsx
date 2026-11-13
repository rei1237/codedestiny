import type { Metadata } from 'next';
import { SEASON_ONE } from '@/lib/yeongnyangi/season-1.mjs';
import { PROLOGUE, prologuePage } from '@/lib/yeongnyangi/prologue.mjs';
import { formatKst, latestEpisode, nextRelease, publishedEpisodes, serialNow } from '@/lib/yeongnyangi/serial.mjs';
import styles from './season.module.css';
import { pageOpenGraph } from '@/lib/seo/page-open-graph';

const TITLE = '영냥이의 점술방 시즌 1 | 꿀꿀 운세';
// 표시 폭 160 이하(verify-adsense-readiness, 한글 2칸).
const DESCRIPTION = '츤데레 고양이 영냥이와 연이의 노벨 웹툰. 알람이 울리지 않은 아침의 1화부터 매주 토요일 밤 9시에 한 화씩 공개됩니다.';
const PAGE_URL = 'https://code-destiny.com/yeongnyangi/season-1/';
// 페이지가 openGraph를 선언하면 루트 layout의 og:image·og:url이 통째로 사라진다. pageOpenGraph가 공통 값을 함께 채운다.
export const metadata: Metadata = { title: TITLE, description: DESCRIPTION, alternates: { canonical: PAGE_URL }, openGraph: { ...pageOpenGraph(PAGE_URL), title: TITLE, description: DESCRIPTION } };

export default function SeasonOne() {
  const now = serialNow();
  const episodes = publishedEpisodes(now) as Array<(typeof SEASON_ONE.episodes)[number] & { href: string; dir: string }>;
  const latest = latestEpisode(now);
  const next = nextRelease(now);
  return <div className={styles.wrap} lang="ko">
    <header className={styles.head}>
      <small>{SEASON_ONE.schedule.label} 연재</small>
      <h1>{SEASON_ONE.title}</h1>
      <p>자기 손으로 누르지 않은 버튼 하나에 낯선 세계로 떨어진 연이. 새침한 척하지만 늘 한발 먼저 와 있는 고양이 영냥이와 함께 엉킨 운을 풀어 가는 이야기예요.</p>
      {latest
        ? <a className={styles.latest} href={latest.href} data-serial-latest>최신화 {latest.no}화 「{latest.title}」 읽기</a>
        : <a className={styles.latest} href={PROLOGUE.href}>1화 「{PROLOGUE.title}」 읽기</a>}
    </header>
    {/* 표지는 각 회차의 1쪽. 공개 전 회차는 목록에 없고, 아래 안내에 번호와 시각만 나온다. */}
    <ol className={styles.list} aria-label="공개된 회차">
      <li className={styles.item}><a href={PROLOGUE.href} data-serial-episode="prologue">
        <picture>
          <source type="image/avif" srcSet={`${prologuePage(1)}-720.avif`} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${prologuePage(1)}-720.webp`} width={720} height={Math.round(PROLOGUE.h * 720 / PROLOGUE.w)} alt="" loading="lazy" decoding="async" style={{ objectPosition: '50% 0' }} />
        </picture>
        <div><b>1화 · {PROLOGUE.pages.length}쪽</b><strong>{PROLOGUE.title}</strong><span>{PROLOGUE.logline}</span></div>
      </a></li>
      {episodes.map(episode => <li key={episode.slug} className={styles.item}><a href={episode.href} data-serial-episode={episode.slug}>
        <picture>
          <source type="image/avif" srcSet={`${episode.dir}/01-720.avif`} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${episode.dir}/01-720.webp`} width={720} height={Math.round(episode.h * 720 / episode.w)} alt="" loading="lazy" decoding="async" style={{ objectPosition: '50% 0' }} />
        </picture>
        <div><b>{episode.no}화 · {episode.pages.length}쪽 · {formatKst(episode.publishAt).replace(/ \d+:\d+$/, '')}</b><strong>{episode.title}</strong><span>{episode.logline}</span></div>
      </a></li>)}
    </ol>
    {next && <p className={styles.note} data-serial-next>{next.no}화는 {next.publishAt ? `${formatKst(next.publishAt)}에 공개돼요.` : '준비 중이에요.'}</p>}
    {latest && <p className={styles.note}>처음이라면 <a href={SEASON_ONE.prologue.href}>1화 「{SEASON_ONE.prologue.title}」</a>부터 읽어 보세요.</p>}
  </div>;
}
