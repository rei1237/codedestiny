"use client";
import {useEffect,useState} from "react";
import {useNakshatraCopy} from "../_lib/copy";

export interface TodayMoon {
  ok: boolean;
  todayNakshatra: { nameKo: string };
  todaySukuyo: { nameKo: string; nameHan: string } | null;
  personal: {
    dayFortune: { headline: string; advice: string; tierLabel: string } | null;
    taraBala: { ko: string; desc: string } | null;
  } | null;
}

const webMoon=async(index:number):Promise<TodayMoon>=>{
  const response=await fetch(`/api/nakshatra/today?sukuyoIndex=${index}`);
  return response.json();
};
export default function TodayMoonCard({sukuyoIndex,load=webMoon}:{sukuyoIndex:number;load?:(index:number)=>Promise<TodayMoon>}) {
  const copy = useNakshatraCopy();
  const [today, setToday] = useState<TodayMoon | null>(null);

  useEffect(() => {
    let active = true;
    load(sukuyoIndex)
      .then((d) => {
        if (active && d && d.ok) setToday(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [load,sukuyoIndex]);

  if (!today) return null;

  const sukuyoLine = today.todaySukuyo ? ` · ${today.todaySukuyo.nameKo}(${today.todaySukuyo.nameHan})` : "";

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6" aria-labelledby="today-h">
      <h2 id="today-h" className="text-base font-bold text-slate-100">{copy.resultTodayMoonTitle}</h2>
      <p className="mt-2 break-keep text-sm leading-7 text-slate-200">
        {copy.resultTodayMoonText(today.todayNakshatra?.nameKo || "", sukuyoLine)}
      </p>
      {today.personal?.dayFortune && (
        <p className="mt-2 break-keep text-sm leading-7 text-slate-200">
          <span className="font-semibold text-blue-100">{copy.resultEasternTodayLabel}</span>
          {today.personal.dayFortune.headline} — {today.personal.dayFortune.advice}
        </p>
      )}
      {today.personal?.taraBala && (
        <p className="mt-1 break-keep text-sm leading-7 text-slate-200">
          <span className="font-semibold text-amber-100">{copy.resultIndianTodayLabel}</span>
          {today.personal.taraBala.ko} — {today.personal.taraBala.desc}
        </p>
      )}
    </section>
  );
}
