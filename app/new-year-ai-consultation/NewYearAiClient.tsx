"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { CalendarDays, Download, Loader2, Moon, Share2, Sparkles, WalletCards } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent, type ReactNode } from "react";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  runBillingCoinGate,
  primePaymentEligibility,
} from "@/app/_lib/billing-client";
import { readAiProfileSeed, type AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import { authFetch } from "@/app/_lib/auth-client";
import { isRetriableResultPollFailure } from "@/app/_lib/consultationResultPolling";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { PriceBadge } from "@/app/components/PriceBadge";
import { extractReadableTextFromJsonLike, looksLikeRawJson, toDisplayText } from "@/lib/llm-text";
import AiResultProse from "@/components/fortune/AiResultProse";
import { readDevPreviewState } from "@/lib/dev-preview/core";
import { buildNewYearPreviewPayload } from "@/lib/dev-preview/fixtures/new-year";
import SajuPillarTable from "@/components/fortune/SajuPillarTable";
import { splitGanji, tenGodOfStem } from "@/lib/five-element-colors";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

// 접근성 속성(aria-label/title)만 다국어화한다 — 이 파일의 본문 표시 텍스트 전체 번역은
// 훨씬 큰 별도 작업이라 이번 범위 밖이다(docs/handoff/global-i18n-audit-remaining.md 참고).
type NewYearAiCopy = {
  qaCardAria: string; domainResultsAria: string; progressAria: string; letterAccordionAria: string;
  monthDomainGridAria: string; monthCalendarAria: string; introSectionAria: string; consultCardAria: string;
  heroBadgesAria: string; profileLoadAria: string; yearChipsAria: string; yearInputAria: string;
  categoryGridAria: string; shareCardAria: string; recentListAria: string;
};

const NEW_YEAR_AI_EN: NewYearAiCopy = {
  qaCardAria: "Answer to your own question", domainResultsAria: "Consultation results by category",
  progressAria: "Consultation generation progress", letterAccordionAria: "New year consultation letters — tap a month to expand",
  monthDomainGridAria: "Strengths and basis by domain", monthCalendarAria: "Monthly fortune calendar — tap a month to see fortune by domain",
  introSectionAria: "New year fortune expert consultation", consultCardAria: "Consultation summary",
  heroBadgesAria: "Consultation contents", profileLoadAria: "Load birth info from profile card",
  yearChipsAria: "Select consultation year", yearInputAria: "Enter consultation year manually",
  categoryGridAria: "Focus consultation area", shareCardAria: "Create shareable card image",
  recentListAria: "View past new year fortune consultations",
};

const NEW_YEAR_AI_COPY: Partial<Record<LoadingLocale, NewYearAiCopy>> = {
  ko: {
    qaCardAria: "나만의 질문에 대한 답변", domainResultsAria: "분야별 상담 결과", progressAria: "상담문 생성 진행률",
    letterAccordionAria: "새해 상담 편지지 — 월을 누르면 펼쳐집니다", monthDomainGridAria: "도메인별 강약과 근거",
    monthCalendarAria: "월별 운세 캘린더 — 달을 누르면 도메인별 운세가 열립니다", introSectionAria: "신년운세 전문가 상담",
    consultCardAria: "상담 준비 요약", heroBadgesAria: "상담 구성", profileLoadAria: "프로필 카드에서 출생 정보 불러오기",
    yearChipsAria: "상담 연도 선택", yearInputAria: "상담 연도 직접 입력", categoryGridAria: "집중 상담 분야",
    shareCardAria: "공유 카드 이미지 만들기", recentListAria: "지난 신년운세 다시 보기",
  },
  ja: {
    qaCardAria: "あなたの質問への答え", domainResultsAria: "分野別相談結果", progressAria: "相談文生成進行率",
    letterAccordionAria: "新年相談レターシート — 月をタップすると開きます", monthDomainGridAria: "分野別の強弱と根拠",
    monthCalendarAria: "月別運勢カレンダー — 月をタップすると分野別運勢が開きます", introSectionAria: "新年運勢専門家相談",
    consultCardAria: "相談準備の要約", heroBadgesAria: "相談の構成", profileLoadAria: "プロフィールカードから生年情報を読み込む",
    yearChipsAria: "相談年を選択", yearInputAria: "相談年を直接入力", categoryGridAria: "集中相談分野",
    shareCardAria: "共有カード画像を作成", recentListAria: "過去の新年運勢をもう一度見る",
  },
  "zh-CN": {
    qaCardAria: "关于您问题的答案", domainResultsAria: "各领域咨询结果", progressAria: "咨询文生成进度",
    letterAccordionAria: "新年咨询信笺 — 点击月份展开", monthDomainGridAria: "各领域强弱与依据",
    monthCalendarAria: "月度运势日历 — 点击月份查看各领域运势", introSectionAria: "新年运势专家咨询",
    consultCardAria: "咨询准备摘要", heroBadgesAria: "咨询构成", profileLoadAria: "从档案卡加载出生信息",
    yearChipsAria: "选择咨询年份", yearInputAria: "直接输入咨询年份", categoryGridAria: "重点咨询领域",
    shareCardAria: "制作分享卡片图片", recentListAria: "再次查看过往新年运势",
  },
  "zh-TW": {
    qaCardAria: "關於您問題的答案", domainResultsAria: "各領域諮詢結果", progressAria: "諮詢文生成進度",
    letterAccordionAria: "新年諮詢信箋 — 點擊月份展開", monthDomainGridAria: "各領域強弱與依據",
    monthCalendarAria: "月度運勢日曆 — 點擊月份查看各領域運勢", introSectionAria: "新年運勢專家諮詢",
    consultCardAria: "諮詢準備摘要", heroBadgesAria: "諮詢構成", profileLoadAria: "從檔案卡載入出生資訊",
    yearChipsAria: "選擇諮詢年份", yearInputAria: "直接輸入諮詢年份", categoryGridAria: "重點諮詢領域",
    shareCardAria: "製作分享卡片圖片", recentListAria: "再次查看過往新年運勢",
  },
  vi: {
    qaCardAria: "Câu trả lời cho câu hỏi của bạn", domainResultsAria: "Kết quả tư vấn theo từng lĩnh vực",
    progressAria: "Tiến độ tạo nội dung tư vấn", letterAccordionAria: "Thư tư vấn năm mới — nhấn vào tháng để mở",
    monthDomainGridAria: "Điểm mạnh yếu và cơ sở theo từng lĩnh vực",
    monthCalendarAria: "Lịch vận mệnh theo tháng — nhấn vào tháng để xem vận mệnh theo lĩnh vực",
    introSectionAria: "Tư vấn chuyên gia vận mệnh năm mới", consultCardAria: "Tóm tắt chuẩn bị tư vấn",
    heroBadgesAria: "Nội dung tư vấn", profileLoadAria: "Tải thông tin sinh từ thẻ hồ sơ",
    yearChipsAria: "Chọn năm tư vấn", yearInputAria: "Nhập trực tiếp năm tư vấn", categoryGridAria: "Lĩnh vực tư vấn trọng tâm",
    shareCardAria: "Tạo hình ảnh thẻ chia sẻ", recentListAria: "Xem lại các lần xem vận mệnh năm mới trước đây",
  },
  hi: {
    qaCardAria: "आपके प्रश्न का उत्तर", domainResultsAria: "क्षेत्र के अनुसार परामर्श परिणाम",
    progressAria: "परामर्श सामग्री निर्माण प्रगति", letterAccordionAria: "नव वर्ष परामर्श पत्र — महीने पर टैप करके खोलें",
    monthDomainGridAria: "क्षेत्र अनुसार ताकत-कमजोरी और आधार",
    monthCalendarAria: "मासिक भाग्य कैलेंडर — महीने पर टैप करके क्षेत्र अनुसार भाग्य देखें",
    introSectionAria: "नव वर्ष भाग्य विशेषज्ञ परामर्श", consultCardAria: "परामर्श तैयारी सारांश",
    heroBadgesAria: "परामर्श संरचना", profileLoadAria: "प्रोफ़ाइल कार्ड से जन्म जानकारी लोड करें",
    yearChipsAria: "परामर्श वर्ष चुनें", yearInputAria: "परामर्श वर्ष सीधे दर्ज करें", categoryGridAria: "केंद्रित परामर्श क्षेत्र",
    shareCardAria: "साझा कार्ड छवि बनाएँ", recentListAria: "पिछला नव वर्ष भाग्य फिर से देखें",
  },
  es: {
    qaCardAria: "Respuesta a tu pregunta", domainResultsAria: "Resultados de la consulta por categoría",
    progressAria: "Progreso de generación de la consulta", letterAccordionAria: "Cartas de consulta de año nuevo — toca un mes para expandir",
    monthDomainGridAria: "Fortalezas, debilidades y base por categoría",
    monthCalendarAria: "Calendario de fortuna mensual — toca un mes para ver la fortuna por categoría",
    introSectionAria: "Consulta de experto en fortuna de año nuevo", consultCardAria: "Resumen de preparación de la consulta",
    heroBadgesAria: "Contenido de la consulta", profileLoadAria: "Cargar datos de nacimiento desde la tarjeta de perfil",
    yearChipsAria: "Seleccionar año de consulta", yearInputAria: "Introducir el año de consulta manualmente",
    categoryGridAria: "Área de consulta enfocada", shareCardAria: "Crear imagen de tarjeta para compartir",
    recentListAria: "Ver consultas de año nuevo anteriores de nuevo",
  },
  fr: {
    qaCardAria: "Réponse à votre question", domainResultsAria: "Résultats de consultation par catégorie",
    progressAria: "Progression de la génération de la consultation", letterAccordionAria: "Lettres de consultation du Nouvel An — appuyez sur un mois pour développer",
    monthDomainGridAria: "Forces, faiblesses et base par catégorie",
    monthCalendarAria: "Calendrier de fortune mensuel — appuyez sur un mois pour voir la fortune par catégorie",
    introSectionAria: "Consultation d'expert en fortune du Nouvel An", consultCardAria: "Résumé de préparation de la consultation",
    heroBadgesAria: "Contenu de la consultation", profileLoadAria: "Charger les informations de naissance depuis la carte de profil",
    yearChipsAria: "Sélectionner l'année de consultation", yearInputAria: "Saisir l'année de consultation manuellement",
    categoryGridAria: "Domaine de consultation ciblé", shareCardAria: "Créer une image de carte à partager",
    recentListAria: "Revoir les consultations du Nouvel An précédentes",
  },
  de: {
    qaCardAria: "Antwort auf deine Frage", domainResultsAria: "Beratungsergebnisse nach Kategorie",
    progressAria: "Fortschritt der Beratungserstellung", letterAccordionAria: "Neujahrsberatungsbriefe — auf einen Monat tippen zum Aufklappen",
    monthDomainGridAria: "Stärken, Schwächen und Grundlage nach Kategorie",
    monthCalendarAria: "Monatlicher Glückskalender — auf einen Monat tippen, um das Glück nach Kategorie zu sehen",
    introSectionAria: "Neujahrs-Glücksexpertenberatung", consultCardAria: "Zusammenfassung der Beratungsvorbereitung",
    heroBadgesAria: "Beratungsinhalt", profileLoadAria: "Geburtsdaten aus der Profilkarte laden",
    yearChipsAria: "Beratungsjahr auswählen", yearInputAria: "Beratungsjahr manuell eingeben", categoryGridAria: "Fokus-Beratungsbereich",
    shareCardAria: "Freigabekarten-Bild erstellen", recentListAria: "Frühere Neujahrsberatungen erneut ansehen",
  },
  nl: {
    qaCardAria: "Antwoord op jouw vraag", domainResultsAria: "Adviesresultaten per categorie",
    progressAria: "Voortgang van adviesgeneratie", letterAccordionAria: "Nieuwjaarsadviesbrieven — tik op een maand om uit te klappen",
    monthDomainGridAria: "Sterktes, zwaktes en basis per categorie",
    monthCalendarAria: "Maandelijkse fortuinkalender — tik op een maand om het fortuin per categorie te zien",
    introSectionAria: "Nieuwjaarsfortuin-expertadvies", consultCardAria: "Samenvatting adviesvoorbereiding",
    heroBadgesAria: "Adviesinhoud", profileLoadAria: "Geboortegegevens laden vanaf profielkaart",
    yearChipsAria: "Adviesjaar selecteren", yearInputAria: "Adviesjaar handmatig invoeren", categoryGridAria: "Focus adviesgebied",
    shareCardAria: "Deelkaartafbeelding maken", recentListAria: "Eerdere nieuwjaarsfortuinen opnieuw bekijken",
  },
  ms: {
    qaCardAria: "Jawapan kepada soalan anda", domainResultsAria: "Keputusan rundingan mengikut kategori",
    progressAria: "Kemajuan penjanaan rundingan", letterAccordionAria: "Surat rundingan tahun baharu — ketik bulan untuk kembangkan",
    monthDomainGridAria: "Kekuatan, kelemahan dan asas mengikut kategori",
    monthCalendarAria: "Kalendar nasib bulanan — ketik bulan untuk melihat nasib mengikut kategori",
    introSectionAria: "Rundingan pakar nasib tahun baharu", consultCardAria: "Ringkasan persediaan rundingan",
    heroBadgesAria: "Kandungan rundingan", profileLoadAria: "Muatkan maklumat kelahiran daripada kad profil",
    yearChipsAria: "Pilih tahun rundingan", yearInputAria: "Masukkan tahun rundingan secara terus", categoryGridAria: "Bidang rundingan tumpuan",
    shareCardAria: "Cipta imej kad kongsi", recentListAria: "Lihat semula nasib tahun baharu lepas",
  },
};

function getNewYearAiCopy(locale: LoadingLocale): NewYearAiCopy {
  return NEW_YEAR_AI_COPY[locale] || NEW_YEAR_AI_EN;
}

/** 이 파일 전용 로케일 훅 — 여러 하위 컴포넌트가 각자 useState+useEffect를 반복하지 않도록 공용화. */
function useNewYearAiCopy(): NewYearAiCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => { window.removeEventListener("languagechange", sync); window.removeEventListener("cd:locale-ready", sync); };
  }, []);
  return getNewYearAiCopy(locale);
}

type AccessType = "pass" | "paid" | "subscription" | "admin";
type CalendarType = "solar" | "lunar";
type GenderType = "male" | "female" | "unknown" | "";
type FocusAreaType = "overall" | "love" | "money" | "career" | "health" | "relationship" | "study" | "custom";
type FlowStatus = "idle" | "preparing" | "payment" | "reading" | "ready" | "error";

