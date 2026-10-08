import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import {readingArtwork} from './ReadingIdentity';
import styles from './consultation-companion.module.css';
const introductions:Record<DomainId,string>={
 saju:'네 명식의 바탕부터 지금 고민까지, 차근차근 함께 읽어볼게.',
 sukuyo:'네 본명숙과 관계의 거리를 살피며 마음의 리듬을 찾아볼게.',
 astrology:'출생 차트의 행성과 각을 살펴 네 질문에 이어볼게.',
 vedic:'라시와 나크샤트라, 별의 주기를 네 고민과 함께 살펴볼게.',
 ziwei:'열두 궁과 별의 배치에서 네 삶과 고민의 연결을 찾아볼게.',
 tarot:'네가 고른 카드의 상징을 지금의 질문에 연결해볼게.',
};
export default function ConsultationCompanion({domain}:{domain:DomainId}){
 return <aside className={styles.companion} aria-label="영냥이의 상담 안내">
  <img src={readingArtwork({domain,readingKind:'single'})} alt="" width={960} height={640}/>
  <div><strong>영냥이</strong><p>{introductions[domain]}</p></div>
 </aside>;
}
