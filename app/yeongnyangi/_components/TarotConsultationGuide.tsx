import {tarotConsultation,tarotConsultationSpread,type TarotConsultationId} from '@/worker/yeongnyangi/fortune/tarot/consultation-contract';
import type {PackageId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {consultationLocaleCopy,localizedKind} from '../_lib/consultation-locale-copy';
import {tarotSpreadCopyFor} from '../_lib/tarot-spread-locales';
import {readingTierDepth} from '../_lib/reading-depth-copy';
import {localizedTarotPosition} from '@/lib/tarot/yeongnyangi-display-locales';
import styles from './tarot-consultation.module.css';

const depths:Partial<Record<PackageId,string>>={
 mackerel:'모든 카드의 핵심과 전체 흐름, 지금 선택할 첫 행동을 읽어요.',
 salmon:'반복 패턴과 감정·행동의 차이, 현실에서 확인할 신호까지 살펴봐요.',
 flounder:'상충하는 카드와 선택지별 조건을 비교하고 바꿀 수 있는 부분을 찾아요.',
 tuna:'다른 해석의 가능성과 환경의 영향, 실행 순서와 점검 기준까지 정리해요.',
};
const depthNote:Record<ReadingLocale,string>={ko:'등급이 달라도 같은 질문에는 같은 카드 수를 사용해요. 상위 등급은 해석의 깊이와 선택 기준을 더 자세히 다뤄요.',en:'The same question uses the same number of cards at every tier. Higher tiers explore interpretation and decision criteria in more depth.',ja:'同じ質問のカード数はグレードによらず同じです。上位グレードは解釈と判断基準を詳しく扱います。','zh-CN':'同一问题在不同档次使用相同牌数。更高档次会深入解读与选择标准。','zh-TW':'同一問題在不同等級使用相同牌數。較高等級會深入解讀與選擇標準。',vi:'Cùng câu hỏi dùng cùng số lá ở mọi cấp. Cấp cao hơn đi sâu vào diễn giải và tiêu chí lựa chọn.',hi:'एक ही सवाल के लिए हर स्तर पर समान कार्ड संख्या रहती है। ऊँचे स्तर व्याख्या और निर्णय के आधार को अधिक गहराई से देखते हैं।',es:'La misma pregunta usa el mismo número de cartas en todos los niveles. Los superiores profundizan en interpretación y criterios de elección.',fr:'Une même question utilise le même nombre de cartes à chaque niveau. Les niveaux supérieurs approfondissent l’interprétation et les critères de choix.',de:'Dieselbe Frage nutzt in jeder Stufe gleich viele Karten. Höhere Stufen vertiefen Deutung und Entscheidungskriterien.',nl:'Dezelfde vraag gebruikt op elk niveau evenveel kaarten. Hogere niveaus verdiepen de duiding en keuzecriteria.',ms:'Soalan yang sama menggunakan bilangan kad yang sama pada setiap tahap. Tahap lebih tinggi memperincikan tafsiran dan kriteria pilihan.'};
export default function TarotConsultationGuide({kindId,tier,chapterCount,locale='ko'}:{kindId:string;tier:PackageId;chapterCount:number;locale?:ReadingLocale}){
 const spec=tarotConsultation(kindId);
 if(!spec)return null;
 const spread=tarotConsultationSpread(kindId as TarotConsultationId);
 const ui=consultationLocaleCopy(locale),copy=tarotSpreadCopyFor(locale);
 if(locale!=='ko')return <section className={styles.guide} lang={locale} aria-label={copy.resultHeading}>
  <h3>{localizedKind(kindId,locale)} · {copy.resultHeading}</h3>
  <dl className={styles.counts}><div><dt>{copy.resultHeading}</dt><dd>{copy.cards(spread.positions.length)}</dd></div><div><dt>{ui.structure}</dt><dd>{chapterCount} {ui.chapters}</dd></div></dl>
  <p>{readingTierDepth(tier,locale)}</p><p>{depthNote[locale]}</p>
  <details><summary>{copy.previewHeading}</summary><ol>{spread.positions.map((position:{key:string;label:string})=><li key={position.key}>{localizedTarotPosition(position.label,locale)}</li>)}</ol></details>
  <p className={styles.notice}>{ui.limits}</p>
 </section>;
 return <section className={styles.guide} aria-label="타로 상담 구성">
  <h3>{spec.label}의 카드 배치</h3>
  <dl className={styles.counts}><div><dt>펼칠 카드</dt><dd>{spread.positions.length}장</dd></div><div><dt>상담 챕터</dt><dd>{chapterCount}개</dd></div></dl>
  <p>{depths[tier]}</p>
  <p>등급이 달라도 같은 질문에는 같은 카드 수를 사용해요. 상위 등급은 해석의 깊이와 선택 기준을 더 자세히 다뤄요.</p>
  <details><summary>각 카드가 답하는 질문</summary><ol>{spread.positions.map((position:{key:string;label:string})=><li key={position.key}>{position.label}</li>)}</ol></details>
  <p className={styles.notice}>상대의 실제 마음이나 미래를 확정하지 않아요. 카드의 상징을 통해 관계와 선택의 조건을 살펴봐요.</p>
 </section>;
}
