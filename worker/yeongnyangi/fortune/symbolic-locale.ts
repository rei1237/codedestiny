import type {ChapterBody,ChapterSpec} from './book-contracts';
import type {ReadingLocale} from './reading-locale';
import {FortuneError,type DomainContext} from './shared/contracts';

type Native=Exclude<ReadingLocale,'ko'>;
const notices:Record<Native,[string,string]>={
 en:['This reading does not establish when an event will happen. Set your own waiting limits from what you can reasonably manage.','Respect the other person’s boundaries.'],
 ja:['この鑑定から出来事の時期は確定できません。待つ期限は、自分が無理なく受け止められる範囲で決めましょう。','相手の境界を尊重しましょう。'],
 'zh-CN':['本次解读不能确定事件发生的时间。等待的期限，请根据自己能够承受的范围决定。','请尊重对方的界限。'],
 'zh-TW':['本次解讀不能確定事件發生的時間。等待的期限，請根據自己能夠承受的範圍決定。','請尊重對方的界線。'],
 vi:['Bài đọc này không xác định thời điểm sự việc xảy ra. Hãy đặt giới hạn chờ đợi phù hợp với sức chịu đựng của bạn.','Hãy tôn trọng ranh giới của người ấy.'],
 hi:['यह व्याख्या घटना का समय तय नहीं करती। प्रतीक्षा की सीमा अपनी सहज क्षमता के अनुसार चुनें।','दूसरे व्यक्ति की सीमाओं का सम्मान करें।'],
 es:['Esta lectura no establece cuándo ocurrirá un acontecimiento. Decide cuánto esperar según lo que puedas asumir.','Respeta los límites de la otra persona.'],
 fr:['Cette lecture ne permet pas de dater un événement. Fixez votre attente selon ce que vous pouvez raisonnablement supporter.','Respectez les limites de l’autre personne.'],
 de:['Diese Deutung bestimmt keinen Zeitpunkt für ein Ereignis. Setze deine Wartezeit danach fest, was du gut bewältigen kannst.','Respektiere die Grenzen der anderen Person.'],
 nl:['Deze lezing stelt niet vast wanneer iets zal gebeuren. Bepaal zelf hoe lang wachten voor jou draaglijk is.','Respecteer de grenzen van de ander.'],
 ms:['Bacaan ini tidak menentukan bila sesuatu peristiwa berlaku. Tetapkan had menunggu mengikut kemampuan anda.','Hormati batas orang tersebut.'],
};
export const symbolicLocaleNotices=(locale:Native)=>({timing:notices[locale][0],boundary:notices[locale][1]});
export const symbolicSectionIds=(chapter:ChapterSpec)=>chapter.sections?.map(section=>section.id)||chapter.requiredSections?.map((_,i)=>`symbolic-${i+1}`)||[];

