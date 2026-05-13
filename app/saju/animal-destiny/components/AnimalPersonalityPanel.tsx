import type { AnimalDestinyData } from "../lib/types";

interface Props {
  animal: AnimalDestinyData;
  insight?: string;
}

export default function AnimalPersonalityPanel({ animal, insight }: Props) {
  return (
    <section className="space-y-2 rounded-2xl border border-[#d8e3cf] bg-white/70 p-4">
      <h3 className="text-lg font-black text-[#2d3f2f]">성격 분석</h3>
      {insight ? <p className="rounded-xl bg-[#eef8ea] p-2 text-xs font-semibold text-[#365038]">사주 근거: {insight}</p> : null}
      <p className="text-sm font-semibold text-[#3a4b3b]">{animal.personality.summary}</p>
      <p className="text-sm text-[#4a5f4d]">{animal.personality.hidden_side}</p>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded-xl bg-[#eff8e9] p-3 text-sm text-[#365138]">
          <p className="mb-1 font-bold">강점</p>
          <p>{animal.personality.strengths.join(" · ")}</p>
        </div>
        <div className="rounded-xl bg-[#fff0e8] p-3 text-sm text-[#69433c]">
          <p className="mb-1 font-bold">주의 포인트</p>
          <p>{animal.personality.weaknesses.join(" · ")}</p>
        </div>
      </div>
    </section>
  );
}
