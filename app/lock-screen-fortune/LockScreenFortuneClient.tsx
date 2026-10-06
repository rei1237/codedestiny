"use client";

import { useCompanionDaily } from "./use-companion-daily";
import { companionCopy, systemLabel, categoryLabel } from "./companion-copy";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  AFFIRMATION_CATEGORIES,
  getDailyLockScreenContent,
  getDailyLockScreenSequence,
  getKstDateKey,
  type LockScreenCard,
  type LockScreenContent,
} from "@/lib/lock-screen-content";
import {
  DAILY_FORTUNE_SYSTEMS,
  getDailyFortune,
  type DailyFortune,
  type DailyFortuneSystem,
} from "@/lib/lock-screen-daily-fortune";
import { isMobileAppRuntime } from "../_lib/auth-client";
import { getCurrentLoadingLocale, INTL_LOCALE_BY_LOADING_LOCALE, type LoadingLocale } from "@/constants/loadingMessages";

// ── 꽃돼지(연이) 마스코트 — R1: 앱 번들 로컬 '단일 컷' 이미지(오프라인 동작) ──
// (기존 R2 CDN URL은 화면 켜지는 순간 네트워크가 없어 404. flower-pig-5-*는 스프라이트 시트라
//  통짜로 나오던 문제 → 잘라진 단일 캐릭터(꽃돼지-Photoroom·꽃돼지2-Photoroom)를 ASCII로 복사해 사용.)
const PIG_FALLBACK = "/images/fortune-tea-house/flower-pig-single-a.webp";
const PIG_POSES: readonly { key: string; url: string }[] = [
  { key: "yeongnyangi", url: "/assets/yeongnyangi/original/hero-480.webp" },
  { key: "yeoni", url: "/assets/yeongnyangi/companion/yeoni.webp" },
  { key: "pig1", url: "/images/fortune-tea-house/flower-pig-single-a.webp" },
  { key: "pig2", url: "/images/fortune-tea-house/flower-pig-single-b.webp" },
];

const FONT_COLORS: readonly { key: string; hex: string }[] = [
  { key: "white", hex: "#ffffff" },
  { key: "ink", hex: "#20143a" },
  { key: "gold", hex: "#f6e4ad" },
];

const BACKGROUNDS: readonly { key: string; css: string; dark: boolean }[] = [
  { key: "twilight", css: "radial-gradient(circle at 22% 12%,rgba(140,120,255,.5),transparent 46%),radial-gradient(circle at 82% 22%,rgba(37,99,235,.42),transparent 44%),linear-gradient(160deg,#0b1225,#1b1745 58%,#2f0a4f)", dark: true },
  { key: "midnight", css: "radial-gradient(circle at 78% 14%,rgba(196,181,253,.34),transparent 40%),linear-gradient(160deg,#07060f,#13102a 60%,#241a44)", dark: true },
  { key: "rose", css: "radial-gradient(circle at 80% 12%,rgba(244,190,209,.4),transparent 40%),linear-gradient(160deg,#24081a,#3a0e28 58%,#521a3a)", dark: true },
  { key: "lavender", css: "radial-gradient(circle at 80% 12%,rgba(255,255,255,.5),transparent 34%),linear-gradient(160deg,#efe6fb,#cbb6f2 55%,#b79ee8)", dark: false },
  { key: "bluemist", css: "radial-gradient(circle at 78% 14%,rgba(255,255,255,.55),transparent 32%),linear-gradient(160deg,#dcefff,#bcd6f5 55%,#a9c6ef)", dark: false },
  { key: "cream", css: "radial-gradient(circle at 80% 10%,rgba(255,255,255,.6),transparent 34%),linear-gradient(160deg,#fffaf7,#fff2f8 55%,#f4dbe6)", dark: false },
];

const BUTTON_STYLES: readonly { key: string }[] = [
  { key: "glass" },
  { key: "solid" },
  { key: "gold" },
  { key: "neon" },
];

type LockScreenCopy = {
  pigPoseLabel: Record<string, string>;
  fontColorLabel: Record<string, string>;
  backgroundLabel: Record<string, string>;
  buttonStyleLabel: Record<string, string>;
  defaultAlarmLabels: [string, string];
  dismissedGreetingButton: string;
  lockSettingsAriaLabel: string;
  nextSentenceAriaLabel: string;
  todaysFlowerPrefix: string;
  tapNextHint: (current: number, total: number) => string;
  slideToUnlockHint: string;
  slideToUnlockAriaLabel: string;
  profileNudge: string;
  dailyFortuneLoading: string;
  todaysEnergyLabel: string;
  knowledgeLabel: (system: string) => string;
  sheetTitleSettings: string;
  sheetTitleTheme: string;
  sheetTitleAlarms: string;
  sheetTitleReadlist: string;
  closeAriaLabel: string;
  lockScreenOnLabel: string;
  lockScreenOnDesc: string;
  todayReadLabel: string;
  totalReadLabel: string;
  alarmsMenuLabel: string;
  alarmsMenuValue: (onCount: number) => string;
  themeMenuLabel: string;
  themeMenuValue: string;
  readlistMenuLabel: string;
  readlistMenuValue: (count: number) => string;
  changeOnLaunchLabel: string;
  changeOnLaunchDesc: string;
  footerBrandLine: string;
  alarmsHint: string;
  dailyFortuneSystemHeading: string;
  dailyFortuneSystemDesc: string;
  affirmationCatsHeading: string;
  affirmationCatsDesc: string;
  pigCharacterHeading: string;
  buttonTextureHeading: string;
  fontColorHeading: string;
  fontSizeHeading: (percent: number) => string;
  backgroundHeading: string;
  readlistEmpty: string;
};

const LOCK_SCREEN_COPY_EN: LockScreenCopy = {
  pigPoseLabel: { pig1: "Grin", pig2: "Smile" },
  fontColorLabel: { white: "White", ink: "Ink", gold: "Champagne gold" },
  backgroundLabel: { twilight: "Twilight", midnight: "Midnight", rose: "Rose night", lavender: "Lavender ink", bluemist: "Blue mist", cream: "Yeon cream" },
  buttonStyleLabel: { glass: "Glass", solid: "Solid", gold: "Gold", neon: "Neon" },
  defaultAlarmLabels: ["Today's flower", "Feelings counsel"],
  dismissedGreetingButton: "Show the lock screen again",
  lockSettingsAriaLabel: "Lock screen settings",
  nextSentenceAriaLabel: "See the next line",
  todaysFlowerPrefix: "Today's flower",
  tapNextHint: (current, total) => `Tap the screen for the next line (${current}/${total})`,
  slideToUnlockHint: "→ Slide right to unlock",
  slideToUnlockAriaLabel: "Slide to unlock",
  profileNudge: "Register your profile card for readings tailored to you.",
  dailyFortuneLoading: "Preparing today's fortune…",
  todaysEnergyLabel: "Today's energy",
  knowledgeLabel: (system) => `${system} knowledge`,
  sheetTitleSettings: "Settings",
  sheetTitleTheme: "Theme · affirmations · fortune",
  sheetTitleAlarms: "Alarm times",
  sheetTitleReadlist: "Read sentences",
  closeAriaLabel: "Close",
  lockScreenOnLabel: "Turn on lock screen",
  lockScreenOnDesc: "Show today's line on your lock screen whenever it turns on.",
  todayReadLabel: "Read today",
  totalReadLabel: "Total read",
  alarmsMenuLabel: "Alarm times",
  alarmsMenuValue: (onCount) => `${onCount} on`,
  themeMenuLabel: "Theme · affirmation topics · daily fortune",
  themeMenuValue: "Color · background · texture · fortune method",
  readlistMenuLabel: "Read sentences",
  readlistMenuValue: (count) => `${count}`,
  changeOnLaunchLabel: "Change sentence every app launch",
  changeOnLaunchDesc: "Refresh with a new line the next time you open the app.",
  footerBrandLine: "Code Destiny · Lock screen fortune",
  alarmsHint: "We'll notify you with today's line at the times you set. (Notification/exact alarm permission may be required on your device.)",
  dailyFortuneSystemHeading: "Daily fortune method",
  dailyFortuneSystemDesc: "Choose how the first lock screen card reads your daily fortune.",
  affirmationCatsHeading: "Affirmation topics you'd like to hear",
  affirmationCatsDesc: "Today's affirmation comes from the topics you pick. Pick nothing and you'll get a mix of everything.",
  pigCharacterHeading: "Piglet character",
  buttonTextureHeading: "Button texture",
  fontColorHeading: "Text color",
  fontSizeHeading: (percent) => `Text size · ${percent}%`,
  backgroundHeading: "Background",
  readlistEmpty: "No sentences read yet.",
};

