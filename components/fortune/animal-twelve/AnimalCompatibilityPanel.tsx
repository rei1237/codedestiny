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
          {partner.breakdown ? (
            <div className="grid gap-2 md:grid-cols-2">
              <article className="rounded-xl border border-[#ead1af] bg-white px-3 py-3">
                <p className="text-xs font-black text-[#7b4a1e]">{partner.breakdown.overall.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#5f3818]">{partner.breakdown.overall.body}</p>
              </article>
              <article className="rounded-xl border border-[#ead1af] bg-white px-3 py-3">
                <p className="text-xs font-black text-[#7b4a1e]">{partner.breakdown.emotionCommunication.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#5f3818]">{partner.breakdown.emotionCommunication.body}</p>
              </article>
              <article className="rounded-xl border border-[#ead1af] bg-white px-3 py-3">
                <p className="text-xs font-black text-[#7b4a1e]">{partner.breakdown.valueLifestyle.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#5f3818]">{partner.breakdown.valueLifestyle.body}</p>
              </article>
              <article className="rounded-xl border border-[#ead1af] bg-white px-3 py-3">
                <p className="text-xs font-black text-[#7b4a1e]">{partner.breakdown.practicalAdvice.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#5f3818]">{partner.breakdown.practicalAdvice.body}</p>
              </article>
            </div>
          ) : null}
          {partner.goodPoints.length ? (
            <ul className="space-y-1.5">
              {partner.goodPoints.map((line) => (
                <li key={line} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#6b3f1d]">
                  {line}
                </li>
              ))}
            </ul>
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
