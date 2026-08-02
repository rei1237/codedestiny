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
  const landing = SEO_LANDING_PAGES.tarotMindscan;
  const relatedLinks = landing.relatedServices.map((path) => ({
    path,
    label: relatedLabels[path] || "관련 타로 서비스",
  }));

  return (
    <div data-mindscan-route="true">
      <MindScanTarotRouteClient />
      <section className="mx-auto max-w-4xl px-4 py-10 text-slate-100">
        <h2 className="text-2xl font-semibold">관계 마음 해석에서 살피는 것</h2>
        <p className="mt-3 leading-8 text-slate-300">
          {landing.intro} 말과 행동 사이 타로는 드러난 표현, 남은 감정, 현재 거리감,
          다음 대화의 속도를 정리하는 관계 리딩입니다. 결과는 확정 예언이 아니라 관계를
          차분히 돌아보기 위한 자기성찰 자료로 제공됩니다.
        </p>

        <div className="mt-8 space-y-5 leading-8 text-slate-300">
          <p>
            상대의 마음을 알고 싶을수록 보이는 말 한마디와 답장의 간격을 빠르게 결론 내리고
            싶어집니다. 하지만 관계의 신호는 한 장면만으로 설명되지 않습니다. 이 리딩은
            상대가 반드시 무엇을 느낀다고 단정하는 대신, 지금 드러난 행동과 내가 그 행동에
            부여한 의미를 분리해 바라보도록 돕습니다.
          </p>
          <p>
            카드가 보여주는 감정은 현재의 가능성, 거리, 대화의 긴장을 읽는 상징적 언어입니다.
            좋은 카드가 나왔다고 곧바로 연락해야 하는 것은 아니며, 무거운 카드가 나왔다고
            관계가 끝났다는 뜻도 아닙니다. 중요한 것은 내가 확인할 수 있는 사실과 아직
            추측에 머무는 부분을 나누고, 다음 대화에서 지킬 기준을 세우는 일입니다.
          </p>
          <p>
            특히 연락을 보내기 전에는 상대의 반응을 얻기 위한 말인지, 내 마음을 정리하기
            위한 말인지 먼저 확인해 보세요. 답을 재촉하는 문장보다 상황을 존중하는 짧은
            문장이 관계의 실제 온도를 더 정확히 드러낼 때가 많습니다. 불안이 오래 이어지거나
            일상에 영향을 준다면 타로 결과보다 신뢰할 수 있는 사람과의 대화와 전문적인
            도움을 우선하는 것이 안전합니다.
          </p>
        </div>

        <h2 className="mt-10 text-xl font-semibold">이 리딩에서 확인하는 흐름</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {landing.resultItems.map((item) => (
            <li key={item} className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-4 leading-7 text-slate-300">
              {item}
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-xl font-semibold">상대 마음 타로를 읽는 순서</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {landing.steps.map((step, index) => (
            <article key={step} className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-4">
              <p className="text-sm font-semibold text-violet-200">STEP {index + 1}</p>
              <p className="mt-2 leading-7 text-slate-300">{step}</p>
            </article>
          ))}
        </div>

        <h2 className="mt-10 text-xl font-semibold">자주 묻는 질문</h2>
        <div className="mt-4 space-y-3">
          {landing.faqs.map((faq) => (
            <details key={faq.question} className="rounded-lg border border-slate-700/70 bg-slate-900/40 p-4">
              <summary className="cursor-pointer font-semibold text-slate-100">{faq.question}</summary>
              <p className="mt-3 leading-7 text-slate-300">{faq.answer}</p>
            </details>
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
    </div>
  );
}