const LOCK_SCREEN_COPY: Partial<Record<LoadingLocale, LockScreenCopy>> = {
  ko: {
    pigPoseLabel: { pig1: "방긋", pig2: "생글" },
    fontColorLabel: { white: "화이트", ink: "먹빛", gold: "샴페인 골드" },
    backgroundLabel: { twilight: "트와일라잇", midnight: "미드나잇", rose: "로즈 나이트", lavender: "라벤더 잉크", bluemist: "블루 미스트", cream: "연이 크림" },
    buttonStyleLabel: { glass: "글래스", solid: "솔리드", gold: "골드", neon: "네온" },
    defaultAlarmLabels: ["오늘의 꽃", "감정상담소"],
    dismissedGreetingButton: "잠금화면 다시 보기",
    lockSettingsAriaLabel: "잠금화면 설정",
    nextSentenceAriaLabel: "다음 문장 보기",
    todaysFlowerPrefix: "오늘의 꽃",
    tapNextHint: (current, total) => `화면을 탭하면 다음 이야기 (${current}/${total})`,
    slideToUnlockHint: "→ 오른쪽으로 밀어서 잠금 해제",
    slideToUnlockAriaLabel: "밀어서 잠금 해제",
    profileNudge: "프로필 카드를 등록하면 나에게 맞춰 더 정확해져요.",
    dailyFortuneLoading: "오늘의 운세를 준비하고 있어요…",
    todaysEnergyLabel: "오늘의 기운",
    knowledgeLabel: (system) => `${system} 지식`,
    sheetTitleSettings: "설정",
    sheetTitleTheme: "테마 · 확언 · 운세",
    sheetTitleAlarms: "알림 시간",
    sheetTitleReadlist: "읽은 문장 목록",
    closeAriaLabel: "닫기",
    lockScreenOnLabel: "잠금화면 켜기",
    lockScreenOnDesc: "화면을 켤 때 오늘의 문장을 잠금화면 위에 보여줍니다.",
    todayReadLabel: "오늘 읽음",
    totalReadLabel: "총 읽음",
    alarmsMenuLabel: "알림 시간",
    alarmsMenuValue: (onCount) => `${onCount}개 켜짐`,
    themeMenuLabel: "테마 · 확언 분야 · 오늘의 운세",
    themeMenuValue: "색·배경·질감·점술",
    readlistMenuLabel: "읽은 문장 목록",
    readlistMenuValue: (count) => `${count}개`,
    changeOnLaunchLabel: "앱 켤 때마다 문장 바꾸기",
    changeOnLaunchDesc: "다음 실행 때 새 문장으로 갱신합니다.",
    footerBrandLine: "Code Destiny · 잠금화면 운세",
    alarmsHint: "설정한 시간에 알림으로 오늘의 문장을 전해드립니다. (기기에서 알림·정확한 알람 권한이 필요할 수 있어요.)",
    dailyFortuneSystemHeading: "오늘의 운세 점술",
    dailyFortuneSystemDesc: "잠금화면 첫 카드에서 볼 오늘의 운세 방식을 고르세요.",
    affirmationCatsHeading: "듣고 싶은 확언 분야",
    affirmationCatsDesc: "고른 분야에서 오늘의 확언이 나와요. 아무것도 고르지 않으면 모든 분야에서 골고루 나옵니다.",
    pigCharacterHeading: "꽃돼지 캐릭터",
    buttonTextureHeading: "버튼 질감",
    fontColorHeading: "글자 색상",
    fontSizeHeading: (percent) => `글자 크기 · ${percent}%`,
    backgroundHeading: "배경",
    readlistEmpty: "아직 읽은 문장이 없어요.",
  },
  en: LOCK_SCREEN_COPY_EN,
  ja: {
    pigPoseLabel: { pig1: "にっこり", pig2: "にこにこ" },
    fontColorLabel: { white: "ホワイト", ink: "墨色", gold: "シャンパンゴールド" },
    backgroundLabel: { twilight: "トワイライト", midnight: "ミッドナイト", rose: "ローズナイト", lavender: "ラベンダーインク", bluemist: "ブルーミスト", cream: "ヨンクリーム" },
    buttonStyleLabel: { glass: "グラス", solid: "ソリッド", gold: "ゴールド", neon: "ネオン" },
    defaultAlarmLabels: ["今日のお花", "気持ち相談室"],
    dismissedGreetingButton: "ロック画面をもう一度見る",
    lockSettingsAriaLabel: "ロック画面設定",
    nextSentenceAriaLabel: "次の文章を見る",
    todaysFlowerPrefix: "今日のお花",
    tapNextHint: (current, total) => `画面をタップすると次の話 (${current}/${total})`,
    slideToUnlockHint: "→ 右にスライドしてロック解除",
    slideToUnlockAriaLabel: "スライドしてロック解除",
    profileNudge: "プロフィールカードを登録すると、より正確な内容になります。",
    dailyFortuneLoading: "今日の運勢を準備しています…",
    todaysEnergyLabel: "今日のエネルギー",
    knowledgeLabel: (system) => `${system}の知識`,
    sheetTitleSettings: "設定",
    sheetTitleTheme: "テーマ・アファメーション・運勢",
    sheetTitleAlarms: "通知時間",
    sheetTitleReadlist: "読んだ文章一覧",
    closeAriaLabel: "閉じる",
    lockScreenOnLabel: "ロック画面をオンにする",
    lockScreenOnDesc: "画面をつけたとき、今日の文章をロック画面に表示します。",
    todayReadLabel: "今日読んだ数",
    totalReadLabel: "累計読んだ数",
    alarmsMenuLabel: "通知時間",
    alarmsMenuValue: (onCount) => `${onCount}件オン`,
    themeMenuLabel: "テーマ・アファメーションの分野・今日の運勢",
    themeMenuValue: "色・背景・質感・占術",
    readlistMenuLabel: "読んだ文章一覧",
    readlistMenuValue: (count) => `${count}件`,
    changeOnLaunchLabel: "アプリを開くたびに文章を変える",
    changeOnLaunchDesc: "次回起動時に新しい文章に更新します。",
    footerBrandLine: "Code Destiny · ロック画面占い",
    alarmsHint: "設定した時間に通知で今日の文章をお届けします。(端末の通知・正確なアラーム権限が必要な場合があります。)",
    dailyFortuneSystemHeading: "今日の運勢の占術",
    dailyFortuneSystemDesc: "ロック画面の最初のカードで見る占いの方式を選んでください。",
    affirmationCatsHeading: "聞きたいアファメーションの分野",
    affirmationCatsDesc: "選んだ分野から今日のアファメーションが出ます。何も選ばなければ全分野から満遍なく出ます。",
    pigCharacterHeading: "花豚キャラクター",
    buttonTextureHeading: "ボタンの質感",
    fontColorHeading: "文字の色",
    fontSizeHeading: (percent) => `文字サイズ · ${percent}%`,
    backgroundHeading: "背景",
    readlistEmpty: "まだ読んだ文章がありません。",
  },
  "zh-CN": {
    pigPoseLabel: { pig1: "微笑", pig2: "浅笑" },
    fontColorLabel: { white: "白色", ink: "墨色", gold: "香槟金" },
    backgroundLabel: { twilight: "暮光", midnight: "午夜", rose: "玫瑰之夜", lavender: "薰衣草墨", bluemist: "蓝雾", cream: "妍伊奶油" },
    buttonStyleLabel: { glass: "玻璃", solid: "纯色", gold: "金色", neon: "霓虹" },
    defaultAlarmLabels: ["今日花语", "情感咨询室"],
    dismissedGreetingButton: "再次查看锁屏",
    lockSettingsAriaLabel: "锁屏设置",
    nextSentenceAriaLabel: "查看下一句",
    todaysFlowerPrefix: "今日花语",
    tapNextHint: (current, total) => `点击屏幕查看下一个故事 (${current}/${total})`,
    slideToUnlockHint: "→ 向右滑动解锁",
    slideToUnlockAriaLabel: "滑动解锁",
    profileNudge: "注册个人资料卡后，内容会更贴合您本人。",
    dailyFortuneLoading: "正在准备今日运势…",
    todaysEnergyLabel: "今日能量",
    knowledgeLabel: (system) => `${system}知识`,
    sheetTitleSettings: "设置",
    sheetTitleTheme: "主题·肯定语·运势",
    sheetTitleAlarms: "提醒时间",
    sheetTitleReadlist: "已读句子列表",
    closeAriaLabel: "关闭",
    lockScreenOnLabel: "开启锁屏",
    lockScreenOnDesc: "开屏时在锁屏上显示今日句子。",
    todayReadLabel: "今日已读",
    totalReadLabel: "累计已读",
    alarmsMenuLabel: "提醒时间",
    alarmsMenuValue: (onCount) => `${onCount}个开启`,
    themeMenuLabel: "主题·肯定语分类·今日运势",
    themeMenuValue: "颜色·背景·质感·占卜方式",
    readlistMenuLabel: "已读句子列表",
    readlistMenuValue: (count) => `${count}个`,
    changeOnLaunchLabel: "每次打开应用更换句子",
    changeOnLaunchDesc: "下次启动时更新为新句子。",
    footerBrandLine: "Code Destiny · 锁屏运势",
    alarmsHint: "将在您设置的时间以通知形式送达今日句子。(设备上可能需要通知/精确闹钟权限。)",
    dailyFortuneSystemHeading: "今日运势占卜方式",
    dailyFortuneSystemDesc: "选择锁屏首张卡片显示的今日运势方式。",
    affirmationCatsHeading: "想听的肯定语分类",
    affirmationCatsDesc: "今日的肯定语来自您选择的分类。不选择则从所有分类中均衡出现。",
    pigCharacterHeading: "花猪角色",
    buttonTextureHeading: "按钮质感",
    fontColorHeading: "文字颜色",
    fontSizeHeading: (percent) => `文字大小 · ${percent}%`,
    backgroundHeading: "背景",
    readlistEmpty: "还没有已读的句子。",
  },
  "zh-TW": {
    pigPoseLabel: { pig1: "微笑", pig2: "淺笑" },
    fontColorLabel: { white: "白色", ink: "墨色", gold: "香檳金" },
    backgroundLabel: { twilight: "暮光", midnight: "午夜", rose: "玫瑰之夜", lavender: "薰衣草墨", bluemist: "藍霧", cream: "妍伊奶油" },
    buttonStyleLabel: { glass: "玻璃", solid: "純色", gold: "金色", neon: "霓虹" },
    defaultAlarmLabels: ["今日花語", "情感諮詢室"],
    dismissedGreetingButton: "再次查看鎖定畫面",
    lockSettingsAriaLabel: "鎖定畫面設定",
    nextSentenceAriaLabel: "查看下一句",
    todaysFlowerPrefix: "今日花語",
    tapNextHint: (current, total) => `點擊畫面查看下一個故事 (${current}/${total})`,
    slideToUnlockHint: "→ 向右滑動解鎖",
    slideToUnlockAriaLabel: "滑動解鎖",
    profileNudge: "註冊個人資料卡後，內容會更貼合您本人。",
    dailyFortuneLoading: "正在準備今日運勢…",
    todaysEnergyLabel: "今日能量",
    knowledgeLabel: (system) => `${system}知識`,
    sheetTitleSettings: "設定",
    sheetTitleTheme: "主題·肯定語·運勢",
    sheetTitleAlarms: "提醒時間",
    sheetTitleReadlist: "已讀句子列表",
    closeAriaLabel: "關閉",
    lockScreenOnLabel: "開啟鎖定畫面",
    lockScreenOnDesc: "開屏時在鎖定畫面上顯示今日句子。",
    todayReadLabel: "今日已讀",
    totalReadLabel: "累計已讀",
    alarmsMenuLabel: "提醒時間",
    alarmsMenuValue: (onCount) => `${onCount}個開啟`,
    themeMenuLabel: "主題·肯定語分類·今日運勢",
    themeMenuValue: "顏色·背景·質感·占卜方式",
    readlistMenuLabel: "已讀句子列表",
    readlistMenuValue: (count) => `${count}個`,
    changeOnLaunchLabel: "每次開啟應用程式更換句子",
    changeOnLaunchDesc: "下次啟動時更新為新句子。",
    footerBrandLine: "Code Destiny · 鎖定畫面運勢",
    alarmsHint: "將在您設定的時間以通知形式送達今日句子。(裝置上可能需要通知/精確鬧鐘權限。)",
    dailyFortuneSystemHeading: "今日運勢占卜方式",
    dailyFortuneSystemDesc: "選擇鎖定畫面首張卡片顯示的今日運勢方式。",
    affirmationCatsHeading: "想聽的肯定語分類",
    affirmationCatsDesc: "今日的肯定語來自您選擇的分類。不選擇則從所有分類中均衡出現。",
    pigCharacterHeading: "花豬角色",
    buttonTextureHeading: "按鈕質感",
    fontColorHeading: "文字顏色",
    fontSizeHeading: (percent) => `文字大小 · ${percent}%`,
    backgroundHeading: "背景",
    readlistEmpty: "還沒有已讀的句子。",
  },
  vi: {
    pigPoseLabel: { pig1: "Cười tươi", pig2: "Cười mỉm" },
    fontColorLabel: { white: "Trắng", ink: "Mực đen", gold: "Vàng champagne" },
    backgroundLabel: { twilight: "Hoàng hôn", midnight: "Nửa đêm", rose: "Đêm hồng", lavender: "Mực oải hương", bluemist: "Sương xanh", cream: "Kem Yeon" },
    buttonStyleLabel: { glass: "Kính mờ", solid: "Đặc", gold: "Vàng", neon: "Neon" },
    defaultAlarmLabels: ["Hoa hôm nay", "Phòng tư vấn cảm xúc"],
    dismissedGreetingButton: "Xem lại màn hình khóa",
    lockSettingsAriaLabel: "Cài đặt màn hình khóa",
    nextSentenceAriaLabel: "Xem câu tiếp theo",
    todaysFlowerPrefix: "Hoa hôm nay",
    tapNextHint: (current, total) => `Chạm màn hình để xem câu tiếp theo (${current}/${total})`,
    slideToUnlockHint: "→ Vuốt sang phải để mở khóa",
    slideToUnlockAriaLabel: "Vuốt để mở khóa",
    profileNudge: "Đăng ký thẻ hồ sơ để có kết quả chính xác hơn dành riêng cho bạn.",
    dailyFortuneLoading: "Đang chuẩn bị vận mệnh hôm nay…",
    todaysEnergyLabel: "Năng lượng hôm nay",
    knowledgeLabel: (system) => `Kiến thức ${system}`,
    sheetTitleSettings: "Cài đặt",
    sheetTitleTheme: "Chủ đề · lời khẳng định · vận mệnh",
    sheetTitleAlarms: "Giờ báo thức",
    sheetTitleReadlist: "Danh sách câu đã đọc",
    closeAriaLabel: "Đóng",
    lockScreenOnLabel: "Bật màn hình khóa",
    lockScreenOnDesc: "Hiển thị câu của hôm nay trên màn hình khóa mỗi khi bật màn hình.",
    todayReadLabel: "Đã đọc hôm nay",
    totalReadLabel: "Tổng đã đọc",
    alarmsMenuLabel: "Giờ báo thức",
    alarmsMenuValue: (onCount) => `${onCount} đang bật`,
    themeMenuLabel: "Chủ đề · lĩnh vực khẳng định · vận mệnh hôm nay",
    themeMenuValue: "Màu · nền · chất liệu · phương pháp xem vận mệnh",
    readlistMenuLabel: "Danh sách câu đã đọc",
    readlistMenuValue: (count) => `${count}`,
    changeOnLaunchLabel: "Đổi câu mỗi lần mở ứng dụng",
    changeOnLaunchDesc: "Làm mới bằng câu mới vào lần chạy tiếp theo.",
    footerBrandLine: "Code Destiny · Vận mệnh màn hình khóa",
    alarmsHint: "Chúng tôi sẽ gửi câu của hôm nay bằng thông báo vào giờ bạn đặt. (Có thể cần quyền thông báo/báo thức chính xác trên thiết bị.)",
    dailyFortuneSystemHeading: "Phương pháp xem vận mệnh hôm nay",
    dailyFortuneSystemDesc: "Chọn cách xem vận mệnh hôm nay sẽ hiển thị ở thẻ đầu tiên trên màn hình khóa.",
    affirmationCatsHeading: "Lĩnh vực lời khẳng định bạn muốn nghe",
    affirmationCatsDesc: "Lời khẳng định hôm nay sẽ đến từ lĩnh vực bạn chọn. Nếu không chọn gì, sẽ ra đều từ tất cả lĩnh vực.",
    pigCharacterHeading: "Nhân vật heo con",
    buttonTextureHeading: "Chất liệu nút",
    fontColorHeading: "Màu chữ",
    fontSizeHeading: (percent) => `Cỡ chữ · ${percent}%`,
    backgroundHeading: "Nền",
    readlistEmpty: "Chưa có câu nào được đọc.",
  },
  hi: {
    pigPoseLabel: { pig1: "मुस्कान", pig2: "हल्की मुस्कान" },
    fontColorLabel: { white: "सफ़ेद", ink: "स्याही", gold: "शैंपेन गोल्ड" },
    backgroundLabel: { twilight: "ट्वाइलाइट", midnight: "मिडनाइट", rose: "रोज़ नाइट", lavender: "लैवेंडर इंक", bluemist: "ब्लू मिस्ट", cream: "योन क्रीम" },
    buttonStyleLabel: { glass: "ग्लास", solid: "सॉलिड", gold: "गोल्ड", neon: "नियॉन" },
    defaultAlarmLabels: ["आज का फूल", "भावना परामर्श"],
    dismissedGreetingButton: "लॉक स्क्रीन फिर से देखें",
    lockSettingsAriaLabel: "लॉक स्क्रीन सेटिंग्स",
    nextSentenceAriaLabel: "अगला वाक्य देखें",
    todaysFlowerPrefix: "आज का फूल",
    tapNextHint: (current, total) => `स्क्रीन टैप करने पर अगली कहानी (${current}/${total})`,
    slideToUnlockHint: "→ अनलॉक करने के लिए दाईं ओर स्लाइड करें",
    slideToUnlockAriaLabel: "अनलॉक करने के लिए स्लाइड करें",
    profileNudge: "अपना प्रोफ़ाइल कार्ड पंजीकृत करें ताकि आपके लिए अधिक सटीक परिणाम मिलें।",
    dailyFortuneLoading: "आज की किस्मत तैयार की जा रही है…",
    todaysEnergyLabel: "आज की ऊर्जा",
    knowledgeLabel: (system) => `${system} ज्ञान`,
    sheetTitleSettings: "सेटिंग्स",
    sheetTitleTheme: "थीम · पुष्टिकरण · किस्मत",
    sheetTitleAlarms: "अलार्म समय",
    sheetTitleReadlist: "पढ़े गए वाक्यों की सूची",
    closeAriaLabel: "बंद करें",
    lockScreenOnLabel: "लॉक स्क्रीन चालू करें",
    lockScreenOnDesc: "स्क्रीन ऑन होने पर आज का वाक्य लॉक स्क्रीन पर दिखाएं।",
    todayReadLabel: "आज पढ़े गए",
    totalReadLabel: "कुल पढ़े गए",
    alarmsMenuLabel: "अलार्म समय",
    alarmsMenuValue: (onCount) => `${onCount} चालू`,
    themeMenuLabel: "थीम · पुष्टिकरण क्षेत्र · आज की किस्मत",
    themeMenuValue: "रंग · पृष्ठभूमि · बनावट · ज्योतिष विधि",
    readlistMenuLabel: "पढ़े गए वाक्यों की सूची",
    readlistMenuValue: (count) => `${count}`,
    changeOnLaunchLabel: "हर बार ऐप खोलने पर वाक्य बदलें",
    changeOnLaunchDesc: "अगली बार शुरू होने पर नए वाक्य से अपडेट करें।",
    footerBrandLine: "Code Destiny · लॉक स्क्रीन किस्मत",
    alarmsHint: "आपके तय समय पर सूचना के ज़रिए आज का वाक्य भेजा जाएगा। (डिवाइस पर सूचना/सटीक अलार्म अनुमति आवश्यक हो सकती है।)",
    dailyFortuneSystemHeading: "आज की किस्मत की ज्योतिष विधि",
    dailyFortuneSystemDesc: "लॉक स्क्रीन के पहले कार्ड में दिखने वाली आज की किस्मत की विधि चुनें।",
    affirmationCatsHeading: "जिन क्षेत्रों की पुष्टि आप सुनना चाहते हैं",
    affirmationCatsDesc: "आज की पुष्टि आपके चुने गए क्षेत्रों से आएगी। कुछ न चुनने पर सभी क्षेत्रों से समान रूप से आएगी।",
    pigCharacterHeading: "पिगलेट किरदार",
    buttonTextureHeading: "बटन बनावट",
    fontColorHeading: "टेक्स्ट रंग",
    fontSizeHeading: (percent) => `टेक्स्ट आकार · ${percent}%`,
    backgroundHeading: "पृष्ठभूमि",
    readlistEmpty: "अभी तक कोई वाक्य नहीं पढ़ा गया।",
  },
  es: {
    pigPoseLabel: { pig1: "Sonrisa amplia", pig2: "Sonrisa suave" },
    fontColorLabel: { white: "Blanco", ink: "Tinta", gold: "Oro champán" },
    backgroundLabel: { twilight: "Crepúsculo", midnight: "Medianoche", rose: "Noche rosa", lavender: "Tinta lavanda", bluemist: "Bruma azul", cream: "Crema Yeon" },
    buttonStyleLabel: { glass: "Cristal", solid: "Sólido", gold: "Oro", neon: "Neón" },
    defaultAlarmLabels: ["Flor de hoy", "Consulta de sentimientos"],
    dismissedGreetingButton: "Ver de nuevo la pantalla de bloqueo",
    lockSettingsAriaLabel: "Ajustes de pantalla de bloqueo",
    nextSentenceAriaLabel: "Ver la siguiente frase",
    todaysFlowerPrefix: "Flor de hoy",
    tapNextHint: (current, total) => `Toca la pantalla para la siguiente historia (${current}/${total})`,
    slideToUnlockHint: "→ Desliza a la derecha para desbloquear",
    slideToUnlockAriaLabel: "Desliza para desbloquear",
    profileNudge: "Registra tu tarjeta de perfil para resultados más precisos y personalizados.",
    dailyFortuneLoading: "Preparando tu fortuna de hoy…",
    todaysEnergyLabel: "Energía de hoy",
    knowledgeLabel: (system) => `Conocimiento de ${system}`,
    sheetTitleSettings: "Ajustes",
    sheetTitleTheme: "Tema · afirmaciones · fortuna",
    sheetTitleAlarms: "Horarios de alarma",
    sheetTitleReadlist: "Frases leídas",
    closeAriaLabel: "Cerrar",
    lockScreenOnLabel: "Activar pantalla de bloqueo",
    lockScreenOnDesc: "Muestra la frase de hoy en tu pantalla de bloqueo cada vez que se enciende.",
    todayReadLabel: "Leídas hoy",
    totalReadLabel: "Total leídas",
    alarmsMenuLabel: "Horarios de alarma",
    alarmsMenuValue: (onCount) => `${onCount} activas`,
    themeMenuLabel: "Tema · categorías de afirmación · fortuna diaria",
    themeMenuValue: "Color · fondo · textura · método de fortuna",
    readlistMenuLabel: "Frases leídas",
    readlistMenuValue: (count) => `${count}`,
    changeOnLaunchLabel: "Cambiar la frase cada vez que abras la app",
    changeOnLaunchDesc: "Se actualizará con una nueva frase la próxima vez que abras la app.",
    footerBrandLine: "Code Destiny · Fortuna en pantalla de bloqueo",
    alarmsHint: "Te enviaremos la frase de hoy mediante notificación a la hora que elijas. (Puede requerir permiso de notificaciones/alarma exacta en tu dispositivo.)",
    dailyFortuneSystemHeading: "Método de fortuna diaria",
    dailyFortuneSystemDesc: "Elige cómo quieres ver tu fortuna diaria en la primera tarjeta de la pantalla de bloqueo.",
    affirmationCatsHeading: "Categorías de afirmación que te gustaría escuchar",
    affirmationCatsDesc: "La afirmación de hoy vendrá de las categorías que elijas. Si no eliges ninguna, saldrán de forma equilibrada entre todas.",
    pigCharacterHeading: "Personaje del cerdito",
    buttonTextureHeading: "Textura del botón",
    fontColorHeading: "Color del texto",
    fontSizeHeading: (percent) => `Tamaño de texto · ${percent}%`,
    backgroundHeading: "Fondo",
    readlistEmpty: "Aún no has leído ninguna frase.",
  },
  fr: {
    pigPoseLabel: { pig1: "Grand sourire", pig2: "Sourire doux" },
    fontColorLabel: { white: "Blanc", ink: "Encre", gold: "Or champagne" },
    backgroundLabel: { twilight: "Crépuscule", midnight: "Minuit", rose: "Nuit rose", lavender: "Encre lavande", bluemist: "Brume bleue", cream: "Crème Yeon" },
    buttonStyleLabel: { glass: "Verre", solid: "Uni", gold: "Or", neon: "Néon" },
    defaultAlarmLabels: ["Fleur du jour", "Conseil sentimental"],
    dismissedGreetingButton: "Revoir l'écran de verrouillage",
    lockSettingsAriaLabel: "Paramètres de l'écran de verrouillage",
    nextSentenceAriaLabel: "Voir la phrase suivante",
    todaysFlowerPrefix: "Fleur du jour",
    tapNextHint: (current, total) => `Touchez l'écran pour l'histoire suivante (${current}/${total})`,
    slideToUnlockHint: "→ Glissez vers la droite pour déverrouiller",
    slideToUnlockAriaLabel: "Glisser pour déverrouiller",
    profileNudge: "Enregistrez votre fiche de profil pour des résultats plus précis, adaptés à vous.",
    dailyFortuneLoading: "Préparation de votre horoscope du jour…",
    todaysEnergyLabel: "Énergie du jour",
    knowledgeLabel: (system) => `Connaissance ${system}`,
    sheetTitleSettings: "Paramètres",
    sheetTitleTheme: "Thème · affirmations · horoscope",
    sheetTitleAlarms: "Heures d'alarme",
    sheetTitleReadlist: "Phrases lues",
    closeAriaLabel: "Fermer",
    lockScreenOnLabel: "Activer l'écran de verrouillage",
    lockScreenOnDesc: "Affiche la phrase du jour sur votre écran de verrouillage à chaque allumage.",
    todayReadLabel: "Lues aujourd'hui",
    totalReadLabel: "Total lu",
    alarmsMenuLabel: "Heures d'alarme",
    alarmsMenuValue: (onCount) => `${onCount} activée(s)`,
    themeMenuLabel: "Thème · catégories d'affirmation · horoscope du jour",
    themeMenuValue: "Couleur · fond · texture · méthode de divination",
    readlistMenuLabel: "Phrases lues",
    readlistMenuValue: (count) => `${count}`,
    changeOnLaunchLabel: "Changer de phrase à chaque ouverture de l'appli",
    changeOnLaunchDesc: "Se met à jour avec une nouvelle phrase au prochain lancement.",
    footerBrandLine: "Code Destiny · Horoscope de l'écran verrouillé",
    alarmsHint: "Nous vous enverrons la phrase du jour par notification aux heures que vous avez définies. (Une autorisation de notification/alarme précise peut être requise sur votre appareil.)",
    dailyFortuneSystemHeading: "Méthode de l'horoscope du jour",
    dailyFortuneSystemDesc: "Choisissez comment lire votre horoscope du jour sur la première carte de l'écran de verrouillage.",
    affirmationCatsHeading: "Catégories d'affirmation que vous souhaitez entendre",
    affirmationCatsDesc: "L'affirmation du jour proviendra des catégories que vous choisissez. Si vous n'en choisissez aucune, elles proviendront de toutes les catégories de façon équilibrée.",
    pigCharacterHeading: "Personnage cochonnet",
    buttonTextureHeading: "Texture des boutons",
    fontColorHeading: "Couleur du texte",
    fontSizeHeading: (percent) => `Taille du texte · ${percent}%`,
    backgroundHeading: "Fond",
    readlistEmpty: "Aucune phrase lue pour le moment.",
  },
  de: {
    pigPoseLabel: { pig1: "Breites Lächeln", pig2: "Sanftes Lächeln" },
    fontColorLabel: { white: "Weiß", ink: "Tinte", gold: "Champagnergold" },
    backgroundLabel: { twilight: "Dämmerung", midnight: "Mitternacht", rose: "Rosennacht", lavender: "Lavendeltinte", bluemist: "Blauer Nebel", cream: "Yeon-Creme" },
    buttonStyleLabel: { glass: "Glas", solid: "Einfarbig", gold: "Gold", neon: "Neon" },
    defaultAlarmLabels: ["Blume des Tages", "Gefühlsberatung"],
    dismissedGreetingButton: "Sperrbildschirm erneut anzeigen",
    lockSettingsAriaLabel: "Sperrbildschirm-Einstellungen",
    nextSentenceAriaLabel: "Nächsten Satz ansehen",
    todaysFlowerPrefix: "Blume des Tages",
    tapNextHint: (current, total) => `Bildschirm tippen für die nächste Geschichte (${current}/${total})`,
    slideToUnlockHint: "→ Nach rechts wischen zum Entsperren",
    slideToUnlockAriaLabel: "Zum Entsperren wischen",
    profileNudge: "Registrieren Sie Ihre Profilkarte für genauere, auf Sie zugeschnittene Ergebnisse.",
    dailyFortuneLoading: "Ihr heutiges Horoskop wird vorbereitet…",
    todaysEnergyLabel: "Energie des Tages",
    knowledgeLabel: (system) => `${system}-Wissen`,
    sheetTitleSettings: "Einstellungen",
    sheetTitleTheme: "Design · Affirmationen · Horoskop",
    sheetTitleAlarms: "Alarmzeiten",
    sheetTitleReadlist: "Gelesene Sätze",
    closeAriaLabel: "Schließen",
    lockScreenOnLabel: "Sperrbildschirm aktivieren",
    lockScreenOnDesc: "Zeigt den heutigen Satz jedes Mal an, wenn der Bildschirm eingeschaltet wird.",
    todayReadLabel: "Heute gelesen",
    totalReadLabel: "Insgesamt gelesen",
    alarmsMenuLabel: "Alarmzeiten",
    alarmsMenuValue: (onCount) => `${onCount} aktiv`,
    themeMenuLabel: "Design · Affirmationsbereiche · heutiges Horoskop",
    themeMenuValue: "Farbe · Hintergrund · Textur · Wahrsagemethode",
    readlistMenuLabel: "Gelesene Sätze",
    readlistMenuValue: (count) => `${count}`,
    changeOnLaunchLabel: "Satz bei jedem App-Start ändern",
    changeOnLaunchDesc: "Aktualisiert beim nächsten Start mit einem neuen Satz.",
    footerBrandLine: "Code Destiny · Sperrbildschirm-Horoskop",
    alarmsHint: "Wir senden Ihnen den heutigen Satz per Benachrichtigung zu den von Ihnen festgelegten Zeiten. (Benachrichtigungs-/Weckerberechtigung auf dem Gerät kann erforderlich sein.)",
    dailyFortuneSystemHeading: "Methode für das heutige Horoskop",
    dailyFortuneSystemDesc: "Wählen Sie, wie Ihr heutiges Horoskop auf der ersten Karte des Sperrbildschirms gelesen wird.",
    affirmationCatsHeading: "Affirmationsbereiche, die Sie hören möchten",
    affirmationCatsDesc: "Die heutige Affirmation stammt aus den von Ihnen gewählten Bereichen. Wählen Sie nichts aus, kommen sie gleichmäßig aus allen Bereichen.",
    pigCharacterHeading: "Ferkel-Charakter",
    buttonTextureHeading: "Schaltflächentextur",
    fontColorHeading: "Textfarbe",
    fontSizeHeading: (percent) => `Textgröße · ${percent}%`,
    backgroundHeading: "Hintergrund",
    readlistEmpty: "Noch keine Sätze gelesen.",
  },
  nl: {
    pigPoseLabel: { pig1: "Brede glimlach", pig2: "Zachte glimlach" },
    fontColorLabel: { white: "Wit", ink: "Inkt", gold: "Champagnegoud" },
    backgroundLabel: { twilight: "Schemering", midnight: "Middernacht", rose: "Roze nacht", lavender: "Lavendelinkt", bluemist: "Blauwe nevel", cream: "Yeon-crème" },
    buttonStyleLabel: { glass: "Glas", solid: "Effen", gold: "Goud", neon: "Neon" },
    defaultAlarmLabels: ["Bloem van vandaag", "Gevoelsadvies"],
    dismissedGreetingButton: "Vergrendelscherm opnieuw bekijken",
    lockSettingsAriaLabel: "Vergrendelscherm-instellingen",
    nextSentenceAriaLabel: "Volgende zin bekijken",
    todaysFlowerPrefix: "Bloem van vandaag",
    tapNextHint: (current, total) => `Tik op het scherm voor het volgende verhaal (${current}/${total})`,
    slideToUnlockHint: "→ Veeg naar rechts om te ontgrendelen",
    slideToUnlockAriaLabel: "Veeg om te ontgrendelen",
    profileNudge: "Registreer je profielkaart voor resultaten die beter bij jou passen.",
    dailyFortuneLoading: "Je fortuin van vandaag wordt voorbereid…",
    todaysEnergyLabel: "Energie van vandaag",
    knowledgeLabel: (system) => `${system}-kennis`,
    sheetTitleSettings: "Instellingen",
    sheetTitleTheme: "Thema · affirmaties · fortuin",
    sheetTitleAlarms: "Alarmtijden",
    sheetTitleReadlist: "Gelezen zinnen",
    closeAriaLabel: "Sluiten",
    lockScreenOnLabel: "Vergrendelscherm inschakelen",
    lockScreenOnDesc: "Toont de zin van vandaag op je vergrendelscherm elke keer dat het scherm aangaat.",
    todayReadLabel: "Vandaag gelezen",
    totalReadLabel: "Totaal gelezen",
    alarmsMenuLabel: "Alarmtijden",
    alarmsMenuValue: (onCount) => `${onCount} aan`,
    themeMenuLabel: "Thema · affirmatiecategorieën · dagelijks fortuin",
    themeMenuValue: "Kleur · achtergrond · textuur · voorspelmethode",
    readlistMenuLabel: "Gelezen zinnen",
    readlistMenuValue: (count) => `${count}`,
    changeOnLaunchLabel: "Zin bij elke app-start wijzigen",
    changeOnLaunchDesc: "Wordt bij de volgende start bijgewerkt met een nieuwe zin.",
    footerBrandLine: "Code Destiny · Vergrendelscherm-fortuin",
    alarmsHint: "We sturen je de zin van vandaag via een melding op de tijden die je instelt. (Melding-/exacte alarmtoestemming kan vereist zijn op je apparaat.)",
    dailyFortuneSystemHeading: "Methode voor dagelijks fortuin",
    dailyFortuneSystemDesc: "Kies hoe je dagelijkse fortuin wordt getoond op de eerste kaart van het vergrendelscherm.",
    affirmationCatsHeading: "Affirmatiecategorieën die je wilt horen",
    affirmationCatsDesc: "De affirmatie van vandaag komt uit de categorieën die je kiest. Kies je niets, dan komen ze gelijkmatig uit alle categorieën.",
    pigCharacterHeading: "Biggetje-personage",
    buttonTextureHeading: "Knoptextuur",
    fontColorHeading: "Tekstkleur",
    fontSizeHeading: (percent) => `Tekstgrootte · ${percent}%`,
    backgroundHeading: "Achtergrond",
    readlistEmpty: "Nog geen zinnen gelezen.",
  },
  ms: {
    pigPoseLabel: { pig1: "Senyum lebar", pig2: "Senyum manis" },
    fontColorLabel: { white: "Putih", ink: "Dakwat", gold: "Emas champagne" },
    backgroundLabel: { twilight: "Senja", midnight: "Tengah malam", rose: "Malam mawar", lavender: "Dakwat lavender", bluemist: "Kabus biru", cream: "Krim Yeon" },
    buttonStyleLabel: { glass: "Kaca", solid: "Pejal", gold: "Emas", neon: "Neon" },
    defaultAlarmLabels: ["Bunga hari ini", "Kaunseling perasaan"],
    dismissedGreetingButton: "Lihat semula skrin kunci",
    lockSettingsAriaLabel: "Tetapan skrin kunci",
    nextSentenceAriaLabel: "Lihat ayat seterusnya",
    todaysFlowerPrefix: "Bunga hari ini",
    tapNextHint: (current, total) => `Ketik skrin untuk cerita seterusnya (${current}/${total})`,
    slideToUnlockHint: "→ Leret ke kanan untuk buka kunci",
    slideToUnlockAriaLabel: "Leret untuk buka kunci",
    profileNudge: "Daftarkan kad profil anda untuk hasil yang lebih tepat dan disesuaikan.",
    dailyFortuneLoading: "Sedang menyediakan tuah hari ini…",
    todaysEnergyLabel: "Tenaga hari ini",
    knowledgeLabel: (system) => `Pengetahuan ${system}`,
    sheetTitleSettings: "Tetapan",
    sheetTitleTheme: "Tema · afirmasi · tuah",
    sheetTitleAlarms: "Masa penggera",
    sheetTitleReadlist: "Senarai ayat yang dibaca",
    closeAriaLabel: "Tutup",
    lockScreenOnLabel: "Hidupkan skrin kunci",
    lockScreenOnDesc: "Papar ayat hari ini pada skrin kunci setiap kali skrin dihidupkan.",
    todayReadLabel: "Dibaca hari ini",
    totalReadLabel: "Jumlah dibaca",
    alarmsMenuLabel: "Masa penggera",
    alarmsMenuValue: (onCount) => `${onCount} hidup`,
    themeMenuLabel: "Tema · kategori afirmasi · tuah harian",
    themeMenuValue: "Warna · latar belakang · tekstur · kaedah tilikan",
    readlistMenuLabel: "Senarai ayat yang dibaca",
    readlistMenuValue: (count) => `${count}`,
    changeOnLaunchLabel: "Tukar ayat setiap kali membuka aplikasi",
    changeOnLaunchDesc: "Kemas kini dengan ayat baharu pada permulaan seterusnya.",
    footerBrandLine: "Code Destiny · Tuah skrin kunci",
    alarmsHint: "Kami akan menghantar ayat hari ini melalui pemberitahuan pada masa yang anda tetapkan. (Kebenaran pemberitahuan/penggera tepat mungkin diperlukan pada peranti anda.)",
    dailyFortuneSystemHeading: "Kaedah tuah harian",
    dailyFortuneSystemDesc: "Pilih cara kad pertama skrin kunci memaparkan tuah harian anda.",
    affirmationCatsHeading: "Kategori afirmasi yang anda ingin dengar",
    affirmationCatsDesc: "Afirmasi hari ini datang daripada kategori yang anda pilih. Jika tiada dipilih, ia akan keluar secara seimbang daripada semua kategori.",
    pigCharacterHeading: "Watak anak babi",
    buttonTextureHeading: "Tekstur butang",
    fontColorHeading: "Warna teks",
    fontSizeHeading: (percent) => `Saiz teks · ${percent}%`,
    backgroundHeading: "Latar belakang",
    readlistEmpty: "Belum ada ayat yang dibaca.",
  },
};

