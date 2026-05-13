import type { AnimalDestinyData } from "../lib/types";

interface Props {
  animal: AnimalDestinyData;
  insight?: string;
}

export default function AnimalLuckItems({ animal, insight }: Props) {
  return (
    <section className="rounded-2xl border border-[#d8e3cf] bg-white/70 p-4 text-sm text-[#3f5241]">
      <h3 className="mb-2 text-lg font-black text-[#2d3f2f]">행운 아이템</h3>
      {insight ? <p className="mb-2 rounded-xl bg-[#eff8f4] p-2 text-xs font-semibold text-[#375147]">사주 근거: {insight}</p> : null}
      <div className="grid gap-2 md:grid-cols-2">
        <p><span className="font-bold">행운 음식:</span> {animal.luck_essentials.food}</p>
        <p><span className="font-bold">행운 아이템:</span> {animal.luck_essentials.item}</p>
        <p><span className="font-bold">행운 컬러:</span> {animal.luck_essentials.color}</p>
        <p><span className="font-bold">행운 장소:</span> {animal.luck_essentials.place}</p>
      </div>
    </section>
  );
}
