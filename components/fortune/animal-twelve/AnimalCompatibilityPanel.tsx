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
    <section className="rounded-[28px] border border-[#e7d7ff] bg-white/90 p-6 shadow-[0_16px_40px_rgba(42,18,72,0.14)]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h4 className="text-xl font-black text-[#3d2957]">두 사람 동물 궁합</h4>
        <span className="rounded-full bg-[#f2ebff] px-3 py-1 text-xs font-bold text-[#6b4aa0]">실전 매칭</span>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-[#5b4775]">
        상대 생년월일을 넣으면 당신의 {animal.animal_ko} 에너지와 상대 운명 동물의 파동을 비교해 궁합을 계산해요.
      </p>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs font-bold text-[#594372]">생년월일</span>
          <input
            type="date"
            value={input.birthDate}
            onChange={(e) => setInput((prev) => ({ ...prev, birthDate: e.target.value }))}
            className="w-full rounded-xl border border-[#d9c7f7] bg-white px-3 py-2 text-sm outline-none focus:border-[#9d74dd]"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-bold text-[#594372]">태어난 시간(선택)</span>
          <input
            type="time"
            value={input.birthTime || ""}
            onChange={(e) => setInput((prev) => ({ ...prev, birthTime: e.target.value }))}
            className="w-full rounded-xl border border-[#d9c7f7] bg-white px-3 py-2 text-sm outline-none focus:border-[#9d74dd]"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-bold text-[#594372]">성별</span>
          <select
            value={input.gender || "female"}
            onChange={(e) => setInput((prev) => ({ ...prev, gender: e.target.value as AnimalDestinyInput["gender"] }))}
            className="w-full rounded-xl border border-[#d9c7f7] bg-white px-3 py-2 text-sm outline-none focus:border-[#9d74dd]"
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
        className="mt-4 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-black tracking-[0.06em] text-white disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: `linear-gradient(135deg, ${animal.palette.primary}, ${animal.palette.accent})`,
        }}
      >
        {loading ? "궁합 계산 중..." : "궁합 확인하기"}
      </button>

      {partner.summary ? (
        <div className="mt-4 space-y-3 rounded-2xl bg-[#f7f1ff] p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#6f5b8a]">궁합 점수</p>
              <p className="text-3xl font-black text-[#3f2a5f]">{partner.score}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#6d49a8]">{tone}</span>
          </div>
          <p className="text-sm leading-relaxed text-[#4f3a6d]">{partner.summary}</p>
          {partner.goodPoints.length ? (
            <ul className="space-y-1.5">
              {partner.goodPoints.map((line) => (
                <li key={line} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#584273]">
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
          {partner.tips.length ? (
            <ul className="space-y-1.5">
              {partner.tips.map((line) => (
                <li key={line} className="rounded-lg border border-[#e6ddf5] bg-white px-3 py-2 text-xs font-semibold text-[#584273]">
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