function getLockScreenCopy(locale: LoadingLocale): LockScreenCopy {
  return LOCK_SCREEN_COPY[locale] || LOCK_SCREEN_COPY_EN;
}

function useLockScreenCopy(): LockScreenCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  return getLockScreenCopy(locale);
}

function pillStyle(key: string, dark: boolean): CSSProperties {
  switch (key) {
    case "solid":
      return { background: dark ? "rgba(196,181,253,.92)" : "rgba(124,58,237,.94)", color: dark ? "#1a1230" : "#fff", border: "1px solid rgba(196,181,253,.5)" };
    case "gold":
      return { background: "linear-gradient(135deg,#f6e4ad,#e8c977)", color: "#3a2a10", border: "1px solid rgba(246,228,173,.75)", boxShadow: "0 8px 26px -10px rgba(232,201,119,.7)" };
    case "neon":
      return { background: "rgba(8,10,26,.5)", color: "#c4f5ff", border: "1.5px solid #67e8f9", boxShadow: "0 0 20px rgba(103,232,249,.5),inset 0 0 12px rgba(103,232,249,.2)" };
    case "glass":
    default:
      return { background: dark ? "rgba(255,255,255,.17)" : "rgba(20,16,40,.14)", color: dark ? "#fff" : "#20143a", border: "1px solid rgba(255,255,255,.25)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" };
  }
}

