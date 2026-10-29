import {useState,type FormEvent} from 'react';
import {Button} from '@toss/tds-mobile';
import {BirthFields,emptyBirth,birthPayload} from './BirthFields';
import {api} from './platform';
import {buildFlowerSvg} from '../../../js/services/destiny-flower-art.js';

const sourceNames={saju:'사주의 꽃',astrology:'별자리의 꽃',jamidusu:'자미두수의 꽃',sukuyo:'숙요의 꽃'};
type Source=keyof typeof sourceNames;
type Flower={id:string;name:string;title?:string;scientific_name?:string;symbolism:string;description?:string;vibe_message?:string;primary_color:string;secondary_color:string;particle_type:string};
export type FlowerResponse={stored:false;sources:Partial<Record<Source,{state:'ready';flower:Flower;narrative:string;limitations:string[];engineVersion:string;algorithmVersion:string}|{state:'unavailable';code:string}>>};
export function FlowerResults({result}:{result:FlowerResponse}){
  return <div className="flower-results" aria-live="polite">{(Object.keys(sourceNames) as Source[]).map(source=>{
    const row=result.sources[source];if(!row)return null;
    if(row.state==='unavailable')return <section className="paper" key={source}><h2>{sourceNames[source]}</h2><p>{row.code==='BIRTH_TIME_REQUIRED'?'이 꽃을 살펴보려면 태어난 시각이 필요해요. 모르는 시각을 임의로 정하지 않아요.':row.code==='SAJU_KST_REQUIRED'?'현재 이 계산은 지원하는 출생 지역에서만 제공돼요.':'이 체계의 계산을 완료하지 못했어요. 입력을 확인하거나 잠시 후 다시 시도해 주세요.'}</p></section>;
    const f=row.flower;
    const seed=Array.from(source+':'+f.id).reduce((value,char)=>(value*31+char.charCodeAt(0))>>>0,0);
    const art=buildFlowerSvg({flowerId:f.id,source,primaryHex:f.primary_color,secondaryHex:f.secondary_color,particleType:f.particle_type,label:f.name,seed});
    return <article className="chapter flower-result" key={source}><p className="eyebrow">{sourceNames[source]}</p>
      <img className="flower-art" src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(art)} width="320" height="240" alt={`${f.name} 일러스트`}/>
      <h2>{f.name}</h2><p className="muted">{f.scientific_name}</p><p className="answer">{f.symbolism}</p>
      {f.description&&<p>{f.description}</p>}<h3>이 꽃이 전하는 이야기</h3><p>{row.narrative}</p>
      {f.vibe_message&&<blockquote>{f.vibe_message}</blockquote>}
      <details><summary>해석의 범위</summary>{row.limitations.map(line=><p key={line}>{line}</p>)}<p>꽃과 기질을 연결한 상징적 해석이며, 미래를 보장하는 결과는 아니에요.</p></details>
    </article>;
  })}</div>;
}
export default function FlowerReading({loggedIn,onLogin,onError}:{loggedIn:boolean;onLogin:()=>void;onError:(error:unknown)=>void}){
  const [birth,setBirth]=useState(emptyBirth),[busy,setBusy]=useState(false),[result,setResult]=useState<FlowerResponse|null>(null);
  async function submit(event:FormEvent){event.preventDefault();if(!loggedIn){onLogin();return;}if(busy)return;
    setBusy(true);setResult(null);
    try{setResult(await api<FlowerResponse>('/flower/match',{birth:birthPayload(birth)}));}catch(error){onError(error);}finally{setBusy(false);}
  }
  return <section className="flower-reading"><p className="eyebrow">운명의 꽃</p><h1>당신의 결을 닮은<br/>꽃 한 송이</h1>
    <p>사주와 별자리, 자미두수와 숙요가 비추는 서로 다른 꽃의 이야기를 만나보세요.</p>
    <p className="muted">로그인 후 이용할 수 있어요. 이 꽃 결과는 보관함에 저장되지 않아요.</p>
    {loggedIn?<form className="form" onSubmit={submit}><BirthFields value={birth} onChange={value=>{setBirth(value);setResult(null);}} title="꽃을 살펴볼 출생정보"/>
      <Button type="submit" display="block" loading={busy}>{loggedIn?'나의 꽃 살펴보기':'토스 로그인하고 살펴보기'}</Button>
    </form>:<Button display="block" onClick={onLogin}>토스 로그인하고 살펴보기</Button>}{busy&&<p role="status">입력한 정보로 각 체계의 꽃을 계산하고 있어요.</p>}{result&&<FlowerResults result={result}/>}
  </section>;
}