type ConsultationForm = {
  userName: string;
  gender: GenderType;
  birthDate: string;
  birthTime: string;
  calendarType: CalendarType;
  targetYear: string;
  focusArea: FocusAreaType;
  question: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type SajuProfile = {
  birthInfo?: {
    name?: string;
    gender?: string;
    birthDate?: string;
    birthTime?: string;
    calendarType?: string;
  };
  pillars?: Array<{ label: string; value: string }>;
  dayMaster?: string;
  strength?: string;
  dominantElement?: string;
  balancingElement?: string;
  targetYear?: {
    year?: number | null;
    pillar?: string;
    tenGod?: string;
    relationToDayBranch?: string;
  };
  gyeokguk?: string;
  yongshin?: {
    core?: string;
    heesin?: string;
    gisin?: string;
    reading?: string;
  };
  johu?: {
    urgentElement?: string;
    reading?: string;
  };
  daewoonSewoon?: string;
  monthlyHighlights?: {
    opportunity?: string[];
    caution?: string[];
  };
};

type EnsureAccessResult =
  | { ok: true; accessToken: string; accessType: AccessType }
  | { ok: false; reason: "PAYMENT_REQUIRED"; paymentPayload?: Record<string, unknown> }
  | { ok: false; reason: "LOGIN_REQUIRED"; message?: string }
  | { ok: false; reason: "INVALID_INPUT"; message: string }
  | { ok: false; reason?: string; message?: string };

type MonthDomainSignal = { level: string; basis: string };
type MonthlyDomains = {
  overall?: MonthDomainSignal;
  money?: MonthDomainSignal;
  love?: MonthDomainSignal;
  career?: MonthDomainSignal;
  health?: MonthDomainSignal;
};

type MonthlyFlowRow = {
  month: number;
  pillar: string;
  element: string;
  tenGod: string;
  domain: string;
  relationToDayBranch: string;
  timing: string;
  domains?: MonthlyDomains | null;
};

type TargetYearInfo = {
  year: number | null;
  pillar: string;
  stem: string;
  branch: string;
  stemElement: string;
  tenGod: string;
};

type RecentSession = {
  sessionId: string;
  year: number | null;
  pillar: string;
  name: string;
  updatedAt?: string;
};

// 서버가 분야별로 나눠 생성한 본문. 2026-08 이전 세션에는 없으므로 항상 옵셔널이다.
type ConsultationSection = {
  key: string;
  label: string;
  text: string;
};

type ConsultationResult = {
  ok: boolean;
  sessionId?: string;
  accessType?: AccessType;
  status?: string;
  messages?: ChatMessage[];
  sections?: ConsultationSection[];
  sajuProfile?: SajuProfile | null;
  monthlyFlow?: MonthlyFlowRow[];
  targetYear?: TargetYearInfo | null;
  reason?: string;
  message?: string;
};

const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const PAYMENT_REQUIRED_MESSAGE = "신년운세 전문가 상담 이용권이 필요합니다. 결제창을 열어드릴게요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const PAYMENT_CANCELLED_MESSAGE = "결제가 취소되었습니다. 필요할 때 다시 진행할 수 있습니다.";
const SERVER_ERROR_MESSAGE = "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "전문가 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 같은 요청 권한으로 다시 이어집니다.";
const REQUIRED_INPUT_MESSAGE = "신년운세 상담에 필요한 정보가 부족해요. 생년월일, 성별, 달력 기준을 다시 확인해 주세요.";
const TARGET_YEAR_REQUIRED_MESSAGE = "상담할 연도를 선택해 주세요.";
const CUSTOM_QUESTION_REQUIRED_MESSAGE = "직접 질문을 선택했다면 궁금한 내용을 짧게 적어 주세요.";
const FEATURE_KEY = "new-year-ai-consultation";
const FEATURE_COST = 300;
const FEATURE_AMOUNT_KRW = 30000;
const FEATURE_MEMBERSHIP_CREDIT_COST = 3000;
const FEATURE_REASON = "신년운세 전문가 상담";
const FOCUS_AREA_OPTIONS: Array<{ value: FocusAreaType; label: string; prompt: string; glyph: string }> = [
  { value: "overall", label: "종합운", glyph: "年", prompt: "올해 제 명식에서 가장 먼저 붙잡아야 할 흐름과, 무리하지 않아야 할 시기를 함께 짚어주세요." },
  { value: "love", label: "연애/재회", glyph: "緣", prompt: "올해 인연이 열리는 결, 다시 다가오는 마음, 관계에서 서두르지 말아야 할 때를 깊게 봐주세요." },
  { value: "money", label: "재물/수입", glyph: "財", prompt: "올해 돈이 모이는 방식과 새는 자리, 수입을 키우기 좋은 달과 조심할 달을 짚어주세요." },
  { value: "career", label: "직업/이직", glyph: "官", prompt: "올해 일의 방향, 이직과 전환의 타이밍, 제 명식에 맞는 선택 기준을 봐주세요." },
  { value: "health", label: "건강/멘탈", glyph: "身", prompt: "올해 몸과 마음의 기운이 흔들리기 쉬운 시기와 회복을 도울 생활 리듬을 살펴주세요." },
  { value: "relationship", label: "가족/관계", glyph: "和", prompt: "올해 가족과 가까운 사람들 사이에서 풀리는 흐름과 조심해야 할 말의 결을 봐주세요." },
  { value: "study", label: "학업/성장", glyph: "文", prompt: "올해 공부, 자격, 성장운에서 힘을 써야 할 방향과 집중이 잘 열리는 시기를 봐주세요." },
  { value: "custom", label: "직접 질문", glyph: "問", prompt: "새해에 가장 깊게 들여다보고 싶은 흐름을 그대로 적어 주세요." },
];

const QUESTION_PLACEHOLDER_EXAMPLES = [
  "이직해도 될까요?",
  "올해 재회 가능성이 있을까요?",
  "이 사업을 계속해야 할까요?",
];

function getFocusOption(value: FocusAreaType) {
  return FOCUS_AREA_OPTIONS.find((option) => option.value === value) || FOCUS_AREA_OPTIONS[0];
}

const defaultForm = (): ConsultationForm => ({
  userName: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  calendarType: "solar",
  targetYear: String(new Date().getFullYear() + 1),
  focusArea: "overall",
  question: "",
});

function applyProfileSeedToForm(form: ConsultationForm, profile: AiPrefillSeed): ConsultationForm {
  if (!profile.name && !profile.gender && !profile.birthDate && !profile.birthTime && !profile.calendarType && profile.birthTimeUnknown === undefined) {
    return form;
  }
  return {
    ...form,
    userName: profile.name || form.userName,
    gender: (profile.gender as ConsultationForm["gender"]) || form.gender,
    birthDate: profile.birthDate || form.birthDate,
    birthTime: profile.birthTimeUnknown ? "" : (profile.birthTime || form.birthTime),
    calendarType: profile.calendarType || form.calendarType,
  };
}

function buildInitialForm(): ConsultationForm {
  return applyProfileSeedToForm(defaultForm(), readAiProfileSeed());
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `nyai-${crypto.randomUUID()}`;
  return `nyai-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function isGenuineCustomQuestion(question: string) {
  const trimmed = question.trim();
  return trimmed.length > 0 && !FOCUS_AREA_OPTIONS.some((option) => option.prompt === trimmed);
}

function buildConsultationPayload(form: ConsultationForm) {
  const focusOption = getFocusOption(form.focusArea);
  return {
    serviceType: FEATURE_KEY,
    consultationType: "newYearFortune",
    userName: form.userName.trim(),
    gender: form.gender,
    birthDate: form.birthDate,
    birthTime: form.birthTime,
    calendarType: form.calendarType,
    targetYear: Number(form.targetYear),
    focusArea: form.focusArea,
    question: form.question.trim() || focusOption.prompt,
    hasCustomQuestion: isGenuineCustomQuestion(form.question),
    locale: "ko",
  };
}

function validateConsultationForm(form: ConsultationForm) {
  if (!form.birthDate || !form.gender || !form.calendarType) return REQUIRED_INPUT_MESSAGE;
  const year = Number(form.targetYear);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return TARGET_YEAR_REQUIRED_MESSAGE;
  if (form.focusArea === "custom" && form.question.trim().length < 2) return CUSTOM_QUESTION_REQUIRED_MESSAGE;
  return "";
}

async function postJson<T>(path: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<{ response: Response; payload: T }> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    credentials: "include",
    body: JSON.stringify(idempotencyKey ? { ...body, idempotencyKey } : body),
  });
  const payload = await response.json().catch(() => ({})) as T;
  return { response, payload };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// 생성이 오래 걸릴 때(202/generating) 결과 엔드포인트를 폴링해 수렴시킨다.
// CF rate-limit(10초당 100회) 대비 최대 1req/3~8s, 상한 40회. 생성은 요청 안에서 끝나므로
// 이 경로는 동시 요청 중복 방지(202)일 때만 쓰인다 — 서버가 신선도 창(120s)을 넘긴 세션은
// 202 대신 409로 종단하므로 폴링이 5분 내내 헛돌지 않는다.
// 첫 폴은 빠르게(0.7s) 프로브해 조기 완료를 즉시 잡고, 이후 3~8s로 램프한다.
const RESULT_POLL_BACKOFF_MS = [700, 3000, 5000, 8000];
const RESULT_POLL_MAX_ATTEMPTS = 40;

async function pollNewYearResult(sessionId: string): Promise<ConsultationResult> {
  for (let attempt = 0; attempt < RESULT_POLL_MAX_ATTEMPTS; attempt += 1) {
    await sleep(RESULT_POLL_BACKOFF_MS[Math.min(attempt, RESULT_POLL_BACKOFF_MS.length - 1)]);
    let response: Response;
    try {
      // authFetch로 폴링해 세션 리프레시가 일시 실패한 401을 재시도 가능한 503으로 흡수한다(plain fetch는 완충 없음).
      response = await authFetch(`/api/new-year-ai/result?sessionId=${encodeURIComponent(sessionId)}`);
    } catch {
      continue;
    }
    if (response.status === 202) continue;
    if (response.status === 429) throw new Error(SERVER_ERROR_MESSAGE);
    const payload = (await response.json().catch(() => ({}))) as ConsultationResult;
    // 일시적 DB/인증 장애(503·retryable)는 하드 종료하지 말고 계속 폴링해 자가 복구한다.
    if (isRetriableResultPollFailure(response.status, payload)) continue;
    if (!response.ok) throw new Error(payload.message || LLM_ERROR_MESSAGE);
    return payload;
  }
  throw new Error("상담 생성이 평소보다 오래 걸리고 있습니다. 페이지를 닫지 말고 잠시 후 다시 시도해 주세요.");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toText(value: unknown) {
  return toDisplayText(value);
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function splitAssistantSections(content: string) {
  let normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  // 구조화 파싱에 실패한 원시(잘린) JSON은 중괄호째 노출하지 않고 읽을 수 있는 문장만 복원한다.
  if (looksLikeRawJson(normalized)) {
    normalized = extractReadableTextFromJsonLike(normalized);
    if (!normalized) return [];
  }
  const chunks = normalized.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
  return chunks.map((chunk, index) => {
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
    const first = lines[0] || "";
    const headingMatch = first.match(/^(?:#{1,3}\s*)?(?:\d+[.)]\s*)?(.{2,42}?)(?:[:：])?$/);
    const hasHeading = Boolean(headingMatch && lines.length > 1 && first.length <= 44);
    return {
      title: hasHeading ? headingMatch?.[1]?.replace(/\*\*/g, "").trim() || `새해 상담 편지 ${index + 1}` : `새해 상담 편지 ${index + 1}`,
      body: hasHeading ? lines.slice(1).join("\n") : chunk,
    };
  });
}

type ParsedSection = { title: string; body: string };
type MonthLetter = { ganji: string; keyword: string; body: string };

const QUESTION_ANSWER_TITLE = "질문에 대한 답변";
const MONTH_LETTER_HEADING_RE = /^(\d{1,2})월\s*[·∙・-]\s*(\S+)\s*[·∙・-]\s*(.+)$/;
const CATEGORY_TITLE_PREFIXES = ["연애·재회", "재물·수입", "직업·이직", "건강·멘탈", "가족·관계", "학업·성장"];

// 결과 화면의 네 장짜리 상담 카드. key는 서버 섹션 키(worker/routes/new-year-ai.js의
// NEW_YEAR_AI_SECTIONS)와 같아야 한다 — 구조화 응답이 오면 이 키로 곧장 매칭한다.
// marker는 구버전 세션(llmMeta.sections 없음)에서 조립본을 다시 가를 때 쓰는 굵은 소제목이다.
const DOMAIN_CARDS: Array<{ key: string; label: string; marker: string; glyph: string; hint: string }> = [
  { key: "overview", label: "올해의 총운", marker: "올해의 총운", glyph: "運", hint: "세운이 일간에 만드는 조후와 억부의 변화" },
  { key: "wealth", label: "재물과 직업", marker: "재물과 직업", glyph: "財", hint: "재성·관성의 동태와 움직일 시기" },
  { key: "romance", label: "애정과 대인관계", marker: "애정과 대인관계", glyph: "緣", hint: "귀인과 인연, 조심해야 할 관계" },
  { key: "health", label: "건강과 개운법", marker: "건강과 개운법", glyph: "身", hint: "오행의 쏠림과 실생활 개운법" },
];
const DEFAULT_DOMAIN_KEY = DOMAIN_CARDS[0].key;
// 구버전 조립본에는 분야 마커가 없고 6개 카테고리 소제목만 있다. 그 소제목을 새 분야로 흡수해
// 이미 결제된 과거 상담도 같은 네 장 카드로 열린다.
const LEGACY_CATEGORY_DOMAIN: Record<string, string> = {
  "재물·수입": "wealth",
  "직업·이직": "wealth",
  "연애·재회": "romance",
  "가족·관계": "romance",
  "건강·멘탈": "health",
  "학업·성장": "overview",
};

function stripBold(value: string) {
  return value.replace(/\*\*/g, "").trim();
}

// 문단의 제목 줄 또는 본문 첫 줄에서 분야 마커를 찾는다. LLM이 소제목을 자기 문단으로 떼어
// 쓸 때와 본문 첫 줄에 붙여 쓸 때가 모두 있어 두 자리를 함께 본다.
function domainKeyFromSection(section: ParsedSection) {
  const heads = [stripBold(section.title), stripBold(section.body.split("\n")[0] || "")];
  for (const card of DOMAIN_CARDS) {
    if (heads.some((head) => head === card.marker || head.startsWith(card.marker))) return card.key;
  }
  return "";
}

function legacyDomainFromTitle(title: string) {
  const head = stripBold(title);
  const prefix = CATEGORY_TITLE_PREFIXES.find((item) => head.startsWith(item));
  return prefix ? LEGACY_CATEGORY_DOMAIN[prefix] || "" : "";
}

// 조립본을 분야별로 되돌린다. 분야 마커는 경계라서 뒤 문단까지 끌고 가고(sticky),
// 6개 카테고리 소제목은 더 큰 절 안의 점 표시라서 그 문단 하나만 옮긴다.
function groupSectionsByDomain(sections: ParsedSection[]) {
  const buckets = new Map<string, ParsedSection[]>();
  const push = (key: string, section: ParsedSection) => {
    const list = buckets.get(key) || [];
    list.push(section);
    buckets.set(key, list);
  };
  let current = DEFAULT_DOMAIN_KEY;
  for (const section of sections) {
    const explicit = domainKeyFromSection(section);
    if (explicit) {
      current = explicit;
      push(current, section);
      continue;
    }
    const legacy = legacyDomainFromTitle(section.title);
    push(legacy || current, section);
  }
  return buckets;
}

function classifySections(sections: ParsedSection[]) {
  const monthLetters = new Map<number, MonthLetter>();
  const restSections: ParsedSection[] = [];
  let questionAnswer: ParsedSection | null = null;
  for (const section of sections) {
    if (!questionAnswer && section.title.includes(QUESTION_ANSWER_TITLE)) {
      questionAnswer = section;
      continue;
    }
    const monthMatch = section.title.match(MONTH_LETTER_HEADING_RE);
    const month = monthMatch ? Number(monthMatch[1]) : NaN;
    if (monthMatch && month >= 1 && month <= 12 && !monthLetters.has(month)) {
      monthLetters.set(month, { ganji: monthMatch[2], keyword: monthMatch[3], body: section.body });
      continue;
    }
    restSections.push(section);
  }
  // restSections의 원래 순서를 그대로 보존해야 분야 경계(sticky)가 어긋나지 않는다.
  // 구 정렬(카테고리 먼저)은 분야 그룹핑이 순서를 대신하므로 더 이상 필요 없다.
  return { questionAnswer, monthLetters, restSections, domains: groupSectionsByDomain(restSections) };
}

// 분야 카드 본문. 서버 구조화 응답이 있으면 그대로 쓰고, 없으면 조립본 그룹핑 결과를 쓴다.
// 분야 마커 줄만 남은 문단은 카드 제목과 중복이라 본문에서 걷어낸다.
function buildDomainBodies(
  serverSections: ConsultationSection[],
  grouped: Map<string, ParsedSection[]>,
) {
  const bodies = new Map<string, string>();
  for (const card of DOMAIN_CARDS) {
    const fromServer = serverSections.find((section) => section.key === card.key)?.text || "";
    if (fromServer) {
      bodies.set(card.key, stripLeadingMarker(fromServer, card.marker));
      continue;
    }
    const chunks = (grouped.get(card.key) || [])
      .map((section) => {
        const body = stripLeadingMarker(section.body, card.marker);
        const title = stripBold(section.title);
        const isMarkerTitle = title === card.marker || title.startsWith(card.marker);
        const isGeneratedTitle = /^새해 상담 편지 \d+$/.test(title);
        return !isMarkerTitle && !isGeneratedTitle && body ? `**${title}**\n${body}` : body;
      })
      .filter(Boolean);
    if (chunks.length) bodies.set(card.key, chunks.join("\n\n"));
  }
  return bodies;
}

function stripLeadingMarker(text: string, marker: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  while (lines.length && !stripBold(lines[0])) lines.shift();
  if (lines.length && stripBold(lines[0]) === marker) lines.shift();
  return lines.join("\n").trim();
}

function AssistantMessageContent({ content, sections }: { content: string; sections: ParsedSection[] }) {
  if (!sections.length) {
    return <AiResultProse value={content} />;
  }
  return (
    <div className="nyai-section-list">
      {sections.map((section, index) => (
        <section className="nyai-result-section" data-pdf-section={index + 1} key={`${section.title}-${index}`}>
          <h3>{section.title}</h3>
          <AiResultProse value={section.body} />
        </section>
      ))}
    </div>
  );
}

function NewYearQuestionAnswerCard({ name, question, answer }: { name: string; question: string; answer: string }) {
  const copy = useNewYearAiCopy();
  return (
    <section className="nyai-question-answer" data-pdf-section="question-answer" aria-label={copy.qaCardAria}>
      <span className="nyai-eyebrow">{name ? `${name}님의 질문` : "나만의 질문"}</span>
      <blockquote className="nyai-qa-question">“{question}”</blockquote>
      <AiResultProse value={answer} className="nyai-qa-answer" />
    </section>
  );
}

// 결과 카드의 등장 연출. data-pdf-section 마커는 감싸는 쪽이 아니라 안쪽 요소에 그대로 두어
// PDF 캡처 대상이 바뀌지 않게 한다. 대신 .nyai-reveal 클래스가 내보내기 시 강제 노출의 손잡이다.
function RevealBlock({ index = 0, children }: { index?: number; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className="nyai-reveal">{children}</div>;
  return (
    <motion.div
      className="nyai-reveal"
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.55, delay: Math.min(index, 5) * 0.09, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function DomainConsultationCards({ bodies }: { bodies: Map<string, string> }) {
  const copy = useNewYearAiCopy();
  const cards = DOMAIN_CARDS.filter((card) => bodies.get(card.key));
  if (!cards.length) return null;
  return (
    <div className="nyai-domain-report" aria-label={copy.domainResultsAria}>
      {cards.map((card, index) => (
        <RevealBlock key={card.key} index={index}>
          <section className="nyai-report-card" data-pdf-section={`domain-${card.key}`}>
            <details className="nyai-report-details" open>
              <summary>
                <span className="nyai-report-glyph" aria-hidden="true">{card.glyph}</span>
                <span className="nyai-report-heading">
                  <strong>{card.label}</strong>
                  <small>{card.hint}</small>
                </span>
              </summary>
              <div className="nyai-report-body">
                <AiResultProse value={bodies.get(card.key) || ""} />
              </div>
            </details>
          </section>
        </RevealBlock>
      ))}
    </div>
  );
}

// 진행바는 서버가 알려주는 값이 아니라 경과 시간의 함수다. 그래서 92%를 넘지 않게 묶어
// 완료를 거짓으로 알리지 않는다 — 실제 완료는 폴링 응답이 도착할 때만 100%가 된다.
const READING_STAGES = [
  { at: 0, label: "명식과 세운을 세우는 중" },
  { at: 16, label: "올해의 총운을 읽는 중" },
  { at: 36, label: "재물과 직업의 결을 읽는 중" },
  { at: 54, label: "애정과 대인관계를 살피는 중" },
  { at: 70, label: "건강과 개운법, 열두 달을 정리하는 중" },
  { at: 88, label: "명식과 다시 대조하는 중" },
];
const READING_PROGRESS_CAP = 92;
// 4섹션 시절 실측 대역(40~55초)의 중앙값. 지수 완화라 이보다 오래 걸려도 상한에 수렴할 뿐 넘지 않는다.
const READING_EXPECTED_MS = 48000;

function readingProgressFromElapsed(elapsedMs: number) {
  const ratio = 1 - Math.exp(-Math.max(0, elapsedMs) / (READING_EXPECTED_MS / 2.4));
  return Math.min(READING_PROGRESS_CAP, READING_PROGRESS_CAP * ratio);
}

function readingStageLabel(percent: number) {
  return READING_STAGES.reduce((label, stage) => (percent >= stage.at ? stage.label : label), READING_STAGES[0].label);
}

function ReadingProgressPanel({ percent }: { percent: number }) {
  const copy = useNewYearAiCopy();
  const rounded = Math.round(percent);
  return (
    <div className="nyai-progress" data-pdf-skip="true">
      <div className="nyai-progress-head">
        <strong>{readingStageLabel(percent)}</strong>
        <span>{rounded}%</span>
      </div>
      <div
        className="nyai-progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        aria-valuetext={`${readingStageLabel(percent)} ${rounded}%`}
        aria-label={copy.progressAria}
      >
        <i style={{ width: `${rounded}%` }} />
      </div>
      <ol className="nyai-progress-steps">
        {DOMAIN_CARDS.map((card, index) => {
          const startsAt = READING_STAGES[index + 1]?.at ?? READING_STAGES[READING_STAGES.length - 1].at;
          const endsAt = READING_STAGES[index + 2]?.at ?? READING_STAGES[READING_STAGES.length - 1].at;
          const done = percent >= endsAt;
          const active = !done && percent >= startsAt;
          return (
            <li key={card.key} className={done ? "is-done" : active ? "is-active" : ""}>
              <span className="nyai-progress-glyph" aria-hidden="true">{card.glyph}</span>
              {card.label}
            </li>
          );
        })}
      </ol>
      <p className="nyai-progress-note">창을 닫지 마세요. 네 분야를 동시에 읽고 있어 잠시 시간이 걸립니다.</p>
    </div>
  );
}

function MonthlyLetterAccordion({ rows, letters }: { rows: MonthlyFlowRow[]; letters: Map<number, MonthLetter> }) {
  const copy = useNewYearAiCopy();
  const months = rows.length === 12
    ? rows.map((row) => row.month)
    : Array.from(letters.keys()).sort((a, b) => a - b);
  if (!months.length) return null;
  return (
    <section className="nyai-letter-accordion" data-pdf-section="monthly-letters" aria-label={copy.letterAccordionAria}>
      <div className="nyai-month-head">
        <strong>새해 상담 편지지</strong>
        <span>월을 누르면 그 달의 편지가 펼쳐집니다</span>
      </div>
      <div className="nyai-letter-grid">
        {months.map((month) => {
          const row = rows.find((item) => item.month === month);
          const letter = letters.get(month);
          const ganji = letter?.ganji || row?.pillar || "";
          const keyword = letter?.keyword || row?.domain || "흐름";
          return (
            <details className="nyai-letter-card" key={month}>
              <summary>
                <span className="nyai-letter-month">{month}월</span>
                {ganji ? <span className="nyai-letter-ganji">{ganji}</span> : null}
                <span className="nyai-letter-keyword">{keyword}</span>
              </summary>
              <div className="nyai-letter-body">
                {letter?.body ? (
                  <AiResultProse value={letter.body} />
                ) : (
                  <p>이 달의 상세 문단은 아래 편지 전체에서 확인해 주세요.</p>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function SajuProfilePanel({ profile }: { profile: SajuProfile | null }) {
  if (!profile) return null;
  const pillars = Array.isArray(profile.pillars) ? profile.pillars.filter((item) => item.value) : [];
  const birth = profile.birthInfo || {};
  const highlights = profile.monthlyHighlights || {};
  const dayStem = splitGanji(pillars.find((item) => item.label === "일주")?.value || "").stem;
  const tenGodOf = (label: string, ganji: string) => {
    if (label === "일주") return "일간";
    const stem = splitGanji(ganji).stem;
    return stem && dayStem ? tenGodOfStem(dayStem, stem) || undefined : undefined;
  };
  return (
    <section className="nyai-saju-profile" data-pdf-section="saju-profile">
      <div className="nyai-saju-head">
        <strong>기본 사주 명식</strong>
        <span>{profile.targetYear?.year ? `${profile.targetYear.year}년 세운 ${profile.targetYear.pillar || ""}` : "세운 요약"}</span>
      </div>
      <div className="nyai-saju-birth">
        {[birth.name, birth.birthDate, birth.birthTime, birth.calendarType === "lunar" ? "음력" : "양력", birth.gender].filter(Boolean).join(" · ")}
      </div>
      <SajuPillarTable
        className="nyai-pillar-grid"
        pillars={pillars.map((pillar) => ({ label: pillar.label, ganji: pillar.value, tenGod: tenGodOf(pillar.label, pillar.value) }))}
      />
      <div className="nyai-saju-facts">
        <span>일간 {profile.dayMaster || "미산출"}</span>
        <span>{profile.strength || "신강·신약 미산출"}</span>
        <span>용신 {profile.yongshin?.core || "미산출"}</span>
        <span>조후 {profile.johu?.urgentElement || "미산출"}</span>
      </div>
      <div className="nyai-saju-reading">
        {profile.gyeokguk && <p>{profile.gyeokguk}</p>}
        {profile.yongshin?.reading && <p>{profile.yongshin.reading}</p>}
        {profile.johu?.reading && <p>{profile.johu.reading}</p>}
        {profile.daewoonSewoon && <p>{profile.daewoonSewoon}</p>}
        {(highlights.opportunity?.length || highlights.caution?.length) ? (
          <p>
            {highlights.opportunity?.length ? `기회 월운: ${highlights.opportunity.join(", ")}. ` : ""}
            {highlights.caution?.length ? `주의 월운: ${highlights.caution.join(", ")}.` : ""}
          </p>
        ) : null}
      </div>
    </section>
  );
}

// 구버전 세션 재열람 폴백(마커 없는 조립본 → 분야 카드)은 화면 없이 검증할 수 있어야 한다.
// 이미 결제된 과거 상담이 안 열리는 회귀가 가장 비싼 실패라서 파싱만 따로 떼어 노출한다.
export const __newYearAiParserTestUtils = {
  splitAssistantSections,
  classifySections,
  buildDomainBodies,
  DOMAIN_CARDS,
};

function buildBillingGateInput(paymentPayload: Record<string, unknown>, idempotencyKey: string) {
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  return {
    categoryKey: toText(runtimeGate.categoryKey || paymentPayload.categoryKey) || "premium-consultation",
    subFeatureKey: toText(runtimeGate.subFeatureKey || paymentPayload.subFeatureKey) || FEATURE_KEY,
    featureKey: toText(runtimeGate.featureKey || paymentPayload.featureKey) || FEATURE_KEY,
    reason: toText(runtimeGate.reason || paymentPayload.reason) || FEATURE_REASON,
    productId: toText(runtimeGate.productId || paymentPayload.productId) || "new-year-ai",
    productType: toText(runtimeGate.productType || paymentPayload.productType) || "new-year-ai",
    serviceType: toText(runtimeGate.serviceType || paymentPayload.serviceType) || FEATURE_KEY,
    deferUsage: true,
    usagePolicy: "apply_after_success",
    requestId: idempotencyKey,
    idempotencyKey,
    cost: toNumber(runtimeGate.cost ?? paymentPayload.coinPrice, FEATURE_COST),
    coinPrice: toNumber(runtimeGate.coinPrice ?? paymentPayload.coinPrice, FEATURE_COST),
    amountKRW: toNumber(runtimeGate.amountKRW ?? paymentPayload.amountKRW, FEATURE_AMOUNT_KRW),
    membershipCreditCost: toNumber(runtimeGate.membershipCreditCost ?? paymentPayload.membershipCreditCost, FEATURE_MEMBERSHIP_CREDIT_COST),
  };
}

const KO_STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const KO_BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const HANJA_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const HANJA_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const BRANCH_ANIMALS = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];

// 연도 간지(입춘 무시, 연 단위 근사 — 시즌 배지/테마용. 명리 계산은 서버가 담당)
function yearGanzi(year: number) {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  const stemIndex = (year - 4) % 10;
  const branchIndex = (year - 4) % 12;
  return {
    ko: `${KO_STEMS[stemIndex]}${KO_BRANCHES[branchIndex]}`,
    hanja: `${HANJA_STEMS[stemIndex]}${HANJA_BRANCHES[branchIndex]}`,
    animal: BRANCH_ANIMALS[branchIndex],
    elementIndex: Math.floor(stemIndex / 2), // 0목 1화 2토 3금 4수
  };
}

// 세운 천간 오행 → 시즌 테마 컬러 (목/화/토/금/수).
// 페이지 전반의 강조는 앤틱 골드·옥색으로 고정됐고, 이 표는 월별 캘린더의 기회 칸과
// 공유 카드 배경에서만 소비된다. 채도를 낮춘 앤틱 톤이라 골드 옆에서 튀지 않는다.
// 모든 accent는 딥 버건디 배경 위에서 본문 대비 4.5:1 이상이다.
const ELEMENT_THEMES = [
  { name: "목", accent: "#5ea882", soft: "rgba(94, 168, 130, 0.16)", deep: "#16352a" },
  { name: "화", accent: "#c96a6a", soft: "rgba(201, 106, 106, 0.16)", deep: "#4a1420" },
  { name: "토", accent: "#c9a227", soft: "rgba(201, 162, 39, 0.16)", deep: "#3d2a12" },
  { name: "금", accent: "#b9b3a6", soft: "rgba(185, 179, 166, 0.14)", deep: "#2e2b2c" },
  { name: "수", accent: "#7f86c4", soft: "rgba(127, 134, 196, 0.18)", deep: "#241f3d" },
];

function buildSeasonCountdown(targetYear: number) {
  if (!Number.isInteger(targetYear)) return "";
  const now = new Date();
  const janFirst = new Date(targetYear, 0, 1);
  if (now < janFirst) {
    const days = Math.ceil((janFirst.getTime() - now.getTime()) / 86400000);
    return `${targetYear}년 새해까지 D-${days}`;
  }
  if (now.getFullYear() === targetYear) {
    const yearEnd = new Date(targetYear + 1, 0, 1);
    const percent = Math.min(99, Math.max(1, Math.round(((now.getTime() - janFirst.getTime()) / (yearEnd.getTime() - janFirst.getTime())) * 100)));
    return `${targetYear}년의 ${percent}%를 지나는 중`;
  }
  return `${targetYear}년의 흐름을 되짚어 봅니다`;
}

const TIMING_LABELS: Record<string, string> = { 기회: "기회", 주의: "주의", 정비: "정비" };

function quarterSummaries(rows: MonthlyFlowRow[]) {
  return [0, 1, 2, 3].map((quarter) => {
    const months = rows.filter((row) => Math.floor((row.month - 1) / 3) === quarter);
    const count = (timing: string) => months.filter((row) => row.timing === timing).length;
    const opportunity = months.filter((row) => row.timing === "기회").map((row) => `${row.month}월`);
    return {
      quarter: quarter + 1,
      range: `${quarter * 3 + 1}~${quarter * 3 + 3}월`,
      opportunity: count("기회"),
      caution: count("주의"),
      maintain: count("정비"),
      highlight: opportunity.length ? `${opportunity.join("·")} 기회` : count("주의") ? "속도 조절 구간" : "정비 흐름",
    };
  });
}

const DOMAIN_ORDER: { key: keyof MonthlyDomains; label: string; glyph: string }[] = [
  { key: "overall", label: "총운", glyph: "✦" },
  { key: "money", label: "재물", glyph: "◈" },
  { key: "love", label: "애정", glyph: "❤" },
  { key: "career", label: "직업", glyph: "▲" },
  { key: "health", label: "건강", glyph: "✚" },
];
const DOMAIN_LEVEL_CLASS: Record<string, string> = { 강: "strong", 중: "mid", 약: "weak" };

function MonthDomainCards({ domains }: { domains: MonthlyDomains }) {
  const copy = useNewYearAiCopy();
  const cards = DOMAIN_ORDER.map((item) => ({ ...item, signal: domains[item.key] })).filter((item) => item.signal);
  if (!cards.length) return null;
  return (
    <div className="nyai-domain-grid" role="list" aria-label={copy.monthDomainGridAria}>
      {cards.map(({ key, label, glyph, signal }) => {
        const level = signal?.level || "중";
        return (
          <div className="nyai-domain-card" role="listitem" key={key}>
            <div className="nyai-domain-top">
              <span className="nyai-domain-glyph" aria-hidden="true">{glyph}</span>
              <span className="nyai-domain-label">{label}</span>
              <span className={`nyai-domain-level nyai-domain-level--${DOMAIN_LEVEL_CLASS[level] || "mid"}`}>{level}</span>
            </div>
            <div
              className={`nyai-domain-bar nyai-domain-bar--${DOMAIN_LEVEL_CLASS[level] || "mid"}`}
              role="img"
              aria-label={`${label} ${level}`}
            >
              <i />
            </div>
            {signal?.basis ? <p className="nyai-domain-basis">{signal.basis}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function MonthlyFlowCalendar({ rows, letters }: { rows: MonthlyFlowRow[]; letters: Map<number, MonthLetter> }) {
  const copy = useNewYearAiCopy();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  if (rows.length !== 12) return null;
  const selected = selectedMonth ? rows.find((row) => row.month === selectedMonth) : null;
  const selectedLetter = selected ? letters.get(selected.month) : null;
  return (
    <section className="nyai-month-calendar" data-pdf-section="monthly-calendar" aria-label={copy.monthCalendarAria}>
      <div className="nyai-month-head">
        <strong>12개월 운세 캘린더</strong>
        <span>달을 누르면 총운·재물·애정·직업·건강과 그 달의 조언이 열립니다</span>
      </div>
      <div className="nyai-quarter-row">
        {quarterSummaries(rows).map((item) => (
          <div className="nyai-quarter-card" key={item.quarter}>
            <span>{item.quarter}분기 · {item.range}</span>
            <strong>{item.highlight}</strong>
            <small>기회 {item.opportunity} · 주의 {item.caution} · 정비 {item.maintain}</small>
          </div>
        ))}
      </div>
      <div className="nyai-month-grid" role="list">
        {rows.map((row) => (
          <button
            type="button"
            role="listitem"
            key={row.month}
            className={`nyai-month-cell nyai-month-cell--${row.timing === "기회" ? "opportunity" : row.timing === "주의" ? "caution" : "maintain"}${selectedMonth === row.month ? " is-selected" : ""}`}
            onClick={() => setSelectedMonth(selectedMonth === row.month ? null : row.month)}
            aria-label={`${row.month}월 ${row.pillar} ${row.timing}`}
            aria-pressed={selectedMonth === row.month}
          >
            <strong>{row.month}월</strong>
            <span>{row.pillar}</span>
            <small>{TIMING_LABELS[row.timing] || row.timing}</small>
          </button>
        ))}
      </div>
      {selected ? (
        <div className="nyai-month-detail">
          <strong>{selected.month}월 · {selected.pillar} ({selected.element})</strong>
          <p className="nyai-month-meta">십신 {selected.tenGod || "미산출"} — {selected.domain || "생활 리듬 조정"}. {selected.relationToDayBranch}</p>
          {selected.domains ? (
            <MonthDomainCards domains={selected.domains} />
          ) : null}
          {selectedLetter?.body ? (
            <div className="nyai-month-letter">
              <span className="nyai-month-letter-label">{selected.month}월 조언 편지</span>
              <AiResultProse value={selectedLetter.body} />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="nyai-month-hint">색은 계산된 판정입니다 — 밝은 칸은 기회, 붉은 칸은 주의, 회색 칸은 정비의 달.</p>
      )}
    </section>
  );
}

// SNS 공유 카드 (1080×1350) — 캔버스 직접 드로잉, 외부 요청 없음
async function drawShareCard(options: {
  year: number;
  ganziHanja: string;
  ganziKo: string;
  name: string;
  rows: MonthlyFlowRow[];
  theme: { accent: string; deep: string };
}) {
  const { year, ganziHanja, ganziKo, name, rows, theme } = options;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("share canvas unavailable");

  // 공유 카드도 페이지와 같은 칠흑·버건디 베이스에 앤틱 골드·옥색을 쓴다.
  // 세운 오행색(theme.deep)은 중간 정지점에만 남겨 해마다 다른 결을 유지한다.
  const gradient = context.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, "#100609");
  gradient.addColorStop(0.55, theme.deep);
  gradient.addColorStop(1, "#0a0507");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1080, 1350);

  context.strokeStyle = "#c9a227";
  context.lineWidth = 3;
  context.strokeRect(48, 48, 1080 - 96, 1350 - 96);
  context.strokeStyle = "rgba(201, 162, 39, 0.4)";
  context.lineWidth = 1;
  context.strokeRect(62, 62, 1080 - 124, 1350 - 124);

  context.textAlign = "center";
  context.fillStyle = "#cbb49f";
  context.font = "600 44px 'Noto Sans KR', sans-serif";
  context.fillText("신년운세 전문가 상담", 540, 200);

  context.fillStyle = "#c9a227";
  context.font = "800 220px 'Nanum Myeongjo', 'Noto Serif KR', serif";
  context.fillText(ganziHanja, 540, 560);

  context.fillStyle = "#f2e6d8";
  context.font = "800 88px 'Nanum Myeongjo', 'Noto Serif KR', serif";
  context.fillText(`${year} ${ganziKo}년`, 540, 700);

  if (name) {
    context.fillStyle = "#e3c46a";
    context.font = "600 52px 'Noto Sans KR', sans-serif";
    context.fillText(`${name}님의 새해 흐름`, 540, 800);
  }

  const opportunity = rows.filter((row) => row.timing === "기회").map((row) => `${row.month}월`).slice(0, 4);
  const caution = rows.filter((row) => row.timing === "주의").map((row) => `${row.month}월`).slice(0, 4);
  context.font = "600 46px 'Noto Sans KR', sans-serif";
  context.fillStyle = "#6fb79f";
  context.fillText(opportunity.length ? `기회의 달 · ${opportunity.join(" ")}` : "기회의 달을 함께 찾아드립니다", 540, 950);
  context.fillStyle = "#e08a8a";
  context.fillText(caution.length ? `쉬어갈 달 · ${caution.join(" ")}` : "무리하지 않는 리듬이 열쇠", 540, 1030);

  context.fillStyle = "#cbb49f";
  context.font = "500 38px 'Noto Sans KR', sans-serif";
  context.fillText("code-destiny.com", 540, 1230);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("share blob failed"))), "image/png");
  });
}

// 이 블록에서 --nyai-accent(세운 오행색)는 월별 캘린더 안쪽에서만 쓴다.
// 페이지 전반의 강조는 앤틱 골드(--nyai-gold-*)와 옥색(--nyai-jade-*)으로 고정한다.
const NYAI_SEASON_CSS = `
.nyai-ganzi-chip {
  display: inline-block;
  margin-top: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-family: var(--nyai-serif);
  font-style: normal;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--nyai-gold-bright);
  background: var(--nyai-gold-veil);
  border: 1px solid var(--nyai-gold-dim);
}

.nyai-countdown {
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--nyai-gold-bright);
}

