'use client';

import React, { useEffect, useState } from 'react';
import { useSikojenpovailuContext } from '../SikojenpovailuContext';
import { YeonSpriteAvatar } from './YeonSpriteAvatar';
import { PigCounselBubble } from './PigCounselBubble';
import { getCurrentLoadingLocale, type LoadingLocale } from '@/constants/loadingMessages';

const SIKOJEN_REVEAL_TEXT_TRANSLATIONS = {
  ko: {
    loading: "형태 로드 중...",
    formingTitle: "주석이 운명의 형상으로 굳어지고 있어요",
    formingSubtitle: "연이가 마지막 별빛을 불어넣는 중...",
    resultGuideAlt: "연이 결과 안내",
    headerTitle: "연이가 읽어준 주석 형상 결과",
    resultView: "Result View",
    counselTitle: "연이의 결과 상담",
    counselMessage: "겉으로 보인 뜻과 그림자 뜻을 같이 읽으면 더 정확해져. 내가 핵심 문장만 딱 집어서 알려줄게.",
    shapeCode: "형상 코드",
    category: "카테고리",
    meaning: "🔮 의미",
    advice: "💡 조언",
    luckyNumber: "🍀 럭키 넘버",
    luckyColor: "🎨 럭키 컬러",
    yeonWord: "연이의 한마디",
    mascotAlt: "연이 결과 마스코트",
    shadowCta: "👁️ 영혼의 그림자 읽기",
    nextCta: "✨ 다음으로 진행",
    shadowTitle: "🌙 영혼의 그림자",
    shadowLead: "이 형태의 숨겨진 의미는...",
    confirm: "확인",
  },
  en: {
    loading: "Loading the shape...",
    formingTitle: "The tin is settling into a shape of destiny",
    formingSubtitle: "Yeoni is breathing in the final starlight...",
    resultGuideAlt: "Yeoni result guide",
    headerTitle: "The tin-cast shape Yeoni read for you",
    resultView: "Result View",
    counselTitle: "Yeoni's Result Counsel",
    counselMessage: "Read the visible meaning together with the shadow meaning, and it becomes clearer. I will point out the core sentence for you.",
    shapeCode: "Shape code",
    category: "Category",
    meaning: "🔮 Meaning",
    advice: "💡 Advice",
    luckyNumber: "🍀 Lucky Number",
    luckyColor: "🎨 Lucky Color",
    yeonWord: "A Word from Yeoni",
    mascotAlt: "Yeoni result mascot",
    shadowCta: "👁️ Read the soul shadow",
    nextCta: "✨ Continue",
    shadowTitle: "🌙 Soul Shadow",
    shadowLead: "The hidden meaning of this shape is...",
    confirm: "Confirm",
  },
  ja: {
    loading: "形を読み込んでいます...",
    formingTitle: "錫が運命の形へ固まりつつあります",
    formingSubtitle: "ヨニが最後の星明かりを吹き込んでいます...",
    resultGuideAlt: "ヨニの結果案内",
    headerTitle: "ヨニが読み解いた錫の形の結果",
    resultView: "結果表示",
    counselTitle: "ヨニの結果相談",
    counselMessage: "表に出た意味と影の意味を一緒に読むと、もっと正確になります。大事な一文だけ、私がそっと拾ってあげます。",
    shapeCode: "形コード",
    category: "カテゴリー",
    meaning: "🔮 意味",
    advice: "💡 助言",
    luckyNumber: "🍀 ラッキーナンバー",
    luckyColor: "🎨 ラッキーカラー",
    yeonWord: "ヨニのひと言",
    mascotAlt: "ヨニ結果マスコット",
    shadowCta: "👁️ 魂の影を読む",
    nextCta: "✨ 次へ進む",
    shadowTitle: "🌙 魂の影",
    shadowLead: "この形に隠された意味は...",
    confirm: "確認",
  },
  "zh-CN": {
    loading: "正在加载形态...",
    formingTitle: "锡正在凝固成命运的形态",
    formingSubtitle: "Yeoni 正在吹入最后的星光...",
    resultGuideAlt: "Yeoni 结果向导",
    headerTitle: "Yeoni 为你解读的锡形结果",
    resultView: "结果视图",
    counselTitle: "Yeoni 的结果咨询",
    counselMessage: "把表面含义和阴影含义一起读,会更准确。核心的一句话,我来帮你直接找出来。",
    shapeCode: "形态代码",
    category: "分类",
    meaning: "🔮 含义",
    advice: "💡 建议",
    luckyNumber: "🍀 幸运数字",
    luckyColor: "🎨 幸运颜色",
    yeonWord: "Yeoni 的一句话",
    mascotAlt: "Yeoni 结果吉祥物",
    shadowCta: "👁️ 解读灵魂的阴影",
    nextCta: "✨ 继续",
    shadowTitle: "🌙 灵魂的阴影",
    shadowLead: "这个形态隐藏的含义是...",
    confirm: "确认",
  },
  "zh-TW": {
    loading: "正在載入形態...",
    formingTitle: "錫正在凝固成命運的形態",
    formingSubtitle: "Yeoni 正在吹入最後的星光...",
    resultGuideAlt: "Yeoni 結果嚮導",
    headerTitle: "Yeoni 為你解讀的錫形結果",
    resultView: "結果檢視",
    counselTitle: "Yeoni 的結果諮詢",
    counselMessage: "把表面含義和陰影含義一起讀,會更準確。核心的一句話,我來幫你直接找出來。",
    shapeCode: "形態代碼",
    category: "分類",
    meaning: "🔮 含義",
    advice: "💡 建議",
    luckyNumber: "🍀 幸運數字",
    luckyColor: "🎨 幸運顏色",
    yeonWord: "Yeoni 的一句話",
    mascotAlt: "Yeoni 結果吉祥物",
    shadowCta: "👁️ 解讀靈魂的陰影",
    nextCta: "✨ 繼續",
    shadowTitle: "🌙 靈魂的陰影",
    shadowLead: "這個形態隱藏的含義是...",
    confirm: "確認",
  },
} as const;

