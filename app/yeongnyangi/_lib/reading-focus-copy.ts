import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
type Copy={answer:string;question:string;tools:string};
const copies:Record<ReadingLocale,Copy>={
 ko:{answer:'질문에 대한 핵심 답',question:'내가 남긴 질문',tools:'계산된 결과로 요약 리포트 이미지 만들기!'},
 en:{answer:'The answer to your question',question:'Your original question',tools:'Turn your chart into a summary report image!'},
 ja:{answer:'質問への大切な答え',question:'あなたが寄せた質問',tools:'計算結果から要約レポート画像を作ろう！'},
 'zh-CN':{answer:'你的问题，核心回答',question:'你留下的问题',tools:'用计算结果制作摘要报告图片！'},
 'zh-TW':{answer:'你的問題，核心回答',question:'你留下的問題',tools:'用計算結果製作摘要報告圖片！'},
 vi:{answer:'Câu trả lời chính cho bạn',question:'Câu hỏi bạn đã gửi',tools:'Tạo ảnh báo cáo tóm tắt từ kết quả tính toán!'},
 hi:{answer:'आपके प्रश्न का मुख्य उत्तर',question:'आपका मूल प्रश्न',tools:'गणना के नतीजों से सारांश रिपोर्ट की छवि बनाएँ!'},
 es:{answer:'La respuesta a tu pregunta',question:'Tu pregunta original',tools:'¡Crea una imagen de informe resumen con tu resultado!'},
 fr:{answer:'La réponse à votre question',question:'Votre question initiale',tools:'Créez une image de rapport résumé avec votre résultat !'},
 de:{answer:'Die Antwort auf deine Frage',question:'Deine ursprüngliche Frage',tools:'Erstelle aus deinem Ergebnis ein Zusammenfassungs-Bild!'},
 nl:{answer:'Het antwoord op je vraag',question:'Je oorspronkelijke vraag',tools:'Maak van je resultaat een samenvattend rapportbeeld!'},
 ms:{answer:'Jawapan utama untuk soalan anda',question:'Soalan asal anda',tools:'Cipta imej laporan ringkasan daripada keputusan anda!'},
};
export const readingFocusCopy=(locale:ReadingLocale='ko'):Copy=>copies[locale];
