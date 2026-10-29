import {useState, type FormEvent} from 'react';
import {TextField} from '@toss/tds-mobile';
import {Button} from './Button';
import {listRosterGroups,listGroupMembers,resolvePartner,type CalendarType} from '../../../lib/idol-chemi/index.js';
import {buildChemiReport,BIAS_MOODS,type ChemiReport} from '../../../app/saju/destiny-bias/engine/chemiReportBridge';
import ChemiCoreCard from '../../../app/saju/destiny-bias/components/chemi/ChemiCoreCard';
import {PHOTOCARD_THEMES} from '../../../app/saju/destiny-bias/components/chemi/PhotocardFace';
import BiasReport from './BiasReport';
import BiasExport from './BiasExport';

// The web and Toss clients import the same deterministic engine and roster.
// Birth information stays in component memory; it is never an analytics parameter.
export default function BiasReading(){
  const groups=listRosterGroups();
  const [group,setGroup]=useState(groups[0]?.id||'');
  const members=listGroupMembers(group);
  const [member,setMember]=useState(members[0]?.id||'');
  const [date,setDate]=useState('');
  const [calendar,setCalendar]=useState<CalendarType>('solar');
  const [reading,setReading]=useState<ChemiReport|null>(null);
  const [mood,setMood]=useState<string>(BIAS_MOODS[0]);
  const [theme,setTheme]=useState<string>(PHOTOCARD_THEMES[0].key);
  const [error,setError]=useState('');
  function submit(e:FormEvent){
    e.preventDefault();setError('');
    try{
      const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      const partner=resolvePartner({kind:'roster',id:member});
      if(!partner)throw new Error('IDOL_CHEMI_PARTNER_INVALID');
      const next=buildChemiReport({user:{birthDate:date,calendarType:calendar},partner,moods:{biasMood:mood},referenceDate:today});
      setReading(next);
    }catch(error){
      setReading(null);
      const code=error instanceof Error?error.message:'';
      setError(code==='IDOL_CHEMI_USER_UNDER_CONSENT_AGE'?'만 14세 이상부터 이용할 수 있어요.':'출생일과 양력·음력 선택을 확인해 주세요. 지원 범위 밖의 날짜는 계산할 수 없어요.');
    }
  }
  return <section className="bias-reading">
    <img className="feature-cover" src="/assets/bias-stage.webp" width="1536" height="864" alt="별빛 아래 펼쳐진 가상의 아이돌 무대"/>
    <h1>내 최애와 나,<br/>어떤 케미일까요?</h1>
    <p>공개된 최애의 생일과 내 생일로 서로 다른 기질과 응원의 방식을 살펴봐요.</p>
    <p className="muted">생일로 살펴보는 기질 해석이에요. 실제 관계나 상대의 마음을 예측하는 결과는 아니에요.</p>
    <form className="form" onSubmit={submit}>
      <label>그룹<select value={group} onChange={e=>{setGroup(e.target.value);setMember(listGroupMembers(e.target.value)[0]?.id||'');setReading(null);}}>{groups.map(g=><option key={g.id} value={g.id}>{g.nameKo}</option>)}</select></label>
      <label>최애<select value={member} onChange={e=>{setMember(e.target.value);setReading(null);}}>{members.map(m=><option key={m.id} value={m.id}>{m.displayName}</option>)}</select></label>
      <TextField variant="box" label="내 생일" labelOption="sustain" type="text" inputMode="numeric" placeholder="1990-05-15" required value={date} onChange={e=>{setDate(e.target.value);setReading(null);}}/>
      <label>달력<select value={calendar} onChange={e=>{setCalendar(e.target.value as CalendarType);setReading(null);}}><option value="solar">양력</option><option value="lunar">음력 평달</option><option value="lunar_leap">음력 윤달</option></select></label>
      <label>최애의 분위기<select value={mood} onChange={e=>{setMood(e.target.value);setReading(null);}}>{BIAS_MOODS.map(value=><option key={value}>{value}</option>)}</select></label>
      <p className="muted">출생 시각은 양쪽 모두 사용하지 않아요. 입력한 생일은 이 화면에서 계산하며 서버나 기기 저장소에 남기지 않아요.</p>
      {error&&<p role="alert" className="notice">{error}</p>}
      <Button type="submit" display="block">케미 살펴보기</Button>
    </form>
    {reading&&<article className="chapter" aria-live="polite">
      <p className="eyebrow">{resolvePartner({kind:'roster',id:member})?.displayName} · {reading.result.chemiTypeNameKo}</p>
      <h2>{reading.copy.title}</h2><p className="answer">{reading.copy.oneLiner}</p>
      <label>포토카드 테마<select value={theme} onChange={e=>setTheme(e.target.value)}>{PHOTOCARD_THEMES.map(value=><option key={value.key} value={value.key}>{value.label}</option>)}</select></label>
      <ChemiCoreCard report={reading} themeKey={theme}/>
      <p className="muted">카드의 점수는 기존 최애운명 계산 규칙으로 표현한 기질 지표예요. 실제 관계가 이루어질 확률이나 상대의 마음을 뜻하지 않아요.</p>
      <BiasExport key={`${reading.serial}-${theme}`} report={reading} theme={theme}/>
      <BiasReport report={reading}/>
      {reading.copy.points.map(point=><section key={point.label}><h3>{point.label}</h3><p>{point.text}</p><p className="muted">{point.evidenceKo}</p></section>)}
      <h3>{reading.copy.scenario.label}</h3><p>{reading.copy.scenario.setting}</p><p>{reading.copy.scenario.text}</p>
      <h3>{reading.copy.caution.label}</h3><p>{reading.copy.caution.text}</p><p className="muted">{reading.copy.caution.evidenceKo}</p>
      <h3>{reading.copy.finish.label}</h3><p>{reading.copy.finish.text}</p>
      <details><summary>계산 근거와 한계</summary><p>내 명식: {reading.result.pillars.user.year.ganji} · {reading.result.pillars.user.month.ganji} · {reading.result.pillars.user.day.ganji}</p><p>최애 명식: {reading.result.pillars.partner.year.ganji} · {reading.result.pillars.partner.month.ganji} · {reading.result.pillars.partner.day.ganji}</p>{reading.result.dataGaps.map(v=><p key={v}>{v}</p>)}{reading.copy.notices.map(v=><p key={v}>{v}</p>)}<p className="muted">계산 버전 {reading.result.engineVersion} · 문구 버전 {reading.copy.copyVersion}</p></details>
    </article>}
  </section>;
}
