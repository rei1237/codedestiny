import {useEffect,useRef,useState} from 'react';
import {normalizeDestinyProfileCard} from '../../../app/_lib/profile-card-storage';
import {selectedBirthProfileSeed} from '../../../app/_lib/ai-prefill-seed';
import type {GuideApi} from '../../../app/human-design/_lib/guide-access';
import type {HdChart} from '../../../app/human-design/_lib/types';
import {api} from './platform';
import {Button} from './Button';
export type HumanDesignBirth={birthDate:string;birthTime:string;timezone:string;calendar:'solar'|'lunar'|'lunar-leap'};
type Profile={id:string;name:string;birth:HumanDesignBirth};
function profilesOf(values:unknown):Profile[]{
 if(!Array.isArray(values))return [];
 return values.flatMap(raw=>{const card=normalizeDestinyProfileCard(raw);if(!card)return [];const seed=selectedBirthProfileSeed(card);
  if(!seed.profileId||!seed.birthDate||seed.birthTimeUnknown||!seed.birthTime||!seed.timezone)return [];
  return [{id:seed.profileId,name:seed.name||'저장 프로필',birth:{birthDate:seed.birthDate,birthTime:seed.birthTime,timezone:seed.timezone,calendar:seed.calendarType==='lunar'?(seed.isLeapMonth?'lunar-leap':'lunar'):'solar'} as HumanDesignBirth}];
 });
}
const sameBirth=(a:HumanDesignBirth,b:HumanDesignBirth)=>a.birthDate===b.birthDate&&a.birthTime===b.birthTime&&a.timezone===b.timezone&&a.calendar===b.calendar;
export default function HumanDesignProfile({birth,chart,onSelect,onGuide,request=api}:{birth:HumanDesignBirth;chart:HdChart|null;onSelect:(birth:HumanDesignBirth)=>void;onGuide:(guide:GuideApi|null)=>void;request?:typeof api}){
 const [profiles,setProfiles]=useState<Profile[]>([]),[selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const revision=useRef(0);
 useEffect(()=>()=>{revision.current++;},[]);
 async function readProfiles(){const response=await request<{profiles:unknown}>('/canonical/profile');return profilesOf(response.profiles);}
 async function load(){const run=++revision.current;setBusy(true);setNotice('');try{const rows=await readProfiles();if(run===revision.current){setProfiles(rows);if(!rows.length)setNotice('출생 시각과 시간대가 있는 내 프로필을 저장한 뒤 다시 확인해 주세요.');}}catch{if(run===revision.current)setNotice('저장 프로필을 확인하지 못했어요. 다시 확인해 주세요.');}finally{if(run===revision.current)setBusy(false);}}
 useEffect(()=>{const run=++revision.current;onGuide(null);if(!chart||!selected)return;
  let cancelled=false;
  void (async()=>{try{const rows=await readProfiles(),owned=rows.find(row=>row.id===selected);if(!owned||!sameBirth(owned.birth,birth))return;
   const guide=await import('../../../app/human-design/_copy/living-guide');if(!cancelled&&run===revision.current)onGuide(guide);
  }catch{if(!cancelled&&run===revision.current)setNotice('생활 해석을 열려면 내 프로필을 다시 확인해 주세요.');}})();
  return()=>{cancelled=true;};
 // The current Toss session remounts this component; birth and chart bind the owned guide.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[chart,selected,birth.birthDate,birth.birthTime,birth.timezone,birth.calendar,onGuide]);
 return <section aria-label="휴먼 디자인 저장 프로필"><Button type="button" variant="weak" loading={busy} onClick={()=>void load()}>내 프로필 확인하기</Button>
 {!!profiles.length&&<label>저장 프로필<select value={selected} onChange={event=>{const id=event.target.value;setSelected(id);const profile=profiles.find(row=>row.id===id);if(profile)onSelect(profile.birth);}}><option value="">프로필 선택하기</option>{profiles.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}
 <p className="muted">내 저장 프로필로 차트를 만들면 같은 출생정보의 생활 해석을 함께 읽을 수 있어요.</p>{notice&&<p role="status">{notice}</p>}</section>;
}
