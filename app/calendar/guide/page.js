import Link from "next/link";
import GuideCta from "../../components/GuideCta";
import { GUIDE_CTA_TARGETS } from "../../components/guide-cta-targets";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const CALENDAR_GUIDE_TEXT_TRANSLATIONS = {
  ko: {
    "metadata.title": "운세 달력과 일진 달력 사용법 | Code Destiny",
    heading: "운세 달력과 일진 달력 사용법",
    "section.scope": "운세 달력이 살피는 것",
    "section.inputs": "필요한 입력값",
    "section.when": "어떤 때 참고하면 좋은가",
    "section.freePaid": "무료와 유료 범위",
    "section.flow": "해석 흐름",
    "section.results": "결과에서 확인할 수 있는 항목",
    "section.example": "짧은 예시 리딩",
    "section.caution": "해석 시 주의할 점",
  },
  en: {
    "metadata.title": "Fortune Calendar and Daily Cycle Guide | Code Destiny",
    heading: "Fortune Calendar and Daily Cycle Guide",
    "section.scope": "What the Fortune Calendar Looks At",
    "section.inputs": "Required Inputs",
    "section.when": "When It Helps",
    "section.freePaid": "Free and Paid Scope",
    "section.flow": "Reading Flow",
    "section.results": "What You Can Check in the Result",
    "section.example": "Short Sample Reading",
    "section.caution": "What to Keep in Mind",
  },
  ja: {
    "metadata.title": "運勢カレンダーと日運カレンダーの使い方 | Code Destiny",
    heading: "運勢カレンダーと日運カレンダーの使い方",
    "section.scope": "運勢カレンダーが見るもの",
    "section.inputs": "必要な入力項目",
    "section.when": "参考にしやすい場面",
    "section.freePaid": "無料と有料の範囲",
    "section.flow": "解釈の流れ",
    "section.results": "結果で確認できる項目",
    "section.example": "短いサンプルリーディング",
    "section.caution": "解釈時の注意点",
  },
  "zh-CN": {
    "metadata.title": "运势日历与日辰日历使用指南 | Code Destiny",
    heading: "运势日历与日辰日历使用指南",
    "section.scope": "运势日历会观察什么",
    "section.inputs": "需要输入的信息",
    "section.when": "适合参考的时刻",
    "section.freePaid": "免费与付费范围",
    "section.flow": "解读流程",
    "section.results": "结果中可查看的项目",
    "section.example": "简短示例解读",
    "section.caution": "解读时的注意事项",
  },
  "zh-TW": {
    "metadata.title": "運勢日曆與日辰日曆使用指南 | Code Destiny",
    heading: "運勢日曆與日辰日曆使用指南",
    "section.scope": "運勢日曆會觀察什麼",
    "section.inputs": "需要輸入的資訊",
    "section.when": "適合參考的時刻",
    "section.freePaid": "免費與付費範圍",
    "section.flow": "解讀流程",
    "section.results": "結果中可查看的項目",
    "section.example": "簡短示例解讀",
    "section.caution": "解讀時的注意事項",
  },
};

function calendarGuideText(key) {
  return CALENDAR_GUIDE_TEXT_TRANSLATIONS.ko[key] || CALENDAR_GUIDE_TEXT_TRANSLATIONS.en[key] || "Translation pending";
}

export function generateMetadata() {
  return generatePageMetadata({
    path: "/calendar/guide",
    title: calendarGuideText("metadata.title"),
    description:
      "운세 달력과 일진 달력을 어떤 기준으로 읽는지, 입력값, 확인 항목, 샘플 해석, 주의사항을 안내합니다.",
    keywords: ["운세 달력", "일진 달력", "오늘의 운세", "사주 달력", "Code Destiny"],
  });
}

const flowItems = [
  "기준 날짜와 사용자의 생년월일을 바탕으로 하루의 큰 흐름을 정리합니다.",
  "오행, 일진, 관계 흐름을 나누어 과열되기 쉬운 부분과 힘을 쓰기 좋은 부분을 살핍니다.",
  "좋고 나쁨을 단정하기보다 일정, 대화, 휴식, 결정에서 참고할 신호로 풉니다.",
  "결과 마지막에는 운세만으로 결정하지 말아야 할 영역과 현실 확인 항목을 안내합니다.",
];

const resultItems = [
  "오늘 또는 선택한 날짜의 전반적인 분위기",
  "대화, 일, 관계에서 조심하면 좋은 지점",
  "집중하기 좋은 활동과 쉬어 가야 할 리듬",
  "사주 흐름과 연결되는 간단한 해석",
  "중대한 결정 전 확인해야 할 현실 조건",
];

