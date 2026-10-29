import {useEffect,useRef,useState,type FormEvent} from 'react';
import {BirthFields,emptyBirth,birthPayload} from './BirthFields';
import {Button} from './Button';
import {api} from './platform';

export type ManseResult={stored:false;engineVersion:string;limitations:string[];pillars:{key:string;ganji:string|null;tenGod:string|null}[];elements:Record<string,number>;elementBasis:string|null;cycles:{label:string}[]};
const pillars:Record<string,string>={year:'연주',month:'월주',day:'일주',hour:'시주'};
const elements:Record<string,string>={wood:'목',fire:'화',earth:'토',metal:'금',water:'수'};
export function ManseResults({result}:{result:ManseResult}){
  return <section className="manse-result" aria-live="polite"><h2>나의 명식</h2>
    <p>일주는 나를 살펴보는 기준이며, 각 기둥은 태어난 해·달·날·시각을 나타내요.</p>
    <dl className="manse-pillars">{result.pillars.map(p=><div key={p.key}><dt>{pillars[p.key]}</dt><dd><strong>{p.ganji||'미상'}</strong><span>{p.tenGod||'계산 자료 없음'}</span></dd></div>)}</dl>
    <h2>오행 분포</h2><p className="muted">{result.elementBasis==='surface'?'눈에 보이는 글자를 센 수예요. 지장간은 이 개수에 포함하지 않아요.':'계산 엔진이 제공한 오행 분포예요.'} 개수만으로 성격이나 강약을 단정하지 않아요.</p>
    <dl className="daily-basis">{Object.entries(result.elements).map(([key,value])=><div key={key}><dt>{elements[key]||key}</dt><dd>{value}</dd></div>)}</dl>
    <h2>대운의 흐름</h2>{result.cycles.length?<ul>{result.cycles.map((cycle,i)=><li key={i}>{cycle.label}</li>)}</ul>:<p>정확한 대운 시작 시점을 표시할 자료가 없어요. 출생 시각을 모르면 임의로 계산하지 않아요.</p>}
    <details><summary>계산 기준과 한계</summary>{result.limitations.map(line=><p key={line}>{line}</p>)}<p className="muted">계산 버전: {result.engineVersion}</p></details>
    <p className="muted">이 결과는 현재 화면에서만 확인할 수 있으며 보관함에는 저장되지 않아요.</p>
  </section>;
}
export default function ManseReading({loggedIn,onLogin,onError,request=api}:{loggedIn:boolean;onLogin:()=>void;onError:(error:unknown)=>void;request?:typeof api}){
  const [birth,setBirth]=useState(emptyBirth),[result,setResult]=useState<ManseResult|null>(null),[busy,setBusy]=useState(false);
  const epoch=useRef(0);
  useEffect(()=>()=>{epoch.current++;},[]);
  useEffect(()=>{epoch.current++;setResult(null);setBirth(emptyBirth());setBusy(false);},[loggedIn]);
  async function submit(event:FormEvent){event.preventDefault();if(!loggedIn){onLogin();return;}if(busy)return;
    const current=++epoch.current;setBusy(true);setResult(null);
    try{const data=await request<ManseResult>('/manse/calculate',{birth:birthPayload(birth)});if(current===epoch.current)setResult(data);}
    catch(error){if(current===epoch.current)onError(error);}finally{if(current===epoch.current)setBusy(false);}
  }
  return <section><h1>만세력으로 살펴보는 나의 명식</h1><p>기존 사주 계산 기준으로 네 기둥과 오행, 대운의 시작을 확인해요. AI 상담을 생성하지 않아요.</p>
    <p className="muted">현재 국내 도시 입력을 지원해요. 결과는 보관함에 저장되지 않으며 화면을 나가면 사라져요.</p>
    {loggedIn?<form className="form" onSubmit={submit}><fieldset disabled={busy} className="manse-input"><BirthFields title="명식을 세울 출생정보" value={birth} onChange={value=>{epoch.current++;setBirth(value);setResult(null);}}/></fieldset><Button type="submit" display="block" loading={busy}>명식 확인하기</Button></form>:<Button display="block" onClick={onLogin}>토스 로그인하고 명식 보기</Button>}
    {busy&&<p role="status">절기와 출생정보로 명식을 계산하고 있어요.</p>}{result&&<ManseResults result={result}/>}
  </section>;
}
