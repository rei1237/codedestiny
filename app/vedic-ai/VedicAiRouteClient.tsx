"use client";

import dynamic from "next/dynamic";

const VedicAiClient = dynamic(() => import("./VedicAiClient"), {
  ssr: false,
  loading: () => <VedicAiShell />,
});

export default function VedicAiRouteClient() {
  return <VedicAiClient />;
}

function VedicAiShell() {
  return (
    <div className="min-h-screen bg-[#070914] text-white">
      <section className="mx-auto flex min-h-[52vh] max-w-5xl flex-col justify-center px-5 py-16 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-200/80">Vedic Astrology</p>
        {/* 페이지의 H1 은 page.tsx 의 ServiceIntroSection 이 소유한다. 이 로딩 셸도 h1 이면
            서버 HTML 에 H1 이 2개 실린다 — 클래스가 그대로라 화면은 동일하다. */}
        <h2 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">베다점 전문가 상담</h2>
        <p className="mt-5 max-w-2xl text-base leading-8 text-indigo-50/85 sm:text-lg">
          나크샤트라와 행성의 흐름, 다샤의 리듬 위로 지금의 질문을 조용히 비춥니다. 태어난 장소와
          시간에 맺힌 하늘의 결을 따라 마음이 머무는 방향을 차분히 살핍니다.
        </p>
        <div className="mt-8 grid gap-4 text-sm leading-7 text-indigo-50/75 sm:grid-cols-3">
          <p>
            베다의 별자리는 삶을 단정하지 않고, 지금 지나가는 시간의 결을 먼저 바라봅니다. 강하게 밀려오는
            변화와 아직 기다려야 하는 기운이 서로 다른 온도로 드러납니다.
          </p>
          <p>
            라그나와 달, 주요 행성의 자리는 마음의 습관과 선택의 방향을 비춥니다. 같은 사건이라도 어떤
            태도로 건너야 덜 흔들리는지 조용한 실마리가 열립니다.
          </p>
          <p>
            다샤의 흐름은 오래 이어지는 운의 리듬을 가리킵니다. 서두를 때와 거두어들일 때, 관계와 일에서
            힘을 아껴야 할 자리가 한 겹씩 선명해집니다.
          </p>
        </div>
      </section>
    </div>
  );
}
