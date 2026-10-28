"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import ProfilePicker from '@/app/yeongnyangi/_components/ProfilePicker';
import {useProfiles,profileKey} from '@/app/yeongnyangi/_lib/use-profiles';
import {selectedBirthProfileSeed} from '@/app/_lib/ai-prefill-seed';
import {AUTH_SESSION_INVALIDATED_EVENT} from '@/app/_lib/auth-client';
import {buildCareerReport,careerNatalInput,careerShare,CAREER_URL} from '@/lib/saju/career-style/report.mjs';
import styles from './career.module.css';

const login=()=>{const next='/saju/career-style/';window.location.assign(`/login/?next=${encodeURIComponent(next)}&returnTo=${encodeURIComponent(next)}`);};
type Insight={id:string;title:string;basis:string;scene:string;condition:string;action:string};
const chapterArt:Record<number,{src:string;alt:string;width:number;height:number;caption:string}>={
 0:{src:'/images/career-style/yeoni-work-style.webp',alt:'노트와 나침반으로 일의 방향을 살펴보는 연이',width:1536,height:1024,caption:'직업의 이름보다 나에게 맞는 일의 조건부터.'},
 2:{src:'/images/saju/yeoni-moonlight-reading.webp',alt:'달빛이 들어오는 창가에서 책을 읽는 연이',width:960,height:640,caption:'같은 성향도 어떤 환경을 만나느냐에 따라 다르게 쓰일 수 있어요.'},
 5:{src:'/images/career-style/yeoni-role-exploration-v1.webp',alt:'창작과 분석, 기획과 협업의 여러 활동을 살펴보는 연이',width:1200,height:800,caption:'직업을 정하기보다 여러 역할을 경험해 보세요.'},
 7:{src:'/images/yeoni/welcome/yeoni-welcome-v1-640.webp',alt:'꽃을 들고 새로운 시작을 응원하는 연이',width:640,height:960,caption:'작은 경험 하나가 나를 설명하는 새로운 문장이 됩니다.'},
};
function InsightReading({item}:{item:Insight}){return <div className={styles.insight}>
 <h4>{item.title}</h4><p className={styles.basis}><strong>해석의 근거</strong>{item.basis}</p>
 <p>{item.scene}</p><p><strong className={styles.conditionLabel}>도움 되는 조건</strong>{item.condition}</p>
 <div className={styles.practice}><strong>이렇게 확인해 보세요</strong><p>{item.action}</p></div>
</div>;}
export default function CareerStyleClient(){
 const state=useProfiles({forceFreshOnMount:true});
 const [opened,setOpened]=useState(false),[shareStatus,setShareStatus]=useState(''),[manual,setManual]=useState(false);
 const [invalidated,setInvalidated]=useState(false);
 const reportHeading=useRef<HTMLHeadingElement>(null);
 // No result state or report storage: the current authenticated list is the only source.
 const selected=state.profiles.find(p=>profileKey(p)===state.profileId);
 const ready=!invalidated&&!state.loading&&!state.guest&&!state.error&&Boolean(selected);
 const result=useMemo(()=>{
  if(!opened||!ready||!selected)return null;
  try{return {report:buildCareerReport(careerNatalInput(selectedBirthProfileSeed(selected))),error:''};}
  catch{return {report:null,error:'출생정보를 계산하지 못했어요. 날짜·달력 종류와 출생지의 시간대·경도를 프로필 카드에서 확인해 주세요.'};}
 },[opened,ready,selected]);
 useEffect(()=>{setShareStatus('');setManual(false);},[selected,ready]);
 useEffect(()=>{if(opened)reportHeading.current?.focus();},[opened]);
 useEffect(()=>{if(!state.loading&&!state.guest&&!state.error)setInvalidated(false);},[state.loading,state.guest,state.error]);
 useEffect(()=>{
  // Reuse the authenticated list endpoint on tab return and while reading, with no billing warmup.
  const revalidate=()=>{if(!state.guest&&document.visibilityState==='visible')void state.refresh(true);};
  document.addEventListener('visibilitychange',revalidate);
  const timer=window.setInterval(revalidate,5*60*1000);
  return()=>{document.removeEventListener('visibilitychange',revalidate);window.clearInterval(timer);};
 },[state.refresh,state.guest]);
 useEffect(()=>{
  const clear=()=>{setOpened(false);setInvalidated(true);setShareStatus('');setManual(false);};
  const storage=(e:StorageEvent)=>{if(e.key===null||['fortune_auth_user','fortune_auth_token','cdToken'].includes(e.key))clear();};
  window.addEventListener('cd:auth-changed',clear);window.addEventListener(AUTH_SESSION_INVALIDATED_EVENT,clear);window.addEventListener('storage',storage);
  return()=>{window.removeEventListener('cd:auth-changed',clear);window.removeEventListener(AUTH_SESSION_INVALIDATED_EVENT,clear);window.removeEventListener('storage',storage);};
 },[]);
 async function share(){
  if(!result?.report)return;
  const data=careerShare(result.report);
  if(navigator.share){try{await navigator.share(data);setShareStatus('공유 창을 열었어요.');return;}catch(e){if(e instanceof Error&&e.name==='AbortError')return;}}
  try{await navigator.clipboard.writeText(`${data.text}\n${data.url}`);setShareStatus('유형 요약과 공개 링크를 복사했어요.');}
  catch{setManual(true);setShareStatus('아래 공개 주소를 직접 복사해 주세요.');}
 }
 return <section id="start" className={styles.start} aria-labelledby="start-title">
  <h2 id="start-title">내 프로필에서 시작하기</h2>
  <p>가입 후 무료로 읽을 수 있어요. 저장한 프로필 카드를 선택하면 이 기기에서 리포트를 계산합니다.</p>
  <div className={styles.picker}><ProfilePicker state={state} locale="ko" showPolicyNote={false} onLogin={login}/></div>
  <button className={styles.primary} type="button" disabled={state.loading||(!state.guest&&!ready)} onClick={()=>state.guest?login():setOpened(true)}>
   {state.loading?'프로필 확인 중':state.guest?'가입하고 무료로 알아보기':'내 프로필로 결과 보기'}
  </button>
  {result?.error&&<p role="alert">{result.error} 다른 카드를 선택하거나 위에서 정확한 정보로 카드를 추가해 주세요.</p>}
  {result?.report&&<article className={styles.report} aria-label="나의 일 스타일 리포트">
   <header className={styles.reportHeader}>
    <img className={styles.reportPortrait} src="/fuctionassets/career-style-yeoni.webp" alt="나의 일 스타일 탐색을 함께하는 꽃돼지 연이" width={600} height={400} loading="lazy" decoding="async"/>
    <div><p>나의 일 스타일</p><h2 ref={reportHeading} tabIndex={-1}>{result.report.title}</h2><p>{result.report.basis}</p></div>
   </header>
   <details className={styles.evidence}><summary>계산 근거와 해석 범위 확인</summary>
    <p>년주 {result.report.analysis.natal.pillars.year} · 월주 {result.report.analysis.natal.pillars.month} · 일주 {result.report.analysis.natal.pillars.day} · 시주 {result.report.analysis.natal.pillars.hour || '시간 미상'}</p>
    <p>기존 사주 엔진의 절기·일자 경계와 출생지 시간 보정을 그대로 사용했습니다. 입력 정보가 달라지면 결과도 달라집니다. 오행 개수로 적성 점수를 만들지 않습니다.</p>
    <p>기존 원국 분석의 오행 분포: {result.report.elementBasis}. 숫자는 기운의 분포이며 능력 점수가 아닙니다.</p>
    <p>달력: {result.report.analysis.natal.calculationMeta.original.calendarType==='solar'?'양력 (달력 미지정 시 기본값)':result.report.analysis.natal.calculationMeta.original.leapMonth?'음력 윤달':'음력'}. 출생지: {result.report.analysis.natal.calculationMeta.location.name} · {result.report.analysis.natal.calculationMeta.location.timezone}. 시각 보정: {result.report.analysis.natal.calculationMeta.timeUnknown?'시간 미상으로 시주 제외':`${result.report.analysis.natal.calculationMeta.correction.appliedMinutes}분`}.</p>
    {result.report.limitations.map((line:string)=><p key={line}>{line}</p>)}
   </details>
   <nav className={styles.contents} aria-label="리포트 목차">{result.report.sections.map((section:{title:string},i:number)=><a key={section.title} href={`#career-chapter-${i+1}`}><span aria-hidden="true">{String(i+1).padStart(2,'0')}</span>{section.title}</a>)}</nav>
   {result.report.sections.map((section,i)=><section className={styles.chapter} key={section.title} id={`career-chapter-${i+1}`}>
    <header className={styles.chapterHeading}><span aria-hidden="true">{String(i+1).padStart(2,'0')}</span><h3>{section.title}</h3></header>
    <p className={styles.chapterLead}>{section.paragraphs[0]}</p>
    {chapterArt[i]&&<figure className={`${styles.chapterArt} ${i===7?styles.closingArt:''}`}>
     <img src={chapterArt[i].src} alt={chapterArt[i].alt} width={chapterArt[i].width} height={chapterArt[i].height} loading="lazy" decoding="async"/>
     <figcaption>{chapterArt[i].caption}<small>이해를 돕는 공통 삽화입니다.</small></figcaption>
    </figure>}
    {section.paragraphs.slice(1).map((text:string)=><p key={text}>{text}</p>)}
    {section.axes?.map(axis=><div className={styles.axis} key={axis.id}><h4>{axis.title}</h4><small>{axis.basis}</small><p>{axis.reading}</p><p><strong>강점을 쓰기 쉬운 조건</strong> {axis.easy}</p><p><strong>보완하면 편해지는 조건</strong> {axis.support}</p></div>)}
    {section.roles?.map((role,index)=><div className={styles.axis} key={`${role.title}-${index}`}><h4>{role.title}</h4><p>{role.reason}</p><p><strong>연습할 역량</strong> {role.skill}</p><p><strong>직접 확인할 활동</strong> {role.activity}</p></div>)}
    {section.insights?.[0]&&<InsightReading item={section.insights[0]}/>}
    {section.insights?.length>1&&<details className={styles.deeper}><summary>{section.title} — 추가 해석 {section.insights.length-1}가지 읽기</summary>
     {section.insights.slice(1).map((item:Insight)=><InsightReading key={item.id} item={item}/>)}
    </details>}
    {section.analysisNote&&<p className={styles.analysisNote}>{section.analysisNote}</p>}
    <a className={styles.nextChapter} href={i<7?`#career-chapter-${i+2}`:'#start'}>{i<7?`다음 장 · ${result.report.sections[i+1].title}`:'프로필 선택으로 돌아가기'}</a>
   </section>)}
   <p className={styles.notice}>{result.report.disclaimer}</p>
   <footer className={styles.share}><h3>나를 알아가는 질문, 함께 나눠 볼까요?</h3><p>공유는 선택이에요. 유형 요약과 소개 링크만 전달하며, 이름·출생정보·개인 리포트 본문은 포함하지 않습니다.</p>
    <button type="button" className={styles.primary} onClick={()=>void share()}>일 스타일 소개 공유하기</button>
    <p role="status">{shareStatus}</p>{manual&&<label>직접 복사할 공개 주소<input readOnly value={CAREER_URL} onFocus={e=>e.currentTarget.select()}/></label>}
   </footer>
  </article>}
 </section>;
}
