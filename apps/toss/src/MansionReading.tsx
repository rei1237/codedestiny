import {useEffect,useRef,useState,type FormEvent} from 'react';
import TodayMoonCard,{type TodayMoon} from '../../../app/nakshatra/result/TodayMoonCard';
import LifeReading,{type LifeTopic} from '../../../app/nakshatra/_components/LifeReading';
import CompatResultView,{type CompatResult} from '../../../app/nakshatra/compat/CompatResultView';
import MansionProfile from './MansionProfile';
import {PersonFields,birth,emptyPerson} from './MansionBirth';
import {api} from './platform';
import {Button} from './Button';
import TossSessionScope from './TossSessionScope';

const loadTodayMoon=(index:number)=>api<TodayMoon>('/nakshatra/today?sukuyoIndex='+index);

type Natal={
  summary:{fusionTitle:string};
  dongyang:{index:number;nameKo:string;nameHan:string;easternExpert:string;keywords:string[];strengths:string[];shadows:string[]};
  india:{nameKo:string;nameEn:string;lordKo:string;indianExpert:string;ganaKo:string;deity:string};
  unified:{convergence:string;divergence:string;fusionReading:string};
  lifeReading:LifeTopic[];
  transparency:{ayanamsa:string;siderealMoonLongitude:number;pada:number|null;calendarConvention:string;uncertainty?:{note:string;possibleNakshatras:string[]}};
};
function NatalView({result}:{result:Natal}){
  const {dongyang:east,india,unified,transparency}=result;
  return <section><h2>{result.summary.fusionTitle}</h2>
    <details className="paper" open><summary>{east.nameKo}({east.nameHan}) · 일본 숙요</summary><p>{east.keywords.join(' · ')}</p><p>{east.strengths.join(' · ')}</p><p>{east.shadows.join(' · ')}</p><p>{east.easternExpert}</p></details>
    <details className="paper"><summary>{india.nameKo} · 인도 나크샤트라</summary><p>{india.nameEn} · 지배성 {india.lordKo} · {india.ganaKo} · {india.deity}</p><p>{india.indianExpert}</p></details>
    <details className="paper"><summary>두 전통이 함께 읽는 흐름</summary><p>{unified.convergence}</p><p>{unified.divergence}</p><p>{unified.fusionReading}</p></details>
    <details className="paper"><summary>계산 근거</summary><p>{transparency.ayanamsa} · 달 황경 {transparency.siderealMoonLongitude}°</p>
      <p>{transparency.calendarConvention}</p>{transparency.uncertainty&&<p>{transparency.uncertainty.note} · {transparency.uncertainty.possibleNakshatras.join(' · ')}</p>}
      {transparency.pada!=null&&<p>{transparency.pada} 파다</p>}</details>
    <TodayMoonCard sukuyoIndex={east.index} load={loadTodayMoon}/>
    <LifeReading topics={result.lifeReading} showServices={false}/></section>;
}
function Reading({compat,loggedIn}:{compat:boolean;loggedIn:boolean}){
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
    <form className="form" onSubmit={submit}>{loggedIn&&<MansionProfile disabled={busy} onSelect={setA}/>}<PersonFields title="나의 출생 정보" value={a} onChange={setA}/>{compat&&<><MansionProfile disabled={busy} onSelect={setB}/><PersonFields title="상대의 출생 정보" value={b} onChange={setB}/></>}
      <Button type="submit" disabled={busy}>{busy?'계산 중이에요':compat?'두 사람의 별 읽기':'내 별 읽기'}</Button>{error&&<p role="alert">{error}</p>}</form>}</section>;
}
export default function MansionReading({compat,loggedIn,onLogin}:{compat:boolean;loggedIn:boolean;onLogin:()=>void}){
  if(compat&&!loggedIn)return <section><h1>나크샤트라 동서 궁합</h1><p>두 사람의 출생 정보로 숙요의 관계와 베다의 여덟 항목을 살펴봐요.</p><Button onClick={onLogin}>토스 로그인하고 궁합 보기</Button></section>;
  return <TossSessionScope><Reading key={String(compat)} compat={compat} loggedIn={loggedIn}/></TossSessionScope>;
}
