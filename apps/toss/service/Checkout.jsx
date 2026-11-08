import React,{useEffect,useRef,useState} from 'react';
import {purchase,saleProducts,paymentRequiresReview} from '../src/platform';
import {getAuthState,subscribeAuth,useAuthStore} from '@/app/_lib/auth-store';
import styles from '@/app/checkout/yeongnyangi-checkout.module.css';

function authStatus(error){if(error?.status===401||error?.status===403)return error.status;if(error?.code==='ACCESS_DENIED')return 403;if(['LOGIN_REQUIRED','SESSION_EXPIRED'].includes(error?.code))return 401;return 0;}
function checkoutError(error,fallback){
 if(authStatus(error)===403)return '접근 권한을 확인할 수 없어요. 구매한 계정과 주문 내역을 확인해 주세요.';
 if(authStatus(error)===401)return '토스 로그인 상태를 확인한 뒤 다시 시도해 주세요.';
 if(error?.code==='ORDER_REFUNDED')return '환불된 상담은 다시 열 수 없어요. 구매 내역을 확인해 주세요.';
 if(error?.code==='ORDER_NOT_PAID')return '결제 상태를 확인하지 못했어요. 추가 결제하지 말고 구매 내역을 확인해 주세요.';
 if(error?.code==='SESSION_CHECK_FAILED')return '로그인 상태를 확인하지 못했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
 if(error?.code==='SESSION_CHANGED')return '로그인 상태가 바뀌었어요. 다시 확인해 주세요.';
 if(error?.code==='USER_CANCELED')return '결제를 취소했어요. 다시 선택할 수 있어요.';
 if(['PAYMENT_STATUS_UNCERTAIN','RECOVERY_REQUIRED','RECOVERY_IN_PROGRESS','PAYMENT_IN_PROGRESS'].includes(error?.code))return '추가 결제하지 말고 구매 내역을 확인해 주세요.';
 if(error?.code==='UNSUPPORTED_APP_VERSION'&&typeof error.message==='string'&&error.message.trim()&&error.message!==error.code)return error.message;
 if(['IAP_NOT_SUPPORTED','UNSUPPORTED_APP_VERSION'].includes(error?.code))return '현재 토스 앱에서는 이 기능을 지원하지 않아요. 앱 업데이트 후 다시 확인해 주세요.';
 return fallback;
}
function accessRejected(error){return Boolean(authStatus(error))||['LOGIN_REQUIRED','SESSION_EXPIRED','ACCESS_DENIED','SESSION_CHANGED','SESSION_CHECK_FAILED','ORDER_REFUNDED','ORDER_NOT_PAID','RESULT_NOT_AVAILABLE','RESULT_MISMATCH'].includes(error?.code)||['ORDER_REFUNDED','RESULT_NOT_AVAILABLE','RESULT_MISMATCH'].includes(error?.message);}
function ownerKey(state){const user=state.user;return JSON.stringify([state.isAuthenticated===true,String(user?.id||user?.userId||user?._id||user?.uid||'')]);}
export default function TossCheckout({draft}){
 const auth=useAuthStore(),{isAuthenticated}=auth,owner=String(auth.user?.id||auth.user?.userId||auth.user?._id||auth.user?.uid||''),scope=ownerKey(auth);
 const productId=draft?.product?.id||'',initialScope=useRef(scope),[sales,setSales]=useState([]),[salesScope,setSalesScope]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reload,setReload]=useState(0),[paymentBlocked,setPaymentBlocked]=useState(()=>paymentRequiresReview()),[accessDenied,setAccessDenied]=useState(false),[loginRequired,setLoginRequired]=useState(false);
 const cleanup=useRef(()=>{}),locked=useRef(false),epoch=useRef(0),alive=useRef(false);
 useEffect(()=>{alive.current=true;let identity=ownerKey(getAuthState());const invalidate=()=>{epoch.current++;cleanup.current();cleanup.current=()=>{};locked.current=false;if(alive.current){setBusy(false);if(paymentRequiresReview())setPaymentBlocked(true);}};const off=subscribeAuth(()=>{const next=ownerKey(getAuthState());if(next!==identity){identity=next;invalidate();}});const show=()=>{if(alive.current)setReload(value=>value+1);};for(const name of ['pagehide','popstate','code-destiny:toss-back'])window.addEventListener(name,invalidate);window.addEventListener('pageshow',show);return()=>{alive.current=false;invalidate();off();for(const name of ['pagehide','popstate','code-destiny:toss-back'])window.removeEventListener(name,invalidate);window.removeEventListener('pageshow',show);};},[]);
 useEffect(()=>{let active=true;setSalesScope('');setSales([]);if(!isAuthenticated||!owner)return()=>{active=false;};void saleProducts().then(rows=>{if(!Array.isArray(rows))throw new Error('PRODUCT_UNAVAILABLE');if(active){setSales(rows);setSalesScope(scope);if(!rows.some(item=>item.id===productId&&item.sku&&item.displayAmount&&Number.isSafeInteger(item.approvedPriceKRW)&&item.approvedPriceKRW>0))setError('등록된 상품을 확인하지 못했어요.');}}).catch(error=>{if(active){if(accessRejected(error)){setAccessDenied(true);setLoginRequired(authStatus(error)===401);}setError(checkoutError(error,'상품 정보를 불러오지 못했어요. 다시 열어 주세요.'));}});return()=>{active=false;};},[scope,isAuthenticated,owner,productId,reload]);
 if(!draft)return <p>상담 입력 화면에서 시작해 주세요.</p>;
 if(scope!==initialScope.current)return <p role="status">계정을 확인하고 있어요.</p>;
 if(accessDenied)return <section><p role="alert">{error||'상담 권한을 확인하지 못했어요.'}</p>{loginRequired?<a href={'/login/?next='+encodeURIComponent(window.location.pathname+window.location.search)} style={{display:"inline-flex",alignItems:"center",minHeight:44}}>토스로 로그인하기</a>:<button type="button" style={{minHeight:44}} onClick={()=>window.location.reload()}>다시 확인하기</button>} <a href="/recovery" style={{display:"inline-flex",alignItems:"center",minHeight:44}}>구매 복구하기</a></section>;
 const sale=salesScope===scope?sales.find(item=>item.id===productId&&item.sku&&item.displayAmount&&Number.isSafeInteger(item.approvedPriceKRW)&&item.approvedPriceKRW>0):undefined;
 function fail(error){locked.current=false;setBusy(false);if(accessRejected(error)){setAccessDenied(true);setLoginRequired(authStatus(error)===401);}if(paymentRequiresReview()||['PAYMENT_STATUS_UNCERTAIN','RECOVERY_REQUIRED','RECOVERY_IN_PROGRESS','PAYMENT_IN_PROGRESS'].includes(error?.code))setPaymentBlocked(true);setError(checkoutError(error,'결제 상태를 확인하지 못했어요. 구매 내역을 확인해 주세요.'));}
 async function pay(){
  if(locked.current||!sale?.sku||!sale.displayAmount)return;if(paymentBlocked||paymentRequiresReview()){setPaymentBlocked(true);setError('추가 결제하지 말고 구매 내역을 확인해 주세요.');return;}
  locked.current=true;setBusy(true);setError('');const current=++epoch.current,start=window.location.pathname+window.location.search;
  const same=()=>alive.current&&current===epoch.current&&ownerKey(getAuthState())===scope&&window.location.pathname+window.location.search===start;
  try{
   const row=await draft.onPrepare();if(!same())return;
   if(!row){locked.current=false;setBusy(false);return;}
   // Inline checkout learns its request ID from authenticated preparation.
   // A checkout reopened by URL already has an ID and must keep that exact request.
   const changedRequest=Object.hasOwn(draft,'requestId')&&row.id!==draft.requestId;
   if(!/^[a-f0-9]{64}$/.test(row.id||'')||changedRequest||typeof row.paid!=='boolean'||row.product?.id!==draft.product.id)throw Object.assign(new Error('RESULT_MISMATCH'),{code:'RESULT_MISMATCH'});
   if(row.state==='REFUNDED')throw Object.assign(new Error('ORDER_REFUNDED'),{code:'ORDER_REFUNDED'});
   if(!row.paid&&row.state!=='CREATED')throw new Error('RESULT_MISMATCH');
   if(row.paid){location.assign('/yeongnyangi/result/?id='+encodeURIComponent(row.id));return;}
   const latest=await saleProducts();if(!same())return;if(!Array.isArray(latest))throw new Error('PRODUCT_UNAVAILABLE');const selected=latest.find(item=>item.id===draft.product.id);
   if(!selected?.sku||!selected.displayAmount||!Number.isSafeInteger(selected.approvedPriceKRW)||selected.approvedPriceKRW<=0||selected.sku!==sale.sku||selected.displayAmount!==sale.displayAmount||selected.approvedPriceKRW!==sale.approvedPriceKRW){setSales(latest);setSalesScope(scope);locked.current=false;setBusy(false);setError('상품 정보가 바뀌었어요. 표시된 금액을 확인한 뒤 다시 선택해 주세요.');return;}
   cleanup.current=purchase(selected,row.id,()=>{if(same())location.assign('/yeongnyangi/result/?id='+encodeURIComponent(row.id));},error=>{if(same())fail(error);});
  }catch(error){if(same())fail(error);}
 }
 return <section className={styles.checkout} data-yn-checkout data-yn-night aria-labelledby="yn-checkout-title">
  <header className={styles.header}><div className={styles.intro}><h1 id="yn-checkout-title">마음을 맡길 준비</h1><p>당신의 질문을 품고,<br/>영냥이가 푸른 달빛을 밝힐게요.</p></div><div className={styles.art} aria-hidden="true"><img src="/assets/yeongnyangi/checkout-moonblue.webp" width={640} height={640} alt=""/></div><blockquote className={styles.question}>{draft.question}</blockquote></header>
  <div className={styles.layout}><div className={styles.details}><fieldset disabled={busy} className={styles.inputs}>{draft.children}</fieldset></div><aside className={styles.summary} aria-label="상담과 결제 요약"><div className={styles.product}><img src={'/assets/yeongnyangi/fish/'+draft.product.fishId+'.webp'} width={120} height={54} alt=""/><div><h2>{draft.product.name} · {draft.product.fishName}</h2><p>{draft.chapters}개 챕터로 살펴보는 나의 이야기</p></div></div><div className={styles.action}>{draft.hint&&<p>{draft.hint}</p>}<div className={styles.total}><span>단건 결제</span><strong>{sale?.displayAmount||'상품 등록 확인 중'}</strong></div>{!isAuthenticated?<button className={styles.pay} type="button" onClick={draft.onLogin||(()=>location.assign('/login/?next='+encodeURIComponent(location.pathname+location.search)))}>토스로 로그인하기</button>:<button className={styles.pay} type="button" disabled={busy||paymentBlocked||!draft.ready||!sale?.sku||!sale?.displayAmount} onClick={pay}>{busy?'결제 확인 중':'단건 결제로 상담 시작하기'}</button>}</div>{paymentBlocked&&<p role="status">추가 결제하지 말고 구매 내역을 확인해 주세요.</p>}{error&&<div><p role="alert">{error}</p><button type="button" style={{minHeight:44}} onClick={()=>{setError('');setReload(value=>value+1);}}>상품 다시 확인하기</button></div>}<a href="/recovery" style={{display:"inline-flex",alignItems:"center",minHeight:44}}>구매 복구하기</a></aside></div>
 </section>;
}
