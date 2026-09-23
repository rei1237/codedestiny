"use client";

// 오늘의 운세 전용 화면 — /today 의 실기능부.
//
// 예전에는 lib/lock-screen-daily-fortune.ts(잠금화면용 오프라인 문구 풀)를 읽어 5장을 그렸다.
// 그 모듈은 네트워크 없이도 절대 백지가 되지 않는 것이 목적이라 날짜 해시로 문장을 고르는데,
// 그래서 **홈 위젯보다 얕았다** — 홈은 /api/fortune/today-hub 로 진짜 엔진(사주 일진 십성·
// 숙요 27수 격각·베다 판창가)을 돌리고 있었기 때문이다. 이제 이 화면도 같은 엔진을 쓴다.
// (그 모듈은 /lock-screen-fortune 이 계속 쓰므로 지우지 않는다.)
//
// 몰입형이다 — AppChrome 의 CHROMELESS_ROUTES·FEATURE_NAV_SELF_MANAGED_ROUTES 에 /today 가
// 있어 전역 헤더·푸터·공용 나브가 붙지 않는다. 상단바는 이 화면이 직접 그린다.
//
// 무료다. 어떤 결제 게이트도 로그인 요구도 걸지 않는다. 프로필 카드가 없으면 개인 판정
// (등급·점수)만 감추고 날짜만으로 참인 값은 그대로 보여 준다.
//
// output:"export" 정적 빌드라 날짜가 굳지 않도록 계산은 반드시 마운트 후에 한다.
// 배포 게이트(광고 불가·색인 가능 라우트 최소 1800자)를 지탱하는 것은 children 으로 들어오는
// 서버 렌더 해설(TodaySystemPrimer + TodayReadingGuide)이다 — 아래 카드는 한 글자도 안 센다.

import Link from "next/link";
import Image from "next/image";
import DailyTarot, {type DailyTarotCard} from "./DailyTarot";
import { FusionCrossSell } from "../components/FusionCrossSell";
import { ArrowLeft, Home } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getApiUrl } from "@/app/_lib/api-config";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { hardNavigateToShellHome } from "@/lib/navigation/shellHome";
import { maskBirthDateInput } from "@/lib/birthDateInput";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface DetailItem {
  label: string;
  value: string;
  note?: string;
}

interface DetailSection {
  key: string;
  title: string;
  items?: DetailItem[];
  lines?: string[];
}

interface SystemCard {
  system: TodaySystem;
  label: string;
  anchor: string;
  headline: string;
  body: string;
  tier: string | null;
  tierLabel: string | null;
  score: number | null;
  detail: string;
  personalized: boolean;
  highlights: string[];
  sections?: DetailSection[];
}

interface HubResponse {
  ok: boolean;
  date: string;
  personalized: boolean;
  systems: Partial<Record<TodaySystem, SystemCard | null>>;
}

type TodaySystem = "saju" | "sukuyo" | "vedic" | "number";
type DetailLoadState = "idle" | "loading" | "failed" | "loaded";

const TODAY_LOADING_IMAGE = "/images/fortune-tea-house/mobile/flower-pig-result-still-mobile.webp";

const TAB_KEYS: readonly { key: TodaySystem; emoji: string }[] = [
  { key: "saju", emoji: "🎴" },
  { key: "sukuyo", emoji: "🌙" },
  { key: "vedic", emoji: "✨" },
  { key: "number", emoji: "🔢" },
];

type TodayHubCopy = {
  tabLabel: Record<TodaySystem, string>;
  tabBlurb: Record<TodaySystem, string>;
  navAriaLabel: string;
  backButtonLabel: string;
  backButtonAriaLabel: string;
  homeButtonLabel: string;
  noVerdictLabel: string;
  scoreSuffix: (score: number) => string;
  cardDelayedFallback: (label: string) => string;
  heroTitle: string;
  heroLead: string;
  tabsAriaLabel: string;
  failedMessage: string;
  retryButton: string;
  profileNudgePrefix: string;
  profileNudgeBold: string;
  profileNudgeSuffix: string;
  profileCreateLink: string;
  shareButtonBusy: string;
  shareButtonIdle: (label: string) => string;
  shareSheetTitle: string;
  shareSheetText: string;
  deeperHeading: string;
  deeperLead: string;
  deeperLinkTitle: string[];
  deeperLinkDesc: string[];
};

const TODAY_HUB_COPY_EN: TodayHubCopy = {
  tabLabel: { saju: "Saju", sukuyo: "Sukuyo", vedic: "Vedic", number: "Numerology" },
  tabBlurb: {
    saju: "How today's heavenly-stem/earthly-branch day shapes your day master",
    sukuyo: "Where the 27 lunar mansions the Moon visits sit relative to your birth star",
    vedic: "Today's panchanga read from the Moon's real sidereal position",
    number: "Today's Personal Day number, from your birth month and day plus today's date",
  },
  navAriaLabel: "Today's fortune navigation",
  backButtonLabel: "Back",
  backButtonAriaLabel: "Go to previous page",
  homeButtonLabel: "Home",
  noVerdictLabel: "Today's overall flow",
  scoreSuffix: (score) => `${score} pts`,
  cardDelayedFallback: (label) => `The ${label} calculation is briefly delayed. The other readings are still available, and refreshing will retry.`,
  heroTitle: "Today's Fortune",
  heroLead: "Saju day pillar, the 27 Sukuyo mansions, Vedic panchanga, and your numerology Personal Day — four systems read today in their own way. Free, no sign-in needed.",
  tabsAriaLabel: "Switch today's fortune system",
  failedMessage: "Couldn't calculate today's fortune. Please try again in a moment.",
  retryButton: "Try again",
  profileNudgePrefix: "What you're seeing now is ",
  profileNudgeBold: "the overall flow of the day, decided by date alone",
  profileNudgeSuffix: ". Add your birth date to your profile card and we'll weigh today against your day master and birth star to tell you whether it's an auspicious day or a caution day.",
  profileCreateLink: "Create a profile",
  shareButtonBusy: "Creating image...",
  shareButtonIdle: (label) => `📸 Share ${label} result`,
  shareSheetTitle: "Today's Fortune",
  shareSheetText: "Check out today's fortune.",
  deeperHeading: "Go deeper",
  deeperLead: "If you want to see your inborn chart rather than just today, continue below.",
  deeperLinkTitle: ["Sukuyo calendar", "Nakshatra codex", "Ziwei chart"],
  deeperLinkDesc: [
    "See this month's flow of the 27 mansions at a glance.",
    "Read your birth star through both the Eastern and Indian systems.",
    "See the chart of your 12 inborn palaces, not just today.",
  ],
};

