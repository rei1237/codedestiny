'use client';
import {useContext,useEffect,useRef,useState,type ReactNode,type FormEvent,type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import styles from './intake-chat.module.css';
import ChatInputBar,{ChatSendButton,IntakeComposerContext} from './ChatInputBar';
// input: 입력 바 안의 한 줄 입력, chips: 바 위 칩 줄, note: 보조 문구, answer: 지난 답변 말풍선 문구(없으면 입력값).
export type ProfileChatField={id:string;prompt:string;input?:ReactNode;chips?:ReactNode;note?:ReactNode;answer?:string};
export default function ProfileChatFields({fields,formId,onSubmit,busy,error,saveLabel}:{fields:ProfileChatField[];formId:string;onSubmit:(event:FormEvent<HTMLFormElement>)=>void;busy:boolean;error:string;saveLabel:string}){
 const [step,setStep]=useState(0),[answers,setAnswers]=useState<Record<string,string>>({});
 const form=useRef<HTMLFormElement>(null),bottom=useRef<HTMLDivElement>(null);
 const composer=useContext(IntakeComposerContext);
 useEffect(()=>{if(!composer)return;composer.claim(true);return()=>composer.claim(false);},[composer]);
 useEffect(()=>{
  composer?.follow();
  if(window.matchMedia('(pointer: coarse)').matches)return;
  const active=bottom.current?.querySelector('[data-active="true"]');
  (active?.querySelector<HTMLElement>('input:not([type=hidden]):not(:disabled)')||active?.querySelector<HTMLElement>('button[type=submit]'))?.focus({preventScroll:true});
 },[step,composer]);
 function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const active=bottom.current?.querySelector<HTMLElement>('[data-active="true"]');
  const inputs=Array.from(active?.querySelectorAll<HTMLInputElement>('input')||[]);
  for(const input of inputs){if(!input.checkValidity()){input.reportValidity();return;}}
  const field=fields[step];
  setAnswers(previous=>({...previous,[field.id]:field.answer||inputs.filter(input=>!input.disabled&&input.type!=='hidden').map(input=>input.value).filter(Boolean).join(' · ')||'입력하지 않았어요'}));
  if(step<fields.length-1){setStep(step+1);return;}
  void onSubmit(event);
 }
 // 한글 조합 중 Enter는 글자 확정이므로 보내지 않는다. 한 줄 입력이라 터치 기기의 Enter(이동/완료)도 보낸다.
 function enter(event:KeyboardEvent<HTMLElement>){
  if(event.key!=='Enter'||!(event.target instanceof HTMLInputElement)||event.nativeEvent.isComposing||event.keyCode===229)return;
  event.preventDefault();if(!busy)form.current?.requestSubmit();
 }
 const composerUi=<div ref={bottom} onKeyDown={enter}>
  {fields.map((field,index)=><div key={field.id} hidden={index!==step} data-active={index===step}>
   <fieldset disabled={busy} className={styles.fieldset}>
    {field.chips&&<div className={styles.chips} role="group" aria-label={field.prompt}>{field.chips}</div>}
    {field.note&&<div className={styles.help}>{field.note}</div>}
    {index===step&&error&&<p className={styles.error} role="alert">{error}</p>}
    {field.input?<ChatInputBar label={field.prompt} sendLabel={index===fields.length-1?saveLabel:'답장 보내기'} form={formId}>{field.input}</ChatInputBar>:<div className={styles.chipSend}><ChatSendButton sendLabel={index===fields.length-1?saveLabel:'답장 보내기'} form={formId}/></div>}
   </fieldset>
  </div>)}
 </div>;
 return <form id={formId} className={styles.profileChat} ref={form} onSubmit={submit} noValidate>
  {fields.slice(0,step).map(field=><div key={field.id} className={styles.turn}>
   <div className={styles.cat}><img src="/assets/yeongnyangi/profiles/welcome.webp" alt="" width={36} height={36}/><div className={styles.catBubble}>{field.prompt}</div></div>
   <div className={styles.reply}><p>{answers[field.id]}</p><button type="button" disabled={busy} onClick={()=>setStep(fields.indexOf(field))}>수정</button></div>
  </div>)}
  <div className={styles.cat}><img src="/assets/yeongnyangi/profiles/welcome.webp" alt="" width={36} height={36}/><p key={step} className={styles.catBubble}>{fields[step].prompt}</p></div>
  <p className={styles.srOnly} role="status">{fields[step].prompt}</p>
  {composer?.slot?createPortal(composerUi,composer.slot):composerUi}
 </form>;
}
