"use client";

import { useEffect, useState } from "react";
import type { ZiweiDeepChart, ZiweiPalaceId, ZiweiTransformationType } from "@/app/_lib/ziwei-types";
import { transformationTypeToLabel } from "@/app/_lib/ziwei-advanced-normalization";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface ZiweiPalaceOrbitProps {
  chart: ZiweiDeepChart;
  activePalaceId?: ZiweiPalaceId;
  onSelect: (id: ZiweiPalaceId) => void;
}

type ZiweiPalaceNameMap = Record<ZiweiPalaceId, string>;

type ZiweiOrbitCopy = {
  title: string;
  detail: string;
  mainStars: string;
  emptyMainStar: string;
  defaultStrength: string;
  unknownStrength: string;
  noDirectTransform: string;
  incoming: string;
  weakIncoming: string;
  opposite: string;
  triad: string;
  palaces: ZiweiPalaceNameMap;
  transformations: Record<ZiweiTransformationType, string>;
};

const ZIWEI_ORBIT_COPY: Record<LoadingLocale, ZiweiOrbitCopy> = {
  ko: {
    title: "12궁 성도 요약 맵",
    detail: "상세 보기",
    mainStars: "주성",
    emptyMainStar: "무주성궁",
    defaultStrength: "평",
    unknownStrength: "강약 미확인",
    noDirectTransform: "직접 사화 없음",
    incoming: "유입",
    weakIncoming: "삼방사정/대궁 유입 약함",
    opposite: "대궁",
    triad: "삼방사정",
    palaces: { ming: "명궁", siblings: "형제궁", spouse: "부부궁", children: "자녀궁", wealth: "재백궁", health: "질액궁", travel: "천이궁", friends: "교우궁", career: "관록궁", property: "전택궁", fortune: "복덕궁", parents: "부모궁" },
    transformations: { "록": "화록", "권": "화권", "과": "화과", "기": "화기" },
  },
  en: {
    title: "12 Palace Chart Summary Map",
    detail: "view details",
    mainStars: "Main stars",
    emptyMainStar: "No main star palace",
    defaultStrength: "balanced",
    unknownStrength: "strength unknown",
    noDirectTransform: "No direct transformation",
    incoming: "Incoming",
    weakIncoming: "Weak triad/opposite influence",
    opposite: "Opposite palace",
    triad: "Triad",
    palaces: { ming: "Life Palace", siblings: "Siblings Palace", spouse: "Spouse Palace", children: "Children Palace", wealth: "Wealth Palace", health: "Health Palace", travel: "Travel Palace", friends: "Friends Palace", career: "Career Palace", property: "Property Palace", fortune: "Fortune Palace", parents: "Parents Palace" },
    transformations: { "록": "Hua Lu", "권": "Hua Quan", "과": "Hua Ke", "기": "Hua Ji" },
  },
  ja: {
    title: "十二宮チャート要約マップ",
    detail: "詳しく見る",
    mainStars: "主星",
    emptyMainStar: "無主星宮",
    defaultStrength: "平",
    unknownStrength: "強弱未確認",
    noDirectTransform: "直接の四化なし",
    incoming: "流入",
    weakIncoming: "三方四正・対宮からの流入は弱め",
    opposite: "対宮",
    triad: "三方四正",
    palaces: { ming: "命宮", siblings: "兄弟宮", spouse: "夫妻宮", children: "子女宮", wealth: "財帛宮", health: "疾厄宮", travel: "遷移宮", friends: "交友宮", career: "官禄宮", property: "田宅宮", fortune: "福徳宮", parents: "父母宮" },
    transformations: { "록": "化禄", "권": "化権", "과": "化科", "기": "化忌" },
  },
  "zh-CN": {
    title: "十二宫星曜摘要图",
    detail: "查看详情",
    mainStars: "主星",
    emptyMainStar: "无主星宫",
    defaultStrength: "平",
    unknownStrength: "强弱未确认",
    noDirectTransform: "无直接四化",
    incoming: "流入",
    weakIncoming: "三方四正/对宫流入较弱",
    opposite: "对宫",
    triad: "三方四正",
    palaces: { ming: "命宫", siblings: "兄弟宫", spouse: "夫妻宫", children: "子女宫", wealth: "财帛宫", health: "疾厄宫", travel: "迁移宫", friends: "交友宫", career: "官禄宫", property: "田宅宫", fortune: "福德宫", parents: "父母宫" },
    transformations: { "록": "化禄", "권": "化权", "과": "化科", "기": "化忌" },
  },
  "zh-TW": {
    title: "十二宮星曜摘要圖",
    detail: "查看詳情",
    mainStars: "主星",
    emptyMainStar: "無主星宮",
    defaultStrength: "平",
    unknownStrength: "強弱未確認",
    noDirectTransform: "無直接四化",
    incoming: "流入",
    weakIncoming: "三方四正/對宮流入較弱",
    opposite: "對宮",
    triad: "三方四正",
    palaces: { ming: "命宮", siblings: "兄弟宮", spouse: "夫妻宮", children: "子女宮", wealth: "財帛宮", health: "疾厄宮", travel: "遷移宮", friends: "交友宮", career: "官祿宮", property: "田宅宮", fortune: "福德宮", parents: "父母宮" },
    transformations: { "록": "化祿", "권": "化權", "과": "化科", "기": "化忌" },
  },
  vi: {
    title: "Bản đồ tóm tắt 12 cung",
    detail: "xem chi tiết",
    mainStars: "Chính tinh",
    emptyMainStar: "Cung vô chính diệu",
    defaultStrength: "bình",
    unknownStrength: "chưa rõ mạnh yếu",
    noDirectTransform: "Không có Tứ hóa trực tiếp",
    incoming: "Dòng nhập",
    weakIncoming: "Ảnh hưởng tam phương/đối cung yếu",
    opposite: "Đối cung",
    triad: "Tam phương tứ chính",
    palaces: { ming: "Cung Mệnh", siblings: "Cung Huynh Đệ", spouse: "Cung Phu Thê", children: "Cung Tử Tức", wealth: "Cung Tài Bạch", health: "Cung Tật Ách", travel: "Cung Thiên Di", friends: "Cung Nô Bộc", career: "Cung Quan Lộc", property: "Cung Điền Trạch", fortune: "Cung Phúc Đức", parents: "Cung Phụ Mẫu" },
    transformations: { "록": "Hóa Lộc", "권": "Hóa Quyền", "과": "Hóa Khoa", "기": "Hóa Kỵ" },
  },
  hi: {
    title: "12 महल सारांश मानचित्र",
    detail: "विवरण देखें",
    mainStars: "मुख्य सितारे",
    emptyMainStar: "बिना मुख्य सितारे का महल",
    defaultStrength: "संतुलित",
    unknownStrength: "शक्ति अज्ञात",
    noDirectTransform: "सीधा परिवर्तन नहीं",
    incoming: "आगमन",
    weakIncoming: "त्रिकोण/विपरीत महल प्रभाव हल्का",
    opposite: "विपरीत महल",
    triad: "त्रिकोण संबंध",
    palaces: { ming: "जीवन महल", siblings: "भाई-बहन महल", spouse: "जीवनसाथी महल", children: "संतान महल", wealth: "धन महल", health: "स्वास्थ्य महल", travel: "यात्रा महल", friends: "मित्र महल", career: "करियर महल", property: "संपत्ति महल", fortune: "भाग्य महल", parents: "माता-पिता महल" },
    transformations: { "록": "Hua Lu", "권": "Hua Quan", "과": "Hua Ke", "기": "Hua Ji" },
  },
  es: {
    title: "Mapa resumido de los 12 palacios",
    detail: "ver detalles",
    mainStars: "Estrellas principales",
    emptyMainStar: "Palacio sin estrella principal",
    defaultStrength: "equilibrado",
    unknownStrength: "fuerza sin confirmar",
    noDirectTransform: "Sin transformación directa",
    incoming: "Entrada",
    weakIncoming: "Influencia débil de tríada/opuesto",
    opposite: "Palacio opuesto",
    triad: "Tríada",
    palaces: { ming: "Palacio de vida", siblings: "Palacio de hermanos", spouse: "Palacio de pareja", children: "Palacio de hijos", wealth: "Palacio de riqueza", health: "Palacio de salud", travel: "Palacio de viaje", friends: "Palacio de amistades", career: "Palacio de carrera", property: "Palacio de propiedad", fortune: "Palacio de fortuna", parents: "Palacio de padres" },
    transformations: { "록": "Hua Lu", "권": "Hua Quan", "과": "Hua Ke", "기": "Hua Ji" },
  },
  fr: {
    title: "Carte synthèse des 12 palais",
    detail: "voir le détail",
    mainStars: "Étoiles principales",
    emptyMainStar: "Palais sans étoile principale",
    defaultStrength: "équilibré",
    unknownStrength: "force non confirmée",
    noDirectTransform: "Aucune transformation directe",
    incoming: "Entrant",
    weakIncoming: "Influence faible de la triade/opposé",
    opposite: "Palais opposé",
    triad: "Triade",
    palaces: { ming: "Palais de vie", siblings: "Palais des frères et soeurs", spouse: "Palais du couple", children: "Palais des enfants", wealth: "Palais des richesses", health: "Palais de la santé", travel: "Palais du déplacement", friends: "Palais des relations", career: "Palais de carrière", property: "Palais du foyer", fortune: "Palais de fortune", parents: "Palais des parents" },
    transformations: { "록": "Hua Lu", "권": "Hua Quan", "과": "Hua Ke", "기": "Hua Ji" },
  },
  de: {
    title: "Übersichtskarte der 12 Paläste",
    detail: "Details ansehen",
    mainStars: "Hauptsterne",
    emptyMainStar: "Palast ohne Hauptstern",
    defaultStrength: "ausgeglichen",
    unknownStrength: "Stärke unklar",
    noDirectTransform: "Keine direkte Transformation",
    incoming: "Einfluss",
    weakIncoming: "Schwacher Dreieck-/Gegenpalast-Einfluss",
    opposite: "Gegenpalast",
    triad: "Dreieck",
    palaces: { ming: "Lebenspalast", siblings: "Geschwisterpalast", spouse: "Partnerpalast", children: "Kinderpalast", wealth: "Vermögenspalast", health: "Gesundheitspalast", travel: "Reisepalast", friends: "Freundschaftspalast", career: "Karrierepalast", property: "Besitzpalast", fortune: "Glückspalast", parents: "Elternpalast" },
    transformations: { "록": "Hua Lu", "권": "Hua Quan", "과": "Hua Ke", "기": "Hua Ji" },
  },
  nl: {
    title: "Overzichtskaart van de 12 paleizen",
    detail: "details bekijken",
    mainStars: "Hoofdsterren",
    emptyMainStar: "Paleis zonder hoofdster",
    defaultStrength: "in balans",
    unknownStrength: "kracht onbekend",
    noDirectTransform: "Geen directe transformatie",
    incoming: "Instroom",
    weakIncoming: "Zwakke driehoek-/tegenpaleis-invloed",
    opposite: "Tegenpaleis",
    triad: "Driehoek",
    palaces: { ming: "Levenspaleis", siblings: "Paleis van broers en zussen", spouse: "Partnerpaleis", children: "Kinderpaleis", wealth: "Welvaartspaleis", health: "Gezondheidspaleis", travel: "Reispaleis", friends: "Vriendenpaleis", career: "Loopbaanpaleis", property: "Woningpaleis", fortune: "Fortuinpaleis", parents: "Ouderpaleis" },
    transformations: { "록": "Hua Lu", "권": "Hua Quan", "과": "Hua Ke", "기": "Hua Ji" },
  },
  ms: {
    title: "Peta ringkasan 12 istana",
    detail: "lihat butiran",
    mainStars: "Bintang utama",
    emptyMainStar: "Istana tanpa bintang utama",
    defaultStrength: "seimbang",
    unknownStrength: "kekuatan belum dikenal pasti",
    noDirectTransform: "Tiada transformasi langsung",
    incoming: "Kemasukan",
    weakIncoming: "Pengaruh triad/istana lawan lemah",
    opposite: "Istana lawan",
    triad: "Triad",
    palaces: { ming: "Istana Hidup", siblings: "Istana Adik-beradik", spouse: "Istana Pasangan", children: "Istana Anak", wealth: "Istana Kekayaan", health: "Istana Kesihatan", travel: "Istana Perjalanan", friends: "Istana Sahabat", career: "Istana Kerjaya", property: "Istana Harta", fortune: "Istana Tuah", parents: "Istana Ibu Bapa" },
    transformations: { "록": "Hua Lu", "권": "Hua Quan", "과": "Hua Ke", "기": "Hua Ji" },
  },
};

