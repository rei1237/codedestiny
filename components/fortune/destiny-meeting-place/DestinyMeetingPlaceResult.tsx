import { motion } from "framer-motion";
import { Heart, MapPin, Moon, Sparkles, Star } from "lucide-react";
import type { ReactNode } from "react";
import type { DestinyMeetingPlaceResult } from "./destinyMeetingPlaceTypes";

type Props = {
  result: DestinyMeetingPlaceResult;
  chargedCoins: number;
};

type SectionCardProps = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  index: number;
  children: ReactNode;
};

const serifClass = "font-['Noto_Serif_KR','Cormorant_Garamond',serif]";
const sansClass = "font-['Pretendard','Apple_SD_Gothic_Neo','Noto_Sans_KR',sans-serif]";

const fadeUpVariant = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

function elementLabel(element: string) {
  const map: Record<string, string> = {
    wood: "목(木)",
    fire: "화(火)",
    earth: "토(土)",
    metal: "금(金)",
    water: "수(水)",
  };
  return map[element] || element;
}

function elementToneClass(element: string) {
  const map: Record<string, string> = {
    wood: "border-emerald-200/40 bg-emerald-300/15 text-emerald-100",
    fire: "border-rose-200/45 bg-rose-300/15 text-rose-100",
    earth: "border-amber-200/45 bg-[#D4B483]/22 text-[#f8e7ca]",
    metal: "border-slate-200/45 bg-slate-300/20 text-slate-100",
    water: "border-cyan-200/45 bg-cyan-300/15 text-cyan-100",
  };
  return map[element] || "border-white/30 bg-white/10 text-white";
}

function SectionCard({ title, subtitle, icon, index, children }: SectionCardProps) {
  return (
    <motion.section
      variants={fadeUpVariant}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.06 }}
      className="overflow-hidden rounded-3xl border border-[#e8d7b6]/35 bg-[linear-gradient(145deg,rgba(19,22,44,0.75),rgba(26,16,38,0.72))] shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_18px_40px_rgba(5,7,24,0.52)]"
    >
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#f0d8b0]">{subtitle}</p>
            <h3 className={`mt-1 text-2xl leading-tight text-[#fff4e0] ${serifClass}`}>{title}</h3>
          </div>
          <div className="mt-1 rounded-full border border-[#f2dfbd]/40 bg-[#f1d9af]/15 p-2 text-[#f6deb2]">{icon}</div>
        </div>
        {children}
      </div>
    </motion.section>
  );
}

