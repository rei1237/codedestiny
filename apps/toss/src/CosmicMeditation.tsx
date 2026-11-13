import {useEffect,useMemo,useRef,useState} from 'react';
import {getCourse,ACTION_CODES,ACTION_DESCS,JOURNAL_PROMPTS,R2_TRACK_GROUPS} from 'virtual:toss-cosmic-sessions';
import {Button} from './Button';
import {api} from './platform';
import TossSessionScope from './TossSessionScope';

const intentions={wealth:'부의 렌더링',clarity:'정신 명료화',love:'관계 인력장',health:'휴식의 감각'};
const sounds={mystic:'별빛 사원',healing:'고요한 성소',deep:'깊은 밤'};
type Entry={date:string;intent:string;mode:number;text:string};
type RecordBook={sessions:number;minutes:number;streak:number;lastDate:string;entries:Entry[]};
const empty:RecordBook={sessions:0,minutes:0,streak:0,lastDate:'',entries:[]};

function Practice({owner}:{owner:string}){
  const key='toss.cosmic.v1.'+encodeURIComponent(owner);
  const [book,setBook]=useState<RecordBook>(()=>{try{return JSON.parse(localStorage.getItem(key)||'null')||empty;}catch{return empty;}});
  const [intent,setIntent]=useState('wealth');
  const [minutes,setMinutes]=useState(0);
  const [stage,setStage]=useState<'input'|'practice'|'completion'>('input');
  const [elapsed,setElapsed]=useState(0);
  const [paused,setPaused]=useState(false);
  const [journal,setJournal]=useState('');
  const [saved,setSaved]=useState(false);
  const [error,setError]=useState('');
  const [preset,setPreset]=useState('mystic');
  const [track,setTrack]=useState(0);
  const activeMs=useRef(0);
  const ended=useRef(false);
  const player=useRef<HTMLAudioElement>(null);
  const course=useMemo(()=>getCourse(minutes,intent),[minutes,intent]);
  const line=course.messages.filter(item=>item.at<=elapsed).at(-1)!;
  const phase=course.phases[line.phaseIdx];
  const tracks=R2_TRACK_GROUPS[preset];
  function store(next:RecordBook){
    try{localStorage.setItem(key,JSON.stringify(next));setBook(next);setError('');return true;}
    catch{setError('기기에 기록을 저장하지 못했어요.');return false;}
  }
  function finish(){
    if(ended.current)return;
    ended.current=true;
    const today=new Date().toISOString().slice(0,10);
    const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    store({...book,sessions:book.sessions+1,minutes:book.minutes+minutes,lastDate:today,streak:book.lastDate===today?book.streak:book.lastDate===yesterday?book.streak+1:1});
    setStage('completion');
  }
  useEffect(()=>{
    if(stage!=='practice'||paused)return;
    const start=performance.now();
    const timer=window.setInterval(()=>setElapsed(Math.min(minutes*60,Math.floor((activeMs.current+performance.now()-start)/1000))),1000);
    return ()=>{window.clearInterval(timer);activeMs.current+=performance.now()-start;};
  },[stage,paused,minutes]);
  useEffect(()=>{if(stage==='practice'&&elapsed>=minutes*60)finish();},[stage,elapsed,minutes]);
  useEffect(()=>{if(paused)player.current?.pause();},[paused]);
  useEffect(()=>{
    if(stage==='input')return;
    const back=(event:Event)=>{event.preventDefault();setStage('input');};
    window.addEventListener('code-destiny:toss-back',back);
    return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[stage]);
  function start(value:number){ended.current=false;activeMs.current=0;setElapsed(0);setPaused(false);setJournal('');setSaved(false);setError('');setMinutes(value);setStage('practice');}
  if(stage==='practice')return <section><h1>{minutes}분 코스믹 명상</h1><article className="paper"><h2>{phase.label}</h2><p>{phase.freq} · {Math.floor(elapsed/60)}분 {elapsed%60}초</p><progress aria-label="명상 진행" value={elapsed} max={minutes*60}/><p>{line.text}</p></article>
    <div className="form"><Button onClick={()=>setPaused(value=>!value)}>{paused?'재개':'일시정지'}</Button><label>음악 선택<select value={preset} onChange={event=>{setPreset(event.target.value);setTrack(0);}}>{Object.entries(sounds).map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label>
    <span>{tracks[track%tracks.length]}</span><audio controls loop preload="none" ref={player} style={{width:'100%'}} aria-label="명상 음악" src={'https://music.code-destiny.com/Meditation/'+encodeURIComponent(tracks[track%tracks.length]+'.mp3')}/><Button variant="weak" onClick={()=>setTrack(n=>n+1)}>다음 곡</Button><Button variant="weak" onClick={finish}>세션 종료하기</Button></div></section>;
  if(stage==='completion')return <section><h1>명상 기록</h1><article className="paper"><h2>{ACTION_CODES[intent]}</h2><p>{ACTION_DESCS[intent]}</p></article><div className="form"><label>코스믹 저널<p>{JOURNAL_PROMPTS[intent]}</p><textarea value={journal} disabled={saved} onChange={event=>setJournal(event.target.value)}/></label>
    <Button disabled={saved||!journal.trim()} onClick={()=>{const entry={date:new Date().toISOString(),intent,mode:minutes,text:journal.trim()};if(store({...book,entries:[entry,...book.entries].slice(0,50)}))setSaved(true);}}>{saved?'저장됨':'저널 저장하기'}</Button>{error&&<p role="alert">{error}</p>}<Button variant="weak" onClick={()=>setStage('input')}>처음으로 돌아가기</Button></div></section>;
  return <section><h1>코스믹 소울 명상</h1><p>지금까지 {book.sessions}회 · {book.minutes}분 · 연속 {book.streak}일</p><div className="form"><label>오늘의 명상 의도<select value={intent} onChange={event=>setIntent(event.target.value)}>{Object.entries(intentions).map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label>{[30,60].map(value=><Button key={value} onClick={()=>start(value)}>{value}분 명상 시작하기</Button>)}</div>
    {book.entries.length>0&&<details className="paper"><summary>저장한 명상 저널</summary>{book.entries.map((entry,i)=><article key={i}><h3>{entry.date.slice(0,10)} · {entry.mode}분</h3><p style={{whiteSpace:'pre-line'}}>{entry.text}</p></article>)}</details>}</section>;
}
function OwnedPractice(){
  const [owner,setOwner]=useState(''),[error,setError]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{let live=true;setError(false);api<{user:{id:string}}>('/canonical/auth/me').then(data=>{if(!data.user?.id)throw Error();if(live)setOwner(data.user.id);}).catch(()=>{if(live)setError(true);});return ()=>{live=false;};},[retry]);
  if(error)return <div role="alert">계정을 확인하지 못했어요. <Button onClick={()=>setRetry(n=>n+1)}>다시 확인하기</Button></div>;
  return owner?<Practice key={owner} owner={owner}/>:<p role="status">계정을 확인하고 있어요.</p>;
}
export default function CosmicMeditation({loggedIn,onLogin}:{loggedIn:boolean;onLogin:()=>void}){
  return loggedIn?<TossSessionScope><OwnedPractice/></TossSessionScope>:<section><h1>코스믹 소울 명상</h1><p>로그인하고 오늘의 명상 의도를 선택해 주세요.</p><Button onClick={onLogin}>토스 로그인하고 명상하기</Button></section>;
}
