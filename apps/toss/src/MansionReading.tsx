import {useEffect,useRef,useState,type FormEvent} from 'react';
import LifeReading,{type LifeTopic} from '../../../app/nakshatra/_components/LifeReading';
import CompatResultView,{type CompatResult} from '../../../app/nakshatra/compat/CompatResultView';
import {PLACE_PRESETS} from '../../../lib/fortune/nakshatra-places.mjs';
import {ianaOffsetHours} from '../../../lib/fortune/nakshatra-timezone.mjs';
import {api} from './platform';
import {Button} from './Button';
import TossSessionScope from './TossSessionScope';

type Person={date:string;time:string;unknown:boolean;city:string;gender:string};
const emptyPerson=():Person=>({date:'',time:'',unknown:false,city:'',gender:''});
type Natal={
  summary:{fusionTitle:string};
  dongyang:{nameKo:string;nameHan:string;easternExpert:string;keywords:string[];strengths:string[];shadows:string[]};
  india:{nameKo:string;nameEn:string;lordKo:string;indianExpert:string;ganaKo:string;deity:string};
  unified:{convergence:string;divergence:string;fusionReading:string};
  lifeReading:LifeTopic[];
  transparency:{ayanamsa:string;siderealMoonLongitude:number;pada:number|null;calendarConvention:string;uncertainty?:{note:string;possibleNakshatras:string[]}};
};
function PersonFields({title,value,onChange}:{title:string;value:Person;onChange:(p:Person)=>void}){
  const set=(patch:Partial<Person>)=>onChange({...value,...patch});
  return <fieldset className="birth-fields"><legend>{title}</legend>
    <label>양력 생년월일<input type="date" required min="1900-01-01" max="2100-12-31" value={value.date} onChange={e=>set({date:e.target.value})}/></label>
    <label className="check"><input type="checkbox" checked={value.unknown} onChange={e=>set({unknown:e.target.checked})}/>태어난 시각을 몰라요</label>
    {!value.unknown&&<label>태어난 시각<input type="time" required value={value.time} onChange={e=>set({time:e.target.value})}/></label>}
    <label>태어난 도시와 국가<select required value={value.city} onChange={e=>set({city:e.target.value})}><option value="">선택해 주세요</option>{PLACE_PRESETS.map(p=><option key={p.label}>{p.label}</option>)}</select></label>
    <label>성별<select value={value.gender} onChange={e=>set({gender:e.target.value})}><option value="">선택하지 않음</option><option value="male">남성</option><option value="female">여성</option></select></label>
  </fieldset>;
}
function birth(person:Person){
  const place=PLACE_PRESETS.find(p=>p.label===person.city);
  if(!place)throw Error('INVALID_PLACE');
  const [year,month,day]=person.date.split('-').map(Number);
  const [hour,minute]=(person.unknown?'12:00':person.time).split(':').map(Number);
  return {year,month,day,hour,minute,timeUnknown:person.unknown,gender:person.gender,
    lat:Number(place.latitude),lon:Number(place.longitude),timezone:ianaOffsetHours(year,month,day,hour,minute,place.timezone,0)};
}
function NatalView({result}:{result:Natal}){
  const {dongyang:east,india,unified,transparency}=result;
  return <section><h2>{result.summary.fusionTitle}</h2>
    <details className="paper" open><summary>{east.nameKo}({east.nameHan}) · 일본 숙요</summary><p>{east.keywords.join(' · ')}</p><p>{east.strengths.join(' · ')}</p><p>{east.shadows.join(' · ')}</p><p>{east.easternExpert}</p></details>
    <details className="paper"><summary>{india.nameKo} · 인도 나크샤트라</summary><p>{india.nameEn} · 지배성 {india.lordKo} · {india.ganaKo} · {india.deity}</p><p>{india.indianExpert}</p></details>
    <details className="paper"><summary>두 전통이 함께 읽는 흐름</summary><p>{unified.convergence}</p><p>{unified.divergence}</p><p>{unified.fusionReading}</p></details>
    <details className="paper"><summary>계산 근거</summary><p>{transparency.ayanamsa} · 달 황경 {transparency.siderealMoonLongitude}°</p>
      <p>{transparency.calendarConvention}</p>{transparency.uncertainty&&<p>{transparency.uncertainty.note} · {transparency.uncertainty.possibleNakshatras.join(' · ')}</p>}
      {transparency.pada!=null&&<p>{transparency.pada} 파다</p>}</details>
    <LifeReading topics={result.lifeReading} showServices={false}/></section>;
}
function Reading({compat}:{compat:boolean}){
  const [a,setA]=useState(emptyPerson),[b,setB]=useState(emptyPerson);
  const [natal,setNatal]=useState<Natal|null>(null),[pair,setPair]=useState<CompatResult|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const epoch=useRef(0);
  useEffect(()=>()=>{epoch.current++;},[]);
  useEffect(()=>{
    if(!pair&&!natal)return;
    const back=(e:Event)=>{e.preventDefault();setPair(null);setNatal(null);};
    window.addEventListener('code-destiny:toss-back',back);
    return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[pair,natal]);
  async function submit(e:FormEvent){
    e.preventDefault();if(busy)return;
    const current=++epoch.current;setBusy(true);setError('');
    try{
      if(compat){const r=await api<CompatResult>('/nakshatra/compat',{a:birth(a),b:birth(b)});if(epoch.current===current)setPair(r);}
      else{const r=await api<Natal>('/nakshatra/resolve',birth(a));if(epoch.current===current)setNatal(r);}
    }catch{if(epoch.current===current)setError('계산을 마치지 못했어요. 입력을 확인하고 다시 시도해 주세요.');}
    finally{if(epoch.current===current)setBusy(false);}
  }
  return <section><h1>{compat?'나크샤트라 동서 궁합':'나의 나크샤트라'}</h1>
    {pair?<CompatResultView result={pair} linkSources={false} onReset={()=>setPair(null)}/>:natal?<><NatalView result={natal}/><Button onClick={()=>setNatal(null)}>다시 계산하기</Button></>:
    <form className="form" onSubmit={submit}><PersonFields title="나의 출생 정보" value={a} onChange={setA}/>{compat&&<PersonFields title="상대의 출생 정보" value={b} onChange={setB}/>}
      <Button type="submit" disabled={busy}>{busy?'계산 중이에요':compat?'두 사람의 별 읽기':'내 별 읽기'}</Button>{error&&<p role="alert">{error}</p>}</form>}</section>;
}
export default function MansionReading({compat,loggedIn,onLogin}:{compat:boolean;loggedIn:boolean;onLogin:()=>void}){
  if(compat&&!loggedIn)return <section><h1>나크샤트라 동서 궁합</h1><p>두 사람의 출생 정보로 숙요의 관계와 베다의 여덟 항목을 살펴봐요.</p><Button onClick={onLogin}>토스 로그인하고 궁합 보기</Button></section>;
  return <TossSessionScope><Reading key={String(compat)} compat={compat}/></TossSessionScope>;
}
