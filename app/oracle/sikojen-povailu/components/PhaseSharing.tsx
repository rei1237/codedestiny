'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { useSikojenpovailuContext } from '../SikojenpovailuContext';
import { YeonSpriteAvatar } from './YeonSpriteAvatar';
import { PigCounselBubble } from './PigCounselBubble';
import { getCurrentLoadingLocale, type LoadingLocale } from '@/constants/loadingMessages';

const BLESSING_MESSAGES = [
  {
    ko: '행운이 항상 너와 함께하길 바라. 그리고 누군가가 슬플 때 이 따뜻한 마법을 나눠줄래?',
    en: 'May luck stay with you always. When someone feels sad, will you share this warm magic?',
    ja: '幸運がいつもあなたと共にありますように。誰かが悲しい日に、この温かな魔法を分けてあげてね。',
    fi: 'Onnea uuteen vuoteen! (새해를 축하해!)',
  },
  {
    ko: '당신의 모든 꿈이 현실이 되고, 매일이 기쁨으로 가득하길 바래.',
    en: 'May all your dreams take root in reality, and may every day be filled with joy.',
    ja: 'あなたのすべての夢が現実になり、毎日が喜びで満ちますように。',
    fi: 'Pysy onnellisena! (행복하게 지내!)',
  },
  {
    ko: '이 순간의 따뜻함을 잊지 말고, 누군가 추운 날에 함께해줄래?',
    en: 'Do not forget the warmth of this moment. Please stay beside someone on a cold day.',
    ja: 'この瞬間の温もりを忘れず、寒い日に誰かのそばにいてあげてね。',
    fi: 'Rakkautta ja lämpöä! (사랑과 따뜻함을!)',
  },
  {
    ko: '당신이 받은 축복을 다른 누군가에게도 나눠줄 수 있길 바라.',
    en: 'May the blessing you received today travel gently to someone else as well.',
    ja: 'あなたが受け取った祝福を、別の誰かにも分けられますように。',
    fi: 'Jakaa iloa kaikille! (모두와 기쁨을 나눠!)',
  },
  {
    ko: '매일의 작은 순간들이 모여 당신의 가장 아름다운 이야기가 되길.',
    en: 'May the small moments of each day gather into your most beautiful story.',
    ja: '毎日の小さな瞬間が集まり、あなたのいちばん美しい物語になりますように。',
    fi: 'Jokainen päivä on ihme! (매일이 기적이길!)',
  },
  {
    ko: '혼자가 아니야. 항상 누군가가 너를 응원하고 있어.',
    en: 'You are not alone. Someone is always quietly cheering for you.',
    ja: 'あなたはひとりではありません。いつも誰かがあなたを応援しています。',
    fi: 'Et ole koskaan yksin! (너는 절대 혼자가 아니야!)',
  },
];

