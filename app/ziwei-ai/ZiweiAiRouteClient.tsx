"use client";

import dynamic from "next/dynamic";

const ZiweiAiClient = dynamic(() => import("./ZiweiAiClient"), {
  ssr: false,
  loading: () => <ZiweiAiShell />,
});

export default function ZiweiAiRouteClient() {
  return <ZiweiAiClient />;
}

function ZiweiAiShell() {
  return (
    <div className="min-h-screen bg-[#080817] text-white">
      <section className="mx-auto flex min-h-[52vh] max-w-5xl flex-col justify-center px-5 py-16 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-200/80">Ziwei Doushu</p>
        {/* 페이지의 H1 은 page.tsx 의 ServiceIntroSection 이 소유한다. 이 로딩 셸도 h1 이면
            서버 HTML 에 H1 이 2개 실린다 — 클래스가 그대로라 화면은 동일하다. */}
        <h2 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">자미두수 전문가 상담</h2>
        <p className="mt-5 max-w-2xl text-base leading-8 text-violet-50/85 sm:text-lg">
          명궁과 신궁, 사화의 흐름 위로 지금의 고민을 올려 두고 별궁의 대답을 차분히 살핍니다. 태어난
          시간에 맺힌 별의 배치가 관계와 일, 재물과 마음의 방향을 고요히 비춥니다.
        </p>
        <div className="mt-8 grid gap-4 text-sm leading-7 text-violet-50/75 sm:grid-cols-3">
          <p>
            자미두수의 열두 궁은 삶의 장면을 따로 떼어 보지 않습니다. 타고난 성향, 만나는 사람, 흐르는
            운의 시기가 서로 얽히며 지금 가장 크게 울리는 별을 드러냅니다.
          </p>
          <p>
            사화는 마음이 향하는 곳과 조심해야 할 자리를 함께 가리킵니다. 강하게 열리는 길과 반복해서
            흔들리는 지점을 구분하면 선택의 무게가 조금 더 또렷해집니다.
          </p>
          <p>
            대운의 물길은 한순간의 답보다 오래 이어지는 방향을 비춥니다. 서두를 일과 기다릴 일을 나누어
            보면 관계와 일상의 결이 한층 부드럽게 정리됩니다.
          </p>
        </div>
      </section>
    </div>
  );
}
