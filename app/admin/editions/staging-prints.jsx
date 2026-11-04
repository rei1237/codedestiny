'use client';
import {useState} from 'react';
import StagingProducts from './staging-products';
import {RECORDS,issueUrl} from '../../../lib/editions/staging.mjs';
import {Ticket} from '../../editions/workshop-ui';
import s from '../../editions/workshop.module.css';

export default function StagingPrints() {
  const [items,setItems]=useState([]),[message,setMessage]=useState('발행 기록을 불러오고 있어요.');
  async function refreshRecords() {
      try {
        const r=await fetch(RECORDS+'/index.json',{credentials:'omit',cache:'no-store'});
        if(!r.ok)throw Error();
        const data=await r.json();
        if(data.environment!=='staging-rehearsal'||!Array.isArray(data.items))throw Error();
        data.items.forEach(item=>issueUrl(item.code));
        setItems(data.items);setMessage(data.items.length?'':'발행된 테스트 번호가 없어요.');
      } catch {setMessage('발행 목록을 불러오지 못했어요. 발행 상태를 새로고침해 주세요.');}
  }
  return <main className={s.sheet}><header><small>성장 공방 · 스테이징</small><h1>한정판 공방</h1>
    <p>상품에 이름을 붙이고 한정판 번호를 발행해요. 테스트 체인이 확인한 번호마다 캐릭터 QR이 생겨요.</p></header>
    <StagingProducts records={items} refreshRecords={refreshRecords}/>
    <h2>인쇄용 캐릭터 QR</h2>
    <output aria-live="polite">{message}</output>
    {items.map(item=><section key={item.code}><Ticket item={item} serial={item.serial}/>
      <img width="220" height="220" src={RECORDS+'/'+item.code+'.png'} alt={item.title+' 발행기록 확인 QR'}/>
      <p>확인 코드: {item.code}</p>
      <a href={RECORDS+'/'+item.code+'.png'} download={item.code+'.png'}>QR 이미지 저장하기</a>
      <a href={issueUrl(item.code)}>고객 화면 열기</a></section>)}</main>;
}
