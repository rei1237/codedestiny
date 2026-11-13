import {useState} from 'react';
import {useAuthStore} from '@/app/_lib/auth-store';
import {paymentRequiresReview} from '../src/platform';
import '@/js/services/animal-totem-content-engine.js';
import TossTeaPrice from './TossTeaPrice';
import {useNarrativeRoom,type NarrativeState} from './useNarrativeRoom';
import styles from '@/app/heukwol/heukwol.module.css';

type Mode='one'|'three'|'five';
type Draft={requestId:string;question:string;mode:Mode;animalIds:string[];birth?:{birthDate:string;gender:string}};
type Card={slot:string;animalId:string;animalName:string};
type Result=NarrativeState&{cards?:Card[];question?:string;narrative?:{opening?:string;question_answer?:string;closing?:string;card_bridges?:{slot:string;line:string}[];action_plan?:string[];shadow_gift_synthesis?:string}};
type Animal={id:string;emoji:string;name_ko:string;essence_poetic:string;direct_message_deep_dive:string;today_deep_advice:string[];integration_ritual_5min:string;shadow_warning:string;affirmation:string;journaling_prompts:string[]};
declare global { interface Window {AnimalTotemContentEngine:{slotLabels:Record<string,string>;getAnimalById:(id:string)=>Animal|null;getRandomSpread:(mode:Mode)=>{cards:{card:Animal}[]}}} }
const engine=window.AnimalTotemContentEngine;
const names={one:'한 장의 수호 메시지',three:'세 장의 통합 리딩',five:'다섯 장의 심화 리딩'};
function initial(key:string):Draft{
  try{const d=JSON.parse(localStorage.getItem(key)||'null');if(d&&Object.hasOwn(names,d.mode)&&typeof d.question==='string'&&Array.isArray(d.animalIds))return d;}catch{/* Optional storage. */}
  return {requestId:'',question:'',mode:'three',animalIds:[]};
}
export default function TossTotem(){
  const auth=useAuthStore(),u=auth.user,owner=String(u?.id||u?.userId||u?._id||u?.uid||'');
  if(!auth.isAuthenticated||!owner)return <main className={styles.page}><section className={styles.form}><h1>애니멀 토템</h1><p>한 장의 수호 메시지부터 다섯 장의 심화 리딩까지, 동물 카드에 지금의 고민을 물어보세요.</p><a href={'/login/?next='+encodeURIComponent(location.pathname+location.search)}>토스로 로그인하기</a></section></main>;
  return <TotemRoom key={owner} owner={owner}/>;
}
function TotemRoom({owner}:{owner:string}){
  const key='toss:animal-totem:'+owner;
  const [mode,setMode]=useState<Mode>(()=>initial(key).mode);
  const service=location.pathname.includes('/totem-deep/')?'totem-deep':location.pathname.includes('/totem-basic/')?'totem-basic':mode==='five'?'totem-deep':'totem-basic';
  const feature='animal-'+service;
  const {id,orderId,draft,price,setPrice,state,busy,error,save,start,retry}=useNarrativeRoom<Draft,Result>({owner,key,service,feature,path:'/animal-totem/'+service+'/',initial:()=>initial(key),
    build:d=>({...d,requestId:d.requestId||'totem-'+crypto.randomUUID(),animalIds:d.animalIds.length?d.animalIds:engine.getRandomSpread(d.mode).cards.map((c:{card:{id:string}})=>c.card.id)})});
  function change(next:Draft){save({...next,requestId:'',animalIds:[]});setMode(next.mode);}
  const n=state?.narrative;
  return <main className={styles.page}><section className={styles.form}><h1>애니멀 토템</h1>
    {id?state?.saved&&n?<article><h2>동물들이 건네는 메시지</h2><p>{state.question}</p><p>{n.opening}</p><p style={{whiteSpace:'pre-line'}}>{n.question_answer}</p>
      {state.cards?.map(({slot,animalId})=>{const animal=engine.getAnimalById(animalId);return animal&&<section key={slot}><h3>{animal.emoji} {engine.slotLabels[slot]} · {animal.name_ko}</h3><p>{n.card_bridges?.find(b=>b.slot===slot)?.line}</p><details><summary>수호의 본질과 작은 실천</summary><p>{animal.essence_poetic}</p><p>{animal.direct_message_deep_dive}</p><ul>{animal.today_deep_advice.map((line:string)=><li key={line}>{line}</li>)}</ul><p>{animal.integration_ritual_5min}</p><p>{animal.shadow_warning}</p><p>{animal.affirmation}</p>{animal.journaling_prompts.map((line:string)=><p key={line}>{line}</p>)}</details></section>;})}
      <p>{n.shadow_gift_synthesis}</p><ul>{n.action_plan?.map(line=><li key={line}>{line}</li>)}</ul><p>{n.closing}</p></article>:<><p role="status">저장한 토템 리딩을 확인하고 있어요.</p><button onClick={retry} disabled={busy}>토템 리딩 이어서 열기</button></>:<>
      <label>카드 펼침<select disabled={busy} value={draft.mode} onChange={e=>change({...draft,mode:e.target.value as Mode})}>{Object.entries(names).map(([v,title])=><option key={v} value={v}>{title}</option>)}</select></label>
      <label>동물들에게 묻고 싶은 질문 (선택)<textarea maxLength={300} disabled={busy} value={draft.question} onChange={e=>change({...draft,question:e.target.value})}/></label>
      <label>생년월일 (선택)<input type="date" value={draft.birth?.birthDate||''} disabled={busy} onChange={e=>change({...draft,birth:e.target.value?{birthDate:e.target.value,gender:draft.birth?.gender||''}:undefined})}/></label>
      {draft.birth&&<label>성별 (선택)<select value={draft.birth.gender} onChange={e=>change({...draft,birth:{birthDate:draft.birth!.birthDate,gender:e.target.value}})}><option value="">선택 안 함</option><option value="female">여성</option><option value="male">남성</option></select></label>}
      {!orderId&&<p>토스 단건 결제 · <TossTeaPrice key={feature} featureKey={feature} onPrice={setPrice}/></p>}
      <button className={styles.primary} onClick={start} disabled={busy||(!orderId&&(!price||paymentRequiresReview()))}>토템 카드 펼치기</button></>}
    {error&&<p role="alert">{error}</p>}<a href="/records/">꿀꿀운세 구매 기록</a></section></main>;
}
