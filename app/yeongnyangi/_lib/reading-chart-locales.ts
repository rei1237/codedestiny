import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {readingScreenLocales} from './reading-screen-locales';
import {chapterConcepts} from './reading-v7-locales';
import {consultationLocaleCopy,localizedSystem} from './consultation-locale-copy';
const locales=['zh-CN','zh-TW','vi','hi','es','fr','de','nl','ms'] as const;
type NativeLocale=typeof locales[number];
// Columns follow locales above. Technical symbols in persisted calculations are kept intact.
const terms:Record<string,readonly string[]>={
 '년주':['年柱','年柱','Trụ năm','वर्ष स्तंभ','Pilar del año','Pilier de l’année','Jahressäule','Jaarpijler','Tiang tahun'],
 '월주':['月柱','月柱','Trụ tháng','माह स्तंभ','Pilar del mes','Pilier du mois','Monatssäule','Maandpijler','Tiang bulan'],
 '일주':['日柱','日柱','Trụ ngày','दिन स्तंभ','Pilar del día','Pilier du jour','Tagessäule','Dagpijler','Tiang hari'],
 '시주':['时柱','時柱','Trụ giờ','घंटा स्तंभ','Pilar de la hora','Pilier de l’heure','Stundensäule','Uurpijler','Tiang waktu'],
 '천간·지지':['天干与地支','天干與地支','Thiên can và địa chi','स्वर्गीय तना और पृथ्वी शाखा','Tronco celeste y rama terrestre','Tronc céleste et branche terrestre','Himmelsstamm und Erdzweig','Hemelse stam en aardse tak','Batang langit dan cabang bumi'],
 '천간 십성':['天干十神','天干十神','Thập thần của thiên can','तने के दस संबंध','Diez relaciones del tronco','Dix relations du tronc','Zehn Beziehungen des Stamms','Tien relaties van de stam','Sepuluh hubungan batang'],
 '주성':['主星','主星','Chính tinh','मुख्य तारे','Estrellas principales','Étoiles principales','Hauptsterne','Hoofdsterren','Bintang utama'],
 '보조성':['辅星','輔星','Phụ tinh','सहायक तारे','Estrellas de apoyo','Étoiles secondaires','Begleitsterne','Ondersteunende sterren','Bintang sokongan'],
 '긴장 요소':['紧张因素','緊張因素','Yếu tố gây căng thẳng','तनाव के कारक','Factores de tensión','Facteurs de tension','Spannungsfaktoren','Spanningsfactoren','Faktor ketegangan'],
 '나의 본명숙':['我的本命宿','我的本命宿','Bản mệnh tú của tôi','मेरा जन्म नक्षत्र','Mi mansión natal','Ma mansion natale','Mein Geburtssternhaus','Mijn geboortemaanhuis','Rumah bulan kelahiran saya'],
 '상대의 본명숙':['对方的本命宿','對方的本命宿','Bản mệnh tú của đối phương','साथी का जन्म नक्षत्र','Mansión natal de mi pareja','Mansion natale du partenaire','Geburtssternhaus des Partners','Geboortemaanhuis van mijn partner','Rumah bulan pasangan'],
 '27숙 위치':['二十七宿位置','二十七宿位置','Vị trí trong 27 tú','27 नक्षत्रों में स्थान','Posición entre 27 mansiones','Position parmi 27 mansions','Position unter 27 Sternhäusern','Plaats in de 27 maanhuizen','Kedudukan antara 27 rumah bulan'],
 '관계':['关系','關係','Quan hệ','संबंध','Relación','Relation','Beziehung','Relatie','Hubungan'],
 '나의 역할':['我的角色','我的角色','Vai trò của tôi','मेरी भूमिका','Mi papel','Mon rôle','Meine Rolle','Mijn rol','Peranan saya'],
 '상대의 역할':['对方的角色','對方的角色','Vai trò của đối phương','साथी की भूमिका','Papel de mi pareja','Rôle du partenaire','Rolle des Partners','Rol van mijn partner','Peranan pasangan'],
 '정방향 / 역방향 거리':['顺向／逆向距离','順向／逆向距離','Khoảng cách thuận / nghịch','आगे / पीछे की दूरी','Distancia directa / inversa','Distance directe / inverse','Vorwärts- / Rückwärtsabstand','Voorwaartse / achterwaartse afstand','Jarak hadapan / belakang'],
 '거리의 결':['距离性质','距離性質','Đặc điểm khoảng cách','दूरी का स्वरूप','Naturaleza de la distancia','Nature de la distance','Art des Abstands','Aard van de afstand','Sifat jarak'],
 '달의 자리':['月亮位置','月亮位置','Vị trí Mặt Trăng','चंद्रमा का स्थान','Posición de la Luna','Position de la Lune','Mondstellung','Maanstand','Kedudukan Bulan'],
 '별자리':['星座','星座','Cung hoàng đạo','राशि','Signo zodiacal','Signe du zodiaque','Tierkreiszeichen','Sterrenbeeld','Zodiak'],
 '하우스':['宫位','宮位','Nhà','भाव','Casa','Maison','Haus','Huis','Rumah'],
 '황경':['黄经','黃經','Hoàng kinh','क्रांतिवृत्तीय देशांतर','Longitud eclíptica','Longitude écliptique','Ekliptikale Länge','Ecliptische lengte','Longitud ekliptik'],
 '상승점':['上升点','上升點','Điểm mọc','लग्न','Ascendente','Ascendant','Aszendent','Ascendant','Asenden'],
 '각':['相位','相位','Góc chiếu','दृष्टि','Aspecto','Aspect','Aspekt','Aspect','Aspek'],
 '오브':['容许度','容許度','Độ lệch góc','दृष्टि का अंतर','Orbe','Orbe','Orbis','Orb','Orb'],
 '카드':['牌卡','牌卡','Lá bài','कार्ड','Carta','Carte','Karte','Kaart','Kad'],
 '방향':['方向','方向','Hướng','दिशा','Orientación','Orientation','Ausrichtung','Richting','Arah'],
 '정방향':['正位','正位','Xuôi','सीधा','Derecha','À l’endroit','Aufrecht','Rechtop','Tegak'],
 '역방향':['逆位','逆位','Ngược','उल्टा','Invertida','Renversée','Umgekehrt','Omgekeerd','Terbalik'],
 '주기':['周期','週期','Chu kỳ','चक्र','Ciclo','Cycle','Zyklus','Cyclus','Kitaran'],
 '시작':['开始','開始','Bắt đầu','आरंभ','Inicio','Début','Beginn','Begin','Mula'],
 '끝':['结束','結束','Kết thúc','अंत','Fin','Fin','Ende','Einde','Tamat'],
 '목':['木','木','Mộc','लकड़ी','Madera','Bois','Holz','Hout','Kayu'],
 '화':['火','火','Hỏa','अग्नि','Fuego','Feu','Feuer','Vuur','Api'],
 '토':['土','土','Thổ','पृथ्वी','Tierra','Terre','Erde','Aarde','Tanah'],
 '금':['金','金','Kim','धातु','Metal','Métal','Metall','Metaal','Logam'],
 '수':['水','水','Thủy','जल','Agua','Eau','Wasser','Water','Air'],
 '수성':['水星','水星','Thủy Tinh','बुध','Mercurio','Mercure','Merkur','Mercurius','Utarid'],
 '금성':['金星','金星','Kim Tinh','शुक्र','Venus','Vénus','Venus','Venus','Zuhrah'],
 '화성':['火星','火星','Hỏa Tinh','मंगल','Marte','Mars','Mars','Mars','Marikh'],
 '목성':['木星','木星','Mộc Tinh','बृहस्पति','Júpiter','Jupiter','Jupiter','Jupiter','Musytari'],
 '토성':['土星','土星','Thổ Tinh','शनि','Saturno','Saturne','Saturn','Saturnus','Zuhal'],
 '자료 없음':['无资料','無資料','Không có dữ liệu','जानकारी उपलब्ध नहीं','Sin datos','Aucune donnée','Keine Daten','Geen gegevens','Tiada data'],
 '없음':['无','無','Không có','कोई नहीं','Ninguno','Aucun','Keine','Geen','Tiada'],
 '양자리':['白羊座','牡羊座','Bạch Dương','मेष','Aries','Bélier','Widder','Ram','Aries'],
 '황소자리':['金牛座','金牛座','Kim Ngưu','वृषभ','Tauro','Taureau','Stier','Stier','Taurus'],
 '쌍둥이자리':['双子座','雙子座','Song Tử','मिथुन','Géminis','Gémeaux','Zwillinge','Tweelingen','Gemini'],
 '게자리':['巨蟹座','巨蟹座','Cự Giải','कर्क','Cáncer','Cancer','Krebs','Kreeft','Cancer'],
 '사자자리':['狮子座','獅子座','Sư Tử','सिंह','Leo','Lion','Löwe','Leeuw','Leo'],
 '처녀자리':['处女座','處女座','Xử Nữ','कन्या','Virgo','Vierge','Jungfrau','Maagd','Virgo'],
 '천칭자리':['天秤座','天秤座','Thiên Bình','तुला','Libra','Balance','Waage','Weegschaal','Libra'],
 '전갈자리':['天蝎座','天蠍座','Bọ Cạp','वृश्चिक','Escorpio','Scorpion','Skorpion','Schorpioen','Scorpio'],
 '사수자리':['射手座','射手座','Nhân Mã','धनु','Sagitario','Sagittaire','Schütze','Boogschutter','Sagittarius'],
 '염소자리':['摩羯座','摩羯座','Ma Kết','मकर','Capricornio','Capricorne','Steinbock','Steenbok','Capricorn'],
 '물병자리':['水瓶座','水瓶座','Bảo Bình','कुंभ','Acuario','Verseau','Wassermann','Waterman','Aquarius'],
 '물고기자리':['双鱼座','雙魚座','Song Ngư','मीन','Piscis','Poissons','Fische','Vissen','Pisces'],
};
const chartText={
 'zh-CN':{section:'计算依据',heading:'查看解读的基础',select:'选择计算项目',wheel:'根据已保存的黄经与宫位边界绘制。选择下方行星查看详情。',related:'与此依据相关的章节',empty:'相关章节保存后会显示在这里。',limits:'计算方式与解读限制',sourceStored:'购买时保存的计算快照',sourceCards:'服务器保存的牌阵',now:'现在',relative:'相对年份',timelineCaption:'购买时保存的计算期间；金线表示今天。'},
 'zh-TW':{section:'計算依據',heading:'查看解讀的基礎',select:'選擇計算項目',wheel:'根據已儲存的黃經與宮位邊界繪製。選取下方行星查看詳情。',related:'與此依據相關的章節',empty:'相關章節儲存後會顯示在這裡。',limits:'計算方式與解讀限制',sourceStored:'購買時儲存的計算快照',sourceCards:'伺服器儲存的牌陣',now:'現在',relative:'相對年份',timelineCaption:'購買時儲存的計算期間；金線表示今天。'},
 vi:{section:'Cơ sở tính toán',heading:'Khám phá nền tảng bài đọc',select:'Chọn dữ liệu tính toán',wheel:'Vẽ theo hoàng kinh và ranh giới nhà đã lưu. Chọn hành tinh bên dưới để xem chi tiết.',related:'Chương liên quan đến dữ liệu này',empty:'Chương liên quan sẽ hiện ở đây sau khi lưu.',limits:'Phương pháp tính và giới hạn diễn giải',sourceStored:'Dữ liệu tính toán lưu khi mua',sourceCards:'Trải bài lưu trên máy chủ',now:'Hiện tại',relative:'Năm tương đối',timelineCaption:'Khoảng thời gian tính toán lưu khi mua. Vạch vàng là hôm nay.'},
 hi:{section:'गणना का आधार',heading:'रीडिंग का आधार देखें',select:'गणना का विवरण चुनें',wheel:'सहेजे गए देशांतर और भाव सीमाओं से बना जन्म चार्ट। विवरण के लिए नीचे ग्रह चुनें।',related:'इस आधार से संबंधित अध्याय',empty:'संबंधित अध्याय सहेजे जाने पर यहाँ दिखेंगे।',limits:'गणना और व्याख्या की सीमाएँ',sourceStored:'खरीद के समय सहेजी गई गणना',sourceCards:'सर्वर पर सहेजा कार्ड विन्यास',now:'अभी',relative:'सापेक्ष वर्ष',timelineCaption:'खरीद के समय सहेजी गई गणना अवधि। सुनहरी रेखा आज दिखाती है।'},
 es:{section:'Bases del cálculo',heading:'Explora la base de tu lectura',select:'Elegir un dato del cálculo',wheel:'Carta trazada con longitudes y cúspides guardadas. Elige un planeta para ver detalles.',related:'Capítulos relacionados con este dato',empty:'Los capítulos relacionados aparecerán cuando se guarden.',limits:'Método de cálculo y límites de la interpretación',sourceStored:'Cálculos guardados al comprar',sourceCards:'Tirada guardada en el servidor',now:'Ahora',relative:'Año relativo',timelineCaption:'Periodos guardados al comprar. La línea dorada señala hoy.'},
 fr:{section:'Bases du calcul',heading:'Explorez les fondements de votre lecture',select:'Choisir un détail du calcul',wheel:'Thème tracé avec les longitudes et cuspides enregistrées. Choisissez une planète pour les détails.',related:'Chapitres associés à ce détail',empty:'Les chapitres associés apparaîtront après enregistrement.',limits:'Méthode de calcul et limites de l’interprétation',sourceStored:'Calculs enregistrés lors de l’achat',sourceCards:'Tirage enregistré sur le serveur',now:'Maintenant',relative:'Année relative',timelineCaption:'Périodes enregistrées lors de l’achat. La ligne dorée indique aujourd’hui.'},
 de:{section:'Berechnungsgrundlagen',heading:'Die Grundlage deiner Deutung ansehen',select:'Berechnungsdetail wählen',wheel:'Horoskop aus gespeicherten Längengraden und Hausgrenzen. Wähle einen Planeten für Details.',related:'Kapitel zu diesem Detail',empty:'Zugehörige Kapitel erscheinen nach der Speicherung.',limits:'Berechnungsmethode und Grenzen der Deutung',sourceStored:'Beim Kauf gespeicherte Berechnung',sourceCards:'Auf dem Server gespeicherte Kartenlegung',now:'Jetzt',relative:'Relatives Jahr',timelineCaption:'Beim Kauf gespeicherte Zeiträume. Die goldene Linie zeigt heute.'},
 nl:{section:'Berekeningsgrondslagen',heading:'Bekijk de basis van je reading',select:'Berekeningsdetail kiezen',wheel:'Horoscoop op basis van opgeslagen lengtegraden en huisgrenzen. Kies een planeet voor details.',related:'Hoofdstukken bij dit detail',empty:'Bijbehorende hoofdstukken verschijnen na het opslaan.',limits:'Berekeningsmethode en grenzen van de interpretatie',sourceStored:'Berekening opgeslagen bij aankoop',sourceCards:'Kaartlegging opgeslagen op de server',now:'Nu',relative:'Relatief jaar',timelineCaption:'Periodes opgeslagen bij aankoop. De gouden lijn geeft vandaag aan.'},
 ms:{section:'Asas pengiraan',heading:'Lihat asas bacaan anda',select:'Pilih butiran pengiraan',wheel:'Carta dilukis daripada longitud dan sempadan rumah disimpan. Pilih planet di bawah untuk butiran.',related:'Bab berkaitan dengan butiran ini',empty:'Bab berkaitan akan muncul selepas disimpan.',limits:'Kaedah pengiraan dan batas tafsiran',sourceStored:'Pengiraan disimpan semasa pembelian',sourceCards:'Susunan kad disimpan pada pelayan',now:'Sekarang',relative:'Tahun relatif',timelineCaption:'Tempoh disimpan semasa pembelian. Garis emas menandakan hari ini.'},
};
export function nativeChartTerm(value:string,locale:NativeLocale):string|undefined{
 const i=locales.indexOf(locale),c=chapterConcepts[locale];
 const direct:Record<string,string>={'태양':c.sun,'달':c.moon,'천왕성':c.uranus,'해왕성':c.neptune,'명왕성':c.pluto,'계산된 시기':c.timing,'두 사람의 흐름':c.relations,'오행 분포 · 월령 가중치 포함':c.useful,'나의 사주와 오행':`${localizedSystem('saju',locale)} · ${c.base}`,'열두 궁에 담긴 삶':`${localizedSystem('ziwei',locale)} · ${c.base}`,'별 사이의 관계':`${localizedSystem('sukuyo',locale)} · ${c.relations}`,'라시 차트와 별의 주기':`${localizedSystem('vedic',locale)} · Rashi`,'나의 출생 차트':`${localizedSystem('astrology',locale)} · ${c.base}`,'질문 위에 펼친 카드':c.question};
 if(direct[value])return direct[value];
 const positions:Record<string,string>={'원인':c.cause,'과정':c.process,'결과':c.outcome,'현재':c.current,'내면':c.mind,'장애물':c.obstacle,'주변 영향':c.relations,'선택':c.choice,'행동':readingScreenLocales[locale].action,'내가 바라보는 상대':c.myView,'관계에 대한 상대의 시선':c.theirView,'상대 감정의 가능성':c.theirMind,'다가올 의지의 가능성':c.intention,'관계의 핵심 장애물':c.obstacle,'가까운 선택의 방향':c.near,'카드의 자리':c.cards,'숙':locale.startsWith('zh')?'宿':'Sukuyo','라그나':locale==='hi'?'लग्न':'Lagna','나크샤트라':locale==='hi'?'नक्षत्र':'Nakshatra','파다':locale==='hi'?'पाद':'Pada','라후':locale==='hi'?'राहु':'Rahu','케투':locale==='hi'?'केतु':'Ketu','신궁':locale.startsWith('zh')?'身宮':c.base};
 if(positions[value])return positions[value];
 if(terms[value])return terms[value][i];
 if(value.startsWith('상대 '))return `${consultationLocaleCopy(locale).kinds[1]} · ${nativeChartTerm(value.slice(3),locale)||value.slice(3)}`;
 return undefined;
}
export function nativeChartCopy(locale:NativeLocale){
 const c=readingScreenLocales[locale],text=chartText[locale];
 return {...text,none:nativeChartTerm('없음',locale)!,timingSelect:c.timing,timing:c.timing,
  more:(n:number)=>`${text.related} (+${n})`,weight:(label:string)=>label};
}
export function nativeVisualCopy(locale:NativeLocale){
 const text=chartText[locale],c=readingScreenLocales[locale],concept=chapterConcepts[locale];
 return {glance:c.contents,glanceCaption:text.related,chapterCol:c.chapter,themeCol:c.questionSection,pointCol:c.intro,keyPoints:c.intro,
  timeline:c.timing,timelineCaption:text.timelineCaption,periodCol:nativeChartTerm('주기',locale)!,rangeCol:c.period,now:text.now,noRange:nativeChartTerm('자료 없음',locale)!,
  pillars:localizedSystem('saju',locale),pillarRow:nativeChartTerm('천간·지지',locale)!,tenGodRow:nativeChartTerm('천간 십성',locale)!,elements:concept.useful,elementsCaption:text.sourceStored,
  elementCount:(label:string,n:number)=>`${label} ${n}`,says:c.intro,answerTable:c.reason,yearFocus:c.period,yearFocusCaption:c.context,yearLabel:(y:number)=>String(y),
  relative:(n:number)=>`${text.relative}: ${n>0?'+':''}${n}`,themes:{self:concept.base,wealth:concept.wealth,love:concept.love,career:concept.career,relations:concept.relations,timing:concept.timing,cross:concept.structure,action:c.action},
  pillarNames:Object.fromEntries(['시주','일주','월주','년주'].map(key=>[key,nativeChartTerm(key,locale)!]))};
}
export function isNativeChartLocale(locale?:ReadingLocale):locale is NativeLocale{return !!locale&&locales.includes(locale as NativeLocale);}