const TODAY_HUB_COPY: Partial<Record<LoadingLocale, TodayHubCopy>> = {
  ko: {
    tabLabel: { saju: "사주", sukuyo: "숙요점", vedic: "베다점", number: "수비학" },
    tabBlurb: {
      saju: "오늘 일진의 천간·지지가 내 일간에 만드는 결",
      sukuyo: "달이 머무는 27수가 내 본명수에게 갖는 자리",
      vedic: "실제 달의 시데리얼 위치로 보는 오늘의 판창가",
      number: "생월·생일과 오늘 날짜를 더한 내 개인일수(Personal Day)",
    },
    navAriaLabel: "오늘의 운세 내비게이션",
    backButtonLabel: "뒤로",
    backButtonAriaLabel: "이전 페이지로 이동",
    homeButtonLabel: "홈",
    noVerdictLabel: "오늘 하루의 흐름",
    scoreSuffix: (score) => `${score}점`,
    cardDelayedFallback: (label) => `${label} 계산이 잠시 지연되고 있습니다. 다른 점술은 그대로 보실 수 있고, 새로고침하면 다시 시도합니다.`,
    heroTitle: "오늘의 운세",
    heroLead: "사주 일진, 숙요 27수, 베다 판창가, 수비학 개인일수 — 네 체계가 각자의 방식으로 오늘 하루를 읽습니다. 로그인 없이 무료입니다.",
    tabsAriaLabel: "오늘의 운세 점술 전환",
    failedMessage: "오늘의 운세를 계산하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    retryButton: "다시 시도",
    profileNudgePrefix: "지금 보시는 것은 ",
    profileNudgeBold: "날짜만으로 정해지는 하루 전체의 흐름",
    profileNudgeSuffix: "입니다. 프로필 카드에 생년월일을 넣으면 내 일간·본명수와 견주어 오늘이 대길일인지 주의일인지까지 짚어 드려요.",
    profileCreateLink: "프로필 만들기",
    shareButtonBusy: "이미지 만드는 중…",
    shareButtonIdle: (label) => `📸 ${label} 결과 공유하기`,
    shareSheetTitle: "오늘의 운세",
    shareSheetText: "오늘의 운세를 확인해 보세요.",
    deeperHeading: "더 깊게 보기",
    deeperLead: "오늘 하루가 아니라 타고난 판을 보고 싶다면 아래로 이어집니다.",
    deeperLinkTitle: ["숙요 달력", "나크샤트라 코덱스", "자미두수 명반"],
    deeperLinkDesc: [
      "이번 달 27수의 흐름을 한눈에 봅니다.",
      "내 본명 별자리를 동양·인도 두 체계로 읽습니다.",
      "오늘 하루가 아니라 타고난 12궁의 판을 봅니다.",
    ],
  },
  en: TODAY_HUB_COPY_EN,
  ja: {
    tabLabel: { saju: "四柱推命", sukuyo: "宿曜", vedic: "ヴェーダ占星術", number: "数秘術" },
    tabBlurb: {
      saju: "今日の日柱の天干・地支が自分の日干に作る結び",
      sukuyo: "月が留まる27宿が自分の本命宿に対して持つ位置",
      vedic: "実際の月のサイデリアル位置から見る今日のパンチャーンガ",
      number: "誕生月日と今日の日付を足したパーソナルデイ数",
    },
    navAriaLabel: "今日の運勢ナビゲーション",
    backButtonLabel: "戻る",
    backButtonAriaLabel: "前のページに戻る",
    homeButtonLabel: "ホーム",
    noVerdictLabel: "今日一日の流れ",
    scoreSuffix: (score) => `${score}点`,
    cardDelayedFallback: (label) => `${label}の計算が少し遅れています。他の占いはそのままご覧いただけます。更新すると再度お試しします。`,
    heroTitle: "今日の運勢",
    heroLead: "四柱推命の日柱、宿曜27宿、ヴェーダのパンチャーンガ、数秘術のパーソナルデイ — 4つの体系がそれぞれの方法で今日を読みます。ログイン不要・無料です。",
    tabsAriaLabel: "今日の運勢の占術を切り替え",
    failedMessage: "今日の運勢を計算できませんでした。しばらくしてから再度お試しください。",
    retryButton: "再試行",
    profileNudgePrefix: "今表示されているのは",
    profileNudgeBold: "日付だけで決まる一日全体の流れ",
    profileNudgeSuffix: "です。プロフィールカードに生年月日を入力すると、自分の日干・本命宿と照らし合わせて、今日が大吉日か注意日かまで見極めます。",
    profileCreateLink: "プロフィールを作成",
    shareButtonBusy: "画像を作成中…",
    shareButtonIdle: (label) => `📸 ${label}の結果を共有`,
    shareSheetTitle: "今日の運勢",
    shareSheetText: "今日の運勢を確認してみてください。",
    deeperHeading: "もっと深く見る",
    deeperLead: "今日一日ではなく、生まれ持った運命盤を見たい方はこちらへ。",
    deeperLinkTitle: ["宿曜カレンダー", "ナクシャトラコーデックス", "紫微斗数命盤"],
    deeperLinkDesc: [
      "今月の27宿の流れをひと目で確認できます。",
      "自分の本命星座を東洋・インドの2つの体系で読み解きます。",
      "今日一日ではなく、生まれ持った12宮の盤を見ます。",
    ],
  },
  "zh-CN": {
    tabLabel: { saju: "四柱", sukuyo: "宿曜", vedic: "吠陀占星", number: "数字命理" },
    tabBlurb: {
      saju: "今日日柱天干地支与您日干形成的关系",
      sukuyo: "月亮所在的27宿与您本命宿的相对位置",
      vedic: "根据月亮实际恒星位置解读的今日五要素",
      number: "由出生月日与今日日期相加得出的个人日数",
    },
    navAriaLabel: "今日运势导航",
    backButtonLabel: "返回",
    backButtonAriaLabel: "返回上一页",
    homeButtonLabel: "首页",
    noVerdictLabel: "今日整体运势",
    scoreSuffix: (score) => `${score}分`,
    cardDelayedFallback: (label) => `${label}的计算暂时延迟。其他占卜仍可正常查看，刷新后将重新尝试。`,
    heroTitle: "今日运势",
    heroLead: "四柱日柱、宿曜27宿、吠陀五要素、数字命理个人日——四种体系以各自的方式解读今天。无需登录，完全免费。",
    tabsAriaLabel: "切换今日运势占卜方式",
    failedMessage: "今日运势计算失败，请稍后重试。",
    retryButton: "重试",
    profileNudgePrefix: "您现在看到的是",
    profileNudgeBold: "仅由日期决定的一整天运势",
    profileNudgeSuffix: "。在个人资料卡中填写出生日期，即可对照您的日干、本命宿，判断今天是大吉日还是需谨慎的日子。",
    profileCreateLink: "创建个人资料",
    shareButtonBusy: "正在生成图片…",
    shareButtonIdle: (label) => `📸 分享${label}结果`,
    shareSheetTitle: "今日运势",
    shareSheetText: "来看看今日运势吧。",
    deeperHeading: "深入了解",
    deeperLead: "如果您想看的不只是今天，而是与生俱来的命盘，请继续往下看。",
    deeperLinkTitle: ["宿曜日历", "纳克夏特拉图鉴", "紫微斗数命盘"],
    deeperLinkDesc: [
      "一目了然查看本月27宿的运势变化。",
      "以东方与印度两种体系解读您的本命星座。",
      "查看您与生俱来的十二宫命盘，而非仅是今天。",
    ],
  },
  "zh-TW": {
    tabLabel: { saju: "四柱", sukuyo: "宿曜", vedic: "吠陀占星", number: "數字命理" },
    tabBlurb: {
      saju: "今日日柱天干地支與您日干形成的關係",
      sukuyo: "月亮所在的27宿與您本命宿的相對位置",
      vedic: "根據月亮實際恆星位置解讀的今日五要素",
      number: "由出生月日與今日日期相加得出的個人日數",
    },
    navAriaLabel: "今日運勢導覽",
    backButtonLabel: "返回",
    backButtonAriaLabel: "返回上一頁",
    homeButtonLabel: "首頁",
    noVerdictLabel: "今日整體運勢",
    scoreSuffix: (score) => `${score}分`,
    cardDelayedFallback: (label) => `${label}的計算暫時延遲。其他占卜仍可正常查看，重新整理後將再次嘗試。`,
    heroTitle: "今日運勢",
    heroLead: "四柱日柱、宿曜27宿、吠陀五要素、數字命理個人日——四種體系以各自的方式解讀今天。無需登入，完全免費。",
    tabsAriaLabel: "切換今日運勢占卜方式",
    failedMessage: "今日運勢計算失敗，請稍後再試。",
    retryButton: "重試",
    profileNudgePrefix: "您現在看到的是",
    profileNudgeBold: "僅由日期決定的一整天運勢",
    profileNudgeSuffix: "。在個人資料卡中填寫出生日期，即可對照您的日干、本命宿，判斷今天是大吉日還是需謹慎的日子。",
    profileCreateLink: "建立個人資料",
    shareButtonBusy: "正在產生圖片…",
    shareButtonIdle: (label) => `📸 分享${label}結果`,
    shareSheetTitle: "今日運勢",
    shareSheetText: "來看看今日運勢吧。",
    deeperHeading: "深入了解",
    deeperLead: "如果您想看的不只是今天，而是與生俱來的命盤，請繼續往下看。",
    deeperLinkTitle: ["宿曜日曆", "納克沙特拉圖鑑", "紫微斗數命盤"],
    deeperLinkDesc: [
      "一目了然查看本月27宿的運勢變化。",
      "以東方與印度兩種體系解讀您的本命星座。",
      "查看您與生俱來的十二宮命盤，而非僅是今天。",
    ],
  },
  vi: {
    tabLabel: { saju: "Tứ Trụ", sukuyo: "Sukuyo", vedic: "Vệ Đà", number: "Thần số học" },
    tabBlurb: {
      saju: "Thiên can địa chi của nhật trụ hôm nay tạo nên kết nối với nhật can của bạn",
      sukuyo: "Vị trí của 27 cung mà Mặt Trăng lưu trú so với sao bản mệnh của bạn",
      vedic: "Panchanga hôm nay đọc theo vị trí sao thực của Mặt Trăng",
      number: "Con số Ngày cá nhân từ tháng, ngày sinh cộng với ngày hôm nay",
    },
    navAriaLabel: "Điều hướng vận mệnh hôm nay",
    backButtonLabel: "Quay lại",
    backButtonAriaLabel: "Về trang trước",
    homeButtonLabel: "Trang chủ",
    noVerdictLabel: "Dòng chảy tổng thể hôm nay",
    scoreSuffix: (score) => `${score} điểm`,
    cardDelayedFallback: (label) => `Việc tính toán ${label} đang tạm thời bị chậm. Các phương pháp khác vẫn xem được bình thường, hãy tải lại để thử lại.`,
    heroTitle: "Vận Mệnh Hôm Nay",
    heroLead: "Nhật trụ Tứ Trụ, 27 cung Sukuyo, panchanga Vệ Đà, Ngày cá nhân thần số học — bốn hệ thống đọc hôm nay theo cách riêng của mình. Miễn phí, không cần đăng nhập.",
    tabsAriaLabel: "Chuyển đổi phương pháp xem vận mệnh hôm nay",
    failedMessage: "Không thể tính toán vận mệnh hôm nay. Vui lòng thử lại sau một chút.",
    retryButton: "Thử lại",
    profileNudgePrefix: "Những gì bạn đang xem là ",
    profileNudgeBold: "dòng chảy tổng thể của cả ngày, chỉ quyết định bởi ngày tháng",
    profileNudgeSuffix: ". Thêm ngày sinh vào thẻ hồ sơ để chúng tôi đối chiếu hôm nay với nhật can và sao bản mệnh của bạn, cho biết đây là ngày đại cát hay ngày cần thận trọng.",
    profileCreateLink: "Tạo hồ sơ",
    shareButtonBusy: "Đang tạo hình ảnh...",
    shareButtonIdle: (label) => `📸 Chia sẻ kết quả ${label}`,
    shareSheetTitle: "Vận Mệnh Hôm Nay",
    shareSheetText: "Hãy xem vận mệnh hôm nay của bạn.",
    deeperHeading: "Xem sâu hơn",
    deeperLead: "Nếu bạn muốn xem lá số bẩm sinh thay vì chỉ hôm nay, hãy tiếp tục bên dưới.",
    deeperLinkTitle: ["Lịch Sukuyo", "Bách khoa Nakshatra", "Lá số Tử Vi"],
    deeperLinkDesc: [
      "Xem nhanh dòng chảy của 27 cung trong tháng này.",
      "Đọc sao bản mệnh của bạn theo cả hai hệ thống Đông phương và Ấn Độ.",
      "Xem lá số 12 cung bẩm sinh của bạn, không chỉ riêng hôm nay.",
    ],
  },
  hi: {
    tabLabel: { saju: "साजू", sukuyo: "सुक्योउ", vedic: "वैदिक", number: "अंकशास्त्र" },
    tabBlurb: {
      saju: "आज के दिन-स्तंभ का स्वर्गीय तना-शाखा आपके दिन स्वामी से जो संबंध बनाता है",
      sukuyo: "चंद्रमा जिस 27वें भवन में ठहरता है उसका आपके जन्म नक्षत्र से संबंध",
      vedic: "चंद्रमा की वास्तविक नाक्षत्रिक स्थिति से आज का पंचांग",
      number: "जन्म माह-तिथि और आज की तारीख़ जोड़कर बना आपका पर्सनल डे अंक",
    },
    navAriaLabel: "आज के भाग्य का नेविगेशन",
    backButtonLabel: "वापस",
    backButtonAriaLabel: "पिछले पेज पर जाएं",
    homeButtonLabel: "होम",
    noVerdictLabel: "आज दिन भर का प्रवाह",
    scoreSuffix: (score) => `${score} अंक`,
    cardDelayedFallback: (label) => `${label} की गणना में थोड़ी देरी हो रही है। अन्य ज्योतिष विधियाँ सामान्य रूप से देखी जा सकती हैं, रीफ्रेश करने पर फिर से प्रयास होगा।`,
    heroTitle: "आज का भाग्य",
    heroLead: "साजू दिन-स्तंभ, सुक्योउ के 27 भवन, वैदिक पंचांग, अंकशास्त्र का पर्सनल डे — चारों प्रणालियाँ अपने-अपने तरीके से आज को पढ़ती हैं। लॉगिन की आवश्यकता नहीं, मुफ़्त।",
    tabsAriaLabel: "आज के भाग्य की ज्योतिष विधि बदलें",
    failedMessage: "आज का भाग्य गणना नहीं हो सका। कृपया कुछ देर बाद फिर कोशिश करें।",
    retryButton: "फिर कोशिश करें",
    profileNudgePrefix: "अभी आप जो देख रहे हैं वह ",
    profileNudgeBold: "केवल तारीख से तय होने वाला पूरे दिन का प्रवाह है",
    profileNudgeSuffix: "। अपने प्रोफ़ाइल कार्ड में जन्मतिथि जोड़ें और हम आज की तुलना आपके दिन स्वामी व जन्म नक्षत्र से करके बताएंगे कि आज शुभ दिन है या सावधानी वाला दिन।",
    profileCreateLink: "प्रोफ़ाइल बनाएं",
    shareButtonBusy: "छवि बनाई जा रही है...",
    shareButtonIdle: (label) => `📸 ${label} परिणाम साझा करें`,
    shareSheetTitle: "आज का भाग्य",
    shareSheetText: "आज का भाग्य देखें।",
    deeperHeading: "और गहराई से देखें",
    deeperLead: "यदि आप केवल आज नहीं बल्कि अपनी जन्मजात कुंडली देखना चाहते हैं, तो नीचे जारी रखें।",
    deeperLinkTitle: ["सुक्योउ कैलेंडर", "नक्षत्र कोडेक्स", "ज़िवेई चार्ट"],
    deeperLinkDesc: [
      "इस महीने के 27 भवनों का प्रवाह एक नज़र में देखें।",
      "अपने जन्म नक्षत्र को पूर्वी और भारतीय दोनों प्रणालियों से पढ़ें।",
      "केवल आज नहीं, अपनी जन्मजात 12 भावों की कुंडली देखें।",
    ],
  },
  es: {
    tabLabel: { saju: "Saju", sukuyo: "Sukuyo", vedic: "Védica", number: "Numerología" },
    tabBlurb: {
      saju: "Cómo el tronco celeste y la rama terrestre del día de hoy moldean tu amo del día",
      sukuyo: "Dónde se sitúan las 27 mansiones lunares de hoy respecto a tu estrella natal",
      vedic: "El panchanga de hoy según la posición sideral real de la Luna",
      number: "Tu número de Día Personal: mes y día de nacimiento más la fecha de hoy",
    },
    navAriaLabel: "Navegación de la fortuna de hoy",
    backButtonLabel: "Atrás",
    backButtonAriaLabel: "Ir a la página anterior",
    homeButtonLabel: "Inicio",
    noVerdictLabel: "El flujo general de hoy",
    scoreSuffix: (score) => `${score} pts`,
    cardDelayedFallback: (label) => `El cálculo de ${label} está momentáneamente retrasado. Las demás lecturas siguen disponibles; al actualizar se reintentará.`,
    heroTitle: "La Fortuna de Hoy",
    heroLead: "El pilar del día Saju, las 27 mansiones Sukuyo, el panchanga védico y tu Día Personal numerológico: cuatro sistemas leen hoy a su manera. Gratis, sin necesidad de iniciar sesión.",
    tabsAriaLabel: "Cambiar el sistema de la fortuna de hoy",
    failedMessage: "No se pudo calcular la fortuna de hoy. Inténtalo de nuevo en un momento.",
    retryButton: "Reintentar",
    profileNudgePrefix: "Lo que ves ahora es ",
    profileNudgeBold: "el flujo general del día, determinado solo por la fecha",
    profileNudgeSuffix: ". Añade tu fecha de nacimiento a tu tarjeta de perfil y compararemos hoy con tu amo del día y tu estrella natal para decirte si es un día propicio o de precaución.",
    profileCreateLink: "Crear un perfil",
    shareButtonBusy: "Creando imagen...",
    shareButtonIdle: (label) => `📸 Compartir resultado de ${label}`,
    shareSheetTitle: "La Fortuna de Hoy",
    shareSheetText: "Mira la fortuna de hoy.",
    deeperHeading: "Profundizar",
    deeperLead: "Si quieres ver tu carta natal en vez de solo hoy, continúa abajo.",
    deeperLinkTitle: ["Calendario Sukuyo", "Códice Nakshatra", "Carta Ziwei"],
    deeperLinkDesc: [
      "Ve de un vistazo el flujo de las 27 mansiones de este mes.",
      "Lee tu estrella natal según los sistemas oriental e indio.",
      "Ve la carta de tus 12 casas natales, no solo la de hoy.",
    ],
  },
  fr: {
    tabLabel: { saju: "Saju", sukuyo: "Sukuyo", vedic: "Védique", number: "Numérologie" },
    tabBlurb: {
      saju: "Comment le tronc céleste et la branche terrestre du jour façonnent votre maître du jour",
      sukuyo: "La position des 27 demeures lunaires d'aujourd'hui par rapport à votre étoile natale",
      vedic: "Le panchanga du jour lu selon la position sidérale réelle de la Lune",
      number: "Votre nombre du Jour Personnel : mois et jour de naissance plus la date du jour",
    },
    navAriaLabel: "Navigation de la fortune du jour",
    backButtonLabel: "Retour",
    backButtonAriaLabel: "Retourner à la page précédente",
    homeButtonLabel: "Accueil",
    noVerdictLabel: "Le flux général du jour",
    scoreSuffix: (score) => `${score} pts`,
    cardDelayedFallback: (label) => `Le calcul de ${label} est momentanément retardé. Les autres lectures restent disponibles ; actualisez pour réessayer.`,
    heroTitle: "La Fortune du Jour",
    heroLead: "Le pilier du jour Saju, les 27 demeures Sukuyo, le panchanga védique et votre Jour Personnel en numérologie — quatre systèmes lisent aujourd'hui à leur manière. Gratuit, sans connexion.",
    tabsAriaLabel: "Changer le système de la fortune du jour",
    failedMessage: "Impossible de calculer la fortune du jour. Réessayez dans un instant.",
    retryButton: "Réessayer",
    profileNudgePrefix: "Ce que vous voyez actuellement est ",
    profileNudgeBold: "le flux général de la journée, déterminé uniquement par la date",
    profileNudgeSuffix: ". Ajoutez votre date de naissance à votre fiche de profil et nous comparerons aujourd'hui à votre maître du jour et à votre étoile natale pour vous dire si c'est un jour favorable ou un jour de prudence.",
    profileCreateLink: "Créer un profil",
    shareButtonBusy: "Création de l'image...",
    shareButtonIdle: (label) => `📸 Partager le résultat ${label}`,
    shareSheetTitle: "La Fortune du Jour",
    shareSheetText: "Découvrez la fortune du jour.",
    deeperHeading: "Aller plus loin",
    deeperLead: "Si vous voulez voir votre thème natal plutôt que seulement aujourd'hui, continuez ci-dessous.",
    deeperLinkTitle: ["Calendrier Sukuyo", "Codex Nakshatra", "Carte Ziwei"],
    deeperLinkDesc: [
      "Voyez en un coup d'œil le flux des 27 demeures de ce mois-ci.",
      "Lisez votre étoile natale selon les systèmes oriental et indien.",
      "Voyez la carte de vos 12 maisons natales, pas seulement aujourd'hui.",
    ],
  },
  de: {
    tabLabel: { saju: "Saju", sukuyo: "Sukuyo", vedic: "Vedisch", number: "Numerologie" },
    tabBlurb: {
      saju: "Wie der Himmelsstamm und Erdzweig des heutigen Tagespfeilers Ihren Tagesherrscher prägt",
      sukuyo: "Wo das heutige der 27 Mondhäuser im Verhältnis zu Ihrem Geburtsstern liegt",
      vedic: "Das heutige Panchanga anhand der tatsächlichen siderischen Position des Mondes",
      number: "Ihre persönliche Tageszahl aus Geburtsmonat und -tag plus heutigem Datum",
    },
    navAriaLabel: "Navigation für das heutige Horoskop",
    backButtonLabel: "Zurück",
    backButtonAriaLabel: "Zur vorherigen Seite",
    homeButtonLabel: "Startseite",
    noVerdictLabel: "Der allgemeine Fluss des heutigen Tages",
    scoreSuffix: (score) => `${score} Pkt.`,
    cardDelayedFallback: (label) => `Die Berechnung für ${label} verzögert sich kurz. Die anderen Lesungen sind weiterhin verfügbar; ein Neuladen versucht es erneut.`,
    heroTitle: "Das Horoskop von Heute",
    heroLead: "Saju-Tagespfeiler, die 27 Sukuyo-Mondhäuser, das vedische Panchanga und Ihr numerologischer persönlicher Tag — vier Systeme lesen den heutigen Tag auf ihre eigene Weise. Kostenlos, keine Anmeldung nötig.",
    tabsAriaLabel: "Heutiges Horoskopsystem wechseln",
    failedMessage: "Das heutige Horoskop konnte nicht berechnet werden. Bitte versuchen Sie es gleich noch einmal.",
    retryButton: "Erneut versuchen",
    profileNudgePrefix: "Was Sie jetzt sehen, ist ",
    profileNudgeBold: "der allgemeine Tagesfluss, der nur durch das Datum bestimmt wird",
    profileNudgeSuffix: ". Fügen Sie Ihr Geburtsdatum zu Ihrer Profilkarte hinzu, und wir vergleichen den heutigen Tag mit Ihrem Tagesherrscher und Geburtsstern, um Ihnen zu sagen, ob es ein günstiger oder ein Vorsichtstag ist.",
    profileCreateLink: "Profil erstellen",
    shareButtonBusy: "Bild wird erstellt...",
    shareButtonIdle: (label) => `📸 ${label}-Ergebnis teilen`,
    shareSheetTitle: "Das Horoskop von Heute",
    shareSheetText: "Schauen Sie sich das heutige Horoskop an.",
    deeperHeading: "Tiefer einsteigen",
    deeperLead: "Wenn Sie statt nur heute Ihr angeborenes Geburtshoroskop sehen möchten, geht es unten weiter.",
    deeperLinkTitle: ["Sukuyo-Kalender", "Nakshatra-Kodex", "Ziwei-Karte"],
    deeperLinkDesc: [
      "Sehen Sie den Fluss der 27 Mondhäuser dieses Monats auf einen Blick.",
      "Lesen Sie Ihren Geburtsstern nach östlichem und indischem System.",
      "Sehen Sie die Karte Ihrer 12 angeborenen Häuser, nicht nur die von heute.",
    ],
  },
  nl: {
    tabLabel: { saju: "Saju", sukuyo: "Sukuyo", vedic: "Vedisch", number: "Numerologie" },
    tabBlurb: {
      saju: "Hoe de hemelse stam en aardse tak van de dagpilaar van vandaag uw dagheerser vormt",
      sukuyo: "Waar het maanhuis waar de Maan vandaag verblijft zich verhoudt tot uw geboortester",
      vedic: "De panchanga van vandaag gelezen uit de werkelijke siderische positie van de Maan",
      number: "Je persoonlijke dagnummer uit geboortemaand en -dag plus de datum van vandaag",
    },
    navAriaLabel: "Navigatie voor de fortuin van vandaag",
    backButtonLabel: "Terug",
    backButtonAriaLabel: "Ga naar vorige pagina",
    homeButtonLabel: "Home",
    noVerdictLabel: "De algemene stroom van vandaag",
    scoreSuffix: (score) => `${score} pt`,
    cardDelayedFallback: (label) => `De berekening voor ${label} loopt even vertraging op. De andere lezingen blijven gewoon beschikbaar; verversen probeert het opnieuw.`,
    heroTitle: "De Fortuin van Vandaag",
    heroLead: "Saju-dagpilaar, de 27 Sukuyo-maanhuizen, de Vedische panchanga en je numerologische persoonlijke dag — vier systemen lezen vandaag elk op hun eigen manier. Gratis, geen inloggen nodig.",
    tabsAriaLabel: "Wissel van systeem voor de fortuin van vandaag",
    failedMessage: "Kon de fortuin van vandaag niet berekenen. Probeer het over een moment opnieuw.",
    retryButton: "Opnieuw proberen",
    profileNudgePrefix: "Wat u nu ziet is ",
    profileNudgeBold: "de algemene stroom van de dag, alleen bepaald door de datum",
    profileNudgeSuffix: ". Voeg uw geboortedatum toe aan uw profielkaart en we wegen vandaag af tegen uw dagheerser en geboortester om te zeggen of het een gunstige dag of een voorzichtigheidsdag is.",
    profileCreateLink: "Profiel aanmaken",
    shareButtonBusy: "Afbeelding maken...",
    shareButtonIdle: (label) => `📸 Deel ${label}-resultaat`,
    shareSheetTitle: "De Fortuin van Vandaag",
    shareSheetText: "Bekijk de fortuin van vandaag.",
    deeperHeading: "Dieper bekijken",
    deeperLead: "Als u niet alleen vandaag maar uw aangeboren horoscoop wilt zien, ga dan hieronder verder.",
    deeperLinkTitle: ["Sukuyo-kalender", "Nakshatra-codex", "Ziwei-kaart"],
    deeperLinkDesc: [
      "Bekijk in één oogopslag de stroom van de 27 maanhuizen deze maand.",
      "Lees uw geboortester volgens zowel het Oosterse als het Indiase systeem.",
      "Bekijk de kaart van uw 12 aangeboren huizen, niet alleen die van vandaag.",
    ],
  },
  ms: {
    tabLabel: { saju: "Saju", sukuyo: "Sukuyo", vedic: "Veda", number: "Numerologi" },
    tabBlurb: {
      saju: "Bagaimana batang langit dan cabang bumi tiang hari ini membentuk penguasa hari anda",
      sukuyo: "Kedudukan salah satu daripada 27 rumah bulan hari ini berbanding bintang kelahiran anda",
      vedic: "Panchanga hari ini berdasarkan kedudukan sideral sebenar Bulan",
      number: "Nombor Hari Peribadi daripada bulan dan hari lahir ditambah tarikh hari ini",
    },
    navAriaLabel: "Navigasi tuah hari ini",
    backButtonLabel: "Kembali",
    backButtonAriaLabel: "Pergi ke halaman sebelumnya",
    homeButtonLabel: "Laman utama",
    noVerdictLabel: "Aliran keseluruhan hari ini",
    scoreSuffix: (score) => `${score} mata`,
    cardDelayedFallback: (label) => `Pengiraan ${label} tertangguh sebentar. Tilikan lain masih boleh dilihat seperti biasa, muat semula untuk cuba lagi.`,
    heroTitle: "Tuah Hari Ini",
    heroLead: "Tiang hari Saju, 27 rumah Sukuyo, panchanga Veda, Hari Peribadi numerologi — empat sistem membaca hari ini dengan cara masing-masing. Percuma, tanpa perlu log masuk.",
    tabsAriaLabel: "Tukar sistem tuah hari ini",
    failedMessage: "Tidak dapat mengira tuah hari ini. Sila cuba lagi sebentar lagi.",
    retryButton: "Cuba lagi",
    profileNudgePrefix: "Apa yang anda lihat sekarang ialah ",
    profileNudgeBold: "aliran keseluruhan hari yang ditentukan hanya oleh tarikh",
    profileNudgeSuffix: ". Tambahkan tarikh lahir anda pada kad profil dan kami akan membandingkan hari ini dengan penguasa hari dan bintang kelahiran anda untuk memberitahu sama ada ini hari bertuah atau hari perlu berhati-hati.",
    profileCreateLink: "Cipta profil",
    shareButtonBusy: "Sedang mencipta imej...",
    shareButtonIdle: (label) => `📸 Kongsi keputusan ${label}`,
    shareSheetTitle: "Tuah Hari Ini",
    shareSheetText: "Lihat tuah hari ini.",
    deeperHeading: "Lihat dengan lebih mendalam",
    deeperLead: "Jika anda ingin melihat carta kelahiran anda dan bukan sekadar hari ini, teruskan di bawah.",
    deeperLinkTitle: ["Kalendar Sukuyo", "Kodeks Nakshatra", "Carta Ziwei"],
    deeperLinkDesc: [
      "Lihat aliran 27 rumah bulan ini sekilas pandang.",
      "Baca bintang kelahiran anda mengikut sistem Timur dan India.",
      "Lihat carta 12 rumah kelahiran anda, bukan sekadar hari ini.",
    ],
  },
};

