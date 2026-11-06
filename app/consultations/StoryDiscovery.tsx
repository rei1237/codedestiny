import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { RECORD_SERVICES } from '@/lib/records/service-registry';
import { expertStoryIds } from './stories';
import { homeStories } from './home-stories';
import styles from './story-discovery.module.css';

const experts = new Set<string>(expertStoryIds);
const shelves = [
  { id: 'signature-stories', title: '대표 상담', stories: homeStories.filter(story => !experts.has(story.id)) },
  { id: 'expert-stories', title: '전문가 상담', stories: homeStories.filter(story => experts.has(story.id)) },
];

type HomeStory = (typeof homeStories)[number];

function storyLinks(id: string) {
  if (id === 'heukwol') return { reader: '/heukwol/#heukwol-story', start: '/heukwol/#heukwol-profile' };
  return { reader: `/consultations/${id}/#story`, start: RECORD_SERVICES.find(item => item.id === id)!.href };
}

function MobileStory({ story, featured = false }: { story: HomeStory; featured?: boolean }) {
  const { reader, start } = storyLinks(story.id);
  const actions = <div className={styles.actions}>
    <a href={reader} aria-label={story.title + ' 웹툰 읽기'}>웹툰 읽기 <ArrowRight size={15} aria-hidden="true"/></a>
    <a href={start} aria-label={story.title + ' 상담 시작하기'}>상담 시작하기</a>
  </div>;
  if (!featured) return <details className={styles.storyRow}><summary>{story.title}</summary><p>{story.lead}</p>{actions}</details>;
  return <article className={styles.featured}>
    <a href={reader} aria-label={story.title + ' 웹툰 읽기'}><Image src={`/images/consultation-webtoons/covers/${story.id}.webp`} width={720} height={480} sizes="(max-width:699px) calc(100vw - 40px), 360px" alt="" loading="lazy"/></a>
    <h4>{story.title}</h4><p>{story.lead}</p>{actions}
  </article>;
}

export default function StoryDiscovery() {
  return (
    <section className={styles.section} aria-labelledby="homeStoryTitle">
      <header className={styles.heading}>
        <h2 id="homeStoryTitle">달빛 상담 웹툰 서가</h2>
        <nav className={styles.contents} aria-label="웹툰 차례">
          {shelves.map(shelf => <a href={`#${shelf.id}`} key={shelf.id}>{shelf.title} ↓</a>)}
        </nav>
      </header>
      {shelves.map(shelf => (
        <section key={shelf.id} aria-labelledby={shelf.id}>
          <h3 id={shelf.id} className={styles.groupTitle}>{shelf.title}</h3>
          <div className={styles.mobileShelf}>
            <MobileStory story={shelf.stories[0]} featured/>
            {shelf.stories.slice(1,3).map(story => <MobileStory key={story.id} story={story}/>)}
            <details className={styles.more}><summary>{shelf.title} {shelf.stories.length - 3}편 더 보기</summary>
              {shelf.stories.slice(3).map(story => <MobileStory key={story.id} story={story}/>)}
            </details>
          </div>
          <div className={styles.grid}>
            {shelf.stories.map(({ id, title, lead }) => {
              const { reader, start } = storyLinks(id);
              return (
                <article key={id} className={id === 'fusion' ? styles.ensemble : undefined}>
                  <a className={styles.story} href={reader}>
                    <div className={styles.preview}>
                      <Image src={`/images/consultation-webtoons/covers/${id}.webp`} width={720} height={480} alt="" loading="lazy" />
                    </div>
                    <h4>{title}</h4>
                    <p>{lead}</p>
                    <span className={styles.read}>웹툰 읽기 <ArrowRight size={16} aria-hidden="true" /></span>
                  </a>
                  <a className={styles.start} href={start} aria-label={`${title} 상담 시작하기`}>상담 시작하기</a>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
}
