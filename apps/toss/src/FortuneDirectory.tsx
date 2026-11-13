import {useRef,useState} from 'react';
import {searchDirectory,type Consultation,type Destination,type DirectoryItem} from './home-directory';

type Props={onOpen:(page:Destination)=>void;onConsult:(service:Consultation)=>void};
const sectionArt={books:'/assets/yeoni-yeongnyangi-garden.webp',reports:'/assets/toss-art/report-saju-yeongnyangi-v1.webp'};

export default function FortuneDirectory({onOpen,onConsult}:Props){
 const [query,setQuery]=useState('');
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
   <div className="directory-search">
     <label htmlFor="fortune-directory-query">운세 찾기</label>
     <div><input id="fortune-directory-query" ref={input} type="search" placeholder="사주, 작명, 네오, 웹툰…" value={query} onChange={e=>setQuery(e.target.value)}/>
     {query&&<button aria-label="검색어 지우기" onClick={()=>{setQuery('');input.current?.focus();}}>지우기</button>}</div>
   </div>
   <p role="status" aria-atomic="true" className="catalog-count">{searching?(count?'검색 결과 '+count+'개':'일치하는 운세가 없어요. 다른 이름으로 찾아보세요.'):''}</p>
   {groups.map(group=><section key={group.kind} className={'directory-group directory-'+group.kind} aria-labelledby={'directory-'+group.kind}>
     <header className="directory-heading"><h2 id={'directory-'+group.kind}>{group.title}</h2>
       {(group.kind==='books'||group.kind==='reports')&&<img src={sectionArt[group.kind]} loading="lazy" alt="" width="100" height="88"/>}
     </header>
     <div className="directory-list">{group.entries.map(item=><button key={item.title} aria-label={item.title.endsWith(' 둘러보기')?item.title:undefined} className={item.art?'directory-portrait'+('room' in item&&item.room==='neo'?' directory-neo':''):''} onClick={()=>open(item)}>
       {item.art&&<img src={item.art} alt="" width="88" height="98"/>}
       <span><strong>{item.title.replace(/ 둘러보기$/u,'')}</strong>{item.body&&<small>{item.body}</small>}</span><i aria-hidden="true"/>
     </button>)}</div>
   </section>)}
 </div>;
}