// 프로필 카드가 없는 방문자가 수비학 탭에서 생년월일만 넣는 폼. 저작 로케일만 두고 나머지는 영어로 떨어진다.
type NumberGuestCopy = { lead: string; label: string; submit: string; busy: string; failed: string };

const NUMBER_GUEST_COPY_EN: NumberGuestCopy = {
  lead: "No profile card? Enter your birth date to see today's Personal Day number.",
  label: "Birth date (solar calendar)",
  submit: "Show my number",
  busy: "Calculating...",
  failed: "Couldn't calculate. Check the date and try again.",
};

const NUMBER_GUEST_COPY: Partial<Record<LoadingLocale, NumberGuestCopy>> = {
  ko: {
    lead: "프로필 카드가 없어도 생년월일만 넣으면 오늘 내 개인일수를 바로 계산합니다.",
    label: "생년월일(양력)",
    submit: "내 수 보기",
    busy: "계산 중…",
    failed: "계산하지 못했습니다. 날짜를 확인하고 다시 시도해 주세요.",
  },
  en: NUMBER_GUEST_COPY_EN,
  ja: {
    lead: "プロフィールカードがなくても、生年月日を入れるだけで今日のパーソナルデイ数を計算します。",
    label: "生年月日（新暦）",
    submit: "自分の数を見る",
    busy: "計算中…",
    failed: "計算できませんでした。日付を確認してもう一度お試しください。",
  },
  "zh-CN": {
    lead: "没有档案卡也可以，输入出生日期即可算出今天的个人日数。",
    label: "出生日期（公历）",
    submit: "查看我的数字",
    busy: "计算中…",
    failed: "无法计算。请确认日期后重试。",
  },
  "zh-TW": {
    lead: "沒有檔案卡也可以，輸入出生日期即可算出今天的個人日數。",
    label: "出生日期（國曆）",
    submit: "查看我的數字",
    busy: "計算中…",
    failed: "無法計算。請確認日期後重試。",
  },
};

