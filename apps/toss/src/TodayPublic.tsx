import {useEffect,useMemo,useState} from 'react';
import {SIGN_PROFILES} from '@/lib/fortune/sign-profiles';
import {loadMonthRange,loadWeekRange} from '@/lib/fortune/range-data';
import {averageScores,computeSignScore} from '@/lib/fortune/fortune-score';
import {getPeriodReading} from '@/lib/fortune/period-readings';
import {kstDay} from '@/lib/tarot/daily-three.mjs';
import {TAROT_CARDS} from '@/lib/tarot/tarot-cards.mjs';
import {yeongnyangiCardArt} from '@/lib/tarot/yeongnyangi-deck';
import DailyTarot from '@/app/today/DailyTarot';
import {api} from './platform';
import TossSessionScope from './TossSessionScope';
import {Button} from './Button';
import TodayPersonal from './TodayPersonal';

const cards=TAROT_CARDS.filter(card=>card.arcana==='major').map((card,id)=>{
  const image=yeongnyangiCardArt(card.code,'ko').src;
  return {id,name:card.nameKo,code:card.code,thumb:image,image,fallback:image};
});

function SignedInTarot(){
  const [owner,setOwner]=useState('');
  const [failed,setFailed]=useState(false);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let live=true;
    api<{user:{id:string}}>('/canonical/auth/me').then(data=>{
      if(!data.user?.id)throw new Error('ACCOUNT_REQUIRED');
      if(live)setOwner(data.user.id);
    }).catch(()=>{if(live)setFailed(true);});
    return ()=>{live=false;};
  },[retry]);
  if(failed)return <p role="alert">계정을 확인하지 못했어요. <Button onClick={()=>{setFailed(false);setRetry(value=>value+1);}}>다시 확인하기</Button></p>;
  return owner?<DailyTarot key={owner} cards={cards} tossOwner={owner}/>:<p role="status">오늘의 카드를 열고 있어요.</p>;
}

export default function TodayPublic({loggedIn,onLogin}:{loggedIn:boolean;onLogin:()=>void}){
  const [sign,setSign]=useState(SIGN_PROFILES[0].id);
  const [period,setPeriod]=useState<'today'|'tomorrow'|'weekly'|'monthly'>('today');
  const [day,setDay]=useState(()=>kstDay());
  useEffect(()=>{
    const refresh=()=>setDay(kstDay());
    const timer=window.setInterval(refresh,60000);
    window.addEventListener('focus',refresh);
    return ()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);};
  },[]);
  const profile=SIGN_PROFILES.find(item=>item.id===sign)!;
  const date=period==='tomorrow'?new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10):day;
  const week=useMemo(()=>loadWeekRange(date),[date]);
  const month=useMemo(()=>period==='monthly'?loadMonthRange(date):null,[period,date]);
  const scores=useMemo(()=>week.days.map(cell=>computeSignScore(profile,cell)),[week,profile]);
  const index=week.days.findIndex(cell=>cell.ymd===date);
  const score=month?computeSignScore(profile,{ganji:month.monthGanji,moonPhase:month.moonPhase,moonSign:month.moonSign,ymd:month.anchorYmd}):period==='weekly'?averageScores(scores):scores[index];
  return <section className="today-public">
    <h1>연이의 오늘 운세</h1>
    <p>별자리나 띠를 골라 오늘과 내일의 흐름을 살펴보세요.</p>
    <div className="form"><label>별자리·띠<select value={sign} onChange={event=>setSign(event.target.value)}>
      {(['zodiac','animal'] as const).map(kind=><optgroup key={kind} label={kind==='zodiac'?'별자리':'띠'}>{SIGN_PROFILES.filter(p=>p.kind===kind).map(p=><option key={p.id} value={p.id}>{p.nameKo}</option>)}</optgroup>)}
    </select></label><label>살펴볼 기간<select value={period} onChange={event=>setPeriod(event.target.value as typeof period)}>
      <option value="today">오늘</option><option value="tomorrow">내일</option><option value="weekly">이번 주</option><option value="monthly">이번 달</option>
    </select></label></div>
    <article className="paper" aria-live="polite"><h2>{profile.nameKo}의 {month?'이번 달':period==='weekly'?'한 주':period==='today'?'오늘':'내일'}</h2>
      <p>{month?month.year+'년 '+month.month+'월':period==='weekly'?week.start+' ~ '+week.end:date} · 총운 {score.overall}/10</p>
      <p>{getPeriodReading(profile.id,period,profile.reading)}</p>
      {month?<dl><dt>월건</dt><dd>{month.monthGanji}</dd><dt>절기 구간</dt><dd>{month.termFrom?.name} {month.termFrom?.ymd} ~ {month.termTo?.name} {month.termTo?.ymd}</dd><dt>신월</dt><dd>{month.newMoonYmd}</dd><dt>보름</dt><dd>{month.fullMoonYmd}</dd></dl>:period==='weekly'?<ul>{week.days.map((cell,i)=><li key={cell.ymd}>{cell.weekdayKo}요일 · {cell.ymd.slice(5)} · {cell.ganji} · 총운 {scores[i].overall}/10</li>)}</ul>:<>
        <p>연애 {score.love}/10 · 재물 {score.money}/10 · 일 {score.work}/10 · 건강 {score.health}/10</p>
        <details><summary>오늘의 점수를 읽는 근거</summary><ul>{scores[index].basis.map(axis=><li key={axis.label}>{axis.label} · {axis.value}</li>)}</ul></details>
      </>}
    </article>
    {(period==='today'||period==='tomorrow')&&(loggedIn?<TossSessionScope><TodayPersonal period={period} day={day}/></TossSessionScope>:<section className="paper"><h2>{period==='today'?'오늘':'내일'}의 네 가지 흐름</h2><p>사주 일진, 숙요, 베다점, 수비학으로 날짜의 흐름을 읽고 내 프로필과 비교해 보세요.</p><Button onClick={onLogin}>로그인하고 무료 운세 보기</Button></section>)}
    {period==='today'&&(loggedIn?<TossSessionScope><SignedInTarot/></TossSessionScope>:<section className="paper"><h2>오늘의 세 장</h2><p>오늘의 마음, 마주할 흐름, 작은 실천을 카드 세 장으로 읽어요.</p><Button onClick={onLogin}>토스 로그인하고 카드 펼치기</Button></section>)}
  </section>;
}
