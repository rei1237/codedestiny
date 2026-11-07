import {useEffect,useLayoutEffect,useRef,useState,type FormEvent} from 'react';
import {BirthFields,birthPayload,emptyBirth} from './BirthFields';
import {Button} from './Button';
import {api} from './platform';
import TossSessionScope from './TossSessionScope';

type System='astrology'|'vedic';
type Position={name:string;sign:string;house:number};
type Result={system:System;ascendant:string;positions:Position[];mansion?:{name:string;pada:number}};
const title={astrology:'서양 점성술 출생차트',vedic:'베다점 출생차트'};
const basis={astrology:'태어난 순간의 행성을 열대황도와 플라시두스 하우스로 살펴봐요.',vedic:'라히리 항성황도에서 달이 머문 별과 태어난 순간 떠오른 별자리를 살펴봐요.'};
function valid(r:Result,system:System){
  return r?.system===system&&typeof r.ascendant==='string'&&r.ascendant.length>0&&Array.isArray(r.positions)&&r.positions.length===(system==='vedic'?9:10)
    &&r.positions.every(p=>p&&typeof p.name==='string'&&typeof p.sign==='string'&&Number.isInteger(p.house)&&p.house>=1&&p.house<=12)
    &&(system!=='vedic'||Boolean(r.mansion&&typeof r.mansion.name==='string'&&Number.isInteger(r.mansion.pada)&&r.mansion.pada>=1&&r.mansion.pada<=4));
}
type Props={system:System;loggedIn:boolean;onLogin:()=>void;onError:(err:unknown)=>void;request?:typeof api};
export default function BasicSkyChart({system,loggedIn,onLogin,onError,request=api}:Props){
  if(!loggedIn)return <section><h1>{title[system]}</h1><p>{basis[system]}</p><Button display="block" onClick={onLogin}>토스 로그인하고 차트 보기</Button></section>;
  return <TossSessionScope><SkyForm key={system} system={system} onError={onError} request={request}/></TossSessionScope>;
}
function SkyForm({system,onError,request}:{system:System;onError:Props['onError'];request:typeof api}){
  const [birth,setBirth]=useState(emptyBirth),[result,setResult]=useState<Result|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const version=useRef(0),pending=useRef(false),heading=useRef<HTMLHeadingElement>(null);
  useLayoutEffect(()=>()=>{version.current++;},[]);
  useEffect(()=>{
    if(!result)return;
    heading.current?.focus();
    const back=(event:Event)=>{event.preventDefault();setResult(null);};
    window.addEventListener('code-destiny:toss-back',back);
    return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[result]);
  async function submit(event:FormEvent){
    event.preventDefault();if(pending.current)return;
    setError('');
    if(birth.unknown||!birth.time){setError('상승점과 하우스를 계산하려면 태어난 시각이 필요해요.');return;}
    const epoch=++version.current;pending.current=true;setBusy(true);
    try{
      const next=await request<Result>('/charts/'+system,{birth:birthPayload(birth)});
      if(epoch===version.current){if(!valid(next,system))throw new Error('INVALID_CHART');setResult(next);}
    }catch(err){
      if(epoch===version.current){const e=err as {status?:number;code?:string}|null;
        if(e?.status===401||e?.status===403||e?.code==='SESSION_CHANGED')onError(err);
        else setError(e?.code==='TOSS_RELEASE_PENDING'?'아직 차트 서비스를 준비하고 있어요.':'차트를 계산하지 못했어요. 날짜와 시각을 확인하고 다시 시도해 주세요.');}
    }finally{if(epoch===version.current){pending.current=false;setBusy(false);}}
  }
  if(!result)return <section><h1>{title[system]}</h1><p>{basis[system]} 국내 출생지를 지원해요.</p>
    <form className="form" onSubmit={submit}><BirthFields title="차트를 세울 출생정보" showGender={false} disabled={busy} value={birth} onChange={v=>{setBirth(v);setError('');}}/>
      {error&&<p role="alert">{error}</p>}<Button type="submit" display="block" disabled={busy} loading={busy}>출생차트 펼치기</Button></form></section>;
  return <section><h1 ref={heading} tabIndex={-1}>{title[system]}</h1><p>{basis[system]}</p>
    <h2>{system==='astrology'?'상승점':'라그나'} · {result.ascendant}</h2><p>태어난 순간 동쪽 지평선에 떠오른 별자리예요.</p>
    {system==='vedic'&&result.mansion&&<><h2>달의 나크샤트라 · {result.mansion.name}</h2><p>달이 자리한 구역을 네 부분으로 나누면 {result.mansion.pada}번째 파다에 해당해요.</p></>}
    <h2>{system==='astrology'?'행성의 위치':'그라하의 위치'}</h2><p>하우스는 차트를 열두 부분으로 나눈 자리예요.</p>
    <dl className="daily-basis">{result.positions.map(p=><div key={p.name}><dt>{p.name}</dt><dd>{p.sign} · {p.house}하우스</dd></div>)}</dl>
    <Button variant="weak" display="block" onClick={()=>setResult(null)}>출생정보 다시 보기</Button></section>;
}
