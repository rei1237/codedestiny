"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import TarotHealingClient from "./TarotHealingClient";

const TAROT_HEALING_LOCALES = ["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"] as const;
type LoadingLocale = (typeof TAROT_HEALING_LOCALES)[number];

function normalizeTarotHealingLocale(value?: string | null): LoadingLocale {
  const raw = String(value || "").trim();
  if (!raw) return "ko";
  const normalized = raw.replace("_", "-").toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans" || normalized === "cn") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "tw") return "zh-TW";
  const base = normalized.split("-")[0];
  return TAROT_HEALING_LOCALES.includes(base as LoadingLocale) ? (base as LoadingLocale) : "ko";
}

function getCurrentTarotHealingLocale(): LoadingLocale {
  if (typeof window === "undefined") return "ko";
  const runtimeLanguage = (window as typeof window & { __cdCurrentLang?: string }).__cdCurrentLang;
  if (runtimeLanguage) return normalizeTarotHealingLocale(runtimeLanguage);
  try {
    const stored =
      window.localStorage.getItem("cd_locale") ||
      window.localStorage.getItem("code-destiny-locale") ||
      window.localStorage.getItem("cd_lang") ||
      window.localStorage.getItem("locale");
    if (stored) return normalizeTarotHealingLocale(stored);
  } catch {}
  return normalizeTarotHealingLocale(document.documentElement.lang || navigator.language);
}

type HealingCopy = {
  eyebrow: string;
  h1: string;
  intro: string;
  primaryCta: string;
  tarotLink: string;
  steps: Array<[string, string, string]>;
  checkTitle: string;
  checks: Array<[string, string]>;
  noticeTitle: string;
  noticeBody: string;
  relatedLinks: Array<[string, string]>;
  faqTitle: string;
  faqs: Array<[string, string]>;
  readingLabel: string;
};

