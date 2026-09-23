"use client";
import {depthDescriptions} from '@/worker/yeongnyangi/fortune/reading-policy';
import {consultationTitle,fusionDescription} from '../_lib/consultation-copy';
import {useEffect,useState} from 'react';
import type {Product} from '@/worker/yeongnyangi/payments/catalog';

const reactions:Record<string,[string,string]>={mackerel:['어? 고등어잖아! 눈이 번쩍 뜨인다냥.','고등어 잘 받았다냥. 네 핵심부터 야무지게 읽어줄게.'],salmon:['연어라니, 입꼬리가 자꾸 올라간다냥.','부드러운 연어 고맙다냥. 네 이야기도 찬찬히 풀어볼게.'],flounder:['광어 앞에서는 앞발부터 들린다냥!','광어 잘 받았다냥! 네 선택의 흐름까지 꼼꼼히 보자.'],tuna:['참치는… 살짝 안아봐도 되냥?','참치 품에 안고 힘냈다냥. 긴 이야기는 목차부터 천천히 읽어봐.'],assorted:['이것도 저것도? 어디부터 볼지 행복한 고민이다냥!','모둠 잘 받았다냥! 두 체계의 공통점과 다른 점을 나란히 펼쳐볼게.'],omakase:['잠깐, 이게 전부 내 거라고?! 앞발이 가만히 안 있는다냥!','오마카세라니, 냐아앙! 고맙다냥! 여섯 시선을 모은 네 운명서를 펼쳐볼게!']};
export function FishReaction({product,paid=false}:{product:Product;paid?:boolean}) {return <aside className={`fish-reaction ${paid?'fish-thanks':''} ${paid&&product.fishId==='omakase'?'omakase-burst':''}`} aria-live="polite"><img src={product.reactionAsset} width={300} height={300} alt={`${product.fishName}에 기뻐하는 영냥이`}/><div><small>{paid?'구매 확인 · 영냥이의 감사 인사':'생선을 고르는 중 · 영냥이의 기대'}</small><p>{reactions[product.fishId]?.[paid?1:0]}</p></div></aside>;}
export default function FishCatalog({fusionOnly=false,layout='grid'}:{fusionOnly?:boolean;layout?:'grid'|'list'}) {
 const [products,setProducts]=useState<(Product&{available:boolean})[]>([]),[failed,setFailed]=useState(false),[loading,setLoading]=useState(true),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  setLoading(true);setFailed(false);
  fetch('/api/yeongnyangi/products',{cache:'no-store',signal:controller.signal})
   .then(r=>{if(!r.ok)throw Error();return r.json();})
   .then(d=>{if(!Array.isArray(d.products)||!d.products.length)throw Error();setProducts(d.products);})
   .catch(()=>{if(!controller.signal.aborted)setFailed(true);})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return ()=>controller.abort();
 },[attempt]);
 const items=fusionOnly?products.filter(p=>p.readingKind!=='single'):products.filter((p,i,a)=>a.findIndex(x=>x.fishId===p.fishId)===i);
 return <section className={`fish-catalog${layout==='list'?' fish-catalog-compact':''}`} aria-label={fusionOnly?'초융합 상담 선택':'생선 오마카세 가격표'} aria-busy={loading}>
  <h2>{fusionOnly?'어떤 시선으로 너를 읽어볼까?':'영냥이의 생선 오마카세 가격표'}</h2>
  <p>{fusionOnly?'두 체계를 깊게 읽는 모둠부터, 여섯 체계를 펼치는 오마카세까지. 네 고민에 맞는 한 권을 골라봐.':'한 분야를 깊게, 또는 여러 체계의 공통점과 차이까지.'}</p>
  {loading?<p role="status">영냥이가 상담 메뉴를 펼치고 있다냥.</p>:failed?<div role="alert"><p>상담 메뉴를 불러오지 못했어. 한 번 더 확인해줄래?</p><button type="button" className="catalog-retry" onClick={()=>setAttempt(n=>n+1)}>상담 메뉴 다시 확인하기</button></div>:<>
   <div className={layout==='list'?'fish-catalog-list':'fish-catalog-grid'}>{items.map(p=><a key={p.id} href={p.available?(p.readingKind==='single'?`/yeongnyangi/fortune/?domain=${p.domain}&fish=${p.fishId}`:`/yeongnyangi/fortune/?product=${p.id}`):undefined} aria-disabled={p.available?undefined:true}>
    <img src={p.image} width={220} height={180} alt="" loading="lazy"/>
    <span>{fusionOnly?consultationTitle(p):p.fishName}</span><strong>{p.priceKRW.toLocaleString('ko-KR')}원</strong>
    <small>{p.chapterCount}챕터 · {p.readingKind==='single'?'선택한 한 분야':p.readingKind==='pair'?'두 체계 교차분석':'여섯 체계 전체 통합'} · 단건 결제</small>
    <p>{fusionDescription(p)||depthDescriptions[p.fishId]}</p><b>{p.available?'이 상담 선택하기 →':'지금은 상담을 잠시 쉬고 있어'}</b>
   </a>)}</div>
   {items.some(p=>!p.available)&&<p role="status">지금은 상담 연결을 확인하고 있어. 결제는 진행되지 않아. <button type="button" className="catalog-retry" onClick={()=>setAttempt(n=>n+1)}>상담 가능 여부 다시 확인하기</button></p>}
   {fusionOnly&&<p className="catalog-delivery">프로필과 질문 확인 → 단건 결제 → 내 상담 기록에서 이어 읽기. 결제 후에는 완성된 챕터부터 펼쳐줄게.</p>}
  </>}
 </section>;
}