function getTodayHubCopy(locale: LoadingLocale): TodayHubCopy {
  return TODAY_HUB_COPY[locale] || TODAY_HUB_COPY_EN;
}

function useTodayHubCopy(): { copy: TodayHubCopy; locale: LoadingLocale } {
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
  return { copy: getTodayHubCopy(locale), locale };
}

type TodayLoadingCopy = {
  title: string;
  lead: string;
  imageAlt: string;
  detailSummary: (label: string) => string;
  detailLoading: string;
  detailFailed: string;
};

const TODAY_LOADING_COPY_EN: TodayLoadingCopy = {
  title: "Yeoni is warming today's flow.",
  lead: "Saju, Sukuyo, Vedic astrology, and numerology are opening in order.",
  imageAlt: "Flower pig Yeoni guiding today's fortune",
  detailSummary: (label) => `Open ${label} details`,
  detailLoading: "Loading the detailed flow...",
  detailFailed: "The details are taking longer than usual. Close and open this section to try again.",
};

const TODAY_LOADING_COPY: Partial<Record<LoadingLocale, TodayLoadingCopy>> = {
  ko: {
    title: "연이가 오늘의 흐름을 데우고 있어요.",
    lead: "사주·숙요·베다·수비학을 차례로 펼치는 중이에요.",
    imageAlt: "오늘의 운세를 안내하는 꽃돼지 연이",
    detailSummary: (label) => `${label} 상세 흐름 보기`,
    detailLoading: "상세 흐름을 불러오는 중이에요.",
    detailFailed: "상세 흐름이 조금 늦어지고 있어요. 닫았다 다시 열면 한 번 더 불러옵니다.",
  },
  en: TODAY_LOADING_COPY_EN,
  ja: {
    title: "ヨニが今日の流れを温めています。",
    lead: "四柱推命・宿曜・ヴェーダ・数秘術を順番に開いています。",
    imageAlt: "今日の運勢を案内する花豚ヨニ",
    detailSummary: (label) => `${label}の詳細を見る`,
    detailLoading: "詳しい流れを読み込んでいます。",
    detailFailed: "詳細の読み込みが少し遅れています。閉じてもう一度開くと再試行します。",
  },
  "zh-CN": {
    title: "Yeoni 正在温热今天的气流。",
    lead: "四柱、宿曜、吠陀占星和数字命理正在依次展开。",
    imageAlt: "正在引导今日运势的花猪 Yeoni",
    detailSummary: (label) => `查看${label}详情`,
    detailLoading: "正在加载详细走势。",
    detailFailed: "详细内容稍有延迟。关闭后再次展开即可重试。",
  },
  "zh-TW": {
    title: "Yeoni 正在溫熱今天的氣流。",
    lead: "四柱、宿曜、吠陀占星與數字命理正在依序展開。",
    imageAlt: "正在引導今日運勢的花豬 Yeoni",
    detailSummary: (label) => `查看${label}詳情`,
    detailLoading: "正在載入詳細走勢。",
    detailFailed: "詳細內容稍有延遲。關閉後再次展開即可重試。",
  },
};

