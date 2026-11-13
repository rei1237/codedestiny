import {useEffect,useState} from 'react';
import season from 'virtual:toss-moonlight-season';
import {Button} from './Button';

function progressKey(slug:string){return 'cd:webtoon:yeoni-s1-'+(slug==='prologue'?'ep1':slug)+':page';}
function savedPage(slug:string,total:number){
  try{const n=Number(localStorage.getItem(progressKey(slug)));return Number.isInteger(n)&&n>=3&&n<total?n:0;}catch{return 0;}
}
export default function MoonlightSeason(){
  const [slug,setSlug]=useState('');
  const [index,setIndex]=useState(0);
  const [failed,setFailed]=useState(false);
  const [attempt,setAttempt]=useState(0);
  const chapter=season.chapters.find(item=>item.slug===slug);
  const page=chapter?.pages[index];
  function open(nextSlug:string,firstPage=1){setIndex(firstPage-1);setFailed(false);setSlug(nextSlug);window.scrollTo(0,0);}
  function turn(nextIndex:number){
    if(chapter)try{if(nextIndex+1===chapter.pages.length)localStorage.removeItem(progressKey(chapter.slug));else localStorage.setItem(progressKey(chapter.slug),String(nextIndex+1));}catch{/* Reading works without device storage. */}
    setFailed(false);setIndex(nextIndex);window.scrollTo(0,0);}
  useEffect(()=>{
    if(!chapter)return;
    const back=(event:Event)=>{event.preventDefault();open('');};
    window.addEventListener('code-destiny:toss-back',back);
    return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[chapter]);
  if(!chapter||!page)return <section><h1>{season.title}</h1>
    <p>엉킨 운을 풀어 가는 연이와 영냥이의 이야기를 읽어 보세요.</p>
    {season.chapters.map(item=><article className="paper" key={item.slug}><h2>{item.no}화 · {item.title}</h2><p>{item.logline}</p><Button onClick={()=>open(item.slug)}>{item.no}화 읽기 · {item.pages.length}쪽</Button>{savedPage(item.slug,item.pages.length)>0&&<Button variant="weak" onClick={()=>open(item.slug,savedPage(item.slug,item.pages.length))}>{savedPage(item.slug,item.pages.length)}쪽부터 이어 보기</Button>}</article>)}
    {season.next&&<p>다음 공개 예정 {season.next}</p>}</section>;
  return <section><h1>{chapter.no}화 · {chapter.title}</h1>
    <p aria-live="polite">{index+1} / {chapter.pages.length}쪽</p>
    {failed?<div className="paper"><p>{page.alt}</p><Button onClick={()=>{setFailed(false);setAttempt(n=>n+1);}}>그림 다시 불러오기</Button></div>
      :<img key={page.image+attempt} src={page.image} alt={page.alt} width={720} height={900} style={{width:'100%',height:'auto',display:'block'}} onError={()=>setFailed(true)}/>}
    <div className="form"><Button variant="weak" disabled={index===0} onClick={()=>turn(index-1)}>이전 쪽</Button>
      {index+1<chapter.pages.length?<Button onClick={()=>turn(index+1)}>다음 쪽</Button>:<Button onClick={()=>open('')}>회차 목록으로</Button>}</div>
  </section>;
}
