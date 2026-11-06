import Image from 'next/image';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import StoryShelf from './StoryShelf';
import { homeStories } from './home-stories';
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
  return <StoryShelf className={styles.shelf}>
    <h2 id="homeStoryTitle">달빛 상담 웹툰 서가</h2>
    <a className={styles.feature} data-yn-night="" href="/yeongnyangi/room/#story" data-story-id="yeongnyangi">
      <Image src="/assets/yeongnyangi/original/hero-800.webp" width={320} height={320} sizes="(max-width:699px) 40vw, 300px" alt="달빛 점술방의 영냥이" />
      <div><small>영냥이</small><h3>내 이름이 네오였던 밤</h3><p>거울 앞의 네오가 어떻게 영냥이가 되었을까요?</p><strong>첫 화 읽기 →</strong></div>
    </a>
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
