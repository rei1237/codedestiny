import FeatureLandingPage from "../../components/FeatureLandingPage";
import { withUniqueRouteMetadata } from "../../../lib/generate-page-metadata";
import RouteMetadataLocaleSync from "../../components/RouteMetadataLocaleSync";

const ART = "/images/feature-details/royal-tea-oracle-hero-v3.webp";
const KO = {
  title: "무료 영국 홍차점 | 여덟 장으로 읽는 찻잎 감정서",
  h1: "영국 홍차점",
  description: "연애·일·돈·가족·선택 중 하나를 고르세요. 찻잔의 테두리, 잔벽, 바닥에 놓인 세 형상을 따라 여덟 장의 상징 감정서를 무료로 읽어요.",
  landingPoints: ["다섯 가지 고민 중 하나 선택", "찻잔의 세 자리와 여덟 장의 해석", "사진·생년 입력 없이 무료로 읽기"],
  seoText: "영국의 찻잎 읽기에서 영감을 얻은 디지털 운세예요. 실제 찻잎 사진을 분석하거나 AI가 새 답변을 쓰지 않아요. 같은 계정 또는 같은 브라우저에서 한국 날짜와 주제가 같으면 같은 잔이 나와요. 화면에 있는 이전 잔 목록은 새로고침하면 사라지고, 공유에는 요약이나 링크만 담겨요. 계정 보관함과 PDF는 제공하지 않아요. 잔 속 시기와 선명도는 사건 날짜나 적중 확률이 아니라 상징을 읽는 단서예요.",
};

