"use client";

import dynamic from "next/dynamic";

const SajuGuardianClient = dynamic(() => import("./SajuGuardianClient"), {
  ssr: false,
  loading: () => <SajuGuardianShell />,
});

export default function SajuGuardianRouteClient() {
  return <SajuGuardianClient />;
}

function SajuGuardianShell() {
  return (
    <div className="min-h-screen bg-[#050814] text-white">
      <section className="mx-auto flex min-h-[52vh] max-w-5xl flex-col justify-center px-5 py-16 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-200/80">Saju Guardian</p>
        <h1 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">사주 가디언 소환진</h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
          태어난 날의 기운을 따라 당신 곁에 머무는 수호 동물과 상징색을 불러옵니다. 이미 열린 소환진은
          그대로 이어지고, 남은 이용권의 흐름을 먼저 살핀 뒤 필요한 안내만 드립니다.
        </p>
      </section>
    </div>
  );
}
