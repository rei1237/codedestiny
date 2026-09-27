"use client";
import Link from "next/link";
import { useState } from "react";
import type { WeekDayRow } from "@/lib/fortune/build-view";
type Reading = { id: string; name: string; kind: "zodiac" | "animal"; range: string; narrative: string; advice: string; days: WeekDayRow[] };
export default function WeeklyFortune({ readings }: { readings: Reading[] }) {
  const [id, setId] = useState(readings[0]?.id || "");
  const selected = readings.find(item => item.id === id);
  if (!selected) return <p className="mt-6 text-rose-100">이번 주 이야기를 준비하지 못했어요. 잠시 후 다시 확인해 주세요.</p>;
  const best = [...selected.days].sort((a, b) => b.score - a.score)[0];
  const gentle = [...selected.days].sort((a, b) => a.score - b.score)[0];
  return <section className="mt-8 text-rose-50" aria-label="연이의 주간 운세">
    <h2 className="text-xl font-bold">한 주의 이야기를 골라볼까요?</h2>
    <p className="mt-3 text-sm leading-7 text-rose-100">별자리는 태양의 자리로, 띠는 태어난 해의 지지로 읽어요. 서로 다른 이야기이니 각각 살펴보고 나에게 필요한 조언을 골라봐요.</p>
    <label className="mt-5 block font-bold">별자리·띠 선택<select value={id} onChange={event => setId(event.target.value)} className="mt-2 block min-h-12 w-full rounded-xl border border-rose-200/40 bg-[#291723] px-4 text-base text-rose-50">
      {(['zodiac', 'animal'] as const).map(kind => <optgroup key={kind} label={kind === 'zodiac' ? '별자리' : '띠'}>{readings.filter(item => item.kind === kind).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>)}
    </select></label>
    <article className="mt-6" aria-live="polite">
      <h3 className="text-lg font-bold">연이가 들려주는 {selected.name}의 한 주</h3><p className="mt-2 text-sm text-rose-200">{selected.range}</p>
      <p className="mt-4 leading-8">자, 이번 주의 찻잔을 천천히 들여다봐요. {best && gentle ? <>이번 주 {selected.name}의 흐름은 {best.weekdayKo}요일에 가장 힘이 실려요. 미뤄둔 작은 일을 시작해보는 건 어떨까요? {gentle.weekdayKo}요일에는 조금 더 천천히 걸어가요. {best.ymd === gentle.ymd && '할 일과 쉬는 시간을 나눠두면 좋겠어요.'}</> : '하루씩 살펴보며 나에게 편안한 속도를 찾아봐요.'}</p>
      <details className="mt-4"><summary className="min-h-11 cursor-pointer text-sm text-rose-200">연이가 살펴본 주간 해석 근거</summary><p className="mt-2 text-sm leading-7">{selected.narrative}</p></details>
      <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="요일별 흐름">{selected.days.map(day => <li key={day.ymd} className="rounded-xl border border-rose-200/25 px-3 py-3"><p className="font-bold">{day.weekdayKo} · {day.ymd.slice(5).replace('-', '/')}</p><p className="mt-1 text-sm text-rose-100">총운 {day.score}/10 · {day.ganji}</p></li>)}</ul>
      <h4 className="mt-6 font-bold">연이와 챙기는 작은 실천</h4><p className="mt-2 leading-8">{selected.advice}</p><p className="mt-3 text-sm leading-7 text-rose-100">점수가 낮은 날도 겁먹지 말아요. 일정을 조금 느슨하게 잡고, 나를 돌보는 여유를 남기면 돼요.</p>
      <Link href={`/fortune/weekly/${selected.id}/`} className="mt-5 inline-flex min-h-12 items-center rounded-full bg-rose-200 px-5 py-3 font-bold text-rose-950">{selected.name} 주간 해석 자세히 보기</Link>
    </article>
  </section>;
}
