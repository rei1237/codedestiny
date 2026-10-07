'use client';
import {useEffect,useRef,useState} from 'react';
import styles from './moonstone-discount-balance.module.css';
import {fetchBillingBalance} from '@/app/_lib/billing-client';

/** Read-only balance guidance. The payment server still validates the final spend. */
export default function MoonstoneDiscountBalance({signedIn,userId,maxDiscountStones,selected,onUse}:{signedIn:boolean;userId:string;maxDiscountStones:number;selected:number;onUse:(value:string)=>void}){
 const [state,setState]=useState<{status:'loading'|'ready'|'error';balance?:number;owner?:string}>({status:'loading'});
 const [revision,setRevision]=useState(0);
 const fresh=useRef(false);
 useEffect(()=>{
  if(!signedIn)return;
  let active=true;setState({status:'loading'});
  fetchBillingBalance({moonlightStoneOnly:true,fresh:fresh.current,clientSource:'app:checkout-discount-balance'}).then(result=>{
   const balance=result.data?.monthlyStoneBalance??result.data?.membershipCreditBalance;
   if(active)setState(result.ok&&result.data?.authenticated===true&&!result.data?.degraded&&Number.isSafeInteger(balance)&&Number(balance)>=0?{status:'ready',balance:Number(balance),owner:userId}:{status:'error'});
  }).catch(()=>{if(active)setState({status:'error'});});
  return()=>{active=false;};
 },[signedIn,userId,revision]);
 if(!signedIn)return <p>로그인하면 보유 월정석을 확인할 수 있어요.</p>;
 const loaded=state.status==='ready'&&state.owner===userId;
 const usable=loaded?Math.min(state.balance!,Math.max(0,maxDiscountStones)):0;
 return <div className={styles.balance}>
  <p role="status">{loaded?`보유 월정석 ${state.balance!.toLocaleString('ko-KR')}개 · 이번 할인에 최대 ${usable.toLocaleString('ko-KR')}개 사용 가능`:state.status==='error'?'월정석 잔액을 불러오지 못했어요. 다시 확인해 주세요.':'월정석 잔액 확인 중이에요.'}</p>
  {loaded&&selected>state.balance!&&<p role="alert">보유한 월정석보다 많이 입력했어요. 사용 수량을 줄여 주세요.</p>}
  <button type="button" disabled={state.status==='loading'} onClick={()=>{fresh.current=true;setRevision(value=>value+1);}}>잔액 다시 확인하기</button>
  {loaded&&<button type="button" disabled={usable===0} onClick={()=>onUse(String(usable))}>사용 가능한 수량 입력하기</button>}
 </div>;
}
