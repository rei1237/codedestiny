import {useEffect,useRef,useState} from 'react';
import {Share,Clipboard} from '@apps-in-toss/web-framework';
import {GAMES} from '../../../app/mini-games/games';
import {miniGameRoutes,gameStorageKeys,fullGameShelf,publicMiniGameSlugs} from '../canonical/mini-games.mjs';
import TossSessionScope from './TossSessionScope';
import {api,hasTossSession} from './platform';

const documents={
 'destiny-poker':()=>import('virtual:toss-mini-game/destiny-poker'),
 'fortune-fish':()=>import('virtual:toss-mini-game/fortune-fish'),
 'blood-type':()=>import('virtual:toss-mini-game/blood-type'),
 'hwatu-life':()=>import('virtual:toss-mini-game/hwatu-life'),
};
function Game({slug,name}){
 const frame=useRef(null),[content,setContent]=useState(''),[issue,setIssue]=useState(''),[attempt,retry]=useState(0);
 useEffect(()=>{
  let active=true,key;const allowed=gameStorageKeys[slug];
  async function start(){
   const scope=hasTossSession()?(await api('/session')).storageScope:'guest';if(!scope)throw Error('Missing owner');
   key='cd:toss:minigames:'+encodeURIComponent(scope)+':'+slug;
   const saved=JSON.parse(localStorage.getItem(key)||'{}'),state=Object.fromEntries(allowed.filter(k=>typeof saved[k]==='string').map(k=>[k,saved[k]]));
   const template=(await documents[slug]()).default;
   if(active)setContent({source:template,initialState:JSON.stringify(state)});
  }
  async function message(event){
   if(!active||!frame.current||!key||event.origin!=='null'||event.source!==frame.current.contentWindow)return;
   const m=event.data;if(!m||m.type!=='code-destiny:mini-game'||m.game!==slug)return;
   if(m.action==='back'){location.assign(fullGameShelf?'/mini-games/':'/?world=ggulggul');return;}
   try{
    if(m.action==='store'&&m.payload&&typeof m.payload==='object'){
     const clean=Object.fromEntries(allowed.filter(k=>typeof m.payload[k]==='string'&&m.payload[k].length<=160).map(k=>[k,m.payload[k]]));
     localStorage.setItem(key,JSON.stringify(clean));return;
    }
    if(!['share','copy'].includes(m.action)||typeof m.payload!=='string')return;
    const text=m.payload.replace(/https?:\/\/\S+|about:srcdoc/g,'').trim().slice(0,1600);
    if(m.action==='share')await Share.sendMessage({message:name+' · '+(text||'미니 운세 게임')});
    else await Clipboard.setText(text);
    if(active)event.source.postMessage({type:'code-destiny:mini-share-result',id:m.id,ok:true},'*');
   }catch{if(active){setIssue('기기에서 요청을 마치지 못했어요. 다시 시도해 주세요.');event.source.postMessage({type:'code-destiny:mini-share-result',id:m.id,ok:false},'*');}}
  }
  setContent('');setIssue('');void start().catch(()=>{if(active)setIssue('게임을 열지 못했어요. 다시 시도해 주세요.');});
  window.addEventListener('message',message);
  return()=>{active=false;window.removeEventListener('message',message);};
 },[slug,attempt,name]);
 return <><a className="daily-entry" href={fullGameShelf?"/mini-games/":"/?world=ggulggul"}>{fullGameShelf?"미니 운세 게임 목록으로":"꿀꿀운세로 돌아가기"}</a><h1>{name}</h1>
  {issue&&<p role="alert">{issue} <button onClick={()=>retry(n=>n+1)}>다시 시도하기</button></p>}
  {content?<iframe ref={frame} sandbox="allow-scripts" title={name} name={content.initialState} src={content.source} style={{width:'100%',height:'82svh',border:0,borderRadius:14}}/>:<p role="status">게임을 여는 중이에요.</p>}</>;
}
export default function MiniGames(){
 const slug=new URLSearchParams(location.search).get('play');
 const game=GAMES.find(item=>item.slug===slug&&Object.hasOwn(documents,item.slug));
 if(!fullGameShelf&&!publicMiniGameSlugs.includes(slug))return <section><h1>미니 운세 게임</h1><p>현재 이용할 수 있는 운세를 홈에서 살펴보세요.</p><a className="daily-entry" href="/?world=ggulggul">꿀꿀운세로 돌아가기</a></section>;
 if(game)return <TossSessionScope><Game name={game.name} slug={game.slug}/></TossSessionScope>;
 return <section><h1>미니 운세 게임</h1><div className="menu">{GAMES.map(game=><a className="daily-entry" key={game.slug} href={miniGameRoutes[game.slug]}>
 <img width="72" height="45" style={{objectFit:'cover',borderRadius:8}} src={'/__mini-game-covers/'+game.slug+'.webp'} alt=""/><span><strong>{game.name}</strong><small>{game.desc}</small></span></a>)}</div></section>;
}
