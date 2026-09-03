"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SukuyoCalendarDay, SukuyoCalendarMonth } from "@/lib/sukuyo-calendar";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type CalendarResponse = SukuyoCalendarMonth & {
  ok?: boolean;
  error?: string;
};

type SukuyoCalendarCopy = {
  calendarShellAria: string;
  monthSelectAria: string;
  prevMonthAria: string;
  nextMonthAria: string;
  legendAria: string;
  detailAria: string;
  dayFortuneTitlePrefix: string;
  coreTitle: string;
  usagePointTitle: string;
  cautionTitle: string;
  loveTitle: string;
  workMoneyTitle: string;
  adviceTitle: string;
};

const SUKUYO_CALENDAR_EN: SukuyoCalendarCopy = {
  calendarShellAria: "27 Sukuyo Calendar",
  monthSelectAria: "Select month",
  prevMonthAria: "Previous month",
  nextMonthAria: "Next month",
  legendAria: "Calendar legend",
  detailAria: "Sukuyo flow for the selected date",
  dayFortuneTitlePrefix: "My Fortune — ",
  coreTitle: "Core Nature of the Mansion",
  usagePointTitle: "Today's Key Point",
  cautionTitle: "What to Watch",
  loveTitle: "Love & Relationships",
  workMoneyTitle: "Work & Money",
  adviceTitle: "Today's Advice",
};