// ── 설정/상태 타입 ─────────────────────────────────────────────
interface AlarmSlot { on: boolean; time: string; label: string }
interface LockPrefs {
  enabled: boolean;
  fontColorKey: string;
  fontScale: number;
  backgroundKey: string;
  buttonStyleKey: string;
  pigPoseKey: string;
  changeOnLaunch: boolean;
  affirmationCats: string[]; // 듣고 싶은 확언 분야(비어 있으면 전체)
  dailyFortuneSystem: DailyFortuneSystem; // 오늘의 운세 점술 선택
  alarms: AlarmSlot[];
  quoteEnabled: boolean;
  dailyEnabled: boolean;
  affirmationEnabled: boolean;
  quietEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  locale: string;
}
interface LockStats { todayKey: string; todayRead: number; totalRead: number }
interface ReadItem { dateKey: string; text: string; at: number }
interface LockState { prefs: LockPrefs; stats: LockStats; read: ReadItem[] }

function buildDefaultState(copy: LockScreenCopy): LockState {
  return {
    prefs: {
      enabled: false,
      quoteEnabled: true, dailyEnabled: true, affirmationEnabled: true,
      quietEnabled: true, quietStart: "22:00", quietEnd: "07:00", locale: getCurrentLoadingLocale(),
      fontColorKey: "white",
      fontScale: 1,
      backgroundKey: "twilight",
      buttonStyleKey: "glass",
      pigPoseKey: "yeongnyangi",
      changeOnLaunch: true,
      affirmationCats: [],
      dailyFortuneSystem: "sukuyo",
      alarms: [
        { on: true, time: "09:00", label: copy.defaultAlarmLabels[0] },
        { on: true, time: "15:00", label: copy.defaultAlarmLabels[1] },
      ],
    },
    stats: { todayKey: "", todayRead: 0, totalRead: 0 },
    read: [],
  };
}

