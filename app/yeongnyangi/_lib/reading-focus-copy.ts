import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
type Copy={answer:string;question:string;tools:string};
const copies:Record<ReadingLocale,Copy>={
 ko:{answer:'질문에 대한 핵심 답',question:'내가 남긴 질문',tools:'계산 자료로 이미지 만들기 · 공유'},
 en:{answer:'The answer to your question',question:'Your original question',tools:'Create an image from your chart · Share'},
 ja:{answer:'質問への大切な答え',question:'あなたが寄せた質問',tools:'計算資料から画像を作る・共有'},
 'zh-CN':{answer:'你的问题，核心回答',question:'你留下的问题',tools:'用命盘资料制作图片 · 分享'},
 'zh-TW':{answer:'你的問題，核心回答',question:'你留下的問題',tools:'用命盤資料製作圖片 · 分享'},
 vi:{answer:'Câu trả lời chính cho bạn',question:'Câu hỏi bạn đã gửi',tools:'Tạo ảnh từ biểu đồ · Chia sẻ'},
 hi:{answer:'आपके प्रश्न का मुख्य उत्तर',question:'आपका मूल प्रश्न',tools:'अपने चार्ट से चित्र बनाएं · साझा करें'},
 es:{answer:'La respuesta a tu pregunta',question:'Tu pregunta original',tools:'Crear una imagen de tu carta · Compartir'},
 fr:{answer:'La réponse à votre question',question:'Votre question initiale',tools:'Créer une image à partir de votre carte · Partager'},
 de:{answer:'Die Antwort auf deine Frage',question:'Deine ursprüngliche Frage',tools:'Ein Bild aus deinem Horoskop erstellen · Teilen'},
 nl:{answer:'Het antwoord op je vraag',question:'Je oorspronkelijke vraag',tools:'Een afbeelding van je horoscoop maken · Delen'},
 ms:{answer:'Jawapan utama untuk soalan anda',question:'Soalan asal anda',tools:'Cipta imej daripada carta anda · Kongsi'},
};
export const readingFocusCopy=(locale:ReadingLocale='ko'):Copy=>copies[locale];