const SUKUYO_CALENDAR_COPY: Partial<Record<LoadingLocale, SukuyoCalendarCopy>> = {
  ko: {
    calendarShellAria: "27숙 달력",
    monthSelectAria: "월 선택",
    prevMonthAria: "이전 달",
    nextMonthAria: "다음 달",
    legendAria: "달력 범례",
    detailAria: "선택한 날짜의 숙요 흐름",
    dayFortuneTitlePrefix: "나의 길흉 — ",
    coreTitle: "숙의 핵심 성향",
    usagePointTitle: "오늘 사용 포인트",
    cautionTitle: "주의할 결",
    loveTitle: "연애와 관계",
    workMoneyTitle: "일과 금전",
    adviceTitle: "오늘의 조언",
  },
  en: SUKUYO_CALENDAR_EN,
  ja: {
    calendarShellAria: "27宿カレンダー",
    monthSelectAria: "月を選択",
    prevMonthAria: "前の月",
    nextMonthAria: "次の月",
    legendAria: "カレンダーの凡例",
    detailAria: "選択した日の宿曜の流れ",
    dayFortuneTitlePrefix: "私の吉凶 — ",
    coreTitle: "宿の核心的な性質",
    usagePointTitle: "今日使うポイント",
    cautionTitle: "注意すべき点",
    loveTitle: "恋愛と関係",
    workMoneyTitle: "仕事とお金",
    adviceTitle: "今日のアドバイス",
  },
  "zh-CN": {
    calendarShellAria: "27宿日历",
    monthSelectAria: "选择月份",
    prevMonthAria: "上个月",
    nextMonthAria: "下个月",
    legendAria: "日历图例",
    detailAria: "所选日期的宿曜运势",
    dayFortuneTitlePrefix: "我的吉凶 — ",
    coreTitle: "宿的核心性质",
    usagePointTitle: "今日要点",
    cautionTitle: "需要注意的地方",
    loveTitle: "爱情与关系",
    workMoneyTitle: "工作与金钱",
    adviceTitle: "今日建议",
  },
  "zh-TW": {
    calendarShellAria: "27宿日曆",
    monthSelectAria: "選擇月份",
    prevMonthAria: "上個月",
    nextMonthAria: "下個月",
    legendAria: "日曆圖例",
    detailAria: "所選日期的宿曜運勢",
    dayFortuneTitlePrefix: "我的吉凶 — ",
    coreTitle: "宿的核心性質",
    usagePointTitle: "今日要點",
    cautionTitle: "需要注意的地方",
    loveTitle: "愛情與關係",
    workMoneyTitle: "工作與金錢",
    adviceTitle: "今日建議",
  },
  vi: {
    calendarShellAria: "Lịch 27 Sao (Sukuyo)",
    monthSelectAria: "Chọn tháng",
    prevMonthAria: "Tháng trước",
    nextMonthAria: "Tháng sau",
    legendAria: "Chú giải lịch",
    detailAria: "Vận sao ngày đã chọn",
    dayFortuneTitlePrefix: "Vận may của tôi — ",
    coreTitle: "Bản chất cốt lõi của sao",
    usagePointTitle: "Điểm cần lưu ý hôm nay",
    cautionTitle: "Điều cần thận trọng",
    loveTitle: "Tình yêu và các mối quan hệ",
    workMoneyTitle: "Công việc và tiền bạc",
    adviceTitle: "Lời khuyên hôm nay",
  },
  hi: {
    calendarShellAria: "27 सुकुयो कैलेंडर",
    monthSelectAria: "महीना चुनें",
    prevMonthAria: "पिछला महीना",
    nextMonthAria: "अगला महीना",
    legendAria: "कैलेंडर लीजेंड",
    detailAria: "चयनित तिथि का सुकुयो प्रवाह",
    dayFortuneTitlePrefix: "मेरा भाग्य — ",
    coreTitle: "मंज़िल की मूल प्रकृति",
    usagePointTitle: "आज का मुख्य बिंदु",
    cautionTitle: "सावधानी बरतें",
    loveTitle: "प्रेम और रिश्ते",
    workMoneyTitle: "काम और पैसा",
    adviceTitle: "आज की सलाह",
  },
  es: {
    calendarShellAria: "Calendario de 27 Sukuyo",
    monthSelectAria: "Seleccionar mes",
    prevMonthAria: "Mes anterior",
    nextMonthAria: "Mes siguiente",
    legendAria: "Leyenda del calendario",
    detailAria: "Flujo de Sukuyo del día seleccionado",
    dayFortuneTitlePrefix: "Mi fortuna — ",
    coreTitle: "Naturaleza esencial de la mansión",
    usagePointTitle: "Punto clave de hoy",
    cautionTitle: "Qué tener en cuenta",
    loveTitle: "Amor y relaciones",
    workMoneyTitle: "Trabajo y dinero",
    adviceTitle: "Consejo de hoy",
  },
  fr: {
    calendarShellAria: "Calendrier des 27 Sukuyo",
    monthSelectAria: "Sélectionner le mois",
    prevMonthAria: "Mois précédent",
    nextMonthAria: "Mois suivant",
    legendAria: "Légende du calendrier",
    detailAria: "Flux Sukuyo de la date sélectionnée",
    dayFortuneTitlePrefix: "Ma fortune — ",
    coreTitle: "Nature essentielle de la demeure",
    usagePointTitle: "Point clé du jour",
    cautionTitle: "À surveiller",
    loveTitle: "Amour et relations",
    workMoneyTitle: "Travail et argent",
    adviceTitle: "Conseil du jour",
  },
  de: {
    calendarShellAria: "27-Sukuyo-Kalender",
    monthSelectAria: "Monat auswählen",
    prevMonthAria: "Vorheriger Monat",
    nextMonthAria: "Nächster Monat",
    legendAria: "Kalenderlegende",
    detailAria: "Sukuyo-Verlauf des gewählten Tages",
    dayFortuneTitlePrefix: "Mein Glück — ",
    coreTitle: "Kernwesen des Mondhauses",
    usagePointTitle: "Wichtiger Punkt heute",
    cautionTitle: "Worauf zu achten ist",
    loveTitle: "Liebe und Beziehungen",
    workMoneyTitle: "Arbeit und Geld",
    adviceTitle: "Ratschlag für heute",
  },
  nl: {
    calendarShellAria: "27-Sukuyo-kalender",
    monthSelectAria: "Maand selecteren",
    prevMonthAria: "Vorige maand",
    nextMonthAria: "Volgende maand",
    legendAria: "Kalenderlegenda",
    detailAria: "Sukuyo-verloop van de geselecteerde dag",
    dayFortuneTitlePrefix: "Mijn geluk — ",
    coreTitle: "Kernaard van het maanhuis",
    usagePointTitle: "Belangrijk punt van vandaag",
    cautionTitle: "Waar je op moet letten",
    loveTitle: "Liefde en relaties",
    workMoneyTitle: "Werk en geld",
    adviceTitle: "Advies van vandaag",
  },
  ms: {
    calendarShellAria: "Kalendar 27 Sukuyo",
    monthSelectAria: "Pilih bulan",
    prevMonthAria: "Bulan sebelumnya",
    nextMonthAria: "Bulan seterusnya",
    legendAria: "Petunjuk kalendar",
    detailAria: "Aliran Sukuyo bagi tarikh dipilih",
    dayFortuneTitlePrefix: "Nasib saya — ",
    coreTitle: "Sifat teras rumah bulan",
    usagePointTitle: "Perkara penting hari ini",
    cautionTitle: "Perkara yang perlu diberi perhatian",
    loveTitle: "Cinta dan hubungan",
    workMoneyTitle: "Kerja dan wang",
    adviceTitle: "Nasihat hari ini",
  },
};

