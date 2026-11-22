import SajuDashboard from './SajuDashboard';
import {NatalPillars,readChart} from './NatalPillars';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {BirthFields,emptyBirth} from './BirthFields';
import {Button} from './Button';
import TossSessionScope from './TossSessionScope';

export default function BasicSajuReading(){return <TossSessionScope><Reading/></TossSessionScope>;}
function Reading(){
  const [birth,setBirth]=useState(emptyBirth),[chart,setChart]=useState<ReturnType<typeof readChart>|null>(null),[error,setError]=useState('');
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
    <SajuDashboard pillars={chart.dashboard} lotto={chart.lotto}/>
    <Button variant="weak" display="block" onClick={()=>setChart(null)}>출생정보 다시 보기</Button>
  </section>;
}
