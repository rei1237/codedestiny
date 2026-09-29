import {tarotConsultation,tarotConsultationSpread,type TarotConsultationId} from '@/worker/yeongnyangi/fortune/tarot/consultation-contract';
import type {PackageId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import styles from './tarot-consultation.module.css';

const depths:Partial<Record<PackageId,string>>={
 mackerel:'모든 카드의 핵심과 전체 흐름, 지금 선택할 첫 행동을 읽어요.',
 salmon:'반복 패턴과 감정·행동의 차이, 현실에서 확인할 신호까지 살펴봐요.',
 flounder:'상충하는 카드와 선택지별 조건을 비교하고 바꿀 수 있는 부분을 찾아요.',
 tuna:'다른 해석의 가능성과 환경의 영향, 실행 순서와 점검 기준까지 정리해요.',
};
/** Korean-first additions; mount only on the Korean consultation surface. */
export default function TarotConsultationGuide({kindId,tier,chapterCount}:{kindId:string;tier:PackageId;chapterCount:number}){
 const spec=tarotConsultation(kindId);
 if(!spec)return null;
 const spread=tarotConsultationSpread(kindId as TarotConsultationId);
 return <section className={styles.guide} aria-label="타로 상담 구성">
  <h3>{spec.label}의 카드 배치</h3>
  <dl className={styles.counts}><div><dt>펼칠 카드</dt><dd>{spread.positions.length}장</dd></div><div><dt>상담 챕터</dt><dd>{chapterCount}개</dd></div></dl>
  <p>{depths[tier]}</p>
  <p>등급이 달라도 같은 질문에는 같은 카드 수를 사용해요. 상위 등급은 해석의 깊이와 선택 기준을 더 자세히 다뤄요.</p>
  <details><summary>각 카드가 답하는 질문</summary><ol>{spread.positions.map((position:{key:string;label:string})=><li key={position.key}>{position.label}</li>)}</ol></details>
  <p className={styles.notice}>상대의 실제 마음이나 미래를 확정하지 않아요. 카드의 상징을 통해 관계와 선택의 조건을 살펴봐요.</p>
 </section>;
}
