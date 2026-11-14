"use client";
import {useState,type FormEvent} from "react";
import {computeFreeSaju,preloadFreeSajuEngine} from "@/lib/free-saju/engine";
import type {FreeSajuReading} from "@/lib/free-saju/compute";
import {birthDateTextInputProps} from "@/lib/birthDateInputProps";
import {elementBalanceLine} from "@/lib/free-saju/copy";
import {trackEvent} from "@/lib/analytics";

export default function FreeSajuForm() {
  const [birthDate,setBirthDate]=useState("");
  const [reading,setReading]=useState<FreeSajuReading|null>(null);
  const [pending,setPending]=useState(false), [error,setError]=useState("");
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); const data=new FormData(e.currentTarget);
    setPending(true);setError("");setReading(null);
    try {
      const calendar=data.get("calendar");
      // 측정값에는 화면 이름과 출생시각 입력 여부만 싣는다. 생년월일은 싣지 않는다.
      const measure={surface:"saju_free",time_known:Boolean(String(data.get("time")||""))};
      trackEvent("free_saju_chart_started",measure);
      setReading(await computeFreeSaju({birthDate:String(data.get("date")),birthTime:String(data.get("time")||"")||null,calendarType:calendar==="solar"?"solar":"lunar",leapMonth:calendar==="leap"}));
      trackEvent("free_saju_chart_completed",measure);
    } catch {setError("입력한 날짜와 달력 구분을 확인해 주세요.");}
    finally {setPending(false);}
  }
  return <section className="my-6 rounded-3xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5" aria-labelledby="quick-chart-title">
    <h2 id="quick-chart-title" className="text-xl font-bold">생년월일로 내 명식 보기</h2>
    <p className="my-3">서울 기준으로 계산해요. 출생시각을 모르면 비워 두세요.</p>
    <form onSubmit={submit} onFocus={()=>{void preloadFreeSajuEngine().catch(()=>{});}} className="flex flex-wrap items-end gap-3">
      <label>생년월일<input className="block rounded-xl border p-2" name="date" {...birthDateTextInputProps(birthDate,setBirthDate)} required/></label>
      <label>달력<select className="block rounded-xl border p-2" name="calendar"><option value="solar">양력</option><option value="lunar">음력</option><option value="leap">음력 윤달</option></select></label>
      <label>출생시각 (선택)<input className="block rounded-xl border p-2" name="time" type="time"/></label>
      <button className="rounded-full bg-[#39304e] px-4 py-2 text-white" disabled={pending}>{pending?"계산 중":"명식 보기"}</button>
    </form>
    <div aria-live="polite">{error && <p>{error}</p>}{reading && <div className="mt-4">
      <p><b>년주 {reading.pillars.year} · 월주 {reading.pillars.month} · 일주 {reading.pillars.day} · 시주 {reading.pillars.hour||"미상"}</b></p>
      <p>{elementBalanceLine(reading.elements)}</p>
    </div>}</div>
  </section>;
}
