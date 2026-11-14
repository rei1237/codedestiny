import {reviewServices} from './review-scope.mjs';
import './review-home.css';

const internalLinks=new Set([...reviewServices.filter(service=>service.group!=='상담').map(service=>service.href),'/settings','/library','/recovery','/support']);

export default function ReviewHome({onInternalOpen}:{onInternalOpen?:(href:string)=>void}){
  const [today,...services]=reviewServices;
  return <div className="review-home" onClick={event=>{
    if(!onInternalOpen||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const anchor=(event.target as HTMLElement).closest('a');
    const href=anchor?.getAttribute('href');
    if(anchor?.target||!href||!internalLinks.has(href))return;
    event.preventDefault();onInternalOpen(href);
  }}>
    <header className="unified-brand"><img src="/assets/yeoni-flower-pig.webp" alt="" width={40} height={40}/><strong>꿀꿀운세</strong><a href="/settings">내 정보</a></header>
    <h1>오늘, 무엇이 궁금하세요?</h1>
    <a className="review-today" href={today.href}>
      <div><h2>{today.title}</h2><p>{today.description}</p><span>오늘의 운세 보기</span></div>
      <img src="/images/fortune-tea-house/flower-pig-flower.webp" alt="" width={120} height={130}/>
    </a>
    {['사주','상담'].map(group=><section key={group}>
      <h2>{group}</h2>
      <div className="review-links">{services.filter(row=>row.group===group).map(row=>
        <a key={row.id} href={row.href}><span><strong>{row.title}</strong><small>{row.description}</small></span><span aria-hidden="true">›</span></a>
      )}</div>
    </section>)}
    <footer className="review-support"><a href="/library">기록 보관함</a><a href="/recovery">구매 복구</a><a href="/support">고객지원</a></footer>
  </div>;
}
