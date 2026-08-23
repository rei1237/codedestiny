import FeatureLandingPage from "../../components/FeatureLandingPage";
import { withUniqueRouteMetadata } from "../../../lib/generate-page-metadata";

const SAJU_BASIC_PAGE_TEXT_TRANSLATIONS = {
  h1: "사주 만세력 기본 해석",
  metadataTitle: "사주 만세력 기본 해석 | 오행·십성·명식 분석",
  description:
    "사주 명식의 네 기둥, 오행 균형, 십성의 의미를 초보자도 이해할 수 있도록 단계별로 설명하고 현재 선택에 참고할 해석 포인트와 주의점을 정리합니다.",
  metadataDescription:
    "사주 명식의 네 기둥, 오행 균형, 십성의 의미를 초보자도 이해할 수 있도록 단계별로 설명하고 현재 선택에 참고할 해석 포인트와 주의점을 정리합니다.",
  ogImage: "/fuctionassets/saju.webp",
  landingPoints: ["사주 명식 구조 확인", "오행 균형 분석", "십성 흐름 해석"],
  seoText:
    "사주 기본 해석은 생년월일과 시간을 바탕으로 명식을 확인하고, 오행과 십성이 현재의 선택과 관계 흐름에 어떤 신호를 주는지 정리합니다.",
  valueGuideTitle: "사주 기본 해석을 읽는 순서",
  valueSections: [
    {
      title: "1. 명식의 네 기둥을 먼저 확인합니다",
      body:
        "연월일시의 천간과 지지를 나누어 보고, 일간을 중심으로 다른 기둥이 어떤 역할을 하는지 차례로 살펴봅니다.",
    },
    {
      title: "2. 오행 균형을 단순한 많고 적음으로 보지 않습니다",
      body:
        "오행은 개수만이 아니라 계절, 위치, 관계에 따라 힘이 달라집니다. 강한 요소와 약한 요소가 실제 생활에서 어떻게 드러나는지 함께 읽어야 합니다.",
    },
    {
      title: "3. 십성은 성격표가 아니라 역할 언어입니다",
      body:
        "비견, 식상, 재성, 관성, 인성은 사람을 단정하는 말이 아니라 일, 관계, 학습, 책임을 처리하는 방식을 설명하는 언어입니다.",
    },
    {
      title: "4. 명식은 여덟 글자로 이루어집니다",
      body:
        "연주, 월주, 일주, 시주 네 기둥이 각각 천간 한 글자와 지지 한 글자를 가져 모두 여덟 글자가 됩니다. 그 가운데 일간(일주의 천간)이 나 자신을 가리키고, 나머지 일곱 글자는 그 일간이 놓인 환경으로 읽습니다. 출생 시간을 모르면 시주가 비므로 해석의 범위가 좁아지지만, 연·월·일만으로도 기본 성향과 큰 흐름은 읽을 수 있습니다.",
    },
    {
      title: "5. 열 가지 십성이 각각 다루는 영역",
      body:
        "비견과 겁재는 나와 대등한 힘, 곧 동료·경쟁·독립을 다룹니다. 식신과 상관은 내가 밖으로 꺼내는 표현과 생산을, 편재와 정재는 돈과 자원을 다루는 방식을, 편관과 정관은 책임과 규율을, 편인과 정인은 배움과 지원을 가리킵니다. 열 가지가 고르게 있는 명식은 드물고, 무엇이 많고 무엇이 비어 있는지가 곧 그 사람의 작동 방식입니다.",
    },
    {
      title: "6. 오행 다섯 가지를 읽는 기준",
      body:
        "목(木)은 뻗어 나가는 힘, 화(火)는 드러내고 태우는 힘, 토(土)는 모으고 버티는 힘, 금(金)은 다듬고 자르는 힘, 수(水)는 스며들고 저장하는 힘입니다. 많다고 좋고 적다고 나쁜 것이 아니라, 태어난 계절과 일간의 강약에 따라 같은 오행이 도움이 되기도 하고 부담이 되기도 합니다.",
    },
    {
      title: "7. 기본 해석을 어디까지 믿을 것인가",
      body:
        "기본 해석은 명식의 구조를 확인하는 단계이지 결론을 내리는 단계가 아닙니다. 같은 명식이라도 대운과 세운이 지나는 자리에 따라 같은 글자가 다르게 작동하므로, 지금의 선택을 점검하는 참고 자료로 쓰고 큰 결정은 현실의 조건과 함께 판단하시길 권합니다.",
    },
  ],
  localized: {
    en: {
      title: "Basic Four Pillars Reading - Five Elements, Ten Gods, and Chart Structure",
      h1: "Basic Four Pillars Reading",
      description:
        "A step-by-step guide to the four pillars of a birth chart, the balance of the Five Elements, and the meaning of the Ten Gods, with practical points for current choices and cautions.",
      landingPoints: ["Read the four-pillar chart structure", "Review Five Elements balance", "Understand Ten Gods flow"],
      seoText:
        "A basic Four Pillars reading reviews the birth chart from date and time, then clarifies how the Five Elements and Ten Gods may signal current choices and relationship patterns.",
      valueGuideTitle: "How to read the basic Four Pillars report",
      valueSections: [
        { title: "1. Start with the four pillars of the chart", body: "Separate the heavenly stems and earthly branches of year, month, day, and hour, then read how each pillar acts around the day master." },
        { title: "2. Do not reduce Five Elements balance to simple counts", body: "The strength of each element changes by season, placement, and relationship. Read how strong and weak elements appear in real life." },
        { title: "3. Ten Gods are role language, not personality labels", body: "Companion, output, wealth, authority, and resource stars describe how work, relationships, learning, and responsibility are handled." },
      ],
    },
    ja: {
      title: "四柱推命の基本鑑定 - 五行・十神・命式分析",
      h1: "四柱推命の基本鑑定",
      description:
        "生年月日時から命式の四つの柱、五行バランス、十神の意味を段階的に読み解き、今の選択に役立つ解釈ポイントと注意点を整えます。",
      landingPoints: ["命式の四柱構造を確認", "五行バランスを分析", "十神の流れを読み解く"],
      seoText:
        "四柱推命の基本鑑定は、生年月日と時刻をもとに命式を確認し、五行と十神が現在の選択や関係の流れにどのような示唆を与えるかを読み解きます。",
      valueGuideTitle: "四柱推命の基本鑑定を読む順序",
      valueSections: [
        { title: "1. まず命式の四つの柱を確認します", body: "年・月・日・時の天干と地支を分け、日干を中心にそれぞれの柱がどんな役割を持つか順に見ていきます。" },
        { title: "2. 五行バランスを単なる多い少ないで見ません", body: "五行は数だけでなく、季節、位置、関係によって力が変わります。強い要素と弱い要素が生活にどう表れるかを合わせて読みます。" },
        { title: "3. 十神は性格表ではなく役割の言葉です", body: "比肩、食傷、財星、官星、印星は人を決めつける言葉ではなく、仕事、関係、学び、責任の扱い方を示す言葉です。" },
      ],
    },
    "zh-CN": {
      title: "四柱推命基础解读 - 五行、十神与命盘结构",
      h1: "四柱推命基础解读",
      description:
        "根据出生年月日时，逐步说明命盘四柱、五行平衡与十神含义，并整理可参考于当前选择的解读重点与注意事项。",
      landingPoints: ["确认四柱命盘结构", "分析五行平衡", "解读十神流向"],
      seoText:
        "四柱推命基础解读会根据出生日期与时间确认命盘，并整理五行与十神如何提示当前选择和关系流向。",
      valueGuideTitle: "阅读四柱推命基础解读的顺序",
      valueSections: [
        { title: "1. 先确认命盘的四柱", body: "将年、月、日、时的天干地支分开，以日主为中心依次观察其他柱所承担的作用。" },
        { title: "2. 五行平衡不只看数量多少", body: "五行的力量会因季节、位置与相互关系而变化，需要同时观察强弱元素在现实生活中的表现。" },
        { title: "3. 十神是角色语言，不是性格标签", body: "比肩、食伤、财星、官星、印星并不是给人下定义，而是说明工作、关系、学习与责任的处理方式。" },
      ],
    },
    "zh-TW": {
      title: "四柱推命基礎解讀 - 五行、十神與命盤結構",
      h1: "四柱推命基礎解讀",
      description:
        "根據出生年月日時，逐步說明命盤四柱、五行平衡與十神含義，並整理可參考於當前選擇的解讀重點與注意事項。",
      landingPoints: ["確認四柱命盤結構", "分析五行平衡", "解讀十神流向"],
      seoText:
        "四柱推命基礎解讀會根據出生日期與時間確認命盤，並整理五行與十神如何提示當前選擇和關係流向。",
      valueGuideTitle: "閱讀四柱推命基礎解讀的順序",
      valueSections: [
        { title: "1. 先確認命盤的四柱", body: "將年、月、日、時的天干地支分開，以日主為中心依次觀察其他柱所承擔的作用。" },
        { title: "2. 五行平衡不只看數量多少", body: "五行的力量會因季節、位置與相互關係而變化，需要同時觀察強弱元素在現實生活中的表現。" },
        { title: "3. 十神是角色語言，不是性格標籤", body: "比肩、食傷、財星、官星、印星並不是給人下定義，而是說明工作、關係、學習與責任的處理方式。" },
      ],
    },
    vi: {
      title: "Luận Tứ Trụ cơ bản - Ngũ hành, Thập thần và cấu trúc lá số",
      h1: "Luận Tứ Trụ cơ bản",
      description:
        "Giải thích từng bước bốn trụ của lá số, cân bằng Ngũ hành và ý nghĩa Thập thần, kèm các điểm tham khảo cho lựa chọn hiện tại và điều cần lưu ý.",
      landingPoints: ["Xem cấu trúc bốn trụ", "Phân tích cân bằng Ngũ hành", "Đọc dòng chảy Thập thần"],
      seoText:
        "Luận Tứ Trụ cơ bản kiểm tra lá số từ ngày giờ sinh, rồi làm rõ Ngũ hành và Thập thần đang gợi ý gì cho lựa chọn và quan hệ hiện tại.",
      valueGuideTitle: "Thứ tự đọc luận Tứ Trụ cơ bản",
      valueSections: [
        { title: "1. Trước hết xem bốn trụ của lá số", body: "Tách thiên can và địa chi của năm, tháng, ngày, giờ, rồi đọc vai trò từng trụ quanh nhật chủ." },
        { title: "2. Không nhìn cân bằng Ngũ hành chỉ bằng số lượng", body: "Sức mạnh của mỗi hành thay đổi theo mùa, vị trí và quan hệ. Hãy đọc cách hành mạnh và hành yếu biểu hiện trong đời sống." },
        { title: "3. Thập thần là ngôn ngữ vai trò, không phải nhãn tính cách", body: "Tỷ kiên, thực thương, tài tinh, quan tinh và ấn tinh mô tả cách xử lý công việc, quan hệ, học tập và trách nhiệm." },
      ],
    },
    hi: {
      title: "मूल चार स्तंभ रीडिंग - पाँच तत्व, दस देवता और चार्ट संरचना",
      h1: "मूल चार स्तंभ रीडिंग",
      description:
        "जन्म तारीख और समय से चार्ट के चार स्तंभ, पाँच तत्वों का संतुलन और दस देवताओं का अर्थ क्रम से पढ़कर वर्तमान चुनावों के लिए संकेत और सावधानियाँ व्यवस्थित करता है.",
      landingPoints: ["चार स्तंभों की संरचना देखें", "पाँच तत्वों का संतुलन पढ़ें", "दस देवताओं के प्रवाह को समझें"],
      seoText:
        "मूल चार स्तंभ रीडिंग जन्म तारीख और समय से चार्ट देखती है और बताती है कि पाँच तत्व व दस देवता वर्तमान चुनाव और संबंधों में कौन से संकेत देते हैं.",
      valueGuideTitle: "मूल चार स्तंभ रिपोर्ट पढ़ने का क्रम",
      valueSections: [
        { title: "1. पहले चार्ट के चार स्तंभ देखें", body: "वर्ष, महीना, दिन और घंटे के स्वर्गीय तनों व पृथ्वी शाखाओं को अलग कर दिन स्वामी के केंद्र में बाकी स्तंभों की भूमिका पढ़ें." },
        { title: "2. पाँच तत्व संतुलन को केवल गिनती से न देखें", body: "हर तत्व की शक्ति ऋतु, स्थान और संबंध से बदलती है. मजबूत और कमजोर तत्व जीवन में कैसे दिखते हैं, इसे साथ पढ़ें." },
        { title: "3. दस देवता भूमिका की भाषा हैं, व्यक्तित्व की मुहर नहीं", body: "साथी, अभिव्यक्ति, धन, अधिकार और संसाधन सितारे काम, संबंध, सीखने और जिम्मेदारी संभालने का ढंग बताते हैं." },
      ],
    },
    es: {
      title: "Lectura básica de Cuatro Pilares - Cinco Elementos, Diez Dioses y estructura",
      h1: "Lectura básica de Cuatro Pilares",
      description:
        "Explica paso a paso los cuatro pilares de la carta natal, el equilibrio de los Cinco Elementos y el significado de los Diez Dioses, con puntos prácticos para tus decisiones actuales.",
      landingPoints: ["Revisar la estructura de los cuatro pilares", "Analizar el equilibrio de los Cinco Elementos", "Leer el flujo de los Diez Dioses"],
      seoText:
        "La lectura básica de Cuatro Pilares revisa la carta desde fecha y hora de nacimiento y aclara qué señales dan los Cinco Elementos y los Diez Dioses para elecciones y relaciones actuales.",
      valueGuideTitle: "Orden para leer la interpretación básica de Cuatro Pilares",
      valueSections: [
        { title: "1. Empieza por los cuatro pilares de la carta", body: "Separa tallos celestes y ramas terrestres de año, mes, día y hora, y observa el papel de cada pilar alrededor del maestro del día." },
        { title: "2. No reduzcas los Cinco Elementos a una simple cantidad", body: "La fuerza de cada elemento cambia por estación, posición y relación. Lee cómo aparecen los elementos fuertes y débiles en la vida real." },
        { title: "3. Los Diez Dioses son lenguaje de roles, no etiquetas", body: "Compañero, producción, riqueza, autoridad y recurso describen cómo se gestionan trabajo, relaciones, aprendizaje y responsabilidad." },
      ],
    },
    fr: {
      title: "Lecture de base des Quatre Piliers - Cinq Éléments, Dix Dieux et structure",
      h1: "Lecture de base des Quatre Piliers",
      description:
        "Une lecture étape par étape des quatre piliers du thème, de l'équilibre des Cinq Éléments et du sens des Dix Dieux, avec des repères pour les choix actuels.",
      landingPoints: ["Lire la structure des quatre piliers", "Analyser l'équilibre des Cinq Éléments", "Comprendre le flux des Dix Dieux"],
      seoText:
        "La lecture de base des Quatre Piliers vérifie le thème à partir de la date et de l'heure de naissance, puis clarifie les signaux des Cinq Éléments et des Dix Dieux dans les choix et relations.",
      valueGuideTitle: "Ordre de lecture du rapport de base des Quatre Piliers",
      valueSections: [
        { title: "1. Commencez par les quatre piliers du thème", body: "Séparez les troncs célestes et branches terrestres de l'année, du mois, du jour et de l'heure, puis lisez le rôle de chaque pilier autour du maître du jour." },
        { title: "2. Ne réduisez pas les Cinq Éléments à un comptage", body: "La force d'un élément varie selon la saison, la position et les relations. Lisez comment les éléments forts et faibles se manifestent dans la vie." },
        { title: "3. Les Dix Dieux sont un langage de rôles", body: "Compagnon, expression, richesse, autorité et ressource décrivent la manière de gérer travail, liens, apprentissage et responsabilités." },
      ],
    },
    de: {
      title: "Grundlegende Vier-Säulen-Lesung - Fünf Elemente, Zehn Götter und Chartstruktur",
      h1: "Grundlegende Vier-Säulen-Lesung",
      description:
        "Eine schrittweise Erklärung der vier Säulen des Geburtscharts, der Balance der Fünf Elemente und der Bedeutung der Zehn Götter mit Hinweisen für aktuelle Entscheidungen.",
      landingPoints: ["Struktur der vier Säulen prüfen", "Balance der Fünf Elemente analysieren", "Fluss der Zehn Götter lesen"],
      seoText:
        "Die grundlegende Vier-Säulen-Lesung prüft das Chart anhand von Geburtsdatum und Zeit und zeigt, welche Signale Fünf Elemente und Zehn Götter für Entscheidungen und Beziehungen geben.",
      valueGuideTitle: "Reihenfolge für die grundlegende Vier-Säulen-Lesung",
      valueSections: [
        { title: "1. Zuerst die vier Säulen des Charts ansehen", body: "Trenne Himmelsstämme und Erdzweige von Jahr, Monat, Tag und Stunde und lies die Rolle jeder Säule um den Tagesmeister." },
        { title: "2. Fünf-Elemente-Balance nicht nur zählen", body: "Die Kraft eines Elements verändert sich durch Jahreszeit, Position und Beziehung. Lies, wie starke und schwache Elemente im Alltag erscheinen." },
        { title: "3. Die Zehn Götter sind Rollensprache", body: "Begleiter, Ausdruck, Reichtum, Autorität und Ressource beschreiben den Umgang mit Arbeit, Beziehungen, Lernen und Verantwortung." },
      ],
    },
    nl: {
      title: "Basislezing Vier Pilaren - Vijf Elementen, Tien Goden en kaartstructuur",
      h1: "Basislezing Vier Pilaren",
      description:
        "Een stapsgewijze uitleg van de vier pijlers van de geboortekaart, de balans van de Vijf Elementen en de betekenis van de Tien Goden, met aandachtspunten voor huidige keuzes.",
      landingPoints: ["Structuur van de vier pijlers lezen", "Balans van de Vijf Elementen bekijken", "Stroom van de Tien Goden begrijpen"],
      seoText:
        "Een basislezing Vier Pilaren bekijkt de kaart vanuit geboortedatum en tijd en verduidelijkt welke signalen de Vijf Elementen en Tien Goden geven voor keuzes en relaties.",
      valueGuideTitle: "Volgorde voor het lezen van de basis Vier Pilaren",
      valueSections: [
        { title: "1. Begin met de vier pijlers van de kaart", body: "Scheid hemelse stammen en aardse takken van jaar, maand, dag en uur en lees de rol van elke pijler rond de dagmeester." },
        { title: "2. Tel de Vijf Elementen niet alleen op", body: "De kracht van elk element verandert door seizoen, plaatsing en relatie. Lees hoe sterke en zwakke elementen in het leven verschijnen." },
        { title: "3. De Tien Goden zijn taal voor rollen", body: "Metgezel, expressie, rijkdom, autoriteit en bron beschrijven hoe werk, relaties, leren en verantwoordelijkheid worden gehanteerd." },
      ],
    },
    ms: {
      title: "Bacaan asas Empat Tiang - Lima Unsur, Sepuluh Dewa dan struktur carta",
      h1: "Bacaan asas Empat Tiang",
      description:
        "Panduan langkah demi langkah tentang empat tiang carta kelahiran, keseimbangan Lima Unsur dan makna Sepuluh Dewa, bersama petunjuk untuk pilihan semasa.",
      landingPoints: ["Baca struktur empat tiang", "Semak keseimbangan Lima Unsur", "Fahami aliran Sepuluh Dewa"],
      seoText:
        "Bacaan asas Empat Tiang menyemak carta daripada tarikh dan masa lahir, lalu menjelaskan isyarat Lima Unsur dan Sepuluh Dewa untuk pilihan serta hubungan semasa.",
      valueGuideTitle: "Susunan membaca laporan asas Empat Tiang",
      valueSections: [
        { title: "1. Mulakan dengan empat tiang carta", body: "Pisahkan batang langit dan cabang bumi bagi tahun, bulan, hari dan jam, lalu baca peranan setiap tiang di sekeliling day master." },
        { title: "2. Jangan melihat Lima Unsur sebagai kiraan semata-mata", body: "Kekuatan setiap unsur berubah mengikut musim, kedudukan dan hubungan. Baca bagaimana unsur kuat dan lemah muncul dalam kehidupan." },
        { title: "3. Sepuluh Dewa ialah bahasa peranan", body: "Bintang teman, ekspresi, kekayaan, kuasa dan sumber menerangkan cara mengendalikan kerja, hubungan, pembelajaran dan tanggungjawab." },
      ],
    },
  },
};

export const metadata = withUniqueRouteMetadata("/saju/basic", {
  title: SAJU_BASIC_PAGE_TEXT_TRANSLATIONS.metadataTitle,
  description: SAJU_BASIC_PAGE_TEXT_TRANSLATIONS.metadataDescription,
});

export default function SajuBasicLandingPage() {
  return <FeatureLandingPage service={SAJU_BASIC_PAGE_TEXT_TRANSLATIONS} />;
}
