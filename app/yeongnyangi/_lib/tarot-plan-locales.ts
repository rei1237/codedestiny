import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {tarotQuestionPresets,recommendTarotSpread,questionFeatures} from '@/lib/tarot/yeongnyangi-spread-recommend.mjs';
import {tarotPeriods,tarotRelationStatuses} from '@/worker/yeongnyangi/fortune/tarot/spread-v3';
type Native=Exclude<ReadingLocale,'ko'>;
// Nine preset questions, two periods and seven relationship states, in the source order.
const rows:Record<Native,string>={
 en:'Could they have feelings for me?|Should I reach out first?|Would we repeat the same problems if we got back together?|How can I open up to a new relationship?|What might I gain or lose by changing jobs?|Where is my work getting stuck?|Should I accept this offer?|Why do I repeat the same relationship patterns?|Where should I focus over the next month?|The coming week|The coming month|Dating|Getting to know each other|One-sided feelings|After a breakup|No contact|They have asked me not to contact them|Living together',
 ja:'相手に好意はあるのかな？|私から連絡してもいい？|やり直しても同じ問題を繰り返す？|新しい縁を迎えるには？|転職で得るものと失うものは？|仕事のどこでつまずいている？|この提案を受けてもいい？|なぜ同じ関係のパターンを繰り返す？|これから一か月、何に力を注ぐ？|これから一週間|これから一か月|交際中|知り合っている途中|片思い|別れた後|連絡が途絶えている|相手から連絡を控えるよう言われた|一緒に暮らしている',
 'zh-CN':'对方可能对我有好感吗？|我该先联系吗？|复合后会重复同样的问题吗？|如何迎接一段新关系？|换工作可能带来什么得失？|我的工作卡在哪里？|该接受这个提议吗？|为什么总重复同样的关系模式？|未来一个月该把精力放在哪里？|未来一周|未来一个月|交往中|互相了解中|单方面喜欢|分手之后|已失去联系|对方已要求我不要联系|共同生活中',
 'zh-TW':'對方可能對我有好感嗎？|我該先聯絡嗎？|復合後會重複同樣的問題嗎？|如何迎接一段新關係？|換工作可能帶來什麼得失？|我的工作卡在哪裡？|該接受這個提議嗎？|為什麼總重複同樣的關係模式？|未來一個月該把精力放在哪裡？|未來一週|未來一個月|交往中|互相了解中|單方面喜歡|分手之後|已失去聯絡|對方已要求我不要聯絡|共同生活中',
 vi:'Người ấy có thể có tình cảm với tôi không?|Tôi có nên liên hệ trước?|Nếu tái hợp, chúng tôi có lặp lại vấn đề cũ?|Làm sao đón một mối quan hệ mới?|Đổi việc có thể được và mất gì?|Công việc của tôi đang mắc ở đâu?|Tôi có nên nhận lời đề nghị này?|Vì sao tôi lặp lại cùng kiểu quan hệ?|Tháng tới tôi nên tập trung vào đâu?|Tuần tới|Tháng tới|Đang hẹn hò|Đang tìm hiểu|Tình cảm đơn phương|Sau chia tay|Không còn liên lạc|Người ấy đã yêu cầu không liên hệ|Đang sống chung',
 hi:'क्या उनके मन में मेरे लिए भावनाएँ हो सकती हैं?|क्या मैं पहले संपर्क करूँ?|फिर साथ आए तो क्या वही समस्याएँ दोहराएँगे?|नए रिश्ते के लिए कैसे तैयार होऊँ?|नौकरी बदलने में क्या पा या खो सकता हूँ?|मेरा काम कहाँ अटक रहा है?|क्या यह प्रस्ताव स्वीकार करूँ?|मैं रिश्तों में वही ढर्रे क्यों दोहराता हूँ?|आने वाले महीने में किस पर ध्यान दूँ?|आने वाला सप्ताह|आने वाला महीना|प्रेम संबंध में|एक-दूसरे को जान रहे हैं|एकतरफ़ा लगाव|अलगाव के बाद|संपर्क बंद है|उन्होंने संपर्क न करने को कहा है|साथ रह रहे हैं',
 es:'¿Podría sentir algo por mí?|¿Debería contactar primero?|¿Repetiríamos los mismos problemas al volver?|¿Cómo abrirme a una nueva relación?|¿Qué podría ganar o perder al cambiar de trabajo?|¿Dónde se atasca mi trabajo?|¿Debería aceptar esta propuesta?|¿Por qué repito los mismos patrones de relación?|¿En qué centrarme el próximo mes?|La próxima semana|El próximo mes|Saliendo juntos|Conociéndonos|Sentimientos no correspondidos|Después de una ruptura|Sin contacto|Me ha pedido que no contacte|Conviviendo',
 fr:'Cette personne pourrait-elle avoir des sentiments pour moi ?|Dois-je faire le premier pas ?|Recommencer nous ramènerait-il aux mêmes problèmes ?|Comment accueillir une nouvelle relation ?|Que pourrais-je gagner ou perdre en changeant de travail ?|Où mon travail bloque-t-il ?|Dois-je accepter cette proposition ?|Pourquoi mes schémas relationnels se répètent-ils ?|Sur quoi me concentrer le mois prochain ?|La semaine à venir|Le mois à venir|En couple|Nous apprenons à nous connaître|Sentiments à sens unique|Après une rupture|Sans contact|Cette personne m’a demandé de ne plus la contacter|Nous vivons ensemble',
 de:'Könnte diese Person Gefühle für mich haben?|Soll ich zuerst Kontakt aufnehmen?|Würden wir beim Neuanfang dieselben Probleme wiederholen?|Wie öffne ich mich für eine neue Beziehung?|Was könnte ich durch einen Jobwechsel gewinnen oder verlieren?|Wo stockt meine Arbeit?|Soll ich dieses Angebot annehmen?|Warum wiederholen sich meine Beziehungsmuster?|Worauf sollte ich mich im nächsten Monat konzentrieren?|Die kommende Woche|Der kommende Monat|In einer Beziehung|Wir lernen uns kennen|Einseitige Gefühle|Nach einer Trennung|Kein Kontakt|Die Person möchte keinen Kontakt|Wir leben zusammen',
 nl:'Zou die persoon gevoelens voor mij kunnen hebben?|Zal ik eerst contact zoeken?|Herhalen we dezelfde problemen als we opnieuw beginnen?|Hoe sta ik open voor een nieuwe relatie?|Wat kan ik winnen of verliezen door van baan te veranderen?|Waar loopt mijn werk vast?|Zal ik dit aanbod aannemen?|Waarom herhaal ik dezelfde relatiepatronen?|Waar richt ik me de komende maand op?|De komende week|De komende maand|Aan het daten|Elkaar leren kennen|Eenzijdige gevoelens|Na een breuk|Geen contact|Die persoon heeft gevraagd geen contact te zoeken|Samenwonend',
 ms:'Mungkinkah dia mempunyai perasaan terhadap saya?|Patutkah saya menghubungi dahulu?|Adakah masalah lama berulang jika kami bersama semula?|Bagaimana menyambut hubungan baharu?|Apa yang mungkin diperoleh atau hilang dengan bertukar kerja?|Di mana kerja saya tersekat?|Patutkah saya menerima tawaran ini?|Mengapa saya mengulangi corak hubungan yang sama?|Apa yang patut saya fokuskan bulan depan?|Minggu mendatang|Bulan mendatang|Sedang bercinta|Sedang berkenalan|Perasaan sebelah pihak|Selepas perpisahan|Tiada hubungan|Dia meminta saya tidak menghubunginya|Tinggal bersama',
};
export function tarotPlanCopy(locale:ReadingLocale){
 if(locale==='ko')return {presets:tarotQuestionPresets,periods:tarotPeriods,relations:tarotRelationStatuses};
 const values=rows[locale].split('|');
 if(values.length!==18)throw new Error(`Tarot plan copy mismatch: ${locale}`);
 return {presets:tarotQuestionPresets.map((p,i)=>({...p,question:values[i]})),periods:{week:values[9],month:values[10]},relations:Object.fromEntries(Object.keys(tarotRelationStatuses).map((key,i)=>[key,values[i+11]])) as Record<keyof typeof tarotRelationStatuses,string>};
}

