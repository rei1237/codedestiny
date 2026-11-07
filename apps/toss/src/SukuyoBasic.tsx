import {useEffect,useLayoutEffect,useRef,useState,type FormEvent} from 'react';
import {BirthFields,birthPayload,emptyBirth} from './BirthFields';
import {Button} from './Button';
import {api} from './platform';
import TossSessionScope from './TossSessionScope';

type TextCard={label:string;value:string;note:string};
type Relation={label:string;han:string;essence:string;light:string;shadow:string;guide:string};
type SukuyoResult={stored:false;mansion:string;mansionIdx:number;engineVersion:string;limitations:string[];
 canonical:{natalSukuyo:{displayIndex:number;direction:string;element:string};sukuyoAttributes:Record<string,string[]>};
 reading:{summaryCards:TextCard[];relationMiniMap:Relation[];dailyPrescription:{moon:{label:string;desc:string};message:string;action:string};guardian:{name:string;mantra:string}}};
const attributes:[string,string][]=[['temperament','기질'],['relationshipStyle','관계 성향'],['careerStyle','일 성향'],['wealthStyle','돈 습관'],['recoveryPattern','회복 리듬']];
function validResult(value:SukuyoResult){return value?.stored===false&&typeof value.mansion==='string'&&Number.isInteger(value.mansionIdx)&&value.mansionIdx>=0&&value.mansionIdx<27
 &&typeof value.engineVersion==='string'&&Array.isArray(value.limitations)&&value.limitations.every(line=>typeof line==='string')
 &&Array.isArray(value.reading?.summaryCards)&&value.reading.summaryCards.length>0&&value.reading.summaryCards.every(card=>card&&typeof card.label==='string'&&typeof card.value==='string'&&typeof card.note==='string')
 &&Array.isArray(value.reading?.relationMiniMap)&&value.reading.relationMiniMap.length>0&&value.reading.relationMiniMap.every(item=>item&&['label','han','essence','light','shadow','guide'].every(key=>typeof item[key as keyof Relation]==='string'))
 &&!!value.canonical?.natalSukuyo&&typeof value.canonical.natalSukuyo.displayIndex==='number'&&typeof value.canonical.natalSukuyo.direction==='string'&&typeof value.canonical.natalSukuyo.element==='string'
 &&!!value.canonical.sukuyoAttributes&&attributes.every(([key])=>{const items=value.canonical.sukuyoAttributes[key];return items===undefined||Array.isArray(items)&&items.every(item=>typeof item==='string');})
 &&typeof value.reading.dailyPrescription?.moon?.label==='string'&&typeof value.reading.dailyPrescription.moon.desc==='string'
 &&typeof value.reading.dailyPrescription.message==='string'&&typeof value.reading.dailyPrescription.action==='string'
 &&typeof value.reading.guardian?.name==='string'&&typeof value.reading.guardian.mantra==='string';}
