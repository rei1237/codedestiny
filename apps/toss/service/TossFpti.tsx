import {useEffect,useRef,useState,type FormEvent} from 'react';
import type {FptiAnalysisResult,FptiFormInput} from '@/lib/fpti/fpti-types';
import {analyzeFptiFromSajuSource,calculateSajuSourceFromBirth} from '@/lib/fpti/fpti-adapter';
import './toss-fpti.css';

const axisLabels:Record<string,string>={energy:'에너지',judgment:'판단',execution:'실행',vision:'시야'};
const initial=():FptiFormInput=>({name:'',gender:'OTHER',birthDate:'',calendarType:'solar',birthTime:'',timeUnknown:false,birthRegion:''});
export default function TossFpti(){
 const [form,setForm]=useState<FptiFormInput>(initial),[result,setResult]=useState<FptiAnalysisResult|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const epoch=useRef(0),locked=useRef(false),phase=useRef(false),mounted=useRef(false);
 useEffect(()=>{mounted.current=true;const back=(event:Event)=>{if(event.defaultPrevented)return;if(locked.current){event.preventDefault();return;}if(phase.current){event.preventDefault();epoch.current++;phase.current=false;setResult(null);setError('');}};window.addEventListener('code-destiny:toss-back',back);return()=>{mounted.current=false;epoch.current++;window.removeEventListener('code-destiny:toss-back',back);};},[]);
 const change=<K extends keyof FptiFormInput>(key:K,value:FptiFormInput[K])=>{epoch.current++;setForm(previous=>({...previous,[key]:value}));setError('');};
 const submit=async(event:FormEvent)=>{event.preventDefault();if(locked.current)return;const current=++epoch.current;locked.current=true;setBusy(true);setError('');
  try{await new Promise<void>(resolve=>window.setTimeout(resolve,0));const source=calculateSajuSourceFromBirth(form),analysis=analyzeFptiFromSajuSource(source);if(mounted.current&&epoch.current===current){phase.current=true;setResult(analysis);window.scrollTo(0,0);}}
  catch{if(mounted.current&&epoch.current===current)setError('출생정보를 확인하지 못했어요. 날짜와 시간, 달력을 확인한 뒤 다시 시도해 주세요.');}
  finally{locked.current=false;if(mounted.current&&epoch.current===current)setBusy(false);}
 };
 const rows=(title:string,items:string[])=>items.length?<section><h3>{title}</h3><ul>{items.map((item,i)=><li key={i}>{item}</li>)}</ul></section>:null;
 return <main className="toss-fpti"><header><p>사주 FPTI</p><h1>나의 운명 성향</h1><p>사주의 오행과 십성을 바탕으로 관계와 선택의 흐름을 살펴봐요.</p><p className="fpti-note">국내 출생을 기준으로 계산해요. 입력과 결과는 현재 화면에서만 사용하며, 나가면 저장되지 않아요.</p></header>
 {!result?<form onSubmit={submit}><fieldset disabled={busy}><legend>출생 정보</legend>
 <label>이름 또는 닉네임 (선택)<input value={form.name} maxLength={40} onChange={e=>change('name',e.target.value)}/></label>
 <label>생년월일<input type="date" required value={form.birthDate} onChange={e=>change('birthDate',e.target.value)}/></label>
 <label>달력<select value={form.calendarType} onChange={e=>change('calendarType',e.target.value as FptiFormInput['calendarType'])}><option value="solar">양력</option><option value="lunar">음력 평달</option><option value="lunar_leap">음력 윤달</option></select></label>
 <label className="fpti-check"><input type="checkbox" checked={form.timeUnknown} onChange={e=>change('timeUnknown',e.target.checked)}/>태어난 시간을 몰라요</label>
 {!form.timeUnknown&&<label>태어난 시각<input type="time" required value={form.birthTime} onChange={e=>change('birthTime',e.target.value)}/></label>}
 <label>성별 (선택)<select value={form.gender} onChange={e=>change('gender',e.target.value as FptiFormInput['gender'])}><option value="OTHER">선택 안함</option><option value="M">남성</option><option value="F">여성</option></select></label>
 <label>태어난 지역 (선택)<input maxLength={60} value={form.birthRegion||''} onChange={e=>change('birthRegion',e.target.value)}/></label></fieldset>
 <button type="submit" disabled={busy}>{busy?'성향을 살펴보는 중':'성향 분석 시작하기'}</button>{busy&&<p role="status">출생정보를 바탕으로 성향을 살펴보고 있어요.</p>}{error&&<p role="alert">{error}</p>}</form>:<article aria-live="polite"><h2>{result.code} · {result.typeName}</h2><p>{result.oneLiner}</p><p>{result.reliabilityMessage}</p>{result.fallbackNotice&&<p>{result.fallbackNotice}</p>}
 <section><h3>성향의 흐름</h3><p>{result.summary}</p><dl>{Object.entries(result.axisMeanings).map(([key,value])=><div key={key}><dt>{axisLabels[key]||key}</dt><dd>{value}</dd></div>)}</dl></section>
 <section><h3>오행과 관계</h3><p>{result.elementSummary}</p><p>{result.relationshipSummary}</p><p>{result.relationStyle.description}</p></section>
 {rows('강점',result.strengths)}{rows('살펴볼 점',result.weaknesses)}<section><h3>일과 재물</h3><p>{result.careerMoneySummary}</p></section><section><h3>연애의 흐름</h3><p>{result.loveSummary}</p></section><section><h3>선택을 위한 조언</h3><p>{result.strategySummary}</p></section>{rows('성장을 위한 제안',result.growthTips)}
 <button type="button" onClick={()=>{phase.current=false;setResult(null);window.scrollTo(0,0);}}>입력 수정하기</button></article>}
 </main>;
}
