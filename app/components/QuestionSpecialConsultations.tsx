import {useId,useState} from 'react';
import {ArrowUpRight,ChevronDown,Moon} from 'lucide-react';
import {products,type Product} from '@/worker/yeongnyangi/payments/catalog';
import {fusionIntroductionArt} from '@/app/yeongnyangi/_lib/introduction-art';
import styles from './QuestionSpecialConsultations.module.css';

const fusion=products.filter(p=>p.enabled&&p.readingKind!=='single');
const assorted=fusion.filter(p=>p.readingKind==='pair');
const omakase=fusion.find(p=>p.readingKind==='all');

function FusionArt({product,pair=false}:{product:Product;pair?:boolean}){
 const large=fusionIntroductionArt(product), small=large.replace(/-640\.webp$/,'-320.webp');
 return <img src={small} srcSet={small+' 320w, '+large+' 640w'} sizes={pair?'(max-width: 560px) 42vw, 210px':'(max-width: 560px) 42vw, 220px'} width={320} height={213} loading="lazy" decoding="async" alt=""/>;
}
const productHref=(product:Product)=>'/yeongnyangi/fortune/?'+new URLSearchParams({product:product.id});

export default function QuestionSpecialConsultations(){
 const [open,setOpen]=useState(false),paneId=useId();
 return <section className={styles.special} aria-labelledby="home-special-consultations">
  <h3 id="home-special-consultations"><Moon size={17} aria-hidden="true"/> 다른 방식으로 더 깊게 보기</h3>
  <p>별도 상담 화면에서 준비해요. 새 탭에서 열어 지금 적은 고민은 이 화면에 남겨요.</p>
  <div className={styles.features}>
   <a className={styles.card} href="/yeongnyangi/fortune/?mode=spirit" target="_blank" rel="noopener">
    <span className={styles.art}><img src="/assets/yeongnyangi/spirit/eastern-oracle-128.webp" srcSet="/assets/yeongnyangi/spirit/eastern-oracle-128.webp 128w, /assets/yeongnyangi/spirit/eastern-oracle.webp 640w" sizes="(max-width: 599px) 102px, 220px" width={128} height={128} loading="lazy" decoding="async" alt=""/></span>
    <span className={styles.copy}><strong>영냥 신점</strong><small>질문한 순간을 기준으로 살펴봐요.</small><span className={styles.action}>새 탭에서 상담 보기 <ArrowUpRight size={14} aria-hidden="true"/></span></span>
   </a>
   {assorted.length>0&&<button type="button" className={styles.card} aria-expanded={open} aria-controls={paneId} onClick={()=>setOpen(!open)}>
    <span className={styles.art}><img src="/assets/yeongnyangi/fish/reaction-assorted.webp" width={609} height={640} loading="lazy" decoding="async" alt=""/></span>
    <span className={styles.copy}><strong>{assorted[0].fishName}</strong><small>두 체계를 골라 비교해요.</small><span className={styles.action}>조합 {open?'접기':'보기'} <ChevronDown size={14} aria-hidden="true"/></span></span>
   </button>}
   {omakase&&<a className={styles.card} href={productHref(omakase)} target="_blank" rel="noopener">
    <span className={styles.art}><FusionArt product={omakase}/></span>
    <span className={styles.copy}><strong>{omakase.fishName}</strong><small>여섯 체계를 한 권으로 읽어요.</small><span className={styles.action}>새 탭에서 상담 보기 <ArrowUpRight size={14} aria-hidden="true"/></span></span>
   </a>}
  </div>
    <ul className={styles.pairs} id={paneId} hidden={!open}>{open&&assorted.map(product=><li key={product.id}><a className={styles.card} href={productHref(product)} target="_blank" rel="noopener">
     <span className={styles.art}><FusionArt product={product} pair/></span><span className={styles.copy}><strong>{product.name}</strong><span className={styles.action}>새 탭에서 상담 보기 <ArrowUpRight size={14} aria-hidden="true"/></span></span>
    </a></li>)}</ul>

 </section>;
}
