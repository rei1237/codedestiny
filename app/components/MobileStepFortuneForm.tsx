"use client";

type FormState = {
  name: string;
  birthDate: string;
  calType: "solar" | "lunar" | "lunar_leap";
  birthHour: string;
  birthMinute: string;
  birthCountry: string;
  gender: "F" | "M";
  agreed: boolean;
};

type Props = {
  step: number;
  setStep: (step: number) => void;
  state: FormState;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSubmit: () => void;
};

const COUNTRY_OPTIONS = [
  { value: "Asia/Seoul", label: "대한민국 (서울)" },
  { value: "Asia/Tokyo", label: "일본 (도쿄)" },
  { value: "Asia/Shanghai", label: "중국 (상하이)" },
  { value: "America/New_York", label: "미국 (뉴욕)" },
  { value: "Europe/London", label: "영국 (런던)" },
  { value: "Europe/Berlin", label: "독일 (베를린)" },
  { value: "Asia/Kuala_Lumpur", label: "말레이시아 (쿠알라룸푸르)" },
  { value: "Asia/Bangkok", label: "태국 (방콕)" },
  { value: "Asia/Kolkata", label: "인도 (콜카타)" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "10", "20", "30", "40", "50"];

export default function MobileStepFortuneForm({ step, setStep, state, setField, onSubmit }: Props) {
  return (
    <div className="md:hidden">
      <div className="mb-3 flex items-center gap-1.5">
        {[1, 2, 3].map((n) => (
          <span
            key={`step-${n}`}
            className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-violet-300" : "bg-slate-600/70"}`}
          />
        ))}
      </div>

      {step === 1 ? (
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-200">
            이름
            <input
              value={state.name}
              onChange={(e) => setField("name", e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-500/40 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100"
              placeholder="이름을 입력하세요"
            />
          </label>

          <label className="block text-xs font-semibold text-slate-200">
            생년월일
            <input
              type="date"
              value={state.birthDate}
              onChange={(e) => setField("birthDate", e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-500/40 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100"
            />
          </label>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setField("calType", "solar")}
              className={`rounded-xl px-2 py-2 text-xs font-semibold ${state.calType === "solar" ? "bg-violet-500/35 text-violet-100" : "bg-slate-800/70 text-slate-300"}`}
            >
              양력
            </button>
            <button
              type="button"
              onClick={() => setField("calType", "lunar")}
              className={`rounded-xl px-2 py-2 text-xs font-semibold ${state.calType === "lunar" ? "bg-violet-500/35 text-violet-100" : "bg-slate-800/70 text-slate-300"}`}
            >
              음력
            </button>
            <button
              type="button"
              onClick={() => setField("calType", "lunar_leap")}
              className={`rounded-xl px-2 py-2 text-xs font-semibold ${state.calType === "lunar_leap" ? "bg-violet-500/35 text-violet-100" : "bg-slate-800/70 text-slate-300"}`}
            >
              윤달
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-200">출생 시간</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <select
                value={state.birthHour}
                onChange={(e) => setField("birthHour", e.target.value)}
                className="rounded-xl border border-slate-500/40 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100"
              >
                {HOURS.map((h) => (
                  <option key={`h-${h}`} value={h}>{h}시</option>
                ))}
              </select>
              <select
                value={state.birthMinute}
                onChange={(e) => setField("birthMinute", e.target.value)}
                className="rounded-xl border border-slate-500/40 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100"
              >
                {MINUTES.map((m) => (
                  <option key={`m-${m}`} value={m}>{m}분</option>
                ))}
              </select>
            </div>
          </div>

          <label className="block text-xs font-semibold text-slate-200">
            출생 국가/장소
            <select
              value={state.birthCountry}
              onChange={(e) => setField("birthCountry", e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-500/40 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100"
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-200">성별</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setField("gender", "F")}
                className={`rounded-xl px-3 py-2.5 text-xs font-semibold ${state.gender === "F" ? "bg-violet-500/35 text-violet-100" : "bg-slate-800/70 text-slate-300"}`}
              >
                여성
              </button>
              <button
                type="button"
                onClick={() => setField("gender", "M")}
                className={`rounded-xl px-3 py-2.5 text-xs font-semibold ${state.gender === "M" ? "bg-violet-500/35 text-violet-100" : "bg-slate-800/70 text-slate-300"}`}
              >
                남성
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2 rounded-xl border border-slate-500/35 bg-slate-900/65 p-3 text-xs text-slate-200">
            <input
              type="checkbox"
              checked={state.agreed}
              onChange={(e) => setField("agreed", e.target.checked)}
              className="mt-0.5"
            />
            <span>개인정보 처리 및 운세 계산 이용에 동의합니다.</span>
          </label>

          <button
            type="button"
            onClick={onSubmit}
            className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-3 text-sm font-bold text-white"
          >
            운명의 지도 보기
          </button>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={step === 1}
          onClick={() => setStep(Math.max(1, step - 1))}
          className="rounded-xl border border-slate-500/35 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-40"
        >
          이전
        </button>
        <button
          type="button"
          disabled={step === 3}
          onClick={() => setStep(Math.min(3, step + 1))}
          className="rounded-xl border border-violet-300/40 bg-violet-500/20 px-3 py-2 text-xs font-semibold text-violet-100 disabled:opacity-40"
        >
          다음
        </button>
      </div>
    </div>
  );
}
