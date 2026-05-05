"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { calcZiweiPalaces, ZiweiChartData } from "../_lib/ziwei-engine";
import { generateAdvancedReport } from "../_lib/ziwei-interpretations";
import { AdvancedZiweiResult } from "../_lib/ziwei-normalization";
import PremiumBlurGate from "./PremiumBlurGate";
import { motion, AnimatePresence } from "framer-motion";

// ─── 상수 정의 ────────────────────────────────────────────────

const CHAPTERS = [
  { id: "intro", title: "🌌 심화 자미두수 소개", free: true },
  { id: "destiny", title: "👤 타고난 운명", free: true },
  { id: "personality", title: "💎 본질적인 성향", free: true },
  { id: "career", title: "🏆 직업적 적성", free: false },
  { id: "wealth", title: "💰 재물운", free: false },
  { id: "love", title: "💖 애정, 인연운", free: false },
  { id: "family", title: "🙏 가정환경", free: false },
  { id: "social", title: "🌐 사회적 운", free: false },
  { id: "health", title: "💊 건강운", free: false },
  { id: "innerMind", title: "🧘 내면, 정신적 특징", free: false },
  { id: "realEstate", title: "🏘️ 부동산", free: false },
  { id: "environment", title: "✈️ 환경", free: false },
  { id: "children", title: "👨‍👩‍👧 자녀운", free: false },
  { id: "majorCycle", title: "🌊 대한", free: false },
  { id: "total", title: "📜 종합적인 총운", free: false },
];

const RESULT_CACHE_KEY = "premium:ziwei:result:v4";

function getDaysInMonth(year: number, month: number) {
  if (!Number.isFinite(year) || year < 1 || !Number.isFinite(month) || month < 1 || month > 12) {
    return 31;
  }
  return new Date(year, month, 0).getDate();
}

function isValidBirthDate(year: number, month: number, day: number) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;
  if (year < 1900 || year > 2099) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const dt = new Date(year, month - 1, day);
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
}

type Step = "form" | "computing" | "result";

interface FormState {
  birthYear: string; birthMonth: string; birthDay: string;
  birthHour: string; unknownHour: boolean; name: string; gender: "M" | "F";
}

interface AdvancedZiweiSectionProps {
  showIntro?: boolean;
  onStartGeneration?: () => void;
  generationLoading?: boolean;
  isUnlocked?: boolean; // 결제 여부
}

