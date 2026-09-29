import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
const ko={home:'영냥이의 방',library:'내 상담',terms:'이용약관',privacy:'개인정보 처리방침',refund:'환불 정책',contact:'문의하기',loading:'상담방을 준비하고 있어요.',thanks:'구매 확인 · 영냥이의 감사 인사'};
type Copy=typeof ko;
const copies:Record<ReadingLocale,Copy>={
 ko,
 en:{home:'Yeongnyangi',library:'My readings',terms:'Terms',privacy:'Privacy',refund:'Refund policy',contact:'Contact',loading:'Preparing your reading room.',thanks:'Purchase confirmed · Thank you from Yeongnyangi'},
 ja:{home:'ヨンニャンイの部屋',library:'鑑定履歴',terms:'利用規約',privacy:'プライバシー',refund:'返金規定',contact:'お問い合わせ',loading:'鑑定の準備をしています。',thanks:'購入確認 · ヨンニャンイからのお礼'},
 'zh-CN':{home:'英喵的咨询室',library:'我的咨询',terms:'服务条款',privacy:'隐私政策',refund:'退款政策',contact:'联系我们',loading:'正在准备咨询室。',thanks:'购买已确认 · 英喵感谢你'},
 'zh-TW':{home:'英喵的諮詢室',library:'我的諮詢',terms:'服務條款',privacy:'隱私政策',refund:'退款政策',contact:'聯絡我們',loading:'正在準備諮詢室。',thanks:'購買已確認 · 英喵感謝你'},
 vi:{home:'Phòng của Yeongnyangi',library:'Bài luận của tôi',terms:'Điều khoản',privacy:'Quyền riêng tư',refund:'Chính sách hoàn tiền',contact:'Liên hệ',loading:'Đang chuẩn bị bài luận.',thanks:'Đã xác nhận mua · Yeongnyangi cảm ơn bạn'},
 hi:{home:'योंगन्यांगी का कक्ष',library:'मेरे पाठ',terms:'नियम',privacy:'गोपनीयता',refund:'वापसी नीति',contact:'संपर्क',loading:'आपके पाठ की तैयारी हो रही है।',thanks:'खरीद की पुष्टि · योंगन्यांगी की ओर से धन्यवाद'},
 es:{home:'La sala de Yeongnyangi',library:'Mis lecturas',terms:'Condiciones',privacy:'Privacidad',refund:'Política de reembolso',contact:'Contacto',loading:'Preparando tu lectura.',thanks:'Compra confirmada · Gracias de Yeongnyangi'},
 fr:{home:'Le salon de Yeongnyangi',library:'Mes lectures',terms:'Conditions',privacy:'Confidentialité',refund:'Remboursements',contact:'Contact',loading:'Préparation de votre lecture.',thanks:'Achat confirmé · Merci de la part de Yeongnyangi'},
 de:{home:'Yeongnyangis Raum',library:'Meine Deutungen',terms:'Nutzungsbedingungen',privacy:'Datenschutz',refund:'Erstattungen',contact:'Kontakt',loading:'Ihre Deutung wird vorbereitet.',thanks:'Kauf bestätigt · Vielen Dank von Yeongnyangi'},
 nl:{home:'De kamer van Yeongnyangi',library:'Mijn readings',terms:'Voorwaarden',privacy:'Privacy',refund:'Terugbetalingsbeleid',contact:'Contact',loading:'Je reading wordt voorbereid.',thanks:'Aankoop bevestigd · Bedankt van Yeongnyangi'},
 ms:{home:'Bilik Yeongnyangi',library:'Bacaan saya',terms:'Terma',privacy:'Privasi',refund:'Dasar bayaran balik',contact:'Hubungi kami',loading:'Sedang menyediakan bacaan anda.',thanks:'Pembelian disahkan · Terima kasih daripada Yeongnyangi'},
};
export const chromeCopy=(locale:ReadingLocale)=>copies[locale];
