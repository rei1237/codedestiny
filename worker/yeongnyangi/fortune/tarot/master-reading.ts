import {TAROT_CARDS} from '../../../../lib/tarot/tarot-cards.mjs';
import {yeongnyangiCardMetadata} from '../../../../lib/tarot/yeongnyangi-deck';
import type {ChapterBody, ChapterSpec} from '../book-contracts';
import type {DomainContext} from '../shared/contracts';
import {FortuneError} from '../shared/contracts';
import type {ReadingLocale} from '../reading-locale';
import {savedTarotConsultation,tarotConsultationPrompt} from './consultation-prompt';

type SavedCard={cardId?:string;code?:string;name?:string;nameKo?:string;nameKr?:string;position?:string;positionKey?:string;orientation?:string};

const SUIT_ELEMENT:Record<string,string>={wands:'fire/action',cups:'water/emotion',swords:'air/thought',pentacles:'earth/reality'};
const CRISIS=/(?:자살|자해|죽고\s*싶|삶을\s*끝|극단적\s*선택|suicid|self[- ]?harm|kill\s+myself|end\s+my\s+life|自殺|自伤|自傷|死にたい|不想活|结束生命|結束生命)/iu;
const SAFETY_NOTICE:Record<ReadingLocale,string>={
 ko:'지금 자신을 해칠 생각이 있거나 당장 안전하지 않다면, 카드 해석보다 안전이 먼저예요. 혼자 있지 말고 가까운 사람과 지역 응급기관에 바로 도움을 요청해 주세요.',
 en:'If you may hurt yourself or are not safe right now, your safety comes before this reading. Stay with someone you trust and contact local emergency or crisis support now.',
 ja:'今、自分を傷つけるおそれがある、または安全でない場合は、カード解釈より安全が最優先です。一人にならず、信頼できる人と地域の緊急・危機支援へ今すぐ連絡してください。',
 'zh-CN':'如果你现在可能伤害自己或并不安全，安全比牌面解读更重要。请不要独处，立即联系可信任的人以及当地紧急或危机援助。',
 'zh-TW':'如果你現在可能傷害自己或並不安全，安全比牌面解讀更重要。請不要獨處，立即聯絡可信任的人以及當地緊急或危機支援。',
 vi:'Nếu bạn có thể làm hại bản thân hoặc đang không an toàn, sự an toàn quan trọng hơn phần đọc bài. Hãy ở cùng người bạn tin cậy và liên hệ hỗ trợ khẩn cấp hoặc khủng hoảng tại địa phương ngay.',
 hi:'यदि आपको खुद को नुकसान पहुँचाने का विचार आ रहा है या आप अभी सुरक्षित नहीं हैं, तो कार्ड रीडिंग से पहले सुरक्षा ज़रूरी है। अकेले न रहें और किसी भरोसेमंद व्यक्ति तथा स्थानीय आपातकालीन या संकट सहायता से अभी संपर्क करें।',
 es:'Si podrías hacerte daño o no estás a salvo ahora, tu seguridad va antes que esta lectura. Quédate con alguien de confianza y contacta ahora con emergencias o apoyo de crisis de tu zona.',
 fr:'Si vous risquez de vous faire du mal ou n’êtes pas en sécurité, votre sécurité passe avant ce tirage. Restez avec une personne de confiance et contactez immédiatement les urgences ou un service de crise local.',
 de:'Wenn du dir etwas antun könntest oder gerade nicht sicher bist, geht deine Sicherheit vor dieser Deutung. Bleib bei einer vertrauten Person und kontaktiere jetzt den örtlichen Notruf oder eine Krisenhilfe.',
 nl:'Als je jezelf mogelijk iets aandoet of nu niet veilig bent, gaat je veiligheid vóór deze legging. Blijf bij iemand die je vertrouwt en neem nu contact op met lokale nood- of crisishulp.',
 ms:'Jika anda mungkin mencederakan diri atau tidak selamat sekarang, keselamatan anda lebih utama daripada bacaan ini. Jangan bersendirian; hubungi orang yang dipercayai dan bantuan kecemasan atau krisis tempatan sekarang.',
};

const text=(value:unknown)=>typeof value==='string'?value:'';
const cardsFact=(context:DomainContext)=>context.facts.find(f=>f.label==='cards'||f.id==='tarot.cards');
export function savedTarotCards(context:DomainContext):SavedCard[]{
 const value=cardsFact(context)?.value;
 return Array.isArray(value)?value.filter(card=>card&&typeof card==='object') as SavedCard[]:[];
}

export function isCrisisQuestion(question:unknown){return CRISIS.test(text(question));}
export function tarotSafetyNotice(question:unknown,locale:ReadingLocale){return isCrisisQuestion(question)?SAFETY_NOTICE[locale]:undefined;}

