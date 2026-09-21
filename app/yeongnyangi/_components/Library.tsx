"use client";
import {useEffect,useState} from 'react';
import {fortuneApi,FortuneApiError,loginForCurrentPage,resultPath,type FortuneRecord} from '../_lib/api';
import styles from '../yeongnyangi.module.css';
export default function Library(){
 const [cursor,setCursor]=useState<string|null>(null),[loading,setLoading]=useState(false);
 const [rows,setRows]=useState<FortuneRecord[]|null>(null),[error,setError]=useState('');
 useEffect(()=>{fortuneApi<{fortunes:FortuneRecord[];nextCursor:string|null}>('requests').then(data=>{setRows(data.fortunes);setCursor(data.nextCursor);}).catch(e=>{if(e instanceof FortuneApiError&&e.status===401)loginForCurrentPage();else setError(e.message);});},[]);
 async function more(){if(!cursor||loading)return;setLoading(true);try{const data=await fortuneApi<{fortunes:FortuneRecord[];nextCursor:string|null}>(`requests?cursor=${encodeURIComponent(cursor)}`);setRows(current=>[...(current||[]),...data.fortunes]);setCursor(data.nextCursor);}catch(e){setError(e instanceof Error?e.message:'기록을 더 불러오지 못했어요.');}finally{setLoading(false);}}
 return <section className={styles.consultation}><p className={styles.eyebrow}>CODE DESTINY 계정에 보관된 이야기</p><h1>내 상담 기록</h1>
  {rows===null&&!error&&<p role="status">기록을 불러오고 있어요.</p>}{rows?.length===0&&<p>아직 상담 기록이 없어요. 영냥이에게 첫 이야기를 들려줘.</p>}
  <div className={styles.library}>{rows?.map(row=><a key={row.id} href={`${resultPath(row.id)}&source=library`}><img src={row.product.image} width={120} height={54} alt=""/><div><h2>{row.product.name} · {row.product.fishName}</h2><p>{new Date(row.createdAt).toLocaleDateString('ko-KR')} · {row.state==='COMPLETED'?'결과 보기':row.paid?'상담 이어가기':'결제 확인하기'}</p></div></a>)}</div>
  {cursor&&<button disabled={loading} onClick={()=>void more()}>{loading?"불러오는 중":"이전 상담 더 보기"}</button>}
  {error&&<p role="alert">{error}</p>}<a href="/yeongnyangi/fortune/">새 상담 고르기</a>
 </section>;
}
