import {useState} from 'react';
// Public subset of presentFortune().charts; contains no engine imports or private input.
export type ReadingChart={domain:string;title:string;source:string;cusps?:number[];limitations:string[];
 groups:{id:string;label:string;longitude?:number;items:{label:string;value:string}[];
 ziwei?:{stars:{name:string;hanja:string|null;kind:string;grade:string|null;hua?:string}[];notes:string[]}}[]};

// Display the server's saved presentation facts. Never calculate a second chart here.
function Chart({chart}:{chart:ReadingChart}){
  const [selected,setSelected]=useState(chart.groups[0]?.id);
  const group=chart.groups.find(item=>item.id===selected)||chart.groups[0];
  if(!group)return null;
  const point=(angle:number)=>({x:150+112*Math.cos((angle-90)*Math.PI/180),y:150+112*Math.sin((angle-90)*Math.PI/180)});
  return <section className="result-chart" aria-label={chart.title}>
    <h3>{chart.title}</h3><p className="muted">{chart.source}</p>
    {chart.domain==='astrology'&&<svg viewBox="0 0 300 300" className="result-wheel" role="img" aria-label="저장된 행성 위치와 하우스 경계. 정확한 수치는 아래 목록에서 확인할 수 있어요.">
      <circle cx="150" cy="150" r="130" fill="none" stroke="currentColor"/>
      {(chart.cusps||[]).map((angle,i)=>{const p=point(angle);return <line key={i} x1="150" y1="150" x2={p.x} y2={p.y} stroke="currentColor" opacity=".3"/>;})}
      {chart.groups.filter(g=>typeof g.longitude==='number').map((g,i)=>{const p=point(g.longitude!);return <g key={g.id}><circle cx={p.x} cy={p.y} r="5" fill="currentColor"/><text x={p.x} y={p.y-10} textAnchor="middle" fontSize="11">{i+1}</text></g>;})}
    </svg>}
    <div className={'result-chart-options result-chart-'+chart.domain} role="group" aria-label="계산 근거 선택">
      {chart.groups.map((item,index)=><button key={item.id} aria-pressed={group.id===item.id} onClick={()=>setSelected(item.id)}>
        <strong>{chart.domain==='astrology'&&typeof item.longitude==='number'?`${chart.groups.filter(g=>typeof g.longitude==='number').findIndex(g=>g.id===item.id)+1}. `:''}{item.label}</strong>
        {chart.domain==='ziwei'&&item.ziwei&&<span>{item.ziwei.stars.filter(star=>star.kind==='main').map(star=>star.name).join(' · ')||'주성 없음'}</span>}
        {chart.domain==='tarot'&&<span>{item.items.find(value=>value.label==='카드')?.value||`선택 카드 ${index+1}`}</span>}
      </button>)}
    </div>
    <div className="result-chart-detail" aria-live="polite"><h4>{group.label}</h4>
      <dl>{group.items.map((item,i)=><div key={i}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
      {group.ziwei&&<><ul>{group.ziwei.stars.map((star,i)=><li key={i}>{star.name}{star.hanja?` (${star.hanja})`:''}{star.grade?` · ${star.grade}`:''}{star.hua?` · ${star.hua}`:''}</li>)}</ul>{group.ziwei.notes.map((note,i)=><p key={i}>{note}</p>)}</>}
    </div>
    {!!chart.limitations.length&&<details><summary>이 계산의 한계</summary>{chart.limitations.map((text,i)=><p key={i}>{text}</p>)}</details>}
  </section>;
}
export default function ResultEvidence({charts}:{charts:ReadingChart[]}){
  return <details className="result-evidence"><summary>명식·차트와 해석 근거 확인하기</summary>{charts.map(chart=><Chart key={chart.domain} chart={chart}/>)}</details>;
}
