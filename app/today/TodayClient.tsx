"use client";

import React, { useState } from "react";
import TodayFortuneLeadMagnet from "../components/TodayFortuneLeadMagnet";

interface CategoryDetail {
  id: string;
  name: string;
  icon: string;
  score: number;
  keyword: string;
  summary: string;
  details: string[];
  timeGuide: {
    morning: string;
    afternoon: string;
    evening: string;
  };
  advice: string;
}

const CATEGORIES_DATA: CategoryDetail[] = [
  {
    id: "wealth",
    name: "재물운",
    icon: "💰",
    score: 96,
    keyword: "수익 창출 & 귀인의 조력",
    summary: "금전 유입의 물꼬가 트이고, 기대치 않았던 금융 이익이나 유용한 정보가 들어오는 날입니다.",
    details: [
      "막혔던 자금 흐름이 해소되며, 계약이나 협상에서 매우 유리한 위치를 점할 수 있습니다.",
      "소액 재테크나 투자 관련 아이디어가 있다면 신중하되 적극적으로 검토해 볼 가치가 있습니다.",
      "지출을 억제하기보다는 자신이나 미래 가치에 투자하는 지출이 더 큰 이득으로 환원됩니다."
    ],
    timeGuide: {
      morning: "💡 오전 09시 ~ 11시: 금융 관련 정보 검색이나 중대 결정에 가장 길한 시간대입니다.",
      afternoon: "🤝 오후 02시 ~ 04시: 협력자나 은인과의 미팅에서 금전적 힌트를 얻습니다.",
      evening: "🔮 저녁 07시 이후: 무분별한 신용카드 지출만 유의한다면 안정적인 하루 마무리입니다."
    },
    advice: "탐욕은 경계하되, 정당하게 찾아오는 기회는 놓치지 말고 당당하게 움켜쥐세요."
  },
  {
    id: "love",
    name: "애정/인연운",
    icon: "💖",
    score: 88,
    keyword: "따스한 공감 & 매력 상승",
    summary: "당신의 은은한 매력이 빛을 발하며 주변 사람들과 진솔한 호감을 주고받는 신비로운 날입니다.",
    details: [
      "솔로라면 예상치 못한 장소에서 말이 잘 통하는 호감형 인연을 만나 호기심이 발동합니다.",
      "커플이라면 그동안 쌓였던 소소한 오해가 기분 좋은 대화를 통해 감쪽같이 눈 녹듯 사라집니다.",
      "상대방의 작은 변화나 호의에 크게 반응해 줄수록 인연의 깊이가 곱절로 깊어집니다."
    ],
    timeGuide: {
      morning: "💌 오전: 가벼운 안부 메시지나 따뜻한 인사 한마디가 연애운을 깨웁니다.",
      afternoon: "☕ 오후: 감성적인 카페나 조용한 공원 산책이 새로운 호감을 불러일으킵니다.",
      evening: "✨ 저녁 08시: 솔직한 진심을 터놓기에 분위기가 완벽히 무르익는 시각입니다."
    },
    advice: "완벽함보다 솔직한 허점이 상대의 마음을 여는 열쇠가 됩니다."
  },
  {
    id: "career",
    name: "직장/사업운",
    icon: "💼",
    score: 92,
    keyword: "성과 달성 & 탁월한 리더십",
    summary: "아이디어가 명쾌하게 정립되며, 추진 중인 프로젝트에서 탁월한 기량을 입증하게 됩니다.",
    details: [
      "상사나 고객사로부터 당신의 업무 능력에 대해 두터운 신뢰와 호평을 얻게 되는 날입니다.",
      "어려운 과제가 부여되더라도 특유의 직관과 논리성으로 사태를 수월하게 해결합니다.",
      "동료들에게 조력과 칭찬을 아끼지 않으면 당신을 추대하는 파동이 더욱 거세집니다."
    ],
    timeGuide: {
      morning: "📊 오전 10시: 주요 업무 보고서 제출 및 중요한 브리핑 진행에 최적입니다.",
      afternoon: "🚀 오후 03시: 아이디어 기획 및 새로운 업무 프로세스 도입 시 유리합니다.",
      evening: "📚 저녁: 자기계발이나 직무 관련 도서를 읽으며 통찰을 다지세요."
    },
    advice: "자신감을 가지되 겸손의 미덕을 곁들이면 천군만마를 얻은 듯 탄탄해집니다."
  },
  {
    id: "health",
    name: "건강/신체운",
    icon: "🌿",
    score: 85,
    keyword: "생체 에너도 회복 & 활력 밸런스",
    summary: "신체 바이오리듬이 균형을 되찾으며, 가벼운 운동과 휴식의 조화로 몸이 가벼워집니다.",
    details: [
      "정신적인 스트레스가 반감되고 가슴이 탁 트이는 듯한 개운함을 느낄 수 있습니다.",
      "수분 섭취를 평소보다 늘리고, 따뜻한 차 한 잔으로 몸의 활기를 북돋아 주면 좋습니다.",
      "과격한 유산소 운동보다는 유연성을 기르는 스트레칭과 명상이 매우 효과적입니다."
    ],
    timeGuide: {
      morning: "🌞 아침: 가벼운 기지개와 수분 보충으로 신체 생체시계를 활성화하세요.",
      afternoon: "🚶‍♂️ 점심 직후: 15분간의 가벼운 산책으로 뇌에 신선한 산소를 공급하세요.",
      evening: "🛁 저녁: 족욕이나 따뜻한 반신욕으로 지친 활력을 충전하기에 완벽합니다."
    },
    advice: "충분한 숙면이야말로 오늘 당신에게 가장 강력한 행운의 보약입니다."
  },
  {
    id: "lucky",
    name: "행운 가이드",
    icon: "🔮",
    score: 98,
    keyword: "우주의 파동 & 비밀 럭키 아이템",
    summary: "오늘 하루 당신의 기운을 극대화해 줄 시크릿 컬렉션과 행동 지침입니다.",
    details: [
      "행운의 컬러 [로얄 엠버 골드]: 액세서리나 의상 포인트로 활용하면 품격과 금전운이 상승합니다.",
      "행운의 아이템 [금속 액세서리/시계]: 정교함과 결단력을 더해주는 수호 물품입니다.",
      "행운의 방위 [남동쪽]: 이동 시 남동쪽 방향으로 향하면 정서적 안정과 뜻밖의 이득을 얻습니다."
    ],
    timeGuide: {
      morning: "🍀 럭키 넘버: 7 (선택이나 기호 결정 시 활용하세요)",
      afternoon: "🍔 행운의 음식: 따뜻한 고기 요리나 노란색 제철 과일",
      evening: "🎵 행운의 음악: 잔잔한 클래식이나 432Hz 힐링 주파수 음원"
    },
    advice: "당신이 마음먹은 긍정의 기운이 오늘의 우주 파동과 동기화되어 현실이 됩니다."
  }
];

