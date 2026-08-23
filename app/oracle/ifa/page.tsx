import FeatureLandingPage from "../../components/FeatureLandingPage";

/* 2026-08-24: 이 라우트는 원래 `redirect("/ifa-oracle.html?source=oracle-ifa")` 한 줄이었다.
   그래서 이파점은 색인 대상 페이지가 하나도 없었다 — 목적지인 도구 화면(/ifa-oracle)은
   크롤러 가시 텍스트가 328자뿐이라 noindex 이고, 이 라우트는 리다이렉트라 본문이 0자였다.
   이제 여기가 랜딩이고 도구는 그대로 noindex 다. 실행 버튼의 목적지는
   app/components/FeatureLandingPage.tsx 의 runHref 가 /ifa-oracle 로 잡는다. */

const IFA_ORACLE_METADATA_COPY = {
  ko: {
    title: "IFA 오라클 - 요루바 256 오두 신탁",
    description:
      "이파(IFA) 오라클은 요루바 256 오두 체계를 기반으로 질문의 방향을 해석하는 신탁 서비스입니다.",
  },
  en: {
    title: "IFA Oracle - Yoruba 256 Odu Divination",
    description:
      "The IFA Oracle reads the direction of your question through the Yoruba system of 256 Odu.",
  },
  ja: {
    title: "IFAオラクル - ヨルバ256オドゥ神託",
    description:
      "IFAオラクルは、ヨルバの256オドゥ体系をもとに、問いの向かう先を読み解く神託サービスです。",
  },
  zh: {
    title: "IFA 神谕 - 约鲁巴 256 奥杜占卜",
    description:
      "IFA 神谕基于约鲁巴 256 奥杜体系，解读问题所指向的方向。",
  },
};

const metadataCopy = IFA_ORACLE_METADATA_COPY.ko;

export const metadata = {
  title: metadataCopy.title,
  description: metadataCopy.description,
  keywords: ["이파점", "IFA 오라클", "요루바 점술", "256 오두", "오펠레", "바발라워", "오룬밀라"],
  alternates: {
    canonical: "https://code-destiny.com/oracle/ifa",
  },
  openGraph: {
    type: "website",
    url: "https://code-destiny.com/oracle/ifa",
    title: metadataCopy.title,
    description: metadataCopy.description,
    images: [
      {
        url: "https://code-destiny.com/fuctionassets/ifafortune.webp",
        width: 1200,
        height: 630,
        alt: "IFA 오라클 - 요루바 256 오두 신탁",
      },
    ],
  },
};

/* 아래 설명의 사실 근거는 전부 도구 구현(public/ifa-oracle.html)에서 뽑았다.
   ─ 여덟 번 던져 두 다리를 만드는 방식과 ODU 번호 계산: :531-553
       bits 8개 → L = bits0~3, R = bits4~7, 번호 = L*16 + R + 1 (1~256)
       두 다리가 같으면 이름이 "<오두> Meji"
   ─ 질문의 네 갈래와 각 갈래의 축·징조·금기: CATEGORY_META(:242) · CATEGORY_FOCUS(:249)
   🔴 오두 열여섯의 개별 이름·의미 표는 여기에 옮기지 않았다. 도구의 표에 항목이 17개라
      16 × 16 = 256 이라는 이 체계의 전제와 어긋나 있고(인덱스 16의 Ofun 은 코드가 절대
      접근하지 않는다), 어느 쪽으로 맞출지는 콘텐츠 결정이 먼저다. */
