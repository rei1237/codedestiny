import SajuDashboard from './SajuDashboard';
import {NatalPillars,readChart} from './NatalPillars';
import {useEffect,useRef,useState,useSyncExternalStore,type FormEvent} from 'react';
import {BirthFields,emptyBirth,type BirthInput} from './BirthFields';
import {Button} from './Button';
import {getTossSessionRevision,hasTossSession,login,onTossSessionRevisionChanged} from './platform';

export default function BasicSajuReading(){
  const revision=useSyncExternalStore(onTossSessionRevisionChanged,getTossSessionRevision,getTossSessionRevision);
  const [resume,setResume]=useState<{revision:number;birth:BirthInput}|null>(null);
  const initial=resume?.revision===revision?resume.birth:null;
  useEffect(()=>{if(resume&&resume.revision!==revision)setResume(null);},[resume,revision]);
  async function loginWithBirth(birth:BirthInput){
    if(hasTossSession())return;
    await login();
    setResume({revision:getTossSessionRevision(),birth});
  }
  return <Reading key={revision+(initial?'-resume':'-new')} initial={initial} loginWithBirth={loginWithBirth}/>;
}
function Reading({initial,loginWithBirth}:{initial:BirthInput|null;loginWithBirth:(birth:BirthInput)=>Promise<void>}){
  const [birth,setBirth]=useState(()=>initial||emptyBirth()),[chart,setChart]=useState<ReturnType<typeof readChart>|null>(()=>initial?readChart(initial):null),[error,setError]=useState('');
  const title=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{
    if(!chart)return;
    title.current?.focus();
    const back=(event:Event)=>{event.preventDefault();setChart(null);};
    window.addEventListener('code-destiny:toss-back',back);
    return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[chart]);
  function submit(event:FormEvent){
    event.preventDefault();
    try{setChart(readChart(birth));setError('');}
    catch{setError('명식을 계산하지 못했어요. 출생 날짜와 시각, 음력이라면 윤달 여부를 확인해 주세요.');}
  }
  if(!chart)return <section><h1>기본 사주</h1><p>태어난 해·달·날·시각을 네 기둥으로 펼쳐요. 국내 출생지를 기준으로 계산해요.</p>
    <form className="form" onSubmit={submit}><BirthFields title="명식을 세울 출생정보" showGender={false} value={birth} onChange={value=>{setBirth(value);setError('');}}/>
    {error&&<p role="alert">{error}</p>}<Button type="submit" display="block">나의 명식 보기</Button></form></section>;
  return <section className="manse-result"><h1 ref={title} tabIndex={-1}>나의 기본 사주</h1>
    <NatalPillars chart={chart} unknown={birth.unknown}/>
    <SajuDashboard pillars={chart.dashboard} lotto={chart.lotto} layerBirth={chart.layerBirth} onBrainLogin={()=>loginWithBirth(birth)} initialBrain={!!initial}/>
    <Button variant="weak" display="block" onClick={()=>setChart(null)}>출생정보 다시 보기</Button>
  </section>;
}
