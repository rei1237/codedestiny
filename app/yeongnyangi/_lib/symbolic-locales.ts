import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {consultationLocaleCopy} from './consultation-locale-copy';
import {nativeSymbolicCopy} from '@/lib/fortune/symbolic-copy-data';
export {nativeSymbolicCopy} from '@/lib/fortune/symbolic-copy-data';
type Native=Exclude<ReadingLocale,'ko'>;
const relations:Record<Native,string[]>={
 en:['Other relationship','My own choice','Getting acquainted','Partners','Former partners','Friends','Family','Colleagues'],
 ja:['その他の関係','自分自身の選択','知り合っている段階','恋人','別れた相手','友人','家族','同僚'],
 'zh-CN':['其他关系','自己的选择','正在了解','恋人','前任','朋友','家人','同事'],
 'zh-TW':['其他關係','自己的選擇','正在了解','戀人','前任','朋友','家人','同事'],
 vi:['Quan hệ khác','Lựa chọn của bản thân','Đang tìm hiểu','Người yêu','Người cũ','Bạn bè','Gia đình','Đồng nghiệp'],
 hi:['अन्य संबंध','मेरा अपना निर्णय','जान-पहचान हो रही है','प्रेमी साथी','पूर्व साथी','मित्र','परिवार','सहकर्मी'],
 es:['Otra relación','Mi propia decisión','Conociéndonos','Pareja','Expareja','Amistad','Familia','Colegas'],
 fr:['Autre relation','Mon propre choix','Début de relation','Couple','Ancien couple','Amitié','Famille','Collègues'],
 de:['Andere Beziehung','Meine eigene Entscheidung','Kennenlernen','Partnerschaft','Frühere Partnerschaft','Freundschaft','Familie','Kollegen'],
 nl:['Andere relatie','Mijn eigen keuze','Elkaar leren kennen','Partners','Ex-partners','Vrienden','Familie','Collega’s'],
 ms:['Hubungan lain','Pilihan diri sendiri','Sedang berkenalan','Pasangan','Bekas pasangan','Rakan','Keluarga','Rakan sekerja'],
};
const topics:Record<Native,string[]>={
 en:['Relationships','Surroundings','Contact','Reunion','Work and direction','Money','Home and moving','Study and exams','Travel','Other questions'],
 ja:['関係の流れ','身の回りの環境','連絡','復縁','仕事と進路','お金','住まいと引越し','勉強と試験','移動と旅行','その他の質問'],
 'zh-CN':['关系走向','周围环境','联系','复合','工作与方向','财务','居住与搬迁','学习与考试','出行','其他问题'],
 'zh-TW':['關係走向','周圍環境','聯絡','復合','工作與方向','財務','居住與搬遷','學習與考試','出行','其他問題'],
 vi:['Mối quan hệ','Môi trường xung quanh','Liên lạc','Tái hợp','Công việc và hướng đi','Tài chính','Nhà ở và chuyển nhà','Học tập và thi cử','Đi lại','Câu hỏi khác'],
 hi:['संबंध','आसपास का वातावरण','संपर्क','फिर जुड़ना','काम और दिशा','धन','घर और स्थानांतरण','पढ़ाई और परीक्षा','यात्रा','अन्य प्रश्न'],
 es:['Relaciones','Entorno','Contacto','Reconciliación','Trabajo y rumbo','Dinero','Vivienda y mudanza','Estudios y exámenes','Viajes','Otras preguntas'],
 fr:['Relations','Environnement','Contact','Réconciliation','Travail et orientation','Argent','Logement et déménagement','Études et examens','Voyages','Autres questions'],
 de:['Beziehungen','Umgebung','Kontakt','Versöhnung','Arbeit und Richtung','Geld','Wohnen und Umzug','Lernen und Prüfungen','Reisen','Andere Fragen'],
 nl:['Relaties','Omgeving','Contact','Verzoening','Werk en richting','Geld','Wonen en verhuizen','Studie en examens','Reizen','Andere vragen'],
 ms:['Hubungan','Persekitaran','Hubungan semula','Bersatu kembali','Kerja dan hala tuju','Kewangan','Rumah dan perpindahan','Belajar dan peperiksaan','Perjalanan','Soalan lain'],
};
export function nativeQuestionSkyCopy(locale:Native){
 const t=nativeSymbolicCopy(locale),common=consultationLocaleCopy(locale);
 return {
  entry:{kicker:t.topic,title:t.title,description:t.description,action:t.question},
  input:{title:t.title,horaryTitle:t.horaryTitle,intro:t.intro,description:t.description,notice:common.limits,
   questionLabel:t.question,questionPlaceholder:t.questionHint,topicLabel:t.topic,topicHelp:t.topicHint,relationshipLabel:t.relationship,
   cityLabel:t.city,cityPlaceholder:t.cityPick,locationConfirmed:t.location,locationQuestion:t.locationQuestion,locationApply:t.locationApply,cityHelp:t.cityHint,timeLabel:t.time,timeHelp:t.timeHint,
   situationLabel:t.situation,situationPlaceholder:t.situationHint,boundaryLabel:t.boundary,checkoutTitle:common.summary,
   paidSummary:t.paidSummary,paidPrice:t.paidPrice,freeSummary:t.freeSummary,freePrice:t.freePrice,freeSubmit:t.freeSubmit,
   submit:common.start,busy:t.busy,preparing:t.busy,unavailable:t.unavailable,validation:t.validation,initialError:t.error,availabilityError:t.error,
   imageAlt:t.imageAlt,navigation:t.navigation,library:common.library,other:t.other,relationships:relations[locale]},
  result:{title:t.title,questionLabel:t.question,consultedAt:t.consultedAt,region:t.region,regionSuffix:t.regionSuffix,answerLabel:t.answer,
   saving:t.busy,deepening:t.busy,complete:t.complete,awaiting:t.awaiting,progress:t.saved,followupTitle:t.followup,followupDescription:t.followupHint,
   followupPlaceholder:t.questionHint,followupSubmit:t.followupSubmit,followupBusy:t.busy,followupUsed:t.followupUsed,finalTitle:t.final,
   share:t.share,shareDone:t.shareDone,shareCopied:t.copied,shareCancelled:t.shareCancelled,shareError:t.shareError,noticeNavigation:t.navigation,library:common.library,newReading:t.other,moodAlt:t.imageAlt,
   errors:{FOLLOWUP_INPUT_INVALID:t.followupError,FOLLOWUP_NOT_AVAILABLE:t.followupError,FOLLOWUP_ALREADY_USED:t.followupUsed}},
 };
}
const topicIds=['relationship','space','contact','reunion','work','money','home','study','travel','general'];
export const nativeSymbolicTopic=(id:string,locale:Native)=>topics[locale][topicIds.indexOf(id)]||topics[locale][9];
// Saved city names are calculation evidence, never rewritten. Romanized names are display-only.
const cityNames:Record<string,string>={'서울':'Seoul','부산':'Busan','인천':'Incheon','대구':'Daegu','대전':'Daejeon','광주':'Gwangju','울산':'Ulsan','수원':'Suwon','춘천':'Chuncheon','청주':'Cheongju','전주':'Jeonju','제주':'Jeju','도쿄':'Tokyo','뉴욕':'New York','로스앤젤레스':'Los Angeles','런던':'London','시드니':'Sydney'};
export const symbolicCityName=(name:string,locale:ReadingLocale)=>locale==='ko'?name:cityNames[name]||(/\p{Script=Hangul}/u.test(name)?'':name);
