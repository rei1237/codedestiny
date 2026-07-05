"use client";

import Link from "next/link";
import { m } from "framer-motion";
import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type FeatureId = "flower" | "ziweiDeep" | "olympus";

type UnlockFeature = {
  id: FeatureId;
  eyebrow: string;
  href: string;
  accent: string;
  glow: string;
};

const premiumFeatures: UnlockFeature[] = [
  {
    id: "flower",
    eyebrow: "Flower of Destiny",
    href: "/?action=openDestinyFlowerStudio",
    accent: "from-fuchsia-200 via-rose-200 to-amber-200",
    glow: "from-fuchsia-400/35 via-rose-300/20 to-amber-300/25",
  },
  {
    id: "ziweiDeep",
    eyebrow: "Advanced Zi Wei Dou Shu",
    href: "/ziwei/chart",
    accent: "from-violet-200 via-indigo-200 to-cyan-200",
    glow: "from-violet-400/35 via-indigo-300/20 to-cyan-300/25",
  },
  {
    id: "olympus",
    eyebrow: "Olympus Oracle",
    href: "/olympus",
    accent: "from-amber-200 via-yellow-200 to-orange-200",
    glow: "from-amber-400/35 via-yellow-300/20 to-orange-300/25",
  },
];

const FEATURE_UNLOCK_COPY: Record<LoadingLocale, {
  title: string;
  description: string;
  focusLabel: string;
  focusBody: string;
  features: Record<FeatureId, {
    title: string;
    description: string;
    badge: string;
    cta: string;
  }>;
}> = {
  ko: {
    title: "심화 리딩 컬렉션",
    description: "기본 명반 이후 더 깊은 해석이 필요할 때, 상징과 명반 근거를 분리해 상담형 리딩으로 이어갑니다.",
    focusLabel: "reading focus",
    focusBody: "개인 입력값과 서비스별 계산 근거를 바탕으로 다음 장면의 해석을 엽니다.",
    features: {
      flower: { title: "운명의 꽃", description: "사주·점성술·자미두수 흐름을 하나의 상징 꽃으로 결합한 통합 아틀리에.", badge: "통합 상징 리딩", cta: "아틀리에 열기" },
      ziweiDeep: { title: "심화 자미두수", description: "명궁·신궁·사화·삼방사정·대한을 엮어 12궁의 실제 선택 흐름을 읽는 심화 상담.", badge: "12궁 심화 상담", cta: "심화 명반 열기" },
      olympus: { title: "올림푸스 신탁", description: "수호신, 별자리, 신화 상징을 결합한 프리미엄 신탁 리딩.", badge: "신화 상징 신탁", cta: "신탁 열기" },
    },
  },
  en: {
    title: "Advanced Reading Collection",
    description: "When a basic chart is not enough, these paths separate symbol and chart evidence into deeper consultative readings.",
    focusLabel: "reading focus",
    focusBody: "Each next scene opens from your personal inputs and the calculation basis of the selected service.",
    features: {
      flower: { title: "Flower of Destiny", description: "An integrated atelier that turns Saju, astrology, and Zi Wei flows into one symbolic flower.", badge: "Integrated Symbol Reading", cta: "Open Atelier" },
      ziweiDeep: { title: "Advanced Zi Wei Dou Shu", description: "A deeper consultation reading the real choice flow of the 12 palaces through Ming, body palace, transformations, triads, and major luck.", badge: "12 Palace Consultation", cta: "Open Deep Chart" },
      olympus: { title: "Olympus Oracle", description: "A premium oracle reading woven from guardian deity, zodiac, and mythic symbols.", badge: "Mythic Oracle", cta: "Open Oracle" },
    },
  },
  ja: {
    title: "深層リーディングコレクション",
    description: "基本命盤の先に、さらに深い読み解きが必要なとき、象徴と命盤根拠を分けて相談型リーディングへ進みます。",
    focusLabel: "読み解きの焦点",
    focusBody: "個人入力と各サービスの計算根拠をもとに、次の場面の解釈を開きます。",
    features: {
      flower: { title: "運命の花", description: "四柱推命・占星術・紫微斗数の流れを一輪の象徴花へ結ぶ統合アトリエです。", badge: "統合象徴リーディング", cta: "アトリエを開く" },
      ziweiDeep: { title: "深層 紫微斗数", description: "命宮・身宮・四化・三方四正・大運を結び、十二宮の選択の流れを読む深い相談です。", badge: "十二宮深層相談", cta: "深層命盤を開く" },
      olympus: { title: "オリンポス神託", description: "守護神、星座、神話象徴を組み合わせたプレミアム神託リーディングです。", badge: "神話象徴の神託", cta: "神託を開く" },
    },
  },
  "zh-CN": {
    title: "深度解读合集",
    description: "当基础命盘之后还需要更深解读时，将象征与命盘依据分开，进入咨询式阅读。",
    focusLabel: "解读焦点",
    focusBody: "根据个人输入与各服务的计算依据，开启下一层场景解读。",
    features: {
      flower: { title: "命运之花", description: "把四柱、占星与紫微斗数的流向融合为一朵象征之花的综合工坊。", badge: "综合象征解读", cta: "打开工坊" },
      ziweiDeep: { title: "深度紫微斗数", description: "结合命宫、身宫、四化、三方四正与大运，读取十二宫的真实选择流向。", badge: "十二宫深度咨询", cta: "打开深度命盘" },
      olympus: { title: "奥林匹斯神谕", description: "融合守护神、星座与神话象征的高级神谕解读。", badge: "神话象征神谕", cta: "打开神谕" },
    },
  },
  "zh-TW": {
    title: "深度解讀合集",
    description: "當基礎命盤之後還需要更深解讀時，將象徵與命盤依據分開，進入諮詢式閱讀。",
    focusLabel: "解讀焦點",
    focusBody: "根據個人輸入與各服務的計算依據，開啟下一層場景解讀。",
    features: {
      flower: { title: "命運之花", description: "把四柱、占星與紫微斗數的流向融合為一朵象徵之花的綜合工坊。", badge: "綜合象徵解讀", cta: "開啟工坊" },
      ziweiDeep: { title: "深度紫微斗數", description: "結合命宮、身宮、四化、三方四正與大運，讀取十二宮的真實選擇流向。", badge: "十二宮深度諮詢", cta: "開啟深度命盤" },
      olympus: { title: "奧林帕斯神諭", description: "融合守護神、星座與神話象徵的高級神諭解讀。", badge: "神話象徵神諭", cta: "開啟神諭" },
    },
  },
  vi: {
    title: "Bộ sưu tập luận giải chuyên sâu",
    description: "Khi lá số cơ bản chưa đủ, các lối đọc này tách biểu tượng và căn cứ lá số để đi vào tư vấn sâu hơn.",
    focusLabel: "trọng tâm luận giải",
    focusBody: "Mỗi cảnh tiếp theo mở ra từ dữ liệu cá nhân và nền tảng tính toán của từng dịch vụ.",
    features: {
      flower: { title: "Hoa Định Mệnh", description: "Xưởng tích hợp kết hợp dòng Tứ Trụ, chiêm tinh và Tử Vi thành một đóa hoa biểu tượng.", badge: "Luận biểu tượng tích hợp", cta: "Mở xưởng" },
      ziweiDeep: { title: "Tử Vi chuyên sâu", description: "Tư vấn đọc dòng lựa chọn thật của 12 cung qua Mệnh, Thân, Tứ hóa, tam phương và Đại vận.", badge: "Tư vấn sâu 12 cung", cta: "Mở lá số sâu" },
      olympus: { title: "Thần dụ Olympus", description: "Luận thần dụ premium kết hợp thần hộ mệnh, cung sao và biểu tượng thần thoại.", badge: "Thần dụ biểu tượng", cta: "Mở thần dụ" },
    },
  },
  hi: {
    title: "गहन रीडिंग संग्रह",
    description: "जब मूल चार्ट से आगे गहराई चाहिए, ये पथ प्रतीक और चार्ट आधार को अलग कर परामर्श रीडिंग तक ले जाते हैं.",
    focusLabel: "रीडिंग फोकस",
    focusBody: "आपकी व्यक्तिगत जानकारी और सेवा की गणना के आधार से अगला अर्थ खुलता है.",
    features: {
      flower: { title: "भाग्य का फूल", description: "Saju, ज्योतिष और Zi Wei प्रवाह को एक प्रतीकात्मक फूल में जोड़ने वाला समेकित atelier.", badge: "समेकित प्रतीक रीडिंग", cta: "Atelier खोलें" },
      ziweiDeep: { title: "गहन Zi Wei Dou Shu", description: "Ming, body palace, transformations, triads और major luck से 12 महलों की वास्तविक चयन धारा पढ़ता है.", badge: "12 महल गहन सलाह", cta: "गहन चार्ट खोलें" },
      olympus: { title: "Olympus Oracle", description: "रक्षक देवता, राशि और मिथकीय प्रतीकों से बनी premium oracle reading.", badge: "मिथकीय oracle", cta: "Oracle खोलें" },
    },
  },
  es: {
    title: "Colección de lecturas profundas",
    description: "Cuando la carta básica no basta, estos caminos separan símbolo y base de cálculo para una lectura consultiva más profunda.",
    focusLabel: "foco de lectura",
    focusBody: "Cada escena se abre desde tus datos personales y la base de cálculo del servicio elegido.",
    features: {
      flower: { title: "Flor del Destino", description: "Atelier integrado que une Saju, astrología y Zi Wei en una flor simbólica.", badge: "Lectura simbólica integrada", cta: "Abrir atelier" },
      ziweiDeep: { title: "Zi Wei avanzado", description: "Consulta profunda que lee el flujo real de elección de los 12 palacios con Ming, cuerpo, transformaciones, tríadas y gran suerte.", badge: "Consulta 12 palacios", cta: "Abrir carta profunda" },
      olympus: { title: "Oráculo Olympus", description: "Lectura premium tejida con deidad guardiana, zodiaco y símbolos míticos.", badge: "Oráculo mítico", cta: "Abrir oráculo" },
    },
  },
  fr: {
    title: "Collection de lectures profondes",
    description: "Quand le thème de base ne suffit plus, ces chemins séparent symbole et fondement de calcul pour une lecture plus consultative.",
    focusLabel: "axe de lecture",
    focusBody: "Chaque scène s'ouvre depuis vos données personnelles et la base de calcul du service choisi.",
    features: {
      flower: { title: "Fleur du Destin", description: "Atelier intégré qui relie Saju, astrologie et Zi Wei en une fleur symbolique.", badge: "Lecture symbolique intégrée", cta: "Ouvrir l'atelier" },
      ziweiDeep: { title: "Zi Wei approfondi", description: "Consultation profonde lisant le flux de choix des 12 palais par Ming, palais du corps, transformations, triades et grande chance.", badge: "Consultation 12 palais", cta: "Ouvrir le thème profond" },
      olympus: { title: "Oracle Olympus", description: "Lecture premium tissée de divinité gardienne, zodiaque et symboles mythiques.", badge: "Oracle mythique", cta: "Ouvrir l'oracle" },
    },
  },
  de: {
    title: "Sammlung tiefer Deutungen",
    description: "Wenn die Basiskarte nicht reicht, trennen diese Wege Symbol und Berechnungsgrundlage für eine tiefere Beratung.",
    focusLabel: "deutungsfokus",
    focusBody: "Die nächste Szene öffnet sich aus deinen Eingaben und der Berechnungsbasis des gewählten Services.",
    features: {
      flower: { title: "Blume des Schicksals", description: "Ein integriertes Atelier, das Saju, Astrologie und Zi Wei zu einer Symbolblume verbindet.", badge: "Integrierte Symboldeutung", cta: "Atelier öffnen" },
      ziweiDeep: { title: "Fortgeschrittenes Zi Wei", description: "Tiefe Beratung zum Wahlfluss der 12 Paläste über Ming, Körperpalast, Transformationen, Dreiecke und großes Glück.", badge: "12-Palast-Beratung", cta: "Tiefes Chart öffnen" },
      olympus: { title: "Olympus-Orakel", description: "Premium-Orakel aus Schutzgottheit, Tierkreis und mythischen Symbolen.", badge: "Mythisches Orakel", cta: "Orakel öffnen" },
    },
  },
  nl: {
    title: "Collectie diepe lezingen",
    description: "Wanneer de basiskaart niet genoeg is, scheiden deze paden symbool en rekenbasis voor diepere consultatieve lezingen.",
    focusLabel: "leesfocus",
    focusBody: "Elke volgende scène opent vanuit je persoonlijke invoer en de rekenbasis van de gekozen service.",
    features: {
      flower: { title: "Bloem van het Lot", description: "Een geïntegreerd atelier dat Saju, astrologie en Zi Wei samenbrengt in één symbolische bloem.", badge: "Geïntegreerde symboollezing", cta: "Atelier openen" },
      ziweiDeep: { title: "Geavanceerde Zi Wei", description: "Diepe consultatie die de keuzeflow van de 12 paleizen leest via Ming, lichaamspaleis, transformaties, driehoeken en groot geluk.", badge: "12-paleis consultatie", cta: "Diepe kaart openen" },
      olympus: { title: "Olympus Oracle", description: "Premium oracle reading verweven met beschermgod, dierenriem en mythische symbolen.", badge: "Mythische oracle", cta: "Oracle openen" },
    },
  },
  ms: {
    title: "Koleksi bacaan mendalam",
    description: "Apabila carta asas belum mencukupi, laluan ini memisahkan simbol dan asas kiraan untuk bacaan konsultasi yang lebih dalam.",
    focusLabel: "fokus bacaan",
    focusBody: "Setiap adegan seterusnya dibuka daripada input peribadi dan asas kiraan servis yang dipilih.",
    features: {
      flower: { title: "Bunga Takdir", description: "Atelier bersepadu yang menyatukan aliran Saju, astrologi dan Zi Wei menjadi satu bunga simbolik.", badge: "Bacaan simbol bersepadu", cta: "Buka atelier" },
      ziweiDeep: { title: "Zi Wei mendalam", description: "Konsultasi mendalam yang membaca aliran pilihan 12 istana melalui Ming, istana tubuh, transformasi, triad dan nasib besar.", badge: "Konsultasi 12 istana", cta: "Buka carta mendalam" },
      olympus: { title: "Oracle Olympus", description: "Bacaan oracle premium yang menggabungkan dewa pelindung, zodiak dan simbol mitos.", badge: "Oracle simbol mitos", cta: "Buka oracle" },
    },
  },
};

