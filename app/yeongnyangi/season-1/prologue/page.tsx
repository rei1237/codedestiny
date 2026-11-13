import type { Metadata } from 'next';
import PageReader from '@/app/components/webtoon/PageReader';
import PageReaderChrome from '@/app/components/webtoon/PageReaderChrome';
import SerialEndCard from '@/app/components/webtoon/SerialEndCard';
import { PROLOGUE, PROLOGUE_DIR, PROLOGUE_WIDTHS, prologuePage } from '@/lib/yeongnyangi/prologue.mjs';
import { SEASON_ONE } from '@/lib/yeongnyangi/season-1.mjs';
import { nextRelease, publishedEpisodes, serialNow } from '@/lib/yeongnyangi/serial.mjs';
import { pageOpenGraph } from '@/lib/seo/page-open-graph';
import styles from '@/app/components/webtoon/page-reader.module.css';

const TITLE = `${PROLOGUE.title} · 영냥이 시즌 1 · 1화 | 꿀꿀 운세`;
const PAGE_URL = `https://code-destiny.com${PROLOGUE.href}`;
const COVER_W = PROLOGUE_WIDTHS[PROLOGUE_WIDTHS.length - 1];

// 페이지가 openGraph를 선언하면 루트 layout의 og 값이 통째로 사라진다. pageOpenGraph로 공통 값을 채우고 표지만 바꾼다.
export const metadata: Metadata = {
  title: TITLE, description: PROLOGUE.logline, alternates: { canonical: PAGE_URL },
  openGraph: { ...pageOpenGraph(PAGE_URL), title: TITLE, description: PROLOGUE.logline,
    images: [{ url: `${prologuePage(1)}-${COVER_W}.webp`, width: COVER_W, height: Math.round(PROLOGUE.h * COVER_W / PROLOGUE.w), alt: `${PROLOGUE.title} 표지` }] },
};

export default function ProloguePage() {
  const now = serialNow();
  // 프롤로그 다음은 공개된 첫 회차. 아직 없으면 공개 예정 시각만 알린다(제목은 미리 드러내지 않는다).
  const first = publishedEpisodes(now)[0] as ((typeof SEASON_ONE.episodes)[number] & { href: string }) | undefined;
  const upcoming = first ? null : nextRelease(now);
  return <main className={styles.page} lang="ko" data-webtoon="yeoni-prologue">
    <PageReaderChrome title={PROLOGUE.title} total={PROLOGUE.pages.length}
      backHref="/yeongnyangi/season-1/" backLabel="시즌 1 목차로" storageKey="cd:webtoon:yeoni-s1-ep1:page" />
    <article aria-labelledby="prologue-title">
      <h1 id="prologue-title" className={styles.srOnly}>{PROLOGUE.title} · {SEASON_ONE.title} {PROLOGUE.subtitle}</h1>
      <PageReader pages={PROLOGUE.pages} dir={PROLOGUE_DIR} widths={PROLOGUE_WIDTHS} w={PROLOGUE.w} h={PROLOGUE.h} />
    </article>
    <SerialEndCard id="prologue-end" heading="괜히 보냈나, 싶은 밤이 있었나요?" next={first} upcoming={upcoming}>
      사과를 보내 놓고 답장을 기다리던 밤, 당신에게도 있었나요?<br />영냥이가 엉킨 운의 실마리를 같이 찾아 드려요.
    </SerialEndCard>
  </main>;
}
