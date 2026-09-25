'use client';
import {useState} from 'react';
import type {ReadingChart} from '@/worker/yeongnyangi/fortune/reading-presentation';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {chartCopy,chartTerm,chartLimitation} from '../_lib/reading-chart-copy';
import styles from './reading-v5.module.css';

function Wheel({chart,locale}:{chart:ReadingChart;locale?:ReadingLocale}){
 const copy=chartCopy(locale);
 const point=(angle:number,r:number)=>({x:150+r*Math.cos((angle-90)*Math.PI/180),y:150+r*Math.sin((angle-90)*Math.PI/180)});
 return <svg viewBox="0 0 300 300" role="img" aria-label={copy.wheel} className={styles.wheel}>
  <circle cx="150" cy="150" r="135"/><circle cx="150" cy="150" r="96"/>
  {(chart.cusps || []).map((angle,i)=>{const p=point(angle,135);return <line key={i} x1="150" y1="150" x2={p.x} y2={p.y}/>;})}
  {chart.groups.filter(g=>typeof g.longitude==='number').map(g=>{
   const p=point(g.longitude!,96),right=p.x>=150;
   const side=chart.groups.filter(n=>typeof n.longitude==='number'&&(point(n.longitude!,96).x>=150)===right).sort((a,b)=>point(a.longitude!,96).y-point(b.longitude!,96).y);
   const y=35+side.findIndex(n=>n.id===g.id)*(230/Math.max(1,side.length-1)),x=right?295:5;
   return <g key={g.id}><line x1={p.x} y1={p.y} x2={right?275:25} y2={y}/><circle cx={p.x} cy={p.y} r="3"/><text x={x} y={y-4} textAnchor={right?'end':'start'}>{chartTerm(g.label,locale)}</text></g>;
  })}
 </svg>;
}
function Chart({chart,available,titles,locale}:{chart:ReadingChart;available:Set<string>;titles:Record<string,string>;locale?:ReadingLocale}){
 const copy=chartCopy(locale);
 const [selected,setSelected]=useState(chart.groups[0]?.id);
 const group=chart.groups.find(g=>g.id===selected)||chart.groups[0];
 if(!group)return null;
 const related=group.chapterIds.filter(id=>available.has(id));
 const timing=chart.groups.filter(g=>g.kind==='timing');
 const layout=chart.domain==='ziwei'||chart.domain==='vedic'?styles.palaces:chart.domain==='tarot'?styles.cards:chart.domain==='sukuyo'?styles.relationship:styles.chartChoices;
 return <section className={styles.chart} aria-label={chartTerm(chart.title,locale)}>
  <header><h3>{chartTerm(chart.title,locale)}</h3><p>{chart.source==='서버에 저장된 카드 배열'?copy.sourceCards:chart.source==='구매 당시 저장된 계산 근거'?copy.sourceStored:chart.source}</p></header>
  {chart.domain==='astrology'&&<Wheel chart={chart} locale={locale}/>}
  <div className={layout} role="group" aria-label={`${chartTerm(chart.title,locale)} · ${copy.select}`}>{chart.groups.filter(g=>g.kind!=='timing').map(g=><button type="button" key={g.id} aria-pressed={g.id===group.id} onClick={()=>setSelected(g.id)}>
   {g.image&&<img src={g.image} alt="" width={140} height={240} loading="lazy" className={g.reversed?styles.reversed:undefined}/>}
   <strong>{chartTerm(g.label,locale)}</strong>{['ziwei','vedic','tarot'].includes(chart.domain)&&<span>{g.items[0]?.value?chartTerm(g.items[0].value,locale):copy.none}</span>}
  </button>)}</div>
  {timing.length>0&&<div className={styles.timeline} role="group" aria-label={copy.timingSelect}><h4>{copy.timing}</h4>{timing.map(g=><button type="button" key={g.id} aria-pressed={g.id===group.id} onClick={()=>setSelected(g.id)}>{chartTerm(g.label,locale)}</button>)}</div>}
  <div className={styles.chartDetail} aria-live="polite"><h4>{chartTerm(group.label,locale)}</h4><dl>{group.items.map((item,i)=><div key={i}><dt>{chartTerm(item.label,locale)}</dt><dd>{chartTerm(item.value,locale)}{group.label.includes('오행 분포')&&Number.isFinite(Number(item.value))&&<meter min={0} max={Math.max(1,group.items.reduce((n,item)=>n+(Number(item.value)||0),0))} value={Number(item.value)} aria-label={copy.weight(chartTerm(item.label,locale))}/>}</dd></div>)}</dl>
   {related.length?<div><p>{copy.related}</p>{related.slice(0,2).map(id=><a key={id} href={`#chapter-${id}`}>{titles[id]}</a>)}{related.length>2&&<details><summary>{copy.more(related.length-2)}</summary>{related.slice(2).map(id=><a key={id} href={`#chapter-${id}`}>{titles[id]}</a>)}</details>}</div>:<p>{copy.empty}</p>}
  </div>
  <details className={styles.limits}><summary>{copy.limits}</summary>{chart.limitations.map((limit,i)=><p key={i} lang={chartLimitation(limit,locale)===limit?'ko':locale}>{chartLimitation(limit,locale)}</p>)}</details>
 </section>;
}
export default function ReadingCharts({charts,available,titles,locale}:{charts:ReadingChart[];available:Set<string>;titles:Record<string,string>;locale?:ReadingLocale}){
 const copy=chartCopy(locale);
 return <section className={styles.charts} aria-label={copy.section}><h2>{copy.heading}</h2>{charts.map(chart=><Chart key={chart.domain} chart={chart} available={available} titles={titles} locale={locale}/>)}</section>;
}
