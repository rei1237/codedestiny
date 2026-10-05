import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTsModule} from '../../scripts/lib/load-ts-module.mjs';
import {RUNTIME_LOCALES} from '../../lib/i18n/locale-normalize.js';
const {localizedKind}=loadTsModule('app/yeongnyangi/_lib/consultation-locale-copy.ts');
const {hasUnsupportedLocalizedClaim}=loadTsModule('worker/yeongnyangi/fortune/localized-claims.ts');
const {validateReadingQuality}=loadTsModule('worker/yeongnyangi/fortune/reading-quality.ts');
const {READING_V6_VERSION}=loadTsModule('worker/yeongnyangi/fortune/reading-policy.ts');

const fixtures={
 en:['You will develop cancer.','Your reunion is guaranteed.','Notice your routines and seek qualified care when needed.'],
 ja:['病気にかかります。','必ず復縁します。','日々の習慣を振り返り、必要なときは専門家に相談しましょう。'],
 'zh-CN':['你一定会患上癌症。','保证你们复合。','留意日常习惯，有需要时请咨询专业人员。'],
 'zh-TW':['你一定會患上癌症。','保證你們復合。','留意日常習慣，有需要時請諮詢專業人員。'],
 vi:['Bạn chắc chắn sẽ mắc bệnh.','Chắc chắn tái hợp.','Hãy quan sát thói quen và tìm hỗ trợ chuyên môn khi cần.'],
 hi:['आपको कैंसर होगा।','निश्चित रूप से विवाह होगा।','अपनी दिनचर्या पर ध्यान दें और ज़रूरत होने पर विशेषज्ञ से सलाह लें।'],
 es:['Vas a desarrollar una enfermedad.','La reconciliación está garantizada.','Observa tus hábitos y busca atención profesional cuando la necesites.'],
 fr:['Vous développerez un cancer.','La réconciliation est garantie.','Observez vos habitudes et demandez conseil à un professionnel si nécessaire.'],
 de:['Du wirst an Krebs erkranken.','Du wirst garantiert heiraten.','Achte auf deine Gewohnheiten und suche bei Bedarf fachliche Unterstützung.'],
 nl:['Je zult kanker krijgen.','Je zult gegarandeerd weer samen zijn.','Let op je gewoonten en zoek deskundige hulp als dat nodig is.'],
 ms:['Anda pasti akan menghidap kanser.','Anda pasti akan berkahwin.','Perhatikan rutin anda dan dapatkan bantuan profesional apabila diperlukan.'],
};
const chapter={version:READING_V6_VERSION,tier:'mackerel',minimumChars:1,sections:[{id:'evidence',minimumChars:1},{id:'action',minimumChars:1}]};
const body=summary=>({summary,persona:'Reflection',analysis:[],example:'',advice:'',highlights:[],topics:[],sources:['saju.test'],blocks:[
 {id:'evidence',title:'Evidence',sources:['saju.test'],paragraphs:['Review the information that is available before drawing a conclusion.']},
 {id:'action',title:'Action',sources:['saju.test'],paragraphs:['Choose a small practical step that leaves room for your own preferences.']},
]});
for(const [locale,[illness,certainty,ordinary]] of Object.entries(fixtures)){
 test(`${locale}: rejects certainty claims while retaining ordinary localized guidance`,()=>{
  assert.equal(hasUnsupportedLocalizedClaim(illness,locale),true);
  assert.equal(hasUnsupportedLocalizedClaim(certainty,locale),true);
  assert.equal(hasUnsupportedLocalizedClaim(ordinary,locale),false);
  assert.throws(()=>validateReadingQuality(body(illness),chapter,[],locale),e=>e.code==='UNSUPPORTED_READING_CLAIM');
  assert.doesNotThrow(()=>validateReadingQuality(body(ordinary),chapter,[],locale));
 });
}
test('every runtime language has display names for the expanded menus',()=>{
 for(const locale of RUNTIME_LOCALES)for(const id of ['health','marriage','movement','business','feelings','contact','reunion','career','healing','spread']){
  const label=localizedKind(id,locale);
  assert.notEqual(label,id,`${locale}/${id}`);
  if(locale!=='ko')assert.doesNotMatch(label,/[가-힣]/u,`${locale}/${id}`);
 }
});
