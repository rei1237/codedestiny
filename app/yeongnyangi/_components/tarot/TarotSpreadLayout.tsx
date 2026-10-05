'use client';
import type {CSSProperties} from 'react';
import type {TarotSpreadSlot} from '../../_lib/api';
import {yeongnyangiCardArt} from '@/lib/tarot/yeongnyangi-deck';
import {tarotSpreadCopyFor} from '../../_lib/tarot-spread-copy';
import TarotCardArt from '../TarotCardArt';
import styles from './tarot-spread.module.css';

export type SpreadShape={title:string;positions:readonly {id:string;label:string;question:string;drawOrder:number;readOrder:number}[];
 layout:{kind:string;slots:readonly TarotSpreadSlot[]};symmetry?:{a:readonly string[];b:readonly string[]}};
// open=false draws a face-down card in the slot (picked, not yet revealed); no entry leaves the slot empty.
export type SlotCard={cardCode?:string;reversed?:boolean;open:boolean};

/** One spread drawn from its stored slots: desktop and mobile coordinates, the Celtic crossing card, A/B sides. */
// numbering='draw' labels slots in pick order (the pick screen); everything else uses the reading order.
export default function TarotSpreadLayout({spread,cards={},active,size='mini',list=true,locale='ko',numbering='read'}:{spread:SpreadShape;cards?:Record<string,SlotCard|undefined>;active?:string;size?:'mini'|'full';list?:boolean;locale?:string;numbering?:'read'|'draw'}){
 const copy=tarotSpreadCopyFor(locale);
 const slots=spread.layout.slots,max=(pick:(slot:TarotSpreadSlot)=>number)=>Math.max(1,...slots.map(pick));
 const byId=new Map(spread.positions.map(position=>[position.id,position]));
 const side=(id:string)=>spread.symmetry?.a.includes(id)?'a':spread.symmetry?.b.includes(id)?'b':undefined;
 const ordered=[...spread.positions].sort((a,b)=>a.readOrder-b.readOrder);
 const center=ordered[0]?.id;
 const grid={'--cols':max(s=>s.desktop.col+(s.span||1)-1),'--mcols':max(s=>s.mobile.col+(s.span||1)-1)} as CSSProperties;
 const cardName=(card?:SlotCard)=>card?.open&&card.cardCode?`${yeongnyangiCardArt(card.cardCode,locale).name} · ${card.reversed?copy.reversed:copy.upright}`:'';
 return <div className={styles.spread}>
  <div className={styles.map} data-kind={spread.layout.kind} data-size={size} style={grid} role="img" aria-label={copy.mapLabel(spread.title)}>
   {slots.map(slot=>{
    const position=byId.get(slot.id),card=cards[slot.id];
    if(!position)return null;
    const style={'--c':slot.desktop.col,'--r':slot.desktop.row,'--mc':slot.mobile.col,'--mr':slot.mobile.row,'--span':slot.span||1} as CSSProperties;
    return <div key={slot.id} className={styles.slot} style={style} data-cross={slot.cross||undefined} data-side={side(slot.id)} data-center={slot.id===center&&!slot.cross||undefined} data-active={active===slot.id||undefined} data-filled={card?true:undefined}>
     <span className={styles.frame} data-reversed={card?.open&&card.reversed||undefined}>{card?<TarotCardArt cardCode={card.open?card.cardCode:undefined} locale={locale}/>:null}</span>
     <b className={styles.badge}>{numbering==='draw'?position.drawOrder:position.readOrder}</b>
     {size==='full'&&!slot.cross&&<small className={styles.caption}>{position.label}</small>}
    </div>;
   })}
  </div>
  {list&&<ol className={styles.positions}>{ordered.map(position=>{
   const card=cards[position.id];
   return <li key={position.id} data-active={active===position.id||undefined}><b>{position.readOrder}</b><div><strong>{position.label}</strong><span>{position.question}</span>{cardName(card)&&<em>{cardName(card)}</em>}</div></li>;
  })}</ol>}
 </div>;
}