const STORAGE_KEY = "cd_lockscreen_state_v1";
const DAILY_SYSTEM_KEYS = DAILY_FORTUNE_SYSTEMS.map((s) => s.key) as DailyFortuneSystem[];

type LockNativePlugin = {
  getState?: () => Promise<{ value?: string; enabled?: boolean; notificationsAllowed?: boolean }>;
  setState?: (opts: { value: string }) => Promise<void>;
  setPublicContent?: (opts: { value: string }) => Promise<void>;
  testNotification?: () => Promise<{ posted: boolean }>;
  openNotificationSettings?: () => Promise<void>;
  dismiss?: () => Promise<void>;
  setEnabled?: (opts: { enabled: boolean }) => Promise<void>;
  requestOverlayPermission?: () => Promise<void>;
  scheduleAlarms?: (opts: { value: string }) => Promise<void>;
};

function nativeLock(): LockNativePlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor;
  const plugin = cap?.Plugins?.CodeDestinyLockScreen;
  return plugin ? (plugin as LockNativePlugin) : null;
}

function mergeState(raw: unknown, copy: LockScreenCopy): LockState {
  const base: LockState = JSON.parse(JSON.stringify(buildDefaultState(copy)));
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Partial<LockState>;
  if (obj.prefs && typeof obj.prefs === "object") {
    // Existing night reminders remain active until their owner opts into quiet hours.
    base.prefs = { ...base.prefs, ...obj.prefs, quietEnabled: obj.prefs.quietEnabled ?? false };
    if (!Array.isArray(base.prefs.alarms)) base.prefs.alarms = buildDefaultState(copy).prefs.alarms;
    if (!Array.isArray(base.prefs.affirmationCats)) base.prefs.affirmationCats = [];
    if (!DAILY_SYSTEM_KEYS.includes(base.prefs.dailyFortuneSystem)) base.prefs.dailyFortuneSystem = "sukuyo";
  }
  if (obj.stats && typeof obj.stats === "object") base.stats = { ...base.stats, ...obj.stats };
  if (Array.isArray(obj.read)) base.read = obj.read.slice(0, 200);
  return base;
}

