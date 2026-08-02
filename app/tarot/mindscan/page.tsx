import Link from "next/link";
import MindScanTarotRouteClient from "./MindScanTarotRouteClient";
import { buildSeoMetadata } from "../../../lib/seo";
import { SEO_LANDING_PAGES } from "../../../lib/seo-landing-pages";

export const metadata = buildSeoMetadata(SEO_LANDING_PAGES.tarotMindscan);

const relatedLabels: Record<string, string> = {
  "/tarot": "무료 타로 카드 리딩",
  "/tarot/reunion": "재회 타로 리딩",
  "/love": "연애운 무료 보기",
  "/high-value/how-tarot-actually-works": "타로 리딩 가이드",
};

export default function MindScanTarotPage() {
  const relatedLinks = SEO_LANDING_PAGES.tarotMindscan.relatedServices.map((path) => ({
    path,
    label: relatedLabels[path] || "관련 타로 서비스",
  }));

  return (
    <>
      <MindScanTarotRouteClient />
      <section className="mx-auto max-w-4xl px-4 py-10 text-slate-100">
        <h2 className="text-2xl font-semibold">관계 마음 해석에서 살피는 것</h2>
        <p className="mt-3 leading-8 text-slate-300">
          말과 행동 사이 타로는 드러난 표현, 남은 감정, 현재 거리감, 다음 대화의 속도를 정리하는 관계 리딩입니다.
          결과는 확정 예언이 아니라 관계를 차분히 돌아보기 위한 자기성찰 자료로 제공됩니다.
        </p>
        <h2 className="mt-10 text-2xl font-semibold">마인드스캔 타로가 살피는 흐름</h2>
        <p className="mt-3 leading-8 text-slate-300">
          이 리딩은 상대의 마음을 단정하는 도구가 아니라, 질문자가 현재 관계에서 감지하는 신호를 여러 층위로 나누어 바라보는 방법입니다.
          겉으로 드러난 말과 행동, 아직 표현되지 않은 감정, 두 사람 사이의 거리감, 다음 대화의 속도를 차례로 살피면서 한 장면에 매달리지 않도록 돕습니다.
          카드가 보여주는 상징은 고정된 결론이 아니라 현재 질문과 상황을 비추는 참고 자료입니다.
        </p>
        <p className="mt-3 leading-8 text-slate-300">
          따라서 결과를 읽을 때는 “상대가 반드시 이렇게 생각한다”보다 “내가 놓치고 있던 관계의 신호가 무엇인가”라는 질문이 더 유용합니다.
          연락이 줄어든 이유를 하나로 확정하기보다 대화의 빈도, 반응의 온도, 내가 기대하는 속도와 실제 관계의 속도를 함께 비교해 보세요.
          이런 방식으로 읽으면 불안을 키우는 추측 대신 지금 확인할 수 있는 사실과 내가 선택할 수 있는 행동을 구분할 수 있습니다.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {SEO_LANDING_PAGES.tarotMindscan.steps.map((step, index) => (
            <article key={step} className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-4">
              <h3 className="font-semibold text-slate-50">{`${index + 1}. ${step}`}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                {SEO_LANDING_PAGES.tarotMindscan.resultItems[index]}
              </p>
            </article>
          ))}
        </div>
        <h2 className="mt-10 text-2xl font-semibold">질문을 정리하는 법</h2>
        <p className="mt-3 leading-8 text-slate-300">
          좋은 질문은 미래의 날짜나 상대의 속마음을 확정해 달라고 요구하기보다, 현재 내가 확인하고 싶은 관계의 범위를 담습니다.
          “연락이 올까요?”처럼 결과만 기다리는 질문 대신 “최근 대화에서 내가 놓친 신호는 무엇이며, 다음 대화에서 조심할 점은 무엇인가요?”처럼 시간과 행동의 범위를 정해 보세요.
          질문이 구체적일수록 카드의 상징을 현실의 대화와 연결하기 쉬워집니다.
        </p>
        <p className="mt-3 leading-8 text-slate-300">
          결과가 기대와 다르더라도 그 문장을 즉시 사실로 받아들일 필요는 없습니다. 한 번의 리딩보다 반복되는 대화와 실제 행동을 우선하고,
          카드가 제안하는 가능성은 내가 어떤 선택을 할지 점검하는 재료로 활용하세요. 불안이나 우울이 오래 이어지거나 관계의 안전이 걱정된다면
          타로보다 신뢰할 수 있는 주변 사람이나 전문 상담의 도움을 먼저 구하는 것이 좋습니다.
        </p>
        <h2 className="mt-10 text-2xl font-semibold">마인드스캔 타로 자주 묻는 질문</h2>
        <div className="mt-6 space-y-4">
          {SEO_LANDING_PAGES.tarotMindscan.faqs.map((faq) => (
            <article key={faq.question} className="rounded-lg border border-slate-700/70 bg-slate-900/40 p-4">
              <h3 className="font-semibold text-slate-50">{faq.question}</h3>
              <p className="mt-2 leading-7 text-slate-300">{faq.answer}</p>
            </article>
          ))}
        </div>
        <nav className="mt-7 flex flex-wrap gap-3" aria-label="관련 타로 서비스">
          {relatedLinks.map((link) => (
            <Link key={link.path} href={link.path} className="rounded-md border border-violet-300/30 px-3 py-2 text-sm text-violet-100">
              {link.label}
            </Link>
          ))}
        </nav>
      </section>
    </>
  );
}
