"use client";
import {usePaidResume} from '@/app/hooks/usePaidResume';
import {useEffect,useRef,useState} from 'react';
import ProfilePicker from '@/app/yeongnyangi/_components/ProfilePicker';
import {useProfiles,profileKey,isProfileBillingSyncEvent} from '@/app/yeongnyangi/_lib/use-profiles';
import {authFetch,AUTH_SESSION_INVALIDATED_EVENT} from '@/app/_lib/auth-client';
import {careerShare,CAREER_URL} from '@/lib/saju/career-style/share.mjs';
import {SPEAKER_ART,speakerFor} from '@/lib/saju/speaker/index.mjs';
import styles from './career.module.css';

const login=()=>{const next='/saju/career-style/';window.location.assign(`/login/?next=${encodeURIComponent(next)}&returnTo=${encodeURIComponent(next)}`);};
type CareerReport=ReturnType<typeof import('@/lib/saju/career-style/report.mjs').buildCareerReport>;
type Voice='pig'|'neo';
type Mood={src:string;width:number;height:number;crop:{x:number;y:number;s:number}};
// 예전에 저장한 원문(역할 세 가지 구조)도 그대로 보여 준다.
type Role={title:string;reason:string;skill:string;activity:string};
type ReportItem={id:string;title:string;basis:string;body:string;examples?:string};
// 사주 풀이 카드와 같은 화자 선택 키다('neo' = 영냥이, 그 밖 = 연이).
const VOICE_KEY='cdSajuPersonaV1';
const readVoice=():Voice=>{try{return window.localStorage.getItem(VOICE_KEY)==='neo'?'neo':'pig';}catch{return 'pig';}};
const VOICES={pig:{name:'연이',tone:'다정한 존댓말'},neo:{name:'영냥이',tone:'반말로 콕 짚어줌'}} as const;
const NEO_MOODS=['read','cheer','think','listen','read','cheer','think','cheer'];
// 화자 얼굴 틀. 원본 상반신에서 얼굴 정사각형만 보이게 자른다(lib/saju/speaker 의 faceHtml 과 같은 계산).
function Face({voice,mood,size=48}:{voice:Voice;mood?:string;size?:number}){
 const art=SPEAKER_ART[speakerFor(voice)];const moods=art.moods as Record<string,Mood>;
 const picked=moods[mood||art.defaultMood]||moods[art.defaultMood];const {x,y,s}=picked.crop;
 return <span className={styles.face} aria-hidden="true" style={{width:size,height:size,flexBasis:size,borderColor:art.frame.border,background:art.frame.background}}>
  <img src={picked.src} alt="" width={picked.width} height={picked.height} decoding="async" style={{left:`${-x/s*100}%`,top:`${-y/s*100}%`,width:`${picked.width/s*100}%`}}/>
 </span>;
}
type Insight={id:string;title:string;basis:string;scene:string;condition:string;action:string};
const chapterArt:Record<number,{src:string;alt:string;width:number;height:number;caption:string}>={
 0:{src:'/images/career-style/yeoni-work-style.webp',alt:'노트와 나침반으로 일의 방향을 살펴보는 연이',width:1536,height:1024,caption:'직업의 이름보다 나에게 맞는 일의 조건부터.'},
 5:{src:'/images/career-style/yeoni-role-exploration-v1.webp',alt:'창작과 분석, 기획과 협업의 여러 활동을 살펴보는 연이',width:1200,height:800,caption:'직업 이름보다 그 일에서 매일 하는 동작을 먼저 살펴보세요.'},
 7:{src:'/images/yeoni/welcome/yeoni-welcome-v1-640.webp',alt:'꽃을 들고 새로운 시작을 응원하는 연이',width:640,height:960,caption:'작은 경험 하나가 나를 설명하는 새로운 문장이 됩니다.'},
};
function InsightReading({item}:{item:Insight}){return <div className={styles.insight}>
 <h4>{item.title}</h4><p className={styles.basis}><strong>해석의 근거</strong>{item.basis}</p>
 <p>{item.scene}</p><p><strong className={styles.conditionLabel}>도움 되는 조건</strong>{item.condition}</p>
 <div className={styles.practice}><strong>이렇게 확인해 보세요</strong><p>{item.action}</p></div>
</div>;}
export default function CareerStyleClient(){
 const state=useProfiles({forceFreshOnMount:true,skipBillingSync:true});
 const [shareStatus,setShareStatus]=useState(''),[manual,setManual]=useState(false);
 const [loaded,setLoaded]=useState<{context:number;report:CareerReport}|null>(null);
 const [access,setAccess]=useState<{context:number;unlocked:boolean}|null>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const revision=useRef(0),lock=useRef(false),requests=useRef(new Map<string,string>());
 const activeProfile=useRef('');
 const [invalidated,setInvalidated]=useState(false);
 const reportHeading=useRef<HTMLHeadingElement>(null);
 const [voice,setVoice]=useState<Voice>('pig');
 const voiceRef=useRef<Voice>('pig');
 const selected=state.profiles.find(p=>profileKey(p)===state.profileId);
 const ready=!invalidated&&!state.loading&&!state.guest&&!state.error&&Boolean(selected);
 const currentProfile=ready?JSON.stringify(selected):'';
 // An old profile/auth response must never become the next card's result.
 if(activeProfile.current!==currentProfile){activeProfile.current=currentProfile;revision.current+=1;}
 const context=revision.current;
 const result=loaded?.context===context?{report:loaded.report}:null;
 const owns=access?.context===context&&access.unlocked;
 // 예전에 저장한 원문에는 mode 가 없다 — 그때는 연이 말투였다.
 const reportVoice:Voice=(result?.report as {mode?:string}|undefined)?.mode==='neo'?'neo':'pig';
 usePaidResume('saju_lifetime_bundle',async args=>{
  if(!ready||args.profileId!==state.profileId)return false;
  const version=revision.current;
  const data=await api('/api/saju/career-style',{profileId:state.profileId,mode:voiceRef.current});
  if(version!==revision.current)return false;
  setLoaded({context:version,report:data.report});setAccess({context:version,unlocked:true});return true;
 },{legacyKinds:['saju-career-style']});

 useEffect(()=>{setShareStatus('');setManual(false);setError('');},[currentProfile]);
 useEffect(()=>{
  const sync=()=>{voiceRef.current=readVoice();setVoice(voiceRef.current);};sync();
  const storage=(e:StorageEvent)=>{if(e.key===VOICE_KEY||e.key===null)sync();};
  window.addEventListener('storage',storage);return()=>window.removeEventListener('storage',storage);
 },[]);
 useEffect(()=>{if(result?.report)reportHeading.current?.focus();},[result?.report]);
 useEffect(()=>{
  if(!ready)return;
  const version=revision.current;
  void api('/api/saju/career-style?profileId='+encodeURIComponent(state.profileId)).then(data=>{
   if(version===revision.current)setAccess({context:version,unlocked:data.unlocked===true});
  }).catch(()=>{}); // Open rechecks the server before offering any purchase.
 },[ready,state.profileId]);
 async function api(url:string,body?:Record<string,unknown>){
  const response=await authFetch(url,{method:body?'POST':'GET',cache:'no-store',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})},{retryOn401:false,forceFresh:true});
  const data=await response.json();
  if(!response.ok||!data.ok)throw Object.assign(new Error(data.message||'확인하지 못했어요. 잠시 후 다시 시도해 주세요.'),{status:response.status});
  return data;
 }
 async function open(mode:Voice=voiceRef.current){
  if(state.guest){login();return;}
  if(!ready||lock.current)return;
  lock.current=true;setBusy(true);setError('');
  const version=revision.current,pid=state.profileId;
  const valid=()=>version===revision.current;
  const read=()=>api('/api/saju/career-style',{profileId:pid,mode});
  const show=(data:{report:CareerReport})=>{if(valid()){setLoaded({context:version,report:data.report});setAccess({context:version,unlocked:true});}};
  try{
   show(await read());
  }catch(e){if(valid())setError(e instanceof Error?e.message:'확인하지 못했어요. 잠시 후 다시 시도해 주세요.');}
  finally{lock.current=false;setBusy(false);}
 }
 useEffect(()=>{if(!state.loading&&!state.guest&&!state.error)setInvalidated(false);},[state.loading,state.guest,state.error]);
 useEffect(()=>{
  // Reuse the authenticated list endpoint on tab return and while reading, with no billing warmup.
  const revalidate=()=>{if(!state.guest&&document.visibilityState==='visible')void state.refresh(true);};
  document.addEventListener('visibilitychange',revalidate);
  const timer=window.setInterval(revalidate,5*60*1000);
  return()=>{document.removeEventListener('visibilitychange',revalidate);window.clearInterval(timer);};
 },[state.refresh,state.guest]);
 useEffect(()=>{
  const clear=(event:Event)=>{if(isProfileBillingSyncEvent(event))return;revision.current+=1;setLoaded(null);setAccess(null);requests.current.clear();setInvalidated(true);setShareStatus('');setManual(false);setError('');};
  const storage=(e:StorageEvent)=>{if(e.key===null||['fortune_auth_user','fortune_auth_token','cdToken'].includes(e.key))clear(e);};
  window.addEventListener('cd:auth-changed',clear);window.addEventListener(AUTH_SESSION_INVALIDATED_EVENT,clear);window.addEventListener('storage',storage);
  return()=>{revision.current+=1;window.removeEventListener('cd:auth-changed',clear);window.removeEventListener(AUTH_SESSION_INVALIDATED_EVENT,clear);window.removeEventListener('storage',storage);};
 },[]);
 // 말투는 렌더 선택일 뿐이다. 저장된 원문은 서버가 그대로 돌려주고, 공개 결과만 새 말투로 다시 읽는다.
 function chooseVoice(next:Voice){
  if(next===voiceRef.current)return;
  voiceRef.current=next;setVoice(next);
  try{window.localStorage.setItem(VOICE_KEY,next);}catch{}
  if(result?.report)void open(next);
 }
 async function share(){
  if(!result?.report)return;
  const data=careerShare();
  if(navigator.share){try{await navigator.share(data);setShareStatus('공유 창을 열었어요.');return;}catch(e){if(e instanceof Error&&e.name==='AbortError')return;}}
  try{await navigator.clipboard.writeText(`${data.text}\n${data.url}`);setShareStatus('소개 문구와 공개 링크를 복사했어요.');}
  catch{setManual(true);setShareStatus('아래 공개 주소를 직접 복사해 주세요.');}
 }
 return <section id="start" className={styles.start} aria-labelledby="start-title">
  <h2 id="start-title">내 프로필에서 시작하기</h2>
  <p>개인 리포트 여덟 장과 계산 근거를 무료로 읽을 수 있어요. 로그인 후 저장한 프로필을 선택해 주세요.</p>
  <p>내 계정의 프로필만 사용할 수 있어요. 예전에 저장한 결과가 있으면 원문을 그대로 다시 읽습니다.</p>
  <div className={styles.picker}><ProfilePicker state={state} locale="ko" onLogin={login}/></div>
  <p id="career-voice-ask" className={styles.voiceAsk}>누구 말투로 들을까요?</p>
  <div className={styles.voiceCards} role="group" aria-labelledby="career-voice-ask">
   {(['pig','neo'] as const).map(m=><button key={m} type="button" className={styles.voiceCard} aria-pressed={voice===m} onClick={()=>chooseVoice(m)}>
    <Face voice={m} size={48}/><span className={styles.voiceText}><strong>{VOICES[m].name}</strong><span>{VOICES[m].tone}</span></span>
   </button>)}
  </div>
  <div className={styles.paymentActions} aria-busy={busy}>
   <button data-cd-reading-action="primary" className={styles.primary} type="button" disabled={busy||state.loading||(!state.guest&&!ready)} onClick={()=>void open()}>
    {busy?'결과 확인 중':state.loading?'프로필 확인 중':state.guest?'로그인하고 리포트 확인하기':owns?'결과 확인하기':'일 스타일 무료로 읽기'}
   </button>
  </div>
  {error&&<p role="alert">{error}</p>}
  {result?.report&&<article className={styles.report} aria-label="나의 일 스타일 리포트" data-career-voice={reportVoice}>
   {!busy&&reportVoice!==voice&&<p className={styles.analysisNote} role="status">저장된 원문은 처음 받은 {VOICES[reportVoice].name} 말투로 보관돼 있어 그대로 보여 드려요.</p>}
   <header className={styles.reportHeader}>
    {reportVoice==='neo'
     ?<img className={`${styles.reportPortrait} ${styles.neoPortrait}`} src="/images/saju/yeongnyangi-320.webp" alt="나의 일 스타일을 짚어 주는 흰 고양이 영냥이" width={320} height={320} loading="lazy" decoding="async"/>
     :<img className={styles.reportPortrait} src="/fuctionassets/career-style-yeoni.webp" alt="나의 일 스타일 탐색을 함께하는 꽃돼지 연이" width={600} height={400} loading="lazy" decoding="async"/>}
    <div><p>나의 일 스타일</p><h2 ref={reportHeading} tabIndex={-1}>{result.report.title}</h2><p>{reportVoice==='neo'?'돌려 말하지 않을게. 네가 일할 때 힘을 쓰는 데랑 새는 데를 콕 짚어 줄게.':'마음이 움직이는 일, 편안하게 힘을 쓰는 자리. 연이와 함께 당신의 하루에서 작은 실마리를 찾아봐요.'}</p></div>
   </header>
   {result.report.limitations.length>0&&<p className={styles.analysisNote}>일부 출생정보에 따른 해석 제한이 있어요. <a href="#career-calculation-scope">입력 정보와 해석 범위 확인하기</a></p>}
   <nav className={styles.contents} aria-label="리포트 목차">{result.report.sections.map((section:{title:string},i:number)=><a key={section.title} href={`#career-chapter-${i+1}`}><span aria-hidden="true">{String(i+1).padStart(2,'0')}</span>{section.title}</a>)}</nav>
   {result.report.sections.map((section,i)=><section className={styles.chapter} key={section.title} id={`career-chapter-${i+1}`}>
    <header className={styles.chapterHeading}><span aria-hidden="true">{String(i+1).padStart(2,'0')}</span><h3>{section.title}</h3></header>
    {reportVoice==='neo'
     ?<div className={styles.voiceLead}><Face voice="neo" mood={NEO_MOODS[i]} size={56}/><p className={styles.chapterLead}>{section.paragraphs[0]}</p></div>
     :<p className={styles.chapterLead}>{section.paragraphs[0]}</p>}
    {reportVoice==='pig'&&chapterArt[i]&&<figure className={`${styles.chapterArt} ${i===7?styles.closingArt:''}`}>
     <img src={chapterArt[i].src} alt={chapterArt[i].alt} width={chapterArt[i].width} height={chapterArt[i].height} loading="lazy" decoding="async"/>
     <figcaption>{chapterArt[i].caption}</figcaption>
    </figure>}
    {section.paragraphs.slice(1).map((text:string)=><p key={text}>{text}</p>)}
    {section.axes?.map(axis=><div className={styles.axis} key={axis.id}><h4>{axis.title}</h4><p><strong>강점을 쓰기 쉬운 조건</strong> {axis.easy}</p>{axis.support&&<p><strong>보완하면 편해지는 조건</strong> {axis.support}</p>}{reportVoice==='neo'&&<p><strong>영냥이 한마디</strong> {axis.reading}</p>}</div>)}
    {'items' in section&&Array.isArray(section.items)&&<ul className={styles.items}>{(section.items as ReportItem[]).map((item,index)=><li className={styles.item} key={`${item.id}-${index}`}>
     <h4>{item.title}</h4>{item.examples&&<p className={styles.examples}><strong>예를 들면</strong> {item.examples}</p>}
     <p>{item.body}</p><p className={styles.itemBasis}>사주 단서 · {item.basis}</p>
    </li>)}</ul>}
    {(section as {roles?:Role[]}).roles?.map((role,index)=><div className={styles.axis} key={`${role.title}-${index}`}><h4>{role.title}</h4><p><strong>연습할 역량</strong> {role.skill}</p><p><strong>직접 확인할 활동</strong> {role.activity}</p></div>)}
    <details className={styles.deeper}><summary>이 이야기의 사주 단서 살펴보기</summary>
     {section.analysisParagraphs.map((text:string)=><p key={text}>{text}</p>)}
     {section.axes?.map(axis=><p key={axis.id}><strong>{axis.title}</strong> · {axis.basis}{reportVoice==='neo'?'':` ${axis.reading}`}</p>)}
     {(section as {roles?:Role[]}).roles?.map((role,index)=><p key={index}>{role.reason}</p>)}
     {section.insights?.map((item:Insight)=><InsightReading key={item.id} item={item}/>)}
     {section.analysisNote&&<p className={styles.analysisNote}>{section.analysisNote}</p>}
    </details>
    <a className={styles.nextChapter} href={i<7?`#career-chapter-${i+2}`:'#start'}>{i<7?`다음 장 · ${result.report.sections[i+1].title}`:'프로필 선택으로 돌아가기'}</a>
   </section>)}
   <details id="career-calculation-scope" className={styles.evidence}><summary>계산 근거와 해석 범위 확인</summary>
    <p>년주 {result.report.analysis.natal.pillars.year} · 월주 {result.report.analysis.natal.pillars.month} · 일주 {result.report.analysis.natal.pillars.day} · 시주 {result.report.analysis.natal.pillars.hour || '시간 미상'}</p>
    <p>기존 사주 엔진의 절기·일자 경계와 출생지 시간 보정을 그대로 사용했습니다. 입력 정보가 달라지면 결과도 달라집니다. 오행 개수로 적성 점수를 만들지 않습니다.</p>
    <p>기존 원국 분석의 오행 분포: {result.report.elementBasis}. 숫자는 기운의 분포이며 능력 점수가 아닙니다.</p>
    <p>달력: {result.report.analysis.natal.calculationMeta.original.calendarType==='solar'?'양력 (달력 미지정 시 기본값)':result.report.analysis.natal.calculationMeta.original.leapMonth?'음력 윤달':'음력'}. 출생지: {result.report.analysis.natal.calculationMeta.location.name} · {result.report.analysis.natal.calculationMeta.location.timezone}. 시각 보정: {result.report.analysis.natal.calculationMeta.timeUnknown?'시간 미상으로 시주 제외':`${result.report.analysis.natal.calculationMeta.correction.appliedMinutes}분`}.</p>
    {result.report.limitations.map((line:string)=><p key={line}>{line}</p>)}
   </details>
   <p className={styles.notice}>{result.report.disclaimer}</p>
   <footer className={styles.share}><h3>나를 알아가는 질문, 함께 나눠 볼까요?</h3><p>공유는 선택이에요. 소개 문구와 공개 링크만 전달하며, 이름·출생정보·개인 리포트 본문은 포함하지 않습니다.</p>
    <button type="button" className={styles.primary} onClick={()=>void share()}>일 스타일 소개 공유하기</button>
    <p role="status">{shareStatus}</p>{manual&&<label>직접 복사할 공개 주소<input readOnly value={CAREER_URL} onFocus={e=>e.currentTarget.select()}/></label>}
   </footer>
  </article>}
 </section>;
}
