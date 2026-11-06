'use client';
import {useEffect,useState} from 'react';
import {TEST_RECORDS} from '../../../lib/editions/production-test.mjs';

export default function SaleStatus({code,manual=false}) {
  const [attempt,setAttempt]=useState(manual?0:1);
  const [state,setState]=useState({message:''});
  useEffect(()=>{
    if(!attempt)return;
    const controller=new AbortController();
    setState({message:'외부 원본을 대조하고 있어요.'});
    async function verify(){
      const response=await fetch(TEST_RECORDS+'/'+code+'.sale.json',{credentials:'omit',cache:'no-store',signal:controller.signal});
      if(response.status===409)return {message:'외부 원본 미확인 · 판매 보류'};
      if(!response.ok)throw Error();
      const result=await response.json();
      if(result.saleEligible!==true)throw Error();
      return {message:'외부 원본 확인 · 판매 가능',source:result.source};
    }
    verify().then(value=>{if(!controller.signal.aborted)setState(value);}).catch(()=>{
      if(!controller.signal.aborted)setState({message:'외부 원본 조회 실패 · 판매 보류'});
    });
    return ()=>controller.abort();
  },[code,attempt]);
  return <div><p aria-live="polite">{state.message}</p>
    {state.source&&<a href={state.source}>이 번호의 외부 원본 보기</a>}
    <button type="button" onClick={()=>setAttempt(n=>n+1)}>{attempt?'판매 가능 여부 다시 확인':'판매 가능 여부 확인'}</button>
  </div>;
}
