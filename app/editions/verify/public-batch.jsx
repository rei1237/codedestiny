'use client';
import {useState} from 'react';
import {network,verifyBatch} from '../../../lib/editions/batch-registry.mjs';

export default function PublicBatch({proof,items}) {
  const [message,setMessage]=useState(''),[tx,setTx]=useState(''),[busy,setBusy]=useState(false);
  async function check() {
    setBusy(true);setTx('');
    try {
      const result=await verifyBatch(proof,items);
      setMessage(result.published?'공개 기록과 일치해요.':'이 번호는 공방 자체 발행대장에 등록되어 있어요.');
      if(result.published)setTx(result.tx);
    } catch(e){setMessage(e.message);}
    finally{setBusy(false);}
  }
  return <details><summary>공개 테스트넷 기록 조회</summary>
    <button onClick={check} disabled={busy}>{busy?'확인 중…':'공개 기록 확인하기'}</button>
    <output aria-live="polite">{message}</output>
    {tx&&<a href={network.explorer+'/tx/'+tx}>블록체인에서 직접 확인</a>}
  </details>;
}
