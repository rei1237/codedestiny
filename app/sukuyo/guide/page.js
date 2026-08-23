import Link from "next/link";
import GuideCta from "../../components/GuideCta";
import { GUIDE_CTA_TARGETS } from "../../components/guide-cta-targets";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const SUKUYO_GUIDE_TEXT_TRANSLATIONS = {
  ko: {
    metaTitle: "숙요 27숙과 궁합 구조 | Code Destiny",
    observe: "숙요점이 살피는 것",
    inputs: "필요한 입력값",
    useCases: "언제 참고하면 좋은가",
    access: "무료와 유료 범위",
    flow: "해석 흐름",
    resultItems: "결과에서 확인할 수 있는 항목",
    sample: "짧은 예시 리딩",
    caution: "해석 시 주의할 점",
  },
};

function sukuyoGuideText(key) {
  return SUKUYO_GUIDE_TEXT_TRANSLATIONS.ko[key];
}

export function generateMetadata() {
  return generatePageMetadata({
    path: "/sukuyo/guide",
    title: sukuyoGuideText("metaTitle"),
    description:
      "숙요점의 27숙 구조, 본명숙과 상대 숙의 관계, 궁합에서 보는 거리와 긴장, 무료·유료 해석 범위를 안내합니다.",
    keywords: ["숙요점 가이드", "27숙", "숙요 궁합", "본명숙", "Code Destiny"],
  });
}

const flowItems = [
  "생년월일을 기준으로 본명숙을 찾고 27숙의 상징을 확인합니다.",
  "상대가 있는 경우 두 사람의 숙 사이 거리와 관계 이름을 살핍니다.",
  "좋고 나쁨을 한 줄로 단정하지 않고 끌림, 긴장, 안정감, 반복되는 역할을 나누어 봅니다.",
  "궁합 결과는 관계의 결을 이해하는 자료로 두고, 실제 대화와 존중을 함께 확인합니다.",
];

const resultItems = [
  "나의 본명숙과 기본 기질",
  "관계에서 편안한 거리와 부담이 커지는 지점",
  "상대와의 끌림, 배움, 충돌 가능성",
  "연애, 협업, 친구 관계에서 다르게 드러나는 분위기",
  "해석을 현실에 적용할 때의 주의사항",
];

const faqItems = [
  {
    question: "숙요 궁합이 나쁘면 관계를 끝내야 하나요?",
    answer:
      "그렇게 단정하지 않습니다. 긴장이 있는 관계는 서로의 방식이 다르다는 뜻일 수 있습니다. 관계의 지속 여부는 존중, 대화, 안전, 현실 조건을 함께 보아야 합니다.",
  },
  {
    question: "생년월일만으로 충분한가요?",
    answer:
      "숙요점은 기본적으로 생년월일을 중심으로 본명숙을 계산합니다. 다만 달력 기준과 계산 방식에 따라 차이가 생길 수 있으므로 결과는 참고 자료로 받아들이는 편이 좋습니다.",
  },
  {
    question: "상대의 동의 없이 궁합을 봐도 되나요?",
    answer:
      "가벼운 자기 성찰 목적의 참고는 가능하지만, 결과를 상대에게 단정적으로 적용하거나 관계를 압박하는 근거로 사용하지 않아야 합니다.",
  },
];

export default function SukuyoGuidePage() {
  return (
    <main className="cd-main-shell cd-guide">
      <header className="cd-main-header">
        <h1 className="cd-main-title">숙요 27숙과 궁합 구조</h1>
        <p className="cd-main-intro">
          숙요점은 달의 별자리 흐름을 27개의 숙으로 나누어 사람의 기질과 관계의 거리를 읽는 동양 점술 체계입니다. Code Destiny의 숙요 해석은 관계를 겁주거나 단정하지 않고, 서로 다른 리듬을 이해하는 상담 언어로 풀어냅니다.
        </p>
      </header>

      <section className="cd-card-grid">
        <article className="cd-card">
          <h2>{sukuyoGuideText("observe")}</h2>
          <p>
            숙요점은 본명숙을 중심으로 내가 편안하게 반응하는 방식, 관계에서 가까워지는 속도, 상대와 부딪히기 쉬운 지점을 살핍니다. 궁합은 운명적 확정이 아니라 두 사람이 어떤 리듬으로 만나는지 보여 주는 참고 지도입니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{sukuyoGuideText("inputs")}</h2>
          <p>
            기본 입력값은 생년월일입니다. 궁합을 볼 때는 두 사람의 생년월일이 필요합니다. 이름이나 현재 관계 상태는 해석 문장을 더 자연스럽게 이해하는 데 도움을 줄 수 있지만, 본명숙 계산의 중심은 생년월일입니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{sukuyoGuideText("useCases")}</h2>
          <p>
            관계가 빠르게 가까워졌지만 이유 없이 부담스러울 때, 반복되는 오해의 결을 알고 싶을 때, 연애와 협업에서 서로의 속도를 맞추고 싶을 때 참고하기 좋습니다. 결과는 상대를 판단하는 딱지가 아니라 대화의 실마리로 두어야 합니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{sukuyoGuideText("access")}</h2>
          <p>
            무료 영역은 본명숙과 기본 성향, 간단한 관계 분위기를 안내합니다. 유료 리포트는 관계 거리, 반복되는 감정 패턴, 상황별 조언, 주의할 표현을 더 세밀하게 풀어 줍니다. 결제를 하지 않아도 관계의 운이 나빠지는 것은 아닙니다.
          </p>
        </article>
      </section>

      <section className="cd-card">
        <h2>{sukuyoGuideText("flow")}</h2>
        <ul>
          {flowItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{sukuyoGuideText("resultItems")}</h2>
        <ul>
          {resultItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{sukuyoGuideText("sample")}</h2>
        <p>
          한 사람은 빠르게 마음을 여는 숙이고 다른 사람은 거리를 두며 확인하는 숙이라면, 끌림은 강하지만 대화의 속도에서 엇갈림이 생길 수 있습니다. 이 관계는 서두르기보다 약속의 빈도와 표현 방식을 조율할 때 더 안정적으로 흐릅니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>{sukuyoGuideText("caution")}</h2>
        <p>
          숙요 궁합은 엔터테인먼트와 자기 성찰을 위한 참고 자료입니다. 결혼, 이혼, 이별, 재회, 소송, 치료, 투자처럼 중대한 결정은 숙요 결과만으로 정하지 말고 현실 정보와 전문가 조언을 함께 확인해야 합니다.
        </p>
      </section>

      <section className="cd-card-grid">
        {faqItems.map((item) => (
          <article key={item.question} className="cd-card">
            <h2>{item.question}</h2>
            <p>{item.answer}</p>
          </article>
        ))}
      </section>

      <GuideCta target={GUIDE_CTA_TARGETS["/sukuyo/guide"]} />

      <nav className="cd-chip-wrap" aria-label="숙요점 가이드 관련 링크">
        <Link href="/sukuyo" className="cd-chip">숙요점 서비스</Link>
        <Link href="/sukuyo/compatibility" className="cd-chip">숙요 궁합</Link>
        <Link href="/oracle/sukuyo" className="cd-chip">숙요 오라클</Link>
        <Link href="/insights/sukuyo" className="cd-chip">숙요 인사이트</Link>
        <Link href="/disclaimer" className="cd-chip">면책 고지</Link>
        <Link href="/editorial-policy" className="cd-chip">콘텐츠 제작 원칙</Link>
      </nav>
    </main>
  );
}
