import type { LoadingLocale } from '@/constants/loadingMessages';

type ResultCopy = { chartDetails: string; imageTools: string };
const COPY: Record<LoadingLocale, ResultCopy> = {
  ko: { chartDetails: '명반·계산 근거 보기', imageTools: '상담 결과를 이미지로 정리하기' },
  en: { chartDetails: 'View chart and calculation details', imageTools: 'Create an image from your consultation' },
  ja: { chartDetails: '命盤・計算の根拠を見る', imageTools: '相談結果を画像にまとめる' },
  'zh-CN': { chartDetails: '查看命盘与计算依据', imageTools: '将咨询结果整理成图片' },
  'zh-TW': { chartDetails: '查看命盤與計算依據', imageTools: '將諮詢結果整理成圖片' },
  vi: { chartDetails: 'Xem lá số và cơ sở tính toán', imageTools: 'Tạo hình ảnh từ kết quả tư vấn' },
  hi: { chartDetails: 'कुंडली और गणना का विवरण देखें', imageTools: 'अपने परामर्श को एक चित्र में बदलें' },
  es: { chartDetails: 'Ver la carta y los detalles del cálculo', imageTools: 'Crear una imagen de tu consulta' },
  fr: { chartDetails: 'Voir le thème et les détails du calcul', imageTools: 'Créer une image de votre consultation' },
  de: { chartDetails: 'Horoskop und Berechnungsgrundlagen ansehen', imageTools: 'Ein Bild aus Ihrer Beratung erstellen' },
  nl: { chartDetails: 'Bekijk de horoscoop en berekeningsdetails', imageTools: 'Maak een afbeelding van je consult' },
  ms: { chartDetails: 'Lihat carta dan asas pengiraan', imageTools: 'Hasilkan imej daripada perundingan anda' },
};

export function getResultReferenceCopy(locale: LoadingLocale): ResultCopy {
  return COPY[locale] || COPY.en;
}
