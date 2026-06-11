"use client";

import { useMemo } from "react";
import type { ReactNode, RefObject } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Download, HeartHandshake, Share2, ShieldCheck, Sparkles } from "lucide-react";
import {
  analyzeGuardianSaju,
  formatGuardianBasisLine,
  getAnimalDisplayData,
  getElementLabel,
  getGuardianAnimalProfile,
  getTenGodLabel,
  type GuardianAnimalProfile,
} from "../lib/animalMapping";
import type { AnimalDestinyData, AnimalDestinyInput, AnimalId, PartnerResult, SajuEngineResult, TwelveStagePillars } from "../lib/types";
import type { TamagotchiCareAction, TamagotchiPetState } from "../store/useAnimalDestinyStore";

type Props = {
  animal: AnimalDestinyData;
  twelveStages: TwelveStagePillars;
  sajuResult: SajuEngineResult | null;
  timeUnknown?: boolean;
  partner: PartnerResult;
  shareCardRef: RefObject<HTMLDivElement>;
  onSubmitPartner: (input: AnimalDestinyInput) => Promise<void>;
  onSaveCard: () => void;
  onShareCard: () => void;
  isExporting: boolean;
  tamagotchi: TamagotchiPetState | null;
  tamagotchiStatus: "idle" | "syncing" | "saving" | "error";
  tamagotchiMessage: string;
  tamagotchiIsLoggedIn: boolean;
  onCareTamagotchi: (action: TamagotchiCareAction) => Promise<void>;
};

const PROFILE_ROWS = [
  { label: "수호동물", key: "name" },
  { label: "가디언 타입", key: "guardianType" },
  { label: "행운 키워드", key: "keywords" },
  { label: "주의 키워드", key: "cautionKeywords" },
] as const;

function compactName(profile: GuardianAnimalProfile | null) {
  return profile?.name.replace(/\s*가디언|\s*기사/g, "") || "수호동물";
}

function getGuardianList(ids: AnimalId[]) {
  return ids
    .map((id) => getGuardianAnimalProfile(id))
    .filter((profile): profile is GuardianAnimalProfile => Boolean(profile));
}