function getSukuyoCalendarCopy(locale: LoadingLocale): SukuyoCalendarCopy {
  return SUKUYO_CALENDAR_COPY[locale] || SUKUYO_CALENDAR_EN;
}

function useSukuyoCalendarCopy(): SukuyoCalendarCopy {
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
  return getSukuyoCalendarCopy(locale);
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const MANSION_PROFILES = [
  { direction: "동방 청룡", animal: "청룡", color: "청색" },
  { direction: "북방 현무", animal: "현무", color: "흑색" },
  { direction: "서방 백호", animal: "백호", color: "백색" },
  { direction: "남방 주작", animal: "주작", color: "적색" },
];

const MOON_CALENDAR_STYLES = `
.moon-calendar-page{
  --moon-bg:#0d0b1a;
  --moon-surface:#110f22;
  --moon-card:#1e1840;
  --moon-border:#2e2258;
  --moon-today:#4a35a0;
  --moon-inauspicious:#180f2a;
  --moon-inauspicious-border:#4a2460;
  --moon-text-primary:#c8b8f0;
  --moon-text-secondary:#9980d0;
  --moon-text-muted:#7060a8;
  --moon-text-faint:#3d3468;
  --moon-star:#e8d8ff;
  --moon-auspicious:#c8a8f0;
  --moon-accent-border:#6b4fc8;
  min-height:100vh;
  background:var(--moon-bg);
  color:var(--moon-text-primary);
  display:flex;
  justify-content:center;
  padding:18px 12px;
  font-family:system-ui,-apple-system,BlinkMacSystemFont,"Pretendard",sans-serif;
}
.moon-calendar-shell{
  width:100%;
  max-width:480px;
  align-self:flex-start;
  background:var(--moon-bg);
  border:.5px solid var(--moon-border);
  border-radius:16px;
  overflow:hidden;
}
.moon-calendar-header{
  min-height:64px;
  background:var(--moon-surface);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:12px 14px;
  position:relative;
}
.moon-calendar-titleline{display:flex;align-items:center;gap:10px;min-width:0}
.moon-calendar-crescent{width:24px;height:24px;color:var(--moon-star);opacity:0;animation:moonFadeIn 400ms ease forwards}
.moon-calendar-month-label{display:flex;align-items:center;gap:8px}
.moon-calendar-month-text{
  color:var(--moon-text-primary);
  font-family:var(--font-voice,"Noto Serif KR",serif);
  font-size:15px;
  line-height:1.25;
}
.moon-calendar-month-input{
  width:86px;
  border:0;
  background:transparent;
  color:var(--moon-text-muted);
  font-size:10px;
  color-scheme:dark;
  outline:none;
}
.moon-calendar-subtitle{margin:3px 0 0;color:var(--moon-text-muted);font-size:11px;line-height:1.25}
.moon-calendar-stars{position:absolute;inset:8px 74px auto auto;width:84px;height:36px;pointer-events:none}
.moon-calendar-stars span{position:absolute;width:3px;height:3px;border-radius:999px;background:var(--moon-text-primary)}
.moon-calendar-stars span:nth-child(1){left:6px;top:9px;opacity:.62;transform:scale(.7)}
.moon-calendar-stars span:nth-child(2){left:32px;top:4px;opacity:.78;transform:scale(1)}
.moon-calendar-stars span:nth-child(3){left:58px;top:15px;opacity:.48;transform:scale(.82)}
.moon-calendar-stars span:nth-child(4){left:72px;top:2px;opacity:.68;transform:scale(.5)}
.moon-calendar-stars span:nth-child(5){left:18px;top:28px;opacity:.42;transform:scale(.55)}
.moon-calendar-nav{display:flex;align-items:center;gap:6px;z-index:1}
.moon-calendar-nav-button{
  width:24px;
  height:24px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border:0;
  border-radius:6px;
  background:transparent;
  color:var(--moon-text-primary);
  cursor:pointer;
  transition:background 120ms ease,transform 80ms ease,opacity 120ms ease;
}
.moon-calendar-nav-button:hover{background:var(--moon-card)}
.moon-calendar-nav-button:active{transform:scale(.97)}
.moon-calendar-weekdays{
  display:grid;
  grid-template-columns:repeat(7,minmax(0,1fr));
  background:#0f0d1e;
  color:var(--moon-text-secondary);
  font-size:11px;
}
.moon-calendar-weekdays span{height:30px;display:grid;place-items:center}
.moon-calendar-grid{
  display:grid;
  grid-template-columns:repeat(7,minmax(0,1fr));
  gap:0;
  background:var(--moon-bg);
  animation:moonGridFade 150ms ease;
}
.moon-calendar-day{
  min-height:66px;
  border:0;
  border-top:.5px solid var(--moon-border);
  background:transparent;
  color:var(--moon-text-primary);
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:3px;
  padding:7px 5px;
  text-align:left;
  cursor:pointer;
  transition:background 120ms ease,transform 80ms ease,border-color 120ms ease;
}
.moon-calendar-day:hover{background:var(--moon-card);border-radius:6px}
.moon-calendar-day:active{transform:scale(.97)}
.moon-calendar-day.day--selected{background:var(--moon-card);border-radius:8px}
.moon-calendar-day.day--today{
  background:var(--moon-card);
  border:.5px solid var(--moon-accent-border);
  border-radius:8px;
}
.moon-calendar-day.day--inauspicious{
  background:var(--moon-inauspicious);
  border:.5px solid var(--moon-inauspicious-border);
  border-radius:6px;
}
.moon-calendar-day.day--great-inauspicious{
  background:var(--moon-inauspicious);
  border:1px solid var(--moon-inauspicious-border);
  border-radius:6px;
}
.moon-calendar-day.day--pivotal{
  border:.5px solid var(--moon-accent-border);
  border-radius:6px;
}
.moon-calendar-day.day--other-month{
  color:var(--moon-text-faint);
  cursor:default;
  pointer-events:none;
}
.moon-calendar-day__top{display:flex;align-items:center;gap:3px;min-height:24px}
.moon-calendar-day__number{
  position:relative;
  min-width:18px;
  height:18px;
  display:inline-grid;
  place-items:center;
  color:var(--moon-text-primary);
  font-size:13px;
  font-weight:500;
  line-height:1;
}
.moon-calendar-day__number span{position:relative;z-index:1}
.day--today .moon-calendar-day__number{width:24px;height:24px;color:var(--moon-star)}
.day--today .moon-calendar-day__number::before{
  content:"";
  position:absolute;
  inset:0;
  border-radius:999px;
  background:var(--moon-today);
}
.moon-calendar-day__star{color:var(--moon-auspicious);font-size:8px;line-height:1}
.moon-calendar-day__name{
  color:var(--moon-text-muted);
  font-family:"Noto Serif KR",serif;
  font-size:9px;
  line-height:1.25;
}
.day--today .moon-calendar-day__name{color:var(--moon-text-secondary)}
.day--inauspicious .moon-calendar-day__name{color:#9060a8}
.moon-calendar-day__badge{
  margin-top:auto;
  color:var(--moon-auspicious);
  font-size:8px;
  letter-spacing:.02em;
  line-height:1;
}
.moon-calendar-day__badge.is-inauspicious{color:#7040a0}
.moon-calendar-status{
  min-height:252px;
  grid-column:1/-1;
  border-top:.5px solid var(--moon-border);
  display:grid;
  place-items:center;
  padding:20px;
  color:var(--moon-text-secondary);
  font-size:12px;
  text-align:center;
}
.moon-calendar-legend{
  background:#0f0d1e;
  border-top:.5px solid var(--moon-border);
  padding:12px 16px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  flex-wrap:wrap;
  color:var(--moon-text-secondary);
  font-size:11px;
}
.moon-calendar-legend__items{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.moon-calendar-legend__item{display:inline-flex;align-items:center;gap:6px}
.moon-calendar-legend__dot{width:12px;height:12px;border-radius:999px;background:var(--moon-today)}
.moon-calendar-legend__square{width:12px;height:12px;border-radius:3px;background:var(--moon-card);border:.5px solid var(--moon-border)}
.moon-calendar-legend__square.is-bad{background:var(--moon-inauspicious);border-color:var(--moon-inauspicious-border)}
.moon-calendar-legend__square.is-plain{opacity:.45}
.moon-calendar-legend__scale{margin:0;color:var(--moon-text-faint);font-size:10px;line-height:1.4}
.moon-calendar-detail{
  background:var(--moon-card);
  border-top:.5px solid var(--moon-border);
  padding:16px 20px;
  border-radius:0 0 16px 16px;
  animation:moonSlideUp 200ms ease-out;
}
.moon-calendar-detail__kicker{margin:0 0 5px;color:var(--moon-text-secondary);font-size:11px;line-height:1.3}
.moon-calendar-detail h2{
  margin:0;
  color:var(--moon-text-primary);
  font-family:var(--font-voice,"Noto Serif KR",serif);
  font-size:18px;
  line-height:1.35;
}
.moon-calendar-detail__meta{margin:5px 0 0;color:var(--moon-text-secondary);font-size:12px;line-height:1.55}
.moon-calendar-cta{
  margin-top:12px;
  border:0;
  border-radius:8px;
  background:var(--moon-today);
  color:var(--moon-star);
  padding:10px 20px;
  font-size:13px;
  cursor:pointer;
  transition:opacity 120ms ease,transform 120ms ease;
}
.moon-calendar-cta:hover{opacity:.85;transform:translateY(-1px)}
.moon-calendar-notes{margin-top:14px;display:grid;gap:10px}
.moon-calendar-note{border-top:.5px solid var(--moon-border);padding-top:10px}
.moon-calendar-note h3{margin:0;color:var(--moon-text-secondary);font-size:12px;line-height:1.4}
.moon-calendar-note p{margin:4px 0 0;color:var(--moon-text-primary);font-size:12px;line-height:1.7}
@keyframes moonFadeIn{from{opacity:0}to{opacity:1}}
@keyframes moonSlideUp{from{opacity:.75;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes moonGridFade{from{opacity:0}to{opacity:1}}
@media(max-width:479.98px){
  .moon-calendar-page{padding:0}
  .moon-calendar-shell{max-width:none;border-left:0;border-right:0;border-radius:0}
  .moon-calendar-day{min-height:58px;padding:7px 5px}
  .moon-calendar-day__name{display:none}
  .moon-calendar-month-input{width:72px}
}
`;

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getKstCurrentMonth() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return {
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    month: Number.isFinite(month) ? month : new Date().getMonth() + 1,
  };
}

