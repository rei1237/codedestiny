import type {ReadingLocale} from './reading-locale';

// Positive certainty claims only. Ordinary advice to seek care remains valid.
// These deterministic checks supplement the provider contract; they are not a medical classifier.
const health:Partial<Record<ReadingLocale,RegExp>>={
 en:/(?:you will|you'll|you are going to)\s+(?:develop|get|suffer from|be diagnosed with|have)\s+(?:an?\s+)?(?:\w+\s+){0,2}(?:disease|illness|cancer)|(?:your chart|the cards).{0,30}(?:confirm|prove|diagnose).{0,25}(?:disease|illness|cancer)/iu,
 ja:/(?:病気|疾患|がん|癌)に(?:必ず|確実に)?(?:なります|かかります)|(?:命盤|カード).{0,20}(?:病気|癌).{0,15}(?:確定|証明)/u,
 'zh-CN':/你(?:一定|必定|肯定|将会|会|将)(?:会)?(?:患上|患有|得|罹患|出现).{0,12}(?:病|癌)|(?:命盘|八字|牌面).{0,15}(?:证明|确诊).{0,15}(?:病|癌)/u,
 'zh-TW':/你(?:一定|必定|肯定|將會|會|將)(?:會)?(?:患上|患有|得|罹患|出現).{0,12}(?:病|癌)|(?:命盤|八字|牌面).{0,15}(?:證明|確診).{0,15}(?:病|癌)/u,
 vi:/bạn\s+(?:sẽ|chắc chắn sẽ|chắc chắn)\s+(?:mắc|bị).{0,20}(?:bệnh|ung thư)/iu,
 hi:/आपको.{0,25}(?:बीमारी|रोग|कैंसर).{0,12}(?:होगा|होगी|हो जाएगा|हो जाएगी)|आप.{0,12}(?:निश्चित रूप से|ज़रूर).{0,15}बीमार/iu,
 es:/(?:tendrás|vas a padecer|vas a desarrollar|vas a tener).{0,25}(?:enfermedad|cáncer)/iu,
 fr:/(?:vous aurez|vous allez avoir|vous développerez|tu auras|tu développeras).{0,25}(?:maladie|cancer)/iu,
 de:/(?:du wirst|Sie werden).{0,30}(?:an Krebs erkranken|Krebs bekommen|eine Krankheit entwickeln|krank werden)/iu,
 nl:/(?:je zult|u zult|je krijgt|u krijgt).{0,25}(?:kanker|een ziekte|ziek worden)/iu,
 ms:/anda\s+(?:akan|pasti akan|pasti).{0,20}(?:menghidap|mendapat).{0,15}(?:penyakit|kanser)/iu,
};
const guarantee:Partial<Record<ReadingLocale,RegExp>>={
 en:/(?:guaranteed|100%|definitely).{0,35}(?:reunion|marriage|success)|(?:reunion|marriage|success).{0,20}(?:is guaranteed|is certain)/iu,
 ja:/(?:必ず|絶対|100%).{0,15}(?:復縁|結婚|成功)/u,
 'zh-CN':/(?:一定|必定|保证|百分之百|100%).{0,15}(?:复合|复婚|结婚|成功)/u,
 'zh-TW':/(?:一定|必定|保證|百分之百|100%).{0,15}(?:復合|復婚|結婚|成功)/u,
 vi:/(?:chắc chắn|đảm bảo|100%).{0,25}(?:tái hợp|kết hôn|thành công)/iu,
 hi:/(?:निश्चित रूप से|गारंटी|100%).{0,25}(?:शादी|विवाह|सफल|फिर साथ)/iu,
 es:/(?:garantizado|sin duda|100%).{0,25}(?:reconciliación|matrimonio|éxito)|(?:reconciliación|matrimonio|éxito).{0,15}garantizad/iu,
 fr:/(?:garanti|certainement|100%).{0,25}(?:réconciliation|mariage|réussite)|(?:réconciliation|mariage|réussite).{0,15}garanti/iu,
 de:/(?:garantiert|auf jeden Fall|100%).{0,25}(?:heiraten|zusammenkommen|Erfolg)|(?:Heirat|Versöhnung|Erfolg).{0,15}garantiert/iu,
 nl:/(?:gegarandeerd|100%).{0,25}(?:trouwen|weer samen|succes)|(?:huwelijk|hereniging|succes).{0,15}gegarandeerd/iu,
 ms:/(?:pasti|dijamin|100%).{0,25}(?:berkahwin|kembali bersama|berjaya)/iu,
};
export function hasUnsupportedLocalizedClaim(text:string,locale:ReadingLocale):boolean {
 const value=text.normalize('NFKC');
 return Boolean(health[locale]?.test(value)||guarantee[locale]?.test(value));
}