function getTodayLoadingCopy(locale: LoadingLocale): TodayLoadingCopy {
  return TODAY_LOADING_COPY[locale] || TODAY_LOADING_COPY_EN;
}

function mergeHubDetail(current: HubResponse | null, detail: HubResponse): HubResponse {
  if (!current) return detail;
  const systems: Partial<Record<TodaySystem, SystemCard | null>> = { ...current.systems };
  for (const tab of TAB_KEYS) {
    const detailCard = detail.systems[tab.key];
    if (!detailCard) continue;
    const currentCard = systems[tab.key];
    systems[tab.key] = currentCard
      ? { ...currentCard, sections: detailCard.sections || currentCard.sections }
      : detailCard;
  }
  return { ...current, systems };
}

// 셸 렌더러(index.html)와 같은 등급→톤 매핑. 두 화면이 다른 색으로 같은 등급을 말하면 안 된다.
const TIER_TONE: Record<string, "good" | "pivot" | "warn"> = {
  "great-auspicious": "good",
  auspicious: "good",
  pivotal: "pivot",
  caution: "warn",
  "great-caution": "warn",
};

const TONE_CLASS: Record<string, string> = {
  good: "border-emerald-300/40 bg-emerald-400/12 text-emerald-100",
  pivot: "border-amber-300/40 bg-amber-400/12 text-amber-100",
  warn: "border-rose-300/40 bg-rose-400/12 text-rose-100",
};

