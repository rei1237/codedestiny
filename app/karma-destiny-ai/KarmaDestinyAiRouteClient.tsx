"use client";

import dynamic from "next/dynamic";

const KarmaDestinyAiClient = dynamic(() => import("./KarmaDestinyAiClient"), {
  ssr: false,
  loading: () => <KarmaDestinyAiShell />,
});

export default function KarmaDestinyAiRouteClient() {
  return <KarmaDestinyAiClient />;
}

function KarmaDestinyAiShell() {
  return (
    <div className="min-h-screen bg-[#070810] text-white">
      <section className="mx-auto flex min-h-[52vh] max-w-5xl flex-col justify-center px-5 py-16 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-200/80">
          Karma · Saju · Astrology
        </p>
        {/* 페이지의 H1 은 page.tsx 의 ServiceIntroSection 이 소유한다. 이 로딩 셸도 h1 이면
            서버 HTML 에 H1 이 2개 실린다 — 클래스가 그대로라 화면은 동일하다. */}
        <h2 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">운명의 업 전문가 상담</h2>
        <p className="mt-5 max-w-2xl text-base leading-8 text-amber-50/85 sm:text-lg">
          사주와 서양 점성술, 베다의 별자리가 겹치는 자리에서 반복되어 온 삶의 문양을 읽습니다. 지금
          마주한 질문이 어디에서 흘러왔고 어디로 나아가려 하는지 조용히 비춥니다.
        </p>
        <div className="mt-8 grid gap-4 text-sm leading-7 text-amber-50/75 sm:grid-cols-3">
          <p>
            업은 벌처럼 내려앉는 말이 아니라, 삶이 여러 번 되풀이하며 남긴 결입니다. 같은 선택이 반복되는
            자리에는 아직 다 풀리지 않은 마음의 방향이 머무릅니다.
          </p>
          <p>
            사주의 원국은 타고난 그릇과 기질을 보여 주고, 행성의 배치는 지금 마음이 흔들리는 이유를 더
            넓은 시간의 흐름 속에서 비춥니다.
          </p>
          <p>
            별들이 겹치는 곳에는 관계와 일, 재물과 내면의 숙제가 함께 떠오릅니다. 그 흐름을 따라 오늘
            붙잡아야 할 것과 놓아도 되는 것을 나누어 봅니다.
          </p>
        </div>
      </section>
    </div>
  );
}
