import {characterSheet,questRule,levelState,type Level,type SimpleQuest} from 'virtual:rpg-sheet';
import {api,getTossSessionRevision,hasTossSession} from './platform';

type Guest={date:string;completed:string[];totalExp:number;quests:SimpleQuest[];bound?:string};
type Owned={date:string;scope:string;completed:string[];progress:Level};
const guestKey='cd:toss:rpg:guest:v1';
function today(){return new Date(Date.now()+9*60*60*1000).toISOString().slice(0,10).replaceAll('-','.');}
function guest():Guest{
 const raw=JSON.parse(localStorage.getItem(guestKey)||'null');
 const totalExp=Number.isSafeInteger(raw?.totalExp)?raw.totalExp:0;
 return raw?.date===today()?raw:{date:today(),totalExp,completed:[],quests:[],bound:raw?.bound};
}
function persist(value:Guest){localStorage.setItem(guestKey,JSON.stringify(value));}
function locked<T>(run:()=>Promise<T>){return navigator.locks?navigator.locks.request(guestKey,run):run();}
const getOwned=()=>api<Owned>('/canonical/rpg/progress');
export function mountRpgQuest(target:HTMLElement,person:{stem:string;element:string;name:string},onLogin:()=>void){
 const doc=target.ownerDocument,revision=getTossSessionRevision(),account=hasTossSession();
 let alive=true,working=false,owner:Owned|null=null;
 const active=()=>alive&&getTossSessionRevision()===revision;
 const body=doc.createElement('div'),message=doc.createElement('p'),retry=doc.createElement('button'),link=doc.createElement('button');
 retry.type='button';retry.textContent='성장 기록 다시 확인하기';retry.hidden=true;
 link.type='button';link.textContent='로그인하고 성장 기록 이어가기';link.hidden=account;link.onclick=onLogin;
 message.setAttribute('role','status');target.append(body,message,retry,link);
 function draw(){
   if(!active())return;
   const g=guest();
   if(!account&&g.bound){body.replaceChildren();message.textContent='이전 성장 기록을 연결한 계정으로 로그인해 주세요.';return;}
   const date=today(),scopedKey=owner?'cd:toss:rpg:quests:'+owner.scope:'';
   const saved=account?JSON.parse(localStorage.getItem(scopedKey)||'null'):g;
   const sheet=characterSheet({...person,document:doc,account,progress:owner?.progress||levelState(g.totalExp),
     completed:owner?owner.completed:g.completed,stored:saved?.date===date?saved.quests:[]});
   const quests=sheet.quests.map(q=>({id:q.questId,text:q.text,icon:q.icon}));
   if(account)localStorage.setItem(scopedKey,JSON.stringify({date,quests}));
   else persist({...g,quests});
   body.innerHTML=sheet.html;
   if((owner?.completed.length||0)>=questRule.dailyLimit)body.querySelectorAll<HTMLButtonElement>('[data-rpg-complete]').forEach(b=>b.disabled=true);
   message.textContent=account?'내 계정에 저장됩니다':'이 기기에 저장됩니다';
 }
 async function act(id?:string){
   if(!active()||working)return;
   working=true;body.inert=true;retry.hidden=true;
   try{
     if(account){
       if(!owner)owner=await getOwned();
       if(!active())return;
       let adopted=false;
       await locked(async()=>{
         if(!active())return;
         const g=guest();
         if(g.totalExp>0&&(!g.bound||g.bound===owner!.scope)){
           persist({...g,bound:owner!.scope});
           await api('/canonical/rpg/adopt',{totalExp:g.totalExp,date:g.date,completed:g.completed});
           adopted=true;
           // Only this account may clear its acknowledged transfer after an interrupted login.
           if(active()&&guest().bound===owner!.scope){
             const key='cd:toss:rpg:quests:'+owner!.scope;
             if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({date:g.date,quests:g.quests}));
             localStorage.removeItem(guestKey);
           }
         }
       });
       if(!active())return;
       if(id)await api('/canonical/rpg/quest',{questId:id});
       if(id||adopted||body.childNodes.length)owner=await getOwned();
       if(active())await locked(async()=>draw());
     }else await locked(async()=>{
       if(!active())return;
       const g=guest();
       if(id&&!g.bound&&g.quests.some(q=>q.id===id)&&!g.completed.includes(id)&&g.completed.length<questRule.dailyLimit){
         persist({...g,completed:[...g.completed,id],totalExp:g.totalExp+questRule.exp});
       }
       draw();
     });
   }catch{
     if(active()){message.textContent='성장 기록을 확인하지 못했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.';retry.hidden=false;}
   }finally{if(active()){working=false;body.inert=false;}}
 }
 function select(e:Event){
   const btn=(e.target as HTMLElement)?.closest<HTMLButtonElement>('button[data-rpg-complete]');
   if(btn&&!btn.disabled)void act(btn.dataset.rpgComplete);
 }
 const update=()=>{if(!doc.hidden)void act();};
 let timer:number;
 function scheduleDayChange(){
   const midnight=new Date(Date.now()+9*60*60*1000);midnight.setUTCHours(24,0,0,0);
   timer=window.setTimeout(()=>{update();if(active())scheduleDayChange();},Math.max(1,midnight.getTime()-Date.now()-9*60*60*1000));
 }
 body.addEventListener('click',select);retry.onclick=()=>void act();
 scheduleDayChange();
 window.addEventListener('focus',update);doc.addEventListener('visibilitychange',update);
 void act();
 return ()=>{alive=false;clearTimeout(timer);window.removeEventListener('focus',update);doc.removeEventListener('visibilitychange',update);body.removeEventListener('click',select);};
}
