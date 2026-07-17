"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export const NAKSHATRA_RESULT_STORAGE_KEY = "nakshatra:result:v1";

interface CityPreset {
  label: string;
  lat: number;
  lon: number;
}

// 출생 지역 프리셋(한국 KST). 달의 나크샤트라는 위경도 의존이 미미하나 스펙(출생지)을 존중.
const CITY_PRESETS: CityPreset[] = [
  { label: "서울", lat: 37.5665, lon: 126.978 },
  { label: "부산", lat: 35.1796, lon: 129.0756 },
  { label: "대구", lat: 35.8714, lon: 128.6014 },
  { label: "인천", lat: 37.4563, lon: 126.7052 },
  { label: "광주", lat: 35.1595, lon: 126.8526 },
  { label: "대전", lat: 36.3504, lon: 127.3845 },
  { label: "제주", lat: 33.4996, lon: 126.5312 },
];

const nowYear = new Date().getFullYear();

export default function NakshatraFormClient() {
  const router = useRouter();
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [cityIndex, setCityIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) {
      setError("생년월일을 정확히 입력해 주세요.");
      return;
    }

    const city = CITY_PRESETS[cityIndex] || CITY_PRESETS[0];
    const body = {
      year: y,
      month: m,
      day: d,
      hour: timeUnknown ? 12 : Number(hour || 12),
      minute: timeUnknown ? 0 : Number(minute || 0),
      timezone: 9,
      lat: city.lat,
      lon: city.lon,
      timeUnknown,
    };

    setLoading(true);
    try {
      const res = await fetch("/api/nakshatra/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.ok) {
        setError(
          data && data.message
            ? data.message
            : "별의 위치를 계산하지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
        setLoading(false);
        return;
      }
      try {
        sessionStorage.setItem(NAKSHATRA_RESULT_STORAGE_KEY, JSON.stringify(data));
      } catch {
        // sessionStorage 불가(사생활 모드 등) — 결과 화면에서 재입력 안내로 폴백.
      }
      router.push("/nakshatra/result");
    } catch {
      setError("네트워크 오류가 발생했어요. 연결을 확인하고 다시 시도해 주세요.");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-amber-200/60 focus:bg-white/[0.06]";
  const labelClass = "mb-1.5 block text-xs font-semibold tracking-wide text-amber-100/80";

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-6"
      aria-label="나크샤트라 결정판 입력"
    >
      <fieldset className="mb-4">
        <legend className="mb-2 text-sm font-semibold text-slate-100">생년월일 (양력)</legend>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelClass} htmlFor="nk-year">연도</label>
            <input id="nk-year" className={inputClass} inputMode="numeric" placeholder={String(nowYear - 30)}
              value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          </div>
          <div>
            <label className={labelClass} htmlFor="nk-month">월</label>
            <input id="nk-month" className={inputClass} inputMode="numeric" placeholder="1~12"
              value={month} onChange={(e) => setMonth(e.target.value.replace(/\D/g, "").slice(0, 2))} />
          </div>
          <div>
            <label className={labelClass} htmlFor="nk-day">일</label>
            <input id="nk-day" className={inputClass} inputMode="numeric" placeholder="1~31"
              value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, "").slice(0, 2))} />
          </div>
        </div>
      </fieldset>

      <fieldset className="mb-4">
        <legend className="mb-2 text-sm font-semibold text-slate-100">태어난 시각</legend>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass} htmlFor="nk-hour">시 (0~23)</label>
            <input id="nk-hour" className={inputClass} inputMode="numeric" placeholder="14" disabled={timeUnknown}
              value={hour} onChange={(e) => setHour(e.target.value.replace(/\D/g, "").slice(0, 2))} />
          </div>
          <div>
            <label className={labelClass} htmlFor="nk-minute">분 (0~59)</label>
            <input id="nk-minute" className={inputClass} inputMode="numeric" placeholder="30" disabled={timeUnknown}
              value={minute} onChange={(e) => setMinute(e.target.value.replace(/\D/g, "").slice(0, 2))} />
          </div>
        </div>
        <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" className="h-4 w-4 rounded border-white/30 bg-transparent accent-amber-300"
            checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} />
          태어난 시간을 몰라요 (정오 기준 · 파다는 생략)
        </label>
      </fieldset>

      <div className="mb-5">
        <label className={labelClass} htmlFor="nk-city">태어난 지역</label>
        <select id="nk-city" className={inputClass}
          value={cityIndex} onChange={(e) => setCityIndex(Number(e.target.value))}>
          {CITY_PRESETS.map((c, i) => (
            <option key={c.label} value={i} className="bg-slate-900">{c.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-200 px-5 text-sm font-bold text-slate-950 shadow-[0_16px_44px_rgba(251,191,36,0.22)] transition hover:bg-amber-100 disabled:opacity-60">
        {loading ? "별을 읽는 중…" : "내 별의 두 이름 확인하기"}
      </button>
      <p className="mt-3 text-center text-xs leading-6 text-slate-300">
        본 서비스는 전통 별자리 문화 콘텐츠이며, 의료·법률·투자 판단의 근거로 사용할 수 없습니다.
      </p>
    </form>
  );
}
