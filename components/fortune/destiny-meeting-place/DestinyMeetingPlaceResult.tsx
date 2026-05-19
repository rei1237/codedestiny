import { Compass, Flower2, Heart, MapPin, Moon, Star } from "lucide-react";
import type { ReactNode } from "react";
import type { DestinyMeetingPlaceResult } from "./destinyMeetingPlaceTypes";

type Props = {
  result: DestinyMeetingPlaceResult;
  chargedCoins: number;
};

function SectionCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#9ad7ff]/30 bg-[linear-gradient(150deg,rgba(16,20,52,0.72),rgba(33,17,61,0.58))] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_18px_40px_rgba(6,7,24,0.5)] backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2 text-[#ffd36e]">
        {icon}
        <h4 className="text-base font-black text-white [text-shadow:0_0_12px_rgba(157,220,255,0.52)]">{title}</h4>
      </div>
      {children}
    </section>
  );
}

export default function DestinyMeetingPlaceResult({ result, chargedCoins }: Props) {
  return (
    <div className="space-y-4">
      <SectionCard title="한 줄 운명 요약" icon={<Star size={18} />}>
        <p className="text-[15px] font-black leading-relaxed text-[#ffe2f4]">{result.summary.oneLine}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-[#ffbde9]/45 bg-[#ff8bd8]/20 px-2 py-1 text-[#ffdff4]">주요 에너지: {result.summary.mainEnergy}</span>
          <span className="rounded-full border border-[#b9a2ff]/45 bg-[#8b5cf6]/25 px-2 py-1 text-[#e5deff]">로맨스 키워드: {result.summary.romanceKeyword}</span>
          <span className="rounded-full border border-[#9eccff]/45 bg-[#60a5fa]/25 px-2 py-1 text-[#deedff]">장소 테마: {result.summary.placeTheme}</span>
          <span className="rounded-full border border-[#ffd890]/50 bg-[#ffd36e]/25 px-2 py-1 text-[#fff3cd]">차감 코인: {chargedCoins}</span>
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="내 인연 에너지" icon={<Heart size={18} />}>
          <div className="space-y-2 text-sm text-[#e8ebff]">
            <p>일간: <b>{result.energyProfile.dayMaster}</b></p>
            <p>필요 오행: <b>{result.energyProfile.usefulElements.join(", ") || "정보 보완"}</b></p>
            <p>주의 오행: <b>{result.energyProfile.avoidElements.join(", ") || "정보 보완"}</b></p>
            <p>관계 패턴: {result.energyProfile.relationshipPattern}</p>
            <p>만남 방식: {result.energyProfile.meetingStyle}</p>
          </div>
        </SectionCard>

        <SectionCard title="인연운 타이밍" icon={<Moon size={18} />}>
          <div className="space-y-2 text-sm text-[#e8ebff]">
            <p>계절: <b>{result.luckyTiming.bestSeasons.join(" · ")}</b></p>
            <p>월: <b>{result.luckyTiming.bestMonths.join(" · ")}</b></p>
            <p>시간대: <b>{result.luckyTiming.bestTimeOfDay.join(" · ")}</b></p>
            <p className="text-[#d5dcff]">{result.luckyTiming.explanation}</p>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="인연이 열리는 장소 TOP 5" icon={<MapPin size={18} />}>
        <div className="grid gap-3 md:grid-cols-2">
          {result.recommendedPlaces.map((place) => (
            <article key={place.name} className="rounded-2xl border border-[#b3dfff]/28 bg-[#0e112f]/58 p-3 text-sm text-[#e8ebff] shadow-[0_0_24px_rgba(89,130,255,0.12)]">
              <p className="font-black text-white">#{place.rank} {place.name}</p>
              <p className="mt-1 text-xs text-[#ffd7ee]">유형: {place.type} · 오행: {place.element} · 인연 가능성 {place.romancePotential}%</p>
              <p className="mt-2">{place.reason}</p>
              <p className="mt-2 text-xs text-[#cde2ff]">행동 팁: {place.actionTip}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="나와 맞는 국가 / 도시" icon={<Compass size={18} />}>
        <div className="grid gap-3 md:grid-cols-2">
          {result.recommendedCountries.map((item) => (
            <article key={`${item.country}-${item.rank}`} className="rounded-2xl border border-[#c8ccff]/28 bg-[#171238]/55 p-3 text-sm text-[#e8ebff] shadow-[0_0_24px_rgba(153,110,255,0.12)]">
              <p className="font-black text-white">#{item.rank} {item.country}</p>
              <p className="mt-1 text-xs text-[#ffd7ee]">{item.cities.join(" · ")} · {item.travelMood}</p>
              <p className="mt-2">{item.reason}</p>
              <p className="mt-1 text-xs text-[#cde2ff]">인연 포인트: {item.bestFor}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="운명의 아이템/스타일" icon={<Flower2 size={18} />}>
          <div className="space-y-2 text-sm text-[#e8ebff]">
            {result.destinyItems.map((item) => (
              <p key={item.item}>• <b>{item.item}</b> ({item.element}) - {item.reason}</p>
            ))}
            <p className="pt-2 text-xs text-[#ffd7ee]">추천 컬러: {result.stylingGuide.colors.join(" · ")}</p>
            <p className="text-xs text-[#ffd7ee]">무드 제안: {result.stylingGuide.mood}</p>
            <p className="text-xs text-[#ffd7ee]">의상 키워드: {result.stylingGuide.outfit}</p>
          </div>
        </SectionCard>

        <SectionCard title="피해야 할 장소/패턴" icon={<Star size={18} />}>
          <div className="space-y-2 text-sm text-[#e8ebff]">
            <p>장소: {result.avoidGuide.avoidPlaces.join(" · ")}</p>
            <p>타이밍: {result.avoidGuide.avoidTiming.join(" · ")}</p>
            <p>패턴: {result.avoidGuide.avoidPatterns.join(" · ")}</p>
            <p className="text-xs text-[#ffcade]">{result.avoidGuide.reason}</p>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="이번 주 실천 플랜" icon={<Heart size={18} />}>
        <div className="grid gap-2 text-sm text-[#e8ebff] md:grid-cols-2">
          <p>오늘: {result.practicalPlan.todayAction}</p>
          <p>이번 주: {result.practicalPlan.thisWeekAction}</p>
          <p>이번 달: {result.practicalPlan.thisMonthAction}</p>
          <p>여행 전략: {result.practicalPlan.travelAction}</p>
        </div>
      </SectionCard>
    </div>
  );
}
