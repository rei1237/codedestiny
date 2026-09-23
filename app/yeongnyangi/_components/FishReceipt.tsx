import type {Product} from '@/worker/yeongnyangi/payments/catalog';
import styles from '../yeongnyangi.module.css';

const receiptMessages:Record<Product['fishId'],string>={
 mackerel:'고등어 잘 받았다냥. 네 핵심부터 야무지게 읽어줄게.',
 salmon:'부드러운 연어 고맙다냥. 네 이야기도 찬찬히 풀어볼게.',
 flounder:'광어 잘 받았다냥! 네 선택의 흐름까지 꼼꼼히 보자.',
 tuna:'참치 품에 안고 힘냈다냥. 긴 이야기는 목차부터 천천히 읽어봐.',
 assorted:'모둠 잘 받았다냥! 두 체계의 공통점과 다른 점을 나란히 펼쳐볼게.',
 omakase:'오마카세라니, 냐아앙! 고맙다냥! 여섯 시선을 모은 네 운명서를 펼쳐볼게!',
};

export default function FishReceipt({product}:{product:Product}){
 return <aside className={`${styles.fishReceipt} ${product.fishId==='omakase'?styles.omakaseReceipt:''}`} data-fish-reaction={product.fishId} role="status" aria-label={`${product.fishName} 수령 리액션`}>
  <img src={product.reactionAsset} width={300} height={300} alt={`${product.fishName}를 받고 기뻐하는 영냥이`}/>
  <div><small>구매 확인 · 영냥이의 감사 인사</small><p>{receiptMessages[product.fishId]}</p></div>
 </aside>;
}
