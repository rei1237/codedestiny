import {useEffect,useMemo,useRef,useState} from 'react';
import {gunzipSync,strFromU8} from 'fflate';
import book from 'virtual:toss-novel-book';
import {Button} from './Button';
const pageSize=12;
type Place={id:string;page:number};
export default function NovelReader(){
  const [place,setPlace]=useState<Place|null>(null),[bookmark,setBookmark]=useState<Place|null>(null);
  const heading=useRef<HTMLHeadingElement>(null);
  const episode=book.episodes.find(e=>e.id===place?.id);
  const lines=useMemo(()=>{
    if(!episode)return [];
    const bytes=Uint8Array.from(atob(book.text[episode.id]),c=>c.charCodeAt(0));
    return JSON.parse(strFromU8(gunzipSync(bytes))) as [string,string][];
  },[episode]);
  useEffect(()=>{
    if(!place)return;
    heading.current?.focus();
    const back=(event:Event)=>{event.preventDefault();setPlace(null);};
    window.addEventListener('code-destiny:toss-back',back);
    return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[place]);
  function open(id:string,page=0){const next={id,page};setPlace(next);setBookmark(next);}
  if(!episode||!place)return <section><h1>연이의 운명 노벨</h1><p>연이에게 낯선 앱이 찾아온 날부터, 곁에 남을 세계를 선택하는 순간까지. 한국어판을 글로 읽어요.</p>
    {bookmark&&<Button display="block" onClick={()=>setPlace(bookmark)}>읽던 곳부터 이어보기</Button>}
    <h2>차례</h2>{book.episodes.map(e=><button className="record" key={e.id} onClick={()=>open(e.id)}>{e.title}</button>)}</section>;
  const pages=Math.ceil(lines.length/pageSize),last=place.page===pages-1;
  const next=book.episodes[book.episodes.indexOf(episode)+1];
  return <article><h1 ref={heading} tabIndex={-1}>{episode.title}</h1><p className="muted">{place.page+1} / {pages}쪽</p>
    {lines.slice(place.page*pageSize,(place.page+1)*pageSize).map(([speaker,words],i)=><p key={i}>{speaker&&<><strong>{speaker}</strong><br/></>}{words}</p>)}
    {place.page>0&&<Button variant="weak" onClick={()=>open(episode.id,place.page-1)}>이전 쪽</Button>}
    {!last?<Button onClick={()=>open(episode.id,place.page+1)}>다음 쪽</Button>:episode.ending?<p>결말 · {episode.ending}</p>:episode.options.length?
      episode.options.map(choice=><Button key={choice.target} onClick={()=>open(choice.target)}>{choice.label}</Button>):
      next&&next.branch===episode.branch&&<Button onClick={()=>open(next.id)}>다음 화 읽기</Button>}
    <Button variant="weak" display="block" onClick={()=>setPlace(null)}>차례로 돌아가기</Button></article>;
}