const faqItems = [
  {
    question: "좋은 날이면 중요한 결정을 바로 해도 되나요?",
    answer:
      "달력의 좋은 흐름은 참고할 수 있지만 결정을 대신하지 않습니다. 계약, 투자, 이직, 결혼, 소송처럼 영향이 큰 일은 실제 조건과 전문가 조언을 함께 확인해야 합니다.",
  },
  {
    question: "나쁜 날로 나오면 아무것도 하지 않는 편이 좋나요?",
    answer:
      "무거운 흐름은 멈추라는 명령이 아니라 조심해서 다룰 지점을 알려 주는 신호에 가깝습니다. 중요한 대화는 표현을 부드럽게 하고, 무리한 일정은 여유를 남기는 식으로 활용할 수 있습니다.",
  },
  {
    question: "개인 정보는 왜 필요한가요?",
    answer:
      "생년월일은 개인의 기본 흐름과 날짜의 흐름을 맞추는 데 사용됩니다. 민감한 정보는 필요한 범위에서만 입력하고, 공개된 장소에서 다른 사람의 정보를 대신 입력하지 않는 편이 안전합니다.",
  },
];

export default function CalendarGuidePage() {
  return (
    <main className="cd-main-shell cd-guide">
      <header className="cd-main-header">
        <h1 className="cd-main-title">{calendarGuideText("heading")}</h1>
        <p className="cd-main-intro">
          운세 달력은 날짜마다 달라지는 기운의 온도와 리듬을 살피는 도구입니다. Code Destiny는 하루의 흐름을 좋고 나쁜 날로 단정하기보다, 일정과 대화, 휴식과 결정을 더 신중하게 조율할 수 있는 참고선으로 안내합니다.
        </p>
      </header>

      <section className="cd-card-grid">
        <article className="cd-card">
          <h2>{calendarGuideText("section.scope")}</h2>
          <p>
            일진 달력은 특정 날짜의 기운이 개인의 흐름과 만날 때 어떤 분위기가 생기는지 봅니다. 하루를 완전히 결정하는 표지가 아니라, 일과 관계에서 힘을 덜 쓰고 더 자연스럽게 움직일 수 있는 방향을 살피는 방식입니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{calendarGuideText("section.inputs")}</h2>
          <p>
            기본적으로 확인할 날짜와 생년월일이 필요합니다. 사주 기반 세부 흐름까지 보려면 출생시간이 더해질 수 있습니다. 입력값이 정확할수록 개인 흐름과 날짜 흐름의 접점이 더 분명해집니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{calendarGuideText("section.when")}</h2>
          <p>
            중요한 대화를 앞두었을 때, 일정이 몰려 컨디션 조절이 필요할 때, 하루를 어떤 태도로 시작하면 좋을지 정리하고 싶을 때 도움이 됩니다. 결과는 결정을 강요하지 않고 오늘의 리듬을 읽는 작은 등불처럼 작동합니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{calendarGuideText("section.freePaid")}</h2>
          <p>
            무료 영역은 날짜별 전반 흐름과 짧은 조언을 제공합니다. 유료 리포트는 개인 사주 흐름, 관계와 일의 세부 주제, 반복되는 월간 흐름을 더 자세히 풀어 줍니다. 결제하지 않는다고 운이 나빠지는 일은 없습니다.
          </p>
        </article>
      </section>

      <section className="cd-card">
        <h2>{calendarGuideText("section.flow")}</h2>
        <ul>
          {flowItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{calendarGuideText("section.results")}</h2>
        <ul>
          {resultItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{calendarGuideText("section.example")}</h2>
        <p>
          오늘의 흐름에 불의 기운이 강하게 떠오르면 추진력과 표현력이 살아나지만 말이 빨라지거나 약속을 과하게 잡기 쉽습니다. 중요한 발표나 시작에는 힘을 쓰기 좋고, 관계에서는 상대가 따라올 시간을 남겨 두는 편이 부드럽습니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>{calendarGuideText("section.caution")}</h2>
        <p>
          운세 달력은 엔터테인먼트와 자기 점검을 위한 참고 자료입니다. 의료, 법률, 투자, 결혼, 이혼, 소송, 진로 결정은 달력 결과만으로 정하지 말고 실제 자료와 자격 있는 전문가의 조언을 함께 확인해야 합니다.
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

      <GuideCta target={GUIDE_CTA_TARGETS["/calendar/guide"]} />

      <nav className="cd-chip-wrap" aria-label="운세 달력 가이드 관련 링크">
        <Link href="/today" className="cd-chip">오늘의 운세</Link>
        <Link href="/today" className="cd-chip">데일리 운세</Link>
        <Link href="/manse" className="cd-chip">만세력 보기</Link>
        <Link href="/saju/guide" className="cd-chip">사주 가이드</Link>
        <Link href="/disclaimer" className="cd-chip">면책 고지</Link>
      </nav>
    </main>
  );
}
