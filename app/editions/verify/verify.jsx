'use client';
import {useEffect,useState,useRef} from 'react';
import {useWorkshopMode,Ticket} from '../workshop-ui';
import {readStagingRecord} from '../../../lib/editions/staging.mjs';
import {readTestRecord} from '../../../lib/editions/production-test.mjs';
import EditionLedger from './edition-ledger';
import s from '../workshop.module.css';
export default function Verify(){
  const [code,setCode]=useState(''),[proof,setProof]=useState(null),[message,setMessage]=useState('');
  const sequence=useRef(0), mode=useWorkshopMode();
  async function lookup(value){
    const turn=++sequence.current;
    setProof(null);setMessage('발행 기록을 확인하고 있어요.');
    try {
      let data;
      if(mode==='production-test') data=await readTestRecord(value.trim());
      else if(mode==='staging') data=await readStagingRecord(value.trim());
      else {
        const r=await fetch('/api/editions/verify?code='+encodeURIComponent(value.trim()),{cache:'no-store'});
        data=await r.json(); if(!r.ok)throw Error(data.message || '발행 기록을 확인하지 못했어요.');
      }
      if(turn===sequence.current){setProof(data);setMessage(data.status==='void'?'무효 처리된 발행 기록이에요.':'공식 발행기록과 일치합니다.');}
    }catch(err){if(turn===sequence.current)setMessage(err.message || '잠시 후 다시 확인해 주세요.');}
  }
  useEffect(()=>{const value=new URLSearchParams(location.search).get('code');if(mode!=='closed'&&value){setCode(value);lookup(value);}return ()=>{sequence.current++;};},[mode]);
  if(mode==='closed')return <main className={s.sheet}>공방이 열리지 않았어요.</main>;
  return <main className={s.sheet}><header><small>꿀꿀 운세 · {mode==='production-test'?'운영 테스트 발행':mode==='staging'?'스테이징 테스트 발행':'로컬 개발 체인'}</small><h1>한정판 발행기록 확인</h1></header>
    {mode!=='local'&&<p>격리된 테스트 체인에서 발행할 때 확인한 기록이에요. 메인넷 NFT가 아니며, 로그인이나 지갑 연결 없이 볼 수 있어요.</p>}
    {proof && <Ticket item={proof} serial={proof.serial}/>}<output aria-live="polite">{message}</output>
    {proof?.status==='verified' && mode==='production-test' && <EditionLedger key={proof.code} proof={proof}/>}
    {proof && <><p>실물에 인쇄된 번호와 대조해 주세요. 이 기록은 발행 사실을 보여 주며, 실물의 소유권이나 진품 여부까지 증명하지 않아요.</p>
    <details><summary>공방 자체 발행 근거 보기</summary><dl>{Object.entries({'체인 ID':proof.chainId,'계약 주소':proof.contract,'토큰 번호':proof.token,'거래 기록':proof.tx,'블록 번호':proof.block,'작품 SHA-256':proof.digest,'검증 당시 누적 발행량':proof.issued}).map(([key,v])=><div key={key}><dt>{key}</dt><dd>{v}</dd></div>)}</dl></details></>}
    <form onSubmit={e=>{e.preventDefault();lookup(code);}}><label>인쇄된 확인 코드<input value={code} required maxLength={24} autoCapitalize="none" onChange={e=>{sequence.current++;setCode(e.target.value);setProof(null);setMessage('');}}/></label><button>번호 확인하기</button></form></main>;
}
