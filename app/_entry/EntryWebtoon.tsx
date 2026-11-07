import { ENTRY_WEBTOON, entryCuts } from '@/lib/brand/entry-webtoon.mjs';
import { cmsRecordFlat } from '@/lib/cms/build-text';
import { homeCopyDefaults } from '@/lib/cms/home-copy.mjs';
import { HOME_CONCERNS, freeEntryHref } from '@/lib/marketing/home-concerns.mjs';
// 기록 상수는 네임스페이스로 읽는다(정치어 정적 테스트의 허용 개수를 최소로 유지).
import * as trustStories from '@/lib/brand/trust-stories.mjs';
import { founder } from '@/lib/brand/founder';
import { resolveServerFeaturePricing } from '@/lib/payment/server-feature-pricing';
import PressCoverage from '@/app/components/PressCoverage';
import RecordCard from './RecordCard';
import { CustomerReviewCards, ReaderReactionCards } from './ReviewCards';
import OfferCard from './OfferChapters';
import ConcernPicker from './ConcernPicker';
import StickyCta from './StickyCta';
import EntryTracker from './EntryTracker';
import '../../styles/fonts-serif.css';
import styles from './entry-webtoon.module.css';

// 첫 화면(/) 진입 웹툰. 대본은 lib/brand/entry-webtoon.mjs, 기록·후기·언론·가격은 각 정본에서 읽는다.
// 대사·기록·CTA는 모두 서버 HTML이라 JS가 없거나 그림이 깨져도 읽고 누를 수 있다.

type HomeConcernId = (typeof HOME_CONCERNS)[number]['id'];
type EntryCut = ReturnType<typeof entryCuts>[number];
export type OfferPrices = {
  concern: Record<HomeConcernId, number | null>;
  bundle: number | null;
  signature: Array<{ featureKey: string; label: string; href: string; amountKRW: number | null }>;
};

const FROM = 'entry_webtoon';
const SIZES = '(max-width:680px) 100vw, 680px';
// 대표 상담 3종. 가격은 레지스트리(worker/lib/paid-feature-registry.js)에서만 읽는다.
const SIGNATURE = [
  { featureKey: 'love-secret-ai-consultation', label: '연애 비책', href: '/love-secret-ai/' },
  { featureKey: 'new-year-ai-consultation', label: '신년운세', href: '/new-year-ai-consultation/' },
  { featureKey: 'life-book-ai-consultation', label: '인생의 책', href: '/life-book-ai/' },
] as const;
const CHAPTER_LABEL: Record<string, string> = {
  imagine: '상상', record: '네오의 기록', decade: '10년의 상담', question: '당신의 질문', offer: '받을 수 있는 것', invite: '초대',
};
const SPEAKER: Record<string, string> = { yeoni: '연이', neo: '네오', pig: '꽃돼지 연이' };

/** 레지스트리가 답하지 못하면 null. 0·NaN도 "모른다"로 다룬다. */
function amountOf(featureKey: string): number | null {
  const amount = resolveServerFeaturePricing({ featureKey })?.amountKRW;
  return typeof amount === 'number' && Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function buildOfferPrices(): OfferPrices {
  return {
    concern: Object.fromEntries(HOME_CONCERNS.map(concern => [concern.id, amountOf(concern.featureKey)])) as OfferPrices['concern'],
    bundle: amountOf('saju_lifetime_bundle'),
    signature: SIGNATURE.map(item => ({ ...item, amountKRW: amountOf(item.featureKey) })),
  };
}

// 관리자(CMS ns home-copy · entry-webtoon)가 고친 대사. 필드 이름은 line:<cutId>:<index>, 비었거나 목록에 없는 키는 대본 원문.
const WEBTOON_COPY = cmsRecordFlat('home-copy', 'entry-webtoon', homeCopyDefaults()['entry-webtoon']);

function Lines({ cutId, lines }: { cutId: string; lines: EntryCut['lines'] }) {
  if (!lines.length) return null;
  return <div className={styles.lines}>
    {lines.map((line, index) => {
      const text = WEBTOON_COPY[`line:${cutId}:${index}`] ?? line.text;
      return line.speaker === 'caption'
        ? <p key={index} className={`${styles.line} ${styles.caption}`}>{text}</p>
        : <p key={index} className={`${styles.line} ${styles.bubble} ${styles[line.speaker]}`} data-speaker={line.speaker}>
            <span className={styles.speaker}>{SPEAKER[line.speaker]}</span>{text}
          </p>;
    })}
  </div>;
}

function CutPicture({ image, first }: { image: NonNullable<EntryCut['image']>; first: boolean }) {
  // Next 앱 라우터의 React 19는 카멜 fetchPriority 를 쓴다(소문자 fetchpriority 는 개발 경고). 첫 그림만 eager+high, 나머지는 lazy.
  const priority = first ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const };
  return <picture className={styles.picture}>
    <source type="image/avif" srcSet={`${image.src}-640.avif 640w, ${image.src}-1080.avif 1080w`} sizes={SIZES} />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className={styles.art} src={`${image.src}-720.webp`} width={image.w} height={image.h} alt={image.alt}
      decoding="async" {...priority} />
  </picture>;
}

