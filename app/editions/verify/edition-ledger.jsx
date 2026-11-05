'use client';
import {useEffect,useState} from 'react';
import {TEST_ENVIRONMENT,TEST_RECORDS} from '../../../lib/editions/production-test.mjs';
import {seriesRows} from '../../../lib/editions/batch-registry.mjs';
import {publicationDate} from '../../../lib/editions/ledger-date.mjs';
import PublicBatch from './public-batch';
import styles from '../workshop.module.css';

export default function EditionLedger({proof}) {
  const [catalog,setCatalog]=useState(null);
  const [error,setError]=useState('');
  const [attempt,retry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    async function load(){
      const response=await fetch(TEST_RECORDS+'/index.json',{cache:'no-store',credentials:'omit',signal:controller.signal});
      if(!response.ok)throw Error('발행대장을 불러오지 못했어요.');
      const data=await response.json();
      const entry=data.items?.find(row=>row.code===proof.code);
      if(data.environment!==TEST_ENVIRONMENT||!entry?.editionId||entry.serial!==proof.serial)throw Error('발행증과 일치하는 번호를 찾지 못했어요.');
      const rows=seriesRows(data.items,{id:entry.editionId,title:proof.title,character:proof.character,cap:proof.cap});
      if(!controller.signal.aborted)setCatalog({rows,items:data.items});
    }
    load().catch(e=>{if(!controller.signal.aborted)setError(e.message);});
    return ()=>controller.abort();
  },[proof,attempt]);
  return <section aria-label="상품별 공개 발행대장"><h2>공개 발행대장</h2>
    {error?<><p role="alert">{error}</p><button onClick={()=>{setError('');retry(n=>n+1);}}>다시 불러오기</button></>:
      !catalog?<p role="status">발행대장을 확인하고 있어요.</p>:<>
      <p className={styles.balance}><strong>총 {proof.cap}개</strong> · 발행 {catalog.rows.length}개 · 남은 {proof.cap-catalog.rows.length}개</p>
      <table className={styles.ledger}><thead><tr><th scope="col">발행 번호</th><th scope="col">발행일 (한국 시간)</th></tr></thead>
      <tbody>{catalog.rows.map(row=>{
        const day=publicationDate(row);
        return <tr key={row.code}><th scope="row">{String(row.serial).padStart(3,'0')}번 {row.code===proof.code&&<small>내 번호</small>}</th>
          <td>{day?<time dateTime={day}>{day.replace(/-/g,'. ')}</time>:'날짜 확인 중'}</td></tr>;
      })}</tbody></table>
      <PublicBatch proof={proof} items={catalog.items}/>
    </>}
  </section>;
}
