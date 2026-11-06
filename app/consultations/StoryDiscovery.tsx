import Image from 'next/image';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import StoryShelf from './StoryShelf';
import { homeStories } from './home-stories';
import { SEASON_ONE } from '@/lib/yeongnyangi/season-1.mjs';
import { latestEpisode, serialNow } from '@/lib/yeongnyangi/serial.mjs';
import type { WebtoonCut } from '@/app/components/webtoon/CutReader';
import styles from './story-discovery.module.css';

const PICKS = ['tea', 'neo'];
function reader(id: string) {
  return id === 'heukwol' ? '/heukwol/#heukwol-story' : `/consultations/${id}/#story`;
}

type HomeStory = (typeof homeStories)[number];

function Cover({ id }: { id: string }) {
  const directory = '/images/consultation-webtoons/covers';
  return <picture className={styles.cover}>
    <source media="(max-width:430px) and (max-resolution:2dppx), (max-resolution:1dppx)" srcSet={`${directory}/mobile/${id}.webp`} />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={`${directory}/${id}.webp`} width={720} height={480} loading="lazy" decoding="async" alt="" />
  </picture>;
}

function StoryCard({ story }: { story: HomeStory }) {
  return <li><a className={styles.storyCard} href={reader(story.id)} data-story-id={story.id}>
    <Cover id={story.id} />
    <h3>{story.title}<ArrowUpRight size={15} aria-hidden="true" /></h3>
  </a></li>;
}

export default function StoryDiscovery() {
  const latest = latestEpisode(serialNow());
  const latestCover = latest && ((latest.cuts as WebtoonCut[]).find(cut => cut.cover) || latest.cuts[0]) as WebtoonCut | undefined;
  return <StoryShelf className={styles.shelf}>
    <h2 id="homeStoryTitle">달빛 상담 웹툰 서가</h2>
    {latest
      ? <a className={styles.feature} data-yn-night="" href={latest.href} data-story-id="yeongnyangi">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-serial-cover="" src={`${latestCover!.src}-${latestCover!.fallback}.webp`} width={latestCover!.fallback} height={Math.round(latestCover!.h * latestCover!.fallback / latestCover!.w)} loading="lazy" decoding="async" alt={latestCover!.alt} />
        <div><small>영냥이 · {SEASON_ONE.schedule.label} 연재</small><h3>{latest.no}화 {latest.title}</h3><p>{latest.logline}</p><strong>최신화 읽기 →</strong></div>
      </a>
      : <a className={styles.feature} data-yn-night="" href={SEASON_ONE.prologue.href} data-story-id="yeongnyangi">
        <Image src="/assets/yeongnyangi/original/hero-800.webp" width={320} height={320} sizes="(max-width:699px) 40vw, 300px" alt="달빛 점술방의 영냥이" />
        <div><small>영냥이</small><h3>{SEASON_ONE.prologue.title}</h3><p>거울 앞의 네오가 어떻게 영냥이가 되었을까요?</p><strong>프롤로그 읽기 →</strong></div>
      </a>}
    <ul className={styles.picks}>{PICKS.map(id => <StoryCard key={id} story={homeStories.find(item => item.id === id)!} />)}</ul>
    <details className={styles.more}>
      <summary>
        <span className={styles.sampleCovers} aria-hidden="true">
          <Cover id="love-secret" /><Cover id="new-year" />
        </span>
        <span className={styles.contentsTitle}>웹툰 전체 보기<small>총 {homeStories.length + 1}편</small></span>
        <ChevronDown size={20} aria-hidden="true" />
      </summary>
      <ul className={styles.collection}>{homeStories.filter(item => !PICKS.includes(item.id)).map(story =>
        <StoryCard key={story.id} story={story} />
      )}</ul>
    </details>
  </StoryShelf>;
}
