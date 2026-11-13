import { ArrowUpRight, ChevronDown } from 'lucide-react';
import StoryShelf from './StoryShelf';
import { homeStories } from './home-stories';
import { PROLOGUE, prologuePage } from '@/lib/yeongnyangi/prologue.mjs';
import { latestEpisode, serialNow } from '@/lib/yeongnyangi/serial.mjs';
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
  return <StoryShelf className={styles.shelf}>
    <h2 id="homeStoryTitle">달빛 상담 웹툰 서가</h2>
    {/* 대표 카드는 늘 시즌 1의 1화(프롤로그). 공개된 최신화는 카드 밖 보조 링크로 잇는다(링크 안 링크 방지). */}
    <a className={styles.feature} data-yn-night="" href={PROLOGUE.href} data-story-id="yeongnyangi-prologue">
      <picture>
        <source type="image/avif" srcSet={`${prologuePage(1)}-720.avif`} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-prologue-cover="" src={`${prologuePage(1)}-720.webp`} width={720} height={900} loading="lazy" decoding="async" alt={`${PROLOGUE.title} 표지. 늦은 아침 햇살이 꽃무늬 이불을 덮고 잠든 연이를 비춘다.`} />
      </picture>
      <div><small>영냥이 시즌 1 · 1화</small><h3>{PROLOGUE.title}</h3><p>{PROLOGUE.logline}</p><strong>첫 화 읽기 →</strong></div>
    </a>
    {latest && <a className={styles.latestLink} href={latest.href} data-serial-latest="">최신화 {latest.no}화 「{latest.title}」 이어 보기 →</a>}
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
