'use client';
import {Fragment,type ReactNode} from 'react';
import type {ChapterBody} from '@/worker/yeongnyangi/fortune/book-contracts';
import type {ReadingChart} from '@/worker/yeongnyangi/fortune/reading-presentation';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {chartTerm} from '../_lib/reading-chart-copy';
import {blockChartCopy} from '../_lib/block-chart-copy';
import {ZiweiBlockHint} from './ZiweiReadingChart';
import styles from './block-chart-hints.module.css';

/**
 * 소절 옆 명반 강조 — 블록이 짚은 궁·기둥·별·자리·본명숙을 저장 차트 위에 작게 표시한다(block-anchors.ts 의 선택 필드).
 * 영냥이 책(ReadingBook)과 연이/네오 상담 결과(ConsultationResult)가 같이 쓴다. 자미 궁은 ZiweiBlockHint 가 그대로 맡는다.
 * 그림은 aria-hidden 이고 이름·값은 늘 figcaption 글자로 함께 적는다. 강조는 색과 함께 크기·테두리로도 구분한다.
 * 차트가 없거나 칸을 못 찾으면 그림 없이 글자만 둔다(옛 결과·누락 자료). 필드가 없는 소절은 아무것도 그리지 않는다.
 */
type Block=NonNullable<ChapterBody['blocks']>[number];
type Group=ReadingChart['groups'][number];
type Copy=ReturnType<typeof blockChartCopy>;
type HintProps={names:string[];chart?:ReadingChart;locale?:ReadingLocale;copy:Copy};

const MISSING=new Set(['자료 없음','없음']);
const value=(g:Group|undefined,label:string)=>{const v=g?.items.find(i=>i.label===label)?.value;return v&&!MISSING.has(v)?v:undefined;};
const withDetail=(name:string,parts:(string|undefined)[],locale?:ReadingLocale)=>{const kept=parts.filter(Boolean);return kept.length?`${chartTerm(name,locale)}(${kept.join(' · ')})`:chartTerm(name,locale);};
const point=(angle:number,r:number)=>({x:50+r*Math.cos((angle-90)*Math.PI/180),y:50+r*Math.sin((angle-90)*Math.PI/180)});

// 항목마다 한 덩어리로 줄을 바꾼다 — 괄호 안에서 끊기거나 줄 첫머리에 가운뎃점이 오지 않게 한다.
function Hint({figure,label,items}:{figure?:ReactNode;label:string;items:string[]}){
 return <figure className={styles.hint}>{figure}<figcaption>{label}: <b>{items.map((item,i)=><Fragment key={i}>{i>0&&' '}<span>{item}{i<items.length-1&&'\u00a0·'}</span></Fragment>)}</b></figcaption></figure>;
}

// 사주 — SajuBoard 와 같은 시·일·월·년 순서. 강조된 쪽(나·상대)의 줄만 그린다.
const PILLARS=['시주','일주','월주','년주'];
function SajuHint({names,chart,locale,copy}:HintProps){
 const ganji=(name:string)=>value(chart?.groups.find(g=>g.label===name),'천간·지지');
 const rows=['','상대 '].filter(prefix=>names.some(n=>n.startsWith('상대 ')===!!prefix)&&PILLARS.some(p=>ganji(prefix+p)));
 const figure=rows.length?<div className={styles.pillars} aria-hidden="true">{rows.flatMap(prefix=>PILLARS.map(p=>{const v=ganji(prefix+p);
  return <i key={prefix+p} data-on={names.includes(prefix+p)||undefined}>{v&&v.length===2?`${v[0]}\n${v[1]}`:'—'}</i>;}))}</div>:undefined;
 return <Hint figure={figure} label={copy.pillars} items={names.map(n=>[chartTerm(n,locale),ganji(n)].filter(Boolean).join(' '))}/>;
}

// 점성 — ReadingCharts Wheel 과 같은 각도(황경 0° 위, 시계 방향). 상승점은 첫 하우스 커스프 선이다.
function AstrologyHint({names,chart,locale,copy}:HintProps){
 const groups=chart?.groups||[],on=new Set(names),asc=chart?.cusps?.[0];
 const planets=groups.filter(g=>typeof g.longitude==='number').sort((a,b)=>Number(on.has(a.label))-Number(on.has(b.label)));
 const figure=planets.length?<svg className={styles.wheel} viewBox="0 0 100 100" aria-hidden="true">
  <circle className={styles.rim} cx="50" cy="50" r="44"/>
  {typeof asc==='number'&&(()=>{const a=point(asc,20),b=point(asc,48);return <line className={styles.asc} data-on={on.has('상승점')||undefined} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>;})()}
  {planets.map(g=>{const p=point(g.longitude!,44);return <circle key={g.id} className={styles.dot} data-on={on.has(g.label)||undefined} cx={p.x} cy={p.y} r={on.has(g.label)?8:3.5}/>;})}
 </svg>:undefined;
 const describe=(n:string)=>{const g=groups.find(g=>g.label===n),house=value(g,'하우스');
  return withDetail(n,[value(g,'별자리')&&chartTerm(value(g,'별자리')!,locale),n==='상승점'||!house?undefined:chartTerm(`${house}하우스`,locale)],locale);};
 return <Hint figure={figure} label={copy.astrology} items={names.map(describe)}/>;
}

