import { redirect } from "next/navigation";
import { generatePageMetadata } from "../../../../lib/generate-page-metadata";

const TAROT_HEALING_START_METADATA_COPY = {
  ko: {
    title: "무료 힐링 타로 4카드 — 오늘의 회복 에너지 리딩",
    description:
      "지금 바로 무료 힐링 타로 4카드 리딩. 마음이 지쳤을 때, 쉬고 싶을 때 — 과거의 상처·현재 에너지·회복 방향·오늘의 선물을 카드 한 장씩 확인하세요. 완전 무료.",
    keywords: ["힐링 타로", "4카드 타로", "Sun and Light", "회복 타로", "무료 타로", "타로 리딩", "healing tarot spread"],
    featureList: ["4카드 힐링 스프레드", "오늘의 회복 에너지 리딩", "과거·현재·방향·선물 카드 해석"],
  },
  en: {
    title: "Free 4-Card Healing Tarot - Today's Recovery Energy Reading",
    description:
      "Start a free 4-card healing tarot reading now. When your heart feels tired and needs rest, check past wounds, present energy, recovery direction, and today's gift one card at a time.",
    keywords: ["healing tarot", "4-card tarot", "Sun and Light", "recovery tarot", "free tarot", "tarot reading", "healing tarot spread"],
    featureList: ["4-card healing spread", "Today's recovery energy reading", "Past, present, direction, and gift card reading"],
  },
  ja: {
    title: "無料ヒーリングタロット4カード — 今日の回復エネルギーリーディング",
    description:
      "今すぐ無料のヒーリングタロット4カードリーディングを始められます。心が疲れたとき、休みたいとき、過去の傷・現在のエネルギー・回復の方向・今日の贈り物を一枚ずつ確認してください。",
    keywords: ["ヒーリングタロット", "4カードタロット", "Sun and Light", "回復タロット", "無料タロット", "タロットリーディング", "healing tarot spread"],
    featureList: ["4カードヒーリングスプレッド", "今日の回復エネルギーリーディング", "過去・現在・方向・贈り物カード解釈"],
  },
  zh: {
    title: "免费四张疗愈塔罗 - 今日恢复能量解读",
    description:
      "立即开始免费四张疗愈塔罗。当内心疲惫、想要休息时，一张张查看过去伤口、当前能量、恢复方向与今日礼物。",
    keywords: ["疗愈塔罗", "四张塔罗", "Sun and Light", "恢复塔罗", "免费塔罗", "塔罗解读", "healing tarot spread"],
    featureList: ["四张疗愈牌阵", "今日恢复能量解读", "过去、现在、方向与礼物牌解读"],
  },
} as const;

const META = {
  path: "/tarot/healing",
  ...TAROT_HEALING_START_METADATA_COPY.ko,
  image: "https://code-destiny.com/fuctionassets/healing.webp",
  applicationCategory: "EntertainmentApplication",
  // 🔴 이 라우트는 /tarot/healing 으로 보내는 딥링크 스텁이라 서버 렌더 텍스트가 28자이고
  //    h1 이 0개다(2026-08-28 dist 실측). 그런데 x-robots 헤더가 없고 metadata 의 path 가
  //    부모라서 isNoindexPath 도 안 걸려, 라이브에서 index,follow 로 나가고 있었다.
  //    사이트맵 밖 + 부모 canonical 이라 색인 이득은 0인데 얇은 페이지 신호만 남는다.
  //    lib/seo/siteSeo.ts 의 noindexPathPrefixes 로는 못 막는다 — 그 목록은 위 path(부모)를
  //    보고 판정하고, 부모까지 함께 막아 버린다. 그래서 이 옵션을 쓴다(ShareWidget 유지).
  noindex: true,
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

export default function SunHealingTarotAppPage() {
  redirect("/tarot/healing");
}
