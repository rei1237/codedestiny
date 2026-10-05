import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';

// Display labels only. Stable consultation IDs and calculation contracts stay unchanged.
const ids=['health','marriage','movement','business','feelings','contact','reunion','career','healing','spread'] as const;
const labels:Record<ReadingLocale,readonly string[]>={
 ko:['건강운','결혼운','이동수·해외운','사업운','그 사람 마음','연락의 흐름','재회와 관계 회복','일과 진로','마음 회복','질문으로 고르는 배열'],
 en:['Wellbeing and routines','Marriage and partnership','Relocation and life abroad','Business and resources','Understanding their feelings','Communication patterns','Reconnection and repair','Work and direction','Emotional recovery','A spread for your question'],
 ja:['心身のリズム','結婚とパートナーシップ','移動と海外生活','事業と資源','相手の気持ちを考える','連絡の流れ','復縁と関係の修復','仕事と進路','心の回復','質問に合うスプレッド'],
 'zh-CN':['身心节奏与习惯','婚姻与伴侣关系','搬迁与海外生活','事业经营与资源','理解对方的情绪','沟通与联系','重新联系与关系修复','工作与方向','情绪修复','适合问题的牌阵'],
 'zh-TW':['身心節奏與習慣','婚姻與伴侶關係','搬遷與海外生活','事業經營與資源','理解對方的情緒','溝通與聯繫','重新聯繫與關係修復','工作與方向','情緒修復','適合問題的牌陣'],
 vi:['Nhịp sống và sức khỏe','Hôn nhân và bạn đời','Chuyển nơi ở và sống ở nước ngoài','Kinh doanh và nguồn lực','Tìm hiểu cảm xúc của đối phương','Nhịp điệu liên lạc','Kết nối lại và hàn gắn','Công việc và định hướng','Hồi phục tinh thần','Trải bài theo câu hỏi'],
 hi:['स्वस्थ दिनचर्या और संतुलन','विवाह और साझेदारी','स्थान परिवर्तन और विदेश में जीवन','व्यवसाय और संसाधन','उनकी भावनाओं को समझना','संवाद और संपर्क','दोबारा जुड़ना और रिश्ते सुधारना','काम और दिशा','भावनात्मक संभलाव','आपके प्रश्न के अनुसार कार्ड विन्यास'],
 es:['Bienestar y hábitos','Matrimonio y vida en pareja','Mudanzas y vida en el extranjero','Negocio y recursos','Comprender sus emociones','Comunicación y contacto','Reconexión y reparación','Trabajo y rumbo','Recuperación emocional','Una tirada para tu pregunta'],
 fr:['Bien-être et habitudes','Mariage et vie à deux','Déménagement et vie à l’étranger','Activité et ressources','Comprendre ses émotions','Communication et contact','Reprise de contact et réparation','Travail et orientation','Équilibre émotionnel','Un tirage adapté à votre question'],
 de:['Wohlbefinden und Alltag','Ehe und Partnerschaft','Umzug und Leben im Ausland','Unternehmen und Ressourcen','Gefühle besser verstehen','Kommunikation und Kontakt','Wiederannäherung und Klärung','Beruf und Orientierung','Emotionale Erholung','Eine Legung für deine Frage'],
 nl:['Welzijn en gewoonten','Huwelijk en partnerschap','Verhuizen en leven in het buitenland','Ondernemen en middelen','Gevoelens beter begrijpen','Communicatie en contact','Opnieuw verbinden en herstellen','Werk en richting','Emotioneel herstel','Een legging voor je vraag'],
 ms:['Kesejahteraan dan rutin','Perkahwinan dan pasangan','Perpindahan dan kehidupan di luar negara','Perniagaan dan sumber','Memahami perasaan mereka','Komunikasi dan hubungan','Berhubung semula dan pemulihan hubungan','Kerjaya dan hala tuju','Pemulihan emosi','Susunan kad untuk soalan anda'],
};
export function expandedKindLabel(id:string,locale:ReadingLocale):string|undefined {
 const index=ids.indexOf(id as typeof ids[number]);
 return index<0?undefined:labels[locale][index];
}
