// Presentation only. Adding a merchant here never grants outbound-link permission.
export function affiliateBrand(value) {
  return value === 'yeoni' || value === 'ggulggul' || value === 'neo' ? 'ggulggul' : 'yeongnyangi';
}
export const AFFILIATE_PRESENTATIONS = Object.freeze({
  coupang: { label: 'Coupang', previewOnly: false },
  aliexpress: { label: 'AliExpress', previewOnly: false },
  'book-partner-preview': { labelKey: 'bookPartner', previewOnly: true },
  'lifestyle-partner-preview': { labelKey: 'lifePartner', previewOnly: true },
});
export function affiliatePresentation(id = 'coupang') {
  return Object.hasOwn(AFFILIATE_PRESENTATIONS, id) ? AFFILIATE_PRESENTATIONS[id] : { labelKey: 'unregisteredPartner', previewOnly: true };
}
const copy = {
  "ko": {
    "inlineTitle": "풀이를 일상으로 잇는 작은 선택",
    "partnerTerms": "가격·배송·취소 조건은 판매처에서 확인해 주세요.",
    "bookPartner": "도서 제휴사 예시",
    "lifePartner": "라이프스타일 제휴사 예시",
    "unregisteredPartner": "미등록 제휴사",
    "pendingLink": "제휴 준비 중 · 이동 없음",
    "previewImage": "상품 이미지 자리 · 판매 상품 아님",
    "genericDisclosure": "제휴 광고 · 이 페이지의 제휴 링크를 통해 구매하면 일정액의 수수료를 받을 수 있습니다.",
    "resultLead": "풀이의 실천 조언에 맞춰 골랐어요."
  },
  "en": {
    "inlineTitle": "Small choices after your reading",
    "partnerTerms": "Check prices, delivery and cancellation terms with the merchant.",
    "bookPartner": "Book partner example",
    "lifePartner": "Lifestyle partner example",
    "unregisteredPartner": "Unregistered partner",
    "pendingLink": "Partner pending · No link",
    "previewImage": "Image placeholder · Not a product",
    "genericDisclosure": "Affiliate advertising · We may earn a commission on purchases through affiliate links on this page.",
    "resultLead": "Picked to match the practical advice in your reading."
  },
  "ja": {
    "inlineTitle": "占いから日常へ、小さな選択",
    "partnerTerms": "価格・配送・キャンセル条件は販売店で確認してください。",
    "bookPartner": "書籍提携先の例",
    "lifePartner": "暮らしの提携先の例",
    "unregisteredPartner": "未登録の提携先",
    "pendingLink": "提携準備中・リンクなし",
    "previewImage": "画像の配置例・販売商品ではありません",
    "genericDisclosure": "アフィリエイト広告・このページの提携リンクから購入すると、手数料を受け取る場合があります。",
    "resultLead": "鑑定の実践アドバイスに合わせて選びました。"
  },
  "zh-CN": {
    "inlineTitle": "将解读带入日常的小选择",
    "partnerTerms": "请在商家页面确认价格、配送和取消条件。",
    "bookPartner": "图书合作方示例",
    "lifePartner": "生活方式合作方示例",
    "unregisteredPartner": "未注册合作方",
    "pendingLink": "合作准备中 · 无链接",
    "previewImage": "图片占位 · 非真实商品",
    "genericDisclosure": "联盟广告 · 通过本页联盟链接购买，我们可能获得佣金。",
    "resultLead": "根据解读中的实践建议挑选。"
  },
  "zh-TW": {
    "inlineTitle": "將解讀帶入日常的小選擇",
    "partnerTerms": "請在商家頁面確認價格、配送和取消條件。",
    "bookPartner": "圖書合作方範例",
    "lifePartner": "生活風格合作方範例",
    "unregisteredPartner": "未註冊合作方",
    "pendingLink": "合作準備中 · 無連結",
    "previewImage": "圖片預留位置 · 非真實商品",
    "genericDisclosure": "聯盟廣告 · 透過本頁聯盟連結購買，我們可能獲得佣金。",
    "resultLead": "依照解讀中的實踐建議挑選。"
  },
  "vi": {
    "inlineTitle": "Lựa chọn nhỏ sau bài luận",
    "partnerTerms": "Kiểm tra giá, giao hàng và điều kiện hủy với nhà bán.",
    "bookPartner": "Ví dụ đối tác sách",
    "lifePartner": "Ví dụ đối tác đời sống",
    "unregisteredPartner": "Đối tác chưa đăng ký",
    "pendingLink": "Đang chuẩn bị · Không có liên kết",
    "previewImage": "Vị trí ảnh · Không phải sản phẩm",
    "genericDisclosure": "Quảng cáo liên kết · Chúng tôi có thể nhận hoa hồng từ giao dịch qua liên kết trên trang này.",
    "resultLead": "Được chọn theo lời khuyên thực hành trong bài luận của bạn."
  },
  "hi": {
    "inlineTitle": "रीडिंग के बाद छोटे कदम",
    "partnerTerms": "मूल्य, डिलीवरी और रद्द करने की शर्तें विक्रेता से जाँचें।",
    "bookPartner": "पुस्तक भागीदार का उदाहरण",
    "lifePartner": "जीवनशैली भागीदार का उदाहरण",
    "unregisteredPartner": "अपंजीकृत भागीदार",
    "pendingLink": "तैयारी जारी · कोई लिंक नहीं",
    "previewImage": "चित्र का स्थान · वास्तविक उत्पाद नहीं",
    "genericDisclosure": "संबद्ध विज्ञापन · इस पेज के संबद्ध लिंक से खरीदारी पर हमें कमीशन मिल सकता है।",
    "resultLead": "आपकी रीडिंग की व्यावहारिक सलाह के अनुसार चुना गया।"
  },
  "es": {
    "inlineTitle": "Pequeñas elecciones tras tu lectura",
    "partnerTerms": "Consulta precios, entrega y cancelación con el vendedor.",
    "bookPartner": "Ejemplo de socio de libros",
    "lifePartner": "Ejemplo de socio de estilo de vida",
    "unregisteredPartner": "Socio no registrado",
    "pendingLink": "En preparación · Sin enlace",
    "previewImage": "Espacio de imagen · No es un producto",
    "genericDisclosure": "Publicidad de afiliados · Podemos recibir una comisión por compras mediante los enlaces de esta página.",
    "resultLead": "Elegido según los consejos prácticos de tu lectura."
  },
  "fr": {
    "inlineTitle": "De petits choix après votre lecture",
    "partnerTerms": "Vérifiez prix, livraison et annulation auprès du vendeur.",
    "bookPartner": "Exemple de partenaire livres",
    "lifePartner": "Exemple de partenaire art de vivre",
    "unregisteredPartner": "Partenaire non enregistré",
    "pendingLink": "En préparation · Aucun lien",
    "previewImage": "Emplacement d’image · Aucun produit réel",
    "genericDisclosure": "Publicité affiliée · Les achats via les liens affiliés de cette page peuvent nous rapporter une commission.",
    "resultLead": "Choisi d’après les conseils pratiques de votre lecture."
  },
  "de": {
    "inlineTitle": "Kleine Schritte nach deiner Deutung",
    "partnerTerms": "Preise, Lieferung und Stornierung beim Händler prüfen.",
    "bookPartner": "Beispiel Buchpartner",
    "lifePartner": "Beispiel Lifestyle-Partner",
    "unregisteredPartner": "Nicht registrierter Partner",
    "pendingLink": "In Vorbereitung · Kein Link",
    "previewImage": "Bildplatzhalter · Kein Produkt",
    "genericDisclosure": "Affiliate-Werbung · Für Käufe über Affiliate-Links auf dieser Seite können wir eine Provision erhalten.",
    "resultLead": "Passend zu den praktischen Ratschlägen deiner Lesung ausgewählt."
  },
  "nl": {
    "inlineTitle": "Kleine keuzes na je duiding",
    "partnerTerms": "Controleer prijs, levering en annulering bij de verkoper.",
    "bookPartner": "Voorbeeld boekenpartner",
    "lifePartner": "Voorbeeld lifestylepartner",
    "unregisteredPartner": "Niet-geregistreerde partner",
    "pendingLink": "In voorbereiding · Geen link",
    "previewImage": "Afbeeldingsplek · Geen product",
    "genericDisclosure": "Affiliate-advertentie · We kunnen commissie ontvangen op aankopen via affiliatelinks op deze pagina.",
    "resultLead": "Gekozen bij het praktische advies uit je lezing."
  },
  "ms": {
    "inlineTitle": "Pilihan kecil selepas bacaan",
    "partnerTerms": "Semak harga, penghantaran dan pembatalan dengan penjual.",
    "bookPartner": "Contoh rakan buku",
    "lifePartner": "Contoh rakan gaya hidup",
    "unregisteredPartner": "Rakan belum berdaftar",
    "pendingLink": "Dalam persediaan · Tiada pautan",
    "previewImage": "Ruang imej · Bukan produk",
    "genericDisclosure": "Iklan afiliasi · Kami mungkin menerima komisen daripada pembelian melalui pautan afiliasi di halaman ini.",
    "resultLead": "Dipilih mengikut nasihat praktikal dalam bacaan anda."
  }
};
export function affiliateCopy(locale = "ko") { return copy[locale] || copy.ko; }