export function SukuyoBasicResult({result}:{result:SukuyoResult}){
 const {canonical,reading}=result;
 return <section className="sukuyo-basic-result" aria-live="polite">
  <img className="sukuyo-master-art" src="/images/master-profiles/hanbi-sukuyo-reading.webp" width="1200" height="800" loading="lazy" alt="달빛 아래 책을 펼쳐 본명숙을 읽는 서한비"/>
  <h2>당신의 본명숙은 {result.mansion}</h2><p>27숙 중 {canonical.natalSukuyo.displayIndex}번째 자리예요. 태어난 순간 달의 위치를 바탕으로 성향의 흐름을 살펴봅니다.</p>
  <p>서한비입니다. 달이 머문 자리에서 당신의 성향을 읽어 드릴게요. 강점과 마음이 지치는 순간을 함께 살펴보겠습니다.</p>
  <dl className="daily-basis"><div><dt>방향</dt><dd>{canonical.natalSukuyo.direction}</dd></div><div><dt>속성</dt><dd>{canonical.natalSukuyo.element}</dd></div></dl>
  <div className="sukuyo-summary">{reading.summaryCards.map((card,i)=><article className="paper" key={i}><h3>{card.label}</h3><strong>{card.value}</strong><p>{card.note}</p></article>)}</div>
  <h2>성향과 생활의 리듬</h2>{attributes.map(([key,title])=>{const items=canonical.sukuyoAttributes[key];return Array.isArray(items)&&items.length?<section key={key}><h3>{title}</h3><ul>{items.map((item,i)=><li key={i}>{item}</li>)}</ul></section>:null;})}
  <section className="paper"><h2>오늘의 참고 리듬</h2><h3>{reading.dailyPrescription.moon.label}</h3><p>{reading.dailyPrescription.moon.desc}</p><p>{reading.dailyPrescription.message}</p><p>{reading.dailyPrescription.action}</p><p className="muted">상징적인 참고 흐름이에요. 중요한 결정에는 현실의 상황도 함께 살펴보세요.</p></section>
  <section><h2>관계를 살펴보는 여섯 가지 관점</h2>{reading.relationMiniMap.map((item,i)=><details className="paper" key={i}><summary>{item.label} · {item.han}</summary><p>{item.essence}</p><p>{item.light}</p><p>{item.shadow}</p><p>{item.guide}</p></details>)}</section>
  <section className="paper"><h2>{reading.guardian.name}의 메시지</h2><p>{reading.guardian.mantra}</p></section>
  <details><summary>계산 기준과 한계</summary>{result.limitations.map((line,i)=><p key={i}>{line}</p>)}<p>본명숙은 항성 달 황경을 27구간으로 나누어 계산해요. 해석은 미래를 보장하지 않아요.</p><p>계산 버전: {result.engineVersion}</p></details>
  <p className="muted">이 결과는 현재 화면에서만 확인할 수 있으며 보관함에 저장되지 않아요.</p>
 </section>;
}
type Props={loggedIn:boolean;onLogin:()=>void;onError:(error:unknown)=>void;request?:typeof api};
export default function SukuyoBasic(props:Props){return <TossSessionScope><SukuyoBasicContent {...props}/></TossSessionScope>;}
function SukuyoBasicContent({loggedIn,onLogin,onError,request=api}:Props){
 const [birth,setBirth]=useState(emptyBirth),[busy,setBusy]=useState(false),[result,setResult]=useState<SukuyoResult|null>(null),[issue,setIssue]=useState('');
 const epoch=useRef(0),pending=useRef(false);
 useLayoutEffect(()=>()=>{epoch.current++;},[]);
 useEffect(()=>{epoch.current++;pending.current=false;setBirth(emptyBirth());setResult(null);setIssue('');setBusy(false);},[loggedIn]);
 useEffect(()=>{const back=(event:Event)=>{if(result){event.preventDefault();setResult(null);setIssue('');}};window.addEventListener('code-destiny:toss-back',back);return()=>window.removeEventListener('code-destiny:toss-back',back);},[result]);
 async function submit(event:FormEvent){event.preventDefault();if(!loggedIn){onLogin();return;}if(pending.current)return;
  if(birth.unknown){setIssue('본명숙을 정확히 살펴보려면 태어난 시각이 필요해요.');return;}
  const current=++epoch.current;pending.current=true;setBusy(true);setResult(null);setIssue('');
  try{const next=await request<SukuyoResult>('/sukuyo/basic',{birth:birthPayload(birth)});if(current===epoch.current){if(!validResult(next))throw new Error('INVALID_RESULT');setResult(next);}}
  catch(error){if(current===epoch.current){const detail=error&&typeof error==='object'?error as {status?:number;code?:string}:{};
   if(detail.status===401||['SESSION_CHANGED','LOGIN_REQUIRED','SESSION_EXPIRED'].includes(detail.code||''))onError(error);
   else if(detail.status===403||detail.code==='ACCESS_DENIED')setIssue('토스 이용 권한을 확인할 수 없어요. 계정을 확인한 뒤 다시 시도해 주세요.');
   else if(detail.code==='TOSS_RELEASE_PENDING')setIssue('서비스를 준비하고 있어요. 잠시 후 다시 시도해 주세요.');
   else setIssue('숙요 계산을 마치지 못했어요. 입력을 확인하고 다시 시도해 주세요.');}}
  finally{if(current===epoch.current){pending.current=false;setBusy(false);}}
 }
 return <section><h1>달이 머문 자리, 나의 숙요점</h1><p>태어난 순간의 달이 비추는 기질과 관계의 리듬을 살펴봐요.</p>
  <p className="muted">로그인 후 이용할 수 있어요. 현재 결과는 보관함에 저장되지 않으며 화면을 나가면 사라져요.</p>
  {loggedIn?<form className="form" onSubmit={submit}><BirthFields title="본명숙을 살펴볼 출생정보" value={birth} onChange={value=>{epoch.current++;setBirth(value);setResult(null);setIssue('');}} disabled={busy}/><Button type="submit" display="block" loading={busy}>{issue?'다시 계산하기':'본명숙 살펴보기'}</Button></form>:<Button display="block" onClick={onLogin}>토스 로그인하고 살펴보기</Button>}
  {loggedIn&&busy&&<p role="status">태어난 날의 숙을 읽고 있어요.</p>}{issue&&<p role="alert">{issue}</p>}{loggedIn&&result&&<SukuyoBasicResult result={result}/>}
 </section>;
}
