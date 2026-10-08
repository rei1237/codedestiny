'use client';
import {useRef,useState,type ReactNode,type FormEvent} from 'react';
import profileStyles from './profiles.module.css';
import styles from './intake-chat.module.css';
type Field={id:string;prompt:string;content:ReactNode};
export default function ProfileChatFields({fields,onSubmit,busy,error,saveLabel}:{fields:Field[];onSubmit:(event:FormEvent<HTMLFormElement>)=>void;busy:boolean;error:string;saveLabel:string}){
 const [step,setStep]=useState(0),[answers,setAnswers]=useState<Record<string,string>>({});
 const form=useRef<HTMLFormElement>(null);
 function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const active=form.current?.querySelector<HTMLElement>('[data-active="true"]');
  const inputs=Array.from(active?.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input,select')||[]);
  for(const input of inputs){if(!input.checkValidity()){input.reportValidity();return;}}
  setAnswers(previous=>({...previous,[fields[step].id]:inputs.filter(input=>!input.disabled).map(input=>input instanceof HTMLSelectElement?input.selectedOptions[0]?.text:input.type==='checkbox'?(input.checked?'시간 미상':''):input.value).filter(Boolean).join(' · ')||'입력하지 않았어요'}));
  if(step<fields.length-1){setStep(step+1);return;}
  void onSubmit(event);
 }
 return <form className={profileStyles.profileForm} ref={form} onSubmit={submit} noValidate>
  {fields.map((field,index)=><div key={field.id}>
   {index<step&&<div className={styles.turn}><p className={styles.catBubble}>{field.prompt}</p><div className={styles.reply}><p>{answers[field.id]}</p><button type="button" disabled={busy} onClick={()=>setStep(index)}>수정</button></div></div>}
   <div hidden={index!==step} data-active={index===step}>
    <p className={styles.catBubble}>{field.prompt}</p>
    <fieldset disabled={busy} style={{border:0,padding:0,margin:0}}>{field.content}</fieldset>
   </div>
  </div>)}
  <p className={styles.srOnly} role="status">{fields[step].prompt}</p>
  <button type="submit" disabled={busy}>{step===fields.length-1?saveLabel:'답장 보내기'}</button>
  {step>0&&<button type="button" disabled={busy} onClick={()=>setStep(step-1)}>이전 답변</button>}
  {error&&<p role="alert">{error}</p>}
 </form>;
}
