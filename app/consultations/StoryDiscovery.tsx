import Image from 'next/image';
import {RECORD_SERVICES} from '@/lib/records/service-registry';
import {consultationStories, storyBenefits, storyPreviewHeights} from './stories';
import styles from './story-discovery.module.css';

export default function StoryDiscovery() {
  return <section className={styles.section} aria-labelledby="homeStoryTitle">
    <h2 id="homeStoryTitle">내 고민과 닮은 이야기부터</h2>
    <p>마스터의 웹툰으로 상담을 먼저 만나보세요. 어떤 도움을 얻을지 살펴보고 시작할 수 있어요.</p>
    <div className={styles.grid}>{['life-book','new-year','love-secret'].map(id=>{
      const service=RECORD_SERVICES.find(s=>s.id===id)!;
      return <article key={id}>
        <a className={styles.preview} href={'/consultations/'+id+'/'} aria-label={service.name+' 웹툰으로 알아보기'} style={{aspectRatio:'724 / '+storyPreviewHeights[id]}}>
          <Image src={'/images/consultation-webtoons/'+id+'.webp'} width={724} height={2172} alt="" loading="lazy"/>
        </a>
        <h3>{service.name}</h3><p>{consultationStories[id].lead}</p>
        <p className={styles.benefits}>{storyBenefits[id].join(' · ')}</p>
        <div className={styles.actions}><a href={'/consultations/'+id+'/'}>웹툰으로 알아보기</a><a href={service.href}>상담 시작하기</a></div>
      </article>;
    })}</div>
    <a className={styles.more} href="/consultations/">다른 대표·전문가 상담 웹툰 보기 →</a>
  </section>;
}
