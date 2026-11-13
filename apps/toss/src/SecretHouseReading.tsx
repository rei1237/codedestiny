import {useEffect,useRef} from 'react';
import page from 'virtual:secret-house-page';
import {api,shareSecretHouse} from './platform';
import {Button} from './Button';

export default function SecretHouseReading({onBack}:{onBack:()=>void}){
 const frame=useRef<HTMLIFrameElement>(null);
 useEffect(()=>{
   let active=true;
   async function request(event:MessageEvent){
     const source=frame.current?.contentWindow,command=event.data;
     if(!source||event.source!==source||event.origin!=='null'||command?.type!=='toss-secret-house'||typeof command.id!=='string')return;
     const respond=(ok:boolean,result?:unknown)=>{if(active)source!.postMessage({type:'toss-secret-house-result',id:command.id,ok,result},'*');};
     try{
       if(command.action==='share'&&typeof command.payload==='string'){await shareSecretHouse(command.payload);respond(true);}
       if(command.action==='step'){
         const featureKey='rpt_secretHouseEntryCard';
         const result=await api<{ok:boolean;featureKey:string;accessSource:string;house:unknown}>('/canonical/saju/section',{featureKey,house:command.payload});
         respond(result.ok&&result.featureKey===featureKey&&result.accessSource==='public'&&!!result.house,result.house);
       }
     }catch{respond(false);}
   }
   const back=(event:Event)=>{if(!event.defaultPrevented){event.preventDefault();onBack();}};
   window.addEventListener('message',request);window.addEventListener('code-destiny:toss-back',back);
   return ()=>{active=false;window.removeEventListener('message',request);window.removeEventListener('code-destiny:toss-back',back);};
 },[onBack]);
 return <section><h1>시크릿 하우스</h1><iframe sandbox="allow-scripts" ref={frame} title="시크릿 하우스 합숙" srcDoc={page}
   style={{width:'100%',height:'82svh',display:'block',border:0,borderRadius:14}}/><Button variant="weak" display="block" onClick={onBack}>다른 풀이 보기</Button></section>;
}
