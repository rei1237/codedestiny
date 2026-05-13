"use client";

import type { DestinyBiasResultViewModel } from "../lib/types";
import styles from "../destiny-bias.module.css";

function compactText(value: string, maxLength: number) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
}

function DetailCard({
  icon,
  kicker,
  title,
  summary,
  description,
}: {
  icon: string;
  kicker: string;
  title: string;
  summary: string;
  description: string;
}) {
  return (
    <article className={styles.detailFlowCard}>
      <div className="flex items-center gap-2">
        <span className="text-sm" aria-hidden>{icon}</span>
        <p className="text-[10px] font-semibold tracking-[0.15em] text-cyan-100/80">{kicker}</p>
      </div>
      <div className={styles.auroraDiv} style={{ marginTop: 8, marginBottom: 10 }} aria-hidden />
      <h3 className="text-sm font-extrabold leading-snug text-white">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-pink-100/90">{summary}</p>
      <p className="mt-2 text-sm leading-7 text-white/82">{description}</p>
    </article>
  );
}

export default function DestinyBiasDetailSections({ vm }: { vm: DestinyBiasResultViewModel }) {
  const energySvgMarkup = vm.biasEnergySvg.replace(/^<\?xml[^>]*>\s*/i, "");

  const profileSummary = `최애의 무드 중심은 ${vm.biasEnergyType}이고, 무대 위 아우라는 ${vm.stageAuraComment}`;
  const profileDesc = compactText(vm.biasPersonalityReport, 180);

  const chemistrySummary = `당신과 최애의 기본 결은 ${vm.chemistrySummary}`;
  const chemistryDesc = compactText(`${vm.compatibilityDetail} 페어링 별칭은 ${vm.pairingAlias}입니다.`, 180);

  const flowSummary = `지금의 에너지 흐름은 ${vm.destinySignal} 쪽으로 선명하게 기울고 있어요.`;
  const flowDesc = compactText(`${vm.energyConnectionDetail} 오늘의 미션은 ${vm.todayMission}`, 180);

  const supportSummary = `응원 포인트는 ${vm.cheerPoint}이고, 관계 무드는 ${vm.relationMood}입니다.`;
  const supportDesc = compactText(
    `추천 키워드는 ${vm.moodKeywords.slice(0, 3).join(", ")}이며, 매칭 태그는 ${vm.matchingTags.slice(0, 3).join(", ")}입니다.`,
    180,
  );

  const destinySummary = vm.oneLineDestinyMessage;
  const destinyDesc = compactText(vm.fansignMessage, 160);

  return (
    <section className="space-y-3">
      <DetailCard
        icon="✦"
        kicker="BIAS PROFILE"
        title="최애 성향 분석"
        summary={profileSummary}
        description={profileDesc}
      />

      <DetailCard
        icon="♬"
        kicker="CHEMISTRY MATCH"
        title="나와 최애의 궁합 포인트"
        summary={chemistrySummary}
        description={chemistryDesc}
      />

      <DetailCard
        icon="⚡"
        kicker="EMOTION FLOW"
        title="감정 온도 / 에너지 흐름"
        summary={flowSummary}
        description={flowDesc}
      />

      <article className={styles.detailFlowCard}>
        <div className="flex items-center gap-2">
          <span className="text-sm" aria-hidden>◎</span>
          <p className="text-[10px] font-semibold tracking-[0.15em] text-cyan-100/80">ENERGY SIGNATURE</p>
        </div>
        <div className={styles.auroraDiv} style={{ marginTop: 8, marginBottom: 10 }} aria-hidden />
        <h3 className="text-sm font-extrabold leading-snug text-white">응원 타입 / 관계 무드</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-pink-100/90">{supportSummary}</p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/15 bg-black/30 p-1">
          <div
            aria-label="상대방 에너지 시그니처 SVG"
            className={styles.svgPreviewWrap}
            dangerouslySetInnerHTML={{ __html: energySvgMarkup }}
          />
        </div>
        <p className="mt-3 text-sm leading-7 text-white/82">{supportDesc}</p>
      </article>

      <DetailCard
        icon="💌"
        kicker="DESTINY LINE"
        title="한 줄 운명 해석"
        summary={destinySummary}
        description={destinyDesc}
      />
    </section>
  );
}
