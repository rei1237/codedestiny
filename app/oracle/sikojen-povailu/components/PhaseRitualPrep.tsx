'use client';

import React, { useEffect, useState } from 'react';
import { useSikojenpovailuContext } from '../SikojenpovailuContext';
import { YeonSpriteAvatar } from './YeonSpriteAvatar';
import { PigCounselBubble } from './PigCounselBubble';
import { getCurrentLoadingLocale, type LoadingLocale } from '@/constants/loadingMessages';

const SIKO_JEN_RITUAL_PREP_TEXT_TRANSLATIONS = {
  ko: {
    wealthPouch: '부의 주머니',
    wealthDescription: '부와 번영',
    lovePouch: '사랑의 주머니',
    loveDescription: '사랑과 인연',
    luckPouch: '행운의 주머니',
    luckDescription: '일반 행운',
    avatarAlt: '연이 준비 단계',
    counsel: '마음이 끌리는 주머니 하나만 골라줘. 나 연이가 거기서 오늘의 운세 상담을 시작할게!',
    guidedCasting: 'GUIDED CASTING',
    guidedCopy: '연이가 선택 순간을 함께 안내해요',
    steps: '3 Steps',
    title: '당신의 마법 주석을 선택하세요!',
    subtitle: '세 개의 주머니 중 마음이 가는 것을 골라봐요 ✨',
    selectedTitle: '좋은 선택! 🎀',
    selectedBody: '주석을 녹이는 마법이 준비되고 있어요...',
  },
  en: {
    wealthPouch: 'Pouch of Wealth',
    wealthDescription: 'Wealth and prosperity',
    lovePouch: 'Pouch of Love',
    loveDescription: 'Love and connection',
    luckPouch: 'Pouch of Luck',
    luckDescription: 'General good fortune',
    avatarAlt: 'Yeoni preparation stage',
    counsel: 'Choose the pouch your heart leans toward. Yeoni will begin today’s fortune reading from there.',
    guidedCasting: 'GUIDED CASTING',
    guidedCopy: 'Yeoni will guide the moment you choose',
    steps: '3 Steps',
    title: 'Choose Your Magical Pouch!',
    subtitle: 'Pick the one your heart reaches for among the three ✨',
    selectedTitle: 'Good choice! 🎀',
    selectedBody: 'The magic inside the pouch is getting ready...',
  },
  ja: {
    wealthPouch: '豊かさの袋',
    wealthDescription: '富と繁栄',
    lovePouch: '愛の袋',
    loveDescription: '愛とご縁',
    luckPouch: '幸運の袋',
    luckDescription: '全体運',
    avatarAlt: 'ヨニ準備段階',
    counsel: '心が惹かれる袋を一つ選んでね。ヨニがそこから今日の運勢相談を始めるよ。',
    guidedCasting: 'GUIDED CASTING',
    guidedCopy: 'ヨニが選ぶ瞬間を一緒に案内します',
    steps: '3 Steps',
    title: 'あなたの魔法の袋を選んでください！',
    subtitle: '三つの袋の中から心が向くものを選んでみましょう ✨',
    selectedTitle: 'いい選択です！🎀',
    selectedBody: '袋の魔法が準備されています...',
  },
  'zh-CN': {
    wealthPouch: '财富锦囊',
    wealthDescription: '财富与丰盛',
    lovePouch: '爱情锦囊',
    loveDescription: '爱情与缘分',
    luckPouch: '好运锦囊',
    luckDescription: '整体好运',
    avatarAlt: 'Yeoni 准备阶段',
    counsel: '选一个心里最有感觉的锦囊吧。Yeoni 会从那里开始今天的运势咨询。',
    guidedCasting: 'GUIDED CASTING',
    guidedCopy: 'Yeoni 会陪你完成选择的瞬间',
    steps: '3 Steps',
    title: '请选择你的魔法锦囊！',
    subtitle: '从三个锦囊中选一个心动的吧 ✨',
    selectedTitle: '很好的选择！🎀',
    selectedBody: '锦囊里的魔法正在准备中...',
  },
  'zh-TW': {
    wealthPouch: '財富錦囊',
    wealthDescription: '財富與豐盛',
    lovePouch: '愛情錦囊',
    loveDescription: '愛情與緣分',
    luckPouch: '好運錦囊',
    luckDescription: '整體好運',
    avatarAlt: 'Yeoni 準備階段',
    counsel: '選一個心裡最有感覺的錦囊吧。Yeoni 會從那裡開始今天的運勢諮詢。',
    guidedCasting: 'GUIDED CASTING',
    guidedCopy: 'Yeoni 會陪你完成選擇的瞬間',
    steps: '3 Steps',
    title: '請選擇你的魔法錦囊！',
    subtitle: '從三個錦囊中選一個心動的吧 ✨',
    selectedTitle: '很好的選擇！🎀',
    selectedBody: '錦囊裡的魔法正在準備中...',
  },
} as const;

