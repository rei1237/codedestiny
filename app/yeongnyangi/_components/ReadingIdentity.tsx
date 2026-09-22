import type {Product} from '@/worker/yeongnyangi/payments/catalog';
import styles from './reading-v5.module.css';

export const readingFeatures:Record<string,string>={saju:'명식 · 오행 분포 · 삶의 균형',ziwei:'열두 궁 · 별의 배치 · 삶의 연결',sukuyo:'본명숙 · 관계의 거리 · 대화의 리듬',vedic:'라시 차트 · 달의 자리 · 별의 주기',astrology:'출생 차트 · 행성 · 핵심 각',tarot:'카드 배열 · 상징의 흐름 · 선택 비교',fusion:'체계별 해석 · 공통점과 차이 · 종합 선택'};
export function readingArtwork(product:Pick<Product,'domain'|'readingKind'>){return `/assets/yeongnyangi/readings/${product.readingKind==='single'?product.domain:'fusion'}-v5.webp`;}
export default function ReadingIdentity({product,compact=false}:{product:Product;compact?:boolean}){
 const key=product.readingKind==='single'?product.domain:'fusion';
 return <figure className={compact?styles.identityCompact:styles.identity}>
  <img src={readingArtwork(product)} width={960} height={640} alt={`${product.name}의 이야기를 살펴보는 영냥이`} loading={compact?'lazy':'eager'}/>
  <figcaption><strong>{product.readingKind==='all'?'여섯 관점으로 펼치는 한 사람의 이야기':product.name}</strong><span>{readingFeatures[key]}</span></figcaption>
 </figure>;
}
