import {useEffect,useRef,useState,type FormEvent} from 'react';
import {calculateNatalSaju} from '@/lib/korean-calendar/natal.js';
import almanac from 'virtual:toss-animal-almanac';
import {BirthFields,birthPayload,emptyBirth,type BirthInput} from './BirthFields';
import {Button} from './Button';
import TossSessionScope from './TossSessionScope';

function chart(birth:BirthInput){
  const {location}=birthPayload(birth);
  if(!birth.unknown&&!birth.time)throw new Error('INVALID_BIRTH_TIME');
  const {pillars}=calculateNatalSaju({birthDate:birth.date,birthTime:birth.time,birthTimeUnknown:birth.unknown,
    calendarType:birth.calendar,birthPlace:{name:location.label,latitude:location.lat,longitude:location.lng,timezone:location.tz}});
  const table=almanac.stages[pillars.day[0]];
  const names={year:'연주',month:'월주',day:'일주',hour:'시주'} as const;
  const rows=(Object.keys(names) as (keyof typeof names)[]).map(key=>{
    const ganji=pillars[key],stage=ganji&&table?.[ganji[1]];
    if(!stage&&!(key==='hour'&&birth.unknown))throw new Error('UNKNOWN_STAGE');
    return {key,label:names[key],ganji,stage};
  });
  // As in getPrimaryAnimalStage, a valid day pillar is the representative stage.
  const animal=almanac.catalog.find(entry=>entry.stage===rows.find(row=>row.key==='day')?.stage);
  if(!animal)throw new Error('UNKNOWN_ANIMAL');
  return {rows,animal};
}
export default function AnimalDestiny(){return <TossSessionScope><Reading/></TossSessionScope>;}
function Reading(){
  const [birth,setBirth]=useState(emptyBirth),[result,setResult]=useState<ReturnType<typeof chart>|null>(null),[error,setError]=useState('');
  const [dex,setDex]=useState(false);const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{
    if(!result)return;
    heading.current?.focus();
    const back=(event:Event)=>{event.preventDefault();if(dex)setDex(false);else setResult(null);};
    window.addEventListener('code-destiny:toss-back',back);return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[result,dex]);
  function submit(event:FormEvent){event.preventDefault();try{setResult(chart(birth));setDex(false);setError('');}
    catch{setError('날짜와 시각을 확인해 주세요. 음력이라면 윤달 여부도 확인해 주세요.');}}
  if(!result)return <section><h1>십이운성 동물점</h1><p>태어난 날의 일간과 지지가 만나는 자리를 열두 성장 단계에 비추어, 나의 운성을 상징하는 동물을 찾아요.</p>
    <form className="form" onSubmit={submit}><BirthFields showGender={false} title="동물을 찾을 출생정보" value={birth} onChange={v=>{setBirth(v);setError('');}}/>
    {error&&<p role="alert">{error}</p>}<Button type="submit" display="block">나의 동물 찾기</Button></form></section>;
  if(dex)return <section><h1 tabIndex={-1} ref={heading}>열두 동물 도감</h1><dl className="daily-basis">
    {almanac.catalog.map(entry=><div key={entry.stage}><dt>{entry.stage} · {entry.hanja}</dt><dd>{entry.name}{entry.stage===result.animal.stage?' · 나의 동물':''}</dd></div>)}</dl>
    <Button display="block" variant="weak" onClick={()=>setDex(false)}>나의 동물로 돌아가기</Button></section>;
  return <section><h1 ref={heading} tabIndex={-1}>{result.animal.name}</h1><p>나의 일주에 해당하는 운성은 {result.animal.stage}({result.animal.hanja})예요.</p>
    <h2>네 기둥의 운성</h2><dl className="daily-basis">{result.rows.map(row=><div key={row.key}><dt>{row.label}</dt><dd>{row.stage?row.ganji+' · '+row.stage:'시각 미상'}</dd></div>)}</dl>
    {birth.unknown&&<p>태어난 시각을 몰라 시주의 운성은 표시하지 않았어요. 절기가 바뀌는 날에는 월주가 달라질 수 있어요.</p>}
    <Button display="block" onClick={()=>setDex(true)}>열두 동물 도감 보기</Button>
    <Button variant="weak" display="block" onClick={()=>setResult(null)}>출생정보 다시 보기</Button></section>;
}
