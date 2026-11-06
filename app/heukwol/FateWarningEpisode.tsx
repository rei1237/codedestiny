import styles from './fate-warning.module.css';
import CutReader, { type WebtoonCut } from '@/app/components/webtoon/CutReader';
import { consultationWebtoons } from '@/lib/brand/consultation-webtoons.mjs';

const episode = (consultationWebtoons as Record<string, { title: string; cuts: WebtoonCut[] }>).heukwol;

// 흑월은 먼저 경고하고, 징조는 실제로 나타난다. 연이가 단서를 찾고 네오의 선택이 다른 길을 연다.
// 흑월을 틀린 악역으로 만들지 않는다 — 대사는 모두 HTML로 남겨 읽고 선택할 수 있게 한다.
export default function FateWarningEpisode() {
  return (
    <section id="heukwol-story" className={styles.story} aria-labelledby="heukwol-episode-title">
      <header className={styles.title}>
        <p>흑월의 경고 · 서장 · {episode.cuts.length}컷</p>
        <h2 id="heukwol-episode-title">{episode.title}</h2>
        <p>흑월은 이 문을 열면 끝이라고 했다.<br />연이는 문 너머에서 대답을 들었다.</p>
      </header>

      <CutReader cuts={episode.cuts} tone="night" eager={1} />

      <footer className={styles.ending}>
        <p>그녀가 보여준 미래.<br />우리는 다른 길을 찾기로 했다.</p>
        <a href="#heukwol-profile">나의 흐름 살펴보기 <span aria-hidden="true">→</span></a>
      </footer>
    </section>
  );
}
