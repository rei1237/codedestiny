import {useEffect,useRef,useState} from 'react';
import {directory,fortuneCollections,directoryDestination,searchDirectory,type Consultation,type Destination,type DirectoryItem} from './home-directory';

type Props={onOpen:(page:Destination)=>void;onConsult:(service:Consultation)=>void};
const sectionArt={books:'/assets/yeoni-yeongnyangi-garden.webp',reports:'/assets/toss-art/report-saju-yeongnyangi-v1.webp'};
const sectionDescription={rooms:'연이·네오에게 내 고민 상담하기',fortune:'사주·타로·점성술과 오늘의 운세',books:'이야기·음악·달빛 홈 화면',reports:'연애·재물·인생을 깊이 살펴보기'};
// Match the web garden's six entry points; keep descriptions and destinations in the catalogue.
const quickDestinations=['saju/basic/play','tarot-library','ziwei/chart','sukuyo','vedic','astrology'];
const quickEntries=quickDestinations.map(id=>directory.flatMap(group=>group.entries).find(item=>directoryDestination(item)===id)!);
type BrowseState={query:string;expanded:string[];collection:string};

export default function FortuneDirectory({onOpen,onConsult}:Props){
 const saved=useRef<BrowseState|undefined>(window.history.state?.tossDirectory);
 const [query,setQuery]=useState(saved.current?.query??'');
 const [expanded,setExpanded]=useState<string[]>(saved.current?.expanded??['rooms']);
 const [collection,setCollection]=useState(saved.current?.collection??'saju');
 useEffect(()=>{
   // Stay on this history entry: Back restores browsing without retaining account/profile data.
   window.history.replaceState({...window.history.state,tossDirectory:{query,expanded,collection}},'');
 },[query,expanded,collection]);
 const input=useRef<HTMLInputElement>(null);
 const groups=searchDirectory(query);
 const count=groups.reduce((sum,group)=>sum+group.entries.length,0);
 const searching=Boolean(query.trim());
 function open(item:DirectoryItem){
   if('id' in item)onOpen(item.id);
   else if('room' in item)onConsult(item.room);
   else location.assign(item.href);
 }
 return <div className="fortune-directory">
   {!searching&&<section className="directory-quick" aria-labelledby="directory-quick-title">
     <h2 id="directory-quick-title">어떤 운세부터 볼까요?</h2>
     <div>{quickEntries.map(item=><button key={item.title} type="button" aria-label={item.title+' 바로 시작하기'} onClick={()=>open(item)}><strong>{item.title}</strong><small>{item.body}</small><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>)}</div>
   </section>}
   <div className="directory-search">
     <label htmlFor="fortune-directory-query">운세 찾기</label>
     <div><input id="fortune-directory-query" ref={input} type="search" placeholder="사주, 작명, 네오, 웹툰…" value={query} onChange={e=>setQuery(e.target.value)}/>
     {query&&<button aria-label="검색어 지우기" onClick={()=>{setQuery('');input.current?.focus();}}>지우기</button>}</div>
   </div>
   <p role="status" aria-atomic="true" className="catalog-count">{searching?(count?'검색 결과 '+count+'개':'일치하는 운세가 없어요. 다른 이름으로 찾아보세요.'):''}</p>
   {!searching&&<div className="directory-browse"><p>어떤 이야기가 필요한가요?<br/>종류를 고르면 운세가 펼쳐져요.</p><button type="button" onClick={()=>{setExpanded(expanded.length===directory.length?['rooms']:directory.map(group=>group.kind));setCollection('all');}}>{expanded.length===directory.length?'상담실만 펼치기':'전체 펼치기'}</button></div>}
   {groups.map(group=><section key={group.kind} className={'directory-group directory-'+group.kind} aria-labelledby={'directory-'+group.kind}>
     <header className="directory-heading"><h2 id={'directory-'+group.kind}>{searching?group.title:<button type="button" aria-expanded={expanded.includes(group.kind)} aria-controls={'directory-items-'+group.kind} onClick={()=>setExpanded(current=>current.includes(group.kind)?current.filter(kind=>kind!==group.kind):[...current,group.kind])}><span>{group.title}<small>{sectionDescription[group.kind]}</small></span><span className="directory-group-count">{group.entries.length}개 <i aria-hidden="true"/></span></button>}</h2>
       {(group.kind==='books'||group.kind==='reports')&&<img src={sectionArt[group.kind]} loading="lazy" alt="" width="100" height="88"/>}
     </header>
     <div id={'directory-items-'+group.kind} hidden={!searching&&!expanded.includes(group.kind)}>
     {group.kind==='fortune'&&!searching&&<div className="directory-methods" role="group" aria-label="운세 방식 고르기">{[{id:'all',title:'전체',destinations:group.entries.map(directoryDestination)},...fortuneCollections].map(option=><button key={option.id} type="button" aria-pressed={collection===option.id} onClick={()=>setCollection(option.id)}>{option.title} <span>{option.destinations.length}</span></button>)}</div>}
     <div className="directory-list">{group.entries.map(item=><button key={item.title} hidden={group.kind==='fortune'&&!searching&&collection!=='all'&&!fortuneCollections.find(option=>option.id===collection)?.destinations.includes(directoryDestination(item))} aria-label={item.title.endsWith(' 둘러보기')?item.title:undefined} className={item.art?'directory-portrait'+('room' in item&&item.room==='neo'?' directory-neo':''):''} onClick={()=>open(item)}>
       {item.art&&<img src={item.art} alt="" width="88" height="98"/>}
       <span><strong>{item.title.replace(/ 둘러보기$/u,'')}</strong>{item.body&&<small>{item.body}</small>}</span><i aria-hidden="true"/>
     </button>)}</div></div>
   </section>)}
 </div>;
}
