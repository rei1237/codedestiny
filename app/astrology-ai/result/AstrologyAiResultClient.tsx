"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, Download, Loader2, Moon, Sparkles, Stars } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { extractReadableTextFromJsonLike, looksLikeRawJson, toDisplayText } from "@/lib/llm-text";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";
import { isRetriableResultPollFailure } from "@/app/_lib/consultationResultPolling";
import PagedResultViewer, { usePagedViewerMode } from "@/components/fortune/PagedResultViewer";
import AiResultProse from "@/components/fortune/AiResultProse";
import AnalysisBasisPanel from "@/components/fortune/AnalysisBasisPanel";
import type { AnalysisBasis } from "@/lib/fortune/analysis-basis";
import { readDevPreviewState } from "@/lib/dev-preview/core";
import { buildAstrologyPreviewPayload } from "@/lib/dev-preview/fixtures/astrology";
import AstrologyChartWheel from "@/components/fortune/AstrologyChartWheel";
import type { RawPlanetLike, RawWesternChart } from "@/types/astrology";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type AstrologyResultCopy = {
  birthDateLabel: string;
  birthTimeLabel: string;
  birthPlaceLabel: string;
  consultTopicLabel: string;
  sunLabel: string;
  moonLabel: string;
  ascendantLabel: string;
  chartRulerLabel: string;
  analysisBasisTitle: string;
  chartBasicsTitle: string;
  chartPlanetsTitle: string;
  chartHousesTitle: string;
  chartAspectsTitle: string;
  chartTransitTitle: string;
};

const ASTROLOGY_RESULT_EN: AstrologyResultCopy = {
  birthDateLabel: "Date of Birth",
  birthTimeLabel: "Birth Time",
  birthPlaceLabel: "Birthplace",
  consultTopicLabel: "Consultation Topic",
  sunLabel: "Sun",
  moonLabel: "Moon",
  ascendantLabel: "Ascendant",
  chartRulerLabel: "Chart Ruler",
  analysisBasisTitle: "Values Calculated for This Consultation",
  chartBasicsTitle: "Chart Basics",
  chartPlanetsTitle: "Planetary Positions",
  chartHousesTitle: "Houses",
  chartAspectsTitle: "Major Aspects",
  chartTransitTitle: "Current Transits",
};

