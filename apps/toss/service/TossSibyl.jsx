import {useEffect,useRef,useState} from 'react';
import {api} from '../src/platform';
import {BirthFields,birthPayload,emptyBirth} from '../src/BirthFields';
import {Button} from '../src/Button';
import './saju-compat.css';

const currentYear=()=>Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Seoul',year:'numeric'}).format(new Date()));
export function sibylCard(input){const {gender,date,location}=birthPayload(input);return {gender,birth:date,location};}
export default function TossSibyl(){
 const [birth,setBirth]=useState(emptyBirth),[year,setYear]=useState(currentYear),[preview,setPreview]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const seq=useRef(0),heading=useRef(null);
 useEffect(()=>()=>{seq.current++;},[]);
 useEffect(()=>{if(preview)heading.current?.focus();},[preview]);
 async function read(next){
  const id=++seq.current;setBusy(true);setError('');setPreview(null);
  try{const data=await api('/canonical/sibyl/preview',{profile:sibylCard(birth),year:next});
   if(!data?.preview?.year)throw Error('PREVIEW_UNAVAILABLE');if(seq.current===id)setPreview(data.preview);
  }catch{if(seq.current===id)setError('출생정보와 연결 상태를 확인하고 다시 분석해 주세요.');}
  finally{if(seq.current===id)setBusy(false);}
 }
 return <section className="toss-compat"><img src="/images/feature-details/saju-sibyl-observatory.webp" alt="네 기둥과 시간 궤도를 관측하는 시빌라 분석실" width="640" height="360"/>
  <h1>시빌라 연간 대비 리포트</h1><form className="form" onSubmit={e=>{e.preventDefault();void read(year);}}>
  <BirthFields title="분석할 출생정보" value={birth} onChange={value=>{seq.current++;setBirth(value);setPreview(null);setError('');setBusy(false);}}/>
  <label>분석할 연도<select value={year} onChange={e=>{const next=Number(e.target.value);setYear(next);if(preview||busy)void read(next);}}>
  {Array.from({length:10},(_,i)=>currentYear()+i).map(y=><option key={y} value={y}>{y}년</option>)}</select></label>
  <Button type="submit" display="block" disabled={busy}>연간 흐름 읽기</Button></form>
  {busy&&<p role="status">선택한 해의 흐름을 살피고 있어요.</p>}{error&&<p role="alert">{error}</p>}
  {preview&&<article><h2 tabIndex={-1} ref={heading}>{preview.year}년 대비 분석</h2><p>{preview.summary}</p><p>{preview.period}</p>
  {preview.traits.map(trait=><section key={trait.strength}><h3>{trait.strength}</h3><p>{trait.caution}</p></section>)}
  <h3>먼저 실천할 대비 행동</h3><p>{preview.action}</p><p>{[preview.limitation,...preview.uncertainty].filter(Boolean).join(' ')}</p></article>}<a href={'/saju/sibyl/?deep=1&year='+year}>저장한 프로필로 심층 리포트 열기</a></section>;
}
