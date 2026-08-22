'use client';

import React, { useState, useEffect } from 'react';
import { useSikojenpovailuContext } from '../SikojenpovailuContext';
import { YeonSpriteAvatar } from './YeonSpriteAvatar';
import { PigCounselBubble } from './PigCounselBubble';
import { useSikojenPovailuCopy } from '../_lib/copy';

export function ShadowReading() {
  const copy = useSikojenPovailuCopy();
  const { setPhase, selectedShape } = useSikojenpovailuContext();
  const [shadowOpacity, setShadowOpacity] = useState(0);
  const [revealText, setRevealText] = useState(false);

  useEffect(() => {
    // 서서히 그림자 나타내기
    const interval = setInterval(() => {
      setShadowOpacity(prev => {
        if (prev >= 1) {
          clearInterval(interval);
          setRevealText(true);
          return 1;
        }
        return prev + 0.08;
      });
    }, 120);

    return () => clearInterval(interval);
  }, []);

  const handleReturn = () => {
    setPhase('sharing');
  };

  if (!selectedShape) {
    return <div className="min-h-screen flex items-center justify-center">{copy.shadowErrorFallback}</div>;
  }

  return (
    <div className="min-h-[100dvh] w-full relative bg-gradient-to-b from-rose-50 via-pink-50 to-amber-50 flex items-start justify-center px-4 py-8 overflow-y-auto">
      
      {/* 신비로운 배경 입자 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-rose-200/35 blur-xl animate-pulse"
            style={{
              width: `${Math.random() * 300 + 100}px`,
              height: `${Math.random() * 300 + 100}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 5}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* 어두운 네온 격자 */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
        backgroundImage: `linear-gradient(90deg, #fb7185 1px, transparent 1px), linear-gradient(#fb7185 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }}></div>

      <div className="relative z-10 flex flex-col items-center justify-start w-full max-w-lg gap-8">
        
        {/* 연이와 손전등 */}
        <div className="relative w-32 h-32">
          <div className="relative z-20">
            <YeonSpriteAvatar
              frames={[12, 11, 10, 9]}
              size={120}
              alt={copy.shadowAvatarAlt}
              ringClassName="from-rose-300 to-pink-300"
              intervalMs={820}
            />
          </div>
          {/* 손전등 빛 이펙트 */}
          <div className="absolute top-0 right-0 w-16 h-16 text-3xl animate-pulse">
            🔦
          </div>
          {/* 손전등 광선 */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-200/35 to-transparent rounded-full blur-2xl animate-pulse"></div>
        </div>

        {/* 제목 */}
        <h2 className="text-3xl md:text-4xl font-bold text-rose-600 text-center" style={{ fontFamily: "var(--font-playful)" }}>
          {copy.shadowTitle}
        </h2>

        <PigCounselBubble
          className="w-full max-w-md"
          title={copy.shadowCounselTitle}
          message={copy.shadowCounselMessage}
        />

        {/* 벽면 - 그림자 디스플레이 */}
        <div className="relative w-full h-64 rounded-2xl border-4 border-rose-300/70 bg-gradient-to-b from-rose-100 to-pink-100 shadow-2xl overflow-hidden">
          
          {/* 벽면 텍스처 */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `repeating-linear-gradient(90deg, #fecdd3 0px, #fecdd3 2px, transparent 2px, transparent 4px)`
          }}></div>

          {/* 그림자 아이콘 */}
          <div 
            className="absolute inset-0 flex items-center justify-center text-9xl transition-opacity duration-1000"
            style={{ opacity: shadowOpacity }}
          >
            <div className="text-rose-500/60 drop-shadow-2xl">
              {selectedShape.icon}
            </div>
          </div>

          {/* 추가 그림자 레이어 */}
          <div 
            className="absolute inset-0 flex items-center justify-center text-7xl transition-opacity duration-1000"
            style={{ opacity: Math.max(0, shadowOpacity - 0.4) * 1.5 }}
          >
            🌑 {selectedShape.icon}
          </div>

          {/* 조명 효과 */}
          <div className="absolute inset-0 bg-gradient-to-t from-rose-200/60 via-transparent to-amber-200/25 animate-pulse"></div>
        </div>

        {/* 연이의 내레이션 */}
        <div className="text-center space-y-2">
            <p className="text-lg text-rose-600 font-bold">
            {copy.shadowNarration}
          </p>
            <p className="text-sm text-rose-500 italic">
            &quot;{selectedShape.name_ko}&quot;{copy.shadowTrueMeaningSuffix}
          </p>
        </div>

        {/* 숨겨진 영역 - 진정한 의미 */}
        {revealText && (
          <div className="w-full rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-white via-rose-50 to-amber-50 p-6 animate-fade-in shadow-[0_14px_32px_rgba(190,24,93,0.14)]">
            
            <h3 className="text-xl md:text-2xl font-bold text-rose-700 text-center mb-4" style={{ fontFamily: "var(--font-playful)" }}>
              {copy.shadowTrueMeaningTitle}
            </h3>

            {/* 한글 해석 */}
            <div className="mb-4 text-center">
              <p className="text-sm md:text-base text-rose-700 leading-relaxed font-semibold">
                {selectedShape.shadow_meaning_ko}
              </p>
            </div>

            {/* 핀란드어 해석 */}
            <div className="text-center border-t border-rose-200 pt-4">
              <p className="text-xs md:text-sm text-rose-500 italic leading-relaxed">
                &quot;{selectedShape.shadow_meaning_fi}&quot;
              </p>
            </div>

            {/* 신비로운 힌트 */}
            <div className="mt-4 text-center">
              <p className="text-xs text-rose-600 bg-rose-100 rounded-lg px-3 py-2 border border-rose-200">
                {copy.shadowWhisperHint}
              </p>
            </div>
          </div>
        )}

        {/* 돌아가기 버튼 */}
        <button
          onClick={handleReturn}
          className="py-3 px-6 bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300
            text-rose-900 font-bold rounded-xl hover:from-rose-500 hover:via-pink-500 hover:to-amber-400
            transform hover:scale-105 transition-all duration-300 shadow-lg text-sm md:text-base
            relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-white/20 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-500"></span>
          <span className="relative flex items-center gap-2">
            {copy.shadowReturnButton}
          </span>
        </button>

        {/* 신비로운 텍스트 힌트 */}
        <p className="text-center text-xs text-rose-500 italic">
          {copy.shadowClosingHint}
        </p>
      </div>

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
