import Image from 'next/image';
import { episodePanels } from './two-invoices';
import styles from './heukwol.module.css';

export default function TwoInvoicesEpisode() {
  return (
    <section id="heukwol-story" className={styles.episode} aria-labelledby="heukwol-episode-title">
      <header>
        <a href="/#homeStoryTitle">← 달빛 상담 웹툰 서가</a>
        <h2 id="heukwol-episode-title">제1화　두 장의 청구서</h2>
      </header>
      {episodePanels.map(({ number, width, height, alt, speaker, line }) => (
        <figure key={number} data-speaker={speaker}>
          <Image unoptimized className={styles.panel} src={`/images/consultation-webtoons/heukwol/two-invoices/${number}.webp`}
            width={width} height={height} alt={alt} loading={number === 1 ? 'eager' : 'lazy'} />
          <figcaption>{speaker && <strong>{speaker}</strong>}{line}</figcaption>
        </figure>
      ))}
      <footer><span>제1화 끝</span><a href="/#homeStoryTitle">서가로 돌아가기 ↑</a></footer>
    </section>
  );
}
