// Sikojen Povailu(핀란드 주석점) 공용 UI 크롬 카피. shapes 데이터(app/oracle/sikojen-povailu/data/shapes)
// 자체는 대상이 아니다 — 20개 형태의 이름/의미/조언/그림자 의미는 콘텐츠 데이터.
// 신규 필드는 en/ja/zh-CN/zh-TW만 채운다 — 나머지 로케일은 getSikojenPovailuCopy()가 EN과 병합해 자동 폴백한다.

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export interface SikojenPovailuCopy {
  pigCounselDefaultTitle: string;
  spriteDefaultAlt: string;
  topNavAriaLabel: string;
  backButtonLabel: string;
  backButtonAriaLabel: string;
  homeButtonLabel: string;

  welcomeSpriteAlt: string;
  welcomeGreeting: string;
  welcomeSubtitle: string;
  welcomeIntroHeading: string;
  welcomeIntroBullet1: string;
  welcomeIntroBullet2: string;
  welcomeIntroBullet3: string;
  welcomeIntroBullet4: string;
  welcomeIntroBullet5: string;
  welcomeCtaButton: string;

  castingAvatarAlt: string;
  castingCounselTitle: string;
  castingCounselMessage: string;
  castingTitle: string;
  castingTinLabel: string;
  castingHint: string;

  shadowAvatarAlt: string;
  shadowCounselTitle: string;
  shadowCounselMessage: string;
  shadowErrorFallback: string;
  shadowTitle: string;
  shadowNarration: string;
  shadowTrueMeaningSuffix: string;
  shadowTrueMeaningTitle: string;
  shadowWhisperHint: string;
  shadowReturnButton: string;
  shadowClosingHint: string;
}

const SIKOJEN_POVAILU_COPY_EN: SikojenPovailuCopy = {
  pigCounselDefaultTitle: "Yeon-i’s Counsel Note",
  spriteDefaultAlt: "flower pig tin oracle image",
  topNavAriaLabel: "Tin oracle navigation",
  backButtonLabel: "Back",
  backButtonAriaLabel: "Go back",
  homeButtonLabel: "Home",
  welcomeSpriteAlt: "Yeon-i sprite",
  welcomeGreeting: "Welcome 🌸",
  welcomeSubtitle:
    "Welcome to the Finnish tin oracle with Yeon-i.\nThe instant molten tin sets on the water, this year's keyword for you appears ✨",
  welcomeIntroHeading: "🇫🇮 SIKOJEN POVAILU — What is the Finnish tin oracle tradition?",
  welcomeIntroBullet1: "A New Year tin-casting divination passed down in Finland for centuries",
  welcomeIntroBullet2: "Molten tin is cast into cold water, reading fate from the shape it hardens into",
  welcomeIntroBullet3: "20 shapes + shadow interpretation reveal both the surface meaning and the hidden message",
  welcomeIntroBullet4: "The Yeon-i sprite character appears differently in each phase, deepening the immersion",
  welcomeIntroBullet5: "Press start and the ritual begins right away — you can leave any time from the buttons at the top",
  welcomeCtaButton: "See my tin oracle",

  castingAvatarAlt: "Yeon-i casting phase",
  castingCounselTitle: "Yeon-i’s Casting Counsel",
  castingCounselMessage: "Just tap the mold once. Watch the shape it sets into, and I'll read the advice you need right away.",
  castingTitle: "🔥 The tin is melting ✨",
  castingTinLabel: "TIN",
  castingHint: "🔮 A tin shape carrying your life's story is about to appear 🔮",

  shadowAvatarAlt: "Yeon-i shadow reading",
  shadowCounselTitle: "Yeon-i’s Shadow Counsel",
  shadowCounselMessage: "Don't hide an uneasy heart — let's look at it together. The shadow reading shows the emotional boundary you need to protect.",
  shadowErrorFallback: "An error occurred.",
  shadowTitle: "🌑 Reading the Soul's Shadow 👁️",
  shadowNarration: "Another fortune is hiding within the shadow...",
  shadowTrueMeaningSuffix: "'s true meaning",
  shadowTrueMeaningTitle: "🌑 True Meaning",
  shadowWhisperHint: "✧ This is what the shape truly whispers ✧",
  shadowReturnButton: "🔥 Back to the warm fireside",
  shadowClosingHint: "You found a hidden truth... will you share this wisdom now?",
};

