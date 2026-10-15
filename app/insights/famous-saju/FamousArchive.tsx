'use client';
import { useEffect, useMemo, useState } from 'react';
import { ILJU, STEMS } from '../../../lib/famous-saju/cycle';
import type { ArchivePerson } from '../../../lib/famous-saju/archive';
import { matchesFamousSearch } from '../../../lib/famous-saju/archive-search';

type Filters = { q: string; field: string; country: string; stem: string; ilju: string; sort: string; page: number; view: string };
const initial: Filters = { q:'',field:'',country:'',stem:'',ilju:'',sort:'editorial',page:1,view:'all' };
const countries: Record<string,string> = {KR:'대한민국',JP:'일본',CN:'중국',US:'미국',UK:'영국',FR:'프랑스',DE:'독일',IN:'인도',IT:'이탈리아',ES:'스페인',CA:'캐나다',AU:'호주',AR:'아르헨티나',PT:'포르투갈',BR:'브라질'};
function track(name: string, slug?: string){const w=window as unknown as {gtag?: (...args: unknown[])=>void};w.gtag?.("event",name,{event_category:"archive",...(slug?{content_slug:slug}:{})});}
export default function FamousArchive({ people }: { people: ArchivePerson[] }) {
  const [filter,setFilter] = useState(initial);
  const [ready,setReady] = useState(false);
  const [allIlju,setAllIlju] = useState(false);
  useEffect(() => {
    const read = () => { const p = new URLSearchParams(location.search); setFilter({ ...initial, ...Object.fromEntries(Object.keys(initial).map(k => [k,p.get(k) || initial[k as keyof Filters]])), page:Math.max(1,Number(p.get('page')) || 1) }); };
    setReady(true);track("archive_hub_view");read();try{const saved=JSON.parse(sessionStorage.getItem('cd.archive.scroll') || 'null');if(saved?.url===location.pathname+location.search)requestAnimationFrame(()=>requestAnimationFrame(()=>scrollTo(0,saved.y)));}catch{} window.addEventListener('popstate',read); return () => window.removeEventListener('popstate',read);
  },[]);
  function change(value: Partial<Filters>) {
    if(value.ilju)track("archive_ilju_select",value.ilju);
    const next = { ...filter,...value,page:value.page || 1 }; setFilter(next);
    const url = new URL(location.href);
    Object.entries(next).forEach(([k,v]) => { if(v === initial[k as keyof Filters]) url.searchParams.delete(k); else url.searchParams.set(k,String(v)); });
    history[value.q !== undefined ? 'replaceState' : 'pushState'](history.state,'',url);
  }
  const result = useMemo(() => people.filter(p => {
    return matchesFamousSearch(p, filter.q) && (!filter.field || p.fields.includes(filter.field))
      && (!filter.country || p.country === filter.country)
      && (!filter.stem || (p.classification === 'documented' && p.stem === filter.stem))
      && (!filter.ilju || (p.classification === 'documented' && p.dayPillar === filter.ilju));
  }).sort((a,b) => filter.sort === 'name' ? a.name.localeCompare(b.name,'ko') : Number(b.reviewed)-Number(a.reviewed)),[filter,people]);
  const page = Math.min(filter.page,Math.max(1,Math.ceil(result.length/12)));
  const visible = result.slice((page-1)*12,page*12);
  return <>
    <label className="moon-search">이름·일주 검색<input disabled={!ready} type="search" value={filter.q} placeholder="아이유, IU, 정유일주" onChange={e=>change({q:e.target.value})}/></label>
    <nav className="moon-tabs" aria-label="인물 탐색">{[['all','전체 인물'],['ilju','60일주'],['field','분야별']].map(([key,label])=><button key={key} aria-pressed={filter.view===key} onClick={()=>change({view:key,stem:'',ilju:'',field:''})}>{label}</button>)}<a href="/insights/">운세 인사이트</a></nav>
    {filter.view==='ilju' && <section aria-label="일간과 일주 탐색"><p>일간을 고른 뒤 정확한 일주로 좁혀 보세요.</p><div className="moon-chips">{STEMS.map(stem=><button key={stem} aria-pressed={filter.stem===stem} onClick={()=>change({stem,ilju:''})}>{stem} 일간</button>)}</div><button className="moon-text-button" onClick={()=>setAllIlju(!allIlju)} aria-expanded={allIlju}>60일주 전체 보기</button><div className="moon-chips">{ILJU.filter(x=>(allIlju || x.stem===filter.stem) && (!filter.q || (x.name+'일주').includes(filter.q) || !allIlju)).map(x=><button key={x.name} aria-pressed={filter.ilju===x.name} onClick={()=>change({ilju:x.name,stem:x.stem,q:''})}>{x.name} <small>{people.filter(p=>p.classification==='documented' && p.dayPillar===x.name).length}</small></button>)}</div>{filter.ilju && <a className="moon-primary" href={"/insights/famous-saju/ilju/"+ILJU.find(x=>x.name===filter.ilju)?.slug+"/"}>{filter.ilju}일주 해설과 계산 후보 읽기</a>}<p className="moon-muted">수량은 날짜 경계까지 검증된 인물 기준입니다. 현재 자료는 검토 중이며, 계산 후보는 일주 해설에서 따로 볼 수 있어요.</p></section>}
    <details open={filter.view==='field' || Boolean(filter.field || filter.country)}><summary className="moon-reading-summary">분야·국가·정렬 {filter.field || filter.country ? '· 필터 적용 중' : ''}</summary><div className="moon-filters"><label>분야<select value={filter.field} onChange={e=>change({field:e.target.value})}><option value="">전체 분야</option>{[...new Set(people.flatMap(p=>p.fields))].sort().map(x=><option key={x}>{x}</option>)}</select></label><label>국가<select value={filter.country} onChange={e=>change({country:e.target.value})}><option value="">전체 국가</option>{[...new Set(people.map(p=>p.country))].sort().map(x=><option key={x} value={x}>{countries[x] || x || '확인 중'}</option>)}</select></label><label>정렬<select value={filter.sort} onChange={e=>change({sort:e.target.value})}><option value="editorial">편집 추천</option><option value="name">이름순</option></select></label></div></details>
    <p role="status">전체 {people.length}명 · 검색 결과 {result.length}명 · 현재 {visible.length}명 표시 {filter.ilju && `· ${filter.ilju}일주`} <button className="moon-text-button" onClick={()=>change(initial)}>초기화</button></p>
    {!result.length && <p className="moon-empty">확인된 인물 자료를 준비하고 있어요. 다른 일주나 검색어로 찾아보세요. <a href="/insights/saju/">사주 해설 읽기</a></p>}
    <div className="moon-person-grid">{visible.map(p=><a className="moon-person" onClick={()=>{track("archive_person_open",p.slug);try{sessionStorage.setItem("cd.archive.scroll",JSON.stringify({url:location.pathname+location.search,y:scrollY}));}catch{}}} key={p.slug} href={`/insights/famous-saju/${p.slug}/`}><img src={p.cover} srcSet={p.cover+" 480w, "+p.cover.replace("480.webp","960.webp")+" 960w"} sizes="(min-width:1050px) 340px, 88px" width="480" height="320" loading="lazy" alt=""/><div><p className="moon-muted">{p.fields.join(' · ')}</p><h2>{p.name}</h2><p><strong>{p.dayPillar ? `${p.dayPillar}일주${p.classification==='needs_review' ? ' (계산 후보)' : ''}` : '일주 확인 중'}</strong> · 출생시간 미확인</p><p>{p.intro}</p><small>{p.classificationNote}</small><span className="moon-card-link">인물 풀이 읽기 →</span></div></a>)}</div>
    <nav className="moon-pagination" aria-label="페이지 이동"><button disabled={page===1} onClick={()=>change({page:page-1})}>이전</button><span>{page} / {Math.max(1,Math.ceil(result.length/12))}</span><button disabled={page*12>=result.length} onClick={()=>change({page:page+1})}>다음</button></nav>
  </>;
}