// Display recommendation adapter only. The user's original question is sent unchanged to prepare.
// Explicit presets and A/B inputs remain authoritative; unrecognized wording keeps the original default spread.
const hints:[RegExp,string][]=[
 [/change jobs?|changing jobs?|job change|leave (?:my|the) job|転職|换工作|換工作|đổi việc|नौकरी बदल|cambiar de trabajo|changeant de travail|changer de travail|jobwechsel|baan.*verander|bertukar kerja/iu,'이직'],
 [/reach out first|contact first|連絡して|先联系|先聯絡|liên hệ trước|पहले संपर्क|contactar primero|premier pas|zuerst kontakt|eerst contact|menghubungi dahulu/iu,'내가 먼저 연락'],
 [/get back together|reunit|復縁|やり直|复合|復合|tái hợp|फिर साथ|al volver|recommencer|neuanfang|opnieuw beginnen|bersama semula/iu,'재회'],
 [/new relationship|新しい縁|新关系|新關係|quan hệ mới|नए रिश्ते|nueva relación|nouvelle relation|neue beziehung|nieuwe relatie|hubungan baharu/iu,'새로운 인연'],
 [/offer|提案|提议|提議|đề nghị|प्रस्ताव|propuesta|proposition|angebot|aanbod|tawaran/iu,'제안'],
 [/repeat.*(?:relationship|pattern)|同じ.*(?:関係|パターン)|重复.*关系|重複.*關係|lặp lại.*quan hệ|रिश्तों.*दोहरा|repito.*(?:relación|patron)|schémas.*répèt|beziehungsmuster|relatiepatronen|corak hubungan/iu,'같은 관계 반복'],
 [/feelings for me|feelings.*toward me|好意|好感|tình cảm.*tôi|मेरे लिए भावनाएँ|sentir algo por mí|sentiments pour moi|gefühle für mich|gevoelens voor mij|perasaan terhadap saya/iu,'나에게 마음이 있'],
 [/next month|coming month|一か月|一个月|一個月|tháng tới|आने वाले महीने|próximo mes|mois prochain|nächsten monat|komende maand|bulan depan/iu,'앞으로 한 달'],
 [/burnout|exhausted|疲れ|疲惫|疲憊|kiệt sức|थक|agotad|épuis|erschöpft|uitgeput|letih/iu,'지친'],
 [/money|budget|お金|金钱|金錢|tiền|पैस|dinero|argent|geld|wang/iu,'돈'],
 [/\bwork\b|仕事|工作|công việc|काम|trabajo|travail|arbeit|\bwerk\b|kerja/iu,'업무'],
 [/relationship|関係|关系|關係|mối quan hệ|रिश्त|relación|relation|beziehung|relatie|hubungan/iu,'관계'],
];
function recommendationText(question:string,locale:ReadingLocale){return locale==='ko'?question:[question,...hints.filter(([pattern])=>pattern.test(question)).map(([,hint])=>hint)].join(' ');}
export function localizedTarotRecommendation(input:Parameters<typeof recommendTarotSpread>[0],locale:ReadingLocale){return recommendTarotSpread({...input,question:recommendationText(String(input?.question||''),locale)});}
export function localizedTarotQuestionFeatures(question:string,locale:ReadingLocale){return questionFeatures({question:recommendationText(question,locale)});}