export default function FeatureUnlockShowcase() {
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const copy = FEATURE_UNLOCK_COPY[locale] || FEATURE_UNLOCK_COPY.ko;

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-violet-200/20 bg-[linear-gradient(145deg,rgba(13,17,38,0.94),rgba(18,26,54,0.92)_48%,rgba(28,16,64,0.92))] p-4 shadow-[0_26px_60px_rgba(8,8,24,0.5)] md:p-6">
      <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-52 w-52 rounded-full bg-amber-400/15 blur-3xl" aria-hidden />

      <div className="relative z-10">
        <div className="mb-5 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200/80">Premium Reading Paths</p>
          <h2 className="mt-2 text-xl font-black text-violet-50 md:text-2xl">{copy.title}</h2>
          <p className="mt-2 text-sm leading-6 text-violet-100/75">
            {copy.description}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {premiumFeatures.map((feature) => {
            const featureCopy = copy.features[feature.id];
            return (
              <m.article
                key={feature.id}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.05] p-4 backdrop-blur-xl"
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.glow} opacity-35`} />

                <div className="relative z-10">
                  <p className={`inline-flex rounded-full bg-gradient-to-r ${feature.accent} bg-clip-text text-xs font-bold tracking-[0.14em] text-transparent`}>
                    {feature.eyebrow}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-black text-white">{featureCopy.title}</h3>
                    <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-violet-50">{featureCopy.badge}</span>
                  </div>
                  <p className="mt-2 min-h-[64px] text-sm leading-6 text-violet-100/80">{featureCopy.description}</p>

                  <div className="mt-3 rounded-2xl border border-violet-200/25 bg-slate-950/30 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200/80">{copy.focusLabel}</p>
                    <p className="mt-1 text-sm text-violet-50/95">
                      {copy.focusBody}
                    </p>
                  </div>
                </div>

                <m.div
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="relative z-10 mt-4"
                >
                  <Link
                    href={feature.href}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-violet-200/35 bg-violet-600/80 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-500"
                  >
                    {featureCopy.cta}
                  </Link>
                </m.div>
              </m.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
