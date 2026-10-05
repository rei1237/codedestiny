"use client";
import dynamic from 'next/dynamic';
import { asRecord as object, asList as list, storedText as text } from '@/lib/records/reading-content';
import { useLocale } from '@/lib/i18n/useT';
import { SavedChapters, SavedText } from './SavedReadingParts';
import { SavedFigures, SavedSaju } from './SavedCharts';
import AnimalSymbol, { type AnimalSymbolName } from '@/app/components/icons/AnimalSymbol';
import type { NamingV2ReportProps } from '@/app/naming-ai/v2/NamingV2Report';
import styles from './saved-reading.module.css';
const NamingV2Report = dynamic(()=>import('@/app/naming-ai/v2/NamingV2Report'));
const ANIMALS: Record<string,AnimalSymbolName>={cat:'cat',puppy:'dog',dog:'dog',rabbit:'rabbit',lion:'lion',pig:'pig',elephant:'elephant',deer:'deer',bluebird:'bird',bird:'bird',fox:'fox'};
export function SavedYoga({row}:{row:Record<string,unknown>}) {
 const locale=useLocale(), meta=object(row.course_metadata), sequence=list(row.sequence);
 if(!sequence.length)return <SavedChapters value={row}/>;
 return <div className={styles.practice}><header className={styles.practiceCover}><h2>{text(meta.title)}</h2><p>{[meta.deity_theme,meta.focus_area,meta.chakra_focus].filter(v=>typeof v==='string').join(' · ')}</p>{typeof meta.duration_min==='number'&&<p>{meta.duration_min} {locale==='ko'?'분':'min'}</p>}</header>
 {sequence.map((raw,index)=>{const step=object(raw);return <details className={styles.practiceStep} key={index} open={index===0}><summary><span>{index+1}</span><div><h3>{text(step.english_name)}</h3><p>{text(step.sanskrit_name)}</p></div>{typeof step.duration_seconds==='number'&&<span>{step.duration_seconds}{locale==='ko'?'초':'s'}</span>}</summary><div className={styles.practiceBody}><ol>{list(step.instructions).filter((v):v is string=>typeof v==='string').map((instruction,i)=><li key={i}>{instruction}</li>)}</ol><SavedChapters value={{breathing_guide:step.breathing_guide,benefits_physical:step.benefits_physical,benefits_spiritual:step.benefits_spiritual,caution:step.caution,visual_cue_ui:step.visual_cue_ui}} showEmpty={false}/></div></details>;})}
 <SavedChapters value={{closing_mantra:row.closing_mantra}} showEmpty={false}/>
 </div>;
}
export function SavedGeomancy({row}:{row:Record<string,unknown>}) {
 const cards=object(row.cards);
 return <div className={styles.notebook}><div className={styles.oracleCards}>{['cause','flow','judge'].map(key=>{
  const card=object(cards[key]);if(!Object.keys(card).length)return null;
  return <section className={styles.oracleCard} key={key}><h2>{text(card.role)}</h2><p className={styles.sigil}>{text(card.symbol)}</p><h3>{text(card.korean||card.name)}</h3><p>{text(card.english)}</p><SavedChapters value={{meaning:card.meaning,advice:card.advice}} showEmpty={false}/></section>;
 })}</div><SavedFigures value={row.figures||object(row.shieldChart).figures||row.shield}/><SavedChapters value={row} omit={['cards','figures','shieldChart','shield']}/></div>;
}
export function SavedTotem({row}:{row:Record<string,unknown>}) {
 return <div className={styles.totem}><div className={styles.totemSpread}>{list(row.cards||row.animals).map((raw,index)=>{
  const card=object(raw), symbol=ANIMALS[text(card.animalId)], name=text(card.animalName||card.nameKo||card.name);
  return <section className={styles.totemCard} key={index}>{symbol&&<AnimalSymbol name={symbol} size={80}/>}<h2>{name}</h2><p>{text(card.essence)}</p><SavedChapters value={{actions:card.actions,meaning:card.meaning,description:card.description}} showEmpty={false}/></section>;
 })}</div><SavedChapters value={row} fields={['narrative','animalReadings']} omit={['cards','animals']}/></div>;
}
export function SavedNaming({row}:{row:Record<string,unknown>}) {
 const engine=object(row.engine);
 if(Array.isArray(engine.candidates)&&Array.isArray(object(engine.saju).useful)&&Array.isArray(object(engine.surname).strokes)&&engine.candidates.every(raw=>{const candidate=object(raw);return Array.isArray(candidate.chars)&&Array.isArray(object(candidate.strokes).surname)&&Array.isArray(object(candidate.sound).elements)&&candidate.grids&&candidate.grades&&candidate.samjae&&candidate.scores;})) return <NamingV2Report engine={engine as NamingV2ReportProps['engine']} narration={row.narration as NamingV2ReportProps['narration']} tier="paid" exportExpand/>;
 return <div className={styles.letter}><SavedSaju value={row.sajuSnapshot||row.sajuResult}/><div className={styles.nameCards}>{list(row.nameCards).map((raw,index)=>{
 const card=object(raw);return <section className={styles.nameCard} key={index}><h2>{text(card.name)}</h2><p className={styles.hanja}>{text(card.hanja)}</p><SavedChapters value={card} fields={['meaning','elements','soundFlow','suri']} showEmpty={false}/></section>;
 })}</div><SavedChapters value={row} omit={['nameCards','sajuSnapshot','sajuResult']} fields={['finalPick']}/></div>;
}