async function loadState(copy: LockScreenCopy): Promise<LockState> {
  const plugin = nativeLock();
  if (plugin?.getState) {
    try {
      const r = await plugin.getState();
      if (r && r.value) {
        const loaded = mergeState(JSON.parse(r.value), copy);
        // Either OFF wins when legacy native and web settings disagree.
        loaded.prefs.enabled = loaded.prefs.enabled && r.enabled === true;
        return loaded;
      }
      if (r && typeof r.enabled === "boolean") {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const loaded = mergeState(raw ? JSON.parse(raw) : null, copy);
        loaded.prefs.enabled = raw ? loaded.prefs.enabled && r.enabled : r.enabled;
        return loaded;
      }
    } catch {
      /* fall through */
    }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return mergeState(JSON.parse(raw), copy);
  } catch {
    /* noop */
  }
  return mergeState(null, copy);
}

async function persistState(state: LockState) {
  const json = JSON.stringify(state);
  try {
    window.localStorage.setItem(STORAGE_KEY, json);
  } catch {
    /* noop */
  }
  const plugin = nativeLock();
  if (plugin?.setState) {
    try {
      await plugin.setState({ value: json });
    } catch {
      /* noop */
    }
  }
}

async function pushAlarmsToNative(prefs: LockPrefs) {
  const plugin = nativeLock();
  if (plugin?.scheduleAlarms) {
    try {
      await plugin.scheduleAlarms({ value: JSON.stringify({ enabled: prefs.enabled, alarms: prefs.alarms }) });
    } catch {
      /* noop */
    }
  }
}

// ── 페이저 카드: 오늘의 운세 + 변주 시퀀스(R6) ────────────────
type PagerCard = { type: "daily" } | { type: "seq"; card: LockScreenCard };
type Sheet = "none" | "settings" | "theme" | "alarms" | "readlist";

