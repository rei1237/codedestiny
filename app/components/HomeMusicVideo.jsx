import Link from 'next/link';
import { moonlightVideo } from '../../lib/marketing/moonlight-video.mjs';
import styles from './HomeMusicVideo.module.css';

export default function HomeMusicVideo() {
  return <section className={styles.scene} aria-labelledby="homeMusicVideoTitle">
    <div className={styles.copy}>
      <h2 id="homeMusicVideoTitle">달빛 운명여행</h2>
      <p>작은 등불 하나에서 시작해 다섯 하늘을 건너, 두 달 아래에서 다시 만나는 이야기</p>
      <p className={styles.note}>뮤직비디오 · 1분 33초 · 한국어 가사 자막<br />재생하면 소리가 나와요.</p>
      <Link href={moonlightVideo.playlist}>음악 플레이리스트 듣기 <span aria-hidden="true">→</span></Link>
    </div>
    <video className={styles.video} controls playsInline preload="none" poster={moonlightVideo.poster} width="960" height="540" aria-label="달빛 운명여행 뮤직비디오">
      <source src={moonlightVideo.src720} type="video/mp4" />
      <track kind="subtitles" srcLang="ko" label="한국어 가사" src={moonlightVideo.captions} default />
      <a href={moonlightVideo.src720}>뮤직비디오 열기</a>
    </video>
  </section>;
}
