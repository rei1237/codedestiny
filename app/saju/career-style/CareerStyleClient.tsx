"use client";
import {useEffect,useRef,useState} from 'react';
import ProfilePicker from '@/app/yeongnyangi/_components/ProfilePicker';
import {useProfiles,profileKey,isProfileBillingSyncEvent} from '@/app/yeongnyangi/_lib/use-profiles';
import {authFetch,AUTH_SESSION_INVALIDATED_EVENT} from '@/app/_lib/auth-client';
import {careerShare,CAREER_URL} from '@/lib/saju/career-style/share.mjs';
import {runPaidAccessGate} from '@/app/_lib/billing-client';
import {usePaidResume} from '@/app/hooks/usePaidResume';
import {YEONI_GUIDE_ART} from '@/lib/brand/yeoni-guide-art';
import styles from './career.module.css';

const login=()=>{const next='/saju/career-style/';window.location.assign(`/login/?next=${encodeURIComponent(next)}&returnTo=${encodeURIComponent(next)}`);};
type CareerReport=ReturnType<typeof import('@/lib/saju/career-style/report.mjs').buildCareerReport>;
type Insight={id:string;title:string;basis:string;scene:string;condition:string;action:string};
const chapterArt:Record<number,{src:string;alt:string;width:number;height:number;caption:string}>={
 0:{src:'/images/career-style/yeoni-work-style.webp',alt:'노트와 나침반으로 일의 방향을 살펴보는 연이',width:1536,height:1024,caption:'직업의 이름보다 나에게 맞는 일의 조건부터.'},
 1:{...YEONI_GUIDE_ART.reading,caption:'평소 당연하게 해온 수고에도 나만의 감각이 숨어 있어요.'},
 3:{...YEONI_GUIDE_ART.welcome,caption:'내 속도와 함께하는 사람의 속도를 다정하게 맞춰 봐요.'},
 4:{...YEONI_GUIDE_ART.reading,caption:'어떤 하루를 보내고 싶은지 차 한 잔 사이에 떠올려 보세요.'},
 6:{...YEONI_GUIDE_ART.welcome,caption:'애쓰는 마음에도 편히 쉬어 갈 자리가 필요해요.'},
 2:{src:'/images/saju/yeoni-moonlight-reading.webp',alt:'달빛이 들어오는 창가에서 책을 읽는 연이',width:960,height:640,caption:'같은 성향도 어떤 환경을 만나느냐에 따라 다르게 쓰일 수 있어요.'},
 5:{src:'/images/career-style/yeoni-role-exploration-v1.webp',alt:'창작과 분석, 기획과 협업의 여러 활동을 살펴보는 연이',width:1200,height:800,caption:'직업을 정하기보다 여러 역할을 경험해 보세요.'},
 7:{src:'/images/yeoni/welcome/yeoni-welcome-v1-640.webp',alt:'꽃을 들고 새로운 시작을 응원하는 연이',width:640,height:960,caption:'작은 경험 하나가 나를 설명하는 새로운 문장이 됩니다.'},
};
function InsightReading({item}:{item:Insight}){return <div className={styles.insight}>
 <h4>{item.title}</h4><p className={styles.basis}><strong>해석의 근거</strong>{item.basis}</p>
 <p>{item.scene}</p><p><strong className={styles.conditionLabel}>도움 되는 조건</strong>{item.condition}</p>
 <div className={styles.practice}><strong>이렇게 확인해 보세요</strong><p>{item.action}</p></div>
</div>;}
export default function CareerStyleClient({bundlePriceKRW}:{bundlePriceKRW:number}){
 const state=useProfiles({forceFreshOnMount:true,skipBillingSync:true});
 const [shareStatus,setShareStatus]=useState(''),[manual,setManual]=useState(false);
 const [loaded,setLoaded]=useState<{context:number;report:CareerReport}|null>(null);
 const [access,setAccess]=useState<{context:number;unlocked:boolean}|null>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const revision=useRef(0),lock=useRef(false),requests=useRef(new Map<string,string>());
 const activeProfile=useRef('');
 const [invalidated,setInvalidated]=useState(false);
 const reportHeading=useRef<HTMLHeadingElement>(null);
 const selected=state.profiles.find(p=>profileKey(p)===state.profileId);
 const ready=!invalidated&&!state.loading&&!state.guest&&!state.error&&Boolean(selected);
 const currentProfile=ready?JSON.stringify(selected):'';
 // An old profile/auth response must never become the next card's result.
 if(activeProfile.current!==currentProfile){activeProfile.current=currentProfile;revision.current+=1;}
 const context=revision.current;
 const result=loaded?.context===context?{report:loaded.report}:null;
 const owns=access?.context===context&&access.unlocked;
 const buildResume=usePaidResume('saju_lifetime_bundle',async args=>{
  if(!ready||args.profileId!==state.profileId)return false;
  const version=revision.current;
  const data=await api('/api/saju/career-style',{profileId:state.profileId});
  if(version!==revision.current)return false;
  setLoaded({context:version,report:data.report});setAccess({context:version,unlocked:true});return true;
 },{legacyKinds:['saju-career-style']});
 useEffect(()=>{setShareStatus('');setManual(false);setError('');},[currentProfile]);
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
 async function open(){
  if(state.guest){login();return;}
  if(!ready||lock.current)return;
  lock.current=true;setBusy(true);setError('');
  const version=revision.current,pid=state.profileId;
  const valid=()=>version===revision.current;
  const read=()=>api('/api/saju/career-style',{profileId:pid});
  const show=(data:{report:CareerReport})=>{if(valid()){setLoaded({context:version,report:data.report});setAccess({context:version,unlocked:true});}};
  try{
   try{show(await read());return;}catch(e){if((e as {status?:number}).status!==402)throw e;}
   if(!valid())return;
   const requestKey=currentProfile+':bundle';
   if(!requests.current.has(requestKey))requests.current.set(requestKey,crypto.randomUUID());
   const requestId=requests.current.get(requestKey)!;
   // 개별 판매는 끝났다. 열람 권리가 없으면 사주 영구 묶음 결제로 이어진다(묶음 보유자는 서버가 이 리포트도 열어 준다).
   const payment=await runPaidAccessGate({featureKey:'saju_lifetime_bundle',profileId:pid,requestId,reason:'사주 영구 묶음 구매',resume:buildResume({profileId:pid})});
   if(!payment.ok){if(valid())setError(payment.message||'결제를 완료하지 않았어요. 기존 결제가 있다면 결과를 다시 확인해 주세요.');return;}
   if(valid())show(await read());
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
 async function share(){
  if(!result?.report)return;
  const data=careerShare();
  if(navigator.share){try{await navigator.share(data);setShareStatus('공유 창을 열었어요.');return;}catch(e){if(e instanceof Error&&e.name==='AbortError')return;}}
  try{await navigator.clipboard.writeText(`${data.text}\n${data.url}`);setShareStatus('소개 문구와 공개 링크를 복사했어요.');}
  catch{setManual(true);setShareStatus('아래 공개 주소를 직접 복사해 주세요.');}
 }
 return <section id="start" className={styles.start} aria-labelledby="start-title">
  <h2 id="start-title">내 프로필에서 시작하기</h2>
  <p>소개와 위의 예시는 무료예요. 개인 리포트 여덟 장은 사주 영구 묶음({bundlePriceKRW.toLocaleString('ko-KR')}원, 한 번 결제로 영구 소장)에 포함되어 있어요. 이전에 이 리포트를 구매하신 분은 그대로 다시 읽으실 수 있어요.</p>
  <p>같은 계정·같은 출생정보로 해금한 결과는 저장된 원문을 추가 결제 없이 다시 읽을 수 있어요. 묶음은 저장한 프로필의 출생정보 기준으로 적용돼요.</p>
  <div className={styles.picker}><ProfilePicker state={state} locale="ko" showPolicyNote={false} onLogin={login}/></div>
  <div className={styles.paymentActions} aria-busy={busy}>
   <button className={styles.primary} type="button" disabled={busy||state.loading||(!state.guest&&!ready)} onClick={()=>void open()}>
    {busy?'해금·결과 확인 중':state.loading?'프로필 확인 중':state.guest?'로그인하고 리포트 확인하기':owns?'결과 확인하기':'사주 영구 묶음으로 열기'}
   </button>
  </div>
  {error&&<p role="alert">{error}</p>}
  {result?.report&&<article className={styles.report} aria-label="나의 일 스타일 리포트">
   <header className={styles.reportHeader}>
    <img className={styles.reportPortrait} src="/fuctionassets/career-style-yeoni.webp" alt="나의 일 스타일 탐색을 함께하는 꽃돼지 연이" width={600} height={400} loading="lazy" decoding="async"/>
    <div><p>나의 일 스타일</p><h2 ref={reportHeading} tabIndex={-1}>{result.report.title}</h2><p>마음이 움직이는 일, 편안하게 힘을 쓰는 자리. 연이와 함께 당신의 하루에서 작은 실마리를 찾아봐요.</p></div>
   </header>
   {result.report.limitations.length>0&&<p className={styles.analysisNote}>일부 출생정보에 따른 해석 제한이 있어요. <a href="#career-calculation-scope">입력 정보와 해석 범위 확인하기</a></p>}
   <nav className={styles.contents} aria-label="리포트 목차">{result.report.sections.map((section:{title:string},i:number)=><a key={section.title} href={`#career-chapter-${i+1}`}><span aria-hidden="true">{String(i+1).padStart(2,'0')}</span>{section.title}</a>)}</nav>
   {result.report.sections.map((section,i)=><section className={styles.chapter} key={section.title} id={`career-chapter-${i+1}`}>
    <header className={styles.chapterHeading}><span aria-hidden="true">{String(i+1).padStart(2,'0')}</span><h3>{section.title}</h3></header>
    <p className={styles.chapterLead}>{section.paragraphs[0]}</p>
    {chapterArt[i]&&<figure className={`${styles.chapterArt} ${i===7?styles.closingArt:''}`}>
     <img src={chapterArt[i].src} alt={chapterArt[i].alt} width={chapterArt[i].width} height={chapterArt[i].height} loading="lazy" decoding="async"/>
     <figcaption>{chapterArt[i].caption}</figcaption>
    </figure>}
    {section.paragraphs.slice(1).map((text:string)=><p key={text}>{text}</p>)}
    {section.axes?.map(axis=><div className={styles.axis} key={axis.id}><h4>{axis.title}</h4><p><strong>강점을 쓰기 쉬운 조건</strong> {axis.easy}</p><p><strong>보완하면 편해지는 조건</strong> {axis.support}</p></div>)}
    {section.roles?.map((role,index)=><div className={styles.axis} key={`${role.title}-${index}`}><h4>{role.title}</h4><p><strong>연습할 역량</strong> {role.skill}</p><p><strong>직접 확인할 활동</strong> {role.activity}</p></div>)}
    <details className={styles.deeper}><summary>이 이야기의 사주 단서 살펴보기</summary>
     {section.analysisParagraphs.map((text:string)=><p key={text}>{text}</p>)}
     {section.axes?.map(axis=><p key={axis.id}><strong>{axis.title}</strong> · {axis.basis} {axis.reading}</p>)}
     {section.roles?.map((role,index)=><p key={index}>{role.reason}</p>)}
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
