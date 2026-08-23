import Link from "next/link";
import GuideCta from "../../components/GuideCta";
import { GUIDE_CTA_TARGETS } from "../../components/guide-cta-targets";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const FIVE_ELEMENTS_GUIDE_TEXT_TRANSLATIONS = {
  ko: {
    "metadata.title": "오행과 균형 가이드 | Code Destiny",
    heading: "오행과 균형 가이드",
    "section.scope": "오행이 살피는 것",
    "section.inputs": "필요한 입력값",
    "section.when": "어떤 때 참고하면 좋은가",
    "section.freePaid": "무료와 유료 범위",
    "section.flow": "해석 흐름",
    "section.results": "결과에서 확인할 수 있는 항목",
    "section.example": "짧은 예시 리딩",
    "section.caution": "해석 시 주의할 점",
  },
  en: {
    "metadata.title": "Five Elements and Balance Guide | Code Destiny",
    heading: "Five Elements and Balance Guide",
    "section.scope": "What the Five Elements Look At",
    "section.inputs": "Required Inputs",
    "section.when": "When It Helps",
    "section.freePaid": "Free and Paid Scope",
    "section.flow": "Reading Flow",
    "section.results": "What You Can Check in the Result",
    "section.example": "Short Sample Reading",
    "section.caution": "What to Keep in Mind",
  },
  ja: {
    "metadata.title": "五行とバランスガイド | Code Destiny",
    heading: "五行とバランスガイド",
    "section.scope": "五行が見るもの",
    "section.inputs": "必要な入力項目",
    "section.when": "参考にしやすい場面",
    "section.freePaid": "無料と有料の範囲",
    "section.flow": "解釈の流れ",
    "section.results": "結果で確認できる項目",
    "section.example": "短いサンプルリーディング",
    "section.caution": "解釈時の注意点",
  },
  "zh-CN": {
    "metadata.title": "五行与平衡指南 | Code Destiny",
    heading: "五行与平衡指南",
    "section.scope": "五行会观察什么",
    "section.inputs": "需要输入的信息",
    "section.when": "适合参考的时刻",
    "section.freePaid": "免费与付费范围",
    "section.flow": "解读流程",
    "section.results": "结果中可查看的项目",
    "section.example": "简短示例解读",
    "section.caution": "解读时的注意事项",
  },
  "zh-TW": {
    "metadata.title": "五行與平衡指南 | Code Destiny",
    heading: "五行與平衡指南",
    "section.scope": "五行會觀察什麼",
    "section.inputs": "需要輸入的資訊",
    "section.when": "適合參考的時刻",
    "section.freePaid": "免費與付費範圍",
    "section.flow": "解讀流程",
    "section.results": "結果中可查看的項目",
    "section.example": "簡短示例解讀",
    "section.caution": "解讀時的注意事項",
  },
};

function fiveElementsGuideText(key) {
  return FIVE_ELEMENTS_GUIDE_TEXT_TRANSLATIONS.ko[key] || FIVE_ELEMENTS_GUIDE_TEXT_TRANSLATIONS.en[key] || "Translation pending";
}

export function generateMetadata() {
  return generatePageMetadata({
    path: "/saju/five-elements",
    title: fiveElementsGuideText("metadata.title"),
    description:
      "사주 오행의 목화토금수 균형을 어떻게 읽는지와 입력값, 해석 흐름, 샘플 리딩, 주의사항을 안내합니다.",
    keywords: ["오행", "사주 오행", "목화토금수", "오행 균형", "명리학", "Code Destiny"],
  });
}

const flowItems = [
  "생년월일과 출생시간으로 사주 네 기둥을 세우고 목화토금수의 분포를 확인합니다.",
  "단순 개수보다 계절, 일간의 힘, 천간과 지지의 연결을 함께 살핍니다.",
  "강한 오행은 삶에서 쉽게 쓰는 힘으로, 약한 오행은 보완과 조율이 필요한 리듬으로 읽습니다.",
  "결과는 생활 습관, 관계, 일의 방식에서 참고할 수 있는 언어로 정리합니다.",
];

const resultItems = [
  "목화토금수의 기본 분포",
  "강하게 드러나는 기질과 반응 방식",
  "보완하면 좋은 생활 리듬",
  "일과 관계에서 힘이 쓰이는 방향",
  "건강·재정·관계 결정에서 함께 확인해야 할 주의사항",
];

