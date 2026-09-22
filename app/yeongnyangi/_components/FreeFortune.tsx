"use client";
import FreePromptContinuation from '@/app/components/FreePromptContinuation';
import QuestionSkyConsultation from './QuestionSkyConsultation';
import Image from "next/image";
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {ArrowRight,BookOpen,Check,Gift} from 'lucide-react';
import {freeCategories,birthCategories,type AttendanceState,type FreeReading} from '@/worker/yeongnyangi/fortune/free/categories';
import {fortuneApi,loginForCurrentPage} from '../_lib/api';
import {readDestinyProfileAccountId} from '@/app/_lib/profile-card-storage';
import ProfilePicker from './ProfilePicker';
import {useProfiles} from '../_lib/use-profiles';
import '../_original/free-fortune.css';
import ResultSharing from './ResultSharing';

function Reading({reading}:{reading:FreeReading}){
 return <article className="free-reading">
  <div className="free-reading-heading"><div><p>{reading.day} · {reading.kind==='reflection'?'질문과 상징 해설':reading.kind==='symbolic'?'상징 리딩':'계산 근거가 있는 해설'}</p><h3>{reading.title}</h3></div></div>
  {reading.charts?.map(chart=><details className="free-chart" key={chart.domain}><summary>{chart.title}</summary><p>{chart.source}</p>{chart.groups.map((group,index)=><section key={`${group.label}-${index}`}><h4>{group.label}</h4><dl>{group.items.map(item=><div key={`${item.label}-${item.value}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></section>)}</details>)}
  <div className="free-summary"><strong>짧게 말하면</strong><p>{reading.summary}</p></div>
  <ResultSharing key={`${reading.category}-${reading.day}`} reading={reading}/>
  <h4>영냥이가 조금 더 풀어줄게.</h4><div className="room-daily-message">{reading.paragraphs.map((text,index)=><p key={index}>{text}</p>)}</div>
  <details className="free-evidence"><summary>어떤 근거로 읽었을까?</summary><dl>{reading.basis.map((basis,index)=><div key={index}><dt>{basis.label}</dt><dd>{basis.value}</dd></div>)}</dl>{reading.limitations.map((item,index)=><p key={index}>{item}</p>)}</details>
  <FreePromptContinuation prompt={reading.prompt}/>
 </article>;
}

export default function FreeFortune(){
 const [state,setState]=useState<AttendanceState|null>(null);
 const profileState=useProfiles(),profileId=profileState.profileId;
 const [category,setCategory]=useState('basic'),[reading,setReading]=useState<FreeReading|null>(null),[draft,setDraft]=useState<Record<string,string>>({question:''});
 const [guest,setGuest]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [reaction,setReaction]=useState<'idle'|'award'|'receive'|'unimpressed'>('idle');
 const lock=useRef(false),version=useRef(0),timers=useRef<ReturnType<typeof setTimeout>[]>([]),currentDay=useRef('');
 const attendanceVersion=useRef(0);
 function clearReactionTimers(){timers.current.forEach(clearTimeout);timers.current=[];}
 const config=freeCategories.find(item=>item.id===category)!;
 const ignored=new Set(['question','topic','context','tone','depth','avoid','birthDate','birthTime','birthPlace','birthTimezone','calendarType','leapMonth','birthTimeUnknown','gender','name','partnerBirthDate','partnerBirthTime','partnerBirthPlace','partnerBirthTimezone','partnerCalendarType','partnerLeapMonth']);
 const extra=config.fields.filter(field=>!ignored.has(field.id)).slice(0,4);
 async function refresh(){
  const v=++attendanceVersion.current,account=readDestinyProfileAccountId();
  try{
   const status=await fortuneApi<AttendanceState>('attendance');
   if(v!==attendanceVersion.current||account!==readDestinyProfileAccountId())return;
   currentDay.current=status.day;setState(status);setGuest(false);
  }catch(reason){if(v===attendanceVersion.current)throw reason;}
 }
 function fail(reason:unknown){const failure=reason as Error&{status?:number};if(failure.status===401){clearReactionTimers();setReaction('idle');setGuest(true);setState(null);setReading(null);setError('');return;}setError(failure.message||'연결을 마치지 못했어요. 다시 시도해 주세요.');}
 useEffect(()=>{let active=true;refresh().catch(reason=>{if(active)fail(reason);});
  const auth=()=>{version.current++;clearReactionTimers();setState(null);setReading(null);setNotice('');setGuest(false);setReaction('idle');refresh().catch(fail);};
  const storage=(event:StorageEvent)=>{if(event.key===null||event.key==='fortune_auth_user')auth();};
  window.addEventListener('cd:auth-changed',auth);window.addEventListener('storage',storage);
  const tick=setInterval(()=>{const day=new Date(Date.now()+9*3600000).toISOString().slice(0,10);if(currentDay.current&&currentDay.current!==day){version.current++;clearReactionTimers();setReading(null);setNotice('');setReaction('idle');refresh().catch(fail);}},15000);
  return()=>{active=false;version.current++;attendanceVersion.current++;clearInterval(tick);clearReactionTimers();window.removeEventListener('cd:auth-changed',auth);window.removeEventListener('storage',storage);};},[]);
 useEffect(()=>{const v=++version.current;setReading(null);setError('');setDraft({question:''});if(category==='horary'||!state?.unlocked)return;fortuneApi<{result:FreeReading|null}>(`free/reading?category=${encodeURIComponent(category)}`).then(data=>{if(v===version.current)setReading(data.result);}).catch(reason=>{if(v===version.current)fail(reason);});},[category,state?.day,state?.unlocked]);
 async function action(kind:'attendance'|'free/unlock'){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');clearReactionTimers();setReaction('idle');
  const v=attendanceVersion.current,account=readDestinyProfileAccountId();
  try{
   const next=await fortuneApi<AttendanceState>(kind,{});if(v!==attendanceVersion.current||account!==readDestinyProfileAccountId())return;
   currentDay.current=next.day;setState(next);setNotice(kind==='attendance'?(next.awarded?'출석했어. 멸치 한 마리가 쌓였어.':'오늘 출석은 이미 했어.'):'오늘의 16종을 모두 열었어.');
   if(kind==='attendance'&&next.awarded)setReaction('award');
   else if(kind==='free/unlock'&&next.newlyUnlocked){
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;setReaction(reduced?'unimpressed':'receive');
    if(!reduced)timers.current.push(setTimeout(()=>setReaction('unimpressed'),400));
   }else return;
   timers.current.push(setTimeout(()=>{setReaction('idle');timers.current=[];},1800));
  }
  catch(reason){if(v===attendanceVersion.current&&account===readDestinyProfileAccountId())fail(reason);}finally{lock.current=false;setBusy(false);}
 }
 async function read(event:FormEvent){
  event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');const v=++version.current;
  try{const data=await fortuneApi<{result:FreeReading}>('free/reading',{category,profileId:profileId||undefined,draft});if(v===version.current)setReading(data.result);}
  catch(reason){if(v===version.current)fail(reason);}finally{lock.current=false;setBusy(false);}
 }
 return <section id="daily" className="room-daily free-fortune" aria-labelledby="daily-title">
  <div className="free-welcome"><div className={`anchovy-cat ${reaction}`}><Image src="/assets/yeongnyangi/fish/reaction-anchovy.webp" width={240} height={240} alt="작은 멸치 한 마리를 집어 들고 시큰둥하게 바라보는 영냥이"/>{reaction==='receive'&&<Image className="incoming-anchovy" src="/assets/yeongnyangi/fish/anchovy.webp" width={64} height={32} alt=""/>}</div><div><h2 id="daily-title">멸치 한 마리,<br/>오늘의 이야기.</h2><p className="anchovy-dialogue">{reaction==='receive'||reaction==='unimpressed'?'……이 작은 걸 나한테? 흠, 일단 받을게.':'……멸치 한 마리? 작네. 그래도 이야기는 제대로 봐줄게.'}</p></div></div>
  <div className="attendance-bar"><div className="anchovy-balance"><Image src="/assets/yeongnyangi/fish/anchovy.webp" width={72} height={36} alt="멸치"/><span>내 멸치<strong>{state?`${state.balance}마리`:'로그인 후 확인'}</strong></span>{reaction==='award'&&<span className="anchovy-award" aria-hidden="true"><Image src="/assets/yeongnyangi/fish/anchovy.webp" width={48} height={24} alt=""/>멸치 +1</span>}</div><div className="attendance-actions">{guest?<button className="free-primary" type="button" onClick={loginForCurrentPage}>로그인하고 출석하기<ArrowRight size={17}/></button>:state?<><button type="button" onClick={()=>void action('attendance')} disabled={busy||state.attended}>{state.attended?<Check size={17}/>:<Gift size={17}/>} {state.attended?'오늘 출석 완료':'출석하고 멸치 받기'}</button><button type="button" className="free-primary" onClick={()=>void action('free/unlock')} disabled={busy||state.unlocked||state.balance<1}>{state.unlocked?<BookOpen size={17}/>:<ArrowRight size={17}/>} {state.unlocked?'오늘의 16종 열림':'멸치 1마리 건네기'}</button></>:<p>출석 수첩을 확인하고 있어.</p>}</div></div>
  <p className="free-policy">한국 시간 기준 하루 한 번 출석하면 멸치 1마리. 1마리로 오늘의 16종 전체를 열 수 있어. 남은 멸치는 계속 쌓아둘게.</p><p className="free-status" role="status">{notice}</p>
  {error&&<div className="free-error" role="alert"><p>{error}</p>{!guest&&<button type="button" disabled={busy} onClick={()=>refresh().then(()=>setError('')).catch(fail)}>상태 다시 확인</button>}</div>}
  <ProfilePicker state={profileState}/>
  <div className="free-categories" role="group" aria-label="무료 운세 16종">{freeCategories.map(item=><button type="button" key={item.id} aria-pressed={category===item.id} onClick={()=>setCategory(item.id)}>{item.label.replace(' 프롬프트','')}</button>)}</div>
  {category==='horary'?<QuestionSkyConsultation mode="horary-v1"/>:!state?.unlocked?<div className="free-locked"><h3>{config.label}</h3><p>{config.description}</p><p>출석 멸치로 오늘의 이야기를 열어줘. 금액을 결제하거나 AI를 호출하는 과정은 없어.</p></div>:<>
   {birthCategories.has(config.id)&&<p className="free-policy">이미 읽은 운세는 그날 처음 확인한 프로필과 질문으로 유지돼.</p>}
   {reading?<Reading reading={reading}/>:<form onSubmit={read} className="free-question"><h3>{config.label}</h3><p>{config.description}</p><label>궁금한 이야기<textarea rows={3} value={draft.question||''} onChange={event=>setDraft({...draft,question:event.target.value})} maxLength={900} placeholder="오늘 내가 살펴볼 선택은 무엇일까?"/></label>{extra.length>0&&<details><summary>이 분야의 질문 단서 더하기</summary>{extra.map(field=><label key={field.id}>{field.label}<input value={draft[field.id]||''} onChange={event=>setDraft({...draft,[field.id]:event.target.value})} maxLength={500} placeholder={field.placeholder}/></label>)}</details>}{birthCategories.has(config.id)&&!profileId&&<p>본인 프로필을 선택하거나 새로 만들어 줘.</p>}<button className="free-primary" disabled={busy||(birthCategories.has(config.id)&&!profileId)}>{busy?'이야기를 정리하고 있어':'오늘의 이야기 읽기'}<ArrowRight size={17}/></button><small>한 번 읽은 이야기는 오늘 동안 그대로 보관돼. 다시 읽어도 멸치를 더 쓰지 않아.</small></form>}
  </>}
 </section>;
}
