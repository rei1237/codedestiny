"use client";

import type { AnimalDestinyData } from "@/app/saju/animal-destiny/lib/types";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type Props = {
  animal: AnimalDestinyData;
};

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-[#ddcfb7] bg-[linear-gradient(165deg,rgba(255,255,255,0.97),rgba(253,247,237,0.92))] p-6 shadow-[0_18px_36px_rgba(46,31,16,0.11)]">
      <h4 className="mb-4 text-xl font-black tracking-tight text-[#5f3618]">{title}</h4>
      {children}
    </section>
  );
}

function ParagraphList({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-3.5">
      {lines.map((line, index) => (
        <p key={`${index}-${line.slice(0, 12)}`} className="text-sm leading-[1.72] text-[#5a3416]">
          {line}
        </p>
      ))}
    </div>
  );
}

const ANIMAL_RESULT_SECTIONS_TEXT_TRANSLATIONS = {
  ko: {
    personality: "성격 분석",
    love: "연애 스타일",
    relationship: "인간관계 스타일",
    friends: "친구 관계:",
    workSocial: "직장/사회:",
    family: "가족 관계:",
    distancePoint: "거리두기 포인트:",
    bestFit: "잘 맞는 분위기:",
    career: "직업 · 진로 성향",
    workStyle: "업무 스타일:",
    goodFields: "잘 맞는 직업군:",
    avoidFields: "피해야 할 환경:",
    moneyCondition: "돈이 붙는 조건:",
    growthAdvice: "장기 성장 조언:",
    money: "재물운 · 돈 관리",
    moneyFlow: "돈이 들어오는 방식:",
    spendingPattern: "돈이 새는 패턴:",
    savingAdvice: "저축/투자 조언:",
    habitTip: "운을 높이는 습관:",
    daily: "오늘의 동물 운세",
    dailyMessage: "한 줄 운세:",
    luckyAction: "행운 행동:",
    caution: "피해야 할 행동:",
    luckyColor: "행운 색:",
    luckyItem: "행운 아이템:",
  },
  en: {
    personality: "Personality Analysis",
    love: "Love Style",
    relationship: "Relationship Style",
    friends: "Friendships:",
    workSocial: "Work/Social:",
    family: "Family:",
    distancePoint: "Boundary point:",
    bestFit: "Best-fitting mood:",
    career: "Career Tendency",
    workStyle: "Work style:",
    goodFields: "Best fields:",
    avoidFields: "Environments to avoid:",
    moneyCondition: "Money-attracting condition:",
    growthAdvice: "Long-term growth advice:",
    money: "Wealth and Money Management",
    moneyFlow: "How money comes in:",
    spendingPattern: "Spending leak pattern:",
    savingAdvice: "Saving/investment advice:",
    habitTip: "Habit that raises luck:",
    daily: "Today's Animal Fortune",
    dailyMessage: "One-line fortune:",
    luckyAction: "Lucky action:",
    caution: "Action to avoid:",
    luckyColor: "Lucky color:",
    luckyItem: "Lucky item:",
  },
  ja: {
    personality: "性格分析",
    love: "恋愛スタイル",
    relationship: "人間関係スタイル",
    friends: "友人関係:",
    workSocial: "職場/社会:",
    family: "家族関係:",
    distancePoint: "距離の取り方:",
    bestFit: "合う雰囲気:",
    career: "仕事・進路傾向",
    workStyle: "仕事スタイル:",
    goodFields: "合う職業群:",
    avoidFields: "避けたい環境:",
    moneyCondition: "お金が集まる条件:",
    growthAdvice: "長期成長アドバイス:",
    money: "金運・お金管理",
    moneyFlow: "お金の入り方:",
    spendingPattern: "お金が漏れるパターン:",
    savingAdvice: "貯蓄/投資アドバイス:",
    habitTip: "運を高める習慣:",
    daily: "今日の動物運勢",
    dailyMessage: "一言運勢:",
    luckyAction: "幸運行動:",
    caution: "避けたい行動:",
    luckyColor: "幸運色:",
    luckyItem: "幸運アイテム:",
  },
  "zh-CN": {
    personality: "性格分析",
    love: "恋爱风格",
    relationship: "人际关系风格",
    friends: "朋友关系:",
    workSocial: "职场/社会:",
    family: "家庭关系:",
    distancePoint: "距离感重点:",
    bestFit: "适合的氛围:",
    career: "职业与发展倾向",
    workStyle: "工作风格:",
    goodFields: "适合职业:",
    avoidFields: "应避开的环境:",
    moneyCondition: "聚财条件:",
    growthAdvice: "长期成长建议:",
    money: "财运与金钱管理",
    moneyFlow: "金钱进入方式:",
    spendingPattern: "漏财模式:",
    savingAdvice: "储蓄/投资建议:",
    habitTip: "提升运势的习惯:",
    daily: "今日动物运势",
    dailyMessage: "一句运势:",
    luckyAction: "幸运行动:",
    caution: "应避免的行动:",
    luckyColor: "幸运色:",
    luckyItem: "幸运物品:",
  },
  "zh-TW": {
    personality: "性格分析",
    love: "戀愛風格",
    relationship: "人際關係風格",
    friends: "朋友關係:",
    workSocial: "職場/社會:",
    family: "家庭關係:",
    distancePoint: "距離感重點:",
    bestFit: "適合的氛圍:",
    career: "職業與發展傾向",
    workStyle: "工作風格:",
    goodFields: "適合職業:",
    avoidFields: "應避開的環境:",
    moneyCondition: "聚財條件:",
    growthAdvice: "長期成長建議:",
    money: "財運與金錢管理",
    moneyFlow: "金錢進入方式:",
    spendingPattern: "漏財模式:",
    savingAdvice: "儲蓄/投資建議:",
    habitTip: "提升運勢的習慣:",
    daily: "今日動物運勢",
    dailyMessage: "一句運勢:",
    luckyAction: "幸運行動:",
    caution: "應避免的行動:",
    luckyColor: "幸運色:",
    luckyItem: "幸運物品:",
  },
} as const;

