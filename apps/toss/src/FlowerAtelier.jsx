import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Clipboard,Share} from '@apps-in-toss/web-framework';
import {BookOpen,Bookmark,ClipboardCopy,Flower2,Share2,Trash2} from 'lucide-react';
import {bouquet,describeFlower,flowerCard,historyLimit} from 'virtual:flower-studio';
import {flowerHistory,updateFlowerHistory} from '../service/flower-history.mjs';
import './flower-atelier.css';

const sections=[
 ['성장과 실천','ritualLine'],['관계와 일','themesLine'],['관찰 일지','observationLog'],
 ['나의 비밀 레시피','secretRecipe'],['색의 조화','synergyPalette'],['입자와 분위기','particleMood'],
 ['가드너의 한마디','gardenerWord'],['오늘의 작은 선택','oneLineGuidance'],
];
function Reading({card,onShare,onCopy}){
 const {snapshot,extension}=card;
 return <article className="paper flower-studio-reader" aria-label="개화 해석">
  <p className="eyebrow">{card.label}의 꽃말</p><h3>{snapshot.name}</h3><p>{extension.flowerLanguage}</p>
  <p>{extension.dataSummary}</p>
  <div className="flower-palette">{[snapshot.primary,snapshot.secondary].map((color,index)=><span key={index}><i style={{backgroundColor:color}}/>{color}</span>)}</div>
  <details><summary>꽃이 피어난 근거와 실천</summary>
   {card.story?.length>0&&<ol>{card.story.map(part=><li key={part.stage+part.label}><strong>{part.label} </strong>{part.text}</li>)}</ol>}
   <ul>{extension.sourceMatrix.map(line=><li key={line}>{line}</li>)}</ul>
   {card.why.filter(x=>typeof x.text==='string').map(x=><p key={x.key}><strong>{x.label} </strong>{x.text}</p>)}
   <dl>{sections.map(([title,key])=><React.Fragment key={key}><dt>{title}</dt><dd>{extension[key]}</dd></React.Fragment>)}</dl>
  </details>
  <details><summary>꽃 그림 프롬프트</summary>
   <h4>메인 프롬프트</h4><p className="flower-prompt">{card.positive}</p>
   <h4>네거티브 프롬프트</h4><p className="flower-prompt">{card.negative}</p>
   <button type="button" onClick={()=>onCopy(card.positive)}><ClipboardCopy/>메인 프롬프트 복사</button>
   <button type="button" onClick={()=>onCopy(card.promptPack)}><ClipboardCopy/>프롬프트 세트 복사</button>
  </details>
  <button type="button" onClick={()=>onShare(card.share)}><Share2/>꽃 이야기 공유하기</button>
 </article>;
}
export default function FlowerAtelier({result,request}){
 const [owner,setOwner]=useState(''),[history,setHistory]=useState([]),[chosen,setChosen]=useState('saju');
 const [opened,setOpened]=useState(''),[notice,setNotice]=useState(''),[attempt,setAttempt]=useState(0);
 const mounted=useRef(false),active=useRef('');
 const studios=useMemo(()=>Object.entries(result?.sources||{}).filter(([,row])=>row.state==='ready'&&row.studio).map(([source,row])=>describeFlower(source,row)),[result]);
 const current=studios.find(item=>item.source===chosen)||studios[0];
 const liveCard=useMemo(()=>current?flowerCard(current):null,[current]);
 const saved=history.find(row=>row.snapshot.id===opened),card=saved||liveCard;
 useEffect(()=>{setOpened('');setNotice('');},[result]);
 useEffect(()=>{
  let live=true;mounted.current=true;
  async function load(){try{
   const {scope}=await request('/flower/session');if(!live)return;
   const rows=flowerHistory(localStorage,scope);active.current=scope;setHistory(rows);setOwner(scope);
  }catch{if(live)setNotice('개화 기록을 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.');}}
  void load();return()=>{live=false;mounted.current=false;active.current='';};
 },[request,attempt]);
 async function edit(change,message){
  const scope=owner;if(!scope)return;
  const apply=()=>{if(active.current!==scope)return;setHistory(updateFlowerHistory(localStorage,scope,historyLimit,change));setNotice(message);};
  try{if(navigator.locks?.request)await navigator.locks.request('flower-studio:'+scope,apply);else apply();}
  catch{if(mounted.current)setNotice('개화 기록을 저장하지 못했어요. 저장 공간을 확인하고 다시 시도해 주세요.');}
 }
 async function action(fn,ok,error){
  try{await fn();if(mounted.current)setNotice(ok);}catch{if(mounted.current)setNotice(error);}
 }
 const copy=text=>action(()=>Clipboard.setText(text),'프롬프트를 복사했어요.','복사하지 못했어요. 토스의 클립보드 권한을 확인해 주세요.');
 const share=message=>action(()=>Share.sendMessage({message}),'꽃 이야기 공유 창을 열었어요.','공유 창을 열지 못했어요. 다시 시도해 주세요.');
 function save(){
  if(!current)return;const row=flowerCard(current),s=row.snapshot;
  void edit(items=>[row,...items.filter(({snapshot:x})=>x.name!==s.name||x.primary!==s.primary||x.secondary!==s.secondary)],'개화 기록에 저장했어요.');
 }
 return <section className="flower-atelier" aria-label="운명의 꽃 아틀리에">
  {studios.length>0&&<><h2><Flower2/>운명의 꽃 아틀리에</h2>{studios.length>1&&<p>{bouquet(studios)}</p>}
   <label>해석할 꽃<select value={current.source} onChange={event=>{setChosen(event.target.value);setOpened('');setNotice('');}}>
    {studios.map(item=><option key={item.source} value={item.source}>{item.label} · {item.flower.name}</option>)}
   </select></label></>}
  {card&&<><Reading card={card} onCopy={copy} onShare={share}/>{!saved&&<button className="flower-save" type="button" onClick={save} disabled={!owner}><Bookmark/>개화 기록에 저장</button>}</>}
  <details><summary><BookOpen/>나의 개화 기록 {history.length}개</summary>
   {history.length===0?<p>저장한 꽃의 해석과 그림 프롬프트를 여기서 다시 읽을 수 있어요.</p>:history.map(row=><div key={row.snapshot.id} className="flower-record">
    <button type="button" onClick={()=>{setOpened(row.snapshot.id);setNotice('저장한 개화 기록을 열었어요.');}}>{row.snapshot.name} · {row.label}<small>{row.snapshot.savedAtLabel}</small></button>
    <button type="button" aria-label={row.snapshot.name+' 기록 지우기'} onClick={()=>void edit(items=>items.filter(item=>item.snapshot.id!==row.snapshot.id),'개화 기록을 지웠어요.')}><Trash2/></button>
   </div>)}
  </details>
  {!owner&&notice&&<button type="button" onClick={()=>setAttempt(v=>v+1)}>개화 기록 다시 불러오기</button>}
  <p role="status">{notice}</p>
 </section>;
}
