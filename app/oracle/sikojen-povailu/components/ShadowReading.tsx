'use client';

import React, { useState, useEffect } from 'react';
import { useSikojenpovailuContext } from '../SikojenpovailuContext';
import { YeonSpriteAvatar } from './YeonSpriteAvatar';
import { PigCounselBubble } from './PigCounselBubble';

export function ShadowReading() {
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
    return <div className="min-h-screen flex items-center justify-center">오류가 발생했습니다.</div>;
  }

  return (
    <div className="min-h-screen w-full relative bg-gradient-to-b from-slate-900 via-purple-900 to-slate-950 flex items-center justify-center px-4 py-8 overflow-hidden">
      
      {/* 신비로운 배경 입자 */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-purple-400/20 blur-xl animate-pulse"
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
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `linear-gradient(90deg, #6366f1 1px, transparent 1px), linear-gradient(#6366f1 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }}></div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg gap-8">
        
        {/* 연이와 손전등 */}
        <div className="relative w-32 h-32">
          <div className="relative z-20">
            <YeonSpriteAvatar
              frames={[12, 11, 10, 9]}
              size={120}
              alt="연이 그림자 읽기"
              ringClassName="from-violet-400 to-purple-500"
              intervalMs={820}
            />
          </div>
          {/* 손전등 빛 이펙트 */}
          <div className="absolute top-0 right-0 w-16 h-16 text-3xl animate-pulse">
            🔦
          </div>
          {/* 손전등 광선 */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-300/30 to-transparent rounded-full blur-2xl animate-pulse"></div>
        </div>

        {/* 제목 */}
        <h2 className="text-3xl md:text-4xl font-bold text-purple-300 text-center" style={{ fontFamily: "'Jua', sans-serif" }}>
          🌑 영혼의 그림자 읽기 👁️
        </h2>

        <PigCounselBubble
          className="w-full max-w-md border-purple-300/70 bg-purple-50/85"
          title="연이의 그림자 상담"
          message="불안한 마음은 숨기지 말고 같이 보자. 그림자 해석은 네가 지켜야 할 감정의 경계를 알려줘."
        />

        {/* 벽면 - 그림자 디스플레이 */}
        <div className="relative w-full h-64 rounded-2xl border-4 border-purple-500/50 bg-gradient-to-b from-slate-800 to-slate-900 shadow-2xl overflow-hidden">
          
          {/* 벽면 텍스처 */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `repeating-linear-gradient(90deg, #1e293b 0px, #1e293b 2px, transparent 2px, transparent 4px)`
          }}></div>

          {/* 그림자 아이콘 */}
          <div 
            className="absolute inset-0 flex items-center justify-center text-9xl transition-opacity duration-1000"
            style={{ opacity: shadowOpacity }}
          >
            <div className="text-purple-500/60 drop-shadow-2xl">
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
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/50 via-transparent to-yellow-300/20 animate-pulse"></div>
        </div>

        {/* 연이의 내레이션 */}
        <div className="text-center space-y-2">
          <p className="text-lg text-purple-300 font-bold">
            그림자 속에 또 다른 운세가 숨어있어...
          </p>
          <p className="text-sm text-purple-400 italic">
            &quot;{selectedShape.name_ko}&quot;의 참된 의미
          </p>
        </div>

        {/* 숨겨진 영역 - 진정한 의미 */}
        {revealText && (
          <div className="w-full rounded-2xl border-2 border-purple-400 bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm p-6 animate-fade-in">
            
            <h3 className="text-xl md:text-2xl font-bold text-purple-200 text-center mb-4" style={{ fontFamily: "'Jua', sans-serif" }}>
              🌑 진짜 의미
            </h3>

            {/* 한글 해석 */}
            <div className="mb-4 text-center">
              <p className="text-sm md:text-base text-purple-100 leading-relaxed font-semibold">
                {selectedShape.shadow_meaning_ko}
              </p>
            </div>

            {/* 핀란드어 해석 */}
            <div className="text-center border-t border-purple-500/50 pt-4">
              <p className="text-xs md:text-sm text-purple-300 italic leading-relaxed">
                &quot;{selectedShape.shadow_meaning_fi}&quot;
              </p>
            </div>

            {/* 신비로운 힌트 */}
            <div className="mt-4 text-center">
              <p className="text-xs text-purple-400 bg-purple-800/30 rounded-lg px-3 py-2">
                ✧ 이것이 형태가 진정으로 속삭이는 것 ✧
              </p>
            </div>
          </div>
        )}

        {/* 돌아가기 버튼 */}
        <button
          onClick={handleReturn}
          className="py-3 px-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600
            text-white font-bold rounded-xl hover:from-indigo-600 hover:via-purple-600 hover:to-indigo-700
            transform hover:scale-105 transition-all duration-300 shadow-lg text-sm md:text-base
            relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-white/20 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-500"></span>
          <span className="relative flex items-center gap-2">
            🔥 따뜻한 난로로 돌아가기
          </span>
        </button>

        {/* 신비로운 텍스트 힌트 */}
        <p className="text-center text-xs text-purple-400 italic">
          숨겨진 진실을 발견했어... 이제 이 지혜를 나눠주겠어?
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
