"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, normalizeLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type QuestStep = {
  title: string;
  desc: string;
  icon: string;
  color: string;
};

type Recommendation = {
  icon: string;
  text: string;
};

type SelfEsteemCopy = {
  badge: string;
  h1: string;
  subtitle: string;
  heroLines: [string, string];
  benefitsTitle: string;
  benefits: string[];
  primaryCta: string;
  secondaryCta: string;
  infoText: string;
  imageAlt: string;
  imageBadge: string;
  overlayTitle: string;
  overlayLines: [string, string];
  stepsTitle: string;
  stepLabel: string;
  recommendationTitle: string;
  recommendations: Recommendation[];
  questSteps: QuestStep[];
};

const STEP_COLORS = [
  "from-blue-600 to-blue-400",
  "from-purple-600 to-purple-400",
  "from-red-600 to-pink-400",
  "from-green-600 to-emerald-400",
  "from-yellow-600 to-amber-400",
] as const;

const SELF_ESTEEM_COPY: Record<LoadingLocale, SelfEsteemCopy> = {
  ko: {
    badge: "무료 리딩 · SELF TRUST",
    h1: "자기 기준 회복 타로",
    subtitle: "다시 내 편에 서는 5카드 리딩",
    heroLines: [
      "타인의 시선에 오래 맞추느라 흐려진 마음의 선을 살피고,",
      "오늘 지킬 수 있는 작은 기준과 회복 문장을 다섯 장의 카드로 정리합니다.",
    ],
    benefitsTitle: "카드가 비추는 것",
    benefits: [
      "내 기준이 흐려지기 시작한 자리",
      "거절 앞에서 마음이 작아지는 이유",
      "지금 가장 크게 소모되는 감정의 지점",
      "오늘 다시 붙잡을 기준과 작은 회복 행동",
    ],
    primaryCta: "무료로 리딩 시작",
    secondaryCta: "홈으로 돌아가기",
    infoText: "추가 결제 없이 바로 열어 볼 수 있습니다.",
    imageAlt: "자기 기준 회복 타로 대표 이미지",
    imageBadge: "무료 배지",
    overlayTitle: "5카드 자기 기준 리딩",
    overlayLines: [
      "🌑 흔들림의 시작 → 🌙 거절 앞의 마음 → 〰️ 소모되는 지점",
      "🛡️ 나를 지키는 말 → ✨ 오늘의 기준",
    ],
    stepsTitle: "5단계 리딩 흐름",
    stepLabel: "단계",
    recommendationTitle: "이런 분께 추천합니다",
    recommendations: [
      { icon: "🌱", text: "최근 자신감이 떨어졌고 회복하고 싶은 분" },
      { icon: "🔍", text: "타인의 반응을 너무 오래 살피다 지친 분" },
      { icon: "🎯", text: "거절이나 부탁 앞에서 마음이 작아지는 분" },
      { icon: "🔄", text: "반복되는 자기검열의 흐름을 끊고 싶은 분" },
      { icon: "📈", text: "오늘 지킬 수 있는 작은 기준이 필요한 분" },
      { icon: "🔮", text: "타로 상징으로 마음의 흐름을 차분히 보고 싶은 분" },
    ],
    questSteps: [
      {
        title: "흔들림의 시작",
        desc: "내 기준이 흐려지기 시작한 사건과 마음의 습관을 살핍니다.",
        icon: "🌑",
        color: STEP_COLORS[0],
      },
      {
        title: "거절 앞의 마음",
        desc: "불안, 비교, 자기비난처럼 마음을 작게 만드는 흐름을 정리합니다.",
        icon: "🌙",
        color: STEP_COLORS[1],
      },
      {
        title: "소모되는 지점",
        desc: "지금 가장 많이 힘이 빠지는 감정과 관계 패턴을 읽습니다.",
        icon: "〰️",
        color: STEP_COLORS[2],
      },
      {
        title: "나를 지키는 말",
        desc: "실망을 두려워하면서도 내 기준을 지킬 수 있는 문장을 찾습니다.",
        icon: "🛡️",
        color: STEP_COLORS[3],
      },
      {
        title: "오늘의 기준",
        desc: "오늘 바로 붙잡을 작은 선택과 회복 행동으로 마무리합니다.",
        icon: "✨",
        color: STEP_COLORS[4],
      },
    ],
  },
  en: {
    badge: "Free Service · Free Quest",
    h1: "Self-Esteem Level Up",
    subtitle: "5-Card RPG Quest Tarot",
    heroLines: [
      "Read the exact coordinates of your current emotions,",
      "then receive practical missions for rebuilding self-esteem in a fully free tarot reading.",
    ],
    benefitsTitle: "What this tarot reveals",
    benefits: [
      "Your current self-esteem vitality level",
      "The real patterns draining your confidence",
      "Missions and routines you can practice today",
      "A growth plan and coaching direction for what comes next",
    ],
    primaryCta: "Start the Free Quest",
    secondaryCta: "Return Home",
    infoText: "100% free — all features available without extra payment",
    imageAlt: "Self-Esteem Level Up tarot hero image",
    imageBadge: "Free Badge",
    overlayTitle: "5-Card Growth Quest",
    overlayLines: [
      "📜 Check debuffs → 👹 Diagnose monsters → 💔 Measure damage",
      "🛡️ Gain a shield → ⭐ Complete the level up",
    ],
    stepsTitle: "5-Step Quest Flow",
    stepLabel: "Step",
    recommendationTitle: "Recommended for",
    recommendations: [
      { icon: "🌱", text: "Anyone whose confidence has recently dropped and wants to recover" },
      { icon: "🔍", text: "Anyone who wants an objective look at their emotional state" },
      { icon: "🎯", text: "Anyone who wants concrete actions they can take right now" },
      { icon: "🔄", text: "Anyone ready to break a repeated self-esteem slump" },
      { icon: "📈", text: "Anyone who wants to build a long-term growth plan" },
      { icon: "🔮", text: "Anyone who wants deeper insight through tarot symbolism" },
    ],
    questSteps: [
      {
        title: "Check Past Debuffs",
        desc: "Cards reveal the events and patterns that lowered your self-esteem.",
        icon: "📜",
        color: STEP_COLORS[0],
      },
      {
        title: "Diagnose Inner Monsters",
        desc: "Sort through the core blockers, such as anxiety, comparison, and self-criticism.",
        icon: "👹",
        color: STEP_COLORS[1],
      },
      {
        title: "Measure Current Damage",
        desc: "Read the stamina of your heart and your emotional condition step by step.",
        icon: "💔",
        color: STEP_COLORS[2],
      },
      {
        title: "Gain a Mind Shield",
        desc: "Receive recovery routines you can use immediately today.",
        icon: "🛡️",
        color: STEP_COLORS[3],
      },
      {
        title: "Level-Up Mastery",
        desc: "Finish with a sustainable strategy for growing self-esteem.",
        icon: "⭐",
        color: STEP_COLORS[4],
      },
    ],
  },
  ja: {
    badge: "無料サービス · FREE QUEST",
    h1: "自己肯定感レベルアップ",
    subtitle: "5枚カードRPGクエストタロット",
    heroLines: [
      "今の感情がどこにあるのかをやさしく見つめ、",
      "自己肯定感を取り戻すための実践ミッションまで受け取れる完全無料のタロットリーディングです。",
    ],
    benefitsTitle: "このタロットでわかること",
    benefits: [
      "今の自己肯定感の体力レベル",
      "自信を下げている本当のパターン",
      "今日すぐに試せるミッションとルーティン",
      "これからの成長プランとコーチングの方向",
    ],
    primaryCta: "無料で占う",
    secondaryCta: "ホームへ戻る",
    infoText: "100%無料 — 追加決済なしで全機能をご利用いただけます",
    imageAlt: "自己肯定感レベルアップタロットのメイン画像",
    imageBadge: "無料バッジ",
    overlayTitle: "5枚カード成長クエスト",
    overlayLines: [
      "📜 デバフ確認 → 👹 モンスター診断 → 💔 ダメージ測定",
      "🛡️ シールド獲得 → ⭐ レベルアップ完成",
    ],
    stepsTitle: "5段階クエスト方式",
    stepLabel: "段階",
    recommendationTitle: "こんな方におすすめです",
    recommendations: [
      { icon: "🌱", text: "最近自信が下がり、もう一度整えたい方" },
      { icon: "🔍", text: "今の感情状態を客観的に見つめたい方" },
      { icon: "🎯", text: "今すぐ実践できる具体的な行動がほしい方" },
      { icon: "🔄", text: "自己肯定感が下がる繰り返しのパターンを抜けたい方" },
      { icon: "📈", text: "長く続く成長プランを立てたい方" },
      { icon: "🔮", text: "タロットの象徴から深く自分を理解したい方" },
    ],
    questSteps: [
      {
        title: "過去のデバフ確認",
        desc: "自己肯定感を下げた出来事やパターンをカードで見つめます。",
        icon: "📜",
        color: STEP_COLORS[0],
      },
      {
        title: "内なるモンスター診断",
        desc: "不安、比較、自己否定など、心を妨げる要因を整理します。",
        icon: "👹",
        color: STEP_COLORS[1],
      },
      {
        title: "現在のダメージ測定",
        desc: "今の心の体力と感情の状態を段階ごとに読み解きます。",
        icon: "💔",
        color: STEP_COLORS[2],
      },
      {
        title: "マインドシールド獲得",
        desc: "今日から使える回復の行動ルーティンを提案します。",
        icon: "🛡️",
        color: STEP_COLORS[3],
      },
      {
        title: "レベルアップ完成",
        desc: "続けやすい自己肯定感の成長戦略として整えます。",
        icon: "⭐",
        color: STEP_COLORS[4],
      },
    ],
  },
  "zh-CN": {
    badge: "免费服务 · FREE QUEST",
    h1: "自尊感升级",
    subtitle: "5张牌 RPG 任务塔罗",
    heroLines: [
      "准确看见你当下情绪所在的位置，",
      "并获得修复自尊感的实用任务，这是一套完全免费的塔罗解读。",
    ],
    benefitsTitle: "这组塔罗会告诉你",
    benefits: [
      "你当前的自尊感能量等级",
      "真正削弱自信的内在模式",
      "今天就能实践的任务与日常练习",
      "接下来的成长计划与指导方向",
    ],
    primaryCta: "免费开始任务",
    secondaryCta: "返回首页",
    infoText: "100% 免费 — 无需额外支付即可使用全部功能",
    imageAlt: "自尊感升级塔罗主视觉",
    imageBadge: "免费徽章",
    overlayTitle: "5张牌成长任务",
    overlayLines: [
      "📜 确认负面状态 → 👹 诊断内在怪物 → 💔 测量受伤程度",
      "🛡️ 获得护盾 → ⭐ 完成升级",
    ],
    stepsTitle: "5阶段任务方式",
    stepLabel: "阶段",
    recommendationTitle: "推荐给这样的你",
    recommendations: [
      { icon: "🌱", text: "最近自信下降，想慢慢恢复的人" },
      { icon: "🔍", text: "想客观看见自己情绪状态的人" },
      { icon: "🎯", text: "想获得现在就能实践的具体行动的人" },
      { icon: "🔄", text: "想打破自尊感反复下降模式的人" },
      { icon: "📈", text: "想建立长期成长计划的人" },
      { icon: "🔮", text: "想通过塔罗象征深入理解自己的人" },
    ],
    questSteps: [
      {
        title: "确认过去的负面状态",
        desc: "用牌面看见曾经削弱自尊感的事件与模式。",
        icon: "📜",
        color: STEP_COLORS[0],
      },
      {
        title: "诊断内在怪物",
        desc: "整理焦虑、比较、自我批评等核心阻碍。",
        icon: "👹",
        color: STEP_COLORS[1],
      },
      {
        title: "测量当前受伤程度",
        desc: "逐步读取此刻内心的体力与情绪状态。",
        icon: "💔",
        color: STEP_COLORS[2],
      },
      {
        title: "获得心灵护盾",
        desc: "给出今天就能使用的修复行动日常。",
        icon: "🛡️",
        color: STEP_COLORS[3],
      },
      {
        title: "完成升级",
        desc: "以可持续的自尊感成长策略完成整理。",
        icon: "⭐",
        color: STEP_COLORS[4],
      },
    ],
  },
  "zh-TW": {
    badge: "免費服務 · FREE QUEST",
    h1: "自尊感升級",
    subtitle: "5張牌 RPG 任務塔羅",
    heroLines: [
      "溫柔看見你當下情緒所在的位置，",
      "並取得修復自尊感的實用任務，這是一套完全免費的塔羅解讀。",
    ],
    benefitsTitle: "這組塔羅會告訴你",
    benefits: [
      "你目前的自尊感體力等級",
      "真正拉低自信的內在模式",
      "今天就能實踐的任務與日常練習",
      "接下來的成長計畫與引導方向",
    ],
    primaryCta: "免費開始任務",
    secondaryCta: "回到首頁",
    infoText: "100% 免費 — 無需額外付款即可使用全部功能",
    imageAlt: "自尊感升級塔羅主視覺",
    imageBadge: "免費徽章",
    overlayTitle: "5張牌成長任務",
    overlayLines: [
      "📜 確認負面狀態 → 👹 診斷內在怪物 → 💔 測量受傷程度",
      "🛡️ 獲得護盾 → ⭐ 完成升級",
    ],
    stepsTitle: "5階段任務方式",
    stepLabel: "階段",
    recommendationTitle: "推薦給這樣的你",
    recommendations: [
      { icon: "🌱", text: "最近自信下降，想慢慢恢復的人" },
      { icon: "🔍", text: "想客觀看見自己情緒狀態的人" },
      { icon: "🎯", text: "想取得現在就能實踐的具體行動的人" },
      { icon: "🔄", text: "想打破自尊感反覆下降模式的人" },
      { icon: "📈", text: "想建立長期成長計畫的人" },
      { icon: "🔮", text: "想透過塔羅象徵深入理解自己的人" },
    ],
    questSteps: [
      {
        title: "確認過去的負面狀態",
        desc: "用牌面看見曾經削弱自尊感的事件與模式。",
        icon: "📜",
        color: STEP_COLORS[0],
      },
      {
        title: "診斷內在怪物",
        desc: "整理焦慮、比較、自我批評等核心阻礙。",
        icon: "👹",
        color: STEP_COLORS[1],
      },
      {
        title: "測量目前受傷程度",
        desc: "逐步讀取此刻內心的體力與情緒狀態。",
        icon: "💔",
        color: STEP_COLORS[2],
      },
      {
        title: "獲得心靈護盾",
        desc: "給出今天就能使用的修復行動日常。",
        icon: "🛡️",
        color: STEP_COLORS[3],
      },
      {
        title: "完成升級",
        desc: "以可持續的自尊感成長策略完成整理。",
        icon: "⭐",
        color: STEP_COLORS[4],
      },
    ],
  },
  vi: {
    badge: "Dịch vụ miễn phí · FREE QUEST",
    h1: "Nâng cấp lòng tự trọng",
    subtitle: "Tarot nhiệm vụ RPG 5 lá",
    heroLines: [
      "Nhìn rõ vị trí cảm xúc hiện tại của bạn,",
      "rồi nhận các nhiệm vụ thực tế để phục hồi lòng tự trọng trong một trải bài tarot hoàn toàn miễn phí.",
    ],
    benefitsTitle: "Bài tarot này cho bạn thấy",
    benefits: [
      "Mức năng lượng hiện tại của lòng tự trọng",
      "Những khuôn mẫu thật sự làm suy yếu sự tự tin",
      "Nhiệm vụ và thói quen có thể thực hành ngay hôm nay",
      "Kế hoạch phát triển và hướng coaching tiếp theo",
    ],
    primaryCta: "Bắt đầu nhiệm vụ miễn phí",
    secondaryCta: "Về trang chủ",
    infoText: "Miễn phí 100% — dùng toàn bộ chức năng mà không cần thanh toán thêm",
    imageAlt: "Ảnh đại diện tarot nâng cấp lòng tự trọng",
    imageBadge: "Huy hiệu miễn phí",
    overlayTitle: "Nhiệm vụ trưởng thành 5 lá",
    overlayLines: [
      "📜 Kiểm tra hiệu ứng xấu → 👹 Chẩn đoán quái vật → 💔 Đo sát thương",
      "🛡️ Nhận khiên → ⭐ Hoàn tất nâng cấp",
    ],
    stepsTitle: "Cách đi qua 5 nhiệm vụ",
    stepLabel: "Bước",
    recommendationTitle: "Phù hợp với bạn nếu",
    recommendations: [
      { icon: "🌱", text: "Gần đây bạn mất tự tin và muốn phục hồi" },
      { icon: "🔍", text: "Bạn muốn nhìn trạng thái cảm xúc của mình khách quan hơn" },
      { icon: "🎯", text: "Bạn cần hành động cụ thể có thể làm ngay" },
      { icon: "🔄", text: "Bạn muốn thoát khỏi vòng lặp giảm lòng tự trọng" },
      { icon: "📈", text: "Bạn muốn xây dựng kế hoạch phát triển dài hạn" },
      { icon: "🔮", text: "Bạn muốn hiểu sâu hơn qua biểu tượng tarot" },
    ],
    questSteps: [
      {
        title: "Kiểm tra hiệu ứng xấu quá khứ",
        desc: "Các lá bài soi ra sự kiện và khuôn mẫu từng làm lòng tự trọng yếu đi.",
        icon: "📜",
        color: STEP_COLORS[0],
      },
      {
        title: "Chẩn đoán quái vật bên trong",
        desc: "Sắp xếp các yếu tố cản trở như lo âu, so sánh và tự chỉ trích.",
        icon: "👹",
        color: STEP_COLORS[1],
      },
      {
        title: "Đo sát thương hiện tại",
        desc: "Đọc từng tầng thể lực tinh thần và trạng thái cảm xúc lúc này.",
        icon: "💔",
        color: STEP_COLORS[2],
      },
      {
        title: "Nhận khiên tâm trí",
        desc: "Gợi ý thói quen hồi phục có thể dùng ngay trong hôm nay.",
        icon: "🛡️",
        color: STEP_COLORS[3],
      },
      {
        title: "Hoàn tất nâng cấp",
        desc: "Kết lại bằng một chiến lược nuôi dưỡng lòng tự trọng bền vững.",
        icon: "⭐",
        color: STEP_COLORS[4],
      },
    ],
  },
  hi: {
    badge: "मुफ्त सेवा · FREE QUEST",
    h1: "Self-Esteem Level Up",
    subtitle: "5-Card RPG Quest Tarot",
    heroLines: [
      "अपने मौजूदा भावों की सही जगह को शांत मन से देखें,",
      "और आत्मसम्मान को संभालने के लिए व्यावहारिक मिशन पाएँ, पूरी तरह मुफ्त टैरो रीडिंग में।",
    ],
    benefitsTitle: "यह टैरो क्या दिखाता है",
    benefits: [
      "आपके आत्मसम्मान की वर्तमान ऊर्जा",
      "वह असली पैटर्न जो आत्मविश्वास घटाता है",
      "आज ही किए जा सकने वाले मिशन और रूटीन",
      "आगे की वृद्धि योजना और कोचिंग दिशा",
    ],
    primaryCta: "मुफ्त क्वेस्ट शुरू करें",
    secondaryCta: "होम पर लौटें",
    infoText: "100% मुफ्त — बिना अतिरिक्त भुगतान के सभी सुविधाएँ उपलब्ध",
    imageAlt: "Self-Esteem Level Up tarot मुख्य छवि",
    imageBadge: "मुफ्त बैज",
    overlayTitle: "5-कार्ड ग्रोथ क्वेस्ट",
    overlayLines: [
      "📜 डिबफ जाँच → 👹 मॉन्स्टर निदान → 💔 डैमेज माप",
      "🛡️ शील्ड पाना → ⭐ लेवल अप पूरा",
    ],
    stepsTitle: "5-स्टेप क्वेस्ट फ्लो",
    stepLabel: "स्टेप",
    recommendationTitle: "इन लोगों के लिए उपयोगी",
    recommendations: [
      { icon: "🌱", text: "जिनका आत्मविश्वास हाल में कम हुआ है और वे संभलना चाहते हैं" },
      { icon: "🔍", text: "जो अपनी भावनात्मक स्थिति को निष्पक्ष रूप से देखना चाहते हैं" },
      { icon: "🎯", text: "जो अभी कर सकने वाले ठोस कदम चाहते हैं" },
      { icon: "🔄", text: "जो आत्मसम्मान घटने के दोहराव को तोड़ना चाहते हैं" },
      { icon: "📈", text: "जो लंबे समय की विकास योजना बनाना चाहते हैं" },
      { icon: "🔮", text: "जो टैरो प्रतीकों से गहराई से समझना चाहते हैं" },
    ],
    questSteps: [
      {
        title: "Past Debuffs Check",
        desc: "कार्ड उन घटनाओं और पैटर्न को दिखाते हैं जिनसे आत्मसम्मान कम हुआ।",
        icon: "📜",
        color: STEP_COLORS[0],
      },
      {
        title: "Inner Monster Diagnosis",
        desc: "चिंता, तुलना और आत्म-आलोचना जैसे मुख्य अवरोधों को व्यवस्थित करें।",
        icon: "👹",
        color: STEP_COLORS[1],
      },
      {
        title: "Current Damage Measure",
        desc: "अभी मन की ऊर्जा और भावनात्मक स्थिति को चरणों में पढ़ें।",
        icon: "💔",
        color: STEP_COLORS[2],
      },
      {
        title: "Mind Shield Gain",
        desc: "आज से इस्तेमाल किए जा सकने वाले रिकवरी रूटीन पाएँ।",
        icon: "🛡️",
        color: STEP_COLORS[3],
      },
      {
        title: "Level-Up Mastery",
        desc: "आत्मसम्मान को स्थिर रूप से बढ़ाने की रणनीति से समापन करें।",
        icon: "⭐",
        color: STEP_COLORS[4],
      },
    ],
  },
  es: {
    badge: "Servicio gratis · FREE QUEST",
    h1: "Sube tu autoestima de nivel",
    subtitle: "Tarot de misión RPG de 5 cartas",
    heroLines: [
      "Ubica con claridad el punto actual de tus emociones,",
      "y recibe misiones prácticas para recuperar autoestima en una lectura de tarot completamente gratuita.",
    ],
    benefitsTitle: "Lo que revela este tarot",
    benefits: [
      "El nivel actual de energía de tu autoestima",
      "Los patrones reales que bajan tu confianza",
      "Misiones y rutinas para practicar hoy",
      "Un plan de crecimiento y una dirección de coaching",
    ],
    primaryCta: "Iniciar misión gratis",
    secondaryCta: "Volver al inicio",
    infoText: "100% gratis — todas las funciones disponibles sin pago adicional",
    imageAlt: "Imagen principal del tarot de autoestima",
    imageBadge: "Insignia gratis",
    overlayTitle: "Misión de crecimiento de 5 cartas",
    overlayLines: [
      "📜 Revisar debuffs → 👹 Diagnosticar monstruos → 💔 Medir daño",
      "🛡️ Obtener escudo → ⭐ Completar subida de nivel",
    ],
    stepsTitle: "Flujo de misión en 5 pasos",
    stepLabel: "Paso",
    recommendationTitle: "Recomendado para",
    recommendations: [
      { icon: "🌱", text: "Quien ha perdido confianza recientemente y quiere recuperarla" },
      { icon: "🔍", text: "Quien desea mirar su estado emocional con más objetividad" },
      { icon: "🎯", text: "Quien necesita acciones concretas para hacer ahora" },
      { icon: "🔄", text: "Quien quiere romper un patrón repetido de baja autoestima" },
      { icon: "📈", text: "Quien desea construir un plan de crecimiento a largo plazo" },
      { icon: "🔮", text: "Quien quiere comprenderse mejor mediante símbolos del tarot" },
    ],
    questSteps: [
      {
        title: "Revisar debuffs pasados",
        desc: "Las cartas muestran eventos y patrones que debilitaron tu autoestima.",
        icon: "📜",
        color: STEP_COLORS[0],
      },
      {
        title: "Diagnosticar monstruos internos",
        desc: "Ordena bloqueos centrales como ansiedad, comparación y autocrítica.",
        icon: "👹",
        color: STEP_COLORS[1],
      },
      {
        title: "Medir el daño actual",
        desc: "Lee paso a paso la energía del corazón y el estado emocional actual.",
        icon: "💔",
        color: STEP_COLORS[2],
      },
      {
        title: "Obtener escudo mental",
        desc: "Recibe rutinas de recuperación que puedes usar hoy mismo.",
        icon: "🛡️",
        color: STEP_COLORS[3],
      },
      {
        title: "Maestría de nivel",
        desc: "Cierra con una estrategia sostenible para hacer crecer la autoestima.",
        icon: "⭐",
        color: STEP_COLORS[4],
      },
    ],
  },
  fr: {
    badge: "Service gratuit · FREE QUEST",
    h1: "Estime de soi : niveau supérieur",
    subtitle: "Tarot de quête RPG en 5 cartes",
    heroLines: [
      "Situez clairement l'état actuel de vos émotions,",
      "puis recevez des missions concrètes pour restaurer l'estime de soi dans une lecture de tarot entièrement gratuite.",
    ],
    benefitsTitle: "Ce que révèle ce tarot",
    benefits: [
      "Le niveau d'énergie actuel de votre estime de soi",
      "Les vrais schémas qui diminuent votre confiance",
      "Des missions et routines à pratiquer aujourd'hui",
      "Un plan de croissance et une direction de coaching",
    ],
    primaryCta: "Commencer la quête gratuite",
    secondaryCta: "Retour à l'accueil",
    infoText: "100% gratuit — toutes les fonctions sont disponibles sans paiement supplémentaire",
    imageAlt: "Image principale du tarot estime de soi",
    imageBadge: "Badge gratuit",
    overlayTitle: "Quête de croissance en 5 cartes",
    overlayLines: [
      "📜 Vérifier les debuffs → 👹 Diagnostiquer les monstres → 💔 Mesurer les dégâts",
      "🛡️ Obtenir un bouclier → ⭐ Terminer le niveau",
    ],
    stepsTitle: "Parcours de quête en 5 étapes",
    stepLabel: "Étape",
    recommendationTitle: "Recommandé pour",
    recommendations: [
      { icon: "🌱", text: "Toute personne dont la confiance a récemment baissé et qui souhaite se restaurer" },
      { icon: "🔍", text: "Toute personne qui veut observer son état émotionnel avec plus d'objectivité" },
      { icon: "🎯", text: "Toute personne qui souhaite des actions concrètes à faire maintenant" },
      { icon: "🔄", text: "Toute personne prête à sortir d'un cycle de baisse d'estime de soi" },
      { icon: "📈", text: "Toute personne qui veut construire un plan de croissance durable" },
      { icon: "🔮", text: "Toute personne qui souhaite se comprendre grâce aux symboles du tarot" },
    ],
    questSteps: [
      {
        title: "Vérifier les debuffs passés",
        desc: "Les cartes révèlent les événements et schémas qui ont affaibli l'estime de soi.",
        icon: "📜",
        color: STEP_COLORS[0],
      },
      {
        title: "Diagnostiquer les monstres intérieurs",
        desc: "Clarifiez les blocages centraux comme l'anxiété, la comparaison et l'autocritique.",
        icon: "👹",
        color: STEP_COLORS[1],
      },
      {
        title: "Mesurer les dégâts actuels",
        desc: "Lisez pas à pas l'énergie du coeur et l'état émotionnel du moment.",
        icon: "💔",
        color: STEP_COLORS[2],
      },
      {
        title: "Obtenir un bouclier mental",
        desc: "Recevez des routines de récupération utilisables dès aujourd'hui.",
        icon: "🛡️",
        color: STEP_COLORS[3],
      },
      {
        title: "Maîtrise du niveau supérieur",
        desc: "Terminez avec une stratégie durable pour développer l'estime de soi.",
        icon: "⭐",
        color: STEP_COLORS[4],
      },
    ],
  },
  de: {
    badge: "Kostenloser Service · FREE QUEST",
    h1: "Selbstwert-Level-up",
    subtitle: "5-Karten-RPG-Quest-Tarot",
    heroLines: [
      "Erkenne klar, wo deine Gefühle gerade stehen,",
      "und erhalte praktische Missionen zum Aufbau deines Selbstwerts in einer vollständig kostenlosen Tarot-Lesung.",
    ],
    benefitsTitle: "Was dieses Tarot zeigt",
    benefits: [
      "Das aktuelle Energielevel deines Selbstwerts",
      "Die echten Muster, die dein Vertrauen schwächen",
      "Missionen und Routinen, die du heute umsetzen kannst",
      "Einen Wachstumsplan und eine Coaching-Richtung",
    ],
    primaryCta: "Kostenlose Quest starten",
    secondaryCta: "Zur Startseite",
    infoText: "100% kostenlos — alle Funktionen ohne zusätzliche Zahlung verfügbar",
    imageAlt: "Hauptbild zum Selbstwert-Level-up-Tarot",
    imageBadge: "Kostenloses Badge",
    overlayTitle: "5-Karten-Wachstumsquest",
    overlayLines: [
      "📜 Debuffs prüfen → 👹 Monster diagnostizieren → 💔 Schaden messen",
      "🛡️ Schild erhalten → ⭐ Level-up abschließen",
    ],
    stepsTitle: "Quest-Ablauf in 5 Schritten",
    stepLabel: "Schritt",
    recommendationTitle: "Empfohlen für",
    recommendations: [
      { icon: "🌱", text: "Menschen, deren Selbstvertrauen zuletzt gesunken ist und die sich erholen möchten" },
      { icon: "🔍", text: "Menschen, die ihren emotionalen Zustand objektiver betrachten möchten" },
      { icon: "🎯", text: "Menschen, die konkrete Schritte für sofort suchen" },
      { icon: "🔄", text: "Menschen, die wiederkehrende Selbstwert-Tiefs durchbrechen möchten" },
      { icon: "📈", text: "Menschen, die einen langfristigen Wachstumsplan aufbauen möchten" },
      { icon: "🔮", text: "Menschen, die sich über Tarot-Symbolik tiefer verstehen möchten" },
    ],
    questSteps: [
      {
        title: "Vergangene Debuffs prüfen",
        desc: "Die Karten zeigen Ereignisse und Muster, die deinen Selbstwert geschwächt haben.",
        icon: "📜",
        color: STEP_COLORS[0],
      },
      {
        title: "Innere Monster diagnostizieren",
        desc: "Ordne zentrale Blockaden wie Angst, Vergleich und Selbstkritik.",
        icon: "👹",
        color: STEP_COLORS[1],
      },
      {
        title: "Aktuellen Schaden messen",
        desc: "Lies Schritt für Schritt die Kraft deines Herzens und deinen emotionalen Zustand.",
        icon: "💔",
        color: STEP_COLORS[2],
      },
      {
        title: "Mind-Schild erhalten",
        desc: "Erhalte Erholungsroutinen, die du heute direkt nutzen kannst.",
        icon: "🛡️",
        color: STEP_COLORS[3],
      },
      {
        title: "Level-up-Meisterung",
        desc: "Schließe mit einer nachhaltigen Strategie für wachsenden Selbstwert ab.",
        icon: "⭐",
        color: STEP_COLORS[4],
      },
    ],
  },
  nl: {
    badge: "Gratis service · FREE QUEST",
    h1: "Zelfvertrouwen Level Up",
    subtitle: "5-kaarten RPG Quest Tarot",
    heroLines: [
      "Zie helder waar je emoties nu staan,",
      "en ontvang praktische missies om je zelfvertrouwen te herstellen in een volledig gratis tarotlezing.",
    ],
    benefitsTitle: "Wat deze tarot laat zien",
    benefits: [
      "Het huidige energieniveau van je zelfvertrouwen",
      "De echte patronen die je vertrouwen verlagen",
      "Missies en routines die je vandaag kunt oefenen",
      "Een groeiplan en coachingrichting voor daarna",
    ],
    primaryCta: "Start de gratis quest",
    secondaryCta: "Terug naar home",
    infoText: "100% gratis — alle functies beschikbaar zonder extra betaling",
    imageAlt: "Hoofdbeeld van de Zelfvertrouwen Level Up tarot",
    imageBadge: "Gratis badge",
    overlayTitle: "5-kaarten groeiquest",
    overlayLines: [
      "📜 Debuffs checken → 👹 Monsters diagnosticeren → 💔 Schade meten",
      "🛡️ Schild verkrijgen → ⭐ Level up voltooien",
    ],
    stepsTitle: "Questflow in 5 stappen",
    stepLabel: "Stap",
    recommendationTitle: "Aanbevolen voor",
    recommendations: [
      { icon: "🌱", text: "Wie onlangs minder zelfvertrouwen voelde en wil herstellen" },
      { icon: "🔍", text: "Wie de eigen emotionele staat objectiever wil bekijken" },
      { icon: "🎯", text: "Wie concrete acties zoekt om nu te doen" },
      { icon: "🔄", text: "Wie een terugkerend patroon van lager zelfvertrouwen wil doorbreken" },
      { icon: "📈", text: "Wie een groeiplan voor de lange termijn wil bouwen" },
      { icon: "🔮", text: "Wie zichzelf dieper wil begrijpen via tarotsymboliek" },
    ],
    questSteps: [
      {
        title: "Eerdere debuffs checken",
        desc: "De kaarten tonen gebeurtenissen en patronen die je zelfvertrouwen verzwakten.",
        icon: "📜",
        color: STEP_COLORS[0],
      },
      {
        title: "Innerlijke monsters diagnosticeren",
        desc: "Orden blokkades zoals angst, vergelijking en zelfkritiek.",
        icon: "👹",
        color: STEP_COLORS[1],
      },
      {
        title: "Huidige schade meten",
        desc: "Lees stap voor stap de energie van je hart en je emotionele toestand.",
        icon: "💔",
        color: STEP_COLORS[2],
      },
      {
        title: "Mind-schild verkrijgen",
        desc: "Ontvang herstelroutines die je vandaag meteen kunt gebruiken.",
        icon: "🛡️",
        color: STEP_COLORS[3],
      },
      {
        title: "Level-up meesterschap",
        desc: "Sluit af met een duurzame strategie om zelfvertrouwen te laten groeien.",
        icon: "⭐",
        color: STEP_COLORS[4],
      },
    ],
  },
  ms: {
    badge: "Servis percuma · FREE QUEST",
    h1: "Naik Taraf Harga Diri",
    subtitle: "Tarot Quest RPG 5 Kad",
    heroLines: [
      "Lihat kedudukan emosi semasa anda dengan jelas,",
      "kemudian terima misi praktikal untuk memulihkan harga diri dalam bacaan tarot yang sepenuhnya percuma.",
    ],
    benefitsTitle: "Apa yang tarot ini tunjukkan",
    benefits: [
      "Tahap tenaga harga diri anda sekarang",
      "Pola sebenar yang melemahkan keyakinan",
      "Misi dan rutin yang boleh diamalkan hari ini",
      "Pelan pertumbuhan dan arah bimbingan seterusnya",
    ],
    primaryCta: "Mula quest percuma",
    secondaryCta: "Kembali ke laman utama",
    infoText: "100% percuma — semua fungsi tersedia tanpa bayaran tambahan",
    imageAlt: "Imej utama tarot naik taraf harga diri",
    imageBadge: "Lencana percuma",
    overlayTitle: "Quest pertumbuhan 5 kad",
    overlayLines: [
      "📜 Semak debuff → 👹 Diagnosis monster → 💔 Ukur kerosakan",
      "🛡️ Dapatkan perisai → ⭐ Lengkapkan level up",
    ],
    stepsTitle: "Aliran quest 5 langkah",
    stepLabel: "Langkah",
    recommendationTitle: "Disyorkan untuk",
    recommendations: [
      { icon: "🌱", text: "Anda yang keyakinannya menurun baru-baru ini dan mahu pulih" },
      { icon: "🔍", text: "Anda yang mahu melihat keadaan emosi dengan lebih objektif" },
      { icon: "🎯", text: "Anda yang mahukan tindakan konkrit untuk dilakukan sekarang" },
      { icon: "🔄", text: "Anda yang mahu memecahkan pola harga diri yang berulang kali jatuh" },
      { icon: "📈", text: "Anda yang mahu membina pelan pertumbuhan jangka panjang" },
      { icon: "🔮", text: "Anda yang mahu memahami diri melalui simbol tarot dengan lebih mendalam" },
    ],
    questSteps: [
      {
        title: "Semak debuff lalu",
        desc: "Kad menyingkap peristiwa dan pola yang pernah melemahkan harga diri.",
        icon: "📜",
        color: STEP_COLORS[0],
      },
      {
        title: "Diagnosis monster dalaman",
        desc: "Susun penghalang utama seperti cemas, perbandingan dan kritik diri.",
        icon: "👹",
        color: STEP_COLORS[1],
      },
      {
        title: "Ukur kerosakan semasa",
        desc: "Baca tenaga hati dan keadaan emosi anda langkah demi langkah.",
        icon: "💔",
        color: STEP_COLORS[2],
      },
      {
        title: "Dapatkan perisai minda",
        desc: "Terima rutin pemulihan yang boleh digunakan mulai hari ini.",
        icon: "🛡️",
        color: STEP_COLORS[3],
      },
      {
        title: "Penguasaan level up",
        desc: "Tutup dengan strategi pertumbuhan harga diri yang mampan.",
        icon: "⭐",
        color: STEP_COLORS[4],
      },
    ],
  },
};

