import {useState} from 'react';
import {BRANCH_HANJA,BRANCH_HANGUL,STEM_HANJA,STEM_HANGUL,branchIndexOf,stemIndexOf} from '../../../lib/korean-calendar/labels.js';
import {elementOfStem,elementOfBranch,FIVE_ELEMENT_TOKENS,type FiveElement} from '../../../lib/five-element-colors';

type Pillar={key:string;ganji:string|null;tenGod:string|null};
const columns=[['year','연주','해'],['month','월주','달'],['day','일주','날'],['hour','시주','시각']] as const;
const five=Object.keys(FIVE_ELEMENT_TOKENS) as FiveElement[];
const aliases:Record<FiveElement,string>={목:'wood',화:'fire',토:'earth',금:'metal',수:'water'};
const symbols:Record<FiveElement,string>={
  목:'목(木)은 싹이 자라듯 방향을 정하고 뻗어 나가는 모습을 상징해요.',
  화:'화(火)는 불빛이 퍼지듯 마음을 표현하고 밖으로 드러내는 모습을 상징해요.',
  토:'토(土)는 흙이 뿌리를 지탱하듯 서로 다른 것을 받아들이고 자리를 잡는 모습을 상징해요.',
  금:'금(金)은 날을 다듬듯 기준을 세우고 필요한 것을 가려내는 모습을 상징해요.',
  수:'수(水)는 물길이 이어지듯 경험을 담아 두고 흐름에 맞춰 움직이는 모습을 상징해요.',
};
function letters(value:string|null){
  if(!value)return null;
  const stem=stemIndexOf(value[0]),branch=branchIndexOf(value[1]);
  if(stem<0||branch<0)return null;
  return [{ko:STEM_HANGUL[stem],han:STEM_HANJA[stem],element:elementOfStem(STEM_HANGUL[stem])},
    {ko:BRANCH_HANGUL[branch],han:BRANCH_HANJA[branch],element:elementOfBranch(BRANCH_HANGUL[branch])}];
}
export default function PillarAlmanac({pillars,counts,basis,unknownNote}:{pillars:Pillar[];counts:Record<string,number>;basis:string|null;unknownNote?:string}){
  const [opened,setOpened]=useState<FiveElement|null>(null);
  const rows=columns.map(([key,label,period])=>{const row=pillars.find(p=>p.key===key);return {key,label,period,ganji:row?.ganji,relation:row?.tenGod,glyphs:letters(row?.ganji||null)};});
  const day=rows[2].glyphs?.[0];
  const data=five.map(name=>{
    const raw=counts[name]??counts[aliases[name]],count=typeof raw==='number'&&Number.isFinite(raw)&&raw>=0?raw:null;
    const places=rows.flatMap(row=>(row.glyphs||[]).flatMap((g,i)=>g.element===name?[row.label+' '+(i?'지지':'천간')+' '+g.han+'('+g.ko+')']:[]));
    return {name,count,places};
  });
  const total=data.every(x=>x.count!==null)?data.reduce((n,x)=>n+(x.count??0),0):null;
  const surface=basis==='surface';
  const completeCounts=surface&&total!==null&&data.every(e=>e.count===e.places.length)&&rows.slice(0,3).every(r=>r.glyphs);
  return <div className="pillar-almanac">
    <section className="almanac-board" aria-label="사주 명식표">
      <div className="almanac-heading"><div><h2>사주 명식</h2><p>{day?'일간 '+day.han+'('+day.ko+')를 기준으로 읽어요.':'태어난 해부터 시각까지 읽어요.'}</p></div><span aria-hidden="true" className="almanac-seal">四柱</span></div>
      <table className="almanac-table"><caption className="almanac-sr">사주의 네 기둥과 천간·지지·십성</caption><thead><tr><td></td>{rows.map(r=><th key={r.key} scope="col" data-day={r.key==='day'}>{r.label}<small>{r.period}</small></th>)}</tr></thead>
      <tbody>{['천간','지지'].map((axis,i)=><tr key={axis}><th scope="row">{axis}</th>{rows.map(r=>{
        const g=r.glyphs?.[i];return <td key={r.key} data-day={r.key==='day'}>{g?<><b data-element={g.element}>{g.han}</b><span>{g.ko} · {g.element}</span></>:<><b className="almanac-empty">—</b><span>{r.key==='hour'?'미상':'자료 없음'}</span></>}</td>;
      })}</tr>)}<tr className="almanac-relations"><th scope="row">십성</th>{rows.map(r=><td key={r.key} data-day={r.key==='day'}>{r.glyphs&&r.key==='day'?['일간',r.relation==='일간'?null:r.relation].filter(Boolean).join(' · '):r.relation||'—'}</td>)}</tr></tbody></table>
      <p className="almanac-caption">천간은 위 글자, 지지는 아래 글자예요. 십성은 각 천간이 일간과 맺는 관계예요.</p>
      <span className="almanac-sr">{rows.map(r=>r.ganji).filter(Boolean).join(' · ')}</span>
    </section>
    {unknownNote&&<p className="almanac-note">{unknownNote}</p>}
    <section className="almanac-elements" aria-label="오행 분포">
      <div className="almanac-subhead"><h2>나의 오행 분포</h2>{completeCounts&&<small>명식 {total}글자 기준</small>}</div>
      <p>{surface?'오행을 누르면 어느 기둥의 글자인지 볼 수 있어요.':'계산 엔진이 제공한 오행별 값을 표시해요.'}</p>
      <div className="almanac-bars">{data.map(({name,count,places})=>{
        const expanded=opened===name;const canExpand=surface&&count!==null&&places.length===count;
        const label=<><span className="almanac-element-name"><b>{FIVE_ELEMENT_TOKENS[name].hanja}</b>{name}</span>
          <span className="almanac-track" aria-hidden="true"><i style={{width:total&&count!==null?(100*count/total)+'%':'0%'}}/></span>
          <span className="almanac-quantity">{count??'—'}{count!==null&&surface&&<small>개</small>}</span>
          <span className="almanac-toggle" aria-hidden="true">{canExpand?(expanded?'−':'+'):''}</span></>;
        return <div key={name} className="almanac-band" data-element={name}>{canExpand?<button type="button" aria-expanded={expanded} aria-label={name+' '+count+'개, 해당 글자'} onClick={()=>setOpened(expanded?null:name)}>{label}</button>:<div className="almanac-static">{label}</div>}
          {expanded&&canExpand&&<div className="almanac-evidence"><p>{places.length?places.join(' · '):'명식에 드러난 천간과 지지에는 이 오행이 없어요.'}</p><p>{symbols[name]}</p></div>}</div>;
      })}</div>
      <p className="almanac-footnote">{surface?'지장간(지지 속의 천간)은 이 개수에 포함하지 않아요. ':''}개수만으로 성격이나 운의 강약을 정하지 않아요.</p>
    </section>
  </div>;
}
