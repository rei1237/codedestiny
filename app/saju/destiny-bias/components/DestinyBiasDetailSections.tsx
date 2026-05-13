"use client";

import type { DestinyBiasResultViewModel } from "../lib/types";
import styles from "../destiny-bias.module.css";

function toParagraphs(value: string) {
  return String(value || "")
    .split(/\n{2,}/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);
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
      <div className="mt-2 space-y-2 text-sm leading-7 text-white/82">
        {toParagraphs(description).map((paragraph, index) => (
          <p key={`${title}-${index}`}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}

export default function DestinyBiasDetailSections({ vm }: { vm: DestinyBiasResultViewModel }) {
  const energySvgMarkup = vm.biasEnergySvg.replace(/^<\?xml[^>]*>\s*/i, "");

  const profileSummary = `${vm.biasName}의 에너지 코어는 '${vm.biasEnergyType}'이에요. ${vm.stageAuraComment}`;
  const profileDesc = vm.biasPersonalityReport;

  const chemistrySummary = `둘의 기본 결은 "${vm.chemistrySummary}"로 이어져 있어요`;
  const chemistryDesc = `${vm.compatibilityDetail}\n\n페어링 별칭은 ${vm.pairingAlias}입니다.`;

  const flowSummary = `지금 에너지 흐름이 '${vm.destinySignal}' 직선으로 모이고 있어요`;
  const flowDesc = `${vm.energyConnectionDetail}\n\n오늘의 미션: ${vm.todayMission}`;

  const supportSummary = `${vm.relationMood} 모드일 때 ${vm.biasEnergyType} 공명이 제일 강하게 올라와요`;
  const supportDesc = [
    `응원 운영 포인트: ${vm.cheerPoint}`,
    `에너지 해설: ${vm.biasEnergySummary}`,
    `추천 키워드: ${vm.moodKeywords.slice(0, 3).join(", ")} · 매칭 태그: ${vm.matchingTags.slice(0, 3).join(", ")}`,
  ].join("\n\n");

  const destinySummary = vm.oneLineDestinyMessage;
  const destinyDesc = vm.fansignMessage;

  return (
    <section className="space-y-3">
      <DetailCard
        icon="✦"
        kicker="BIAS ENERGY TYPE"
        title="최애 에너지 타입"
        summary={profileSummary}
        description={profileDesc}
      />

      <DetailCard
        icon="♬"
        kicker="CHEMISTRY MATCH"
        title="나와 최애의 케미 포인트"
        summary={chemistrySummary}
        description={chemistryDesc}
      />

      <DetailCard
        icon="⚡"
        kicker="EMOTION FLOW"
        title="지금 이 순간의 에너지 흐름"
        summary={flowSummary}
        description={flowDesc}
      />

      <article className={styles.detailFlowCard}>
        <div className="flex items-center gap-2">
          <span className="text-sm" aria-hidden>◎</span>
          <p className="text-[10px] font-semibold tracking-[0.15em] text-cyan-100/80">ENERGY SIGNATURE</p>
        </div>
        <div className={styles.auroraDiv} style={{ marginTop: 8, marginBottom: 10 }} aria-hidden />
        <h3 className="text-sm font-extrabold leading-snug text-white">응원 타입 &amp; 관계 무드</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-pink-100/90">{supportSummary}</p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/15 bg-black/30 p-1">
          <div
            aria-label="상대방 에너지 시그니처 SVG"
            className={styles.svgPreviewWrap}
            dangerouslySetInnerHTML={{ __html: energySvgMarkup }}
          />
        </div>
        <div className="mt-3 space-y-2 text-sm leading-7 text-white/82">
          {toParagraphs(supportDesc).map((paragraph, index) => (
            <p key={`support-${index}`}>{paragraph}</p>
          ))}
        </div>
      </article>

      <DetailCard
        icon="💌"
        kicker="DESTINY LINE"
        title="운명을 한 줄로 담으면"
        summary={destinySummary}
        description={destinyDesc}
      />
    </section>
  );
}
