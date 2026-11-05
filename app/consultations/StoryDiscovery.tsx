import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { RECORD_SERVICES } from '@/lib/records/service-registry';
import { consultationStories, signatureStoryIds, storyPreviewHeights } from './stories';
import styles from './story-discovery.module.css';

export default function StoryDiscovery() {
  return (
    <section className={styles.section} aria-labelledby="homeStoryTitle">
      <header className={styles.heading}>
        <h2 id="homeStoryTitle">달빛 서가의 대표 상담 웹툰</h2>
        <p>마음에 닿는 첫 장면을 골라 이야기를 펼쳐 보세요.</p>
      </header>

      <a className={styles.feature} href="/heukwol/#heukwol-story">
        <Image src="/images/consultation-webtoons/heukwol/hw12-01.webp" width={1122} height={1402} alt="" loading="lazy" />
        <div>
          <h3>흑월의 경고</h3>
          <p>같은 청구서 두 장을 받은 밤,<br />연이와 네오는 다른 선택을 찾아 나섭니다.</p>
          <span className={styles.read}>웹툰 읽기 <ArrowRight size={16} aria-hidden="true" /></span>
        </div>
      </a>

      <div className={styles.grid}>
        {signatureStoryIds.map(id => {
          const service = RECORD_SERVICES.find(item => item.id === id)!;
          return (
            <article key={id}>
              <a className={styles.story} href={`/consultations/${id}/#story`}>
                <div className={styles.preview} style={{ aspectRatio: `724 / ${storyPreviewHeights[id]}` }}>
                  <Image src={`/images/consultation-webtoons/${id}.webp`} width={724} height={2172} alt="" loading="lazy" />
                </div>
                <h3>{service.name}</h3>
                <p>{consultationStories[id].lead}</p>
                <span className={styles.read}>웹툰 읽기 <ArrowRight size={16} aria-hidden="true" /></span>
              </a>
              <a className={styles.start} href={service.href} aria-label={`${service.name} 상담 시작하기`}>상담 시작하기</a>
            </article>
          );
        })}
      </div>
      <a className={styles.more} href="/consultations/#others">전문가 상담 웹툰 보기 <ArrowRight size={16} aria-hidden="true" /></a>
    </section>
  );
}
