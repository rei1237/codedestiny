'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { useSikojenpovailuContext } from '../SikojenpovailuContext';
import { YeonSpriteAvatar } from './YeonSpriteAvatar';

const BLESSING_MESSAGES = [
  {
    ko: '행운이 항상 너와 함께하길 바라. 그리고 누군가가 슬플 때 이 따뜻한 마법을 나눠줄래?',
    fi: 'Onnea uuteen vuoteen! (새해를 축하해!)',
  },
  {
    ko: '당신의 모든 꿈이 현실이 되고, 매일이 기쁨으로 가득하길 바래.',
    fi: 'Pysy onnellisena! (행복하게 지내!)',
  },
  {
    ko: '이 순간의 따뜻함을 잊지 말고, 누군가 추운 날에 함께해줄래?',
    fi: 'Rakkautta ja lämpöä! (사랑과 따뜻함을!)',
  },
  {
    ko: '당신이 받은 축복을 다른 누군가에게도 나눠줄 수 있길 바라.',
    fi: 'Jakaa iloa kaikille! (모두와 기쁨을 나눠!)',
  },
  {
    ko: '매일의 작은 순간들이 모여 당신의 가장 아름다운 이야기가 되길.',
    fi: 'Jokainen päivä on ihme! (매일이 기적이길!)',
  },
  {
    ko: '혼자가 아니야. 항상 누군가가 너를 응원하고 있어.',
    fi: 'Et ole koskaan yksin! (너는 절대 혼자가 아니야!)',
  },
];

