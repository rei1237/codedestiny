"use client";
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { asRecord as object, asList as list, storedText as text } from '@/lib/records/reading-content';
import { useLocale } from '@/lib/i18n/useT';
import SajuPillarTable, { type SajuPillarInput } from '@/components/fortune/SajuPillarTable';
import ZiweiPalaceGrid from '@/app/components/ziwei/ZiweiPalaceGrid';
import type { RawWesternChart } from '@/types/astrology';
import { SavedText } from './SavedReadingParts';
import styles from './saved-reading.module.css';
import neoPalette from '@/src/features/neo-war-room/neo-operation-room-result.module.css';
const AstrologyChartWheel = dynamic(() => import('@/components/fortune/AstrologyChartWheel'));
const NorthIndianChart = dynamic(() => import('@/app/vedic-ai/VedicChartVisuals').then(m => m.NorthIndianChart));
const DashaTimeline = dynamic(() => import('@/app/vedic-ai/VedicChartVisuals').then(m => m.DashaTimeline));
const BodyGraph = dynamic(() => import('@/app/human-design/_components/BodyGraph'));
import type { HdChart } from '@/app/human-design/_lib/types';
import type { Locale as HdLocale } from '@/app/human-design/_copy';

const labels: Record<string,[string,string]> = {
 type:['유형','Type'], strategy:['전략','Strategy'], authority:['권위','Authority'], profile:['프로파일','Profile'], definition:['정의','Definition'],
 signature:['만족의 신호','Signature'], notSelfTheme:['주의할 신호','Not-self theme'], sun:['태양','Sun'], moon:['달','Moon'], ascendant:['상승점','Ascendant'],
 lagna:['라그나 · 상승궁','Lagna'], rashi:['라시 · 달의 별자리','Rashi'], nakshatra:['나크샤트라 · 달의 별자리 구간','Nakshatra'],
 relation:['관계','Relationship'], relationType:['관계 유형','Relationship type'], distance:['거리','Distance'], mansion:['숙','Mansion'],
 element:['오행','Element'], dayMaster:['일간','Day master'], dayStem:['일간','Day stem'], score:['저장된 점수','Saved score'],
 name:['이름','Name'], sign:['별자리','Sign'], house:['하우스','House'], degree:['도수','Degree'], longitude:['황경','Longitude'],
};
function scalar(value:unknown):string {
 if(typeof value === 'string' || typeof value === 'number') return String(value);
 const row = object(value);
 return [row.nameKo || row.name || row.label || row.sign, row.degree].filter(v => typeof v === 'string' || typeof v === 'number').join(' · ');
}
export function SavedFacts({ value }: { value:unknown }) {
 const locale=useLocale(), row=object(value);
 const entries=Object.entries(row).filter(([key,v]) => labels[key] && scalar(v));
 if(!entries.length)return null;
 return <div className={styles.tableScroll}><table className={styles.table}><tbody>{entries.map(([key,v]) => <tr key={key}><th scope="row">{labels[key][locale==='ko'?0:1]}</th><td>{scalar(v)}</td></tr>)}</tbody></table></div>;
}
export function SavedSaju({ value }: { value:unknown }) {
 const locale=useLocale(), row=object(value), raw=object(row.pillars);
 const values = Array.isArray(row.pillars) ? row.pillars : ['year','month','day','hour'].map(key=>row[key+'Pillar'] || raw[key] || row[key]);
 const names=locale==='ko'?['년주','월주','일주','시주']:['Year','Month','Day','Hour'];
 const pillars:SajuPillarInput[]=values.map((value,index)=>{
   const p=object(value);
   const ganji=text(value)||text(p.ganji)||text(p.stem||p.gan)+text(p.branch||p.zhi);
   return {label:text(p.label)||names[index]||'',ganji,emphasis:index===2};
 }).filter(p=>p.ganji.length===2);
 if(!pillars.length)return <SavedFacts value={value}/>;
 return <section className={styles.chart+' '+neoPalette.savedDocuments} style={{background:'var(--nr-bg)'}}><h2>{locale==='ko'?'저장된 사주 명식':'Saved Saju chart'}</h2><SajuPillarTable pillars={pillars}/><SavedFacts value={row}/></section>;
}
export function SavedZiwei({ value }: { value:unknown }) {
 const locale=useLocale(), row=object(value), palaces=list(row.palaces).map(object);
 if(!palaces.length)return <SavedFacts value={value}/>;
 return <section className={styles.chart}><h2>{locale==='ko'?'자미두수 명반':'Ziwei chart'}</h2><p className={styles.notice}>{locale==='ko'?'명반을 좌우로 움직여 전체 궁을 확인하세요.':'Scroll horizontally to explore the complete chart.'}</p><div className={styles.tableScroll} tabIndex={0} role="region" aria-label={locale==='ko'?'자미두수 전체 명반':'Complete Ziwei chart'}>
 <ZiweiPalaceGrid className={styles.palaces} cells={palaces} branchOf={p=>scalar(p.earthlyBranch||p.branch||p.zhi) || (typeof p.branchIndex==='number'?p.branchIndex:undefined)} renderCell={(p,area)=><div key={scalar(p.name||p.palaceName||p.branch)} className={styles.palace} style={area}><strong>{scalar(p.name||p.palaceName||p.palace)}</strong><span>{scalar(p.earthlyBranch||p.branch||p.zhi)}</span><p>{list(p.majorStars||p.stars).map(s=>scalar(object(s).nameKo||object(s).name||s)).filter(Boolean).join(' · ')}</p><p>{list(p.minorStars).map(s=>scalar(object(s).nameKo||object(s).name||s)).filter(Boolean).join(' · ')}</p></div>} center={area=><div className={styles.palaceCenter} style={area}>{locale==='ko'?'나의 명반':'Natal chart'}</div>}/>
 </div></section>;
}
export function SavedAstrology({ value }: { value:unknown }) {
 const locale=useLocale(), chart=object(value);
 const planets=Array.isArray(chart.planets)?chart.planets:Object.entries(object(chart.planets)).map(([name,v])=>({name,...object(v)}));
 const completeHouses=list(chart.houseCusps).length===12||list(chart.houses).length===12;
 if(!planets.length)return <SavedFacts value={chart}/>;
 return <section className={styles.chart}><h2>{locale==='ko'?'저장된 별자리 차트':'Saved natal chart'}</h2><div className={styles.planetWheel}>{completeHouses&&<AstrologyChartWheel highContrast chart={{...chart,planets:Array.isArray(chart.planets)?Object.fromEntries(planets.map(v=>{const p=object(v);return [text(p.name||p.planet||p.id).toLowerCase(),p];})):chart.planets} as RawWesternChart}/>}</div><div className={styles.tableScroll}><table className={styles.table}><tbody>{planets.map((v,index)=>{const p=object(v);return <tr key={index}><th scope="row">{scalar(p.nameKo||p.name||p.planet||p.id)}</th><td>{scalar(p.sign||p.zodiacSign)}</td><td>{scalar(p.longitude??p.degree)}</td></tr>;})}</tbody></table></div></section>;
}
export function SavedVedic({ value }: { value:unknown }) {
 const locale=useLocale(), chart=object(value);
 if(!Object.keys(chart).length)return null;
 return <section className={styles.chart}><h2>{locale==='ko'?'베다 차트와 시기 흐름':'Vedic chart and periods'}</h2><SavedFacts value={chart}/>{(chart.bhavas||chart.houses||chart.planets) ? <NorthIndianChart chart={chart}/> : null}{chart.vimshottariDasha || chart.dasha ? <DashaTimeline chart={chart}/> : null}</section>;
}
export function SavedHumanDesign({ value }: { value:unknown }) {
 const locale=useLocale(), chart=object(value);
 const valid=['activeGates','channels','definedCenters','activations'].every(key=>Array.isArray(chart[key]));
 return <section className={styles.chart}>{valid && <BodyGraph chart={chart as HdChart} locale={locale as HdLocale} selection={null} onSelect={()=>{}} interactive={false} staticRender highContrast/>}<SavedFacts value={chart}/></section>;
}
export function SavedCards({ value, variant }: { value:unknown; variant:string }) {
 const locale=useLocale(), cards=list(value);
 if(!cards.length)return null;
 return <div className={styles.cards} data-spread={variant}>{cards.map((raw,index)=>{
  const row=object(raw), nested=object(row.card), card={...nested,...row};
  const id=text(card.cardId||nested.id||card.id), name=text(card.nameKo||card.cardName||card.name||nested.nameKo||nested.name);
  const position=text(card.positionLabel||card.positionName||card.position||card.role);
  const body=text(card.reading||card.interpretation||card.meaning||card.description);
  return <section key={index} className={styles.card}><h3>{position || (locale==='ko'?'카드':'Card')+' '+(index+1)}</h3>{(id||name) && <SavedTarotImage name={name} english={text(card.nameEn)} reversed={card.orientation==='reversed'||card.reversed===true} image={text(card.imageUrl)}/>}{name && <p>{name}{card.orientation==='reversed'?(locale==='ko'?' · 역방향':' · Reversed'):card.orientation==='upright'?(locale==='ko'?' · 정방향':' · Upright'):''}</p>}{body && <SavedText text={body}/>}</section>;
 })}</div>;
}
export function SavedFigures({ value }: {value:unknown}) {
 const entries=Array.isArray(value)?value:Object.values(object(value));
 return <div className={styles.figures}>{entries.map((entry,index)=>{
  const row=object(entry), dots=list(row.points||row.lines||row.pattern||entry);
  if(dots.length!==4||!dots.every(n=>n===1||n===2))return null;
  return <figure className={styles.figure} key={index}><svg viewBox="0 0 64 96" role="img" aria-label={text(row.name||row.label)||'Geomancy'}>{dots.flatMap((n,i)=>(n===1?[32]:[22,42]).map(x=><circle key={i+'-'+x} cx={x} cy={14+i*22} r="4" fill="currentColor"/>))}</svg><figcaption>{text(row.name||row.label)}</figcaption></figure>;
 })}</div>;
}


function SavedTarotImage({name,english,reversed,image}:{name:string;english:string;reversed:boolean;image:string}) {
 const [failed,setFailed]=useState(false);
 const basename=english.toLowerCase().replace(/[^a-z0-9]/g,'');
 const path=image.startsWith('/tarot-cards/')?image:basename?'/tarot-cards/'+basename+'.webp':'';
 if(!path||failed)return null;
 return <img className={styles.tarotImage} src={path} alt={name} width={240} height={360} loading="lazy" onError={()=>setFailed(true)} style={{transform:reversed?'rotate(180deg)':undefined}}/>;
}
