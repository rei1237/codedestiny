// Presentation only. Adding a merchant here never grants outbound-link permission.
export const AFFILIATE_BRANDS = Object.freeze({
  yeongnyangi: { home: '/yeongnyangi/', image: '/assets/yeongnyangi/original/hero-800.webp' },
  ggulggul: { home: '/ggulggul/', image: '/images/fortune-tea-house/renewal/yeoni-tea-welcome.webp' },
});
export function affiliateBrand(value) {
  return value === 'yeoni' || value === 'ggulggul' || value === 'neo' ? 'ggulggul' : 'yeongnyangi';
}
export function affiliateBrowsePath(brand) {
  return '/recommendations/?brand=' + affiliateBrand(brand);
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
const keys = ['yeoniTitle','ynLead','yeoniLead','selection','criteriaTitle','partner','partnerTerms','bookPartner','lifePartner','unregisteredPartner','pendingLink','previewImage','genericDisclosure'];
const rows = {
  ko: ['연이의 작은 추천 서가','운세를 읽은 뒤,\n취향이 머무는 일상으로.','마음을 읽은 뒤,\n나를 돌보는 작은 선택.','관심사에 맞춰 둘러보기','구매보다 먼저, 나에게 맞는지','판매처','가격·배송·취소 조건은 판매처에서 확인해 주세요.','도서 제휴사 예시','라이프스타일 제휴사 예시','미등록 제휴사','제휴 준비 중 · 이동 없음','상품 이미지 자리 · 판매 상품 아님','제휴 광고 · 이 페이지의 제휴 링크를 통해 구매하면 일정액의 수수료를 받을 수 있습니다.'],
  en: ["Yeoni’s little shelf",'After your reading,\nmake room for everyday taste.','After reflection,\na little care for yourself.','Explore your interests','Before buying, find your fit','Merchant','Check prices, delivery and cancellation terms with the merchant.','Book partner example','Lifestyle partner example','Unregistered partner','Partner pending · No link','Image placeholder · Not a product','Affiliate advertising · We may earn a commission on purchases through affiliate links on this page.'],
  ja: ['ヨニの小さなおすすめ本棚','占いのあとに、\n日々の好きを見つけて。','心を見つめたあとに、\n自分をいたわる小さな選択。','関心に合わせて探す','買う前に、自分に合うかを','販売店','価格・配送・キャンセル条件は販売店で確認してください。','書籍提携先の例','暮らしの提携先の例','未登録の提携先','提携準備中・リンクなし','画像の配置例・販売商品ではありません','アフィリエイト広告・このページの提携リンクから購入すると、手数料を受け取る場合があります。'],
  'zh-CN':['妍伊的小小推荐书架','读过运势，\n寻找日常的喜好。','读懂内心，\n做一个照顾自己的小选择。','按兴趣浏览','购买前，先看是否适合','商家','请在商家页面确认价格、配送和取消条件。','图书合作方示例','生活方式合作方示例','未注册合作方','合作准备中 · 无链接','图片占位 · 非真实商品','联盟广告 · 通过本页联盟链接购买，我们可能获得佣金。'],
  'zh-TW':['妍伊的小小推薦書架','讀過運勢，\n尋找日常的喜好。','讀懂內心，\n做一個照顧自己的小選擇。','依興趣瀏覽','購買前，先看是否適合','商家','請在商家頁面確認價格、配送和取消條件。','圖書合作方範例','生活風格合作方範例','未註冊合作方','合作準備中 · 無連結','圖片預留位置 · 非真實商品','聯盟廣告 · 透過本頁聯盟連結購買，我們可能獲得佣金。'],
  vi:['Kệ nhỏ của Yeoni','Sau bài luận,\nkhám phá sở thích mỗi ngày.','Sau khi nhìn lại,\nchăm sóc bản thân một chút.','Khám phá theo sở thích','Trước khi mua, xem có phù hợp','Nhà bán','Kiểm tra giá, giao hàng và điều kiện hủy với nhà bán.','Ví dụ đối tác sách','Ví dụ đối tác đời sống','Đối tác chưa đăng ký','Đang chuẩn bị · Không có liên kết','Vị trí ảnh · Không phải sản phẩm','Quảng cáo liên kết · Chúng tôi có thể nhận hoa hồng từ giao dịch qua liên kết trên trang này.'],
  hi:['योनी की छोटी अलमारी','रीडिंग के बाद,\nरोज़मर्रा की पसंद के लिए जगह।','मन को समझने के बाद,\nअपना थोड़ा खयाल।','अपनी रुचि से खोजें','खरीदने से पहले, अपनी ज़रूरत देखें','विक्रेता','मूल्य, डिलीवरी और रद्द करने की शर्तें विक्रेता से जाँचें।','पुस्तक भागीदार का उदाहरण','जीवनशैली भागीदार का उदाहरण','अपंजीकृत भागीदार','तैयारी जारी · कोई लिंक नहीं','चित्र का स्थान · वास्तविक उत्पाद नहीं','संबद्ध विज्ञापन · इस पेज के संबद्ध लिंक से खरीदारी पर हमें कमीशन मिल सकता है।'],
  es:['La pequeña estantería de Yeoni','Después de tu lectura,\nun lugar para tus gustos.','Tras reflexionar,\nun pequeño cuidado personal.','Explora tus intereses','Antes de comprar, elige lo que encaja','Vendedor','Consulta precios, entrega y cancelación con el vendedor.','Ejemplo de socio de libros','Ejemplo de socio de estilo de vida','Socio no registrado','En preparación · Sin enlace','Espacio de imagen · No es un producto','Publicidad de afiliados · Podemos recibir una comisión por compras mediante los enlaces de esta página.'],
  fr:['La petite bibliothèque de Yeoni','Après votre lecture,\nplace à vos goûts au quotidien.','Après la réflexion,\nun peu de soin pour soi.','Explorer vos centres d’intérêt','Avant d’acheter, trouver ce qui convient','Vendeur','Vérifiez prix, livraison et annulation auprès du vendeur.','Exemple de partenaire livres','Exemple de partenaire art de vivre','Partenaire non enregistré','En préparation · Aucun lien','Emplacement d’image · Aucun produit réel','Publicité affiliée · Les achats via les liens affiliés de cette page peuvent nous rapporter une commission.'],
  de:['Yeonis kleines Regal','Nach deiner Lesung,\nRaum für deinen Alltag.','Nach dem Nachdenken,\netwas Fürsorge für dich.','Interessen entdecken','Vor dem Kauf: Passt es zu dir?','Händler','Preise, Lieferung und Stornierung beim Händler prüfen.','Beispiel Buchpartner','Beispiel Lifestyle-Partner','Nicht registrierter Partner','In Vorbereitung · Kein Link','Bildplatzhalter · Kein Produkt','Affiliate-Werbung · Für Käufe über Affiliate-Links auf dieser Seite können wir eine Provision erhalten.'],
  nl:['Yeoni’s kleine boekenplank','Na je lezing,\nruimte voor je dagelijkse smaak.','Na het nadenken,\neen beetje zorg voor jezelf.','Verken je interesses','Past het bij je? Kijk vóór je koopt','Verkoper','Controleer prijs, levering en annulering bij de verkoper.','Voorbeeld boekenpartner','Voorbeeld lifestylepartner','Niet-geregistreerde partner','In voorbereiding · Geen link','Afbeeldingsplek · Geen product','Affiliate-advertentie · We kunnen commissie ontvangen op aankopen via affiliatelinks op deze pagina.'],
  ms:['Rak kecil Yeoni','Selepas bacaan,\nruang untuk cita rasa harian.','Selepas renungan,\nsedikit penjagaan diri.','Terokai minat anda','Sebelum membeli, semak kesesuaian','Penjual','Semak harga, penghantaran dan pembatalan dengan penjual.','Contoh rakan buku','Contoh rakan gaya hidup','Rakan belum berdaftar','Dalam persediaan · Tiada pautan','Ruang imej · Bukan produk','Iklan afiliasi · Kami mungkin menerima komisen daripada pembelian melalui pautan afiliasi di halaman ini.'],
};
export function affiliateCopy(locale = 'ko') {
  const row = rows[locale] || rows.en;
  return Object.fromEntries(keys.map((key, i) => [key, row[i]]));
}
