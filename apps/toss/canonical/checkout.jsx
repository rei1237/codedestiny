import React,{useState} from 'react';
import styles from '@/app/checkout/yeongnyangi-checkout.module.css';
// Only the payment boundary is substituted; the original consultation owns its
// question, decision, profile validation, preparation and result request.
export default function PreviewCheckout({draft}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 if(!draft)return <p>상담 입력 화면에서 시작해 주세요.</p>;
 async function prepare(){if(busy)return;setBusy(true);setError('');try{const row=await draft.onPrepare();if(row)location.assign('/yeongnyangi/result/?id='+encodeURIComponent(row.id));else setError('샘플 준비를 완료하지 못했어요. 입력 안내를 확인해 주세요.');}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className={styles.checkout} data-yn-checkout data-yn-night aria-labelledby="yn-checkout-title">
  <header className={styles.header}><div className={styles.intro}><h1 id="yn-checkout-title">마음을 맡길 준비</h1><p>당신의 질문을 품고,<br/>영냥이가 푸른 달빛을 밝힐게요.</p></div><div className={styles.art} aria-hidden="true"><img src="/assets/yeongnyangi/checkout-moonblue.webp" width={640} height={640} alt=""/></div><blockquote className={styles.question}>{draft.question}</blockquote></header>
  <div className={styles.layout}><div className={styles.details}><fieldset disabled={busy} className={styles.inputs}>{draft.children}</fieldset></div><aside className={styles.summary} aria-label="상담과 결제 요약"><div className={styles.product}><img src={'/assets/yeongnyangi/fish/'+draft.product.fishId+'.webp'} width={120} height={54} alt=""/><div><h2>{draft.product.name} · {draft.product.fishName}</h2><p>{draft.chapters}개 챕터로 살펴보는 나의 이야기</p></div></div><p role="note">개발 테스트에서는 결제 없이 샘플 결과를 엽니다. 입력한 질문의 실제 AI 해석이 아닙니다.</p><div className={styles.action}>{draft.hint&&<p>{draft.hint}</p>}<div className={styles.total}><span>기존 서비스 단건 결제</span><strong>{draft.product.priceKRW.toLocaleString('ko-KR')}원</strong></div><button className={styles.pay} type="button" disabled={busy||!draft.ready} onClick={prepare}>{busy?'샘플 준비 중':'샘플 결과까지 테스트하기'}</button></div>{error&&<p role="alert">{error}</p>}</aside></div>
 </section>;
}
