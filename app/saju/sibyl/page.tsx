import FeatureLandingPage from "../../components/FeatureLandingPage";
import RouteMetadataLocaleSync from "../../components/RouteMetadataLocaleSync";

const SERVICE = {
  h1: "시빌라 시스템 — 나의 연간 대비 리포트",
  description: "사주에 담긴 기질과 선택한 연도의 흐름을 읽고 금전·연애·인간관계·직장과 일을 미리 준비하세요.",
  ogImage: "/images/feature-details/saju-sibyl-observatory.webp",
  landingPoints: ["선택 연도의 주의 분야와 시기", "타고난 장점과 그림자", "생활에서 실천하는 개운 행동", "완성된 리포트는 보관함에서 재열람"],
  seoText: "시빌라는 미래의 사건을 확정하는 판정표가 아니라, 내 사주의 패턴과 시간의 흐름을 함께 살피는 개인 분석실입니다.",
  valueGuideTitle: "운을 기다리기보다, 선택을 준비하세요",
  valueSections: [
    {title:"무엇을 미리 대비하나요?",body:"금전·연애·인간관계·직장과 일의 네 분야에서 주의할 구간, 생활에서 확인할 징후와 실행 행동을 제시합니다."},
    {title:"어떤 근거로 읽나요?",body:"저장된 출생정보의 명식·오행·십성과 선택 연도의 대운·세운·월운, 합충형파해를 함께 살핍니다. 전문용어는 근거 영역에서 확인하고 해석은 생활 언어로 읽습니다."},
    {title:"무료 분석과 심층 리포트",body:"기본 결과는 규칙 기반으로 핵심 기질과 연간 주의 분야, 대표 대비 행동을 제공합니다. 유료 리포트는 서버 계산을 바탕으로 AI 상담, 분야별 상세·월별 계획·개운 행동을 확장합니다. 현재 단건 가격은 결제창에서 확인할 수 있습니다."},
    {title:"실행으로 이어지는 개운법",body:"과한 기질의 장점과 그림자를 함께 읽고 소비·관계·업무·생활 리듬에서 바꿀 행동을 찾습니다. 결과는 사고나 손실의 확률을 뜻하지 않습니다."},
    {title:"가상 편집 예시",body:"추진력이 앞서는 흐름이라면 큰 약속 전에 일정과 역할을 먼저 적어보세요. 실제 상황이 안정되면 계획을 다시 넓힐 수 있습니다. 이 문장은 이해를 위한 예시이며 실제 개인 결과나 후기가 아닙니다."},
    {title:"한 번 열고, 보관함에서 다시 읽기",body:"출생정보 단위 잠금 해제를 유지합니다. 같은 출생정보의 다른 연도를 선택해도 재결제하지 않습니다. 완성된 원본은 보관함에 저장되어 다른 기기에서도 로그인 후 추가 결제·생성 없이 다시 읽을 수 있습니다."}
  ],
  localized: {
  "en": {
    "title": "Sibyl — Your annual preparation report",
    "h1": "Sibyl — Your annual preparation report",
    "description": "Read your Four Pillars patterns and prepare for money, love, relationships and work in your chosen year.",
    "landingPoints": [
      "Rule-based basic reading",
      "Detailed annual counseling",
      "Practical preparation actions",
      "Reopen saved reports"
    ],
    "seoText": "Read your Four Pillars patterns and prepare for money, love, relationships and work in your chosen year."
  },
  "ja": {
    "title": "シビラ — 年間の備えレポート",
    "h1": "シビラ — 年間の備えレポート",
    "description": "四柱推命の傾向から、選んだ年のお金・恋愛・人間関係・仕事への備えを考えます。",
    "landingPoints": [
      "規則に基づく基本分析",
      "年間の詳しい相談",
      "暮らしで実践する行動",
      "保存した結果を再閲覧"
    ],
    "seoText": "四柱推命の傾向から、選んだ年のお金・恋愛・人間関係・仕事への備えを考えます。"
  },
  "zh-CN": {
    "title": "Sibyl — 年度准备报告",
    "h1": "Sibyl — 年度准备报告",
    "description": "结合八字与所选年份的变化，为金钱、恋爱、人际关系和工作做好准备。",
    "landingPoints": [
      "规则计算的基础分析",
      "年度深度解读",
      "可实践的生活建议",
      "重读已保存的报告"
    ],
    "seoText": "结合八字与所选年份的变化，为金钱、恋爱、人际关系和工作做好准备。"
  },
  "zh-TW": {
    "title": "Sibyl — 年度準備報告",
    "h1": "Sibyl — 年度準備報告",
    "description": "結合八字與所選年份的變化，為金錢、戀愛、人際關係與工作做好準備。",
    "landingPoints": [
      "規則計算的基礎分析",
      "年度深度解讀",
      "可實踐的生活建議",
      "重讀已儲存的報告"
    ],
    "seoText": "結合八字與所選年份的變化，為金錢、戀愛、人際關係與工作做好準備。"
  },
  "vi": {
    "title": "Sibyl — Báo cáo chuẩn bị hằng năm",
    "h1": "Sibyl — Báo cáo chuẩn bị hằng năm",
    "description": "Đọc xu hướng Tứ Trụ và chuẩn bị cho tài chính, tình yêu, quan hệ và công việc trong năm đã chọn.",
    "landingPoints": [
      "Phân tích cơ bản theo quy tắc",
      "Tư vấn chi tiết theo năm",
      "Hành động thiết thực",
      "Đọc lại báo cáo đã lưu"
    ],
    "seoText": "Đọc xu hướng Tứ Trụ và chuẩn bị cho tài chính, tình yêu, quan hệ và công việc trong năm đã chọn."
  },
  "hi": {
    "title": "सिबिल — वार्षिक तैयारी रिपोर्ट",
    "h1": "सिबिल — वार्षिक तैयारी रिपोर्ट",
    "description": "चुने हुए वर्ष में धन, प्रेम, संबंधों और काम की तैयारी के लिए चार स्तंभों के रुझान समझें।",
    "landingPoints": [
      "नियम आधारित मूल विश्लेषण",
      "विस्तृत वार्षिक परामर्श",
      "व्यावहारिक तैयारी",
      "सहेजी गई रिपोर्ट फिर पढ़ें"
    ],
    "seoText": "चुने हुए वर्ष में धन, प्रेम, संबंधों और काम की तैयारी के लिए चार स्तंभों के रुझान समझें।"
  },
  "es": {
    "title": "Sibyl — Informe de preparación anual",
    "h1": "Sibyl — Informe de preparación anual",
    "description": "Explora los patrones de los Cuatro Pilares para preparar tus finanzas, amor, relaciones y trabajo en el año elegido.",
    "landingPoints": [
      "Análisis básico por reglas",
      "Orientación anual detallada",
      "Acciones prácticas",
      "Vuelve a leer informes guardados"
    ],
    "seoText": "Explora los patrones de los Cuatro Pilares para preparar tus finanzas, amor, relaciones y trabajo en el año elegido."
  },
  "fr": {
    "title": "Sibyl — Votre préparation annuelle",
    "h1": "Sibyl — Votre préparation annuelle",
    "description": "Explorez les tendances des Quatre Piliers pour préparer finances, amour, relations et travail durant l’année choisie.",
    "landingPoints": [
      "Analyse de base par règles",
      "Conseils annuels détaillés",
      "Actions concrètes",
      "Relire les rapports enregistrés"
    ],
    "seoText": "Explorez les tendances des Quatre Piliers pour préparer finances, amour, relations et travail durant l’année choisie."
  },
  "de": {
    "title": "Sibyl — Ihr Jahresbericht zur Vorbereitung",
    "h1": "Sibyl — Ihr Jahresbericht zur Vorbereitung",
    "description": "Betrachten Sie die Muster der Vier Säulen für Geld, Liebe, Beziehungen und Arbeit im gewählten Jahr.",
    "landingPoints": [
      "Regelbasiertes Grundprofil",
      "Ausführliche Jahresberatung",
      "Praktische Schritte",
      "Gespeicherte Berichte erneut lesen"
    ],
    "seoText": "Betrachten Sie die Muster der Vier Säulen für Geld, Liebe, Beziehungen und Arbeit im gewählten Jahr."
  },
  "nl": {
    "title": "Sibyl — Je jaarlijkse voorbereiding",
    "h1": "Sibyl — Je jaarlijkse voorbereiding",
    "description": "Verken de patronen van de Vier Pilaren voor geld, liefde, relaties en werk in het gekozen jaar.",
    "landingPoints": [
      "Basisanalyse volgens regels",
      "Uitgebreid jaaradvies",
      "Praktische acties",
      "Opgeslagen rapporten herlezen"
    ],
    "seoText": "Verken de patronen van de Vier Pilaren voor geld, liefde, relaties en werk in het gekozen jaar."
  },
  "ms": {
    "title": "Sibyl — Laporan persediaan tahunan",
    "h1": "Sibyl — Laporan persediaan tahunan",
    "description": "Fahami corak Empat Tiang untuk persediaan kewangan, cinta, hubungan dan kerja pada tahun pilihan.",
    "landingPoints": [
      "Analisis asas berasaskan aturan",
      "Nasihat tahunan terperinci",
      "Tindakan praktikal",
      "Baca semula laporan tersimpan"
    ],
    "seoText": "Fahami corak Empat Tiang untuk persediaan kewangan, cinta, hubungan dan kerja pada tahun pilihan."
  }
},
};

