import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import ZiweiChartClientLoader from "./ZiweiChartClientLoader";
import RouteMetadataLocaleSync from "../../components/RouteMetadataLocaleSync";

const ZIWEI_CHART_METADATA_COPY = {
  ko: {
    title: "심화 자미두수 상담 · 12궁·사화·대한 해석",
    description:
      "자미두수(紫微斗數) 명반을 기반으로 12궁·명궁·신궁·사화·대한 흐름을 정밀하게 엮어 내면의 방향과 현실의 선택을 읽는 심화 상담 리포트입니다.",
    keywords: ["자미두수", "자미두수 명반", "심화 자미두수 상담", "12궁", "명궁", "신궁", "사화", "대한", "자미두수 심화", "12궁 심층 분석", "ziwei chart", "zi wei dou shu"],
  },
  en: {
    title: "Advanced Ziwei Dou Shu Consultation · 12 Palaces, Four Transformations, and Major Luck",
    description:
      "An advanced consultation report that weaves the 12 palaces, Ming and Shen palaces, Four Transformations, and major luck flow from a Ziwei Dou Shu chart.",
    keywords: ["Ziwei Dou Shu", "Ziwei chart", "advanced Ziwei consultation", "12 palaces", "Ming palace", "Shen palace", "Four Transformations", "major luck", "advanced Ziwei", "12 palace analysis", "ziwei chart", "zi wei dou shu"],
  },
  ja: {
    title: "深層紫微斗数相談 · 十二宮・四化・大限解釈",
    description:
      "紫微斗数命盤をもとに、十二宮・命宮・身宮・四化・大限の流れを精密に結び、内面の方向と現実の選択を読む深層相談リポートです。",
    keywords: ["紫微斗数", "紫微斗数命盤", "深層紫微斗数相談", "十二宮", "命宮", "身宮", "四化", "大限", "紫微斗数深層", "十二宮深層分析", "ziwei chart", "zi wei dou shu"],
  },
  zh: {
    title: "深度紫微斗数咨询 · 十二宫、四化与大限解读",
    description:
      "基于紫微斗数命盘，精密串联十二宫、命宫、身宫、四化与大限流向，解读内在方向与现实选择的深度咨询报告。",
    keywords: ["紫微斗数", "紫微斗数命盘", "深度紫微斗数咨询", "十二宫", "命宫", "身宫", "四化", "大限", "紫微斗数深度", "十二宫深度分析", "ziwei chart", "zi wei dou shu"],
  },
};

export function generateMetadata() {
  const copy = ZIWEI_CHART_METADATA_COPY.ko;
  return generatePageMetadata({
    path: "/ziwei/chart",
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
  });
}

const ZIWEI_FAQ_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "자미두수 명반은 무엇을 보나요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "명궁·신궁을 기준으로 12궁에 배치된 주성과 사화, 대한의 흐름을 함께 읽어 성향·관계·진로·재물의 작동 방식을 해석합니다.",
      },
    },
    {
      "@type": "Question",
      name: "사주와 자미두수는 어떻게 다른가요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "사주는 오행 균형과 간지 관계를 중심으로 기질을 읽고, 자미두수는 12궁 공간 배치와 시간축 흐름으로 영역별 변화를 읽는 데 강점이 있습니다.",
      },
    },
  ],
});