export default function ZiweiPalaceOrbit({ chart, activePalaceId, onSelect }: ZiweiPalaceOrbitProps) {
  const [locale, setLocale] = useState<LoadingLocale>("ko");

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  const copy = ZIWEI_ORBIT_COPY[locale] || ZIWEI_ORBIT_COPY.ko;
  const palaceName = (id: ZiweiPalaceId) => copy.palaces[id] || id;
  const transformationLabel = (type: ZiweiTransformationType) => copy.transformations[type] || transformationTypeToLabel(type);

  const badgeTone = (symbol: string) => {
    if (symbol === "◎") return "border-emerald-300/60 bg-emerald-200/15 text-emerald-100";
    if (symbol === "O") return "border-cyan-300/60 bg-cyan-200/15 text-cyan-100";
    if (symbol === "▲") return "border-violet-300/60 bg-violet-200/15 text-violet-100";
    if (symbol === "△") return "border-amber-300/60 bg-amber-200/15 text-amber-100";
    if (symbol === "X") return "border-rose-300/60 bg-rose-200/15 text-rose-100";
    return "border-white/20 bg-white/10 text-slate-200";
  };

  const transformationTone = (type: ZiweiTransformationType) => {
    if (type === "록") return "border-lime-300/50 bg-lime-200/15 text-lime-100";
    if (type === "권") return "border-orange-300/50 bg-orange-200/15 text-orange-100";
    if (type === "과") return "border-sky-300/50 bg-sky-200/15 text-sky-100";
    return "border-rose-300/50 bg-rose-200/15 text-rose-100";
  };

  return (
    <section className="rounded-3xl border border-cyan-200/20 bg-[#081428]/70 p-4 backdrop-blur-xl md:p-5">
      <h2 className="mb-3 text-sm font-bold tracking-wide text-cyan-200">{copy.title}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {chart.palaces.map((palace) => {
          const active = palace.id === activePalaceId;
          const triad = palace.triadPalaceIds.map((id) => palaceName(id)).join(" · ");
          const opposite = palaceName(palace.oppositePalaceId);
          const directTransforms = (palace.fourTransformations || []).map((item) => ({
            type: item.type,
            label: transformationLabel(item.type),
            star: item.starName,
          }));
          const incomingTransforms = (palace.incomingFourTransformations || []).map((item) => ({
            type: item.type,
            label: transformationLabel(item.type),
            star: item.starName,
          }));
          return (
            <button
              key={palace.id}
              type="button"
              onClick={() => onSelect(palace.id)}
              className={`min-h-40 rounded-2xl border p-3 text-left transition ${
                active
                  ? "border-cyan-300/80 bg-cyan-200/10 shadow-[0_0_24px_rgba(56,189,248,0.28)]"
                  : "border-white/10 bg-slate-950/40 hover:border-cyan-300/45"
              }`}
              aria-label={`${palaceName(palace.id)} ${copy.detail}`}
            >
              <p className="text-xs font-bold text-slate-200">{palaceName(palace.id)} {palace.branch || palace.earthlyBranch}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                {palace.isEmptyMainStarPalace
                  ? `${copy.mainStars}: ${copy.emptyMainStar}`
                  : `${copy.mainStars}: ${palace.mainStars.map((s) => `${s.name}(${s.strengthSymbol || s.symbol || "△"} ${s.strength || copy.defaultStrength})`).join(", ")}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {palace.mainStars.slice(0, 3).map((star) => {
                  const symbol = star.strengthSymbol || star.symbol || copy.unknownStrength;
                  return (
                    <span key={`${palace.id}-${star.name}`} className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeTone(symbol)}`}>
                      {star.name} {symbol}
                    </span>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {directTransforms.length ? directTransforms.map((item) => (
                  <span
                    key={`${palace.id}-${item.label}-${item.star}`}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${transformationTone(item.type)}`}
                  >
                    {item.label} {item.star}
                  </span>
                )) : <span className="text-[10px] text-slate-400">{copy.noDirectTransform}</span>}
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                {copy.incoming}: {incomingTransforms.length ? incomingTransforms.map((item) => `${item.label} ${item.star}`).join(", ") : copy.weakIncoming}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {palace.keywords.slice(0, 2).map((keyword) => (
                  <span key={keyword} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                    {keyword}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-slate-400">{copy.opposite}: {opposite}</p>
              <p className="mt-1 text-[10px] text-slate-400">{copy.triad}: {triad}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
