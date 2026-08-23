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
      {/* 리딩 화면은 클라이언트가 그리고, 그 안의 소개 문단은 짧다. 아래 안내는 서버에서
          렌더해 검색엔진이 이 리딩의 구조를 읽을 수 있게 한다. 네 자리의 이름과 역할은
          lib/tarot/spreads.mjs 의 healing_rising_four_card 정의를 그대로 옮긴 것이다.
          🔴 이 섹션에 H1 을 두지 말 것 — 페이지의 H1 은 클라이언트가 이미 소유하고 있어
          H1 이 2개가 되면 verify:seo-heading-integrity 가 실패한다. */}
      <section className="sr-only" aria-label="힐링 타로 4카드 안내">
        <h2>힐링 라이징 타로 — 네 자리로 나눠 읽는 회복 리딩</h2>
        <p>
          마음이 지쳤을 때 가장 어려운 일은 감정을 없애는 것이 아니라, 지금 무엇이 나를 소모시키고 있는지
          이름을 붙이는 것입니다. 힐링 라이징 타로는 그 작업을 네 자리로 나눕니다. 원인, 인정, 배움, 행동의
          순서로 한 장씩 놓고, 마지막 자리에서 오늘 안에 해볼 수 있는 크기의 행동 하나로 리딩을 닫습니다.
        </p>
        <h3>네 장이 각각 맡는 자리</h3>
        <ul>
          <li>
            숨겨진 진실 — 감정 소모의 핵심 원인을 봅니다. 겉으로 드러난 사건보다 그 아래에서 힘을 빼앗고
            있는 것이 무엇인지 먼저 짚는 자리입니다.
          </li>
          <li>
            감정 수용 — 지금 인정해야 할 감정을 봅니다. 고쳐야 할 감정이 아니라, 아직 이름을 안 붙여 둔 채로
            남아 있는 감정을 그대로 꺼내 놓는 자리입니다.
          </li>
          <li>
            회복 단서 — 현재 상황이 주는 배움을 봅니다. 지나간 일을 미화하지 않으면서도, 이 구간이 남긴
            쓸 만한 정보가 무엇인지 가려내는 자리입니다.
          </li>
          <li>
            다음 행동 — 즉시 실행 가능한 치유 행동을 봅니다. 네 자리 중 해석 가중치가 가장 높게 잡혀 있으며,
            리딩 전체가 이 한 문장으로 모이도록 설계돼 있습니다.
          </li>
        </ul>
        <h3>이런 순간에 특히 도움이 됩니다</h3>
        <ul>
          <li>왜 힘든지는 알겠는데 무엇부터 손대야 할지 정리가 안 될 때</li>
          <li>같은 감정이 며칠째 반복되면서 일상의 속도를 떨어뜨릴 때</li>
          <li>주변에 설명하기는 애매한데 혼자 두면 계속 무거워지는 일이 있을 때</li>
          <li>회복하고 싶은 마음은 있는데 시작할 크기를 못 정하겠을 때</li>
        </ul>
        <h3>결과를 읽는 법</h3>
        <p>
          네 자리는 좋은 카드와 나쁜 카드로 갈리지 않습니다. 앞의 두 자리가 지금의 상태를 설명하고 뒤의 두
          자리가 방향을 가리키므로, 앞만 읽으면 무겁고 뒤만 읽으면 근거가 빠집니다. 짧은 시간에 반복해서
          뽑기보다 하루가 지나거나 상황이 바뀐 뒤에 다시 보는 편이 더 안정적입니다.
        </p>
        <p>
          이 리딩은 오락과 자기성찰을 위한 콘텐츠이며 심리 상담이나 진단을 대신하지 않습니다. 건강, 법률,
          투자, 치료, 안전에 관한 결정은 전문 기관의 도움을 우선해 주세요. 기본 리딩은 회원가입 없이 무료로
          사용할 수 있습니다.
        </p>
      </section>
      <TarotHealingRouteClient />
    </>
  );
}
