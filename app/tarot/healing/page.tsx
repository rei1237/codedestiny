import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import TarotHealingRouteClient from "./TarotHealingRouteClient";
import RouteMetadataLocaleSync from "../../components/RouteMetadataLocaleSync";

const TAROT_HEALING_METADATA_COPY = {
  ko: {
    title: "무료 힐링 타로 4카드 — 오늘의 회복 에너지 리딩",
    description:
      "힐링 타로 4카드는 지친 마음을 차분히 바라보고 회복 방향을 정리하는 무료 타로 리딩입니다. 과거의 상처, 현재 에너지, 회복 방향, 오늘의 선물을 카드 흐름으로 확인하세요.",
    keywords: ["힐링 타로", "4카드 타로", "Sun and Light", "회복 타로", "무료 타로", "타로 리딩", "healing tarot spread"],
    featureList: ["4카드 힐링 스프레드", "오늘의 회복 에너지 리딩", "과거·현재·방향·선물 카드 해석"],
  },
  en: {
    title: "Free 4-Card Healing Tarot - Today's Recovery Energy Reading",
    description:
      "The 4-card healing tarot is a free reading that gently looks at a tired heart and organizes the path of recovery through past wounds, present energy, direction, and today's gift.",
    keywords: ["healing tarot", "4-card tarot", "Sun and Light", "recovery tarot", "free tarot", "tarot reading", "healing tarot spread"],
    featureList: ["4-card healing spread", "Today's recovery energy reading", "Past, present, direction, and gift card reading"],
  },
  ja: {
    title: "無料ヒーリングタロット4カード — 今日の回復エネルギーリーディング",
    description:
      "ヒーリングタロット4カードは、疲れた心を静かに見つめ、回復の方向を整理する無料タロットリーディングです。過去の傷、現在のエネルギー、回復の方向、今日の贈り物をカードの流れで確認できます。",
    keywords: ["ヒーリングタロット", "4カードタロット", "Sun and Light", "回復タロット", "無料タロット", "タロットリーディング", "healing tarot spread"],
    featureList: ["4カードヒーリングスプレッド", "今日の回復エネルギーリーディング", "過去・現在・方向・贈り物カード解釈"],
  },
  zh: {
    title: "免费四张疗愈塔罗 - 今日恢复能量解读",
    description:
      "四张疗愈塔罗是一项免费塔罗解读，温柔看见疲惫的心，并通过过去伤口、当前能量、恢复方向与今日礼物整理复原路径。",
    keywords: ["疗愈塔罗", "四张塔罗", "Sun and Light", "恢复塔罗", "免费塔罗", "塔罗解读", "healing tarot spread"],
    featureList: ["四张疗愈牌阵", "今日恢复能量解读", "过去、现在、方向与礼物牌解读"],
  },
} as const;

const META = {
  path: "/tarot/healing",
  ...TAROT_HEALING_METADATA_COPY.ko,
  image: "https://code-destiny.com/fuctionassets/healing.webp",
  applicationCategory: "EntertainmentApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

export default function SunHealingTarotPage() {
  return (
    <>
      <RouteMetadataLocaleSync entries={TAROT_HEALING_METADATA_COPY} />
      <TarotHealingRouteClient />
    </>
  );
}