function shiftMonth(year: number, month: number, delta: number) {
  const total = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(total / 12),
    month: (total % 12) + 1,
  };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function parseMonthInput(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function formatSelectedDate(day: SukuyoCalendarDay) {
  return `${day.date} ${day.weekday}요일`;
}

function formatMansionLabel(day: SukuyoCalendarDay) {
  return `${day.koreanName.replace(/수$/, "숙")}(${day.hanjaName})`;
}

function getMansionProfile(day: SukuyoCalendarDay) {
  if (day.mansionIndex >= 21) return MANSION_PROFILES[3];
  return MANSION_PROFILES[Math.max(0, Math.floor(day.mansionIndex / 7))] || MANSION_PROFILES[0];
}

// 서버가 본명수 대비로 계산한 그날의 길흉 tier를 CSS 톤 클래스로 매핑.
// 본명수가 없으면(비로그인/프로필 없음) dayFortune이 null → "plain"(배지 없음).
function getDayTone(day: SukuyoCalendarDay) {
  switch (day.dayFortune?.tier) {
    case "great-auspicious": return "great-auspicious";
    case "auspicious": return "auspicious";
    case "pivotal": return "pivotal";
    case "caution": return "inauspicious";
    case "great-caution": return "great-inauspicious";
    default: return "plain";
  }
}

function getDayBadge(day: SukuyoCalendarDay) {
  switch (day.dayFortune?.tier) {
    case "great-auspicious": return "대길 ★";
    case "auspicious": return "길";
    case "pivotal": return "명일 ◆";
    case "caution": return "흉";
    case "great-caution": return "대흉";
    default: return "";
  }
}

export default function SukuyoCalendarClient() {
  const initialMonth = useMemo(() => getKstCurrentMonth(), []);
  const [cursor, setCursor] = useState(initialMonth);
  const [calendar, setCalendar] = useState<SukuyoCalendarMonth | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const cacheRef = useRef<Map<string, SukuyoCalendarMonth>>(new Map());

  const monthKey = `${String(cursor.year).padStart(4, "0")}-${pad2(cursor.month)}`;

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const cacheKey = `${cursor.year}-${cursor.month}`;
    const cached = cacheRef.current.get(cacheKey);

    if (cached && reloadKey === 0) {
      setCalendar(cached);
      setLoading(false);
      setError(null);
      return () => {
        alive = false;
        controller.abort();
      };
    }

    setLoading(true);
    setError(null);

    fetch(`/api/sukuyo/calendar?year=${cursor.year}&month=${cursor.month}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as CalendarResponse | null;
        if (!response.ok || !payload || payload.ok === false) {
          throw new Error(payload?.error || "숙요 달력을 불러오지 못했습니다.");
        }
        return payload as SukuyoCalendarMonth;
      })
      .then((payload) => {
        if (!alive) return;
        cacheRef.current.set(cacheKey, payload);
        setCalendar(payload);
      })
      .catch((fetchError) => {
        if (!alive || fetchError?.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "숙요 달력을 불러오지 못했습니다.");
        setCalendar(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [cursor.year, cursor.month, reloadKey]);

  useEffect(() => {
    if (!calendar) return;
    setSelectedDate((current) => {
      if (current && calendar.days.some((day) => day.date === current)) return current;
      return calendar.days.find((day) => day.isToday)?.date || calendar.days[0]?.date || null;
    });
  }, [calendar]);

  const selectedDay = useMemo(() => {
    if (!calendar || !selectedDate) return null;
    return calendar.days.find((day) => day.date === selectedDate) || null;
  }, [calendar, selectedDate]);

  const calendarCells = useMemo(() => {
    if (!calendar) return [];
    const previous = shiftMonth(calendar.year, calendar.month, -1);
    const previousDays = getDaysInMonth(previous.year, previous.month);
    const leading = Array.from({ length: calendar.firstWeekdayIndex }, (_, index) => ({
      type: "other" as const,
      key: `prev-${index}`,
      day: previousDays - calendar.firstWeekdayIndex + index + 1,
    }));
    const days = calendar.days.map((day) => ({ type: "day" as const, key: day.date, day }));
    const trailingLength = Math.max(0, 42 - leading.length - days.length);
    const trailing = Array.from({ length: trailingLength }, (_, index) => ({
      type: "other" as const,
      key: `next-${index}`,
      day: index + 1,
    }));
    return [...leading, ...days, ...trailing];
  }, [calendar]);

  const move = (delta: number) => {
    setCursor((current) => shiftMonth(current.year, current.month, delta));
    setReloadKey(0);
  };

  const handleMonthChange = (value: string) => {
    const next = parseMonthInput(value);
    if (!next) return;
    setCursor(next);
    setReloadKey(0);
  };

  const retry = () => {
    cacheRef.current.delete(`${cursor.year}-${cursor.month}`);
    setReloadKey((value) => value + 1);
  };

  const selectedProfile = selectedDay ? getMansionProfile(selectedDay) : null;
  const copy = useSukuyoCalendarCopy();

  return (
    <main className="moon-calendar-page">
      <style>{MOON_CALENDAR_STYLES}</style>
      <section className="moon-calendar-shell" aria-label={copy.calendarShellAria}>
        <header className="moon-calendar-header">
          <div className="moon-calendar-titleline">
            <svg className="moon-calendar-crescent" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M15.6 3.2c-3.9 1.4-6.7 5.1-6.7 9.4s2.8 8 6.7 9.4C8.8 22.2 3.4 17.8 3.4 12.6S8.8 3 15.6 3.2Z" />
            </svg>
            <div>
              <label className="moon-calendar-month-label">
                <span className="moon-calendar-month-text">
                  {cursor.year}년 {pad2(cursor.month)}월
                </span>
                <input
                  type="month"
                  value={monthKey}
                  min="1900-01"
                  max="2100-12"
                  onChange={(event) => handleMonthChange(event.target.value)}
                  className="moon-calendar-month-input"
                  aria-label={copy.monthSelectAria}
                />
              </label>
              <p className="moon-calendar-subtitle">달이 머무는 자리 · 이달의 숙(宿)</p>
            </div>
          </div>
          <div className="moon-calendar-stars" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="moon-calendar-nav">
            <button type="button" onClick={() => move(-1)} className="moon-calendar-nav-button" aria-label={copy.prevMonthAria}>
              <ChevronLeft size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => move(1)} className="moon-calendar-nav-button" aria-label={copy.nextMonthAria}>
              <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="moon-calendar-weekdays" aria-hidden="true">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="moon-calendar-grid" key={monthKey} aria-live="polite">
          {loading ? (
            Array.from({ length: 42 }, (_, index) => <span key={index} className="moon-calendar-day day--other-month" aria-hidden="true" />)
          ) : error ? (
            <div className="moon-calendar-status">
              <div>
                <p>{error}</p>
                <button type="button" onClick={retry} className="moon-calendar-cta">
                  다시 보기
                </button>
              </div>
            </div>
          ) : calendar && calendar.days.length ? (
            calendarCells.map((cell) => {
              if (cell.type === "other") {
                return (
                  <span key={cell.key} className="moon-calendar-day day--other-month" aria-hidden="true">
                    <span className="moon-calendar-day__number">
                      <span>{cell.day}</span>
                    </span>
                  </span>
                );
              }
              const tone = getDayTone(cell.day);
              const badge = getDayBadge(cell.day);
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelectedDate(cell.day.date)}
                  className={classNames(
                    "moon-calendar-day",
                    `day--${tone}`,
                    cell.day.isToday && "day--today",
                    cell.day.date === selectedDate && "day--selected"
                  )}
                  aria-label={`${formatSelectedDate(cell.day)} ${formatMansionLabel(cell.day)}`}
                  aria-pressed={cell.day.date === selectedDate}
                >
                  <span className="moon-calendar-day__top">
                    <span className="moon-calendar-day__number">
                      <span>{cell.day.day}</span>
                    </span>
                    {tone === "great-auspicious" || tone === "pivotal" ? <span className="moon-calendar-day__star">{tone === "pivotal" ? "◆" : "★"}</span> : null}
                  </span>
                  <span className="moon-calendar-day__name">{formatMansionLabel(cell.day)}</span>
                  {badge ? <span className={classNames("moon-calendar-day__badge", (tone === "inauspicious" || tone === "great-inauspicious") && "is-inauspicious")}>{badge}</span> : null}
                </button>
              );
            })
          ) : (
            <div className="moon-calendar-status">표시할 달빛 흐름이 없습니다.</div>
          )}
        </div>

        <footer className="moon-calendar-legend" aria-label={copy.legendAria}>
          <div className="moon-calendar-legend__items">
            <span className="moon-calendar-legend__item"><span className="moon-calendar-legend__dot" />오늘</span>
            <span className="moon-calendar-legend__item"><span className="moon-calendar-legend__square is-bad" />흉일</span>
            <span className="moon-calendar-legend__item"><span className="moon-calendar-legend__square is-plain" />평일</span>
          </div>
          <p className="moon-calendar-legend__scale">★ 대길 · 길 · 평 · 흉 · 대흉</p>
          {calendar && calendar.viewerHasMansion === false ? (
            <p className="moon-calendar-legend__scale">로그인하고 프로필을 등록하면 내 본명수 기준의 날짜별 길흉을 볼 수 있어요.</p>
          ) : null}
        </footer>

        <aside className="moon-calendar-detail" id="selected-sukuyo-reading" aria-label={copy.detailAria}>
          {selectedDay && selectedProfile ? (
            <>
              <p className="moon-calendar-detail__kicker">{formatSelectedDate(selectedDay)}</p>
              <h2>{formatMansionLabel(selectedDay)}</h2>
              <p className="moon-calendar-detail__meta">
                {selectedProfile.direction} · {selectedProfile.animal} · {selectedProfile.color} · {selectedDay.japaneseName}
              </p>
              <p className="moon-calendar-detail__meta">
                음력 {selectedDay.lunarDate.isLeapMonth ? "윤" : ""}
                {selectedDay.lunarDate.month}월 {selectedDay.lunarDate.day}일 기준
              </p>
              <button
                type="button"
                className="moon-calendar-cta"
                onClick={() => document.getElementById("selected-sukuyo-reading")?.scrollIntoView({ block: "nearest", behavior: "smooth" })}
              >
                이날의 운세 보기
              </button>
              <div className="moon-calendar-notes">
                {selectedDay.dayFortune ? (
                  <DetailBlock
                    title={`${copy.dayFortuneTitlePrefix}${selectedDay.dayFortune.tierLabel}`}
                    body={`${selectedDay.dayFortune.headline}. ${selectedDay.dayFortune.advice}`}
                  />
                ) : null}
                <DetailBlock title={copy.coreTitle} body={selectedDay.core} />
                <DetailBlock title={copy.usagePointTitle} body={selectedDay.usagePoint} />
                <DetailBlock title={copy.cautionTitle} body={selectedDay.caution} />
                <DetailBlock title={copy.loveTitle} body={selectedDay.love} />
                <DetailBlock title={copy.workMoneyTitle} body={selectedDay.workMoney} />
                <DetailBlock title={copy.adviceTitle} body={selectedDay.advice} />
              </div>
            </>
          ) : (
            <>
              <p className="moon-calendar-detail__kicker">Selected Moon</p>
              <h2>날짜를 고르면 숙의 흐름이 열립니다.</h2>
              <p className="moon-calendar-detail__meta">오늘의 달빛이 어느 별에 머무는지 차분히 비춥니다.</p>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}

function DetailBlock({ title, body }: { title: string; body: string }) {
  return (
    <section className="moon-calendar-note">
      <h3>{title}</h3>
      <p>{body}</p>
    </section>
  );
}
