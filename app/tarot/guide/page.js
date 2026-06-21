import Link from "next/link";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/tarot/guide",
    title: "타로 카드 리딩 입문 | Code Destiny",
    description:
      "타로 리딩의 기본 구조, 질문을 세우는 법, 카드 배열과 해석 흐름, 무료·유료 리딩의 차이와 주의사항을 안내합니다.",
    keywords: ["타로 가이드", "타로 리딩", "타로 카드", "카드 배열", "Code Destiny"],
  });
}

const flowItems = [
  "질문을 현재 상황과 선택지 중심으로 정리합니다.",
  "카드의 상징, 위치, 주변 카드와의 관계를 함께 읽습니다.",
  "좋고 나쁨을 단정하기보다 지금 드러난 감정, 태도, 가능성을 구분합니다.",
  "리딩 끝에는 사용자가 바로 확인할 수 있는 현실적 행동을 짧게 정리합니다.",
];

const resultItems = [
  "현재 마음의 결",
  "상대나 상황을 바라보는 관점",
  "선택지별 장단점",
  "주의해야 할 감정의 흐름",
  "지금 할 수 있는 작은 행동",
];

const faqItems = [
  {
    question: "같은 질문을 여러 번 해도 되나요?",
    answer:
      "짧은 시간 안에 같은 질문을 반복하면 불안이 커질 수 있습니다. 상황이 바뀌었거나 새로운 정보가 생겼을 때 다시 보는 편이 리딩을 더 차분하게 받아들이는 데 좋습니다.",
  },
  {
    question: "나쁜 카드가 나오면 나쁜 일이 생기나요?",
    answer:
      "타로의 어두운 카드는 확정된 불운보다 멈춤, 점검, 관계의 긴장, 감정의 과열을 비추는 경우가 많습니다. 경고가 떠오를수록 현실적인 보호 행동을 함께 살피면 됩니다.",
  },
  {
    question: "타로가 결정을 대신해 줄 수 있나요?",
    answer:
      "타로는 선택의 분위기와 마음의 방향을 비추는 상담 도구입니다. 법률, 의료, 투자, 결혼, 이혼, 소송, 진로처럼 큰 결정은 타로만으로 정하지 않아야 합니다.",
  },
];

export default function TarotGuidePage() {
  return (
    <main className="cd-main-shell">
      <header className="cd-main-header">
        <h1 className="cd-main-title">타로 카드 리딩 입문</h1>
        <p className="cd-main-intro">
          타로는 미래를 단정하는 장치가 아니라, 질문자가 이미 느끼고 있던 감정과 선택의 갈림길을 상징으로 비추는 상담의 언어입니다. Code Destiny의 타로 리딩은 카드의 분위기를 현실적인 조언으로 옮겨, 사용자가 자신의 마음을 조금 더 선명하게 바라보도록 돕습니다.
        </p>
      </header>

      <section className="cd-card-grid">
        <article className="cd-card">
          <h2>타로가 살피는 것</h2>
          <p>
            타로는 현재의 심리, 관계의 온도, 선택지의 장단점, 지금 조심해야 할 태도와 감정의 방향을 살핍니다. 카드는 답을 강요하지 않고, 질문자가 놓치고 있던 흐름을 상징으로 드러냅니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>좋은 질문을 세우는 법</h2>
          <p>
            타로 질문은 맞다·아니다보다 지금 내가 무엇을 살펴야 하는지에 가까울수록 깊어집니다. 예를 들어 그 사람이 돌아올까요보다 이 관계에서 내가 확인해야 할 마음은 무엇인가요처럼 묻는 편이 더 건강한 리딩으로 이어집니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>필요한 입력값</h2>
          <p>
            질문 주제, 현재 상황, 선택지, 관계의 맥락이 핵심 입력값입니다. 이름이나 생년월일이 필요한 리딩도 있지만, 타로에서는 질문의 맥락이 카드 해석의 방향을 잡는 데 더 중요합니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>무료와 유료 범위</h2>
          <p>
            무료 리딩은 한 가지 주제의 핵심 흐름과 짧은 조언을 제공합니다. 유료 리딩은 카드 배열, 위치별 의미, 상호 관계, 상황별 행동 조언을 더 길고 세밀하게 풀어 줍니다. 유료 리딩은 불안을 압박하기 위한 장치가 아닙니다.
          </p>
        </article>
      </section>

      <section className="cd-card">
        <h2>해석 흐름</h2>
        <ul>
          {flowItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>결과에서 확인할 수 있는 항목</h2>
        <ul>
          {resultItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>짧은 예시 리딩</h2>
        <p>
          컵의 카드가 중심에 있고 검의 카드가 주변에 놓였다면, 마음은 아직 이어져 있지만 생각이 많아 대화의 문이 좁아진 흐름으로 볼 수 있습니다. 지금은 감정을 증명하려 하기보다, 짧고 분명한 말로 서로의 부담을 줄이는 쪽이 더 부드럽게 열립니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>해석 시 주의할 점</h2>
        <p>
          타로는 엔터테인먼트와 자기 성찰을 위한 참고 자료입니다. 건강, 법률, 투자, 결혼, 이혼, 소송, 진로처럼 삶에 큰 영향을 주는 결정은 카드 결과만으로 정하지 말고, 현실의 정보와 자격 있는 전문가의 조언을 함께 확인해야 합니다.
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

      <nav className="cd-chip-wrap" aria-label="타로 가이드 관련 링크">
        <Link href="/tarot" className="cd-chip">타로 서비스</Link>
        <Link href="/tarot/love" className="cd-chip">연애 타로</Link>
        <Link href="/tarot/reunion" className="cd-chip">재회 타로</Link>
        <Link href="/tarot/mindscan" className="cd-chip">마음 읽기 타로</Link>
        <Link href="/disclaimer" className="cd-chip">면책 고지</Link>
        <Link href="/editorial-policy" className="cd-chip">콘텐츠 제작 원칙</Link>
      </nav>
    </main>
  );
}