export default function LockScreenFortuneClient() {
  const copy = useLockScreenCopy();
  const locale = getCurrentLoadingLocale();
  const extra = companionCopy(locale);
  // D-1: 웹에서는 의미 없으므로 노출하지 않는다(앱/네이티브 잠금화면 WebView만 통과).
  const [runtimeOk, setRuntimeOk] = useState<boolean | null>(null);
  const [state, setState] = useState<LockState | null>(null);
  const [content, setContent] = useState<LockScreenContent | null>(null);
  const [page, setPage] = useState(0);
  const [sheet, setSheet] = useState<Sheet>("none");
  const [announcement, setAnnouncement] = useState("");
  const readMarkedRef = useRef(false);
  const entrySelected = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isMobileAppRuntime()) {
      setRuntimeOk(false);
      try { window.location.replace("/"); } catch { /* noop */ }
      return;
    }
    setRuntimeOk(true);
  }, []);

  useEffect(() => {
    if (runtimeOk !== true) return;
    let alive = true;
    (async () => {
      const loaded = await loadState(copy);
      if (!alive) return;
      const now = new Date();
      const todayKey = getKstDateKey(now);
      if (loaded.stats.todayKey !== todayKey) {
        loaded.stats.todayKey = todayKey;
        loaded.stats.todayRead = 0;
      }
      setState(loaded);
      setContent(getDailyLockScreenContent(now, loaded.prefs.affirmationCats));

    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtimeOk]);

  const affirmationCatsKey = state?.prefs.affirmationCats.join(",") ?? "";
  useEffect(() => {
    if (runtimeOk !== true || !state) return;
    setContent(getDailyLockScreenContent(new Date(), state.prefs.affirmationCats));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affirmationCatsKey]);

  const dailySystem = state?.prefs.dailyFortuneSystem ?? "sukuyo";
  const daily = useCompanionDaily(locale, content?.dateKey || getKstDateKey(new Date()), runtimeOk === true);
  const serverDaily = daily.data?.systems?.[dailySystem];
  const dailyFortune: DailyFortune | null = serverDaily ? { ...serverDaily, system: dailySystem, emoji: "", label: serverDaily.label || extra.daily } : null;
  // These two legacy systems have no today-hub result. Preserve their original reading
  // separately, explicitly labelled; never present it as a shared server result.
  const legacyReference = locale === "ko" && (dailySystem === "astro" || dailySystem === "ziwei")
    ? getDailyFortune(dailySystem, { birthDate: daily.profile?.birthDate, birthTime: daily.profile?.birthTimeUnknown ? null : daily.profile?.birthTime }) : null;

  const pagerCards: PagerCard[] = useMemo(() => {
    if (!content) return [{ type: "daily" }];
    const seq = getDailyLockScreenSequence(new Date(), state?.prefs.affirmationCats);
    const out: PagerCard[] = state?.prefs.dailyEnabled ? [{ type: "daily" }] : [];
    seq.forEach((card) => {
      if (card.kind === "quote" && !state?.prefs.quoteEnabled) return;
      if (card.kind !== "quote" && !state?.prefs.affirmationEnabled) return;
      out.push({ type: "seq", card });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.dateKey, affirmationCatsKey, state?.prefs.quoteEnabled, state?.prefs.dailyEnabled, state?.prefs.affirmationEnabled]);

  useEffect(() => {
    if (!state || !content || entrySelected.current || !pagerCards.length) return;
    entrySelected.current = true;
    const kind = new URLSearchParams(window.location.search).get("content");
    const target = pagerCards.findIndex(c => kind === "daily" ? c.type === "daily" : c.type === "seq" && c.card.kind === kind);
    let selected = target >= 0 ? target : 0;
    try {
      if (!kind && state.prefs.changeOnLaunch) selected = (Number(localStorage.getItem("cd_lockscreen_last_page") || "-1") + 1) % pagerCards.length;
      localStorage.setItem("cd_lockscreen_last_page", String(selected));
    } catch { /* Storage denial must not block the reading. */ }
    setPage(selected);
  }, [state, content, pagerCards]);

  useEffect(() => {
    if (!state || !content || readMarkedRef.current) return;
    readMarkedRef.current = true;
    setState((prev) => {
      if (!prev) return prev;
      const already = prev.read.some((r) => r.dateKey === content.dateKey);
      const next: LockState = {
        ...prev,
        stats: { ...prev.stats, todayRead: prev.stats.todayRead + 1, totalRead: prev.stats.totalRead + 1 },
        read: already ? prev.read : [{ dateKey: content.dateKey, text: locale === "ko" ? content.affirmation : extra.ownAffirmation, at: Date.now() }, ...prev.read].slice(0, 200),
      };
      void persistState(next);
      return next;
    });
  }, [state, content]);

  const updatePrefs = useCallback((patch: Partial<LockPrefs>) => {
    setState((prev) => {
      if (!prev) return prev;
      const next: LockState = { ...prev, prefs: { ...prev.prefs, ...patch } };
      void persistState(next);
      if ("enabled" in patch) {
        const plugin = nativeLock();
        if (plugin?.setEnabled) void plugin.setEnabled({ enabled: next.prefs.enabled });

      }
      if ("alarms" in patch || "enabled" in patch) void pushAlarmsToNative(next.prefs);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!state || !content) return;
    const snapshot = {
      locale, dateKey: content.dateKey, version: 2,
      quote: { title: extra.quote, text: locale === "ko" ? `${content.quote.text} — ${content.quote.author}` : `${extra.ownLine} — ${extra.ownAuthor}` },
      affirmation: { title: extra.affirmation, text: locale === "ko" ? content.affirmation : extra.ownAffirmation },
      daily: { title: extra.daily, text: extra.privateSummary }, privateSummary: extra.privateSummary,
    };
    const plugin = nativeLock();
    void (async () => {
      await persistState({ ...state, prefs: { ...state.prefs, locale } });
      await plugin?.setPublicContent?.({ value: JSON.stringify(snapshot) });
    })().catch(() => { /* Settings remain available offline. */ });
  }, [state, content, locale, extra]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      setContent(getDailyLockScreenContent(new Date(), state?.prefs.affirmationCats));
    };
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => { document.removeEventListener("visibilitychange", refresh); window.clearInterval(timer); };
  }, [affirmationCatsKey]);

  useEffect(() => {
    const win = window as unknown as { __cdLockBack?: () => boolean };
    win.__cdLockBack = () => { if (sheet === "none") return false; setSheet("none"); return true; };
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") setSheet("none"); };
    window.addEventListener("keydown", close);
    return () => { delete win.__cdLockBack; window.removeEventListener("keydown", close); };
  }, [sheet]);

  const updateAlarm = useCallback((idx: number, patch: Partial<AlarmSlot>) => {
    setState((prev) => {
      if (!prev) return prev;
      const alarms = prev.prefs.alarms.map((a, i) => (i === idx ? { ...a, ...patch } : a));
      const next: LockState = { ...prev, prefs: { ...prev.prefs, alarms } };
      void persistState(next);
      void pushAlarmsToNative(next.prefs);
      return next;
    });
  }, []);

  const bg = useMemo(() => BACKGROUNDS.find((b) => b.key === state?.prefs.backgroundKey) || BACKGROUNDS[0], [state?.prefs.backgroundKey]);
  const fontColor = useMemo(() => (FONT_COLORS.find((c) => c.key === state?.prefs.fontColorKey) || FONT_COLORS[0]).hex, [state?.prefs.fontColorKey]);
  const pig = useMemo(() => PIG_POSES.find((p) => p.key === state?.prefs.pigPoseKey) || PIG_POSES[0], [state?.prefs.pigPoseKey]);
  const scale = state?.prefs.fontScale ?? 1;
  const subColor = bg.dark ? "rgba(255,255,255,.74)" : "rgba(20,16,40,.66)";
  const chipBg = bg.dark ? "rgba(255,255,255,.14)" : "rgba(20,16,40,.1)";
  const panelBg = bg.dark ? "rgba(10,10,26,.55)" : "rgba(255,255,255,.6)";

  const onPigError = (e: { currentTarget: HTMLImageElement }) => {
    const t = e.currentTarget;
    if (t.src.indexOf(PIG_FALLBACK) < 0) t.src = PIG_FALLBACK;
  };

  if (runtimeOk !== true || !state || !content) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#0b1225] text-slate-300">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/25 border-t-fuchsia-300" aria-hidden />
      </main>
    );
  }

  const dateLabel = new Date().toLocaleDateString(INTL_LOCALE_BY_LOADING_LOCALE[locale], { month: "long", day: "numeric", weekday: "long", timeZone: "Asia/Seoul" });
  const total = pagerCards.length;
  const idx = total ? ((page % total) + total) % total : 0;
  const current = pagerCards[idx];
  const isQuote = current?.type === "seq" && current.card.kind === "quote";
  const kindLabel = current?.type === "daily" ? extra.daily : isQuote ? extra.quote : extra.affirmation;
  const art = pig.key === "yeongnyangi" ? (isQuote ? "/assets/yeongnyangi/companion/quote.webp" : current?.type === "daily" ? "/assets/yeongnyangi/companion/daily.webp" : pig.url) : pig.url;
  const visibleText = current?.type === "seq" ? (locale !== "ko" ? (isQuote ? extra.ownLine : extra.ownAffirmation) : current.card.quote?.text || current.card.affirmation || current.card.coreEnergy || current.card.greeting || current.card.knowledge?.text || "") : "";
  const saveText = () => {
    if (!visibleText) return;
    setAnnouncement(extra.savedDone);
    setState(prev => {
      if (!prev || prev.read.some(r => r.text === visibleText)) return prev;
      const next = { ...prev, read: [{ dateKey: content.dateKey, text: visibleText, at: Date.now() }, ...prev.read].slice(0, 200) };
      void persistState(next); return next;
    });
  };
  return (
    <main className="cd-companion" style={{ background: bg.css, color: bg.dark ? (state.prefs.fontColorKey === "ink" ? "#fff9ef" : fontColor) : (state.prefs.fontColorKey === "gold" ? "#70551c" : "#241c35") }}>
      <header className="cd-companion-header">
        <div><p>{dateLabel} · KST</p><h1>{extra.title}</h1></div>
        <button type="button" onClick={() => setSheet("settings")} aria-label={extra.settings}>☷</button>
      </header>
      <nav className="cd-companion-tabs" aria-label={extra.kind}>
        {([['daily', extra.daily], ['quote', extra.quote], ['affirmation', extra.affirmation]] as const).map(([kind, label]) => {
          const target = pagerCards.findIndex(c => kind === 'daily' ? c.type === 'daily' : c.type === 'seq' && c.card.kind === kind);
          return <button type="button" key={kind} disabled={target < 0} aria-pressed={kindLabel === label} onClick={() => setPage(target)}>{label}</button>;
        })}
      </nav>
      <article className="cd-companion-reading" aria-live="polite" style={{ fontSize: `${scale}rem` }}>
        {current?.type === "daily" ? <>
          <select aria-label={copy.dailyFortuneSystemHeading} value={dailySystem} onChange={e => updatePrefs({dailyFortuneSystem:e.target.value as DailyFortuneSystem})} style={{minHeight:48,maxWidth:"100%",padding:12,borderRadius:12,background:bg.dark?"#211a32":"#fff9ee",color:"inherit"}}>{DAILY_FORTUNE_SYSTEMS.map(system=><option key={system.key} value={system.key}>{systemLabel(locale, system.key, system.label)}</option>)}</select>
          {dailyFortune ? <DailyFortuneCard fortune={dailyFortune} scale={scale} subColor={subColor} panelBg={panelBg} dark={bg.dark} copy={copy} /> : <><p className="cd-companion-sentence">{extra.unavailable}</p><button type="button" onClick={daily.retry}>{extra.retry}</button></>}
          <p className="cd-companion-source">{daily.data?.date || content.dateKey} · KST</p>
          {legacyReference && <details><summary>{extra.source}</summary><DailyFortuneCard fortune={legacyReference} scale={scale} subColor={subColor} panelBg={panelBg} dark={bg.dark} copy={copy} /></details>}
          <a href={locale === "ko" ? "/today/" : `${locale === "zh-CN" ? "/zh" : locale === "zh-TW" ? "/zh-tw" : ["en","ja"].includes(locale) ? "/" + locale : "/en"}/today/`}>{extra.web}</a>
        </> : current ? <>
          <p className="cd-companion-sentence">{visibleText}</p>
          {isQuote && <p className="cd-companion-source">{locale === "ko" ? current.card.quote?.author : extra.ownAuthor}</p>}
        </> : <p>{extra.noContent}</p>}
        <img src={art} onError={onPigError} width={192} height={192} alt="" className="cd-companion-cat" />
      </article>
      <div className="cd-companion-actions">
        <button type="button" disabled={total < 2} onClick={() => setPage(p => p - 1)}>{extra.previous}</button>
        <span>{total ? idx + 1 : 0} / {total}</span>
        <button type="button" disabled={total < 2} onClick={() => setPage(p => p + 1)}>{extra.next}</button>
      </div>
      {visibleText && <div className="cd-companion-actions"><button type="button" style={pillStyle(state.prefs.buttonStyleKey, bg.dark)} onClick={saveText}>{extra.saved}</button><button type="button" disabled={typeof navigator !== "undefined" && !navigator.share} onClick={() => { if (navigator.share) void navigator.share({ title: kindLabel, text: visibleText }).catch(() => {}); }}>{extra.shared}</button></div>}
      <p role="status" className="cd-companion-source">{announcement}</p>
      {locale === "ko" && <p className="cd-companion-source" style={{textAlign:"center",marginTop:20}}>{copy.todaysFlowerPrefix} · {content.flower.name} — {content.flower.meaning}</p>}
      <a className="cd-companion-return" href="/yeongnyangi/">{extra.close}</a>
      {sheet !== "none" && <SettingsSheet sheet={sheet} setSheet={setSheet} state={state} updatePrefs={updatePrefs} updateAlarm={updateAlarm} copy={copy} />}
    </main>
  );
}

// ── 오늘의 운세 카드(R3) ──────────────────────────────────────
function DailyFortuneCard({
  fortune, scale, subColor, panelBg, dark, copy,
}: {
  fortune: DailyFortune | null; scale: number; subColor: string; panelBg: string; dark: boolean; copy: LockScreenCopy;
}) {
  return (
    <div className="w-full rounded-2xl px-5 py-4 text-left" style={{ background: panelBg }} onClick={(e) => e.stopPropagation()}>
      {fortune ? (
        <>
          <p className="text-xs font-black tracking-[0.06em]" style={{ color: dark ? "#c4b5fd" : "#7c3aed" }}>{fortune.emoji} {fortune.anchor}</p>
          <p className="mt-1.5 font-black leading-snug" style={{ fontSize: `calc(1.12rem * ${scale})` }}>{fortune.headline}</p>
          <p className="mt-1.5 leading-relaxed" style={{ color: subColor, fontSize: `calc(0.92rem * ${scale})` }}>{fortune.body}</p>
          {!fortune.personalized ? (
            <p className="mt-2 text-[0.68rem]" style={{ color: subColor }}>{copy.profileNudge}</p>
          ) : null}
        </>
      ) : (
        <p className="leading-relaxed" style={{ color: subColor }}>{copy.dailyFortuneLoading}</p>
      )}
    </div>
  );
}