const TONE_MARK: Record<string, string> = { good: "●", pivot: "◐", warn: "○" };

const DEEPER_LINKS = [
  { href: "/sukuyo/calendar", emoji: "🌙" },
  { href: "/nakshatra", emoji: "🕉️" },
  { href: "/ziwei/chart", emoji: "🟣" },
] as const;

function formatKstDate(now: Date): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${kst.getUTCFullYear()}년 ${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 ${days[kst.getUTCDay()]}요일`;
}

function TopNav({ copy }: { copy: TodayHubCopy }) {
  const goBack = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.history.length <= 1) {
      hardNavigateToShellHome();
      return;
    }
    const startPath = `${window.location.pathname}${window.location.search}`;
    window.history.back();
    // SPA 라우팅이라 back 이 먹히지 않는 경우가 있어 짧게 확인 후 홈으로 폴백한다.
    window.setTimeout(() => {
      if (`${window.location.pathname}${window.location.search}` === startPath) hardNavigateToShellHome();
    }, 240);
  }, []);

  const buttonClass =
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/16 bg-white/[0.06] px-4 text-[13px] font-bold text-slate-100 backdrop-blur-md transition-colors hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70";

  return (
    <nav aria-label={copy.navAriaLabel} className="flex items-center gap-2">
      <button type="button" onClick={goBack} className={`${buttonClass} min-w-11 px-3`} aria-label={copy.backButtonAriaLabel}>
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        <span className="hidden sm:inline">{copy.backButtonLabel}</span>
      </button>
      <button type="button" onClick={() => hardNavigateToShellHome()} className={buttonClass}>
        <Home aria-hidden="true" className="h-4 w-4" />{copy.homeButtonLabel}
      </button>
    </nav>
  );
}

function TodayLoadingPanel({ locale }: { locale: LoadingLocale }) {
  const loadingCopy = getTodayLoadingCopy(locale);
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="relative min-h-[18rem] overflow-hidden rounded-3xl border border-rose-200/20 bg-[linear-gradient(135deg,rgba(58,14,40,.74),rgba(20,10,31,.92))] p-5 text-rose-50 shadow-[0_18px_48px_rgba(0,0,0,.32)] sm:min-h-[17rem] sm:p-6"
    >
      <div aria-hidden="true" className="absolute inset-x-8 top-6 h-20 rounded-full bg-rose-200/10 blur-3xl" />
      <div className="relative flex min-h-[14rem] flex-col items-center justify-center gap-4 text-center sm:flex-row sm:justify-start sm:text-left">
        <div className="relative h-28 w-28 shrink-0 sm:h-36 sm:w-36">
          <div aria-hidden="true" className="absolute inset-4 rounded-full bg-rose-200/20 blur-2xl" />
          <Image
            src={TODAY_LOADING_IMAGE}
            alt={loadingCopy.imageAlt}
            width={256}
            height={256}
            priority
            className="relative h-full w-full object-contain drop-shadow-[0_14px_22px_rgba(0,0,0,.28)]"
            sizes="(max-width: 640px) 112px, 144px"
          />
        </div>
        <div className="max-w-md">
          <p className="break-keep text-lg font-black leading-8 text-white sm:text-xl">{loadingCopy.title}</p>
          <p className="mt-2 break-keep text-sm leading-7 text-rose-100/90">{loadingCopy.lead}</p>
          <div aria-hidden="true" className="mt-4 flex justify-center gap-2 sm:justify-start">
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-200" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-200 [animation-delay:120ms]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-100 [animation-delay:240ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function VerdictBadge({ card, copy }: { card: SystemCard; copy: TodayHubCopy }) {
  if (!card.tierLabel || card.score == null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/16 bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-200">
        <span aria-hidden="true">◇</span>
        {copy.noVerdictLabel}
      </span>
    );
  }
  const tone = TIER_TONE[card.tier || ""] || "pivot";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${TONE_CLASS[tone]}`}>
      <span aria-hidden="true">{TONE_MARK[tone]}</span>
      {card.tierLabel}
      <span className="opacity-80">{copy.scoreSuffix(card.score)}</span>
    </span>
  );
}

