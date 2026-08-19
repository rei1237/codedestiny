"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type FormState = {
  name: string;
  birthDate: string;
  calType: "solar" | "lunar" | "lunar_leap";
  birthHour: string;
  birthMinute: string;
  birthCountry: string;
  gender: "F" | "M";
  agreed: boolean;
};

type Props = {
  step: number;
  setStep: (step: number) => void;
  state: FormState;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSubmit: () => void;
};

const COUNTRY_OPTIONS = [
  { value: "Asia/Seoul" },
  { value: "Asia/Tokyo" },
  { value: "Asia/Shanghai" },
  { value: "America/New_York" },
  { value: "Europe/London" },
  { value: "Europe/Berlin" },
  { value: "Asia/Kuala_Lumpur" },
  { value: "Asia/Bangkok" },
  { value: "Asia/Kolkata" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "10", "20", "30", "40", "50"];

type CountryValue = (typeof COUNTRY_OPTIONS)[number]["value"];

const MOBILE_STEP_FORM_COPY: Record<LoadingLocale, {
  name: string;
  namePlaceholder: string;
  birthDate: string;
  solar: string;
  lunar: string;
  lunarLeap: string;
  birthTime: string;
  hourSuffix: string;
  minuteSuffix: string;
  birthPlace: string;
  gender: string;
  female: string;
  male: string;
  agreement: string;
  submit: string;
  previous: string;
  next: string;
  countries: Record<CountryValue, string>;
}> = {
  ko: {
    name: "이름",
    namePlaceholder: "이름을 입력하세요",
    birthDate: "생년월일",
    solar: "양력",
    lunar: "음력",
    lunarLeap: "윤달",
    birthTime: "출생 시간",
    hourSuffix: "시",
    minuteSuffix: "분",
    birthPlace: "출생 국가/장소",
    gender: "성별",
    female: "여성",
    male: "남성",
    agreement: "개인정보 처리 및 운세 계산 이용에 동의합니다.",
    submit: "운명의 지도 보기",
    previous: "이전",
    next: "다음",
    countries: { "Asia/Seoul": "대한민국 (서울)", "Asia/Tokyo": "일본 (도쿄)", "Asia/Shanghai": "중국 (상하이)", "America/New_York": "미국 (뉴욕)", "Europe/London": "영국 (런던)", "Europe/Berlin": "독일 (베를린)", "Asia/Kuala_Lumpur": "말레이시아 (쿠알라룸푸르)", "Asia/Bangkok": "태국 (방콕)", "Asia/Kolkata": "인도 (콜카타)" },
  },
  en: {
    name: "Name",
    namePlaceholder: "Enter your name",
    birthDate: "Birth date",
    solar: "Solar",
    lunar: "Lunar",
    lunarLeap: "Leap month",
    birthTime: "Birth time",
    hourSuffix: ":00",
    minuteSuffix: " min",
    birthPlace: "Birth country/place",
    gender: "Gender",
    female: "Female",
    male: "Male",
    agreement: "I agree to personal data processing and fortune calculation use.",
    submit: "View Destiny Map",
    previous: "Previous",
    next: "Next",
    countries: { "Asia/Seoul": "South Korea (Seoul)", "Asia/Tokyo": "Japan (Tokyo)", "Asia/Shanghai": "China (Shanghai)", "America/New_York": "United States (New York)", "Europe/London": "United Kingdom (London)", "Europe/Berlin": "Germany (Berlin)", "Asia/Kuala_Lumpur": "Malaysia (Kuala Lumpur)", "Asia/Bangkok": "Thailand (Bangkok)", "Asia/Kolkata": "India (Kolkata)" },
  },
  ja: {
    name: "お名前",
    namePlaceholder: "お名前を入力してください",
    birthDate: "生年月日",
    solar: "新暦",
    lunar: "旧暦",
    lunarLeap: "閏月",
    birthTime: "出生時刻",
    hourSuffix: "時",
    minuteSuffix: "分",
    birthPlace: "出生国・場所",
    gender: "性別",
    female: "女性",
    male: "男性",
    agreement: "個人情報の処理および占い計算での利用に同意します。",
    submit: "運命の地図を見る",
    previous: "前へ",
    next: "次へ",
    countries: { "Asia/Seoul": "韓国（ソウル）", "Asia/Tokyo": "日本（東京）", "Asia/Shanghai": "中国（上海）", "America/New_York": "米国（ニューヨーク）", "Europe/London": "英国（ロンドン）", "Europe/Berlin": "ドイツ（ベルリン）", "Asia/Kuala_Lumpur": "マレーシア（クアラルンプール）", "Asia/Bangkok": "タイ（バンコク）", "Asia/Kolkata": "インド（コルカタ）" },
  },
  "zh-CN": {
    name: "姓名",
    namePlaceholder: "请输入姓名",
    birthDate: "出生日期",
    solar: "阳历",
    lunar: "阴历",
    lunarLeap: "闰月",
    birthTime: "出生时间",
    hourSuffix: "时",
    minuteSuffix: "分",
    birthPlace: "出生国家/地点",
    gender: "性别",
    female: "女性",
    male: "男性",
    agreement: "我同意个人信息处理及用于运势计算。",
    submit: "查看命运地图",
    previous: "上一步",
    next: "下一步",
    countries: { "Asia/Seoul": "韩国（首尔）", "Asia/Tokyo": "日本（东京）", "Asia/Shanghai": "中国（上海）", "America/New_York": "美国（纽约）", "Europe/London": "英国（伦敦）", "Europe/Berlin": "德国（柏林）", "Asia/Kuala_Lumpur": "马来西亚（吉隆坡）", "Asia/Bangkok": "泰国（曼谷）", "Asia/Kolkata": "印度（加尔各答）" },
  },
  "zh-TW": {
    name: "姓名",
    namePlaceholder: "請輸入姓名",
    birthDate: "出生日期",
    solar: "陽曆",
    lunar: "陰曆",
    lunarLeap: "閏月",
    birthTime: "出生時間",
    hourSuffix: "時",
    minuteSuffix: "分",
    birthPlace: "出生國家/地點",
    gender: "性別",
    female: "女性",
    male: "男性",
    agreement: "我同意個人資料處理及用於運勢計算。",
    submit: "查看命運地圖",
    previous: "上一步",
    next: "下一步",
    countries: { "Asia/Seoul": "韓國（首爾）", "Asia/Tokyo": "日本（東京）", "Asia/Shanghai": "中國（上海）", "America/New_York": "美國（紐約）", "Europe/London": "英國（倫敦）", "Europe/Berlin": "德國（柏林）", "Asia/Kuala_Lumpur": "馬來西亞（吉隆坡）", "Asia/Bangkok": "泰國（曼谷）", "Asia/Kolkata": "印度（加爾各答）" },
  },
  vi: {
    name: "Tên",
    namePlaceholder: "Nhập tên của bạn",
    birthDate: "Ngày sinh",
    solar: "Dương lịch",
    lunar: "Âm lịch",
    lunarLeap: "Tháng nhuận",
    birthTime: "Giờ sinh",
    hourSuffix: " giờ",
    minuteSuffix: " phút",
    birthPlace: "Quốc gia/nơi sinh",
    gender: "Giới tính",
    female: "Nữ",
    male: "Nam",
    agreement: "Tôi đồng ý xử lý thông tin cá nhân và sử dụng để tính vận mệnh.",
    submit: "Xem bản đồ vận mệnh",
    previous: "Trước",
    next: "Tiếp",
    countries: { "Asia/Seoul": "Hàn Quốc (Seoul)", "Asia/Tokyo": "Nhật Bản (Tokyo)", "Asia/Shanghai": "Trung Quốc (Thượng Hải)", "America/New_York": "Hoa Kỳ (New York)", "Europe/London": "Vương quốc Anh (London)", "Europe/Berlin": "Đức (Berlin)", "Asia/Kuala_Lumpur": "Malaysia (Kuala Lumpur)", "Asia/Bangkok": "Thái Lan (Bangkok)", "Asia/Kolkata": "Ấn Độ (Kolkata)" },
  },
  hi: {
    name: "नाम",
    namePlaceholder: "अपना नाम दर्ज करें",
    birthDate: "जन्म तारीख",
    solar: "सौर",
    lunar: "चंद्र",
    lunarLeap: "अधिक मास",
    birthTime: "जन्म समय",
    hourSuffix: " बजे",
    minuteSuffix: " मिनट",
    birthPlace: "जन्म देश/स्थान",
    gender: "लिंग",
    female: "महिला",
    male: "पुरुष",
    agreement: "मैं व्यक्तिगत जानकारी के प्रसंस्करण और भाग्य गणना में उपयोग से सहमत हूं.",
    submit: "भाग्य मानचित्र देखें",
    previous: "पिछला",
    next: "अगला",
    countries: { "Asia/Seoul": "दक्षिण कोरिया (सियोल)", "Asia/Tokyo": "जापान (टोक्यो)", "Asia/Shanghai": "चीन (शंघाई)", "America/New_York": "अमेरिका (न्यूयॉर्क)", "Europe/London": "यूनाइटेड किंगडम (लंदन)", "Europe/Berlin": "जर्मनी (बर्लिन)", "Asia/Kuala_Lumpur": "मलेशिया (कुआलालंपुर)", "Asia/Bangkok": "थाईलैंड (बैंकॉक)", "Asia/Kolkata": "भारत (कोलकाता)" },
  },
  es: {
    name: "Nombre",
    namePlaceholder: "Introduce tu nombre",
    birthDate: "Fecha de nacimiento",
    solar: "Solar",
    lunar: "Lunar",
    lunarLeap: "Mes intercalar",
    birthTime: "Hora de nacimiento",
    hourSuffix: " h",
    minuteSuffix: " min",
    birthPlace: "País/lugar de nacimiento",
    gender: "Género",
    female: "Mujer",
    male: "Hombre",
    agreement: "Acepto el tratamiento de datos personales y su uso para calcular la fortuna.",
    submit: "Ver mapa del destino",
    previous: "Anterior",
    next: "Siguiente",
    countries: { "Asia/Seoul": "Corea del Sur (Seúl)", "Asia/Tokyo": "Japón (Tokio)", "Asia/Shanghai": "China (Shanghái)", "America/New_York": "Estados Unidos (Nueva York)", "Europe/London": "Reino Unido (Londres)", "Europe/Berlin": "Alemania (Berlín)", "Asia/Kuala_Lumpur": "Malasia (Kuala Lumpur)", "Asia/Bangkok": "Tailandia (Bangkok)", "Asia/Kolkata": "India (Calcuta)" },
  },
  fr: {
    name: "Nom",
    namePlaceholder: "Saisissez votre nom",
    birthDate: "Date de naissance",
    solar: "Solaire",
    lunar: "Lunaire",
    lunarLeap: "Mois intercalaire",
    birthTime: "Heure de naissance",
    hourSuffix: " h",
    minuteSuffix: " min",
    birthPlace: "Pays/lieu de naissance",
    gender: "Genre",
    female: "Femme",
    male: "Homme",
    agreement: "J'accepte le traitement des données personnelles et leur usage pour le calcul de fortune.",
    submit: "Voir la carte du destin",
    previous: "Précédent",
    next: "Suivant",
    countries: { "Asia/Seoul": "Corée du Sud (Séoul)", "Asia/Tokyo": "Japon (Tokyo)", "Asia/Shanghai": "Chine (Shanghai)", "America/New_York": "États-Unis (New York)", "Europe/London": "Royaume-Uni (Londres)", "Europe/Berlin": "Allemagne (Berlin)", "Asia/Kuala_Lumpur": "Malaisie (Kuala Lumpur)", "Asia/Bangkok": "Thaïlande (Bangkok)", "Asia/Kolkata": "Inde (Kolkata)" },
  },
  de: {
    name: "Name",
    namePlaceholder: "Namen eingeben",
    birthDate: "Geburtsdatum",
    solar: "Solar",
    lunar: "Lunar",
    lunarLeap: "Schaltmonat",
    birthTime: "Geburtszeit",
    hourSuffix: " Uhr",
    minuteSuffix: " Min.",
    birthPlace: "Geburtsland/-ort",
    gender: "Geschlecht",
    female: "Weiblich",
    male: "Männlich",
    agreement: "Ich stimme der Verarbeitung personenbezogener Daten und der Nutzung zur Schicksalsberechnung zu.",
    submit: "Schicksalskarte ansehen",
    previous: "Zurück",
    next: "Weiter",
    countries: { "Asia/Seoul": "Südkorea (Seoul)", "Asia/Tokyo": "Japan (Tokio)", "Asia/Shanghai": "China (Shanghai)", "America/New_York": "USA (New York)", "Europe/London": "Vereinigtes Königreich (London)", "Europe/Berlin": "Deutschland (Berlin)", "Asia/Kuala_Lumpur": "Malaysia (Kuala Lumpur)", "Asia/Bangkok": "Thailand (Bangkok)", "Asia/Kolkata": "Indien (Kolkata)" },
  },
  nl: {
    name: "Naam",
    namePlaceholder: "Vul je naam in",
    birthDate: "Geboortedatum",
    solar: "Zonnekalender",
    lunar: "Maankalender",
    lunarLeap: "Schrikkelmaand",
    birthTime: "Geboortetijd",
    hourSuffix: " uur",
    minuteSuffix: " min",
    birthPlace: "Geboorteland/-plaats",
    gender: "Geslacht",
    female: "Vrouw",
    male: "Man",
    agreement: "Ik ga akkoord met verwerking van persoonsgegevens en gebruik voor fortuinberekening.",
    submit: "Bekijk lotskaart",
    previous: "Vorige",
    next: "Volgende",
    countries: { "Asia/Seoul": "Zuid-Korea (Seoel)", "Asia/Tokyo": "Japan (Tokio)", "Asia/Shanghai": "China (Shanghai)", "America/New_York": "Verenigde Staten (New York)", "Europe/London": "Verenigd Koninkrijk (Londen)", "Europe/Berlin": "Duitsland (Berlijn)", "Asia/Kuala_Lumpur": "Maleisië (Kuala Lumpur)", "Asia/Bangkok": "Thailand (Bangkok)", "Asia/Kolkata": "India (Kolkata)" },
  },
  ms: {
    name: "Nama",
    namePlaceholder: "Masukkan nama anda",
    birthDate: "Tarikh lahir",
    solar: "Solar",
    lunar: "Lunar",
    lunarLeap: "Bulan lompat",
    birthTime: "Masa lahir",
    hourSuffix: " jam",
    minuteSuffix: " min",
    birthPlace: "Negara/tempat lahir",
    gender: "Jantina",
    female: "Perempuan",
    male: "Lelaki",
    agreement: "Saya bersetuju dengan pemprosesan maklumat peribadi dan penggunaan untuk kiraan nasib.",
    submit: "Lihat peta takdir",
    previous: "Sebelum",
    next: "Seterusnya",
    countries: { "Asia/Seoul": "Korea Selatan (Seoul)", "Asia/Tokyo": "Jepun (Tokyo)", "Asia/Shanghai": "China (Shanghai)", "America/New_York": "Amerika Syarikat (New York)", "Europe/London": "United Kingdom (London)", "Europe/Berlin": "Jerman (Berlin)", "Asia/Kuala_Lumpur": "Malaysia (Kuala Lumpur)", "Asia/Bangkok": "Thailand (Bangkok)", "Asia/Kolkata": "India (Kolkata)" },
  },
};

export default function MobileStepFortuneForm({ step, setStep, state, setField, onSubmit }: Props) {
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const copy = MOBILE_STEP_FORM_COPY[locale] || MOBILE_STEP_FORM_COPY.ko;

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  return (
    <div className="md:hidden">
      <div className="mb-3 flex items-center gap-1.5">
        {[1, 2, 3].map((n) => (
          <span
            key={`step-${n}`}
            className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-violet-500" : "bg-violet-200/80"}`}
          />
        ))}
      </div>

      {step === 1 ? (
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-violet-900">
            {copy.name}
            <input
              value={state.name}
              onChange={(e) => setField("name", e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-violet-200/80 bg-white/95 px-3 py-2.5 text-sm text-slate-900"
              placeholder={copy.namePlaceholder}
            />
          </label>

          <label className="block text-xs font-semibold text-violet-900">
            {copy.birthDate}
            <input
              {...birthDateTextInputProps(state.birthDate, (nextBirthDate) => setField("birthDate", nextBirthDate))}
              className="mt-1.5 w-full rounded-xl border border-violet-200/80 bg-white/95 px-3 py-2.5 text-sm text-slate-900"
            />
          </label>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setField("calType", "solar")}
              className={`rounded-xl border px-2 py-2 text-xs font-semibold ${state.calType === "solar" ? "border-violet-300/80 bg-violet-500 text-white" : "border-violet-200/80 bg-white text-violet-900"}`}
            >
              {copy.solar}
            </button>
            <button
              type="button"
              onClick={() => setField("calType", "lunar")}
              className={`rounded-xl border px-2 py-2 text-xs font-semibold ${state.calType === "lunar" ? "border-violet-300/80 bg-violet-500 text-white" : "border-violet-200/80 bg-white text-violet-900"}`}
            >
              {copy.lunar}
            </button>
            <button
              type="button"
              onClick={() => setField("calType", "lunar_leap")}
              className={`rounded-xl border px-2 py-2 text-xs font-semibold ${state.calType === "lunar_leap" ? "border-violet-300/80 bg-violet-500 text-white" : "border-violet-200/80 bg-white text-violet-900"}`}
            >
              {copy.lunarLeap}
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-violet-900">{copy.birthTime}</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <select
                value={state.birthHour}
                onChange={(e) => setField("birthHour", e.target.value)}
                className="rounded-xl border border-violet-200/80 bg-white/95 px-3 py-2.5 text-sm text-slate-900"
              >
                {HOURS.map((h) => (
                  <option key={`h-${h}`} value={h}>{h}{copy.hourSuffix}</option>
                ))}
              </select>
              <select
                value={state.birthMinute}
                onChange={(e) => setField("birthMinute", e.target.value)}
                className="rounded-xl border border-violet-200/80 bg-white/95 px-3 py-2.5 text-sm text-slate-900"
              >
                {MINUTES.map((m) => (
                  <option key={`m-${m}`} value={m}>{m}{copy.minuteSuffix}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="block text-xs font-semibold text-violet-900">
            {copy.birthPlace}
            <select
              value={state.birthCountry}
              onChange={(e) => setField("birthCountry", e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-violet-200/80 bg-white/95 px-3 py-2.5 text-sm text-slate-900"
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{copy.countries[c.value] || c.value}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-violet-900">{copy.gender}</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setField("gender", "F")}
                className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${state.gender === "F" ? "border-violet-300/80 bg-violet-500 text-white" : "border-violet-200/80 bg-white text-violet-900"}`}
              >
                {copy.female}
              </button>
              <button
                type="button"
                onClick={() => setField("gender", "M")}
                className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${state.gender === "M" ? "border-violet-300/80 bg-violet-500 text-white" : "border-violet-200/80 bg-white text-violet-900"}`}
              >
                {copy.male}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2 rounded-xl border border-violet-200/80 bg-white/90 p-3 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={state.agreed}
              onChange={(e) => setField("agreed", e.target.checked)}
              className="mt-0.5"
            />
            <span>{copy.agreement}</span>
          </label>

          <button
            type="button"
            onClick={onSubmit}
            className="w-full rounded-xl border border-violet-300/60 bg-gradient-to-r from-violet-500 to-indigo-500 px-4 py-3 text-sm font-bold text-white"
          >
            {copy.submit}
          </button>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={step === 1}
          onClick={() => setStep(Math.max(1, step - 1))}
          className="rounded-xl border border-violet-200/80 bg-white/90 px-3 py-2 text-xs font-semibold text-violet-900 disabled:opacity-40"
        >
          {copy.previous}
        </button>
        <button
          type="button"
          disabled={step === 3}
          onClick={() => setStep(Math.min(3, step + 1))}
          className="rounded-xl border border-violet-300/70 bg-violet-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          {copy.next}
        </button>
      </div>
    </div>
  );
}
