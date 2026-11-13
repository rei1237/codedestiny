import {useEffect,useRef,useState} from 'react';
import page from 'virtual:destiny-island';
import {api,hasTossSession} from './platform';
import {Button} from './Button';

const stateKeys=['cdIsland:v1','cdIsland:blueprint:v3'];
type Scope={prefix:string|null;document:string};
async function prepareIsland():Promise<Scope>{
 let prefix:string|null=null;
 const saved:Record<string,string>={};
 try{
  const owner=hasTossSession()?(await api<{storageScope:string}>('/session')).storageScope:'guest';
  if(owner){
    prefix='cd:toss:island:'+owner+':';
    for(const key of stateKeys){const value=localStorage.getItem(prefix+key);if(value)saved[key]=value;}
  }
 }catch{/* Device storage can be unavailable. Keep this session's game in memory. */}
 const initial=JSON.stringify(saved).replaceAll('<','\\u003c');
 return {prefix,document:page.replace('__TOSS_ISLAND_ORIGIN__',location.origin).replace('__TOSS_ISLAND_STATE__',()=>initial)};
}
export default function IslandReading({onBack}:{onBack:()=>void}){
 const frame=useRef<HTMLIFrameElement>(null),[scope,setScope]=useState<Scope|null>(null);
 useEffect(()=>{let active=true;void prepareIsland().then(s=>{if(active)setScope(s);});return ()=>{active=false;};},[]);
 useEffect(()=>{
  let active=true;
  async function dispatch(event:MessageEvent){
   const target=frame.current?.contentWindow,cmd=event.data;
   if(!target||event.source!==target||event.origin!=='null'||!scope)return;
   if(cmd?.type==='island-exit'){onBack();return;}
   if(cmd?.type==='island-save'&&scope.prefix&&stateKeys.includes(cmd.key)&&typeof cmd.value==='string'){
    try{localStorage.setItem(scope.prefix+cmd.key,cmd.value);}catch{/* The original also supports in-memory play. */}return;
   }
   if(cmd?.type!=='island-blueprint'||typeof cmd.id!=='string')return;
   try{
    const result=await api<{ok:boolean;blueprint:unknown}>('/canonical/ziwei-island/blueprint',cmd.input);
    if(active)target.postMessage({type:'island-result',id:cmd.id,ok:result.ok,result},'*');
   }catch{if(active)target.postMessage({type:'island-result',id:cmd.id,ok:false},'*');}
  }
  const back=(event:Event)=>{if(!event.defaultPrevented){event.preventDefault();if(frame.current)frame.current.contentWindow?.postMessage({type:'island-back'},'*');else onBack();}};
  window.addEventListener('message',dispatch);window.addEventListener('code-destiny:toss-back',back);
  return ()=>{active=false;window.removeEventListener('message',dispatch);window.removeEventListener('code-destiny:toss-back',back);};
 },[scope,onBack]);
 return <section>{scope?<iframe sandbox="allow-scripts allow-forms" ref={frame} title="운명의 섬" srcDoc={scope.document}
   style={{width:'100%',height:'78svh',display:'block',border:0,borderRadius:16}}/>:<p role="status">섬을 열고 있어요.</p>}
   <Button variant="weak" display="block" onClick={onBack}>다른 풀이 보기</Button></section>;
}
