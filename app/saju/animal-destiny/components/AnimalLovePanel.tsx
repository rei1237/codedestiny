import type { AnimalDestinyData } from "../lib/types";

interface Props {
  animal: AnimalDestinyData;
  insight?: string;
}

export default function AnimalLovePanel({ animal, insight }: Props) {
  return (
    <section className="space-y-2 rounded-2xl border border-[#d8e3cf] bg-white/70 p-4 text-sm text-[#3f5241]">
      <h3 className="text-lg font-black text-[#2d3f2f]">연애 분석</h3>
      {insight ? <p className="rounded-xl bg-[#fff7ef] p-2 text-xs font-semibold text-[#6a4a3e]">사주 근거: {insight}</p> : null}
      <p><span className="font-bold">스타일:</span> {animal.love.style}</p>
      <p><span className="font-bold">매력 포인트:</span> {animal.love.attraction_point}</p>
      <p><span className="font-bold">약점:</span> {animal.love.weakness_in_love}</p>
      <p><span className="font-bold">추천 데이트 무드:</span> {animal.love.best_date_mood}</p>
      <p className="rounded-xl bg-[#eff8e9] p-2"><span className="font-bold">한 줄 조언:</span> {animal.love.advice}</p>
    </section>
  );
}
