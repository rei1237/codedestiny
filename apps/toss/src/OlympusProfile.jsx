import {useEffect,useRef,useState} from 'react';
import {CSS,TabResult,calcPlacements} from '../../../OlympusVIPLounge';
import {api} from './platform';
import {Button} from './Button';

const seoul={lat:37.5665,lon:126.978,timezone:9};
const pad=value=>String(value).padStart(2,'0');
const fetchPlacements=async clock=>(await api('/olympus/placements',clock)).placements;
const loadTransit=async()=>fetchPlacements;

export default function OlympusProfile({onBack}){
 const [profiles,setProfiles]=useState([]),[profileId,setProfileId]=useState('');
 const [name,setName]=useState(''),[date,setDate]=useState(''),[time,setTime]=useState(''),[place,setPlace]=useState(seoul);
 const [result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const version=useRef(0),lock=useRef(false);
 useEffect(()=>{
  let alive=true;
  api('/canonical/yeongnyangi/profiles').then(data=>{if(alive)setProfiles(data.profiles||[]);}).catch(()=>{if(alive)setError('저장된 프로필을 불러오지 못했어요. 출생정보를 직접 입력할 수 있어요.');});
  return()=>{alive=false;version.current++;};
 },[]);
 useEffect(()=>{
  const back=event=>{event.preventDefault();version.current++;lock.current=false;setBusy(false);if(result)setResult(null);else onBack();};
  window.addEventListener('code-destiny:toss-back',back);
  return()=>window.removeEventListener('code-destiny:toss-back',back);
 },[onBack,result]);
 async function selectProfile(id){
  const revision=++version.current;
  setProfileId(id);setError('');setName('');setDate('');setTime('');setPlace(seoul);
  const profile=profiles.find(p=>(p.profileId||p.id)===id);if(!profile)return;
  const birth=profile.birth||{},loc=profile.location||{};
  let birthday=profile.birthDate||[birth.year,pad(birth.month),pad(birth.day)].join('-');
  if(String(profile.calendarType||birth.calType||'').startsWith('lunar')){
   const {lunarToSolar}=await import('../../../lib/korean-calendar');
   const [year,month,day]=birthday.split('-').map(Number);
   const solar=lunarToSolar(year,month,day,!!(profile.isLeapMonth||birth.isLeapMonth||birth.calType==='lunar_leap'||profile.calendarType==='lunar_leap'));
   if(revision!==version.current)return;
   if(!solar){setError('음력 생일을 변환하지 못했어요. 양력 생일을 입력해 주세요.');return;}
   birthday=[solar.year,pad(solar.month),pad(solar.day)].join('-');
  }
  setName(profile.name||'');setDate(birthday);
  setTime(profile.timeUnknown||birth.timeUnknown?'':profile.birthTime||(birth.hour!=null?pad(birth.hour)+':'+pad(birth.minute||0):''));
  setPlace({lat:Number(loc.lat??seoul.lat),lon:Number(loc.lng??loc.lon??seoul.lon),timezone:Number(loc.baseTzOffset??loc.tzOffset??9),...(loc.tz?{timeZone:loc.tz}:{})});
 }
 async function submit(event){
  event.preventDefault();if(lock.current)return;
  lock.current=true;const revision=++version.current;setBusy(true);setError('');
  try{
   const [year,month,day]=date.split('-').map(Number),[hour,minute]=(time||'12:00').split(':').map(Number);
   const placements=await fetchPlacements({year,month,day,hour,minute,...place});
   if(!time)delete placements.asc;
   if(revision===version.current)setResult(calcPlacements(date,time,name,null,placements));
  }catch{if(revision===version.current)setError('정밀 배치를 확인하지 못했어요. 출생정보를 확인한 뒤 다시 시도해 주세요.');}
  finally{if(revision===version.current){lock.current=false;setBusy(false);}}
 }
 if(result)return <article className="ov"><style>{CSS}</style><TabResult result={result} onReset={()=>setResult(null)} loadTransit={loadTransit}/></article>;
 return <section><h1>올림푸스의 내 신탁</h1><p>태어난 시각부터 여덟 배치를 읽고, 내 신탁에서 상대의 생일로 커플 궁합을 펼쳐요.</p>
  <form className="form" onSubmit={submit}><fieldset disabled={busy}>
   {profiles.length>0&&<label>저장된 프로필<select value={profileId} onChange={e=>void selectProfile(e.target.value)}><option value="">직접 입력</option>{profiles.map(p=><option key={p.profileId||p.id} value={p.profileId||p.id}>{p.name}</option>)}</select></label>}
   <label>이름 (선택)<input value={name} maxLength={40} onChange={e=>setName(e.target.value)}/></label>
   <label>양력 생년월일<input type="date" min="1920-01-01" max="2010-12-31" required value={date} onChange={e=>setDate(e.target.value)}/></label>
   <label>태어난 시각 (선택)<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label>
   <p>시각을 모르면 정오 기준으로 계산하며 상승궁은 원본의 근사 배치로 표시해요.</p>
   <p>{profileId?'프로필의 출생 위치와 시간대를 사용해요. 위치 정보가 없으면 서울을 기준으로 해요.':'직접 입력은 원본과 같이 서울 출생을 기준으로 계산해요.'}</p>
   <Button type="submit" loading={busy}>내 신탁 펼치기</Button>
  </fieldset></form>{error&&<p role="alert">{error}</p>}</section>;
}
