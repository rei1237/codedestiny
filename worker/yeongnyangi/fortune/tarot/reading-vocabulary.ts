import {getYeongnyangiDeckText} from '../../../../lib/tarot/yeongnyangi-deck-copy.mjs';
import {TAROT_CARDS} from '../../../../lib/tarot/tarot-cards.mjs';
import {localizedTarotPosition} from '../../../../lib/tarot/yeongnyangi-display-locales';
import {tarotSpreadPosition} from '../../../../lib/tarot/yeongnyangi-spread-locales';
import type {ReadingLocale} from '../reading-locale';
import type {DomainContext} from '../shared/contracts';
import {savedTarotConsultation} from './consultation-prompt';

export const tarotOrientation:Record<ReadingLocale,readonly [string,string]>={
 ko:['정방향','역방향'],en:['Upright','Reversed'],ja:['正位置','逆位置'],'zh-CN':['正位','逆位'],'zh-TW':['正位','逆位'],
 vi:['Xuôi','Ngược'],hi:['सीधा','उल्टा'],es:['Derecha','Invertida'],fr:['À l’endroit','Renversée'],de:['Aufrecht','Umgekehrt'],nl:['Rechtop','Omgekeerd'],ms:['Tegak','Terbalik'],
};
export function tarotReadingVocabulary(context:DomainContext,locale:ReadingLocale){
 const evidence=savedTarotConsultation(context);
 const raw=context.facts.find(f=>f.label==='cards'||f.id==='tarot.cards')?.value;
 const saved=new Set((Array.isArray(raw)?raw:[]).map(c=>String(c.cardId||c.code||'').toUpperCase()));
 return {cardNameFormat:'Use the supplied localized card names. When naming a card, write name (orientation). Keep its stored position and orientation. Do not invent a card. Translate the position meaning, not its evidence IDs.',
  orientations:tarotOrientation[locale],
  cards:TAROT_CARDS.filter(card=>saved.has(card.code)).map(card=>({id:card.code,name:getYeongnyangiDeckText(`tarot.${card.code}.name`,locale)})),
  positions:(evidence?.cards||[]).map(card=>({id:card.positionKey,original:card.positionLabel,label:
   evidence?.version==='yeongnyangi-tarot-consultation-v3'?tarotSpreadPosition(card.positionKey,card.positionLabel,locale):localizedTarotPosition(card.positionLabel,locale)}))};
}
const escape=(text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// Normalize explicit card mentions into the existing validator's canonical vocabulary.
// This retains its undrawn-card, orientation and nearby-position checks without a new result schema.
export function canonicalTarotProse(content:string,context:DomainContext,locale:ReadingLocale){
 if(locale==='ko')return content;
 const vocabulary=tarotReadingVocabulary(context,locale);
 let result=content.normalize('NFC');
 const [upright,reversed]=tarotOrientation[locale];
 for(const card of TAROT_CARDS){
  const names=new Set([getYeongnyangiDeckText(`tarot.${card.code}.name`,locale),getYeongnyangiDeckText(`tarot.${card.code}.name`,'en')]);
  for(const name of names){
   const pattern=new RegExp(`${escape(name)}\\s*[（(]?\\s*(${escape(upright)}|${escape(reversed)}|upright|reversed)\\s*[）)]?`,'giu');
   result=result.replace(pattern,(_match,direction:string)=>`${card.nameKo} 카드 ${[reversed.toLowerCase(),'reversed'].includes(direction.toLowerCase())?'역방향':'정방향'}`);
  }
 }
 const unique=vocabulary.positions.filter(p=>p.label!==p.original&&vocabulary.positions.filter(q=>q.label===p.label).length===1);
 for(const p of unique.sort((a,b)=>b.label.length-a.label.length))result=result.split(p.label).join(p.original);
 return result;
}
