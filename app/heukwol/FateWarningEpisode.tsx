import styles from './fate-warning.module.css';
import CutReader, { type WebtoonCut } from '@/app/components/webtoon/CutReader';
import { consultationWebtoons } from '@/lib/brand/consultation-webtoons.mjs';

const episode = (consultationWebtoons as Record<string, { title: string; cuts: WebtoonCut[] }>).heukwol;

// 경고를 단정적인 예언이 아닌 선택을 살피는 계기로 전한다. 대사는 HTML로 유지한다.
export default function FateWarningEpisode() {
  return (
    <section id="heukwol-story" className={styles.story} aria-labelledby="heukwol-episode-title">
      <header className={styles.title}>
        <p>흑월의 경고 · 서장 · {episode.cuts.length}컷</p>
        <h2 id="heukwol-episode-title">{episode.title}</h2>
        <p>길을 잃은 손님 앞에 흑월의 경고가 도착했다.<br />연이와 네오는 함께 방향을 찾아 나선다.</p>
      </header>

      <CutReader cuts={episode.cuts} tone="night" eager={1} />

      <footer className={styles.ending}>
        <p>당신의 한 해에는 언제,<br />무엇을 살펴보면 좋을까요?</p>
        <a href="#heukwol-profile">나의 주의 흐름 살펴보기 <span aria-hidden="true">→</span></a>
      </footer>
    </section>
  );
}
