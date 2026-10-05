import type {ReadingLocale} from './reading-locale';

// Target affirmative predictions/diagnoses, not mentions of illness or advice to seek qualified care.
// These are deterministic guardrails, not a medical classifier. Korean rules remain in reading-quality.
export const localizedClaimPatterns:Record<Exclude<ReadingLocale,'ko'>,RegExp>={
 en:/(?:you (?:will|definitely)|you'll)\s+(?:develop|get|have|suffer from|be diagnosed with)\s+(?:an?\s+)?(?:\w+\s+){0,2}(?:disease|illness|cancer)|(?:your chart|these cards).{0,30}(?:diagnoses|confirms|will cure).{0,20}(?:cancer|disease|illness)|(?:guaranteed|definitely|100%).{0,25}(?:reunion|marriage|success)/iu,
 ja:/(?:あなたは|必ず|確実に).{0,15}(?:病気|疾患|がん|癌).{0,5}(?:になります|にかかります|を発症)|(?:命盤|カード).{0,15}(?:癌|病気|疾患).{0,5}(?:確定|診断|治せます)|(?:必ず|絶対|100%).{0,15}(?:復縁|結婚|成功)/u,
 'zh-CN':/(?:你将|你会|你一定|必定|必然).{0,12}(?:患上|患有|得癌|得病|生病)|(?:命盘|八字|塔罗牌).{0,12}(?:确诊|诊断|治愈).{0,12}(?:癌|疾病)|(?:保证|必定|一定|100%).{0,12}(?:复合|结婚|成功)/u,
 'zh-TW':/(?:你將|你會|你一定|必定|必然).{0,12}(?:患上|患有|得癌|得病|生病)|(?:命盤|八字|塔羅牌).{0,12}(?:確診|診斷|治癒).{0,12}(?:癌|疾病)|(?:保證|必定|一定|100%).{0,12}(?:復合|結婚|成功)/u,
 vi:/(?:bạn sẽ|chắc chắn).{0,20}(?:mắc bệnh|bị bệnh|mắc ung thư|bị ung thư)|(?:lá số|lá bài).{0,20}(?:chẩn đoán|chữa khỏi).{0,20}(?:bệnh|ung thư)|(?:chắc chắn|bảo đảm|100%).{0,20}(?:tái hợp|kết hôn|thành công)/iu,
 hi:/(?:आपको|तुम्हें).{0,20}(?:कैंसर|बीमारी|रोग).{0,10}(?:होगा|होगी|हो जाएगा|हो जाएगी)|(?:कुंडली|कार्ड).{0,20}(?:कैंसर|बीमारी|रोग).{0,20}(?:निदान करता|ठीक कर देगा)|(?:निश्चित रूप से|ज़रूर|100%).{0,25}(?:पुनर्मिलन|विवाह|सफलता)/u,
 es:/(?:tendrás|desarrollarás|padecerás).{0,20}(?:cáncer|enfermedad)|(?:tu carta|estas cartas).{0,20}(?:diagnostican?|confirman?|curarán?).{0,20}(?:cáncer|enfermedad)|(?:garantizad[oa]|seguro que|100%).{0,25}(?:reconciliación|matrimonio|éxito)/iu,
 fr:/(?:vous (?:aurez|développerez)|tu (?:auras|développeras)).{0,20}(?:cancer|maladie)|(?:votre thème|ces cartes).{0,20}(?:diagnostique|confirme|guérira).{0,20}(?:cancer|maladie)|(?:garanti|certainement|100%).{0,25}(?:réconciliation|mariage|réussite)/iu,
 de:/(?:du wirst|Sie werden).{0,25}(?:Krebs|Krankheit).{0,20}(?:bekommen|entwickeln|haben)|(?:dein Horoskop|diese Karten).{0,20}(?:diagnostizier|heil).{0,20}(?:Krebs|Krankheit)|(?:garantiert|100%).{0,25}(?:Versöhnung|Heirat|Erfolg)/iu,
 nl:/(?:je zult|u zult|jij krijgt).{0,20}(?:kanker|ziekte).{0,15}(?:krijgen|ontwikkelen|hebben)?|(?:je horoscoop|deze kaarten).{0,20}(?:diagnosticer|genezen|bevestigen).{0,20}(?:kanker|ziekte)|(?:gegarandeerd|100%).{0,25}(?:hereniging|huwelijk|succes)/iu,
 ms:/(?:anda akan|pasti).{0,20}(?:menghidap|mendapat).{0,15}(?:kanser|penyakit)|(?:carta anda|kad ini).{0,20}(?:mendiagnosis|menyembuhkan).{0,20}(?:kanser|penyakit)|(?:dijamin|pasti|100%).{0,25}(?:bersatu semula|berkahwin|berjaya)/iu,
};
export function hasLocalizedUnsupportedClaim(text:string,locale:string){
 const pattern=localizedClaimPatterns[locale as Exclude<ReadingLocale,'ko'>];
 return Boolean(pattern?.test(text.normalize('NFC')));
}