function CutBody({ cut, prices, firstImageId, entryHref }: { cut: EntryCut; prices: OfferPrices; firstImageId: string; entryHref: string }) {
  switch (cut.kind) {
    case 'image':
      return <figure className={styles.figure}>
        {cut.image && <CutPicture image={cut.image} first={cut.id === firstImageId} />}
        {cut.lines.length > 0 && <figcaption><Lines cutId={cut.id} lines={cut.lines} /></figcaption>}
      </figure>;
    case 'record': {
      const record = cut.recordIndex === undefined ? undefined : trustStories.PRESIDENTIAL_RECORDS[cut.recordIndex];
      return <><Lines cutId={cut.id} lines={cut.lines} />{record && <RecordCard record={record} />}</>;
    }
    case 'reviews':
      return <><Lines cutId={cut.id} lines={cut.lines} />
        {cut.id === 'record-reactions' ? <ReaderReactionCards /> : <CustomerReviewCards />}</>;
    case 'press':
      return <><Lines cutId={cut.id} lines={cut.lines} /><div className={styles.press}><PressCoverage /></div></>;
    case 'concern':
      return <><Lines cutId={cut.id} lines={cut.lines} /><ConcernPicker concerns={HOME_CONCERNS} ctaHrefBase={FROM} /></>;
    case 'offer':
      return <><Lines cutId={cut.id} lines={cut.lines} /><OfferCard cutId={cut.id} prices={prices} /></>;
    case 'cta':
      return <div className={styles.invite}>
        <Lines cutId={cut.id} lines={cut.lines} />
        <a data-entry-cta="" data-position="invite" className={styles.ctaButton} href={entryHref}>
          {ENTRY_WEBTOON.ctaLabel}<span aria-hidden="true"> →</span>
        </a>
        <nav className={styles.sideLinks} aria-label="다른 입구">
          {ENTRY_WEBTOON.sideLinks.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}
        </nav>
      </div>;
    default:
      return <Lines cutId={cut.id} lines={cut.lines} />;
  }
}

export default function EntryWebtoon() {
  const prices = buildOfferPrices();
  const entryHref = freeEntryHref(null, FROM);
  const images = entryCuts().filter(cut => cut.kind === 'image');
  const firstImageId = images[0]?.id ?? '';
  // 고정 바는 두 번째 그림 컷이 화면 위로 지나가면 나타난다.
  const watchId = `entry-cut-${images[1]?.id ?? images[0]?.id ?? ''}`;

  return <div className={styles.page} data-entry-webtoon="">
    <EntryTracker />
    <StickyCta label={ENTRY_WEBTOON.stickyLabel} href={entryHref} watchId={watchId} />
    <header className={styles.hero}>
      <a className={styles.skip} data-entry-skip="" href="#entry-invite">{ENTRY_WEBTOON.skipLabel}</a>
      <p className={styles.kicker}>{ENTRY_WEBTOON.title}</p>
      <h1 className={styles.title}>{ENTRY_WEBTOON.h1}</h1>
      <p className={styles.byline}>{founder.byline}</p>
      <a data-entry-cta="" data-position="hero" className={styles.ctaButton} href={entryHref}>
        {ENTRY_WEBTOON.ctaLabel}<span aria-hidden="true"> →</span>
      </a>
    </header>
    {ENTRY_WEBTOON.chapters.map(chapter => <section key={chapter.id} id={`entry-${chapter.id}`} className={styles.chapter}
      data-chapter={chapter.id} aria-labelledby={`entry-${chapter.id}-title`}>
      <h2 id={`entry-${chapter.id}-title`} className={styles.srOnly}>{CHAPTER_LABEL[chapter.id]}</h2>
      <ol className={styles.cuts}>
        {chapter.cuts.map(cut => <li key={cut.id} id={`entry-cut-${cut.id}`} className={styles.cut} data-cut={cut.id} data-kind={cut.kind}>
          <CutBody cut={cut} prices={prices} firstImageId={firstImageId} entryHref={entryHref} />
        </li>)}
      </ol>
    </section>)}
    <p className={styles.fine}>{trustStories.trustStoriesCopy.fine}</p>
  </div>;
}
