"use client";
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {ArrowRight,BookOpen,Check,Copy,Gift} from 'lucide-react';
import {authFetch} from '@/app/_lib/auth-client';
import type {DestinyProfileCard} from '@/app/_lib/profile-card-storage';
import {freeCategories,birthCategories,type AttendanceState,type FreeReading} from '@/worker/yeongnyangi/fortune/free/categories';
import {fortuneApi,FortuneApiError,loginForCurrentPage} from '../_lib/api';
import ProfileForm from './ProfileForm';
import '../_original/free-fortune.css';

function Reading({reading}:{reading:FreeReading}){
 const [copied,setCopied]=useState(false),[copyError,setCopyError]=useState('');
 return <article className="free-reading">
  <div className="free-reading-heading"><div><p>{reading.day} · {reading.kind==='reflection'?'질문과 상징 해설':reading.kind==='symbolic'?'상징 리딩':'계산 근거가 있는 해설'}</p><h3>{reading.title}</h3></div></div>
  {reading.charts?.map(chart=><details className="free-chart" key={chart.domain}><summary>{chart.title}</summary><p>{chart.source}</p>{chart.groups.map((group,index)=><section key={`${group.label}-${index}`}><h4>{group.label}</h4><dl>{group.items.map(item=><div key={`${item.label}-${item.value}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></section>)}</details>)}
  <div className="free-summary"><strong>짧게 말하면</strong><p>{reading.summary}</p></div>
  <h4>영냥이가 조금 더 풀어줄게.</h4><div className="room-daily-message">{reading.paragraphs.map((text,index)=><p key={index}>{text}</p>)}</div>
  <details className="free-evidence"><summary>어떤 근거로 읽었을까?</summary><dl>{reading.basis.map((basis,index)=><div key={index}><dt>{basis.label}</dt><dd>{basis.value}</dd></div>)}</dl>{reading.limitations.map((item,index)=><p key={index}>{item}</p>)}</details>
  <details className="free-prompt"><summary>이 운세의 전문가 프롬프트</summary><p>계산값과 전용 해석 규칙을 담았어. 원하는 상담 도구에 직접 붙여넣을 수 있지만, 자동 전송되지는 않아.</p><pre tabIndex={0} aria-label="복사할 상담 프롬프트">{reading.prompt}</pre><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(reading.prompt);setCopied(true);setCopyError('');}catch{setCopyError('위 문장을 직접 선택해 복사해 주세요.');}}}>{copied?<Check size={17}/>:<Copy size={17}/>} {copied?'복사했어':'프롬프트 복사하기'}</button>{copyError&&<p role="alert">{copyError}</p>}</details>
 </article>;
}

export default function FreeFortune(){
 const [state,setState]=useState<AttendanceState|null>(null),[profiles,setProfiles]=useState<DestinyProfileCard[]>([]),[profileId,setProfileId]=useState('');
 const [category,setCategory]=useState('basic'),[reading,setReading]=useState<FreeReading|null>(null),[draft,setDraft]=useState<Record<string,string>>({question:''});
 const [guest,setGuest]=useState(false),[busy,setBusy]=useState(false),[showProfile,setShowProfile]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [reaction,setReaction]=useState<'idle'|'receive'|'unimpressed'|'done'>('idle');
 const lock=useRef(false),version=useRef(0),timers=useRef<ReturnType<typeof setTimeout>[]>([]),currentDay=useRef('');
 const config=freeCategories.find(item=>item.id===category)!;
 const ignored=new Set(['question','topic','context','tone','depth','avoid','birthDate','birthTime','birthPlace','birthTimezone','calendarType','leapMonth','birthTimeUnknown','gender','name','partnerBirthDate','partnerBirthTime','partnerBirthPlace','partnerBirthTimezone','partnerCalendarType','partnerLeapMonth']);
 const extra=config.fields.filter(field=>!ignored.has(field.id)).slice(0,4);
 async function refresh(){
  const status=await fortuneApi<AttendanceState>('attendance');currentDay.current=status.day;setState(status);
  const response=await authFetch('/api/profile',{}, {forceFresh:true});
  if(response.status===401)throw new FortuneApiError('LOGIN_REQUIRED','로그인이 필요해요.',401);
  const data=await response.json();if(!response.ok)throw new Error(data.message||'프로필을 불러오지 못했어요.');
  const list=data.profiles||[];setProfiles(list);setProfileId(value=>value||data.currentId||list[0]?.profileId||list[0]?.id||'');
 }
 function fail(reason:unknown){const failure=reason as Error&{status?:number};if(failure.status===401){setGuest(true);setState(null);setReading(null);setError('');return;}setError(failure.message||'연결을 마치지 못했어요. 다시 시도해 주세요.');}
 useEffect(()=>{let active=true;refresh().catch(reason=>{if(active)fail(reason);});const tick=setInterval(()=>{const day=new Date(Date.now()+9*3600000).toISOString().slice(0,10);if(currentDay.current&&currentDay.current!==day){version.current++;setReading(null);setReaction('idle');refresh().catch(fail);}},15000);return()=>{active=false;clearInterval(tick);timers.current.forEach(clearTimeout);};},[]);
 useEffect(()=>{const v=++version.current;setReading(null);setError('');setDraft({question:''});if(!state?.unlocked)return;fortuneApi<{result:FreeReading|null}>(`free/reading?category=${encodeURIComponent(category)}`).then(data=>{if(v===version.current)setReading(data.result);}).catch(reason=>{if(v===version.current)fail(reason);});},[category,state?.day,state?.unlocked]);
 async function action(kind:'attendance'|'free/unlock'){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{const next=await fortuneApi<AttendanceState>(kind,{});setState(next);setNotice(kind==='attendance'?(next.awarded?'출석했어. 멸치 한 마리가 쌓였어.':'오늘 출석은 이미 했어.'):'오늘의 16종을 모두 열었어.');if(next.newlyUnlocked){const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;setReaction(reduced?'done':'receive');if(!reduced)timers.current.push(setTimeout(()=>setReaction('unimpressed'),400),setTimeout(()=>setReaction('done'),1300));}}
  catch(reason){fail(reason);}finally{lock.current=false;setBusy(false);}
 }
 async function read(event:FormEvent){
  event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');const v=++version.current;
  try{const data=await fortuneApi<{result:FreeReading}>('free/reading',{category,profileId:profileId||undefined,draft});if(v===version.current)setReading(data.result);}
  catch(reason){if(v===version.current)fail(reason);}finally{lock.current=false;setBusy(false);}
 }
 return <section id="daily" className="room-daily free-fortune" aria-labelledby="daily-title">
  <div className="free-welcome"><div className={`anchovy-cat ${reaction}`}><img src={reaction==='receive'||reaction==='unimpressed'?'/assets/yeongnyangi/fish/reaction-anchovy.webp':'/assets/yeongnyangi/original/expression-calm.webp'} width={240} height={240} alt={reaction==='unimpressed'?'멸치를 바라보는 영냥이':'이야기를 기다리는 영냥이'}/>{reaction==='receive'&&<img className="incoming-anchovy" src="/assets/yeongnyangi/fish/anchovy.webp" width={64} height={32} alt=""/>}</div><div><h2 id="daily-title">멸치 한 마리,<br/>오늘의 이야기.</h2><p className="anchovy-dialogue">{reaction!=='idle'?'……멸치 한 마리. 흠, 일단 받을게. 운세는 제대로 봐줄 테니까.':'운세는 무료로 봐줄게. 그래도 멸치 한 마리는 줘야지. 출석하고 받아 와.'}</p></div></div>
  <div className="attendance-bar"><div className="anchovy-balance"><img src="/assets/yeongnyangi/fish/anchovy.webp" width={72} height={36} alt="멸치"/><span>내 멸치<strong>{state?`${state.balance}마리`:'로그인 후 확인'}</strong></span></div><div className="attendance-actions">{guest?<button className="free-primary" type="button" onClick={loginForCurrentPage}>로그인하고 출석하기<ArrowRight size={17}/></button>:state?<><button type="button" onClick={()=>void action('attendance')} disabled={busy||state.attended}>{state.attended?<Check size={17}/>:<Gift size={17}/>} {state.attended?'오늘 출석 완료':'출석하고 멸치 받기'}</button><button type="button" className="free-primary" onClick={()=>void action('free/unlock')} disabled={busy||state.unlocked||state.balance<1}>{state.unlocked?<BookOpen size={17}/>:<ArrowRight size={17}/>} {state.unlocked?'오늘의 16종 열림':'멸치 1마리 건네기'}</button></>:<p>출석 수첩을 확인하고 있어.</p>}</div></div>
  <p className="free-policy">한국 시간 기준 하루 한 번 출석하면 멸치 1마리. 1마리로 오늘의 16종 전체를 열 수 있어. 남은 멸치는 계속 쌓아둘게.</p><p className="free-status" role="status">{notice}</p>
  {error&&<div className="free-error" role="alert"><p>{error}</p>{!guest&&<button type="button" disabled={busy} onClick={()=>refresh().then(()=>setError('')).catch(fail)}>상태 다시 확인</button>}</div>}
  <div className="free-categories" role="group" aria-label="무료 운세 16종">{freeCategories.map(item=><button type="button" key={item.id} aria-pressed={category===item.id} onClick={()=>setCategory(item.id)}>{item.label.replace(' 프롬프트','')}</button>)}</div>
  {!state?.unlocked?<div className="free-locked"><h3>{config.label}</h3><p>{config.description}</p><p>출석 멸치로 오늘의 이야기를 열어줘. 금액을 결제하거나 AI를 호출하는 과정은 없어.</p></div>:<>
   {birthCategories.has(config.id)&&<div className="free-profile"><label>이번 이야기에 사용할 본인 프로필<select value={profileId} onChange={event=>setProfileId(event.target.value)}><option value="">프로필 선택</option>{profiles.map((profile,index)=><option key={profile.profileId||profile.id} value={profile.profileId||profile.id}>{profile.name||`${index+1}번째 프로필`} · {profile.birthDate}</option>)}</select></label><button type="button" onClick={()=>setShowProfile(value=>!value)}>{showProfile?'입력 접기':'새 프로필 만들기'}</button><small>이미 읽은 운세는 그날 처음 확인한 프로필과 질문으로 유지돼.</small></div>}
   {showProfile&&<div className="free-profile-form"><ProfileForm onSaved={profile=>{setProfiles(list=>[...list,profile]);setProfileId(profile.profileId||profile.id||'');setShowProfile(false);}}/></div>}
   {reading?<Reading reading={reading}/>:<form onSubmit={read} className="free-question"><h3>{config.label}</h3><p>{config.description}</p><label>궁금한 이야기<textarea rows={3} value={draft.question||''} onChange={event=>setDraft({...draft,question:event.target.value})} maxLength={900} placeholder="오늘 내가 살펴볼 선택은 무엇일까?"/></label>{extra.length>0&&<details><summary>이 분야의 질문 단서 더하기</summary>{extra.map(field=><label key={field.id}>{field.label}<input value={draft[field.id]||''} onChange={event=>setDraft({...draft,[field.id]:event.target.value})} maxLength={500} placeholder={field.placeholder}/></label>)}</details>}{birthCategories.has(config.id)&&!profileId&&<p>본인 프로필을 선택하거나 새로 만들어 줘.</p>}<button className="free-primary" disabled={busy||(birthCategories.has(config.id)&&!profileId)}>{busy?'이야기를 정리하고 있어':'오늘의 이야기 읽기'}<ArrowRight size={17}/></button><small>한 번 읽은 이야기는 오늘 동안 그대로 보관돼. 다시 읽어도 멸치를 더 쓰지 않아.</small></form>}
  </>}
 </section>;
}
