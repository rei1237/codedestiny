import type { ReactNode } from 'react';
import { formatKst } from '@/lib/yeongnyangi/serial.mjs';
import styles from './page-reader.module.css';

type NextEpisode = { href: string; no: number; title: string };
type Upcoming = { no: number; publishAt: string | null };

/** 영냥이 시즌 1 회차(1화 프롤로그·2~7화) 끝 카드: 공감 문장, 영냥이 CTA, 다음 화 링크 또는 공개 시각, 시즌 목차.
 *  다음 화가 아직 공개 전이면 시각만 알리고 제목은 드러내지 않는다. 둘 다 없으면 시즌 완결로 본다. */
export default function SerialEndCard({ id, heading, children, next, upcoming }: {
  id: string; heading: string; children: ReactNode; next?: NextEpisode | null; upcoming?: Upcoming | null;
}) {
  return <section className={styles.end} aria-labelledby={id}>
    <h2 id={id}>{heading}</h2>
    <p>{children}</p>
    <a className={styles.cta} href="/yeongnyangi/">영냥이에게 내 운 물어보기</a>
    {next
      ? <a className={styles.next} href={next.href} rel="next"><small>다음 화</small>{next.no}화 「{next.title}」 읽기 →</a>
      : <p className={styles.next} data-serial-next=""><small>다음 화</small>{upcoming ? (upcoming.publishAt ? `${upcoming.no}화 ${formatKst(upcoming.publishAt)} 공개` : `${upcoming.no}화 준비 중이에요`) : '시즌 1 완결'}</p>}
    <ul className={styles.links}>
      <li><a href="#p-01">처음부터 다시 보기</a></li>
      <li><a href="/yeongnyangi/season-1/">시즌 1 목차</a></li>
      <li><a href="/">꿀꿀 운세 홈</a></li>
    </ul>
  </section>;
}