export default function TodayClient() {
  const [activeTab, setActiveTab] = useState("wealth");

  const currentCategory = CATEGORIES_DATA.find((c) => c.id === activeTab) || CATEGORIES_DATA[0];

  return (
    <main className="min-h-screen bg-[#070A11] text-slate-100 font-sans pb-24 selection:bg-purple-500 selection:text-white">
      {/* Background Decor Ambient Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-purple-900/20 via-indigo-900/10 to-transparent blur-3xl opacity-70" />
        <div className="absolute top-[400px] right-0 w-[500px] h-[500px] bg-amber-500/5 blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        {/* Navigation Breadcrumb & Header */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300 text-xs font-semibold tracking-wide mb-4 backdrop-blur-md">
            <span>✨ CODE : DESTINY DAILY ORACLE</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
            오늘의 운세 리포트
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
            당신의 생년월일시와 오늘 하늘의 일주(日柱) 기운이 교차하는 지점의 시크릿 파동을 정밀하게 분석하였습니다.
          </p>
        </div>

        {/* Lead Magnet Hero Component */}
        <div className="mb-14">
          <TodayFortuneLeadMagnet />
        </div>

        {/* Section Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>🔮</span> 테마별 정밀 운세 풀이
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              관심 있는 운세 테마를 선택하여 시간대별 세부 흐름을 확인하세요.
            </p>
          </div>
        </div>

        {/* Category Tabs Scroll/Grid */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {CATEGORIES_DATA.map((cat) => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 border ${
                  isActive
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-400/40 text-white shadow-lg shadow-purple-600/30 scale-[1.02]"
                    : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60"
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                <span>{cat.name}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? "bg-white/20 text-amber-200" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {cat.score}점
                </span>
              </button>
            );
          })}
        </div>

        {/* Category Detail Card Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
          {/* Main Card */}
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-3xl sm:text-4xl p-3 rounded-2xl bg-purple-950/60 border border-purple-500/20">
                    {currentCategory.icon}
                  </span>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">
                      {currentCategory.name} 세부 분석
                    </h3>
                    <span className="inline-block mt-1 text-xs font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-md border border-amber-400/20">
                      키워드: {currentCategory.keyword}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-xs text-slate-400">테마 운세 지수</span>
                  <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
                    {currentCategory.score}점
                  </span>
                </div>
              </div>

              {/* Summary Highlight */}
              <div className="my-6 rounded-2xl bg-gradient-to-r from-purple-950/40 to-indigo-950/40 p-5 border border-purple-500/20">
                <p className="text-base sm:text-lg font-medium text-purple-200 leading-relaxed">
                  "{currentCategory.summary}"
                </p>
              </div>

              {/* Detail Points */}
              <div className="space-y-4 mb-8">
                <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  📌 상세 해설 및 짚어볼 점
                </h4>
                <ul className="space-y-3">
                  {currentCategory.details.map((point, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-sm sm:text-base text-slate-300 leading-relaxed"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Time Guide */}
              <div className="space-y-3 pt-6 border-t border-slate-800">
                <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                  ⏰ 시간대별 흐름 및 추천 가이드
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs sm:text-sm text-slate-300">
                    {currentCategory.timeGuide.morning}
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs sm:text-sm text-slate-300">
                    {currentCategory.timeGuide.afternoon}
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs sm:text-sm text-slate-300">
                    {currentCategory.timeGuide.evening}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Card: Lucky Badges & Master Advice */}
          <div className="lg:col-span-4 space-y-6">
            {/* Master Advice Card */}
            <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 via-slate-900/80 to-slate-900/90 p-6 backdrop-blur-xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-amber-300 text-6xl">
                ☯️
              </div>
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">
                DESINY ADVICE
              </h4>
              <h3 className="text-lg font-bold text-white mb-3">명리학자의 한 줄 조언</h3>
              <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-amber-400 pl-3 py-1">
                "{currentCategory.advice}"
              </p>
            </div>

            {/* Lucky Item Quick Badges */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🎁</span> 오늘의 행운 시크릿
              </h4>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400">행운의 컬러</span>
                  <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                    로얄 엠버 골드
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400">행운의 아이템</span>
                  <span className="font-semibold text-purple-300">금속 액세서리</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400">길한 방위</span>
                  <span className="font-semibold text-indigo-300">남동쪽</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400">행운의 숫자</span>
                  <span className="font-semibold text-emerald-300">7</span>
                </div>
              </div>
            </div>

            {/* Upsell Banner (Lead Magnet Transition) */}
            <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-900/40 via-indigo-950/60 to-slate-950 p-6 backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-purple-500/20 blur-2xl group-hover:scale-150 transition-transform duration-500" />
              <span className="inline-block px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 text-[11px] font-bold mb-3 border border-purple-400/30">
                PREMIUM CONSULTATION
              </span>
              <h4 className="text-base font-bold text-white mb-2">
                사주 원국 연동 1:1 심층 운세
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                단순 일일 운세를 넘어, 당신의 사주 8자와 대운·세운 파동이 결합된 평생 정밀 리포트를 확인해 보세요.
              </p>
              <a
                href="/saju"
                className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-bold shadow-md hover:from-amber-300 hover:to-amber-400 transition-all duration-200"
              >
                내 정밀 사주원국 분석하기 →
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
