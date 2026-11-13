import {useEffect,useState} from 'react';
import {INTENTS,readRoyalTea,certificateStyles} from 'virtual:toss-royal-tea';
import {api} from './platform';
import TossSessionScope from './TossSessionScope';
import {Button} from './Button';

function guestKey(){
  try{
    const existing=localStorage.getItem('royal_tea_guest_key');
    if(existing)return existing;
    const key='g:'+Math.random().toString(36).slice(2,12);
    localStorage.setItem('royal_tea_guest_key',key);return key;
  }catch{return 'g:anonymous';}
}

function TeaRoom({drinker}:{drinker:string}){
  const [intent,setIntent]=useState('choice');
  const [result,setResult]=useState<ReturnType<typeof readRoyalTea>|null>(null);
  const [history,setHistory]=useState<{label:string;title:string}[]>([]);
  useEffect(()=>{
    if(!result)return;
    window.scrollTo(0,0);
    const back=(event:Event)=>{event.preventDefault();setResult(null);};
    window.addEventListener('code-destiny:toss-back',back);
    return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[result]);
  if(result)return <section className="royal-tea-reading"><h1>왕실 찻잎 감정서</h1>
    <style>{certificateStyles}</style>
    <article className="paper" style={{background:'#0c1018',color:'#fdf6e3','--gold':'#d9b25b','--gold-light':'#f1d89a','--gold-dim':'#b99d67'} as React.CSSProperties} aria-label={result.title} dangerouslySetInnerHTML={{__html:result.html}}/>
    <Button onClick={()=>setResult(null)}>다른 질문으로 읽기</Button>
  </section>;
  return <section><h1>영국 홍차점</h1><p>물어보고 싶은 분야를 고른 뒤 잔 가장자리와 벽, 바닥에 남은 세 형상을 읽어요.</p><div className="form"><label>질문 영역<select value={intent} onChange={event=>setIntent(event.target.value)}>{INTENTS.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <Button onClick={()=>{
      const next=readRoyalTea(intent,drinker);
      setResult(next);setHistory(items=>[{title:next.title,label:INTENTS.find(item=>item.id===intent)!.label},...items].slice(0,8));
    }}>찻잔 읽기</Button></div>
    {history.length>0&&<details className="paper"><summary>이번에 읽은 잔</summary>{history.map((item,i)=><p key={i}>{item.label} · {item.title}</p>)}</details>}
  </section>;
}
function AccountTea({loggedIn}:{loggedIn:boolean}){
  const [owner,setOwner]=useState(''),[retry,setRetry]=useState(0),[error,setError]=useState(false);
  useEffect(()=>{
    let live=true;setError(false);
    if(!loggedIn){setOwner(guestKey());return;}
    api<{user:{id:string}}>('/canonical/auth/me').then(data=>{if(!data.user?.id)throw Error();if(live)setOwner('u:'+data.user.id);}).catch(()=>{if(live)setError(true);});
    return ()=>{live=false;};
  },[loggedIn,retry]);
  if(error)return <p role="alert">계정을 확인하지 못했어요. <Button onClick={()=>setRetry(n=>n+1)}>다시 확인하기</Button></p>;
  return owner?<TeaRoom key={owner} drinker={owner}/>:<p role="status">찻잔을 준비하고 있어요.</p>;
}
export default function RoyalTea({loggedIn}:{loggedIn:boolean}){return <TossSessionScope><AccountTea key={String(loggedIn)} loggedIn={loggedIn}/></TossSessionScope>;}
