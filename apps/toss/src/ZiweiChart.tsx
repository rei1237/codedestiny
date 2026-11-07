import {useEffect,useRef,useState,type FormEvent} from 'react';
import {normalizeZiweiInput} from '@/app/_lib/normalize-ziwei-input';
import {calculateZiweiChart,normalizeZiweiForAdvancedReport,validateAdvancedZiweiResult} from '@/app/_lib/ziwei-engine';
import {validateZiweiChart} from '@/app/_lib/validate-ziwei-chart';
import type {ZiweiDeepChart} from '@/app/_lib/ziwei-types';
import ZiweiPalaceGrid from '@/app/components/ziwei/ZiweiPalaceGrid';
import {BirthFields,birthPayload,emptyBirth} from './BirthFields';
import {Button} from './Button';
import TossSessionScope from './TossSessionScope';
import {SERVICE_AVAILABLE} from './release';
import './ziwei-chart.css';

export default function ZiweiChart(){
  if(!SERVICE_AVAILABLE)return <section><h1>자미두수 명반</h1><p>출시 후 태어난 날과 시각으로 열두 궁의 별을 살펴볼 수 있어요.</p></section>;
  return <TossSessionScope><ChartForm/></TossSessionScope>;
}

function ChartForm(){
  const [birth,setBirth]=useState(emptyBirth);
  const [chart,setChart]=useState<ZiweiDeepChart|null>(null);
  const [error,setError]=useState('');
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
    setError('');
    try{
      const {date,location}=birthPayload(birth);
      const normalized=normalizeZiweiInput({
        birthYear:date.year,birthMonth:date.month,birthDay:date.day,
        birthHour:date.hour??undefined,birthMinute:date.minute??undefined,unknownHour:date.timeUnknown,
        calendarType:date.calType==='solar'?'solar':'lunar',isLeapMonth:date.calType==='lunar_leap',
        gender:birth.gender,birthPlace:location.label,timezone:location.tz,locale:'ko'
      });
      if(!normalized.input||normalized.errors.length){
        setError(normalized.errors.map(issue=>issue.message).join(' ')||'출생정보를 다시 확인해 주세요.');
        return;
      }
      const result=normalizeZiweiForAdvancedReport(calculateZiweiChart(normalized.input));
      if(!validateAdvancedZiweiResult(result).valid||!validateZiweiChart(result).valid)throw new Error('invalid chart');
      setChart({...result,warnings:[...result.warnings,...normalized.warnings]});
    }catch{setError('명반을 계산하지 못했어요. 날짜와 달력 종류를 확인해 주세요.');}
  }

  if(!chart)return <section><h1>자미두수 명반</h1><p>태어난 날과 시각을 바탕으로 열두 궁에 놓인 별을 살펴봐요. 국내 출생지를 지원해요.</p>
    <form className="form" onSubmit={submit}><BirthFields title="명반을 세울 출생정보" value={birth} onChange={value=>{setBirth(value);setError('');}}/>
      {error&&<p role="alert">{error}</p>}<Button type="submit" display="block">명반 펼치기</Button></form></section>;

  return <section className="ziwei-basic"><h1 tabIndex={-1} ref={title}>나의 자미두수 명반</h1>
    {birth.unknown&&<p className="notice">태어난 시각을 몰라 정오를 기준으로 그린 참고용 명반이에요. 실제 시각에 따라 명궁과 별의 배치가 달라질 수 있어요.</p>}
    <p>한 칸은 삶의 한 영역을 뜻하는 궁이에요. 각 칸에서 궁의 이름과 그곳에 자리한 주요 별을 읽을 수 있어요.</p>
    <ZiweiPalaceGrid className="ziwei-palaces" cells={chart.palaces} branchOf={palace=>palace.earthlyBranch}
      center={style=><div className="ziwei-center" style={style}><strong>{chart.juInfo}</strong><span>명궁 {chart.mingGong}</span></div>}
      renderCell={(palace,style)=><div className="ziwei-palace" style={style} key={palace.id}>
        <strong>{palace.name}</strong><small>{palace.earthlyBranch}</small>
        <span>{palace.mainStars.map(star=>star.name).join(' · ')||'주성 없음'}</span></div>}/>
    <p className="muted">명궁은 타고난 기질을 살펴보는 자리예요. 주성이 없는 궁은 맞은편 궁의 별을 함께 읽어요.</p>
    {!birth.unknown&&<>
      <h2>명궁으로 읽는 나의 기질</h2>
      <p>{chart.summary.direction}</p><p>{chart.summary.openingCondition}</p>
      <details><summary>시기별로 살펴볼 궁</summary>
        <p>대한은 약 10년씩 삶의 어느 영역에 주목할지 읽는 자미두수의 기준이에요.</p>
        <dl className="daily-basis">{chart.majorPeriods.map(period=>{
          const palace=chart.palaces.find(item=>item.id===period.palaceId);
          return palace&&<div key={period.palaceId}><dt>{period.range}</dt><dd>{palace.name}</dd></div>;
        })}</dl>
      </details>
    </>}
    {chart.warnings.filter(warning=>warning.code!=='MISSING_BIRTH_TIME').map((warning,index)=><p key={index}>{warning.message}</p>)}
    <Button variant="weak" display="block" onClick={()=>setChart(null)}>출생정보 다시 보기</Button>
  </section>;
}
