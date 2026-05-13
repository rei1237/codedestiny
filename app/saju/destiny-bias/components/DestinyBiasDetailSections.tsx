"use client";

import type { DestinyBiasResultViewModel } from "../lib/types";
import styles from "../destiny-bias.module.css";

const SECTION_ICONS: Record<string, string> = {
  "AURA PROFILE": "✦",
  "RHYTHM MATCH": "♬",
  "ENERGY LINK": "⚡",
  "ENERGY SIGNATURE": "◎",
  "FANSIGN MOMENT": "💌",
};

function ProgramSection({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  const icon = SECTION_ICONS[label] ?? "·";
  return (
    <article className={styles.programCard}>
      <div className="flex items-center gap-2">
        <span className="text-sm" aria-hidden>{icon}</span>
        <p className="text-[10px] font-semibold tracking-[0.16em] text-cyan-100/80">{label}</p>
      </div>
      <div className={styles.auroraDiv} style={{ marginTop: 8, marginBottom: 10 }} aria-hidden />
      <h3 className="text-sm font-extrabold leading-snug text-white">{title}</h3>
      <p className="mt-3 whitespace-pre-line text-sm leading-[1.75] text-white/82">{body}</p>
    </article>
  );
}

export default function DestinyBiasDetailSections({ vm }: { vm: DestinyBiasResultViewModel }) {
  const energySvgMarkup = vm.biasEnergySvg.replace(/^<\?xml[^>]*>\s*/i, "");

  const profileBody = [
    vm.biasPersonalityReport,
    `에너지 기질: ${vm.biasEnergyType}`,
    `무대 아우라: ${vm.stageAuraComment}`,
  ].join("\n\n");

  const compatibilityBody = [
    vm.compatibilityDetail,
    `케미 요약: ${vm.chemistrySummary}`,
    `페어링 별칭: ${vm.pairingAlias}`,
  ].join("\n\n");

  const connectionBody = [
    vm.energyConnectionDetail,
    `운명 시그널: ${vm.destinySignal}`,
    `이번 달 응원 포인트: ${vm.cheerPoint}`,
    `오늘의 응원 미션: ${vm.todayMission}`,
  ].join("\n\n");

  const energySignatureBody = [
    vm.biasEnergySummary,
    `연결 키워드: ${vm.connectionKeyword.join(", ")}`,
    `공명 색상: ${vm.energyColor}`,
  ].join("\n\n");

  const fansignBody = [
    `팬싸인 감성 메시지: ${vm.fansignMessage}`,
    `한 줄 운명 메시지: ${vm.oneLineDestinyMessage}`,
    `추천 덕질 무드: ${vm.moodKeywords.join(", ")}`,
    `매칭 태그: ${vm.matchingTags.join(", ")}`,
  ].join("\n\n");

  return (
    <section className="space-y-2">
      <ProgramSection label="AURA PROFILE" title="무대 위 최애의 아우라" body={profileBody} />
      <ProgramSection label="RHYTHM MATCH" title="당신과 최애의 리듬이 만나는 방식" body={compatibilityBody} />
      <ProgramSection label="ENERGY LINK" title="내 사주 에너지가 최애에게 닿는 방식" body={connectionBody} />
      <article className={styles.programCard}>
        <div className="flex items-center gap-2">
          <span className="text-sm" aria-hidden>◎</span>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-cyan-100/80">ENERGY SIGNATURE</p>
        </div>
        <div className={styles.auroraDiv} style={{ marginTop: 8, marginBottom: 10 }} aria-hidden />
        <h3 className="text-sm font-extrabold leading-snug text-white">상대방 에너지 시그니처 SVG</h3>
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/15 bg-black/30">
          <div
            aria-label="상대방 에너지 시그니처 SVG"
            className={styles.svgPreviewWrap}
            dangerouslySetInnerHTML={{ __html: energySvgMarkup }}
          />
        </div>
        <p className="mt-3 whitespace-pre-line text-sm leading-[1.75] text-white/82">{energySignatureBody}</p>
      </article>
      <ProgramSection label="FANSIGN MOMENT" title="오늘의 덕질 포인트와 팬싸인 메시지" body={fansignBody} />
    </section>
  );
}
