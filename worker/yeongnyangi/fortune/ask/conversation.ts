import {validateReadingClaims} from '../reading-quality';
import {FortuneError} from '../shared/contracts';
import {hasRequestAccess} from '../../access-methods.js';
import {QUESTION_POLICY_VERSION} from './question-policy';
export type FollowupReply={kind:'answer'|'clarification'|'new_consultation'|'insufficient'|'correction'|'support';text:string;sources:string[]};
export type Exchange={id:string;question:string;reply:FollowupReply;intentId:string};
type Pending={id:string;question:string;intentId:string;token:string;until:number;attempts:number};
export type Conversation={revision:number;used:number;closed:boolean;calls:number;exchanges:Exchange[];pending?:Pending;clarifyingIntent?:string};
export const empty=():Conversation=>({revision:0,used:0,closed:false,calls:0,exchanges:[]});
export function conversationView(row:any){
 const contract=row.snapshot?.questionContract;
 if(contract?.version!==QUESTION_POLICY_VERSION)return undefined;
 const c:Conversation=row.generationCheckpoint?.conversation||empty();
 const ready=row.state==='COMPLETED'&&hasRequestAccess(row);
 return {limit:contract.followups,used:c.used,remaining:Math.max(0,contract.followups-c.used),closed:c.closed||contract.followups===0,
  ready,pending:ready&&c.pending?{id:c.pending.id,question:c.pending.question,retryAt:c.pending.until}:undefined,
  exchanges:ready?c.exchanges.map(({id,question,reply})=>({id,question,kind:reply.kind,text:reply.text})):[]};
}
export function reserveConversation(c:Conversation|undefined,limit:number,id:string,question:string,now:number,token:string):Conversation{
 const prev=c||empty(),existing=prev.exchanges.find(e=>e.id===id)||prev.exchanges.find(e=>e.question===question&&e.reply.kind==='answer');
 if(existing){if(existing.question!==question)throw new FortuneError('IDEMPOTENCY_CONFLICT',409);return prev;}
 if(prev.closed||prev.used>=limit)throw new FortuneError('QUESTION_CONVERSATION_CLOSED',409);
 if(prev.pending){
  if(prev.pending.id!==id||prev.pending.question!==question||prev.pending.until>now)throw new FortuneError('QUESTION_FOLLOWUP_BUSY',409);
  if(prev.pending.attempts>=2)throw new FortuneError('QUESTION_FOLLOWUP_SUPPORT',409);
 }
 // Provider attempts and customer questions are separate budgets.
 if(prev.calls>=(limit+1)*6)throw new FortuneError('QUESTION_FOLLOWUP_SUPPORT',409);
 return {...prev,revision:prev.revision+1,calls:prev.calls+1,pending:{id,question,token,until:now+90000,
  intentId:prev.pending?.intentId||prev.clarifyingIntent||id,attempts:(prev.pending?.attempts||0)+1}};
}
export function validateFollowup(value:unknown,ids:Set<string>):FollowupReply{
 let v:any=value;
 if(typeof v==='string'){try{v=JSON.parse(v);}catch{throw new FortuneError('INVALID_FOLLOWUP',502);}}
 if(!v||!['answer','clarification','new_consultation','insufficient','correction','support'].includes(v.kind)||
  typeof v.text!=='string'||!v.text.trim()||v.text.length>9000||/<\/?[a-z][^>]*>/i.test(v.text)||
  !Array.isArray(v.sources)||v.sources.some((id:unknown)=>typeof id!=='string'||!ids.has(id)))throw new FortuneError('INVALID_FOLLOWUP',502);
 if(v.kind==='answer'&&(!v.sources.length||v.answered!==true||typeof v.reason!=='string'||!v.reason.trim()||typeof v.action!=='string'||!v.action.trim()))throw new FortuneError('INVALID_FOLLOWUP',502);
 const text=v.kind==='answer'?[v.text,v.reason,v.action].map((part:string)=>part.trim()).join('\n\n'):v.text.trim();
 if(text.length>9000||/<\/?[a-z][^>]*>/i.test(text))throw new FortuneError('INVALID_FOLLOWUP',502);
 validateReadingClaims(text,'ko');
 return {kind:v.kind,text,sources:v.sources};
}
export function finishConversation(c:Conversation,token:string,reply:FollowupReply,limit:number):Conversation{
 if(!c.pending||c.pending.token!==token)throw new FortuneError('QUESTION_FOLLOWUP_BUSY',409);
 const p=c.pending,used=c.used+(reply.kind==='answer'?1:0);
 if(used>limit)throw new FortuneError('QUESTION_CONVERSATION_CLOSED',409);
 return {revision:c.revision+1,used,closed:used>=limit,calls:c.calls,
  exchanges:[...c.exchanges,{id:p.id,question:p.question,intentId:p.intentId,reply}],
  ...(reply.kind==='clarification'||reply.kind==='insufficient'?{clarifyingIntent:p.intentId}:{})};
}
