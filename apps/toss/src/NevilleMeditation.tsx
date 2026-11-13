import {useEffect,useRef,useState} from 'react';
import {COURSES,THETA_PRESETS,R2_MEDITATION_BASE,type Course} from 'virtual:toss-neville-courses';
import TossSessionScope from './TossSessionScope';
import {Button} from './Button';

const clock=(seconds:number)=>Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');

function Session({course,onClose}:{course:Course;onClose:()=>void}){
  const [elapsed,setElapsed]=useState(0);
  const [paused,setPaused]=useState(false);
  const [preset,setPreset]=useState('mystic');
  const [trackOffset,setTrackOffset]=useState(0);
  const player=useRef<HTMLAudioElement>(null);
  const activeMs=useRef(0);
  const done=elapsed>=course.dur;
  const phaseIndex=Math.max(0,course.phases.findIndex(phase=>phase.start<=elapsed&&phase.end>elapsed));
  const phase=course.phases[phaseIndex];
  const guidance=course.msgs.filter(message=>message.t<=elapsed).at(-1);
  const tracks=THETA_PRESETS[preset].tracks;
  const track=tracks[(phaseIndex+trackOffset)%tracks.length];

  useEffect(()=>{
    if(paused||done)return;
    const started=performance.now();
    const update=()=>setElapsed(Math.min(course.dur,Math.floor((activeMs.current+performance.now()-started)/1000)));
    const timer=window.setInterval(update,1000);
    return ()=>{window.clearInterval(timer);activeMs.current+=performance.now()-started;};
  },[paused,done,course]);
  useEffect(()=>{
    const back=(event:Event)=>{event.preventDefault();onClose();};
    window.addEventListener('code-destiny:toss-back',back);
    return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[onClose]);
  useEffect(()=>{if(paused)player.current?.pause();},[paused]);
  if(done)return <section className="paper"><h1>씨앗은 심어졌습니다</h1><p>{course.dur/60}분 명상을 마쳤어요.</p><Button onClick={onClose}>처음으로 돌아가기</Button></section>;
  return <section><h1>{course.dur/60}분 명상</h1>
    <article className="paper"><h2>{phase.name}</h2><p>{clock(elapsed)} / {clock(course.dur)}</p>
      <progress aria-label="명상 진행" value={elapsed} max={course.dur}/>
      <p style={{whiteSpace:'pre-line'}}>{guidance?.tx}</p>
      <Button onClick={()=>setPaused(value=>!value)}>{paused?'계속하기':'일시정지'}</Button>
    </article>
    <div className="form"><label>배경 음악<select value={preset} onChange={event=>{setPreset(event.target.value);setTrackOffset(0);}}>{Object.entries(THETA_PRESETS).map(([key,item])=><option key={key} value={key}>{item.title}</option>)}</select></label>
      <span>{track.label}</span><audio controls loop preload="none" ref={player} aria-label={track.label} style={{width:'100%',maxWidth:'100%'}} src={R2_MEDITATION_BASE+encodeURIComponent(track.title+'.mp3')}/>
      <Button variant="weak" onClick={()=>setTrackOffset(index=>index+1)}>다음 곡</Button>
      <Button variant="weak" onClick={onClose}>명상 마치기</Button>
    </div>
  </section>;
}

function Courses(){
  const [minutes,setMinutes]=useState(0);
  if(minutes)return <Session course={COURSES[minutes]} onClose={()=>setMinutes(0)}/>;
  return <section><h1>네빌 명상 실습</h1><p>호흡을 가다듬고 원하는 장면을 떠올리는 시간을 골라보세요.</p>
    {Object.entries(COURSES).map(([key,course])=><article className="paper" key={key}><h2>{key}분 코스</h2><p>{course.phases.map(phase=>phase.name).join(' · ')}</p><Button onClick={()=>setMinutes(Number(key))}>{key}분 명상 시작하기</Button></article>)}
  </section>;
}
export default function NevilleMeditation({loggedIn,onLogin}:{loggedIn:boolean;onLogin:()=>void}){
  if(!loggedIn)return <section><h1>네빌 명상 실습</h1><p>로그인하면 30분과 60분 명상 코스를 선택할 수 있어요.</p><Button onClick={onLogin}>토스 로그인하고 명상하기</Button></section>;
  return <TossSessionScope><Courses/></TossSessionScope>;
}
