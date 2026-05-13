import type { AnimalDestinyData } from "../lib/types";

interface Props {
  animal: AnimalDestinyData;
  insight?: string;
}

export default function AnimalCareerPanel({ animal, insight }: Props) {
  return (
    <section className="space-y-2 rounded-2xl border border-[#d8e3cf] bg-white/70 p-4 text-sm text-[#3f5241]">
      <h3 className="text-lg font-black text-[#2d3f2f]">진로/직업 분석</h3>
      {insight ? <p className="rounded-xl bg-[#eef6ff] p-2 text-xs font-semibold text-[#3d4f6a]">사주 근거: {insight}</p> : null}
      <p><span className="font-bold">핵심 재능:</span> {animal.career.talent}</p>
      <p><span className="font-bold">추천 분야:</span> {animal.career.recommended_fields.join(", ")}</p>
      <p><span className="font-bold">업무 스타일:</span> {animal.career.work_style}</p>
      <p><span className="font-bold">머니 스타일:</span> {animal.career.money_style}</p>
      <p className="rounded-xl bg-[#fff6df] p-2"><span className="font-bold">커리어 팁:</span> {animal.career.advice}</p>
    </section>
  );
}
