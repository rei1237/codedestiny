'use client';

import React, { useState } from 'react';
import { useSikojenpovailuContext } from '../SikojenpovailuContext';
import { YeonSpriteAvatar } from './YeonSpriteAvatar';

export function PhaseReveal() {
  const { selectedShape, setPhase } = useSikojenpovailuContext();
  const [showShadowReading, setShowShadowReading] = useState(false);

  if (!selectedShape) {
    return <div className="min-h-screen flex items-center justify-center">형태 로드 중...</div>;
  }

  const handleBackgroundClick = () => {
    setPhase('sharing');
  };

  // 그림자 읽기 트리거
  const handleShadowRead = () => {
    setShowShadowReading(true);
  };

  const handleCloseShadow = () => {
    setShowShadowReading(false);
  };

  return (
    <div 
      className="min-h-screen w-full relative bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center px-4 py-8 cursor-pointer"
      onClick={handleBackgroundClick}
    >
      {/* 배경 무늬 */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `radial-gradient(circle, #D4AF37 1px, transparent 1px)`,
        backgroundSize: '20px 20px'
      }}></div>

      {/* 별 효과 */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-yellow-300 text-xl animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.3,
              animation: `twinkle ${2 + Math.random() * 2}s ease-in-out infinite`,
            }}
          >
            ✨
          </div>
        ))}
      </div>

      <div className="relative z-10 max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-pink-200/70 bg-white/75 px-4 py-3 shadow-[0_8px_24px_rgba(190,24,93,0.12)] backdrop-blur">
          <div className="flex items-center gap-3">
            <YeonSpriteAvatar
              frames={[3, 2, 1, 2]}
              size={44}
              alt="연이 결과 안내"
              ringClassName="from-rose-200 to-pink-200"
              className="shrink-0"
              intervalMs={920}
            />
            <div>
              <p className="text-xs font-semibold tracking-wide text-pink-500">SIKOJEN POVAILU</p>
              <p className="text-sm font-bold text-rose-700">연이가 읽어준 주석 형상 결과</p>
            </div>
          </div>
          <span className="rounded-full border border-amber-300 bg-amber-100/80 px-2.5 py-1 text-[11px] font-bold text-amber-800">
            Premium Reveal
          </span>
        </div>

        {/* 메인 카드 */}
        <div className="sikojen-reveal-card relative rounded-3xl border-4 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-2xl p-8 transform transition-all duration-300 hover:scale-[1.02]">
          
          {/* 카드 배경 패턴 */}
          <div className="absolute inset-0 rounded-3xl opacity-5 pointer-events-none" style={{
            backgroundImage: `repeating-linear-gradient(45deg, #D4AF37 0px, #D4AF37 2px, transparent 2px, transparent 10px)`
          }}></div>

          {/* 형태 아이콘 - 큰 이모지 */}
          <div className="relative z-10 flex justify-center mb-6">
            <div
              className="sikojen-shape-hero w-28 h-28 rounded-full shadow-lg flex items-center justify-center text-7xl border-4 border-pink-300 animate-bounce"
              style={{ background: `radial-gradient(circle at 35% 30%, #fff, ${selectedShape.color})` }}
            >
              {selectedShape.icon}
            </div>
          </div>

          {/* 형태 이름 */}
          <div className="relative z-10 text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-amber-900 mb-2" style={{ fontFamily: "'Jua', sans-serif" }}>
              {selectedShape.name_ko}
            </h2>
            <div className="mb-2 flex items-center justify-center gap-2">
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                형상 코드: {selectedShape.id}
              </span>
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                카테고리: {selectedShape.category}
              </span>
            </div>
            <p className="text-sm md:text-base text-amber-700 italic">
              {selectedShape.name_fi}
            </p>
            <p className="text-xs text-amber-600 mt-1">
              {selectedShape.name_en}
            </p>
          </div>

          {/* 구분선 */}
          <div className="relative z-10 h-1 bg-gradient-to-r from-amber-200 via-pink-300 to-rose-200 rounded-full mb-6"></div>

          {/* 의미 텍스트 */}
          <div className="relative z-10 mb-6">
            <h3 className="text-lg font-bold text-rose-600 mb-2">🔮 의미</h3>
            <p className="text-sm md:text-base text-amber-800 leading-relaxed">
              {selectedShape.meaning_ko}
            </p>
            <p className="text-xs md:text-sm text-amber-700 italic mt-3">
              &quot;{selectedShape.meaning_fi}&quot;
            </p>
          </div>

          {/* 조언 섹션 */}
          <div className="relative z-10 mb-6 bg-gradient-to-r from-amber-100/50 to-orange-100/50 rounded-2xl border-2 border-amber-200 p-4">
            <h3 className="text-lg font-bold text-amber-900 mb-2">💡 조언</h3>
            <p className="text-sm md:text-base text-amber-800">
              {selectedShape.advice_ko}
            </p>
            <p className="text-xs md:text-sm text-amber-700 italic mt-2">
              &quot;{selectedShape.advice_fi}&quot;
            </p>
          </div>

          {/* 럭키 정보 섹션 */}
          <div className="relative z-10 mb-6 grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl border-2 border-amber-200 p-3 text-center">
              <p className="text-xs font-bold text-amber-600 mb-1">🍀 럭키 넘버</p>
              <p className="text-2xl font-bold text-amber-800">{selectedShape.lucky_number}</p>
            </div>
            <div className="bg-gradient-to-br from-pink-50 to-rose-100 rounded-xl border-2 border-rose-200 p-3 text-center">
              <p className="text-xs font-bold text-rose-600 mb-1">🎨 럭키 컬러</p>
              <p className="text-xs font-semibold text-rose-800 leading-tight">{selectedShape.lucky_color}</p>
            </div>
          </div>

          {/* 연이의 한마디 */}
          <div className="relative z-10 mb-6 bg-gradient-to-r from-pink-100 to-rose-50 rounded-2xl border-2 border-pink-300 p-4 flex gap-3 items-start">
            <span className="text-2xl flex-shrink-0">🐷</span>
            <div>
              <p className="text-xs font-bold text-pink-600 mb-1">연이의 한마디</p>
              <p className="text-sm text-rose-700 leading-relaxed">{selectedShape.yeon_message}</p>
            </div>
          </div>

          {/* 액션 버튼 - 영혼의 그림자 읽기 */}
          <div className="relative z-10 flex flex-col gap-3">
            <button
              onClick={handleShadowRead}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 
                text-white font-bold rounded-xl hover:from-purple-600 hover:via-indigo-600 hover:to-purple-700
                transform hover:scale-105 transition-all duration-300 shadow-lg text-sm md:text-base
                relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-white/20 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-500"></span>
              <span className="relative">👁️ 영혼의 그림자 읽기</span>
            </button>

            <button
              onClick={handleBackgroundClick}
              className="w-full py-3 px-4 bg-gradient-to-r from-pink-300 via-rose-300 to-amber-200
                text-amber-900 font-bold rounded-xl hover:from-pink-400 hover:via-rose-400 hover:to-amber-300
                transform hover:scale-105 transition-all duration-300 shadow-lg text-sm md:text-base"
            >
              ✨ 다음으로 진행
            </button>
          </div>
        </div>

        {/* 연이 캐릭터 - 우측 하단 */}
        <div className="mt-8 flex justify-end">
          <div className="relative">
            <div className="transform hover:scale-110 transition-transform">
              <YeonSpriteAvatar
                frames={[4, 5, 6, 5]}
                size={100}
                alt="연이 결과 마스코트"
                ringClassName="from-rose-200 to-pink-200"
                intervalMs={740}
              />
            </div>
            <div className="absolute -top-6 -left-20 bg-pink-100/90 backdrop-blur-sm border-2 border-pink-300 rounded-2xl px-3 py-2 text-pink-700 font-bold text-xs whitespace-nowrap shadow-lg">
              {selectedShape.yeon_message.split(' ').slice(0, 4).join(' ')}... 🐷
            </div>
          </div>
        </div>
      </div>

      {/* 그림자 읽기 모달 */}
      {showShadowReading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm"
          onClick={handleCloseShadow}
        >
          <div
            className="relative max-w-md w-full rounded-2xl bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-2 border-purple-500 shadow-2xl p-8 transform transition-all animate-pulse"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 어두운 배경 효과 */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-black/50 to-purple-900/20 pointer-events-none"></div>

            {/* 그림자 텍스트 */}
            <div className="relative z-10 text-center">
              <h3 className="text-2xl font-bold text-purple-300 mb-4" style={{ fontFamily: "'Jua', sans-serif" }}>
                🌙 영혼의 그림자
              </h3>
              
              <div className="mb-6 space-y-3">
                <p className="text-sm text-purple-200 leading-relaxed">
                  이 형태의 숨겨진 의미는...
                </p>
                <p className="text-base text-purple-100 font-semibold">
                  {selectedShape.shadow_meaning_ko}
                </p>
                <p className="text-xs text-purple-300 italic">
                  &quot;{selectedShape.shadow_meaning_fi}&quot;
                </p>
              </div>

              {/* 닫기 버튼 */}
              <button
                onClick={handleCloseShadow}
                className="w-full py-2 px-4 bg-gradient-to-r from-purple-600 to-indigo-600
                  text-white font-bold rounded-lg hover:from-purple-700 hover:to-indigo-700
                  transform hover:scale-105 transition-all duration-300 text-sm"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