function getSikoJenRitualPrepCopy(locale: LoadingLocale) {
  if (locale === 'en' || locale === 'ja' || locale === 'zh-CN' || locale === 'zh-TW') {
    return SIKO_JEN_RITUAL_PREP_TEXT_TRANSLATIONS[locale];
  }
  return SIKO_JEN_RITUAL_PREP_TEXT_TRANSLATIONS.ko;
}

export function PhaseRitualPrep() {
  const { setPhase, selectCategory } = useSikojenpovailuContext();
  const [selectedCategory, setLocalSelectedCategory] = useState<string | null>(null);
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getSikoJenRitualPrepCopy(locale);

  const pouches = [
    {
      id: '금전운',
      icon: '💰',
      label: copy.wealthPouch,
      description: copy.wealthDescription,
      color: 'from-yellow-200 to-yellow-300',
      borderColor: 'border-yellow-400',
    },
    {
      id: '연애운',
      icon: '💕',
      label: copy.lovePouch,
      description: copy.loveDescription,
      color: 'from-pink-200 to-rose-300',
      borderColor: 'border-pink-400',
    },
    {
      id: '행운',
      icon: '🍀',
      label: copy.luckPouch,
      description: copy.luckDescription,
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

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener('cd:locale-ready', syncLocale);
    return () => window.removeEventListener('cd:locale-ready', syncLocale);
  }, []);

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
            alt={copy.avatarAlt}
            ringClassName="from-rose-300 to-pink-300"
            intervalMs={840}
          />
        </div>
        <PigCounselBubble
          className="mt-3 w-72"
          message={copy.counsel}
        />
      </div>

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 max-w-3xl w-full px-6 py-12 mt-96">
        <div className="sikojen-premium-band mb-7 flex items-center justify-between rounded-2xl border border-rose-200/80 bg-white/70 px-4 py-3 shadow-[0_10px_28px_rgba(190,24,93,0.12)] backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-2xl leading-none">🐷</span>
            <div>
              <p className="text-xs font-semibold tracking-wide text-rose-500">{copy.guidedCasting}</p>
              <p className="text-sm font-bold text-rose-700">{copy.guidedCopy}</p>
            </div>
          </div>
          <span className="rounded-full border border-amber-300 bg-amber-100/80 px-2.5 py-1 text-[11px] font-bold text-amber-800">
            {copy.steps}
          </span>
        </div>
        
        {/* 제목 */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-pink-600 mb-3" style={{ fontFamily: "var(--font-playful)" }}>
            {copy.title}
          </h2>
          
          <p className="text-sm md:text-base text-rose-600 font-medium">
            {copy.subtitle}
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
                <h3 className="text-lg font-bold text-rose-700 mb-1" style={{ fontFamily: "var(--font-playful)" }}>
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
            <p className="text-lg font-bold text-rose-600 mb-1" style={{ fontFamily: "var(--font-playful)" }}>
              {copy.selectedTitle}
            </p>
            <p className="text-xs text-rose-500">{copy.selectedBody}</p>
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
