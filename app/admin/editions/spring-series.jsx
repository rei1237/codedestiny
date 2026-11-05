'use client';
import {useState} from 'react';
import {spring,deploySpring,sendSpring,readSpring} from '../../../lib/editions/spring-testnet.mjs';
export default function SpringSeries(){
  const [cap,setCap]=useState('30'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [tx,setTx]=useState(''),[verified,setVerified]=useState(false);
  const [deployment,setDeployment]=useState('');
  async function run(action){
    setBusy(true);setVerified(false);
    try {
      if(action==='check'){await readSpring(tx);setVerified(true);setMessage('001번 발행을 확인했어요.');}
      else {
        if(!window.ethereum)throw Error('테스트넷 발행 지갑이 있는 브라우저에서 열어 주세요.');
        if(action==='deploy'){
          const previous=localStorage.getItem('spring-base-sepolia-deployment');
          const hash=previous || await deploySpring(window.ethereum);
          localStorage.setItem('spring-base-sepolia-deployment',hash);
          setDeployment(hash);setMessage('거래에서 계약 주소를 확인한 뒤 공식 주소로 등록해 주세요.');return;
        }
        const id=await sendSpring(window.ethereum,action,Number(cap));
        if(action==='mint')setTx(id);
        setMessage('거래를 제출했어요. 블록 확정 후 다음 단계로 진행해 주세요. '+id);
      }
    }catch(err){setMessage(err.message);}finally{setBusy(false);}
  }
  return <section><details><summary>연이 봄 부적 · 공개 테스트넷</summary>
    <label>발행 한도<input type="number" min="1" max="100000" step="1" value={cap} onChange={e=>setCap(e.target.value)}/></label>
    <p>한도를 확정하면 같은 시리즈의 수량을 변경할 수 없어요.</p>
    {!spring.contract && <><p>테스트 ETH가 있는 지갑으로 공방 계약을 한 번 배포하고 공식 주소를 등록해 주세요.</p>
      <button disabled={busy||Boolean(deployment)} onClick={()=>run('deploy')}>테스트넷 공방 계약 준비하기</button>
      {/^0x[0-9a-f]{64}$/i.test(deployment)&&<a href={'https://sepolia.basescan.org/tx/'+deployment}>계약 배포 거래 확인</a>}</>}
    <button disabled={busy||!spring.contract} onClick={()=>run('seal')}>{cap}개 한도 확정하기</button>
    <button disabled={busy||!spring.contract} onClick={()=>run('mint')}>001번 발행하기</button>
    <label>001번 발행 거래 번호<input value={tx} onChange={e=>{setTx(e.target.value);setVerified(false);}}/></label>
    <button disabled={busy||!tx} onClick={()=>run('check')}>발행 기록 확인하기</button>
    <output aria-live="polite">{message}</output>
    {verified&&<a href={'/editions/spring/?tx='+encodeURIComponent(tx)}>고객 화면 열기</a>}
  </details></section>;
}
