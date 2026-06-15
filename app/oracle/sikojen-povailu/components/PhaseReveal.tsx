'use client';

import React, { useEffect, useState } from 'react';
import { useSikojenpovailuContext } from '../SikojenpovailuContext';
import { YeonSpriteAvatar } from './YeonSpriteAvatar';
import { PigCounselBubble } from './PigCounselBubble';

export function PhaseReveal() {
  const { selectedShape, setPhase } = useSikojenpovailuContext();
  const [showShadowReading, setShowShadowReading] = useState(false);
  const [showResultCard, setShowResultCard] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowResultCard(true);
    }, 1700);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  if (!selectedShape) {
    return <div className="min-h-screen flex items-center justify-center">형태 로드 중...</div>;
  }

  // 그림자 읽기 트리거
  const handleShadowRead = () => {
    setShowShadowReading(true);
  };

  const handleCloseShadow = () => {
    setShowShadowReading(false);
  };

  return (
    <div className="relative z-40 min-h-[100dvh] w-full bg-gradient-to-b from-rose-50 via-pink-50 to-amber-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-rose-200/45 blur-3xl" />
        <div className="absolute -bottom-14 right-[8%] h-[240px] w-[240px] rounded-full bg-amber-200/45 blur-3xl" />
      </div>

      {!showResultCard ? (
        <div className="relative z-10 flex min-h-[100dvh] w-full flex-col items-center justify-center px-6 text-center">
          <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full border border-rose-200/50 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.95),rgba(255,193,211,0.72)_55%,rgba(255,173,120,0.65)_100%)] shadow-[0_0_34px_rgba(255,165,185,0.45)]">
            <span className="text-5xl" style={{ animation: 'moltenPulse 1.2s ease-in-out infinite' }}>🫧</span>
          </div>
          <p className="mb-2 text-xl font-bold text-rose-700" style={{ fontFamily: "var(--font-playful)" }}>
            주석이 운명의 형상으로 굳어지고 있어요
          </p>
          <p className="text-sm text-rose-600">연이가 마지막 별빛을 불어넣는 중...</p>
          <div className="mt-6 h-2 w-56 overflow-hidden rounded-full bg-white/20">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-yellow-200 via-pink-200 to-rose-200" style={{ animation: 'loadSweep 1.6s ease-in-out infinite' }} />
          </div>
        </div>
      ) : (
        <div
          className="relative z-10 flex w-full items-start justify-center px-4"
          style={{
            paddingTop: 'max(20px, env(safe-area-inset-top))',
            paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          }}
        >
          <div className="sikojen-result-shell w-full max-w-xl animate-[revealRise_620ms_cubic-bezier(0.2,0.75,0.28,1)_both]">
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-pink-200/80 bg-white/85 px-4 py-3 shadow-[0_10px_24px_rgba(190,24,93,0.14)] backdrop-blur-md">
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
                  <p className="text-xs font-semibold tracking-wide text-rose-500">SIKOJEN POVAILU</p>
                  <p className="text-sm font-bold text-rose-700">연이가 읽어준 주석 형상 결과</p>
                </div>
              </div>
              <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                Result View
              </span>
            </div>

            <PigCounselBubble
              className="mb-4"
              title="연이의 결과 상담"
              message="겉으로 보인 뜻과 그림자 뜻을 같이 읽으면 더 정확해져. 내가 핵심 문장만 딱 집어서 알려줄게."
            />

            <div className="sikojen-reveal-card relative flex flex-col overflow-hidden rounded-3xl border-2 border-amber-200/80 bg-gradient-to-br from-amber-50 via-rose-50 to-yellow-50 shadow-[0_20px_42px_rgba(190,24,93,0.16)]">
              <div className="sikojen-reveal-scroll px-5 pb-5 pt-6 sm:px-7 sm:pb-7 sm:pt-7">
                <div className="absolute inset-0 rounded-3xl opacity-10 pointer-events-none" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(212,175,55,0.28) 0px, rgba(212,175,55,0.28) 2px, transparent 2px, transparent 10px)'
                }} />

                <div className="relative z-10 flex justify-center mb-6">
                  <div
                    className="sikojen-shape-hero h-28 w-28 rounded-full border-4 border-pink-300 text-7xl shadow-lg flex items-center justify-center"
                    style={{ background: `radial-gradient(circle at 35% 30%, #fff, ${selectedShape.color})` }}
                  >
                    {selectedShape.icon}
                  </div>
                </div>

                <div className="relative z-10 text-center mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-amber-900 mb-2" style={{ fontFamily: "var(--font-playful)" }}>
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
                  <p className="text-sm md:text-base text-amber-700 italic">{selectedShape.name_fi}</p>
                  <p className="text-xs text-amber-600 mt-1">{selectedShape.name_en}</p>
                </div>

                <div className="relative z-10 h-1 rounded-full mb-6 bg-gradient-to-r from-amber-200 via-pink-300 to-rose-200" />

                <div className="relative z-10 mb-6">
                  <h3 className="mb-2 text-lg font-bold text-rose-600">🔮 의미</h3>
                  <p className="text-sm md:text-base leading-relaxed text-amber-800">{selectedShape.meaning_ko}</p>
                  <p className="mt-3 text-xs md:text-sm italic text-amber-700">&quot;{selectedShape.meaning_fi}&quot;</p>
                </div>

                <div className="relative z-10 mb-6 rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-100/60 to-orange-100/70 p-4">
                  <h3 className="mb-2 text-lg font-bold text-amber-900">💡 조언</h3>
                  <p className="text-sm md:text-base text-amber-800">{selectedShape.advice_ko}</p>
                  <p className="mt-2 text-xs md:text-sm italic text-amber-700">&quot;{selectedShape.advice_fi}&quot;</p>
                </div>

                <div className="relative z-10 mb-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-yellow-50 to-amber-100 p-3 text-center">
                    <p className="mb-1 text-xs font-bold text-amber-600">🍀 럭키 넘버</p>
                    <p className="text-2xl font-bold text-amber-800">{selectedShape.lucky_number}</p>
                  </div>
                  <div className="rounded-xl border-2 border-rose-200 bg-gradient-to-br from-pink-50 to-rose-100 p-3 text-center">
                    <p className="mb-1 text-xs font-bold text-rose-600">🎨 럭키 컬러</p>
                    <p className="text-xs font-semibold leading-tight text-rose-800">{selectedShape.lucky_color}</p>
                  </div>
                </div>

                <div className="relative z-10 mb-6 flex items-start gap-3 rounded-2xl border-2 border-pink-300 bg-gradient-to-r from-pink-100 to-rose-50 p-4">
                  <span className="text-2xl shrink-0">🐷</span>
                  <div>
                    <p className="mb-1 text-xs font-bold text-pink-600">연이의 한마디</p>
                    <p className="text-sm leading-relaxed text-rose-700">{selectedShape.yeon_message}</p>
                  </div>
                </div>

                <div className="relative z-10 mb-6 flex justify-center sm:justify-end">
                  <div className="inline-flex max-w-[280px] flex-col items-center gap-2 sm:items-end">
                    <YeonSpriteAvatar
                      frames={[4, 5, 6, 5]}
                      size={92}
                      alt="연이 결과 마스코트"
                      ringClassName="from-rose-200 to-pink-200"
                      intervalMs={740}
                    />
                    <div className="rounded-2xl border-2 border-pink-300 bg-pink-100/90 px-3 py-2 text-center text-xs font-bold leading-relaxed text-pink-700 shadow-lg sm:text-right">
                      {selectedShape.yeon_message}
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex flex-col gap-3 pb-1">
                  <button
                    onClick={handleShadowRead}
                    className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 px-4 py-3 text-sm font-bold text-rose-900 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:from-rose-500 hover:via-pink-500 hover:to-amber-400 md:text-base"
                  >
                    <span className="absolute inset-0 -skew-x-12 bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />
                    <span className="relative">👁️ 영혼의 그림자 읽기</span>
                  </button>

                  <button
                    onClick={() => setPhase('sharing')}
                    className="w-full rounded-xl bg-gradient-to-r from-pink-300 via-rose-300 to-amber-200 px-4 py-3 text-sm font-bold text-amber-900 shadow-lg transition-all duration-300 hover:scale-105 hover:from-pink-400 hover:via-rose-400 hover:to-amber-300 md:text-base"
                  >
                    ✨ 다음으로 진행
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 그림자 읽기 모달 */}
      {showShadowReading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-rose-100/55 px-4 backdrop-blur-sm"
          onClick={handleCloseShadow}
        >
          <div
            className="relative max-w-md w-full rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/40 to-rose-100/20"></div>

            <div className="relative z-10 text-center">
              <h3 className="mb-4 text-2xl font-bold text-rose-600" style={{ fontFamily: "var(--font-playful)" }}>
                🌙 영혼의 그림자
              </h3>
              
              <div className="mb-6 space-y-3">
                <p className="text-sm leading-relaxed text-rose-600">
                  이 형태의 숨겨진 의미는...
                </p>
                <p className="text-base font-semibold text-rose-700">
                  {selectedShape.shadow_meaning_ko}
                </p>
                <p className="text-xs italic text-rose-500">
                  &quot;{selectedShape.shadow_meaning_fi}&quot;
                </p>
              </div>

              <button
                onClick={handleCloseShadow}
                className="w-full rounded-lg bg-gradient-to-r from-rose-400 to-amber-300 px-4 py-2 text-sm font-bold text-rose-900 transition-all duration-300 hover:from-rose-500 hover:to-amber-400 hover:scale-[1.02]"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes moltenPulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.07) rotate(8deg); }
        }

        @keyframes loadSweep {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(240%); }
        }

        @keyframes revealRise {
          0% { opacity: 0; transform: translateY(36px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        .sikojen-reveal-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(236, 72, 153, 0.45) transparent;
        }

        .sikojen-reveal-scroll::-webkit-scrollbar {
          width: 7px;
        }

        .sikojen-reveal-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .sikojen-reveal-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(251, 146, 60, 0.6), rgba(244, 114, 182, 0.72));
          border-radius: 999px;
        }

        .sikojen-reveal-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(251, 146, 60, 0.85), rgba(244, 114, 182, 0.9));
        }
      `}</style>
    </div>
  );
}
