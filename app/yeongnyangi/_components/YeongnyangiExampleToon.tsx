import styles from './yeongnyangi-faq-toon.module.css';

// 홈 "상담 미리 보기". 발췌문은 호출부(YeongnyangiGuide)가 result-samples.json 의 yn-tarot 에서 넘긴다 — 여기에 상담 문장을 직접 쓰지 않는다.
// 표정은 글자 없는 expressions/ 원본만 쓴다. 그림(visual)은 개인 결과가 아닌 서비스 분위기 일러스트다.
const face=(name:'curious'|'calm'|'smug')=>`/assets/yeongnyangi/expressions/${name}.webp`;

export default function YeongnyangiExampleToon({question,visual,visualAlt,excerpts}:{question:string;visual:string;visualAlt:string;excerpts:readonly string[]}){
 const [flow,future,action,closing]=excerpts;
 return <div className={styles.toon}>
  <div className={styles.cutStep}>
   <span className={styles.step}>① 고민을 남기면</span>
   <div className={styles.askRow}><p className={styles.ask}>“{question}”</p></div>
  </div>
  <div className={styles.cutStep}>
   <span className={styles.step}>② 영냥이가 카드로 마음의 흐름을 읽어요</span>
   <img className={styles.scene} src={visual} width={960} height={640} alt={visualAlt} loading="lazy" decoding="async"/>
   <div className={styles.reply}><img src={face('curious')} width={128} height={128} alt="" loading="lazy" decoding="async"/><p className={styles.bubble}><span className={styles.who}>영냥이</span>{flow}</p></div>
  </div>
  <div className={styles.cutStep}>
   <span className={styles.step}>③ 현실의 조건과 다음 행동까지 짚어요</span>
   <div className={styles.reply}><img src={face('calm')} width={128} height={128} alt="" loading="lazy" decoding="async"/><p className={styles.bubble}><span className={styles.who}>영냥이</span>{action}</p></div>
  </div>
  <div className={styles.cutStep}>
   <span className={styles.step}>④ 마지막은 영냥이의 한마디</span>
   <div className={styles.reply}><img src={face('smug')} width={128} height={128} alt="" loading="lazy" decoding="async"/><p className={styles.bubble}><span className={styles.who}>영냥이</span>{closing}</p></div>
  </div>
  <details className={styles.more}><summary>영냥이의 해석 더 읽기</summary><p>{future}</p></details>
 </div>;
}