const faqItems = [
  {
    question: "부족한 오행이 있으면 반드시 보충해야 하나요?",
    answer:
      "부족함은 불완전함을 뜻하지 않습니다. 계절과 전체 구조에 따라 적게 있는 오행이 오히려 중요한 방향을 만들 수 있으므로, 단순 보충보다 균형과 활용 방식을 함께 보는 편이 좋습니다.",
  },
  {
    question: "오행으로 건강 상태를 알 수 있나요?",
    answer:
      "오행은 생활 리듬과 체감 경향을 상징적으로 참고할 수 있을 뿐 의료 진단이 아닙니다. 증상이나 질환이 의심되면 반드시 의료 전문가와 상담해야 합니다.",
  },
  {
    question: "강한 오행은 항상 장점인가요?",
    answer:
      "강한 오행은 재능처럼 드러나기도 하지만 과하면 피로와 고집, 관계의 마찰로 나타날 수 있습니다. 잘 쓰는 힘일수록 쉬는 리듬과 조율이 함께 필요합니다.",
  },
];

export default function SajuFiveElementsPage() {
  return (
    <main className="cd-main-shell cd-guide">
      <header className="cd-main-header">
        <h1 className="cd-main-title">{fiveElementsGuideText("heading")}</h1>
        <p className="cd-main-intro">
          오행은 목, 화, 토, 금, 수가 서로 돕고 제어하며 삶의 기질과 리듬을 이루는 명리학의 기본 언어입니다. Code Destiny는 오행을 부족과 과다의 점수표로만 보지 않고, 계절과 배치 속에서 어떤 힘이 자연스럽게 흐르는지 살핍니다.
        </p>
      </header>

      <section className="cd-card-grid">
        <article className="cd-card">
          <h2>{fiveElementsGuideText("section.scope")}</h2>
          <p>
            목은 성장과 방향, 화는 표현과 열기, 토는 안정과 조율, 금은 정리와 기준, 수는 감수성과 지혜의 흐름을 비춥니다. 한 오행이 많거나 적다는 사실보다 서로 어떤 관계를 맺는지가 더 중요합니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{fiveElementsGuideText("section.inputs")}</h2>
          <p>
            생년월일, 출생시간, 성별이 기본 입력값입니다. 출생시간은 시주와 세부 균형을 확인하는 데 필요하고, 계절은 오행의 온도와 힘을 읽는 중요한 기준이 됩니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{fiveElementsGuideText("section.when")}</h2>
          <p>
            내가 어떤 환경에서 힘이 살아나는지 궁금할 때, 피로가 쌓이는 생활 리듬을 돌아보고 싶을 때, 관계와 일에서 자주 반복되는 태도를 정리하고 싶을 때 도움이 됩니다. 오행은 선택을 대신하지 않고 균형을 살피는 지도처럼 작동합니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{fiveElementsGuideText("section.freePaid")}</h2>
          <p>
            무료 영역은 오행 분포와 기본 성향, 간단한 균형 조언을 제공합니다. 유료 리포트는 계절, 십성, 대운과 연결된 세부 흐름을 더 깊게 다룹니다. 결제는 해석의 깊이를 넓히는 선택일 뿐 운의 결과를 보장하지 않습니다.
          </p>
        </article>
      </section>

      <section className="cd-card">
        <h2>{fiveElementsGuideText("section.flow")}</h2>
        <ul>
          {flowItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{fiveElementsGuideText("section.results")}</h2>
        <ul>
          {resultItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{fiveElementsGuideText("section.example")}</h2>
        <p>
          화의 기운이 강하고 수가 약하게 드러난다면 표현력과 추진력은 빠르게 살아나지만, 감정을 식히고 깊게 듣는 시간이 부족해질 수 있습니다. 이 흐름은 중요한 대화 전 숨을 고르고, 휴식과 수면 리듬을 일정 안에 남겨 둘 때 더 부드럽게 열립니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>{fiveElementsGuideText("section.caution")}</h2>
        <p>
          오행 해석은 엔터테인먼트와 자기 점검을 위한 참고 자료이며 의료 진단이나 치료 지침이 아닙니다. 건강, 투자, 법률, 결혼, 이혼, 소송, 진로처럼 중대한 결정은 실제 정보와 자격 있는 전문가의 조언을 함께 확인해야 합니다.
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

      <GuideCta target={GUIDE_CTA_TARGETS["/saju/five-elements"]} />

      <nav className="cd-chip-wrap" aria-label="오행 가이드 관련 링크">
        <Link href="/saju/guide" className="cd-chip">사주 기본 가이드</Link>
        <Link href="/saju/ten-gods" className="cd-chip">십성 가이드</Link>
        <Link href="/manse" className="cd-chip">만세력 보기</Link>
        <Link href="/disclaimer" className="cd-chip">면책 고지</Link>
        <Link href="/editorial-policy" className="cd-chip">콘텐츠 제작 원칙</Link>
      </nav>
    </main>
  );
}