// Supplemental native-language scope checks. Citation checks below remain mandatory as well.
const unsupported:Record<Native,RegExp>={
 en: /\b(?:he|she|they|your partner)\s+(?:still\s+)?(?:loves? you|miss(?:es)? you|is at|are at|will (?:call|contact|return|come back))\b|\b(?:tomorrow|next week|next month)\b|\b(?:visit|track|follow)\s+(?:him|her|them|your partner)\b|\b(?:send|write)\s+(?:him|her|them)\s+(?:a |another )?message\b/iu,
 ja: /(?:相手|彼女?|あの人).{0,12}(?:あなたを愛して|あなたを想って|あなたが好き|にいます|にいる|から連絡が来)|明日|来週|来月|(?:相手|彼女?|あの人)を(?:追跡|尾行)|(?:家|職場)に会いに行/iu,
 'zh-CN': /(?:他|她|对方)(?:仍然|还|一定|会)?(?:爱你|想你|在酒店|在家里|联系你|回来)|明天|下周|下个月|(?:跟踪|尾随|去找)(?:他|她|对方)/iu,
 'zh-TW': /(?:他|她|對方)(?:仍然|還|一定|會)?(?:愛你|想你|在酒店|在家裡|聯絡你|回來)|明天|下週|下個月|(?:跟蹤|尾隨|去找)(?:他|她|對方)/iu,
 vi: /(?:người ấy|anh ấy|cô ấy).{0,12}(?:yêu bạn|nhớ bạn|sẽ liên lạc|sẽ trở lại|đang ở)|ngày mai|tuần tới|tháng tới|(?:theo dõi|bám theo) (?:họ|người ấy)/iu,
 hi: /(?:वह|वे).{0,15}(?:आपसे प्यार|आपको याद|संपर्क करेंगे|वापस आएंगे|होटल में हैं)|अगले सप्ताह|अगले महीने|(?:उनका|उसका) पीछा/iu,
 es: /(?:él|ella|tu pareja).{0,15}(?:te ama|te extraña|te llamará|volverá|está en el hotel)|mañana|próxima semana|próximo mes|(?:sigue|persigue|vigila) a (?:tu pareja|esa persona)/iu,
 fr: /(?:il|elle|votre partenaire).{0,15}(?:vous aime|vous appellera|reviendra|est à l’hôtel)|demain|semaine prochaine|mois prochain|(?:suivez|traquez) (?:cette personne|votre partenaire)/iu,
 de: /(?:er|sie|dein partner).{0,15}(?:liebt dich|vermisst dich|wird dich anrufen|kommt zurück|ist im hotel)|morgen|nächste woche|nächsten monat|(?:verfolge|überwache) (?:ihn|sie|deinen partner)/iu,
 nl: /(?:hij|zij|je partner).{0,15}(?:houdt van je|mist je|zal je bellen|komt terug|is in het hotel)|morgen|volgende week|volgende maand|(?:achtervolg|bespioneer) (?:hem|haar|je partner)/iu,
 ms: /(?:dia|pasangan anda).{0,15}(?:mencintai anda|merindui anda|akan menghubungi|akan kembali|berada di hotel)|esok|minggu depan|bulan depan|(?:jejaki|ekori) (?:dia|pasangan anda)/iu,
};
export function symbolicLocaleUnsupported(prose:string,locale:Native){
 return unsupported[locale].test(prose)||/100\s*%|\b(?:GPS|latitude|longitude|coordinates)\b|\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/iu.test(prose);
}
/** Only a true, explicit boundary statement is inferred; the existing checkbox remains authoritative. */
export function nativeContactBoundary(text:string){
 return /(?:blocked me|asked me not to contact|do not contact me|ブロックされた|連絡しないで|拉黑|封鎖|不要联系|不要聯絡|chặn tôi|đừng liên lạc|संपर्क मत करो|ब्लॉक कर|me bloqueó|no me contactes|m’a bloqué|ne me contacte|hat mich blockiert|kontaktiere mich nicht|heeft me geblokkeerd|neem geen contact|menyekat saya|jangan hubungi)/iu.test(text);
}
export function symbolicLocaleContract(locale:Native,chapter:ChapterSpec,boundary:boolean){
 const notice=symbolicLocaleNotices(locale);
 return {
  style:'Write warm, composed symbolic guidance entirely in the selected purchase language. Explain only the supplied evidence and the reader’s choices.',
  evidence:'Translate the meaning of the supplied patterns into the purchase language; do not quote Korean text. Every block must cite provided fact IDs in sources. Every question answer must have exactly one matching internalBasis.questionAnswers entry with questionId, factIds and sources containing the same provided fact IDs, timingIds empty, and evidenceStatus grounded. For question-specific facts, use only the fact with that exact questionId. Never substitute evidence from another question. These IDs are internal and must not appear in visible prose.',
  sections:symbolicSectionIds(chapter).map((id,i)=>({id,topic:chapter.sections?.[i]?.title||chapter.requiredSections?.[i]})),
  blockContract:'Keep the supplied section IDs in exactly that order, once each. Translate the heading into natural purchase-language prose. Every block has nonempty paragraphs and sources. Preserve the existing length and paragraph limits.',
  timing:`Every questionAnswers.timing must equal this exact sentence: ${notice.timing}`,
  boundary:boundary?`Include this exact sentence in the action guidance: ${notice.boundary}`:'Respect the other person’s boundaries. Do not suggest contact, visits, surveillance or asking others to investigate.',
  scope:'Never claim to know another person’s whereabouts, private thoughts, fidelity or future actions. Never invent event dates, waiting periods, spiritual powers or guarantees. Discuss only the reader’s observations, options and self-directed actions.',
 };
}
export function symbolicBasisSchema(questionIds:string[],sourceIds:string[]){
 return {type:'object',additionalProperties:false,required:['questionAnswers'],properties:{questionAnswers:{type:'array',minItems:questionIds.length,maxItems:questionIds.length,items:{type:'object',additionalProperties:false,required:['questionId','factIds','timingIds','evidenceStatus','sources'],properties:{questionId:{type:'string',enum:questionIds},factIds:{type:'array',minItems:1,items:{type:'string',enum:sourceIds}},sources:{type:'array',minItems:1,items:{type:'string',enum:sourceIds}},timingIds:{type:'array',maxItems:0,items:{type:'string'}},evidenceStatus:{type:'string',enum:['grounded']}}}}}};
}
export function validateSymbolicLocale(body:ChapterBody,context:DomainContext,chapter:ChapterSpec,locale:Native,kind:'spirit'|'sky',boundary:boolean){
 const blocks=body.blocks||[],ids=symbolicSectionIds(chapter),allowed=new Map(context.facts.map(f=>[f.id,f]));
 if(!ids.length||blocks.length!==ids.length||blocks.some((block,i)=>block.id!==ids[i]))throw new FortuneError('CHAPTER_DEPTH_INCOMPLETE');
 if(blocks.some(block=>!Array.isArray(block.sources)||!block.sources.length||block.sources.some(id=>!allowed.has(id)||!body.sources.includes(id))))throw new FortuneError('INVALID_EVIDENCE');
 const prose=[body.title,body.summary,body.example,body.advice,body.persona,...body.analysis,...body.highlights,...body.topics,...blocks.flatMap(b=>[b.title,...b.paragraphs]),...(body.questionAnswers||[]).flatMap(a=>[a.answer,a.reason,a.action]),...(body.followUpSuggestions||[])].join('\n').normalize('NFKC');
 if([...allowed.keys()].some(id=>prose.includes(id))||/CALCULATED_DATA|questionAnswers|factSelectors|internalBasis|Gemini|\bGPT\b|\bJSON\b/.test(prose))throw new FortuneError('INTERNAL_EVIDENCE_EXPOSED');
 if(symbolicLocaleUnsupported(prose,locale))throw new FortuneError('UNSUPPORTED_SPIRIT_CLAIM');
 const answers=body.questionAnswers||[],basis=body.internalBasis?.questionAnswers||[];
 if(!Array.isArray(basis)||basis.length!==answers.length||new Set(basis.map(b=>b?.questionId)).size!==basis.length)throw new FortuneError('SPIRIT_ANSWER_EVIDENCE_MISSING');
 for(const answer of answers){
  const cited=basis.find(b=>b?.questionId===answer.questionId);
  if(!cited||cited.evidenceStatus!=='grounded'||!Array.isArray(cited.timingIds)||cited.timingIds.length||!Array.isArray(cited.sources)||!cited.sources.length||!Array.isArray(cited.factIds)||cited.factIds.length!==cited.sources.length||new Set(cited.sources).size!==cited.sources.length||cited.sources.some(id=>!cited.factIds.includes(id)||!body.sources.includes(id)||!allowed.has(id)))throw new FortuneError('SPIRIT_ANSWER_EVIDENCE_MISSING');
  if(kind==='sky'&&cited.sources.some(id=>(allowed.get(id)?.value as {questionId?:string})?.questionId!==answer.questionId))throw new FortuneError('SPIRIT_ANSWER_EVIDENCE_MISSING');
  if(answer.timing!==symbolicLocaleNotices(locale).timing)throw new FortuneError('UNSUPPORTED_SPIRIT_TIMING');
 }
 if(boundary&&!prose.includes(symbolicLocaleNotices(locale).boundary))throw new FortuneError('SPIRIT_BOUNDARY_REQUIRED');
}
