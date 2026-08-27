import FeatureLandingPage from "../../components/FeatureLandingPage";
import RouteMetadataLocaleSync from "../../components/RouteMetadataLocaleSync";

const SERVICE = {
  h1: "⚡ 시빌라 시스템 — 사주팔자 진로 적성 분석",
  description:
    "사주팔자 8글자를 기반으로 진로 적성 섹터를 배정하고 운명 위험 계수를 분석하는 전문가 시스템입니다.",
  ogImage: "/fuctionassets/sybila.webp",
  landingPoints: [
    "데스티니 휴(Hue) 색채 진단",
    "사주 기반 적성 섹터 자동 배정",
    "오행 분포 위험 계수 그래프",
    "도미네이터 심층 리포트 (10,000원)",
  ],
  seoText:
    "시빌라 시스템은 사주팔자 오행 분포를 기반으로 진로 적성을 진단하고, 운명 위험 계수를 시각화하는 독자적인 전문 분석 서비스입니다.",
  valueGuideTitle: "시빌라 시스템이 계산하는 것",
  valueSections: [
    {
      title: "십성에서 적성 섹터를 배정합니다",
      body:
        "성격 유형 검사처럼 문항에 답하는 방식이 아니라, 생년월일시로 만든 명식의 십성 분포에서 섹터를 계산합니다. 같은 사람이 다시 봐도 결과가 흔들리지 않는 이유가 여기 있습니다.",
    },
    {
      title: "여섯 개의 적성 섹터",
      body:
        "식신·상관은 CREATIVE & TECH(개발·콘텐츠·작가·디자인), 편재·정재는 FINANCIAL CONTROL(자산 운용·회계·재무 기획), 편관·정관은 PUBLIC ORDER(공공기관·법조·교육 행정), 편인·정인은 R&D & INTELLIGENCE(연구·기획·컨설팅·상담), 비견은 INDEPENDENCE FORCE(1인 기업·창업·독립 컨설팅), 겁재는 COMPETITION SECTOR(스포츠·영업·중개)로 배정됩니다.",
    },
    {
      title: "데스티니 휴 — 오행을 색으로 환산합니다",
      body:
        "목은 제이드 그린, 화는 카이버 레드, 토는 골든 카멜, 금은 아크틱 실버, 수는 딥 오션 블루로 대응합니다. 색은 장식이 아니라 명식에서 어느 기운이 앞에 나와 있는지를 한눈에 보게 하는 표시입니다.",
    },
    {
      title: "위험 계수는 경고가 아니라 편중 지표입니다",
      body:
        "오행 분포가 한쪽으로 몰릴수록 계수가 올라갑니다. 나쁜 사주라는 뜻이 아니라, 그 기운이 잘 통하는 환경에서는 강점이 되고 반대 환경에서는 소모가 커진다는 뜻으로 읽는 편이 정확합니다.",
    },
    {
      title: "결과가 매번 같은 이유",
      body:
        "섹터도 색도 위험 계수도 전부 명식에서 계산합니다. 무작위 값이나 그날의 기분을 섞지 않기 때문에, 같은 생년월일시를 넣으면 언제 다시 봐도 같은 결과가 나옵니다. 결과를 캡처해 두고 몇 달 뒤 다시 봐도 기준이 흔들리지 않습니다.",
    },
    {
      title: "어떻게 읽는 것이 도움이 되나",
      body:
        "섹터 하나만 보고 직업을 정하는 용도가 아닙니다. 지금 하고 있는 일이 배정된 섹터와 얼마나 떨어져 있는지, 그 거리가 소모로 느껴지는지 자극으로 느껴지는지를 함께 보는 편이 실제로 쓸모가 있습니다. 위험 계수는 그 소모가 어디서 커지는지를 가리킵니다.",
    },
    {
      title: "기본 진단은 무료, 도미네이터 심층 리포트는 10,000원",
      body:
        "섹터 배정, 데스티니 휴, 오행 분포 그래프까지는 결제 없이 확인할 수 있습니다. 심층 리포트를 열 때만 결제 확인이 먼저 표시되며 이용권이나 월정석으로도 열 수 있습니다.",
    },
  ],
  localized: {
    en: {
      title: "Sibyl System - Four Pillars Career Aptitude and Destiny Risk Index",
      h1: "⚡ Sibyl System - Four Pillars Career Aptitude",
      description:
        "An AI system that assigns career aptitude sectors and analyzes destiny risk coefficients from the eight characters of a Four Pillars chart.",
      landingPoints: ["Destiny Hue color diagnosis", "Automatic Four Pillars aptitude sector matching", "Five Elements risk coefficient graph", "Dominator deep report (10,000 KRW)"],
      seoText:
        "The Sibyl System diagnoses career aptitude from Four Pillars Five Elements distribution and visualizes destiny risk coefficients through a dedicated AI analysis flow.",
    },
    ja: {
      title: "シビラシステム - 四柱推命の進路適性 × 運命リスク係数",
      h1: "⚡ シビラシステム - 四柱推命の進路適性分析",
      description:
        "四柱推命の8文字をもとに進路適性セクターを割り当て、運命リスク係数を分析するAIシステムです。",
      landingPoints: ["Destiny Hue 色彩診断", "四柱推命ベースの適性セクター自動判定", "五行分布リスク係数グラフ", "ドミネーター深層リポート（10,000ウォン）"],
      seoText:
        "シビラシステムは、四柱推命の五行分布をもとに進路適性を診断し、運命リスク係数を可視化する独自のAI分析サービスです。",
    },
    "zh-CN": {
      title: "Sibyl 系统 - 四柱推命职业适性 × 命运风险系数",
      h1: "⚡ Sibyl 系统 - 四柱推命职业适性分析",
      description:
        "基于四柱八字8个字分配职业适性板块，并分析命运风险系数的AI系统。",
      landingPoints: ["Destiny Hue 色彩诊断", "基于四柱的适性板块自动分配", "五行分布风险系数图表", "Dominator深度报告（10,000韩元）"],
      seoText:
        "Sibyl系统基于四柱八字五行分布诊断职业适性，并可视化命运风险系数，是独立的AI分析服务。",
    },
    "zh-TW": {
      title: "Sibyl 系統 - 四柱推命職涯適性 × 命運風險係數",
      h1: "⚡ Sibyl 系統 - 四柱推命職涯適性分析",
      description:
        "基於四柱八字8個字分配職涯適性區塊，並分析命運風險係數的AI系統。",
      landingPoints: ["Destiny Hue 色彩診斷", "基於四柱的適性區塊自動分配", "五行分布風險係數圖表", "Dominator深度報告（10,000韓元）"],
      seoText:
        "Sibyl系統基於四柱八字五行分布診斷職涯適性，並視覺化命運風險係數，是獨立的AI分析服務。",
    },
    vi: {
      title: "Hệ thống Sibyl - Tứ Trụ định hướng nghề nghiệp và hệ số rủi ro vận mệnh",
      h1: "⚡ Hệ thống Sibyl - Phân tích năng lực nghề nghiệp bằng Tứ Trụ",
      description:
        "Hệ thống AI phân bổ nhóm năng lực nghề nghiệp và phân tích hệ số rủi ro vận mệnh dựa trên tám ký tự của lá số Tứ Trụ.",
      landingPoints: ["Chẩn đoán màu Destiny Hue", "Tự động phân nhóm năng lực từ Tứ Trụ", "Biểu đồ hệ số rủi ro phân bố Ngũ hành", "Báo cáo Dominator chuyên sâu (10.000 KRW)"],
      seoText:
        "Hệ thống Sibyl chẩn đoán năng lực nghề nghiệp từ phân bố Ngũ hành Tứ Trụ và trực quan hóa hệ số rủi ro vận mệnh bằng luồng phân tích AI riêng.",
    },
    hi: {
      title: "सिबिल सिस्टम - चार स्तंभ करियर योग्यता और भाग्य जोखिम गुणांक",
      h1: "⚡ सिबिल सिस्टम - चार स्तंभ करियर योग्यता विश्लेषण",
      description:
        "चार स्तंभ चार्ट के आठ अक्षरों से करियर योग्यता सेक्टर तय करने और भाग्य जोखिम गुणांक पढ़ने वाला AI सिस्टम.",
      landingPoints: ["Destiny Hue रंग निदान", "चार स्तंभ आधारित योग्यता सेक्टर स्वचालित मिलान", "पाँच तत्व जोखिम गुणांक ग्राफ", "Dominator गहन रिपोर्ट (10,000 KRW)"],
      seoText:
        "सिबिल सिस्टम चार स्तंभ पाँच तत्व वितरण से करियर योग्यता का निदान करता है और भाग्य जोखिम गुणांकों को AI विश्लेषण प्रवाह में दृश्य बनाता है.",
    },
    es: {
      title: "Sistema Sibyl - Aptitud profesional de Cuatro Pilares e índice de riesgo del destino",
      h1: "⚡ Sistema Sibyl - Aptitud profesional con Cuatro Pilares",
      description:
        "Sistema de IA que asigna sectores de aptitud profesional y analiza coeficientes de riesgo del destino a partir de los ocho caracteres de una carta de Cuatro Pilares.",
      landingPoints: ["Diagnóstico de color Destiny Hue", "Asignación automática de aptitud por Cuatro Pilares", "Gráfico de coeficiente de riesgo de Cinco Elementos", "Informe profundo Dominator (10.000 KRW)"],
      seoText:
        "El Sistema Sibyl diagnostica aptitud profesional desde la distribución de Cinco Elementos de Cuatro Pilares y visualiza coeficientes de riesgo del destino con IA.",
    },
    fr: {
      title: "Système Sibyl - Aptitude professionnelle des Quatre Piliers et coefficient de risque",
      h1: "⚡ Système Sibyl - Analyse d'aptitude professionnelle par les Quatre Piliers",
      description:
        "Un système d'IA qui attribue des secteurs d'aptitude professionnelle et analyse les coefficients de risque de destinée à partir des huit caractères des Quatre Piliers.",
      landingPoints: ["Diagnostic couleur Destiny Hue", "Attribution automatique de secteur par les Quatre Piliers", "Graphique de risque des Cinq Éléments", "Rapport approfondi Dominator (10 000 KRW)"],
      seoText:
        "Le Système Sibyl diagnostique l'aptitude professionnelle depuis la distribution des Cinq Éléments des Quatre Piliers et visualise les coefficients de risque par IA.",
    },
    de: {
      title: "Sibyl-System - Vier-Säulen-Karriereeignung und Schicksalsrisiko",
      h1: "⚡ Sibyl-System - Vier-Säulen-Karriereeignung",
      description:
        "Ein KI-System, das aus den acht Zeichen eines Vier-Säulen-Charts berufliche Eignungssektoren zuordnet und Schicksalsrisiko-Koeffizienten analysiert.",
      landingPoints: ["Destiny Hue Farbanalyse", "Automatische Vier-Säulen-Eignungszuordnung", "Fünf-Elemente-Risikokoeffizient-Grafik", "Dominator Tiefenbericht (10.000 KRW)"],
      seoText:
        "Das Sibyl-System diagnostiziert Karriereeignung aus der Fünf-Elemente-Verteilung der Vier Säulen und visualisiert Schicksalsrisiken per KI.",
    },
    nl: {
      title: "Sibyl-systeem - Vier Pilaren loopbaangeschiktheid en bestemmingsrisico",
      h1: "⚡ Sibyl-systeem - Loopbaangeschiktheid via Vier Pilaren",
      description:
        "Een AI-systeem dat loopbaangeschiktheidssectoren toewijst en bestemmingsrisico-coëfficiënten analyseert vanuit de acht tekens van een Vier Pilaren-kaart.",
      landingPoints: ["Destiny Hue kleurdiagnose", "Automatische geschiktheidssector via Vier Pilaren", "Risicografiek van de Vijf Elementen", "Dominator diepteverslag (10.000 KRW)"],
      seoText:
        "Het Sibyl-systeem diagnosticeert loopbaangeschiktheid uit de Vijf Elementen-verdeling van Vier Pilaren en visualiseert bestemmingsrisico met AI.",
    },
    ms: {
      title: "Sistem Sibyl - Kecenderungan kerjaya Empat Tiang dan pekali risiko takdir",
      h1: "⚡ Sistem Sibyl - Analisis kecenderungan kerjaya Empat Tiang",
      description:
        "Sistem AI yang menetapkan sektor kecenderungan kerjaya dan menganalisis pekali risiko takdir berdasarkan lapan aksara carta Empat Tiang.",
      landingPoints: ["Diagnosis warna Destiny Hue", "Padanan sektor kecenderungan automatik berdasarkan Empat Tiang", "Graf pekali risiko taburan Lima Unsur", "Laporan mendalam Dominator (10,000 KRW)"],
      seoText:
        "Sistem Sibyl mendiagnosis kecenderungan kerjaya daripada taburan Lima Unsur Empat Tiang dan memvisualkan pekali risiko takdir melalui analisis AI.",
    },
  },
};

const SAJU_SIBYL_METADATA_COPY = {
  ko: {
    title: "시빌라 시스템 — 사주 진로 적성·운명 위험 계수",
    description:
      "사주팔자 기반 진로 적성 섹터 배정과 운명 위험 계수 분석. 기본 무료, 도미네이터 리포트 10,000원.",
  },
  en: {
    title: "Sibyl System - Saju Career Aptitude x Destiny Risk Index | Code Destiny",
    description:
      "Career aptitude sector assignment and destiny risk coefficient analysis based on a Four Pillars chart. Core access is free, with a Dominator report for 10,000 KRW.",
  },
  ja: {
    title: "シビラシステム - 四柱推命進路適性 × 運命リスク係数 | Code Destiny",
    description:
      "四柱推命にもとづく進路適性セクター判定と運命リスク係数分析。基本は無料、ドミネーターリポートは10,000ウォンです。",
  },
  zh: {
    title: "Sibyl 系统 - 四柱职业适性 × 命运风险系数 | Code Destiny",
    description:
      "基于四柱八字的职业适性分区与命运风险系数分析。基础免费，Dominator 报告为 10,000 韩元。",
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
