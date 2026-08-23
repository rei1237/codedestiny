import Link from "next/link";
import GuideCta from "../../components/GuideCta";
import { GUIDE_CTA_TARGETS } from "../../components/guide-cta-targets";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const MAYAN_CALENDAR_GUIDE_TEXT_TRANSLATIONS = {
  ko: {
    "metadata.title": "마야 달력과 마야점 이해 | Code Destiny",
    heading: "마야 달력과 마야점 이해",
    "section.scope": "마야 달력이 살피는 것",
    "section.inputs": "필요한 입력값",
    "section.when": "어떤 때 참고하면 좋은가",
    "section.freePaid": "무료와 유료 범위",
    "section.flow": "해석 흐름",
    "section.results": "결과에서 확인할 수 있는 항목",
    "section.example": "짧은 예시 리딩",
    "section.caution": "해석 시 주의할 점",
  },
  en: {
    "metadata.title": "Understanding the Mayan Calendar and Mayan Oracle | Code Destiny",
    heading: "Understanding the Mayan Calendar and Mayan Oracle",
    "section.scope": "What the Mayan Calendar Looks At",
    "section.inputs": "Required Inputs",
    "section.when": "When It Helps",
    "section.freePaid": "Free and Paid Scope",
    "section.flow": "Reading Flow",
    "section.results": "What You Can Check in the Result",
    "section.example": "Short Sample Reading",
    "section.caution": "What to Keep in Mind",
  },
  ja: {
    "metadata.title": "マヤ暦とマヤ占いの理解 | Code Destiny",
    heading: "マヤ暦とマヤ占いの理解",
    "section.scope": "マヤ暦が見るもの",
    "section.inputs": "必要な入力項目",
    "section.when": "参考にしやすい場面",
    "section.freePaid": "無料と有料の範囲",
    "section.flow": "解釈の流れ",
    "section.results": "結果で確認できる項目",
    "section.example": "短いサンプルリーディング",
    "section.caution": "解釈時の注意点",
  },
  "zh-CN": {
    "metadata.title": "理解玛雅日历与玛雅占卜 | Code Destiny",
    heading: "理解玛雅日历与玛雅占卜",
    "section.scope": "玛雅日历会观察什么",
    "section.inputs": "需要输入的信息",
    "section.when": "适合参考的时刻",
    "section.freePaid": "免费与付费范围",
    "section.flow": "解读流程",
    "section.results": "结果中可查看的项目",
    "section.example": "简短示例解读",
    "section.caution": "解读时的注意事项",
  },
  "zh-TW": {
    "metadata.title": "理解瑪雅曆與瑪雅占卜 | Code Destiny",
    heading: "理解瑪雅曆與瑪雅占卜",
    "section.scope": "瑪雅曆會觀察什麼",
    "section.inputs": "需要輸入的資訊",
    "section.when": "適合參考的時刻",
    "section.freePaid": "免費與付費範圍",
    "section.flow": "解讀流程",
    "section.results": "結果中可查看的項目",
    "section.example": "簡短示例解讀",
    "section.caution": "解讀時的注意事項",
  },
};

function mayanCalendarGuideText(key) {
  return MAYAN_CALENDAR_GUIDE_TEXT_TRANSLATIONS.ko[key] || MAYAN_CALENDAR_GUIDE_TEXT_TRANSLATIONS.en[key] || "Translation pending";
}

export function generateMetadata() {
  return generatePageMetadata({
    path: "/mayan-calendar/guide",
    title: mayanCalendarGuideText("metadata.title"),
    description:
      "마야 달력의 기본 구조, 탄생 기호를 읽는 흐름, 입력값, 샘플 리딩, 해석 시 주의사항을 안내합니다.",
    keywords: ["마야 달력", "마야점", "마야 운세", "탄생 기호", "Code Destiny"],
  });
}

const flowItems = [
  "생년월일을 기준으로 마야 달력의 기본 기호와 흐름을 확인합니다.",
  "탄생 기호가 비추는 기질, 관계 방식, 반복되는 선택의 리듬을 나누어 읽습니다.",
  "현재 운세 흐름은 특정 사건을 확정하기보다 주의 깊게 다룰 주제를 보여 주는 참고선으로 봅니다.",
  "결과 끝에는 현실적인 선택과 함께 확인해야 할 주의사항을 정리합니다.",
];

const resultItems = [
  "탄생 기호의 기본 성향",
  "관계와 일에서 드러나는 반응 방식",
  "강하게 떠오르는 주제와 조율 지점",
  "오늘 또는 특정 시기에 참고할 흐름",
  "중대한 결정에서 함께 확인해야 할 현실 조건",
];

