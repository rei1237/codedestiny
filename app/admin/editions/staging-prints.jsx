'use client';
import {useEffect,useState} from 'react';
import {RECORDS,issueUrl} from '../../../lib/editions/staging.mjs';
import {Ticket} from '../../editions/workshop-ui';
import s from '../../editions/workshop.module.css';

export default function StagingPrints() {
  const [items,setItems]=useState([]),[message,setMessage]=useState('발행 기록을 불러오고 있어요.');
  useEffect(()=>{
    const abort=new AbortController();
    (async()=>{
      try {
        const r=await fetch(RECORDS+'/index.json',{credentials:'omit',cache:'no-store',signal:abort.signal});
        if(!r.ok)throw Error();
        const data=await r.json();
        if(data.environment!=='staging-rehearsal'||!Array.isArray(data.items))throw Error();
        data.items.forEach(item=>issueUrl(item.code));
        setItems(data.items);setMessage(data.items.length?'':'발행된 테스트 번호가 없어요.');
      } catch {if(!abort.signal.aborted)setMessage('발행 목록을 불러오지 못했어요. 페이지를 새로고침해 주세요.');}
    })();
    return ()=>abort.abort();
  },[]);
  return <main className={s.sheet}><header><small>성장 공방 · 스테이징</small><h1>한정판 공방</h1>
    <p>이번 스테이징 배포에서 발행한 테스트 QR이에요. 휴대폰 카메라로 찍어 고객 화면을 확인해 보세요.</p></header>
    <output aria-live="polite">{message}</output>
    {items.map(item=><section key={item.code}><Ticket item={item} serial={item.serial}/>
      <img width="220" height="220" src={RECORDS+'/'+item.code+'.png'} alt={item.title+' 발행기록 확인 QR'}/>
      <p>확인 코드: {item.code}</p>
      <a href={RECORDS+'/'+item.code+'.png'} download={item.code+'.png'}>QR 이미지 저장하기</a>
      <a href={issueUrl(item.code)}>고객 화면 열기</a></section>)}</main>;
}
