import Link from "next/link";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/health-report/guide",
    title: "명리 헬스 리포트 사용 시 주의사항 | Code Destiny",
    description:
      "명리 헬스 리포트가 생활 리듬을 어떻게 참고하는지와 입력값, 해석 흐름, 의료 고지, 샘플 리딩을 안내합니다.",
    keywords: ["명리 헬스 리포트", "오행 건강", "생활 리듬", "건강 운세", "의료 고지", "Code Destiny"],
  });
}

const flowItems = [
  "생년월일과 출생시간을 기준으로 사주의 오행 분포와 계절감을 확인합니다.",
  "강하게 작동하는 기운과 쉽게 지치기 쉬운 리듬을 생활 습관 관점에서 정리합니다.",
  "수면, 식사, 휴식, 움직임처럼 일상에서 점검할 수 있는 항목을 중심으로 안내합니다.",
  "의학적 판단이 필요한 영역은 리포트 밖의 전문가 상담으로 분리합니다.",
];

const resultItems = [
  "오행 균형으로 본 생활 리듬의 경향",
  "피로가 쌓이기 쉬운 상황과 회복을 돕는 습관",
  "감정과 컨디션이 흔들릴 때 살필 포인트",
  "리포트가 다루지 않는 의료 판단의 경계",
  "병원 진료나 전문가 상담이 필요한 경우",
];

const faqItems = [
  {
    question: "명리 헬스 리포트로 건강 상태를 진단할 수 있나요?",
    answer:
      "알 수 없습니다. 이 리포트는 생활 리듬과 자기 점검을 돕는 참고 자료이며, 질병 진단·치료·예방을 제공하지 않습니다. 증상이나 통증이 있으면 의료기관을 먼저 확인해야 합니다.",
  },
  {
    question: "오행이 약하면 건강이 나쁘다는 뜻인가요?",
    answer:
      "그렇게 단정하지 않습니다. 오행의 강약은 상징적 리듬을 살피는 언어일 뿐 실제 건강 상태와 같지 않습니다. 생활 습관, 병력, 검사 결과, 전문 진료가 훨씬 직접적인 기준입니다.",
  },
  {
    question: "리포트 결과가 불안하게 느껴지면 어떻게 하나요?",
    answer:
      "불안이 커질 때는 리포트를 잠시 내려놓고 실제 몸 상태와 생활 조건을 먼저 확인하는 편이 좋습니다. 걱정이 계속되거나 증상이 있다면 의료 전문가와 상담해야 합니다.",
  },
];

export default function HealthReportGuidePage() {
  return (
    <main className="cd-main-shell">
      <header className="cd-main-header">
        <h1 className="cd-main-title">명리 헬스 리포트 사용 시 주의사항</h1>
        <p className="cd-main-intro">
          명리 헬스 리포트는 사주의 오행과 계절 흐름을 바탕으로 생활 리듬을 돌아보는 참고 자료입니다. Code Destiny는 건강을 두려움으로 몰아가지 않고, 수면과 휴식, 식사와 움직임처럼 현실에서 확인할 수 있는 습관을 차분히 살피도록 안내합니다.
        </p>
      </header>

      <section className="cd-card-grid">
        <article className="cd-card">
          <h2>헬스 리포트가 살피는 것</h2>
          <p>
            리포트는 오행의 균형을 통해 과열되기 쉬운 생활 패턴, 쉽게 소모되는 리듬, 회복에 도움이 되는 습관을 상징적으로 비춥니다. 몸의 질병 여부를 판단하거나 특정 병명을 예측하지 않습니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>필요한 입력값</h2>
          <p>
            생년월일, 출생시간, 성별이 기본 입력값입니다. 출생시간은 세부 오행과 시주의 흐름을 확인하는 데 사용됩니다. 의료 정보나 진단명 입력은 리포트의 필수 조건이 아니며, 민감한 건강 정보는 신중하게 다루어야 합니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>어떤 때 참고하면 좋은가</h2>
          <p>
            최근 생활 리듬이 흐트러졌다고 느낄 때, 피로가 쌓이는 패턴을 정리하고 싶을 때, 운세 해석을 건강한 습관 점검으로 연결하고 싶을 때 참고할 수 있습니다. 몸의 이상이 느껴질 때는 리포트보다 진료가 우선입니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>무료와 유료 범위</h2>
          <p>
            무료 영역은 오행 기반 생활 리듬과 짧은 주의점을 안내합니다. 유료 리포트는 사주 구조, 대운 흐름, 생활 습관 조언을 더 자세히 풀어 줍니다. 결제는 의료 판단이나 건강 결과를 보장하지 않습니다.
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
          화의 기운이 강하게 떠오르는 구조라면 표현과 추진은 빠르게 살아나지만, 일정이 과해질 때 쉽게 열이 오르고 휴식이 밀릴 수 있습니다. 이런 흐름은 물을 마시고 잠을 충분히 자라는 단순한 조언을 넘어, 하루 안에 식히는 시간을 의식적으로 남기는 생활 리듬을 가리킵니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>의료 고지</h2>
        <p>
          명리 헬스 리포트는 엔터테인먼트와 생활 리듬 점검을 위한 참고 자료이며 의료 진단, 치료, 처방, 예방 지침이 아닙니다. 건강, 법률, 투자, 진로처럼 중대한 결정의 유일한 근거로 사용하지 말고, 통증, 증상, 질환 의심, 약물 복용, 검사 결과, 응급 상황은 반드시 의료 전문가와 의료기관의 판단을 따라야 합니다.
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

      <nav className="cd-chip-wrap" aria-label="명리 헬스 리포트 가이드 관련 링크">
        <Link href="/saju/five-elements" className="cd-chip">오행 가이드</Link>
        <Link href="/saju/guide" className="cd-chip">사주 기본 가이드</Link>
        <Link href="/disclaimer" className="cd-chip">면책 고지</Link>
        <Link href="/privacy-policy" className="cd-chip">개인정보처리방침</Link>
        <Link href="/editorial-policy" className="cd-chip">콘텐츠 제작 원칙</Link>
      </nav>
    </main>
  );
}