const faqItems = [
  {
    question: "마야 달력은 사주나 점성술과 같은 방식인가요?",
    answer:
      "같은 생년월일을 보더라도 해석 체계가 다릅니다. 사주는 오행과 천간지지, 점성술은 행성과 하우스를 중심으로 보고, 마야 달력은 고유한 기호와 주기의 언어로 삶의 리듬을 살핍니다.",
  },
  {
    question: "출생시간도 필요한가요?",
    answer:
      "기본 마야 달력 리딩은 생년월일만으로 확인할 수 있습니다. 다만 다른 운세 체계와 함께 보는 복합 해석에서는 출생시간이 추가로 필요할 수 있습니다.",
  },
  {
    question: "흐름이 무겁게 나오면 나쁜 일이 생기나요?",
    answer:
      "무거운 흐름은 불운을 확정하지 않습니다. 감정, 관계, 일정, 선택을 조금 더 조심스럽게 살피라는 신호로 받아들이는 편이 좋습니다.",
  },
];

export default function MayanCalendarGuidePage() {
  return (
    <main className="cd-main-shell cd-guide">
      <header className="cd-main-header">
        <h1 className="cd-main-title">{mayanCalendarGuideText("heading")}</h1>
        <p className="cd-main-intro">
          마야 달력은 날짜를 단순한 숫자가 아니라 상징과 주기의 흐름으로 바라봅니다. Code Destiny는 탄생 기호와 현재의 리듬을 통해 기질과 관계, 선택의 방향을 차분히 살피되, 결과를 확정적 예언이 아닌 자기 이해의 참고 자료로 다룹니다.
        </p>
      </header>

      <section className="cd-card-grid">
        <article className="cd-card">
          <h2>{mayanCalendarGuideText("section.scope")}</h2>
          <p>
            마야 달력 리딩은 태어난 날의 상징이 어떤 기질과 반응 방식을 비추는지 살핍니다. 한 가지 기호가 사람을 전부 설명하지는 않으며, 현재의 관계와 선택에서 어떤 흐름이 강하게 떠오르는지 함께 읽을 때 의미가 깊어집니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{mayanCalendarGuideText("section.inputs")}</h2>
          <p>
            기본 입력값은 생년월일입니다. 날짜는 탄생 기호와 주기 흐름을 계산하는 기준이 되며, 다른 체계와 함께 보는 복합 리포트에서는 출생시간이나 출생지가 추가로 쓰일 수 있습니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{mayanCalendarGuideText("section.when")}</h2>
          <p>
            반복되는 감정 패턴이 궁금할 때, 관계에서 자주 맡게 되는 역할을 보고 싶을 때, 오늘의 흐름을 조용히 정리하고 싶을 때 도움이 됩니다. 결과는 선택을 대신하지 않고 스스로를 더 섬세하게 바라보도록 돕습니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{mayanCalendarGuideText("section.freePaid")}</h2>
          <p>
            무료 영역은 탄생 기호와 기본 성향, 짧은 흐름 안내를 제공합니다. 유료 리포트는 관계, 일, 감정 조율, 시기별 참고점을 더 길게 풀어 줍니다. 결제는 해석의 분량과 깊이를 넓히는 선택일 뿐 운을 바꾸는 조건이 아닙니다.
          </p>
        </article>
      </section>

      <section className="cd-card">
        <h2>{mayanCalendarGuideText("section.flow")}</h2>
        <ul>
          {flowItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{mayanCalendarGuideText("section.results")}</h2>
        <ul>
          {resultItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{mayanCalendarGuideText("section.example")}</h2>
        <p>
          탄생 기호가 관계의 조율과 언어의 힘을 강하게 비춘다면, 사람 사이의 분위기를 빠르게 읽고 중간에서 균형을 잡는 재능이 드러납니다. 다만 모두의 마음을 동시에 책임지려 하면 쉽게 지칠 수 있으니, 중요한 약속 전에는 자신의 속도와 여유를 먼저 확인하는 편이 좋습니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>{mayanCalendarGuideText("section.caution")}</h2>
        <p>
          마야 달력 리딩은 엔터테인먼트와 자기 성찰을 위한 참고 자료입니다. 건강, 법률, 투자, 결혼, 이혼, 소송, 진로처럼 삶에 큰 영향을 주는 결정은 결과만으로 정하지 말고 현실 정보와 자격 있는 전문가의 조언을 함께 확인해야 합니다.
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

      <GuideCta target={GUIDE_CTA_TARGETS["/mayan-calendar/guide"]} />

      <nav className="cd-chip-wrap" aria-label="마야 달력 가이드 관련 링크">
        <Link href="/maya" className="cd-chip">마야점 서비스</Link>
        <Link href="/today" className="cd-chip">오늘의 운세</Link>
        <Link href="/calendar/guide" className="cd-chip">운세 달력 가이드</Link>
        <Link href="/disclaimer" className="cd-chip">면책 고지</Link>
        <Link href="/editorial-policy" className="cd-chip">콘텐츠 제작 원칙</Link>
      </nav>
    </main>
  );
}
