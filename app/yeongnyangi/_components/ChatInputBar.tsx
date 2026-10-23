'use client';
import {type ReactNode,type MouseEvent} from 'react';
import {ArrowUp} from 'lucide-react';
import styles from './intake-chat.module.css';

type Send={sendLabel:string;disabled?:boolean;onSend?:(event:MouseEvent<HTMLButtonElement>)=>void;form?:string};
// onPointerDown 기본 동작을 막아 전송 뒤에도 입력 포커스(모바일 키보드)를 유지한다.
export function ChatSendButton({sendLabel,disabled,onSend,form}:Send){
 return <button className={styles.sendIcon} type={form?'submit':'button'} form={form} aria-label={sendLabel} disabled={disabled} onPointerDown={e=>e.preventDefault()} onClick={onSend}><span><ArrowUp size={18} strokeWidth={2.5}/></span></button>;
}
export default function ChatInputBar({label,children,...send}:Send&{label:string;children:ReactNode}){
 return <div className={styles.inputBar}>
  <label className={styles.inputLabel}><span className={styles.srOnly}>{label}</span>{children}</label>
  <ChatSendButton {...send}/>
 </div>;
}
