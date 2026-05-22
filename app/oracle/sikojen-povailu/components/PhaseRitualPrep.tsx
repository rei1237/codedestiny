'use client';

import React, { useState } from 'react';
import { useSikojenpovailuContext } from '../SikojenpovailuContext';
import { YeonSpriteAvatar } from './YeonSpriteAvatar';

export function PhaseRitualPrep() {
  const { setPhase, selectCategory } = useSikojenpovailuContext();
  const [selectedCategory, setLocalSelectedCategory] = useState<string | null>(null);

  const pouches = [
    {
      id: '금전운',
      icon: '💰',
      label: '부의 주머니',
      description: '부와 번영',
      color: 'from-yellow-200 to-yellow-300',
      borderColor: 'border-yellow-400',
    },
    {
      id: '연애운',
      icon: '💕',
      label: '사랑의 주머니',
      description: '사랑과 인연',
      color: 'from-pink-200 to-rose-300',
      borderColor: 'border-pink-400',
    },
    {
      id: '행운',
      icon: '🍀',
      label: '행운의 주머니',
      description: '일반 행운',
      color: 'from-emerald-200 to-green-300',
      borderColor: 'border-emerald-400',
    },
  ];

  const handleSelectPouch = (pouchId: string) => {
    setLocalSelectedCategory(pouchId);
    selectCategory(pouchId as '금전운' | '연애운' | '행운');
    
    setTimeout(() => {
      setPhase('casting');
    }, 500);
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center">
      {/* 부드러운 핑크 배경 */}
      <div className="absolute inset-0 bg-gradient-to-b from-rose-50 via-pink-50 to-rose-50"></div>

      {/* 별/꽃 장식 입자 */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-2xl opacity-35 animate-pulse"
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
      <div className="absolute top-20 right-20 w-64 h-64 rounded-full blur-3xl bg-gradient-to-br from-pink-200 to-rose-100 opacity-15 animate-pulse"></div>
      <div className="absolute bottom-32 left-20 w-72 h-72 rounded-full blur-3xl bg-gradient-to-tr from-yellow-100 to-pink-100 opacity-12 animate-pulse" style={{ animationDelay: '0.5s' }}></div>

      {/* 연이 캐릭터 (화면 상단 중앙) */}
      <div className="absolute left-1/2 -translate-x-1/2 top-12 z-20">
        <div style={{ animation: `gentle-bob 2s ease-in-out infinite` }}>
          <YeonSpriteAvatar
            frames={[7, 8, 9, 8]}
            size={160}
            alt="연이 준비 단계"
            ringClassName="from-rose-300 to-pink-300"
            intervalMs={840}
          />
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 max-w-3xl w-full px-6 py-12 mt-96">
        <div className="sikojen-premium-band mb-7 flex items-center justify-between rounded-2xl border border-rose-200/80 bg-white/70 px-4 py-3 shadow-[0_10px_28px_rgba(190,24,93,0.12)] backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-2xl leading-none">🐷</span>
            <div>
              <p className="text-xs font-semibold tracking-wide text-rose-500">GUIDED CASTING</p>
              <p className="text-sm font-bold text-rose-700">연이가 선택 순간을 함께 안내해요</p>
            </div>
          </div>
          <span className="rounded-full border border-amber-300 bg-amber-100/80 px-2.5 py-1 text-[11px] font-bold text-amber-800">
            3 Steps
          </span>
        </div>
        
        {/* 제목 */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-pink-600 mb-3" style={{ fontFamily: "'Jua', serif" }}>
            당신의 마법 주석을 선택하세요!
          </h1>
          
          <p className="text-sm md:text-base text-rose-600 font-medium">
            세 개의 주머니 중 마음이 가는 것을 골라봐요 ✨
          </p>
        </div>

        {/* 주머니 선택 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {pouches.map((pouch) => (
            <button
              key={pouch.id}
              onClick={() => handleSelectPouch(pouch.id)}
              className={`relative group transform transition-all duration-300 focus:outline-none
                ${selectedCategory === pouch.id ? 'scale-105 -translate-y-3' : 'hover:scale-102 hover:-translate-y-1'}
              `}
            >
              {/* 주머니 카드 */}
              <div className={`sikojen-premium-card relative rounded-3xl p-8 transition-all duration-300 bg-white/90 backdrop-blur
                ${selectedCategory === pouch.id ? 'ring-4 ring-pink-300 ring-offset-2 shadow-xl' : 'shadow-lg border-3 border-yellow-300 hover:shadow-xl'}
              `}>
                
                {/* 아이콘 원형 배경 */}
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center text-5xl shadow-md border-2 border-pink-200 group-hover:scale-110 transition-transform">
                  {pouch.icon}
                </div>

                {/* 주머니 정보 */}
                <h3 className="text-lg font-bold text-rose-700 mb-1" style={{ fontFamily: "'Jua', serif" }}>
                  {pouch.label}
                </h3>
                <p className="text-xs text-rose-600 font-medium">
                  {pouch.description}
                </p>

                {/* 선택 체크마크 */}
                {selectedCategory === pouch.id && (
                  <div className="absolute top-3 right-3 w-8 h-8 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg animate-pulse">
                    ✓
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* 선택 피드백 메시지 */}
        {selectedCategory && (
          <div className="text-center mt-8 animate-fade-in">
            <p className="text-lg font-bold text-rose-600 mb-1" style={{ fontFamily: "'Jua', serif" }}>
              좋은 선택! 🎀
            </p>
            <p className="text-xs text-rose-500">주석을 녹이는 마법이 준비되고 있어요...</p>
          </div>
        )}
      </div>

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
        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