function GuardianMascot({ profile }: { profile: GuardianAnimalProfile }) {
  return (
    <svg viewBox="0 0 320 320" role="img" aria-label={`${profile.name} 2D 수호동물 카드`} className="h-full w-full">
      <defs>
        <radialGradient id={`guardian-orb-${profile.assetKey}`} cx="50%" cy="38%" r="62%">
          <stop offset="0%" stopColor={profile.palette.secondary} stopOpacity="0.95" />
          <stop offset="54%" stopColor={profile.palette.primary} stopOpacity="0.78" />
          <stop offset="100%" stopColor={profile.palette.background} stopOpacity="0.98" />
        </radialGradient>
        <linearGradient id={`guardian-ring-${profile.assetKey}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={profile.palette.accent} />
          <stop offset="100%" stopColor={profile.palette.secondary} />
        </linearGradient>
      </defs>
      <rect width="320" height="320" rx="54" fill={`url(#guardian-orb-${profile.assetKey})`} />
      <circle cx="160" cy="154" r="106" fill="rgba(255,255,255,0.12)" />
      <circle cx="160" cy="154" r="118" fill="none" stroke={`url(#guardian-ring-${profile.assetKey})`} strokeWidth="4" strokeDasharray="12 10" opacity="0.78" />
      <g opacity="0.78" fill={profile.palette.accent}>
        <circle cx="62" cy="78" r="4" />
        <circle cx="258" cy="68" r="3" />
        <circle cx="279" cy="226" r="4" />
        <circle cx="44" cy="238" r="3" />
        <path d="M88 42l5 11 12 2-9 8 2 12-10-6-11 6 2-12-9-8 12-2z" />
        <path d="M244 112l4 8 9 2-7 6 2 9-8-5-8 5 2-9-7-6 9-2z" />
      </g>
      <g transform="translate(66 58)">
        <path d="M94 28c48 0 86 37 86 86 0 55-38 96-86 96S8 169 8 114C8 65 46 28 94 28z" fill="rgba(255,255,255,0.82)" />
        <path d="M44 76c-8-28 1-48 18-62 10 14 14 30 10 48" fill="rgba(255,255,255,0.74)" stroke={profile.palette.accent} strokeWidth="5" strokeLinecap="round" />
        <path d="M144 76c8-28-1-48-18-62-10 14-14 30-10 48" fill="rgba(255,255,255,0.74)" stroke={profile.palette.accent} strokeWidth="5" strokeLinecap="round" />
        <circle cx="66" cy="112" r="7" fill={profile.palette.background} />
        <circle cx="122" cy="112" r="7" fill={profile.palette.background} />
        <path d="M82 140c10 9 24 9 34 0" fill="none" stroke={profile.palette.background} strokeWidth="6" strokeLinecap="round" />
        <text x="94" y="104" textAnchor="middle" dominantBaseline="middle" fontSize="70">
          {profile.symbol}
        </text>
      </g>
      <path d="M78 266c48 21 119 21 168 0" fill="none" stroke={profile.palette.accent} strokeWidth="7" strokeLinecap="round" opacity="0.68" />
    </svg>
  );
}

function CardShell({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`rounded-[2rem] border border-white/16 bg-white/10 p-5 shadow-[0_18px_48px_rgba(6,8,30,0.24)] backdrop-blur-2xl ${className}`}>
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-[#7ef1de]">
          {icon}
        </span>
        <h3 className="text-lg font-black text-white">{title}</h3>
      </div>
      {children}
    </article>
  );
}

export default function AnimalResultScreen({
  animal,
  twelveStages,
  sajuResult,
  timeUnknown,
  partner,
  shareCardRef,
  onSaveCard,
  onShareCard,
  isExporting,
}: Props) {
  const guardian = getGuardianAnimalProfile(animal.id) || getGuardianAnimalProfile("cheetah")!;
  const basis = useMemo(() => analyzeGuardianSaju(sajuResult), [sajuResult]);
  const basisLine = useMemo(() => formatGuardianBasisLine(basis), [basis]);
  const compatibleGuardians = useMemo(() => getGuardianList(guardian.goodMatches), [guardian.goodMatches]);
  const cautionGuardians = useMemo(() => getGuardianList(guardian.cautionMatches), [guardian.cautionMatches]);
  const representativeStage = twelveStages.day || twelveStages.primary || animal.saju_stage;
  const elementSpread = Object.entries(basis.elementCounts)
    .map(([key, value]) => `${getElementLabel(key as keyof typeof basis.elementCounts)} ${value}`)
    .join(" · ");

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 pb-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-[2.4rem] border border-white/16 bg-white/10 p-5 shadow-[0_28px_80px_rgba(5,8,28,0.35)] backdrop-blur-2xl sm:p-7"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(126,241,222,0.18),transparent_32%),radial-gradient(circle_at_86%_14%,rgba(255,211,108,0.18),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.12),transparent_48%)]" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-[#7ef1de]/30 bg-[#7ef1de]/12 px-3 py-1 text-xs font-black tracking-[0.2em] text-[#bffff5]">
              FIXED 2D GUARDIAN CARD
            </div>
            <div>
              <p className="text-sm font-black text-[#ffd36c]">당신의 사주 가디언은</p>
              <h1 className="mt-2 text-balance text-4xl font-black leading-tight text-white sm:text-6xl">
                {guardian.name}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-relaxed text-white/76">
                {guardian.intro}
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-white/14 bg-white/10 p-4">
              <p className="text-sm font-black leading-relaxed text-[#fff2b8]">{guardian.oneLine}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {guardian.keywords.map((keyword) => (
                <span key={keyword} className="rounded-full border border-white/16 bg-white/12 px-3 py-1 text-xs font-black text-white/86">
                  #{keyword}
                </span>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ rotateY: 180, opacity: 0.4 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className="mx-auto aspect-square w-full max-w-[360px] [transform-style:preserve-3d]"
          >
            <GuardianMascot profile={guardian} />
          </motion.div>
        </div>
      </motion.section>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <CardShell title="수호동물 프로필" icon={<Sparkles className="h-5 w-5" />}>
          <div className="grid gap-3">
            {PROFILE_ROWS.map((row) => {
              const value =
                row.key === "name"
                  ? guardian.name
                  : row.key === "guardianType"
                  ? guardian.guardianType
                  : row.key === "keywords"
                  ? guardian.keywords.join(", ")
                  : guardian.cautionKeywords.join(", ");
              return (
                <div key={row.label} className="rounded-2xl border border-white/12 bg-white/10 p-3">
                  <p className="text-xs font-black text-[#7ef1de]">{row.label}</p>
                  <p className="mt-1 text-sm font-bold leading-relaxed text-white/88">{value}</p>
                </div>
              );
            })}
          </div>
        </CardShell>

        <CardShell title="왜 이 동물이 나왔나요?" icon={<ShieldCheck className="h-5 w-5" />}>
          <p className="text-sm font-semibold leading-[1.85] text-white/82">
            당신의 명식에서는 {guardian.basisTone} 특히 일간의 성향과 월지의 분위기, 부족한 오행을 함께 보았을 때
            {` ${guardian.name}`}이 가장 필요한 수호 에너지로 배정되었습니다.
          </p>
          <details className="mt-4 rounded-2xl border border-white/12 bg-white/10 p-4">
            <summary className="cursor-pointer text-sm font-black text-[#fff2b8]">사주 근거 보기</summary>
            <div className="mt-3 space-y-2 text-sm font-semibold leading-relaxed text-white/78">
              <p>- {basisLine.dayLine}</p>
              <p>- {basisLine.monthLine}</p>
              <p>- {basisLine.weakLine}</p>
              <p>- {basisLine.tenGodLine}</p>
              <p>- 대표 운성: {representativeStage || "보조 계산"} / 오행 분포: {elementSpread}</p>
              {timeUnknown ? <p>- 출생 시간이 비어 있어 시주는 보조 참고값으로만 반영했습니다.</p> : null}
            </div>
          </details>
        </CardShell>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <CardShell title="수호력이 강해지는 순간" icon={<ShieldCheck className="h-5 w-5" />} className="lg:col-span-1">
          <p className="text-sm font-semibold leading-[1.85] text-white/82">{guardian.power}</p>
        </CardShell>

        <CardShell title="가디언 경고" icon={<AlertTriangle className="h-5 w-5" />} className="lg:col-span-1">
          <p className="text-sm font-semibold leading-[1.85] text-white/82">{guardian.warning}</p>
        </CardShell>

        <CardShell title="오늘의 수호 메시지" icon={<Sparkles className="h-5 w-5" />} className="lg:col-span-1">
          <blockquote className="text-lg font-black leading-relaxed text-[#fff2b8]">
            “{guardian.todayMessage}”
          </blockquote>
        </CardShell>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <CardShell title="나 이런 사람임" icon={<Sparkles className="h-5 w-5" />}>
          <div className="space-y-2">
            {guardian.memeLines.map((line) => (
              <p key={line} className="rounded-2xl border border-white/12 bg-white/10 p-3 text-sm font-bold leading-relaxed text-white/84">
                {line}
              </p>
            ))}
          </div>
        </CardShell>

        <CardShell title="나와 잘 맞는 수호동물 궁합" icon={<HeartHandshake className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#7ef1de]/22 bg-[#7ef1de]/10 p-4">
              <p className="text-xs font-black text-[#bffff5]">잘 맞는 수호동물</p>
              <ol className="mt-3 space-y-2">
                {compatibleGuardians.map((match, index) => (
                  <li key={match.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-black text-white">
                    <span>{index + 1}위 {compactName(match)}</span>
                    <span>{match.symbol}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl border border-[#ffd36c]/24 bg-[#ffd36c]/10 p-4">
              <p className="text-xs font-black text-[#fff2b8]">주의가 필요한 수호동물</p>
              <ol className="mt-3 space-y-2">
                {cautionGuardians.map((match, index) => (
                  <li key={match.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-black text-white">
                    <span>{index + 1}위 {compactName(match)}</span>
                    <span>{match.symbol}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          {partner.summary && partner.animalData ? (
            <div className="mt-3 rounded-2xl border border-white/12 bg-white/10 p-4">
              <p className="text-xs font-black text-[#7ef1de]">최근 비교 결과</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-white/82">
                {animal.animal_ko}와 {getAnimalDisplayData(partner.animalId)?.animal_ko || partner.animalData.animal_ko}: {partner.summary}
              </p>
            </div>
          ) : null}
        </CardShell>
      </div>

      <CardShell title="공유용 한 장 카드" icon={<Share2 className="h-5 w-5" />}>
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.8fr)_1fr] lg:items-center">
          <div
            ref={shareCardRef}
            className="relative mx-auto aspect-[4/5] w-full max-w-[390px] overflow-hidden rounded-[2rem] border border-white/18 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.26)]"
            style={{ background: `linear-gradient(145deg, ${guardian.palette.background}, ${guardian.palette.primary})` }}
          >
            <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.4)_0_1px,transparent_2px),radial-gradient(circle_at_80%_22%,rgba(255,255,255,0.32)_0_1px,transparent_2px),radial-gradient(circle_at_70%_78%,rgba(255,255,255,0.28)_0_1px,transparent_2px)]" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <p className="text-xs font-black tracking-[0.18em]" style={{ color: guardian.palette.accent }}>SAJU GUARDIAN</p>
                <h4 className="mt-3 text-3xl font-black leading-tight text-white">내 사주 가디언은<br />{compactName(guardian)}</h4>
              </div>
              <div className="mx-auto h-44 w-44">
                <GuardianMascot profile={guardian} />
              </div>
              <div>
                <p className="text-base font-black leading-relaxed text-white">“{guardian.shareLine}”</p>
                <p className="mt-3 text-xs font-bold text-white/70">#사주가디언 #{guardian.name.replace(/\s+/g, "")} #수호동물</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold leading-relaxed text-white/78">
              저장하면 바로 공유하기 좋은 한 장 카드로 남습니다. 동물 이미지는 새로 생성하지 않고, 배정된 고정 2D 가디언 카드와 문구만 조합합니다.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onSaveCard}
                disabled={isExporting}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(125deg,#7c5cff,#37d2c5)] px-4 py-3 text-sm font-black text-white shadow-[0_16px_34px_rgba(55,210,197,0.2)] transition hover:brightness-110 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                카드 저장
              </button>
              <button
                type="button"
                onClick={onShareCard}
                disabled={isExporting}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/18 bg-white/12 px-4 py-3 text-sm font-black text-white transition hover:bg-white/18 disabled:opacity-50"
              >
                <Share2 className="h-4 w-4" />
                결과 공유
              </button>
            </div>
          </div>
        </div>
      </CardShell>

      <p className="text-center text-xs font-semibold text-white/48">
        사주 계산값 기반의 수호동물 테스트 결과입니다. 실제 선택과 행동의 주도권은 언제나 본인에게 있습니다.
      </p>
    </section>
  );
}
