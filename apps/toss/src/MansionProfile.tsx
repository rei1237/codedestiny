import {useEffect,useRef,useState} from 'react';
import type {DestinyProfileCard} from '../../../app/_lib/profile-card-storage';
import {cardToFormValues} from '../../../app/nakshatra/nakshatra-birth';
import {api} from './platform';
import type {Person} from './MansionBirth';

export default function MansionProfile({onSelect,disabled=false}:{onSelect:(p:Person)=>void;disabled?:boolean}){
  const [profiles,setProfiles]=useState<DestinyProfileCard[]>([]),[error,setError]=useState(''),[retry,setRetry]=useState(0),[choosing,setChoosing]=useState(false);
  const request=useRef(0);
  useEffect(()=>{
    let live=true;setError('');
    api<{profiles:DestinyProfileCard[]}>('/canonical/yeongnyangi/profiles').then(r=>{
      if(!Array.isArray(r.profiles))throw Error();if(live)setProfiles(r.profiles);
    }).catch(()=>{if(live)setError('프로필을 불러오지 못했어요.');});
    return()=>{live=false;request.current++;};
  },[retry]);
  async function choose(id:string){
    const version=++request.current;setError('');
    const card=profiles.find(row=>String(row.profileId||row.id)===id);
    if(!card)return;
    setChoosing(true);
    try{
      const value=await cardToFormValues(card);
      if(version!==request.current)return;
      if(!value)throw Error();
      const city=value.birthPlace||'';
      const location=city&&value.latitude&&value.longitude&&value.timezone?{label:city,latitude:value.latitude,longitude:value.longitude,timezone:value.timezone}:undefined;
      const gender=String(card.gender||'').toLowerCase();
      onSelect({date:[value.year,value.month,value.day].map(n=>n.padStart(2,'0')).join('-'),time:value.timeUnknown?'':value.hour.padStart(2,'0')+':'+value.minute.padStart(2,'0'),unknown:value.timeUnknown,
        city:location?city:'',location,gender:['m','male'].includes(gender)?'male':['f','female'].includes(gender)?'female':''});
    }catch{if(version===request.current)setError('출생 정보를 확인하지 못했어요. 직접 입력해 주세요.');}
    finally{if(version===request.current)setChoosing(false);}
  }
  return <><label>저장한 출생 프로필<select disabled={disabled||choosing} value="" onChange={e=>void choose(e.target.value)}><option value="">프로필로 채우기</option>
    {profiles.map(row=><option key={row.profileId||row.id} value={row.profileId||row.id}>{row.name||'이름 없는 프로필'}</option>)}</select></label>
    {error&&<p role="alert">{error} <button type="button" onClick={()=>setRetry(n=>n+1)}>다시 확인</button></p>}</>;
}
