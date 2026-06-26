"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnimalDestinyData, AnimalDestinyInput, PartnerResult } from "@/app/saju/animal-destiny/lib/types";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { formatBirthDateDigits, normalizeBirthDateFromDigits } from "@/lib/birthDateInput";

type Props = {
  animal: AnimalDestinyData;
  partner: PartnerResult;
  onAnalyze: (input: AnimalDestinyInput) => Promise<void>;
  disabled?: boolean;
};

const ANIMAL_COMPATIBILITY_PANEL_TEXT_TRANSLATIONS = {
  ko: {
    scoreLabels: ["상호 보완적 인연", "환상 궁합", "좋은 궁합", "보통 궁합", "노력형 궁합"],
    axisLove: "연애 궁합",
    axisFriend: "친구 궁합",
    axisWork: "업무 궁합",
    axisLoveBody: "끌림은 빠르게 생길 수 있으나, 관계가 오래 가려면 감정 확인과 생활 리듬 합의가 함께 필요합니다.",
    axisFriendBody: "서로의 회복 방식을 존중하면 부담 없는 지지 관계가 됩니다. 약속 빈도보다 대화의 안정감이 중요합니다.",
    axisWorkBody: "역할과 마감 기준을 먼저 정하면 시너지가 커집니다. 모호한 기대를 줄일수록 결과가 선명해집니다.",
    recoveryFallback1: "서로의 속도 차이가 커지는 순간을 먼저 알아차리세요.",
    recoveryFallback2: "감정 판단보다 사실 확인을 먼저 하고, 원하는 반응이 공감인지 해결인지 짧게 물어보세요.",
    recoveryFallback3: "한 달에 한 번 관계 온도와 역할 분담을 함께 점검해 보세요.",
    partnerAnimal: "상대 동물",
    title: "두 사람 동물 궁합",
    badge: "실전 매칭",
    intro: (animalName: string) => `상대 생년월일을 넣으면 당신의 ${animalName} 에너지와 상대 운명 동물의 파동을 비교해 궁합을 계산해요.`,
    birthDate: "생년월일",
    birthTime: "태어난 시간(선택)",
    gender: "성별",
    female: "여성",
    male: "남성",
    loading: "궁합 계산 중...",
    submit: "궁합 확인하기",
    score: "궁합 점수",
    sajuBasis: "사주 근거",
    sajuBasisBody: (animalName: string, partnerName: string) => `${animalName}와 ${partnerName}의 대표 운성 간격을 기준으로 감정 박자, 역할 보완, 생활 리듬을 함께 읽었습니다.`,
    goodConversation: "좋은 대화 문장",
    conversationBody: "\"지금 필요한 것이 공감인지 해결인지 먼저 알려줘.\"처럼 요청의 종류를 분리하면 두 동물의 에너지가 덜 부딪힙니다.",
    synergy: "시너지 포인트",
    adjustment: "조율 포인트",
    recoveryRoutine: "갈등 복구 루틴",
  },
  en: {
    scoreLabels: ["Complementary Bond", "Dream Match", "Good Match", "Balanced Match", "Growth Match"],
    axisLove: "Romantic Match",
    axisFriend: "Friendship Match",
    axisWork: "Work Match",
    axisLoveBody: "Attraction may arise quickly, but lasting connection needs emotional check-ins and shared daily rhythm.",
    axisFriendBody: "Respecting each other’s recovery style creates easy support. Stable conversation matters more than meeting often.",
    axisWorkBody: "Synergy grows when roles and deadlines are clear first. The fewer vague expectations, the clearer the outcome.",
    recoveryFallback1: "Notice first when your natural speeds begin to drift apart.",
    recoveryFallback2: "Check facts before judging feelings, and ask whether they want empathy or a solution.",
    recoveryFallback3: "Once a month, review the relationship temperature and role balance together.",
    partnerAnimal: "partner animal",
    title: "Animal Compatibility",
    badge: "Practical Match",
    intro: (animalName: string) => `Enter your partner’s birth date to compare your ${animalName} energy with their destiny animal wave.`,
    birthDate: "Birth date",
    birthTime: "Birth time (optional)",
    gender: "Gender",
    female: "Female",
    male: "Male",
    loading: "Calculating compatibility...",
    submit: "Check compatibility",
    score: "Compatibility score",
    sajuBasis: "Saju basis",
    sajuBasisBody: (animalName: string, partnerName: string) => `We read emotional rhythm, role complement, and daily pace through the representative fortune-stage gap between ${animalName} and ${partnerName}.`,
    goodConversation: "Helpful conversation line",
    conversationBody: "Try separating the request first: “Tell me whether you need empathy or a solution right now.” This keeps the two animal energies from clashing too hard.",
    synergy: "Synergy points",
    adjustment: "Adjustment points",
    recoveryRoutine: "Conflict recovery routine",
  },
  ja: {
    scoreLabels: ["補い合う縁", "幻想的な相性", "良い相性", "安定した相性", "育てる相性"],
    axisLove: "恋愛相性",
    axisFriend: "友人相性",
    axisWork: "仕事相性",
    axisLoveBody: "惹かれ合いは早く生まれても、長く続くには感情確認と生活リズムの合意が必要です。",
    axisFriendBody: "互いの回復方法を尊重すると、負担の少ない支え合いになります。約束の回数より会話の安定感が大切です。",
    axisWorkBody: "役割と締切の基準を先に決めるほど相乗効果が高まります。曖昧な期待を減らすほど結果は鮮明になります。",
    recoveryFallback1: "互いの速度差が大きくなる瞬間を先に気づいてください。",
    recoveryFallback2: "感情を判断する前に事実を確認し、共感が必要か解決が必要かを短く尋ねてください。",
    recoveryFallback3: "月に一度、関係の温度と役割分担を一緒に点検してみてください。",
    partnerAnimal: "相手の動物",
    title: "二人の動物相性",
    badge: "実践マッチング",
    intro: (animalName: string) => `相手の生年月日を入れると、あなたの${animalName}エネルギーと相手の運命動物の波動を比べて相性を計算します。`,
    birthDate: "生年月日",
    birthTime: "生まれた時間（任意）",
    gender: "性別",
    female: "女性",
    male: "男性",
    loading: "相性を計算中...",
    submit: "相性を確認する",
    score: "相性スコア",
    sajuBasis: "四柱推命の根拠",
    sajuBasisBody: (animalName: string, partnerName: string) => `${animalName}と${partnerName}の代表運勢段階の間隔をもとに、感情の拍子、役割の補完、生活リズムを読みました。`,
    goodConversation: "よい会話の一文",
    conversationBody: "「今必要なのは共感か解決か、先に教えてね。」のように求める反応を分けると、二つの動物エネルギーがぶつかりにくくなります。",
    synergy: "シナジーポイント",
    adjustment: "調整ポイント",
    recoveryRoutine: "衝突を戻すルーティン",
  },
} as const;

