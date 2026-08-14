"use client";

import dynamic from "next/dynamic";

const LifeBookAiClient = dynamic(() => import("./LifeBookAiClient"), {
  loading: () => <LifeBookAiShell />,
});

function LifeBookAiShell() {
  return (
    <main className="min-h-screen bg-[#130d07] px-4 py-10 text-amber-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div className="h-9 w-44 animate-pulse rounded-full bg-amber-100/10" />
        <section className="rounded-[28px] border border-amber-100/15 bg-white/[0.06] p-5 leading-8 text-amber-50 shadow-2xl shadow-black/30">
          <p className="text-sm font-semibold tracking-[0.28em] text-amber-200/80">LIFE BOOK AI READING</p>
          {/* 페이지의 H1 은 page.tsx 의 ServiceIntroSection 이 소유한다. 로딩 셸까지 h1 이면 서버 HTML 에 H1 이 겹친다. */}
          <h2 className="mt-3 text-3xl font-semibold text-amber-50">인생의 책 전문가 상담</h2>
          <p className="mt-4 text-sm text-amber-100/85">
            태어난 날과 시간에 담긴 명식의 결은 한 사람의 삶이 어디에서 힘을 얻고, 어디에서 오래 머물며, 어떤 시기에 다시 방향을 틀어야 하는지를 조용히 드러냅니다.
            인생의 책은 사주 명식과 대운, 세운의 흐름을 바탕으로 일, 관계, 재물, 마음의 전환점을 긴 호흡으로 읽어 내려갑니다.
          </p>
          <p className="mt-3 text-sm text-amber-100/80">
            상담은 단정적인 예언보다 지금의 삶을 이해하는 데 필요한 문장을 먼저 세웁니다. 강하게 타고난 기운, 오래 반복된 선택의 습관, 사람과 일 앞에서 흔들리는 지점,
            앞으로 열릴 수 있는 기회의 계절을 차례로 비추며 스스로의 시간을 더 선명하게 붙잡을 수 있도록 안내합니다.
          </p>
          <p className="mt-3 text-sm text-amber-100/80">
            태어난 시간의 결이 차분히 정리되면, 상담 문장은 삶의 장면을 더 깊은 해석으로 이어 갑니다. 오래 품고 있던 질문은 관계와 일, 재물과 마음의 흐름 속에서 다시 놓이고,
            완성된 책장은 필요할 때마다 다시 펼쳐 볼 수 있는 조용한 기준이 되어 줍니다.
          </p>
          <p className="mt-3 text-sm text-amber-100/75">
            삶이 바뀌는 시기에는 늘 작은 징후가 먼저 찾아옵니다. 인생의 책은 그 징후를 겁주거나 서두르게 만들지 않고, 지금 붙잡아야 할 중심과 천천히 내려놓아도 되는 무게를
            차분히 구분해 줍니다.
          </p>
          <p className="mt-3 text-sm text-amber-100/75">
            특히 반복되는 관계의 결, 일에서 막히는 지점, 재물이 머무는 방식, 마음이 자꾸 돌아가는 오래된 질문은 서로 따로 떨어져 있지 않습니다. 명식의 기운은 어느 한 장면만을
            가리키기보다, 한 사람이 같은 선택을 되풀이하는 이유와 이제는 다르게 걸어가도 되는 때를 함께 비춥니다. 그래서 이 상담은 단정적인 판결보다 당신의 삶에 이미 놓인
            실마리를 부드럽게 정리하는 쪽으로 흐릅니다.
          </p>
        </section>
        <section className="rounded-[28px] border border-amber-100/15 bg-white/[0.06] p-5 shadow-2xl shadow-black/30">
          <div className="h-8 w-72 max-w-full animate-pulse rounded-full bg-amber-100/10" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="h-28 animate-pulse rounded-[18px] bg-amber-100/10" />
            <div className="h-28 animate-pulse rounded-[18px] bg-amber-100/10" />
          </div>
        </section>
        <section className="rounded-[28px] border border-amber-100/15 bg-white/[0.06] p-5 shadow-2xl shadow-black/30">
          <div className="h-6 w-52 animate-pulse rounded-full bg-amber-100/10" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="h-24 animate-pulse rounded-[18px] bg-amber-100/10" />
            <div className="h-24 animate-pulse rounded-[18px] bg-amber-100/10" />
            <div className="h-24 animate-pulse rounded-[18px] bg-amber-100/10" />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LifeBookAiRouteClient() {
  return <LifeBookAiClient />;
}