// 심화 자미두수 기능 (로컬 자미두수 분석)
export default function AdvancedZiweiSection({
  showIntro = false,
  onStartGeneration,
  generationLoading = false,
  isUnlocked = false,
}: AdvancedZiweiSectionProps) {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FormState>({
    birthYear: "", birthMonth: "1", birthDay: "1", birthHour: "12",
    unknownHour: false, name: "", gender: "F",
  });
  const [result, setResult] = useState<AdvancedZiweiResult | null>(null);
  const [chartData, setChartData] = useState<ZiweiChartData | null>(null);
  const [savedName, setSavedName] = useState("");
  const [activeTab, setActiveTab] = useState("intro");
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("명반을 구성하는 중...");
  const autoComputeRef = useRef(false);
  const birthYearNum = Number(form.birthYear);
  const birthMonthNum = Number(form.birthMonth);
  const maxDayInMonth = getDaysInMonth(birthYearNum, birthMonthNum);

  useEffect(() => {
    const curDay = Number(form.birthDay);
    if (!Number.isFinite(curDay)) return;
    if (curDay > maxDayInMonth) {
      setForm((prev) => ({ ...prev, birthDay: String(maxDayInMonth) }));
    }
  }, [form.birthDay, maxDayInMonth]);

  // ── 초기 데이터 로드 ──
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(RESULT_CACHE_KEY);
      if (cached) {
        const c = JSON.parse(cached);
        setResult(c.result);
        setChartData(c.chart);
        setSavedName(c.name);
        setStep("result");
        return;
      }

      const raw = localStorage.getItem("FORTUNE_APP_VEDIC_PAYLOAD");
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.birth?.year) {
          setForm({
            birthYear: String(p.birth.year), 
            birthMonth: String(p.birth.month ?? 1),
            birthDay: String(p.birth.day ?? 1), 
            birthHour: String(p.birth.hour ?? 12),
            unknownHour: false, 
            name: p.name || "", 
            gender: (p.gender === "F" ? "F" : "M") as "M" | "F",
          });
          autoComputeRef.current = true;
        }
      }
    } catch (_) {}
  }, []);

  const handleCompute = useCallback(() => {
    const y = Number(form.birthYear), m = Number(form.birthMonth), d = Number(form.birthDay);
    const h = form.unknownHour ? 12 : Number(form.birthHour);
    if (!isValidBirthDate(y, m, d)) {
      alert("생년월일을 정확히 입력해 주세요. 월/일 조합이 올바른지 확인해 주세요.");
      return;
    }
    const displayName = form.name.trim() || "당신";
    setStep("computing");
    setProgress(0);

    const texts = [
      "자미성의 위치를 파악하는 중...",
      "12궁의 에너지를 조율하는 중...",
      "사화(四化)의 변화를 계산하는 중...",
      "대한(大限)의 흐름을 분석하는 중...",
      "전문가 수준의 해석 리포트를 생성하는 중...",
    ];

    let p = 0;
    const timer = setInterval(() => {
      p += Math.random() * 5 + 1;
      if (p >= 100) { p = 100; clearInterval(timer); }
      setProgress(Math.floor(p));
      setLoadingText(texts[Math.floor((p / 100) * texts.length)] || texts[texts.length - 1]);
    }, 150);

    setTimeout(() => {
      try {
        const chart = calcZiweiPalaces(y, m, d, h, 0, form.gender);
        const report = generateAdvancedReport(chart, displayName);
        clearInterval(timer);
        setProgress(100);
        setSavedName(displayName);
        setChartData(chart);
        setResult(report);
        try {
          sessionStorage.setItem(RESULT_CACHE_KEY, JSON.stringify({ result: report, chart, name: displayName }));
        } catch (_) {}
        setTimeout(() => setStep("result"), 800);
      } catch (e) {
        clearInterval(timer);
        alert("분석 중 오류가 발생했습니다.");
        setStep("form");
      }
    }, 4000);
  }, [form]);

  useEffect(() => {
    if (autoComputeRef.current && form.birthYear) {
      autoComputeRef.current = false;
      handleCompute();
    }
  }, [form.birthYear, handleCompute]);

  // ── 렌더링 파트 ──

  if (showIntro) {
    return (
      <div className="p-8 bg-gradient-to-br from-[#0a061e] via-[#1a0b3a] to-[#0a061e] rounded-[2.5rem] border border-purple-500/20 shadow-[0_0_50px_rgba(139,92,246,0.15)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[100px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 blur-[100px] -ml-32 -mb-32" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-2xl text-white">✨</span>
            </div>
            <div>
              <span className="text-[10px] font-black tracking-[0.4em] text-purple-400 uppercase">Premium Service</span>
              <h3 className="text-2xl font-black text-white leading-none mt-1">심화 자미두수 분석</h3>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <p className="text-purple-100/80 text-sm leading-relaxed">
              단순한 운세가 아닙니다. 30년 경력 전문가의 통찰을 담은 <span className="text-purple-300 font-bold">15개 카테고리 심층 리포트</span>를 통해 당신의 인생 지도를 정밀하게 해부합니다.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {["12궁 정밀 배치", "사화(四化) 심층해석", "10년 대한 분석", "전문가 맞춤 조언"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-purple-300/70 bg-purple-500/5 py-2 px-3 rounded-xl border border-purple-500/10">
                  <span className="text-purple-500">✦</span> {item}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => onStartGeneration?.()}
              disabled={generationLoading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-[#1a1200] font-black rounded-2xl shadow-[0_10px_30px_rgba(245,158,11,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 group/btn"
            >
              <span>👑 전 구간 즉시 해금하기</span>
              <span className="text-[10px] px-2 py-0.5 bg-black/10 rounded-full font-bold">500코인</span>
            </button>
            <button
              onClick={() => setStep("form")}
              className="w-full py-4 bg-white/5 border border-white/10 text-purple-200 font-bold rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <span>무료 분석 미리보기</span>
              <span className="text-lg opacity-50">→</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "form") {
    return (
      <div className="min-h-screen bg-[#050510] p-6 pt-12">
        <div className="max-w-md mx-auto space-y-8">
          <div className="text-center">
            <div className="inline-block px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-[10px] font-bold tracking-widest uppercase mb-4">
              Advanced Analysis
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">명반 데이터 입력</h1>
            <p className="text-purple-400/60 text-sm mt-2">정밀한 결과를 위해 정확한 정보를 입력해 주세요.</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] space-y-6 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[50px] -mr-16 -mt-16" />
            
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-purple-400/60 uppercase tracking-widest px-1">성함</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-purple-500/50 focus:bg-white/15 transition-all" placeholder="이름을 입력하세요" />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[11px] font-bold text-purple-400/60 uppercase tracking-widest px-1">성별</label>
                  <div className="flex gap-2 bg-white/5 p-1 rounded-[1.25rem] border border-white/5">
                    {["M", "F"].map(g => (
                      <button key={g} onClick={() => setForm(f => ({...f, gender: g as "M" | "F"}))} className={`flex-1 py-3 rounded-[1rem] text-sm font-bold transition-all ${form.gender === g ? "bg-purple-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}>
                        {g === "M" ? "남성" : "여성"}
                      </button>
                    ))}
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-[11px] font-bold text-purple-400/60 uppercase tracking-widest px-1">태어난 년도</label>
                  <input type="number" value={form.birthYear} onChange={e => setForm(f => ({...f, birthYear: e.target.value}))} className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-purple-500/50" placeholder="1990" />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-purple-400/60 uppercase tracking-widest px-1">월</label>
                <select value={form.birthMonth} onChange={e => setForm(f => ({...f, birthMonth: e.target.value}))} className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 text-white outline-none appearance-none">
                  {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}월</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-purple-400/60 uppercase tracking-widest px-1">일</label>
                <select value={form.birthDay} onChange={e => setForm(f => ({...f, birthDay: e.target.value}))} className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 text-white outline-none appearance-none">
                  {Array.from({length:maxDayInMonth},(_,i)=><option key={i+1} value={i+1}>{i+1}일</option>)}
                </select>
              </div>
            </div>

            <button onClick={handleCompute} className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-lg rounded-2xl mt-4 shadow-[0_20px_40px_rgba(139,92,246,0.3)] active:scale-[0.98] transition-all">무료 분석 시작</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "computing") {
    return (
      <div className="min-h-screen bg-[#050510] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative w-32 h-32 mb-12">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-2 border-dashed border-purple-500/30 rounded-full" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute inset-4 border-2 border-purple-500/50 rounded-full border-t-transparent" />
          <div className="absolute inset-0 flex items-center justify-center text-5xl">🌌</div>
        </div>
        <h2 className="text-3xl font-black text-white mb-3 tracking-tight">{loadingText}</h2>
        <p className="text-purple-400/60 text-sm mb-12 max-w-xs">당신의 명반을 기반으로 한 15개 영역의 심층 데이터를 우주에서 가져오고 있습니다.</p>
        <div className="w-72 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
          <motion.div className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 shadow-[0_0_15px_rgba(139,92,246,0.5)]" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
        </div>
        <p className="text-[10px] font-black text-purple-500 mt-6 tracking-[0.3em] uppercase">{progress}% COMPLETE</p>
      </div>
    );
  }

  if (step === "result" && result && chartData) {
    const activeSection = (result as any)[activeTab];

    return (
      <div className="min-h-screen bg-[#050510] text-gray-100 font-sans pb-32">
        <header className="relative h-80 overflow-hidden">
          <img src="/fuctionassets/jamipremiun.webp" className="w-full h-full object-cover opacity-30 blur-[2px]" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050510] via-[#050510]/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-12 px-8">
            <div className="flex flex-col items-center text-center">
              <div className="px-4 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-[10px] font-black tracking-[0.3em] uppercase mb-4">Advanced Report</div>
              <h1 className="text-4xl font-black text-white leading-tight mb-4">{savedName}님의 인생 총람</h1>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                   <span className="text-[10px] text-gray-500 font-bold block mb-0.5">명궁(命宮)</span>
                   <span className="text-sm font-black text-purple-300">{chartData.meng}</span>
                </div>
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                   <span className="text-[10px] text-gray-500 font-bold block mb-0.5">주성(主星)</span>
                   <span className="text-sm font-black text-purple-300">{chartData.juInfo}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 탭 네비게이션 */}
        <div className="sticky top-0 z-50 bg-[#050510]/80 backdrop-blur-xl border-y border-white/5">
          <nav className="px-4 flex gap-2 overflow-x-auto no-scrollbar py-4">
            {CHAPTERS.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveTab(ch.id)}
                className={`flex-shrink-0 px-5 py-3 rounded-2xl text-xs font-black transition-all border ${activeTab === ch.id ? "bg-purple-600 border-purple-500 text-white shadow-[0_10px_20px_rgba(139,92,246,0.3)]" : "bg-white/5 border-white/5 text-gray-500 hover:text-gray-300"}`}
              >
                {ch.title}
              </button>
            ))}
          </nav>
        </div>

        {/* 상세 해석 영역 */}
        <main className="px-6 mt-12 max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative"
            >
              <div className="bg-gradient-to-b from-white/10 to-white/5 border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-3xl backdrop-blur-2xl overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 blur-[100px] -mr-32 -mt-32" />
                
                <div className="flex flex-col items-center text-center mb-12">
                  <div className="text-6xl mb-6">{CHAPTERS.find(c => c.id === activeTab)?.title.split(" ")[0]}</div>
                  <h2 className="text-3xl font-black text-white mb-4">{activeSection.title}</h2>
                  <div className="w-12 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded-full" />
                </div>

                {isUnlocked || CHAPTERS.find(c => c.id === activeTab)?.free ? (
                  <div className="space-y-10">
                    <div className="p-6 bg-purple-900/20 border border-purple-500/20 rounded-[2rem] text-center">
                      <p className="text-purple-200 text-lg italic font-medium leading-relaxed">
                        "{activeSection.summary}"
                      </p>
                    </div>
                    <div className="text-gray-300 text-base md:text-lg leading-[2.2] whitespace-pre-wrap font-light">
                      {activeSection.detail.split("\n").map((line: string, i: number) => {
                         if (line.startsWith("### ")) return <h3 key={i} className="text-2xl font-black text-purple-300 mt-12 mb-6 tracking-tight">{line.replace("### ", "")}</h3>;
                         if (line.trim() === "") return <div key={i} className="h-4" />;
                         return <p key={i} className="mb-4">{line}</p>;
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="relative min-h-[400px]">
                    <div className="absolute inset-0 z-0 opacity-20 blur-xl select-none pointer-events-none">
                      <p className="text-sm leading-8">당신의 {activeSection.title}에 대한 깊은 통찰이 여기에 담겨 있습니다. 당신이 태어난 순간의 별들은 당신의 재물과 명예, 그리고 사랑에 대해 끊임없이 이야기하고 있습니다. 전문가의 해석을 통해 당신의 미래를 준비하세요.</p>
                    </div>
                    <div className="relative z-10">
                      <PremiumBlurGate
                        lockedTitle={activeSection.title}
                        subDesc="전문가급 심화 분석 리포트 해금"
                        onUnlock={() => onStartGeneration?.()}
                        previewContent={
                          <div className="text-purple-300/50 text-center italic mb-8">
                            당신의 {activeSection.title} 영역에 대한 3,000자 이상의 정밀 분석 리포트가 생성되었습니다.
                          </div>
                        }
                        lockedItems={[
                          `${activeSection.title} 심층 리포트`,
                          "타고난 운명적 반복 패턴 분석",
                          "성공을 위한 전문가 개운법 조언",
                          "시점별 변화 정밀 산출 데이터"
                        ]}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="mt-20 px-6 text-center space-y-8">
          <div className="p-8 border border-white/5 bg-white/5 rounded-[2.5rem] max-w-md mx-auto">
             <p className="text-xs text-gray-500 leading-relaxed">본 리포트는 30년 경력의 자미두수 분석 알고리즘을 기반으로 생성되었습니다. 운세는 인생의 지도일 뿐, 실제 길을 걷는 것은 당신의 의지입니다.</p>
          </div>
          <button
            onClick={() => { setStep("form"); sessionStorage.removeItem(RESULT_CACHE_KEY); }}
            className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold text-gray-400 transition-all border border-white/5"
          >
            다른 명반 분석하기
          </button>
        </footer>
      </div>
    );
  }

  return null;
}