function animalCompatibilityCopy(locale: LoadingLocale) {
  return ANIMAL_COMPATIBILITY_PANEL_TEXT_TRANSLATIONS[locale as keyof typeof ANIMAL_COMPATIBILITY_PANEL_TEXT_TRANSLATIONS] || ANIMAL_COMPATIBILITY_PANEL_TEXT_TRANSLATIONS.en;
}

function scoreLabel(score: number, copy: ReturnType<typeof animalCompatibilityCopy>) {
  if (score >= 76 && score <= 80) return copy.scoreLabels[0];
  if (score >= 85) return copy.scoreLabels[1];
  if (score >= 70) return copy.scoreLabels[2];
  if (score >= 55) return copy.scoreLabels[3];
  return copy.scoreLabels[4];
}

function clampScore(score: number) {
  return Math.max(40, Math.min(99, Math.round(score)));
}

function buildAxisScores(score: number, copy: ReturnType<typeof animalCompatibilityCopy>, relationType?: string | null) {
  const base = score || 60;
  const relationBoost = relationType === "환상" ? 5 : relationType === "좋음" ? 2 : relationType === "긴장" ? -3 : -6;

  return [
    {
      label: copy.axisLove,
      score: clampScore(base + relationBoost + 3),
      body: copy.axisLoveBody,
    },
    {
      label: copy.axisFriend,
      score: clampScore(base + relationBoost + 1),
      body: copy.axisFriendBody,
    },
    {
      label: copy.axisWork,
      score: clampScore(base + relationBoost - 2),
      body: copy.axisWorkBody,
    },
  ];
}

