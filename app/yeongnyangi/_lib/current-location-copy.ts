import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import type {CurrentLocationCopy} from '@/app/components/CurrentLocationButton';
import {consultationInputCopy} from './consultation-input-copy';
const labels={
 'zh-CN':['使用当前位置','允许定位后，确认当前位置与时区。','位置已确认，大约精度：','这里也是你的出生地吗？','确认作为出生地','选择其他地点','无法确认当前位置，请输入城市与国家。'],
 'zh-TW':['使用目前位置','允許定位後，確認目前位置與時區。','位置已確認，大約精度：','這裡也是你的出生地嗎？','確認作為出生地','選擇其他地點','無法確認目前位置，請輸入城市與國家。'],
 vi:['Dùng vị trí hiện tại','Cho phép định vị để kiểm tra nơi hiện tại và múi giờ.','Đã xác nhận vị trí. Độ chính xác khoảng:','Đây cũng là nơi bạn sinh ra?','Dùng làm nơi sinh','Chọn nơi khác','Chưa xác nhận được vị trí. Hãy nhập thành phố và quốc gia.'],
 hi:['वर्तमान स्थान लें','अनुमति देने पर वर्तमान स्थान और समय क्षेत्र की पुष्टि करें।','स्थान की पुष्टि हुई। अनुमानित सटीकता:','क्या आपका जन्म भी इसी स्थान पर हुआ था?','हाँ, जन्म स्थान के रूप में लागू करें','दूसरा स्थान चुनें','वर्तमान स्थान की पुष्टि नहीं हुई। शहर और देश दर्ज करें।'],
 es:['Usar ubicación actual','Permite la ubicación para confirmar dónde estás y la zona horaria.','Ubicación confirmada. Precisión aproximada:','¿Es también tu lugar de nacimiento?','Sí, usar como lugar natal','Elegir otro lugar','No se pudo confirmar la ubicación. Introduce ciudad y país.'],
 fr:['Utiliser ma position','Autorisez la localisation pour confirmer le lieu et le fuseau horaire.','Position confirmée. Précision approximative :','Est-ce aussi votre lieu de naissance ?','Utiliser comme lieu de naissance','Choisir un autre lieu','Position non confirmée. Saisissez une ville et un pays.'],
 de:['Aktuellen Standort verwenden','Erlaube den Standortzugriff, um Ort und Zeitzone zu bestätigen.','Standort bestätigt. Ungefähre Genauigkeit:','Bist du auch hier geboren?','Als Geburtsort verwenden','Anderen Ort wählen','Standort nicht bestätigt. Gib Stadt und Land ein.'],
 nl:['Huidige locatie gebruiken','Sta locatiegebruik toe om je locatie en tijdzone te bevestigen.','Locatie bevestigd. Geschatte nauwkeurigheid:','Ben je ook op deze plek geboren?','Als geboorteplaats gebruiken','Andere plaats kiezen','Locatie niet bevestigd. Voer stad en land in.'],
 ms:['Gunakan lokasi semasa','Benarkan lokasi untuk mengesahkan tempat dan zon waktu.','Lokasi disahkan. Anggaran ketepatan:','Adakah ini juga tempat kelahiran anda?','Gunakan sebagai tempat lahir','Pilih tempat lain','Lokasi tidak dapat disahkan. Masukkan bandar dan negara.'],
} satisfies Partial<Record<ReadingLocale,readonly string[]>>;
export function readingLocationCopy(locale:ReadingLocale):CurrentLocationCopy|undefined{
 if(locale==='ko'||locale==='en'||locale==='ja')return undefined;
 const [get,hint,confirmed,birthQuestion,birthApply,other,failed]=labels[locale],input=consultationInputCopy(locale);
 return {get,hint,confirmed,birthQuestion,birthApply,other,failed,unsupported:failed,timezone:failed,denied:failed,busy:input.busy,accuracySuffix:' m.',questionQuestion:input.question,questionApply:birthApply};
}
