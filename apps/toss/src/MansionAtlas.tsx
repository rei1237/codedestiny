import {useEffect,useRef} from 'react';
import articles from 'virtual:toss-mansion-atlas';
import {Button} from './Button';

export default function MansionAtlas({index,onOpen}:{index:number|null;onOpen:(index:number|null)=>void}){
  const article=index===null?undefined:articles[index],heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{heading.current?.focus();},[index]);
  if(!article)return <section><h1 tabIndex={-1} ref={heading}>27수 별자리 도감</h1>
    <p>같은 별을 두 전통은 어떻게 읽었을까요? 숙요의 별과 인도 나크샤트라를 대표 별 기준으로 짝지어 살펴보세요.</p>
    {articles.map(a=><button className="record" key={a.index} onClick={()=>onOpen(a.index)}><strong>{a.eastern.name}수 · {a.indian.name}</strong><small>{a.eastern.title}</small></button>)}
  </section>;
  const {eastern:e,indian:n}=article;
  return <article><h1 ref={heading} tabIndex={-1}>{e.name}수({e.han}) · {n.name}</h1>
    <h2>숙요에서 읽는 {e.name}수</h2><p>{e.direction} · {e.title}</p><p>{e.keywords.join(' · ')}</p>
    <p>강점으로 읽는 상징: {e.strengths.join(' · ')}</p>{e.shadows.length>0&&<p>균형을 살펴볼 상징: {e.shadows.join(' · ')}</p>}
    <h2>인도에서 읽는 {n.name}</h2><p>{n.nameEn}의 상징은 {n.symbol}예요. 이 별에 담긴 힘을 ‘{n.power}’으로 표현해요.</p>
    <dl className="daily-basis"><div><dt>지배하는 행성</dt><dd>{n.planet}</dd></div><div><dt>주신</dt><dd>{n.deity}</dd></div><div><dt>근원 동기</dt><dd>{n.motive}</dd></div></dl>
    <details><summary>별자리를 네 부분으로 나누면</summary><p>{n.padas.map((p,i)=>(i+1)+'파다 '+p).join(' · ')}</p></details>
    <h2>두 전통이 만나는 지점</h2><p>{article.convergence}</p><p>{article.divergence}</p>
    <Button variant="weak" onClick={()=>onOpen((article.index+26)%27)}>이전 별</Button><Button onClick={()=>onOpen((article.index+1)%27)}>다음 별</Button>
    <Button variant="weak" display="block" onClick={()=>onOpen(null)}>도감 차례로</Button>
  </article>;
}
