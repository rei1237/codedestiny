import {useEffect,useRef,useState,type FormEvent} from 'react';
import {BirthFields,birthPayload,emptyBirth,type BirthInput} from './BirthFields';
import {Button} from './Button';
import {api} from './platform';
import TossSessionScope from './TossSessionScope';
import OriginalBody from './AstroReadingBody';
import BasicSajuReading from './BasicSajuReading';
import {TOSS_SUKUYO_TOOLS,isTossSukuyoTool} from '../../../lib/fortune/toss-sukuyo-tools.mjs';
type Key=keyof typeof TOSS_SUKUYO_TOOLS;
type Result={ok:boolean;featureKey:Key;html?:string;precisionHtml?:string;sajuBaseHtml?:string;prescriptionHtml?:string;css?:string};
type Props={request?:typeof api;exampleBirth?:BirthInput};
function birthRecord(value:BirthInput){const {date}=birthPayload(value);return {date:value.date,calType:date.calType,timeKnown:!value.unknown,hour:date.hour,minute:date.minute};}
export function bindSukuyoFilters(host:HTMLElement){
 const buttons=host.querySelectorAll<HTMLElement>('[data-sy-dogam-filter]'),cards=host.querySelectorAll<HTMLElement>('.sy-dogam-entry');
 buttons.forEach(button=>button.addEventListener('click',()=>{const key=button.getAttribute('data-sy-dogam-filter')||'all';buttons.forEach(item=>item.classList.remove('is-active'));button.classList.add('is-active');cards.forEach(card=>{const categories=String(card.getAttribute('data-categories')||'');card.style.display=key==='all'||categories.includes(key)?'':'none';});}));
}
function Reading({request=api,exampleBirth}:Props){
 const [key,setKey]=useState<Key>('sukuyo-nature-deep-dive'),[birth,setBirth]=useState(emptyBirth),[partner,setPartner]=useState(emptyBirth),[result,setResult]=useState<Result|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const epoch=useRef(0),pending=useRef(false),pair=key==='compat-sukuyo-compatibility'||key==='premium-sukuyo-compat-extra';
 useEffect(()=>()=>{epoch.current++;},[]);
 useEffect(()=>{const back=(event:Event)=>{if(result){event.preventDefault();setResult(null);}};window.addEventListener('code-destiny:toss-back',back);return()=>window.removeEventListener('code-destiny:toss-back',back);},[result]);
 async function submit(event:FormEvent){event.preventDefault();if(pending.current)return;setError('');
  if(pair&&partner.unknown){setError('두 사람의 궁합을 살펴보려면 상대의 출생 시각이 필요해요.');return;}
  const version=++epoch.current;pending.current=true;setBusy(true);
  try{const location=birthPayload(birth).location;const input={featureKey:key,birth:birthRecord(birth),gender:birth.gender,place:{name:location.label,latitude:location.lat,longitude:location.lng,timezone:location.tz},...(pair?{partner:{...birthRecord({...partner,city:birth.city}),gender:partner.gender}}:{})};
   const next=await request<Result>('/sukuyo/tools',input);if(!next.ok||next.featureKey!==key||!(next.html||next.precisionHtml))throw Error('REPORT_UNAVAILABLE');if(version===epoch.current)setResult(next);
  }catch(err){if(version===epoch.current)setError((err as {code?:string})?.code==='SUKUYO_EXAMPLE_REQUIRED'?'이 출생정보는 비공개 모의 상담에서 지원하지 않아요. 모의 예시 입력하기를 눌러 확인해 주세요.':'풀이를 불러오지 못했어요. 출생정보를 확인하고 다시 시도해 주세요.');}
  finally{if(version===epoch.current){pending.current=false;setBusy(false);}}
 }
 if(key==='sukuyo-extreme-t-relationship')return <section><BasicSajuReading/><p>명식을 펼친 뒤 극T 테스트를 선택하면 점수·타입과 관계 회로를 함께 볼 수 있어요.</p><Button variant="weak" display="block" onClick={()=>setKey('sukuyo-nature-deep-dive')}>숙요 주제 선택으로 돌아가기</Button></section>;
 return <section><h1>숙요의 관계와 본성</h1><p>나의 성향을 깊이 읽거나, 두 사람 사이에서 반복되는 관계의 흐름을 살펴보세요.</p>
 {result?<><h3>{TOSS_SUKUYO_TOOLS[result.featureKey]}</h3><OriginalBody html={(result.sajuBaseHtml||'')+(result.html||result.precisionHtml||'')+(result.prescriptionHtml||'')} css={result.css||''} title={TOSS_SUKUYO_TOOLS[result.featureKey]} bind={bindSukuyoFilters}/><Button variant="weak" display="block" onClick={()=>setResult(null)}>입력으로 돌아가기</Button></>:<form className="form" onSubmit={submit}>
 <label>살펴볼 주제<select value={key} disabled={busy} onChange={e=>{setKey(e.target.value as Key);setError('');}}>{(Object.keys(TOSS_SUKUYO_TOOLS) as Key[]).filter(isTossSukuyoTool).map(item=><option key={item} value={item}>{TOSS_SUKUYO_TOOLS[item]}</option>)}</select></label>
 {exampleBirth&&<><p>비공개 모의 상담에서는 검증된 예시 출생정보로 원본 풀이를 확인할 수 있어요.</p><Button variant="weak" type="button" onClick={()=>{setBirth({...exampleBirth});setPartner({...exampleBirth,date:'1991-04-05',time:'12:30',gender:'M'});}}>모의 예시 입력하기</Button></>}
 <BirthFields title="나의 출생정보" value={birth} onChange={setBirth} disabled={busy}/>
 {pair&&<><fieldset className="birth-fields" disabled={busy}><legend>상대의 출생정보</legend><label>상대의 태어난 날짜<input type="date" required value={partner.date} onChange={e=>setPartner({...partner,date:e.target.value})}/></label><label>상대의 달력<select value={partner.calendar} onChange={e=>setPartner({...partner,calendar:e.target.value})}><option value="solar">양력</option><option value="lunar">음력 평달</option><option value="lunar_leap">음력 윤달</option></select></label><label>상대의 태어난 시각<input type="time" required value={partner.time} onChange={e=>setPartner({...partner,time:e.target.value})}/></label><label>상대의 계산에 사용하는 성별<select required value={partner.gender} onChange={e=>setPartner({...partner,gender:e.target.value})}><option value="">선택해 주세요</option><option value="M">남성</option><option value="F">여성</option></select></label></fieldset><p>원본 숙요 궁합과 같이 상대의 출생지는 내 출생지를 기준으로 계산해요.</p></>}
 <Button type="submit" display="block" loading={busy} disabled={busy}>풀이 펼치기</Button></form>}
 {busy&&<p role="status">달이 비추는 관계를 읽고 있어요.</p>}{error&&<p role="alert">{error}</p>}</section>;
}
export default function SukuyoTools(props:Props){return <TossSessionScope><Reading {...props}/></TossSessionScope>;}
