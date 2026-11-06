'use client';
import {useEffect,useState} from 'react';
import {Ticket} from '../workshop-ui';
import {readSpring} from '../../../lib/editions/spring-testnet.mjs';
import s from '../workshop.module.css';
export default function SpringCertificate(){
  const [proof,setProof]=useState(null),[message,setMessage]=useState('테스트넷에서 발행 기록을 확인하고 있어요.');
  useEffect(()=>{
    let active=true;
    readSpring(new URLSearchParams(location.search).get('tx')).then(record=>{
      if(active)setProof(record);
    }).catch(err=>{if(active)setMessage(err.message);});
    return ()=>{active=false;};
  },[]);
  return <main className={s.sheet}><header><small>Base Sepolia · 공개 테스트넷</small><h1>연이 봄 부적 발행 기록</h1></header>
    {proof ? <><Ticket item={proof} serial={proof.serial}/><p>총 {proof.cap}개 한정 · 현재 {proof.issued}개 발행</p>
    <a href={proof.explorer}>블록체인에서 직접 확인</a></> : <p role="status">{message}</p>}</main>;
}
