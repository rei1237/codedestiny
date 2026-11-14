import {lazy,Suspense,useEffect,useState} from 'react';
import {Button} from './Button';
import {birthSystems,questions} from './content';

import FortuneDirectory from './FortuneDirectory';
import type {Consultation,Destination} from './home-directory';

const MoonlightQuestions=lazy(()=>import('./MoonlightQuestions'));

export default function UnifiedHome({onOpen,onConsult}:{onOpen:(page:Destination)=>void;onConsult:(service:Consultation,question?:typeof questions[number])=>void}){
 const currentWorld=()=>{if(/^\/yeongnyangi\/?$/.test(window.location.pathname))return 'yeongnyangi';const value=new URLSearchParams(window.location.search).get('world');return value==='ggulggul'||value==='yeongnyangi'?value:'home';};
 const [world,showWorld]=useState<'home'|'yeongnyangi'|'ggulggul'>(currentWorld);
 function setWorld(next:typeof world){
  if(next===world)return;
  window.history.pushState({studioWorld:true},'',next==='home'?'/':'/?world='+next);showWorld(next);window.scrollTo(0,0);
 }
 useEffect(()=>{
  const pop=()=>showWorld(currentWorld());
  const back=(event:Event)=>{if(currentWorld()==='home')return;event.preventDefault();if(window.history.state?.studioWorld)window.history.back();else location.replace('/');};
  window.addEventListener('popstate',pop);window.addEventListener('code-destiny:toss-back',back);
  return ()=>{window.removeEventListener('popstate',pop);window.removeEventListener('code-destiny:toss-back',back);};
 },[]);
 return <div className={'unified-home world-'+world}>
  <header className="unified-brand"><img src="/assets/yeoni-flower-pig.webp" alt="" width={40} height={40}/><strong>꿀꿀 운세</strong><button onClick={()=>onOpen('settings')}>내 정보</button></header>
  <nav className="world-navigation" aria-label="서비스 공간">{[['home','전체'],['ggulggul','꿀꿀운세'],['yeongnyangi','영냥이']].map(([id,label])=><button key={id} aria-current={world===id?'page':undefined} onClick={()=>setWorld(id as typeof world)}>{label}</button>)}</nav>
  {world==='home'?<><div className="world-opening"><h1>어떤 운세를<br/>만나볼까요?</h1></div><div className="world-entries">{[{id:'ggulggul' as const,art:'yeoni',title:'꿀꿀 운세',description:'사주·타로부터 주제별 리포트까지',action:'운세 골라보기'},{id:'yeongnyangi' as const,art:'yeongnyangi',title:'운세보는 영냥이',description:'내 질문과 상황을 바탕으로 깊이 읽기',action:'영냥이 만나기'}].map(item=><button key={item.id} className={'world-entry world-entry-'+item.id} onClick={()=>setWorld(item.id)}><img src={'/assets/root-card-'+item.art+'.webp'} alt="" width={360} height={480}/><span><strong>{item.title}</strong><small>{item.description}</small><b>{item.action} <span aria-hidden>→</span></b></span></button>)}</div></>:world==='yeongnyangi'?<>
   <section className="world-cat-hero"><img className="world-room" src="/assets/consultation-room-mobile.webp" alt="" width={768} height={1152}/><div><h1>영냥이의<br/>달빛 점술방</h1><p>네 질문과 상황을 듣고,<br/>답과 근거, 지금 해볼 행동을 함께 읽어.</p><Button onClick={()=>onConsult('yeongnyangi')}>내 고민 상담하기</Button></div><img className="world-cat" src="/assets/yeongnyangi.webp" alt="이야기를 기다리는 영냥이" width={800} height={800}/></section>
   <h2>상담 방식 고르기</h2><div className="world-services">{birthSystems.map(({id,name})=><button key={id} onClick={()=>location.assign('/yeongnyangi/fortune/?domain='+id+'&flow=question')}><strong>{name} 상담</strong><span aria-hidden>→</span></button>)}<button onClick={()=>location.assign('/yeongnyangi/fortune/?flow=legacy')}><strong>분야별 리포트</strong><small>체계·상담 종류·생선 등급으로 고르기</small></button><button onClick={()=>location.assign("/yeongnyangi/fortune/?flow=relationship")}><strong>두 사람의 관계</strong><small>관계와 두 사람의 정보로 상담 고르기</small></button><button onClick={()=>location.assign("/yeongnyangi/fortune/?flow=legacy&domain=fusion")}><strong>융합 상담</strong><small>여러 체계의 근거 함께 살펴보기</small></button><button onClick={()=>location.assign("/yeongnyangi/fortune/?mode=spirit")}><strong>영냥 신점</strong><small>질문이 떠오른 순간의 프라슈나</small></button><button onClick={()=>location.assign("/yeongnyangi/fortune/?mode=horary")}><strong>영냥 호라리</strong><small>질문 시각의 차트와 해석 프롬프트</small></button></div><Suspense fallback={<p role="status">질문을 펼치고 있어요.</p>}><MoonlightQuestions/></Suspense><button className="daily-entry" onClick={()=>onOpen('daily')}><span><strong>오늘의 운세와 출석</strong><small>영냥이와 오늘의 흐름 살펴보기</small></span><span aria-hidden>→</span></button><Button onClick={()=>onOpen('moonlight/season-1')}>영냥이의 점술방 시즌 1 읽기</Button><button className="world-crosslink" onClick={()=>setWorld('ggulggul')}>사주·타로·주제별 운세는 꿀꿀운세에서 <span aria-hidden>→</span></button>
  </>:<>
   <section className="world-flower-hero"><div><p className="eyebrow">꽃돼지 연이의 안내</p><h1>오늘은 어떤<br/>이야기를 펼칠까요?</h1><p>나를 알아가는 사주,<br/>마음을 비추는 타로와 운세.</p></div><img src="/images/fortune-tea-house/flower-pig-flower.webp" alt="꽃을 든 연이" width={500} height={500}/></section>
   <FortuneDirectory onOpen={onOpen} onConsult={onConsult}/>
  </>}
  <footer className="world-footer">{world==='yeongnyangi'?<a href="/yeongnyangi/library/">영냥이 보관함</a>:<a href="/records/">꿀꿀운세 구매 기록</a>}<a href="/recovery">구매 복구</a><button onClick={()=>onOpen('settings')}>설정·고객지원</button></footer>
 </div>;
}
