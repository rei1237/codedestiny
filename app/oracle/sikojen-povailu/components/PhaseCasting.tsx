'use client';

import React, { useState } from 'react';
import { useSikojenpovailuContext } from '../SikojenpovailuContext';
import { YeonSpriteAvatar } from './YeonSpriteAvatar';
import { PigCounselBubble } from './PigCounselBubble';
import { useSikojenPovailuCopy } from '../_lib/copy';

export function PhaseCasting() {
  const copy = useSikojenPovailuCopy();
  const { setPhase, setIsCasting, generateShape, selectedCategory } = useSikojenpovailuContext();
  const [isCasting, setLocalIsCasting] = useState(false);
  const [moldMelting, setMoldMelting] = useState(false);
  const [tinFlowing, setTinFlowing] = useState(false);
  const [magicParticles, setMagicParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const moldColor = selectedCategory === '금전운' ? 'from-yellow-200 to-yellow-300' :
                    selectedCategory === '연애운' ? 'from-pink-200 to-rose-300' :
                    'from-emerald-200 to-green-300';

  const moldEmoji = selectedCategory === '금전운' ? '💎' :
                    selectedCategory === '연애운' ? '💕' :
                    '🍀';

  const handleCastTin = () => {
    if (!isCasting) {
      setLocalIsCasting(true);
      setIsCasting(true);
      
      setTimeout(() => {
        setMoldMelting(true);
        setTinFlowing(true);
        
        const particles = Array.from({ length: 18 }).map((_, i) => ({
          id: i,
          x: Math.random() * 120 - 60,
          y: Math.random() * 120,
        }));
        setMagicParticles(particles);
      }, 300);
      
      setTimeout(() => {
        generateShape();
        setTimeout(() => {
          setPhase('reveal');
        }, 1200);
      }, 1800);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-b from-rose-50 via-pink-50 to-rose-50 flex items-center justify-center px-4 py-8">
      
      {/* 별/꽃 장식 입자 */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-2xl opacity-40 animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        >
          {i % 3 === 0 ? '⭐' : i % 3 === 1 ? '🌸' : '✨'}
        </div>
      ))}

      {/* 배경 장식 */}
      <div className="absolute top-20 right-20 w-72 h-72 rounded-full blur-3xl bg-gradient-to-br from-pink-200 to-rose-100 opacity-12 animate-pulse"></div>
      <div className="absolute bottom-40 left-32 w-80 h-80 rounded-full blur-3xl bg-gradient-to-tr from-red-100 to-pink-100 opacity-10 animate-pulse" style={{ animationDelay: '0.5s' }}></div>

      {/* 연이 캐릭터 (중앙 상단) */}
      <div className="absolute left-1/2 -translate-x-1/2 top-12 hidden lg:flex z-20">
        <YeonSpriteAvatar
          frames={[10, 11, 12, 11]}
          size={140}
          alt={copy.castingAvatarAlt}
          ringClassName="from-rose-300 to-pink-300"
          intervalMs={760}
        />
      </div>

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center justify-center mt-24">
        
        {/* 제목 */}
        <h2 className="text-3xl md:text-4xl font-bold text-pink-600 mb-12 text-center drop-shadow-lg" style={{ fontFamily: "var(--font-playful)" }}>
          {copy.castingTitle}
        </h2>

        <PigCounselBubble
          className="mb-7 w-full max-w-md"
          title={copy.castingCounselTitle}
          message={copy.castingCounselMessage}
        />

        {/* 캐스팅 영역 */}
        <div className="relative w-full h-80 flex items-center justify-center">
          
          {/* 주석 틀 (MOLD) */}
          <button
            onClick={handleCastTin}
            disabled={isCasting}
            className={`relative z-10 group transform transition-all duration-500 focus:outline-none ${
              isCasting ? 'cursor-not-allowed' : 'hover:scale-110 active:scale-95 cursor-pointer'
            }`}
          >
            <div className={`relative w-56 h-72 bg-gradient-to-br from-gray-300 via-gray-400 to-gray-600 rounded-3xl shadow-2xl border-4 border-yellow-500 p-6 flex flex-col items-center justify-center overflow-hidden
              ${moldMelting ? 'animate-pulse' : ''}
              ${isCasting ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}
            `} style={{
              boxShadow: `inset -2px -2px 8px rgba(0,0,0,0.3), inset 3px 3px 8px rgba(255,255,255,0.4), 0 10px 30px rgba(0,0,0,0.2)`
            }}>
              
              {/* 주석 녹는 효과 */}
              {tinFlowing ? (
                <>
                  {/* 녹아내리는 주석 시뮬레이션 - 메탈릭 실버 효과 */}
                  <div className="absolute inset-2 rounded-2xl bg-gradient-to-b from-gray-300 via-gray-400 to-gray-600 overflow-hidden" style={{
                    boxShadow: `inset 1px 1px 4px rgba(255,255,255,0.6), inset -1px -1px 4px rgba(0,0,0,0.3)`
                  }}>
                    {Array.from({ length: 40 }).map((_, i) => {
                      const offsetX = (i % 16) * 6.25;
                      const duration = 1.3 + (i % 5) * 0.25;
                      return (
                        <div
                          key={i}
                          className="absolute w-1.5 h-10 blur-xs"
                          style={{
                            background: `linear-gradient(to bottom, rgba(200,200,200,0.9) 0%, rgba(180,180,180,0.7) 40%, rgba(150,150,150,0.4) 100%)`,
                            left: `${8 + offsetX}%`,
                            top: `${-25}px`,
                            animation: `drip ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite`,
                            animationDelay: `${(i % 8) * 0.05}s`,
                            opacity: 0.9 + (i % 4) * 0.08,
                            boxShadow: `0 0 2px rgba(255,255,255,0.5)`,
                          }}
                        />
                      );
                    })}
                  </div>
                  
                  {/* 주석 액체 표면 광택 효과 */}
                  <div className="absolute top-8 left-0 right-0 h-4 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full blur-md" style={{ animation: `shimmer 2s ease-in-out infinite` }} />

                  {/* 녹는 효과 스파클 - 메탈릭 광택 */}
                  {moldMelting && (
                    <div className="absolute inset-0 pointer-events-none rounded-2xl">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-1.5 h-1.5 rounded-full blur-sm"
                          style={{
                            background: i % 2 === 0 ? '#E8E8E8' : '#D0D0D0',
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animation: `metallic-sparkle ${1 + Math.random() * 0.6}s ease-out forwards`,
                            animationDelay: `${i * 0.1}s`,
                            boxShadow: `0 0 3px rgba(255,255,255,0.8)`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* 아직 녹지 않은 상태 - 주석 텍스트 */}
                  <div className="relative z-10 flex flex-col items-center justify-center group-hover:scale-110 transition-transform" style={{
                    animation: `gentle-bob 1.5s ease-in-out infinite`,
                  }}>
                    <div className="text-2xl font-bold text-gray-600 mb-1" style={{ fontFamily: "var(--font-playful)" }}>{copy.castingTinLabel}</div>
                    <div className="text-xs text-gray-500 tracking-widest">TIN</div>
                    {/* 메탈릭 광택 라인 */}
                    <div className="mt-2 w-12 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent rounded-full opacity-60" />
                  </div>
                </>
              )}
            </div>

            {/* 활성화 시 발광 링 */}
            {isCasting && (
              <div className="absolute inset-0 rounded-3xl ring-4 ring-yellow-400 animate-pulse" style={{ boxShadow: `0 0 20px rgba(250, 204, 21, 0.5)` }}></div>
            )}
          </button>

          {/* 마법 입자 - 위로 떠오르기 */}
          {magicParticles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: `calc(50% + ${particle.x}px)`,
                top: `calc(50% + ${particle.y}px)`,
                background: selectedCategory === '금전운' ? '#FCD34D' :
                           selectedCategory === '연애운' ? '#FB7185' :
                           '#86EFAC',
                boxShadow: `0 0 10px currentColor`,
                animation: `float-up ${2.5 + Math.random() * 1}s ease-out forwards`,
                animationDelay: `${particle.id * 0.08}s`,
              }}
            />
          ))}
        </div>

        {/* 힌트 텍스트 */}
        <div className="mt-12 text-center text-rose-600 font-medium text-sm opacity-80">
          {copy.castingHint}
        </div>
      </div>

      {/* 애니메이션 정의 */}
      <style>{`
        @keyframes drip {
          0% { 
            transform: translateY(0) scaleY(1) translateX(0) rotate(0deg);
            opacity: 1;
          }
          25% { 
            transform: translateY(35px) scaleY(0.85) translateX(6px) rotate(5deg);
            opacity: 0.85;
          }
          50% { 
            transform: translateY(65px) scaleY(0.6) translateX(-4px) rotate(-3deg);
            opacity: 0.7;
          }
          75% { 
            transform: translateY(90px) scaleY(0.3) translateX(8px) rotate(2deg);
            opacity: 0.3;
          }
          100% { 
            transform: translateY(110px) scaleY(0.1) translateX(2px) rotate(0deg);
            opacity: 0;
          }
        }
        @keyframes sparkle {
          0% { 
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% { 
            transform: translate(var(--tx, 80px), -100px) scale(0);
            opacity: 0;
          }
        }
        @keyframes float-up {
          0% { 
            transform: translateY(0) translateX(0) scale(1);
            opacity: 1;
          }
          100% { 
            transform: translateY(-250px) translateX(var(--tx, 50px)) scale(0.2);
            opacity: 0;
          }
        }
        @keyframes gentle-bob {
          0%, 100% { 
            transform: translateY(0px);
          }
          50% { 
            transform: translateY(-15px);
          }
        }
        @keyframes shimmer {
          0%, 100% { 
            opacity: 0.3;
            transform: translateX(-100%);
          }
          50% { 
            opacity: 0.8;
            transform: translateX(100%);
          }
        }
        @keyframes metallic-sparkle {
          0% { 
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% { 
            transform: translate(var(--tx, 80px), -80px) scale(0.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
