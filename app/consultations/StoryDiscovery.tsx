import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { RECORD_SERVICES } from '@/lib/records/service-registry';
import { consultationStories, expertStoryIds, signatureStoryIds } from './stories';
import styles from './story-discovery.module.css';

export default function StoryDiscovery() {
  return (
    <section className={styles.section} aria-labelledby="homeStoryTitle">
      <header className={styles.heading}>
        <h2 id="homeStoryTitle">달빛 상담 웹툰 서가</h2>
        <p>마스터의 표지를 골라 이야기를 펼쳐 보세요.</p>
        <nav className={styles.contents} aria-label="웹툰 차례"><a href="#signature-stories">대표 상담</a><a href="#expert-stories">전문가 상담</a></nav>
      </header>
      <h3 id="signature-stories" className={styles.groupTitle}>대표 상담 웹툰</h3>

      <a className={styles.feature} href="/heukwol/#heukwol-story">
        <Image src="/images/consultation-webtoons/covers/heukwol.webp" width={720} height={480} alt="" loading="lazy" />
        <div>
          <h4>흑월의 경고</h4>
          <p>같은 청구서 두 장을 받은 밤,<br />연이와 네오는 다른 선택을 찾아 나섭니다.</p>
          <span className={styles.read}>웹툰 읽기 <ArrowRight size={16} aria-hidden="true" /></span>
        </div>
      </a>

      {[signatureStoryIds, expertStoryIds].map(ids => (
        <div key={ids[0]}>
          {ids === expertStoryIds && <h3 id="expert-stories" className={styles.groupTitle}>전문가 상담 웹툰</h3>}
          <div className={styles.grid}>
            {ids.map(id => {
              const service = RECORD_SERVICES.find(item => item.id === id)!;
              return (
                <article key={id}>
                  <a className={styles.story} href={`/consultations/${id}/#story`}>
                    <div className={styles.preview}>
                      <Image src={`/images/consultation-webtoons/covers/${id}.webp`} width={720} height={480} alt="" loading="lazy" />
                    </div>
                    <h4>{service.name}</h4>
                    <p>{consultationStories[id].lead}</p>
                    <span className={styles.read}>웹툰 읽기 <ArrowRight size={16} aria-hidden="true" /></span>
                  </a>
                  <a className={styles.start} href={service.href} aria-label={`${service.name} 상담 시작하기`}>상담 시작하기</a>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