.nyai-year-field > span {
  display: block;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 6px;
}

.nyai-year-chips {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.nyai-year-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: var(--nyai-radius-pill, 999px);
  border: 1px solid var(--nyai-gold-hair);
  background: rgba(42, 16, 24, 0.55);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.nyai-year-chip small {
  font-size: 11px;
  color: var(--nyai-text-dim);
}

.nyai-year-chip.is-active {
  border-color: var(--nyai-gold);
  background: var(--nyai-gold-veil);
}

.nyai-year-field input {
  margin-top: 8px;
  width: 100%;
}

.nyai-result-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.nyai-month-calendar {
  border: 1px solid var(--nyai-gold-hair);
  border-radius: 16px;
  padding: 14px;
  background: rgba(16, 6, 9, 0.62);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nyai-month-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
}

.nyai-month-head strong {
  font-family: var(--nyai-serif);
  font-size: 15px;
  color: var(--nyai-gold-bright);
}

.nyai-month-head span {
  font-size: 11px;
  color: var(--nyai-text-dim);
}

.nyai-quarter-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.nyai-quarter-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px;
  border-radius: 10px;
  background: rgba(242, 230, 216, 0.05);
  border: 1px solid var(--nyai-gold-hair);
}

.nyai-quarter-card span { font-size: 10px; color: var(--nyai-text-dim); }
/* 세운 오행색 유지 구역 — 분기 요약과 아래 월별 칸이 그 해의 기운을 색으로 전달한다. */
.nyai-quarter-card strong { font-size: 12px; color: var(--nyai-accent, #c9a227); }
.nyai-quarter-card small { font-size: 10px; color: var(--nyai-text-dim); }

.nyai-month-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.nyai-month-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
  min-height: 44px;
  padding: 10px 9px;
  border-radius: 12px;
  border: 1px solid var(--nyai-gold-hair);
  background: rgba(242, 230, 216, 0.04);
  color: inherit;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.2s ease;
}

.nyai-month-cell strong { font-size: 13px; }
.nyai-month-cell span { font-family: var(--nyai-serif); font-size: 12px; color: var(--nyai-text-dim); }
.nyai-month-cell small { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; }

/* 기회 칸은 그 해 세운의 오행색을 그대로 입는다(정보 전달 + 해마다 다른 시즌 아이덴티티). */
.nyai-month-cell--opportunity {
  border-color: var(--nyai-accent, #c9a227);
  background: var(--nyai-accent-soft, rgba(201, 162, 39, 0.16));
}
.nyai-month-cell--opportunity small { color: var(--nyai-accent, #c9a227); }

.nyai-month-cell--caution {
  border-color: rgba(224, 138, 138, 0.5);
  background: rgba(150, 40, 55, 0.24);
}
.nyai-month-cell--caution small { color: var(--nyai-danger); }

.nyai-month-cell--maintain {
  border-color: rgba(203, 180, 159, 0.28);
  background: rgba(203, 180, 159, 0.08);
}
.nyai-month-cell--maintain small { color: var(--nyai-text-dim); }

.nyai-month-cell.is-selected {
  transform: translateY(-2px);
  border-width: 2px;
}

.nyai-month-detail {
  border-radius: 12px;
  border: 1px dashed var(--nyai-gold-dim);
  padding: 10px 12px;
}

.nyai-month-detail strong {
  font-family: var(--nyai-serif);
  font-size: 14px;
  color: var(--nyai-accent, #c9a227);
}

.nyai-month-detail p {
  margin: 4px 0 0;
  font-size: 12.5px;
  line-height: 1.72;
  color: var(--nyai-text);
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.nyai-month-hint {
  margin: 0;
  font-size: 11px;
  color: var(--nyai-text-dim);
}

.nyai-month-meta {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--nyai-text-dim);
}

.nyai-domain-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}

.nyai-domain-card {
  border-radius: 12px;
  border: 1px solid var(--nyai-gold-hair);
  background: rgba(242, 230, 216, 0.04);
  padding: 9px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nyai-domain-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nyai-domain-glyph { font-size: 12px; color: var(--nyai-text-dim); }
.nyai-domain-label { font-size: 12.5px; font-weight: 700; }
.nyai-domain-level {
  margin-left: auto;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 1px 7px;
  border-radius: 999px;
}
.nyai-domain-level--strong { color: var(--nyai-accent, #c9a227); background: var(--nyai-accent-soft, rgba(201, 162, 39, 0.16)); }
.nyai-domain-level--mid { color: var(--nyai-text); background: rgba(242, 230, 216, 0.1); }
.nyai-domain-level--weak { color: var(--nyai-text-dim); background: rgba(203, 180, 159, 0.1); }

.nyai-domain-bar {
  height: 5px;
  border-radius: 999px;
  background: rgba(242, 230, 216, 0.1);
  overflow: hidden;
}
.nyai-domain-bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
}
.nyai-domain-bar--strong i { width: 100%; background: var(--nyai-accent, #c9a227); }
.nyai-domain-bar--mid i { width: 60%; background: rgba(242, 230, 216, 0.42); }
.nyai-domain-bar--weak i { width: 32%; background: rgba(203, 180, 159, 0.4); }

.nyai-domain-basis {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.62;
  color: var(--nyai-text-dim);
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.nyai-month-letter {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--nyai-gold-hair);
  display: grid;
  gap: 6px;
}

.nyai-month-letter-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--nyai-accent, #c9a227);
}

.nyai-question-answer {
  border: 1px solid var(--nyai-jade);
  border-radius: var(--nyai-radius-md, 16px);
  padding: 16px;
  background: var(--nyai-jade-veil);
  display: grid;
  gap: 10px;
}

/* 인용 부호를 대신하는 조판 규칙 — 카드 장식 띠가 아니라 사용자가 남긴 말의 표시다. */
.nyai-qa-question {
  margin: 0;
  padding: 0.1em 0 0.1em 1em;
  border-left: 2px solid var(--nyai-jade);
  font-family: var(--nyai-serif);
  font-size: 15.5px;
  font-weight: 700;
  line-height: 1.7;
  color: var(--nyai-text);
}

.nyai-letter-accordion {
  border: 1px solid var(--nyai-gold-hair);
  border-radius: var(--nyai-radius-md, 16px);
  padding: 14px;
  background: rgba(16, 6, 9, 0.62);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nyai-letter-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.nyai-letter-card {
  grid-column: span 1;
  border-radius: var(--nyai-radius-md, 16px);
  border: 1px solid var(--nyai-gold-hair);
  background: rgba(242, 230, 216, .04);
}

.nyai-letter-card[open] {
  grid-column: 1 / -1;
  border-color: var(--nyai-gold-dim);
}

.nyai-letter-card summary {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  min-height: 44px;
  padding: 10px 12px;
  cursor: pointer;
  list-style: none;
}

.nyai-letter-card summary::-webkit-details-marker { display: none; }

.nyai-letter-month {
  font-family: var(--nyai-serif);
  font-size: 14px;
  font-weight: 900;
}

.nyai-letter-ganji {
  font-family: var(--nyai-serif);
  font-size: 11px;
  color: var(--nyai-text-dim);
}

.nyai-letter-keyword {
  font-size: 12px;
  font-weight: 700;
  color: var(--nyai-gold-bright);
  flex-basis: 100%;
}

.nyai-letter-card[open] .nyai-letter-keyword {
  flex-basis: auto;
}

.nyai-letter-body {
  padding: 0 12px 14px;
  font-size: 13.5px;
  line-height: 1.8;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.nyai-recent-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.nyai-recent-list > strong {
  font-size: 12px;
  color: var(--nyai-gold-bright);
}

.nyai-recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--nyai-gold-hair);
  background: rgba(42, 16, 24, 0.5);
  color: inherit;
  cursor: pointer;
  font-size: 13px;
  transition: border-color 0.2s ease;
}

.nyai-recent-item:hover {
  border-color: var(--nyai-gold);
}

.nyai-recent-item small { color: var(--nyai-text-dim); }

@media (max-width: 720px) {
  .nyai-quarter-row { grid-template-columns: repeat(2, 1fr); }
  .nyai-month-grid { grid-template-columns: repeat(3, 1fr); }
  .nyai-year-chips { grid-template-columns: 1fr 1fr; }
  .nyai-letter-grid { grid-template-columns: repeat(2, 1fr); }
  .nyai-report-details > summary { padding: 14px; }
  .nyai-report-body { padding: 14px 14px 16px; font-size: 15px; }
  .nyai-progress-steps li { font-size: 12.5px; }
}
`;

const NYAI_READING_ROOM_CSS = `
.nyai-page .nyai-intro {
  position: relative;
  isolation: isolate;
  min-height: 318px;
  overflow: hidden;
  border-color: rgba(227, 196, 106, .34);
  background: #15080c;
  box-shadow: 0 22px 56px rgba(0, 0, 0, .42), inset 0 1px 0 rgba(255, 240, 202, .1);
}

.nyai-page .nyai-intro-art {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(21, 8, 12, .98) 0%, rgba(21, 8, 12, .84) 46%, rgba(21, 8, 12, .16) 100%),
    url('/fuctionassets/new-year-almanac-v1.webp') center / cover no-repeat;
}

.nyai-page .nyai-intro > :not(.nyai-intro-art) { position: relative; z-index: 1; }
.nyai-page .nyai-intro-copy { max-width: 56ch; align-self: center; }
.nyai-page .nyai-intro .nyai-eyebrow { color: #e9c983; letter-spacing: .14em; }
.nyai-page .nyai-intro h1 { color: #fff3db; font-size: clamp(2rem, 4vw, 3.4rem); letter-spacing: -.02em; }
.nyai-page .nyai-intro .nyai-consult-card {
  align-self: stretch;
  background: rgba(17, 8, 12, .76);
  border-color: rgba(227, 196, 106, .25);
  backdrop-filter: blur(10px);
}
.nyai-page .nyai-workspace { align-items: start; }
.nyai-page :is(.nyai-form, .nyai-chat) {
  border-color: rgba(227, 196, 106, .24);
  box-shadow: 0 18px 42px rgba(0, 0, 0, .28), inset 0 1px 0 rgba(255, 240, 202, .08);
}
.nyai-page .nyai-primary {
  min-height: 52px;
  border-radius: 14px;
  background: #e4c274;
  color: #24120e;
  box-shadow: 0 12px 28px rgba(201, 162, 39, .18);
}
.nyai-page .nyai-primary:hover { background: #f2d68e; transform: translateY(-1px); }
.nyai-page .nyai-category-chip.is-active,
.nyai-page .nyai-year-chip.is-active { border-color: rgba(242, 214, 142, .72); background: rgba(227, 196, 106, .14); }
.nyai-page .nyai-message,
.nyai-page .nyai-month-calendar,
.nyai-page .nyai-report-details { border-color: rgba(227, 196, 106, .22); background-color: rgba(17, 8, 12, .68); }
@media (max-width: 720px) {
  .nyai-page .nyai-intro { min-height: 0; }
  .nyai-page .nyai-intro-art { background-position: 68% center; }
  .nyai-page .nyai-intro-copy { padding-top: 54px; }
}
@media (prefers-reduced-motion: reduce) {
  .nyai-page .nyai-primary { transition: none; }
  .nyai-page .nyai-primary:hover { transform: none; }
}
`;

export default function NewYearAiConsultationPage() {
  const copy = useNewYearAiCopy();
  const [form, setForm] = useState<ConsultationForm>(() => buildInitialForm());
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [accessType, setAccessType] = useState<AccessType | "">("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [serverSections, setServerSections] = useState<ConsultationSection[]>([]);
  const [readingProgress, setReadingProgress] = useState(0);
  const [sajuProfile, setSajuProfile] = useState<SajuProfile | null>(null);
  const [monthlyFlow, setMonthlyFlow] = useState<MonthlyFlowRow[]>([]);
  const [targetYearInfo, setTargetYearInfo] = useState<TargetYearInfo | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [showCustomYear, setShowCustomYear] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const startLockRef = useRef(false);
  const idempotencyKeyRef = useRef(createIdempotencyKey());
  const resultRef = useRef<HTMLDivElement | null>(null);
  const { seed: profileSeed, seedVersion, reload: reloadProfileSeed } = useAiProfileSeed();
  const formTouchedRef = useRef(false);

  // 서버에서 프로필 카드가 뒤늦게 도착해도, 사용자가 입력을 시작하기 전이라면 폼에 반영
  useEffect(() => {
    if (!profileSeed) return;
    setForm((prev) => (formTouchedRef.current ? prev : applyProfileSeedToForm(prev, profileSeed)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedVersion]);

  function loadFormFromProfileCard() {
    void reloadProfileSeed().then((seed) => {
      if (seed) setForm((prev) => applyProfileSeedToForm(prev, seed));
    });
  }

  const applyResult = useCallback((result: ConsultationResult) => {
    setAccessType(result.accessType || "");
    setMessages(Array.isArray(result.messages) ? result.messages : []);
    setServerSections(Array.isArray(result.sections) ? result.sections : []);
    setReadingProgress(100);
    setSajuProfile(result.sajuProfile || null);
    setMonthlyFlow(Array.isArray(result.monthlyFlow) ? result.monthlyFlow : []);
    setTargetYearInfo(result.targetYear || null);
    setNotice("");
    setError("");
    setStatus("ready");
    if (result.sessionId && typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("sid", result.sessionId);
        window.history.replaceState(null, "", url.toString());
      } catch {
        // URL 갱신 실패는 무시
      }
    }
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/new-year-ai/result?sessionId=${encodeURIComponent(sessionId)}`, { credentials: "include" });
      const result = await response.json().catch(() => ({})) as ConsultationResult;
      if (result.ok && Array.isArray(result.messages) && result.messages.length) {
        applyResult({ ...result, sessionId });
        return true;
      }
    } catch {
      // 재열람 실패는 조용히 무시 — 새 상담은 그대로 시작 가능
    }
    return false;
  }, [applyResult]);

  // 재열람: ?sid= 복원 + 지난 상담 목록
  useEffect(() => {
    let cancelled = false;
    const sid = new URLSearchParams(window.location.search).get("sid");
    if (sid) void loadSession(sid);
    (async () => {
      try {
        const response = await fetch("/api/new-year-ai/result", { credentials: "include" });
        if (!response.ok) return;
        const data = await response.json().catch(() => ({}));
        if (!cancelled && Array.isArray(data?.sessions)) setRecentSessions(data.sessions);
      } catch {
        // 목록 조회 실패는 무시
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusText = useMemo(() => {
    if (status === "preparing") return "상담을 준비하고 있습니다";
    if (status === "payment") return "결제창을 확인해 주세요";
    if (status === "reading") return "새해의 기운을 읽는 중...";
    if (status === "ready") return "새해의 답장이 도착했습니다";
    return "새해 상담소가 조용히 열려 있습니다";
  }, [status]);

  const isBusy = status === "preparing" || status === "payment" || status === "reading";
  const selectedFocusOption = useMemo(
    () => getFocusOption(form.focusArea),
    [form.focusArea],
  );
  const assistantMessages = useMemo(() => messages.filter((message) => message.role === "assistant"), [messages]);
  const userQuestionText = useMemo(() => messages.find((message) => message.role === "user")?.content || "", [messages]);
  const [placeholderTick, setPlaceholderTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setPlaceholderTick((tick) => tick + 1), 2800);
    return () => window.clearInterval(timer);
  }, []);

  // 서버는 진행률을 알려주지 않는다(생성이 waitUntil 백그라운드에서 돌고 클라는 /result만 폴링).
  // 그래서 진행바는 경과 시간의 함수이며 상한 92%에 수렴한다 — 100%는 결과가 실제로 도착했을 때만.
  useEffect(() => {
    if (status !== "reading") return undefined;
    const startedAt = Date.now();
    setReadingProgress(readingProgressFromElapsed(0));
    const timer = window.setInterval(() => {
      setReadingProgress(readingProgressFromElapsed(Date.now() - startedAt));
    }, 250);
    return () => window.clearInterval(timer);
  }, [status]);

  const resetAttempt = useCallback(() => {
    if (isBusy) return;
    idempotencyKeyRef.current = createIdempotencyKey();
    setAccessType("");
    setMessages([]);
    setServerSections([]);
    setReadingProgress(0);
    setSajuProfile(null);
    setMonthlyFlow([]);
    setTargetYearInfo(null);
    setError("");
    setNotice("");
    setStatus("idle");
  }, [isBusy]);

  const updateField = (field: keyof ConsultationForm) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    formTouchedRef.current = true;
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    resetAttempt();
  };

  const selectFocusArea = useCallback((value: FocusAreaType) => {
    formTouchedRef.current = true;
    setForm((prev) => ({
      ...prev,
      focusArea: value,
      question: !prev.question.trim() || FOCUS_AREA_OPTIONS.some((option) => option.prompt === prev.question)
        ? FOCUS_AREA_OPTIONS.find((option) => option.value === value)?.prompt || ""
        : prev.question,
    }));
    resetAttempt();
  }, [resetAttempt]);

  const startConsultation = useCallback(async (
    payload: ReturnType<typeof buildConsultationPayload>,
    idempotencyKey: string,
    access: { accessToken?: string; billingGate?: Record<string, unknown> },
  ) => {
    setStatus("reading");
    const { payload: result } = await postJson<ConsultationResult>("/api/new-year-ai/start", {
      ...payload,
      ...access,
    }, idempotencyKey);

    if (result.ok && Array.isArray(result.messages) && result.messages.length) {
      applyResult(result);
      return;
    }
    if (result.ok && result.status === "generating" && result.sessionId) {
      // 생성이 진행 중 — 결과 엔드포인트를 폴링해 완료까지 수렴시킨다(이전에는 여기서 멈춰 영구 대기였다).
      setNotice(result.message || "올해의 흐름을 읽고 있습니다");
      setStatus("reading");
      const resolved = await pollNewYearResult(result.sessionId);
      if (resolved.ok && Array.isArray(resolved.messages) && resolved.messages.length) {
        applyResult(resolved);
        return;
      }
      throw new Error(resolved.message || LLM_ERROR_MESSAGE);
    }
    if (result.reason === "PAYMENT_VERIFY_FAILED") throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
    if (result.reason === "LLM_ERROR") throw new Error(LLM_ERROR_MESSAGE);
    throw new Error(result.message || SERVER_ERROR_MESSAGE);
  }, [applyResult]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (startLockRef.current || isBusy) return;
    const previewState = readDevPreviewState();
    if (previewState) {
      setStatus("reading");
      const preview = buildNewYearPreviewPayload(previewState);
      if (preview.ok && Array.isArray(preview.messages) && preview.messages.length) {
        applyResult(preview as ConsultationResult);
      } else {
        setError(preview.message || LLM_ERROR_MESSAGE);
        setStatus("error");
      }
      return;
    }
    const validationMessage = validateConsultationForm(form);
    if (validationMessage) {
      setNotice("");
      setError(validationMessage);
      setStatus("error");
      return;
    }
    startLockRef.current = true;
    const idempotencyKey = idempotencyKeyRef.current;
    const payload = {
      ...buildConsultationPayload(form),
      requestId: idempotencyKey,
    };
    let paymentAttempted = false;
    setError("");
    setNotice("");
    setStatus("preparing");
    beginPaidFeatureGateCheck({
      featureKey: FEATURE_KEY,
      requestId: idempotencyKey,
      title: "이용권 확인",
      reason: "신년운세 전문가 상담",
      paymentMode: "MEMBERSHIP_PASS",
    });
    // 이용권 판정(unlock-status)을 아래 ensure-access 왕복과 겹쳐 돌린다 — 결제 게이트가 같은 키로 재사용해 직렬 왕복이 1회 준다.
    void primePaymentEligibility(buildBillingGateInput({}, idempotencyKey));

    try {
      const { payload: access } = await postJson<EnsureAccessResult>("/api/new-year-ai/ensure-access", payload, idempotencyKey);
      if (access.ok) {
        completePaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId: idempotencyKey,
          title: "이용권 확인 완료",
          reason: "신년운세 전문가 상담",
          paymentMode: "MEMBERSHIP_PASS",
          message: "이용권 확인이 끝났습니다. 새해의 흐름을 읽고 있습니다.",
        });
        await startConsultation(payload, idempotencyKey, { accessToken: access.accessToken });
        return;
      }
      const denied = access as Exclude<EnsureAccessResult, { ok: true }>;
      if (denied.reason === "LOGIN_REQUIRED") {
        throw new Error(LOGIN_REQUIRED_MESSAGE);
      }
      // 이용권 확인 앞단의 일시 장애(degraded)면 dead-end 대신 결제창(단건+월정석)을 연다(요구사항: 확인 실패 시 무조건 결제창).
      const passGateDegraded = (denied as Record<string, unknown>).retryable === true || String(denied.reason) === "DB_DEGRADED";
      if (denied.reason === "PAYMENT_REQUIRED" || passGateDegraded) {
        paymentAttempted = true;
        setNotice(PAYMENT_REQUIRED_MESSAGE);
        setStatus("payment");
        const paymentPayload = "paymentPayload" in denied ? denied.paymentPayload : {};
        const billingInput = buildBillingGateInput(asRecord(paymentPayload), idempotencyKey);
        const gate = await runBillingCoinGate(billingInput);
        if (!gate.ok || !gate.data) {
          const code = String(gate.error?.code || "").toUpperCase();
          if (code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED") throw new Error(LOGIN_REQUIRED_MESSAGE);
          if (code === "PAYMENT_CANCELLED") throw new Error(PAYMENT_CANCELLED_MESSAGE);
          throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
        }
        await startConsultation(payload, idempotencyKey, { billingGate: gate.data as Record<string, unknown> });
        return;
      }
      throw new Error("message" in denied ? denied.message || SERVER_ERROR_MESSAGE : SERVER_ERROR_MESSAGE);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : SERVER_ERROR_MESSAGE;
      const paymentCancelled = message === PAYMENT_CANCELLED_MESSAGE;
      setError(
        message === LOGIN_REQUIRED_MESSAGE
          || message === PAYMENT_VERIFY_FAILED_MESSAGE
          || message === PAYMENT_CANCELLED_MESSAGE
          || message === LLM_ERROR_MESSAGE
          ? message
          : paymentAttempted
            ? PAYMENT_VERIFY_FAILED_MESSAGE
          : message.includes("payment")
            ? PAYMENT_VERIFY_FAILED_MESSAGE
            : message || SERVER_ERROR_MESSAGE,
      );
      setStatus("error");
      failPaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId: idempotencyKey,
        title: "이용권 확인 실패",
        reason: "신년운세 전문가 상담",
        paymentMode: "MEMBERSHIP_PASS",
        message,
        cancelled: paymentCancelled,
      });
    } finally {
      startLockRef.current = false;
    }
  };

  const handleDownloadPdf = useCallback(async () => {
    if (!resultRef.current || !assistantMessages.length || isDownloading) return;
    setIsDownloading(true);
    setNotice("");
    setError("");
    // 등장 애니메이션은 뷰포트에 들어온 카드만 불투명하게 만든다. 스크롤하지 않고 바로 저장하면
    // 화면 밖 카드가 opacity:0 인 채로 캡처돼 빈 페이지가 된다 — 내보내는 동안만 강제로 드러낸다.
    const messagesNode = resultRef.current;
    messagesNode.classList.add("is-exporting");
    try {
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      const safeName = (form.userName.trim() || "new-year").replace(/[\\/:*?"<>|]/g, "_");
      await exportResultPdf({
        captureTargets: [".nyai-messages [data-pdf-section]"],
        fileName: `신년운세_전문가상담_${safeName}_${form.targetYear}.pdf`,
        backgroundColor: "#170b0f",
        cover: {
          title: `${form.userName || "당신"}님의 ${form.targetYear}년 신년운세`,
          name: form.userName,
          date: new Date().toISOString().slice(0, 10),
        },
      });
    } catch {
      setError("PDF 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      messagesNode.classList.remove("is-exporting");
      setIsDownloading(false);
    }
  }, [assistantMessages.length, form.targetYear, form.userName, isDownloading]);

  // 시즌 아이덴티티: 상담 연도의 간지·오행 테마
  const seasonYear = Number(targetYearInfo?.year || form.targetYear);
  const ganzi = useMemo(() => yearGanzi(seasonYear), [seasonYear]);
  const seasonTheme = ELEMENT_THEMES[ganzi?.elementIndex ?? 2] || ELEMENT_THEMES[2];
  const seasonCountdown = useMemo(() => buildSeasonCountdown(seasonYear), [seasonYear]);
  const themeVars = {
    "--nyai-accent": seasonTheme.accent,
    "--nyai-accent-soft": seasonTheme.soft,
    "--nyai-accent-deep": seasonTheme.deep,
  } as CSSProperties;
  const currentYear = new Date().getFullYear();

  const selectTargetYear = useCallback((year: number) => {
    formTouchedRef.current = true;
    setForm((prev) => ({ ...prev, targetYear: String(year) }));
    resetAttempt();
  }, [resetAttempt]);

  const handleShareCard = useCallback(async () => {
    if (!assistantMessages.length || isSharing || !ganzi) return;
    setIsSharing(true);
    setError("");
    try {
      const blob = await drawShareCard({
        year: seasonYear,
        ganziHanja: ganzi.hanja,
        ganziKo: ganzi.ko,
        name: form.userName.trim(),
        rows: monthlyFlow,
        theme: seasonTheme,
      });
      const fileName = `신년운세_${seasonYear}_${ganzi.ko}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${seasonYear} ${ganzi.ko}년 신년운세`,
          text: `${seasonYear} ${ganzi.ko}년, 나의 새해 흐름을 확인했어요.`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      }
    } catch (caught) {
      if ((caught as Error)?.name !== "AbortError") {
        setError("공유 카드를 만드는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setIsSharing(false);
    }
  }, [assistantMessages.length, form.userName, ganzi, isSharing, monthlyFlow, seasonTheme, seasonYear]);

  return (
    <main className="nyai-page" style={themeVars} data-season-element={seasonTheme.name}>
      <section className="nyai-panel nyai-intro" aria-label={copy.introSectionAria}>
        <div className="nyai-intro-art" aria-hidden="true" />
        <div className="nyai-orbit" aria-hidden="true" />
        <div className="nyai-consult-card" aria-label={copy.consultCardAria}>
          <span className="nyai-eyebrow">상담 대상자 요약</span>
          <div className="nyai-consult-year">
            <span>상담 연도</span>
            <strong>{form.targetYear || "미정"}</strong>
            {ganzi ? (
              <em className="nyai-ganzi-chip" aria-label={`${seasonYear}년 간지 ${ganzi.ko}년`}>
                {ganzi.hanja} · {ganzi.ko}년 ({ganzi.animal}띠)
              </em>
            ) : null}
          </div>
          <div className="nyai-consult-rows">
            <span><b>집중 흐름</b>{selectedFocusOption.label}</span>
            <span><b>이름</b>{form.userName.trim() || "아직 비어 있습니다"}</span>
            <span><b>생년월일</b>{form.birthDate || "아직 비어 있습니다"}</span>
            <span><b>상태</b>{statusText}</span>
          </div>
        </div>
        <div className="nyai-intro-copy">
          <span className="nyai-eyebrow">서비스 소개</span>
          <h2><Moon size={20} aria-hidden="true" /> 신년운세 전문가 상담</h2>
          <p>새해의 기운이 당신에게 건네는 첫 번째 조언을 명식과 세운의 흐름으로 차분히 살펴드립니다.</p>
          <div className="nyai-hero-badges" aria-label={copy.heroBadgesAria}>
            <span>사주 원국</span>
            <span>세운 분석</span>
            <span>월별 흐름</span>
            <span>행동 전략</span>
          </div>
          <div className="nyai-status" data-status={status}>
            {isBusy && <Loader2 size={16} className="nyai-spin" />}
            {!isBusy && <Sparkles size={16} />}
            <span>{statusText}</span>
          </div>
          {seasonCountdown && <p className="nyai-countdown">{seasonCountdown}</p>}
          {accessType && <p className="nyai-access">이용 방식: {accessType}</p>}
        </div>
      </section>

      <section className="nyai-workspace">
        <form className="nyai-form nyai-panel" onSubmit={handleSubmit}>
          <div className="nyai-form-title">
            <CalendarDays size={18} />
            <h2>새해 상담에 필요한 정보를 알려주세요</h2>
            <button
              type="button"
              className="nyai-profile-load"
              onClick={loadFormFromProfileCard}
              aria-label={copy.profileLoadAria}
            >
              프로필 카드에서 불러오기
            </button>
          </div>
          <div className="nyai-grid">
            <label>
              이름 또는 닉네임
              <input value={form.userName} onChange={updateField("userName")} placeholder="예: 하린" maxLength={80} />
            </label>
            <label>
              성별
              <select value={form.gender} onChange={updateField("gender")} required>
                <option value="">선택</option>
                <option value="female">여성</option>
                <option value="male">남성</option>
                <option value="unknown">비공개</option>
              </select>
            </label>
            <label>
              생년월일
              <input {...birthDateTextInputProps(form.birthDate, (nextBirthDate) => { formTouchedRef.current = true; setForm((prev) => ({ ...prev, birthDate: nextBirthDate })); resetAttempt(); })} required />
            </label>
            <label>
              출생시간
              <input type="time" value={form.birthTime} onChange={updateField("birthTime")} />
            </label>
            <label>
              양력/음력
              <select value={form.calendarType} onChange={updateField("calendarType")} required>
                <option value="solar">양력</option>
                <option value="lunar">음력</option>
              </select>
            </label>
            <div className="nyai-year-field">
              <span>상담 연도</span>
              <div className="nyai-year-chips" role="radiogroup" aria-label={copy.yearChipsAria}>
                {[currentYear, currentYear + 1].map((year) => {
                  const chipGanzi = yearGanzi(year);
                  const isActive = Number(form.targetYear) === year && !showCustomYear;
                  return (
                    <button
                      type="button"
                      key={year}
                      className={`nyai-year-chip${isActive ? " is-active" : ""}`}
                      role="radio"
                      aria-checked={isActive}
                      disabled={isBusy}
                      onClick={() => {
                        setShowCustomYear(false);
                        selectTargetYear(year);
                      }}
                    >
                      <strong>{year === currentYear ? "올해" : "내년"} {year}</strong>
                      {chipGanzi ? <small>{chipGanzi.ko}년 · {chipGanzi.animal}띠</small> : null}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`nyai-year-chip${showCustomYear ? " is-active" : ""}`}
                  role="radio"
                  aria-checked={showCustomYear}
                  disabled={isBusy}
                  onClick={() => setShowCustomYear(true)}
                >
                  <strong>다른 연도</strong>
                  <small>직접 입력</small>
                </button>
              </div>
              {showCustomYear && (
                <input
                  type="number"
                  value={form.targetYear}
                  min="1900"
                  max="2100"
                  onChange={updateField("targetYear")}
                  aria-label={copy.yearInputAria}
                  required
                />
              )}
            </div>
          </div>
          <div className="nyai-focus-panel">
            <div className="nyai-focus-head">
              <strong>더 깊게 보고 싶은 흐름</strong>
              <span>{selectedFocusOption.label}</span>
            </div>
            <div className="nyai-category-grid" role="radiogroup" aria-label={copy.categoryGridAria}>
              {FOCUS_AREA_OPTIONS.map((option) => (
                <button
                  type="button"
                  className={`nyai-category-chip${form.focusArea === option.value ? " is-active" : ""}`}
                  key={option.value}
                  onClick={() => selectFocusArea(option.value)}
                  role="radio"
                  aria-checked={form.focusArea === option.value}
                  disabled={isBusy}
                >
                  <span>{option.glyph}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="nyai-question-card">
            <div className="nyai-question-head">
              <strong>이 질문에 최우선으로 답해드립니다</strong>
              <span>구체적으로 적을수록 더 정확한 답변을 받을 수 있어요</span>
            </div>
            <label className="nyai-topic">
              명리학자에게 맡길 질문
              <textarea
                value={form.question}
                onChange={updateField("question")}
                placeholder={QUESTION_PLACEHOLDER_EXAMPLES[placeholderTick % QUESTION_PLACEHOLDER_EXAMPLES.length]}
                minLength={form.focusArea === "custom" ? 2 : undefined}
                maxLength={1000}
                required={form.focusArea === "custom"}
              />
            </label>
          </div>
          {notice && <p className="nyai-notice">{notice}</p>}
          {error && <p className="nyai-error">{error}</p>}
          <div className="flex items-center justify-end">
            <PriceBadge featureKey="new-year-ai-consultation" prefix="상담 이용 가격 " />
          </div>
          <button className="nyai-primary" type="submit" disabled={isBusy}>
            {isBusy ? <Loader2 size={18} className="nyai-spin" /> : <WalletCards size={18} />}
            <span>{isBusy ? statusText : "신년운세 전문가 상담 받기"}</span>
          </button>
        </form>

        <section className="nyai-chat nyai-panel" aria-live="polite">
          <div className="nyai-chat-head">
            <div className="nyai-chat-title">
              <Sparkles size={18} />
              <h2>새해의 첫 번째 답장</h2>
            </div>
            {assistantMessages.length > 0 && (
              <div className="nyai-result-actions">
                <button className="nyai-pdf-button" type="button" onClick={() => void handleShareCard()} disabled={isSharing} aria-label={copy.shareCardAria}>
                  {isSharing ? <Loader2 size={16} className="nyai-spin" /> : <Share2 size={16} />}
                  <span>{isSharing ? "카드 생성 중" : "공유 카드"}</span>
                </button>
                <button className="nyai-pdf-button" type="button" onClick={handleDownloadPdf} disabled={isDownloading}>
                  {isDownloading ? <Loader2 size={16} className="nyai-spin" /> : <Download size={16} />}
                  <span>{isDownloading ? "저장 중" : "PDF 저장"}</span>
                </button>
              </div>
            )}
          </div>
          <div className="nyai-messages" ref={resultRef}>
            {status === "reading" ? <ReadingProgressPanel percent={readingProgress} /> : null}
            {assistantMessages.length === 0 ? (
              status === "reading" ? null : (
              <div className="nyai-empty">
                <p>아직 새해의 첫 문장이 열리지 않았습니다.</p>
                <span>생년월일과 궁금한 흐름을 남기면, 원국과 세운이 맞물리는 지점부터 차분히 짚어드립니다.</span>
                {recentSessions.length > 0 && (
                  <div className="nyai-recent-list" aria-label={copy.recentListAria}>
                    <strong>지난 상담 다시 보기</strong>
                    {recentSessions.map((session) => (
                      <button
                        type="button"
                        key={session.sessionId}
                        className="nyai-recent-item"
                        onClick={() => void loadSession(session.sessionId)}
                      >
                        <span>{session.year ? `${session.year}년` : "신년운세"}{session.pillar ? ` ${session.pillar}` : ""}</span>
                        <small>{session.name || "무기명"}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              )
            ) : assistantMessages.map((message, index) => {
              const sections = splitAssistantSections(message.content);
              const classified = classifySections(sections);
              const showQuestionCard = index === 0
                && Boolean(classified.questionAnswer)
                && isGenuineCustomQuestion(userQuestionText);
              // 서버 구조화 응답이 있으면 그대로, 없으면(구버전 세션) 조립본을 분야로 되돌린다.
              const domainBodies = buildDomainBodies(index === 0 ? serverSections : [], classified.domains);
              const hasDomainCards = DOMAIN_CARDS.some((card) => domainBodies.get(card.key));
              return (
                <div className="nyai-result-bundle" key={`${message.role}-${index}`}>
                  {showQuestionCard && (
                    <RevealBlock index={0}>
                      <NewYearQuestionAnswerCard
                        name={form.userName.trim()}
                        question={userQuestionText}
                        answer={classified.questionAnswer?.body || ""}
                      />
                    </RevealBlock>
                  )}
                  {index === 0 && (
                    <RevealBlock index={1}>
                      <SajuProfilePanel profile={sajuProfile} />
                    </RevealBlock>
                  )}
                  <DomainConsultationCards bodies={domainBodies} />
                  {index === 0 && (
                    <RevealBlock index={4}>
                      <MonthlyFlowCalendar rows={monthlyFlow} letters={classified.monthLetters} />
                    </RevealBlock>
                  )}
                  {index === 0 && (
                    <RevealBlock index={5}>
                      <MonthlyLetterAccordion rows={monthlyFlow} letters={classified.monthLetters} />
                    </RevealBlock>
                  )}
                  {/* 분야 카드가 하나도 만들어지지 않은 예외 상황(파싱 실패)에서만 원문 편지를 그대로 보인다 — 결제한 본문을 잃지 않는다. */}
                  {!hasDomainCards && (
                    <article className="nyai-message nyai-message--assistant">
                      <span>새해 상담 편지</span>
                      <AssistantMessageContent content={message.content} sections={classified.restSections} />
                    </article>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </section>

      <style>{NYAI_SEASON_CSS}</style>
      <style>{NYAI_READING_ROOM_CSS}</style>
      <style>{`
        .nyai-page {
          /* 오리엔탈 하이엔드 팔레트 — 칠흑·딥 버건디 베이스에 앤틱 골드와 옥색.
             세운 오행 액센트(--nyai-accent)는 월별 캘린더 안에서만 소비한다. */
          --nyai-ink-0: #100609;
          --nyai-ink-1: #1c0c12;
          --nyai-ink-2: #2a1018;
          --nyai-gold: #c9a227;
          --nyai-gold-bright: #e3c46a;
          --nyai-gold-dim: rgba(201, 162, 39, .34);
          --nyai-gold-hair: rgba(201, 162, 39, .2);
          --nyai-gold-veil: rgba(201, 162, 39, .1);
          --nyai-jade: #4a8f7b;
          --nyai-jade-bright: #6fb79f;
          --nyai-jade-veil: rgba(74, 143, 123, .14);
          --nyai-text: #f2e6d8;
          --nyai-text-dim: #cbb49f;
          --nyai-danger: #e08a8a;
          --nyai-radius-md: 16px;
          --nyai-radius-pill: 999px;
          --nyai-label-size: 0.78rem;
          --nyai-serif: var(--font-serif, "Nanum Myeongjo", "Gowun Batang", "Noto Serif KR", Georgia, serif);
          min-height: 100vh;
          padding: clamp(18px, 3vw, 42px);
          color: var(--nyai-text);
          background:
            radial-gradient(circle at 14% 10%, rgba(201, 162, 39, .16), transparent 30%),
            radial-gradient(circle at 86% 12%, rgba(96, 20, 38, .42), transparent 36%),
            radial-gradient(circle at 74% 88%, rgba(74, 143, 123, .12), transparent 34%),
            linear-gradient(150deg, var(--nyai-ink-0) 0%, var(--nyai-ink-2) 34%, var(--nyai-ink-1) 66%, #0a0507 100%);
          font-family: var(--font-body, CodeDestinyBody), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          line-height: 1.78;
          position: relative;
          overflow-x: hidden;
        }

        /* 창호지 격자 — 밝기를 낮춰 텍스트 대비를 갉아먹지 않게 한다. */
        .nyai-page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: .16;
          background:
            linear-gradient(90deg, rgba(201, 162, 39, .1) 1px, transparent 1px),
            linear-gradient(0deg, rgba(201, 162, 39, .07) 1px, transparent 1px),
            radial-gradient(circle at 30% 20%, rgba(201, 162, 39, .26) 0 1px, transparent 2px);
          background-size: 46px 46px, 46px 46px, 104px 104px;
          mix-blend-mode: soft-light;
        }

        .nyai-page h1,
        .nyai-page h2,
        .nyai-page h3 {
          font-family: var(--nyai-serif);
          font-weight: 700;
          word-break: keep-all;
          overflow-wrap: anywhere;
        }

        .nyai-panel {
          border: 1px solid var(--nyai-gold-hair);
          border-radius: var(--nyai-radius-md);
          background:
            linear-gradient(180deg, rgba(201, 162, 39, .07), rgba(28, 12, 18, .82)),
            repeating-linear-gradient(135deg, rgba(242, 230, 216, .022) 0 1px, transparent 1px 13px),
            rgba(16, 6, 9, .9);
          box-shadow: 0 18px 44px rgba(0, 0, 0, .42), inset 0 1px 0 rgba(227, 196, 106, .12);
          backdrop-filter: blur(16px);
        }

        /* 등장 연출. 화면 밖 카드는 opacity:0 이라 PDF 캡처 직전 강제로 드러내야 한다.
           display:contents 로 두면 박스가 사라져 opacity·transform이 먹지 않으므로 block 을 유지한다. */
        .nyai-reveal {
          display: block;
          min-width: 0;
        }

        .nyai-messages.is-exporting .nyai-reveal,
        .nyai-messages.is-exporting .nyai-reveal > * {
          opacity: 1 !important;
          transform: none !important;
        }

        .nyai-progress {
          display: grid;
          gap: 12px;
          padding: 18px;
          border: 1px solid var(--nyai-gold-dim);
          border-radius: var(--nyai-radius-md);
          background:
            linear-gradient(180deg, rgba(201, 162, 39, .09), rgba(16, 6, 9, .6)),
            rgba(28, 12, 18, .78);
        }

        .nyai-progress-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
        }

        .nyai-progress-head strong {
          font-family: var(--nyai-serif);
          font-size: 16px;
          color: var(--nyai-gold-bright);
        }

        .nyai-progress-head span {
          font-size: 13px;
          font-variant-numeric: tabular-nums;
          color: var(--nyai-text-dim);
        }

        .nyai-progress-track {
          height: 6px;
          border-radius: var(--nyai-radius-pill);
          background: rgba(242, 230, 216, .1);
          overflow: hidden;
        }

        .nyai-progress-track i {
          display: block;
          height: 100%;
          border-radius: var(--nyai-radius-pill);
          background: linear-gradient(90deg, var(--nyai-jade), var(--nyai-gold) 62%, var(--nyai-gold-bright));
          transition: width .35s cubic-bezier(.16, 1, .3, 1);
        }

        .nyai-progress-steps {
          display: grid;
          gap: 6px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .nyai-progress-steps li {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 7px 10px;
          border: 1px solid transparent;
          border-radius: 10px;
          color: var(--nyai-text-dim);
          font-size: 13px;
          transition: color .3s ease, border-color .3s ease, background .3s ease;
        }

        .nyai-progress-steps li.is-active {
          border-color: var(--nyai-gold-dim);
          background: var(--nyai-gold-veil);
          color: var(--nyai-text);
        }

        .nyai-progress-steps li.is-done {
          color: var(--nyai-jade-bright);
        }

        .nyai-progress-glyph {
          display: inline-grid;
          place-items: center;
          width: 22px;
          height: 22px;
          flex-shrink: 0;
          border: 1px solid var(--nyai-gold-hair);
          border-radius: 50%;
          font-family: var(--nyai-serif);
          font-size: 12px;
        }

        .nyai-progress-steps li.is-active .nyai-progress-glyph {
          border-color: var(--nyai-gold);
          color: var(--nyai-gold-bright);
        }

        .nyai-progress-steps li.is-done .nyai-progress-glyph {
          border-color: var(--nyai-jade);
          color: var(--nyai-jade-bright);
        }

        .nyai-progress-note {
          margin: 0;
          font-size: 12px;
          line-height: 1.6;
          color: var(--nyai-text-dim);
        }

        .nyai-domain-report {
          display: grid;
          gap: 12px;
        }

        .nyai-report-card {
          border: 1px solid var(--nyai-gold-hair);
          border-radius: var(--nyai-radius-md);
          background:
            linear-gradient(180deg, rgba(201, 162, 39, .07), rgba(16, 6, 9, .5)),
            rgba(28, 12, 18, .7);
          overflow: hidden;
        }

        .nyai-report-details > summary {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px 16px;
          cursor: pointer;
          list-style: none;
        }

        .nyai-report-details > summary::-webkit-details-marker {
          display: none;
        }

        .nyai-report-glyph {
          display: inline-grid;
          place-items: center;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border: 1px solid var(--nyai-gold-dim);
          border-radius: 10px;
          background: var(--nyai-gold-veil);
          color: var(--nyai-gold-bright);
          font-family: var(--nyai-serif);
          font-size: 19px;
        }

        .nyai-report-heading {
          display: grid;
          gap: 2px;
          min-width: 0;
        }

        .nyai-report-heading strong {
          font-family: var(--nyai-serif);
          font-size: 17px;
          color: var(--nyai-gold-bright);
        }

        .nyai-report-heading small {
          font-size: 12px;
          color: var(--nyai-text-dim);
        }

        .nyai-report-details[open] > summary {
          border-bottom: 1px solid var(--nyai-gold-hair);
        }

        .nyai-report-body {
          padding: 15px 16px 18px;
          font-size: 14.5px;
          line-height: 1.82;
          color: var(--nyai-text);
        }

        .nyai-report-body p {
          margin: 0;
          max-width: 66ch;
          word-break: keep-all;
          overflow-wrap: anywhere;
        }

        .nyai-report-body p + p {
          margin-top: 12px;
        }

        .nyai-report-body strong {
          color: var(--nyai-gold-bright);
        }

        .nyai-intro {
          display: grid;
          grid-template-columns: minmax(210px, 340px) minmax(0, 1fr);
          gap: clamp(18px, 4vw, 46px);
          align-items: center;
          max-width: 1180px;
          margin: 0 auto clamp(18px, 3vw, 30px);
          padding: clamp(16px, 3vw, 30px);
          position: relative;
          overflow: hidden;
        }

        .nyai-intro::before,
        .nyai-intro::after {
          content: "";
          position: absolute;
          pointer-events: none;
        }

        .nyai-intro::before {
          inset: 12px;
          border: 1px solid var(--nyai-gold-hair);
          border-radius: 8px;
        }

        .nyai-intro::after {
          width: 190px;
          height: 190px;
          right: -46px;
          top: -54px;
          border-radius: 50%;
          background:
            radial-gradient(circle, rgba(201, 162, 39, .34) 0 2px, transparent 3px),
            conic-gradient(from 20deg, transparent 0 18deg, rgba(201, 162, 39, .16) 18deg 24deg, transparent 24deg 48deg);
          background-size: 24px 24px, 100% 100%;
          opacity: .62;
        }

        .nyai-orbit {
          position: absolute;
          width: 118px;
          height: 118px;
          right: 32px;
          bottom: 28px;
          border: 1px solid var(--nyai-gold-dim);
          border-radius: 50%;
          box-shadow: inset 0 0 0 12px rgba(201, 162, 39, .04);
          animation: nyaiSpin 16s linear infinite;
          pointer-events: none;
        }

        .nyai-orbit::before,
        .nyai-orbit::after {
          content: "";
          position: absolute;
          border-radius: 50%;
          background: var(--nyai-gold);
        }

        .nyai-orbit::before {
          width: 7px;
          height: 7px;
          left: 12px;
          top: 14px;
        }

        .nyai-orbit::after {
          width: 4px;
          height: 4px;
          right: 20px;
          bottom: 18px;
        }

        .nyai-eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .08em;
          color: var(--nyai-text-dim);
        }

        .nyai-consult-card {
          position: relative;
          z-index: 1;
          display: grid;
          align-content: start;
          gap: 14px;
          min-height: 300px;
          overflow: hidden;
          padding: 18px;
          border: 1px solid var(--nyai-gold-hair);
          border-radius: var(--nyai-radius-md, 16px);
          background: rgba(42, 16, 24, .42);
        }

        .nyai-consult-year span {
          display: block;
          color: var(--nyai-text-dim);
          font-size: var(--nyai-label-size, 0.78rem);
          font-weight: 900;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .nyai-consult-year strong {
          display: block;
          margin-top: 8px;
          color: var(--nyai-gold-bright);
          font-family: var(--nyai-serif);
          font-size: clamp(44px, 6vw, 72px);
          line-height: 1;
          letter-spacing: 0;
        }

        .nyai-consult-rows {
          display: grid;
          gap: 8px;
        }

        .nyai-consult-rows span {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 34px;
          padding: 8px 10px;
          border: 1px solid var(--nyai-gold-hair);
          border-radius: 8px;
          background: rgba(242, 230, 216, .05);
          color: var(--nyai-text);
          font-size: 13px;
          font-weight: 800;
        }

        .nyai-consult-rows b {
          color: var(--nyai-text-dim);
          font-size: 12px;
        }

        .nyai-intro-copy h2 {
          display: flex;
          align-items: center;
          gap: 10px;
          max-width: 780px;
          margin: 8px 0 12px;
          font-family: var(--nyai-serif);
          font-size: clamp(34px, 5vw, 66px);
          line-height: 1.14;
          letter-spacing: 0;
          color: var(--nyai-gold-bright);
          text-shadow: 0 12px 34px rgba(0, 0, 0, .5);
        }

        .nyai-intro-copy h2 svg {
          flex-shrink: 0;
          width: 0.6em;
          height: 0.6em;
        }

        .nyai-intro-copy p {
          max-width: 62ch;
          margin: 0;
          color: var(--nyai-text-dim);
          font-size: 16px;
          line-height: 1.78;
          word-break: keep-all;
          overflow-wrap: anywhere;
        }

        .nyai-hero-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
        }

        .nyai-hero-badges span {
          min-height: 28px;
          padding: 6px 10px;
          border: 1px solid var(--nyai-gold-hair);
          border-radius: 8px;
          background: var(--nyai-gold-veil);
          color: var(--nyai-gold-bright);
          font-size: 12px;
          font-weight: 800;
        }

        .nyai-status,
        .nyai-form-title,
        .nyai-chat-title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .nyai-status {
          margin-top: 18px;
          min-height: 34px;
          padding: 8px 10px;
          border-radius: 8px;
          background: var(--nyai-gold-veil);
          color: var(--nyai-gold-bright);
          font-size: 14px;
          border: 1px solid var(--nyai-gold-hair);
        }

        .nyai-access {
          margin-top: 8px !important;
          font-size: 13px !important;
          color: var(--nyai-jade-bright) !important;
        }

        .nyai-workspace {
          display: grid;
          grid-template-columns: minmax(300px, 440px) minmax(0, 1fr);
          gap: clamp(16px, 3vw, 28px);
          max-width: 1180px;
          margin: 0 auto;
        }

        .nyai-form,
        .nyai-chat {
          padding: clamp(16px, 2.6vw, 24px);
        }

        .nyai-form-title,
        .nyai-chat-head {
          margin-bottom: 16px;
          color: var(--nyai-gold-bright);
        }

        .nyai-chat-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .nyai-form-title h2,
        .nyai-chat-head h2 {
          margin: 0;
          font-size: 18px;
          letter-spacing: 0;
        }

        .nyai-form-title {
          display: flex;
        }

        .nyai-form-title h2 {
          min-width: 0;
          flex: 1;
        }

        .nyai-profile-load {
          flex-shrink: 0;
          min-height: 32px;
          padding: 5px 10px;
          border: 1px solid var(--nyai-gold-dim);
          border-radius: 8px;
          background: var(--nyai-gold-veil);
          color: var(--nyai-gold-bright);
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .nyai-pdf-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-width: 108px;
          min-height: 36px;
          padding: 0 11px;
          border: 1px solid var(--nyai-gold-dim);
          border-radius: 8px;
          background: var(--nyai-gold-veil);
          color: var(--nyai-text);
          font: inherit;
          font-size: 13px;
          font-weight: 850;
          cursor: pointer;
        }

        .nyai-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .nyai-form label {
          display: grid;
          gap: 7px;
          color: var(--nyai-text);
          font-size: var(--nyai-label-size, 0.78rem);
          font-weight: 700;
        }

        .nyai-form input,
        .nyai-form select,
        .nyai-form textarea {
          width: 100%;
          border: 1px solid var(--nyai-gold-hair);
          border-radius: 8px;
          background: rgba(242, 230, 216, .06);
          color: var(--nyai-text);
          font: inherit;
          outline: none;
        }

        .nyai-form input:focus,
        .nyai-form select:focus,
        .nyai-form textarea:focus {
          border-color: var(--nyai-gold);
          box-shadow: 0 0 0 3px rgba(201, 162, 39, .18);
        }

        .nyai-form input,
        .nyai-form select {
          min-height: 44px;
          padding: 0 12px;
        }

        .nyai-form select option {
          color: #141922;
        }

        .nyai-focus-panel {
          display: grid;
          gap: 10px;
          margin-top: 12px;
          padding: 12px;
          border: 1px solid var(--nyai-gold-hair);
          border-radius: 8px;
          background: rgba(16, 6, 9, .4);
        }

        .nyai-focus-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: var(--nyai-text-dim);
          font-size: 13px;
        }

        .nyai-focus-head span {
          color: var(--nyai-gold-bright);
          font-weight: 900;
        }

        .nyai-category-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .nyai-category-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 40px;
          padding: 0 12px;
          border: 1px solid var(--nyai-gold-hair);
          border-radius: var(--nyai-radius-pill);
          background: rgba(242, 230, 216, .04);
          color: var(--nyai-text-dim);
          font: inherit;
          font-size: 13px;
          font-weight: 850;
          cursor: pointer;
          transition: border-color .15s ease, background .15s ease, color .15s ease, box-shadow .15s ease;
        }

        .nyai-category-chip span {
          display: inline-grid;
          place-items: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: radial-gradient(circle at 32% 24%, #e8d29a, var(--nyai-gold) 58%, #6d5512);
          color: #180a0d;
          font-family: var(--nyai-serif);
          font-size: 12px;
          font-weight: 900;
        }

        .nyai-category-chip.is-active {
          border-color: var(--nyai-gold);
          background: rgba(201, 162, 39, .2);
          color: var(--nyai-text);
          font-weight: 900;
          box-shadow: 0 0 0 3px rgba(201, 162, 39, .14), 0 0 18px rgba(201, 162, 39, .18);
        }

        .nyai-question-card {
          margin-top: 14px;
          padding: 14px;
          border: 1px solid var(--nyai-jade);
          border-radius: var(--nyai-radius-md);
          background: var(--nyai-jade-veil);
        }

        .nyai-question-head {
          display: grid;
          gap: 3px;
          margin-bottom: 10px;
        }

        .nyai-question-head strong {
          font-family: var(--nyai-serif);
          font-size: 15px;
          color: var(--nyai-jade-bright);
        }

        .nyai-question-head span {
          font-size: var(--nyai-label-size, 0.78rem);
          color: var(--nyai-text-dim);
        }

        .nyai-topic {
          margin-top: 0;
        }

        .nyai-form textarea {
          min-height: 168px;
          padding: 12px;
          resize: vertical;
          line-height: 1.6;
        }

        .nyai-notice,
        .nyai-error {
          margin: 14px 0 0;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.55;
        }

        .nyai-notice {
          color: var(--nyai-gold-bright);
          background: var(--nyai-gold-veil);
          border: 1px solid var(--nyai-gold-hair);
        }

        .nyai-error {
          color: var(--nyai-danger);
          background: rgba(96, 20, 38, .34);
          border: 1px solid rgba(224, 138, 138, .28);
        }

        .nyai-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 48px;
          border: 0;
          border-radius: var(--nyai-radius-pill);
          color: #1a0c05;
          background: linear-gradient(135deg, #e8d29a, var(--nyai-gold) 52%, #d9b545);
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(0, 0, 0, .38);
          transition: box-shadow .15s ease, transform .15s ease;
        }

        .nyai-primary:hover:not(:disabled),
        .nyai-primary:focus-visible:not(:disabled) {
          box-shadow: 0 0 0 3px rgba(201, 162, 39, .3), 0 12px 28px rgba(0, 0, 0, .45);
        }

        .nyai-primary {
          width: 100%;
          margin-top: 16px;
        }

        .nyai-primary:disabled,
        .nyai-category-chip:disabled,
        .nyai-pdf-button:disabled {
          cursor: not-allowed;
          opacity: .62;
        }

        .nyai-chat {
          min-height: 560px;
          display: flex;
          flex-direction: column;
        }

        .nyai-messages {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 12px;
          overflow: auto;
          padding-right: 4px;
        }

        .nyai-empty {
          display: grid;
          place-content: center;
          min-height: 330px;
          text-align: center;
          color: var(--nyai-text-dim);
        }

        .nyai-empty p {
          margin: 0 0 8px;
          color: var(--nyai-gold-bright);
          font-family: var(--nyai-serif);
          font-size: 18px;
          font-weight: 800;
        }

        .nyai-empty span {
          font-size: 14px;
        }

        .nyai-message {
          max-width: 100%;
          padding: 14px 15px;
          border-radius: 8px;
          white-space: pre-wrap;
          line-height: 1.72;
        }

        .nyai-result-bundle {
          display: grid;
          gap: 12px;
        }

        .nyai-saju-profile {
          padding: 15px;
          border: 1px solid rgba(74, 143, 123, .34);
          border-radius: var(--nyai-radius-md);
          background:
            linear-gradient(180deg, rgba(74, 143, 123, .12), rgba(16, 6, 9, .5)),
            rgba(22, 34, 31, .5);
          color: var(--nyai-text);
          line-height: 1.7;
        }

        .nyai-saju-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
          color: var(--nyai-jade-bright);
        }

        .nyai-saju-head strong {
          font-family: var(--nyai-serif);
          font-size: 15px;
        }

        .nyai-saju-head span,
        .nyai-saju-birth {
          color: var(--nyai-text-dim);
          font-size: 12px;
        }

        .nyai-saju-birth {
          margin-bottom: 10px;
        }

        .nyai-pillar-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 10px;
        }

        .nyai-pillar {
          display: grid;
          gap: 4px;
          min-height: 58px;
          place-items: center;
          border: 1px solid var(--nyai-gold-hair);
          border-radius: 8px;
          background: rgba(242, 230, 216, .05);
        }

        .nyai-pillar span,
        .nyai-saju-facts span {
          color: var(--nyai-text-dim);
          font-size: 12px;
        }

        .nyai-pillar strong {
          color: var(--nyai-gold-bright);
          font-family: var(--nyai-serif);
          font-size: 19px;
        }

        .nyai-saju-facts {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 10px;
        }

        .nyai-saju-facts span {
          padding: 5px 8px;
          border-radius: 8px;
          background: rgba(242, 230, 216, .06);
        }

        .nyai-saju-reading {
          display: grid;
          gap: 7px;
        }

        .nyai-saju-reading p {
          margin: 0;
          color: var(--nyai-text);
          font-size: 13px;
          line-height: 1.75;
          word-break: keep-all;
          overflow-wrap: anywhere;
        }

        .nyai-message span {
          display: block;
          margin-bottom: 7px;
          color: var(--nyai-gold-bright);
          font-size: 12px;
          font-weight: 800;
        }

        .nyai-message p {
          margin: 0;
          color: var(--nyai-text);
        }

        .nyai-message--assistant {
          align-self: flex-start;
          background: rgba(242, 230, 216, .05);
          border: 1px solid var(--nyai-gold-hair);
        }

        .nyai-message--user {
          align-self: flex-end;
          background: rgba(42, 16, 24, .5);
          border: 1px solid var(--nyai-gold-hair);
        }

        .nyai-section-list {
          display: grid;
          gap: 10px;
        }

        .nyai-result-section {
          padding: 15px;
          border: 1px solid var(--nyai-gold-hair);
          border-radius: var(--nyai-radius-md);
          background:
            linear-gradient(180deg, rgba(201, 162, 39, .06), rgba(16, 6, 9, .4)),
            rgba(42, 16, 24, .4);
        }

        .nyai-result-section h3 {
          margin: 0 0 8px;
          color: var(--nyai-gold-bright);
          font-family: var(--nyai-serif);
          font-size: 16px;
          line-height: 1.4;
          letter-spacing: 0;
        }

        .nyai-result-section p {
          margin: 0;
          max-width: 66ch;
          line-height: 1.82;
          word-break: keep-all;
          overflow-wrap: anywhere;
          white-space: pre-line;
        }

        .nyai-result-section p + p {
          margin-top: 10px;
        }

        .nyai-spin {
          animation: nyaiSpin 1s linear infinite;
        }

        @keyframes nyaiSpin {
          to { transform: rotate(360deg); }
        }


        /* 결과 화면 가로 넘침 차단. 전역 overflow-x:clip 이라 넘친 내용은 가로 스크롤바 없이 그냥 잘린다 —
           ① 암시적 1열 그리드의 min-content 바닥을 0 으로 내리고
           ② 자동 최소폭에 밀리는 아이템을 풀고
           ③ 줄바꿈 불가한 긴 런을 끊는다(keep-all 단독은 못 끊고 break-word 는 min-content 를 안 줄인다). */
        .nyai-month-letter,
        .nyai-question-answer,
        .nyai-progress,
        .nyai-progress-steps,
        .nyai-domain-report,
        .nyai-report-heading,
        .nyai-consult-card,
        .nyai-consult-rows,
        .nyai-focus-panel,
        .nyai-question-head,
        .nyai-result-bundle,
        .nyai-saju-reading,
        .nyai-section-list,
        .nyai-form label {
          grid-template-columns: minmax(0, 1fr);
        }

        .nyai-messages,
        .nyai-result-bundle,
        .nyai-intro-copy,
        .nyai-consult-card,
        .nyai-result-section,
        .nyai-question-answer,
        .nyai-message {
          min-width: 0;
        }

        .nyai-eyebrow,
        .nyai-qa-question,
        .nyai-qa-answer,
        .nyai-qa-answer p,
        .nyai-saju-birth,
        .nyai-message p,
        .nyai-report-heading strong {
          overflow-wrap: anywhere;
        }
        @media (max-width: 860px) {
          .nyai-page {
            padding: 12px;
          }

          .nyai-intro,
          .nyai-workspace {
            grid-template-columns: minmax(0, 1fr);
          }

          .nyai-consult-card {
            min-height: auto;
          }

          .nyai-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .nyai-chat {
            min-height: 460px;
          }

          .nyai-pillar-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .nyai-saju-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .nyai-report-heading strong {
            font-size: 16px;
          }

          .nyai-progress {
            padding: 15px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .nyai-orbit {
            animation: none;
          }

          .nyai-progress-track i {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}
