import Link from "next/link";
import MindScanTarotRouteClient from "./MindScanTarotRouteClient";
import { buildSeoMetadata } from "../../../lib/seo";
import { SEO_LANDING_PAGES } from "../../../lib/seo-landing-pages";

export const metadata = buildSeoMetadata(SEO_LANDING_PAGES.tarotMindscan);

const relatedLabels: Record<string, string> = {
  "/tarot": "무료 타로 리딩",
  "/tarot/reunion": "재회 타로 리딩",
  "/love": "연애운 무료 보기",
  "/compatibility": "무료 궁합 보기",
  "/guides/how-tarot-actually-works": "타로 리딩 가이드",
};

const questionExamples = [
  "상대가 지금 나를 완전히 끊어 내려는 마음인지, 아니면 거리를 두고 정리하는 중인지",
  "겉으로는 차분해 보이지만 안쪽에서는 어떤 감정이 남아 있는지",
  "내가 먼저 연락했을 때 관계가 풀릴 가능성이 있는지, 아니면 더 기다리는 편이 나은지",
  "지금 이 관계에서 내가 가장 조심해야 할 반응 패턴이 무엇인지",
];

const interpretationPoints = [
  "겉으로 보이는 태도와 실제 감정의 간격",
  "상대가 망설이는 이유와 방어가 생긴 지점",
  "관계가 다시 움직일 때 필요한 속도와 거리감",
  "내가 먼저 움직여도 되는 순간과 멈춰야 하는 순간",
];

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
        <h2 className="text-2xl font-semibold">상대 마음 타로를 해석하는 가장 현실적인 기준</h2>
        <p className="mt-3 leading-8 text-slate-300">
          {landing.intro} 말과 행동 사이 타로는 상대를 단정하기 위한 도구가 아니라, 지금 보이는 태도와 실제
          감정의 결이 얼마나 벌어져 있는지를 차분하게 읽어 보는 관계 리딩입니다. 결과는 예언이나 확정 판정이
          아니라, 관계의 흐름을 이해하고 다음 반응을 고르기 위한 참고 자료로 제공됩니다.
        </p>

        <div className="mt-8 space-y-5 leading-8 text-slate-300">
          <p>
            누군가의 마음을 가장 헷갈리게 만드는 지점은 대개 말보다 행동입니다. 분명 따뜻한 표현을 했는데도
            연락 속도는 느려지고, 차갑게 굴면서도 완전히 떠나지는 않는 장면이 반복되면 우리는 상대의 진짜
            의도를 하나의 문장으로 고정하고 싶어집니다. 하지만 관계는 그렇게 단순하게 움직이지 않습니다.
            마음은 남아 있어도 방어가 더 클 수 있고, 호감은 있어도 책임이 무거워져 한 발 물러날 수 있습니다.
          </p>
          <p>
            그래서 마인드스캔 타로는 좋은 카드가 나왔으니 곧바로 연락이 온다거나, 무거운 카드가 나왔으니
            관계가 끝났다고 결론내리지 않습니다. 카드가 보여 주는 것은 감정의 온도, 현재의 거리감, 망설임이
            생긴 이유, 그리고 다시 움직일 수 있는 여지가 어디에 남아 있는지입니다. 이 해석을 통해 상대를
            맞히려 하기보다, 지금 이 관계를 더 정확하게 읽는 데 초점을 맞춥니다.
          </p>
          <p>
            특히 감정이 불안할수록 우리는 확인받고 싶은 마음으로 답을 재촉하게 됩니다. 그러나 관계를 살리는
            쪽은 대개 큰 말보다도 타이밍, 문장 길이, 질문 방식, 기다림의 간격처럼 더 작고 구체적인 선택입니다.
            이 리딩은 바로 그 지점을 정리해 줍니다. 내가 먼저 다가가도 되는지, 아니면 상대가 숨을 고를 시간을
            남겨 두는 편이 나은지, 지금 필요한 태도가 설득인지 관찰인지 구분하는 데 도움을 줍니다.
          </p>
        </div>

        <p className="mt-5 leading-8 text-slate-300">
          리딩을 마친 뒤에는 인상 깊었던 카드 한 장보다 실제 대화에서 확인할 수 있는 변화와 나의 감정을 함께
          기록해 보세요. 기록은 결과를 반복해서 확인하는 대신 관계의 패턴과 내가 지키고 싶은 기준을 발견하는 데
          도움이 됩니다. 오늘 바로 할 수 있는 작은 행동과 잠시 멈출 행동을 나누어 적으면 해석을 현실적인
          선택으로 옮기기 쉽습니다.
        </p>

        <h2 className="mt-10 text-xl font-semibold">이 리딩이 특히 도움이 되는 상황</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-4 leading-7 text-slate-300">
            연락은 이어지지만 감정의 방향이 보이지 않을 때, 표현과 태도 사이의 간격을 읽는 데 유용합니다.
          </article>
          <article className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-4 leading-7 text-slate-300">
            재회 가능성보다 먼저 지금 왜 거리가 생겼는지, 어디서 방어가 올라왔는지 구조를 보고 싶을 때 맞습니다.
          </article>
          <article className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-4 leading-7 text-slate-300">
            내가 먼저 연락할지 기다릴지 헷갈릴 때, 감정의 유무보다 현재 행동 전략을 정리하는 데 도움이 됩니다.
          </article>
          <article className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-4 leading-7 text-slate-300">
            상대의 마음을 단정하고 싶기보다, 내 불안을 줄이고 관계를 읽는 언어를 얻고 싶을 때 가장 잘 맞습니다.
          </article>
        </div>

        <h2 className="mt-10 text-xl font-semibold">리딩에서 확인하는 핵심 포인트</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {interpretationPoints.map((item) => (
            <li key={item} className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-4 leading-7 text-slate-300">
              {item}
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-xl font-semibold">리딩에서 정리되는 내용</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {landing.resultItems.map((item) => (
            <li key={item} className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-4 leading-7 text-slate-300">
              {item}
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-xl font-semibold">질문을 이렇게 잡으면 더 선명해집니다</h2>
        <p className="mt-3 leading-8 text-slate-300">
          마인드스캔 타로는 “상대가 아직 나를 좋아하나요?”처럼 답을 하나로 잠그는 질문보다, 지금 어떤 감정이
          관계를 움직이고 있고 무엇이 행동을 막는지 묻는 질문에 더 정확하게 반응합니다. 감정의 존재 여부보다
          감정의 흐름과 방어의 이유를 묻는 쪽이 카드의 메시지를 훨씬 입체적으로 읽게 해 줍니다.
        </p>
        <ul className="mt-4 space-y-3">
          {questionExamples.map((item) => (
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

        <h2 className="mt-10 text-xl font-semibold">읽을 때 꼭 기억할 점</h2>
        <div className="mt-4 space-y-4 leading-8 text-slate-300">
          <p>
            타로는 상대를 심문하듯 맞히는 도구가 아니라, 관계 안에서 내가 놓치고 있던 맥락을 보여 주는 언어에
            가깝습니다. 카드가 따뜻하게 나와도 현실의 책임이나 상황이 무거우면 움직임은 느릴 수 있고, 카드가
            차갑게 보여도 그것이 곧 무관심이나 단절을 뜻하지는 않습니다. 중요한 것은 감정의 유무보다 지금 어떤
            속도와 방식이 관계를 덜 상하게 만드는지 읽는 일입니다.
          </p>
          <p>
            결과를 보고 바로 행동하기보다, 내 질문이 불안에서 나왔는지 관찰에서 나왔는지 먼저 구분해 보세요.
            답을 재촉하는 문장보다 상황을 가볍게 확인하는 문장이 더 좋은 흐름을 만들 때가 많습니다. 관계가
            반복해서 나를 흔들고 있다면, 리딩의 목적을 상대를 해석하는 일에서 나를 보호하는 선택을 찾는 일로
            옮겨 보는 것도 좋은 방법입니다.
          </p>
        </div>

        <section className="mt-8 space-y-4" aria-label="마인드스캔 리딩 안내">
          <article>
            <h3 className="text-lg font-semibold">겉으로 드러난 말과 실제 감정</h3>
            <p className="mt-2 leading-8 text-slate-300">
              이 리딩은 상대의 마음을 곧바로 진단하거나 거짓말로 판정하지 않습니다. 겉으로 건네는 표현과 그
              뒤에서 조절되고 있는 감정의 온도를 나누어 읽으면, 애정과 두려움, 머뭇거림 같은 요소가 관계 안에서
              어떤 역할을 하는지 더 분명하게 보입니다.
            </p>
          </article>
          <article>
            <h3 className="text-lg font-semibold">행동이 말보다 늦어지는 이유</h3>
            <p className="mt-2 leading-8 text-slate-300">
              연락이나 표현보다 행동이 더딘 흐름은 마음의 크기 하나로 설명되지 않을 때가 많습니다. 관계를 다시
              겪을지 모르는 경계, 책임에 대한 부담, 현실적인 거리와 대화 리듬까지 함께 보면서 카드 조합의 긴장을
              해석합니다.
            </p>
          </article>
          <article>
            <h3 className="text-lg font-semibold">침묵과 관계의 간격</h3>
            <p className="mt-2 leading-8 text-slate-300">
              침묵은 거절일 수도 있지만 감정을 정리하는 시간일 수도 있습니다. 이를 한쪽으로 단정하기보다 반응의
              빈도, 대화의 질감, 다시 안전해질 수 있는 조건을 함께 확인하도록 안내합니다.
            </p>
          </article>
          <article>
            <h3 className="text-lg font-semibold">지금 다가가도 되는 속도</h3>
            <p className="mt-2 leading-8 text-slate-300">
              결과는 특정 날짜의 재회를 보장하는 예언이 아닙니다. 지금 건널 수 있는 마음의 길이와 부담의 정도,
              기다림과 확인 사이에서 사용할 수 있는 현실적인 대화 속도를 제안합니다.
            </p>
          </article>
          <article>
            <h3 className="text-lg font-semibold">카드 결과를 현실에 적용하는 기준</h3>
            <p className="mt-2 leading-8 text-slate-300">
              카드의 상징은 상대의 마음을 대신 확정해 주는 판결문이 아니라 관계를 바라보는 질문입니다. 호감의
              흔적을 집착의 약속으로 바꾸지 않고, 한 번의 연락을 인생의 흐름으로 과대해석하지 않도록 행동 기준과
              나의 경계를 함께 확인합니다.
            </p>
          </article>
          <article>
            <h3 className="text-lg font-semibold">차분한 상담을 위한 안내</h3>
            <p className="mt-2 leading-8 text-slate-300">
              불안이 길어질수록 결과를 반복해서 확인하기보다 한 번의 리딩에서 핵심 질문과 실행 가능한 한 가지를
              골라 보세요. 관계의 방향은 카드만으로 결정되지 않으며, 서로의 선택과 실제 대화가 흐름을 바꿀 수
              있습니다.
            </p>
          </article>
        </section>

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
