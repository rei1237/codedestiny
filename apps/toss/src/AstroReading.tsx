import {useEffect,useRef,useState,type FormEvent} from 'react';
import {BirthFields,birthPayload,emptyBirth,type BirthInput} from './BirthFields';
import {Button} from './Button';
import {api} from './platform';
import TossSessionScope from './TossSessionScope';
import AstroReadingBody from './AstroReadingBody';
import AstroChartView,{type AstroChart} from './AstroChartView';
import {TOSS_ASTRO_SECTIONS,isTossAstroSection} from '../../../lib/fortune/toss-astro-sections.mjs';

type Key=keyof typeof TOSS_ASTRO_SECTIONS;
type Result={ok:boolean;accessSource:string;featureKey:Key;html:string;asOf?:string};
type Props={request?:typeof api;exampleBirth?:BirthInput};
function Reading({request=api,exampleBirth}:Props){
 const [birth,setBirth]=useState(emptyBirth),[submitted,setSubmitted]=useState<BirthInput|null>(null),[result,setResult]=useState<Result|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [chart,setChart]=useState<AstroChart|null>(null);
 const epoch=useRef(0),pending=useRef(false),cache=useRef<Partial<Record<Key,Result>>>({});
 useEffect(()=>()=>{epoch.current++;},[]);
 useEffect(()=>{const back=(e:Event)=>{if(submitted){e.preventDefault();epoch.current++;pending.current=false;setBusy(false);setSubmitted(null);setResult(null);setError('');}};window.addEventListener('code-destiny:toss-back',back);return()=>window.removeEventListener('code-destiny:toss-back',back);},[submitted]);
 async function open(key:Key,input:BirthInput,initial=false){
  if(pending.current)return;setError('');
  if(cache.current[key]){setResult(cache.current[key]!);return;}
  pending.current=true;setBusy(true);const version=++epoch.current;
  try{const [next,sky]=await Promise.all([request<Result>('/astro/section',{featureKey:key,birth:birthPayload(input)}),initial?request<AstroChart>('/astro/chart',{birth:birthPayload(input)}):Promise.resolve(null)]);
   if(initial&&(!sky?.ok||!Array.isArray(sky.planets)||sky.planets.length<7))throw Error('CHART_UNAVAILABLE');
   if(!next.ok||next.accessSource!=='public'||next.featureKey!==key||!next.html?.trim())throw Error('REPORT_UNAVAILABLE');
   if(epoch.current===version){cache.current[key]=next;if(sky)setChart(sky);setResult(next);setSubmitted(input);}
  }catch(err){if(epoch.current===version)setError((err as {code?:string})?.code==='ASTRO_EXAMPLE_REQUIRED'?'이 출생정보는 비공개 모의 상담에서 지원하지 않아요. 모의 예시 입력하기를 눌러 검증된 예시로 확인해 주세요.':'풀이를 준비하지 못했어요. 출생정보를 확인하고 다시 시도해 주세요.');}
  finally{if(epoch.current===version){pending.current=false;setBusy(false);}}
 }
 function submit(event:FormEvent){event.preventDefault();cache.current={};void open('astro_basic_deep_pack',birth,true);}
 return <section><h1>서양 점성술 출생차트</h1><p>태어난 순간의 행성과 별자리에서 기질과 관계, 앞으로의 흐름을 살펴봐요.</p>
 {!submitted?<form className="form" onSubmit={submit}>
 {exampleBirth&&<><p>비공개 모의 상담에서는 검증된 예시 출생정보로 원본 풀이를 확인할 수 있어요.</p><Button type="button" variant="weak" onClick={()=>setBirth({...exampleBirth})}>모의 예시 입력하기</Button></>}
 <BirthFields title="별자리를 읽을 출생정보" showGender={false} value={birth} disabled={busy} onChange={setBirth}/><p>국내 출생지를 지원해요. 태어난 시각을 모르면 상승점과 하우스 해석은 제한돼요.</p>
 <Button type="submit" display="block" disabled={busy} loading={busy}>출생차트 펼치기</Button></form>:<>
 {chart&&<AstroChartView result={chart} timeKnown={!submitted.unknown}/>}
 <nav style={{display:'flex',flexWrap:'wrap',gap:8,marginBlock:20}} aria-label="점성술 풀이 선택" className="mode-tabs">{(Object.keys(TOSS_ASTRO_SECTIONS) as Key[]).filter(isTossAstroSection).map(key=><Button key={key} disabled={busy} variant={result?.featureKey===key?'fill':'weak'} aria-pressed={result?.featureKey===key} onClick={()=>void open(key,submitted)}>{TOSS_ASTRO_SECTIONS[key]}</Button>)}</nav>
 {result&&<><h2>{TOSS_ASTRO_SECTIONS[result.featureKey]}</h2>{result.asOf&&<p>{result.asOf} 기준</p>}<AstroReadingBody html={result.html} title={TOSS_ASTRO_SECTIONS[result.featureKey]}/></>}
 <Button variant="weak" display="block" disabled={busy} onClick={()=>{setSubmitted(null);setResult(null);}}>출생정보 다시 보기</Button></>}
 {busy&&<p role="status">별의 흐름을 읽고 있어요.</p>}{error&&<p role="alert">{error}</p>}</section>;
}
export default function AstroReading(props:Props){return <TossSessionScope><Reading {...props}/></TossSessionScope>;}