function SectionBlock({ section }: { section: DetailSection }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <h3 className="break-keep text-sm font-extrabold tracking-tight text-amber-200">{section.title}</h3>
      {section.items && section.items.length > 0 && (
        <dl className="mt-3 space-y-3">
          {section.items.map((item) => (
            <div key={`${item.label}-${item.value}`} className="grid gap-1 sm:grid-cols-[8.5rem_1fr] sm:gap-3">
              <dt className="break-keep text-xs font-bold leading-6 text-slate-400">{item.label}</dt>
              <dd className="break-keep text-sm leading-7 text-slate-100">
                <span className="font-semibold">{item.value}</span>
                {item.note && <span className="mt-0.5 block text-[13px] leading-6 text-slate-400">{item.note}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {section.lines && section.lines.length > 0 && (
        <ul className="mt-3 space-y-2">
          {section.lines.map((line) => (
            <li key={line} className="flex gap-2.5 break-keep text-sm leading-7 text-slate-200">
              <span aria-hidden="true" className="mt-3 h-1 w-1 shrink-0 rounded-full bg-amber-300/70" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CardPanel({
  card,
  tabLabel,
  copy,
  locale,
  detailState,
  onDetailsOpen,
}: {
  card: SystemCard | null | undefined;
  tabLabel: string;
  copy: TodayHubCopy;
  locale: LoadingLocale;
  detailState: DetailLoadState;
  onDetailsOpen?: (system: TodaySystem) => void;
}) {
  if (!card) {
    return (
      <p className="break-keep rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-6 text-sm leading-7 text-slate-300">
        {copy.cardDelayedFallback(tabLabel)}
      </p>
    );
  }
  const loadingCopy = getTodayLoadingCopy(locale);
  const hasSections = Boolean(card.sections?.length);
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/12 bg-white/[0.05] p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold tracking-tight text-rose-200">{card.anchor}</p>
          <span className="ml-auto">
            <VerdictBadge card={card} copy={copy} />
          </span>
        </div>
        <h2 className="mt-3 break-keep text-lg font-black leading-8 text-white sm:text-xl">{card.headline}</h2>
        <p className="mt-2 max-w-[64ch] break-keep text-sm leading-7 text-slate-200">{card.body}</p>
        {card.detail && <p className="mt-3 break-keep text-xs leading-6 text-slate-400">{card.detail}</p>}
        {card.highlights.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {card.highlights.map((highlight) => (
              <li
                key={highlight}
                className="break-keep rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold leading-5 text-amber-100"
              >
                {highlight}
              </li>
            ))}
          </ul>
        )}
      </div>
      <details
        className="rounded-2xl border border-white/15 bg-white/[0.025] p-4"
        onToggle={(event) => {
          if (event.currentTarget.open && !hasSections) onDetailsOpen?.(card.system);
        }}
      >
        <summary className="cursor-pointer break-keep text-sm font-bold text-slate-100">
          {loadingCopy.detailSummary(tabLabel)}
        </summary>
        {hasSections ? (
          <div className="mt-4 space-y-4">{(card.sections || []).map((section) => (
            <SectionBlock key={section.key} section={section} />
          ))}</div>
        ) : detailState === "failed" ? (
          <p role="alert" className="mt-4 break-keep rounded-xl border border-rose-200/20 bg-rose-400/10 px-4 py-3 text-sm leading-7 text-rose-50">
            {loadingCopy.detailFailed}
          </p>
        ) : (
          <p role="status" aria-live="polite" className="mt-4 break-keep rounded-xl border border-amber-200/20 bg-amber-400/10 px-4 py-3 text-sm leading-7 text-amber-50">
            {loadingCopy.detailLoading}
          </p>
        )}
      </details>
    </div>
  );
}

export default function TodayHubClient({ children, dailyTarotCards }: { children?: ReactNode; dailyTarotCards?: DailyTarotCard[] }) {
  const { copy, locale } = useTodayHubCopy();
  const { seed, seedVersion } = useAiProfileSeed();
  // 마운트 후에만 계산한다(정적 빌드에 날짜가 굳는 것을 막고, 자정을 넘겨도 새로고침이면 갱신된다).
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);

  const [data, setData] = useState<HubResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState<TodaySystem>("saju");
  const [reloadToken, setReloadToken] = useState(0);
  // ?tab=saju|sukuyo|vedic|number — Threads 유형별 글이 해당 탭으로 바로 데려온다. 정적 셸이라 마운트 후에 읽는다.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    const match = TAB_KEYS.find((tab) => tab.key === requested);
    if (match) setActive(match.key);
  }, []);

  const summaryQuery = useMemo(() => {
    const params = new URLSearchParams({ locale });
    if (seed?.birthDate) {
      params.set("birth", seed.birthDate);
      if (seed.birthTime && !seed.birthTimeUnknown) params.set("time", seed.birthTime);
      params.set("cal", seed.calendarType === "lunar" ? "lunar" : "solar");
      params.set("gender", seed.gender === "male" ? "male" : "female");
    }
    return params.toString();
  }, [locale, seed?.birthDate, seed?.birthTime, seed?.birthTimeUnknown, seed?.calendarType, seed?.gender]);

  const [detailState, setDetailState] = useState<Partial<Record<TodaySystem, DetailLoadState>>>({});
  const requestSeq = useRef(0);
  const detailControllers = useRef<Partial<Record<TodaySystem, AbortController>>>({});
  useEffect(() => {
    return () => {
      requestSeq.current++;
      Object.values(detailControllers.current).forEach((item) => item?.abort());
      detailControllers.current = {};
    };
  }, []);

  useEffect(() => {
    if (!now) return undefined;
    const seq = ++requestSeq.current;
    const controller = new AbortController();
    setFailed(false);
    setData(null);
    setDetailState({});
    setGuestCard(null);
    Object.values(detailControllers.current).forEach((item) => item?.abort());
    detailControllers.current = {};
    fetch(getApiUrl(`/api/fortune/today-hub?${summaryQuery}`), {
      credentials: "omit",
      headers: { "x-code-destiny-locale": locale },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`http_${res.status}`);
        return res.json();
      })
      .then((payload: HubResponse) => {
        if (seq !== requestSeq.current) return;
        if (!payload?.ok) throw new Error("not_ok");
        setData(payload);
      })
      .catch((error) => {
        if (error?.name === "AbortError" || seq !== requestSeq.current) return;
        setFailed(true);
      });
    return () => {
      controller.abort();
    };
    // seedVersion 은 프로필 카드가 뒤늦게 도착했을 때(로그인 사용자의 서버 동기화) 다시 계산하려고 둔다.
  }, [locale, now, summaryQuery, seedVersion, reloadToken]);

  // 프로필 카드가 없는 방문자의 수비학 입력. only=number 라 다른 점술은 이 입력으로 개인화되지 않고,
  // 서버는 생년이 실린 요청을 공개 캐시에 올리지 않는다. 입력값은 이 화면 상태에만 두고 저장하지 않는다.
  const guestCopy = NUMBER_GUEST_COPY[locale] || NUMBER_GUEST_COPY_EN;
  const [guestBirth, setGuestBirth] = useState("");
  const [guestCard, setGuestCard] = useState<SystemCard | null>(null);
  const [guestState, setGuestState] = useState<"idle" | "busy" | "failed">("idle");
  const submitGuestBirth = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(guestBirth) || guestState === "busy") return;
    setGuestState("busy");
    const params = new URLSearchParams({ detail: "1", locale, birth: guestBirth, only: "number" });
    fetch(getApiUrl(`/api/fortune/today-hub?${params.toString()}`), { credentials: "omit", headers: { "x-code-destiny-locale": locale } })
      .then((res) => {
        if (!res.ok) throw new Error(`http_${res.status}`);
        return res.json();
      })
      .then((payload: HubResponse) => {
        const card = payload?.ok ? payload.systems.number : null;
        if (!card) throw new Error("no_card");
        setGuestCard(card);
        setGuestState("idle");
      })
      .catch(() => setGuestState("failed"));
  }, [guestBirth, guestState, locale]);

  const loadDetails = useCallback((system: TodaySystem) => {
    const card = data?.systems[system];
    if (!card || card.sections?.length || detailState[system] === "loading" || detailState[system] === "loaded") return;
    const seq = requestSeq.current;
    detailControllers.current[system]?.abort();
    const controller = new AbortController();
    detailControllers.current[system] = controller;
    setDetailState((current) => ({ ...current, [system]: "loading" }));

    const params = new URLSearchParams(summaryQuery);
    params.set("detail", "1");
    fetch(getApiUrl(`/api/fortune/today-hub?${params.toString()}`), {
      credentials: "omit",
      headers: { "x-code-destiny-locale": locale },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`http_${res.status}`);
        return res.json();
      })
      .then((payload: HubResponse) => {
        if (seq !== requestSeq.current) return;
        if (!payload?.ok) throw new Error("not_ok");
        const detailedCard = payload.systems[system];
        if (!detailedCard?.sections?.length) throw new Error("no_sections");
        setData((current) => mergeHubDetail(current, payload));
        setDetailState((current) => ({ ...current, [system]: "loaded" }));
      })
      .catch((error) => {
        if (error?.name === "AbortError" || seq !== requestSeq.current) return;
        setDetailState((current) => ({ ...current, [system]: "failed" }));
      })
      .finally(() => {
        if (detailControllers.current[system] === controller) delete detailControllers.current[system];
      });
  }, [data, detailState, locale, summaryQuery]);

  // 탭 화살표 이동 — 홈 셸의 허브와 같은 WAI-ARIA roving tabindex 규칙.
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const moveTab = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = TAB_KEYS.findIndex((tab) => tab.key === active);
    const next = TAB_KEYS[(index + step + TAB_KEYS.length) % TAB_KEYS.length];
    setActive(next.key);
    tabRefs.current[next.key]?.focus();
  }, [active]);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const [sharing, setSharing] = useState(false);
  const share = useCallback(async () => {
    const node = panelRef.current;
    if (!node || sharing) return;
    setSharing(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(node, { backgroundColor: "#070A11", scale: 2, useCORS: true });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("capture failed");
      const file = new File([blob], "today-fortune.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: copy.shareSheetTitle, text: copy.shareSheetText });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "today-fortune.png";
        anchor.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // 사용자가 공유 시트를 닫은 경우까지 오류로 알리지 않는다
    } finally {
      setSharing(false);
    }
  }, [sharing, copy]);

  const personalized = Boolean(data?.personalized);
  const showGuestForm = active === "number" && Boolean(data) && !personalized;
  const panelCardIsGuest = showGuestForm && Boolean(guestCard);
  const panelCard = panelCardIsGuest && guestCard ? guestCard : data?.systems[active];
  const activeTabKey = TAB_KEYS.find((tab) => tab.key === active) || TAB_KEYS[0];
  const activeTab = { ...activeTabKey, label: copy.tabLabel[activeTabKey.key], blurb: copy.tabBlurb[activeTabKey.key] };

  return (
    <main className="relative min-h-[100dvh] bg-[#070A11] pb-28 text-slate-100">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[600px] w-[1100px] -translate-x-1/2 bg-gradient-to-b from-purple-900/25 via-indigo-900/15 to-transparent opacity-80 blur-3xl" />
        <div className="absolute right-0 top-[500px] h-[600px] w-[600px] rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 pt-[calc(env(safe-area-inset-top,0px)+14px)] sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <TopNav copy={copy} />
          <p className="break-keep text-right text-xs font-bold leading-5 text-amber-300 sm:text-sm">
            {now ? formatKstDate(now) : " "}
          </p>
        </div>

        <header className="mt-8 text-center sm:mt-12">
          <h1 className="mt-5 text-3xl font-black tracking-tight text-white drop-shadow-md sm:text-5xl">{locale === "ko" ? "연이와 오늘을 펼쳐요" : copy.heroTitle}</h1>
          <p className="mx-auto mt-4 max-w-2xl break-keep text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
            {locale === "ko" ? "오늘의 운세로 흐름을 살피고, 세 장의 카드에서 마음에 남는 실천 하나를 찾아보세요. 무료로, 로그인 없이 시작할 수 있어요." : copy.heroLead}
          </p>
          {locale === "ko" && dailyTarotCards && <a href="#daily-tarot" className="mt-5 inline-flex min-h-12 items-center rounded-full bg-rose-200 px-6 py-3 font-bold text-rose-950 hover:bg-rose-100">오늘의 세 장 펼치기</a>}
        </header>

        {/* 탭 */}
        <div role="tablist" aria-label={copy.tabsAriaLabel} className="mt-8 grid grid-cols-2 gap-2 rounded-2xl sm:grid-cols-4 border border-white/10 bg-white/[0.04] p-1.5">
          {TAB_KEYS.map((tab) => {
            const selected = tab.key === active;
            return (
              <button
                key={tab.key}
                ref={(node) => {
                  tabRefs.current[tab.key] = node;
                }}
                type="button"
                role="tab"
                id={`today-tab-${tab.key}`}
                aria-selected={selected}
                aria-controls={`today-panel-${tab.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(tab.key)}
                onKeyDown={moveTab}
                className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-bold transition-colors ${
                  selected ? "bg-amber-400/20 text-amber-100" : "text-slate-300 hover:bg-white/[0.06]"
                }`}
              >
                <span aria-hidden="true">{tab.emoji}</span>
                {copy.tabLabel[tab.key]}
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 break-keep text-center text-xs leading-6 text-slate-400">{activeTab.blurb}</p>

        {showGuestForm && (
          <form onSubmit={submitGuestBirth} className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="break-keep text-sm leading-7 text-slate-200">{guestCopy.lead}</p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-bold text-slate-400">
                {guestCopy.label}
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="bday"
                  placeholder="YYYY-MM-DD"
                  maxLength={10}
                  required
                  value={guestBirth}
                  onChange={(event) => setGuestBirth(maskBirthDateInput(event.target.value))}
                  className="min-h-11 rounded-xl border border-white/16 bg-white/[0.06] px-3 text-sm font-semibold text-slate-100 placeholder:text-slate-500"
                />
              </label>
              <button
                type="submit"
                disabled={guestState === "busy"}
                aria-busy={guestState === "busy"}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10 px-5 text-sm font-bold text-amber-200 transition-colors hover:border-amber-400/70 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guestState === "busy" ? guestCopy.busy : guestCopy.submit}
              </button>
            </div>
            {guestState === "failed" && <p role="alert" className="mt-2 break-keep text-xs leading-6 text-rose-200">{guestCopy.failed}</p>}
          </form>
        )}

        {/* 결과 */}
        <div
          ref={panelRef}
          role="tabpanel"
          id={`today-panel-${active}`}
          aria-labelledby={`today-tab-${active}`}
          aria-live="polite"
          className="mt-5"
        >
          {failed ? (
            <div className="rounded-3xl border border-rose-300/25 bg-rose-400/10 px-5 py-6">
              <p className="break-keep text-sm leading-7 text-rose-50">
                {copy.failedMessage}
              </p>
              <button
                type="button"
                onClick={() => setReloadToken((token) => token + 1)}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-rose-200/40 bg-rose-400/15 px-5 text-sm font-bold text-rose-50 transition-colors hover:bg-rose-400/25"
              >
                {copy.retryButton}
              </button>
            </div>
          ) : data ? (
            <CardPanel
              card={panelCard}
              tabLabel={activeTab.label}
              copy={copy}
              locale={locale}
              detailState={panelCardIsGuest ? "loaded" : detailState[active] || "idle"}
              onDetailsOpen={panelCardIsGuest ? undefined : loadDetails}
            />
          ) : (
            <TodayLoadingPanel locale={locale} />
          )}
        </div>

        {/* 프로필 유도 — 날짜 기반 값은 이미 위에 나와 있고, 여기서 개인 판정을 권한다. */}
        {data && !personalized && (
          <p className="mt-6 break-keep rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm leading-7 text-rose-50">
            {copy.profileNudgePrefix}<strong className="font-bold">{copy.profileNudgeBold}</strong>{copy.profileNudgeSuffix}{" "}
            <Link href="/#dpMasterCard" className="font-bold text-rose-200 underline underline-offset-2">
              {copy.profileCreateLink}
            </Link>
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={share}
            disabled={!data || sharing}
            aria-busy={sharing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-6 text-sm font-bold text-amber-200 transition-colors hover:border-amber-400/70 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sharing ? copy.shareButtonBusy : copy.shareButtonIdle(activeTab.label)}
          </button>
        </div>

        {locale === "ko" && dailyTarotCards && <DailyTarot cards={dailyTarotCards}/>}
        {children}

        <h2 className="mt-16 break-keep text-lg font-extrabold text-white">{copy.deeperHeading}</h2>
        <p className="mt-1 break-keep text-sm leading-7 text-slate-400">
          {copy.deeperLead}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {DEEPER_LINKS.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col rounded-2xl border border-slate-700/60 bg-slate-900/80 p-5 transition-colors hover:border-amber-400/40 hover:bg-slate-800/80"
            >
              <span aria-hidden="true" className="text-lg">
                {item.emoji}
              </span>
              <span className="mt-1 text-sm font-extrabold text-slate-100">{copy.deeperLinkTitle[index]}</span>
              <span className="mt-1 break-keep text-xs leading-6 text-slate-400">{copy.deeperLinkDesc[index]}</span>
            </Link>
          ))}
        </div>

        {locale !== "ko" && <FusionCrossSell fromPath="/today" tone="neo" />}
      </div>
    </main>
  );
}