const SIKOJEN_SHARING_TEXT_TRANSLATIONS = {
  ko: {
    shareTitle: "연이의 핀란드 주석점",
    shareResult: (name: string, fi: string) => `✨ 나의 핀란드 주석점 결과: "${name}" (${fi})`,
    shareMeaning: (meaning: string) => `💭 "${meaning}"`,
    shareAdvice: (advice: string) => `🌸 연이의 조언: ${advice}`,
    spriteAlt: "연이 축하 스프라이트",
    title: "행운이 활짝 피었어요! 🌺",
    counselTitle: "연이의 마무리 상담",
    counselMessage: "오늘 받은 메시지를 저장해두면 다음 선택이 훨씬 쉬워져. 공유 버튼으로 마음 친구에게도 복을 나눠줘!",
    category: { wealth: "💰 부의 형태", love: "💕 사랑의 형태", luck: "🍀 행운의 형태" },
    meaning: "✨ 의미",
    advice: "💡 연이의 조언",
    shared: "✅ 공유됨!",
    copied: "📋 복사됨!",
    share: "📤 친구에게 공유",
    save: "💾 카드 저장",
    restart: "🔄 다시 시작",
    home: "🏠 메인 화면으로",
    blessingTitle: "✨ 연이의 축복 ✨",
  },
  en: {
    shareTitle: "Yeoni's Finnish Tin Fortune",
    shareResult: (name: string, fi: string) => `✨ My Finnish tin fortune result: "${name}" (${fi})`,
    shareMeaning: (meaning: string) => `💭 "${meaning}"`,
    shareAdvice: (advice: string) => `🌸 Yeoni's advice: ${advice}`,
    spriteAlt: "Yeoni celebration sprite",
    title: "Luck has bloomed wide open! 🌺",
    counselTitle: "Yeoni's Closing Counsel",
    counselMessage: "Save today's message and your next choice will feel easier. Share the blessing with a kindred friend too.",
    category: { wealth: "💰 Shape of Wealth", love: "💕 Shape of Love", luck: "🍀 Shape of Luck" },
    meaning: "✨ Meaning",
    advice: "💡 Yeoni's Advice",
    shared: "✅ Shared!",
    copied: "📋 Copied!",
    share: "📤 Share with a friend",
    save: "💾 Save card",
    restart: "🔄 Start again",
    home: "🏠 Main screen",
    blessingTitle: "✨ Yeoni's Blessing ✨",
  },
  ja: {
    shareTitle: "ヨニのフィンランド錫占い",
    shareResult: (name: string, fi: string) => `✨ 私のフィンランド錫占い結果: "${name}" (${fi})`,
    shareMeaning: (meaning: string) => `💭 "${meaning}"`,
    shareAdvice: (advice: string) => `🌸 ヨニの助言: ${advice}`,
    spriteAlt: "ヨニのお祝いスプライト",
    title: "幸運がぱっと花開きました！🌺",
    counselTitle: "ヨニの締めくくり相談",
    counselMessage: "今日受け取ったメッセージを保存しておくと、次の選択がずっと楽になります。共有ボタンで心の友にも福を分けてあげてね。",
    category: { wealth: "💰 富の形", love: "💕 愛の形", luck: "🍀 幸運の形" },
    meaning: "✨ 意味",
    advice: "💡 ヨニの助言",
    shared: "✅ 共有しました！",
    copied: "📋 コピーしました！",
    share: "📤 友だちに共有",
    save: "💾 カードを保存",
    restart: "🔄 もう一度始める",
    home: "🏠 メイン画面へ",
    blessingTitle: "✨ ヨニの祝福 ✨",
  },
  "zh-CN": {
    shareTitle: "Yeoni 的芬兰锡占",
    shareResult: (name: string, fi: string) => `✨ 我的芬兰锡占结果:"${name}"(${fi})`,
    shareMeaning: (meaning: string) => `💭 "${meaning}"`,
    shareAdvice: (advice: string) => `🌸 Yeoni 的建议:${advice}`,
    spriteAlt: "Yeoni 庆祝精灵",
    title: "好运盛开了！🌺",
    counselTitle: "Yeoni 的结语咨询",
    counselMessage: "保存今天收到的讯息,下次选择会容易得多。也用分享按钮把福气分给知心朋友吧！",
    category: { wealth: "💰 财富之形", love: "💕 爱情之形", luck: "🍀 好运之形" },
    meaning: "✨ 含义",
    advice: "💡 Yeoni 的建议",
    shared: "✅ 已分享！",
    copied: "📋 已复制！",
    share: "📤 分享给朋友",
    save: "💾 保存卡片",
    restart: "🔄 再来一次",
    home: "🏠 返回主页",
    blessingTitle: "✨ Yeoni 的祝福 ✨",
  },
  "zh-TW": {
    shareTitle: "Yeoni 的芬蘭錫占",
    shareResult: (name: string, fi: string) => `✨ 我的芬蘭錫占結果:"${name}"(${fi})`,
    shareMeaning: (meaning: string) => `💭 "${meaning}"`,
    shareAdvice: (advice: string) => `🌸 Yeoni 的建議:${advice}`,
    spriteAlt: "Yeoni 慶祝精靈",
    title: "好運盛開了！🌺",
    counselTitle: "Yeoni 的結語諮詢",
    counselMessage: "保存今天收到的訊息,下次選擇會容易得多。也用分享按鈕把福氣分給知心朋友吧！",
    category: { wealth: "💰 財富之形", love: "💕 愛情之形", luck: "🍀 好運之形" },
    meaning: "✨ 含義",
    advice: "💡 Yeoni 的建議",
    shared: "✅ 已分享！",
    copied: "📋 已複製！",
    share: "📤 分享給朋友",
    save: "💾 保存卡片",
    restart: "🔄 再來一次",
    home: "🏠 返回主頁",
    blessingTitle: "✨ Yeoni 的祝福 ✨",
  },
} as const;