const SIKOJEN_POVAILU_COPY: Partial<Record<LoadingLocale, SikojenPovailuCopy>> = {
  ko: {
    pigCounselDefaultTitle: "연이의 상담 메모",
    spriteDefaultAlt: "꽃돼지 주석점 이미지",
    topNavAriaLabel: "주석점 화면 이동",
    backButtonLabel: "뒤로",
    backButtonAriaLabel: "이전 페이지로 이동",
    homeButtonLabel: "홈",
    welcomeSpriteAlt: "연이 스프라이트",
    welcomeGreeting: "어서 오세요 🌸",
    welcomeSubtitle:
      "연이와 함께하는 핀란드 주석점에 오신 것을 환영해요.\n녹인 주석이 물 위에서 굳는 찰나, 당신의 올해 키워드가 드러나요 ✨",
    welcomeIntroHeading: "🇫🇮 SIKOJEN POVAILU — 핀란드 전통 주석점이란?",
    welcomeIntroBullet1: "핀란드에서 수백 년 이어온 새해 주석 주조 점술",
    welcomeIntroBullet2: "녹인 주석을 차가운 물에 던져 굳은 형태로 운명을 읽어요",
    welcomeIntroBullet3: "20가지 형태 + 그림자 해석으로 표면 의미와 숨은 메시지를 함께 읽어요",
    welcomeIntroBullet4: "연이 스프라이트 캐릭터가 페이즈마다 다른 모습으로 나타나 몰입감을 높여줘요",
    welcomeIntroBullet5: "시작 버튼을 누르면 바로 의식이 시작돼요. 언제든 위쪽 버튼으로 나갈 수 있어요",
    welcomeCtaButton: "내 주석점 보기",

    castingAvatarAlt: "연이 주조 단계",
    castingCounselTitle: "연이의 주조 상담",
    castingCounselMessage: "틀을 한 번만 톡 눌러줘. 굳는 모양을 보면서 너한테 필요한 조언을 내가 바로 읽어줄게.",
    castingTitle: "🔥 주석이 녹아내려 ✨",
    castingTinLabel: "주석",
    castingHint: "🔮 당신의 인생 이야기를 담은 주석의 형태가 나타날 거예요 🔮",

    shadowAvatarAlt: "연이 그림자 읽기",
    shadowCounselTitle: "연이의 그림자 상담",
    shadowCounselMessage: "불안한 마음은 숨기지 말고 같이 보자. 그림자 해석은 네가 지켜야 할 감정의 경계를 알려줘.",
    shadowErrorFallback: "오류가 발생했습니다.",
    shadowTitle: "🌑 영혼의 그림자 읽기 👁️",
    shadowNarration: "그림자 속에 또 다른 운세가 숨어있어...",
    shadowTrueMeaningSuffix: "의 참된 의미",
    shadowTrueMeaningTitle: "🌑 진짜 의미",
    shadowWhisperHint: "✧ 이것이 형태가 진정으로 속삭이는 것 ✧",
    shadowReturnButton: "🔥 따뜻한 난로로 돌아가기",
    shadowClosingHint: "숨겨진 진실을 발견했어... 이제 이 지혜를 나눠주겠어?",
  },
  ja: {
    pigCounselDefaultTitle: "ヨンの相談メモ",
    spriteDefaultAlt: "花豚の錫占い画像",
    topNavAriaLabel: "錫占い画面の移動",
    backButtonLabel: "戻る",
    backButtonAriaLabel: "前のページに戻る",
    homeButtonLabel: "ホーム",
    welcomeSpriteAlt: "ヨンのスプライト",
    welcomeGreeting: "ようこそ 🌸",
    welcomeSubtitle:
      "ヨンと一緒に楽しむフィンランドの錫占いへようこそ。\n溶けた錫が水面で固まる瞬間、今年のあなたのキーワードが現れます ✨",
    welcomeIntroHeading: "🇫🇮 SIKOJEN POVAILU — フィンランド伝統の錫占いとは？",
    welcomeIntroBullet1: "フィンランドで数百年続く新年の錫鋳造占い",
    welcomeIntroBullet2: "溶かした錫を冷たい水に投げ入れ、固まった形で運命を読みます",
    welcomeIntroBullet3: "20種類の形+影の解釈で、表の意味と隠されたメッセージを一緒に読みます",
    welcomeIntroBullet4: "ヨンのスプライトキャラクターがフェーズごとに異なる姿で現れ、没入感を高めます",
    welcomeIntroBullet5: "スタートボタンを押すとすぐに儀式が始まります。上のボタンでいつでも戻れます",
    welcomeCtaButton: "私の錫占いを見る",

    castingAvatarAlt: "ヨンの鋳造段階",
    castingCounselTitle: "ヨンの鋳造相談",
    castingCounselMessage: "型を一度だけそっと押してね。固まる形を見ながら、必要なアドバイスをすぐに読んであげる。",
    castingTitle: "🔥 錫が溶けていく ✨",
    castingTinLabel: "錫",
    castingHint: "🔮 あなたの人生の物語を宿した錫の形が現れます 🔮",

    shadowAvatarAlt: "ヨンの影読み",
    shadowCounselTitle: "ヨンの影相談",
    shadowCounselMessage: "不安な気持ちは隠さず一緒に見よう。影の解釈は、あなたが守るべき感情の境界を教えてくれるよ。",
    shadowErrorFallback: "エラーが発生しました。",
    shadowTitle: "🌑 魂の影を読む 👁️",
    shadowNarration: "影の中にもう一つの運勢が隠れている...",
    shadowTrueMeaningSuffix: "の本当の意味",
    shadowTrueMeaningTitle: "🌑 本当の意味",
    shadowWhisperHint: "✧ これがこの形が本当にささやいていること ✧",
    shadowReturnButton: "🔥 温かい暖炉へ戻る",
    shadowClosingHint: "隠された真実を見つけたね...この知恵を今、誰かに分けてあげる？",
  },
  "zh-CN": {
    pigCounselDefaultTitle: "Yeoni 的咨询笔记",
    spriteDefaultAlt: "花猪锡占图片",
    topNavAriaLabel: "锡占页面导航",
    backButtonLabel: "返回",
    backButtonAriaLabel: "返回上一页",
    homeButtonLabel: "首页",
    welcomeSpriteAlt: "Yeoni 精灵",
    welcomeGreeting: "欢迎光临 🌸",
    welcomeSubtitle:
      "欢迎和 Yeoni 一起体验芬兰锡占。\n熔化的锡在水面凝固的瞬间,你今年的关键词就会浮现 ✨",
    welcomeIntroHeading: "🇫🇮 SIKOJEN POVAILU — 什么是芬兰传统锡占？",
    welcomeIntroBullet1: "芬兰延续数百年的新年锡铸占卜",
    welcomeIntroBullet2: "将熔化的锡投入冷水,通过凝固的形态解读命运",
    welcomeIntroBullet3: "20 种形态 + 阴影解读,同时读出表面含义与隐藏讯息",
    welcomeIntroBullet4: "Yeoni 精灵角色在每个阶段以不同姿态出现,增添沉浸感",
    welcomeIntroBullet5: "按下开始按钮即可立即开始仪式，随时可用顶部按钮离开",
    welcomeCtaButton: "查看我的锡占结果",

    castingAvatarAlt: "Yeoni 铸造阶段",
    castingCounselTitle: "Yeoni 的铸造咨询",
    castingCounselMessage: "轻轻按一下模具就好。看着凝固的形状,我会马上为你解读需要的建议。",
    castingTitle: "🔥 锡正在熔化 ✨",
    castingTinLabel: "锡",
    castingHint: "🔮 承载你人生故事的锡形态即将出现 🔮",

    shadowAvatarAlt: "Yeoni 阴影解读",
    shadowCounselTitle: "Yeoni 的阴影咨询",
    shadowCounselMessage: "不安的心情不用藏起来,我们一起看看吧。阴影解读会告诉你需要守护的情感边界。",
    shadowErrorFallback: "发生了错误。",
    shadowTitle: "🌑 解读灵魂的阴影 👁️",
    shadowNarration: "阴影中还藏着另一种运势...",
    shadowTrueMeaningSuffix: "的真正含义",
    shadowTrueMeaningTitle: "🌑 真正的含义",
    shadowWhisperHint: "✧ 这才是这个形态真正低语的话 ✧",
    shadowReturnButton: "🔥 回到温暖的炉火旁",
    shadowClosingHint: "你发现了隐藏的真相……现在要把这份智慧分享出去吗？",
  },
  "zh-TW": {
    pigCounselDefaultTitle: "Yeoni 的諮詢筆記",
    spriteDefaultAlt: "花豬錫占圖片",
    topNavAriaLabel: "錫占頁面導航",
    backButtonLabel: "返回",
    backButtonAriaLabel: "返回上一頁",
    homeButtonLabel: "首頁",
    welcomeSpriteAlt: "Yeoni 精靈",
    welcomeGreeting: "歡迎光臨 🌸",
    welcomeSubtitle:
      "歡迎和 Yeoni 一起體驗芬蘭錫占。\n熔化的錫在水面凝固的瞬間,你今年的關鍵字就會浮現 ✨",
    welcomeIntroHeading: "🇫🇮 SIKOJEN POVAILU — 什麼是芬蘭傳統錫占？",
    welcomeIntroBullet1: "芬蘭延續數百年的新年錫鑄占卜",
    welcomeIntroBullet2: "將熔化的錫投入冷水,透過凝固的形態解讀命運",
    welcomeIntroBullet3: "20 種形態 + 陰影解讀,同時讀出表面含義與隱藏訊息",
    welcomeIntroBullet4: "Yeoni 精靈角色在每個階段以不同姿態出現,增添沉浸感",
    welcomeIntroBullet5: "按下開始按鈕即可立即開始儀式，隨時可用頂部按鈕離開",
    welcomeCtaButton: "查看我的錫占結果",

    castingAvatarAlt: "Yeoni 鑄造階段",
    castingCounselTitle: "Yeoni 的鑄造諮詢",
    castingCounselMessage: "輕輕按一下模具就好。看著凝固的形狀,我會馬上為你解讀需要的建議。",
    castingTitle: "🔥 錫正在熔化 ✨",
    castingTinLabel: "錫",
    castingHint: "🔮 承載你人生故事的錫形態即將出現 🔮",

    shadowAvatarAlt: "Yeoni 陰影解讀",
    shadowCounselTitle: "Yeoni 的陰影諮詢",
    shadowCounselMessage: "不安的心情不用藏起來,我們一起看看吧。陰影解讀會告訴你需要守護的情感邊界。",
    shadowErrorFallback: "發生了錯誤。",
    shadowTitle: "🌑 解讀靈魂的陰影 👁️",
    shadowNarration: "陰影中還藏著另一種運勢...",
    shadowTrueMeaningSuffix: "的真正含義",
    shadowTrueMeaningTitle: "🌑 真正的含義",
    shadowWhisperHint: "✧ 這才是這個形態真正低語的話 ✧",
    shadowReturnButton: "🔥 回到溫暖的爐火旁",
    shadowClosingHint: "你發現了隱藏的真相……現在要把這份智慧分享出去嗎？",
  },
  en: SIKOJEN_POVAILU_COPY_EN,
};

export function getSikojenPovailuCopy(locale: LoadingLocale): SikojenPovailuCopy {
  return { ...SIKOJEN_POVAILU_COPY_EN, ...(SIKOJEN_POVAILU_COPY[locale] || {}) };
}

export function useSikojenPovailuCopy(): SikojenPovailuCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    sync();
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  return getSikojenPovailuCopy(locale);
}
