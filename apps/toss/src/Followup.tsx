import {useRef,useState} from 'react';
import {TextArea} from '@toss/tds-mobile';
import {Button} from './Button';
import {api} from './platform';
export type Conversation={limit:number;remaining:number;closed:boolean;ready:boolean;pending?:{id:string;question:string;retryAt:number};exchanges:{id:string;question:string;kind:string;text:string}[]};
export function Followup({id,conversation,onResult,onError}:{id:string;conversation:Conversation;onResult:(result:any)=>void;onError:(error:unknown)=>void}){
 const [question,setQuestion]=useState(''),[busy,setBusy]=useState(false),intent=useRef(crypto.randomUUID());
 async function send(){
  if(busy)return;setBusy(true);
  try{if(conversation.pending&&conversation.pending.retryAt>Date.now()){onResult(await api('/results/'+id));return;}const result=await api('/results/'+id+'/conversation',{id:conversation.pending?.id||intent.current,question:conversation.pending?.question||question});onResult(result);setQuestion('');intent.current=crypto.randomUUID();}
  catch(error){onError(error);try{onResult(await api('/results/'+id));}catch{/* Preserve the visible answer and original failure. */}}
  finally{setBusy(false);}
 }
 return <section className="chapter"><h2>이 상담에 이어서 물어보기</h2><p>남은 후속 상담 {conversation.remaining}회 · 저장된 상담의 이해와 현실 적용을 도와드려요.</p>
 {conversation.exchanges.map(e=><article key={e.id}><h3>{e.question}</h3><p>{e.text}</p></article>)}
 {!conversation.closed&&conversation.ready&&<>{conversation.pending?<p role="status">이전 질문의 답변을 확인하고 있어요. 새 질문 대신 같은 요청으로 확인해 주세요.</p>:<TextArea variant="box" label="이 상담에서 더 궁금한 점" labelOption="sustain" value={question} onChange={e=>{setQuestion(e.target.value);intent.current=crypto.randomUUID();}} maxLength={1200}/>}
 <Button loading={busy} disabled={busy||(!conversation.pending&&question.trim().length<2)} onClick={()=>void send()}>{conversation.pending?'이전 질문 다시 확인':'이 질문으로 이어서 상담'}</Button></>}
 </section>;
}