const HEALING_COPY: Record<LoadingLocale, HealingCopy> = {
  ko: {
    eyebrow: "Healing Tarot",
    h1: "무료 힐링 타로 4카드 리딩",
    intro:
      "힐링 타로는 마음이 지쳤을 때 감정을 억지로 고치기보다, 지금 어디에 빛을 들여야 하는지 조용히 살피는 리딩입니다. 과거의 상처, 현재의 온도, 회복의 단서, 오늘의 작은 선물을 네 장의 카드로 나누어 읽고 바로 실천할 수 있는 회복 문장을 함께 건넵니다.",
    primaryCta: "힐링 타로 시작하기",
    tarotLink: "무료 타로 리딩 모아보기",
    steps: [
      ["1", "마음의 자리 고르기", "지금 가장 무겁게 남은 감정이나 다시 온기를 들이고 싶은 장면을 떠올립니다."],
      ["2", "네 장의 카드 확인", "과거의 상처, 현재의 온도, 회복의 단서, 오늘의 선물을 순서대로 읽습니다."],
      ["3", "작은 회복 행동 정하기", "리딩 문장을 확정된 예언이 아니라 하루를 덜 무겁게 만드는 자기성찰의 빛으로 사용합니다."],
    ],
    checkTitle: "힐링 타로에서 확인하는 것",
    checks: [
      ["과거의 상처", "반복해서 마음을 붙잡는 기억이나 감정의 흔적을 부드럽게 바라봅니다."],
      ["현재의 온도", "지금 마음이 어디에 힘을 쓰고 있는지, 쉬어야 할 지점을 확인합니다."],
      ["회복 방향", "무리한 결론보다 오늘 선택할 수 있는 현실적인 회복 방향을 정리합니다."],
      ["오늘의 선물", "작은 위로, 관계의 힌트, 나를 돌보는 문장을 카드 흐름으로 받아 봅니다."],
    ],
    noticeTitle: "주의와 면책",
    noticeBody:
      "타로 리딩은 오락과 자기성찰을 위한 콘텐츠입니다. 건강, 법률, 투자, 치료, 안전과 관련된 결정은 반드시 전문 기관이나 전문가의 도움을 우선해 주세요.",
    relatedLinks: [
      ["/tarot/reunion", "재회 타로 보기"],
      ["/tarot/mindscan", "상대 마음 타로 보기"],
      ["/today", "오늘의 운세 보기"],
    ],
    faqTitle: "자주 묻는 질문",
    faqs: [
      ["힐링 타로는 어떤 상황에 좋나요?", "마음이 지치거나 관계, 일, 자기확신에서 잠시 숨을 고르고 싶을 때 가볍게 참고하기 좋습니다."],
      ["무거운 카드가 나오면 어떻게 해야 하나요?", "카드는 확정된 운명을 말하지 않습니다. 불안한 표현보다 조정할 지점과 오늘 가능한 회복 행동을 중심으로 읽어 주세요."],
      ["같은 질문을 여러 번 봐도 되나요?", "짧은 시간에 반복해서 뽑기보다 하루나 상황이 바뀐 뒤 다시 보는 편이 더 안정적입니다."],
      ["무료로 사용할 수 있나요?", "기본 힐링 타로 리딩은 무료로 사용할 수 있으며, 더 깊은 해석이 필요한 경우 관련 타로 기능을 함께 살펴볼 수 있습니다."],
    ],
    readingLabel: "힐링 타로 리딩 실행",
  },
  en: {
    eyebrow: "Healing Tarot",
    h1: "Free 4-Card Healing Tarot Reading",
    intro:
      "Healing Tarot gently organizes your emotional flow when the heart feels tired. Four cards look at past wounds, present energy, direction of recovery, and today's gift, then offer a small healing sentence you can practice right away.",
    primaryCta: "Start Healing Tarot",
    tarotLink: "Browse Free Tarot Readings",
    steps: [
      ["1", "Choose a question", "Bring to mind the emotion weighing on you most or the relationship flow you want to heal."],
      ["2", "Read four cards", "Read past wound, present energy, recovery direction, and today's gift in order."],
      ["3", "Choose a small action", "Use the reading as a self-reflection hint for your day, not as a fixed prophecy."],
    ],
    checkTitle: "What Healing Tarot Reveals",
    checks: [
      ["Past wound", "Gently look at a memory or emotional trace that keeps holding your heart."],
      ["Present energy", "See where your mind is spending strength and where rest is needed."],
      ["Recovery direction", "Choose a realistic direction for today rather than forcing a conclusion."],
      ["Today's gift", "Receive a small comfort, relationship hint, or self-care sentence through the card flow."],
    ],
    noticeTitle: "Notice and Disclaimer",
    noticeBody:
      "Tarot readings are for entertainment and self-reflection. For health, legal, investment, treatment, or safety decisions, please prioritize help from qualified professionals.",
    relatedLinks: [
      ["/tarot/reunion", "View Reunion Tarot"],
      ["/tarot/mindscan", "View Their Feelings Tarot"],
      ["/today", "View Today's Fortune"],
    ],
    faqTitle: "FAQ",
    faqs: [
      ["When is Healing Tarot useful?", "It is useful when your heart is tired or when you want a gentle pause around relationships, work, or self-trust."],
      ["What if the result feels negative?", "The cards do not speak a fixed fate. Read them around what can be adjusted and what action is possible today."],
      ["Can I ask the same question many times?", "It is steadier to return after a day or a changed situation rather than drawing repeatedly in a short time."],
      ["Is it free?", "The basic Healing Tarot reading is free, and deeper tarot services can be explored when you need more detail."],
    ],
    readingLabel: "Run Healing Tarot Reading",
  },
  ja: {
    eyebrow: "Healing Tarot",
    h1: "無料ヒーリングタロット 4カードリーディング",
    intro:
      "ヒーリングタロットは、心が疲れているときに今の感情の流れをやさしく整えるタロットです。過去の傷、現在のエネルギー、回復の方向、今日のギフトを4枚のカードで見つめ、今日すぐ実践できる小さな回復の言葉を受け取ります。",
    primaryCta: "ヒーリングタロットを始める",
    tarotLink: "無料タロットを見る",
    steps: [
      ["1", "質問を選ぶ", "今いちばん重く感じる感情や、回復したい関係の流れを思い浮かべます。"],
      ["2", "4枚のカードを確認", "過去の傷、現在のエネルギー、回復の方向、今日のギフトを順に読みます。"],
      ["3", "小さな行動を決める", "リーディングを確定した予言ではなく、一日を整える内省のヒントとして使います。"],
    ],
    checkTitle: "ヒーリングタロットで見るもの",
    checks: [
      ["過去の傷", "くり返し心をつかむ記憶や感情の跡を、やさしく見つめます。"],
      ["現在のエネルギー", "今どこに力を使っているのか、どこで休む必要があるのかを見ます。"],
      ["回復の方向", "無理な結論ではなく、今日選べる現実的な回復の向きを整えます。"],
      ["今日のギフト", "小さな慰め、関係のヒント、自分をいたわる言葉をカードの流れから受け取ります。"],
    ],
    noticeTitle: "注意と免責",
    noticeBody:
      "タロットリーディングは娯楽と自己内省のためのコンテンツです。健康、法律、投資、治療、安全に関わる判断は、必ず専門機関や専門家の助けを優先してください。",
    relatedLinks: [
      ["/tarot/reunion", "復縁タロットを見る"],
      ["/tarot/mindscan", "相手の気持ちタロットを見る"],
      ["/today", "今日の運勢を見る"],
    ],
    faqTitle: "よくある質問",
    faqs: [
      ["ヒーリングタロットはどんな時に向いていますか？", "心が疲れている時、関係や仕事、自信について少し休みたい時にやさしく参考にできます。"],
      ["結果が不安に感じる時は？", "カードは確定した運命を告げません。不安な表現より、調整できる点と今日できる行動を中心に読んでください。"],
      ["同じ質問を何度も見てもいいですか？", "短時間にくり返すより、一日置くか状況が変わってから見るほうが安定します。"],
      ["無料で使えますか？", "基本のヒーリングタロットは無料で使えます。より深い解釈が必要な時は関連タロットも確認できます。"],
    ],
    readingLabel: "ヒーリングタロットリーディング実行",
  },
  "zh-CN": {
    eyebrow: "Healing Tarot",
    h1: "免费4张牌疗愈塔罗",
    intro:
      "疗愈塔罗在心累的时候，温柔整理当下的情绪流。四张牌分别照见过去的伤、当前能量、恢复方向与今日礼物，并给出今天可以实践的小小疗愈句子。",
    primaryCta: "开始疗愈塔罗",
    tarotLink: "查看免费塔罗",
    steps: [
      ["1", "选择问题", "想起此刻最沉重的情绪，或想要修复的关系流向。"],
      ["2", "查看四张牌", "依次阅读过去的伤、当前能量、恢复方向与今日礼物。"],
      ["3", "决定小行动", "把阅读当作整理一天的自我观察提示，而不是确定预言。"],
    ],
    checkTitle: "疗愈塔罗会查看什么",
    checks: [
      ["过去的伤", "温柔看见反复牵动内心的记忆或情绪痕迹。"],
      ["当前能量", "确认心力正在用在哪里，以及哪里需要休息。"],
      ["恢复方向", "整理今天可以选择的现实恢复方向，而不是勉强下结论。"],
      ["今日礼物", "从牌流中接收小小安慰、关系提示与照顾自己的句子。"],
    ],
    noticeTitle: "注意与免责声明",
    noticeBody:
      "塔罗阅读是娱乐与自我反思内容。涉及健康、法律、投资、治疗或安全的决定，请优先寻求专业机构或专家帮助。",
    relatedLinks: [
      ["/tarot/reunion", "查看复合塔罗"],
      ["/tarot/mindscan", "查看对方心意塔罗"],
      ["/today", "查看今日运势"],
    ],
    faqTitle: "常见问题",
    faqs: [
      ["疗愈塔罗适合什么情况？", "当心累，或想在关系、工作、自我确信中暂时休息时，可以轻松参考。"],
      ["结果看起来不好怎么办？", "牌不会宣告固定命运。请围绕可调整之处与今天能做的行动来阅读。"],
      ["同一个问题可以反复问吗？", "比起短时间反复抽牌，隔一天或情况变化后再看会更稳定。"],
      ["可以免费使用吗？", "基础疗愈塔罗阅读可以免费使用，需要更深解读时也可以查看相关塔罗功能。"],
    ],
    readingLabel: "执行疗愈塔罗阅读",
  },
  "zh-TW": {
    eyebrow: "Healing Tarot",
    h1: "免費4張牌療癒塔羅",
    intro:
      "療癒塔羅在心累的時候，溫柔整理當下的情緒流。四張牌分別照見過去的傷、當前能量、恢復方向與今日禮物，並給出今天可以實踐的小小療癒句子。",
    primaryCta: "開始療癒塔羅",
    tarotLink: "查看免費塔羅",
    steps: [
      ["1", "選擇問題", "想起此刻最沉重的情緒，或想要修復的關係流向。"],
      ["2", "查看四張牌", "依序閱讀過去的傷、當前能量、恢復方向與今日禮物。"],
      ["3", "決定小行動", "把閱讀當作整理一天的自我觀察提示，而不是確定預言。"],
    ],
    checkTitle: "療癒塔羅會查看什麼",
    checks: [
      ["過去的傷", "溫柔看見反覆牽動內心的記憶或情緒痕跡。"],
      ["當前能量", "確認心力正在用在哪裡，以及哪裡需要休息。"],
      ["恢復方向", "整理今天可以選擇的現實恢復方向，而不是勉強下結論。"],
      ["今日禮物", "從牌流中接收小小安慰、關係提示與照顧自己的句子。"],
    ],
    noticeTitle: "注意與免責聲明",
    noticeBody:
      "塔羅閱讀是娛樂與自我反思內容。涉及健康、法律、投資、治療或安全的決定，請優先尋求專業機構或專家協助。",
    relatedLinks: [
      ["/tarot/reunion", "查看復合塔羅"],
      ["/tarot/mindscan", "查看對方心意塔羅"],
      ["/today", "查看今日運勢"],
    ],
    faqTitle: "常見問題",
    faqs: [
      ["療癒塔羅適合什麼情況？", "當心累，或想在關係、工作、自我確信中暫時休息時，可以輕鬆參考。"],
      ["結果看起來不好怎麼辦？", "牌不會宣告固定命運。請圍繞可調整之處與今天能做的行動來閱讀。"],
      ["同一個問題可以反覆問嗎？", "比起短時間反覆抽牌，隔一天或情況變化後再看會更穩定。"],
      ["可以免費使用嗎？", "基礎療癒塔羅閱讀可以免費使用，需要更深解讀時也可以查看相關塔羅功能。"],
    ],
    readingLabel: "執行療癒塔羅閱讀",
  },
  vi: {
    eyebrow: "Healing Tarot",
    h1: "Bài đọc tarot chữa lành 4 lá miễn phí",
    intro:
      "Healing Tarot nhẹ nhàng sắp xếp dòng cảm xúc khi trái tim mệt mỏi. Bốn lá bài nhìn vào vết thương cũ, năng lượng hiện tại, hướng hồi phục và món quà hôm nay, rồi trao một câu hồi phục nhỏ có thể thực hành ngay.",
    primaryCta: "Bắt đầu Healing Tarot",
    tarotLink: "Xem các bài tarot miễn phí",
    steps: [
      ["1", "Chọn câu hỏi", "Nghĩ đến cảm xúc nặng nhất lúc này hoặc dòng quan hệ bạn muốn chữa lành."],
      ["2", "Xem bốn lá bài", "Đọc lần lượt vết thương cũ, năng lượng hiện tại, hướng hồi phục và món quà hôm nay."],
      ["3", "Chọn hành động nhỏ", "Dùng bài đọc như gợi ý tự soi chiếu cho một ngày, không phải lời tiên tri cố định."],
    ],
    checkTitle: "Healing Tarot soi điều gì",
    checks: [
      ["Vết thương cũ", "Nhìn dịu dàng vào ký ức hoặc dấu cảm xúc còn giữ trái tim."],
      ["Năng lượng hiện tại", "Xem tâm trí đang dồn sức vào đâu và điểm nào cần nghỉ."],
      ["Hướng hồi phục", "Chọn hướng hồi phục thực tế cho hôm nay thay vì ép kết luận."],
      ["Món quà hôm nay", "Nhận một lời an ủi nhỏ, gợi ý quan hệ hoặc câu tự chăm sóc qua dòng bài."],
    ],
    noticeTitle: "Lưu ý và miễn trừ",
    noticeBody:
      "Bài đọc tarot dành cho giải trí và tự soi chiếu. Với quyết định về sức khỏe, pháp lý, đầu tư, trị liệu hoặc an toàn, hãy ưu tiên chuyên gia phù hợp.",
    relatedLinks: [
      ["/tarot/reunion", "Xem tarot tái hợp"],
      ["/tarot/mindscan", "Xem tarot tâm ý đối phương"],
      ["/today", "Xem vận hôm nay"],
    ],
    faqTitle: "Câu hỏi thường gặp",
    faqs: [
      ["Healing Tarot hợp lúc nào?", "Khi trái tim mệt, hoặc khi bạn muốn nghỉ nhẹ trong chuyện quan hệ, công việc hay niềm tin vào bản thân."],
      ["Nếu kết quả có vẻ xấu thì sao?", "Lá bài không nói số phận cố định. Hãy đọc quanh điểm có thể điều chỉnh và hành động hôm nay."],
      ["Có thể hỏi lại cùng một câu không?", "Ổn định hơn nếu quay lại sau một ngày hoặc khi tình huống thay đổi."],
      ["Có miễn phí không?", "Bài Healing Tarot cơ bản miễn phí, và bạn có thể xem thêm chức năng tarot liên quan khi cần sâu hơn."],
    ],
    readingLabel: "Chạy bài đọc Healing Tarot",
  },
  hi: {
    eyebrow: "Healing Tarot",
    h1: "मुफ्त 4-कार्ड हीलिंग टैरो रीडिंग",
    intro:
      "हीलिंग टैरो थके हुए मन की भावनात्मक धारा को कोमलता से व्यवस्थित करता है. चार कार्ड पुराने घाव, वर्तमान ऊर्जा, पुनर्स्थापन दिशा और आज के उपहार को देखते हैं, फिर आज ही अपनाने योग्य छोटा उपचार वाक्य देते हैं.",
    primaryCta: "हीलिंग टैरो शुरू करें",
    tarotLink: "मुफ्त टैरो रीडिंग देखें",
    steps: [
      ["1", "प्रश्न चुनें", "इस समय सबसे भारी भावना या जिस संबंध प्रवाह को ठीक करना चाहते हैं, उसे मन में लाएँ."],
      ["2", "चार कार्ड देखें", "पुराना घाव, वर्तमान ऊर्जा, पुनर्स्थापन दिशा और आज का उपहार क्रम से पढ़ें."],
      ["3", "छोटी क्रिया चुनें", "रीडिंग को निश्चित भविष्यवाणी नहीं, दिन सँवारने का आत्म-चिंतन संकेत मानें."],
    ],
    checkTitle: "हीलिंग टैरो क्या दिखाता है",
    checks: [
      ["पुराना घाव", "मन को बार-बार पकड़ने वाली याद या भावनात्मक निशान को कोमलता से देखें."],
      ["वर्तमान ऊर्जा", "देखें मन कहाँ शक्ति लगा रहा है और कहाँ विश्राम चाहिए."],
      ["पुनर्स्थापन दिशा", "जबरन निष्कर्ष नहीं, आज की व्यावहारिक राहत दिशा चुनें."],
      ["आज का उपहार", "कार्ड प्रवाह से छोटी सांत्वना, संबंध संकेत या आत्म-देखभाल वाक्य पाएँ."],
    ],
    noticeTitle: "सूचना और अस्वीकरण",
    noticeBody:
      "टैरो रीडिंग मनोरंजन और आत्म-चिंतन के लिए है. स्वास्थ्य, कानून, निवेश, उपचार या सुरक्षा से जुड़े निर्णयों में योग्य विशेषज्ञ की सहायता को प्राथमिकता दें.",
    relatedLinks: [
      ["/tarot/reunion", "रीयूनियन टैरो देखें"],
      ["/tarot/mindscan", "उनके मन की टैरो देखें"],
      ["/today", "आज का भाग्य देखें"],
    ],
    faqTitle: "सामान्य प्रश्न",
    faqs: [
      ["हीलिंग टैरो कब उपयोगी है?", "जब मन थका हो या संबंध, काम या आत्म-विश्वास में थोड़ी शांति चाहिए."],
      ["नतीजा नकारात्मक लगे तो?", "कार्ड निश्चित भाग्य नहीं बताते. समायोजन और आज संभव कार्रवाई पर ध्यान दें."],
      ["क्या एक ही प्रश्न बार-बार पूछ सकते हैं?", "कम समय में दोहराने से बेहतर है एक दिन बाद या स्थिति बदलने पर लौटना."],
      ["क्या यह मुफ्त है?", "मूल हीलिंग टैरो रीडिंग मुफ्त है. गहरी व्याख्या चाहिए तो संबंधित टैरो सेवाएँ देख सकते हैं."],
    ],
    readingLabel: "हीलिंग टैरो रीडिंग चलाएँ",
  },
  es: {
    eyebrow: "Healing Tarot",
    h1: "Lectura gratuita de tarot sanador de 4 cartas",
    intro:
      "Healing Tarot ordena con suavidad tu flujo emocional cuando el corazón está cansado. Cuatro cartas miran la herida pasada, la energía presente, la dirección de recuperación y el regalo de hoy, con una frase sanadora para practicar.",
    primaryCta: "Iniciar Healing Tarot",
    tarotLink: "Ver lecturas gratuitas de tarot",
    steps: [
      ["1", "Elegir una pregunta", "Piensa en la emoción que más pesa o en el flujo relacional que quieres sanar."],
      ["2", "Leer cuatro cartas", "Lee herida pasada, energía presente, dirección de recuperación y regalo de hoy."],
      ["3", "Elegir una acción pequeña", "Usa la lectura como pista de reflexión para el día, no como profecía fija."],
    ],
    checkTitle: "Qué revela Healing Tarot",
    checks: [
      ["Herida pasada", "Mira con suavidad una memoria o huella emocional que sigue sujetando el corazón."],
      ["Energía presente", "Observa dónde está gastando fuerza tu mente y dónde necesita descanso."],
      ["Dirección de recuperación", "Elige una dirección realista para hoy, sin forzar conclusiones."],
      ["Regalo de hoy", "Recibe un pequeño consuelo, una pista relacional o una frase de autocuidado."],
    ],
    noticeTitle: "Aviso y descargo",
    noticeBody:
      "Las lecturas de tarot son para entretenimiento y autorreflexión. Para decisiones de salud, legales, inversión, tratamiento o seguridad, prioriza ayuda profesional.",
    relatedLinks: [
      ["/tarot/reunion", "Ver tarot de regreso"],
      ["/tarot/mindscan", "Ver tarot de sus sentimientos"],
      ["/today", "Ver fortuna de hoy"],
    ],
    faqTitle: "Preguntas frecuentes",
    faqs: [
      ["¿Cuándo sirve Healing Tarot?", "Cuando el corazón está cansado o necesitas una pausa suave en relaciones, trabajo o confianza personal."],
      ["¿Qué hago si el resultado parece negativo?", "Las cartas no declaran un destino fijo. Lee lo ajustable y la acción posible hoy."],
      ["¿Puedo preguntar lo mismo varias veces?", "Es más estable volver después de un día o cuando cambie la situación."],
      ["¿Es gratis?", "La lectura básica de Healing Tarot es gratuita, y puedes explorar tarot relacionado si quieres más profundidad."],
    ],
    readingLabel: "Ejecutar lectura de Healing Tarot",
  },
  fr: {
    eyebrow: "Healing Tarot",
    h1: "Lecture gratuite de tarot guérisseur en 4 cartes",
    intro:
      "Healing Tarot organise doucement le flux émotionnel lorsque le cœur est fatigué. Quatre cartes regardent la blessure passée, l'énergie présente, la direction de guérison et le cadeau du jour, avec une petite phrase à pratiquer.",
    primaryCta: "Commencer Healing Tarot",
    tarotLink: "Voir les tarots gratuits",
    steps: [
      ["1", "Choisir une question", "Pensez à l'émotion la plus lourde ou au lien que vous souhaitez apaiser."],
      ["2", "Lire quatre cartes", "Lisez blessure passée, énergie présente, direction de guérison et cadeau du jour."],
      ["3", "Choisir une petite action", "Utilisez la lecture comme indice d'introspection, non comme prophétie fixe."],
    ],
    checkTitle: "Ce que Healing Tarot révèle",
    checks: [
      ["Blessure passée", "Regarder avec douceur une mémoire ou une trace émotionnelle qui retient le cœur."],
      ["Énergie présente", "Voir où votre esprit dépense sa force et où il a besoin de repos."],
      ["Direction de guérison", "Choisir une direction réaliste pour aujourd'hui plutôt qu'une conclusion forcée."],
      ["Cadeau du jour", "Recevoir un réconfort, un indice relationnel ou une phrase de soin de soi."],
    ],
    noticeTitle: "Attention et clause de non-responsabilité",
    noticeBody:
      "Les lectures de tarot sont destinées au divertissement et à l'introspection. Pour la santé, le droit, l'investissement, le traitement ou la sécurité, privilégiez un professionnel.",
    relatedLinks: [
      ["/tarot/reunion", "Voir le tarot du retour"],
      ["/tarot/mindscan", "Voir le tarot de ses sentiments"],
      ["/today", "Voir la fortune du jour"],
    ],
    faqTitle: "Questions fréquentes",
    faqs: [
      ["Quand utiliser Healing Tarot ?", "Quand le cœur est fatigué ou que vous avez besoin d'une pause dans les relations, le travail ou la confiance."],
      ["Que faire si le résultat semble négatif ?", "Les cartes ne fixent pas le destin. Lisez ce qui peut être ajusté et l'action possible aujourd'hui."],
      ["Puis-je poser plusieurs fois la même question ?", "Il est plus stable de revenir après un jour ou quand la situation a changé."],
      ["Est-ce gratuit ?", "La lecture de base Healing Tarot est gratuite; vous pouvez explorer d'autres tarots pour plus de profondeur."],
    ],
    readingLabel: "Lancer la lecture Healing Tarot",
  },
  de: {
    eyebrow: "Healing Tarot",
    h1: "Kostenlose 4-Karten-Healing-Tarot-Lesung",
    intro:
      "Healing Tarot ordnet deinen emotionalen Fluss sanft, wenn das Herz müde ist. Vier Karten betrachten alte Wunde, gegenwärtige Energie, Richtung der Erholung und heutiges Geschenk, mit einem kleinen Heilungssatz für sofort.",
    primaryCta: "Healing Tarot starten",
    tarotLink: "Kostenlose Tarot-Lesungen ansehen",
    steps: [
      ["1", "Frage wählen", "Denke an die schwerste Emotion oder den Beziehungsfluss, den du heilen möchtest."],
      ["2", "Vier Karten lesen", "Lies alte Wunde, gegenwärtige Energie, Erholungsrichtung und heutiges Geschenk."],
      ["3", "Kleine Handlung wählen", "Nutze die Lesung als Selbstreflexion für den Tag, nicht als feste Prophezeiung."],
    ],
    checkTitle: "Was Healing Tarot zeigt",
    checks: [
      ["Alte Wunde", "Eine Erinnerung oder emotionale Spur sanft ansehen, die das Herz festhält."],
      ["Gegenwärtige Energie", "Sehen, wo dein Geist Kraft verbraucht und wo Ruhe nötig ist."],
      ["Erholungsrichtung", "Eine realistische Richtung für heute wählen, statt ein Ergebnis zu erzwingen."],
      ["Heutiges Geschenk", "Einen kleinen Trost, Beziehungshinweis oder Selbstfürsorgesatz erhalten."],
    ],
    noticeTitle: "Hinweis und Haftungsausschluss",
    noticeBody:
      "Tarot-Lesungen dienen Unterhaltung und Selbstreflexion. Bei Gesundheit, Recht, Investition, Behandlung oder Sicherheit bitte qualifizierte Fachhilfe priorisieren.",
    relatedLinks: [
      ["/tarot/reunion", "Reunion Tarot ansehen"],
      ["/tarot/mindscan", "Gefühle-Tarot ansehen"],
      ["/today", "Heutiges Horoskop ansehen"],
    ],
    faqTitle: "FAQ",
    faqs: [
      ["Wann ist Healing Tarot hilfreich?", "Wenn dein Herz müde ist oder du bei Beziehung, Arbeit oder Selbstvertrauen kurz innehalten möchtest."],
      ["Was, wenn das Ergebnis negativ wirkt?", "Die Karten sprechen kein festes Schicksal. Lies sie nach Anpassung und heutiger Handlung."],
      ["Kann ich dieselbe Frage mehrfach stellen?", "Stabiler ist es, nach einem Tag oder veränderter Situation zurückzukehren."],
      ["Ist es kostenlos?", "Die grundlegende Healing-Tarot-Lesung ist kostenlos; für Tiefe kannst du verwandte Tarot-Angebote ansehen."],
    ],
    readingLabel: "Healing-Tarot-Lesung ausführen",
  },
  nl: {
    eyebrow: "Healing Tarot",
    h1: "Gratis 4-kaarten healing tarot reading",
    intro:
      "Healing Tarot ordent je emotionele stroom zacht wanneer je hart moe is. Vier kaarten kijken naar oude wond, huidige energie, herstelrichting en het geschenk van vandaag, met een kleine helende zin voor direct gebruik.",
    primaryCta: "Healing Tarot starten",
    tarotLink: "Gratis tarot readings bekijken",
    steps: [
      ["1", "Kies een vraag", "Denk aan de zwaarste emotie of de relatieflow die je wilt helen."],
      ["2", "Lees vier kaarten", "Lees oude wond, huidige energie, herstelrichting en het geschenk van vandaag."],
      ["3", "Kies een kleine actie", "Gebruik de reading als zelfreflectie voor de dag, niet als vaste voorspelling."],
    ],
    checkTitle: "Wat Healing Tarot laat zien",
    checks: [
      ["Oude wond", "Kijk zacht naar een herinnering of emotioneel spoor dat je hart vasthoudt."],
      ["Huidige energie", "Zie waar je geest kracht aan besteedt en waar rust nodig is."],
      ["Herstelrichting", "Kies een realistische richting voor vandaag in plaats van een geforceerde conclusie."],
      ["Geschenk van vandaag", "Ontvang een klein troostwoord, relatiehint of zin voor zelfzorg."],
    ],
    noticeTitle: "Let op en disclaimer",
    noticeBody:
      "Tarot readings zijn voor entertainment en zelfreflectie. Bij gezondheid, recht, investering, behandeling of veiligheid heeft professionele hulp prioriteit.",
    relatedLinks: [
      ["/tarot/reunion", "Reunion tarot bekijken"],
      ["/tarot/mindscan", "Hun gevoelens tarot bekijken"],
      ["/today", "Fortuin van vandaag bekijken"],
    ],
    faqTitle: "Veelgestelde vragen",
    faqs: [
      ["Wanneer is Healing Tarot nuttig?", "Wanneer je hart moe is of je zacht wilt pauzeren rond relaties, werk of zelfvertrouwen."],
      ["Wat als het resultaat negatief voelt?", "De kaarten spreken geen vast lot. Lees rond wat verstelbaar is en welke actie vandaag kan."],
      ["Kan ik dezelfde vraag vaker stellen?", "Het is stabieler om terug te keren na een dag of wanneer de situatie verandert."],
      ["Is het gratis?", "De basis Healing Tarot reading is gratis; voor meer diepte kun je verwante tarotfuncties bekijken."],
    ],
    readingLabel: "Healing Tarot reading uitvoeren",
  },
  ms: {
    eyebrow: "Healing Tarot",
    h1: "Bacaan tarot penyembuhan 4 kad percuma",
    intro:
      "Healing Tarot menyusun aliran emosi dengan lembut apabila hati letih. Empat kad melihat luka lama, tenaga semasa, arah pemulihan dan hadiah hari ini, lalu memberi ayat pemulihan kecil yang boleh diamalkan.",
    primaryCta: "Mula Healing Tarot",
    tarotLink: "Lihat bacaan tarot percuma",
    steps: [
      ["1", "Pilih soalan", "Fikirkan emosi paling berat atau aliran hubungan yang ingin dipulihkan."],
      ["2", "Baca empat kad", "Baca luka lama, tenaga semasa, arah pemulihan dan hadiah hari ini."],
      ["3", "Pilih tindakan kecil", "Gunakan bacaan sebagai petunjuk refleksi diri, bukan ramalan tetap."],
    ],
    checkTitle: "Apa yang Healing Tarot tunjukkan",
    checks: [
      ["Luka lama", "Lihat dengan lembut memori atau jejak emosi yang masih memegang hati."],
      ["Tenaga semasa", "Kenal pasti di mana minda menggunakan tenaga dan di mana rehat diperlukan."],
      ["Arah pemulihan", "Pilih arah pemulihan realistik untuk hari ini, bukan memaksa kesimpulan."],
      ["Hadiah hari ini", "Terima sedikit ketenangan, petunjuk hubungan atau ayat menjaga diri melalui aliran kad."],
    ],
    noticeTitle: "Notis dan penafian",
    noticeBody:
      "Bacaan tarot adalah untuk hiburan dan refleksi diri. Untuk keputusan kesihatan, undang-undang, pelaburan, rawatan atau keselamatan, utamakan bantuan profesional.",
    relatedLinks: [
      ["/tarot/reunion", "Lihat tarot penyatuan semula"],
      ["/tarot/mindscan", "Lihat tarot perasaan si dia"],
      ["/today", "Lihat nasib hari ini"],
    ],
    faqTitle: "Soalan lazim",
    faqs: [
      ["Bilakah Healing Tarot sesuai?", "Apabila hati letih atau anda mahu berhenti seketika dalam hubungan, kerja atau keyakinan diri."],
      ["Jika hasil terasa negatif?", "Kad tidak menyatakan takdir tetap. Baca perkara yang boleh dilaras dan tindakan hari ini."],
      ["Bolehkah soalan sama ditanya banyak kali?", "Lebih stabil untuk kembali selepas sehari atau apabila situasi berubah."],
      ["Adakah percuma?", "Bacaan asas Healing Tarot adalah percuma, dan fungsi tarot berkaitan boleh dilihat untuk tafsiran lebih mendalam."],
    ],
    readingLabel: "Jalankan bacaan Healing Tarot",
  },
};

