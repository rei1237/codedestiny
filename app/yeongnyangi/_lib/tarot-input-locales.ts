import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {tarotCatalogLocales,tarotCatalogLabel} from './tarot-catalog-locales';

export const tarotInputRows:Record<string,string>={
 likes_me:'Could their interest be mutual?|相手にも好意はある？|对方也有好感吗？|對方也有好感嗎？|Người ấy cũng có cảm tình không?|क्या उनकी रुचि भी हो सकती है?|¿Podría ser mutuo el interés?|L’intérêt pourrait-il être partagé ?|Könnte das Interesse gegenseitig sein?|Kan de interesse wederzijds zijn?|Mungkinkah minat itu bersama?',
 reunion_repeat:'Would we repeat the same problems?|再会しても同じ理由で別れる？|重逢后会重复同样的问题吗？|重逢後會重複同樣的問題嗎？|Gặp lại có lặp lại vấn đề cũ không?|क्या हम वही समस्याएँ दोहराएँगे?|¿Repetiríamos los mismos problemas?|Retomberions-nous dans les mêmes difficultés ?|Würden sich dieselben Probleme wiederholen?|Zouden dezelfde problemen terugkomen?|Adakah masalah sama akan berulang?',
 new_bond:'What could help me meet someone new?|新しいご縁に何が必要？|怎样迎接新的缘分？|怎樣迎接新的緣分？|Điều gì giúp tôi gặp người mới?|नए व्यक्ति से मिलने में क्या मदद हो सकती है?|¿Qué me ayudaría a conocer a alguien?|Qu’est-ce qui m’aiderait à faire une rencontre ?|Was könnte neue Begegnungen ermöglichen?|Wat helpt mij iemand nieuws te ontmoeten?|Apakah yang membantu saya bertemu orang baharu?',
 job_change:'What might I gain or lose by changing jobs?|転職で得るものと手放すものは？|换工作可能得到与失去什么？|換工作可能得到與失去什麼？|Đổi việc có thể được và mất gì?|नौकरी बदलने से क्या पा या खो सकता हूँ?|¿Qué ganaría o perdería al cambiar de trabajo?|Que pourrais-je gagner ou perdre en changeant de travail ?|Was könnte ich durch einen Jobwechsel gewinnen oder verlieren?|Wat kan ik winnen of verliezen door over te stappen?|Apakah yang mungkin diperoleh atau dilepaskan dengan bertukar kerja?',
 month:'Where should I focus in the coming month?|これから一か月、何に力を注ぐ？|未来一个月把精力放在哪里？|未來一個月把精力放在哪裡？|Tháng tới nên tập trung vào đâu?|आने वाले महीने में कहाँ ध्यान दूँ?|¿En qué centrarme el próximo mes?|Où porter mon attention le mois prochain ?|Worauf sollte ich mich im kommenden Monat konzentrieren?|Waar richt ik me de komende maand op?|Di manakah saya patut menumpukan usaha bulan hadapan?',
 week:'Coming week|これから一週間|未来一周|未來一週|Tuần tới|आने वाला सप्ताह|Próxima semana|Semaine à venir|Kommende Woche|Komende week|Minggu akan datang',
 period_month:'Coming month|これから一か月|未来一个月|未來一個月|Tháng tới|आने वाला महीना|Próximo mes|Mois à venir|Kommender Monat|Komende maand|Bulan akan datang',
 dating:'Dating|交際中|交往中|交往中|Đang hẹn hò|प्रेम संबंध में|En una relación|En couple|In einer Beziehung|In een relatie|Sedang bercinta',
 getting_to_know:'Getting to know each other|知り合っている途中|正在了解彼此|正在了解彼此|Đang tìm hiểu|एक-दूसरे को जान रहे हैं|Conociéndonos|En train de faire connaissance|Wir lernen uns kennen|Elkaar leren kennen|Sedang mengenali',
 one_sided:'One-sided feelings|片思い|单方面喜欢|單方面喜歡|Tình cảm đơn phương|एकतरफ़ा भावनाएँ|Sentimientos no correspondidos|Sentiments à sens unique|Einseitige Gefühle|Eenzijdige gevoelens|Perasaan sebelah pihak',
 separated:'After separation|別れた後|分开之后|分開之後|Sau chia tay|अलग होने के बाद|Tras la separación|Après une séparation|Nach einer Trennung|Na een breuk|Selepas berpisah',
 no_contact:'No current contact|連絡が途絶えている|目前没有联系|目前沒有聯繫|Không liên lạc|अभी संपर्क नहीं|Sin contacto actual|Sans contact actuellement|Zurzeit kein Kontakt|Momenteel geen contact|Tiada hubungan semasa',
 contact_refused:'They have asked not to be contacted|相手が連絡を望まないと伝えている|对方已表示不希望联系|對方已表示不希望聯繫|Người ấy đã yêu cầu không liên lạc|उन्होंने संपर्क न करने को कहा है|Ha pedido que no se le contacte|Cette personne a demandé à ne plus être contactée|Die Person möchte keinen Kontakt|De ander heeft om geen contact gevraagd|Mereka telah meminta supaya tidak dihubungi',
 married:'Living together|一緒に暮らしている|共同生活中|共同生活中|Đang chung sống|साथ रह रहे हैं|Conviviendo|Vie commune|Zusammenlebend|Samenwonend|Hidup bersama',
};
const presetAliases:Record<string,string>={contact_first:'yn_contact_first',work_block:'yn_work_block_six',offer:'yn_offer_six',repeat_pattern:'yn_repeat_pattern_six'};
export function tarotInputLabel(id:string,locale:ReadingLocale,fallback:string,period=false){
 if(locale==='ko')return fallback;
 if(presetAliases[id])return tarotCatalogLabel(presetAliases[id],locale)!;
 return tarotInputRows[period&&id==='month'?'period_month':id]?.split('|')[tarotCatalogLocales.indexOf(locale)]||fallback;
}
