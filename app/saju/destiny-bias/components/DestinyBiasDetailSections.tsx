"use client";

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import type { DestinyBiasResultViewModel } from "../lib/types";
import styles from "../destiny-bias.module.css";

const DESTINY_BIAS_DETAIL_TEXT_TRANSLATIONS = {
  ko: {
    profileTitle: "최애 에너지 타입",
    chemistryTitle: "나와 최애의 케미 포인트",
    flowTitle: "지금 이 순간의 에너지 흐름",
    supportTitle: "응원 타입 & 관계 무드",
    destinyTitle: "운명을 한 줄로 담으면",
    energySignatureAria: "상대방 에너지 시그니처 SVG",
    profileSummary: (name: string, type: string, comment: string) => `${name}의 에너지 코어는 '${type}'이에요. ${comment}`,
    chemistrySummary: (summary: string) => `둘의 기본 결은 "${summary}"로 이어져 있어요`,
    chemistryDesc: (detail: string, alias: string) => `${detail}\n\n페어링 별칭은 ${alias}입니다.`,
    flowSummary: (signal: string) => `지금 에너지 흐름이 '${signal}' 직선으로 모이고 있어요`,
    flowDesc: (detail: string, mission: string) => `${detail}\n\n오늘의 미션: ${mission}`,
    supportSummary: (mood: string, type: string) => `${mood} 모드일 때 ${type} 공명이 제일 강하게 올라와요`,
    cheerPoint: (value: string) => `응원 운영 포인트: ${value}`,
    energyCommentary: (value: string) => `에너지 해설: ${value}`,
    keywords: (keywords: string, tags: string) => `추천 키워드: ${keywords} · 매칭 태그: ${tags}`,
  },
  en: {
    profileTitle: "Bias Energy Type",
    chemistryTitle: "Chemistry Point Between You",
    flowTitle: "Energy Flow Right Now",
    supportTitle: "Support Type & Relationship Mood",
    destinyTitle: "Your Destiny in One Line",
    energySignatureAria: "Bias energy signature SVG",
    profileSummary: (name: string, type: string, comment: string) => `${name}'s energy core is “${type}.” ${comment}`,
    chemistrySummary: (summary: string) => `Your shared texture connects as “${summary}.”`,
    chemistryDesc: (detail: string, alias: string) => `${detail}\n\nPairing alias: ${alias}.`,
    flowSummary: (signal: string) => `The current energy flow is gathering into the “${signal}” line.`,
    flowDesc: (detail: string, mission: string) => `${detail}\n\nToday's mission: ${mission}`,
    supportSummary: (mood: string, type: string) => `${type} resonance rises strongest in ${mood} mode.`,
    cheerPoint: (value: string) => `Support point: ${value}`,
    energyCommentary: (value: string) => `Energy commentary: ${value}`,
    keywords: (keywords: string, tags: string) => `Recommended keywords: ${keywords} · Matching tags: ${tags}`,
  },
  ja: {
    profileTitle: "推しのエネルギータイプ",
    chemistryTitle: "私と推しのケミストリーポイント",
    flowTitle: "今この瞬間のエネルギーの流れ",
    supportTitle: "応援タイプ＆関係ムード",
    destinyTitle: "運命を一行に映すなら",
    energySignatureAria: "相手のエネルギーシグネチャーSVG",
    profileSummary: (name: string, type: string, comment: string) => `${name}のエネルギーコアは「${type}」です。${comment}`,
    chemistrySummary: (summary: string) => `二人の基本の質感は「${summary}」としてつながっています。`,
    chemistryDesc: (detail: string, alias: string) => `${detail}\n\nペアリング別名は ${alias} です。`,
    flowSummary: (signal: string) => `今のエネルギーの流れは「${signal}」のラインへ集まっています。`,
    flowDesc: (detail: string, mission: string) => `${detail}\n\n今日のミッション: ${mission}`,
    supportSummary: (mood: string, type: string) => `${mood}モードのとき、${type}の共鳴がいちばん強く高まります。`,
    cheerPoint: (value: string) => `応援の運用ポイント: ${value}`,
    energyCommentary: (value: string) => `エネルギー解説: ${value}`,
    keywords: (keywords: string, tags: string) => `おすすめキーワード: ${keywords} · マッチングタグ: ${tags}`,
  },
} as const;

function destinyBiasDetailCopy(locale: LoadingLocale) {
  return DESTINY_BIAS_DETAIL_TEXT_TRANSLATIONS[locale as keyof typeof DESTINY_BIAS_DETAIL_TEXT_TRANSLATIONS] || DESTINY_BIAS_DETAIL_TEXT_TRANSLATIONS.en;
}

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
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const copy = destinyBiasDetailCopy(locale);
  const energySvgMarkup = vm.biasEnergySvg.replace(/^<\?xml[^>]*>\s*/i, "");

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  const profileSummary = copy.profileSummary(vm.biasName, vm.biasEnergyType, vm.stageAuraComment);
  const profileDesc = vm.biasPersonalityReport;

  const chemistrySummary = copy.chemistrySummary(vm.chemistrySummary);
  const chemistryDesc = copy.chemistryDesc(vm.compatibilityDetail, vm.pairingAlias);

  const flowSummary = copy.flowSummary(vm.destinySignal);
  const flowDesc = copy.flowDesc(vm.energyConnectionDetail, vm.todayMission);

  const supportSummary = copy.supportSummary(vm.relationMood, vm.biasEnergyType);
  const supportDesc = [
    copy.cheerPoint(vm.cheerPoint),
    copy.energyCommentary(vm.biasEnergySummary),
    copy.keywords(vm.moodKeywords.slice(0, 3).join(", "), vm.matchingTags.slice(0, 3).join(", ")),
  ].join("\n\n");

  const destinySummary = vm.oneLineDestinyMessage;
  const destinyDesc = vm.fansignMessage;

  return (
    <section className="space-y-3">
      <DetailCard
        icon="✦"
        kicker="BIAS ENERGY TYPE"
        title={copy.profileTitle}
        summary={profileSummary}
        description={profileDesc}
      />

      <DetailCard
        icon="♬"
        kicker="CHEMISTRY MATCH"
        title={copy.chemistryTitle}
        summary={chemistrySummary}
        description={chemistryDesc}
      />

      <DetailCard
        icon="⚡"
        kicker="EMOTION FLOW"
        title={copy.flowTitle}
        summary={flowSummary}
        description={flowDesc}
      />

      <article className={styles.detailFlowCard}>
        <div className="flex items-center gap-2">
          <span className="text-sm" aria-hidden>◎</span>
          <p className="text-[10px] font-semibold tracking-[0.15em] text-cyan-100/80">ENERGY SIGNATURE</p>
        </div>
        <div className={styles.auroraDiv} style={{ marginTop: 8, marginBottom: 10 }} aria-hidden />
        <h3 className="text-sm font-extrabold leading-snug text-white">{copy.supportTitle}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-pink-100/90">{supportSummary}</p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/15 bg-black/30 p-1">
          <div
            aria-label={copy.energySignatureAria}
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
        title={copy.destinyTitle}
        summary={destinySummary}
        description={destinyDesc}
      />
    </section>
  );
}
