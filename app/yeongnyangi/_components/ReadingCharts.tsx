'use client';
import {useState} from 'react';
import type {ReadingChart} from '@/worker/yeongnyangi/fortune/reading-presentation';
import styles from './reading-v5.module.css';

function Wheel({chart}:{chart:ReadingChart}){
 const point=(angle:number,r:number)=>({x:150+r*Math.cos((angle-90)*Math.PI/180),y:150+r*Math.sin((angle-90)*Math.PI/180)});
 return <svg viewBox="0 0 300 300" role="img" aria-label="저장된 황경과 하우스 경계로 그린 출생 차트. 아래 목록에서 행성별 설명을 선택할 수 있어요." className={styles.wheel}>
  <circle cx="150" cy="150" r="135"/><circle cx="150" cy="150" r="96"/>
  {(chart.cusps || []).map((angle,i)=>{const p=point(angle,135);return <line key={i} x1="150" y1="150" x2={p.x} y2={p.y}/>;})}
  {chart.groups.filter(g=>typeof g.longitude==='number').map(g=>{
   const p=point(g.longitude!,96),right=p.x>=150;
   const side=chart.groups.filter(n=>typeof n.longitude==='number'&&(point(n.longitude!,96).x>=150)===right).sort((a,b)=>point(a.longitude!,96).y-point(b.longitude!,96).y);
   const y=35+side.findIndex(n=>n.id===g.id)*(230/Math.max(1,side.length-1)),x=right?295:5;
   return <g key={g.id}><line x1={p.x} y1={p.y} x2={right?275:25} y2={y}/><circle cx={p.x} cy={p.y} r="3"/><text x={x} y={y-4} textAnchor={right?'end':'start'}>{g.label}</text></g>;
  })}
 </svg>;
}
function Chart({chart,available,titles}:{chart:ReadingChart;available:Set<string>;titles:Record<string,string>}){
 const [selected,setSelected]=useState(chart.groups[0]?.id);
 const group=chart.groups.find(g=>g.id===selected)||chart.groups[0];
 if(!group)return null;
 const related=group.chapterIds.filter(id=>available.has(id));
 const timing=chart.groups.filter(g=>g.kind==='timing');
 const layout=chart.domain==='ziwei'||chart.domain==='vedic'?styles.palaces:chart.domain==='tarot'?styles.cards:chart.domain==='sukuyo'?styles.relationship:styles.chartChoices;
 return <section className={styles.chart} aria-label={chart.title}>
  <header><h3>{chart.title}</h3><p>{chart.source}</p></header>
  {chart.domain==='astrology'&&<Wheel chart={chart}/>}
  <div className={layout} role="group" aria-label={`${chart.title} 근거 선택`}>{chart.groups.filter(g=>g.kind!=='timing').map(g=><button type="button" key={g.id} aria-pressed={g.id===group.id} onClick={()=>setSelected(g.id)}>
   {g.image&&<img src={g.image} alt="" width={140} height={240} loading="lazy" className={g.reversed?styles.reversed:undefined}/>}
   <strong>{g.label}</strong>{['ziwei','vedic','tarot'].includes(chart.domain)&&<span>{g.items[0]?.value || '배치된 행성 없음'}</span>}
  </button>)}</div>
  {timing.length>0&&<div className={styles.timeline} role="group" aria-label="계산된 시기 선택"><h4>저장된 시기의 흐름</h4>{timing.map(g=><button type="button" key={g.id} aria-pressed={g.id===group.id} onClick={()=>setSelected(g.id)}>{g.label}</button>)}</div>}
  <div className={styles.chartDetail} aria-live="polite"><h4>{group.label}</h4><dl>{group.items.map((item,i)=><div key={i}><dt>{item.label}</dt><dd>{item.value}{group.label.includes('오행 분포')&&Number.isFinite(Number(item.value))&&<meter min={0} max={Math.max(1,group.items.reduce((n,item)=>n+(Number(item.value)||0),0))} value={Number(item.value)} aria-label={`${item.label}의 가중치`}/>}</dd></div>)}</dl>
   {related.length?<div><p>이 근거와 연결된 이야기</p>{related.slice(0,2).map(id=><a key={id} href={`#chapter-${id}`}>{titles[id]}</a>)}{related.length>2&&<details><summary>관련 이야기 {related.length-2}개 더 보기</summary>{related.slice(2).map(id=><a key={id} href={`#chapter-${id}`}>{titles[id]}</a>)}</details>}</div>:<p>관련 이야기가 저장되면 이곳에서 이어 읽을 수 있어요.</p>}
  </div>
  <details className={styles.limits}><summary>계산 방식과 해석의 한계</summary>{chart.limitations.map((limit,i)=><p key={i}>{limit}</p>)}</details>
 </section>;
}
export default function ReadingCharts({charts,available,titles}:{charts:ReadingChart[];available:Set<string>;titles:Record<string,string>}){
 return <section className={styles.charts} aria-label="운세별 계산 근거"><h2>이야기의 바탕을 펼쳐볼까?</h2>{charts.map(chart=><Chart key={chart.domain} chart={chart} available={available} titles={titles}/>)}</section>;
}
