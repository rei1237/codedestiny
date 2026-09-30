import {ganji} from '../korean-calendar/ganji.js';
import {TAROT_CARDS} from './tarot-cards.mjs';

const STEMS=['갑','을','병','정','무','기','경','신','임','계'] as const;
const ELEMENTS=['wood','wood','fire','fire','earth','earth','metal','metal','water','water'] as const;
const TAGS=['식상','비겁','편인','재성','정관','정인','식상','비겁','정인','편인','역마','정관','편인','편관','식신','겁재','편관','식신','편인','식신','정관','재성'] as const;
const ELEMENT_LABEL={wood:'나무',fire:'불',earth:'흙',metal:'금속',water:'물'} as const;
const ELEMENT_ORDER=['wood','fire','earth','metal','water'] as const;
const LUCK={
 wood:{color:'청록',number:3,direction:'동쪽',item:'초록 리본',mission:'미뤄 둔 일의 첫 단계를 10분만 시작하기'},
 fire:{color:'산호빛',number:7,direction:'남쪽',item:'작은 등불',mission:'마음을 짧고 분명한 한 문장으로 표현하기'},
 earth:{color:'황금빛',number:5,direction:'가운데',item:'생선 동전',mission:'오늘 지킬 현실적인 기준 하나를 적기'},
 metal:{color:'은빛',number:9,direction:'서쪽',item:'은빛 방울',mission:'하지 않을 일 하나를 정하고 경계를 지키기'},
 water:{color:'남색',number:1,direction:'북쪽',item:'달빛 찻잔',mission:'결론 전에 확인할 사실 한 가지를 찾기'},
} as const;

export type DailyTarotElement=keyof typeof ELEMENT_LABEL;
export type DailyTarotReading={dateKey:string;cardCode:string;cardName:string;orientation:'upright'|'reversed';orientationLabel:string;dayPillar:string;dayElement:DailyTarotElement;projectedElement:DailyTarotElement;tag:string;message:string;reading:string;advice:string;luck:(typeof LUCK)[DailyTarotElement]};

function hash(input:string){let value=2166136261;for(const char of input){value^=char.codePointAt(0)!;value=Math.imul(value,16777619);}value^=value>>>16;value=Math.imul(value,2246822507);value^=value>>>13;return value>>>0;}
const next=(element:DailyTarotElement,steps:number)=>ELEMENT_ORDER[(ELEMENT_ORDER.indexOf(element)+steps+5)%5];
export function projectTarotElement(dayElement:DailyTarotElement,tag:string):DailyTarotElement{
 if(['비겁','겁재'].includes(tag))return dayElement;
 if(['식상','식신','역마'].includes(tag))return next(dayElement,1);
 if(tag==='재성')return next(dayElement,2);
 if(['정관','편관'].includes(tag))return next(dayElement,-2);
 return next(dayElement,-1);
}
export function kstDateKey(now=new Date()){return new Date(now.getTime()+9*3600000).toISOString().slice(0,10);}
export function dailyTarotReading(dateKey:string,deviceId=''):DailyTarotReading{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(dateKey))throw new Error('INVALID_DATE_KEY');
 const value=hash(`${dateKey}:${deviceId}`),cardIndex=value%22,orientation=(Math.floor(value/22)%2?'reversed':'upright') as 'upright'|'reversed';
 return readingForCard(dateKey,cardIndex,orientation);
}

// Draw without replacement; the first card preserves the existing daily seed.
export function dailyTarotSpread(dateKey:string,deviceId=''):DailyTarotReading[]{
 const first=dailyTarotReading(dateKey,deviceId),remaining=Array.from({length:22},(_,i)=>i).filter(i=>TAROT_CARDS[i].code!==first.cardCode);
 const cards=[first];
 for(let position=1;position<3;position++){
  const seed=hash(`${dateKey}:${deviceId}:spread:${position}`);
  const [index]=remaining.splice(seed%remaining.length,1);
  cards.push(readingForCard(dateKey,index,Math.floor(seed/22)%2?'reversed':'upright'));
 }
 return cards;
}

function readingForCard(dateKey:string,cardIndex:number,orientation:'upright'|'reversed'):DailyTarotReading{
 const card=TAROT_CARDS[cardIndex],tag=TAGS[cardIndex];
 const [year,month,day]=dateKey.split('-').map(Number),pillar=ganji({year,month,day,hour:12,minute:0});
 if(!pillar)throw new Error('GANJI_UNAVAILABLE');
 const dayElement=ELEMENTS[pillar.day.stemIndex],projectedElement=projectTarotElement(dayElement,tag),meaning=card[orientation];
 const reading=meaning.daily?.[0]||meaning.coreMeaning,advice=meaning.advice?.[0]||meaning.adviceText;
 return {dateKey,cardCode:card.code,cardName:card.nameKo,orientation,orientationLabel:orientation==='reversed'?'역방향':'정방향',dayPillar:`${STEMS[pillar.day.stemIndex]}일`,dayElement,projectedElement,tag,
  message:`${card.nameKo}의 ${tag} 기운이 오늘의 ${ELEMENT_LABEL[dayElement]} 흐름과 만나 ${ELEMENT_LABEL[projectedElement]}의 움직임을 깨운다냥. 결과를 단정하기보다 오늘의 선택에 써보자.`,reading,advice,luck:LUCK[projectedElement]};
}

export const dailyTarotData=TAGS.map((tag,index)=>({cardCode:`M${String(index).padStart(2,'0')}`,tag}));
