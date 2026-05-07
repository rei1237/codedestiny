"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

/* ─────────────────────────── 타입 ─────────────────────────── */
interface ApiResult {
  ok: boolean;
  result?: {
    dominantElement: string;
    secondaryElement: string;
    zodiac: string;
    colorKo: string;
    colorEn: string;
    animals: string[];
    mainAnimal: string;
    expressionKo: string;
    personalitySummaryKo: string;
    personalityLines: string[];
    headlineKo: string;
  };
  imageUrl?: string;
  fallback?: boolean;
  fallbackMessage?: string;
  message?: string;
}

type Phase = "intro" | "form" | "loading" | "result" | "error";

/* ─────────────────────── 선택 옵션 ─────────────────────────── */
const YEARS = Array.from({ length: 100 }, (_, i) => 2024 - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const ELEMENT_EMOJI: Record<string, string> = {
  목: "🌿",
  화: "🔥",
  토: "🌙",
  금: "✨",
  수: "💧",
};

const ELEMENT_BG: Record<string, string> = {
  목: "from-emerald-50 via-mint-50 to-green-100",
  화: "from-rose-50 via-pink-50 to-orange-100",
  토: "from-amber-50 via-yellow-50 to-orange-100",
  금: "from-slate-50 via-gray-50 to-purple-50",
  수: "from-sky-50 via-blue-50 to-violet-100",
};

const ANIMAL_EMOJI: Record<string, string> = {
  토끼: "🐰",
  호랑이: "🐯",
  뱀: "🐍",
  말: "🐴",
  소: "🐮",
  개: "🐶",
  용: "🐲",
  원숭이: "🐒",
  닭: "🐔",
  쥐: "🐭",
  돼지: "🐷",
};

const SAJU_PICTURE_VALUE_SECTIONS = [
  {
    title: "1. 사주 동물 해석은 성격 낙인이 아니라 현재 에너지 번역입니다",
    body:
      "사주 동물 결과는 당신을 하나의 동물로 고정하려는 진단이 아니라, 지금 시점의 오행 균형을 직관적으로 이해하도록 돕는 번역 장치입니다. 같은 사람도 시기와 환경에 따라 기운의 체감이 달라질 수 있기 때문에 결과를 절대값으로 보지 않고, 현재 나의 강점과 피로 구간을 파악하는 참고 자료로 읽는 것이 더 정확합니다.",
  },
  {
    title: "2. 오행 조합은 강약이 아니라 배합의 문제입니다",
    body:
      "목·화·토·금·수의 비율은 높고 낮음 자체보다 어떤 조합으로 일상에 드러나는지가 중요합니다. 예를 들어 추진력이 강한 조합은 시작이 빠르지만 과열되기 쉽고, 안정형 조합은 리스크 관리가 좋지만 결정이 늦어질 수 있습니다. 이 배합 관점으로 보면 결과가 성격 평가가 아닌 생활 운영 힌트로 바뀝니다.",
  },
  {
    title: "3. 동물 이미지와 성격 문장은 함께 읽어야 의미가 선명합니다",
    body:
      "이미지 자체는 감각적 이해를 돕고, 성격 문장은 행동 패턴을 설명합니다. 둘 중 하나만 보면 해석이 피상적으로 끝나기 쉽습니다. 결과 카드의 핵심 문장을 바탕으로 \"내가 스트레스 받을 때 어떤 반응을 보이는가\"를 체크하면, 단순한 재미 콘텐츠를 넘어 자기이해 도구로 활용할 수 있습니다.",
  },
  {
    title: "4. 관계 활용은 상대 판정보다 내 소통 습관 점검이 우선입니다",
    body:
      "동물 결과를 가지고 타인을 단정하면 오해가 커질 수 있습니다. 대신 내가 갈등 상황에서 급해지는지, 회피하는지, 확인 질문을 잘 하는지 같은 소통 습관을 먼저 점검하는 데 사용하세요. 결과를 기반으로 대화 속도와 표현 강도를 조정하면 같은 관계에서도 체감 충돌이 눈에 띄게 줄어듭니다.",
  },
  {
    title: "5. 기록과 비교를 통해 변화 신호를 읽어보세요",
    body:
      "한 번의 결과보다 일정 간격으로 다시 확인한 기록이 더 큰 통찰을 줍니다. 중요한 프로젝트 전후, 관계 변화 시점, 수면 패턴이 바뀐 시점에 결과를 비교하면 현재 컨디션과 선택 성향의 변화를 관찰할 수 있습니다. 이런 비교 데이터는 다음 행동 전략을 세우는 데 현실적인 기준이 됩니다.",
  },
  {
    title: "6. 결과는 실행 항목 2개로 마무리할 때 가치가 커집니다",
    body:
      "해석을 읽은 뒤 이번 주에 바로 적용할 행동 2가지를 정해보세요. 예를 들어 감정 기복이 크게 보인다면 휴식 블록을 일정에 고정하고, 관계 긴장이 보인다면 확인 질문을 먼저 하는 규칙을 추가하는 방식입니다. 이렇게 작은 실행으로 연결할 때 사주 동물 리딩은 즐거움과 실용성을 동시에 갖춘 도구가 됩니다.",
  },
] as const;

/* ─────────────────────────── 셀렉터 UI ─────────────────────── */
function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-pink-400 tracking-widest uppercase pl-1">
        {label}
      </label>
      <div className="relative">
        <select
          className="w-full appearance-none rounded-2xl bg-white/80 backdrop-blur-sm border border-pink-200/80 text-slate-700 text-sm font-medium px-4 py-3 pr-9 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 transition-all cursor-pointer shadow-sm hover:border-pink-300"
          style={{ color: "#374151", colorScheme: "light", WebkitTextFillColor: "#374151" }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" style={{ color: "#9ca3af" }}>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value} style={{ color: "#374151" }}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── 로딩 애니메이션 ───────────────────── */
function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-6">
      {/* 파티클 애니메이션 */}
      <div className="relative w-40 h-40">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-pink-300/40"
            style={{
              animation: `ping ${1.2 + i * 0.3}s cubic-bezier(0,0,0.2,1) ${i * 0.2}s infinite`,
              opacity: 0.6 - i * 0.08,
            }}
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-300 via-lavender-200 to-purple-300 flex items-center justify-center shadow-lg shadow-pink-200/60 animate-bounce">
            <span className="text-3xl">🌟</span>
          </div>
        </div>
      </div>

      {/* 텍스트 */}
      <div className="text-center space-y-3">
        <p className="text-lg font-bold text-slate-700">
          우주의 기운을 모아 동물을 그리는 중...
        </p>
        <p className="text-sm text-pink-400 font-medium animate-pulse">
          ✨ AI가 당신만의 동물을 정성스럽게 그리고 있어요 ✨
        </p>
        <div className="flex justify-center gap-2 mt-2">
          {["🌸", "🌙", "⭐", "🌸", "🌙"].map((emoji, i) => (
            <span
              key={i}
              className="text-lg"
              style={{
                animation: `bounce 1s ${i * 0.15}s ease-in-out infinite alternate`,
                display: "inline-block",
              }}
            >
              {emoji}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-4">AI 이미지 생성에 10~30초 소요될 수 있어요</p>
      </div>
    </div>
  );
}

/* ─────────────────────── 결과 카드 ─────────────────────────── */
function ResultCard({
  data,
  onReset,
}: {
  data: ApiResult;
  onReset: () => void;
}) {
  const result = data.result!;
  const imageUrl = data.imageUrl!;
  const animalEmoji = ANIMAL_EMOJI[result.mainAnimal] ?? "🐾";
  const bgGrad = ELEMENT_BG[result.dominantElement] ?? "from-pink-50 to-purple-50";
  const elementEmoji = ELEMENT_EMOJI[result.dominantElement] ?? "✨";
  const imgRef = useRef<HTMLImageElement>(null);

  const handleDownload = useCallback(() => {
    if (!imageUrl || imageUrl.startsWith("/fuctionassets")) {
      alert("생성된 이미지가 없어 다운로드할 수 없어요 💫");
      return;
    }
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `사주동물_${result.mainAnimal}_${Date.now()}.png`;
    link.click();
  }, [imageUrl, result.mainAnimal]);

  const handleShare = useCallback(async () => {
    const text = `${result.headlineKo}\n\n${result.personalityLines.join(" ")}\n\n🔮 코드 데스티니에서 나의 동물을 알아보세요! https://code-destiny.com/saju-picture`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "사주로 보는 내 동물", text });
      } catch {
        /* 취소 */
      }
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
      alert("클립보드에 복사됐어요! 📋");
    }
  }, [result]);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGrad} px-4 py-8`}>
      <div className="max-w-md mx-auto space-y-5">
        {/* 헤더 */}
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold text-pink-400 tracking-widest uppercase">
            {elementEmoji} 사주 동물 결과
          </p>
          <h1 className="text-2xl font-black text-slate-800 leading-snug">
            {result.headlineKo}
          </h1>
        </div>

        {/* 동물 이미지 */}
        <div className="relative mx-auto w-full max-w-sm aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-pink-200/50 border-4 border-white/70 bg-white">
          {data.fallback ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-6 text-center gap-4">
              <span className="text-6xl">{animalEmoji}</span>
              <Image
                src={imageUrl}
                alt={`${result.mainAnimal} 폴백 이미지`}
                fill
                className="object-cover opacity-40"
                sizes="(max-width: 768px) 100vw, 384px"
              />
              <p className="relative z-10 text-sm text-slate-600 font-medium bg-white/80 rounded-xl px-3 py-2">
                {data.fallbackMessage}
              </p>
            </div>
          ) : imageUrl.startsWith("data:") ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              ref={imgRef}
              src={imageUrl}
              alt={`AI 생성 ${result.mainAnimal} 캐릭터`}
              className="w-full h-full object-cover"
            />
          ) : (
            <Image
              src={imageUrl}
              alt={`AI 생성 ${result.mainAnimal} 캐릭터`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 384px"
            />
          )}

          {/* 뱃지 */}
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold text-pink-500 shadow-sm">
            {elementEmoji} {result.dominantElement}기운
          </div>
        </div>

        {/* 오행 배지 */}
        <div className="flex justify-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-sm border border-pink-200 rounded-full px-4 py-1.5 text-sm font-bold text-slate-700 shadow-sm">
            {animalEmoji} {result.animals.join(" + ")}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-sm border border-purple-200 rounded-full px-4 py-1.5 text-sm font-semibold text-slate-600 shadow-sm">
            🎨 {result.colorKo}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-sm border border-amber-200 rounded-full px-4 py-1.5 text-sm font-semibold text-slate-600 shadow-sm">
            ✦ {result.zodiac}띠
          </span>
        </div>

        {/* 성격 카드 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 border border-white shadow-lg shadow-pink-100/50 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{animalEmoji}</span>
            <div>
              <p className="text-xs text-pink-400 font-semibold">나의 동물 성격</p>
              <p className="text-sm font-bold text-slate-700">
                {result.expressionKo} {result.mainAnimal}
              </p>
            </div>
          </div>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-pink-200 to-transparent" />
          <ul className="space-y-2">
            {result.personalityLines.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed">
                <span className="text-pink-400 mt-0.5 shrink-0">✦</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 액션 버튼 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDownload}
            className="flex flex-col items-center gap-1.5 bg-gradient-to-br from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 text-white rounded-2xl py-4 font-bold text-sm shadow-lg shadow-rose-200/60 transition-all active:scale-95"
          >
            <span className="text-xl">⬇️</span>
            이미지 저장
          </button>
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1.5 bg-gradient-to-br from-purple-400 to-violet-500 hover:from-purple-500 hover:to-violet-600 text-white rounded-2xl py-4 font-bold text-sm shadow-lg shadow-violet-200/60 transition-all active:scale-95"
          >
            <span className="text-xl">🔗</span>
            공유하기
          </button>
        </div>

        {/* 다시하기 */}
        <button
          onClick={onReset}
          className="w-full bg-white/80 hover:bg-white border border-pink-200 hover:border-pink-300 text-slate-600 font-semibold rounded-2xl py-3.5 text-sm transition-all active:scale-95 shadow-sm"
        >
          🔄 다시 해보기
        </button>

        {/* 저작권 */}
        <p className="text-center text-xs text-slate-400 pb-2">
          AI가 사주 오행을 분석해 생성한 이미지입니다 · Code Destiny
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────── 메인 페이지 ───────────────────────── */
export default function SajuPicturePage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthHour, setBirthHour] = useState("");
  const [apiData, setApiData] = useState<ApiResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const isFormValid = birthYear && birthMonth && birthDay;

  const handleSubmit = useCallback(async () => {
    if (!isFormValid) return;
    setPhase("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/saju-animal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: Number(birthYear),
          birthMonth: Number(birthMonth),
          birthDay: Number(birthDay),
          birthHour: birthHour !== "" ? Number(birthHour) : 12,
          birthMinute: 0,
        }),
      });

      const data: ApiResult = await res.json();

      if (data.ok || data.fallback) {
        setApiData(data);
        setPhase("result");
      } else {
        setErrorMsg(data.message ?? "잠시 후 다시 시도해 주세요.");
        setPhase("error");
      }
    } catch {
      setErrorMsg("네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
      setPhase("error");
    }
  }, [birthYear, birthMonth, birthDay, birthHour, isFormValid]);

  const handleReset = useCallback(() => {
    setPhase("intro");
    setApiData(null);
    setErrorMsg("");
  }, []);

  /* ── 결과 화면 ── */
  if (phase === "result" && apiData) {
    return <ResultCard data={apiData} onReset={handleReset} />;
  }

  /* ── 에러 화면 ── */
  if (phase === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100 flex items-center justify-center px-6">
        <div className="text-center max-w-sm space-y-5">
          <div className="text-6xl">😢</div>
          <div className="bg-white/80 rounded-3xl p-6 shadow-lg space-y-3">
            <p className="text-slate-700 font-semibold leading-relaxed">
              앗, 동물을 데려오다가 길을 잃었어요!<br />기본 동물 이미지를 보여드릴게요 😢
            </p>
            {errorMsg && <p className="text-xs text-slate-400">{errorMsg}</p>}
          </div>
          <button
            onClick={handleReset}
            className="w-full bg-gradient-to-r from-pink-400 to-rose-500 text-white font-bold rounded-2xl py-3.5 shadow-lg shadow-rose-200/60 active:scale-95 transition-all"
          >
            🔄 다시 시도하기
          </button>
        </div>
      </div>
    );
  }

  /* ── 로딩 화면 ── */
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-lavender-50 to-purple-50 flex items-center justify-center">
        <style>{`
          @keyframes ping {
            75%, 100% { transform: scale(2); opacity: 0; }
          }
          @keyframes bounce {
            from { transform: translateY(0); }
            to { transform: translateY(-8px); }
          }
        `}</style>
        <LoadingScreen />
      </div>
    );
  }

  /* ── 인트로 화면 ── */
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-violet-100">
        {/* 뒤로가기 */}
        <div className="sticky top-0 z-20 bg-white/70 backdrop-blur-md border-b border-pink-100/60 px-4 py-3 flex items-center gap-3">
          <a
            href="/"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-pink-100 hover:bg-pink-200 transition-colors"
          >
            <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <span className="text-sm font-semibold text-slate-600">사주로 보는 내 동물</span>
        </div>

        <div className="max-w-md mx-auto px-4 pb-12 space-y-6">
          {/* 히어로 이미지 */}
          <div className="relative w-full aspect-square max-w-sm mx-auto mt-6 rounded-3xl overflow-hidden shadow-2xl shadow-pink-200/60 border-4 border-white/80">
            <Image
              src="/fuctionassets/Who%20am%20I%20with%20saju.webp"
              alt="사주로 보는 나는 무슨 동물?"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 384px"
            />
            {/* 그라디언트 오버레이 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-center">
              <span className="inline-block bg-white/90 backdrop-blur-sm text-slate-800 font-bold text-sm rounded-full px-4 py-1.5 shadow-sm">
                🐾 AI가 그려주는 나의 동물 캐릭터
              </span>
            </div>
          </div>

          {/* 타이틀 */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-500 via-rose-400 to-purple-500 leading-tight">
              사주로 보는<br />나는 무슨 동물? 🌸
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              사주 오행을 분석해 당신을 닮은<br />
              <span className="font-semibold text-pink-500">파스텔 동물 캐릭터</span>를 AI가 직접 그려드려요!
            </p>
          </div>

          {/* 오행 소개 배지 */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { element: "목", emoji: "🌿", color: "from-emerald-100 to-green-100", text: "mint" },
              { element: "화", emoji: "🔥", color: "from-rose-100 to-pink-100", text: "pink" },
              { element: "토", emoji: "🌙", color: "from-amber-100 to-yellow-100", text: "beige" },
              { element: "금", emoji: "✨", color: "from-slate-100 to-gray-100", text: "white" },
              { element: "수", emoji: "💧", color: "from-sky-100 to-blue-100", text: "blue" },
            ].map((item) => (
              <div
                key={item.element}
                className={`flex flex-col items-center gap-1 bg-gradient-to-br ${item.color} rounded-2xl py-3 px-1 border border-white/60 shadow-sm`}
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="text-xs font-bold text-slate-700">{item.element}</span>
                <span className="text-[9px] text-slate-400">{item.text}</span>
              </div>
            ))}
          </div>

          {/* 기능 설명 */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-5 border border-white/60 shadow-md space-y-3">
            {[
              { icon: "🔮", text: "사주 오행을 분석해 나만의 동물 선정" },
              { icon: "🎨", text: "AI가 파스텔 동물 이미지를 직접 생성" },
              { icon: "💌", text: "성격 분석 & 이미지 저장·공유 지원" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl shrink-0">{item.icon}</span>
                <span className="text-sm text-slate-600 font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          <section className="bg-white/70 backdrop-blur-sm rounded-3xl p-5 border border-white/60 shadow-md space-y-3" aria-label="사주 동물 해석 가이드">
            <h2 className="text-sm font-black text-slate-700 tracking-wide">사주 동물 해석을 제대로 쓰는 6단계</h2>
            {SAJU_PICTURE_VALUE_SECTIONS.map((section) => (
              <article key={section.title} className="rounded-2xl border border-pink-100 bg-white/70 p-3.5">
                <h3 className="text-sm font-bold text-pink-600 leading-relaxed">{section.title}</h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{section.body}</p>
              </article>
            ))}
          </section>

          {/* 시작 버튼 */}
          <button
            onClick={() => setPhase("form")}
            className="w-full bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 hover:from-pink-500 hover:via-rose-500 hover:to-purple-500 text-white font-black text-lg rounded-3xl py-5 shadow-xl shadow-pink-200/60 transition-all active:scale-[0.98]"
          >
            🐾 내 동물 캐릭터 알아보기
          </button>

          <p className="text-center text-xs text-slate-400">
            생년월일만 있으면 OK · 태어난 시간은 선택입력
          </p>
        </div>
      </div>
    );
  }

  /* ── 입력 폼 ── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-violet-100">
      {/* 헤더 */}
      <div className="sticky top-0 z-20 bg-white/70 backdrop-blur-md border-b border-pink-100/60 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setPhase("intro")}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-pink-100 hover:bg-pink-200 transition-colors"
        >
          <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-slate-600">생년월일 입력</span>
      </div>

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* 타이틀 */}
        <div className="text-center space-y-1.5">
          <div className="text-4xl">🌸</div>
          <h2 className="text-xl font-black text-slate-800">내 생년월일을 알려주세요!</h2>
          <p className="text-xs text-slate-500">사주 오행 분석으로 나만의 동물 캐릭터를 찾아드려요</p>
        </div>

        {/* 폼 카드 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/60 shadow-xl shadow-pink-100/50 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <SelectField
              label="태어난 년도"
              value={birthYear}
              onChange={setBirthYear}
              placeholder="년도"
              options={YEARS.map((y) => ({ value: String(y), label: `${y}년` }))}
            />
            <SelectField
              label="월"
              value={birthMonth}
              onChange={setBirthMonth}
              placeholder="월"
              options={MONTHS.map((m) => ({ value: String(m), label: `${m}월` }))}
            />
            <SelectField
              label="일"
              value={birthDay}
              onChange={setBirthDay}
              placeholder="일"
              options={DAYS.map((d) => ({ value: String(d), label: `${d}일` }))}
            />
          </div>

          {/* 시간 (선택) */}
          <SelectField
            label="태어난 시간 (선택)"
            value={birthHour}
            onChange={setBirthHour}
            placeholder="시간을 모르면 건너뛰세요"
            options={HOURS.map((h) => ({
              value: String(h),
              label: `${String(h).padStart(2, "0")}시 (${h < 12 ? "오전" : "오후"} ${h === 0 ? 12 : h > 12 ? h - 12 : h}시)`,
            }))}
          />

          {/* 힌트 */}
          <div className="bg-pink-50/80 rounded-2xl px-4 py-3 flex items-start gap-2.5">
            <span className="text-pink-400 text-lg shrink-0">💡</span>
            <p className="text-xs text-slate-500 leading-relaxed">
              태어난 <span className="font-semibold text-pink-500">년·월·일</span>은 필수예요.
              시간을 입력하면 더 정확한 동물이 나와요!
            </p>
          </div>
        </div>

        {/* 오행 미리보기 */}
        {isFormValid && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl py-4 px-5 border border-pink-100 shadow-sm animate-fade-in-up">
            <p className="text-center text-sm text-slate-500">
              ✨ 준비됐어요! AI가 나만의 동물을 그려드릴게요
            </p>
          </div>
        )}

        {/* 제출 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={!isFormValid}
          className={`w-full font-black text-lg rounded-3xl py-5 transition-all shadow-xl ${
            isFormValid
              ? "bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 hover:from-pink-500 hover:via-rose-500 hover:to-purple-500 text-white shadow-pink-200/60 active:scale-[0.98]"
              : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
          }`}
        >
          {isFormValid ? "🎨 AI 동물 캐릭터 생성하기" : "년·월·일을 입력해 주세요"}
        </button>

        <p className="text-center text-xs text-slate-400">
          입력된 생년월일은 운세 분석에만 사용되며 저장되지 않아요
        </p>
      </div>
    </div>
  );
}
