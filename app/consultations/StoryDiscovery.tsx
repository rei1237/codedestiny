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
          <div className={styles.grid}>
            {shelf.stories.map(({ id, title, lead }) => {
              const isHeukwol = id === 'heukwol';
              const reader = isHeukwol ? '/heukwol/#heukwol-story' : `/consultations/${id}/#story`;
              const start = isHeukwol ? '/heukwol/#heukwol-profile' : RECORD_SERVICES.find(item => item.id === id)!.href;
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
