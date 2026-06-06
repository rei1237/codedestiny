"use client";

import { useMemo, useState } from "react";
import type { AnimalDestinyData, AnimalDestinyInput, PartnerResult } from "@/app/saju/animal-destiny/lib/types";

type Props = {
  animal: AnimalDestinyData;
  partner: PartnerResult;
  onAnalyze: (input: AnimalDestinyInput) => Promise<void>;
  disabled?: boolean;
};

function scoreLabel(score: number) {
  if (score >= 76 && score <= 80) return "상호 보완적 인연";
  if (score >= 85) return "환상 궁합";
  if (score >= 70) return "좋은 궁합";
  if (score >= 55) return "보통 궁합";
  return "노력형 궁합";
}

function clampScore(score: number) {
  return Math.max(40, Math.min(99, Math.round(score)));
}

function buildAxisScores(score: number, relationType?: string | null) {
  const base = score || 60;
  const relationBoost = relationType === "환상" ? 5 : relationType === "좋음" ? 2 : relationType === "긴장" ? -3 : -6;

  return [
    {
      label: "연애 궁합",
      score: clampScore(base + relationBoost + 3),
      body: "끌림은 빠르게 생길 수 있으나, 관계가 오래 가려면 감정 확인과 생활 리듬 합의가 함께 필요합니다.",
    },
    {
      label: "친구 궁합",
      score: clampScore(base + relationBoost + 1),
      body: "서로의 회복 방식을 존중하면 부담 없는 지지 관계가 됩니다. 약속 빈도보다 대화의 안정감이 중요합니다.",
    },
    {
      label: "업무 궁합",
      score: clampScore(base + relationBoost - 2),
      body: "역할과 마감 기준을 먼저 정하면 시너지가 커집니다. 모호한 기대를 줄일수록 결과가 선명해집니다.",
    },
  ];
}

function buildRecoverySteps(partner: PartnerResult) {
  return [
    partner.clashPoints[0] || "서로의 속도 차이가 커지는 순간을 먼저 알아차리세요.",
    "감정 판단보다 사실 확인을 먼저 하고, 원하는 반응이 공감인지 해결인지 짧게 물어보세요.",
    partner.tips[0] || "한 달에 한 번 관계 온도와 역할 분담을 함께 점검해 보세요.",
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

  const tone = useMemo(() => scoreLabel(partner.score || 0), [partner.score]);
  const axisScores = useMemo(
    () => buildAxisScores(partner.score || 0, partner.relationType),
    [partner.relationType, partner.score],
  );
  const recoverySteps = useMemo(() => buildRecoverySteps(partner), [partner]);
  const partnerName = partner.animalData?.animal_ko || "상대 동물";

  return (
    <section className="rounded-[28px] border border-[#dcc39b] bg-white/90 p-6 shadow-[0_16px_40px_rgba(82,54,24,0.12)]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h4 className="text-xl font-black text-[#6b3f1d]">두 사람 동물 궁합</h4>
        <span className="rounded-full bg-[#fff1db] px-3 py-1 text-xs font-bold text-[#8a5a2b]">실전 매칭</span>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-[#6b4a29]">
        상대 생년월일을 넣으면 당신의 {animal.animal_ko} 에너지와 상대 운명 동물의 파동을 비교해 궁합을 계산해요.
      </p>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs font-bold text-[#6b3f1d]">생년월일</span>
          <input
            type="date"
            value={input.birthDate}
            onChange={(e) => setInput((prev) => ({ ...prev, birthDate: e.target.value }))}
            className="min-h-[44px] w-full rounded-xl border border-[#dcc39b] bg-white px-3 py-2 text-sm outline-none focus:border-[#8a5a2b]"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-bold text-[#6b3f1d]">태어난 시간(선택)</span>
          <input
            type="time"
            value={input.birthTime || ""}
            onChange={(e) => setInput((prev) => ({ ...prev, birthTime: e.target.value }))}
            className="min-h-[44px] w-full rounded-xl border border-[#dcc39b] bg-white px-3 py-2 text-sm outline-none focus:border-[#8a5a2b]"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-bold text-[#6b3f1d]">성별</span>
          <select
            value={input.gender || "female"}
            onChange={(e) => setInput((prev) => ({ ...prev, gender: e.target.value as AnimalDestinyInput["gender"] }))}
            className="min-h-[44px] w-full rounded-xl border border-[#dcc39b] bg-white px-3 py-2 text-sm outline-none focus:border-[#8a5a2b]"
          >
            <option value="female">여성</option>
            <option value="male">남성</option>
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
        {loading ? "궁합 계산 중..." : "궁합 확인하기"}
      </button>

      {partner.summary ? (
        <div className="mt-4 space-y-3 rounded-2xl bg-[#fff5e5] p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#8a5a2b]">궁합 점수</p>
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
              <p className="text-xs font-black text-[#7b4a1e]">사주 근거</p>
              <p className="mt-1 text-xs leading-relaxed text-[#5f3818]">
                {animal.animal_ko}와 {partnerName}의 대표 운성 간격을 기준으로 감정 박자, 역할 보완, 생활 리듬을 함께 읽었습니다.
                {partner.stageEvidence ? ` ${partner.stageEvidence}` : ""}
              </p>
            </article>
            <article className="rounded-xl border border-[#ead1af] bg-white px-3 py-3">
              <p className="text-xs font-black text-[#7b4a1e]">좋은 대화 문장</p>
              <p className="mt-1 text-xs leading-relaxed text-[#5f3818]">
                "지금 필요한 것이 공감인지 해결인지 먼저 알려줘."처럼 요청의 종류를 분리하면 두 동물의 에너지가 덜 부딪힙니다.
              </p>
            </article>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <article className="rounded-xl border border-[#ead1af] bg-white px-3 py-3">
              <p className="text-xs font-black text-[#7b4a1e]">시너지 포인트</p>
              <ul className="mt-2 space-y-1.5">
                {partner.goodPoints.map((line) => (
                  <li key={line} className="text-xs leading-relaxed text-[#5f3818]">{line}</li>
                ))}
              </ul>
            </article>
            <article className="rounded-xl border border-[#ead1af] bg-white px-3 py-3">
              <p className="text-xs font-black text-[#7b4a1e]">조율 포인트</p>
              <ul className="mt-2 space-y-1.5">
                {partner.clashPoints.map((line) => (
                  <li key={line} className="text-xs leading-relaxed text-[#5f3818]">{line}</li>
                ))}
              </ul>
            </article>
          </div>
          <article className="rounded-xl border border-[#ead1af] bg-white px-3 py-3">
            <p className="text-xs font-black text-[#7b4a1e]">갈등 복구 루틴</p>
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