// ── 설정 시트 ─────────────────────────────────────────────────
function SettingsSheet({
  sheet, setSheet, state, updatePrefs, updateAlarm, copy,
}: {
  sheet: Sheet; setSheet: (s: Sheet) => void; state: LockState;
  updatePrefs: (patch: Partial<LockPrefs>) => void; updateAlarm: (idx: number, patch: Partial<AlarmSlot>) => void;
  copy: LockScreenCopy;
}) {
  const { prefs, stats, read } = state;
  const extra = companionCopy(getCurrentLoadingLocale());
  const [notice, setNotice] = useState("");
  const [notificationsAllowed, setNotificationsAllowed] = useState<boolean | null>(null);
  useEffect(() => { const refresh = () => { void nativeLock()?.getState?.().then(s => setNotificationsAllowed(s.notificationsAllowed ?? false)); }; refresh(); window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh); return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); }; }, [prefs.enabled]);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]') || []);
    focusable()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusable(); const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    dialog?.addEventListener("keydown", trap);
    return () => { dialog?.removeEventListener("keydown", trap); previous?.focus(); };
  }, []);
  const title = sheet === "settings" ? copy.sheetTitleSettings : sheet === "theme" ? copy.sheetTitleTheme : sheet === "alarms" ? copy.sheetTitleAlarms : copy.sheetTitleReadlist;
  return (
    <div className="fixed inset-0 z-[2147483000] flex items-end justify-center bg-black/45 backdrop-blur-sm" onClick={() => setSheet("none")}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-[#141024] p-5 text-slate-100 shadow-2xl"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))", maxHeight: "88dvh", overflowY: "auto" }}
        ref={dialogRef} role="dialog" aria-modal="true" aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">{title}</h2>
          <button type="button" aria-label={copy.closeAriaLabel} onClick={() => setSheet("none")} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-lg">×</button>
        </div>

        {sheet === "settings" ? (
          <div className="grid gap-3">
            <Row label={copy.lockScreenOnLabel} desc={extra.enabled}>
              <Toggle label={copy.lockScreenOnLabel} on={prefs.enabled} onChange={(v) => updatePrefs({ enabled: v })} />
            </Row>
            <p className="text-sm leading-relaxed">{extra.privacy}</p>
            {notificationsAllowed === false && <p role="status" className="text-sm">{extra.blocked}</p>}
            {([['quoteEnabled', extra.quote], ['dailyEnabled', extra.daily], ['affirmationEnabled', extra.affirmation]] as const).map(([key, label]) => <Row key={key} label={label}><Toggle label={label} on={prefs[key]} onChange={v => updatePrefs({ [key]: v })} /></Row>)}
            <Row label={extra.quiet}><Toggle label={extra.quiet} on={prefs.quietEnabled} onChange={v => updatePrefs({ quietEnabled: v })} /></Row>
            {prefs.quietEnabled && <div className="grid grid-cols-2 gap-3"><label>{extra.start}<input aria-label={extra.start} type="time" value={prefs.quietStart} onChange={e => updatePrefs({ quietStart: e.target.value })} className="block min-h-12 w-full rounded-lg bg-white/10 p-2" /></label><label>{extra.end}<input aria-label={extra.end} type="time" value={prefs.quietEnd} onChange={e => updatePrefs({ quietEnd: e.target.value })} className="block min-h-12 w-full rounded-lg bg-white/10 p-2" /></label></div>}
            <button type="button" className="min-h-12 rounded-xl bg-white/10 px-3" onClick={() => { void nativeLock()?.testNotification?.().then(r => setNotice(r.posted ? extra.posted : extra.blocked)).catch(() => setNotice(extra.blocked)); }}>{extra.test}</button>
            <button type="button" className="min-h-12 rounded-xl bg-white/10 px-3" onClick={() => { void nativeLock()?.openNotificationSettings?.(); }}>{extra.system}</button>
            {notice && <p role="status" className="text-sm">{notice}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Stat label={copy.todayReadLabel} value={stats.todayRead} />
              <Stat label={copy.totalReadLabel} value={stats.totalRead} />
            </div>
            <MenuButton label={copy.alarmsMenuLabel} value={copy.alarmsMenuValue(prefs.alarms.filter((a) => a.on).length)} onClick={() => setSheet("alarms")} />
            <MenuButton label={copy.themeMenuLabel} value={copy.themeMenuValue} onClick={() => setSheet("theme")} />
            <MenuButton label={copy.readlistMenuLabel} value={copy.readlistMenuValue(read.length)} onClick={() => setSheet("readlist")} />
            <Row label={copy.changeOnLaunchLabel} desc={copy.changeOnLaunchDesc}>
              <Toggle label={copy.changeOnLaunchLabel} on={prefs.changeOnLaunch} onChange={(v) => updatePrefs({ changeOnLaunch: v })} />
            </Row>
            <p className="mt-1 text-center text-[0.7rem] text-slate-400">{copy.footerBrandLine}</p>
          </div>
        ) : null}

        {sheet === "alarms" ? (
          <div className="grid gap-3">
            {prefs.alarms.map((a, i) => (
              <div key={a.label} className="rounded-2xl bg-white/5 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-bold">{a.label}</span>
                  <Toggle label={a.label} on={a.on} onChange={(v) => updateAlarm(i, { on: v })} />
                </div>
                <input
                  aria-label={a.label} type="time" value={a.time} onChange={(e) => updateAlarm(i, { time: e.target.value })} disabled={!a.on}
                  className="w-full rounded-xl border border-white/15 bg-[#0b1225] px-3 py-2.5 text-base text-white disabled:opacity-40"
                  style={{ colorScheme: "dark" }}
                />
              </div>
            ))}
            <p className="text-center text-[0.72rem] leading-relaxed text-slate-400">{extra.enabled}</p>
          </div>
        ) : null}

        {sheet === "theme" ? (
          <div className="grid gap-4">
            <div>
              <p className="mb-1 text-sm font-bold text-slate-300">{copy.dailyFortuneSystemHeading}</p>
              <p className="mb-2 text-[0.72rem] leading-relaxed text-slate-400">{copy.dailyFortuneSystemDesc}</p>
              <div className="flex flex-wrap gap-2">
                {DAILY_FORTUNE_SYSTEMS.map((s) => {
                  const on = prefs.dailyFortuneSystem === s.key;
                  return (
                    <button key={s.key} type="button" aria-pressed={on} onClick={() => updatePrefs({ dailyFortuneSystem: s.key })} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${on ? "border-fuchsia-300 bg-fuchsia-500/25 text-white" : "border-white/12 bg-white/5 text-slate-300"}`}>
                      {s.emoji} {systemLabel(getCurrentLoadingLocale(), s.key, s.label)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm font-bold text-slate-300">{copy.affirmationCatsHeading}</p>
              <p className="mb-2 text-[0.72rem] leading-relaxed text-slate-400">{copy.affirmationCatsDesc}</p>
              <div className="flex flex-wrap gap-2">
                {AFFIRMATION_CATEGORIES.map((c, categoryIndex) => {
                  const on = prefs.affirmationCats.includes(c.key);
                  return (
                    <button
                      key={c.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        updatePrefs({
                          affirmationCats: on
                            ? prefs.affirmationCats.filter((k) => k !== c.key)
                            : [...prefs.affirmationCats, c.key],
                        })
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${on ? "border-fuchsia-300 bg-fuchsia-500/25 text-white" : "border-white/12 bg-white/5 text-slate-300"}`}
                    >
                      {categoryLabel(getCurrentLoadingLocale(), categoryIndex, c.label)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-300">{extra.themeCharacter}</p>
              <div className="grid grid-cols-4 gap-2.5">
                {PIG_POSES.map((p) => (
                  <button key={p.key} type="button" aria-pressed={prefs.pigPoseKey === p.key} onClick={() => updatePrefs({ pigPoseKey: p.key })} className={`grid place-items-center rounded-2xl border-2 p-2 ${prefs.pigPoseKey === p.key ? "border-fuchsia-300 bg-white/10" : "border-white/10 bg-white/5"}`}>
                    <img src={p.url} alt={p.key === "yeongnyangi" ? extra.yeongnyangi : p.key === "yeoni" ? "Yeoni · 연이" : copy.pigPoseLabel[p.key]} width={44} height={44} className="h-11 w-11 object-contain" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-300">{copy.buttonTextureHeading}</p>
              <div className="grid grid-cols-4 gap-2.5">
                {BUTTON_STYLES.map((b) => (
                  <button key={b.key} type="button" aria-pressed={prefs.buttonStyleKey === b.key} onClick={() => updatePrefs({ buttonStyleKey: b.key })} className={`h-12 rounded-xl border-2 text-xs font-bold ${prefs.buttonStyleKey === b.key ? "border-fuchsia-300" : "border-white/10"}`} style={pillStyle(b.key, true)}>{copy.buttonStyleLabel[b.key]}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-300">{copy.fontColorHeading}</p>
              <div className="flex gap-2.5">
                {FONT_COLORS.map((c) => (
                  <button key={c.key} type="button" aria-pressed={prefs.fontColorKey === c.key} onClick={() => updatePrefs({ fontColorKey: c.key })} className={`h-11 flex-1 rounded-xl border-2 text-xs font-bold ${prefs.fontColorKey === c.key ? "border-fuchsia-300" : "border-white/10"}`} style={{ background: c.hex, color: c.key === "ink" ? "#fff" : "#20143a" }}>{copy.fontColorLabel[c.key]}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-300">{copy.fontSizeHeading(Math.round(prefs.fontScale * 100))}</p>
              <p className="text-sm">{extra.textSize}</p><input aria-label={copy.fontSizeHeading(Math.round(prefs.fontScale * 100))} type="range" min={0.9} max={1.35} step={0.05} value={prefs.fontScale} onChange={(e) => updatePrefs({ fontScale: Number(e.target.value) })} className="w-full accent-fuchsia-400" />
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-300">{copy.backgroundHeading}</p>
              <div className="grid grid-cols-2 gap-2.5">
                {BACKGROUNDS.map((b) => (
                  <button key={b.key} type="button" aria-pressed={prefs.backgroundKey === b.key} onClick={() => updatePrefs({ backgroundKey: b.key })} className={`h-20 rounded-2xl border-2 p-2 text-left text-xs font-black ${prefs.backgroundKey === b.key ? "border-fuchsia-300" : "border-white/10"}`} style={{ background: b.css, color: b.dark ? "#fff" : "#20143a" }}>{copy.backgroundLabel[b.key]}</button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {sheet === "readlist" ? (
          <div className="grid gap-2">
            {read.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">{copy.readlistEmpty}</p>
            ) : (
              read.slice(0, 60).map((r) => (
                <div key={`${r.dateKey}-${r.at}`} className="rounded-xl bg-white/5 px-3.5 py-3">
                  <p className="text-xs font-bold text-fuchsia-200/80">{r.dateKey}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-100">{r.text}</p>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 p-4">
      <div className="min-w-0">
        <p className="font-bold">{label}</p>
        {desc ? <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{desc}</p> : null}
      </div>
      {children}
    </div>
  );
}

function MenuButton({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center justify-between rounded-2xl bg-white/5 p-4 text-left">
      <span className="font-bold">{label}</span>
      <span className="text-sm text-slate-400">{value} ›</span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 text-center">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-label={label} aria-checked={on} onClick={() => onChange(!on)} className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${on ? "bg-fuchsia-500" : "bg-white/20"}`}>
      <span className={`absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
