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
        <p className="text-sm font-semibold text-[#ffe8b6]">☾ 달이 머문 자리에서 읽는 두 사람의 인연</p>
        {/* 페이지의 H1 은 page.tsx 의 서버 본문이 소유한다(10여 개 페이지의 관례).
            이 로딩 셸도 h1 이면 서버 HTML 에 H1 이 2개 실린다 — 클래스가 그대로라 화면은 동일하다.
            🔴 하이드레이션 후의 히어로와 같은 위계로 둔다 — 문단 3개를 여기 두면 교체 순간 화면이 통째로 접힌다.
            여기 있던 감성 문단 3개는 지우지 않고 page.tsx 의 서버 섹션으로 옮겼다(색인 대상 본문). */}
        <h2 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">
          우리의 인연은<br />어떤 달빛 아래에서<br />이어지고 있을까요?
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-8 text-rose-50/85 sm:text-lg">
          끌림의 이유부터 반복되는 갈등까지. 27숙이 만드는 두 사람의 관계 리듬을 상담처럼 천천히 읽어드립니다.
        </p>
      </section>
    </div>
  );
}
