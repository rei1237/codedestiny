"use client";

import dynamic from "next/dynamic";

const SukuyoCompatibilityAiClient = dynamic(() => import("./SukuyoCompatibilityAiClient"), {
  ssr: false,
  loading: () => <SukuyoCompatibilityAiShell />,
});

export default function SukuyoCompatibilityAiRouteClient() {
  return <SukuyoCompatibilityAiClient />;
}

function SukuyoCompatibilityAiShell() {
  return (
    <div className="min-h-screen bg-[#120816] text-white">
      <section className="mx-auto flex min-h-[52vh] max-w-5xl flex-col justify-center px-5 py-16 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-200/80">Sukuyo Compatibility</p>
        {/* 페이지의 H1 은 page.tsx 의 ServiceIntroSection 이 소유한다(10여 개 페이지의 관례).
            이 로딩 셸도 h1 이면 서버 HTML 에 H1 이 2개 실린다 — 클래스가 그대로라 화면은 동일하다. */}
        <h2 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">숙요점 궁합 전문가 상담</h2>
        <p className="mt-5 max-w-2xl text-base leading-8 text-rose-50/85 sm:text-lg">
          두 사람의 별자리에 놓인 끌림과 거리감, 오래 이어질 관계의 리듬을 천천히 펼쳐 봅니다.
        </p>
        <div className="mt-8 grid gap-4 text-sm leading-7 text-rose-50/75 sm:grid-cols-3">
          <p>
            숙요의 별은 처음 끌리는 순간만 보지 않습니다. 가까워질수록 드러나는 말투의 온도, 마음이 닿는
            속도, 서로를 지치게 하는 반복까지 함께 비춥니다.
          </p>
          <p>
            두 사람의 관계에는 편안히 흐르는 자리와 조심스럽게 다루어야 할 자리가 함께 놓입니다. 어느
            쪽으로 마음을 기울여야 오래 상하지 않는지가 차분히 떠오릅니다.
          </p>
          <p>
            이미 이어진 인연은 더 선명하게, 아직 망설이는 인연은 더 부드럽게 바라볼 수 있도록 사랑의
            리듬과 관계의 방향을 한 겹씩 열어 둡니다.
          </p>
        </div>
      </section>
    </div>
  );
}
