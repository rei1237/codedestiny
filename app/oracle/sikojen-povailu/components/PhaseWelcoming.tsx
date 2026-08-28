'use client';

import React from 'react';
import { useSikojenpovailuContext } from '../SikojenpovailuContext';
import { YeonSpriteAvatar } from './YeonSpriteAvatar';
import { useSikojenPovailuCopy } from '../_lib/copy';

export function PhaseWelcoming() {
  const copy = useSikojenPovailuCopy();
  const { setPhase } = useSikojenpovailuContext();

  const requestImmersiveFullscreen = async () => {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) return;
    const root = document.documentElement;
    if (!root || typeof root.requestFullscreen !== 'function') return;
    try {
      await root.requestFullscreen();
    } catch (e) {
      // Ignore browser policy errors and continue normal flow.
    }
  };

  const handleStart = async () => {
    await requestImmersiveFullscreen();
    setTimeout(() => {
      setPhase('ritual-prep');
    }, 400);
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center">
      {/* 부드러운 핑크/크림 배경 */}
      <div className="absolute inset-0 bg-gradient-to-b from-rose-50 via-pink-50 to-rose-50"></div>

      {/* 닫기 버튼 (우측 상단) */}
      <a
        href="/"
        className="absolute top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-rose-200 text-rose-500 text-sm font-bold shadow-md hover:bg-rose-50 hover:text-rose-700 transition-all duration-200 hover:scale-105 active:scale-95"
        aria-label={copy.welcomeCloseAria}
      >
        <span className="text-base">✕</span>
        <span className="hidden sm:inline">{copy.welcomeCloseLabel}</span>
      </a>
      
      {/* 별/꽃 장식 입자 */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-2xl opacity-35 animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        >
          {i % 2 === 0 ? '⭐' : '✨'}
        </div>
      ))}

      {/* 배경 장식 - 부드러운 그라데이션 원 */}
      <div className="absolute top-20 right-20 w-64 h-64 rounded-full blur-3xl bg-gradient-to-br from-pink-200 to-rose-100 opacity-15 animate-pulse"></div>
      <div className="absolute bottom-32 left-20 w-72 h-72 rounded-full blur-3xl bg-gradient-to-tr from-yellow-100 to-pink-100 opacity-12 animate-pulse" style={{ animationDelay: '0.5s' }}></div>

      {/* 연이 캐릭터 (중앙 상단) - 스프라이트 시트 순환 */}
      <div className="absolute left-1/2 -translate-x-1/2 top-10 sm:top-14 md:top-20 z-20 transform">
        <div className="relative">
          <div
            style={{ animation: `gentle-bob 2.5s ease-in-out infinite` }}
            className="relative z-10"
          >
            <YeonSpriteAvatar
              frames={[1, 2, 3, 4, 3, 2, 5, 6]}
              size={200}
              alt={copy.welcomeSpriteAlt}
              ringClassName="from-rose-300 to-pink-300"
              intervalMs={780}
            />
          </div>

          {/* 주석 국자 */}
          <div className="absolute -right-4 sm:-right-6 md:-right-8 -bottom-1 sm:-bottom-2 text-3xl sm:text-4xl md:text-5xl drop-shadow-lg transform rotate-12 hover:scale-110 transition-transform z-20">
            🥄
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 text-center max-w-2xl px-6 sm:px-8 mt-[230px] sm:mt-[260px] md:mt-48">
        
        {/* "TERVETULOA!" - 환영 인사 */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-pink-600 mb-2" style={{ fontFamily: "var(--font-playful)" }}>
          TERVETULOA!
        </h2>

        {/* 인사말 */}
        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-rose-600 mb-4 sm:mb-5" style={{ fontFamily: "var(--font-playful)" }}>
          {copy.welcomeGreeting}
        </p>

        {/* 부제목 */}
        <p className="whitespace-pre-line text-sm sm:text-base md:text-lg text-rose-700 mb-6 leading-relaxed font-medium">
          {copy.welcomeSubtitle}
        </p>

        {/* 핀란드 주석점 소개 카드 */}
        <div className="w-full max-w-sm mx-auto mb-8 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-pink-200 shadow-lg p-4 text-left">
          <p className="text-xs font-bold text-pink-500 mb-2 text-center tracking-wider">{copy.welcomeIntroHeading}</p>
          <ul className="space-y-1.5 text-xs text-rose-700">
            <li className="flex gap-2 items-start"><span>🔥</span><span>{copy.welcomeIntroBullet1}</span></li>
            <li className="flex gap-2 items-start"><span>💧</span><span>{copy.welcomeIntroBullet2}</span></li>
            <li className="flex gap-2 items-start"><span>✨</span><span>{copy.welcomeIntroBullet3}</span></li>
            <li className="flex gap-2 items-start"><span>🐷</span><span>{copy.welcomeIntroBullet4}</span></li>
            <li className="flex gap-2 items-start"><span>🖥️</span><span>{copy.welcomeIntroBullet5}</span></li>
          </ul>
        </div>

        {/* CTA 버튼 */}
        <button
          onClick={handleStart}
          className="relative group inline-block px-7 sm:px-10 py-3 sm:py-4 text-base sm:text-lg font-bold text-yellow-900 rounded-full shadow-lg border-3 border-yellow-400 transition-all duration-300 transform hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #FCD34D 0%, #FBBF24 50%, #F59E0B 100%)',
            boxShadow: '0 6px 16px rgba(251, 191, 36, 0.4)',
          }}
        >
          <span className="relative z-10 flex items-center gap-2">
            {copy.welcomeCtaButton}
            <span className="text-xl animate-bounce" style={{ animationDelay: '0.1s' }}>✨</span>
          </span>
        </button>
      </div>

      {/* 아래 장식 입자 */}
      <div className="absolute bottom-12 left-12 text-3xl opacity-50 animate-bounce">🌸</div>
      <div className="absolute bottom-16 right-16 text-3xl opacity-50" style={{
        animation: `gentle-bob 1.5s ease-in-out infinite`
      }}>⭐</div>

      {/* 애니메이션 정의 */}
      <style>{`
        @keyframes gentle-bob {
          0%, 100% { 
            transform: translateY(0px);
          }
          50% { 
            transform: translateY(-15px);
          }
        }
      `}</style>
    </div>
  );
}
