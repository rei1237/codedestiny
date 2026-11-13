import {useEffect,useRef,useState,type FormEvent} from 'react';
import {useAuthStore} from '@/app/_lib/auth-store';
import SavedBirthProfilePicker from '@/app/components/SavedBirthProfilePicker';
import {resolveAnimalTwelveResult} from '@/app/saju/animal-destiny/lib/sajuAdapter';
import type {AnimalDestinyInput} from '@/app/saju/animal-destiny/lib/types';
import {generateDestinyMeetingPlaceResult} from '@/components/fortune/destiny-meeting-place/destinyMeetingPlaceEngine';
import DestinyMeetingPlaceResult from '@/components/fortune/destiny-meeting-place/DestinyMeetingPlaceResult';
import {Button} from '../src/Button';

const empty = ():AnimalDestinyInput=>({birthDate:'',birthTime:'',gender:'unknown',calendarType:'solar',lunarLeap:false});
function MeetingForm() {
  const [input,setInput]=useState(empty);
  const [report,setReport]=useState<ReturnType<typeof generateDestinyMeetingPlaceResult>|null>(null);
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const revision=useRef(0);
  useEffect(()=>()=>{revision.current++;},[]);
  useEffect(()=>{
    if(!report)return;
    const back=(event:Event)=>{if(!event.defaultPrevented){event.preventDefault();setReport(null);}};
    window.addEventListener('code-destiny:toss-back',back);
    return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[report]);

  async function read(event:FormEvent) {
    event.preventDefault();
    if(busy)return;
    const ticket=++revision.current;
    setBusy(true);setNotice('');
    try {
      const saju=await resolveAnimalTwelveResult(input);
      if(ticket!==revision.current)return;
      if(!saju.ok||!saju.sajuResult)throw Error(saju.error||'출생정보를 확인해 주세요.');
      setReport(generateDestinyMeetingPlaceResult(saju.sajuResult));
      window.scrollTo(0,0);
    } catch(error) {
      if(ticket===revision.current)setNotice(error instanceof Error?error.message:'출생정보를 확인하고 다시 시도해 주세요.');
    } finally {if(ticket===revision.current)setBusy(false);}
  }
  if(report)return <><DestinyMeetingPlaceResult result={report}/><Button variant="weak" onClick={()=>setReport(null)}>출생정보 다시 보기</Button></>;
  return <form className="form floral-form" onSubmit={read}><h1>운명의 인연 장소</h1>
    <p>태어난 날의 사주로 인연을 만나기 좋은 장소와 그곳에서 해볼 행동을 살펴보세요.</p>
    <SavedBirthProfilePicker disabled={busy} onSelect={seed=>setInput({name:seed.name||'',birthDate:seed.birthDate||'',birthTime:seed.birthTimeUnknown?'':seed.birthTime||'',gender:seed.gender==='male'||seed.gender==='female'?seed.gender:'unknown',calendarType:seed.calendarType||'solar',lunarLeap:Boolean(seed.isLeapMonth)})}/>
    <fieldset disabled={busy}><legend>출생정보</legend>
      <label>생년월일<input required type="date" value={input.birthDate} onChange={e=>setInput({...input,birthDate:e.target.value})}/></label>
      <label>태어난 시각 <small>모르면 비워 두세요</small><input type="time" value={input.birthTime||''} onChange={e=>setInput({...input,birthTime:e.target.value})}/></label>
      <label>달력<select aria-label="달력" value={input.lunarLeap?'leap':input.calendarType} onChange={e=>setInput({...input,calendarType:e.target.value==='solar'?'solar':'lunar',lunarLeap:e.target.value==='leap'})}><option value="solar">양력</option><option value="lunar">음력 평달</option><option value="leap">음력 윤달</option></select></label>
      <label>성별<select aria-label="성별" value={input.gender} onChange={e=>setInput({...input,gender:e.target.value as AnimalDestinyInput['gender']})}><option value="unknown">선택 안 함</option><option value="female">여성</option><option value="male">남성</option></select></label>
    </fieldset>
    <Button type="submit" disabled={busy}>{busy?'인연의 장소를 찾고 있어요':'인연의 장소 분석 시작'}</Button>
    {notice&&<p role="alert">{notice}</p>}
  </form>;
}
export default function TossMeetingPlace(){
  const auth=useAuthStore(),owner=auth.user?.id||auth.user?.userId||auth.user?._id||auth.user?.uid;
  if(!auth.isAuthenticated||!owner)return <section className="form floral-form"><h1>운명의 인연 장소</h1><p>토스로 로그인하면 내 출생정보로 인연의 장소를 읽을 수 있어요.</p><Button onClick={()=>location.assign('/login/?next=%2Fsaju%2Fdestiny-meeting-place%2F')}>토스로 로그인하기</Button></section>;
  return <MeetingForm key={String(owner)}/>;
}
