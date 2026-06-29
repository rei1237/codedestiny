import PromptHubRouteClient from "./PromptHubRouteClient";

export default function PromptHubPage() {
  return (
    <div className="min-h-screen bg-[#080b18] px-5 py-10 text-slate-100">
      <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">Fortune Prompt Hub</p>
        <h1 className="mt-3 text-3xl font-black text-white">운세 상담 프롬프트 허브</h1>
        <p className="mt-4 text-sm leading-7 text-slate-200">
          사주, 당사주, 구성학, 매화역수, 타로, 점성술, 베다 점성술, 자미두수, 숙요점, 수비학, 꿈 상징, 호라리와
          같은 여러 흐름을 한곳에서 정리해 상담용 프롬프트로 다듬습니다. 각 도구는 사용자가 입력한 생년월일, 질문,
          상황의 결을 바탕으로 지금 필요한 해석 방향을 더 선명하게 잡아 주는 데에 머무릅니다.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-200">
          이 허브는 결과를 대신 단정하기보다 좋은 상담을 시작하기 위한 질문의 뼈대를 세웁니다. 같은 생년월일이라도
          질문이 사랑인지, 일인지, 돈인지, 가족인지에 따라 읽어야 할 상징의 무게가 달라집니다. 그래서 먼저 질문의
          목적을 차분히 적고, 필요한 도구를 고른 뒤, 생성된 문장을 자신의 상황에 맞게 조율하는 편이 좋습니다.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-200">
          무료 기본 프롬프트는 빠르게 방향을 잡을 때 유용하고, 세부 도구는 더 촘촘한 상담 문맥을 만들 때 도움이 됩니다.
          육효의 동전값, 매화역수의 수리, 구성학의 방위감, 타로의 질문 구조처럼 서로 다른 언어가 한 질문 안에서
          겹칠 때, 사용자는 막연한 불안보다 무엇을 물어야 하는지부터 더 분명히 알 수 있습니다.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-200">
          프롬프트는 운명을 고정하는 문장이 아니라 상담의 문을 여는 열쇠입니다. 너무 넓은 질문은 답을 흐리게 만들고,
          지나치게 결론을 정해 둔 질문은 상징의 숨을 좁힙니다. 오늘 가장 알고 싶은 감정, 선택, 관계, 시기를 한 문장으로
          좁히면 더 자연스럽고 따뜻한 해석이 열립니다.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-200">
          생성된 문장을 사용할 때는 그대로 붙여 넣기보다, 자신의 실제 상황과 말투에 맞춰 한 번 더 다듬어 주세요. 중요한
          건강, 법률, 재정, 관계 결정은 프롬프트나 운세 해석 하나로 단정하지 말고 현실의 정보와 전문가의 도움을 함께
          확인하는 편이 안전합니다.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-200">
          마음이 급한 날일수록 질문은 짧고 선명한 쪽이 좋습니다. “앞으로 어떻게 될까요”보다 “이 관계에서 지금 확인해야
          할 감정의 핵심은 무엇일까요”처럼 묻는다면, 상징은 더 섬세하게 반응합니다. 도구의 목적은 사용자를 불안하게
          만드는 데 있지 않고, 흩어진 마음을 상담 가능한 언어로 정돈하는 데 있습니다.
        </p>
      </section>
      <PromptHubRouteClient />
    </div>
  );
}
