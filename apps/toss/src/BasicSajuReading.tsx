import PillarAlmanac from './PillarAlmanac';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {calculateNatalSaju} from '@/lib/korean-calendar/natal.js';
import {branchIndexOf,formatPillar,stemIndexOf} from '@/lib/korean-calendar/labels.js';
import {elementOfStem,elementOfBranch,tenGodOfStem,type FiveElement} from '@/lib/five-element-colors';
import {BirthFields,birthPayload,emptyBirth,type BirthInput} from './BirthFields';
import {Button} from './Button';
import TossSessionScope from './TossSessionScope';

const labels={year:'연주',month:'월주',day:'일주',hour:'시주'} as const;
function readChart(birth:BirthInput){
  const {location}=birthPayload(birth);
  if(!birth.unknown&&!birth.time)throw new Error('INVALID_BIRTH_TIME');
  const {pillars}=calculateNatalSaju({birthDate:birth.date,birthTime:birth.time,birthTimeUnknown:birth.unknown,
    calendarType:birth.calendar,birthPlace:{name:location.label,latitude:location.lat,longitude:location.lng,timezone:location.tz}});
  const elements:Record<FiveElement,number>={목:0,화:0,토:0,금:0,수:0};
  const dayStem=formatPillar(stemIndexOf(pillars.day[0]),branchIndexOf(pillars.day[1]),'hangul')[0];
  const rows=(Object.keys(labels) as (keyof typeof labels)[]).map(key=>{
    const hanja=pillars[key];
    if(!hanja)return {key,hanja:null,korean:null,relation:null};
    const korean=formatPillar(stemIndexOf(hanja[0]),branchIndexOf(hanja[1]),'hangul');
    const stem=elementOfStem(korean[0]),branch=elementOfBranch(korean[1]);
    if(!stem||!branch)throw new Error('INVALID_PILLAR');
    elements[stem]++;elements[branch]++;
    return {key,hanja,korean,relation:key==='day'?'일간':tenGodOfStem(dayStem,korean[0])};
  });
  return {rows,elements};
}
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
    <PillarAlmanac pillars={chart.rows.map(r=>({key:r.key,ganji:r.hanja,tenGod:r.relation}))} counts={chart.elements} basis="surface"
      unknownNote={birth.unknown?'태어난 시각을 몰라 시주는 비워 두었어요. 절기가 바뀌는 날에는 정오 기준으로 본 연주와 월주가 실제와 다를 수 있어요.':undefined}/>
    <Button variant="weak" display="block" onClick={()=>setChart(null)}>출생정보 다시 보기</Button>
  </section>;
}
