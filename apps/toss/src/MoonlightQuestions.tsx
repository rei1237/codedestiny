import {useState} from 'react';
import {filterConcerns,questionCheckoutHref,questionGuides} from '../../../lib/fortune/question-journey';

export default function MoonlightQuestions(){
  const [search,setSearch]=useState('');
  const matches=search.trim()?filterConcerns(search):questionGuides;
  return <section className="moonlight-questions">
    <h2>지금, 어떤 마음인가요?</h2>
    <label>고민으로 질문 찾기<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="재회, 이직, 돈…"/></label>
    <ul>{matches.map(guide=><li key={guide.id}><a href={questionCheckoutHref(guide)}><small>{guide.group}</small><strong>{guide.question}</strong><span aria-hidden>›</span></a></li>)}</ul>
    {matches.length===0&&<p role="status">맞는 질문이 없으면 <a href="/yeongnyangi/fortune/?flow=question">내 고민을 직접 적어 주세요.</a></p>}
  </section>;
}
