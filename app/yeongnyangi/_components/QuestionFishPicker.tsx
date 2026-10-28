'use client';
import {EXPANDED_CHAPTERS} from '@/worker/yeongnyangi/fortune/consultation-expansion';
import {products,type Product} from '@/worker/yeongnyangi/payments/catalog';
import {FOLLOWUP_LIMITS,questionScopes,type QuestionFish} from '@/worker/yeongnyangi/fortune/ask/question-policy';
import {consultationBudget,a4Label} from '@/worker/yeongnyangi/fortune/consultation-budget';
import styles from './question-fish-picker.module.css';

export default function QuestionFishPicker({domain,selected,recommended,onSelect,disabled=false}:{domain:Product['domain'];selected:QuestionFish;recommended:QuestionFish;onSelect:(fish:QuestionFish)=>void;disabled?:boolean}){
 return <fieldset className={styles.picker} disabled={disabled}><legend>상담의 깊이를 골라 주세요</legend><p>질문에 맞는 생선을 추천해요. 원하는 깊이로 직접 선택할 수 있어요.</p>
  {(Object.keys(FOLLOWUP_LIMITS) as QuestionFish[]).map(fish=>{
   const product=products.find(p=>p.domain===domain&&p.fishId===fish&&p.readingKind==='single')!;
   return <label key={fish} className={styles.option}><input type="radio" name="question-fish" value={fish} checked={selected===fish} onChange={()=>onSelect(fish)}/><span className={styles.copy}>
    <span className={styles.heading}><b>{product.fishName}{fish===recommended?' · 추천':''}</b><strong>{product.priceKRW.toLocaleString('ko-KR')}원</strong></span>
    <span>{questionScopes[fish]}</span><span className={styles.details}>{EXPANDED_CHAPTERS[fish]}장 · {a4Label(consultationBudget(fish).initial)} · 추가 질문 {FOLLOWUP_LIMITS[fish]}회</span>
   </span></label>;
  })}
  <p>분량은 예상 안내예요. 시기와 해석은 계산된 근거의 범위에서 살펴봐요.</p>
 </fieldset>;
}
