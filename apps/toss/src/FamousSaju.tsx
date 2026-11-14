import {useEffect,useRef,useState} from 'react';
import {TextField} from '@toss/tds-mobile';
import articles from 'virtual:toss-famous-archive';
import {Button} from './Button';

export default function FamousSaju(){
  const read=()=>{const params=new URLSearchParams(window.location.search);return {query:params.get('q')||'',field:params.get('field')||'',slug:params.get('article')||''};};
  const [route,setRoute]=useState(read);
  const {query,field,slug}=route,selected=articles.find(article=>article.slug===slug)||null;
  function move(values:Partial<typeof route>,replace=false){const next={...route,...values},url=new URL(window.location.href);for(const [key,value] of Object.entries({q:next.query,field:next.field,article:next.slug}))value?url.searchParams.set(key,value):url.searchParams.delete(key);window.history[replace?'replaceState':'pushState'](window.history.state,'',url);setRoute(next);}
  const select=(article:typeof articles[number]|null)=>move({slug:article?.slug||''});
  useEffect(()=>{const pop=()=>setRoute(read());window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[]);
  const title=useRef<HTMLHeadingElement>(null),lastArticle=useRef<string|null>(null);
  useEffect(()=>{
    if(!selected){
      if(lastArticle.current)document.getElementById('article-'+lastArticle.current)?.focus();
      return;
    }
    title.current?.focus();
    const back=(event:Event)=>{event.preventDefault();select(null);};
    window.addEventListener('code-destiny:toss-back',back);
    return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[selected]);
  if(selected)return <article><h1 ref={title} tabIndex={-1}>{selected.name} 사주</h1><p>{selected.intro}</p>
    <h2>{selected.question}</h2><p>{selected.career}</p><h2>명식으로 읽는 이야기</h2><p>{selected.reading}</p>
    <details><summary>글에 사용한 공개 자료</summary><ul>{selected.sources.map(source=><li key={source.url+source.label}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul></details>
    <Button variant="weak" display="block" onClick={()=>select(null)}>목록으로 돌아가기</Button></article>;
  const term=query.trim().toLocaleLowerCase('ko');
  const found=articles.filter(a=>(!field||a.fields.includes(field))&&[a.name,...a.aliases,...a.fields].some(word=>word.toLocaleLowerCase('ko').includes(term)));
  return <section><h1>유명인 사주</h1><p>공개 이력과 명식을 함께 읽는 인물 이야기예요. 이름이나 활동 분야로 글을 찾아보세요.</p>
    {slug&&!selected&&<p role="alert">공개된 글을 찾을 수 없어요. 목록에서 다른 이야기를 골라 주세요.</p>}
    <TextField variant="box" label="이름·분야 검색" labelOption="sustain" aria-label="이름·분야 검색" type="search" value={query} onChange={e=>move({query:e.target.value,slug:''},true)}/>
    <label className="field">활동 분야<select aria-label="활동 분야" value={field} onChange={e=>move({field:e.target.value,slug:''})}><option value="">전체 분야</option>{[...new Set(articles.flatMap(article=>article.fields))].sort().map(value=><option key={value}>{value}</option>)}</select></label>
    <p role="status">{found.length?found.length+'편의 이야기':'일치하는 글이 없어요. 이름이나 분야를 바꿔 보세요.'}</p>
    {found.map(a=><button className="record" key={a.slug} id={'article-'+a.slug} onClick={()=>{lastArticle.current=a.slug;select(a);}}><strong>{a.name}</strong><small>{a.fields.join(' · ')}</small></button>)}
  </section>;
}
