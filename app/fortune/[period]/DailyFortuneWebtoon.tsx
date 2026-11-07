/**
 * 오늘·내일의 운세 웹툰 — 서버 컴포넌트.
 *
 * 🔴 "use client" 를 붙이지 말 것. 말풍선은 figcaption HTML 이라 서버 렌더 본문으로 잡혀야 한다
 *    (verify-adsense-readiness · verify-indexable-prose-depth).
 */
import CutReader from "@/app/components/webtoon/CutReader";
import { buildDailyWebtoon, type DailyWebtoonInput } from "@/lib/fortune/daily-webtoon";
import styles from "./daily-fortune-webtoon.module.css";

export default function DailyFortuneWebtoon(input: DailyWebtoonInput) {
  const toon = buildDailyWebtoon(input);
  return (
    <section aria-labelledby="daily-webtoon-heading" className={styles.webtoon}>
      <div className={styles.head}>
        <p className={styles.eyebrow}>달빛 운세 웹툰</p>
        <h2 id="daily-webtoon-heading">{toon.heading}</h2>
        <p className={styles.lead}>{toon.lead}</p>
      </div>
      {/* 페이지 중간이라 LCP 후보가 아니다 — 첫 컷도 지연 로드한다. */}
      <CutReader cuts={toon.cuts} eager={0} tone="yehwa" />
      <p className={styles.note}>{toon.note}</p>
    </section>
  );
}