export function PhaseSharing() {
  const { resetGame, selectedShape } = useSikojenpovailuContext();
  const [isCopied, setIsCopied] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [blessingMessage, setBlessingMessage] = useState<{ ko: string; fi: string } | null>(null);

  // 컴포넌트 마운트 시 랜덤 축복 메시지 선택
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * BLESSING_MESSAGES.length);
    setBlessingMessage(BLESSING_MESSAGES[randomIndex]);
  }, []);

  const generateShareText = () => {
    if (!selectedShape) return '';
    return `✨ 나의 핀란드 주석점 결과: "${selectedShape.name_ko}" (${selectedShape.name_fi})\n\n💭 "${selectedShape.meaning_ko}"\n\n🌸 연이의 조언: ${selectedShape.advice_ko}\n\n#SikojenpovailuFortune #핀란드주석점 #연이`;
  };

  const handleShare = async () => {
    const shareText = generateShareText();
    
    if (navigator.share && navigator.canShare({ text: shareText })) {
      try {
        await navigator.share({
          title: '연이의 핀란드 주석점',
          text: shareText,
        });
        setIsShared(true);
        setTimeout(() => setIsShared(false), 2000);
      } catch (err) {
        console.log('Share cancelled:', err);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleSaveImage = () => {
    const shareText = generateShareText();
    navigator.clipboard.writeText(shareText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePlayAgain = () => {
    resetGame();
  };

  return (
    <div className="min-h-[100dvh] w-full relative bg-gradient-to-b from-rose-50 via-pink-50 to-amber-50 flex items-start justify-center px-4 py-6 sm:py-8">
      
      {/* 배경 무늬 - 반짝임 효과 */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-yellow-300 text-2xl animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.4 + 0.2,
              animation: `twinkle ${1 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 1}s`,
            }}
          >
            ✨
          </div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center justify-start max-w-2xl w-full gap-6 sm:gap-8 pb-8">
        
        {/* 연이 캐릭터 (상단 중앙) */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="animate-bounce">
              <YeonSpriteAvatar
                frames={[8, 9, 10, 11, 12]}
                size={120}
                alt="연이 축하 스프라이트"
                ringClassName="from-rose-300 to-pink-300"
                intervalMs={700}
              />
            </div>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-3xl">
              🌸
            </div>
          </div>
        </div>

        {/* 제목 */}
        <h2 className="text-3xl md:text-4xl font-bold text-rose-500 text-center" style={{ fontFamily: "'Jua', sans-serif" }}>
          행운이 활짝 피었어요! 🌺
        </h2>

        {/* 결과 카드 미리보기 */}
        {selectedShape && (
          <div className="w-full max-w-md rounded-2xl border-4 border-pink-300 bg-gradient-to-br from-white via-pink-50 to-rose-50 shadow-2xl p-6">
            
            {/* 카드 헤더 */}
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">{selectedShape.icon}</div>
              <h3 className="text-2xl font-bold text-rose-600 mb-1" style={{ fontFamily: "'Jua', sans-serif" }}>
                {selectedShape.name_ko}
              </h3>
              <p className="text-sm text-rose-500 italic mb-2">
                {selectedShape.name_fi}
              </p>
              <span className="inline-block bg-gradient-to-r from-pink-200 to-rose-200 text-rose-700 px-3 py-1 rounded-full text-xs font-semibold">
                {selectedShape.category === 'wealth' ? '💰 부의 형태' : 
                 selectedShape.category === 'love' ? '💕 사랑의 형태' : 
                 '🍀 행운의 형태'}
              </span>
            </div>

            {/* 카드 구분선 */}
            <div className="h-1 bg-gradient-to-r from-pink-200 via-rose-300 to-pink-200 rounded-full mb-4"></div>

            {/* 의미 */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-rose-600 mb-1">✨ 의미</p>
              <p className="text-sm text-amber-900">
                {selectedShape.meaning_ko}
              </p>
              <p className="text-xs text-rose-500 italic mt-1">
                &quot;{selectedShape.meaning_fi}&quot;
              </p>
            </div>

            {/* 조언 */}
            <div className="bg-gradient-to-r from-amber-100/50 to-rose-100/50 rounded-lg border border-rose-200 p-3">
              <p className="text-xs font-bold text-rose-600 mb-1">💡 연이의 조언</p>
              <p className="text-xs text-amber-900">
                {selectedShape.advice_ko}
              </p>
            </div>
          </div>
        )}

        {/* 액션 버튼들 - 그리드 이이 격자 */}
        <div className="w-full max-w-md grid grid-cols-1 gap-3">
          
          {/* 공유 버튼 */}
          <button
            onClick={handleShare}
            className="py-3 px-4 bg-gradient-to-r from-pink-400 via-rose-400 to-orange-300
              text-white font-bold rounded-xl hover:from-pink-500 hover:via-rose-500 hover:to-orange-400
              transform hover:scale-105 transition-all duration-300 shadow-lg text-sm md:text-base
              relative overflow-hidden group"
          >
            <span className="absolute inset-0 bg-white/20 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-500"></span>
            <span className="relative flex items-center justify-center gap-2">
              {isShared ? '✅ 공유됨!' : isCopied ? '📋 복사됨!' : '📤 친구에게 공유'}
            </span>
          </button>

          {/* 카드 저장 버튼 */}
          <button
            onClick={handleSaveImage}
            className="py-3 px-4 bg-gradient-to-r from-purple-400 via-violet-400 to-purple-500
              text-white font-bold rounded-xl hover:from-purple-500 hover:via-violet-500 hover:to-purple-600
              transform hover:scale-105 transition-all duration-300 shadow-lg text-sm md:text-base
              relative overflow-hidden group"
          >
            <span className="absolute inset-0 bg-white/20 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-500"></span>
            <span className="relative flex items-center justify-center gap-2">
              💾 카드 저장
            </span>
          </button>

          {/* 다시 시작 버튼 */}
          <button
            onClick={handlePlayAgain}
            className="py-3 px-4 bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400
              text-amber-900 font-bold rounded-xl hover:from-amber-400 hover:via-yellow-400 hover:to-amber-500
              transform hover:scale-105 transition-all duration-300 shadow-lg text-sm md:text-base
              relative overflow-hidden group"
          >
            <span className="absolute inset-0 bg-white/30 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-500"></span>
            <span className="relative flex items-center justify-center gap-2">
              🔄 다시 시작
            </span>
          </button>

          {/* 메인 화면 바로가기 버튼 */}
          <Link
            href="/"
            className="py-3 px-4 bg-white border-2 border-rose-300
              text-rose-500 font-bold rounded-xl hover:bg-rose-50 hover:border-rose-400 hover:text-rose-600
              transform hover:scale-105 transition-all duration-300 shadow text-sm md:text-base
              flex items-center justify-center gap-2"
          >
            🏠 메인 화면으로
          </Link>
        </div>

        {/* 연이의 축복 메시지 */}
        <div className="w-full max-w-md rounded-2xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 text-center">
          <p className="text-lg font-bold text-purple-600 mb-3" style={{ fontFamily: "'Jua', sans-serif" }}>
            ✨ 연이의 축복 ✨
          </p>
          <p className="text-sm text-purple-800 leading-relaxed">
            &quot;{blessingMessage?.ko}<br/>
            <span className="font-bold italic text-purple-700">{blessingMessage?.fi}</span>&quot;
          </p>
        </div>
      </div>

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