// 베다 — 큰 차트(.palaces)와 같은 양자리→물고기자리 4×3 순서. 열두 별자리가 모두 있을 때만 그린다.
const SIGNS=['양자리','황소자리','쌍둥이자리','게자리','사자자리','처녀자리','천칭자리','전갈자리','사수자리','염소자리','물병자리','물고기자리'];
const LAGNA=' · 라그나';
function VedicHint({names,chart,locale,copy}:HintProps){
 const on=new Set(names),signs=(chart?.groups||[]).filter(g=>SIGNS.includes(g.label.replace(LAGNA,'')));
 const lagna=signs.find(g=>g.label.endsWith(LAGNA)),holding=(n:string)=>signs.find(g=>g.items.some(i=>i.label===n));
 const house=(g:Group|undefined,n:string)=>{const v=g?.items.find(i=>i.label===n)?.value;return v&&/^\d+하우스$/.test(v)?chartTerm(v,locale):undefined;};
 const ordered=signs.map(g=>g.label.replace(LAGNA,'')).every((sign,i)=>sign===SIGNS[i])&&signs.length===12;
 const figure=ordered?<div className={styles.signs} aria-hidden="true">{signs.map(g=>
  <i key={g.id} data-lagna={g===lagna||undefined} data-on={g.items.some(i=>on.has(i.label))||(g===lagna&&on.has('라그나'))||undefined}/>)}</div>:undefined;
 const describe=(n:string)=>{if(n==='라그나')return lagna?chartTerm(lagna.label,locale):n;
  const g=holding(n);return withDetail(n,[g&&chartTerm(g.label.replace(LAGNA,''),locale),house(g,n)],locale);};
 return <Hint figure={figure} label={copy.vedic} items={names.map(describe)}/>;
}

// 숙요 — 27숙 고리(1숙 위, 시계 방향). 두 사람의 본명숙을 찍고 강조된 쪽을 크게 그린다.
function SukuyoHint({names,chart,locale,copy}:HintProps){
 const on=new Set(names),people=['나의 본명숙','상대의 본명숙'].map(label=>chart?.groups.find(g=>g.label===label)).filter((g):g is Group=>!!g);
 const seat=(g:Group)=>{const n=Number(value(g,'27숙 위치'));return Number.isInteger(n)&&n>=1&&n<=27?n-1:undefined;};
 const placed=people.filter(g=>seat(g)!==undefined).sort((a,b)=>Number(on.has(a.label))-Number(on.has(b.label)));
 const figure=placed.length?<svg className={styles.wheel} viewBox="0 0 100 100" aria-hidden="true">
  {Array.from({length:27},(_,i)=>{const p=point(i*360/27,42);return <circle key={i} className={styles.tick} cx={p.x} cy={p.y} r="1.6"/>;})}
  {placed.map(g=>{const p=point(seat(g)!*360/27,42);return <circle key={g.id} className={styles.dot} data-on={on.has(g.label)||undefined} cx={p.x} cy={p.y} r={on.has(g.label)?8:4.5}/>;})}
 </svg>:undefined;
 return <Hint figure={figure} label={copy.mansions} items={names.map(n=>withDetail(n,[value(chart?.groups.find(g=>g.label===n),'숙')],locale))}/>;
}

export default function BlockChartHints({block,charts,locale}:{block:Block;charts?:ReadingChart[]|null;locale?:ReadingLocale}){
 const chart=(domain:string)=>charts?.find(c=>c.domain===domain),copy=blockChartCopy(locale);
 return <>
  <ZiweiBlockHint palaces={block.palaces} chart={chart('ziwei')} locale={locale}/>
  {!!block.pillars?.length&&<SajuHint names={block.pillars} chart={chart('saju')} locale={locale} copy={copy}/>}
  {!!block.astroPoints?.length&&<AstrologyHint names={block.astroPoints} chart={chart('astrology')} locale={locale} copy={copy}/>}
  {!!block.vedicPoints?.length&&<VedicHint names={block.vedicPoints} chart={chart('vedic')} locale={locale} copy={copy}/>}
  {!!block.mansions?.length&&<SukuyoHint names={block.mansions} chart={chart('sukuyo')} locale={locale} copy={copy}/>}
 </>;
}