function getAnimalResultSectionsCopy(locale: LoadingLocale) {
  if (locale === "en" || locale === "ja" || locale === "zh-CN" || locale === "zh-TW") {
    return ANIMAL_RESULT_SECTIONS_TEXT_TRANSLATIONS[locale];
  }
  return ANIMAL_RESULT_SECTIONS_TEXT_TRANSLATIONS.ko;
}

export default function AnimalResultSections({ animal }: Props) {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getAnimalResultSectionsCopy(locale);
  const profile = animal.profile;

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    return () => window.removeEventListener("cd:locale-ready", syncLocale);
  }, []);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard title={copy.personality}>
        <ParagraphList lines={profile.personality.paragraphs} />
      </SectionCard>

      <SectionCard title={copy.love}>
        <ParagraphList lines={profile.love.paragraphs} />
      </SectionCard>

      <SectionCard title={copy.relationship}>
        <div className="space-y-3.5 text-sm leading-[1.72] text-[#5a3416]">
          <p><span className="font-bold text-[#6b3f1d]">{copy.friends}</span> {profile.relationship.friends}</p>
          <p><span className="font-bold text-[#6b3f1d]">{copy.workSocial}</span> {profile.relationship.work}</p>
          <p><span className="font-bold text-[#6b3f1d]">{copy.family}</span> {profile.relationship.family}</p>
          <p><span className="font-bold text-[#6b3f1d]">{copy.distancePoint}</span> {profile.relationship.caution}</p>
          <p><span className="font-bold text-[#6b3f1d]">{copy.bestFit}</span> {profile.relationship.bestFit}</p>
        </div>
      </SectionCard>

      <SectionCard title={copy.career}>
        <div className="space-y-3.5 text-sm leading-[1.72] text-[#5a3416]">
          <p><span className="font-bold text-[#6b3f1d]">{copy.workStyle}</span> {profile.career.workStyle}</p>
          <p><span className="font-bold text-[#6b3f1d]">{copy.goodFields}</span> {profile.career.goodFields.join(", ")}</p>
          <p><span className="font-bold text-[#6b3f1d]">{copy.avoidFields}</span> {profile.career.avoidFields.join(", ")}</p>
          <p><span className="font-bold text-[#6b3f1d]">{copy.moneyCondition}</span> {profile.career.moneyBoostCondition}</p>
          <p><span className="font-bold text-[#6b3f1d]">{copy.growthAdvice}</span> {profile.career.growthAdvice}</p>
        </div>
      </SectionCard>

      <SectionCard title={copy.money}>
        <div className="space-y-3.5 text-sm leading-[1.72] text-[#5a3416]">
          <p><span className="font-bold text-[#6b3f1d]">{copy.moneyFlow}</span> {profile.money.moneyFlow}</p>
          <p><span className="font-bold text-[#6b3f1d]">{copy.spendingPattern}</span> {profile.money.spendingPattern}</p>
          <p><span className="font-bold text-[#6b3f1d]">{copy.savingAdvice}</span> {profile.money.savingAdvice}</p>
          <p><span className="font-bold text-[#6b3f1d]">{copy.habitTip}</span> {profile.money.habitTip}</p>
        </div>
      </SectionCard>

      <SectionCard title={copy.daily}>
        <div className="space-y-3.5 text-sm leading-[1.72] text-[#5a3416]">
          <p><span className="font-bold text-[#6b3f1d]">{copy.dailyMessage}</span> {profile.daily.message}</p>
          <p><span className="font-bold text-[#6b3f1d]">{copy.luckyAction}</span> {profile.daily.luckyAction}</p>
          <p><span className="font-bold text-[#6b3f1d]">{copy.caution}</span> {profile.daily.caution}</p>
          <p><span className="font-bold text-[#6b3f1d]">{copy.luckyColor}</span> {profile.daily.luckyColor}</p>
          <p><span className="font-bold text-[#6b3f1d]">{copy.luckyItem}</span> {profile.daily.luckyItem}</p>
        </div>
      </SectionCard>
    </div>
  );
}
