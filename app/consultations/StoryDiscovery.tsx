import Image from 'next/image';
import StoryShelf from './StoryShelf';
import { homeStories } from './home-stories';
import styles from './story-discovery.module.css';

const PICKS = ['tea', 'neo'];
function reader(id: string) {
  return id === 'heukwol' ? '/heukwol/#heukwol-story' : `/consultations/${id}/#story`;
}

export default function StoryDiscovery() {
  return <StoryShelf className={styles.shelf}>
    <h2 id="homeStoryTitle">달빛 상담 웹툰 서가</h2>
    <a className={styles.feature} data-yn-night="" href="/yeongnyangi/room/#story" data-story-id="yeongnyangi">
      <Image src="/assets/yeongnyangi/original/hero-800.webp" width={320} height={320} sizes="(max-width:699px) 40vw, 300px" alt="달빛 점술방의 영냥이" />
      <div><small>영냥이</small><h3>내 이름이 네오였던 밤</h3><p>거울 앞의 네오가 어떻게 영냥이가 되었을까요?</p><strong>첫 화 읽기 →</strong></div>
    </a>
    <div className={styles.picks}>{PICKS.map(id => {
      const story = homeStories.find(item => item.id === id)!;
      return <a key={id} href={reader(id)} data-story-id={id}>
        <Image src={`/images/consultation-webtoons/covers/${id}.webp`} width={720} height={480} sizes="(max-width:699px) 43vw, 340px" alt="" />
        <h3>{story.title}</h3>
      </a>;
    })}</div>
    <details className={styles.more}><summary>웹툰 전체 보기</summary><ul>
      {homeStories.filter(item => !PICKS.includes(item.id)).map(item => <li key={item.id}><a href={reader(item.id)} data-story-id={item.id}>{item.title}</a></li>)}
    </ul></details>
  </StoryShelf>;
}
