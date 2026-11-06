'use client';
import {useState} from 'react';
import {network, registryState, submitBatch} from '../../../lib/editions/batch-registry.mjs';

async function testWallet() {
  const wallet=window.ethereum;
  if(!wallet)throw Error('MetaMask가 설치된 브라우저에서 열어 주세요.');
  if(await wallet.request({method:'eth_chainId'})!==network.chain){
    try {await wallet.request({method:'wallet_switchEthereumChain',params:[{chainId:network.chain}]});}
    catch(e){if(e.code!==4902)throw e;
      await wallet.request({method:'wallet_addEthereumChain',params:[{chainId:network.chain,chainName:network.name,
        nativeCurrency:{name:'Test tez',symbol:'XTZ',decimals:18},rpcUrls:[network.rpc],blockExplorerUrls:[network.explorer]}]});}
  }
  return wallet;
}
export default function BatchControls({product,records}){
  const [state,setState]=useState(null),[busy,setBusy]=useState(false),[note,setNote]=useState(''),[tx,setTx]=useState('');
  const count=records.filter(r=>r.editionId===product.id).length;
  const action=!state?.deployed?'deploy':count>state.published?'publish':!state.cap?'seal':null;
  async function run(write=false){
    setBusy(true);setNote('');
    try{
      if(write){const hash=await submitBatch(action,product,records,await testWallet());setTx(hash);setState(null);setNote('전송했어요. 거래가 확정되면 공개 상태를 확인해 주세요.');}
      else setState(await registryState(product));
    }catch(e){setState(null);setNote(e.code===4001?'지갑 요청을 취소했어요.':e.message);}
    finally{setBusy(false);}
  }
  return <details onToggle={e=>{if(e.currentTarget.open&&!state&&!busy)run();}}>
    <summary>공개 기록 관리</summary>
    <p>발행한 번호를 모아 테스트넷에 한 번에 기록해요. 고객은 지갑 없이 확인할 수 있어요.</p>
    {state&&<p>공방 발행 {count}개 · 블록체인 기록 {state.published}개</p>}
    {state&&action&&<button type="button" disabled={busy} onClick={()=>run(true)}>{action==='deploy'?'공개 기록 시작하기 · 최초 1회':action==='seal'?'한도 '+product.cap+'개 공개하기':(state.published+1)+'~'+count+'번 묶어서 공개하기'}</button>}
    <button type="button" disabled={busy} onClick={()=>run()}>{busy?'확인 중…':'공개 상태 확인'}</button>
    <output aria-live="polite">{note}</output>{tx&&<a href={network.explorer+'/tx/'+tx}>보낸 거래 보기</a>}
  </details>;
}