function buildRecoverySteps(partner: PartnerResult, copy: ReturnType<typeof animalCompatibilityCopy>) {
  return [
    partner.clashPoints[0] || copy.recoveryFallback1,
    copy.recoveryFallback2,
    partner.tips[0] || copy.recoveryFallback3,
  ];
}

export default function AnimalCompatibilityPanel({
  animal,
  partner,
  onAnalyze,
  disabled,
}: Props) {
  const [input, setInput] = useState<AnimalDestinyInput>({
    birthDate: "",
    birthTime: "",
    gender: "female",
    calendarType: "solar",
    lunarLeap: false,
  });
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const copy = animalCompatibilityCopy(locale);

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

  const tone = useMemo(() => scoreLabel(partner.score || 0, copy), [copy, partner.score]);
  const axisScores = useMemo(
    () => buildAxisScores(partner.score || 0, copy, partner.relationType),
    [copy, partner.relationType, partner.score],
  );
  const recoverySteps = useMemo(() => buildRecoverySteps(partner, copy), [copy, partner]);
  const partnerName = partner.animalData?.animal_ko || copy.partnerAnimal;

  return (
    <section className="rounded-[28px] border border-[#dcc39b] bg-white/90 p-6 shadow-[0_16px_40px_rgba(82,54,24,0.12)]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h4 className="text-xl font-black text-[#6b3f1d]">{copy.title}</h4>
        <span className="rounded-full bg-[#fff1db] px-3 py-1 text-xs font-bold text-[#8a5a2b]">{copy.badge}</span>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-[#6b4a29]">
        {copy.intro(animal.animal_ko)}
      </p>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs font-bold text-[#6b3f1d]">{copy.birthDate}</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            pattern="[0-9]{8}"
            placeholder="YYYYMMDD"
            value={formatBirthDateDigits(input.birthDate)}
            onChange={(e) => setInput((prev) => ({ ...prev, birthDate: normalizeBirthDateFromDigits(e.target.value) }))}
            className="min-h-[44px] w-full rounded-xl border border-[#dcc39b] bg-white px-3 py-2 text-sm outline-none focus:border-[#8a5a2b]"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-bold text-[#6b3f1d]">{copy.birthTime}</span>
          <input
            type="time"
            value={input.birthTime || ""}
            onChange={(e) => setInput((prev) => ({ ...prev, birthTime: e.target.value }))}
            className="min-h-[44px] w-full rounded-xl border border-[#dcc39b] bg-white px-3 py-2 text-sm outline-none focus:border-[#8a5a2b]"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-bold text-[#6b3f1d]">{copy.gender}</span>
          <select
            value={input.gender || "female"}
            onChange={(e) => setInput((prev) => ({ ...prev, gender: e.target.value as AnimalDestinyInput["gender"] }))}
            className="min-h-[44px] w-full rounded-xl border border-[#dcc39b] bg-white px-3 py-2 text-sm outline-none focus:border-[#8a5a2b]"
          >
            <option value="female">{copy.female}</option>
            <option value="male">{copy.male}</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        disabled={disabled || !input.birthDate || loading}
        onClick={async () => {
          try {
            setLoading(true);
            await onAnalyze(input);
          } finally {
            setLoading(false);
          }
        }}
        className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2.5 text-sm font-black tracking-[0.06em] text-white disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: `linear-gradient(135deg, ${animal.palette.primary}, ${animal.palette.accent})`,
        }}
      >
        {loading ? copy.loading : copy.submit}
      </button>

      {partner.summary ? (
        <div className="mt-4 space-y-3 rounded-2xl bg-[#fff5e5] p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#8a5a2b]">{copy.score}</p>
              <p className="text-3xl font-black text-[#6b3f1d]">{partner.score}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#8a5a2b]">{tone}</span>
          </div>
          <p className="text-sm leading-relaxed text-[#5f3818]">{partner.summary}</p>
          <div className="grid gap-2 md:grid-cols-3">
            {axisScores.map((axis) => (
              <article key={axis.label} className="rounded-xl border border-[#ead1af] bg-white px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black text-[#7b4a1e]">{axis.label}</p>
                  <span className="rounded-full bg-[#fff1db] px-2.5 py-1 text-xs font-black text-[#8a5a2b]">{axis.score}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[#f2dfc1]">
                  <div
                    className="h-2 rounded-full bg-[linear-gradient(90deg,#c47a2c,#e6b75e)]"
                    style={{ width: `${axis.score}%` }}
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#5f3818]">{axis.body}</p>
              </article>
            ))}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <article className="rounded-xl border border-[#ead1af] bg-white px-3 py-3">
              <p className="text-xs font-black text-[#7b4a1e]">{copy.sajuBasis}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#5f3818]">
                {copy.sajuBasisBody(animal.animal_ko, partnerName)}
                {partner.stageEvidence ? ` ${partner.stageEvidence}` : ""}
              </p>
            </article>
            <article className="rounded-xl border border-[#ead1af] bg-white px-3 py-3">
              <p className="text-xs font-black text-[#7b4a1e]">{copy.goodConversation}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#5f3818]">
                {copy.conversationBody}
              </p>
            </article>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <article className="rounded-xl border border-[#ead1af] bg-white px-3 py-3">
              <p className="text-xs font-black text-[#7b4a1e]">{copy.synergy}</p>
              <ul className="mt-2 space-y-1.5">
                {partner.goodPoints.map((line) => (
                  <li key={line} className="text-xs leading-relaxed text-[#5f3818]">{line}</li>
                ))}
              </ul>
            </article>
            <article className="rounded-xl border border-[#ead1af] bg-white px-3 py-3">
              <p className="text-xs font-black text-[#7b4a1e]">{copy.adjustment}</p>
              <ul className="mt-2 space-y-1.5">
                {partner.clashPoints.map((line) => (
                  <li key={line} className="text-xs leading-relaxed text-[#5f3818]">{line}</li>
                ))}
              </ul>
            </article>
          </div>
          <article className="rounded-xl border border-[#ead1af] bg-white px-3 py-3">
            <p className="text-xs font-black text-[#7b4a1e]">{copy.recoveryRoutine}</p>
            <ol className="mt-2 grid gap-2 md:grid-cols-3">
              {recoverySteps.map((line, index) => (
                <li key={`${index}-${line}`} className="rounded-lg bg-[#fff7eb] px-3 py-2 text-xs font-semibold leading-relaxed text-[#6b3f1d]">
                  <span className="mr-1 font-black">{index + 1}.</span>{line}
                </li>
              ))}
            </ol>
          </article>
          {partner.breakdown ? (
            <div className="grid gap-2 md:grid-cols-2">
              <article className="rounded-xl border border-[#ead1af] bg-white px-3 py-3">
                <p className="text-xs font-black text-[#7b4a1e]">{partner.breakdown.overall.title}</p>
                <div className="mt-1 space-y-1.5">
                  {partner.breakdown.overall.body.map((line) => (
                    <p key={line} className="text-xs leading-relaxed text-[#5f3818]">{line}</p>
                  ))}
                </div>
              </article>
              <article className="rounded-xl border border-[#ead1af] bg-white px-3 py-3">
                <p className="text-xs font-black text-[#7b4a1e]">{partner.breakdown.emotionCommunication.title}</p>
                <div className="mt-1 space-y-1.5">
                  {partner.breakdown.emotionCommunication.body.map((line) => (
                    <p key={line} className="text-xs leading-relaxed text-[#5f3818]">{line}</p>
                  ))}
                </div>
              </article>
              <article className="rounded-xl border border-[#ead1af] bg-white px-3 py-3">
                <p className="text-xs font-black text-[#7b4a1e]">{partner.breakdown.valueLifestyle.title}</p>
                <div className="mt-1 space-y-1.5">
                  {partner.breakdown.valueLifestyle.body.map((line) => (
                    <p key={line} className="text-xs leading-relaxed text-[#5f3818]">{line}</p>
                  ))}
                </div>
              </article>
              <article className="rounded-xl border border-[#ead1af] bg-white px-3 py-3">
                <p className="text-xs font-black text-[#7b4a1e]">{partner.breakdown.practicalAdvice.title}</p>
                <div className="mt-1 space-y-1.5">
                  {partner.breakdown.practicalAdvice.body.map((line) => (
                    <p key={line} className="text-xs leading-relaxed text-[#5f3818]">{line}</p>
                  ))}
                </div>
              </article>
            </div>
          ) : null}
          {partner.tips.length ? (
            <ul className="space-y-1.5">
              {partner.tips.map((line) => (
                <li key={line} className="rounded-lg border border-[#e5ccaa] bg-white px-3 py-2 text-xs font-semibold text-[#6b3f1d]">
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
