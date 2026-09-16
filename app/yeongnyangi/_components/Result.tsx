"use client";
import {useEffect,useRef,useState} from 'react';
import {fortuneApi,FortuneApiError,loginForCurrentPage,checkoutPath,type FortuneRecord} from '../_lib/api';
import styles from '../yeongnyangi.module.css';
export default function Result(){
 const [row,setRow]=useState<FortuneRecord|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false),mounted=useRef(true);
 async function generate(id:string){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{
   while(mounted.current){
    const {fortune}=await fortuneApi<{fortune:FortuneRecord}>(`requests/${id}/generate`,{});
    if(!mounted.current)break;setRow(fortune);
    if(fortune.state==='COMPLETED')break;
    if(fortune.state==='FORTUNE_FAILED')throw new Error('상담을 잠시 멈췄어요. 저장된 내용부터 다시 이어갈 수 있어요.');
    if(fortune.state==='GENERATING')await new Promise(r=>setTimeout(r,3000));
   }
  }catch(e){if(e instanceof FortuneApiError&&e.status===401)loginForCurrentPage();else if(mounted.current)setError(e instanceof Error?e.message:'상담을 이어가지 못했어요.');}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 }
 useEffect(()=>{
  mounted.current=true;
  const id=new URLSearchParams(window.location.search).get('id')||'';
  if(!/^[a-f0-9]{64}$/.test(id)){setError('상담을 찾지 못했어요. 내 상담 기록에서 다시 선택해 주세요.');return;}
  (async()=>{
   try{
    let {fortune}=await fortuneApi<{fortune:FortuneRecord}>(`requests/${id}`);
    if(!fortune.paid){
     try{fortune=(await fortuneApi<{fortune:FortuneRecord}>(`requests/${id}/activate`,{})).fortune;}
     catch(e){if(!(e instanceof FortuneApiError&&e.status===402))throw e;}
    }
    if(mounted.current)setRow(fortune);
   }catch(e){if(e instanceof FortuneApiError&&e.status===401)loginForCurrentPage();else if(mounted.current)setError(e instanceof Error?e.message:'상담을 찾지 못했어요.');}
  })();
  return ()=>{mounted.current=false;};
 },[]);
 return <section className={styles.reader}>
  <p className={styles.eyebrow}>영냥이의 상담 두루마리</p><h1>{row?`${row.product.name} · ${row.product.fishName}`:'상담 결과'}</h1>
  {!row&&!error&&<p role="status">저장된 상담을 불러오고 있어요.</p>}
  {row&&<>
   <div id="reading-progress" className={styles.progress}><img src="/assets/yeongnyangi/hero.webp" width={120} height={120} alt="상담을 준비하는 영냥이"/>
    <div><p>{row.state==='COMPLETED'?'네 이야기를 모두 펼쳐두었어. 천천히 읽어봐.':`${row.chapters.length} / ${row.manifest.length}개 챕터 저장됨`}</p>
     <progress value={row.chapters.length} max={row.manifest.length} aria-label="상담 생성 진행률"/>
     {row.paid&&row.state!=='REFUNDED'&&row.state!=='COMPLETED'&&<><p>결제가 확인됐어요. 창을 닫아도 저장된 챕터부터 이어갈 수 있어요.</p><button disabled={busy} onClick={()=>void generate(row.id)}>{busy?'영냥이가 차근차근 읽고 있어요':row.chapters.length?'남은 상담 이어가기':'영냥이 상담 시작하기'}</button></>}
     {row.state==='REFUNDED'&&<p>환불된 상담이에요. 결제 내역에서 처리 상태를 확인해 주세요.</p>}
     {!row.paid&&row.state!=='REFUNDED'&&<><p>아직 확인된 결제가 없어요. 결제를 마쳤다면 먼저 결제 상태를 다시 확인해 주세요.</p><button onClick={()=>window.location.reload()}>결제 상태 다시 확인하기</button><a className={styles.button} href={checkoutPath(row)}>결제 내용 확인하기</a></>}
    </div>
   </div>
   <nav aria-label="상담 목차" className={styles.contents}><h2>목차</h2>{row.manifest.map((chapter,index)=><a key={chapter.id} href={index<row.chapters.length?`#chapter-${chapter.id}`:'#reading-progress'} aria-disabled={index>=row.chapters.length}>{index+1}. {chapter.title}{index>=row.chapters.length?' · 준비 중':''}</a>)}</nav>
   {row.chapters.map((chapter,index)=><article key={row.manifest[index].id} id={`chapter-${row.manifest[index].id}`} className={styles.chapter}>
    <p className={styles.eyebrow}>{index+1}번째 이야기</p><h2>{row.manifest[index].title}</h2><p className={styles.summary}>{chapter.summary}</p>
    {chapter.blocks?.length?chapter.blocks.map((block,b)=><section key={b}><h3>{block.title}</h3>{block.paragraphs.map((text,i)=><p key={i}>{text}</p>)}</section>):chapter.analysis.map((text,i)=><p key={i}>{text}</p>)}
    <h3>생활 속에서는</h3><p>{chapter.example}</p><h3>지금 해볼 일</h3><p>{chapter.advice}</p><blockquote>{chapter.persona}</blockquote>
   </article>)}
  </>}
  {error&&<p role="alert">{error} 결제가 확인된 상담은 다시 결제하지 마세요.</p>}
  {row&&<p className={styles.orderId}>상담 주문번호: {row.id}</p>}
  <a href="/yeongnyangi/library/">내 상담 기록으로</a>
 </section>;
}