const IFA_VALUE_SECTIONS = [
  {
    title: "이파점은 서아프리카 요루바의 신탁 체계입니다",
    body:
      "이파(Ifá)는 나이지리아 남서부와 베냉 일대의 요루바 사람들이 이어 온 점술이자 구전 지식 체계입니다. 지혜의 신 오룬밀라(Orunmila)의 이름 아래에서 이루어지고, 이를 읽는 사제를 바발라워(Babalawo)라고 부릅니다. 유네스코가 인류무형문화유산으로 등재한 전통이기도 합니다.",
  },
  {
    title: "오펠레 사슬은 한 번에 여덟 면을 던집니다",
    body:
      "이파점의 도구인 오펠레는 여덟 개의 조각이 사슬로 이어진 형태입니다. 한 번 던지면 여덟 조각이 각각 앞면이나 뒷면으로 떨어지고, 그 여덟 개가 네 개씩 두 다리로 나뉩니다. 이 서비스도 같은 구조로 여덟 번의 표시를 만든 뒤 왼쪽 다리와 오른쪽 다리를 따로 읽습니다.",
  },
  {
    title: "열여섯이 두 번 겹쳐 256이 됩니다",
    body:
      "네 개의 표시가 만들 수 있는 조합은 열여섯 가지이고, 그것이 하나의 주요 오두가 됩니다. 다리가 둘이므로 열여섯에 열여섯을 곱한 256가지가 전체 신탁표가 됩니다. 결과 화면에 붙는 번호는 이 표 안에서의 자리이며, 왼쪽 오두와 오른쪽 오두의 조합으로 계산됩니다.",
  },
  {
    title: "두 다리가 같으면 '메지'가 됩니다",
    body:
      "왼쪽과 오른쪽이 같은 오두로 떨어지면 이름 뒤에 메지(Meji)가 붙습니다. 같은 기운이 두 번 겹친 자리라는 뜻이고, 요루바 전통에서 이 열여섯 개의 메지는 신탁표의 기둥으로 취급됩니다. 256가지 중 열여섯 가지가 여기에 해당합니다.",
  },
  {
    title: "질문은 네 갈래 중 하나로 엽니다",
    body:
      "던지기 전에 질문의 길을 먼저 고릅니다. 총운은 삶의 큰 물줄기와 문턱을 넘는 전환을, 연애·관계는 정서적 유대와 신뢰를, 재물·사업은 흐름과 거래와 책임을, 건강·내면은 리듬과 회복과 내면의 중심을 축으로 삼습니다. 같은 오두가 나와도 고른 길에 따라 읽히는 문장이 달라집니다.",
  },
  {
    title: "결과에는 지킬 것과 피할 것이 함께 옵니다",
    body:
      "이파의 해석은 좋고 나쁨을 선고하는 방식이 아니라, 지금의 자리에서 무엇을 하고 무엇을 삼갈지를 함께 일러 주는 쪽에 가깝습니다. 그래서 결과에는 갈래별로 오늘 해 볼 만한 작은 의식 하나와, 지금 특히 조심할 태도 하나가 붙습니다. 총운에서는 여러 결정을 동시에 밀어붙이는 분산 행동을, 연애에서는 상대의 침묵을 임의로 해석해 단정하는 태도를 경계합니다.",
  },
  {
    title: "이렇게 읽는 편이 도움이 됩니다",
    body:
      "한 번의 신탁으로 답을 확정하기보다, 질문 하나를 분명히 정하고 나온 문장을 며칠 안에 실제로 시험해 보는 편이 낫습니다. 같은 질문을 연달아 다시 던지면 대개 같은 자리에 머무는 답이 반복됩니다. 전통 상징 체계를 바탕으로 한 문화 콘텐츠이며 의료·법률·투자 판단의 근거로 쓸 수 없습니다.",
  },
] as const;

const SERVICE = {
  h1: "IFÀ 오라클 — 요루바 256 오두 신탁",
  description: metadataCopy.description,
  ogImage: "https://code-destiny.com/fuctionassets/ifafortune.webp",
  landingPoints: ["오펠레 여덟 면 던지기", "256 오두 신탁표", "질문의 네 갈래별 해석"],
  seoText:
    "이파 오라클은 오펠레 사슬을 여덟 면으로 던져 두 다리의 오두를 세우고, 열여섯이 두 번 겹친 256가지 신탁표에서 지금 질문이 놓인 자리를 읽습니다.",
  valueGuideTitle: "이파점을 이해하는 일곱 가지",
  valueSections: [...IFA_VALUE_SECTIONS],
};

export default function IfaOraclePage() {
  return <FeatureLandingPage service={SERVICE} />;
}