function resolveLocaleFromPath(pathname: string | null): LoadingLocale {
  const firstSegment = (pathname || "").split("/").filter(Boolean)[0];
  return firstSegment ? normalizeLoadingLocale(firstSegment) : "ko";
}

export default function TarotSelfEsteemLandingContent() {
  const pathname = usePathname();
  const [locale, setLocale] = useState<LoadingLocale>(() => resolveLocaleFromPath(pathname));
  const copy = SELF_ESTEEM_COPY[locale] || SELF_ESTEEM_COPY.ko;

  useEffect(() => {
    const fromPath = resolveLocaleFromPath(pathname);
    setLocale(fromPath === "ko" ? getCurrentLoadingLocale() : fromPath);
  }, [pathname]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(251,191,36,0.25),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.2),transparent_42%),radial-gradient(circle_at_85%_80%,rgba(59,130,246,0.2),transparent_48%)]" />
        <div className="absolute top-0 left-0 h-96 w-96 animate-pulse rounded-full bg-gradient-to-r from-emerald-400/20 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 animate-pulse rounded-full bg-gradient-to-l from-pink-400/20 to-transparent blur-3xl" style={{ animationDelay: "1s" }} />
      </div>

      <section className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-16 text-center lg:mb-20">
          <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-emerald-300/50 bg-gradient-to-r from-emerald-300/15 to-emerald-400/10 px-5 py-2 text-xs font-extrabold tracking-widest text-emerald-200 shadow-lg shadow-emerald-500/20 backdrop-blur-sm">
            <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-300" />
            {copy.badge}
          </div>

          <h1 className="bg-gradient-to-r from-emerald-200 via-pink-200 to-amber-200 bg-clip-text text-5xl font-black leading-tight text-transparent sm:text-6xl lg:text-7xl">
            {copy.h1}
          </h1>
          <p className="mt-6 text-xl font-semibold text-slate-200">{copy.subtitle}</p>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300/90">
            {copy.heroLines[0]}<br />
            {copy.heroLines[1]}
          </p>
        </div>

        <div className="mb-16 grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div className="space-y-8">
            <div className="rounded-2xl border border-slate-200/20 bg-gradient-to-br from-slate-900/80 to-slate-800/80 p-8 shadow-2xl backdrop-blur-xl">
              <h2 className="mb-6 text-2xl font-bold text-white">{copy.benefitsTitle}</h2>
              <ul className="space-y-4">
                {copy.benefits.map((item) => (
                  <li key={item} className="flex items-start gap-4">
                    <div className="mt-1 flex-shrink-0 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 p-2">
                      <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="font-medium text-slate-200">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/?action=openTarotSelfEsteemModal"
                className="group relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-8 py-4 text-base font-extrabold text-white shadow-lg shadow-emerald-500/40 transition duration-300 hover:-translate-y-0.5 hover:shadow-emerald-500/60 active:translate-y-0"
              >
                <span className="relative z-10">{copy.primaryCta}</span>
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 opacity-0 transition group-hover:opacity-100" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border-2 border-slate-300/30 bg-slate-900/40 px-8 py-4 text-base font-bold text-slate-100 transition hover:border-slate-200/50 hover:bg-slate-800/60"
              >
                {copy.secondaryCta}
              </Link>
            </div>

            <div className="rounded-xl border-l-4 border-emerald-400 bg-gradient-to-r from-emerald-400/15 to-emerald-300/5 p-4">
              <p className="text-sm font-semibold text-emerald-100">✨ {copy.infoText}</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-slate-200/20 bg-slate-900/50 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-transparent to-pink-400/10 opacity-0 transition group-hover:opacity-100" />
            <Image
              src="/fuctionassets/jajongam.webp"
              alt={copy.imageAlt}
              width={900}
              height={1100}
              className="h-full min-h-[320px] w-full object-cover transition group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            <div className="absolute left-4 top-4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 px-4 py-2 text-xs font-black tracking-widest text-slate-950 shadow-lg">
              {copy.imageBadge}
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-6">
              <p className="text-lg font-black text-emerald-200">{copy.overlayTitle}</p>
              <p className="mt-2 text-sm text-slate-300">
                {copy.overlayLines[0]}<br />
                {copy.overlayLines[1]}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="mb-8 text-center text-3xl font-black text-white">{copy.stepsTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {copy.questSteps.map((step, idx) => (
              <div
                key={step.title}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/15 bg-gradient-to-br from-slate-900/80 to-slate-800/60 p-6 transition duration-300 hover:-translate-y-1 hover:border-slate-200/40 hover:shadow-xl hover:shadow-slate-900/50"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 transition group-hover:opacity-10`} />

                <div className="relative z-10">
                  <div className="mb-4 text-4xl">{step.icon}</div>
                  <p className={`mb-2 bg-gradient-to-r ${step.color} bg-clip-text text-xs font-black uppercase tracking-widest text-transparent`}>
                    {copy.stepLabel} {idx + 1}
                  </p>
                  <h3 className="mb-2 text-sm font-extrabold leading-tight text-white">{step.title}</h3>
                  <p className="text-xs leading-6 text-slate-300">{step.desc}</p>
                </div>

                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${step.color} opacity-0 transition group-hover:opacity-100`} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/15 bg-gradient-to-br from-slate-900/70 to-slate-800/70 p-8 lg:p-12">
          <h2 className="mb-8 text-2xl font-bold text-white">{copy.recommendationTitle}</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {copy.recommendations.map((item) => (
              <div key={item.text} className="flex items-start gap-4">
                <span className="flex-shrink-0 text-3xl">{item.icon}</span>
                <p className="text-slate-200">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
