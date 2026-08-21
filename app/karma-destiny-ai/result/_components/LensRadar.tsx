"use client";

import { useEffect, useId, useState } from "react";
import type { RadarModel } from "../_lib/report-model";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface LensRadarCopy {
  radarTitle: string;
  captionThree: string;
  captionFive: string;
  toggleClose: string;
  toggleOpen: string;
  tableCaption: string;
  colLens: string;
  colContribution: string;
  colBasis: string;
  confidenceNone: string;
  confidenceProvisional: string;
  confidenceFull: string;
}

const LENS_RADAR_EN: LensRadarCopy = {
  radarTitle: "System contribution radar",
  captionThree: "This report was written based on three perspectives. Shows how much each perspective was actually calculated.",
  captionFive: "How much each perspective actually contributed evidence to this report. Not a strength/weakness score.",
  toggleClose: "Close table",
  toggleOpen: "View as table",
  tableCaption: "Contribution by perspective",
  colLens: "Perspective",
  colContribution: "Contribution",
  colBasis: "Basis",
  confidenceNone: "Not calculated",
  confidenceProvisional: "Birth time unknown — possible range",
  confidenceFull: "Calculation complete",
};

const LENS_RADAR_COPY: Partial<Record<LoadingLocale, LensRadarCopy>> = {
  ko: {
    radarTitle: "체계 기여도 레이더",
    captionThree: "이 리포트는 세 관점 기준으로 작성되었습니다. 각 관점이 실제로 계산된 정도를 표시합니다.",
    captionFive: "각 관점이 이 리포트에 실제로 근거를 제공한 정도입니다. 운세의 강약이 아닙니다.",
    toggleClose: "표 닫기",
    toggleOpen: "표로 보기",
    tableCaption: "관점별 기여도",
    colLens: "관점",
    colContribution: "기여도",
    colBasis: "산출 근거",
    confidenceNone: "계산되지 않음",
    confidenceProvisional: "출생시간 미상 — 가능성 범위",
    confidenceFull: "계산 완료",
  },
  ja: {
    radarTitle: "体系寄与度レーダー",
    captionThree: "このレポートは三つの視点を基準に作成されました。各視点が実際に計算された程度を表示します。",
    captionFive: "各視点がこのレポートに実際に根拠を提供した程度です。運勢の強弱ではありません。",
    toggleClose: "表を閉じる",
    toggleOpen: "表で見る",
    tableCaption: "視点別寄与度",
    colLens: "視点",
    colContribution: "寄与度",
    colBasis: "算出根拠",
    confidenceNone: "計算されていません",
    confidenceProvisional: "出生時刻不明 — 可能性の範囲",
    confidenceFull: "計算完了",
  },
  "zh-CN": {
    radarTitle: "体系贡献度雷达图",
    captionThree: "本报告以三种视角为基准撰写。显示各视角实际计算的程度。",
    captionFive: "各视角实际为本报告提供依据的程度，并非运势强弱。",
    toggleClose: "关闭表格",
    toggleOpen: "以表格查看",
    tableCaption: "各视角贡献度",
    colLens: "视角",
    colContribution: "贡献度",
    colBasis: "计算依据",
    confidenceNone: "未计算",
    confidenceProvisional: "出生时间不详 — 可能性范围",
    confidenceFull: "计算完成",
  },
  "zh-TW": {
    radarTitle: "體系貢獻度雷達圖",
    captionThree: "本報告以三種視角為基準撰寫。顯示各視角實際計算的程度。",
    captionFive: "各視角實際為本報告提供依據的程度，並非運勢強弱。",
    toggleClose: "關閉表格",
    toggleOpen: "以表格檢視",
    tableCaption: "各視角貢獻度",
    colLens: "視角",
    colContribution: "貢獻度",
    colBasis: "計算依據",
    confidenceNone: "未計算",
    confidenceProvisional: "出生時間不詳 — 可能性範圍",
    confidenceFull: "計算完成",
  },
  vi: {
    radarTitle: "Biểu đồ radar mức đóng góp hệ thống",
    captionThree: "Báo cáo này được viết dựa trên ba góc nhìn. Hiển thị mức độ mỗi góc nhìn thực sự được tính toán.",
    captionFive: "Mức độ mỗi góc nhìn thực sự đóng góp căn cứ cho báo cáo này. Không phải điểm mạnh/yếu vận mệnh.",
    toggleClose: "Đóng bảng",
    toggleOpen: "Xem dạng bảng",
    tableCaption: "Mức đóng góp theo góc nhìn",
    colLens: "Góc nhìn",
    colContribution: "Mức đóng góp",
    colBasis: "Căn cứ tính toán",
    confidenceNone: "Chưa tính toán",
    confidenceProvisional: "Không rõ giờ sinh — phạm vi khả năng",
    confidenceFull: "Đã tính toán xong",
  },
  hi: {
    radarTitle: "प्रणाली योगदान रडार",
    captionThree: "यह रिपोर्ट तीन दृष्टिकोणों के आधार पर लिखी गई है। प्रत्येक दृष्टिकोण की वास्तविक गणना का स्तर दिखाता है।",
    captionFive: "प्रत्येक दृष्टिकोण ने इस रिपोर्ट को वास्तव में कितना आधार दिया, यह दर्शाता है। यह भाग्य की मजबूती/कमजोरी नहीं है।",
    toggleClose: "तालिका बंद करें",
    toggleOpen: "तालिका के रूप में देखें",
    tableCaption: "दृष्टिकोण अनुसार योगदान",
    colLens: "दृष्टिकोण",
    colContribution: "योगदान",
    colBasis: "गणना आधार",
    confidenceNone: "गणना नहीं की गई",
    confidenceProvisional: "जन्म समय अज्ञात — संभावित सीमा",
    confidenceFull: "गणना पूर्ण",
  },
  es: {
    radarTitle: "Radar de contribución del sistema",
    captionThree: "Este informe se redactó con base en tres perspectivas. Muestra cuánto se calculó realmente cada perspectiva.",
    captionFive: "Cuánto aportó realmente cada perspectiva como evidencia a este informe. No es una puntuación de fuerza/debilidad.",
    toggleClose: "Cerrar tabla",
    toggleOpen: "Ver como tabla",
    tableCaption: "Contribución por perspectiva",
    colLens: "Perspectiva",
    colContribution: "Contribución",
    colBasis: "Base de cálculo",
    confidenceNone: "No calculado",
    confidenceProvisional: "Hora de nacimiento desconocida — rango posible",
    confidenceFull: "Cálculo completo",
  },
  fr: {
    radarTitle: "Radar de contribution des systèmes",
    captionThree: "Ce rapport a été rédigé selon trois perspectives. Indique à quel point chaque perspective a été réellement calculée.",
    captionFive: "À quel point chaque perspective a réellement fourni des preuves pour ce rapport. Pas un score de force/faiblesse.",
    toggleClose: "Fermer le tableau",
    toggleOpen: "Voir sous forme de tableau",
    tableCaption: "Contribution par perspective",
    colLens: "Perspective",
    colContribution: "Contribution",
    colBasis: "Base de calcul",
    confidenceNone: "Non calculé",
    confidenceProvisional: "Heure de naissance inconnue — plage possible",
    confidenceFull: "Calcul terminé",
  },
  de: {
    radarTitle: "System-Beitrags-Radar",
    captionThree: "Dieser Bericht wurde auf Grundlage von drei Perspektiven erstellt. Zeigt, wie stark jede Perspektive tatsächlich berechnet wurde.",
    captionFive: "Wie sehr jede Perspektive tatsächlich Belege zu diesem Bericht beigetragen hat. Keine Stärke-/Schwäche-Bewertung.",
    toggleClose: "Tabelle schließen",
    toggleOpen: "Als Tabelle ansehen",
    tableCaption: "Beitrag nach Perspektive",
    colLens: "Perspektive",
    colContribution: "Beitrag",
    colBasis: "Berechnungsgrundlage",
    confidenceNone: "Nicht berechnet",
    confidenceProvisional: "Geburtszeit unbekannt — möglicher Bereich",
    confidenceFull: "Berechnung abgeschlossen",
  },
  nl: {
    radarTitle: "Systeembijdrage-radar",
    captionThree: "Dit rapport is geschreven op basis van drie perspectieven. Toont hoeveel elk perspectief daadwerkelijk is berekend.",
    captionFive: "Hoeveel elk perspectief daadwerkelijk bewijs heeft geleverd voor dit rapport. Geen sterkte-/zwakte-score.",
    toggleClose: "Tabel sluiten",
    toggleOpen: "Als tabel bekijken",
    tableCaption: "Bijdrage per perspectief",
    colLens: "Perspectief",
    colContribution: "Bijdrage",
    colBasis: "Berekeningsgrondslag",
    confidenceNone: "Niet berekend",
    confidenceProvisional: "Geboortetijd onbekend — mogelijk bereik",
    confidenceFull: "Berekening voltooid",
  },
  ms: {
    radarTitle: "Radar sumbangan sistem",
    captionThree: "Laporan ini ditulis berdasarkan tiga perspektif. Menunjukkan sejauh mana setiap perspektif benar-benar dikira.",
    captionFive: "Sejauh mana setiap perspektif benar-benar menyumbang bukti kepada laporan ini. Bukan skor kekuatan/kelemahan.",
    toggleClose: "Tutup jadual",
    toggleOpen: "Lihat sebagai jadual",
    tableCaption: "Sumbangan mengikut perspektif",
    colLens: "Perspektif",
    colContribution: "Sumbangan",
    colBasis: "Asas pengiraan",
    confidenceNone: "Tidak dikira",
    confidenceProvisional: "Masa lahir tidak diketahui — julat kemungkinan",
    confidenceFull: "Pengiraan selesai",
  },
};