export function buildTarotMasterContract(context:DomainContext,question:unknown,chapter:ChapterSpec){
 const v2=tarotConsultationPrompt(context,chapter);
 if(v2)return {...v2,crisisSafety:isCrisisQuestion(question)?'예언이나 카드 조언을 중단하고 즉시 안전 확보, 신뢰할 사람과 함께 있기, 지역 응급·위기 지원 요청을 먼저 안내한다. 진단하거나 비난하지 않는다.':undefined};
 const saved=savedTarotCards(context);
 if(!saved.length)return undefined;
 const cards=saved.map((card,index)=>{
  const code=text(card.cardId||card.code).toUpperCase();
  const model=TAROT_CARDS.find(item=>item.code===code);
  const meta=yeongnyangiCardMetadata(code);
  return {order:index+1,cardId:code,name:model?.nameKo||card.nameKo||card.nameKr||card.name||'',position:card.positionKey||card.position||`position_${index+1}`,orientation:card.orientation==='reversed'?'reversed':'upright',arcana:meta?.arcana||model?.arcana,suit:meta?.suit||model?.suit,rank:meta?.rank??model?.number,gaze:meta?.gaze||'not-recorded'};
 });
 const suitCounts=Object.fromEntries(Object.keys(SUIT_ELEMENT).map(suit=>[suit,cards.filter(card=>card.suit===suit).length]));
 const ranks=new Map<number,number>();
 for(const card of cards)if(card.suit&&typeof card.rank==='number')ranks.set(card.rank,(ranks.get(card.rank)||0)+1);
 return {
  methodVersion:'yeongnyangi-tarot-master-v1',
  savedCardsOnly:cards,
  spreadAnalysis:{
   elementBalance:Object.fromEntries(Object.entries(suitCounts).map(([suit,count])=>[SUIT_ELEMENT[suit],count])),
   majorArcana:{count:cards.filter(card=>card.arcana==='major').length,total:cards.length},
   repeatedNumbers:[...ranks.entries()].filter(([,count])=>count>1).map(([rank,count])=>({rank,count})),
   courtCards:cards.filter(card=>card.suit&&Number(card.rank)>=11).map(card=>card.cardId),
   gazeFlow:cards.map(card=>({cardId:card.cardId,gaze:card.gaze})),
  },
  interpretationContract:[
   '각 카드는 position × card × orientation × user question의 교차로 읽는다.',
   '역방향을 정방향의 단순 반대로 쓰지 말고 지연·내면화·과잉·막힘 중 제공된 맥락에 맞는 가능성으로 설명한다.',
   '원소 균형, 메이저 비율, 숫자 반복, 궁정 카드, 시선 흐름은 실제 배열에서 의미가 있을 때만 연결하고 없는 신호를 만들지 않는다.',
   '카드 이름을 나열하지 말고 앞뒤 자리의 지지·긴장·전환을 하나의 이야기로 연결한다.',
   '상대 마음과 미래를 확정하지 않고 다른 가능성, 현실에서 확인할 신호, 사용자가 바꿀 수 있는 행동을 구분한다.',
   'savedCardsOnly 밖의 카드는 이름이나 의미를 해석에 끌어오지 않는다. 카드 ID·정역·자리 정보를 바꾸지 않는다.',
   `이번 장(${chapter.title})의 고유 논점에 필요한 카드만 인용하고 다른 장의 결론을 반복하지 않는다.`,
  ],
  crisisSafety:isCrisisQuestion(question)?'예언이나 카드 조언을 중단하고 즉시 안전 확보, 신뢰할 사람과 함께 있기, 지역 응급·위기 지원 요청을 먼저 안내한다. 진단하거나 비난하지 않는다.':undefined,
 };
}

function prose(body:ChapterBody){return [body.title,body.summary,body.persona,...body.analysis,...body.highlights,...body.topics,...(body.blocks||[]).flatMap(block=>[block.title,...block.paragraphs]),...(body.questionAnswers||[]).flatMap(answer=>[answer.answer,answer.reason,answer.timing,answer.action])].filter(Boolean).join('\n');}
export function validateTarotChapter(body:ChapterBody,context:DomainContext){
 const saved=savedTarotCards(context);
 if(!saved.length)return;
 const content=prose(body);
 const allowed=new Map(saved.map(card=>{
  const code=text(card.cardId||card.code).toUpperCase();
  const model=TAROT_CARDS.find(item=>item.code===code);
  return [model?.nameKo||card.nameKo||card.nameKr||card.name||'',card.orientation==='reversed'?'역방향':'정방향'];
 }).filter(([name])=>Boolean(name)) as [string,string][]);
 const v2=savedTarotConsultation(context);
 const positions=v2?new Map(v2.cards.map(card=>[card.positionLabel,card.name])):new Map<string,string>();
 for(const card of TAROT_CARDS){
  const escaped=card.nameKo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const mention=new RegExp(`${escaped}\\s*(?:카드|정방향|역방향)`,'u').exec(content);
  if(!mention)continue;
  const expected=allowed.get(card.nameKo);
  if(!expected)throw new FortuneError('TAROT_UNDRAWN_CARD');
  const direction=new RegExp(`${escaped}\\s*(?:카드)?\\s*(정방향|역방향)`,'u').exec(content)?.[1];
  if(direction&&direction!==expected)throw new FortuneError('TAROT_ORIENTATION_MISMATCH');
  if(v2){
   const named=[...positions.keys()].flatMap(label=>{
    const before=content.lastIndexOf(label,mention.index),after=content.indexOf(label,mention.index+mention[0].length);
    return [{label,distance:before<0?Infinity:mention.index-(before+label.length)},{label,distance:after<0?Infinity:after-(mention.index+mention[0].length)}];
   }).filter(row=>row.distance<=40).sort((a,b)=>a.distance-b.distance)[0]?.label;
   if(named&&positions.get(named)!==card.nameKo)throw new FortuneError('TAROT_POSITION_MISMATCH');
  }
 }
}

export function attachTarotSafetyNotice(body:ChapterBody,question:unknown,locale:ReadingLocale,ordinal:number){
 const notice=ordinal===0?tarotSafetyNotice(question,locale):undefined;
 return notice&&!body.summary.startsWith(notice)?{...body,summary:`${notice}\n\n${body.summary}`} : body;
}
