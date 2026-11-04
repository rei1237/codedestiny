'use client';
import {useEffect,useRef,useState} from 'react';
import {adminFetch} from '../_lib/admin-api';
import {Ticket,characters} from '../../editions/workshop-ui';

const blank = {title:'',character:'yeoni',cap:3};
export default function StagingProducts({records, refreshRecords}) {
  const [form,setForm]=useState(blank);
  const [products,setProducts]=useState([]);
  const [busy,setBusy]=useState(true);
  const [notice,setNotice]=useState('');
  const draftId=useRef(null);
  const endpoint=()=>location.origin+'/api/admin/editions';

  async function refresh() {
    setBusy(true);
    try {
      const data=await adminFetch(endpoint());
      setProducts(data.products);
      await refreshRecords();
      setNotice('');
    } catch (error) {
      setNotice(error.message);
    } finally {setBusy(false);}
  }
  useEffect(()=>{refresh();},[]); // initial load; later refreshes follow explicit actions

  async function save(action) {
    setBusy(true);
    try {
      const data=await adminFetch(endpoint(),{method:'POST',body:action});
      setProducts(data.products);
      if (action.action==='add') {
        setForm(blank);
        draftId.current=null;
      }
      setNotice(data.notice || (action.action==='add'?'상품을 추가했어요.':'발행 목록을 확인해 주세요.'));
    } catch (error) {setNotice(error.message);}
    finally {setBusy(false);}
  }
  return <>
    <section><h2>새 상품 추가</h2>
      <form onSubmit={event=>{
        event.preventDefault();
        draftId.current ??= crypto.randomUUID();
        save({...form,id:draftId.current,action:'add'});
      }}>
        <label>캐릭터<select value={form.character} onChange={e=>setForm({...form,character:e.target.value})}>
          {Object.entries(characters).map(([id,name])=><option key={id} value={id}>{name}</option>)}
        </select></label>
        <label>상품명<input required maxLength={80} placeholder="예: 연이의 연꽃 부적" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
        <label>발행 한도<input type="number" required min="1" max="100" value={form.cap || ''} onChange={e=>setForm({...form,cap:Number(e.target.value)})}/></label>
        <Ticket item={form} serial={1} preview/>
        <p>추가하면 상품명·캐릭터·한도가 확정돼요. NFT는 상품을 추가한 뒤 번호별로 발행해요.</p>
        <button disabled={busy || !form.title.trim()}>상품 추가하기</button>
      </form>
    </section>
    <section><h2>내 상품</h2><button disabled={busy} onClick={refresh}>발행 상태 새로고침</button>
      <output aria-live="polite">{notice}</output>
      {!products.length && !busy && <p>아직 등록한 상품이 없어요.</p>}
      {products.map(product=>{
        const confirmed=records.filter(row=>row.editionId===product.id).length;
        const pending=confirmed<product.issueCount;
        return <article key={product.id}>
          <h3>{product.title}</h3>
          <p>{characters[product.character]} · {product.cap}개 한정 · {confirmed}개 발행 완료</p>
          {pending ? <p>{product.issueCount}번 발행 대기 중 · 검증이 끝나면 아래에 QR이 표시돼요.</p>
          : product.issueCount===product.cap ? <p>모든 번호를 발행했어요.</p>
          : <button disabled={busy} onClick={()=>save({action:'mint',id:product.id,serial:product.issueCount+1})}>{product.issueCount+1}번 NFT 발행하기</button>}
        </article>;
      })}
    </section>
  </>;
}