function getSikojenRevealCopy(locale: LoadingLocale) {
  if (locale === "en" || locale === "ja" || locale === "zh-CN" || locale === "zh-TW") {
    return SIKOJEN_REVEAL_TEXT_TRANSLATIONS[locale];
  }
  return SIKOJEN_REVEAL_TEXT_TRANSLATIONS.ko;
}

export function PhaseReveal() {
  const { selectedShape, setPhase } = useSikojenpovailuContext();
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const [showShadowReading, setShowShadowReading] = useState(false);
  const [showResultCard, setShowResultCard] = useState(false);
  const copy = getSikojenRevealCopy(locale);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener('cd:locale-ready', syncLocale);
    window.addEventListener('cd:locale-change', syncLocale);
    window.addEventListener('storage', syncLocale);
    return () => {
      window.removeEventListener('cd:locale-ready', syncLocale);
      window.removeEventListener('cd:locale-change', syncLocale);
      window.removeEventListener('storage', syncLocale);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowResultCard(true);
    }, 1700);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  if (!selectedShape) {
    return <div className="min-h-screen flex items-center justify-center">{copy.loading}</div>;
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
            {copy.formingTitle}
          </p>
          <p className="text-sm text-rose-600">{copy.formingSubtitle}</p>
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
                  alt={copy.resultGuideAlt}
                  ringClassName="from-rose-200 to-pink-200"
                  className="shrink-0"
                  intervalMs={920}
                />
                <div>
                  <p className="text-xs font-semibold tracking-wide text-rose-500">SIKOJEN POVAILU</p>
                  <p className="text-sm font-bold text-rose-700">{copy.headerTitle}</p>
                </div>
              </div>
              <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                {copy.resultView}
              </span>
            </div>

            <PigCounselBubble
              className="mb-4"
              title={copy.counselTitle}
              message={copy.counselMessage}
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
                      {copy.shapeCode}: {selectedShape.id}
                    </span>
                    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                      {copy.category}: {selectedShape.category}
                    </span>
                  </div>
                  <p className="text-sm md:text-base text-amber-700 italic">{selectedShape.name_fi}</p>
                  <p className="text-xs text-amber-600 mt-1">{selectedShape.name_en}</p>
                </div>

                <div className="relative z-10 h-1 rounded-full mb-6 bg-gradient-to-r from-amber-200 via-pink-300 to-rose-200" />

                <div className="relative z-10 mb-6">
                  <h3 className="mb-2 text-lg font-bold text-rose-600">{copy.meaning}</h3>
                  <p className="text-sm md:text-base leading-relaxed text-amber-800">{selectedShape.meaning_ko}</p>
                  <p className="mt-3 text-xs md:text-sm italic text-amber-700">&quot;{selectedShape.meaning_fi}&quot;</p>
                </div>

                <div className="relative z-10 mb-6 rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-100/60 to-orange-100/70 p-4">
                  <h3 className="mb-2 text-lg font-bold text-amber-900">{copy.advice}</h3>
                  <p className="text-sm md:text-base text-amber-800">{selectedShape.advice_ko}</p>
                  <p className="mt-2 text-xs md:text-sm italic text-amber-700">&quot;{selectedShape.advice_fi}&quot;</p>
                </div>

                <div className="relative z-10 mb-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-yellow-50 to-amber-100 p-3 text-center">
                    <p className="mb-1 text-xs font-bold text-amber-600">{copy.luckyNumber}</p>
                    <p className="text-2xl font-bold text-amber-800">{selectedShape.lucky_number}</p>
                  </div>
                  <div className="rounded-xl border-2 border-rose-200 bg-gradient-to-br from-pink-50 to-rose-100 p-3 text-center">
                    <p className="mb-1 text-xs font-bold text-rose-600">{copy.luckyColor}</p>
                    <p className="text-xs font-semibold leading-tight text-rose-800">{selectedShape.lucky_color}</p>
                  </div>
                </div>

                <div className="relative z-10 mb-6 flex items-start gap-3 rounded-2xl border-2 border-pink-300 bg-gradient-to-r from-pink-100 to-rose-50 p-4">
                  <span className="text-2xl shrink-0">🐷</span>
                  <div>
                    <p className="mb-1 text-xs font-bold text-pink-600">{copy.yeonWord}</p>
                    <p className="text-sm leading-relaxed text-rose-700">{selectedShape.yeon_message}</p>
                  </div>
                </div>

                <div className="relative z-10 mb-6 flex justify-center sm:justify-end">
                  <div className="inline-flex max-w-[280px] flex-col items-center gap-2 sm:items-end">
                    <YeonSpriteAvatar
                      frames={[4, 5, 6, 5]}
                      size={92}
                      alt={copy.mascotAlt}
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
                    <span className="relative">{copy.shadowCta}</span>
                  </button>

                  <button
                    onClick={() => setPhase('sharing')}
                    className="w-full rounded-xl bg-gradient-to-r from-pink-300 via-rose-300 to-amber-200 px-4 py-3 text-sm font-bold text-amber-900 shadow-lg transition-all duration-300 hover:scale-105 hover:from-pink-400 hover:via-rose-400 hover:to-amber-300 md:text-base"
                  >
                    {copy.nextCta}
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
                {copy.shadowTitle}
              </h3>
              
              <div className="mb-6 space-y-3">
                <p className="text-sm leading-relaxed text-rose-600">
                  {copy.shadowLead}
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
                {copy.confirm}
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