export default function DestinyMeetingPlaceResult({ result, chargedCoins }: Props) {
  const majorKeywordChips = [result.summary.mainEnergy, result.summary.romanceKeyword, result.summary.placeTheme];

  return (
    <div className={`space-y-5 ${sansClass}`}>
      <SectionCard title="한 줄 요약" subtitle="Destiny Summary" icon={<Sparkles size={18} />} index={0}>
        <p className={`text-lg leading-relaxed text-[#f9efe1] sm:text-xl ${serifClass}`}>{result.summary.oneLine}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {majorKeywordChips.map((chip) => (
            <span key={chip} className="rounded-full border border-[#f5e0be]/45 bg-[#f4dcb8]/14 px-3 py-1 text-[#f8ead2]">
              {chip}
            </span>
          ))}
          <span className="rounded-full border border-[#d8dbe2]/45 bg-[#d9dee8]/15 px-3 py-1 text-[#f3f4f7]">분석 코인 {chargedCoins}</span>
        </div>
      </SectionCard>

      <SectionCard title="나의 기운" subtitle="Energy Signature" icon={<Heart size={18} />} index={1}>
        <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-2 text-[15px] leading-relaxed text-[#ece5d7]">
            <p className="text-sm text-[#f4dfbb]">일간</p>
            <p className={`text-xl text-[#fff6e8] ${serifClass}`}>{result.energyProfile.dayMaster}</p>
            <p>{result.energyProfile.relationshipPattern}</p>
            <p>{result.energyProfile.meetingStyle}</p>
          </div>
          <div className="space-y-3 rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-sm text-[#f4dfbb]">오행 밸런스</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {result.energyProfile.usefulElements.map((element) => (
                <span key={`useful-${element}`} className={`rounded-full border px-2.5 py-1 ${elementToneClass(element)}`}>
                  핵심 {elementLabel(element)}
                </span>
              ))}
              {result.energyProfile.avoidElements.map((element) => (
                <span key={`avoid-${element}`} className="rounded-full border border-rose-200/45 bg-rose-300/15 px-2.5 py-1 text-rose-100">
                  과열 주의 {elementLabel(element)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="타이밍" subtitle="Timing Window" icon={<Moon size={18} />} index={2}>
        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">Season</p>
            <p className={`mt-2 text-lg text-[#fff6e8] ${serifClass}`}>{result.luckyTiming.bestSeasons.join(" · ")}</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">Month</p>
            <p className={`mt-2 text-lg text-[#fff6e8] ${serifClass}`}>{result.luckyTiming.bestMonths.join(" · ")}</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">Clock</p>
            <p className={`mt-2 text-lg text-[#fff6e8] ${serifClass}`}>{result.luckyTiming.bestTimeOfDay.join(" · ")}</p>
          </article>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[#e5dccd]">{result.luckyTiming.explanation}</p>
      </SectionCard>

      <SectionCard title="장소 TOP 5" subtitle="Where Destiny Opens" icon={<MapPin size={18} />} index={3}>
        <div className="grid gap-3 md:grid-cols-2">
          {result.recommendedPlaces.map((place) => (
            <article key={place.name} className="rounded-2xl border border-[#efd8b4]/35 bg-[linear-gradient(150deg,rgba(26,31,48,0.58),rgba(33,24,44,0.5))] p-4 text-sm text-[#efe7d9]">
              <div className="flex items-center justify-between gap-3">
                <p className={`text-xl text-[#fff2df] ${serifClass}`}>#{place.rank} {place.name}</p>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] ${elementToneClass(place.element)}`}>{elementLabel(place.element)}</span>
              </div>
              <p className="mt-2 text-xs text-[#d9cab1]">인연 가능성 {place.romancePotential}%</p>
              {place.sceneDescription ? <p className="mt-3 leading-relaxed text-[#f2e7d6]">{place.sceneDescription}</p> : null}
              <p className="mt-2 leading-relaxed text-[#e8dccb]">{place.reason}</p>
              {place.emotionalHook ? <p className="mt-2 text-[#d8cbb8]">{place.emotionalHook}</p> : null}
              {place.conversationOpener ? (
                <div className="mt-3 rounded-xl border border-white/15 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#e6c793]">Conversation Cue</p>
                  <p className="mt-1 text-[#f3eadf]">{place.conversationOpener}</p>
                </div>
              ) : null}
              <p className="mt-3 text-[#e4d5be]">{place.actionTip}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="액션 플랜" subtitle="This Week Ritual" icon={<Star size={18} />} index={4}>
        <div className="space-y-3 text-sm text-[#ece4d7]">
          <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">오늘</p>
            <p className="mt-1 leading-relaxed">{result.practicalPlan.todayAction}</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">이번 주</p>
            <p className="mt-1 leading-relaxed">{result.practicalPlan.thisWeekAction}</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">이번 달</p>
            <p className="mt-1 leading-relaxed">{result.practicalPlan.thisMonthAction}</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">원정 플랜</p>
            <p className="mt-1 leading-relaxed">{result.practicalPlan.travelAction}</p>
          </article>
          {result.practicalPlan.toneReminder ? (
            <article className="rounded-2xl border border-[#f0d7ad]/40 bg-[#f0d7ad]/10 p-4 text-[#f6ebd5]">
              <p className="text-xs uppercase tracking-[0.16em] text-[#f2ddb8]">Tone Reminder</p>
              <p className="mt-1 leading-relaxed">{result.practicalPlan.toneReminder}</p>
            </article>
          ) : null}
          {result.practicalPlan.microActions?.length ? (
            <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">실전 마이크로 액션</p>
              <div className="mt-2 space-y-2 text-[#ede3d4]">
                {result.practicalPlan.microActions.map((action) => (
                  <p key={action}>- {action}</p>
                ))}
              </div>
            </article>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">스타일 시그니처</p>
            <p className={`mt-2 text-lg text-[#fff2de] ${serifClass}`}>{result.stylingGuide.mood}</p>
            <p className="mt-2 text-sm text-[#e8ddcd]">{result.stylingGuide.outfit}</p>
            <p className="mt-1 text-sm text-[#e8ddcd]">컬러: {result.stylingGuide.colors.join(" · ")}</p>
            {result.stylingGuide.fragrance ? <p className="mt-1 text-sm text-[#e8ddcd]">향: {result.stylingGuide.fragrance}</p> : null}
          </article>

          <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">도시 무드 추천</p>
            <div className="mt-2 space-y-2">
              {result.recommendedCountries.slice(0, 2).map((city) => (
                <div key={`${city.country}-${city.rank}`} className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <p className={`text-base text-[#fff2de] ${serifClass}`}>{city.country}</p>
                  <p className="text-sm text-[#e9dfd1]">{city.cities.join(" · ")}</p>
                  <p className="text-xs text-[#d9cebd]">{city.travelMood}</p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-[#e9dfd1]">
          <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">주의할 흐름</p>
          <p className="mt-2 leading-relaxed">장소: {result.avoidGuide.avoidPlaces.join(" · ")}</p>
          <p className="mt-1 leading-relaxed">타이밍: {result.avoidGuide.avoidTiming.join(" · ")}</p>
          <p className="mt-1 leading-relaxed">패턴: {result.avoidGuide.avoidPatterns.join(" · ")}</p>
          <p className="mt-2 text-[#dacdb8]">{result.avoidGuide.reason}</p>
        </div>
      </SectionCard>

    </div>
  );
}
