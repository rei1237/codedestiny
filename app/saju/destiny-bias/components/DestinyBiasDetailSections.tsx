"use client";

import type { DestinyBiasResultViewModel } from "../lib/types";
import styles from "../destiny-bias.module.css";

function SectionCard({ title, body }: { title: string; body: string }) {
  return (
    <article className={`rounded-3xl p-5 ${styles.glass}`}>
      <h3 className="text-base font-extrabold text-white">{title}</h3>
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-white/88">{body}</p>
    </article>
  );
}

export default function DestinyBiasDetailSections({
  vm,
}: {
  vm: DestinyBiasResultViewModel;
}) {
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

  const fansignBody = [
    `팬싸인 감성 메시지: ${vm.fansignMessage}`,
    `한 줄 운명 메시지: ${vm.oneLineDestinyMessage}`,
    `추천 덕질 무드: ${vm.moodKeywords.join(", ")}`,
    `매칭 태그: ${vm.matchingTags.join(", ")}`,
  ].join("\n\n");

  return (
    <section className="space-y-3">
      <SectionCard title="최애 성향 분석" body={profileBody} />
      <SectionCard title="최애와의 궁합" body={compatibilityBody} />
      <SectionCard title="에너지 연결 리포트" body={connectionBody} />
      <SectionCard title="팬싸인 감성 메시지" body={fansignBody} />
    </section>
  );
}
