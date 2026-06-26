import TarotSelfEsteemLandingContent from "./TarotSelfEsteemLandingContent";

const TAROT_SELF_ESTEEM_METADATA_COPY = {
  ko: {
    title: "✨ 자존감 레벨업 - 5카드 RPG 퀘스트 타로",
    description:
      "5카드 RPG 퀘스트 스프레드로 자존감 상태를 점검하고 회복 전략을 확인하세요. 완전 무료 서비스입니다.",
  },
  en: {
    title: "Self-Esteem Level Up - 5-Card RPG Quest Tarot",
    description:
      "Check your self-esteem state and recovery strategy through a 5-card RPG quest spread. Completely free.",
  },
  ja: {
    title: "自己肯定感レベルアップ - 5カードRPGクエストタロット",
    description:
      "5カードRPGクエストスプレッドで自己肯定感の状態を確認し、回復戦略を受け取れます。完全無料サービスです。",
  },
  zh: {
    title: "自尊感升级 - 五张 RPG 任务塔罗",
    description:
      "通过五张 RPG 任务牌阵检查自尊状态并确认恢复策略。完全免费。",
  },
};

const metadataCopy = TAROT_SELF_ESTEEM_METADATA_COPY.ko;

export const metadata = {
  title: metadataCopy.title,
  description: metadataCopy.description,
};

export default function TarotSelfEsteemLandingPage() {
  return <TarotSelfEsteemLandingContent />;
}