const ASTROLOGY_RESULT_COPY: Partial<Record<LoadingLocale, AstrologyResultCopy>> = {
  ko: {
    birthDateLabel: "생년월일",
    birthTimeLabel: "출생시간",
    birthPlaceLabel: "출생지",
    consultTopicLabel: "상담 주제",
    sunLabel: "태양",
    moonLabel: "달",
    ascendantLabel: "상승궁",
    chartRulerLabel: "차트 룰러",
    analysisBasisTitle: "이 상담이 계산한 값",
    chartBasicsTitle: "차트 기준",
    chartPlanetsTitle: "행성 위치",
    chartHousesTitle: "하우스",
    chartAspectsTitle: "주요 각도",
    chartTransitTitle: "현재 트랜짓",
  },
  en: ASTROLOGY_RESULT_EN,
  ja: {
    birthDateLabel: "生年月日",
    birthTimeLabel: "出生時刻",
    birthPlaceLabel: "出生地",
    consultTopicLabel: "相談テーマ",
    sunLabel: "太陽",
    moonLabel: "月",
    ascendantLabel: "アセンダント",
    chartRulerLabel: "チャートルーラー",
    analysisBasisTitle: "この相談で計算した値",
    chartBasicsTitle: "チャート基準",
    chartPlanetsTitle: "惑星の位置",
    chartHousesTitle: "ハウス",
    chartAspectsTitle: "主要アスペクト",
    chartTransitTitle: "現在のトランジット",
  },
  "zh-CN": {
    birthDateLabel: "出生日期",
    birthTimeLabel: "出生时间",
    birthPlaceLabel: "出生地",
    consultTopicLabel: "咨询主题",
    sunLabel: "太阳",
    moonLabel: "月亮",
    ascendantLabel: "上升星座",
    chartRulerLabel: "命主星",
    analysisBasisTitle: "本次咨询计算的数值",
    chartBasicsTitle: "星盘基础",
    chartPlanetsTitle: "行星位置",
    chartHousesTitle: "宫位",
    chartAspectsTitle: "主要相位",
    chartTransitTitle: "当前流年相位",
  },
  "zh-TW": {
    birthDateLabel: "出生日期",
    birthTimeLabel: "出生時間",
    birthPlaceLabel: "出生地",
    consultTopicLabel: "諮詢主題",
    sunLabel: "太陽",
    moonLabel: "月亮",
    ascendantLabel: "上升星座",
    chartRulerLabel: "命主星",
    analysisBasisTitle: "本次諮詢計算的數值",
    chartBasicsTitle: "星盤基礎",
    chartPlanetsTitle: "行星位置",
    chartHousesTitle: "宮位",
    chartAspectsTitle: "主要相位",
    chartTransitTitle: "當前流年相位",
  },
  vi: {
    birthDateLabel: "Ngày sinh",
    birthTimeLabel: "Giờ sinh",
    birthPlaceLabel: "Nơi sinh",
    consultTopicLabel: "Chủ đề tư vấn",
    sunLabel: "Mặt Trời",
    moonLabel: "Mặt Trăng",
    ascendantLabel: "Cung Mọc",
    chartRulerLabel: "Hành tinh chủ quản",
    analysisBasisTitle: "Giá trị được tính cho buổi tư vấn này",
    chartBasicsTitle: "Thông tin cơ bản của bản đồ sao",
    chartPlanetsTitle: "Vị trí hành tinh",
    chartHousesTitle: "Cung (Nhà)",
    chartAspectsTitle: "Các góc chiếu chính",
    chartTransitTitle: "Vận chuyển hiện tại (Transit)",
  },
  hi: {
    birthDateLabel: "जन्म तिथि",
    birthTimeLabel: "जन्म समय",
    birthPlaceLabel: "जन्म स्थान",
    consultTopicLabel: "परामर्श विषय",
    sunLabel: "सूर्य",
    moonLabel: "चंद्रमा",
    ascendantLabel: "लग्न (Ascendant)",
    chartRulerLabel: "चार्ट रूलर",
    analysisBasisTitle: "इस परामर्श के लिए गणना किए गए मान",
    chartBasicsTitle: "चार्ट की मूल बातें",
    chartPlanetsTitle: "ग्रहों की स्थिति",
    chartHousesTitle: "भाव (हाउस)",
    chartAspectsTitle: "मुख्य दृष्टिकोण (एस्पेक्ट्स)",
    chartTransitTitle: "वर्तमान ट्रांज़िट",
  },
  es: {
    birthDateLabel: "Fecha de nacimiento",
    birthTimeLabel: "Hora de nacimiento",
    birthPlaceLabel: "Lugar de nacimiento",
    consultTopicLabel: "Tema de la consulta",
    sunLabel: "Sol",
    moonLabel: "Luna",
    ascendantLabel: "Ascendente",
    chartRulerLabel: "Regente de la carta",
    analysisBasisTitle: "Valores calculados para esta consulta",
    chartBasicsTitle: "Datos básicos de la carta",
    chartPlanetsTitle: "Posiciones planetarias",
    chartHousesTitle: "Casas",
    chartAspectsTitle: "Aspectos principales",
    chartTransitTitle: "Tránsitos actuales",
  },
  fr: {
    birthDateLabel: "Date de naissance",
    birthTimeLabel: "Heure de naissance",
    birthPlaceLabel: "Lieu de naissance",
    consultTopicLabel: "Sujet de la consultation",
    sunLabel: "Soleil",
    moonLabel: "Lune",
    ascendantLabel: "Ascendant",
    chartRulerLabel: "Maître du thème",
    analysisBasisTitle: "Valeurs calculées pour cette consultation",
    chartBasicsTitle: "Bases du thème",
    chartPlanetsTitle: "Positions planétaires",
    chartHousesTitle: "Maisons",
    chartAspectsTitle: "Aspects majeurs",
    chartTransitTitle: "Transits actuels",
  },
  de: {
    birthDateLabel: "Geburtsdatum",
    birthTimeLabel: "Geburtszeit",
    birthPlaceLabel: "Geburtsort",
    consultTopicLabel: "Beratungsthema",
    sunLabel: "Sonne",
    moonLabel: "Mond",
    ascendantLabel: "Aszendent",
    chartRulerLabel: "Chart-Herrscher",
    analysisBasisTitle: "Für diese Beratung berechnete Werte",
    chartBasicsTitle: "Chart-Grundlagen",
    chartPlanetsTitle: "Planetenpositionen",
    chartHousesTitle: "Häuser",
    chartAspectsTitle: "Wichtige Aspekte",
    chartTransitTitle: "Aktuelle Transite",
  },
  nl: {
    birthDateLabel: "Geboortedatum",
    birthTimeLabel: "Geboortetijd",
    birthPlaceLabel: "Geboorteplaats",
    consultTopicLabel: "Consultonderwerp",
    sunLabel: "Zon",
    moonLabel: "Maan",
    ascendantLabel: "Ascendant",
    chartRulerLabel: "Chart-heerser",
    analysisBasisTitle: "Waarden berekend voor dit consult",
    chartBasicsTitle: "Basisgegevens van de horoscoop",
    chartPlanetsTitle: "Planeetposities",
    chartHousesTitle: "Huizen",
    chartAspectsTitle: "Belangrijke aspecten",
    chartTransitTitle: "Huidige transits",
  },
  ms: {
    birthDateLabel: "Tarikh Lahir",
    birthTimeLabel: "Masa Lahir",
    birthPlaceLabel: "Tempat Lahir",
    consultTopicLabel: "Topik Perundingan",
    sunLabel: "Matahari",
    moonLabel: "Bulan",
    ascendantLabel: "Ascendant",
    chartRulerLabel: "Pemerintah Carta",
    analysisBasisTitle: "Nilai yang dikira untuk perundingan ini",
    chartBasicsTitle: "Asas Carta",
    chartPlanetsTitle: "Kedudukan Planet",
    chartHousesTitle: "Rumah (House)",
    chartAspectsTitle: "Aspek Utama",
    chartTransitTitle: "Transit Semasa",
  },
};

