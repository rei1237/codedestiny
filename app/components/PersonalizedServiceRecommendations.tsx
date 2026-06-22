"use client";

import { useEffect, useState } from "react";
import ServiceCard, { type ServiceCardModel } from "./ServiceCard";
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
  profile: FormState | null;
  recommendations: ServiceCardModel[];
};

const PERSONALIZED_RECOMMENDATIONS_COPY: Record<LoadingLocale, {
  title: string;
  empty: string;
  personalized: (name: string) => string;
}> = {
  ko: {
    title: "오늘의 맞춤 추천",
    empty: "정보를 입력하면 맞춤 추천이 표시됩니다.",
    personalized: (name) => `${name}님을 위한 추천 서비스입니다. 입력된 시간/캘린더 유형 기준으로 우선순위를 정렬했습니다.`,
  },
  en: {
    title: "Today's Personalized Picks",
    empty: "Enter your details to see personalized recommendations.",
    personalized: (name) => `Recommended services for ${name}. Priorities are sorted by your birth time and calendar type.`,
  },
  ja: {
    title: "今日のおすすめ",
    empty: "情報を入力すると、あなたに合うおすすめが表示されます。",
    personalized: (name) => `${name}様に合わせたおすすめサービスです。入力された時間と暦の種類をもとに優先順位を整えました。`,
  },
  "zh-CN": {
    title: "今日个性化推荐",
    empty: "输入信息后，将显示适合你的推荐。",
    personalized: (name) => `这是为 ${name} 推荐的服务。已根据输入时间与历法类型排序。`,
  },
  "zh-TW": {
    title: "今日個人化推薦",
    empty: "輸入資訊後，將顯示適合你的推薦。",
    personalized: (name) => `這是為 ${name} 推薦的服務。已依輸入時間與曆法類型排序。`,
  },
  vi: {
    title: "Gợi ý riêng hôm nay",
    empty: "Nhập thông tin để xem các gợi ý phù hợp.",
    personalized: (name) => `Dịch vụ được gợi ý cho ${name}. Thứ tự đã được sắp theo giờ sinh và loại lịch đã nhập.`,
  },
  hi: {
    title: "आज की व्यक्तिगत सिफारिशें",
    empty: "व्यक्तिगत सिफारिशें देखने के लिए अपनी जानकारी दर्ज करें.",
    personalized: (name) => `${name} के लिए सुझाई गई सेवाएं. प्राथमिकता जन्म समय और कैलेंडर प्रकार के आधार पर रखी गई है.`,
  },
  es: {
    title: "Recomendaciones de hoy",
    empty: "Introduce tus datos para ver recomendaciones personalizadas.",
    personalized: (name) => `Servicios recomendados para ${name}. El orden se ajustó según la hora ingresada y el tipo de calendario.`,
  },
  fr: {
    title: "Suggestions du jour",
    empty: "Saisissez vos informations pour voir des recommandations personnalisées.",
    personalized: (name) => `Services recommandés pour ${name}. Les priorités sont classées selon l'heure et le type de calendrier saisis.`,
  },
  de: {
    title: "Persönliche Empfehlungen heute",
    empty: "Gib deine Daten ein, um passende Empfehlungen zu sehen.",
    personalized: (name) => `Empfohlene Services für ${name}. Die Reihenfolge basiert auf Geburtszeit und Kalendertyp.`,
  },
  nl: {
    title: "Aanbevelingen van vandaag",
    empty: "Vul je gegevens in om persoonlijke aanbevelingen te zien.",
    personalized: (name) => `Aanbevolen services voor ${name}. De volgorde is gebaseerd op de ingevoerde tijd en kalendersoort.`,
  },
  ms: {
    title: "Cadangan peribadi hari ini",
    empty: "Masukkan maklumat untuk melihat cadangan yang sesuai.",
    personalized: (name) => `Servis yang dicadangkan untuk ${name}. Keutamaan disusun mengikut masa dan jenis kalendar yang dimasukkan.`,
  },
};

export default function PersonalizedServiceRecommendations({ profile, recommendations }: Props) {
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const copy = PERSONALIZED_RECOMMENDATIONS_COPY[locale] || PERSONALIZED_RECOMMENDATIONS_COPY.ko;

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  return (
    <section className="rounded-[22px] border border-violet-300/30 bg-[linear-gradient(145deg,rgba(28,15,61,0.9),rgba(36,20,74,0.86))] p-4 shadow-[0_16px_34px_rgba(28,14,62,0.26)]">
      <h2 className="text-base font-extrabold text-violet-50">{copy.title}</h2>
      {!profile ? (
        <p className="mt-2 text-sm leading-7 text-violet-100/80">
          {copy.empty}
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm leading-7 text-violet-100/85">
            {copy.personalized(profile.name)}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {recommendations.map((item) => (
              <ServiceCard key={`rec-${item.title}`} item={item} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
