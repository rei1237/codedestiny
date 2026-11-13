import {useEffect,useState} from 'react';
import {Button} from './Button';
import {api} from './platform';

const systems={saju:'사주 일진',sukuyo:'숙요 27수',vedic:'베다 판창가',number:'수비학 개인일수'} as const;
type System=keyof typeof systems;
type Section={key:string;title:string;items?:{label:string;value:string;note?:string}[];lines?:string[]};
type Card={anchor:string;headline:string;body:string;tierLabel?:string;score?:number;detail?:string;highlights?:string[];sections?:Section[]};
type Report={date:string;personalized:boolean;systems:Partial<Record<System,Card|null>>};
type Profile={profileId:string;name:string};

export default function TodayPersonal({period,day}:{period:'today'|'tomorrow';day:string}){
 const [profiles,setProfiles]=useState<Profile[]>([]);
 const [profileId,selectProfile]=useState('');
 const [system,selectSystem]=useState<System>('saju');
 const [ready,setReady]=useState(false);
 const [failure,setFailure]=useState('');
 const [retry,setRetry]=useState(0);
 const [reading,setReading]=useState<{key:string;data:Report}|null>(null);
 const key=JSON.stringify([day,period,profileId]);
 useEffect(()=>{
  let live=true;
  setReady(false);setFailure('');
  api<{profiles:Profile[]}>('/canonical/yeongnyangi/profiles').then(data=>{
    if(!live)return;
    if(!Array.isArray(data.profiles))throw new Error('PROFILE_LIST_INVALID');
    setProfiles(data.profiles);
    selectProfile(id=>data.profiles.some(p=>p.profileId===id)?id:'');
    setReady(true);
  }).catch(()=>{if(live)setFailure('저장된 프로필을 불러오지 못했어요.');});
  return ()=>{live=false;};
 },[retry]);
 useEffect(()=>{
  if(!ready)return;
  let live=true;
  setFailure('');setReading(null);
  api<Report>('/today-hub',{period,profileId}).then(data=>{
    if(live)setReading({key,data});
  }).catch(()=>{if(live)setFailure('운세 계산이 지연되고 있어요. 잠시 후 다시 시도해 주세요.');});
  return ()=>{live=false;};
 },[key,period,profileId,ready]);
 const data=reading?.key===key?reading.data:null;
 const card=data?.systems[system];
 return <section className="paper" aria-label="네 체계의 운세">
   <h2>{period==='today'?'오늘':'내일'}의 네 가지 흐름</h2>
   <div className="form"><label>상담 프로필<select value={profileId} disabled={!ready} onChange={event=>selectProfile(event.target.value)}>
     <option value="">날짜의 흐름만 보기</option>
     {profiles.map(profile=><option key={profile.profileId} value={profile.profileId}>{profile.name}</option>)}
   </select></label><label>해석 체계<select value={system} onChange={event=>selectSystem(event.target.value as System)}>
     {Object.entries(systems).map(([id,title])=><option key={id} value={id}>{title}</option>)}
   </select></label></div>
   {failure?<p role="alert">{failure} <Button onClick={()=>setRetry(n=>n+1)}>다시 확인하기</Button></p>:!data?<p role="status">날짜와 프로필을 확인하고 있어요.</p>:!card?<p role="status">이 체계의 계산이 지연되고 있어요. <Button onClick={()=>setRetry(n=>n+1)}>다시 계산하기</Button></p>:<article aria-live="polite">
     <p>{data.date} · {card.anchor}</p><h3>{card.headline}</h3>
     {card.tierLabel&&<p>{card.tierLabel}{card.score!=null?' · '+card.score+'점':''}</p>}
     <p>{card.body}</p>
     {card.highlights?.length?<ul>{card.highlights.map((line,i)=><li key={i}>{line}</li>)}</ul>:null}
     {card.detail&&<p>{card.detail}</p>}
     {card.sections?.map(section=><details key={section.key}><summary>{section.title}</summary>
       {section.lines?.map((line,i)=><p key={i}>{line}</p>)}
       {section.items?.map((item,i)=><p key={i}><b>{item.label}</b> · {item.value}{item.note&&<small> {item.note}</small>}</p>)}
     </details>)}
   </article>}
 </section>;
}