function getAstrologyResultCopy(locale: LoadingLocale): AstrologyResultCopy {
  return ASTROLOGY_RESULT_COPY[locale] || ASTROLOGY_RESULT_EN;
}

function useAstrologyResultCopy(): AstrologyResultCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  return getAstrologyResultCopy(locale);
}

type ChartPoint = { sign?: string; signKo?: string; degree?: number; house?: number | null };
type AstrologyChart = {
  zodiacType?: string;
  houseSystem?: string;
  sun?: ChartPoint | null;
  moon?: ChartPoint | null;
  ascendant?: ChartPoint | null;
  mc?: ChartPoint | null;
  chartRuler?: string;
  consultationKeywords?: string[];
  planets?: Array<ChartPoint & { name: string; label?: string; retrograde?: boolean | null }>;
  houses?: Array<{ house: number; sign?: string; signKo?: string; cuspDegree?: number | null; planets?: string[] }>;
  elementBalance?: Record<string, number>;
  modalityBalance?: Record<string, number>;
  majorAspects?: Array<{ planetA: string; aspect: string; planetB: string; orb?: number | null }>;
  transits?: {
    planets?: Array<ChartPoint & { name: string; label?: string; retrograde?: boolean | null }>;
    majorAspectsToNatal?: Array<{ transitPlanet: string; aspect: string; natalPlanet: string; orb?: number | null }>;
  };
  birthTimeUnknown?: boolean;
};
type BirthInfo = {
  name?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  birthPlace?: {
    city?: string;
    country?: string;
    latitude?: number | null;
    longitude?: number | null;
    timezone?: string;
  };
};
type Consultation = {
  ok?: boolean;
  id?: string;
  sessionId?: string;
  status?: string;
  accessType?: string;
  birthInfo?: BirthInfo | null;
  topic?: string;
  userQuestion?: string;
  astrologyChart?: AstrologyChart | null;
  analysisBasis?: AnalysisBasis | null;
  chartHighlights?: {
    sun?: ChartPoint | null;
    moon?: ChartPoint | null;
    ascendant?: ChartPoint | null;
    chartRuler?: string;
    keywords?: string[];
  };
  messages?: Array<{ role: "user" | "assistant"; content: string; createdAt?: string }>;
  message?: string;
  reason?: string;
};

const FALLBACK_SECTIONS = [
  "별자리 상담 요약",
  "핵심 구조 분석",
  "영향 요인",
  "해석 근거",
  "태양·달·상승궁 해석",
  "개인 행성 해석",
  "사회 행성 해석",
  "세대 행성 해석",
  "원소와 모드 분석",
  "주요 각도 해석",
  "하우스 해석",
  "현재 트랜짓 흐름",
  "상담 주제별 맞춤 해석",
  "분야별 분석",
  "실천 조언",
  "추천 행동",
  "마무리 메시지",
];

