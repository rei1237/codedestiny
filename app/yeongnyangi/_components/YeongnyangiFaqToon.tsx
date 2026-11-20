import styles from './yeongnyangi-faq-toon.module.css';

// 영냥이가 설명해 주는 웹툰풍 FAQ. 질문·답변 문구는 호출부가 YEONGNYANGI_FAQS 에서 넘긴다(FAQPage JSON-LD 와 같은 원본).
// 표정은 글자가 없는 expressions/ 원본만 쓴다(reading-visuals.ts EXPRESSIONS 허용 목록과 같은 파일명).
const FACES=['welcome','calm','smug','curious','cool','surprised','tear','chic'] as const;
const face=(index:number)=>`/assets/yeongnyangi/expressions/${FACES[index%FACES.length]}.webp`;

export default function YeongnyangiFaqToon({items}:{items:ReadonlyArray<{question:string;answer:string}>}){
 return <div className={styles.toon}>{items.map((item,index)=><details key={item.question} className={styles.cut} open={index===0}>
  <summary><span className={styles.ask}>{item.question}</span></summary>
  <div className={styles.reply}>
   <img src={face(index)} width={128} height={128} alt="" loading="lazy" decoding="async"/>
   <p className={styles.bubble}><span className={styles.who}>영냥이</span>{item.answer}</p>
  </div>
 </details>)}</div>;
}
