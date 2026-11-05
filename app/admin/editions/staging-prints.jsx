'use client';
import {useState} from 'react';
import StagingProducts from './staging-products';
import {RECORDS,issueUrl} from '../../../lib/editions/staging.mjs';
import {Ticket} from '../../editions/workshop-ui';
import s from '../../editions/workshop.module.css';
import studio from './studio.module.css';
import {editionPortraits} from '../../../lib/editions/artwork.mjs';

import {TEST_RECORDS,TEST_ENVIRONMENT,testIssueUrl} from '../../../lib/editions/production-test.mjs';
export default function StagingPrints({productionTest=false}) {
  const recordPath=productionTest?TEST_RECORDS:RECORDS;
  const urlFor=productionTest?testIssueUrl:issueUrl;
  const environment=productionTest?TEST_ENVIRONMENT:'staging-rehearsal';
  const [items,setItems]=useState([]),[message,setMessage]=useState('발행 기록을 불러오고 있어요.');
  async function refreshRecords() {
      try {
        const r=await fetch(recordPath+'/index.json',{credentials:'omit',cache:'no-store'});
        if(!r.ok)throw Error();
        const data=await r.json();
        if(data.environment!==environment||!Array.isArray(data.items))throw Error();
        data.items.forEach(item=>urlFor(item.code));
        setItems(data.items);setMessage(data.items.length?'':'발행된 테스트 번호가 없어요.');
      } catch {setMessage('발행 목록을 불러오지 못했어요. 발행 상태를 새로고침해 주세요.');}
  }
  return <main className={`${s.sheet} ${studio.workshop}`}><header className={studio.shopfront}>
    <div><h1>한정판 공방</h1><p>{productionTest?'운영 테스트':'스테이징'} · 테스트 NFT 전용</p></div>
    <img src={editionPortraits.yeoni} width="84" height="112" alt="" />
  </header>
    <StagingProducts records={items} refreshRecords={refreshRecords}/>
    <h2>캐릭터 QR 보관함</h2>
    <output aria-live="polite">{message}</output>
    {items.map(item=><section key={item.code} id={'qr-'+item.code}><Ticket item={item} serial={item.serial}/>
      <img width="220" height="220" src={recordPath+'/'+item.code+'.png'} alt={item.title+' 발행기록 확인 QR'}/>
      <p>확인 코드: {item.code}</p>
      <a href={recordPath+'/'+item.code+'.png'} download={item.code+'.png'}>QR 이미지 저장하기</a>
      <a href={urlFor(item.code)}>고객 화면 열기</a></section>)}</main>;
}
