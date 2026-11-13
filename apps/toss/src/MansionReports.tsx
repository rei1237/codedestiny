import {useEffect,useRef,useState} from 'react';
import {Button} from './Button';
import {api} from './platform';
import TossSessionScope from './TossSessionScope';

export type MansionKind='muhurta'|'vvip-codex';
const titles={muhurta:'나크샤트라 택일', 'vvip-codex':'나크샤트라 VVIP 코덱스'};
const purposes={marriage:'결혼·약속',business:'개업·창업',contract:'계약·거래',moving:'이사·이동',newStart:'시작·착수',healing:'치유·회복'};
type Section={id:string;title:string;keyInsight?:string;paragraphs?:string[];bullets?:{label:string;text:string}[]};
type Chapter=Section&{sections?:Section[];terrain?:{index:number;nameKo:string;nameHan:string;isSelf:boolean;role:string;relationTypeHan:string;gist:string}[]};
type Day={date:string;weekdayKo:string;gradeKo:string;score:number;reason:string;nakshatraKo:string;sukuyoKo:string;taraKo:string;easternLabel:string};
type Report={meta:{purposeKo?:string;myNakshatraKo?:string;myMansionKo?:string;rangeStart?:string;rangeEnd?:string;fusionTitle?:string;nakshatraKo?:string;sukuyoKo?:string};days?:Day[];best?:Day[];avoid?:Day[];chapters?:Chapter[];sections?:Section[]};
type Profile={profileId:string;name:string};

function SectionText({section}:{section:Section}){
  return <><p>{section.keyInsight}</p>{section.paragraphs?.map((line,i)=><p key={i}>{line}</p>)}{section.bullets?.map((item,i)=><p key={i}><b>{item.label}</b> · {item.text}</p>)}</>;
}
function Reading({kind,profileId}:{kind:MansionKind;profileId:string}){
  const [purpose,setPurpose]=useState('marriage');
  const [date,setDate]=useState(()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10));
  const [report,setReport]=useState<Report|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const epoch=useRef(0);
  useEffect(()=>()=>{epoch.current++;},[]);
  useEffect(()=>{
    if(!report)return;
    const back=(event:Event)=>{event.preventDefault();setReport(null);};window.addEventListener('code-destiny:toss-back',back);
    return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[report]);
  async function calculate(){
    if(!profileId||busy)return;
    const version=++epoch.current;
    setBusy(true);setError('');
    try{
      const data=await api<{report:Report}>('/nakshatra/'+kind,{profileId,...(kind==='muhurta'?{purpose,startDate:date}:{})});
      if(version===epoch.current)setReport(data.report);
    }catch{if(version===epoch.current)setError('계산을 마치지 못했어요. 잠시 후 다시 시도해 주세요.');}
    finally{if(version===epoch.current)setBusy(false);}
  }
  if(!report)return <form className="form" onSubmit={event=>{event.preventDefault();void calculate();}}>
    {kind==='muhurta'&&<><label>택일 목적<select value={purpose} onChange={e=>setPurpose(e.target.value)}>{Object.entries(purposes).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>살펴볼 시작일<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label></>}
    <Button disabled={busy||!profileId} type="submit">{busy?'계산하고 있어요':kind==='muhurta'?'택일 리포트 보기':'코덱스 펼치기'}</Button>{error&&<p role="alert">{error}</p>}</form>;
  const data=report.meta;
  return <section><h2>{data.purposeKo||data.fusionTitle||titles[kind]}</h2>
    {report.days&&<><p>{data.myMansionKo} · {data.myNakshatraKo} · {data.rangeStart} ~ {data.rangeEnd}</p>
      {[{heading:'추천 날짜',days:report.best},{heading:'유의할 날짜',days:report.avoid}].map(({heading,days})=><details className="paper" key={heading}><summary>{heading}</summary>{days?.map(item=><p key={item.date}>{item.date} · {item.gradeKo}<br/>{item.reason}</p>)}</details>)}
      <details className="paper"><summary>기간의 모든 날짜 · {report.days.length}일</summary>{report.days.map(item=><p key={item.date}><b>{item.date} · {item.gradeKo} {item.score}점</b><br/>{item.sukuyoKo} · {item.easternLabel} / {item.nakshatraKo} · {item.taraKo}<br/>{item.reason}</p>)}</details></>}
    {report.sections?.map(item=><details className="paper" key={item.id}><summary>{item.title}</summary><SectionText section={item}/></details>)}
    {report.chapters?.map(chapter=><details className="paper" key={chapter.id}><summary>{chapter.title}</summary><SectionText section={chapter}/>{chapter.terrain?.map(row=><p key={row.index}><b>{row.nameKo} {row.nameHan} · {row.role}</b> {row.relationTypeHan}{row.isSelf?' · 내 자리':''}<br/>{row.gist}</p>)}{chapter.sections?.map(item=><section key={item.id}><h3>{item.title}</h3><SectionText section={item}/></section>)}</details>)}
    <Button onClick={()=>setReport(null)}>다시 계산하기</Button></section>;
}
function Profiles({kind}:{kind:MansionKind}){
  const [profiles,setProfiles]=useState<Profile[]|null>(null),[selected,setSelected]=useState(''),[error,setError]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let live=true;setError(false);
    api<{profiles:Profile[];currentId?:string}>('/canonical/yeongnyangi/profiles').then(data=>{
      if(!Array.isArray(data.profiles))throw Error();if(!live)return;
      setProfiles(data.profiles);setSelected(data.profiles.find(p=>p.profileId===data.currentId)?.profileId||data.profiles[0]?.profileId||'');
    }).catch(()=>{if(live)setError(true);});return ()=>{live=false;};
  },[retry]);
  return <section><h1>{titles[kind]}</h1>{error?<p role="alert">프로필을 불러오지 못했어요. <Button onClick={()=>setRetry(n=>n+1)}>다시 확인하기</Button></p>:!profiles?<p role="status">프로필을 확인하고 있어요.</p>:profiles.length===0?<div><p>점술방에서 출생 프로필을 저장한 뒤 다시 열어 주세요.</p><a href="/yeongnyangi/fortune/?flow=question">점술방에서 프로필 등록하기</a></div>:<><div className="form"><label>출생 프로필<select value={selected} onChange={e=>setSelected(e.target.value)}>{profiles.map(p=><option key={p.profileId} value={p.profileId}>{p.name}</option>)}</select></label></div><Reading key={selected+kind} kind={kind} profileId={selected}/></>}</section>;
}
export default function MansionReports({kind,loggedIn,onLogin}:{kind:MansionKind;loggedIn:boolean;onLogin:()=>void}){
  return loggedIn?<TossSessionScope><Profiles kind={kind}/></TossSessionScope>:<section><h1>{titles[kind]}</h1><p>{kind==='muhurta'?'목적에 맞는 날을 숙요와 타라발라로 함께 살펴봐요.':'내 별의 성향과 시기 흐름을 장별로 읽어요.'}</p><Button onClick={onLogin}>토스 로그인하고 리포트 보기</Button></section>;
}