const RESULT_PANEL_CLASS = "rounded-lg border border-white/10 bg-white/[0.045] shadow-xl shadow-black/20 ring-1 ring-white/[0.03] backdrop-blur";
const RESULT_INFO_CLASS = "rounded-lg border border-white/10 bg-[#0d132c]/75 p-4";

function toText(value: unknown) {
  return toDisplayText(value);
}

function pointLabel(point?: ChartPoint | null) {
  if (!point?.sign) return "제한적 해석";
  const degree = Number.isFinite(Number(point.degree)) ? `${Number(point.degree).toFixed(1)}°` : "";
  return `${point.signKo || point.sign} ${degree}`.trim();
}

function aspectLabel(type: string) {
  if (type === "conjunction") return "합";
  if (type === "opposition") return "충";
  if (type === "square") return "스퀘어";
  if (type === "trine") return "트라인";
  if (type === "sextile") return "섹스타일";
  return type;
}

function degreeText(value: unknown) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}°` : "";
}

function toRawPlanetLike(point?: ChartPoint | null): RawPlanetLike | undefined {
  if (!point) return undefined;
  return { sign: point.sign, signKo: point.signKo, degree: point.degree, house: point.house ?? undefined };
}

function toRawWesternChart(chart: AstrologyChart | null): RawWesternChart | null {
  if (!chart || chart.birthTimeUnknown || !chart.ascendant || !Array.isArray(chart.houses) || chart.houses.length < 12) {
    return null;
  }
  // majorAspects의 planetA/planetB는 한국어 라벨("태양")로 저장되지만, planets 레코드는
  // 영어 name("sun")을 키로 쓰므로 라벨→name 역참조가 필요하다(안 하면 각도선이 하나도 안 그려짐).
  const nameByLabel = (label: string) => (chart.planets || []).find((p) => p.label === label || p.name === label)?.name || label;
  return {
    source: "astrology-ai",
    ascendant: toRawPlanetLike(chart.ascendant),
    midheaven: toRawPlanetLike(chart.mc),
    planets: Object.fromEntries((chart.planets || []).map((planet) => [
      planet.name,
      { ...toRawPlanetLike(planet), retrograde: planet.retrograde ?? undefined },
    ])),
    houses: chart.houses.map((house) => ({
      house: house.house,
      absoluteDegree: house.cuspDegree ?? undefined,
      sign: house.sign,
      signKo: house.signKo,
    })),
    aspects: (chart.majorAspects || []).map((aspect) => ({
      p1: nameByLabel(aspect.planetA),
      p2: nameByLabel(aspect.planetB),
      type: aspect.aspect,
      orb: aspect.orb ?? undefined,
    })),
  };
}

function planetDataLabel(planet: ChartPoint & { name: string; label?: string; retrograde?: boolean | null }) {
  return [
    planet.label || planet.name,
    pointLabel(planet),
    Number.isFinite(Number(planet.house)) ? `${planet.house}하우스` : "",
    planet.retrograde ? "역행" : "",
  ].filter(Boolean).join(" · ");
}

function houseDataLabel(house: { house: number; sign?: string; signKo?: string; cuspDegree?: number | null; planets?: string[] }) {
  const planets = Array.isArray(house.planets) && house.planets.length ? `입궁 ${house.planets.join(", ")}` : "입궁 행성 없음";
  return `${house.house}하우스 · ${house.signKo || house.sign || "미확인"} ${degreeText(house.cuspDegree)} · ${planets}`.trim();
}

function aspectDataLabel(aspect: { planetA: string; aspect: string; planetB: string; orb?: number | null }) {
  const orb = Number.isFinite(Number(aspect.orb)) ? `오브 ${Number(aspect.orb).toFixed(2)}°` : "";
  return `${aspect.planetA} ${aspectLabel(aspect.aspect)} ${aspect.planetB}${orb ? ` · ${orb}` : ""}`;
}

function transitDataLabel(aspect: { transitPlanet: string; aspect: string; natalPlanet: string; orb?: number | null }) {
  const orb = Number.isFinite(Number(aspect.orb)) ? `오브 ${Number(aspect.orb).toFixed(2)}°` : "";
  return `Transit ${aspect.transitPlanet} ${aspectLabel(aspect.aspect)} Natal ${aspect.natalPlanet}${orb ? ` · ${orb}` : ""}`;
}

function balanceDataLabel(balance: Record<string, number> | undefined, labels: Record<string, string>) {
  return Object.entries(labels)
    .map(([key, label]) => `${label} ${Number(balance?.[key] || 0)}`)
    .join(" · ");
}

function splitSections(content: string) {
  // 잘린(degrade) 응답이 원시 JSON 형태로 저장된 경우, 중괄호/키를 그대로 문단화하지 않도록
  // 다른 6개 기능과 동일하게 사람이 읽을 수 있는 문장만 먼저 복원한다.
  const source = looksLikeRawJson(content) ? extractReadableTextFromJsonLike(content) || content : content;
  const normalized = source.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const headingMatches: RegExpExecArray[] = [];
  const headingPattern = /^(?:#{1,3}\s*)?(\d{1,2}[.)]\s*)?([^\n]{2,44})\n+/gm;
  let match = headingPattern.exec(normalized);
  while (match) {
    // 근거 중심 흐름(핵심 구조·영향 요인·해석 근거·분야별 분석·추천 행동)도 소제목으로 잡아야
    // 본문이 한 덩어리로 뭉쳐 페이지 뷰어가 무너지지 않는다.
    if (/상담|태양|달|상승궁|행성|원소|모드|각도|하우스|트랜짓|조언|마무리|요약|구조|영향|근거|분야|행동/.test(match[2] || "")) {
      headingMatches.push(match);
    }
    match = headingPattern.exec(normalized);
  }

  if (headingMatches.length >= 3) {
    return headingMatches.map((match, index) => {
      const start = (match.index || 0) + match[0].length;
      const end = headingMatches[index + 1]?.index ?? normalized.length;
      return {
        title: match[2].replace(/\*\*/g, "").trim(),
        body: normalized.slice(start, end).trim(),
      };
    }).filter((section) => section.body);
  }

  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunkSize = Math.max(1, Math.ceil(paragraphs.length / FALLBACK_SECTIONS.length));
  return FALLBACK_SECTIONS.map((title, index) => ({
    title,
    body: paragraphs.slice(index * chunkSize, (index + 1) * chunkSize).join("\n\n"),
  })).filter((section) => section.body);
}

function safeFilePart(value: string) {
  return (value || "guest").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "-").slice(0, 48);
}

export default function AstrologyAiResultClient() {
  const copy = useAstrologyResultCopy();
  const [resultId, setResultId] = useState("");
  const [queryReady, setQueryReady] = useState(false);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [viewAll, setViewAll] = usePagedViewerMode("astrologyAiViewerModeV1");
  const [exportExpand, setExportExpand] = useState(false);

  useEffect(() => {
    setResultId(toText(new URLSearchParams(window.location.search).get("id")));
    setQueryReady(true);
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadResult() {
      if (!queryReady) return;
      if (!resultId) {
        setError("결과 링크를 확인하지 못했습니다.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const previewState = readDevPreviewState();
        if (previewState) {
          const payload = buildAstrologyPreviewPayload(previewState);
          if (!payload.ok) throw new Error(payload.message || "저장된 상담 결과를 불러오지 못했습니다.");
          if (alive) setConsultation(payload as Consultation);
          return;
        }
        // 생성 중(202)이면 완료까지 몇 차례 재확인한다(서버 생성 최악 ~8분, 여기선 40회 ≈ 5분).
        for (let attempt = 0; attempt < 40; attempt += 1) {
          const response = await authFetch(`/api/astrology-ai/result/${encodeURIComponent(resultId)}`);
          const payload = await response.json().catch(() => ({}));
          // 일시적 DB/인증 장애(503·retryable)는 202와 동일하게 재폴링해 자가 복구한다(하드 종료 금지).
          if (response.status === 202 || isRetriableResultPollFailure(response.status, payload)) {
            if (!alive) return;
            await new Promise((resolve) => window.setTimeout(resolve, attempt < 2 ? 3000 : 8000));
            continue;
          }
          if (!response.ok || payload?.ok === false) {
            throw new Error(toText(payload?.message) || "저장된 상담 결과를 불러오지 못했습니다.");
          }
          if (alive) setConsultation(payload as Consultation);
          return;
        }
        throw new Error("상담 생성이 평소보다 오래 걸리고 있습니다. 잠시 후 새로고침해 주세요.");
      } catch (caught) {
        if (alive) setError(friendlyErrorMessage(caught, "저장된 상담 결과를 불러오지 못했습니다."));
      } finally {
        if (alive) setLoading(false);
      }
    }
    void loadResult();
    return () => {
      alive = false;
    };
  }, [queryReady, resultId]);

  const birth = consultation?.birthInfo || {};
  const place = birth.birthPlace || {};
  const chart = consultation?.astrologyChart || null;
  const highlights = consultation?.chartHighlights || {};
  const assistantContent = consultation?.messages?.find((message) => message.role === "assistant")?.content?.trim() || "";
  const sections = useMemo(() => splitSections(assistantContent), [assistantContent]);
  const rawChart = useMemo(() => toRawWesternChart(chart), [chart]);
  const userName = toText(birth.name) || "당신";
  const birthTime = birth.birthTimeUnknown ? "출생시간 미상" : toText(birth.birthTime) || "출생시간 미입력";
  const coreCards = [
    { title: copy.sunLabel, value: pointLabel(highlights.sun || chart?.sun) },
    { title: copy.moonLabel, value: pointLabel(highlights.moon || chart?.moon) },
    { title: copy.ascendantLabel, value: highlights.ascendant || chart?.ascendant ? pointLabel(highlights.ascendant || chart?.ascendant) : "출생시간 미상으로 제한" },
    { title: copy.chartRulerLabel, value: toText(highlights.chartRuler || chart?.chartRuler) || "제한적 해석" },
  ];
  const keywords = (highlights.keywords || chart?.consultationKeywords || []).filter(Boolean).slice(0, 6);
  const evidencePlanets = (chart?.planets || []).slice(0, 7);
  const evidenceAspects = (chart?.majorAspects || []).slice(0, 5);
  const chartPlanets = chart?.planets || [];
  const chartHouses = chart?.houses || [];
  const chartAspects = chart?.majorAspects || [];
  const chartTransitAspects = chart?.transits?.majorAspectsToNatal || [];
  const chartBasics = [
    `조디악: ${chart?.zodiacType === "tropical" ? "Tropical" : toText(chart?.zodiacType) || "미확인"}`,
    `하우스 시스템: ${toText(chart?.houseSystem) || (chart?.birthTimeUnknown ? "출생시간 미상 제한" : "미확인")}`,
    `MC: ${pointLabel(chart?.mc)}`,
    `원소 균형: ${balanceDataLabel(chart?.elementBalance, { fire: "불", earth: "흙", air: "공기", water: "물" })}`,
    `모드 균형: ${balanceDataLabel(chart?.modalityBalance, { cardinal: "활동", fixed: "고정", mutable: "변통" })}`,
  ];

  async function handlePdfDownload() {
    const element = document.getElementById("astrology-ai-result-document");
    if (!element || pdfLoading) return;
    const detailsElements = Array.from(element.querySelectorAll("details"));
    const previousDetailOpenStates = detailsElements.map((details) => details.open);
    console.info("[AstrologyAI] pdf download started", { resultId });
    setPdfLoading(true);
    setPdfError("");
    // 페이지 뷰어가 숨긴 장(display:none)은 html2canvas에서 빈 캔버스가 되므로 전부 펼친 뒤 캡처한다.
    setExportExpand(true);
    try {
      detailsElements.forEach((details) => {
        details.open = true;
      });
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await new Promise((resolve) => setTimeout(resolve, 120));
      const date = new Date().toISOString().slice(0, 10);
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      await exportResultPdf({
        captureTargets: ["#astrology-ai-result-document"],
        fileName: `code-destiny-astrology-ai-${safeFilePart(userName)}-${date}.pdf`,
        backgroundColor: "#060817",
        cover: {
          title: `${userName}님의 별자리 상담`,
          subtitle: toText(consultation?.topic) || "전체 차트 해석",
          name: userName,
          date,
        },
      });
      console.info("[AstrologyAI] pdf download success", { resultId });
    } catch (caught) {
      console.error("[AstrologyAI] pdf download failed", { resultId, message: caught instanceof Error ? caught.message : String(caught) });
      setPdfError("별자리 리포트를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      detailsElements.forEach((details, index) => {
        details.open = previousDetailOpenStates[index] ?? details.open;
      });
      setExportExpand(false);
      setPdfLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-slate-100 [font-family:var(--font-body)]">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,#050816_0%,#0b1028_46%,#050816_100%)]" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:radial-gradient(#f8e7b0_1px,transparent_1px),radial-gradient(#c4b5fd_1px,transparent_1px)] [background-position:0_0,34px_42px] [background-size:88px_88px,128px_128px]" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f5d487]/60 to-transparent" aria-hidden="true" />

      <section className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/astrology-ai" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.035] px-4 text-sm font-bold text-slate-100 transition hover:border-[#f5d487]/40 hover:bg-white/[0.065]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            상담 입력으로 돌아가기
          </Link>
          {consultation && (
            <button type="button" onClick={() => void handlePdfDownload()} disabled={pdfLoading} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#f5d487] px-4 text-sm font-black text-[#161019] shadow-lg shadow-[#f5d487]/15 transition hover:bg-[#ffe6a8] disabled:cursor-not-allowed disabled:opacity-60">
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
              {pdfLoading ? "별자리 리포트를 정리하는 중입니다" : "PDF 다운로드"}
            </button>
          )}
        </div>

        {loading && (
          <div className="grid min-h-[60vh] place-items-center rounded-lg border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl shadow-black/25">
            <div>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#f5d487] motion-reduce:animate-none" aria-hidden="true" />
              <p className="mt-4 text-lg font-black text-white">저장된 별자리 상담을 불러오고 있습니다.</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="grid min-h-[60vh] place-items-center rounded-lg border border-rose-300/25 bg-rose-400/10 p-8 text-center shadow-2xl shadow-black/25">
            <div className="max-w-md">
              <AlertCircle className="mx-auto h-9 w-9 text-rose-200" aria-hidden="true" />
              <h1 className="mt-4 text-2xl font-black text-white">결과를 열 수 없습니다</h1>
              <p className="mt-3 text-sm leading-7 text-rose-50">{error}</p>
            </div>
          </div>
        )}

        {!loading && consultation && (
          <div id="astrology-ai-result-document" className="relative grid gap-6 rounded-lg border border-white/10 bg-[#060817] p-4 shadow-2xl shadow-black/40 ring-1 ring-white/[0.03] sm:p-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <article className="space-y-6">
              <header className={`${RESULT_PANEL_CLASS} overflow-hidden p-6 sm:p-8`}>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#f5d487]">Code Destiny Astrology</p>
                <h1 className="mt-3 text-3xl font-black leading-tight text-white [font-family:var(--font-premium)] sm:text-5xl">
                  {userName}님의 별자리 상담
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-slate-200">
                  태어난 하늘과 지금의 하늘이 만나는 자리에서, {toText(consultation.topic) || "현재 질문"}의 흐름을 차분히 비춥니다.
                </p>
                {keywords.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <span key={keyword} className="rounded-full border border-[#f5d487]/25 bg-[#f5d487]/10 px-3 py-1 text-xs font-bold text-amber-50">
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </header>

              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoCard title={copy.birthDateLabel} value={toText(birth.birthDate) || "미입력"} />
                <InfoCard title={copy.birthTimeLabel} value={birthTime} />
                <InfoCard title={copy.birthPlaceLabel} value={[place.city, place.country].filter(Boolean).join(", ") || "미입력"} />
                <InfoCard title={copy.consultTopicLabel} value={toText(consultation.topic) || "전체 차트 해석"} />
              </section>

              {birth.birthTimeUnknown && (
                <section className="rounded-lg border border-[#f5d487]/25 bg-[#f5d487]/10 p-4 text-sm leading-7 text-amber-50">
                  출생시간 미상으로 상승궁과 하우스는 확정하지 않고 제한적으로 다룹니다. 태양, 달, 개인 행성, 주요 각도와 현재 흐름을 중심으로 읽어 주세요.
                </section>
              )}

              <section className={`${RESULT_PANEL_CLASS} p-5 sm:p-6`}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                    <Sparkles className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                  </span>
                  <h2 className="text-xl font-black text-white">현재 질문</h2>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{toText(consultation.userQuestion) || "전체 흐름을 중심으로 상담합니다."}</p>
              </section>

              <section>
                <PagedResultViewer
                  pages={sections.map((section, index) => ({
                    id: `astrology-section-${index}`,
                    label: toText(section.title).slice(0, 12) || `${index + 1}장`,
                    content: (
                      <div className={`${RESULT_PANEL_CLASS} p-5 sm:p-6`}>
                        <h3 className="text-lg font-black leading-7 text-[#f5d487]">{section.title}</h3>
                        <AiResultProse value={section.body} className="mt-5 text-slate-100" />
                      </div>
                    ),
                  }))}
                  deckLabel="별자리 상담 전문"
                  viewAll={viewAll}
                  onViewAllChange={setViewAll}
                  expandForExport={exportExpand}
                />
              </section>
            </article>

            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              {rawChart && (
                <section className={`${RESULT_PANEL_CLASS} p-5`}>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                      <Stars className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                    </span>
                    <h2 className="text-lg font-black text-white">출생 천궁도</h2>
                  </div>
                  <AstrologyChartWheel chart={rawChart} className="mx-auto w-full max-w-[360px]" />
                </section>
              )}

              <section className={`${RESULT_PANEL_CLASS} p-5`}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                    <Moon className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                  </span>
                  <h2 className="text-lg font-black text-white">차트 시그니처</h2>
                </div>
                <div className="grid gap-3">
                  {coreCards.map((card) => (
                    <InfoCard key={card.title} title={card.title} value={card.value} />
                  ))}
                </div>
              </section>

              <section className={`${RESULT_PANEL_CLASS} p-5`}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                    <Stars className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                  </span>
                  <h2 className="text-lg font-black text-white">주요 근거</h2>
                </div>
                <div className="grid gap-2 text-sm leading-6 text-slate-200">
                  {evidencePlanets.map((planet) => (
                    <EvidencePill key={planet.name} text={`${planet.label || planet.name} ${planet.signKo || planet.sign || ""}${planet.retrograde ? " R" : ""}`.trim()} />
                  ))}
                  {evidenceAspects.map((aspect) => (
                    <EvidencePill key={`${aspect.planetA}-${aspect.aspect}-${aspect.planetB}`} text={`${aspect.planetA} ${aspectLabel(aspect.aspect)} ${aspect.planetB}`} />
                  ))}
                  {!evidencePlanets.length && !evidenceAspects.length && (
                    <EvidencePill text="저장된 차트 근거가 제한적입니다." />
                  )}
                </div>
              </section>

              {/* 계산 근거 — 용어 툴팁이 붙은 공용 패널. 서버가 근거를 못 실어 보낸 옛 결과에서는
                  아래 원자료 뷰가 그대로 폴백으로 남는다. */}
              {consultation.analysisBasis ? (
                <section className={`${RESULT_PANEL_CLASS} p-5 [--cd-basis-popover-bg:#0d132c]`}>
                  <AnalysisBasisPanel basis={consultation.analysisBasis} multiColumn={false} title={copy.analysisBasisTitle} />
                </section>
              ) : (
                <details className={`${RESULT_PANEL_CLASS} p-5`} open>
                  <summary className="cursor-pointer list-none focus:outline-none focus:ring-2 focus:ring-[#f5d487]/30">
                    <span className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                        <Sparkles className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                      </span>
                      <span className="text-lg font-black text-white">기본 차트 데이터</span>
                    </span>
                  </summary>
                  <div className="mt-4">
                    <ChartDataGroup title={copy.chartBasicsTitle} items={chartBasics} />
                    <ChartDataGroup title={copy.chartPlanetsTitle} items={chartPlanets.map(planetDataLabel)} />
                    <ChartDataGroup title={copy.chartHousesTitle} items={chartHouses.length ? chartHouses.map(houseDataLabel) : ["출생시간 미상으로 하우스 해석은 제한됩니다."]} />
                    <ChartDataGroup title={copy.chartAspectsTitle} items={chartAspects.length ? chartAspects.map(aspectDataLabel) : ["저장된 주요 각도 데이터가 제한적입니다."]} />
                    <ChartDataGroup title={copy.chartTransitTitle} items={chartTransitAspects.length ? chartTransitAspects.map(transitDataLabel) : ["저장된 트랜짓 각도 데이터가 제한적입니다."]} />
                  </div>
                </details>
              )}

              {pdfError && (
                <section className="rounded-lg border border-rose-300/30 bg-rose-400/10 p-4 text-sm leading-7 text-rose-50">
                  {pdfError}
                </section>
              )}
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className={RESULT_INFO_CLASS}>
      <p className="text-xs font-black uppercase text-[#f5d487]">{title}</p>
      <p className="mt-2 break-words text-sm font-bold leading-6 text-white">{value}</p>
    </div>
  );
}

function EvidencePill({ text }: { text: string }) {
  return (
    <span className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-slate-100">
      {text}
    </span>
  );
}

function ChartDataGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="mb-2 text-xs font-black uppercase text-[#f5d487]">{title}</h3>
      <div className="grid gap-1.5 text-xs leading-5 text-slate-200">
        {items.filter(Boolean).map((item, index) => (
          <span key={`${title}-${index}`} className="break-words rounded-md border border-white/10 bg-white/[0.035] px-2.5 py-1.5">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
