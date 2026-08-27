import YeonStarHugRouteClient from "./YeonStarHugRouteClient";
import ImmersiveRelatedLinks from "../components/ImmersiveRelatedLinks";

export default function YeonStarHugPage() {
  return (
    <div className="min-h-screen bg-[#fffaf7] py-10 text-[#3c1830]">
      <YeonStarHugRouteClient />

      <section className="mx-auto mt-8 w-full max-w-[1440px] px-4 md:px-6 lg:px-8">
        <div className="rounded-3xl border border-[#f4d8e3] bg-white/85 p-5 shadow-[0_14px_34px_rgba(150,72,104,0.1)] sm:p-8">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl bg-[#fff3f8] px-4 py-3 text-sm font-bold text-[#b31955] [&::-webkit-details-marker]:hidden">
            <span>연이의 마음 별자리, 이렇게 활용해보세요</span>
            <span className="ml-3 text-xs font-semibold text-[#70445c] transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">Yeon Star Hug</p>
            {/* 이 페이지의 H1. 인터랙티브 화면은 ssr:false 라 서버 HTML 에 헤딩을 남기지 않아,
                승격 전에는 색인 대상인데도 H1 이 0개였다. Tailwind 유틸이 크기·굵기를 모두 지정하므로 시각 변화는 없다. */}
            <h1 className="mt-3 text-2xl font-black text-slate-800">연이의 마음 별자리</h1>
            <p className="mt-4 text-sm leading-7">
              오늘의 감정, 별자리, 마음에 남은 고민을 함께 놓고 지금 강하게 떠오르는 마음의 결을 읽습니다.
              결과는 확정된 예언이 아니라, 지친 감정이 어디에서 흔들리고 어디에서 다시 숨을 고르는지 살피는
              부드러운 별빛 상담에 가깝습니다.
            </p>
            <p className="mt-3 text-sm leading-7">
              관계의 말투, 일상의 피로, 선택 앞의 망설임처럼 누군가에게 조용히 정리받고 싶은 마음이 있을 때
              참고하기 좋습니다. 고민을 한 문장으로 적으면 오늘의 키워드, 작은 실천, 마음을 덜 다치게 하는
              방향이 차분히 열립니다.
            </p>
            <p className="mt-3 text-sm leading-7">
              마음이 복잡한 날에는 긴 설명보다 지금 가장 크게 느껴지는 감정 하나를 먼저 고르는 편이 좋습니다.
              고민 문장은 “왜 이렇게 힘들까”에서 멈추기보다 “오늘 내가 덜 상처받기 위해 확인할 것은 무엇일까”처럼
              스스로를 지키는 방향으로 적어 보세요. 그러면 별빛의 흐름은 막연한 불안보다 지금 필요한 말, 피해야 할
              과한 반응, 작게 회복할 수 있는 행동을 더 선명하게 비춥니다.
            </p>
            <p className="mt-3 text-sm leading-7">
              감정이 강한 날일수록 결과를 운명처럼 붙잡기보다 오늘 필요한 돌봄의 언어로 받아들이는 것이 좋습니다.
              별자리와 달의 흐름은 마음의 분위기를 비추는 배경이고, 실제 선택은 사용자의 상황과 관계, 몸의 컨디션,
              주변의 도움을 함께 보며 정하는 편이 더 안전합니다. 잘 맞는 문장은 기록해 두고, 불편하거나 과하게
              느껴지는 문장은 현실의 대화 속에서 다시 조정해 주세요.
            </p>
            <p className="mt-3 text-sm leading-7">
              사랑, 일, 돈, 가족, 건강처럼 마음을 흔드는 주제는 한 번에 결론을 내리기보다 오늘 할 수 있는 작은
              순서로 나누면 덜 버겁습니다. 연이의 별빛 상담은 그 순서를 부드럽게 가다듬는 데에 머무릅니다. 중대한
              건강, 법률, 재정 결정은 현실적인 정보와 전문가의 도움을 함께 확인하시고, 이곳의 문장은 마음을 정돈하는
              따뜻한 참고로만 곁에 두세요.
            </p>
            <p className="mt-3 text-sm leading-7">
              별자리는 성격을 단정하기보다 지금 어떤 방식으로 마음을 쓰고 있는지 살피는 상징입니다. 같은 별자리라도
              오늘의 컨디션, 최근의 관계, 머무는 환경에 따라 전혀 다른 빛으로 드러납니다. 그래서 이곳에서는 별자리
              이름 하나로 사람을 판단하지 않고, 감정 선택과 고민 문장을 함께 보며 오늘의 흐름을 더 조심스럽게 읽습니다.
            </p>
            <p className="mt-3 text-sm leading-7">
              달의 흐름은 마음의 속도를 비춥니다. 어떤 날에는 빠르게 결정하고 싶어지고, 어떤 날에는 작은 말에도 오래
              흔들립니다. 그 흔들림을 나약함으로 보지 마세요. 마음이 보내는 신호를 알아차리면, 같은 상황에서도 한 박자
              쉬어 가거나, 먼저 확인하거나, 오늘은 더 깊게 들어가지 않는 선택을 할 수 있습니다.
            </p>
            <p className="mt-3 text-sm leading-7">
              결과에서 가장 중요한 것은 점수보다 문장입니다. 높은 점수가 좋은 하루를 보장하지 않고, 낮은 점수가 나쁜
              하루를 확정하지도 않습니다. 대신 지금 마음을 덜 소모하게 하는 말, 관계에서 지켜야 할 경계, 돈과 일 앞에서
              성급함을 줄이는 작은 행동이 있다면 그것을 오늘의 신호로 삼아 보세요.
            </p>
            <p className="mt-3 text-sm leading-7">
              상담을 마친 뒤에는 바로 큰 결정을 내리기보다 물 한 잔을 마시고, 가장 마음에 남은 문장 하나만 적어 두면
              좋습니다. 하루가 조금 지나 다시 읽었을 때도 편안하게 남는 말은 지금의 방향을 가리키고, 불편하게 걸리는
              말은 더 천천히 살펴야 할 감정의 매듭일 수 있습니다.
            </p>
            <p className="mt-3 text-sm leading-7">
              오늘의 마음이 선명하지 않아도 괜찮습니다. 이름, 생일, 별자리, 고민 문장은 정답을 맞히기 위한 정보가 아니라
              스스로의 마음을 조금 더 구체적으로 바라보기 위한 작은 등불입니다. 무엇을 선택해야 할지 모르겠다면 가장
              급한 결론보다 지금 덜 지치게 해 주는 행동을 먼저 고르세요. 아주 작은 정리가 하루의 표정을 바꾸기도 합니다.
              오늘의 별빛은 그 작은 정리를 다정하게 돕습니다.
              마음이 가벼워지는 쪽으로 한 걸음만 옮겨도 충분합니다.
            </p>
          </div>
        </details>
        </div>
      </section>
      <ImmersiveRelatedLinks fromPath="/yeon-star-hug" tone="light" />
    </div>
  );
}
