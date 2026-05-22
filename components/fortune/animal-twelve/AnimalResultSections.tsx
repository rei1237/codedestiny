import type { AnimalDestinyData } from "@/app/saju/animal-destiny/lib/types";
import type { ReactNode } from "react";

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

export default function AnimalResultSections({ animal }: Props) {
  const profile = animal.profile;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard title="성격 분석">
        <ParagraphList lines={profile.personality.paragraphs} />
      </SectionCard>

      <SectionCard title="연애 스타일">
        <ParagraphList lines={profile.love.paragraphs} />
      </SectionCard>

      <SectionCard title="인간관계 스타일">
        <div className="space-y-3.5 text-sm leading-[1.72] text-[#5a3416]">
          <p><span className="font-bold text-[#6b3f1d]">친구 관계:</span> {profile.relationship.friends}</p>
          <p><span className="font-bold text-[#6b3f1d]">직장/사회:</span> {profile.relationship.work}</p>
          <p><span className="font-bold text-[#6b3f1d]">가족 관계:</span> {profile.relationship.family}</p>
          <p><span className="font-bold text-[#6b3f1d]">거리두기 포인트:</span> {profile.relationship.caution}</p>
          <p><span className="font-bold text-[#6b3f1d]">잘 맞는 분위기:</span> {profile.relationship.bestFit}</p>
        </div>
      </SectionCard>

      <SectionCard title="직업 · 진로 성향">
        <div className="space-y-3.5 text-sm leading-[1.72] text-[#5a3416]">
          <p><span className="font-bold text-[#6b3f1d]">업무 스타일:</span> {profile.career.workStyle}</p>
          <p><span className="font-bold text-[#6b3f1d]">잘 맞는 직업군:</span> {profile.career.goodFields.join(", ")}</p>
          <p><span className="font-bold text-[#6b3f1d]">피해야 할 환경:</span> {profile.career.avoidFields.join(", ")}</p>
          <p><span className="font-bold text-[#6b3f1d]">돈이 붙는 조건:</span> {profile.career.moneyBoostCondition}</p>
          <p><span className="font-bold text-[#6b3f1d]">장기 성장 조언:</span> {profile.career.growthAdvice}</p>
        </div>
      </SectionCard>

      <SectionCard title="재물운 · 돈 관리">
        <div className="space-y-3.5 text-sm leading-[1.72] text-[#5a3416]">
          <p><span className="font-bold text-[#6b3f1d]">돈이 들어오는 방식:</span> {profile.money.moneyFlow}</p>
          <p><span className="font-bold text-[#6b3f1d]">돈이 새는 패턴:</span> {profile.money.spendingPattern}</p>
          <p><span className="font-bold text-[#6b3f1d]">저축/투자 조언:</span> {profile.money.savingAdvice}</p>
          <p><span className="font-bold text-[#6b3f1d]">운을 높이는 습관:</span> {profile.money.habitTip}</p>
        </div>
      </SectionCard>

      <SectionCard title="오늘의 동물 운세">
        <div className="space-y-3.5 text-sm leading-[1.72] text-[#5a3416]">
          <p><span className="font-bold text-[#6b3f1d]">한 줄 운세:</span> {profile.daily.message}</p>
          <p><span className="font-bold text-[#6b3f1d]">행운 행동:</span> {profile.daily.luckyAction}</p>
          <p><span className="font-bold text-[#6b3f1d]">피해야 할 행동:</span> {profile.daily.caution}</p>
          <p><span className="font-bold text-[#6b3f1d]">행운 색:</span> {profile.daily.luckyColor}</p>
          <p><span className="font-bold text-[#6b3f1d]">행운 아이템:</span> {profile.daily.luckyItem}</p>
        </div>
      </SectionCard>
    </div>
  );
}