const SAJU_SIBYL_METADATA_COPY = {
  ko: {
    title: "시빌라 시스템 — 사주 기반 연간 대비·개운 리포트",
    description:
      "선택 연도의 금전·연애·인간관계·직장과 일을 사주 근거로 살펴보세요. 기본 무료 분석, 심층 상담과 보관함 재열람.",
  },
  en: {
  "title": "Sibyl — Your annual preparation report",
  "description": "Read your Four Pillars patterns and prepare for money, love, relationships and work in your chosen year."
},
  ja: {
  "title": "シビラ — 年間の備えレポート",
  "description": "四柱推命の傾向から、選んだ年のお金・恋愛・人間関係・仕事への備えを考えます。"
},
  zh: {
  "title": "Sibyl — 年度准备报告",
  "description": "结合八字与所选年份的变化，为金钱、恋爱、人际关系和工作做好准备。"
},
};

const metadataCopy = SAJU_SIBYL_METADATA_COPY.ko;

export const metadata = {
  title: metadataCopy.title,
  description: metadataCopy.description,
  alternates: {
    canonical: "https://code-destiny.com/saju/sibyl",
  },
};

export default function SajuSibylLandingPage() {
  return (
    <>
      <RouteMetadataLocaleSync entries={SAJU_SIBYL_METADATA_COPY} />
      <FeatureLandingPage service={SERVICE} />
    </>
  );
}