function getSikojenSharingCopy(locale: LoadingLocale) {
  if (locale === "en" || locale === "ja" || locale === "zh-CN" || locale === "zh-TW") {
    return SIKOJEN_SHARING_TEXT_TRANSLATIONS[locale];
  }
  return SIKOJEN_SHARING_TEXT_TRANSLATIONS.ko;
}

export function PhaseSharing() {
  const { resetGame, selectedShape } = useSikojenpovailuContext();
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const [isCopied, setIsCopied] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [blessingMessage, setBlessingMessage] = useState<{ ko: string; en: string; ja: string; fi: string } | null>(null);
  const copy = getSikojenSharingCopy(locale);

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

  // 컴포넌트 마운트 시 랜덤 축복 메시지 선택
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * BLESSING_MESSAGES.length);
    setBlessingMessage(BLESSING_MESSAGES[randomIndex]);
  }, []);

  const generateShareText = () => {
    if (!selectedShape) return '';
    return [
      copy.shareResult(selectedShape.name_ko, selectedShape.name_fi),
      copy.shareMeaning(selectedShape.meaning_ko),
      copy.shareAdvice(selectedShape.advice_ko),
      "#SikojenpovailuFortune #FinnishTinFortune #Yeoni",
    ].join("\n\n");
  };

  const handleShare = async () => {
    const shareText = generateShareText();
    
    if (navigator.share && navigator.canShare({ text: shareText })) {
      try {
        await navigator.share({
          title: copy.shareTitle,
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
                alt={copy.spriteAlt}
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
        <h2 className="text-3xl md:text-4xl font-bold text-rose-500 text-center" style={{ fontFamily: "var(--font-playful)" }}>
          {copy.title}
        </h2>

        <PigCounselBubble
          className="w-full max-w-md"
          title={copy.counselTitle}
          message={copy.counselMessage}
        />

        {/* 결과 카드 미리보기 */}
        {selectedShape && (
          <div className="w-full max-w-md rounded-2xl border-4 border-pink-300 bg-gradient-to-br from-white via-pink-50 to-rose-50 shadow-2xl p-6">
            
            {/* 카드 헤더 */}
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">{selectedShape.icon}</div>
              <h3 className="text-2xl font-bold text-rose-600 mb-1" style={{ fontFamily: "var(--font-playful)" }}>
                {selectedShape.name_ko}
              </h3>
              <p className="text-sm text-rose-500 italic mb-2">
                {selectedShape.name_fi}
              </p>
              <span className="inline-block bg-gradient-to-r from-pink-200 to-rose-200 text-rose-700 px-3 py-1 rounded-full text-xs font-semibold">
                {selectedShape.category === 'wealth' ? copy.category.wealth : 
                 selectedShape.category === 'love' ? copy.category.love : 
                 copy.category.luck}
              </span>
            </div>

            {/* 카드 구분선 */}
            <div className="h-1 bg-gradient-to-r from-pink-200 via-rose-300 to-pink-200 rounded-full mb-4"></div>

            {/* 의미 */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-rose-600 mb-1">{copy.meaning}</p>
              <p className="text-sm text-amber-900">
                {selectedShape.meaning_ko}
              </p>
              <p className="text-xs text-rose-500 italic mt-1">
                &quot;{selectedShape.meaning_fi}&quot;
              </p>
            </div>

            {/* 조언 */}
            <div className="bg-gradient-to-r from-amber-100/50 to-rose-100/50 rounded-lg border border-rose-200 p-3">
              <p className="text-xs font-bold text-rose-600 mb-1">{copy.advice}</p>
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
              {isShared ? copy.shared : isCopied ? copy.copied : copy.share}
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
              {copy.save}
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
              {copy.restart}
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
            {copy.home}
          </Link>
        </div>

        {/* 연이의 축복 메시지 */}
        <div className="w-full max-w-md rounded-2xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 text-center">
          <p className="text-lg font-bold text-purple-600 mb-3" style={{ fontFamily: "var(--font-playful)" }}>
            {copy.blessingTitle}
          </p>
          <p className="text-sm text-purple-800 leading-relaxed">
            &quot;{blessingMessage?.[locale === 'ko' ? 'ko' : locale === 'ja' ? 'ja' : 'en']}<br/>
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
