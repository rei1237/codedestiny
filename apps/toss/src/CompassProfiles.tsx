import {useEffect,useState} from 'react';
import {selectedBirthProfileSeed,type AiPrefillSeed} from '../../../app/_lib/ai-prefill-seed';
import type {DestinyProfileCard} from '../../../app/_lib/profile-card-storage';
import {api,hasTossSession} from './platform';
export default function CompassProfiles({onSelect}:{onSelect:(seed:AiPrefillSeed)=>void}){
 const [profiles,setProfiles]=useState<DestinyProfileCard[]>([]),[failed,setFailed]=useState(false);
 useEffect(()=>{if(!hasTossSession())return;let active=true;api<{profiles:DestinyProfileCard[]}>('/canonical/yeongnyangi/profiles').then(r=>{if(active)setProfiles(r.profiles);}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[]);
 if(!profiles.length)return failed?<p>프로필을 불러오지 못했어요. 출생정보를 직접 입력해 주세요.</p>:null;
 return <label>저장한 출생 프로필<select defaultValue="" onChange={e=>{const card=profiles.find(x=>String(x.profileId||x.id)===e.target.value);if(card)onSelect(selectedBirthProfileSeed(card));}}><option value="">프로필 선택하기</option>{profiles.map(card=><option key={card.profileId||card.id} value={card.profileId||card.id}>{card.name}</option>)}</select></label>;
}
