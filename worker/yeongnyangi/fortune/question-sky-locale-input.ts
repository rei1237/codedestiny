import type {SkyInput} from './question-sky-contract';
import type {ReadingLocale} from './reading-locale';
// Adapt explicit language cues to the existing engine's Korean classifier.
// Unknown wording keeps its existing ambiguous/topic fallback. No chart math changes.
const cues:[RegExp,string][]=[
 [/\b(?:career|job|promotion|business|work|trabajo|empleo|carrière|travail|emploi|beruf|arbeit|baan|loopbaan|kerja|kerjaya)\b|転職|就職|仕事|昇進|工作|事业|事業|升职|升職|công việc|sự nghiệp|नौकरी|करियर|व्यवसाय/iu,'진로'],
 [/\b(?:money|income|investment|dinero|inversión|argent|revenu|geld|einkommen|inkomen|pelaburan|wang)\b|金運|投資|财运|財運|投资|收入|tài chính|thu nhập|धन|आय|निवेश/iu,'재물'],
 [/\b(?:housing|mortgage|relocation|mudanza|vivienda|logement|déménagement|umzug|wohnung|verhuiz\w*|rumah|perpindahan)\b|引越|引っ越|住居|搬家|住房|chuyển nhà|nhà ở|मकान|स्थानांतरण/iu,'주거'],
 [/\b(?:exam|study|travel|examen|études|voyage|prüfung|studium|reise|studie|reizen|peperiksaan|belajar|perjalanan)\b|試験|勉強|旅行|考试|考試|学习|學習|du lịch|học tập|परीक्षा|पढ़ाई|यात्रा/iu,'공부'],
 [/\b(?:contact|message|kontakt|nachricht|bericht|mensaje|contacter|hubungi|mesej)\b|連絡|メッセージ|联系|聯絡|短信|liên lạc|tin nhắn|संपर्क|संदेश/iu,'연락'],
 [/\b(?:relationship|partner|reunion|reconcile|relación|pareja|couple|partenaire|beziehung|versöhnung|relatie|verzoening|hubungan|pasangan)\b|恋愛|復縁|恋人|关系|關係|复合|復合|恋人|戀人|mối quan hệ|tái hợp|संबंध|प्रेम|मेल-मिलाप/iu,'관계'],
];
const relationGroups:[RegExp,string][]=[
 [/^(?:Friends?|友人|朋友|Bạn bè|मित्र|Amistad|Amitié|Freundschaft|Vrienden|Rakan)$/iu,'친구'],
 [/^(?:Family|家族|家人|Gia đình|परिवार|Familia|Famille|Familie|Keluarga)$/iu,'가족'],
 [/^(?:Colleagues?|同僚|同事|Đồng nghiệp|सहकर्मी|Colegas|Collègues|Kollegen|Collega’s|Rakan sekerja)$/iu,'동료'],
];
export function questionSkyCalculationInput(input:SkyInput,locale:ReadingLocale):SkyInput{
 if(locale==='ko')return input;
 const relationship=relationGroups.find(([pattern])=>pattern.test(input.relationship))?.[1]||input.relationship;
 const question=input.question.split(/\n+|(?<=[?？])\s*/u).map(text=>text.trim()).filter(Boolean).map(text=>{
  const hints=cues.filter(([pattern])=>pattern.test(text)).map(([,hint])=>hint);
  return hints.length?`${text.replace(/[?？]$/u,'')} [${hints.join(' ')}]?`:text;
 }).join('\n');
 return {...input,relationship,question};
}
