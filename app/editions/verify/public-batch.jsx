'use client';
import {useEffect,useState} from 'react';
import {network,seriesRows,verifyBatch} from '../../../lib/editions/batch-registry.mjs';
import {TEST_RECORDS,TEST_ENVIRONMENT} from '../../../lib/editions/production-test.mjs';
export default function PublicBatch({proof}){
  const [attempt,retry]=useState(0),[total,setTotal]=useState(null),[status,setStatus]=useState(''),[tx,setTx]=useState('');
  useEffect(()=>{
    let active=true;
    setStatus('공개 기록을 조회하고 있어요.');setTx('');setTotal(null);
    (async()=>{
      const res=await fetch(TEST_RECORDS+'/index.json',{cache:'no-store',credentials:'omit'});
      if(!res.ok)throw Error('발행 목록을 불러오지 못했어요.');
      const data=await res.json();
      const row=data.items?.find(r=>r.code===proof.code);
      if(data.environment!==TEST_ENVIRONMENT||!row)throw Error('공방 목록과 일치하지 않아요.');
      const count=seriesRows(data.items,{id:row.editionId,...{cap:proof.cap,character:proof.character,title:proof.title}}).length;
      if(active)setTotal(count);
      const result=await verifyBatch(proof,data.items);
      if(active){setTx(result.tx||'');setStatus(result.published?'공개 기록과 일치해요.':'공방 발행 완료 · 블록체인 공개 대기');}
    })().catch(e=>{if(active)setStatus('공개 검증 미완료: '+e.message);});
    return ()=>{active=false;};
  },[attempt,proof]);
  return <section><h2>내 한정판 번호 {String(proof.serial).padStart(3,'0')}</h2>
    <p>총 한도 {proof.cap}개 · 공방 발행 {total===null?'확인 중':total+'개'}</p>
    <output aria-live="polite">{status}</output>
    {tx&&<a href={network.explorer+'/tx/'+tx}>블록체인에서 직접 확인</a>}
    <button onClick={()=>retry(n=>n+1)}>공개 기록 다시 확인</button></section>;
}
