import type { Metadata } from "next";
import NumerologyTarotClient from "./NumerologyTarotClient";

export const metadata: Metadata = {
  title: "수비학 타로 | Code Destiny",
  description:
    "생명수, 오늘수, 질문수를 바탕으로 5장의 타로 흐름을 살피는 수비학 타로 리딩입니다. 관계, 일, 선택의 방향을 참고용으로 차분히 읽어 보세요.",
  keywords: ["수비학 타로", "숫자 타로", "타로 리딩", "생명수", "오늘수"],
  alternates: {
    canonical: "/tarot/numerology",
  },
};

const guideCards = [
  {
    title: "무엇을 살피나요",
    body: "생년월일에서 흐르는 생명수와 오늘수, 질문 문장에서 떠오르는 질문수를 함께 놓고 다섯 장의 카드가 어디로 기울어 있는지 읽습니다. 숫자는 반복되는 성향을, 카드는 지금 마음과 상황의 장면을 비춥니다.",
  },
  {
    title: "언제 참고하면 좋나요",
    body: "관계의 거리감, 일의 우선순위, 선택 앞의 망설임처럼 바로 결론을 내리기보다 마음의 방향을 차분히 정리하고 싶을 때 어울립니다. 확답을 받기보다 생각의 실마리를 찾는 흐름에 가깝습니다.",
  },
  {
    title: "입력값이 필요한 이유",
    body: "생년월일은 개인의 기본 리듬을 잡고, 이름과 질문은 해석의 초점을 좁힙니다. 질문이 구체적일수록 결과는 막연한 길흉보다 지금 확인해야 할 감정, 반복 패턴, 행동 단서에 더 가까워집니다.",
  },
];

const readingFlow = [
  "생년월일을 바탕으로 생명수와 오늘수를 계산합니다.",
  "질문 문장의 주제와 숫자 리듬을 함께 분류합니다.",
  "다섯 장의 카드가 현재 흐름, 핵심 감정, 선택의 그림자, 현실 행동, 다음 장면을 어떻게 비추는지 정리합니다.",
  "결과에서는 오늘 참고할 문장, 카드별 해석, 7일 실천 흐름, 조심할 표현을 함께 확인합니다.",
];

const faqItems = [
  {
    question: "무료와 유료 범위는 어떻게 다른가요?",
    answer:
      "무료 범위에서는 기본 숫자 흐름과 간단한 성향을 먼저 살필 수 있습니다. 유료 리딩은 선택한 주제에 맞춰 카드별 해석, 숫자와 카드의 연결, 실천 순서가 더 촘촘하게 열립니다.",
  },
  {
    question: "결과를 중요한 결정의 근거로 삼아도 되나요?",
    answer:
      "아닙니다. 수비학 타로는 엔터테인먼트와 자기 성찰을 위한 참고 자료입니다. 의료, 법률, 투자, 결혼, 이혼, 소송, 진로처럼 큰 영향을 주는 결정은 현실 정보와 전문가 상담을 함께 확인해야 합니다.",
  },
  {
    question: "좋지 않은 카드가 나오면 운이 나쁜 건가요?",
    answer:
      "카드는 확정된 미래를 말하기보다 지금 주의할 태도와 반복되는 마음의 그림자를 비춥니다. 불안을 키우기보다 조정할 행동을 찾는 쪽으로 읽는 것이 좋습니다.",
  },
];

const relatedLinks = [
  { href: "/tarot/guide", label: "타로 카드 리딩 입문" },
  { href: "/tarot/prompt-maker", label: "타로 프롬프트 도구" },
  { href: "/saju/guide", label: "사주 명리학 기본 가이드" },
  { href: "/disclaimer", label: "운세 및 상담 면책 고지" },
];

export default function NumerologyTarotPage() {
  return (
    <>
      <NumerologyTarotClient />
      <section className="bg-[#060713] px-4 py-12 text-[#f7f1e1] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-[#d8b66a]">수비학 타로 가이드</p>
            <h2 className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl">
              숫자와 카드가 함께 비추는 오늘의 흐름
            </h2>
            <p className="mt-4 text-base leading-8 text-[#d8d0bd]">
              수비학 타로는 숫자가 지닌 반복의 결을 타로 카드의 상징과 겹쳐 읽습니다. 결과는 미래를 단정하지 않고,
              지금 질문 앞에서 어떤 감정이 강해지는지, 어디에서 판단을 멈추고 다시 살펴야 하는지 차분히 비춥니다.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {guideCards.map((item) => (
              <article key={item.title} className="rounded-2xl border border-[#d8b66a]/25 bg-white/[0.04] p-5">
                <h3 className="font-serif text-xl font-bold text-[#fff4cf]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#d8d0bd]">{item.body}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <article className="rounded-2xl border border-[#d8b66a]/25 bg-white/[0.04] p-6">
              <h3 className="font-serif text-2xl font-bold text-[#fff4cf]">해석은 이렇게 이어집니다</h3>
              <ol className="mt-4 grid gap-3 text-sm leading-7 text-[#d8d0bd]">
                {readingFlow.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </article>

            <article className="rounded-2xl border border-[#d8b66a]/25 bg-[#120e2c] p-6">
              <h3 className="font-serif text-2xl font-bold text-[#fff4cf]">예시 리딩</h3>
              <p className="mt-4 text-sm leading-7 text-[#d8d0bd]">
                생명수 6과 오늘수 2가 함께 떠오르면 관계와 책임의 균형이 먼저 보입니다. 여기에 컵 계열 카드가 강하면
                마음을 숨기기보다 부드럽게 확인하는 말이 열리고, 검 계열 카드가 강하면 즉답보다 사실 확인과 거리 조절이
                먼저 필요하다고 읽을 수 있습니다.
              </p>
            </article>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {faqItems.map((item) => (
              <article key={item.question} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <h3 className="text-base font-bold text-[#fff4cf]">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-[#d8d0bd]">{item.answer}</p>
              </article>
            ))}
          </div>

          <nav className="flex flex-wrap gap-3" aria-label="수비학 타로 관련 링크">
            {relatedLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full border border-[#d8b66a]/30 px-4 py-2 text-sm font-semibold text-[#f4dca5] transition hover:border-[#d8b66a]/60 hover:bg-white/[0.06]"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </section>
    </>
  );
}
