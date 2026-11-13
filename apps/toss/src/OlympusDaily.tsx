import {lazy,Suspense,useEffect,useState} from 'react';
import {readDailyOracle} from '../../../lib/fortune/olympus-daily.mjs';
import {Button} from './Button';

import TossSessionScope from './TossSessionScope';
const OlympusProfile=lazy(()=>import('./OlympusProfile'));
export default function OlympusDaily({profile,loggedIn,openProfile,closeProfile}:{profile:boolean;loggedIn:boolean;openProfile:()=>void;closeProfile:()=>void}){
  const [birthDate,setBirthDate]=useState('');
  const [result,setResult]=useState<ReturnType<typeof readDailyOracle>|null>(null);

  useEffect(()=>{
    if(!result)return;
    const back=(event:Event)=>{event.preventDefault();setResult(null);};
    window.addEventListener('code-destiny:toss-back',back);
    return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[result]);

  if(profile)return loggedIn?<TossSessionScope><Suspense fallback={<p role="status">신탁을 열고 있어요.</p>}><OlympusProfile onBack={closeProfile}/></Suspense></TossSessionScope>:<Button onClick={openProfile}>토스 로그인하고 내 신탁 보기</Button>;
  if(!result)return <section>
    <h1>올림푸스 오늘의 신탁</h1>
    <p>생년월일을 입력하면 별자리의 수호신이 오늘의 지령을 전해요.</p>
    <form className="form" onSubmit={event=>{event.preventDefault();setResult(readDailyOracle(birthDate));}}>
      <label>생년월일<input type="date" value={birthDate} min="1920-01-01" max="2010-12-31" required onChange={event=>setBirthDate(event.target.value)}/></label>
      <Button type="submit">신탁 듣기</Button>
    </form>
    <Button variant="weak" onClick={openProfile}>내 신탁과 커플 궁합 보기</Button>
  </section>;

  const {signInfo,element,oracle}=result;
  return <article className="paper" aria-live="polite">
    <h1>{signInfo.name}의 오늘</h1>
    <p>{signInfo.god}의 수호 · {element.faction}</p>
    <h2>{oracle.god}의 신탁</h2><p><strong>{oracle.theme}</strong></p><p>{oracle.prophecy}</p>
    <h2>오늘의 지령</h2><p>{oracle.action}</p>
    <dl><dt>행운의 색</dt><dd>{oracle.lucky}</dd><dt>행운의 수</dt><dd>{oracle.num}</dd><dt>황금 시간</dt><dd>{oracle.time}</dd></dl>
    <Button variant="weak" onClick={()=>setResult(null)}>다른 별자리 보기</Button>
  </article>;
}
