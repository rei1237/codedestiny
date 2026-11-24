"use client";
import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import Character,{type Activity} from './Character';
import type {useSpaceProfile} from '../_lib/use-space-profile';
import {COMPANIONS,COMPANION_ART,HANBI_ART,isZodiac,speciesOf,zodiacStill,walkDrawing} from '../_lib/companions';
import {CYCLE_MS} from '../model-review/bow-session';
import styles from '../space.module.css';

type Preview = Activity|'walk';
const actions:[Preview,string][]=[['greeting','인사'],['prayer','기도'],['meditation','명상'],['bow','절 한 번'],['walk','걷기']];
type Props={profile:ReturnType<typeof useSpaceProfile>;reduced:boolean;onChange:()=>void};

export default function CharacterChooser({profile,reduced,onChange}:Props){
 const [mode,setMode]=useState<Preview>('idle'),[elapsed,setElapsed]=useState(0),[play,setPlay]=useState(0),[failed,setFailed]=useState(false);
 const species=speciesOf(profile.avatar,profile.image);
 const selected=profile.character==='custom'?(species||'yeoni'):profile.character||'yeoni';
 const choices=[{id:'yeoni',name:'꽃돼지 연이',image:'/assets/moonlit-lotus/yeoni/2d-v2/still.webp'},
  {id:'cat',name:'영냥이',image:COMPANION_ART+'/cat-still.webp'},
  {id:'hanbi',name:'서한비',image:HANBI_ART+'-still.webp'},
  ...COMPANIONS.map(([id,name])=>({id,name,image:zodiacStill(id)}))];
 const name=choices.find(c=>c.id===selected)?.name||(selected==='yeongnyangi'?'영냥이':'꽃돼지 연이');
 useEffect(()=>{setMode('idle');setElapsed(0);setFailed(false);},[selected]);
 const savedMotion=useRef({key:'',time:0});
 useEffect(()=>{
  const key=selected+'-'+mode+'-'+play;
  if(savedMotion.current.key!==key){savedMotion.current={key,time:0};setElapsed(0);}
  if(reduced||!['bow','walk'].includes(mode))return;
  let raf=0,last=0,time=savedMotion.current.time;
  const tick=(now:number)=>{
   if(document.hidden){last=0;return;}
   if(last)time+=Math.min(100,now-last);last=now;
   savedMotion.current.time=time;setElapsed(mode==='bow'?Math.min(time,CYCLE_MS):time%1600);
   if(mode==='walk'||time<CYCLE_MS)raf=requestAnimationFrame(tick);
  };
  const visibility=()=>{cancelAnimationFrame(raf);last=0;if(!document.hidden)raf=requestAnimationFrame(tick);};
  visibility();document.addEventListener('visibilitychange',visibility);return()=>{cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);};
 },[mode,play,reduced,selected]);
 const walk=walkDrawing(profile.character||'yeoni',profile.avatar,profile.image);
 const frame=walk.offset+Math.floor(elapsed/1600*walk.frames)%walk.frames;
 const choose=(id:string)=>{
  onChange();setFailed(false);
  if(id==='hanbi')profile.save('custom',{...profile.avatar,species:'hanbi',name:'서한비'});
  else if(isZodiac(id))profile.save('custom',{...profile.avatar,species:id,name:COMPANIONS.find(([key])=>key===id)![1]});
  else profile.save(id==='cat'?'cat':'yeoni');
 };
 return <div className={styles.companionPicker}>
  <p>함께 쉬고 싶은 모습을 골라요. 선택한 친구가 직접 기도하고, 절하고, 걸어요.</p>
  <div className={styles.companionGrid} aria-label="연이·영냥이·서한비·12지신 캐릭터 선택">
   {choices.map(choice=><button key={choice.id} type="button" data-companion-choice={choice.id} aria-pressed={selected===choice.id||choice.id==='cat'&&selected==='yeongnyangi'} onClick={()=>choose(choice.id)}>
    <Image src={choice.image} alt="" width={88} height={88}/><span>{choice.name}</span>{choice.id==='hanbi'&&<small>유니크</small>}
   </button>)}
  </div>
  <section className={styles.companionPreview} aria-label="선택한 친구 동작 미리보기">
   <div className={styles.companionStage}>
    <Character kind={profile.character||'yeoni'} activity={mode==='walk'?'idle':mode} elapsed={elapsed} reduced={reduced} look={profile.avatar} image={profile.image} portrait="" walking={mode==='walk'?{url:walk.url,frame,rows:walk.rows}:null} onFailure={()=>setFailed(true)}/>
   </div>
   <h3>{name}와 함께 쉬어가요</h3>
   <div className={styles.previewActions} aria-label="동작 선택">{actions.map(([id,label])=><button type="button" key={id} aria-pressed={mode===id} onClick={()=>{setFailed(false);setMode(id);setPlay(v=>v+1);}}>{label}</button>)}</div>
   <p className={styles.small}>{reduced?'동작 줄이기 설정에 따라 정지 자세로 보여요.':'동작 미리보기는 108배 횟수에 포함되지 않아요.'}</p>
   {failed&&<p role="alert">동작 그림을 불러오지 못했어요. 다른 친구를 고르거나 잠시 후 다시 시도해 주세요.</p>}
  </section>
  {profile.savedCompanionAvailable&&<><button type="button" className={styles.profileCompanion} disabled={profile.loading} onClick={()=>{onChange();void profile.loadImage();}}>{profile.loading?'프로필 친구 확인 중':'내 프로필의 동물로 고르기'}</button>
  <p className={styles.small}>프로필 친구가 12지신 또는 영냥이면 같은 동물로 선택해요. 연화당 전용 전신 그림을 사용하며 프로필의 꾸밈·성장 기록은 바꾸지 않아요.</p></>}
  {profile.imageError&&<p role="status">{profile.imageError}</p>}
 </div>;
}
