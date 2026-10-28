"use client";
import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ChevronDown,Download,RotateCcw} from 'lucide-react';
import {hatHouses,hatImage,hatSystems,type HatResult} from '@/lib/yeongnyangi/hat-houses';
import {readDestinyProfileAccountId} from '@/app/_lib/profile-card-storage';
import {fortuneApi,loginForCurrentPage} from '../_lib/api';
import {profileKey,useProfiles} from '../_lib/use-profiles';
import ProfilePicker from './ProfilePicker';
import HatPrologue from './HatPrologue';
import HatHouseEmblem from './HatHouseEmblem';
import HatPersonality from './HatPersonality';
import styles from './sorting-hat.module.css';
export default function SortingHat(){
 const profiles=useProfiles();
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[result,setResult]=useState<HatResult|null>(null);
 const [story,setStory]=useState(false),[pending,setPending]=useState<HatResult|null>(null),[attempt,setAttempt]=useState(0);
 const [error,setError]=useState(''),[saving,setSaving]=useState(false),[notice,setNotice]=useState('');
 const root=useRef<HTMLElement>(null),heading=useRef<HTMLHeadingElement>(null),generation=useRef(0),lock=useRef(false);
 const selected=profiles.profiles.find(p=>profileKey(p)===profiles.profileId),profileRevision=JSON.stringify(selected||null);
 useEffect(()=>{generation.current++;setStory(false);setPending(null);setResult(null);setError('');setNotice('');setBusy(false);lock.current=false;},[profiles.profileId,profileRevision,profiles.guest]);
 useEffect(()=>{
  const reset=()=>{generation.current++;setStory(false);setPending(null);setResult(null);setNotice('');setError('');setBusy(false);lock.current=false;};
  const storage=(e:StorageEvent)=>{if(e.key===null||['fortune_auth_user','fortune_auth_token','cdToken'].includes(e.key))reset();};
  window.addEventListener('cd:auth-changed',reset);window.addEventListener('storage',storage);
  return()=>{generation.current++;window.removeEventListener('cd:auth-changed',reset);window.removeEventListener('storage',storage);};
 },[]);
 useEffect(()=>{if(result&&open)heading.current?.focus({preventScroll:true});},[result,open]);
 async function sort(){
  if(lock.current||!profiles.profileId)return;lock.current=true;setBusy(true);setError('');setNotice('');setResult(null);setPending(null);setStory(true);setAttempt(v=>v+1);
  const revision=++generation.current,account=readDestinyProfileAccountId();
  try{const data=await fortuneApi<{result:HatResult}>('free/hat',{profileId:profiles.profileId});if(revision!==generation.current||account!==readDestinyProfileAccountId())return;if(!data.result||!hatHouses.some(h=>h.id===data.result.houseId)||!Number.isInteger(data.result.usedCount)||data.result.usedCount<1||data.result.usedCount>6||!['complete','reference'].includes(data.result.mode))throw new Error('배정 근거를 확인하지 못했어요. 다시 시도해 주세요.');setPending(data.result);}
  catch(e){if(revision===generation.current){setError(e instanceof Error?e.message:'배정을 마치지 못했어요. 잠시 후 다시 시도해 주세요.');if((e as {status?:number}).status===401)void profiles.refresh(true);}}
  finally{if(revision===generation.current){setBusy(false);lock.current=false;}}
 }
 async function save(){
  if(!result||!root.current||saving)return;const revision=generation.current;setSaving(true);setNotice('');
  try{const {saveHatCard}=await import('../_lib/hat-card');await saveHatCard(result,root.current);if(revision===generation.current)setNotice('이미지 저장을 요청했어요. 다운로드한 파일을 확인해 주세요.');}
  catch(e){if(revision===generation.current)setNotice(e instanceof Error?e.message:'이미지를 저장하지 못했어요. 다시 시도해 주세요.');}finally{setSaving(false);}
 }
 const house=result?hatHouses.find(h=>h.id===result.houseId):null;
 return <section ref={root} id="sorting-hat" className={styles.hat} aria-labelledby="hat-title" lang="ko">
  <div className={styles.invitation}>
   <div className={styles.invitationArt}><Image src={hatImage('invitation')} width={1200} height={800} sizes="(max-width: 700px) 100vw, 50vw" alt="초승달 모자를 쓴 영냥이가 여섯 기숙사의 문 앞에서 배정을 기다리는 모습"/></div>
   <div className={styles.invitationCopy}><h2 id="hat-title">영냥이의 모자</h2><p className={styles.lead}>너의 자리는,<br/>어느 기숙사에 있을까?</p><p>“잠깐, 내 모자가 너한테 할 말이 있대.”<br/>타고난 기질과 마음의 결을 읽고,<br/>여섯 기숙사 중 너와 닮은 곳을 찾아줄게.</p>
    <button type="button" className={styles.primary} aria-expanded={open} aria-controls="hat-chamber" onClick={()=>setOpen(v=>!v)}>{open?'배정실 접기':'내 기숙사 알아보기'}<ArrowRight size={18} aria-hidden="true"/></button><p className={styles.note}>로그인 후 무료 · 멸치 차감 없이 이용해요</p>
   </div>
  </div>
  {open&&<div id="hat-chamber" className={styles.chamber}>
   <div className={styles.intake}><h3>모자를 쓰기 전에</h3><p>내 출생 프로필을 골라주세요. 같은 정보와 계산 버전에는 같은 배정이 나와요. 시간을 모르면 가능한 근거로 참고 배정을 받을 수 있어요.</p><ProfilePicker state={profiles}/>
    {!profiles.guest&&<p className={styles.note}>정보를 보완하려면 프로필을 새로 만들어 선택해 주세요. 기존 상담 기록은 그대로 남아요.</p>}
    <button className={styles.primary} type="button" disabled={busy||story||profiles.loading||(!profiles.guest&&!profiles.profileId)} onClick={profiles.guest?loginForCurrentPage:()=>void sort()}>{profiles.guest?'로그인하고 모자 써보기':story?'모자와 이야기하는 중':busy?'모자가 너의 결을 읽고 있어요':result?'같은 정보로 다시 배정하기':'모자 써보기'}{result?<RotateCcw size={18} aria-hidden="true"/>:<ArrowRight size={18} aria-hidden="true"/>}</button>
    {busy&&<p role="status" className={styles.loading}>사주부터 별의 지도까지, 계산 가능한 근거를 살피고 있어요. 잠시만 기다려 주세요.</p>}{error&&<p role="alert" className={styles.error}>{error}</p>}
   </div>
   {story&&<HatPrologue key={attempt} result={pending} error={error} onRetry={()=>void sort()} onFinish={()=>{if(pending){setResult(pending);setStory(false);}}}/>}
   {result&&house&&<article className={styles.result} aria-labelledby="hat-result-title">
    <figure className={styles.resultArt}><Image src={hatImage(house.id)} width={1200} height={800} sizes="(max-width: 900px) 100vw, 900px" alt={`${house.scene}에서 원래의 초승달 모자를 쓴 영냥이. 기숙사 상징은 ${house.symbol}.`}/><figcaption><span>너의 기숙사에 도착했어</span><strong>{house.scene}</strong></figcaption></figure>
    <header className={styles.resultTitle}><HatHouseEmblem id={house.id}/><p>모자가 너를 이곳으로 안내했어.</p><h3 id="hat-result-title" ref={heading} tabIndex={-1}>{house.name}</h3><p className={styles.motto}>{house.motto}</p><p className={styles.note}>{result.mode==='reference'?'확인할 수 있는 출생 정보로 읽은 참고 배정이에요.':'출생 정보의 상징을 모자의 성향 이야기로 풀었어요.'}</p></header>
    <HatPersonality result={result}/><div className={styles.letter}><h4>이런 순간, 혹시 익숙하니?</h4><ul className={styles.thoughts}>{house.points.map(p=><li key={p}>“{p}”</li>)}</ul></div>
    <dl className={styles.advice}><div><dt>네가 가져온 강점</dt><dd>{house.strength}</dd></div><div><dt>너무 몰입한 날에는</dt><dd>{house.shadow}</dd></div><div><dt>오늘 해볼 작은 선택</dt><dd>{house.action}</dd></div></dl>
    <details className={styles.evidence}><summary>배정의 바탕, 간단히 보기<ChevronDown size={18} aria-hidden="true"/></summary><p>출생 정보로 계산한 {result.systems.filter(s=>s.status==='used').map(s=>hatSystems[s.id]).join(' · ')}의 상징에서 {house.trait}의 흐름을 읽었어요.</p>{result.systems.filter(s=>s.status==='omitted').map(s=><p key={s.id}>{hatSystems[s.id]}은 이번 해석에서 제외했어요.{s.reason&&` ${s.reason}`}</p>)}<p>각 운세 체계는 서로 달라요. 기숙사와 모자의 대사는 계산된 상징을 바탕으로 쓴 창작 성향 이야기이며, 성격이나 미래를 확정하지 않아요.</p></details>
    <div className={styles.save}><button type="button" className={styles.primary} onClick={()=>void save()} disabled={saving}><Download size={18} aria-hidden="true"/>{saving?'이미지 준비 중':'내 기숙사 이미지 저장하기'}</button><p className={styles.note}>이미지에는 기숙사 이야기만 담아요. 이름과 출생 정보는 담지 않아요.</p><p role="status">{notice}</p></div>
   </article>}
   <details className={styles.directory} open={Boolean(result)}><summary>여섯 기숙사 둘러보기<ChevronDown size={18} aria-hidden="true"/></summary><div>{hatHouses.map(h=><article key={h.id}><Image src={hatImage(h.id)} width={600} height={400} sizes="(max-width: 600px) 100vw, 33vw" alt={`${h.name}의 ${h.scene}`} loading="lazy"/><div className={styles.houseHeading}><HatHouseEmblem id={h.id}/><h4>{h.name}<span>{h.trait}</span></h4></div><p>{h.admission}</p></article>)}</div></details>
  </div>}
 </section>;
}
