import TarotSelfEsteemRouteClient from "./TarotSelfEsteemRouteClient";
import RouteMetadataLocaleSync from "../../components/RouteMetadataLocaleSync";

const TAROT_SELF_ESTEEM_METADATA_COPY = {
  ko: {
    title: "자기 기준 회복 타로 - 다시 내 편에 서는 5카드 리딩",
    description:
      "다섯 장의 카드로 타인의 시선에 흔들린 마음의 시작, 소모 지점, 오늘 지킬 기준을 차분히 살핍니다.",
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
  alternates: {
    canonical: "https://code-destiny.com/tarot/self-esteem",
  },
};

export default function TarotSelfEsteemLandingPage() {
  return (
    <>
      <RouteMetadataLocaleSync entries={TAROT_SELF_ESTEEM_METADATA_COPY} />
      <TarotSelfEsteemRouteClient />
    </>
  );
}
