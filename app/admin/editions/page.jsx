'use client';
import {useEffect,useState} from 'react';
import {adminFetch} from '../_lib/admin-api';
import {useWorkshopMode,Ticket,characters} from '../../editions/workshop-ui';
import StagingPrints from './staging-prints';
import s from '../../editions/workshop.module.css';

const empty={title:'',character:'yeoni',cap:3,channel:'스마트스토어',sku:''};
const endpoint='/api/admin/editions';
export default function Workshop(){
  const [items,setItems]=useState([]),[form,setForm]=useState(empty),[busy,setBusy]=useState(false);
  const [notice,setNotice]=useState(''),[qr,setQr]=useState(null);
  async function run(action){
    setBusy(true);setQr(null);
    try{
      const data=await adminFetch(location.origin+endpoint,action?{method:'POST',body:action}:{});
      if(data.editions)setItems(data.editions);
      if(action?.action==='draft')setForm(empty);
      if(data.png)setQr({...data,code:action.code});
      setNotice(action?'기록을 확인했어요.':'');
    }catch(err){setNotice(err.message || '기록을 다시 확인해 주세요.');}finally{setBusy(false);}
  }
  const mode=useWorkshopMode();
  useEffect(()=>{if(mode==='local')run();},[mode]);
  if(mode==='staging'||mode==='production-test')return <StagingPrints productionTest={mode==='production-test'}/>;
  if(mode==='closed')return <main className={s.sheet}>공방이 열리지 않았어요.</main>;
  return <main className={s.sheet}><header><small>성장 공방 · 로컬 개발 체인</small><h1>한정판 공방</h1>
    <p>작품과 한도를 확정한 뒤, 실물에 넣을 발행증을 준비해요.</p></header>
    <section><h2>{form.id?'초안 수정':'새 에디션'}</h2><form onSubmit={e=>{e.preventDefault();run({...form,action:'draft'});}}>
    <label>캐릭터<select value={form.character} onChange={e=>setForm({...form,character:e.target.value})}>{Object.entries(characters).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    <label>상품명<input required maxLength={80} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
    <label>발행 한도<input type="number" min="1" max="100000" required value={form.cap||''} onChange={e=>setForm({...form,cap:Number(e.target.value)})}/></label>
    <label>판매 채널<select value={form.channel} onChange={e=>setForm({...form,channel:e.target.value})}><option>스마트스토어</option><option>자사몰</option></select></label>
    <label>내부 상품 식별자 (선택)<input maxLength={80} value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})}/></label>
    <Ticket item={form} serial={1} preview/><button disabled={busy}>초안 저장하기</button></form></section>
    <output aria-live="polite">{notice}</output><section><h2>에디션 목록</h2><button disabled={busy} onClick={()=>run()}>기록 새로고침</button>
    {!items.length&&<p>저장한 에디션이 없어요.</p>}
    {items.map(e=>{
      const next=e.issues.find(r=>r.state!=='confirmed')?.serial || e.issues.length+1;
      return <section key={e.id}><h2>{e.title}</h2><p>{characters[e.character]} · {e.cap}개 한정 · {e.issues.filter(r=>r.state==='confirmed').length}개 발행 · {e.stage==='draft'?'초안':e.stage==='sealed'?'한도 확정':'확정 확인 중'}</p>
      {e.stage==='draft'&&<button disabled={busy} onClick={()=>{setForm(e);window.scrollTo(0,0);}}>초안 수정하기</button>}
      {e.stage!=='sealed'?<><p>이 에디션은 최대 {e.cap}개이며, 확정 후 한도와 작품을 바꿀 수 없어요.</p><button disabled={busy} onClick={()=>run({action:'seal',id:e.id})}>{e.cap}개 한도 확정하기</button></>:next<=e.cap&&<button disabled={busy} onClick={()=>run({action:'mint',id:e.id,serial:next})}>{next}번 {e.issues.some(r=>r.serial===next)?'발행 다시 확인하기':'발행하기'}</button>}
      {e.issues.map(r=><div key={r.serial}><strong>{r.serial}번 · {r.reason?'무효':({confirmed:'발행 확정',pending:'체인 확인 중',failed:'발행 실패'})[r.state]}</strong>
      {r.state==='confirmed'&&!r.reason&&<><button disabled={busy} onClick={()=>run({action:'qr',code:r.code,origin:location.origin})}>{r.serial}번 QR 준비하기</button><details><summary>무효 처리</summary><form onSubmit={event=>{event.preventDefault();run({action:'void',id:e.id,serial:r.serial,reason:new FormData(event.currentTarget).get('reason')});}}><label>무효 사유<input name="reason" required maxLength={100}/></label><button disabled={busy}>번호 무효 처리하기</button></form></details></>}</div>)}
      <details><summary>발행 작업 기록</summary><ol>{e.audit.map((a,i)=><li key={i}>{a.at} UTC · {a.action}</li>)}</ol></details></section>;
    })}</section>
    {qr&&<section><h2>인쇄용 발행증</h2><img width="240" height="240" src={qr.png} alt="발행 기록 확인 QR"/><p>확인 코드: {qr.code}</p><a href={qr.png} download={'edition-'+qr.code+'.png'}>QR 이미지 저장하기</a><a href={qr.url}>고객 화면 열기</a></section>}</main>;
}
