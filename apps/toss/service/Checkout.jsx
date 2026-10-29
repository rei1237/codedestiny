import React,{useEffect,useRef,useState} from 'react';
import {purchase,saleProducts} from '../src/platform';
import {useAuthStore} from '@/app/_lib/auth-store';
import styles from '@/app/checkout/yeongnyangi-checkout.module.css';

export default function TossCheckout({draft}){
 const {isAuthenticated}=useAuthStore();
 const [sales,setSales]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const cleanup=useRef(()=>{}),locked=useRef(false);
 useEffect(()=>{let active=true;void saleProducts().then(rows=>{if(active)setSales(rows);}).catch(()=>{if(active)setError('상품 정보를 불러오지 못했어요. 다시 열어 주세요.');});return()=>{active=false;cleanup.current();};},[]);
 if(!draft)return <p>상담 입력 화면에서 시작해 주세요.</p>;
 const sale=sales.find(item=>item.id===draft.product.id);
 function fail(){locked.current=false;setBusy(false);setError('결제 상태를 확인하지 못했어요. 결제한 상담은 구매 복구에서 확인해 주세요.');}
 async function pay(){
  if(locked.current||!sale)return;locked.current=true;setBusy(true);setError('');
  try{
   const row=await draft.onPrepare();
   if(!row){locked.current=false;setBusy(false);return;}
   if(row.paid){location.assign('/yeongnyangi/result/?id='+encodeURIComponent(row.id));return;}
   cleanup.current=purchase(sale,row.id,()=>location.assign('/yeongnyangi/result/?id='+encodeURIComponent(row.id)),fail);
  }catch{fail();}
 }
 return <section className={styles.checkout} data-yn-checkout data-yn-night aria-labelledby="yn-checkout-title">
  <header className={styles.header}><div className={styles.intro}><h1 id="yn-checkout-title">마음을 맡길 준비</h1><p>당신의 질문을 품고,<br/>영냥이가 푸른 달빛을 밝힐게요.</p></div><div className={styles.art} aria-hidden="true"><img src="/assets/yeongnyangi/checkout-moonblue.webp" width={640} height={640} alt=""/></div><blockquote className={styles.question}>{draft.question}</blockquote></header>
  <div className={styles.layout}><div className={styles.details}><fieldset disabled={busy} className={styles.inputs}>{draft.children}</fieldset></div><aside className={styles.summary} aria-label="상담과 결제 요약"><div className={styles.product}><img src={'/assets/yeongnyangi/fish/'+draft.product.fishId+'.webp'} width={120} height={54} alt=""/><div><h2>{draft.product.name} · {draft.product.fishName}</h2><p>{draft.chapters}개 챕터로 살펴보는 나의 이야기</p></div></div><div className={styles.action}>{draft.hint&&<p>{draft.hint}</p>}<div className={styles.total}><span>단건 결제</span><strong>{sale?.displayAmount||'상품 등록 확인 중'}</strong></div>{!isAuthenticated?<button className={styles.pay} type="button" onClick={draft.onLogin||(()=>location.assign('/login/?next='+encodeURIComponent(location.pathname+location.search)))}>토스로 로그인하기</button>:<button className={styles.pay} type="button" disabled={busy||!draft.ready||!sale} onClick={pay}>{busy?'결제 확인 중':'단건 결제로 상담 시작하기'}</button>}</div>{error&&<p role="alert">{error}</p>}<a href="/recovery">구매 복구하기</a></aside></div>
 </section>;
}