function getLensRadarCopy(locale: LoadingLocale): LensRadarCopy {
  return LENS_RADAR_COPY[locale] || LENS_RADAR_EN;
}

function useLensRadarCopy(): LensRadarCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    document.addEventListener("cd:language-change", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      document.removeEventListener("cd:language-change", sync);
    };
  }, []);
  return getLensRadarCopy(locale);
}

const SIZE = 300;
const CENTER = SIZE / 2;
const MAX_RADIUS = CENTER - 56;
const RINGS = [0.25, 0.5, 0.75, 1];

function pointAt(index: number, count: number, ratio: number) {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * MAX_RADIUS * ratio,
    y: CENTER + Math.sin(angle) * MAX_RADIUS * ratio,
  };
}

function polygon(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

/**
 * 체계 기여도 레이더.
 *
 * 🔴 축마다 색을 다르게 주지 않는다. 이건 identity 가 아니라 **한 시리즈의 크기 비교**이고,
 * 이 다크 표면에서 5색 categorical 팔레트는 색각 이상 분리 기준을 통과하지 못했다.
 * 체계 식별은 축 레이블 텍스트가 전담하고, 폴리곤은 단일 색으로 그린다.
 *
 * 레이더는 면적을 실제보다 크게 읽게 만들므로 다섯 축 전부에 값을 직접 붙인다.
 */
export default function LensRadar({ model, forceTable = false }: { model: RadarModel; forceTable?: boolean }) {
  const copy = useLensRadarCopy();
  const titleId = useId();
  const descId = useId();
  const gradientId = useId();
  const [tableOpen, setTableOpen] = useState(false);

  if (model.kind === "none") return null;

  const axes = model.axes;
  const count = axes.length;
  const valuePoints = axes.map((axis, index) => pointAt(index, count, Math.max(0, Math.min(100, axis.score)) / 100));
  const description = axes.map((axis) => `${axis.label} ${axis.score}%`).join(", ");
  const showTable = forceTable || tableOpen;

  return (
    <figure className="kdo-radar">
      <svg className="kdo-radar__svg" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
        <title id={titleId}>{copy.radarTitle}</title>
        <desc id={descId}>{description}</desc>
        <defs>
          {/* id 를 하드코딩하면 PDF 캡처에서 두 인스턴스가 충돌한다. */}
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--kdo-radar-fill-in)" />
            <stop offset="100%" stopColor="var(--kdo-radar-fill-out)" />
          </radialGradient>
        </defs>

        {RINGS.map((ring) => (
          <polygon
            key={ring}
            className="kdo-radar__ring"
            points={polygon(axes.map((_, index) => pointAt(index, count, ring)))}
          />
        ))}
        {axes.map((axis, index) => {
          const edge = pointAt(index, count, 1);
          return <line key={axis.key} className="kdo-radar__axis" x1={CENTER} y1={CENTER} x2={edge.x} y2={edge.y} />;
        })}

        <polygon className="kdo-radar__area" points={polygon(valuePoints)} fill={`url(#${gradientId})`} />
        {valuePoints.map((point, index) => (
          <circle key={axes[index].key} className="kdo-radar__node" cx={point.x} cy={point.y} r={4.5} />
        ))}

        {axes.map((axis, index) => {
          const label = pointAt(index, count, 1.19);
          const anchor = Math.abs(label.x - CENTER) < 12 ? "middle" : label.x > CENTER ? "start" : "end";
          return (
            <g key={`label-${axis.key}`}>
              <text className="kdo-radar__label" x={label.x} y={label.y} textAnchor={anchor}>{axis.label}</text>
              <text className="kdo-radar__value" x={label.x} y={label.y + 14} textAnchor={anchor}>{axis.score}%</text>
            </g>
          );
        })}
      </svg>

      <figcaption className="kdo-radar__caption">
        {model.kind === "three" ? copy.captionThree : copy.captionFive}
      </figcaption>

      {!forceTable && (
        <button
          type="button"
          className="kdo-radar__toggle"
          aria-expanded={tableOpen}
          onClick={() => setTableOpen((prev) => !prev)}
        >
          {tableOpen ? copy.toggleClose : copy.toggleOpen}
        </button>
      )}

      {/*
        표는 항상 DOM 에 둔다. display:none 으로 숨기면 스크린리더에서도 사라져
        레이더에 대한 유일한 대체 수단이 없어진다.
      */}
      <table className={`kdo-radar__table ${showTable ? "" : "kdo-visually-hidden"}`.trim()}>
        <caption>{copy.tableCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{copy.colLens}</th>
            <th scope="col">{copy.colContribution}</th>
            <th scope="col">{copy.colBasis}</th>
          </tr>
        </thead>
        <tbody>
          {axes.map((axis) => (
            <tr key={axis.key}>
              <th scope="row">{axis.label}</th>
              <td>{axis.score}%</td>
              <td>
                {axis.entry.basis?.confidence === "none"
                  ? copy.confidenceNone
                  : axis.entry.basis?.confidence === "provisional"
                    ? copy.confidenceProvisional
                    : copy.confidenceFull}
                {axis.entry.formula ? <span className="kdo-radar__formula">{axis.entry.formula}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
