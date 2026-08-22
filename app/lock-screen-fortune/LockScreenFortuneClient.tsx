"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
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
import { readAiProfileSeed } from "../_lib/ai-prefill-seed";
import { isMobileAppRuntime } from "../_lib/auth-client";
import { getCurrentLoadingLocale, INTL_LOCALE_BY_LOADING_LOCALE, type LoadingLocale } from "@/constants/loadingMessages";

// ── 꽃돼지(연이) 마스코트 — R1: 앱 번들 로컬 '단일 컷' 이미지(오프라인 동작) ──
// (기존 R2 CDN URL은 화면 켜지는 순간 네트워크가 없어 404. flower-pig-5-*는 스프라이트 시트라
//  통짜로 나오던 문제 → 잘라진 단일 캐릭터(꽃돼지-Photoroom·꽃돼지2-Photoroom)를 ASCII로 복사해 사용.)
const PIG_FALLBACK = "/images/fortune-tea-house/flower-pig-single-a.webp";
const PIG_POSES: readonly { key: string; url: string }[] = [
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
    document.addEventListener("cd:language-change", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      document.removeEventListener("cd:language-change", sync);
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
}
interface LockStats { todayKey: string; todayRead: number; totalRead: number }
interface ReadItem { dateKey: string; text: string; at: number }
interface LockState { prefs: LockPrefs; stats: LockStats; read: ReadItem[] }

function buildDefaultState(copy: LockScreenCopy): LockState {
  return {
    prefs: {
      enabled: true,
      fontColorKey: "white",
      fontScale: 1,
      backgroundKey: "twilight",
      buttonStyleKey: "glass",
      pigPoseKey: "pig1",
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
  getState?: () => Promise<{ value?: string }>;
  setState?: (opts: { value: string }) => Promise<void>;
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
    base.prefs = { ...base.prefs, ...obj.prefs };
    if (!Array.isArray(base.prefs.alarms) || base.prefs.alarms.length < 2) base.prefs.alarms = buildDefaultState(copy).prefs.alarms;
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
      if (r && r.value) return mergeState(JSON.parse(r.value), copy);
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

// 잠금화면 첫 진입 시, 기본 ON을 실제 네이티브에도 1회 반영(설정 미진입 사용자 보조).
const NATIVE_DEFAULT_ON_MARK = "cd_lockscreen_native_default_on_v1";
function seedNativeDefaultOn(prefs: LockPrefs) {
  try {
    if (window.localStorage.getItem(NATIVE_DEFAULT_ON_MARK) === "1") return;
    const plugin = nativeLock();
    if (!plugin?.setEnabled) return;
    window.localStorage.setItem(NATIVE_DEFAULT_ON_MARK, "1");
    if (prefs.enabled) {
      void plugin.setEnabled({ enabled: true });
      if (plugin.requestOverlayPermission) void plugin.requestOverlayPermission();
    }
  } catch {
    /* noop */
  }
}

// ── 페이저 카드: 오늘의 운세 + 변주 시퀀스(R6) ────────────────
type PagerCard = { type: "daily" } | { type: "seq"; card: LockScreenCard };
type Sheet = "none" | "settings" | "theme" | "alarms" | "readlist";

export default function LockScreenFortuneClient() {
  const copy = useLockScreenCopy();
  // D-1: 웹에서는 의미 없으므로 노출하지 않는다(앱/네이티브 잠금화면 WebView만 통과).
  const [runtimeOk, setRuntimeOk] = useState<boolean | null>(null);
  const [state, setState] = useState<LockState | null>(null);
  const [content, setContent] = useState<LockScreenContent | null>(null);
  const [birth, setBirth] = useState<{ birthDate?: string; birthTime?: string }>({});
  const [page, setPage] = useState(0);
  const [sheet, setSheet] = useState<Sheet>("none");
  const [dismissed, setDismissed] = useState(false);
  const [slideX, setSlideX] = useState(0);
  const readMarkedRef = useRef(false);
  const slideStartRef = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

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
      try { const seed = readAiProfileSeed(); setBirth({ birthDate: seed.birthDate, birthTime: seed.birthTime }); } catch { /* noop */ }
      seedNativeDefaultOn(loaded.prefs); // R2 보조: 기본 ON을 네이티브에 1회 반영
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
  const dailyFortune: DailyFortune | null = useMemo(() => {
    if (!content) return null;
    return getDailyFortune(dailySystem, birth, new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailySystem, birth.birthDate, birth.birthTime, content?.dateKey]);

  const pagerCards: PagerCard[] = useMemo(() => {
    if (!content) return [{ type: "daily" }];
    const seq = getDailyLockScreenSequence(new Date(), state?.prefs.affirmationCats);
    const out: PagerCard[] = [{ type: "daily" }];
    seq.forEach((card) => out.push({ type: "seq", card }));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.dateKey, affirmationCatsKey]);

  useEffect(() => {
    if (!state || !content || readMarkedRef.current) return;
    readMarkedRef.current = true;
    setState((prev) => {
      if (!prev) return prev;
      const already = prev.read.some((r) => r.dateKey === content.dateKey);
      const next: LockState = {
        ...prev,
        stats: { ...prev.stats, todayRead: prev.stats.todayRead + 1, totalRead: prev.stats.totalRead + 1 },
        read: already ? prev.read : [{ dateKey: content.dateKey, text: content.affirmation, at: Date.now() }, ...prev.read].slice(0, 200),
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
        if (next.prefs.enabled && plugin?.requestOverlayPermission) void plugin.requestOverlayPermission();
      }
      if ("alarms" in patch || "enabled" in patch) void pushAlarmsToNative(next.prefs);
      return next;
    });
  }, []);

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

  const dismiss = useCallback(() => {
    setDismissed(true);
    const plugin = nativeLock();
    if (plugin?.dismiss) void plugin.dismiss();
  }, []);

  // D-5: 오른쪽으로 밀어서 잠금 해제(YESSI형 slide-to-unlock).
  const onSlideStart = (e: ReactTouchEvent) => {
    slideStartRef.current = e.touches[0]?.clientX ?? null;
  };
  const onSlideMove = (e: ReactTouchEvent) => {
    if (slideStartRef.current == null) return;
    const delta = (e.touches[0]?.clientX ?? slideStartRef.current) - slideStartRef.current;
    const track = trackRef.current?.offsetWidth ?? 260;
    const max = Math.max(120, track - 78);
    setSlideX(Math.max(0, Math.min(delta, max)));
  };
  const onSlideEnd = () => {
    const track = trackRef.current?.offsetWidth ?? 260;
    const max = Math.max(120, track - 78);
    if (slideX >= max * 0.78) dismiss();
    setSlideX(0);
    slideStartRef.current = null;
  };

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

  if (dismissed) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: bg.css, color: fontColor }}>
        <img src={pig.url} onError={onPigError} alt="" width={96} height={96} className="h-24 w-24 object-contain drop-shadow-lg" />
        <p className="text-lg font-black">{content.greeting}</p>
        <button type="button" onClick={() => setDismissed(false)} className="rounded-full px-5 py-2.5 text-sm font-bold" style={pillStyle(state.prefs.buttonStyleKey, bg.dark)}>
          {copy.dismissedGreetingButton}
        </button>
      </main>
    );
  }

  const now = new Date();
  const intlLocale = INTL_LOCALE_BY_LOADING_LOCALE[getCurrentLoadingLocale()];
  const dateLabel = now.toLocaleDateString(intlLocale, { month: "long", day: "numeric", weekday: "long" });
  const timeLabel = now.toLocaleTimeString(intlLocale, { hour: "2-digit", minute: "2-digit", hour12: false });
  const total = pagerCards.length;
  const idx = ((page % total) + total) % total;
  const current = pagerCards[idx];
  const nextPage = () => setPage((p) => p + 1);

  const slideMax = Math.max(120, (trackRef.current?.offsetWidth ?? 260) - 78);
  const slideProgress = Math.min(1, slideX / (slideMax || 1));

  return (
    <main className="relative min-h-[100dvh] overflow-hidden select-none" style={{ background: bg.css, color: fontColor }}>
      {/* 상단: 시간/날짜 + 설정(뒤로가기·홈 네비는 AppChrome self-managed로 숨김) */}
      <div className="flex items-start justify-between px-5" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 18px)" }}>
        <div>
          <p className="font-black leading-none tracking-tight" style={{ fontSize: `calc(2.7rem * ${scale})` }}>{timeLabel}</p>
          <p className="mt-1.5 text-sm font-semibold" style={{ color: subColor }}>{dateLabel}</p>
        </div>
        <button type="button" aria-label={copy.lockSettingsAriaLabel} onClick={() => setSheet("settings")} className="mt-1 grid h-11 w-11 place-items-center rounded-full text-lg" style={{ background: chipBg }}>⚙️</button>
      </div>

      {/* 본문: 탭하면 다음 카드(변주) + 꽃돼지 마스코트 */}
      <div className="relative z-10 flex flex-col items-center px-6 pb-44 pt-5 text-center" role="button" tabIndex={0} onClick={nextPage} aria-label={copy.nextSentenceAriaLabel}>
        <div className="relative mb-3 h-24 w-24">
          <span className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle,rgba(255,255,255,.28),transparent 68%)" }} aria-hidden />
          <img src={pig.url} onError={onPigError} alt="" width={96} height={96} className="cd-lock-float relative h-24 w-24 object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,.28)]" />
        </div>

        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold" style={{ background: chipBg }}>✨ {content.header}</span>

        {/* F-4: 오늘의 꽃말은 페이저가 아니라 화면에 항상 고정 노출(날마다 변주) */}
        <span className="mb-4 inline-flex max-w-[23rem] items-center justify-center gap-1 rounded-full px-3.5 py-1.5 text-center text-xs font-bold leading-snug" style={{ background: chipBg, color: subColor }}>
          🌸 {copy.todaysFlowerPrefix} · {content.flower.name} — {content.flower.meaning}
        </span>

        {/* 카드 영역 — 탭마다 새 카드, 부드러운 전환 */}
        <div key={idx} className="cd-lock-card flex min-h-[10.5rem] w-full max-w-[23rem] flex-col items-center justify-center">
          {current.type === "daily" ? (
            <DailyFortuneCard fortune={dailyFortune} system={dailySystem} scale={scale} subColor={subColor} panelBg={panelBg} dark={bg.dark} onPick={(k) => updatePrefs({ dailyFortuneSystem: k })} copy={copy} />
          ) : (
            <SeqCard card={current.card} scale={scale} subColor={subColor} panelBg={panelBg} dark={bg.dark} copy={copy} />
          )}
        </div>

        {/* 진행 표시(슬림 바) + 힌트 */}
        <div className="mt-5 h-1 w-40 overflow-hidden rounded-full" style={{ background: bg.dark ? "rgba(255,255,255,.16)" : "rgba(20,16,40,.14)" }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${((idx + 1) / total) * 100}%`, background: fontColor, opacity: 0.75 }} />
        </div>
        <p className="mt-2 text-[0.72rem] font-semibold" style={{ color: subColor }}>{copy.tapNextHint(idx + 1, total)}</p>
      </div>

      {/* D-5: 오른쪽으로 밀어서 잠금 해제 */}
      <div className="absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-6" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)" }}>
        <div
          ref={trackRef}
          className="relative h-[62px] w-full max-w-[23rem] overflow-hidden rounded-full"
          style={{ background: bg.dark ? "rgba(255,255,255,.08)" : "rgba(20,16,40,.08)", border: "1px solid rgba(255,255,255,.18)" }}
        >
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: subColor, opacity: 1 - slideProgress }}>
            {copy.slideToUnlockHint}
          </span>
          <button
            type="button"
            onClick={dismiss}
            onTouchStart={onSlideStart}
            onTouchMove={onSlideMove}
            onTouchEnd={onSlideEnd}
            className="absolute left-1.5 top-1.5 flex h-[50px] w-[70px] items-center justify-center rounded-full text-base font-black"
            style={{ ...pillStyle(state.prefs.buttonStyleKey, bg.dark), transform: `translateX(${slideX}px)`, transition: slideStartRef.current == null ? "transform .22s ease" : "none", touchAction: "none" }}
            aria-label={copy.slideToUnlockAriaLabel}
          >
            Yes!
          </button>
        </div>
      </div>

      {/* 키프레임: 꽃돼지 float + 카드 전환 */}
      <style>{"@keyframes cdLockFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}.cd-lock-float{animation:cdLockFloat 2.8s ease-in-out infinite}@keyframes cdLockCardIn{0%{opacity:0;transform:translateY(10px) scale(.98)}100%{opacity:1;transform:none}}.cd-lock-card{animation:cdLockCardIn .32s ease}@media(prefers-reduced-motion:reduce){.cd-lock-float,.cd-lock-card{animation:none}}"}</style>

      {sheet !== "none" ? (
        <SettingsSheet sheet={sheet} setSheet={setSheet} state={state} updatePrefs={updatePrefs} updateAlarm={updateAlarm} copy={copy} />
      ) : null}
    </main>
  );
}

// ── 오늘의 운세 카드(R3) ──────────────────────────────────────
function DailyFortuneCard({
  fortune, system, scale, subColor, panelBg, dark, onPick, copy,
}: {
  fortune: DailyFortune | null; system: DailyFortuneSystem; scale: number; subColor: string; panelBg: string; dark: boolean; onPick: (k: DailyFortuneSystem) => void; copy: LockScreenCopy;
}) {
  return (
    <div className="w-full rounded-2xl px-5 py-4 text-left" style={{ background: panelBg }} onClick={(e) => e.stopPropagation()}>
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {DAILY_FORTUNE_SYSTEMS.map((s) => {
          const on = s.key === system;
          return (
            <button
              key={s.key}
              type="button"
              onClick={(e) => { e.stopPropagation(); onPick(s.key); }}
              className="rounded-full border px-2.5 py-1 text-[0.72rem] font-bold transition-colors"
              style={on
                ? { borderColor: dark ? "#c4b5fd" : "#7c3aed", background: dark ? "rgba(196,181,253,.22)" : "rgba(124,58,237,.14)", color: dark ? "#e9e2ff" : "#4c1d95" }
                : { borderColor: "rgba(255,255,255,.18)", background: dark ? "rgba(255,255,255,.06)" : "rgba(20,16,40,.05)", color: subColor }}
            >
              {s.emoji} {s.label}
            </button>
          );
        })}
      </div>
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

// ── 시퀀스 카드(확언/기운/명언/지식/인사) ─────────────────────
function SeqCard({
  card, scale, subColor, panelBg, dark, copy,
}: {
  card: LockScreenCard; scale: number; subColor: string; panelBg: string; dark: boolean; copy: LockScreenCopy;
}) {
  if (card.kind === "affirmation") {
    return <p className="text-balance font-black leading-[1.34]" style={{ fontSize: `calc(1.5rem * ${scale})` }}>{card.affirmation}</p>;
  }
  if (card.kind === "energy") {
    return (
      <div>
        <p className="mb-1 text-xs font-black tracking-[0.16em]" style={{ color: subColor }}>{copy.todaysEnergyLabel}</p>
        <p className="text-balance font-black leading-[1.42]" style={{ fontSize: `calc(1.28rem * ${scale})` }}>{card.coreEnergy}</p>
      </div>
    );
  }
  if (card.kind === "quote" && card.quote) {
    return (
      <div className="w-full rounded-2xl px-5 py-4 text-left" style={{ background: panelBg }}>
        <p className="font-semibold leading-relaxed" style={{ fontSize: `calc(1.02rem * ${scale})` }}>“{card.quote.text}”</p>
        <p className="mt-2 text-sm font-bold" style={{ color: subColor }}>— {card.quote.author}</p>
      </div>
    );
  }
  if (card.kind === "knowledge" && card.knowledge) {
    return (
      <div className="w-full rounded-2xl px-5 py-4 text-left" style={{ background: panelBg }}>
        <p className="mb-1.5 text-xs font-black" style={{ color: dark ? "#c4b5fd" : "#7c3aed" }}>✧ {copy.knowledgeLabel(card.knowledge.system)}</p>
        <p className="leading-relaxed" style={{ fontSize: `calc(0.95rem * ${scale})` }}>{card.knowledge.text}</p>
      </div>
    );
  }
  // greeting
  return <p className="font-black leading-relaxed" style={{ color: dark ? "#f4bed1" : "#b31955", fontSize: `calc(1.1rem * ${scale})` }}>🐷 {card.greeting}</p>;
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
  const title = sheet === "settings" ? copy.sheetTitleSettings : sheet === "theme" ? copy.sheetTitleTheme : sheet === "alarms" ? copy.sheetTitleAlarms : copy.sheetTitleReadlist;
  return (
    <div className="fixed inset-0 z-[2147483000] flex items-end justify-center bg-black/45 backdrop-blur-sm" onClick={() => setSheet("none")}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-[#141024] p-5 text-slate-100 shadow-2xl"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))", maxHeight: "88dvh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">{title}</h2>
          <button type="button" aria-label={copy.closeAriaLabel} onClick={() => setSheet("none")} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg">×</button>
        </div>

        {sheet === "settings" ? (
          <div className="grid gap-3">
            <Row label={copy.lockScreenOnLabel} desc={copy.lockScreenOnDesc}>
              <Toggle on={prefs.enabled} onChange={(v) => updatePrefs({ enabled: v })} />
            </Row>
            <div className="grid grid-cols-2 gap-3">
              <Stat label={copy.todayReadLabel} value={stats.todayRead} />
              <Stat label={copy.totalReadLabel} value={stats.totalRead} />
            </div>
            <MenuButton label={copy.alarmsMenuLabel} value={copy.alarmsMenuValue(prefs.alarms.filter((a) => a.on).length)} onClick={() => setSheet("alarms")} />
            <MenuButton label={copy.themeMenuLabel} value={copy.themeMenuValue} onClick={() => setSheet("theme")} />
            <MenuButton label={copy.readlistMenuLabel} value={copy.readlistMenuValue(read.length)} onClick={() => setSheet("readlist")} />
            <Row label={copy.changeOnLaunchLabel} desc={copy.changeOnLaunchDesc}>
              <Toggle on={prefs.changeOnLaunch} onChange={(v) => updatePrefs({ changeOnLaunch: v })} />
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
                  <Toggle on={a.on} onChange={(v) => updateAlarm(i, { on: v })} />
                </div>
                <input
                  type="time" value={a.time} onChange={(e) => updateAlarm(i, { time: e.target.value })} disabled={!a.on}
                  className="w-full rounded-xl border border-white/15 bg-[#0b1225] px-3 py-2.5 text-base text-white disabled:opacity-40"
                  style={{ colorScheme: "dark" }}
                />
              </div>
            ))}
            <p className="text-center text-[0.72rem] leading-relaxed text-slate-400">{copy.alarmsHint}</p>
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
                    <button key={s.key} type="button" onClick={() => updatePrefs({ dailyFortuneSystem: s.key })} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${on ? "border-fuchsia-300 bg-fuchsia-500/25 text-white" : "border-white/12 bg-white/5 text-slate-300"}`}>
                      {s.emoji} {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm font-bold text-slate-300">{copy.affirmationCatsHeading}</p>
              <p className="mb-2 text-[0.72rem] leading-relaxed text-slate-400">{copy.affirmationCatsDesc}</p>
              <div className="flex flex-wrap gap-2">
                {AFFIRMATION_CATEGORIES.map((c) => {
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
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-300">{copy.pigCharacterHeading}</p>
              <div className="grid grid-cols-4 gap-2.5">
                {PIG_POSES.map((p) => (
                  <button key={p.key} type="button" onClick={() => updatePrefs({ pigPoseKey: p.key })} className={`grid place-items-center rounded-2xl border-2 p-2 ${prefs.pigPoseKey === p.key ? "border-fuchsia-300 bg-white/10" : "border-white/10 bg-white/5"}`}>
                    <img src={p.url} alt={copy.pigPoseLabel[p.key]} width={44} height={44} className="h-11 w-11 object-contain" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-300">{copy.buttonTextureHeading}</p>
              <div className="grid grid-cols-4 gap-2.5">
                {BUTTON_STYLES.map((b) => (
                  <button key={b.key} type="button" onClick={() => updatePrefs({ buttonStyleKey: b.key })} className={`h-12 rounded-xl border-2 text-xs font-bold ${prefs.buttonStyleKey === b.key ? "border-fuchsia-300" : "border-white/10"}`} style={pillStyle(b.key, true)}>{copy.buttonStyleLabel[b.key]}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-300">{copy.fontColorHeading}</p>
              <div className="flex gap-2.5">
                {FONT_COLORS.map((c) => (
                  <button key={c.key} type="button" onClick={() => updatePrefs({ fontColorKey: c.key })} className={`h-11 flex-1 rounded-xl border-2 text-xs font-bold ${prefs.fontColorKey === c.key ? "border-fuchsia-300" : "border-white/10"}`} style={{ background: c.hex, color: c.key === "white" ? "#20143a" : "#fff" }}>{copy.fontColorLabel[c.key]}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-300">{copy.fontSizeHeading(Math.round(prefs.fontScale * 100))}</p>
              <input type="range" min={0.9} max={1.35} step={0.05} value={prefs.fontScale} onChange={(e) => updatePrefs({ fontScale: Number(e.target.value) })} className="w-full accent-fuchsia-400" />
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-300">{copy.backgroundHeading}</p>
              <div className="grid grid-cols-2 gap-2.5">
                {BACKGROUNDS.map((b) => (
                  <button key={b.key} type="button" onClick={() => updatePrefs({ backgroundKey: b.key })} className={`h-20 rounded-2xl border-2 p-2 text-left text-xs font-black ${prefs.backgroundKey === b.key ? "border-fuchsia-300" : "border-white/10"}`} style={{ background: b.css, color: b.dark ? "#fff" : "#20143a" }}>{copy.backgroundLabel[b.key]}</button>
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

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${on ? "bg-fuchsia-500" : "bg-white/20"}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