function resolveLocaleFromPath(pathname: string | null): LoadingLocale {
  const firstSegment = (pathname || "").split("/").filter(Boolean)[0];
  return firstSegment ? normalizeTarotHealingLocale(firstSegment) : "ko";
}

export default function TarotHealingLandingContent() {
  const pathname = usePathname();
  const [locale, setLocale] = useState<LoadingLocale>(() => resolveLocaleFromPath(pathname) || "ko");

  useEffect(() => {
    const fromPath = resolveLocaleFromPath(pathname);
    setLocale(fromPath === "ko" ? getCurrentTarotHealingLocale() : fromPath);
  }, [pathname]);

  const copy = HEALING_COPY[locale] || HEALING_COPY.ko;

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-stone-50 text-stone-950">
      <section className="mx-auto max-w-5xl px-5 py-10 md:py-14">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-amber-700">{copy.eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight md:text-5xl">{copy.h1}</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-stone-700 md:text-lg">{copy.intro}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#healing-tarot-reading" className="rounded-full bg-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-amber-200 transition hover:bg-amber-600">
            {copy.primaryCta}
          </a>
          <Link href="/tarot" className="rounded-full border border-amber-300 bg-white px-5 py-3 text-sm font-bold text-amber-900 transition hover:bg-amber-50">
            {copy.tarotLink}
          </Link>
        </div>
      </section>

      <section id="healing-tarot-reading" aria-label={copy.readingLabel}>
        <TarotHealingClient />
      </section>

      <section className="border-y border-amber-200/70 bg-white/70">
        <div className="mx-auto grid max-w-5xl gap-6 px-5 py-10 md:grid-cols-3">
          {copy.steps.map(([step, title, body]) => (
            <article key={step} className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black text-amber-600">STEP {step}</p>
              <h2 className="mt-2 text-xl font-black text-stone-950">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-stone-700">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-8 px-5 py-10 md:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="text-2xl font-black">{copy.checkTitle}</h2>
          <div className="mt-5 grid gap-4">
            {copy.checks.map(([title, body]) => (
              <article key={title} className="rounded-2xl border border-stone-200 bg-white p-5">
                <h3 className="text-lg font-black text-stone-950">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-stone-700">{body}</p>
              </article>
            ))}
          </div>
        </div>
        <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-xl font-black text-stone-950">{copy.noticeTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-stone-700">{copy.noticeBody}</p>
          <div className="mt-5 flex flex-col gap-2 text-sm font-bold text-amber-900">
            {copy.relatedLinks.map(([href, label]) => (
              <Link key={href} href={href} className="inline-flex min-h-11 items-center">{label}</Link>
            ))}
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-10">
        <h2 className="text-2xl font-black">{copy.faqTitle}</h2>
        <div className="mt-5 grid gap-4">
          {copy.faqs.map(([question, answer]) => (
            <article key={question} className="rounded-2xl border border-stone-200 bg-white p-5">
              <h3 className="text-base font-black text-stone-950">{question}</h3>
              <p className="mt-2 text-sm leading-7 text-stone-700">{answer}</p>
            </article>
          ))}
        </div>
      </section>

    </main>
  );
}
