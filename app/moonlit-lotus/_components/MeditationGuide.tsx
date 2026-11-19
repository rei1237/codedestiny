"use client";
import {useEffect,useRef,useState} from 'react';
import type {Character} from '../_lib/session-policy';
import {advanceGuide,guideCueAt,initialGuide,meditationCue,type GuideState,type GuidePace} from '../_lib/meditation-guide';
import styles from './MeditationGuide.module.css';
export default function MeditationGuide({character,onActivityChange}:{character:Character;onActivityChange:(active:boolean)=>void}){
 const [state,setState]=useState<GuideState>(initialGuide),[hidden,setHidden]=useState(false);
 const [pace,setPace]=useState<GuidePace>('standard');
 const active=useRef(onActivityChange);active.current=onActivityChange;
 const running=state.status==='running';
 useEffect(()=>{active.current(running);},[running]);
 useEffect(()=>()=>active.current(false),[]);
 useEffect(()=>{
  const pause=()=>setState(s=>s.status==='running'?{...s,status:'paused'}:s);
  const visibility=()=>{if(document.hidden)pause();};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pause);window.addEventListener('popstate',pause);
  return()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pause);window.removeEventListener('popstate',pause);};
 },[]);
 useEffect(()=>{
  if(!running)return;
  let previous=performance.now();
  const timer=setInterval(()=>{const now=performance.now(),delta=now-previous;previous=now;setState(s=>document.hidden?{...s,status:'paused'}:advanceGuide(s,delta,pace));},250);
  return()=>clearInterval(timer);
 },[running,pace]);
 const cue=guideCueAt(state.elapsed,pace),ended=state.status==='complete'||state.status==='stopped';
 const start=()=>{setHidden(false);setState(s=>s.status==='paused'?{...s,status:'running'}:{status:'running',elapsed:0});};
 const toggle=()=>{setHidden(value=>!value);setState(s=>s.status==='running'?{...s,status:'paused'}:s);};
 return <section className={styles.guide} aria-label="짧은 명상 안내" data-guide-status={state.status}>
  <p className={styles.intro}>{character==='cat'?'영냥이':'연이'}와 잠깐 머물기 · {pace==='slow'?'약 3분 30초':'2분 30초'}</p>
  <p>눈을 편하게 뜬 채 읽어도 좋아요. 숨을 참거나 맞출 필요 없이, 불편하면 언제든 쉬거나 마쳐요.</p>
  <label className={styles.pace}>안내 속도<select value={pace} disabled={running||state.status==='paused'} onChange={event=>setPace(event.target.value==='slow'?'slow':'standard')}><option value="standard">기본 · 2분 30초</option><option value="slow">천천히 · 약 3분 30초</option></select><span className={styles.note}>속도는 시작 전에 골라요. 진행 중에는 일시정지로 천천히 읽을 수 있어요.</span></label>
  <div className={styles.cue}>
   <p aria-live="polite" aria-atomic="true">{hidden?'안내를 숨겼어요. 원하는 만큼 조용히 머물러요.':state.status==='ready'?'준비되면 안내를 시작해요. 문장 사이에는 조용히 머무는 시간이 있어요.':state.status==='complete'?'안내를 마쳤어요. 느낀 만큼이면 충분해요. 준비되면 일상으로 돌아가요.':state.status==='stopped'?'여기까지 쉬었어요. 다시 시작하거나 조용히 머물러도 좋아요.':state.status==='paused'?(cue.quiet?'잠시 쉬고 있어요. 준비되면 이어서 해요.':meditationCue(character,cue.index)):!cue.quiet?meditationCue(character,cue.index):''}</p>
   {!hidden&&running&&cue.quiet&&<p aria-hidden="true" className={styles.quiet}>잠시, 편한 감각에 머물러요.</p>}
  </div>
  {!hidden&&state.status==='paused'&&!cue.quiet&&<p className={styles.note}>잠시 멈췄어요. 문장을 천천히 읽고, 준비되면 이어서 해요.</p>}
  <div className={styles.controls}>
   {!hidden&&(running?<button type="button" onClick={()=>setState(s=>({...s,status:'paused'}))}>일시정지</button>:<button type="button" onClick={start}>{state.status==='paused'?'이어서 하기':ended?'다시 시작':'안내 시작'}</button>)}
   {(running||state.status==='paused')&&<button type="button" onClick={()=>setState(s=>({...s,status:'stopped'}))}>여기까지</button>}
   <button type="button" aria-pressed={hidden} onClick={toggle}>{hidden?'안내 보기':'안내 숨기기'}</button>
  </div>
  <p className={styles.note}>다른 활동으로 이동하면 안내는 끝나요. 음악과 자동 멈춤 시간은 별도로 유지돼요.</p>
 </section>;
}