const LOCALIZED = {
  en: {
    title: "Free British Tea Leaf Reading | Tasseography",
    h1: "British Tea Leaf Reading",
    description: "Choose love, work, money, family, or a decision. Read three symbols at the rim, wall, and base of your cup in a free eight-part reading.",
    landingPoints: ["Five topics to choose from", "Three symbols in eight sections", "Free, with no photo needed"],
    seoText: "This digital reading reworks written interpretations inspired by British tea-leaf reading. It does not analyze photos or generate a new AI answer. Read the symbols as prompts for reflection, not as predictions.",
  },
  ja: {
    title: "無料の英国式紅茶占い｜茶葉のシンボル",
    h1: "英国式紅茶占い",
    description: "恋愛・仕事・お金・家族・選択から一つ選び、カップの縁、内側、底に現れる三つの形を八つの項目で無料で読み解きます。",
    landingPoints: ["五つのテーマ", "三つの形を八つの項目で解説", "無料・写真不要"],
    seoText: "英国の茶葉占いに着想を得たデジタル体験です。写真の解析やAIによる新しい回答の生成はありません。未来の予測ではなく、考えを整理するきっかけとしてお楽しみください。",
  },
  "zh-CN": {
    title: "免费英式红茶占卜｜茶叶象征解读",
    h1: "英式红茶占卜",
    description: "从爱情、工作、金钱、家庭和选择中挑一个主题，免费阅读杯沿、杯壁和杯底三个图形的八段解读。",
    landingPoints: ["五种主题", "三个图形，八段解读", "免费，无需上传照片"],
    seoText: "这项数字体验的灵感来自英国茶叶占卜。它不分析照片，也不会用 AI 生成新答案。图形只供反思，不用于预测未来。",
  },
  "zh-TW": {
    title: "免費英式紅茶占卜｜茶葉象徵解讀",
    h1: "英式紅茶占卜",
    description: "從愛情、工作、金錢、家庭和選擇中挑一個主題，免費閱讀杯緣、杯壁和杯底三個圖形的八段解讀。",
    landingPoints: ["五種主題", "三個圖形，八段解讀", "免費，不需上傳照片"],
    seoText: "這項數位體驗的靈感來自英國茶葉占卜。它不分析照片，也不會用 AI 生成新答案。圖形僅供反思，不用來預測未來。",
  },
  vi: {
    title: "Đọc biểu tượng lá trà kiểu Anh miễn phí",
    h1: "Đọc lá trà kiểu Anh",
    description: "Chọn tình yêu, công việc, tiền bạc, gia đình hoặc một quyết định. Đọc ba biểu tượng ở miệng, thành và đáy tách qua tám phần miễn phí.",
    landingPoints: ["Năm chủ đề", "Ba biểu tượng, tám phần", "Miễn phí, không cần ảnh"],
    seoText: "Trải nghiệm số lấy cảm hứng từ cách đọc lá trà của Anh. Không phân tích ảnh hay dùng AI để tạo câu trả lời mới. Các biểu tượng gợi suy ngẫm, không dự đoán tương lai.",
  },
  hi: {
    title: "मुफ़्त ब्रिटिश चाय-पत्ती पाठ",
    h1: "ब्रिटिश चाय-पत्ती पाठ",
    description: "प्रेम, काम, धन, परिवार या किसी फ़ैसले को चुनें। कप के किनारे, अंदरूनी दीवार और तली के तीन प्रतीकों को आठ भागों में मुफ़्त पढ़ें।",
    landingPoints: ["पाँच विषय", "तीन प्रतीक, आठ भाग", "मुफ़्त, फ़ोटो की ज़रूरत नहीं"],
    seoText: "यह डिजिटल अनुभव ब्रिटिश चाय-पत्ती पढ़ने की शैली से प्रेरित है। इसमें फ़ोटो का विश्लेषण या AI से नया जवाब तैयार नहीं होता। प्रतीक सोचने के संकेत हैं, भविष्यवाणी नहीं।",
  },
  es: {
    title: "Lectura británica de hojas de té gratis",
    h1: "Lectura británica de hojas de té",
    description: "Elige amor, trabajo, dinero, familia o una decisión. Lee gratis, en ocho partes, tres símbolos del borde, la pared y el fondo de la taza.",
    landingPoints: ["Cinco temas", "Tres símbolos en ocho partes", "Gratis, sin fotos"],
    seoText: "Una experiencia digital inspirada en la lectura británica de hojas de té. No analiza fotos ni genera respuestas nuevas con IA. Los símbolos invitan a reflexionar; no predicen el futuro.",
  },
  fr: {
    title: "Lecture britannique gratuite des feuilles de thé",
    h1: "Lecture britannique des feuilles de thé",
    description: "Choisissez l’amour, le travail, l’argent, la famille ou une décision. Découvrez gratuitement en huit parties trois symboles, du bord au fond de la tasse.",
    landingPoints: ["Cinq thèmes", "Trois symboles en huit parties", "Gratuit, sans photo"],
    seoText: "Une expérience numérique inspirée de la lecture britannique des feuilles de thé. Elle n’analyse pas de photo et ne génère pas de réponse avec l’IA. Les symboles invitent à réfléchir, sans prédire l’avenir.",
  },
  de: {
    title: "Kostenloses britisches Teeblattlesen",
    h1: "Britisches Teeblattlesen",
    description: "Wähle Liebe, Arbeit, Geld, Familie oder eine Entscheidung. Lies drei Symbole am Rand, an der Innenwand und am Boden der Tasse in acht kostenlosen Abschnitten.",
    landingPoints: ["Fünf Themen", "Drei Symbole in acht Abschnitten", "Kostenlos, ohne Foto"],
    seoText: "Ein digitales Erlebnis, inspiriert vom britischen Teeblattlesen. Es analysiert keine Fotos und erzeugt keine neuen KI-Antworten. Die Symbole regen zum Nachdenken an und sagen die Zukunft nicht voraus.",
  },
  nl: {
    title: "Gratis Britse theebladlezing",
    h1: "Britse theebladlezing",
    description: "Kies liefde, werk, geld, familie of een beslissing. Lees gratis in acht delen drie symbolen aan de rand, binnenwand en bodem van je kop.",
    landingPoints: ["Vijf onderwerpen", "Drie symbolen in acht delen", "Gratis, zonder foto"],
    seoText: "Een digitale ervaring geïnspireerd op het Britse theebladlezen. Er wordt geen foto geanalyseerd en AI schrijft geen nieuw antwoord. De symbolen nodigen uit tot nadenken en voorspellen de toekomst niet.",
  },
  ms: {
    title: "Bacaan daun teh gaya Britain percuma",
    h1: "Bacaan daun teh gaya Britain",
    description: "Pilih cinta, kerja, wang, keluarga atau keputusan. Baca tiga simbol di bibir, dinding dalam dan dasar cawan dalam lapan bahagian percuma.",
    landingPoints: ["Lima topik", "Tiga simbol dalam lapan bahagian", "Percuma, tanpa foto"],
    seoText: "Pengalaman digital yang diilhamkan oleh bacaan daun teh gaya Britain. Ia tidak menganalisis foto atau menjana jawapan baharu dengan AI. Simbol mengajak anda merenung, bukan meramal masa depan.",
  },
};

const SERVICE = { ...KO, ogImage: ART, localized: LOCALIZED };
function metadataCopy({ title, description }: { title: string; description: string }) {
  return { title, description };
}
const ROYAL_TEA_METADATA_COPY = {
  ko: metadataCopy(KO),
  en: metadataCopy(LOCALIZED.en),
  ja: metadataCopy(LOCALIZED.ja),
  zh: metadataCopy(LOCALIZED["zh-CN"]),
};

export const metadata = withUniqueRouteMetadata("/oracle/royal-tea", {
  title: KO.title,
  description: KO.description,
  openGraph: { images: [ART] },
});

export default function RoyalTeaLandingPage() {
  return (
    <>
      <RouteMetadataLocaleSync entries={ROYAL_TEA_METADATA_COPY} />
      <FeatureLandingPage service={SERVICE} />
    </>
  );
}
