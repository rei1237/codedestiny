import type {ReadingChart} from '@/worker/yeongnyangi/fortune/reading-presentation';
import type {PublicTarotSpread} from './api';

export type TarotRitualStage='focus'|'shuffle'|'choose'|'reveal'|'reading';
export type TarotRitualProgress={stage:TarotRitualStage;selected:number[];revealed:number;completed?:boolean};
const stages:TarotRitualStage[]=['focus','shuffle','choose','reveal','reading'];
const key=(id:string)=>`cd:yn:tarot-ritual:v1:${id}`;

// This remembers presentation only. Saved cards and paid access still come from
// the server; reading a progress marker must not load the card-picking UI.
export function storedRitual(id:string):TarotRitualProgress|null{
 try{const value=JSON.parse(localStorage.getItem(key(id))||'null');return value&&stages.includes(value.stage)&&Array.isArray(value.selected)&&Number.isInteger(value.revealed)?value:null;}catch{return null;}
}
export function tarotRitualCompleted(id:string){return storedRitual(id)?.completed===true;}
export function saveRitual(id:string,value:TarotRitualProgress){try{localStorage.setItem(key(id),JSON.stringify(value));}catch{/* The saved cards stay on the server; storage only remembers presentation progress. */}}

/** Saved cards keyed by position; never build a partial spread. */
export function spreadCards(spread:PublicTarotSpread,chart?:ReadingChart):Record<string,{cardCode:string;reversed:boolean}>|undefined{
 const cards=Object.fromEntries((chart?.groups||[]).filter(group=>group.positionKey&&group.cardCode).map(group=>[group.positionKey!,{cardCode:group.cardCode!,reversed:Boolean(group.reversed)}]));
 return spread.positions.every(position=>cards[position.id])?cards:undefined;
}