export default function ZiweiChartPage() {
  return (
    <main className="relative min-h-[100dvh] bg-[#030712] text-slate-100">
      <RouteMetadataLocaleSync entries={ZIWEI_CHART_METADATA_COPY} />
      <h1 className="sr-only">
        심화 자미두수 상담으로 보는 내 인생의 12궁
      </h1>
      <section className="sr-only" aria-label="심화 자미두수 상담 안내">
        <p>
          자미두수 명반은 한 사람의 삶을 열두 궁으로 펼쳐, 성향과 관계, 일, 재물, 건강, 이동, 배우자와 가족의 흐름을 입체적으로 살핍니다.
          명궁과 신궁은 삶을 바라보는 기본 방향을 잡아 주고, 각 궁에 놓인 별들은 어떤 영역에서 강하게 빛나고 어디에서 조심스러운 조율이 필요한지 알려 줍니다.
        </p>
        <p>
          심화 상담에서는 주성의 배치만 보지 않고 사화의 움직임, 대한의 시간축, 궁과 궁 사이의 호응을 함께 읽습니다.
          어떤 시기에는 선택이 빠르게 열리고, 어떤 시기에는 이미 쌓아 둔 인연과 실력이 조용히 결실을 맺습니다.
          명반 위의 흐름은 운명을 고정된 결론으로 가두지 않고, 지금 현실에서 어떤 태도와 결정이 더 자연스러운지를 가리킵니다.
        </p>
        <p>
          12궁은 각기 다른 삶의 방처럼 작동합니다. 관록궁은 일과 사회적 자리의 결을 비추고, 재백궁은 돈이 들어오고 머무는 방식을 드러내며,
          부부궁과 복덕궁은 마음이 쉬는 관계와 내면의 만족감을 보여 줍니다. 이 흐름을 함께 보면 단편적인 점수보다 더 섬세한 인생의 지도가 떠오릅니다.
        </p>
        <p>
          별의 배치는 겉으로 드러난 성향만 말하지 않습니다. 스스로도 설명하기 어려웠던 망설임, 오래 반복된 선택의 방식,
          관계 안에서 자꾸 맡게 되는 역할까지 12궁의 흐름 속에서 천천히 모습을 드러냅니다.
        </p>
        <p>
          자미두수의 깊이는 별의 이름을 많이 아는 데서 끝나지 않고, 서로 다른 궁이 어떤 방식으로 말을 주고받는지 읽는 데서 열립니다.
          한 궁의 강한 별이 다른 궁의 부담을 덜어 주기도 하고, 사화의 흐름이 오래 미뤄 둔 결정을 현실 앞으로 부르기도 합니다.
          이 상담은 그 신호를 차분히 엮어 사용자가 지금의 일, 관계, 돈, 마음의 방향을 더 분명하게 바라보도록 돕습니다.
        </p>
        <p>
          명반을 읽을 때 가장 중요한 것은 좋은 별과 나쁜 별을 단순히 나누는 일이 아닙니다. 별이 놓인 자리, 서로 비추는 각도, 시간의 흐름 안에서 힘이 켜지는 순서를 함께 봐야 합니다.
          어떤 별은 젊은 시절에는 부담처럼 느껴지지만 시간이 지나며 책임과 권위로 바뀌고, 어떤 별은 처음에는 화려하게 열리지만 지속을 위해 절제와 균형을 요구합니다.
        </p>
        <p>
          그래서 심화 자미두수 상담은 지금의 답답함을 한 가지 원인으로 몰지 않고, 여러 궁의 관계 속에서 조심스럽게 풀어 갑니다.
          배우자궁의 긴장, 관록궁의 압박, 재백궁의 흐름, 복덕궁의 피로가 서로 얽힐 때 삶은 단순한 선택보다 깊은 조율을 필요로 합니다.
          명반은 그 조율의 순서를 보여 주는 조용한 별자리 지도처럼 작동합니다.
        </p>
        <p>
          사용자는 이를 통해 당장 붙잡아야 할 기회와 조금 더 익혀야 할 과제, 마음을 소모시키는 관계와 힘을 회복시키는 환경을 구분할 수 있습니다.
          해석은 과장된 예언보다 현실적인 방향에 머물며, 운의 흐름이 열리는 시기에도 스스로 선택할 수 있는 여지를 함께 남깁니다.
        </p>
        <p>
          명궁이 삶의 중심을 비춘다면 신궁은 시간이 흐를수록 몸에 배는 태도를 보여 줍니다.
          부모궁과 형제궁은 뿌리에서 이어진 관계의 결을 말하고, 천이궁은 세상 밖으로 나갈 때 어떤 풍경에서 운이 넓어지는지를 가리킵니다.
          질액궁은 몸과 마음이 보내는 작은 신호를 살피게 하고, 노복궁은 곁에 두어야 할 사람과 거리를 조율해야 할 인연을 조용히 알려 줍니다.
        </p>
        <p>
          자미두수는 복잡한 별자리의 나열처럼 보이지만, 제대로 읽으면 한 사람의 삶이 어디에서 숨을 고르고 어디에서 빛을 내는지 선명해집니다.
          좋은 시기를 기다리는 일보다 중요한 것은 그 시기에 맞는 그릇을 준비하는 일이며, 버거운 시기에도 완전히 막힌 길만 있는 것은 아닙니다.
          심화 해석은 별과 궁의 대화를 따라가며, 지금의 선택이 훗날 어떤 장면으로 이어질지 차분히 비춥니다.
        </p>
        <p>
          특히 대한의 흐름은 인생의 장면이 언제 깊어지고 언제 가벼워지는지를 보여 줍니다.
          지나간 시기의 의미를 다시 읽고 다가오는 시기의 힘을 미리 살피면, 서둘러 붙잡아야 할 일과 조용히 기다려도 되는 일이 구분됩니다.
          별들은 명령하지 않고 방향을 비추며, 그 빛 안에서 선택은 더 침착하고 단단해집니다.
        </p>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ZIWEI_FAQ_JSON_LD }} />
      <ZiweiChartClientLoader />
    </main>
  );
}
