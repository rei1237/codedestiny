import PillarAlmanac from './PillarAlmanac';
import {useEffect,useLayoutEffect,useRef,useState,type FormEvent} from 'react';
import {BirthFields,emptyBirth,birthPayload} from './BirthFields';
import {Button} from './Button';
import {api} from './platform';
import TossSessionScope from './TossSessionScope';

export type ManseResult={stored:false;engineVersion:string;limitations:string[];pillars:{key:string;ganji:string|null;tenGod:string|null}[];elements:Record<string,number>;elementBasis:string|null;cycles:{label:string}[]};
export function ManseResults({result}:{result:ManseResult}){
  return <section className="manse-result" aria-live="polite">
    <PillarAlmanac pillars={result.pillars} counts={result.elements} basis={result.elementBasis}/>
    <section className="almanac-cycles"><h2>대운의 흐름</h2>{result.cycles.length?<ol>{result.cycles.map((cycle,i)=><li key={i}>{cycle.label}</li>)}</ol>:<p>정확한 대운 시작 시점을 표시할 자료가 없어요. 출생 시각을 모르면 임의로 계산하지 않아요.</p>}</section>
    <details><summary>계산 기준과 한계</summary>{result.limitations.map(line=><p key={line}>{line}</p>)}<p className="muted">계산 버전: {result.engineVersion}</p></details>
    <p className="muted">이 결과는 현재 화면에서만 확인할 수 있으며 보관함에는 저장되지 않아요.</p>
  </section>;
}
type Props={loggedIn:boolean;onLogin:()=>void;onError:(error:unknown)=>void;request?:typeof api};
export default function ManseReading(props:Props){return <TossSessionScope><ManseReadingContent {...props}/></TossSessionScope>;}
function ManseReadingContent({loggedIn,onLogin,onError,request=api}:Props){
  const [birth,setBirth]=useState(emptyBirth),[result,setResult]=useState<ManseResult|null>(null),[busy,setBusy]=useState(false);
  const epoch=useRef(0),pending=useRef(false);
  useLayoutEffect(()=>()=>{epoch.current++;},[]);
  useEffect(()=>{epoch.current++;pending.current=false;setResult(null);setBirth(emptyBirth());setBusy(false);},[loggedIn]);
  useEffect(()=>{
    if(!result||!loggedIn)return;
    const back=(event:Event)=>{event.preventDefault();setResult(null);};
    window.addEventListener('code-destiny:toss-back',back);
    return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[result,loggedIn]);
  async function submit(event:FormEvent){event.preventDefault();if(!loggedIn){onLogin();return;}if(pending.current)return;
    const current=++epoch.current;pending.current=true;setBusy(true);setResult(null);
    try{const data=await request<ManseResult>('/manse/calculate',{birth:birthPayload(birth)});if(current===epoch.current)setResult(data);}
    catch(error){if(current===epoch.current)onError(error);}finally{if(current===epoch.current){pending.current=false;setBusy(false);}}
  }
  if(loggedIn&&result)return <section><h1>만세력으로 살펴보는 나의 명식</h1><ManseResults result={result}/><Button variant="weak" display="block" onClick={()=>setResult(null)}>출생정보 다시 보기</Button></section>;
  return <section><h1>만세력으로 살펴보는 나의 명식</h1><p>기존 사주 계산 기준으로 네 기둥과 오행, 대운의 시작을 확인해요. AI 상담을 생성하지 않아요.</p>
    <p className="muted">현재 국내 도시 입력을 지원해요. 결과는 보관함에 저장되지 않으며 화면을 나가면 사라져요.</p>
    {loggedIn?<form className="form" onSubmit={submit}><fieldset disabled={busy} className="manse-input"><BirthFields title="명식을 세울 출생정보" value={birth} onChange={value=>{epoch.current++;setBirth(value);setResult(null);}}/></fieldset><Button type="submit" display="block" loading={busy}>명식 확인하기</Button></form>:<Button display="block" onClick={onLogin}>토스 로그인하고 명식 보기</Button>}
    {loggedIn&&busy&&<p role="status">절기와 출생정보로 명식을 계산하고 있어요.</p>}
  </section>;
}
